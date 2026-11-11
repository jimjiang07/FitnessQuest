<script setup lang="ts">
import {ref} from 'vue';
import {tracker} from '@/tracker/config';

const open = ref<string | null>(null);
const toggle = (id: string) => { open.value = open.value === id ? null : id; };
</script>

<template>
  <section class="flex" aria-labelledby="flex-h">
    <header>
      <h2 id="flex-h">{{ tracker.flexMix.title }}</h2>
      <p class="fq-muted">{{ tracker.flexMix.summary }}</p>
    </header>
    <ul class="cards">
      <li v-for="c in tracker.flexMix.cards" :key="c.id" class="card" :class="{open: open === c.id}" :data-card="c.id">
        <button type="button" class="head" :aria-expanded="open === c.id" :aria-controls="`flex-${c.id}`" @click="toggle(c.id)">
          <span class="txt">
            <span class="name">{{ c.name }}</span>
            <span class="sum fq-muted">{{ c.summary }}</span>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <ul v-show="open === c.id" :id="`flex-${c.id}`" class="points">
          <li v-for="p in c.points" :key="p">{{ p }}</li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.flex { display: flex; flex-direction: column; gap: 10px; }
h2 { font-size: 22px; font-weight: 800; }
header p { margin: 4px 0 0; }
.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 8px; align-items: start; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; transition: border-color .2s; }
.card.open { border-color: var(--rest); grid-column: 1 / -1; }
.head { width: 100%; min-height: var(--tap-min); display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 0; background: transparent; text-align: left; cursor: pointer; }
.txt { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name { font-weight: 800; font-size: 16px; }
.sum { font-size: 13.5px; }
.head svg { width: 22px; height: 22px; flex: none; fill: none; stroke: var(--muted); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
.open .head svg { transform: rotate(180deg); stroke: var(--rest); }
.points { margin: 0; padding: 0 16px 14px 34px; display: flex; flex-direction: column; gap: 6px; }
.points li::marker { color: var(--rest); }
</style>
