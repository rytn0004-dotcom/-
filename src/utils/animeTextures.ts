import * as THREE from 'three';
import { AnimeExpression } from '../types/anime';

/**
 * Creates a soft radial contact shadow texture for grounding 3D subjects
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.05,
    size / 2,
    size / 2,
    size * 0.48,
  );
  gradient.addColorStop(0, 'rgba(10, 5, 20, 0.75)');
  gradient.addColorStop(0.3, 'rgba(12, 8, 25, 0.45)');
  gradient.addColorStop(0.7, 'rgba(15, 10, 30, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates an expressive anime face & eyes texture map
 */
export function createAnimeFaceTexture(
  expression: AnimeExpression = 'determined',
  eyeColor: string = '#22d3ee', // Cyan / Neon blue
  blushIntensity: number = 0.5,
): THREE.CanvasTexture {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  // Helper to draw an expressive anime eye
  const drawEye = (centerX: number, centerY: number, isRight: boolean) => {
    ctx.save();
    ctx.translate(centerX, centerY);
    if (isRight) ctx.scale(-1, 1);

    const eyeW = 110;
    const eyeH = 145;

    // Sclera (White base)
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, -0.05, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Soft sclera upper shadow
    const scleraGrad = ctx.createLinearGradient(0, -eyeH, 0, eyeH);
    scleraGrad.addColorStop(0, 'rgba(180, 195, 225, 0.5)');
    scleraGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = scleraGrad;
    ctx.fill();

    // Iris clipping path
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 10, eyeW * 0.78, eyeH * 0.85, 0, 0, Math.PI * 2);
    ctx.clip();

    // Iris gradient base
    const irisGrad = ctx.createLinearGradient(0, -eyeH * 0.8, 0, eyeH * 0.8);
    if (expression === 'determined') {
      irisGrad.addColorStop(0, '#0e2b4d');
      irisGrad.addColorStop(0.4, '#0284c7');
      irisGrad.addColorStop(0.8, eyeColor);
      irisGrad.addColorStop(1, '#93c5fd');
    } else if (expression === 'blush') {
      irisGrad.addColorStop(0, '#4c0519');
      irisGrad.addColorStop(0.4, '#db2777');
      irisGrad.addColorStop(0.8, '#f472b6');
      irisGrad.addColorStop(1, '#fbcfe8');
    } else {
      irisGrad.addColorStop(0, '#161e38');
      irisGrad.addColorStop(0.4, '#3b82f6');
      irisGrad.addColorStop(0.8, eyeColor);
      irisGrad.addColorStop(1, '#a5f3fc');
    }

    ctx.fillStyle = irisGrad;
    ctx.fillRect(-eyeW, -eyeH, eyeW * 2, eyeH * 2);

    // Deep pupil
    ctx.beginPath();
    ctx.ellipse(0, 12, eyeW * 0.35, eyeH * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#090d16';
    ctx.fill();

    // Lower iris light crescent
    ctx.beginPath();
    ctx.ellipse(0, 50, eyeW * 0.55, 30, 0, 0, Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fill();

    // Anime star / sparkle highlight in iris
    ctx.beginPath();
    ctx.arc(-22, -18, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Secondary smaller highlight
    ctx.beginPath();
    ctx.arc(28, 42, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    ctx.restore(); // end clip

    // Anime Upper Eyelash / Winged Eyeliner (Iconic stylized anime contour)
    ctx.beginPath();
    ctx.moveTo(-eyeW * 1.05, -eyeH * 0.4);
    ctx.quadraticCurveTo(-eyeW * 0.2, -eyeH * 1.08, eyeW * 0.95, -eyeH * 0.45);
    ctx.quadraticCurveTo(eyeW * 1.15, -eyeH * 0.65, eyeW * 1.25, -eyeH * 0.8);
    ctx.quadraticCurveTo(eyeW * 0.95, -eyeH * 0.3, eyeW * 0.7, -eyeH * 0.2);
    ctx.quadraticCurveTo(-eyeW * 0.2, -eyeH * 0.85, -eyeW * 1.05, -eyeH * 0.4);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Lower subtle anime eyelash
    ctx.beginPath();
    ctx.moveTo(-eyeW * 0.5, eyeH * 0.85);
    ctx.quadraticCurveTo(0, eyeH * 0.95, eyeW * 0.5, eyeH * 0.8);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Double eyelid crease
    ctx.beginPath();
    ctx.moveTo(-eyeW * 0.6, -eyeH * 0.95);
    ctx.quadraticCurveTo(0, -eyeH * 1.2, eyeW * 0.75, -eyeH * 0.85);
    ctx.strokeStyle = 'rgba(40, 30, 60, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Anime Eyebrows
    ctx.beginPath();
    if (expression === 'determined' || expression === 'focused') {
      ctx.moveTo(-eyeW * 0.8, -eyeH * 1.35);
      ctx.quadraticCurveTo(-eyeW * 0.2, -eyeH * 1.6, eyeW * 1.1, -eyeH * 1.2);
    } else if (expression === 'smiling') {
      ctx.moveTo(-eyeW * 0.8, -eyeH * 1.45);
      ctx.quadraticCurveTo(-eyeW * 0.1, -eyeH * 1.7, eyeW * 1.0, -eyeH * 1.4);
    } else {
      // Blush / shy
      ctx.moveTo(-eyeW * 0.7, -eyeH * 1.25);
      ctx.quadraticCurveTo(-eyeW * 0.1, -eyeH * 1.5, eyeW * 1.0, -eyeH * 1.3);
    }
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  };

  // Draw left and right eyes
  drawEye(320, 240, false);
  drawEye(704, 240, true);

  // Stylized Anime Nose dot / soft shadow
  ctx.beginPath();
  ctx.ellipse(512, 335, 3.5, 5, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#64748b';
  ctx.fill();

  // Stylized Anime Mouth
  ctx.beginPath();
  if (expression === 'smiling') {
    ctx.arc(512, 370, 24, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#831843';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Mouth interior pink
    ctx.fillStyle = '#f43f5e';
    ctx.fill();
  } else if (expression === 'determined') {
    ctx.moveTo(495, 390);
    ctx.lineTo(530, 388);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (expression === 'blush') {
    ctx.arc(512, 385, 14, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = '#be185d';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else {
    // Focused
    ctx.moveTo(498, 388);
    ctx.quadraticCurveTo(512, 393, 526, 388);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Cute Anime Cheek Blush lines
  const drawBlush = (bx: number, by: number) => {
    ctx.save();
    // Soft radial glow
    const blushGrad = ctx.createRadialGradient(bx, by, 5, bx, by, 65);
    blushGrad.addColorStop(0, `rgba(244, 63, 94, ${0.45 * blushIntensity})`);
    blushGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.arc(bx, by, 65, 0, Math.PI * 2);
    ctx.fill();

    // 3 diagonal anime blush hatching slashes
    ctx.strokeStyle = `rgba(225, 29, 72, ${0.75 * blushIntensity})`;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * 18 - 12, by - 12);
      ctx.lineTo(bx + i * 18 + 12, by + 12);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawBlush(240, 330);
  drawBlush(784, 330);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Japanese traditional kimono wave & sakura blossom pattern
 */
export function createKimonoPatternTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e1b4b'; // Deep royal indigo
  ctx.fillRect(0, 0, size, size);

  // Concentric Seigaiha waves
  ctx.strokeStyle = 'rgba(216, 180, 254, 0.28)';
  ctx.lineWidth = 3;

  const stepX = 64;
  const stepY = 32;

  for (let y = 0; y <= size + stepY; y += stepY) {
    const offsetX = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
    for (let x = -stepX; x <= size + stepX; x += stepX) {
      const cx = x + offsetX;
      const cy = y;

      for (let r = 16; r <= 56; r += 12) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, Math.PI * 2, false);
        ctx.stroke();
      }
    }
  }

  // Scattered Gold & Pink Sakura petals
  const petals = [
    { x: 80, y: 120, rot: 0.4 },
    { x: 220, y: 70, rot: -0.8 },
    { x: 380, y: 190, rot: 1.2 },
    { x: 140, y: 320, rot: -0.3 },
    { x: 320, y: 400, rot: 0.9 },
    { x: 460, y: 360, rot: -1.4 },
  ];

  petals.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    // 5-petal sakura flower
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(12, -24, 0, -32);
      ctx.quadraticCurveTo(-12, -24, 0, 0);
      ctx.fillStyle = '#fbcfe8';
      ctx.fill();
      ctx.restore();
    }

    // Flower golden pistil
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();

    ctx.restore();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Japanese Cyberpunk Hologram Kanji Signboards
 */
export function createCyberKanjiTexture(
  kanjiText: string,
  subText: string,
  color: string = '#06b6d4',
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(5, 10, 20, 0.75)';
  ctx.fillRect(0, 0, width, height);

  // Border neon frame
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Corner brackets
  ctx.lineWidth = 14;
  const bLen = 30;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(12, 12 + bLen);
  ctx.lineTo(12, 12);
  ctx.lineTo(12 + bLen, 12);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - 12 - bLen, height - 12);
  ctx.lineTo(width - 12, height - 12);
  ctx.lineTo(width - 12, height - 12 - bLen);
  ctx.stroke();

  // Kanji typography
  ctx.font = 'bold 96px "Shippori Mincho", "Noto Serif JP", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow pass
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(kanjiText, width / 2, height / 2 - 12);

  // Subtext (Cyber latin letters)
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(subText.toUpperCase(), width / 2, height / 2 + 65);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
