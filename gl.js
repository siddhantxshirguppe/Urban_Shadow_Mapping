import layerVertShaderSrc from './layerVert.glsl.js';
import layerFragShaderSrc from './layerFrag.glsl.js';
import shadowFragShaderSrc from './shadowFrag.glsl.js';
import shadowVertShaderSrc from './shadowVert.glsl.js';
import depthFragShaderSrc from './depthFrag.glsl.js';
import depthVertShaderSrc from './depthVert.glsl.js';

var gl;

var layers = null
var renderToScreen = null;
var fbo = null;
var currRotate = 0;
var currLightRotate = 0;
var currLightDirection = null;
var currZoom = 1.0;
var currProj = 'orthographic';
var currResolution = 2048;
var displayShadowmap = false;
var isShadowPass = true;

var g_scl = 1.0;
let g_x = 0;
let g_y = -2500;
/*
    FBO
*/
class FBO {
    constructor(size) {
        // TODO: Create FBO and texture with size
        this.depthTexture = createTexture2D(gl, gl.canvas.width, gl.canvas.height, gl.DEPTH_COMPONENT32F, 0, 
            gl.DEPTH_COMPONENT, gl.FLOAT, null, gl.NEAREST, gl.NEAREST,
            gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this.depthFBO = createFBO(gl, gl.DEPTH_ATTACHMENT,this.depthTexture);

    }

    start() {
        // TODO: Bind FBO, set viewport to size, clear depth buffer

        // Bind FBO, set viewport to size, clear depth buffer if needed
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFBO);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        // Optionally clear depth buffer
        gl.clear(gl.DEPTH_BUFFER_BIT);

    }

    stop() {
        // TODO: unbind FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
}


class ShadowMapProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, shadowVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shadowFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");

        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");

        this.lightViewLoc = gl.getUniformLocation(this.program, "uLightView");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");

        this.hasNormalsAttribLoc = gl.getUniformLocation(this.program, "uHasNormals");

/*
        this.lightProjectionLoc = gl.getUniformLocation(this.program, "uLightProjection");
        
        this.lightDirAttribLoc = gl.getUniformLocation(this.program, "uLightDir");  
*/  
    }

    use() {
        gl.useProgram(this.program);
    }
}


function loadTexture(url) {
        var texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        var image = new Image();
        image.onload = function () {
            var level = 0;
            var internalFormat = gl.RGBA;
            var srcFormat = gl.RGBA;
            var srcType = gl.UNSIGNED_BYTE;
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D,level,internalFormat,srcFormat,srcType,image);
            gl.generateMipmap(gl.TEXTURE_2D);
        };
        image.src = url;
        return texture;
    }

    //Render to screen program

class RenderToScreenProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, depthVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, depthFragShaderSrc);
        
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);
        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.texCoordAttribLoc = gl.getAttribLocation(this.program, "inTextureCoord");
        this.samplerLoc = gl.getUniformLocation(this.program, "uSampler");

        // Create quad vertices
        this.quadVertices = new Float32Array([
            // Position      // Texture coordinates
            0.3, 0.3, 0,     0.0, 0.0, //a
            1.0, 0.3, 0,     1.0, 0.0, //b
            0.3, 1.0, 0,     0.0, 1.0, //c
            0.3, 1.0, 0,     0.0, 1.0,  //d
            1.0, 0.3, 0,     1.0, 0.0,  //e
            1.0, 1.0, 0,     1.0, 1.0 //f
        ]);

        // Create quad VBO
        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, this.quadVertices, gl.STATIC_DRAW);

        this.texture = loadTexture('manhattan.png');

        // Create quad VAO
        this.quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);
        gl.enableVertexAttribArray(this.posAttribLoc);
        gl.vertexAttribPointer(this.posAttribLoc, 3, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 0);
        gl.enableVertexAttribArray(this.texCoordAttribLoc);
        gl.vertexAttribPointer(this.texCoordAttribLoc, 2, gl.FLOAT, false, 5 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.bindVertexArray(null);
        

        

    }

    draw(depth_texture) {
        // TODO: Render quad and display texture


        //console.log("sidlog drawing depth texture");

        gl.useProgram(this.program);

        gl.bindVertexArray(this.quadVAO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, depth_texture);

        var samplerLoc = gl.getUniformLocation(this.program, 'uSampler');
        gl.uniform1i(samplerLoc, 0);

        var isPerspLocation = gl.getUniformLocation(this.program, "isPersp");
        if(currProj == 'perspective')
        {
            gl.uniform1i(isPerspLocation,true);
        }else{
            gl.uniform1i(isPerspLocation,false);
        }

        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

}


