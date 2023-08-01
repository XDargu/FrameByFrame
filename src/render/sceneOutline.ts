import * as BABYLON from 'babylonjs';
import * as Utils from '../utils/utils';
import { IEntityRenderData, IPropertyRenderData } from './commonTypes';
import { getOutlineShader, OutlineEffect } from './outlineShader';

export default class SceneOutline
{
    private selectionOutline: OutlineEffect;
    private hoverOutline: OutlineEffect;

    constructor(scene: BABYLON.Scene, camera: BABYLON.Camera, selectionColor: Utils.RGBColor01, hoverColor: Utils.RGBColor01, outlineWidth: number)
    {
        // Outline post-process effect
        // We can do this for outline with depth
        /*this._camera.maxZ=500;
        this._camera.minZ=0;
        let mainDepthRenderer = scene.enableDepthRenderer(this._camera, false);*/

        BABYLON.Effect.ShadersStore["SelectionFragmentShader"] = getOutlineShader();

        this.selectionOutline = new OutlineEffect(scene, camera, selectionColor, outlineWidth);
        this.hoverOutline = new OutlineEffect(scene, camera, hoverColor, outlineWidth);
    }

    refreshOutlineTargets(selectedEntity: IEntityRenderData, hoveredEntity: IEntityRenderData)
    {
        this.selectionOutline.clearSelection();
        if (selectedEntity)
        {
            this.selectionOutline.addMesh(selectedEntity.mesh);
            selectedEntity.properties.forEach((propertyData: IPropertyRenderData) => {
                this.selectionOutline.addMesh(propertyData.mesh);
            });
        }

        this.hoverOutline.clearSelection();
        if (hoveredEntity && hoveredEntity != selectedEntity)
        {
            this.hoverOutline.addMesh(hoveredEntity.mesh);
            hoveredEntity.properties.forEach((propertyData: IPropertyRenderData) => {
                this.hoverOutline.addMesh(propertyData.mesh);
            });
        }
    }

    setAntiAliasingSamples(samples: number)
    {
        this.selectionOutline.setAntiAliasingSamples(samples);
        this.hoverOutline.setAntiAliasingSamples(samples);
    }

    setColors(selectionColor: Utils.RGBColor01, hoverColor: Utils.RGBColor01)
    {
        this.selectionOutline.setColor(selectionColor);
        this.hoverOutline.setColor(hoverColor);
    }

    setWidth(outlineWidth: number)
    {
        this.selectionOutline.setWidth(outlineWidth);
        this.hoverOutline.setWidth(outlineWidth);
    }
}