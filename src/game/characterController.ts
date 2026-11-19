import * as THREE from 'three';
import { CharacterState, ResonatorType } from '../types/game';
import { createCelestialSilkTexture, createWuwaFaceTexture } from '../utils/wuwaTextures';

export class ResonatorController {
  public group: THREE.Group;
  public state: CharacterState = 'idle';
  public velocity = new THREE.Vector3();
  public position = new THREE.Vector3(0, 0, 0);
  public rotationY = 0;
  public targetRotationY = 0;
  public isGrounded = true;

  // Combo system
  public comboStep = 0;
  public comboTimer = 0;
  public attackTimer = 0;

  // Mesh nodes for procedural animation
  private torso: THREE.Group;
  private head: THREE.Group;
  private hairBack: THREE.Group;
  private ribbonGroup: THREE.Group;
  private ribbonL: THREE.Mesh;
  private ribbonR: THREE.Mesh;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private skirt: THREE.Mesh;
  private weaponMesh: THREE.Mesh;
  private swordTrail: THREE.Mesh;
  private swordTrailMat: THREE.MeshBasicMaterial;

  // Visual materials
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private geometries: THREE.BufferGeometry[] = [];

  // Hair & Ribbon spring physics
  private hairLag = 0;
  private ribbonLag = new THREE.Vector3();

