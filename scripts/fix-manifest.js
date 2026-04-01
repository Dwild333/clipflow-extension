#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../build/chrome-mv3-prod/manifest.json');

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Strip the dev key — required for Chrome Web Store submission.
  // The key is only needed locally to pin the extension ID during development.
  delete manifest.key;

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✓ Manifest OK (key stripped for prod)');
} catch (err) {
  console.error('Error fixing manifest:', err);
  process.exit(1);
}
