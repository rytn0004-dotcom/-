import React, { useState } from 'react';
import {
  AnimeCharacterId,
  AnimeDiorama,
  AnimeExpression,
  AnimePose,
  AnimeSceneSettings,
  AnimeShaderStyle,
  AnimeWeapon,
  CameraPreset,
} from '../types/anime';
import { animeAudio } from '../audio/animeAudio';
import {
  Sparkles,
  Camera,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Wind,
  Layers,
  Sword,
  Smile,
  Palette,
  SunMedium,
} from 'lucide-react';

interface ControlDockProps {
  settings: AnimeSceneSettings;
  onChange: <K extends keyof AnimeSceneSettings>(key: K, value: AnimeSceneSettings[K]) => void;
  onCaptureScreenshot: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  settings,
  onChange,
  onCaptureScreenshot,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'character' | 'style' | 'world'>('character');

  const handleTabChange = (tab: 'character' | 'style' | 'world') => {
    animeAudio.playUiClick(settings.soundEnabled);
    setActiveTab(tab);
  };

  const handleCharSelect = (id: AnimeCharacterId) => {
    animeAudio.playUiClick(settings.soundEnabled);
    onChange('character', id);
  };

  const handlePoseSelect = (p: AnimePose) => {
    if (p === 'katana_ready' || p === 'combat_slash') {
      animeAudio.playKatanaSlash(settings.soundEnabled);
    } else if (p === 'magic_cast') {
      animeAudio.playSakuraChime(settings.soundEnabled);
    } else {
      animeAudio.playUiClick(settings.soundEnabled);
    }
    onChange('pose', p);
  };

  const handleStyleSelect = (s: AnimeShaderStyle) => {
    animeAudio.playUiClick(settings.soundEnabled);
    onChange('style', s);
  };

  const handleDioramaSelect = (d: AnimeDiorama) => {
    animeAudio.playUiClick(settings.soundEnabled);
    onChange('diorama', d);
  };

  const handleCameraPreset = (preset: CameraPreset) => {
    animeAudio.playUiClick(settings.soundEnabled);
    onChange('cameraPreset', preset);
  };

