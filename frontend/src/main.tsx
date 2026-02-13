import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

const triggerServiceWorkerUpdate = registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('[PWA] Offline-Modus ist bereit');
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('notenest:pwa-update-available'));
  }
});

window.addEventListener('notenest:pwa-apply-update', () => {
  void triggerServiceWorkerUpdate(true);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

