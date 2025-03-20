import * as BABYLON from 'babylonjs';
import * as RenderUtils from '../render/renderUtils';
import * as Utils from '../utils/utils';
import { IEntityRenderData } from './commonTypes';

interface ISceneKeyboardFunctions
{
    [type: string] : () => void;
}

interface ICameraMatrixChangedCallback
{
    (position: BABYLON.Vector3, up: BABYLON.Vector3, forward: BABYLON.Vector3) : void;
}

interface ICameraSpeedChangedCallback
{
    (speed: number) : void
}

export default class CameraControl
{
    private _camera: BABYLON.UniversalCamera;
    private selectedEntity: IEntityRenderData;
    private isFollowingEntity: boolean = false;
    private cameraMinSpeed: number = 5;
    private isCtrlDown: boolean = false;
    private isOrthographic: boolean = false;

    initialize(scene: BABYLON.Scene, canvas: HTMLCanvasElement, cameraChangeCallback: ICameraMatrixChangedCallback, onCameraSpeedChanged: ICameraSpeedChangedCallback)
    {
        // This creates and positions a free camera (non-mesh)
        //const camera = new BABYLON.ArcRotateCamera("Camera", 3 * Math.PI / 2, Math.PI / 8, 50, BABYLON.Vector3.Zero(), scene);
        this._camera = new BABYLON.UniversalCamera("UniversalCamera", new BABYLON.Vector3(10, 10, -10), scene);
        this._camera.inertia = 0;
        this._camera.speed = this.cameraMinSpeed;
        this._camera.angularSensibility = 500;
        this._camera.minZ = 0.1;

        this.set2DMode(false);

        const keyControlsUp : ISceneKeyboardFunctions = {
            "Shift": () => { this._camera.speed = this.calcSpeed(this.cameraMinSpeed); },
            "Control": () => { this.isCtrlDown = false; },
        }

        const keyControlsDown : ISceneKeyboardFunctions = {
            "Shift": () => { this._camera.speed = this.calcSpeed(this.cameraMinSpeed * 3); },
            "Control": () => { this.isCtrlDown = true; },
        }

        scene.onKeyboardObservable.add((kbInfo) =>
        {
            switch(kbInfo.type)
            {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    {
                        const func = keyControlsDown[kbInfo.event.key];
                        if (func) { func(); }
                    }
                    break;
                case BABYLON.KeyboardEventTypes.KEYUP:
                    {
                        console.log(keyControlsUp[kbInfo.event.key]);
                        const func = keyControlsUp[kbInfo.event.key];
                        if (func) { func(); }
                    }
                    break;
            }
        });

        // Move forward with mouse wheel
        let zoomCallback = (evt: WheelEvent) =>
        {
            const delta = Utils.clamp(evt.deltaY, -1, 1);

            if (this.isCtrlDown)
            {
                this.setBaseSpeed(Utils.clamp(this.cameraMinSpeed - delta, 0.1, 15));
                onCameraSpeedChanged(this.cameraMinSpeed);
            }
            else
            {
                if (this.isOrthographic)
                {
                    const increment = delta * Math.pow(this._camera.orthoTop, 1.2) * 0.1;
                    const orthoSize = Utils.clamp(this._camera.orthoTop + increment, 0.1, 50);
                    this.updateOrthoSize(orthoSize);

                    // Update speed
                    this.setBaseSpeed(this.cameraMinSpeed);
                }
                else
                {
                    this._camera.position = BABYLON.Vector3.Lerp(this._camera.position, this._camera.getFrontPosition(-delta), 0.5);
                }
            }
        }

        let inputCallback = () => { this.stopFollowEntity(); };

        canvas.addEventListener("wheel", zoomCallback, false);

        canvas.addEventListener("keydown", inputCallback, false);
        canvas.addEventListener("keyup", inputCallback, false);
        canvas.addEventListener("keyleft", inputCallback, false);
        canvas.addEventListener("keyright", inputCallback, false);
        canvas.addEventListener("wheel", inputCallback, false);

        scene.onPointerObservable.add((pointerInfo) => {
            if (pointerInfo.type == BABYLON.PointerEventTypes.POINTERDOWN)
            {
                inputCallback();
            }
        });

        this._camera.onAfterCheckInputsObservable.add(this.updateCameraFollow.bind(this));
        this._camera.onViewMatrixChangedObservable.add(() => {
            cameraChangeCallback(this._camera.position, this._camera.upVector, this._camera.getDirection(BABYLON.Vector3.Forward()));
        });

        // This targets the camera to scene origin
        this._camera.setTarget(BABYLON.Vector3.Zero());

        // This attaches the camera to the canvas
        this._camera.attachControl(canvas, true);
    }

