import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BodyCustomization } from '../types/anatomical';
import { loadCharacter, CharacterModelData, MotionPreset, PosePreset } from '../loaders/characterLoader';
import { loadPmxFolderModel, MmdControllerApi } from '../loaders/pmxLoader';
import {
  listSavedMmdModels,
  saveMmdFolderToVault,
  loadSavedMmdModelFiles,
  deleteSavedMmdModel,
  SavedMmdSummary,
} from '../utils/mmdStorage';
import { MmdControlPanel } from './MmdControlPanel';
import {
  createWaterRippleTexture,
  createResonanceParticleTexture,
  createStudioContactShadowTexture,
} from '../utils/wuwaTextures';
import { wuwaAudio } from '../audio/wuwaAudio';
import {
  Sparkles,
  Camera,
  RotateCw,
  Volume2,
  VolumeX,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Users,
  Activity,
  Layers,
  Heart,
  Upload,
  FolderOpen,
  Play,
  Pause,
  Cpu,
  Bone,
  AlertCircle,
  Smile,
  Sparkle,
  Database,
  Trash2,
} from 'lucide-react';

export interface AnimeCharacterPreset {
  id: string;
  name: string;
  title: string;
  element: string;
  elementColor: string;
  modelPath: string;
  targetHeight?: number;
  description: string;
  specs: {
    heightCm: number;
    weightKg: number;
    bustCm: number;
    waistCm: number;
    hipCm: number;
    role: string;
    resonanceFreq: string;
  };
  defaultPose: 'default' | 'graceful' | 'prayer' | 'combat' | 'greet';
  defaultExpression: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy';
  lightingPreset: 'celestial' | 'sunset' | 'cyber' | 'gallery';
}

