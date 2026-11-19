import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildLayeredShorekeeper, LayeredFigureController } from '../models/layeredShorekeeper';
import { wuwaAudio } from '../audio/wuwaAudio';
import {
  Sparkles,
  Camera,
  RotateCw,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  Waves,
} from 'lucide-react';

export const LayeredShowroom: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const figureRef = useRef<LayeredFigureController | null>(null);

  // Studio Lighting refs
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const blueHaloLightRef = useRef<THREE.PointLight | null>(null);

  // Interactive UI State
  const [autoRotate, setAutoRotate] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRefPhoto, setShowRefPhoto] = useState(true); // Open by default for immediate comparison!
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ribbonSpeed, setRibbonSpeed] = useState(1.0);
  const [glowIntensity, setGlowIntensity] = useState(1.4);
  const [currentCameraView, setCurrentCameraView] = useState<'full' | 'face' | 'ribbons' | 'base'>('full');

  // Camera transition targets
  const targetCamPos = useRef(new THREE.Vector3(0, 1.6, 4.3));
  const targetCamLook = useRef(new THREE.Vector3(0, 1.25, 0));
  const isTransitioningCam = useRef(false);

  // Initialize Three.js WebGL scene once
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
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Pitch Black Scene matching collector studio photo
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04050a);
    scene.fog = new THREE.FogExp2(0x04050a, 0.038);
    sceneRef.current = scene;

    // Studio Environment reflection map for satin PVC and gold filigree
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 1.6, 4.3);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.25, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.04;
    controls.minDistance = 1.0;
    controls.maxDistance = 10.0;
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isTransitioningCam.current = false;
    });

    // ==================== STUDIO LIGHTING (Exact 1:1 Reference Match) ====================
    // 1. Warm Key Light from upper front
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 2.9);
    keyLight.position.set(3.5, 6.0, 4.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 4.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // 2. The Signature Blue Spotlight Halo (Behind character's waist, from reference photo!)
    const blueHalo = new THREE.PointLight(0x2563eb, 5.2, 7.5, 1.8);
    blueHalo.position.set(0, 1.45, -0.65);
    scene.add(blueHalo);
    blueHaloLightRef.current = blueHalo;

    // 3. Stained Glass Backlight (Warm violet/magenta inside the stained glass)
    const glassLight = new THREE.PointLight(0xc026d3, 3.5, 5.0, 1.5);
    glassLight.position.set(0, 1.8, -1.0);
    scene.add(glassLight);

    // 4. Fill & Rim Lights
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 1.25);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-3.5, 4.0, -3.5);
    scene.add(rimLight);

    // Glossy Showroom Floor with mirror reflections
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x06070d,
      roughness: 0.12,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.88;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Build the high-fidelity Layered Shorekeeper Model
    const figure = buildLayeredShorekeeper();
    scene.add(figure.group);
    figureRef.current = figure;

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

      if (figureRef.current) {
        figureRef.current.update(time, delta, ribbonSpeed);
      }

      // Smooth Camera Transitions
      if (isTransitioningCam.current && cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPos.current, 1 - Math.exp(-6.0 * delta));
        controls.target.lerp(targetCamLook.current, 1 - Math.exp(-6.0 * delta));
        if (cameraRef.current.position.distanceTo(targetCamPos.current) < 0.02) {
          isTransitioningCam.current = false;
        }
      }

      // Turntable Auto-Rotate
      if (autoRotate && !isTransitioningCam.current) {
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

    const handleResize = () => {
      if (!mountEl) return;
      camera.aspect = mountEl.clientWidth / mountEl.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);

      if (figureRef.current) figureRef.current.dispose();
      floorGeo.dispose();
      floorMat.dispose();

      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Ribbon Speed & Glow
  useEffect(() => {
    if (figureRef.current) {
      figureRef.current.setGlowIntensity(glowIntensity);
    }
  }, [glowIntensity]);

  // Camera Presets
  const handleCameraPreset = (preset: 'full' | 'face' | 'ribbons' | 'base') => {
    setCurrentCameraView(preset);
    wuwaAudio.playWuwaUiClick(soundEnabled);

    if (preset === 'full') {
      targetCamPos.current.set(0, 1.6, 4.3);
      targetCamLook.current.set(0, 1.25, 0);
    } else if (preset === 'face') {
      targetCamPos.current.set(0.12, 2.05, 1.35);
      targetCamLook.current.set(0, 2.0, 0);
    } else if (preset === 'ribbons') {
      targetCamPos.current.set(1.4, 1.5, 2.5);
      targetCamLook.current.set(0.4, 1.3, 0);
    } else if (preset === 'base') {
      targetCamPos.current.set(0, 0.45, 2.2);
      targetCamLook.current.set(0, 0.08, 0);
    }

    isTransitioningCam.current = true;
  };

  // Trigger Resonance Flash
  const handleTriggerGlow = () => {
    wuwaAudio.playShorekeeperChime(soundEnabled);
    if (figureRef.current) {
      figureRef.current.triggerLiberationVfx();
    }
  };

  // Capture High-Res Wallpaper
  const handleCaptureScreenshot = () => {
    wuwaAudio.playWuwaUiClick(soundEnabled);
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `Shorekeeper_Collector_Statue_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Bar */}
      <header className="fixed top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl px-4 py-2.5 pointer-events-auto shadow-2xl backdrop-blur-sm">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            守
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-sm text-white font-['Outfit']">
                守岸人 THE SHOREKEEPER
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                1/7 Collector Scale
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Layered Anime Anatomy • Twin Celestial Silk Banners • Gothic Stained-Glass Sanctum
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Reference Photo Comparison Toggle */}
          <button
            onClick={() => setShowRefPhoto(!showRefPhoto)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all shadow-lg ${
              showRefPhoto
                ? 'bg-amber-600 border-amber-400 text-white shadow-amber-500/20'
                : 'bg-neutral-950/90 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="Toggle original reference photo side-by-side"
          >
            <ImageIcon size={15} />
            <span className="hidden sm:inline">Reference Photo</span>
          </button>

          {/* Resonance Liberation Glow */}
          <button
            onClick={handleTriggerGlow}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-lg transition-all"
            title="Trigger Starry Resonance Glow"
          >
            <Sparkles size={15} className="text-amber-300 animate-spin" />
            <span>Resonance Glow</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-xl bg-neutral-950/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Capture Wallpaper */}
          <button
            onClick={handleCaptureScreenshot}
            className="w-9 h-9 rounded-xl bg-neutral-950/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="Take High-Resolution Wallpaper Photo"
          >
            <Camera size={16} />
          </button>
        </div>
      </header>

      {/* Side-by-Side Reference Photo Comparison Card */}
      {showRefPhoto && (
        <div className="fixed top-18 right-4 w-72 sm:w-80 bg-neutral-950/95 border border-amber-500/60 rounded-2xl p-3.5 shadow-2xl z-30 pointer-events-auto backdrop-blur-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <ImageIcon size={14} />
              Original Reference Garage Kit
            </span>
            <button
              onClick={() => setShowRefPhoto(false)}
              className="text-neutral-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-[2/3] max-h-84 flex items-center justify-center">
            <img
              src="/public/assets/aistudio/800x_c574e835.webp"
              alt="Reference Anime Scale Figure"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="mt-2 text-[10px] text-neutral-400 leading-relaxed text-center">
            Matching the sculpted blonde locks, crystal tiara, white silk tabard, twin starry banners, water ripple, and gothic arch!
          </div>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[94vw] max-w-[880px] z-30 transition-transform duration-300 ease-out ${
          isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse Tab */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-950 border-t border-x border-neutral-700/80 rounded-t-xl text-neutral-300 hover:text-white text-xs font-medium shadow-md transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={14} className="text-cyan-400" />
                <span>Show Inspector Controls</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} className="text-cyan-400" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>

        {/* Control Dock Panel */}
        <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl p-4 shadow-2xl">
          {/* Camera Focus & Turntable Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400 mr-1 flex items-center gap-1">
                <Eye size={13} className="text-amber-400" />
                Detail Focus:
              </span>
              {[
                { id: 'full', label: 'Full Statue (全貌)' },
                { id: 'face', label: 'Face & Tiara (面部容顏)' },
                { id: 'ribbons', label: 'Celestial Banners (天衣飄帶)' },
                { id: 'base', label: 'Water & Base (水波地台)' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleCameraPreset(view.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentCameraView === view.id
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                autoRotate
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
              }`}
              title="360° Turntable Auto-Rotate"
            >
              <RotateCw size={13} />
              <span>360° Turntable</span>
            </button>
          </div>

          {/* Layering & Physics Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Celestial Ribbon Sway Slider */}
            <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  Twin Celestial Banner Wave:
                </span>
                <span className="text-xs text-cyan-400 font-mono">{ribbonSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={ribbonSpeed}
                onChange={(e) => setRibbonSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>Gentle Flutter</span>
                <span>Starry Gale</span>
              </div>
            </div>

            {/* Stained Glass & Water Glow Slider */}
            <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                  <Waves size={14} className="text-purple-400" />
                  Gothic Glass & Water Caustics:
                </span>
                <span className="text-xs text-purple-400 font-mono">
                  {glowIntensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={glowIntensity}
                onChange={(e) => setGlowIntensity(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>Ambient Glow</span>
                <span>Radiant Luminescence</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
