import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import { GridMaterial } from 'babylonjs-materials';
import { Quaternion } from 'babylonjs';

export interface IEntitySelectedCallback
{
    (id: number) : void
}

interface IEntityData
{
    mesh: BABYLON.Mesh;
    properties: Map<number, BABYLON.Mesh>;
}

// Capsule, move somewhere else. Babylon 4.2.0 has capsule built-in, but performance is much worse. Use this until we find out why.
function CreateCapsule(name: string, args: any, scene: BABYLON.Scene) : BABYLON.Mesh
{
    let mesh = new BABYLON.Mesh(name, scene)
    let path = args.orientation || BABYLON.Vector3.Right()
    let subdivisions = Math.max(args.subdivisions?args.subdivisions:2, 1)
    let tessellation = Math.max(args.tessellation?args.tessellation:16, 3)
    let height = Math.max(args.height?args.height:2, 0.)
    let radius = Math.max(args.radius?args.radius:1, 0.)
    let capRadius = Math.max(args.capRadius?args.capRadius:radius, radius)
    let capDetail = Math.max(args.capDetail?args.capDetail:6, 1)

    let  radialSegments = tessellation;
	let  heightSegments = subdivisions;

    let radiusTop = Math.max(args.radiusTop?args.radiusTop:radius, 0.)
    let radiusBottom = Math.max(args.radiusBottom?args.radiusBottom:radius, 0.)

    let thetaStart = args.thetaStart || 0.0
    let thetaLength = args.thetaLength || (2.0 * Math.PI)

    let capsTopSegments = Math.max(args.topCapDetail?args.topCapDetail:capDetail, 1)
    let capsBottomSegments = Math.max(args.bottomCapDetail?args.bottomCapDetail:capDetail, 1)

    var alpha = Math.acos((radiusBottom-radiusTop)/height)
    var eqRadii = (radiusTop-radiusBottom === 0)

    var indices = []
	var vertices = []
	var normals = []
	var uvs = []
    
    var index = 0,
	    indexOffset = 0,
	    indexArray = [],
	    halfHeight = height / 2;
    
    var x, y;
    var normal = BABYLON.Vector3.Zero();
    var vertex = BABYLON.Vector3.Zero();

    var cosAlpha = Math.cos(alpha);
    var sinAlpha = Math.sin(alpha);

    var cone_length =
        new BABYLON.Vector2(
            radiusTop*sinAlpha,
            halfHeight+radiusTop*cosAlpha
            ).subtract(new BABYLON.Vector2(
                radiusBottom*sinAlpha,
                -halfHeight+radiusBottom*cosAlpha
            )
        ).length();

    // Total length for v texture coord
    var vl = radiusTop*alpha
                + cone_length
                + radiusBottom*(Math.PI/2-alpha);

    var groupCount = 0;

    // generate vertices, normals and uvs

    var v = 0;
    for( y = 0; y <= capsTopSegments; y++ ) {

        var indexRow = [];

        var a = Math.PI/2 - alpha*(y / capsTopSegments);

        v += radiusTop*alpha/capsTopSegments;

        var cosA = Math.cos(a);
        var sinA = Math.sin(a);

        // calculate the radius of the current row
        var _radius = cosA*radiusTop;

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = halfHeight + sinA*radiusTop;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( cosA*sinTheta, sinA, cosA*cosTheta );
            normals.push( normal.x, normal.y, normal.z );
            // uv
            uvs.push( u, 1 - v/vl );
            // save index of vertex in respective row
            indexRow.push( index );
            // increase index
            index ++;
        }

        // now save vertices of the row in our index array
        indexArray.push( indexRow );

    }

    var cone_height = height + cosAlpha*radiusTop - cosAlpha*radiusBottom;
    var slope = sinAlpha * ( radiusBottom - radiusTop ) / cone_height;
    for ( y = 1; y <= heightSegments; y++ ) {

        var indexRow = [];

        v += cone_length/heightSegments;

        // calculate the radius of the current row
        var _radius = sinAlpha * ( y * ( radiusBottom - radiusTop ) / heightSegments + radiusTop);

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = halfHeight + cosAlpha*radiusTop - y * cone_height / heightSegments;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( sinTheta, slope, cosTheta ).normalize();
            normals.push( normal.x, normal.y, normal.z );

            // uv
            uvs.push( u, 1 - v/vl );

            // save index of vertex in respective row
            indexRow.push( index );

            // increase index
            index ++;

        }

        // now save vertices of the row in our index array
        indexArray.push( indexRow );

    }

    for( y = 1; y <= capsBottomSegments; y++ ) {

        var indexRow = [];

        var a = (Math.PI/2 - alpha) - (Math.PI - alpha)*( y / capsBottomSegments);

        v += radiusBottom*alpha/capsBottomSegments;

        var cosA = Math.cos(a);
        var sinA = Math.sin(a);

        // calculate the radius of the current row
        var _radius = cosA*radiusBottom;

        for ( x = 0; x <= radialSegments; x ++ ) {

            var u = x / radialSegments;

            var theta = u * thetaLength + thetaStart;

            var sinTheta = Math.sin( theta );
            var cosTheta = Math.cos( theta );

            // vertex
            vertex.x = _radius * sinTheta;
            vertex.y = -halfHeight + sinA*radiusBottom;;
            vertex.z = _radius * cosTheta;
            vertices.push( vertex.x, vertex.y, vertex.z );

            // normal
            normal.set( cosA*sinTheta, sinA, cosA*cosTheta );
            normals.push( normal.x, normal.y, normal.z );

            // uv
            uvs.push( u, 1 - v/vl );

            // save index of vertex in respective row
            indexRow.push( index );
            // increase index
            index ++;
        }
        // now save vertices of the row in our index array
        indexArray.push( indexRow );
    }
    // generate indices
    for ( x = 0; x < radialSegments; x ++ ) {
        for ( y = 0; y < capsTopSegments + heightSegments + capsBottomSegments; y ++ ) {
            // we use the index array to access the correct indices
            var i1 = indexArray[ y ][ x ];
            var i2 = indexArray[ y + 1 ][ x ];
            var i3 = indexArray[ y + 1 ][ x + 1 ];
            var i4 = indexArray[ y ][ x + 1 ];
            // face one
            indices.push( i1 ); 
            indices.push( i2 );
            indices.push( i4 );
            // face two
            indices.push( i2 ); 
            indices.push( i3 );
            indices.push( i4 );
        }
    }
    indices = indices.reverse()

    let vDat = new BABYLON.VertexData()
    vDat.positions = vertices
    vDat.normals = normals
    vDat.uvs = uvs
    vDat.indices = indices

    vDat.applyToMesh(mesh)
    return mesh
}

