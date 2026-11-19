import * as THREE from 'three';
import {
  applyColorCoverageAndRollOffShader,
  applyFleurdelysHairTwoToneShader,
  createBrushedMetalNormalMap,
  createBrushedMetalRoughnessMap,
  createFabricWeaveNormalMap,
  createFleurdelysBodiceRoughnessMap,
  createFleurdelysBodiceTexture,
  createFleurdelysBodyTexture,
  createFleurdelysCathedralVeilTexture,
  createFleurdelysElfEarTexture,
  createFleurdelysFaceNormalMap,
  createFleurdelysFaceRoughnessMap,
  createFleurdelysFaceTexture,
  createFleurdelysHairStrandTexture,
  createFleurdelysIrisTexture,
  createFleurdelysScleraTexture,
  createFleurdelysSkirtRoughnessMap,
  createFleurdelysSkirtTexture,
  createFleurdelysStoleRoughnessMap,
  createFleurdelysStoleTexture,
  createHairStrandNormalMap,
  createSkinMicroNormalMap,
  createSkinMicroRoughnessMap,
} from '../utils/wuwaTextures';

export interface FleurdelysBuildContext {
  character: THREE.Group;
  allBones: THREE.Bone[];
  humanoidBones: {
    head: THREE.Bone | null;
    neck: THREE.Bone | null;
    chest: THREE.Bone | null;
    spine: THREE.Bone | null;
    hips: THREE.Bone | null;
    leftUpperArm: THREE.Bone | null;
    leftForearm: THREE.Bone | null;
    leftHand: THREE.Bone | null;
    rightUpperArm: THREE.Bone | null;
    rightForearm: THREE.Bone | null;
    rightHand: THREE.Bone | null;
    leftFoot: THREE.Bone | null;
    rightFoot: THREE.Bone | null;
  };
  extraAnimatedNodes: {
    crownGroup?: THREE.Group;
    swordGroup?: THREE.Group;
    trailRibbons: THREE.Mesh[];
    hairLocks: THREE.Mesh[];
    starSparkles: THREE.Mesh[];
  };
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
    textures: THREE.Texture[];
  };
  clothMaterialsList: THREE.MeshPhysicalMaterial[];
  hairMaterialsList: THREE.MeshPhysicalMaterial[];
  originalMeshMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
  materialsSet: Set<THREE.Material>;
}

interface RawBodySample {
  x: number;
  y: number;
  z: number;
  joints: [number, number, number, number];
  weights: [number, number, number, number];
}

/**
 * Helper: Attaches an accessory Group built in character world-space (at rest T-pose bind)
 * into a target bone's exact local coordinate space without scale or axis distortion.
 */
function attachToBoneWorld(
  bone: THREE.Bone,
  childObj: THREE.Object3D,
  worldPos: THREE.Vector3,
  worldQuat?: THREE.Quaternion,
): void {
  bone.updateMatrixWorld(true);
  const bwPos = new THREE.Vector3();
  const bwQuat = new THREE.Quaternion();
  const bwScale = new THREE.Vector3();
  bone.matrixWorld.decompose(bwPos, bwQuat, bwScale);

  const bwQuatInv = bwQuat.clone().invert();
  const localPos = worldPos.clone().sub(bwPos).applyQuaternion(bwQuatInv);
  localPos.set(
    localPos.x / (bwScale.x || 1),
    localPos.y / (bwScale.y || 1),
    localPos.z / (bwScale.z || 1),
  );

  childObj.position.copy(localPos);
  if (worldQuat) {
    childObj.quaternion.copy(bwQuatInv).multiply(worldQuat);
  } else {
    childObj.quaternion.copy(bwQuatInv);
  }
  childObj.scale.set(1 / (bwScale.x || 1), 1 / (bwScale.y || 1), 1 / (bwScale.z || 1));
  bone.add(childObj);
}

/**
 * Builds a centerline-Z lookup across height Y from raw sculpted Body_00_SKIN samples
 * (raw GLB coordinates: front = -Z, back = +Z, left = -X, right = +X).
 */
function computeTorsoCenterlineZ(pts: RawBodySample[], yRaw: number): number {
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.abs(p.x) < 0.14 && Math.abs(p.y - yRaw) < 0.025) {
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
  }
  if (!Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
    return yRaw < 1.05 ? -0.005 : -0.044;
  }
  return (minZ + maxZ) * 0.5;
}

/**
 * Queries the maximum radial envelope of the sculpted Body_00_SKIN at (yRaw, thetaRaw)
 * where thetaRaw = 0 is -Z (character front), +PI/2 is +X, PI is +Z (back).
 */
function sampleRawBodySurface(
  pts: RawBodySample[],
  yRaw: number,
  thetaRaw: number,
  standoffRaw: number,
  axisZRaw?: number,
): THREE.Vector3 {
  const cz = axisZRaw ?? computeTorsoCenterlineZ(pts, yRaw);
  const dirX = Math.sin(thetaRaw);
  const dirZ = -Math.cos(thetaRaw); // theta=0 -> -Z front, PI -> +Z back
  const yBand = 0.028;

  let max1 = 0;
  let max2 = 0;
  let max3 = 0;
  let hits = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.abs(p.y - yRaw) > yBand) continue;
    const dx = p.x;
    const dz = p.z - cz;
    const r = Math.hypot(dx, dz);
    if (r < 0.015) continue;
    const cosAng = (dx * dirX + dz * dirZ) / r;
    if (cosAng > 0.89) {
      const proj = dx * dirX + dz * dirZ;
      hits++;
      if (proj > max1) {
        max3 = max2;
        max2 = max1;
        max1 = proj;
      } else if (proj > max2) {
        max3 = max2;
        max2 = proj;
      } else if (proj > max3) {
        max3 = proj;
      }
    }
  }

  const fallbackR =
    yRaw < 1.04
      ? 0.145 * Math.abs(dirX) + 0.095 * Math.abs(dirZ)
      : yRaw < 1.19
        ? 0.095 * Math.abs(dirX) + 0.074 * Math.abs(dirZ)
        : 0.122 * Math.abs(dirX) + 0.092 * Math.abs(dirZ);

  const radial =
    hits >= 3
      ? max1 * 0.82 + max2 * 0.12 + max3 * 0.06
      : hits > 0
        ? max1
        : fallbackR;

  const finalR = radial + standoffRaw;
  return new THREE.Vector3(dirX * finalR, yRaw, cz + dirZ * finalR);
}

/**
 * High-precision local surface sampler (narrow angular cone + distance-weighted interpolation)
 * so tailored couture bust cups & draped stoles hug the true sculpted Body_00_SKIN contour
 * without ever inflating outward to the bust apex envelope.
 */
function sampleRawBodySurfaceTight(
  pts: RawBodySample[],
  yRaw: number,
  thetaRaw: number,
  standoffRaw: number,
  axisZRaw?: number,
): THREE.Vector3 {
  const cz = axisZRaw ?? computeTorsoCenterlineZ(pts, yRaw);
  const dirX = Math.sin(thetaRaw);
  const dirZ = -Math.cos(thetaRaw);
  const yBand = 0.016;

  let wSum = 0;
  let rSum = 0;
  let maxR = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const dy = Math.abs(p.y - yRaw);
    if (dy > yBand) continue;
    const dx = p.x;
    const dz = p.z - cz;
    const r = Math.hypot(dx, dz);
    if (r < 0.015) continue;
    const cosAng = (dx * dirX + dz * dirZ) / r;
    if (cosAng > 0.96) {
      const proj = dx * dirX + dz * dirZ;
      const w = Math.pow((cosAng - 0.96) / 0.04, 1.5) * (1.0 - dy / yBand) + 0.05;
      wSum += w;
      rSum += proj * w;
      if (proj > maxR) maxR = proj;
    }
  }

  if (wSum > 0.001) {
    const avgR = rSum / wSum;
    // Preserve local surface peaks (88% local max + 12% weighted average) so fitted couture never clips through curved skin
    const finalR = maxR * 0.88 + avgR * 0.12 + standoffRaw;
    return new THREE.Vector3(dirX * finalR, yRaw, cz + dirZ * finalR);
  }
  return sampleRawBodySurface(pts, yRaw, thetaRaw, standoffRaw, cz);
}

/**
 * Transfers nearest-vertex (skinIndex, skinWeight) attributes from the reference Body SkinnedMesh
 * onto any procedural geometry built in raw GLB space, creating a seamless pose-synchronized SkinnedMesh.
 */
function bindGeometryToBodySkeleton(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  bodySkinnedMesh: THREE.SkinnedMesh,
  bodySamples: RawBodySample[],
  allowedJointIndices?: Set<number>,
  fallbackJointIndex = 0,
): THREE.SkinnedMesh {
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const count = posAttr.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);

    // Track 3 closest body samples for smooth bilinear skin weight blending
    let d1 = Infinity;
    let d2 = Infinity;
    let d3 = Infinity;
    let s1: RawBodySample | null = null;
    let s2: RawBodySample | null = null;
    let s3: RawBodySample | null = null;

    for (let j = 0; j < bodySamples.length; j++) {
      const s = bodySamples[j];
      const dy = s.y - vy;
      if (Math.abs(dy) > 0.22) continue;
      const dx = s.x - vx;
      const dz = s.z - vz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < d1) {
        d3 = d2;
        s3 = s2;
        d2 = d1;
        s2 = s1;
        d1 = dSq;
        s1 = s;
      } else if (dSq < d2) {
        d3 = d2;
        s3 = s2;
        d2 = dSq;
        s2 = s;
      } else if (dSq < d3) {
        d3 = dSq;
        s3 = s;
      }
    }

    const accum = new Map<number, number>();
    const neighbors = [
      { s: s1, d: d1 },
      { s: s2, d: d2 },
      { s: s3, d: d3 },
    ];
    for (let n = 0; n < neighbors.length; n++) {
      const nb = neighbors[n];
      if (!nb.s) continue;
      const wSample = 1.0 / (Math.sqrt(nb.d) + 0.008);
      for (let k = 0; k < 4; k++) {
        const jIdx = nb.s.joints[k];
        const jW = nb.s.weights[k];
        if (jW <= 0.001) continue;
        if (allowedJointIndices && !allowedJointIndices.has(jIdx)) continue;
        accum.set(jIdx, (accum.get(jIdx) || 0) + jW * wSample);
      }
    }

    if (accum.size === 0) {
      skinIndices[i * 4] = fallbackJointIndex;
      skinWeights[i * 4] = 1.0;
      continue;
    }

    const sorted = Array.from(accum.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    let totalW = 0;
    for (let k = 0; k < sorted.length; k++) totalW += sorted[k][1];
    if (totalW <= 1e-6) {
      skinIndices[i * 4] = fallbackJointIndex;
      skinWeights[i * 4] = 1.0;
    } else {
      for (let k = 0; k < 4; k++) {
        if (k < sorted.length) {
          skinIndices[i * 4 + k] = sorted[k][0];
          skinWeights[i * 4 + k] = sorted[k][1] / totalW;
        } else {
          skinIndices[i * 4 + k] = 0;
          skinWeights[i * 4 + k] = 0;
        }
      }
    }
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const skinned = new THREE.SkinnedMesh(geo, material);
  skinned.name = name;
  skinned.frustumCulled = false;
  skinned.bind(bodySkinnedMesh.skeleton, bodySkinnedMesh.bindMatrix);
  return skinned;
}

/**
 * Builds an analytical SkinnedMesh directly from a custom per-vertex weight callback (ideal for skirt & draped stoles/back hair).
 */
function bindGeometryWithCustomWeights(
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  bodySkinnedMesh: THREE.SkinnedMesh,
  weightResolver: (vx: number, vy: number, vz: number) => Array<[number, number]>,
): THREE.SkinnedMesh {
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const count = posAttr.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const pairs = weightResolver(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
      .filter(([j, w]) => j >= 0 && w > 0.0001)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    let total = 0;
    for (let k = 0; k < pairs.length; k++) total += pairs[k][1];
    if (total <= 1e-6) {
      skinIndices[i * 4] = 0;
      skinWeights[i * 4] = 1.0;
    } else {
      for (let k = 0; k < 4; k++) {
        if (k < pairs.length) {
          skinIndices[i * 4 + k] = pairs[k][0];
          skinWeights[i * 4 + k] = pairs[k][1] / total;
        }
      }
    }
  }

  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const skinned = new THREE.SkinnedMesh(geo, material);
  skinned.name = name;
  skinned.frustumCulled = false;
  skinned.bind(bodySkinnedMesh.skeleton, bodySkinnedMesh.bindMatrix);
  return skinned;
}

/**
 * Builds a raw-space body-conforming couture shell around sculpted Body_00_SKIN.
 */
