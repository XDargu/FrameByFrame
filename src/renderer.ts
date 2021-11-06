import { ipcRenderer, TouchBarScrubber } from "electron";
import * as path from "path";
import * as Utils from "./utils/utils";
import ConnectionsList from './frontend/ConnectionsList';
import ConnectionButtons from "./frontend/ConnectionButtons";
import { Console, ConsoleWindow, ILogAction, LogChannel, LogLevel } from "./frontend/ConsoleController";
import FileListController from "./frontend/FileListController";
import { ConnectionId } from './network/conectionsManager';
import { LayerController } from "./frontend/LayersController";
import { PropertyTreeController } from "./frontend/PropertyTreeController";
import * as Messaging from "./messaging/MessageDefinitions";
import * as NET_TYPES from './network/types';
import * as RECORDING from './recording/RecordingData';
import SceneController from './render/sceneController';
import { PlaybackController } from "./timeline/PlaybackController";
import Timeline from './timeline/timeline';
import { initWindowControls } from "./frontend/WindowControls";
import { TreeControl } from "./ui/tree";
import { ListControl } from "./ui/list";
import { Splitter } from "./ui/splitter";
import { TabBorder, TabControl } from "./ui/tabs";
import * as Shortcuts from "./frontend/Shortcuts";
import * as RecordingButton from "./frontend/RecordingButton";
import { NaiveRecordedData } from "./recording/RecordingData";
import { RecordingOptions } from "./frontend/RecordingOptions";
import { EntityList } from "./frontend/EntityList";

const { shell } = require('electron');


interface PropertyTreeGroup
{
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
}

export default class Renderer {
    private sceneController: SceneController;
    private recordedData: RECORDING.NaiveRecordedData;
    private timeline: Timeline;
    private currentPropertyId: number;

    // Per frame cache
    private frameData: RECORDING.IFrameData;

    // UI Elements
    private controlTabs: TabControl;
    private entityList: EntityList;
    private layerController: LayerController;
    private recordingOptions: RecordingOptions;
    private selectedEntityId: number;
    private propertyGroups: PropertyTreeGroup[];
    private leftPaneSplitter: Splitter;
    private rightPaneSplitter: Splitter;
    private detailPaneSplitter: Splitter;
    private entitiesPaneSplitter: Splitter;
    private consoleSplitter: Splitter;

    // Networking
    private connectionsList: ConnectionsList;
    private connectionButtons: ConnectionButtons;

    // Recent files
    private recentFilesController: FileListController;

    // Console
    private consoleWindow : ConsoleWindow;

    // Playback
    private playbackController: PlaybackController;

    private unprocessedFrames: number[];

    initialize(canvas: HTMLCanvasElement) {

        this.playbackController = new PlaybackController(this);

        this.sceneController = new SceneController();
        this.sceneController.initialize(canvas);
        this.sceneController.onEntitySelected = this.onEntitySelectedOnScene.bind(this);

        this.selectedEntityId = null;

        let connectionsListElement: HTMLElement = document.getElementById(`connectionsList`);
        this.connectionsList = new ConnectionsList(connectionsListElement, this.onMessageArrived.bind(this));
        this.connectionsList.initialize();

        this.initializeTimeline();
        this.initializeUI();

        this.recordedData = new RECORDING.NaiveRecordedData();
        //this.recordedData.addTestData();

        this.timeline.updateLength(this.recordedData.getSize());

        Shortcuts.registerShortcuts(this.playbackController, this.connectionsList);

        let recentFilesListElement: HTMLElement = document.getElementById(`recentFilesList`);
        this.recentFilesController = new FileListController(recentFilesListElement, this.onRecentFileClicked.bind(this))

        this.propertyGroups = [];
        this.unprocessedFrames = [];

        this.applyFrame(0);
    }

