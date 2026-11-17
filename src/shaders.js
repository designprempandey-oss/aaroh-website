// Minimal WebGL2 runtime for the two Framer shader effects used on the page
// ("Wave Gradient" and "Liquid Gradient"). The fragment sources are the exact
// GLSL Framer ships; this file recreates the preamble/uniform plumbing.
import waveFrag from './shaders/wave-gradient.frag.glsl?raw'
import liquidFrag from './shaders/liquid-gradient.frag.glsl?raw'

const SOURCES = {
  wave: { frag: waveFrag, maxColors: 4, resolutionScale: 1 },
  liquid: { frag: liquidFrag, maxColors: 8, resolutionScale: 1 },
}

const VERT = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_uv;
void main() {
  v_uv = a_texCoord;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

function buildFragment(body, maxColors) {
  const names = new Set(body.match(/\bu_[A-Za-z0-9_]+/g) || [])
  const decl = []
  for (const n of names) {
    if (n === 'u_colors' || n === 'u_colors_length') continue
    if (n === 'u_resolution') decl.push('uniform vec2 u_resolution;')
    else if (n === 'u_mousePosition') decl.push('uniform vec4 u_mousePosition;')
    else decl.push(`uniform float ${n};`)
  }
  if (names.has('u_colors')) decl.push(`uniform vec4 u_colors[${maxColors}];`, 'uniform int u_colors_length;')
  return `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
${decl.join('\n')}
${body}`
}

function parseColor(str) {
  const m = String(str).match(/rgba?\(([^)]+)\)/)
  if (!m) return [0, 0, 0, 1]
  const [r, g, b, a = 1] = m[1].split(',').map((v) => parseFloat(v))
  return [r / 255, g / 255, b / 255, a]
}

function compile(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(log)
  }
  return s
}

class ShaderCanvas {
  constructor(canvas) {
    this.canvas = canvas
    const kind = SOURCES[canvas.dataset.shader]
    const uniforms = JSON.parse(canvas.dataset.uniforms || '{}')
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    this.scale = kind.resolutionScale

    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, buildFragment(kind.frag, kind.maxColors)))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    gl.useProgram(prog)
    this.prog = prog

    const quad = (data, name) => {
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    }
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    quad([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1], 'a_position')
    quad([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1], 'a_texCoord')

    // Static uniforms
    for (const [name, value] of Object.entries(uniforms)) {
      if (name === 'u_colors') {
        const flat = new Float32Array(kind.maxColors * 4)
        value.slice(0, kind.maxColors).forEach((c, i) => flat.set(parseColor(c), i * 4))
        gl.uniform4fv(gl.getUniformLocation(prog, 'u_colors'), flat)
        gl.uniform1i(gl.getUniformLocation(prog, 'u_colors_length'), Math.min(value.length, kind.maxColors))
      } else {
        const loc = gl.getUniformLocation(prog, name)
        if (loc) gl.uniform1f(loc, Number(value))
      }
    }
    this.uTime = gl.getUniformLocation(prog, 'u_time')
    this.uRes = gl.getUniformLocation(prog, 'u_resolution')
    this.uPR = gl.getUniformLocation(prog, 'u_pixelRatio')
    this.start = performance.now()
    this.visible = false
    this.raf = 0
    this.loop = this.loop.bind(this)
  }

  resize() {
    const { canvas, gl } = this
    const pr = Math.max(Math.min(window.devicePixelRatio || 1, 2) * this.scale, 1)
    const w = Math.max(1, Math.round(canvas.clientWidth * pr))
    const h = Math.max(1, Math.round(canvas.clientHeight * pr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    this.pixelRatio = pr
  }

  draw() {
    const { gl } = this
    this.resize()
    gl.uniform1f(this.uTime, (performance.now() - this.start) / 1000)
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height)
    if (this.uPR) gl.uniform1f(this.uPR, this.pixelRatio)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  loop() {
    this.draw()
    if (this.visible) this.raf = requestAnimationFrame(this.loop)
  }

  setVisible(v) {
    if (v === this.visible) return
    this.visible = v
    cancelAnimationFrame(this.raf)
    if (v) this.raf = requestAnimationFrame(this.loop)
  }
}

export function initShaders() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.__shader?.setVisible(e.isIntersecting && !reduce)
  }, { rootMargin: '100px' })

  document.querySelectorAll('canvas[data-shader]').forEach((canvas) => {
    // Fallback still image (same one Framer uses) sits behind the canvas until the first frame.
    let fb = canvas.dataset.fallback
    if (fb?.startsWith('/')) fb = import.meta.env.BASE_URL.replace(/\/$/, '') + fb
    if (fb) {
      canvas.parentElement.style.backgroundImage = `url("${fb}")`
      canvas.parentElement.style.backgroundSize = 'cover'
      canvas.parentElement.style.backgroundPosition = 'center'
    }
    try {
      const s = new ShaderCanvas(canvas)
      canvas.__shader = s
      s.draw()
      io.observe(canvas)
    } catch (err) {
      console.warn('[shader] falling back to static image:', err.message)
      canvas.remove()
    }
  })
}
