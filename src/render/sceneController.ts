import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { LayerState } from '../frontend/LayersController';
import * as Utils from '../utils/utils';
import * as RenderUtils from '../render/renderUtils';
import * as DebugUtils from '../render/debugUtils';
import * as ShapeBuilders from '../render/shapeBuilders';
import { AxisGizmo } from './gizmos';
import RenderPools from './renderPools';
import LayerManager from './layerManager';
import { IEntityRenderData } from './commonTypes';
import CameraControl from './cameraControl';
import SceneOutline from './sceneOutline';
import SceneGrid from './sceneGrid';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

export interface IOnDebugDataUpdated
{
    (debugData: string) : void
}

interface IPropertyBuilderFunction
{
    (shape: RECORDING.IProperyShape, pools: RenderPools, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
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

    /* Basic ideas regarding scenes:
     - Entities are registered and added to a map by id
     - Shapes rendered by entities (as part of their properties) will be added to those entities, and will be stored in a map by property ID
     - Shapes, materials, etc. Should be stored in pools to reduce overhead if possible.
     - Instead of creating and destroying entities constantly, we can just move them around, and maybe hide the ones that doesn´t exist in the current frame
    */

    private cameraControl: CameraControl;

    private entities: Map<number, IEntityRenderData>;
    private propertyToEntity: Map<number, number>;

    private selectedEntityId: number;
    private selectedEntity: IEntityRenderData;
    private hoveredEntity: IEntityRenderData;

    private entityMaterial: BABYLON.StandardMaterial;

    public onEntitySelected: IEntitySelectedCallback;
    public onDebugDataUpdated: IOnDebugDataUpdated;

    private layerManager: LayerManager;

    private pools: RenderPools;

    // Gizmos
    private axisGizmo: AxisGizmo;
    private grid: SceneGrid;

    private outline: SceneOutline;

    // Config
    private coordSystem: RECORDING.ECoordinateSystem;

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
            let mesh = shapeConfig.builder(shape, this.pools, this.coordSystem);
            mesh.isPickable = shapeConfig.pickable;
            if (shapeConfig.pickable)
            {
                this.propertyToEntity.set(shape.id, entity.id);
            }
            entityData.properties.set(shape.id, mesh);
        }

    }

    createEntity(entity: RECORDING.IEntity) : IEntityRenderData
    {
        let sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 0.1, this._scene);
        sphere.material = this.entityMaterial;
        sphere.isPickable = true;
        sphere.id = entity.id.toString();
        let entityData: IEntityRenderData = { mesh: sphere, properties: new Map<number, BABYLON.Mesh>() };
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
        
        const postion = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityPosition(entity), this.coordSystem);
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

    private applySelectionMaterial(entity: IEntityRenderData)
    {
        this.axisGizmo.attachToMesh(entity.mesh);
    }

    private applyHoverMaterial(entity: IEntityRenderData)
    {
    }

    private restoreEntityMaterial(entity: IEntityRenderData)
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
            this.cameraControl.setSelectedEntity(storedMesh);
            this.applySelectionMaterial(this.selectedEntity);

            this.refreshOutlineTargets();
        }
    }

    moveCameraToSelection()
    {
        if (this.selectedEntity)
        {
            let position = this.selectedEntity.mesh.absolutePosition;
            this.cameraControl.moveCameraToPosition(position, RenderUtils.getRadiusOfEntity(this.selectedEntity));
        }
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
        this.outline.refreshOutlineTargets(this.selectedEntity, this.hoveredEntity);
    }

    updateLayerStatus(layer: string, state: LayerState)
    {
        this.layerManager.setLayerState(layer, state);
    }

    updateDebugData()
    {
        if (this.onDebugDataUpdated)
        {
            this.onDebugDataUpdated(DebugUtils.createDebugData(this._scene, this._engine, this.pools));
        }
    }

    initialize(canvas: HTMLCanvasElement) {
        const engine = new BABYLON.Engine(canvas, false, { stencil: true });
        this.createScene(canvas, engine);

        engine.runRenderLoop(() => {
            this._scene.render();
            this.updateDebugData();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        this.entities = new Map<number, IEntityRenderData>();
        this.propertyToEntity = new Map<number, number>();
        this.setCoordinateSystem(RECORDING.ECoordinateSystem.LeftHand);
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

        // Create camera control
        this.cameraControl = new CameraControl();
        this.cameraControl.initialize(scene, canvas);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        this.grid = new SceneGrid(scene);

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

        //When pointer down event is raised
        scene.onPointerDown = (evt, pickResult) => {
            // if the click hits the ground object, we change the impact position
            if (pickResult.hit && evt.button == 0) {
                const entityId: number = this.propertyToEntity.get(parseInt(pickResult.pickedMesh.id));
                this.onEntitySelected(entityId);
            }
        };

        scene.onPointerMove = (evt, pickInfo) => {
            if (pickInfo.hit) {
                const entityId: number = this.propertyToEntity.get(parseInt(pickInfo.pickedMesh.id));
                if (!this.selectedEntity || this.selectedEntityId != entityId) {
                    this.onEntityHovered(entityId);
                }
                if (this.selectedEntityId && this.hoveredEntity && this.selectedEntityId == entityId)
                {
                    this.onEntityStopHovered();
                }
                canvas.style.cursor = "pointer";
            }
            else {
                if (this.selectedEntity != this.hoveredEntity)
                {
                    this.onEntityStopHovered();
                }
            }
        };

        // TODO: Maybe move to settings?
        const selectionColor = Utils.RgbToRgb01(Utils.hexToRgb("#6DE080"));
        const hoverColor = Utils.RgbToRgb01(Utils.hexToRgb("#8442B9"));

        this.outline = new SceneOutline(scene, this.cameraControl.getCamera(), selectionColor, hoverColor);
    }

    followEntity()
    {
        this.cameraControl.followEntity();
    }

    stopFollowEntity()
    {
        this.cameraControl.stopFollowEntity();
    }

    setAntiAliasingSamples(samples: number)
    {
        this.outline.setAntiAliasingSamples(samples);
    }

    setBackgroundColor(hexColor: string)
    {
        this._scene.clearColor = RenderUtils.createColor4(Utils.RgbToRgb01(Utils.hexToRgb(hexColor)));
    }

    setGridHeight(height: number)
    {
        this.grid.setGridHeight(height);
    }

    setGridSpacing(spacing: number)
    {
        this.grid.setGridSpacing(spacing);
    }

    setCoordinateSystem(system: RECORDING.ECoordinateSystem)
    {
        this.coordSystem = system;
    }

    clear()
    {
        this.removeAllProperties();
        this.pools.clear();

        for (let [id, entityData] of this.entities)
        {
            this._scene.removeMesh(entityData.mesh);
        }
        this.entities.clear();
        this.propertyToEntity.clear();
        console.log(this._scene.materials);
    }
}