import * as BABYLON from 'babylonjs';
import * as Utils from '../utils/utils';

class OutlinePostProcess extends BABYLON.PostProcess{
    constructor(name: string, camera: BABYLON.Camera, renderTarget: BABYLON.RenderTargetTexture,  outlineColor: Utils.RGBColor01, stripes: boolean)
    {
        super(name, "Selection", ["screenSize", "color", "stripes"], ["selectionSampler"], 1, camera);

        this.onApply = effect => {
            effect.setTexture("selectionSampler", renderTarget);
            effect.setFloat2("screenSize", this.width, this.height);
            effect.setFloat("stripes", stripes ? 0 : 1);
            effect.setColor3("color", outlineColor);
        };

    }
}

class OutlineWithDepthPostProcess extends BABYLON.PostProcess{
    constructor(name: string, camera: BABYLON.Camera, renderTarget: BABYLON.RenderTargetTexture, mainDepthRenderer: BABYLON.DepthRenderer, selectionDepthRenderer: BABYLON.DepthRenderer, outlineColor: Utils.RGBColor01, stripes: boolean)
    {
        super(name, "Selection", ["screenSize", "color", "stripes"], ["selectionSampler", "mainDepthSampler", "selectionDepthSampler"], 1, camera);

        this.onApply = effect => {
            effect.setTexture("selectionSampler", renderTarget);
            effect.setTexture("mainDepthSampler", mainDepthRenderer.getDepthMap());
            effect.setTexture("selectionDepthSampler", selectionDepthRenderer.getDepthMap());
            effect.setFloat2("screenSize", this.width, this.height);
            effect.setFloat("stripes", stripes ? 0 : 1);
            effect.setColor3("color", outlineColor);
        };

    }
}


export class OutlineEffect
{
    private selectionRenderTarget: BABYLON.RenderTargetTexture;
    private selectionPostProcess: OutlinePostProcess;

    constructor(scene: BABYLON.Scene, camera: BABYLON.Camera, outlineColor: Utils.RGBColor01)
    {
        this.selectionRenderTarget = new BABYLON.RenderTargetTexture("test", 1024, scene, true);
        this.selectionRenderTarget.activeCamera = camera;
        scene.customRenderTargets.push(this.selectionRenderTarget);
        this.selectionRenderTarget.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        this.selectionPostProcess = new OutlinePostProcess("Selection", camera, this.selectionRenderTarget, outlineColor, false);
    }

    setAntiAliasingSamples(samples: number)
    {
        this.selectionPostProcess.samples = samples;
    }

    clearSelection()
    {
        this.selectionRenderTarget.renderList.length = 0;
    }

    addMesh(mesh: BABYLON.Mesh)
    {
        this.selectionRenderTarget.renderList.push(mesh);
    }
}

export class OutlineEffectWithDepth
{
    private selectionRenderTarget: BABYLON.RenderTargetTexture;
    private selectionDepthRenderer: BABYLON.DepthRenderer;
    private mainDepthRenderer: BABYLON.DepthRenderer
    private selectionPostProcess: OutlineWithDepthPostProcess;

    constructor(mainDepthRenderer: BABYLON.DepthRenderer, scene: BABYLON.Scene, camera: BABYLON.Camera, outlineColor: Utils.RGBColor01)
    {
        this.mainDepthRenderer = mainDepthRenderer;

        this.selectionRenderTarget = new BABYLON.RenderTargetTexture("test", 1024, scene, true);
        this.selectionRenderTarget.activeCamera = camera;
        scene.customRenderTargets.push(this.selectionRenderTarget);
        this.selectionRenderTarget.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        this.selectionDepthRenderer = new BABYLON.DepthRenderer(scene, BABYLON.Engine.TEXTURETYPE_FLOAT, camera, false);
        scene.customRenderTargets.push(this.selectionDepthRenderer.getDepthMap());

        // Share the same array ref
        this.selectionDepthRenderer.getDepthMap().renderList = this.selectionRenderTarget.renderList

        this.selectionPostProcess = new OutlineWithDepthPostProcess("Selection", camera, this.selectionRenderTarget, this.mainDepthRenderer, this.selectionDepthRenderer, outlineColor, false);
    }

    clearSelection()
    {
        this.selectionRenderTarget.renderList.length = 0;
    }

    addMesh(mesh: BABYLON.Mesh)
    {
        this.selectionRenderTarget.renderList.push(mesh);
    }
}

