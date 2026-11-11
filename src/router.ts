/* Hash routes: GitHub Pages serves one file. Every route exists from the start so work streams only fill in views. */
import {createRouter, createWebHashHistory} from 'vue-router';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {path: '/', component: () => import('@/views/HomeView.vue')},
    {path: '/day/:dayId', component: () => import('@/views/DayView.vue'), props: true},       // compact layouts only; book layout shows detail on Home
    {path: '/play/:dayId', component: () => import('@/views/PlayerView.vue'), props: true},
    {path: '/done/:dayId', component: () => import('@/views/CompleteView.vue'), props: true},
    {path: '/about', component: () => import('@/views/AboutView.vue')},
    {path: '/habits', component: () => import('@/views/HabitsView.vue')},
    {path: '/upper', component: () => import('@/views/StrengthView.vue'), props: {routine: 'upper'}},
    {path: '/lower', component: () => import('@/views/StrengthView.vue'), props: {routine: 'lower'}},
    {path: '/body', component: () => import('@/views/BodyView.vue')},
    {path: '/data', component: () => import('@/views/DataView.vue')},
    {path: '/kit', component: () => import('@/views/KitView.vue')},                          // component gallery for building UI in isolation
    {path: '/:p(.*)*', redirect: '/'},
  ],
});

// opening the app lands on the tab you used last; fresh installs start on Coach
export const LAST_TAB_KEY = 'fitness-quest:tab';
const TRACKER_TABS = ['/habits', '/upper', '/lower', '/body'];
let first = true;
router.beforeEach(to => {
  const wasFirst = first;
  first = false;
  try {
    if (TRACKER_TABS.includes(to.path)) localStorage.setItem(LAST_TAB_KEY, to.path);
    else if (to.path === '/' && Object.keys(to.query).length === 0) {
      if (wasFirst) { const last = localStorage.getItem(LAST_TAB_KEY); if (last && TRACKER_TABS.includes(last)) return last; }
      localStorage.removeItem(LAST_TAB_KEY);
    }
  } catch { /* storage blocked: always start on Coach */ }
});
