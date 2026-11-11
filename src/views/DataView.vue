<script setup lang="ts">
import {computed, ref} from 'vue';
import {useLayout} from '@/composables/useLayout';
import {useTrackerStore} from '@/stores/tracker';
import {formatDate, isIsoDate, today} from '@/tracker/logic';

const layout = useLayout();
const store = useTrackerStore();
const book = computed(() => layout.value === 'book');

const counts = computed(() => ({
  days: Object.keys(store.data.habits).length,
  sessions: store.data.sessions.length,
  body: store.data.body.length,
}));


const exported = ref('');
function exportData() {
  const name = `fitness-quest-${today()}.json`;
  const url = URL.createObjectURL(new Blob([store.exportJson()], {type: 'application/json'}));
  const a = Object.assign(document.createElement('a'), {href: url, download: name});
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // Safari needs the URL alive until the download starts
  exported.value = `Saved ${name}. Keep it somewhere safe, like iCloud Drive.`;
}

const imported = ref<{ok: boolean; text: string} | null>(null);
async function importFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const ok = store.importJson(await file.text());
  imported.value = ok
    ? {ok, text: `Imported ${file.name}: ${counts.value.body} body entries, ${counts.value.sessions} sessions and ${counts.value.days} logged days.`}
    : {ok, text: `${file.name} isn't a Fitness Quest backup, so nothing changed.`};
  input.value = '';   // lets you pick the same file again
}

const start = ref(store.data.startDate);
const startSaved = ref(false);
function saveStart() {
  if (!isIsoDate(start.value)) return;
  store.setStartDate(start.value);
  start.value = store.data.startDate;   // snapped to that week's Monday
  startSaved.value = true;
}

const clearStep = ref<0 | 1>(0);
const cleared = ref(false);
function clear() {
  store.clearAll();
  start.value = store.data.startDate;
  clearStep.value = 0;
  cleared.value = true;
  imported.value = null;
}
</script>

<template>
  <main class="fq-page" :class="{book}">
    <div class="fq-col">
      <header class="fq-head">
        <span class="fq-tag fq-muted">Backup and settings</span>
        <h1 class="fq-title">Your data</h1>
      </header>

      <section class="fq-panel intro">
        <p>
          Everything you log stays on this device, in this browser. There's no account and nothing is sent anywhere,
          so if you clear Safari's website data or lose the phone, it's gone.
        </p>
        <p class="fq-muted">Export a backup every week or two, and after any big session.</p>
        <dl class="counts fq-num">
          <div><dt>Body entries</dt><dd>{{ counts.body }}</dd></div>
          <div><dt>Sessions</dt><dd>{{ counts.sessions }}</dd></div>
          <div><dt>Days logged</dt><dd>{{ counts.days }}</dd></div>
        </dl>
      </section>

      <section class="fq-panel block" aria-labelledby="export-h">
        <h2 id="export-h">Export</h2>
        <p class="fq-muted">Downloads one JSON file with everything you've logged.</p>
        <button type="button" class="btn primary" @click="exportData">Export data</button>
        <p class="msg ok" role="status">{{ exported }}</p>
      </section>

      <section class="fq-panel block" aria-labelledby="import-h">
        <h2 id="import-h">Import</h2>
        <p class="fq-muted">Restores a backup file. It replaces what's on this device now.</p>
        <label class="btn secondary file">
          Choose backup file
          <input type="file" accept="application/json,.json" class="fq-sr" data-test="import" @change="importFile" />
        </label>
        <p v-if="imported" class="msg" :class="imported.ok ? 'ok' : 'bad'" :role="imported.ok ? 'status' : 'alert'">{{ imported.text }}</p>
      </section>
    </div>

    <div class="fq-col">
      <section class="fq-panel block" aria-labelledby="start-h">
        <h2 id="start-h">Week 1 starts</h2>
        <p class="fq-muted">The habit wall counts weeks from this Monday. <span class="current">Now: <b>{{ formatDate(store.data.startDate, 'long') }}</b></span></p>
        <div class="start-row">
          <label for="start-date" class="fq-sr">Week 1 start date</label>
          <input id="start-date" v-model="start" type="date" @input="startSaved = false" />
          <button type="button" class="btn secondary" :disabled="start === store.data.startDate" @click="saveStart">Set</button>
        </div>
        <p class="msg ok" role="status">{{ startSaved ? 'Week 1 updated. Any date snaps to its Monday.' : '' }}</p>
      </section>

      <section class="fq-panel block danger-zone" aria-labelledby="clear-h">
        <h2 id="clear-h">Clear all data</h2>
        <p class="fq-muted">Deletes every habit, session and body entry on this device. Export first.</p>
        <button v-if="clearStep === 0" type="button" class="btn outline-danger" @click="clearStep = 1; cleared = false">Clear all data</button>
        <div v-else class="confirm" role="group" aria-label="Confirm clear">
          <p><b>Delete everything?</b> This can't be undone unless you have a backup file.</p>
          <div class="confirm-actions">
            <button type="button" class="btn danger" @click="clear">Delete everything</button>
            <button type="button" class="btn secondary" @click="clearStep = 0">Cancel</button>
          </div>
        </div>
        <p class="msg ok" role="status">{{ cleared ? 'All data cleared.' : '' }}</p>
      </section>

      <RouterLink to="/about" class="about">About Fitness Quest and credits</RouterLink>
    </div>
  </main>
