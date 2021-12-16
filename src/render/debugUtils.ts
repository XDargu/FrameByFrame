import * as BABYLON from 'babylonjs';
import RenderPools from './renderPools';

export function createDebugData(scene: BABYLON.Scene, engine: BABYLON.Engine, pools: RenderPools) {
    let materialClasses = new Map<string, number>();
    scene.materials.forEach((material) => {
        let entry = materialClasses.get(material.getClassName());
        if (entry) {
            materialClasses.set(material.getClassName(), entry + 1);
        }
        else {
            materialClasses.set(material.getClassName(), 1);
        }
    });
    let detailsMaterials = '';
    materialClasses.forEach((count, name) => {
        detailsMaterials += `${name}: ${count}\n\n`;
    });
    
    return `
        FPS: ${engine.getFps().toFixed(2)}\n
        Material Pool size: ${pools.materialPool.getPoolSize()}\n
        ${detailsMaterials}Total materials: ${scene.materials.length}\n
        Box Pool size: ${pools.boxPool.getTotalMeshes()}\n
        Sphere Pool size: ${pools.spherePool.getTotalMeshes()}\n
        Capsule Pool size: ${pools.capsulePool.getTotalMeshes()}\n
        Line Pool size: ${pools.linePool.getTotalMeshes()}\n
        Plane Pool size: ${pools.planePool.getTotalMeshes()}\n
        Total pooled meshes: ${pools.getTotalPooledMeshes()}\n
        Total meshes: ${scene.meshes.length}\n
    `;
}