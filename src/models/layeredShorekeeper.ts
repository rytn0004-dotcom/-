import * as THREE from 'three';
import { createCelestialSilkTexture, createWuwaFaceTexture, createStainedGlassTexture, createWaterRippleTexture } from '../utils/wuwaTextures';

export interface LayeredFigureController {
  group: THREE.Group;
  update: (time: number, delta: number, ribbonSpeed: number) => void;
  triggerLiberationVfx: () => void;
  setGlowIntensity: (intensity: number) => void;
  dispose: () => void;
}

/**
 * Creates anatomically contoured anime limb using LatheGeometry
 */
function createContouredLimb(points: [number, number][], segments = 16): THREE.BufferGeometry {
  const vec2Points = points.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(vec2Points, segments);
}

/**
 * Creates a curved anime hair strand using ExtrudeGeometry with spline path
 */
function createCurvedHairStrand(
  pathPoints: THREE.Vector3[],
  baseWidth: number,
  baseThickness: number,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pathPoints);

  // Diamond / teardrop cross-section
  const shape = new THREE.Shape();
  shape.moveTo(0, baseThickness);
  shape.quadraticCurveTo(baseWidth, 0, 0, -baseThickness);
  shape.quadraticCurveTo(-baseWidth, 0, 0, baseThickness);

  return new THREE.ExtrudeGeometry(shape, {
    steps: 16,
    extrudePath: curve,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 3,
  });
}

/**
 * High-fidelity Layered Anime Resonator: 守岸人 (Shorekeeper)
 * Faithfully reconstructing the 1/7 collector garage kit from the user's reference photo.
 */
