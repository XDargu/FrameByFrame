import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { GridMaterial } from 'babylonjs-materials';
import { Quaternion } from 'babylonjs';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

interface IEntityData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, BABYLON.Mesh>;
}

// Unused for now, should be used later on
class UniversalCameraCustomKeyboardInput implements BABYLON.ICameraInput<BABYLON.UniversalCamera>
{
    camera: BABYLON.UniversalCamera;
    
    private keysLeft = [37, 65];
    private keysRight = [39, 68];
    private keysUp = [38, 87];
    private keysDown = [40, 83];
    private sensibility = 0.2;

    private _keys: number[] = [];
    private _onKeyDown: (ev: KeyboardEvent)=> any
    private _onKeyUp: (ev: KeyboardEvent)=> any
    
    getClassName(): string {
        return "UniversalCameraCustomKeyboardInput";
    }
    getSimpleName(): string {
        return "CustomKeyboardInput";
    }
    attachControl(element: HTMLElement, noPreventDefault?: boolean): void {
        var _this = this;
        if (!this._onKeyDown) {
            element.tabIndex = 1;
            this._onKeyDown = function (evt) {
                if (_this.keysLeft.indexOf(evt.keyCode) !== -1 || _this.keysRight.indexOf(evt.keyCode) !== -1) {
                    var index = _this._keys.indexOf(evt.keyCode);
                    if (index === -1) {
                        _this._keys.push(evt.keyCode);
                    }
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
            };
            this._onKeyUp = function (evt) {
                if (_this.keysLeft.indexOf(evt.keyCode) !== -1 || _this.keysRight.indexOf(evt.keyCode) !== -1) {
                    var index = _this._keys.indexOf(evt.keyCode);
                    if (index >= 0) {
                        _this._keys.splice(index, 1);
                    }
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
            };

            element.addEventListener("keydown", this._onKeyDown, false);
            element.addEventListener("keyup", this._onKeyUp, false);
        }
    }

    detachControl(element: HTMLElement): void {
        if (this._onKeyDown) {
            element.removeEventListener("keydown", this._onKeyDown);
            element.removeEventListener("keyup", this._onKeyUp);
            this._keys = [];
            this._onKeyDown = null;
            this._onKeyUp = null;
        }
    }

    checkInputs() {
        if (this._onKeyDown) {
            var camera = this.camera;

            // Keyboard
            for (var index = 0; index < this._keys.length; index++) {
                var keyCode = this._keys[index];
                if (this.keysLeft.indexOf(keyCode) !== -1) {
                    const right = camera.getWorldMatrix().getRow(0).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.subtract(right) , this.sensibility);
                }
                else if (this.keysRight.indexOf(keyCode) !== -1) {
                    const right = camera.getWorldMatrix().getRow(0).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.add(right) , this.sensibility);
                }
                else if (this.keysUp.indexOf(keyCode) !== -1) {
                    const forward = camera.getWorldMatrix().getRow(2).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.add(forward) , this.sensibility);

                    //camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(1), this.sensibility);
                }
                else if (this.keysDown.indexOf(keyCode) !== -1) {
                    const forward = camera.getWorldMatrix().getRow(2).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.subtract(forward) , this.sensibility);
                    //camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(-1), this.sensibility);
                }
            }
        }
    }
}

class MaterialPool
{
    private pool: Map<string, BABYLON.StandardMaterial>;
    private scene: BABYLON.Scene;

    constructor(scene: BABYLON.Scene)
    {
        this.pool = new Map<string, BABYLON.StandardMaterial>();
        this.scene = scene;
    }

    getMaterialByColor(color: RECORDING.IColor): BABYLON.StandardMaterial
    {
        return this.getMaterial(color.r, color.g, color.b, color.a);
    }

