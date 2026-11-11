<script setup lang="ts">
import {nextTick, ref, watch} from 'vue';
import BigButton from './BigButton.vue';
import type {Phase} from './phase';

// Absolutely positioned inside the nearest positioned ancestor (a Panes pane), so it never crosses the fold.
const props = withDefaults(defineProps<{
  open: boolean;
  elapsed?: string;   // "24:51 in"
  voice: boolean;
  beeps: boolean;
  canPrevious?: boolean;
  canSkip?: boolean;
  phase?: Phase;
}>(), {canPrevious: true, canSkip: true, phase: 'work'});

const emit = defineEmits<{
  resume: []; previous: []; skip: []; end: [];
  'update:voice': [on: boolean]; 'update:beeps': [on: boolean];
}>();

const confirming = ref(false);
const resumeBtn = ref<InstanceType<typeof BigButton> | null>(null);
watch(() => props.open, async (open) => {
  confirming.value = false;
  if (open) { await nextTick(); (resumeBtn.value?.$el as HTMLElement | undefined)?.focus(); }
});
defineExpose({confirming});
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="wrap" @click.stop>
      <div class="dim" aria-hidden="true" @click="emit('resume')" />
      <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="pause-title" @keydown.esc="emit('resume')">
        <div class="grab" aria-hidden="true" />
        <div class="head">
          <h2 id="pause-title" class="fq-big">{{ confirming ? 'End workout?' : 'Paused' }}</h2>
          <span v-if="elapsed" class="fq-mini fq-muted fq-num">{{ elapsed }}</span>
        </div>

        <template v-if="!confirming">
          <BigButton ref="resumeBtn" :phase="phase" @click="emit('resume')">
            <template #icon><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg></template>
            Resume
          </BigButton>
          <div class="opts">
            <button type="button" class="opt" :disabled="!canPrevious" @click="emit('previous')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 17 6 12l5-5M18 17l-5-5 5-5" /></svg>
              Previous exercise
            </button>
            <button type="button" class="opt" :disabled="!canSkip" @click="emit('skip')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m13 17 5-5-5-5M6 17l5-5-5-5" /></svg>
              Skip exercise
            </button>
            <button type="button" class="opt" role="switch" :aria-checked="voice" @click="emit('update:voice', !voice)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>
              Voice coach<span class="toggle" :class="{off: !voice}" />
            </button>
            <button type="button" class="opt" role="switch" :aria-checked="beeps" @click="emit('update:beeps', !beeps)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              Countdown beeps<span class="toggle" :class="{off: !beeps}" />
            </button>
            <button type="button" class="opt end" @click="confirming = true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
              End workout
            </button>
          </div>
        </template>

        <template v-else>
          <p class="fq-muted ask">You’ll lose this session’s progress. Your next day stays the same.</p>
          <BigButton phase="work" @click="emit('end')">Yes, end workout</BigButton>
          <BigButton variant="ghost" @click="confirming = false">Keep going</BigButton>
        </template>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.wrap { position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column; justify-content: flex-end; border-radius: inherit; overflow: hidden; }
.dim { position: absolute; inset: 0; background: rgba(5, 7, 10, .62); }
.sheet { position: relative; max-height: 100%; overflow-y: auto; overscroll-behavior: contain; background: var(--surface); border: 1px solid var(--line); border-bottom: 0; border-radius: 26px 26px 0 0; padding: 8px 16px 10px; display: flex; flex-direction: column; gap: 8px; }
.grab { width: 40px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto; flex: none; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
h2 { font-size: 26px; }
.opts { display: flex; flex-direction: column; }
.opt { display: flex; align-items: center; gap: 12px; min-height: var(--tap-min); padding: 0 4px; border: 0; border-bottom: 1px solid var(--line); background: none; color: var(--fg); font-weight: 600; font-size: 15px; text-align: left; cursor: pointer; }
.opt:last-child { border-bottom: 0; }
.opt:disabled { opacity: .4; cursor: default; }
.opt svg { width: 18px; height: 18px; flex: none; }
.end { color: var(--work); }
.toggle { margin-left: auto; width: 44px; height: 26px; border-radius: 13px; background: var(--rest); position: relative; flex: none; transition: background .15s; }
.toggle::after { content: ""; position: absolute; top: 3px; left: 21px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
.toggle.off { background: var(--surface-2); }
.toggle.off::after { left: 3px; }
.ask { margin: 0 0 4px; font-size: 14px; }
.sheet-enter-active, .sheet-leave-active { transition: opacity .2s; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .2s ease-out; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(40px); }
</style>
