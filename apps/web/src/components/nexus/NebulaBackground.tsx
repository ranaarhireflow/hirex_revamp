import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Volumetric nebula + galactic-disk particles + wireframe drifters.
 * Renders a single fixed full-viewport Three.js canvas behind all UI.
 * - Nebula: fullscreen plane with 6-octave fbm noise shader, blending
 *   cyan / violet / magenta over near-black with vignette + mouse spot.
 * - Particles: ~4000 points on a squashed disk, additive blending.
 * - Drifters: 3 wireframe geometries (icosahedron, octahedron, torus),
 *   slow rotation, low opacity.
 *
 * The whole scene parallaxes subtly with cursor + scroll.
 */
export default function NebulaBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x02030a, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '0';
    renderer.domElement.style.pointerEvents = 'none';

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02030a, 0.04);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 22);

    // ----- Nebula full-screen plane (orthographic-ish; we'll keep camera-aligned)
    const nebulaGeom = new THREE.PlaneGeometry(2, 2);
    const nebulaMat = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      transparent: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;

        float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash21(i);
          float b = hash21(i + vec2(1.0, 0.0));
          float c = hash21(i + vec2(0.0, 1.0));
          float d = hash21(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 6; i++) {
            v += a * noise2(p);
            p *= 2.05;
            a *= 0.5;
          }
          return v;
        }
        void main() {
          vec2 uv = vUv;
          float ar = uResolution.x / uResolution.y;
          vec2 p = vec2((uv.x - 0.5) * ar, uv.y - 0.5);

          float n = fbm(p * 2.2 + vec2(uTime * 0.02, uTime * 0.015));
          float m = fbm(p * 4.0 - vec2(uTime * 0.03, 0.0));

          vec3 cyan    = vec3(0.37, 0.91, 1.00);
          vec3 violet  = vec3(0.61, 0.42, 1.00);
          vec3 magenta = vec3(1.00, 0.31, 0.85);
          vec3 dark    = vec3(0.008, 0.012, 0.040);

          vec3 col = dark;
          col = mix(col, violet, smoothstep(0.30, 0.70, n) * 0.65);
          col = mix(col, cyan, smoothstep(0.55, 0.85, m) * 0.25);
          col += magenta * pow(n * m, 2.2) * 0.55;

          // mouse warm spot
          float md = distance(uv, uMouse);
          col += cyan * exp(-md * 6.0) * 0.25;

          // vignette
          float d = distance(uv, vec2(0.5));
          col *= smoothstep(0.95, 0.20, d);

          // slight grain via hash
          col += (hash21(uv * 800.0) - 0.5) * 0.02;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const nebulaScene = new THREE.Scene();
    const nebulaCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const nebulaMesh = new THREE.Mesh(nebulaGeom, nebulaMat);
    nebulaScene.add(nebulaMesh);

    // ----- Galactic disk particles
    const PARTICLE_COUNT = window.innerWidth < 768 ? 1800 : 4200;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colCyan = new THREE.Color(0x5ee9ff);
    const colViolet = new THREE.Color(0x9b6bff);
    const colMagenta = new THREE.Color(0xff4fd8);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = Math.pow(Math.random(), 0.5) * 28;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * (4 - r * 0.08);
      positions[i * 3 + 0] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
      const t = Math.random();
      const c = t < 0.5 ? colCyan : t < 0.85 ? colViolet : colMagenta;
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 1.2 + 0.4;
    }
    const partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    partGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    partGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const partMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * (300.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d);
          if (r > 0.5) discard;
          float a = smoothstep(0.5, 0.0, r);
          gl_FragColor = vec4(vColor, a);
        }
      `,
      vertexColors: true,
    });
    const points = new THREE.Points(partGeom, partMat);
    scene.add(points);

    // ----- Wireframe drifters
    const drifters: THREE.LineSegments[] = [];
    function makeDrifter(geom: THREE.BufferGeometry, color: number, pos: THREE.Vector3, scale: number) {
      const edges = new THREE.EdgesGeometry(geom);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.18 });
      const seg = new THREE.LineSegments(edges, mat);
      seg.position.copy(pos);
      seg.scale.setScalar(scale);
      scene.add(seg);
      drifters.push(seg);
    }
    makeDrifter(new THREE.IcosahedronGeometry(1, 0), 0x5ee9ff, new THREE.Vector3(-8, 2, -3), 3);
    makeDrifter(new THREE.OctahedronGeometry(1, 0), 0x9b6bff, new THREE.Vector3(9, -3, -6), 2.5);
    makeDrifter(new THREE.TorusGeometry(1, 0.34, 8, 24), 0xff4fd8, new THREE.Vector3(4, 5, -8), 2);

    // ----- Interaction tracking
    const mouse = { x: 0.5, y: 0.5, raw: { x: 0, y: 0 } };
    let scrollY = 0;
    function onMove(e: MouseEvent) {
      mouse.raw.x = e.clientX;
      mouse.raw.y = e.clientY;
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = 1 - e.clientY / window.innerHeight;
    }
    function onScroll() { scrollY = window.scrollY; }
    function onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      nebulaMat.uniforms.uResolution.value.set(w, h);
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // ----- Animation loop
    let rafId = 0;
    const clock = new THREE.Clock();
    let camX = 0, camY = 0;
    function tick() {
      const t = clock.getElapsedTime();
      nebulaMat.uniforms.uTime.value = t;
      nebulaMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      partMat.uniforms.uTime.value = t;

      // Slow disk rotation + parallax follow
      points.rotation.y = t * 0.025;
      const targetX = (mouse.x - 0.5) * 2;
      const targetY = (mouse.y - 0.5) * 1.5 + scrollY * 0.001;
      camX += (targetX - camX) * 0.04;
      camY += (targetY - camY) * 0.04;
      camera.position.x = camX;
      camera.position.y = -camY;
      camera.lookAt(0, 0, 0);

      drifters.forEach((d, i) => {
        d.rotation.x = t * (0.07 + i * 0.02);
        d.rotation.y = t * (0.10 - i * 0.015);
      });

      renderer.autoClear = false;
      renderer.clear();
      renderer.render(nebulaScene, nebulaCam);
      renderer.clearDepth();
      renderer.render(scene, camera);

      rafId = requestAnimationFrame(tick);
    }
    tick();

    // ----- Cleanup
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.domElement.remove();
      renderer.dispose();
      partGeom.dispose();
      partMat.dispose();
      nebulaGeom.dispose();
      nebulaMat.dispose();
      drifters.forEach((d) => {
        d.geometry.dispose();
        (d.material as THREE.Material).dispose();
      });
    };
  }, []);

  return <div ref={containerRef} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}