    initializeUI()
    {
        this.currentPropertyId = 0;

        const entityListElement = <HTMLElement>document.getElementById('entity-list').querySelector('.basico-list');
        const callbacks = {
            onEntitySelected: (entityId: number) => { this.onEntitySelected(entityId); },
            onEntityMouseOver: (entityId: number) => { this.onEntityHovered(entityId); },
            onEntityMouseOut: (entityId: number) => { this.onEntityStoppedHovering(entityId); }
        }

        this.entityList = new EntityList(
            entityListElement,
            document.getElementById('entity-search') as HTMLInputElement,
            callbacks
        );

        // Create tab control
        const controlTabElements: HTMLElement[] = [
            document.getElementById("entity-list"), 
            document.getElementById("var-list"),
            document.getElementById("connection-list"),
            document.getElementById("recent-list"),
            document.getElementById("setting-list")
        ];

        this.controlTabs = new TabControl(
            <HTMLElement[]><any>document.getElementById("control-tabs").children,
            controlTabElements
            , 0, TabBorder.Left
        );

        this.controlTabs.closeAllTabs();

        var consoleTabs = new TabControl(
            [
                document.getElementById("console-tabs").children[0] as HTMLElement
            ],
            [
                document.getElementById("default-console")
            ]
            , 0, TabBorder.Left
        );

        const consoleElement = document.getElementById("default-console").children[0] as HTMLElement;
        console.log(consoleElement);
        this.consoleWindow = new ConsoleWindow(consoleElement, LogLevel.Verbose);
        Console.setCallbacks((logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) => {this.consoleWindow.log(logLevel, channel, ...message)});

        // Create timeline callbacks
        document.getElementById("timeline-play").onmousedown = (e) => { this.playbackController.onTimelinePlayClicked(); e.preventDefault(); }
        document.getElementById("timeline-next").onmousedown = (e) => { this.playbackController.onTimelineNextClicked(); e.preventDefault(); }
        document.getElementById("timeline-prev").onmousedown = (e) => { this.playbackController.onTimelinePrevClicked(); e.preventDefault(); }
        document.getElementById("timeline-first").onmousedown = (e) => { this.playbackController.onTimelineFirstClicked(); e.preventDefault(); }
        document.getElementById("timeline-last").onmousedown = (e) => { this.playbackController.onTimelineLastClicked(); e.preventDefault(); }

        // Create control bar callbacks
        document.getElementById("title-bar-open").onmousedown = (e) => { this.onOpenFile(); e.preventDefault(); }
        document.getElementById("title-bar-save").onmousedown = (e) => { this.onSaveFile(); e.preventDefault(); }
        document.getElementById("title-bar-clear").onmousedown = (e) => { this.onClearFile(); e.preventDefault(); }

        // Console callbacks
        document.getElementById("console-clear").onmousedown = (e) => { this.consoleWindow.clear(); e.preventDefault(); };

        // Create layer controls
        this.layerController = new LayerController(document.getElementById("layer-selection"), this.onLayerChanged.bind(this));

        // Recording controls
        this.recordingOptions = new RecordingOptions(
            document.getElementById("recording-option-selection"),
            document.getElementById("recording-option-search") as HTMLInputElement,
            this.onRecordingOptionChanged.bind(this));

        // Create splitters
        this.leftPaneSplitter = new Splitter({
            splitter: document.getElementById("left-pane-splitter"),
            panes: controlTabElements,
            minSize: 150,
            direction: "L",
            minPane: document.getElementById("main-content"),
            minSizePane: 300
        });
        this.rightPaneSplitter = new Splitter({
            splitter: document.getElementById("right-pane-splitter"),
            panes: [document.getElementById("detail-pane")],
            minSize: 150,
            direction: "R",
            minPane: document.getElementById("central-content"),
            minSizePane: 300
        });
        this.consoleSplitter = new Splitter({
            splitter: document.getElementById("bottom-pane-splitter"),
            panes: [document.getElementById("console")],
            minSize: 150,
            direction: "D",
            minPane: document.getElementById("central-content"),
            minSizePane: 300
        });

        this.detailPaneSplitter = new Splitter({
            splitter: document.getElementById("detail-pane-splitter"),
            panes: [document.getElementById("events-container")],
            minSize: 100,
            direction: "D",
            minPane: document.getElementById("properties-container"),
            minSizePane: 100
        });

        this.entitiesPaneSplitter = new Splitter({
            splitter: document.getElementById("entity-pane-splitter"),
            panes: [document.getElementById("layers-container")],
            minSize: 100,
            direction: "D",
            minPane: document.getElementById("entities-container"),
            minSizePane: 100
        });

        RecordingButton.initializeRecordingButton();

        // Connection buttons
        this.connectionButtons = new ConnectionButtons(document.getElementById(`connection-buttons`), (id: ConnectionId) => {
            this.connectionsList.toggleConnection(id);
            this.removeWelcomeMessage();
        });

        this.connectionsList.addListener({
            onConnectionAdded: (id) => {
                this.connectionButtons.onConnectionCreated(id);
            },
            onConnectionRemoved: (id) => {
                this.connectionButtons.onConnectionRemoved(id);
            },
            onConnectionConnected: (id) => {
                this.connectionButtons.onConnectionConnected(id);
            },
            onConnectionDisconnected: (id) => {
                this.connectionButtons.onConnectionDisconnected(id);
            },
            onConnectionConnecting: (id) => {
                this.connectionButtons.onConnectionConnecting(id);
                this.removeWelcomeMessage();
            },
            onConnectionDisconnecting: (id) => {
                this.connectionButtons.onConnectionDisconnecting(id);
            },
        });

        this.connectionsList.addConnection("localhost", "23001", false);
    }

