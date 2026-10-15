/**
 * sceneAudit.js
 * Development-only scene audit function to verify single-instance
 * rendering and prevent duplicate geometry, tables, or model roots.
 */

export function auditScene(scene, circuitState) {
  let modelRootCount = 0;
  let tableCount = 0;
  let roomRootCount = 0;

  if (scene) {
    scene.traverse((node) => {
      // 1. Model Root Count
      if (node.name === 'LabApparatusModel' || (node.userData && node.userData.isModelRoot)) {
        modelRootCount++;
      }

      // 2. Room Root Count
      if (node.userData && node.userData.isRoomRoot) {
        roomRootCount++;
      }

      // 3. Physical Visible Table Count
      if (node.isMesh && node.visible) {
        const lower = (node.name || '').toLowerCase();
        if (
          lower.includes('experiment tabletop') ||
          lower === 'tabletop' ||
          (lower.includes('woodenworkbench') && !lower.includes('leg'))
        ) {
          tableCount++;
        }
      }
    });
  }

  // 4. Active Wire Count
  const activeWireCount = circuitState && Array.isArray(circuitState.connections)
    ? circuitState.connections.length
    : 0;

  const result = {
    modelRootCount,
    tableCount,
    roomRootCount,
    activeWireCount
  };

  console.log('[SceneAudit] Active Scene Audit:', result);
  return result;
}
