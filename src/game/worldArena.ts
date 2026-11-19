import * as THREE from 'three';

export class WorldArena {
  public group: THREE.Group;
  private materials: THREE.Material[] = [];
  private geometries: THREE.BufferGeometry[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Solaris_Training_Sanctuary';

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111827, // Dark slate stone
      roughness: 0.35,
      metalness: 0.25,
    });
    this.materials.push(floorMat);

    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    this.materials.push(runeMat);

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.3,
    });
    this.materials.push(pillarMat);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    this.materials.push(waterMat);

    // 1. Main Circular Stone Arena Floor (Radius 18m)
    const floorGeo = new THREE.CylinderGeometry(18, 19, 0.6, 36);
    this.geometries.push(floorGeo);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    this.group.add(floor);

    // 2. Glowing Resonator Arena Runes (Concentric rings)
    const runeRingGeo = new THREE.RingGeometry(6.0, 6.2, 48);
    runeRingGeo.rotateX(-Math.PI / 2);
    this.geometries.push(runeRingGeo);
    const runeRing = new THREE.Mesh(runeRingGeo, runeMat);
    runeRing.position.y = 0.01;
    this.group.add(runeRing);

    const outerRuneGeo = new THREE.RingGeometry(14.0, 14.3, 48);
    outerRuneGeo.rotateX(-Math.PI / 2);
    this.geometries.push(outerRuneGeo);
    const outerRune = new THREE.Mesh(outerRuneGeo, runeMat);
    outerRune.position.y = 0.01;
    this.group.add(outerRune);

    // 3. Ancient Monolith Pillars surrounding arena perimeter
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 17.5;
      const h = 4.5 + (i % 3) * 1.5;

      const pGeo = new THREE.BoxGeometry(1.2, h, 1.2);
      this.geometries.push(pGeo);
      const pillar = new THREE.Mesh(pGeo, pillarMat);
      pillar.position.set(Math.cos(angle) * radius, h / 2 - 0.3, Math.sin(angle) * radius);
      pillar.rotation.y = angle + 0.2;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.group.add(pillar);

      // Glowing crystal shard floating atop pillars
      const shardGeo = new THREE.OctahedronGeometry(0.35, 0);
      this.geometries.push(shardGeo);
      const shard = new THREE.Mesh(shardGeo, runeMat);
      shard.position.set(Math.cos(angle) * radius, h + 0.4, Math.sin(angle) * radius);
      this.group.add(shard);
    }

    // 4. Outer Water Reflection Pool
    const waterGeo = new THREE.RingGeometry(18.0, 36.0, 48);
    waterGeo.rotateX(-Math.PI / 2);
    this.geometries.push(waterGeo);
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = -0.32;
    this.group.add(water);

    // 5. Giant Ethereal Tacet Disc in the Solaris-3 sky (The iconic inverted black hole ring!)
    const discGeo = new THREE.TorusGeometry(32, 1.2, 8, 48);
    this.geometries.push(discGeo);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    this.materials.push(discMat);
    const tacetDisc = new THREE.Mesh(discGeo, discMat);
    tacetDisc.position.set(0, 35, -45);
    tacetDisc.rotation.x = 0.4;
    this.group.add(tacetDisc);
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
