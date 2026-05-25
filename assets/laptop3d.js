/**
 * laptop3d.js – v16
 * MacBook Pro 3D floating — iframe overlay ON TOP of WebGL canvas
 *
 * Architecture (simple, reliable):
 *   1. WebGL canvas (z-index:1)  — renders laptop model (screen glass hidden)
 *   2. iframeOverlay (z-index:2) — positioned each frame to match projected screen area
 *
 * Each frame the 8 bounding-box corners of Cube008_2 are projected to 2-D
 * container pixels; the iframeOverlay is positioned inside that rectangle.
 * The iframe content (1280×800) is CSS-scaled to fill the rectangle.
 * No occluder tricks, no CSS3DRenderer needed.
 */
import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  const container = document.getElementById('laptop-scene-container');
  if (!container) return;

  /* ── Canvas / scene dimensions ───────────────────── */
  const H_SCENE = 440;
  const getW    = () => container.clientWidth || 500;
  let   cw      = getW();

  /* ── iframe viewport size (layout resolution of embedded site) */
  const PX_W = 1280, PX_H = 800;

  /* ── Three.js scene ──────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, cw / H_SCENE, 0.01, 200);
  camera.position.set(0, 0.5, 4.5);
  camera.lookAt(0, 0.5, 0);

  /* ── WebGL renderer (alpha:true → transparent background) ─ */
  const webRend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  webRend.setSize(cw, H_SCENE);
  webRend.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  webRend.setClearColor(0x000000, 0);
  Object.assign(webRend.domElement.style, {
    position:      'absolute', top: '0', left: '0',
    width:         '100%', height: '100%',
    pointerEvents: 'none',
    zIndex:        '1',
  });
  container.appendChild(webRend.domElement);   // WebGL canvas first → z-index 1

  /* ── iframe overlay (appended AFTER canvas → sits on top, z-index:2) ──── */
  const iframeOverlay = document.createElement('div');
  Object.assign(iframeOverlay.style, {
    position:      'absolute',
    top:           '0', left: '0',
    width:         '1px', height: '1px',   // sized each frame via JS
    overflow:      'hidden',
    visibility:    'hidden',               // shown after GLB loads
    pointerEvents: 'auto',
    zIndex:        '2',                    // on top of WebGL canvas
    borderRadius:  '2px',
  });
  container.appendChild(iframeOverlay);        // appended AFTER canvas → on top

  const siteIframe = document.createElement('iframe');
  siteIframe.src = 'https://grkproject.com.br';
  Object.assign(siteIframe.style, {
    position:        'absolute',
    top:             '0', left: '0',
    width:           PX_W + 'px',
    height:          PX_H + 'px',
    border:          'none',
    transformOrigin: '0 0',
    pointerEvents:   'auto',
  });
  iframeOverlay.appendChild(siteIframe);

  /* ── Lighting ──────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const pt = new THREE.PointLight(0xffffff, 1.5);
  pt.position.set(10, 10, 10);
  scene.add(pt);
  const fill = new THREE.DirectionalLight(0xb0c8f0, 0.5);
  fill.position.set(-5, 5, -5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd090, 0.3);
  rim.position.set(5, -2, 5);
  scene.add(rim);

  /* ── Group hierarchy ─────────────────────────────────────────────────
   *  laptopWrapper  static  – no rotation (screen faces +Z = our camera)
   *    └─ laptopGroup  animated  – receives float animation
   *         └─ gltf.scene        – scaled to fit 440 px section
   */
  const laptopWrapper = new THREE.Group();
  laptopWrapper.position.set(0, 0, 0);
  scene.add(laptopWrapper);

  const laptopGroup = new THREE.Group();
  laptopWrapper.add(laptopGroup);

  /* ── Mesh references ─────────────────────────────── */
  let screenMesh = null;    // Cube008_2 — screen glass pane (used for projection)

  /* ── Load GLB ────────────────────────────────────── */
  const draco = new DRACOLoader();
  draco.setDecoderPath(
    'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/'
  );
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load('/assets/mac-draco.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.28);
    laptopGroup.add(model);

    /* Open lid: screenflip hinge rotation */
    const hinge = model.getObjectByName('screenflip')
               ?? model.getObjectByName('Cube008')?.parent?.parent
               ?? null;
    if (hinge) hinge.rotation.x = -0.425;

    /* Screen glass: hide from WebGL render — iframe overlay will fill this area */
    screenMesh = model.getObjectByName('Cube008_2');
    if (screenMesh) {
      screenMesh.visible = false;          // hidden → iframe shows on top in its place
      screenMesh.geometry.computeBoundingBox();
    }

    /* Reveal iframe now that we know where the screen is */
    iframeOverlay.style.visibility = 'visible';

  }, undefined, err => console.error('[laptop3d]', err));

  /* ── 2-D projection: project screen mesh to container pixels ─────────
   *  Projects all 8 bounding-box corners of Cube008_2, takes the
   *  2-D axis-aligned bounding rect, and sizes/positions the iframeOverlay
   *  to match. The iframe (1280×800) is then CSS-scaled to fill the rect.
   */
  const _v = new THREE.Vector3();

  function syncIframeOverlay () {
    if (!screenMesh || !screenMesh.geometry.boundingBox) return;

    laptopWrapper.updateMatrixWorld(true);
    const bb  = screenMesh.geometry.boundingBox;
    const mat = screenMesh.matrixWorld;

    /* Project all 8 corners of the local bounding box */
    let minX = Infinity, maxX = -Infinity,
        minY = Infinity, maxY = -Infinity;

    const xs = [bb.min.x, bb.max.x];
    const ys = [bb.min.y, bb.max.y];
    const zs = [bb.min.z, bb.max.z];

    for (const lx of xs) for (const ly of ys) for (const lz of zs) {
      _v.set(lx, ly, lz).applyMatrix4(mat).project(camera);
      const px = ( _v.x * 0.5 + 0.5) * cw;
      const py = (-_v.y * 0.5 + 0.5) * H_SCENE;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }

    /* Clamp to container */
    minX = Math.max(0, minX);
    minY = Math.max(0, minY);
    maxX = Math.min(cw,      maxX);
    maxY = Math.min(H_SCENE, maxY);

    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return;

    /* Scale iframe (1280×800 viewport) to fit the projected rectangle */
    const scaleX = w / PX_W;
    const scaleY = h / PX_H;

    Object.assign(iframeOverlay.style, {
      left:   minX + 'px',
      top:    minY + 'px',
      width:  w    + 'px',
      height: h    + 'px',
    });

    /* CSS scale: visually shrinks the iframe to fit the laptop screen area */
    siteIframe.style.transform       = `scale(${scaleX}, ${scaleY})`;
    siteIframe.style.transformOrigin = '0 0';
  }

  /* ── Float animation (verbatim from pmndrs App.jsx useFrame) ────────── */
  const clock = new THREE.Clock();

  (function loop () {
    requestAnimationFrame(loop);

    const t = clock.getElapsedTime();
    laptopGroup.rotation.x = THREE.MathUtils.lerp(
      laptopGroup.rotation.x, Math.cos(t / 2) / 20 + 0.25, 0.1);
    laptopGroup.rotation.y = THREE.MathUtils.lerp(
      laptopGroup.rotation.y, Math.sin(t / 4) / 20, 0.1);
    laptopGroup.rotation.z = THREE.MathUtils.lerp(
      laptopGroup.rotation.z, Math.sin(t / 8) / 20, 0.1);
    laptopGroup.position.y = THREE.MathUtils.lerp(
      laptopGroup.position.y, (-2 + Math.sin(t / 2)) / 2 + 1, 0.1);

    syncIframeOverlay();
    webRend.render(scene, camera);
  })();

  /* ── Resize ──────────────────────────────────────── */
  window.addEventListener('resize', () => {
    cw = getW();
    camera.aspect = cw / H_SCENE;
    camera.updateProjectionMatrix();
    webRend.setSize(cw, H_SCENE);
  });
})();
