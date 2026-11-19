import * as THREE from 'three';
import { applyColorCoverageAndRollOffShader } from '../utils/wuwaTextures';
import type { FleurdelysBuildContext } from './fleurdelysBuilder';

export type RinascitaCharacterId = 'carlotta' | 'cantarella' | 'zani';

/**
 * Attaches a group built in character world-space into a target bone's exact local space.
 */
function attachToBoneWorld(
  bone: THREE.Bone,
  childObj: THREE.Object3D,
  worldAnchorPos: THREE.Vector3,
): void {
  bone.updateWorldMatrix(true, false);
  const boneWorldPos = new THREE.Vector3();
  const boneWorldQuat = new THREE.Quaternion();
  const boneWorldScale = new THREE.Vector3();
  bone.matrixWorld.decompose(boneWorldPos, boneWorldQuat, boneWorldScale);

  const localOffset = worldAnchorPos.clone().sub(boneWorldPos);
  const invQuat = boneWorldQuat.clone().invert();
  localOffset.applyQuaternion(invQuat);
  localOffset.divide(
    new THREE.Vector3(
      Math.max(0.0001, boneWorldScale.x),
      Math.max(0.0001, boneWorldScale.y),
      Math.max(0.0001, boneWorldScale.z),
    ),
  );

  childObj.position.copy(localOffset);
  childObj.quaternion.copy(invQuat);
  childObj.scale.set(
    1 / Math.max(0.0001, boneWorldScale.x),
    1 / Math.max(0.0001, boneWorldScale.y),
    1 / Math.max(0.0001, boneWorldScale.z),
  );
  bone.add(childObj);
}

function getBoneWorldPos(bone: THREE.Bone | null, fallbackY: number): THREE.Vector3 {
  if (!bone) return new THREE.Vector3(0, fallbackY, 0);
  bone.updateWorldMatrix(true, false);
  const pos = new THREE.Vector3();
  bone.getWorldPosition(pos);
  return pos;
}

/**
 * Procedural custom anime iris recolor for Rinascita Resonators (Carlotta pink-teal, Cantarella amethyst, Zani blazing amber-gold).
 */
