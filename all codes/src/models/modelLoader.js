/**
 * modelLoader.js
 * Loads 3D laboratory environment & apparatus (labroom.glb / ohmslawmodels.glb)
 * from production-safe public paths, inspects scene hierarchy,
 * preserves relative object positions, and ensures seamless alignment.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const UNTITLED_MODEL_PATH = '/models/Untitled.glb';
export const LAB_ROOM_MODEL_PATH = UNTITLED_MODEL_PATH;
export const OHMS_LAW_MODEL_PATH = UNTITLED_MODEL_PATH;
export const CANONICAL_MODEL_PATH = UNTITLED_MODEL_PATH;

export class ModelLoader {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.model = null;
    this.inspectionSummary = null;
    this.wireMeshes = [];
    this.loadStatus = 'unloaded'; // 'unloaded' | 'loading' | 'loaded' | 'failed'
    this.loadedPath = null;
    this.loadError = null;
    this.isFullRoom = false;
    this.onRoomLoaded = options.onRoomLoaded || (() => {});
  }

  /**
   * Load the 3D lab environment & apparatus model.
   * Loads the comprehensive Untitled.glb environment.
   */
  async load(onProgress = () => {}, onError = () => {}) {
    this.loadStatus = 'loading';

    const candidatePaths = [UNTITLED_MODEL_PATH];
    let lastError = null;

    for (const path of candidatePaths) {
      try {
        const gltf = await new Promise((resolve, reject) => {
          this.loader.load(
            path,
            (loadedGltf) => resolve(loadedGltf),
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                const percent = Math.round((xhr.loaded / xhr.total) * 100);
                onProgress(percent);
              }
            },
            (err) => reject(err)
          );
        });

        this.loadStatus = 'loaded';
        this.loadedPath = path;
        this.processModel(gltf);
        return gltf;
      } catch (err) {
        lastError = err;
        console.warn(`[ModelLoader] Candidate path ${path} failed.`, err);
      }
    }

    this.loadStatus = 'failed';
    this.loadError = lastError;
    const userMessage = `Could not load 3D laboratory environment. Please ensure Untitled.glb exists in public/models/.`;
    console.error(userMessage, lastError);
    onError(new Error(userMessage));
    this.createFallbackPlaceholder();
    return null;
  }

  /**
   * Process and inspect the loaded GLTF scene.
   */
  processModel(gltf) {
    this.model = gltf.scene;

    const meshList = [];
    const materialSet = new Set();
    const identifiedApparatus = {
      battery: [],
      switchKey: [],
      ammeter: [],
      voltmeter: [],
      resistor: [],
      rheostat: [],
      table: [],
      wires: [],
      room: [],
      other: []
    };

    // Traverse nodes, configure shadows, and identify apparatus
    this.model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;

        const mats = Array.isArray(node.material) ? node.material : (node.material ? [node.material] : []);
        mats.forEach((m) => {
          materialSet.add(m.name || 'Unnamed Material');
          m.roughness = Math.min(m.roughness, 0.65);
          m.envMapIntensity = 1.0;

          // 1. Front-side culling for opaque geometry to eliminate double-sided face z-fighting
          const isGlass = m.name === 'InstrumentGlass' || m.name === 'OpticalSlabGlass' || (m.name && m.name.toLowerCase().includes('glass'));
          if (isGlass) {
            m.transparent = true;
            m.depthWrite = false;
          } else if (!m.transparent) {
            m.side = THREE.FrontSide;
          }
        });

        const name = node.name || 'Unnamed Mesh';
        meshList.push(name);
        const lower = name.toLowerCase();

        // 1. Check for connecting wires FIRST (hide pre-baked static leads)
        const isConnectingWire = (lower.includes('wire') || lower.includes('lead')) && !lower.includes('ceramic') && !lower.includes('resistance_wire');
        if (isConnectingWire) {
          identifiedApparatus.wires.push(name);
          node.visible = false;
          this.wireMeshes.push(node);
        } else if (name === 'Plane' || name === 'Plane.001' || name === 'Plane.002') {
          // Hide orphan untextured Blender plane placeholders on the floor that cause Z-fighting
          node.visible = false;
        } else if (name === 'StartCurrentButton' || name === 'StartButton_base' || name === 'StartButton_trim') {
          // Hide duplicate static button from Blender model so interactive StartCurrentButton is used cleanly without Z-fighting
          node.visible = false;
        } else if (name === 'Lab_Floor_Base') {
          // Push floor base slab down by 0.05m so tiles (y = 0.002) never z-fight against it
          node.position.y -= 0.05;
          identifiedApparatus.room.push(name);
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = 5.0;
            m.polygonOffsetUnits = 5.0;
            m.depthWrite = true;
          });
        } else if (lower.includes('floor')) {
          identifiedApparatus.room.push(name);
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = 1.0;
            m.polygonOffsetUnits = 1.0;
            m.depthWrite = true;
          });
        } else if (lower.includes('power supply') || (lower.includes('terminal') && (lower.includes('positive') || lower.includes('negative'))) || lower.includes('6.0 v') || lower.includes('60_v')) {
          identifiedApparatus.battery.push(name);
        } else if (lower.includes('switch') || lower.includes('plug key')) {
          identifiedApparatus.switchKey.push(name);
        } else if (lower.includes('ammeter')) {
          identifiedApparatus.ammeter.push(name);
        } else if (lower.includes('voltmeter')) {
          identifiedApparatus.voltmeter.push(name);
        } else if (lower.includes('resistor') || lower.includes('resistance coil') || lower.includes('resistance wire') || lower.includes('resistance_wire')) {
          identifiedApparatus.resistor.push(name);
        } else if (lower.includes('rheostat')) {
          identifiedApparatus.rheostat.push(name);
        } else if (lower.includes('table') || lower.includes('leg') || lower.includes('work surface') || lower.includes('trim')) {
          identifiedApparatus.table.push(name);
        } else if (lower.includes('wall') || lower.includes('ceiling') || lower.includes('shelf') || lower.includes('cabinet') || lower.includes('counter') || lower.includes('sign') || lower.includes('board') || lower.includes('beaker') || lower.includes('lens')) {
          identifiedApparatus.room.push(name);
        } else {
          identifiedApparatus.other.push(name);
        }

        // 2. Prevent Z-fighting on tabletop bases, coplanar decals, lines, text, diagram boxes, dials, and labels
        const isTableTopMesh = lower.includes('tabletop');
        const isPlinthOrBase = lower.includes('plinth') || (lower.includes('base') && !lower.includes('floor')) || lower.includes('resistorboard');
        const isHighDecal = lower.includes('line_') || lower.includes('tick') || lower.includes('needle') || lower.includes('title') || lower.includes('signtext');
        const isMidDecal = lower.includes('headerband') || lower.includes('diagrambox') || lower.includes('dial_plate') || lower.includes('label');

        if (isTableTopMesh) {
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = 1.5;
            m.polygonOffsetUnits = 1.5;
            m.depthWrite = true;
          });
        } else if (isHighDecal) {
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = -5.0; // Pulls top-level text/ticks forward
            m.polygonOffsetUnits = -5.0;
            m.depthTest = true;
          });
        } else if (isMidDecal) {
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = -2.5; // Intermediate header/banner plate
            m.polygonOffsetUnits = -2.5;
            m.depthTest = true;
          });
        } else if (isPlinthOrBase) {
          mats.forEach((m) => {
            m.polygonOffset = true;
            m.polygonOffsetFactor = -1.0; // Apparatus bases sit cleanly on table without z-fighting
            m.polygonOffsetUnits = -1.0;
            m.depthWrite = true;
          });
        }
      }
    });

    // Detect if this is the full 3D room environment
    this.isFullRoom = identifiedApparatus.room.length > 5 || meshList.some(m => m.toLowerCase().includes('wall') || m.toLowerCase().includes('ceiling'));

    // Compute bounding box and dimensions
    const box = new THREE.Box3().setFromObject(this.model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    this.inspectionSummary = {
      totalMeshes: meshList.length,
      materials: Array.from(materialSet),
      isFullRoom: this.isFullRoom,
      loadedPath: this.loadedPath,
      boundingBox: {
        min: [box.min.x.toFixed(3), box.min.y.toFixed(3), box.min.z.toFixed(3)],
        max: [box.max.x.toFixed(3), box.max.y.toFixed(3), box.max.z.toFixed(3)],
        size: [size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3)],
        center: [center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3)]
      },
      identifiedApparatus
    };

    // Output clean developer-only inspection summary to console
    this.logInspectionSummary();

    // Position model:
    // If it is the full lab room, keep it anchored at exact metric origin (0, 0, 0)
    // If it is an isolated tabletop apparatus with negative Y, ground it to tabletop.
    if (!this.isFullRoom && box.min.y < -0.01) {
      this.model.position.y = -box.min.y;
    } else {
      this.model.position.set(0, 0, 0);
    }

    // Ensure clean single-instance root: remove previous instance if reloaded
    const existing = this.scene.getObjectByName('LabApparatusModel');
    if (existing) {
      this.scene.remove(existing);
    }

    this.model.name = 'LabApparatusModel';
    this.model.userData.isModelRoot = true;
    this.model.userData.isRoomRoot = Boolean(this.isFullRoom);

    this.scene.add(this.model);

    if (this.onRoomLoaded) {
      this.onRoomLoaded(this.isFullRoom);
    }
  }

  /**
   * Log development-only summary of the loaded 3D environment structure.
   */
  logInspectionSummary() {
    if (!this.inspectionSummary) return;

    console.groupCollapsed(`🔬 3D Model Inspection Summary: ${this.loadedPath}`);
    console.log(`Environment Type: ${this.isFullRoom ? 'Full 3D Physics Laboratory Room (Untitled.glb)' : 'Isolated Workbench Apparatus (Untitled.glb)'}`);
    console.log(`Total Meshes: ${this.inspectionSummary.totalMeshes}`);
    console.log(`Dimensions (W × H × D): ${this.inspectionSummary.boundingBox.size.join(' × ')} m`);
    console.log(`Materials (${this.inspectionSummary.materials.length}):`, this.inspectionSummary.materials);

    console.group('Identified Apparatus Components:');
    console.log('⚡ DC Power Supply / Battery:', this.inspectionSummary.identifiedApparatus.battery);
    console.log('🔌 Plug Key / Switch:', this.inspectionSummary.identifiedApparatus.switchKey);
    console.log('🔵 Ammeter (0–1 A):', this.inspectionSummary.identifiedApparatus.ammeter);
    console.log('🔴 Voltmeter (0–5 V):', this.inspectionSummary.identifiedApparatus.voltmeter);
    console.log('🟨 Standard Resistor (5 Ω):', this.inspectionSummary.identifiedApparatus.resistor);
    console.log('⚙️ Rheostat (Variable Resistor):', this.inspectionSummary.identifiedApparatus.rheostat);
    console.log('🪵 Table & Frame:', this.inspectionSummary.identifiedApparatus.table);
    console.log('🏫 Lab Room Architecture & Props:', this.inspectionSummary.identifiedApparatus.room.length, 'meshes');
    console.log('〰️ Pre-baked Connecting Wires (hidden):', this.inspectionSummary.identifiedApparatus.wires);
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Create graceful fallback geometry if model cannot be loaded.
   */
  createFallbackPlaceholder() {
    console.warn('Using fallback placeholder apparatus.');
    const group = new THREE.Group();
    group.name = 'FallbackApparatus';

    const boxMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), boxMat);
    placeholder.position.set(0, 1.2, 0);
    group.add(placeholder);

    this.scene.add(group);
    this.model = group;
  }
}
