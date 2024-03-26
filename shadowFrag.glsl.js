export default `#version 300 es
precision highp float;
uniform bool isPersp;
uniform sampler2D uSampler;


in vec3 normal;
in vec4 vColor;
in vec4 vLightSpacePos;
out vec4 outColor;
/*
vec3 shadowCalculation(vec4 lightSpacePos) {
    // TODO: shadow calculation
}
*/
// Function to perform PCF
float pcf(vec3 shadowCoord) {
    float shadow = 0.0;
    float totalSamples = 0.0;

    float radius = 1.0;

    for (float x = -radius; x <= radius; x += 1.0) {
        for (float y = -radius; y <= radius; y += 1.0) {
            float x = 1.0 / 2048.0;
            vec2 texelSize = vec2(x, x);
            vec2 offset = vec2(x, y) * texelSize;
            vec3 shadowCoord = shadowCoord + vec3(offset, 0.0);
            shadow += texture(uSampler, shadowCoord.xy).r;
            totalSamples += 1.0;
        }
    }

    // Average the shadow values
    shadow /= totalSamples;

    return shadow;
}

float linearizeDepth(float depth, float near, float far) {
    return (2.0 * near) / (far + near - depth * (far - near));
}

void main() {

    vec3 shadowCoord = vLightSpacePos.xyz/vLightSpacePos.w;
    shadowCoord = (shadowCoord + 1.0f)/2.0f;

    float currentDepthValue = shadowCoord.z;
    //float shadowDepthValue = texture(uSampler, shadowCoord.xy).r;
    float shadowDepthValue = pcf(shadowCoord);
    //outColor = vColor;
    //outColor = vec4(vLightSpacePos.xyz,0,1);
    //shadowCoord.x *= shadowCoord.x;
    //shadowCoord.y *= shadowCoord.y;
    float near = 0.1f;
    float far = 5000.0f;


    if(isPersp)
    {
        currentDepthValue = linearizeDepth(currentDepthValue,near,far);
        shadowDepthValue = linearizeDepth(shadowDepthValue,near,far);
    }
    //outColor = vec4(currentDepthValue_l,currentDepthValue_l,currentDepthValue_l,1);
    
    float bias = 0.005f; 
    if(currentDepthValue > shadowDepthValue + bias)
    {
        outColor = vColor*vec4(0.4,0.4,0.4,1);
        //outColor = vColor;
    }else
    {
        outColor = vColor;
    }

    

}
`;