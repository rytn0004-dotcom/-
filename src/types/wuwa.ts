export type ResonatorId = 'shorekeeper' | 'jinhsi' | 'changli';

export type WuwaDiorama =
  | 'black_shores_sanctum' // Exact gothic stained-glass & water pool matching user photo
  | 'mount_firmament' // Jinzhou celestial dragon altar
  | 'phoenix_altar'; // Blazing lotus stage

export type ResonatorAction =
  | 'standby' // Graceful figurine display pose (matching reference)
  | 'resonance_skill' // Active battle ready stance
  | 'resonance_liberation' // Full ultimate cutscene pose with radiant VFX aura
  | 'flutter_inspection'; // Slow inspection turn

export type StudioLightingPreset =
  | 'reference_darkbox' // Pitch black background with blue spotlight halo matching the user photo
  | 'moonlight_sanctum'
  | 'stellar_aurora'
  | 'golden_hour';

export interface WuwaStudioSettings {
  resonator: ResonatorId;
  action: ResonatorAction;
  diorama: WuwaDiorama;
  lighting: StudioLightingPreset;
  ribbonWaveSpeed: number; // 0.2 to 2.5
  waterGlowIntensity: number; // 0.5 to 2.5
  stainedGlassGlow: number; // 0.5 to 3.0
  tacetMarkGlow: boolean; // 聲痕 glow
  resonanceVfxActive: boolean;
  autoRotate: boolean;
  soundEnabled: boolean;
  showReferencePhoto: boolean;
  cameraPreset: 'full_statue' | 'face_tiara' | 'celestial_ribbons' | 'water_pool';
}
