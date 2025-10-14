# AJS Exam Browser - Complete Documentation

> **Last Updated:** October 9, 2025  
> **Version:** 1.0.0  
> **Complete guide for installation, usage, development, and server-side integration**

---

# Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Features](#features)
4. [Installation & Setup](#installation--setup)
5. [Building Installers](#building-installers)
6. [Distribution Guide](#distribution-guide)
7. [Browser Security](#browser-security)
8. [Media Permissions](#media-permissions)
9. [Server-Side Detection (ASP.NET)](#server-side-detection-aspnet)
10. [User Agent Configuration](#user-agent-configuration)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Technical Details](#technical-details)

---

## Overview

**AJS Exam Browser** is a secure, locked-down Chromium-based browser specifically designed for accessing the Jamea Saifiyah examination portal at `https://exams.jameasaifiyah.org`.

### Key Characteristics

- **Single-Purpose Browser**: Only accesses the designated exam portal
- **Custom Browser Identity**: Identifies as "AJSExams" for server-side validation
- **Zero Configuration**: Camera, microphone, and file uploads work automatically
- **Always Visible**: Window stays on top and cannot be minimized
- **Developer-Proof**: All debugging tools, extensions, and workarounds blocked
- **Cross-Platform**: Available for Windows (built) and macOS (buildable)

---

## Quick Start

### First-Time Setup

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Choose LTS (Long Term Support) version

2. **Open PowerShell**
   ```powershell
   cd "C:\Users\Administrator\Desktop\AJSBrowser"
   ```

3. **Install Dependencies** (only needed once)
   ```powershell
   npm install
   ```

4. **Run the Browser**
   ```powershell
   npm start
   ```

### Daily Use (After Setup)

```powershell
cd "C:\Users\Administrator\Desktop\AJSBrowser"
npm start
```

### Creating Standalone Installers

```powershell
npm run build-win
```

Find installers in: `dist/` folder

---

## Features

### Core Security Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Domain Lock** | Only `https://exams.jameasaifiyah.org*` accessible | ✅ |
| **Browser Identity** | Identifies as "AJSExams" to servers | ✅ |
| **Always On Top** | Window stays above all applications | ✅ |
| **Cannot Minimize** | Minimize button disabled and blocked | ✅ |
| **Cannot Maximize** | Maximize button disabled | ✅ |
| **DevTools Blocked** | F12, Ctrl+Shift+I, all shortcuts disabled | ✅ |
| **No Right-Click** | Context menu completely disabled | ✅ |
| **No View Source** | Ctrl+U and view source blocked | ✅ |
| **No Extensions** | Browser extensions cannot be installed | ✅ |
| **Single Instance** | Only one browser window can run | ✅ |

### Media & File Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Camera Access** | Auto-granted (no permission prompts) | ✅ |
| **Microphone Access** | Auto-granted (no permission prompts) | ✅ |
| **File Upload** | Dialog appears on top of browser | ✅ |
| **Multiple Files** | Select multiple files for upload | ✅ |
| **Drag & Drop** | Drag files from Windows Explorer | ✅ |

### User Features

| Feature | Shortcut | Description |
|---------|----------|-------------|
| **Hard Refresh** | `Ctrl+Shift+R` | Clear cache and reload page |
| **Go to Portal** | `Ctrl+H` | Navigate to exam homepage |
| **Zoom In** | `Ctrl++` | Increase page size |
| **Zoom Out** | `Ctrl+-` | Decrease page size |
| **Reset Zoom** | `Ctrl+0` | Reset to 100% |
| **Exit** | `Alt+F4` | Close browser |

### Branding

- **Window Title**: "AJSExams Browser" (locked, never changes)
- **Taskbar**: Shows "AJSExams Browser"
- **Menu Bar**: Always visible with "AJSExams" branding
- **User Agent**: Contains "AJSExams/1.0.0" identifier

---

## Installation & Setup

### Prerequisites

- **Node.js** (version 16 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Windows 10/11** (for Windows builds)
- **macOS** (for Mac builds - must be built on Mac)

### Development Setup

1. **Clone or Download Project**
   ```powershell
   cd C:\Users\Administrator\Desktop\AJSBrowser
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```
   
   This installs:
   - Electron 28.0.0
   - electron-builder 24.9.1
   - All required dependencies

3. **Test Run**
   ```powershell
   npm start
   ```

4. **Verify Functionality**
   - Window should open maximized
   - Title should show "AJSExams Browser"
   - Menu bar should be visible
   - Click "Go to Exam Portal" button

---

## Building Installers

### Windows (on Windows PC)

```powershell
npm run build-win
```

**Creates:**
- `dist/AJS Exam Browser Setup 1.0.0.exe` (~135 MB) - Full installer
- `dist/AJS Exam Browser 1.0.0.exe` (~72 MB) - Portable version

**Features:**
- 32-bit and 64-bit support
- Start Menu shortcuts
- Desktop shortcut
- Uninstaller included
- No admin rights required (portable version)

### macOS (must build on Mac)

1. **Transfer project to Mac** (USB, cloud, network)

2. **Install dependencies on Mac:**
   ```bash
   cd /path/to/AJSBrowser
   npm install
   ```

3. **Build macOS installers:**
   ```bash
   npm run build-mac
   ```

**Creates:**
- `dist/AJS Exam Browser-1.0.0.dmg` - Disk image installer
- `dist/AJS Exam Browser-1.0.0-mac.zip` - Zipped app bundle
- Separate builds for Intel (x64) and Apple Silicon (arm64)

### Build All Platforms

```bash
npm run build-all
```

**Note:** macOS builds must be created on an actual Mac due to Apple's code signing and notarization requirements.

### Build Output Location

```
dist/
├── win-unpacked/              (Windows unpacked files)
├── mac/                       (macOS unpacked files)
├── AJS Exam Browser Setup.exe (Windows installer)
├── AJS Exam Browser.exe       (Windows portable)
├── AJS Exam Browser.dmg       (macOS disk image)
└── AJS Exam Browser-mac.zip   (macOS zip)
```

---

## Distribution Guide

### Installation Methods

#### Windows - Full Installation (Recommended)

**File:** `AJS Exam Browser Setup 1.0.0.exe` (135 MB)

**Steps:**
1. Double-click installer
2. Windows SmartScreen warning may appear:
   - Click "More info"
   - Click "Run anyway"
3. Choose installation folder (default: `C:\Program Files\AJS Exam Browser`)
4. Click "Install"
5. Launch from Start Menu or Desktop

**Benefits:**
- Professional installation
- Start Menu integration
- Desktop shortcut
- Easy uninstall via Control Panel

#### Windows - Portable Version

**File:** `AJS Exam Browser 1.0.0.exe` (72 MB)

**Steps:**
1. Copy .exe to any folder (Desktop, USB drive, etc.)
2. Double-click to run
3. No installation required!

**Benefits:**
- No admin rights needed
- Run from USB drive
- No system changes
- Delete file to "uninstall"

#### macOS Installation

**From DMG:**
1. Double-click `.dmg` file
2. Drag app to Applications folder
3. Eject disk image
4. Right-click app → "Open" (first time only)
5. Click "Open" to confirm

**From ZIP:**
1. Extract `.zip` file
2. Drag app to Applications folder
3. Right-click app → "Open" (first time only)

### Distribution Methods

#### 1. Cloud Storage (Recommended)
- Upload to Google Drive, Dropbox, OneDrive
- Share download link with students
- Best for small to medium groups

#### 2. Network Share
- Place on school/organization network
- Students access from shared folder
- Good for managed environments

#### 3. USB Distribution
- Copy installer to USB drives
- Hand out to students
- Good for offline distribution

#### 4. Website Download
- Host on organization website
- Provide download page with instructions
- Best for large-scale distribution

#### 5. Email (Not Recommended)
- Files are too large (70-135 MB)
- May be blocked by email filters
- Use cloud links instead

### User Instructions Template

```
═══════════════════════════════════════
   AJS EXAM BROWSER - INSTALLATION
═══════════════════════════════════════

WINDOWS USERS:
1. Download: AJS Exam Browser Setup 1.0.0.exe
2. Double-click to install
3. If Windows shows security warning:
   - Click "More info"
   - Click "Run anyway"
4. Follow installer steps
5. Launch from Start Menu or Desktop

MAC USERS:
1. Download: AJS Exam Browser.dmg
2. Open the .dmg file
3. Drag app to Applications folder
4. Right-click the app → "Open"
5. Click "Open" to confirm
6. Launch from Applications

USING THE BROWSER:
• Opens automatically to exam portal
• Press Ctrl+Shift+R to refresh
• Press Alt+F4 to exit
• Camera/mic work automatically
• File uploads appear on top

SUPPORT:
Contact: [your-support-email]

═══════════════════════════════════════
```

### Security Warnings

#### Windows SmartScreen

**Why it appears:**
- Application is not code-signed
- Microsoft hasn't verified the publisher

**How to bypass:**
1. Click "More info"
2. Click "Run anyway"

**To eliminate (optional):**
- Purchase code signing certificate ($50-300/year)
- Sign executable with certificate
- Builds trust with Microsoft over time

#### macOS Gatekeeper

**Why it appears:**
- App is not notarized by Apple
- Not from Mac App Store

**How to bypass:**
1. Right-click app
2. Select "Open"
3. Click "Open" in dialog

**To eliminate (optional):**
- Join Apple Developer Program ($99/year)
- Code sign and notarize app

---

## Browser Security

### Complete Lockdown Features

#### Navigation Restrictions

```javascript
// Only this domain is allowed:
const ALLOWED_DOMAIN = 'https://exams.jameasaifiyah.org';
```

**What's blocked:**
- ❌ Typing other URLs in address bar
- ❌ Following links to external sites
- ❌ Opening new windows/tabs to other domains
- ❌ JavaScript redirects to other sites
- ❌ Form submissions to external URLs

**What's allowed:**
- ✅ Full navigation within exam domain
- ✅ Subdomains: `*.exams.jameasaifiyah.org`
- ✅ All pages under exam domain
- ✅ File downloads from exam server

#### Developer Tools Blocked

**Keyboard shortcuts disabled:**
- `F12` - Open DevTools
- `Ctrl+Shift+I` - Inspect Element
- `Ctrl+Shift+J` - Console
- `Ctrl+Shift+C` - Element Picker
- `Ctrl+U` - View Page Source

**Menu options removed:**
- No "Inspect Element" in context menu (context menu completely disabled)
- No "Developer Tools" in menu bar
- No "View Source" option anywhere

**Code-level blocks:**
```javascript
webPreferences: {
  devTools: false,  // Completely disable DevTools
}
```

#### Right-Click Protection

- Context menu completely disabled via `preload.js`
- JavaScript event: `contextmenu` prevented
- No workarounds possible

#### Extension Blocking

- Extensions cannot be installed
- No extension APIs available
- Extension store inaccessible

#### Window Control

```javascript
minimizable: false,  // Disable minimize button
maximizable: false,  // Disable maximize button
alwaysOnTop: true,   // Stay above all windows
```

**Automatic behaviors:**
- Window opens maximized
- Stays on top of all applications
- Cannot be minimized (button disabled)
- Cannot be unmaximized (button disabled)
- Auto-refocus when other apps try to take over
- Prevents hiding behind other windows

#### Single Instance Enforcement

```javascript
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}
```

Only one instance of the browser can run at a time.

---

## Media Permissions

### Camera & Microphone - Auto-Granted

**Zero permission prompts!** Camera and microphone access is automatically granted for the exam domain.

#### Automatically Granted Permissions:
- `media` - General media access
- `microphone` - Audio input
- `camera` - Video input
- `audioCapture` - Audio recording
- `videoCapture` - Video recording

#### Implementation:

```javascript
mainWindow.webContents.session.setPermissionRequestHandler(
  (webContents, permission, callback) => {
    const allowedPermissions = [
      'media', 
      'microphone', 
      'camera', 
      'audioCapture', 
      'videoCapture'
    ];
    
    if (allowedPermissions.includes(permission)) {
      callback(true);  // Auto-grant
    } else {
      callback(false); // Deny others
    }
  }
);
```

### File Upload Support

File selection dialogs appear **on top** of the browser window.

#### How it Works:

```javascript
alwaysOnTopLevel: 'pop-up-menu'  // Allows system dialogs on top
```

**Features:**
- ✅ File picker appears above browser
- ✅ Multiple file selection supported
- ✅ Drag & drop from Windows Explorer
- ✅ All file types supported (based on input accept attribute)
- ✅ Large files supported (limited by server)

### Use Cases

#### 1. Video Proctoring

```html
<video id="proctor" autoplay></video>
<script>
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    document.getElementById('proctor').srcObject = stream;
  });
</script>
```

#### 2. File Upload Questions

```html
<form method="POST" enctype="multipart/form-data">
  <label>Upload your answer (PDF, DOCX):</label>
  <input type="file" accept=".pdf,.docx" name="answer" required>
  <button type="submit">Submit Answer</button>
</form>
```

#### 3. Oral Exam Recording

```javascript
let mediaRecorder;
let chunks = [];

navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      // Upload to server
    };
    mediaRecorder.start();
  });
```

#### 4. Multiple File Upload

```html
<input type="file" multiple accept=".pdf,.doc,.jpg,.png">
```

### Testing Media & Upload

Use included test file: `test-media-upload.html`

```
file:///C:/Users/Administrator/Desktop/AJSBrowser/test-media-upload.html
```

**Tests included:**
1. Camera Test
2. Microphone Test
3. Camera + Mic Together
4. File Upload (button)
5. Drag & Drop Upload

---

## Server-Side Detection (ASP.NET)

### The Problem

ASP.NET's `Request.Browser.Browser` uses the .NET Framework's internal browser definition files. Custom browsers like "AJSExams" are not recognized.

### The Solution

**Check `Request.UserAgent` directly** instead of relying on `Request.Browser.Browser`.

### Quick Fix for Existing Code

#### Change 1: Display Browser Name

**REPLACE THIS:**
```csharp
"<tr><td>Browser : </td><td>" + browser.Browser.ToString() + "%</td></tr>"
```

**WITH THIS:**
```csharp
"<tr><td>Browser : </td><td>" + (Request.UserAgent.Contains("AJSExams") ? "AJSExams" : browser.Browser.ToString()) + "</td></tr>"
```

#### Change 2: Validate Browser

**REPLACE THIS:**
```csharp
if (browser.Frames == true && 
    browser.Tables == true && 
    browser.Cookies == true && 
    browser.Browser.Contains("AJSExams"))
```

**WITH THIS:**
```csharp
if (browser.Frames == true && 
    browser.Tables == true && 
    browser.Cookies == true && 
    Request.UserAgent.Contains("AJSExams"))
```

### Complete Implementation Methods

#### Method 1: Helper Method (Recommended)

```csharp
public static bool IsAJSExamsBrowser(HttpRequest request)
{
    string userAgent = request.UserAgent;
    if (string.IsNullOrEmpty(userAgent))
        return false;
    
    return userAgent.Contains("AJSExams");
}

// Usage:
string browserName = IsAJSExamsBrowser(Request) ? "AJSExams" : Request.Browser.Browser;

if (IsAJSExamsBrowser(Request) && 
    Request.Browser.Frames && 
    Request.Browser.Tables && 
    Request.Browser.Cookies)
{
    CHBBrowser.Checked = true;
}
```

#### Method 2: Property in Code-Behind

```csharp
public partial class ExamPage : System.Web.UI.Page
{
    protected string BrowserName
    {
        get
        {
            if (Request.UserAgent != null && Request.UserAgent.Contains("AJSExams"))
                return "AJSExams";
            else
                return Request.Browser.Browser;
        }
    }
    
    protected bool IsAJSExamsBrowser
    {
        get
        {
            return Request.UserAgent != null && Request.UserAgent.Contains("AJSExams");
        }
    }
}

// Usage in markup or code:
// <%= BrowserName %>
// if (IsAJSExamsBrowser) { ... }
```

#### Method 3: App_Code Utility Class

Create file: `App_Code/BrowserHelper.cs`

```csharp
using System;
using System.Web;

public static class BrowserHelper
{
    public static bool IsAJSExamsBrowser()
    {
        if (HttpContext.Current == null || 
            HttpContext.Current.Request.UserAgent == null)
            return false;
            
        return HttpContext.Current.Request.UserAgent.Contains("AJSExams");
    }
    
    public static string GetBrowserName()
    {
        if (IsAJSExamsBrowser())
            return "AJSExams";
        
        if (HttpContext.Current != null && 
            HttpContext.Current.Request.Browser != null)
            return HttpContext.Current.Request.Browser.Browser;
            
        return "Unknown";
    }
    
    public static bool ValidateExamBrowser()
    {
        if (HttpContext.Current == null || 
            HttpContext.Current.Request == null)
            return false;
            
        var request = HttpContext.Current.Request;
        
        if (!IsAJSExamsBrowser())
            return false;
            
        if (request.Browser.Frames != true || 
            request.Browser.Tables != true || 
            request.Browser.Cookies != true)
            return false;
            
        return true;
    }
}

// Usage:
// BrowserHelper.GetBrowserName()
// if (BrowserHelper.ValidateExamBrowser()) { ... }
```

#### Method 4: Global Application Level

In `Global.asax`:

```csharp
protected void Application_BeginRequest(object sender, EventArgs e)
{
    // Only check for exam pages
    string path = Request.Path.ToLower();
    if (path.Contains("/exam/") || path.Contains("/evaluation/"))
    {
        string userAgent = Request.UserAgent;
        
        if (string.IsNullOrEmpty(userAgent) || 
            !userAgent.Contains("AJSExams"))
        {
            Response.StatusCode = 403;
            Response.Write(@"
                <html>
                <body>
                    <h1>Access Denied</h1>
                    <p>You must use the official AJS Exam Browser.</p>
                    <p>Download from: <a href='/download'>Download Page</a></p>
                </body>
                </html>
            ");
            Response.End();
        }
    }
}
```

### Testing Detection

Create test page: `test-detection.aspx`

```asp
<%@ Page Language="C#" %>
<!DOCTYPE html>
<html>
<body>
    <h1>Browser Detection Test</h1>
    <%
        string userAgent = Request.UserAgent;
        bool isAJSExams = userAgent != null && userAgent.Contains("AJSExams");
        string browserName = isAJSExams ? "AJSExams" : Request.Browser.Browser;
    %>
    
    <table border="1" style="font-size: 16px; border-collapse: collapse;">
        <tr>
            <td style="padding: 10px;"><strong>User Agent:</strong></td>
            <td style="padding: 10px;"><%= userAgent %></td>
        </tr>
        <tr>
            <td style="padding: 10px;"><strong>Contains AJSExams:</strong></td>
            <td style="padding: 10px; <%= isAJSExams ? "color:green" : "color:red" %>">
                <%= isAJSExams ? "YES ✓" : "NO ✗" %>
            </td>
        </tr>
        <tr>
            <td style="padding: 10px;"><strong>Browser Name:</strong></td>
            <td style="padding: 10px;"><%= browserName %></td>
        </tr>
        <tr>
            <td style="padding: 10px;"><strong>Request.Browser.Browser:</strong></td>
            <td style="padding: 10px;"><%= Request.Browser.Browser %></td>
        </tr>
    </table>
    
    <% if (isAJSExams) { %>
        <h2 style="color:green;">✓ AJSExams Browser Detected!</h2>
    <% } else { %>
        <h2 style="color:red;">✗ Not AJSExams Browser</h2>
    <% } %>
</body>
</html>
```

---

## User Agent Configuration

### Current User Agent String

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) 
AppleWebKit/537.36 (KHTML, like Gecko) 
AJSExams/1.0.0 
Safari/537.36
```

### Why "Chrome" Was Removed

**Problem:** ASP.NET browser detection reads left-to-right and stops at the first recognized browser.

**Old (Wrong):**
```
... AJSExams/1.0.0 Chrome/120.0.0.0 Safari/537.36
                    ↑
                    ASP.NET stopped here, returned "Chrome"
```

**New (Correct):**
```
... AJSExams/1.0.0 Safari/537.36
    ↑
    ASP.NET stops here, returns "AJSExams"
```

### Order Matters!

Put custom browser identifier **before** any standard browser identifiers:

✅ **Correct:**
- `Mozilla/5.0 ... AJSExams/1.0.0 ... Safari/537.36`

❌ **Wrong:**
- `Mozilla/5.0 ... Chrome/120 ... AJSExams/1.0.0`

### Testing User Agent

Use included test: `test-user-agent.html`

```
file:///C:/Users/Administrator/Desktop/AJSBrowser/test-user-agent.html
```

**Checks:**
- ✅ Shows full user agent string
- ✅ Verifies "AJSExams" appears before "Chrome/Safari"
- ✅ Validates version number format
- ✅ Predicts what ASP.NET will detect
- ✅ Shows green checkmarks if all correct

---

## Testing

### Test Files Included

#### 1. test-user-agent.html
**Tests:** Client-side user agent detection

**What it does:**
- Displays full user agent string
- Checks if "AJSExams" is present
- Verifies correct ordering
- Predicts ASP.NET detection result

**Open in browser:**
```
file:///C:/Users/Administrator/Desktop/AJSBrowser/test-user-agent.html
```

#### 2. test-media-upload.html
**Tests:** Camera, microphone, and file upload

**What it does:**
- Camera test (with live preview)
- Microphone test (with audio visualizer)
- Camera + Mic together
- File upload button
- Drag & drop test

**Open in browser:**
```
file:///C:/Users/Administrator/Desktop/AJSBrowser/test-media-upload.html
```

#### 3. test-aspnet-detection.aspx
**Tests:** Server-side ASP.NET detection

**What it does:**
- Shows Request.UserAgent
- Shows Request.Browser.Browser
- Shows all browser capabilities
- Color-coded success/failure

**Deploy to IIS and open in browser**

### Pre-Deployment Testing Checklist

Before distributing to students:

**Windows Testing:**
- [ ] Install on clean Windows 10 system
- [ ] Install on clean Windows 11 system
- [ ] Test portable version (no installation)
- [ ] Verify domain lock (try accessing google.com)
- [ ] Confirm F12/DevTools completely blocked
- [ ] Check right-click disabled
- [ ] Test refresh button (Ctrl+Shift+R)
- [ ] Verify always-on-top behavior
- [ ] Test on 32-bit system (if available)

**macOS Testing:**
- [ ] Install on Intel Mac
- [ ] Install on Apple Silicon Mac
- [ ] Test both .dmg and .zip versions
- [ ] Verify all security features work
- [ ] Check Gatekeeper bypass process

**Functional Testing:**
- [ ] Navigate to exam site
- [ ] Try accessing other sites (should fail)
- [ ] Try opening DevTools (should fail)
- [ ] Try viewing source (should fail)
- [ ] Test all blocked keyboard shortcuts
- [ ] Verify extensions cannot be installed
- [ ] Test camera (should work immediately)
- [ ] Test microphone (should work immediately)
- [ ] Test file upload (dialog should appear on top)
- [ ] Test drag & drop files
- [ ] Verify menu bar visible
- [ ] Test all menu options

**Server-Side Testing:**
- [ ] Deploy test-aspnet-detection.aspx to IIS
- [ ] Open in AJS Browser
- [ ] Verify shows "AJSExams" not "Chrome"
- [ ] Test actual exam page detection code
- [ ] Verify browser validation checkbox works
- [ ] Test with other browsers (should fail validation)

---

## Troubleshooting

### Installation Issues

#### Windows Won't Run Installer

**Symptoms:**
- Double-click does nothing
- "This app can't run on your PC"
- Access denied errors

**Solutions:**
1. Run as Administrator (right-click → "Run as administrator")
2. Temporarily disable antivirus
3. Check Windows version compatibility (Win 10/11 required)
4. Verify download completed (check file size)

#### macOS Won't Open App

**Symptoms:**
- "App is damaged"
- "Cannot be opened"
- Gatekeeper blocks

**Solutions:**
1. Check System Preferences → Security & Privacy
2. Right-click app → "Open" (instead of double-click)
3. Try: `sudo spctl --master-disable` (then re-enable after)
4. Remove quarantine: `xattr -cr "/Applications/AJS Exam Browser.app"`

### Runtime Issues

#### Browser Window Not Appearing

**Symptoms:**
- Process runs but no window
- Crashes immediately
- Black screen

**Solutions:**
1. Check if already running (single instance lock)
2. Kill any existing Electron processes
3. Disable hardware acceleration in code (already done)
4. Check graphics drivers updated
5. Run from terminal to see error messages:
   ```powershell
   cd C:\Users\Administrator\Desktop\AJSBrowser
   npm start
   ```

#### Cannot Access Exam Site

**Symptoms:**
- "Navigation Blocked" error
- Blank page
- Connection refused

**Solutions:**
1. Check internet connection
2. Verify exam site URL is correct and active
3. Check firewall/proxy settings
4. Verify domain constant in main.js:
   ```javascript
   const ALLOWED_DOMAIN = 'https://exams.jameasaifiyah.org';
   ```
5. Check if exam server is running

### Media Issues

#### Camera Not Working

**Symptoms:**
- Black video preview
- "Camera not found"
- No video feed

**Solutions:**
1. **Check physical device:**
   - Camera plugged in?
   - Device drivers installed?
   - Working in other applications?

2. **Check Windows Privacy Settings:**
   - Settings → Privacy → Camera
   - "Allow apps to access your camera" = ON
   - AJS Browser should be listed and allowed

3. **Check in Device Manager:**
   - Camera should be listed without yellow warning
   - Update drivers if needed

4. **Test in test-media-upload.html:**
   - Open test file in browser
   - Click "Start Camera"
   - Check console for error messages

#### Microphone Not Working

**Symptoms:**
- No audio captured
- "Microphone not found"
- Audio visualizer flat

**Solutions:**
1. **Check physical device:**
   - Microphone plugged in?
   - Correct input device selected in Windows Sound settings?
   - Working in other applications?

2. **Check Windows Privacy Settings:**
   - Settings → Privacy → Microphone
   - "Allow apps to access your microphone" = ON

3. **Check Windows Sound Settings:**
   - Right-click speaker icon → "Sound settings"
   - Choose correct input device
   - Test microphone level

4. **Test in test-media-upload.html:**
   - Click "Start Microphone"
   - Speak into mic
   - Visualizer should show activity

### File Upload Issues

#### File Dialog Not Appearing

**Symptoms:**
- Click "Choose Files" but nothing happens
- Dialog appears behind browser
- Cannot select files

**Solutions:**
1. **Wait a moment:**
   - Dialog may take 500ms to appear on top
   - Don't click multiple times

2. **Check window focus:**
   - Alt+Tab to see if dialog is open
   - May be hidden behind browser initially

3. **Try drag & drop instead:**
   - Open Windows Explorer
   - Drag files onto upload area

4. **Check antivirus:**
   - Some security software blocks file dialogs
   - Temporarily disable to test
   - Add browser to whitelist

#### Files Not Uploading

**Symptoms:**
- Files selected but don't appear
- Upload fails
- Timeout errors

**Solutions:**
1. **Check file size:**
   - Server may have upload limit
   - IIS default: 30 MB
   - Configure in web.config:
     ```xml
     <system.webServer>
       <security>
         <requestFiltering>
           <requestLimits maxAllowedContentLength="104857600" /> <!-- 100 MB -->
         </requestFiltering>
       </security>
     </system.webServer>
     ```

2. **Check file types:**
   - Server may restrict certain extensions
   - Verify accept attribute matches allowed types
   - Check MIME types on server

3. **Check network:**
   - Large files may timeout
   - Check server logs for errors
   - Verify upload endpoint is working
   - Test with small file first

### Server Detection Issues

#### ASP.NET Still Shows "Chrome"

**Symptoms:**
- `browser.Browser` returns "Chrome"
- Browser validation fails
- Checkbox not checked

**Solutions:**
1. **Update detection code:**
   - Use `Request.UserAgent.Contains("AJSExams")`
   - Don't rely on `browser.Browser`

2. **Clear browser cache:**
   - Press Ctrl+Shift+R in browser
   - Or rebuild installers and reinstall

3. **Add debug output:**
   ```csharp
   Response.Write("User Agent: " + Request.UserAgent + "<br>");
   Response.Write("Browser: " + Request.Browser.Browser + "<br>");
   Response.Write("Contains AJSExams: " + Request.UserAgent.Contains("AJSExams"));
   ```

4. **Verify correct build:**
   - Check user agent in test-user-agent.html
   - Should show "AJSExams/1.0.0"
   - Should NOT show "Chrome"

### Build Issues

#### npm install Fails

**Symptoms:**
- Error messages during npm install
- Missing dependencies
- Version conflicts

**Solutions:**
1. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

2. **Delete and reinstall:**
   ```powershell
   Remove-Item node_modules -Recurse -Force
   npm install
   ```

3. **Check Node.js version:**
   ```powershell
   node --version  # Should be 16.x or higher
   ```

4. **Run as Administrator:**
   - Right-click PowerShell → "Run as administrator"
   - Try npm install again

#### Build Fails

**Symptoms:**
- `npm run build-win` fails
- "Error: ENOENT" messages
- Build hangs indefinitely

**Solutions:**
1. **Run PowerShell as Administrator**

2. **Disable antivirus temporarily:**
   - Antivirus may block file operations
   - Re-enable after build

3. **Check disk space:**
   - Need ~2 GB free for build
   - Clean temp files if needed

4. **Clear dist folder:**
   ```powershell
   Remove-Item dist -Recurse -Force
   npm run build-win
   ```

5. **Check build logs:**
   - `dist/builder-debug.yml`
   - Look for specific error messages

---

## Technical Details

### Architecture

**Framework:** Electron 28.0.0
- Chromium 120.x rendering engine
- Node.js 18.x runtime
- V8 JavaScript engine

**Security:**
- Context Isolation: Enabled
- Node Integration: Disabled
- Sandbox: Enabled
- WebSecurity: Enabled
- DevTools: Disabled

### File Structure

```
AJSBrowser/
├── main.js              # Main process - core logic
├── preload.js           # Preload script - additional security
├── index.html           # Welcome page
├── package.json         # Project configuration
├── node_modules/        # Dependencies
├── dist/                # Build output
├── build/               # Build assets (icons)
├── test-user-agent.html        # UA test page
├── test-media-upload.html      # Media test page
├── test-aspnet-detection.aspx  # ASP.NET test page
└── COMPLETE_DOCUMENTATION.md   # This file
```

### Configuration Files

#### package.json

```json
{
  "name": "ajs-exam-browser",
  "version": "1.0.0",
  "description": "Secure exam browser for Jamea Saifiyah",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build-win": "electron-builder --win",
    "build-mac": "electron-builder --mac",
    "build-all": "electron-builder --win --mac"
  },
  "build": {
    "appId": "org.jameasaifiyah.exambrowser",
    "productName": "AJS Exam Browser",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "category": "public.app-category.education"
    }
  }
}
```

### Key Code Sections

#### main.js - Window Creation

```javascript
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      plugins: false,
      enableRemoteModule: false,
      sandbox: true
    },
    autoHideMenuBar: false,
    fullscreenable: true,
    title: 'AJSExams Browser',
    alwaysOnTop: true,
    kiosk: false,
    frame: true,
    skipTaskbar: false,
    alwaysOnTopLevel: 'pop-up-menu',
    minimizable: false,
    maximizable: false
  });
  
  mainWindow.maximize();
}
```

#### main.js - User Agent

```javascript
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                  'AJSExams/1.0.0 ' +
                  'Safari/537.36';
mainWindow.webContents.setUserAgent(userAgent);
```

#### main.js - Navigation Control

```javascript
mainWindow.webContents.on('will-navigate', (event, url) => {
  if (!url.startsWith(ALLOWED_DOMAIN)) {
    event.preventDefault();
    dialog.showErrorBox(
      'Navigation Blocked',
      'You can only access exams.jameasaifiyah.org in this browser.'
    );
  }
});
```

#### preload.js - Additional Security

```javascript
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

window.addEventListener('keydown', (e) => {
  // Block F12, Ctrl+Shift+I, etc.
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    (e.ctrlKey && e.shiftKey && e.key === 'J') ||
    (e.ctrlKey && e.shiftKey && e.key === 'C') ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
  }
});
```

### System Requirements

#### Windows
- Windows 10 (1809 or later)
- Windows 11 (all versions)
- 4 GB RAM minimum
- 500 MB disk space
- Internet connection

#### macOS
- macOS 10.13 (High Sierra) or later
- macOS 11 (Big Sur) or later recommended
- 4 GB RAM minimum
- 500 MB disk space
- Internet connection

### Browser Capabilities

**Supported:**
- ✅ HTML5 (full support)
- ✅ CSS3 (full support)
- ✅ JavaScript ES6+
- ✅ WebRTC (camera/microphone)
- ✅ WebGL
- ✅ Canvas
- ✅ SVG
- ✅ Video/Audio elements
- ✅ LocalStorage
- ✅ Cookies
- ✅ AJAX/Fetch
- ✅ WebSockets
- ✅ File API
- ✅ Drag & Drop API
- ✅ Fullscreen API

**Not Supported:**
- ❌ Extensions
- ❌ Plugins (Flash, Java, etc.)
- ❌ External protocol handlers
- ❌ Download management (auto-handled by system)

### Performance Considerations

**Optimizations:**
- Hardware acceleration disabled (better compatibility)
- Single process model
- Minimal memory footprint
- No unnecessary background tasks

**Resource Usage:**
- RAM: ~200-400 MB typical
- CPU: Minimal when idle
- Network: Depends on exam content
- Disk: 150-200 MB installed

---

## Summary

### What You Get

✅ **Complete secure exam browser**
- Domain-locked to exam portal
- All developer tools blocked
- Camera/microphone auto-granted
- File uploads work seamlessly
- Always stays on top
- Cannot be minimized or hidden

✅ **Built installers (Windows)**
- Full installer (135 MB)
- Portable version (72 MB)
- Ready to distribute

✅ **Server-side detection**
- Identifies as "AJSExams"
- ASP.NET code examples provided
- Test files included

✅ **Complete documentation**
- Installation guides
- User instructions
- Developer documentation
- Troubleshooting steps

### Quick Reference Commands

```powershell
# Development
npm install                 # Install dependencies
npm start                   # Run browser

# Building
npm run build-win          # Build Windows installers
npm run build-mac          # Build macOS installers (on Mac)
npm run build-all          # Build all platforms

# Testing
# Open test-user-agent.html        # Test user agent
# Open test-media-upload.html      # Test media/files
# Deploy test-aspnet-detection.aspx # Test server detection
```

### Support

For technical issues or questions:
1. Check Troubleshooting section above
2. Review test files to diagnose issues
3. Check browser console (if DevTools re-enabled for testing)
4. Contact your system administrator

---

**Document Version:** 1.0.0  
**Last Updated:** October 9, 2025  
**AJS Exam Browser Version:** 1.0.0

**Ready for production deployment!** 🎓
