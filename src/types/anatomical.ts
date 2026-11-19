export interface ResonatorBodySpecs {
  heightCm: number; // 168 cm
  weightKg: number; // 48 kg
  headToBodyRatio: number; // 9.0 (九頭身)
  bustCm: number; // 86 cm (70D)
  waistCm: number; // 58 cm
  hipCm: number; // 88 cm
  legLengthCm: number; // 104 cm (61.9% of body)
  resonanceFrequency: string; // 142.85 MHz (Spectro / 衍射)
  tacetMarkLocation: string; // 頸椎第三節 (C3 Cervical Vertebra)
  overclockRisk: string; // 低 (Low / 0.12%)
  harmonicCohesion: number; // 98.6%
}

export interface BodyCustomization {
  bustScale: number; // 0.8 to 1.3
  waistTaper: number; // 0.8 to 1.2
  legLengthScale: number; // 0.9 to 1.15
  hairVolume: number; // 0.8 to 1.4
  ribbonWaveSpeed: number; // 0.2 to 2.5
  viewMode: 'pbr' | 'clay' | 'wireframe';
  expression: 'serene' | 'smile' | 'focused' | 'melancholy';
  haloIntensity: number; // 0.5 to 3.0
  haloColor: string; // '#2563eb' | '#a855f7' | '#06b6d4' | '#f59e0b'
  keyLightWarmth: number; // 3000 to 6500 Kelvin
  waterBloom: number; // 0.5 to 2.5
  skinSheen: number; // 0.2 to 1.0 (Subsurface dermis glow)
  breathingIntensity: number; // 0.5 to 2.0
  skinSssWarmth?: number; // 0.2 to 1.8 (次表面散射 SSS 珊瑚透光)
  skinMicroBump?: number; // 0.2 to 2.0 (真皮微觀毛孔與凹凸紋理)
  skinTone?: 'porcelain' | 'peach' | 'warm'; // 膚色調性 (白瓷 / 蜜桃 / 暖玉)
  fabricBump?: number; // 0.2 to 2.0 (高級絲綢與刺繡織物凹凸)
  keyLightAngle?: number; // 0 to 360 degrees (動態主光源旋轉軌道)
  keyLightElevation?: number; // 15 to 80 degrees (主光源俯仰高度)
  exposure?: number; // 0.65 to 1.45 (ACES 電影級曝光度)
  rimLightPower?: number; // 0.3 to 2.6 (動漫邊緣輪廓光)
  bloomStrength?: number; // 0.0 to 1.0 (輝光後製強度)
  atmospherePreset?: 'celestial' | 'sunset' | 'cyber' | 'gallery';
}
