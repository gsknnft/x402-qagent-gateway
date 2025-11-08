

try {
  const layer = require('express/lib/router/layer');
  const old = require('path-to-regexp');
  if (typeof old !== 'function') {
    layer.pathToRegexp = old.pathToRegexp || (() => {});
  } else {
    layer.pathToRegexp = old;
  }
  console.log('✅ Patched express layer for legacy dev-server');
} catch (e) {
  console.warn('⚠️ Express patch skipped:', e);
}
