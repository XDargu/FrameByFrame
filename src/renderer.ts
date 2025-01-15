import { BrowserWindow, ipcRenderer } from "electron";
import ConnectionsList from './frontend/ConnectionsList';
import ConnectionButtons from "./frontend/ConnectionButtons";
import { Console, ConsoleWindow, ILogAction, LogChannel, LogLevel } from "./frontend/ConsoleController";
import FileListController from "./frontend/FileListController";
import { ConnectionId } from './network/conectionsManager';
import { CoreLayers, getLayerStateName, LayerController, LayerState } from "./frontend/LayersController";
import * as Messaging from "./messaging/MessageDefinitions";
import { initMessageHandling } from "./messaging/RendererMessageHandler";
import * as NET_TYPES from './network/types';
import * as RECORDING from './recording/RecordingData';
import SceneController from './render/sceneController';
import { PlaybackController } from "./timeline/PlaybackController";
import Timeline from './timeline/timeline';
import { initWindowControls } from "./frontend/WindowControls"; 
import { Splitter } from "./ui/splitter";
import { TabBorder, TabControl, TabDisplay } from "./ui/tabs";
import * as Shortcuts from "./frontend/Shortcuts";
import * as RecordingButton from "./frontend/RecordingButton";
import * as Filters from "./filters/filters";
import { NaiveRecordedData } from "./recording/RecordingData";
import { RecordingOptions } from "./frontend/RecordingOptions";
import { createDefaultSettings, ISettings } from "./files/Settings";
import { SettingsList } from "./frontend/SettingsList";
import { RecordingInfoList } from "./frontend/RecordingInfoList";
import { EntityTree } from "./frontend/EntityTree";
import FiltersList, { ExportedFilters, FilterId } from "./frontend/FiltersList";
import * as Utils from "./utils/utils";
import * as UserWindows from "./frontend/UserWindows";
import FilterTickers from "./frontend/FilterTickers";
import EntityPropertiesBuilder from "./frontend/EntityPropertiesBuilder";
import PendingFrames from "./utils/pendingFrames";
import { LIB_VERSION } from "./version";
import ShapeLineController from "./frontend/ShapeLineController";
import { isImageResource, loadResource } from "./resources/resources";
import { ResourcePreview } from "./frontend/ResourcePreview";
import { PinnedTexture } from "./frontend/PinnedTexture";
import Comments, { CommentUtils } from "./frontend/Comments";
import { addContextMenu } from "./frontend/ContextMenu";
import { PropertyWindows } from "./frontend/userWindows/PropertyWindows";

const zlib = require('zlib');

// Give access to manually trigger garbage collection
require("v8").setFlagsFromString("--expose_gc");
global.gc = require("vm").runInNewContext("gc");

enum TabIndices
{
    EntityList = 0,
    RecordingOptions,
    Connections,
    Filters,
    Info,
    Recent,
    Settings
}

export interface FrameRequest
{
    frame: number;
    entityIdSel?: number;
}

export default class Renderer {
    private sceneController: SceneController;
    private recordedData: RECORDING.NaiveRecordedData;
    private timeline: Timeline;
    private currentPropertyId: number;

    private currentFrameRequest: FrameRequest;

    // Per frame cache
    private frameData: RECORDING.IFrameData;

    // UI Elements
    private controlTabs: TabControl;
    private entityTree: EntityTree;
    private layerController: LayerController;
    private recordingOptions: RecordingOptions;
    private selectedEntityId: number;
    private leftPaneSplitter: Splitter;
    private rightPaneSplitter: Splitter;
    private detailPaneSplitter: Splitter;
    private entitiesPaneSplitter: Splitter;
    private consoleSplitter: Splitter;
    private filterList: FiltersList;
    private filterTickers: FilterTickers;
    private entityPropsBuilder: EntityPropertiesBuilder;
    private shapeArrowController: ShapeLineController;
    
    // Property filter
    private propertySearchInput: HTMLInputElement;
    
    // Tooltio
    private sceneTooltip: HTMLElement;

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
    private pendingEvents: PendingFrames;
    private unprocessedFiltersPending: boolean;

    // Markers
    private pendingMarkers: PendingFrames;
    
    // Others
    private timeoutFilter: any;

    // Settings
    private settingsList: SettingsList;
    private settings: ISettings;

    // Info
    private recordingInfoList: RecordingInfoList;

    // Texture pinning
    private pinnedTexture: PinnedTexture;
    private pinnedTextureWindowId: number = null;

    // Property Windows
    private propertyWindows: PropertyWindows;

    // Comments
    private comments: Comments;

