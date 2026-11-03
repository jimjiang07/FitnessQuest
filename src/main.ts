import {createApp} from 'vue';
import {createPinia} from 'pinia';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import './styles/tokens.css';
import './styles/app.css';
import App from './App.vue';
import {router} from './router';

createApp(App).use(createPinia()).use(router).mount('#app');

// offline cache for the gym; production only so dev never serves stale files
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}
