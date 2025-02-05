import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import * as RenderUtils from '../render/renderUtils';
import RenderPools from './renderPools';

function setShapeMaterial(mesh: BABYLON.Mesh, color: RECORDING.IColor, texture: string, pools: RenderPools)
{
    if (texture == undefined || texture == "")
        mesh.material = pools.materialPool.getMaterialByColor(color);
    else
        mesh.material = pools.materialPool.getMaterialByTexture(texture, color);
}

function setShapeCommonData(mesh: BABYLON.Mesh, propertyId: number, position: RECORDING.IVec3, color: RECORDING.IColor, texture: string, pools: RenderPools)
{
    mesh.id = propertyId.toString();
    mesh.position.set(position.x, position.y, position.z);
    
    setShapeMaterial(mesh, color, texture, pools);
}

export function buildSphereShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const sphereProperty = shape as RECORDING.IPropertySphere;

    let sphere = pools.spherePool.getSphere(sphereProperty.radius);
    setShapeCommonData(sphere, sphereProperty.id, RenderUtils.createVec3(sphereProperty.position, system), sphereProperty.color, sphereProperty.texture, pools);

    return sphere;
}

export function buildCapsuleShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const capsuleProperty = shape as RECORDING.IPropertyCapsule;

    let capsule = pools.capsulePool.getCapsule(capsuleProperty.height, capsuleProperty.radius);
    setShapeCommonData(capsule, capsuleProperty.id, RenderUtils.createVec3(capsuleProperty.position, system), capsuleProperty.color, capsuleProperty.texture, pools);
    RenderUtils.setShapeOrientationFromDirection(capsule, RenderUtils.createVec3(capsuleProperty.direction, system), system);

    return capsule;
}

export function buildCylinderShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const cylinderProperty = shape as RECORDING.IPropertyCylinder;

    let cylinder = pools.cylinderPool.getCylinder(cylinderProperty.height, cylinderProperty.radius);
    setShapeCommonData(cylinder, cylinderProperty.id, RenderUtils.createVec3(cylinderProperty.position, system), cylinderProperty.color, cylinderProperty.texture, pools);
    RenderUtils.setShapeOrientationFromDirection(cylinder, RenderUtils.createVec3(cylinderProperty.direction, system), system);

    return cylinder;
}

export function buildAABBShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const aabbProperty = shape as RECORDING.IPropertyAABB;

    let aabb = pools.boxPool.getBox(RenderUtils.createVec3(aabbProperty.size, system));
    setShapeCommonData(aabb, aabbProperty.id, RenderUtils.createVec3(aabbProperty.position, system), aabbProperty.color, aabbProperty.texture, pools);

    return aabb;
}

export function buildOOBBShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const oobbProperty = shape as RECORDING.IPropertyOOBB;

    let oobb = pools.boxPool.getBox(RenderUtils.createVec3(oobbProperty.size, system));
    setShapeCommonData(oobb, oobbProperty.id, RenderUtils.createVec3(oobbProperty.position, system), oobbProperty.color, oobbProperty.texture, pools);
    RenderUtils.setShapeOrientationFromUpAndFwd(oobb, RenderUtils.createVec3(oobbProperty.up, system), RenderUtils.createVec3(oobbProperty.forward, system), system);

    return oobb;
}

export function buildPlaneShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const planeProperty = shape as RECORDING.IPropertyPlane;
        
    let plane = pools.planePool.getPlane(RenderUtils.createVec3(planeProperty.normal, system), planeProperty.length, planeProperty.width);
    setShapeCommonData(plane, planeProperty.id, RenderUtils.createVec3(planeProperty.position, system), planeProperty.color, planeProperty.texture, pools);
    RenderUtils.setShapeOrientationFromUpAndFwd(plane, RenderUtils.createVec3(planeProperty.up, system), RenderUtils.createVec3(planeProperty.normal, system), system);

    return plane;
}

export function buildLinesShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const lineProperty = shape as RECORDING.IPropertyLine;

    let lines = pools.linePool.getLine(RenderUtils.createVec3(lineProperty.origin, system), RenderUtils.createVec3(lineProperty.destination, system), lineProperty.color);

    lines.isPickable = false;
    lines.id = lineProperty.id.toString();

    return lines;
}

