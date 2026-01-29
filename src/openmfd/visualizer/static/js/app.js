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
const DEFAULT_CONTROLS_TYPE_STORAGE_KEY = 'openmfd_default_controls_type';

const sceneState = createScene();
const {
  scene,
  world,
  axes,
  renderer,
  controls: initialControls,
  perspectiveCamera,
  orthographicCamera,
  setControlsType,
  THREE,
} = sceneState;
let controls = initialControls;

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
  onControlTypeChange: (type) => {
    applyControlsType(type, false);
    syncCameraControlSelect();
  },
  onActiveCameraChange: () => {
    syncCameraControlSelect();
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
const addCameraBtn = document.getElementById('addCameraBtn');
const addCameraBtnSettings = document.getElementById('addCameraBtnSettings');
const removeCameraBtnSettings = document.getElementById('removeCameraBtnSettings');
const camPosX = document.getElementById('camPosX');
const camPosY = document.getElementById('camPosY');
const camPosZ = document.getElementById('camPosZ');
const camTargetX = document.getElementById('camTargetX');
const camTargetY = document.getElementById('camTargetY');
const camTargetZ = document.getElementById('camTargetZ');
const camRoll = document.getElementById('camRoll');
const camFov = document.getElementById('camFov');
const defaultControlTypeSelect = document.getElementById('defaultControlTypeSelect');
const cameraControlTypeSelect = document.getElementById('cameraControlTypeSelect');
const cameraPresetButtons = Array.from(
  document.querySelectorAll('[data-camera-preset]')
);

const settingsDialogBtn = document.getElementById('settingsDialogBtn');
const settingsDialog = document.getElementById('settingsDialog');
const settingsDialogClose = document.getElementById('settingsDialogClose');
const docsBtn = document.getElementById('docsBtn');
const saveSnapshotBtn = document.getElementById('saveSnapshotBtn');
const updateCameraBtn = document.getElementById('updateCameraBtn');
const modelSelectorEl = document.getElementById('modelSelector');
const cameraStripWrapper = document.getElementById('cameraStripWrapper');
const controlsEl = document.getElementById('controls');
const settingsDialogEl = document.getElementById('settingsDialog');
const lightDialogViewer = document.getElementById('lightDialogViewer');
const lightsDialogViewer = document.getElementById('lightsDialogViewer');
const cameraListEl = document.getElementById('cameraList');
const cameraStripEl = document.getElementById('cameraStrip');
const ambientColorInput = document.getElementById('ambientColor');
const ambientIntensityInput = document.getElementById('ambientIntensity');
const directionalLightsList = document.getElementById('directionalLightsList');
const addDirLightBtn = document.getElementById('addDirLightBtn');
const removeDirLightBtn = document.getElementById('removeDirLightBtn');
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
const resetAllSettingsBtn = document.getElementById('resetAllSettingsBtn');
const resetGeneralSettingsBtn = document.getElementById('resetGeneralSettingsBtn');
const resetThemeSettingsBtn = document.getElementById('resetThemeSettingsBtn');
const resetCameraSettingsBtn = document.getElementById('resetCameraSettingsBtn');
const resetLightSettingsBtn = document.getElementById('resetLightSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const loadSettingsBtn = document.getElementById('loadSettingsBtn');
const settingsFileInput = document.getElementById('settingsFileInput');
const previewSettingsDialog = document.getElementById('previewSettingsDialog');
const previewSettingsClose = document.getElementById('previewSettingsClose');
const previewSettingsFileSelect = document.getElementById('previewSettingsFileSelect');
const previewSettingsLoadBtn = document.getElementById('previewSettingsLoadBtn');
const previewSettingsFileInput = document.getElementById('previewSettingsFileInput');
const previewSettingsGeneral = document.getElementById('previewSettingsGeneral');
const previewSettingsTheme = document.getElementById('previewSettingsTheme');
const previewSettingsCamera = document.getElementById('previewSettingsCamera');
const previewSettingsLighting = document.getElementById('previewSettingsLighting');

let settingsSystem = null;
let themeManager = null;
let pendingSettingsList = null;
const previewSettingsCustomFiles = new Map();
const previewSettingsCustomOrder = [];

function applyControlsType(type, persist = true) {
  const nextControls = setControlsType(type);
  if (!nextControls) return;
  controls = nextControls;
  cameraSystem.setControls(nextControls);
  previewSystem.setControls(nextControls);
  if (controls && controls.object) {
    controls.object = cameraSystem.getCamera();
  }
  cameraSystem.setRollEnabled(type === 'trackball');
  cameraSystem.setCurrentControlType(type);
  if (typeof controls.handleResize === 'function') {
    controls.handleResize();
  }
  if (persist) {
    localStorage.setItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY, type);
  }
}

function applyAxesState(visible) {
  axes.visible = !!visible;
  localStorage.setItem(AXES_STORAGE_KEY, String(axes.visible));
  if (axesToggleBtn) {
    axesToggleBtn.textContent = axes.visible ? 'Axes: On' : 'Axes: Off';
  }
}

function syncThemeInputs(themeName) {
  if (!themeManager || !themeInputs) return;
  const state = themeManager.getThemeState();
  const theme = state.themes?.[themeName];
  if (!theme) return;
  Object.entries(themeInputs).forEach(([key, input]) => {
    if (input) input.value = theme[key] || '#000000';
  });
}


async function resetGeneralSettings() {
  localStorage.removeItem(AUTO_RELOAD_STORAGE_KEY);
  localStorage.removeItem(AUTO_RELOAD_INTERVAL_KEY);
  localStorage.removeItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY);
  const defaultType = 'orbit';
  if (defaultControlTypeSelect) {
    defaultControlTypeSelect.value = defaultType;
  }
  cameraSystem.setDefaultControlType(defaultType);
  localStorage.setItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY, defaultType);
  applyControlsType(defaultType, false);
  setAutoReloadIntervalMs(1000);
  if (autoReloadIntervalInput) {
    autoReloadIntervalInput.value = '1000';
  }
  autoReloadEnabled = true;
  setAutoReload(true);
  await fetch('/set_preview_dir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '' }),
  }).catch(() => null);
  await initModels();
  settingsSystem?.refreshPreviewInfo();
}

