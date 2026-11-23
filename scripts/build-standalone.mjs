import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'standalone');
const distAssetsDir = path.join(rootDir, 'dist', 'assets');

fs.mkdirSync(outDir, { recursive: true });

// 1. Copy compiled Tailwind CSS produced by `vite build`
if (fs.existsSync(distAssetsDir)) {
  const cssFile = fs
    .readdirSync(distAssetsDir)
    .find((f) => f.startsWith('index-') && f.endsWith('.css'));
  if (cssFile) {
    fs.copyFileSync(
      path.join(distAssetsDir, cssFile),
      path.join(outDir, 'gis-app.css')
    );
  }
}

// 2. Build classic IIFE browser bundle compatible with file:// and static hosts
await build({
  entryPoints: [path.join(rootDir, 'src', 'standalone-entry.tsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  jsx: 'automatic',
  minify: true,
  outfile: path.join(outDir, 'gis-app.js'),
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env': '{"VITE_GOOGLE_MAPS_API_KEY":""}',
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': '""',
  },
  loader: {
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.svg': 'dataurl',
  },
});

console.log('Standalone bundle built in standalone/gis-app.js & gis-app.css');
