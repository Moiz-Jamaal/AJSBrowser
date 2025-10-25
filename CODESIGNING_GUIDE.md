# 🔐 Code Signing Guide for macOS Distribution

Complete guide to digitally sign your AJS Exam Browser for distribution outside the Mac App Store.

---

## 📋 Prerequisites

### 1. **Apple Developer Program Membership**
- Cost: $99/year
- Sign up: https://developer.apple.com/programs/
- Required for code signing and notarization

### 2. **Xcode Command Line Tools**
```bash
xcode-select --install
```

### 3. **Developer ID Certificate**

#### Get Your Certificate:

1. **Go to Apple Developer Portal:**
   - Visit: https://developer.apple.com/account/resources/certificates/list
   - Sign in with your Apple ID

2. **Create Certificate:**
   - Click the **+** button
   - Select **Developer ID Application**
   - Follow the prompts to create a Certificate Signing Request (CSR)
   - Download your certificate

3. **Install Certificate:**
   - Double-click the downloaded `.cer` file
   - It will be added to your Keychain Access
   - Verify: Open Keychain Access → My Certificates → Look for "Developer ID Application: Your Name"

4. **Get Your Team ID:**
   - Go to: https://developer.apple.com/account/
   - Your Team ID is shown at the top (10 characters, e.g., `A1B2C3D4E5`)

---

## 🚀 Quick Start

