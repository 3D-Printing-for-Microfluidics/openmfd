import * as THREE from '../lib/three/three.module.js';
import { GLTFLoader } from '../lib/three/loaders/GLTFLoader.js';

export function createModelManager({ scene, world }) {
  const loader = new GLTFLoader();
  let glbFiles = [];
  let modelGroups = [];
  let models = [];
  let lastModifieds = [];
  let listSignature = '';
  let visibilityResolver = null;

  function setVisibilityResolver(resolver) {
    visibilityResolver = resolver;
  }

  function getVisibility(idx) {
    if (!visibilityResolver) return true;
    return visibilityResolver(idx);
  }

  async function fetchModelList() {
    try {
      const resp = await fetch('/glb_list.json', { cache: 'no-store' });
      const list = await resp.json();
      return list;
    } catch (e) {
      return null;
    }
  }

  function computeSignature(list) {
    return JSON.stringify(list || []);
  }

  function getListSignature() {
    return listSignature;
  }

  function setModelList(list) {
    glbFiles = Array.isArray(list) ? list : [];
    listSignature = computeSignature(glbFiles);
    lastModifieds = Array(glbFiles.length).fill(null);
  }

  function disposeGroup(group) {
    if (!group) return;
    if (group.parent === world) world.remove(group);
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }


  async function loadAllModels() {
    modelGroups.forEach((group) => disposeGroup(group));
    models = [];
    modelGroups = [];
    lastModifieds = Array(glbFiles.length).fill(null);

    const loadedScenes = await Promise.all(
      glbFiles.map((glb) =>
        new Promise((resolve) => {
          const cacheBuster = `?cb=${Date.now()}`;
          loader.load(
            glb.file + cacheBuster,
            (gltf) => resolve(gltf.scene),
            undefined,
            () => resolve(null)
          );
        })
      )
    );

    loadedScenes.forEach((sceneObj, idx) => {
      if (!sceneObj) return;
      sceneObj.traverse((child) => {
        if (child.isMesh) {
          const mat = child.material;
          mat.metalness = 0.5;
          mat.transparent = true;
          mat.side = THREE.FrontSide;
        }
      });
      models[idx] = sceneObj;
      modelGroups[idx] = sceneObj;
      sceneObj.visible = getVisibility(idx);
      world.add(sceneObj);
    });
  }

  function updateVisibility() {
    modelGroups.forEach((group, idx) => {
      if (group) group.visible = getVisibility(idx);
    });
  }


  function getBoundingBoxScene() {
    const bboxIdx = glbFiles.findIndex((f) => f.file.toLowerCase().includes('bounding_box.glb'));
    if (bboxIdx === -1) return null;
    return modelGroups[bboxIdx] || null;
  }

  function buildVisibleGroup() {
    const group = new THREE.Group();
    for (let i = 0; i < modelGroups.length; i += 1) {
      if (modelGroups[i] && modelGroups[i].visible) {
        group.add(modelGroups[i].clone());
      }
    }
    return group.children.length > 0 ? group : null;
  }

  function getModelCenterWorld() {
    const bboxScene = getBoundingBoxScene();
    let target = null;
    if (bboxScene) {
      target = bboxScene;
    } else {
      target = buildVisibleGroup();
    }
    if (!target) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(target);
    return box.getCenter(new THREE.Vector3());
  }

  function getModelCenterModel() {
    return world.worldToLocal(getModelCenterWorld().clone());
  }

  function getFrameBox(mode) {
    const bboxScene = getBoundingBoxScene();
    let target = null;
    if (mode === 'orthographic') {
      if (bboxScene) target = bboxScene;
    } else {
      if (bboxScene && bboxScene.visible) target = bboxScene;
    }
    if (!target) {
      const group = buildVisibleGroup();
      if (group) target = group;
    }
    if (!target) return null;
    return new THREE.Box3().setFromObject(target);
  }

  async function checkForUpdates() {
    const newList = await fetchModelList();
    if (!newList) {
      return { listChanged: false, filesChanged: false, error: 'offline' };
    }
    const newSignature = computeSignature(newList);

    if (newSignature !== listSignature) {
      return { listChanged: true, list: newList, signature: newSignature };
    }

    for (let i = 0; i < glbFiles.length; i += 1) {
      try {
        const response = await fetch(glbFiles[i].file, { method: 'HEAD', cache: 'no-store' });
        const newModified = response.headers.get('Last-Modified');
        if (lastModifieds[i] && newModified && newModified !== lastModifieds[i]) {
          lastModifieds[i] = newModified;
          return { listChanged: false, filesChanged: true };
        }
        if (!lastModifieds[i]) lastModifieds[i] = newModified;
      } catch (e) {
        // ignore
      }
    }

    return { listChanged: false, filesChanged: false };
  }

  return {
    fetchModelList,
    setModelList,
    getListSignature,
    loadAllModels,
    updateVisibility,
    checkForUpdates,
    getBoundingBoxScene,
    buildVisibleGroup,
    getFrameBox,
    getModelCenterWorld,
    getModelCenterModel,
    setVisibilityResolver,
  };
}
