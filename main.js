const { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen, desktopCapturer, net, nativeImage, systemPreferences } = require('electron');
const path = require('path');
const autoUpdater = require('./auto-updater');
const https = require('https');

let mainWindow;
let allowMinimizeSetting = false; // In-memory storage for the setting
// Screenshot automation variables
let screenshotInterval = null;
let currentUserEvalID = null;
let inMemoryScreenshotCookie = null; // For file:// protocol pages

// Function to check and request screen recording permission
async function checkScreenCapturePermission() {
  try {
    // macOS specific permission check
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen');
      console.log(`🔐 Screen recording permission status: ${status}`);
      
      if (status !== 'granted') {
        console.log('📋 Requesting screen recording permission...');
        
        // Request permission by attempting to capture
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 150, height: 150 }
        });
        
        if (sources && sources.length > 0) {
          console.log('✅ Screen recording permission granted');
          return true;
        } else {
          console.log('⚠️ Screen recording permission may be denied');
          
          // Show alert to user
          const { dialog } = require('electron');
          const response = await dialog.showMessageBox({
            type: 'warning',
            title: 'Screen Recording Permission Required',
            message: 'AJS Browser needs screen recording permission for exam monitoring.',
            detail: 'Please go to System Preferences > Security & Privacy > Privacy > Screen Recording and enable permission for AJS Browser.\n\nThe app will restart after you grant permission.',
            buttons: ['Open System Preferences', 'I\'ll Do It Later'],
            defaultId: 0
          });
          
          if (response.response === 0) {
            // Open System Preferences
            const { shell } = require('electron');
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
          }
          
          return false;
        }
      } else {
        console.log('✅ Screen recording permission already granted');
        return true;
      }
    } else if (process.platform === 'win32') {
      // Windows doesn't require explicit permission for screen capture
      console.log('✅ Windows platform - screen capture available');
      return true;
    } else {
      // Linux and other platforms
      console.log('✅ Platform supports screen capture');
      return true;
    }
  } catch (error) {
    console.error('❌ Error checking screen capture permission:', error);
    return false;
  }
}

// Function to capture full screen screenshot (all displays)
async function captureFullScreenshot() {
  try {
    const displays = screen.getAllDisplays();
    console.log(`📺 Capturing ${displays.length} display(s)...`);
    
    // Get all screen sources with high resolution
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 3840, height: 2160 }
    });

    if (!sources || sources.length === 0) {
      console.error('❌ No screen sources available');
      return null;
    }

    // Capture all screens and compress them
    const allScreenshots = [];
    const maxSizeKB = 1024; // 1MB max per screenshot
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const thumbnail = source.thumbnail;
      
      // Start with high quality JPEG compression
      let quality = 90;
      let compressedImage = thumbnail.toJPEG(quality);
      let sizeKB = compressedImage.length / 1024;
      
      // Reduce quality until size is under 1MB
      while (sizeKB > maxSizeKB && quality > 30) {
        quality -= 5;
        compressedImage = thumbnail.toJPEG(quality);
        sizeKB = compressedImage.length / 1024;
      }
      
      // Convert to base64
      const base64 = compressedImage.toString('base64');
      
      allScreenshots.push({
        name: source.name,
        display: displays[i] ? displays[i].bounds : null,
        base64: base64,
        size: sizeKB.toFixed(2),
        quality: quality,
        width: thumbnail.getSize().width,
        height: thumbnail.getSize().height
      });
      
      console.log(`✅ Captured screen ${i + 1}: ${source.name} (${sizeKB.toFixed(2)} KB, ${thumbnail.getSize().width}x${thumbnail.getSize().height}, JPEG quality: ${quality}%)`);
    }

    // Log summary
    const totalSize = allScreenshots.reduce((sum, s) => sum + parseFloat(s.size), 0).toFixed(2);
    console.log(`📸 Multi-display screenshot: ${allScreenshots.length} screens, total ${totalSize} KB`);
    
    allScreenshots.forEach((shot, idx) => {
      console.log(`   Screen ${idx + 1}: ${shot.name} - ${shot.size} KB (${shot.width}x${shot.height})`);
    });
    
    // Return array of screenshots for multiple displays
    return allScreenshots;
  } catch (error) {
    console.error('❌ Error capturing screenshot:', error);
    return null;
  }
}

