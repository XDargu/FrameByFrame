import { ipcRenderer } from "electron";
import * as path from "path";
import ConnectionsList from './frontend/ConnectionsList';
import { ConsoleWindow, ILogAction, LogChannel, LogLevel } from "./frontend/ConsoleController";
import FileListController from "./frontend/FileListController";
import { LayerController } from "./frontend/LayersController";
import { PropertyTreeController } from "./frontend/PropertyTreeController";
import * as Messaging from "./messaging/MessageDefinitions";
import * as NET_TYPES from './network/types';
import * as RECORDING from './recording/RecordingData';
import SceneController from './render/sceneController';
import { PlaybackController } from "./timeline/PlaybackController";
import Timeline from './timeline/timeline';
import * as BASICO from './ui/ui';

const { shell } = require('electron');


// Window controls

const remote = require('electron').remote;

const win = remote.getCurrentWindow(); /* Note this is different to the html global `window` variable */

// When document has loaded, initialise
document.onreadystatechange = (event) => {
    if (document.readyState == "complete") {
        handleWindowControls();
    }
};

window.onbeforeunload = (event) => {
    /* If window is reloaded, remove win event listeners
    (DOM element listeners get auto garbage collected but not
    Electron win listeners as the win is not dereferenced unless closed) */
    win.removeAllListeners();
}

function handleWindowControls() {
    // Make minimise/maximise/restore/close buttons work when they are clicked
    document.getElementById('min-button').addEventListener("click", event => {
        win.minimize();
    });

    document.getElementById('max-button').addEventListener("click", event => {
        win.maximize();
    });

    document.getElementById('restore-button').addEventListener("click", event => {
        win.unmaximize();
    });

    document.getElementById('close-button').addEventListener("click", event => {
        win.close();
    });

    // Toggle maximise/restore buttons when maximisation/unmaximisation occurs
    toggleMaxRestoreButtons();
    win.on('maximize', toggleMaxRestoreButtons);
    win.on('unmaximize', toggleMaxRestoreButtons);

    function toggleMaxRestoreButtons() {
        if (win.isMaximized()) {
            document.body.classList.add('maximized');
        } else {
            document.body.classList.remove('maximized');
        }
    }
}

interface PropertyTreeGroup
{
    propertyTree: BASICO.TreeControl;
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
    private entityList: BASICO.ListControl;
    private layerController: LayerController;
    private selectedEntityId: number;
    private propertyGroups: PropertyTreeGroup[];
    private leftPaneSplitter: BASICO.Splitter;

    // Networking
    private connectionsList: ConnectionsList;

    // Recent files
    private recentFilesController: FileListController;

    // Console
    private consoleWindow : ConsoleWindow;

    // Playback
    private playbackController: PlaybackController;

    initialize(canvas: HTMLCanvasElement) {

        this.playbackController = new PlaybackController(this);

        this.sceneController = new SceneController();
        this.sceneController.initialize(canvas);
        this.sceneController.onEntitySelected = this.onEntitySelectedOnScene.bind(this);

        this.selectedEntityId = null;

        this.initializeTimeline();
        this.initializeUI();

        this.recordedData = new RECORDING.NaiveRecordedData();
        //this.recordedData.addTestData();

        this.timeline.updateLength(this.recordedData.getSize());

        let connectionsListElement: HTMLElement = document.getElementById(`connectionsList`);
        this.connectionsList = new ConnectionsList(connectionsListElement, this.onMessageArrived.bind(this));
        this.connectionsList.initialize();

        let recentFilesListElement: HTMLElement = document.getElementById(`recentFilesList`);
        this.recentFilesController = new FileListController(recentFilesListElement, this.onRecentFileClicked.bind(this))

        this.propertyGroups = [];

        this.applyFrame(0);
    }

