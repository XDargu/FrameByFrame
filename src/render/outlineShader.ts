import * as BABYLON from 'babylonjs';
import * as Utils from '../utils/utils';

export class OutlinePostProcess extends BABYLON.PostProcess{
    constructor(name: string, camera: BABYLON.Camera, renderTarget: BABYLON.RenderTargetTexture, outlineColor: Utils.RGBColor01, stripes: boolean)
    {
        super(name, "Selection", ["screenSize", "color", "stripes"], ["testSampler"], 1, camera);

        this.onApply = effect => {
            effect.setTexture("testSampler", renderTarget);
            effect.setFloat2("screenSize", this.width, this.height);
            effect.setFloat("stripes", stripes ? 0 : 1);
            effect.setColor3("color", outlineColor);
        };

    }
}

const outlineShader: string = `
    #ifdef GL_ES
    precision highp float;
    #endif

    // Samplers
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D testSampler;

    // Parameters
    uniform vec2 screenSize;
    uniform float threshold;
    uniform vec3 color;
    uniform float stripes;

    void main(void) 
    {
    vec2 texelSize = vec2(1.0 / screenSize.x, 1.0 / screenSize.y);
    vec4 baseColor = texture2D(textureSampler, vUV);
    vec4 outlineSample = texture2D(testSampler, vUV, -1.0);

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
                    float value = texture2D(testSampler, uv).w;
                    val = max(val, value);
                    valMin = min(valMin, value);
                }
            }
        }
    }

    // Test:
    float frequence = 50.0;
    float tilt = -38.0;
    float displ = 0.0;
    float thickness = 0.25;
    float smoothness = 0.01;
    
    float stripesRaw = fract( dot(vUV.xy, vec2(frequence,tilt)) + displ);
    float stripeMask = smoothstep(-smoothness, smoothness, thickness - abs(stripesRaw - .5));

    float outline = val-valMin;
    float maskedSelection = valMin * 0.1 * max(stripes, stripeMask);

    gl_FragColor = mix(baseColor, vec4(color, 1.0), max(outline, maskedSelection));
    }
    `;

    export function getOutlineShader() : string {
        return outlineShader;
    }