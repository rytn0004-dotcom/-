import * as THREE from 'three';
import { AnimeCharacterId, AnimeExpression, AnimePose, AnimeShaderStyle, AnimeWeapon } from '../types/anime';
import { createCelMaterial, createOutlineMaterial } from '../shaders/celShaders';
import { createAnimeFaceTexture, createKimonoPatternTexture } from '../utils/animeTextures';

export interface AnimeModelController {
  group: THREE.Group;
  update: (time: number, delta: number, windSpeed: number) => void;
  setPose: (pose: AnimePose) => void;
  setExpression: (expr: AnimeExpression) => void;
  setWeapon: (weapon: AnimeWeapon) => void;
  updateShaderStyle: (style: AnimeShaderStyle) => void;
  setOutlineThickness: (thickness: number) => void;
  dispose: () => void;
}

/**
 * Creates a helper mesh for inverted hull outline
 */
function attachOutline(mesh: THREE.Mesh, outlineMat: THREE.ShaderMaterial): THREE.Mesh {
  const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
  mesh.add(outlineMesh);
  return outlineMesh;
}

/**
 * Helper to register materials for unified disposal & style updating
 */
class MaterialRegistry {
  private materials: THREE.ShaderMaterial[] = [];
  private outlineMaterials: THREE.ShaderMaterial[] = [];
  private otherMaterials: THREE.Material[] = [];

  register<T extends THREE.ShaderMaterial>(mat: T): T {
    this.materials.push(mat);
    return mat;
  }

  registerOutline(mat: THREE.ShaderMaterial): THREE.ShaderMaterial {
    this.outlineMaterials.push(mat);
    return mat;
  }

  registerOther<T extends THREE.Material>(mat: T): T {
    this.otherMaterials.push(mat);
    return mat;
  }

  updateTime(time: number) {
    for (const m of this.materials) {
      if (m.uniforms && m.uniforms.uTime) {
        m.uniforms.uTime.value = time;
      }
    }
  }

  setOutlineThickness(thickness: number) {
    for (const m of this.outlineMaterials) {
      if (m.uniforms && m.uniforms.uThickness) {
        m.uniforms.uThickness.value = thickness;
      }
    }
  }

  updateStyle(style: AnimeShaderStyle) {
    let styleIndex = 0;
    let rim = new THREE.Color(0xffffff);

    if (style === 'cyber_neon') {
      styleIndex = 1;
      rim = new THREE.Color(0x00f0ff);
    } else if (style === 'manga_ink') {
      styleIndex = 2;
    } else if (style === 'sunset_golden') {
      styleIndex = 3;
      rim = new THREE.Color(0xffaa44);
    } else if (style === 'sakura_dream') {
      styleIndex = 4;
      rim = new THREE.Color(0xffd1dc);
    }

    for (const m of this.materials) {
      if (m.uniforms) {
        if (m.uniforms.uStyle) m.uniforms.uStyle.value = styleIndex;
        if (m.uniforms.uRimColor) m.uniforms.uRimColor.value = rim;
      }
    }
  }

  dispose() {
    for (const m of this.materials) m.dispose();
    for (const m of this.outlineMaterials) m.dispose();
    for (const m of this.otherMaterials) m.dispose();
  }
}

/**
 * Procedural Character 1: Aoi - Cyber Ronin Maiden
 */
