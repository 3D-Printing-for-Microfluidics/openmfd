import { createScene } from './scene.js';
import { createModelManager } from './models.js';
import { createModelSelector } from './modelSelector.js';
import { createCameraSystem } from './camera.js';
import { createLightSystem } from './lights.js';
import { createPreviewSystem } from './preview.js';
import { createThemeManager } from './themes.js';
import { createSettingsSystem } from './settings.js';

const AUTO_RELOAD_STORAGE_KEY = 'openmfd_auto_reload';
const AUTO_RELOAD_INTERVAL_KEY = 'openmfd_auto_reload_interval_ms';
const AXES_STORAGE_KEY = 'openmfd_axes_visible';

const sceneState = createScene();
const { scene, world, axes, renderer, controls, perspectiveCamera, orthographicCamera } = sceneState;

const modelManager = createModelManager({ scene, world });

let lightSystem = null;
const cameraSystem = createCameraSystem({
  scene,
  world,
  controls,
  perspectiveCamera,
  orthographicCamera,
  getFrameBox: modelManager.getFrameBox,
  getBoundingBoxScene: modelManager.getBoundingBoxScene,
  buildVisibleGroup: modelManager.buildVisibleGroup,
  onCameraChange: () => {
    if (previewSystem) {
      previewSystem.syncFromMain();
    }
  },
});

const previewSystem = createPreviewSystem({ scene, controls, cameraSystem });

lightSystem = createLightSystem({
  scene,
  world,
  cameraSystem,
  previewSystem,
  getModelCenterModel: modelManager.getModelCenterModel,
});

const modelSelector = createModelSelector({
  formEl: document.getElementById('glbForm'),
  toggleBtn: document.getElementById('toggleModelSelectorBtn'),
});

modelManager.setVisibilityResolver((idx) => modelSelector.getModelVisibility(idx));
modelSelector.setVisibilityCallback(() => {
  modelManager.updateVisibility();
  lightSystem.updateDirectionalLightTargets();
});

const resetCameraBtn = document.getElementById('resetCameraBtn');
const reloadModelBtn = document.getElementById('reloadModelBtn');
const axesToggleBtn = document.getElementById('axesToggleBtn');

const cameraModeBtn = document.getElementById('cameraModeBtn');
const homeCameraBtn = document.getElementById('homeCameraBtn');
const centerTargetBtn = document.getElementById('centerTargetBtn');
const camPosX = document.getElementById('camPosX');
const camPosY = document.getElementById('camPosY');
const camPosZ = document.getElementById('camPosZ');
const camTargetX = document.getElementById('camTargetX');
const camTargetY = document.getElementById('camTargetY');
const camTargetZ = document.getElementById('camTargetZ');

const settingsDialogBtn = document.getElementById('settingsDialogBtn');
const settingsDialog = document.getElementById('settingsDialog');
const settingsDialogClose = document.getElementById('settingsDialogClose');
const lightDialogViewer = document.getElementById('lightDialogViewer');
const cameraListEl = document.getElementById('cameraList');
const cameraStripEl = document.getElementById('cameraStrip');
const ambientColorInput = document.getElementById('ambientColor');
const ambientIntensityInput = document.getElementById('ambientIntensity');
const directionalLightsList = document.getElementById('directionalLightsList');
const addDirLightBtn = document.getElementById('addDirLightBtn');
const themeSelect = document.getElementById('themeSelect');
const themeResetBtn = document.getElementById('themeResetBtn');
const themeToCustomBtn = document.getElementById('themeToCustomBtn');
const themeInputs = {
  '--bg': document.getElementById('themeBg'),
  '--panel': document.getElementById('themePanel'),
  '--section-bg': document.getElementById('themeSection'),
  '--text': document.getElementById('themeText'),
  '--button-bg': document.getElementById('themeButtonBg'),
  '--button-text': document.getElementById('themeButtonText'),
  '--button-border': document.getElementById('themeButtonBorder'),
  '--button-bg-active': document.getElementById('themeButtonActive'),
  '--axis-x': document.getElementById('themeAxisX'),
  '--axis-y': document.getElementById('themeAxisY'),
  '--axis-z': document.getElementById('themeAxisZ'),
};
const cwdValueInput = document.getElementById('cwdValue');
const modelSourceValueInput = document.getElementById('modelSourceValue');
const previewDirInput = document.getElementById('previewDirInput');
const previewDirSetBtn = document.getElementById('previewDirSetBtn');
const previewDirResetBtn = document.getElementById('previewDirResetBtn');
const previewDirWarningEl = document.getElementById('previewDirWarning');
const autoReloadIntervalInput = document.getElementById('autoReloadIntervalInput');

let settingsSystem = null;

cameraSystem.bindCameraUI({
  cameraList: cameraListEl,
  cameraStrip: cameraStripEl,
  cameraModeButton: cameraModeBtn,
  resetButton: resetCameraBtn,
  homeButton: homeCameraBtn,
  centerTargetButton: centerTargetBtn,
  inputFields: {
    posX: camPosX,
    posY: camPosY,
    posZ: camPosZ,
    targetX: camTargetX,
    targetY: camTargetY,
    targetZ: camTargetZ,
  },
});

lightSystem.bindLightUI({
  dialog: settingsDialog,
  openBtn: settingsDialogBtn,
  closeBtn: settingsDialogClose,
  cameraList: cameraListEl,
  cameraStrip: cameraStripEl,
  ambientColor: ambientColorInput,
  ambientIntensity: ambientIntensityInput,
  directionalList: directionalLightsList,
  addDirLight: addDirLightBtn,
  onOpen: () => {
    if (settingsSystem) {
      settingsSystem.activateTab('general');
    }
  },
});