function createCustomIrisTexture(
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  topRGB: [number, number, number],
  bottomRGB: [number, number, number],
  starHex: string,
): THREE.CanvasTexture {
  const w = Math.max(1, (sourceImage as any)?.naturalWidth || (sourceImage as any)?.width || 512);
  const h = Math.max(1, (sourceImage as any)?.naturalHeight || (sourceImage as any)?.height || 256);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  try {
    ctx.drawImage(sourceImage as CanvasImageSource, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
      const vNorm = y / h;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 10) continue;
        const luma = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        if (luma > 0.1 && luma < 0.92) {
          const lower = Math.max(0, Math.min(1, (vNorm - 0.36) / 0.42));
          const shade = 0.56 + luma * 0.64;
          const r = topRGB[0] + (bottomRGB[0] - topRGB[0]) * lower;
          const g = topRGB[1] + (bottomRGB[1] - topRGB[1]) * lower;
          const b = topRGB[2] + (bottomRGB[2] - topRGB[2]) * lower;
          data[i] = Math.max(0, Math.min(255, Math.round(r * shade)));
          data[i + 1] = Math.max(0, Math.min(255, Math.round(g * shade)));
          data[i + 2] = Math.max(0, Math.min(255, Math.round(b * shade)));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    ctx.fillStyle = `rgb(${topRGB[0]},${topRGB[1]},${topRGB[2]})`;
    ctx.fillRect(0, 0, w, h);
  }

  [0.25, 0.75].forEach((eu) => {
    const cx = w * eu;
    const cy = h * 0.49;
    const rx = w * 0.13;
    const ry = h * 0.26;
    ctx.save();
    // Crisp dark limbal ring
    ctx.strokeStyle = 'rgba(18, 16, 36, 0.84)';
    ctx.lineWidth = Math.max(2, w * 0.007);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.93, ry * 0.91, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dark pupil core
    ctx.fillStyle = 'rgba(14, 12, 30, 0.92)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.02, rx * 0.3, ry * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radiant 4-point star glint
    ctx.fillStyle = starHex;
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 0.22);
    ctx.lineTo(cx + rx * 0.11, cy + ry * 0.02);
    ctx.lineTo(cx, cy + ry * 0.26);
    ctx.lineTo(cx - rx * 0.11, cy + ry * 0.02);
    ctx.closePath();
    ctx.fill();

    // Dual crisp catchlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.36, cy - ry * 0.3, rx * 0.16, ry * 0.13, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.3, cy + ry * 0.32, rx * 0.09, ry * 0.08, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Faceted Opal / Diamond Crystal Shard Geometry
 */
function createCrystalShardGeometry(radius: number, length: number): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(radius, 0);
  geo.scale(0.62, length / Math.max(0.001, radius * 2), 0.45);
  return geo;
}

/**
 * 4-Point Diamond Star Geometry
 */
function createStarGeometry(radius: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const inner = radius * 0.22;
  shape.moveTo(0, radius);
  shape.quadraticCurveTo(inner * 0.85, inner * 0.85, radius, 0);
  shape.quadraticCurveTo(inner * 0.85, -inner * 0.85, 0, -radius);
  shape.quadraticCurveTo(-inner * 0.85, -inner * 0.85, -radius, 0);
  shape.quadraticCurveTo(-inner * 0.85, inner * 0.85, 0, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.4,
    bevelSize: radius * 0.04,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

/**
 * Applies bespoke Rinascita 2.x Wuthering Waves character styling, custom iris/hair/costume palettes,
 * and sculpted 3D signature weapons & floating resonance props for Carlotta, Cantarella, and Zani.
 */
export function applyRinascitaCharacterBuild(
  characterId: RinascitaCharacterId,
  ctx: FleurdelysBuildContext,
): void {
  const { character, humanoidBones, extraAnimatedNodes, disposables } = ctx;

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.materials.push(m);
    ctx.materialsSet.add(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposables.textures.push(t);
    return t;
  };

  character.updateMatrixWorld(true);
  const charBox = new THREE.Box3().setFromObject(character);
  const charHeight = Math.max(1.2, charBox.max.y - charBox.min.y);
  const s = charHeight / 2.2;

  const headPos = getBoneWorldPos(humanoidBones.head, charBox.min.y + charHeight * 0.86);
  const chestPos = getBoneWorldPos(humanoidBones.chest, charBox.min.y + charHeight * 0.68);

  const rootWorldQuat = new THREE.Quaternion();
  const rootWorldScale = new THREE.Vector3(1, 1, 1);
  character.matrixWorld.decompose(new THREE.Vector3(), rootWorldQuat, rootWorldScale);
  const rootQuatInv = rootWorldQuat.clone().invert();
  const rootScale = Math.max(0.0001, rootWorldScale.y);

  // Per-character palette & iris spec
  const spec =
    characterId === 'carlotta'
      ? {
          hairTint: 0xeef2ff,
          hairSheen: 0xf472b6,
          clothPrimary: 0x9f1239, // Montelli deep crimson-magenta
          clothAccent: 0xf8fafc,
          irisTop: [226, 72, 138] as [number, number, number], // Pink-rose upper
          irisBottom: [45, 212, 191] as [number, number, number], // Teal lower (Carlotta's signature dual-tone!)
          irisEmissive: 0xf472b6,
          starHex: '#e0f2fe',
          browHex: 0xcbd5e1,
        }
      : characterId === 'cantarella'
        ? {
            hairTint: 0xc4b5fd, // Ethereal pale lavender-violet
            hairSheen: 0x38bdf8,
            clothPrimary: 0x2e1065, // Deep Fisalia abyssal purple
            clothAccent: 0x1e1b4b,
            irisTop: [91, 33, 182] as [number, number, number], // Deep amethyst
            irisBottom: [192, 132, 252] as [number, number, number], // Luminous lilac-violet
            irisEmissive: 0xa855f7,
            starHex: '#f5d0fe',
            browHex: 0x8b5cf6,
          }
        : {
            hairTint: 0xe2e8f0, // Sleek silver-ash
            hairSheen: 0xfbbf24,
            clothPrimary: 0x1e293b, // Averardo Bank charcoal-obsidian suit
            clothAccent: 0xf8fafc,
            irisTop: [180, 83, 9] as [number, number, number], // Intense blazing amber
            irisBottom: [253, 224, 71] as [number, number, number], // Radiant Spectro gold
            irisEmissive: 0xf59e0b,
            starHex: '#fef08a',
            browHex: 0x94a3b8,
          };

  // 1. Retint Hair, Eyes & Costume Materials + Apply Mature Wuthering Waves Facial Sculpt (Preserving Baked Normals!)
  const processedMats = new Set<THREE.Material>();
  const sculptedFaceVerts = new Map<THREE.BufferAttribute | THREE.InterleavedBufferAttribute, Set<number>>();
  character.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    mats.forEach((mat) => {
      if (!mat) return;
      const phys = mat as THREE.MeshPhysicalMaterial;
      const mName = (mat.name || mesh.name || '').toLowerCase();

      if (!processedMats.has(mat)) {
        processedMats.add(mat);
        if (/eyeiris/.test(mName) && phys.map && phys.map.image) {
          const irisTex = trackTex(
            createCustomIrisTexture(
              phys.map.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap,
              spec.irisTop,
              spec.irisBottom,
              spec.starHex,
            ),
          );
          phys.map = irisTex;
          phys.emissiveMap = irisTex;
          phys.emissive = new THREE.Color(spec.irisEmissive);
          phys.emissiveIntensity = 0.28;
          phys.needsUpdate = true;
        } else if (/facebrow/.test(mName)) {
          phys.color.setHex(spec.browHex);
          phys.needsUpdate = true;
        } else if (/hair/.test(mName)) {
          phys.color.setHex(spec.hairTint);
          if (phys.isMeshPhysicalMaterial) {
            phys.sheen = 0.58;
            phys.sheenColor = new THREE.Color(spec.hairSheen);
            phys.roughness = 0.34;
          }
          phys.needsUpdate = true;
        } else if (
          !/skin|face|eye|mouth|lash|brow|hair/.test(mName) &&
          phys.color &&
          /cloth|dress|tops|bottom|skirt|coat|jacket|shoe|ribbon|acc|onepiece|f00/.test(mName)
        ) {
          const isLightPart = /ribbon|collar|shirt|inner|lace|trim/.test(mName);
          const target = new THREE.Color(isLightPart ? spec.clothAccent : spec.clothPrimary);
          phys.color.lerp(target, isLightPart ? 0.52 : 0.72);
          phys.needsUpdate = true;
        }
      }

      // Subtle mature Wuthering Waves anime eye/chin refinement (never calls computeVertexNormals on shared Face.baked!)
      if (
        /face_00_skin|eyewhite|faceeyeline|faceeyelash|facebrow|eyeiris/.test(mName) &&
        mesh.geometry
      ) {
        const posAttr = mesh.geometry.getAttribute('position');
        if (posAttr) {
          let visited = sculptedFaceVerts.get(posAttr);
          if (!visited) {
            visited = new Set<number>();
            sculptedFaceVerts.set(posAttr, visited);
          }
          const idxAttr = mesh.geometry.getIndex();
          const vCount = idxAttr ? idxAttr.count : posAttr.count;
          const isEyeOrLid = /eyewhite|faceeyeline|faceeyelash/.test(mName);
          const isIris = /eyeiris/.test(mName);
          const isBrow = /facebrow/.test(mName);
          const isFaceSkin = /face_00_skin/.test(mName);

          for (let k = 0; k < vCount; k++) {
            const vi = idxAttr ? idxAttr.getX(k) : k;
            if (visited.has(vi)) continue;
            visited.add(vi);
            let vx = posAttr.getX(vi);
            let vy = posAttr.getY(vi);
            const vz = posAttr.getZ(vi);
            const absX = Math.abs(vx);
            const signX = Math.tanh(vx / 0.008);

            if (isIris) {
              const cx = signX * 0.042;
              const cy = 1.556;
              vx = cx + (vx - cx) * 0.8;
              vy = cy + (vy - cy) * 0.8;
            } else if (isBrow) {
              vy -= 0.0045;
            } else if (isEyeOrLid) {
              const ew = Math.exp(-Math.pow((absX - 0.044) / 0.03, 2));
              if (vy > 1.555) vy -= 0.0052 * THREE.MathUtils.smoothstep(vy, 1.555, 1.576) * ew;
              const wing = THREE.MathUtils.smoothstep(absX, 0.056, 0.09);
              vx += signX * 0.004 * wing;
              vy += 0.0026 * wing;
            } else if (isFaceSkin && vz < -0.025 && vy < 1.54) {
              const jawBell = Math.sin(THREE.MathUtils.clamp((vy - 1.465) / 0.075, 0, 1) * Math.PI);
              vx *= 1.0 - 0.065 * jawBell * THREE.MathUtils.smoothstep(absX, 0.024, 0.074);
            }
            posAttr.setXYZ(vi, vx, vy, vz);
          }
          posAttr.needsUpdate = true;
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
      }
    });
  });

  // 2. Sculpted Character-Specific 3D Headpieces, Weapons & Floating Resonance Props
  const goldTrimMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: `${characterId}_GoldTrim`,
      color: 0xfde68a,
      metalness: 0.9,
      roughness: 0.22,
      clearcoat: 0.6,
      envMapIntensity: 1.25,
    }),
  );
  applyColorCoverageAndRollOffShader(goldTrimMat);

  if (characterId === 'carlotta') {
    // ==================== 珂萊塔 (CARLOTTA · 歐泊晶槍) ====================
    const opalCrystalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Carlotta_OpalCrystal',
        color: 0xf472b6,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.55,
        roughness: 0.08,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0.8,
        sheenColor: new THREE.Color(0xfbcfe8),
        envMapIntensity: 1.35,
      }),
    );
    applyColorCoverageAndRollOffShader(opalCrystalMat);

    const crimsonCapeMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Carlotta_CrimsonMantle',
        color: 0x9f1239,
        roughness: 0.44,
        metalness: 0.06,
        sheen: 0.72,
        sheenColor: new THREE.Color(0xfda4af),
        side: THREE.DoubleSide,
      }),
    );
    applyColorCoverageAndRollOffShader(crimsonCapeMat);
    ctx.clothMaterialsList.push(crimsonCapeMat);

    const gunMetalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Carlotta_OpalPistolMetal',
        color: 0xf1f5f9,
        metalness: 0.82,
        roughness: 0.22,
        clearcoat: 0.5,
      }),
    );
    applyColorCoverageAndRollOffShader(gunMetalMat);

    // 2A. Opal Hairpin & Floating Iridescent Opal Crown Shards behind head
    if (humanoidBones.head) {
      const headRoot = new THREE.Group();
      headRoot.name = 'Carlotta_OpalHeadpiece';

      const opalPinGeo = trackGeo(createCrystalShardGeometry(0.014 * s, 0.052 * s));
      const opalPin = new THREE.Mesh(opalPinGeo, opalCrystalMat);
      opalPin.position.set(0.082 * s, 0.118 * s, 0.036 * s);
      opalPin.rotation.set(0.18, 0.25, -0.58);
      headRoot.add(opalPin);
      ctx.originalMeshMaterials.set(opalPin, opalCrystalMat);

      const crownGroup = new THREE.Group();
      crownGroup.name = 'Carlotta_FloatingOpalHalo';
      crownGroup.position.set(0, 0.18 * s, -0.06 * s);
      for (let i = 0; i < 6; i++) {
        const ang = ((i - 2.5) / 5) * Math.PI * 1.15;
        const shGeo = trackGeo(createCrystalShardGeometry(0.015 * s, (0.055 + (i % 2) * 0.025) * s));
        const sh = new THREE.Mesh(shGeo, opalCrystalMat);
        sh.position.set(Math.sin(ang) * 0.22 * s, Math.cos(ang) * 0.1 * s, -Math.abs(Math.sin(ang)) * 0.06 * s);
        sh.rotation.z = -ang * 0.75;
        crownGroup.add(sh);
        ctx.originalMeshMaterials.set(sh, opalCrystalMat);
        extraAnimatedNodes.starSparkles.push(sh);
      }
      headRoot.add(crownGroup);
      extraAnimatedNodes.crownGroup = crownGroup;
      attachToBoneWorld(humanoidBones.head, headRoot, headPos);
    }

    // 2B. Sculpted Crimson-Magenta Aristocratic Shoulder Mantle (Montelli Capelet)
    if (humanoidBones.chest) {
      const capeRoot = new THREE.Group();
      capeRoot.name = 'Carlotta_MontelliMantle';
      const capeGeo = trackGeo(
        new THREE.CylinderGeometry(0.125 * s, 0.26 * s, 0.34 * s, 28, 8, true, Math.PI * 0.62, Math.PI * 1.76),
      );
      const capeMesh = new THREE.Mesh(capeGeo, crimsonCapeMat);
      capeMesh.position.set(0, -0.05 * s, -0.03 * s);
      capeMesh.rotation.x = 0.1;
      capeRoot.add(capeMesh);
      ctx.originalMeshMaterials.set(capeMesh, crimsonCapeMat);

      // Gold Collar Brooch & White Aristocratic Ruffled Neck Jabot
      const broochGeo = trackGeo(createStarGeometry(0.024 * s, 0.005 * s));
      const brooch = new THREE.Mesh(broochGeo, goldTrimMat);
      brooch.position.set(0, 0.11 * s, 0.108 * s);
      capeRoot.add(brooch);
      ctx.originalMeshMaterials.set(brooch, goldTrimMat);

      // Twin asymmetric crimson-rose noble tail ribbons trailing behind capelet
      ([-1, 1] as const).forEach((side) => {
        const tailGeo = trackGeo(new THREE.BoxGeometry(0.068 * s, 0.52 * s, 0.006 * s));
        const tail = new THREE.Mesh(tailGeo, crimsonCapeMat);
        tail.position.set(side * 0.095 * s, -0.36 * s, -0.145 * s);
        tail.rotation.set(0.14, side * 0.16, side * -0.12);
        capeRoot.add(tail);
        ctx.originalMeshMaterials.set(tail, crimsonCapeMat);
        extraAnimatedNodes.trailRibbons.push(tail);
      });

      attachToBoneWorld(humanoidBones.chest, capeRoot, chestPos);
    }

    // 2C. Twin Floating Sculpted Opal-Crystal Pistols ("The Last Dance / 死與舞")
    const pistolsGroup = new THREE.Group();
    pistolsGroup.name = 'Carlotta_OpalTwinPistols';
    ([-1, 1] as const).forEach((side) => {
      const gun = new THREE.Group();
      const barrelGeo = trackGeo(new THREE.BoxGeometry(0.026 * s, 0.042 * s, 0.25 * s));
      const barrel = new THREE.Mesh(barrelGeo, gunMetalMat);
      gun.add(barrel);
      ctx.originalMeshMaterials.set(barrel, gunMetalMat);

      const coreGeo = trackGeo(createCrystalShardGeometry(0.018 * s, 0.21 * s));
      coreGeo.rotateX(Math.PI / 2);
      const core = new THREE.Mesh(coreGeo, opalCrystalMat);
      core.position.set(0, 0.014 * s, 0.03 * s);
      gun.add(core);
      ctx.originalMeshMaterials.set(core, opalCrystalMat);

      const gripGeo = trackGeo(new THREE.BoxGeometry(0.022 * s, 0.1 * s, 0.042 * s));
      const grip = new THREE.Mesh(gripGeo, goldTrimMat);
      grip.position.set(0, -0.052 * s, -0.08 * s);
      grip.rotation.x = 0.28;
      gun.add(grip);
      ctx.originalMeshMaterials.set(grip, goldTrimMat);

      gun.position.set(side * 0.44 * s, 0, side * 0.05 * s);
      gun.rotation.set(-0.22, side * -0.35, side * 0.18);
      pistolsGroup.add(gun);
    });

    const gunWorldPos = new THREE.Vector3(0, charBox.min.y + charHeight * 0.56, 0.04 * s);
    character.worldToLocal(gunWorldPos);
    pistolsGroup.position.copy(gunWorldPos);
    pistolsGroup.quaternion.copy(rootQuatInv);
    pistolsGroup.scale.setScalar(1 / rootScale);
    character.add(pistolsGroup);
    extraAnimatedNodes.swordGroup = pistolsGroup;
  } else if (characterId === 'cantarella') {
    // ==================== 坎特蕾拉 (CANTARELLA · 翡薩烈水母家主) ====================
    const jellyfishBellMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Cantarella_JellyfishBell',
        color: 0xc084fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.58,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: 0.78,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
      }),
    );
    applyColorCoverageAndRollOffShader(jellyfishBellMat);

    const coralCrownMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Cantarella_AbyssalCoral',
        color: 0x4c1d95,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.36,
        roughness: 0.2,
        metalness: 0.42,
        clearcoat: 0.85,
      }),
    );
    applyColorCoverageAndRollOffShader(coralCrownMat);

    const sapphireMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Cantarella_FisaliaSapphire',
        color: 0x60a5fa,
        emissive: 0x2563eb,
        emissiveIntensity: 0.65,
        roughness: 0.08,
        metalness: 0.2,
        clearcoat: 1.0,
      }),
    );
    applyColorCoverageAndRollOffShader(sapphireMat);

    // 2A. Deep-Sea Coral & Sapphire Fisalia Headpiece
    if (humanoidBones.head) {
      const headRoot = new THREE.Group();
      headRoot.name = 'Cantarella_CoralCrown';
      const crownGroup = new THREE.Group();
      crownGroup.position.set(0, 0.195 * s, 0.01 * s);

      ([-1, 1] as const).forEach((side) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.03 * s, 0, 0.03 * s),
          new THREE.Vector3(side * 0.11 * s, 0.055 * s, 0),
          new THREE.Vector3(side * 0.18 * s, 0.095 * s, -0.04 * s),
        ]);
        const branchGeo = trackGeo(new THREE.TubeGeometry(curve, 18, 0.008 * s, 7, false));
        const branch = new THREE.Mesh(branchGeo, coralCrownMat);
        crownGroup.add(branch);
        ctx.originalMeshMaterials.set(branch, coralCrownMat);

        const gemGeo = trackGeo(new THREE.OctahedronGeometry(0.016 * s, 0));
        const gem = new THREE.Mesh(gemGeo, sapphireMat);
        gem.position.set(side * 0.12 * s, 0.068 * s, 0.005 * s);
        crownGroup.add(gem);
        ctx.originalMeshMaterials.set(gem, sapphireMat);
        extraAnimatedNodes.starSparkles.push(gem);
      });

      headRoot.add(crownGroup);
      extraAnimatedNodes.crownGroup = crownGroup;
      attachToBoneWorld(humanoidBones.head, headRoot, headPos);
    }

    // 2B. Floating Bioluminescent Jellyfish Companion & Abyssal Coral Parasol ("海中夢")
    const jellyGroup = new THREE.Group();
    jellyGroup.name = 'Cantarella_EtherealJellyfish';

    // Translucent fluted jellyfish dome bell
    const bellGeo = trackGeo(
      new THREE.SphereGeometry(0.165 * s, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    );
    const bellPos = bellGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < bellPos.count; i++) {
      const px = bellPos.getX(i);
      const py = bellPos.getY(i);
      const pz = bellPos.getZ(i);
      const ang = Math.atan2(pz, px);
      const rimFactor = Math.max(0, 1 - py / (0.165 * s));
      const ruffle = 1 + Math.sin(ang * 10) * 0.08 * rimFactor * rimFactor;
      bellPos.setXYZ(i, px * ruffle, py, pz * ruffle);
    }
    bellGeo.computeVertexNormals();
    const bellMesh = new THREE.Mesh(bellGeo, jellyfishBellMat);
    jellyGroup.add(bellMesh);
    ctx.originalMeshMaterials.set(bellMesh, jellyfishBellMat);

    // Inner glowing sapphire core
    const coreGemGeo = trackGeo(new THREE.SphereGeometry(0.055 * s, 16, 14));
    const coreGem = new THREE.Mesh(coreGemGeo, sapphireMat);
    coreGem.position.set(0, 0.04 * s, 0);
    jellyGroup.add(coreGem);
    ctx.originalMeshMaterials.set(coreGem, sapphireMat);

    // 6 graceful undulating bioluminescent tentacles
    for (let t = 0; t < 6; t++) {
      const ang = (t / 6) * Math.PI * 2;
      const r0 = 0.085 * s;
      const tCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * r0, 0.01 * s, Math.sin(ang) * r0),
        new THREE.Vector3(Math.cos(ang + 0.35) * r0 * 1.15, -0.14 * s, Math.sin(ang + 0.35) * r0 * 1.15),
        new THREE.Vector3(Math.cos(ang - 0.25) * r0 * 0.85, -0.3 * s, Math.sin(ang - 0.25) * r0 * 0.85),
        new THREE.Vector3(Math.cos(ang + 0.2) * r0 * 0.65, -0.44 * s, Math.sin(ang + 0.2) * r0 * 0.65),
      ]);
      const tGeo = trackGeo(new THREE.TubeGeometry(tCurve, 18, 0.0055 * s, 6, false));
      const tMesh = new THREE.Mesh(tGeo, jellyfishBellMat);
      jellyGroup.add(tMesh);
      ctx.originalMeshMaterials.set(tMesh, jellyfishBellMat);
      extraAnimatedNodes.trailRibbons.push(tMesh);
    }

    const jellyWorldPos = new THREE.Vector3(0.46 * s, charBox.min.y + charHeight * 0.72, -0.1 * s);
    character.worldToLocal(jellyWorldPos);
    jellyGroup.position.copy(jellyWorldPos);
    jellyGroup.quaternion.copy(rootQuatInv);
    jellyGroup.scale.setScalar(1 / rootScale);
    character.add(jellyGroup);
    extraAnimatedNodes.swordGroup = jellyGroup;
  } else if (characterId === 'zani') {
    // ==================== 贊妮 (ZANI · 阿維紐林光噪騎士) ====================
    const obsidianHornMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Zani_ObsidianHorns',
        color: 0x1e1b2e,
        emissive: 0xd97706,
        emissiveIntensity: 0.22,
        roughness: 0.26,
        metalness: 0.45,
        clearcoat: 0.75,
      }),
    );
    applyColorCoverageAndRollOffShader(obsidianHornMat);

    const spectroGoldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Zani_SpectroEnergy',
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.82,
        roughness: 0.1,
        metalness: 0.25,
        clearcoat: 1.0,
      }),
    );
    applyColorCoverageAndRollOffShader(spectroGoldMat);

    // 2A. Signature Curved Obsidian-Gold Horns on Head
    if (humanoidBones.head) {
      const headRoot = new THREE.Group();
      headRoot.name = 'Zani_Horns';
      ([-1, 1] as const).forEach((side) => {
        const hornCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(side * 0.068 * s, 0.145 * s, 0.032 * s),
          new THREE.Vector3(side * 0.128 * s, 0.195 * s, -0.015 * s),
          new THREE.Vector3(side * 0.148 * s, 0.252 * s, -0.045 * s),
          new THREE.Vector3(side * 0.105 * s, 0.295 * s, -0.012 * s),
        ]);
        const hGeo = trackGeo(new THREE.TubeGeometry(hornCurve, 22, 0.014 * s, 9, false));
        const posAttr = hGeo.getAttribute('position') as THREE.BufferAttribute;
        // Taper horn smoothly toward tip
        const tipPt = hornCurve.getPointAt(1);
        for (let i = 0; i < posAttr.count; i++) {
          const p = new THREE.Vector3(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
          const distTip = p.distanceTo(tipPt);
          if (distTip < 0.09 * s) {
            const f = Math.max(0.12, distTip / (0.09 * s));
            p.lerp(tipPt, 1 - f);
            posAttr.setXYZ(i, p.x, p.y, p.z);
          }
        }
        hGeo.computeVertexNormals();
        const hMesh = new THREE.Mesh(hGeo, obsidianHornMat);
        headRoot.add(hMesh);
        ctx.originalMeshMaterials.set(hMesh, obsidianHornMat);

        // Gold ornamental ring band on horn
        const ringGeo = trackGeo(new THREE.TorusGeometry(0.0165 * s, 0.0032 * s, 8, 18));
        const ring = new THREE.Mesh(ringGeo, goldTrimMat);
        ring.position.set(side * 0.118 * s, 0.188 * s, -0.008 * s);
        ring.rotation.set(0.4, side * 0.6, side * -0.5);
        headRoot.add(ring);
        ctx.originalMeshMaterials.set(ring, goldTrimMat);
      });
      attachToBoneWorld(humanoidBones.head, headRoot, headPos);
    }

    // 2A-2. Averardo Bank Crisp White Collar, Loosened Crimson Necktie & Gold Shoulder Epaulets
    if (humanoidBones.chest) {
      const tieRoot = new THREE.Group();
      tieRoot.name = 'Zani_BankTieAndEpaulets';

      const crimsonTieMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          name: 'Zani_CrimsonNecktie',
          color: 0x991b1b,
          roughness: 0.42,
          sheen: 0.55,
          sheenColor: new THREE.Color(0xfca5a5),
        }),
      );
      applyColorCoverageAndRollOffShader(crimsonTieMat);

      // Loosened necktie knot + hanging blade
      const knotGeo = trackGeo(new THREE.OctahedronGeometry(0.018 * s, 0));
      knotGeo.scale(1.1, 0.85, 0.65);
      const knot = new THREE.Mesh(knotGeo, crimsonTieMat);
      knot.position.set(0, 0.115 * s, 0.108 * s);
      tieRoot.add(knot);
      ctx.originalMeshMaterials.set(knot, crimsonTieMat);

      const bladeGeo = trackGeo(new THREE.BoxGeometry(0.032 * s, 0.24 * s, 0.006 * s));
      const blade = new THREE.Mesh(bladeGeo, crimsonTieMat);
      blade.position.set(0.008 * s, -0.015 * s, 0.118 * s);
      blade.rotation.set(-0.08, 0, 0.09);
      tieRoot.add(blade);
      ctx.originalMeshMaterials.set(blade, crimsonTieMat);

      // Gold-trimmed bank knight shoulder epaulets
      ([-1, 1] as const).forEach((side) => {
        const epGeo = trackGeo(new THREE.BoxGeometry(0.095 * s, 0.014 * s, 0.052 * s));
        const ep = new THREE.Mesh(epGeo, goldTrimMat);
        ep.position.set(side * 0.165 * s, 0.115 * s, -0.005 * s);
        ep.rotation.z = side * -0.18;
        tieRoot.add(ep);
        ctx.originalMeshMaterials.set(ep, goldTrimMat);
      });

      attachToBoneWorld(humanoidBones.chest, tieRoot, chestPos);
    }

    // 2B. Floating Spectro Radiant Greatshield & Blazing Light-Noise Shards ("焰光裁決")
    const shieldGroup = new THREE.Group();
    shieldGroup.name = 'Zani_SpectroGreatshield';

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.28 * s);
    shieldShape.lineTo(0.15 * s, 0.18 * s);
    shieldShape.lineTo(0.12 * s, -0.12 * s);
    shieldShape.lineTo(0, -0.32 * s);
    shieldShape.lineTo(-0.12 * s, -0.12 * s);
    shieldShape.lineTo(-0.15 * s, 0.18 * s);
    shieldShape.closePath();

    const shieldGeo = trackGeo(
      new THREE.ExtrudeGeometry(shieldShape, {
        depth: 0.022 * s,
        bevelEnabled: true,
        bevelThickness: 0.008 * s,
        bevelSize: 0.008 * s,
        bevelSegments: 2,
      }),
    );
    shieldGeo.center();
    const shieldBody = new THREE.Mesh(shieldGeo, obsidianHornMat);
    shieldGroup.add(shieldBody);
    ctx.originalMeshMaterials.set(shieldBody, obsidianHornMat);

    // Glowing gold core emblem on shield face
    const emblemGeo = trackGeo(createStarGeometry(0.088 * s, 0.008 * s));
    const emblem = new THREE.Mesh(emblemGeo, spectroGoldMat);
    emblem.position.set(0, 0.01 * s, 0.02 * s);
    shieldGroup.add(emblem);
    ctx.originalMeshMaterials.set(emblem, spectroGoldMat);
    extraAnimatedNodes.starSparkles.push(emblem);

    // Floating Spectro Light-Noise (光噪) Prism Shards
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + 0.4;
      const shGeo = trackGeo(createCrystalShardGeometry(0.016 * s, 0.075 * s));
      const sh = new THREE.Mesh(shGeo, spectroGoldMat);
      sh.position.set(Math.cos(ang) * 0.22 * s, Math.sin(ang) * 0.22 * s, 0.03 * s);
      sh.rotation.z = ang;
      shieldGroup.add(sh);
      ctx.originalMeshMaterials.set(sh, spectroGoldMat);
      extraAnimatedNodes.starSparkles.push(sh);
    }

    const shieldWorldPos = new THREE.Vector3(-0.46 * s, charBox.min.y + charHeight * 0.56, -0.12 * s);
    character.worldToLocal(shieldWorldPos);
    shieldGroup.position.copy(shieldWorldPos);
    shieldGroup.quaternion.copy(rootQuatInv).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, 0.34, 0.08)));
    shieldGroup.scale.setScalar(1 / rootScale);
    character.add(shieldGroup);
    extraAnimatedNodes.swordGroup = shieldGroup;
  }
}