  return (
    <>
      {/* Top Header Bar (Unobtrusive) */}
      <header className="fixed top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-neutral-900/90 border border-neutral-800 rounded-xl px-4 py-2 pointer-events-auto shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            極
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-sm text-white font-['Outfit']">
                CELSTUDIO 3D
              </span>
              <span className="text-[10px] uppercase tracking-widest text-pink-400 bg-pink-950/70 border border-pink-800/60 px-1.5 py-0.5 rounded">
                Anime Engine
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans">
              Three.js Procedural Cel-Shading & Inverted-Hull Inking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Audio Mute/Unmute */}
          <button
            onClick={() => onChange('soundEnabled', !settings.soundEnabled)}
            className="w-10 h-10 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
            title={settings.soundEnabled ? 'Mute Procedural Audio' : 'Unmute Procedural Audio'}
          >
            {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Screenshot / Wallpaper Export */}
          <button
            onClick={() => {
              animeAudio.playCameraShutter(settings.soundEnabled);
              onCaptureScreenshot();
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl shadow-lg transition-all"
            title="Export clean 4K anime wallpaper screenshot"
          >
            <Camera size={16} />
            <span className="hidden sm:inline">Photo Mode</span>
          </button>
        </div>
      </header>

      {/* Unified Bottom Control Dock */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-[94vw] max-w-[880px] z-30 transition-transform duration-300 ease-out ${
          isCollapsed ? 'translate-y-[calc(100%-42px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Tab Button */}
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 border-t border-x border-neutral-700/80 rounded-t-xl text-neutral-300 hover:text-white text-xs font-medium shadow-md transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronUp size={14} className="text-pink-400" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} className="text-pink-400" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>

        {/* Main Glass/Solid Panel */}
        <div className="bg-neutral-950/95 border border-neutral-800 rounded-2xl p-4 shadow-2xl">
          {/* Top Bar: Tabs & Camera Quick View */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800/80">
            {/* Nav Tabs */}
            <div className="flex items-center gap-1.5 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => handleTabChange('character')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'character'
                    ? 'bg-neutral-800 text-pink-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sword size={14} />
                <span>Character & Pose</span>
              </button>

              <button
                onClick={() => handleTabChange('style')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'style'
                    ? 'bg-neutral-800 text-pink-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Palette size={14} />
                <span>Cel Shading</span>
              </button>

              <button
                onClick={() => handleTabChange('world')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'world'
                    ? 'bg-neutral-800 text-pink-400 shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <SunMedium size={14} />
                <span>Diorama & World</span>
              </button>
            </div>

            {/* Quick Camera Presets & Turntable */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-neutral-400 hidden md:inline mr-1">Camera:</span>
              {(['hero', 'portrait', 'action', 'diorama'] as CameraPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleCameraPreset(preset)}
                  className={`px-2 py-1 rounded-lg uppercase tracking-wider text-[10px] font-semibold transition-colors ${
                    settings.cameraPreset === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {preset}
                </button>
              ))}

              <button
                onClick={() => onChange('autoRotate', !settings.autoRotate)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ml-1 ${
                  settings.autoRotate
                    ? 'bg-pink-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                }`}
                title="Turntable Cinema Auto-Rotate"
              >
                <RotateCw size={12} />
                <span>Orbit</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Character, Pose & Expression */}
          {activeTab === 'character' && (
            <div className="space-y-3">
              {/* Character Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">Hero Subject:</span>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  {[
                    { id: 'ronin', name: 'Aoi (Cyber Ronin)', tag: 'Kimono & Katana' },
                    { id: 'mecha', name: 'Unit-09 Striker', tag: 'V-Fin Mecha' },
                    { id: 'kitsune', name: 'Kitsune Shrine', tag: 'Fox Spirit Maiden' },
                  ].map((char) => (
                    <button
                      key={char.id}
                      onClick={() => handleCharSelect(char.id as AnimeCharacterId)}
                      className={`text-left p-2 rounded-xl border transition-all ${
                        settings.character === char.id
                          ? 'bg-neutral-800 border-pink-500/80 text-white shadow-md'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-tight">{char.name}</div>
                      <div className="text-[10px] text-pink-400/90">{char.tag}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Poses */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">Action Pose:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-grow">
                  {[
                    { id: 'idle', label: 'Idle Breeze', desc: 'Breathing & Sway' },
                    { id: 'katana_ready', label: 'Ready Stance', desc: 'Blade Drawn' },
                    { id: 'combat_slash', label: 'Combat Slash', desc: 'Dynamic Strike' },
                    { id: 'magic_cast', label: 'Celestial Cast', desc: 'Spirit Aura' },
                  ].map((pose) => (
                    <button
                      key={pose.id}
                      onClick={() => handlePoseSelect(pose.id as AnimePose)}
                      className={`text-left px-3 py-1.5 rounded-xl border transition-all ${
                        settings.pose === pose.id
                          ? 'bg-neutral-800 border-indigo-500 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="text-xs font-medium">{pose.label}</div>
                      <div className="text-[10px] text-neutral-400">{pose.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Facial Expressions (for Human/Spirit characters) & Weapon Choice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Expression */}
                <div className="flex items-center gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <Smile size={16} className="text-pink-400 flex-shrink-0 ml-1" />
                  <span className="text-xs text-neutral-400 w-20">Facial Mood:</span>
                  <div className="flex gap-1 flex-grow">
                    {(['determined', 'smiling', 'focused', 'blush'] as AnimeExpression[]).map(
                      (expr) => (
                        <button
                          key={expr}
                          onClick={() => {
                            animeAudio.playUiClick(settings.soundEnabled);
                            onChange('expression', expr);
                          }}
                          className={`flex-1 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold capitalize ${
                            settings.expression === expr
                              ? 'bg-pink-600 text-white'
                              : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {expr}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Weapon Equipment */}
                <div className="flex items-center gap-2 bg-neutral-900/60 p-2 rounded-xl border border-neutral-800">
                  <Sword size={16} className="text-indigo-400 flex-shrink-0 ml-1" />
                  <span className="text-xs text-neutral-400 w-20">Weapon Arm:</span>
                  <div className="flex gap-1 flex-grow">
                    {[
                      { id: 'katana', label: 'Katana' },
                      { id: 'plasma_blade', label: 'Plasma' },
                      { id: 'spirit_orbs', label: 'Spirits' },
                      { id: 'none', label: 'Sheathed' },
                    ].map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          if (w.id === 'plasma_blade') {
                            animeAudio.playPlasmaIgnite(settings.soundEnabled);
                          } else if (w.id === 'katana') {
                            animeAudio.playKatanaSlash(settings.soundEnabled);
                          } else {
                            animeAudio.playUiClick(settings.soundEnabled);
                          }
                          onChange('weapon', w.id as AnimeWeapon);
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold ${
                          settings.weapon === w.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Cel Shading & Ink Outline */}
          {activeTab === 'style' && (
            <div className="space-y-3">
              {/* Shader Presets */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">Anime Shader:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-grow">
                  {[
                    { id: 'anime_cel', name: 'Classic Cel', desc: 'Stepped Toon' },
                    { id: 'cyber_neon', name: 'Cyber Neon', desc: 'Glowing Rim' },
                    { id: 'manga_ink', name: 'Manga Ink', desc: 'B&W Halftone' },
                    { id: 'sunset_golden', name: 'Sunset Hour', desc: 'Warm Anime Film' },
                    { id: 'sakura_dream', name: 'Sakura Pastel', desc: 'Fantasy Glow' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleStyleSelect(style.id as AnimeShaderStyle)}
                      className={`text-left p-2 rounded-xl border transition-all ${
                        settings.style === style.id
                          ? 'bg-neutral-800 border-pink-500 text-white shadow-md'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{style.name}</div>
                      <div className="text-[10px] text-neutral-400">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Outline Thickness */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Layers size={14} className="text-pink-400" />
                      Inverted-Hull Inked Outline:
                    </span>
                    <span className="text-xs text-pink-400 font-mono">
                      {settings.outlineThickness === 0
                        ? 'Disabled'
                        : `${(settings.outlineThickness * 100).toFixed(1)} pt`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.05"
                    step="0.005"
                    value={settings.outlineThickness}
                    onChange={(e) => onChange('outlineThickness', parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Clean Silhouette (0)</span>
                    <span>Heavy Ink Pen (5pt)</span>
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-400" />
                      Emissive Blade Glow:
                    </span>
                    <span className="text-xs text-indigo-400 font-mono">
                      {settings.bloomGlow ? 'Active (PBR Pulse)' : 'Muted'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChange('bloomGlow', true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        settings.bloomGlow
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      High Energy
                    </button>
                    <button
                      onClick={() => onChange('bloomGlow', false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                        !settings.bloomGlow
                          ? 'bg-indigo-600 text-white'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      Subtle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Diorama, Wind & Atmosphere */}
          {activeTab === 'world' && (
            <div className="space-y-3">
              {/* Diorama Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-neutral-400 w-24 flex-shrink-0">Diorama Scene:</span>
                <div className="grid grid-cols-3 gap-2 flex-grow">
                  {[
                    { id: 'torii_shrine', name: 'Torii Shrine Garden', desc: 'Sakura & Stone Lanterns' },
                    { id: 'neo_tokyo', name: 'Neo-Tokyo Rooftop', desc: 'Cyber Kanji Holograms' },
                    { id: 'hyperspace', name: 'Hyperspace Action', desc: 'Anime Speedlines' },
                  ].map((dio) => (
                    <button
                      key={dio.id}
                      onClick={() => handleDioramaSelect(dio.id as AnimeDiorama)}
                      className={`text-left p-2 rounded-xl border transition-all ${
                        settings.diorama === dio.id
                          ? 'bg-neutral-800 border-pink-500 text-white shadow-md'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="font-semibold text-xs leading-tight">{dio.name}</div>
                      <div className="text-[10px] text-neutral-400">{dio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders: Wind Speed & Sakura Density */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Wind size={14} className="text-pink-400" />
                      Wind Gust & Hair Sway:
                    </span>
                    <span className="text-xs text-pink-400 font-mono">
                      {settings.windSpeed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={settings.windSpeed}
                    onChange={(e) => onChange('windSpeed', parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Gentle Breeze (0.2x)</span>
                    <span>Typhoon Gale (2.5x)</span>
                  </div>
                </div>

                <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-400" />
                      Particle & Petal Density:
                    </span>
                    <span className="text-xs text-indigo-400 font-mono">
                      {settings.sakuraDensity} items
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="25"
                    value={settings.sakuraDensity}
                    onChange={(e) => onChange('sakuraDensity', parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>Minimal (50)</span>
                    <span>Petal Storm (500)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