export function buildRoninCharacter(
  initialStyle: AnimeShaderStyle,
  initialOutlineThickness: number,
): AnimeModelController {
  const root = new THREE.Group();
  root.name = 'Aoi_CyberRonin';

  const reg = new MaterialRegistry();

  // Create Outline Materials
  const outlineMatDark = reg.registerOutline(createOutlineMaterial(0x181024, initialOutlineThickness));
  const outlineMatGold = reg.registerOutline(createOutlineMaterial(0x78350f, initialOutlineThickness * 0.8));

  // Textures
  let faceTexture = createAnimeFaceTexture('determined');
  const kimonoTexture = createKimonoPatternTexture();

  // Color Palette
  const skinColor = 0xffe4d6;
  const hairColor = 0x1e1b4b; // Deep midnight navy anime hair
  const hairHighlight = 0x6366f1; // Violet blue shine
  const outfitDark = 0x111827; // Carbon black
  const outfitAccent = 0xd946ef; // Cyber magenta
  const goldColor = 0xf59e0b; // Gold trim
  const armorSteel = 0x334155; // Armored plates

  // Materials
  const skinMat = reg.register(createCelMaterial({ color: skinColor }, initialStyle));
  const hairMat = reg.register(createCelMaterial({ color: hairColor, rimColor: hairHighlight }, initialStyle));
  const outfitMat = reg.register(createCelMaterial({ color: outfitDark }, initialStyle));
  const kimonoPatternMat = reg.register(createCelMaterial({ color: 0xffffff, map: kimonoTexture }, initialStyle));
  const accentMat = reg.register(createCelMaterial({ color: outfitAccent, emissive: outfitAccent, emissiveIntensity: 0.2 }, initialStyle));
  const goldMat = reg.register(createCelMaterial({ color: goldColor, roughness: 0.2 }, initialStyle));
  const armorMat = reg.register(createCelMaterial({ color: armorSteel, roughness: 0.3 }, initialStyle));
  const bladeGlowMat = reg.register(createCelMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.85,
    rimColor: 0xffffff,
  }, initialStyle));

  // Face Material
  const faceMat = reg.registerOther(new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  }));

  // ==================== HIERARCHY SETUP ====================
  // Ground pivot at Y=0
  const characterBase = new THREE.Group();
  root.add(characterBase);

  // 1. TORSO & KIMONO BODY
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.35, 0);
  characterBase.add(torsoGroup);

  // Main Chest
  const chestGeo = new THREE.CylinderGeometry(0.24, 0.18, 0.5, 12);
  const chestMesh = new THREE.Mesh(chestGeo, kimonoPatternMat);
  chestMesh.position.set(0, 0.2, 0);
  torsoGroup.add(chestMesh);
  attachOutline(chestMesh, outlineMatDark);

  // High Collar Neck & Inner Body
  const neckGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.52, 0);
  torsoGroup.add(neckMesh);
  attachOutline(neckMesh, outlineMatDark);

  // Gold Choker / Neck Accent
  const chokerGeo = new THREE.TorusGeometry(0.095, 0.015, 8, 16);
  chokerGeo.rotateX(Math.PI / 2);
  const chokerMesh = new THREE.Mesh(chokerGeo, goldMat);
  chokerMesh.position.set(0, 0.48, 0);
  torsoGroup.add(chokerMesh);

  // Obi Sash (Waist Belt)
  const obiGeo = new THREE.CylinderGeometry(0.2, 0.21, 0.18, 12);
  const obiMesh = new THREE.Mesh(obiGeo, accentMat);
  obiMesh.position.set(0, -0.05, 0);
  torsoGroup.add(obiMesh);
  attachOutline(obiMesh, outlineMatGold);

  // Obi Knot & Back Bow
  const obiBowGroup = new THREE.Group();
  obiBowGroup.position.set(0, -0.05, -0.22);
  const bowLeftGeo = new THREE.BoxGeometry(0.18, 0.1, 0.06);
  bowLeftGeo.rotateZ(0.2);
  const bowRightGeo = new THREE.BoxGeometry(0.18, 0.1, 0.06);
  bowRightGeo.rotateZ(-0.2);
  const bowLeft = new THREE.Mesh(bowLeftGeo, accentMat);
  bowLeft.position.set(-0.1, 0, 0);
  const bowRight = new THREE.Mesh(bowRightGeo, accentMat);
  bowRight.position.set(0.1, 0, 0);
  obiBowGroup.add(bowLeft, bowRight);
  attachOutline(bowLeft, outlineMatGold);
  attachOutline(bowRight, outlineMatGold);
  torsoGroup.add(obiBowGroup);

  // 2. HEAD & ANIME HAIR
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.65, 0);
  torsoGroup.add(headGroup);

  // Stylized Anime Head (Sphere with tapered chin)
  const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
  headGeo.scale(0.95, 1.15, 0.95);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.15, 0);
  headGroup.add(headMesh);
  attachOutline(headMesh, outlineMatDark);

  // Expressive Face Decal Plane
  const faceGeo = new THREE.PlaneGeometry(0.44, 0.38);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0.17, 0.22);
  headGroup.add(faceMesh);

  // Anime Hair Bangs (Faceted front anime tufts)
  const bangsGroup = new THREE.Group();
  bangsGroup.position.set(0, 0.28, 0.12);
  headGroup.add(bangsGroup);

  const createHairLock = (w: number, h: number, d: number, rotZ: number, posX: number, posY: number) => {
    const lockGeo = new THREE.ConeGeometry(w, h, 4);
    lockGeo.rotateX(Math.PI);
    lockGeo.rotateZ(rotZ);
    const lockMesh = new THREE.Mesh(lockGeo, hairMat);
    lockMesh.position.set(posX, posY, 0.08);
    bangsGroup.add(lockMesh);
    attachOutline(lockMesh, outlineMatDark);
    return lockMesh;
  };

  createHairLock(0.08, 0.24, 0.05, 0.15, -0.14, 0.0);
  createHairLock(0.09, 0.28, 0.05, -0.05, -0.05, -0.03);
  createHairLock(0.08, 0.26, 0.05, -0.15, 0.05, -0.02);
  createHairLock(0.08, 0.22, 0.05, -0.25, 0.14, 0.01);

  // Side Bangs framing face
  const sideBangLeft = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 4), hairMat);
  sideBangLeft.rotation.set(0.1, 0, 0.15);
  sideBangLeft.position.set(-0.24, 0.05, 0.05);
  headGroup.add(sideBangLeft);
  attachOutline(sideBangLeft, outlineMatDark);

  const sideBangRight = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.42, 4), hairMat);
  sideBangRight.rotation.set(0.1, 0, -0.15);
  sideBangRight.position.set(0.24, 0.05, 0.05);
  headGroup.add(sideBangRight);
  attachOutline(sideBangRight, outlineMatDark);

  // Twin-Tails (Dynamic ponytail clumps with ribbon ties)
  const twintailLeft = new THREE.Group();
  twintailLeft.position.set(-0.25, 0.32, -0.1);
  headGroup.add(twintailLeft);

  const twintailRight = new THREE.Group();
  twintailRight.position.set(0.25, 0.32, -0.1);
  headGroup.add(twintailRight);

  // Gold Hair Ribbons
  const ribbonGeo = new THREE.TorusGeometry(0.05, 0.018, 6, 12);
  const ribbonL = new THREE.Mesh(ribbonGeo, goldMat);
  const ribbonR = new THREE.Mesh(ribbonGeo, goldMat);
  twintailLeft.add(ribbonL);
  twintailRight.add(ribbonR);

  // Cascading Hair Segments (Curved segmented locks)
  const hairSegmentsL: THREE.Mesh[] = [];
  const hairSegmentsR: THREE.Mesh[] = [];

  for (let i = 0; i < 4; i++) {
    const rTop = 0.08 - i * 0.015;
    const rBot = 0.06 - i * 0.012;
    const segGeo = new THREE.CylinderGeometry(rTop, rBot, 0.26, 6);
    const segL = new THREE.Mesh(segGeo, hairMat);
    const segR = new THREE.Mesh(segGeo, hairMat);

    segL.position.set(-0.02 * i, -0.22 * (i + 1), -0.03 * i);
    segR.position.set(0.02 * i, -0.22 * (i + 1), -0.03 * i);

    twintailLeft.add(segL);
    twintailRight.add(segR);
    attachOutline(segL, outlineMatDark);
    attachOutline(segR, outlineMatDark);

    hairSegmentsL.push(segL);
    hairSegmentsR.push(segR);
  }

  // 3. SKIRT & LEGS
  const hipsGroup = new THREE.Group();
  hipsGroup.position.set(0, -0.15, 0);
  torsoGroup.add(hipsGroup);

  // Pleated Hakama Skirt (Faceted flared skirt)
  const skirtGeo = new THREE.ConeGeometry(0.38, 0.45, 12, 1, true);
  skirtGeo.rotateX(Math.PI);
  const skirtMesh = new THREE.Mesh(skirtGeo, kimonoPatternMat);
  skirtMesh.position.set(0, -0.15, 0);
  hipsGroup.add(skirtMesh);
  attachOutline(skirtMesh, outlineMatDark);

  // Leg Left
  const legLeft = new THREE.Group();
  legLeft.position.set(-0.13, -0.25, 0);
  hipsGroup.add(legLeft);

  const thighGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.45, 10);
  const thighL = new THREE.Mesh(thighGeo, outfitMat); // Black thigh-high
  thighL.position.set(0, -0.2, 0);
  legLeft.add(thighL);
  attachOutline(thighL, outlineMatDark);

  // Shin & Boot
  const shinGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.48, 10);
  const bootL = new THREE.Mesh(shinGeo, armorMat);
  bootL.position.set(0, -0.62, 0);
  legLeft.add(bootL);
  attachOutline(bootL, outlineMatDark);

  // Cyber Geta Sole
  const soleGeo = new THREE.BoxGeometry(0.12, 0.06, 0.24);
  const soleL = new THREE.Mesh(soleGeo, goldMat);
  soleL.position.set(0, -0.88, 0.04);
  legLeft.add(soleL);

  // Leg Right
  const legRight = new THREE.Group();
  legRight.position.set(0.13, -0.25, 0);
  hipsGroup.add(legRight);

  const thighR = new THREE.Mesh(thighGeo, outfitMat);
  thighR.position.set(0, -0.2, 0);
  legRight.add(thighR);
  attachOutline(thighR, outlineMatDark);

  const bootR = new THREE.Mesh(shinGeo, armorMat);
  bootR.position.set(0, -0.62, 0);
  legRight.add(bootR);
  attachOutline(bootR, outlineMatDark);

  const soleR = new THREE.Mesh(soleGeo, goldMat);
  soleR.position.set(0, -0.88, 0.04);
  legRight.add(soleR);

  // 4. ARMS & WEAPON RIG
  // Left Shoulder & Arm
  const armLeft = new THREE.Group();
  armLeft.position.set(-0.28, 0.32, 0);
  torsoGroup.add(armLeft);

  const sleeveGeo = new THREE.SphereGeometry(0.12, 10, 8);
  sleeveGeo.scale(1.0, 1.4, 1.0);
  const sleeveL = new THREE.Mesh(sleeveGeo, kimonoPatternMat);
  armLeft.add(sleeveL);
  attachOutline(sleeveL, outlineMatDark);

  const forearmGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.35, 8);
  const forearmL = new THREE.Mesh(forearmGeo, armorMat);
  forearmL.position.set(0, -0.3, 0);
  armLeft.add(forearmL);
  attachOutline(forearmL, outlineMatDark);

  const handGeo = new THREE.SphereGeometry(0.048, 8, 8);
  const handL = new THREE.Mesh(handGeo, skinMat);
  handL.position.set(0, -0.5, 0);
  armLeft.add(handL);

  // Right Shoulder & Arm
  const armRight = new THREE.Group();
  armRight.position.set(0.28, 0.32, 0);
  torsoGroup.add(armRight);

  const sleeveR = new THREE.Mesh(sleeveGeo, kimonoPatternMat);
  armRight.add(sleeveR);
  attachOutline(sleeveR, outlineMatDark);

  const forearmR = new THREE.Mesh(forearmGeo, armorMat);
  forearmR.position.set(0, -0.3, 0);
  armRight.add(forearmR);
  attachOutline(forearmR, outlineMatDark);

  const handR = new THREE.Mesh(handGeo, skinMat);
  handR.position.set(0, -0.5, 0);
  armRight.add(handR);

  // 5. WEAPON RIG: KATANA & SCABBARD
  const weaponGroup = new THREE.Group();
  handR.add(weaponGroup);

  // Katana Model
  const katanaGroup = new THREE.Group();
  katanaGroup.name = 'KatanaGroup';
  weaponGroup.add(katanaGroup);

  // Tsuka (Handle)
  const hiltGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.28, 8);
  const hiltMesh = new THREE.Mesh(hiltGeo, accentMat);
  hiltMesh.position.set(0, 0.1, 0);
  katanaGroup.add(hiltMesh);
  attachOutline(hiltMesh, outlineMatGold);

  // Tsuba (Guard)
  const tsubaGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.015, 12);
  const tsubaMesh = new THREE.Mesh(tsubaGeo, goldMat);
  tsubaMesh.position.set(0, 0.24, 0);
  katanaGroup.add(tsubaMesh);
  attachOutline(tsubaMesh, outlineMatGold);

  // Polished Hamon Blade
  const bladeGeo = new THREE.BoxGeometry(0.015, 0.95, 0.05);
  bladeGeo.translate(0, 0.47, 0.01);
  const bladeMesh = new THREE.Mesh(bladeGeo, bladeGlowMat);
  bladeMesh.position.set(0, 0.25, 0);
  katanaGroup.add(bladeMesh);
  attachOutline(bladeMesh, outlineMatDark);

  // Scabbard (Saya) on left hip
  const scabbardGroup = new THREE.Group();
  scabbardGroup.position.set(-0.25, -0.1, 0.05);
  scabbardGroup.rotation.set(0.4, 0.2, 0.5);
  torsoGroup.add(scabbardGroup);

  const scabbardGeo = new THREE.BoxGeometry(0.03, 1.05, 0.06);
  const scabbardMesh = new THREE.Mesh(scabbardGeo, outfitMat);
  scabbardGroup.add(scabbardMesh);
  attachOutline(scabbardMesh, outlineMatGold);

  // Katana Energy Slash Arc (for Combat pose)
  const slashGeo = new THREE.RingGeometry(0.8, 1.25, 24, 1, 0, Math.PI * 0.7);
  const slashMat = reg.registerOther(new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.rotation.set(Math.PI / 2, 0.3, -0.5);
  slashArc.position.set(0, 0.2, 0.3);
  characterBase.add(slashArc);

  // Current Pose State
  let currentPose: AnimePose = 'idle';

  return {
    group: root,
    update(time, delta, windSpeed) {
      reg.updateTime(time);

      // Natural breathing motion
      const breath = Math.sin(time * 2.2) * 0.018;
      torsoGroup.position.y = 1.35 + breath;

      // Wind sway on hair bangs & twin-tails
      const sway = Math.sin(time * 3.5 * windSpeed) * 0.12 * windSpeed;
      const swayCos = Math.cos(time * 3.0 * windSpeed) * 0.08 * windSpeed;

      twintailLeft.rotation.z = -0.1 + sway;
      twintailLeft.rotation.x = 0.08 + swayCos;
      twintailRight.rotation.z = 0.1 + sway;
      twintailRight.rotation.x = 0.08 - swayCos;

      bangsGroup.rotation.y = sway * 0.4;

      // Cascade sway through hair segments
      hairSegmentsL.forEach((seg, i) => {
        seg.rotation.z = sway * (0.3 + i * 0.2);
      });
      hairSegmentsR.forEach((seg, i) => {
        seg.rotation.z = -sway * (0.3 + i * 0.2);
      });

      // Pose updates & blade pulse
      if (bladeGlowMat.uniforms.uEmissiveIntensity) {
        bladeGlowMat.uniforms.uEmissiveIntensity.value = 0.75 + 0.25 * Math.sin(time * 4.0);
      }

      // Dynamic animation based on pose
      if (currentPose === 'idle') {
        headGroup.rotation.y = Math.sin(time * 0.8) * 0.06;
        headGroup.rotation.x = Math.sin(time * 1.2) * 0.03;

        armLeft.rotation.set(0.15, 0, 0.2);
        armRight.rotation.set(0.15, 0, -0.2);

        katanaGroup.rotation.set(0, 0, Math.PI * 0.85);
        katanaGroup.position.set(0, 0, 0);

        slashMat.opacity = 0;
      } else if (currentPose === 'katana_ready') {
        // Ready stance: two hands holding katana in front, low stance
        characterBase.position.y = -0.08;
        legLeft.rotation.set(0.25, 0.1, -0.15);
        legRight.rotation.set(-0.25, -0.1, 0.15);

        torsoGroup.rotation.y = 0.35;
        headGroup.rotation.y = -0.35;

        armRight.rotation.set(-0.8, -0.2, 0.4);
        armLeft.rotation.set(-0.6, 0.3, -0.4);

        katanaGroup.rotation.set(-0.4, 0.2, 0.1);
        slashMat.opacity = 0;
      } else if (currentPose === 'combat_slash') {
        // High speed dynamic anime slash pose
        characterBase.position.y = -0.05;
        torsoGroup.rotation.set(0.2, 0.6, -0.1);
        headGroup.rotation.set(-0.15, -0.4, 0);

        armRight.rotation.set(-1.4, 0.8, 1.2);
        armLeft.rotation.set(0.6, -0.4, -0.6);

        katanaGroup.rotation.set(-0.8, 0, 1.5);

        // Flash slash arc
        slashMat.opacity = 0.7 + 0.3 * Math.sin(time * 12.0);
        slashArc.rotation.z = time * 2.0;
      } else if (currentPose === 'magic_cast') {
        // Floating celestial pose
        characterBase.position.y = Math.sin(time * 1.8) * 0.08 + 0.15;
        torsoGroup.rotation.set(-0.08, 0, 0);
        headGroup.rotation.set(-0.12, 0, 0);

        armLeft.rotation.set(-1.1, 0.3, -0.8);
        armRight.rotation.set(-1.1, -0.3, 0.8);

        katanaGroup.rotation.set(0, Math.PI / 2, 0);
        slashMat.opacity = 0.2 + 0.15 * Math.sin(time * 3.0);
      }
    },
    setPose(pose) {
      currentPose = pose;
    },
    setExpression(expr) {
      // Regenerate face canvas texture
      faceTexture.dispose();
      faceTexture = createAnimeFaceTexture(expr);
      faceMat.map = faceTexture;
      faceMat.needsUpdate = true;
    },
    setWeapon(weapon) {
      if (weapon === 'katana') {
        katanaGroup.visible = true;
        bladeMesh.material = bladeGlowMat;
        scabbardGroup.visible = true;
      } else if (weapon === 'plasma_blade') {
        katanaGroup.visible = true;
        bladeGlowMat.uniforms.uBaseColor.value.setHex(0xf43f5e); // Neon pink plasma
        bladeGlowMat.uniforms.uEmissive.value.setHex(0xf43f5e);
        scabbardGroup.visible = false;
      } else {
        katanaGroup.visible = false;
        scabbardGroup.visible = true;
      }
    },
    updateShaderStyle(style) {
      reg.updateStyle(style);
    },
    setOutlineThickness(thickness) {
      reg.setOutlineThickness(thickness);
    },
    dispose() {
      reg.dispose();
      faceTexture.dispose();
      kimonoTexture.dispose();
      faceMat.dispose();
    },
  };
}