    initializeUI()
    {
        this.currentPropertyId = 0;

        const entityListElement = <HTMLElement>document.getElementById('entity-list').querySelector('.basico-list');

        this.entityList = new BASICO.ListControl(entityListElement);

        // Create tab control
        const controlTabElements: HTMLElement[] = [
            document.getElementById("entity-list"), 
            document.getElementById("var-list"),
            document.getElementById("connection-list"),
            document.getElementById("recent-list"),
            document.getElementById("setting-list")
        ];
        var controlTabs = new BASICO.TabControl(
            <HTMLElement[]><any>document.getElementById("control-tabs").children,
            controlTabElements
            , 0, BASICO.TabBorder.Left
        );

        var controlTabs = new BASICO.TabControl(
            [
                document.getElementById("console-tabs").children[0] as HTMLElement
            ],
            [
                document.getElementById("default-console")
            ]
            , 0, BASICO.TabBorder.Left
        );

        const consoleElement = document.getElementById("default-console").children[0] as HTMLElement;
        console.log(consoleElement);
        this.consoleWindow = new ConsoleWindow(consoleElement, LogLevel.Verbose);
        this.consoleWindow.log(LogLevel.Error, LogChannel.Default, "Error: test");

        // Create timeline callbacks
        document.getElementById("timeline-play").onclick = this.playbackController.onTimelinePlayClicked.bind(this.playbackController);
        document.getElementById("timeline-next").onclick = this.playbackController.onTimelineNextClicked.bind(this.playbackController);
        document.getElementById("timeline-prev").onclick = this.playbackController.onTimelinePrevClicked.bind(this.playbackController);
        document.getElementById("timeline-first").onclick = this.playbackController.onTimelineFirstClicked.bind(this.playbackController);
        document.getElementById("timeline-last").onclick = this.playbackController.onTimelineLastClicked.bind(this.playbackController);

        // Create control bar callbacks
        document.getElementById("title-bar-open").onclick = this.onOpenFile.bind(this);
        document.getElementById("title-bar-save").onclick = this.onSaveFile.bind(this);
        document.getElementById("title-bar-clear").onclick = this.onClearFile.bind(this);

        // Console callbacks
        document.getElementById("console-clear").onclick = () => { this.consoleWindow.clear(); };

        // Create layer controls
        this.layerController = new LayerController(document.getElementById("layer-selection"), this.onLayerChanged.bind(this));

        // Create splitters
        this.leftPaneSplitter = new BASICO.Splitter(document.getElementById("left-pane-splitter"), controlTabElements, "H");
    }

    loadData(data: string)
    {
        this.recordedData.loadFromString(data);
        this.timeline.updateLength(this.recordedData.getSize());
        this.applyFrame(0);
    }

    clear()
    {
        this.recordedData.clear();
        this.timeline.updateLength(this.recordedData.getSize());
        this.applyFrame(0);
    }

