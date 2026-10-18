import * as THREE from 'three';
import { createLibrary, applyMode } from '../three/materials.js';
import { disposeTree } from '../three/interior.js';
import { createStage, setWallMode, fitDistance } from '../three/stage.js';

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86));
const breathe = () => new Promise((resolve) => setTimeout(resolve, 16));

// Renders a maquette and a material shot of every project with one throwaway renderer, then frees it.
// Yields between frames so the page stays responsive.
export async function renderThumbs(projects, onThumb, { width = 960, height = 720 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const lib = createLibrary(THREE, renderer);
  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 200);

  try {
    for (const project of projects) {
      const { scene, built, bounds } = createStage(THREE, project, lib, { walls: 'cut' });
      setWallMode(built, 'cut');
      const target = new THREE.Vector3(0, 0.2, 0);
      camera.position.setFromSphericalCoords(fitDistance(THREE, camera, bounds) * 0.76, 0.86, 0.6).add(target);
      camera.lookAt(target);
      for (const mode of ['maket', 'material']) {
        applyMode(built.root, lib, mode);
        renderer.render(scene, camera);
        const blob = await toBlob(renderer.domElement);
        if (blob) onThumb(project.slug, mode, URL.createObjectURL(blob));
        await breathe();
      }
      disposeTree(scene);
    }
  } finally {
    lib.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
