import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WuwaStudioSettings } from '../types/wuwa';
import {
  ResonatorModelController,
  buildWuwaResonator,
} from '../models/wuwaResonator';
import {
  WuwaDioramaController,
  buildWuwaDiorama,
} from '../models/wuwaDiorama';

interface WuwaSceneProps {
  settings: WuwaStudioSettings;
  exportTrigger: number;
  liberationTrigger: number;
}

// Scratch math helpers outside tick loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3(0, 1.6, 4.2);
const _targetCamLook = new THREE.Vector3(0, 1.2, 0);

export const WuwaScene: React.FC<WuwaSceneProps> = ({
  settings,
  exportTrigger,
  liberationTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const resonatorRef = useRef<ResonatorModelController | null>(null);
  const dioramaRef = useRef<WuwaDioramaController | null>(null);

  // Studio Lights
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const blueHaloLightRef = useRef<THREE.PointLight | null>(null);
  const glassBacklightRef = useRef<THREE.PointLight | null>(null);

  // Resonance Liberation VFX
  const liberationRingRef = useRef<THREE.Mesh | null>(null);
  const liberationActive = useRef(false);
  const liberationStartTime = useRef(0);

  const isTransitioningCam = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Initialize Three.js scene once
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene & Darkroom Horizon
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04050a); // Deep pitch black matching collector photo
    scene.fog = new THREE.FogExp2(0x04050a, 0.038);
    sceneRef.current = scene;

    // Studio Environment Reflections
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
    camera.position.set(0, 1.6, 4.2);
    cameraRef.current = camera;

    // Smooth OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.04;
    controls.minDistance = 1.2;
    controls.maxDistance = 12.0;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isTransitioningCam.current = false;
    });

    // ==================== STUDIO LIGHTING RIG (Matching Reference Photo) ====================
    // 1. Studio Key Light (Upper Front-Right warm white key)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    keyLight.position.set(3.5, 6.5, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 4.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // 2. The Iconic Blue Spotlight Halo (Behind character's waist, from reference photo!)
    const blueHalo = new THREE.PointLight(0x2563eb, 4.5, 7.0, 1.8);
    blueHalo.position.set(0, 1.4, -0.6);
    scene.add(blueHalo);
    blueHaloLightRef.current = blueHalo;

    // 3. Stained Glass Backlight (Glowing Magenta/Violet behind stained glass)
    const glassLight = new THREE.PointLight(0xc026d3, 3.2, 5.0, 1.5);
    glassLight.position.set(0, 1.8, -1.0);
    scene.add(glassLight);
    glassBacklightRef.current = glassLight;

    // 4. Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 1.2);
    scene.add(hemiLight);

    // 5. Delicate Rim Light (Tracing hair edges and ribbons)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-3.5, 4.0, -3.5);
    scene.add(rimLight);

    // ==================== EXHIBITION SHOWROOM FLOOR ====================
    // Mirror-like glossy dark stone floor reflecting the rock pedestal and halo
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07080f,
      roughness: 0.15,
      metalness: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.88;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // ==================== RESONANCE LIBERATION SHOCKWAVE ====================
    const shockwaveGeo = new THREE.RingGeometry(0.2, 0.45, 32);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shockwaveRing = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwaveRing.rotation.x = -Math.PI / 2;
    shockwaveRing.position.set(0, 0.05, 0.1);
    scene.add(shockwaveRing);
    liberationRingRef.current = shockwaveRing;

    // ==================== BUILD RESONATOR & DIORAMA ====================
    const resonator = buildWuwaResonator(settingsRef.current.resonator);
    scene.add(resonator.group);
    resonatorRef.current = resonator;

    const diorama = buildWuwaDiorama(settingsRef.current.diorama);
    scene.add(diorama.group);
    dioramaRef.current = diorama;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Animation Loop
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

      // Update Resonator model
      if (resonatorRef.current) {
        resonatorRef.current.update(time, delta, current.ribbonWaveSpeed);
      }

      // Update Diorama base
      if (dioramaRef.current) {
        dioramaRef.current.update(time, delta);
      }

      // Resonance Liberation VFX animation
      if (liberationActive.current && liberationRingRef.current) {
        const elapsed = time - liberationStartTime.current;
        if (elapsed < 1.4) {
          const progress = elapsed / 1.4;
          const scale = 1.0 + progress * 6.5;
          liberationRingRef.current.scale.set(scale, scale, 1);
          (liberationRingRef.current.material as THREE.MeshBasicMaterial).opacity =
            (1.0 - progress) * 0.95;

          // Camera ultimate resonance shake & dramatic zoom
          if (cameraRef.current) {
            cameraRef.current.position.y += Math.sin(elapsed * 40.0) * 0.015 * (1.0 - progress);
          }
        } else {
          liberationActive.current = false;
          (liberationRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
        }
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
        controls.autoRotateSpeed = 1.2;
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

      if (resonatorRef.current) resonatorRef.current.dispose();
      if (dioramaRef.current) dioramaRef.current.dispose();

      floorGeo.dispose();
      floorMat.dispose();
      shockwaveGeo.dispose();
      shockwaveMat.dispose();

      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Resonator when resonatorId changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (resonatorRef.current) {
      scene.remove(resonatorRef.current.group);
      resonatorRef.current.dispose();
      resonatorRef.current = null;
    }

    const newResonator = buildWuwaResonator(settings.resonator);
    newResonator.setAction(settings.action);
    newResonator.setRibbonGlow(settings.tacetMarkGlow);
    scene.add(newResonator.group);
    resonatorRef.current = newResonator;
  }, [settings.resonator]);

  // Update Action
  useEffect(() => {
    if (resonatorRef.current) {
      resonatorRef.current.setAction(settings.action);
    }
  }, [settings.action]);

  // Update Tacet Mark / Ribbon Glow
  useEffect(() => {
    if (resonatorRef.current) {
      resonatorRef.current.setRibbonGlow(settings.tacetMarkGlow);
    }
  }, [settings.tacetMarkGlow]);

  // Update Stained Glass & Water Glow
  useEffect(() => {
    if (dioramaRef.current) {
      dioramaRef.current.setGlowIntensity(settings.stainedGlassGlow);
    }
  }, [settings.stainedGlassGlow]);

  // Update Lighting Presets
  useEffect(() => {
    if (!keyLightRef.current || !blueHaloLightRef.current || !glassBacklightRef.current) return;

    if (settings.lighting === 'reference_darkbox') {
      keyLightRef.current.color.setHex(0xfffaed);
      keyLightRef.current.intensity = 2.8;
      blueHaloLightRef.current.color.setHex(0x2563eb);
      blueHaloLightRef.current.intensity = 4.5;
      glassBacklightRef.current.color.setHex(0xc026d3);
    } else if (settings.lighting === 'moonlight_sanctum') {
      keyLightRef.current.color.setHex(0x93c5fd);
      keyLightRef.current.intensity = 2.2;
      blueHaloLightRef.current.color.setHex(0x06b6d4);
      blueHaloLightRef.current.intensity = 3.5;
      glassBacklightRef.current.color.setHex(0x818cf8);
    } else if (settings.lighting === 'stellar_aurora') {
      keyLightRef.current.color.setHex(0xf472b6);
      keyLightRef.current.intensity = 2.4;
      blueHaloLightRef.current.color.setHex(0x9333ea);
      blueHaloLightRef.current.intensity = 5.0;
      glassBacklightRef.current.color.setHex(0x22d3ee);
    } else {
      // Golden Hour
      keyLightRef.current.color.setHex(0xfbbf24);
      keyLightRef.current.intensity = 3.2;
      blueHaloLightRef.current.color.setHex(0xf97316);
      blueHaloLightRef.current.intensity = 3.0;
      glassBacklightRef.current.color.setHex(0xf59e0b);
    }
  }, [settings.lighting]);

  // Camera Presets
  const applyCameraPreset = (preset: typeof settings.cameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'full_statue') {
      _targetCamPos.set(0, 1.6, 4.2);
      _targetCamLook.set(0, 1.2, 0);
    } else if (preset === 'face_tiara') {
      _targetCamPos.set(0.1, 1.95, 1.5);
      _targetCamLook.set(0, 1.9, 0);
    } else if (preset === 'celestial_ribbons') {
      _targetCamPos.set(1.4, 1.5, 2.6);
      _targetCamLook.set(0.4, 1.3, 0);
    } else if (preset === 'water_pool') {
      _targetCamPos.set(0, 0.45, 2.4);
      _targetCamLook.set(0, 0.1, 0);
    }

    isTransitioningCam.current = true;
  };

  useEffect(() => {
    applyCameraPreset(settings.cameraPreset);
  }, [settings.cameraPreset]);

  // Resonance Liberation Trigger
  useEffect(() => {
    if (liberationTrigger === 0) return;
    liberationActive.current = true;
    liberationStartTime.current = performance.now() * 0.001;

    // Camera dramatic cinematic cut
    _targetCamPos.set(0.8, 1.3, 2.2);
    _targetCamLook.set(0, 1.4, 0);
    isTransitioningCam.current = true;

    // Reset back after ultimate
    setTimeout(() => {
      _targetCamPos.set(0, 1.6, 4.2);
      _targetCamLook.set(0, 1.2, 0);
      isTransitioningCam.current = true;
    }, 1200);
  }, [liberationTrigger]);

  // Screenshot export handler
  useEffect(() => {
    if (exportTrigger === 0) return;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `Wuwa_${settings.resonator}_1_7_Figurine_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, [exportTrigger]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