function openPreviewSettingsDialog(listData) {
  if (!previewSettingsDialog || !previewSettingsFileSelect) return;
  pendingSettingsList = listData;
  previewSettingsFileSelect.innerHTML = '';
  if (Array.isArray(listData.files)) {
    listData.files.forEach((file) => {
      const option = document.createElement('option');
      option.value = file.path;
      option.textContent = `Model Settings (${file.name})`;
      option.dataset.source = 'model';
      previewSettingsFileSelect.appendChild(option);
    });
  }

  previewSettingsCustomOrder.forEach((key) => {
    const entry = previewSettingsCustomFiles.get(key);
    if (!entry) return;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = entry.label;
    option.dataset.source = 'custom';
    previewSettingsFileSelect.appendChild(option);
  });

  const chooseOption = document.createElement('option');
  chooseOption.value = '__choose__';
  chooseOption.textContent = 'Choose file…';
  chooseOption.dataset.source = 'choose';
  previewSettingsFileSelect.appendChild(chooseOption);

  if (previewSettingsFileSelect.options.length > 0) {
    previewSettingsFileSelect.value = previewSettingsFileSelect.options[0].value;
  }
  if (previewSettingsGeneral) previewSettingsGeneral.checked = true;
  if (previewSettingsTheme) previewSettingsTheme.checked = true;
  if (previewSettingsCamera) previewSettingsCamera.checked = true;
  if (previewSettingsLighting) previewSettingsLighting.checked = true;
  previewSettingsDialog.classList.add('is-open');
}

