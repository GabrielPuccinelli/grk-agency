/**
 * laptop3d.js – v17
 * MacBook Pro 3D floating — grk-screen.jpg como textura na tela
 */
import * as THREE from 'three';
import { GLTFLoader }  from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

(function () {
  const container = document.getElementById('laptop-scene-container');
  if (!container) return;

  const H_SCENE = 440;
  const getW    = () => container.clientWidth || 500;
  let   cw      = getW();

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
    pointerEvents: 'none', zIndex: '1',
  });
  container.appendChild(webRend.domElement);

  /* Textura da tela */
  const texLoader = new THREE.TextureLoader();
  const screenTex = texLoader.load('/assets/grk-screen.jpg');
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.flipY = false;

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

  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/libs/draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  loader.load('/assets/mac-draco.glb', (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.28);
    laptopGroup.add(model);

    const hinge = model.getObjectByName('screenflip')
               ?? model.getObjectByName('Cube008')?.parent?.parent
               ?? null;
    if (hinge) hinge.rotation.x = -0.425;

    const screenMesh = model.getObjectByName('Cube008_2');
    if (screenMesh) {
      const applyTex = (mat) => {
        mat.map               = screenTex;
        mat.emissiveMap       = screenTex;
        mat.emissive          = new THREE.Color(0.6, 0.6, 0.6);
        mat.emissiveIntensity = 1;
        mat.roughness         = 0.1;
        mat.metalness         = 0.0;
        mat.needsUpdate       = true;
      };
      if (Array.isArray(screenMesh.material)) {
        screenMesh.material.forEach(applyTex);
      } else {
        applyTex(screenMesh.material);
      }
      screenMesh.visible = true;
    }
  }, undefined, err => console.error('[laptop3d]', err));

  const clock = new THREE.Clock();
  (function loop () {
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    laptopGroup.rotation.x = THREE.MathUtils.lerp(laptopGroup.rotation.x, Math.cos(t / 2) / 20 + 0.25, 0.1);
    laptopGroup.rotation.y = THREE.MathUtils.lerp(laptopGroup.rotation.y, Math.sin(t / 4) / 20, 0.1);
    laptopGroup.rotation.z = THREE.MathUtils.lerp(laptopGroup.rotation.z, Math.sin(t / 8) / 20, 0.1);
    laptopGroup.position.y = THREE.MathUtils.lerp(laptopGroup.position.y, (-2 + Math.sin(t / 2)) / 2 + 1, 0.1);
    webRend.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    cw = getW();
    camera.aspect = cw / H_SCENE;
    camera.updateProjectionMatrix();
    webRend.setSize(cw, H_SCENE);
  });
})();
