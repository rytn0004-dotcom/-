import React, { useState } from 'react';
import {
  ResonatorAction,
  ResonatorId,
  StudioLightingPreset,
  WuwaStudioSettings,
} from '../types/wuwa';
import { wuwaAudio } from '../audio/wuwaAudio';
import {
  Sparkles,
  Camera,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Image as ImageIcon,
  Zap,
  Waves,
  Sun,
  Flame,
  Eye,
} from 'lucide-react';

interface WuwaDockProps {
  settings: WuwaStudioSettings;
  onChange: <K extends keyof WuwaStudioSettings>(key: K, value: WuwaStudioSettings[K]) => void;
  onTriggerLiberation: () => void;
  onCaptureScreenshot: () => void;
}

export const WuwaDock: React.FC<WuwaDockProps> = ({
  settings,
  onChange,
  onTriggerLiberation,
  onCaptureScreenshot,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'resonator' | 'diorama' | 'lighting'>('resonator');

  const handleResonatorChange = (id: ResonatorId) => {
    if (id === 'shorekeeper') {
      wuwaAudio.playShorekeeperChime(settings.soundEnabled);
    } else if (id === 'jinhsi') {
      wuwaAudio.playJinhsiSlash(settings.soundEnabled);
    } else {
      wuwaAudio.playChangliFlame(settings.soundEnabled);
    }
    onChange('resonator', id);
  };

  const handleActionChange = (action: ResonatorAction) => {
    if (action === 'resonance_liberation') {
      wuwaAudio.playResonanceLiberation(settings.soundEnabled);
      onTriggerLiberation();
    } else if (action === 'resonance_skill') {
      wuwaAudio.playJinhsiSlash(settings.soundEnabled);
      onChange('action', action);
    } else {
      wuwaAudio.playWuwaUiClick(settings.soundEnabled);
      onChange('action', action);
    }
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="fixed top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl px-4 py-2.5 pointer-events-auto shadow-2xl">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-cyan-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
            鳴
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-sm text-white font-['Outfit']">
                鳴潮 WUTHERING WAVES
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                Resonator Studio
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              1/7 Collector Scale Figurine • Shorekeeper / Jinhsi / Changli
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Reference Photo Comparison Toggle */}
          <button
            onClick={() => {
              wuwaAudio.playWuwaUiClick(settings.soundEnabled);
              onChange('showReferencePhoto', !settings.showReferencePhoto);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all shadow-lg ${
              settings.showReferencePhoto
                ? 'bg-amber-600 border-amber-400 text-white'
                : 'bg-neutral-950/90 border-neutral-800 text-neutral-300 hover:text-white'
            }`}
            title="Compare with uploaded collector garage kit photo"
          >
            <ImageIcon size={15} />
            <span className="hidden sm:inline">Reference Photo</span>
          </button>

          {/* Resonance Liberation Ultimate Button */}
          <button
            onClick={() => handleActionChange('resonance_liberation')}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-amber-600 hover:brightness-110 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-lg transition-all"
            title="Trigger 共鳴解放 Resonance Liberation Ultimate Cutscene"
          >
            <Zap size={15} className="text-amber-300 animate-bounce" />
            <span>共鳴解放 (Q)</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => onChange('soundEnabled', !settings.soundEnabled)}
            className="w-9 h-9 rounded-xl bg-neutral-950/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title={settings.soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Photo Mode */}
          <button
            onClick={onCaptureScreenshot}
            className="w-9 h-9 rounded-xl bg-neutral-950/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title="Take High-Resolution Wallpaper Photo"
          >
            <Camera size={16} />
          </button>
        </div>
      </header>

      {/* Reference Photo Comparison Card (Top Right, Collapsible) */}
      {settings.showReferencePhoto && (
        <div className="fixed top-18 right-4 w-72 bg-neutral-950/95 border border-amber-500/50 rounded-2xl p-3 shadow-2xl z-30 pointer-events-auto">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <ImageIcon size={13} />
              Original Reference Figurine
            </span>
            <button
              onClick={() => onChange('showReferencePhoto', false)}
              className="text-neutral-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black aspect-[2/3] max-h-80 flex items-center justify-center">
            <img
              src="/public/assets/aistudio/800x_c574e835.webp"
              alt="Reference Anime Scale Figure"
              className="w-full h-full object-contain"
            />
          </div>
          <p className="text-[10px] text-neutral-400 mt-2 text-center">
            Target Aesthetic: 1/7 Scale Anime Garage Kit with Gothic Stained Glass, Translucent Ribbons & Water Ripple.
          </p>
        </div>
      )}

      {/* Unified Bottom Control Dock */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[94vw] max-w-[880px] z-30 transition-transform duration-300 ease-out ${
          isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Button */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-950 border-t border-x border-neutral-700/80 rounded-t-xl text-neutral-300 hover:text-white text-xs font-medium shadow-md transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={14} className="text-amber-400" />
                <span>Show Resonator Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} className="text-amber-400" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Dock Container */}
        <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl p-4 shadow-2xl">
          {/* Top Bar: Tabs & Camera Quick Focus */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800/80">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => setActiveTab('resonator')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'resonator'
                    ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles size={14} />
                <span>Resonator (共鳴者)</span>
              </button>

              <button
                onClick={() => setActiveTab('diorama')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'diorama'
                    ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Waves size={14} />
                <span>Gothic Base & Water</span>
              </button>

              <button
                onClick={() => setActiveTab('lighting')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'lighting'
                    ? 'bg-neutral-800 text-amber-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sun size={14} />
                <span>Studio Lighting</span>
              </button>
            </div>

            {/* Camera View Presets */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-neutral-400 hidden sm:inline mr-1">Focus:</span>
              {[
                { id: 'full_statue', label: 'Full' },
                { id: 'face_tiara', label: 'Face' },
                { id: 'celestial_ribbons', label: 'Ribbons' },
                { id: 'water_pool', label: 'Base' },
              ].map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => onChange('cameraPreset', cam.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    settings.cameraPreset === cam.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {cam.label}
                </button>
              ))}

              <button
                onClick={() => onChange('autoRotate', !settings.autoRotate)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ml-1 ${
                  settings.autoRotate
                    ? 'bg-cyan-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
                title="Turntable 360° Auto-Rotate"
              >
                <RotateCw size={12} />
                <span>Turntable</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Resonator & Actions */}
          {activeTab === 'resonator' && (
            <div className="space-y-3">
              {/* Resonator Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-28 flex-shrink-0">Resonator (共鳴者):</span>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  {[
                    {
                      id: 'shorekeeper',
                      name: '守岸人 (Shorekeeper)',
                      tag: 'Reference Figurine • Starry Ribbons',
                      color: 'border-cyan-500',
                    },
                    {
                      id: 'jinhsi',
                      name: '今汐 (Jinhsi)',
                      tag: '歲主 • Ages of Harvest Loong',
                      color: 'border-amber-500',
                    },
                    {
                      id: 'changli',
                      name: '長離 (Changli)',
                      tag: '離火 • Blazing Phoenix Silk',
                      color: 'border-rose-500',
                    },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleResonatorChange(res.id as ResonatorId)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        settings.resonator === res.id
                          ? `bg-neutral-900 ${res.color} text-white shadow-lg`
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-bold text-xs leading-tight">{res.name}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{res.tag}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action / Pose Modes */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-28 flex-shrink-0">Pose & Stance:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow">
                  {[
                    { id: 'standby', name: 'Standby Display', desc: 'Graceful Pose (Photo)' },
                    { id: 'resonance_skill', name: 'Resonance Skill', desc: 'Battle Ready Stance' },
                    { id: 'resonance_liberation', name: '共鳴解放 (Burst)', desc: 'Ultimate Cutscene' },
                    { id: 'flutter_inspection', name: 'Inspect Details', desc: 'Slow Turntable Glance' },
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleActionChange(act.id as ResonatorAction)}
                      className={`text-left px-3 py-1.5 rounded-xl border transition-all ${
                        settings.action === act.id
                          ? 'bg-neutral-900 border-amber-500 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{act.name}</div>
                      <div className="text-[10px] text-neutral-400">{act.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Ribbon Sway Slider */}
              <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
                <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5 w-48 flex-shrink-0">
                  <Flame size={14} className="text-amber-400" />
                  Celestial Ribbon Wave:
                </span>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={settings.ribbonWaveSpeed}
                  onChange={(e) => onChange('ribbonWaveSpeed', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs text-amber-400 font-mono w-14 text-right">
                  {settings.ribbonWaveSpeed.toFixed(1)}x
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Diorama Base & Water */}
          {activeTab === 'diorama' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Stained Glass Glow */}
                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={14} className="text-purple-400" />
                      Gothic Stained-Glass Backlight:
                    </span>
                    <span className="text-xs text-purple-400 font-mono">
                      {settings.stainedGlassGlow.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={settings.stainedGlassGlow}
                    onChange={(e) => onChange('stainedGlassGlow', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Dim Candlelight</span>
                    <span>Radiant Cathedral</span>
                  </div>
                </div>

                {/* Water Ripple Glow */}
                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Waves size={14} className="text-cyan-400" />
                      Liquid Water Ripple Caustics:
                    </span>
                    <span className="text-xs text-cyan-400 font-mono">
                      {settings.waterGlowIntensity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.waterGlowIntensity}
                    onChange={(e) => onChange('waterGlowIntensity', parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Gentle Pool</span>
                    <span>Luminous Spring</span>
                  </div>
                </div>
              </div>

              {/* Tacet Mark (聲痕) & Ribbon Energy Toggles */}
              <div className="flex items-center gap-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                <span className="text-xs text-neutral-400 w-36">Resonator Tacet Mark:</span>
                <button
                  onClick={() => onChange('tacetMarkGlow', !settings.tacetMarkGlow)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    settings.tacetMarkGlow
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.tacetMarkGlow ? '聲痕 Active (Glowing Frequency)' : '聲痕 Dormant'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Studio Lighting Rig */}
          {activeTab === 'lighting' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-28 flex-shrink-0">Exhibition Rig:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow">
                  {[
                    {
                      id: 'reference_darkbox',
                      name: 'Reference Darkroom',
                      desc: 'Blue Halo (Exact Photo)',
                    },
                    {
                      id: 'moonlight_sanctum',
                      name: 'Moonlight Sanctum',
                      desc: 'Silver & Cyan Twilight',
                    },
                    {
                      id: 'stellar_aurora',
                      name: 'Stellar Aurora',
                      desc: 'Black Shores Galaxy',
                    },
                    {
                      id: 'golden_hour',
                      name: 'Mount Firmament',
                      desc: 'Warm Sunset Glow',
                    },
                  ].map((light) => (
                    <button
                      key={light.id}
                      onClick={() => onChange('lighting', light.id as StudioLightingPreset)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        settings.lighting === light.id
                          ? 'bg-neutral-900 border-amber-500 text-white shadow-lg'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{light.name}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{light.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
