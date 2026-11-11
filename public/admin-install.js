// Capture the browser's install offer even if it arrives before React hydrates.
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  window.homeyAdminInstallPrompt = event;
  window.dispatchEvent(new Event('homey-admin-install-ready'));
});
window.addEventListener('appinstalled', () => {
  delete window.homeyAdminInstallPrompt;
  window.dispatchEvent(new Event('homey-admin-install-ready'));
});
