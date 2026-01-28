import * as THREE from '../lib/three/three.module.js';

const CAMERA_STORAGE_KEY = 'openmfd_cameras_v1';
const MAX_CAMERAS = 5;

export function createCameraSystem({
  scene,
  world,
  controls,
  perspectiveCamera,
  orthographicCamera,
  getFrameBox,
  getBoundingBoxScene,
  buildVisibleGroup,
  onCameraChange,
}) {
  let cameraMode = 'perspective';
  let orthoState = null;
  let camera = perspectiveCamera;
  let camerasState = [];
  let activeCameraIndex = 0;
  let isApplyingCameraState = false;
  let isHomeMode = false;

  let cameraListEl = null;
  let cameraStripEl = null;
  let cameraModeBtn = null;
  let inputs = null;

  let cameraHelper = null;
  let cameraHelperVisible = false;
  let cameraHelperRef = null;

  const cameraIcon = new THREE.Group();
  const cameraBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
  );
  cameraBody.position.set(0, 0, -0.2);
  const cameraLens = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.6, 16),
    new THREE.MeshBasicMaterial({ color: 0xffdd66 })
  );
  cameraLens.rotation.x = Math.PI / 2;
  cameraLens.position.set(0, 0, 0.35);
  cameraIcon.add(cameraBody);
  cameraIcon.add(cameraLens);
  cameraIcon.scale.set(1.2, 1.2, 1.2);
  world.add(cameraIcon);

  function toModelSpace(vec) {
    return world.worldToLocal(vec.clone());
  }

  function toSceneSpace(vec) {
    return world.localToWorld(vec.clone());
  }

  function frameModel(object, offset = 1.25) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const fov = perspectiveCamera.fov * (Math.PI / 180);
    let distance = maxSize / (2 * Math.tan(fov / 2));
    distance *= offset;
    const direction = new THREE.Vector3(0.5, 0.5, 1).normalize();
    perspectiveCamera.position.copy(center).add(direction.multiplyScalar(distance));
    controls.target.copy(center);
    controls.update();
    perspectiveCamera.updateProjectionMatrix();
  }

  function updateOrthographicFromBox(box, position, target) {
    const tempCam = new THREE.PerspectiveCamera();
    tempCam.position.copy(position);
    tempCam.up.set(0, 1, 0);
    tempCam.lookAt(target);
    tempCam.updateMatrixWorld(true);
    const view = tempCam.matrixWorldInverse.clone();

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    corners.forEach((corner) => {
      corner.applyMatrix4(view);
      minX = Math.min(minX, corner.x);
      maxX = Math.max(maxX, corner.x);
      minY = Math.min(minY, corner.y);
      maxY = Math.max(maxY, corner.y);
      minZ = Math.min(minZ, corner.z);
      maxZ = Math.max(maxZ, corner.z);
    });

    const padding = 1.15;
    const width = (maxX - minX) * padding || 1;
    const height = (maxY - minY) * padding || 1;

    const aspect = window.innerWidth / window.innerHeight;
    let viewWidth = width;
    let viewHeight = height;
    if (viewWidth / viewHeight < aspect) {
      viewWidth = viewHeight * aspect;
    } else {
      viewHeight = viewWidth / aspect;
    }

    orthographicCamera.left = -viewWidth / 2;
    orthographicCamera.right = viewWidth / 2;
    orthographicCamera.top = viewHeight / 2;
    orthographicCamera.bottom = -viewHeight / 2;

    const near = Math.max(0.01, -maxZ - width);
    const far = Math.max(near + 1, -minZ + width);
    orthographicCamera.near = near;
    orthographicCamera.far = far;

    orthographicCamera.position.copy(position);
    orthographicCamera.up.set(0, 1, 0);
    orthographicCamera.lookAt(target);
    orthographicCamera.updateProjectionMatrix();

    controls.target.copy(target);
    controls.update();

    orthoState = {
      position: position.clone(),
      target: target.clone(),
      box: box.clone(),
    };
  }

  function resetCamera() {
    const bboxScene = getBoundingBoxScene();
    if (bboxScene && bboxScene.visible) {
      frameModel(bboxScene);
    } else {
      const group = buildVisibleGroup();
      if (group) {
        frameModel(group);
      }
    }

    const box = getFrameBox('orthographic');
    if (box) {
      updateOrthographicFromBox(box, perspectiveCamera.position, controls.target);
    }
    updateActiveCameraStateFromControls();
    if (onCameraChange) onCameraChange();
  }

  function resetCameraHome() {
    isHomeMode = true;
    const bboxScene = getBoundingBoxScene();
    if (bboxScene && bboxScene.visible) {
      frameModel(bboxScene);
    } else {
      const group = buildVisibleGroup();
      if (group) {
        frameModel(group);
      }
    }

    const box = getFrameBox('orthographic');
    if (box) {
      updateOrthographicFromBox(box, perspectiveCamera.position, controls.target);
    }
    renderCameraList();
    if (onCameraChange) onCameraChange();
  }

  function setCameraPose(position, target) {
    perspectiveCamera.position.copy(position);
    perspectiveCamera.up.set(0, 1, 0);
    perspectiveCamera.lookAt(target);
    perspectiveCamera.updateProjectionMatrix();

    orthographicCamera.position.copy(position);
    orthographicCamera.up.set(0, 1, 0);
    orthographicCamera.lookAt(target);
    orthographicCamera.updateProjectionMatrix();

    controls.target.copy(target);
    controls.update();

    const box = getFrameBox('orthographic');
    if (box) {
      updateOrthographicFromBox(box, position, target);
    }
    if (onCameraChange) onCameraChange();
  }

  function getCurrentCameraState() {
    const pos = toModelSpace(camera.position);
    const target = toModelSpace(controls.target);
    return {
      pos: { x: pos.x, y: pos.y, z: pos.z },
      target: { x: target.x, y: target.y, z: target.z },
      mode: cameraMode,
    };
  }

  function saveCameraStates() {
    localStorage.setItem(
      CAMERA_STORAGE_KEY,
      JSON.stringify({ activeIndex: activeCameraIndex, cameras: camerasState })
    );
  }

  function loadCameraStates() {
    const saved = localStorage.getItem(CAMERA_STORAGE_KEY);
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.cameras)) {
        camerasState = parsed.cameras;
        if (Number.isInteger(parsed.activeIndex)) {
          activeCameraIndex = Math.min(Math.max(parsed.activeIndex, 0), MAX_CAMERAS - 1);
        }
        return camerasState.length > 0;
      }
    } catch (e) {
      // ignore
    }
    return false;
  }

  function updateActiveCameraStateFromControls() {
    if (isHomeMode) return;
    if (!camerasState[activeCameraIndex]) return;
    camerasState[activeCameraIndex] = getCurrentCameraState();
    saveCameraStates();
  }

  function getModelCenterWorld() {
    const bboxScene = getBoundingBoxScene();
    let target = null;
    if (bboxScene && bboxScene.visible) {
      target = bboxScene;
    } else {
      target = buildVisibleGroup();
    }
    if (!target) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(target);
    return box.getCenter(new THREE.Vector3());
  }

  function setTargetToModelCenter() {
    const center = getModelCenterWorld();
    controls.target.copy(center);
    controls.update();
    const box = getFrameBox('orthographic');
    if (box) {
      updateOrthographicFromBox(box, camera.position, controls.target);
    }
    updateActiveCameraStateFromControls();
    if (onCameraChange) onCameraChange();
  }

  function ensureCameraState(index) {
    if (!camerasState[index]) {
      camerasState[index] = getCurrentCameraState();
    }
  }

  function applyCameraState(index) {
    const state = camerasState[index];
    if (!state) return;
    isHomeMode = false;
    isApplyingCameraState = true;
    setCameraMode(state.mode || 'perspective');
    const pos = new THREE.Vector3(state.pos.x, state.pos.y, state.pos.z);
    const target = new THREE.Vector3(state.target.x, state.target.y, state.target.z);
    setCameraPose(toSceneSpace(pos), toSceneSpace(target));
    isApplyingCameraState = false;
    updateCameraModeButton();
    syncCameraInputs();
    renderCameraList();
    saveCameraStates();
  }

  function renderCameraList() {
    const renderTo = (container) => {
      if (!container) return;
      container.innerHTML = '';
      for (let i = 0; i < MAX_CAMERAS; i += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'camera-btn';
        btn.textContent = String(i + 1);
        if (!isHomeMode && i === activeCameraIndex) {
          btn.classList.add('is-active');
        }
        if (!camerasState[i]) {
          btn.style.opacity = '0.6';
        }
        btn.addEventListener('click', () => {
          isHomeMode = false;
          ensureCameraState(i);
          activeCameraIndex = i;
          applyCameraState(i);
        });
        container.appendChild(btn);
      }
    };
    renderTo(cameraListEl);
    renderTo(cameraStripEl);
  }

  function updateCameraModeButton() {
    if (!cameraModeBtn) return;
    const state = camerasState[activeCameraIndex];
    const mode = state?.mode || cameraMode;
    cameraModeBtn.textContent = mode === 'orthographic' ? 'Camera: Ortho' : 'Camera: Perspective';
  }

  function initCameraStates() {
    const hasSaved = loadCameraStates();
    isHomeMode = true;
    if (!hasSaved) {
      camerasState = [];
      activeCameraIndex = 0;
    }
    renderCameraList();
    return hasSaved;
  }

  function setCameraMode(nextMode) {
    if (nextMode === cameraMode) return;
    cameraMode = nextMode;
    if (cameraMode === 'orthographic') {
      camera = orthographicCamera;
      controls.object = camera;
      const box = getFrameBox('orthographic');
      if (box) {
        updateOrthographicFromBox(box, perspectiveCamera.position, controls.target);
      }
      orthographicCamera.position.copy(perspectiveCamera.position);
      orthographicCamera.lookAt(controls.target);
      orthographicCamera.updateProjectionMatrix();
    } else {
      camera = perspectiveCamera;
      controls.object = camera;
      perspectiveCamera.position.copy(orthographicCamera.position);
      perspectiveCamera.lookAt(controls.target);
      perspectiveCamera.updateProjectionMatrix();
    }
    ensureCameraHelper();
    if (onCameraChange) onCameraChange();
  }

  function syncCameraInputs() {
    if (!inputs) return;
    const pos = toModelSpace(camera.position);
    const target = toModelSpace(controls.target);
    inputs.posX.value = pos.x.toFixed(3);
    inputs.posY.value = pos.y.toFixed(3);
    inputs.posZ.value = pos.z.toFixed(3);
    inputs.targetX.value = target.x.toFixed(3);
    inputs.targetY.value = target.y.toFixed(3);
    inputs.targetZ.value = target.z.toFixed(3);
  }

  function applyCameraInputs() {
    if (!inputs) return;
    const position = new THREE.Vector3(
      parseFloat(inputs.posX.value),
      parseFloat(inputs.posY.value),
      parseFloat(inputs.posZ.value)
    );
    const target = new THREE.Vector3(
      parseFloat(inputs.targetX.value),
      parseFloat(inputs.targetY.value),
      parseFloat(inputs.targetZ.value)
    );
    if (
      Number.isFinite(position.x) &&
      Number.isFinite(position.y) &&
      Number.isFinite(position.z) &&
      Number.isFinite(target.x) &&
      Number.isFinite(target.y) &&
      Number.isFinite(target.z)
    ) {
      setCameraPose(toSceneSpace(position), toSceneSpace(target));
      updateActiveCameraStateFromControls();
    }
  }

  function bindCameraUI({
    cameraList,
    cameraStrip,
    cameraModeButton,
    resetButton,
    homeButton,
    centerTargetButton,
    inputFields,
  }) {
    cameraListEl = cameraList;
    cameraStripEl = cameraStrip;
    cameraModeBtn = cameraModeButton;
    inputs = inputFields;

    if (resetButton) {
      resetButton.addEventListener('click', () => {
        resetCamera();
      });
    }

    if (homeButton) {
      homeButton.addEventListener('click', () => {
        resetCameraHome();
      });
    }

    if (centerTargetButton) {
      centerTargetButton.addEventListener('click', () => {
        setTargetToModelCenter();
      });
    }

    if (cameraModeBtn) {
      cameraModeBtn.addEventListener('click', () => {
        const current = camerasState[activeCameraIndex]?.mode || cameraMode;
        const next = current === 'orthographic' ? 'perspective' : 'orthographic';
        setCameraMode(next);
        if (camerasState[activeCameraIndex]) {
          camerasState[activeCameraIndex].mode = next;
          saveCameraStates();
        }
        updateCameraModeButton();
      });
    }

    if (inputs) {
      [inputs.posX, inputs.posY, inputs.posZ, inputs.targetX, inputs.targetY, inputs.targetZ].forEach(
        (input) => {
          input.addEventListener('input', applyCameraInputs);
        }
      );
    }
  }

  function updateCameraIcon() {
    const camWorldPos = camera.position.clone();
    const camWorldTarget = controls.target.clone();
    const camLocalPos = world.worldToLocal(camWorldPos);
    const camLocalTarget = world.worldToLocal(camWorldTarget);
    cameraIcon.position.copy(camLocalPos);
    cameraIcon.lookAt(camLocalTarget);
  }

  function ensureCameraHelper() {
    if (cameraHelperRef !== camera) {
      if (cameraHelper) {
        scene.remove(cameraHelper);
      }
      cameraHelper = new THREE.CameraHelper(camera);
      cameraHelper.visible = cameraHelperVisible;
      scene.add(cameraHelper);
      cameraHelperRef = camera;
    }
  }

  function setCameraHelperVisible(isVisible) {
    cameraHelperVisible = isVisible;
    ensureCameraHelper();
    if (cameraHelper) {
      cameraHelper.visible = isVisible;
      cameraHelper.update();
    }
  }

  function updateCameraHelper() {
    ensureCameraHelper();
    if (cameraHelper) {
      cameraHelper.update();
    }
  }

  function handleResize() {
    perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    perspectiveCamera.updateProjectionMatrix();
    if (cameraMode === 'orthographic' && orthoState) {
      updateOrthographicFromBox(orthoState.box, orthoState.position, orthoState.target);
    }
  }

  controls.addEventListener('change', () => {
    if (isApplyingCameraState) return;
    updateActiveCameraStateFromControls();
  });

  return {
    getCamera: () => camera,
    getCameraMode: () => cameraMode,
    getCameraState: getCurrentCameraState,
    resetCamera,
    resetCameraHome,
    setCameraMode,
    setCameraPose,
    initCameraStates,
    renderCameraList,
    updateCameraModeButton,
    syncCameraInputs,
    bindCameraUI,
    updateCameraIcon,
    updateActiveCameraStateFromControls,
    setCameraHelperVisible,
    updateCameraHelper,
    handleResize,
    setTargetToModelCenter,
  };
}
