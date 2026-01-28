import * as THREE from '../lib/three/three.module.js';

export function createLightSystem({ scene, world, cameraSystem, previewSystem, getModelCenterModel }) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  world.add(ambientLight);

  const directionalLights = [];
  const directionalHelpers = [];
  let defaultLightInitialized = false;
  let lightHelpersVisible = false;
  let activeDirLightIndex = 0;

  let dialogEl = null;
  let dialogCloseBtn = null;
  let dialogOpenBtn = null;
  let cameraListEl = null;
  let cameraStripEl = null;

  let ambientColorInput = null;
  let ambientIntensityInput = null;
  let directionalLightsList = null;
  let addDirLightBtn = null;


  function createDirectionalHelper(light) {
    const helper = new THREE.DirectionalLightHelper(light, 2);
    helper.visible = lightHelpersVisible;
    scene.add(helper);
    return helper;
  }

  function updateDirectionalHelper(helper, light) {
    if (helper.setColor) {
      helper.setColor(light.color);
    } else if (helper.material && helper.material.color) {
      helper.material.color.copy(light.color);
    }
    helper.update();
  }

  function addDirectionalLight(options = {}) {
    const light = new THREE.DirectionalLight(options.color ?? 0xffffff, options.intensity ?? 1.0);
    const modelCenter = getModelCenterModel();
    const offset = options.offset ?? new THREE.Vector3(10, 10, 10);
    const pos = options.position ?? modelCenter.clone().add(offset);
    light.position.copy(pos);
    world.add(light);
    world.add(light.target);
    light.target.position.copy(getModelCenterModel());
    const helper = createDirectionalHelper(light);
    directionalLights.push(light);
    directionalHelpers.push(helper);
    activeDirLightIndex = directionalLights.length - 1;
    return light;
  }

  function removeDirectionalLight(index) {
    const light = directionalLights[index];
    const helper = directionalHelpers[index];
    if (helper) {
      scene.remove(helper);
      if (helper.dispose) helper.dispose();
    }
    if (light) {
      if (light.target) world.remove(light.target);
      world.remove(light);
    }
    directionalLights.splice(index, 1);
    directionalHelpers.splice(index, 1);
    if (directionalLights.length === 0) {
      activeDirLightIndex = 0;
      return;
    }
    if (activeDirLightIndex >= directionalLights.length) {
      activeDirLightIndex = directionalLights.length - 1;
    }
  }

  function updateDirectionalLightTargets() {
    const modelCenter = getModelCenterModel();
    directionalLights.forEach((light, index) => {
      light.target.position.copy(modelCenter);
      const helper = directionalHelpers[index];
      if (helper) {
        updateDirectionalHelper(helper, light);
      }
    });
  }

  function ensureDefaultLight() {
    if (defaultLightInitialized) return;
    defaultLightInitialized = true;
    addDirectionalLight({ offset: new THREE.Vector3(10, 10, 10) });
  }

  function toHexColor(color) {
    return `#${color.getHexString()}`;
  }

  function setDialogOpen(isOpen) {
    if (!dialogEl) return;
    dialogEl.classList.toggle('is-open', isOpen);
    lightHelpersVisible = isOpen;
    directionalHelpers.forEach((helper) => {
      helper.visible = isOpen;
      helper.update();
    });
    cameraSystem.setCameraHelperVisible(isOpen);
    if (previewSystem) {
      previewSystem.setOpen(isOpen);
    }
  }

  function renderDirectionalLightsList() {
    if (!directionalLightsList) return;
    directionalLightsList.innerHTML = '';
    if (directionalLights.length === 0) return;

    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'light-list';
    directionalLights.forEach((_, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'light-btn';
      btn.textContent = String(index + 1);
      if (index === activeDirLightIndex) {
        btn.classList.add('is-active');
      }
      btn.addEventListener('click', () => {
        activeDirLightIndex = index;
        renderDirectionalLightsList();
      });
      buttonsRow.appendChild(btn);
    });
    directionalLightsList.appendChild(buttonsRow);

    const light = directionalLights[activeDirLightIndex];
    if (!light) return;
    const modelCenter = getModelCenterModel();

    const editor = document.createElement('div');
    editor.className = 'dir-light-row';

    const grid = document.createElement('div');
    grid.className = 'input-grid';

    const colorLabel = document.createElement('label');
    colorLabel.textContent = 'Color';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = toHexColor(light.color);
    colorLabel.appendChild(colorInput);
    grid.appendChild(colorLabel);

    const intensityLabel = document.createElement('label');
    intensityLabel.textContent = 'Intensity';
    const intensityInput = document.createElement('input');
    intensityInput.type = 'number';
    intensityInput.step = '0.1';
    intensityInput.min = '0';
    intensityInput.value = light.intensity.toFixed(3);
    intensityLabel.appendChild(intensityInput);
    grid.appendChild(intensityLabel);

    const posXLabel = document.createElement('label');
    posXLabel.textContent = 'Pos X';
    const posXInput = document.createElement('input');
    posXInput.type = 'number';
    posXInput.step = '0.1';
    posXInput.value = (light.position.x - modelCenter.x).toFixed(3);
    posXLabel.appendChild(posXInput);
    grid.appendChild(posXLabel);

    const posYLabel = document.createElement('label');
    posYLabel.textContent = 'Pos Y';
    const posYInput = document.createElement('input');
    posYInput.type = 'number';
    posYInput.step = '0.1';
    posYInput.value = (light.position.y - modelCenter.y).toFixed(3);
    posYLabel.appendChild(posYInput);
    grid.appendChild(posYLabel);

    const posZLabel = document.createElement('label');
    posZLabel.textContent = 'Pos Z';
    const posZInput = document.createElement('input');
    posZInput.type = 'number';
    posZInput.step = '0.1';
    posZInput.value = (light.position.z - modelCenter.z).toFixed(3);
    posZLabel.appendChild(posZInput);
    grid.appendChild(posZLabel);

    editor.appendChild(grid);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'control-btn';
    removeBtn.textContent = 'Remove';
    actions.appendChild(removeBtn);
    editor.appendChild(actions);

    function updateLight() {
      const nextIntensity = parseFloat(intensityInput.value);
      const posX = parseFloat(posXInput.value);
      const posY = parseFloat(posYInput.value);
      const posZ = parseFloat(posZInput.value);
      if (Number.isFinite(nextIntensity)) {
        light.intensity = Math.max(0, nextIntensity);
      }
      if (Number.isFinite(posX) && Number.isFinite(posY) && Number.isFinite(posZ)) {
        light.position.set(modelCenter.x + posX, modelCenter.y + posY, modelCenter.z + posZ);
      }
      light.color.set(colorInput.value);
      light.target.position.copy(modelCenter);
      const helper = directionalHelpers[activeDirLightIndex];
      if (helper) {
        updateDirectionalHelper(helper, light);
      }
    }

    colorInput.addEventListener('input', updateLight);
    intensityInput.addEventListener('input', updateLight);
    posXInput.addEventListener('input', updateLight);
    posYInput.addEventListener('input', updateLight);
    posZInput.addEventListener('input', updateLight);
    removeBtn.addEventListener('click', () => {
      if (directionalLights.length <= 1) return;
      removeDirectionalLight(activeDirLightIndex);
      renderDirectionalLightsList();
    });

    directionalLightsList.appendChild(editor);
  }

  function syncLightInputs() {
    if (ambientColorInput) ambientColorInput.value = toHexColor(ambientLight.color);
    if (ambientIntensityInput) ambientIntensityInput.value = ambientLight.intensity.toFixed(3);
    const modelCenter = getModelCenterModel();
    directionalLights.forEach((light, index) => {
      light.target.position.copy(modelCenter);
      const helper = directionalHelpers[index];
      if (helper) {
        updateDirectionalHelper(helper, light);
      }
    });
    renderDirectionalLightsList();
  }

  function bindLightUI({
    dialog,
    openBtn,
    closeBtn,
    cameraList,
    cameraStrip,
    ambientColor,
    ambientIntensity,
    directionalList,
    addDirLight,
    onOpen,
  }) {
    dialogEl = dialog;
    dialogOpenBtn = openBtn;
    dialogCloseBtn = closeBtn;
    cameraListEl = cameraList;
    cameraStripEl = cameraStrip;

    ambientColorInput = ambientColor;
    ambientIntensityInput = ambientIntensity;
    directionalLightsList = directionalList;
    addDirLightBtn = addDirLight;

    if (ambientColorInput) {
      ambientColorInput.addEventListener('input', () => {
        ambientLight.color.set(ambientColorInput.value);
      });
    }

    if (ambientIntensityInput) {
      ambientIntensityInput.addEventListener('input', () => {
        const next = parseFloat(ambientIntensityInput.value);
        if (Number.isFinite(next)) {
          ambientLight.intensity = Math.max(0, next);
        }
      });
    }

    if (addDirLightBtn) {
      addDirLightBtn.addEventListener('click', () => {
        addDirectionalLight({ offset: new THREE.Vector3(10, 10, 10) });
        renderDirectionalLightsList();
      });
    }

    if (openBtn && dialogEl) {
      openBtn.addEventListener('click', () => {
        cameraSystem.syncCameraInputs();
        syncLightInputs();
        cameraSystem.renderCameraList();
        cameraSystem.updateCameraModeButton();
        if (onOpen) {
          onOpen();
        }
        setDialogOpen(true);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        setDialogOpen(false);
      });
    }

    if (dialogEl) {
      dialogEl.addEventListener('click', (event) => {
        if (event.target === dialogEl) {
          setDialogOpen(false);
        }
      });
    }
  }

  return {
    ambientLight,
    ensureDefaultLight,
    updateDirectionalLightTargets,
    syncLightInputs,
    bindLightUI,
    renderDirectionalLightsList,
    setDialogOpen,
  };
}
