import * as BABYLON from 'babylonjs';
import * as RECDATA from "../recording/RecordingData";
import * as RECORDING from "../recording/RecordingDefinitions";
import { Console, LogChannel, LogLevel } from '../frontend/ConsoleController';
import { loadImageResource } from './resources/images';

export interface IGetResourceFunction
{
    (path: string) : RECDATA.IResource;
}

export class MaterialPool
{
    private pool: Map<string, BABYLON.StandardMaterial>;
    private scene: BABYLON.Scene;
    private backFaceCullingEnabled: boolean;
    private getResourceFunc: IGetResourceFunction;

    constructor(scene: BABYLON.Scene, getResourceFunc: IGetResourceFunction)
    {
        this.pool = new Map<string, BABYLON.StandardMaterial>();
        this.scene = scene;
        this.backFaceCullingEnabled = false;
        this.getResourceFunc = getResourceFunc;
    }

    getMaterialByTexture(texture: string, color: RECORDING.IColor): BABYLON.StandardMaterial
    {
        return this.getMaterialTexture(texture, color.r, color.g, color.b, color.a);
    }

    getMaterialByColor(color: RECORDING.IColor): BABYLON.StandardMaterial
    {
        return this.getMaterial(color.r, color.g, color.b, color.a);
    }

    private hash(r: number, g: number, b:number, a:number)
    {
        return r.toString() + g.toString() + b.toString() + a.toString();
    }

    getMaterialTexture(path: string, r: number, g: number, b:number, a:number) : BABYLON.StandardMaterial
    {
        // TODO: Do a proper hash not string based
        const hash: string = path + this.hash(r, g, b, a);
        const cachedMaterial = this.pool.get(hash);
        if (cachedMaterial != undefined)
        {
            cachedMaterial.wireframe = false;
            return cachedMaterial;
        }

        const material = new BABYLON.StandardMaterial("cachedMaterial", this.scene);
        material.diffuseColor = new BABYLON.Color3(r, g, b);
        material.backFaceCulling = this.backFaceCullingEnabled;
        material.alpha = a;
        material.useAlphaFromDiffuseTexture = true;

        const resource = this.getResourceFunc(path);
        if (resource)
        {
            loadImageResource(resource).then((result)=>{
                const url = URL.createObjectURL(result.data);
                material.diffuseTexture = new BABYLON.Texture(url, this.scene);
                material.diffuseTexture.hasAlpha = true;
            }).catch((e) => {
                // Apply invalid texture
                Console.log(LogLevel.Error, LogChannel.Default, "Error: " + e.message);
                Console.log(LogLevel.Error, LogChannel.Default, "Couldn't find texture: " + path);
            });
        }

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