/**
 * Procedural Character 2: Unit-09 Cyber Striker (Mecha)
 */
export function buildMechaCharacter(
  initialStyle: AnimeShaderStyle,
  initialOutlineThickness: number,
): AnimeModelController {
  const root = new THREE.Group();
  root.name = 'Unit09_AnimeMecha';

  const reg = new MaterialRegistry();
  const outlineMatDark = reg.registerOutline(createOutlineMaterial(0x090d16, initialOutlineThickness * 1.1));
  const outlineMatNeon = reg.registerOutline(createOutlineMaterial(0x00f0ff, initialOutlineThickness * 0.7));

  // Mecha Colors: White / Dark Navy / Neon Red / Gold accents
  const armorWhite = 0xf1f5f9;
  const armorNavy = 0x0f172a;
  const mechaRed = 0xe11d48;
  const mechaGold = 0xf59e0b;
  const opticCyan = 0x06b6d4;

  const whiteMat = reg.register(createCelMaterial({ color: armorWhite, roughness: 0.25 }, initialStyle));
  const navyMat = reg.register(createCelMaterial({ color: armorNavy, roughness: 0.3 }, initialStyle));
  const redMat = reg.register(createCelMaterial({ color: mechaRed, emissive: mechaRed, emissiveIntensity: 0.2 }, initialStyle));
  const goldMat = reg.register(createCelMaterial({ color: mechaGold, roughness: 0.2 }, initialStyle));
  const opticMat = reg.register(createCelMaterial({
    color: opticCyan,
    emissive: opticCyan,
    emissiveIntensity: 0.9,
  }, initialStyle));

  const base = new THREE.Group();
  root.add(base);

  // 1. MECHA TORSO & COCKPIT CORE
  const torso = new THREE.Group();
  torso.position.set(0, 1.45, 0);
  base.add(torso);

  const chestGeo = new THREE.BoxGeometry(0.65, 0.55, 0.42);
  const chestMesh = new THREE.Mesh(chestGeo, navyMat);
  torso.add(chestMesh);
  attachOutline(chestMesh, outlineMatDark);

  // Red Cockpit Hatch Chest Armor
  const hatchGeo = new THREE.ConeGeometry(0.24, 0.42, 4);
  hatchGeo.rotateY(Math.PI / 4);
  hatchGeo.rotateX(Math.PI / 2);
  const hatchMesh = new THREE.Mesh(hatchGeo, redMat);
  hatchMesh.position.set(0, 0.05, 0.24);
  torso.add(hatchMesh);
  attachOutline(hatchMesh, outlineMatNeon);

  // Glowing Core Reactor in chest center
  const coreGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
  coreGeo.rotateX(Math.PI / 2);
  const coreMesh = new THREE.Mesh(coreGeo, opticMat);
  coreMesh.position.set(0, 0.02, 0.28);
  torso.add(coreMesh);

  // 2. BACKPACK THRUSTERS
  const backpack = new THREE.Group();
  backpack.position.set(0, 0.15, -0.32);
  torso.add(backpack);

  const packBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.25), navyMat);
  backpack.add(packBox);
  attachOutline(packBox, outlineMatDark);

  // Twin Thruster Cones
  const thrusterGeo = new THREE.ConeGeometry(0.12, 0.3, 10, 1, true);
  thrusterGeo.rotateX(Math.PI);
  const thrusterL = new THREE.Mesh(thrusterGeo, redMat);
  thrusterL.position.set(-0.2, -0.22, 0);
  const thrusterR = new THREE.Mesh(thrusterGeo, redMat);
  thrusterR.position.set(0.2, -0.22, 0);
  backpack.add(thrusterL, thrusterR);
  attachOutline(thrusterL, outlineMatDark);
  attachOutline(thrusterR, outlineMatDark);

  // Thruster Flames
  const flameGeo = new THREE.ConeGeometry(0.09, 0.45, 8);
  const flameMat = reg.registerOther(new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.8,
  }));
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(-0.2, -0.5, 0);
  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(0.2, -0.5, 0);
  backpack.add(flameL, flameR);

  // 3. MECHA HEAD & V-FIN ANTENNA
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.48, 0);
  torso.add(headGroup);

  const headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.3);
  const headMesh = new THREE.Mesh(headGeo, whiteMat);
  headGroup.add(headMesh);
  attachOutline(headMesh, outlineMatDark);

  // Glowing Anime Mecha Visor / Dual Eyes
  const visorGeo = new THREE.BoxGeometry(0.22, 0.07, 0.06);
  const visorMesh = new THREE.Mesh(visorGeo, opticMat);
  visorMesh.position.set(0, 0.02, 0.16);
  headGroup.add(visorMesh);

  // Iconic Gold V-Fin Antenna
  const vFinL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.03), goldMat);
  vFinL.rotation.set(0, 0, 0.65);
  vFinL.position.set(-0.16, 0.24, 0.12);
  const vFinR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.03), goldMat);
  vFinR.rotation.set(0, 0, -0.65);
  vFinR.position.set(0.16, 0.24, 0.12);
  headGroup.add(vFinL, vFinR);
  attachOutline(vFinL, outlineMatDark);
  attachOutline(vFinR, outlineMatDark);

  // 4. MECHA SHOULDERS & ARMS
  const armL = new THREE.Group();
  armL.position.set(-0.48, 0.22, 0);
  torso.add(armL);

  const shoulderPadGeo = new THREE.BoxGeometry(0.32, 0.35, 0.35);
  const padL = new THREE.Mesh(shoulderPadGeo, whiteMat);
  armL.add(padL);
  attachOutline(padL, outlineMatDark);

  const armSubL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), navyMat);
  armSubL.position.set(0, -0.38, 0);
  armL.add(armSubL);
  attachOutline(armSubL, outlineMatDark);

  const armR = new THREE.Group();
  armR.position.set(0.48, 0.22, 0);
  torso.add(armR);

  const padR = new THREE.Mesh(shoulderPadGeo, whiteMat);
  armR.add(padR);
  attachOutline(padR, outlineMatDark);

  const armSubR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), navyMat);
  armSubR.position.set(0, -0.38, 0);
  armR.add(armSubR);
  attachOutline(armSubR, outlineMatDark);

  // Mecha Energy Blade Naginata
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0, -0.6, 0);
  armR.add(bladeGroup);

  const bladeStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), navyMat);
  bladeGroup.add(bladeStaff);
  attachOutline(bladeStaff, outlineMatDark);

  const beamBladeGeo = new THREE.BoxGeometry(0.02, 0.85, 0.15);
  const beamBladeMesh = new THREE.Mesh(beamBladeGeo, opticMat);
  beamBladeMesh.position.set(0, 0.85, 0.05);
  bladeGroup.add(beamBladeMesh);

  // 5. MECHA LEGS & SKIRT ARMOR
  const hips = new THREE.Group();
  hips.position.set(0, -0.35, 0);
  torso.add(hips);

  // Front Skirt Plate
  const skirtFront = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.06), redMat);
  skirtFront.position.set(0, 0, 0.22);
  skirtFront.rotation.x = -0.2;
  hips.add(skirtFront);
  attachOutline(skirtFront, outlineMatDark);

  // Side Skirt Binders
  const skirtSideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), whiteMat);
  skirtSideL.position.set(-0.32, -0.1, 0);
  const skirtSideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), whiteMat);
  skirtSideR.position.set(0.32, -0.1, 0);
  hips.add(skirtSideL, skirtSideR);
  attachOutline(skirtSideL, outlineMatDark);
  attachOutline(skirtSideR, outlineMatDark);

  // Legs
  const legL = new THREE.Group();
  legL.position.set(-0.24, -0.2, 0);
  hips.add(legL);

  const thighMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.2), navyMat);
  thighMeshL.position.set(0, -0.22, 0);
  legL.add(thighMeshL);
  attachOutline(thighMeshL, outlineMatDark);

  const calfMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.28), whiteMat);
  calfMeshL.position.set(0, -0.7, 0);
  legL.add(calfMeshL);
  attachOutline(calfMeshL, outlineMatDark);

  const footMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.42), redMat);
  footMeshL.position.set(0, -1.02, 0.08);
  legL.add(footMeshL);
  attachOutline(footMeshL, outlineMatDark);

  const legR = new THREE.Group();
  legR.position.set(0.24, -0.2, 0);
  hips.add(legR);

  const thighMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.2), navyMat);
  thighMeshR.position.set(0, -0.22, 0);
  legR.add(thighMeshR);
  attachOutline(thighMeshR, outlineMatDark);

  const calfMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.28), whiteMat);
  calfMeshR.position.set(0, -0.7, 0);
  legR.add(calfMeshR);
  attachOutline(calfMeshR, outlineMatDark);

  const footMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.42), redMat);
  footMeshR.position.set(0, -1.02, 0.08);
  legR.add(footMeshR);
  attachOutline(footMeshR, outlineMatDark);

  let currentPose: AnimePose = 'idle';

  return {
    group: root,
    update(time, delta) {
      reg.updateTime(time);

      // Mecha engine vibration & hover
      const hover = Math.sin(time * 2.8) * 0.02;
      torso.position.y = 1.45 + hover;

      // Thruster flame flicker
      const flameScale = 0.8 + 0.35 * Math.sin(time * 24.0);
      flameL.scale.set(1, flameScale, 1);
      flameR.scale.set(1, flameScale, 1);

      if (currentPose === 'idle') {
        headGroup.rotation.y = Math.sin(time * 0.7) * 0.08;
        armL.rotation.set(0.2, 0, 0.25);
        armR.rotation.set(0.2, 0, -0.25);
        bladeGroup.rotation.set(0.3, 0, 0.2);
      } else if (currentPose === 'katana_ready') {
        armR.rotation.set(-0.9, -0.2, 0.3);
        armL.rotation.set(-0.7, 0.3, -0.3);
        bladeGroup.rotation.set(-0.5, 0, -0.2);
      } else if (currentPose === 'combat_slash') {
        armR.rotation.set(-1.6, 0.4, 0.8);
        armL.rotation.set(0.5, -0.3, -0.6);
        bladeGroup.rotation.set(-0.9, 0, 1.2);
      } else if (currentPose === 'magic_cast') {
        base.position.y = Math.sin(time * 2.0) * 0.1 + 0.25;
        armL.rotation.set(-1.2, 0.4, -0.6);
        armR.rotation.set(-1.2, -0.4, 0.6);
      }
    },
    setPose(pose) {
      currentPose = pose;
    },
    setExpression() {
      // Mecha has optics glow
      opticMat.uniforms.uEmissiveIntensity.value = 1.4;
    },
    setWeapon(weapon) {
      bladeGroup.visible = weapon !== 'none';
    },
    updateShaderStyle(style) {
      reg.updateStyle(style);
    },
    setOutlineThickness(thickness) {
      reg.setOutlineThickness(thickness);
    },
    dispose() {
      reg.dispose();
      flameMat.dispose();
    },
  };
}

