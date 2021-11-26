import * as BABYLON from 'babylonjs';

export class ArrowGizmo extends BABYLON.Gizmo
{
    private _coloredMaterial: BABYLON.StandardMaterial;
    private _gizmoMesh: BABYLON.Mesh;
    
    constructor(gizmoLayer: BABYLON.UtilityLayerRenderer = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer, axis: BABYLON.Vector3, color: BABYLON.Color3 = BABYLON.Color3.Gray(), thickness: number = 1) {
        super(gizmoLayer);

        // Create Material
        this._coloredMaterial = new BABYLON.StandardMaterial("", gizmoLayer.utilityLayerScene);
        this._coloredMaterial.diffuseColor = color;
        this._coloredMaterial.specularColor = color.subtract(new BABYLON.Color3(0.1, 0.1, 0.1));

        // Build Mesh + Collider
        const arrow = ArrowGizmo._CreateArrow(gizmoLayer.utilityLayerScene, this._coloredMaterial, thickness);
        const collider = ArrowGizmo._CreateArrow(gizmoLayer.utilityLayerScene, this._coloredMaterial, thickness + 4, true);

        // Add to Root Node
        this._gizmoMesh = new BABYLON.Mesh("", gizmoLayer.utilityLayerScene);
        this._gizmoMesh.addChild((arrow as BABYLON.Mesh));
        this._gizmoMesh.addChild((collider as BABYLON.Mesh));

        this._gizmoMesh.lookAt(this._rootMesh.position.add(axis));
        this._gizmoMesh.scaling.scaleInPlace(1 / 3);
        this._gizmoMesh.parent = this._rootMesh;

        var light = gizmoLayer._getSharedGizmoLight();
        light.includedOnlyMeshes = light.includedOnlyMeshes.concat(this._rootMesh.getChildMeshes(false));
    }

    public static _CreateArrow(scene: BABYLON.Scene, material: BABYLON.StandardMaterial, thickness: number = 1, isCollider = false): BABYLON.TransformNode {
        const arrow = new BABYLON.TransformNode("arrow", scene);
        let cylinder = BABYLON.CylinderBuilder.CreateCylinder("cylinder", { diameterTop: 0, height: 0.075, diameterBottom: 0.0375 * (1 + (thickness - 1) / 4), tessellation: 96 }, scene);
        let line = BABYLON.CylinderBuilder.CreateCylinder("cylinder", { diameterTop: 0.005 * thickness, height: 0.275, diameterBottom: 0.005 * thickness, tessellation: 96 }, scene);

        // Position arrow pointing in its drag axis
        cylinder.parent = arrow;
        cylinder.material = material;
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.z += 0.3;

        line.parent = arrow;
        line.material = material;
        line.position.z += 0.275 / 2;
        line.rotation.x = Math.PI / 2;

        if (isCollider) {
            line.visibility = 0;
            cylinder.visibility = 0;
        }
        return arrow;
    }

    public setAxis(axis: BABYLON.Vector3) {
        this._gizmoMesh.lookAt(axis);
    }

    public dispose() {
        if (this._gizmoMesh) {
            this._gizmoMesh.dispose();
        }
        this._coloredMaterial.dispose();
        super.dispose();
    }
}

export class AxisGizmo extends BABYLON.Gizmo
{
    private xGizmo: ArrowGizmo;
    private yGizmo: ArrowGizmo;
    private zGizmo: ArrowGizmo;
    private beforeRenderObserver: BABYLON.Observer<BABYLON.Scene>;
    
    constructor(gizmoLayer: BABYLON.UtilityLayerRenderer = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer, thickness: number = 1) {
        super(gizmoLayer);

        this.xGizmo = new ArrowGizmo(gizmoLayer, new BABYLON.Vector3(1, 0, 0), BABYLON.Color3.Red().scale(0.5), thickness);
        this.yGizmo = new ArrowGizmo(gizmoLayer, new BABYLON.Vector3(0, 1, 0), BABYLON.Color3.Green().scale(0.5), thickness);
        this.zGizmo = new ArrowGizmo(gizmoLayer, new BABYLON.Vector3(0, 0, 1), BABYLON.Color3.Blue().scale(0.5), thickness);

        this.beforeRenderObserver = this.gizmoLayer.utilityLayerScene.onBeforeRenderObservable.add(() => {
            /*if (this.xGizmo.attachedMesh) {
                this.xGizmo.setAxis(this.xGizmo.attachedMesh.forward);
            }
            if (this.yGizmo.attachedMesh) {
                this.yGizmo.setAxis(this.yGizmo.attachedMesh.up);
            }
            if (this.zGizmo.attachedMesh) {
                this.zGizmo.setAxis(this.zGizmo.attachedMesh.right);
            }*/
        });
    }

    public attachToMesh(mesh: BABYLON.Mesh) {
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            gizmo.attachedMesh = mesh;
        });
    }

    public dispose() {
        [this.xGizmo, this.yGizmo, this.zGizmo].forEach((gizmo) => {
            gizmo.dispose();
        });
        if (this.beforeRenderObserver) {
            this.gizmoLayer.utilityLayerScene.onBeforeRenderObservable.remove(this.beforeRenderObserver);
        }
        super.dispose();
    }
}