// Function to upload screenshot(s) to server
async function uploadScreenshot(userEvalID, screenshotData) {
  try {
    // Check if screenshotData is an array (multiple displays) or string (single display)
    if (Array.isArray(screenshotData)) {
      // Multiple displays - upload each one separately
      console.log(`📤 Uploading ${screenshotData.length} screenshots for UserEvalID: ${userEvalID}...`);
      
      const uploadPromises = screenshotData.map(async (shot, index) => {
        // Add screen number to UserEvalID (e.g., 2859_Screen1, 2859_Screen2)
        const screenUserEvalID = `${userEvalID}_Screen${index + 1}`;
        return await uploadSingleScreenshot(screenUserEvalID, shot.base64, shot.name);
      });
      
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r).length;
      
      console.log(`✅ Uploaded ${successCount}/${screenshotData.length} screenshots successfully`);
      return successCount > 0;
    } else {
      // Single display - upload directly
      return await uploadSingleScreenshot(userEvalID, screenshotData);
    }
  } catch (error) {
    console.error('❌ Error in uploadScreenshot:', error);
    return false;
  }
}

// Helper function to upload a single screenshot
async function uploadSingleScreenshot(userEvalID, base64Image, screenName = '') {
  return new Promise((resolve, reject) => {
    try {
      const postData = `UserEvalID=${encodeURIComponent(userEvalID)}&base64String=${encodeURIComponent(base64Image)}`;
      
      const options = {
        hostname: 'exams.jameasaifiyah.org',
        port: 443,
        path: '/AJSEvalWS.asmx/SaveScreenShot',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const displayName = screenName ? ` (${screenName})` : '';
      console.log(`📤 Uploading screenshot${displayName} for UserEvalID: ${userEvalID}...`);
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ Screenshot${displayName} uploaded successfully`);
            resolve(true);
          } else {
            console.error(`❌ Failed to upload screenshot${displayName}: ${res.statusCode} ${res.statusMessage}`);
            console.error(`Response: ${data}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`❌ Error uploading screenshot${displayName}:`, error.message);
        resolve(false);
      });
      
      req.write(postData);
      req.end();
      
    } catch (error) {
      console.error('❌ Exception in uploadScreenshot:', error);
      resolve(false);
    }
  });
}

// Function to parse BrowserAllowScreenShots cookie
function parseScreenshotCookie(cookieValue) {
  if (!cookieValue || cookieValue === '') {
    return { userEvalID: null, interval: 0 };
  }
  
  const parts = cookieValue.split('_');
  if (parts.length !== 2) {
    console.warn('⚠️ Invalid BrowserAllowScreenShots cookie format');
    return { userEvalID: null, interval: 0 };
  }
  
  const userEvalID = parts[0];
  const interval = parseInt(parts[1], 10);
  
  if (isNaN(interval) || interval < 0) {
    console.warn('⚠️ Invalid interval in cookie');
    return { userEvalID, interval: 0 };
  }
  
  return { userEvalID, interval };
}

