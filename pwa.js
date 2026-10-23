/* Kezdőképernyőre telepítés és offline indulás, külső szolgáltatás nélkül. */
(() => {
  'use strict';
  const button = document.getElementById('install-app'), panel = document.getElementById('install-panel');
  const dialog = document.getElementById('install-dialog'), status = document.getElementById('app-status');
  const updateButton = document.getElementById('update-app');
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const web = ['http:', 'https:'].includes(location.protocol);
  let deferredInstall = null, waitingWorker = null, reloading = false, offlineReady = false;
  function installedState() {
    panel.hidden = standalone() || !web;
    document.documentElement.classList.toggle('installed-app', standalone());
  }
  function showStatus() {
    status.textContent = offlineReady ? (navigator.onLine ? '● Offline játék kész' : '● Internet nélkül játszol') : 'Offline játék előkészítése…';
  }
  installedState();
  if (!web) { status.textContent = 'A telefonos telepítéshez nyisd meg a játék webcímét.'; return; }
  document.getElementById('install-ios').hidden = !ios;
  document.getElementById('install-other').hidden = ios;
  document.getElementById('install-close').onclick = () => dialog.close();
  button.onclick = async () => {
    if (deferredInstall) {
      const prompt = deferredInstall; deferredInstall = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch { dialog.showModal(); }
    } else dialog.showModal();
  };
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; });
  window.addEventListener('appinstalled', () => { deferredInstall = null; panel.hidden = true; if (dialog.open) dialog.close(); });
  matchMedia('(display-mode: standalone)').addEventListener('change', installedState);
  window.addEventListener('online', showStatus); window.addEventListener('offline', showStatus);
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'A telepítéshez és offline játékhoz HTTPS-webcím szükséges.';
    return;
  }
  function offerUpdate(registration) {
    if (!registration.waiting || !navigator.serviceWorker.controller) return;
    waitingWorker = registration.waiting; updateButton.hidden = false;
  }
  updateButton.onclick = () => {
    if (!waitingWorker) return;
    // Az aktuális csata/termelés állapota a frissítés előtt is mentésre kerül.
    if (typeof sync === 'function' && typeof save === 'function') { sync(); save(); }
    updateButton.disabled = true;
    waitingWorker.postMessage({type: 'ACTIVATE_UPDATE'});
  };
  let wasControlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!wasControlled) { wasControlled = true; return; }
    if (reloading) return;
    reloading = true; location.reload();
  });
  navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'}).then(registration => {
    offerUpdate(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offerUpdate(registration); });
    });
    let lastChecked = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine && Date.now() - lastChecked > 60000) {
        lastChecked = Date.now(); registration.update().catch(() => {});
      }
    });
    return navigator.serviceWorker.ready;
  }).then(() => {
    offlineReady = true; showStatus();
  }).catch(() => {
    status.textContent = 'Az offline mód most nem elérhető. Online tovább játszhatsz.';
  });
})();