    initialize(canvas: HTMLCanvasElement) {
        const defaultSettings = createDefaultSettings();

        this.sceneController = new SceneController();
        this.sceneController.initialize(
            canvas,
            (entityId: number) => { this.onEntitySelectedOnScene(entityId, true) },
            (pos: RECORDING.IVec3, up: RECORDING.IVec3, forward: RECORDING.IVec3) => { this.onCameraMoved(pos, up, forward) },
            (path: string) => { return this.recordedData.findResource(path); },
            defaultSettings.selectionColor,
            defaultSettings.hoverColor,
            defaultSettings.shapeHoverColor,
            defaultSettings.highlightShapesOnHover,
            defaultSettings.selectionOutlineWidth,
        );
        this.sceneController.onDebugDataUpdated = (data) => {
            if (this.settings && this.settings.showRenderDebug)
            {
                document.getElementById("render-debug").textContent = data;
            }
        };

        this.selectedEntityId = null;

        this.entityPropsBuilder = new EntityPropertiesBuilder(
            {
                onPropertyHover: this.onPropertyHover.bind(this),
                onPropertyStopHovering: this.onPropertyStopHovering.bind(this),
                onCreateFilterFromProperty: this.onCreateFilterFromProperty.bind(this),
                onCreateFilterFromEvent: this.onCreateFilterFromEvent.bind(this),
                onOpenInNewWindow: this.onOpenPropertyNewWindow.bind(this),
                onGroupStarred: this.onGroupStarred.bind(this),
                // Note: twe need to convert to uniqueID here, because the ids are coming from the recording
                // As an alternative, we could re-create the entityrefs when building the frame data
                onGoToEntity: (id) => { this.selectEntity(Utils.toUniqueID(this.frameData.clientId, id)); },
                onGoToShapePos: (id) => { this.moveCameraToShape(id); },
                onPinTexture: (propId) => { 
                    
                    const entity = this.frameData.entities[this.selectedEntityId];

                    const pinnedPropertyPath = NaiveRecordedData.getEntityPropertyPath(entity, propId);
                    this.pinnedTexture.setPinnedEntityId(this.selectedEntityId, pinnedPropertyPath);

                    this.pinnedTexture.applyPinnedTexture(this.pinnedTextureWindowId);
                },
                onAddComment: (propId) => {
                    // You can only add comments to the currently selected entity
                    const entity = this.frameData.entities[this.selectedEntityId];
                    const isFromEvent = NaiveRecordedData.findPropertyIdInEntityEvents(entity, propId) != null;
                    if (isFromEvent)
                        this.comments.addEventPropertyComment(this.getCurrentFrame(), entity.id, propId);
                    else
                        this.comments.addPropertyComment(this.getCurrentFrame(), entity.id, propId);
                },
                isEntityInFrame: (id) => { return this.frameData?.entities[Utils.toUniqueID(this.frameData.clientId, id)] != undefined; },
                isPropertyVisible: (propId) => { return this.sceneController.isPropertyVisible(propId); },
                onGroupLocked: () => { /* Unused here */}
            }
        );

        let connectionsListElement: HTMLElement = document.getElementById(`connectionsList`);
        this.connectionsList = new ConnectionsList(connectionsListElement, this.onMessageArrived.bind(this));
        this.connectionsList.initialize();

        this.pinnedTexture = new PinnedTexture();
        this.pinnedTexture.initialize(
            (entityId) => { return this.frameData?.entities[entityId]; },
            (texture) => { return this.recordedData?.findResource(texture); },
            () => { this.pinnedTextureNewWindow(); }
        );
        this.initializeTimeline();
        this.initializeUI();

        this.shapeArrowController = new ShapeLineController(
            (propertyId) => { return this.entityPropsBuilder.findItemWithValue(propertyId + "") as HTMLElement; },
            (propertyId, subIndex) => { return this.sceneController.getCanvasPositionOfProperty(propertyId, subIndex); },
            defaultSettings.shapeHoverColor
        );

        this.playbackController = new PlaybackController(this, this.timeline);

        this.recordedData = new RECORDING.NaiveRecordedData();

        this.timeline.setLength(this.recordedData.getSize());

        //Shortcuts.registerShortcuts(this.playbackController, this.connectionsList);
        Shortcuts.initShortcuts();

        let recentFilesListElement = document.getElementById(`recentFilesList`);
        let recentFilesWelcomeElement = document.getElementById("recent-files-welcome").querySelector("ul");
        this.recentFilesController = new FileListController(recentFilesListElement, recentFilesWelcomeElement, this.onRecentFileClicked.bind(this), this.onRecentFileOpenInExplorer.bind(this) );

        let versionText = document.getElementById(`version-text`);
        versionText.textContent = `Version: ${LIB_VERSION || "Unknown"}`;
        
        this.pendingEvents = new PendingFrames();
        this.unprocessedFiltersPending = false;

        this.pendingMarkers = new PendingFrames();

        this.currentFrameRequest = null;
        window.requestAnimationFrame(this.render.bind(this));

        this.comments = new Comments(
            {
                getPropertyItem: (propertyId) => { return this.entityPropsBuilder.findItemWithValue(propertyId + "") as HTMLElement; },
                frameCallback: (frame) => { this.requestApplyFrame({ frame: frame }); },
                getTimelineFramePos: (frame) => { return this.timeline.getFramePosition(frame); },
                onCommentAdded: (frame, commentId) => { this.timeline.addComment(frame, commentId); this.updateMetadata(); },
                onCommentDeleted: (frame, commentId) => { this.timeline.removecomment(commentId); this.updateMetadata(); },
                onCommentChanged: (frame, commentId) => { this.updateMetadata(); },
            },
            this.recordedData.comments
        );

        this.propertyWindows = new PropertyWindows(
            (entityId) => { return this.frameData?.entities[entityId]; },
            (propertyId) => { return this.entityPropsBuilder.findItemWithValue(propertyId + "") as HTMLElement; },
        );

        this.requestApplyFrame({ frame: 0});
    }

    render()
    {
        if (this.currentFrameRequest)
        {
            this.applyFrame(this.currentFrameRequest.frame);
            if (this.currentFrameRequest.entityIdSel)
            {
                this.selectEntity(this.currentFrameRequest.entityIdSel);
            }

            this.currentFrameRequest = null;
        }
        window.requestAnimationFrame(this.render.bind(this));
    }

    initializePlaybackBarUI()
    {
        const Action = Shortcuts.ShortcutActions;
        const actionAsText = Shortcuts.getShortcutAsText;

        let playBtn = document.getElementById("timeline-play");
        let nextFrameBtb = document.getElementById("timeline-next");
        let prevFrameBtn = document.getElementById("timeline-prev");
        let firstFrameBtn = document.getElementById("timeline-first");
        let lastFrameBtn = document.getElementById("timeline-last");
        let nextEventBtn = document.getElementById("timeline-event-next");
        let prevEventBtn = document.getElementById("timeline-event-prev");

        playBtn.onmousedown = (e) => { this.playbackController.onTimelinePlayClicked(); e.preventDefault(); }
        nextFrameBtb.onmousedown = (e) => { this.playbackController.onTimelineNextClicked(); e.preventDefault(); }
        prevFrameBtn.onmousedown = (e) => { this.playbackController.onTimelinePrevClicked(); e.preventDefault(); }
        firstFrameBtn.onmousedown = (e) => { this.playbackController.onTimelineFirstClicked(); e.preventDefault(); }
        lastFrameBtn.onmousedown = (e) => { this.playbackController.onTimelineLastClicked(); e.preventDefault(); }
        nextEventBtn.onmousedown = (e) => { this.playbackController.onTimelineNextEventClicked(e.ctrlKey); e.preventDefault(); }
        prevEventBtn.onmousedown = (e) => { this.playbackController.onTimelinePrevEventClicked(e.ctrlKey); e.preventDefault(); }

        const shortcuts = [
            { name: "Toggle Playback",          binding: { keyCode: "Space" },                                 id: Action.TogglePlayback,     callback: () => { this.playbackController.onTimelinePlayClicked(); } },
            { name: "Next Frame",               binding: { keyCode: "ArrowRight" },                        id: Action.NextFrame,          callback: () => { this.playbackController.onTimelineNextClicked(); } },
            { name: "Previous Frame",           binding: { keyCode: "ArrowLeft" },                         id: Action.PrevFrame,          callback: () => { this.playbackController.onTimelinePrevClicked(); } },
            { name: "First Frame",              binding: { keyCode: "ArrowLeft", ctrl: true },             id: Action.FirstFrame,         callback: () => { this.playbackController.onTimelineFirstClicked(); } },
            { name: "Last Frame",               binding: { keyCode: "ArrowRight", ctrl: true },            id: Action.LastFrame,          callback: () => { this.playbackController.onTimelineLastClicked(); } },
            { name: "Previous Event",           binding: { keyCode: "ArrowLeft", alt: true },              id: Action.PrevEvent,          callback: () => { this.playbackController.onTimelinePrevEventClicked(false); } },
            { name: "Next Event",               binding: { keyCode: "ArrowRight", alt: true },             id: Action.NextEvent,          callback: () => { this.playbackController.onTimelineNextEventClicked(false); } },
            { name: "Next Selection Event",     binding: { keyCode: "ArrowRight", alt: true, ctrl: true }, id: Action.NextSelectionEvent, callback: () => { this.playbackController.onTimelineNextEventClicked(true); } },
            { name: "Previous Selection Event", binding: { keyCode: "ArrowLeft", alt: true, ctrl: true },  id: Action.PrevSelectionEvent, callback: () => { this.playbackController.onTimelinePrevEventClicked(true); } },
        ];

        for (let shortcut of shortcuts)
        {
            Shortcuts.registerShortcut(shortcut.name, "Timeline", shortcut.id, shortcut.binding, shortcut.callback);
        }

        firstFrameBtn.title = `Go to first frame (${actionAsText(Action.FirstFrame)})`;
        lastFrameBtn.title = `Go to last frame (${actionAsText(Action.LastFrame)})`;
        nextFrameBtb.title = `Go to next frame (${actionAsText(Action.NextFrame)})`;
        prevFrameBtn.title = `Go to previous frame (${actionAsText(Action.PrevFrame)})`;
        playBtn.title = `Start/Stop playback (${actionAsText(Action.TogglePlayback)})`;
        nextEventBtn.title = `Go to previous frame with events (${actionAsText(Action.PrevEvent)})\nGo to previous frame with events of selected entity (Ctrl+click/${actionAsText(Action.PrevSelectionEvent)})`;
        prevEventBtn.title = `Go to next frame with events (${actionAsText(Action.NextEvent)})\nGo to next frame with events of selected entity (Ctrl+click/${actionAsText(Action.NextSelectionEvent)})`;
    }