/*
    Layer program
*/
class LayerProgram {
    constructor() {
        this.vertexShader = createShader(gl, gl.VERTEX_SHADER, layerVertShaderSrc);
        this.fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, layerFragShaderSrc);
        this.program = createProgram(gl, this.vertexShader, this.fragmentShader);

        this.posAttribLoc = gl.getAttribLocation(this.program, "position");
        this.colorAttribLoc = gl.getUniformLocation(this.program, "uColor");
        this.modelLoc = gl.getUniformLocation(this.program, "uModel");
        this.projectionLoc = gl.getUniformLocation(this.program, "uProjection");
        this.viewLoc = gl.getUniformLocation(this.program, "uView");
    }
    getpgmid() {
        //console.log("sidlog getpgmid");
        return this.program;
    }
    use() {
        gl.useProgram(this.program);
    }
}


/*
    Collection of layers
*/
class Layers {
    constructor() {
        this.layers = {};
        this.centroid = [0,0,0];
    }

    addLayer(name, vertices, indices, color, normals) {
        if(normals == undefined)
            normals = null;
        var layer = new Layer(vertices, indices, color, normals);
        layer.init();
        this.layers[name] = layer;
        this.centroid = this.getCentroid();
    }

    removeLayer(name) {
        delete this.layers[name];
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix = null, lightProjectionMatrix = null, shadowPass = false, texture = null) {
        for(var layer in this.layers) {
            if(layer == 'surface') {
                gl.polygonOffset(1, 1);
            }
            else {
                gl.polygonOffset(0, 0);
            }


            this.layers[layer].draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix, lightProjectionMatrix, shadowPass, texture);
        }
    }

    
    getCentroid() {
        var sum = [0,0,0];
        var numpts = 0;
        for(var layer in this.layers) {
            numpts += this.layers[layer].vertices.length/3;
            for(var i=0; i<this.layers[layer].vertices.length; i+=3) {
                var x = this.layers[layer].vertices[i];
                var y = this.layers[layer].vertices[i+1];
                var z = this.layers[layer].vertices[i+2];
    
                sum[0]+=x;
                sum[1]+=y;
                sum[2]+=z;
            }
        }
        return [sum[0]/numpts,sum[1]/numpts,sum[2]/numpts];
    }
}

/*
    Layers without normals (water, parks, surface)
*/
class Layer {
    
    constructor(vertices, indices, color, normals = null) {
        this.vertices = vertices;
        this.indices = indices;
        this.color = color;
        this.normals = normals;

        this.hasNormals = false;
        if(this.normals) {
            this.hasNormals = true;
        }
    }