previewSystem.bindViewer(lightDialogViewer);

function initAxesToggle() {
  if (!axesToggleBtn) return;
  const savedAxes = localStorage.getItem(AXES_STORAGE_KEY);
  axes.visible = savedAxes !== 'false';
  axesToggleBtn.textContent = axes.visible ? 'Axes: On' : 'Axes: Off';
  axesToggleBtn.addEventListener('click', () => {
    axes.visible = !axes.visible;
    localStorage.setItem(AXES_STORAGE_KEY, String(axes.visible));
    axesToggleBtn.textContent = axes.visible ? 'Axes: On' : 'Axes: Off';
  });
}

let autoReloadEnabled = localStorage.getItem(AUTO_RELOAD_STORAGE_KEY) !== 'false';
let autoReloadInterval = null;
let autoReloadOffline = false;
let autoReloadIntervalMs = Number.parseInt(
  localStorage.getItem(AUTO_RELOAD_INTERVAL_KEY) || '1000',
  10
);
if (!Number.isFinite(autoReloadIntervalMs) || autoReloadIntervalMs < 250) {
  autoReloadIntervalMs = 1000;
}

function setAutoReloadStatus(state) {
  if (!reloadModelBtn) return;
  if (state === 'offline') {
    reloadModelBtn.textContent = 'Auto Reload: OFFLINE';
    reloadModelBtn.classList.remove('is-active');
    reloadModelBtn.classList.add('is-warning');
  } else {
    reloadModelBtn.classList.toggle('is-warning', false);
    reloadModelBtn.textContent = autoReloadEnabled ? 'Auto Reload: ON' : 'Auto Reload: OFF';
    reloadModelBtn.classList.toggle('is-active', autoReloadEnabled);
  }
}

async function handleModelRefresh() {
  const result = await modelManager.checkForUpdates();
  if (result.error === 'offline') {
    autoReloadOffline = true;
    setAutoReloadStatus('offline');
    return;
  }

  if (autoReloadOffline) {
    autoReloadOffline = false;
    setAutoReloadStatus('ok');
  }
  if (result.listChanged) {
    modelManager.setModelList(result.list);
    modelSelector.build({
      files: result.list,
      signature: result.signature,
      resetSelection: true,
    });
    modelManager.updateVisibility();
    await modelManager.loadAllModels();
    lightSystem.ensureDefaultLight();
    lightSystem.updateDirectionalLightTargets();
    settingsSystem?.refreshPreviewInfo();
    return;
  }

  if (result.filesChanged) {
    await modelManager.loadAllModels();
    lightSystem.ensureDefaultLight();
    lightSystem.updateDirectionalLightTargets();
    settingsSystem?.refreshPreviewInfo();
  }
}

function setAutoReloadIntervalMs(nextIntervalMs) {
  autoReloadIntervalMs = nextIntervalMs;
  localStorage.setItem(AUTO_RELOAD_INTERVAL_KEY, String(autoReloadIntervalMs));
  if (autoReloadEnabled) {
    setAutoReload(true);
  }
}

function setAutoReload(enabled) {
  autoReloadEnabled = enabled;
  localStorage.setItem(AUTO_RELOAD_STORAGE_KEY, String(enabled));
  if (!autoReloadOffline) {
    setAutoReloadStatus('ok');
  }
  if (enabled) {
    if (autoReloadInterval) {
      clearInterval(autoReloadInterval);
      autoReloadInterval = null;
    }
    autoReloadInterval = setInterval(handleModelRefresh, autoReloadIntervalMs);
  } else if (autoReloadInterval) {
    clearInterval(autoReloadInterval);
    autoReloadInterval = null;
  }
}

async function initModels() {
  const list = await modelManager.fetchModelList();
  if (!list) {
    autoReloadOffline = true;
    setAutoReloadStatus('offline');
    return;
  }
  modelManager.setModelList(list);
  modelSelector.build({ files: list, signature: modelManager.getListSignature() });
  await modelManager.loadAllModels();
  lightSystem.ensureDefaultLight();
  lightSystem.updateDirectionalLightTargets();
  settingsSystem?.refreshPreviewInfo();
}

function initAutoReload() {
  if (reloadModelBtn) {
    reloadModelBtn.addEventListener('click', () => {
      setAutoReload(!autoReloadEnabled);
    });
  }
  setAutoReload(autoReloadEnabled);
}

function initResizing() {
  window.addEventListener('resize', () => {
    cameraSystem.handleResize();
    renderer.setSize(window.innerWidth, window.innerHeight);
    previewSystem.updateSize();
  });
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  cameraSystem.updateCameraIcon();
  renderer.render(scene, cameraSystem.getCamera());
  previewSystem.render();
}

async function init() {
  const themeManager = createThemeManager({ scene, axes });
  themeManager.initTheme();
  themeManager.bindThemeUI({
    themeSelect,
    themeInputs,
    resetBtn: themeResetBtn,
    saveCustomBtn: themeToCustomBtn,
  });
  initAxesToggle();
  settingsSystem = createSettingsSystem({
    settingsDialog,
    previewSystem,
    cwdValueInput,
    modelSourceValueInput,
    previewDirInput,
    previewDirSetBtn,
    previewDirResetBtn,
    previewDirWarningEl,
    autoReloadIntervalInput,
    getAutoReloadIntervalMs: () => autoReloadIntervalMs,
    setAutoReloadIntervalMs,
    initModels,
  });
  settingsSystem.initTabs('general');
  settingsSystem.initGeneralSettings();
  await initModels();

  cameraSystem.initCameraStates();
  cameraSystem.resetCameraHome();

  initAutoReload();
  initResizing();
  animate();
}

init();
