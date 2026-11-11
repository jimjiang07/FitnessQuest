<script setup lang="ts">
import {computed, watch} from 'vue';
import {useRouter} from 'vue-router';
import {getDay, planForDay} from '@/plan';
import {useLayout} from '@/composables/useLayout';
import DayDetail from './parts/DayDetail.vue';
import {useSettingsApi} from './player';

const props = defineProps<{dayId: string}>();
const router = useRouter();
const layout = useLayout();
const settings = useSettingsApi();

const day = computed(() => getDay(props.dayId));
const plan = computed(() => planForDay(props.dayId));

// two-pane layouts show the detail on Home, so send them there with this day selected
watch([layout, day], ([l, d]) => {
  if (!d) router.replace('/');
  else if (l === 'book' || l === 'tabletop') router.replace({path: '/', query: {day: d.id}});
}, {immediate: true});
</script>

<template>
  <main v-if="day && plan" class="page">
    <DayDetail :day="day" :plan="plan" :next="settings.nextDayId === day.id || (!settings.nextDayId && plan.days[0].id === day.id)"
      :dense="layout === 'shortWide'" back />
  </main>
</template>

<style scoped>
.page { max-width: 900px; min-height: 100vh; min-height: var(--view-h, 100dvh); margin: 0 auto; display: flex; flex-direction: column;
  padding: max(22px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left)); }
</style>
