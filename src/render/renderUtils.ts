import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';

interface IVec3
{
    x: number;
    y: number;
    z: number;
}

export function isPropertyShape(property: RECORDING.IProperty)
{
    return property.type == "sphere" || 
        property.type == "line"||
        property.type == "plane" ||
        property.type == "aabb" ||
        property.type == "oobb" ||
        property.type == "capsule" ||
        property.type == "mesh";
}

export function createVec3(vec3: IVec3) : BABYLON.Vector3
{
    return new BABYLON.Vector3(vec3.x, vec3.y, vec3.z);
}

export function createVec4(vec3: IVec3) : BABYLON.Vector4
{
    return new BABYLON.Vector4(vec3.x, vec3.y, vec3.z, 0);
}

export function setShapeOrientation(mesh: BABYLON.Mesh, up: BABYLON.Vector3, forward: BABYLON.Vector3, right: BABYLON.Vector3)
{
    let rotationMatrix = new BABYLON.Matrix();
    rotationMatrix.setRow(0, createVec4(right));
    rotationMatrix.setRow(1, createVec4(up));
    rotationMatrix.setRow(2, createVec4(forward));
    mesh.rotationQuaternion = new BABYLON.Quaternion();
    mesh.rotationQuaternion.fromRotationMatrix(rotationMatrix);
}

export function setShapeOrientationFromDirection(mesh: BABYLON.Mesh, direction: BABYLON.Vector3)
{
    const forward = BABYLON.Vector3.Cross(direction, new BABYLON.Vector3(1, 2, 3).normalize()).normalize();
    const right = BABYLON.Vector3.Cross(direction, forward).normalize();
    setShapeOrientation(mesh, direction, forward, right);
}

export function setShapeOrientationFromUpAndFwd(mesh: BABYLON.Mesh, up: BABYLON.Vector3, forward: BABYLON.Vector3)
{
    const right = BABYLON.Vector3.Cross(up, forward);
    setShapeOrientation(mesh, up, forward, right);
}