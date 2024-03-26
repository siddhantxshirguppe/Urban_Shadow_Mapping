export default `#version 300 es

in vec3 position;
out vec2 outTextureCoord;
in vec2 inTextureCoord;
void main() {
    gl_Position = vec4(position, 1);
    // TODO: send vTexcoord to fragment shader with texture coordinates
    outTextureCoord = inTextureCoord;
}    
`;