import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/web');
const result = spawnSync(process.execPath, [resolve(app, 'scripts/build-offline.mjs')], {
  cwd: app,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
