const { spawn, execSync, exec } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const isDev = process.argv.includes('--dev');
const port = 3000;
const host = '0.0.0.0';

console.log('========================================================================');
console.log(`       BAKO'S MASTER SYSTEM - ${isDev ? 'DEVELOPMENT MODE (HOT RELOAD)' : 'PRODUCTION MODE'}`);
console.log('========================================================================\n');

// 1. Detect LAN IP
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanIp();

// 2. Kill any process occupying port 3000
function freePort(p) {
  try {
    const stdout = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes(`:${p}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && pid !== '0') {
          console.log(`[Port Clean] Freeing port ${p} from existing instance (PID ${pid})...`);
          try {
            execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

console.log('[1/3] Preparing network port...');
freePort(port);
console.log(`      Port ${port} is ready.`);

console.log('\n[2/3] Network Access:');
console.log(`      - Local Computer:   http://localhost:${port}`);
console.log(`      - Phones / Tablets: http://${lanIp}:${port}`);

// 3. Start Next.js
console.log(`\n[3/3] Starting Next.js (${isDev ? 'Dev' : 'Production'})...\n`);

const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const nodeBin = path.join(__dirname, 'tools', 'node', 'node.exe');
const executable = require('fs').existsSync(nodeBin) ? nodeBin : 'node';

// Auto-build if production build is missing
const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');
if (!isDev && !require('fs').existsSync(buildIdPath)) {
  console.log('[Auto-Build] Production build not detected. Generating build now...');
  const { execSync } = require('child_process');
  execSync(`"${executable}" "${nextBin}" build`, { cwd: __dirname, stdio: 'inherit' });
}

const nextArgs = [nextBin, isDev ? 'dev' : 'start', '-p', String(port), '-H', host];

const serverProcess = spawn(executable, nextArgs, {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' }
});

// 4. Poll until server is responding, then launch default browser
let browserOpened = false;
let attempts = 0;
const maxAttempts = 60; // 30 seconds

function checkServer() {
  attempts++;
  const req = http.get(`http://127.0.0.1:${port}`, (res) => {
    if (!browserOpened) {
      browserOpened = true;
      console.log(`\n[Ready] Application is live! Launching browser at http://localhost:${port}...`);
      exec(`start http://localhost:${port}`);
    }
  });

  req.on('error', () => {
    if (!browserOpened && attempts < maxAttempts) {
      setTimeout(checkServer, 500);
    }
  });

  req.setTimeout(1000, () => {
    req.destroy();
    if (!browserOpened && attempts < maxAttempts) {
      setTimeout(checkServer, 500);
    }
  });
}

// Start polling
setTimeout(checkServer, 400);

serverProcess.on('exit', (code) => {
  console.log(`\nServer process exited with code ${code}.`);
  process.exit(code || 0);
});
