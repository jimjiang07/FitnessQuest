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
    {path: '/kit', component: () => import('@/views/KitView.vue')},                          // component gallery for building UI in isolation
    {path: '/:p(.*)*', redirect: '/'},
  ],
});
