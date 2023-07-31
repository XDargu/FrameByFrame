import * as BABYLON from 'babylonjs';

export interface IPropertyRenderData
{
    mesh: BABYLON.Mesh;
    name: string;
}
export interface IEntityRenderData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, IPropertyRenderData>;
    label: BABYLON.Mesh;
}

export class SceneEntityData
{
    constructor()
    {
        this.entities = new Map<number, IEntityRenderData>();
        this.propertyToEntity = new Map<number, number>();
    }

    getEntityById(id: number) : IEntityRenderData
    {
        return this.entities.get(id);
    }

    getEntityIdOfProperty(propertyId: number) : number
    {
        return this.propertyToEntity.get(propertyId);
    }

    setEntityData(id: number, data: IEntityRenderData)
    {
        this.entities.set(id, data);
    }

    setEntityProperty(id: number, propertyId: number)
    {
        this.propertyToEntity.set(id, propertyId);
    }

    clear()
    {
        this.entities.clear();
        this.propertyToEntity.clear();
    }

    entities: Map<number, IEntityRenderData>;
    propertyToEntity: Map<number, number>;
}