import { ipcRenderer } from "electron";
import ConnectionsList from './frontend/ConnectionsList';
import ConnectionButtons from "./frontend/ConnectionButtons";
import { Console, ConsoleWindow, ILogAction, LogChannel, LogLevel } from "./frontend/ConsoleController";
import FileListController from "./frontend/FileListController";
import { ConnectionId } from './network/conectionsManager';
import { getLayerStateName, LayerController, LayerState } from "./frontend/LayersController";
import { PropertyTreeController } from "./frontend/PropertyTreeController";
import * as Messaging from "./messaging/MessageDefinitions";
import { initMessageHandling } from "./messaging/RendererMessageHandler";
import * as NET_TYPES from './network/types';
import * as RECORDING from './recording/RecordingData';
import SceneController from './render/sceneController';
import { PlaybackController } from "./timeline/PlaybackController";
import Timeline from './timeline/timeline';
import { initWindowControls } from "./frontend/WindowControls";
import { TreeControl } from "./ui/tree";
import { Splitter } from "./ui/splitter";
import { TabBorder, TabControl } from "./ui/tabs";
import * as Shortcuts from "./frontend/Shortcuts";
import * as RecordingButton from "./frontend/RecordingButton";
import * as Filters from "./filters/filters";
import { NaiveRecordedData } from "./recording/RecordingData";
import { RecordingOptions } from "./frontend/RecordingOptions";
import { ISettings } from "./files/Settings";
import { SettingsList } from "./frontend/SettingsList";
import { EntityTree } from "./frontend/EntityTree";
import FiltersList from "./frontend/FiltersList";

const { shell } = require('electron');


interface PropertyTreeGroup
{
    propertyTree: TreeControl;
    propertyTreeController: PropertyTreeController;
}

enum TabIndices
{
    EntityList = 0,
    RecordingOptions,
    Connections,
    Recent,
    Settings
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
    private entityTree: EntityTree;
    private layerController: LayerController;
    private recordingOptions: RecordingOptions;
    private selectedEntityId: number;
    private propertyGroups: PropertyTreeGroup[];
    private leftPaneSplitter: Splitter;
    private rightPaneSplitter: Splitter;
    private detailPaneSplitter: Splitter;
    private entitiesPaneSplitter: Splitter;
    private consoleSplitter: Splitter;
    private filterList: FiltersList;

    // Networking
    private connectionsList: ConnectionsList;
    private connectionButtons: ConnectionButtons;

    // Recent files
    private recentFilesController: FileListController;

    // Console
    private consoleWindow : ConsoleWindow;

    // Playback
    private playbackController: PlaybackController;

    // Timeline optimization
    private unprocessedFrames: number[];

    // Settings
    private settingsList: SettingsList;
    private settings: ISettings;

    initialize(canvas: HTMLCanvasElement) {

        this.sceneController = new SceneController();
        this.sceneController.initialize(canvas);
        this.sceneController.onEntitySelected = this.onEntitySelectedOnScene.bind(this);

        this.selectedEntityId = null;

        let connectionsListElement: HTMLElement = document.getElementById(`connectionsList`);
        this.connectionsList = new ConnectionsList(connectionsListElement, this.onMessageArrived.bind(this));
        this.connectionsList.initialize();

        this.initializeTimeline();
        this.initializeUI();

        this.playbackController = new PlaybackController(this, this.timeline);

        this.recordedData = new RECORDING.NaiveRecordedData();
        //this.recordedData.addTestData();

        this.timeline.updateLength(this.recordedData.getSize());

        Shortcuts.registerShortcuts(this.playbackController, this.connectionsList);

        let recentFilesListElement = document.getElementById(`recentFilesList`);
        let recentFilesWelcomeElement = document.getElementById("recent-files-welcome").querySelector("ul");
        this.recentFilesController = new FileListController(recentFilesListElement, recentFilesWelcomeElement, this.onRecentFileClicked.bind(this))

        this.propertyGroups = [];
        this.unprocessedFrames = [];

        this.applyFrame(0);
    }

