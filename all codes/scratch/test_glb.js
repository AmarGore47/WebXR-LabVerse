import fs from 'fs';

const filePath = 'd:/webXR LabVarse Project/all codes/public/models/Untitled.glb';
console.log('File exists:', fs.existsSync(filePath));
if (fs.existsSync(filePath)) {
  const stat = fs.statSync(filePath);
  console.log('File size:', stat.size);
  const buffer = fs.readFileSync(filePath);
  console.log('Magic header:', buffer.toString('utf8', 0, 4));
  console.log('Version:', buffer.readUInt32LE(4));
  console.log('Length in header:', buffer.readUInt32LE(8));
}
