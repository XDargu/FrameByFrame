import * as BABYLON from 'babylonjs';
import * as Utils from '../utils/utils';
import { SceneEntityData } from './commonTypes';
import RenderPools from './renderPools';

export default class ScenePropertySelection
{
    private sceneEntityData: SceneEntityData;
    private pools: RenderPools;
    private previousMaterial: BABYLON.Material;
    private hoveredProperty: number;
    private hoverColor: Utils.RGBColor01;
    private highlightOnHover: boolean;

    constructor(sceneEntityData: SceneEntityData, pools: RenderPools, highlightOnHover: boolean, hoverColor: Utils.RGBColor01)
    {
        this.sceneEntityData = sceneEntityData;
        this.pools = pools;
        this.hoveredProperty = null;
        this.highlightOnHover = highlightOnHover;
        this.hoverColor = hoverColor;
    }

    private tryHighlightShape(pickInfo: BABYLON.PickingInfo, selectedEntityID: number) : boolean
    {
        if (this.highlightOnHover)
        {
            if (pickInfo.hit)
            {
                const propertyId: number = parseInt(pickInfo.pickedMesh.id);
                const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);

                if (entityId == selectedEntityID)
                {
                    if (this.hoveredProperty && this.hoveredProperty != propertyId)
                    {
                        this.hideProperty(this.hoveredProperty);
                        this.hoveredProperty = null;
                    }

                    if (!this.hoveredProperty)
                    {
                        this.showProperty(propertyId, true);
                        this.hoveredProperty = propertyId;
                    }

                    return true;
                }
            }
        }

        return false;
    }

    onPointerMove(pickInfo: BABYLON.PickingInfo, selectedEntityID: number)
    {
        if (!this.tryHighlightShape(pickInfo, selectedEntityID))
        {
            if (this.hoveredProperty)
            {
                this.hideProperty(this.hoveredProperty);
                this.hoveredProperty = null;
            }
        }
    }

    showProperty(propertyId: number, showToolTip: boolean = false)
    {
        const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);
        if (entityId != null)
        {
            const entityData = this.sceneEntityData.getEntityById(entityId);
            let property = entityData.properties.get(propertyId);
            if (property != null)
            {
                // TODO: Lines should not do this!! They need to be fully rebuilt with different vertex colors
                this.previousMaterial = property.mesh.material;
                property.mesh.material = this.pools.materialPool.getMaterial(this.hoverColor.r, this.hoverColor.g, this.hoverColor.b, 1);

                if (showToolTip)
                {
                    let toolTipElement = document.getElementById("sceneTooltip");
                    toolTipElement.textContent = property.property.name;
                    toolTipElement.classList.remove("disabled");
                }
            }
        }
    }

    // TODO: Find a better name
    hideProperty(propertyId: number)
    {
        const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);
        if (entityId != null)
        {
            const entityData = this.sceneEntityData.getEntityById(entityId);
            let property = entityData.properties.get(propertyId);
            if (property != null && this.previousMaterial != null)
            {
                property.mesh.material = this.previousMaterial;
                this.previousMaterial = null;
             
                Utils.addUniqueClass(document.getElementById("sceneTooltip"), "disabled");
            }
        }
    }

    getHoveredPropertyId()
    {
        return this.hoveredProperty;
    }

    setShapeHoverSettings(highlightShapesOnHover: boolean, shapeHoverColor: Utils.RGBColor01)
    {
        this.highlightOnHover = highlightShapesOnHover;
        this.hoverColor = shapeHoverColor;
    }
}