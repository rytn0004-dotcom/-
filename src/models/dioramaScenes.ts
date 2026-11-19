import * as THREE from 'three';
import { AnimeDiorama, AnimeShaderStyle } from '../types/anime';
import { createCelMaterial, createOutlineMaterial } from '../shaders/celShaders';
import { createContactShadowTexture, createCyberKanjiTexture } from '../utils/animeTextures';

export interface DioramaController {
  group: THREE.Group;
  contactShadow: THREE.Mesh;
  update: (time: number, delta: number, windSpeed: number) => void;
  updateShaderStyle: (style: AnimeShaderStyle) => void;
  setSakuraDensity: (count: number) => void;
  dispose: () => void;
}

/**
 * Builds the selected Diorama scenery
 */
export function buildDioramaScene(
  dioramaType: AnimeDiorama,
  style: AnimeShaderStyle,
  initialSakuraCount: number = 250,
): DioramaController {
  const root = new THREE.Group();
  root.name = `Diorama_${dioramaType}`;

  const materialsToDispose: THREE.Material[] = [];
  const texturesToDispose: THREE.Texture[] = [];

  // Ground Contact Shadow (placed flush at ground Y=0.01)
  const contactTex = createContactShadowTexture();
  texturesToDispose.push(contactTex);

  const contactMat = new THREE.MeshBasicMaterial({
    map: contactTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  materialsToDispose.push(contactMat);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    contactMat,
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.015, 0);
  root.add(contactShadow);

  // Outline materials
  const outlineDark = createOutlineMaterial(0x181024, 0.02);
  materialsToDispose.push(outlineDark);

  let updateFn: (time: number, delta: number, windSpeed: number) => void = () => {};
  let setSakuraFn: (count: number) => void = () => {};

  if (dioramaType === 'torii_shrine') {
    // ==================== TORII SHRINE DIORAMA ====================
    const toriiRed = createCelMaterial({ color: 0xdc2626, shadowColor: 0x581c87 }, style);
    const toriiBlack = createCelMaterial({ color: 0x18181b }, style);
    const stoneMat = createCelMaterial({ color: 0x64748b, shadowColor: 0x334155 }, style);
    const woodMat = createCelMaterial({ color: 0x451a03 }, style);
    const sakuraFoliage = createCelMaterial({ color: 0xf472b6, shadowColor: 0xa21caf }, style);
    const lanternGlow = createCelMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.95,
    }, style);

    materialsToDispose.push(toriiRed, toriiBlack, stoneMat, woodMat, sakuraFoliage, lanternGlow);

    // 1. Stone Garden Island Base
    const islandGeo = new THREE.CylinderGeometry(5.2, 5.8, 0.6, 24);
    const island = new THREE.Mesh(islandGeo, stoneMat);
    island.position.set(0, -0.3, 0);
    root.add(island);

    // Stone Steps & Paved Path
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.6 - i * 0.1, 0.08, 0.6),
        stoneMat,
      );
      step.position.set(0, 0.04 * (3 - i), 1.2 + i * 0.55);
      root.add(step);
    }

    // 2. Vermilion Torii Gate (Iconic Shinto Shrine Arch)
    const toriiGroup = new THREE.Group();
    toriiGroup.position.set(0, 0, -1.8);
    root.add(toriiGroup);

    // Pillars (Hashira with slight inward slant)
    const pillarGeo = new THREE.CylinderGeometry(0.16, 0.18, 3.8, 12);
    const pillarL = new THREE.Mesh(pillarGeo, toriiRed);
    pillarL.position.set(-1.6, 1.9, 0);
    pillarL.rotation.z = -0.04;
    const pillarR = new THREE.Mesh(pillarGeo, toriiRed);
    pillarR.position.set(1.6, 1.9, 0);
    pillarR.rotation.z = 0.04;
    toriiGroup.add(pillarL, pillarR);

    // Pillar stone pedestals (Kamebara)
    const pedGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.25, 12);
    const pedL = new THREE.Mesh(pedGeo, stoneMat);
    pedL.position.set(-1.6, 0.12, 0);
    const pedR = new THREE.Mesh(pedGeo, stoneMat);
    pedR.position.set(1.6, 0.12, 0);
    toriiGroup.add(pedL, pedR);

    // Tie Beam (Nuki)
    const nukiGeo = new THREE.BoxGeometry(3.9, 0.18, 0.2);
    const nuki = new THREE.Mesh(nukiGeo, toriiRed);
    nuki.position.set(0, 2.9, 0);
    toriiGroup.add(nuki);

    // Main Top Beam (Kasagi) with upturned curved ends
    const kasagiGeo = new THREE.BoxGeometry(4.6, 0.24, 0.32);
    const kasagi = new THREE.Mesh(kasagiGeo, toriiRed);
    kasagi.position.set(0, 3.65, 0);
    toriiGroup.add(kasagi);

    // Black Top Lintel Cap (Shimaki cap)
    const capGeo = new THREE.BoxGeometry(4.7, 0.12, 0.38);
    const cap = new THREE.Mesh(capGeo, toriiBlack);
    cap.position.set(0, 3.8, 0);
    toriiGroup.add(cap);

    // Gakuzuka plaque in center
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 0.08), toriiBlack);
    plaque.position.set(0, 3.3, 0);
    toriiGroup.add(plaque);

    // 3. Stone Lanterns (Tōrō) on Left & Right
    const createLantern = (x: number, z: number) => {
      const lg = new THREE.Group();
      lg.position.set(x, 0, z);

      // Base & shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 8), stoneMat);
      shaft.position.set(0, 0.45, 0);
      lg.add(shaft);

      // Light chamber (Firebox) with glowing warm core
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), stoneMat);
      box.position.set(0, 1.05, 0);
      lg.add(box);

      const fire = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lanternGlow);
      fire.position.set(0, 1.05, 0);
      lg.add(fire);

      // Umbrella roof (Kasa) with curved corners
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.28, 4), stoneMat);
      roof.position.set(0, 1.34, 0);
      roof.rotation.y = Math.PI / 4;
      lg.add(roof);

      root.add(lg);
      return fire;
    };

    const lanternFireL = createLantern(-1.8, 0.8);
    const lanternFireR = createLantern(1.8, 0.8);

    // 4. Stylized Bonsai Cherry Blossom Tree
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-2.4, 0, -0.6);
    root.add(treeGroup);

    // Curved Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 8), woodMat);
    trunk.position.set(0, 1.2, 0);
    trunk.rotation.z = -0.25;
    treeGroup.add(trunk);

    // Branches
    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.4, 6), woodMat);
    branch1.position.set(0.4, 1.9, 0.2);
    branch1.rotation.set(0.3, 0, -0.7);
    treeGroup.add(branch1);

    // Layered Anime Sakura Foliage Clumps
    const foliageClumps: THREE.Mesh[] = [];
    const foliageOffsets = [
      { x: 0.3, y: 2.2, z: 0.1, s: 0.8 },
      { x: 0.9, y: 2.5, z: 0.4, s: 0.65 },
      { x: -0.2, y: 2.7, z: -0.2, s: 0.75 },
      { x: 0.5, y: 3.0, z: 0.0, s: 0.9 },
    ];

    foliageOffsets.forEach((fo) => {
      const fGeo = new THREE.DodecahedronGeometry(fo.s, 1);
      const fMesh = new THREE.Mesh(fGeo, sakuraFoliage);
      fMesh.position.set(fo.x, fo.y, fo.z);
      treeGroup.add(fMesh);
      foliageClumps.push(fMesh);
    });

    // 5. Instanced Falling Sakura Petals Particle System
    let petalCount = initialSakuraCount;
    const petalGeo = new THREE.PlaneGeometry(0.09, 0.05);
    petalGeo.rotateX(Math.PI / 4);

    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xfbcfe8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    materialsToDispose.push(petalMat);

    const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, 500);
    petalMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    petalMesh.frustumCulled = false;
    root.add(petalMesh);

    // Petal simulation data
    const petalData: {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      rot: THREE.Vector3;
      rotSpeed: THREE.Vector3;
    }[] = [];

    const dummyMatrix = new THREE.Matrix4();
    const dummyObj = new THREE.Object3D();

    for (let i = 0; i < 500; i++) {
      petalData.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          Math.random() * 6 + 0.2,
          (Math.random() - 0.5) * 9,
        ),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          -0.3 - Math.random() * 0.4,
          (Math.random() - 0.5) * 0.4,
        ),
        rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          (Math.random() - 0.5) * 3.0,
          (Math.random() - 0.5) * 2.0,
        ),
      });
    }

    setSakuraFn = (count: number) => {
      petalCount = Math.min(500, Math.max(20, count));
      petalMesh.count = petalCount;
    };
    setSakuraFn(initialSakuraCount);

    updateFn = (time, delta, windSpeed) => {
      // Lantern flame gentle flicker
      const flicker = 0.85 + 0.15 * Math.sin(time * 8.0);
      lanternFireL.scale.set(flicker, flicker, flicker);
      lanternFireR.scale.set(flicker, flicker, flicker);

      // Sakura foliage sway
      foliageClumps.forEach((fc, i) => {
        fc.rotation.y = Math.sin(time * 1.5 * windSpeed + i) * 0.05 * windSpeed;
        fc.rotation.z = Math.cos(time * 1.2 * windSpeed + i) * 0.04 * windSpeed;
      });

      // Petals falling and fluttering
      const windX = windSpeed * 0.6;
      for (let i = 0; i < petalCount; i++) {
        const p = petalData[i];

        // Flutter physics
        p.pos.y += p.vel.y * delta;
        p.pos.x += (p.vel.x + windX) * delta;
        p.pos.z += p.vel.z * delta + Math.sin(time * 2.0 + i) * 0.01;

        p.rot.x += p.rotSpeed.x * delta;
        p.rot.y += p.rotSpeed.y * delta;
        p.rot.z += p.rotSpeed.z * delta;

        // Reset if hitting ground
        if (p.pos.y < 0.05) {
          p.pos.y = 5.5 + Math.random() * 1.5;
          p.pos.x = (Math.random() - 0.5) * 9 - windX * 2.0;
          p.pos.z = (Math.random() - 0.5) * 9;
        }

        dummyObj.position.copy(p.pos);
        dummyObj.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummyObj.scale.setScalar(1);
        dummyObj.updateMatrix();

        petalMesh.setMatrixAt(i, dummyObj.matrix);
      }
      petalMesh.instanceMatrix.needsUpdate = true;
    };
  } else if (dioramaType === 'neo_tokyo') {
    // ==================== NEO-TOKYO CYBER ROOFTOP ====================
    const roofMat = createCelMaterial({ color: 0x0f172a, shadowColor: 0x050814 }, style);
    const metalMat = createCelMaterial({ color: 0x334155, roughness: 0.3 }, style);
    materialsToDispose.push(roofMat, metalMat);

    // Rooftop platform
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 10), roofMat);
    roof.position.set(0, -0.2, 0);
    root.add(roof);

    // Glowing Helipad circle in center
    const heliRingGeo = new THREE.RingGeometry(2.2, 2.3, 32);
    const heliMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    materialsToDispose.push(heliMat);
    const heliRing = new THREE.Mesh(heliRingGeo, heliMat);
    heliRing.rotation.x = -Math.PI / 2;
    heliRing.position.set(0, 0.02, 0);
    root.add(heliRing);

    // Japanese Hologram Billboards
    const signTex1 = createCyberKanjiTexture('電脳侍', 'Cyber Samurai', '#06b6d4');
    const signTex2 = createCyberKanjiTexture('極限斬', 'Limit Break Slash', '#f43f5e');
    const signTex3 = createCyberKanjiTexture('神威', 'Divine Power', '#eab308');
    texturesToDispose.push(signTex1, signTex2, signTex3);

    const createSignMesh = (tex: THREE.Texture, x: number, y: number, z: number, rotY: number) => {
      const signMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
      materialsToDispose.push(signMat);
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), signMat);
      sm.position.set(x, y, z);
      sm.rotation.y = rotY;
      root.add(sm);
      return sm;
    };

    const sign1 = createSignMesh(signTex1, -2.6, 2.0, -2.8, 0.3);
    const sign2 = createSignMesh(signTex2, 2.6, 2.2, -2.5, -0.35);
    const sign3 = createSignMesh(signTex3, 0, 3.4, -3.4, 0);

    // Industrial AC vent units
    const ventBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 1.0), metalMat);
    ventBox.position.set(-3.2, 0.55, 1.2);
    root.add(ventBox);

    // Rotating fan inside vent
    const fanGeo = new THREE.BoxGeometry(0.04, 0.75, 0.12);
    const fanMesh = new THREE.Mesh(fanGeo, metalMat);
    fanMesh.position.set(-2.65, 0.55, 1.2);
    fanMesh.rotation.y = Math.PI / 2;
    root.add(fanMesh);

    // Neon motes / rain sparks
    const sparkGeo = new THREE.BufferGeometry();
    const sparkCount = 300;
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount * 3; i += 3) {
      sparkPos[i] = (Math.random() - 0.5) * 8;
      sparkPos[i + 1] = Math.random() * 5;
      sparkPos[i + 2] = (Math.random() - 0.5) * 8;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
    });
    materialsToDispose.push(sparkMat);
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    root.add(sparkPoints);

    updateFn = (time, delta) => {
      // Fan spin
      fanMesh.rotation.x += delta * 15.0;

      // Hologram billboard floating flicker
      sign1.position.y = 2.0 + Math.sin(time * 2.0) * 0.06;
      sign2.position.y = 2.2 + Math.cos(time * 2.2) * 0.06;
      sign3.position.y = 3.4 + Math.sin(time * 1.8) * 0.08;

      // Rain / sparks fall
      const positions = sparkGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < sparkCount * 3; i += 3) {
        positions[i] -= delta * 3.5;
        if (positions[i] < 0) positions[i] = 5.0;
      }
      sparkGeo.attributes.position.needsUpdate = true;
    };
  } else {
    // ==================== HYPERSPACE / ANIME ACTION VOID ====================
    // Dynamic anime speedlines & magical rotating magic circles (Mahoujin)
    const magicCircleGeo = new THREE.RingGeometry(0.8, 2.6, 48);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    materialsToDispose.push(circleMat);
    const magicCircle = new THREE.Mesh(magicCircleGeo, circleMat);
    magicCircle.rotation.x = -Math.PI / 2;
    magicCircle.position.set(0, 0.03, 0);
    root.add(magicCircle);

    // Outer concentric magic runes
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.8, 3.1, 48), circleMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.set(0, 0.02, 0);
    root.add(outerRing);

    // Speedlines: Multiple long thin cylinders stretching outward
    const speedlineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
    });
    materialsToDispose.push(speedlineMat);

    const speedlineGeo = new THREE.CylinderGeometry(0.015, 0.015, 6, 4);
    speedlineGeo.rotateX(Math.PI / 2);

    const speedlines: THREE.Mesh[] = [];
    for (let i = 0; i < 36; i++) {
      const line = new THREE.Mesh(speedlineGeo, speedlineMat);
      const angle = (i / 36) * Math.PI * 2;
      const radius = 2.5 + Math.random() * 2.0;
      line.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 4.0,
        Math.sin(angle) * radius,
      );
      line.rotation.y = angle;
      root.add(line);
      speedlines.push(line);
    }

    // Floating Celestial Energy Shards
    const shardGeo = new THREE.OctahedronGeometry(0.2, 0);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
    });
    materialsToDispose.push(shardMat);

    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(
        (Math.random() - 0.5) * 6,
        1.0 + Math.random() * 3.5,
        (Math.random() - 0.5) * 6,
      );
      root.add(shard);
      shards.push(shard);
    }

    updateFn = (time, delta) => {
      // Rotate magic circle
      magicCircle.rotation.z = time * 0.8;
      outerRing.rotation.z = -time * 0.4;

      // Speedlines pulsing rush
      speedlines.forEach((sl, idx) => {
        sl.position.z -= delta * 12.0;
        if (sl.position.z < -6.0) sl.position.z = 6.0;
      });

      // Shards rotation
      shards.forEach((s, idx) => {
        s.rotation.x += delta * 1.5;
        s.rotation.y += delta * 2.0;
        s.position.y += Math.sin(time * 2.0 + idx) * 0.005;
      });
    };
  }

  return {
    group: root,
    contactShadow,
    update: updateFn,
    setSakuraDensity: setSakuraFn,
    updateShaderStyle(newStyle) {
      // materials handle style update if needed
    },
    dispose() {
      for (const m of materialsToDispose) m.dispose();
      for (const t of texturesToDispose) t.dispose();
    },
  };
}
