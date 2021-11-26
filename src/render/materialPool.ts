import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';

export class MaterialPool
{
    private pool: Map<string, BABYLON.StandardMaterial>;
    private scene: BABYLON.Scene;

    constructor(scene: BABYLON.Scene)
    {
        this.pool = new Map<string, BABYLON.StandardMaterial>();
        this.scene = scene;
    }

    getMaterialByColor(color: RECORDING.IColor): BABYLON.StandardMaterial
    {
        return this.getMaterial(color.r, color.g, color.b, color.a);
    }

    getMaterial(r: number, g: number, b:number, a:number) : BABYLON.StandardMaterial
    {
        // TODO: Do a proper hash not string based
        const hash: string = r.toString() + g.toString() + b.toString() + a.toString();
        const cachedMaterial = this.pool.get(hash);
        if (cachedMaterial != undefined)
        {
            return cachedMaterial;
        }

        let material = new BABYLON.StandardMaterial("cachedMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.alpha = a;

        this.pool.set(hash, material);
        return material;
    }
}