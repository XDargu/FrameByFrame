import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import CreateCapsule from './capsule';
import { LinesMesh } from 'babylonjs/Meshes/linesMesh';

export interface IPooledMesh
{
    mesh: BABYLON.Mesh;
    used: boolean;
}

export class MeshPool
{
    protected pool: Map<string, IPooledMesh[]>;
    protected scene: BABYLON.Scene;

    constructor(scene: BABYLON.Scene)
    {
        this.pool = new Map<string, IPooledMesh[]>();
        this.scene = scene;
    }

    protected findMesh(hash: string, args: any)
    {
        const cachedMeshes = this.pool.get(hash);
        if (cachedMeshes != undefined)
        {
            return this.findOrAddMesh(hash, args, cachedMeshes);
        }

        let meshes: IPooledMesh[] = [];
        this.pool.set(hash, meshes);
        return this.findOrAddMesh(hash, args, meshes);
    }

    private findOrAddMesh(hash: string, args: any, meshes: IPooledMesh[]) : BABYLON.Mesh
    {
        for (let mesh of meshes)
        {
            if (!mesh.used)
            {
                mesh.mesh.setEnabled(true);
                mesh.used = true;
                return mesh.mesh;
            }
        }

        const mesh = this.buildMesh(hash, args);
        meshes.push({mesh: mesh, used: true});
        return mesh;
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        return null;
    }

    freeMesh(mesh: BABYLON.Mesh)
    {
        let cachedMesh = this.pool.get(mesh.name);
        if (cachedMesh)
        {
            for (let pooledMesh of cachedMesh)
            {
                if (pooledMesh.mesh.uniqueId == mesh.uniqueId)
                {
                    pooledMesh.mesh.setEnabled(false);
                    pooledMesh.used = false;
                    pooledMesh.mesh.isPickable = false;
                    return true;
                }
            }
        }

        return false;
    }

    logDebugData()
    {
        console.log(`Total hashes: ${this.pool.size}`);
        let size = 0;
        for (let pool of this.pool)
        {
            size += pool[1].length;
        }
        console.log(`Total items: ${size}`);

        console.log(this.pool);
    }
}

export class CapsulePool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getCapsule(height: number, radius: number): BABYLON.Mesh
    {
        const hash: string = height.toFixed(3).toString() + radius.toFixed(3).toString();
        return this.findMesh(hash, {radius: radius, height: height});
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        return CreateCapsule(hash, {
            height: args.height - (args.radius * 2),
            radius: args.radius,
            tessellation : 9,
            capDetail : 5,
        }, this.scene);
    }
}

export class SpherePool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getSphere(radius: number): BABYLON.Mesh
    {
        const hash: string = radius.toFixed(3).toString();
        return this.findMesh(hash, {radius: radius });
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        return BABYLON.Mesh.CreateSphere(hash, 8.0, args.radius * 2, this.scene);
    }
}

export class BoxPool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getBox(size: RECORDING.IVec3): BABYLON.Mesh
    {
        const hash: string = size.x.toFixed(3).toString() + size.y.toFixed(3).toString() + size.z.toFixed(3).toString();
        return this.findMesh(hash, { size: size });
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        return BABYLON.MeshBuilder.CreateBox(hash, {height: args.size.x, width: args.size.y, depth: args.size.z}, this.scene)
    }
}

export class PlanePool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getPlane(normal: RECORDING.IVec3, length: number, width: number): BABYLON.Mesh
    {
        const hash: string = normal.x.toFixed(3) + normal.y.toFixed(3) + normal.z.toFixed(3) + length.toFixed(3) + width.toFixed(3);
        return this.findMesh(hash, { normal: normal, length: length, width: width });
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        // TODO: We can probably just rotate the plane, instead of having many copies
        let sourcePlane = new BABYLON.Plane(args.normal.x, args.normal.y, args.normal.z, 0);
        return BABYLON.MeshBuilder.CreatePlane(hash, {height: args.length, width: args.width, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, this.scene);
    }
}

export class LinePool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getLine(origin: RECORDING.IVec3, end: RECORDING.IVec3, color: RECORDING.IColor): BABYLON.Mesh
    {
        const hash: string = "line";
        let mesh = this.findMesh(hash, { origin: origin, end: end, color: color });

        let linePoints = [
            new BABYLON.Vector3(origin.x, origin.y, origin.z),
            new BABYLON.Vector3(end.x, end.y, end.z),
        ];

        let lineColors = [
            new BABYLON.Color4(color.r, color.g, color.b, color.a),
            new BABYLON.Color4(color.r, color.g, color.b, color.a),
        ];

        mesh = BABYLON.MeshBuilder.CreateLines(hash, {points: linePoints, colors: lineColors, instance: mesh as LinesMesh, updatable: true} );
        mesh.alwaysSelectAsActiveMesh = true;
        return mesh;
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        let linePoints = [
            new BABYLON.Vector3(args.origin.x, args.origin.y, args.origin.z),
            new BABYLON.Vector3(args.end.x, args.end.y, args.end.z),
        ];

        let lineColors = [
            new BABYLON.Color4(args.color.r, args.color.g, args.color.b, args.color.a),
            new BABYLON.Color4(args.color.r, args.color.g, args.color.b, args.color.a),
        ];

        return BABYLON.MeshBuilder.CreateLines(hash, {points: linePoints, colors: lineColors, updatable: true} );
    }
}