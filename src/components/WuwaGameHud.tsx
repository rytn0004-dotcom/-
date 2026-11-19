import React from 'react';
import { DamageNumber, ResonatorProfile, ResonatorType } from '../types/game';
import { Zap, Shield, Sparkles, Sword, RotateCcw, Volume2, VolumeX, Eye } from 'lucide-react';

interface WuwaGameHudProps {
  currentResonator: ResonatorProfile;
  team: ResonatorProfile[];
  onSwitchResonator: (type: ResonatorType) => void;
  onBasicAttack: () => void;
  onSkill: () => void;
  onLiberation: () => void;
  onDodge: () => void;
  comboCount: number;
  damageNumbers: DamageNumber[];
  targetHp: number;
  targetMaxHp: number;
  targetStagger: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetTarget: () => void;
}

export const WuwaGameHud: React.FC<WuwaGameHudProps> = ({
  currentResonator,
  team,
  onSwitchResonator,
  onBasicAttack,
  onSkill,
  onLiberation,
  onDodge,
  comboCount,
  damageNumbers,
  targetHp,
  targetMaxHp,
  targetStagger,
  soundEnabled,
  onToggleSound,
  onResetTarget,
}) => {
  const hpPercent = (currentResonator.hp / currentResonator.maxHp) * 100;
  const fortePercent = (currentResonator.forte / currentResonator.maxForte) * 100;
  const targetHpPercent = (targetHp / targetMaxHp) * 100;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* ==================== TOP BAR: TARGET HP & SYSTEM CONTROLS ==================== */}
      <div className="flex items-start justify-between w-full">
        {/* Top Left: Logo & Controls Help */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-2.5 bg-neutral-950/85 border border-neutral-800 rounded-xl px-3.5 py-2 shadow-xl backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xs">
              鳴
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-wider text-white font-['Outfit']">
                  WUTHERING WAVES
                </span>
                <span className="text-[9px] uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.2 rounded">
                  Live Combat
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                WASD: Move • Mouse: Camera • L-Click: Attack • Space: Jump
              </p>
            </div>
          </div>
        </div>

        {/* Top Center: Target Boss / Enemy HP Bar */}
        <div className="flex flex-col items-center w-72 sm:w-96">
          <div className="flex items-center justify-between w-full text-xs font-semibold px-1 mb-1">
            <span className="text-amber-400 flex items-center gap-1.5 text-xs">
              <span className="text-[10px] bg-red-950 border border-red-800 text-red-400 px-1.5 py-0.5 rounded font-mono">
                Lv. 95
              </span>
              鳴式幻象 • 訓練傀儡 (Tacet Discord)
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">
              {targetHp.toLocaleString()} / {targetMaxHp.toLocaleString()}
            </span>
          </div>

          {/* Enemy HP Fill */}
          <div className="w-full h-2.5 bg-neutral-900 border border-neutral-700/80 rounded-full overflow-hidden shadow-md">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-150"
              style={{ width: `${targetHpPercent}%` }}
            />
          </div>

          {/* Stagger Bar */}
          <div className="w-full h-1 bg-neutral-950 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-100"
              style={{ width: `${targetStagger}%` }}
            />
          </div>
        </div>

        {/* Top Right: System Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onResetTarget}
            className="flex items-center gap-1 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 px-2.5 py-1.5 rounded-xl text-xs transition-colors shadow-lg"
            title="Reset Enemy Training Dummy"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Enemy</span>
          </button>

          <button
            onClick={onToggleSound}
            className="w-8 h-8 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* ==================== MID-SCREEN: COMBO COUNTER & DAMAGE POPUPS ==================== */}
      <div className="relative w-full flex-grow flex items-center justify-center pointer-events-none">
        {/* Left Combo Counter */}
        {comboCount > 1 && (
          <div className="absolute left-4 top-1/3 flex flex-col items-start animate-pulse">
            <span className="text-4xl sm:text-5xl font-extrabold italic text-amber-400 tracking-tighter drop-shadow-lg font-['Outfit']">
              {comboCount}
            </span>
            <span className="text-xs uppercase tracking-widest text-white/90 font-bold bg-neutral-950/80 px-2 py-0.5 rounded border border-amber-500/40">
              Hits Combo
            </span>
          </div>
        )}

        {/* Floating Damage Numbers */}
        <div className="absolute inset-0 flex items-center justify-center">
          {damageNumbers.map((dmg) => (
            <div
              key={dmg.id}
              className={`absolute font-extrabold transition-all duration-300 transform -translate-y-8 font-['Outfit'] ${
                dmg.isCrit
                  ? 'text-3xl text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.8)]'
                  : 'text-xl text-cyan-300 drop-shadow-[0_2px_8px_rgba(56,189,248,0.6)]'
              }`}
              style={{
                top: `${dmg.y}%`,
                left: `${dmg.x}%`,
                opacity: dmg.opacity,
              }}
            >
              {dmg.isCrit && <span className="text-xs uppercase mr-1 text-white">CRIT</span>}
              {dmg.value.toLocaleString()}
            </div>
          ))}
        </div>

        {/* Right Side: Resonator Team Quick-Switch (1, 2, 3) */}
        <div className="absolute right-2 sm:right-4 flex flex-col gap-2.5 pointer-events-auto">
          {team.map((res, idx) => (
            <button
              key={res.id}
              onClick={() => onSwitchResonator(res.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition-all shadow-xl ${
                currentResonator.id === res.id
                  ? 'bg-neutral-900 border-amber-500 text-white scale-105 shadow-amber-500/20'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-neutral-700">
                {idx + 1}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold leading-tight">{res.name}</div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  {res.element}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ==================== BOTTOM BAR: HP, FORTE CIRCUIT & ACTION SKILL BUTTONS ==================== */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto">
        {/* Bottom Left: Resonator Status Bar (Level 90, HP & Forte Circuit) */}
        <div className="flex items-center gap-3 bg-neutral-950/90 border border-neutral-800 rounded-2xl p-3 shadow-2xl backdrop-blur-sm min-w-[280px]">
          {/* Avatar Icon */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-900 to-amber-900 border border-amber-500/50 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
            {currentResonator.name[0]}
          </div>

          <div className="flex-grow">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-mono">
                  Lv. 90
                </span>
                {currentResonator.name}
              </span>
              <span className="text-[11px] text-neutral-300 font-mono">
                {currentResonator.hp.toLocaleString()} / {currentResonator.maxHp.toLocaleString()}
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>

            {/* Forte Circuit Bar (特殊能量槽) */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] uppercase tracking-wider text-amber-400 font-semibold">
                Forte:
              </span>
              <div className="flex-grow h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className={`h-full transition-all duration-100 ${
                    fortePercent >= 100
                      ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${fortePercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Right: Wuthering Waves Action Buttons (Attack, E, Q, Shift) */}
        <div className="flex items-center gap-3">
          {/* Flash Dodge / Dash (Shift / Right Click) */}
          <button
            onClick={onDodge}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 hover:border-cyan-400 text-white transition-all shadow-xl active:scale-95"
            title="Flash Dodge (Shift / R-Click)"
          >
            <Shield size={18} className="text-cyan-400" />
            <span className="text-[9px] font-mono text-neutral-400 mt-0.5">Shift</span>
          </button>

          {/* Resonance Skill (E) */}
          <button
            onClick={onSkill}
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900/90 border border-cyan-500/60 hover:border-cyan-400 text-white transition-all shadow-xl active:scale-95 relative"
            title="Resonance Skill (E)"
          >
            <Sparkles size={20} className="text-cyan-300" />
            <span className="text-[10px] font-mono text-cyan-400 font-bold mt-0.5">E</span>
          </button>

          {/* Basic Attack (Left Click / J) */}
          <button
            onClick={onBasicAttack}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 hover:brightness-110 text-white transition-all shadow-2xl active:scale-95 border-2 border-amber-300"
            title="Basic Attack (Left Click / J)"
          >
            <Sword size={24} className="text-neutral-950" />
            <span className="text-[10px] font-extrabold text-neutral-950 font-mono">ATK (J)</span>
          </button>

          {/* Resonance Liberation (Q / Ultimate) */}
          <button
            onClick={onLiberation}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl border transition-all shadow-xl active:scale-95 relative ${
              fortePercent >= 100
                ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 border-amber-400 text-white animate-pulse'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-300 hover:border-amber-400'
            }`}
            title="共鳴解放 Resonance Liberation (Q)"
          >
            <Zap size={20} className="text-amber-300" />
            <span className="text-[10px] font-mono text-amber-300 font-bold mt-0.5">Q</span>
          </button>
        </div>
      </div>
    </div>
  );
};
