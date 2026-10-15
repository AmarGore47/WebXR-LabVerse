/**
 * labEnvironment.js
 * Sets up a school physics laboratory environment:
 * - Sturdy wooden workbench
 * - Neutral lab floor and walls
 * - Realistic studio-grade PBR lighting with soft contact shadows
 * - Color-managed renderer tone mapping
 */

import * as THREE from 'three';

export class LabEnvironment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.configureRenderer();
    this.createEnvironment();
    this.setupLighting();
  }

  /**
   * Configure color management and tone mapping for natural physics-lab materials.
   */
  configureRenderer() {
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  /**
   * Create lab walls, floor, and wooden workbench.
   */
  createEnvironment() {
    // 1. Atmosphere and background
    this.scene.background = new THREE.Color(0x071526);
    this.scene.fog = new THREE.FogExp2(0x071526, 0.04);

    // 2. Physics laboratory floor (offset slightly below 0 for fallback mode)
    const floorGeo = new THREE.PlaneGeometry(24, 24);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0c1b2c,
      roughness: 0.8,
      metalness: 0.2,
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

    // Floor tile grid (for fallback isolated mode)
    const floorGrid = new THREE.GridHelper(24, 48, 0x1e3a5f, 0x0e243a);
    floorGrid.position.y = 0.002;
    this.scene.add(floorGrid);
    this.floorGrid = floorGrid;

    // 3. Background laboratory wall
    const wallGeo = new THREE.PlaneGeometry(24, 10);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x09182a,
      roughness: 0.9,
      metalness: 0.05
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 5, -5.5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);
    this.backWall = backWall;

    // Wall chalkboard accent panel
    const boardGeo = new THREE.PlaneGeometry(9.0, 2.8);
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0x071e1c, // Subtle dark chalkboard green
      roughness: 0.85,
      metalness: 0.05
    });
    const chalkboard = new THREE.Mesh(boardGeo, boardMat);
    chalkboard.position.set(0, 3.8, -5.46);
    this.scene.add(chalkboard);
    this.chalkboard = chalkboard;

    // Chalkboard wooden border frame
    const frameGeo = new THREE.BoxGeometry(9.16, 2.96, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4a321e, // Teak frame
      roughness: 0.5,
      metalness: 0.1
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 3.8, -5.48);
    this.scene.add(frame);
    this.frame = frame;

    // 4. Sturdy wooden workbench understructure
    // Matches the GLB table bounds (W=2.6m, D=1.4m, H=0.97m)
    this.createWorkbench();
  }

  createWorkbench() {
    const benchGroup = new THREE.Group();
    benchGroup.name = 'WoodenWorkbench';

    // Sturdy solid wood tabletop base
    const topGeo = new THREE.BoxGeometry(2.68, 0.08, 1.48);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x54361e, // Warm teak wood
      roughness: 0.45,
      metalness: 0.08
    });
    const tabletop = new THREE.Mesh(topGeo, woodMat);
    tabletop.position.set(0, 0.93, 0);
    tabletop.castShadow = true;
    tabletop.receiveShadow = true;
    benchGroup.add(tabletop);

    // Steel leg frames
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

    // Cross brace support rails
    const braceGeoX = new THREE.BoxGeometry(2.48, 0.05, 0.05);
    const braceBack = new THREE.Mesh(braceGeoX, steelMat);
    braceBack.position.set(0, 0.25, -0.68);
    benchGroup.add(braceBack);

    this.scene.add(benchGroup);
    this.benchGroup = benchGroup;
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
   * Balanced studio lighting setup for crisp labels, soft shadows, and warm fill.
   */
  setupLighting() {
    // 1. Balanced ambient & hemisphere fill (labels and scale dials remain readable)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f2238, 1.6);
    this.scene.add(hemiLight);

    // 2. Soft overhead white light (main directional sun with contact shadows)
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(2.4, 4.8, 2.0);
    mainLight.castShadow = true;

    // Quest-friendly balanced shadow map (1024x1024 delivers crisp 4.3mm precision with high mobile GPU framerate)
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 10.0;
    mainLight.shadow.camera.left = -2.2;
    mainLight.shadow.camera.right = 2.2;
    mainLight.shadow.camera.top = 2.2;
    mainLight.shadow.camera.bottom = -2.2;
    mainLight.shadow.bias = -0.0004;
    mainLight.shadow.radius = 2.0; // Soft blur
    this.scene.add(mainLight);

    // 3. Gentle warm fill light from opposite angle
    const warmFill = new THREE.DirectionalLight(0xffecd1, 0.85);
    warmFill.position.set(-3.0, 3.5, -1.2);
    this.scene.add(warmFill);

    // 4. Subtle front bounce rim light
    const frontRim = new THREE.DirectionalLight(0x38bdf8, 0.4);
    frontRim.position.set(0, 1.5, 3.5);
    this.scene.add(frontRim);
  }
}
