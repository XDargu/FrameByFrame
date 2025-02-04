import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import * as RenderUtils from '../render/renderUtils';
import { LinesMesh, } from 'babylonjs/Meshes/linesMesh';
import { CustomLinesMesh, createCustomLinesystem } from './customLineMesh';

export interface IPooledMesh
{
    mesh: BABYLON.Mesh;
    used: boolean;
}

export class MeshPool
{
    protected pool: Map<string, IPooledMesh[]>;
    protected scene: BABYLON.Scene;
    protected coordsSystem: RECORDING.ECoordinateSystem;

    constructor(scene: BABYLON.Scene)
    {
        this.pool = new Map<string, IPooledMesh[]>();
        this.scene = scene;
        this.coordsSystem = RECORDING.ECoordinateSystem.RightHand;
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
        console.log(`Total hashes: ${this.getHashedMeshes()}`);
        console.log(`Total items: ${this.getTotalMeshes()}`);
        console.log(this.pool);
    }

    getHashedMeshes() : number
    {
        return this.pool.size;
    }

    getTotalMeshes() : number
    {
        let size = 0;
        for (let pool of this.pool)
        {
            size += pool[1].length;
        }
        return size;
    }

    clear()
    {
        for (let [hash, meshes] of this.pool)
        {
            for (let pooledMesh of meshes)
            {
                this.scene.removeMesh(pooledMesh.mesh);
            }
        }
        this.pool.clear();
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
        return BABYLON.Mesh.CreateCapsule(hash, {
            height: args.height,
            radius: args.radius,
            tessellation : 9,
            subdivisions: 2,
            capSubdivisions: 6
        }, this.scene);
    }
}

export class CylinderPool extends MeshPool
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getCylinder(height: number, radius: number): BABYLON.Mesh
    {
        const hash: string = height.toFixed(3).toString() + radius.toFixed(3).toString();
        return this.findMesh(hash, {radius: radius, height: height});
    }

    protected buildMesh(hash: string, args: any) : BABYLON.Mesh
    {
        return BABYLON.Mesh.CreateCylinder(hash, args.height, args.radius * 2, args.radius * 2, 12, 2, this.scene);
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
        return BABYLON.MeshBuilder.CreateBox(hash, {height: args.size.y, width: args.size.x, depth: args.size.z}, this.scene)
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

abstract class GenericLinePool<Args> extends MeshPool
{
    private material: BABYLON.Material;

    constructor(scene: BABYLON.Scene)
    {
        super(scene);
        this.material = null;
    }
    
    protected getLineInternal(args: Args) : BABYLON.Mesh
    {
        const hash: string = this.getHash(args);

        let mesh = this.findMesh(hash, args) as CustomLinesMesh;

        const linePoints = this.getPoints(args);
        const lineColors = this.getColors(args);
        // Custom createCustomLinesystem so we can pass materials around
        // Adapted form Babylon's updated mesh build from 5.0
        if (this.material === null)
        {
            this.material = mesh.material;
        }
        mesh = createCustomLinesystem(hash, {lines: linePoints, colors: lineColors, instance: mesh, updatable: true, material: this.material }, this.scene );
        mesh.alwaysSelectAsActiveMesh = true;
        return mesh;
    }

    protected buildMesh(hash: string, args: Args) : BABYLON.Mesh
    {
        const linePoints = this.getPoints(args);
        const lineColors = this.getColors(args);

        if (this.material === null)
        {
            let mesh = createCustomLinesystem(hash, {lines: linePoints, colors: lineColors, updatable: true}, this.scene );
            this.material = mesh.material;
            return mesh;
        }
        return createCustomLinesystem(hash, {lines: linePoints, colors: lineColors, updatable: true, material: this.material }, this.scene );
    }

    abstract getPoints(args: Args) : BABYLON.Vector3[][];
    abstract getColors(args: Args) : BABYLON.Color4[][];
    abstract getHash(args: Args) : string;

    clear()
    {
        if (this.material) {
            this.scene.removeMaterial(this.material);
        }
        super.clear();
    }
}

type LineArgs = { origin: BABYLON.Vector3, end: BABYLON.Vector3, color: RECORDING.IColor };
export class LinePool extends GenericLinePool<LineArgs>
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getLine(origin: BABYLON.Vector3, end: BABYLON.Vector3, color: RECORDING.IColor): BABYLON.Mesh
    {
        const args: LineArgs = { origin: origin, end: end, color: color };
        return this.getLineInternal(args);
    }

    getPoints(args: LineArgs)
    {
        return [[
            args.origin,
            args.end
        ]];
    }

    getColors(args: LineArgs)
    {
        const col = RenderUtils.createColor4Rec(args.color);
        return [[ col, col ]];
    }

    getHash(args: LineArgs)
    {
        return "line";
    }
}

type ArrowArgs = { origin: BABYLON.Vector3, end: BABYLON.Vector3, color: RECORDING.IColor };
export class ArrowPool extends GenericLinePool<LineArgs>
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getArrow(origin: BABYLON.Vector3, end: BABYLON.Vector3, color: RECORDING.IColor): BABYLON.Mesh
    {
        const args: ArrowArgs = { origin: origin, end: end, color: color };
        return this.getLineInternal(args);
    }

    getPoints(args: ArrowArgs)
    {
        const origin = args.origin;
        const end = args.end;

        const dir = end.subtract(origin).normalize();
        const isUp = Math.abs(dir.x) < 0.01 && Math.abs(dir.z) < 0.01; // Using epsilon to avoid issues with small numbers

        const right = isUp ? BABYLON.Vector3.Right() : dir.cross(BABYLON.Vector3.Up()).normalize(); // Normalizing here prevents scaling issues with small numbers
        const left = right.scale(-1);

        dir.scaleInPlace(0.2);

        right.scaleInPlace(0.2).addInPlace(end).subtractInPlace(dir);
        left.scaleInPlace(0.2).addInPlace(end).subtractInPlace(dir);

        return [[ origin, end ], [ right, end, left ]];
    }

    getColors(args: ArrowArgs)
    {
        const col = RenderUtils.createColor4Rec(args.color);
        return [[ col, col ], [col, col, col]];
    }

    getHash(args: ArrowArgs)
    {
        return "arrow";
    }
}

type PathArgs = { points: BABYLON.Vector3[], color: RECORDING.IColor };
export class PathPool extends GenericLinePool<PathArgs>
{
    constructor(scene: BABYLON.Scene)
    {
        super(scene);
    }

    getPath(points: BABYLON.Vector3[], color: RECORDING.IColor): BABYLON.Mesh
    {
        const args: PathArgs = { points: points, color: color };
        return this.getLineInternal(args);
    }

    getPoints(args: PathArgs)
    {
        return [ args.points ];
    }

    getColors(args: PathArgs)
    {
        const col = RenderUtils.createColor4Rec(args.color);
        return [new Array(args.points.length).fill(col)];
    }

    getHash(args: PathArgs)
    {
        return "path";
    }
}