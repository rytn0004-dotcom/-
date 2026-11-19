import * as THREE from 'three';

/**
 * Creates high-res anatomical skin texture with soft ambient occlusion,
 * clavicle shadows, bust contour gradients, knee/elbow warmth, and peach blush.
 */
export function createAnatomicalSkinTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base Porcelain Skin tone with peach undertone
  ctx.fillStyle = '#ffede4';
  ctx.fillRect(0, 0, width, height);

  // Soft vertical gradient (slightly warmer at extremities and torso)
  const vertGrad = ctx.createLinearGradient(0, 0, 0, height);
  vertGrad.addColorStop(0, 'rgba(255, 235, 225, 0.4)');
  vertGrad.addColorStop(0.3, 'rgba(255, 240, 232, 0.1)');
  vertGrad.addColorStop(0.7, 'rgba(254, 220, 210, 0.3)');
  vertGrad.addColorStop(1, 'rgba(253, 215, 205, 0.5)');
  ctx.fillStyle = vertGrad;
  ctx.fillRect(0, 0, width, height);

  // Clavicle Bone Hollow Shadows & Highlights (Upper section)
  ctx.save();
  ctx.fillStyle = 'rgba(215, 165, 155, 0.25)';
  // Left hollow
  ctx.beginPath();
  ctx.ellipse(320, 180, 140, 25, -0.12, 0, Math.PI * 2);
  ctx.fill();
  // Right hollow
  ctx.beginPath();
  ctx.ellipse(704, 180, 140, 25, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Clavicle Ridge Highlight (White/Pale bone ridge above hollow)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(320, 160, 130, 12, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(704, 160, 130, 12, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Cleavage & Bust Contour Shadow Gradient
  ctx.save();
  const cleavageGrad = ctx.createRadialGradient(512, 340, 5, 512, 340, 120);
  cleavageGrad.addColorStop(0, 'rgba(195, 140, 130, 0.35)');
  cleavageGrad.addColorStop(0.5, 'rgba(215, 160, 150, 0.15)');
  cleavageGrad.addColorStop(1, 'rgba(255, 237, 228, 0.0)');
  ctx.fillStyle = cleavageGrad;
  ctx.fillRect(400, 260, 224, 160);

  // Soft Under-Bust Shadow Creases
  ctx.strokeStyle = 'rgba(190, 135, 125, 0.22)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(380, 360, 110, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(644, 360, 110, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // Navel & Abdominal Midline Shadow (Center section)
  ctx.save();
  ctx.fillStyle = 'rgba(185, 130, 120, 0.3)';
  ctx.beginPath();
  ctx.ellipse(512, 620, 8, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Linea alba (soft vertical midline)
  ctx.strokeStyle = 'rgba(210, 155, 145, 0.15)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(512, 420);
  ctx.lineTo(512, 600);
  ctx.stroke();
  ctx.restore();

  // Knee & Joint Peach Warmth (Lower section)
  const drawJointBlush = (x: number, y: number, r: number) => {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 5, x, y, r);
    g.addColorStop(0, 'rgba(244, 114, 182, 0.32)');
    g.addColorStop(0.6, 'rgba(251, 146, 192, 0.12)');
    g.addColorStop(1, 'rgba(255, 237, 228, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawJointBlush(340, 820, 90); // Left knee
  drawJointBlush(684, 820, 90); // Right knee
  drawJointBlush(240, 140, 70); // Left shoulder
  drawJointBlush(784, 140, 70); // Right shoulder

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates true Tangent-Space Normal Map for skin concavity & convexity (凹凸紋理)
 * Computes normal vectors (R=Nx, G=Ny, B=Nz) for clavicle, cleavage, and knees!
 */
export function createAnatomicalSkinNormalMap(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Neutral tangent-space normal: vec3(0, 0, 1) -> RGB(128, 128, 255) #8080ff
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);

  // Clavicle bone relief (bump up above, indent below)
  // Upward slope: G > 128, Downward slope: G < 128
  ctx.save();
  // Left clavicle ridge
  ctx.fillStyle = '#80b8ff'; // Top slope facing up
  ctx.beginPath();
  ctx.ellipse(160, 85, 70, 7, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8050ff'; // Bottom slope facing down
  ctx.beginPath();
  ctx.ellipse(160, 97, 70, 7, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // Right clavicle ridge
  ctx.fillStyle = '#80b8ff';
  ctx.beginPath();
  ctx.ellipse(352, 85, 70, 7, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8050ff';
  ctx.beginPath();
  ctx.ellipse(352, 97, 70, 7, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Cleavage depth cleft
  ctx.fillStyle = '#5080ff'; // Left inner slope facing right
  ctx.fillRect(250, 150, 6, 80);
  ctx.fillStyle = '#b080ff'; // Right inner slope facing left
  ctx.fillRect(256, 150, 6, 80);

  // Navel circular depression
  const navelGrad = ctx.createRadialGradient(256, 310, 2, 256, 310, 10);
  navelGrad.addColorStop(0, '#5080d0');
  navelGrad.addColorStop(0.5, '#7070e0');
  navelGrad.addColorStop(1, '#8080ff');
  ctx.fillStyle = navelGrad;
  ctx.beginPath();
  ctx.arc(256, 310, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates high-precision PBR skin roughness map for realistic human dermis.
 * Low roughness (glossy highlight) on clavicle ridges, cleavage line, patella, and shoulders;
 * Velvety micro-softness on body dermis.
 */
export function createAnatomicalSkinRoughnessMap(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base skin roughness ~ 0.42 (RGB 108, 108, 108)
  ctx.fillStyle = '#6c6c6c';
  ctx.fillRect(0, 0, width, height);

  // Clavicle bone crests (Specular gloss ~ 0.18)
  ctx.save();
  ctx.fillStyle = '#2e2e2e';
  ctx.beginPath();
  ctx.ellipse(160, 88, 72, 8, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 88, 72, 8, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Cleavage line highlight (~ 0.22)
  ctx.fillStyle = '#383838';
  ctx.fillRect(252, 140, 8, 90);

  // Knee patella highlights (~ 0.20)
  ctx.beginPath();
  ctx.ellipse(170, 410, 35, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(342, 410, 35, 45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shoulder deltoid sheen (~ 0.25)
  ctx.fillStyle = '#404040';
  ctx.beginPath();
  ctx.arc(120, 70, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(392, 70, 35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates Epidermal Clearcoat Sheen Map for porcelain living skin
 */
export function createSkinClearcoatMap(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Baseline clearcoat 0.35 (RGB 90, 90, 90)
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(0, 0, width, height);

  // Extra clearcoat sheen on high-relief anatomy (RGB 200, 200, 200)
  ctx.fillStyle = '#c8c8c8';
  // Clavicle
  ctx.beginPath();
  ctx.ellipse(160, 88, 70, 6, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(352, 88, 70, 6, 0.12, 0, Math.PI * 2);
  ctx.fill();

  // Cleavage & Chest curve
  ctx.beginPath();
  ctx.arc(256, 175, 40, 0, Math.PI * 2);
  ctx.fill();

  // Knee patella
  ctx.beginPath();
  ctx.arc(170, 410, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(342, 410, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates multi-stage hair gradient with champagne shadow, golden blonde midtones,
 * and platinum glowing specular highlights ("angel ring").
 */
export function createHairGradientTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Smooth vertical hair gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#d97706'); // Warm caramel ash root shadow
  grad.addColorStop(0.2, '#f59e0b'); // Golden amber
  grad.addColorStop(0.45, '#fde047'); // Luminous champagne blonde
  grad.addColorStop(0.5, '#ffffff'); // "Angel Ring" specular shine highlight
  grad.addColorStop(0.58, '#fef08a'); // Platinum blonde
  grad.addColorStop(0.85, '#fde68a'); // Soft pastel blonde
  grad.addColorStop(1, '#e2e8f0'); // Cool translucent tip fade
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Fine longitudinal anime hair strand textures
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.15)';
  ctx.lineWidth = 2;
  for (let x = 8; x < width; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x + (Math.random() - 0.5) * 4, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, height);
    ctx.stroke();
  }

  // Cross specular shine band
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillRect(0, 240, width, 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates the iconic 5-stage celestial starry banner gradient texture
 * (Ivory silk -> Turquoise -> Royal Sapphire -> Cosmic Galaxy with gold filigree)
 */
export function createCelestialSilkTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 5-Stage Multi-Color Gradient
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#ffffff'); // Pearlescent Ivory Silk
  grad.addColorStop(0.18, '#f1f5f9');
  grad.addColorStop(0.38, '#38bdf8'); // Radiant Turquoise / Cyan
  grad.addColorStop(0.62, '#1d4ed8'); // Royal Sapphire Blue
  grad.addColorStop(0.85, '#1e1b4b'); // Deep Twilight Indigo
  grad.addColorStop(1, '#090a16'); // Cosmic Midnight
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Swirling Cosmic Nebula Dust Cloud
  const nebulaGrad = ctx.createRadialGradient(
    width * 0.72,
    height * 0.5,
    30,
    width * 0.72,
    height * 0.5,
    350,
  );
  nebulaGrad.addColorStop(0, 'rgba(168, 85, 247, 0.6)'); // Amethyst nebula
  nebulaGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.35)'); // Cyan haze
  nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebulaGrad;
  ctx.fillRect(width * 0.45, 0, width * 0.55, height);

  // 24K Gold Arabesque Filigree Embroideries along top and bottom edges
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 6;
  ctx.shadowColor = 'rgba(251, 191, 36, 0.8)';
  ctx.shadowBlur = 8;

  // Top scalloped gold wave
  ctx.beginPath();
  ctx.moveTo(0, 24);
  for (let x = 0; x < width; x += 60) {
    ctx.quadraticCurveTo(x + 30, 8, x + 60, 24);
  }
  ctx.stroke();

  // Bottom scalloped gold wave
  ctx.beginPath();
  ctx.moveTo(0, height - 24);
  for (let x = 0; x < width; x += 60) {
    ctx.quadraticCurveTo(x + 30, height - 8, x + 60, height - 24);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Golden Floral Vine Spines across the middle
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width * 0.08, height * 0.5);
  ctx.bezierCurveTo(
    width * 0.35,
    height * 0.18,
    width * 0.65,
    height * 0.82,
    width * 0.95,
    height * 0.5,
  );
  ctx.stroke();

  // Floating Constellation Stars & Stardust
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 110; i++) {
    const sx = width * 0.35 + Math.random() * (width * 0.62);
    const sy = 30 + Math.random() * (height - 60);
    const sr = 1.0 + Math.random() * 2.8;

    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    // 4-Point cross star flares on larger stars
    if (sr > 2.2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx, sy + 8);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates high-res expressive anime face texture with gradient eyes,
 * pupil depth, corneal highlight stars, soft lips, and cheek blush.
 */
export function createWuwaFaceTexture(
  eyeColor = '#60a5fa',
  expression: 'serene' | 'smile' | 'focused' | 'melancholy' = 'serene',
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  const drawResonatorEye = (cx: number, cy: number, isRight: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);
    if (isRight) ctx.scale(-1, 1);

    const w = 120;
    const h = expression === 'smile' ? 140 : 155;

    // Sclera
    ctx.beginPath();
    ctx.ellipse(0, 0, w, h, -0.06, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Upper shadow on sclera
    const scleraGrad = ctx.createLinearGradient(0, -h, 0, h);
    scleraGrad.addColorStop(0, 'rgba(165, 180, 252, 0.45)');
    scleraGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = scleraGrad;
    ctx.fill();

    // Iris clip
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 8, w * 0.76, h * 0.86, 0, 0, Math.PI * 2);
    ctx.clip();

    // Multi-stage Iris gradient
    const irisGrad = ctx.createLinearGradient(0, -h * 0.7, 0, h * 0.8);
    irisGrad.addColorStop(0, '#1e1b4b'); // Deep night
    irisGrad.addColorStop(0.35, '#3b82f6'); // Sapphire
    irisGrad.addColorStop(0.65, eyeColor); // Lavender cyan
    irisGrad.addColorStop(1, '#c7d2fe'); // Soft pale glow

    ctx.fillStyle = irisGrad;
    ctx.fillRect(-w, -h, w * 2, h * 2);

    // Deep oval pupil
    ctx.beginPath();
    ctx.ellipse(0, 10, w * 0.32, h * 0.44, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Lower iris crescent reflection
    ctx.beginPath();
    ctx.ellipse(0, 52, w * 0.54, 32, 0, 0, Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fill();

    // Crystalline Star Highlight
    ctx.beginPath();
    ctx.arc(-24, -20, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Secondary soft glint
    ctx.beginPath();
    ctx.arc(30, 40, 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    ctx.restore(); // end clip

    // Winged eyeliner
    ctx.beginPath();
    ctx.moveTo(-w * 1.05, -h * 0.42);
    ctx.quadraticCurveTo(-w * 0.2, -h * 1.12, w * 0.96, -h * 0.48);
    ctx.quadraticCurveTo(w * 1.22, -h * 0.72, w * 1.3, -h * 0.85);
    ctx.quadraticCurveTo(w * 0.98, -h * 0.32, w * 0.7, -h * 0.22);
    ctx.quadraticCurveTo(-w * 0.2, -h * 0.88, -w * 1.05, -h * 0.42);
    ctx.fillStyle = '#1e1b4b';
    ctx.fill();

    // Lower lash line
    ctx.beginPath();
    if (expression === 'smile') {
      ctx.moveTo(-w * 0.45, h * 0.7);
      ctx.quadraticCurveTo(0, h * 0.55, w * 0.5, h * 0.68);
    } else {
      ctx.moveTo(-w * 0.45, h * 0.86);
      ctx.quadraticCurveTo(0, h * 0.96, w * 0.5, h * 0.82);
    }
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Eyebrow based on expression
    ctx.beginPath();
    if (expression === 'focused') {
      ctx.moveTo(-w * 0.85, -h * 1.25);
      ctx.quadraticCurveTo(-w * 0.1, -h * 1.55, w * 1.05, -h * 1.48);
    } else if (expression === 'melancholy') {
      ctx.moveTo(-w * 0.85, -h * 1.55);
      ctx.quadraticCurveTo(-w * 0.1, -h * 1.62, w * 1.05, -h * 1.25);
    } else {
      // serene / smile
      ctx.moveTo(-w * 0.85, -h * 1.4);
      ctx.quadraticCurveTo(-w * 0.1, -h * 1.72, w * 1.05, -h * 1.35);
    }
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  };

  drawResonatorEye(320, 240, false);
  drawResonatorEye(704, 240, true);

  // Soft nose shadow dot
  ctx.beginPath();
  ctx.ellipse(512, 335, 3.5, 4.5, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#94a3b8';
  ctx.fill();

  // Mouth based on expression
  ctx.beginPath();
  if (expression === 'smile') {
    ctx.arc(512, 366, 26, 0.1 * Math.PI, 0.9 * Math.PI);
  } else if (expression === 'melancholy') {
    ctx.arc(512, 395, 20, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    // serene / focused
    ctx.arc(512, 372, 22, 0.12 * Math.PI, 0.88 * Math.PI);
  }
  ctx.strokeStyle = '#9f1239';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Soft pink lip fill
  ctx.beginPath();
  ctx.arc(512, expression === 'smile' ? 372 : 376, 14, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
  ctx.fill();

  // Lip gloss reflection
  ctx.beginPath();
  ctx.ellipse(510, expression === 'smile' ? 380 : 384, 5, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Cheek blush
  const drawCheekBlush = (bx: number, by: number) => {
    ctx.save();
    const grad = ctx.createRadialGradient(bx, by, 6, bx, by, 75);
    grad.addColorStop(0, 'rgba(244, 114, 182, 0.45)');
    grad.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawCheekBlush(240, 325);
  drawCheekBlush(784, 325);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Glowing C3 Tacet Mark Texture (頸椎第三節聲痕)
 */
export function createTacetMarkTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Central glowing core
  const rad = ctx.createRadialGradient(128, 128, 4, 128, 128, 90);
  rad.addColorStop(0, 'rgba(56, 189, 248, 1.0)');
  rad.addColorStop(0.4, 'rgba(99, 102, 241, 0.8)');
  rad.addColorStop(0.8, 'rgba(168, 85, 247, 0.3)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, size, size);

  // Geometric Resonator Glyph
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 12;

  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(128, 40);
  ctx.lineTo(190, 128);
  ctx.lineTo(128, 216);
  ctx.lineTo(66, 128);
  ctx.closePath();
  ctx.stroke();

  // Inner wing arc
  ctx.beginPath();
  ctx.arc(128, 128, 32, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Backlit Stained Glass Gothic Window Texture
 */
export function createStainedGlassTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0518';
  ctx.fillRect(0, 0, size, size);

  const colors = [
    '#9333ea', // Royal purple
    '#c026d3', // Magenta
    '#2563eb', // Sapphire blue
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#4f46e5', // Indigo
  ];

  const cols = 6;
  const rows = 12;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const colIdx = (r * 3 + c * 2) % colors.length;
      ctx.fillStyle = colors[colIdx];
      ctx.fillRect(c * cellW + 4, r * cellH + 4, cellW - 8, cellH - 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(c * cellW + 6, r * cellH + 6, (cellW - 8) * 0.4, cellH - 8);
    }
  }

  // Dark lead came tracery borders
  ctx.strokeStyle = '#05020a';
  ctx.lineWidth = 8;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, size);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(size, r * cellH);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Water Ripple Pool Caustics Texture
 */
export function createWaterRippleTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const radGrad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.48,
  );
  radGrad.addColorStop(0, 'rgba(56, 189, 248, 0.95)');
  radGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.7)');
  radGrad.addColorStop(0.85, 'rgba(96, 165, 250, 0.9)');
  radGrad.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 4;
  for (let r = 40; r < size * 0.42; r += 50) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Seamless periodic value noise helper for organic dermal pores and woven fabrics
function tileableValueNoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const hash = (ix: number, iy: number) => {
    const px = ((ix % period) + period) % period;
    const py = ((iy % period) + period) % period;
    const n = Math.sin(px * 127.1 + py * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  };

  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);

  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Procedural Dermal Micro-Pore Normal Map (肌膚微觀毛孔與真皮紋理)
 * Multi-octave organic cellular pore heightfield converted via finite-difference gradients
 * so specular highlights diffuse into a silky, living dermis without repeating math grids.
 */
export function createSkinMicroNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Fine silky dermal grain — gentle isotropic variation without blotchy dimples
      const macro = tileableValueNoise(u * 20, v * 20, 20, 1) * 0.28;
      const mid = tileableValueNoise(u * 56, v * 56, 56, 2) * 0.36;
      const fine = tileableValueNoise(u * 128, v * 128, 128, 3) * 0.36;
      heights[y * size + x] = macro + mid + fine;
    }
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const strength = 0.52;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dX = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dY = (heights[yp * size + x] - heights[ym * size + x]) * strength;

      const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);
      const nx = -dX * invLen;
      const ny = -dY * invLen;
      const nz = invLen;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Procedural Dermal Micro-Roughness Map (肌膚微觀柔霧粗糙度紋理)
 * Smooth satin skin roughness range (0.45–0.53) for silky, even specular roll-off.
 */
export function createSkinMicroRoughnessMap(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const n1 = tileableValueNoise(u * 16, v * 16, 16, 7);
      const n2 = tileableValueNoise(u * 48, v * 48, 48, 11);
      // Roughness between ~0.45 (115) and ~0.53 (135) for silky, non-patchy skin shading
      const rough = Math.round(115 + (n1 * 0.65 + n2 * 0.35) * 20);
      const idx = (y * size + x) * 4;
      data[idx] = rough;
      data[idx + 1] = rough;
      data[idx + 2] = rough;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 4;
  return texture;
}

/**
 * Procedural Luxury Fabric / Silk Twill Weave Normal Map (高級絲綢斜紋與織錦紋理)
 * Diagonal silk twill combined with fine warp/weft yarn variation for realistic folds and cloth depth.
 */
export function createFabricWeaveNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const warp = Math.sin((x + y * 0.5) * 0.65);
      const weft = Math.cos((y - x * 0.5) * 0.65);
      const twill = Math.sin((x + y) * 0.45) * 0.35;
      const organic = tileableValueNoise(u * 48, v * 48, 48, 5) * 0.28;
      heights[y * size + x] = (warp * 0.38 + weft * 0.38 + twill) * 0.65 + organic;
    }
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const strength = 2.0;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dX = (heights[y * size + xp] - heights[y * size + xm]) * strength;
      const dY = (heights[yp * size + x] - heights[ym * size + x]) * strength;
      const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((-dX * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((-dY * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Sheer Stocking / Tights Texture (透膚黑絲與丹尼數光澤漸變)
 * Translucent charcoal sheer stocking gradient with warm peach skin undertone where fabric stretches thin.
 */
export function createSheerStockingTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#10141e';
  ctx.fillRect(0, 0, width, height);

  const stretchGrad = ctx.createLinearGradient(0, 0, width, 0);
  stretchGrad.addColorStop(0, 'rgba(16, 20, 30, 0.95)');
  stretchGrad.addColorStop(0.3, 'rgba(235, 175, 160, 0.35)');
  stretchGrad.addColorStop(0.5, 'rgba(245, 190, 175, 0.42)');
  stretchGrad.addColorStop(0.7, 'rgba(235, 175, 160, 0.35)');
  stretchGrad.addColorStop(1, 'rgba(16, 20, 30, 0.95)');
  ctx.fillStyle = stretchGrad;
  ctx.fillRect(0, 0, width, height);

  const kneeGrad = ctx.createRadialGradient(256, 520, 10, 256, 520, 110);
  kneeGrad.addColorStop(0, 'rgba(255, 205, 195, 0.55)');
  kneeGrad.addColorStop(0.5, 'rgba(230, 165, 150, 0.3)');
  kneeGrad.addColorStop(1, 'rgba(16, 20, 30, 0)');
  ctx.fillStyle = kneeGrad;
  ctx.beginPath();
  ctx.arc(256, 520, 110, 0, Math.PI * 2);
  ctx.fill();

  const shinGrad = ctx.createLinearGradient(256, 600, 256, 920);
  shinGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  shinGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
  shinGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.strokeStyle = shinGrad;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(256, 600);
  ctx.lineTo(256, 920);
  ctx.stroke();

  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(0, 0, width, 90);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = 3;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 45, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, 90);
    ctx.lineTo(x + 16, 75);
    ctx.lineTo(x + 32, 90);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Anisotropic Hair Strand Normal Map (髮絲各向異性縱向紋理)
 * Fine longitudinal hair strand micro-grooves with organic variation for silky anime hair sheen.
 */
export function createHairStrandNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      const strand = Math.sin(x * 1.4) * 0.5 + Math.sin(x * 2.9 + 0.7) * 0.3 + (tileableValueNoise(u * 96, v * 12, 96, 9) - 0.5) * 0.45;
      const nx = Math.round(128 + strand * 28);
      const ny = 128;
      const nz = Math.round(255 - Math.abs(strand) * 16);

      data[idx] = Math.max(0, Math.min(255, nx));
      data[idx + 1] = ny;
      data[idx + 2] = Math.max(170, Math.min(255, nz));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.anisotropy = 8;
  return texture;
}

/**
 * Glowing Resonance Star/Mote Sprite Texture (星芒共鳴微粒貼圖)
 */
export function createResonanceParticleTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 1, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(224, 242, 254, 0.85)');
  grad.addColorStop(0.5, 'rgba(96, 165, 250, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 16);
  ctx.lineTo(64, 112);
  ctx.moveTo(16, 64);
  ctx.lineTo(112, 64);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface DynamicSkinShaderUniforms {
  uSssColor: { value: THREE.Color };
  uSssIntensity: { value: number };
  uRimIntensity: { value: number };
  uRimColor: { value: THREE.Color };
  uKeyLightDir: { value: THREE.Vector3 };
  uSkinTint: { value: THREE.Color };
}

/**
 * Injects Living Porcelain-Peach Skin Color Grading, Directional Subsurface Scattering (SSS),
 * Backlit Translucency, and Anti-Overexposure Highlight Compression into dermal materials.
 */
export function applySubsurfaceScatteringShader(
  material: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
  sharedUniforms?: DynamicSkinShaderUniforms,
): DynamicSkinShaderUniforms {
  const uniforms: DynamicSkinShaderUniforms = sharedUniforms || {
    uSssColor: { value: new THREE.Color(0xf4846c) },
    uSssIntensity: { value: 0.72 },
    uRimIntensity: { value: 1.25 },
    uRimColor: { value: new THREE.Color(0x93c5fd) },
    uKeyLightDir: { value: new THREE.Vector3(0.45, 0.7, 0.55).normalize() },
    uSkinTint: { value: new THREE.Color(0xf9dcd0) },
  };

  material.customProgramCacheKey = () => 'wuwa-sss-skin-v5';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSssColor = uniforms.uSssColor;
    shader.uniforms.uSssIntensity = uniforms.uSssIntensity;
    shader.uniforms.uRimIntensity = uniforms.uRimIntensity;
    shader.uniforms.uRimColor = uniforms.uRimColor;
    shader.uniforms.uKeyLightDir = uniforms.uKeyLightDir;
    shader.uniforms.uSkinTint = uniforms.uSkinTint;

    shader.fragmentShader =
      `
      uniform vec3 uSssColor;
      uniform float uSssIntensity;
      uniform float uRimIntensity;
      uniform vec3 uRimColor;
      uniform vec3 uKeyLightDir;
      uniform vec3 uSkinTint;

      vec3 wuwaSafeNormalize(vec3 v, vec3 fallback) {
        float l = dot(v, v);
        return (l > 1e-8 && l < 1e20) ? v * inversesqrt(l) : fallback;
      }

      vec3 wuwaSanitizeColor(vec3 c) {
        return vec3(
          (c.r >= 0.0 && c.r < 1e6) ? c.r : 0.0,
          (c.g >= 0.0 && c.g < 1e6) ? c.g : 0.0,
          (c.b >= 0.0 && c.b < 1e6) ? c.b : 0.0
        );
      }
    ` + shader.fragmentShader;

    // Smooth porcelain-peach dermal base grading without harsh darkening
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      float rawSkinLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      float paleFactor = smoothstep(0.42, 0.94, rawSkinLuma);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uSkinTint, 0.25 + 0.50 * paleFactor);
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      // NaN-safe wrapped-diffuse dermal subsurface scattering for silky shadow transitions
      vec3 sssViewDir = wuwaSafeNormalize(vViewPosition, vec3(0.0, 0.0, 1.0));
      vec3 sssNorm = wuwaSafeNormalize(normal, vec3(0.0, 0.0, 1.0));
      vec3 sssLightDir = wuwaSafeNormalize(uKeyLightDir, vec3(0.4, 0.7, 0.58));

      float sssNdotV = clamp(dot(sssNorm, sssViewDir), 0.0, 1.0);
      float sssNdotL = dot(sssNorm, sssLightDir);

      // Wide wrapped diffuse curve softens hard PBR shadow edges across face, neck & limbs
      float wrappedL = smoothstep(-0.68, 0.62, sssNdotL);
      float terminatorBand = smoothstep(-0.74, 0.34, sssNdotL) * (1.0 - smoothstep(0.08, 0.78, sssNdotL));
      float shadowSide = 1.0 - smoothstep(-0.22, 0.38, sssNdotL);

      float sssFresnel = pow(1.0 - sssNdotV, 2.2);
      float backScatter = pow(clamp(dot(sssViewDir, -sssLightDir), 0.0, 1.0), 2.4) * sssFresnel;

      vec3 sssBase = max(wuwaSanitizeColor(diffuseColor.rgb), vec3(0.22, 0.16, 0.14));
      vec3 wrapFill = sssBase * mix(uSssColor, vec3(1.0), 0.42) * (0.08 * shadowSide + 0.06 * wrappedL) * (0.5 + 0.5 * uSssIntensity);
      vec3 sssBleed = uSssColor * uSssIntensity * (terminatorBand * 0.20 + backScatter * 0.24 + sssFresnel * 0.06) * clamp(dot(sssBase, vec3(0.3, 0.6, 0.1)), 0.25, 0.95);

      // Gentle contoured rim glow
      float rimLightWeight = clamp(0.25 + 0.75 * smoothstep(-0.4, 0.65, -sssNdotL + 0.35), 0.18, 1.0);
      float rimMask = pow(1.0 - sssNdotV, 3.6) * rimLightWeight;
      vec3 animeRim = uRimColor * uRimIntensity * rimMask * 0.11;

      outgoingLight = wuwaSanitizeColor(outgoingLight) + wrapFill + sssBleed + animeRim;

      // Soft-knee HDR highlight compression to keep skin creamy and luminous
      float outLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
      if (outLuma > 0.82) {
        float excess = outLuma - 0.82;
        float compressed = 0.82 + excess / (1.0 + excess * 2.0);
        outgoingLight *= compressed / max(outLuma, 0.0001);
      }
      #include <opaque_fragment>
      `,
    );
  };

  material.needsUpdate = true;
  return uniforms;
}

/**
 * Injects Rich Color Coverage & Anti-Overexposure Highlight Compression into Cloth & Hair materials.
 * Preserves vibrant shadow saturation on silk/costumes and prevents bright white glare under key lights.
 */
export function applyColorCoverageAndRollOffShader(
  material: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
): void {
  material.customProgramCacheKey = () => 'wuwa-color-rolloff-v3';

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      outgoingLight = vec3(
        (outgoingLight.r >= 0.0 && outgoingLight.r < 1e6) ? outgoingLight.r : 0.0,
        (outgoingLight.g >= 0.0 && outgoingLight.g < 1e6) ? outgoingLight.g : 0.0,
        (outgoingLight.b >= 0.0 && outgoingLight.b < 1e6) ? outgoingLight.b : 0.0
      );
      float matLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
      vec3 chroma = outgoingLight - vec3(matLuma);
      outgoingLight = max(vec3(0.0), vec3(matLuma) + chroma * mix(1.10, 1.0, smoothstep(0.15, 0.75, matLuma)));

      if (matLuma > 0.84) {
        float excess = matLuma - 0.84;
        float compressed = 0.84 + excess / (1.0 + excess * 1.9);
        outgoingLight *= compressed / max(matLuma, 0.0001);
      }
      #include <opaque_fragment>
      `,
    );
  };

  material.needsUpdate = true;
}

/**
 * Liturgical White & Slate-Scrollwork Draped Stole Texture for Fleurdelys (芙露德莉斯聖帶)
 * Ivory silk top -> charcoal spiky scrollwork borders -> deep ocean sapphire gradient -> gold star filigree
 */
export function createFleurdelysStoleTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base silk vertical gradient (pearlescent ivory -> ice mist -> royal ocean sapphire)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0.0, '#f8fafc');
  bg.addColorStop(0.54, '#eef3f9');
  bg.addColorStop(0.72, '#93c5fd');
  bg.addColorStop(0.86, '#1d4ed8');
  bg.addColorStop(1.0, '#091124');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle woven silk vertical sheen streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 2;
  for (let x = 24; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Dark slate spiky thorn scrollwork along left and right edges (matching cosplay & game model)
  const drawBorderScroll = (side: 'left' | 'right') => {
    ctx.save();
    if (side === 'right') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.fillStyle = 'rgba(38, 49, 68, 0.9)';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.lineWidth = 2.5;

    ctx.fillRect(0, 0, 24, h);
    for (let y = 32; y < h - 75; y += 76) {
      ctx.beginPath();
      ctx.moveTo(22, y);
      ctx.bezierCurveTo(96, y + 10, 134, y + 26, 70, y + 38);
      ctx.bezierCurveTo(152, y + 50, 120, y + 68, 22, y + 74);
      ctx.closePath();
      ctx.fill();

      // Sharp thorn spur
      ctx.beginPath();
      ctx.moveTo(46, y + 18);
      ctx.lineTo(150, y + 4);
      ctx.lineTo(80, y + 32);
      ctx.closePath();
      ctx.fill();
    }

    // Gold inner filigree pinstripe
    ctx.strokeStyle = 'rgba(245, 198, 92, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, h - 32);
    ctx.stroke();
    ctx.restore();
  };

  drawBorderScroll('left');
  drawBorderScroll('right');

  // Top shoulder eyelet emblem circle (Image 4)
  ctx.save();
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w / 2, 54, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245, 198, 92, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, 54, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Centerline repeating gothic diamond-spire embroidery
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.78)';
  ctx.fillStyle = 'rgba(51, 65, 85, 0.82)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2, 98);
  ctx.lineTo(w / 2, h - 36);
  ctx.stroke();

  // Subtle jacquard damask diamond weave across ivory upper stole
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < h * 0.72; y += 44) {
    for (let x = 44; x < w - 44; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x, y + 14);
      ctx.lineTo(x - 14, y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  for (let y = 148; y < h - 130; y += 98) {
    ctx.beginPath();
    ctx.moveTo(w / 2, y - 34);
    ctx.lineTo(w / 2 + 25, y);
    ctx.lineTo(w / 2, y + 34);
    ctx.lineTo(w / 2 - 25, y);
    ctx.closePath();
    ctx.fill();

    // Inner gold diamond highlight inside gothic spire
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, y - 18);
    ctx.lineTo(w / 2 + 12, y);
    ctx.lineTo(w / 2, y + 18);
    ctx.lineTo(w / 2 - 12, y);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(51, 65, 85, 0.82)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 50, y - 5);
    ctx.lineTo(w / 2 + 50, y - 5);
    ctx.lineTo(w / 2, y + 11);
    ctx.closePath();
    ctx.fill();
  }

  // Lower sapphire section 4-point star & gold crest embroidery
  const drawStar = (cx: number, cy: number, r: number, color: string) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Celestial halo ring behind bottom crest
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.81, 62, 0, Math.PI * 2);
  ctx.stroke();

  drawStar(w / 2, h * 0.81, 56, 'rgba(224, 242, 254, 0.96)');
  drawStar(w / 2, h * 0.81, 32, '#fbbf24');
  drawStar(w * 0.28, h * 0.9, 22, 'rgba(255, 255, 255, 0.86)');
  drawStar(w * 0.72, h * 0.9, 22, 'rgba(255, 255, 255, 0.86)');

  // Delicate stardust motes in sapphire gradient section
  ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
  for (let i = 0; i < 36; i++) {
    const sx = 54 + ((i * 73) % (w - 108));
    const sy = h * 0.68 + ((i * 59) % (h * 0.27));
    const sr = 1.2 + (i % 3) * 0.9;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Gold filigree double-line trim at bottom tip
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(28, h - 24);
  ctx.lineTo(w - 28, h - 24);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, h - 36);
  ctx.lineTo(w - 36, h - 36);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Midnight-Indigo Obsidian Jacquard Damask Silk Texture for Fleurdelys Bodice, Corset & Gauntlets
 */
export function createFleurdelysBodiceTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#141c30');
  grad.addColorStop(0.42, '#1c2640');
  grad.addColorStop(0.82, '#131a2d');
  grad.addColorStop(1.0, '#0e1424');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Fine micro-woven diagonal silk twill sheen
  ctx.strokeStyle = 'rgba(148, 175, 212, 0.055)';
  ctx.lineWidth = 1.5;
  for (let i = -h; i < w + h; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i + h, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }

  // Rich gothic fleur-de-lis & diamond jacquard damask brocade
  const step = 128;
  for (let y = 0; y <= h; y += step) {
    for (let x = 0; x <= w; x += step) {
      const ox = (Math.floor(y / step) % 2) * (step / 2);
      const cx = x + ox;
      const cy = y;

      // Outer tonal damask ogee frame
      ctx.strokeStyle = 'rgba(96, 136, 198, 0.16)';
      ctx.fillStyle = 'rgba(125, 166, 224, 0.085)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 42);
      ctx.quadraticCurveTo(cx + 12, cy - 12, cx + 34, cy);
      ctx.quadraticCurveTo(cx + 12, cy + 12, cx, cy + 42);
      ctx.quadraticCurveTo(cx - 12, cy + 12, cx - 34, cy);
      ctx.quadraticCurveTo(cx - 12, cy - 12, cx, cy - 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner etched gothic trefoil petals
      ctx.strokeStyle = 'rgba(186, 216, 255, 0.14)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 24);
      ctx.quadraticCurveTo(cx + 8, cy - 8, cx + 18, cy);
      ctx.quadraticCurveTo(cx + 8, cy + 8, cx, cy + 24);
      ctx.quadraticCurveTo(cx - 8, cy + 8, cx - 18, cy);
      ctx.quadraticCurveTo(cx - 8, cy - 8, cx, cy - 24);
      ctx.closePath();
      ctx.stroke();

      // Delicate woven gold-thread diamond & center bead
      ctx.fillStyle = 'rgba(247, 207, 116, 0.24)';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(247, 207, 116, 0.16)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Tailored corset vertical boning channels with subtle seam shadow + satin ridge highlight
  for (let x = 64; x < w; x += 128) {
    ctx.strokeStyle = 'rgba(6, 10, 20, 0.34)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 3, 0);
    ctx.lineTo(x - 3, h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 236, 252, 0.11)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 1, 0);
    ctx.lineTo(x + 1, h);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Matching Linear Roughness Map for Fleurdelys Obsidian Jacquard Bodice
 * Glossy satin brocade motifs & boning ridges (low roughness ~0.26) contrasted against matte-velvet silk ground (~0.62)
 */
export function createFleurdelysBodiceRoughnessMap(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Matte-satin ground cloth (~0.62 roughness)
  ctx.fillStyle = 'rgb(158, 158, 158)';
  ctx.fillRect(0, 0, w, h);

  // Subtle woven twill micro-variation
  ctx.strokeStyle = 'rgba(130, 130, 130, 0.38)';
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  // Glossy raised jacquard brocade motifs (~0.30 roughness) + crisp gold bead (~0.18 roughness)
  const step = 64;
  for (let y = 0; y <= h; y += step) {
    for (let x = 0; x <= w; x += step) {
      const ox = (Math.floor(y / step) % 2) * (step / 2);
      const cx = x + ox;
      const cy = y;

      ctx.fillStyle = 'rgb(84, 84, 84)';
      ctx.strokeStyle = 'rgb(64, 64, 64)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 21);
      ctx.quadraticCurveTo(cx + 6, cy - 6, cx + 17, cy);
      ctx.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 21);
      ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 17, cy);
      ctx.quadraticCurveTo(cx - 6, cy - 6, cx, cy - 21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgb(44, 44, 44)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Sleek satin boning seam channels
  for (let x = 32; x < w; x += 64) {
    ctx.fillStyle = 'rgb(188, 188, 188)';
    ctx.fillRect(x - 3, 0, 2, h);
    ctx.fillStyle = 'rgb(76, 76, 76)';
    ctx.fillRect(x, 0, 2.5, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Matching Linear Roughness Map for Fleurdelys Liturgical Draped Stole
 * Matte-pearlescent silk body (~0.56) contrasted with low-roughness satin borders & metallic gold hem embroidery (~0.20)
 */
export function createFleurdelysStoleRoughnessMap(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base ivory silk-crepe roughness (~0.56 -> 0.44 near sapphire hem)
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0.0, 'rgb(146, 146, 146)');
  bg.addColorStop(0.65, 'rgb(138, 138, 138)');
  bg.addColorStop(1.0, 'rgb(108, 108, 108)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Vertical silk sheen threads
  ctx.strokeStyle = 'rgba(116, 116, 116, 0.45)';
  ctx.lineWidth = 2;
  for (let x = 24; x < w; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Glossy embroidered charcoal scrollwork side trims (~0.28)
  ctx.fillStyle = 'rgb(74, 74, 74)';
  ctx.fillRect(0, 0, 28, h);
  ctx.fillRect(w - 28, 0, 28, h);

  // Crisp low-roughness metallic gold thread border & lower hem filigree (~0.18)
  ctx.fillStyle = 'rgb(46, 46, 46)';
  ctx.fillRect(28, 0, 6, h);
  ctx.fillRect(w - 34, 0, 6, h);
  ctx.fillRect(0, h - 78, w, 12);
  ctx.fillRect(0, h - 28, w, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Matching Linear Roughness Map for Fleurdelys Pleated Hip-Skirt
 * Alternating satin pleat ridges (~0.32) and shadowed pleat valleys (~0.64) + glossy gold hem border (~0.20)
 */
export function createFleurdelysSkirtRoughnessMap(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(142, 142, 142)';
  ctx.fillRect(0, 0, w, h);

  const pleats = 24;
  const pw = w / pleats;
  for (let i = 0; i < pleats; i++) {
    const x0 = i * pw;
    const g = ctx.createLinearGradient(x0, 0, x0 + pw, 0);
    g.addColorStop(0.0, 'rgb(168, 168, 168)');
    g.addColorStop(0.35, 'rgb(96, 96, 96)');
    g.addColorStop(0.65, 'rgb(112, 112, 112)');
    g.addColorStop(1.0, 'rgb(168, 168, 168)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, pw, h);
  }

  // Glossy embroidered hem trim
  ctx.fillStyle = 'rgb(52, 52, 52)';
  ctx.fillRect(0, h - 42, w, 14);
  ctx.fillRect(0, h - 18, w, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Seamless Fine Brushed Metal Micro-Normal Map for Gold Filigree & Silver Armor
 * Adds artisanal anisotropic grain so studio lights produce crisp jewelry & forged-metal highlights
 */
export function createBrushedMetalNormalMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const hField = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    // Coherent horizontal brushed-metal grooves + subtle organic forged-metal undulation
    const rowNoise =
      Math.sin(y * 0.41) * 0.32 +
      Math.sin(y * 1.13 + 1.7) * 0.28 +
      Math.sin(y * 2.71 + 0.5) * 0.2 +
      Math.cos(y * 5.37) * 0.14;
    for (let x = 0; x < size; x++) {
      const fineStreak =
        Math.sin(x * 0.045 + y * 0.85) * 0.18 +
        Math.cos(x * 0.11 - y * 1.9) * 0.12 +
        Math.sin((x + y * 3) * 0.024) * 0.15;
      hField[y * size + x] = rowNoise + fineStreak;
    }
  }

  const strength = 1.6;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const dX = (hField[y * size + xp] - hField[y * size + xm]) * strength;
      const dY = (hField[yp * size + x] - hField[ym * size + x]) * strength;
      const len = Math.sqrt(dX * dX + dY * dY + 1.0);
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((-dX / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((-dY / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Seamless Brushed Metal Linear Roughness Map (0.14..0.34 micro-variation for authentic gold/silver luster)
 */
export function createBrushedMetalRoughnessMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(64, 64, 64)';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const v = Math.round(
      54 +
        Math.sin(y * 0.37) * 14 +
        Math.cos(y * 1.19) * 10 +
        Math.sin(y * 2.83) * 8,
    );
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 2);
  }

  // Subtle artisanal polish sheen streaks
  for (let i = 0; i < 64; i++) {
    const y = (i * 29) % size;
    const x = (i * 97) % size;
    const w = 90 + (i % 5) * 42;
    const bright = i % 2 === 0 ? 38 : 88;
    ctx.fillStyle = `rgba(${bright},${bright},${bright},0.35)`;
    ctx.fillRect(x, y, w, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 8;
  return tex;
}

/**
 * Soft Grounded Contact Shadow Texture for Studio Plinth (grounds heels & stance with ambient occlusion)
 */
export function createStudioContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size * 0.46);
  grad.addColorStop(0.0, 'rgba(2, 6, 18, 0.72)');
  grad.addColorStop(0.28, 'rgba(3, 8, 22, 0.48)');
  grad.addColorStop(0.62, 'rgba(4, 10, 28, 0.18)');
  grad.addColorStop(1.0, 'rgba(4, 10, 28, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sheer Pearlescent-to-Starry-Sapphire Cathedral Veil Texture with Gothic Rose-Window Gold Lace Hem
 */
export function createFleurdelysCathedralVeilTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Ethereal vertical gradient: pearlescent ivory -> pale ice mist -> glowing azure -> deep celestial sapphire
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0.0, '#fafdff');
  bg.addColorStop(0.35, '#eef6ff');
  bg.addColorStop(0.62, '#bae6fd');
  bg.addColorStop(0.84, '#2563eb');
  bg.addColorStop(1.0, '#13204a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Gossamer vertical silk threads
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 1.5;
  for (let x = 16; x < w; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Delicate silver-gold filigree piping along both outer edges
  [18, w - 18].forEach((ex) => {
    ctx.strokeStyle = 'rgba(245, 198, 92, 0.92)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(ex, 0);
    ctx.lineTo(ex, h);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex + (ex < w / 2 ? 10 : -10), 0);
    ctx.lineTo(ex + (ex < w / 2 ? 10 : -10), h);
    ctx.stroke();
  });

  // Gothic arched filigree embroidery & constellation stardust across lower half
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.76)';
  ctx.lineWidth = 2.5;
  for (let x = 32; x < w - 32; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, h - 22);
    ctx.quadraticCurveTo(x + 32, h - 125, x + 64, h - 22);
    ctx.stroke();

    // Inner gothic quatrefoil circle
    ctx.beginPath();
    ctx.arc(x + 32, h - 62, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radiant 4-point celestial stars & stardust across azure-sapphire train
  const drawSparkle = (cx: number, cy: number, r: number, col: string) => {
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.16, cy - r * 0.16, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.16, cy + r * 0.16, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.16, cy + r * 0.16, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.16, cy - r * 0.16, cx, cy - r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawSparkle(w * 0.5, h * 0.78, 44, 'rgba(240, 249, 255, 0.92)');
  drawSparkle(w * 0.5, h * 0.78, 22, '#fde047');
  drawSparkle(w * 0.25, h * 0.68, 20, 'rgba(224, 242, 254, 0.85)');
  drawSparkle(w * 0.75, h * 0.68, 20, 'rgba(224, 242, 254, 0.85)');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let i = 0; i < 65; i++) {
    const sx = 36 + ((i * 89) % (w - 72));
    const sy = h * 0.45 + ((i * 131) % (h * 0.5));
    const sr = 1.0 + (i % 4) * 0.75;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Double gold hem border
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(16, h - 18);
  ctx.lineTo(w - 16, h - 18);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Obsidian Satin Mini-Skirt Texture with Jacquard Sheen, Sapphire Glow & Gold Star Lace Filigree Hem Trim
 */
export function createFleurdelysSkirtTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#161e32');
  grad.addColorStop(0.58, '#202b47');
  grad.addColorStop(0.84, '#1a2748');
  grad.addColorStop(1.0, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle vertical pleated satin sheen & tonal pinstripe
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.11)';
  ctx.lineWidth = 2;
  for (let x = 0; x < w; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Subtle azure inner hem aura above gold trim
  const hemGlow = ctx.createLinearGradient(0, h - 115, 0, h - 22);
  hemGlow.addColorStop(0, 'rgba(56, 189, 248, 0)');
  hemGlow.addColorStop(0.65, 'rgba(37, 99, 235, 0.24)');
  hemGlow.addColorStop(1, 'rgba(56, 189, 248, 0.14)');
  ctx.fillStyle = hemGlow;
  ctx.fillRect(0, h - 115, w, 93);

  // Gold double-line & Gothic pointed-arch lattice star embroidery near skirt hem
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, h - 32);
  ctx.lineTo(w, h - 32);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 22);
  ctx.lineTo(w, h - 22);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
  ctx.lineWidth = 2.5;
  for (let x = 0; x < w; x += 42.66) {
    ctx.beginPath();
    ctx.moveTo(x, h - 32);
    ctx.quadraticCurveTo(x + 12, h - 68, x + 21.33, h - 82);
    ctx.quadraticCurveTo(x + 30, h - 68, x + 42.66, h - 32);
    ctx.stroke();

    // 4-point mini star inside each Gothic arch
    const sx = x + 21.33;
    const sy = h - 52;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 9);
    ctx.lineTo(sx + 3, sy);
    ctx.lineTo(sx, sy + 9);
    ctx.lineTo(sx - 3, sy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx - 7, sy);
    ctx.lineTo(sx, sy + 2.5);
    ctx.lineTo(sx + 7, sy);
    ctx.lineTo(sx, sy - 2.5);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function drawSourceImageSafely(
  ctx: CanvasRenderingContext2D,
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  w: number,
  h: number,
  fallbackFill?: string,
): boolean {
  if (fallbackFill) {
    ctx.fillStyle = fallbackFill;
    ctx.fillRect(0, 0, w, h);
  }
  if (!sourceImage) return false;
  const isHtmlImg = typeof HTMLImageElement !== 'undefined' && sourceImage instanceof HTMLImageElement;
  if (isHtmlImg && (!sourceImage.complete || sourceImage.naturalWidth === 0 || sourceImage.naturalHeight === 0)) {
    return false;
  }
  const srcW = (sourceImage as any).naturalWidth || (sourceImage as any).width || 0;
  const srcH = (sourceImage as any).naturalHeight || (sourceImage as any).height || 0;
  if (srcW <= 0 || srcH <= 0) {
    return false;
  }
  try {
    ctx.drawImage(sourceImage as CanvasImageSource, 0, 0, w, h);
    return true;
  } catch {
    return false;
  }
}

/**
 * Processes base VRoid Face_00 image into Fleurdelys's warm porcelain complexion
 * with delicate peachy-rose under-eye/cheek blush, sculpted peach lips (exact v=0.749 UV!), & forehead pearl diamond.
 */
export function createFleurdelysFaceTexture(
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): THREE.CanvasTexture {
  const w = Math.max(1, (sourceImage as any)?.naturalWidth || (sourceImage as any)?.width || 1024);
  const h = Math.max(1, (sourceImage as any)?.naturalHeight || (sourceImage as any)?.height || 1024);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  drawSourceImageSafely(ctx, sourceImage, w, h, '#fce9e0');

  // 1. Radiant, crystal-clear luminous porcelain-ivory complexion (clean, youthful, glowing — zero muddy gray/brown cast)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 241, 236, 0.28)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const drawFeatheredTint = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rCol: number,
    gCol: number,
    bCol: number,
    alpha: number,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha})`);
    g.addColorStop(0.42, `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha * 0.52})`);
    g.addColorStop(0.76, `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha * 0.16})`);
    g.addColorStop(1, `rgba(${rCol}, ${gCol}, ${bCol}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 2. Delicate, Flattering 3-Zone Beauty Skin Luminosity (soft ivory forehead, rosy-peach mid-face, silky pearl chin)
  drawFeatheredTint(w * 0.5, h * 0.37, w * 0.22, h * 0.13, 255, 244, 232, 0.18);
  drawFeatheredTint(w * 0.5, h * 0.60, w * 0.28, h * 0.12, 248, 184, 184, 0.1);
  drawFeatheredTint(w * 0.5, h * 0.80, w * 0.18, h * 0.1, 255, 244, 240, 0.14);

  // 3. Ultra-fine sheer dermal translucency grain (subtle living warmth, zero dark spots or muddy blotches!)
  ctx.save();
  let seed = 48271;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1200; i++) {
    const px = w * (0.26 + rand() * 0.48);
    const py = h * (0.3 + rand() * 0.54);
    if (Math.abs(px - w * 0.5) < w * 0.025 && Math.abs(py - h * 0.342) < h * 0.05) continue;
    const isPearl = rand() > 0.5;
    const r = (0.6 + rand() * 1.4) * (w / 1024);
    ctx.fillStyle = isPearl
      ? `rgba(255, 246, 242, ${0.02 + rand() * 0.022})`
      : `rgba(238, 182, 178, ${0.014 + rand() * 0.018})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Alluring Editorial Peach-Rose & Soft Plum-Mauve Eye Makeup + Luminous Pearlescent Aegyo-Sal (絕美眼妝與臥蠶提亮)
  drawFeatheredTint(w * 0.352, h * 0.498, w * 0.068, h * 0.032, 198, 128, 148, 0.22);
  drawFeatheredTint(w * 0.648, h * 0.498, w * 0.068, h * 0.032, 198, 128, 148, 0.22);
  drawFeatheredTint(w * 0.342, h * 0.508, w * 0.052, h * 0.018, 214, 132, 156, 0.24);
  drawFeatheredTint(w * 0.658, h * 0.508, w * 0.052, h * 0.018, 214, 132, 156, 0.24);
  // Sultry soft berry-plum outer corner wing shadow
  drawFeatheredTint(w * 0.298, h * 0.548, w * 0.034, h * 0.014, 148, 86, 114, 0.28);
  drawFeatheredTint(w * 0.702, h * 0.548, w * 0.034, h * 0.014, 148, 86, 114, 0.28);
  // Luminous champagne-pearl inner eye corner & cute plump aegyo-sal shimmer (提亮眼神與水靈感)
  drawFeatheredTint(w * 0.398, h * 0.552, w * 0.016, h * 0.009, 255, 250, 246, 0.48);
  drawFeatheredTint(w * 0.602, h * 0.552, w * 0.016, h * 0.009, 255, 250, 246, 0.48);
  drawFeatheredTint(w * 0.354, h * 0.566, w * 0.036, h * 0.0095, 255, 245, 242, 0.34);
  drawFeatheredTint(w * 0.646, h * 0.566, w * 0.036, h * 0.0095, 255, 245, 242, 0.34);
  drawFeatheredTint(w * 0.354, h * 0.577, w * 0.032, h * 0.006, 186, 128, 142, 0.14);
  drawFeatheredTint(w * 0.646, h * 0.577, w * 0.032, h * 0.006, 186, 128, 142, 0.14);

  // Delicate soft double-eyelid crease shadow (refined & natural)
  ctx.save();
  ctx.shadowColor = 'rgba(138, 84, 98, 0.34)';
  ctx.shadowBlur = w * 0.005;
  ctx.strokeStyle = 'rgba(148, 92, 104, 0.34)';
  ctx.lineWidth = Math.max(1.1, w * 0.0016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.402, h * 0.515);
  ctx.quadraticCurveTo(w * 0.348, h * 0.492, w * 0.294, h * 0.513);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.598, h * 0.515);
  ctx.quadraticCurveTo(w * 0.652, h * 0.492, w * 0.706, h * 0.513);
  ctx.stroke();
  ctx.restore();

  // 5. Dreamy Rosy-Peach Under-Eye & Apple-Cheek Blush (清透微醺桃粉腮紅，減齡又性感)
  drawFeatheredTint(w * 0.354, h * 0.598, w * 0.068, h * 0.028, 246, 138, 154, 0.26);
  drawFeatheredTint(w * 0.646, h * 0.598, w * 0.068, h * 0.028, 246, 138, 154, 0.26);
  drawFeatheredTint(w * 0.358, h * 0.632, w * 0.086, h * 0.042, 242, 152, 162, 0.18);
  drawFeatheredTint(w * 0.642, h * 0.632, w * 0.086, h * 0.042, 242, 152, 162, 0.18);
  // Subtle radiant cheekbone highlight
  drawFeatheredTint(w * 0.362, h * 0.606, w * 0.032, h * 0.015, 255, 250, 248, 0.28);
  drawFeatheredTint(w * 0.638, h * 0.606, w * 0.032, h * 0.015, 255, 250, 248, 0.28);

  // 6. Exquisite Dainty Nose Contour & Luminous Pearl Tip Highlight (精緻小巧挺鼻，乾淨無髒影)
  drawFeatheredTint(w * 0.478, h * 0.604, w * 0.013, h * 0.046, 188, 144, 144, 0.14);
  drawFeatheredTint(w * 0.522, h * 0.604, w * 0.013, h * 0.046, 188, 144, 144, 0.14);
  drawFeatheredTint(w * 0.492, h * 0.668, w * 0.0055, h * 0.0032, 136, 94, 98, 0.22);
  drawFeatheredTint(w * 0.508, h * 0.668, w * 0.0055, h * 0.0032, 136, 94, 98, 0.22);
  drawFeatheredTint(w * 0.5, h * 0.608, w * 0.007, h * 0.042, 255, 252, 248, 0.42);
  drawFeatheredTint(w * 0.5, h * 0.654, w * 0.0105, h * 0.0085, 255, 250, 246, 0.44);
  drawFeatheredTint(w * 0.5, h * 0.658, w * 0.018, h * 0.01, 246, 166, 170, 0.14); // Cute rosy nose-tip warmth

  // 7. Irresistible Juicy Glossy Coral-Rose M-Shaped Lips with Subtle Confident Smile & Wet Shine (絕美微翹果凍水光玫瑰唇)
  drawFeatheredTint(w * 0.489, h * 0.737, w * 0.019, h * 0.0105, 234, 96, 118, 0.62);
  drawFeatheredTint(w * 0.511, h * 0.737, w * 0.019, h * 0.0105, 234, 96, 118, 0.62);
  drawFeatheredTint(w * 0.5, h * 0.757, w * 0.028, h * 0.0155, 236, 94, 116, 0.7);
  drawFeatheredTint(w * 0.5, h * 0.75, w * 0.02, h * 0.0068, 192, 54, 82, 0.5);
  // Subtle upturned smile dimples at lip corners
  drawFeatheredTint(w * 0.474, h * 0.747, w * 0.0065, h * 0.0042, 152, 76, 90, 0.28);
  drawFeatheredTint(w * 0.526, h * 0.747, w * 0.0065, h * 0.0042, 152, 76, 90, 0.28);
  // Soft philtrum pearl highlight & chin cleft shadow below plump lower lip
  drawFeatheredTint(w * 0.5, h * 0.727, w * 0.0085, h * 0.0042, 255, 250, 248, 0.44);
  drawFeatheredTint(w * 0.5, h * 0.777, w * 0.019, h * 0.0065, 168, 114, 122, 0.22);
  // Bright dewy wet-gloss catchlights on lower lip & Cupid's bow
  drawFeatheredTint(w * 0.491, h * 0.757, w * 0.0095, h * 0.0045, 255, 246, 248, 0.72);
  drawFeatheredTint(w * 0.509, h * 0.757, w * 0.0065, h * 0.0034, 255, 246, 248, 0.56);

  // Soft rosy chin cushion & luminous highlight
  drawFeatheredTint(w * 0.5, h * 0.804, w * 0.03, h * 0.017, 246, 186, 186, 0.14);
  drawFeatheredTint(w * 0.5, h * 0.806, w * 0.015, h * 0.0095, 255, 250, 246, 0.28);

  // Iconic luminous white-gold vertical forehead diamond right below horn (measured UV u=0.500, v=0.3413) with filigree halo
  ctx.save();
  drawFeatheredTint(w * 0.5, h * 0.344, w * 0.024, h * 0.038, 255, 242, 200, 0.38);
  ctx.strokeStyle = 'rgba(245, 198, 92, 0.78)';
  ctx.lineWidth = Math.max(1.4, w * 0.0018);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.302);
  ctx.lineTo(w * 0.511, h * 0.342);
  ctx.lineTo(w * 0.5, h * 0.386);
  ctx.lineTo(w * 0.489, h * 0.342);
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 254, 246, 0.99)';
  ctx.shadowColor = 'rgba(251, 191, 36, 0.82)';
  ctx.shadowBlur = w * 0.0065;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.31);
  ctx.lineTo(w * 0.5075, h * 0.342);
  ctx.lineTo(w * 0.5, h * 0.378);
  ctx.lineTo(w * 0.4925, h * 0.342);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates a UV-aligned 1024x1024 Semi-Realistic Facial Micro-Pore, Eyelid, Nose & Lip-Crease Normal Map
 * so studio lighting catches real 3D dermal pores, nasal wings, and vertical lip texture instead of flat anime plastic.
 */
export function createFleurdelysFaceNormalMap(): THREE.CanvasTexture {
  const size = 1024;
  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hctx = heightCanvas.getContext('2d')!;
  hctx.fillStyle = '#808080';
  hctx.fillRect(0, 0, size, size);

  let seed = 91823;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 6500; i++) {
    const px = size * (0.18 + rand() * 0.64);
    const py = size * (0.24 + rand() * 0.64);
    const nearNoseOrCheek = Math.hypot((px - size * 0.5) / (size * 0.2), (py - size * 0.62) / (size * 0.16)) < 1.1;
    const r = nearNoseOrCheek ? 0.8 + rand() * 1.1 : 0.7 + rand() * 1.3;
    const isDimple = rand() > 0.35;
    hctx.fillStyle = isDimple
      ? `rgba(92, 92, 92, ${nearNoseOrCheek ? 0.24 : 0.14})`
      : `rgba(164, 164, 164, ${nearNoseOrCheek ? 0.18 : 0.1})`;
    hctx.beginPath();
    hctx.arc(px, py, r, 0, Math.PI * 2);
    hctx.fill();
  }

  hctx.save();
  hctx.filter = 'blur(3px)';
  hctx.strokeStyle = 'rgba(60, 60, 60, 0.55)';
  hctx.lineWidth = 3.5;
  hctx.beginPath();
  hctx.moveTo(size * 0.402, size * 0.515);
  hctx.quadraticCurveTo(size * 0.348, size * 0.491, size * 0.294, size * 0.513);
  hctx.stroke();
  hctx.beginPath();
  hctx.moveTo(size * 0.598, size * 0.515);
  hctx.quadraticCurveTo(size * 0.652, size * 0.491, size * 0.706, size * 0.513);
  hctx.stroke();

  const drawHeightGlow = (cx: number, cy: number, rx: number, ry: number, lum: number, alpha: number) => {
    hctx.save();
    hctx.translate(cx, cy);
    hctx.scale(1, ry / rx);
    const g = hctx.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, `rgba(${lum}, ${lum}, ${lum}, ${alpha})`);
    g.addColorStop(1, `rgba(${lum}, ${lum}, ${lum}, 0)`);
    hctx.fillStyle = g;
    hctx.beginPath();
    hctx.arc(0, 0, rx, 0, Math.PI * 2);
    hctx.fill();
    hctx.restore();
  };
  drawHeightGlow(size * 0.49, size * 0.738, size * 0.018, size * 0.009, 210, 0.6);
  drawHeightGlow(size * 0.51, size * 0.738, size * 0.018, size * 0.009, 210, 0.6);
  drawHeightGlow(size * 0.5, size * 0.758, size * 0.025, size * 0.014, 224, 0.68);
  hctx.restore();

  hctx.save();
  hctx.strokeStyle = 'rgba(56, 56, 56, 0.48)';
  hctx.lineWidth = 1.4;
  for (let li = -8; li <= 8; li++) {
    const lx = size * (0.5 + li * 0.0028);
    const lLen = (1 - Math.abs(li) / 10) * size * 0.017;
    hctx.beginPath();
    hctx.moveTo(lx, size * 0.747 - lLen * 0.4);
    hctx.quadraticCurveTo(lx + li * 0.4, size * 0.752, lx, size * 0.755 + lLen * 0.65);
    hctx.stroke();
  }
  hctx.restore();

  const src = hctx.getImageData(0, 0, size, size).data;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d')!;
  const out = nctx.createImageData(size, size);
  const strength = 2.6;

  for (let y = 0; y < size; y++) {
    const ym = Math.max(0, y - 1);
    const yp = Math.min(size - 1, y + 1);
    for (let x = 0; x < size; x++) {
      const xm = Math.max(0, x - 1);
      const xp = Math.min(size - 1, x + 1);
      const hL = src[(y * size + xm) * 4] / 255;
      const hR = src[(y * size + xp) * 4] / 255;
      const hU = src[(ym * size + x) * 4] / 255;
      const hD = src[(yp * size + x) * 4] / 255;
      const dx = (hL - hR) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;
      const inv = 1.0 / Math.hypot(dx, dy, dz);
      const idx = (y * size + x) * 4;
      out.data[idx] = Math.round((dx * inv * 0.5 + 0.5) * 255);
      out.data[idx + 1] = Math.round((dy * inv * 0.5 + 0.5) * 255);
      out.data[idx + 2] = Math.round((dz * inv * 0.5 + 0.5) * 255);
      out.data[idx + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates a UV-aligned 512x512 Human Facial Roughness Map (真實臉部分區光澤度貼圖):
 * Glossy moist lips & inner eye corners (~0.20), satin T-zone/nose/cheekbones (~0.36), soft matte outer cheeks/jaw (~0.54).
 */
export function createFleurdelysFaceRoughnessMap(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(134, 134, 134)';
  ctx.fillRect(0, 0, size, size);

  const paintZone = (cx: number, cy: number, rx: number, ry: number, val: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, `rgba(${val}, ${val}, ${val}, ${alpha})`);
    g.addColorStop(1, `rgba(${val}, ${val}, ${val}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  paintZone(size * 0.5, size * 0.39, size * 0.14, size * 0.08, 96, 0.72);
  paintZone(size * 0.5, size * 0.61, size * 0.025, size * 0.06, 82, 0.85);
  paintZone(size * 0.5, size * 0.654, size * 0.022, size * 0.018, 66, 0.9);
  paintZone(size * 0.36, size * 0.61, size * 0.068, size * 0.036, 92, 0.7);
  paintZone(size * 0.64, size * 0.61, size * 0.068, size * 0.036, 92, 0.7);
  paintZone(size * 0.5, size * 0.804, size * 0.032, size * 0.02, 92, 0.72);
  paintZone(size * 0.5, size * 0.752, size * 0.03, size * 0.018, 46, 0.95);
  paintZone(size * 0.398, size * 0.552, size * 0.016, size * 0.012, 58, 0.85);
  paintZone(size * 0.602, size * 0.552, size * 0.016, size * 0.012, 58, 0.85);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Processes base VRoid Body_00 image into seamless porcelain Fleurdelys skin
 * (removes default stockings on lower legs/ankles with smooth feathering & paints pale-blue crystalline laurel tattoo on right upper arm).
 */
export function createFleurdelysBodyTexture(
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): THREE.CanvasTexture {
  const w = Math.max(1, (sourceImage as any)?.naturalWidth || (sourceImage as any)?.width || 1024);
  const h = Math.max(1, (sourceImage as any)?.naturalHeight || (sourceImage as any)?.height || 1024);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const drew = drawSourceImageSafely(ctx, sourceImage, w, h, '#ffe8dc');
  if (drew) {
    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample neck/upper chest porcelain skin tone from (0.5w, 0.17h)
      const sx = Math.floor(w * 0.5);
      const sy = Math.floor(h * 0.17);
      const sIdx = (sy * w + sx) * 4;
      const skinR = data[sIdx] > 200 ? data[sIdx] : 255;
      const skinG = data[sIdx + 1] > 180 ? data[sIdx + 1] : 232;
      const skinB = data[sIdx + 2] > 165 ? data[sIdx + 2] : 216;

      // Smoothly feather out default lower-leg stockings (y = 0.46h..0.56h fade, 0.56h..1.0h full blend) so thighs have zero UV seam
      const yFadeStart = Math.floor(h * 0.46);
      const yFadeEnd = Math.floor(h * 0.56);
      const ySpan = Math.max(1, yFadeEnd - yFadeStart);
      for (let y = yFadeStart; y < h; y++) {
        const yNorm = Math.min(1, Math.max(0, (y - yFadeStart) / ySpan));
        const yWeight = yNorm * yNorm * (3 - 2 * yNorm);
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] <= 20) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const warmth = r - b;
          const coolness = Math.min(1, Math.max(0, (28 - warmth) / 14));
          const paleFabric = r > 218 && b > 204 ? Math.min(1, Math.max(0, (32 - warmth) / 10)) : 0;
          const blend = yWeight * Math.max(coolness, paleFabric);
          if (blend > 0.01) {
            const lumRatio = Math.max(0.88, Math.min(1.02, (r * 0.3 + g * 0.59 + b * 0.11) / 242));
            const targetR = Math.min(255, skinR * lumRatio);
            const targetG = Math.min(255, skinG * lumRatio);
            const targetB = Math.min(255, skinB * lumRatio);
            data[i] = Math.round(r + (targetR - r) * blend);
            data[i + 1] = Math.round(g + (targetG - g) * blend);
            data[i + 2] = Math.round(b + (targetB - b) * blend);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch {
      // Security or image readback blocked; keep drawn base pixels cleanly
    }
  }

  // Subtle sensual living dermal warmth on shoulders, collarbones & decolletage
  const paintBodyWarmth = (cx: number, cy: number, rx: number, ry: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
    g.addColorStop(0, `rgba(240, 162, 162, ${alpha})`);
    g.addColorStop(0.6, `rgba(244, 178, 174, ${alpha * 0.45})`);
    g.addColorStop(1, 'rgba(244, 178, 174, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  paintBodyWarmth(w * 0.5, h * 0.25, w * 0.14, h * 0.055, 0.14); // Soft collarbone & upper chest blush
  paintBodyWarmth(w * 0.5, h * 0.31, w * 0.09, h * 0.06, 0.16); // Warm cleavage depth glow

  // Paint delicate ice-blue laurel vine tattoo centered cleanly on outer right bicep (uvU: 0.02..0.22, uvV: 0.185..0.215)
  ctx.save();
  ctx.strokeStyle = 'rgba(96, 185, 250, 0.92)';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.96)';
  ctx.lineWidth = Math.max(2, w * 0.0028);
  ctx.shadowColor = 'rgba(56, 189, 248, 0.72)';
  ctx.shadowBlur = w * 0.004;

  const armX0 = w * 0.035;
  const armX1 = w * 0.215;
  const armY = h * 0.198;
  ctx.beginPath();
  ctx.moveTo(armX0, armY + h * 0.012);
  ctx.bezierCurveTo(w * 0.095, armY - h * 0.022, w * 0.155, armY + h * 0.018, armX1, armY - h * 0.008);
  ctx.stroke();

  for (let s = 0; s < 7; s++) {
    const t = s / 6;
    const lx = armX0 + (armX1 - armX0) * t;
    const ly = armY + Math.sin(t * Math.PI * 2) * h * 0.01;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(s % 2 === 0 ? -0.55 : 0.6);
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.009, w * 0.0042, h * 0.01, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Completely redraws Fleurdelys's iconic royal sapphire -> periwinkle-violet -> luminous aqua-ice jewel irises
 * at crisp 1024x512 resolution (preserving only the source alpha silhouette so UV mapping matches 100% with zero muddy VRoid pixels).
 */
export function createFleurdelysIrisTexture(
  sourceImage: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Capture source alpha silhouette on an offscreen canvas so our crisp redraw stays 100% UV-aligned
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  const hasSourceMask = maskCtx ? drawSourceImageSafely(maskCtx, sourceImage, w, h, '#000000') : false;

  ctx.clearRect(0, 0, w, h);

  // Paint completely fresh, ultra-crisp Wuthering Waves jewel irises at measured UV centers (u=0.25/0.75, v=0.49)
  [0.25, 0.75].forEach((eu) => {
    const cx = w * eu;
    const cy = h * 0.49;
    const rx = w * 0.145;
    const ry = h * 0.29;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();

    // 1. Rich jewel vertical base gradient: deep twilight violet-indigo -> luminous royal periwinkle -> bright crystal aqua-ice
    const baseGrad = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
    baseGrad.addColorStop(0.0, '#14113d');
    baseGrad.addColorStop(0.26, '#2e2b85');
    baseGrad.addColorStop(0.50, '#5a6ff5');
    baseGrad.addColorStop(0.74, '#79b8ff');
    baseGrad.addColorStop(0.92, '#b9f0ff');
    baseGrad.addColorStop(1.0, '#e0fbff');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

    // 2. Soft luminous lavender-rose inner halo tint (adds warmth & living depth)
    const roseTint = ctx.createRadialGradient(cx, cy + ry * 0.18, rx * 0.12, cx, cy + ry * 0.18, rx * 0.92);
    roseTint.addColorStop(0.0, 'rgba(186, 178, 255, 0.42)');
    roseTint.addColorStop(0.55, 'rgba(125, 145, 255, 0.18)');
    roseTint.addColorStop(1.0, 'rgba(40, 35, 110, 0)');
    ctx.fillStyle = roseTint;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

    // 3. Signature glowing lower-iris crystal-aqua crescent refraction (makes the eyes look watery & alive)
    const lowerGlow = ctx.createRadialGradient(cx, cy + ry * 0.46, rx * 0.05, cx, cy + ry * 0.42, rx * 0.82);
    lowerGlow.addColorStop(0.0, 'rgba(232, 252, 255, 0.98)');
    lowerGlow.addColorStop(0.38, 'rgba(142, 224, 255, 0.78)');
    lowerGlow.addColorStop(0.72, 'rgba(96, 165, 250, 0.32)');
    lowerGlow.addColorStop(1.0, 'rgba(79, 70, 229, 0)');
    ctx.fillStyle = lowerGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.42, rx * 0.78, ry * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 56 ultra-fine radial iris stroma filaments for authentic semi-real jewel texture
    for (let s = 0; s < 56; s++) {
      const a = (s / 56) * Math.PI * 2;
      const isHighlight = s % 4 === 0;
      const isDark = s % 4 === 2;
      const innerR = 0.24 + ((s * 5) % 3) * 0.03;
      const outerR = 0.84 + ((s * 7) % 4) * 0.03;
      ctx.strokeStyle = isHighlight
        ? 'rgba(224, 246, 255, 0.44)'
        : isDark
          ? 'rgba(24, 22, 78, 0.34)'
          : 'rgba(148, 198, 255, 0.28)';
      ctx.lineWidth = isHighlight ? 2.1 : 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rx * innerR, cy + Math.sin(a) * ry * innerR);
      ctx.lineTo(cx + Math.cos(a) * rx * outerR, cy + Math.sin(a) * ry * outerR);
      ctx.stroke();
    }

    // 5. Delicate luminous collarette crystal ring around the pupil
    ctx.strokeStyle = 'rgba(210, 240, 255, 0.56)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.02, rx * 0.43, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Deep aristocratic upper-eyelid shadow band (gives mature poise & 3D corneal curvature)
    const upperShadow = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry * 0.14);
    upperShadow.addColorStop(0.0, 'rgba(11, 12, 44, 0.94)');
    upperShadow.addColorStop(0.45, 'rgba(26, 24, 86, 0.62)');
    upperShadow.addColorStop(0.78, 'rgba(46, 42, 124, 0.18)');
    upperShadow.addColorStop(1.0, 'rgba(46, 42, 124, 0)');
    ctx.fillStyle = upperShadow;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 1.18);

    // 7. Crisp velvety dark navy-violet outer limbal ring (high clarity from any camera distance)
    const limbalGrad = ctx.createRadialGradient(cx, cy, rx * 0.72, cx, cy, rx * 0.99);
    limbalGrad.addColorStop(0.0, 'rgba(16, 18, 58, 0)');
    limbalGrad.addColorStop(0.55, 'rgba(16, 18, 58, 0.52)');
    limbalGrad.addColorStop(1.0, 'rgba(10, 12, 38, 0.96)');
    ctx.fillStyle = limbalGrad;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

    // 8. Deep velvet dark-indigo pupil with crisp soft edge
    const pupilGrad = ctx.createRadialGradient(cx, cy + ry * 0.01, rx * 0.06, cx, cy + ry * 0.01, rx * 0.31);
    pupilGrad.addColorStop(0.0, 'rgba(6, 7, 26, 0.99)');
    pupilGrad.addColorStop(0.76, 'rgba(14, 16, 52, 0.95)');
    pupilGrad.addColorStop(1.0, 'rgba(26, 32, 88, 0)');
    ctx.fillStyle = pupilGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.01, rx * 0.31, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 9. Fleurdelys's iconic delicate 4-point celestial star spark inside the pupil
    ctx.fillStyle = 'rgba(224, 248, 255, 0.88)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - ry * 0.17);
    ctx.quadraticCurveTo(cx + rx * 0.028, cy - ry * 0.02, cx + rx * 0.10, cy + ry * 0.01);
    ctx.quadraticCurveTo(cx + rx * 0.028, cy + ry * 0.04, cx, cy + ry * 0.18);
    ctx.quadraticCurveTo(cx - rx * 0.028, cy + ry * 0.04, cx - rx * 0.10, cy + ry * 0.01);
    ctx.quadraticCurveTo(cx - rx * 0.028, cy - ry * 0.02, cx, cy - ry * 0.17);
    ctx.closePath();
    ctx.fill();

    // 10. Crisp lifelike studio corneal catchlights (upper-left key light + upper-right micro-spark + watery lower-right glint)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.34, cy - ry * 0.28, rx * 0.15, ry * 0.125, -0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(240, 250, 255, 0.86)';
    ctx.beginPath();
    ctx.arc(cx + rx * 0.28, cy - ry * 0.22, rx * 0.055, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(218, 248, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx + rx * 0.28, cy + ry * 0.30, rx * 0.09, ry * 0.072, 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  // Clip cleanly to the base VRoid iris alpha silhouette so UV edges match 1:1
  if (hasSourceMask) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Generates a realistic 3D-shaded sclera (eye white) texture with soft upper-eyelid ambient shadow
 * and delicate pinkish inner-corner tear-duct warmth so the eyes look alive rather than flat white paper.
 */
export function createFleurdelysScleraTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Soft ivory-white moist sclera base
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0.0, '#c2cbde'); // Subtle cool upper-eyelid cast shadow
  baseGrad.addColorStop(0.32, '#e6ecf6');
  baseGrad.addColorStop(0.55, '#fafbfe');
  baseGrad.addColorStop(0.88, '#f5f4f8');
  baseGrad.addColorStop(1.0, '#e8e4ee');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Delicate healthy rose-peach outer/inner orbital corner warmth
  [0.08, 0.42, 0.58, 0.92].forEach((u) => {
    const g = ctx.createRadialGradient(w * u, h * 0.56, 4, w * u, h * 0.56, w * 0.09);
    g.addColorStop(0, 'rgba(244, 198, 198, 0.34)');
    g.addColorStop(1, 'rgba(244, 198, 198, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates an alpha-feathered longitudinal Hair Strand Texture (髮絲羽毛狀透明漸層與細緻絲線)
 * Used with alphaTest cutout (no transparent sort glitches) so bangs, Hime locks, and hair tips taper into fine wisps.
 */
export function createFleurdelysHairStrandTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  // 4-octave ultra-fine silky hair micro-strands for airy, wispy, realistic CG hair strands
  const strandFreqA = 13.0;
  const strandFreqB = 29.0;
  const strandFreqC = 67.0;
  const strandFreqD = 129.0;

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 = root top -> 1 = feathered tip bottom
    for (let x = 0; x < w; x++) {
      const u = x / (w - 1); // 0..1 across lock width
      const edgeEnv = Math.sin(u * Math.PI); // 0 at sides, 1 at center

      // Multi-frequency longitudinal silky fiber grooves with gentle organic S-flow
      const waveU = u + Math.sin(v * 6.4) * 0.015 + Math.cos(v * 3.1) * 0.008;
      const f1 = 0.5 + 0.5 * Math.sin(waveU * Math.PI * strandFreqA + 0.4);
      const f2 = 0.5 + 0.5 * Math.sin(waveU * Math.PI * strandFreqB + 1.9);
      const f3 = 0.5 + 0.5 * Math.sin(waveU * Math.PI * strandFreqC + 0.7);
      const f4 = 0.5 + 0.5 * Math.sin(waveU * Math.PI * strandFreqD + 2.3);
      const fiber = f1 * 0.30 + f2 * 0.30 + f3 * 0.24 + f4 * 0.16;

      // Airy, razor-fine feathered V-tip alpha silhouette: splits gracefully into fine individual wisps
      const microSplit = f1 * 0.38 + f2 * 0.32 + f3 * 0.20 + f4 * 0.10;
      const tipThreshold = 0.38 + 0.60 * microSplit * (0.28 + 0.72 * Math.pow(edgeEnv, 0.85));
      // Subtle translucent air-gaps between fine sub-strands near the lower half
      const subStrandGap = v > 0.48 ? Math.max(0.0, (fiber - 0.16 * ((v - 0.48) / 0.52)) / 0.84) : 1.0;
      const lateralFade = Math.min(1, Math.max(0, (edgeEnv - 0.05) / 0.18));
      const tipFade = v < tipThreshold ? 1.0 : Math.max(0, 1.0 - (v - tipThreshold) / 0.055);
      const alpha = Math.round(Math.min(1, lateralFade * tipFade * (0.35 + 0.65 * subStrandGap)) * 255);

      // Authentic pale platinum-champagne blonde with dual silky angel-ring sheen bands
      const rootShadow = 0.80 + 0.20 * Math.min(1, v / 0.16);
      const angelHaloPrimary = Math.exp(-Math.pow((v - 0.23) / 0.075, 2)) * 0.20 * (0.55 + 0.45 * f3);
      const angelHaloSecondary = Math.exp(-Math.pow((v - 0.58) / 0.11, 2)) * 0.11 * (0.5 + 0.5 * f2);
      const lum = Math.min(1.0, (0.74 + fiber * 0.26 + angelHaloPrimary + angelHaloSecondary) * rootShadow);

      const idx = (y * w + x) * 4;
      data[idx] = Math.round(248 * lum);
      data[idx + 1] = Math.round(234 * lum);
      data[idx + 2] = Math.round(206 * lum);
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Injects Fleurdelys's signature Champagne-Blonde outer / Aqua-Cyan underside two-tone hair shader
 * while keeping fine strand shading & anti-overexposure roll-off intact.
 */
export function applyFleurdelysHairTwoToneShader(
  material: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial,
  neckWorldY: number,
  torsoFrontZ: number,
): void {
  material.customProgramCacheKey = () => 'wuwa-fleurdelys-hair-v4';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNeckY = { value: neckWorldY };
    shader.uniforms.uTorsoZ = { value: torsoFrontZ };

    shader.vertexShader =
      `
      varying vec3 vHairWorldPos;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vHairWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `,
    );

    shader.fragmentShader =
      `
      uniform float uNeckY;
      uniform float uTorsoZ;
      varying vec3 vHairWorldPos;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      // Preserve fine strand value contrast from texture while applying Fleurdelys's pale champagne-blonde -> aqua underglow
      float rawHairLuma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 champagneBlonde = vec3(0.98, 0.89, 0.70) * (0.55 + 0.56 * rawHairLuma);
      float belowNeck = smoothstep(uNeckY + 0.04, uNeckY - 0.32, vHairWorldPos.y);
      float innerBack = smoothstep(uTorsoZ + 0.02, uTorsoZ - 0.12, vHairWorldPos.z);
      float aquaWeight = clamp(belowNeck * 0.68 + belowNeck * innerBack * 0.34, 0.0, 0.88);
      vec3 aquaGlow = vec3(0.30, 0.87, 0.98) * (0.58 + 0.46 * rawHairLuma);
      diffuseColor.rgb = mix(champagneBlonde, aquaGlow, aquaWeight);
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
      outgoingLight = vec3(
        (outgoingLight.r >= 0.0 && outgoingLight.r < 1e6) ? outgoingLight.r : 0.0,
        (outgoingLight.g >= 0.0 && outgoingLight.g < 1e6) ? outgoingLight.g : 0.0,
        (outgoingLight.b >= 0.0 && outgoingLight.b < 1e6) ? outgoingLight.b : 0.0
      );
      float matLuma = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
      vec3 chroma = outgoingLight - vec3(matLuma);
      outgoingLight = max(vec3(0.0), vec3(matLuma) + chroma * mix(1.08, 1.0, smoothstep(0.15, 0.75, matLuma)));
      if (matLuma > 0.84) {
        float excess = matLuma - 0.84;
        float compressed = 0.84 + excess / (1.0 + excess * 1.9);
        outgoingLight *= compressed / max(matLuma, 0.0001);
      }
      #include <opaque_fragment>
      `,
    );
  };

  material.needsUpdate = true;
}

/**
 * Generates a dedicated anatomical Elven Ear skin albedo texture (精靈尖耳專屬皮膚貼圖)
 * UV layout: u = 0 (ear root) -> 1 (pointed tip), v = angle around cross-section
 * (v ≈ 0.0 / 1.0 is front concha/scapha hollow, v ≈ 0.25 upper helix rim, v ≈ 0.5 dorsal back, v ≈ 0.75 lower rim/lobule).
 * Eliminates reusing Face_00 atlas on the ears and adds natural porcelain-to-rose subsurface tip blush + inner concha shading.
 */
export function createFleurdelysElfEarTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Base cool fair anime porcelain skin matching Face_00 & Body_00
  const baseGrad = ctx.createLinearGradient(0, 0, w, 0);
  baseGrad.addColorStop(0.0, '#f8e6e0');
  baseGrad.addColorStop(0.45, '#fae9e4');
  baseGrad.addColorStop(0.78, '#f7d6d2');
  baseGrad.addColorStop(1.0, '#f2bcc0'); // Delicate translucent rose-peach blush at pointed ear tip
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Inner front concha bowl & scapha fossa warm rose-mauve ambient occlusion (v near 0.0 and 1.0, u in 0.06..0.68)
  const drawConchaBand = (cy: number, ry: number) => {
    ctx.save();
    ctx.translate(w * 0.3, cy);
    ctx.scale(1, ry / (w * 0.28));
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.28);
    g.addColorStop(0, 'rgba(204, 128, 134, 0.58)');
    g.addColorStop(0.48, 'rgba(218, 146, 150, 0.32)');
    g.addColorStop(1, 'rgba(218, 146, 150, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawConchaBand(0, h * 0.14);
  drawConchaBand(h, h * 0.14);

  // Soft translucent rose rim along upper & lower helix edges (v ≈ 0.25 and v ≈ 0.75)
  const drawRimBlush = (cy: number) => {
    const g = ctx.createLinearGradient(w * 0.25, cy, w, cy);
    g.addColorStop(0, 'rgba(244, 168, 174, 0)');
    g.addColorStop(0.6, 'rgba(244, 164, 172, 0.22)');
    g.addColorStop(1, 'rgba(238, 148, 160, 0.34)');
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - h * 0.09, w, h * 0.18);
  };
  drawRimBlush(h * 0.25);
  drawRimBlush(h * 0.75);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}



