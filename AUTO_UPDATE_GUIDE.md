# 🚀 AUTO-UPDATE & INTEGRATED ADMIN SYSTEM

## ✨ New Features in v1.1.0

### 1. **Auto-Update System** 🔄
The browser now automatically checks for updates from GitHub and prompts users to download new versions.

### 2. **Integrated Remote Server** 📊
The monitoring server is now built into the browser - no need to run it separately!

### 3. **Password-Protected Admin Menu** 🔐
Admin features are hidden behind a password-protected menu for security.

---

## 🔄 AUTO-UPDATE SYSTEM

### How It Works:
1. **Automatic Checks**: Every 30 minutes, the browser checks GitHub for new releases
2. **Smart Detection**: Compares version numbers (semantic versioning)
3. **User Notification**: Shows update dialog with changelog
4. **Easy Download**: Opens the installer download directly

### GitHub Integration:
- **Repository**: https://github.com/Moiz-Jamaal/AJSBrowser
- **Release Detection**: Uses GitHub API to fetch latest release
- **Platform Detection**: Automatically selects the right installer (DMG for Mac, EXE for Windows)

### Version Format:
- Current version: `1.1.0` (in package.json)
- GitHub releases should be tagged as: `v1.1.0`, `v1.2.0`, etc.

### Update Process:
```
1. Browser checks GitHub API
2. Compares versions (1.0.0 → 1.1.0)
3. Shows update dialog with changelog
4. User clicks "Download & Install"
5. Opens browser to download installer
6. User installs new version
```

### Manual Update Check:
- Unlock admin menu (see below)
- Go to: **Admin → Check for Updates**

---

## 🔐 PASSWORD-PROTECTED ADMIN MENU

### Default Password:
```
AJS@Admin2025
```

⚠️ **Change this password** in `main.js`:
```javascript
const ADMIN_PASSWORD = 'YourNewPassword';
```

### How to Unlock:

1. **Open the browser**
2. **Click**: `AJSExams` menu → `🔓 Unlock Admin Menu`
3. **Enter password**: `AJS@Admin2025`
4. **Admin menu appears!** 🎉

### Admin Menu Features:

#### 📊 Remote Monitoring
- **Start Server** - Launch monitoring server
- **Stop Server** - Stop monitoring server
- **Restart Server** - Restart the server
- **Open Admin Panel** - Opens http://localhost:3000/admin in browser
- **Server Status** - Shows if server is running (🟢/🔴)

#### 🔄 Updates
- **Check for Updates** - Manually check GitHub for updates
- **About** - Shows version and server status

#### 🔒 Security
- **Lock Admin Menu** - Hides admin features again

---

## 📊 INTEGRATED REMOTE SERVER

### What's New:
The remote monitoring server is now **embedded** in the browser application!

### Benefits:
✅ No need to run `node remote-server.js` separately
✅ Start/stop server from menu
✅ Server runs as child process
✅ Automatic cleanup on app exit
✅ Easy access to admin panel

### How to Use:

#### Start Server:
1. Unlock admin menu (password: `AJS@Admin2025`)
2. Click: **Admin → Remote Monitoring → ▶️  Start Server**
3. Server starts on port 3000
4. Dialog shows: "Server started successfully"

#### Access Admin Panel:
1. Click: **Admin → Remote Monitoring → 🌐 Open Admin Panel**
2. Browser opens: http://localhost:3000/admin
3. Login with admin credentials

#### Stop Server:
1. Click: **Admin → Remote Monitoring → ⏹️  Stop Server**
2. Server stops gracefully

### Server Features:
- 🟢 Live status indicator in menu
- 🔄 Restart capability
- 🌐 One-click access to admin panel
- 🛑 Auto-stop on app exit

---

## 🎯 USAGE SCENARIOS

### Scenario 1: Regular Student Exam
```
1. Student opens browser
2. Enters ITS ID and consents
3. Takes exam
4. No admin features visible
```

### Scenario 2: Administrator Setup
```
1. Admin opens browser
2. Unlocks admin menu (password)
3. Starts remote server
4. Opens admin panel
5. Monitors student sessions
6. Locks menu when done
```

### Scenario 3: Update Available
```
1. Browser checks GitHub (automatic)
2. New version found (e.g., v1.2.0)
3. Dialog appears: "Update Available"
4. User clicks "Download & Install"
5. Installer downloads
6. User installs update
```

---

## 🔧 CONFIGURATION

### Change Admin Password:
Edit `main.js` (line 11):
```javascript
const ADMIN_PASSWORD = 'YourSecurePassword123!';
```

### Change Update Check Interval:
Edit `auto-updater.js`:
```javascript
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
// Change to: 60 * 60 * 1000 for 1 hour
```

### Change Server Port:
Edit `server-manager.js`:
```javascript
this.port = 3000;
// Change to: this.port = 8080;
```

---

## 📦 CREATING RELEASES FOR AUTO-UPDATE

### Step 1: Update Version
Edit `package.json`:
```json
{
  "version": "1.2.0"
}
```

### Step 2: Build Installers
```bash
npm run build-mac    # For macOS
npm run build-win    # For Windows
npm run build-all    # For both
```

### Step 3: Create GitHub Release

1. **Go to GitHub**: https://github.com/Moiz-Jamaal/AJSBrowser/releases
2. **Click**: "Draft a new release"
3. **Tag version**: `v1.2.0` (must include 'v')
4. **Release title**: `AJS Exam Browser v1.2.0`
5. **Description**: Add changelog
6. **Upload installers**:
   - `AJS Exam Browser-1.2.0.dmg` (Mac Intel)
   - `AJS Exam Browser-1.2.0-arm64.dmg` (Mac Apple Silicon)
   - `AJS Exam Browser Setup 1.2.0.exe` (Windows)