    loadData(data: string)
    {
        this.clear();
        this.recordedData.loadFromString(data);
        this.timeline.updateLength(this.recordedData.getSize());
        for (let i=0; i<this.recordedData.frameData.length; ++i)
        {
            this.unprocessedFrames.push(i);
        }
        this.applyFrame(0);
    }

    clear()
    {
        this.unprocessedFrames = [];
        this.recordedData.clear();
        this.timeline.updateLength(this.recordedData.getSize());
        this.timeline.clearEvents();
        this.recordingOptions.setOptions([]);
        this.layerController.setLayers([]);
        this.applyFrame(0);
    }

    onMessageArrived(data: string) : void
    {        
        const message: NET_TYPES.IMessage = JSON.parse(data) as NET_TYPES.IMessage;

        //console.log("Received: " + data);
        //console.log(message);

        // TODO: Make message types: frame data, command, etc. In an enum.
        // Also, move to a helper class
        if (message.type !== undefined)
        {
            switch(message.type)
            {
                case NET_TYPES.MessageType.FrameData:
                {
                    if (!RecordingButton.isRecordingActive()) { return; }
                    let frame: NET_TYPES.IMessageFrameData = message.data as NET_TYPES.IMessageFrameData;

                    // Build frame
                    let frameToBuild: RECORDING.IFrameData = {
                        entities: {},
                        frameId: frame.frameId,
                        elapsedTime: frame.elapsedTime,
                        tag: frame.tag,
                    };

                    // Add all entity data
                    const length = frame.entities.length;
                    for (let i=0; i<length; ++i)
                    {
                        const entityData = frame.entities[i];
                        frameToBuild.entities[entityData.id] = entityData;
                    }

                    this.recordedData.pushFrame(frameToBuild);
                    this.timeline.updateLength(this.recordedData.getSize());
                    this.unprocessedFrames.push(this.recordedData.getSize() - 1);
                    
                    //console.log(frameToBuild);
                    break;
                }
                case NET_TYPES.MessageType.RecordingOptions:
                {
                    const recordingOptions: NET_TYPES.IMessageRecordingOption[] = message.data as NET_TYPES.IMessageRecordingOption[];
                    this.recordingOptions.setOptions(recordingOptions);
                    break;
                    
                }
                break;
            }
        }
    }

    getNextPropertyId() : string
    {
        return (++this.currentPropertyId).toString();
    }

    applyFrame(frame : number) {
        this.frameData = this.recordedData.buildFrameData(frame);

        this.timeline.currentFrame = frame;
        this.playbackController.updateUI();

        this.layerController.setLayers(this.recordedData.layers);

        // Update frame counter
        const frameText = (this.getFrameCount() > 0) ? (`Frame: ${frame + 1} / ${this.getFrameCount()}`) : "No frames";
        document.getElementById("timeline-frame-counter").textContent = frameText;

        // Update entity list
        this.entityList.setEntities(this.frameData.entities);

        // Update renderer
        this.sceneController.hideAllEntities();

        for (let entityID in this.frameData.entities) {

            const entity = this.frameData.entities[entityID];

            // Set in the scene renderer
            this.sceneController.setEntity(entity);
        }

        if (this.selectedEntityId) {
            this.entityList.selectEntity(this.selectedEntityId);
        }

        // Draw properties
        this.renderProperties();

        // Update events
        this.updateTimelineEvents();

        // Rebuild property tree
        this.buildPropertyTree();
    }

    onEntityHovered(entityId: number)
    {
        console.log("Hovered: " + entityId);
        this.sceneController.markEntityAsHovered(entityId);
    }

    onEntityStoppedHovering(entityId: number)
    {
        this.sceneController.unmarkEntityAsHovered(entityId);
    }

