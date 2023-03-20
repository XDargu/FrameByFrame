import * as BABYLON from 'babylonjs';
import * as RECORDING from '../recording/RecordingData';
import * as Utils from '../utils/utils';
import { IEntityRenderData } from './commonTypes';

interface IVec3
{
    x: number;
    y: number;
    z: number;
}

export function getRadiusOfEntity(entity: IEntityRenderData)
{
    return 6; // TODO: Maybe take into account the bounding box of the selected entity
}

export function getBoundingBoxOfEntity(entity: IEntityRenderData) : BABYLON.BoundingInfo
{
    let boundingInfo = entity.mesh.getBoundingInfo();
    let min = boundingInfo.boundingBox.minimumWorld;
    let max = boundingInfo.boundingBox.maximumWorld;

    for (let child of entity.properties.values())
    {
        if (child.name !== "line" && child.name !== "arrow")
        {
            boundingInfo = child.getBoundingInfo();
            min = BABYLON.Vector3.Minimize(min, boundingInfo.boundingBox.minimumWorld);
            max = BABYLON.Vector3.Maximize(max, boundingInfo.boundingBox.maximumWorld);
        }
    }

    return new BABYLON.BoundingInfo(min, max);
}

export function createColor4Rec(color: RECORDING.IColor) : BABYLON.Color4
{
    return new BABYLON.Color4(color.r, color.g, color.b, color.a);
}

export function createColor4(color: Utils.RGBColor01) : BABYLON.Color4
{
    return new BABYLON.Color4(color.r, color.g, color.b, 1);
}

export function createVec3Raw(vec3: IVec3) : BABYLON.Vector3
{
    return new BABYLON.Vector3(vec3.x, vec3.y, vec3.z);
}

export function createVec3(vec3: IVec3, system: RECORDING.ECoordinateSystem) : BABYLON.Vector3
{
    switch(system)
    {
        case RECORDING.ECoordinateSystem.LeftHand: return new BABYLON.Vector3(vec3.x, vec3.y, vec3.z);
        case RECORDING.ECoordinateSystem.RightHand: return new BABYLON.Vector3(vec3.x, vec3.z, vec3.y);
        default: return new BABYLON.Vector3(vec3.x, vec3.y, vec3.z);
    }
}

export function BabylonToVec3(vec3: BABYLON.Vector3, system: RECORDING.ECoordinateSystem) : IVec3
{
    switch(system)
    {
        case RECORDING.ECoordinateSystem.LeftHand: return { x: vec3.x, y: vec3.y, z: vec3.z };
        case RECORDING.ECoordinateSystem.RightHand: return { x: vec3.x, y: vec3.z, z: vec3.y };
        default: return { x: vec3.x, y: vec3.y, z: vec3.z };
    }
}

export function createVec4(vec3: IVec3) : BABYLON.Vector4
{
    return new BABYLON.Vector4(vec3.x, vec3.y, vec3.z, 0);
}

export function setShapeOrientation(mesh: BABYLON.Mesh, up: BABYLON.Vector3, forward: BABYLON.Vector3, right: BABYLON.Vector3, system: RECORDING.ECoordinateSystem)
{
    let rotationMatrix = new BABYLON.Matrix();
    rotationMatrix.setRow(0, createVec4(right));
    rotationMatrix.setRow(1, createVec4(up));
    rotationMatrix.setRow(2, createVec4(forward));
    mesh.rotationQuaternion = new BABYLON.Quaternion();
    mesh.rotationQuaternion.fromRotationMatrix(rotationMatrix);
}

export function setShapeOrientationFromDirection(mesh: BABYLON.Mesh, direction: BABYLON.Vector3, system: RECORDING.ECoordinateSystem)
{
    const forward = BABYLON.Vector3.Cross(direction, new BABYLON.Vector3(1, 2, 3).normalize()).normalize();
    const right = BABYLON.Vector3.Cross(direction, forward).normalize();
    setShapeOrientation(mesh, direction, forward, right, system);
}

export function setShapeOrientationFromUpAndFwd(mesh: BABYLON.Mesh, up: BABYLON.Vector3, forward: BABYLON.Vector3, system: RECORDING.ECoordinateSystem)
{
    const right = BABYLON.Vector3.Cross(up, forward);
    setShapeOrientation(mesh, up, forward, right, system);
}

export function getCameraPositionForTarget(camera: BABYLON.Camera, targetPosition: BABYLON.Vector3, radius: number)
{
    let meshToCamera = camera.position.subtract(targetPosition);
    meshToCamera.y = Math.max(0, meshToCamera.y);
    meshToCamera.normalize();
    let targetPos = targetPosition.add(meshToCamera.scale(radius));
    const distMeshToTarget = targetPos.subtract(targetPosition).length();
    targetPos.y = targetPosition.y + distMeshToTarget * 0.3;

    return targetPos;
}