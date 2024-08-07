import * as BABYLON from 'babylonjs';
import RenderPools from './renderPools';
import * as Utils from '../utils/utils'

const electron = require('electron') 

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

    const heapStats = process.getHeapStatistics();
    
    return `
        FPS: ${engine.getFps().toFixed(2)}\n
        Material Pool size: ${pools.materialPool.getPoolSize()}\n
        ${detailsMaterials}Total materials: ${scene.materials.length}\n
        Box Pool size: ${pools.boxPool.getTotalMeshes()}\n
        Sphere Pool size: ${pools.spherePool.getTotalMeshes()}\n
        Capsule Pool size: ${pools.capsulePool.getTotalMeshes()}\n
        Line Pool size: ${pools.linePool.getTotalMeshes()}\n
        Arrow Pool size: ${pools.arrowPool.getTotalMeshes()}\n
        Plane Pool size: ${pools.planePool.getTotalMeshes()}\n
        Total pooled meshes: ${pools.getTotalPooledMeshes()}\n
        Total meshes: ${scene.meshes.length}\n
        Malloced memory: ${Utils.memoryToString(heapStats.mallocedMemory * 1000)}\n
        Heap size limit: ${Utils.memoryToString(heapStats.heapSizeLimit * 1000)}\n
        Heap total size: ${Utils.memoryToString(heapStats.totalHeapSize * 1000)}\n
        Used heap size: ${Utils.memoryToString(heapStats.usedHeapSize * 1000)}\n
    `;
}