  constructor(public type: ResonatorType) {
    this.group = new THREE.Group();
    this.group.name = `Resonator_Player_${type}`;

    // Textures
    const faceTex = createWuwaFaceTexture(
      type === 'changli' ? '#f43f5e' : type === 'jinhsi' ? '#38bdf8' : '#60a5fa',
    );
    const silkTex = createCelestialSilkTexture();
    this.textures.push(faceTex, silkTex);

    // Color definitions
    const hairColor = type === 'jinhsi' ? 0xf8fafc : type === 'changli' ? 0xfecdd3 : 0xfae8b6;
    const ribbonGlow = type === 'changli' ? 0xf43f5e : type === 'jinhsi' ? 0x06b6d4 : 0x38bdf8;

    // Materials: High-end smooth Anime Cel Shading
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffede1,
      roughness: 0.35,
      metalness: 0.05,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.45,
      metalness: 0.1,
    });
    const dressWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1,
    });
    const dressBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.15,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.15,
      metalness: 0.85,
    });
    const tiaraMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: ribbonGlow,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const silkMat = new THREE.MeshStandardMaterial({
      map: silkTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.3,
    });
    const faceMat = new THREE.MeshBasicMaterial({
      map: faceTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });

    this.materials.push(skinMat, hairMat, dressWhiteMat, dressBlackMat, goldMat, tiaraMat, silkMat, faceMat);

    // ==================== ANATOMY & RIG SETUP ====================
    // 1. Torso
    this.torso = new THREE.Group();
    this.torso.position.y = 1.35;
    this.group.add(this.torso);

    const chestGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.42, 16);
    this.geometries.push(chestGeo);
    const chest = new THREE.Mesh(chestGeo, dressBlackMat);
    chest.position.y = 0.15;
    this.torso.add(chest);

    // White silk tabard drape
    const tabardGeo = new THREE.BoxGeometry(0.28, 0.52, 0.32);
    this.geometries.push(tabardGeo);
    const tabard = new THREE.Mesh(tabardGeo, dressWhiteMat);
    tabard.position.set(0, 0.1, 0.02);
    this.torso.add(tabard);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 12), skinMat);
    neck.position.y = 0.42;
    this.torso.add(neck);

    // 2. Head & Anime Hair
    this.head = new THREE.Group();
    this.head.position.y = 0.56;
    this.torso.add(this.head);

    const headGeo = new THREE.SphereGeometry(0.2, 20, 20);
    headGeo.scale(0.9, 1.15, 0.92);
    this.geometries.push(headGeo);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.12;
    this.head.add(headMesh);

    const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.32), faceMat);
    facePlane.position.set(0, 0.14, 0.19);
    this.head.add(facePlane);

    // Elven Ears
    const earGeo = new THREE.ConeGeometry(0.05, 0.26, 4);
    earGeo.rotateZ(Math.PI / 2.8);
    this.geometries.push(earGeo);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.2, 0.13, -0.02);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.2, 0.13, -0.02);
    earR.rotation.y = Math.PI;
    this.head.add(earL, earR);

    // Crystal Tiara
    const tiaraGeo = new THREE.TorusGeometry(0.18, 0.012, 6, 20, Math.PI);
    tiaraGeo.rotateX(Math.PI / 2);
    this.geometries.push(tiaraGeo);
    const tiara = new THREE.Mesh(tiaraGeo, tiaraMat);
    tiara.position.set(0, 0.24, 0.08);
    this.head.add(tiara);

    // Front Bangs
    const bangs = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 5), hairMat);
    bangs.rotation.x = Math.PI;
    bangs.position.set(0, 0.25, 0.15);
    this.head.add(bangs);

    // Flowing Back Hair (animated with momentum)
    this.hairBack = new THREE.Group();
    this.hairBack.position.set(0, 0.18, -0.1);
    this.head.add(this.hairBack);

    for (let i = 0; i < 5; i++) {
      const lockGeo = new THREE.CylinderGeometry(0.06, 0.015, 1.0, 5);
      this.geometries.push(lockGeo);
      const lock = new THREE.Mesh(lockGeo, hairMat);
      const angle = ((i - 2) / 2) * 0.6;
      lock.position.set(Math.sin(angle) * 0.18, -0.45, -Math.cos(angle) * 0.08);
      lock.rotation.set(-0.15, 0, -angle * 0.3);
      this.hairBack.add(lock);
    }

    // 3. Floating Celestial Ribbons (trailing behind with verlet wave physics)
    this.ribbonGroup = new THREE.Group();
    this.torso.add(this.ribbonGroup);

    const curveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.1, 0.1),
      new THREE.Vector3(-0.7, 0.2, 0.2),
      new THREE.Vector3(-1.1, -0.2, 0.1),
      new THREE.Vector3(-1.3, -0.5, -0.3),
      new THREE.Vector3(-0.9, -0.8, -0.5),
    ]);
    const ribbonGeoL = new THREE.TubeGeometry(curveL, 24, 0.12, 6, false);
    ribbonGeoL.scale(1.0, 0.1, 1.0);
    this.geometries.push(ribbonGeoL);
    this.ribbonL = new THREE.Mesh(ribbonGeoL, silkMat);
    this.ribbonGroup.add(this.ribbonL);

    const curveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.25, 0.1, 0.1),
      new THREE.Vector3(0.65, 0.3, 0.2),
      new THREE.Vector3(1.1, 0.4, -0.1),
      new THREE.Vector3(1.4, 0.2, -0.4),
      new THREE.Vector3(1.2, -0.1, -0.6),
    ]);
    const ribbonGeoR = new THREE.TubeGeometry(curveR, 24, 0.12, 6, false);
    ribbonGeoR.scale(1.0, 0.1, 1.0);
    this.geometries.push(ribbonGeoR);
    this.ribbonR = new THREE.Mesh(ribbonGeoR, silkMat);
    this.ribbonGroup.add(this.ribbonR);

    // 4. Skirt & Legs
    const skirtGeo = new THREE.ConeGeometry(0.32, 0.38, 14, 1, true);
    skirtGeo.rotateX(Math.PI);
    this.geometries.push(skirtGeo);
    this.skirt = new THREE.Mesh(skirtGeo, dressWhiteMat);
    this.skirt.position.y = -0.1;
    this.torso.add(this.skirt);

    // Leg Left
    this.legL = new THREE.Group();
    this.legL.position.set(-0.11, -0.18, 0);
    this.torso.add(this.legL);

    const thighGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.5, 12);
    this.geometries.push(thighGeo);
    const thighL = new THREE.Mesh(thighGeo, skinMat);
    thighL.position.y = -0.22;
    this.legL.add(thighL);

    const calfGeo = new THREE.CylinderGeometry(0.055, 0.042, 0.54, 12);
    this.geometries.push(calfGeo);
    const calfL = new THREE.Mesh(calfGeo, skinMat);
    calfL.position.y = -0.7;
    this.legL.add(calfL);

    // Leg Right
    this.legR = new THREE.Group();
    this.legR.position.set(0.11, -0.18, 0);
    this.torso.add(this.legR);

    const thighR = new THREE.Mesh(thighGeo, skinMat);
    thighR.position.y = -0.22;
    this.legR.add(thighR);

    const calfR = new THREE.Mesh(calfGeo, skinMat);
    calfR.position.y = -0.7;
    this.legR.add(calfR);

    // 5. Arms & Weapon
    this.armL = new THREE.Group();
    this.armL.position.set(-0.25, 0.28, 0);
    this.torso.add(this.armL);

    const armGeo = new THREE.CylinderGeometry(0.042, 0.035, 0.65, 10);
    this.geometries.push(armGeo);
    const armMeshL = new THREE.Mesh(armGeo, skinMat);
    armMeshL.position.y = -0.32;
    this.armL.add(armMeshL);

    this.armR = new THREE.Group();
    this.armR.position.set(0.25, 0.28, 0);
    this.torso.add(this.armR);

    const armMeshR = new THREE.Mesh(armGeo, skinMat);
    armMeshR.position.y = -0.32;
    this.armR.add(armMeshR);

    // Celestial Blade Weapon
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.25, 0.02);
    bladeGeo.translate(0, 0.6, 0);
    this.geometries.push(bladeGeo);
    this.weaponMesh = new THREE.Mesh(bladeGeo, tiaraMat);
    this.weaponMesh.position.set(0, -0.65, 0);
    this.armR.add(this.weaponMesh);

    // Dynamic Attack Trail Arc
    const trailGeo = new THREE.RingGeometry(0.8, 1.4, 24, 1, 0, Math.PI * 0.85);
    this.geometries.push(trailGeo);
    this.swordTrailMat = new THREE.MeshBasicMaterial({
      color: ribbonGlow,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.materials.push(this.swordTrailMat);
    this.swordTrail = new THREE.Mesh(trailGeo, this.swordTrailMat);
    this.swordTrail.rotation.x = Math.PI / 2;
    this.swordTrail.position.set(0, 1.2, 0.3);
    this.group.add(this.swordTrail);
  }

  // Locomotion update with smooth physics
  update(
    delta: number,
    time: number,
    moveInput: { x: number; y: number; isSprinting: boolean; isDodging: boolean; isJumping: boolean },
    cameraForward: THREE.Vector3,
    cameraRight: THREE.Vector3,
  ) {
    // Process input direction in world space
    const moveDir = new THREE.Vector3();
    if (moveInput.x !== 0 || moveInput.y !== 0) {
      moveDir.addScaledVector(cameraForward, moveInput.y);
      moveDir.addScaledVector(cameraRight, moveInput.x);
      moveDir.y = 0;
      moveDir.normalize();
    }

    const isMoving = moveDir.lengthSq() > 0.01;

    // State handling
    if (this.state.startsWith('attack') || this.state === 'skill' || this.state === 'liberation') {
      this.attackTimer += delta;

      // Trail flash
      this.swordTrailMat.opacity = Math.max(0, 0.85 - this.attackTimer * 2.2);
      this.swordTrail.rotation.z += delta * 14.0;

      if (this.attackTimer > 0.45) {
        this.state = 'idle';
        this.swordTrailMat.opacity = 0;
      }
    } else if (moveInput.isDodging && this.state !== 'dodge') {
      this.state = 'dodge';
      this.attackTimer = 0;
      // High speed flash dodge burst
      this.velocity.copy(moveDir.clone().multiplyScalar(16.0));
    } else if (this.state === 'dodge') {
      this.attackTimer += delta;
      this.position.addScaledVector(this.velocity, delta);
      this.velocity.multiplyScalar(0.88);

      if (this.attackTimer > 0.28) {
        this.state = isMoving ? (moveInput.isSprinting ? 'sprint' : 'run') : 'idle';
      }
    } else if (isMoving) {
      this.targetRotationY = Math.atan2(moveDir.x, moveDir.z);

      const speed = moveInput.isSprinting ? 9.5 : 5.2;
      this.state = moveInput.isSprinting ? 'sprint' : 'run';

      this.velocity.x = moveDir.x * speed;
      this.velocity.z = moveDir.z * speed;
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
    } else {
      this.state = 'idle';
      this.velocity.set(0, 0, 0);
    }

    // Boundary check within arena radius
    const distFromOrigin = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (distFromOrigin > 18.0) {
      this.position.normalize().multiplyScalar(18.0);
    }

    // Smooth rotational damping
    let diff = this.targetRotationY - this.rotationY;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotationY += diff * Math.min(1.0, delta * 12.0);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // ==================== LIVING PROCEDURAL ANIMATION ====================
    if (this.state === 'idle') {
      const breath = Math.sin(time * 2.5) * 0.015;
      this.torso.position.y = 1.35 + breath;
      this.head.rotation.x = Math.sin(time * 1.2) * 0.03;
      this.armL.rotation.set(0.1, 0, 0.15);
      this.armR.rotation.set(0.1, 0, -0.15);
      this.legL.rotation.set(0, 0, 0);
      this.legR.rotation.set(0, 0, 0);
      this.skirt.rotation.x = 0;
    } else if (this.state === 'run' || this.state === 'sprint') {
      const freq = this.state === 'sprint' ? 14.0 : 8.5;
      const legSwing = Math.sin(time * freq) * (this.state === 'sprint' ? 0.75 : 0.5);
      const bob = Math.abs(Math.sin(time * freq)) * 0.06;

      this.torso.position.y = 1.35 + bob;
      this.torso.rotation.x = this.state === 'sprint' ? 0.22 : 0.12; // Forward lean
      this.head.rotation.x = -this.torso.rotation.x * 0.8;

      this.legL.rotation.x = legSwing;
      this.legR.rotation.x = -legSwing;
      this.armL.rotation.x = -legSwing * 0.9;
      this.armR.rotation.x = legSwing * 0.9;

      this.skirt.rotation.x = legSwing * 0.2;
    } else if (this.state.startsWith('attack')) {
      // Dynamic combat slash postures
      if (this.state === 'attack1') {
        this.armR.rotation.set(-1.2, 0.8, 1.2);
        this.armL.rotation.set(0.4, -0.3, -0.5);
        this.torso.rotation.set(0.1, 0.4, 0);
      } else if (this.state === 'attack2') {
        this.armR.rotation.set(-1.6, -0.6, -0.4);
        this.armL.rotation.set(-0.6, 0.4, -0.8);
        this.torso.rotation.set(-0.1, -0.5, 0);
      } else if (this.state === 'attack3') {
        this.armR.rotation.set(-1.4, 1.2, 0.8);
        this.torso.rotation.y += delta * 12.0;
      } else {
        // Attack 4 celestial impact
        this.armR.rotation.set(-1.8, 0, 0.2);
        this.torso.position.y = 1.45;
      }
    }

    // Dynamic Hair & Ribbon Verlet Inertia Lag
    const speedMagnitude = this.velocity.length();
    this.hairLag = THREE.MathUtils.lerp(this.hairLag, speedMagnitude * 0.08, delta * 8.0);
    this.hairBack.rotation.x = -0.15 - this.hairLag + Math.sin(time * 6.0) * 0.05;

    // Twin ribbons trail gracefully behind in the wind
    const ribbonWave = Math.sin(time * 5.0) * 0.15;
    this.ribbonL.rotation.z = -this.hairLag * 1.5 + ribbonWave;
    this.ribbonR.rotation.z = this.hairLag * 1.5 - ribbonWave;
    this.ribbonGroup.rotation.y = THREE.MathUtils.lerp(this.ribbonGroup.rotation.y, -diff * 0.5, delta * 6.0);
  }

  // Trigger basic attack combo step
  triggerAttack(): number {
    this.attackTimer = 0;
    this.comboStep = (this.comboStep % 4) + 1;
    this.state = `attack${this.comboStep}` as CharacterState;

    this.swordTrailMat.opacity = 0.9;
    this.swordTrail.rotation.set(
      Math.PI / 2 + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      Math.random() * Math.PI,
    );

    return this.comboStep;
  }

  // Trigger Resonance Skill
  triggerSkill() {
    this.state = 'skill';
    this.attackTimer = 0;
    this.swordTrailMat.opacity = 1.0;
    this.velocity.set(
      Math.sin(this.rotationY) * 12.0,
      0,
      Math.cos(this.rotationY) * 12.0,
    );
  }

  // Trigger Resonance Liberation
  triggerLiberation() {
    this.state = 'liberation';
    this.attackTimer = 0;
    this.swordTrailMat.opacity = 1.0;
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}