    init() {
        this.layerProgram = new LayerProgram();
        this.shadowProgram = new ShadowMapProgram();
        //console.log("sidlog: vertices:"+this.vertices.length);
        //console.log("sidlog: indices:"+this.indices.length);
        this.vertexBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.vertices));
        this.indexBuffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.indices));

        if(this.normals) {
            this.normalBuffer = createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(this.normals));
            this.vao = createVAO(gl, 0, this.vertexBuffer, 1, this.normalBuffer);
        }
        else {
            this.vao = createVAO(gl, 0, this.vertexBuffer);
        }
    }

    draw(modelMatrix, viewMatrix, projectionMatrix, lightViewMatrix = null, lightProjectionMatrix = null, shadowPass = false, texture = null) {
        // TODO: Handle shadow pass (using ShadowMapProgram) and regular pass (using LayerProgram)
            //console.log("layer draw"+shadowPass);
            gl.bindVertexArray(this.vao);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer );

            if(shadowPass)
            {
                //console.log("shadow pass");
                this.layerProgram.use();

                var ColorBufferLocation = gl.getUniformLocation(this.layerProgram.program, "uColor");
                gl.uniform4fv(ColorBufferLocation, this.color);
    
                var projLocation = gl.getUniformLocation(this.layerProgram.program, "uProjection");
                gl.uniformMatrix4fv(projLocation,false, projectionMatrix);
                
                var viewLocation = gl.getUniformLocation(this.layerProgram.program, "uView");
                gl.uniformMatrix4fv(viewLocation,false, viewMatrix);
    
                var modelLocation = gl.getUniformLocation(this.layerProgram.program, "uModel");
                gl.uniformMatrix4fv(modelLocation,false, modelMatrix);

                gl.drawElements(gl.TRIANGLES,this.indices.length,gl.UNSIGNED_INT,0);

            }else{
                this.shadowProgram.use();

                var ColorBufferLocation = gl.getUniformLocation(this.shadowProgram.program, "uColor");
                gl.uniform4fv(ColorBufferLocation, this.color);
    
                var projLocation = gl.getUniformLocation(this.shadowProgram.program, "uProjection");
                gl.uniformMatrix4fv(projLocation,false, projectionMatrix);
                
                var viewLocation = gl.getUniformLocation(this.shadowProgram.program, "uView");
                gl.uniformMatrix4fv(viewLocation,false, viewMatrix);
    
                var modelLocation = gl.getUniformLocation(this.shadowProgram.program, "uModel");
                gl.uniformMatrix4fv(modelLocation,false, modelMatrix);

                var lightLocation = gl.getUniformLocation(this.shadowProgram.program, "uLightView");
                gl.uniformMatrix4fv(lightLocation,false, lightViewMatrix);

                var isPerspLocation = gl.getUniformLocation(this.shadowProgram.program, "isPersp");
                if(currProj == 'perspective')
                {
                    gl.uniform1i(isPerspLocation,true);
                }else{
                    gl.uniform1i(isPerspLocation,false);
                }
                
                if(this.hasNormals)
                {
                    gl.uniform1i(this.shadowProgram.hasNormalsAttribLoc,true);
                }else{
                    gl.uniform1i(this.shadowProgram.hasNormalsAttribLoc,false);
                }
                
                
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, fbo.depthTexture);

                var shadowSamplerLoc = gl.getUniformLocation(this.shadowProgram.program, 'uSampler');
                gl.uniform1i(shadowSamplerLoc, 1);

                var shadeLightLocation = gl.getUniformLocation(this.shadowProgram.program, "uShadeLightAngle");
                gl.uniform1f(shadeLightLocation, currLightRotate);
              
                gl.drawElements(gl.TRIANGLES,this.indices.length,gl.UNSIGNED_INT,0);

            }

    }
}

/*
    Event handlers
*/
window.updateRotate = function() {
    currRotate = parseInt(document.querySelector("#rotate").value);
}

window.updateLightRotate = function() {
    currLightRotate = parseInt(document.querySelector("#lightRotate").value);

}

window.updateZoom = function() {
    currZoom = parseFloat(document.querySelector("#zoom").value);
}

window.updateProjection = function() {
    currProj = document.querySelector("#projection").value;
}

window.displayShadowmap = function(e) {
    displayShadowmap = e.checked;
}

/*
    File handler
*/
window.handleFile = function(e) {
    var reader = new FileReader();
    reader.onload = function(evt) {
        var parsed = JSON.parse(evt.target.result);
        for(var layer in parsed){
            var aux = parsed[layer];
            //console.log("sidlog: adding layer"+layer);
            layers.addLayer(layer, aux['coordinates'], aux['indices'], aux['color'], aux['normals']);
        }
    }
    reader.readAsText(e.files[0]);
}

/*
    Update transformation matrices
*/


function updateModelMatrix(centroid) {
    // TODO: update model matrix
    var model_test_mat_trans = translateMatrix(-centroid[0], -centroid[1], -centroid[2]);
    var model_test_mat_scale= scaleMatrix(parseFloat(currZoom),parseFloat(currZoom),parseFloat(currZoom));
    var model_test_mat_trans_org = translateMatrix(centroid[0], centroid[1],centroid[2]);
    var mat_array = [model_test_mat_trans_org,model_test_mat_scale,model_test_mat_trans];
    var res = multiplyArrayOfMatrices(mat_array);
    return res;
}

function updateProjectionMatrix() {
    var minX = -2500;
    var maxX = 2500;
    var minY = -2500;
    var maxY = 2500;
    var far = 5000;
    var near = 0.1;

    var ortho_mat = orthographicMatrix(minX, maxX, minY, maxY, near,far );
    var persp_mat = perspectiveMatrix(parseFloat(Math.PI/2.0), 1, near, far);

    if(currProj === "orthographic")
    {
        return ortho_mat;
    }else if(currProj === "perspective")
    {
        return persp_mat;
    }

}

