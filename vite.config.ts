import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const gitSha = (() => {
  if (process.env.GIT_SHA) return process.env.GIT_SHA.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'dev'; }
})();

export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      '$lib': resolve('./src/lib'),
    },
  },
  define: {
    __GIT_SHA__: JSON.stringify(gitSha),
  },
});
