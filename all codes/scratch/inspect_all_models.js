import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

async function inspectModels() {
  const models = [
    'd:/webXR LabVarse Project/all codes/public/models/Untitled.glb',
    'd:/webXR LabVarse Project/all codes/public/models/finalromm.glb',
    'd:/webXR LabVarse Project/webXR_practical lab models/labroom.glb',
    'd:/webXR LabVarse Project/webXR_practical lab models/ohmslawmodels.glb'
  ];

  for (const m of models) {
    if (!fs.existsSync(m)) continue;
    const buf = fs.readFileSync(m);
    const arr = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const loader = new GLTFLoader();
    await new Promise((res) => {
      loader.parse(arr, '', (gltf) => {
        let meshes = 0;
        let names = [];
        gltf.scene.traverse(n => {
          if (n.isMesh) {
            meshes++;
            if (meshes <= 15) names.push(n.name);
          }
        });
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const sz = box.getSize(new THREE.Vector3());
        console.log(`\n=== MODEL: ${m.split('/').pop()} ===`);
        console.log(`Size: ${buf.length} bytes, Meshes: ${meshes}`);
        console.log(`Bounds: ${sz.x.toFixed(2)} x ${sz.y.toFixed(2)} x ${sz.z.toFixed(2)}`);
        console.log(`Sample mesh names:`, names.slice(0, 10).join(', '));
        res();
      }, (err) => {
        console.error(`Error parsing ${m}:`, err);
        res();
      });
    });
  }
}

inspectModels();
