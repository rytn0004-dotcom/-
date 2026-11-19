import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DamageNumber, ResonatorProfile, ResonatorType } from '../types/game';
import { ResonatorController } from '../game/characterController';
import { CombatSystem } from '../game/combatSystem';
import { WorldArena } from '../game/worldArena';
import { wuwaAudio } from '../audio/wuwaAudio';

interface WuwaGameViewProps {
  currentResonator: ResonatorProfile;
  soundEnabled: boolean;
  onHit: (dmg: DamageNumber) => void;
  onComboChange: (combo: number) => void;
  onTargetStateChange: (hp: number, maxHp: number, stagger: number) => void;
  onForteGain: (amount: number) => void;
  triggerAttack: number;
  triggerSkill: number;
  triggerLiberation: number;
  triggerDodge: number;
}

export const WuwaGameView: React.FC<WuwaGameViewProps> = ({
  currentResonator,
  soundEnabled,
  onHit,
  onComboChange,
  onTargetStateChange,
  onForteGain,
  triggerAttack,
  triggerSkill,
  triggerLiberation,
  triggerDodge,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const resonatorRef = useRef<ResonatorController | null>(null);
  const combatRef = useRef<CombatSystem | null>(null);
  const arenaRef = useRef<WorldArena | null>(null);

  // Third-person camera spherical coords
  const cameraOrbit = useRef({
    theta: 0, // horizontal angle
    phi: 0.35, // vertical pitch
    radius: 4.8,
  });

  // Input states
  const keysDown = useRef<Record<string, boolean>>({});
  const isMouseDown = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Camera shake
  const cameraShake = useRef(0);

  // Initialize scene once
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

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060814); // Deep night sky
    scene.fog = new THREE.FogExp2(0x060814, 0.025);
    sceneRef.current = scene;

    // Room Environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      52,
      mountEl.clientWidth / mountEl.clientHeight,
      0.1,
      200,
    );
    camera.position.set(0, 2.2, 5.0);
    cameraRef.current = camera;

    // Lighting: Dynamic combat lighting
    const keyLight = new THREE.DirectionalLight(0xfffaed, 3.0);
    keyLight.position.set(12, 22, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 22;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x111827, 1.4);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    // Build World Arena, Resonator, and Combat Target
    const arena = new WorldArena();
    scene.add(arena.group);
    arenaRef.current = arena;

    const combat = new CombatSystem(scene);
    combatRef.current = combat;

    const resonator = new ResonatorController(currentResonator.id);
    scene.add(resonator.group);
    resonatorRef.current = resonator;

    // Pre-warm shaders
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Input Event Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDown.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };
    const handleMouseUp = () => {
      isMouseDown.current = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDown.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        cameraOrbit.current.theta -= dx * 0.006;
        cameraOrbit.current.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2.3, cameraOrbit.current.phi + dy * 0.006),
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    mountEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

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

      // Read movement keys (WASD)
      let inputX = 0;
      let inputY = 0;
      if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) inputX -= 1;
      if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) inputX += 1;
      if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) inputY += 1;
      if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) inputY -= 1;

      const isSprinting = Boolean(keysDown.current['ShiftLeft'] || keysDown.current['ShiftRight']);
      const isDodging = Boolean(keysDown.current['KeyC']);
      const isJumping = Boolean(keysDown.current['Space']);

      // Calculate camera orientation vectors
      const camTheta = cameraOrbit.current.theta;
      const camForward = new THREE.Vector3(-Math.sin(camTheta), 0, -Math.cos(camTheta)).normalize();
      const camRight = new THREE.Vector3(Math.cos(camTheta), 0, -Math.sin(camTheta)).normalize();

      // Update Resonator Controller
      if (resonatorRef.current) {
        resonatorRef.current.update(
          delta,
          time,
          { x: inputX, y: inputY, isSprinting, isDodging, isJumping },
          camForward,
          camRight,
        );
      }

      // Update Combat System & Enemy Target
      if (combatRef.current) {
        combatRef.current.update(delta, time);
        onTargetStateChange(
          combatRef.current.targetHp,
          combatRef.current.targetMaxHp,
          combatRef.current.targetStagger,
        );
        onComboChange(combatRef.current.comboCount);
      }

      // Smooth Third-Person Follow Camera
      if (resonatorRef.current && cameraRef.current) {
        const playerPos = resonatorRef.current.position;
        const targetLook = new THREE.Vector3(playerPos.x, playerPos.y + 1.4, playerPos.z);

        const r = cameraOrbit.current.radius;
        const phi = cameraOrbit.current.phi;
        const theta = cameraOrbit.current.theta;

        const desiredCamPos = new THREE.Vector3(
          targetLook.x + r * Math.sin(theta) * Math.cos(phi),
          targetLook.y + r * Math.sin(phi),
          targetLook.z + r * Math.cos(theta) * Math.cos(phi),
        );

        // Screen shake
        if (cameraShake.current > 0) {
          desiredCamPos.x += (Math.random() - 0.5) * cameraShake.current;
          desiredCamPos.y += (Math.random() - 0.5) * cameraShake.current;
          cameraShake.current = Math.max(0, cameraShake.current - delta * 4.0);
        }

        cameraRef.current.position.lerp(desiredCamPos, 1 - Math.exp(-12.0 * delta));
        cameraRef.current.lookAt(targetLook);
      }

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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      mountEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);

      if (resonatorRef.current) resonatorRef.current.dispose();
      if (combatRef.current) combatRef.current.dispose();
      if (arenaRef.current) arenaRef.current.dispose();

      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Resonator when switched
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (resonatorRef.current) {
      scene.remove(resonatorRef.current.group);
      resonatorRef.current.dispose();
      resonatorRef.current = null;
    }

    const newResonator = new ResonatorController(currentResonator.id);
    scene.add(newResonator.group);
    resonatorRef.current = newResonator;
  }, [currentResonator.id]);

  // Execute Basic Attack
  useEffect(() => {
    if (triggerAttack === 0 || !resonatorRef.current || !combatRef.current) return;

    const step = resonatorRef.current.triggerAttack();
    wuwaAudio.playJinhsiSlash(soundEnabled);

    // Hit test against enemy
    const hitResult = combatRef.current.checkHit(
      resonatorRef.current.position,
      2.8,
      1200 * step,
      currentResonator.id,
    );

    if (hitResult.hit) {
      cameraShake.current = 0.15;
      onForteGain(15);
      onHit({
        id: Date.now() + Math.random(),
        value: hitResult.damage,
        isCrit: hitResult.isCrit,
        type: currentResonator.element,
        x: 48 + (Math.random() - 0.5) * 8,
        y: 40 + (Math.random() - 0.5) * 6,
        opacity: 1,
      });
    }
  }, [triggerAttack]);

  // Execute Resonance Skill (E)
  useEffect(() => {
    if (triggerSkill === 0 || !resonatorRef.current || !combatRef.current) return;

    resonatorRef.current.triggerSkill();
    wuwaAudio.playShorekeeperChime(soundEnabled);

    setTimeout(() => {
      if (!combatRef.current || !resonatorRef.current) return;
      const hitResult = combatRef.current.checkHit(
        resonatorRef.current.position,
        3.5,
        4800,
        currentResonator.id,
      );
      if (hitResult.hit) {
        cameraShake.current = 0.25;
        onForteGain(25);
        onHit({
          id: Date.now() + Math.random(),
          value: hitResult.damage,
          isCrit: true,
          type: currentResonator.element,
          x: 48 + (Math.random() - 0.5) * 6,
          y: 38 + (Math.random() - 0.5) * 6,
          opacity: 1,
        });
      }
    }, 120);
  }, [triggerSkill]);

  // Execute Resonance Liberation (Q / Ultimate)
  useEffect(() => {
    if (triggerLiberation === 0 || !resonatorRef.current || !combatRef.current) return;

    resonatorRef.current.triggerLiberation();
    wuwaAudio.playResonanceLiberation(soundEnabled);
    cameraShake.current = 0.45;

    setTimeout(() => {
      if (!combatRef.current || !resonatorRef.current) return;
      const hitResult = combatRef.current.checkHit(
        resonatorRef.current.position,
        6.5,
        18500,
        currentResonator.id,
      );
      if (hitResult.hit) {
        cameraShake.current = 0.6;
        onForteGain(40);
        onHit({
          id: Date.now() + Math.random(),
          value: hitResult.damage,
          isCrit: true,
          type: currentResonator.element,
          x: 50,
          y: 35,
          opacity: 1,
        });
      }
    }, 250);
  }, [triggerLiberation]);

  // Execute Flash Dodge (Shift)
  useEffect(() => {
    if (triggerDodge === 0 || !resonatorRef.current) return;
    resonatorRef.current.state = 'dodge';
    resonatorRef.current.attackTimer = 0;
    wuwaAudio.playChangliFlame(soundEnabled);
  }, [triggerDodge]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
};
