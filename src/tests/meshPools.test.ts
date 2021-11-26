import { expect } from 'chai';
import * as BABYLON from 'babylonjs';
import { SpherePool } from '../render/meshPools';

describe('MeshPool', () => {

    var engine = new BABYLON.NullEngine();
    var scene: BABYLON.Scene;
    var pool: SpherePool;

    beforeEach(function() {
        scene = new BABYLON.Scene(engine);
        pool = new SpherePool(scene);
    });

    it('contains only one hashed value when adding two equal inputs', () => {

        let sphere = pool.getSphere(0.5);
        let otherSphere = pool.getSphere(0.5);
        expect(pool.getHashedMeshes()).to.equal(1);
    });

    it('contains two total meshes when adding two equal inputs', () => {

        let sphere = pool.getSphere(0.5);
        let otherSphere = pool.getSphere(0.5);
        expect(pool.getTotalMeshes()).to.equal(2);
    });

    it('reuses a mesh when freeing', () => {

        let sphere = pool.getSphere(0.5);
        pool.freeMesh(sphere);
        let otherSphere = pool.getSphere(0.5);
        expect(pool.getHashedMeshes()).to.equal(1);
        expect(pool.getTotalMeshes()).to.equal(1);
        expect(sphere.uniqueId).to.equal(otherSphere.uniqueId);
    });

    it('reuses a mesh when freeing', () => {

        let sphere = pool.getSphere(0.5);
        pool.freeMesh(sphere);
        let otherSphere = pool.getSphere(0.5);
        expect(pool.getHashedMeshes()).to.equal(1);
        expect(pool.getTotalMeshes()).to.equal(1);
        expect(sphere.uniqueId).to.equal(otherSphere.uniqueId);
    });
});