    onMessageArrived(data: string) : void
    {
        let message: NET_TYPES.IMessage = JSON.parse(data) as NET_TYPES.IMessage;

        console.log("Received: " + data);
        console.log(message);

        // TODO: Make message types: frame data, command, etc. In an enum.
        // Also, move to a helper class
        if (message.type !== undefined)
        {
            switch(message.type)
            {
                case NET_TYPES.MessageType.FrameData:
                {
                    let frame: NET_TYPES.IMessageFrameData = message.data;

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

                    console.log(frameToBuild);
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

        //console.log(this.frameData);
        //console.log(this.recordedData);

        // Update frame counter
        document.getElementById("timeline-frame-counter").textContent = `Frame: ${frame + 1} / ${this.getFrameCount()}`;

        // Update entity list
        let listElement = this.entityList.listWrapper;

        this.sceneController.hideAllEntities();

        let counter = 0;
        for (let entityID in this.frameData.entities) {
            let element = <HTMLElement>listElement.children[counter];

            const entity = this.frameData.entities[entityID];
            const entityName = RECORDING.NaiveRecordedData.getEntityName(entity);
            
            // Set in the scene renderer
            this.sceneController.setEntity(entity);

            if (element) {
                element.innerText = entityName;
                this.entityList.setValueOfItem(element, entityID);
            }
            else {
                const callbacks = {
                    onItemSelected: function(element: HTMLDivElement) {
                        renderer.onEntitySelected(parseInt(renderer.entityList.getValueOfItem(element)));
                    },
                    onItemMouseOver: function(element: HTMLDivElement) {
                        renderer.onEntityHovered(parseInt(renderer.entityList.getValueOfItem(element)));
                    },
                    onItemMouseOut: function(element: HTMLDivElement) {
                        renderer.onEntityStoppedHovering(parseInt(renderer.entityList.getValueOfItem(element)));
                    }
                }
                this.entityList.appendElement(entityName, callbacks, entityID);
            }
            counter++;
        }

        // Remove remaining elements
        const remainingElements = listElement.childElementCount;
        for (let i=counter; i<remainingElements; i++)
        {
            let element = <HTMLElement>listElement.children[counter];
            listElement.removeChild(element);
        }

        // Draw properties
        this.renderProperties();

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
        this.entityList.selectElementOfValue(entityId.toString(), true);
        this.sceneController.markEntityAsSelected(entityId);
        this.renderProperties();
    }

    selectEntity(entityId: number)
    {
        this.onEntitySelected(entityId);
    }

    buildSinglePropertyTree(propertyGroup: RECORDING.IPropertyGroup, depth: number)
    {
        let treeParent = document.getElementById('properties');

        let titleElement = document.createElement("div");
        titleElement.innerText = propertyGroup.name;
        titleElement.classList.add("basico-title");

        let treeElement = document.createElement("div");
        treeElement.classList.add("basico-tree");
        let ul = document.createElement("ul");
        treeElement.appendChild(ul);

        treeParent.appendChild(titleElement);
        treeParent.appendChild(treeElement);

        let propertyTree = new BASICO.TreeControl(treeElement);
        let propertyTreeController = new PropertyTreeController(propertyTree);

        this.propertyGroups.push({propertyTree: propertyTree, propertyTreeController: propertyTreeController});

        for (let i=0; i<propertyGroup.value.length; ++i)
        {
            const property = propertyGroup.value[i];
            if (property.type == "group" && depth < 2)
            {
                this.buildSinglePropertyTree(property as RECORDING.IPropertyGroup, depth + 1);
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
        let treeParent = document.getElementById('properties');
        treeParent.innerHTML = "";
        this.propertyGroups = [];

        if (this.selectedEntityId != null)
        {
            const selectedEntity = this.frameData.entities[this.selectedEntityId];
            if (selectedEntity)
            {
                for (let i=0; i<selectedEntity.properties.length; ++i)
                {
                    const propertyGroup = selectedEntity.properties[i] as RECORDING.IPropertyGroup;
                    this.buildSinglePropertyTree(propertyGroup, 0);
                }
            }
        }
    }

    renderProperties()
    {
        let sceneController = this.sceneController;
        sceneController.removeAllProperties();

        for (let entityID in this.frameData.entities) {
            const entity = this.frameData.entities[entityID];

            this.recordedData.visitEntityProperties(entity, function(property: RECORDING.IProperty) {
                sceneController.addProperty(entity, property);
            });
        }

        /*if (this.selectedEntityId != null)
        {
            const selectedEntity = this.frameData.entities[this.selectedEntityId];
            if (selectedEntity)
            {
                let sceneController = this.sceneController;
                sceneController.removeAllProperties();

                this.recordedData.visitEntityProperties(selectedEntity, function(property: RECORDING.IProperty) {
                    sceneController.addProperty(selectedEntity, property);
                });
            }
        }*/
    }

    initializeTimeline()
    {
        let timelineElement: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('timeline');
        let timelineWrapper: HTMLElement = document.getElementById('timeline-wrapper');
        this.timeline = new Timeline(timelineElement, timelineWrapper);
        this.timeline.setFrameClickedCallback(this.onTimelineClicked.bind(this));
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
        this.logToConsole(LogLevel.Verbose, LogChannel.Layers, `Layer ${name} status changed to: ${active}`);
    }

    // Logging wrappers
    logToConsole(level: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[])
    {
        this.consoleWindow.log(level, channel, ...message);
    }

    logErrorToConsole(message: string)
    {
        this.consoleWindow.log(LogLevel.Error, LogChannel.Default, message);
    }

    logEntity(level: LogLevel, channel: LogChannel, message: string, frame: number, entityId: number)
    {
        this.consoleWindow.log(level, channel, `${message} `, {
            text: `${this.findEntityName(entityId)} (id: ${entityId.toString()}) (frame: ${frame.toString()})`, 
            callback: () => {
                this.applyFrame(frame);
                this.selectEntity(entityId);
            }
        });
    }

    logFrame(level: LogLevel, channel: LogChannel, message: string, frame: number)
    {
        this.consoleWindow.log(level, channel, `${message} `, {
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
}

const renderer = new Renderer();
renderer.initialize(document.getElementById('render-canvas') as HTMLCanvasElement);

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
            renderer.logToConsole(result.level, result.channel, ...result.message);
            break;
        }
        case Messaging.MessageType.FileOpened:
        {
            const pathName = arg.data as string;
            renderer.logToConsole(LogLevel.Information, LogChannel.Files, `Loading file `, {
                text: pathName,
                callback: () => { shell.showItemInFolder(path.resolve(pathName)); }
            });
            
            document.getElementById("window-title-text").innerText = path.basename(pathName) + " - Frame by Frame";
            break;
        }
    }
});