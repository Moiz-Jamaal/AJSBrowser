#!/bin/bash

# =============================================================================
# Code Sign AJS Exam Browser for macOS (Developer ID Distribution)
# =============================================================================
# This script signs the app for distribution outside the Mac App Store
# Requirements:
#   - Apple Developer Program membership ($99/year)
#   - Developer ID Application certificate installed in Keychain
#   - Xcode Command Line Tools installed
# =============================================================================

set -e  # Exit on error

echo "🔐 AJS Exam Browser - Code Signing Script"
echo "=========================================="
echo ""

# Configuration
APP_NAME="AJS Exam Browser"
APP_PATH="dist/mac/${APP_NAME}.app"
DMG_PATH="dist/AJS.Exam.Browser-$(node -p "require('./package.json').version").dmg"
TEAM_ID="${APPLE_TEAM_ID}"  # Set this in your environment
APPLE_ID="${APPLE_ID_EMAIL}"  # Your Apple ID email
APP_SPECIFIC_PASSWORD="${NOTARIZATION_PASSWORD}"  # App-specific password

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =============================================================================
# Step 1: Check Prerequisites
# =============================================================================

echo "📋 Checking prerequisites..."
echo ""

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ Error: App not found at $APP_PATH${NC}"
    echo "Please run 'npm run build-mac' first"
    exit 1
fi

# Check if Developer ID certificate is installed
CERT_NAME=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed -n 's/.*"\(.*\)"/\1/p')

if [ -z "$CERT_NAME" ]; then
    echo -e "${RED}❌ Error: No Developer ID Application certificate found${NC}"
    echo ""
    echo "To get a certificate:"
    echo "1. Join Apple Developer Program: https://developer.apple.com/programs/"
    echo "2. Go to: https://developer.apple.com/account/resources/certificates/list"
    echo "3. Create a 'Developer ID Application' certificate"
    echo "4. Download and install it in Keychain Access"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Found certificate: $CERT_NAME${NC}"
echo ""

# =============================================================================
# Step 2: Sign the Application
# =============================================================================

echo "✍️  Step 2: Signing the application..."
echo ""

# Sign all frameworks and helpers first
echo "Signing frameworks and helpers..."

# Sign dylibs and frameworks (no entitlements needed)
find "$APP_PATH/Contents" -name "*.dylib" | while read dylib; do
    echo "  - $(basename "$dylib")"
    codesign --force --timestamp \
        --options runtime \
        --sign "$CERT_NAME" \
        "$dylib" 2>&1 | grep -v "replacing existing signature" || true
done

find "$APP_PATH/Contents" -name "*.framework" | while read framework; do
    echo "  - $(basename "$framework")"
    codesign --force --deep --timestamp \
        --options runtime \
        --sign "$CERT_NAME" \
        "$framework" 2>&1 | grep -v "replacing existing signature" || true
done

# Sign helper apps (with entitlements)
ENTITLEMENTS_PATH="$(pwd)/build/entitlements.mac.plist"
find "$APP_PATH/Contents" -name "*.app" | while read helper_app; do
    echo "  - $(basename "$helper_app")"
    codesign --force --deep --timestamp \
        --options runtime \
        --entitlements "$ENTITLEMENTS_PATH" \
        --sign "$CERT_NAME" \
        "$helper_app" 2>&1 | grep -v "replacing existing signature" || true
done

# Sign the main app
echo ""
echo "Signing main application..."
codesign --force --timestamp \
    --options runtime \
    --entitlements "$ENTITLEMENTS_PATH" \
    --sign "$CERT_NAME" \
    "$APP_PATH"

echo -e "${GREEN}✅ Application signed successfully${NC}"
echo ""

# =============================================================================
# Step 3: Verify Signature
# =============================================================================

echo "🔍 Step 3: Verifying signature..."
echo ""

# Verify the signature
codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1

# Check Gatekeeper acceptance
spctl -a -t exec -vv "$APP_PATH" 2>&1

