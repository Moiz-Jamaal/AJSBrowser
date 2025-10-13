# 📦 How to Update Version & Build - Step by Step Guide

This guide shows you exactly how to create a new release version of AJS Exam Browser.

---

## 🎯 **Quick Version Update Process**

### **Step 1: Update Version in package.json**

Open `package.json` and change the version number:

```json
{
  "name": "ajs-exam-browser",
  "version": "1.2.0",  ← Change this line
  "description": "Locked-down browser for Jamea Saifiyah exams",
```

**Version Numbering Guide:**
- **Major** (1.x.x) - Breaking changes, major features
- **Minor** (x.2.x) - New features, AWS integration, admin panel updates
- **Patch** (x.x.1) - Bug fixes, small improvements

**Examples:**
- `1.0.0` → `1.1.0` - Added auto-update feature
- `1.1.0` → `1.2.0` - Added AWS Lambda integration
- `1.2.0` → `1.2.1` - Fixed screenshot bug

---

## 🏗️ **Step 2: Build Installers**

### **For Mac Only** (Recommended - Always Works)
```bash
npm run build-mac
```

**This creates 4 files in `dist/` folder:**
- `AJS Exam Browser-1.2.0.dmg` (Intel Mac)
- `AJS Exam Browser-1.2.0-arm64.dmg` (Apple Silicon)
- `AJS Exam Browser-1.2.0-mac.zip` (Intel Mac - for auto-update)
- `AJS Exam Browser-1.2.0-arm64-mac.zip` (Apple Silicon - for auto-update)

### **For Windows** (Requires Python)
```bash
npm run build-win
```

**Creates:**
- `AJS Exam Browser Setup 1.2.0.exe` (Installer)
- `AJS Exam Browser 1.2.0.exe` (Portable)

### **For Both** (If Python is installed)
```bash
npm run build-all
```

---

## 📝 **Step 3: Test the New Build**

Before releasing, test the installer:

1. **Open the DMG file**:
   ```bash
   open "dist/AJS Exam Browser-1.2.0-arm64.dmg"
   ```

2. **Install the app** to a test location

3. **Run and verify**:
   - Student registration works
   - AWS API connection works
   - Admin menu unlocks (5-click footer)
   - Auto-update detects correct version

---

## 🚀 **Step 4: Commit Version Change**

```bash
# Add the version change
git add package.json

# Commit with clear message
git commit -m "chore: Bump version to 1.2.0"

# Push to GitHub
git push origin main
```

---

## 📦 **Step 5: Create GitHub Release**

### **Option A: Using GitHub Web Interface**

1. Go to: https://github.com/Moiz-Jamaal/AJSBrowser/releases/new

2. **Fill in release details**:
   - **Tag**: `v1.2.0`
   - **Title**: `AJS Exam Browser v1.2.0 - AWS Integration`
   - **Description**: 
     ```markdown
     ## 🎉 AWS Lambda + API Gateway Integration
     
     ### New Features
     - ✅ Global access for students and admins
     - ✅ AWS Lambda serverless backend
     - ✅ API Gateway with 7 endpoints
     - ✅ Auto-scaling architecture
     - ✅ No local server required
     
     ### Bug Fixes
     - Fixed admin panel access
     - Improved error handling
     
     ### Downloads
     - **Mac (Apple Silicon)**: Download `AJS.Exam.Browser-1.2.0-arm64.dmg`
     - **Mac (Intel)**: Download `AJS.Exam.Browser-1.2.0.dmg`
     ```

3. **Upload files**:
   - Drag and drop the 4 files from `dist/` folder
   - `AJS Exam Browser-1.2.0.dmg`
   - `AJS Exam Browser-1.2.0-arm64.dmg`
   - `AJS Exam Browser-1.2.0-mac.zip`
   - `AJS Exam Browser-1.2.0-arm64-mac.zip`

4. **Publish release** ✅

### **Option B: Using Command Line**