function closePreviewSettingsDialog() {
  if (!previewSettingsDialog) return;
  previewSettingsDialog.classList.remove('is-open');
  pendingSettingsList = null;
  previewSettingsCustomFiles.clear();
  previewSettingsCustomOrder.length = 0;
  if (previewSettingsFileSelect) {
    previewSettingsFileSelect.innerHTML = '';
  }
}

async function fetchPreviewSettingsList() {
  const resp = await fetch('/preview_settings_list.json').catch(() => null);
  if (!resp || !resp.ok) return null;
  const data = await resp.json().catch(() => null);
  if (!data || !Array.isArray(data.files) || data.files.length === 0) return null;
  return data;
}

async function checkPreviewSettingsPrompt() {
  const listData = await fetchPreviewSettingsList();
  if (!listData) return;
  openPreviewSettingsDialog(listData);
}

function resetCameraSettings() {
  localStorage.removeItem('openmfd_cameras_v1');
  cameraSystem.initCameraStates();
  cameraSystem.resetCameraHome();
  syncCameraControlSelect();
}

function resetLightingSettings() {
  lightSystem.resetLights();
}

function resetThemeSettings() {
  themeManager.resetAllThemes();
  if (themeSelect) {
    themeSelect.value = 'dark';
  }
  syncThemeInputs('dark');
}

function buildSettingsPayload() {
  const payload = {
    version: 1,
    localStorage: {
      [AUTO_RELOAD_STORAGE_KEY]: localStorage.getItem(AUTO_RELOAD_STORAGE_KEY),
      [AUTO_RELOAD_INTERVAL_KEY]: localStorage.getItem(AUTO_RELOAD_INTERVAL_KEY),
      [AXES_STORAGE_KEY]: localStorage.getItem(AXES_STORAGE_KEY),
      [DEFAULT_CONTROLS_TYPE_STORAGE_KEY]: localStorage.getItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY),
      openmfd_cameras_v1: localStorage.getItem('openmfd_cameras_v1'),
      openmfd_theme: localStorage.getItem('openmfd_theme'),
      openmfd_theme_defs_v1: localStorage.getItem('openmfd_theme_defs_v1'),
    },
    lights: lightSystem.getLightState(),
    theme: themeManager.getThemeState(),
  };
  return payload;
}