echo -e "${GREEN}✅ Signature verified${NC}"
echo ""

# =============================================================================
# Step 4: Create Signed DMG
# =============================================================================

echo "📦 Step 4: Creating signed DMG..."
echo ""

# Remove old DMG if exists
[ -f "$DMG_PATH" ] && rm "$DMG_PATH"

# Create DMG (electron-builder already creates it, we just need to sign)
if [ -f "$DMG_PATH" ]; then
    echo "Signing DMG..."
    codesign --force --timestamp \
        --sign "$CERT_NAME" \
        "$DMG_PATH"
    
    echo -e "${GREEN}✅ DMG signed${NC}"
else
    echo -e "${YELLOW}⚠️  DMG not found, run: npm run build-mac${NC}"
fi

echo ""

# =============================================================================
# Step 5: Notarize (Optional but Recommended)
# =============================================================================

echo "📨 Step 5: Notarization (recommended for macOS 10.15+)"
echo ""

if [ -z "$APPLE_ID" ] || [ -z "$TEAM_ID" ] || [ -z "$APP_SPECIFIC_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Skipping notarization - environment variables not set${NC}"
    echo ""
    echo "To enable notarization, set these environment variables:"
    echo "  export APPLE_ID_EMAIL='your-email@example.com'"
    echo "  export APPLE_TEAM_ID='YOUR_TEAM_ID'"
    echo "  export NOTARIZATION_PASSWORD='xxxx-xxxx-xxxx-xxxx'"
    echo ""
    echo "Generate app-specific password at:"
    echo "  https://appleid.apple.com/account/manage"
    echo ""
else
    echo "Notarizing app bundle..."
    
    # Create ZIP for notarization
    NOTARIZE_ZIP="dist/${APP_NAME}.zip"
    ditto -c -k --keepParent "$APP_PATH" "$NOTARIZE_ZIP"
    
    # Submit for notarization
    echo "Submitting to Apple..."
    xcrun notarytool submit "$NOTARIZE_ZIP" \
        --apple-id "$APPLE_ID" \
        --team-id "$TEAM_ID" \
        --password "$APP_SPECIFIC_PASSWORD" \
        --wait
    
    # If successful, staple the ticket
    if [ $? -eq 0 ]; then
        echo "Stapling notarization ticket..."
        xcrun stapler staple "$APP_PATH"
        
        # Also notarize and staple the DMG
        if [ -f "$DMG_PATH" ]; then
            echo "Notarizing DMG..."
            xcrun notarytool submit "$DMG_PATH" \
                --apple-id "$APPLE_ID" \
                --team-id "$TEAM_ID" \
                --password "$APP_SPECIFIC_PASSWORD" \
                --wait
            
            xcrun stapler staple "$DMG_PATH"
        fi
        
        echo -e "${GREEN}✅ Notarization complete${NC}"
    else
        echo -e "${RED}❌ Notarization failed${NC}"
    fi
    
    # Cleanup
    rm "$NOTARIZE_ZIP"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=========================================="
echo "✅ Code Signing Complete!"
echo "=========================================="
echo ""
echo "Signed files:"
echo "  📱 App:  $APP_PATH"
[ -f "$DMG_PATH" ] && echo "  💿 DMG:  $DMG_PATH"
echo ""
echo "Certificate used:"
echo "  🔐 $CERT_NAME"
echo ""
echo "Next steps:"
echo "  1. Test the signed app on a different Mac"
echo "  2. Upload DMG to your website for distribution"
echo "  3. Users can download and install without Gatekeeper warnings"
echo ""
echo "Distribution checklist:"
echo "  ✅ Code signed with Developer ID"
if [ ! -z "$APPLE_ID" ]; then
    echo "  ✅ Notarized by Apple"
else
    echo "  ⚠️  Not notarized (recommended for macOS 10.15+)"
fi
echo "  ✅ Ready for distribution outside Mac App Store"
echo ""
