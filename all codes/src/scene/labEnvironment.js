/**
 * labEnvironment.js
 * Sets up a school physics laboratory environment with dynamic theme support:
 * - 'scifi': Tony Stark-style holographic cyberpunk dark lab with:
 *   - Animated pulsing neon LED perimeter ring
 *   - Holographic tabletop CAD grid with scan lines
 *   - Floating glowing particle field
 *   - Deep cyan accent lighting, purple neon fill
 * - 'standard': Classic bright physics lab with balanced studio PBR lighting
 */

import * as THREE from 'three';

export class LabEnvironment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.currentTheme = 'standard'; // Default to classic bright physics laboratory mode
    this.scifiGroup = new THREE.Group();
    this.scifiGroup.name = 'SciFiEnvironmentElements';

    // Track animated elements for update()
    this._neonMat = null;
    this._gridMat = null;
    this._particles = null;
    this._particlePositions = null;
    this._scanLine = null;

    this.configureRenderer();
    this.createEnvironment();
    this.setupLighting();
    this.createSciFiElements();
    this.setTheme(this.currentTheme);
  }

  /**
   * Configure color management and tone mapping for vivid XR materials.
   */
  configureRenderer() {
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Create lab walls, floor, and wooden workbench.
   */
  createEnvironment() {
    // 1. Atmosphere and background
    this.scene.background = new THREE.Color(0x030712);
    this.scene.fog = new THREE.FogExp2(0x030712, 0.042);

    // 2. Physics laboratory floor
    const floorGeo = new THREE.PlaneGeometry(28, 28);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060e1c,
      roughness: 0.75,
      metalness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;

    // Floor tile grid
    const floorGrid = new THREE.GridHelper(28, 56, 0x1e3a5f, 0x0a1a2e);
    floorGrid.position.y = 0.002;
    this.scene.add(floorGrid);
    this.floorGrid = floorGrid;

    // 3. Background laboratory wall
    const wallGeo = new THREE.PlaneGeometry(28, 10);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x07111f,
      roughness: 0.9,
      metalness: 0.05
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 5, -5.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.backWall = backWall;

    // Wall chalkboard accent panel with authentic chalk diagram & formulas
    const boardTexture = this._createChalkboardTexture();
    const boardGeo = new THREE.PlaneGeometry(9.2, 2.9);
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTexture,
      roughness: 0.85,
      metalness: 0.05
    });
    const chalkboard = new THREE.Mesh(boardGeo, boardMat);
    chalkboard.position.set(0, 3.8, -5.46);
    this.scene.add(chalkboard);
    this.chalkboard = chalkboard;

    // Chalkboard wooden border frame
    const frameGeo = new THREE.BoxGeometry(9.36, 3.06, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4a321e,
      roughness: 0.5,
      metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 3.8, -5.48);
    this.scene.add(frame);
    this.frame = frame;

    // 4. Workbench
    this.createWorkbench();
  }

  createWorkbench() {
    const benchGroup = new THREE.Group();
    benchGroup.name = 'WoodenWorkbench';

    const topGeo = new THREE.BoxGeometry(2.68, 0.08, 1.48);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x54361e,
      roughness: 0.45,
      metalness: 0.08
    });
    const tabletop = new THREE.Mesh(topGeo, woodMat);
    tabletop.position.set(0, 0.93, 0);
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    benchGroup.add(tabletop);

    const legGeo = new THREE.BoxGeometry(0.08, 0.93, 0.08);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x2e3842,
      roughness: 0.35,
      metalness: 0.75
    });

    const legPositions = [
      [-1.28, 0.465, -0.68],
      [1.28, 0.465, -0.68],
      [-1.28, 0.465, 0.68],
      [1.28, 0.465, 0.68]
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, steelMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      benchGroup.add(leg);
    });

    const braceGeoX = new THREE.BoxGeometry(2.48, 0.05, 0.05);
    const braceBack = new THREE.Mesh(braceGeoX, steelMat);
    braceBack.position.set(0, 0.25, -0.68);
    benchGroup.add(braceBack);

    this.scene.add(benchGroup);
    this.benchGroup = benchGroup;
  }

  /**
   * Create futuristic Sci-Fi elements:
   * - Animated holographic CAD grid on tabletop
   * - Pulsing neon cyan LED perimeter strip
   * - Floating plasma particle field
   * - Holographic scan line sweeping across table
   */
  createSciFiElements() {
    // ── 1. Tabletop Holographic CAD Grid ──────────────────────────────────
    const tableGridMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.18
    });
    const tableGrid = new THREE.GridHelper(1.85, 24, 0x00c8e0, 0x002233);
    tableGrid.position.set(0, 0.808, 0.06);
    tableGrid.material = tableGridMat;
    this.scifiGroup.add(tableGrid);
    this._gridMat = tableGridMat;

    // ── 1B. Tony Stark Holographic Concentric CAD Rings ───────────────────
    const ringMat1 = new THREE.LineBasicMaterial({ color: 0x00d4e8, transparent: true, opacity: 0.24 });
    const ringGeo1 = new THREE.RingGeometry(0.52, 0.524, 48);
    const cadRingOuter = new THREE.Mesh(ringGeo1, ringMat1);
    cadRingOuter.rotation.x = -Math.PI / 2;
    cadRingOuter.position.set(0, 0.809, 0.06);
    this.scifiGroup.add(cadRingOuter);
    this._cadRingOuter = cadRingOuter;

    const ringMat2 = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 });
    const ringGeo2 = new THREE.RingGeometry(0.28, 0.284, 36);
    const cadRingInner = new THREE.Mesh(ringGeo2, ringMat2);
    cadRingInner.rotation.x = -Math.PI / 2;
    cadRingInner.position.set(0, 0.8095, 0.06);
    this.scifiGroup.add(cadRingInner);
    this._cadRingInner = cadRingInner;

    // ── 2. Neon LED Perimeter Ring ────────────────────────────────────────
    const neonPath = new THREE.CurvePath();
    const halfW = 1.35;
    const halfD = 0.74;
    const neonY = 0.76;

    const np1 = new THREE.Vector3(-halfW, neonY, -halfD);
    const np2 = new THREE.Vector3(halfW, neonY, -halfD);
    const np3 = new THREE.Vector3(halfW, neonY, halfD);
    const np4 = new THREE.Vector3(-halfW, neonY, halfD);

    neonPath.add(new THREE.LineCurve3(np1, np2));
    neonPath.add(new THREE.LineCurve3(np2, np3));
    neonPath.add(new THREE.LineCurve3(np3, np4));
    neonPath.add(new THREE.LineCurve3(np4, np1));

    const neonTubeGeo = new THREE.TubeGeometry(neonPath, 48, 0.007, 8, true);
    const neonMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.92
    });
    const neonStrip = new THREE.Mesh(neonTubeGeo, neonMat);
    this.scifiGroup.add(neonStrip);
    this._neonMat = neonMat;

    // Inner secondary neon ring (purple, slightly below)
    const neonPath2 = new THREE.CurvePath();
    const hw2 = 1.34;
    const hd2 = 0.73;
    const ny2 = 0.758;
    const pp1 = new THREE.Vector3(-hw2, ny2, -hd2);
    const pp2 = new THREE.Vector3(hw2, ny2, -hd2);
    const pp3 = new THREE.Vector3(hw2, ny2, hd2);
    const pp4 = new THREE.Vector3(-hw2, ny2, hd2);
    neonPath2.add(new THREE.LineCurve3(pp1, pp2));
    neonPath2.add(new THREE.LineCurve3(pp2, pp3));
    neonPath2.add(new THREE.LineCurve3(pp3, pp4));
    neonPath2.add(new THREE.LineCurve3(pp4, pp1));
    const neonTube2Geo = new THREE.TubeGeometry(neonPath2, 48, 0.005, 8, true);
    this._neonMat2 = new THREE.MeshBasicMaterial({
      color: 0x8b00ff,
      transparent: true,
      opacity: 0.6
    });
    const neonStrip2 = new THREE.Mesh(neonTube2Geo, this._neonMat2);
    this.scifiGroup.add(neonStrip2);

    // ── 3. Floating Plasma Particle Field ──────────────────────────────────
    const PARTICLE_COUNT = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const initialY = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.2;  // X
      positions[i * 3 + 1] = 0.9 + Math.random() * 1.4;    // Y (above table)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.0;  // Z
      initialY[i] = positions[i * 3 + 1];
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.006,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    this.scifiGroup.add(particles);
    this._particles = particles;
    this._particlePositions = positions;
    this._particleInitialY = initialY;
    this._particleMat = particleMat;

    // ── 4. Holographic Scan Line ───────────────────────────────────────────
    const scanGeo = new THREE.PlaneGeometry(1.85, 0.012);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const scanLine = new THREE.Mesh(scanGeo, scanMat);
    scanLine.rotation.x = -Math.PI / 2;
    scanLine.position.set(0, 0.811, 0.06);
    this.scifiGroup.add(scanLine);
    this._scanLine = scanLine;
    this._scanProgress = 0;

    // ── 5. Neon corner accent posts ───────────────────────────────────────
    const postPositions = [
      [-1.35, 0.97, -0.74],
      [1.35, 0.97, -0.74],
      [-1.35, 0.97, 0.74],
      [1.35, 0.97, 0.74]
    ];
    const postGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 3.5,
      transparent: true,
      opacity: 0.85
    });
    postPositions.forEach(([x, y, z]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x, y, z);
      this.scifiGroup.add(post);
    });

    this.scene.add(this.scifiGroup);
  }

  /**
   * Animate sci-fi elements each frame.
   * Call from the main render loop.
   * @param {number} time - elapsed time in seconds
   */
  update(time) {
    if (this.currentTheme !== 'scifi') return;

    // 1. Pulsing neon ring opacity
    if (this._neonMat) {
      this._neonMat.opacity = 0.7 + Math.sin(time * 3.5) * 0.28;
    }
    if (this._neonMat2) {
      this._neonMat2.opacity = 0.35 + Math.sin(time * 4.2 + 1.5) * 0.22;
    }

    // 2. Holographic grid breathing opacity
    if (this._gridMat) {
      this._gridMat.opacity = 0.18 + Math.sin(time * 2.0) * 0.12;
    }

    // 3. Floating particles drift upward and gently oscillate
    if (this._particles && this._particlePositions) {
      const pos = this._particlePositions;
      const N = pos.length / 3;
      for (let i = 0; i < N; i++) {
        // Gentle upward float
        pos[i * 3 + 1] += 0.00018;
        // Horizontal oscillation
        pos[i * 3] += Math.sin(time * 0.9 + i * 0.4) * 0.00008;

        // Reset when particle drifts too high
        if (pos[i * 3 + 1] > 2.5) {
          pos[i * 3 + 1] = 0.88;
          pos[i * 3] = (Math.random() - 0.5) * 3.2;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 2.0;
        }
      }
      this._particles.geometry.attributes.position.needsUpdate = true;
      // Particle brightness pulse
      if (this._particleMat) {
        this._particleMat.opacity = 0.5 + Math.sin(time * 2.5) * 0.28;
      }
    }

    // 4. Scan line sweeping across the table from back to front
    if (this._scanLine) {
      this._scanProgress = (this._scanProgress + 0.004) % 1.0;
      const zRange = 0.72;
      this._scanLine.position.z = -zRange + this._scanProgress * (zRange * 2);
      // Fade out at edges
      const edgeFade = 1.0 - Math.abs(this._scanProgress - 0.5) * 2;
      this._scanLine.material.opacity = edgeFade * 0.55;
    }

    // 5. Tony Stark CAD Reticle Rings Rotation
    if (this._cadRingOuter) {
      this._cadRingOuter.rotation.z = time * 0.35;
    }
    if (this._cadRingInner) {
      this._cadRingInner.rotation.z = -time * 0.55;
    }
  }

  /**
   * Hide duplicate procedural table & walls when a high-detail GLB room model is loaded.
   */
  adaptToGLBRoom(hasRoomModel = true) {
    if (this.benchGroup) {
      this.benchGroup.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.benchGroup);
      else if (!this.scene.children.includes(this.benchGroup)) this.scene.add(this.benchGroup);
    }
    if (this.backWall) {
      this.backWall.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.backWall);
      else if (!this.scene.children.includes(this.backWall)) this.scene.add(this.backWall);
    }
    if (this.chalkboard) {
      this.chalkboard.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.chalkboard);
      else if (!this.scene.children.includes(this.chalkboard)) this.scene.add(this.chalkboard);
    }
    if (this.frame) {
      this.frame.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.frame);
      else if (!this.scene.children.includes(this.frame)) this.scene.add(this.frame);
    }
    if (this.floor) {
      this.floor.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.floor);
      else if (!this.scene.children.includes(this.floor)) this.scene.add(this.floor);
    }
    if (this.floorGrid) {
      this.floorGrid.visible = !hasRoomModel;
      if (hasRoomModel) this.scene.remove(this.floorGrid);
      else if (!this.scene.children.includes(this.floorGrid)) this.scene.add(this.floorGrid);
    }
  }

  /**
   * Studio lighting setup for crisp labels, soft shadows, and warm fill.
   */
  setupLighting() {
    // 1. Hemisphere fill
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f2238, 1.6);
    this.scene.add(this.hemiLight);

    // 2. Main directional sun with contact shadows
    this.mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    this.mainLight.position.set(2.4, 4.8, 2.0);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 10.0;
    // Expanded shadow bounds to encompass student right side assistant at x=1.92
    this.mainLight.shadow.camera.left = -2.8;
    this.mainLight.shadow.camera.right = 2.8;
    this.mainLight.shadow.camera.top = 2.4;
    this.mainLight.shadow.camera.bottom = -2.4;
    this.mainLight.shadow.bias = -0.0004;
    this.mainLight.shadow.radius = 2.0;
    this.scene.add(this.mainLight);

    // 3. Warm fill light
    this.warmFill = new THREE.DirectionalLight(0xffecd1, 0.85);
    this.warmFill.position.set(-3.0, 3.5, -1.2);
    this.scene.add(this.warmFill);

    // 4. Front bounce rim light
    this.frontRim = new THREE.DirectionalLight(0x38bdf8, 0.4);
    this.frontRim.position.set(0, 1.5, 3.5);
    this.scene.add(this.frontRim);

    // 5. Sci-Fi soft under-table ambient uplight (placed UNDER the workbench, not on top)
    this.scifiTableLight = new THREE.PointLight(0x00f0ff, 0, 3.2, 2.0);
    this.scifiTableLight.position.set(0, 0.40, 0);
    this.scene.add(this.scifiTableLight);

    // 6. Sci-Fi purple accent fill from high above
    this.scifiPurpleLight = new THREE.PointLight(0x8b00ff, 0, 4.0, 2.0);
    this.scifiPurpleLight.position.set(-0.8, 2.4, 0.5);
    this.scene.add(this.scifiPurpleLight);

    // 7. Dedicated Lightweight Portrait Key & Rim Light for Assistant (Meta Quest safe)
    // Directly illuminates character at x=1.92 without expensive post-processing or overhead
    this.assistantKeyLight = new THREE.DirectionalLight(0xfff7ed, 0.75);
    this.assistantKeyLight.position.set(2.6, 2.5, 1.8);
    this.assistantKeyLight.target.position.set(1.92, 1.25, 0.65);
    this.scene.add(this.assistantKeyLight);
    this.scene.add(this.assistantKeyLight.target);

    this.assistantRimLight = new THREE.DirectionalLight(0x93c5fd, 0.40);
    this.assistantRimLight.position.set(1.1, 2.2, -0.2);
    this.assistantRimLight.target.position.set(1.92, 1.25, 0.65);
    this.scene.add(this.assistantRimLight);
    this.scene.add(this.assistantRimLight.target);
  }

  /**
   * Toggle or set the environment theme.
   * @param {'scifi' | 'standard'} themeName
   */
  setTheme(themeName) {
    this.currentTheme = themeName === 'standard' ? 'standard' : 'scifi';

    if (this.currentTheme === 'scifi') {
      // 🌌 Futuristic Cyberpunk / Tony Stark Mode
      this.scene.background = new THREE.Color(0x020813);
      this.scene.fog = new THREE.FogExp2(0x020813, 0.038);

      if (this.renderer) {
        this.renderer.toneMappingExposure = 1.02;
      }

      // Crisp directional key light so apparatus models remain razor-sharp and visible
      if (this.mainLight) this.mainLight.intensity = 0.85;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0x38bdf8);
        this.hemiLight.groundColor.setHex(0x0a101d);
        this.hemiLight.intensity = 0.65;
      }
      if (this.warmFill) {
        this.warmFill.color.setHex(0xa855f7); // Soft purple fill
        this.warmFill.intensity = 0.50;
      }
      if (this.frontRim) {
        this.frontRim.color.setHex(0x00f0ff);
        this.frontRim.intensity = 0.65;
      }
      // Gentle under-table glow (soft, zero glare on tabletop)
      if (this.scifiTableLight) this.scifiTableLight.intensity = 0.45;
      if (this.scifiPurpleLight) this.scifiPurpleLight.intensity = 0.70;
      if (this.scifiGroup) this.scifiGroup.visible = true;
    } else {
      // 🏛️ Classic Standard Daylight Mode
      this.scene.background = new THREE.Color(0x071526);
      this.scene.fog = new THREE.FogExp2(0x071526, 0.038);

      if (this.renderer) {
        this.renderer.toneMappingExposure = 1.08;
      }

      if (this.mainLight) this.mainLight.intensity = 2.2;
      if (this.hemiLight) {
        this.hemiLight.color.setHex(0xe0f2fe);
        this.hemiLight.groundColor.setHex(0x0f2238);
        this.hemiLight.intensity = 1.6;
      }
      if (this.warmFill) {
        this.warmFill.color.setHex(0xffecd1);
        this.warmFill.intensity = 0.85;
      }
      if (this.frontRim) {
        this.frontRim.color.setHex(0x38bdf8);
        this.frontRim.intensity = 0.4;
      }
      if (this.scifiTableLight) this.scifiTableLight.intensity = 0;
      if (this.scifiPurpleLight) this.scifiPurpleLight.intensity = 0;
      if (this.scifiGroup) this.scifiGroup.visible = false;
    }

    return this.currentTheme;
  }

  _createChalkboardTexture() {
    if (typeof document === 'undefined') return new THREE.Texture();
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Deep matte chalkboard slate green
    ctx.fillStyle = '#061a15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle chalk dust smudges & texture noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        80 + Math.random() * 200,
        20 + Math.random() * 60,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Top Header Banner
    ctx.fillStyle = '#fef08a'; // Pale yellow chalk
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("MAHARASHTRA STATE BOARD · STD. 10 PHYSICS PRACTICAL", canvas.width / 2, 45);

    ctx.fillStyle = '#ffffff'; // White chalk
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillText("EXPERIMENT: VERIFICATION OF OHM'S LAW (V = I × R)", canvas.width / 2, 90);

    // Underline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 480, 105);
    ctx.lineTo(canvas.width / 2 + 480, 105);
    ctx.stroke();

    // Left Column: Scientific Aim & Principle
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7dd3fc'; // Soft cyan chalk
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText("📌 AIM & SCIENTIFIC PRINCIPLE", 60, 150);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText("• Statement: At constant temperature, Current (I) is directly", 60, 190);
    ctx.fillText("  proportional to Potential Difference (V) across conductor.", 60, 220);

    // Formula Box
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 245, 460, 100);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText("V ∝ I   ⟹   V / I = R (Constant)", 80, 290);
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText("R = Measured Resistance in Ohms (Ω)", 80, 325);

    // Precautions
    ctx.fillStyle = '#fca5a5'; // Soft red chalk
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText("⚠️ CRITICAL PRECAUTIONS:", 60, 390);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText("1. Ammeter: Always in SERIES with circuit (low resistance)", 60, 425);
    ctx.fillText("2. Voltmeter: Always in PARALLEL across Resistor", 60, 455);
    ctx.fillText("3. Open Plug Key when not recording to prevent heating!", 60, 485);
    ctx.fillText("4. Clean and tighten all terminal connections.", 60, 515);

    // Center Column: Chalk Circuit Diagram
    const cx = canvas.width / 2 - 30;
    const cy = 340;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;

    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("⚡ SCHEMATIC CIRCUIT DIAGRAM", cx + 70, 150);

    // Outer Loop
    ctx.beginPath();
    ctx.rect(cx - 210, cy - 130, 560, 240);
    ctx.stroke();

    // Component labels in chalk
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillText("🔋 Battery (6V)", cx - 210, cy);
    ctx.fillText("🔑 Key (K)", cx + 70, cy + 135);
    ctx.fillText("〰 Rheostat (Rh)", cx + 350, cy);
    ctx.fillText("⚡ Ammeter (A)", cx - 70, cy - 135);
    ctx.fillText("📦 Resistor (R)", cx + 180, cy - 135);

    // Voltmeter branch in parallel
    ctx.strokeStyle = '#fef08a';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(cx + 100, cy - 130);
    ctx.lineTo(cx + 100, cy - 60);
    ctx.lineTo(cx + 260, cy - 60);
    ctx.lineTo(cx + 260, cy - 130);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fef08a';
    ctx.fillText("📊 Voltmeter (V) [Parallel]", cx + 180, cy - 70);

    // Right Column: Procedure & V-I Graph
    const rx = canvas.width - 560;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText("📈 V–I GRAPH & VERIFICATION", rx, 150);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText("1. Adjust Rheostat slider for 5 distinct currents.", rx, 190);
    ctx.fillText("2. Note Ammeter (I) & Voltmeter (V) readings.", rx, 220);
    ctx.fillText("3. Plot V (Y-axis) vs I (X-axis).", rx, 250);
    ctx.fillText("4. Straight line through (0,0) verifies Ohm's Law!", rx, 280);

    // Miniature Graph Chalk Sketch
    const gx = rx + 30;
    const gy = 520;
    const gw = 380;
    const gh = 180;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(gx, gy - gh);
    ctx.lineTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();

    // Arrows
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillText("V (Volts) ↑", gx + 10, gy - gh + 15);
    ctx.fillText("I (Amperes) →", gx + gw - 85, gy - 10);
    ctx.fillText("(0,0)", gx - 35, gy + 15);

    // Straight line
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw - 30, gy - gh + 20);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillText("Slope = ΔV/ΔI = Constant R", gx + 60, gy - gh + 60);

    // Plotted points
    for (let p = 1; p <= 5; p++) {
      const px = gx + p * 60;
      const py = gy - p * 28;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  toggleTheme() {
    return this.setTheme(this.currentTheme === 'scifi' ? 'standard' : 'scifi');
  }
}


