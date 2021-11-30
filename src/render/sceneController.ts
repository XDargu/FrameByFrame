import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { GridMaterial } from 'babylonjs-materials';
import { LayerState } from '../frontend/LayersController';
import * as Utils from '../utils/utils';
import * as RenderUtils from '../render/renderUtils';
import * as ShapeBuilders from '../render/shapeBuilders';
import { getOutlineShader, OutlineEffect } from './outlineShader';
import { AxisGizmo } from './gizmos';
import RenderPools from './renderPools';
import LayerManager from './layerManager';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

interface IEntityData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, BABYLON.Mesh>;
}

interface IPropertyBuilderFunction
{
    (shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
}

interface IPropertyBuilderConfigEntry
{
    builder: IPropertyBuilderFunction;
    pickable: boolean;
}

interface IPropertyBuilderConfig
{
    [type: string] : IPropertyBuilderConfigEntry;
}

const shapeBuildConfig : IPropertyBuilderConfig = {
    "sphere": { builder: ShapeBuilders.buildSphereShape, pickable: true},
    "capsule": { builder: ShapeBuilders.buildCapsuleShape, pickable: true},
    "aabb": { builder: ShapeBuilders.buildAABBShape, pickable: true},
    "oobb": { builder: ShapeBuilders.buildOOBBShape, pickable: true},
    "plane": { builder: ShapeBuilders.buildPlaneShape, pickable: true},
    "line": { builder: ShapeBuilders.buildLinesShape, pickable: false},
    "mesh": { builder: ShapeBuilders.buildMeshShape, pickable: true},
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

    public onEntitySelected: IEntitySelectedCallback;

    private layerManager: LayerManager;

    private pools: RenderPools;

    // Gizmos
    private axisGizmo: AxisGizmo;

    private isFollowingEntity: boolean;

    // Outline
    private selectionOutline: OutlineEffect;
    private hoverOutline: OutlineEffect;

    removeAllProperties()
    {
        for (const [id, data] of this.entities)
        {
            for (let [propId, propertyMesh] of data.properties)
            {
                if (this.pools.tryFreeMesh(propertyMesh))
                {
                    this._scene.removeMesh(propertyMesh, true);
                }
            }
            data.properties.clear();
        }
    }

    addProperty(entity: RECORDING.IEntity, property: RECORDING.IProperty)
    {
        if (!RenderUtils.isPropertyShape(property)) { return; }

        const shape = property as RECORDING.IProperyShape;
        const layerState = this.layerManager.getLayerState(shape.layer);
        
        if (layerState == LayerState.Off) { return; }
        if (layerState == LayerState.Selected && this.selectedEntityId != entity.id) { return; }
        
        let entityData = this.entities.get(entity.id);
        if (!entityData) { return; }

        const shapeConfig = shapeBuildConfig[property.type];

        if (shapeConfig)
        {
            let mesh = shapeConfig.builder(shape, this.pools);
            mesh.isPickable = shapeConfig.pickable;
            if (shapeConfig.pickable)
            {
                this.propertyToEntity.set(shape.id, entity.id);
            }
            entityData.properties.set(shape.id, mesh);
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
        return 6; // TODO: Maybe take into account the bounding box of the selected entity
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

        const targetPos = RenderUtils.getCameraPositionForTarget(this._camera, targetPosition, radius);

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
        const engine = new BABYLON.Engine(canvas, false, { stencil: true });
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

        this.pools = new RenderPools(scene);
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
        var grid = BABYLON.Mesh.CreatePlane("plane", 10000.0, scene);
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
            const cameraPos = RenderUtils.getCameraPositionForTarget(this._camera, targetPosition, radius);

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