function updateViewMatrix(centroid) {
    // Define up vector (usually [0, 1, 0] for upright orientation)
    var up = [0, 0, 1];
    var agl_radians = currRotate * (Math.PI / 180);
    // Define the radius of the orbit (distance between centroid and camera)
    var orbitRadius =  2000 ; // Adjust this value as needed

    // Calculate camera position (eye) around the centroid
    var cam_x = centroid[0] + orbitRadius * Math.cos(agl_radians);
    var cam_y = centroid[1] + orbitRadius * Math.sin(agl_radians);


    // Define camera target (center) as the centroid
    var center = centroid;

    console.log("sidlog zom:"+currZoom);
    var cam_z = centroid[2] + 2000 ;
    var eye = [cam_x, cam_y, cam_z]; // Assuming the camera is positioned 2000 units above the centroid
    var viewMatrix = lookAt(eye, center, up);

    return viewMatrix;
}



function updateLightViewMatrix(centroid) {
    // Define up vector (usually [0, 1, 0] for upright orientation)
    var up = [0, 0, 1];
    var agl_radians = currLightRotate * (Math.PI / 180);
    // Define the radius of the orbit (distance between centroid and camera)
    var orbitRadius = 2000; // Adjust this value as needed

    // Calculate camera position (eye) around the centroid
    var cam_x = centroid[0] + orbitRadius * Math.cos(agl_radians);
    var cam_y = centroid[1] + orbitRadius * Math.sin(agl_radians);
    var eye = [cam_x, cam_y, centroid[2] + 2000]; // Assuming the camera is positioned 2000 units above the centroid

    // Define camera target (center) as the centroid
    var center = centroid;

    // Define the view matrix using the lookAt function
    var viewMatrix = lookAt(eye, center, up);

    return viewMatrix;
}

function updateLightProjectionMatrix() {
    // TODO: Light projection matrix
    var lightProjectionMatrix = identityMatrix();
    return lightProjectionMatrix;
}

var dumpOnce = false;
/*
    Main draw function (should call layers.draw)
*/
function draw() {

    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // TODO: First rendering pass, rendering using FBO


    if(!displayShadowmap) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // TODO: Second rendering pass, render to screen
    }
    else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        renderToScreen.draw(fbo.depthTexture);
        // TODO: Render shadowmap texture computed in first pass
    }



    //shadow pass

    fbo.start();
    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the canvas


    //console.log("sidlight: lightmat"+light_mat);
    //console.log("sidlight: viewmat"+view_mat);
    //console.log("sidlight: projmat"+proj_mat);

    isShadowPass = true;
    light_view_mat = updateLightViewMatrix(layers.centroid);

    layers.draw(model_mat,light_view_mat,proj_mat,null,null, isShadowPass, null);
    fbo.stop();




    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.depthTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Ensure the default framebuffer is bound
    gl.clearColor(190/255, 210/255, 215/255, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear the canvas

    //final pass
    isShadowPass = false;
    light_view_mat = updateLightViewMatrix(layers.centroid);
    var light_array = [proj_mat,light_view_mat,model_mat];
    light_mat = multiplyArrayOfMatrices(light_array);

    model_mat = updateModelMatrix(layers.centroid);
    view_mat = updateViewMatrix(layers.centroid);
    proj_mat = updateProjectionMatrix();
    layers.draw(model_mat,view_mat,proj_mat,light_mat,null, isShadowPass, null);

    //check if the depth texture is written properly
    
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    if(displayShadowmap)
    {
        renderToScreen.draw(fbo.depthTexture);
    }
    
    requestAnimationFrame(draw);

}

/*
    Initialize everything
*/

var model_mat;
var view_mat ;
var proj_mat;

var light_view_mat;
var light_mat;

function initialize() {

    var canvas = document.querySelector("#glcanvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    gl = canvas.getContext("webgl2");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    gl.enable(gl.POLYGON_OFFSET_FILL);

    layers = new Layers();
    fbo = new FBO(currResolution);
    renderToScreen = new RenderToScreenProgram();
    
    //model_mat = identityMatrix();
    model_mat = updateModelMatrix(layers.centroid);
    view_mat = updateViewMatrix(layers.centroid);
    proj_mat = updateProjectionMatrix();

    light_mat = identityMatrix();
    currRotate = currRotate + 90;
    light_view_mat = updateViewMatrix(layers.centroid);

    var light_array = [proj_mat,light_view_mat,model_mat];
    light_mat = multiplyArrayOfMatrices(light_array);

    window.requestAnimationFrame(draw);
    

}


window.onload = initialize;