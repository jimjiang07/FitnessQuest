<script setup lang="ts">
import {ref} from 'vue';
import {tracker} from '@/tracker/config';

const open = ref(false);
</script>

<template>
  <section class="profile fq-panel" :class="{open}">
    <button type="button" class="head" :aria-expanded="open" aria-controls="profile-body" @click="open = !open">
      <span>
        <span class="fq-tag fq-muted">Profile</span>
        <h2>Your back and neck</h2>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <div v-show="open" id="profile-body" class="body">
      <div class="part"><span class="fq-tag lab">Lumbar</span><p>{{ tracker.profile.lumbar }}</p></div>
      <div class="part"><span class="fq-tag lab">Neck</span><p>{{ tracker.profile.cervical }}</p></div>
      <div class="part">
        <span class="fq-tag lab">Goals</span>
        <ul class="goals"><li v-for="g in tracker.profile.goals" :key="g">{{ g }}</li></ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile { padding: 0; }
.head { width: 100%; min-height: var(--tap-min); display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; border: 0; background: transparent; text-align: left; cursor: pointer; }
.head > span { display: flex; flex-direction: column; gap: 2px; }
h2 { font-size: 20px; font-weight: 800; }
.head svg { width: 22px; height: 22px; flex: none; fill: none; stroke: var(--muted); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
.open .head svg { transform: rotate(180deg); }
.body { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 10px; }
.part { display: flex; flex-direction: column; gap: 2px; }
.lab { color: var(--ready); }
p { margin: 0; }
.goals { margin: 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
.goals li { padding: 4px 12px; border-radius: 999px; background: var(--surface-2); font-size: 13.5px; font-weight: 600; }
</style>
