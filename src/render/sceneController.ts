import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { CoreLayers, LayerState } from '../frontend/LayersController';
import * as Utils from '../utils/utils';
import * as RenderUtils from '../render/renderUtils';
import * as DebugUtils from '../render/debugUtils';
import * as ShapeBuilders from '../render/shapeBuilders';
import { AxisGizmo } from './gizmos';
import RenderPools from './renderPools';
import LayerManager from './layerManager';
import { IEntityRenderData, IPropertyRenderData, SceneEntityData } from './commonTypes';
import CameraControl from './cameraControl';
import SceneOutline from './sceneOutline';
import SceneGrid from './sceneGrid';
import SceneEntitySelection, { IEntitySelectedCallback } from './sceneEntitySelection';
import ScenePropertySelection from './scenePropertySelection';
import { CorePropertyTypes } from '../types/typeRegistry';
import TextLabels from './textLabel';
import { IGetResourceFunction } from './materialPool';
import { ResizeObserver } from 'resize-observer';

export interface IOnDebugDataUpdated
{
    (debugData: string) : void
}

interface IPropertyBuilderFunction
{
    (shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
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

interface ICameraChangedCallback
{
    (position: RECORDING.IVec3, up: RECORDING.IVec3, forward: RECORDING.IVec3) : void
}

interface ICameraSpeedChangedCallback
{
    (speed: number) : void
}

const shapeBuildConfig : IPropertyBuilderConfig  = {
    [CorePropertyTypes.Sphere]: { builder: ShapeBuilders.buildSphereShape, pickable: true},
    [CorePropertyTypes.Capsule]: { builder: ShapeBuilders.buildCapsuleShape, pickable: true},
    [CorePropertyTypes.Cylinder]: { builder: ShapeBuilders.buildCylinderShape, pickable: true},
    [CorePropertyTypes.AABB]: { builder: ShapeBuilders.buildAABBShape, pickable: true},
    [CorePropertyTypes.OOBB]: { builder: ShapeBuilders.buildOOBBShape, pickable: true},
    [CorePropertyTypes.Plane]: { builder: ShapeBuilders.buildPlaneShape, pickable: true},
    [CorePropertyTypes.Line]: { builder: ShapeBuilders.buildLinesShape, pickable: false},
    [CorePropertyTypes.Arrow]: { builder: ShapeBuilders.buildArrowShape, pickable: false},
    [CorePropertyTypes.Vector]: { builder: ShapeBuilders.buildVectorwShape, pickable: false},
    [CorePropertyTypes.Mesh]: { builder: ShapeBuilders.buildMeshShape, pickable: true},
    [CorePropertyTypes.Path]: { builder: ShapeBuilders.buildPathShape, pickable: true},
    [CorePropertyTypes.Triangle]: { builder: ShapeBuilders.buildTriangleShape, pickable: true},
}

export default class SceneController
{
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;

    private cameraControl: CameraControl;
    private sceneEntityData: SceneEntityData;

    private entitySelection: SceneEntitySelection;
    private propertySelection: ScenePropertySelection;

    public onDebugDataUpdated: IOnDebugDataUpdated;

    private layerManager: LayerManager;

    private pools: RenderPools;

    private labels: TextLabels;

    private light: BABYLON.HemisphericLight;

    // Gizmos
    private axisGizmo: AxisGizmo;
    private grid: SceneGrid;

    private outline: SceneOutline;

    // Config
    private coordSystem: RECORDING.ECoordinateSystem;

    // WebGL
    private loseContext: WEBGL_lose_context;

    initialize(
        canvas: HTMLCanvasElement,
        onEntitySelected: IEntitySelectedCallback,
        onCameraChangedCallback: ICameraChangedCallback,
        onCameraSpeedChanged: ICameraSpeedChangedCallback,
        getResourceFunc: IGetResourceFunction,
        selectionColor: string,
        hoverColor: string,
        shapeHoverColor: string,
        highlightOnHover: boolean,
        outlineWidth: number
    )
    {

        const selectionColor01 = Utils.RgbToRgb01(Utils.hexToRgb(selectionColor));
        const hoverColor01 = Utils.RgbToRgb01(Utils.hexToRgb(hoverColor));
        const shapeHoverColor01 = Utils.RgbToRgb01(Utils.hexToRgb(shapeHoverColor));

        const engine = new BABYLON.Engine(canvas, false, { stencil: true });
        this.createScene(canvas, engine, onCameraChangedCallback, onCameraSpeedChanged, getResourceFunc);
        this.loseContext = engine._gl.getExtension('WEBGL_lose_context');

        this.outline = new SceneOutline(this._scene, this.cameraControl.getCamera(), selectionColor01, hoverColor01, outlineWidth);

        this.labels = new TextLabels(this._scene);

        engine.runRenderLoop(() => {
            this._scene.render();
            this.updateDebugData();
        });

        window.addEventListener('resize', () => {
            engine.resize();
        });

        const resizeObs = new ResizeObserver(entries => {
            this.cameraControl.onCanvasResize();
        }).observe(canvas.parentElement);

        this.sceneEntityData = new SceneEntityData();

        this.propertySelection = new ScenePropertySelection(this.sceneEntityData, this.pools, highlightOnHover, shapeHoverColor01);

        this.entitySelection = new SceneEntitySelection(onEntitySelected, this.sceneEntityData, this.outline, selectionColor01, hoverColor01);
        this.entitySelection.initialize(this._scene, this._canvas, this.propertySelection);

        this.setCoordinateSystem(RECORDING.ECoordinateSystem.LeftHand);
    }

    private createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine, onCameraChangedCallback: ICameraChangedCallback, onCameraSpeedChanged: ICameraSpeedChangedCallback, getResourceFunc: IGetResourceFunction) {
        this._canvas = canvas;

        this._engine = engine;

        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);
        this._scene = scene;

        this.pools = new RenderPools(scene, getResourceFunc); // Here
        this.layerManager = new LayerManager();

        // Gizmos
        // Create utility layer the gizmo will be rendered on
        let utilLayer = new BABYLON.UtilityLayerRenderer(scene);
        this.axisGizmo = new AxisGizmo(utilLayer);

        // Create camera control
        this.cameraControl = new CameraControl();
        this.cameraControl.initialize(scene, canvas, (position: BABYLON.Vector3, up: BABYLON.Vector3, forward: BABYLON.Vector3) => {
            onCameraChangedCallback(
                RenderUtils.BabylonToVec3(position, this.coordSystem),
                RenderUtils.BabylonToVec3(up, this.coordSystem),
                RenderUtils.BabylonToVec3(forward, this.coordSystem)
            );
        }, onCameraSpeedChanged);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        this.light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 5, 0), scene);
        this.light.specular = new BABYLON.Color3(0.5, 0.5, 0.5);
        
	    this.light.groundColor = new BABYLON.Color3(0.27, 0.18, 0.05);

        // Default intensity is 1. Let's dim the light a small amount
        this.light.intensity = 0.8;

        this.grid = new SceneGrid(scene);
    }

    removeAllProperties()
    {
        for (const [id, data] of this.sceneEntityData.entities)
        {
            for (let [propId, propertyData] of data.properties)
            {
                if (!this.pools.tryFreeMesh(propertyData.mesh))
                {
                    this._scene.removeMesh(propertyData.mesh, true);
                }
            }
            data.properties.clear();
        }
    }

    hideAllLabels()
    {
        for (const [id, data] of this.sceneEntityData.entities)
        {
            data.label.setEnabled(false);
        }
    }

    hideAllPaths()
    {
        for (const [id, data] of this.sceneEntityData.entities)
        {
            if (data.path)
                data.path.setEnabled(false);
        }
    }

    addProperty(entity: RECORDING.IEntity, property: RECORDING.IProperty)
    {
        if (!RECORDING.isPropertyShape(property)) { return; }

        const shape = property as RECORDING.IProperyShape;

        if (!this.isLayerActiveForEntity(shape.layer, entity.id))
        {
            return;
        }
        
        const entityData = this.sceneEntityData.getEntityById(entity.id);
        if (!entityData) { return; }

        const shapeConfig = shapeBuildConfig[property.type];

        if (shapeConfig)
        {
            try
            {
                let mesh = shapeConfig.builder(shape, this.pools, entityData.mesh.position, this.coordSystem);
                mesh.isPickable = shapeConfig.pickable;
                if (shapeConfig.pickable)
                {
                    this.sceneEntityData.setEntityProperty(shape.id, entity.id);
                }
                entityData.properties.set(shape.id, { mesh: mesh, property: property });
            }
            catch(error)
            {
                throw new Error(`can't build mesh of property "${property.name}", entity ${entity.id} : ${error.message}`);
            }
        }

    }

    createEntity(entity: RECORDING.IEntity) : IEntityRenderData
    {
        let sphere = BABYLON.Mesh.CreateSphere("entitySphere", 10.0, 0.1, this._scene);
        sphere.material = this.pools.materialPool.getMaterial(1, 1, 1, 0.8);;
        sphere.isPickable = true;
        sphere.id = entity.id.toString();
        const labelMesh = this.labels.buildLabel(RECORDING.NaiveRecordedData.getEntityName(entity));
        let entityData: IEntityRenderData = { mesh: sphere, label: labelMesh, properties: new Map<number, IPropertyRenderData>(), pathPoints: [] };
        this.sceneEntityData.setEntityData(entity.id, entityData);
        this.sceneEntityData.setEntityProperty(entity.id, entity.id);

        return entityData;
    }

    setEntity(entity: RECORDING.IEntity, path : RECORDING.IVec3[])
    {
        let entityData = this.sceneEntityData.getEntityById(entity.id);
        if (!entityData)
        {
            entityData = this.createEntity(entity);
        }
        
        const position = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityPosition(entity), this.coordSystem);
        const up = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityUp(entity), this.coordSystem);
        const forward = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityForward(entity), this.coordSystem);

        entityData.mesh.position.set(position.x, position.y, position.z);
        entityData.mesh.setEnabled(true);

        RenderUtils.setShapeOrientationFromUpAndFwd(entityData.mesh, up, forward, this.coordSystem);

        this.setEntityPath(entityData, path);
        this.updateEntityPathInternal(entityData, entity.id);
        this.updateEntityLabelInternal(entityData, position, entity.id);
    }

    updateEntityLabel(entity: RECORDING.IEntity)
    {
        let entityData = this.sceneEntityData.getEntityById(entity.id);
        if (entityData)
        {
            const position = RenderUtils.createVec3(RECORDING.NaiveRecordedData.getEntityPosition(entity), this.coordSystem);

            this.updateEntityLabelInternal(entityData, position, entity.id);
        }
    }

    updateEntityPath(entity: RECORDING.IEntity)
    {
        let entityData = this.sceneEntityData.getEntityById(entity.id);
        if (entityData)
        {
            this.updateEntityPathInternal(entityData, entity.id);
        }
    }

    private setEntityPath(entityData: IEntityRenderData, path : RECORDING.IVec3[])
    {
        if (entityData.path && entityData.pathPoints.length != path.length)
        {
            // The path length has changed, we can't reuse the existing, dispose it
            this._scene.removeMesh(entityData.path);
            entityData.path = null;
        }

        entityData.pathPoints = [];

        for (let i=0; i<path.length; ++i)
        {
            entityData.pathPoints[i] = RenderUtils.createVec3(path[i], this.coordSystem);
        }
    }

    private updateEntityPathInternal(entityData: IEntityRenderData, entityId: number)
    {
        const isEnabled = this.isLayerActiveForEntity(CoreLayers.EntityPaths, entityId);
        if (isEnabled)
        {
            if (!entityData.path)
            {
                entityData.path = BABYLON.MeshBuilder.CreateLines("path",{ points: entityData.pathPoints, updatable: true }, this._scene);
            }
            else
            {
                entityData.path = BABYLON.MeshBuilder.CreateLines("path",{ points: entityData.pathPoints, updatable: true, instance: entityData.path }, this._scene);
                entityData.path.refreshBoundingInfo();
            }

            entityData.path.isPickable = false;
        }

        if (entityData.path)
            entityData.path.setEnabled(isEnabled);
    }

    private updateEntityLabelInternal(entityData: IEntityRenderData, position: BABYLON.Vector3, entityId: number)
    {
        const isEnabled = this.isLayerActiveForEntity(CoreLayers.EntityNames, entityId);
        if (isEnabled)
        {
            const boundingBox = RenderUtils.getBoundingBoxOfEntity(entityData);
            entityData.label.position.set(position.x, boundingBox.boundingBox.maximumWorld.y + 0.2, position.z);
        }
        entityData.label.setEnabled(isEnabled);
    }

    private isLayerActiveForEntity(layer: string, entityId: number)
    {
        const layerState = this.layerManager.getLayerState(layer);
        
        if (layerState == LayerState.Off) { return false; }
        if (layerState == LayerState.Selected && this.entitySelection.getSelectedEntityId() != entityId) { return false; }

        return true;
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

    moveCameraToShape(propertyId: number)
    {
        const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);
        if (entityId != null)
        {
            const entityData = this.sceneEntityData.getEntityById(entityId);
            let property = entityData.properties.get(propertyId);
            if (property != null)
            {
                this.cameraControl.moveCameraToPosition(property.mesh.position, RenderUtils.getRadiusOfShape(property.mesh));
            }
        }
    }

    isPropertyVisible(propertyId: number)
    {
        const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);
        if (entityId != null)
        {
            const entityData = this.sceneEntityData.getEntityById(entityId);
            let property = entityData.properties.get(propertyId);
            return property != null;
        }

        return false;
    }

    showProperty(propertyId: number)
    {
        this.propertySelection.showProperty(propertyId);
    }

    // TODO: Find a better name
    hideProperty(propertyId: number)
    {
        this.propertySelection.hideProperty(propertyId);
    }

    updateLayerStatus(layer: string, state: LayerState)
    {
        this.layerManager.setLayerState(layer, state);
    }

    getLaterStatus(layer: string) : LayerState
    {
        return this.layerManager.getLayerState(layer);
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

    setLightIntensity(intensity: number)
    {
        this.light.intensity = intensity;
    }

    setAntiAliasingSamples(samples: number)
    {
        this.outline.setAntiAliasingSamples(samples);
    }

    setBackfaceCulling(active: boolean)
    {
        this.pools.materialPool.setBackfaceCulling(active);
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

    getCoordinateSystem()
    {
        return this.coordSystem;
    }

    setOutlineColors(selectionColor: string, hoverColor: string)
    {
        const selectionColor01 = Utils.RgbToRgb01(Utils.hexToRgb(selectionColor));
        const hoverColor01 = Utils.RgbToRgb01(Utils.hexToRgb(hoverColor));

        this.entitySelection.setColors(selectionColor01, hoverColor01);
        this.outline.setColors(selectionColor01, hoverColor01);
    }

    setShapeHoverSettings(highlightShapesOnHover: boolean, shapeHoverColor: string)
    {
        const shapeHoverColor01 = Utils.RgbToRgb01(Utils.hexToRgb(shapeHoverColor));

        this.propertySelection.setShapeHoverSettings(highlightShapesOnHover, shapeHoverColor01);
    }

    setOutlineWidth(outlineWidth: number)
    {
        this.outline.setWidth(outlineWidth);
    }

    setCameraSpeed(cameraSpeed: number)
    {
        this.cameraControl.setBaseSpeed(cameraSpeed);
    }

    toggle2DMode()
    {
        this.cameraControl.toggle2DMode();

        if (this.cameraControl.is2DModeActive())
        {
            this.light.specular = new BABYLON.Color3(0, 0, 0);
        }
        else
        {
            this.light.specular = new BABYLON.Color3(0.5, 0.5, 0.5);
        }
    }

    purgePools()
    {
        this.pools.clear();
    }

    clear()
    {
        this.removeAllProperties();
        this.pools.clear();

        for (let [id, entityData] of this.sceneEntityData.entities)
        {
            this._scene.removeMesh(entityData.mesh);
            this._scene.removeMaterial(entityData.label.material);
            this._scene.removeMesh(entityData.label);
            if (entityData.path)
                this._scene.removeMesh(entityData.path);
        }

        this.sceneEntityData.clear();
    }

    restoreContext()
    {
        this.loseContext.loseContext();
        window.setTimeout(() => { this.loseContext.restoreContext(); }, 1000); 
    }

    collectVisibleShapesOfEntity(entity: RECORDING.IEntity) : RECORDING.IProperyShape[]
    {
        let visibleShapes : RECORDING.IProperyShape[] = [];

        // TODO: There are several ways we can optimize this
        // We could collect the visible shapes during in addProperty
        // We could implement a fast way of accessing properties by id in the recording data
        // There are other options. The point is: this can be improved
        const collectProperty = (property: RECORDING.IProperty) =>
        {
            if (!RECORDING.isPropertyShape(property)) { return; }

            const shape = property as RECORDING.IProperyShape;

            if (this.isLayerActiveForEntity(shape.layer, entity.id))
            {
                visibleShapes.push(shape);
            }
        };

        RECORDING.NaiveRecordedData.visitEntityProperties(entity, collectProperty);

        RECORDING.NaiveRecordedData.visitEvents(entity.events, (event: RECORDING.IEvent) => {
            RECORDING.NaiveRecordedData.visitProperties([event.properties], collectProperty);
        });
        this.isLayerActiveForEntity

        return visibleShapes;
    }

    getCanvasPositionOfProperty(propertyId: number, subIndex: number) : RECORDING.IVec3
    {
        const entity = this.entitySelection.getSelectedEntity();
        if (entity)
        {
            //const propertyId = this.propertySelection.getHoveredPropertyId();
            const property = entity.properties.get(propertyId);
            if (property)
            {
                const propertyPos = this.getPositionOfPropertyMesh(property.property, subIndex, property.mesh, entity.mesh);

                const target_screen_pos = BABYLON.Vector3.Project(
                    propertyPos,
                    BABYLON.Matrix.IdentityReadOnly,
                    this._scene.getTransformMatrix(),
                    this.cameraControl.getCamera().viewport.toGlobal(
                        this._engine.getRenderWidth(),
                        this._engine.getRenderHeight()
                    )
                );

                return { x: target_screen_pos.x, y: target_screen_pos.y, z: target_screen_pos.z };
            }
        }
    }

    private getPositionOfPropertyMesh(property: RECORDING.IProperty, subIndex: number, propertyMesh: BABYLON.Mesh, entityMesh: BABYLON.Mesh)
    {
        if (property.type == CorePropertyTypes.Path)
        {
            const pathProperty = property as RECORDING.IPropertyPath;
            if (subIndex >= 0 && pathProperty.points.length > subIndex)
            {
                return RenderUtils.createVec3(pathProperty.points[subIndex], this.coordSystem);
            }

            // Select path as a whole
            if (pathProperty.points.length > 0)
            {
                return RenderUtils.createVec3(pathProperty.points[0], this.coordSystem);
            }
        }
        if (property.type == CorePropertyTypes.Line)
        {
            const lineProperty = property as RECORDING.IPropertyLine;

            const origin = RenderUtils.createVec3(lineProperty.origin, this.coordSystem);
            const dest = RenderUtils.createVec3(lineProperty.destination, this.coordSystem);
            const midPoint = dest.subtract(origin).scale(0.5);

            if (subIndex == 0) { return origin; }
            if (subIndex == 1) { return dest; }

            return origin.add(midPoint)
        }
        if (property.type == CorePropertyTypes.Arrow)
        {
            const arrowProperty = property as RECORDING.IPropertyArrow;

            const origin = RenderUtils.createVec3(arrowProperty.origin, this.coordSystem);
            const dest = RenderUtils.createVec3(arrowProperty.destination, this.coordSystem);
            const midPoint = dest.subtract(origin).scale(0.5);

            if (subIndex == 0) { return origin; }
            if (subIndex == 1) { return dest; }

            return origin.add(midPoint)
        }
        if (property.type == CorePropertyTypes.Vector)
        {
            const vectorProperty = property as RECORDING.IPropertyVector;

            const vector = RenderUtils.createVec3(vectorProperty.vector, this.coordSystem);
            const origin = entityMesh.getAbsolutePosition();
            const midPoint = vector.scale(0.5);

            return origin.add(midPoint)
        }

        return propertyMesh.getAbsolutePosition();
    }

    private updateDebugData()
    {
        if (this.onDebugDataUpdated)
        {
            this.onDebugDataUpdated(DebugUtils.createDebugData(this._scene, this._engine, this.pools));
        }
    }
}