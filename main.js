const { app, BrowserWindow, Menu, dialog, shell, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const os = require('os');
const autoUpdater = require('./auto-updater');
const remoteServerManager = require('./server-manager');

// Allowed domain pattern
const ALLOWED_DOMAIN = 'https://exams.jameasaifiyah.org';

// Admin password for unlocking hidden menu
const ADMIN_PASSWORD = 'AJS@Admin2025';

let mainWindow;
let adminMenuUnlocked = false;
let unlockClickCount = 0;
let unlockClickTimer = null;

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

// Function to build menu (with or without admin features)
function buildMenu() {
  const menuTemplate = [
    {
      label: 'AJSExams',
      submenu: [
        {
          label: '🔄 Refresh (Hard Reload)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.reloadIgnoringCache();
            }
          }
        },
        {
          label: '🏠 Go to Exam Portal',
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            if (mainWindow) {
              mainWindow.loadURL(ALLOWED_DOMAIN);
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: '🔓 Unlock Admin Menu',
          visible: !adminMenuUnlocked,
          click: () => {
            handleUnlockClick();
          }
        },
        {
          label: '❌ Exit',
          accelerator: 'Alt+F4',
          click: () => {
            // Stop remote server if running
            if (remoteServerManager.getStatus().isRunning) {
              remoteServerManager.stop();
            }
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetZoom'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomIn'
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomOut'
        }
      ]
    }
  ];

  // Add Admin menu if unlocked
  if (adminMenuUnlocked) {
    const serverStatus = remoteServerManager.getStatus();
    
    menuTemplate.push({
      label: '🔐 Admin',
      submenu: [
        {
          label: '📊 Remote Monitoring',
          type: 'submenu',
          submenu: [
            {
              label: serverStatus.isRunning ? '🟢 Server Running' : '🔴 Server Stopped',
              enabled: false
            },
            {
              type: 'separator'
            },
            {
              label: '▶️  Start Server',
              enabled: !serverStatus.isRunning,
              click: () => {
                const result = remoteServerManager.start();
                dialog.showMessageBox({
                  type: result.success ? 'info' : 'error',
                  title: result.success ? 'Server Started' : 'Error',
                  message: result.message,
                  detail: result.success ? `Admin panel: ${result.adminUrl}` : '',
                  buttons: ['OK']
                });
                buildMenu(); // Rebuild menu to update status
              }
            },
            {
              label: '⏹️  Stop Server',
              enabled: serverStatus.isRunning,
              click: () => {
                const result = remoteServerManager.stop();
                dialog.showMessageBox({
                  type: result.success ? 'info' : 'error',
                  title: result.success ? 'Server Stopped' : 'Error',
                  message: result.message,
                  buttons: ['OK']
                });
                buildMenu(); // Rebuild menu to update status
              }
            },
            {
              label: '🔄 Restart Server',
              enabled: serverStatus.isRunning,
              click: () => {
                remoteServerManager.restart();
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Server Restarting',
                  message: 'Remote monitoring server is restarting...',
                  buttons: ['OK']
                });
                setTimeout(() => buildMenu(), 2000);
              }
            },
            {
              type: 'separator'
            },
            {
              label: '🌐 Open Admin Panel',
              enabled: serverStatus.isRunning,
              click: () => {
                const result = remoteServerManager.openAdminPanel();
                if (!result.success) {
                  dialog.showMessageBox({
                    type: 'warning',
                    title: 'Server Not Running',
                    message: result.message,
                    buttons: ['OK']
                  });
                }
              }
            }
          ]
        },
        {
          type: 'separator'
        },
        {
          label: '🔄 Check for Updates',
          click: () => {
            autoUpdater.manualCheckForUpdates();
          }
        },
        {
          label: 'ℹ️  About',
          click: () => {
            const version = autoUpdater.getCurrentVersion();
            const serverStatus = remoteServerManager.getStatus();
            dialog.showMessageBox({
              type: 'info',
              title: 'About AJS Exam Browser',
              message: `AJS Exam Browser v${version}`,
              detail: `Secure examination browser for Jamea Saifiyah\n\nRemote Monitoring: ${serverStatus.isRunning ? 'Active' : 'Inactive'}\n\nDeveloped for academic integrity`,
              buttons: ['OK']
            });
          }
        },
        {
          type: 'separator'
        },
        {
          label: '🔒 Lock Admin Menu',
          click: () => {
            adminMenuUnlocked = false;
            buildMenu();
            dialog.showMessageBox({
              type: 'info',
              title: 'Menu Locked',
              message: 'Admin menu has been locked',
              buttons: ['OK']
            });
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Prompt for admin password
// Handle unlock menu clicks - 5 rapid clicks to unlock
function handleUnlockClick() {
  unlockClickCount++;
  
  // Clear previous timer
  if (unlockClickTimer) {
    clearTimeout(unlockClickTimer);
  }
  
  // If 5 clicks within 2 seconds, unlock
  if (unlockClickCount >= 5) {
    adminMenuUnlocked = true;
    unlockClickCount = 0;
    buildMenu();
    
    // Silent unlock - no notification
    console.log('🔓 Admin menu unlocked via 5-click sequence');
    return;
  }
  
  // Reset counter after 2 seconds of inactivity
  unlockClickTimer = setTimeout(() => {
    unlockClickCount = 0;
  }, 2000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // Completely disable DevTools
      webSecurity: true,
      allowRunningInsecureContent: false,
      plugins: false,
      enableRemoteModule: false,
      sandbox: true
    },
    autoHideMenuBar: false, // Keep menu bar visible
    fullscreenable: true,
    title: 'AJSExams Browser', // Changed to show AJSExams
    alwaysOnTop: true, // Keep window above all other applications
    kiosk: false, // Don't use kiosk mode (too restrictive)
    frame: true, // Keep window frame for minimize/close
    skipTaskbar: false, // Show in taskbar
    alwaysOnTopLevel: 'pop-up-menu', // Allow system dialogs (file picker) to appear above
    minimizable: false, // Disable minimize button
    maximizable: false // Disable maximize button
  });

  // Maximize window on startup
  mainWindow.maximize();

  // Ensure window stays on top even when it loses focus
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Prevent window from being minimized
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.restore();
  });

  // Keep window on top when it's restored or focused
  mainWindow.on('restore', () => {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();
  });

  mainWindow.on('focus', () => {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  });

  // Re-maximize if someone tries to unmaximize
  mainWindow.on('unmaximize', () => {
    mainWindow.maximize();
  });

  // Set custom user agent to identify as AJSExams browser
  // Format specifically for ASP.NET browser detection - remove Chrome identifier
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSExams/1.0.0 Safari/537.36';
  mainWindow.webContents.setUserAgent(userAgent);

  // Automatically grant camera and microphone permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
    
    if (allowedPermissions.includes(permission)) {
      callback(true); // Grant permission
    } else {
      callback(false); // Deny other permissions
    }
  });

  // Handle file dialogs - temporarily lower window priority so file picker appears on top
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Allow file selection dialogs to appear
    webPreferences.enableBlinkFeatures = 'FileSystemAccessAPI';
  });

  // Create menu with hidden admin features
  buildMenu();

  // Load the start page
  mainWindow.loadFile('index.html');

  // Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ALLOWED_DOMAIN)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            devTools: false,
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      };
    }
    return { action: 'deny' };
  });

  // Ensure custom user agent is applied to all navigation
  mainWindow.webContents.on('did-start-navigation', () => {
    // Format for ASP.NET browser detection - no Chrome identifier
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSExams/1.0.0 Safari/537.36';
    mainWindow.webContents.setUserAgent(userAgent);
  });

  // Force window title to always show "AJSExams Browser"
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle('AJSExams Browser');
  });

  // Intercept navigation attempts
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ALLOWED_DOMAIN)) {
      event.preventDefault();
      dialog.showErrorBox(
        'Navigation Blocked',
        'You can only access exams.jameasaifiyah.org in this browser.'
      );
    }
  });

  // Block external link attempts
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Prevent context menu (right-click)
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Monitor for file selection dialogs and adjust window priority
  let fileDialogOpen = false;
  
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
  });

  // Detect when file input is clicked and temporarily adjust always-on-top
  mainWindow.webContents.on('did-start-loading', () => {
    // Check if a file dialog might be opening
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('click', function(e) {
        if (e.target.tagName === 'INPUT' && e.target.type === 'file') {
          // File input clicked
          return true;
        }
      }, true);
    `).catch(() => {});
  });

  // Disable keyboard shortcuts for DevTools and other features (but allow Ctrl+Shift+R)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Allow Ctrl+Shift+R for refresh
    if (input.control && input.shift && input.key === 'R') {
      return; // Allow this shortcut
    }
    
    // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+Shift+C, F5
    if (
      input.key === 'F12' ||
      (input.control && input.shift && input.key === 'I') ||
      (input.control && input.shift && input.key === 'J') ||
      (input.control && input.shift && input.key === 'C') ||
      (input.control && input.key === 'U')
    ) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Periodically ensure window stays on top (every 2 seconds)
  // But use a level that allows system dialogs (like file picker) to appear above
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Use 'pop-up-menu' level instead of 'screen-saver' to allow file dialogs
      mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
      if (!mainWindow.isMaximized()) {
        mainWindow.maximize();
      }
    }
  }, 2000);
}

// Handle permission checks for camera and microphone at app level
app.on('web-contents-created', (event, contents) => {
  // Set custom user agent - No Chrome identifier so ASP.NET detects AJSExams
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSExams/1.0.0 Safari/537.36';
  contents.setUserAgent(userAgent);

  // Grant media permissions automatically
  contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (!navigationUrl.startsWith(ALLOWED_DOMAIN)) {
      event.preventDefault();
    }
  });

  contents.on('will-redirect', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (!navigationUrl.startsWith(ALLOWED_DOMAIN)) {
      event.preventDefault();
    }
  });
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Start auto-update checks
    autoUpdater.startAutoUpdateChecks();
    console.log('✅ Auto-updater initialized');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.focus();
      }
    });

    // Handle when app comes to foreground
    app.on('browser-window-focus', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Use pop-up-menu level to allow system dialogs
        mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
        mainWindow.maximize();
      }
    });

    // Prevent other windows from stealing focus (but allow file dialogs)
    app.on('browser-window-blur', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Delay refocus to allow system dialogs (file picker, camera permission) to show
        setTimeout(() => {
          // Check if window still exists and isn't destroyed
          if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFocused()) {
            // Only refocus if no system dialog is likely open
            const focused = BrowserWindow.getFocusedWindow();
            if (!focused || focused === mainWindow) {
              mainWindow.focus();
              mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
            }
          }
        }, 500); // Longer delay to allow dialogs to appear
      }
    });
  });
}

app.on('window-all-closed', () => {
  // Cleanup before quitting
  autoUpdater.stopAutoUpdateChecks();
  if (remoteServerManager.getStatus().isRunning) {
    remoteServerManager.stop();
  }
  app.quit();
});

app.on('before-quit', () => {
  // Stop remote server if running
  if (remoteServerManager.getStatus().isRunning) {
    remoteServerManager.stop();
  }
});

// ==================== IPC HANDLERS FOR REMOTE MONITORING ====================

// Handle screen capture requests
ipcMain.handle('capture-screen', async (event) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      // Return the primary screen as base64
      return sources[0].thumbnail.toDataURL();
    }
    
    return null;
  } catch (error) {
    console.error('Screen capture error:', error);
    return null;
  }
});

// Handle system info requests
ipcMain.handle('get-system-info', async (event) => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    uptime: os.uptime(),
    userInfo: os.userInfo()
  };
});


