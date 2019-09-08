import * as BABYLON from 'babylonjs';
import RecordedData from './recording/RecordingData';
import Timeline from './timeline/timeline';

export default class Renderer {
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private recordedData: RecordedData;
    private timeline: Timeline;

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

        this.initializeTimeline();

        this.recordedData = new RecordedData();
        this.recordedData.addTestData();

        this.timeline.length = this.recordedData.frameTable.entryIDs.length;

        this.applyFrame(0);
    }

    applyFrame(frame : number) {
        const frameData = this.recordedData.buildFrameData(frame);

        this.timeline.currentFrame = frame;

        console.log(frameData);
        console.log(this.recordedData);

        let entityList = document.getElementById("entity-list");
        let listElement = entityList.querySelector(".basico-list");

        let counter = 0;
        for (let entityID in frameData.entities) {
            let element = <HTMLElement>listElement.children[counter];

            if (element) {
                element.innerText = entityID;
            }
            else {
                let listItem = document.createElement("div");
                listItem.classList.add("basico-list-item");
                listItem.innerText = entityID;
                listElement.appendChild(listItem);
            }
            counter++;
        }

        // Remove remaining elements
        for (let i=counter; i<listElement.childElementCount; i++)
        {
            let element = <HTMLElement>listElement.children[i];
            listElement.removeChild(element);
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