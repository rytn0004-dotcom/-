import * as THREE from 'three';
import type { CharacterModelData, PosePreset } from './characterLoader';

export type MmdLimbKey =
  | 'head'
  | 'neck'
  | 'upperBody'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'leftThigh'
  | 'leftKnee'
  | 'rightThigh'
  | 'rightKnee';

export interface MmdMorphInfo {
  index: number;
  name: string;
  panel: 'brow' | 'eye' | 'lip' | 'other';
}

export interface MmdLimbInfo {
  key: MmdLimbKey;
  label: string;
  boneName: string;
}

export type MmdDanceId = 'none' | 'apt' | 'ojousama' | 'groove' | 'idol' | 'waltz' | 'vmd';

export interface MmdControllerApi {
  morphs: MmdMorphInfo[];
  availableLimbs: MmdLimbInfo[];
  getMorphWeight: (index: number) => number;
  setMorphWeight: (index: number, value: number) => void;
  resetAllMorphs: () => void;
  getLimbRotationDeg: (key: MmdLimbKey) => { x: number; y: number; z: number };
  setLimbRotationDeg: (key: MmdLimbKey, axis: 'x' | 'y' | 'z', deg: number) => void;
  resetAllLimbs: () => void;
  applyMmdPose: (pose: PosePreset | 'reset') => void;
  applyMmdExpression: (preset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' | 'blink') => void;
  setAutoBlink: (enabled: boolean) => void;
  setDance: (dance: MmdDanceId) => void;
  getDance: () => MmdDanceId;
  setDanceSpeed: (speed: number) => void;
  getDanceSpeed: () => number;
  loadVmdMotion: (file: File) => Promise<{ name: string; durationSec: number }>;
  getLoadedVmdName: () => string | null;
}

interface ParsedVertexMorph {
  index: number;
  name: string;
  panel: 'brow' | 'eye' | 'lip' | 'other';
  kind: 'vertex' | 'group';
  vertIndices?: Uint32Array;
  vertDeltas?: Float32Array;
  subMorphs?: Array<{ index: number; weight: number }>;
}

class PmxReader {
  private view: DataView;
  private offset = 0;
  private decoderUtf16 = new TextDecoder('utf-16le');
  private decoderUtf8 = new TextDecoder('utf-8');

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get pos(): number {
    return this.offset;
  }

  get byteLength(): number {
    return this.view.byteLength;
  }

  u8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }

  i8(): number {
    const v = this.view.getInt8(this.offset);
    this.offset += 1;
    return v;
  }

  u16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }

  i16(): number {
    const v = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return v;
  }

  u32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  i32(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }

  f32(): number {
    const v = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return v;
  }

  skip(bytes: number): void {
    this.offset += bytes;
  }

  readIndex(size: number, unsigned = false): number {
    if (size === 1) return unsigned ? this.u8() : this.i8();
    if (size === 2) return unsigned ? this.u16() : this.i16();
    return unsigned ? this.u32() : this.i32();
  }

  readText(encoding: number): string {
    const len = this.i32();
    if (len <= 0) return '';
    const slice = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return encoding === 0 ? this.decoderUtf16.decode(slice) : this.decoderUtf8.decode(slice);
  }
}

function normalizePmxPath(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .trim()
    .toLowerCase();
}

function matchBoneKey(nameJp: string, nameEn: string): MmdLimbKey | null {
  const jp = nameJp.trim();
  const en = nameEn.trim().toLowerCase();

  if (jp === '頭' || jp === '头' || en === 'head') return 'head';
  if (jp === '首' || jp === '颈' || en === 'neck') return 'neck';
  if (jp === '上半身' || jp === '上半身2' || en === 'upper body' || en === 'upperbody') return 'upperBody';

  if (jp === '左腕' || en === 'left arm' || en === 'arm_l') return 'leftUpperArm';
  if (jp === '左ひじ' || jp === '左肘' || en === 'left elbow' || en === 'elbow_l') return 'leftForearm';
  if (jp === '右腕' || en === 'right arm' || en === 'arm_r') return 'rightUpperArm';
  if (jp === '右ひじ' || jp === '右肘' || en === 'right elbow' || en === 'elbow_r') return 'rightForearm';

  if (jp === '左足' || jp === '左大腿' || en === 'left leg' || en === 'leg_l') return 'leftThigh';
  if (jp === '左ひざ' || jp === '左膝' || en === 'left knee' || en === 'knee_l') return 'leftKnee';
  if (jp === '右足' || jp === '右大腿' || en === 'right leg' || en === 'leg_r') return 'rightThigh';
  if (jp === '右ひざ' || jp === '右膝' || en === 'right knee' || en === 'knee_r') return 'rightKnee';

  return null;
}

const LIMB_LABELS: Record<MmdLimbKey, string> = {
  head: '頭部 (Head)',
  neck: '頸部 (Neck)',
  upperBody: '上半身 (Torso)',
  leftUpperArm: '左上臂 (L-Arm)',
  leftForearm: '左前臂/肘 (L-Elbow)',
  rightUpperArm: '右上臂 (R-Arm)',
  rightForearm: '右前臂/肘 (R-Elbow)',
  leftThigh: '左大腿 (L-Leg)',
  leftKnee: '左小腿/膝 (L-Knee)',
  rightThigh: '右大腿 (R-Leg)',
  rightKnee: '右小腿/膝 (R-Knee)',
};

const LIMB_ORDER: MmdLimbKey[] = [
  'head',
  'neck',
  'upperBody',
  'leftUpperArm',
  'leftForearm',
  'rightUpperArm',
  'rightForearm',
  'leftThigh',
  'leftKnee',
  'rightThigh',
  'rightKnee',
];

/**
 * Loads an official MMD (.pmx) model folder directly in the browser with full Skeleton skinning,
 * real-time limb articulation, vertex/group facial morphs, poses, and PBR/Clay/Wireframe modes.
 */
