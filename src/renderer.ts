import * as RECORDING from './recording/RecordingData';
import Timeline from './timeline/timeline';
import ConnectionsList from './frontend/ConnectionsList';
import * as BASICO from './ui/ui';
import * as NET_TYPES from './network/types';
import SceneController from './render/sceneController';


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

    initialize(canvas: HTMLCanvasElement) {

        this.sceneController = new SceneController();
        this.sceneController.initialize(canvas);
        this.sceneController.onEntitySelected = this.onEntitySelected.bind(this);

        this.selectedEntityId = null;

        this.initializeTimeline();
        this.initializeUI();

        this.recordedData = new RECORDING.NaiveRecordedData();
        this.recordedData.addTestData();

        this.timeline.length = this.recordedData.getSize();

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
                    this.timeline.length = this.recordedData.getSize();

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

        console.log(this.frameData);
        console.log(this.recordedData);

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
        for (let i=counter; i<listElement.childElementCount; i++)
        {
            let element = <HTMLElement>listElement.children[i];
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
        if (this.selectedEntityId != null)
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
        }
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
    }

    onTimelineClicked(frame: number)
    {
        this.applyFrame(frame);
    }
}

const renderer = new Renderer();
renderer.initialize(document.getElementById('render-canvas') as HTMLCanvasElement);