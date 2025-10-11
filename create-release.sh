#!/bin/bash

# GitHub Release Creator for AJS Exam Browser
# Usage: ./create-release.sh

VERSION="v1.1.0"
REPO="Moiz-Jamaal/AJSBrowser"

echo "🚀 Creating GitHub Release for AJS Exam Browser ${VERSION}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📦 Install it with: brew install gh"
    echo "🔗 Or visit: https://cli.github.com/"
    echo ""
    echo "📍 Opening web interface instead..."
    open "https://github.com/${REPO}/releases/new"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub first:"
    gh auth login
fi

echo "📝 Creating release ${VERSION}..."
echo ""

# Create the release
gh release create "${VERSION}" \
  --repo "${REPO}" \
  --title "Version 1.1.0 - Initial Release" \
  --notes "## 🎓 AJS Exam Browser v1.1.0

### ✨ Features
- Secure exam browser with domain locking
- Remote monitoring and proctoring system
- Admin panel for monitoring active sessions
- Real-time screenshot capture
- Activity logging and tracking
- ITS ID authentication
- Auto-update system from GitHub releases

### 📦 Installation Files

**macOS:**
- Intel Macs (x64): AJS Exam Browser-1.1.0.dmg
- Apple Silicon (M1/M2/M3): AJS Exam Browser-1.1.0-arm64.dmg

**Windows:**
- Windows 10/11: AJS Exam Browser Setup 1.1.0.exe

### 🔧 System Requirements
- macOS 10.13+ or Windows 10+
- 4GB RAM minimum
- Internet connection for exam access
- Camera and microphone for proctoring

### 🔐 Admin Access
- Click footer 5 times to unlock admin features
- Start remote monitoring server
- Access admin panel at http://localhost:3000/admin" \
  "dist/AJS Exam Browser-1.1.0.dmg#macOS Intel (x64)" \
  "dist/AJS Exam Browser-1.1.0-arm64.dmg#macOS Apple Silicon (ARM64)" \
  "dist/AJS Exam Browser Setup 1.1.0.exe#Windows Installer"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Release created successfully!"
    echo "🔗 View at: https://github.com/${REPO}/releases/tag/${VERSION}"
    echo ""
    echo "🔄 Auto-updater will now detect this release!"
else
    echo ""
    echo "❌ Failed to create release"
    echo "📍 Try using the web interface instead:"
    open "https://github.com/${REPO}/releases/new"
fi
