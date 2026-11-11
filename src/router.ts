/* Hash routes: GitHub Pages serves one file. `meta.tab` says which tab a screen belongs to; `fullscreen` hides the tab bar. */
import {createRouter, createWebHashHistory} from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta { tab?: 'coach' | 'habits' | 'upper' | 'lower' | 'body' | 'data'; fullscreen?: boolean }
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {path: '/', component: () => import('@/views/HomeView.vue'), meta: {tab: 'coach'}},
    {path: '/day/:dayId', component: () => import('@/views/DayView.vue'), props: true, meta: {tab: 'coach'}},  // compact layouts only; book shows detail on Home
    {path: '/play/:dayId', component: () => import('@/views/PlayerView.vue'), props: true, meta: {fullscreen: true}},
    {path: '/done/:dayId', component: () => import('@/views/CompleteView.vue'), props: true, meta: {fullscreen: true}},
    {path: '/about', component: () => import('@/views/AboutView.vue'), meta: {tab: 'coach'}},
    {path: '/habits', component: () => import('@/views/HabitsView.vue'), meta: {tab: 'habits'}},
    {path: '/upper', component: () => import('@/views/StrengthView.vue'), props: {routine: 'upper'}, meta: {tab: 'upper'}},
    {path: '/lower', component: () => import('@/views/StrengthView.vue'), props: {routine: 'lower'}, meta: {tab: 'lower'}},
    {path: '/body', component: () => import('@/views/BodyView.vue'), meta: {tab: 'body'}},
    {path: '/data', component: () => import('@/views/DataView.vue'), meta: {tab: 'data'}},
    {path: '/kit', component: () => import('@/views/KitView.vue'), meta: {fullscreen: true}},                // component gallery for building UI in isolation
    {path: '/:p(.*)*', redirect: '/'},
  ],
});

// opening the app lands on the tracker tab you used last; tapping Coach makes Coach the landing page again
const LAST_TAB_KEY = 'fitness-quest:tab';
const TRACKER_TABS = ['habits', 'upper', 'lower', 'body'];
const storage = {
  get: () => { try { return localStorage.getItem(LAST_TAB_KEY); } catch { return null; } },
  set: (v: string | null) => { try { if (v) localStorage.setItem(LAST_TAB_KEY, v); else localStorage.removeItem(LAST_TAB_KEY); } catch { /* blocked */ } },
};

router.beforeEach((to, from) => {
  const last = storage.get();
  const opening = from.matched.length === 0;
  if (opening && to.path === '/' && !Object.keys(to.query).length && last && TRACKER_TABS.includes(last)) return `/${last}`;
});
router.afterEach(to => {
  if (TRACKER_TABS.includes(to.meta.tab ?? '')) storage.set(to.meta.tab!);
  else if (to.path === '/') storage.set(null);
});
