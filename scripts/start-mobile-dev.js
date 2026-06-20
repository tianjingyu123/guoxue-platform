const { spawn } = require('child_process');
const path = require('path');
const mobileDir = path.join(__dirname, '..', 'apps', 'mobile');
const child = spawn('pnpm', ['dev:h5'], { cwd: mobileDir, stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill());
