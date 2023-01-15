import * as BABYLON from 'babylonjs';

export default class TextLabels
{
    private readonly fontSize: number = 48;
    private readonly font: string = "bold " + this.fontSize + "px Arial";

    private scene: BABYLON.Scene;
    private tempTexture: BABYLON.DynamicTexture;
    private tempContext: CanvasRenderingContext2D;

    constructor(scene: BABYLON.Scene)
    {
        this.scene = scene;
        this.tempTexture = new BABYLON.DynamicTexture("DynamicTexture", {}, this.scene, false);
        this.tempContext = this.tempTexture.getContext();
        this.tempContext.font = this.font;
    }

    buildLabel(text: string) : BABYLON.Mesh
    {
        //Set height for plane
        const planeHeight = 0.3;
            
        //Set height for dynamic texture
        const DTHeight = 1.1 * this.fontSize; //or set as wished

        //Calcultae ratio
        const ratio = planeHeight/DTHeight;

        //Use a temporay dynamic texture to calculate the length of the text on the dynamic texture canvas
        const DTWidth = this.tempContext.measureText(text).width + 8;

        //Calculate width the plane has to be 
        const planeWidth = DTWidth * ratio;

        //Create dynamic texture and write the text
        let dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", {width:DTWidth, height:DTHeight}, this.scene, false);

        let mat = new BABYLON.StandardMaterial("mat", this.scene);
        mat.diffuseTexture = dynamicTexture;
        mat.disableLighting = true;
        mat.emissiveColor = new BABYLON.Color3(1,1,1);
        dynamicTexture.drawText(text, null, null, this.font, "#000000", "#ffffff", true);

        //Create plane and set dynamic texture as material
        let plane = BABYLON.MeshBuilder.CreatePlane("plane", {width:planeWidth, height:planeHeight }, this.scene);
        plane.material = mat;
        plane.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
        plane.isPickable = false;

        return plane;
    }

	
}