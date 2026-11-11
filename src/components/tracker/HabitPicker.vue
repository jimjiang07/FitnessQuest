<script setup lang="ts">
import {nextTick, ref, watch} from 'vue';
import type {Layout} from '@/types';
import {tracker} from '@/tracker/config';

const props = defineProps<{date: string | null; label: string; current?: string; layout: Layout}>();
const emit = defineEmits<{pick: [id: string | null]; close: []}>();
const opts = ref<HTMLButtonElement[]>([]);

// focus moves into the sheet so one-handed and keyboard use both land on the choices
watch(() => props.date, async (d) => { if (d) { await nextTick(); opts.value[0]?.focus(); } });
</script>

<template>
  <Transition name="sheet">
    <div v-if="date" class="wrap" :class="layout">
      <div class="dim" aria-hidden="true" @click="emit('close')" />
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="habit-pick-title" @keydown.esc="emit('close')">
        <div class="grab" aria-hidden="true" />
        <header class="head">
          <span class="fq-tag fq-muted">Log a day</span>
          <h2 id="habit-pick-title">{{ label }}</h2>
        </header>
        <div class="opts">
          <button v-for="a in tracker.activities" :key="a.id" ref="opts" type="button" class="opt"
            :class="{on: current === a.id}" :style="{'--c': `var(--${a.color})`}" :aria-pressed="current === a.id"
            @click="emit('pick', a.id)">
            <span class="dot" aria-hidden="true" />
            <span class="what">{{ a.label }}</span>
            <span v-if="!a.counts" class="fq-mini fq-muted">Doesn't count</span>
            <svg v-if="current === a.id" class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          </button>
        </div>
        <div class="row">
          <button type="button" class="ghost" :disabled="!current" @click="emit('pick', null)">Clear</button>
          <button type="button" class="ghost" @click="emit('close')">Cancel</button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.wrap { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; justify-content: flex-end; }
.dim { position: absolute; inset: 0; background: rgba(5, 7, 10, .66); }
.sheet {
  position: relative; max-height: calc(100% - 24px); overflow-y: auto; overscroll-behavior: contain;
  width: 100%; max-width: 560px; margin: 0 auto;
  background: var(--surface); border: 1px solid var(--line); border-bottom: 0; border-radius: 26px 26px 0 0;
  padding: 8px 16px max(14px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 10px;
}
/* book: the sheet opens inside the left half, clear of the hinge */
.book .sheet {
  margin: 0; max-width: none;
  width: calc(50% - var(--fold-gutter) / 2 - max(18px, env(safe-area-inset-left)));
  margin-left: max(18px, env(safe-area-inset-left));
}
.grab { width: 40px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto; flex: none; }
.head { display: flex; flex-direction: column; gap: 2px; }
h2 { font-size: 28px; font-weight: 800; }
.opts { display: grid; gap: 6px; }
.opt {
  display: flex; align-items: center; gap: 12px; min-height: var(--tap-min); padding: 0 14px;
  border: 1px solid var(--line); border-radius: 16px; background: var(--surface-2); color: var(--fg);
  font-weight: 700; font-size: 15.5px; text-align: left; cursor: pointer;
}
.opt.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 16%, var(--surface-2)); }
.dot { width: 14px; height: 14px; border-radius: 50%; background: var(--c); flex: none; box-shadow: 0 0 10px color-mix(in srgb, var(--c) 55%, transparent); }
.what { flex: 1; min-width: 0; }
.tick { width: 20px; height: 20px; fill: none; stroke: var(--c); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ghost {
  min-height: var(--tap-min); border-radius: var(--radius-pill); border: 1px solid var(--line); background: transparent;
  color: var(--fg); font-weight: 800; font-size: 15px; cursor: pointer;
}
.ghost:disabled { opacity: .4; cursor: default; }
.sheet-enter-active, .sheet-leave-active { transition: opacity .2s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .2s ease-out; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(40px); }
</style>