```bash
# Install GitHub CLI (if not installed)
brew install gh

# Login to GitHub
gh auth login

# Create release
gh release create v1.2.0 \
  --title "AJS Exam Browser v1.2.0 - AWS Integration" \
  --notes "AWS Lambda + API Gateway integration for global access" \
  "dist/AJS Exam Browser-1.2.0.dmg#Mac Intel Installer" \
  "dist/AJS Exam Browser-1.2.0-arm64.dmg#Mac Apple Silicon Installer" \
  "dist/AJS Exam Browser-1.2.0-mac.zip#Mac Intel (Auto-update)" \
  "dist/AJS Exam Browser-1.2.0-arm64-mac.zip#Mac Apple Silicon (Auto-update)"
```

---

## 🔄 **Auto-Update Will Trigger**

Once the release is published:

1. **Existing users** running v1.0.0 or v1.1.0 will see:
   ```
   🔔 New version available: 1.2.0
   📝 Release notes:
   - AWS Lambda integration
   - Global access for students
   - Improved admin panel
   
   [Download Update]
   ```

2. **Update process**:
   - User clicks "Download Update"
   - Browser downloads new version
   - Shows "Update downloaded, restart to install"
   - Restarts → New version active ✅

---

## 📋 **Complete Checklist**

Before releasing a new version:

- [ ] Update version in `package.json`
- [ ] Build installers with `npm run build-mac`
- [ ] Test the installer on a clean machine
- [ ] Verify AWS API connection works
- [ ] Test admin panel access
- [ ] Commit version change to GitHub
- [ ] Create GitHub release with proper tag
- [ ] Upload all installer files
- [ ] Write clear release notes
- [ ] Test auto-update from previous version

---

## 🐛 **Common Issues**

### **Build fails with Python error**
**Solution**: Only build Mac version
```bash
npm run build-mac
```

### **Version not updating in auto-updater**
**Solution**: Make sure GitHub release tag matches package.json version
- package.json: `"version": "1.2.0"`
- GitHub tag: `v1.2.0`

### **App not signed warning on Mac**
**Normal**: App is unsigned, users need to right-click → Open
**Solution**: Get Apple Developer certificate ($99/year) for signing

### **Windows build fails**
**Solution**: 
```bash
# Install Python 3
brew install python3

# Then build
npm run build-win
```

---

## 📖 **Example Release Flow**

Here's a complete example:

```bash
# 1. Update version
# Edit package.json: "version": "1.3.0"

# 2. Build
npm run build-mac

# 3. Commit
git add package.json
git commit -m "chore: Bump version to 1.3.0"
git push origin main

# 4. Create release on GitHub
gh release create v1.3.0 \
  --title "AJS Exam Browser v1.3.0 - New Features" \
  --notes "Added screenshot capture and activity logging" \
  "dist/AJS Exam Browser-1.3.0.dmg" \
  "dist/AJS Exam Browser-1.3.0-arm64.dmg" \
  "dist/AJS Exam Browser-1.3.0-mac.zip" \
  "dist/AJS Exam Browser-1.3.0-arm64-mac.zip"

# 5. Done! ✅
```

---

## 🎯 **Version History**

- **v1.0.0** - Initial release with basic exam browser
- **v1.1.0** - Added auto-update system
- **v1.2.0** - AWS Lambda + API Gateway integration ← **Current**
- **v1.3.0** - (Future) Enhanced monitoring features
- **v2.0.0** - (Future) Major UI redesign

---

## 💡 **Pro Tips**

1. **Always test before releasing**: Install on clean machine to catch issues
2. **Write clear release notes**: Users need to know what changed
3. **Keep versions consistent**: package.json must match GitHub tag
4. **Include all architectures**: arm64 for M1/M2/M3 Macs, x64 for Intel
5. **Test auto-update**: Run old version to verify update works

---

## 📞 **Need Help?**

If something goes wrong:
1. Check GitHub Actions logs
2. Verify version numbers match
3. Test installers manually
4. Review this guide again

**Remember**: Always increment the version number before building! 🎯