const outlineShader: string = `
    #ifdef GL_ES
    precision highp float;
    #endif

    // Samplers
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D selectionSampler;

    // Parameters
    uniform vec2 screenSize;
    uniform float threshold;
    uniform vec3 color;
    uniform float stripes;

    void main(void) 
    {
    vec2 texelSize = vec2(1.0 / screenSize.x, 1.0 / screenSize.y);
    vec4 baseColor = texture2D(textureSampler, vUV);
    vec4 outlineSample = texture2D(selectionSampler, vUV, -1.0);

    float val = 0.0;
    float valMin = 1.0;
    int samples = 5;
    int init = -((samples - 1) / 2);
    int end = (samples - 1) / 2;
    float width =1.0;

    for (int x=init; x<=end; ++x)
    {
        for (int y=init; y<=end; ++y)
        {
            float offsetX = float(x) * texelSize.x * width;
            float offsetY = float(y) * texelSize.y * width;
            vec2 uv = vec2(vUV.x + offsetX, vUV.y + offsetY);
            if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0)
            {
                if (distance(vUV, uv) < texelSize.x * width * float(samples) * 0.5)
                {
                    float value = texture2D(selectionSampler, uv).w;
                    val = max(val, value);
                    valMin = min(valMin, value);
                }
            }
        }
    }

    // Stripes (TODO: Remove if unused)
    float frequence = 50.0;
    float tilt = -38.0;
    float displ = 0.0;
    float thickness = 0.25;
    float smoothness = 0.01;
    
    float stripesRaw = fract( dot(vUV.xy, vec2(frequence,tilt)) + displ);
    float stripeMask = smoothstep(-smoothness, smoothness, thickness - abs(stripesRaw - .5));

    float maskedSelection = valMin * 0.1 * max(stripes, stripeMask);

    float outline = val-valMin;

    float selectionValue = 0.1;
    float effect = max(outline, maskedSelection);

    gl_FragColor = mix(baseColor, vec4(color, 1.0), effect);
    }
    `;

export function getOutlineShader() : string {
    return outlineShader;
}

const outlineDepthShader: string = `
#ifdef GL_ES
precision highp float;
#endif

// Samplers
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D selectionSampler;
uniform sampler2D mainDepthSampler;
uniform sampler2D selectionDepthSampler;

// Parameters
uniform vec2 screenSize;
uniform float threshold;
uniform vec3 color;
uniform float stripes;

void main(void) 
{
vec2 texelSize = vec2(1.0 / screenSize.x, 1.0 / screenSize.y);
vec4 baseColor = texture2D(textureSampler, vUV);
vec4 outlineSample = texture2D(selectionSampler, vUV, -1.0);

float val = 0.0;
float valMin = 1.0;
int samples = 5;
int init = -((samples - 1) / 2);
int end = (samples - 1) / 2;
float width =1.0;
float minSelectionDepth = 1.0;

for (int x=init; x<=end; ++x)
{
    for (int y=init; y<=end; ++y)
    {
        float offsetX = float(x) * texelSize.x * width;
        float offsetY = float(y) * texelSize.y * width;
        vec2 uv = vec2(vUV.x + offsetX, vUV.y + offsetY);
        if (uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0)
        {
            if (distance(vUV, uv) < texelSize.x * width * float(samples) * 0.5)
            {
                float value = texture2D(selectionSampler, uv).w;
                val = max(val, value);
                valMin = min(valMin, value);
                minSelectionDepth = min(minSelectionDepth, texture2D(selectionDepthSampler, uv).x);
            }
        }
    }
}

float mainDepth = texture2D(mainDepthSampler, vUV, 0.0).x;
float selectionDepth = texture2D(selectionDepthSampler, vUV, 0.0).x;

float depthDiff = minSelectionDepth - mainDepth;
float behindElements =  depthDiff > 0.001 ? 1. : 0.;

// Stripes (TODO: Remove if unused)
float frequence = 50.0;
float tilt = -38.0;
float displ = 0.0;
float thickness = 0.25;
float smoothness = 0.01;

float stripesRaw = fract( dot(vUV.xy, vec2(frequence,tilt)) + displ);
float stripeMask = smoothstep(-smoothness, smoothness, thickness - abs(stripesRaw - .5));

float maskedSelection = valMin * 0.1 * max(stripes, stripeMask);

float outline = val-valMin;

float selectionValue = 0.1;
float effect = outline * max(selectionValue, 1.0 - behindElements);

gl_FragColor = mix(baseColor, vec4(color, 1.0), effect);
}
`;

export function getOutlineDepthShader() : string {
    return outlineDepthShader;
}