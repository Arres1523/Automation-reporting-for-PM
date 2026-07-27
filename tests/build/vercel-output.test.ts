import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Vercel static output', () => {
  it('builds a dist directory with an index page for the deployment root', () => {
    execFileSync('node', ['esbuild.config.mjs'], { stdio: 'pipe' });

    const indexPath = join(process.cwd(), 'dist', 'index.html');
    const appPath = join(process.cwd(), 'dist', 'app.html');

    expect(existsSync(indexPath)).toBe(true);
    expect(readFileSync(indexPath, 'utf8')).toBe(readFileSync(appPath, 'utf8'));
  });
});
