import { resolveConfig } from 'vite';

async function test() {
  try {
    const c1 = await resolveConfig({ root: 'all codes' }, 'serve');
    console.log('--- From Root with { root: "all codes" } ---');
    console.log('root:', c1.root);
    console.log('publicDir:', c1.publicDir);
    console.log('configFile:', c1.configFile);
  } catch (e) {
    console.error('Error c1:', e);
  }

  try {
    const c2 = await resolveConfig({}, 'serve');
    console.log('--- In current directory ---');
    console.log('root:', c2.root);
    console.log('publicDir:', c2.publicDir);
    console.log('configFile:', c2.configFile);
  } catch (e) {
    console.error('Error c2:', e);
  }
}

test();