</template>

<style scoped>
h2 { font-size: 22px; font-weight: 800; }
p { margin: 0; overflow-wrap: anywhere; }
.intro { display: flex; flex-direction: column; gap: 8px; }
.counts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 4px 0 0; }
.counts div { background: var(--surface-2); border-radius: 12px; padding: 6px 10px; }
.counts dt { font-size: 12px; color: var(--muted); }
.counts dd { margin: 0; font-family: var(--display); font-size: 28px; font-weight: 800; color: var(--rest); line-height: 1.1; }
.block { display: flex; flex-direction: column; gap: 10px; }
.btn {
  display: flex; align-items: center; justify-content: center; min-height: var(--tap-min); padding: 0 20px;
  border-radius: var(--radius-pill); border: 0; font-weight: 800; font-size: 17px; cursor: pointer; text-align: center;
}
.btn:disabled { opacity: .45; cursor: default; }
.primary { background: var(--rest); color: #04201c; }
.secondary { background: var(--surface-2); color: var(--fg); }
.file:focus-within { outline: 3px solid var(--ready); outline-offset: 2px; }
.danger { background: var(--work); color: var(--on-work); }
.outline-danger { background: transparent; color: var(--work); border: 2px solid rgba(255, 92, 57, .6); }
.msg { min-height: 0; font-weight: 700; font-size: 14px; }
.msg:empty { display: none; }
.ok { color: var(--rest); }
.bad { color: var(--ready); }
.current { display: block; color: var(--fg); margin-top: 2px; }
.start-row { display: flex; gap: 10px; }
.start-row input {
  flex: 1; min-width: 0; min-height: var(--tap-min); padding: 10px 14px; border-radius: 14px; border: 1px solid var(--line);
  background: var(--surface-2); color: var(--fg); font: inherit; font-size: 18px; font-weight: 600;
}
.start-row input::-webkit-calendar-picker-indicator { filter: invert(.8); }
.start-row .btn { flex: none; min-width: 88px; }
.danger-zone { border-color: rgba(255, 92, 57, .35); }
.confirm { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 14px; background: rgba(255, 92, 57, .1); border: 1px solid rgba(255, 92, 57, .45); }
.confirm-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.confirm-actions .btn { flex: 1 1 160px; }
.about {
  display: flex; align-items: center; justify-content: center; min-height: var(--tap-min);
  border-radius: var(--radius-pill); background: var(--surface); border: 1px solid var(--line); color: var(--fg); font-weight: 700; text-decoration: none;
}
</style>
