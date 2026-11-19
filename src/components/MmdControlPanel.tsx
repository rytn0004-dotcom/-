import React, { useMemo, useRef, useState } from 'react';
import {
  Bone,
  Eye,
  FolderOpen,
  RotateCcw,
  Smile,
  Sparkles,
  User,
  ArrowLeft,
  Music,
  Square,
  Upload,
  Database,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import type { MmdControllerApi, MmdDanceId, MmdLimbKey } from '../loaders/pmxLoader';
import type { PosePreset } from '../loaders/characterLoader';
import type { SavedMmdSummary } from '../utils/mmdStorage';

interface MmdControlPanelProps {
  modelName: string;
  controller: MmdControllerApi;
  boneCount: number;
  viewMode: 'pbr' | 'clay' | 'wireframe';
  showSkeleton: boolean;
  savedMmdModels: SavedMmdSummary[];
  activeSavedMmdId: string | null;
  isSavingMmd: boolean;
  onChangeViewMode: (mode: 'pbr' | 'clay' | 'wireframe') => void;
  onToggleSkeleton: () => void;
  onImportAnotherPmx: () => void;
  onLoadSavedMmd: (id: string) => void;
  onDeleteSavedMmd: (id: string) => void;
  onReturnToBuiltIn: () => void;
}

const TRENDING_DANCES: Array<{
  id: Exclude<MmdDanceId, 'none' | 'vmd'>;
  title: string;
  subtitle: string;
  tag: string;
}> = [
  {
    id: 'apt',
    title: 'APT. 洗腦節拍舞',
    subtitle: '雙手節奏交替 + 輕快律動搖擺',
    tag: '熱門',
  },
  {
    id: 'ojousama',
    title: '晚安大小姐搖',
    subtitle: '優雅鞠躬手勢 + 魔性同步肩搖',
    tag: '洗腦',
  },
  {
    id: 'groove',
    title: '科目三絲滑搖',
    subtitle: '招牌手花翻轉 + 滑步節奏扭胯',
    tag: '經典',
  },
  {
    id: 'idol',
    title: '偶像應援手勢舞',
    subtitle: '活力揮手打 Call + 俏皮眨眼表情',
    tag: '元氣',
  },
  {
    id: 'waltz',
    title: '極樂蝴蝶舞',
    subtitle: '華麗展臂波浪 + 優雅旋轉律動',
    tag: '華麗',
  },
];

function formatBytesMb(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MmdControlPanel: React.FC<MmdControlPanelProps> = ({
  modelName,
  controller,
  boneCount,
  viewMode,
  showSkeleton,
  savedMmdModels,
  activeSavedMmdId,
  isSavingMmd,
  onChangeViewMode,
  onToggleSkeleton,
  onImportAnotherPmx,
  onLoadSavedMmd,
  onDeleteSavedMmd,
  onReturnToBuiltIn,
}) => {
  const [activeTab, setActiveTab] = useState<'dance' | 'pose' | 'limbs' | 'face'>('dance');
  const [activePose, setActivePose] = useState<PosePreset | 'reset'>('default');
  const [activeExp, setActiveExp] = useState<'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' | 'blink'>('neutral');
  const [autoBlink, setAutoBlink] = useState(true);
  const [selectedLimb, setSelectedLimb] = useState<MmdLimbKey>(
    controller.availableLimbs[0]?.key || 'head',
  );
  const [morphCategory, setMorphCategory] = useState<'all' | 'eye' | 'lip' | 'brow' | 'other'>('all');
  const [vmdError, setVmdError] = useState<string | null>(null);
  const [vmdDuration, setVmdDuration] = useState<number | null>(null);
  const [isLoadingVmd, setIsLoadingVmd] = useState(false);
  const [showVaultList, setShowVaultList] = useState(false);
  const vmdInputRef = useRef<HTMLInputElement | null>(null);

  // Version counter to trigger React re-render after mutating controller state
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const filteredMorphs = useMemo(() => {
    if (morphCategory === 'all') return controller.morphs;
    return controller.morphs.filter((m) => m.panel === morphCategory);
  }, [controller.morphs, morphCategory]);

  const currentLimbRot = controller.getLimbRotationDeg(selectedLimb);
  const activeDance = controller.getDance();
  const danceSpeed = controller.getDanceSpeed();
  const loadedVmdName = controller.getLoadedVmdName();

  const handleSelectDance = (dance: MmdDanceId) => {
    controller.setDance(dance);
    bump();
  };

  const handleDanceSpeed = (speed: number) => {
    controller.setDanceSpeed(speed);
    bump();
  };

  const handleVmdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVmdError(null);
    setIsLoadingVmd(true);
    try {
      const res = await controller.loadVmdMotion(file);
      setVmdDuration(res.durationSec);
      bump();
    } catch (err: any) {
      setVmdError(err?.message || 'VMD 動作檔解析失敗，請確認檔案格式正確');
    } finally {
      setIsLoadingVmd(false);
      e.target.value = '';
    }
  };

  const handlePose = (pose: PosePreset | 'reset') => {
    setActivePose(pose);
    controller.setDance('none');
    controller.applyMmdPose(pose);
    bump();
  };

  const handleExpression = (exp: 'neutral' | 'smile' | 'wink' | 'surprised' | 'shy' | 'blink') => {
    setActiveExp(exp);
    controller.applyMmdExpression(exp);
    bump();
  };

  const handleLimbSlider = (axis: 'x' | 'y' | 'z', deg: number) => {
    if (controller.getDance() !== 'none') {
      controller.setDance('none');
    }
    controller.setLimbRotationDeg(selectedLimb, axis, deg);
    bump();
  };

  const handleMorphSlider = (index: number, val: number) => {
    controller.setMorphWeight(index, val);
    bump();
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950/92 border border-amber-500/35 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Hidden VMD File Input */}
      <input
        ref={vmdInputRef}
        type="file"
        accept=".vmd"
        onChange={handleVmdUpload}
        className="hidden"
      />

      {/* Dedicated MMD Mode Header */}
      <div className="px-4 py-3 border-b border-amber-500/25 bg-gradient-to-r from-amber-950/60 via-neutral-950 to-neutral-950">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
              MMD 專屬控制台
            </span>
          </div>
          <button
            onClick={onReturnToBuiltIn}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[11px] text-neutral-300 hover:text-white transition-colors"
            title="離開 MMD 模式並返回內建鳴潮角色"
          >
            <ArrowLeft size={11} />
            <span>返回內建</span>
          </button>
        </div>

        <div className="text-sm font-semibold text-white truncate" title={modelName}>
          {modelName}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px] text-neutral-400">
          <span>
            骨骼 {boneCount} · 表情 {controller.morphs.length}
          </span>
          <button
            onClick={onImportAnotherPmx}
            className="flex items-center gap-1 text-amber-300 hover:text-amber-200 transition-colors"
          >
            <FolderOpen size={11} />
            <span>匯入新 MMD</span>
          </button>
        </div>
      </div>

      {/* 4 Dedicated MMD Control Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-neutral-900/90 border-b border-neutral-800">
        {[
          { id: 'dance', label: '熱門舞蹈', icon: Music },
          { id: 'pose', label: '姿勢', icon: User },
          { id: 'limbs', label: '四肢', icon: Bone },
          { id: 'face', label: '表情', icon: Smile },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'dance' | 'pose' | 'limbs' | 'face')}
              className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                active
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80 border border-transparent'
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
        {activeTab === 'dance' && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">內建熱門舞蹈編排</span>
                {activeDance !== 'none' && (
                  <button
                    onClick={() => handleSelectDance('none')}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/40 text-[11px] text-rose-200 hover:bg-rose-500/30 transition-colors"
                  >
                    <Square size={10} fill="currentColor" />
                    <span>停止舞蹈</span>
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {TRENDING_DANCES.map((d) => {
                  const isPlaying = activeDance === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDance(isPlaying ? 'none' : d.id)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        isPlaying
                          ? 'bg-gradient-to-r from-amber-500/25 to-fuchsia-500/20 border-amber-400/70 text-white shadow-md'
                          : 'bg-neutral-900/90 border-neutral-800 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{d.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                              isPlaying
                                ? 'bg-amber-400 text-neutral-950'
                                : 'bg-neutral-800 text-amber-300'
                            }`}
                          >
                            {isPlaying ? '熱舞中' : d.tag}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                          {d.subtitle}
                        </div>
                      </div>
                      <Music
                        size={14}
                        className={isPlaying ? 'text-amber-300 animate-pulse shrink-0' : 'text-neutral-500 shrink-0'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dance Tempo Slider */}
            <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-300 font-medium">舞蹈節奏速度</span>
                <span className="font-mono text-amber-300">{danceSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.0}
                step={0.05}
                value={danceSpeed}
                onChange={(e) => handleDanceSpeed(Number(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-neutral-500">
                <span>慢動作 0.4x</span>
                <button
                  onClick={() => handleDanceSpeed(1.0)}
                  className="text-neutral-400 hover:text-amber-300"
                >
                  標準 1.0x
                </button>
                <span>倍速 2.0x</span>
              </div>
            </div>

            {/* Native VMD Dance Motion File Import */}
            <div className="p-3 rounded-xl bg-neutral-900/90 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300">匯入官方 .vmd 舞蹈動作</span>
                {loadedVmdName && (
                  <span className="text-[10px] text-emerald-300 font-mono">
                    {vmdDuration ? `${vmdDuration.toFixed(1)}s` : '已載入'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                支援標準 MikuMikuDance <span className="text-neutral-200 font-mono">.vmd</span> 動作檔，自動驅動角色全身骨骼與臉部表情。
              </p>

              <button
                onClick={() => vmdInputRef.current?.click()}
                disabled={isLoadingVmd}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-semibold text-cyan-200 transition-colors disabled:opacity-50"
              >
                <Upload size={13} />
                <span>{isLoadingVmd ? '正在解析 .vmd...' : '選擇本機 .vmd 舞蹈動作檔'}</span>
              </button>

              {loadedVmdName && (
                <button
                  onClick={() => handleSelectDance(activeDance === 'vmd' ? 'none' : 'vmd')}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-medium border flex items-center justify-between transition-colors ${
                    activeDance === 'vmd'
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <span className="truncate pr-2" title={loadedVmdName}>
                    VMD：{loadedVmdName}
                  </span>
                  <span className="shrink-0">{activeDance === 'vmd' ? '播放中' : '點擊播放'}</span>
                </button>
              )}

              {vmdError && (
                <div className="text-[11px] text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2.5 py-1.5">
                  {vmdError}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'pose' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300">預設角色姿勢</span>
                <button
                  onClick={() => handlePose('reset')}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200"
                >
                  <RotateCcw size={11} />
                  <span>重置 T-Pose</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'default', label: '自然站姿 (A-Pose)' },
                  { id: 'graceful', label: '優雅立姿' },
                  { id: 'combat', label: '戰鬥備戰' },
                  { id: 'prayer', label: '祈願雙手' },
                  { id: 'greet', label: '揮手致意' },
                  { id: 'reset', label: '原始 T-Pose' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePose(p.id as PosePreset | 'reset')}
                    className={`px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                      activePose === p.id && activeDance === 'none'
                        ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                        : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/80">
              <div className="text-xs font-semibold text-neutral-300 mb-2">模型渲染檢視</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'pbr', label: 'PBR 材質' },
                  { id: 'clay', label: '素模' },
                  { id: 'wireframe', label: '線框' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onChangeViewMode(m.id as 'pbr' | 'clay' | 'wireframe')}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      viewMode === m.id
                        ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/80 space-y-2">
              <button
                onClick={onToggleSkeleton}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  showSkeleton
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Bone size={13} />
                  顯示 MMD 骨骼線條
                </span>
                <span>{showSkeleton ? '開啟' : '關閉'}</span>
              </button>

              <button
                onClick={() => {
                  const next = !autoBlink;
                  setAutoBlink(next);
                  controller.setAutoBlink(next);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  autoBlink
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye size={13} />
                  自動眨眼動態
                </span>
                <span>{autoBlink ? '開啟' : '關閉'}</span>
              </button>
            </div>
          </>
        )}

        {activeTab === 'limbs' && (
          <>
            {controller.availableLimbs.length === 0 ? (
              <div className="text-xs text-neutral-400 bg-neutral-900/80 border border-neutral-800 rounded-xl p-3">
                此 PMX 模型未偵測到標準四肢骨骼名稱，請確認模型包含標準 MMD 骨骼。
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">選擇控制部位</span>
                  <button
                    onClick={() => {
                      controller.setDance('none');
                      controller.resetAllLimbs();
                      bump();
                    }}
                    className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200"
                  >
                    <RotateCcw size={11} />
                    <span>重置全部四肢</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {controller.availableLimbs.map((limb) => (
                    <button
                      key={limb.key}
                      onClick={() => setSelectedLimb(limb.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border text-left transition-all truncate ${
                        selectedLimb === limb.key
                          ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white'
                      }`}
                    >
                      {limb.label}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-200">
                      {controller.availableLimbs.find((l) => l.key === selectedLimb)?.label || selectedLimb}
                    </span>
                    <button
                      onClick={() => {
                        controller.setLimbRotationDeg(selectedLimb, 'x', 0);
                        controller.setLimbRotationDeg(selectedLimb, 'y', 0);
                        controller.setLimbRotationDeg(selectedLimb, 'z', 0);
                        bump();
                      }}
                      className="text-[11px] text-neutral-400 hover:text-white"
                    >
                      歸零此關節
                    </button>
                  </div>

                  {[
                    { axis: 'x' as const, label: 'X 軸（前後擺動 / 俯仰）', val: currentLimbRot.x },
                    { axis: 'y' as const, label: 'Y 軸（左右旋轉 / 扭轉）', val: currentLimbRot.y },
                    { axis: 'z' as const, label: 'Z 軸（張開收合 / 側傾）', val: currentLimbRot.z },
                  ].map((item) => (
                    <div key={item.axis} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">{item.label}</span>
                        <span className="font-mono text-amber-300">{Math.round(item.val)}°</span>
                      </div>
                      <input
                        type="range"
                        min={-135}
                        max={135}
                        step={1}
                        value={Math.round(item.val)}
                        onChange={(e) => handleLimbSlider(item.axis, Number(e.target.value))}
                        className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'face' && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-300">快速表情預設</span>
                <button
                  onClick={() => {
                    setActiveExp('neutral');
                    controller.resetAllMorphs();
                    bump();
                  }}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200"
                >
                  <RotateCcw size={11} />
                  <span>重置表情</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'neutral', label: '自然' },
                  { id: 'smile', label: '微笑' },
                  { id: 'wink', label: '眨眼' },
                  { id: 'surprised', label: '驚喜' },
                  { id: 'shy', label: '害羞' },
                  { id: 'blink', label: '閉眼' },
                ].map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => handleExpression(ex.id as any)}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      activeExp === ex.id
                        ? 'bg-amber-500/25 border-amber-400/60 text-amber-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/80">
              <div className="flex items-center gap-1 mb-2.5 flex-wrap">
                {[
                  { id: 'all', label: '全部' },
                  { id: 'eye', label: '眼部' },
                  { id: 'lip', label: '嘴型' },
                  { id: 'brow', label: '眉毛' },
                  { id: 'other', label: '其他' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMorphCategory(cat.id as any)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      morphCategory === cat.id
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {filteredMorphs.length === 0 ? (
                <div className="text-xs text-neutral-500 text-center py-4">
                  此分類無表情變形目標
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredMorphs.map((m) => {
                    const val = controller.getMorphWeight(m.index);
                    return (
                      <div key={m.index} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-200 truncate pr-2" title={m.name}>
                            {m.name}
                          </span>
                          <span className="font-mono text-amber-300 shrink-0">
                            {Math.round(val * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={val}
                          onChange={(e) => handleMorphSlider(m.index, Number(e.target.value))}
                          className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Persistent Local IndexedDB MMD Model Vault Footer */}
      <div className="border-t border-neutral-800 bg-neutral-950/95">
        <button
          onClick={() => setShowVaultList((v) => !v)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-neutral-900/80 transition-colors"
        >
          <span className="flex items-center gap-1.5 font-semibold text-amber-200">
            <Database size={13} className="text-amber-400" />
            <span>本機已保存 MMD 模型庫 ({savedMmdModels.length})</span>
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
            {isSavingMmd ? (
              <span className="text-amber-300">保存中...</span>
            ) : activeSavedMmdId ? (
              <span className="flex items-center gap-0.5">
                <CheckCircle2 size={11} />
                已保存
              </span>
            ) : null}
            {showVaultList ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronUp size={13} className="text-neutral-400" />}
          </span>
        </button>

        {showVaultList && (
          <div className="px-3 pb-3 max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
            {savedMmdModels.length === 0 ? (
              <div className="text-[11px] text-neutral-500 text-center py-2">
                匯入 MMD 資料夾後將自動保存於瀏覽器本機，重新整理免重選。
              </div>
            ) : (
              savedMmdModels.map((item) => {
                const isCurrent = item.id === activeSavedMmdId;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                        : 'bg-neutral-900/90 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <button
                      onClick={() => onLoadSavedMmd(item.id)}
                      className="flex-1 text-left min-w-0 hover:text-white transition-colors"
                      title={`載入 ${item.name}`}
                    >
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {formatBytesMb(item.totalBytes)} · {item.fileCount} 個檔案
                      </div>
                    </button>
                    <button
                      onClick={() => onDeleteSavedMmd(item.id)}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-rose-300 hover:bg-rose-950/60 transition-colors shrink-0"
                      title="從本機模型庫移除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