export const ANIME_CHARACTERS: AnimeCharacterPreset[] = [
  {
    id: 'fleurdelys',
    name: '芙露德莉斯 · 聖女劍冠',
    title: '黎那汐塔歲主共鳴者 (自研精修版)',
    element: '氣動 (Aero)',
    elementColor: 'text-sky-300 bg-sky-950/80 border-sky-700/80',
    modelPath: '/models/shorekeeper_victoria.glb',
    targetHeight: 2.58,
    description:
      '182cm 高挑聖女型態（參考原版結構持續優化）。中分羽毛層次香檳金／水藍長髮、前傾纖細螺旋金角、精靈尖耳與開放式懸浮荊棘藍晶花環，搭配雙垂聖潔白緞披巾、胸前藍棘黑紗束腰短裙及青晶聖劍。',
    specs: {
      heightCm: 182,
      weightKg: 54,
      bustCm: 94,
      waistCm: 56,
      hipCm: 91,
      role: '歲主共鳴者 / 聖劍共鳴型態',
      resonanceFreq: '198.60 MHz (聖冠風汐)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'neutral',
    lightingPreset: 'celestial',
  },
  {
    id: 'fleurdelys_fbx',
    name: 'Fleurdelys',
    title: '原版 FBX 參考模型 (Wuthering Waves)',
    element: '氣動 (Aero)',
    elementColor: 'text-sky-300 bg-sky-950/80 border-sky-700/80',
    modelPath: '/models/fleurdelys/Fleurdelys.fbx',
    targetHeight: 2.58,
    description:
      '匯入之原版 Fleurdelys FBX 模型（307 根完整骨骼、105 組臉部表情變形與 8 組原版高解析度貼圖），可與自研精修版切換對照。',
    specs: {
      heightCm: 182,
      weightKg: 54,
      bustCm: 94,
      waistCm: 56,
      hipCm: 91,
      role: '歲主共鳴者 / 原版 FBX 參考',
      resonanceFreq: '198.60 MHz (原版結構)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'neutral',
    lightingPreset: 'celestial',
  },
  {
    id: 'shorekeeper',
    name: '守岸人 · 典藏靈境',
    title: '黑海岸的守望者 (Shorekeeper)',
    element: '衍射 (Spectro)',
    elementColor: 'text-cyan-300 bg-cyan-950/80 border-cyan-700/80',
    modelPath: '/models/shorekeeper_victoria.glb',
    description: '黑海岸首領，掌控時序天體與靈境網絡。華麗長髮長裙、深邃星芒眸光、精緻蕾絲飾品與完整骨骼綁定。',
    specs: {
      heightCm: 168,
      weightKg: 48,
      bustCm: 86,
      waistCm: 58,
      hipCm: 88,
      role: '黑海岸主理人 / 衍射輔助增益',
      resonanceFreq: '142.85 MHz (時序天體)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'smile',
    lightingPreset: 'celestial',
  },
  {
    id: 'carlotta',
    name: '珂萊塔 · 歐泊晶槍',
    title: '莫塔里家族二小姐 (Carlotta)',
    element: '冷凝 (Glacio)',
    elementColor: 'text-pink-300 bg-rose-950/80 border-pink-700/80',
    modelPath: '/models/sanhua_shino.glb',
    targetHeight: 2.38,
    description:
      '黎那汐塔莫塔里家族的優雅藝術投資人。銀白長髮與粉青雙色寶石眼眸、緋紅貴族披肩、懸浮變彩歐泊晶體與雙懸浮歐泊晶槍「死與舞」。',
    specs: {
      heightCm: 164,
      weightKg: 46,
      bustCm: 84,
      waistCm: 56,
      hipCm: 86,
      role: '莫塔里二小姐 / 冷凝雙槍主C',
      resonanceFreq: '166.40 MHz (歐泊碎晶)',
    },
    defaultPose: 'combat',
    defaultExpression: 'smile',
    lightingPreset: 'cyber',
  },
  {
    id: 'cantarella',
    name: '坎特蕾拉 · 翡薩烈水母',
    title: '翡薩烈現任家主 (Cantarella)',
    element: '湮滅 (Havoc)',
    elementColor: 'text-purple-300 bg-purple-950/80 border-purple-700/80',
    modelPath: '/models/shorekeeper_victoria.glb',
    targetHeight: 2.48,
    description:
      '黎那汐塔翡薩烈家族家主「海中夢」。薰衣草紫銀長髮、深邃紫晶星眸、深海珊瑚藍寶冠冕與懸浮發光半透明水母幻影。',
    specs: {
      heightCm: 173,
      weightKg: 51,
      bustCm: 92,
      waistCm: 57,
      hipCm: 90,
      role: '翡薩烈家主 / 湮滅協同治癒',
      resonanceFreq: '184.20 MHz (毒夢海瀾)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'neutral',
    lightingPreset: 'celestial',
  },
  {
    id: 'zani',
    name: '贊妮 · 光噪灼焰',
    title: '阿維紐林銀行守護者 (Zani)',
    element: '衍射 (Spectro)',
    elementColor: 'text-amber-300 bg-amber-950/80 border-amber-700/80',
    modelPath: '/models/phrolova_darkness.glb',
    targetHeight: 2.52,
    description:
      '拉古那阿維紐林銀行的幹練職員兼雙形態守護騎士。銀灰俐落髮色、黑金彎角、熾烈琥珀金瞳與懸浮衍射大盾「焰光裁決」及光噪稜晶。',
    specs: {
      heightCm: 176,
      weightKg: 53,
      bustCm: 90,
      waistCm: 59,
      hipCm: 90,
      role: '銀行守護者 / 衍射光噪重盾',
      resonanceFreq: '204.15 MHz (焰光裁決)',
    },
    defaultPose: 'combat',
    defaultExpression: 'neutral',
    lightingPreset: 'sunset',
  },
  {
    id: 'changli',
    name: '長離 · 熾烈離火',
    title: '今州令尹參事 (Changli)',
    element: '熱熔 (Fusion)',
    elementColor: 'text-amber-400 bg-amber-950/80 border-amber-700/80',
    modelPath: '/models/changli_vita.glb',
    description: '心計深遠的謀略家，以火羽棋局縱觀全局。高精細動漫雙馬尾、俐落戰鬥制服與全身靈動骨骼關節。',
    specs: {
      heightCm: 170,
      weightKg: 50,
      bustCm: 88,
      waistCm: 59,
      hipCm: 89,
      role: '今州軍師 / 熱熔核心輸出',
      resonanceFreq: '178.42 MHz (離火焚羽)',
    },
    defaultPose: 'combat',
    defaultExpression: 'neutral',
    lightingPreset: 'sunset',
  },
  {
    id: 'jinhsi',
    name: '今汐 · 歲主共鳴',
    title: '今州令尹 (Jinhsi)',
    element: '衍射 (Spectro)',
    elementColor: 'text-sky-300 bg-sky-950/80 border-sky-700/80',
    modelPath: '/models/jinhsi_sample.glb',
    description: '承載歲主「角」之光芒的今州令尹，全套 57 組面部表情 Blendshapes、長髮次級物理骨骼與清冷仙氣儀態。',
    specs: {
      heightCm: 166,
      weightKg: 46,
      bustCm: 84,
      waistCm: 57,
      hipCm: 86,
      role: '今州令尹 / 衍射爆發主C',
      resonanceFreq: '156.90 MHz (龍吟星輝)',
    },
    defaultPose: 'prayer',
    defaultExpression: 'neutral',
    lightingPreset: 'celestial',
  },
  {
    id: 'camellya',
    name: '椿 · 緋紅綻放',
    title: '黑海岸執花 (Camellya)',
    element: '湮滅 (Havoc)',
    elementColor: 'text-fuchsia-300 bg-fuchsia-950/80 border-fuchsia-700/80',
    modelPath: '/models/camellya_vivi.glb',
    description: '黑海岸神秘執花，如紅椿般危險而迷人。細緻立體長裙褶皺、高光眼眸材質與流暢動態骨骼關節。',
    specs: {
      heightCm: 165,
      weightKg: 46,
      bustCm: 85,
      waistCm: 56,
      hipCm: 87,
      role: '黑海岸執花 / 湮滅蔓生輸出',
      resonanceFreq: '192.18 MHz (紅椿蔓舞)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'smile',
    lightingPreset: 'cyber',
  },
  {
    id: 'xiangli',
    name: '相里要 · 星矩解構',
    title: '瑝瓏首席研究員 (Xiangli Yao)',
    element: '導電 (Electro)',
    elementColor: 'text-violet-300 bg-violet-950/80 border-violet-700/80',
    modelPath: '/models/xiangli_male.glb',
    description: '今州華胥研究院首席研究員（男性高面數體型）。俐落短髮、機械義肢感服飾剪裁、完整男性骨架比例與電光眸色。',
    specs: {
      heightCm: 178,
      weightKg: 66,
      bustCm: 94,
      waistCm: 72,
      hipCm: 92,
      role: '華胥首席 / 導電爆發主C',
      resonanceFreq: '214.60 MHz (萬方星矩)',
    },
    defaultPose: 'combat',
    defaultExpression: 'neutral',
    lightingPreset: 'cyber',
  },
  {
    id: 'phrolova',
    name: '弗洛洛 · 彼岸幽華',
    title: '殘星會指揮家 (Phrolova)',
    element: '湮滅 (Havoc)',
    elementColor: 'text-rose-300 bg-rose-950/80 border-rose-700/80',
    modelPath: '/models/phrolova_darkness.glb',
    description: '暗夜哥德歌劇風格共鳴者，漆黑多層長裙、深紅暗紋披肩、高冷立體五官輪廓與細緻裙擺骨骼。',
    specs: {
      heightCm: 167,
      weightKg: 47,
      bustCm: 85,
      waistCm: 57,
      hipCm: 87,
      role: '殘星會 / 湮滅音律操控',
      resonanceFreq: '188.35 MHz (彼岸殘響)',
    },
    defaultPose: 'graceful',
    defaultExpression: 'shy',
    lightingPreset: 'cyber',
  },
  {
    id: 'sanhua',
    name: '散華 · 霜雪斷念',
    title: '今州令尹近衛 (Sanhua)',
    element: '冷凝 (Glacio)',
    elementColor: 'text-sky-200 bg-sky-950/80 border-sky-700/80',
    modelPath: '/models/sanhua_shino.glb',
    description: '今汐身邊沉靜冷豔的貼身護衛，銀白層次長髮、修身戰鬥制服、高冷眉眼與銳利防禦備戰架勢。',
    specs: {
      heightCm: 169,
      weightKg: 49,
      bustCm: 86,
      waistCm: 58,
      hipCm: 88,
      role: '令尹近衛 / 冷凝速切副C',
      resonanceFreq: '131.72 MHz (霜刃冰心)',
    },
    defaultPose: 'combat',
    defaultExpression: 'neutral',
    lightingPreset: 'celestial',
  },
  {
    id: 'alicia',
    name: '愛麗絲 · 探索先驅',
    title: '經典動漫旅人 (Alicia)',
    element: '氣動 (Aero)',
    elementColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-700/80',
    modelPath: '/models/anime_sample.glb',
    description: '日系 3D 動漫探索先驅，具有 60 組全套面部 Blendshapes 表情與自然飄逸短髮。',
    specs: {
      heightCm: 162,
      weightKg: 45,
      bustCm: 82,
      waistCm: 56,
      hipCm: 84,
      role: '先鋒探索者 / 風系共鳴',
      resonanceFreq: '124.16 MHz (疾風先鋒)',
    },
    defaultPose: 'greet',
    defaultExpression: 'smile',
    lightingPreset: 'gallery',
  },
];

export const ResonatorStudio: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // GLTF/VRM 3D Character Model Ref & Async Request Tracking
  const customModelRef = useRef<CharacterModelData | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pmxFolderInputRef = useRef<HTMLInputElement | null>(null);
  const [mmdController, setMmdController] = useState<MmdControllerApi | null>(null);
  const [savedMmdModels, setSavedMmdModels] = useState<SavedMmdSummary[]>([]);
  const [activeSavedMmdId, setActiveSavedMmdId] = useState<string | null>(null);
  const [isSavingMmd, setIsSavingMmd] = useState(false);
  const [showMmdVaultMenu, setShowMmdVaultMenu] = useState(false);
  const loadSeqRef = useRef(0);
  const isMountedRef = useRef(false);

  // Studio Lighting, Halo & Post-processing Refs
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const blueHaloLightRef = useRef<THREE.PointLight | null>(null);
  const glassLightRef = useRef<THREE.PointLight | null>(null);
  const haloMeshRef = useRef<THREE.Mesh | null>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const waterPoolMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const runeRingMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const coneMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const trimRingMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const particleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const isLightAutoOrbitingRef = useRef(false);
  const [isLightAutoOrbiting, setIsLightAutoOrbiting] = useState(false);

  // Character Roster & Gallery State
  const [selectedCharId, setSelectedCharId] = useState<string>('fleurdelys');
  const activeTargetHeightRef = useRef<number>(2.58);
  const [customModel, setCustomModel] = useState<CharacterModelData | null>(null);
  const [currentModelName, setCurrentModelName] = useState<string>('芙露德莉斯 · 聖女劍冠');
  const [isLoadingGlb, setIsLoadingGlb] = useState(false);
  const [glbError, setGlbError] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showRosterDrawer, setShowRosterDrawer] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<string>('all');

  // Humanoid Pose & Expression State
  const [activePose, setActivePose] = useState<PosePreset>('graceful');
  const [activeMotionPreset, setActiveMotionPreset] = useState<MotionPreset>('idle');
  const [activeExpression, setActiveExpression] = useState<'neutral' | 'smile' | 'wink' | 'surprised' | 'shy'>('neutral');

  // Animation, Eye Gaze & Skeleton State
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [eyeTracking, setEyeTracking] = useState(true);
  const eyeTrackingRef = useRef(true);
  const [activeClipIdx, setActiveClipIdx] = useState<number>(-1);
  const [isAnimPlaying, setIsAnimPlaying] = useState(true);
  const isAnimPlayingRef = useRef(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const animSpeedRef = useRef(1.0);
  const [morphTargetValues, setMorphTargetValues] = useState<{ [key: string]: number }>({});

  // Studio General State
  const [autoRotate, setAutoRotate] = useState(false);
  const autoRotateRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDataManifest, setShowDataManifest] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'poses' | 'lighting'>('poses');
  const [currentCameraView, setCurrentCameraView] = useState<'full' | 'face' | 'chest' | 'hands' | 'legs'>('full');

  // Lighting & Materials Customization parameters
  const [customization, setCustomization] = useState<BodyCustomization>({
    bustScale: 1.0,
    waistTaper: 1.0,
    legLengthScale: 1.0,
    hairVolume: 1.0,
    ribbonWaveSpeed: 1.0,
    viewMode: 'pbr',
    expression: 'serene',
    haloIntensity: 1.2,
    haloColor: '#2563eb',
    keyLightWarmth: 4300,
    waterBloom: 1.0,
    skinSheen: 0.72,
    breathingIntensity: 1.0,
    skinSssWarmth: 0.85,
    skinMicroBump: 1.0,
    skinTone: 'porcelain',
    fabricBump: 1.0,
    keyLightAngle: 45,
    keyLightElevation: 42,
    exposure: 1.12,
    rimLightPower: 1.25,
    bloomStrength: 0.15,
    atmospherePreset: 'celestial',
  });
  const breathingIntensityRef = useRef(1.0);
  const customizationRef = useRef<BodyCustomization>(customization);
  customizationRef.current = customization;

  // Sync animation & control refs for 60fps loop
  useEffect(() => {
    isAnimPlayingRef.current = isAnimPlaying;
  }, [isAnimPlaying]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    breathingIntensityRef.current = customization.breathingIntensity;
  }, [customization.breathingIntensity]);

  useEffect(() => {
    eyeTrackingRef.current = eyeTracking;
    if (customModelRef.current) {
      customModelRef.current.setEyeTracking(eyeTracking);
    }
  }, [eyeTracking]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '1') handleCameraPreset('full');
      else if (e.key === '2') handleCameraPreset('face');
      else if (e.key === '3') handleCameraPreset('chest');
      else if (e.key === '4') handleCameraPreset('hands');
      else if (e.key === '5') handleCameraPreset('legs');
      else if (e.key.toLowerCase() === 'r') setAutoRotate((v) => !v);
      else if (e.key.toLowerCase() === 'h') setIsCollapsed((v) => !v);
      else if (e.key === 'Escape') {
        setShowRosterDrawer(false);
        setShowMmdVaultMenu(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Load persisted local MMD models from IndexedDB on mount
  useEffect(() => {
    listSavedMmdModels().then(setSavedMmdModels).catch(() => {});
  }, []);

  useEffect(() => {
    animSpeedRef.current = animSpeed;
    if (customModelRef.current) {
      customModelRef.current.setSpeed(animSpeed);
    }
  }, [animSpeed]);

  useEffect(() => {
    isLightAutoOrbitingRef.current = isLightAutoOrbiting;
  }, [isLightAutoOrbiting]);

  // Helper: Convert color temperature Kelvin to RGB
  const kelvinToColor = (kelvin: number): THREE.Color => {
    const temp = kelvin / 100;
    let red = 255;
    let green = 255;
    let blue = 255;

    if (temp <= 66) {
      red = 255;
      green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
      if (temp <= 19) blue = 0;
      else blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    } else {
      red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      blue = 255;
    }
    return new THREE.Color(red / 255, green / 255, blue / 255);
  };

  // Camera transition targets
  const targetCamPos = useRef(new THREE.Vector3(0, 1.45, 3.8));
  const targetCamLook = useRef(new THREE.Vector3(0, 1.15, 0));
  const isTransitioningCam = useRef(false);

  // Load a 3D Character Model (.glb / .vrm)
  const handleLoadModel = async (
    source: File | string,
    displayName: string,
    initialPose: 'default' | 'graceful' | 'prayer' | 'combat' | 'greet' = 'graceful',
    initialExp: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' = 'smile',
    characterId?: string,
    customHeight?: number,
  ) => {
    if (!sceneRef.current || !isMountedRef.current) return;
    const reqId = ++loadSeqRef.current;
    setMmdController(null);
    setActiveSavedMmdId(null);
    setIsLoadingGlb(true);
    setGlbError(null);
    wuwaAudio.playWuwaUiClick(soundEnabled);

    const targetH = customHeight ?? 2.3;
    activeTargetHeightRef.current = targetH;

    try {
      if (customModelRef.current) {
        customModelRef.current.dispose();
        customModelRef.current = null;
      }

      const loaded = await loadCharacter(source, sceneRef.current, targetH, { characterId });

      // Cancel commit if component unmounted or a newer character load was triggered mid-flight
      if (!isMountedRef.current || reqId !== loadSeqRef.current || !sceneRef.current) {
        loaded.dispose();
        return;
      }

      customModelRef.current = loaded;
      setCustomModel(loaded);
      setCurrentModelName(displayName);
      setShowSkeleton(false);
      setActiveClipIdx(loaded.animations.length > 0 ? 0 : -1);
      setIsAnimPlaying(true);

      // Apply initial pose, expression & gaze tracking
      loaded.applyPose(initialPose);
      loaded.setSpeed(animSpeedRef.current);
      loaded.applyExpressionPreset(initialExp);
      loaded.setEyeTracking(eyeTrackingRef.current);
      setActivePose(initialPose);
      setActiveMotionPreset('idle');
      setActiveExpression(initialExp);

      // Extract initial morph target names and values
      const initialMorphs: { [key: string]: number } = {};
      loaded.morphTargetMeshes.forEach(({ dict, mesh }) => {
        Object.keys(dict).forEach((name) => {
          const idx = dict[name];
          initialMorphs[name] = mesh.morphTargetInfluences ? mesh.morphTargetInfluences[idx] || 0 : 0;
        });
      });
      setMorphTargetValues(initialMorphs);

      // Apply current lighting/material/viewMode parameters via live ref
      const latestCfg = customizationRef.current;
      loaded.updateMaterialParams({
        sssWarmth: latestCfg.skinSssWarmth,
        microBump: latestCfg.skinMicroBump,
        skinTone: latestCfg.skinTone,
        fabricBump: latestCfg.fabricBump,
        skinSheen: latestCfg.skinSheen,
        rimPower: latestCfg.rimLightPower,
        rimColor: rimLightRef.current ? rimLightRef.current.color.getHex() : 0x38bdf8,
      });
      if (latestCfg.viewMode !== 'pbr') {
        loaded.setViewMode(latestCfg.viewMode);
      }

      wuwaAudio.playShorekeeperChime(soundEnabled);
    } catch (err: any) {
      if (isMountedRef.current && reqId === loadSeqRef.current) {
        console.error('Failed to load character model:', err);
        setGlbError(err?.message || '模型載入失敗，請確認檔案為有效的 .glb, .vrm 或 .gltf 格式');
      }
    } finally {
      if (isMountedRef.current && reqId === loadSeqRef.current) {
        setIsLoadingGlb(false);
      }
    }
  };

  // Switch to a Roster Character Preset
  const handleSelectPreset = (preset: AnimeCharacterPreset) => {
    setSelectedCharId(preset.id);
    setShowRosterDrawer(false);
    handleApplyAtmospherePreset(preset.lightingPreset);
    handleLoadModel(
      preset.modelPath,
      preset.name,
      preset.defaultPose,
      preset.defaultExpression,
      preset.id,
      preset.targetHeight,
    );
  };

  const handleCyclePreset = (dir: -1 | 1) => {
    const idx = ANIME_CHARACTERS.findIndex((c) => c.id === selectedCharId);
    const nextIdx =
      idx === -1 ? 0 : (idx + dir + ANIME_CHARACTERS.length) % ANIME_CHARACTERS.length;
    handleSelectPreset(ANIME_CHARACTERS[nextIdx]);
  };

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;
    isMountedRef.current = true;

    const initW = Math.max(1, mountEl.clientWidth || window.innerWidth || 1280);
    const initH = Math.max(1, mountEl.clientHeight || window.innerHeight || 720);

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch (err) {
      console.error('WebGLRenderer initialization failed:', err);
      setGlbError('無法初始化 3D WebGL 繪圖環境，請確認瀏覽器已啟用 WebGL 支援');
      return () => {
        isMountedRef.current = false;
      };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(initW, initH);
    mountEl.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const glCtx = renderer.getContext();
    const hasHalfFloatRT = Boolean(
      glCtx &&
        (glCtx.getExtension('EXT_color_buffer_float') ||
          glCtx.getExtension('EXT_color_buffer_half_float')),
    );

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d1a);
    scene.fog = new THREE.FogExp2(0x090d1a, 0.032);
    sceneRef.current = scene;

    // Bounded, FP16-safe Studio Reflection Environment + live pixel readback verification
    // Avoids RoomEnvironment's 900-intensity PointLight FP16 overflow / NaN blackout on PBR & Clay materials.
    let envTexture: THREE.Texture | null = null;
    if (!isSoftwareGl && hasHalfFloatRT) {
      let pmremGenerator: THREE.PMREMGenerator | null = null;
      let envRT: THREE.WebGLRenderTarget | null = null;
      let probeRT: THREE.WebGLRenderTarget | null = null;
      try {
        const studioEnvScene = new THREE.Scene();
        studioEnvScene.background = new THREE.Color(0x1e293b);

        const panelGeos: THREE.BufferGeometry[] = [];
        const panelMats: THREE.Material[] = [];
        const addSoftbox = (
          pos: [number, number, number],
          rot: [number, number, number],
          size: [number, number],
          color: number,
        ) => {
          const g = new THREE.PlaneGeometry(size[0], size[1]);
          const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
          const mesh = new THREE.Mesh(g, m);
          mesh.position.set(pos[0], pos[1], pos[2]);
          mesh.rotation.set(rot[0], rot[1], rot[2]);
          studioEnvScene.add(mesh);
          panelGeos.push(g);
          panelMats.push(m);
        };

        // Sculpted multi-panel studio softbox rig (strictly in [0..1] sRGB, zero FP16 overflow)
        // Gives brushed gold, silver armor, sapphire crystals, eyes, and satin brocade crisp studio specular shapes
        addSoftbox([0, 6.2, 0.5], [Math.PI / 2, 0, 0], [9.5, 5.5], 0xf1f5f9);
        addSoftbox([0, 5.6, -2.5], [Math.PI / 2.2, 0, 0], [11, 2.2], 0xbae6fd);
        addSoftbox([5.2, 3.1, 4.6], [0, -Math.PI * 0.74, 0], [6.5, 6.2], 0xfff3dc);
        addSoftbox([-5.2, 2.6, 3.8], [0, Math.PI * 0.68, 0], [6.5, 5.2], 0xdbeafe);
        addSoftbox([3.6, 2.4, -5.0], [0, -Math.PI * 0.22, 0], [3.2, 6.4], 0xfef3c7);
        addSoftbox([-3.6, 2.6, -5.0], [0, Math.PI * 0.22, 0], [3.6, 6.4], 0x7dd3fc);
        addSoftbox([0, 1.8, 6.2], [0, Math.PI, 0], [5.4, 3.2], 0xfff8f0);
        addSoftbox([0, -5, 0], [-Math.PI / 2, 0, 0], [12, 12], 0x263449);

        pmremGenerator = new THREE.PMREMGenerator(renderer);
        envRT = pmremGenerator.fromScene(studioEnvScene, 0.04);

        // Verify the PMREM texture actually renders finite non-black pixels on this GPU/driver
        probeRT = new THREE.WebGLRenderTarget(4, 4, {
          type: THREE.UnsignedByteType,
          format: THREE.RGBAFormat,
          depthBuffer: false,
          stencilBuffer: false,
        });
        const probeScene = new THREE.Scene();
        const probeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const probeGeo = new THREE.PlaneGeometry(2, 2);
        const probeMat = new THREE.MeshBasicMaterial({ map: envRT.texture });
        probeScene.add(new THREE.Mesh(probeGeo, probeMat));

        renderer.setRenderTarget(probeRT);
        renderer.render(probeScene, probeCam);
        const px = new Uint8Array(4 * 4 * 4);
        renderer.readRenderTargetPixels(probeRT, 0, 0, 4, 4, px);
        renderer.setRenderTarget(null);

        let maxChan = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i] > maxChan) maxChan = px[i];
          if (px[i + 1] > maxChan) maxChan = px[i + 1];
          if (px[i + 2] > maxChan) maxChan = px[i + 2];
        }

        probeGeo.dispose();
        probeMat.dispose();
        probeRT.dispose();
        probeRT = null;
        panelGeos.forEach((g) => g.dispose());
        panelMats.forEach((m) => m.dispose());
        pmremGenerator.dispose();
        pmremGenerator = null;

        if (maxChan >= 12) {
          envTexture = envRT.texture;
          scene.environment = envTexture;
          scene.environmentIntensity = 0.92;
        } else {
          envRT.dispose();
        }
      } catch (e) {
        console.warn('Studio PMREM fallback (using direct studio rig):', e);
        renderer.setRenderTarget(null);
        probeRT?.dispose();
        envRT?.dispose();
        pmremGenerator?.dispose();
      }
    }

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, initW / initH, 0.1, 100);
    camera.position.set(0, 1.58, 4.18);
    cameraRef.current = camera;

    // OrbitControls: Full 360° Left-Click Spherical Rotation + Zoom + Pan
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 1.15;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.85;
    controls.screenSpacePanning = true;
    controls.target.set(0, 1.26, 0);
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI - 0.12;
    controls.minDistance = 0.7;
    controls.maxDistance = 12.0;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    renderer.domElement.style.touchAction = 'none';
    controlsRef.current = controls;

    controls.addEventListener('start', () => {
      isTransitioningCam.current = false;
    });

    // Balanced 360° Studio Lighting Rig (luminous PBR & Clay relief with tight soft shadow precision)
    const keyLight = new THREE.DirectionalLight(0xfff2e2, 2.65);
    const initAzRad = (45 * Math.PI) / 180;
    const initElRad = (42 * Math.PI) / 180;
    const keyLightRadius = 6.2;
    keyLight.position.set(
      Math.sin(initAzRad) * Math.cos(initElRad) * keyLightRadius,
      1.1 + Math.sin(initElRad) * keyLightRadius,
      Math.cos(initAzRad) * Math.cos(initElRad) * keyLightRadius,
    );
    keyLight.target.position.set(0, 1.15, 0);
    scene.add(keyLight.target);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.left = -1.65;
    keyLight.shadow.camera.right = 1.65;
    keyLight.shadow.camera.top = 2.85;
    keyLight.shadow.camera.bottom = -0.35;
    keyLight.shadow.camera.near = 1.5;
    keyLight.shadow.camera.far = 14.0;
    keyLight.shadow.bias = -0.00028;
    keyLight.shadow.normalBias = 0.018;
    keyLight.shadow.radius = 2.4;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // Circular Blue Spotlight Halo Light behind waist
    const blueHalo = new THREE.PointLight(0x2563eb, 2.0, 8.0, 1.8);
    blueHalo.position.set(0, 1.45, -0.65);
    scene.add(blueHalo);
    blueHaloLightRef.current = blueHalo;

    // Circular Spotlight Halo Backdrop Plane (neutral white gradient tinted dynamically by haloMat.color)
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 512;
    haloCanvas.height = 512;
    const haloCtx = haloCanvas.getContext('2d')!;
    const haloGrad = haloCtx.createRadialGradient(256, 256, 12, 256, 256, 250);
    haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    haloGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.42)');
    haloGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.14)');
    haloGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    haloCtx.fillStyle = haloGrad;
    haloCtx.fillRect(0, 0, 512, 512);

    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      color: new THREE.Color(customization.haloColor),
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    haloMatRef.current = haloMat;

    const haloMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), haloMat);
    haloMesh.position.set(0, 1.45, -0.85);
    scene.add(haloMesh);
    haloMeshRef.current = haloMesh;
    const haloDirVec = new THREE.Vector3();

    // Stained glass backlight (controlled alongside halo so Off / Colorless modes never tint skin)
    const glassLight = new THREE.PointLight(0xc026d3, 0.85, 6.0, 1.6);
    glassLight.position.set(0, 1.8, -1.0);
    scene.add(glassLight);
    glassLightRef.current = glassLight;

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x2c394f, 1.38);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.48);
    rimLight.position.set(-3.5, 3.8, -3.5);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Warm-gold opposite edge kicker to separate champagne hair & obsidian satin from the studio backdrop
    const warmKickerLight = new THREE.DirectionalLight(0xfde68a, 0.58);
    warmKickerLight.position.set(3.2, 2.85, -3.4);
    scene.add(warmKickerLight);

    // Soft Opposite Cool-Sky Fill Light (preserves sculpted cheek, collarbone & bust relief without washing shadows)
    const fillLight = new THREE.DirectionalLight(0xe6f1ff, 1.12);
    fillLight.position.set(-4.2, 2.1, 4.0);
    scene.add(fillLight);

    // Rear studio bounce fill so 360° camera rotation behind character remains clearly sculpted
    const backFillLight = new THREE.DirectionalLight(0xd4deec, 0.94);
    backFillLight.position.set(2.4, 2.2, -4.6);
    scene.add(backFillLight);

    // Front-face gallery portrait beauty light for crisp eyes, skin luster & metallic filigree highlights
    const beautyLight = new THREE.PointLight(0xfff7ed, 0.92, 7.5, 1.4);
    beautyLight.position.set(0.35, 1.85, 2.15);
    scene.add(beautyLight);

    // Subtle upward water-plinth caustic bounce light onto heels, calves & lower skirt hems
    const waterBounceLight = new THREE.PointLight(0x38bdf8, 0.44, 4.2, 1.8);
    waterBounceLight.position.set(0, 0.14, 0.52);
    scene.add(waterBounceLight);

    // Subtle Volumetric Stage Spotlight Cone above character plinth
    const spotlightConeGeo = new THREE.CylinderGeometry(0.45, 1.38, 4.4, 32, 1, true);
    const spotlightConeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    coneMatRef.current = spotlightConeMat;
    const spotlightCone = new THREE.Mesh(spotlightConeGeo, spotlightConeMat);
    spotlightCone.position.y = 2.2;
    scene.add(spotlightCone);

    // Floor with glossy reflections
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x06070d,
      roughness: 0.12,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.06;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Luxury Collector Plinth (1/7 典藏水波展台底座)
    const plinthGroup = new THREE.Group();
    plinthGroup.position.y = 0;

    const plinthBaseGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.08, 48);
    const plinthBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.2,
      metalness: 0.85,
    });
    const plinthBase = new THREE.Mesh(plinthBaseGeo, plinthBaseMat);
    plinthBase.position.y = -0.04;
    plinthBase.receiveShadow = !isSoftwareGl;
    plinthGroup.add(plinthBase);

    const trimRingGeo = new THREE.TorusGeometry(1.41, 0.015, 16, 48);
    trimRingGeo.rotateX(Math.PI / 2);
    const trimRingMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
    });
    trimRingMatRef.current = trimRingMat;
    const trimRing = new THREE.Mesh(trimRingGeo, trimRingMat);
    plinthGroup.add(trimRing);

    // Outer Luminous Resonance Halo Ring on floor
    const runeRingGeo = new THREE.RingGeometry(1.52, 1.56, 64);
    runeRingGeo.rotateX(-Math.PI / 2);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    runeRingMatRef.current = runeRingMat;
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.position.y = -0.055;
    plinthGroup.add(runeRing);

    const waterTex = createWaterRippleTexture();
    waterTex.colorSpace = THREE.SRGBColorSpace;
    waterTex.anisotropy = 8;
    const waterPoolGeo = new THREE.CircleGeometry(1.36, 48);
    waterPoolGeo.rotateX(-Math.PI / 2);
    const waterPoolMat = new THREE.MeshStandardMaterial({
      map: waterTex,
      color: 0x38bdf8,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    waterPoolMatRef.current = waterPoolMat;
    const waterPool = new THREE.Mesh(waterPoolGeo, waterPoolMat);
    waterPool.position.y = 0.002;
    waterPool.receiveShadow = !isSoftwareGl;
    plinthGroup.add(waterPool);

    // Soft Grounded Ambient Occlusion Contact Shadow beneath character stance
    const contactShadowTex = createStudioContactShadowTexture();
    const contactShadowGeo = new THREE.PlaneGeometry(1.18, 1.18);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.position.y = 0.005;
    plinthGroup.add(contactShadow);

    scene.add(plinthGroup);

    // Ambient Floating Resonance Particles around Diorama Plinth
    const particleCount = 72;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleMeta = new Float32Array(particleCount * 3); // radius, angle, speedY
    for (let i = 0; i < particleCount; i++) {
      const r = 0.72 + Math.random() * 0.95;
      const a = Math.random() * Math.PI * 2;
      const y = 0.08 + Math.random() * 2.5;
      particlePositions[i * 3] = Math.cos(a) * r;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = Math.sin(a) * r;
      particleMeta[i * 3] = r;
      particleMeta[i * 3 + 1] = a;
      particleMeta[i * 3 + 2] = 0.14 + Math.random() * 0.24;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleTex = createResonanceParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      map: particleTex,
      color: 0x60a5fa,
      size: 0.11,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    particleMatRef.current = particleMat;
    const resonanceParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(resonanceParticles);

    // Direct WebGLRenderer pipeline (native MSAA + ACESFilmicToneMapping + SRGBColorSpace)
    // Eliminates HalfFloat EffectComposer / UnrealBloomPass FBO blackout across all GPUs & drivers.

    // Initial character loading (continuously refined procedural Fleurdelys build)
    handleLoadModel('/models/shorekeeper_victoria.glb', '芙露德莉斯 · 聖女劍冠', 'graceful', 'neutral', 'fleurdelys', 2.58);

    if (!isSoftwareGl) {
      try {
        renderer.compile(scene, camera);
      } catch (e) {
        console.warn('Initial shader pre-compile warning:', e);
      }
    }

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function' || gl.isContextLost()) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (!isMountedRef.current || gl.isContextLost()) {
          try {
            gl.deleteSync(sync);
          } catch {
            // ignore
          }
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const lightViewDirVec = new THREE.Vector3();

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      // Animate custom GLTF model mixer if embedded clips are active
      if (customModelRef.current?.mixer && isAnimPlayingRef.current) {
        customModelRef.current.mixer.update(delta * animSpeedRef.current);
      }

      // Dynamic key light orbit & opposite counter-rim alignment
      if (isLightAutoOrbitingRef.current && keyLightRef.current) {
        const orbitAz = time * 0.55;
        const elDeg = customizationRef.current.keyLightElevation ?? 42;
        const elRad = (elDeg * Math.PI) / 180;
        const radius = 6.2;
        const horiz = Math.cos(elRad) * radius;
        keyLightRef.current.position.set(
          Math.sin(orbitAz) * horiz,
          1.1 + Math.sin(elRad) * radius,
          Math.cos(orbitAz) * horiz,
        );
        if (rimLightRef.current) {
          const rimAz = orbitAz + Math.PI;
          rimLightRef.current.position.set(Math.sin(rimAz) * 4.5, 3.8, Math.cos(rimAz) * 4.5);
        }
      }

      // Update smooth damped posing, procedural choreography, gaze tracking, blinking, hair/skirt breeze & directional SSS key light
      if (customModelRef.current) {
        if (keyLightRef.current) {
          lightViewDirVec
            .copy(keyLightRef.current.position)
            .sub(controls.target)
            .normalize()
            .transformDirection(camera.matrixWorldInverse);
          customModelRef.current.updateKeyLightDir(lightViewDirVec);
        }
        customModelRef.current.update(
          time,
          delta,
          breathingIntensityRef.current,
          isAnimPlayingRef.current,
          camera.position,
        );
      }

      // Gently animate water pool rotation and resonance rune ring shimmer
      waterPool.rotation.y = time * 0.06;
      runeRingMat.opacity = 0.38 + Math.sin(time * 2.0) * 0.14;

      // Gently spiral floating resonance particles above the water plinth
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const r = particleMeta[i * 3];
        const baseA = particleMeta[i * 3 + 1];
        const speedY = particleMeta[i * 3 + 2];
        const a = baseA + time * 0.22;
        const y = ((posAttr.getY(i) + delta * speedY - 0.08) % 2.55) + 0.08;
        posAttr.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
      }
      posAttr.needsUpdate = true;

      // Keep celestial halo & backlight framed cleanly behind the character across full 360° orbit
      if (haloMeshRef.current) {
        haloDirVec.set(
          controls.target.x - camera.position.x,
          0,
          controls.target.z - camera.position.z,
        );
        if (haloDirVec.lengthSq() > 0.0001) {
          haloDirVec.normalize();
          haloMeshRef.current.position.set(haloDirVec.x * 0.9, 1.45, haloDirVec.z * 0.9);
          haloMeshRef.current.lookAt(camera.position.x, 1.45, camera.position.z);
          haloMeshRef.current.rotateZ(time * 0.04);
          if (blueHaloLightRef.current) {
            blueHaloLightRef.current.position.set(haloDirVec.x * 0.8, 1.45, haloDirVec.z * 0.8);
          }
        }
      }

      if (isTransitioningCam.current && cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPos.current, 1 - Math.exp(-6.0 * delta));
        controls.target.lerp(targetCamLook.current, 1 - Math.exp(-6.0 * delta));
        if (cameraRef.current.position.distanceTo(targetCamPos.current) < 0.02) {
          isTransitioningCam.current = false;
        }
      }

      if (autoRotateRef.current && !isTransitioningCam.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.25;
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
      if (!mountEl || !isMountedRef.current) return;
      const width = Math.max(1, mountEl.clientWidth);
      const height = Math.max(1, mountEl.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(mountEl);

    return () => {
      isMountedRef.current = false;
      loadSeqRef.current++;
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);

      if (customModelRef.current) {
        customModelRef.current.dispose();
        customModelRef.current = null;
      }

      envTexture?.dispose();
      spotlightConeGeo.dispose();
      spotlightConeMat.dispose();
      runeRingGeo.dispose();
      runeRingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTex.dispose();
      waterTex.dispose();
      haloTex.dispose();
      haloMesh.geometry.dispose();
      haloMat.dispose();

      plinthBaseGeo.dispose();
      plinthBaseMat.dispose();
      trimRingGeo.dispose();
      trimRingMat.dispose();
      waterPoolGeo.dispose();
      waterPoolMat.dispose();
      contactShadowGeo.dispose();
      contactShadowMat.dispose();
      contactShadowTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      controls.dispose();

      renderer.dispose();
      if (renderer.domElement && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }

      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Update Customization Parameters
  const handleCustomizationChange = <K extends keyof BodyCustomization>(key: K, value: BodyCustomization[K]) => {
    setCustomization((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'keyLightWarmth' && keyLightRef.current) {
        keyLightRef.current.color = kelvinToColor(value as number);
      }
      if (key === 'haloIntensity') {
        const intensity = value as number;
        const isOff = intensity <= 0.01;
        const isNeutral = next.haloColor.toLowerCase() === '#ffffff';
        if (blueHaloLightRef.current) {
          blueHaloLightRef.current.intensity = isOff ? 0 : (isNeutral ? 0.55 : 1.8) * intensity;
        }
        if (glassLightRef.current) {
          glassLightRef.current.intensity = isOff || isNeutral ? 0 : Math.min(1.0, 0.7 * intensity);
        }
        if (haloMatRef.current) {
          haloMatRef.current.opacity = isOff ? 0 : Math.min(0.95, (isNeutral ? 0.36 : 0.48) * intensity);
        }
        if (haloMeshRef.current) {
          haloMeshRef.current.visible = !isOff;
          haloMeshRef.current.scale.setScalar(0.75 + 0.25 * Math.max(0.2, intensity));
        }
      }
      if (key === 'haloColor') {
        const hex = value as string;
        const isNeutral = hex.toLowerCase() === '#ffffff';
        const intensity = next.haloIntensity;
        const isOff = intensity <= 0.01;
        if (haloMatRef.current) {
          haloMatRef.current.color.set(isNeutral ? '#f8fafc' : hex);
          haloMatRef.current.opacity = isOff ? 0 : Math.min(0.95, (isNeutral ? 0.36 : 0.48) * intensity);
        }
        if (blueHaloLightRef.current) {
          blueHaloLightRef.current.color.set(hex);
          blueHaloLightRef.current.intensity = isOff ? 0 : (isNeutral ? 0.55 : 1.8) * intensity;
        }
        if (glassLightRef.current) {
          glassLightRef.current.intensity = isOff || isNeutral ? 0 : Math.min(1.0, 0.7 * intensity);
        }
        if (rimLightRef.current && isNeutral) {
          rimLightRef.current.color.setHex(0xffffff);
        }
        if (customModelRef.current?.updateMaterialParams) {
          customModelRef.current.updateMaterialParams({
            rimColor: isNeutral ? 0xffffff : hex,
          });
        }
        if (particleMatRef.current) particleMatRef.current.color.set(isNeutral ? '#e2e8f0' : hex);
        if (waterPoolMatRef.current) waterPoolMatRef.current.emissive.set(isNeutral ? '#94a3b8' : hex);
        if (runeRingMatRef.current) runeRingMatRef.current.color.set(isNeutral ? '#cbd5e1' : hex);
        if (coneMatRef.current) coneMatRef.current.color.set(isNeutral ? '#e2e8f0' : hex);
        if (trimRingMatRef.current) trimRingMatRef.current.emissive.set(isNeutral ? '#94a3b8' : hex);
      }
      if (key === 'waterBloom' && waterPoolMatRef.current) {
        waterPoolMatRef.current.emissiveIntensity = 0.35 * (value as number);
      }
      if ((key === 'keyLightAngle' || key === 'keyLightElevation') && keyLightRef.current) {
        const azDeg = key === 'keyLightAngle' ? (value as number) : (next.keyLightAngle ?? 45);
        const elDeg = key === 'keyLightElevation' ? (value as number) : (next.keyLightElevation ?? 42);
        const azRad = (azDeg * Math.PI) / 180;
        const elRad = (elDeg * Math.PI) / 180;
        const radius = 6.2;
        const horiz = Math.cos(elRad) * radius;
        keyLightRef.current.position.set(
          Math.sin(azRad) * horiz,
          1.1 + Math.sin(elRad) * radius,
          Math.cos(azRad) * horiz,
        );
        if (rimLightRef.current) {
          const rimAz = azRad + Math.PI;
          rimLightRef.current.position.set(Math.sin(rimAz) * 4.5, 3.8, Math.cos(rimAz) * 4.5);
        }
      }
      if (key === 'exposure' && rendererRef.current) {
        rendererRef.current.toneMappingExposure = value as number;
      }
      if (key === 'rimLightPower' && rimLightRef.current) {
        rimLightRef.current.intensity = value as number;
      }
      if (key === 'bloomStrength') {
        const glow = value as number;
        if (haloMatRef.current && next.haloIntensity > 0.01) {
          const isNeutral = next.haloColor.toLowerCase() === '#ffffff';
          haloMatRef.current.opacity = Math.min(0.96, (isNeutral ? 0.32 : 0.52) + glow * 0.65);
        }
        if (particleMatRef.current) {
          particleMatRef.current.opacity = Math.min(1.0, 0.52 + glow * 1.1);
        }
        if (coneMatRef.current) {
          coneMatRef.current.opacity = Math.min(0.14, 0.025 + glow * 0.14);
        }
      }
      if (key === 'viewMode' && customModelRef.current) {
        customModelRef.current.setViewMode(value as 'pbr' | 'clay' | 'wireframe');
      }

      if (customModelRef.current?.updateMaterialParams) {
        customModelRef.current.updateMaterialParams({
          sssWarmth: next.skinSssWarmth,
          microBump: next.skinMicroBump,
          skinTone: next.skinTone,
          fabricBump: next.fabricBump,
          skinSheen: next.skinSheen,
          rimPower: next.rimLightPower,
        });
      }

      return next;
    });
  };

  // Apply Lighting Atmosphere Presets
  const handleApplyAtmospherePreset = (preset: 'celestial' | 'sunset' | 'cyber' | 'gallery') => {
    let nextKeyTemp = 4300;
    let nextHaloColor = '#2563eb';
    let nextHaloIntensity = 1.2;
    let nextRimColor = 0x38bdf8;
    let nextRimPower = 1.25;
    let nextSssWarmth = 0.85;
    let nextBloomStrength = 0.2;

    if (preset === 'sunset') {
      nextKeyTemp = 2900;
      nextHaloColor = '#f59e0b';
      nextHaloIntensity = 1.3;
      nextRimColor = 0xfbbf24;
      nextRimPower = 1.6;
      nextSssWarmth = 1.25;
      nextBloomStrength = 0.24;
    } else if (preset === 'cyber') {
      nextKeyTemp = 6200;
      nextHaloColor = '#a855f7';
      nextHaloIntensity = 1.45;
      nextRimColor = 0xe879f9;
      nextRimPower = 1.75;
      nextSssWarmth = 0.72;
      nextBloomStrength = 0.28;
    } else if (preset === 'gallery') {
      nextKeyTemp = 5300;
      nextHaloColor = '#38bdf8';
      nextHaloIntensity = 0.9;
      nextRimColor = 0xe2e8f0;
      nextRimPower = 1.05;
      nextSssWarmth = 0.95;
      nextBloomStrength = 0.14;
    }

    setCustomization((prev) => {
      const updated: BodyCustomization = {
        ...prev,
        atmospherePreset: preset,
        keyLightWarmth: nextKeyTemp,
        haloColor: nextHaloColor,
        haloIntensity: nextHaloIntensity,
        rimLightPower: nextRimPower,
        skinSssWarmth: nextSssWarmth,
        bloomStrength: nextBloomStrength,
      };

      if (customModelRef.current?.updateMaterialParams) {
        customModelRef.current.updateMaterialParams({
          sssWarmth: nextSssWarmth,
          rimPower: nextRimPower,
          rimColor: nextRimColor,
          microBump: prev.skinMicroBump,
          skinTone: prev.skinTone,
          fabricBump: prev.fabricBump,
          skinSheen: prev.skinSheen,
        });
      }

      if (keyLightRef.current) keyLightRef.current.color = kelvinToColor(nextKeyTemp);
      if (blueHaloLightRef.current) {
        blueHaloLightRef.current.color.set(nextHaloColor);
        blueHaloLightRef.current.intensity = 1.8 * nextHaloIntensity;
      }
      if (particleMatRef.current) particleMatRef.current.color.set(nextHaloColor);
      if (waterPoolMatRef.current) waterPoolMatRef.current.emissive.set(nextHaloColor);
      if (runeRingMatRef.current) runeRingMatRef.current.color.set(nextHaloColor);
      if (coneMatRef.current) coneMatRef.current.color.set(nextHaloColor);
      if (trimRingMatRef.current) trimRingMatRef.current.emissive.set(nextHaloColor);
      if (haloMatRef.current) {
        haloMatRef.current.color.set(nextHaloColor);
        haloMatRef.current.opacity = Math.min(1.0, 0.55 * nextHaloIntensity);
      }
      if (haloMeshRef.current) {
        haloMeshRef.current.visible = nextHaloIntensity > 0.01;
      }
      if (glassLightRef.current) {
        glassLightRef.current.intensity = preset === 'gallery' ? 0 : 0.85;
      }
      if (rimLightRef.current) {
        rimLightRef.current.color.setHex(nextRimColor);
        rimLightRef.current.intensity = nextRimPower;
      }
      if (particleMatRef.current) {
        particleMatRef.current.opacity = Math.min(1.0, 0.52 + nextBloomStrength * 1.1);
      }
      if (coneMatRef.current) {
        coneMatRef.current.opacity = Math.min(0.14, 0.025 + nextBloomStrength * 0.14);
      }

      return updated;
    });
    wuwaAudio.playWuwaUiClick(soundEnabled);
  };

  // Custom GLB/VRM File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCharId('custom');
      handleLoadModel(file, file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // Shared PMX loader used by both fresh folder uploads and IndexedDB vault reloads
  const loadPmxFromFiles = async (
    files: FileList | File[],
    options?: { autoSave?: boolean; savedId?: string },
  ) => {
    if (!files || files.length === 0 || !sceneRef.current) return;
    const reqId = ++loadSeqRef.current;
    setSelectedCharId('mmd');
    setShowMmdVaultMenu(false);
    setShowRosterDrawer(false);
    setIsLoadingGlb(true);
    setGlbError(null);
    setCurrentModelName('正在解析 MMD (.pmx) 骨骼、表情與貼圖...');

    try {
      const { data: loaded, displayName, mmdController: ctrl } = await loadPmxFolderModel(files, 2.48);
      if (reqId !== loadSeqRef.current) {
        loaded.dispose();
        return;
      }

      if (customModelRef.current) {
        sceneRef.current.remove(customModelRef.current.character);
        customModelRef.current.dispose();
        customModelRef.current = null;
      }

      sceneRef.current.add(loaded.character);
      loaded.setViewMode(customizationRef.current.viewMode);
      customModelRef.current = loaded;
      setCustomModel(loaded);
      setMmdController(ctrl);
      setCurrentModelName(`${displayName} (MMD)`);
      setActiveClipIdx(-1);
      setMorphTargetValues({});
      setShowSkeleton(false);
      setActiveSavedMmdId(options?.savedId ?? null);

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(0, 1.55, 4.35);
        controlsRef.current.target.set(0, 1.25, 0);
        controlsRef.current.update();
      }
      wuwaAudio.playWuwaUiClick(soundEnabled);

      if (options?.autoSave) {
        setIsSavingMmd(true);
        saveMmdFolderToVault(displayName, files)
          .then(async (summary) => {
            if (!isMountedRef.current) return;
            setActiveSavedMmdId(summary.id);
            const updatedList = await listSavedMmdModels();
            if (isMountedRef.current) setSavedMmdModels(updatedList);
          })
          .catch((saveErr) => {
            console.warn('Failed to persist MMD folder to IndexedDB:', saveErr);
          })
          .finally(() => {
            if (isMountedRef.current) setIsSavingMmd(false);
          });
      }
    } catch (err: any) {
      if (reqId !== loadSeqRef.current) return;
      setGlbError(err?.message || 'MMD (.pmx) 模型載入失敗，請確認資料夾包含 .pmx 與 textures');
    } finally {
      if (reqId === loadSeqRef.current) {
        setIsLoadingGlb(false);
      }
    }
  };

  // Custom MMD (.pmx) Folder Upload (auto-persists to local IndexedDB vault)
  const handlePmxFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await loadPmxFromFiles(files, { autoSave: true });
    e.target.value = '';
  };

  const handleLoadSavedMmd = async (id: string) => {
    try {
      setIsLoadingGlb(true);
      setGlbError(null);
      const saved = await loadSavedMmdModelFiles(id);
      if (!saved) {
        setGlbError('找不到已保存的 MMD 模型資料，可能已被清除');
        setIsLoadingGlb(false);
        return;
      }
      await loadPmxFromFiles(saved.files, { autoSave: false, savedId: id });
    } catch (err: any) {
      setGlbError(err?.message || '讀取本機 MMD 模型失敗');
      setIsLoadingGlb(false);
    }
  };

  const handleDeleteSavedMmd = async (id: string) => {
    try {
      await deleteSavedMmdModel(id);
      if (activeSavedMmdId === id) setActiveSavedMmdId(null);
      const updated = await listSavedMmdModels();
      setSavedMmdModels(updated);
    } catch (err) {
      console.warn('Failed to delete saved MMD model:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.vrm') || file.name.endsWith('.gltf'))) {
      setSelectedCharId('custom');
      handleLoadModel(file, file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // Photo Posing, Motion Choreography & Expression Preset Handlers
  const handleApplyPose = (pose: PosePreset) => {
    setActivePose(pose);
    setActiveMotionPreset('idle');
    if (customModelRef.current) {
      customModelRef.current.applyPose(pose);
    }
    wuwaAudio.playWuwaUiClick(soundEnabled);
  };

  const handleSelectMotionPreset = (preset: MotionPreset) => {
    setActiveMotionPreset(preset);
    setIsAnimPlaying(true);
    if (customModelRef.current) {
      customModelRef.current.setMotionPreset(preset);
    }
    wuwaAudio.playWuwaUiClick(soundEnabled);
  };

  const handleApplyExpressionPreset = (preset: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy') => {
    setActiveExpression(preset);
    if (customModelRef.current) {
      customModelRef.current.applyExpressionPreset(preset);
      // Resync morph sliders
      const updated: { [key: string]: number } = {};
      customModelRef.current.morphTargetMeshes.forEach(({ dict, mesh }) => {
        Object.keys(dict).forEach((name) => {
          const idx = dict[name];
          updated[name] = mesh.morphTargetInfluences ? mesh.morphTargetInfluences[idx] || 0 : 0;
        });
      });
      setMorphTargetValues(updated);
    }
    wuwaAudio.playWuwaUiClick(soundEnabled);
  };

  const handleMorphSliderChange = (targetName: string, value: number) => {
    setMorphTargetValues((prev) => ({ ...prev, [targetName]: value }));
    if (customModelRef.current) {
      customModelRef.current.setMorphTargetValue(targetName, value);
    }
  };

  const handleToggleSkeleton = (visible: boolean) => {
    setShowSkeleton(visible);
    if (customModelRef.current) {
      customModelRef.current.toggleSkeleton(visible);
    }
    wuwaAudio.playWuwaUiClick(soundEnabled);
  };

  // Camera Presets (scaled cleanly to active model stature)
  const handleCameraPreset = (view: 'full' | 'face' | 'chest' | 'hands' | 'legs') => {
    setCurrentCameraView(view);
    isTransitioningCam.current = true;
    wuwaAudio.playWuwaUiClick(soundEnabled);

    const hScale = activeTargetHeightRef.current / 2.3;

    switch (view) {
      case 'full':
        targetCamPos.current.set(0, 1.45 * hScale, 3.82 * hScale);
        targetCamLook.current.set(0, 1.15 * hScale, 0);
        break;
      case 'face':
        targetCamPos.current.set(0, 1.88 * hScale, 1.12 * hScale);
        targetCamLook.current.set(0, 1.82 * hScale, 0);
        break;
      case 'chest':
        targetCamPos.current.set(0, 1.52 * hScale, 1.5 * hScale);
        targetCamLook.current.set(0, 1.45 * hScale, 0);
        break;
      case 'hands':
        targetCamPos.current.set(0.42 * hScale, 1.15 * hScale, 1.25 * hScale);
        targetCamLook.current.set(0.2 * hScale, 1.05 * hScale, 0);
        break;
      case 'legs':
        targetCamPos.current.set(0, 0.65 * hScale, 2.2 * hScale);
        targetCamLook.current.set(0, 0.5 * hScale, 0);
        break;
    }
  };

  // Capture High-Res Wallpaper
  const handleCaptureScreenshot = () => {
    if (!rendererRef.current) return;
    wuwaAudio.playWuwaUiClick(soundEnabled);
    try {
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${currentModelName.replace(/\s+/g, '_')}_Photo_${Date.now()}.png`;
      a.click();
    } catch (e) {
      console.error('Screenshot capture failed', e);
    }
  };

  const activeCharPreset = ANIME_CHARACTERS.find((c) => c.id === selectedCharId);

  return (
    <div
      className="relative w-full h-screen bg-[#04050a] text-white select-none overflow-hidden font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Hidden File Input for Custom GLB/VRM */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".glb,.gltf,.vrm"
        className="hidden"
      />

      {/* Hidden Folder Input for Official MMD (.pmx + textures + spa) */}
      <input
        type="file"
        ref={pmxFolderInputRef}
        onChange={handlePmxFolderUpload}
        multiple
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
      />

      {/* Drag & Drop Visual Indicator Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-950/90 border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center pointer-events-none">
          <Upload size={64} className="text-cyan-400 mb-3" />
          <h2 className="text-2xl font-bold text-white mb-1">釋放以匯入 3D 角色模型</h2>
          <p className="text-cyan-300 text-sm">支援所有標準 .glb, .vrm, .gltf 格式</p>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingGlb && (
        <div className="absolute inset-0 z-40 bg-neutral-950/88 flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Sparkles size={24} className="text-cyan-300" />
          </div>
          <span className="text-sm font-bold tracking-wider text-cyan-200">
            載入 3D 角色網格與骨骼...
          </span>
          <span className="text-xs text-neutral-400 mt-1">計算拓樸邊界、套用次表面透光與微觀毛孔紋理</span>
        </div>
      )}

      {/* Error / Context Loss Toast */}
      {(glbError || contextLost) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500/80 text-white px-4 py-2.5 rounded-xl text-xs flex items-center gap-2.5 shadow-2xl">
          <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
          <span>{contextLost ? 'WebGL 繪圖裝置暫時中斷，正在嘗試恢復渲染畫面...' : glbError}</span>
          {glbError && (
            <button
              onClick={() => setGlbError(null)}
              className="ml-2 px-1.5 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-white text-[10px]"
            >
              關閉
            </button>
          )}
        </div>
      )}

      {/* TOP BAR: Brand, Scalable 8-Character Gallery Switcher & Global Actions */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-4 p-3 sm:px-6 pointer-events-auto bg-gradient-to-b from-neutral-950/92 via-neutral-950/55 to-transparent">
        {/* Brand & Active Character Inline Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-wider text-white truncate">
              鳴潮 · 3D 動漫角色典藏展覽室
            </h1>
            <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
              <span className="text-cyan-300 font-semibold truncate">{currentModelName}</span>
              {activeCharPreset && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-neutral-300">{activeCharPreset.element}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="text-amber-400 font-mono tabular-nums text-[10px] whitespace-nowrap">
                {customModel?.stats
                  ? `${customModel.stats.triangles.toLocaleString()} 面 / ${customModel.stats.bones} 骨骼`
                  : '高精度 3D 網格'}
              </span>
            </p>
          </div>
        </div>

        {/* Center Compact Character Navigator + Gallery Trigger (Scales cleanly to 8+ characters) */}
        <div className="hidden md:flex items-center bg-neutral-900/95 p-1 rounded-xl border border-neutral-800 shadow-xl shrink-0">
          <button
            onClick={() => handleCyclePreset(-1)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="上一位角色"
          >
            <ChevronLeft size={15} />
          </button>

          <button
            onClick={() => setShowRosterDrawer((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              showRosterDrawer
                ? 'bg-cyan-600 text-white shadow'
                : 'text-white hover:bg-neutral-800'
            }`}
          >
            <Users size={14} className="text-cyan-300" />
            <span>{activeCharPreset ? activeCharPreset.name.split(' · ')[0] : '自定義角色'}</span>
            <span className="text-[10px] text-neutral-300 font-mono tabular-nums">
              ({ANIME_CHARACTERS.findIndex((c) => c.id === selectedCharId) + 1 || 'C'}/{ANIME_CHARACTERS.length})
            </span>
            <ChevronDown size={13} className={`transition-transform ${showRosterDrawer ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={() => handleCyclePreset(1)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="下一位角色"
          >
            <ChevronRight size={15} />
          </button>

          <div className="w-px h-4 bg-neutral-800 mx-1" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedCharId === 'custom'
                ? 'bg-fuchsia-600 text-white shadow-md'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }`}
            title="匯入自定義 .glb / .vrm 檔案"
          >
            <Upload size={13} className="text-fuchsia-400" />
            <span>匯入 GLB</span>
          </button>

          <button
            onClick={() => pmxFolderInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-200 hover:text-white hover:bg-amber-900/50 border border-amber-500/30 transition-all whitespace-nowrap"
            title="直接選擇本機 MMD 模型資料夾（含 .pmx 與 textures），匯入後自動保存至本機"
          >
            <FolderOpen size={13} className="text-amber-400" />
            <span>匯入 MMD (.pmx)</span>
          </button>

          {savedMmdModels.length > 0 && (
            <div className="relative ml-1">
              <button
                onClick={() => setShowMmdVaultMenu((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                  showMmdVaultMenu
                    ? 'bg-amber-600 border-amber-400 text-white'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-200 hover:text-white hover:bg-amber-900/60'
                }`}
                title="快速載入已保存於瀏覽器本機的 MMD 模型"
              >
                <Database size={12} className="text-amber-300" />
                <span>MMD 模型庫 ({savedMmdModels.length})</span>
                <ChevronDown size={12} className={`transition-transform ${showMmdVaultMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMmdVaultMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-neutral-950/96 border border-amber-500/40 rounded-xl shadow-2xl p-2 z-50 space-y-1.5">
                  <div className="px-2 py-1 text-[11px] font-semibold text-amber-300 border-b border-neutral-800 flex items-center justify-between">
                    <span>已保存的本機 MMD 模型</span>
                    <span className="text-[10px] text-neutral-400">重整免重傳</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {savedMmdModels.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${
                          activeSavedMmdId === item.id
                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-100'
                            : 'bg-neutral-900/90 border-neutral-800 text-neutral-200 hover:border-neutral-600'
                        }`}
                      >
                        <button
                          onClick={() => handleLoadSavedMmd(item.id)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="font-semibold truncate">{item.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {(item.totalBytes / (1024 * 1024)).toFixed(1)} MB · {item.fileCount} 檔案
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteSavedMmd(item.id)}
                          className="p-1.5 rounded-md text-neutral-400 hover:text-rose-300 hover:bg-rose-950/60 shrink-0"
                          title="刪除已保存的模型"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Header Right Utility Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Gallery & Import */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              onClick={() => setShowRosterDrawer((v) => !v)}
              className="px-2.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Users size={13} className="text-cyan-400" />
              <span>圖鑑</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs flex items-center gap-1"
              title="匯入模型"
            >
              <Upload size={14} className="text-fuchsia-400" />
            </button>
          </div>

          {/* Auto Camera Rotation Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-lg whitespace-nowrap ${
              autoRotate
                ? 'bg-cyan-600 border-cyan-400 text-white shadow-cyan-500/20'
                : 'bg-neutral-950/92 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="開啟 360 度視角旋轉展覽 (R)"
          >
            <RotateCw size={14} className={autoRotate ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{autoRotate ? '自轉中' : '360° 自轉'}</span>
          </button>

          {/* Data Sheet Toggle */}
          <button
            onClick={() => setShowDataManifest(!showDataManifest)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-lg whitespace-nowrap ${
              showDataManifest
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-500/20'
                : 'bg-neutral-950/92 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="開啟共鳴者數據檔案"
          >
            <Activity size={15} />
            <span className="hidden lg:inline">檔案</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-xl bg-neutral-950/92 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="切換音效"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Wallpaper Snapshot */}
          <button
            onClick={handleCaptureScreenshot}
            className="w-9 h-9 rounded-xl bg-neutral-950/92 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="拍攝並下載高清無水印寫真"
          >
            <Camera size={16} />
          </button>
        </div>
      </header>

      {/* Expandable 8-Character Gallery Selector Panel */}
      {showRosterDrawer && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-3xl bg-neutral-950/96 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl pointer-events-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-cyan-400" />
              <span className="text-sm font-bold text-white">共鳴者角色圖鑑</span>
              <span className="text-xs text-neutral-400 font-mono">
                · 共 {ANIME_CHARACTERS.length} 位高精度 3D 模型
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'all', label: '全部' },
                { id: '衍射', label: '衍射' },
                { id: '熱熔', label: '熱熔' },
                { id: '湮滅', label: '湮滅' },
                { id: '導電', label: '導電' },
                { id: '冷凝氣動', label: '冷凝 / 氣動' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRosterFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    rosterFilter === tab.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={() => setShowRosterDrawer(false)}
                className="ml-2 px-2 py-1 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {ANIME_CHARACTERS.filter((char) => {
              if (rosterFilter === 'all') return true;
              if (rosterFilter === '冷凝氣動') {
                return char.element.includes('冷凝') || char.element.includes('氣動');
              }
              return char.element.includes(rosterFilter);
            }).map((char) => {
              const isSelected = selectedCharId === char.id;
              const [shortName, subName] = char.name.split(' · ');
              return (
                <button
                  key={char.id}
                  onClick={() => handleSelectPreset(char)}
                  className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-400/50'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">{shortName}</span>
                      <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                        {char.specs.heightCm}cm
                      </span>
                    </div>
                    <div className="text-[11px] text-cyan-300/90 truncate">{subName}</div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/80">
                    <span className="truncate">{char.element.split(' ')[0]}</span>
                    <span className="truncate text-neutral-500">{char.specs.role.split('/')[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Compact Character Roster Strip (< md) */}
      <div className="md:hidden absolute top-16 left-0 right-0 z-20 px-3 flex items-center gap-1.5 overflow-x-auto pointer-events-auto">
        {ANIME_CHARACTERS.map((char) => {
          const isSelected = selectedCharId === char.id;
          return (
            <button
              key={char.id}
              onClick={() => handleSelectPreset(char)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                isSelected
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                  : 'bg-neutral-950/92 border-neutral-800 text-neutral-300'
              }`}
            >
              {char.name.split(' · ')[0]}
            </button>
          );
        })}
      </div>

      {/* Resonator Data & Anatomical Manifest Card (Top Left) */}
      {showDataManifest && activeCharPreset && (
        <div className="fixed top-26 md:top-18 left-4 w-72 sm:w-80 bg-neutral-950/95 border border-indigo-500/50 rounded-2xl p-3.5 shadow-2xl z-30 pointer-events-auto">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-neutral-800">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <Activity size={14} />
              共鳴者生理與數據檔案 (Resonator Manifest)
            </span>
            <button
              onClick={() => setShowDataManifest(false)}
              className="text-neutral-400 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80">
              <div>
                <span className="text-[10px] text-neutral-400 block">身高 (Height)</span>
                <span className="font-mono font-bold text-white">{activeCharPreset.specs.heightCm} cm</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">體重 (Weight)</span>
                <span className="font-mono font-bold text-white">{activeCharPreset.specs.weightKg} kg</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">三圍 (B-W-H)</span>
                <span className="font-mono font-bold text-pink-300 text-[11px]">
                  B{activeCharPreset.specs.bustCm} / W{activeCharPreset.specs.waistCm} / H{activeCharPreset.specs.hipCm}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">定位</span>
                <span className="font-mono font-bold text-cyan-400 text-[11px] truncate block">
                  {activeCharPreset.specs.role.split('/')[0]}
                </span>
              </div>
            </div>

            <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/80 space-y-1">
              <div className="flex justify-between">
                <span className="text-[10px] text-neutral-400">稱號 (Title):</span>
                <span className="font-mono text-white text-[11px] font-semibold">{activeCharPreset.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-neutral-400">共鳴頻段 (Frequency):</span>
                <span className="font-mono text-cyan-300 text-[11px]">{activeCharPreset.specs.resonanceFreq}</span>
              </div>
              <p className="text-[10px] text-neutral-400 pt-1 leading-relaxed border-t border-neutral-800">
                {activeCharPreset.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MMD (.pmx) CONTROL PANEL & QUICK CAMERA BAR */}
      {mmdController && (
        <>
          <div className="fixed bottom-4 left-4 z-30 flex items-center gap-1.5 bg-neutral-950/90 border border-amber-500/35 rounded-xl p-1.5 shadow-xl pointer-events-auto backdrop-blur-md">
            <span className="text-[11px] font-semibold text-amber-300 px-1.5">視角</span>
            {[
              { id: 'full', label: '全景' },
              { id: 'face', label: '臉部特寫' },
              { id: 'chest', label: '上半身' },
              { id: 'legs', label: '全身腿部' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => handleCameraPreset(v.id as any)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-amber-500/20 transition-colors"
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="fixed top-20 right-4 bottom-4 w-80 sm:w-[340px] z-30 pointer-events-auto">
            <MmdControlPanel
              modelName={currentModelName}
              controller={mmdController}
              boneCount={customModel?.stats.bones ?? 0}
              viewMode={customization.viewMode}
              showSkeleton={showSkeleton}
              savedMmdModels={savedMmdModels}
              activeSavedMmdId={activeSavedMmdId}
              isSavingMmd={isSavingMmd}
              onChangeViewMode={(mode) => handleCustomizationChange('viewMode', mode)}
              onToggleSkeleton={() => {
                const next = !showSkeleton;
                setShowSkeleton(next);
                customModelRef.current?.toggleSkeleton(next);
              }}
              onImportAnotherPmx={() => pmxFolderInputRef.current?.click()}
              onLoadSavedMmd={handleLoadSavedMmd}
              onDeleteSavedMmd={handleDeleteSavedMmd}
              onReturnToBuiltIn={() => {
                const first = ANIME_CHARACTERS[0];
                if (first) {
                  setSelectedCharId(first.id);
                  handleLoadModel(
                    first.modelPath,
                    first.name,
                    first.defaultPose,
                    first.defaultExpression,
                    first.id,
                    first.targetHeight,
                  );
                }
              }}
            />
          </div>
        </>
      )}

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Built-in GLB/VRM Studio Only) */}
      {!mmdController && (
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-20 w-[96vw] max-w-4xl transition-all duration-300 ease-out pointer-events-auto ${
          isCollapsed ? 'bottom-0 translate-y-[calc(100%-38px)]' : 'bottom-3'
        }`}
      >
        {/* Collapse / Expand Toggle Handle */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 bg-neutral-950/95 border-t border-x border-neutral-700/80 px-4 py-1.5 rounded-t-xl text-xs font-semibold text-neutral-300 hover:text-white shadow-xl transition-colors"
          >
            {isCollapsed ? <ChevronUp size={14} className="text-cyan-400" /> : <ChevronDown size={14} className="text-cyan-400" />}
            <span>{isCollapsed ? '展開控制台 (Show Controls)' : '收合面板 (Cinema Mode)'}</span>
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl p-3.5 shadow-2xl">
          {/* Header Row: Camera View Presets & Sub-Tab Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800">
            {/* Camera Focus Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-neutral-400 mr-1 flex items-center gap-1">
                <Eye size={13} className="text-amber-400" />
                特寫視角:
              </span>
              {[
                { id: 'full', label: '全景 (Full)' },
                { id: 'face', label: '臉部 (Face)' },
                { id: 'chest', label: '身姿 (Torso)' },
                { id: 'hands', label: '手部 (Hands)' },
                { id: 'legs', label: '美腿 (Legs)' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleCameraPreset(view.id as any)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentCameraView === view.id
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>

            {/* Render Mode & Sub-Tab Switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
                {[
                  { id: 'pbr', label: 'PBR' },
                  { id: 'clay', label: '素模' },
                  { id: 'wireframe', label: '線框' },
                ].map((vm) => (
                  <button
                    key={vm.id}
                    onClick={() => handleCustomizationChange('viewMode', vm.id as 'pbr' | 'clay' | 'wireframe')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      customization.viewMode === vm.id
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {vm.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-neutral-900 p-0.5 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setActiveTab('poses')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'poses' ? 'bg-cyan-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  模型拓樸與寫真姿態 (Poses & Rig)
                </button>

                <button
                  onClick={() => setActiveTab('lighting')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'lighting' ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  光影氛圍與肌膚紋理 (Lighting & SSS)
                </button>
              </div>
            </div>
          </div>

          {/* TAB 1: Real 3D Model Topology, Photo Poses, Animations & Facial Blendshapes */}
          {activeTab === 'poses' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Card A: Mesh Topology & Spec HUD */}
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                  <span className="text-xs font-bold text-fuchsia-400 flex items-center gap-1.5">
                    <Cpu size={14} />
                    網格拓樸數據 (Topology)
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    PBR 完整網格
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">頂點數 (Vertices)</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {customModel?.stats.vertices ? customModel.stats.vertices.toLocaleString() : '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">多邊形面數 (Triangles)</span>
                    <span className="font-mono font-bold text-cyan-300 tabular-nums">
                      {customModel?.stats.triangles ? customModel.stats.triangles.toLocaleString() : '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">骨骼關節 (Bones)</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {customModel?.stats.bones || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">材質數量 (Materials)</span>
                    <span className="font-mono font-bold text-pink-300 tabular-nums">
                      {customModel?.stats.materials || 0}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-neutral-400 border-t border-neutral-800/80 pt-1.5 flex justify-between gap-2">
                  <span className="truncate">左鍵 360° 旋轉 · 滾輪縮放 · 1-5 視角</span>
                  <span className="tabular-nums shrink-0">高: {customModel?.dimensions.y ? customModel.dimensions.y.toFixed(2) : '2.30'}m</span>
                </div>
              </div>

              {/* Card B: Humanoid Photo Poses, Eye Tracking & Rigging */}
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800 gap-1">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 truncate">
                    <Bone size={14} />
                    寫真姿態
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEyeTracking(!eyeTracking)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all ${
                        eyeTracking
                          ? 'bg-emerald-600 text-white'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                      title="角色眼神與頭部微幅跟隨鏡頭"
                    >
                      {eyeTracking ? '注視: 開' : '注視: 關'}
                    </button>
                    {customModel && customModel.stats.bones > 0 && (
                      <button
                        onClick={() => handleToggleSkeleton(!showSkeleton)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-all ${
                          showSkeleton
                            ? 'bg-cyan-500 text-black shadow-sm'
                            : 'bg-neutral-800 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {showSkeleton ? '骨架: 開' : '骨架: 關'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    { id: 'default', label: '原生站姿' },
                    { id: 'graceful', label: '優雅守岸' },
                    { id: 'prayer', label: '合十祈願' },
                    { id: 'combat', label: '警戒備戰' },
                    { id: 'greet', label: '溫柔致候' },
                  ].map((pose) => (
                    <button
                      key={pose.id}
                      onClick={() => handleApplyPose(pose.id as any)}
                      className={`px-2 py-1.5 rounded-lg text-left text-xs font-medium transition-all ${
                        activePose === pose.id
                          ? 'bg-cyan-600 text-white font-bold shadow-md'
                          : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {pose.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card C: Procedural Choreography & Embedded Animation Clips */}
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Play size={14} />
                    動態動作 (Motions)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {customModel && customModel.animations.length > 0
                      ? `6 組演繹 + ${customModel.animations.length} 內建`
                      : '6 組全身動態'}
                  </span>
                </div>

                {/* Procedural Choreography Presets */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {[
                    { id: 'idle', label: '自然呼吸' },
                    { id: 'showcase', label: '舞台展演' },
                    { id: 'channel', label: '共鳴詠唱' },
                    { id: 'combat', label: '備戰律動' },
                    { id: 'greet', label: '親切揮手' },
                    { id: 'catwalk', label: '優雅步態' },
                  ].map((motion) => (
                    <button
                      key={motion.id}
                      onClick={() => handleSelectMotionPreset(motion.id as MotionPreset)}
                      className={`px-2 py-1 rounded-lg text-left text-[11px] font-medium transition-all ${
                        activeMotionPreset === motion.id
                          ? 'bg-amber-600 text-white font-bold shadow'
                          : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {motion.label}
                    </button>
                  ))}
                </div>

                {/* Embedded GLTF Clips (if model has any) */}
                {customModel && customModel.animations.length > 0 && (
                  <div className="max-h-14 overflow-y-auto space-y-1 pt-1 border-t border-neutral-800/80">
                    {customModel.animations.map((clip, idx) => (
                      <button
                        key={clip.name + idx}
                        onClick={() => {
                          setActiveClipIdx(idx);
                          customModel.playClip(idx);
                          setIsAnimPlaying(true);
                        }}
                        className={`w-full text-left px-2 py-0.5 rounded text-[10px] truncate transition-all ${
                          activeClipIdx === idx
                            ? 'bg-amber-500/80 text-black font-bold'
                            : 'bg-neutral-950 text-neutral-300 hover:text-white'
                        }`}
                      >
                        {clip.name || `內建動作 #${idx + 1}`} ({clip.duration.toFixed(1)}s)
                      </button>
                    ))}
                  </div>
                )}

                {/* Always-active Playback & Speed Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 gap-1.5">
                  <button
                    onClick={() => setIsAnimPlaying(!isAnimPlaying)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-all ${
                      isAnimPlaying ? 'bg-amber-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {isAnimPlaying ? <Pause size={11} /> : <Play size={11} />}
                    <span>{isAnimPlaying ? '暫停' : '播放'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {[0.5, 1.0, 1.5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setAnimSpeed(speed)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                          animSpeed === speed
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card D: Facial Blendshapes & Expression Presets */}
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 space-y-1.5 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                  <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                    <Smile size={14} />
                    面部表情 (Expressions)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {Object.keys(morphTargetValues).length} 組
                  </span>
                </div>

                {/* Quick Expression Preset Buttons */}
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[
                    { id: 'neutral', label: '自然' },
                    { id: 'smile', label: '微笑' },
                    { id: 'wink', label: '眨眼' },
                    { id: 'surprised', label: '驚訝' },
                    { id: 'shy', label: '羞澀' },
                  ].map((exp) => (
                    <button
                      key={exp.id}
                      onClick={() => handleApplyExpressionPreset(exp.id as any)}
                      className={`px-1.5 py-1 rounded text-[10px] font-medium transition-all ${
                        activeExpression === exp.id
                          ? 'bg-pink-600 text-white font-bold'
                          : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>

                {/* Detailed Morph Sliders */}
                {Object.keys(morphTargetValues).length > 0 && (
                  <div className="space-y-1 pt-1.5 border-t border-neutral-800/80">
                    {Object.keys(morphTargetValues).slice(0, 4).map((targetName) => (
                      <div key={targetName}>
                        <div className="flex justify-between text-[10px] text-neutral-300 mb-0.5">
                          <span className="truncate max-w-[120px]">{targetName}</span>
                          <span className="font-mono text-pink-400">
                            {(morphTargetValues[targetName] || 0).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={morphTargetValues[targetName] || 0}
                          onChange={(e) => handleMorphSliderChange(targetName, parseFloat(e.target.value))}
                          className="w-full accent-pink-500 h-1 bg-neutral-800 rounded cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Dynamic Studio Lighting, Skin SSS, Micro-Textures & 360 Orbit */}
          {activeTab === 'lighting' && (
            <div className="space-y-2.5">
              {/* Studio Atmosphere Presets Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <Sparkle size={14} className="text-amber-400" />
                  大師光影氛圍 (Atmosphere Presets):
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'celestial', label: '時序天體', desc: '4200K + 深邃藍暈', color: 'from-blue-600 to-indigo-600' },
                    { id: 'sunset', label: '夕陽金曦', desc: '2800K + 暖金珊瑚SSS', color: 'from-amber-600 to-rose-600' },
                    { id: 'cyber', label: '夜影霓虹', desc: '6500K + 幽紫邊緣光', color: 'from-purple-600 to-pink-600' },
                    { id: 'gallery', label: '典藏白晝', desc: '5500K + 攝影棚柔光', color: 'from-neutral-600 to-cyan-600' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyAtmospherePreset(preset.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm ${
                        customization.atmospherePreset === preset.id
                          ? 'bg-gradient-to-r ' + preset.color + ' text-white font-bold ring-1 ring-white/30'
                          : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] opacity-75 hidden sm:inline">({preset.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4-Column Lighting & Texture Control Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Card 1: Key Light 360° Orbit & Temperature */}
                <div className="bg-neutral-900/70 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <RotateCw size={13} />
                      主光源軌道與色溫 (Key Light)
                    </span>
                    <button
                      onClick={() => setIsLightAutoOrbiting(!isLightAutoOrbiting)}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all ${
                        isLightAutoOrbiting
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {isLightAutoOrbiting ? '自動旋轉: 開' : '自動旋轉: 關'}
                    </button>
                  </div>

                  {/* Azimuth Angle Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">光源方位角 (Orbit Angle):</span>
                      <span className="text-[11px] text-amber-300 font-mono">
                        {customization.keyLightAngle || 45}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={customization.keyLightAngle || 45}
                      onChange={(e) => {
                        setIsLightAutoOrbiting(false);
                        handleCustomizationChange('keyLightAngle', parseInt(e.target.value));
                      }}
                      className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>0° 正前</span>
                      <span>90° 右側</span>
                      <span>180° 背光</span>
                      <span>270° 左側</span>
                    </div>
                  </div>

                  {/* Kelvin Color Temperature */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">光源色溫 (Temp):</span>
                      <span className="text-[11px] text-amber-300 font-mono tabular-nums">
                        {customization.keyLightWarmth} K
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2400"
                      max="6500"
                      step="100"
                      value={customization.keyLightWarmth}
                      onChange={(e) => handleCustomizationChange('keyLightWarmth', parseInt(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Elevation & Exposure compact pair */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-neutral-300">光源仰角</span>
                        <span className="text-[10px] text-amber-300 font-mono tabular-nums">
                          {customization.keyLightElevation ?? 42}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="80"
                        step="2"
                        value={customization.keyLightElevation ?? 42}
                        onChange={(e) => handleCustomizationChange('keyLightElevation', parseInt(e.target.value))}
                        className="w-full accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-neutral-300">舞台曝光</span>
                        <span className="text-[10px] text-amber-300 font-mono tabular-nums">
                          {(customization.exposure ?? 1.12).toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.65"
                        max="1.55"
                        step="0.05"
                        value={customization.exposure ?? 1.12}
                        onChange={(e) => handleCustomizationChange('exposure', parseFloat(e.target.value))}
                        className="w-full accent-amber-400 h-1 bg-neutral-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Skin Subsurface Scattering (SSS), Tone & Dermal Micro-Pores */}
                <div className="bg-neutral-900/70 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800 gap-1">
                    <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5 truncate">
                      <Heart size={13} />
                      肌膚調色與紋理
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {[
                        { id: 'porcelain', label: '白瓷' },
                        { id: 'peach', label: '蜜桃' },
                        { id: 'warm', label: '暖玉' },
                      ].map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => handleCustomizationChange('skinTone', tone.id as 'porcelain' | 'peach' | 'warm')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (customization.skinTone ?? 'peach') === tone.id
                              ? 'bg-pink-600 text-white font-bold shadow-sm'
                              : 'bg-neutral-800 text-neutral-300 hover:text-white'
                          }`}
                        >
                          {tone.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SSS Coral Warmth */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">SSS 珊瑚溫潤透光:</span>
                      <span className="text-[11px] text-pink-300 font-mono tabular-nums">
                        {((customization.skinSssWarmth || 0.85) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.8"
                      step="0.05"
                      value={customization.skinSssWarmth || 0.85}
                      onChange={(e) => handleCustomizationChange('skinSssWarmth', parseFloat(e.target.value))}
                      className="w-full accent-pink-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>清淡素雅</span>
                      <span>鮮活肌理透光</span>
                    </div>
                  </div>

                  {/* Dermal Micro-Pore Normal Relief */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">真皮微觀毛孔凹凸 (Pores):</span>
                      <span className="text-[11px] text-pink-300 font-mono tabular-nums">
                        {((customization.skinMicroBump || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.05"
                      value={customization.skinMicroBump || 1.0}
                      onChange={(e) => handleCustomizationChange('skinMicroBump', parseFloat(e.target.value))}
                      className="w-full accent-pink-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>光滑白瓷</span>
                      <span>真實肌理漫射</span>
                    </div>
                  </div>

                  {/* Skin Sheen & Clearcoat */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">角質清漆光澤 (Sheen):</span>
                      <span className="text-[11px] text-pink-300 font-mono tabular-nums">
                        {(customization.skinSheen * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.2"
                      step="0.05"
                      value={customization.skinSheen}
                      onChange={(e) => handleCustomizationChange('skinSheen', parseFloat(e.target.value))}
                      className="w-full accent-pink-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Card 3: Fabric Textures & Anime Rim Light */}
                <div className="bg-neutral-900/70 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Layers size={13} />
                      絲綢織物與邊緣光 (Fabrics & Rim)
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      動漫輪廓光
                    </span>
                  </div>

                  {/* Fabric Weave Normal Map Bump */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">高級絲綢微觀織紋:</span>
                      <span className="text-[11px] text-cyan-300 font-mono">
                        {((customization.fabricBump || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.05"
                      value={customization.fabricBump || 1.0}
                      onChange={(e) => handleCustomizationChange('fabricBump', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>平滑緞面</span>
                      <span>重工織錦刺繡</span>
                    </div>
                  </div>

                  {/* Anime Rim Light Power */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">邊緣輪廓光 (Rim Power):</span>
                      <span className="text-[11px] text-cyan-300 font-mono">
                        {(customization.rimLightPower || 1.25).toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="2.6"
                      step="0.1"
                      value={customization.rimLightPower || 1.25}
                      onChange={(e) => handleCustomizationChange('rimLightPower', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>柔和側光</span>
                      <span>精緻高光輪廓</span>
                    </div>
                  </div>

                  {/* Breathing Motion */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">生命呼吸起伏 (Breathing):</span>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        {customization.breathingIntensity.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={customization.breathingIntensity}
                      onChange={(e) => handleCustomizationChange('breathingIntensity', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Card 4: Celestial Halo & Stage Glow */}
                <div className="bg-neutral-900/70 p-3 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles size={13} />
                      天體光暈與舞台 (Halo & Stage)
                    </span>
                    {/* Quick Expression Sync */}
                    <div className="flex items-center gap-1">
                      {[
                        { id: 'neutral', label: '恬靜' },
                        { id: 'smile', label: '微笑' },
                        { id: 'wink', label: '眨眼' },
                        { id: 'shy', label: '柔和' },
                      ].map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => handleApplyExpressionPreset(exp.id as any)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                            activeExpression === exp.id
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Celestial Spotlight Halo */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">背後天體光暈 (Halo):</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            handleCustomizationChange('haloIntensity', customization.haloIntensity <= 0.01 ? 1.2 : 0)
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border ${
                            customization.haloIntensity <= 0.01
                              ? 'bg-rose-600/80 text-white border-rose-400/70 font-bold'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                          }`}
                          title="關閉背後光暈與色光，完全不影響膚色"
                        >
                          {customization.haloIntensity <= 0.01 ? '已關閉' : '關閉'}
                        </button>
                        <button
                          onClick={() => {
                            if (customization.haloIntensity <= 0.01) {
                              handleCustomizationChange('haloIntensity', 1.0);
                            }
                            handleCustomizationChange('haloColor', '#ffffff');
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all border ${
                            customization.haloIntensity > 0.01 && customization.haloColor.toLowerCase() === '#ffffff'
                              ? 'bg-neutral-100 text-neutral-950 border-white font-bold'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                          }`}
                          title="純白無色中性光暈，避免偏色影響膚色"
                        >
                          無色
                        </button>
                        <span className="text-[11px] text-indigo-300 font-mono w-8 text-right">
                          {customization.haloIntensity <= 0.01 ? 'OFF' : `${customization.haloIntensity.toFixed(1)}x`}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2.5"
                      step="0.1"
                      value={customization.haloIntensity}
                      onChange={(e) => handleCustomizationChange('haloIntensity', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {[
                        { color: '#ffffff', label: '無色中性 (不偏膚色)' },
                        { color: '#2563eb', label: '時序青藍' },
                        { color: '#a855f7', label: '深空幽紫' },
                        { color: '#06b6d4', label: '翡翠碧青' },
                        { color: '#f59e0b', label: '暮光金曦' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          onClick={() => {
                            if (customization.haloIntensity <= 0.01) {
                              handleCustomizationChange('haloIntensity', 1.0);
                            }
                            handleCustomizationChange('haloColor', c.color);
                          }}
                          className={`w-4 h-4 rounded-full border transition-transform ${
                            customization.haloIntensity > 0.01 &&
                            customization.haloColor.toLowerCase() === c.color.toLowerCase()
                              ? 'scale-125 border-white ring-1 ring-white/60'
                              : 'border-neutral-600'
                          }`}
                          style={{ backgroundColor: c.color }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Water Caustics & Post Bloom */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-neutral-300">命座水波與輝光 (Bloom):</span>
                      <span className="text-[11px] text-cyan-300 font-mono">
                        {((customization.bloomStrength ?? 0.15) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={customization.bloomStrength ?? 0.15}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleCustomizationChange('bloomStrength', val);
                        handleCustomizationChange('waterBloom', 0.6 + val * 1.6);
                      }}
                      className="w-full accent-cyan-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5">
                      <span>寫實清透</span>
                      <span>星芒輝光泛映</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