// Function to check and manage screenshot automation
async function manageScreenshotAutomation() {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }
    
    const currentURL = mainWindow.webContents.getURL();
    console.log(`🌐 Current URL: ${currentURL}`);
    
    // Get cookie from session or in-memory storage
    let cookieValue = null;
    
    // For file:// protocol, check in-memory storage first
    if (currentURL.startsWith('file://')) {
      cookieValue = inMemoryScreenshotCookie;
      if (cookieValue) {
        console.log(`📋 Screenshot cookie found (in-memory): ${cookieValue}`);
      } else {
        console.log('🔍 No in-memory cookie found for file:// protocol');
      }
    } else {
      // For HTTP/HTTPS, check session cookies
      try {
        const cookies = await mainWindow.webContents.session.cookies.get({
          name: 'BrowserAllowScreenShots'
        });
        
        if (cookies.length > 0) {
          cookieValue = cookies[0].value;
          console.log(`📋 Screenshot cookie found (session): ${cookieValue}`);
        } else {
          console.log('🔍 No session cookie found');
        }
      } catch (error) {
        console.log('❌ Error reading session cookies:', error);
      }
    }
    
    const { userEvalID, interval } = parseScreenshotCookie(cookieValue);
    
    // Stop existing interval if any
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
      console.log('⏹️ Stopped previous screenshot interval');
    }
    
    // If interval is 0 or no valid cookie, stop screenshots
    if (!userEvalID || interval === 0) {
      console.log('🛑 Screenshot automation stopped (interval = 0 or no cookie)');
      currentUserEvalID = null;
      return;
    }
    
    // Start new screenshot interval
    currentUserEvalID = userEvalID;
    console.log(`🎬 Starting screenshot automation: UserEvalID=${userEvalID}, Interval=${interval}s`);
    
    // Take first screenshot immediately
    console.log('📸 Taking initial screenshot...');
    const firstScreenshot = await captureFullScreenshot();
    if (firstScreenshot) {
      const uploaded = await uploadScreenshot(userEvalID, firstScreenshot);
      if (uploaded) {
        console.log('✅ Initial screenshot uploaded successfully');
      }
    }
    
    // Set up interval for subsequent screenshots
    console.log(`⏱️ Setting up interval: capture every ${interval} seconds`);
    screenshotInterval = setInterval(async () => {
      console.log(`📸 Interval triggered - capturing screenshot (UserEvalID: ${currentUserEvalID})`);
      const screenshot = await captureFullScreenshot();
      if (screenshot) {
        await uploadScreenshot(currentUserEvalID, screenshot);
      }
    }, interval * 1000); // Convert seconds to milliseconds
    
    console.log(`✅ Screenshot automation active - interval ID: ${screenshotInterval}`);
    
  } catch (error) {
    console.error('❌ Error managing screenshot automation:', error);
  }
}

// Function to check for multiple displays
function checkMultipleDisplays() {
  const displays = screen.getAllDisplays();
  return {
    isMultiple: displays.length > 1,
    count: displays.length,
    displays: displays
  };
}

