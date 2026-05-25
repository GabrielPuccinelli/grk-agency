/**
 * laptop3d.js – v22
 * Restaurado do v16 (que funcionava) com 2 fixes:
 *  1. window !== window.top  — evita loop infinito no iframe
 *  2. window.location.origin — URL dinamica, funciona em qualquer dominio
 *  3. syncIframeOverlay apos render — camera matrices atualizadas
 */
import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  /* Fix 1: nao rodar dentro do proprio iframe */
  if (window !== window.top) return;

  const container = document.getElementById('laptop-scene-container');
  if (!container) return;

  const H_SCENE = 440;
  const getW    = () => container.clientWidth || 500;
  let   cw      = getW();

  const PX_W = 1280, PX_H = 800;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, cw / H_SCENE, 0.01, 200);
  camera.position.set(0, 0.5, 4.5);
  camera.lookAt(0, 0.5, 0);

  const webRend = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  webRend.setSize(cw, H_SCENE);
  webRend.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  webRend.setClearColor(0x000000, 0);
  Object.assign(webRend.domElement.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: '1',
  });
  container.appendChild(webRend.domElement);

  /* iframe overlay */
  const iframeOverlay = document.createElement('div');
  Object.assign(iframeOverlay.style, {
    position:      'absolute',
    top:           '0', left: '0',
    width:         '1px', height: '1px',
    overflow:      'hidden',
    visibility:    'hidden',
    pointerEvents: 'auto',
    zIndex:        '2',
    borderRadius:  '2px',
  });
  container.appendChild(iframeOverlay);

  const siteIframe = document.createElement('iframe');
  /* Fix 2: URL dinamica — mesmo dominio em qualquer ambiente */
  siteIframe.src = window.location.origin + '/';
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

  /* Iluminacao */
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

  const laptopWrapper = new THREE.Group();
  laptopWrapper.position.set(0, 0, 0);
  scene.add(laptopWrapper);
  const laptopGroup = new THREE.Group();
  laptopWrapper.add(laptopGroup);

  let screenMesh = null;

  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load('/assets/mac-draco.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.28);
    laptopGroup.add(model);

    const hinge = model.getObjectByName('screenflip')
               ?? model.getObjectByName('Cube008')?.parent?.parent ?? null;
    if (hinge) hinge.rotation.x = -0.425;

    screenMesh = model.getObjectByName('Cube008_2');
    if (screenMesh) {
      screenMesh.visible = false;
      screenMesh.geometry.computeBoundingBox();
    }
    iframeOverlay.style.visibility = 'visible';

  }, undefined, err => console.error('[laptop3d]', err));

  /* Projecao 2D do mesh da tela */
  const _v = new THREE.Vector3();

  function syncIframeOverlay () {
    if (!screenMesh || !screenMesh.geometry.boundingBox) return;

    laptopWrapper.updateMatrixWorld(true);
    const bb  = screenMesh.geometry.boundingBox;
    const mat = screenMesh.matrixWorld;

    let minX = Infinity, maxX = -Infinity,
        minY = Infinity, maxY = -Infinity;

    for (const lx of [bb.min.x, bb.max.x])
    for (const ly of [bb.min.y, bb.max.y])
    for (const lz of [bb.min.z, bb.max.z]) {
      _v.set(lx, ly, lz).applyMatrix4(mat).project(camera);
      const px = ( _v.x * 0.5 + 0.5) * cw;
      const py = (-_v.y * 0.5 + 0.5) * H_SCENE;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }

    minX = Math.max(0, minX); minY = Math.max(0, minY);
    maxX = Math.min(cw, maxX); maxY = Math.min(H_SCENE, maxY);

    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return;

    Object.assign(iframeOverlay.style, {
      left:   minX + 'px',
      top:    minY + 'px',
      width:  w    + 'px',
      height: h    + 'px',
    });
    siteIframe.style.transform       = `scale(${w / PX_W}, ${h / PX_H})`;
    siteIframe.style.transformOrigin = '0 0';
  }

  /* Animacao */
  const clock = new THREE.Clock();
  (function loop () {
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    laptopGroup.rotation.x = THREE.MathUtils.lerp(laptopGroup.rotation.x, Math.cos(t/2)/20 + 0.25, 0.1);
    laptopGroup.rotation.y = THREE.MathUtils.lerp(laptopGroup.rotation.y, Math.sin(t/4)/20, 0.1);
    laptopGroup.rotation.z = THREE.MathUtils.lerp(laptopGroup.rotation.z, Math.sin(t/8)/20, 0.1);
    laptopGroup.position.y = THREE.MathUtils.lerp(laptopGroup.position.y, (-2 + Math.sin(t/2))/2 + 1, 0.1);

    /* Fix 3: render primeiro, depois sincroniza iframe com camera atualizada */
    webRend.render(scene, camera);
    syncIframeOverlay();
  })();

  window.addEventListener('resize', () => {
    cw = getW();
    camera.aspect = cw / H_SCENE;
    camera.updateProjectionMatrix();
    webRend.setSize(cw, H_SCENE);
  });
})();
