import * as BABYLON from 'babylonjs';
import * as Utils from '../utils/utils';
import { IEntityRenderData, SceneEntityData } from './commonTypes';
import SceneOutline from './sceneOutline';
import ScenePropertySelection from './scenePropertySelection';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

export default class SceneEntitySelection
{
    private selectedEntityId: number;
    private selectedEntity: IEntityRenderData;
    private hoveredEntity: IEntityRenderData;
    private outline: SceneOutline;
    public onEntitySelected: IEntitySelectedCallback;
    private sceneEntityData: SceneEntityData;
    private selectionColor: Utils.RGBColor01;
    private hoverColor: Utils.RGBColor01

    constructor(onEntitySelected: IEntitySelectedCallback, sceneEntityData: SceneEntityData, outline: SceneOutline, selectionColor: Utils.RGBColor01, hoverColor: Utils.RGBColor01)
    {
        this.onEntitySelected = onEntitySelected;
        this.outline = outline;
        this.sceneEntityData = sceneEntityData;
        this.selectionColor = selectionColor;
        this.hoverColor = hoverColor;
    }

    initialize(scene: BABYLON.Scene, canvas: HTMLCanvasElement, propertySelection: ScenePropertySelection)
    {
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
                const entityId: number = this.sceneEntityData.getEntityIdOfProperty(parseInt(pickResult.pickedMesh.id));
                this.onEntitySelected(entityId);
            }
        };

        scene.onPointerMove = (evt, pickInfo) => {
            if (pickInfo.hit) {
                const entityId: number = this.sceneEntityData.getEntityIdOfProperty(parseInt(pickInfo.pickedMesh.id));
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

            propertySelection.onPointerMove(pickInfo, this.selectedEntityId);
        };
    }

    getSelectedEntity()
    {
        return this.selectedEntity;
    }

    getSelectedEntityId()
    {
        return this.selectedEntityId;
    }

    markEntityAsHovered(id: number)
    {
        this.onEntityHovered(id);
    }

    unmarkEntityAsHovered(id: number)
    {
        this.onEntityStopHovered();
    }

    markEntityAsSelected(id: number) : boolean
    {
        this.selectedEntityId = id;
        let storedMesh = this.sceneEntityData.getEntityById(id);
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
            return true;
        }

        return false;
    }

    refreshOutlineTargets()
    {
        this.outline.refreshOutlineTargets(this.selectedEntity, this.hoveredEntity);
    }

    setColors(selectionColor: Utils.RGBColor01, hoverColor: Utils.RGBColor01)
    {
        this.selectionColor = selectionColor;
        this.hoverColor = hoverColor;
        if (this.selectedEntity)
        {
            this.applySelectionMaterial(this.selectedEntity);
        }
        if (this.hoveredEntity)
        {
            this.applyHoverMaterial(this.hoveredEntity);
        }
    }

    private onEntityHovered(id: number)
    {
        let storedMesh = this.sceneEntityData.getEntityById(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
            {
                this.restoreEntityMaterial(this.hoveredEntity);
            }

            this.hoveredEntity = storedMesh;

            if (this.hoveredEntity != this.selectedEntity)
            {
                this.applyHoverMaterial(this.hoveredEntity);
            }
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

    private applySelectionMaterial(entity: IEntityRenderData)
    {
        (entity.label.material as BABYLON.StandardMaterial).emissiveColor.set(
            this.selectionColor.r,
            this.selectionColor.g,
            this.selectionColor.b
        );
    }

    private applyHoverMaterial(entity: IEntityRenderData)
    {
        (entity.label.material as BABYLON.StandardMaterial).emissiveColor.set(
            this.hoverColor.r,
            this.hoverColor.g,
            this.hoverColor.b
        );
    }

    private restoreEntityMaterial(entity: IEntityRenderData)
    {
        (entity.label.material as BABYLON.StandardMaterial).emissiveColor.set(1, 1, 1);
    }
}