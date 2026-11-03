/* Records the coach's voice (npm run voice): every sentence the app can say, one clip each, into public/voice/.
   Uses Microsoft's free neural voices through edge-tts, run by uv (brew install uv). Only new or changed sentences are
   recorded, and clips no longer used are deleted. Commit public/voice/ afterwards: the app never calls the voice service.
   --list prints the sentences without recording. */
import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectLines} from './voice-lines.mjs';

const VOICE = 'en-AU-WilliamNeural', RATE = '+5%';
const root = fileURLToPath(new URL('..', import.meta.url)), out = path.join(root, 'public/voice'), indexFile = path.join(out, 'index.json');

// clip naming comes from the app's own TypeScript, loaded through Vite, so the script and the app can't disagree
const vite = await createServer({root, configFile: path.join(root, 'vite.config.ts'), server: {middlewareMode: true}, appType: 'custom', logLevel: 'error'});
const {sentences, clipId} = await vite.ssrLoadModule('/src/audio/clips.ts');
const lines = await collectLines(vite);
await vite.close();

const clips = new Map();
for (const s of lines.flatMap(sentences)) {
  const id = clipId(s), had = clips.get(id);
  const norm = t => t.toLowerCase().replace(/[’‘]/g, "'");
  if (had && norm(had) !== norm(s)) throw new Error(`Two sentences share clip ${id}: "${had}" and "${s}"`);
  clips.set(id, s);
}

// what the voice reads: symbols as words (the clip is still named by the sentence as written)
const spoken = s => s.replace(/ \+ /g, ' plus ').replace(/–/g, ' to ').replace(/°/g, ' degrees');

fs.mkdirSync(out, {recursive: true});
const old = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : {};
const same = old.voice === VOICE && old.rate === RATE;
const todo = [...clips].filter(([id]) => !same || !fs.existsSync(path.join(out, `${id}.mp3`))).map(([id, text]) => ({id, text: spoken(text)}));
console.log(`${clips.size} sentences, ${todo.length} to record`);
if (process.argv.includes('--list')) {
  for (const s of [...clips.values()].sort()) console.log(s);
  process.exit(0);
}
if (todo.length) {
  const jobs = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fq-voice-')), 'jobs.json');
  fs.writeFileSync(jobs, JSON.stringify(todo));
  execFileSync('uv', ['run', '--quiet', '--with', 'edge-tts', 'python', '-I', path.join(root, 'scripts/voice-render.py'), jobs, out, VOICE, RATE], {stdio: 'inherit'});
}
let gone = 0;
for (const f of fs.readdirSync(out)) if (f.endsWith('.mp3') && !clips.has(f.slice(0, -4))) { fs.unlinkSync(path.join(out, f)); gone++; }
fs.writeFileSync(indexFile, JSON.stringify({voice: VOICE, rate: RATE, clips: [...clips.keys()].sort()}));
const bytes = fs.readdirSync(out).reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
console.log(`Done: ${clips.size} clips (${(bytes / 1e6).toFixed(1)} MB), ${gone} unused removed.`);
