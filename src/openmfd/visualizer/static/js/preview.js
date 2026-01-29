import * as THREE from '../lib/three/three.module.js';
import { OrbitControls } from '../lib/three/controls/OrbitControls.js';

export function createPreviewSystem({ scene, controls: initialControls, cameraSystem }) {
  let controls = initialControls;
  let dialogViewer = null;
  let previewRenderer = null;
  let previewCamera = null;
  let previewControls = null;
  let isOpen = false;

  function ensureRenderer() {
    if (!dialogViewer) return;
    if (!previewRenderer) {
      previewRenderer = new THREE.WebGLRenderer({ antialias: true });
      previewRenderer.setPixelRatio(window.devicePixelRatio || 1);
      dialogViewer.appendChild(previewRenderer.domElement);
      previewRenderer.domElement.style.display = 'block';
      previewRenderer.domElement.style.width = '100%';
      previewRenderer.domElement.style.height = '100%';
      previewCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
      previewControls = new OrbitControls(previewCamera, previewRenderer.domElement);
      previewControls.enableDamping = true;
      previewControls.dampingFactor = 0.08;
    } else if (previewRenderer.domElement.parentElement !== dialogViewer) {
      dialogViewer.appendChild(previewRenderer.domElement);
    }
  }

  function bindViewer(viewerEl) {
    dialogViewer = viewerEl;
    if (isOpen) {
      ensureRenderer();
      syncFromMain();
      updateSize();
    }
  }

  function updateSize() {
    if (!previewRenderer || !previewCamera || !dialogViewer) return;
    const rect = dialogViewer.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    previewRenderer.setSize(width, height);
    previewCamera.aspect = width / height;
    previewCamera.updateProjectionMatrix();
  }

  function syncFromMain() {
    if (!previewCamera || !previewControls) return;
    const activeCamera = cameraSystem.getCamera();
    previewCamera.position.copy(activeCamera.position);
    if (controls?.target) {
      previewControls.target.copy(controls.target);
    }
    previewCamera.lookAt(previewControls.target);
    previewCamera.updateProjectionMatrix();
    previewControls.update();
    cameraSystem.updateCameraHelper();
  }

  function setOpen(open) {
    isOpen = open;
    if (open) {
      ensureRenderer();
      syncFromMain();
      updateSize();
    }
  }

  function render() {
    if (!isOpen || !previewRenderer || !previewCamera || !previewControls) return;
    previewControls.update();
    cameraSystem.updateCameraHelper();
    previewRenderer.render(scene, previewCamera);
  }

  return {
    bindViewer,
    updateSize,
    syncFromMain,
    setOpen,
    render,
    setControls: (nextControls) => {
      controls = nextControls;
      if (isOpen) {
        syncFromMain();
      }
    },
  };
}
