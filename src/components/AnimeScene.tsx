import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AnimeSceneSettings,
  CameraPreset,
} from '../types/anime';
import {
  AnimeModelController,
  buildKitsuneCharacter,
  buildMechaCharacter,
  buildRoninCharacter,
} from '../models/animeCharacter';
import {
  DioramaController,
  buildDioramaScene,
} from '../models/dioramaScenes';

interface AnimeSceneProps {
  settings: AnimeSceneSettings;
  exportTrigger: number;
}

// Pre-allocated scratch math helpers outside animation loop to prevent GC
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3(0, 1.6, 3.8);
const _targetCamLook = new THREE.Vector3(0, 1.2, 0);

export const AnimeScene: React.FC<AnimeSceneProps> = ({
  settings,
  exportTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const characterRef = useRef<AnimeModelController | null>(null);
  const dioramaRef = useRef<DioramaController | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Settings ref to access fresh values in rAF without re-binding
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track if camera transition is active
  const isTransitioningCam = useRef(false);

  // Initialize Three.js scene once
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Setup Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for photo mode export
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c16);
    scene.fog = new THREE.FogExp2(0x0a0c16, 0.045);
    sceneRef.current = scene;

    // Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.6, 3.8);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.02; // Keep slightly above ground
    controls.minDistance = 1.2;
    controls.maxDistance = 14.0;
    controlsRef.current = controls;

    // Cancel scripted camera transition on manual user orbit
    controls.addEventListener('start', () => {
      isTransitioningCam.current = false;
    });

    // 3-Point Studio Lighting
    // Warm Key Light (Directional with tight shadow frustum)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    dirLightRef.current = keyLight;

    // Cool Hemisphere Fill Light
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e1b4b, 1.1);
    scene.add(hemiLight);

    // Subtle Anime Rim / Accent Backlight
    const rimLight = new THREE.DirectionalLight(0xf472b6, 1.6);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Initial Character & Diorama
    const char = buildRoninCharacter(settingsRef.current.style, settingsRef.current.outlineThickness);
    scene.add(char.group);
    characterRef.current = char;

    const dio = buildDioramaScene(
      settingsRef.current.diorama,
      settingsRef.current.style,
      settingsRef.current.sakuraDensity,
    );
    scene.add(dio.group);
    dioramaRef.current = dio;

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation & Render Loop
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();
      const current = settingsRef.current;

      // Update Character
      if (characterRef.current) {
        characterRef.current.update(time, delta, current.windSpeed);
      }

      // Update Diorama
      if (dioramaRef.current) {
        dioramaRef.current.update(time, delta, current.windSpeed);
      }

      // Smooth Camera Transitions
      if (isTransitioningCam.current) {
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-6.0 * delta));
        controls.target.lerp(_targetCamLook, 1 - Math.exp(-6.0 * delta));
        if (camera.position.distanceTo(_targetCamPos) < 0.02) {
          isTransitioningCam.current = false;
        }
      }

      // Turntable Auto-Rotate
      if (current.autoRotate && !isTransitioningCam.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // Resize Handler
    const handleResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth;
      const h = mountEl.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);

      if (characterRef.current) characterRef.current.dispose();
      if (dioramaRef.current) dioramaRef.current.dispose();

      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Character Model when character selection changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (characterRef.current) {
      scene.remove(characterRef.current.group);
      characterRef.current.dispose();
      characterRef.current = null;
    }

    let newChar: AnimeModelController;
    if (settings.character === 'ronin') {
      newChar = buildRoninCharacter(settings.style, settings.outlineThickness);
    } else if (settings.character === 'mecha') {
      newChar = buildMechaCharacter(settings.style, settings.outlineThickness);
    } else {
      newChar = buildKitsuneCharacter(settings.style, settings.outlineThickness);
    }

    newChar.setPose(settings.pose);
    newChar.setExpression(settings.expression);
    newChar.setWeapon(settings.weapon);

    scene.add(newChar.group);
    characterRef.current = newChar;
  }, [settings.character]);

  // Update Diorama Scenery when diorama selection changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (dioramaRef.current) {
      scene.remove(dioramaRef.current.group);
      dioramaRef.current.dispose();
      dioramaRef.current = null;
    }

    const newDio = buildDioramaScene(settings.diorama, settings.style, settings.sakuraDensity);
    scene.add(newDio.group);
    dioramaRef.current = newDio;

    // Adjust scene fog and background for diorama mood
    if (settings.diorama === 'torii_shrine') {
      scene.background = new THREE.Color(0x0c0a1a);
      (scene.fog as THREE.FogExp2).color.setHex(0x0c0a1a);
      (scene.fog as THREE.FogExp2).density = 0.04;
    } else if (settings.diorama === 'neo_tokyo') {
      scene.background = new THREE.Color(0x030712);
      (scene.fog as THREE.FogExp2).color.setHex(0x030712);
      (scene.fog as THREE.FogExp2).density = 0.055;
    } else {
      scene.background = new THREE.Color(0x080415);
      (scene.fog as THREE.FogExp2).color.setHex(0x080415);
      (scene.fog as THREE.FogExp2).density = 0.035;
    }
  }, [settings.diorama]);

  // Update Pose
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.setPose(settings.pose);
    }
  }, [settings.pose]);

  // Update Expression
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.setExpression(settings.expression);
    }
  }, [settings.expression]);

  // Update Weapon
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.setWeapon(settings.weapon);
    }
  }, [settings.weapon]);

  // Update Shader Style
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.updateShaderStyle(settings.style);
    }
  }, [settings.style]);

  // Update Inked Outline Thickness
  useEffect(() => {
    if (characterRef.current) {
      characterRef.current.setOutlineThickness(settings.outlineThickness);
    }
  }, [settings.outlineThickness]);

  // Update Sakura Density
  useEffect(() => {
    if (dioramaRef.current) {
      dioramaRef.current.setSakuraDensity(settings.sakuraDensity);
    }
  }, [settings.sakuraDensity]);

  // Camera Presets
  const applyCameraPreset = (preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'hero') {
      _targetCamPos.set(0, 1.6, 3.8);
      _targetCamLook.set(0, 1.2, 0);
    } else if (preset === 'portrait') {
      _targetCamPos.set(0.1, 1.95, 1.4);
      _targetCamLook.set(0, 1.9, 0);
    } else if (preset === 'action') {
      _targetCamPos.set(1.6, 0.45, 2.2);
      _targetCamLook.set(0, 1.4, 0);
    } else if (preset === 'diorama') {
      _targetCamPos.set(0, 4.2, 7.5);
      _targetCamLook.set(0, 1.0, 0);
    } else if (preset === 'cinema') {
      _targetCamPos.set(3.2, 2.2, 3.8);
      _targetCamLook.set(0, 1.2, 0);
    }

    isTransitioningCam.current = true;
  };

  useEffect(() => {
    applyCameraPreset(settings.cameraPreset);
  }, [settings.cameraPreset]);

  // Screenshot export handler
  useEffect(() => {
    if (exportTrigger === 0) return;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    // Render pristine frame right before export
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `CelStudio3D_${settings.character}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [exportTrigger]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Stable WebGL mount container outside React overlays */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