// Function to show multiple display warning and prevent exam
function showMultipleDisplayWarning() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const displayInfo = checkMultipleDisplays();
    
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const displayCount = ${displayInfo.count};
        
        // Remove any existing overlays
        const existing = document.getElementById('multiple-display-overlay');
        if (existing) existing.remove();
        
        // Create full-screen blocking overlay
        const overlay = document.createElement('div');
        overlay.id = 'multiple-display-overlay';
        overlay.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(220, 53, 69, 0.98);
          z-index: 2147483647;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        \`;
        
        // Create dialog box
        const dialog = document.createElement('div');
        dialog.style.cssText = \`
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 550px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.4);
          text-align: center;
          animation: shake 0.5s;
        \`;
        
        // Add shake animation
        const style = document.createElement('style');
        style.textContent = \`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        \`;
        document.head.appendChild(style);
        
        dialog.innerHTML = \`
          <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite;">🚫</div>
          <h2 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #dc3545;">
            Multiple Displays Detected!
          </h2>
          <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #ffc107;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #856404;">
              ⚠️ EXAM MODE VIOLATION
            </p>
          </div>
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #333; line-height: 1.6;">
            You currently have <strong style="color: #dc3545; font-size: 20px;">\${displayCount} displays</strong> connected to your system.
          </p>
          <p style="margin: 0 0 25px 0; font-size: 15px; color: #666; line-height: 1.6;">
            For security and fairness, the exam browser <strong>requires a single display configuration</strong>. 
            Multiple monitors, extended displays, or mirrored screens are not permitted during examinations.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 25px 0; text-align: left;">
            <p style="font-size: 14px; margin: 0 0 12px 0; font-weight: 600; color: #495057;">
              📋 Required Actions:
            </p>
            <ul style="font-size: 14px; margin: 0; padding-left: 25px; line-height: 2; color: #495057;">
              <li><strong>Disconnect all external monitors</strong></li>
              <li><strong>Disable display mirroring/extending</strong></li>
              <li><strong>Use only your primary display</strong></li>
              <li><strong>Close and restart the application</strong></li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <p style="font-size: 13px; color: #004085; margin: 0; line-height: 1.5;">
              <strong>💡 Note:</strong> This restriction ensures a fair and secure examination environment for all students. 
              The application will remain blocked until you disconnect additional displays.
            </p>
          </div>
          <button id="exit-app-btn" style="
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            border: none;
            padding: 16px 40px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            width: 100%;
            margin-top: 10px;
            box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
            transition: all 0.3s;
          ">
            🚪 EXIT APPLICATION
          </button>
        \`;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Exit button functionality
        const exitBtn = document.getElementById('exit-app-btn');
        exitBtn.onmouseover = () => {
          exitBtn.style.transform = 'translateY(-2px)';
          exitBtn.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
        };
        exitBtn.onmouseout = () => {
          exitBtn.style.transform = 'translateY(0)';
          exitBtn.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
        };
        exitBtn.onclick = () => {
          if (window.electronAPI && window.electronAPI.quitApp) {
            window.electronAPI.quitApp();
          } else {
            window.close();
          }
        };
        
        // Prevent closing overlay
        overlay.onclick = (e) => {
          if (e.target === overlay) {
            e.stopPropagation();
          }
        };
        
        // Block all interactions with page content
        overlay.addEventListener('contextmenu', (e) => e.preventDefault());
        overlay.addEventListener('selectstart', (e) => e.preventDefault());
      })();
    `);
  }
}

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
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSBrowser/3.1.0 Chrome/120.0.0.0 Safari/537.36';
  mainWindow.webContents.setUserAgent(userAgent);

  // Auto-grant camera and microphone permissions for exam portal
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    
    // Allow camera and microphone for exams.jameasaifiyah.org
    if (permission === 'media' || permission === 'mediaKeySystem') {
      if (url.includes('exams.jameasaifiyah.org') || url.includes('jameasaifiyah.org')) {
        console.log(`✅ Auto-granted ${permission} permission for: ${url}`);
        callback(true);
      } else {
        console.log(`❌ Denied ${permission} permission for: ${url}`);
        callback(false);
      }
    } else {
      // For other permissions, default to false
      console.log(`⚠️ Permission requested: ${permission} for ${url} - denied by default`);
      callback(false);
    }
  });

  // Also handle permission checks (when page checks if permission is already granted)
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    // Allow media permissions for exam portal
    if (permission === 'media' || permission === 'mediaKeySystem') {
      if (requestingOrigin.includes('exams.jameasaifiyah.org') || requestingOrigin.includes('jameasaifiyah.org')) {
        console.log(`✅ Permission check approved: ${permission} for ${requestingOrigin}`);
        return true;
      }
    }
    return false;
  });

  // Load index.html as default page
  mainWindow.loadFile('index.html');

  // Build menu with Check for Updates option
  buildMenu();

  // Always maximize window on startup
  mainWindow.maximize();

  // Check for multiple displays on startup
  const initialDisplayCheck = checkMultipleDisplays();
  if (initialDisplayCheck.isMultiple) {
    console.log(`🚨 MULTIPLE DISPLAYS DETECTED: ${initialDisplayCheck.count} displays`);
    showMultipleDisplayWarning();
  } else {
    console.log('✅ Single display detected - exam mode allowed');
  }

  // Monitor for display changes
  screen.on('display-added', () => {
    console.log('🚨 Display added - checking for multiple displays');
    const displayCheck = checkMultipleDisplays();
    if (displayCheck.isMultiple) {
      showMultipleDisplayWarning();
    }
  });

  screen.on('display-removed', () => {
    console.log('📺 Display removed - checking display count');
    const displayCheck = checkMultipleDisplays();
    if (!displayCheck.isMultiple) {
      console.log('✅ Back to single display - clearing warning');
      // Remove warning overlay if it exists
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          const overlay = document.getElementById('multiple-display-overlay');
          if (overlay) overlay.remove();
        `);
      }
    }
  });

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
      
      if (cookies.length > 0) {
        const cookieValue = cookies[0].value;
        if (cookieValue === 'true') {
          console.log('📋 Cookie check: true (from session cookie)');
          return true;
        } else if (cookieValue === 'false') {
          console.log('📋 Cookie check: false (from session cookie)');
          return false;
        }
      }
      
      // Fall back to in-memory setting (for file:// pages)
      console.log(`📋 Cookie check: ${allowMinimizeSetting} (from in-memory, no session cookie found)`);
      return allowMinimizeSetting;
    } catch (error) {
      console.log('Error checking cookie:', error);
      // Default to false (minimize not allowed)
      console.log(`📋 Cookie check fallback: false (error occurred)`);
      return false;
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

  // Check for screenshot cookie when page finishes loading
  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('📄 Page loaded - checking for screenshot cookie');
    await manageScreenshotAutomation();
  });

  // Monitor cookie changes for screenshot automation
  mainWindow.webContents.session.cookies.on('changed', async (event, cookie, cause, removed) => {
    if (cookie.name === 'BrowserAllowScreenShots') {
      if (removed) {
        console.log('🗑️ Screenshot cookie removed');
      } else {
        console.log(`🍪 Screenshot cookie changed: ${cookie.value}`);
      }
      await manageScreenshotAutomation();
    }
  });

  // Ensure custom user agent is applied to all navigation
  mainWindow.webContents.on('did-start-navigation', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AJSBrowser/3.1.0 Chrome/120.0.0.0 Safari/537.36';
    mainWindow.webContents.setUserAgent(userAgent);
  });
}

app.whenReady().then(async () => {
  // Check and request screen capture permission first
  console.log('🔍 Checking screen capture permissions...');
  await checkScreenCapturePermission();
  
  createWindow();

  // IPC handler for quitting app (for multiple display warning)
  ipcMain.handle('quit-app', () => {
    app.quit();
  });

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

  // IPC handler for triggering screenshot automation check
  ipcMain.handle('check-screenshot-cookie', async () => {
    await manageScreenshotAutomation();
    return true;
  });

  // IPC handler for setting screenshot cookie (works with file:// protocol)
  ipcMain.handle('set-screenshot-cookie', async (event, cookieValue) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    
    try {
      const url = mainWindow.webContents.getURL();
      console.log(`🍪 Setting screenshot cookie: ${cookieValue} for ${url}`);
      
      // For file:// protocol, use in-memory storage
      if (url.startsWith('file://')) {
        inMemoryScreenshotCookie = cookieValue;
        console.log('✅ Screenshot cookie stored in memory (file:// protocol)');
      } else {
        // For HTTP/HTTPS, set actual session cookie
        const cookie = {
          url: url,
          name: 'BrowserAllowScreenShots',
          value: cookieValue,
          expirationDate: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 1 day
        };
        
        await mainWindow.webContents.session.cookies.set(cookie);
        console.log('✅ Screenshot cookie set in session (HTTP/HTTPS)');
      }
      
      // Trigger screenshot automation check
      await manageScreenshotAutomation();
      
      return true;
    } catch (error) {
      console.log('❌ Error setting screenshot cookie:', error);
      return false;
    }
  });

  // IPC handler for manual screenshot capture (for testing)
  ipcMain.handle('capture-screenshot', async () => {
    const screenshot = await captureFullScreenshot();
    return screenshot;
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
  
  // Clear screenshot interval
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
    console.log('✅ Screenshot automation stopped');
  }
  
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
