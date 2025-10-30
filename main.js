const { app, BrowserWindow, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const autoUpdater = require('./auto-updater');

let mainWindow;
let allowMinimizeSetting = false; // In-memory storage for the setting

// Function to show screenshot warning (accessible globally)
function showScreenshotWarning() {
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
            Please wait <span id="countdown">5</span>s...
          </button>
        \`;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const btn = document.getElementById('close-warning-btn');
        const countdownEl = document.getElementById('countdown');
        let timeLeft = 5;
        
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
}

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
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'AJS Browser',
    autoHideMenuBar: true,  // Hide menu bar
    alwaysOnTop: true,  // Start with always on top
    fullscreenable: true,
    minimizable: true  // Keep minimize button available
  });

  // Custom user agent with AJSBrowser as primary identifier
  // Format: AJSBrowser first, then compatible Chrome info
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSBrowser/3.0.0 Chrome/120.0.0.0 Safari/537.36';
  mainWindow.webContents.setUserAgent(userAgent);

  // Load index.html as default page
  mainWindow.loadFile('index.html');

  // Build menu with Check for Updates option
  buildMenu();

  // Always maximize window on startup
  mainWindow.maximize();

  // Clear any existing BrowserAllowMinimize cookies from previous sessions
  mainWindow.webContents.session.cookies.get({ name: 'BrowserAllowMinimize' })
    .then(cookies => {
      cookies.forEach(cookie => {
        const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
        mainWindow.webContents.session.cookies.remove(cookieUrl, 'BrowserAllowMinimize')
          .then(() => console.log(`🗑️ Cleared old cookie from: ${cookieUrl}`))
          .catch(err => console.log('Could not remove cookie:', err));
      });
    })
    .catch(err => console.log('No cookies to clear:', err));

  // Function to check if minimize is allowed via cookie
  async function checkAllowMinimize() {
    try {
      // First try to get from session cookies (for HTTP/HTTPS pages)
      const cookies = await mainWindow.webContents.session.cookies.get({
        name: 'BrowserAllowMinimize'
      });
      
      if (cookies.length > 0 && cookies[0].value === 'true') {
        console.log('📋 Cookie check: true (from session cookie)');
        return true;
      }
      
      // Fall back to in-memory setting (for file:// pages)
      console.log(`📋 Cookie check: ${allowMinimizeSetting} (from in-memory, no session cookie found)`);
      return allowMinimizeSetting;
    } catch (error) {
      console.log('Error checking cookie:', error);
      // Fall back to in-memory setting
      console.log(`📋 Cookie check fallback: ${allowMinimizeSetting}`);
      return allowMinimizeSetting;
    }
  }

  // Function to enforce window restrictions
  async function enforceWindowRestrictions() {
    const allowMinimize = await checkAllowMinimize();
    
    console.log(`🔍 Enforcing restrictions: allowMinimize = ${allowMinimize}`);
    
    if (!allowMinimize) {
      // Ensure window is maximized
      if (!mainWindow.isMaximized()) {
        mainWindow.maximize();
        console.log('🔒 Window re-maximized - minimize not allowed');
      }
      
      // Ensure window is always on top
      if (!mainWindow.isAlwaysOnTop()) {
        mainWindow.setAlwaysOnTop(true);
        console.log('🔒 Window set to always on top - minimize not allowed');
      }
    } else {
      // Allow normal behavior when cookie permits
      if (mainWindow.isAlwaysOnTop()) {
        mainWindow.setAlwaysOnTop(false);
        console.log('✅ Window restrictions lifted - minimize allowed');
      }
    }
  }

  // Store reference for IPC access
  mainWindow._enforceWindowRestrictions = enforceWindowRestrictions;

  // Monitor window state changes
  mainWindow.on('minimize', async (event) => {
    const allowMinimize = await checkAllowMinimize();
    
    if (!allowMinimize) {
      event.preventDefault();
      mainWindow.restore();
      mainWindow.maximize();
      mainWindow.setAlwaysOnTop(true);
      console.log('🚫 Minimize blocked - cookie not set or false');
    } else {
      console.log('✅ Minimize allowed - cookie permits it');
    }
  });

  mainWindow.on('unmaximize', async (event) => {
    const allowMinimize = await checkAllowMinimize();
    
    if (!allowMinimize) {
      event.preventDefault();
      mainWindow.maximize();
      console.log('🚫 Unmaximize blocked - forcing fullscreen');
    }
  });

  mainWindow.on('restore', async () => {
    const allowMinimize = await checkAllowMinimize();
    
    if (!allowMinimize) {
      mainWindow.maximize();
      mainWindow.setAlwaysOnTop(true);
      console.log('🔒 Window restored to maximized state');
    }
  });

  mainWindow.on('move', async () => {
    const allowMinimize = await checkAllowMinimize();
    
    if (!allowMinimize) {
      mainWindow.maximize();
      console.log('🚫 Window move blocked - re-maximized');
    }
  });

  mainWindow.on('resize', async () => {
    const allowMinimize = await checkAllowMinimize();
    
    if (!allowMinimize && !mainWindow.isMaximized()) {
      mainWindow.maximize();
      console.log('🚫 Window resize blocked - re-maximized');
    }
  });

  // Initial enforcement on startup
  enforceWindowRestrictions();

  // Disable DevTools shortcuts AND screenshot shortcuts
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
      return;
    }

    // Block screenshot shortcuts
    // PrintScreen key
    if (input.key === 'PrintScreen' || input.code === 'PrintScreen') {
      event.preventDefault();
      console.log('🚫 Blocked PrintScreen');
      return;
    }

    // Win+Shift+S (Snipping Tool - Snip & Sketch)
    if (input.meta && input.shift && (input.key === 'S' || input.key === 's')) {
      event.preventDefault();
      console.log('🚫 Blocked Win+Shift+S (Snipping Tool)');
      showScreenshotWarning();
      return;
    }

    // Win+Shift+R (Screen Recording)
    if (input.meta && input.shift && (input.key === 'R' || input.key === 'r')) {
      event.preventDefault();
      console.log('🚫 Blocked Win+Shift+R (Screen Recording)');
      showScreenshotWarning();
      return;
    }

    // Alt+PrintScreen
    if (input.alt && (input.key === 'PrintScreen' || input.code === 'PrintScreen')) {
      event.preventDefault();
      console.log('🚫 Blocked Alt+PrintScreen');
      showScreenshotWarning();
      return;
    }

    // Win+PrintScreen
    if (input.meta && (input.key === 'PrintScreen' || input.code === 'PrintScreen')) {
      event.preventDefault();
      console.log('🚫 Blocked Win+PrintScreen');
      showScreenshotWarning();
      return;
    }

    // macOS screenshot shortcuts
    if (input.meta && input.shift && (input.key === '3' || input.key === '4' || input.key === '5' || input.key === '6')) {
      event.preventDefault();
      console.log('🚫 Blocked macOS screenshot shortcut');
      showScreenshotWarning();
      return;
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

  // Ensure custom user agent is applied to all navigation
  mainWindow.webContents.on('did-start-navigation', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSBrowser/3.0.0 Chrome/120.0.0.0 Safari/537.36';
    mainWindow.webContents.setUserAgent(userAgent);
  });
}

app.whenReady().then(() => {
  createWindow();

  // IPC handler for setting minimize permission cookie
  ipcMain.handle('set-allow-minimize', async (event, allow) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    
    try {
      // Store in memory for file:// protocol pages
      allowMinimizeSetting = allow;
      console.log(`✅ Setting stored: BrowserAllowMinimize = ${allow ? 'true' : 'false'}`);
      
      // Also try to set cookie for HTTP/HTTPS pages
      try {
        const url = mainWindow.webContents.getURL();
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const cookie = {
            url: url,
            name: 'BrowserAllowMinimize',
            value: allow ? 'true' : 'false',
            expirationDate: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 1 day
          };
          
          await mainWindow.webContents.session.cookies.set(cookie);
          console.log(`✅ Cookie also set for HTTP/HTTPS page`);
        }
      } catch (cookieError) {
        // Ignore cookie errors for file:// protocol
        console.log('Cookie not set (file:// protocol), using in-memory storage');
      }
      
      // Immediately enforce/lift restrictions
      const enforceFunc = mainWindow._enforceWindowRestrictions;
      if (enforceFunc) {
        await enforceFunc();
      }
      
      return true;
    } catch (error) {
      console.log('Error setting permission:', error);
      return false;
    }
  });

  // IPC handler for checking minimize permission
  ipcMain.handle('check-allow-minimize', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    
    try {
      // First try to get from session cookies (for HTTP/HTTPS pages)
      const cookies = await mainWindow.webContents.session.cookies.get({
        name: 'BrowserAllowMinimize'
      });
      
      if (cookies.length > 0 && cookies[0].value === 'true') {
        return true;
      }
      
      // Fall back to in-memory setting
      return allowMinimizeSetting;
    } catch (error) {
      console.log('Error checking cookie:', error);
      return allowMinimizeSetting;
    }
  });

  // Block screenshot and screen recording shortcuts at system level
  const screenshotShortcuts = [
    // Windows shortcuts - Primary methods
    'PrintScreen',
    'Super+PrintScreen',
    'Alt+PrintScreen', 
    'Super+Shift+S',    // Snipping Tool (Snip & Sketch)
    'Super+Shift+R',    // Screen Recording / Game Bar
    'Super+G',          // Xbox Game Bar
    'Super+Alt+R',      // Game Bar Record
    'Super+Alt+PrintScreen',
    
    // macOS shortcuts
    'Command+Shift+3',  // Full screenshot
    'Command+Shift+4',  // Region screenshot
    'Command+Shift+5',  // Screenshot toolbar
    'Command+Shift+6',  // Touch Bar screenshot
    'Command+Control+Shift+3', // Screenshot to clipboard
    'Command+Control+Shift+4', // Selection to clipboard
  ];

  let blockedCount = 0;
  let failedCount = 0;

  screenshotShortcuts.forEach(shortcut => {
    try {
      const registered = globalShortcut.register(shortcut, () => {
        console.log(`🚫 Blocked screenshot shortcut at system level: ${shortcut}`);
        showScreenshotWarning();
      });
      
      if (registered) {
        blockedCount++;
        console.log(`✅ Successfully registered blocker for: ${shortcut}`);
      } else {
        failedCount++;
        console.log(`⚠️ Could not register (may be system-reserved): ${shortcut}`);
      }
    } catch (error) {
      failedCount++;
      console.log(`❌ Error registering ${shortcut}:`, error.message);
    }
  });

  console.log(`📊 Screenshot blocking: ${blockedCount} shortcuts blocked, ${failedCount} couldn't be registered`);
  console.log(`ℹ️ Note: Some system shortcuts like Win+Shift+S may be handled by before-input-event instead`);

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