    getMaterial(r: number, g: number, b:number, a:number) : BABYLON.StandardMaterial
    {
        // TODO: Do a proper hash not string based
        const hash: string = r.toString() + g.toString() + b.toString() + a.toString();
        const cachedMaterial = this.pool.get(hash);
        if (cachedMaterial != undefined)
        {
            return cachedMaterial;
        }

        let material = new BABYLON.StandardMaterial("cachedMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.alpha = a;

        this.pool.set(hash, material);
        return material;
    }
}

class LayerManager
{
    private layers: Map<string, number>;

    constructor()
    {
        this.layers = new Map<string, number>();
    }

    getLayerMask(layer: string)
    {
        const mask = this.layers.get(layer);
        if (mask != undefined)
        {
            return mask;
        }

        const newMask = 1 << this.layers.size;
        this.layers.set(layer, newMask);
        return newMask;
    }

    getLayerMaskCombination(layers: string[]) : number
    {
        let mask = 0x10000000;
        for (const layer of layers)
        {
            mask = mask | this.getLayerMask(layer);
        }

        return mask;
    }

    clear()
    {
        this.layers.clear();
    }
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

    private materialPool: MaterialPool;
    private layerManager: LayerManager;

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
            this.layerManager.clear();
        }
    }

    private isPropertyShape(property: RECORDING.IProperty)
    {
        return property.type == "sphere" || property.type == "line"|| property.type == "plane" || property.type == "aabb" || property.type == "oobb";
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
                    sphere.layerMask = this.layerManager.getLayerMask(sphereProperty.layer);

                    sphere.position.set(sphereProperty.position.x, sphereProperty.position.y, sphereProperty.position.z);

                    sphere.material = this.materialPool.getMaterialByColor(sphereProperty.color);

                    entityData.properties.set(sphereProperty.id, sphere);
                }
                else if (property.type == "aabb")
                {
                    let aabbProperty = property as RECORDING.IPropertyAABB;

                    // #TODO: This should be in a mesh/material pool
                    let aabb = BABYLON.MeshBuilder.CreateBox(aabbProperty.name, {height: aabbProperty.size.x, width: aabbProperty.size.y, depth: aabbProperty.size.z}, this._scene)
                    aabb.isPickable = false;
                    aabb.id = aabbProperty.id.toString();
                    aabb.layerMask = this.layerManager.getLayerMask(aabbProperty.layer);

                    aabb.position.set(aabbProperty.position.x, aabbProperty.position.y, aabbProperty.position.z);

                    aabb.material = this.materialPool.getMaterialByColor(aabbProperty.color);

                    entityData.properties.set(aabbProperty.id, aabb);
                }
                else if (property.type == "oobb")
                {
                    let oobbProperty = property as RECORDING.IPropertyOOBB;

                    // #TODO: This should be in a mesh/material pool
                    let oobb = BABYLON.MeshBuilder.CreateBox(oobbProperty.name, {height: oobbProperty.size.y, width: oobbProperty.size.x, depth: oobbProperty.size.z}, this._scene)
                    oobb.isPickable = false;
                    oobb.id = oobbProperty.id.toString();
                    oobb.layerMask = this.layerManager.getLayerMask(oobbProperty.layer);


                    oobb.position.set(oobbProperty.position.x, oobbProperty.position.y, oobbProperty.position.z);
                    let up = new BABYLON.Vector3(oobbProperty.up.x, oobbProperty.up.y, oobbProperty.up.z);
                    let forward = new BABYLON.Vector3(oobbProperty.forward.x, oobbProperty.forward.y, oobbProperty.forward.z);
                    let right = BABYLON.Vector3.Cross(up, forward);

                    let rotationMatrix = new BABYLON.Matrix();
                    rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
                    rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
                    rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
                    oobb.rotationQuaternion = new Quaternion();
                    oobb.rotationQuaternion.fromRotationMatrix(rotationMatrix);

                    oobb.material = this.materialPool.getMaterialByColor(oobbProperty.color);

                    entityData.properties.set(oobbProperty.id, oobb);
                }
                else if (property.type == "plane")
                {
                    const planeProperty = property as RECORDING.IPropertyPlane;
                    
                    let sourcePlane = new BABYLON.Plane(planeProperty.normal.x, planeProperty.normal.y, planeProperty.normal.z, 0);

                    // #TODO: This should be in a mesh/material pool
                    let plane = BABYLON.MeshBuilder.CreatePlane("plane", {height: planeProperty.length, width: planeProperty.width, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, this._scene);
                    plane.isPickable = false;
                    plane.id = planeProperty.id.toString();
                    plane.layerMask = this.layerManager.getLayerMask(planeProperty.layer);

                    plane.position.set(planeProperty.position.x, planeProperty.position.y, planeProperty.position.z);
                    
                    // #TODO: Rotate plane
                    let up = new BABYLON.Vector3(planeProperty.up.x, planeProperty.up.y, planeProperty.up.z);
                    let angle = BABYLON.Vector3.GetAngleBetweenVectors(plane.forward, up, plane.up);
                    plane.rotate(plane.up, angle, BABYLON.Space.WORLD);

                    plane.material = this.materialPool.getMaterialByColor(planeProperty.color);

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
                    lines.layerMask = this.layerManager.getLayerMask(lineProperty.layer);

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
        sphere.layerMask = 0x10000000;
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
                //this.selectedEntity.mesh.material = this.entityMaterial;
                this.selectedEntity.mesh.renderOutline = false;
            }

            //storedMesh.mesh.material = this.selectedMaterial;
            this.selectedEntity = storedMesh;

            this.selectedEntity.mesh.outlineColor = new BABYLON.Color3(1, 0, 0);
            this.selectedEntity.mesh.outlineWidth = 0.2;
            this.selectedEntity.mesh.renderOutline = true;
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
                this.hoveredEntity.mesh.renderOutline = false;
                //this.hoveredEntity.mesh.material = this.entityMaterial;
            }

            //storedMesh.mesh.material = this.hoveredMaterial;
            this.hoveredEntity = storedMesh;

            this.hoveredEntity.mesh.outlineColor = new BABYLON.Color3(0, 1, 0);
            this.hoveredEntity.mesh.outlineWidth = 0.2;
            this.hoveredEntity.mesh.renderOutline = true;
        }
    }

    onEntityStopHovered()
    {
        // Restore previous entity material
        if (this.hoveredEntity)
        {
            this.hoveredEntity.mesh.renderOutline = false;
            //this.hoveredEntity.mesh.material = this.entityMaterial;
        }
        this.hoveredEntity = null;
    }

    updateCameraLayers(layers: string[])
    {
        this._scene.cameras[0].layerMask = this.layerManager.getLayerMaskCombination(layers);
    }

    initialize(canvas: HTMLCanvasElement) {
        const engine = new BABYLON.Engine(canvas, true, { stencil: true });
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

        this.materialPool = new MaterialPool(this._scene);
        this.layerManager = new LayerManager();
        

        // This creates and positions a free camera (non-mesh)
        //const camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);
        const camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(10, 10, -10), scene);
        camera.inertia = 0;
        camera.speed = 10;
        camera.angularSensibility = 500;

        // Manually add inputs here for WASD
        let keyboardInputs: any = camera.inputs.attached['keyboard'];
        keyboardInputs.keysDown.push(83);
        keyboardInputs.keysUp.push(87);
        keyboardInputs.keysLeft.push(65);
        keyboardInputs.keysRight.push(68);

        // Move forward with mouse wheel
        let zoomCallback = function(evt: WheelEvent) {
            const delta = Math.max(-1, Math.min(1,(evt.deltaY)));
            camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(-delta), 0.5);
        }

        canvas.addEventListener("wheel", zoomCallback, false);

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
        grid.layerMask = 0x10000000;

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
                if (control.selectedEntity.mesh.id != pickInfo.pickedMesh.id) {
                    control.onEntityHovered(parseInt(pickInfo.pickedMesh.id));
                }
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