// Unused for now, should be used later on
class UniversalCameraCustomKeyboardInput implements BABYLON.ICameraInput<BABYLON.UniversalCamera>
{
    camera: BABYLON.UniversalCamera;
    
    private keysLeft = [37, 65];
    private keysRight = [39, 68];
    private keysUp = [38, 87];
    private keysDown = [40, 83];
    private sensibility = 0.2;

    private _keys: number[] = [];
    private _onKeyDown: (ev: KeyboardEvent)=> any
    private _onKeyUp: (ev: KeyboardEvent)=> any
    
    getClassName(): string {
        return "UniversalCameraCustomKeyboardInput";
    }
    getSimpleName(): string {
        return "CustomKeyboardInput";
    }
    attachControl(element: HTMLElement, noPreventDefault?: boolean): void {
        var _this = this;
        if (!this._onKeyDown) {
            element.tabIndex = 1;
            this._onKeyDown = function (evt) {
                if (_this.keysLeft.indexOf(evt.keyCode) !== -1 || _this.keysRight.indexOf(evt.keyCode) !== -1) {
                    var index = _this._keys.indexOf(evt.keyCode);
                    if (index === -1) {
                        _this._keys.push(evt.keyCode);
                    }
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
            };
            this._onKeyUp = function (evt) {
                if (_this.keysLeft.indexOf(evt.keyCode) !== -1 || _this.keysRight.indexOf(evt.keyCode) !== -1) {
                    var index = _this._keys.indexOf(evt.keyCode);
                    if (index >= 0) {
                        _this._keys.splice(index, 1);
                    }
                    if (!noPreventDefault) {
                        evt.preventDefault();
                    }
                }
            };

            element.addEventListener("keydown", this._onKeyDown, false);
            element.addEventListener("keyup", this._onKeyUp, false);
        }
    }

    detachControl(element: HTMLElement): void {
        if (this._onKeyDown) {
            element.removeEventListener("keydown", this._onKeyDown);
            element.removeEventListener("keyup", this._onKeyUp);
            this._keys = [];
            this._onKeyDown = null;
            this._onKeyUp = null;
        }
    }

    checkInputs() {
        if (this._onKeyDown) {
            var camera = this.camera;

            // Keyboard
            for (var index = 0; index < this._keys.length; index++) {
                var keyCode = this._keys[index];
                if (this.keysLeft.indexOf(keyCode) !== -1) {
                    const right = camera.getWorldMatrix().getRow(0).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.subtract(right) , this.sensibility);
                }
                else if (this.keysRight.indexOf(keyCode) !== -1) {
                    const right = camera.getWorldMatrix().getRow(0).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.add(right) , this.sensibility);
                }
                else if (this.keysUp.indexOf(keyCode) !== -1) {
                    const forward = camera.getWorldMatrix().getRow(2).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.add(forward) , this.sensibility);

                    //camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(1), this.sensibility);
                }
                else if (this.keysDown.indexOf(keyCode) !== -1) {
                    const forward = camera.getWorldMatrix().getRow(2).toVector3();
                    camera.position = BABYLON.Vector3.Lerp(camera.position, camera.position.subtract(forward) , this.sensibility);
                    //camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(-1), this.sensibility);
                }
            }
        }
    }
}