    initializeUI()
    {
        this.currentPropertyId = 0;

        const callbacks = {
            onEntitySelected: (entityId: number) => { this.onEntitySelected(entityId); },
            onEntityMouseOver: (entityId: number) => { this.onEntityHovered(entityId); },
            onEntityMouseOut: (entityId: number) => { this.onEntityStoppedHovering(entityId); }
        }

        this.entityTree = new EntityTree(
            document.getElementById("entity-tree"),
            document.getElementById('entity-search') as HTMLInputElement,
            callbacks);

        // Create tab control
        const controlTabElements: HTMLElement[] = [
            document.getElementById("entity-list"), 
            document.getElementById("var-list"),
            document.getElementById("connection-list"),
            document.getElementById("filters-list"),
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
        this.consoleWindow = new ConsoleWindow(consoleElement, LogLevel.Verbose);
        Console.setCallbacks((logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) => {this.consoleWindow.log(logLevel, channel, ...message)});

        // Create timeline callbacks
        document.getElementById("timeline-play").onmousedown = (e) => { this.playbackController.onTimelinePlayClicked(); e.preventDefault(); }
        document.getElementById("timeline-next").onmousedown = (e) => { this.playbackController.onTimelineNextClicked(); e.preventDefault(); }
        document.getElementById("timeline-prev").onmousedown = (e) => { this.playbackController.onTimelinePrevClicked(); e.preventDefault(); }
        document.getElementById("timeline-first").onmousedown = (e) => { this.playbackController.onTimelineFirstClicked(); e.preventDefault(); }
        document.getElementById("timeline-last").onmousedown = (e) => { this.playbackController.onTimelineLastClicked(); e.preventDefault(); }
        document.getElementById("timeline-event-prev").onmousedown = (e) => { this.playbackController.onTimelinePrevEventClicked(e); e.preventDefault(); }
        document.getElementById("timeline-event-next").onmousedown = (e) => { this.playbackController.onTimelineNextEventClicked(e); e.preventDefault(); }

        // Create control bar callbacks
        document.getElementById("title-bar-open").onmousedown = (e) => { this.onOpenFile(); e.preventDefault(); }
        document.getElementById("title-bar-save").onmousedown = (e) => { this.onSaveFile(); e.preventDefault(); }
        document.getElementById("title-bar-clear").onmousedown = (e) => { this.onClearFile(); e.preventDefault(); }

        // Console callbacks
        document.getElementById("console-clear").onmousedown = (e) => { this.consoleWindow.clear(); e.preventDefault(); };

        // Create layer controls
        this.layerController = new LayerController(
            document.getElementById("layer-selection"),
            document.getElementById("all-layer-selection"),
            this.onLayerChanged.bind(this)
        );

        // Filter controls
        this.filterList = new FiltersList(
            document.getElementById("add-filter") as HTMLButtonElement,
            document.getElementById("filter-editing-list")
        );

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

        // Create settings
        this.settingsList = new SettingsList(document.getElementById("settings"), 
            document.getElementById("settings-search") as HTMLInputElement,
            () => { 
                this.saveSettings();
                if (this.settings && !this.settings.followCurrentSelection)
                {
                    this.sceneController.stopFollowEntity();
                }
            });

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
                if (this.settings.recordOnConnect)
                {
                    RecordingButton.record();
                }
            },
            onConnectionDisconnected: (id, causedByUser) => {
                this.connectionButtons.onConnectionDisconnected(id);
                if (!causedByUser && this.settings.autoReconnect)
                {
                    Console.log(LogLevel.Information, LogChannel.Connections, 
                        "Trying to reconnect automatically. To change this, ",
                        this.createLogSettingsLink("change the Auto Reconnect setting."));
                    this.connectionsList.toggleConnection(id);
                }
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

    updateSettings(settings: ISettings)
    {
        this.settings = settings;
        this.settingsList.setSettings(this.settings);
    }

    saveSettings()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.SaveSettings, this.settings));
    }

    loadData(data: string)
    {
        this.openModal("Processing data");
        setTimeout(() => {
            this.clear();

            try {
                this.recordedData.loadFromString(data);
                this.timeline.updateLength(this.recordedData.getSize());
                for (let i=0; i<this.recordedData.frameData.length; ++i)
                {
                    this.unprocessedFrames.push(i);
                }
                this.applyFrame(0);
                this.controlTabs.openTabByIndex(TabIndices.EntityList);
            }
            catch (error)
            {
                Console.log(LogLevel.Error, LogChannel.Files, "Error loading file: " + error.message)
            }
            this.closeModal();
        }, 1);
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

        this.timeline.setCurrentFrame(frame);
        this.playbackController.updateUI();

        this.layerController.setLayers(this.recordedData.layers);

        // Update frame counter
        const frameText = (this.getFrameCount() > 0) ? (`Frame: ${frame + 1} / ${this.getFrameCount()} (Frame ID: ${this.frameData.frameId})`) : "No frames";
        document.getElementById("timeline-frame-counter").textContent = frameText;

        // Update entity list
        this.entityTree.setEntities(this.frameData.entities);

        // Update renderer
        this.sceneController.hideAllEntities();

        for (let entityID in this.frameData.entities) {

            const entity = this.frameData.entities[entityID];

            // Set in the scene renderer
            this.sceneController.setEntity(entity);
        }

        if (this.settings && this.settings.followCurrentSelection)
        {
            this.sceneController.followEntity();
        }

        if (this.selectedEntityId) {
            this.entityTree.selectEntity(this.selectedEntityId);
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
        this.sceneController.markEntityAsHovered(entityId);
    }

    onEntityStoppedHovering(entityId: number)
    {
        this.sceneController.unmarkEntityAsHovered(entityId);
    }

    onEntitySelected(entityId: number)
    {
        this.onEntitySelectedOnScene(entityId);

        if (this.settings.moveToEntityOnSelection)
        {
            this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Moving camera to entity:`, this.frameData.frameId, entityId);
            this.sceneController.moveCameraToSelection();
        }
    }

    onEntitySelectedOnScene(entityId: number)
    {
        this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Selected entity:`, this.frameData.frameId, entityId);
        this.selectedEntityId = entityId;
        this.buildPropertyTree();
        if (this.settings.openEntityListOnSelection)
        {
            this.controlTabs.openTabByIndex(TabIndices.EntityList);
        }
        this.entityTree.selectEntity(entityId);
        this.sceneController.markEntityAsSelected(entityId);
        this.timeline.setSelectedEntity(entityId);
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

        let propsToBuild = [];
        let propsToAdd = [];

        for (let i=0; i<propertyGroup.value.length; ++i)
        {
            const property = propertyGroup.value[i];
            if (property.type == "group" && depth < 2)
            {
                propsToBuild.push(property);
            }
            else
            {
                propsToAdd.push(property);
            }
        }

        for (let i=0; i<propsToBuild.length; ++i)
        {
            this.buildSinglePropertyTree(treeParent, propsToBuild[i] as RECORDING.IPropertyGroup, depth + 1);
        }

        if (propsToAdd.length > 0)
        {
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


            for (let i=0; i<propsToAdd.length; ++i)
            {
                propertyTreeController.addToPropertyTree(propertyTree.root, propsToAdd[i]);
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
        this.logEntity(LogLevel.Verbose, LogChannel.Timeline, "Event selected in timeline. ", frame, Number.parseInt(entityId));
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
        this.openModal("Loading File");
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Load, path));
    }

    // Layer callbacks
    onLayerChanged(name: string, state: LayerState)
    {
        this.sceneController.updateLayerStatus(name, state);
        this.applyFrame(this.timeline.currentFrame);
        Console.log(LogLevel.Verbose, LogChannel.Layers, `Layer ${name} status changed to: ${getLayerStateName(state)}`);
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

    // Modal
    openModal(text: string)
    {
        document.getElementById("loadingModal").style.display = "block";
        document.getElementById("modalText").innerText = text;
    }

    closeModal()
    {
        document.getElementById("loadingModal").style.display = "none";
    }

    // Logging wrappers
    findFrameById(frameId: number) : number
    {
        // TODO: Make an index?
        for (let i=0; i< this.recordedData.frameData.length; ++i)
        {
            if (this.recordedData.frameData[i].frameId === frameId)
            {
                return i;
            }
        }
        return -1;
    }

    logErrorToConsole(message: string)
    {
        Console.log(LogLevel.Error, LogChannel.Default, message);
    }

    logEntity(level: LogLevel, channel: LogChannel, message: string, frameId: number, entityId: number)
    {
        Console.log(level, channel, `${message} `, {
            text: `${this.findEntityName(entityId)} (id: ${entityId.toString()}) (frameID: ${frameId.toString()})`,
            tooltip: `Go to frame ${frameId.toString()} and select entity ${this.findEntityName(entityId)}`,
            callback: () => {
                const frame = this.findFrameById(frameId)
                if (frame >= 0)
                {
                    this.applyFrame(frame);
                    this.selectEntity(entityId);
                }
            }
        });
    }

    logFrame(level: LogLevel, channel: LogChannel, message: string, frameId: number)
    {
        Console.log(level, channel, `${message} `, {
            text: `(frameId: ${frameId.toString()})`,
            tooltip: "Go to frame " + frameId.toString(),
            callback: () => {
                const frame = this.findFrameById(frameId)
                if (frame >= 0)
                {
                    this.applyFrame(frame);
                }
            }
        });
    }

    createLogSettingsLink(text: string) : ILogAction
    {
        return {
            text: text,
            tooltip: "Open Settings tab",
            callback: () => {
                this.controlTabs.openTabByIndex(TabIndices.Settings);
            }
        };
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
            this.controlTabs.openTabByIndex(TabIndices.RecordingOptions);
        }
    }
}

const renderer = new Renderer();
renderer.initialize(document.getElementById('render-canvas') as HTMLCanvasElement);
initWindowControls();
initMessageHandling(renderer);