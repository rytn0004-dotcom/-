import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  createSkinMicroNormalMap,
  createSkinMicroRoughnessMap,
  createFabricWeaveNormalMap,
  createHairStrandNormalMap,
  applySubsurfaceScatteringShader,
  applyColorCoverageAndRollOffShader,
  DynamicSkinShaderUniforms,
} from '../utils/wuwaTextures';
import { applyFleurdelysSculptAndCostume, FleurdelysBuildContext } from '../models/fleurdelysBuilder';
import { applyRinascitaCharacterBuild, RinascitaCharacterId } from '../models/rinascitaBuilders';

export type PosePreset = 'default' | 'graceful' | 'prayer' | 'combat' | 'greet';
export type MotionPreset = 'idle' | 'showcase' | 'channel' | 'combat' | 'greet' | 'catwalk';

export interface CharacterMaterialUpdateParams {
  sssWarmth?: number;
  microBump?: number;
  skinTone?: 'porcelain' | 'peach' | 'warm';
  fabricBump?: number;
  skinSheen?: number;
  rimPower?: number;
  rimColor?: string | number;
}

export interface CharacterModelData {
  character: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  animations: THREE.AnimationClip[];
  currentAction: THREE.AnimationAction | null;
  currentClipIndex: number;
  dimensions: THREE.Vector3;
  center: THREE.Vector3;
  skeletonHelper: THREE.SkeletonHelper | null;
  skinnedMeshes: THREE.SkinnedMesh[];
  morphTargetMeshes: Array<{
    mesh: THREE.Mesh;
    dict: { [key: string]: number };
  }>;
  stats: {
    vertices: number;
    triangles: number;
    meshes: number;
    bones: number;
    materials: number;
  };
  playClip: (index: number) => void;
  setSpeed: (speed: number) => void;
  setMorphTargetValue: (targetName: string, value: number) => void;
  applyPose: (poseName: PosePreset) => void;
  setMotionPreset: (preset: MotionPreset) => void;
  applyExpressionPreset: (preset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy') => void;
  toggleSkeleton: (visible: boolean) => void;
  setEyeTracking: (enabled: boolean) => void;
  setViewMode: (mode: 'pbr' | 'clay' | 'wireframe') => void;
  updateMaterialParams: (params: CharacterMaterialUpdateParams) => void;
  updateKeyLightDir: (viewSpaceDir: THREE.Vector3) => void;
  update: (
    time: number,
    delta: number,
    breathingIntensity?: number,
    isMotionPlaying?: boolean,
    cameraWorldPos?: THREE.Vector3,
  ) => void;
  dispose: () => void;
}

const gltfLoader = new GLTFLoader();

// Optional Draco loader for compressed GLB files
try {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  gltfLoader.setDRACOLoader(dracoLoader);
} catch (e) {
  console.warn('Draco loader init failed:', e);
}

const fbxLoadingManager = new THREE.LoadingManager();
const EMPTY_TEX_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
fbxLoadingManager.setURLModifier((url) => {
  // Prevent 404 console spam from Unreal internal texture paths embedded inside FBX files;
  // our material builder binds the real high-res textures explicitly.
  if (/\.(png|jpg|jpeg|tga|bmp|dds)(\?|$)/i.test(url) && !url.startsWith('/models/') && !url.startsWith('blob:')) {
    return EMPTY_TEX_DATA_URI;
  }
  return url;
});
const fbxLoader = new FBXLoader(fbxLoadingManager);
const fbxTexLoader = new THREE.TextureLoader();

const FLEURDELYS_FBX_TEXTURES: Record<
  string,
  {
    diffuse: string;
    normal?: string;
    kind: 'face' | 'eye' | 'hair' | 'up' | 'down' | 'cloth' | 'alpha';
    alphaTest?: number;
  }
> = {
  mi_r2t1fuludelisimd10011face: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Face_D.png',
    kind: 'face',
  },
  mi_r2t1fuludelisimd10011eye: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Eye_D.png',
    kind: 'eye',
  },
  mi_r2t1fuludelisimd10011bangs: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Bangs_D.png',
    kind: 'hair',
  },
  mi_r2t1fuludelisimd10011hair: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Hair_D.png',
    kind: 'hair',
  },
  mi_r2t1fuludelisimd10011up: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Up_D.png',
    normal: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Up_N.png',
    kind: 'up',
  },
  mi_r2t1fuludelisimd10011down: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Down_D.png',
    normal: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Down_N.png',
    kind: 'down',
  },
  mi_r2t1fuludelisimd10011cloth: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Cloth_D.png',
    normal: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Cloth_N.png',
    kind: 'cloth',
  },
  mi_r2t1fuludelisimd10011alpha: {
    diffuse: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Alpha_D.png',
    normal: '/models/fleurdelys/Textures/T_R2T1FuludelisiMd10011Alpha_N.png',
    kind: 'alpha',
    alphaTest: 0.3333,
  },
};

/**
 * Loads a 3D Character Model using Three.js GLTFLoader or FBXLoader
 * - Auto-orients VRM 0.x (-Z facing), VRM 1.0 (+Z facing), and Unreal FBX (Bip001) models toward +Z camera & grounds feet at Y=0
 * - Classifies Eyes, Hair (anisotropy "Angel Ring"), Cloth, Leather/Metal, and Skin (directional SSS + micro-pores)
 * - Normalizes bone bind orientations & rest A-pose angles into character-anatomical space for unified poses, finger curl & 6 motion loops
 */