class MaterialPool
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

interface IPooledMesh
{
    mesh: BABYLON.Mesh;
    used: boolean;
}
class MeshPool
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
        const cachedMesh = this.pool.get(hash);
        if (cachedMesh != undefined)
        {
            return this.findOrAddMesh(hash, args, cachedMesh);
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
                if (pooledMesh.mesh === mesh)
                {
                    pooledMesh.mesh.setEnabled(false);
                    pooledMesh.used = false;
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
class CapsulePool extends MeshPool
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

class SpherePool extends MeshPool
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

class BoxPool extends MeshPool
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

class PlanePool extends MeshPool
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
        console.log(args)
        return BABYLON.MeshBuilder.CreatePlane(hash, {height: args.length, width: args.width, sourcePlane: sourcePlane, sideOrientation: BABYLON.Mesh.DOUBLESIDE}, this.scene);
    }
}

class LayerManager
{
    private layers: Map<string, boolean>;

    constructor()
    {
        this.layers = new Map<string, boolean>();
    }

    setLayerActive(layer: string, active: boolean)
    {
        this.layers.set(layer, active);
    }

    isLayerActive(layer: string)
    {
        const active = this.layers.get(layer);
        return active != undefined ? active : false;
    }

    clear()
    {
        this.layers.clear();
    }
}

export default class SceneController
{
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;

    /* Basic ideas regarding scenes:
     - Entities are registered and added to a map by id
     - Shapes rendered by entities (as part of their properties) will be added to those entities, and will be stored in a map by property ID
     - Shapes, materials, etc. Should be stored in pools to reduce overhead if possible.
     - Instead of creating and destroying entities constantly, we can just move them around, and maybe hide the ones that doesn´t exist in the current frame
    */

    private entities: Map<number, IEntityData>;

    private selectedEntity: IEntityData;
    private hoveredEntity: IEntityData;

    private entityMaterial: BABYLON.StandardMaterial;
    private selectedMaterial: BABYLON.StandardMaterial;
    private hoveredMaterial: BABYLON.StandardMaterial;

    public onEntitySelected: IEntitySelectedCallback;

    private materialPool: MaterialPool;
    private layerManager: LayerManager;

    // Mesh pools
    private capsulePool: CapsulePool;
    private spherePool: SpherePool;
    private boxPool: BoxPool;
    private planePool: PlanePool;

