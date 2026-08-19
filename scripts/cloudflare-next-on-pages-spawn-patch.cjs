const childProcess = require('child_process');

const originalSpawn = childProcess.spawn;

childProcess.spawn = function patchedSpawn(command, args = [], options = {}) {
  if (process.platform === 'win32' && ['npx', 'npm', 'pnpm', 'yarn'].includes(command)) {
    return originalSpawn('cmd', ['/c', command, ...args], options);
  }

  return originalSpawn(command, args, options);
};
