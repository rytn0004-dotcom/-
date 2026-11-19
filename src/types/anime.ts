export type AnimeCharacterId = 'ronin' | 'mecha' | 'kitsune';

export type AnimeShaderStyle =
  | 'anime_cel'
  | 'cyber_neon'
  | 'manga_ink'
  | 'sunset_golden'
  | 'sakura_dream';

export type AnimeDiorama = 'torii_shrine' | 'neo_tokyo' | 'hyperspace';

export type AnimePose = 'idle' | 'katana_ready' | 'combat_slash' | 'magic_cast';

export type AnimeExpression = 'determined' | 'smiling' | 'focused' | 'blush';

export type AnimeWeapon = 'katana' | 'plasma_blade' | 'spirit_orbs' | 'none';

export type CameraPreset = 'hero' | 'portrait' | 'action' | 'diorama' | 'cinema';

export interface AnimeSceneSettings {
  character: AnimeCharacterId;
  style: AnimeShaderStyle;
  diorama: AnimeDiorama;
  pose: AnimePose;
  expression: AnimeExpression;
  weapon: AnimeWeapon;
  outlineThickness: number;
  windSpeed: number;
  sakuraDensity: number;
  bloomGlow: boolean;
  autoRotate: boolean;
  soundEnabled: boolean;
  cameraPreset: CameraPreset;
}

export type FigureLightingMode =
  | 'studio_exhibition'
  | 'cathedral_midnight'
  | 'moonlight_serenade'
  | 'sunset_gold'
  | 'cyber_crystal';

export type FigureFocusTarget = 'full_statue' | 'portrait' | 'dress_ribbons' | 'gothic_base';

export interface FigureStudioSettings {
  lightingMode: FigureLightingMode;
  focusTarget: FigureFocusTarget;
  autoRotate: boolean;
  waterGlow: boolean;
  ribbonSway: number;
  stainedGlassIntensity: number;
  bloomEffect: boolean;
  showReferenceCard: boolean;
  soundEnabled: boolean;
  scaleFactor: number;
}