    removeAllProperties()
    {
        for (let data of this.entities.values())
        {
            for (let propertyMesh of data.properties.values())
            {
                if (!this.capsulePool.freeMesh(propertyMesh))
                {
                    if (!this.spherePool.freeMesh(propertyMesh))
                    {
                        if (!this.boxPool.freeMesh(propertyMesh))
                        {
                            if (!this.planePool.freeMesh(propertyMesh))
                            {
                                this._scene.removeMesh(propertyMesh, true);
                            }
                        }
                    }
                }
                
                /*if (propertyMesh.material)
                {
                    this._scene.removeMaterial(propertyMesh.material);
                }*/
            }
            data.properties.clear();
        }

        /*console.log("Capsule pools:")
        this.capsulePool.logDebugData();
        console.log("Sphere pools:")
        this.spherePool.logDebugData();
        console.log("Box pools:")
        this.boxPool.logDebugData();*/
        console.log("Plane pools:")
        this.planePool.logDebugData();
    }

    private isPropertyShape(property: RECORDING.IProperty)
    {
        return property.type == "sphere" || property.type == "line"|| property.type == "plane" || property.type == "aabb" || property.type == "oobb" || property.type == "capsule";
    }

    addProperty(entity: RECORDING.IEntity, property: RECORDING.IProperty)
    {
        if (!this.isPropertyShape(property)) { return; }

        const shape = property as RECORDING.IProperyShape;
        if (!this.layerManager.isLayerActive(shape.layer)) { return; }
        
        let entityData = this.entities.get(entity.id);
        if (!entityData) { return; }

        if (property.type == "sphere")
        {
            let sphereProperty = property as RECORDING.IPropertySphere;

            // #TODO: This should be in a mesh/material pool
            let sphere = this.spherePool.getSphere(sphereProperty.radius);
            sphere.isPickable = false;
            sphere.id = sphereProperty.id.toString();

            sphere.position.set(sphereProperty.position.x, sphereProperty.position.y, sphereProperty.position.z);

            sphere.material = this.materialPool.getMaterialByColor(sphereProperty.color);

            entityData.properties.set(sphereProperty.id, sphere);
        }
        else if (property.type == "capsule")
        {
            let capsuleProperty = property as RECORDING.IPropertyCapsule;

            // #TODO: This should be in a mesh/material pool
            let capsule = this.capsulePool.getCapsule(capsuleProperty.height, capsuleProperty.radius);
            /*let capsule = CreateCapsule(capsuleProperty.name, {
                height: capsuleProperty.height - (capsuleProperty.radius * 2),
                radius: capsuleProperty.radius,
                tessellation : 9,
                capDetail : 5,
            }, this._scene);*/

            //let capsule = BABYLON.Mesh.CreateSphere(capsuleProperty.name, 8.0, capsuleProperty.radius * 2, this._scene);

            capsule.isPickable = false;
            capsule.id = capsuleProperty.id.toString();

            capsule.position.set(capsuleProperty.position.x, capsuleProperty.position.y, capsuleProperty.position.z);

            const direction = new BABYLON.Vector3(capsuleProperty.direction.x, capsuleProperty.direction.y, capsuleProperty.direction.z);
            //capsule.lookAt(capsule.position.add(direction));
            
            let up = new BABYLON.Vector3(capsuleProperty.direction.x, capsuleProperty.direction.y, capsuleProperty.direction.z);
            let forward = BABYLON.Vector3.Cross(up, new BABYLON.Vector3(1, 2, 3).normalize()).normalize();
            let right = BABYLON.Vector3.Cross(up, forward).normalize();

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            capsule.rotationQuaternion = new Quaternion();
            capsule.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            capsule.material = this.materialPool.getMaterialByColor(capsuleProperty.color);

            entityData.properties.set(capsuleProperty.id, capsule);
        }
        else if (property.type == "aabb")
        {
            let aabbProperty = property as RECORDING.IPropertyAABB;

            // #TODO: This should be in a mesh/material pool
            //let aabb = BABYLON.MeshBuilder.CreateBox(aabbProperty.name, {height: aabbProperty.size.x, width: aabbProperty.size.y, depth: aabbProperty.size.z}, this._scene)
            let aabb = this.boxPool.getBox(aabbProperty.size);
            aabb.isPickable = false;
            aabb.id = aabbProperty.id.toString();

            aabb.position.set(aabbProperty.position.x, aabbProperty.position.y, aabbProperty.position.z);

            aabb.material = this.materialPool.getMaterialByColor(aabbProperty.color);

            entityData.properties.set(aabbProperty.id, aabb);
        }
        else if (property.type == "oobb")
        {
            let oobbProperty = property as RECORDING.IPropertyOOBB;

            // #TODO: This should be in a mesh/material pool
            let oobb = this.boxPool.getBox(oobbProperty.size);
            //let oobb = BABYLON.MeshBuilder.CreateBox(oobbProperty.name, {height: oobbProperty.size.y, width: oobbProperty.size.x, depth: oobbProperty.size.z}, this._scene)
            oobb.isPickable = false;
            oobb.id = oobbProperty.id.toString();

            oobb.position.set(oobbProperty.position.x, oobbProperty.position.y, oobbProperty.position.z);
            let up = new BABYLON.Vector3(oobbProperty.up.x, oobbProperty.up.y, oobbProperty.up.z);
            let forward = new BABYLON.Vector3(oobbProperty.forward.x, oobbProperty.forward.y, oobbProperty.forward.z);
            let right = BABYLON.Vector3.Cross(up, forward);

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            oobb.rotationQuaternion = new Quaternion();
            oobb.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            oobb.material = this.materialPool.getMaterialByColor(oobbProperty.color);

            entityData.properties.set(oobbProperty.id, oobb);
        }
        else if (property.type == "plane")
        {
            const planeProperty = property as RECORDING.IPropertyPlane;
            
            let plane = this.planePool.getPlane(planeProperty.normal, planeProperty.length, planeProperty.width);
            plane.isPickable = false;
            plane.id = planeProperty.id.toString();

            plane.position.set(planeProperty.position.x, planeProperty.position.y, planeProperty.position.z);

            let right = new BABYLON.Vector3(planeProperty.up.x, planeProperty.up.y, planeProperty.up.z);
            let forward = new BABYLON.Vector3(planeProperty.normal.x, planeProperty.normal.y, planeProperty.normal.z);
            let up = BABYLON.Vector3.Cross(forward, right);

            let rotationMatrix = new BABYLON.Matrix();
            rotationMatrix.setRow(0, new BABYLON.Vector4(right.x, right.y, right.z, 0));
            rotationMatrix.setRow(1, new BABYLON.Vector4(up.x, up.y, up.z, 0));
            rotationMatrix.setRow(2, new BABYLON.Vector4(forward.x, forward.y, forward.z, 0));
            plane.rotationQuaternion = new Quaternion();
            plane.rotationQuaternion.fromRotationMatrix(rotationMatrix);

            plane.material = this.materialPool.getMaterialByColor(planeProperty.color);

            entityData.properties.set(planeProperty.id, plane);
        }
        else if (property.type == "line")
        {
            let lineProperty = property as RECORDING.IPropertyLine;

            let linePoints = [
                new BABYLON.Vector3(lineProperty.origin.x, lineProperty.origin.y, lineProperty.origin.z),
                new BABYLON.Vector3(lineProperty.destination.x, lineProperty.destination.y, lineProperty.destination.z),
            ];

            let lineColors = [
                new BABYLON.Color4(lineProperty.color.r, lineProperty.color.g, lineProperty.color.b, lineProperty.color.a),
                new BABYLON.Color4(lineProperty.color.r, lineProperty.color.g, lineProperty.color.b, lineProperty.color.a),
            ];

            let lines = BABYLON.MeshBuilder.CreateLines("lines", {points: linePoints, colors: lineColors}, this._scene);
            lines.isPickable = false;
            lines.id = lineProperty.id.toString();

            entityData.properties.set(lineProperty.id, lines);
        }
    }