function createRawBodyConformingShellGeometry(
  pts: RawBodySample[],
  yRawMin: number,
  yRawMax: number,
  thetaStart: number,
  thetaEnd: number,
  standoffRaw: number,
  cutoutProfile?: (vNorm: number) => number,
  ySteps = 20,
  angSteps = 44,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= ySteps; iy++) {
    const v = iy / ySteps;
    const yRaw = THREE.MathUtils.lerp(yRawMin, yRawMax, v);
    const cz = computeTorsoCenterlineZ(pts, yRaw);
    const cutGap = cutoutProfile ? cutoutProfile(v) : 0;
    const t0 = thetaStart + cutGap;
    const t1 = thetaEnd - cutGap;

    for (let ix = 0; ix <= angSteps; ix++) {
      const u = ix / angSteps;
      const theta = THREE.MathUtils.lerp(t0, t1, u);
      const pRaw = sampleRawBodySurfaceTight(pts, yRaw, theta, standoffRaw, cz);
      positions.push(pRaw.x, pRaw.y, pRaw.z);
      uvs.push(u, 1.0 - v);
    }
  }

  const stride = angSteps + 1;
  for (let iy = 0; iy < ySteps; iy++) {
    for (let ix = 0; ix < angSteps; ix++) {
      const a = iy * stride + ix;
      const b = a + stride;
      // Outside outward normals in raw space
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Symmetrical Anatomical Bust Cup Shell built directly in raw GLB space, hugging tightly onto the single continuous Body_00_SKIN bust.
 */
function createRawAnatomicalBustCupGeometry(
  pts: RawBodySample[],
  side: -1 | 1,
  standoffRaw = 0.0022,
): THREE.BufferGeometry {
  const uSegs = 28;
  const vSegs = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs; // 0 = under-bust fold -> 1 = sculpted plunge cup rim
    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs; // 0 = inner plunge border (showcases lush cleavage!) -> 1 = outer side ribcage
      const theta = THREE.MathUtils.lerp(side * 0.44, side * 1.56, u);
      // Sweeping diagonal plunge neckline hugging the outer/lower curve of the real sculpted breast
      const topRimY = THREE.MathUtils.lerp(1.236, 1.304, Math.pow(u, 0.72)) + Math.sin(u * Math.PI) * 0.010;
      const botRimY = 1.182 + u * 0.015;
      const yRaw = THREE.MathUtils.lerp(botRimY, topRimY, v);
      const cz = computeTorsoCenterlineZ(pts, yRaw);

      // Tight local surface sample directly over the real sculpted Body_00_SKIN (zero extra dome puff, zero floating gap!)
      const surf = sampleRawBodySurfaceTight(pts, yRaw, theta, standoffRaw, cz);
      positions.push(surf.x, surf.y, surf.z);
      uvs.push(u, 1.0 - v);
    }
  }

  const stride = uSegs + 1;
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * stride + iu;
      const b = a + stride;
      if (side === 1) {
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      } else {
        indices.push(a, b, a + 1);
        indices.push(a + 1, b, b + 1);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Flared Sinusoidal Pleated Mini-Skirt built directly in raw GLB space centered at hipCenterZ.
 */
function createRawPleatedSkirtGeometry(
  topY: number,
  height: number,
  topRx: number,
  topRz: number,
  botRx: number,
  botRz: number,
  hipCenterZ: number,
  pleats = 24,
): THREE.BufferGeometry {
  const radSegs = pleats * 4;
  const hSegs = 16;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= hSegs; iy++) {
    const v = iy / hSegs;
    const y = topY - v * height;
    const flare = Math.pow(v, 0.78);
    const rx = THREE.MathUtils.lerp(topRx, botRx, flare);
    const rz = THREE.MathUtils.lerp(topRz, botRz, flare);
    const pleatDepth = 0.012 * Math.sin(v * Math.PI * 0.76);

    for (let ix = 0; ix <= radSegs; ix++) {
      const u = ix / radSegs;
      const theta = u * Math.PI * 2;
      const pleat = Math.sin(theta * pleats) * pleatDepth;
      // Front (-Z raw -> cos(theta) at theta=0) gentle V-arch slit lift + hip curve
      const slitLift = Math.pow(Math.max(0, Math.cos(theta)), 4.0) * v * height * 0.14;
      const hipDip = Math.pow(Math.abs(Math.sin(theta)), 3.0) * (1.0 - v) * height * 0.045;
      const x = Math.sin(theta) * (rx + pleat);
      const z = hipCenterZ - Math.cos(theta) * (rz + pleat);
      positions.push(x, y + slitLift - hipDip, z);
      uvs.push(u * 2.0, 1.0 - v);
    }
  }

  const stride = radSegs + 1;
  for (let iy = 0; iy < hSegs; iy++) {
    for (let ix = 0; ix < radSegs; ix++) {
      const a = iy * stride + ix;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Draped Curved Ribbon / Hair Strand / Liturgical Stole Geometry
 */
function createDrapedRibbonGeometry(
  curvePoints: THREE.Vector3[],
  widthProfile: (t: number) => number,
  segmentsU = 36,
  segmentsV = 6,
  normalBias = new THREE.Vector3(0, 0, 1),
  camberRatio = 0.22,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tangent = new THREE.Vector3();
  const sideDir = new THREE.Vector3();
  const upVec = new THREE.Vector3();

  for (let i = 0; i <= segmentsU; i++) {
    const v = i / segmentsU;
    const p = curve.getPointAt(v);
    curve.getTangentAt(v, tangent).normalize();
    sideDir.crossVectors(normalBias, tangent).normalize();
    if (sideDir.lengthSq() < 0.01) sideDir.set(1, 0, 0);
    upVec.crossVectors(tangent, sideDir).normalize();

    const halfW = widthProfile(v) * 0.5;
    for (let j = 0; j <= segmentsV; j++) {
      const u = j / segmentsV;
      const lat = (u - 0.5) * 2.0;
      const arch = (1.0 - lat * lat) * halfW * camberRatio;
      positions.push(
        p.x + sideDir.x * lat * halfW + upVec.x * arch,
        p.y + sideDir.y * lat * halfW + upVec.y * arch,
        p.z + sideDir.z * lat * halfW + upVec.z * arch,
      );
      uvs.push(u, 1.0 - v);
    }
  }

  const stride = segmentsV + 1;
  for (let i = 0; i < segmentsU; i++) {
    for (let j = 0; j < segmentsV; j++) {
      const a = i * stride + j;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Pushes a point outside an exact measured head/skull ellipsoid in headRoot local space.
 */
function clampPointOutsideEllipsoid(
  p: THREE.Vector3,
  center: THREE.Vector3,
  radii: THREE.Vector3,
): THREE.Vector3 {
  const dx = (p.x - center.x) / radii.x;
  const dy = (p.y - center.y) / radii.y;
  const dz = (p.z - center.z) / radii.z;
  const distSq = dx * dx + dy * dy + dz * dz;
  if (distSq < 1.0 && distSq > 1e-6) {
    const inv = 1.0 / Math.sqrt(distSq);
    return new THREE.Vector3(
      center.x + dx * inv * radii.x,
      center.y + dy * inv * radii.y,
      center.z + dz * inv * radii.z,
    );
  }
  return p.clone();
}

/**
 * Enforces that EVERY vertex of a hair ribbon geometry stays strictly outside the measured head/face ellipsoid,
 * guaranteeing mathematically zero skull, forehead, temple, or cheek clipping from any camera angle.
 */
function pushGeometryOutsideEllipsoid(
  geo: THREE.BufferGeometry,
  center: THREE.Vector3,
  radii: THREE.Vector3,
): THREE.BufferGeometry {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!pos) return geo;
  let moved = false;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const dx = (vx - center.x) / radii.x;
    const dy = (vy - center.y) / radii.y;
    const dz = (vz - center.z) / radii.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq < 1.0 && distSq > 1e-6) {
      const inv = 1.0 / Math.sqrt(distSq);
      pos.setXYZ(
        i,
        center.x + dx * inv * radii.x,
        center.y + dy * inv * radii.y,
        center.z + dz * inv * radii.z,
      );
      moved = true;
    }
  }
  if (moved) {
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

/**
 * Smooth Champagne-Blonde Scalp Crown Dome (緊貼頭頂中分髮帽) built directly around the exact measured Face_00_SKIN head box.
 */
function createCrownPartCapGeometry(
  scale: number,
  headCenter: THREE.Vector3,
  headHalf: THREE.Vector3,
): THREE.BufferGeometry {
  const uSegs = 32;
  const vSegs = 18;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const pad = 0.0075 * scale;
  const rx = headHalf.x + pad;
  const ry = headHalf.y * 0.88 + pad;
  const rz = headHalf.z + pad;
  const cy = headCenter.y + headHalf.y * 0.14;

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs; // 0 = center top part -> 1 = hairline / nape rim
    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const theta = (u - 0.5) * Math.PI * 2; // 0 = +Z front forehead, +-PI = -Z back skull
      const frontMask = Math.max(0, Math.cos(theta));
      // Smoothly wraps full cranium from hairline to nape without clipping temples or forehead
      const maxPhi = THREE.MathUtils.lerp(Math.PI * 0.62, Math.PI * 0.36, Math.pow(frontMask, 0.78));
      const phi = THREE.MathUtils.lerp(0.03, maxPhi, v);

      // Subtle center-part furrow along top scalp (never dips inside the skull!)
      const partDip = Math.exp(-Math.pow(Math.sin(theta) / 0.16, 2)) * (1 - v * 0.45) * 0.003 * scale;

      const x = headCenter.x + Math.sin(phi) * Math.sin(theta) * rx;
      const y = cy + Math.cos(phi) * ry - partDip * 0.4;
      const z = headCenter.z + Math.sin(phi) * Math.cos(theta) * rz - partDip * frontMask * 0.3;
      positions.push(x, y, z);
      uvs.push(u, 1.0 - v * 0.45);
    }
  }

  const stride = uSegs + 1;
  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * stride + iu;
      const b = a + stride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted Golden Helical Unicorn Horn (額心螺旋金角)
 */
function createSpiralHornGeometry(length: number, baseRadius: number): THREE.BufferGeometry {
  const radialSegs = 32;
  const heightSegs = 40;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= heightSegs; iy++) {
    const v = iy / heightSegs;
    const y = v * length;
    const baseTaper = Math.pow(1.0 - v, 0.84);
    for (let ix = 0; ix <= radialSegs; ix++) {
      const u = ix / radialSegs;
      const theta = u * Math.PI * 2;
      const spiralWave = Math.sin(theta * 4.0 + v * Math.PI * 7.8);
      const fluteAmp = baseRadius * (0.24 * (1.0 - v * 0.6));
      const r = Math.max(0.0004, baseRadius * baseTaper + spiralWave * fluteAmp * baseTaper);
      positions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
      uvs.push(u, v);
    }
  }

  const rowStride = radialSegs + 1;
  for (let iy = 0; iy < heightSegs; iy++) {
    for (let ix = 0; ix < radialSegs; ix++) {
      const a = iy * rowStride + ix;
      const b = a + rowStride;
      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * True 3D Sculpted Anatomical Pointed Elven Ear (立體精靈尖耳：耳輪卷邊、對耳輪脊、凹陷耳甲腔與圓潤耳垂)
 * Built with real concave/convex cartilage relief so PBR, Clay (素模), and Wireframe modes show genuine 3D ear anatomy.
 */
function createElfEarGeometry(side: -1 | 1, scale: number): THREE.BufferGeometry {
  const lengthSegs = 28;
  const ringSegs = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    const isTip = i === lengthSegs;

    // Graceful Fleurdelys elven ear span matched to FBX temple-to-tip ratio with fuller solid cartilage volume
    const xOut = side * (t * 0.078 * scale);
    const yLift = (-0.004 * (1 - t) + Math.pow(t, 1.22) * 0.023 + Math.sin(t * Math.PI) * 0.005) * scale;
    const zBack = (-Math.pow(t, 1.15) * 0.025 - Math.sin(t * Math.PI) * 0.003) * scale;

    // Smooth silhouette envelope: solid anatomical base + rounded lower lobule tapering to a fine sculpted elven point
    const env = Math.sin(Math.pow(t, 0.52) * Math.PI);
    const tipTaper = Math.pow(Math.max(0, 1 - t), 0.86);
    const baseHeight = isTip ? 0.0 : (0.0235 * tipTaper + 0.0064 * env) * scale;
    const baseThick = isTip ? 0.0 : (0.0092 * tipTaper + 0.003 * env) * scale;

    // Mask for mid-auricle anatomical features (fades smoothly to 0 at skull root and pointed tip)
    const midMask = Math.sin(Math.pow(t, 0.72) * Math.PI);
    const lobuleMask = Math.exp(-Math.pow((t - 0.14) / 0.12, 2));

    for (let j = 0; j <= ringSegs; j++) {
      const a = (j / ringSegs) * Math.PI * 2;
      const cosA = Math.cos(a); // +1 front (+Z), -1 dorsal back (-Z)
      const sinA = Math.sin(a); // +1 upper helix (+Y), -1 lower rim/lobule (-Y)

      // Rounded anatomical earlobe drop on lower base (sinA < 0 near root)
      const lowerLobuleDrop = sinA < 0 ? -Math.abs(sinA) * 0.0092 * lobuleMask * scale : 0;

      // Vertical cross-section with slight upper-rim flare
      const cy = sinA * baseHeight + lowerLobuleDrop;

      // 3D Cartilage Relief along Z:
      // 1) Recessed front concha bowl & scapha fossa (cosA > 0, mid-height)
      const frontHollowZone = Math.max(0, cosA - 0.08) * Math.exp(-Math.pow((sinA - 0.06) / 0.56, 2));
      const conchaDepth =
        t > 0.06 && t < 0.74
          ? -0.0058 * scale * frontHollowZone * Math.sin(((t - 0.06) / 0.68) * Math.PI)
          : 0;

      // 2) Raised internal antihelix cartilage ridge inside the concha
      const antihelixZone =
        Math.max(0, cosA - 0.15) *
        Math.exp(-Math.pow((sinA - 0.24) / 0.24, 2)) *
        Math.exp(-Math.pow((t - 0.34) / 0.18, 2));
      const antihelixLift = 0.0036 * scale * antihelixZone;

      // 3) Rolled forward-curling outer helix rim (top & lower-outer edges)
      const upperHelixRim = Math.exp(-Math.pow((sinA - 0.88) / 0.26, 2)) * Math.max(0, cosA + 0.35);
      const lowerHelixRim = Math.exp(-Math.pow((sinA + 0.85) / 0.28, 2)) * Math.max(0, cosA + 0.35);
      const helixCurlZ = (upperHelixRim * 0.0048 + lowerHelixRim * 0.0032) * midMask * scale;

      // 4) Dorsal cartilage fullness on the back of the ear (cosA < 0)
      const dorsalFullness = cosA < 0 ? -Math.abs(cosA) * 0.0028 * midMask * scale : 0;

      const cz = cosA * baseThick + conchaDepth + antihelixLift + helixCurlZ + dorsalFullness;

      positions.push(xOut, yLift + cy, zBack + cz);
      uvs.push(t, j / ringSegs);
    }
  }

  // Outward-facing triangle winding for both left (+1) and right (-1) ears (eliminates inverted-normal backface culling!)
  const stride = ringSegs + 1;
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < ringSegs; j++) {
      const a = i * stride + j;
      const b = a + stride;
      if (side === 1) {
        indices.push(a, b, a + 1);
        indices.push(a + 1, b, b + 1);
      } else {
        indices.push(a, a + 1, b);
        indices.push(a + 1, b + 1, b);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 4-Pointed Diamond Star Silhouette Geometry (四角星芒)
 */
function createFourPointStarGeometry(radius: number, thickness: number): THREE.BufferGeometry {
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
    bevelThickness: thickness * 0.45,
    bevelSize: radius * 0.04,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  return geo;
}

/**
 * Applies full Fleurdelys facial sculpt, feathery center-part hair strands, natural hourglass body curves,
 * and pose-synchronized SkinnedMesh couture onto the loaded base anime rig.
 */
export function applyFleurdelysSculptAndCostume(ctx: FleurdelysBuildContext): void {
  const { character, allBones, humanoidBones, extraAnimatedNodes, disposables } = ctx;
  character.updateMatrixWorld(true);

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

  const bounds = new THREE.Box3().setFromObject(character);
  const charHeight = bounds.max.y - bounds.min.y || 2.58;
  const s = charHeight / 1.72;

  const getBoneWorldPos = (bone: THREE.Bone | null, fallbackY: number): THREE.Vector3 => {
    const out = new THREE.Vector3(0, fallbackY * s, 0);
    if (bone) {
      bone.updateMatrixWorld(true);
      bone.getWorldPosition(out);
    }
    return out;
  };

  const upperChestBone =
    allBones.find((b) => b.name.toLowerCase().includes('upperchest')) || humanoidBones.chest;
  const headPos = getBoneWorldPos(humanoidBones.head, 1.497);
  const neckPos = getBoneWorldPos(humanoidBones.neck, 1.421);
  const upperChestPos = getBoneWorldPos(upperChestBone, 1.306);
  const lUpperArmPos = getBoneWorldPos(humanoidBones.leftUpperArm, 1.379);
  const rUpperArmPos = getBoneWorldPos(humanoidBones.rightUpperArm, 1.379);
  const rForearmPos = getBoneWorldPos(humanoidBones.rightForearm, 1.368);
  const lForearmPos = getBoneWorldPos(humanoidBones.leftForearm, 1.368);
  const rHandPos = getBoneWorldPos(humanoidBones.rightHand, 1.368);
  const lHandPos = getBoneWorldPos(humanoidBones.leftHand, 1.368);
  const lFootPos = getBoneWorldPos(humanoidBones.leftFoot, 0.144);
  const rFootPos = getBoneWorldPos(humanoidBones.rightFoot, 0.144);

  // Locate primary Skin/Face meshes & Bone joint indices for SkinnedMesh binding
  let primarySkinMaterial: THREE.MeshPhysicalMaterial | null = null;
  let faceSkinMaterial: THREE.MeshPhysicalMaterial | null = null;
  let foundBodySkinnedMesh: THREE.SkinnedMesh | null = null;

  const rawTorsoSamples: RawBodySample[] = [];
  const rawBodyAllSamples: RawBodySample[] = [];
  const rawNeckSamples: RawBodySample[] = [];
  const rawForearmSamplesL: RawBodySample[] = [];
  const rawForearmSamplesR: RawBodySample[] = [];

  const processedMats = new Set<THREE.Material>();
  const sculptedBodyAttrs = new Set<THREE.BufferAttribute | THREE.InterleavedBufferAttribute>();
  const sculptedFacePrimVertices = new Map<THREE.BufferAttribute | THREE.InterleavedBufferAttribute, Set<number>>();
  const sharedFaceNormalMeshes = new Map<
    THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    THREE.Mesh[]
  >();
  const sharedBodyNormalMeshes = new Map<
    THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    THREE.Mesh[]
  >();

  // Reset J_Sec bust bone scaling to exact 1.0 so sculpted Body_00_SKIN matches 1:1 with all skinned couture (zero bust clip/float!)
  allBones.forEach((b) => {
    const low = b.name.toLowerCase();
    if (low.includes('j_sec_l_bust1') || low.includes('j_sec_r_bust1')) {
      b.scale.set(1.0, 1.0, 1.0);
    }
  });

  // Pass 1: Hide original Shorekeeper clothing/shoes/ALL Hair001; apply textures; sculpt Face & Body geometry
  character.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    // Hide ALL Shorekeeper front/side/bob Hair001 primitives cleanly so bespoke feathered Fleurdelys hair defines silhouette
    const isShorekeeperHair001 =
      mats.some((m) => /hair_00_hair/i.test(m?.name || '')) && !(mesh.name || '').startsWith('Fleurdelys');
    if (isShorekeeperHair001) {
      mesh.visible = false;
      return;
    }

    mats.forEach((mat) => {
      if (!mat) return;
      const mName = `${mat.name || ''} ${mesh.name || ''}`.toLowerCase();
      const phys = mat as THREE.MeshPhysicalMaterial;

      // Hide original Shorekeeper dress & shoes
      if (/tops_01|bottoms_01|onepiece|shoes_01/i.test(mName)) {
        mesh.visible = false;
        return;
      }

      // Hide the base VRoid model's original human ear sub-mesh (Face.baked_8: y in [1.51..1.58], absX > 0.095)
      // so our 3D sculpted elven ears sit cleanly on the temples with ZERO double-ear overlap!
      if (/face_00_skin/i.test(mName) && mesh.geometry) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        const fb = mesh.geometry.boundingBox;
        if (fb && fb.min.y > 1.495 && fb.max.y < 1.605 && Math.max(Math.abs(fb.min.x), Math.abs(fb.max.x)) > 0.095) {
          mesh.visible = false;
          return;
        }
      }

      if (!processedMats.has(mat)) {
        processedMats.add(mat);

        if (/face_00_skin/i.test(mName)) {
          faceSkinMaterial = phys;
          if (phys.map && phys.map.image) {
            phys.map = trackTex(
              createFleurdelysFaceTexture(phys.map.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap),
            );
          }
          // Dedicated UV-aligned facial pore/lip-crease normal map & zone-accurate roughness map for silky radiant CG beauty skin
          phys.normalMap = trackTex(createFleurdelysFaceNormalMap());
          phys.normalScale = new THREE.Vector2(0.32, 0.32);
          phys.roughnessMap = trackTex(createFleurdelysFaceRoughnessMap());
          phys.roughness = 0.84;
          phys.sheen = 0.28;
          phys.sheenRoughness = 0.54;
          phys.sheenColor = new THREE.Color(0xffc4b8);
          phys.clearcoat = 0.18;
          phys.clearcoatRoughness = 0.34;
          phys.needsUpdate = true;
        } else if (/body_00_skin/i.test(mName)) {
          primarySkinMaterial = phys;
          if (phys.map && phys.map.image) {
            phys.map = trackTex(
              createFleurdelysBodyTexture(phys.map.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap),
            );
          }
          // Silky micro-dermal pore normal & subtle skin-grain roughness modulation for natural porcelain-velvet light roll-off
          const bodyMicroNormal = trackTex(createSkinMicroNormalMap());
          bodyMicroNormal.repeat.set(6, 6);
          const bodyMicroRough = trackTex(createSkinMicroRoughnessMap());
          bodyMicroRough.repeat.set(6, 6);
          phys.normalMap = bodyMicroNormal;
          phys.normalScale = new THREE.Vector2(0.16, 0.16);
          phys.roughnessMap = bodyMicroRough;
          phys.roughness = 0.62;
          phys.sheen = 0.36;
          phys.sheenRoughness = 0.52;
          phys.sheenColor = new THREE.Color(0xf8b2a0);
          phys.clearcoat = 0.22;
          phys.clearcoatRoughness = 0.32;
          phys.envMapIntensity = 0.88;
          phys.needsUpdate = true;
        }

        if (/eyeiris/i.test(mName) && phys.map && phys.map.image) {
          const irisTex = trackTex(
            createFleurdelysIrisTexture(phys.map.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap),
          );
          phys.map = irisTex;
          phys.emissiveMap = irisTex;
          phys.emissive = new THREE.Color(0x93c5fd);
          phys.emissiveIntensity = 0.24; // Crisp jewel-like sapphire-violet-aqua radiance
          phys.roughness = 0.04;
          phys.clearcoat = 1.0;
          phys.clearcoatRoughness = 0.01;
          phys.needsUpdate = true;
        }

        if (/eyewhite/i.test(mName)) {
          const scleraTex = trackTex(createFleurdelysScleraTexture());
          phys.map = scleraTex;
          phys.color.setHex(0xffffff);
          phys.emissive = new THREE.Color(0xdbeafe);
          phys.emissiveIntensity = 0.1;
          phys.roughness = 0.16;
          phys.clearcoat = 0.45;
          phys.clearcoatRoughness = 0.12;
          phys.side = THREE.DoubleSide;
          phys.needsUpdate = true;
        }

        if (/faceeyeline|faceeyelash/i.test(mName)) {
          phys.color.setHex(0x241d26); // Crisp velvet dark plum-charcoal lashes
          phys.roughness = 0.46;
          phys.needsUpdate = true;
        }

        if (/facebrow/i.test(mName)) {
          phys.color.setHex(0x9d8668); // Natural ash-blonde brow tone
          phys.roughness = 0.62;
          phys.needsUpdate = true;
        }

        if (/hair/i.test(mName) && phys.isMeshPhysicalMaterial) {
          applyFleurdelysHairTwoToneShader(phys, neckPos.y, upperChestPos.z + 0.04 * s);
        }
      }

      // Sculpt Semi-Realistic Mature 3D Facial Anatomy (Solid Filled Eyes, Brow Ridge, 3D Nose Bridge/Tip, Soft Apple Cheeks, Plump 3D Lips, Natural Oval-V Jaw)
      if (
        /face_00_skin|eyewhite|faceeyeline|faceeyelash|facebrow|eyeiris|eyehighlight|facemouth/i.test(mName) &&
        mesh.geometry
      ) {
        const posAttr = mesh.geometry.getAttribute('position');
        if (posAttr) {
          let visited = sculptedFacePrimVertices.get(posAttr);
          if (!visited) {
            visited = new Set<number>();
            sculptedFacePrimVertices.set(posAttr, visited);
          }

          const idxAttr = mesh.geometry.getIndex();
          const vertCount = idxAttr ? idxAttr.count : posAttr.count;
          const isIris = /eyeiris|eyehighlight/i.test(mName);
          const isBrow = /facebrow/i.test(mName);
          const isEyeWhite = /eyewhite/i.test(mName);
          const isEyeLashOrLine = /faceeyeline|faceeyelash/i.test(mName);
          const isMouth = /facemouth/i.test(mName);
          const isFaceSkin = /face_00_skin/i.test(mName);

          for (let k = 0; k < vertCount; k++) {
            const vi = idxAttr ? idxAttr.getX(k) : k;
            if (visited.has(vi)) continue;
            visited.add(vi);

            let vx = posAttr.getX(vi);
            let vy = posAttr.getY(vi);
            let vz = posAttr.getZ(vi);
            const absX = Math.abs(vx);
            const signX = Math.tanh(vx / 0.008);

            if (isIris) {
              // Exquisite jewel-like mature goddess eyes: bright, crisp, expressive iris seated cleanly proud of sclera
              const irisCenterX = signX * 0.0420;
              const irisCenterY = 1.5572;
              vx = irisCenterX + (vx - irisCenterX) * 0.88;
              vy = irisCenterY + (vy - irisCenterY) * 0.85;
              vz -= 0.0014;
            } else if (isEyeWhite) {
              // Keep sclera FULL-SIZED & generously expanded behind eyelid skin so the eye socket is 100% filled with ZERO gaps
              const scleraCenterX = signX * 0.0425;
              const scleraCenterY = 1.556;
              vx = scleraCenterX + (vx - scleraCenterX) * 1.06;
              vy = scleraCenterY + (vy - scleraCenterY) * 1.06;
            } else if (isBrow) {
              // Resolute, confident, graceful mature onee-san eyebrows (sleek, poised, flattering arch)
              const innerResolute = Math.exp(-Math.pow((absX - 0.022) / 0.018, 2));
              const midArch = Math.exp(-Math.pow((absX - 0.056) / 0.018, 2));
              vy -= 0.0076 + 0.0018 * innerResolute - 0.0020 * midArch;
              vz -= 0.0030;
              const outerTail = THREE.MathUtils.smoothstep(absX, 0.062, 0.088);
              vy -= 0.001 * outerTail;
            } else if (isMouth) {
              // Kissable, plump mature lips with a subtle alluring upturned smile at the corners
              vx *= 0.88;
              const cornerLift = THREE.MathUtils.smoothstep(absX, 0.012, 0.026);
              vy += 0.0014 + 0.0015 * cornerLift;
              vz -= 0.0050;
            } else if (isEyeLashOrLine) {
              // Synchronized captivating almond cat-eye lid contour (open, confident, luminous gaze with lifted outer wing)
              const eyeCenterWeight = Math.exp(-Math.pow((absX - 0.043) / 0.028, 2));
              if (vy > 1.555) {
                const upperMask = THREE.MathUtils.smoothstep(vy, 1.555, 1.576);
                vy -= 0.0040 * upperMask * eyeCenterWeight;
              } else if (vy < 1.549) {
                const lowerMask = THREE.MathUtils.smoothstep(1.549 - vy, 0.0, 0.014);
                vy += 0.0018 * lowerMask * eyeCenterWeight;
              }
              const outerWing = THREE.MathUtils.smoothstep(absX, 0.054, 0.09);
              vx += signX * 0.0048 * outerWing;
              vy += 0.0034 * outerWing;
            } else if (isFaceSkin && vz < -0.02) {
              // 1. Subtle 3D Brow Ridge & Synchronized Alluring Almond Eyelid Margin (never pulls away from sclera!)
              if (vy > 1.574 && vy < 1.608 && absX < 0.074 && vz < -0.052) {
                const browRidge =
                  Math.exp(-Math.pow((vy - 1.588) / 0.013, 2)) *
                  Math.exp(-Math.pow((absX - 0.036) / 0.03, 2));
                vz -= 0.0045 * browRidge;
              }
              if (vy > 1.538 && vy < 1.584 && absX > 0.016 && absX < 0.086 && vz < -0.055) {
                const eyeCenterWeight = Math.exp(-Math.pow((absX - 0.043) / 0.028, 2));
                if (vy > 1.555) {
                  const upperMask =
                    THREE.MathUtils.smoothstep(vy, 1.555, 1.576) *
                    (1.0 - THREE.MathUtils.smoothstep(vy, 1.576, 1.592));
                  vy -= 0.0040 * upperMask * eyeCenterWeight;
                } else if (vy < 1.549) {
                  const lowerMask =
                    THREE.MathUtils.smoothstep(1.549 - vy, 0.0, 0.014) *
                    (1.0 - THREE.MathUtils.smoothstep(1.538 - vy, 0.0, 0.012));
                  vy += 0.0018 * lowerMask * eyeCenterWeight;
                }
              }

              // 2. Exquisite Dainty-Noble 3D Nose (refined bridge, softly upturned cute tip, zero pinched faceting!)
              if (vy > 1.516 && vy < 1.578 && absX < 0.024 && vz < -0.064) {
                const bridgeProfile = Math.exp(-Math.pow(absX / 0.0095, 2));
                const verticalBridge =
                  THREE.MathUtils.smoothstep(vy, 1.518, 1.53) *
                  (1.0 - THREE.MathUtils.smoothstep(vy, 1.56, 1.578));
                const noseTipBoost = Math.exp(-Math.pow((vy - 1.531) / 0.0088, 2)) * Math.exp(-Math.pow(absX / 0.01, 2));
                const nasalWing =
                  Math.exp(-Math.pow((absX - 0.0135) / 0.007, 2)) *
                  Math.exp(-Math.pow((vy - 1.525) / 0.0075, 2));
                vz -= 0.0058 * bridgeProfile * verticalBridge + 0.0064 * noseTipBoost + 0.0024 * nasalWing;
              }

              // 3. Soft, Youthful, Plump Apple Cheeks (flattering smooth contour, zero gaunt hollows!)
              if (vy > 1.504 && vy < 1.556 && absX > 0.02 && absX < 0.078 && vz < -0.04) {
                const appleCheek =
                  Math.exp(-Math.pow((absX - 0.045) / 0.022, 2)) *
                  Math.exp(-Math.pow((vy - 1.533) / 0.018, 2));
                vz -= 0.0044 * appleCheek;
                vx += signX * 0.0014 * appleCheek;
              }

              // 4. Plump, Kissable 3D Lips with Subtle Upturned Smile Corners & Soft Chin Cleft
              if (vy > 1.482 && vy < 1.518 && absX < 0.032 && vz < -0.062) {
                const lipWidth = Math.exp(-Math.pow(absX / 0.018, 2));
                const upperLip = Math.exp(-Math.pow((vy - 1.508) / 0.0056, 2)) * lipWidth;
                const lowerLip = Math.exp(-Math.pow((vy - 1.498) / 0.007, 2)) * lipWidth;
                const chinCleft = Math.exp(-Math.pow((vy - 1.487) / 0.0052, 2)) * Math.exp(-Math.pow(absX / 0.018, 2));
                vz -= 0.0052 * upperLip + 0.0064 * lowerLip;
                vz += 0.0026 * chinCleft;
              }

              // 5. Exquisite Heart-Oval Mature Goddess Jawline & Soft Feminine V-Chin
              if (vy < 1.54) {
                const jawBell = Math.sin(THREE.MathUtils.clamp((vy - 1.464) / 0.076, 0, 1) * Math.PI);
                vx *= 1.0 - 0.058 * jawBell * THREE.MathUtils.smoothstep(absX, 0.026, 0.074);
                const chinMask =
                  THREE.MathUtils.smoothstep(1.496 - vy, 0, 0.032) *
                  Math.exp(-Math.pow(absX / 0.025, 2));
                vy -= 0.0032 * chinMask;
                vz -= 0.0044 * chinMask;
              }
            }

            posAttr.setXYZ(vi, vx, vy, vz);
          }

          posAttr.needsUpdate = true;
          if (isFaceSkin) {
            const nAttr = mesh.geometry.getAttribute('normal');
            if (nAttr) {
              let list = sharedFaceNormalMeshes.get(nAttr);
              if (!list) {
                list = [];
                sharedFaceNormalMeshes.set(nAttr, list);
              }
              if (!list.includes(mesh)) list.push(mesh);
            }
          }
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
      }

      // Sculpt Lush, Voluptuous, Rounded Mature Hourglass Body Proportions & Capture Post-Sculpt Skin Samples
      if (/body_00_skin/i.test(mName) && mesh.geometry) {
        if (!foundBodySkinnedMesh && (mesh as THREE.SkinnedMesh).isSkinnedMesh && (mesh.geometry.boundingBox?.min.y ?? 1) < 0.8) {
          foundBodySkinnedMesh = mesh as THREE.SkinnedMesh;
        }
        const posAttr = mesh.geometry.getAttribute('position');
        const jointAttr = mesh.geometry.getAttribute('skinIndex');
        const weightAttr = mesh.geometry.getAttribute('skinWeight');

        if (posAttr && !sculptedBodyAttrs.has(posAttr)) {
          sculptedBodyAttrs.add(posAttr);
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          const bMinY = mesh.geometry.boundingBox?.min.y ?? 0;

          if (bMinY < 0.8) {
            const smoothBell = (t: number) => {
              const s0 = Math.sin(THREE.MathUtils.clamp(t, 0, 1) * Math.PI);
              return s0 * s0;
            };

            for (let i = 0; i < posAttr.count; i++) {
              let vx = posAttr.getX(i);
              const vy = posAttr.getY(i);
              let vz = posAttr.getZ(i);
              const absX = Math.abs(vx);
              const inTorsoX = absX < 0.185;
              const smoothSideSign = Math.tanh(vx / 0.016);

              // 1. Ultra-feminine cinched hourglass waist (y = 1.02..1.21) with dramatic S-curve lumbar arch
              if (inTorsoX && vy > 1.02 && vy < 1.21) {
                const wBell = smoothBell((vy - 1.02) / 0.19);
                vx *= 1.0 - 0.168 * wBell;
                const spineMidZ = -0.044;
                vz = spineMidZ + (vz - spineMidZ) * (1.0 - 0.06 * wBell);
                if (vz > -0.015) {
                  vz -= 0.014 * wBell;
                }
              }

              // 2. Ultra-voluptuous, lush rounded mature hips & high-lifted bilateral peach glutes (y = 0.66..1.05)
              if (absX < 0.26 && vy > 0.66 && vy < 1.05) {
                const hBell = smoothBell((vy - 0.66) / 0.39);
                vx *= 1.0 + 0.21 * hBell;
                if (vz > 0.003) {
                  // Full, lifted bilateral rounded peach-glute curve on posterior (+Z raw)
                  const gluteBell = smoothBell((vy - 0.72) / 0.31);
                  const cheekShape = 0.4 + 0.6 * Math.exp(-Math.pow((absX - 0.076) / 0.074, 2));
                  vz += 0.052 * gluteBell * cheekShape * THREE.MathUtils.smoothstep(vz, 0.003, 0.064);
                } else {
                  vz *= 1.0 + 0.092 * hBell;
                }
              }

              // 3. Lush, plump, sensual upper & mid thighs tapering gracefully to refined knees (y = 0.47..0.87)
              if (vy > 0.47 && vy < 0.87 && absX < 0.25) {
                const thighBell = smoothBell((vy - 0.47) / 0.4);
                const upperBias = THREE.MathUtils.smoothstep(vy, 0.48, 0.76);
                const legCenterX = smoothSideSign * 0.092;
                const legCenterZ = 0.006;
                const thighBoost = thighBell * (0.62 + 0.38 * upperBias);
                vx = legCenterX + (vx - legCenterX) * (1.0 + 0.205 * thighBoost);
                vz = legCenterZ + (vz - legCenterZ) * (1.0 + 0.188 * thighBoost);
              }

              // 4. Anatomically Natural, Soft Teardrop Mature Bust (C2-smooth, clean sternum cleavage valley, ZERO uniboob/pointedness/ribcage flare!)
              if (inTorsoX && vy > 1.196 && vy < 1.356 && vz < -0.050) {
                const xCenter = 0.058;
                const yCenter = 1.262;
                const dx = (absX - xCenter) / 0.066;
                const dyRaw = vy - yCenter;
                const dy = dyRaw / (dyRaw < 0 ? 0.064 : 0.088);
                const r2 = dx * dx + dy * dy;
                if (r2 < 1.0) {
                  const r = Math.sqrt(r2);
                  // C2-continuous raised cosine dome: lush rounded volume with zero edge creases or torpedo tip
                  const smoothDome = Math.pow(0.5 + 0.5 * Math.cos(r * Math.PI), 1.35);
                  // Strict sternum cleavage separation: 0 displacement at x = 0 so both breasts remain naturally distinct & rounded
                  const sternumValley = THREE.MathUtils.smoothstep(absX, 0.008, 0.036);
                  const frontMask = THREE.MathUtils.smoothstep(-0.050 - vz, 0.0, 0.044);
                  const weight = smoothDome * sternumValley * frontMask;
                  // Natural teardrop fullness: gentle upper slope transitioning into full, soft lower hemisphere
                  const teardrop = 1.0 + 0.14 * THREE.MathUtils.smoothstep(-dyRaw, -0.02, 0.045);
                  vz -= 0.036 * weight * teardrop;
                  // Subtle outer-breast rounding without flaring lateral ribs
                  const outerMask = THREE.MathUtils.smoothstep(absX, 0.045, 0.095);
                  vx += smoothSideSign * 0.0085 * weight * outerMask;
                }
              }

              // 4B. Sculpted Delicate Collarbones & Suprasternal Hollow (迷人鎖骨與優雅肩頸線條)
              if (inTorsoX && vy > 1.358 && vy < 1.408 && absX > 0.012 && absX < 0.105 && vz < -0.022) {
                const clavRidge =
                  Math.exp(-Math.pow((vy - (1.376 + absX * 0.14)) / 0.0075, 2)) *
                  THREE.MathUtils.smoothstep(absX, 0.014, 0.032) *
                  (1.0 - THREE.MathUtils.smoothstep(absX, 0.078, 0.105));
                const hollowAbove =
                  Math.exp(-Math.pow((vy - (1.39 + absX * 0.14)) / 0.009, 2)) *
                  THREE.MathUtils.smoothstep(absX, 0.016, 0.034) *
                  (1.0 - THREE.MathUtils.smoothstep(absX, 0.075, 0.1));
                vz -= 0.0036 * clavRidge;
                vz += 0.0028 * hollowAbove;
              }

              // 5. Shapely rounded feminine upper-mid calves tapering to ultra-delicate slender ankles (y = 0.08..0.47)
              if (vy > 0.08 && vy < 0.47 && absX < 0.19) {
                const legCenterX = smoothSideSign * 0.058;
                if (vy > 0.21) {
                  const calfBell = smoothBell((vy - 0.21) / 0.26);
                  vx = legCenterX + (vx - legCenterX) * (1.0 + 0.062 * calfBell);
                  vz *= 1.0 + 0.068 * calfBell;
                } else {
                  const ankleBell = smoothBell((vy - 0.08) / 0.13);
                  vx = legCenterX + (vx - legCenterX) * (1.0 - 0.062 * ankleBell);
                  vz *= 1.0 - 0.055 * ankleBell;
                }
              }

              // 6. Micro sub-cloth inset on STRICTLY covered seams (neck choker, mid-forearm glove, covered upper-back spine)
              if (vy > 1.422 && vy < 1.468 && absX < 0.065) {
                vx *= 0.96;
                vz = 0.007 + (vz - 0.007) * 0.96;
              } else if (vy > 1.19 && vy < 1.31 && absX < 0.12 && vz > 0.018) {
                vz -= 0.0022;
              } else if (absX > 0.355 && absX < 0.485 && vy > 1.31) {
                const armCy = 1.368;
                const armCz = -0.004;
                const yOff = vy - armCy;
                const zOff = vz - armCz;
                vz = armCz + zOff * 0.96;
                posAttr.setXYZ(i, vx, armCy + yOff * 0.96, vz);
              } else {
                posAttr.setXYZ(i, vx, vy, vz);
              }

              const finalY = posAttr.getY(i);
              const finalZ = posAttr.getZ(i);
              const joints: [number, number, number, number] = jointAttr
                ? [jointAttr.getX(i), jointAttr.getY(i), jointAttr.getZ(i), jointAttr.getW(i)]
                : [0, 0, 0, 0];
              const weights: [number, number, number, number] = weightAttr
                ? [weightAttr.getX(i), weightAttr.getY(i), weightAttr.getZ(i), weightAttr.getW(i)]
                : [1, 0, 0, 0];

              const sample: RawBodySample = { x: vx, y: finalY, z: finalZ, joints, weights };
              rawBodyAllSamples.push(sample);
              if (Math.abs(vx) < 0.195 && finalY > 0.86 && finalY < 1.44) {
                rawTorsoSamples.push(sample);
              }
              if (Math.abs(vx) < 0.08 && finalY >= 1.39 && finalY <= 1.49) {
                rawNeckSamples.push(sample);
              }
              if (vx < -0.31 && vx > -0.53 && finalY > 1.29) {
                rawForearmSamplesL.push(sample);
              }
              if (vx > 0.31 && vx < 0.53 && finalY > 1.29) {
                rawForearmSamplesR.push(sample);
              }
            }

            posAttr.needsUpdate = true;
          }
        }

        if (posAttr && sculptedBodyAttrs.has(posAttr)) {
          const nAttr = mesh.geometry.getAttribute('normal');
          if (nAttr) {
            let list = sharedBodyNormalMeshes.get(nAttr);
            if (!list) {
              list = [];
              sharedBodyNormalMeshes.set(nAttr, list);
            }
            if (!list.includes(mesh)) list.push(mesh);
          }
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
      }
    });
  });

  // Safely recompute smooth normals across ALL Body_00_SKIN primitives sharing a NORMAL BufferAttribute
  // in one unified pass so no primitive ever wipes another primitive's normals to (0, 0, 0).
  sharedBodyNormalMeshes.forEach((meshes, nAttr) => {
    const posAttr = meshes[0]?.geometry?.getAttribute('position');
    if (!posAttr) return;
    const count = nAttr.count;
    const accX = new Float32Array(count);
    const accY = new Float32Array(count);
    const accZ = new Float32Array(count);
    const touched = new Uint8Array(count);

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    meshes.forEach((m) => {
      const idx = m.geometry.getIndex();
      const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(posAttr.count / 3);
      for (let t = 0; t < triCount; t++) {
        const a = idx ? idx.getX(t * 3) : t * 3;
        const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        pA.fromBufferAttribute(posAttr, a);
        pB.fromBufferAttribute(posAttr, b);
        pC.fromBufferAttribute(posAttr, c);
        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        cb.cross(ab);
        accX[a] += cb.x;
        accY[a] += cb.y;
        accZ[a] += cb.z;
        accX[b] += cb.x;
        accY[b] += cb.y;
        accZ[b] += cb.z;
        accX[c] += cb.x;
        accY[c] += cb.y;
        accZ[c] += cb.z;
        touched[a] = 1;
        touched[b] = 1;
        touched[c] = 1;
      }
    });

    for (let i = 0; i < count; i++) {
      if (!touched[i]) continue;
      const nx = accX[i];
      const ny = accY[i];
      const nz = accZ[i];
      const lenSq = nx * nx + ny * ny + nz * nz;
      if (Number.isFinite(lenSq) && lenSq > 1e-10) {
        const inv = 1 / Math.sqrt(lenSq);
        nAttr.setXYZ(i, nx * inv, ny * inv, nz * inv);
      }
    }
    nAttr.needsUpdate = true;
  });

  // Blend 52% true 3D geometric normals with 48% original smooth spherical face normals across ALL face skin primitives
  // in one unified pass so sculpted nose bridge, brow ridge, cheekbones, and plump lips catch realistic 3D light!
  sharedFaceNormalMeshes.forEach((meshes, nAttr) => {
    const posAttr = meshes[0]?.geometry?.getAttribute('position');
    if (!posAttr) return;
    const count = nAttr.count;
    const accX = new Float32Array(count);
    const accY = new Float32Array(count);
    const accZ = new Float32Array(count);
    const touched = new Uint8Array(count);

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    meshes.forEach((m) => {
      const idx = m.geometry.getIndex();
      const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(posAttr.count / 3);
      for (let t = 0; t < triCount; t++) {
        const a = idx ? idx.getX(t * 3) : t * 3;
        const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        pA.fromBufferAttribute(posAttr, a);
        pB.fromBufferAttribute(posAttr, b);
        pC.fromBufferAttribute(posAttr, c);
        cb.subVectors(pC, pB);
        ab.subVectors(pA, pB);
        cb.cross(ab);
        accX[a] += cb.x;
        accY[a] += cb.y;
        accZ[a] += cb.z;
        accX[b] += cb.x;
        accY[b] += cb.y;
        accZ[b] += cb.z;
        accX[c] += cb.x;
        accY[c] += cb.y;
        accZ[c] += cb.z;
        touched[a] = 1;
        touched[b] = 1;
        touched[c] = 1;
      }
    });

    // Flattering silky beauty normal blend (38% 3D geometric + 62% smooth portrait normals — eliminates harsh polygonal shadows!)
    const geoBlend = 0.38;
    for (let i = 0; i < count; i++) {
      if (!touched[i]) continue;
      const gx = accX[i];
      const gy = accY[i];
      const gz = accZ[i];
      const gLenSq = gx * gx + gy * gy + gz * gz;
      if (Number.isFinite(gLenSq) && gLenSq > 1e-10) {
        const gInv = 1 / Math.sqrt(gLenSq);
        const ox = nAttr.getX(i);
        const oy = nAttr.getY(i);
        const oz = nAttr.getZ(i);
        const bx = ox * (1 - geoBlend) + gx * gInv * geoBlend;
        const by = oy * (1 - geoBlend) + gy * gInv * geoBlend;
        const bz = oz * (1 - geoBlend) + gz * gInv * geoBlend;
        const bLen = Math.hypot(bx, by, bz) || 1;
        nAttr.setXYZ(i, bx / bLen, by / bLen, bz / bLen);
      }
    }
    nAttr.needsUpdate = true;
  });

  const bodySkinnedMesh = foundBodySkinnedMesh as THREE.SkinnedMesh | null;
  const rawParentObj = bodySkinnedMesh?.parent || character;
  rawParentObj.updateMatrixWorld(true);
  const rawToWorld = (rx: number, ry: number, rz: number): THREE.Vector3 =>
    new THREE.Vector3(rx, ry, rz).applyMatrix4(rawParentObj.matrixWorld);

  // Resolve skeleton joint index lookup helpers for pose-synchronized SkinnedMesh clothing & hair
  const jointIndexMap = new Map<string, number>();
  if (bodySkinnedMesh) {
    bodySkinnedMesh.skeleton.bones.forEach((b, idx) => {
      jointIndexMap.set(b.name.toLowerCase(), idx);
    });
  }
  const findJointIdx = (kw: string, fallback = 0): number => {
    const low = kw.toLowerCase();
    for (const [name, idx] of jointIndexMap.entries()) {
      if (name === low || name.includes(low)) return idx;
    }
    return fallback;
  };
  const jHips = findJointIdx('j_bip_c_hips');
  const jSpine = findJointIdx('j_bip_c_spine', jHips);
  const jChest = findJointIdx('j_bip_c_chest', jSpine);
  const jUpperChest = findJointIdx('j_bip_c_upperchest', jChest);
  const jNeck = findJointIdx('j_bip_c_neck', jUpperChest);
  const jHead = findJointIdx('j_bip_c_head', jNeck);
  const jUpperLegL = findJointIdx('j_bip_l_upperleg', jHips);
  const jUpperLegR = findJointIdx('j_bip_r_upperleg', jHips);
  const jLowerArmL = findJointIdx('j_bip_l_lowerarm', jUpperChest);
  const jHandL = findJointIdx('j_bip_l_hand', jLowerArmL);
  const jLowerArmR = findJointIdx('j_bip_r_lowerarm', jUpperChest);
  const jHandR = findJointIdx('j_bip_r_hand', jLowerArmR);

  const torsoAllowedJoints = new Set<number>();
  jointIndexMap.forEach((idx, name) => {
    if (/hips|spine|chest|upperchest|bust/i.test(name)) torsoAllowedJoints.add(idx);
  });
  const armAllowedJointsL = new Set<number>([jLowerArmL, jHandL]);
  const armAllowedJointsR = new Set<number>([jLowerArmR, jHandR]);
  const neckAllowedJoints = new Set<number>([jUpperChest, jNeck, jHead]);

  const registerSkinnedCouture = (
    skinned: THREE.SkinnedMesh,
    mat: THREE.Material,
    castShadow = true,
    receiveShadow = true,
  ) => {
    skinned.castShadow = castShadow;
    skinned.receiveShadow = receiveShadow;
    rawParentObj.add(skinned);
    ctx.originalMeshMaterials.set(skinned, mat);
  };

  // ==================== 2. BESPOKE FLEURDELYS MATERIALS & FEATHERED HAIR TEXTURE ====================
  const fabricNormal = trackTex(createFabricWeaveNormalMap());
  const hairNormal = trackTex(createHairStrandNormalMap());
  const hairStrandTex = trackTex(createFleurdelysHairStrandTexture());
  const bodiceTex = trackTex(createFleurdelysBodiceTexture());
  bodiceTex.repeat.set(2, 2);
  const bodiceRoughTex = trackTex(createFleurdelysBodiceRoughnessMap());
  bodiceRoughTex.repeat.set(2, 2);
  const cathedralVeilTex = trackTex(createFleurdelysCathedralVeilTexture());
  const stoleTex = trackTex(createFleurdelysStoleTexture());
  const stoleRoughTex = trackTex(createFleurdelysStoleRoughnessMap());
  const skirtTex = trackTex(createFleurdelysSkirtTexture());
  const skirtRoughTex = trackTex(createFleurdelysSkirtRoughnessMap());
  const brushedMetalNormal = trackTex(createBrushedMetalNormalMap());
  const brushedMetalRough = trackTex(createBrushedMetalRoughnessMap());

  const satinObsidianMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_ObsidianBodysuit_CLOTH',
      map: bodiceTex,
      roughnessMap: bodiceRoughTex,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.08,
      sheen: 0.78,
      sheenRoughness: 0.32,
      sheenColor: new THREE.Color(0x93c5fd),
      clearcoat: 0.14,
      clearcoatRoughness: 0.42,
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.52, 0.52),
      side: THREE.DoubleSide,
      envMapIntensity: 1.08,
    }),
  );
  applyColorCoverageAndRollOffShader(satinObsidianMat);
  ctx.clothMaterialsList.push(satinObsidianMat);

  const skirtMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_PleatedSkirt_CLOTH',
      map: skirtTex,
      roughnessMap: skirtRoughTex,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.05,
      sheen: 0.68,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color(0x93c5fd),
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      side: THREE.DoubleSide,
      envMapIntensity: 1.02,
    }),
  );
  applyColorCoverageAndRollOffShader(skirtMat);
  ctx.clothMaterialsList.push(skirtMat);

  const stoleMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_LiturgicalStole_CLOTH',
      map: stoleTex,
      roughnessMap: stoleRoughTex,
      color: 0xffffff,
      emissive: new THREE.Color(0x1e293b),
      emissiveIntensity: 0.07,
      roughness: 0.78,
      metalness: 0.04,
      sheen: 0.78,
      sheenRoughness: 0.34,
      sheenColor: new THREE.Color(0xf0f9ff),
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.42, 0.42),
      side: THREE.DoubleSide,
      envMapIntensity: 1.04,
    }),
  );
  applyColorCoverageAndRollOffShader(stoleMat);
  ctx.clothMaterialsList.push(stoleMat);

  const featherTrimMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_FeatherTrim_CLOTH',
      color: 0xf1f7ff,
      roughness: 0.44,
      metalness: 0.0,
      sheen: 0.82,
      sheenRoughness: 0.36,
      sheenColor: new THREE.Color(0xbae6fd),
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      side: THREE.DoubleSide,
      envMapIntensity: 0.84,
    }),
  );
  applyColorCoverageAndRollOffShader(featherTrimMat);
  ctx.clothMaterialsList.push(featherTrimMat);

  const goldFiligreeMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_GoldFiligree_METAL',
      color: 0xf7cf74,
      roughnessMap: brushedMetalRough,
      normalMap: brushedMetalNormal,
      normalScale: new THREE.Vector2(0.18, 0.18),
      roughness: 0.56,
      metalness: 0.96,
      anisotropy: 0.76,
      clearcoat: 0.62,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.38,
    }),
  );

  const silverArmorMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_SilverArmlet_METAL',
      color: 0xb8c8de,
      roughnessMap: brushedMetalRough,
      normalMap: brushedMetalNormal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughness: 0.6,
      metalness: 0.91,
      anisotropy: 0.68,
      clearcoat: 0.54,
      clearcoatRoughness: 0.14,
      side: THREE.DoubleSide,
      envMapIntensity: 1.26,
    }),
  );

  const blueCrystalMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_BlueThornCrystal',
      color: 0x2563eb,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.64,
      roughness: 0.07,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      iridescence: 0.62,
      iridescenceIOR: 1.56,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      envMapIntensity: 1.45,
    }),
  );

  const starSparkleMat = trackMat(
    new THREE.MeshBasicMaterial({
      name: 'Fleurdelys_StarSparkle',
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    }),
  );

  const ribbonAquaMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_AquaRibbon_CLOTH',
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.26,
      roughness: 0.3,
      metalness: 0.02,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xe0f2fe),
      iridescence: 0.34,
      iridescenceIOR: 1.38,
      normalMap: fabricNormal,
      normalScale: new THREE.Vector2(0.22, 0.22),
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      envMapIntensity: 0.96,
    }),
  );
  ctx.clothMaterialsList.push(ribbonAquaMat);

  // Smooth crown cap material (solid champagne-blonde without tip alpha cutouts)
  const crownCapHairMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_CrownCap_HAIR',
      color: 0xf5e8d0,
      roughness: 0.33,
      metalness: 0.02,
      sheen: 0.56,
      sheenColor: new THREE.Color(0xbae6fd),
      clearcoat: 0.26,
      clearcoatRoughness: 0.24,
      anisotropy: 0.74,
      anisotropyRotation: Math.PI / 2,
      normalMap: hairNormal,
      normalScale: new THREE.Vector2(0.52, 0.52),
      side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    }),
  );
  applyFleurdelysHairTwoToneShader(crownCapHairMat, neckPos.y, upperChestPos.z + 0.04 * s);
  ctx.hairMaterialsList.push(crownCapHairMat);

  // Pure Pale Champagne-Blonde Front Bangs & Hime Side-Locks Material (never turns aqua on outer face locks!)
  const frontBlondeHairMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_FrontBlondeStrand_HAIR',
      map: hairStrandTex,
      alphaTest: 0.34,
      color: 0xf6ead4,
      roughness: 0.31,
      metalness: 0.02,
      sheen: 0.56,
      sheenColor: new THREE.Color(0xe0f2fe),
      clearcoat: 0.28,
      clearcoatRoughness: 0.24,
      anisotropy: 0.78,
      anisotropyRotation: Math.PI / 2,
      normalMap: hairNormal,
      normalScale: new THREE.Vector2(0.52, 0.52),
      side: THREE.DoubleSide,
      envMapIntensity: 0.92,
    }),
  );
  applyColorCoverageAndRollOffShader(frontBlondeHairMat);
  ctx.hairMaterialsList.push(frontBlondeHairMat);

  // Feathered Hair Strand Material (for long back hair with champagne -> aqua two-tone underglow)
  const hairStrandMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_FeatheredStrand_HAIR',
      map: hairStrandTex,
      alphaTest: 0.36,
      color: 0xffffff,
      roughness: 0.31,
      metalness: 0.02,
      sheen: 0.58,
      sheenColor: new THREE.Color(0xbae6fd),
      clearcoat: 0.28,
      clearcoatRoughness: 0.24,
      anisotropy: 0.78,
      anisotropyRotation: Math.PI / 2,
      normalMap: hairNormal,
      normalScale: new THREE.Vector2(0.56, 0.56),
      side: THREE.DoubleSide,
      envMapIntensity: 0.92,
    }),
  );
  applyFleurdelysHairTwoToneShader(hairStrandMat, neckPos.y, upperChestPos.z + 0.04 * s);
  ctx.hairMaterialsList.push(hairStrandMat);

  // Feathered Inner Sky-Aqua Underside Strand Material (bright turquoise peeking behind jaw/neck!)
  const innerAquaStrandMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_InnerAquaStrand_HAIR',
      map: hairStrandTex,
      alphaTest: 0.34,
      color: 0x5cd6f6,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.24,
      roughness: 0.3,
      metalness: 0.0,
      sheen: 0.62,
      sheenColor: new THREE.Color(0xe0f2fe),
      clearcoat: 0.24,
      clearcoatRoughness: 0.26,
      anisotropy: 0.78,
      anisotropyRotation: Math.PI / 2,
      normalMap: hairNormal,
      normalScale: new THREE.Vector2(0.48, 0.48),
      side: THREE.DoubleSide,
      envMapIntensity: 0.92,
    }),
  );
  applyColorCoverageAndRollOffShader(innerAquaStrandMat);
  ctx.hairMaterialsList.push(innerAquaStrandMat);

  // Dedicated Anatomical Elven Ear Skin Material (never reuses Face_00 atlas UVs!)
  const elfEarTex = trackTex(createFleurdelysElfEarTexture());
  const earSkinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      name: 'Fleurdelys_ElfEar_SKIN',
      map: elfEarTex,
      normalMap: (faceSkinMaterial as THREE.MeshPhysicalMaterial | null)?.normalMap ?? null,
      normalScale: new THREE.Vector2(0.14, 0.14),
      color: 0xffffff,
      roughness: 0.46,
      metalness: 0.0,
      sheen: 0.48,
      sheenRoughness: 0.58,
      sheenColor: new THREE.Color(0xffc4cc), // Subtle translucent rose-peach ear rim scatter
      clearcoat: 0.06,
      clearcoatRoughness: 0.55,
      envMapIntensity: 0.58,
    }),
  );
  applyColorCoverageAndRollOffShader(earSkinMat);

  // ==================== 3. HEAD: ELF EARS, PARTED CROWN HAIR, FORWARD-SWEPT GOLDEN HORN & OPEN THORN WREATH ====================
  if (humanoidBones.head) {
    const headRoot = new THREE.Group();
    headRoot.name = 'Fleurdelys_HeadOrnaments';

    // Measure the EXACT real-world bounding ellipsoid of Face_00_SKIN in headRoot local space!
    // This eliminates ANY scale/offset mismatch between `s`, `headPos`, and the actual rendered head mesh.
    const measuredHeadBox = new THREE.Box3();
    sharedFaceNormalMeshes.forEach((meshes) => {
      meshes.forEach((m) => {
        if (!m.visible) return;
        const pAttr = m.geometry.getAttribute('position');
        if (!pAttr) return;
        m.updateMatrixWorld(true);
        const tmp = new THREE.Vector3();
        for (let i = 0; i < pAttr.count; i++) {
          tmp.fromBufferAttribute(pAttr, i).applyMatrix4(m.matrixWorld).sub(headPos);
          if (tmp.y > -0.02 * s) {
            measuredHeadBox.expandByPoint(tmp);
          }
        }
      });
    });

    const headCenter = measuredHeadBox.isEmpty()
      ? new THREE.Vector3(0, 0.098 * s, 0.006 * s)
      : measuredHeadBox.getCenter(new THREE.Vector3());
    const headHalf = measuredHeadBox.isEmpty()
      ? new THREE.Vector3(0.092 * s, 0.102 * s, 0.098 * s)
      : measuredHeadBox.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const headRadiiWithPad = (pad: number) =>
      new THREE.Vector3(headHalf.x + pad * s, headHalf.y + pad * s, headHalf.z + pad * s);

    // Exact-fit scalp crown cap wrapping the measured head mesh with zero skull poke-through
    const crownCapGeo = trackGeo(createCrownPartCapGeometry(s, headCenter, headHalf));
    const crownCap = new THREE.Mesh(crownCapGeo, crownCapHairMat);
    crownCap.castShadow = false;
    headRoot.add(crownCap);
    ctx.originalMeshMaterials.set(crownCap, crownCapHairMat);

    // Parted Top-Crown Feathered Hair Locks (4-point skull-hugging curves + per-vertex ellipsoid clearance)
    const crownLockRadii = headRadiiWithPad(0.0085);
    ([-1, 1] as const).forEach((side) => {
      const crownLockSpecs = [
        { zStart: 0.056, zMid1: 0.052, zMid2: 0.040, zEnd: 0.020, yMid1: 0.204, yMid2: 0.168, yEnd: 0.112, xMid1: 0.052, xMid2: 0.092, xEnd: 0.104, w0: 0.038, w1: 0.024 },
        { zStart: 0.022, zMid1: 0.016, zMid2: 0.004, zEnd: -0.014, yMid1: 0.210, yMid2: 0.172, yEnd: 0.112, xMid1: 0.056, xMid2: 0.096, xEnd: 0.108, w0: 0.044, w1: 0.028 },
        { zStart: -0.016, zMid1: -0.024, zMid2: -0.040, zEnd: -0.056, yMid1: 0.206, yMid2: 0.166, yEnd: 0.106, xMid1: 0.056, xMid2: 0.094, xEnd: 0.106, w0: 0.046, w1: 0.030 },
        { zStart: -0.050, zMid1: -0.064, zMid2: -0.078, zEnd: -0.092, yMid1: 0.194, yMid2: 0.152, yEnd: 0.092, xMid1: 0.048, xMid2: 0.084, xEnd: 0.096, w0: 0.048, w1: 0.032 },
      ];
      crownLockSpecs.forEach((lk) => {
        const pts = [
          new THREE.Vector3(side * 0.006 * s, 0.208 * s, lk.zStart * s),
          new THREE.Vector3(side * lk.xMid1 * s, lk.yMid1 * s, lk.zMid1 * s),
          new THREE.Vector3(side * lk.xMid2 * s, lk.yMid2 * s, lk.zMid2 * s),
          new THREE.Vector3(side * lk.xEnd * s, lk.yEnd * s, lk.zEnd * s),
        ].map((p) => clampPointOutsideEllipsoid(p, headCenter, crownLockRadii));
        const lGeo = trackGeo(
          pushGeometryOutsideEllipsoid(
            createDrapedRibbonGeometry(
              pts,
              (t) => THREE.MathUtils.lerp(lk.w0, lk.w1, t) * s,
              18,
              4,
              new THREE.Vector3(side * 0.55, 0.82, lk.zStart > 0 ? 0.18 : -0.18).normalize(),
              0.22,
            ),
            headCenter,
            crownLockRadii,
          ),
        );
        const lMesh = new THREE.Mesh(lGeo, frontBlondeHairMat);
        lMesh.castShadow = false;
        headRoot.add(lMesh);
        ctx.originalMeshMaterials.set(lMesh, frontBlondeHairMat);
      });
    });

    // Measure the exact forehead surface Z along the centerline so the horn, collar, gem & sigil sit flush on skin (zero floating!)
    const sampleForeheadZ = (yTarget: number, fallbackZ: number): number => {
      let maxZ = -Infinity;
      let found = false;
      sharedFaceNormalMeshes.forEach((meshes) => {
        meshes.forEach((m) => {
          if (!m.visible) return;
          const pAttr = m.geometry.getAttribute('position');
          if (!pAttr) return;
          const tmp = new THREE.Vector3();
          for (let i = 0; i < pAttr.count; i++) {
            tmp.fromBufferAttribute(pAttr, i).applyMatrix4(m.matrixWorld).sub(headPos);
            if (Math.abs(tmp.x) < 0.018 * s && Math.abs(tmp.y - yTarget) < 0.016 * s && tmp.z > headCenter.z) {
              if (tmp.z > maxZ) {
                maxZ = tmp.z;
                found = true;
              }
            }
          }
        });
      });
      return found ? maxZ : fallbackZ;
    };

    const hornRootY = headCenter.y + headHalf.y * 0.34;
    const sigilY = headCenter.y + headHalf.y * 0.21;
    const hornForeheadZ = sampleForeheadZ(hornRootY, headCenter.z + headHalf.z * 0.84);
    const sigilForeheadZ = sampleForeheadZ(sigilY, headCenter.z + headHalf.z * 0.87);

    // Regal Tall, Nearly-Vertical Spiral-Fluted Golden Forehead Spire Horn (seated flush into measured forehead surface!)
    const hornGeo = trackGeo(createSpiralHornGeometry(0.345 * s, 0.0066 * s));
    const hornMesh = new THREE.Mesh(hornGeo, goldFiligreeMat);
    hornMesh.position.set(0, hornRootY, hornForeheadZ - 0.003 * s);
    hornMesh.rotation.x = 0.14;
    hornMesh.castShadow = false;
    headRoot.add(hornMesh);
    ctx.originalMeshMaterials.set(hornMesh, goldFiligreeMat);

    // Sculpted 24K Gold & Sapphire Coronet Base Collar seated flush around horn root
    const hornCollarGeo = trackGeo(new THREE.TorusGeometry(0.0086 * s, 0.0022 * s, 8, 20));
    const hornCollar = new THREE.Mesh(hornCollarGeo, goldFiligreeMat);
    hornCollar.position.set(0, hornRootY + 0.002 * s, hornForeheadZ + 0.0005 * s);
    hornCollar.rotation.x = 0.14 + Math.PI / 2;
    headRoot.add(hornCollar);
    ctx.originalMeshMaterials.set(hornCollar, goldFiligreeMat);

    const hornGemGeo = trackGeo(new THREE.OctahedronGeometry(0.0046 * s, 0));
    hornGemGeo.scale(0.85, 1.5, 0.72);
    const hornGem = new THREE.Mesh(hornGemGeo, blueCrystalMat);
    hornGem.position.set(0, hornRootY + 0.004 * s, hornForeheadZ + 0.0065 * s);
    hornGem.rotation.x = -0.15;
    headRoot.add(hornGem);
    ctx.originalMeshMaterials.set(hornGem, blueCrystalMat);

    // Delicate luminous forehead diamond sigil flush on glabella right below horn root
    const hornBaseGeo = trackGeo(createFourPointStarGeometry(0.0064 * s, 0.0014 * s));
    hornBaseGeo.scale(0.45, 1.55, 1.0);
    const browSigil = new THREE.Mesh(hornBaseGeo, starSparkleMat);
    browSigil.position.set(0, sigilY, sigilForeheadZ + 0.0024 * s);
    headRoot.add(browSigil);
    ctx.originalMeshMaterials.set(browSigil, starSparkleMat);

    // Forehead-Hugging Layered A-Frame Wispy Champagne-Blonde Bangs + Inward Hime Locks + Sky-Aqua Inner Jaw Curtain (Per-Vertex Zero Clipping!)
    const bangRadii = headRadiiWithPad(0.011);
    const himeRadii = headRadiiWithPad(0.012);
    const aquaRadii = headRadiiWithPad(0.010);
    ([-1, 1] as const).forEach((side) => {
      const bangConfigs = [
        // 1. Ultra-fine center whisper needle flanking forehead diamond & clearing glabella cleanly
        {
          pts: [
            new THREE.Vector3(side * 0.006 * s, 0.194 * s, 0.088 * s),
            new THREE.Vector3(side * 0.011 * s, 0.140 * s, 0.111 * s),
            new THREE.Vector3(side * 0.013 * s, 0.096 * s, 0.113 * s),
            new THREE.Vector3(side * 0.008 * s, 0.070 * s, 0.109 * s),
          ],
          w0: 0.011,
          w1: 0.004,
        },
        // 2. Inner-eye silky fringe veil softly framing upper inner brow without poking into face
        {
          pts: [
            new THREE.Vector3(side * 0.014 * s, 0.200 * s, 0.082 * s),
            new THREE.Vector3(side * 0.025 * s, 0.144 * s, 0.110 * s),
            new THREE.Vector3(side * 0.030 * s, 0.098 * s, 0.112 * s),
            new THREE.Vector3(side * 0.025 * s, 0.068 * s, 0.107 * s),
          ],
          w0: 0.019,
          w1: 0.007,
        },
        // 3. Mid-brow feathery strand lightly framing top of iris without blocking gaze
        {
          pts: [
            new THREE.Vector3(side * 0.024 * s, 0.204 * s, 0.072 * s),
            new THREE.Vector3(side * 0.042 * s, 0.146 * s, 0.107 * s),
            new THREE.Vector3(side * 0.049 * s, 0.098 * s, 0.109 * s),
            new THREE.Vector3(side * 0.045 * s, 0.068 * s, 0.104 * s),
          ],
          w0: 0.023,
          w1: 0.0085,
        },
        // 4. Outer-eye wispy sweep curving gracefully past winged eyeliner
        {
          pts: [
            new THREE.Vector3(side * 0.038 * s, 0.202 * s, 0.062 * s),
            new THREE.Vector3(side * 0.062 * s, 0.140 * s, 0.102 * s),
            new THREE.Vector3(side * 0.072 * s, 0.088 * s, 0.103 * s),
            new THREE.Vector3(side * 0.070 * s, 0.048 * s, 0.098 * s),
          ],
          w0: 0.027,
          w1: 0.011,
        },
        // 5. Outer canopy curtain bridging bangs seamlessly into temple Hime locks (clears cheekbones!)
        {
          pts: [
            new THREE.Vector3(side * 0.052 * s, 0.196 * s, 0.048 * s),
            new THREE.Vector3(side * 0.084 * s, 0.130 * s, 0.092 * s),
            new THREE.Vector3(side * 0.095 * s, 0.068 * s, 0.094 * s),
            new THREE.Vector3(side * 0.086 * s, 0.008 * s, 0.088 * s),
          ],
          w0: 0.033,
          w1: 0.015,
        },
        // 6. Lush side-temple A-frame layer framing upper cheeks cleanly outside skull
        {
          pts: [
            new THREE.Vector3(side * 0.066 * s, 0.186 * s, 0.030 * s),
            new THREE.Vector3(side * 0.098 * s, 0.114 * s, 0.076 * s),
            new THREE.Vector3(side * 0.106 * s, 0.046 * s, 0.080 * s),
            new THREE.Vector3(side * 0.092 * s, -0.024 * s, 0.076 * s),
          ],
          w0: 0.037,
          w1: 0.017,
        },
      ];

      bangConfigs.forEach((cfg) => {
        const clampedPts = cfg.pts.map((p) => clampPointOutsideEllipsoid(p, headCenter, bangRadii));
        const bGeo = trackGeo(
          pushGeometryOutsideEllipsoid(
            createDrapedRibbonGeometry(
              clampedPts,
              (t) => THREE.MathUtils.lerp(cfg.w0, cfg.w1, Math.pow(t, 1.2)) * s,
              22,
              5,
              new THREE.Vector3(side * 0.28, 0.05, 0.96),
              0.3,
            ),
            headCenter,
            bangRadii,
          ),
        );
        const bMesh = new THREE.Mesh(bGeo, frontBlondeHairMat);
        bMesh.castShadow = false;
        headRoot.add(bMesh);
        ctx.originalMeshMaterials.set(bMesh, frontBlondeHairMat);
      });

      // Signature Inward-Curving Hime Cheek & Chin-Hugging Blonde Side-Locks (clears cheekbones, ears & jaw cleanly!)
      const himeShortPts = [
        new THREE.Vector3(side * 0.084 * s, 0.162 * s, 0.028 * s),
        new THREE.Vector3(side * 0.112 * s, 0.074 * s, 0.066 * s),
        new THREE.Vector3(side * 0.102 * s, -0.004 * s, 0.078 * s),
        new THREE.Vector3(side * 0.068 * s, -0.054 * s, 0.078 * s),
      ].map((p) => clampPointOutsideEllipsoid(p, headCenter, himeRadii));
      const himeShortGeo = trackGeo(
        pushGeometryOutsideEllipsoid(
          createDrapedRibbonGeometry(
            himeShortPts,
            (t) => (0.04 - Math.pow(t, 1.35) * 0.022) * s,
            24,
            5,
            new THREE.Vector3(side * 0.65, 0, 0.76),
            0.32,
          ),
          headCenter,
          himeRadii,
        ),
      );
      const himeShort = new THREE.Mesh(himeShortGeo, frontBlondeHairMat);
      himeShort.castShadow = false;
      headRoot.add(himeShort);
      extraAnimatedNodes.hairLocks.push(himeShort);
      ctx.originalMeshMaterials.set(himeShort, frontBlondeHairMat);

      const himeLongPts = [
        new THREE.Vector3(side * 0.092 * s, 0.152 * s, 0.006 * s),
        new THREE.Vector3(side * 0.120 * s, 0.038 * s, 0.044 * s),
        new THREE.Vector3(side * 0.112 * s, -0.068 * s, 0.054 * s),
        new THREE.Vector3(side * 0.094 * s, -0.172 * s, 0.046 * s),
      ].map((p) => clampPointOutsideEllipsoid(p, headCenter, himeRadii));
      const himeLongGeo = trackGeo(
        pushGeometryOutsideEllipsoid(
          createDrapedRibbonGeometry(
            himeLongPts,
            (t) => (0.044 - Math.pow(t, 1.3) * 0.024) * s,
            24,
            5,
            new THREE.Vector3(side * 0.72, 0, 0.68),
            0.28,
          ),
          headCenter,
          himeRadii,
        ),
      );
      const himeLong = new THREE.Mesh(himeLongGeo, frontBlondeHairMat);
      himeLong.castShadow = false;
      headRoot.add(himeLong);
      extraAnimatedNodes.hairLocks.push(himeLong);
      ctx.originalMeshMaterials.set(himeLong, frontBlondeHairMat);

      // Iconic Vivid Sky-Aqua Inner Hair Collar routed cleanly BEHIND the 3D elf ears & neck (zero ear clipping!)
      const aquaCollarPts = [
        new THREE.Vector3(side * 0.088 * s, 0.108 * s, -0.026 * s),
        new THREE.Vector3(side * 0.108 * s, 0.006 * s, -0.012 * s),
        new THREE.Vector3(side * 0.104 * s, -0.090 * s, -0.004 * s),
        new THREE.Vector3(side * 0.088 * s, -0.164 * s, -0.008 * s),
      ].map((p) => clampPointOutsideEllipsoid(p, headCenter, aquaRadii));
      const aquaCollarGeo = trackGeo(
        pushGeometryOutsideEllipsoid(
          createDrapedRibbonGeometry(
            aquaCollarPts,
            (t) => (0.048 + Math.sin(t * Math.PI) * 0.016 - Math.pow(t, 1.6) * 0.02) * s,
            22,
            5,
            new THREE.Vector3(side * 0.35, 0, 0.94),
            0.24,
          ),
          headCenter,
          aquaRadii,
        ),
      );
      const aquaCollar = new THREE.Mesh(aquaCollarGeo, innerAquaStrandMat);
      aquaCollar.castShadow = false;
      headRoot.add(aquaCollar);
      extraAnimatedNodes.hairLocks.push(aquaCollar);
      ctx.originalMeshMaterials.set(aquaCollar, innerAquaStrandMat);

      // Delicate Wind-Swept Gossamer Cheek & Shoulder Flyaway Strands (飄逸飛散細碎髮絲，增添空氣感與靈動感)
      const flyawaySpecs = [
        {
          pts: [
            new THREE.Vector3(side * 0.082 * s, 0.146 * s, 0.048 * s),
            new THREE.Vector3(side * 0.118 * s, 0.056 * s, 0.076 * s),
            new THREE.Vector3(side * 0.132 * s, -0.044 * s, 0.068 * s),
            new THREE.Vector3(side * 0.158 * s, -0.142 * s, 0.046 * s),
          ],
          w0: 0.015,
          w1: 0.0045,
          mat: frontBlondeHairMat,
        },
        {
          pts: [
            new THREE.Vector3(side * 0.094 * s, 0.124 * s, 0.016 * s),
            new THREE.Vector3(side * 0.134 * s, 0.014 * s, 0.036 * s),
            new THREE.Vector3(side * 0.148 * s, -0.106 * s, 0.022 * s),
            new THREE.Vector3(side * 0.172 * s, -0.228 * s, 0.004 * s),
          ],
          w0: 0.017,
          w1: 0.005,
          mat: frontBlondeHairMat,
        },
        {
          pts: [
            new THREE.Vector3(side * 0.092 * s, 0.092 * s, -0.022 * s),
            new THREE.Vector3(side * 0.128 * s, -0.022 * s, -0.006 * s),
            new THREE.Vector3(side * 0.142 * s, -0.132 * s, -0.012 * s),
            new THREE.Vector3(side * 0.162 * s, -0.236 * s, -0.026 * s),
          ],
          w0: 0.014,
          w1: 0.004,
          mat: innerAquaStrandMat,
        },
      ];
      flyawaySpecs.forEach((fw) => {
        const fwPts = fw.pts.map((p) => clampPointOutsideEllipsoid(p, headCenter, himeRadii));
        const fwGeo = trackGeo(
          pushGeometryOutsideEllipsoid(
            createDrapedRibbonGeometry(
              fwPts,
              (t) => THREE.MathUtils.lerp(fw.w0, fw.w1, Math.pow(t, 1.15)) * s,
              24,
              4,
              new THREE.Vector3(side * 0.62, 0.12, 0.78).normalize(),
              0.24,
            ),
            headCenter,
            himeRadii,
          ),
        );
        const fwMesh = new THREE.Mesh(fwGeo, fw.mat);
        fwMesh.castShadow = false;
        headRoot.add(fwMesh);
        extraAnimatedNodes.hairLocks.push(fwMesh);
        ctx.originalMeshMaterials.set(fwMesh, fw.mat);
      });

      // Solid 3D Eyeball Backing Core behind sclera (guarantees zero hollowness from any camera angle or expression)
      const eyeballBackMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          name: `Fleurdelys_EyeballBack_${side === 1 ? 'L' : 'R'}`,
          color: 0xf4f7fc,
          emissive: 0xdbeafe,
          emissiveIntensity: 0.1,
          roughness: 0.22,
          metalness: 0.0,
        }),
      );
      const eyeballBackGeo = trackGeo(new THREE.SphereGeometry(0.016 * s, 16, 12));
      const eyeballBack = new THREE.Mesh(eyeballBackGeo, eyeballBackMat);
      eyeballBack.name = side === 1 ? 'Fleurdelys_EyeballBack_L' : 'Fleurdelys_EyeballBack_R';
      eyeballBack.position.set(side * 0.040 * s, 0.064 * s, 0.058 * s);
      eyeballBack.castShadow = false;
      eyeballBack.receiveShadow = false;
      headRoot.add(eyeballBack);
      ctx.originalMeshMaterials.set(eyeballBack, eyeballBackMat);

      // True Multi-Part Sculptural 3D Anatomical Elven Ear Assembly (Pinna Shell + Rolled Outer Helix Rim + Antihelix Y-Ridge + Tragus + Plump Earlobe)
      const earAssembly = new THREE.Group();
      earAssembly.name = side === 1 ? 'Fleurdelys_ElfEarAssembly_L' : 'Fleurdelys_ElfEarAssembly_R';
      earAssembly.position.set(side * 0.068 * s, 0.055 * s, 0.008 * s);
      earAssembly.rotation.set(0.04, side * -0.14, side * 0.05);

      const earGeo = trackGeo(createElfEarGeometry(side, s));
      const earMesh = new THREE.Mesh(earGeo, earSkinMat);
      earMesh.name = side === 1 ? 'Fleurdelys_ElfEar_L' : 'Fleurdelys_ElfEar_R';
      earMesh.castShadow = true;
      earMesh.receiveShadow = true;
      earAssembly.add(earMesh);
      ctx.originalMeshMaterials.set(earMesh, earSkinMat);

      // 1) Distinct 3D Rolled Outer Helix Rim Tube (立體外耳輪軟骨卷邊)
      const helixCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.004 * s, 0.006 * s, 0.008 * s),
        new THREE.Vector3(side * 0.018 * s, 0.024 * s, 0.005 * s),
        new THREE.Vector3(side * 0.044 * s, 0.027 * s, -0.005 * s),
        new THREE.Vector3(side * 0.076 * s, 0.022 * s, -0.024 * s),
        new THREE.Vector3(side * 0.048 * s, 0.002 * s, -0.009 * s),
        new THREE.Vector3(side * 0.022 * s, -0.017 * s, 0.002 * s),
        new THREE.Vector3(side * 0.008 * s, -0.024 * s, 0.008 * s),
      ]);
      const helixGeo = trackGeo(new THREE.TubeGeometry(helixCurve, 28, 0.0036 * s, 10, false));
      const helixMesh = new THREE.Mesh(helixGeo, earSkinMat);
      helixMesh.name = side === 1 ? 'Fleurdelys_EarHelix_L' : 'Fleurdelys_EarHelix_R';
      helixMesh.castShadow = true;
      helixMesh.receiveShadow = true;
      earAssembly.add(helixMesh);
      ctx.originalMeshMaterials.set(helixMesh, earSkinMat);

      // 2) Distinct 3D Antihelix Inner Cartilage Ridge (立體對耳輪脊)
      const antihelixCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.014 * s, -0.014 * s, 0.006 * s),
        new THREE.Vector3(side * 0.026 * s, -0.002 * s, 0.001 * s),
        new THREE.Vector3(side * 0.036 * s, 0.013 * s, -0.004 * s),
        new THREE.Vector3(side * 0.018 * s, 0.016 * s, 0.002 * s),
      ]);
      const antihelixGeo = trackGeo(new THREE.TubeGeometry(antihelixCurve, 18, 0.0026 * s, 8, false));
      const antihelixMesh = new THREE.Mesh(antihelixGeo, earSkinMat);
      antihelixMesh.name = side === 1 ? 'Fleurdelys_EarAntihelix_L' : 'Fleurdelys_EarAntihelix_R';
      antihelixMesh.castShadow = true;
      antihelixMesh.receiveShadow = true;
      earAssembly.add(antihelixMesh);
      ctx.originalMeshMaterials.set(antihelixMesh, earSkinMat);

      // 3) Distinct 3D Tragus Cartilage Flap & Plump Rounded Earlobe (立體耳屏與圓潤耳垂)
      const tragusGeo = trackGeo(new THREE.SphereGeometry(0.0052 * s, 12, 10));
      tragusGeo.scale(0.7, 1.15, 0.85);
      const tragusMesh = new THREE.Mesh(tragusGeo, earSkinMat);
      tragusMesh.name = side === 1 ? 'Fleurdelys_EarTragus_L' : 'Fleurdelys_EarTragus_R';
      tragusMesh.position.set(side * 0.004 * s, -0.005 * s, 0.011 * s);
      tragusMesh.castShadow = true;
      tragusMesh.receiveShadow = true;
      earAssembly.add(tragusMesh);
      ctx.originalMeshMaterials.set(tragusMesh, earSkinMat);

      const lobeGeo = trackGeo(new THREE.SphereGeometry(0.0092 * s, 14, 12));
      lobeGeo.scale(0.82, 1.12, 0.78);
      const lobeMesh = new THREE.Mesh(lobeGeo, earSkinMat);
      lobeMesh.name = side === 1 ? 'Fleurdelys_EarLobe_L' : 'Fleurdelys_EarLobe_R';
      lobeMesh.position.set(side * 0.012 * s, -0.022 * s, 0.007 * s);
      lobeMesh.castShadow = true;
      lobeMesh.receiveShadow = true;
      earAssembly.add(lobeMesh);
      ctx.originalMeshMaterials.set(lobeMesh, earSkinMat);

      headRoot.add(earAssembly);

      // Tiered Gold Chain, Sapphire Stud & 4-Point Luminous Star Drop Earring seated flush on ear lobe
      const earringGroup = new THREE.Group();
      earringGroup.position.set(side * 0.080 * s, 0.031 * s, 0.014 * s);
      const earStud = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.0044 * s, 0)), blueCrystalMat);
      earringGroup.add(earStud);
      ctx.originalMeshMaterials.set(earStud, blueCrystalMat);

      const earChain = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0009 * s, 0.0009 * s, 0.022 * s, 6)), goldFiligreeMat);
      earChain.position.set(0, -0.012 * s, 0);
      earringGroup.add(earChain);
      ctx.originalMeshMaterials.set(earChain, goldFiligreeMat);

      const earStarGeo = trackGeo(createFourPointStarGeometry(0.0145 * s, 0.0026 * s));
      const earStar = new THREE.Mesh(earStarGeo, starSparkleMat);
      earStar.position.set(0, -0.026 * s, 0);
      earringGroup.add(earStar);
      ctx.originalMeshMaterials.set(earStar, starSparkleMat);
      headRoot.add(earringGroup);

      // 3 Graduated Floating Luminous 4-Point Star Sparkles neatly beneath each elongated elf ear tip
      for (let k = 0; k < 3; k++) {
        const spRadius = (0.0125 - k * 0.0029) * s;
        const spGeo = trackGeo(createFourPointStarGeometry(spRadius, 0.0014 * s));
        const spMesh = new THREE.Mesh(spGeo, starSparkleMat);
        spMesh.position.set(
          side * (0.118 + k * 0.022) * s,
          (0.048 - k * 0.006) * s,
          (0.034 - k * 0.008) * s,
        );
        headRoot.add(spMesh);
        extraAnimatedNodes.starSparkles.push(spMesh);
        ctx.originalMeshMaterials.set(spMesh, starSparkleMat);
      }
    });

    // Iconic Floating Dual Cobalt-Sapphire Crystalline Thorn Antler Crown (bold front-visible jagged silhouette matching Reference 2!)
    const crownGroup = new THREE.Group();
    crownGroup.name = 'Fleurdelys_ThornCrown';
    crownGroup.position.set(0, 0.175 * s, 0.012 * s);

    ([-1, 1] as const).forEach((side) => {
      // Main sleek crystalline antler-thorn branch hovering cleanly above each temple (refined proportion matching Reference 2)
      const arcPts = [
        new THREE.Vector3(side * 0.044 * s, 0.010 * s, 0.044 * s),
        new THREE.Vector3(side * 0.102 * s, 0.030 * s, 0.020 * s),
        new THREE.Vector3(side * 0.162 * s, 0.038 * s, -0.014 * s),
        new THREE.Vector3(side * 0.196 * s, 0.018 * s, -0.052 * s),
        new THREE.Vector3(side * 0.146 * s, -0.010 * s, -0.104 * s),
      ];
      const arcCurve = new THREE.CatmullRomCurve3(arcPts);
      const branchGeo = trackGeo(new THREE.TubeGeometry(arcCurve, 32, 0.0060 * s, 6, false));
      const branchMesh = new THREE.Mesh(branchGeo, blueCrystalMat);
      branchMesh.castShadow = false;
      crownGroup.add(branchMesh);
      ctx.originalMeshMaterials.set(branchMesh, blueCrystalMat);

      // Secondary lower intertwined crystalline thorn branch for layered jagged crown depth
      const lowerArcPts = [
        new THREE.Vector3(side * 0.064 * s, -0.005 * s, 0.032 * s),
        new THREE.Vector3(side * 0.132 * s, 0.004 * s, 0.002 * s),
        new THREE.Vector3(side * 0.184 * s, -0.007 * s, -0.034 * s),
      ];
      const lowerArcCurve = new THREE.CatmullRomCurve3(lowerArcPts);
      const lowerBranchGeo = trackGeo(new THREE.TubeGeometry(lowerArcCurve, 22, 0.0038 * s, 5, false));
      const lowerBranch = new THREE.Mesh(lowerBranchGeo, blueCrystalMat);
      crownGroup.add(lowerBranch);
      ctx.originalMeshMaterials.set(lowerBranch, blueCrystalMat);

      // Dramatic curved faceted crystal thorn spires jutting upward & outward
      const thornSpecs = [
        { t: 0.18, dir: new THREE.Vector3(side * 0.32, 0.92, 0.22), len: 0.056, rad: 0.0058 },
        { t: 0.38, dir: new THREE.Vector3(side * 0.68, 0.72, 0.12), len: 0.070, rad: 0.0066 },
        { t: 0.58, dir: new THREE.Vector3(side * 0.88, 0.48, -0.08), len: 0.064, rad: 0.0060 },
        { t: 0.78, dir: new THREE.Vector3(side * 0.92, 0.22, -0.28), len: 0.052, rad: 0.0050 },
        { t: 0.48, dir: new THREE.Vector3(side * 0.55, -0.68, 0.14), len: 0.036, rad: 0.0042 },
      ];
      thornSpecs.forEach((sp, tIdx) => {
        const pt = arcCurve.getPointAt(sp.t);
        const thornGeo = trackGeo(new THREE.ConeGeometry(sp.rad * s, sp.len * s, 5));
        thornGeo.translate(0, (sp.len * s) / 2, 0);
        const thorn = new THREE.Mesh(thornGeo, blueCrystalMat);
        thorn.position.copy(pt);
        thorn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sp.dir.clone().normalize());
        crownGroup.add(thorn);
        ctx.originalMeshMaterials.set(thorn, blueCrystalMat);

        if (tIdx === 1 || tIdx === 3) {
          const dropGeo = trackGeo(new THREE.OctahedronGeometry(0.0072 * s, 0));
          dropGeo.scale(0.7, 1.55, 0.7);
          const drop = new THREE.Mesh(dropGeo, starSparkleMat);
          drop.position.set(pt.x, pt.y - 0.024 * s, pt.z);
          crownGroup.add(drop);
          extraAnimatedNodes.starSparkles.push(drop);
          ctx.originalMeshMaterials.set(drop, starSparkleMat);
        }
      });
    });

    headRoot.add(crownGroup);
    extraAnimatedNodes.crownGroup = crownGroup;

    attachToBoneWorld(humanoidBones.head, headRoot, headPos);
  }

  // ==================== 4. SKINNED TWO-TONE WIDE A-LINE BACK HAIR CURTAIN (MATCHING IN-GAME SILHOUETTE) ====================
  if (bodySkinnedMesh) {
    const skMesh = bodySkinnedMesh;
    const resolveHairWeights = (_vx: number, vy: number, _vz: number): Array<[number, number]> => {
      if (vy >= 1.48) return [[jHead, 1.0]];
      if (vy >= 1.38) {
        const t = (vy - 1.38) / 0.1;
        return [
          [jHead, t],
          [jUpperChest, 1 - t],
        ];
      }
      if (vy >= 1.2) {
        const t = (vy - 1.2) / 0.18;
        return [
          [jUpperChest, t],
          [jChest, 1 - t],
        ];
      }
      if (vy >= 0.96) {
        const t = (vy - 0.96) / 0.24;
        return [
          [jChest, t],
          [jSpine, 1 - t],
        ];
      }
      return [
        [jSpine, 0.55],
        [jHips, 0.45],
      ];
    };

    // Outer Champagne-Blonde Back Strands (25 ultra-fine, gracefully S-curved billowing strands flowing in a cathedral breeze)
    const outerHairCount = 25;
    for (let i = 0; i < outerHairCount; i++) {
      const f = (i / (outerHairCount - 1)) * 2 - 1; // -1 to 1
      const xRoot = f * 0.116;
      const zRoot = 0.105 - Math.abs(f) * 0.036; // raw +Z = cleanly behind cranium
      const len = 0.88 - Math.abs(f) * 0.09 + Math.sin(i * 2.3) * 0.035;
      const wingSpread = 1.0 + Math.pow(Math.abs(f), 0.70) * 0.56;
      const swayA = Math.sin(i * 1.55) * 0.024;
      const swayB = Math.cos(i * 1.95) * 0.032;
      const pts = [
        new THREE.Vector3(xRoot, 1.618, zRoot),
        new THREE.Vector3(xRoot * (1.82 * wingSpread) + swayA * 0.4, 1.618 - len * 0.24, zRoot + 0.072),
        new THREE.Vector3(xRoot * (2.48 * wingSpread) + swayA, 1.618 - len * 0.52, zRoot + 0.118 + Math.sin(i * 1.2) * 0.012),
        new THREE.Vector3(xRoot * (2.94 * wingSpread) - swayB * 0.7, 1.618 - len * 0.78, zRoot + 0.148 + Math.cos(i * 1.5) * 0.014),
        new THREE.Vector3(xRoot * (3.28 * wingSpread) + swayB, 1.618 - len, zRoot + 0.172),
      ];
      const lockGeo = trackGeo(
        createDrapedRibbonGeometry(
          pts,
          (t) => (0.048 + Math.sin(t * Math.PI * 0.82) * 0.013 - Math.pow(t, 1.48) * 0.028),
          32,
          5,
          new THREE.Vector3(f * 0.18, 0.06, 0.98).normalize(),
          0.28,
        ),
      );
      const skinnedLock = bindGeometryWithCustomWeights(
        lockGeo,
        hairStrandMat,
        `Fleurdelys_BackHairOuter_${i}`,
        skMesh,
        resolveHairWeights,
      );
      registerSkinnedCouture(skinnedLock, hairStrandMat, false, true);
    }

    // Inner Vivid Sky-Aqua Underside Curtain Layer (19 finely feathered luminous inner locks clearing nape, ears & back bodice)
    const innerHairCount = 19;
    for (let i = 0; i < innerHairCount; i++) {
      const f = (i / (innerHairCount - 1)) * 2 - 1;
      const xRoot = f * 0.108;
      const zRoot = 0.095 - Math.abs(f) * 0.028;
      const len = 0.82 - Math.abs(f) * 0.08 + Math.cos(i * 2.1) * 0.03;
      const wingSpread = 1.0 + Math.pow(Math.abs(f), 0.74) * 0.48;
      const pts = [
        new THREE.Vector3(xRoot, 1.548, zRoot),
        new THREE.Vector3(xRoot * (1.74 * wingSpread), 1.548 - len * 0.25, zRoot + 0.062),
        new THREE.Vector3(xRoot * (2.38 * wingSpread) + Math.cos(i * 1.6) * 0.02, 1.548 - len * 0.56, zRoot + 0.102),
        new THREE.Vector3(xRoot * (2.82 * wingSpread) - Math.sin(i * 1.9) * 0.022, 1.548 - len * 0.80, zRoot + 0.128),
        new THREE.Vector3(xRoot * (3.08 * wingSpread) + Math.sin(i * 2.2) * 0.026, 1.548 - len, zRoot + 0.148),
      ];
      const innerGeo = trackGeo(
        createDrapedRibbonGeometry(
          pts,
          (t) => (0.044 + Math.sin(t * Math.PI * 0.78) * 0.011 - Math.pow(t, 1.48) * 0.025),
          28,
          4,
          new THREE.Vector3(f * 0.14, 0.05, 0.99).normalize(),
          0.25,
        ),
      );
      const skinnedInner = bindGeometryWithCustomWeights(
        innerGeo,
        innerAquaStrandMat,
        `Fleurdelys_BackHairInner_${i}`,
        skMesh,
        resolveHairWeights,
      );
      registerSkinnedCouture(skinnedInner, innerAquaStrandMat, false, true);
    }

    // 10 Gossamer Wind-Caught Rear Accent Wisps (飄逸飛揚長髮絲，讓背面與側面剪影極具流動感)
    const wispCount = 10;
    for (let i = 0; i < wispCount; i++) {
      const f = (i / (wispCount - 1)) * 2 - 1;
      const isAqua = i % 3 === 1;
      const xRoot = f * 0.118;
      const zRoot = 0.108 - Math.abs(f) * 0.032;
      const len = 0.76 + (i % 3) * 0.08;
      const flare = 1.0 + Math.abs(f) * 0.75;
      const pts = [
        new THREE.Vector3(xRoot, 1.59, zRoot),
        new THREE.Vector3(xRoot * 2.1 * flare + Math.sin(i * 2.4) * 0.028, 1.59 - len * 0.28, zRoot + 0.095),
        new THREE.Vector3(xRoot * 3.05 * flare - Math.cos(i * 2.1) * 0.042, 1.59 - len * 0.62, zRoot + 0.168),
        new THREE.Vector3(xRoot * 3.65 * flare + Math.sin(i * 1.7) * 0.055, 1.59 - len, zRoot + 0.228),
      ];
      const wispGeo = trackGeo(
        createDrapedRibbonGeometry(
          pts,
          (t) => 0.018 * (1.0 - Math.pow(t, 1.2) * 0.74),
          28,
          4,
          new THREE.Vector3(f * 0.32, 0.14, 0.94).normalize(),
          0.22,
        ),
      );
      const wMat = isAqua ? innerAquaStrandMat : hairStrandMat;
      const skinnedWisp = bindGeometryWithCustomWeights(
        wispGeo,
        wMat,
        `Fleurdelys_BackHairWisp_${i}`,
        skMesh,
        resolveHairWeights,
      );
      registerSkinnedCouture(skinnedWisp, wMat, false, true);
    }
  }

  // ==================== 5. POSE-SYNCHRONIZED SKINNED COUTURE ATTIRE (ZERO CLIPPING!) ====================
  if (bodySkinnedMesh) {
    const skMesh = bodySkinnedMesh;
    // 5A. Skin-Tight Choker & Gold Keyhole Collar (bound directly to Neck/UpperChest, zero neck gap)
    const chokerGeo = trackGeo(
      createRawBodyConformingShellGeometry(
        rawNeckSamples.length > 10 ? rawNeckSamples : rawTorsoSamples,
        1.414,
        1.472,
        -Math.PI,
        Math.PI,
        0.0026,
        undefined,
        10,
        28,
      ),
    );
    const skinnedChoker = bindGeometryToBodySkeleton(
      chokerGeo,
      satinObsidianMat,
      'Fleurdelys_Choker',
      skMesh,
      rawNeckSamples.length > 10 ? rawNeckSamples : rawTorsoSamples,
      neckAllowedJoints,
      jNeck,
    );
    registerSkinnedCouture(skinnedChoker, satinObsidianMat);

    // Choker top & bottom 24K gold trims + front keyhole clasp ring (exact world delta from Neck bone)
    if (humanoidBones.neck) {
      const neckTrimRoot = new THREE.Group();
      neckTrimRoot.name = 'Fleurdelys_NeckGoldTrim';
      [1.471, 1.415].forEach((yr, idx) => {
        const ringPts: THREE.Vector3[] = [];
        const src = rawNeckSamples.length > 10 ? rawNeckSamples : rawTorsoSamples;
        const cz = computeTorsoCenterlineZ(src, yr);
        for (let k = 0; k <= 28; k++) {
          const th = (k / 28) * Math.PI * 2;
          const p = sampleRawBodySurfaceTight(src, yr, th, 0.0034, cz);
          ringPts.push(rawToWorld(p.x, p.y, p.z).sub(neckPos));
        }
        const rGeo = trackGeo(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringPts, true), 32, (idx === 0 ? 0.0019 : 0.0022) * s, 6, true),
        );
        const rMesh = new THREE.Mesh(rGeo, goldFiligreeMat);
        neckTrimRoot.add(rMesh);
        ctx.originalMeshMaterials.set(rMesh, goldFiligreeMat);
      });

      const surfFront = sampleRawBodySurfaceTight(rawNeckSamples.length > 10 ? rawNeckSamples : rawTorsoSamples, 1.446, 0, 0.0044);
      const keyholePos = rawToWorld(surfFront.x, surfFront.y, surfFront.z).sub(neckPos);
      const keyholeGeo = trackGeo(new THREE.TorusGeometry(0.0074 * s, 0.0019 * s, 8, 20));
      const keyhole = new THREE.Mesh(keyholeGeo, goldFiligreeMat);
      keyhole.position.copy(keyholePos);
      neckTrimRoot.add(keyhole);
      ctx.originalMeshMaterials.set(keyhole, goldFiligreeMat);

      // Faceted sapphire cabochon seated inside choker keyhole ring
      const chokerGemGeo = trackGeo(new THREE.OctahedronGeometry(0.0044 * s, 0));
      chokerGemGeo.scale(0.85, 1.35, 0.7);
      const chokerGem = new THREE.Mesh(chokerGemGeo, blueCrystalMat);
      chokerGem.position.set(keyholePos.x, keyholePos.y, keyholePos.z + 0.0016 * s);
      neckTrimRoot.add(chokerGem);
      ctx.originalMeshMaterials.set(chokerGem, blueCrystalMat);

      attachToBoneWorld(humanoidBones.neck, neckTrimRoot, neckPos);
    }

    // 5B. Upper Back & Ribcage Obsidian Bodice (clean layer separation from WaistCorset, zero Z-fighting)
    const backBodiceGeo = trackGeo(
      createRawBodyConformingShellGeometry(
        rawTorsoSamples,
        1.192,
        1.324,
        Math.PI * 0.44,
        Math.PI * 1.56,
        0.0038,
        (v) => v * 0.14,
        18,
        32,
      ),
    );
    const skinnedBackBodice = bindGeometryToBodySkeleton(
      backBodiceGeo,
      satinObsidianMat,
      'Fleurdelys_BackBodice',
      skMesh,
      rawTorsoSamples,
      torsoAllowedJoints,
      jUpperChest,
    );
    registerSkinnedCouture(skinnedBackBodice, satinObsidianMat);

    // 5C. Symmetrical Anatomical Satin Bust Cups Hugging Tightly Onto Unified Sculpted Body_00_SKIN + Refined Silk Lace Petals
    ([-1, 1] as const).forEach((side) => {
      const cupGeo = trackGeo(createRawAnatomicalBustCupGeometry(rawTorsoSamples, side, 0.0030));
      const skinnedCup = bindGeometryToBodySkeleton(
        cupGeo,
        satinObsidianMat,
        `Fleurdelys_BustCup_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jUpperChest,
      );
      registerSkinnedCouture(skinnedCup, satinObsidianMat);

      // Delicate flat couture ice-white lace petals hugging smoothly along upper cup rim (zero spiky cones!)
      for (let f = 0; f < 6; f++) {
        const uRim = f / 5;
        const thetaRim = THREE.MathUtils.lerp(side * 0.46, side * 1.46, uRim);
        const yRimRaw = THREE.MathUtils.lerp(1.236, 1.302, Math.pow(uRim, 0.72)) + Math.sin(uRim * Math.PI) * 0.009;
        const cz = computeTorsoCenterlineZ(rawTorsoSamples, yRimRaw);
        const pSurf = sampleRawBodySurfaceTight(rawTorsoSamples, yRimRaw, thetaRim, 0.0036, cz);

        const featherGeo = trackGeo(new THREE.ConeGeometry(0.0082 - f * 0.0004, 0.023 + (f % 2) * 0.004, 5));
        featherGeo.scale(1.18, 1.0, 0.14);
        featherGeo.rotateX(-0.14);
        featherGeo.rotateY(side * (-0.28 - uRim * 0.44));
        featherGeo.rotateZ(side * (-0.24 - uRim * 0.30));
        featherGeo.translate(pSurf.x, pSurf.y + 0.0025, pSurf.z);

        const skinnedFeather = bindGeometryToBodySkeleton(
          featherGeo,
          featherTrimMat,
          `Fleurdelys_CupFeather_${side === 1 ? 'R' : 'L'}_${f}`,
          skMesh,
          rawTorsoSamples,
          torsoAllowedJoints,
          jUpperChest,
        );
        registerSkinnedCouture(skinnedFeather, featherTrimMat, false, true);
      }

      // Sleek Shoulder Harness Strap curving flush from back bodice to shoulder clasp ring
      const strapPtsRaw = [
        sampleRawBodySurfaceTight(rawTorsoSamples, 1.392, side * 0.85, 0.0040),
        sampleRawBodySurfaceTight(rawTorsoSamples, 1.355, side * 0.56, 0.0042),
        sampleRawBodySurfaceTight(rawTorsoSamples, 1.325, side * 0.5, 0.0046),
      ];
      const strapGeo = trackGeo(
        createDrapedRibbonGeometry(strapPtsRaw, () => 0.0115, 14, 3, new THREE.Vector3(0, 0.3, -1), 0.10),
      );
      const skinnedStrap = bindGeometryToBodySkeleton(
        strapGeo,
        satinObsidianMat,
        `Fleurdelys_HarnessStrap_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jUpperChest,
      );
      registerSkinnedCouture(skinnedStrap, satinObsidianMat);
    });

    // 5D. Snug Waist Hourglass Corset + 24K Gold Piping & Sleek Diamond Belt (clean 1.2mm layer step outside BackBodice!)
    const corsetGeo = trackGeo(
      createRawBodyConformingShellGeometry(
        rawTorsoSamples,
        0.978,
        1.198,
        Math.PI * 0.15,
        Math.PI * 1.85,
        0.0050,
        (v) => Math.sin(v * Math.PI) * 0.125,
        20,
        44,
      ),
    );
    const skinnedCorset = bindGeometryToBodySkeleton(
      corsetGeo,
      satinObsidianMat,
      'Fleurdelys_WaistCorset',
      skMesh,
      rawTorsoSamples,
      torsoAllowedJoints,
      jSpine,
    );
    registerSkinnedCouture(skinnedCorset, satinObsidianMat);

    // Gold Keyhole Borders + Sleek Waist Belt Tube + Flush Diamond Studs (all skinned directly to Spine/Hips!)
    ([-1, 1] as const).forEach((side) => {
      const pipePts: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const v = k / 12;
        const yr = THREE.MathUtils.lerp(0.985, 1.196, v);
        const theta = side * (Math.PI * 0.15 + Math.sin(v * Math.PI) * 0.125);
        pipePts.push(sampleRawBodySurfaceTight(rawTorsoSamples, yr, theta, 0.0058));
      }
      const pipeGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pipePts), 22, 0.0021, 6, false));
      const skinnedPipe = bindGeometryToBodySkeleton(
        pipeGeo,
        goldFiligreeMat,
        `Fleurdelys_CorsetGoldPipe_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jSpine,
      );
      registerSkinnedCouture(skinnedPipe, goldFiligreeMat, false, true);
    });

    const beltPts: THREE.Vector3[] = [];
    const beltCz = computeTorsoCenterlineZ(rawTorsoSamples, 1.08);
    for (let k = 0; k <= 32; k++) {
      const th = (k / 32) * Math.PI * 2;
      beltPts.push(sampleRawBodySurfaceTight(rawTorsoSamples, 1.08, th, 0.0068, beltCz));
    }
    const beltGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true), 36, 0.0038, 6, true));
    const skinnedBelt = bindGeometryToBodySkeleton(
      beltGeo,
      satinObsidianMat,
      'Fleurdelys_WaistBelt',
      skMesh,
      rawTorsoSamples,
      torsoAllowedJoints,
      jSpine,
    );
    registerSkinnedCouture(skinnedBelt, satinObsidianMat);

    // 24K Gold Diamond Studs seated flush on corset keyhole waist belt
    [-0.52, -0.34, 0.34, 0.52].forEach((theta, idx) => {
      const pRaw = sampleRawBodySurfaceTight(rawTorsoSamples, 1.08, theta, 0.0088, beltCz);
      const studGeo = trackGeo(createFourPointStarGeometry(idx === 1 || idx === 2 ? 0.0105 : 0.0078, 0.0028));
      studGeo.rotateY(theta);
      studGeo.translate(pRaw.x, pRaw.y, pRaw.z);
      const skinnedStud = bindGeometryToBodySkeleton(
        studGeo,
        goldFiligreeMat,
        `Fleurdelys_BeltStud_${idx}`,
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jSpine,
      );
      registerSkinnedCouture(skinnedStud, goldFiligreeMat, false, true);
    });

    // 5E. Sleek Form-Fitting Obsidian-Black Couture Hip-Dress (smooth thigh-bridged lower hem, zero crotch pinch or Z-fighting!)
    const hipDressSamples = rawBodyAllSamples.filter((p) => Math.abs(p.x) < 0.28 && p.y > 0.76 && p.y < 1.06);
    const hemSrc = hipDressSamples.length > 20 ? hipDressSamples : rawTorsoSamples;

    // Smooth radial surface helper for the hip-dress that bridges cleanly across the split-thigh center gap below y = 0.89
    const sampleHipDressSurface = (yRaw: number, theta: number, standoff: number, czOverride?: number): THREE.Vector3 => {
      const cz = czOverride ?? computeTorsoCenterlineZ(hemSrc, Math.max(yRaw, 0.89));
      const pLocal = sampleRawBodySurfaceTight(hemSrc, yRaw, theta, standoff, cz);
      if (yRaw >= 0.89) return pLocal;
      // Below the pelvis split (y < 0.89), ensure the front/back center never caves inward between the two thighs
      const pPelvis = sampleRawBodySurfaceTight(hemSrc, 0.89, theta, standoff, cz);
      const rLocal = Math.hypot(pLocal.x, pLocal.z - cz);
      const rPelvis = Math.hypot(pPelvis.x, pPelvis.z - cz);
      const centerMask = Math.pow(Math.abs(Math.cos(theta)), 3.0);
      const dropRatio = THREE.MathUtils.clamp((0.89 - yRaw) / 0.075, 0, 1);
      const minBridgeR = rPelvis * (1.0 - 0.08 * dropRatio);
      const blendedR = Math.max(rLocal, THREE.MathUtils.lerp(rLocal, minBridgeR, centerMask));
      return new THREE.Vector3(Math.sin(theta) * blendedR, yRaw, cz - Math.cos(theta) * blendedR);
    };

    const hipDressPositions: number[] = [];
    const hipDressUvs: number[] = [];
    const hipDressIndices: number[] = [];
    const hdYSteps = 18;
    const hdAngSteps = 44;
    for (let iy = 0; iy <= hdYSteps; iy++) {
      const v = iy / hdYSteps;
      const yRaw = THREE.MathUtils.lerp(0.815, 1.015, v);
      const cz = computeTorsoCenterlineZ(hemSrc, Math.max(yRaw, 0.89));
      for (let ix = 0; ix <= hdAngSteps; ix++) {
        const u = ix / hdAngSteps;
        const theta = THREE.MathUtils.lerp(-Math.PI, Math.PI, u);
        const pRaw = sampleHipDressSurface(yRaw, theta, 0.0062, cz);
        hipDressPositions.push(pRaw.x, pRaw.y, pRaw.z);
        hipDressUvs.push(u, 1.0 - v);
      }
    }
    const hdStride = hdAngSteps + 1;
    for (let iy = 0; iy < hdYSteps; iy++) {
      for (let ix = 0; ix < hdAngSteps; ix++) {
        const a = iy * hdStride + ix;
        const b = a + hdStride;
        hipDressIndices.push(a, b, a + 1);
        hipDressIndices.push(a + 1, b, b + 1);
      }
    }
    const hipDressGeo = trackGeo(new THREE.BufferGeometry());
    hipDressGeo.setAttribute('position', new THREE.Float32BufferAttribute(hipDressPositions, 3));
    hipDressGeo.setAttribute('uv', new THREE.Float32BufferAttribute(hipDressUvs, 2));
    hipDressGeo.setIndex(hipDressIndices);
    hipDressGeo.computeVertexNormals();

    const skinnedHipDress = bindGeometryWithCustomWeights(
      hipDressGeo,
      satinObsidianMat,
      'Fleurdelys_SleekHipDress',
      skMesh,
      (vx, vy) => {
        const vNorm = THREE.MathUtils.clamp((1.015 - vy) / 0.2, 0, 1);
        const legShare = THREE.MathUtils.smoothstep(vNorm, 0.25, 0.92) * 0.58;
        const absRatio = THREE.MathUtils.smoothstep(Math.abs(vx), 0.014, 0.075);
        const legIdx = vx < 0 ? jUpperLegL : jUpperLegR;
        const wLeg = legShare * absRatio;
        return [
          [jHips, 1.0 - wLeg],
          [legIdx, wLeg],
        ];
      },
    );
    registerSkinnedCouture(skinnedHipDress, satinObsidianMat);

    // Sculpted 24K Gold Hemline Trim + Draped Hip-Chains hugging tightly onto the Sleek Obsidian Hip-Dress
    const hemCz = computeTorsoCenterlineZ(hemSrc, 0.89);
    const hemRingPts: THREE.Vector3[] = [];
    for (let k = 0; k <= 36; k++) {
      const th = (k / 36) * Math.PI * 2;
      hemRingPts.push(sampleHipDressSurface(0.818, th, 0.0070, hemCz));
    }
    const hemTrimGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemRingPts, true), 44, 0.0020, 6, true));
    const skinnedHemTrim = bindGeometryWithCustomWeights(
      hemTrimGeo,
      goldFiligreeMat,
      'Fleurdelys_HipDressGoldHem',
      skMesh,
      (vx) => {
        const legIdx = vx < 0 ? jUpperLegL : jUpperLegR;
        const wLeg = THREE.MathUtils.smoothstep(Math.abs(vx), 0.014, 0.075) * 0.56;
        return [
          [jHips, 1.0 - wLeg],
          [legIdx, wLeg],
        ];
      },
    );
    registerSkinnedCouture(skinnedHemTrim, goldFiligreeMat, false, true);

    ([-1, 1] as const).forEach((side) => {
      const chainPts: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const th = side * THREE.MathUtils.lerp(0.08, 1.62, t);
        const sag = Math.sin(t * Math.PI) * 0.036;
        const yr = 1.010 - sag;
        chainPts.push(sampleHipDressSurface(yr, th, 0.0080));
      }
      const chainGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 24, 0.0017, 6, false));
      const skinnedChain = bindGeometryWithCustomWeights(
        chainGeo,
        goldFiligreeMat,
        `Fleurdelys_GoldHipChain_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        () => [[jHips, 1.0]],
      );
      registerSkinnedCouture(skinnedChain, goldFiligreeMat, false, true);
    });

    // 5E-2. Sheer Pearlescent-to-Azure Cathedral Veil Material + Surface-Anchored Slender Hip Ribbons + Flush Front Diamond Tabard
    const cathedralVeilMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        name: 'Fleurdelys_CathedralVeil_CLOTH',
        map: cathedralVeilTex,
        normalMap: fabricNormal,
        normalScale: new THREE.Vector2(0.24, 0.24),
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.14,
        roughness: 0.32,
        metalness: 0.03,
        sheen: 0.84,
        sheenRoughness: 0.3,
        sheenColor: new THREE.Color(0xbae6fd),
        iridescence: 0.36,
        iridescenceIOR: 1.4,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
        envMapIntensity: 1.08,
      }),
    );
    ctx.clothMaterialsList.push(cathedralVeilMat);

    ([-1, 1] as const).forEach((side) => {
      // Anchor ribbon root directly onto the measured side hip-dress contour (zero side floating!)
      const hipRoot = sampleRawBodySurfaceTight(hemSrc, 1.005, side * 1.65, 0.0062);
      const hipMid = sampleRawBodySurfaceTight(hemSrc, 0.88, side * 1.72, 0.012);
      const hipRibbonPts = [
        hipRoot,
        new THREE.Vector3(hipMid.x + side * 0.022, 0.88, hipMid.z + 0.048),
        new THREE.Vector3(hipMid.x + side * 0.056, 0.72, hipMid.z + 0.102),
        new THREE.Vector3(hipMid.x + side * 0.082, 0.56, hipMid.z + 0.148),
      ];
      const hipRibbonGeo = trackGeo(
        createDrapedRibbonGeometry(
          hipRibbonPts,
          (t) => 0.032 + Math.sin(t * Math.PI * 0.8) * 0.014 - Math.pow(t, 2.0) * 0.018,
          24,
          4,
          new THREE.Vector3(side * 0.45, 0.18, 0.88).normalize(),
          0.14,
        ),
      );
      const legIdx = side < 0 ? jUpperLegL : jUpperLegR;
      const skinnedRibbon = bindGeometryWithCustomWeights(
        hipRibbonGeo,
        cathedralVeilMat,
        `Fleurdelys_HipRibbon_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        (_vx, vy) => {
          const t = THREE.MathUtils.clamp((1.01 - vy) / 0.45, 0, 1);
          return [
            [jHips, 1.0 - t * 0.25],
            [legIdx, t * 0.25],
          ];
        },
      );
      registerSkinnedCouture(skinnedRibbon, cathedralVeilMat, false, true);

      // Delicate 24K gold star finial weighting each slender trailing hip ribbon
      const pTip = hipRibbonPts[hipRibbonPts.length - 1];
      const pFinialGeo = trackGeo(createFourPointStarGeometry(0.012, 0.0028));
      pFinialGeo.scale(0.68, 1.35, 1.0);
      pFinialGeo.translate(pTip.x, pTip.y - 0.010, pTip.z);
      const skinnedPFinial = bindGeometryWithCustomWeights(
        pFinialGeo,
        goldFiligreeMat,
        `Fleurdelys_PeplumFinial_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        () => [
          [jHips, 0.75],
          [legIdx, 0.25],
        ],
      );
      registerSkinnedCouture(skinnedPFinial, goldFiligreeMat, false, true);
    });

    // Center-front diamond tabard pennant anchored directly outside the thigh-bridged hip-dress surface (zero pass-through!)
    const tabardTop = sampleHipDressSurface(1.012, 0, 0.0080);
    const tabardMid = sampleHipDressSurface(0.90, 0, 0.0088);
    const tabardHem = sampleHipDressSurface(0.818, 0, 0.0098);
    const frontTabardPts = [
      tabardTop,
      tabardMid,
      tabardHem,
      new THREE.Vector3(0, 0.65, tabardHem.z - 0.008),
    ];
    const frontTabardGeo = trackGeo(
      createDrapedRibbonGeometry(
        frontTabardPts,
        (t) => (0.048 + Math.sin(t * Math.PI) * 0.018) * (1.0 - Math.pow(t, 2.4) * 0.86),
        22,
        4,
        new THREE.Vector3(0, 0.08, -1),
        0.10,
      ),
    );
    const skinnedTabard = bindGeometryWithCustomWeights(
      frontTabardGeo,
      stoleMat,
      'Fleurdelys_FrontTabard',
      skMesh,
      () => [[jHips, 1.0]],
    );
    registerSkinnedCouture(skinnedTabard, stoleMat, false, true);

    const broochAnchor = sampleRawBodySurfaceTight(hemSrc, 1.016, 0, 0.0085);
    const hipBroochGeo = trackGeo(createFourPointStarGeometry(0.018, 0.0036));
    hipBroochGeo.scale(0.85, 1.25, 1.0);
    hipBroochGeo.translate(broochAnchor.x, broochAnchor.y, broochAnchor.z);
    const skinnedHipBrooch = bindGeometryWithCustomWeights(
      hipBroochGeo,
      goldFiligreeMat,
      'Fleurdelys_FrontHipBrooch',
      skMesh,
      () => [[jHips, 1.0]],
    );
    registerSkinnedCouture(skinnedHipBrooch, goldFiligreeMat, false, true);

    const hipBroochGemGeo = trackGeo(new THREE.OctahedronGeometry(0.0082, 0));
    hipBroochGemGeo.scale(0.75, 1.35, 0.65);
    hipBroochGemGeo.translate(broochAnchor.x, broochAnchor.y, broochAnchor.z - 0.0032);
    const skinnedHipGem = bindGeometryWithCustomWeights(
      hipBroochGemGeo,
      blueCrystalMat,
      'Fleurdelys_FrontHipBroochGem',
      skMesh,
      () => [[jHips, 1.0]],
    );
    registerSkinnedCouture(skinnedHipGem, blueCrystalMat, false, true);

    // 5E-3. Contour-Hugging Left-Thigh Double-Band Gold & Sapphire Garter + Star Charm + Measured Calf Lace Ribbon Wrap
    const leftThighSamples = rawBodyAllSamples.filter((p) => p.x < -0.02 && p.y > 0.66 && p.y < 0.78);
    if (leftThighSamples.length > 6) {
      let cx = 0;
      let cz = 0;
      leftThighSamples.forEach((p) => {
        cx += p.x;
        cz += p.z;
      });
      cx /= leftThighSamples.length;
      cz /= leftThighSamples.length;

      // Sample exact elliptical thigh contour at each angle so the garter hugs skin with zero floating gap
      const sampleThighAt = (gy: number, th: number, clearance: number): THREE.Vector3 => {
        const dirX = Math.cos(th);
        const dirZ = Math.sin(th);
        let bestR = 0;
        let hits = 0;
        for (let i = 0; i < leftThighSamples.length; i++) {
          const p = leftThighSamples[i];
          if (Math.abs(p.y - gy) > 0.024) continue;
          const dx = p.x - cx;
          const dz = p.z - cz;
          const r = Math.hypot(dx, dz);
          if (r < 0.015) continue;
          if ((dx * dirX + dz * dirZ) / r > 0.93) {
            const proj = dx * dirX + dz * dirZ;
            if (proj > bestR) bestR = proj;
            hits++;
          }
        }
        const finalR = (hits > 0 ? bestR : 0.068) + clearance;
        return new THREE.Vector3(cx + dirX * finalR, gy, cz + dirZ * finalR);
      };

      [0.728, 0.708].forEach((gy, gIdx) => {
        const garterPts: THREE.Vector3[] = [];
        for (let k = 0; k <= 28; k++) {
          const th = (k / 28) * Math.PI * 2;
          const pt = sampleThighAt(gy + Math.sin(th) * 0.004, th, 0.0028 + gIdx * 0.0006);
          garterPts.push(pt);
        }
        const gMat = gIdx === 0 ? goldFiligreeMat : satinObsidianMat;
        const garterGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(garterPts, true), 32, gIdx === 0 ? 0.0026 : 0.0032, 6, true));
        const skinnedGarter = bindGeometryWithCustomWeights(
          garterGeo,
          gMat,
          `Fleurdelys_LeftThighGarter_${gIdx}`,
          skMesh,
          () => [[jUpperLegL, 1.0]],
        );
        registerSkinnedCouture(skinnedGarter, gMat, false, true);
      });

      // Sapphire teardrop gem + dangling mini 4-point gold star charm seated flush on outer-front left thigh garter
      const gemAnchor = sampleThighAt(0.718, -Math.PI * 0.68, 0.0045);
      const gemGeo = trackGeo(createFourPointStarGeometry(0.0115, 0.0032));
      gemGeo.scale(0.68, 1.35, 1.0);
      gemGeo.translate(gemAnchor.x, gemAnchor.y, gemAnchor.z);
      const skinnedGarterGem = bindGeometryWithCustomWeights(
        gemGeo,
        blueCrystalMat,
        'Fleurdelys_LeftThighGem',
        skMesh,
        () => [[jUpperLegL, 1.0]],
      );
      registerSkinnedCouture(skinnedGarterGem, blueCrystalMat, false, true);

      const charmAnchor = sampleThighAt(0.688, -Math.PI * 0.68, 0.0045);
      const charmGeo = trackGeo(createFourPointStarGeometry(0.0085, 0.0024));
      charmGeo.translate(charmAnchor.x, charmAnchor.y, charmAnchor.z);
      const skinnedCharm = bindGeometryWithCustomWeights(
        charmGeo,
        goldFiligreeMat,
        'Fleurdelys_LeftThighCharm',
        skMesh,
        () => [[jUpperLegL, 1.0]],
      );
      registerSkinnedCouture(skinnedCharm, goldFiligreeMat, false, true);
    }

    // Contour-Measured Left Shin/Ankle Gold Lace Spiral Wrap (starts cleanly above sandal ankle strap, zero overlap!)
    const jLowerLegL = allBones.findIndex((b) => /j_bip_l_lowerleg|leftlowerleg/i.test(b.name));
    const leftCalfSamples = rawBodyAllSamples.filter((p) => p.x < -0.01 && p.y > 0.14 && p.y < 0.38);
    if (jLowerLegL >= 0 && leftCalfSamples.length > 6) {
      const spiralPts: THREE.Vector3[] = [];
      for (let k = 0; k <= 36; k++) {
        const t = k / 36;
        const y = THREE.MathUtils.lerp(0.165, 0.355, t);
        const ang = t * Math.PI * 4.5;
        const slice = leftCalfSamples.filter((p) => Math.abs(p.y - y) < 0.022);
        let lcx = -0.085;
        let lcz = 0;
        let localR = THREE.MathUtils.lerp(0.032, 0.044, t);
        if (slice.length > 3) {
          lcx = 0;
          lcz = 0;
          slice.forEach((p) => {
            lcx += p.x;
            lcz += p.z;
          });
          lcx /= slice.length;
          lcz /= slice.length;
          const dirX = Math.cos(ang);
          const dirZ = Math.sin(ang);
          let maxProj = 0;
          slice.forEach((p) => {
            const dx = p.x - lcx;
            const dz = p.z - lcz;
            const r = Math.hypot(dx, dz);
            if (r > 0.01 && (dx * dirX + dz * dirZ) / r > 0.90) {
              const proj = dx * dirX + dz * dirZ;
              if (proj > maxProj) maxProj = proj;
            }
          });
          if (maxProj > 0.015) localR = maxProj;
        }
        const finalR = localR + 0.0024;
        spiralPts.push(new THREE.Vector3(lcx + Math.cos(ang) * finalR, y, lcz + Math.sin(ang) * finalR));
      }
      const wrapGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiralPts), 44, 0.0022, 5, false));
      const skinnedWrap = bindGeometryWithCustomWeights(
        wrapGeo,
        goldFiligreeMat,
        'Fleurdelys_LeftAnkleRibbon',
        skMesh,
        () => [[jLowerLegL, 1.0]],
      );
      registerSkinnedCouture(skinnedWrap, goldFiligreeMat, false, true);
    }

    // 5E-4. Surface-Anchored 4-Panel Skinned Saintess Back Veil & Cathedral Cape Train (flush to back bodice, refined width!)
    const resolveCapeWeights = (_vx: number, vy: number): Array<[number, number]> => {
      if (vy >= 1.18) return [[jUpperChest, 0.65], [jChest, 0.35]];
      if (vy >= 1.0) return [[jChest, 0.45], [jSpine, 0.55]];
      return [[jSpine, 0.32], [jHips, 0.68]];
    };

    const backAnchor = sampleRawBodySurfaceTight(rawTorsoSamples, 1.245, Math.PI, 0.0058);
    const backAnchorUpper = sampleRawBodySurfaceTight(rawTorsoSamples, 1.275, Math.PI, 0.0052);

    ([-1, 1] as const).forEach((side) => {
      // Sleek outer pearl-white cathedral cape wing anchored flush at mid-back clasp
      const capePtsRaw = [
        new THREE.Vector3(side * 0.020, backAnchor.y, backAnchor.z),
        new THREE.Vector3(side * 0.112, 0.98, backAnchor.z + 0.095),
        new THREE.Vector3(side * 0.210, 0.62, backAnchor.z + 0.195),
        new THREE.Vector3(side * 0.295, 0.28, backAnchor.z + 0.285),
        new THREE.Vector3(side * 0.335, 0.07, backAnchor.z + 0.340),
      ];
      const capeGeo = trackGeo(
        createDrapedRibbonGeometry(
          capePtsRaw,
          (t) => 0.054 + Math.pow(t, 0.82) * 0.165 - Math.pow(t, 4.0) * 0.038,
          38,
          6,
          new THREE.Vector3(side * 0.22, 0.18, 0.95).normalize(),
          0.16,
        ),
      );
      const skinnedCape = bindGeometryWithCustomWeights(
        capeGeo,
        cathedralVeilMat,
        `Fleurdelys_CathedralCape_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        resolveCapeWeights,
      );
      registerSkinnedCouture(skinnedCape, cathedralVeilMat, false, true);

      // Inner translucent starry-azure veil wing nested gracefully inside cathedral cape
      const innerVeilPtsRaw = [
        new THREE.Vector3(side * 0.016, backAnchorUpper.y, backAnchorUpper.z),
        new THREE.Vector3(side * 0.092, 1.02, backAnchorUpper.z + 0.078),
        new THREE.Vector3(side * 0.168, 0.70, backAnchorUpper.z + 0.158),
        new THREE.Vector3(side * 0.228, 0.38, backAnchorUpper.z + 0.228),
      ];
      const innerVeilGeo = trackGeo(
        createDrapedRibbonGeometry(
          innerVeilPtsRaw,
          (t) => 0.040 + Math.pow(t, 0.85) * 0.112 - Math.pow(t, 3.2) * 0.032,
          30,
          5,
          new THREE.Vector3(side * 0.18, 0.22, 0.96).normalize(),
          0.14,
        ),
      );
      const skinnedInnerVeil = bindGeometryWithCustomWeights(
        innerVeilGeo,
        ribbonAquaMat,
        `Fleurdelys_StarryBackVeil_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        resolveCapeWeights,
      );
      registerSkinnedCouture(skinnedInnerVeil, ribbonAquaMat, false, true);
    });

    // 24K Gold & Faceted Sapphire Back Clasp seated flush on mid-back bodice
    const backClaspGeo = trackGeo(createFourPointStarGeometry(0.021, 0.0040));
    backClaspGeo.scale(0.85, 1.32, 1.0);
    backClaspGeo.translate(backAnchor.x, backAnchor.y, backAnchor.z + 0.0022);
    const skinnedBackClasp = bindGeometryWithCustomWeights(
      backClaspGeo,
      goldFiligreeMat,
      'Fleurdelys_BackCapeClasp',
      skMesh,
      () => [[jUpperChest, 0.7], [jChest, 0.3]],
    );
    registerSkinnedCouture(skinnedBackClasp, goldFiligreeMat, false, true);

    const backClaspGemGeo = trackGeo(new THREE.OctahedronGeometry(0.0085, 0));
    backClaspGemGeo.scale(0.75, 1.35, 0.65);
    backClaspGemGeo.translate(backAnchor.x, backAnchor.y, backAnchor.z + 0.0058);
    const skinnedBackGem = bindGeometryWithCustomWeights(
      backClaspGemGeo,
      blueCrystalMat,
      'Fleurdelys_BackCapeGem',
      skMesh,
      () => [[jUpperChest, 0.7], [jChest, 0.3]],
    );
    registerSkinnedCouture(skinnedBackGem, blueCrystalMat, false, true);

    // 5F. Dual Tailored White Liturgical Draped Stoles Hugging Directly Over Bust, Waist & Hip-Dress (Sleek Width, Zero Floating!)
    ([-1, 1] as const).forEach((side) => {
      const shoulderSurf = sampleRawBodySurfaceTight(rawTorsoSamples, 1.338, side * 0.54, 0.0045);
      const bustCrest = sampleRawBodySurfaceTight(rawTorsoSamples, 1.266, side * 0.56, 0.0055);
      const underBust = sampleRawBodySurfaceTight(rawTorsoSamples, 1.182, side * 0.52, 0.0062);
      const waistFront = sampleRawBodySurfaceTight(rawTorsoSamples, 1.06, side * 0.48, 0.0072);
      const hipFrontSkirt = sampleHipDressSurface(0.92, side * 0.44, 0.0090);
      const hemEdge = sampleHipDressSurface(0.818, side * 0.42, 0.0098);
      const stolePtsRaw = [
        shoulderSurf,
        bustCrest,
        underBust,
        waistFront,
        hipFrontSkirt,
        hemEdge,
        new THREE.Vector3(hemEdge.x + side * 0.008, 0.68, hemEdge.z - 0.006),
        new THREE.Vector3(hemEdge.x + side * 0.014, 0.55, hemEdge.z - 0.011),
      ];
      const stoleGeo = trackGeo(
        createDrapedRibbonGeometry(
          stolePtsRaw,
          (t) => 0.048 + Math.sin(t * Math.PI * 0.78) * 0.016 - t * 0.008,
          44,
          6,
          new THREE.Vector3(side * 0.24, 0.05, -0.97),
          0.12,
        ),
      );
      const legIdx = side < 0 ? jUpperLegL : jUpperLegR;
      const skinnedStole = bindGeometryWithCustomWeights(
        stoleGeo,
        stoleMat,
        `Fleurdelys_LiturgicalStole_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        (_vx, vy) => {
          if (vy >= 1.25) return [[jUpperChest, 1.0]];
          if (vy >= 1.14) {
            const t = (vy - 1.14) / 0.11;
            return [
              [jUpperChest, t],
              [jChest, 1 - t],
            ];
          }
          if (vy >= 1.03) {
            const t = (vy - 1.03) / 0.11;
            return [
              [jChest, t],
              [jSpine, 1 - t],
            ];
          }
          if (vy >= 0.88) {
            const t = (vy - 0.88) / 0.15;
            return [
              [jSpine, t * 0.45],
              [jHips, 1 - t * 0.45],
            ];
          }
          // Lower free hanging tip below skirt stays mostly Hip-stabilized with gentle thigh sway
          return [
            [jHips, 0.68],
            [legIdx, 0.32],
          ];
        },
      );
      registerSkinnedCouture(skinnedStole, stoleMat);

      // Refined Gold Cross Finial at tip of stole
      const tipEnd = stolePtsRaw[stolePtsRaw.length - 1];
      const finialGeo = trackGeo(createFourPointStarGeometry(0.019, 0.0036));
      finialGeo.scale(0.68, 1.38, 1.0);
      finialGeo.translate(tipEnd.x, tipEnd.y - 0.014, tipEnd.z - 0.002);
      const skinnedFinial = bindGeometryWithCustomWeights(
        finialGeo,
        goldFiligreeMat,
        `Fleurdelys_StoleFinial_${side === 1 ? 'R' : 'L'}`,
        skMesh,
        () => [
          [jHips, 0.68],
          [legIdx, 0.32],
        ],
      );
      registerSkinnedCouture(skinnedFinial, goldFiligreeMat, false, true);
    });

    // 5G. Snug Tapered Forearm Gauntlets Measured Directly from Arm Vertices (Sleek Skin-Tight Opera Fit!)
    (
      [
        { name: 'L', sign: -1 as const, xStart: -0.348, xEnd: -0.505, samples: rawForearmSamplesL, allowed: armAllowedJointsL, fb: jLowerArmL },
        { name: 'R', sign: 1 as const, xStart: 0.348, xEnd: 0.505, samples: rawForearmSamplesR, allowed: armAllowedJointsR, fb: jLowerArmR },
      ] as const
    ).forEach(({ name, sign, xStart, xEnd, samples, allowed, fb }) => {
      const segU = 14;
      const segR = 24;
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let iu = 0; iu <= segU; iu++) {
        const t = iu / segU;
        const px = THREE.MathUtils.lerp(xStart, xEnd, t);
        let cy = 1.368;
        let cz = -0.004;
        let maxR = THREE.MathUtils.lerp(0.0335, 0.0255, t);
        const nearby = samples.filter((p) => Math.abs(p.x - px) < 0.026);
        if (nearby.length > 0) {
          let sy = 0;
          let sz = 0;
          nearby.forEach((p) => {
            sy += p.y;
            sz += p.z;
          });
          cy = sy / nearby.length;
          cz = sz / nearby.length;
          maxR = Math.max(...nearby.map((p) => Math.hypot(p.y - cy, p.z - cz)));
        }
        const sleeveR = maxR + 0.0028; // Snug 2.8mm couture clearance outside measured arm!
        for (let ir = 0; ir <= segR; ir++) {
          const u = ir / segR;
          const ang = u * Math.PI * 2;
          positions.push(px, cy + Math.sin(ang) * sleeveR, cz + Math.cos(ang) * sleeveR);
          uvs.push(u, t);
        }
      }
      const stride = segR + 1;
      for (let iu = 0; iu < segU; iu++) {
        for (let ir = 0; ir < segR; ir++) {
          const a = iu * stride + ir;
          const b = a + stride;
          if (sign === 1) {
            indices.push(a, a + 1, b);
            indices.push(a + 1, b + 1, b);
          } else {
            indices.push(a, b, a + 1);
            indices.push(a + 1, b, b + 1);
          }
        }
      }
      const sleeveGeo = trackGeo(new THREE.BufferGeometry());
      sleeveGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      sleeveGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      sleeveGeo.setIndex(indices);
      sleeveGeo.computeVertexNormals();

      const skinnedSleeve = bindGeometryToBodySkeleton(
        sleeveGeo,
        satinObsidianMat,
        `Fleurdelys_GauntletSleeve_${name}`,
        skMesh,
        samples.length > 0 ? samples : rawBodyAllSamples,
        allowed,
        fb,
      );
      registerSkinnedCouture(skinnedSleeve, satinObsidianMat);
    });
  }

  // ==================== 6. UPPER CHEST RIGID JEWELRY: FLUSH BROOCH, HARNESS BAND & THORNY VINES ====================
  if (upperChestBone) {
    const upperRoot = new THREE.Group();
    upperRoot.name = 'Fleurdelys_ChestJewelry';

    const sternumRaw = sampleRawBodySurfaceTight(rawTorsoSamples, 1.326, 0, 0.0052);
    const sternumRel = rawToWorld(sternumRaw.x, sternumRaw.y, sternumRaw.z).sub(upperChestPos);

    const crossPendantGeo = trackGeo(createFourPointStarGeometry(0.019 * s, 0.0032 * s));
    crossPendantGeo.scale(0.75, 1.48, 1.0);
    const crossPendant = new THREE.Mesh(crossPendantGeo, goldFiligreeMat);
    crossPendant.position.set(sternumRel.x, sternumRel.y, sternumRel.z + 0.0018 * s);
    crossPendant.rotation.x = -0.22;
    upperRoot.add(crossPendant);
    ctx.originalMeshMaterials.set(crossPendant, goldFiligreeMat);

    const broochGemGeo = trackGeo(createFourPointStarGeometry(0.0076 * s, 0.0032 * s));
    const broochGem = new THREE.Mesh(broochGemGeo, blueCrystalMat);
    broochGem.position.set(sternumRel.x, sternumRel.y, sternumRel.z + 0.0042 * s);
    broochGem.rotation.x = -0.22;
    upperRoot.add(broochGem);
    ctx.originalMeshMaterials.set(broochGem, blueCrystalMat);

    // Outer filigree halo ring framing sternum brooch
    const broochHaloGeo = trackGeo(new THREE.TorusGeometry(0.016 * s, 0.0014 * s, 8, 24));
    const broochHalo = new THREE.Mesh(broochHaloGeo, goldFiligreeMat);
    broochHalo.position.set(sternumRel.x, sternumRel.y, sternumRel.z + 0.0022 * s);
    broochHalo.rotation.x = -0.22;
    upperRoot.add(broochHalo);
    ctx.originalMeshMaterials.set(broochHalo, goldFiligreeMat);

    // Shoulder clasp buckles seated flush to collarbone
    ([-1, 1] as const).forEach((side) => {
      const claspSurf = sampleRawBodySurfaceTight(rawTorsoSamples, 1.325, side * 0.5, 0.0056);
      const claspPos = rawToWorld(claspSurf.x, claspSurf.y, claspSurf.z).sub(upperChestPos);
      const claspGeo = trackGeo(new THREE.TorusGeometry(0.0108 * s, 0.0028 * s, 10, 24));
      const clasp = new THREE.Mesh(claspGeo, goldFiligreeMat);
      clasp.position.copy(claspPos);
      clasp.rotation.set(-0.34, side * 0.25, 0);
      upperRoot.add(clasp);
      ctx.originalMeshMaterials.set(clasp, goldFiligreeMat);

      // Multi-point torso-skinned gold festoon chain hugging upper chest cleanly without chord-clipping collarbone
      if (bodySkinnedMesh) {
        const chainRawPts = [0.06, 0.17, 0.28, 0.39, 0.5].map((thAbs, idx) => {
          const t = idx / 4;
          const sag = Math.sin(t * Math.PI) * 0.014;
          return sampleRawBodySurfaceTight(rawTorsoSamples, 1.325 - sag, side * thAbs, 0.0062);
        });
        const chainGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainRawPts), 20, 0.0012, 6, false));
        const skinnedChain = bindGeometryToBodySkeleton(
          chainGeo,
          goldFiligreeMat,
          `Fleurdelys_FestoonChain_${side === 1 ? 'R' : 'L'}`,
          bodySkinnedMesh,
          rawTorsoSamples,
          torsoAllowedJoints,
          jUpperChest,
        );
        registerSkinnedCouture(skinnedChain, goldFiligreeMat, false, true);
      }
    });

    // Multi-point torso-skinned Center Chest Horizontal Harness Band (7 sampled contour points, zero chord-clipping!)
    if (bodySkinnedMesh) {
      const bandThetas = [-0.56, -0.38, -0.19, 0, 0.19, 0.38, 0.56];
      const bandRawPts = bandThetas.map((th) => {
        const yB = 1.298 + Math.abs(th) * 0.011;
        return sampleRawBodySurfaceTight(rawTorsoSamples, yB, th, 0.0048);
      });
      const bandGeo = trackGeo(
        createDrapedRibbonGeometry(bandRawPts, () => 0.0085, 22, 2, new THREE.Vector3(0, 0.2, -1), 0.06),
      );
      const skinnedBand = bindGeometryToBodySkeleton(
        bandGeo,
        satinObsidianMat,
        'Fleurdelys_UpperChestBand',
        bodySkinnedMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jUpperChest,
      );
      registerSkinnedCouture(skinnedBand, satinObsidianMat);
    }

    // Iconic Vertical Black-and-Gold Center Sternum Strap, Gold Piping, Thorny Vines & Mid-Sternum Clasp
    // Bound directly to the Torso Skeleton as pose-synchronized SkinnedMeshes so they bend with breathing/idle with ZERO clipping!
    if (bodySkinnedMesh) {
      const skMesh = bodySkinnedMesh;
      const sternumStrapY = [1.06, 1.13, 1.21, 1.28, 1.35, 1.41];
      const sternumStrapPtsRaw = sternumStrapY.map((yr) => {
        const cz = computeTorsoCenterlineZ(rawTorsoSamples, yr);
        return sampleRawBodySurfaceTight(rawTorsoSamples, yr, 0, 0.0044, cz);
      });
      const sternumStrapGeo = trackGeo(
        createDrapedRibbonGeometry(sternumStrapPtsRaw, () => 0.012, 22, 2, new THREE.Vector3(0, 0.1, -1), 0.06),
      );
      const skinnedSternumStrap = bindGeometryToBodySkeleton(
        sternumStrapGeo,
        satinObsidianMat,
        'Fleurdelys_CenterSternumStrap',
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jUpperChest,
      );
      registerSkinnedCouture(skinnedSternumStrap, satinObsidianMat);

      ([-1, 1] as const).forEach((edgeSide) => {
        const pipePtsRaw = sternumStrapPtsRaw.map(
          (p) => new THREE.Vector3(p.x + edgeSide * 0.006, p.y, p.z - 0.0008),
        );
        const pipeGeo = trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pipePtsRaw), 22, 0.0009, 5, false));
        const skinnedPipe = bindGeometryToBodySkeleton(
          pipeGeo,
          goldFiligreeMat,
          `Fleurdelys_SternumPipe_${edgeSide === 1 ? 'R' : 'L'}`,
          skMesh,
          rawTorsoSamples,
          torsoAllowedJoints,
          jUpperChest,
        );
        registerSkinnedCouture(skinnedPipe, goldFiligreeMat, false, true);
      });

      const vYLevels = [1.07, 1.13, 1.195, 1.258, 1.32];
      const vineCurvePtsRaw = (dirSign: number) =>
        vYLevels.map((yr, idx) => {
          const cz = computeTorsoCenterlineZ(rawTorsoSamples, yr);
          const zig = (idx % 2 === 0 ? -1 : 1) * dirSign * (idx === 4 ? 0.006 : 0.012);
          const surf = sampleRawBodySurfaceTight(rawTorsoSamples, yr, 0, 0.0066, cz);
          return new THREE.Vector3(surf.x + zig, surf.y, surf.z);
        });

      [new THREE.CatmullRomCurve3(vineCurvePtsRaw(1)), new THREE.CatmullRomCurve3(vineCurvePtsRaw(-1))].forEach(
        (vCurve, vIdx) => {
          const vGeo = trackGeo(new THREE.TubeGeometry(vCurve, 30, 0.0029, 7, false));
          const skinnedVine = bindGeometryToBodySkeleton(
            vGeo,
            blueCrystalMat,
            `Fleurdelys_CleavageVine_${vIdx}`,
            skMesh,
            rawTorsoSamples,
            torsoAllowedJoints,
            jUpperChest,
          );
          registerSkinnedCouture(skinnedVine, blueCrystalMat, false, true);

          for (let t = 0.16; t <= 0.86; t += 0.17) {
            const pt = vCurve.getPointAt(t);
            const spurGeo = trackGeo(new THREE.ConeGeometry(0.0034, 0.020, 4));
            spurGeo.rotateX(-0.28);
            spurGeo.rotateZ((vIdx === 0 ? -1 : 1) * (0.72 + t * 0.42));
            spurGeo.translate(pt.x, pt.y, pt.z);
            const skinnedSpur = bindGeometryToBodySkeleton(
              spurGeo,
              blueCrystalMat,
              `Fleurdelys_CleavageSpur_${vIdx}_${Math.round(t * 100)}`,
              skMesh,
              rawTorsoSamples,
              torsoAllowedJoints,
              jUpperChest,
            );
            registerSkinnedCouture(skinnedSpur, blueCrystalMat, false, true);
          }
        },
      );

      const claspCz = computeTorsoCenterlineZ(rawTorsoSamples, 1.16);
      const claspSurf = sampleRawBodySurfaceTight(rawTorsoSamples, 1.16, 0, 0.0072, claspCz);
      const claspGeo = trackGeo(createFourPointStarGeometry(0.012, 0.0028));
      claspGeo.translate(claspSurf.x, claspSurf.y, claspSurf.z);
      const skinnedClasp = bindGeometryToBodySkeleton(
        claspGeo,
        goldFiligreeMat,
        'Fleurdelys_MidSternumClasp',
        skMesh,
        rawTorsoSamples,
        torsoAllowedJoints,
        jChest,
      );
      registerSkinnedCouture(skinnedClasp, goldFiligreeMat, false, true);
    }

    attachToBoneWorld(upperChestBone, upperRoot, upperChestPos);
  }

  // Helper: Measure exact raw arm radius at a given X coordinate from body samples so armlets/cuffs hug snugly
  const measureArmRadiusAtX = (xRaw: number, fallbackR: number): number => {
    const slice = rawBodyAllSamples.filter((p) => Math.abs(p.x - xRaw) < 0.025 && p.y > 1.24 && p.y < 1.48);
    if (slice.length < 4) return fallbackR;
    let sy = 0;
    let sz = 0;
    slice.forEach((p) => {
      sy += p.y;
      sz += p.z;
    });
    sy /= slice.length;
    sz /= slice.length;
    const maxR = Math.max(...slice.map((p) => Math.hypot(p.y - sy, p.z - sz)));
    return THREE.MathUtils.clamp(maxR, 0.022, 0.044);
  };

  // ==================== 7. RIGID ARMLET & RUFFLED ELBOW CUFFS (MEASURED SNUG ARM RADII) ====================
  if (humanoidBones.rightUpperArm) {
    const armletRoot = new THREE.Group();
    armletRoot.name = 'Fleurdelys_RightArmlet';
    const bicepR = measureArmRadiusAtX(0.24, 0.034) + 0.0022;

    for (let tier = 0; tier < 3; tier++) {
      const cuffGeo = trackGeo(
        new THREE.CylinderGeometry(
          (bicepR + 0.001 + tier * 0.0032) * s,
          (bicepR + 0.007 + tier * 0.0042) * s,
          0.025 * s,
          24,
          1,
          true,
          -Math.PI * 0.55,
          Math.PI * 1.4,
        ),
      );
      const posAttr = cuffGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const px = posAttr.getX(i);
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        const ang = Math.atan2(px, pz);
        const flute = Math.sin(ang * 9.0) * 0.0032 * s * (py < 0 ? 1.0 : 0.25);
        const r = Math.hypot(px, pz) || 1;
        posAttr.setXYZ(i, px * (1 + flute / r), py, pz * (1 + flute / r));
      }
      cuffGeo.computeVertexNormals();
      cuffGeo.rotateZ(Math.PI / 2);

      const cuff = new THREE.Mesh(cuffGeo, silverArmorMat);
      cuff.position.set((-0.078 - tier * 0.020) * s, 0, 0);
      cuff.castShadow = true;
      armletRoot.add(cuff);
      ctx.originalMeshMaterials.set(cuff, silverArmorMat);
    }

    // Exterior-wrapped spiral crystal vine hugging outside the measured bicep cylinder (zero arm clipping!)
    const armVinePts: THREE.Vector3[] = [];
    const vineWrapR = (bicepR + 0.0032) * s;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const vx = THREE.MathUtils.lerp(-0.122, -0.184, t) * s;
      const ang = THREE.MathUtils.lerp(1.15, -1.05, t);
      armVinePts.push(new THREE.Vector3(vx, Math.sin(ang) * vineWrapR, Math.cos(ang) * vineWrapR));
    }
    const armVine = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(armVinePts), 22, 0.0023 * s, 6, false)),
      blueCrystalMat,
    );
    armletRoot.add(armVine);
    ctx.originalMeshMaterials.set(armVine, blueCrystalMat);

    const armThorn = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.0044 * s, 0.030 * s, 5)), blueCrystalMat);
    armThorn.position.set(-0.088 * s, (bicepR + 0.008) * s, 0.006 * s);
    armThorn.rotation.set(0.24, 0, 0.36);
    armletRoot.add(armThorn);
    ctx.originalMeshMaterials.set(armThorn, blueCrystalMat);

    attachToBoneWorld(humanoidBones.rightUpperArm, armletRoot, rUpperArmPos);
  }

  // Asymmetrical Left Upper-Arm Delicate Gold Filigree & Sapphire Bicep Band (snug measured radius)
  if (humanoidBones.leftUpperArm) {
    const lArmRoot = new THREE.Group();
    lArmRoot.name = 'Fleurdelys_LeftArmBand';
    const lBicepR = measureArmRadiusAtX(-0.24, 0.034) + 0.0018;
    [0.095, 0.116].forEach((ox, idx) => {
      const bandGeo = trackGeo(new THREE.TorusGeometry(lBicepR * s, (idx === 0 ? 0.0021 : 0.0015) * s, 8, 22));
      bandGeo.rotateY(Math.PI / 2);
      const band = new THREE.Mesh(bandGeo, goldFiligreeMat);
      band.position.set(ox * s, 0, 0);
      lArmRoot.add(band);
      ctx.originalMeshMaterials.set(band, goldFiligreeMat);
    });
    const lArmGem = new THREE.Mesh(trackGeo(createFourPointStarGeometry(0.0088 * s, 0.0024 * s)), blueCrystalMat);
    lArmGem.position.set(0.105 * s, 0, (lBicepR + 0.0028) * s);
    lArmRoot.add(lArmGem);
    ctx.originalMeshMaterials.set(lArmGem, blueCrystalMat);
    attachToBoneWorld(humanoidBones.leftUpperArm, lArmRoot, lUpperArmPos);
  }

  // Silver Ruffle Elbow Cuffs, Gold Filigree Trim Rings, Wrist Rings & Blue Wrist Thorns (snug measured forearm radii)
  (
    [
      { bone: humanoidBones.rightForearm, pos: rForearmPos, handPos: rHandPos, side: -1 as const, rawXSign: 1 },
      { bone: humanoidBones.leftForearm, pos: lForearmPos, handPos: lHandPos, side: 1 as const, rawXSign: -1 },
    ] as const
  ).forEach(({ bone, pos, handPos, side, rawXSign }) => {
    if (!bone) return;
    const cuffRoot = new THREE.Group();
    cuffRoot.name = `Fleurdelys_ForearmTrim_${side === -1 ? 'R' : 'L'}`;
    const armSpan = Math.max(0.16 * s, pos.distanceTo(handPos));
    const elbowR = measureArmRadiusAtX(rawXSign * 0.36, 0.032) + 0.0026;
    const wristR = measureArmRadiusAtX(rawXSign * 0.49, 0.025) + 0.0026;

    const ruffleGeo = trackGeo(
      new THREE.CylinderGeometry((elbowR + 0.002) * s, (elbowR + 0.012) * s, 0.028 * s, 22, 1, true),
    );
    const rp = ruffleGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < rp.count; i++) {
      const px = rp.getX(i);
      const py = rp.getY(i);
      const pz = rp.getZ(i);
      const ang = Math.atan2(px, pz);
      const wave = Math.sin(ang * 10) * 0.0036 * s * (py < 0 ? 1 : 0.2);
      const r = Math.hypot(px, pz) || 1;
      rp.setXYZ(i, px * (1 + wave / r), py, pz * (1 + wave / r));
    }
    ruffleGeo.computeVertexNormals();
    ruffleGeo.rotateZ(side * (Math.PI / 2));
    const ruffle = new THREE.Mesh(ruffleGeo, silverArmorMat);
    ruffle.position.set(side * armSpan * 0.16, 0, 0);
    cuffRoot.add(ruffle);
    ctx.originalMeshMaterials.set(ruffle, silverArmorMat);

    // Upper gauntlet gold filigree collar ring
    const upperRingGeo = trackGeo(new THREE.TorusGeometry((elbowR + 0.0018) * s, 0.0018 * s, 8, 20));
    upperRingGeo.rotateY(Math.PI / 2);
    const upperRing = new THREE.Mesh(upperRingGeo, goldFiligreeMat);
    upperRing.position.set(side * armSpan * 0.26, 0, 0);
    cuffRoot.add(upperRing);
    ctx.originalMeshMaterials.set(upperRing, goldFiligreeMat);

    const cuffRingGeo = trackGeo(new THREE.TorusGeometry((wristR + 0.0012) * s, 0.0019 * s, 8, 20));
    cuffRingGeo.rotateY(Math.PI / 2);
    const cuffRing = new THREE.Mesh(cuffRingGeo, goldFiligreeMat);
    cuffRing.position.set(side * armSpan * 0.86, 0, 0);
    cuffRoot.add(cuffRing);
    ctx.originalMeshMaterials.set(cuffRing, goldFiligreeMat);

    // Sapphire wrist crest gem seated flush on outer wrist cuff
    const wristGem = new THREE.Mesh(trackGeo(createFourPointStarGeometry(0.0076 * s, 0.0022 * s)), blueCrystalMat);
    wristGem.position.set(side * armSpan * 0.86, (wristR + 0.0028) * s, 0);
    wristGem.rotation.x = Math.PI / 2;
    cuffRoot.add(wristGem);
    ctx.originalMeshMaterials.set(wristGem, blueCrystalMat);

    // Seat mid-forearm crystal thorn flush onto the true tapered forearm radius (zero floating!)
    const midForearmR = (elbowR + wristR) * 0.5;
    const wristThorn = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.0036 * s, 0.024 * s, 5)), blueCrystalMat);
    wristThorn.position.set(side * armSpan * 0.52, (midForearmR + 0.002) * s, -0.003 * s);
    wristThorn.rotation.set(-0.22, 0, side * 0.52);
    cuffRoot.add(wristThorn);
    ctx.originalMeshMaterials.set(wristThorn, blueCrystalMat);

    attachToBoneWorld(bone, cuffRoot, pos);
  });

  // ==================== 8. TRAILING AQUA SWALLOWTAIL RIBBONS (SURFACE-ANCHORED TO BACK WAIST) ====================
  if (humanoidBones.hips) {
    const hipsPos = getBoneWorldPos(humanoidBones.hips, 1.01);
    const ribbonRoot = new THREE.Group();
    ribbonRoot.name = 'Fleurdelys_SwallowtailRibbons';

    ([-1, 1] as const).forEach((side) => {
      const backWaistRaw = sampleRawBodySurfaceTight(rawTorsoSamples, 1.01, Math.PI - side * 0.28, 0.0088);
      const backWaistRel = rawToWorld(backWaistRaw.x, backWaistRaw.y, backWaistRaw.z).sub(hipsPos);
      const tailPts = [
        backWaistRel,
        new THREE.Vector3(backWaistRel.x + side * 0.105 * s, backWaistRel.y - 0.22 * s, backWaistRel.z - 0.095 * s),
        new THREE.Vector3(backWaistRel.x + side * 0.168 * s, backWaistRel.y - 0.52 * s, backWaistRel.z - 0.172 * s),
        new THREE.Vector3(backWaistRel.x + side * 0.205 * s, backWaistRel.y - 0.82 * s, backWaistRel.z - 0.232 * s),
      ];
      const tailGeo = trackGeo(
        createDrapedRibbonGeometry(
          tailPts,
          (t) => (0.030 + Math.sin(t * Math.PI) * 0.028) * s,
          36,
          4,
          new THREE.Vector3(side * 0.2, 0.1, -0.97),
          0.14,
        ),
      );
      const tailMesh = new THREE.Mesh(tailGeo, ribbonAquaMat);
      ribbonRoot.add(tailMesh);
      extraAnimatedNodes.trailRibbons.push(tailMesh);
      ctx.originalMeshMaterials.set(tailMesh, ribbonAquaMat);
    });

    attachToBoneWorld(humanoidBones.hips, ribbonRoot, hipsPos);
  }

  // ==================== 9. FOOTWEAR: CONTOURED OBSIDIAN & GOLD SANDALS (MEASURED FOOT & ANKLE FIT, ZERO CLIP) ====================
  (
    [
      { bone: humanoidBones.leftFoot, pos: lFootPos, side: 1 as const, rawXSign: -1 },
      { bone: humanoidBones.rightFoot, pos: rFootPos, side: -1 as const, rawXSign: 1 },
    ] as const
  ).forEach(({ bone, pos, side, rawXSign }) => {
    if (!bone) return;
    const shoeRoot = new THREE.Group();
    shoeRoot.name = `Fleurdelys_Heel_${side === 1 ? 'L' : 'R'}`;
    const footBottomY = -pos.y;

    // Measure actual bare foot ankle radius so straps hug snugly without floating or slicing into skin
    const ankleSlice = rawBodyAllSamples.filter(
      (p) => p.x * rawXSign > 0.01 && p.y > 0.085 && p.y < 0.135,
    );
    let ankleR = 0.027;
    if (ankleSlice.length > 4) {
      let ax = 0;
      let az = 0;
      ankleSlice.forEach((p) => {
        ax += p.x;
        az += p.z;
      });
      ax /= ankleSlice.length;
      az /= ankleSlice.length;
      const maxAnkle = Math.max(...ankleSlice.map((p) => Math.hypot(p.x - ax, p.z - az)));
      ankleR = THREE.MathUtils.clamp(maxAnkle, 0.022, 0.034);
    }

    // Sleek contoured sandal sole seated cleanly beneath the bare foot underside (zero heel/sole poke-through!)
    const soleHeelY = footBottomY + 0.014 * s;
    const soleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, soleHeelY, -0.044 * s),
      new THREE.Vector3(0, footBottomY + 0.009 * s, 0.002 * s),
      new THREE.Vector3(0, footBottomY + 0.005 * s, 0.056 * s),
      new THREE.Vector3(0, footBottomY + 0.007 * s, 0.104 * s),
    ]);
    const soleGeo = trackGeo(
      createDrapedRibbonGeometry(
        soleCurve.getPoints(12),
        (t) => (0.034 + Math.sin(t * Math.PI * 0.85) * 0.014 - Math.pow(t, 2.4) * 0.018) * s,
        16,
        3,
        new THREE.Vector3(0, 1, 0),
        0.04,
      ),
    );
    const sole = new THREE.Mesh(soleGeo, satinObsidianMat);
    sole.castShadow = true;
    shoeRoot.add(sole);
    ctx.originalMeshMaterials.set(sole, satinObsidianMat);

    // Sculpted gold low-stiletto heel post seated flush underneath the sole (never pokes above soleHeelY!)
    const heelH = 0.015 * s;
    const heel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0095 * s, 0.0055 * s, heelH, 10)), goldFiligreeMat);
    heel.position.set(0, footBottomY + heelH * 0.5, -0.042 * s);
    heel.castShadow = true;
    shoeRoot.add(heel);
    ctx.originalMeshMaterials.set(heel, goldFiligreeMat);

    // Contoured rear heel counter hugging outside the back of the bare heel
    const cup = new THREE.Mesh(
      trackGeo(
        new THREE.CylinderGeometry(
          (ankleR + 0.003) * s,
          (ankleR + 0.001) * s,
          0.038 * s,
          16,
          1,
          true,
          Math.PI * 0.62,
          Math.PI * 0.76,
        ),
      ),
      satinObsidianMat,
    );
    cup.position.set(0, footBottomY + 0.036 * s, -0.022 * s);
    shoeRoot.add(cup);
    ctx.originalMeshMaterials.set(cup, satinObsidianMat);

    // Snug instep & ankle straps scaled to the measured ankle radius
    [
      { yOff: 0.038, zOff: 0.042, r: ankleR + 0.0045, tilt: 0.34, mat: satinObsidianMat, tube: 0.0024 },
      { yOff: 0.072, zOff: 0.006, r: ankleR + 0.0032, tilt: 0.14, mat: goldFiligreeMat, tube: 0.0022 },
      { yOff: 0.098, zOff: -0.008, r: ankleR + 0.0024, tilt: -0.08, mat: goldFiligreeMat, tube: 0.0019 },
    ].forEach((st) => {
      const strapGeo = trackGeo(new THREE.TorusGeometry(st.r * s, st.tube * s, 8, 24));
      strapGeo.rotateX(Math.PI / 2 - st.tilt);
      const strap = new THREE.Mesh(strapGeo, st.mat);
      strap.position.set(0, footBottomY + st.yOff * s, st.zOff * s);
      shoeRoot.add(strap);
      ctx.originalMeshMaterials.set(strap, st.mat);
    });

    const gem = new THREE.Mesh(trackGeo(createFourPointStarGeometry(0.0088 * s, 0.0024 * s)), blueCrystalMat);
    gem.position.set(0, footBottomY + 0.076 * s, (ankleR + 0.011) * s);
    shoeRoot.add(gem);
    ctx.originalMeshMaterials.set(gem, blueCrystalMat);

    // Subtle sapphire heel-cap crystal accent seated flush on rear heel counter
    const heelGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.0046 * s, 0)), blueCrystalMat);
    heelGem.position.set(0, footBottomY + 0.036 * s, -(ankleR + 0.026) * s);
    shoeRoot.add(heelGem);
    ctx.originalMeshMaterials.set(heelGem, blueCrystalMat);

    attachToBoneWorld(bone, shoeRoot, pos);
  });

  // ==================== 10. MULTI-FACETED AZURE CRYSTAL GREATSWORD ====================
  const swordGroup = new THREE.Group();
  swordGroup.name = 'Fleurdelys_CrystalGreatsword';

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.046 * s, 0.13 * s);
  bladeShape.lineTo(0.032 * s, 0.9 * s);
  bladeShape.lineTo(0, 1.12 * s);
  bladeShape.lineTo(-0.032 * s, 0.9 * s);
  bladeShape.lineTo(-0.046 * s, 0.13 * s);
  bladeShape.closePath();

  const bladeGeo = trackGeo(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.01 * s,
      bevelEnabled: true,
      bevelThickness: 0.01 * s,
      bevelSize: 0.006 * s,
      bevelSegments: 2,
    }),
  );
  bladeGeo.center();
  const bladeMesh = new THREE.Mesh(bladeGeo, blueCrystalMat);
  bladeMesh.position.set(0, 0.55 * s, 0);
  bladeMesh.castShadow = true;
  swordGroup.add(bladeMesh);
  ctx.originalMeshMaterials.set(bladeMesh, blueCrystalMat);

  const fullerMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0035 * s, 0.005 * s, 0.85 * s, 6)), starSparkleMat);
  fullerMesh.position.set(0, 0.52 * s, 0);
  swordGroup.add(fullerMesh);
  ctx.originalMeshMaterials.set(fullerMesh, starSparkleMat);

  const guardGeo = trackGeo(new THREE.TorusGeometry(0.072 * s, 0.0105 * s, 8, 22, Math.PI));
  guardGeo.rotateZ(Math.PI);
  const guardMesh = new THREE.Mesh(guardGeo, silverArmorMat);
  guardMesh.position.set(0, -0.02 * s, 0);
  swordGroup.add(guardMesh);
  ctx.originalMeshMaterials.set(guardMesh, silverArmorMat);

  ([-1, 1] as const).forEach((side) => {
    const gSpur = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.008 * s, 0.065 * s, 5)), blueCrystalMat);
    gSpur.position.set(side * 0.072 * s, 0.015 * s, 0);
    gSpur.rotation.z = side * -0.45;
    swordGroup.add(gSpur);
    ctx.originalMeshMaterials.set(gSpur, blueCrystalMat);
  });

  const guardStar = new THREE.Mesh(trackGeo(createFourPointStarGeometry(0.026 * s, 0.006 * s)), goldFiligreeMat);
  guardStar.position.set(0, 0.005 * s, 0.012 * s);
  swordGroup.add(guardStar);
  ctx.originalMeshMaterials.set(guardStar, goldFiligreeMat);

  // Inner radiant sapphire halo ring at greatsword crossguard core
  const guardHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.036 * s, 0.0032 * s, 8, 24)), starSparkleMat);
  guardHalo.position.set(0, 0.005 * s, 0.008 * s);
  swordGroup.add(guardHalo);
  ctx.originalMeshMaterials.set(guardHalo, starSparkleMat);

  const gripMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012 * s, 0.0145 * s, 0.23 * s, 10)), satinObsidianMat);
  gripMesh.position.set(0, -0.145 * s, 0);
  swordGroup.add(gripMesh);
  ctx.originalMeshMaterials.set(gripMesh, satinObsidianMat);

  // Wrapped 24K gold filigree bands along sword grip
  [-0.08, -0.145, -0.21].forEach((gy) => {
    const bandGeo = trackGeo(new THREE.TorusGeometry(0.0142 * s, 0.0022 * s, 6, 18));
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, goldFiligreeMat);
    band.position.set(0, gy * s, 0);
    swordGroup.add(band);
    ctx.originalMeshMaterials.set(band, goldFiligreeMat);
  });

  const pommelMesh = new THREE.Mesh(trackGeo(createFourPointStarGeometry(0.028 * s, 0.006 * s)), goldFiligreeMat);
  pommelMesh.position.set(0, -0.275 * s, 0);
  swordGroup.add(pommelMesh);
  ctx.originalMeshMaterials.set(pommelMesh, goldFiligreeMat);

  // Position greatsword cleanly clear of flowing back hair wings and cathedral cape train
  const swordWorldPos = new THREE.Vector3(-0.56 * s, 0.96 * s, -0.28 * s);
  const swordWorldQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, -0.24, 0.18));
  const rootScale = character.scale.x || 1;
  const rootQuatInv = character.quaternion.clone().invert();
  character.worldToLocal(swordWorldPos);
  swordGroup.position.copy(swordWorldPos);
  swordGroup.quaternion.copy(rootQuatInv).multiply(swordWorldQuat);
  swordGroup.scale.setScalar(1 / rootScale);
  character.add(swordGroup);
  extraAnimatedNodes.swordGroup = swordGroup;
}
