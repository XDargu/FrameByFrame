import * as BABYLON from 'babylonjs';
import * as RECORDING from './recording/RecordingData';
import Timeline from './timeline/timeline';
import ConnectionsManager from './network/conectionsManager';
import ConnectionId from './network/conectionsManager';
import * as BASICO from './ui/ui';
import Connection from './network/simpleClient';


export default class Renderer {
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
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
    private connectionsManager: ConnectionsManager;
    private connectionsMap: Map<ConnectionId, HTMLElement>

    createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
        this._canvas = canvas;

        this._engine = engine;

        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);
        this._scene = scene;

        // This creates and positions a free camera (non-mesh)
        const camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        //Creation of a box
        //(name of the box, size, scene)
        var box = BABYLON.Mesh.CreateBox("box", 6.0, scene);

        //Creation of a sphere 
        //(name of the sphere, segments, diameter, scene) 
        var sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 10.0, scene);

        //Creation of a plan
        //(name of the plane, size, scene)
        var plan = BABYLON.Mesh.CreatePlane("plane", 10.0, scene);

        //Creation of a cylinder
        //(name, height, diameter, tessellation, scene, updatable)
        var cylinder = BABYLON.Mesh.CreateCylinder("cylinder", 3, 3, 3, 6, 1, scene, false);

        // Creation of a torus
        // (name, diameter, thickness, tessellation, scene, updatable)
        var torus = BABYLON.Mesh.CreateTorus("torus", 5, 1, 10, scene, false);

        // Creation of a knot
        // (name, radius, tube, radialSegments, tubularSegments, p, q, scene, updatable)
        var knot = BABYLON.Mesh.CreateTorusKnot("knot", 2, 0.5, 128, 64, 2, 3, scene);

        // Creation of a lines mesh
        var lines = BABYLON.Mesh.CreateLines("lines", [
            new BABYLON.Vector3(-10, 0, 0),
            new BABYLON.Vector3(10, 0, 0),
            new BABYLON.Vector3(0, 0, -10),
            new BABYLON.Vector3(0, 0, 10)
        ], scene);

        // Creation of a ribbon
        // let's first create many paths along a maths exponential function as an example 
        var exponentialPath = function (p : number) {
            var path = [];
            for (var i = -10; i < 10; i++) {
                path.push(new BABYLON.Vector3(p, i, Math.sin(p / 3) * 5 * Math.exp(-(i - p) * (i - p) / 60) + i / 3));
            }
            return path;
        };
        // let's populate arrayOfPaths with all these different paths
        var arrayOfPaths = [];
        for (var p = 0; p < 20; p++) {
            arrayOfPaths[p] = exponentialPath(p);
        }

        // (name, array of paths, closeArray, closePath, offset, scene)
        var ribbon = BABYLON.Mesh.CreateRibbon("ribbon", arrayOfPaths, false, false, 0, scene);

        // Moving elements
        box.position = new BABYLON.Vector3(-10, 0, 0);   // Using a vector
        sphere.position = new BABYLON.Vector3(0, 10, 0); // Using a vector
        plan.position.z = 10;                            // Using a single coordinate component
        cylinder.position.z = -10;
        torus.position.x = 10;
        knot.position.y = -10;
        ribbon.position = new BABYLON.Vector3(-10, -10, 20);
    }

    initialize(canvas: HTMLCanvasElement) {
        const engine = new BABYLON.Engine(canvas, true);
        this.createScene(canvas, engine);

        engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener('resize', function () {
            engine.resize();
        });

        this.selectedEntityId = null;

        this.initializeTimeline();
        this.initializeUI();

        this.recordedData = new RECORDING.NaiveRecordedData();
        this.recordedData.addTestData();

        this.timeline.length = this.recordedData.getSize();
        this.connectionsManager = new ConnectionsManager();
        this.connectionsMap = new Map<ConnectionId, HTMLElement>();

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

        var renderer = this;
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

        // Connections
        let addConnectionButton: HTMLElement = document.getElementById("addConnectionBtn");
        addConnectionButton.onclick = this.addConnectionCallback.bind(this);
    }

    // Networking
    addConnectionCallback()
    {
        let addressElement: HTMLInputElement = document.getElementById("addConnectionAddress") as HTMLInputElement;
        let portElement: HTMLInputElement = document.getElementById("addConnectionPort") as HTMLInputElement;

        const id: ConnectionId = this.connectionsManager.addConnection(addressElement.value, portElement.value) as unknown as ConnectionId;

        // Add new element to list
        let html:string = `<div class="basico-title basico-title-compact" id="connection-${id}">${addressElement.value}:${portElement.value}</div>
                    <div class="basico-card">
                        <div class="basico-list basico-list-compact">
                            <div class="basico-list-item">Status<div class="basico-tag" id="connection-${id}-status">Connecting...</div></div>
                        </div>
                        <div class="basico-card-footer">
                            <div class="basico-button-group">
                                <div class="basico-button basico-small" id="connection-${id}-connect">Disconnect</div>
                                <div class="basico-button basico-small" id="connection-${id}-remove">Remove connection</div>
                            </div>
                        </div>
                    </div>`;

        let connectionsList: HTMLElement = document.getElementById(`connectionsList`);
        connectionsList.innerHTML += html;

        let connectionElement: HTMLElement = document.getElementById(`connection-${id}`);
        this.connectionsMap.set(id, connectionElement);

        let connectButton: HTMLElement = document.getElementById(`connection-${id}-connect`);
        let removeButton: HTMLElement = document.getElementById(`connection-${id}-remove`);
        let connectionStatus: HTMLElement = document.getElementById(`connection-${id}-status`);
        
        let control = this;
        connectButton.onclick = function() {
            control.connectButtonCallback(id);
        };
        removeButton.onclick = function() {
            control.removeButtonCallback(id);
        };

        let connection: Connection = this.connectionsManager.getConnection(<number><unknown>id);
        connection.onMessage = function(openEvent : MessageEvent) {
            // TODO: Record data
        };
        connection.onConnected = function(openEvent : Event) {
            connectionStatus.textContent = "Connected";
        };
        connection.onDisconnected = function(closeEvent : CloseEvent) {
            connectionStatus.textContent = "Disconnected";
        };
        connection.onError = function(errorEvent : Event) {
            // TODO: Output the error somewhere?
        };

        console.log(connection);
    }

    connectButtonCallback(id: ConnectionId)
    {
        let connectionStatus: HTMLElement = document.getElementById(`connection-${id}-status`);
        let connectButton: HTMLElement = document.getElementById(`connection-${id}-connect`);
        let connection: Connection = this.connectionsManager.getConnection(<number><unknown>id);

        if (connection.isConnected())
        {
            connection.disconnect();
            connectionStatus.textContent = "Disconnecting...";
            connectButton.textContent = "Connect";
        }
        else
        {
            connectionStatus.textContent = "Connecting...";
            connectButton.textContent = "Disconnect";
            connection.connect();
        }
    }

    removeButtonCallback(id: ConnectionId)
    {
        let connectionsList: HTMLElement = document.getElementById(`connectionsList`);
        let connectionElement: HTMLElement = this.connectionsMap.get(id);

        connectionsList.removeChild(connectionElement);

        this.connectionsManager.removeConnection(<number><unknown>id);
        this.connectionsMap.delete(id);
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

        let counter = 0;
        for (let entityID in this.frameData.entities) {
            let element = <HTMLElement>listElement.children[counter];

            const entityName = RECORDING.NaiveRecordedData.getEntityName(this.frameData.entities[entityID]);

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

        // Rebuild property tree
        this.buildPropertyTree();
    }

    onEntitySelected(entityId: number)
    {
        console.log("Selected: " + entityId);
        this.selectedEntityId = entityId;
        this.buildPropertyTree();
    }

    buildPropertyTree()
    {
        this.propertyTree.clear();

        if (this.selectedEntityId != null)
        {
            const selectedEntity = this.frameData.entities[this.selectedEntityId];

            for (let i=0; i<selectedEntity.properties.length; ++i)
            {
                this.addToPropertyTree(this.propertyTree.root, selectedEntity.properties[i]);
            }
        }
    }

    addToPropertyTree(parent: HTMLElement, property: RECORDING.IProperty)
    {
        if (property.type == "group")
        {
            let addedItem = this.propertyTree.addItem(parent, property.name);
            for (let i=0; i<property.value.length; ++i)
            {
                this.addToPropertyTree(addedItem, property.value[i]);
            }
        }
        else
        {
            this.propertyTree.addItem(parent, property.name + ": " + property.value);
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