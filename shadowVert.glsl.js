export default `#version 300 es

uniform mat4 uModel;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uLightView;

uniform vec4 uColor;
uniform float uShadeLightAngle;
//uniform mat4 uLightProjection;
//uniform vec3 uLightDir;
uniform bool uHasNormals;

in vec3 position;
in vec3 normal;

out vec4 vColor;
out vec4 vLightSpacePos;

void main() {


    gl_Position = uProjection * uView * uModel * vec4(position, 1);


    vLightSpacePos = uLightView * vec4(position, 1); 

    float angleRad = radians(uShadeLightAngle);
    float cosAngle = cos(angleRad);
    float sinAngle = sin(angleRad);
    float x = cosAngle;
    float y = -1.0; // Fixed downward direction along the y-axis
    float z = sinAngle;
    vec3 lightdir = normalize(vec3(x, y, z));

    float dotp = max(0.45,dot(lightdir,normal));
    if(uHasNormals)
    {
        vColor = vec4(dotp*uColor.rgb,1);
    }else
    {
        vColor = uColor;
    }

}
`;