export async function loadCharacter(
  modelSource: string | File,
  targetScene?: THREE.Scene | THREE.Group,
  targetHeight = 2.4,
  options?: { characterId?: string },
): Promise<CharacterModelData> {
  let url = '';
  let isBlobUrl = false;
  let isFbx = false;

  if (typeof modelSource === 'string') {
    url = modelSource;
    isFbx = /\.fbx(\?|$)/i.test(modelSource);
  } else if (modelSource instanceof File) {
    url = URL.createObjectURL(modelSource);
    isBlobUrl = true;
    isFbx = /\.fbx$/i.test(modelSource.name);
  }

  try {
    let character: THREE.Group;
    let loadedAnimations: THREE.AnimationClip[] = [];

    if (isFbx) {
      character = await fbxLoader.loadAsync(url);
      character.name = 'FBX_Character_Root';
      loadedAnimations = character.animations || [];
    } else {
      const gltf: GLTF = await gltfLoader.loadAsync(url);
      if (!gltf.scene) {
        throw new Error('GLTF 模型缺少主場景節點');
      }
      character = gltf.scene;
      character.name = 'GLTF_Character_Root';
      loadedAnimations = gltf.animations || [];
    }

    // 1. Detect anatomical landmarks before scaling (essential for FBX rigs with trailing ribbons/hair below sole)
    character.updateMatrixWorld(true);
    const landmarks: {
      toeBone: THREE.Object3D | null;
      footBone: THREE.Object3D | null;
      eyeBone: THREE.Object3D | null;
      headBoneObj: THREE.Object3D | null;
      pelvisBoneObj: THREE.Object3D | null;
    } = {
      toeBone: null,
      footBone: null,
      eyeBone: null,
      headBoneObj: null,
      pelvisBoneObj: null,
    };
    character.traverse((obj) => {
      const n = obj.name.toLowerCase();
      if (!landmarks.toeBone && /toebase|toe_base|lefttoe|bip001ltoe0$/i.test(n) && !n.endsWith('_end')) landmarks.toeBone = obj;
      if (!landmarks.footBone && /_foot$|leftfoot|j_bip_l_foot|bip001lfoot$/i.test(n)) landmarks.footBone = obj;
      if (!landmarks.eyeBone && /faceeye|eye_l|lefteye/i.test(n)) landmarks.eyeBone = obj;
      if (!landmarks.headBoneObj && /_head$|head$|bip001head$/i.test(n) && !n.endsWith('_end')) landmarks.headBoneObj = obj;
      if (!landmarks.pelvisBoneObj && /bip001pelvis$|j_bip_c_hips$|hips$/i.test(n)) landmarks.pelvisBoneObj = obj;
    });
    const { toeBone, footBone, eyeBone, headBoneObj, pelvisBoneObj } = landmarks;

    const bounds = new THREE.Box3().setFromObject(character);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    // Scale using true foot-to-crown height when FBX has below-ground flowing ribbons/hair
    let effectiveHeight = size.y;
    const soleRef = toeBone ?? footBone;
    if (isFbx && soleRef) {
      const footPos = new THREE.Vector3();
      soleRef.getWorldPosition(footPos);
      const standingH = bounds.max.y - footPos.y;
      if (standingH > 10) {
        effectiveHeight = standingH;
      }
    }

    if (effectiveHeight > 0) {
      const scaleFactor = targetHeight / effectiveHeight;
      character.scale.setScalar(scaleFactor);
    }

    // 2. Detect forward-facing axis (VRM 0.x models face -Z while VRM 1.0 & Unreal FBX face +Z)
    character.updateMatrixWorld(true);
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    let facingZ = 1;
    if (toeBone && footBone) {
      toeBone.getWorldPosition(vA);
      footBone.getWorldPosition(vB);
      facingZ = vA.z - vB.z;
    } else if (eyeBone && headBoneObj) {
      eyeBone.getWorldPosition(vA);
      headBoneObj.getWorldPosition(vB);
      facingZ = vA.z - vB.z;
    }

    if (facingZ < -0.002) {
      character.rotation.y = Math.PI;
    }

    // Center X/Z cleanly and rest feet flush at Y = 0
    character.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(character);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    let baseCharY = -scaledBounds.min.y;
    let centerX = scaledCenter.x;
    let centerZ = scaledCenter.z;

    if (isFbx && soleRef) {
      const footWorld = new THREE.Vector3();
      soleRef.getWorldPosition(footWorld);
      baseCharY = -footWorld.y;
      if (pelvisBoneObj) {
        const pelvisWorld = new THREE.Vector3();
        pelvisBoneObj.getWorldPosition(pelvisWorld);
        centerX = pelvisWorld.x;
        centerZ = pelvisWorld.z;
      }
    }

    character.position.x = -centerX;
    character.position.z = -centerZ;
    character.position.y = baseCharY;
    character.updateMatrixWorld(true);

    // 3. Mesh inspection, shadows, hair anisotropy & PBR physical material tuning
    let vertices = 0;
    let triangles = 0;
    let meshCount = 0;
    let boneCount = 0;
    const materialsSet = new Set<THREE.Material>();
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    const morphTargetMeshes: Array<{ mesh: THREE.Mesh; dict: { [key: string]: number } }> = [];
    const allBones: THREE.Bone[] = [];

    const initialBoneQuats = new Map<THREE.Bone, THREE.Quaternion>();
    const boneBindWorldQuats = new Map<THREE.Bone, THREE.Quaternion>();
    const boneBindWorldInv = new Map<THREE.Bone, THREE.Quaternion>();
    const targetPoseOffsets = new Map<THREE.Bone, THREE.Vector3>();
    const currentPoseOffsets = new Map<THREE.Bone, THREE.Vector3>();
    const motionOffsets = new Map<THREE.Bone, THREE.Vector3>();

    const sharedSkinUniforms: DynamicSkinShaderUniforms = {
      uSssColor: { value: new THREE.Color(0xf4846c) },
      uSssIntensity: { value: 0.72 },
      uRimIntensity: { value: 1.25 },
      uRimColor: { value: new THREE.Color(0x93c5fd) },
      uKeyLightDir: { value: new THREE.Vector3(0.45, 0.7, 0.55).normalize() },
      uSkinTint: { value: new THREE.Color(0xf9dcd0) },
    };

    const skinMaterialsList: THREE.MeshPhysicalMaterial[] = [];
    const clothMaterialsList: THREE.MeshPhysicalMaterial[] = [];
    const hairMaterialsList: THREE.MeshPhysicalMaterial[] = [];
    const originalMeshMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const materialUpgradeCache = new Map<THREE.Material, THREE.Material>();

    let cachedMicroNormalMap: THREE.CanvasTexture | null = null;
    let cachedSkinRoughnessMap: THREE.CanvasTexture | null = null;
    let cachedFabricNormalMap: THREE.CanvasTexture | null = null;
    let cachedHairNormalMap: THREE.CanvasTexture | null = null;

    let clayMaterial: THREE.MeshPhysicalMaterial | null = null;
    const clayCutoutMaterials = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
    let wireMaterial: THREE.MeshBasicMaterial | null = null;

    const fbxLoadedTextures: THREE.Texture[] = [];

    const loadFbxTexture = (texUrl: string, isSRGB: boolean): THREE.Texture => {
      const tex = fbxTexLoader.load(texUrl);
      tex.colorSpace = isSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      fbxLoadedTextures.push(tex);
      return tex;
    };

    const tuneMaterial = (m: THREE.Material, meshName: string): THREE.Material => {
      if (!m) return m;
      const cached = materialUpgradeCache.get(m);
      if (cached) return cached;

      // Bespoke high-fidelity Wuthering Waves Fleurdelys FBX material & texture binding
      // Hardened against scene light-bleeding / color pollution (strictly opaque depth-writing, fog-immune, low envMap, neutral sheen)
      const matKey = (m.name || '').trim().toLowerCase();
      const fleurSpec = isFbx ? FLEURDELYS_FBX_TEXTURES[matKey] : undefined;
      if (fleurSpec) {
        const diffuseTex = loadFbxTexture(fleurSpec.diffuse, true);
        const normalTex = fleurSpec.normal ? loadFbxTexture(fleurSpec.normal, false) : null;
        const isThinLayer = fleurSpec.kind === 'hair' || fleurSpec.kind === 'cloth' || fleurSpec.kind === 'alpha';
        const phys = new THREE.MeshPhysicalMaterial({
          name: m.name,
          map: diffuseTex,
          normalMap: normalTex,
          normalScale: normalTex ? new THREE.Vector2(0.38, -0.38) : new THREE.Vector2(1, 1),
          color: new THREE.Color(0xffffff),
          side: isThinLayer ? THREE.DoubleSide : THREE.FrontSide,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
          depthTest: true,
          fog: false,
          transmission: 0.0,
          thickness: 0.0,
          roughness: 0.58,
          metalness: 0.0,
          envMapIntensity: 0.16,
        });

        if (fleurSpec.kind === 'face') {
          phys.roughness = 0.62;
          phys.metalness = 0.0;
          phys.sheen = 0.06;
          phys.sheenRoughness = 0.72;
          phys.sheenColor = new THREE.Color(0xfff5f0);
          phys.envMapIntensity = 0.12;
          // Isolated neutral skin uniforms so colored scene rim lights & halos never bleed through or dye her face
          const isolatedFbxFaceUniforms: DynamicSkinShaderUniforms = {
            uSssColor: { value: new THREE.Color(0xf4a89a) },
            uSssIntensity: { value: 0.24 },
            uRimIntensity: { value: 0.08 },
            uRimColor: { value: new THREE.Color(0xffffff) },
            uKeyLightDir: sharedSkinUniforms.uKeyLightDir,
            uSkinTint: { value: new THREE.Color(0xfff5f0) },
          };
          applySubsurfaceScatteringShader(phys, isolatedFbxFaceUniforms);
          skinMaterialsList.push(phys);
        } else if (fleurSpec.kind === 'eye') {
          phys.roughness = 0.14;
          phys.metalness = 0.0;
          phys.clearcoat = 0.75;
          phys.clearcoatRoughness = 0.1;
          phys.emissiveMap = diffuseTex;
          phys.emissive = new THREE.Color(0xdbeafe);
          phys.emissiveIntensity = 0.18;
          phys.envMapIntensity = 0.34;
        } else if (fleurSpec.kind === 'hair') {
          phys.roughness = 0.44;
          phys.metalness = 0.0;
          phys.sheen = 0.12;
          phys.sheenRoughness = 0.54;
          phys.sheenColor = new THREE.Color(0xf8fafc);
          phys.clearcoat = 0.1;
          phys.clearcoatRoughness = 0.4;
          phys.anisotropy = 0.42;
          phys.anisotropyRotation = Math.PI / 2;
          phys.envMapIntensity = 0.2;
          applyColorCoverageAndRollOffShader(phys);
          hairMaterialsList.push(phys);
        } else if (fleurSpec.kind === 'up' || fleurSpec.kind === 'down') {
          phys.roughness = fleurSpec.kind === 'up' ? 0.56 : 0.54;
          phys.metalness = 0.0;
          phys.sheen = 0.08;
          phys.sheenRoughness = 0.64;
          phys.sheenColor = new THREE.Color(0xffffff);
          phys.envMapIntensity = 0.15;
          applyColorCoverageAndRollOffShader(phys);
          clothMaterialsList.push(phys);
        } else if (fleurSpec.kind === 'cloth') {
          phys.roughness = 0.6;
          phys.metalness = 0.0;
          phys.sheen = 0.1;
          phys.sheenRoughness = 0.62;
          phys.sheenColor = new THREE.Color(0xffffff);
          phys.envMapIntensity = 0.16;
          applyColorCoverageAndRollOffShader(phys);
          clothMaterialsList.push(phys);
        } else if (fleurSpec.kind === 'alpha') {
          phys.alphaTest = fleurSpec.alphaTest ?? 0.42;
          phys.transparent = false;
          phys.depthWrite = true;
          phys.roughness = 0.56;
          phys.metalness = 0.0;
          phys.sheen = 0.08;
          phys.sheenRoughness = 0.62;
          phys.sheenColor = new THREE.Color(0xffffff);
          phys.envMapIntensity = 0.16;
          applyColorCoverageAndRollOffShader(phys);
          clothMaterialsList.push(phys);
        }

        materialsSet.add(phys);
        materialUpgradeCache.set(m, phys);
        return phys;
      }

      const mName = `${m.name || ''} ${meshName || ''}`.toLowerCase();

      const isEyeGloss = /eyeiris|eyehighlight|eyeextra|iris|pupil|cornea|_eye\b|alicia_eye$/i.test(mName);
      const isEyeCutout = /eyewhite|eyelash|eyeline|facebrow|eyebrow|facemouth|mastuge|sclera|eye_white/i.test(mName);
      const isTrueMetal = /metal|gold|silver|armor|jewel|gem|buckle/i.test(mName);
      const isLeatherOrAcc =
        !isEyeGloss &&
        !isEyeCutout &&
        /shoe|boot|accessory|buckle|belt|metal|gold|silver|armor|button|jewel|gem|other_zwrite/i.test(mName);
      const isCloth =
        !isEyeGloss &&
        !isEyeCutout &&
        !isLeatherOrAcc &&
        /cloth|dress|skirt|suit|costume|fuku|tabard|top|bottom|ribbon|wear|hat|glove|sock|tights|coat|jacket|pants|tie|collar|onepiece/i.test(
          mName,
        );
      const isHair = !isEyeGloss && !isEyeCutout && !isLeatherOrAcc && !isCloth && /hair|kami|bang|tail|lock/i.test(mName);
      const isSkin =
        !isEyeGloss &&
        !isEyeCutout &&
        !isLeatherOrAcc &&
        !isCloth &&
        !isHair &&
        /skin|face_00|body_00|_face\b|_body\b|head|hada|kao|cheek|neck/i.test(mName);

      const srcAny = m as any;
      if (srcAny.map && srcAny.map instanceof THREE.Texture) {
        srcAny.map.colorSpace = THREE.SRGBColorSpace;
        srcAny.map.anisotropy = 8;
      }

      let activeMat: THREE.Material = m;
      if (
        srcAny.isMeshBasicMaterial ||
        srcAny.isMeshStandardMaterial ||
        srcAny.isMeshPhysicalMaterial ||
        srcAny.isMeshPhongMaterial ||
        srcAny.isMeshLambertMaterial
      ) {
        // Strip VRoid MToon baked emissiveFactor white-out unless an actual emissiveMap exists
        const hasEmissiveMap = Boolean(srcAny.emissiveMap);
        const phys = new THREE.MeshPhysicalMaterial({
          name: m.name,
          map: srcAny.map || null,
          normalMap: srcAny.normalMap || null,
          normalScale: srcAny.normalScale ? srcAny.normalScale.clone() : new THREE.Vector2(1, 1),
          emissiveMap: srcAny.emissiveMap || null,
          emissive: hasEmissiveMap && srcAny.emissive ? srcAny.emissive.clone() : new THREE.Color(0x000000),
          emissiveIntensity: hasEmissiveMap ? Math.min(srcAny.emissiveIntensity ?? 0.35, 0.45) : 0.0,
          aoMap: srcAny.aoMap || null,
          aoMapIntensity: srcAny.aoMapIntensity ?? 1.0,
          roughnessMap: srcAny.roughnessMap || null,
          metalnessMap: null,
          color: srcAny.color ? srcAny.color.clone() : new THREE.Color(0xffffff),
          transparent: Boolean(m.transparent),
          opacity: m.opacity ?? 1.0,
          alphaTest: srcAny.alphaTest > 0 ? srcAny.alphaTest : m.transparent ? 0.5 : 0,
          side: m.side,
          envMapIntensity: 0.72,
          roughness: typeof srcAny.roughness === 'number' ? srcAny.roughness : 0.55,
          metalness: 0.0,
        });

        if (phys.transparent) {
          phys.depthWrite = true;
          if (phys.alphaTest < 0.05) {
            phys.alphaTest = 0.48;
          }
        }

        if (isEyeGloss) {
          phys.roughness = 0.12;
          phys.metalness = 0.0;
          phys.clearcoat = 0.85;
          phys.clearcoatRoughness = 0.08;
          phys.envMapIntensity = 0.95;
        } else if (isEyeCutout) {
          phys.roughness = 0.54;
          phys.metalness = 0.0;
          phys.clearcoat = 0.0;
          phys.envMapIntensity = 0.48;
        } else if (isSkin) {
          phys.roughness = 0.50;
          phys.metalness = 0.0;
          phys.sheen = 0.24;
          phys.sheenRoughness = 0.64;
          phys.sheenColor = new THREE.Color(0xf4a293);
          phys.clearcoat = 0.08;
          phys.clearcoatRoughness = 0.48;
          phys.envMapIntensity = 0.80;

          // Apply silky micro-dermal normal & roughness maps at subtle scale for smooth transitions
          const isFaceSkinMat = /face_00|alicia_face|_face\b/i.test(mName);
          if (!phys.normalMap || /_00_skin|alicia_(face|body)/i.test(mName)) {
            if (!cachedMicroNormalMap) cachedMicroNormalMap = createSkinMicroNormalMap();
            phys.normalMap = cachedMicroNormalMap;
            const nScale = isFaceSkinMat ? 0.12 : 0.24;
            phys.normalScale = new THREE.Vector2(nScale, nScale);
          }
          if (!phys.roughnessMap || /_00_skin|alicia_(face|body)/i.test(mName)) {
            if (!cachedSkinRoughnessMap) cachedSkinRoughnessMap = createSkinMicroRoughnessMap();
            phys.roughnessMap = cachedSkinRoughnessMap;
          }

          applySubsurfaceScatteringShader(phys, sharedSkinUniforms);
          skinMaterialsList.push(phys);
        } else if (isHair) {
          phys.roughness = 0.36;
          phys.metalness = 0.02;
          phys.sheen = 0.45;
          phys.sheenRoughness = 0.38;
          phys.sheenColor = new THREE.Color(0xc7d2fe);
          phys.clearcoat = 0.22;
          phys.clearcoatRoughness = 0.30;
          phys.anisotropy = 0.65;
          phys.anisotropyRotation = Math.PI / 2;
          phys.envMapIntensity = 0.88;

          if (!phys.normalMap || /_00_hair|alicia_hair/i.test(mName)) {
            if (!cachedHairNormalMap) cachedHairNormalMap = createHairStrandNormalMap();
            phys.normalMap = cachedHairNormalMap;
            phys.normalScale = new THREE.Vector2(0.45, 0.45);
          }
          applyColorCoverageAndRollOffShader(phys);
          hairMaterialsList.push(phys);
        } else if (isLeatherOrAcc) {
          phys.roughness = isTrueMetal ? 0.26 : 0.38;
          phys.metalness = isTrueMetal ? 0.65 : 0.04;
          phys.clearcoat = 0.32;
          phys.clearcoatRoughness = 0.28;
          phys.envMapIntensity = isTrueMetal ? 1.05 : 0.86;

          if (!phys.normalMap) {
            if (!cachedFabricNormalMap) cachedFabricNormalMap = createFabricWeaveNormalMap();
            phys.normalMap = cachedFabricNormalMap;
            phys.normalScale = new THREE.Vector2(0.26, 0.26);
          }
          applyColorCoverageAndRollOffShader(phys);
          clothMaterialsList.push(phys);
        } else if (isCloth) {
          phys.metalness = 0.0;
          phys.roughness = Math.max(0.46, Math.min(phys.roughness, 0.70));
          phys.sheen = 0.42;
          phys.sheenRoughness = 0.52;
          phys.sheenColor = new THREE.Color(0xe2e8f0);
          phys.envMapIntensity = 0.85;

          if (!phys.normalMap || /_01_cloth|alicia_.*wear/i.test(mName)) {
            if (!cachedFabricNormalMap) cachedFabricNormalMap = createFabricWeaveNormalMap();
            phys.normalMap = cachedFabricNormalMap;
            phys.normalScale = new THREE.Vector2(0.42, 0.42);
          }
          applyColorCoverageAndRollOffShader(phys);
          clothMaterialsList.push(phys);
        }

        activeMat = phys;
      }

      materialsSet.add(activeMat);
      materialUpgradeCache.set(m, activeMat);
      return activeMat;
    };

    const sanitizeGeometryNormals = (geo: THREE.BufferGeometry) => {
      const norm = geo.getAttribute('normal');
      if (!norm) {
        geo.computeVertexNormals();
        return;
      }
      let dirty = false;
      for (let i = 0; i < norm.count; i++) {
        const nx = norm.getX(i);
        const ny = norm.getY(i);
        const nz = norm.getZ(i);
        const l2 = nx * nx + ny * ny + nz * nz;
        if (!Number.isFinite(l2) || l2 < 1e-8) {
          norm.setXYZ(i, 0, 1, 0);
          dirty = true;
        }
      }
      if (dirty) norm.needsUpdate = true;
    };

    character.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        meshCount++;
        const lowMeshName = `${mesh.name || ''}`.toLowerCase();
        const isHairOrEyelash = /hair|lash|line|brow|eye/i.test(lowMeshName);
        const isFaceOrEye = /face|lash|line|brow|eye/i.test(lowMeshName);
        mesh.castShadow = isFbx ? true : !isHairOrEyelash;
        mesh.receiveShadow = isFbx ? true : !isFaceOrEye;

        if (mesh.geometry) {
          const geo = mesh.geometry;
          sanitizeGeometryNormals(geo);
          if (geo.attributes.position) {
            vertices += geo.attributes.position.count;
          }
          if (geo.index) {
            triangles += geo.index.count / 3;
          } else if (geo.attributes.position) {
            triangles += geo.attributes.position.count / 3;
          }
        }

        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((m) => tuneMaterial(m, mesh.name));
          } else {
            mesh.material = tuneMaterial(mesh.material, mesh.name);
          }
          originalMeshMaterials.set(mesh, mesh.material);
        }

        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          morphTargetMeshes.push({
            mesh,
            dict: mesh.morphTargetDictionary,
          });
        }

        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          skinnedMeshes.push(mesh as THREE.SkinnedMesh);
        }
      }

      if ((child as THREE.Bone).isBone) {
        const b = child as THREE.Bone;
        boneCount++;
        allBones.push(b);
        initialBoneQuats.set(b, b.quaternion.clone());
        const wq = new THREE.Quaternion();
        b.getWorldQuaternion(wq);
        boneBindWorldQuats.set(b, wq);
        boneBindWorldInv.set(b, wq.clone().invert());
        targetPoseOffsets.set(b, new THREE.Vector3());
        currentPoseOffsets.set(b, new THREE.Vector3());
        motionOffsets.set(b, new THREE.Vector3());
      }
    });

    // 4. Humanoid Bone, Finger Chain & Secondary Physics Mapping
    const findBone = (...nameKeywords: string[]): THREE.Bone | null => {
      for (const kw of nameKeywords) {
        const kwLow = kw.toLowerCase();
        for (const bone of allBones) {
          const low = bone.name.toLowerCase();
          if (
            low.includes(kwLow) &&
            !low.endsWith('_end') &&
            !low.includes('roll') &&
            !low.includes('aim') &&
            !low.includes('twist')
          ) {
            return bone;
          }
        }
      }
      return null;
    };

    const findFingerBones = (side: 'l' | 'r', finger: 'index' | 'middle' | 'ring' | 'little' | 'thumb'): THREE.Bone[] => {
      const sideFull = side === 'l' ? 'left' : 'right';
      const altFinger = finger === 'little' ? 'pinky' : finger;
      const bipIdxMap: Record<typeof finger, string> = {
        thumb: '0',
        index: '1',
        middle: '2',
        ring: '3',
        little: '4',
      };
      const bipPrefix = `bip001${side}finger${bipIdxMap[finger]}`;
      const matched = allBones.filter((b) => {
        const n = b.name.toLowerCase();
        if (n.endsWith('_end')) return false;
        if (n.startsWith(bipPrefix)) return true;
        if (n.endsWith('4')) return false;
        const hasSide = n.includes(`_${side}_`) || n.includes(`${sideFull}hand`);
        const hasFinger = n.includes(finger) || n.includes(altFinger);
        return hasSide && hasFinger;
      });
      return matched.sort((a, b) => a.name.localeCompare(b.name));
    };

    const humanoidBones = {
      head: findBone('j_bip_c_head', 'bip001head', 'head'),
      neck: findBone('j_bip_c_neck', 'bip001neck', 'neck'),
      leftEye: findBone('j_bip_l_eye', 'j_adj_l_faceeye', 'lefteye', 'eye_l'),
      rightEye: findBone('j_bip_r_eye', 'j_adj_r_faceeye', 'righteye', 'eye_r'),
      chest: findBone('j_bip_c_upperchest', 'j_bip_c_chest', 'bip001spine2', 'upperchest', 'chest', 'spine2'),
      spine: findBone('j_bip_c_spine', 'bip001spine1', 'bip001spine', 'spine'),
      hips: findBone('j_bip_c_hips', 'bip001pelvis', 'hips', 'pelvis'),
      leftShoulder: findBone('j_bip_l_shoulder', 'bip001lclavicle', 'leftshoulder'),
      rightShoulder: findBone('j_bip_r_shoulder', 'bip001rclavicle', 'rightshoulder'),
      leftUpperArm: findBone('j_bip_l_upperarm', 'bip001lupperarm', 'leftupperarm', 'leftarm'),
      leftForearm: findBone('j_bip_l_lowerarm', 'bip001lforearm', 'leftlowerarm', 'leftforearm'),
      leftHand: findBone('j_bip_l_hand', 'bip001lhand', 'lefthand'),
      rightUpperArm: findBone('j_bip_r_upperarm', 'bip001rupperarm', 'rightupperarm', 'rightarm'),
      rightForearm: findBone('j_bip_r_lowerarm', 'bip001rforearm', 'rightlowerarm', 'rightforearm'),
      rightHand: findBone('j_bip_r_hand', 'bip001rhand', 'righthand'),
      leftUpperLeg: findBone('j_bip_l_upperleg', 'bip001lthigh', 'leftupperleg', 'leftupleg'),
      leftLowerLeg: findBone('j_bip_l_lowerleg', 'bip001lcalf', 'leftlowerleg', 'leftleg'),
      leftFoot: findBone('j_bip_l_foot', 'bip001lfoot', 'leftfoot'),
      rightUpperLeg: findBone('j_bip_r_upperleg', 'bip001rthigh', 'rightupperleg', 'rightupleg'),
      rightLowerLeg: findBone('j_bip_r_lowerleg', 'bip001rcalf', 'rightlowerleg', 'rightleg'),
      rightFoot: findBone('j_bip_r_foot', 'bip001rfoot', 'rightfoot'),
    };

    // Measure rest-pose upper-arm downward drop angle (0 rad for T-pose VRM/GLB, ~0.97 rad for A-pose Unreal FBX)
    let restArmDropRad = 0;
    if (humanoidBones.leftUpperArm && humanoidBones.leftForearm) {
      const pArm = new THREE.Vector3();
      const pFore = new THREE.Vector3();
      humanoidBones.leftUpperArm.getWorldPosition(pArm);
      humanoidBones.leftForearm.getWorldPosition(pFore);
      const dx = Math.abs(pFore.x - pArm.x);
      const dy = pArm.y - pFore.y; // positive when arm hangs downward in rest A-pose
      if (dx > 0.001 && dy > 0.01) {
        restArmDropRad = THREE.MathUtils.clamp(Math.atan2(dy, dx), 0, 1.25);
      }
    }

    const fingerChains = {
      leftThumb: findFingerBones('l', 'thumb'),
      leftIndex: findFingerBones('l', 'index'),
      leftMiddle: findFingerBones('l', 'middle'),
      leftRing: findFingerBones('l', 'ring'),
      leftLittle: findFingerBones('l', 'little'),
      rightThumb: findFingerBones('r', 'thumb'),
      rightIndex: findFingerBones('r', 'index'),
      rightMiddle: findFingerBones('r', 'middle'),
      rightRing: findFingerBones('r', 'ring'),
      rightLittle: findFingerBones('r', 'little'),
    };

    const secondarySwayBones = allBones.filter((b) => {
      const n = b.name.toLowerCase();
      if (n.endsWith('_end')) return false;
      return /j_sec_|bone_hair|bone_skirt|bone_ribbon|bone_cloth|hair|skirt|ribbon|sleeve|cape|tail|flonthair/i.test(n);
    });
    const secondarySwaySet = new Set<THREE.Bone>(secondarySwayBones);
    const secondaryDepths = secondarySwayBones.map((b) => {
      let depth = 0;
      let cur = b.parent;
      while (cur && depth < 8) {
        if ((cur as THREE.Bone).isBone && secondarySwaySet.has(cur as THREE.Bone)) depth++;
        cur = cur.parent;
      }
      return depth;
    });

    // Bespoke character transformation: 芙露德莉斯 (Fleurdelys)
    const fleurdelysNodes: FleurdelysBuildContext['extraAnimatedNodes'] = {
      trailRibbons: [],
      hairLocks: [],
      starSparkles: [],
    };
    const fleurdelysDisposables: FleurdelysBuildContext['disposables'] = {
      geometries: [],
      materials: [],
      textures: [],
    };
    let baseCrownY = 0;
    let baseSwordY = 0;
    const ribbonBaseRotX: number[] = [];
    const ribbonBaseRotZ: number[] = [];
    const hairBaseRotX: number[] = [];
    const hairBaseRotZ: number[] = [];

    const isRinascitaCustom =
      options?.characterId === 'carlotta' ||
      options?.characterId === 'cantarella' ||
      options?.characterId === 'zani';

    if ((!isFbx && options?.characterId === 'fleurdelys') || isRinascitaCustom) {
      const prevMeshCount = originalMeshMaterials.size;
      const buildCtx: FleurdelysBuildContext = {
        character,
        allBones,
        humanoidBones,
        extraAnimatedNodes: fleurdelysNodes,
        disposables: fleurdelysDisposables,
        clothMaterialsList,
        hairMaterialsList,
        originalMeshMaterials,
        materialsSet,
      };
      if (options?.characterId === 'fleurdelys') {
        applyFleurdelysSculptAndCostume(buildCtx);
      } else {
        applyRinascitaCharacterBuild(options!.characterId as RinascitaCharacterId, buildCtx);
      }
      character.updateMatrixWorld(true);
      baseCrownY = fleurdelysNodes.crownGroup?.position.y ?? 0;
      baseSwordY = fleurdelysNodes.swordGroup?.position.y ?? 0;
      fleurdelysNodes.trailRibbons.forEach((m) => {
        ribbonBaseRotX.push(m.rotation.x);
        ribbonBaseRotZ.push(m.rotation.z);
      });
      fleurdelysNodes.hairLocks.forEach((m) => {
        hairBaseRotX.push(m.rotation.x);
        hairBaseRotZ.push(m.rotation.z);
      });
      // Include newly sculpted meshes in topology counts
      if (originalMeshMaterials.size > prevMeshCount) {
        fleurdelysDisposables.geometries.forEach((geo) => {
          meshCount++;
          if (geo.attributes.position) vertices += geo.attributes.position.count;
          if (geo.index) triangles += geo.index.count / 3;
          else if (geo.attributes.position) triangles += geo.attributes.position.count / 3;
        });
      }
    }

    let eyeTrackingEnabled = true;
    const setEyeTracking = (enabled: boolean) => {
      eyeTrackingEnabled = enabled;
    };
    const tempHeadPos = new THREE.Vector3();
    let smoothedGazeYaw = 0;
    let smoothedGazePitch = 0;

    // Discover natural blinking & WuWa pupil gaze morph targets
    const blinkTargets: Array<{ mesh: THREE.Mesh; idx: number }> = [];
    const pupilMorphTargets: {
      left: Array<{ mesh: THREE.Mesh; idx: number }>;
      right: Array<{ mesh: THREE.Mesh; idx: number }>;
      up: Array<{ mesh: THREE.Mesh; idx: number }>;
      down: Array<{ mesh: THREE.Mesh; idx: number }>;
    } = { left: [], right: [], up: [], down: [] };
    const manualMorphOverrides = new Set<string>();
    let suppressAutoBlink = false;

    morphTargetMeshes.forEach(({ mesh, dict }) => {
      Object.entries(dict).forEach(([key, idx]) => {
        const low = key.toLowerCase();
        const isSingleEye = /(_l|_r|left|right)\b/i.test(low);
        if (!isSingleEye && (low.includes('blink') || low.includes('eye_close') || low.includes('eyeclose') || low === 'e_close')) {
          blinkTargets.push({ mesh, idx });
        }
        if (low === 'pupil_l') pupilMorphTargets.left.push({ mesh, idx });
        else if (low === 'pupil_r') pupilMorphTargets.right.push({ mesh, idx });
        else if (low === 'pupil_up') pupilMorphTargets.up.push({ mesh, idx });
        else if (low === 'pupil_down') pupilMorphTargets.down.push({ mesh, idx });
      });
    });

    // 5. Embedded Skeletal Animations
    let mixer: THREE.AnimationMixer | null = null;
    let currentAction: THREE.AnimationAction | null = null;
    let currentClipIndex = -1;
    let useEmbeddedClip = false;

    if (loadedAnimations.length > 0) {
      mixer = new THREE.AnimationMixer(character);
      currentAction = mixer.clipAction(loadedAnimations[0]);
      currentAction.play();
      currentClipIndex = 0;
      useEmbeddedClip = true;
    }

    const playClip = (index: number) => {
      if (!mixer || !loadedAnimations[index]) return;
      if (currentAction) {
        currentAction.fadeOut(0.3);
      }
      currentAction = mixer.clipAction(loadedAnimations[index]);
      currentAction.reset().fadeIn(0.3).play();
      currentClipIndex = index;
      useEmbeddedClip = true;
    };

    let motionSpeed = 1.0;
    const setSpeed = (speed: number) => {
      motionSpeed = speed;
      if (mixer) {
        mixer.timeScale = speed;
      }
    };

    // 6. Smooth Morph Target Control & Living Facial Expression Presets
    let currentExpressionPreset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' = 'neutral';
    const targetMorphValues = new Map<THREE.Mesh, Float32Array>();
    morphTargetMeshes.forEach(({ mesh }) => {
      if (mesh.morphTargetInfluences) {
        targetMorphValues.set(mesh, new Float32Array(mesh.morphTargetInfluences.length));
      }
    });

    const blinkIndexLookup = new Map<THREE.Mesh, Set<number>>();
    blinkTargets.forEach(({ mesh, idx }) => {
      let s = blinkIndexLookup.get(mesh);
      if (!s) {
        s = new Set<number>();
        blinkIndexLookup.set(mesh, s);
      }
      s.add(idx);
    });

    const pupilIndexLookup = new Map<THREE.Mesh, Set<number>>();
    [
      ...pupilMorphTargets.left,
      ...pupilMorphTargets.right,
      ...pupilMorphTargets.up,
      ...pupilMorphTargets.down,
    ].forEach(({ mesh, idx }) => {
      let s = pupilIndexLookup.get(mesh);
      if (!s) {
        s = new Set<number>();
        pupilIndexLookup.set(mesh, s);
      }
      s.add(idx);
    });

    const setMorphTargetValue = (targetName: string, value: number) => {
      if (value > 0.05) {
        manualMorphOverrides.add(targetName);
      } else {
        manualMorphOverrides.delete(targetName);
      }
      morphTargetMeshes.forEach(({ mesh, dict }) => {
        const idx = dict[targetName];
        if (idx !== undefined) {
          const tArr = targetMorphValues.get(mesh);
          if (tArr) tArr[idx] = value;
          if (mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] = value;
          }
        }
      });
    };

    const applyExpressionPreset = (preset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy') => {
      currentExpressionPreset = preset;
      manualMorphOverrides.clear();
      suppressAutoBlink = preset === 'wink' || preset === 'surprised';

      morphTargetMeshes.forEach(({ mesh }) => {
        const tArr = targetMorphValues.get(mesh);
        if (tArr) tArr.fill(0);
      });

      const setFuzzy = (keywords: string[], val: number) => {
        morphTargetMeshes.forEach(({ mesh, dict }) => {
          const tArr = targetMorphValues.get(mesh);
          if (!tArr) return;
          Object.keys(dict).forEach((k) => {
            const low = k.toLowerCase();
            if (keywords.some((kw) => low.includes(kw.toLowerCase()))) {
              tArr[dict[k]] = val;
            }
          });
        });
      };

      if (preset === 'neutral') {
        // Whisper-soft serene poise so resting saintess face feels alive & noble rather than blank
        setFuzzy(['fcl_mth_fun', 'fcl_all_fun', 'm_smile_l', 'm_smile_r'], 0.11);
      } else if (preset === 'smile') {
        setFuzzy(['smile', 'joy', 'happy', 'fun', 'fcl_mth_smile', 'fcl_all_joy', 'm_smile_l', 'm_smile_r', 'e_smile_l', 'e_smile_r', 'b_happy'], 0.68);
      } else if (preset === 'wink') {
        setFuzzy(['wink', 'blink_l', 'eye_close_l', 'fcl_eye_close_l', 'e_smile_l'], 0.94);
        setFuzzy(['m_smile_l', 'm_smile_r', 'fcl_all_fun', 'b_cheerful'], 0.56);
      } else if (preset === 'surprised') {
        setFuzzy(['surprised', 'fcl_all_surprised', 'fcl_mth_a', 'eye_open', 'e_stare', 'm_o', 'b_up_add'], 0.72);
      } else if (preset === 'shy') {
        setFuzzy(['sorrow', 'sad', 'fcl_all_sorrow', 'b_sad', 'e_insipid'], 0.34);
        setFuzzy(['smile', 'joy', 'fcl_all_fun', 'm_smile_l', 'm_smile_r'], 0.38);
      }
    };

    // Initialize serene resting poise immediately
    applyExpressionPreset('neutral');

    // 7. Anatomical Studio Pose & Finger Sculpting Helpers (World-space Euler YXZ -> Bone Local)
    const setTargetVec = (map: Map<THREE.Bone, THREE.Vector3>, bone: THREE.Bone | null, x = 0, y = 0, z = 0) => {
      if (!bone) return;
      const v = map.get(bone);
      if (v) v.set(x, y, z);
    };

    const applyRelaxedFingers = (map: Map<THREE.Bone, THREE.Vector3>, curlScale = 1.0, thumbScale = 1.0) => {
      const applyChain = (chain: THREE.Bone[], curl: number, side: 'l' | 'r') => {
        const sign = side === 'l' ? -1 : 1; // Left fingers (+X) curl -Z into palm; Right fingers (-X) curl +Z
        chain.forEach((b, idx) => {
          const weight = idx === 0 ? 0.55 : idx === 1 ? 0.85 : 0.7;
          setTargetVec(map, b, 0, 0, sign * curl * weight * curlScale);
        });
      };

      applyChain(fingerChains.leftIndex, 0.28, 'l');
      applyChain(fingerChains.leftMiddle, 0.36, 'l');
      applyChain(fingerChains.leftRing, 0.44, 'l');
      applyChain(fingerChains.leftLittle, 0.52, 'l');
      fingerChains.leftThumb.forEach((b, idx) => {
        const w = idx === 0 ? 1.0 : 0.55;
        setTargetVec(map, b, 0.18 * w * thumbScale, -0.3 * w * thumbScale, -0.22 * w * thumbScale);
      });

      applyChain(fingerChains.rightIndex, 0.28, 'r');
      applyChain(fingerChains.rightMiddle, 0.36, 'r');
      applyChain(fingerChains.rightRing, 0.44, 'r');
      applyChain(fingerChains.rightLittle, 0.52, 'r');
      fingerChains.rightThumb.forEach((b, idx) => {
        const w = idx === 0 ? 1.0 : 0.55;
        setTargetVec(map, b, 0.18 * w * thumbScale, 0.3 * w * thumbScale, 0.22 * w * thumbScale);
      });
    };

    let currentMotionPreset: MotionPreset = 'idle';
    let targetMotionBlend = 0; // 0 = Photo Pose + subtle breathing, 1 = Full Procedural Choreography
    let currentMotionBlend = 0;
    let motionPhase = 0;
    let currentFloatY = 0;

    const applyPose = (poseName: PosePreset) => {
      useEmbeddedClip = false;
      if (currentAction) currentAction.stop();
      targetPoseOffsets.forEach((v) => v.set(0, 0, 0));
      currentMotionPreset = 'idle';
      targetMotionBlend = 0;

      const {
        head,
        neck,
        chest,
        spine,
        hips,
        leftShoulder,
        rightShoulder,
        leftUpperArm,
        leftForearm,
        leftHand,
        rightUpperArm,
        rightForearm,
        rightHand,
        leftUpperLeg,
        leftLowerLeg,
        rightUpperLeg,
        rightLowerLeg,
      } = humanoidBones;

      // Always curl fingers softly out of stiff T-pose planks
      applyRelaxedFingers(targetPoseOffsets, poseName === 'combat' ? 1.45 : poseName === 'greet' ? 0.55 : 1.0);

      if (poseName === 'default') {
        // Natural relaxed A-pose instead of raw horizontal T-pose
        setTargetVec(targetPoseOffsets, leftShoulder, 0, 0, -0.05);
        setTargetVec(targetPoseOffsets, rightShoulder, 0, 0, 0.05);
        setTargetVec(targetPoseOffsets, leftUpperArm, 0.05, 0, -1.16);
        setTargetVec(targetPoseOffsets, leftForearm, 0, -0.22, 0);
        setTargetVec(targetPoseOffsets, rightUpperArm, 0.05, 0, 1.16);
        setTargetVec(targetPoseOffsets, rightForearm, 0, 0.22, 0);
        return;
      }

      if (poseName === 'graceful') {
        setTargetVec(targetPoseOffsets, hips, 0, -0.08, -0.04);
        setTargetVec(targetPoseOffsets, spine, -0.02, 0.06, 0.03);
        setTargetVec(targetPoseOffsets, chest, -0.03, 0.06, 0.02);
        setTargetVec(targetPoseOffsets, neck, 0.02, -0.05, -0.02);
        setTargetVec(targetPoseOffsets, head, 0.03, -0.07, -0.05);
        // Left arm gently lifted near waist/chest; Right arm relaxed at side
        setTargetVec(targetPoseOffsets, leftShoulder, 0, 0, -0.05);
        setTargetVec(targetPoseOffsets, leftUpperArm, -0.18, 0.16, -1.04);
        setTargetVec(targetPoseOffsets, leftForearm, 0, -0.58, 0);
        setTargetVec(targetPoseOffsets, leftHand, 0.08, 0, 0.12);
        setTargetVec(targetPoseOffsets, rightShoulder, 0, 0, 0.06);
        setTargetVec(targetPoseOffsets, rightUpperArm, 0.06, -0.08, 1.18);
        setTargetVec(targetPoseOffsets, rightForearm, 0, 0.26, 0);
        setTargetVec(targetPoseOffsets, rightHand, 0.05, 0, -0.08);
        // Contrapposto weight shift
        setTargetVec(targetPoseOffsets, leftUpperLeg, -0.04, 0.04, -0.04);
        setTargetVec(targetPoseOffsets, leftLowerLeg, 0.06, 0, 0);
        setTargetVec(targetPoseOffsets, rightUpperLeg, 0.03, -0.03, 0.05);
      } else if (poseName === 'prayer') {
        setTargetVec(targetPoseOffsets, spine, 0.03, 0, 0);
        setTargetVec(targetPoseOffsets, chest, 0.05, 0, 0);
        setTargetVec(targetPoseOffsets, head, 0.12, 0, -0.02);
        setTargetVec(targetPoseOffsets, leftShoulder, 0, -0.1, -0.06);
        setTargetVec(targetPoseOffsets, rightShoulder, 0, 0.1, 0.06);
        setTargetVec(targetPoseOffsets, leftUpperArm, -0.58, -0.35, -0.95);
        setTargetVec(targetPoseOffsets, leftForearm, 0, -1.25, 0);
        setTargetVec(targetPoseOffsets, leftHand, 0, -0.15, -0.2);
        setTargetVec(targetPoseOffsets, rightUpperArm, -0.58, 0.35, 0.95);
        setTargetVec(targetPoseOffsets, rightForearm, 0, 1.25, 0);
        setTargetVec(targetPoseOffsets, rightHand, 0, 0.15, 0.2);
      } else if (poseName === 'combat') {
        setTargetVec(targetPoseOffsets, hips, 0.06, 0.24, 0);
        setTargetVec(targetPoseOffsets, spine, 0.06, -0.1, 0);
        setTargetVec(targetPoseOffsets, chest, 0.06, -0.18, 0);
        setTargetVec(targetPoseOffsets, head, -0.08, 0.08, 0.03);
        // Right sword/guard arm poised forward; Left balancing arm extended slightly back
        setTargetVec(targetPoseOffsets, rightUpperArm, -0.52, -0.2, 0.84);
        setTargetVec(targetPoseOffsets, rightForearm, 0, 0.88, 0);
        setTargetVec(targetPoseOffsets, rightHand, -0.1, 0, 0.15);
        setTargetVec(targetPoseOffsets, leftUpperArm, 0.22, 0.15, -0.92);
        setTargetVec(targetPoseOffsets, leftForearm, 0, -0.45, 0);
        // Athletic combat stance
        setTargetVec(targetPoseOffsets, leftUpperLeg, -0.22, 0.08, -0.09);
        setTargetVec(targetPoseOffsets, leftLowerLeg, 0.32, 0, 0);
        setTargetVec(targetPoseOffsets, rightUpperLeg, 0.18, -0.1, 0.08);
        setTargetVec(targetPoseOffsets, rightLowerLeg, 0.18, 0, 0);
      } else if (poseName === 'greet') {
        setTargetVec(targetPoseOffsets, hips, 0, 0.08, 0.03);
        setTargetVec(targetPoseOffsets, chest, -0.02, -0.06, -0.02);
        setTargetVec(targetPoseOffsets, head, -0.03, 0.06, 0.09);
        // Right arm raised cheerfully to wave
        setTargetVec(targetPoseOffsets, rightShoulder, 0, 0, -0.14);
        setTargetVec(targetPoseOffsets, rightUpperArm, -0.28, -0.15, -0.48);
        setTargetVec(targetPoseOffsets, rightForearm, 0, 1.32, 0);
        setTargetVec(targetPoseOffsets, rightHand, 0.1, 0, -0.18);
        // Left hand relaxed gracefully
        setTargetVec(targetPoseOffsets, leftUpperArm, 0.04, 0, -1.16);
        setTargetVec(targetPoseOffsets, leftForearm, 0, -0.3, 0);
      }
    };

    const setMotionPreset = (preset: MotionPreset) => {
      useEmbeddedClip = false;
      if (currentAction) currentAction.stop();
      currentMotionPreset = preset;
      targetMotionBlend = preset === 'idle' ? 0 : 1;
    };

    const tempEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const tempWorldDeltaQuat = new THREE.Quaternion();
    const tempLocalDeltaQuat = new THREE.Quaternion();

    const populateMotionOffsets = (phase: number, preset: MotionPreset) => {
      motionOffsets.forEach((v) => v.set(0, 0, 0));
      currentFloatY = 0;

      const {
        head,
        neck,
        chest,
        spine,
        hips,
        leftShoulder,
        rightShoulder,
        leftUpperArm,
        leftForearm,
        leftHand,
        rightUpperArm,
        rightForearm,
        rightHand,
        leftUpperLeg,
        leftLowerLeg,
        leftFoot,
        rightUpperLeg,
        rightLowerLeg,
        rightFoot,
      } = humanoidBones;

      if (preset === 'showcase') {
        const s1 = Math.sin(phase * 1.1);
        const c1 = Math.cos(phase * 1.1);
        const s2 = Math.sin(phase * 2.2);
        applyRelaxedFingers(motionOffsets, 0.88 + s1 * 0.12);
        setTargetVec(motionOffsets, hips, 0.02 * s2, 0.12 * s1, 0.05 * c1);
        setTargetVec(motionOffsets, spine, -0.02 + 0.02 * s2, -0.06 * s1, -0.03 * c1);
        setTargetVec(motionOffsets, chest, -0.03 * c1, -0.08 * s1, -0.03 * c1);
        setTargetVec(motionOffsets, neck, 0.02, 0.05 * s1, 0);
        setTargetVec(motionOffsets, head, 0.03 * s2, 0.1 * s1, 0.06 * c1);

        setTargetVec(motionOffsets, leftShoulder, 0, 0, -0.06 - 0.03 * s1);
        setTargetVec(motionOffsets, leftUpperArm, -0.22 + 0.16 * s1, 0.18 * c1, -0.98 + 0.14 * c1);
        setTargetVec(motionOffsets, leftForearm, 0, -0.68 - 0.18 * s1, 0);
        setTargetVec(motionOffsets, leftHand, 0.08 * c1, 0.12 * s1, 0.14);

        setTargetVec(motionOffsets, rightShoulder, 0, 0, 0.06 - 0.03 * s1);
        setTargetVec(motionOffsets, rightUpperArm, -0.08 - 0.14 * s1, -0.14 * c1, 1.08 + 0.14 * c1);
        setTargetVec(motionOffsets, rightForearm, 0, 0.45 + 0.18 * c1, 0);
        setTargetVec(motionOffsets, rightHand, 0.08 * s1, -0.1 * c1, -0.1);

        setTargetVec(motionOffsets, leftUpperLeg, -0.05 * s1, 0.04, -0.05);
        setTargetVec(motionOffsets, leftLowerLeg, 0.08 * Math.max(0, s1), 0, 0);
        setTargetVec(motionOffsets, rightUpperLeg, 0.05 * s1, -0.04, 0.05);
        setTargetVec(motionOffsets, rightLowerLeg, 0.08 * Math.max(0, -s1), 0, 0);
      } else if (preset === 'channel') {
        const s1 = Math.sin(phase * 1.35);
        const c1 = Math.cos(phase * 1.35);
        const s2 = Math.sin(phase * 2.7);
        currentFloatY = 0.042 + Math.sin(phase * 1.6) * 0.028;
        applyRelaxedFingers(motionOffsets, 0.62 + 0.15 * s2, 0.75);

        setTargetVec(motionOffsets, hips, -0.04, 0.06 * s1, 0.03 * c1);
        setTargetVec(motionOffsets, spine, -0.03 + 0.02 * s2, 0, 0);
        setTargetVec(motionOffsets, chest, -0.05 + 0.03 * s2, -0.05 * s1, 0);
        setTargetVec(motionOffsets, head, -0.08 + 0.04 * s2, 0.06 * s1, 0.04 * c1);

        setTargetVec(motionOffsets, leftUpperArm, -0.46 + 0.1 * s1, -0.12 + 0.1 * c1, -0.82 + 0.12 * s2);
        setTargetVec(motionOffsets, leftForearm, 0, -0.95 - 0.18 * c1, 0);
        setTargetVec(motionOffsets, leftHand, -0.18 + 0.12 * s1, -0.15, 0.16 * c1);

        setTargetVec(motionOffsets, rightUpperArm, -0.46 - 0.1 * s1, 0.12 - 0.1 * c1, 0.82 - 0.12 * s2);
        setTargetVec(motionOffsets, rightForearm, 0, 0.95 + 0.18 * s1, 0);
        setTargetVec(motionOffsets, rightHand, -0.18 + 0.12 * c1, 0.15, -0.16 * s1);

        setTargetVec(motionOffsets, leftUpperLeg, -0.08 + 0.03 * s1, 0, -0.06);
        setTargetVec(motionOffsets, leftLowerLeg, 0.16 + 0.05 * c1, 0, 0);
        setTargetVec(motionOffsets, leftFoot, -0.16, 0, 0);
        setTargetVec(motionOffsets, rightUpperLeg, -0.14 - 0.03 * s1, 0, 0.06);
        setTargetVec(motionOffsets, rightLowerLeg, 0.24 - 0.05 * c1, 0, 0);
        setTargetVec(motionOffsets, rightFoot, -0.22, 0, 0);
      } else if (preset === 'combat') {
        const pulse = Math.sin(phase * 2.8);
        const sway = Math.cos(phase * 1.4);
        applyRelaxedFingers(motionOffsets, 1.5, 1.2);

        setTargetVec(motionOffsets, hips, 0.07 + 0.02 * pulse, 0.26 + 0.04 * sway, 0);
        setTargetVec(motionOffsets, spine, 0.06 + 0.02 * pulse, -0.1, 0);
        setTargetVec(motionOffsets, chest, 0.06 + 0.025 * pulse, -0.2 + 0.04 * sway, 0);
        setTargetVec(motionOffsets, head, -0.1 - 0.02 * pulse, 0.08 - 0.03 * sway, 0.03);

        setTargetVec(motionOffsets, rightUpperArm, -0.56 + 0.06 * pulse, -0.22, 0.8 + 0.05 * sway);
        setTargetVec(motionOffsets, rightForearm, 0, 0.94 + 0.08 * pulse, 0);
        setTargetVec(motionOffsets, rightHand, -0.12, 0, 0.16);

        setTargetVec(motionOffsets, leftUpperArm, 0.24 - 0.06 * pulse, 0.16, -0.88 - 0.06 * sway);
        setTargetVec(motionOffsets, leftForearm, 0, -0.52 + 0.08 * pulse, 0);

        setTargetVec(motionOffsets, leftUpperLeg, -0.24 - 0.02 * pulse, 0.08, -0.09);
        setTargetVec(motionOffsets, leftLowerLeg, 0.34 + 0.03 * pulse, 0, 0);
        setTargetVec(motionOffsets, rightUpperLeg, 0.18 + 0.02 * pulse, -0.1, 0.08);
        setTargetVec(motionOffsets, rightLowerLeg, 0.18 + 0.02 * pulse, 0, 0);
      } else if (preset === 'greet') {
        const wave = Math.sin(phase * 3.8);
        const body = Math.sin(phase * 1.9);
        applyRelaxedFingers(motionOffsets, 0.45, 0.7);

        setTargetVec(motionOffsets, hips, 0, 0.08 + 0.04 * body, 0.03 * body);
        setTargetVec(motionOffsets, chest, -0.02, -0.06 + 0.04 * body, -0.02 * body);
        setTargetVec(motionOffsets, head, -0.03 + 0.03 * body, 0.06, 0.09 + 0.03 * wave * 0.3);

        setTargetVec(motionOffsets, rightShoulder, 0, 0, -0.16);
        setTargetVec(motionOffsets, rightUpperArm, -0.28, -0.15, -0.52 + 0.08 * wave);
        setTargetVec(motionOffsets, rightForearm, 0, 1.32 + 0.24 * wave, 0);
        setTargetVec(motionOffsets, rightHand, 0.08, 0.16 * wave, -0.18 + 0.18 * wave);

        setTargetVec(motionOffsets, leftUpperArm, 0.05, 0.04 * body, -1.16);
        setTargetVec(motionOffsets, leftForearm, 0, -0.32, 0);
      } else if (preset === 'catwalk') {
        // Stylized studio walk-in-place with synchronized knees, ankles, hip twist & arm swing
        const s = Math.sin(phase * 2.6);
        const c = Math.cos(phase * 2.6);
        const bounce = Math.abs(c) * 0.022;
        currentFloatY = bounce - 0.01;
        applyRelaxedFingers(motionOffsets, 0.95);

        setTargetVec(motionOffsets, hips, 0.03, -0.12 * s, 0.055 * s);
        setTargetVec(motionOffsets, spine, 0.02, 0.06 * s, -0.025 * s);
        setTargetVec(motionOffsets, chest, 0.02, 0.12 * s, -0.03 * s);
        setTargetVec(motionOffsets, head, -0.03, -0.06 * s, 0.02 * s);

        // Counter-swinging arms
        setTargetVec(motionOffsets, leftUpperArm, 0.24 * s, 0.08 * c, -1.16);
        setTargetVec(motionOffsets, leftForearm, 0, -0.26 - Math.max(0, -s) * 0.25, 0);
        setTargetVec(motionOffsets, rightUpperArm, -0.24 * s, -0.08 * c, 1.16);
        setTargetVec(motionOffsets, rightForearm, 0, 0.26 + Math.max(0, s) * 0.25, 0);

        // Stride cycle legs
        setTargetVec(motionOffsets, leftUpperLeg, -0.32 * s, 0, -0.03);
        setTargetVec(motionOffsets, leftLowerLeg, 0.1 + Math.max(0, c) * 0.42 + Math.max(0, -s) * 0.15, 0, 0);
        setTargetVec(motionOffsets, leftFoot, 0.12 * s - 0.08 * Math.max(0, c), 0, 0);

        setTargetVec(motionOffsets, rightUpperLeg, 0.32 * s, 0, 0.03);
        setTargetVec(motionOffsets, rightLowerLeg, 0.1 + Math.max(0, -c) * 0.42 + Math.max(0, s) * 0.15, 0, 0);
        setTargetVec(motionOffsets, rightFoot, -0.12 * s - 0.08 * Math.max(0, -c), 0, 0);
      }
    };

    const applyWorldBoneRotation = (bone: THREE.Bone, rx: number, ry: number, rz: number) => {
      const initQ = initialBoneQuats.get(bone);
      const bindW = boneBindWorldQuats.get(bone);
      const bindWInv = boneBindWorldInv.get(bone);
      if (!initQ || !bindW || !bindWInv) return;

      // Compensate upper-arm Z rotation for rigs already resting in an A-pose (e.g. Unreal FBX)
      let adjRz = rz;
      if (restArmDropRad > 0.05) {
        if (bone === humanoidBones.leftUpperArm) adjRz += restArmDropRad;
        else if (bone === humanoidBones.rightUpperArm) adjRz -= restArmDropRad;
      }

      if (Math.abs(rx) < 0.0001 && Math.abs(ry) < 0.0001 && Math.abs(adjRz) < 0.0001) {
        bone.quaternion.copy(initQ);
        return;
      }

      tempEuler.set(rx, ry, adjRz, 'YXZ');
      tempWorldDeltaQuat.setFromEuler(tempEuler);
      // Conjugate world-space delta into bone's local rest-pose frame
      tempLocalDeltaQuat.copy(bindWInv).multiply(tempWorldDeltaQuat).multiply(bindW);
      bone.quaternion.copy(initQ).multiply(tempLocalDeltaQuat);
    };

    // 8. Living Idle Motion + Procedural Choreography + Camera Gaze Tracking + Auto Blinking
    const update = (
      time: number,
      delta: number,
      breathingIntensity = 1.0,
      isMotionPlaying = true,
      cameraWorldPos?: THREE.Vector3,
    ) => {
      const dt = Math.min(delta, 0.08);
      const dampLambda = 7.5;

      if (isMotionPlaying) {
        motionPhase += dt * motionSpeed;
      }

      const useProcedural = !(useEmbeddedClip && mixer && currentAction);

      if (useProcedural) {
        currentMotionBlend = THREE.MathUtils.damp(currentMotionBlend, targetMotionBlend, 6.5, dt);
        if (currentMotionBlend > 0.002) {
          populateMotionOffsets(motionPhase, currentMotionPreset);
        } else {
          currentFloatY = 0;
        }

        character.position.y = THREE.MathUtils.damp(character.position.y, baseCharY + currentFloatY * currentMotionBlend, 7.0, dt);

        // Gentle camera-facing eye/head gaze offset + subtle living saccadic eye micro-glances
        let targetGazeYaw = 0;
        let targetGazePitch = 0;
        if (eyeTrackingEnabled && cameraWorldPos && humanoidBones.head) {
          humanoidBones.head.getWorldPosition(tempHeadPos);
          const dx = cameraWorldPos.x - tempHeadPos.x;
          const dy = cameraWorldPos.y - tempHeadPos.y;
          const dz = cameraWorldPos.z - tempHeadPos.z;
          const horizDist = Math.hypot(dx, dz);
          if (dz > 0.25 && horizDist > 0.15) {
            targetGazeYaw = THREE.MathUtils.clamp(Math.atan2(dx, dz) * 0.42, -0.22, 0.22);
            targetGazePitch = THREE.MathUtils.clamp(-Math.atan2(dy, horizDist) * 0.32, -0.1, 0.12);
          }
        }
        const saccadeYaw = Math.sin(time * 0.41) * 0.016 + Math.sin(time * 1.13) * 0.008;
        const saccadePitch = Math.cos(time * 0.37) * 0.01;
        smoothedGazeYaw = THREE.MathUtils.damp(smoothedGazeYaw, targetGazeYaw + saccadeYaw, 5.2, dt);
        smoothedGazePitch = THREE.MathUtils.damp(smoothedGazePitch, targetGazePitch + saccadePitch, 5.2, dt);

        // Expression-coupled subtle head nuance for living emotional presence
        const exprHeadTiltZ =
          currentExpressionPreset === 'wink'
            ? 0.055
            : currentExpressionPreset === 'smile'
              ? 0.028
              : currentExpressionPreset === 'shy'
                ? -0.045
                : 0;
        const exprHeadPitchX =
          currentExpressionPreset === 'shy'
            ? 0.045
            : currentExpressionPreset === 'surprised'
              ? -0.032
              : 0;

        const breathClock = motionPhase;
        const breathWave = Math.sin(breathClock * 1.85);
        const swayWave = Math.sin(breathClock * 0.68);
        const headGlance = Math.sin(breathClock * 0.52);

        for (let i = 0; i < allBones.length; i++) {
          const bone = allBones[i];
          const targetPose = targetPoseOffsets.get(bone);
          const currPose = currentPoseOffsets.get(bone);
          const mOff = motionOffsets.get(bone);
          if (!targetPose || !currPose || !mOff) continue;

          currPose.x = THREE.MathUtils.damp(currPose.x, targetPose.x, dampLambda, dt);
          currPose.y = THREE.MathUtils.damp(currPose.y, targetPose.y, dampLambda, dt);
          currPose.z = THREE.MathUtils.damp(currPose.z, targetPose.z, dampLambda, dt);

          const blendX = THREE.MathUtils.lerp(currPose.x, mOff.x, currentMotionBlend);
          const blendY = THREE.MathUtils.lerp(currPose.y, mOff.y, currentMotionBlend);
          const blendZ = THREE.MathUtils.lerp(currPose.z, mOff.z, currentMotionBlend);

          let idleX = 0;
          let idleY = 0;
          let idleZ = 0;

          if (bone === humanoidBones.chest) {
            idleX = -breathWave * 0.022 * breathingIntensity;
            idleZ = swayWave * 0.01 * breathingIntensity;
          } else if (bone === humanoidBones.spine) {
            idleX = -breathWave * 0.01 * breathingIntensity;
            idleY = swayWave * 0.016 * breathingIntensity;
          } else if (bone === humanoidBones.head) {
            idleX = breathWave * 0.012 * breathingIntensity + smoothedGazePitch * 0.52 + exprHeadPitchX;
            idleY = headGlance * 0.022 * breathingIntensity + smoothedGazeYaw * 0.62;
            idleZ = Math.cos(breathClock * 0.43) * 0.014 * breathingIntensity + exprHeadTiltZ;
          } else if (bone === humanoidBones.neck) {
            idleX = smoothedGazePitch * 0.25 + exprHeadPitchX * 0.35;
            idleY = smoothedGazeYaw * 0.3;
            idleZ = exprHeadTiltZ * 0.35;
          } else if (bone === humanoidBones.leftEye || bone === humanoidBones.rightEye) {
            idleX = smoothedGazePitch * 0.58;
            idleY = smoothedGazeYaw * 0.58;
          } else if (bone === humanoidBones.leftShoulder) {
            idleZ = -breathWave * 0.016 * breathingIntensity;
          } else if (bone === humanoidBones.rightShoulder) {
            idleZ = breathWave * 0.016 * breathingIntensity;
          } else if (bone === humanoidBones.leftUpperArm && currentMotionBlend < 0.2) {
            idleZ = -breathWave * 0.018 * breathingIntensity;
          } else if (bone === humanoidBones.rightUpperArm && currentMotionBlend < 0.2) {
            idleZ = breathWave * 0.018 * breathingIntensity;
          }

          applyWorldBoneRotation(bone, blendX + idleX, blendY + idleY, blendZ + idleZ);
        }

        // Secondary flowing hair, ribbons & skirt hems (chain-depth attenuated to avoid clipping)
        for (let i = 0; i < secondarySwayBones.length; i++) {
          const secBone = secondarySwayBones[i];
          const initQ = initialBoneQuats.get(secBone);
          if (!initQ) continue;
          const depth = secondaryDepths[i] ?? 0;
          const chainAtten = isFbx ? 0.55 / (1 + depth * 0.65) : 1.0;
          const phase = i * 0.72;
          const speedMult = currentMotionPreset === 'catwalk' ? 1.85 : 1.0;
          const breeze =
            Math.sin(breathClock * 1.45 * speedMult + phase) * 0.024 +
            Math.cos(breathClock * 2.3 * speedMult + phase * 1.3) * 0.01;
          const sway = Math.cos(breathClock * 1.15 * speedMult + phase) * 0.015;
          const amp = (0.65 + 0.35 * breathingIntensity) * (currentMotionPreset === 'channel' ? 1.45 : 1.0) * chainAtten;
          applyWorldBoneRotation(secBone, breeze * amp, 0, sway * amp);
        }

        // Drive WuWa directional pupil morph targets when eye bones are absent
        if (pupilMorphTargets.left.length > 0 && manualMorphOverrides.size === 0) {
          const gYaw = THREE.MathUtils.clamp(smoothedGazeYaw * 2.2, -0.55, 0.55);
          const gPitch = THREE.MathUtils.clamp(smoothedGazePitch * 2.2, -0.45, 0.45);
          const applyList = (list: Array<{ mesh: THREE.Mesh; idx: number }>, val: number) => {
            for (let k = 0; k < list.length; k++) {
              const inf = list[k].mesh.morphTargetInfluences;
              if (inf) inf[list[k].idx] = val;
            }
          };
          applyList(pupilMorphTargets.left, Math.max(0, gYaw));
          applyList(pupilMorphTargets.right, Math.max(0, -gYaw));
          applyList(pupilMorphTargets.down, Math.max(0, gPitch));
          applyList(pupilMorphTargets.up, Math.max(0, -gPitch));
        }

        // Fleurdelys bespoke sentinel animations (crown levitation + tilt, greatsword hover + resonant sway, ribbons, hair, star sparkles)
        const fAmp = 0.65 + 0.35 * breathingIntensity;
        if (fleurdelysNodes.crownGroup) {
          fleurdelysNodes.crownGroup.position.y = baseCrownY + Math.sin(breathClock * 1.4) * 0.0085 * fAmp;
          fleurdelysNodes.crownGroup.rotation.z = Math.sin(breathClock * 0.85) * 0.022 * fAmp;
          fleurdelysNodes.crownGroup.rotation.x = Math.cos(breathClock * 0.72) * 0.016 * fAmp;
        }
        if (fleurdelysNodes.swordGroup) {
          fleurdelysNodes.swordGroup.position.y = baseSwordY + Math.sin(breathClock * 1.2 + 0.8) * 0.02 * fAmp;
          fleurdelysNodes.swordGroup.rotation.y = -0.22 + Math.sin(breathClock * 0.65) * 0.045 * fAmp;
        }
        for (let i = 0; i < fleurdelysNodes.trailRibbons.length; i++) {
          const rib = fleurdelysNodes.trailRibbons[i];
          const phase = i * 1.15;
          rib.rotation.x =
            (ribbonBaseRotX[i] ?? 0) +
            (Math.sin(breathClock * 1.45 + phase) * 0.042 + Math.sin(breathClock * 2.7 + phase * 1.6) * 0.012) * fAmp;
          rib.rotation.z =
            (ribbonBaseRotZ[i] ?? 0) +
            (Math.cos(breathClock * 1.1 + phase) * 0.032 + Math.cos(breathClock * 2.2 + phase * 1.3) * 0.01) * fAmp;
        }
        for (let i = 0; i < fleurdelysNodes.hairLocks.length; i++) {
          const lock = fleurdelysNodes.hairLocks[i];
          const phase = i * 0.58;
          lock.rotation.x =
            (hairBaseRotX[i] ?? 0) +
            (Math.sin(breathClock * 1.42 + phase) * 0.026 + Math.sin(breathClock * 2.65 + phase * 1.8) * 0.009) * fAmp;
          lock.rotation.z =
            (hairBaseRotZ[i] ?? 0) +
            (Math.cos(breathClock * 1.12 + phase) * 0.022 + Math.cos(breathClock * 2.15 + phase * 1.4) * 0.008) * fAmp;
        }
        for (let i = 0; i < fleurdelysNodes.starSparkles.length; i++) {
          const sp = fleurdelysNodes.starSparkles[i];
          const tw = 0.82 + 0.24 * Math.sin(time * 3.1 + i * 1.17);
          sp.scale.setScalar(tw);
          sp.rotation.z = Math.sin(time * 1.4 + i * 0.9) * 0.25;
        }
      }

      // Smoothly damp expression morph targets toward active preset targets (silky transitions instead of instant snap)
      if (manualMorphOverrides.size === 0) {
        morphTargetMeshes.forEach(({ mesh }) => {
          const inf = mesh.morphTargetInfluences;
          const tArr = targetMorphValues.get(mesh);
          if (!inf || !tArr) return;
          const bSet = blinkIndexLookup.get(mesh);
          const pSet = pupilIndexLookup.get(mesh);
          for (let k = 0; k < inf.length; k++) {
            if (!suppressAutoBlink && bSet?.has(k)) continue;
            if (pSet?.has(k)) continue;
            inf[k] = THREE.MathUtils.damp(inf[k], tArr[k], 9.0, dt);
          }
        });
      }

      // Organic irregular eyelid blinking (natural ~3.6-4.8s rhythm with occasional gentle double-blink)
      if (!suppressAutoBlink && blinkTargets.length > 0 && manualMorphOverrides.size === 0) {
        const longCycle = time % 12.6;
        let blinkVal = 0;
        const evalBlink = (t: number, start: number, dur = 0.17) => {
          if (t > start && t < start + dur) {
            return Math.sin(((t - start) / dur) * Math.PI);
          }
          return 0;
        };
        blinkVal = Math.max(
          evalBlink(longCycle, 3.6, 0.17),
          evalBlink(longCycle, 7.9, 0.16),
          evalBlink(longCycle, 8.22, 0.15), // natural soft double-blink
          evalBlink(longCycle, 11.8, 0.18),
        );
        for (let i = 0; i < blinkTargets.length; i++) {
          const { mesh, idx } = blinkTargets[i];
          if (mesh.morphTargetInfluences) {
            mesh.morphTargetInfluences[idx] = blinkVal;
          }
        }
      }
    };

    // 9. Skeleton Helper & Topology View Mode
    let skeletonHelper: THREE.SkeletonHelper | null = null;
    if (skinnedMeshes.length > 0 || boneCount > 0) {
      skeletonHelper = new THREE.SkeletonHelper(character);
      skeletonHelper.visible = false;
      if (skeletonHelper.material instanceof THREE.LineBasicMaterial) {
        skeletonHelper.material.linewidth = 2;
        skeletonHelper.material.color.setHex(0x38bdf8);
      }
    }

    const toggleSkeleton = (visible: boolean) => {
      if (skeletonHelper) {
        skeletonHelper.visible = visible;
      }
    };

    const setViewMode = (mode: 'pbr' | 'clay' | 'wireframe') => {
      if (mode === 'pbr') {
        originalMeshMaterials.forEach((origMat, mesh) => {
          mesh.material = origMat;
        });
        return;
      }

      if (mode === 'clay') {
        if (!clayMaterial) {
          clayMaterial = new THREE.MeshPhysicalMaterial({
            name: 'Studio_Sculpt_Clay',
            color: 0xedeff4,
            emissive: new THREE.Color(0x0f172a),
            emissiveIntensity: 0.08,
            roughness: 0.5,
            metalness: 0.0,
            clearcoat: 0.05,
            clearcoatRoughness: 0.48,
            sheen: 0.1,
            sheenRoughness: 0.62,
            sheenColor: new THREE.Color(0xf8fafc),
            envMapIntensity: 0.72,
            side: THREE.DoubleSide,
          });
        }
        const getClayMatForOrig = (orig: THREE.Material): THREE.Material => {
          const origAny = orig as THREE.MeshStandardMaterial;
          if (origAny && origAny.map && origAny.alphaTest > 0.05) {
            let cached = clayCutoutMaterials.get(orig);
            if (!cached) {
              cached = new THREE.MeshPhysicalMaterial({
                name: 'Studio_Sculpt_Clay_Cutout',
                map: origAny.map,
                alphaTest: origAny.alphaTest,
                color: 0xffffff,
                emissive: new THREE.Color(0x0f172a),
                emissiveIntensity: 0.08,
                roughness: 0.5,
                metalness: 0.0,
                clearcoat: 0.05,
                clearcoatRoughness: 0.48,
                sheen: 0.1,
                sheenRoughness: 0.62,
                sheenColor: new THREE.Color(0xf8fafc),
                envMapIntensity: 0.72,
                side: THREE.DoubleSide,
              });
              cached.customProgramCacheKey = () => 'wuwa-clay-cutout-v2';
              cached.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <map_fragment>',
                  `
                  #include <map_fragment>
                  diffuseColor.rgb = vec3(0.86, 0.88, 0.92);
                  `,
                );
              };
              clayCutoutMaterials.set(orig, cached);
            }
            return cached;
          }
          return clayMaterial!;
        };
        originalMeshMaterials.forEach((origMat, mesh) => {
          mesh.material = Array.isArray(origMat) ? origMat.map(getClayMatForOrig) : getClayMatForOrig(origMat);
        });
      } else if (mode === 'wireframe') {
        if (!wireMaterial) {
          wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.72,
          });
        }
        originalMeshMaterials.forEach((_, mesh) => {
          mesh.material = wireMaterial!;
        });
      }
    };

    if (targetScene) {
      targetScene.add(character);
      if (skeletonHelper) {
        targetScene.add(skeletonHelper);
      }
    }

    const updateKeyLightDir = (viewSpaceDir: THREE.Vector3) => {
      if (viewSpaceDir.lengthSq() > 1e-8) {
        sharedSkinUniforms.uKeyLightDir.value.copy(viewSpaceDir).normalize();
      }
    };

    const updateMaterialParams = (params: CharacterMaterialUpdateParams) => {
      if (params.sssWarmth !== undefined) {
        sharedSkinUniforms.uSssIntensity.value = params.sssWarmth;
      }
      if (params.rimPower !== undefined) {
        sharedSkinUniforms.uRimIntensity.value = params.rimPower;
      }
      if (params.rimColor !== undefined) {
        sharedSkinUniforms.uRimColor.value.set(params.rimColor as any);
      }
      if (params.skinTone !== undefined) {
        const toneHex =
          params.skinTone === 'porcelain'
            ? 0xfdf0ea
            : params.skinTone === 'warm'
              ? 0xf2cbb8
              : 0xf9dcd0;
        sharedSkinUniforms.uSkinTint.value.setHex(toneHex);
      }
      if (params.microBump !== undefined) {
        skinMaterialsList.forEach((mat) => {
          if (mat.normalScale) {
            mat.normalScale.set(0.24 * params.microBump!, 0.24 * params.microBump!);
          }
        });
      }
      if (params.skinSheen !== undefined) {
        skinMaterialsList.forEach((mat) => {
          mat.sheen = 0.28 * params.skinSheen!;
          mat.clearcoat = 0.08 * params.skinSheen!;
        });
      }
      if (params.fabricBump !== undefined) {
        clothMaterialsList.forEach((mat) => {
          if (mat.normalScale) {
            mat.normalScale.set(0.42 * params.fabricBump!, 0.42 * params.fabricBump!);
          }
        });
      }
    };

    const dispose = () => {
      if (mixer) {
        mixer.stopAllAction();
      }
      if (targetScene) {
        targetScene.remove(character);
        if (skeletonHelper) targetScene.remove(skeletonHelper);
      }
      skeletonHelper?.dispose();
      clayMaterial?.dispose();
      clayCutoutMaterials.forEach((m) => m.dispose());
      wireMaterial?.dispose();
      cachedMicroNormalMap?.dispose();
      cachedSkinRoughnessMap?.dispose();
      cachedFabricNormalMap?.dispose();
      cachedHairNormalMap?.dispose();

      character.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
      fleurdelysDisposables.geometries.forEach((g) => g.dispose());
      fleurdelysDisposables.materials.forEach((m) => m.dispose());
      fleurdelysDisposables.textures.forEach((t) => t.dispose());
      fbxLoadedTextures.forEach((t) => t.dispose());
      materialsSet.forEach((m) => m.dispose());
    };

    // Initialize in graceful A-pose by default so arms are never stuck in raw T-pose
    applyPose('default');

    return {
      character,
      mixer,
      animations: loadedAnimations,
      currentAction,
      currentClipIndex,
      dimensions: scaledBounds.getSize(new THREE.Vector3()),
      center,
      skeletonHelper,
      skinnedMeshes,
      morphTargetMeshes,
      stats: {
        vertices: Math.round(vertices),
        triangles: Math.round(triangles),
        meshes: meshCount,
        bones: boneCount,
        materials: materialsSet.size,
      },
      playClip,
      setSpeed,
      setMorphTargetValue,
      applyPose,
      setMotionPreset,
      applyExpressionPreset,
      toggleSkeleton,
      setEyeTracking,
      setViewMode,
      updateMaterialParams,
      updateKeyLightDir,
      update,
      dispose,
    };
  } catch (error) {
    console.error('Character loading failed:', error);
    throw error;
  } finally {
    if (isBlobUrl && url) {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }
}
