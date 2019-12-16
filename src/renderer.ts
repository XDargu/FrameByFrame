import { ipcRenderer } from "electron";
import * as RECORDING from './recording/RecordingData';
import Timeline from './timeline/timeline';
import ConnectionsList from './frontend/ConnectionsList';
import * as BASICO from './ui/ui';
import * as NET_TYPES from './network/types';
import SceneController from './render/sceneController';
import * as Messaging from "./messaging/MessageDefinitions";

class PlaybackController {

    private renderer: Renderer;
    private isPlaying: boolean;
    private elapsedTime: number;

    constructor(renderer: Renderer) {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.renderer = renderer;
    }

    update(elapsedSeconds: number) {
        if (this.isPlaying)
        {
            this.elapsedTime += elapsedSeconds;

            // Check how many frames we have to skip
            let currentFrame = this.renderer.getCurrentFrame();
            let currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);

            while (this.elapsedTime > currentElapsedTime && currentFrame < this.renderer.getFrameCount() - 1)
            {
                currentFrame++;
                this.elapsedTime -= currentElapsedTime;
                currentElapsedTime = this.renderer.getElapsedTimeOfFrame(currentFrame);
            }

            this.renderer.applyFrame(currentFrame);

            // Stop in the last frame
            if (currentFrame == this.renderer.getFrameCount() - 1)
            {
                this.stopPlayback();
            }
        }
    }

    updateUI()
    {
        if (this.isPlaying) {
            document.getElementById("timeline-play-icon").classList.remove("fa-play");
            document.getElementById("timeline-play-icon").classList.add("fa-stop");
        }
        else {
            document.getElementById("timeline-play-icon").classList.remove("fa-stop");
            document.getElementById("timeline-play-icon").classList.add("fa-play");
        }

        if (this.renderer.getCurrentFrame() == 0) {
            document.getElementById("timeline-first").classList.add("basico-disabled");
            document.getElementById("timeline-prev").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-first").classList.remove("basico-disabled");
            document.getElementById("timeline-prev").classList.remove("basico-disabled");
        }

        if (this.renderer.getCurrentFrame() == this.renderer.getFrameCount() - 1) {
            document.getElementById("timeline-last").classList.add("basico-disabled");
            document.getElementById("timeline-next").classList.add("basico-disabled");
        }
        else {
            document.getElementById("timeline-last").classList.remove("basico-disabled");
            document.getElementById("timeline-next").classList.remove("basico-disabled");
        }
    }

    startPlayback()
    {
        this.isPlaying = true;
        this.updateUI();
    }

    stopPlayback()
    {
        this.isPlaying = false;
        this.elapsedTime = 0;
        this.updateUI();
    }

    onTimelineNextClicked()
    {
        if (this.renderer.getCurrentFrame() < this.renderer.getFrameCount() - 1) {
            this.renderer.applyFrame(this.renderer.getCurrentFrame() + 1);
            this.updateUI();
        }
    }

    onTimelinePrevClicked()
    {
        if (this.renderer.getCurrentFrame() > 0) {
            this.renderer.applyFrame(this.renderer.getCurrentFrame() - 1);
            this.updateUI();
        }
    }

    onTimelineFirstClicked()
    {
        if (this.renderer.getCurrentFrame() != 0) {
            this.renderer.applyFrame(0);
            this.updateUI();
        }
    }

    onTimelineLastClicked()
    {
        if (this.renderer.getCurrentFrame() != this.renderer.getFrameCount() - 1) {
            this.renderer.applyFrame(this.renderer.getFrameCount() - 1);
            this.updateUI();
        }
    }

    onTimelinePlayClicked()
    {
        if (!this.isPlaying)
        {
            this.startPlayback();
        }
        else
        {
            this.stopPlayback();
        }
    }
}

export default class Renderer {
    private sceneController: SceneController;
    private recordedData: RECORDING.NaiveRecordedData;
    private timeline: Timeline;
    private currentPropertyId: number;

    // Per frame cache
    private frameData: RECORDING.IFrameData;

    // UI Elements
    private propertyTree: BASICO.TreeControl;
    private entityList: BASICO.ListControl;
    private selectedEntityId: number;

    // Networking
    private connectionsList: ConnectionsList;

    // Playback
    private playbackController: PlaybackController;

    initialize(canvas: HTMLCanvasElement) {

        this.playbackController = new PlaybackController(this);

        this.sceneController = new SceneController();
        this.sceneController.initialize(canvas);
        this.sceneController.onEntitySelected = this.onEntitySelected.bind(this);

        this.selectedEntityId = null;

        this.initializeTimeline();
        this.initializeUI();

        this.recordedData = new RECORDING.NaiveRecordedData();
        //this.recordedData.addTestData();

        this.timeline.updateLength(this.recordedData.getSize());

        let connectionsListElement: HTMLElement = document.getElementById(`connectionsList`);
        this.connectionsList = new ConnectionsList(connectionsListElement, this.onMessageArrived.bind(this));
        this.connectionsList.initialize();

        this.applyFrame(0);
    }

