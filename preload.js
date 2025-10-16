// Preload script - runs before web page loads
// This script runs in an isolated context

const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal APIs to renderer process (performance optimized)
contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  unlockAdmin: () => ipcRenderer.send('unlock-admin-request')
  // All monitoring and control APIs removed
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

  // Monitoring client removed - no background monitoring
});
