import {defineConfig, type Plugin} from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import {parse} from 'yaml';
import {fileURLToPath, URL} from 'node:url';

// plans and coach settings are YAML; parse them at build time so the app ships plain JSON
const yamlPlugin = (): Plugin => ({
  name: 'yaml',
  transform(code, id) {
    if (!id.endsWith('.yaml')) return null;
    return {code: `export default ${JSON.stringify(parse(code))};`, map: null};
  },
});

// relative base: the same build works at the GitHub Pages project URL and on localhost
export default defineConfig({
  base: './',
  plugins: [vue(), yamlPlugin()],
  resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url)), '@data': fileURLToPath(new URL('./data', import.meta.url))}},
  test: {include: ['tests/unit/**/*.test.ts']},
});
