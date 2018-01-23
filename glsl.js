
const GLSL = (function() {

  const VERTEX_SHADER_SOURCE = `
precision mediump float;

attribute vec3 aPosition;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform bool uMousePressed;

void main() {
  gl_Position = vec4(aPosition, 1.0);
}`;

  const VERTEX_POSITION = [
    -1.0,  1.0,  0.0,
    -1.0, -1.0,  0.0,
     1.0,  1.0,  0.0,
     1.0, -1.0,  0.0
  ];

  /**
   * creates a shader
   * @param [WebGLRenderingContext] gl
   * @param [String] source
   * @param [VERTEX_SHADER | FRAGMENT_SHADER] shaderType
   * @return [WebGLShader]
   */
  function createShader(gl, source, shaderType) {
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Can not compile shader sourde (' + gl.getShaderInfoLog(shader) + ')');
    }
    return shader;
  }

  /**
   * creates a program
   * @param [WebGLRenderingContext] gl
   * @param [WebGLShader] vertexShader
   * @param [WebGLShader] fragmentShader
   * @return [WebGLProgram]
   */
  function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Can not link program(' + gl.getProgramInfoLog(program) + ')');
    }
    return program;
  }

  /**
   * creates an array buffer
   * @param [WebGLRenderingContext] gl
   * @param [Array<Number>] array
   * @return [WebGLBuffer]
   */
  function createArrayBuffer(gl, array) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(array), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  /**
   * sets an attribute
   * @param [WebGLRenderingContext] gl
   * @param [Object] attrubte
   * @param [WebGLBufferx] attrubte.buffer
   * @param [GLint] attrubet.location
   * @param [number] attrubte.size
   */
  function setAttribute(gl, attribute) {
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
    gl.enableVertexAttribArray(attribute.location);
    gl.vertexAttribPointer(attribute.location, attribute.size, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * constructor of GLSL
   */
  function GLSL(options) {
    this.canvas = document.getElementById(options.canvasId);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', (function() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }).bind(this));

    this.mouse = [0, 0];
    this.mousePressed = false;
    canvas.addEventListener('mousemove', (function(e) {
      this.mouse = [e.clientX, this.canvas.height - e.clientY];
    }).bind(this));
    canvas.addEventListener('mousedown', (function() {
      this.mousePressed = true;
    }).bind(this));
    canvas.addEventListener('mouseup', (function() {
      this.mousePressed = false;
    }).bind(this));

    this.time = 0;

    this.gl = canvas.getContext('webgl');
    const vertexShader = createShader(this.gl, VERTEX_SHADER_SOURCE, this.gl.VERTEX_SHADER);
    const fragmentShader = createShader(this.gl, options.fragmentShaderSource, this.gl.FRAGMENT_SHADER);
    this.program = createProgram(this.gl, vertexShader, fragmentShader);

    this.gl.useProgram(this.program);
    this.gl.viewport(0, 0, canvas.width, canvas.height);
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const vertexPositionBuffer = createArrayBuffer(this.gl, VERTEX_POSITION);
    setAttribute(this.gl, {
      location: this.gl.getAttribLocation(this.program, 'aPosition'),
      size: 3,
      buffer: vertexPositionBuffer
    });

    this.uniforms = {};
    this.animationId = null;
  };

  /**
   * start rendering
   */
  GLSL.prototype.start = function() {
    if (this.isAnimating()) {
      console.error('animation has already started');
      return;
    }
    const me = this;
    this.animationId = requestAnimationFrame(this.render.bind(this));
    this.lastDate = new Date();
  };

  /**
   * stop rendering
   */
  GLSL.prototype.stop = function() {
    if (this.isAnimating()) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.lastDate = null;
    } else {
      console.error('animation has already stopped');
    }
  };

  /**
   * check animation starts or not
   */
  GLSL.prototype.isAnimating = function() {
    return this.animationId !== null;
  }

  /**
   * render
   */
  GLSL.prototype.render = function() {
    if (this.isAnimating()) {
      this.animationId = requestAnimationFrame(this.render.bind(this));
    }

    if (this.animationId && this.lastDate) {
      this.currentDate = new Date();
      this.time += this.currentDate - this.lastDate;
      this.lastDate = this.currentDate;
    }

    this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'uTime'), this.time * 0.001);
    this.gl.uniform2fv(this.gl.getUniformLocation(this.program, 'uResolution'), [canvas.width, canvas.height]);
    this.gl.uniform2fv(this.gl.getUniformLocation(this.program, 'uMouse'), this.mouse);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'uMousePressed'), this.mousePressed);
    Object.keys(this.uniforms).forEach(function(name) {
      const type = this.uniforms[name].type;
      const value = this.uniforms[name].value;
      this.gl['uniform' + type](this.gl.getUniformLocation(this.program, name), value);
    }, this);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    this.gl.flush();
  };

  /**
   * sets unform value
   */
  GLSL.prototype.setUniform = function(name, type, value) {
    this.uniforms[name] = {
      type: type,
      value: value
    };
  };

  return GLSL;

})();