7. **Publish release**

### Step 4: Auto-Update Happens!
- All users get notified within 30 minutes
- They can download and install the update

---

## 🎓 ADMIN WORKFLOW

### Initial Setup:
```bash
1. Install browser
2. Run: node setup-admin.js (creates DB & admin users)
3. Open browser
4. Unlock admin menu
5. Start remote server
6. Open admin panel
7. Ready to monitor!
```

### During Exam:
```bash
1. Students open browser
2. Enter ITS ID
3. Monitoring starts automatically
4. Admin watches dashboard
5. Screenshots captured
6. Activities logged
```

### After Exam:
```bash
1. Stop remote server (if desired)
2. Lock admin menu
3. Close browser
```

---

## 🔐 SECURITY FEATURES

### Password Protection:
✅ Admin menu hidden by default
✅ Password required to unlock
✅ Can be locked again after use
✅ Password stored in code (change it!)

### Server Security:
✅ Server only accessible via admin menu
✅ Runs on localhost only
✅ Auto-stops on app exit
✅ JWT authentication for admin panel

### Update Security:
✅ Updates from official GitHub repo only
✅ HTTPS connections
✅ User confirmation required
✅ No automatic installation

---

## 📊 MENU STRUCTURE

### Standard Menu (Default):
```
AJSExams
├── 🔄 Refresh (Hard Reload)
├── 🏠 Go to Exam Portal
├── ─────────────────────
├── 🔓 Unlock Admin Menu
└── ❌ Exit

View
├── Actual Size
├── Zoom In
└── Zoom Out
```

### Admin Menu (Unlocked):
```
AJSExams
├── 🔄 Refresh (Hard Reload)
├── 🏠 Go to Exam Portal
└── ❌ Exit

View
├── Actual Size
├── Zoom In
└── Zoom Out

🔐 Admin
├── 📊 Remote Monitoring
│   ├── 🟢 Server Running (or 🔴 Server Stopped)
│   ├── ─────────────────────
│   ├── ▶️  Start Server
│   ├── ⏹️  Stop Server
│   ├── 🔄 Restart Server
│   ├── ─────────────────────
│   └── 🌐 Open Admin Panel
├── ─────────────────────
├── 🔄 Check for Updates
├── ℹ️  About
├── ─────────────────────
└── 🔒 Lock Admin Menu
```

---

## 🎉 BENEFITS

### For Administrators:
✅ No separate server to manage
✅ Easy start/stop from menu
✅ Quick access to admin panel
✅ Auto-update notifications
✅ All-in-one solution

### For Students:
✅ Always have latest version
✅ Seamless updates
✅ No admin features visible
✅ Simple, focused interface

### For IT Department:
✅ Easy deployment
✅ Centralized updates via GitHub
✅ Version control
✅ Minimal maintenance

---

## 🐛 TROUBLESHOOTING

### Admin Menu Won't Unlock:
- Check password: `AJS@Admin2025`
- Password is case-sensitive
- No spaces before/after

### Server Won't Start:
- Check if port 3000 is available
- Try restarting the browser
- Check console for errors

### Updates Not Showing:
- Check internet connection
- Verify GitHub repo is accessible
- Wait 30 minutes for next check
- Or manually check: Admin → Check for Updates

### Server Status Not Updating:
- Menu updates on action
- Click Stop/Start to refresh
- Restart browser if needed

---

## 📚 FILES MODIFIED/CREATED

### New Files:
- `auto-updater.js` - Auto-update system
- `server-manager.js` - Remote server management
- `AUTO_UPDATE_GUIDE.md` - This file

### Modified Files:
- `main.js` - Added menu system & integrations
- `package.json` - Updated version & files

---

## 🚀 QUICK START

### For Regular Use:
```bash
npm start
```

### With Admin Access:
```bash
1. npm start
2. Menu → Unlock Admin Menu
3. Enter: AJS@Admin2025
4. Admin → Remote Monitoring → Start Server
5. Admin → Remote Monitoring → Open Admin Panel
```

### Check for Updates:
```bash
1. Unlock admin menu
2. Admin → Check for Updates
```

---

## 🎓 BEST PRACTICES

### Security:
1. ⚠️ **Change the default admin password**
2. 🔒 Lock admin menu when not in use
3. 🚫 Don't share password with students
4. 🔐 Use strong password in production

### Updates:
1. 📝 Include changelog in GitHub releases
2. 🏷️ Use semantic versioning (v1.0.0, v1.1.0)
3. ✅ Test installers before releasing
4. 📢 Notify users of major updates

### Monitoring:
1. 🟢 Start server only when needed
2. 🛑 Stop server after monitoring
3. 💾 Backup database regularly
4. 📊 Review logs periodically

---

## 🎊 CONGRATULATIONS!

You now have:
✅ Auto-update system integrated
✅ Password-protected admin menu
✅ Embedded remote monitoring server
✅ Easy one-click access to admin panel
✅ Professional deployment solution

**The browser is now enterprise-ready! 🚀**

---

## 📞 SUPPORT

For issues or questions:
- Check troubleshooting section above
- Review main documentation: `REMOTE_MONITORING_README.md`
- Contact: admin@jameasaifiyah.org

---

**Version 1.1.0 - Auto-Update & Integrated Admin System**
*Developed for Jamea Saifiyah Examination System*
*October 2025*