/**
 * Procedural Character 3: Kitsune Spirit Shrine Maiden
 */
export function buildKitsuneCharacter(
  initialStyle: AnimeShaderStyle,
  initialOutlineThickness: number,
): AnimeModelController {
  const root = new THREE.Group();
  root.name = 'Kitsune_SpiritMaiden';

  const reg = new MaterialRegistry();
  const outlineMatDark = reg.registerOutline(createOutlineMaterial(0x1a0f2b, initialOutlineThickness));
  const outlineMatGold = reg.registerOutline(createOutlineMaterial(0x854d0e, initialOutlineThickness * 0.8));

  let faceTexture = createAnimeFaceTexture('smiling', '#f43f5e'); // Pink anime eyes

  const mikoWhite = 0xfafafa;
  const mikoRed = 0xdc2626;
  const foxFurWhite = 0xfff1f2;
  const foxFurGold = 0xfbbf24;
  const spiritCyan = 0x22d3ee;

  const whiteMat = reg.register(createCelMaterial({ color: mikoWhite }, initialStyle));
  const redMat = reg.register(createCelMaterial({ color: mikoRed }, initialStyle));
  const skinMat = reg.register(createCelMaterial({ color: 0xffe4d6 }, initialStyle));
  const hairMat = reg.register(createCelMaterial({ color: 0xffedd5, rimColor: 0xfbcfe8 }, initialStyle)); // Soft blonde/pastel fox hair
  const furMat = reg.register(createCelMaterial({ color: foxFurWhite, rimColor: 0xfde047 }, initialStyle));
  const goldMat = reg.register(createCelMaterial({ color: foxFurGold, roughness: 0.2 }, initialStyle));
  const orbMat = reg.register(createCelMaterial({
    color: spiritCyan,
    emissive: spiritCyan,
    emissiveIntensity: 0.95,
  }, initialStyle));

  const faceMat = reg.registerOther(new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  }));

  const base = new THREE.Group();
  root.add(base);

  // 1. MIKO ROBE TORSO
  const torso = new THREE.Group();
  torso.position.set(0, 1.35, 0);
  base.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.48, 12), whiteMat);
  chest.position.set(0, 0.2, 0);
  torso.add(chest);
  attachOutline(chest, outlineMatDark);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.2, 10), skinMat);
  neck.position.set(0, 0.5, 0);
  torso.add(neck);

  // Red Obi Sash
  const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.16, 12), redMat);
  obi.position.set(0, -0.05, 0);
  torso.add(obi);
  attachOutline(obi, outlineMatGold);

  // 2. HEAD & FOX EARS
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.65, 0);
  torso.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), skinMat);
  headMesh.scale.set(0.95, 1.15, 0.95);
  headMesh.position.set(0, 0.15, 0);
  headGroup.add(headMesh);
  attachOutline(headMesh, outlineMatDark);

  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), faceMat);
  facePlane.position.set(0, 0.17, 0.22);
  headGroup.add(facePlane);

  // Fluffy Fox Ears with inner pink
  const earGeo = new THREE.ConeGeometry(0.1, 0.26, 4);
  earGeo.rotateY(Math.PI / 4);

  const earL = new THREE.Mesh(earGeo, furMat);
  earL.position.set(-0.16, 0.36, -0.02);
  earL.rotation.set(-0.1, 0.1, 0.35);
  const earR = new THREE.Mesh(earGeo, furMat);
  earR.position.set(0.16, 0.36, -0.02);
  earR.rotation.set(-0.1, -0.1, -0.35);
  headGroup.add(earL, earR);
  attachOutline(earL, outlineMatDark);
  attachOutline(earR, outlineMatDark);

  // Flowing Pastel Hair
  const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), hairMat);
  hairCrown.position.set(0, 0.2, -0.05);
  headGroup.add(hairCrown);
  attachOutline(hairCrown, outlineMatDark);

  // 3. FLUFFY FOX SPIRIT TAILS (3 Lush animated tails)
  const tailsGroup = new THREE.Group();
  tailsGroup.position.set(0, -0.1, -0.22);
  torso.add(tailsGroup);

  const createTail = (rotY: number, rotZ: number) => {
    const tailGroup = new THREE.Group();
    tailGroup.rotation.set(0.3, rotY, rotZ);

    for (let i = 0; i < 4; i++) {
      const r = 0.08 + Math.sin((i / 4) * Math.PI) * 0.11;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), furMat);
      seg.position.set(0, 0.22 * (i + 1), -0.12 * i);
      tailGroup.add(seg);
      attachOutline(seg, outlineMatDark);
    }

    // Gold tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.25, 6), redMat);
    tip.position.set(0, 1.15, -0.45);
    tip.rotation.x = -0.5;
    tailGroup.add(tip);
    attachOutline(tip, outlineMatDark);

    tailsGroup.add(tailGroup);
    return tailGroup;
  };

  const tailCenter = createTail(0, 0);
  const tailLeft = createTail(-0.4, -0.3);
  const tailRight = createTail(0.4, 0.3);

  // 4. FLOATING SACRED MAGATAMA ORBS
  const orbsGroup = new THREE.Group();
  torso.add(orbsGroup);

  const orbs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), orbMat);
    orbsGroup.add(orb);
    orbs.push(orb);
  }

  // 5. RED HAKAMA SKIRT & LEGS
  const hips = new THREE.Group();
  hips.position.set(0, -0.15, 0);
  torso.add(hips);

  const hakamaGeo = new THREE.ConeGeometry(0.42, 0.9, 12, 1, true);
  hakamaGeo.rotateX(Math.PI);
  const hakama = new THREE.Mesh(hakamaGeo, redMat);
  hakama.position.set(0, -0.42, 0);
  hips.add(hakama);
  attachOutline(hakama, outlineMatDark);

  // Miko Sandals
  const sandalGeo = new THREE.BoxGeometry(0.1, 0.05, 0.22);
  const sandalL = new THREE.Mesh(sandalGeo, goldMat);
  sandalL.position.set(-0.12, -0.92, 0.03);
  const sandalR = new THREE.Mesh(sandalGeo, goldMat);
  sandalR.position.set(0.12, -0.92, 0.03);
  hips.add(sandalL, sandalR);

  // Arms
  const armL = new THREE.Group();
  armL.position.set(-0.28, 0.28, 0);
  torso.add(armL);
  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.45, 8), whiteMat);
  sleeveL.position.set(0, -0.25, 0);
  armL.add(sleeveL);
  attachOutline(sleeveL, outlineMatDark);

  const armR = new THREE.Group();
  armR.position.set(0.28, 0.28, 0);
  torso.add(armR);
  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.45, 8), whiteMat);
  sleeveR.position.set(0, -0.25, 0);
  armR.add(sleeveR);
  attachOutline(sleeveR, outlineMatDark);

  let currentPose: AnimePose = 'idle';

  return {
    group: root,
    update(time, delta, windSpeed) {
      reg.updateTime(time);

      const breath = Math.sin(time * 2.0) * 0.015;
      torso.position.y = 1.35 + breath;

      // Dynamic Fox Tail wagging
      const wag = Math.sin(time * 2.5) * 0.2;
      tailCenter.rotation.y = wag;
      tailLeft.rotation.y = -0.4 + wag * 0.8;
      tailRight.rotation.y = 0.4 + wag * 0.8;

      // Floating Magatama Orbs orbit
      orbs.forEach((orb, i) => {
        const angle = time * 2.2 + (i * Math.PI * 2) / orbs.length;
        const radius = 0.65;
        orb.position.set(
          Math.cos(angle) * radius,
          0.2 + Math.sin(time * 3.0 + i) * 0.15,
          Math.sin(angle) * radius,
        );
      });

      // Ear twitching
      const earTwitch = Math.sin(time * 5.0) > 0.95 ? 0.15 : 0;
      earL.rotation.z = 0.35 + earTwitch;

      if (currentPose === 'idle') {
        headGroup.rotation.y = Math.sin(time * 0.9) * 0.05;
        armL.rotation.set(0.2, 0, 0.2);
        armR.rotation.set(0.2, 0, -0.2);
      } else if (currentPose === 'katana_ready') {
        armL.rotation.set(-0.7, 0.3, -0.3);
        armR.rotation.set(-0.7, -0.3, 0.3);
      } else if (currentPose === 'combat_slash') {
        armR.rotation.set(-1.4, 0.4, 0.8);
        armL.rotation.set(0.6, -0.4, -0.6);
      } else if (currentPose === 'magic_cast') {
        base.position.y = Math.sin(time * 2.0) * 0.1 + 0.18;
        armL.rotation.set(-1.2, 0.3, -0.7);
        armR.rotation.set(-1.2, -0.3, 0.7);
      }
    },
    setPose(pose) {
      currentPose = pose;
    },
    setExpression(expr) {
      faceTexture.dispose();
      faceTexture = createAnimeFaceTexture(expr, '#f43f5e');
      faceMat.map = faceTexture;
      faceMat.needsUpdate = true;
    },
    setWeapon(weapon) {
      orbsGroup.visible = weapon !== 'none';
    },
    updateShaderStyle(style) {
      reg.updateStyle(style);
    },
    setOutlineThickness(thickness) {
      reg.setOutlineThickness(thickness);
    },
    dispose() {
      reg.dispose();
      faceTexture.dispose();
      faceMat.dispose();
    },
  };
}