    initializeControlBarUI()
    {
        const Action = Shortcuts.ShortcutActions;
        const actionAsText = Shortcuts.getShortcutAsText;

        let openBtn = document.getElementById("title-bar-open");
        let saveBtn = document.getElementById("title-bar-save");
        let clearBtn = document.getElementById("title-bar-clear");
        let helpBtn = document.getElementById("title-bar-help");

        openBtn.onmousedown = (e) => { this.onOpenFile(); e.preventDefault(); }
        saveBtn.onmousedown = (e) => { this.onSaveFile(); e.preventDefault(); }
        clearBtn.onmousedown = (e) => { this.onClearFile(); e.preventDefault(); }
        helpBtn.onmousedown = (e) => { this.onHelpButton(); e.preventDefault(); }

        const shortcuts = [
            { name: "Open Recording",  binding: { keyCode: "KeyO", ctrl: true },      id: Action.OpenFile,       callback: () => { this.onOpenFile(); } },
            { name: "Save Recording",  binding: { keyCode: "KeyS", ctrl: true },      id: Action.SaveFile,       callback: () => { this.onSaveFile(); } },
            { name: "Clear Recording", binding: { keyCode: "Delete", ctrl: true },    id: Action.ClearRecording, callback: () => { this.onClearFile(); } },
            { name: "Toggle Helpt",    binding: { keyCode: "F1" },                    id: Action.ToggleHelp,     callback: () => { this.onHelpButton(); } },
        ];

        for (let shortcut of shortcuts)
        {
            Shortcuts.registerShortcut(shortcut.name, "Title bar", shortcut.id, shortcut.binding, shortcut.callback);
        }

        openBtn.title = `Open a recording (${actionAsText(Action.OpenFile)})`;
        saveBtn.title = `Save current recording in a new file (${actionAsText(Action.SaveFile)})`;
        clearBtn.title = `Remove current recording data (${actionAsText(Action.ClearRecording)})`;
        helpBtn.title = `Open or close welcome window (${actionAsText(Action.ToggleHelp)})`;
    }

    initializeSideBarUI()
    {
        const Action = Shortcuts.ShortcutActions;
        const actionAsText = Shortcuts.getShortcutAsText;

        // Create tab control
        const controlTabElements: HTMLElement[] = [
            document.getElementById("entity-list"), 
            document.getElementById("var-list"),
            document.getElementById("connection-list"),
            document.getElementById("filters-list"),
            document.getElementById("info-list"),
            document.getElementById("recent-list"),
            document.getElementById("setting-list")
        ];

        const controlTabs: HTMLElement[] = Array.from(document.getElementById("control-tabs").children) as HTMLElement[];

        this.controlTabs = new TabControl(
            controlTabs,
            controlTabElements
            , 0, TabBorder.Left, TabDisplay.Flex
        );

        this.controlTabs.closeAllTabs();

        var consoleTabs = new TabControl(
            [ document.getElementById("console-tabs").children[0] as HTMLElement ],
            [ document.getElementById("default-console") ]
            , 0, TabBorder.Left
        );

        const shortcuts = [
            { name: "Entity List",       binding: { keyCode: "KeyE", shift: true, ctrl: true }, id: Action.EntityList,       callback: () => { this.controlTabs.openTabByIndex(TabIndices.EntityList); } },
            { name: "Recording Options", binding: { keyCode: "KeyR", shift: true, ctrl: true }, id: Action.RecordingOptions, callback: () => { this.controlTabs.openTabByIndex(TabIndices.RecordingOptions); } },
            { name: "Connection List",   binding: { keyCode: "KeyC", shift: true, ctrl: true }, id: Action.ConnectionList,   callback: () => { this.controlTabs.openTabByIndex(TabIndices.Connections); } },
            { name: "Filters List",      binding: { keyCode: "KeyF", shift: true, ctrl: true }, id: Action.FilterList,       callback: () => { this.controlTabs.openTabByIndex(TabIndices.Filters); } },
            { name: "Info List",         binding: { keyCode: "KeyI", shift: true, ctrl: true }, id: Action.InfoList,         callback: () => { this.controlTabs.openTabByIndex(TabIndices.Info); } },
            { name: "Recent Files List", binding: { keyCode: "KeyL", shift: true, ctrl: true }, id: Action.RecentFileList,   callback: () => { this.controlTabs.openTabByIndex(TabIndices.Recent); } },
            { name: "Settings",          binding: { keyCode: "KeyS", shift: true, ctrl: true }, id: Action.SettingsList,     callback: () => { this.controlTabs.openTabByIndex(TabIndices.Settings); } },
        ];

        for (let shortcut of shortcuts)
        {
            Shortcuts.registerShortcut(shortcut.name, "Side bar", shortcut.id, shortcut.binding, shortcut.callback);
        }

        console.log(controlTabElements);

        controlTabs[TabIndices.EntityList].title = `Entity list (${actionAsText(Action.EntityList)})`;
        controlTabs[TabIndices.RecordingOptions].title = `Recording Options (${actionAsText(Action.RecordingOptions)})`;
        controlTabs[TabIndices.Connections].title = `Connections (${actionAsText(Action.ConnectionList)})`;
        controlTabs[TabIndices.Filters].title = `Filters (${actionAsText(Action.FilterList)})`;
        controlTabs[TabIndices.Info].title = `Recording Info (${actionAsText(Action.InfoList)})`;
        controlTabs[TabIndices.Recent].title = `Recent Files (${actionAsText(Action.RecentFileList)})`;
        controlTabs[TabIndices.Settings].title = `Settings (${actionAsText(Action.SettingsList)})`;
    }

    initializeUI()
    {
        this.currentPropertyId = 0;

        const callbacks = {
            onEntitySelected: (entityId: number) => { this.onEntitySelected(entityId, false); },
            onEntityDoubleClicked: (entityId: number) => { this.onEntityDoubleClicked(entityId); },
            onEntityMouseOver: (entityId: number) => { this.onEntityHovered(entityId); },
            onEntityMouseOut: (entityId: number) => { this.onEntityStoppedHovering(entityId); }
        }

        this.entityTree = new EntityTree(
            document.getElementById("entity-tree"),
            document.getElementById('entity-search') as HTMLInputElement,
            callbacks);

        this.propertySearchInput = document.getElementById("property-entity-search") as HTMLInputElement;
        this.propertySearchInput.onkeyup = () => { this.buildPropertyTree(); };

        this.initializeSideBarUI();

        const consoleElement = document.getElementById("default-console").children[0] as HTMLElement;
        const consoleSearch = document.getElementById("console-search") as HTMLInputElement;
        this.consoleWindow = new ConsoleWindow(consoleElement, consoleSearch, LogLevel.Verbose);
        Console.setCallbacks((logLevel: LogLevel, channel: LogChannel, ...message: (string | ILogAction)[]) => {this.consoleWindow.log(logLevel, channel, ...message)});

        this.initializePlaybackBarUI();
        this.initializeControlBarUI();

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
            document.getElementById("add-filter-dropdown"),
            document.getElementById("filter-editing-list"),
            {
                onFilterChanged: this.onFilterChanged.bind(this),
                onFilterCreated: this.onFilterAdded.bind(this),
                onFilterRemoved: this.onFilterRemoved.bind(this),
                onFilterNameChanged: this.onFilterNameChanged.bind(this),
                onImportFilters: this.onImportFilters.bind(this),
                onExportFilters: this.onExportFilters.bind(this)
            }
        );