### **Step 1: Set Environment Variables**

Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
# Apple Developer Credentials
export APPLE_ID_EMAIL="your-email@example.com"
export APPLE_TEAM_ID="A1B2C3D4E5"  # Your 10-character Team ID
export NOTARIZATION_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
```

#### Generate App-Specific Password:
1. Go to: https://appleid.apple.com/account/manage
2. Sign in
3. Security → App-Specific Passwords → Generate
4. Name it "AJS Browser Notarization"
5. Copy the password (format: `xxxx-xxxx-xxxx-xxxx`)

Then reload your shell:
```bash
source ~/.zshrc
```

### **Step 2: Update package.json**

```json
{
  "name": "ajs-exam-browser",
  "version": "2.3.0",
  "build": {
    "appId": "org.jameasaifiyah.ajsexambrowser",
    "productName": "AJS Exam Browser",
    "copyright": "Copyright © 2025 Jamea Saifiyah",
    "mac": {
      "category": "public.app-category.education",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "type": "distribution",
      "identity": "Developer ID Application: YOUR NAME (TEAMID)",
      "minimumSystemVersion": "10.13.0"
    },
    "dmg": {
      "sign": true,
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ],
      "window": {
        "width": 540,
        "height": 380
      }
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

### **Step 3: Create Notarization Script**

```bash
chmod +x scripts/codesign-mac.sh
```

### **Step 4: Build and Sign**

```bash
# Build the app
npm run build-mac

# Sign and notarize
./scripts/codesign-mac.sh
```

---

## 📦 Complete Workflow

### **Method 1: Automated (Recommended)**

```bash
# 1. Build unsigned app
npm run build-mac

# 2. Sign and notarize
./scripts/codesign-mac.sh

# 3. Result: dist/AJS.Exam.Browser-2.3.0.dmg (signed & notarized)
```

### **Method 2: Manual Step-by-Step**

```bash
# 1. Build app
npm run build-mac

# 2. Sign the app bundle
codesign --force --deep --timestamp \
  --options runtime \
  --entitlements build/entitlements.mac.plist \
  --sign "Developer ID Application: YOUR NAME (TEAMID)" \
  "dist/mac/AJS Exam Browser.app"

# 3. Verify signature
codesign --verify --deep --strict --verbose=2 \
  "dist/mac/AJS Exam Browser.app"

# 4. Check Gatekeeper
spctl -a -t exec -vv "dist/mac/AJS Exam Browser.app"

# 5. Create ZIP for notarization
ditto -c -k --keepParent \
  "dist/mac/AJS Exam Browser.app" \
  "AJSExamBrowser.zip"

# 6. Submit for notarization
xcrun notarytool submit "AJSExamBrowser.zip" \
  --apple-id "$APPLE_ID_EMAIL" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$NOTARIZATION_PASSWORD" \
  --wait

# 7. Staple the notarization ticket
xcrun stapler staple "dist/mac/AJS Exam Browser.app"

# 8. Sign the DMG
codesign --force --timestamp \
  --sign "Developer ID Application: YOUR NAME (TEAMID)" \
  "dist/AJS.Exam.Browser-2.3.0.dmg"

# 9. Notarize the DMG
xcrun notarytool submit "dist/AJS.Exam.Browser-2.3.0.dmg" \
  --apple-id "$APPLE_ID_EMAIL" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$NOTARIZATION_PASSWORD" \
  --wait

# 10. Staple the DMG
xcrun stapler staple "dist/AJS.Exam.Browser-2.3.0.dmg"
```

---

## 🔍 Verification

### **Check Signature:**
```bash
codesign -dv --verbose=4 "dist/mac/AJS Exam Browser.app"
```

Expected output:
```
Executable=/path/to/AJS Exam Browser.app/Contents/MacOS/AJS Exam Browser
Identifier=org.jameasaifiyah.ajsexambrowser
Format=app bundle with Mach-O thin (x86_64)
CodeDirectory v=20500 size=... flags=0x10000(runtime) hashes=...
Signature size=...
Authority=Developer ID Application: YOUR NAME (TEAMID)
Authority=Developer ID Certification Authority
Authority=Apple Root CA
Timestamp=...
Info.plist entries=...
TeamIdentifier=TEAMID
Runtime Version=...
Sealed Resources version=2 rules=...
```

### **Check Notarization:**
```bash
spctl -a -vv -t install "dist/AJS.Exam.Browser-2.3.0.dmg"
```

Expected output:
```
dist/AJS.Exam.Browser-2.3.0.dmg: accepted
source=Notarized Developer ID
```

### **Check Stapling:**
```bash
xcrun stapler validate "dist/AJS.Exam.Browser-2.3.0.dmg"
```

Expected output:
```
Processing: dist/AJS.Exam.Browser-2.3.0.dmg
The validate action worked!
```

---

## 📤 Distribution

### **1. Upload to Your Website**

```bash
# Upload the signed DMG
scp dist/AJS.Exam.Browser-2.3.0.dmg user@yourserver.com:/var/www/downloads/

# Make it downloadable
# URL: https://yourwebsite.com/downloads/AJS.Exam.Browser-2.3.0.dmg
```

### **2. Create Download Page**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Download AJS Exam Browser</title>
</head>
<body>
    <h1>Download AJS Exam Browser</h1>
    
    <h2>macOS</h2>
    <a href="downloads/AJS.Exam.Browser-2.3.0.dmg">
        Download for macOS (Apple Silicon & Intel)
    </a>
    <p>Requires macOS 10.13 or later</p>
    
    <h2>Windows</h2>
    <a href="downloads/AJS.Exam.Browser.Setup.2.3.0.exe">
        Download for Windows
    </a>
    <p>Requires Windows 10 or later</p>
    
    <h3>Installation Instructions</h3>
    <p><strong>macOS:</strong></p>
    <ol>
        <li>Download the DMG file</li>
        <li>Open the DMG</li>
        <li>Drag "AJS Exam Browser" to Applications folder</li>
        <li>Open from Applications (no Gatekeeper warnings!)</li>
    </ol>
</body>
</html>
```

### **3. Generate SHA-256 Checksum**

```bash
# For verification
shasum -a 256 dist/AJS.Exam.Browser-2.3.0.dmg > dist/SHA256SUMS.txt
```

Publish the checksum on your website so users can verify:
```bash
# Users can verify
shasum -a 256 -c SHA256SUMS.txt
```

---

## 🎯 NPM Scripts (Add to package.json)

```json
{
  "scripts": {
    "build-mac": "electron-builder --mac",
    "build-mac-intel": "electron-builder --mac --x64",
    "build-mac-arm": "electron-builder --mac --arm64",
    "build-win": "electron-builder --win",
    "build-all": "electron-builder -mw",
    "sign-mac": "./scripts/codesign-mac.sh",
    "release": "npm run build-all && npm run sign-mac"
  }
}
```

Usage:
```bash
npm run release
```

---

## ⚠️ Common Issues

### **Issue: "no identity found"**
```
Error: No identity found
```

**Solution:**
1. Verify certificate is installed: `security find-identity -v -p codesigning`
2. Make sure it says "Developer ID Application" (not "Mac App Distribution")
3. Re-download certificate from developer.apple.com if needed

### **Issue: "Notarization failed"**
```
Error: The software asset has not been notarized
```

**Solution:**
1. Check notarization log:
   ```bash
   xcrun notarytool log <submission-id> \
     --apple-id "$APPLE_ID_EMAIL" \
     --team-id "$APPLE_TEAM_ID" \
     --password "$NOTARIZATION_PASSWORD"
   ```
2. Common causes:
   - Missing entitlements
   - Unsigned frameworks
   - Invalid signature

### **Issue: "hardened runtime violation"**
```
Error: Hardened runtime violation
```

**Solution:**
Ensure `entitlements.mac.plist` has all required entitlements (already included in the file).

---

## 💡 Pro Tips

1. **Test on Clean Mac**: Always test signed apps on a Mac that hasn't run the unsigned version
2. **Keep Certificates Safe**: Back up your Developer ID certificate
3. **Automate**: Use GitHub Actions or similar for automated signing
4. **Monitor Expiration**: Developer ID certificates expire after 5 years
5. **Version Bumping**: Update version in `package.json` before each release

---

## 📊 Checklist for Distribution

- [ ] Apple Developer Program membership active
- [ ] Developer ID Application certificate installed
- [ ] Team ID and credentials configured
- [ ] App-specific password generated
- [ ] `package.json` updated with signing config
- [ ] Entitlements file created
- [ ] Build script creates app
- [ ] Signing script runs successfully
- [ ] Signature verified with `codesign`
- [ ] Gatekeeper check passes with `spctl`
- [ ] Notarization submitted and approved
- [ ] Notarization ticket stapled
- [ ] DMG signed and notarized
- [ ] SHA-256 checksum generated
- [ ] Tested on clean Mac (no warnings)
- [ ] Uploaded to website
- [ ] Download page created

---

## 🎓 Additional Resources

- **Apple Code Signing**: https://developer.apple.com/support/code-signing/
- **Notarizing macOS Software**: https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution
- **Electron Builder Signing**: https://www.electron.build/code-signing
- **Developer ID**: https://developer.apple.com/developer-id/

---

## 🚀 Quick Commands Reference

```bash
# Find your identity
security find-identity -v -p codesigning

# Sign app
codesign --sign "Developer ID Application" "MyApp.app"

# Verify signature
codesign --verify --deep --strict --verbose=2 "MyApp.app"

# Check Gatekeeper
spctl -a -t exec -vv "MyApp.app"

# Notarize
xcrun notarytool submit "MyApp.zip" \
  --apple-id "email@example.com" \
  --team-id "TEAMID" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --wait

# Staple
xcrun stapler staple "MyApp.app"

# Validate stapling
xcrun stapler validate "MyApp.dmg"
```

---

**Now you're ready to distribute your app with proper code signing! 🎉**
