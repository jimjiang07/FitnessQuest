import {createHash} from 'node:crypto';
import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';
import type {Plugin} from 'vite';

// never precached: the worker itself, source maps and repo-only notes
const SKIP = (file: string) => file === 'sw.js' || file.endsWith('.map') || file.endsWith('.md') || file.startsWith('.');

function walk(dir: string): string[] {
  return readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

/** After the build, lists every output file in dist/sw.js so one visit caches the whole app for offline use. */
export function precachePlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'fq-precache',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      if (!existsSync(swPath)) return;
      const files = walk(outDir).map((f) => relative(outDir, f).split(sep).join('/')).filter((f) => !SKIP(f)).sort();
      // hash the contents so any changed file (plan, clip, picture) gives the worker new bytes and a new cache
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const urls = ['./', ...files];
      const sw = readFileSync(swPath, 'utf8')
        .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
        .replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(urls)};`);
      writeFileSync(swPath, sw);
    },
  };
}
