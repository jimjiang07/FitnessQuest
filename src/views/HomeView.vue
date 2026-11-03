<script setup lang="ts">
// Foundation stand-in: reads the raw YAML directly. Stream F replaces this with the real Home (book + compact layouts)
// built on the validated plan from Stream A (src/plan/index.ts).
import raw from '@data/plans/spine-rehab.yaml';

const plan = raw as {name: string; summary: string; days: {id: string; title: string; anchor?: string}[]};
</script>

<template>
  <main class="home">
    <p class="eyebrow">Your plan</p>
    <h1>{{ plan.name }}</h1>
    <p class="muted">{{ plan.summary }}</p>
    <ol class="days">
      <li v-for="(d, i) in plan.days" :key="d.id">
        <RouterLink :to="`/day/${d.id}`" class="day">
          <span class="num">{{ i + 1 }}</span>
          <span><b>{{ d.title }}</b><small v-if="d.anchor">Anchor: {{ d.anchor }}</small></span>
        </RouterLink>
      </li>
    </ol>
    <p class="muted small">Early build: the voice-coached player is on its way. <RouterLink to="/about">About</RouterLink></p>
  </main>
</template>

<style scoped>
.home { max-width: 720px; margin: 0 auto; padding: max(24px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 40px max(16px, env(safe-area-inset-left)); display: flex; flex-direction: column; gap: 12px; }
h1 { font-size: clamp(40px, 8vw, 64px); font-weight: 800; }
.eyebrow { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.muted { color: var(--muted); margin: 0; }
.small { font-size: 13px; }
.small a { color: var(--fg); }
.days { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 10px; }
.day { display: flex; gap: 14px; align-items: center; min-height: var(--tap-min); padding: 14px 16px; border-radius: var(--radius-card); background: var(--surface); border: 1px solid var(--line); color: var(--fg); text-decoration: none; }
.day:hover { border-color: var(--work); }
.num { font-family: var(--display); font-weight: 800; font-size: 36px; color: var(--work); width: 28px; }
.day b { display: block; font-family: var(--display); font-size: 20px; text-transform: uppercase; letter-spacing: .02em; line-height: 1.05; }
.day small { color: var(--muted); font-size: 12.5px; }
</style>
