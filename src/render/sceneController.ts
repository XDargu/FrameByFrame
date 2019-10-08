import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { GridMaterial } from 'babylonjs-materials';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

interface IEntityData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, BABYLON.Mesh>;
}

export default class SceneController
{
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;

    /* Basic ideas regarding scenes:
     - Entities are registered and added to a map by id
     - Shapes rendered by entities (as part of their properties) will be added to those entities, and will be stored in a map by property ID
     - Shapes, materials, etc. Should be stored in pools to reduce overhead if possible.
     - Instead of creating and destroying entities constantly, we can just move them around, and maybe hide the ones that doesn´t exist in the current frame
    */

    private entities: Map<number, IEntityData>;
    private selectedEntity: IEntityData;
    private hoveredEntity: IEntityData;

    private entityMaterial: BABYLON.StandardMaterial;
    private selectedMaterial: BABYLON.StandardMaterial;
    private hoveredMaterial: BABYLON.StandardMaterial;

    public onEntitySelected: IEntitySelectedCallback;

    removeAllProperties()
    {
        for (let data of this.entities.values())
        {
            for (let propertyMesh of data.properties.values())
            {
                this._scene.removeMesh(propertyMesh, true);
                if (propertyMesh.material)
                {
                    this._scene.removeMaterial(propertyMesh.material);
                }
            }
            data.properties.clear();
        }
    }

    private isPropertyShape(property: RECORDING.IProperty)
    {
        return property.type == "sphere" || property.type == "line"|| property.type == "plane";
    }

    addProperty(entity: RECORDING.IEntity, property: RECORDING.IProperty)
    {
        if (this.isPropertyShape(property))
        {
            let entityData = this.entities.get(entity.id);
            
            if (entityData)
            {
                if (property.type == "sphere")
                {
                    let sphereProperty = property as RECORDING.IPropertySphere;

                    // #TODO: This should be in a mesh/material pool
                    let sphere = BABYLON.Mesh.CreateSphere(sphereProperty.name, 8.0, sphereProperty.radius * 2, this._scene);
                    sphere.isPickable = false;
                    sphere.id = sphereProperty.id.toString();

                    sphere.position.set(sphereProperty.position.x, sphereProperty.position.y, sphereProperty.position.z);

                    let material = new BABYLON.StandardMaterial("entityMaterial", this._scene);
                    material.diffuseColor = new BABYLON.Color3(sphereProperty.color.r, sphereProperty.color.g, sphereProperty.color.b);
                    material.alpha = sphereProperty.color.a;
                    sphere.material = material;

                    entityData.properties.set(sphereProperty.id, sphere);
                }
                else if (property.type == "plane")
                {
                    const planeProperty = property as RECORDING.IPropertyPlane;
                    
                    let sourcePlane = new BABYLON.Plane(planeProperty.normal.x, planeProperty.normal.y, planeProperty.normal.z, 0);

                    // #TODO: This should be in a mesh/material pool
                    let plane = BABYLON.MeshBuilder.CreatePlane("plane", {height: planeProperty.length, width: planeProperty.width, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, this._scene);
                    plane.isPickable = false;
                    plane.id = planeProperty.id.toString();

                    plane.position.set(planeProperty.position.x, planeProperty.position.y, planeProperty.position.z);
                    
                    // #TODO: Rotate plane
                    let up = new BABYLON.Vector3(planeProperty.up.x, planeProperty.up.y, planeProperty.up.z);
                    let angle = BABYLON.Vector3.GetAngleBetweenVectors(plane.forward, up, plane.up);
                    plane.rotate(plane.up, angle, BABYLON.Space.WORLD);

                    let material = new BABYLON.StandardMaterial("entityMaterial", this._scene);
                    material.diffuseColor = new BABYLON.Color3(planeProperty.color.r, planeProperty.color.g, planeProperty.color.b);
                    material.alpha = planeProperty.color.a;
                    plane.material = material;

                    entityData.properties.set(planeProperty.id, plane);
                }
                else if (property.type == "line")
                {
                    let lineProperty = property as RECORDING.IPropertyLine;

                    let linePoints = [
                        new BABYLON.Vector3(lineProperty.origin.x, lineProperty.origin.y, lineProperty.origin.z),
                        new BABYLON.Vector3(lineProperty.destination.x, lineProperty.destination.y, lineProperty.destination.z),
                    ];

                    let lineColors = [
                        new BABYLON.Color4(lineProperty.color.r, lineProperty.color.g, lineProperty.color.b, lineProperty.color.a),
                        new BABYLON.Color4(lineProperty.color.r, lineProperty.color.g, lineProperty.color.b, lineProperty.color.a),
                    ];

                    let lines = BABYLON.MeshBuilder.CreateLines("lines", {points: linePoints, colors: lineColors}, this._scene);
                    lines.isPickable = false;
                    lines.id = lineProperty.id.toString();

                    entityData.properties.set(lineProperty.id, lines);
                }
            }
        }
    }

    createEntity(entity: RECORDING.IEntity) : IEntityData
    {
        let sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 1.0, this._scene);
        sphere.material = this.entityMaterial;
        sphere.isPickable = true;
        sphere.id = entity.id.toString();
        let entityData: IEntityData = { mesh: sphere, properties: new Map<number, BABYLON.Mesh>() };
        this.entities.set(entity.id, entityData);
        return entityData;
    }