async function saveSettingsToFile() {
  const payload = buildSettingsPayload();
  const jsonText = JSON.stringify(payload, null, 2);
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'openmfd-settings.json',
      types: [
        {
          description: 'JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(jsonText);
    await writable.close();
    return;
  }
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'openmfd-settings.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applySettingsPayload(payload, sections = {}) {
  if (!payload || typeof payload !== 'object') return;
  const stored = payload.localStorage || {};
  const apply = {
    general: sections.general !== false,
    theme: sections.theme !== false,
    camera: sections.camera !== false,
    lighting: sections.lighting !== false,
  };

  if (apply.general) {
    const keys = [
      AUTO_RELOAD_STORAGE_KEY,
      AUTO_RELOAD_INTERVAL_KEY,
      AXES_STORAGE_KEY,
      DEFAULT_CONTROLS_TYPE_STORAGE_KEY,
    ];
    keys.forEach((key) => {
      if (key in stored) {
        const value = stored[key];
        if (value === null || value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      }
    });

    if (stored[AXES_STORAGE_KEY] !== null && stored[AXES_STORAGE_KEY] !== undefined) {
      applyAxesState(stored[AXES_STORAGE_KEY] !== 'false');
    }

    if (stored[DEFAULT_CONTROLS_TYPE_STORAGE_KEY]) {
      const type = stored[DEFAULT_CONTROLS_TYPE_STORAGE_KEY];
      cameraSystem.setDefaultControlType(type);
      if (defaultControlTypeSelect) defaultControlTypeSelect.value = type;
    }

    if (stored[AUTO_RELOAD_INTERVAL_KEY]) {
      const next = Number.parseInt(stored[AUTO_RELOAD_INTERVAL_KEY], 10);
      if (Number.isFinite(next) && next >= 250) {
        setAutoReloadIntervalMs(next);
        if (autoReloadIntervalInput) autoReloadIntervalInput.value = String(next);
      }
    }

    if (stored[AUTO_RELOAD_STORAGE_KEY] !== null && stored[AUTO_RELOAD_STORAGE_KEY] !== undefined) {
      autoReloadEnabled = stored[AUTO_RELOAD_STORAGE_KEY] !== 'false';
      setAutoReload(autoReloadEnabled);
    }
  }

  if (apply.theme) {
    let themeState = payload.theme;
    if (!themeState) {
      try {
        const defs = stored.openmfd_theme_defs_v1 ? JSON.parse(stored.openmfd_theme_defs_v1) : null;
        themeState = {
          activeTheme: stored.openmfd_theme || 'dark',
          themes: defs || undefined,
        };
      } catch (e) {
        themeState = null;
      }
    }
    if (themeState) {
      themeManager.setThemeState(themeState);
      if (themeSelect) {
        themeSelect.value = themeState.activeTheme || themeSelect.value;
        syncThemeInputs(themeSelect.value);
      }
    }
  }

  if (apply.camera && stored.openmfd_cameras_v1) {
    localStorage.setItem('openmfd_cameras_v1', stored.openmfd_cameras_v1);
    cameraSystem.initCameraStates();
    cameraSystem.resetCameraHome();
    syncCameraControlSelect();
  }

  if (apply.lighting && payload.lights) {
    lightSystem.applyLightState(payload.lights);
  }
}

async function loadSettingsFromFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  applySettingsPayload(parsed);
}

function syncCameraControlSelect() {
  if (!cameraControlTypeSelect) return;
  const isHome = cameraSystem.isHomeMode();
  const activeState = cameraSystem.getActiveCameraState();
  if (isHome || !activeState) {
    cameraControlTypeSelect.disabled = false;
    cameraControlTypeSelect.value = cameraSystem.getDefaultControlType();
    return;
  }
  cameraControlTypeSelect.disabled = false;
  cameraControlTypeSelect.value = activeState.controlType || cameraSystem.getDefaultControlType();
}

cameraSystem.bindCameraUI({
  cameraList: cameraListEl,
  cameraStrip: cameraStripEl,
  cameraModeButton: cameraModeBtn,
  resetButton: resetCameraBtn,
  homeButton: homeCameraBtn,
  centerTargetButton: centerTargetBtn,
  updateButton: updateCameraBtn,
  addButtons: [addCameraBtn, addCameraBtnSettings],
  removeButton: removeCameraBtnSettings,
  presetButtons: cameraPresetButtons,
  inputFields: {
    posX: camPosX,
    posY: camPosY,
    posZ: camPosZ,
    targetX: camTargetX,
    targetY: camTargetY,
    targetZ: camTargetZ,
    roll: camRoll,
    fov: camFov,
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
  removeDirLight: removeDirLightBtn,
  onOpen: () => {
    if (settingsSystem) {
      settingsSystem.activateTab('general');
    }
  },
});

// Preview viewer is bound per tab via settingsSystem.

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
    await checkPreviewSettingsPrompt();
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

async function resetAllSettings() {
  localStorage.removeItem(AUTO_RELOAD_STORAGE_KEY);
  localStorage.removeItem(AUTO_RELOAD_INTERVAL_KEY);
  localStorage.removeItem(AXES_STORAGE_KEY);
  localStorage.removeItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY);
  localStorage.removeItem('openmfd_theme');
  localStorage.removeItem('openmfd_theme_defs_v1');
  localStorage.removeItem('openmfd_cameras_v1');
  localStorage.removeItem('openmfd_model_selector_collapsed');
  localStorage.removeItem('openmfd_model_selection_v2');
  localStorage.removeItem('openmfd_controls_type');
  await fetch('/set_preview_dir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: '' }),
  }).catch(() => null);
  window.location.reload();
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
  await checkPreviewSettingsPrompt();
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
    if (controls && typeof controls.handleResize === 'function') {
      controls.handleResize();
    }
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
  themeManager = createThemeManager({ scene, axes });
  themeManager.initTheme();
  themeManager.bindThemeUI({
    themeSelect,
    themeInputs,
    resetBtn: themeResetBtn,
    saveCustomBtn: themeToCustomBtn,
  });
  initAxesToggle();
  if (docsBtn) {
    docsBtn.addEventListener('click', () => {
      window.open('/docs/', '_blank', 'noopener');
    });
  }
  if (saveSnapshotBtn) {
    saveSnapshotBtn.addEventListener('click', async () => {
      const canvas = renderer.domElement;
      if (!canvas) return;
      const uiElements = [modelSelectorEl, cameraStripWrapper, controlsEl, settingsDialogEl].filter(Boolean);
      uiElements.forEach((el) => el.classList.add('ui-hidden'));

      await new Promise((resolve) => requestAnimationFrame(resolve));
      renderer.render(scene, cameraSystem.getCamera());

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      uiElements.forEach((el) => el.classList.remove('ui-hidden'));
      if (!blob) return;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'openmfd-viewport.png',
            types: [
              {
                description: 'PNG Image',
                accept: { 'image/png': ['.png'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (err) {
          // fall back to download link
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'openmfd-viewport.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }


  if (resetGeneralSettingsBtn) {
    resetGeneralSettingsBtn.addEventListener('click', async () => {
      await resetGeneralSettings();
    });
  }

  if (resetCameraSettingsBtn) {
    resetCameraSettingsBtn.addEventListener('click', () => {
      resetCameraSettings();
    });
  }

  if (resetLightSettingsBtn) {
    resetLightSettingsBtn.addEventListener('click', () => {
      resetLightingSettings();
    });
  }

  if (resetThemeSettingsBtn) {
    resetThemeSettingsBtn.addEventListener('click', () => {
      resetThemeSettings();
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      saveSettingsToFile();
    });
  }

  if (loadSettingsBtn && settingsFileInput) {
    loadSettingsBtn.addEventListener('click', () => {
      fetchPreviewSettingsList()
        .then((listData) => {
          if (listData) {
            openPreviewSettingsDialog(listData);
            return;
          }
          openPreviewSettingsDialog({ files: [] });
        })
        .catch(() => {
          openPreviewSettingsDialog({ files: [] });
        });
    });
    settingsFileInput.addEventListener('change', async () => {
      const file = settingsFileInput.files?.[0];
      if (!file) return;
      await loadSettingsFromFile(file);
    });
  }

  if (previewSettingsClose) {
    previewSettingsClose.addEventListener('click', () => {
      closePreviewSettingsDialog();
    });
  }


  if (previewSettingsLoadBtn) {
    previewSettingsLoadBtn.addEventListener('click', async () => {
      if (!pendingSettingsList || !previewSettingsFileSelect) return;
      const path = previewSettingsFileSelect.value;
      if (!path) return;
      if (path === '__choose__') {
        previewSettingsFileInput?.click();
        return;
      }
      if (previewSettingsCustomFiles.has(path)) {
        const entry = previewSettingsCustomFiles.get(path);
        if (entry?.payload) {
          applySettingsPayload(entry.payload, {
            general: previewSettingsGeneral?.checked !== false,
            theme: previewSettingsTheme?.checked !== false,
            camera: previewSettingsCamera?.checked !== false,
            lighting: previewSettingsLighting?.checked !== false,
          });
        }
        return;
      }
      const resp = await fetch(`/preview_settings_file?path=${encodeURIComponent(path)}`);
      if (!resp.ok) {
        closePreviewSettingsDialog();
        return;
      }
      const payload = await resp.json().catch(() => null);
      if (payload) {
        applySettingsPayload(payload, {
          general: previewSettingsGeneral?.checked !== false,
          theme: previewSettingsTheme?.checked !== false,
          camera: previewSettingsCamera?.checked !== false,
          lighting: previewSettingsLighting?.checked !== false,
        });
      }
    });
  }

  if (previewSettingsFileInput) {
    previewSettingsFileInput.addEventListener('change', async () => {
      const file = previewSettingsFileInput.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = JSON.parse(text);
      const key = `local:${Date.now()}:${file.name}`;
      const label = file.webkitRelativePath && file.webkitRelativePath.length > 0
        ? file.webkitRelativePath
        : file.name;
      previewSettingsCustomFiles.set(key, {
        label: `Local (${label})`,
        payload: parsed,
      });
      previewSettingsCustomOrder.push(key);
      if (pendingSettingsList) {
        openPreviewSettingsDialog(pendingSettingsList);
        previewSettingsFileSelect.value = key;
      }
    });
  }

  if (previewSettingsFileSelect && previewSettingsFileInput) {
    previewSettingsFileSelect.addEventListener('change', () => {
      if (previewSettingsFileSelect.value === '__choose__') {
        previewSettingsFileInput.value = '';
        previewSettingsFileInput.click();
      }
    });
  }

  if (previewSettingsDialog) {
    previewSettingsDialog.addEventListener('click', (event) => {
      if (event.target === previewSettingsDialog) {
        closePreviewSettingsDialog();
      }
    });
  }

  if (defaultControlTypeSelect) {
    const savedType = localStorage.getItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY) || 'orbit';
    defaultControlTypeSelect.value = savedType;
    cameraSystem.setDefaultControlType(savedType);
    applyControlsType(savedType, false);
    defaultControlTypeSelect.addEventListener('change', () => {
      const nextType = defaultControlTypeSelect.value;
      cameraSystem.setDefaultControlType(nextType);
      localStorage.setItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY, nextType);
      if (cameraSystem.isHomeMode() || !cameraSystem.getActiveCameraState()) {
        applyControlsType(nextType, false);
      }
    });
  }

  if (cameraControlTypeSelect) {
    syncCameraControlSelect();
    cameraControlTypeSelect.addEventListener('change', () => {
      const nextType = cameraControlTypeSelect.value;
      if (cameraSystem.isHomeMode() || !cameraSystem.getActiveCameraState()) {
        cameraSystem.setDefaultControlType(nextType);
        localStorage.setItem(DEFAULT_CONTROLS_TYPE_STORAGE_KEY, nextType);
        applyControlsType(nextType, false);
        syncCameraControlSelect();
        return;
      }
      cameraSystem.setActiveCameraControlType(nextType);
      applyControlsType(nextType, false);
      syncCameraControlSelect();
    });
  }
  settingsSystem = createSettingsSystem({
    settingsDialog,
    previewSystem,
    previewViewers: {
      camera: lightDialogViewer,
      lights: lightsDialogViewer,
    },
    cwdValueInput,
    modelSourceValueInput,
    previewDirInput,
    previewDirSetBtn,
    previewDirResetBtn,
    previewDirWarningEl,
    autoReloadIntervalInput,
    resetAllSettingsBtn,
    getAutoReloadIntervalMs: () => autoReloadIntervalMs,
    setAutoReloadIntervalMs,
    initModels,
    resetAllSettings,
  });
  settingsSystem.initTabs('general');
  settingsSystem.initGeneralSettings();
  await initModels();

  cameraSystem.initCameraStates();
  cameraSystem.resetCameraHome();
  syncCameraControlSelect();

  initAutoReload();
  initResizing();
  animate();
}

init();
