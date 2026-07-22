/* ============================================================
   HTX OTC PIP 看板 — 极光流光背景（原生 WebGL · 零依赖）
   移植自 ogl Aurora 组件的 GLSL，改为 WebGL1 语法以全覆盖
   浅色：白为底 + 淡蓝/灰极光缓慢流动；深色：暗蓝流光
   降级：WebGL 不可用 / prefers-reduced-motion → 纯底色静态
   ============================================================ */
(function () {
  'use strict';

  var VERT = [
    'attribute vec2 position;',
    'void main() { gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    '',
    'uniform float uTime;',
    'uniform float uAmplitude;',
    'uniform vec3 uColorStops[3];',
    'uniform vec2 uResolution;',
    'uniform float uBlend;',
    '',
    'vec3 permute(vec3 x) {',
    '  return mod(((x * 34.0) + 1.0) * x, 289.0);',
    '}',
    '',
    'float snoise(vec2 v){',
    '  const vec4 C = vec4(',
    '      0.211324865405187, 0.366025403784439,',
    '      -0.577350269189626, 0.024390243902439',
    '  );',
    '  vec2 i  = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '',
    '  vec3 p = permute(',
    '      permute(i.y + vec3(0.0, i1.y, 1.0))',
    '    + i.x + vec3(0.0, i1.x, 1.0)',
    '  );',
    '',
    '  vec3 m = max(',
    '      0.5 - vec3(',
    '          dot(x0, x0),',
    '          dot(x12.xy, x12.xy),',
    '          dot(x12.zw, x12.zw)',
    '      ),',
    '      0.0',
    '  );',
    '  m = m * m;',
    '  m = m * m;',
    '',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '',
    '  vec3 g;',
    '  g.x  = a0.x  * x0.x  + h.x  * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'struct ColorStop {',
    '  vec3 color;',
    '  float position;',
    '};',
    '',
    '#define COLOR_RAMP(colors, factor, finalColor) {              \\',
    '  int index = 0;                                            \\',
    '  for (int i = 0; i < 2; i++) {                               \\',
    '     ColorStop currentColor = colors[i];                    \\',
    '     bool isInBetween = currentColor.position <= factor;    \\',
    '     index = int(mix(float(index), float(i), float(isInBetween))); \\',
    '  }                                                         \\',
    '  ColorStop currentColor = colors[index];                   \\',
    '  ColorStop nextColor = colors[index + 1];                  \\',
    '  float range = nextColor.position - currentColor.position; \\',
    '  float lerpFactor = (factor - currentColor.position) / range; \\',
    '  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uResolution;',
    '',
    '  ColorStop colors[3];',
    '  colors[0] = ColorStop(uColorStops[0], 0.0);',
    '  colors[1] = ColorStop(uColorStops[1], 0.5);',
    '  colors[2] = ColorStop(uColorStops[2], 1.0);',
    '',
    '  vec3 rampColor;',
    '  COLOR_RAMP(colors, uv.x, rampColor);',
    '',
    '  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;',
    '  height = exp(height);',
    '  height = (uv.y * 2.0 - height + 0.2);',
    '  float intensity = 0.6 * height;',
    '',
    '  float midPoint = 0.20;',
    '  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);',
    '',
    '  vec3 auroraColor = intensity * rampColor;',
    '',
    '  gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);',
    '}'
  ].join('\n');

  /* 配色：白为主 + 淡蓝/中蓝（浅色，加强版）；暗蓝流光（深色）
     amplitude/blend/speed 均已调高，保证流光肉眼可见 */
  var THEMES = {
    light: { stops: ['#5B8DEF', '#EAF1FB', '#2E63D6'], amplitude: 1.6, blend: 0.8, speed: 1.2 },
    dark: { stops: ['#0A2150', '#123A7A', '#050F28'], amplitude: 1.1, blend: 0.7, speed: 1.0 }
  };

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function compileShader(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function initAurora() {
    var host = document.getElementById('aurora-bg');
    if (!host) return;

    var canvas = document.createElement('canvas');
    var ctxAttrs = { alpha: true, premultipliedAlpha: true, antialias: true };
    var gl = canvas.getContext('webgl', ctxAttrs) || canvas.getContext('experimental-webgl', ctxAttrs);
    if (!gl) { host.dataset.engine = 'css'; return; } /* 降级：CSS 流光球兜底 */

    var vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    /* 全屏三角形（等效 ogl Triangle） */
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var locPos = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(program, 'uTime');
    var uAmplitude = gl.getUniformLocation(program, 'uAmplitude');
    /* 数组 uniform：规范名为 uColorStops[0]，部分驱动不接受裸名（ogl 内部同样用 [0] 约定） */
    var uColorStops = gl.getUniformLocation(program, 'uColorStops[0]') || gl.getUniformLocation(program, 'uColorStops');
    var uResolution = gl.getUniformLocation(program, 'uResolution');
    var uBlend = gl.getUniformLocation(program, 'uBlend');

    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var current = THEMES.light;

    function applyTheme() {
      var key = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      current = THEMES[key];
      var flat = [];
      current.stops.forEach(function (hex) {
        var rgb = hexToRgb(hex);
        flat.push(rgb[0], rgb[1], rgb[2]);
      });
      gl.uniform3fv(uColorStops, new Float32Array(flat));
      gl.uniform1f(uAmplitude, current.amplitude);
      gl.uniform1f(uBlend, current.blend);
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = host.clientWidth || window.innerWidth;
      var h = host.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    }

    host.appendChild(canvas);
    host.dataset.engine = 'webgl';
    applyTheme();
    resize();
    window.addEventListener('resize', resize);

    /* 主题切换联动 */
    new MutationObserver(applyTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    function draw(timeSec) {
      gl.uniform1f(uTime, timeSec * current.speed);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    if (REDUCED) {
      draw(25.0); /* 静态一帧 */
      return;
    }

    var raf = 0;
    var start = performance.now();
    function frame(now) {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    /* 页面隐藏时暂停，省电 */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        start = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAurora);
  } else {
    initAurora();
  }
})();
