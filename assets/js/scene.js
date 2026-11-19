/* =========================================================
   Hero 3D — onda di particelle + archi ispirati al logo DC
   ========================================================= */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const hero = document.getElementById('hero');

if (canvas && hero) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 760px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050d22, 0.045);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.2, 9);

  /* ---------- Luci ---------- */
  scene.add(new THREE.AmbientLight(0x2b4a8a, 0.9));
  const key = new THREE.PointLight(0x6fd3ff, 60, 30);
  key.position.set(4, 4, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x2079d4, 80, 30);
  rim.position.set(-5, 2, -2);
  scene.add(rim);
  const teal = new THREE.PointLight(0x34d7b3, 25, 20);
  teal.position.set(2, -3, 3);
  scene.add(teal);

  /* ---------- Onda di particelle ---------- */
  const COLS = isMobile ? 110 : 200;
  const ROWS = isMobile ? 60 : 100;
  const waveGeo = new THREE.PlaneGeometry(34, 18, COLS, ROWS);
  waveGeo.rotateX(-Math.PI / 2);

  const waveMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uColorA: { value: new THREE.Color(0x1a5fb4) },
      uColorB: { value: new THREE.Color(0x6fd3ff) },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uPixelRatio;
      varying float vH;
      varying float vFade;
      void main() {
        vec3 p = position;
        float t = uTime * 0.45;
        float h = sin(p.x * 0.35 + t) * 0.55
                + sin(p.z * 0.55 + t * 1.3) * 0.35
                + sin((p.x + p.z) * 0.22 - t * 0.8) * 0.45
                + sin(length(p.xz - vec2(uMouse.x * 8.0, -uMouse.y * 4.0)) * 0.9 - t * 2.0) * 0.12;
        p.y += h;
        vH = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.2 + h * 1.2) * uPixelRatio * (9.0 / -mv.z);
        vFade = smoothstep(17.0, 4.0, -mv.z);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying float vH;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, clamp(vH * 0.7 + 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, a * vFade * 0.85);
      }
    `,
  });
  const wave = new THREE.Points(waveGeo, waveMat);
  wave.position.set(0, -2.6, -3);
  scene.add(wave);

  /* ---------- Archi (motivo del logo) ---------- */
  const arches = new THREE.Group();
  const archMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a86e0,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    emissive: 0x0b2a66,
    emissiveIntensity: 0.6,
  });
  const archMatLight = archMat.clone();
  archMatLight.color = new THREE.Color(0x6fd3ff);
  archMatLight.emissive = new THREE.Color(0x1a5fb4);

  // archi concentrici (come nel logo) con pilastri verticali
  const ARCH_COUNT = 5;
  for (let i = 0; i < ARCH_COUNT; i++) {
    const r = 1.1 + i * 0.36;
    const tube = 0.075 - i * 0.006;
    const geo = new THREE.TorusGeometry(r, tube, 24, 160, Math.PI);
    const mesh = new THREE.Mesh(geo, i % 2 ? archMatLight : archMat);
    mesh.position.z = -i * 0.28;
    arches.add(mesh);

    // gambe dell'arco
    const legGeo = new THREE.CylinderGeometry(tube, tube, 1.6, 16);
    [-r, r].forEach((x) => {
      const leg = new THREE.Mesh(legGeo, mesh.material);
      leg.position.set(x, -0.8, mesh.position.z);
      arches.add(leg);
    });
  }

  // "tiranti" verticali sotto l'arco interno (ricordano le linee del logo)
  const stripes = 7;
  const inner = 1.1;
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x3b9cf0, emissive: 0x1a5fb4, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.3 });
  for (let i = 1; i < stripes; i++) {
    const x = -inner + (2 * inner * i) / stripes;
    const top = Math.sqrt(Math.max(inner * inner - x * x, 0));
    const h = top + 1.6;
    const g = new THREE.CylinderGeometry(0.022, 0.022, h, 8);
    const m = new THREE.Mesh(g, stripeMat);
    m.position.set(x, top - h / 2, 0);
    arches.add(m);
  }

  // anello di luce / alone
  const haloGeo = new THREE.RingGeometry(2.9, 3.0, 128);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.z = -1.6;
  arches.add(halo);

  arches.scale.setScalar(isMobile ? 0.8 : 1);
  scene.add(arches);

  /* ---------- Polvere luminosa ---------- */
  const DUST = isMobile ? 250 : 600;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 24;
    dustPos[i * 3 + 1] = (Math.random() - 0.3) * 12;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x9fdcff, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  /* ---------- Layout responsive ---------- */
  function layout() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const narrow = w < 980;
    // desktop: archi a destra del testo; su schermi stretti restano solo onda e particelle
    arches.visible = !narrow && hero.dataset.arches !== 'off';
    arches.position.set(3.3, 0.7, 0);
  }
  layout();
  window.addEventListener('resize', layout);

  /* ---------- Input ---------- */
  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scrollP = 0;
  window.addEventListener('scroll', () => {
    scrollP = Math.min(window.scrollY / hero.clientHeight, 1);
  }, { passive: true });

  /* ---------- Loop ---------- */
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);

  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    mouse.lerp(target, 0.05);

    waveMat.uniforms.uTime.value = t;
    waveMat.uniforms.uMouse.value.copy(mouse);

    arches.rotation.y = -0.45 + mouse.x * 0.35 + Math.sin(t * 0.3) * 0.08;
    arches.rotation.x = 0.08 + mouse.y * 0.15;
    arches.position.y += (0.7 + Math.sin(t * 0.8) * 0.12 - arches.position.y) * 0.05;
    halo.rotation.z = t * 0.1;

    dust.rotation.y = t * 0.02;
    dust.position.y = Math.sin(t * 0.2) * 0.2;

    // parallax allo scroll: la camera "scende" dentro la scena
    camera.position.y = 1.2 - scrollP * 1.5 + mouse.y * -0.2;
    camera.position.x = mouse.x * 0.4;
    camera.position.z = 9 - scrollP * 2;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    render();
  } else {
    renderer.setAnimationLoop(() => { if (visible) render(); });
  }
}