    moveCameraToPosition(targetPosition: BABYLON.Vector3, radius: number)
    {
        if (this.isOrthographic)
        {
            var ease = new BABYLON.CubicEase();
            ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

            let targetPos = targetPosition;
            targetPos.y = this._camera.position.y;

            let moveTo = BABYLON.Animation.CreateAndStartAnimation('moveTo', this._camera, 'position', 60, 20,
                this._camera.position,
                targetPosition, 0, ease);
                moveTo.disposeOnEnd = true;
        }
        else
        {
            var ease = new BABYLON.CubicEase();
            ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);

            let targetTo = BABYLON.Animation.CreateAndStartAnimation('targetTo', this._camera, 'lockedTarget', 60, 20,
                this._camera.getTarget(),
                targetPosition, 0, ease, () => { this._camera.lockedTarget = null; });
            targetTo.disposeOnEnd = true;

            const targetPos = RenderUtils.getCameraPositionForTarget(this._camera, targetPosition, radius);

            let moveTo = BABYLON.Animation.CreateAndStartAnimation('moveTo', this._camera, 'position', 60, 20,
                this._camera.position,
                targetPos, 0, ease);
                moveTo.disposeOnEnd = true;
        }
    }

    setSelectedEntity(selectedEntity: IEntityRenderData)
    {
        this.selectedEntity = selectedEntity;
    }

    is2DModeActive()
    {
        return this.isOrthographic;
    }

    toggle2DMode()
    {
        this.set2DMode(!this.isOrthographic);
    }

    set2DMode(enabled: boolean)
    {
        this.isOrthographic = enabled;

        if (this.isOrthographic)
        {
            this._camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;

            this.updateOrthoSize(10);

            // Manually add inputs here for WASD
            this._camera.keysDown = [];
            this._camera.keysUp = [];
            this._camera.keysLeft = [65];
            this._camera.keysRight = [68];
            this._camera.keysUpward = [87];
            this._camera.keysDownward = [83];
            this._camera.inputs.attached.mouse.detachControl();

            // Look down
            const lookAt = BABYLON.Matrix.LookAtLH(
                this._camera.position,
                this._camera.position.add(BABYLON.Vector3.Down()),
                BABYLON.Vector3.Up()
            ).invert();
            this._camera.rotationQuaternion = BABYLON.Quaternion.FromRotationMatrix( lookAt );
        }
        else
        {
            this._camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;

            // Manually add inputs here for WASD
            this._camera.keysDown = [83];
            this._camera.keysUp = [87];
            this._camera.keysLeft = [65];
            this._camera.keysRight = [68];
            this._camera.keysUpward = [];
            this._camera.keysDownward = [];

            this._camera.inputs.attachInput(this._camera.inputs.attached.mouse);
        }

        // Update speed
        this.setBaseSpeed(this.cameraMinSpeed);
    }

    setBaseSpeed(speed: number)
    {
        this.cameraMinSpeed = speed;
        this._camera.speed = this.calcSpeed(speed);
    }

    private calcSpeed(speed: number)
    {
        if (this.isOrthographic)
        {
            return speed * Math.pow(this._camera.orthoTop, 1.2) * 0.1;
        }

        return speed;
    }

    onCanvasResize()
    {
        this.updateOrthoSize(this._camera.orthoTop);
    }

    private updateOrthoSize(orthoSize: number)
    {
        const ratio = this._camera.getEngine().getRenderWidth() / this._camera.getEngine().getRenderHeight();

        this._camera.orthoTop = orthoSize;
        this._camera.orthoBottom = -orthoSize;
        this._camera.orthoLeft = -orthoSize * ratio;
        this._camera.orthoRight = orthoSize * ratio;
    }

    followEntity()
    {
        this.isFollowingEntity = true;
    }

    stopFollowEntity()
    {
        if (this.isFollowingEntity)
        {
            this.isFollowingEntity = false;
            this._camera.lockedTarget = null;
        }
    }

    getCamera() : BABYLON.Camera
    {
        return this._camera;
    }

    private updateCameraFollow()
    {
        if (this.selectedEntity && this._camera && this.selectedEntity.mesh && this.isFollowingEntity)
        {
            const targetPosition = this.selectedEntity.mesh.position;
            const radius = RenderUtils.getRadiusOfEntity(this.selectedEntity);
            const cameraPos = RenderUtils.getCameraPositionForTarget(this._camera, targetPosition, radius);

            const meshToCamera = this._camera.position.subtract(targetPosition);

            // TODO: This is super hacky, improve!
            const lerpValTarget = 0.2;
            const lerpValPos = 0.04;

            let lerpedTarget = this._camera.lockedTarget == null ? targetPosition : BABYLON.Vector3.Lerp(this._camera.lockedTarget, targetPosition, lerpValTarget);
            this._camera.position = BABYLON.Vector3.Lerp(this._camera.position, cameraPos, lerpValPos);
            this._camera.lockedTarget = lerpedTarget;
            
            const dot = BABYLON.Vector3.Dot(this._camera.getForwardRay(3).direction, meshToCamera);

            if ((this._camera.position.subtract(cameraPos).length() < 0.1) && Math.abs(dot) > 0.99 ) // Also, when trying to move the camera
            {
                this.stopFollowEntity();
            }
        }
    }
}