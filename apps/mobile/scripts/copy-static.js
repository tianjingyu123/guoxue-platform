// H5 build post-process: copy static files to the correct location
// UniApp puts static files under dist/build/h5/static/, but Vite base=/h5/
// expects them at dist/static/ for the /h5/static/ URL to work.
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../dist/build/h5/static');
const dest = path.resolve(__dirname, '../dist/static');

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log('[copy-static] Copied static files to dist/static/');
} else {
  console.log('[copy-static] No build/h5/static found, skipping');
}
