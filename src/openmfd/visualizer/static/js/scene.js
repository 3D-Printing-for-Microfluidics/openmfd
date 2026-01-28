import * as THREE from '../lib/three/three.module.js';
import { OrbitControls } from '../lib/three/controls/OrbitControls.js';

export function createScene() {
  const scene = new THREE.Scene();

  const world = new THREE.Group();
  scene.add(world);
  world.rotation.x = -Math.PI / 2;

  const axes = new THREE.AxesHelper(100);
  axes.position.set(-0.0001, -0.0001, -0.0001);
  world.add(axes);

  const perspectiveCamera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(perspectiveCamera, renderer.domElement);

  return {
    THREE,
    scene,
    world,
    axes,
    renderer,
    controls,
    perspectiveCamera,
    orthographicCamera,
  };
}