export async function loadPmxFolderModel(
  files: FileList | File[],
  targetHeight = 2.48,
): Promise<{ data: CharacterModelData; displayName: string; mmdController: MmdControllerApi }> {
  const fileArr = Array.from(files);
  const pmxFile = fileArr.find((f) => f.name.toLowerCase().endsWith('.pmx'));
  if (!pmxFile) {
    throw new Error('資料夾中找不到 .pmx 模型檔案，請選擇包含 .pmx 與 textures 的完整模型資料夾。');
  }

  const blobUrls: string[] = [];
  const fileLookup = new Map<string, string>();
  const baseNameLookup = new Map<string, string>();

  const pmxRel = normalizePmxPath((pmxFile as any).webkitRelativePath || pmxFile.name);
  const pmxDirPrefix = pmxRel.includes('/') ? pmxRel.slice(0, pmxRel.lastIndexOf('/') + 1) : '';

  for (const f of fileArr) {
    const lowerName = f.name.toLowerCase();
    if (!/\.(png|jpg|jpeg|webp|bmp|gif)$/.test(lowerName)) continue;
    const url = URL.createObjectURL(f);
    blobUrls.push(url);

    const rel = normalizePmxPath((f as any).webkitRelativePath || f.name);
    fileLookup.set(rel, url);
    if (pmxDirPrefix && rel.startsWith(pmxDirPrefix)) {
      fileLookup.set(rel.slice(pmxDirPrefix.length), url);
    }
    if (!baseNameLookup.has(lowerName)) {
      baseNameLookup.set(lowerName, url);
    }
  }

  const buffer = await pmxFile.arrayBuffer();
  const r = new PmxReader(buffer);

  // 1. Header
  const magic = String.fromCharCode(r.u8(), r.u8(), r.u8(), r.u8());
  if (magic !== 'PMX ') {
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
    throw new Error('不支援的檔案格式（僅支援 PMX 2.0 / 2.1 模型檔）。');
  }
  r.f32(); // version
  const globalsCount = r.u8();
  const globals: number[] = [];
  for (let i = 0; i < globalsCount; i++) globals.push(r.u8());

  const encoding = globals[0] ?? 0; // 0 = UTF-16LE, 1 = UTF-8
  const additionalVec4 = globals[1] ?? 0;
  const vertexIndexSize = globals[2] ?? 4;
  const textureIndexSize = globals[3] ?? 1;
  const materialIndexSize = globals[4] ?? 1;
  const boneIndexSize = globals[5] ?? 2;
  const morphIndexSize = globals[6] ?? 2;
  const rigidBodyIndexSize = globals[7] ?? 2;

  // 2. Model Info
  const modelNameJp = r.readText(encoding);
  const modelNameEn = r.readText(encoding);
  r.readText(encoding); // commentJP
  r.readText(encoding); // commentEN

  // 3. Vertices + Skinning Weights
  const vertexCount = r.i32();
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const px = r.f32();
    const py = r.f32();
    const pz = r.f32();
    const nx = r.f32();
    const ny = r.f32();
    const nz = r.f32();
    const u = r.f32();
    const v = r.f32();

    // Convert PMX left-handed (+Z away) to Three.js right-handed (+Z toward camera)
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = -pz;

    normals[i * 3] = nx;
    normals[i * 3 + 1] = ny;
    normals[i * 3 + 2] = -nz;

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;

    if (additionalVec4 > 0) {
      r.skip(additionalVec4 * 16);
    }

    const weightType = r.u8();
    const bi4 = i * 4;
    if (weightType === 0) {
      // BDEF1
      const b0 = Math.max(0, r.readIndex(boneIndexSize, false));
      skinIndices[bi4] = b0;
      skinWeights[bi4] = 1.0;
    } else if (weightType === 1) {
      // BDEF2
      const b0 = Math.max(0, r.readIndex(boneIndexSize, false));
      const b1 = Math.max(0, r.readIndex(boneIndexSize, false));
      const w0 = THREE.MathUtils.clamp(r.f32(), 0, 1);
      skinIndices[bi4] = b0;
      skinIndices[bi4 + 1] = b1;
      skinWeights[bi4] = w0;
      skinWeights[bi4 + 1] = 1 - w0;
    } else if (weightType === 2 || weightType === 4) {
      // BDEF4 / QDEF
      const b0 = Math.max(0, r.readIndex(boneIndexSize, false));
      const b1 = Math.max(0, r.readIndex(boneIndexSize, false));
      const b2 = Math.max(0, r.readIndex(boneIndexSize, false));
      const b3 = Math.max(0, r.readIndex(boneIndexSize, false));
      let w0 = Math.max(0, r.f32());
      let w1 = Math.max(0, r.f32());
      let w2 = Math.max(0, r.f32());
      let w3 = Math.max(0, r.f32());
      const sum = w0 + w1 + w2 + w3;
      if (sum > 0.0001) {
        w0 /= sum;
        w1 /= sum;
        w2 /= sum;
        w3 /= sum;
      } else {
        w0 = 1;
        w1 = w2 = w3 = 0;
      }
      skinIndices[bi4] = b0;
      skinIndices[bi4 + 1] = b1;
      skinIndices[bi4 + 2] = b2;
      skinIndices[bi4 + 3] = b3;
      skinWeights[bi4] = w0;
      skinWeights[bi4 + 1] = w1;
      skinWeights[bi4 + 2] = w2;
      skinWeights[bi4 + 3] = w3;
    } else if (weightType === 3) {
      // SDEF
      const b0 = Math.max(0, r.readIndex(boneIndexSize, false));
      const b1 = Math.max(0, r.readIndex(boneIndexSize, false));
      const w0 = THREE.MathUtils.clamp(r.f32(), 0, 1);
      r.skip(36); // C, R0, R1 vec3s
      skinIndices[bi4] = b0;
      skinIndices[bi4 + 1] = b1;
      skinWeights[bi4] = w0;
      skinWeights[bi4 + 1] = 1 - w0;
    }
    r.f32(); // edgeScale
  }

  const restPositions = new Float32Array(positions);

  // 4. Face Indices
  const indexCount = r.i32();
  const indices = new Uint32Array(indexCount);
  for (let i = 0; i < indexCount; i += 3) {
    const i0 = r.readIndex(vertexIndexSize, true);
    const i1 = r.readIndex(vertexIndexSize, true);
    const i2 = r.readIndex(vertexIndexSize, true);
    indices[i] = i0;
    indices[i + 1] = i2;
    indices[i + 2] = i1;
  }

  // 5. Textures
  const texCount = r.i32();
  const texPaths: string[] = [];
  for (let i = 0; i < texCount; i++) {
    texPaths.push(r.readText(encoding));
  }

  const texLoader = new THREE.TextureLoader();
  const loadedTextures: (THREE.Texture | null)[] = new Array(texCount).fill(null);

  await Promise.all(
    texPaths.map(async (rawPath, idx) => {
      const norm = normalizePmxPath(rawPath);
      const base = norm.includes('/') ? norm.slice(norm.lastIndexOf('/') + 1) : norm;
      const url = fileLookup.get(norm) || baseNameLookup.get(base);
      if (!url) return;
      try {
        const tex = await texLoader.loadAsync(url);
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 8;
        loadedTextures[idx] = tex;
      } catch {
        // Ignore non-standard texture format
      }
    }),
  );

  // 6. Materials
  const matCount = r.i32();
  const geometry = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', posAttr);
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  const materials: THREE.MeshPhysicalMaterial[] = [];
  let indexOffset = 0;

  for (let m = 0; m < matCount; m++) {
    const matNameJp = r.readText(encoding);
    const matNameEn = r.readText(encoding);
    const dr = r.f32();
    const dg = r.f32();
    const db = r.f32();
    const da = r.f32();
    r.f32(); r.f32(); r.f32(); // specular
    r.f32(); // shininess
    r.f32(); r.f32(); r.f32(); // ambient
    const bitFlag = r.u8();
    r.f32(); r.f32(); r.f32(); r.f32(); // edge RGBA
    r.f32(); // edge size
    const diffuseTexIdx = r.readIndex(textureIndexSize, false);
    r.readIndex(textureIndexSize, false); // sphereTexIdx
    r.u8(); // sphereMode
    const toonFlag = r.u8();
    if (toonFlag === 0) r.readIndex(textureIndexSize, false);
    else r.u8();
    r.readText(encoding); // memo
    const matIndexCount = r.i32();

    const matName = matNameJp || matNameEn || `PMX_Mat_${m}`;
    const map = diffuseTexIdx >= 0 && diffuseTexIdx < loadedTextures.length ? loadedTextures[diffuseTexIdx] : null;
    const isDoubleSide = (bitFlag & 0x01) !== 0;
    const lowerMat = matName.toLowerCase();
    const isFaceOrSkin = /face|skin|body|颜|顔|肌|皮肤|脸|眼/.test(lowerMat);
    const isHair = /hair|bang|髪|发|刘海/.test(lowerMat);
    const isAlphaMat = da < 0.98 || /alpha|eyehi|lash|眉|睫|透|效|光|影/.test(lowerMat);

    const physMat = new THREE.MeshPhysicalMaterial({
      name: matName,
      color: new THREE.Color(Math.min(1, dr), Math.min(1, dg), Math.min(1, db)),
      map,
      opacity: Math.max(0, Math.min(1, da)),
      transparent: da < 0.98,
      alphaTest: da >= 0.98 && isAlphaMat ? 0.25 : 0.0,
      roughness: isFaceOrSkin ? 0.56 : isHair ? 0.36 : 0.48,
      metalness: 0.04,
      sheen: isFaceOrSkin ? 0.24 : isHair ? 0.45 : 0.2,
      sheenColor: new THREE.Color(isFaceOrSkin ? 0xffe4e6 : 0xe0f2fe),
      side: isDoubleSide ? THREE.DoubleSide : THREE.FrontSide,
      envMapIntensity: isFaceOrSkin ? 0.55 : 0.78,
    });
    if (da <= 0.001) physMat.visible = false;

    materials.push(physMat);
    geometry.addGroup(indexOffset, matIndexCount, m);
    indexOffset += matIndexCount;
  }

  // 7. Bones (Full Skeleton Hierarchy for Limb Articulation & Poses!)
  const bones: THREE.Bone[] = [];
  const boneWorldPositions: THREE.Vector3[] = [];
  const boneParentIndices: number[] = [];
  const limbBones = new Map<MmdLimbKey, THREE.Bone>();

  if (r.pos + 4 <= r.byteLength) {
    const boneCount = r.i32();
    for (let b = 0; b < boneCount; b++) {
      const bNameJp = r.readText(encoding);
      const bNameEn = r.readText(encoding);
      const bx = r.f32();
      const by = r.f32();
      const bz = -r.f32(); // Negate Z to match Three.js right-handed mesh
      const parentIdx = r.readIndex(boneIndexSize, false);
      r.i32(); // deform layer
      const flags = r.u16();

      if (flags & 0x0001) r.skip(boneIndexSize);
      else r.skip(12);
      if (flags & 0x0100 || flags & 0x0200) r.skip(boneIndexSize + 4);
      if (flags & 0x0400) r.skip(12);
      if (flags & 0x0800) r.skip(24);
      if (flags & 0x2000) r.skip(4);
      if (flags & 0x0020) {
        // IK block
        r.skip(boneIndexSize + 4 + 4);
        const linkCount = r.i32();
        for (let lk = 0; lk < linkCount; lk++) {
          r.skip(boneIndexSize);
          const hasLimits = r.u8();
          if (hasLimits === 1) r.skip(24);
        }
      }

      const bone = new THREE.Bone();
      bone.name = bNameJp || bNameEn || `Bone_${b}`;
      bones.push(bone);
      boneWorldPositions.push(new THREE.Vector3(bx, by, bz));
      boneParentIndices.push(parentIdx);

      const matchedKey = matchBoneKey(bNameJp, bNameEn);
      if (matchedKey && !limbBones.has(matchedKey)) {
        limbBones.set(matchedKey, bone);
      }
    }
  }

  // Clamp any out-of-range skinIndices to safe bone count
  const safeMaxBone = Math.max(0, bones.length - 1);
  if (bones.length > 0) {
    for (let i = 0; i < skinIndices.length; i++) {
      if (skinIndices[i] > safeMaxBone) skinIndices[i] = 0;
    }
  }

  // Build parent-child bone tree & compute local relative offsets
  const rootBones: THREE.Bone[] = [];
  const boneByName = new Map<string, THREE.Bone>();
  const boneRestPos = new Map<THREE.Bone, THREE.Vector3>();
  for (let b = 0; b < bones.length; b++) {
    const pIdx = boneParentIndices[b];
    if (pIdx >= 0 && pIdx < bones.length && pIdx !== b) {
      bones[pIdx].add(bones[b]);
      bones[b].position.copy(boneWorldPositions[b]).sub(boneWorldPositions[pIdx]);
    } else {
      rootBones.push(bones[b]);
      bones[b].position.copy(boneWorldPositions[b]);
    }
    if (!boneByName.has(bones[b].name)) boneByName.set(bones[b].name, bones[b]);
    boneRestPos.set(bones[b], bones[b].position.clone());
  }

  // 8. Morphs (Facial Expressions — Vertex & Group Morphs!)
  const parsedMorphs: ParsedVertexMorph[] = [];
  const morphByIndex = new Map<number, ParsedVertexMorph>();

  if (r.pos + 4 <= r.byteLength) {
    const morphCount = r.i32();
    for (let m = 0; m < morphCount; m++) {
      const mNameJp = r.readText(encoding);
      const mNameEn = r.readText(encoding);
      const panelCode = r.u8();
      const morphType = r.u8();
      const offsetCount = r.i32();

      const panel: MmdMorphInfo['panel'] =
        panelCode === 1 ? 'brow' : panelCode === 2 ? 'eye' : panelCode === 3 ? 'lip' : 'other';
      const labelName = mNameJp || mNameEn || `Morph_${m}`;

      if (morphType === 1) {
        // Vertex Morph (dx, dy, -dz)
        const vIdx = new Uint32Array(offsetCount);
        const vDelta = new Float32Array(offsetCount * 3);
        for (let k = 0; k < offsetCount; k++) {
          vIdx[k] = r.readIndex(vertexIndexSize, true);
          vDelta[k * 3] = r.f32();
          vDelta[k * 3 + 1] = r.f32();
          vDelta[k * 3 + 2] = -r.f32();
        }
        const pm: ParsedVertexMorph = {
          index: m,
          name: labelName,
          panel,
          kind: 'vertex',
          vertIndices: vIdx,
          vertDeltas: vDelta,
        };
        parsedMorphs.push(pm);
        morphByIndex.set(m, pm);
      } else if (morphType === 0) {
        // Group Morph
        const subs: Array<{ index: number; weight: number }> = [];
        for (let k = 0; k < offsetCount; k++) {
          const sIdx = r.readIndex(morphIndexSize, false);
          const sWeight = r.f32();
          subs.push({ index: sIdx, weight: sWeight });
        }
        const pm: ParsedVertexMorph = {
          index: m,
          name: labelName,
          panel,
          kind: 'group',
          subMorphs: subs,
        };
        parsedMorphs.push(pm);
        morphByIndex.set(m, pm);
      } else if (morphType === 2) {
        // Bone morph
        r.skip(offsetCount * (boneIndexSize + 28));
      } else if (morphType >= 3 && morphType <= 7) {
        // UV morphs
        r.skip(offsetCount * (vertexIndexSize + 16));
      } else if (morphType === 8) {
        // Material morph
        r.skip(offsetCount * (materialIndexSize + 1 + 112));
      } else if (morphType === 9) {
        // Flip morph (PMX 2.1)
        r.skip(offsetCount * (morphIndexSize + 4));
      } else if (morphType === 10) {
        // Impulse morph (PMX 2.1)
        r.skip(offsetCount * (rigidBodyIndexSize + 1 + 24));
      } else {
        // Unknown morph type; stop safely
        break;
      }
    }
  }

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // Create SkinnedMesh if bones exist, otherwise fallback to Mesh
  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
  let skeletonHelper: THREE.SkeletonHelper | null = null;
  const skinnedMeshes: THREE.SkinnedMesh[] = [];

  if (bones.length > 0) {
    const skMesh = new THREE.SkinnedMesh(geometry, materials);
    rootBones.forEach((rb) => skMesh.add(rb));
    const skeleton = new THREE.Skeleton(bones);
    skMesh.bind(skeleton);
    skMesh.frustumCulled = false;
    mesh = skMesh as unknown as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    skinnedMeshes.push(skMesh);
    skeletonHelper = new THREE.SkeletonHelper(skMesh);
    skeletonHelper.visible = false;
  } else {
    mesh = new THREE.Mesh(geometry, materials);
  }

  mesh.name = modelNameJp || modelNameEn || pmxFile.name;
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  const character = new THREE.Group();
  character.name = 'PMX_Imported_Character';
  character.add(mesh);
  if (skeletonHelper) character.add(skeletonHelper);

  // Auto-scale to targetHeight and ground feet at Y = 0
  const rawBox = new THREE.Box3().setFromObject(mesh);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const scaleFactor = rawSize.y > 0.001 ? targetHeight / rawSize.y : 1;
  mesh.scale.setScalar(scaleFactor);
  character.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(mesh);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  mesh.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);
  character.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(mesh);
  const dimensions = finalBox.getSize(new THREE.Vector3());
  const center = finalBox.getCenter(new THREE.Vector3());

  // ==================== REAL-TIME MORPH ENGINE ====================
  const morphWeights = new Map<number, number>();
  let morphDirty = false;
  let autoBlinkEnabled = true;
  let blinkMorphIndex: number | null = null;
  const blinkCandidate = parsedMorphs.find((m) => /^(まばたき|眨眼|blink)$/i.test(m.name));
  if (blinkCandidate) blinkMorphIndex = blinkCandidate.index;

  const accumulateMorph = (mIdx: number, weight: number, depth = 0) => {
    if (Math.abs(weight) < 0.0005 || depth > 3) return;
    const pm = morphByIndex.get(mIdx);
    if (!pm) return;
    if (pm.kind === 'vertex' && pm.vertIndices && pm.vertDeltas) {
      const viArr = pm.vertIndices;
      const vdArr = pm.vertDeltas;
      for (let k = 0; k < viArr.length; k++) {
        const vi = viArr[k];
        if (vi >= vertexCount) continue;
        const p3 = vi * 3;
        const d3 = k * 3;
        positions[p3] += vdArr[d3] * weight;
        positions[p3 + 1] += vdArr[d3 + 1] * weight;
        positions[p3 + 2] += vdArr[d3 + 2] * weight;
      }
    } else if (pm.kind === 'group' && pm.subMorphs) {
      for (const sub of pm.subMorphs) {
        accumulateMorph(sub.index, weight * sub.weight, depth + 1);
      }
    }
  };

  let lastAutoBlinkVal = 0;
  const rebuildMorphPositions = (extraBlink = 0) => {
    positions.set(restPositions);
    morphWeights.forEach((w, idx) => {
      if (idx === blinkMorphIndex) {
        accumulateMorph(idx, Math.min(1, Math.max(w, extraBlink)));
      } else {
        accumulateMorph(idx, w);
      }
    });
    if (blinkMorphIndex !== null && !morphWeights.has(blinkMorphIndex) && extraBlink > 0.001) {
      accumulateMorph(blinkMorphIndex, extraBlink);
    }
    posAttr.needsUpdate = true;
    morphDirty = false;
  };

  // ==================== REAL-TIME SILKY-SMOOTH LIMB, POSE & DANCE ENGINE ====================
  const limbRotDeg = new Map<MmdLimbKey, { x: number; y: number; z: number }>();
  LIMB_ORDER.forEach((k) => limbRotDeg.set(k, { x: 0, y: 0, z: 0 }));

  // Auto-discover extra core & extremity bones for fluid hierarchical follow-through
  const findExtraBone = (patterns: RegExp[]): THREE.Bone | undefined => {
    for (const pat of patterns) {
      const hit = bones.find((b) => pat.test(b.name));
      if (hit) return hit;
    }
    return undefined;
  };

  const extraBones = {
    upperBody2: findExtraBone([/^上半身2$/i, /upper.?body.?2/i, /^chest$/i]),
    lowerBody: findExtraBone([/^下半身$/i, /lower.?body/i, /^腰$/i, /^hips$/i]),
    leftShoulder: findExtraBone([/^左肩$/i, /left.?shoulder/i]),
    rightShoulder: findExtraBone([/^右肩$/i, /right.?shoulder/i]),
    leftWrist: findExtraBone([/^左手首$/i, /left.?wrist/i, /left.?hand$/i]),
    rightWrist: findExtraBone([/^右手首$/i, /right.?wrist/i, /right.?hand$/i]),
    leftAnkle: findExtraBone([/^左足首$/i, /left.?ankle/i, /left.?foot$/i]),
    rightAnkle: findExtraBone([/^右足首$/i, /right.?ankle/i, /right.?foot$/i]),
  };

  // Detect secondary hair / ribbon / skirt / sleeve bones with chain-depth attenuation & outward bias (zero clipping)
  const coreBoneSet = new Set<THREE.Bone>([
    ...limbBones.values(),
    ...(Object.values(extraBones).filter(Boolean) as THREE.Bone[]),
  ]);
  const secondaryBones: Array<{ bone: THREE.Bone; phase: number; amp: number; isSkirtOrBack: boolean }> = [];
  const secondaryPattern = /(髪|hair|スカ|skirt|袖|sleeve|リボン|ribbon|マント|cape|尾|tail|布|cloth|ヒラ|飾り|strap|stole|披)/i;
  const secondaryBoneSet = new Set<THREE.Bone>();
  bones.forEach((b) => {
    if (!coreBoneSet.has(b) && secondaryPattern.test(b.name)) {
      secondaryBoneSet.add(b);
    }
  });
  bones.forEach((b, idx) => {
    if (!secondaryBoneSet.has(b)) return;
    // Measure depth along secondary chain so multi-segment hair/skirt chains never over-accumulate & clip
    let depth = 0;
    let cur = b.parent;
    while (cur && cur instanceof THREE.Bone && secondaryBoneSet.has(cur)) {
      depth++;
      cur = cur.parent;
    }
    const isSkirtOrBack = /(スカ|skirt|マント|cape|尾|tail|布|cloth|披|後|back)/i.test(b.name);
    const baseAmp = /(髪|hair|リボン|ribbon)/i.test(b.name) ? 0.42 : 0.28;
    secondaryBones.push({
      bone: b,
      phase: (idx % 6) * 0.55 + depth * 0.35,
      amp: baseAmp / (1 + depth * 0.75),
      isSkirtOrBack,
    });
  });

  // Reusable scratch math objects (zero per-frame heap allocation -> eliminates GC micro-stutters)
  const _tmpEuler = new THREE.Euler(0, 0, 0, 'XYZ');
  const _tmpQuat = new THREE.Quaternion();
  const _identityQuat = new THREE.Quaternion();
  const _tmpPos = new THREE.Vector3();

  // C-infinity smooth shaping functions (zero sharp corners or velocity kinks)
  const smoothPulse = (rad: number): number => 0.5 - 0.5 * Math.cos(rad * 2);
  const smoothPos = (s: number): number => {
    const v = 0.5 * (s + Math.sqrt(s * s + 0.08)) - 0.1414;
    return v > 0 ? v * 1.16 : 0;
  };
  const smoothCurve = (t: number): number => t * t * (3 - 2 * t);

  const slerpBoneDeg = (
    bone: THREE.Bone | undefined,
    xDeg: number,
    yDeg: number,
    zDeg: number,
    slerpAlpha: number,
  ) => {
    if (!bone) return;
    _tmpEuler.set(
      THREE.MathUtils.degToRad(xDeg),
      THREE.MathUtils.degToRad(yDeg),
      THREE.MathUtils.degToRad(zDeg),
      'XYZ',
    );
    _tmpQuat.setFromEuler(_tmpEuler);
    if (slerpAlpha >= 0.999) {
      bone.quaternion.copy(_tmpQuat);
    } else {
      bone.quaternion.slerp(_tmpQuat, slerpAlpha);
    }
  };

  const applyLimbRotationsToBones = (breathOffsetX = 0, dt = 0, immediate = false) => {
    const alpha = immediate ? 1 : 1 - Math.exp(-10.5 * Math.max(dt, 0.001));
    limbBones.forEach((bone, key) => {
      const deg = limbRotDeg.get(key) || { x: 0, y: 0, z: 0 };
      const extraXDeg = key === 'upperBody' ? THREE.MathUtils.radToDeg(breathOffsetX) : 0;
      slerpBoneDeg(bone, deg.x + extraXDeg, deg.y, deg.z, alpha);
    });
    // Smoothly relax extra core/extremity bones back to rest when in static/pose mode
    const extraAlpha = immediate ? 1 : 1 - Math.exp(-8.5 * Math.max(dt, 0.001));
    Object.values(extraBones).forEach((b) => {
      if (!b) return;
      if (immediate) b.quaternion.identity();
      else b.quaternion.slerp(_identityQuat, extraAlpha);
    });
  };

  const resetAllLimbs = () => {
    LIMB_ORDER.forEach((k) => limbRotDeg.set(k, { x: 0, y: 0, z: 0 }));
  };

  const applyMmdPose = (pose: PosePreset | 'reset', immediate = false) => {
    resetAllLimbs();
    if (pose === 'reset' || pose === 'default') {
      // Relaxed natural standing A-pose (arms gently lowered from T-pose; -Z lowers left, +Z lowers right)
      if (pose === 'default') {
        limbRotDeg.set('leftUpperArm', { x: 4, y: -4, z: -42 });
        limbRotDeg.set('rightUpperArm', { x: 4, y: 4, z: 42 });
        limbRotDeg.set('leftForearm', { x: 0, y: -12, z: -6 });
        limbRotDeg.set('rightForearm', { x: 0, y: 12, z: 6 });
      }
    } else if (pose === 'graceful') {
      limbRotDeg.set('head', { x: 4, y: -8, z: 5 });
      limbRotDeg.set('upperBody', { x: 2, y: 7, z: -3 });
      limbRotDeg.set('leftUpperArm', { x: 6, y: -14, z: -48 });
      limbRotDeg.set('leftForearm', { x: 0, y: -28, z: 12 });
      limbRotDeg.set('rightUpperArm', { x: 8, y: 24, z: 42 });
      limbRotDeg.set('rightForearm', { x: 0, y: 46, z: -18 });
      limbRotDeg.set('leftThigh', { x: -6, y: 4, z: 3 });
      limbRotDeg.set('leftKnee', { x: 6, y: 0, z: 0 });
      limbRotDeg.set('rightThigh', { x: 5, y: -4, z: -4 });
      limbRotDeg.set('rightKnee', { x: 10, y: 0, z: 0 });
    } else if (pose === 'combat') {
      limbRotDeg.set('head', { x: 5, y: -14, z: 0 });
      limbRotDeg.set('upperBody', { x: 8, y: 18, z: 0 });
      limbRotDeg.set('leftUpperArm', { x: 10, y: -42, z: -28 });
      limbRotDeg.set('leftForearm', { x: 0, y: -64, z: 18 });
      limbRotDeg.set('rightUpperArm', { x: 8, y: 36, z: 36 });
      limbRotDeg.set('rightForearm', { x: 0, y: 58, z: -16 });
      limbRotDeg.set('leftThigh', { x: -18, y: 8, z: 10 });
      limbRotDeg.set('leftKnee', { x: 22, y: 0, z: 0 });
      limbRotDeg.set('rightThigh', { x: 12, y: -8, z: -10 });
      limbRotDeg.set('rightKnee', { x: 16, y: 0, z: 0 });
    } else if (pose === 'prayer') {
      limbRotDeg.set('head', { x: 9, y: 0, z: 0 });
      limbRotDeg.set('upperBody', { x: 4, y: 0, z: 0 });
      limbRotDeg.set('leftUpperArm', { x: 14, y: -48, z: -38 });
      limbRotDeg.set('leftForearm', { x: 0, y: -82, z: 24 });
      limbRotDeg.set('rightUpperArm', { x: 14, y: 48, z: 38 });
      limbRotDeg.set('rightForearm', { x: 0, y: 82, z: -24 });
    } else if (pose === 'greet') {
      limbRotDeg.set('head', { x: -3, y: 6, z: -6 });
      limbRotDeg.set('upperBody', { x: 0, y: -6, z: 3 });
      limbRotDeg.set('leftUpperArm', { x: 4, y: -8, z: -48 });
      limbRotDeg.set('leftForearm', { x: 0, y: -18, z: 8 });
      // Raise right arm gracefully to wave (+Z lowers, -Z raises right arm!)
      limbRotDeg.set('rightUpperArm', { x: 0, y: 24, z: -36 });
      limbRotDeg.set('rightForearm', { x: 0, y: 32, z: -54 });
    }
    if (immediate) applyLimbRotationsToBones(0, 0, true);
  };

  const setMorphByPattern = (pattern: RegExp, weight: number) => {
    const found = parsedMorphs.find((m) => pattern.test(m.name));
    if (found) {
      morphWeights.set(found.index, weight);
      morphDirty = true;
    }
  };

  const applyMmdExpression = (preset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' | 'blink') => {
    morphWeights.clear();
    if (preset === 'smile') {
      setMorphByPattern(/^(笑い|にこり|微笑|笑|smile)$/i, 0.78);
      setMorphByPattern(/^(にやり|わーい|あ|口角上げ)$/i, 0.35);
    } else if (preset === 'wink') {
      setMorphByPattern(/^(ウィンク|ウィンク右|ウィンク2|wink|眨眼)$/i, 0.95);
      setMorphByPattern(/^(にやり|笑い|あ|smile)$/i, 0.35);
    } else if (preset === 'surprised') {
      setMorphByPattern(/^(びっくり|見開き|驚|surprised)$/i, 0.85);
      setMorphByPattern(/^(お|あ|わ)$/i, 0.65);
    } else if (preset === 'shy') {
      setMorphByPattern(/^(照れ|赤面|頬染め|blush|shy)$/i, 0.85);
      setMorphByPattern(/^(困る|困り|悲しみ)$/i, 0.4);
      setMorphByPattern(/^(う|ん|ちっちゃい口)$/i, 0.35);
    } else if (preset === 'blink') {
      setMorphByPattern(/^(まばたき|閉目|眨眼|blink)$/i, 1.0);
    }
    morphDirty = true;
    rebuildMorphPositions(0);
  };

  // Apply natural relaxed standing pose immediately on first load
  applyMmdPose('default', true);

  // Clay & Wireframe support
  const clayMat = new THREE.MeshStandardMaterial({
    name: 'PMX_Studio_Clay',
    color: 0xd4dae2,
    roughness: 0.62,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  const setViewMode = (mode: 'pbr' | 'clay' | 'wireframe') => {
    if (mode === 'clay') {
      mesh.material = clayMat;
      clayMat.wireframe = false;
    } else if (mode === 'wireframe') {
      mesh.material = materials;
      materials.forEach((m) => {
        m.wireframe = true;
      });
    } else {
      mesh.material = materials;
      materials.forEach((m) => {
        m.wireframe = false;
      });
    }
  };

  const baseX = -scaledCenter.x;
  const baseY = mesh.position.y;
  let breathClock = 0;

  // ==================== TRENDING DANCE & VMD PLAYBACK ENGINE ====================
  let activeDance: MmdDanceId = 'none';
  let danceSpeed = 1.0;
  let danceClock = 0;
  let danceTransition = 1.0; // Ramps 0 -> 1 over ~0.35s for seamless dance/pose blending
  let needsFullSkeletonRelax = false;
  let loadedVmdName: string | null = null;

  interface VmdBoneKey {
    frame: number;
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
  }
  interface VmdMorphKey {
    frame: number;
    weight: number;
  }
  let vmdBoneTracks = new Map<THREE.Bone, VmdBoneKey[]>();
  let vmdMorphTracks = new Map<number, VmdMorphKey[]>();
  let vmdMaxFrame = 0;

  const morphByName = new Map<string, number>();
  parsedMorphs.forEach((m) => {
    if (!morphByName.has(m.name)) morphByName.set(m.name, m.index);
  });

  // Anti-clipping anatomical clearance clamp for dance motions (prevents arms piercing chest/hair & legs crossing)
  const setLimbSmooth = (key: MmdLimbKey, x: number, y: number, z: number, alpha: number) => {
    let cx = x;
    let cy = y;
    let cz = z;
    if (key === 'leftUpperArm') {
      cy = THREE.MathUtils.clamp(cy, -46, 2); // never swing behind back into hair/cape
      const minZ = cy < -22 ? -30 : -42;      // lift slightly when forward to clear bust/ribcage
      cz = THREE.MathUtils.clamp(cz, minZ, 52);
      cx = THREE.MathUtils.clamp(cx, -12, 16);
    } else if (key === 'rightUpperArm') {
      cy = THREE.MathUtils.clamp(cy, -2, 46);
      const maxZ = cy > 22 ? 30 : 42;
      cz = THREE.MathUtils.clamp(cz, -52, maxZ);
      cx = THREE.MathUtils.clamp(cx, -12, 16);
    } else if (key === 'leftForearm') {
      cy = THREE.MathUtils.clamp(cy, -64, -6); // clean natural inward bend, never pierces chest
      cz = THREE.MathUtils.clamp(cz, -8, 54);
      cx = THREE.MathUtils.clamp(cx, -10, 10);
    } else if (key === 'rightForearm') {
      cy = THREE.MathUtils.clamp(cy, 6, 64);
      cz = THREE.MathUtils.clamp(cz, -54, 8);
      cx = THREE.MathUtils.clamp(cx, -10, 10);
    } else if (key === 'leftThigh') {
      cx = THREE.MathUtils.clamp(cx, -20, 8);
      cy = THREE.MathUtils.clamp(cy, -8, 12);
      cz = THREE.MathUtils.clamp(cz, 3, 14); // keep thighs cleanly separated (zero thigh/skirt clipping)
    } else if (key === 'rightThigh') {
      cx = THREE.MathUtils.clamp(cx, -20, 8);
      cy = THREE.MathUtils.clamp(cy, -12, 8);
      cz = THREE.MathUtils.clamp(cz, -14, -3);
    } else if (key === 'leftKnee' || key === 'rightKnee') {
      cx = THREE.MathUtils.clamp(cx, 2, 28); // smooth bend without poking through long skirts
      cy = 0;
      cz = 0;
    } else if (key === 'head') {
      cx = THREE.MathUtils.clamp(cx, -9, 11);
      cy = THREE.MathUtils.clamp(cy, -14, 14);
      cz = THREE.MathUtils.clamp(cz, -10, 10);
    } else if (key === 'neck') {
      cx = THREE.MathUtils.clamp(cx, -5, 6);
      cy = THREE.MathUtils.clamp(cy, -8, 8);
      cz = THREE.MathUtils.clamp(cz, -6, 6);
    }
    slerpBoneDeg(limbBones.get(key), cx, cy, cz, alpha);
  };

  const relaxNonCoreBones = (dt: number) => {
    const a = 1 - Math.exp(-7.5 * dt);
    let maxDiff = 0;
    bones.forEach((b) => {
      if (coreBoneSet.has(b)) return;
      const rp = boneRestPos.get(b);
      if (rp) b.position.lerp(rp, a);
      const dot = Math.abs(b.quaternion.dot(_identityQuat));
      if (dot < 0.9998) {
        b.quaternion.slerp(_identityQuat, a);
        maxDiff = Math.max(maxDiff, 1 - dot);
      }
    });
    if (maxDiff < 0.0005) needsFullSkeletonRelax = false;
  };

  const updateSecondaryFollowThrough = (swayVel: number, bounceVel: number, tSec: number, dt: number) => {
    if (secondaryBones.length === 0) return;
    // Soft low-pass damping so hair/skirts glide slowly without ever jittering or clipping into body
    const a = 1 - Math.exp(-5.5 * dt);
    for (let i = 0; i < secondaryBones.length; i++) {
      const sb = secondaryBones[i];
      // Bias slightly outward/back (+X) so hair & skirts flow away from torso/legs, never inward
      const outwardBias = sb.isSkirtOrBack ? 1.8 : 0.8;
      const waveX = outwardBias + (Math.max(-0.4, bounceVel) * 3.8 + Math.sin(tSec * 1.6 + sb.phase) * 1.4) * sb.amp;
      const waveZ = (-swayVel * 5.2 + Math.cos(tSec * 1.3 + sb.phase) * 1.2) * sb.amp;
      slerpBoneDeg(sb.bone, THREE.MathUtils.clamp(waveX, -1.5, 6.5), 0, THREE.MathUtils.clamp(waveZ, -4.5, 4.5), a);
    }
  };

  // Smooth periodic phase weight for blending multi-bar choreography phrases without any sharp cuts
  const phraseBlend = (beatInCycle: number, startBeat: number, endBeat: number, fade = 0.95): number => {
    const fadeIn = THREE.MathUtils.clamp((beatInCycle - startBeat) / fade, 0, 1);
    const fadeOut = THREE.MathUtils.clamp((endBeat - beatInCycle) / fade, 0, 1);
    return smoothCurve(fadeIn) * smoothCurve(fadeOut);
  };

  // Right-handed PMX convention (+X = char's LEFT, +Y = UP, +Z = FRONT toward camera):
  // Every dance uses calm, readable musical phrasing, generous torso/bust/skirt clearance, and silky damping.
  const applyProceduralDanceFrame = (dance: MmdDanceId, tSec: number, dt: number) => {
    danceTransition = Math.min(1, danceTransition + dt * 2.2);
    // Smooth critically-damped tracking (no high-frequency snap or jitter)
    const stiffness = 6.2 + smoothCurve(danceTransition) * 5.8;
    const alpha = 1 - Math.exp(-stiffness * dt);
    const rootAlpha = 1 - Math.exp(-8.5 * dt);

    let targetX = baseX;
    let targetY = baseY;
    let swayVel = 0;
    let bounceVel = 0;

    if (dance === 'apt') {
      // ==================== APT. (Rosé & Bruno Mars · 132 BPM Silky Groove) ====================
      // Phrase A (0-8): Iconic "Apateu" alternating chest-front hand-stacking (generous chest clearance)
      // Phrase B (8-12): Smooth gather-to-front -> stylish side-open swagger
      // Phrase C (12-16): Alternating upbeat high cheer-pumps with clean head groove
      const bpm = 132;
      const totalBeats = 16;
      const beatF = (tSec * bpm) / 60;
      const cyc = beatF % totalBeats;
      const rad = beatF * Math.PI * 2;
      const halfRad = rad * 0.5;
      const bounce = smoothPulse(halfRad); // smooth 1-beat musical bounce (no rapid buzz)

      const wStack = phraseBlend(cyc, 0, 8.5, 0.95) + (cyc > 15.05 ? smoothCurve((cyc - 15.05) / 0.95) : 0);
      const wPush = phraseBlend(cyc, 7.5, 12.5, 0.95);
      const wPump = phraseBlend(cyc, 11.5, 16.0, 0.95);
      const wSum = Math.max(0.001, wStack + wPush + wPump);
      const blend3 = (a: number, b: number, c: number) => (a * wStack + b * wPush + c * wPump) / wSum;

      targetY = baseY - 0.012 + bounce * 0.036;
      targetX = baseX + Math.sin(halfRad) * 0.068;
      swayVel = Math.cos(halfRad);
      bounceVel = Math.sin(rad) * 0.65;

      // Calm hip-led groove with zero neck/head jitter
      slerpBoneDeg(extraBones.lowerBody, 2 + bounce * 3, Math.sin(halfRad) * 10, -Math.sin(halfRad) * 5, alpha);
      setLimbSmooth('upperBody', 3 + bounce * 2.5, Math.sin(halfRad - 0.25) * 8, Math.sin(halfRad - 0.25) * 4, alpha);
      slerpBoneDeg(extraBones.upperBody2, 2 + bounce * 2, Math.sin(halfRad - 0.4) * 6, Math.sin(halfRad - 0.4) * 3, alpha);
      setLimbSmooth('neck', -1, -Math.sin(halfRad) * 4, Math.cos(halfRad) * 3, alpha);
      setLimbSmooth('head', -1 + bounce * 4.5, Math.sin(halfRad - 0.25) * 7, Math.cos(halfRad - 0.25) * 6, alpha);

      // Phrase A: Alternating vertical hand-stacking clearly in front of chest (Y=-/+42, forearm Y=-/+56 -> zero bust clipping)
      const stackAlt = Math.sin(halfRad * 2); // smooth alternating beat
      const lArmA = { x: 6, y: -42, z: -18 + stackAlt * 14 };
      const lForeA = { x: 0, y: -56, z: 14 + stackAlt * 10 };
      const rArmA = { x: 6, y: 42, z: 18 + stackAlt * 14 };
      const rForeA = { x: 0, y: 56, z: -14 + stackAlt * 10 };

      // Phrase B: Gather in front -> smooth open side-swagger
      const pushOut = smoothPulse(halfRad * 0.5);
      const lArmB = { x: 4, y: -44 + pushOut * 34, z: -22 + pushOut * 14 };
      const lForeB = { x: 0, y: -58 + pushOut * 40, z: 12 };
      const rArmB = { x: 4, y: 44 - pushOut * 34, z: 22 - pushOut * 14 };
      const rForeB = { x: 0, y: 58 - pushOut * 40, z: -12 };

      // Phrase C: High alternating overhead rock-pumps
      const pumpL = Math.sin(halfRad * 2);
      const pumpR = -pumpL;
      const lArmC = { x: 0, y: -22, z: 22 + pumpL * 18 };
      const lForeC = { x: 0, y: -24, z: 20 + pumpL * 14 };
      const rArmC = { x: 0, y: 22, z: -22 - pumpR * 18 };
      const rForeC = { x: 0, y: 24, z: -20 - pumpR * 14 };

      slerpBoneDeg(extraBones.leftShoulder, 0, -2, (wPump * 6 + stackAlt * 2) / wSum, alpha);
      slerpBoneDeg(extraBones.rightShoulder, 0, 2, (-wPump * 6 + stackAlt * 2) / wSum, alpha);
      setLimbSmooth('leftUpperArm', blend3(lArmA.x, lArmB.x, lArmC.x), blend3(lArmA.y, lArmB.y, lArmC.y), blend3(lArmA.z, lArmB.z, lArmC.z), alpha);
      setLimbSmooth('leftForearm', blend3(lForeA.x, lForeB.x, lForeC.x), blend3(lForeA.y, lForeB.y, lForeC.y), blend3(lForeA.z, lForeB.z, lForeC.z), alpha);
      slerpBoneDeg(extraBones.leftWrist, Math.sin(halfRad) * 8, 0, 4, alpha);
      setLimbSmooth('rightUpperArm', blend3(rArmA.x, rArmB.x, rArmC.x), blend3(rArmA.y, rArmB.y, rArmC.y), blend3(rArmA.z, rArmB.z, rArmC.z), alpha);
      setLimbSmooth('rightForearm', blend3(rForeA.x, rForeB.x, rForeC.x), blend3(rForeA.y, rForeB.y, rForeC.y), blend3(rForeA.z, rForeB.z, rForeC.z), alpha);
      slerpBoneDeg(extraBones.rightWrist, -Math.sin(halfRad) * 8, 0, -4, alpha);

      const stepL = smoothPos(Math.sin(halfRad));
      const stepR = smoothPos(-Math.sin(halfRad));
      setLimbSmooth('leftThigh', -7 - stepL * 12, 4, 5 + stepL * 4, alpha);
      setLimbSmooth('leftKnee', 8 + stepL * 18, 0, 0, alpha);
      slerpBoneDeg(extraBones.leftAnkle, -4 - stepL * 9, 0, 0, alpha);
      setLimbSmooth('rightThigh', -7 - stepR * 12, -4, -5 - stepR * 4, alpha);
      setLimbSmooth('rightKnee', 8 + stepR * 18, 0, 0, alpha);
      slerpBoneDeg(extraBones.rightAnkle, -4 - stepR * 9, 0, 0, alpha);
    } else if (dance === 'ojousama') {
      // ==================== 晚安大小姐 (ASMRZ · 118 BPM Smooth Butler Choreography) ====================
      // Phrase A (0-4): "It's time to go to bed" — R arm forward checking wrist-watch, L arm poised at side (zero back-hair clipping!)
      // Phrase B (4-8): "最後の警告です" — R forearm raised gently wagging left-right on half-beat
      // Phrase C (8-12): "야레야레" — smooth butler hip-sway, polite elbows-out groove & gentle head-shake
      // Phrase D (12-16): Gather hands in front -> sweep open inviting sleep + graceful mini-bow
      const bpm = 118;
      const totalBeats = 16;
      const beatF = (tSec * bpm) / 60;
      const cyc = beatF % totalBeats;
      const rad = beatF * Math.PI * 2;
      const halfRad = rad * 0.5;
      const bounce = smoothPulse(halfRad);

      const wWatch = phraseBlend(cyc, 0, 4.5, 0.95) + (cyc > 15.05 ? smoothCurve((cyc - 15.05) / 0.95) : 0);
      const wWag = phraseBlend(cyc, 3.5, 8.5, 0.95);
      const wSway = phraseBlend(cyc, 7.5, 12.5, 0.95);
      const wBow = phraseBlend(cyc, 11.5, 16.0, 0.95);
      const wSum = Math.max(0.001, wWatch + wWag + wSway + wBow);
      const blend4 = (a: number, b: number, c: number, d: number) =>
        (a * wWatch + b * wWag + c * wSway + d * wBow) / wSum;

      targetY = baseY - 0.008 + bounce * 0.02;
      targetX = baseX + Math.sin(halfRad) * (0.035 + 0.045 * (wSway / wSum));
      swayVel = Math.cos(halfRad) * 0.85;
      bounceVel = Math.sin(rad) * 0.45;

      const bowLean = wBow > 0.1 && cyc > 13.4 ? smoothPulse(((cyc - 13.4) / 2.6) * Math.PI * 0.5) * 12 : 0;
      slerpBoneDeg(extraBones.lowerBody, 1, Math.sin(halfRad) * (8 + 10 * (wSway / wSum)), -Math.sin(halfRad) * 5, alpha);
      setLimbSmooth('upperBody', 3 + bowLean * 0.5, Math.sin(halfRad - 0.25) * 9, Math.sin(halfRad - 0.25) * 5, alpha);
      slerpBoneDeg(extraBones.upperBody2, 2 + bowLean * 0.4, Math.sin(halfRad - 0.4) * 7, Math.sin(halfRad - 0.4) * 3, alpha);
      setLimbSmooth('neck', 1 + bowLean * 0.2, -Math.sin(halfRad) * 4, Math.sin(halfRad - 0.2) * 4, alpha);
      const headShake = Math.sin(halfRad * 2) * 8 * (wSway / wSum);
      setLimbSmooth('head', 3 + bowLean * 0.3, -Math.sin(halfRad) * 6 + headShake, Math.sin(halfRad - 0.25) * 7, alpha);

      // A: Check watch (L arm poised cleanly at side clearing skirt; R arm raised in front clearing chest)
      const lArmA = { x: 4, y: -6, z: -38 };
      const lForeA = { x: 0, y: -32, z: 10 };
      const rArmA = { x: 6, y: 44, z: 18 };
      const rForeA = { x: 0, y: 60, z: -18 };

      // B: Polite finger-wag warning (smooth half-beat wag, no jitter)
      const wag = Math.sin(halfRad * 2) * 14;
      const lArmB = { x: 4, y: -10, z: -38 };
      const lForeB = { x: 0, y: -34, z: 12 };
      const rArmB = { x: 4, y: 46, z: 8 };
      const rForeB = { x: 0, y: 34 + wag, z: -42 + wag * 0.3 };

      // C: Signature butler groove (arms slightly away from ribs so sleeves never clip torso)
      const lArmC = { x: 6, y: -24 + Math.sin(halfRad) * 8, z: -32 + Math.cos(halfRad) * 8 };
      const lForeC = { x: 0, y: -52 + Math.sin(halfRad) * 10, z: 18 };
      const rArmC = { x: 6, y: 24 + Math.sin(halfRad) * 8, z: 32 - Math.cos(halfRad) * 8 };
      const rForeC = { x: 0, y: 52 - Math.sin(halfRad) * 10, z: -18 };

      // D: Gather in front (clear of chest) -> sweep open welcoming sleep
      const openSweep = cyc > 12 ? smoothCurve(THREE.MathUtils.clamp((cyc - 13.4) / 1.5, 0, 1)) : 0;
      const lArmD = { x: 8, y: -44 + openSweep * 38, z: -24 + openSweep * 10 };
      const lForeD = { x: 0, y: -60 + openSweep * 42, z: 16 };
      const rArmD = { x: 8, y: 44 - openSweep * 38, z: 24 - openSweep * 10 };
      const rForeD = { x: 0, y: 60 - openSweep * 42, z: -16 };

      slerpBoneDeg(extraBones.leftShoulder, 0, 0, Math.cos(halfRad) * 3, alpha);
      slerpBoneDeg(extraBones.rightShoulder, 0, 0, -Math.cos(halfRad) * 3, alpha);
      setLimbSmooth('leftUpperArm', blend4(lArmA.x, lArmB.x, lArmC.x, lArmD.x), blend4(lArmA.y, lArmB.y, lArmC.y, lArmD.y), blend4(lArmA.z, lArmB.z, lArmC.z, lArmD.z), alpha);
      setLimbSmooth('leftForearm', blend4(lForeA.x, lForeB.x, lForeC.x, lForeD.x), blend4(lForeA.y, lForeB.y, lForeC.y, lForeD.y), blend4(lForeA.z, lForeB.z, lForeC.z, lForeD.z), alpha);
      slerpBoneDeg(extraBones.leftWrist, Math.sin(halfRad) * 8, 0, 6, alpha);
      setLimbSmooth('rightUpperArm', blend4(rArmA.x, rArmB.x, rArmC.x, rArmD.x), blend4(rArmA.y, rArmB.y, rArmC.y, rArmD.y), blend4(rArmA.z, rArmB.z, rArmC.z, rArmD.z), alpha);
      setLimbSmooth('rightForearm', blend4(rForeA.x, rForeB.x, rForeC.x, rForeD.x), blend4(rForeA.y, rForeB.y, rForeC.y, rForeD.y), blend4(rForeA.z, rForeB.z, rForeC.z, rForeD.z), alpha);
      slerpBoneDeg(extraBones.rightWrist, Math.cos(halfRad) * 8 + wag * 0.35, 0, -6, alpha);

      const stepL = smoothPos(-Math.sin(halfRad));
      const stepR = smoothPos(Math.sin(halfRad));
      setLimbSmooth('leftThigh', -6 - stepL * 8, 4, 4 + stepL * 3, alpha);
      setLimbSmooth('leftKnee', 8 + stepL * 12, 0, 0, alpha);
      slerpBoneDeg(extraBones.leftAnkle, -4 - stepL * 6, 0, 0, alpha);
      setLimbSmooth('rightThigh', -6 - stepR * 8, -4, -4 - stepR * 3, alpha);
      setLimbSmooth('rightKnee', 8 + stepR * 12, 0, 0, alpha);
      slerpBoneDeg(extraBones.rightAnkle, -4 - stepR * 6, 0, 0, alpha);
    } else if (dance === 'groove') {
      // ==================== 科目三 (124 BPM Silky Flow — Zero Jitter, Zero Chest/Leg Clipping) ====================
      // Phrase A (0-8): Smooth 搖花手 (Clean figure-8 forearm & wrist orbit well in front of chest)
      // Phrase B (8-12): Silk side-slide wave (both arms flowing gracefully left <-> right)
      // Phrase C (12-16): High shoulder-level flower-spin flourish
      const bpm = 124;
      const totalBeats = 16;
      const beatF = (tSec * bpm) / 60;
      const cyc = beatF % totalBeats;
      const rad = beatF * Math.PI * 2;
      const halfRad = rad * 0.5;
      const bounce = smoothPulse(halfRad);

      const wFlower = phraseBlend(cyc, 0, 8.5, 0.95) + (cyc > 15.05 ? smoothCurve((cyc - 15.05) / 0.95) : 0);
      const wWave = phraseBlend(cyc, 7.5, 12.5, 0.95);
      const wHigh = phraseBlend(cyc, 11.5, 16.0, 0.95);
      const wSum = Math.max(0.001, wFlower + wWave + wHigh);
      const blend3 = (a: number, b: number, c: number) => (a * wFlower + b * wWave + c * wHigh) / wSum;

      targetY = baseY - 0.024 + bounce * 0.02;
      targetX = baseX + Math.sin(halfRad) * 0.095;
      swayVel = Math.cos(halfRad) * 1.1;
      bounceVel = Math.sin(rad) * 0.5;

      // Silky S-curve counter-sway
      slerpBoneDeg(extraBones.lowerBody, 4, Math.sin(halfRad) * 16, -Math.sin(halfRad) * 7, alpha);
      setLimbSmooth('upperBody', 4, -Math.sin(halfRad - 0.25) * 12, Math.sin(halfRad - 0.25) * 6, alpha);
      slerpBoneDeg(extraBones.upperBody2, 2, -Math.sin(halfRad - 0.4) * 9, Math.sin(halfRad - 0.4) * 4, alpha);
      setLimbSmooth('neck', -1, Math.sin(halfRad) * 6, -Math.sin(halfRad) * 3, alpha);
      setLimbSmooth('head', -2, Math.sin(halfRad - 0.25) * 9, -Math.sin(halfRad - 0.3) * 6, alpha);

      // A: Smooth 搖花手 at clean 1-beat frequency (NO high-freq buzz, kept cleanly forward of chest!)
      const spinS = Math.sin(rad);
      const spinC = Math.cos(rad);
      const lArmA = { x: 6, y: -38 + spinC * 8, z: -24 + spinS * 10 };
      const lForeA = { x: spinC * 8, y: -56 + spinS * 10, z: 18 + spinC * 12 };
      const rArmA = { x: 6, y: 38 + spinC * 8, z: 24 + spinS * 10 };
      const rForeA = { x: -spinC * 8, y: 56 + spinS * 10, z: -18 + spinC * 12 };

      // B: Side-slide silk wave
      const slide = Math.sin(halfRad);
      const lArmB = { x: 5, y: -34 - slide * 14, z: -26 + slide * 14 };
      const lForeB = { x: 0, y: -46 - slide * 14, z: 14 + Math.cos(halfRad) * 10 };
      const rArmB = { x: 5, y: 34 - slide * 14, z: 26 + slide * 14 };
      const rForeB = { x: 0, y: 46 - slide * 14, z: -14 + Math.cos(halfRad) * 10 };

      // C: High shoulder-level flower-spin
      const lArmC = { x: 2, y: -38 + spinC * 10, z: 10 + spinS * 12 };
      const lForeC = { x: spinC * 8, y: -54 + spinS * 12, z: 24 + spinC * 10 };
      const rArmC = { x: 2, y: 38 + spinC * 10, z: -10 + spinS * 12 };
      const rForeC = { x: -spinC * 8, y: 54 + spinS * 12, z: -24 + spinC * 10 };

      slerpBoneDeg(extraBones.leftShoulder, 0, -2, Math.sin(halfRad) * 4, alpha);
      slerpBoneDeg(extraBones.rightShoulder, 0, 2, Math.sin(halfRad) * 4, alpha);
      setLimbSmooth('leftUpperArm', blend3(lArmA.x, lArmB.x, lArmC.x), blend3(lArmA.y, lArmB.y, lArmC.y), blend3(lArmA.z, lArmB.z, lArmC.z), alpha);
      setLimbSmooth('leftForearm', blend3(lForeA.x, lForeB.x, lForeC.x), blend3(lForeA.y, lForeB.y, lForeC.y), blend3(lForeA.z, lForeB.z, lForeC.z), alpha);
      slerpBoneDeg(extraBones.leftWrist, spinS * 16, spinC * 12, spinC * 14, alpha);
      setLimbSmooth('rightUpperArm', blend3(rArmA.x, rArmB.x, rArmC.x), blend3(rArmA.y, rArmB.y, rArmC.y), blend3(rArmA.z, rArmB.z, rArmC.z), alpha);
      setLimbSmooth('rightForearm', blend3(rForeA.x, rForeB.x, rForeC.x), blend3(rForeA.y, rForeB.y, rForeC.y), blend3(rForeA.z, rForeB.z, rForeC.z), alpha);
      slerpBoneDeg(extraBones.rightWrist, -spinS * 16, -spinC * 12, -spinC * 14, alpha);

      // Smooth 科目三 ankle & knee glide (cleanly separated thighs so skirts/legs never clip)
      const twist = Math.sin(halfRad * 2);
      setLimbSmooth('leftThigh', -14 + twist * 5, 6 + twist * 6, 6 + Math.sin(halfRad) * 3, alpha);
      setLimbSmooth('leftKnee', 20 + smoothPulse(halfRad) * 8, 0, 0, alpha);
      slerpBoneDeg(extraBones.leftAnkle, -10 - smoothPulse(halfRad) * 4, twist * 10, -twist * 14, alpha);
      setLimbSmooth('rightThigh', -14 - twist * 5, -6 + twist * 6, -6 + Math.sin(halfRad) * 3, alpha);
      setLimbSmooth('rightKnee', 20 + smoothPulse(halfRad + Math.PI * 0.5) * 8, 0, 0, alpha);
      slerpBoneDeg(extraBones.rightAnkle, -10 - smoothPulse(halfRad + Math.PI * 0.5) * 4, twist * 10, -twist * 14, alpha);
    } else if (dance === 'idol') {
      // ==================== 偶像應援手勢舞 (128 BPM Smooth Idol Choreography) ====================
      // Phrase A (0-4): Star Point Pose (R arm pointing diagonally high, L arm poised cleanly at side)
      // Phrase B (4-8): Cute Double Cheek-Frame (generous clearance in front of cheeks + sweet head tilts)
      // Phrase C (8-12): Smooth Alternating Cheer Pump (打 Call)
      // Phrase D (12-16): Overhead Heart Arc -> Sparkle Open Finish
      const bpm = 128;
      const totalBeats = 16;
      const beatF = (tSec * bpm) / 60;
      const cyc = beatF % totalBeats;
      const rad = beatF * Math.PI * 2;
      const halfRad = rad * 0.5;
      const hop = smoothPulse(halfRad);

      const wStar = phraseBlend(cyc, 0, 4.5, 0.95) + (cyc > 15.05 ? smoothCurve((cyc - 15.05) / 0.95) : 0);
      const wCheek = phraseBlend(cyc, 3.5, 8.5, 0.95);
      const wCheer = phraseBlend(cyc, 7.5, 12.5, 0.95);
      const wHeart = phraseBlend(cyc, 11.5, 16.0, 0.95);
      const wSum = Math.max(0.001, wStar + wCheek + wCheer + wHeart);
      const blend4 = (a: number, b: number, c: number, d: number) =>
        (a * wStar + b * wCheek + c * wCheer + d * wHeart) / wSum;

      targetY = baseY - 0.008 + hop * 0.04;
      targetX = baseX + Math.sin(halfRad) * 0.064;
      swayVel = Math.cos(halfRad);
      bounceVel = Math.sin(rad) * 0.75;

      slerpBoneDeg(extraBones.lowerBody, -1 + hop * 3, Math.sin(halfRad) * 11, -Math.sin(halfRad) * 6, alpha);
      setLimbSmooth('upperBody', -1 + hop * 2, Math.sin(halfRad - 0.25) * 8, Math.sin(halfRad - 0.25) * 6, alpha);
      slerpBoneDeg(extraBones.upperBody2, -1 + hop * 1.5, Math.sin(halfRad - 0.4) * 6, Math.sin(halfRad - 0.4) * 4, alpha);
      setLimbSmooth('neck', -1, Math.sin(halfRad) * 4, -Math.sin(halfRad - 0.2) * 5, alpha);
      setLimbSmooth('head', -1 + hop * 3.5, Math.sin(halfRad - 0.25) * 7, -Math.sin(halfRad - 0.3) * 9, alpha);

      // A: Star Point
      const lArmA = { x: 4, y: -12, z: -40 };
      const lForeA = { x: 0, y: -44, z: 14 };
      const rArmA = { x: 0, y: 20, z: -42 + Math.sin(halfRad * 2) * 8 };
      const rForeA = { x: 0, y: 14, z: -16 + Math.sin(halfRad * 2) * 6 };

      // B: Cute Double Cheek-Frame (generous forward clearance so hands frame face without touching hair/cheeks)
      const lArmB = { x: 4, y: -38, z: -12 + Math.sin(halfRad) * 6 };
      const lForeB = { x: 0, y: -56, z: 42 + Math.sin(halfRad) * 8 };
      const rArmB = { x: 4, y: 38, z: 12 + Math.sin(halfRad) * 6 };
      const rForeB = { x: 0, y: 56, z: -42 + Math.sin(halfRad) * 8 };

      // C: Alternating Cheer Pump
      const pL = Math.sin(halfRad * 2);
      const pR = -pL;
      const lArmC = { x: 0, y: -18, z: 20 + pL * 22 };
      const lForeC = { x: 0, y: -24, z: 24 + pL * 14 };
      const rArmC = { x: 0, y: 18, z: -20 - pR * 22 };
      const rForeC = { x: 0, y: 24, z: -24 - pR * 14 };

      // D: Overhead Heart Arc -> Sparkle Open
      const sparkle = cyc > 12 ? smoothCurve(THREE.MathUtils.clamp((cyc - 14.0) / 1.5, 0, 1)) : 0;
      const lArmD = { x: 0, y: -16 + sparkle * 12, z: 46 - sparkle * 38 };
      const lForeD = { x: 0, y: -32 + sparkle * 20, z: 48 - sparkle * 36 };
      const rArmD = { x: 0, y: 16 - sparkle * 12, z: -46 + sparkle * 38 };
      const rForeD = { x: 0, y: 32 - sparkle * 20, z: -48 + sparkle * 36 };

      slerpBoneDeg(extraBones.leftShoulder, 0, 0, 3 + Math.sin(halfRad) * 3, alpha);
      slerpBoneDeg(extraBones.rightShoulder, 0, 0, -3 - Math.sin(halfRad) * 3, alpha);
      setLimbSmooth('leftUpperArm', blend4(lArmA.x, lArmB.x, lArmC.x, lArmD.x), blend4(lArmA.y, lArmB.y, lArmC.y, lArmD.y), blend4(lArmA.z, lArmB.z, lArmC.z, lArmD.z), alpha);
      setLimbSmooth('leftForearm', blend4(lForeA.x, lForeB.x, lForeC.x, lForeD.x), blend4(lForeA.y, lForeB.y, lForeC.y, lForeD.y), blend4(lForeA.z, lForeB.z, lForeC.z, lForeD.z), alpha);
      slerpBoneDeg(extraBones.leftWrist, Math.sin(halfRad) * 10, 0, 8, alpha);
      setLimbSmooth('rightUpperArm', blend4(rArmA.x, rArmB.x, rArmC.x, rArmD.x), blend4(rArmA.y, rArmB.y, rArmC.y, rArmD.y), blend4(rArmA.z, rArmB.z, rArmC.z, rArmD.z), alpha);
      setLimbSmooth('rightForearm', blend4(rForeA.x, rForeB.x, rForeC.x, rForeD.x), blend4(rForeA.y, rForeB.y, rForeC.y, rForeD.y), blend4(rForeA.z, rForeB.z, rForeC.z, rForeD.z), alpha);
      slerpBoneDeg(extraBones.rightWrist, -Math.sin(halfRad) * 10, 0, -8, alpha);

      const stepL = smoothPos(Math.sin(halfRad));
      const stepR = smoothPos(-Math.sin(halfRad));
      setLimbSmooth('leftThigh', -8 - stepL * 12, 4, 5, alpha);
      setLimbSmooth('leftKnee', 8 + stepL * 18, 0, 0, alpha);
      slerpBoneDeg(extraBones.leftAnkle, -4 - stepL * 9, 0, 0, alpha);
      setLimbSmooth('rightThigh', -8 - stepR * 12, -4, -5, alpha);
      setLimbSmooth('rightKnee', 8 + stepR * 18, 0, 0, alpha);
      slerpBoneDeg(extraBones.rightAnkle, -4 - stepR * 9, 0, 0, alpha);
    } else if (dance === 'waltz') {
      // ==================== 極樂淨土 · 蝴蝶步 (114 BPM Fluid Silk Elegance — Zero Clipping) ====================
      // Phrase A (0-8): Graceful Asymmetric Silk-Sleeve Butterfly Pose switching left/right
      // Phrase B (8-12): Dual Sweeping Figure-8 Silk Ribbon Arcs
      // Phrase C (12-16): Gather hands cleanly in front of heart -> Bloom wide like butterfly wings
      const bpm = 114;
      const totalBeats = 16;
      const beatF = (tSec * bpm) / 60;
      const cyc = beatF % totalBeats;
      const rad = beatF * Math.PI * 2;
      const halfRad = rad * 0.5;
      const qRad = rad * 0.25;

      const wCross = phraseBlend(cyc, 0, 8.6, 1.0) + (cyc > 15.0 ? smoothCurve((cyc - 15.0) / 1.0) : 0);
      const wRibbon = phraseBlend(cyc, 7.4, 12.6, 1.0);
      const wBloom = phraseBlend(cyc, 11.4, 16.0, 1.0);
      const wSum = Math.max(0.001, wCross + wRibbon + wBloom);
      const blend3 = (a: number, b: number, c: number) => (a * wCross + b * wRibbon + c * wBloom) / wSum;

      targetY = baseY - 0.01 + Math.sin(halfRad) * 0.018;
      targetX = baseX + Math.sin(halfRad) * 0.075;
      swayVel = Math.cos(halfRad) * 0.9;
      bounceVel = Math.cos(halfRad) * 0.45;

      slerpBoneDeg(extraBones.lowerBody, 2, Math.sin(halfRad) * 14, -Math.cos(halfRad) * 5, alpha);
      setLimbSmooth('upperBody', 3 + Math.sin(halfRad) * 2, Math.sin(halfRad - 0.3) * 12, Math.cos(halfRad - 0.3) * 5, alpha);
      slerpBoneDeg(extraBones.upperBody2, 2 + Math.sin(halfRad - 0.2) * 2, Math.sin(halfRad - 0.45) * 9, Math.cos(halfRad - 0.45) * 4, alpha);
      setLimbSmooth('neck', 1, -Math.sin(halfRad) * 5, Math.sin(halfRad - 0.2) * 4, alpha);
      setLimbSmooth('head', 2 + Math.cos(halfRad - 0.3) * 3.5, -Math.sin(halfRad - 0.3) * 10, Math.sin(halfRad - 0.35) * 7, alpha);

      // A: Asymmetric butterfly fan pose
      const side = Math.sin(qRad);
      const lArmA = { x: 4, y: -26 + side * 16, z: -8 + side * 32 };
      const lForeA = { x: 0, y: -38 - side * 18, z: 20 + side * 18 };
      const rArmA = { x: 4, y: 26 + side * 16, z: 8 + side * 32 };
      const rForeA = { x: 0, y: 38 - side * 18, z: -20 + side * 18 };

      // B: Dual sweeping figure-8 silk ribbons
      const lArmB = { x: 6, y: -30 + Math.cos(halfRad - 0.3) * 16, z: -4 + Math.sin(halfRad - 0.3) * 28 };
      const lForeB = { x: 0, y: -36 + Math.sin(halfRad - 0.6) * 18, z: 16 + Math.cos(halfRad - 0.6) * 12 };
      const rArmB = { x: 6, y: 30 - Math.cos(halfRad - 0.3) * 16, z: 4 - Math.sin(halfRad - 0.3) * 28 };
      const rForeB = { x: 0, y: 36 - Math.sin(halfRad - 0.6) * 18, z: -16 - Math.cos(halfRad - 0.6) * 12 };

      // C: Gather cleanly in front of heart -> Bloom wide like butterfly wings
      const bloom = cyc > 12 ? smoothCurve(THREE.MathUtils.clamp((cyc - 13.5) / 1.8, 0, 1)) : 0;
      const lArmC = { x: 6, y: -42 + bloom * 36, z: -24 + bloom * 38 };
      const lForeC = { x: 0, y: -56 + bloom * 44, z: 18 - bloom * 8 };
      const rArmC = { x: 6, y: 42 - bloom * 36, z: 24 - bloom * 38 };
      const rForeC = { x: 0, y: 56 - bloom * 44, z: -18 + bloom * 8 };

      slerpBoneDeg(extraBones.leftShoulder, 0, 0, Math.sin(halfRad - 0.2) * 4, alpha);
      slerpBoneDeg(extraBones.rightShoulder, 0, 0, -Math.sin(halfRad - 0.2) * 4, alpha);
      setLimbSmooth('leftUpperArm', blend3(lArmA.x, lArmB.x, lArmC.x), blend3(lArmA.y, lArmB.y, lArmC.y), blend3(lArmA.z, lArmB.z, lArmC.z), alpha);
      setLimbSmooth('leftForearm', blend3(lForeA.x, lForeB.x, lForeC.x), blend3(lForeA.y, lForeB.y, lForeC.y), blend3(lForeA.z, lForeB.z, lForeC.z), alpha);
      slerpBoneDeg(extraBones.leftWrist, Math.sin(halfRad - 0.6) * 14, 6, Math.cos(halfRad - 0.6) * 14, alpha);
      setLimbSmooth('rightUpperArm', blend3(rArmA.x, rArmB.x, rArmC.x), blend3(rArmA.y, rArmB.y, rArmC.y), blend3(rArmA.z, rArmB.z, rArmC.z), alpha);
      setLimbSmooth('rightForearm', blend3(rForeA.x, rForeB.x, rForeC.x), blend3(rForeA.y, rForeB.y, rForeC.y), blend3(rForeA.z, rForeB.z, rForeC.z), alpha);
      slerpBoneDeg(extraBones.rightWrist, -Math.sin(halfRad - 0.6) * 14, -6, -Math.cos(halfRad - 0.6) * 14, alpha);

      // Graceful butterfly step with strictly separated thighs (zero leg/skirt interpenetration)
      const stepL = smoothPos(-Math.sin(halfRad));
      const stepR = smoothPos(Math.sin(halfRad));
      setLimbSmooth('leftThigh', -8 - stepL * 10, 4, 4 + stepL * 2, alpha);
      setLimbSmooth('leftKnee', 8 + stepL * 16, 0, 0, alpha);
      slerpBoneDeg(extraBones.leftAnkle, -4 - stepL * 8, 0, 0, alpha);
      setLimbSmooth('rightThigh', -8 - stepR * 10, -4, -4 - stepR * 2, alpha);
      setLimbSmooth('rightKnee', 8 + stepR * 16, 0, 0, alpha);
      slerpBoneDeg(extraBones.rightAnkle, -4 - stepR * 8, 0, 0, alpha);
    }

    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, rootAlpha);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, rootAlpha);
    updateSecondaryFollowThrough(swayVel, bounceVel, tSec, dt);
  };

  const applyVmdFrame = (frameNum: number, dt: number) => {
    danceTransition = Math.min(1, danceTransition + dt * 2.6);
    const blendAlpha = 1 - Math.exp(-(8.5 + smoothCurve(danceTransition) * 14.0) * dt);

    vmdBoneTracks.forEach((keys, bone) => {
      if (keys.length === 0) return;
      const rp = boneRestPos.get(bone);
      if (frameNum <= keys[0].frame) {
        if (rp) {
          _tmpPos.copy(rp).add(keys[0].pos);
          bone.position.lerp(_tmpPos, blendAlpha);
        }
        bone.quaternion.slerp(keys[0].quat, blendAlpha);
        return;
      }
      const last = keys[keys.length - 1];
      if (frameNum >= last.frame) {
        if (rp) {
          _tmpPos.copy(rp).add(last.pos);
          bone.position.lerp(_tmpPos, blendAlpha);
        }
        bone.quaternion.slerp(last.quat, blendAlpha);
        return;
      }
      // Binary search bracketing keyframes
      let lo = 0;
      let hi = keys.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (keys[mid].frame <= frameNum) lo = mid;
        else hi = mid;
      }
      const k0 = keys[lo];
      const k1 = keys[hi];
      const span = Math.max(1, k1.frame - k0.frame);
      const rawAlpha = THREE.MathUtils.clamp((frameNum - k0.frame) / span, 0, 1);
      // Smooth cubic ease for wider keyframe gaps so transitions glide seamlessly
      const alpha = span > 2 ? smoothCurve(rawAlpha) : rawAlpha;
      if (rp) {
        _tmpPos.lerpVectors(k0.pos, k1.pos, alpha).add(rp);
        bone.position.lerp(_tmpPos, blendAlpha);
      }
      _tmpQuat.slerpQuaternions(k0.quat, k1.quat, alpha);
      bone.quaternion.slerp(_tmpQuat, blendAlpha);
    });

    if (vmdMorphTracks.size > 0) {
      morphWeights.clear();
      vmdMorphTracks.forEach((keys, mIdx) => {
        if (keys.length === 0) return;
        let w = keys[0].weight;
        if (frameNum >= keys[keys.length - 1].frame) {
          w = keys[keys.length - 1].weight;
        } else if (frameNum > keys[0].frame) {
          let lo = 0;
          let hi = keys.length - 1;
          while (lo + 1 < hi) {
            const mid = (lo + hi) >> 1;
            if (keys[mid].frame <= frameNum) lo = mid;
            else hi = mid;
          }
          const k0 = keys[lo];
          const k1 = keys[hi];
          const span = Math.max(1, k1.frame - k0.frame);
          const rawAlpha = THREE.MathUtils.clamp((frameNum - k0.frame) / span, 0, 1);
          const alpha = span > 2 ? smoothCurve(rawAlpha) : rawAlpha;
          w = k0.weight + (k1.weight - k0.weight) * alpha;
        }
        if (w > 0.002) morphWeights.set(mIdx, THREE.MathUtils.clamp(w, 0, 1));
      });
      rebuildMorphPositions(0);
    }
  };

  const loadVmdMotion = async (file: File): Promise<{ name: string; durationSec: number }> => {
    const buf = await file.arrayBuffer();
    const dv = new DataView(buf);
    const bytes = new Uint8Array(buf);
    let sjisDecoder: TextDecoder;
    try {
      sjisDecoder = new TextDecoder('shift-jis');
    } catch {
      sjisDecoder = new TextDecoder('utf-8');
    }

    const readNullTermStr = (off: number, maxLen: number): string => {
      let end = off;
      while (end < off + maxLen && end < bytes.length && bytes[end] !== 0) end++;
      return sjisDecoder.decode(bytes.subarray(off, end)).trim();
    };

    const header = readNullTermStr(0, 30);
    if (!header.startsWith('Vocaloid Motion Data')) {
      throw new Error('無效的 .vmd 檔案格式（僅支援標準 MMD Vocaloid Motion Data）');
    }

    let off = 50; // 30-byte header + 20-byte model name
    const boneKeyCount = dv.getUint32(off, true);
    off += 4;

    const newBoneTracks = new Map<THREE.Bone, VmdBoneKey[]>();
    let maxF = 0;

    for (let i = 0; i < boneKeyCount; i++) {
      if (off + 111 > buf.byteLength) break;
      const bName = readNullTermStr(off, 15);
      off += 15;
      const frame = dv.getUint32(off, true);
      off += 4;
      const px = dv.getFloat32(off, true);
      const py = dv.getFloat32(off + 4, true);
      const pz = -dv.getFloat32(off + 8, true);
      off += 12;
      const qx = dv.getFloat32(off, true);
      const qy = dv.getFloat32(off + 4, true);
      const qz = dv.getFloat32(off + 8, true);
      const qw = dv.getFloat32(off + 12, true);
      off += 16;
      off += 64; // bezier interpolation bytes

      if (frame > maxF) maxF = frame;
      const bone = boneByName.get(bName);
      if (bone) {
        let arr = newBoneTracks.get(bone);
        if (!arr) {
          arr = [];
          newBoneTracks.set(bone, arr);
        }
        // Convert VMD left-handed quaternion to Three.js right-handed space
        arr.push({
          frame,
          pos: new THREE.Vector3(px, py, pz),
          quat: new THREE.Quaternion(-qx, -qy, qz, qw).normalize(),
        });
      }
    }

    const newMorphTracks = new Map<number, VmdMorphKey[]>();
    if (off + 4 <= buf.byteLength) {
      const morphKeyCount = dv.getUint32(off, true);
      off += 4;
      for (let i = 0; i < morphKeyCount; i++) {
        if (off + 23 > buf.byteLength) break;
        const mName = readNullTermStr(off, 15);
        off += 15;
        const frame = dv.getUint32(off, true);
        off += 4;
        const weight = dv.getFloat32(off, true);
        off += 4;
        if (frame > maxF) maxF = frame;
        const mIdx = morphByName.get(mName);
        if (mIdx !== undefined) {
          let arr = newMorphTracks.get(mIdx);
          if (!arr) {
            arr = [];
            newMorphTracks.set(mIdx, arr);
          }
          arr.push({ frame, weight });
        }
      }
    }

    newBoneTracks.forEach((arr) => arr.sort((a, b) => a.frame - b.frame));
    newMorphTracks.forEach((arr) => arr.sort((a, b) => a.frame - b.frame));

    vmdBoneTracks = newBoneTracks;
    vmdMorphTracks = newMorphTracks;
    vmdMaxFrame = Math.max(30, maxF);
    loadedVmdName = file.name.replace(/\.vmd$/i, '');
    activeDance = 'vmd';
    danceClock = 0;
    danceTransition = 0;
    needsFullSkeletonRelax = true;

    return { name: loadedVmdName, durationSec: vmdMaxFrame / 30 };
  };

  const availableLimbs: MmdLimbInfo[] = LIMB_ORDER.filter((k) => limbBones.has(k)).map((k) => ({
    key: k,
    label: LIMB_LABELS[k],
    boneName: limbBones.get(k)!.name,
  }));

  const mmdController: MmdControllerApi = {
    morphs: parsedMorphs.map((m) => ({ index: m.index, name: m.name, panel: m.panel })),
    availableLimbs,
    getMorphWeight: (idx) => morphWeights.get(idx) ?? 0,
    setMorphWeight: (idx, value) => {
      const clamped = THREE.MathUtils.clamp(value, 0, 1);
      if (clamped <= 0.001) morphWeights.delete(idx);
      else morphWeights.set(idx, clamped);
      morphDirty = true;
      rebuildMorphPositions(0);
    },
    resetAllMorphs: () => {
      morphWeights.clear();
      morphDirty = true;
      rebuildMorphPositions(0);
    },
    getLimbRotationDeg: (key) => ({ ...(limbRotDeg.get(key) || { x: 0, y: 0, z: 0 }) }),
    setLimbRotationDeg: (key, axis, deg) => {
      if (activeDance !== 'none') {
        activeDance = 'none';
        needsFullSkeletonRelax = true;
      }
      const cur = limbRotDeg.get(key) || { x: 0, y: 0, z: 0 };
      const next = { ...cur, [axis]: deg };
      limbRotDeg.set(key, next);
    },
    resetAllLimbs: () => {
      activeDance = 'none';
      needsFullSkeletonRelax = true;
      resetAllLimbs();
    },
    applyMmdPose: (pose) => {
      activeDance = 'none';
      needsFullSkeletonRelax = true;
      applyMmdPose(pose, false);
    },
    applyMmdExpression,
    setAutoBlink: (enabled) => {
      autoBlinkEnabled = enabled;
      if (!enabled) rebuildMorphPositions(0);
    },
    setDance: (dance) => {
      const prev = activeDance;
      activeDance = dance;
      danceClock = 0;
      danceTransition = 0;
      if (prev === 'vmd' || dance === 'none') {
        needsFullSkeletonRelax = true;
      }
      if (dance === 'apt' || dance === 'idol') {
        applyMmdExpression('smile');
      } else if (dance === 'ojousama') {
        applyMmdExpression('wink');
      }
    },
    getDance: () => activeDance,
    setDanceSpeed: (spd) => {
      danceSpeed = THREE.MathUtils.clamp(spd, 0.4, 2.0);
    },
    getDanceSpeed: () => danceSpeed,
    loadVmdMotion,
    getLoadedVmdName: () => loadedVmdName,
  };

  const data: CharacterModelData = {
    character,
    mixer: null,
    animations: [],
    currentAction: null,
    currentClipIndex: -1,
    dimensions,
    center,
    skeletonHelper,
    skinnedMeshes,
    morphTargetMeshes: [],
    stats: {
      vertices: vertexCount,
      triangles: Math.floor(indexCount / 3),
      meshes: 1,
      bones: bones.length,
      materials: materials.length,
    },
    playClip: () => {},
    setSpeed: () => {},
    setMorphTargetValue: (name, value) => {
      const found = parsedMorphs.find((m) => m.name === name);
      if (found) mmdController.setMorphWeight(found.index, value);
    },
    applyPose: (pose) => mmdController.applyMmdPose(pose),
    setMotionPreset: () => {},
    applyExpressionPreset: (preset) => applyMmdExpression(preset),
    toggleSkeleton: (visible) => {
      if (skeletonHelper) skeletonHelper.visible = visible;
    },
    setEyeTracking: () => {},
    setViewMode,
    updateMaterialParams: () => {},
    updateKeyLightDir: () => {},
    update: (_time: number, delta: number, breathingIntensity = 1.0, isMotionPlaying = true) => {
      if (!isMotionPlaying) return;
      const dt = Math.min(Math.max(delta, 0.001), 0.05);
      breathClock += dt;

      if (activeDance === 'vmd' && vmdMaxFrame > 0) {
        danceClock += dt * danceSpeed;
        const curFrame = (danceClock * 30) % vmdMaxFrame;
        // Gently return root mesh offset to center while VMD drives center bone
        const rootAlpha = 1 - Math.exp(-9.0 * dt);
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, baseX, rootAlpha);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, baseY, rootAlpha);
        applyVmdFrame(curFrame, dt);
        return;
      }

      if (activeDance !== 'none') {
        if (needsFullSkeletonRelax) relaxNonCoreBones(dt);
        danceClock += dt * danceSpeed;
        applyProceduralDanceFrame(activeDance, danceClock, dt);
      } else {
        if (needsFullSkeletonRelax) relaxNonCoreBones(dt);
        const rootAlpha = 1 - Math.exp(-9.0 * dt);
        const breathY = baseY + Math.sin(breathClock * 1.45) * 0.0038 * breathingIntensity;
        mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, baseX, rootAlpha);
        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, breathY, rootAlpha);
        applyLimbRotationsToBones(Math.sin(breathClock * 1.45) * 0.018 * breathingIntensity, dt, false);
        updateSecondaryFollowThrough(
          Math.sin(breathClock * 0.85) * 0.14,
          Math.cos(breathClock * 1.45) * 0.12 * breathingIntensity,
          breathClock,
          dt,
        );
      }

      if (autoBlinkEnabled && blinkMorphIndex !== null) {
        const cycle = breathClock % 4.2;
        const blink = cycle > 4.02 ? Math.sin(((cycle - 4.02) / 0.18) * Math.PI) : 0;
        if (Math.abs(blink - lastAutoBlinkVal) > 0.01 || morphDirty) {
          lastAutoBlinkVal = blink;
          rebuildMorphPositions(blink);
        }
      } else if (morphDirty) {
        rebuildMorphPositions(0);
      }
    },
    dispose: () => {
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      clayMat.dispose();
      loadedTextures.forEach((t) => t?.dispose());
      blobUrls.forEach((u) => URL.revokeObjectURL(u));
    },
  };

  const displayName = modelNameJp || modelNameEn || pmxFile.name.replace(/\.pmx$/i, '');
  return { data, displayName, mmdController };
}
