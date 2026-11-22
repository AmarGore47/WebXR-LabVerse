import fs from 'fs';
const buf = fs.readFileSync('all codes/public/models/labAssistant.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.subarray(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

// Find Ch31_Body mesh
gltf.meshes.forEach((m, i) => {
  console.log(`Mesh [${i}] ${m.name}`);
  m.primitives.forEach((p, pIdx) => {
    const acc = gltf.accessors[p.attributes.POSITION];
    console.log(`  prim [${pIdx}] POSITION min=${JSON.stringify(acc.min)}, max=${JSON.stringify(acc.max)}`);
  });
});
