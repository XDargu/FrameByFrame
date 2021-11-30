import * as BABYLON from 'babylonjs';
import { MaterialPool } from './materialPool';
import { BoxPool, CapsulePool, LinePool, PlanePool, SpherePool } from './meshPools';

export default class RenderPools
{
    materialPool: MaterialPool;

    // Mesh pools
    capsulePool: CapsulePool;
    spherePool: SpherePool;
    boxPool: BoxPool;
    planePool: PlanePool;
    linePool: LinePool;

    scene: BABYLON.Scene;
    
    constructor(scene: BABYLON.Scene)
    {
        this.scene = scene;
        this.materialPool = new MaterialPool(scene);
        this.capsulePool = new CapsulePool(scene);
        this.spherePool = new SpherePool(scene);
        this.boxPool = new BoxPool(scene);
        this.planePool = new PlanePool(scene);
        this.linePool = new LinePool(scene);
    }

    tryFreeMesh(mesh: BABYLON.Mesh) : boolean
    {
        return !this.capsulePool.freeMesh(mesh) &&
            !this.spherePool.freeMesh(mesh) &&
            !this.boxPool.freeMesh(mesh) &&
            !this.planePool.freeMesh(mesh) &&
            !this.linePool.freeMesh(mesh);
    }

    clear()
    {
        this.materialPool.clear();
        this.capsulePool.clear();
        this.spherePool.clear();
        this.boxPool.clear();
        this.planePool.clear();
        this.linePool.clear();
    }
}