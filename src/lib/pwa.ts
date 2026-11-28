/** تسجيل الـ service worker (في الإنتاج فقط) */
export const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('[pwa] service worker registration failed', error);
    });
  });
};
