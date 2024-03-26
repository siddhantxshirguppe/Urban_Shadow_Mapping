export default `#version 300 es
precision highp float;

uniform sampler2D uSampler;
uniform bool isPersp;
in vec2 outTextureCoord;
out vec4 outColor;

float linearizeDepth(float depth, float near, float far) {
    return (2.0 * near) / (far + near - depth * (far - near));
}

void main() {
    float depthValue = texture(uSampler, outTextureCoord).r;
    float near = 0.1f;
    float far = 5000.0f;
    if(isPersp)
    {
        depthValue = linearizeDepth(depthValue,near,far);
    }
    
    outColor = vec4(vec3(depthValue), 1.0);
    //outColor = vec4(1,0,0, 1.0);
}
`;