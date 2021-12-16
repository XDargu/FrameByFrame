import * as BABYLON from 'babylonjs';
import { SceneEntityData } from './commonTypes';
import RenderPools from './renderPools';

export default class ScenePropertySelection
{
    private sceneEntityData: SceneEntityData;
    private pools: RenderPools;
    private previousMaterial: BABYLON.Material;

    constructor(sceneEntityData: SceneEntityData, pools: RenderPools)
    {
        this.sceneEntityData = sceneEntityData;
        this.pools = pools;
    }

    showProperty(propertyId: number)
    {
        const entityId = this.sceneEntityData.getEntityIdOfProperty(propertyId);
        if (entityId != null)
        {
            const entityData = this.sceneEntityData.getEntityById(entityId);
            let property = entityData.properties.get(propertyId);
            if (property != null)
            {
                // TODO: Lines should not do this!! They need to be fully rebuilt with different vertex colors
                this.previousMaterial = property.material;
                property.material = this.pools.materialPool.getMaterial(1, 1, 0, 1);
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
                property.material = this.previousMaterial;
                this.previousMaterial = null;
            }
        }
    }
}