    initializeUI()
    {
        // Create tree
        let treeParent = document.getElementById('property-tree');
        this.propertyTree = new BASICO.TreeControl(treeParent);

        this.currentPropertyId = 0;
        
        var trans = this.propertyTree.addItem(this.propertyTree.root, "Transform", false, this.getNextPropertyId());
        this.propertyTree.addItem(trans, "Position: 12 56 32", true, this.getNextPropertyId());

        var nav = this.propertyTree.addItem(this.propertyTree.root, "Navigation", false, this.getNextPropertyId());
        var targetData = this.propertyTree.addItem(nav, "Target Data", true, this.getNextPropertyId());
        this.propertyTree.addItem(targetData, "Position: 50 150 32", true, this.getNextPropertyId());
        this.propertyTree.addItem(targetData, "Distance: 12", true, this.getNextPropertyId());

        const entityListElement = <HTMLElement>document.getElementById('entity-list').querySelector('.basico-list');

        this.entityList = new BASICO.ListControl(entityListElement);

        // Create tab control
        var controlTabs = new BASICO.TabControl(
            <HTMLElement[]><any>document.getElementById("control-tabs").children,
            [
                document.getElementById("entity-list"), 
                document.getElementById("var-list"),
                document.getElementById("connection-list"),
                document.getElementById("recent-list"),
                document.getElementById("setting-list")
            ]
        );

        // Create timeline callbacks
        document.getElementById("timeline-play").onclick = this.playbackController.onTimelinePlayClicked.bind(this.playbackController);
        document.getElementById("timeline-next").onclick = this.playbackController.onTimelineNextClicked.bind(this.playbackController);
        document.getElementById("timeline-prev").onclick = this.playbackController.onTimelinePrevClicked.bind(this.playbackController);
        document.getElementById("timeline-first").onclick = this.playbackController.onTimelineFirstClicked.bind(this.playbackController);
        document.getElementById("timeline-last").onclick = this.playbackController.onTimelineLastClicked.bind(this.playbackController);

        // Create control bar callbacks
        document.getElementById("control-bar-open").onclick = this.onOpenFile.bind(this);
        document.getElementById("control-bar-save").onclick = this.onSaveFile.bind(this);
        document.getElementById("control-bar-clear").onclick = this.onClearFile.bind(this);
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
                this.entityList.appendElement(entityName, function(element) {
                    renderer.onEntitySelected(parseInt(renderer.entityList.getValueOfItem(element)));
                }, entityID);
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

    onEntitySelected(entityId: number)
    {
        console.log("Selected: " + entityId);
        this.selectedEntityId = entityId;
        this.buildPropertyTree();
        this.entityList.selectElementOfValue(entityId.toString());
        this.sceneController.markEntityAsSelected(entityId);
        this.renderProperties();
    }

    buildPropertyTree()
    {
        this.propertyTree.clear();

        if (this.selectedEntityId != null)
        {
            const selectedEntity = this.frameData.entities[this.selectedEntityId];

            if (selectedEntity)
            {
                for (let i=0; i<selectedEntity.properties.length; ++i)
                {
                    this.addToPropertyTree(this.propertyTree.root, selectedEntity.properties[i]);
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

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty)
    {
        if (property.type == "group")
        {
            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            const propertyGroup = property as RECORDING.IPropertyGroup;

            for (let i=0; i<propertyGroup.value.length; ++i)
            {
                this.addToPropertyTree(addedItem, propertyGroup.value[i]);
            }
        }
        else if (property.type == "vec3")
        {
            const vector = property.value as RECORDING.IVec3;

            this.propertyTree.addItem(parent, property.name + ": " + vector.x + ", " + vector.y + ", " + + vector.z, false, property.id.toString());
        }
        else if (property.type == "sphere")
        {
            const sphere = property as RECORDING.IPropertySphere;

            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            this.propertyTree.addItem(addedItem, "Position: " + sphere.position.x + ", " + sphere.position.y + ", " + + sphere.position.z);
            this.propertyTree.addItem(addedItem, "Radius: " + sphere.radius);
        }
        else if (property.type == "aabb")
        {
            const aabb = property as RECORDING.IPropertyAABB;

            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            this.propertyTree.addItem(addedItem, "Position: " + aabb.position.x + ", " + aabb.position.y + ", " + + aabb.position.z);
            this.propertyTree.addItem(addedItem, "Size: " + aabb.size.x + ", " + aabb.size.y + ", " + + aabb.size.z);
        }
        else if (property.type == "oobb")
        {
            const oobb = property as RECORDING.IPropertyOOBB;

            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            this.propertyTree.addItem(addedItem, "Position: " + oobb.position.x + ", " + oobb.position.y + ", " + + oobb.position.z);
            this.propertyTree.addItem(addedItem, "Size: " + oobb.size.x + ", " + oobb.size.y + ", " + + oobb.size.z);
            this.propertyTree.addItem(addedItem, "Forward: " + oobb.forward.x + ", " + oobb.forward.y + ", " + + oobb.forward.z);
            this.propertyTree.addItem(addedItem, "Up: " + oobb.up.x + ", " + oobb.up.y + ", " + + oobb.up.z);
        }
        else if (property.type == "plane")
        {
            const plane = property as RECORDING.IPropertyPlane;

            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            this.propertyTree.addItem(addedItem, "Position: " + plane.position.x + ", " + plane.position.y + ", " + + plane.position.z);
            this.propertyTree.addItem(addedItem, "Normal: " + plane.normal.x + ", " + plane.normal.y + ", " + + plane.normal.z);
            this.propertyTree.addItem(addedItem, "Up: " + plane.up.x + ", " + plane.up.y + ", " + + plane.up.z);
            this.propertyTree.addItem(addedItem, "Width: " + plane.width);
            this.propertyTree.addItem(addedItem, "Length: " + plane.length);
        }
        else if (property.type == "line")
        {
            const line = property as RECORDING.IPropertyLine;

            let addedItem = this.propertyTree.addItem(parent, property.name, false, property.id.toString());
            this.propertyTree.addItem(addedItem, "Origin: " + line.origin.x + ", " + line.origin.y + ", " + + line.origin.z);
            this.propertyTree.addItem(addedItem, "Destination: " + line.destination.x + ", " + line.destination.y + ", " + + line.destination.z);
        }
        else
        {
            this.propertyTree.addItem(parent, property.name + ": " + property.value, false, property.id.toString());
        }
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
        }
    }
});