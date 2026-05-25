/**
 * laptop3d.js – v20
 * MacBook Pro 3D — iframe navegavel com posicionamento calibrado
 */
import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  /* Nao rodar dentro do proprio iframe */
  if (window !== window.top) return;

  const container = document.getElementById('laptop-scene-container');
  if (!container) return;

  const H_SCENE = 440;
  const getW    = () => container.clientWidth || 500;
  let   cw      = getW();

  /* ── iframe do site navegavel ─────────────────────── */
  const iframeWrap = document.createElement('div');
  Object.assign(iframeWrap.style, {
    position:      'absolute',
    overflow:      'hidden',
    pointerEvents: 'auto',
    zIndex:        '5',
    borderRadius:  '4px',
    background:    '#000',
  });
  container.appendChild(iframeWrap);

  const siteIframe = document.createElement('iframe');
  siteIframe.src = '/';
  siteIframe.scrolling = 'yes';
  Object.assign(siteIframe.style, {
    position:        'absolute',
    top:             '0', left: '0',
    border:          'none',
    transformOrigin: '0 0',
    pointerEvents:   'auto',
    display:         'block',
  });
  iframeWrap.appendChild(siteIframe);

  /* Calibra posicao e tamanho do iframe sobre a tela do notebook */
  function calibrateScreen() {
    const W = getW();

    /* Proporcoes calibradas para o modelo mac-draco.glb
       com camera em (0, 0.5, 4.5) e escala 0.28          */
    const left   = W * 0.215;
    const top    = H_SCENE * 0.045;
    const width  = W * 0.565;
    const height = H_SCENE * 0.620;

    /* Resolucao virtual do iframe: 1280x800 escalada para caber */
    const PX_W = 1280, PX_H = 800;
    const scaleX = width  / PX_W;
    const scaleY = height / PX_H;

    Object.assign(iframeWrap.style, {
      left:   left   + 'px',
      top:    top    + 'px',
      width:  width  + 'px',
      height: height + 'px',
    });
    Object.assign(siteIframe.style, {
      width:     PX_W + 'px',
      height:    PX_H + 'px',
      transform: `scale(${scaleX},${scaleY})`,
    });
  }
  calibrateScreen();

  /* ── Three.js / WebGL ────────────────────────────── */
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
    zIndex: '10',           /* laptop por CIMA do iframe */
  });
  container.appendChild(webRend.domElement);

  /* Iluminacao */
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const pt = new THREE.PointLight(0xffffff, 1.5);
  pt.position.set(10, 10, 10);
  scene.add(pt);
  scene.add(Object.assign(new THREE.DirectionalLight(0xb0c8f0, 0.5), { position: { x:-5,y:5,z:-5 } }));
  scene.add(Object.assign(new THREE.DirectionalLight(0xffd090, 0.3), { position: { x:5,y:-2,z:5 } }));

  const laptopWrapper = new THREE.Group();
  scene.add(laptopWrapper);
  const laptopGroup = new THREE.Group();
  laptopWrapper.add(laptopGroup);

  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load('/assets/mac-draco.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.28);
    laptopGroup.add(model);

    /* Abre tampa */
    const hinge = model.getObjectByName('screenflip')
               ?? model.getObjectByName('Cube008')?.parent?.parent ?? null;
    if (hinge) hinge.rotation.x = -0.425;

    /* Torna a tela transparente para o iframe aparecer atras */
    const screenMesh = model.getObjectByName('Cube008_2');
    if (screenMesh) {
      const makeTrans = (mat) => {
        mat.transparent = true;
        mat.opacity     = 0;
        mat.needsUpdate = true;
      };
      if (Array.isArray(screenMesh.material)) screenMesh.material.forEach(makeTrans);
      else makeTrans(screenMesh.material);
    }
  }, undefined, err => console.error('[laptop3d]', err));

  /* Animacao de flutuacao */
  const clock = new THREE.Clock();
  (function loop () {
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    laptopGroup.rotation.x = THREE.MathUtils.lerp(laptopGroup.rotation.x, Math.cos(t/2)/20 + 0.25, 0.1);
    laptopGroup.rotation.y = THREE.MathUtils.lerp(laptopGroup.rotation.y, Math.sin(t/4)/20, 0.1);
    laptopGroup.rotation.z = THREE.MathUtils.lerp(laptopGroup.rotation.z, Math.sin(t/8)/20, 0.1);
    laptopGroup.position.y = THREE.MathUtils.lerp(laptopGroup.position.y, (-2 + Math.sin(t/2))/2 + 1, 0.1);
    webRend.render(scene, camera);
  })();

  /* Resize */
  window.addEventListener('resize', () => {
    cw = getW();
    camera.aspect = cw / H_SCENE;
    camera.updateProjectionMatrix();
    webRend.setSize(cw, H_SCENE);
    calibrateScreen();
  });
})();