    setEntity(entity: RECORDING.IEntity)
    {
        let entityData = this.entities.get(entity.id);
        if (!entityData)
        {
            entityData = this.createEntity(entity);
        }
        
        const postion = RECORDING.NaiveRecordedData.getEntityPosition(entity);
        entityData.mesh.position.set(postion.x, postion.y, postion.z);
        entityData.mesh.setEnabled(true);
    }

    hideAllEntities()
    {
        for (let data of this.entities.values())
        {
            data.mesh.setEnabled(false);
        }
    }

    markEntityAsSelected(id: number)
    {
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.selectedEntity)
            {
                this.selectedEntity.mesh.material = this.entityMaterial;
            }

            storedMesh.mesh.material = this.selectedMaterial;
            this.selectedEntity = storedMesh;
        }
    }

    onEntityHovered(id: number)
    {
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.hoveredEntity)
            {
                if (this.hoveredEntity == this.selectedEntity)
                {
                    this.hoveredEntity.mesh.material = this.selectedMaterial;
                }
                else
                {
                    this.hoveredEntity.mesh.material = this.entityMaterial;
                }
            }

            storedMesh.mesh.material = this.hoveredMaterial;
            this.hoveredEntity = storedMesh;
        }
    }

    onEntityStopHovered()
    {
        // Restore previous entity material
        if (this.hoveredEntity)
        {
            if (this.hoveredEntity == this.selectedEntity)
            {
                this.hoveredEntity.mesh.material = this.selectedMaterial;
            }
            else
            {
                this.hoveredEntity.mesh.material = this.entityMaterial;
            }
        }
        this.hoveredEntity = null;
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

        this.entities = new Map<number, IEntityData>();
    }

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

        // Grid
        var grid = BABYLON.Mesh.CreatePlane("plane", 100.0, scene);
        grid.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
        grid.isPickable = false;

        var groundMaterial = new GridMaterial("groundMaterial", scene);
        groundMaterial.majorUnitFrequency = 5;
        groundMaterial.minorUnitVisibility = 0.45;
        groundMaterial.gridRatio = 1;
        groundMaterial.backFaceCulling = false;
        groundMaterial.mainColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        groundMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        groundMaterial.opacity = 0.5;

        grid.material = groundMaterial;

        this.entityMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.entityMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.entityMaterial.alpha = 0.8;

        this.selectedMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.selectedMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
        this.selectedMaterial.alpha = 0.8;

        this.hoveredMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.hoveredMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.hoveredMaterial.alpha = 0.8;

        // Mouse picking
        // We need this to let the system select invisible meshes
        scene.pointerDownPredicate = function(mesh) {
            return mesh.isPickable;
        }

        scene.pointerMovePredicate = function(mesh) {
            return mesh.isPickable;
        }

        let control = this;
        //When pointer down event is raised
        scene.onPointerDown = function (evt, pickResult) {
            // if the click hits the ground object, we change the impact position
            if (pickResult.hit) {
                control.onEntitySelected(parseInt(pickResult.pickedMesh.id));
            }
        };

        scene.onPointerMove = function (evt, pickInfo) {
            if (pickInfo.hit) {
                control.onEntityHovered(parseInt(pickInfo.pickedMesh.id));
                canvas.style.cursor = "pointer";
            }
            else {
                control.onEntityStopHovered();
            }
        };

        //Creation of a box
        //(name of the box, size, scene)
        /*var box = BABYLON.Mesh.CreateBox("box", 6.0, scene);

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
        ribbon.position = new BABYLON.Vector3(-10, -10, 20);*/
    }
} 