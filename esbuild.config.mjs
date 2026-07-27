import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: production,
  sourcemap: !production,
});
