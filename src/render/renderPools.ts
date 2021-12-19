import * as BABYLON from 'babylonjs';
import { MaterialPool } from './materialPool';
import { ArrowPool, BoxPool, CapsulePool, LinePool, MeshPool, PlanePool, SpherePool } from './meshPools';

export default class RenderPools
{
    materialPool: MaterialPool;

    // Mesh pools
    capsulePool: CapsulePool;
    spherePool: SpherePool;
    boxPool: BoxPool;
    planePool: PlanePool;
    linePool: LinePool;
    arrowPool: ArrowPool;

    pools: MeshPool[];

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
        this.arrowPool = new ArrowPool(scene);

        this.pools = [this.capsulePool, this.spherePool, this.boxPool, this.planePool, this.linePool, this.arrowPool];
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