// Preload script - runs before web page loads
// This script runs in an isolated context

const { contextBridge, ipcRenderer } = require('electron');

// Expose screen capture API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  unlockAdmin: () => ipcRenderer.send('unlock-admin-request'),
  // Remote control APIs
  executeRemoteCommand: (command) => ipcRenderer.invoke('remote-command', command),
  simulateKeyPress: (key, modifiers) => ipcRenderer.invoke('simulate-keypress', { key, modifiers }),
  simulateMouseClick: (x, y, button) => ipcRenderer.invoke('simulate-mouse-click', { x, y, button }),
  simulateMouseMove: (x, y) => ipcRenderer.invoke('simulate-mouse-move', { x, y }),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size')
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

  // Inject monitoring client script
  const script = document.createElement('script');
  script.src = 'file://' + __dirname + '/monitoring-client.js';
  document.head.appendChild(script);

  // Inject remote control client script
  const remoteControlScript = document.createElement('script');
  remoteControlScript.src = 'file://' + __dirname + '/remote-control-client.js';
  document.head.appendChild(remoteControlScript);
});