export function buildArrowShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const arrowProperty = shape as RECORDING.IPropertyArrow;

    let lines = pools.arrowPool.getArrow(RenderUtils.createVec3(arrowProperty.origin, system), RenderUtils.createVec3(arrowProperty.destination, system), arrowProperty.color);

    lines.isPickable = false;
    lines.id = arrowProperty.id.toString();

    return lines;
}

export function buildVectorwShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const vectorProperty = shape as RECORDING.IPropertyVector;

    let lines = pools.arrowPool.getArrow(
        pivotPos,
        RenderUtils.createVec3(vectorProperty.vector, system).addInPlace(pivotPos),
        vectorProperty.color
    );

    lines.isPickable = false;
    lines.id = vectorProperty.id.toString();

    return lines;
}

export function buildMeshShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const meshProperty = shape as RECORDING.IPropertyMesh;

    let customMesh = new BABYLON.Mesh("custom", pools.scene);
    customMesh.isPickable = true;
    customMesh.id = meshProperty.id.toString();

    let vertices = meshProperty.vertices;
    let indices = meshProperty.indices;

    if (system == RECORDING.ECoordinateSystem.RightHand)
    {
        vertices = [];

        for (let i=0; i<meshProperty.vertices.length / 3; ++i)
        {
            const idx = i * 3;
            vertices.push(meshProperty.vertices[idx]);
            vertices.push(meshProperty.vertices[idx + 2]);
            vertices.push(meshProperty.vertices[idx + 1]);
        }
    }

    if(indices.length == 0)
    {
        for(let i=0; i<vertices.length / 3; ++i)
        {
            indices.push(i);
        }
    }
    
    let vertexData = new BABYLON.VertexData();
    let normals: any[] = [];
    BABYLON.VertexData.ComputeNormals(vertices, indices, normals, {
        useRightHandedSystem: false
    });

    vertexData.positions = vertices;
    vertexData.indices = indices;
    vertexData.normals = normals;

    vertexData.applyToMesh(customMesh);

    setShapeMaterial(customMesh, meshProperty.color, meshProperty.texture, pools);

    if (meshProperty.wireframe == true)
    {
        let wireframeMesh = new BABYLON.Mesh("customwire", pools.scene);
        vertexData.applyToMesh(wireframeMesh);
        wireframeMesh.material = pools.materialPool.getMaterialByColor({r: 0, g: 0, b: 0, a: 1});
        wireframeMesh.material.wireframe = true;
        wireframeMesh.parent = customMesh;
    }

    return customMesh;
}

export function buildPathShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const pathProperty = shape as RECORDING.IPropertyPath;

    const points = pathProperty.points.map((point) => { return RenderUtils.createVec3(point, system); });
    let lines = pools.pathPool.getPath(
        points,
        pathProperty.color
    );

    lines.isPickable = false;
    lines.id = pathProperty.id.toString();

    return lines;
}

export function buildTriangleShape(shape: RECORDING.IProperyShape, pools: RenderPools, pivotPos: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : BABYLON.Mesh
{
    const triangleProperty = shape as RECORDING.IPropertyTriangle;

    let customMesh = new BABYLON.Mesh("custom", pools.scene);
    customMesh.isPickable = true;
    customMesh.id = triangleProperty.id.toString();

    let vertices = [
        RenderUtils.createVec3(triangleProperty.p1, system).x,
        RenderUtils.createVec3(triangleProperty.p1, system).y,
        RenderUtils.createVec3(triangleProperty.p1, system).z,
        RenderUtils.createVec3(triangleProperty.p2, system).x,
        RenderUtils.createVec3(triangleProperty.p2, system).y,
        RenderUtils.createVec3(triangleProperty.p2, system).z,
        RenderUtils.createVec3(triangleProperty.p3, system).x,
        RenderUtils.createVec3(triangleProperty.p3, system).y,
        RenderUtils.createVec3(triangleProperty.p3, system).z
    ];
    let indices = [0, 1, 2];

    let vertexData = new BABYLON.VertexData();
    let normals: any[] = [];
    BABYLON.VertexData.ComputeNormals(vertices, indices, normals, {
        useRightHandedSystem: false
    });

    vertexData.positions = vertices;
    vertexData.indices = indices;
    vertexData.normals = normals;

    vertexData.applyToMesh(customMesh);

    setShapeMaterial(customMesh, triangleProperty.color, triangleProperty.texture, pools);

    return customMesh;
}