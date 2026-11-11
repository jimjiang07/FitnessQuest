<script setup lang="ts">
import {computed, ref} from 'vue';
import type {BodyEntry} from '@/types';
import {useLayout} from '@/composables/useLayout';
import {useTrackerStore} from '@/stores/tracker';
import {formatDate} from '@/tracker/logic';
import BodyEntryForm from '@/components/tracker/BodyEntryForm.vue';
import BodyTrends from '@/components/tracker/BodyTrends.vue';
import BodyHistoryItem from '@/components/tracker/BodyHistoryItem.vue';
import BodyFlexMix from '@/components/tracker/BodyFlexMix.vue';
import BodyProfile from '@/components/tracker/BodyProfile.vue';

const layout = useLayout();
const store = useTrackerStore();
const book = computed(() => layout.value === 'book');
const saved = ref('');

function add(e: Omit<BodyEntry, 'id'>) {
  store.addBody(e);
  saved.value = `Saved for ${formatDate(e.date)}.`;
}
</script>

<template>
  <main class="fq-page" :class="{book}">
    <div class="fq-col">
      <header class="fq-head">
        <span class="fq-tag fq-muted">Body and recovery journal</span>
        <h1 class="fq-title">Body</h1>
      </header>
      <section class="fq-panel new" aria-labelledby="new-h">
        <h2 id="new-h">New entry</h2>
        <BodyEntryForm @save="add" />
        <p class="saved fq-mini" role="status">{{ saved }}</p>
      </section>
      <BodyProfile v-if="book" />
    </div>

    <div class="fq-col">
      <BodyTrends :entries="store.data.body" />
      <section class="history" aria-labelledby="history-h">
        <h2 id="history-h">History <span class="count fq-muted">{{ store.bodyEntries.length || '' }}</span></h2>
        <p v-if="!store.bodyEntries.length" class="fq-muted empty">No entries yet.</p>
        <ol v-else class="list">
          <BodyHistoryItem v-for="e in store.bodyEntries" :key="e.id" :entry="e"
            @update="p => store.updateBody(e.id, p)" @remove="store.deleteBody(e.id)" />
        </ol>
      </section>
      <BodyFlexMix />
      <BodyProfile v-if="!book" />
    </div>
  </main>
</template>

<style scoped>
h2 { font-size: 22px; font-weight: 800; }
.new { display: flex; flex-direction: column; gap: 12px; }
.saved { margin: -4px 0 0; min-height: 1.5em; color: var(--rest); font-weight: 700; text-align: center; }
.history { display: flex; flex-direction: column; gap: 10px; }
.count { font-size: 18px; }
.empty { margin: 0; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
</style>
