import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';

export class MaterialPool
{
    private pool: Map<string, BABYLON.StandardMaterial>;
    private scene: BABYLON.Scene;
    private backFaceCullingEnabled: boolean;

    constructor(scene: BABYLON.Scene)
    {
        this.pool = new Map<string, BABYLON.StandardMaterial>();
        this.scene = scene;
        this.backFaceCullingEnabled = false;
    }

    getMaterialByTexture(texture: string): BABYLON.StandardMaterial
    {
        return this.getMaterialTexture(texture);
    }

    getMaterialByColor(color: RECORDING.IColor): BABYLON.StandardMaterial
    {
        return this.getMaterial(color.r, color.g, color.b, color.a);
    }

    private hash(r: number, g: number, b:number, a:number)
    {
        return r.toString() + g.toString() + b.toString() + a.toString();
    }

    getMaterialTexture(path: string) : BABYLON.StandardMaterial
    {
        // TODO: Do a proper hash not string based
        const hash: string = path;
        const cachedMaterial = this.pool.get(hash);
        if (cachedMaterial != undefined)
        {
            cachedMaterial.wireframe = false;
            return cachedMaterial;
        }

        let material = new BABYLON.StandardMaterial("cachedMaterial", this.scene);
        material.diffuseTexture = new BABYLON.Texture(path, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.backFaceCulling = this.backFaceCullingEnabled;
        material.alpha = 1;

        this.pool.set(hash, material);
        return material;
    }

    getMaterial(r: number, g: number, b:number, a:number) : BABYLON.StandardMaterial
    {
        // TODO: Do a proper hash not string based
        const hash: string = this.hash(r, g, b, a);
        const cachedMaterial = this.pool.get(hash);
        if (cachedMaterial != undefined)
        {
            cachedMaterial.wireframe = false;
            return cachedMaterial;
        }

        const textureBlob = new Blob([textureArrayBuffer])
        const textureUrl = URL.createObjectURL(textureBlob)

        BABYLON.LoadFile(textureOriginalUrl, (textureArrayBuffer) => {

        });

        let material = new BABYLON.StandardMaterial("cachedMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.backFaceCulling = this.backFaceCullingEnabled;
        material.alpha = a;

        this.pool.set(hash, material);
        return material;
    }

    setBackfaceCulling(active: boolean)
    {
        for (let [hash, material] of this.pool)
        {
            material.backFaceCulling = active;
        }
        this.backFaceCullingEnabled = active;
    }

    getPoolSize() : number
    {
        return this.pool.size;
    }

    clear()
    {
        for (let [hash, material] of this.pool)
        {
            this.scene.removeMaterial(material);
        }
        this.pool.clear();
    }
}