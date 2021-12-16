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
import { IEntityRenderData, SceneEntityData } from './commonTypes';
import CameraControl from './cameraControl';
import SceneOutline from './sceneOutline';
import SceneGrid from './sceneGrid';
import SceneEntitySelection, { IEntitySelectedCallback } from './sceneEntitySelection';

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

    private cameraControl: CameraControl;
    private sceneEntityData: SceneEntityData;

    private entityMaterial: BABYLON.StandardMaterial;
    private entitySelection: SceneEntitySelection;

    public onDebugDataUpdated: IOnDebugDataUpdated;

    private layerManager: LayerManager;

    private pools: RenderPools;

    // Gizmos
    private axisGizmo: AxisGizmo;
    private grid: SceneGrid;

    private outline: SceneOutline;

    // Config
    private coordSystem: RECORDING.ECoordinateSystem;

    initialize(canvas: HTMLCanvasElement, onEntitySelected: IEntitySelectedCallback) {
        const engine = new BABYLON.Engine(canvas, false, { stencil: true });
        this.createScene(canvas, engine);

        engine.runRenderLoop(() => {
            this._scene.render();
            this.updateDebugData();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        this.sceneEntityData = new SceneEntityData();

        this.entitySelection = new SceneEntitySelection(onEntitySelected, this.sceneEntityData, this.outline);
        this.entitySelection.initialize(this._scene, this._canvas);

        this.setCoordinateSystem(RECORDING.ECoordinateSystem.LeftHand);
    }

    private createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
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

        // TODO: Maybe move to settings?
        const selectionColor = Utils.RgbToRgb01(Utils.hexToRgb("#6DE080"));
        const hoverColor = Utils.RgbToRgb01(Utils.hexToRgb("#8442B9"));

        this.outline = new SceneOutline(scene, this.cameraControl.getCamera(), selectionColor, hoverColor);
    }

    removeAllProperties()
    {
        for (const [id, data] of this.sceneEntityData.entities)
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
        if (layerState == LayerState.Selected && this.entitySelection.getSelectedEntityId() != entity.id) { return; }
        
        const entityData = this.sceneEntityData.getEntityById(entity.id);
        if (!entityData) { return; }

        const shapeConfig = shapeBuildConfig[property.type];

        if (shapeConfig)
        {
            let mesh = shapeConfig.builder(shape, this.pools, this.coordSystem);
            mesh.isPickable = shapeConfig.pickable;
            if (shapeConfig.pickable)
            {
                this.sceneEntityData.setEntityProperty(shape.id, entity.id);
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
        this.sceneEntityData.setEntityData(entity.id, entityData);
        this.sceneEntityData.setEntityProperty(entity.id, entity.id);

        return entityData;
    }

    setEntity(entity: RECORDING.IEntity)
    {
        let entityData = this.sceneEntityData.getEntityById(entity.id);
        if (!entityData)
        {
            entityData = this.createEntity(entity);
        }
        
        const position = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityPosition(entity), this.coordSystem);
        entityData.mesh.position.set(position.x, position.y, position.z);
        entityData.mesh.setEnabled(true);
    }

    hideAllEntities()
    {
        for (let data of this.sceneEntityData.entities.values())
        {
            data.mesh.setEnabled(false);
        }
    }

    markEntityAsHovered(id: number)
    {
        this.entitySelection.markEntityAsHovered(id);
    }

    unmarkEntityAsHovered(id: number)
    {
        this.entitySelection.unmarkEntityAsHovered(id);
    }

    markEntityAsSelected(id: number)
    {
        if (this.entitySelection.markEntityAsSelected(id))
        {
            const selectedEntity = this.entitySelection.getSelectedEntity();
            this.axisGizmo.attachToMesh(selectedEntity.mesh);
            this.cameraControl.setSelectedEntity(selectedEntity);
        }
    }

    moveCameraToSelection()
    {
        const selectedEntity = this.entitySelection.getSelectedEntity();
        if (selectedEntity)
        {
            const position = selectedEntity.mesh.absolutePosition;
            this.cameraControl.moveCameraToPosition(position, RenderUtils.getRadiusOfEntity(selectedEntity));
        }
    }

    updateLayerStatus(layer: string, state: LayerState)
    {
        this.layerManager.setLayerState(layer, state);
    }

    refreshOutlineTargets()
    {
        this.entitySelection.refreshOutlineTargets();
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

        for (let [id, entityData] of this.sceneEntityData.entities)
        {
            this._scene.removeMesh(entityData.mesh);
        }

        this.sceneEntityData.clear();
    }

    private updateDebugData()
    {
        if (this.onDebugDataUpdated)
        {
            this.onDebugDataUpdated(DebugUtils.createDebugData(this._scene, this._engine, this.pools));
        }
    }
}