        this.filterTickers = new FilterTickers(
            document.getElementById("filter-ticker-wrapper"),
            (id, visible) => {
                this.filterList.setFilterVisibility(id, visible);
            },
            (id) => {
                this.controlTabs.openTabByIndex(TabIndices.Filters);
                this.filterList.scrollToFilter(id);
            }
        )

        // Recording controls
        this.recordingOptions = new RecordingOptions(
            document.getElementById("recording-option-selection"),
            document.getElementById("recording-option-search") as HTMLInputElement,
            this.onRecordingOptionChanged.bind(this));

        // Create splitters
        this.leftPaneSplitter = new Splitter({
            splitter: document.getElementById("left-pane-splitter"),
            panes: this.controlTabs.tabContentElements,
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
            this.onSettingsChanged.bind(this),
            () => { this.sceneController.purgePools(); },
            () => { this.sceneController.restoreContext(); }
        );

        // Create info
        this.recordingInfoList = new RecordingInfoList(document.getElementById("recording-info"), (frame, commentId) => {
            this.onTimelineCommentClicked(frame, commentId);
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

        this.sceneTooltip = document.getElementById("sceneTooltip");

        document.addEventListener('mousemove', evt => {
            let x = evt.clientX + 20;
            let y = evt.clientY + 20;
         
            this.sceneTooltip.style.left = x + "px";
            this.sceneTooltip.style.top = y + "px";
        });

        // Resource previewer
        ResourcePreview.Init(document.getElementById("resourcePreview"));
    }

    onSettingsChanged()
    {
        if (this.settings)
        {
            this.saveSettings();
            this.applySettings(this.settings);
        }
    }

    onSettingsLoaded(settings: ISettings)
    {
        this.applySettings(settings);
        this.connectionsList.addConnection("localhost", settings.defaultPort, false);
    }

    applySettings(settings: ISettings)
    {
        if (settings.showAllLayersOnStart)
        {
            this.layerController.setInitialState(LayerState.All);
        }
        if (settings.defaultPort)
        {
            (document.getElementById("addConnectionPort") as HTMLInputElement).value = settings.defaultPort;
        }
        if (!settings.showRenderDebug)
        {
            document.getElementById("render-debug").textContent = "";
        }
        if (!settings.followCurrentSelection)
        {
            this.sceneController.stopFollowEntity();
        }

        this.sceneController.setGridHeight(settings.gridHeight);
        this.sceneController.setGridSpacing(settings.gridSpacing);
        this.sceneController.setBackgroundColor(settings.backgroundColor);
        this.sceneController.setAntiAliasingSamples(settings.antialiasingSamples);
        this.sceneController.setOutlineColors(settings.selectionColor, settings.hoverColor);
        this.sceneController.setShapeHoverSettings(settings.highlightShapesOnHover, settings.shapeHoverColor);
        this.sceneController.setOutlineWidth(settings.selectionOutlineWidth);
        this.sceneController.setLightIntensity(settings.lightIntensity);
        this.sceneController.setBackfaceCulling(settings.backFaceCulling);

        this.shapeArrowController.setColor(settings.shapeHoverColor);
        this.shapeArrowController.setEnabled(settings.showShapeLineOnHover);

        this.timeline.setEventPopupActive(settings.showEventPopup);
        this.timeline.setCommentPopupActive(settings.showCommentPopup);

        this.comments.showComments(settings.showComments);
    }

    updateSettings(settings: ISettings)
    {
        if (!this.settings)
        {
            this.onSettingsLoaded(settings);
        }

        this.settings = settings;
        this.settingsList.setSettings(this.settings);
    }

    saveSettings()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.SaveSettings, this.settings));
    }

    loadJsonData(data: string) : boolean
    {
        this.clear();
        const dataJson = JSON.parse(data) as RECORDING.IRecordedData;

        switch(dataJson.type)
        {
            case RECORDING.RecordingFileType.RawFrames:
            {
                // Add trailing brackets
                const rawData = dataJson as NET_TYPES.IRawRecordingData;
                for (const frame of rawData.rawFrames)
                {
                    this.addFrameData(frame);
                }

                this.recordedData.patch(rawData.version);
            }
            break;
            case RECORDING.RecordingFileType.NaiveRecording:
            {
                this.recordedData.loadFromData(dataJson as RECORDING.INaiveRecordedData);
            }
            break;
            default:
            {
                // Used for legacy load, remove once not needed
                const recordingData = dataJson as RECORDING.INaiveRecordedData;
                if (recordingData.frameData) {
                    this.recordedData.loadFromData(recordingData);
                }
                else {
                    throw new Error('Unable to detect type of recording');
                }
            }
        }

        ResourcePreview.Instance().setResourceData(this.recordedData.resources);

        this.timeline.setLength(this.recordedData.getSize());
        this.pendingEvents.markAllPending();
        this.pendingMarkers.markAllPending();
        this.unprocessedFiltersPending = true;

        this.applyFrame(0);
        this.controlTabs.openTabByIndex(TabIndices.EntityList);
        if (this.settings.showAllLayersOnStart)
        {
            this.layerController.setAllLayersState(LayerState.All);
        }

        // Show only selected names as default when opening a file
        this.layerController.setLayerState(CoreLayers.EntityNames, LayerState.Selected);

        // Try to find the screenshot entity if needed
        if (this.settings.autoPinScreenshotEntity)
        {
            for (let entityId in this.frameData.entities)
            {
                const entity = this.frameData.entities[entityId];
                if (NaiveRecordedData.getEntityName(entity) == "Screenshot")
                {
                    // Try to find the resource
                    NaiveRecordedData.visitEntityProperties(entity, (property: RECORDING.IProperty) => {

                        if (RECORDING.isPropertyTextured(property))
                        {
                            const resourcePath = (property as RECORDING.IPropertyTextured).texture;
                            if (resourcePath)
                            {
                                const pinnedPropertyPath = NaiveRecordedData.getEntityPropertyPath(entity, property.id);
                                this.pinnedTexture.setPinnedEntityId(entity.id, pinnedPropertyPath);
                                this.pinnedTexture.applyPinnedTexture(this.pinnedTextureWindowId);
                            }
                        }
                    });
                }
            }
        }

        this.updateMetadata();

        this.comments.setCommentsData(this.recordedData.comments);

        // Select any first entity
        Utils.runAsync(() => {
            for (let entity in this.frameData.entities)
            {
                this.selectEntity(this.frameData.entities[entity].id);
                break;
            }
        });

        return true;
    }

    loadMod(mod: string)
    {
        console.log("Running mod: " + mod);
        eval(mod);
    }

    async loadFilters(data: string)
    {
        this.openModal("Importing filters");
        try {
            const filters = JSON.parse(data) as ExportedFilters;
            this.filterList.importFilters(filters);

            this.closeModal();
        }
        catch (error)
        {
            Console.log(LogLevel.Error, LogChannel.Files, "Error importing filters: " + error.message);
            this.closeModal();
        }
    }

    async loadCompressedData(data: string)
    {
        const { promisify } = require('util');
        const do_unzip = promisify(zlib.unzip);

        try
        {
            this.openModal("Processing data");
            await Utils.nextTick();

            const gzipMagicNumberBase64 = "H4s";

            let dataToLoad = data;
            const isCompressed = data.startsWith(gzipMagicNumberBase64);

            // Try uncompressing
            if (isCompressed)
            {
                this.openModal("Uncompressing");
                await Utils.nextTick();

                const inputBuffer = Buffer.from(data, 'base64');
                const buffer = await do_unzip(inputBuffer);
                dataToLoad = buffer.toString('utf8');
            }

            this.openModal("Parsing file");
            await Utils.nextTick();
            this.loadJsonData(dataToLoad);
            this.closeModal();
        }
        catch (error)
        {
            Console.log(LogLevel.Error, LogChannel.Files, "Error opening file: " + error.message);
            this.closeModal();
        }
    }

    clear()
    {
        this.pendingMarkers.clear();
        this.pendingEvents.clear();
        this.unprocessedFiltersPending = true;
        this.recordedData.clear();
        this.sceneController.clear();
        this.timeline.clear();
        this.timeline.setLength(this.recordedData.getSize());
        this.timeline.clearEvents();
        this.pinnedTexture.clear();
        this.propertyWindows.clear();
        // Avoid clearing recording options, since in all cases when we clear it's better to keep them
        //this.recordingOptions.setOptions([]);
        this.layerController.setLayers([]);
        this.applyFrame(0);
        this.updateMetadata();
        ResourcePreview.Instance().setResourceData(this.recordedData.resources);

        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.CloseAllWindows, ""));
        this.comments.clear();

        this.propertySearchInput.value = "";

        // Trigger Garbace Collection
        global.gc();
    }

    onMessageArrived(id: ConnectionId, data: string) : void
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

                    // Set client Id data
                    this.connectionsList.setConnectionName(id, frame.tag);
                    
                    this.removeOldFrames();
                    this.addFrameData(frame);
                    this.updateMetadata();
                    
                    break;
                }
                case NET_TYPES.MessageType.RecordingOptions:
                {
                    const recordingOptions: NET_TYPES.IMessageRecordingOption[] = message.data as NET_TYPES.IMessageRecordingOption[];
                    this.recordingOptions.setOptions(recordingOptions);
                    break;
                    
                }
                case NET_TYPES.MessageType.SyncOptionsChanged:
                {
                    const renderingDataRequest: NET_TYPES.IMessageSyncOptionsChanged = message.data as NET_TYPES.IMessageSyncOptionsChanged;
                    this.settings.syncVisibleShapes = renderingDataRequest.syncVisibleShapes;
                    this.settings.syncCameraPosition = renderingDataRequest.syncCamera;
                    this.onSettingsChanged();
                    break;
                }
            }
        }
    }

    addFrameData(frame: NET_TYPES.IMessageFrameData)
    {
        const heapStats = process.getHeapStatistics();
        const maxPercentage = 0.9;
        const memoryLimit = heapStats.heapSizeLimit * maxPercentage;
        if (heapStats.totalHeapSize > memoryLimit)
        {
            Console.log(LogLevel.Error, LogChannel.Default,
                `New frame data arrived, but memory is over ${maxPercentage * 100}% of its limit. Discarding frame. Available: ${Utils.memoryToString(memoryLimit * 1000)}, current: ${Utils.memoryToString(heapStats.totalHeapSize * 1000)}`);
            return;
        }


        // Build frame
        let frameToBuild: RECORDING.IFrameData = {
            entities: {},
            serverTime: frame.serverTime,
            clientId: frame.clientId,
            frameId: frame.frameId,
            elapsedTime: frame.elapsedTime,
            tag: frame.tag,
            scene: frame.scene
        };

        // Optional values
        if (frame.coordSystem != null)
        {
            frameToBuild.coordSystem = frame.coordSystem;
        }

        // Add all entity data
        const length = frame.entities.length;
        for (let i=0; i<length; ++i)
        {
            const entityData = frame.entities[i];
            frameToBuild.entities[entityData.id] = entityData;
        }

        // Resources
        if (frame.resources)
        {
            for (let resource of frame.resources)
            {
                this.recordedData.resources[resource.path] = resource;
            }
        }

        this.recordedData.pushFrame(frameToBuild);

        this.timeline.setLength(this.recordedData.getSize());
        this.pendingEvents.pushPending(this.recordedData.getSize() - 1);
        this.pendingMarkers.pushPending(this.recordedData.getSize() - 1);
        this.unprocessedFiltersPending = true;
    }

    removeOldFrames()
    {
        if (this.settings.removeOldFrames)
        {
            const totalFrames = this.recordedData.getSize() + 1;
            if (totalFrames > this.settings.removeOldFramesAmount)
            {
                const framesToRemove = totalFrames - this.settings.removeOldFramesAmount;
                this.recordedData.frameData.splice(0, framesToRemove);

                this.timeline.setLength(this.recordedData.getSize());
                
                this.pendingEvents.markAllPending();
                this.pendingMarkers.markAllPending();
                this.unprocessedFiltersPending = true;

                if (this.settings.removeOldFramesUpdate)
                {
                    this.requestApplyFrame({ frame: this.getCurrentFrame() });
                }
            }
        }
    }

    getNextPropertyId() : string
    {
        return (++this.currentPropertyId).toString();
    }

    requestApplyFrame(request: FrameRequest)
    {
        this.currentFrameRequest = request;
    }

    applyFrame(frame : number) {
        this.frameData = this.recordedData.buildFrameData(frame);

        this.timeline.setCurrentFrame(frame);

        this.layerController.setLayers(this.recordedData.layers);

        // Update frame counter
        const frameText = (this.getFrameCount() > 0) ? (`Frame: ${frame + 1} / ${this.getFrameCount()} (Frame ID: ${this.frameData.frameId}, Tag: ${this.frameData.tag})`) : "No frames";
        document.getElementById("timeline-frame-counter").textContent = frameText;

        // Update entity list
        this.entityTree.setEntities(this.frameData.entities, this.recordedData);

        // Update renderer
        this.sceneController.setCoordinateSystem(this.frameData.coordSystem ?? RECORDING.ECoordinateSystem.LeftHand);
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

        // Update markers
        this.updateTimelineMarkers();

        // Rebuild property tree
        this.buildPropertyTree();

        // Update connections
        this.updateVisibleShapesSyncing();

        // Update pinned info
        this.pinnedTexture.applyPinnedTexture(this.pinnedTextureWindowId);

        // Update propert windows
        this.propertyWindows.updateData(this.frameData, frame);

        // Update comments
        this.comments.selectionChanged(frame, this.selectedEntityId);
    }

    moveCameraToSelection()
    {
        const uniqueId = Utils.toUniqueID(this.frameData.clientId, this.selectedEntityId);
        this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Moving camera to entity:`, this.frameData.frameId, uniqueId);
        this.sceneController.moveCameraToSelection();
    }

    moveCameraToShape(propertyId: number)
    {
        const uniqueId = Utils.toUniqueID(this.frameData.clientId, this.selectedEntityId);
        this.logProperty(LogLevel.Verbose, LogChannel.Selection, `Moving camera to property:`, this.frameData.frameId, uniqueId, propertyId);
        this.sceneController.moveCameraToShape(propertyId);
    }

    onEntityHovered(entityId: number)
    {
        this.sceneController.markEntityAsHovered(entityId);
    }

    onEntityStoppedHovering(entityId: number)
    {
        this.sceneController.unmarkEntityAsHovered(entityId);
    }

    onEntitySelected(entityId: number, scrollIntoView: boolean)
    {
        this.onEntitySelectedOnScene(entityId, scrollIntoView);

        if (this.settings.moveToEntityOnSelection)
        {
            this.moveCameraToSelection();
        }
    }

    onEntityDoubleClicked(entityId: number)
    {
        if (!this.settings.moveToEntityOnSelection)
        {
            this.moveCameraToSelection();
        }
    }

    onEntitySelectedOnScene(entityId: number, scrollIntoView: boolean)
    {
        const uniqueId = Utils.toUniqueID(this.frameData.clientId, entityId);
        this.logEntity(LogLevel.Verbose, LogChannel.Selection, `Selected entity:`, this.frameData.frameId, uniqueId);

        this.selectedEntityId = entityId;
        this.buildPropertyTree();
        if (this.settings.openEntityListOnSelection)
        {
            this.controlTabs.openTabByIndex(TabIndices.EntityList);
        }
        this.entityTree.selectEntity(entityId);
        if (scrollIntoView)
        {
            this.entityTree.scrollToEntity(entityId);
        }
        this.sceneController.markEntityAsSelected(entityId);
        this.timeline.setSelectedEntity(entityId);
        this.renderProperties();

        this.comments.selectionChanged(this.getCurrentFrame(), this.selectedEntityId);
    }

    selectEntity(entityId: number)
    {
        this.onEntitySelected(entityId, true);
    }

    buildPropertyTree()
    {
        const selectedEntity = this.selectedEntityId != null ? this.frameData.entities[this.selectedEntityId] : null;
        const globalData = 
        {
            elapsedTime: this.frameData.elapsedTime,
            serverTime: this.frameData.serverTime
        }

        const filter = this.propertySearchInput.value.toLowerCase();
        
        this.entityPropsBuilder.buildPropertyTree(selectedEntity, globalData, filter);
    }

    updateFrameDataEvents(frameData: RECORDING.IFrameData, frameIdx: number)
    {
        for (let entityID in frameData.entities) {
            const entity = frameData.entities[entityID];
            const uniqueEntityID = Utils.toUniqueID(frameData.clientId, entity.id);
            NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
                this.timeline.addEvent(event.id, uniqueEntityID.toString(), frameIdx, "#D6A3FF", event.name, 0);
            });
        }
    }

    updateTimelineEvents()
    {
        const filters = this.filterList.getFilters();
        if (filters.size > 0)
        {
            if (this.unprocessedFiltersPending)
            {
                this.timeline.clearEvents();
                for (const [filterId, filterData] of filters)
                {
                    if (filterData.visible)
                    {
                        const filterColor = Utils.colorFromHash(filterId);
                        const result = filterData.filter.filter(this.recordedData);
                        this.filterList.setFilterResultsCount(filterId, result.length);

                        for (let i=0; i<result.length; ++i)
                        {
                            const entry = result[i];
                            const clientId = this.recordedData.buildFrameDataHeader(entry.frameIdx).clientId;
                            const uniqueEntityID = Utils.toUniqueID(clientId, entry.entityId);
                            this.timeline.addEvent(i, uniqueEntityID.toString(), entry.frameIdx, filterColor, entry.name, 0);
                        }
                    }
                }

                this.unprocessedFiltersPending = false;
            }
        }
        else
        {
            if (this.pendingEvents.areAllFramesPending())
            {
                this.timeline.clearEvents();
            }

            this.pendingEvents.forEachPendingFrame(this.recordedData, this.updateFrameDataEvents.bind(this));
            this.pendingEvents.clear();
        }

        this.playbackController.updateUI();
    }

    updateFrameDataMarkers(frameData: RECORDING.IFrameData, frameIdx: number)
    {
        if (frameIdx > 0)
        {
            const prevFrameData = this.recordedData.buildFrameDataHeader(frameIdx - 1);
            if (prevFrameData.clientId == frameData.clientId)
            {
                if (frameData.frameId - prevFrameData.frameId > 1)
                {
                    this.timeline.addMarker("Interruption", frameIdx, "#ffa500");
                }
            }
        }
    }
    
    updateTimelineMarkers()
    {
        if (this.pendingMarkers.areAllFramesPending())
        {
            this.timeline.clearMarkers();
        }
        
        this.pendingMarkers.forEachPendingFrame(this.recordedData, this.updateFrameDataMarkers.bind(this));
        this.pendingMarkers.clear();
    }

    updateVisibleShapesSyncing()
    {
        if (this.settings && this.settings.syncVisibleShapes && this.connectionsList.getNumberOfConnections() > 0)
        {
            let remoteEntities = [];
            for (let entityID in this.frameData.entities)
            {
                const entity = this.frameData.entities[entityID];
                const entityVisibleShapes = this.sceneController.collectVisibleShapesOfEntity(entity);
                const remoteEntity : NET_TYPES.IRemoteEntityData = {
                    id: entity.id,
                    name: NaiveRecordedData.getEntityName(entity),
                    position: NaiveRecordedData.getEntityPosition(entity),
                    shapes: entityVisibleShapes
                };
                remoteEntities.push(remoteEntity);
            }

            this.connectionsList.sendToAllConnections({ 
                type: NET_TYPES.MessageType.SyncVisibleShapesData,
                data: {
                    entities: remoteEntities,
                    coordinateSystem: this.sceneController.getCoordinateSystem()
                }
            });
        }
    }

    renderProperties()
    {
        try
        {
            let sceneController = this.sceneController;
            sceneController.removeAllProperties();
            sceneController.hideAllLabels();

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

                sceneController.updateEntityLabel(entity);
            }

            sceneController.refreshOutlineTargets();
        }
        catch (error)
        {
            Console.log(LogLevel.Error, LogChannel.Files, "Error rendering scene: " + error.message);
        }
    }

    initializeTimeline()
    {
        let timelineElement: HTMLCanvasElement = <HTMLCanvasElement><unknown>document.getElementById('timeline');
        let timelineWrapper: HTMLElement = document.getElementById('timeline-wrapper');
        this.timeline = new Timeline(timelineElement, timelineWrapper);
        this.timeline.setFrameClickedCallback(this.onTimelineClicked.bind(this));
        this.timeline.setEventClickedCallback(this.onTimelineEventClicked.bind(this));
        this.timeline.setCommentClickedCallback(this.onTimelineCommentClicked.bind(this));
        this.timeline.setTimelineUpdatedCallback(this.onTimelineUpdated.bind(this));
        this.timeline.setRangeChangedCallback((initFrame, endFrame) => { this.playbackController.updateUI(); });
        this.timeline.setGetEntityNameCallback((entity, frameIdx) => { return this.findEntityNameOnFrame(Number.parseInt(entity), frameIdx); });
        this.timeline.setGetCommentTextCallback((commentId) => { return this.recordedData.comments[commentId].text; });

        // Context menu
        const config = [
            { text: "Add comment in current frame", icon: "fa-comment", callback: () => { 
                const currentFrame = this.getCurrentFrame();
                this.comments.addTimelineComment(currentFrame);
            } },
        ];
        addContextMenu(timelineWrapper, config);
    }

    getCurrentFrame()
    {
        return this.timeline.getCurrentFrame();
    }

    getFrameCount()
    {
        return this.timeline.getLength();
    }

    getElapsedTimeOfFrame(frame: number)
    {
        if (frame == this.getCurrentFrame())
        {
            return this.frameData.elapsedTime;
        }
        else
        {
            return this.recordedData.buildFrameDataHeader(frame).elapsedTime;
        }
    }

    getServerTimeOfFrame(frame: number)
    {
        if (frame == this.getCurrentFrame())
        {
            return this.frameData.serverTime;
        }
        else
        {
            return this.recordedData.buildFrameDataHeader(frame).serverTime;
        }
    }

    getClientIdOfFrame(frame: number)
    {
        if (frame == this.getCurrentFrame())
        {
            return this.frameData.clientId;
        }
        else
        {
            return this.recordedData.buildFrameDataHeader(frame).clientId;
        }
    }

    updateRecentFiles(paths: string[])
    {
        this.recentFilesController.updateRecentFiles(paths);

    }

    // Property tree callbacks
    onPropertyHover(propertyId: number, subIndex: number)
    {
        this.sceneController.showProperty(propertyId);

        const pos = this.sceneController.getCanvasPositionOfProperty(propertyId, subIndex);
        if (pos)
        {
            this.shapeArrowController.activate(propertyId, subIndex);
        }
    }

    onPropertyStopHovering(propertyId: number)
    {
        this.sceneController.hideProperty(propertyId);
        this.shapeArrowController.deactivate();
    }

    onCreateFilterFromProperty(propertyId: number, subIndex: number)
    {
        const eventData = NaiveRecordedData.findPropertyIdInEvents(this.frameData, propertyId);
        if (eventData != null)
        {
            this.filterList.addFilter(new Filters.EventFilter(eventData.resultEvent.name, eventData.resultEvent.tag, Filters.createMemberFilterFromProperty(eventData.resultProp, subIndex)));
            this.controlTabs.openTabByIndex(TabIndices.Filters);
        }
        else
        {
            const property: RECORDING.IProperty = NaiveRecordedData.findPropertyIdInProperties(this.frameData, propertyId);
            this.filterList.addFilter(new Filters.PropertyFilter("", Filters.createMemberFilterFromProperty(property, subIndex)));
            this.controlTabs.openTabByIndex(TabIndices.Filters);
        }
    }

    onOpenPropertyNewWindow(propertyId: number)
    {
        const frame = this.getCurrentFrame();
        this.propertyWindows.openPropertyNewWindow(propertyId, this.selectedEntityId, frame, this.frameData);
    }

    onCreateFilterFromEvent(name: string, tag: string)
    {
        this.filterList.addFilter(new Filters.EventFilter(name, tag, []));
        this.controlTabs.openTabByIndex(TabIndices.Filters);
    }

    onGroupStarred(name: string, starred: boolean)
    {
        this.buildPropertyTree();
    }

    // Timeline callbacks
    onTimelineClicked(frame: number)
    {
        this.requestApplyFrame({ frame: frame });
    }

    onTimelineEventClicked(entityId: string, frame: number)
    {
        const clientId = this.recordedData.buildFrameDataHeader(frame).clientId;
        const uniqueId = Utils.toUniqueID(clientId, Number.parseInt(entityId));
        this.logEntity(LogLevel.Verbose, LogChannel.Timeline, "Event selected in timeline. ", frame, uniqueId);
        this.requestApplyFrame({ frame: frame, entityIdSel: Number.parseInt(entityId) });
    }

    onTimelineCommentClicked(frame: number, commentId: number)
    {
        // Find the right comment
        for (let comId in this.recordedData.comments)
        {
            if (parseInt(comId) == commentId)
            {
                const comment = this.recordedData.comments[comId];
                switch (comment.type)
                {
                    case RECORDING.ECommentType.Timeline:
                    {
                        this.logFrame(LogLevel.Verbose, LogChannel.Timeline, "Timeline comment selected in timeline. ", frame);
                        this.requestApplyFrame({ frame: frame });
                    }
                    break;
                    case RECORDING.ECommentType.Property:
                    case RECORDING.ECommentType.EventProperty:
                    {
                        const propComment = comment as RECORDING.IPropertyComment;
                        this.logEntity(LogLevel.Verbose, LogChannel.Timeline, "Property comment selected in timeline. ", frame, propComment.entityId);
                        this.requestApplyFrame({ frame: frame, entityIdSel: propComment.entityId });
                    }
                    break;
                }
            }
        }
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
        const hasPartialSelection : boolean = this.timeline.getSelectionInit() != 0 
            || this.timeline.getSelectionEnd() != this.timeline.getLength() - 1;
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.RequestSavePath, {
            defaultName: Utils.getFormattedFilename(this.settings.exportNameFormat),
            askForPartialSave: hasPartialSelection
        }));
    }

    async saveToPath(path: string, saveOnlySelection: boolean)
    {
        const { promisify } = require('util');
        const do_zip = promisify(zlib.gzip);
        
        try {
            this.openModal("Gathering data");
            await Utils.delay(10);

            // Build data to save
            let dataToSave = this.recordedData;
            if (saveOnlySelection)
            {
                let data = new NaiveRecordedData();

                data.layers = this.recordedData.layers;
                data.clientIds = this.recordedData.clientIds;
                const firstFrame = this.timeline.getSelectionInit();
                const lastFrame = this.timeline.getSelectionEnd();

                for (let i=firstFrame; i<=lastFrame; ++i)
                {
                    data.frameData.push(this.recordedData.frameData[i]);

                    // Collect resources. Note: this is quite slow, since we need to visit every single property
                    for (let entityId in this.recordedData.frameData[i].entities)
                    {
                        const entityData = this.recordedData.frameData[i].entities[entityId];

                        let collectResources = (property: RECORDING.IProperty) =>
                        {
                            if (RECORDING.isPropertyTextured(property))
                            {
                                const resourcePath = (property as RECORDING.IPropertyTextured).texture;
                                if (resourcePath)
                                    data.resources[resourcePath] = dataToSave.resources[resourcePath];
                            }
                        };
                        
                        NaiveRecordedData.visitProperties(entityData.properties, (property: RECORDING.IProperty) => {
                            collectResources(property);
                        });
                        NaiveRecordedData.visitEvents(entityData.events, (event: RECORDING.IEvent) => {
                            NaiveRecordedData.visitProperties([event.properties], (property: RECORDING.IProperty) => {
                                collectResources(property);
                            });
                        });
                    }
                }

                // Collect comments
                for (let commentId in this.recordedData.comments)
                {
                    const comment = this.recordedData.comments[commentId];
                    if (comment.frameId >= firstFrame && comment.frameId <= lastFrame)
                    {
                        // We need to correct the frame, which mens we need a deep copy, to avoid changing the original comment
                        const deepCopy = JSON.parse(JSON.stringify(comment));
                        data.comments[comment.id] = deepCopy;
                        
                        // Adapt frameId and frameRefs in text
                        const diff = -firstFrame;
                        let copiedComment = data.comments[comment.id];
                        copiedComment.frameId += diff;

                        copiedComment.text = CommentUtils.shiftContentFrameRefs(copiedComment.text, diff);
                    }
                }

                dataToSave = data;
            }

            this.openModal("Loading resources");
            await Utils.delay(10);

            for (let path in dataToSave.resources)
            {
                try {
                    const resource = dataToSave.resources[path];
                    await loadResource(resource);
                }
                catch(e) {
                    Console.log(LogLevel.Warning, LogChannel.Files, "Coudn't load resource, skipping: " + path);
                }
            }

            this.openModal("Serializing data");
            await Utils.delay(10);

            const data = JSON.stringify(dataToSave);
            this.openModal("Compressing data");
            const buffer: Buffer = await do_zip(data);
            const content = buffer.toString('base64');

            ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.SaveToFile, 
                {
                    content: content,
                    path: path
                }
            ));

            this.closeModal();
        }
        catch (error)
        {
            Console.log(LogLevel.Error, LogChannel.Files, "Error compressing file");
            this.closeModal();
        }
    }

    onClearFile()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Clear, ""));
    }

    onHelpButton()
    {
        this.toggleWelcomeMessage();
    }

    // Recent files callbacks
    onRecentFileClicked(path: string)
    {
        this.openModal("Opening File");
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.Load, path));
    }

    onRecentFileOpenInExplorer(path: string)
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.OpenInExplorer, path));
    }

    // Layer callbacks
    onLayerChanged(name: string, state: LayerState)
    {
        this.sceneController.updateLayerStatus(name, state);
        this.applyFrame(this.timeline.getCurrentFrame());
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

    // Filter callbacks
    onFilterAdded(id: FilterId, name: string, filter: Filters.Filter)
    {
        this.filterTickers.addTicker(id, name, filter);
    }

    onFilterRemoved(id: FilterId)
    {
        this.filterTickers.removeTicker(id);
    }

    onFilterNameChanged(id: FilterId, name: string)
    {
        this.filterTickers.setTickerName(id, name);
    }

    onFilterChanged(id: FilterId, name: string, filter: Filters.Filter)
    {
        this.unprocessedFiltersPending = true;

        const filters = this.filterList.getFilters();
        if (filters.size == 0)
        {
            this.pendingEvents.markAllPending();
        }

        clearTimeout(this.timeoutFilter);
        this.timeoutFilter = setTimeout(() => {
            this.updateTimelineEvents();
        }, 500);
    }

    onImportFilters()
    {
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.RequestImportFilters, ""));
    }

    onExportFilters()
    {
        const exportedFilters = this.filterList.exportFilters();
        const exportedFilterData = JSON.stringify(exportedFilters);
        ipcRenderer.send('asynchronous-message', new Messaging.Message(Messaging.MessageType.RequestExportFilters, exportedFilterData));
    }

    onCameraMoved(pos: RECORDING.IVec3, up: RECORDING.IVec3, forward: RECORDING.IVec3)
    {
        // TODO: Optimize this by adding or removing the callback depending on the settings
        if (this.settings && this.settings.syncCameraPosition)
        {
            this.connectionsList.sendToAllConnections({ 
                type: NET_TYPES.MessageType.SyncCameraData,
                data: {
                    position: pos,
                    up: up,
                    forward: forward
                }
            });
        }
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
        // TODO: Important: with multiple connections, frameId is no longer unique. FrameID + ClientID is unique. We need to update that.
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

    buildEntityLogAction(frameId: number, uniqueId: number) : ILogAction
    {
        const entityName = this.findEntityName(uniqueId);
        const entityId = Utils.getEntityIdUniqueId(uniqueId);

        return {
            text: `${entityName} (id: ${entityId}, clientId: ${Utils.getClientIdUniqueId(uniqueId)}) (frameID: ${frameId})`,
            tooltip: `Go to frame ${frameId.toString()} and select entity ${entityName}`,
            callback: () => {
                const frame = this.findFrameById(frameId)
                if (frame >= 0)
                {
                    this.applyFrame(frame);
                    this.selectEntity(entityId);
                }
            }
        };
    }

    buildPropertyLogAction(frameId: number, uniqueId: number, propertyId: number) : ILogAction
    {
        const entity = this.findEntityFromUniqueId(uniqueId);
        const entityId = Utils.getEntityIdUniqueId(uniqueId);
        const property = entity ? RECORDING.NaiveRecordedData.findPropertyIdInEntity(entity, propertyId) : null;
        const propertyName = property ? property.name : "Unknown";

        return {
            text: `${propertyName} (id: ${propertyId})`,
            tooltip: `Go to frame ${frameId.toString()} and view property ${propertyName}`,
            callback: () => {
                const frame = this.findFrameById(frameId)
                if (frame >= 0)
                {
                    this.applyFrame(frame);
                    this.selectEntity(entityId);
                    this.moveCameraToShape(propertyId);
                }
            }
        };
    }

    logEntity(level: LogLevel, channel: LogChannel, message: string, frameId: number, uniqueId: number)
    {
        Console.log(level, channel, `${message} `, this.buildEntityLogAction(frameId, uniqueId));
    }

    logProperty(level: LogLevel, channel: LogChannel, message: string, frameId: number, uniqueId: number, propertyId: number)
    {
        Console.log(level, channel,
            `${message} `,
            this.buildPropertyLogAction(frameId, uniqueId, propertyId),
            " from entity ",
            this.buildEntityLogAction(frameId, uniqueId));
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

    // Metadata
    updateMetadata()
    {
        this.recordingInfoList.buildInfoList(this.recordedData);
    }

    // Utils
    findEntityFromUniqueId(uniqueId: number) : RECORDING.IEntity
    {
        const entityId = Utils.getEntityIdUniqueId(uniqueId);
        return this.frameData.entities[entityId];
    }

    findEntityName(uniqueId: number) : string
    {
        const entity = this.findEntityFromUniqueId(uniqueId);
        if (entity)
        {
            return RECORDING.NaiveRecordedData.getEntityName(entity);
        }

        return "";
    }

    findEntityNameOnFrame(uniqueId: number, frameIdx: number) : string
    {
        const frameInfo = this.recordedData.frameData[frameIdx];
        if (frameInfo)
        {
            const entityId = Utils.getEntityIdUniqueId(uniqueId);
            const entity = frameInfo.entities[entityId];
            if (entity)
            {
                return RECORDING.NaiveRecordedData.getEntityName(entity);
            }
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

    toggleWelcomeMessage()
    {
        if (this.isWelcomeMessageActive())
        {
            document.body.classList.remove("welcome-active");
            this.controlTabs.openTabByIndex(TabIndices.RecordingOptions);
        }
        else
        {
            document.body.classList.add("welcome-active");
            this.controlTabs.closeAllTabs();
        }
    }

    async pinnedTextureNewWindow()
    {
        if (this.pinnedTextureWindowId == null)
        {
            const size = this.pinnedTexture.getImgSize();
            const windowId = await UserWindows.requestOpenWindow(this.pinnedTexture.getTitle(), size.x, size.y);
            this.pinnedTextureWindowId = windowId;
        }

        this.pinnedTexture.applyPinnedTexture(this.pinnedTextureWindowId);
    }

    onUserWindowClosed(id: number)
    {
        if (this.pinnedTextureWindowId == id)
        {
            this.pinnedTextureWindowId = null;
            this.pinnedTexture.setEnabled();
            this.pinnedTexture.applyPinnedTexture(this.pinnedTextureWindowId);
        }

        this.propertyWindows.onWindowClosed(id);
    }
}

const renderer = new Renderer();
renderer.initialize(document.getElementById('render-canvas') as unknown as HTMLCanvasElement);
initWindowControls();
initMessageHandling(renderer);