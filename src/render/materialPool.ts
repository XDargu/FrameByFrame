import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { Console, LogChannel, LogLevel } from '../frontend/ConsoleController';

export interface IGetResourceFunction
{
    (path: string) : RECORDING.IResource;
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
        //material.diffuseTexture = new BABYLON.Texture(path, this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.backFaceCulling = this.backFaceCullingEnabled;
        material.alpha = 1;

        try
        {
            const resource = this.getResourceFunc(path);
            const hasValidData = resource.data && resource.data instanceof Blob;

            if (hasValidData)
            {
                // Load data, if possible
                material.diffuseTexture = new BABYLON.Texture(URL.createObjectURL(resource.data), this.scene);
            }
            else if (resource.textData && resource.type)
            {
                const parsed = JSON.parse(resource.textData);
                
                fetch(parsed.blob).then((res) => {
                    res.blob().then((blob) => {
                        resource.data = blob;
                        material.diffuseTexture = new BABYLON.Texture(URL.createObjectURL(resource.data), this.scene);
                    });
                });
            }
            else
            {
                // If everything else fails, try to load the texture
                fetch(path).then(data => {
                    data.blob().then(blob => {
                        
                        resource.data = blob;
                        material.diffuseTexture = new BABYLON.Texture(URL.createObjectURL(resource.data), this.scene);

                        // And generate the needed data
                        let reader = new FileReader();
                        reader.onload = () => {
                            const b64 = reader.result;
                            const jsonString = JSON.stringify({blob: b64});
                            resource.textData = jsonString;
                            resource.type = blob.type;
                        }
                        reader.readAsDataURL(blob);
                    })
                }).catch(error => {
                    // Apply invalid texture
                    material.diffuseTexture = new BABYLON.Texture("", this.scene);
                    Console.log(LogLevel.Error, LogChannel.Default, "Exception: " + error);
                    Console.log(LogLevel.Error, LogChannel.Default, "Couldn't find texture: " + path);
                });
            }
        } catch(e)
        {
            // Apply invalid texture
            material.diffuseTexture = new BABYLON.Texture("", this.scene);
            Console.log(LogLevel.Error, LogChannel.Default, "Exception: " + e.message);
            Console.log(LogLevel.Error, LogChannel.Default, "Couldn't find texture: " + path);
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