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

    gl_FragColor = mix(baseColor, vec4(color, 1.0), val-valMin);;
    }
    `;

    export function getOutlineShader() : string {
        return outlineShader;
    }