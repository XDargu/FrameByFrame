import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { GridMaterial } from 'babylonjs-materials';
import { LayerState } from '../frontend/LayersController';
import * as Utils from '../utils/utils';
import { getOutlineShader, OutlineEffect } from './outlineShader';
import { AxisGizmo } from './gizmos';
import { MaterialPool } from './materialPool';
import { BoxPool, CapsulePool, LinePool, PlanePool, SpherePool } from './meshPools';

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
/*class UniversalCameraCustomKeyboardInput implements BABYLON.ICameraInput<BABYLON.UniversalCamera>
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
}*/

class LayerManager
{
    private layers: Map<string, LayerState>;

    constructor()
    {
        this.layers = new Map<string, LayerState.Off>();
    }

    setLayerState(layer: string, state: LayerState)
    {
        this.layers.set(layer, state);
    }

    getLayerState(layer: string)
    {
        const state = this.layers.get(layer);
        return state != undefined ? state : LayerState.Off;
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
    private _camera: BABYLON.UniversalCamera;

    /* Basic ideas regarding scenes:
     - Entities are registered and added to a map by id
     - Shapes rendered by entities (as part of their properties) will be added to those entities, and will be stored in a map by property ID
     - Shapes, materials, etc. Should be stored in pools to reduce overhead if possible.
     - Instead of creating and destroying entities constantly, we can just move them around, and maybe hide the ones that doesn´t exist in the current frame
    */

    private entities: Map<number, IEntityData>;
    private propertyToEntity: Map<number, number>;

    private selectedEntityId: number;
    private selectedEntity: IEntityData;
    private hoveredEntity: IEntityData;

    private entityMaterial: BABYLON.StandardMaterial;
    private selectedMaterial: BABYLON.StandardMaterial;
    private hoveredMaterial: BABYLON.StandardMaterial;

    public onEntitySelected: IEntitySelectedCallback;

    private materialPool: MaterialPool;
    private layerManager: LayerManager;

    // Mesh pools
    private capsulePool: CapsulePool;
    private spherePool: SpherePool;
    private boxPool: BoxPool;
    private planePool: PlanePool;
    private linePool: LinePool;

    // Gizmos
    private axisGizmo: AxisGizmo;

    private isFollowingEntity: boolean;

    // Outline
    private selectionOutline: OutlineEffect;
    private hoverOutline: OutlineEffect;

    removeAllProperties()
    {
        for (let data of this.entities.values())
        {
            for (let propertyMesh of data.properties.values())
            {
                if (!this.capsulePool.freeMesh(propertyMesh))
                {
                    if (!this.spherePool.freeMesh(propertyMesh))
                    {
                        if (!this.boxPool.freeMesh(propertyMesh))
                        {
                            if (!this.planePool.freeMesh(propertyMesh))
                            {
                                if (!this.linePool.freeMesh(propertyMesh))
                                {
                                    this._scene.removeMesh(propertyMesh, true);
                                }
                            }
                        }
                    }
                }
            }
            data.properties.clear();
        }
    }

    private isPropertyShape(property: RECORDING.IProperty)
    {
        return property.type == "sphere" || 
            property.type == "line"||
            property.type == "plane" ||
            property.type == "aabb" ||
            property.type == "oobb" ||
            property.type == "capsule" ||
            property.type == "mesh";
    }

    addProperty(entity: RECORDING.IEntity, property: RECORDING.IProperty)
    {
        if (!this.isPropertyShape(property)) { return; }

        const shape = property as RECORDING.IProperyShape;
        const layerState = this.layerManager.getLayerState(shape.layer);
        
        if (layerState == LayerState.Off) { return; }
        if (layerState == LayerState.Selected && this.selectedEntityId != entity.id) { return; }
        
        let entityData = this.entities.get(entity.id);
        if (!entityData) { return; }

        if (property.type == "sphere")
        {
            let sphereProperty = property as RECORDING.IPropertySphere;

            let sphere = this.spherePool.getSphere(sphereProperty.radius);
            sphere.isPickable = true;
            sphere.id = sphereProperty.id.toString();

            sphere.position.set(sphereProperty.position.x, sphereProperty.position.y, sphereProperty.position.z);

            sphere.material = this.materialPool.getMaterialByColor(sphereProperty.color);

            entityData.properties.set(sphereProperty.id, sphere);
            this.propertyToEntity.set(sphereProperty.id, entity.id);
        }
        else if (property.type == "capsule")
        {
            let capsuleProperty = property as RECORDING.IPropertyCapsule;

            let capsule = this.capsulePool.getCapsule(capsuleProperty.height, capsuleProperty.radius);
            capsule.isPickable = true;
            capsule.id = capsuleProperty.id.toString();

            capsule.position.set(capsuleProperty.position.x, capsuleProperty.position.y, capsuleProperty.position.z);

            const direction = new BABYLON.Vector3(capsuleProperty.direction.x, capsuleProperty.direction.y, capsuleProperty.direction.z);
            //capsule.lookAt(capsule.position.add(direction));
            
            let up = new BABYLON.Vector3(capsuleProperty.direction.x, capsuleProperty.direction.y, capsuleProperty.direction.z);
            let forward = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 2, 3).normalize()).normalize();
            let right = BABYLON.Vector3.Cross(up, forward).normalize();

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            capsule.rotationQuaternion = new BABYLON.Quaternion();
            capsule.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            capsule.material = this.materialPool.getMaterialByColor(capsuleProperty.color);

            entityData.properties.set(capsuleProperty.id, capsule);
            this.propertyToEntity.set(capsuleProperty.id, entity.id);
        }
        else if (property.type == "aabb")
        {
            let aabbProperty = property as RECORDING.IPropertyAABB;

            let aabb = this.boxPool.getBox(aabbProperty.size);
            aabb.isPickable = true;
            aabb.id = aabbProperty.id.toString();

            aabb.position.set(aabbProperty.position.x, aabbProperty.position.y, aabbProperty.position.z);

            aabb.material = this.materialPool.getMaterialByColor(aabbProperty.color);

            entityData.properties.set(aabbProperty.id, aabb);
            this.propertyToEntity.set(aabbProperty.id, entity.id);
        }
        else if (property.type == "oobb")
        {
            let oobbProperty = property as RECORDING.IPropertyOOBB;

            let oobb = this.boxPool.getBox(oobbProperty.size);
            oobb.isPickable = true;
            oobb.id = oobbProperty.id.toString();

            oobb.position.set(oobbProperty.position.x, oobbProperty.position.y, oobbProperty.position.z);
            let up = new BABYLON.Vector3(oobbProperty.up.x, oobbProperty.up.y, oobbProperty.up.z);
            let forward = new BABYLON.Vector3(oobbProperty.forward.x, oobbProperty.forward.y, oobbProperty.forward.z);
            let right = BABYLON.Vector3.Cross(up, forward);

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            oobb.rotationQuaternion = new BABYLON.Quaternion();
            oobb.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            oobb.material = this.materialPool.getMaterialByColor(oobbProperty.color);

            entityData.properties.set(oobbProperty.id, oobb);
            this.propertyToEntity.set(oobbProperty.id, entity.id);
        }
        else if (property.type == "plane")
        {
            const planeProperty = property as RECORDING.IPropertyPlane;
            
            let plane = this.planePool.getPlane(planeProperty.normal, planeProperty.length, planeProperty.width);
            plane.isPickable = true;
            plane.id = planeProperty.id.toString();

            plane.position.set(planeProperty.position.x, planeProperty.position.y, planeProperty.position.z);

            let right = new BABYLON.Vector3(planeProperty.up.x, planeProperty.up.y, planeProperty.up.z);
            let forward = new BABYLON.Vector3(planeProperty.normal.x, planeProperty.normal.y, planeProperty.normal.z);
            let up = BABYLON.Vector3.Cross(forward, right);

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            plane.rotationQuaternion = new BABYLON.Quaternion();
            plane.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            plane.material = this.materialPool.getMaterialByColor(planeProperty.color);

            entityData.properties.set(planeProperty.id, plane);
            this.propertyToEntity.set(planeProperty.id, entity.id);
        }
        else if (property.type == "line")
        {
            let lineProperty = property as RECORDING.IPropertyLine;

            let lines = this.linePool.getLine(lineProperty.origin, lineProperty.destination, lineProperty.color);

            lines.isPickable = false;
            lines.id = lineProperty.id.toString();

            entityData.properties.set(lineProperty.id, lines);
        }
        else if (property.type == "mesh")
        {
            const meshProperty = property as RECORDING.IPropertyMesh;

            let customMesh = new BABYLON.Mesh("custom", this._scene);
            customMesh.isPickable = true;
            customMesh.id = meshProperty.id.toString();

            let vertexData = new BABYLON.VertexData();
            let normals: any[] = [];
            BABYLON.VertexData.ComputeNormals(meshProperty.vertices, meshProperty.indices, normals, {
                useRightHandedSystem: false
            });

            vertexData.positions = meshProperty.vertices;
            vertexData.indices = meshProperty.indices;
            vertexData.normals = normals;

            vertexData.applyToMesh(customMesh);

            customMesh.material = this.materialPool.getMaterialByColor(meshProperty.color);

            entityData.properties.set(meshProperty.id, customMesh);
            this.propertyToEntity.set(meshProperty.id, entity.id);

            if (meshProperty.wireframe == true)
            {
                let wireframeMesh = new BABYLON.Mesh("customwire", this._scene);
                vertexData.applyToMesh(wireframeMesh);
                wireframeMesh.material = this.materialPool.getMaterialByColor({r: 0, g: 0, b: 0, a: 1});
                wireframeMesh.material.wireframe = true;
                wireframeMesh.parent = customMesh;
            }

        }
    }

    createEntity(entity: RECORDING.IEntity) : IEntityData
    {
        let sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 0.1, this._scene);
        sphere.material = this.entityMaterial;
        sphere.isPickable = true;
        sphere.id = entity.id.toString();
        let entityData: IEntityData = { mesh: sphere, properties: new Map<number, BABYLON.Mesh>() };
        this.entities.set(entity.id, entityData);
        this.propertyToEntity.set(entity.id, entity.id);
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

    private applySelectionMaterial(entity: IEntityData)
    {
        this.axisGizmo.attachToMesh(entity.mesh);
    }

    private applyHoverMaterial(entity: IEntityData)
    {
    }

    private restoreEntityMaterial(entity: IEntityData)
    {
    }

    markEntityAsHovered(id: number)
    {
        this.onEntityHovered(id);
    }

    unmarkEntityAsHovered(id: number)
    {
        this.onEntityStopHovered();
    }

    markEntityAsSelected(id: number)
    {
        this.selectedEntityId = id;
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.selectedEntity)
            {
                this.restoreEntityMaterial(this.selectedEntity);
            }

            this.selectedEntity = storedMesh;
            this.applySelectionMaterial(this.selectedEntity);

            this.refreshOutlineTargets();
        }
    }

    getRadiusOfSelection()
    {
        if (this.selectedEntity)
        {
            let radius = 6;

            // Find a better way
            /*for (let propertyMesh of this.selectedEntity.properties.values())
            {
                if (propertyMesh.getBoundingInfo().boundingSphere.radius > radius)
                {
                    //radius = propertyMesh.getBoundingInfo().boundingSphere.radius;
                    //position = propertyMesh.getBoundingInfo().boundingSphere.centerWorld;
                }
            }*/

            return radius;
        }
    }

    getCameraPositionForTarget(targetPosition: BABYLON.Vector3, radius: number)
    {
        let meshToCamera = this._camera.position.subtract(targetPosition);
        meshToCamera.y = Math.max(0, meshToCamera.y);
        meshToCamera.normalize();
        let targetPos = targetPosition.add(meshToCamera.scale(radius));
        const distMeshToTarget = targetPos.subtract(targetPosition).length();
        targetPos.y = targetPosition.y + distMeshToTarget * 0.3;

        return targetPos;
    }

    moveCameraToSelection()
    {
        if (this.selectedEntity)
        {
            let position = this.selectedEntity.mesh.position;
            this.moveCameraToPosition(position, this.getRadiusOfSelection());
        }
    }

    private moveCameraToPosition(targetPosition: BABYLON.Vector3, radius: number)
    {
        var ease = new BABYLON.CubicEase();
        ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

        let targetTo = BABYLON.Animation.CreateAndStartAnimation('targetTo', this._camera, 'lockedTarget', 60, 20,
            this._camera.getTarget(),
            targetPosition, 0, ease, () => { this._camera.lockedTarget = null; });
        targetTo.disposeOnEnd = true;

        const targetPos = this.getCameraPositionForTarget(targetPosition, radius);

        let moveTo = BABYLON.Animation.CreateAndStartAnimation('moveTo', this._camera, 'position', 60, 20,
            this._camera.position,
            targetPos, 0, ease);
            moveTo.disposeOnEnd = true;
    }

    private onEntityHovered(id: number)
    {
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
            {
                this.restoreEntityMaterial(this.hoveredEntity);
            }

            this.hoveredEntity = storedMesh;
            this.applyHoverMaterial(this.hoveredEntity);
        }

        this.refreshOutlineTargets();
    }

    private onEntityStopHovered()
    {
        // Restore previous entity material
        if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
        {
            this.restoreEntityMaterial(this.hoveredEntity);
        }
        this.hoveredEntity = null;

        this.refreshOutlineTargets();
    }

    refreshOutlineTargets()
    {
        this.selectionOutline.clearSelection();
        if (this.selectedEntity)
        {
            this.selectionOutline.addMesh(this.selectedEntity.mesh);
            this.selectedEntity.properties.forEach((mesh: BABYLON.Mesh) => {
                this.selectionOutline.addMesh(mesh);
            });
        }

        this.hoverOutline.clearSelection();
        if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
        {
            this.hoverOutline.addMesh(this.hoveredEntity.mesh);
            this.hoveredEntity.properties.forEach((mesh: BABYLON.Mesh) => {
                this.hoverOutline.addMesh(mesh);
            });
        }
    }

    updateLayerStatus(layer: string, state: LayerState)
    {
        this.layerManager.setLayerState(layer, state);
    }

    initialize(canvas: HTMLCanvasElement) {
        const engine = new BABYLON.Engine(canvas, true, { stencil: true });
        this.createScene(canvas, engine);

        engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        this.entities = new Map<number, IEntityData>();
        this.propertyToEntity = new Map<number, number>();
    }

    createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
        this._canvas = canvas;

        this._engine = engine;

        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);
        this._scene = scene;

        this.materialPool = new MaterialPool(this._scene);
        this.capsulePool = new CapsulePool(this._scene);
        this.spherePool = new SpherePool(this._scene);
        this.boxPool = new BoxPool(this._scene);
        this.planePool = new PlanePool(this._scene);
        this.linePool = new LinePool(this._scene);
        this.layerManager = new LayerManager();

        // Gizmos
        // Create utility layer the gizmo will be rendered on
        let utilLayer = new BABYLON.UtilityLayerRenderer(scene);
        this.axisGizmo = new AxisGizmo(utilLayer);

        // This creates and positions a free camera (non-mesh)
        //const camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);
        this._camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(10, 10, -10), scene);
        this._camera.inertia = 0;
        this._camera.speed = 10;
        this._camera.angularSensibility = 500;

        // Manually add inputs here for WASD
        let keyboardInputs: any = this._camera.inputs.attached['keyboard'];
        keyboardInputs.keysDown = [83];
        keyboardInputs.keysUp = [87];
        keyboardInputs.keysLeft = [65];
        keyboardInputs.keysRight = [68];

        // Move forward with mouse wheel
        let zoomCallback = (evt: WheelEvent) => {
            const delta = Math.max(-1, Math.min(1,(evt.deltaY)));
            this._camera.position = BABYLON.Vector3.Lerp(this._camera.position, this._camera.getFrontPosition(-delta), 0.5);
        }

        let inputCallback = () => { this.stopFollowEntity(); };

        canvas.addEventListener("wheel", zoomCallback, false);

        canvas.addEventListener("keydown", inputCallback, false);
        canvas.addEventListener("keyup", inputCallback, false);
        canvas.addEventListener("keyleft", inputCallback, false);
        canvas.addEventListener("keyright", inputCallback, false);
        canvas.addEventListener("wheel", inputCallback, false);

        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type == BABYLON.PointerEventTypes.POINTERDOWN)
            {
                inputCallback();
            }
        });

        this._camera.onAfterCheckInputsObservable.add(this.updateCameraFollow.bind(this))

        // This targets the camera to scene origin
        this._camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        this._camera.attachControl(canvas, true);

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
            if (pickResult.hit && evt.button == 0) {
                const entityId: number = control.propertyToEntity.get(parseInt(pickResult.pickedMesh.id));
                control.onEntitySelected(entityId);
            }
        };

        scene.onPointerMove = function (evt, pickInfo) {
            if (pickInfo.hit) {
                const entityId: number = control.propertyToEntity.get(parseInt(pickInfo.pickedMesh.id));
                if (!control.selectedEntity || control.selectedEntityId != entityId) {
                    control.onEntityHovered(entityId);
                }
                if (control.selectedEntityId && control.hoveredEntity && control.selectedEntityId == entityId)
                {
                    control.onEntityStopHovered();
                }
                canvas.style.cursor = "pointer";
            }
            else {
                if (control.selectedEntity != control.hoveredEntity)
                {
                    control.onEntityStopHovered();
                }
            }
        };

        
        this.isFollowingEntity = false;

        // Outline post-process effect
        // Enable this for outline with depth
        /*this._camera.maxZ=500;
        this._camera.minZ=0;
        let mainDepthRenderer = scene.enableDepthRenderer(this._camera, false);*/

        BABYLON.Effect.ShadersStore["SelectionFragmentShader"] = getOutlineShader();

        const selectionColor = Utils.RgbToRgb01(Utils.hexToRgb("#6DE080"));
        const hoverColor = Utils.RgbToRgb01(Utils.hexToRgb("#8442B9"));

        this.selectionOutline = new OutlineEffect(scene, this._camera, selectionColor);
        this.hoverOutline = new OutlineEffect(scene, this._camera, hoverColor);

        let antiAliasPostProcess = new BABYLON.FxaaPostProcess("fxaa", 1.0,  scene.activeCamera);
        antiAliasPostProcess.samples = 2;
    }

    private updateCameraFollow()
    {
        if (this.selectedEntity && this._camera && this.selectedEntity.mesh && this.isFollowingEntity)
        {
            const targetPosition = this.selectedEntity.mesh.position;
            const radius = this.getRadiusOfSelection();
            const cameraPos = this.getCameraPositionForTarget(targetPosition, radius);

            const meshToCamera = this._camera.position.subtract(targetPosition);

            // TODO: This is super hacky, improve!
            const lerpValTarget = 0.2;
            const lerpValPos = 0.04;

            let lerpedTarget = this._camera.lockedTarget == null ? targetPosition : BABYLON.Vector3.Lerp(this._camera.lockedTarget, targetPosition, lerpValTarget);
            this._camera.position = BABYLON.Vector3.Lerp(this._camera.position, cameraPos, lerpValPos);
            this._camera.lockedTarget = lerpedTarget;
            
            const dot = BABYLON.Vector3.Dot(this._camera.getForwardRay(3).direction, meshToCamera);

            if ((this._camera.position.subtract(cameraPos).length() < 0.1) && Math.abs(dot) > 0.99 ) // Also, when trying to move the camera
            {
                this.stopFollowEntity();
            }
        }
    }

    public followEntity()
    {
        this.isFollowingEntity = true;
    }

    public stopFollowEntity()
    {
        if (this.isFollowingEntity)
        {
            this.isFollowingEntity = false;
            this._camera.lockedTarget = null;
        }
    }
} 