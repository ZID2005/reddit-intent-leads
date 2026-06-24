import React, { useEffect, useRef } from 'react';

const VERTEX_SHADER_SOURCE = `
  attribute vec2 position;
  varying vec2 v_uv;
  void main() {
    v_uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  varying vec2 v_uv;

  // Pseudo-random noise functions
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    // Coordinate normalizations
    vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Parallax mouse interaction warp
    vec2 mouseNorm = (u_mouse - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    p += mouseNorm * 0.12;

    // Organic fluid noise sum
    float t = u_time * 0.15;
    float n1 = noise(p * 2.5 + vec2(t * 0.3, t * 0.1));
    float n2 = noise(p * 5.0 - vec2(t * 0.2, t * 0.4));
    float fluid = mix(n1, n2, 0.55);

    // Radar circular sweep moving outwards from center
    float dist = length(p);
    float radar = sin(dist * 6.5 - u_time * 0.7) * 0.5 + 0.5;
    radar = pow(radar, 12.0); // Narrower, sharper sweep band
    radar *= exp(-dist * 1.8); // Attenuate sweep towards edges

    // Pulsing sweep brightness
    float pulse = sin(u_time * 0.5) * 0.5 + 0.5;
    float intensity = fluid * 0.035 + radar * 0.09 * (0.3 + 0.7 * pulse);

    // Colors
    vec3 carbonBg = vec3(0.02745, 0.02745, 0.03137); // #070708
    vec3 voltLime = vec3(0.77647, 1.0, 0.20392);    // #C6FF34

    vec3 finalColor = mix(carbonBg, voltLime, intensity);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function ShaderHeroBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.warn("WebGL not supported, falling back to static background.");
      return;
    }

    // Helper to compile shaders
    const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Vertex buffer setup
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');

    let animationFrameId = 0;
    let startTime = Date.now();
    let isPaused = false;

    // Responsive Canvas Resizing
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let width = parent.clientWidth;
      let height = parent.clientHeight;

      // Mobile check: Cap resolution at 900px width/height for performance
      if (window.innerWidth < 768) {
        const maxResolution = 900;
        const scale = Math.min(1, maxResolution / Math.max(width, height));
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    // Initialize dimensions
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pointer event tracks mouse positions (normalized to canvas resolution)
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = rect.height - (e.clientY - rect.top); // WebGL coordinates start from bottom-left
      mouseRef.current = { x, y };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const render = () => {
      if (isPaused) return;

      const elapsed = (Date.now() - startTime) / 1000.0;

      gl.uniform1f(uTimeLoc, elapsed);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      
      // Interpolate mouse coordinates slightly for smoother movements (damping)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.uniform2f(
        uMouseLoc,
        mouseRef.current.x * dpr,
        mouseRef.current.y * dpr
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(render);
    };

    // Start rendering
    render();

    // Document Visibility Handler (Pause on Hidden tab)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      } else {
        isPaused = false;
        // Adjust startTime to prevent sudden skips in animations
        if (uTimeLoc) {
          startTime = Date.now() - (gl.getUniform(program, uTimeLoc) || 0) * 1000;
        } else {
          startTime = Date.now();
        }
        render();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: 'screen', opacity: 0.85 }}
    />
  );
}

export default ShaderHeroBg;