    onEntitySelected(entityId: number)
    {
        this.onEntitySelectedOnScene(entityId);
        this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Moving camera to entity:`, this.frameData.frameId, entityId);

        this.sceneController.moveCameraToSelection();
    }

    onEntitySelectedOnScene(entityId: number)
    {
        this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Selected entity:`, this.frameData.frameId, entityId);
        this.selectedEntityId = entityId;
        this.buildPropertyTree();
        this.entityList.selectEntity(entityId);
        this.sceneController.markEntityAsSelected(entityId);
        this.renderProperties();
    }

    selectEntity(entityId: number)
    {
        this.onEntitySelected(entityId);
    }

    buildSinglePropertyTree(treeParent: HTMLElement, propertyGroup: RECORDING.IPropertyGroup, depth: number, nameOverride: string = undefined)
    {
        const isSpecialProperties = propertyGroup.name == "special" && depth == 0;
        const isDefaultProperties = propertyGroup.name == "properties" && depth == 0;
        const name = isSpecialProperties ? "Basic Information"
            : isDefaultProperties ? "Uncategorized"
            : nameOverride != undefined ? nameOverride
            : propertyGroup.name;

        let titleElement = document.createElement("div");
        titleElement.innerText = name;
        titleElement.classList.add("basico-title");

        let treeElement = document.createElement("div");
        treeElement.classList.add("basico-tree");
        let ul = document.createElement("ul");
        treeElement.appendChild(ul);

        if (isSpecialProperties)
        {
            treeParent.prepend(treeElement);
            treeParent.prepend(titleElement);
        }
        else
        {
            treeParent.appendChild(titleElement);
            treeParent.appendChild(treeElement);   
        }

        let propertyTree = new TreeControl(treeElement);
        let propertyTreeController = new PropertyTreeController(propertyTree);

        this.propertyGroups.push({propertyTree: propertyTree, propertyTreeController: propertyTreeController});
        
        for (let i=0; i<propertyGroup.value.length; ++i)
        {
            const property = propertyGroup.value[i];
            if (property.type == "group" && depth < 2)
            {
                this.buildSinglePropertyTree(treeParent, property as RECORDING.IPropertyGroup, depth + 1);
            }
            else
            {
                propertyTreeController.addToPropertyTree(propertyTree.root, property);
            }
        }
    }

    buildPropertyTree()
    {
        // TODO: Instead of destroying everything, reuse/pool the already existing ones!
        let propertyTree = document.getElementById('properties');
        let eventTree = document.getElementById('events');

        propertyTree.innerHTML = "";
        eventTree.innerHTML = "";
        this.propertyGroups = [];

        if (this.selectedEntityId != null)
        {
            const selectedEntity = this.frameData.entities[this.selectedEntityId];
            if (selectedEntity)
            {
                for (let i=0; i<selectedEntity.properties.length; ++i)
                {
                    const propertyGroup = selectedEntity.properties[i] as RECORDING.IPropertyGroup;
                    this.buildSinglePropertyTree(propertyTree, propertyGroup, 0);
                }

                for (let i=0; i<selectedEntity.events.length; ++i)
                {
                    const propertyGroup = selectedEntity.events[i].properties;
                    this.buildSinglePropertyTree(eventTree, propertyGroup, 1, selectedEntity.events[i].name);
                }
            }
        }
    }

    updateTimelineEvents()
    {
        for (let i=0; i<this.unprocessedFrames.length; ++i)
        {
            const frameIdx = this.unprocessedFrames[i];
            const frameData = this.recordedData.frameData[frameIdx];

            for (let entityID in frameData.entities) {
                const entity = frameData.entities[entityID];
    
                NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                    this.timeline.addEvent(event.id, entityID, frameIdx, "#D6A3FF", 0);
                });
            }
        }

        this.unprocessedFrames = [];
    }

    renderProperties()
    {
        let sceneController = this.sceneController;
        sceneController.removeAllProperties();

        for (let entityID in this.frameData.entities) {
            const entity = this.frameData.entities[entityID];

            NaiveRecordedData.visitEntityProperties(entity, (property: RECORDING.IProperty) => {
                sceneController.addProperty(entity, property);
            });

            NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                NaiveRecordedData.visitProperties([event.properties], (eventProperty: RECORDING.IProperty) => {
                    sceneController.addProperty(entity, eventProperty);
                });
            });
        }
    }

    initializeTimeline()
    {
        let timelineElement: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('timeline');
        let timelineWrapper: HTMLElement = document.getElementById('timeline-wrapper');
        this.timeline = new Timeline(timelineElement, timelineWrapper);
        this.timeline.setFrameClickedCallback(this.onTimelineClicked.bind(this));
        this.timeline.setEventClickedCallback(this.onTimelineEventClicked.bind(this));
        this.timeline.setTimelineUpdatedCallback(this.onTimelineUpdated.bind(this));
    }

    getCurrentFrame()
    {
        return this.timeline.currentFrame;
    }

    getFrameCount()
    {
        return this.timeline.length;
    }

    getElapsedTimeOfFrame(frame: number)
    {
        if (frame == this.getCurrentFrame())
        {
            return this.frameData.elapsedTime;
        }
        else
        {
            return this.recordedData.buildFrameData(frame).elapsedTime;
        }
    }

    updateRecentFiles(paths: string[])
    {
        this.recentFilesController.updateRecentFiles(paths);
    }

    // Timeline callbacks
    onTimelineClicked(frame: number)
    {
        this.applyFrame(frame);
    }

    onTimelineEventClicked(entityId: string, frame: number)
    {
        this.applyFrame(frame);
        this.selectEntity(Number.parseInt(entityId));
    }

    onTimelineUpdated(elapsedSeconds: number)
    {
        this.playbackController.update(elapsedSeconds);
    }

    // Control bar callbacks
    onOpenFile()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Open, ""));
    }
    
    onSaveFile()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Save, JSON.stringify(this.recordedData)));
    }

    onClearFile()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Clear, ""));
    }

    // Recent files callbacks
    onRecentFileClicked(path: string)
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Load, path));
    }

    // Layer callbacks
    onLayerChanged(name: string, active: boolean)
    {
        this.sceneController.updateLayerStatus(name, active);
        this.applyFrame(this.timeline.currentFrame);
        Console.log(LogLevel.Verbose, LogChannel.Layers, `Layer ${name} status changed to: ${active}`);
    }

    // Recording option callbacks
    onRecordingOptionChanged(name: string, enabled: boolean)
    {
        this.connectionsList.sendToAllConnections({ 
            type: NET_TYPES.MessageType.RecordingOptionChanged,
            data: {
                name: name,
                enabled: enabled
            }
        });
    }

    // Logging wrappers
    logErrorToConsole(message: string)
    {
        Console.log(LogLevel.Error, LogChannel.Default, message);
    }

    logEntity(level: LogLevel, channel: LogChannel, message: string, frame: number, entityId: number)
    {
        Console.log(level, channel, `${message} `, {
            text: `${this.findEntityName(entityId)} (id: ${entityId.toString()}) (frame: ${frame.toString()})`, 
            callback: () => {
                this.applyFrame(frame);
                this.selectEntity(entityId);
            }
        });
    }

    logFrame(level: LogLevel, channel: LogChannel, message: string, frame: number)
    {
        Console.log(level, channel, `${message} `, {
            text: `(frame: ${frame.toString()})`,
            callback: () => { this.applyFrame(frame); }
        });
    }

    // Utils
    findEntityName(entityId: number) : string
    {
        const entity = this.frameData.entities[entityId];
        if (entity)
        {
            return RECORDING.NaiveRecordedData.getEntityName(entity);
        }

        return "";
    }

    isWelcomeMessageActive()
    {
        return document.body.classList.contains("welcome-active");
    }

    removeWelcomeMessage()
    {
        if (this.isWelcomeMessageActive())
        {
            document.body.classList.remove("welcome-active");
            this.controlTabs.openTabByIndex(1);
        }
    }
}

