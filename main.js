const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const autoUpdater = require('./auto-updater');

let mainWindow;

function buildMenu() {
  const menuTemplate = [
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            autoUpdater.manualCheckForUpdates();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            const version = autoUpdater.getCurrentVersion();
            dialog.showMessageBox({
              type: 'info',
              title: 'About AJS Browser',
              message: 'AJS Exam Browser',
              detail: `Version: ${version}\n\nA secure browser for Aljamea-tus-Saifiyah exams.`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      webSecurity: true,
      sandbox: true
    },
    title: 'AJS Browser',
    autoHideMenuBar: true  // Hide menu bar
  });

  // Load index.html as default page
  mainWindow.loadFile('index.html');

  // Build menu with Check for Updates option
  buildMenu();

  // Always maximize window on startup
  mainWindow.maximize();

  // Disable DevTools shortcuts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Block F12, Ctrl+Shift+I, Cmd+Option+I, Ctrl+Shift+J, Cmd+Option+J
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key === 'I') ||
      (input.meta && input.alt && input.key === 'i') ||
      (input.control && input.shift && input.key === 'J') ||
      (input.meta && input.alt && input.key === 'j')
    ) {
      event.preventDefault();
    }
  });

  // Handle navigation to exam portal when user clicks consent/continue
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to exam portal
    if (url.includes('exams.jameasaifiyah.org')) {
      // Let it navigate normally
      return;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Block screenshot and screen recording shortcuts
  const screenshotShortcuts = [
    // Windows shortcuts
    'PrintScreen',
    'Super+PrintScreen',
    'Alt+PrintScreen',
    'Super+Shift+S', // Snipping Tool
    'Super+Alt+PrintScreen',
    
    // macOS shortcuts
    'Command+Shift+3', // Full screenshot
    'Command+Shift+4', // Region screenshot
    'Command+Shift+5', // Screenshot toolbar
    'Command+Shift+6', // Touch Bar screenshot
    
    // Cross-platform alternatives
    'Control+Shift+Print',
    'CommandOrControl+Shift+3',
    'CommandOrControl+Shift+4',
    'CommandOrControl+Shift+5'
  ];

  screenshotShortcuts.forEach(shortcut => {
    try {
      const registered = globalShortcut.register(shortcut, () => {
        console.log(`🚫 Blocked screenshot shortcut: ${shortcut}`);
        
        // Show warning in the browser window
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              // Remove any existing warning
              const existing = document.getElementById('screenshot-warning-overlay');
              if (existing) existing.remove();
              
              // Create overlay
              const overlay = document.createElement('div');
              overlay.id = 'screenshot-warning-overlay';
              overlay.style.cssText = \`
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.99);
                z-index: 999999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              \`;
              
              // Create dialog box
              const dialog = document.createElement('div');
              dialog.style.cssText = \`
                background: white;
                border-radius: 12px;
                padding: 32px;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
              \`;
              
              dialog.innerHTML = \`
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                  Screenshot Blocked
                </h2>
                <p style="margin: 0 0 12px 0; font-size: 16px; color: #666; line-height: 1.5;">
                  Screenshots and screen recordings are disabled during the examination.
                </p>
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #999;">
                  This activity has been logged for security purposes.
                </p>
                <button id="close-warning-btn" style="
                  background: #cccccc;
                  color: #666;
                  border: none;
                  padding: 12px 32px;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: not-allowed;
                  width: 100%;
                  opacity: 0.6;
                " disabled>
                  Please wait <span id="countdown">10</span>s...
                </button>
              \`;
              
              overlay.appendChild(dialog);
              document.body.appendChild(overlay);
              
              const btn = document.getElementById('close-warning-btn');
              const countdownEl = document.getElementById('countdown');
              let timeLeft = 10;
              
              // Countdown timer
              const countdownInterval = setInterval(() => {
                timeLeft--;
                countdownEl.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                  clearInterval(countdownInterval);
                  btn.textContent = 'OK';
                  btn.disabled = false;
                  btn.style.background = '#007AFF';
                  btn.style.color = 'white';
                  btn.style.cursor = 'pointer';
                  btn.style.opacity = '1';
                  
                  // Enable click to close
                  btn.onclick = () => {
                    overlay.remove();
                  };
                }
              }, 1000);
              
              // Prevent any attempt to close before countdown
              overlay.onclick = (e) => {
                if (e.target === overlay && timeLeft > 0) {
                  e.stopPropagation();
                }
              };
            })();
          `);
        }
      });
      
      if (registered) {
        console.log(`✅ Blocked screenshot shortcut: ${shortcut}`);
      }
    } catch (error) {
      // Some shortcuts may not work on certain platforms
      console.log(`⚠️ Could not register shortcut: ${shortcut}`);
    }
  });

  // Start auto-updater
  autoUpdater.startAutoUpdateChecks();
  console.log('✅ Auto-updater initialized');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Stop auto-updater
  autoUpdater.stopAutoUpdateChecks();
  
  // Unregister all global shortcuts
  globalShortcut.unregisterAll();
  console.log('✅ Unregistered all global shortcuts');
  
  // Quit on all platforms including macOS
  app.quit();
});

app.on('before-quit', () => {
  // Unregister all global shortcuts on quit
  globalShortcut.unregisterAll();
});
