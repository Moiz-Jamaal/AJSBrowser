// Preload script - runs before web page loads
// This script runs in an isolated context

const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal APIs to renderer process (performance optimized)
contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  unlockAdmin: () => ipcRenderer.send('unlock-admin-request'),
  allowMinimize: () => ipcRenderer.send('allow-minimize'),
  disableMinimize: () => ipcRenderer.send('disable-minimize'),
  disableContentProtection: () => ipcRenderer.send('disable-content-protection'),
  enableContentProtection: () => ipcRenderer.send('enable-content-protection')
  // All remote monitoring and control APIs removed for performance
});

window.addEventListener('DOMContentLoaded', () => {
  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection (optional - uncomment if needed)
  // document.addEventListener('selectstart', (e) => {
  //   e.preventDefault();
  //   return false;
  // });

  // Disable certain keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && e.key === 'I') ||
      (e.ctrlKey && e.shiftKey && e.key === 'J') ||
      (e.ctrlKey && e.shiftKey && e.key === 'C') ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Inject lightweight monitoring client script
  const script = document.createElement('script');
  script.src = 'file://' + __dirname + '/monitoring-client.js';
  document.head.appendChild(script);
  
  // Remote control script removed for performance optimization
});