const renderer = new Renderer();
renderer.initialize(document.getElementById('render-canvas') as HTMLCanvasElement);
initWindowControls();

ipcRenderer.on('asynchronous-reply', (event: any, arg: Messaging.Message) => {
    console.log(arg);
    switch(arg.type)
    {
        case Messaging.MessageType.OpenResult:
        {
            renderer.loadData(arg.data as string)
            break;
        }
        case Messaging.MessageType.ClearResult:
        {
            const result = arg.data as Messaging.IClearResultData;
            if (result.clear)
            {
                renderer.clear();
            }
            break;
        }
        case Messaging.MessageType.RequestSave:
        {
            renderer.onSaveFile();
            break;
        }
        case Messaging.MessageType.UpdateRecentFiles:
        {
            const recentFiles = (arg.data as string).split(",");
            console.log(recentFiles);
            renderer.updateRecentFiles(recentFiles);
            break;
        }
        case Messaging.MessageType.LogToConsole:
        {
            const result = arg.data as Messaging.ILogData;
            Console.log(result.level, result.channel, ...result.message);
            break;
        }
        case Messaging.MessageType.FileOpened:
        {
            const pathName = arg.data as string;
            Console.log(LogLevel.Information, LogChannel.Files, `Loading file `, {
                text: pathName,
                callback: () => { shell.showItemInFolder(path.resolve(pathName)); }
            });
            
            document.getElementById("window-title-text").innerText = path.basename(pathName) + " - Frame by Frame";
            renderer.removeWelcomeMessage();
            break;
        }
    }
});