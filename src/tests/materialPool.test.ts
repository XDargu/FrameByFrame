import { expect } from 'chai';
import * as BABYLON from 'babylonjs';
import { MaterialPool } from '../render/materialPool';

describe('MaterialPool', () => {

    var engine = new BABYLON.NullEngine();
    var scene: BABYLON.Scene;
    var pool: MaterialPool;

    beforeEach(function() {
        scene = new BABYLON.Scene(engine);
        pool = new MaterialPool(scene);
    });

    it('creates only one material when inputs are the same', () => {

        let material = pool.getMaterial(1, 0.4, 0.7, 0.6);
        let otherMaterial = pool.getMaterial(1, 0.4, 0.7, 0.6);
        expect(pool.getPoolSize()).to.equal(1);
    });

    it('returns the same material with the same inputs', () => {

        let material = pool.getMaterial(1, 0.4, 0.7, 0.6);
        let otherMaterial = pool.getMaterial(1, 0.4, 0.7, 0.6);
        expect(material.diffuseColor.r).to.equal(otherMaterial.diffuseColor.r);
        expect(material.diffuseColor.g).to.equal(otherMaterial.diffuseColor.g);
        expect(material.diffuseColor.b).to.equal(otherMaterial.diffuseColor.b);
        expect(material.alpha).to.equal(otherMaterial.alpha);
        expect(material.id).to.equal(otherMaterial.id);
    });

    it('creates two materials with two sets of inputs', () => {

        let material = pool.getMaterial(1, 0.4, 0.7, 0.6);
        let otherMaterial = pool.getMaterial(0.8, 0.4, 0.7, 0.6);
        expect(pool.getPoolSize()).to.equal(2);
    });
});