export function buildLayeredShorekeeper(): LayeredFigureController {
  const root = new THREE.Group();
  root.name = 'Shorekeeper_Collector_Statue';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // ==================== TEXTURES & PBR MATERIALS ====================
  const faceTex = createWuwaFaceTexture('#60a5fa'); // Crystalline lavender blue
  const silkTex = createCelestialSilkTexture();
  const stainedGlassTex = createStainedGlassTexture();
  const waterRippleTex = createWaterRippleTexture();
  textures.push(faceTex, silkTex, stainedGlassTex, waterRippleTex);

  // 1. Satin Porcelain Anime Skin (Smooth subsurface warmth)
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffede4,
    roughness: 0.32,
    metalness: 0.04,
  });
  // 2. Multilayer Golden Blonde Anime Hair
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0xf5dfb3,
    roughness: 0.4,
    metalness: 0.12,
  });
  // 3. Pristine Pearlescent White Silk Gown
  const whiteSilkMat = new THREE.MeshStandardMaterial({
    color: 0xfdfdfd,
    roughness: 0.22,
    metalness: 0.08,
  });
  // 4. Midnight Obsidian Halter Bodice & Under-petals
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x111625,
    roughness: 0.35,
    metalness: 0.15,
  });
  // 5. Rich Royal Blue Petal Under-layer
  const royalBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.3,
    metalness: 0.2,
  });
  // 6. Polished 24K Gold Filigree Ornaments
  const goldFiligreeMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.15,
    metalness: 0.88,
  });
  // 7. Translucent Crystal Blue Tiara & Shards
  const crystalCyanMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.95,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
  // 8. Grand Celestial Twin Silk Banners (Starry gradient)
  const celestialBannerMat = new THREE.MeshStandardMaterial({
    map: silkTex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.96,
    roughness: 0.25,
    metalness: 0.15,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.2,
  });
  // 9. Face Decal
  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  materials.push(
    skinMat,
    hairMat,
    whiteSilkMat,
    obsidianMat,
    royalBlueMat,
    goldFiligreeMat,
    crystalCyanMat,
    celestialBannerMat,
    faceMat,
  );

  // ==================== 1. ANATOMICAL HEAD & MULTI-TIER HAIR ====================
  const characterGroup = new THREE.Group();
  root.add(characterGroup);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.95, 0);
  characterGroup.add(headGroup);

  // Head Silhouette with sculpted jaw and chin
  const headGeo = new THREE.SphereGeometry(0.19, 24, 24);
  headGeo.scale(0.88, 1.12, 0.92);
  geometries.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.08, 0);
  headGroup.add(headMesh);

  // Face Plane Decal
  const faceGeo = new THREE.PlaneGeometry(0.38, 0.32);
  geometries.push(faceGeo);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0.1, 0.185);
  headGroup.add(faceMesh);

  // Sculpted Elven Ears (with realistic curvature)
  const createElvenEar = (isRight: boolean) => {
    const earGroup = new THREE.Group();
    const curvePoints: [number, number][] = [
      [0.01, 0],
      [0.05, 0.06],
      [0.06, 0.14],
      [0.04, 0.24],
      [0.01, 0.32],
    ];
    const earGeo = createContouredLimb(curvePoints, 10);
    geometries.push(earGeo);
    const earMesh = new THREE.Mesh(earGeo, skinMat);
    earMesh.scale.set(0.6, 0.6, 0.3);
    earMesh.rotation.z = isRight ? -Math.PI / 2.3 : Math.PI / 2.3;
    earGroup.add(earMesh);

    // Golden drop earring
    const earringGeo = new THREE.TorusGeometry(0.018, 0.005, 6, 12);
    geometries.push(earringGeo);
    const earring = new THREE.Mesh(earringGeo, goldFiligreeMat);
    earring.position.set(isRight ? 0.02 : -0.02, -0.04, 0);
    earGroup.add(earring);

    earGroup.position.set(isRight ? 0.18 : -0.18, 0.09, -0.02);
    earGroup.rotation.set(-0.15, isRight ? 0.25 : -0.25, 0);
    headGroup.add(earGroup);
  };
  createElvenEar(false);
  createElvenEar(true);

  // Two-tiered Ice-Crystal Laurel Crown / Tiara
  const tiaraGroup = new THREE.Group();
  tiaraGroup.position.set(0, 0.22, 0.06);
  headGroup.add(tiaraGroup);

  const tiaraArcGeo = new THREE.TorusGeometry(0.185, 0.012, 8, 32, Math.PI * 1.15);
  tiaraArcGeo.rotateX(Math.PI / 2);
  geometries.push(tiaraArcGeo);
  const tiaraArc = new THREE.Mesh(tiaraArcGeo, crystalCyanMat);
  tiaraGroup.add(tiaraArc);

  // Branching Crystal Spires & Gems (Matching reference photo)
  for (let i = 0; i < 11; i++) {
    const angle = ((i - 5) / 5) * 1.0;
    const h = 0.12 + (i % 2 === 0 ? 0.07 : 0.02);
    const spireGeo = new THREE.ConeGeometry(0.02, h, 4);
    geometries.push(spireGeo);
    const spire = new THREE.Mesh(spireGeo, crystalCyanMat);
    spire.position.set(Math.sin(angle) * 0.185, 0.04 + h / 2, Math.cos(angle) * 0.185 - 0.08);
    spire.rotation.set(0.35, 0, -angle * 0.85);
    tiaraGroup.add(spire);
  }

  // MULTI-LAYERED HAIR SYSTEM:
  const hairGroup = new THREE.Group();
  headGroup.add(hairGroup);

  // Tier 1: Front Feathered Bangs (parted in the center with delicate micro-locks)
  const bangsLeft = createCurvedHairStrand(
    [new THREE.Vector3(-0.02, 0.22, 0.16), new THREE.Vector3(-0.08, 0.15, 0.2), new THREE.Vector3(-0.16, 0.05, 0.18)],
    0.04,
    0.015,
  );
  const bangsRight = createCurvedHairStrand(
    [new THREE.Vector3(0.02, 0.22, 0.16), new THREE.Vector3(0.08, 0.15, 0.2), new THREE.Vector3(0.16, 0.05, 0.18)],
    0.04,
    0.015,
  );
  geometries.push(bangsLeft, bangsRight);
  hairGroup.add(new THREE.Mesh(bangsLeft, hairMat), new THREE.Mesh(bangsRight, hairMat));

  // Tier 2: Side Locks framing breasts
  const sideLockL = createCurvedHairStrand(
    [
      new THREE.Vector3(-0.18, 0.18, 0.05),
      new THREE.Vector3(-0.26, -0.05, 0.1),
      new THREE.Vector3(-0.22, -0.32, 0.12),
      new THREE.Vector3(-0.16, -0.55, 0.08),
    ],
    0.05,
    0.02,
  );
  const sideLockR = createCurvedHairStrand(
    [
      new THREE.Vector3(0.18, 0.18, 0.05),
      new THREE.Vector3(0.26, -0.05, 0.1),
      new THREE.Vector3(0.22, -0.32, 0.12),
      new THREE.Vector3(0.16, -0.55, 0.08),
    ],
    0.05,
    0.02,
  );
  geometries.push(sideLockL, sideLockR);
  hairGroup.add(new THREE.Mesh(sideLockL, hairMat), new THREE.Mesh(sideLockR, hairMat));

  // Tier 3: Flowing Back Hair Cascades (voluminous layered waves curling outwards)
  const backHairGroup = new THREE.Group();
  backHairGroup.position.set(0, 0.14, -0.1);
  hairGroup.add(backHairGroup);

  const backLocks: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = ((i - 4) / 4) * 0.95;
    const strandGeo = createCurvedHairStrand(
      [
        new THREE.Vector3(Math.sin(angle) * 0.16, 0, -Math.cos(angle) * 0.08),
        new THREE.Vector3(Math.sin(angle) * 0.26, -0.4, -0.2),
        new THREE.Vector3(Math.sin(angle) * 0.35, -0.85, -0.28),
        new THREE.Vector3(Math.sin(angle) * 0.42, -1.25, -0.15),
      ],
      0.065,
      0.025,
    );
    geometries.push(strandGeo);
    const strand = new THREE.Mesh(strandGeo, hairMat);
    backHairGroup.add(strand);
    backLocks.push(strand);
  }

  // ==================== 2. TORSO & MULTI-LAYER GOWN ====================
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.45, 0);
  characterGroup.add(torsoGroup);

  // Slender neck with choker
  const neckGeo = createContouredLimb([
    [0.068, 0],
    [0.062, 0.12],
    [0.066, 0.24],
  ]);
  geometries.push(neckGeo);
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.32;
  torsoGroup.add(neckMesh);

  // Gold Choker & Collar Necklace
  const chokerGeo = new THREE.TorusGeometry(0.075, 0.012, 8, 24);
  chokerGeo.rotateX(Math.PI / 2);
  geometries.push(chokerGeo);
  const chokerMesh = new THREE.Mesh(chokerGeo, goldFiligreeMat);
  chokerMesh.position.y = 0.44;
  torsoGroup.add(chokerMesh);

  // Torso Contour: Slender waist, subtle chest curves, backless arch
  const bodyPoints: [number, number][] = [
    [0.13, -0.18], // Pelvis
    [0.11, -0.06], // Natural waist indent
    [0.125, 0.08], // Ribcage
    [0.155, 0.22], // Bust contour
    [0.135, 0.34], // Clavicle
  ];
  const torsoSkinGeo = createContouredLimb(bodyPoints, 20);
  geometries.push(torsoSkinGeo);
  const torsoSkin = new THREE.Mesh(torsoSkinGeo, skinMat);
  torsoGroup.add(torsoSkin);

  // Layer 1: Obsidian Black Halter Bodice (with backless cutout)
  const bodiceShape = new THREE.Shape();
  bodiceShape.moveTo(-0.14, 0.28);
  bodiceShape.quadraticCurveTo(0, 0.32, 0.14, 0.28);
  bodiceShape.lineTo(0.12, -0.15);
  bodiceShape.quadraticCurveTo(0, -0.18, -0.12, -0.15);
  bodiceShape.closePath();
  const bodiceGeo = new THREE.ExtrudeGeometry(bodiceShape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.01 });
  bodiceGeo.translate(0, 0, -0.12);
  geometries.push(bodiceGeo);
  const bodiceMesh = new THREE.Mesh(bodiceGeo, obsidianMat);
  torsoGroup.add(bodiceMesh);

  // Layer 2: White Silk Tabard Apron Dress (Cascading from neck down chest with gold embroidery)
  const tabardShape = new THREE.Shape();
  tabardShape.moveTo(-0.11, 0.36);
  tabardShape.lineTo(0.11, 0.36);
  tabardShape.lineTo(0.16, -0.32);
  tabardShape.quadraticCurveTo(0, -0.36, -0.16, -0.32);
  tabardShape.closePath();
  const tabardGeo = new THREE.ExtrudeGeometry(tabardShape, { depth: 0.025, bevelEnabled: true, bevelThickness: 0.008 });
  tabardGeo.translate(0, 0, 0.125);
  geometries.push(tabardGeo);
  const tabardMesh = new THREE.Mesh(tabardGeo, whiteSilkMat);
  torsoGroup.add(tabardMesh);

  // Blue Spine Floral Vine embroidery down the tabard center
  const vineCenterGeo = new THREE.BoxGeometry(0.035, 0.58, 0.01);
  geometries.push(vineCenterGeo);
  const vineCenter = new THREE.Mesh(vineCenterGeo, royalBlueMat);
  vineCenter.position.set(0, 0.02, 0.14);
  torsoGroup.add(vineCenter);

  // Gold Waist Filigree Belt with dangling cruciform cross (from photo)
  const waistBeltGeo = new THREE.TorusGeometry(0.145, 0.012, 6, 24);
  waistBeltGeo.rotateX(Math.PI / 2);
  geometries.push(waistBeltGeo);
  const waistBelt = new THREE.Mesh(waistBeltGeo, goldFiligreeMat);
  waistBelt.position.y = -0.14;
  torsoGroup.add(waistBelt);

  const crossGeo = new THREE.BoxGeometry(0.04, 0.16, 0.015);
  geometries.push(crossGeo);
  const crossPendant = new THREE.Mesh(crossGeo, goldFiligreeMat);
  crossPendant.position.set(0.16, -0.26, 0.1);
  torsoGroup.add(crossPendant);

  // Layer 3: Flared Multi-Petal Skirt (Layered obsidian and royal blue silk pleats)
  const skirtGroup = new THREE.Group();
  skirtGroup.position.y = -0.15;
  torsoGroup.add(skirtGroup);

  // Flared outer petals
  for (let p = 0; p < 8; p++) {
    const pAngle = (p / 8) * Math.PI * 2;
    const petalGeo = new THREE.CylinderGeometry(0.18, 0.38, 0.36, 6, 1, true);
    geometries.push(petalGeo);
    const petalMesh = new THREE.Mesh(petalGeo, p % 2 === 0 ? obsidianMat : royalBlueMat);
    petalMesh.position.set(Math.sin(pAngle) * 0.04, -0.16, Math.cos(pAngle) * 0.04);
    petalMesh.rotation.y = pAngle;
    skirtGroup.add(petalMesh);
  }

  // ==================== 3. GRAND CELESTIAL TWIN SILK BANNERS (羽衣星河飄帶) ====================
  // The showstopping visual from the reference image: wide flowing gradient starry banners looping around her!
  const ribbonGroup = new THREE.Group();
  torsoGroup.add(ribbonGroup);

  const createFlowingBanner = (curvePoints: THREE.Vector3[]) => {
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.18, 8, false);
    tubeGeo.scale(1.0, 0.08, 1.0); // Flatten into a majestic wide silk scarf
    geometries.push(tubeGeo);
    return new THREE.Mesh(tubeGeo, celestialBannerMat);
  };

  // Left swooping banner: drape over left arm, sweeping backwards and curling upward
  const bannerL = createFlowingBanner([
    new THREE.Vector3(-0.25, 0.25, 0.05),
    new THREE.Vector3(-0.65, 0.38, 0.25),
    new THREE.Vector3(-1.15, 0.15, 0.35),
    new THREE.Vector3(-1.55, -0.35, 0.1),
    new THREE.Vector3(-1.45, -0.85, -0.35),
    new THREE.Vector3(-0.95, -1.05, -0.65),
  ]);
  ribbonGroup.add(bannerL);

  // Right swooping banner: arching high above right arm and flowing out dramatically (exact photo angle)
  const bannerR = createFlowingBanner([
    new THREE.Vector3(0.25, 0.25, 0.05),
    new THREE.Vector3(0.68, 0.48, 0.2),
    new THREE.Vector3(1.18, 0.65, 0.05),
    new THREE.Vector3(1.65, 0.45, -0.35),
    new THREE.Vector3(1.75, 0.15, -0.75),
    new THREE.Vector3(1.35, -0.15, -0.95),
  ]);
  ribbonGroup.add(bannerR);

  // ==================== 4. LEGS & POISE (Stepping Gracefully on Water) ====================
  // Contoured slender anime legs: graceful curvature from thigh to ankle
  const legPoints: [number, number][] = [
    [0.088, 0], // Upper thigh
    [0.075, -0.25], // Mid thigh
    [0.058, -0.48], // Knee indent
    [0.068, -0.65], // Calf flare
    [0.042, -0.92], // Slender ankle
  ];

  // Right Leg: Poised forward, stepping lightly into the water pool
  const legR = new THREE.Group();
  legR.position.set(0.12, -0.3, 0.06);
  torsoGroup.add(legR);

  const legGeoR = createContouredLimb(legPoints, 18);
  geometries.push(legGeoR);
  const legMeshR = new THREE.Mesh(legGeoR, skinMat);
  legR.add(legMeshR);

  // Strappy blue stiletto sandal
  const sandalSoleR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.22), crystalCyanMat);
  sandalSoleR.position.set(0, -0.96, 0.04);
  legR.add(sandalSoleR);

  const heelR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.12, 8), goldFiligreeMat);
  heelR.position.set(0, -1.0, -0.04);
  legR.add(heelR);

  // Ankle ribbon wrap
  const ankleWrapR = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 6, 16), crystalCyanMat);
  ankleWrapR.rotateX(Math.PI / 2);
  ankleWrapR.position.set(0, -0.92, 0);
  legR.add(ankleWrapR);

  // Left Leg: Extended gracefully behind
  const legL = new THREE.Group();
  legL.position.set(-0.12, -0.3, -0.06);
  legL.rotation.set(-0.1, 0, 0.06);
  torsoGroup.add(legL);

  const legMeshL = new THREE.Mesh(legGeoR, skinMat);
  legL.add(legMeshL);

  const sandalSoleL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.035, 0.22), crystalCyanMat);
  sandalSoleL.position.set(0, -0.96, 0.04);
  legL.add(sandalSoleL);

  const heelL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.12, 8), goldFiligreeMat);
  heelL.position.set(0, -1.0, -0.04);
  legL.add(heelL);

  const ankleWrapL = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 6, 16), crystalCyanMat);
  ankleWrapL.rotateX(Math.PI / 2);
  ankleWrapL.position.set(0, -0.92, 0);
  legL.add(ankleWrapL);

  // ==================== 5. DELICATE ARMS & HAND POISE ====================
  const armPoints: [number, number][] = [
    [0.048, 0], // Shoulder
    [0.042, -0.22], // Bicep
    [0.036, -0.42], // Elbow
    [0.038, -0.6], // Forearm
    [0.028, -0.72], // Slender wrist
  ];
  const armGeo = createContouredLimb(armPoints, 16);
  geometries.push(armGeo);

  // Right Arm: Raised gracefully toward head, fingers lightly curling (exact photo pose)
  const armR = new THREE.Group();
  armR.position.set(0.24, 0.32, 0);
  armR.rotation.set(-0.85, -0.25, 1.25);
  torsoGroup.add(armR);

  const armMeshR = new THREE.Mesh(armGeo, skinMat);
  armR.add(armMeshR);

  // Pearl bracelet on wrist
  const braceletR = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 16), goldFiligreeMat);
  braceletR.rotateX(Math.PI / 2);
  braceletR.position.y = -0.7;
  armR.add(braceletR);

  // Left Arm: Outstretched gracefully sideways with palm facing upwards
  const armL = new THREE.Group();
  armL.position.set(-0.24, 0.32, 0);
  armL.rotation.set(0.12, 0.22, -0.95);
  torsoGroup.add(armL);

  const armMeshL = new THREE.Mesh(armGeo, skinMat);
  armL.add(armMeshL);

  const braceletL = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.006, 6, 16), goldFiligreeMat);
  braceletL.rotateX(Math.PI / 2);
  braceletL.position.y = -0.7;
  armL.add(braceletL);

  // ==================== 6. GOTHIC STAINED GLASS DIORAMA BASE (1:1 Photo Match) ====================
  const dioramaGroup = new THREE.Group();
  root.add(dioramaGroup);

  // Tier 1: Polygonal Chiseled Basalt / Obsidian Rock Pedestal
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x1f2330,
    roughness: 0.65,
    metalness: 0.25,
    flatShading: true,
  });
  materials.push(basaltMat);

  const rockPlinthGeo = new THREE.CylinderGeometry(1.65, 2.05, 0.48, 10);
  geometries.push(rockPlinthGeo);
  const rockPlinth = new THREE.Mesh(rockPlinthGeo, basaltMat);
  rockPlinth.position.y = -0.65;
  dioramaGroup.add(rockPlinth);

  const rockMidGeo = new THREE.DodecahedronGeometry(1.48, 0);
  rockMidGeo.scale(1.25, 0.42, 1.15);
  geometries.push(rockMidGeo);
  const rockMid = new THREE.Mesh(rockMidGeo, basaltMat);
  rockMid.position.set(0, -0.26, 0);
  dioramaGroup.add(rockMid);

  // Tier 2: Translucent Liquid Crystal Water Ripple Pool
  const waterPoolMat = new THREE.MeshStandardMaterial({
    map: waterRippleTex,
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.95,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  materials.push(waterPoolMat);

  const waterPoolGeo = new THREE.PlaneGeometry(1.85, 1.85);
  geometries.push(waterPoolGeo);
  const waterPool = new THREE.Mesh(waterPoolGeo, waterPoolMat);
  waterPool.rotation.x = -Math.PI / 2;
  waterPool.position.set(0.06, 0.02, 0.08);
  dioramaGroup.add(waterPool);

  const waveCrestGeo = new THREE.TorusGeometry(0.78, 0.045, 10, 36);
  waveCrestGeo.rotateX(Math.PI / 2);
  geometries.push(waveCrestGeo);
  const waveCrest = new THREE.Mesh(waveCrestGeo, waterPoolMat);
  waveCrest.position.set(0.06, 0.035, 0.08);
  dioramaGroup.add(waveCrest);

  // Tier 3: Gothic Cathedral Stained-Glass Lancet Arch (Behind Character)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0.78, -0.52);
  dioramaGroup.add(archGroup);

  const gothicIronMat = new THREE.MeshStandardMaterial({
    color: 0x12141c,
    roughness: 0.45,
    metalness: 0.65,
  });
  materials.push(gothicIronMat);

  // Arch Frame Pillars
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.16), gothicIronMat);
  frameL.position.set(-0.85, 0.35, 0);
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.16), gothicIronMat);
  frameR.position.set(0.85, 0.35, 0);
  archGroup.add(frameL, frameR);

  // Pointed Gothic Lancet Roof Beams
  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.18, 0.16), gothicIronMat);
  archL.position.set(-0.45, 1.72, 0);
  archL.rotation.z = -0.72;
  const archR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.18, 0.16), gothicIronMat);
  archR.position.set(0.45, 1.72, 0);
  archR.rotation.z = 0.72;
  archGroup.add(archL, archR);

  // Backlit Stained Glass Pane
  const stainedGlassMat = new THREE.MeshStandardMaterial({
    map: stainedGlassTex,
    emissiveMap: stainedGlassTex,
    emissive: 0xc026d3,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    transparent: true,
    opacity: 0.95,
  });
  materials.push(stainedGlassMat);

  const glassGeo = new THREE.PlaneGeometry(1.62, 2.45);
  geometries.push(glassGeo);
  const glassMesh = new THREE.Mesh(glassGeo, stainedGlassMat);
  glassMesh.position.set(0, 0.85, -0.02);
  archGroup.add(glassMesh);

  // Gothic Window Tracery Rosette
  const traceryRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.03, 8, 20), gothicIronMat);
  traceryRing.position.set(0, 1.7, 0.03);
  archGroup.add(traceryRing);

  // Tier 4: Ruined Fluted Classical Column on Right
  const columnMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  materials.push(columnMat);

  const columnGeo = new THREE.CylinderGeometry(0.2, 0.22, 1.15, 16);
  geometries.push(columnGeo);
  const column = new THREE.Mesh(columnGeo, columnMat);
  column.position.set(0.96, 0.58, -0.38);
  dioramaGroup.add(column);

  // Tier 5: Sculpted Blooming Roses (Velvet Purple & Cyan Teal)
  const purpleRoseMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.35 });
  const cyanRoseMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 });
  materials.push(purpleRoseMat, cyanRoseMat);

  const createRose = (x: number, y: number, z: number, isCyan: boolean, scale = 1.0) => {
    const rose = new THREE.Group();
    rose.position.set(x, y, z);
    rose.scale.setScalar(scale);
    const mat = isCyan ? cyanRoseMat : purpleRoseMat;

    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.015, 6, 6), mat);
      p.scale.set(1.0, 0.5, 0.9);
      p.rotation.set(0.3, (i * Math.PI) / 2, 0);
      rose.add(p);
    }
    dioramaGroup.add(rose);
  };

  createRose(-1.08, 0.68, -0.42, false, 1.25); // Top purple rose
  createRose(-0.96, 0.48, -0.36, true, 0.9); // Small cyan rose
  createRose(1.05, 0.88, -0.4, false, 1.3); // Right purple rose
  createRose(1.18, 0.68, -0.32, true, 0.95); // Right cyan rose
  createRose(0.58, -0.12, 0.62, false, 1.15); // Base rose
  createRose(-0.68, -0.46, 0.72, false, 0.95);
  createRose(-0.78, -0.56, 0.56, true, 0.8);

  return {
    group: root,
    update(time, delta, ribbonSpeed) {
      // Gentle breathing
      torsoGroup.position.y = 1.45 + Math.sin(time * 2.0) * 0.012;

      // Celestial Silk Banners graceful wave
      const wave = Math.sin(time * 2.8 * ribbonSpeed) * 0.14;
      const waveCos = Math.cos(time * 2.2 * ribbonSpeed) * 0.1;

      bannerL.rotation.z = wave * 0.35;
      bannerR.rotation.z = -wave * 0.35;
      bannerL.position.y = waveCos * 0.06;
      bannerR.position.y = -waveCos * 0.06;

      // Flowing hair strands wave
      backLocks.forEach((lock, i) => {
        lock.rotation.z = Math.sin(time * 2.2 * ribbonSpeed + i * 0.4) * 0.06;
      });

      // Liquid water pulse
      const ripple = 0.96 + 0.05 * Math.sin(time * 3.2);
      waveCrest.scale.set(ripple, ripple, 1.0);

      // Backlit stained glass breathing illumination
      stainedGlassMat.emissiveIntensity = 1.2 + 0.35 * Math.sin(time * 2.0);
    },
    triggerLiberationVfx() {
      celestialBannerMat.emissiveIntensity = 1.2;
      crystalCyanMat.emissiveIntensity = 2.0;
      setTimeout(() => {
        celestialBannerMat.emissiveIntensity = 0.2;
        crystalCyanMat.emissiveIntensity = 0.95;
      }, 1500);
    },
    setGlowIntensity(intensity) {
      stainedGlassMat.emissiveIntensity = intensity;
      waterPoolMat.emissiveIntensity = intensity * 0.8;
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
