import * as BABYLON from 'babylonjs';

export interface IEntityRenderData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, BABYLON.Mesh>;
}