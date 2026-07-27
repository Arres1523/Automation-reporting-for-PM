import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const production = process.argv.includes('--production');

/** @returns {import('esbuild').Plugin} */
function copyHtmlPlugin() {
  return {
    name: 'copy-html',
    setup(build) {
      build.onEnd(() => {
        const srcDir = 'src/web';
        const destDir = 'dist';
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
        for (const file of files) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      });
    },
  };
}

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/Code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: production,
  sourcemap: !production,
  plugins: [copyHtmlPlugin()],
});
