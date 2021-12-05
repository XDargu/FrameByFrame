import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import * as RenderUtils from '../render/renderUtils';
import RenderPools from './renderPools';

export function setShapeCommonData(mesh: BABYLON.Mesh, propertyId: number, position: RECORDING.IVec3, color: RECORDING.IColor, pools: RenderPools)
{
    mesh.id = propertyId.toString();
    mesh.material = pools.materialPool.getMaterialByColor(color);
    mesh.position.set(position.x, position.y, position.z);
}

export function buildSphereShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const sphereProperty = shape as RECORDING.IPropertySphere;

    let sphere = pools.spherePool.getSphere(sphereProperty.radius);
    setShapeCommonData(sphere, sphereProperty.id, sphereProperty.position, sphereProperty.color, pools);

    return sphere;
}

export function buildCapsuleShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const capsuleProperty = shape as RECORDING.IPropertyCapsule;

    let capsule = pools.capsulePool.getCapsule(capsuleProperty.height, capsuleProperty.radius);
    setShapeCommonData(capsule, capsuleProperty.id, capsuleProperty.position, capsuleProperty.color, pools);
    RenderUtils.setShapeOrientationFromDirection(capsule, RenderUtils.createVec3(capsuleProperty.direction));

    return capsule;
}

export function buildAABBShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const aabbProperty = shape as RECORDING.IPropertyAABB;

    let aabb = pools.boxPool.getBox(aabbProperty.size);
    setShapeCommonData(aabb, aabbProperty.id, aabbProperty.position, aabbProperty.color, pools);

    return aabb;
}

export function buildOOBBShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const oobbProperty = shape as RECORDING.IPropertyOOBB;

    let oobb = pools.boxPool.getBox(oobbProperty.size);
    setShapeCommonData(oobb, oobbProperty.id, oobbProperty.position, oobbProperty.color, pools);
    RenderUtils.setShapeOrientationFromUpAndFwd(oobb, RenderUtils.createVec3(oobbProperty.up), RenderUtils.createVec3(oobbProperty.forward));

    return oobb;
}

export function buildPlaneShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const planeProperty = shape as RECORDING.IPropertyPlane;
        
    let plane = pools.planePool.getPlane(planeProperty.normal, planeProperty.length, planeProperty.width);
    setShapeCommonData(plane, planeProperty.id, planeProperty.position, planeProperty.color, pools);
    RenderUtils.setShapeOrientationFromUpAndFwd(plane, RenderUtils.createVec3(planeProperty.up), RenderUtils.createVec3(planeProperty.normal));

    return plane;
}

export function buildLinesShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const lineProperty = shape as RECORDING.IPropertyLine;

    let lines = pools.linePool.getLine(lineProperty.origin, lineProperty.destination, lineProperty.color);

    lines.isPickable = false;
    lines.id = lineProperty.id.toString();

    return lines;
}

export function buildMeshShape(shape: RECORDING.IProperyShape, pools: RenderPools) : BABYLON.Mesh
{
    const meshProperty = shape as RECORDING.IPropertyMesh;

    let customMesh = new BABYLON.Mesh("custom", pools.scene);

    customMesh.isPickable = true;
    customMesh.id = meshProperty.id.toString();

    let vertexData = new BABYLON.VertexData();
    let normals: any[] = [];
    BABYLON.VertexData.ComputeNormals(meshProperty.vertices, meshProperty.indices, normals, {
        useRightHandedSystem: false
    });

    vertexData.positions = meshProperty.vertices;
    vertexData.indices = meshProperty.indices;
    vertexData.normals = normals;

    vertexData.applyToMesh(customMesh);

    customMesh.material = pools.materialPool.getMaterialByColor(meshProperty.color);

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