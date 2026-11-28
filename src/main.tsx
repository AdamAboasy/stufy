import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwa';
import { InstallPrompt } from './components/InstallPrompt';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <InstallPrompt isArabic={document.documentElement.lang !== 'en'} />
  </React.StrictMode>
);

registerServiceWorker();
