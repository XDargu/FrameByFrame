import * as BABYLON from 'babylonjs';
import { IGetResourceFunction, MaterialPool } from './materialPool';
import { ArrowPool, BoxPool, CapsulePool, CylinderPool, LinePool, MeshPool, PathPool, PlanePool, SpherePool, HemiSpherePool } from './meshPools';

export default class RenderPools
{
    materialPool: MaterialPool;

    // Mesh pools
    capsulePool: CapsulePool;
    cylinderPool: CylinderPool;
    spherePool: SpherePool;
    hemiSpherePool: HemiSpherePool;
    boxPool: BoxPool;
    planePool: PlanePool;
    linePool: LinePool;
    arrowPool: ArrowPool;
    pathPool: PathPool;

    pools: MeshPool[];

    scene: BABYLON.Scene;
    
    constructor(scene: BABYLON.Scene, getResourceFunc: IGetResourceFunction)
    {
        this.scene = scene;
        this.materialPool = new MaterialPool(scene, getResourceFunc);
        this.capsulePool = new CapsulePool(scene);
        this.cylinderPool = new CylinderPool(scene);
        this.spherePool = new SpherePool(scene);
        this.hemiSpherePool = new HemiSpherePool(scene);
        this.boxPool = new BoxPool(scene);
        this.planePool = new PlanePool(scene);
        this.linePool = new LinePool(scene);
        this.arrowPool = new ArrowPool(scene);
        this.pathPool = new PathPool(scene);

        this.pools = [this.capsulePool, this.cylinderPool, this.spherePool, this.hemiSpherePool, this.boxPool, this.planePool, this.linePool, this.arrowPool, this.pathPool];
    }

    tryFreeMesh(mesh: BABYLON.Mesh) : boolean
    {
        for (let pool of this.pools)
        {
            if (pool.freeMesh(mesh))
                return true;
        }
        return false;
    }

    getTotalPooledMeshes() : number
    {
        return this.pools.reduce((totalSoFar, pool) => { return totalSoFar + pool.getTotalMeshes(); }, 0);
    }

    clear()
    {
        this.pools.forEach((pool) => {
            pool.clear();
        });
    }
}