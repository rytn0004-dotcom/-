import * as THREE from 'three';
import { ResonatorAction, ResonatorId } from '../types/wuwa';
import {
  createCelestialSilkTexture,
  createWuwaFaceTexture,
} from '../utils/wuwaTextures';

export interface ResonatorModelController {
  group: THREE.Group;
  update: (time: number, delta: number, waveSpeed: number) => void;
  setAction: (action: ResonatorAction) => void;
  setRibbonGlow: (active: boolean) => void;
  dispose: () => void;
}

/**
 * Builds the high-fidelity Wuthering Waves Resonator 3D Figurine
 * Modeled after the 1/7 scale collector garage kit in the reference photo.
 */
export function buildWuwaResonator(resonatorId: ResonatorId): ResonatorModelController {
  const root = new THREE.Group();
  root.name = `Resonator_${resonatorId}`;

  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  // Color Palette per Resonator
  let hairColorHex = 0xeed6aa; // Golden blonde (Shorekeeper)
  let hairHighlightHex = 0x93c5fd; // Soft blue shine
  let eyeColor = '#60a5fa'; // Lavender cyan
  let tiaraEmissiveHex = 0x38bdf8; // Crystal cyan blue
  let ribbonGlowHex = 0x2563eb;

  if (resonatorId === 'jinhsi') {
    hairColorHex = 0xf1f5f9; // Pure Loong silver-white
    hairHighlightHex = 0x38bdf8; // Cyan loong glow
    eyeColor = '#38bdf8';
    tiaraEmissiveHex = 0x06b6d4; // Loong horn cyan
    ribbonGlowHex = 0x0ea5e9;
  } else if (resonatorId === 'changli') {
    hairColorHex = 0xfbcfe8; // Fiery peach blonde
    hairHighlightHex = 0xf43f5e; // Crimson flame
    eyeColor = '#f43f5e';
    tiaraEmissiveHex = 0xf59e0b; // Gold phoenix crest
    ribbonGlowHex = 0xe11d48;
  }

  // High-Res Textures
  const faceTexture = createWuwaFaceTexture(eyeColor);
  texturesToDispose.push(faceTexture);

  const silkTexture = createCelestialSilkTexture();
  texturesToDispose.push(silkTexture);

  // Materials: High-end Studio PBR for Collector Scale Figurine
  // 1. Satin PVC Skin with soft subsurface warmth
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffe8dc,
    roughness: 0.38,
    metalness: 0.05,
  });
  materialsToDispose.push(skinMat);

  // 2. Voluminous Anime Hair
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColorHex,
    roughness: 0.42,
    metalness: 0.15,
  });
  materialsToDispose.push(hairMat);

  // 3. White Silk Gown with pearlescent finish
  const whiteDressMat = new THREE.MeshStandardMaterial({
    color: 0xfcfcfd,
    roughness: 0.28,
    metalness: 0.08,
  });
  materialsToDispose.push(whiteDressMat);

  // 4. Black Under-Corset Bodice
  const blackBodiceMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.1,
  });
  materialsToDispose.push(blackBodiceMat);

  // 5. Polished Gold Filigree
  const goldFiligreeMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.85,
  });
  materialsToDispose.push(goldFiligreeMat);

  // 6. Crystal Tiara / Crown Shards
  const crystalTiaraMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: tiaraEmissiveHex,
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92,
  });
  materialsToDispose.push(crystalTiaraMat);

  // 7. Translucent Floating Celestial Starry Silk Ribbons
  const celestialRibbonMat = new THREE.MeshStandardMaterial({
    map: silkTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    roughness: 0.25,
    metalness: 0.1,
  });
  materialsToDispose.push(celestialRibbonMat);

  // 8. Face Decal
  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  materialsToDispose.push(faceMat);

  // ==================== HIERARCHY SETUP ====================
  // Ground flush at Y=0
  const characterRoot = new THREE.Group();
  root.add(characterRoot);

  // 1. TORSO & DRESS
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.48, 0);
  characterRoot.add(torsoGroup);

  // Inner black corset bodice
  const corsetGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.44, 16);
  geometriesToDispose.push(corsetGeo);
  const corsetMesh = new THREE.Mesh(corsetGeo, blackBodiceMat);
  corsetMesh.position.set(0, 0.18, 0);
  torsoGroup.add(corsetMesh);

  // White Silk Tabard Drape (Front and back cascading silk with gold hem)
  const tabardGeo = new THREE.BoxGeometry(0.32, 0.58, 0.38);
  geometriesToDispose.push(tabardGeo);
  const tabardMesh = new THREE.Mesh(tabardGeo, whiteDressMat);
  tabardMesh.position.set(0, 0.14, 0.02);
  torsoGroup.add(tabardMesh);

  // Delicate Halter Neck & Collar Choker
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.2, 12);
  geometriesToDispose.push(neckGeo);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.48, 0);
  torsoGroup.add(neckMesh);

  const collarGeo = new THREE.TorusGeometry(0.088, 0.015, 8, 20);
  collarGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, goldFiligreeMat);
  collarMesh.position.set(0, 0.44, 0);
  torsoGroup.add(collarMesh);

  // Gold Waist Filigree Medallion & Dangling Tassels (from photo)
  const waistMedallionGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8);
  geometriesToDispose.push(waistMedallionGeo);
  const waistMedallion = new THREE.Mesh(waistMedallionGeo, goldFiligreeMat);
  waistMedallion.rotation.x = Math.PI / 2;
  waistMedallion.position.set(0.18, -0.08, 0.15);
  torsoGroup.add(waistMedallion);

  const tasselGeo = new THREE.ConeGeometry(0.025, 0.18, 6);
  geometriesToDispose.push(tasselGeo);
  const tassel = new THREE.Mesh(tasselGeo, goldFiligreeMat);
  tassel.position.set(0.18, -0.22, 0.15);
  torsoGroup.add(tassel);

  // 2. HEAD, ELVEN EARS & CRYSTAL TIARA
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.62, 0);
  torsoGroup.add(headGroup);

  // Sculpted anime head with gentle chin
  const headGeo = new THREE.SphereGeometry(0.22, 20, 20);
  headGeo.scale(0.92, 1.14, 0.95);
  geometriesToDispose.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.14, 0);
  headGroup.add(headMesh);

  // Expressive Face Plane
  const faceGeo = new THREE.PlaneGeometry(0.42, 0.36);
  geometriesToDispose.push(faceGeo);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0.16, 0.21);
  headGroup.add(faceMesh);

  // Pointed Elven Ears (Iconic elf ears from reference image)
  const createElfEar = (isRight: boolean) => {
    const earGroup = new THREE.Group();
    const earGeo = new THREE.ConeGeometry(0.06, 0.3, 4);
    earGeo.rotateZ(isRight ? -Math.PI / 2.8 : Math.PI / 2.8);
    geometriesToDispose.push(earGeo);
    const earMesh = new THREE.Mesh(earGeo, skinMat);
    earGroup.add(earMesh);
    earGroup.position.set(isRight ? 0.22 : -0.22, 0.15, -0.02);
    earGroup.rotation.set(-0.1, isRight ? 0.2 : -0.2, 0);
    headGroup.add(earGroup);
    return earGroup;
  };

  createElfEar(false);
  createElfEar(true);

  // Crystal Blue Tiara / Laurel Crown (Matching reference photo)
  const tiaraGroup = new THREE.Group();
  tiaraGroup.position.set(0, 0.28, 0.08);
  headGroup.add(tiaraGroup);

  const tiaraBandGeo = new THREE.TorusGeometry(0.2, 0.012, 6, 24, Math.PI * 1.1);
  tiaraBandGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(tiaraBandGeo);
  const tiaraBand = new THREE.Mesh(tiaraBandGeo, crystalTiaraMat);
  tiaraGroup.add(tiaraBand);

  // Branching Crystal Shards along the crown
  for (let i = 0; i < 9; i++) {
    const shardAngle = ((i - 4) / 4) * 0.9;
    const shardGeo = new THREE.ConeGeometry(0.022, 0.14 + (i % 2) * 0.06, 4);
    geometriesToDispose.push(shardGeo);
    const shardMesh = new THREE.Mesh(shardGeo, crystalTiaraMat);
    shardMesh.position.set(
      Math.sin(shardAngle) * 0.2,
      0.04,
      Math.cos(shardAngle) * 0.2 - 0.08,
    );
    shardMesh.rotation.set(0.3, 0, -shardAngle * 0.8);
    tiaraGroup.add(shardMesh);
  }

  // Voluminous Anime Hair: Layered bangs, flowing side locks, and cascading back locks
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  // Front Bangs parted gracefully
  const createHairLock = (x: number, y: number, z: number, rz: number, scaleY: number) => {
    const lockGeo = new THREE.ConeGeometry(0.07, 0.3 * scaleY, 4);
    lockGeo.rotateX(Math.PI);
    lockGeo.rotateZ(rz);
    geometriesToDispose.push(lockGeo);
    const lock = new THREE.Mesh(lockGeo, hairMat);
    lock.position.set(x, y, z);
    hairGroup.add(lock);
    return lock;
  };

  createHairLock(-0.1, 0.24, 0.16, 0.15, 1.0);
  createHairLock(-0.03, 0.25, 0.18, 0.04, 1.15);
  createHairLock(0.05, 0.25, 0.18, -0.05, 1.15);
  createHairLock(0.12, 0.24, 0.16, -0.18, 1.0);

  // Long Side Locks framing breasts/shoulders
  const sideLockL = createHairLock(-0.25, 0.08, 0.06, 0.12, 1.8);
  const sideLockR = createHairLock(0.25, 0.08, 0.06, -0.12, 1.8);

  // Cascading Flowing Back Hair Locks
  const backHairGroup = new THREE.Group();
  backHairGroup.position.set(0, 0.18, -0.12);
  hairGroup.add(backHairGroup);

  const backLocks: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const angle = ((i - 3) / 3) * 0.9;
    const lockGeo = new THREE.CylinderGeometry(0.08, 0.02, 1.2, 5);
    geometriesToDispose.push(lockGeo);
    const lock = new THREE.Mesh(lockGeo, hairMat);
    lock.position.set(Math.sin(angle) * 0.22, -0.55, -Math.cos(angle) * 0.1);
    lock.rotation.set(-0.2, 0, -angle * 0.35);
    backHairGroup.add(lock);
    backLocks.push(lock);
  }

  // 3. THE FLOATING CELESTIAL STARRY SILK RIBBONS (Directly matching the reference photo!)
  const ribbonGroup = new THREE.Group();
  torsoGroup.add(ribbonGroup);

  // Left swooping ribbon banner (curving around her left arm)
  const curveL = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.1, 0.1),
    new THREE.Vector3(-0.8, 0.2, 0.3),
    new THREE.Vector3(-1.3, -0.2, 0.2),
    new THREE.Vector3(-1.5, -0.6, -0.2),
    new THREE.Vector3(-1.1, -0.9, -0.4),
  ]);
  const ribbonGeoL = new THREE.TubeGeometry(curveL, 32, 0.14, 6, false);
  ribbonGeoL.scale(1.0, 0.12, 1.0); // Flatten into a silk ribbon tape
  geometriesToDispose.push(ribbonGeoL);
  const ribbonMeshL = new THREE.Mesh(ribbonGeoL, celestialRibbonMat);
  ribbonGroup.add(ribbonMeshL);

  // Right swooping ribbon banner (curving up and out around right arm)
  const curveR = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.3, 0.1, 0.1),
    new THREE.Vector3(0.7, 0.3, 0.2),
    new THREE.Vector3(1.2, 0.45, 0.0),
    new THREE.Vector3(1.6, 0.3, -0.3),
    new THREE.Vector3(1.4, 0.05, -0.5),
  ]);
  const ribbonGeoR = new THREE.TubeGeometry(curveR, 32, 0.14, 6, false);
  ribbonGeoR.scale(1.0, 0.12, 1.0);
  geometriesToDispose.push(ribbonGeoR);
  const ribbonMeshR = new THREE.Mesh(ribbonGeoR, celestialRibbonMat);
  ribbonGroup.add(ribbonMeshR);

  // 4. LEGS & POISE (Stepping gracefully onto water pool)
  const hipsGroup = new THREE.Group();
  hipsGroup.position.set(0, -0.15, 0);
  torsoGroup.add(hipsGroup);

  // Flared pleated skirt
  const skirtGeo = new THREE.ConeGeometry(0.36, 0.42, 16, 1, true);
  skirtGeo.rotateX(Math.PI);
  geometriesToDispose.push(skirtGeo);
  const skirtMesh = new THREE.Mesh(skirtGeo, whiteDressMat);
  skirtMesh.position.set(0, -0.12, 0);
  hipsGroup.add(skirtMesh);

  // Right Leg (Stepping forward lightly)
  const legR = new THREE.Group();
  legR.position.set(0.12, -0.22, 0.05);
  hipsGroup.add(legR);

  const thighGeo = new THREE.CylinderGeometry(0.08, 0.062, 0.52, 14);
  geometriesToDispose.push(thighGeo);
  const thighR = new THREE.Mesh(thighGeo, skinMat);
  thighR.position.set(0, -0.24, 0);
  legR.add(thighR);

  const calfGeo = new THREE.CylinderGeometry(0.062, 0.048, 0.58, 14);
  geometriesToDispose.push(calfGeo);
  const calfR = new THREE.Mesh(calfGeo, skinMat);
  calfR.position.set(0, -0.74, 0.02);
  legR.add(calfR);

  // Strappy Blue Sandal with ankle wrap (from reference photo)
  const sandalSoleGeo = new THREE.BoxGeometry(0.1, 0.04, 0.22);
  geometriesToDispose.push(sandalSoleGeo);
  const sandalSoleR = new THREE.Mesh(sandalSoleGeo, crystalTiaraMat);
  sandalSoleR.position.set(0, -1.04, 0.05);
  legR.add(sandalSoleR);

  const heelGeo = new THREE.CylinderGeometry(0.015, 0.012, 0.12, 8);
  geometriesToDispose.push(heelGeo);
  const heelR = new THREE.Mesh(heelGeo, goldFiligreeMat);
  heelR.position.set(0, -1.08, -0.04);
  legR.add(heelR);

  // Left Leg (Poised gracefully behind)
  const legL = new THREE.Group();
  legL.position.set(-0.12, -0.22, -0.08);
  legL.rotation.set(-0.12, 0, 0.08);
  hipsGroup.add(legL);

  const thighL = new THREE.Mesh(thighGeo, skinMat);
  thighL.position.set(0, -0.24, 0);
  legL.add(thighL);

  const calfL = new THREE.Mesh(calfGeo, skinMat);
  calfL.position.set(0, -0.74, 0);
  legL.add(calfL);

  const sandalSoleL = new THREE.Mesh(sandalSoleGeo, crystalTiaraMat);
  sandalSoleL.position.set(0, -1.04, 0.05);
  legL.add(sandalSoleL);

  const heelL = new THREE.Mesh(heelGeo, goldFiligreeMat);
  heelL.position.set(0, -1.08, -0.04);
  legL.add(heelL);

  // 5. ARMS & POISE
  // Right Arm: Raised gracefully toward head/hair
  const armR = new THREE.Group();
  armR.position.set(0.28, 0.32, 0);
  armR.rotation.set(-0.8, -0.3, 1.1); // Raised near ear
  torsoGroup.add(armR);

  const upperArmGeo = new THREE.CylinderGeometry(0.048, 0.042, 0.38, 10);
  geometriesToDispose.push(upperArmGeo);
  const upperArmR = new THREE.Mesh(upperArmGeo, skinMat);
  upperArmR.position.set(0, -0.18, 0);
  armR.add(upperArmR);

  const forearmGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.36, 10);
  geometriesToDispose.push(forearmGeo);
  const forearmR = new THREE.Mesh(forearmGeo, skinMat);
  forearmR.position.set(0, -0.5, 0);
  armR.add(forearmR);

  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
  handR.position.set(0, -0.7, 0);
  armR.add(handR);

  // Left Arm: Outstretched gracefully sideways
  const armL = new THREE.Group();
  armL.position.set(-0.28, 0.32, 0);
  armL.rotation.set(0.1, 0.2, -0.9); // Outstretched
  torsoGroup.add(armL);

  const upperArmL = new THREE.Mesh(upperArmGeo, skinMat);
  upperArmL.position.set(0, -0.18, 0);
  armL.add(upperArmL);

  const forearmL = new THREE.Mesh(forearmGeo, skinMat);
  forearmL.position.set(0, -0.5, 0);
  armL.add(forearmL);

  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), skinMat);
  handL.position.set(0, -0.7, 0);
  armL.add(handL);

  // 6. FLOATING WEAPON / RESONANCE CORE
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, 1.2, 0.7);
  characterRoot.add(weaponGroup);

  if (resonatorId === 'jinhsi') {
    // Ages of Harvest Greatsword (時序之華)
    const bladeGeo = new THREE.BoxGeometry(0.16, 1.8, 0.03);
    geometriesToDispose.push(bladeGeo);
    const bladeMesh = new THREE.Mesh(bladeGeo, goldFiligreeMat);
    bladeMesh.rotation.set(0.2, 0, 0.3);
    weaponGroup.add(bladeMesh);
  } else if (resonatorId === 'changli') {
    // Blazing Phoenix Fan
    const fanGeo = new THREE.CircleGeometry(0.45, 12, 0, Math.PI);
    geometriesToDispose.push(fanGeo);
    const fanMesh = new THREE.Mesh(fanGeo, goldFiligreeMat);
    fanMesh.rotation.set(0.3, 0, -0.5);
    weaponGroup.add(fanMesh);
  } else {
    // Stellar Butterfly Magatama Sphere (Shorekeeper)
    const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
    geometriesToDispose.push(sphereGeo);
    const sphereMesh = new THREE.Mesh(sphereGeo, crystalTiaraMat);
    weaponGroup.add(sphereMesh);
  }

  let currentAction: ResonatorAction = 'standby';

  return {
    group: root,
    update(time, delta, waveSpeed) {
      // Gentle breathing
      const breath = Math.sin(time * 2.0) * 0.012;
      torsoGroup.position.y = 1.48 + breath;

      // Floating Celestial Ribbons dynamic wave motion
      const wave = Math.sin(time * 3.0 * waveSpeed) * 0.15;
      const waveCos = Math.cos(time * 2.5 * waveSpeed) * 0.12;

      ribbonGroup.rotation.y = wave * 0.5;
      ribbonMeshL.rotation.z = wave * 0.4;
      ribbonMeshR.rotation.z = -wave * 0.4;
      ribbonMeshL.position.y = waveCos * 0.08;
      ribbonMeshR.position.y = -waveCos * 0.08;

      // Flowing hair sway
      sideLockL.rotation.z = 0.12 + wave * 0.3;
      sideLockR.rotation.z = -0.12 + wave * 0.3;

      backLocks.forEach((lock, i) => {
        lock.rotation.z = Math.sin(time * 2.4 * waveSpeed + i * 0.5) * 0.08;
      });

      // Weapon floating orbit
      weaponGroup.position.y = 1.2 + Math.sin(time * 2.0) * 0.06;
      weaponGroup.rotation.y = time * 0.8;

      // Action updates
      if (currentAction === 'resonance_liberation') {
        // Dramatic liberation pose
        armR.rotation.set(-1.4, 0.2, 0.8);
        armL.rotation.set(-1.2, -0.3, -0.8);
        ribbonGroup.scale.setScalar(1.0 + 0.1 * Math.sin(time * 8.0));
      } else if (currentAction === 'resonance_skill') {
        armR.rotation.set(-0.9, -0.2, 0.5);
        armL.rotation.set(-0.6, 0.4, -0.4);
      } else {
        // Standby exhibition pose (matching reference image)
        armR.rotation.set(-0.8, -0.3, 1.1);
        armL.rotation.set(0.1, 0.2, -0.9);
      }
    },
    setAction(action) {
      currentAction = action;
    },
    setRibbonGlow(active) {
      celestialRibbonMat.emissive = active ? new THREE.Color(ribbonGlowHex) : new THREE.Color(0x000000);
      celestialRibbonMat.emissiveIntensity = active ? 0.6 : 0.0;
    },
    dispose() {
      for (const g of geometriesToDispose) g.dispose();
      for (const m of materialsToDispose) m.dispose();
      for (const t of texturesToDispose) t.dispose();
    },
  };
}
