import * as BABYLON from 'babylonjs';
import { IEntityRenderData, SceneEntityData } from './commonTypes';
import SceneOutline from './sceneOutline';

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

    constructor(onEntitySelected: IEntitySelectedCallback, sceneEntityData: SceneEntityData, outline: SceneOutline)
    {
        this.onEntitySelected = onEntitySelected;
        this.outline = outline;
        this.sceneEntityData = sceneEntityData;
    }

    initialize(scene: BABYLON.Scene, canvas: HTMLCanvasElement)
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

    private applySelectionMaterial(entity: IEntityRenderData)
    {
        // Nothing for now
    }

    private applyHoverMaterial(entity: IEntityRenderData)
    {
        // Nothing for now
    }

    private restoreEntityMaterial(entity: IEntityRenderData)
    {
        // Nothing for now
    }
}