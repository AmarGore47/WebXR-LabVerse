import fs from 'fs';
const buf = fs.readFileSync('all codes/public/models/Untitled.glb');
const jsonLen = buf.readUInt32LE(12);
const jsonBuf = buf.subarray(20, 20 + jsonLen);
const gltf = JSON.parse(jsonBuf.toString('utf8'));

console.log('--- ALL ROOM / WALL / PILLAR OBJECTS ---');
gltf.nodes.forEach((node, i) => {
  const name = node.name || '';
  if (node.mesh !== undefined) {
    const mesh = gltf.meshes[node.mesh];
    const acc = gltf.accessors[mesh.primitives[0].attributes.POSITION];
    if (acc) {
      const s = node.scale || [1, 1, 1];
      const t = node.translation || [0, 0, 0];
      const r = node.rotation || [0, 0, 0, 1];
      const minX = acc.min[0] * s[0] + t[0];
      const maxX = acc.max[0] * s[0] + t[0];
      const minZ = acc.min[2] * s[2] + t[2];
      const maxZ = acc.max[2] * s[2] + t[2];
      const minY = acc.min[1] * s[1] + t[1];
      const maxY = acc.max[1] * s[1] + t[1];
      if (name.includes('Wall') || name.includes('Pillar') || name.includes('Floor') || name.includes('Ceiling')) {
        console.log(`[${i}] ${name}: pos=${JSON.stringify(t)}, rot=${JSON.stringify(r)}, bounds=[X: ${minX.toFixed(2)}..${maxX.toFixed(2)}, Y: ${minY.toFixed(2)}..${maxY.toFixed(2)}, Z: ${minZ.toFixed(2)}..${maxZ.toFixed(2)}]`);
      }
    }
  }
});
