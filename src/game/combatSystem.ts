import * as THREE from 'three';
import { DamageNumber, ResonatorType } from '../types/game';

export interface CombatHitResult {
  hit: boolean;
  damage: number;
  isCrit: boolean;
  position: THREE.Vector3;
}

export class CombatSystem {
  public targetMesh: THREE.Group;
  public targetPosition = new THREE.Vector3(0, 0, -4.5);
  public targetMaxHp = 100000;
  public targetHp = 100000;
  public targetStagger = 100;
  public hitPause = 0;
  public comboCount = 0;
  public lastHitTime = 0;

  // Visual particles & hit sparks
  private sparkPoints: THREE.Points;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private sparkCount = 120;
  private sparkActiveCount = 0;

  private targetBody: THREE.Mesh;
  private targetCore: THREE.Mesh;
  private targetRing: THREE.Mesh;
  private flinchTimer = 0;

  constructor(private scene: THREE.Scene) {
    this.targetMesh = new THREE.Group();
    this.targetMesh.position.copy(this.targetPosition);

    // Sculpted Tacet Discord Training Golem (鳴式幻象)
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.8,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.8,
      wireframe: true,
    });

    // Central Core Body
    const bodyGeo = new THREE.DodecahedronGeometry(0.7, 1);
    this.targetBody = new THREE.Mesh(bodyGeo, armorMat);
    this.targetBody.position.y = 1.4;
    this.targetMesh.add(this.targetBody);

    // Glowing Tacet Core
    const coreGeo = new THREE.OctahedronGeometry(0.35, 0);
    this.targetCore = new THREE.Mesh(coreGeo, coreMat);
    this.targetCore.position.y = 1.4;
    this.targetMesh.add(this.targetCore);

    // Rotating Sound Wave Ring
    const ringGeo = new THREE.TorusGeometry(1.2, 0.04, 8, 32);
    this.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.targetRing.position.y = 1.4;
    this.targetMesh.add(this.targetRing);

    // Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.1, 0.3, 12);
    const base = new THREE.Mesh(baseGeo, armorMat);
    base.position.y = 0.15;
    this.targetMesh.add(base);

    scene.add(this.targetMesh);

    // Hit Sparks Particle System
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.sparkCount * 3);
    this.sparkVelocities = new Float32Array(this.sparkCount * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.12,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, sparkMat);
    scene.add(this.sparkPoints);
  }

  // Check attack hit against target
  checkHit(
    playerPos: THREE.Vector3,
    attackRadius: number,
    damageBase: number,
    resonator: ResonatorType,
  ): CombatHitResult {
    const dist = playerPos.distanceTo(this.targetPosition);
    if (dist <= attackRadius) {
      const isCrit = Math.random() > 0.35;
      const multiplier = isCrit ? 2.2 : 1.0;
      const dmg = Math.floor((damageBase + Math.random() * (damageBase * 0.3)) * multiplier);

      this.targetHp = Math.max(0, this.targetHp - dmg);
      this.targetStagger = Math.max(0, this.targetStagger - 15);
      this.comboCount++;
      this.lastHitTime = performance.now();
      this.hitPause = 0.05; // 50ms hit stop sensation
      this.flinchTimer = 0.2;

      // Spawn sparks
      this.spawnSparks(this.targetPosition.clone().add(new THREE.Vector3(0, 1.4, 0)));

      return {
        hit: true,
        damage: dmg,
        isCrit,
        position: this.targetPosition.clone().add(new THREE.Vector3(0, 1.5, 0)),
      };
    }

    return { hit: false, damage: 0, isCrit: false, position: new THREE.Vector3() };
  }

  spawnSparks(pos: THREE.Vector3) {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const idx = (this.sparkActiveCount % this.sparkCount) * 3;
      this.sparkPositions[idx] = pos.x;
      this.sparkPositions[idx + 1] = pos.y;
      this.sparkPositions[idx + 2] = pos.z;

      this.sparkVelocities[idx] = (Math.random() - 0.5) * 8.0;
      this.sparkVelocities[idx + 1] = (Math.random() - 0.5) * 8.0 + 2.0;
      this.sparkVelocities[idx + 2] = (Math.random() - 0.5) * 8.0;

      this.sparkActiveCount++;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  update(delta: number, time: number) {
    // Reset combo if no hit for 3.5s
    if (performance.now() - this.lastHitTime > 3500) {
      this.comboCount = 0;
    }

    // Target animation & flinch
    this.targetCore.rotation.y = time * 2.5;
    this.targetCore.rotation.x = time * 1.8;
    this.targetRing.rotation.z = time * 1.5;
    this.targetRing.rotation.x = Math.sin(time) * 0.4;

    if (this.flinchTimer > 0) {
      this.flinchTimer -= delta;
      this.targetBody.position.x = (Math.random() - 0.5) * 0.08;
      this.targetBody.position.z = (Math.random() - 0.5) * 0.08;
    } else {
      this.targetBody.position.set(0, 1.4 + Math.sin(time * 2.0) * 0.05, 0);
    }

    // Spark physics
    for (let i = 0; i < this.sparkCount * 3; i += 3) {
      this.sparkPositions[i] += this.sparkVelocities[i] * delta;
      this.sparkPositions[i + 1] += this.sparkVelocities[i + 1] * delta;
      this.sparkPositions[i + 2] += this.sparkVelocities[i + 2] * delta;
      this.sparkVelocities[i + 1] -= delta * 9.8; // gravity
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.sparkGeo.dispose();
  }
}
