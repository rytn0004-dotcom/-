import * as THREE from 'three';
import { WuwaDiorama } from '../types/wuwa';
import {
  createStainedGlassTexture,
  createWaterRippleTexture,
} from '../utils/wuwaTextures';

export interface WuwaDioramaController {
  group: THREE.Group;
  update: (time: number, delta: number) => void;
  setGlowIntensity: (intensity: number) => void;
  dispose: () => void;
}

/**
 * Builds the exact Gothic Cathedral Stained-Glass & Water Ripple Diorama Base
 * matching the user's reference photo.
 */
export function buildWuwaDiorama(dioramaType: WuwaDiorama): WuwaDioramaController {
  const root = new THREE.Group();
  root.name = `WuwaDiorama_${dioramaType}`;

  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];
  const geometriesToDispose: THREE.BufferGeometry[] = [];

  // Textures
  const stainedGlassTex = createStainedGlassTexture();
  texturesToDispose.push(stainedGlassTex);

  const waterRippleTex = createWaterRippleTexture();
  texturesToDispose.push(waterRippleTex);

  // Materials
  // 1. Chiseled Basalt / Obsidian Rock
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1e2029, // Dark slate-violet obsidian
    roughness: 0.65,
    metalness: 0.25,
    flatShading: true, // Gives the sharp chiseled garage kit facets!
  });
  materialsToDispose.push(rockMat);

  // 2. Translucent Liquid Crystal Water Pool
  const waterPoolMat = new THREE.MeshStandardMaterial({
    map: waterRippleTex,
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  materialsToDispose.push(waterPoolMat);

  // 3. Dark Gothic Iron Tracery Frame
  const gothicIronMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.45,
    metalness: 0.6,
  });
  materialsToDispose.push(gothicIronMat);

  // 4. Backlit Stained Glass Pane
  const stainedGlassMat = new THREE.MeshStandardMaterial({
    map: stainedGlassTex,
    emissiveMap: stainedGlassTex,
    emissive: 0xc026d3,
    emissiveIntensity: 1.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.95,
  });
  materialsToDispose.push(stainedGlassMat);

  // 5. Velvet Blooming Roses (Purple & Cyan matching photo)
  const purpleRoseMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7, // Velvet purple rose
    roughness: 0.4,
  });
  const cyanRoseMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Teal rose
    roughness: 0.4,
  });
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917, // Dark thorny vine
    roughness: 0.7,
  });
  materialsToDispose.push(purpleRoseMat, cyanRoseMat, vineMat);

  // 6. Ruined Classical Column
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.55,
  });
  materialsToDispose.push(columnMat);

  // ==================== 1. CHISELED BASALT ROCK PEDESTAL ====================
  // Tier 1: Bottom Faceted Plinth
  const plinthGeo = new THREE.CylinderGeometry(1.6, 2.0, 0.45, 10);
  geometriesToDispose.push(plinthGeo);
  const plinth = new THREE.Mesh(plinthGeo, rockMat);
  plinth.position.set(0, -0.65, 0);
  root.add(plinth);

  // Tier 2: Mid Chiseled Rock Clustered Outcrop
  const rockMidGeo = new THREE.DodecahedronGeometry(1.5, 0);
  rockMidGeo.scale(1.2, 0.45, 1.1);
  geometriesToDispose.push(rockMidGeo);
  const rockMid = new THREE.Mesh(rockMidGeo, rockMat);
  rockMid.position.set(0, -0.28, 0);
  rockMid.rotation.set(0.1, 0.3, -0.05);
  root.add(rockMid);

  // Tier 3: Upper Stage Surface (where character and water sit)
  const topRockGeo = new THREE.CylinderGeometry(1.45, 1.6, 0.2, 12);
  geometriesToDispose.push(topRockGeo);
  const topRock = new THREE.Mesh(topRockGeo, rockMat);
  topRock.position.set(0, -0.08, 0);
  root.add(topRock);

  // ==================== 2. CRYSTAL WATER RIPPLE POOL ====================
  // Placed right underneath character's feet (from reference photo)
  const waterPoolGeo = new THREE.PlaneGeometry(1.8, 1.8);
  geometriesToDispose.push(waterPoolGeo);
  const waterPool = new THREE.Mesh(waterPoolGeo, waterPoolMat);
  waterPool.rotation.x = -Math.PI / 2;
  waterPool.position.set(0.05, 0.02, 0.08);
  root.add(waterPool);

  // Outer Liquid Wave Rim (Torus ring catching specular highlights)
  const waveRimGeo = new THREE.TorusGeometry(0.75, 0.045, 10, 32);
  waveRimGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(waveRimGeo);
  const waveRim = new THREE.Mesh(waveRimGeo, waterPoolMat);
  waveRim.position.set(0.05, 0.03, 0.08);
  root.add(waveRim);

  // ==================== 3. GOTHIC CATHEDRAL STAINED-GLASS ARCH ====================
  // (Standing majestically behind the character)
  const archGroup = new THREE.Group();
  archGroup.position.set(0, 0.75, -0.55);
  root.add(archGroup);

  // Gothic Lancet Arch Outer Frame
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.15), gothicIronMat);
  frameL.position.set(-0.85, 0.3, 0);
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.15), gothicIronMat);
  frameR.position.set(0.85, 0.3, 0);
  archGroup.add(frameL, frameR);

  // Pointed Gothic Arch Top Lancet Beams
  const archTopL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.15), gothicIronMat);
  archTopL.position.set(-0.45, 1.65, 0);
  archTopL.rotation.z = -0.7;
  const archTopR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.15), gothicIronMat);
  archTopR.position.set(0.45, 1.65, 0);
  archTopR.rotation.z = 0.7;
  archGroup.add(archTopL, archTopR);

  // Backlit Stained Glass Pane inside arch
  const glassGeo = new THREE.PlaneGeometry(1.6, 2.4);
  geometriesToDispose.push(glassGeo);
  const glassMesh = new THREE.Mesh(glassGeo, stainedGlassMat);
  glassMesh.position.set(0, 0.8, -0.02);
  archGroup.add(glassMesh);

  // Gothic Window Tracery Bars
  const centerTracer = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.1), gothicIronMat);
  centerTracer.position.set(0, 0.45, 0.02);
  archGroup.add(centerTracer);

  // Trefoil Rosette in Arch Peak
  const rosetteRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 16), gothicIronMat);
  rosetteRing.position.set(0, 1.65, 0.03);
  archGroup.add(rosetteRing);

  // ==================== 4. RUINED FLUTED COLUMN ====================
  // (Right side of the arch, matching reference photo)
  const columnGeo = new THREE.CylinderGeometry(0.2, 0.22, 1.1, 16);
  geometriesToDispose.push(columnGeo);
  const column = new THREE.Mesh(columnGeo, columnMat);
  column.position.set(0.95, 0.55, -0.4);
  root.add(column);

  // Fluting details
  const capGeo = new THREE.BoxGeometry(0.48, 0.12, 0.48);
  geometriesToDispose.push(capGeo);
  const capMesh = new THREE.Mesh(capGeo, columnMat);
  capMesh.position.set(0.95, 1.15, -0.4);
  root.add(capMesh);

  // ==================== 5. THORNY VINES & BLOOMING ROSES ====================
  // Helper to place sculpted roses
  const createRose = (x: number, y: number, z: number, isCyan: boolean, scale: number = 1.0) => {
    const roseGroup = new THREE.Group();
    roseGroup.position.set(x, y, z);
    roseGroup.scale.setScalar(scale);

    const mat = isCyan ? cyanRoseMat : purpleRoseMat;

    // Layered rose petals
    for (let p = 0; p < 4; p++) {
      const petalGeo = new THREE.SphereGeometry(0.08 + p * 0.02, 6, 6);
      petalGeo.scale(1.0, 0.5, 0.9);
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.rotation.set(0.3, (p * Math.PI) / 2, 0);
      roseGroup.add(petal);
    }

    root.add(roseGroup);
    return roseGroup;
  };

  // Place roses matching the reference photo:
  // Left arch flank roses
  createRose(-1.05, 0.65, -0.45, false, 1.2); // Big purple rose
  createRose(-0.95, 0.48, -0.38, true, 0.85); // Small teal rose
  // Right arch flank roses
  createRose(1.02, 0.85, -0.42, false, 1.25); // Purple rose
  createRose(1.15, 0.68, -0.35, true, 0.9); // Teal rose
  // Base rock roses
  createRose(0.55, -0.15, 0.6, false, 1.1);
  createRose(-0.65, -0.45, 0.7, false, 0.9);
  createRose(-0.75, -0.55, 0.55, true, 0.75);

  // Winding Thorny Vines
  const vineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.1, -0.2, -0.2),
    new THREE.Vector3(-0.95, 0.4, -0.4),
    new THREE.Vector3(-1.0, 0.9, -0.45),
    new THREE.Vector3(-0.6, 1.4, -0.5),
  ]);
  const vineGeo = new THREE.TubeGeometry(vineCurve, 20, 0.03, 6, false);
  geometriesToDispose.push(vineGeo);
  const vineMesh = new THREE.Mesh(vineGeo, vineMat);
  root.add(vineMesh);

  // ==================== 6. FLOATING BUTTERFLIES & STELLAR MOTES ====================
  const butterflyGeo = new THREE.PlaneGeometry(0.08, 0.05);
  butterflyGeo.rotateX(Math.PI / 4);
  geometriesToDispose.push(butterflyGeo);

  const butterflyMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  materialsToDispose.push(butterflyMat);

  const butterflies: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const bf = new THREE.Mesh(butterflyGeo, butterflyMat);
    bf.position.set(
      (Math.random() - 0.5) * 2.2,
      0.6 + Math.random() * 1.8,
      (Math.random() - 0.5) * 2.0,
    );
    root.add(bf);
    butterflies.push(bf);
  }

  return {
    group: root,
    update(time, delta) {
      // Liquid water ripple pulse
      const wave = 0.96 + 0.06 * Math.sin(time * 3.0);
      waveRim.scale.set(wave, wave, 1.0);

      // Stained glass gentle breathing illumination
      stainedGlassMat.emissiveIntensity = 1.1 + 0.3 * Math.sin(time * 2.2);

      // Floating butterflies flutter
      butterflies.forEach((bf, idx) => {
        bf.position.y += Math.sin(time * 3.0 + idx) * 0.003;
        bf.position.x += Math.cos(time * 2.0 + idx) * 0.002;
        bf.rotation.y = time * 2.0 + idx;
        bf.scale.x = Math.sin(time * 16.0 + idx * 2.0); // wing flap
      });
    },
    setGlowIntensity(intensity) {
      stainedGlassMat.emissiveIntensity = intensity;
      waterPoolMat.emissiveIntensity = intensity * 0.75;
    },
    dispose() {
      for (const g of geometriesToDispose) g.dispose();
      for (const m of materialsToDispose) m.dispose();
      for (const t of texturesToDispose) t.dispose();
    },
  };
}
