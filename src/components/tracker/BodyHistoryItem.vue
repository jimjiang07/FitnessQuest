<script setup lang="ts">
import {ref} from 'vue';
import type {BodyEntry} from '@/types';
import {formatDate} from '@/tracker/logic';
import BodyEntryForm from './BodyEntryForm.vue';

const props = defineProps<{entry: BodyEntry}>();
const emit = defineEmits<{update: [Omit<BodyEntry, 'id'>]; remove: []}>();
const mode = ref<'view' | 'edit' | 'confirm'>('view');

const longDate = (iso: string) => `${formatDate(iso, 'day')} ${iso.slice(0, 4)}`;
const tone = (n: number) => (n >= 7 ? 'high' : n >= 4 ? 'mid' : 'low');
function save(e: Omit<BodyEntry, 'id'>) { emit('update', e); mode.value = 'view'; }
</script>

<template>
  <li class="item" :data-date="entry.date">
    <BodyEntryForm v-if="mode === 'edit'" :entry="entry" :id-prefix="`edit-${entry.id}`" @save="save" @cancel="mode = 'view'" />
    <template v-else>
      <div class="row">
        <span class="date">{{ longDate(props.entry.date) }}</span>
        <div class="tools" v-if="mode === 'view'">
          <button type="button" class="tool" :aria-label="`Edit entry for ${entry.date}`" @click="mode = 'edit'">Edit</button>
          <button type="button" class="tool" :aria-label="`Delete entry for ${entry.date}`" @click="mode = 'confirm'">Delete</button>
        </div>
      </div>
      <div class="stats fq-num">
        <span><b>{{ entry.waist ?? '—' }}</b> cm waist</span>
        <span><b>{{ entry.weight ?? '—' }}</b> kg</span>
        <span class="chip" :class="tone(entry.lumbar)">Lumbar {{ entry.lumbar }}</span>
        <span class="chip" :class="tone(entry.neck)">Neck {{ entry.neck }}</span>
      </div>
      <p v-if="entry.notes" class="notes">{{ entry.notes }}</p>
      <div v-if="mode === 'confirm'" class="confirm" role="group" aria-label="Confirm delete">
        <span>Delete this entry? This can't be undone.</span>
        <div class="confirm-actions">
          <button type="button" class="danger" @click="emit('remove')">Delete entry</button>
          <button type="button" class="keep" @click="mode = 'view'">Keep it</button>
        </div>
      </div>
    </template>
  </li>
</template>

<style scoped>
.item { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.date { font-weight: 800; }
.tools { display: flex; gap: 4px; margin-right: -6px; }
.tool { min-height: 44px; min-width: 56px; padding: 0 10px; border: 0; border-radius: 12px; background: transparent; color: var(--muted); font-weight: 700; cursor: pointer; }
.tool:hover { background: var(--surface-2); color: var(--fg); }
.stats { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; color: var(--muted); }
.stats b { color: var(--fg); font-size: 18px; }
.chip { padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 700; background: var(--surface-2); }
.chip.low { color: var(--rest); }
.chip.mid { color: var(--ready); }
.chip.high { color: var(--work); }
.notes { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.confirm { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255, 92, 57, .1); border: 1px solid rgba(255, 92, 57, .4); }
.confirm-actions { display: flex; gap: 8px; }
.confirm-actions button { flex: 1; min-height: var(--tap-min); border: 0; border-radius: var(--radius-pill); font-weight: 800; cursor: pointer; }
.danger { background: var(--work); color: var(--on-work); }
.keep { background: var(--surface-2); color: var(--fg); }
</style>
