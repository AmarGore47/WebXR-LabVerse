import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelLoader } from '../src/models/modelLoader.js';

async function testModelLoading() {
  console.log('Testing ModelLoader with Untitled.glb...');
  const scene = new THREE.Scene();
  const loader = new ModelLoader(scene);

  const glbPath = 'd:/webXR LabVarse Project/all codes/public/models/Untitled.glb';
  const buffer = fs.readFileSync(glbPath);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const gltfLoader = new GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.parse(arrayBuffer, '', resolve, reject);
    });
    console.log('GLTFLoader.parse succeeded! Scene children count:', gltf.scene.children.length);
    
    // Now test processModel
    console.log('Calling loader.processModel(gltf)...');
    loader.processModel(gltf);
    console.log('loader.processModel(gltf) SUCCEEDED!');
    console.log('Is full room:', loader.isFullRoom);
    console.log('Total meshes:', loader.inspectionSummary.totalMeshes);
  } catch (err) {
    console.error('Error during parse or processModel:', err);
  }
}

testModelLoading();