    createEntity(entity: RECORDING.IEntity) : IEntityData
    {
        let sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 1.0, this._scene);
        sphere.material = this.entityMaterial;
        sphere.isPickable = true;
        sphere.id = entity.id.toString();
        let entityData: IEntityData = { mesh: sphere, properties: new Map<number, BABYLON.Mesh>() };
        this.entities.set(entity.id, entityData);
        return entityData;
    }

    setEntity(entity: RECORDING.IEntity)
    {
        let entityData = this.entities.get(entity.id);
        if (!entityData)
        {
            entityData = this.createEntity(entity);
        }
        
        const postion = RECORDING.NaiveRecordedData.getEntityPosition(entity);
        entityData.mesh.position.set(postion.x, postion.y, postion.z);
        entityData.mesh.setEnabled(true);
    }

    hideAllEntities()
    {
        for (let data of this.entities.values())
        {
            data.mesh.setEnabled(false);
        }
    }

    markEntityAsSelected(id: number)
    {
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.selectedEntity)
            {
                //this.selectedEntity.mesh.material = this.entityMaterial;
                this.selectedEntity.mesh.renderOutline = false;
            }

            //storedMesh.mesh.material = this.selectedMaterial;
            this.selectedEntity = storedMesh;

            this.selectedEntity.mesh.outlineColor = new BABYLON.Color3(1, 0, 0);
            this.selectedEntity.mesh.outlineWidth = 0.2;
            this.selectedEntity.mesh.renderOutline = true;
        }
    }

    onEntityHovered(id: number)
    {
        let storedMesh = this.entities.get(id);
        if (storedMesh)
        {
            // Restore previous entity material
            if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
            {
                this.hoveredEntity.mesh.renderOutline = false;
                //this.hoveredEntity.mesh.material = this.entityMaterial;
            }

            //storedMesh.mesh.material = this.hoveredMaterial;
            this.hoveredEntity = storedMesh;

            this.hoveredEntity.mesh.outlineColor = new BABYLON.Color3(0, 1, 0);
            this.hoveredEntity.mesh.outlineWidth = 0.2;
            this.hoveredEntity.mesh.renderOutline = true;
        }
    }

    onEntityStopHovered()
    {
        // Restore previous entity material
        if (this.hoveredEntity && this.hoveredEntity != this.selectedEntity)
        {
            this.hoveredEntity.mesh.renderOutline = false;
            //this.hoveredEntity.mesh.material = this.entityMaterial;
        }
        this.hoveredEntity = null;
    }

    updateLayerStatus(layer: string, active: boolean)
    {
        this.layerManager.setLayerActive(layer, active);
    }

    initialize(canvas: HTMLCanvasElement) {
        const engine = new BABYLON.Engine(canvas, true, { stencil: true });
        this.createScene(canvas, engine);

        engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener('resize', function () {
            engine.resize();
        });

        this.entities = new Map<number, IEntityData>();
    }

    createScene(canvas: HTMLCanvasElement, engine: BABYLON.Engine) {
        this._canvas = canvas;

        this._engine = engine;

        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new BABYLON.Scene(engine);
        this._scene = scene;

        this.materialPool = new MaterialPool(this._scene);
        this.capsulePool = new CapsulePool(this._scene);
        this.spherePool = new SpherePool(this._scene);
        this.boxPool = new BoxPool(this._scene);
        this.planePool = new PlanePool(this._scene);
        this.layerManager = new LayerManager();
        

        // This creates and positions a free camera (non-mesh)
        //const camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);
        const camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(10, 10, -10), scene);
        camera.inertia = 0;
        camera.speed = 10;
        camera.angularSensibility = 500;

        // Manually add inputs here for WASD
        let keyboardInputs: any = camera.inputs.attached['keyboard'];
        keyboardInputs.keysDown.push(83);
        keyboardInputs.keysUp.push(87);
        keyboardInputs.keysLeft.push(65);
        keyboardInputs.keysRight.push(68);

        // Move forward with mouse wheel
        let zoomCallback = function(evt: WheelEvent) {
            const delta = Math.max(-1, Math.min(1,(evt.deltaY)));
            camera.position = BABYLON.Vector3.Lerp(camera.position, camera.getFrontPosition(-delta), 0.5);
        }

        canvas.addEventListener("wheel", zoomCallback, false);

        // This targets the camera to scene origin
        camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Grid
        var grid = BABYLON.Mesh.CreatePlane("plane", 100.0, scene);
        grid.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
        grid.isPickable = false;

        var groundMaterial = new GridMaterial("groundMaterial", scene);
        groundMaterial.majorUnitFrequency = 5;
        groundMaterial.minorUnitVisibility = 0.45;
        groundMaterial.gridRatio = 1;
        groundMaterial.backFaceCulling = false;
        groundMaterial.mainColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        groundMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        groundMaterial.opacity = 0.5;

        grid.material = groundMaterial;

        this.entityMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.entityMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.entityMaterial.alpha = 0.0;

        this.selectedMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.selectedMaterial.diffuseColor = new BABYLON.Color3(1, 1, 0);
        this.selectedMaterial.alpha = 0.8;

        this.hoveredMaterial = new BABYLON.StandardMaterial("entityMaterial", scene);
        this.hoveredMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
        this.hoveredMaterial.alpha = 0.8;

        // Mouse picking
        // We need this to let the system select invisible meshes
        scene.pointerDownPredicate = function(mesh) {
            return mesh.isPickable;
        }

        scene.pointerMovePredicate = function(mesh) {
            return mesh.isPickable;
        }

        let control = this;
        //When pointer down event is raised
        scene.onPointerDown = function (evt, pickResult) {
            // if the click hits the ground object, we change the impact position
            if (pickResult.hit) {
                control.onEntitySelected(parseInt(pickResult.pickedMesh.id));
            }
        };

        scene.onPointerMove = function (evt, pickInfo) {
            if (pickInfo.hit) {
                if (!control.selectedEntity || control.selectedEntity.mesh.id != pickInfo.pickedMesh.id) {
                    control.onEntityHovered(parseInt(pickInfo.pickedMesh.id));
                }
                canvas.style.cursor = "pointer";
            }
            else {
                if (control.selectedEntity != control.hoveredEntity)
                {
                    control.onEntityStopHovered();
                }
            }
        };

        //Creation of a box
        //(name of the box, size, scene)
        /*var box = BABYLON.Mesh.CreateBox("box", 6.0, scene);

        //Creation of a sphere 
        //(name of the sphere, segments, diameter, scene) 
        var sphere = BABYLON.Mesh.CreateSphere("sphere", 10.0, 10.0, scene);

        //Creation of a plan
        //(name of the plane, size, scene)
        var plan = BABYLON.Mesh.CreatePlane("plane", 10.0, scene);

        //Creation of a cylinder
        //(name, height, diameter, tessellation, scene, updatable)
        var cylinder = BABYLON.Mesh.CreateCylinder("cylinder", 3, 3, 3, 6, 1, scene, false);

        // Creation of a torus
        // (name, diameter, thickness, tessellation, scene, updatable)
        var torus = BABYLON.Mesh.CreateTorus("torus", 5, 1, 10, scene, false);

        // Creation of a knot
        // (name, radius, tube, radialSegments, tubularSegments, p, q, scene, updatable)
        var knot = BABYLON.Mesh.CreateTorusKnot("knot", 2, 0.5, 128, 64, 2, 3, scene);

        // Creation of a lines mesh
        var lines = BABYLON.Mesh.CreateLines("lines", [
            new BABYLON.Vector3(-10, 0, 0),
            new BABYLON.Vector3(10, 0, 0),
            new BABYLON.Vector3(0, 0, -10),
            new BABYLON.Vector3(0, 0, 10)
        ], scene);

        // Creation of a ribbon
        // let's first create many paths along a maths exponential function as an example 
        var exponentialPath = function (p : number) {
            var path = [];
            for (var i = -10; i < 10; i++) {
                path.push(new BABYLON.Vector3(p, i, Math.sin(p / 3) * 5 * Math.exp(-(i - p) * (i - p) / 60) + i / 3));
            }
            return path;
        };
        // let's populate arrayOfPaths with all these different paths
        var arrayOfPaths = [];
        for (var p = 0; p < 20; p++) {
            arrayOfPaths[p] = exponentialPath(p);
        }

        // (name, array of paths, closeArray, closePath, offset, scene)
        var ribbon = BABYLON.Mesh.CreateRibbon("ribbon", arrayOfPaths, false, false, 0, scene);

        // Moving elements
        box.position = new BABYLON.Vector3(-10, 0, 0);   // Using a vector
        sphere.position = new BABYLON.Vector3(0, 10, 0); // Using a vector
        plan.position.z = 10;                            // Using a single coordinate component
        cylinder.position.z = -10;
        torus.position.x = 10;
        knot.position.y = -10;
        ribbon.position = new BABYLON.Vector3(-10, -10, 20);*/
    }
} 