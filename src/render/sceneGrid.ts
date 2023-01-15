import * as BABYLON from 'babylonjs';
import { GridMaterial } from 'babylonjs-materials';

export default class SceneGrid
{
    private grid: BABYLON.Mesh;

    constructor(scene: BABYLON.Scene)
    {
        this.grid = BABYLON.Mesh.CreatePlane("plane", 10000.0, scene);
        this.grid.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
        this.grid.isPickable = false;

        let groundMaterial = new GridMaterial("groundMaterial", scene);
        groundMaterial.majorUnitFrequency = 5;
        groundMaterial.minorUnitVisibility = 0.45;
        groundMaterial.gridRatio = 1;
        groundMaterial.backFaceCulling = false;
        groundMaterial.mainColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        groundMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        groundMaterial.opacity = 0.5;

        this.grid.material = groundMaterial;
    }

    public setGridHeight(height: number)
    {
        this.grid.position.y = height;
    }

    public setGridSpacing(spacing: number)
    {
        (this.grid.material as GridMaterial).gridRatio = spacing;
    }
}