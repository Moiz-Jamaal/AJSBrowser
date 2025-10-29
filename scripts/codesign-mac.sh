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
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

# Try multiple possible DMG naming patterns
DMG_PATTERNS=(
    "dist/AJS Exam Browser-${VERSION}-arm64-mac.dmg"
    "dist/AJS Exam Browser-${VERSION}-arm64.dmg"
    "dist/AJS Exam Browser-arm64-mac.dmg"
    "dist/AJS Exam Browser-${VERSION}-mac.dmg"
    "dist/AJS Exam Browser-${VERSION}.dmg"
    "dist/AJS Exam Browser-mac.dmg"
)

TEAM_ID="${APPLE_TEAM_ID}"  # Set this in your environment
APPLE_ID="${APPLE_ID_EMAIL}"  # Your Apple ID email
APP_SPECIFIC_PASSWORD="${NOTARIZATION_PASSWORD}"  # App-specific password

# Array to store found DMG files
DMG_FILES=()

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
CERT_LIST=$(security find-identity -v -p codesigning | grep "Developer ID Application")

if [ -z "$CERT_LIST" ]; then
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

# Count certificates
CERT_COUNT=$(echo "$CERT_LIST" | wc -l | xargs)

if [ "$CERT_COUNT" -eq 1 ]; then
    # Only one certificate, use it automatically
    CERT_NAME=$(echo "$CERT_LIST" | sed -n 's/.*"\(.*\)"/\1/p')
    echo -e "${GREEN}✅ Found certificate: $CERT_NAME${NC}"
else
    # Multiple certificates, let user choose
    echo -e "${YELLOW}Found $CERT_COUNT Developer ID certificates:${NC}"
    echo ""
    
    # Create array of certificate names
    CERT_NAMES=()
    INDEX=1
    while IFS= read -r line; do
        CERT=$(echo "$line" | sed -n 's/.*"\(.*\)"/\1/p')
        CERT_NAMES+=("$CERT")
        echo "  $INDEX) $CERT"
        ((INDEX++))
    done <<< "$CERT_LIST"
    
    echo ""
    echo -n "Select certificate (1-$CERT_COUNT): "
    read CERT_CHOICE
    
    # Validate input
    if ! [[ "$CERT_CHOICE" =~ ^[0-9]+$ ]] || [ "$CERT_CHOICE" -lt 1 ] || [ "$CERT_CHOICE" -gt "$CERT_COUNT" ]; then
        echo -e "${RED}❌ Invalid selection${NC}"
        exit 1
    fi
    
    # Get selected certificate (array is 0-indexed)
    CERT_NAME="${CERT_NAMES[$((CERT_CHOICE-1))]}"
    echo ""
    echo -e "${GREEN}✅ Selected certificate: $CERT_NAME${NC}"
fi

echo ""

# Check for DMG files - try patterns first, then fallback to finding all DMGs
echo "Looking for DMG files..."

# Try known patterns
for PATTERN in "${DMG_PATTERNS[@]}"; do
    if [ -f "$PATTERN" ]; then
        DMG_FILES+=("$PATTERN")
        echo -e "${GREEN}✅ Found: $(basename "$PATTERN")${NC}"
    fi
done

# If no DMGs found with patterns, search for any DMG files in dist/
if [ ${#DMG_FILES[@]} -eq 0 ]; then
    echo "Searching for all DMG files in dist/..."
    while IFS= read -r dmg; do
        DMG_FILES+=("$dmg")
        echo -e "${GREEN}✅ Found: $(basename "$dmg")${NC}"
    done < <(find dist -maxdepth 1 -name "*.dmg" -type f)
fi

if [ ${#DMG_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No DMG files found (will skip DMG signing)${NC}"
else
    echo -e "${GREEN}Found ${#DMG_FILES[@]} DMG file(s) to sign${NC}"
fi
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

# Sign the main app bundle
echo ""
echo "Signing main application bundle..."
codesign --force --timestamp \
    --options runtime \
    --entitlements "$ENTITLEMENTS_PATH" \
    --sign "$CERT_NAME" \
    "$APP_PATH"

echo -e "${GREEN}✅ Application bundle signed successfully${NC}"
echo -e "${GREEN}   Ready for notarization${NC}"
echo ""

# =============================================================================
# Step 3: Verify Signature
# =============================================================================

echo "🔍 Step 3: Verifying signature..."
echo ""

# Verify the signature
codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1

echo -e "${GREEN}✅ Signature verified${NC}"
echo ""
echo -e "${YELLOW}Note: Gatekeeper will still reject the app until notarized (Step 5)${NC}"
echo ""

# =============================================================================
# Step 4: Sign DMG Files
# =============================================================================

echo "📦 Step 4: Signing DMG files..."
echo ""

if [ ${#DMG_FILES[@]} -gt 0 ]; then
    for DMG_PATH in "${DMG_FILES[@]}"; do
        echo "Signing: $(basename "$DMG_PATH")"
        codesign --force --timestamp \
            --sign "$CERT_NAME" \
            "$DMG_PATH"
        echo -e "${GREEN}✅ Signed: $(basename "$DMG_PATH")${NC}"
        echo ""
    done
else
    echo -e "${YELLOW}⚠️  No DMG files found to sign${NC}"
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
    echo "  export APPLE_TEAM_ID='F628SUMJFF'"
    echo "  export NOTARIZATION_PASSWORD='xxxx-xxxx-xxxx-xxxx'"
    echo ""
    echo "Generate app-specific password at:"
    echo "  https://appleid.apple.com/account/manage"
    echo ""
    echo "Then run the script again to notarize."
else
    # Step 5a: Notarize app bundle
    echo "📱 Step 5a: Notarizing app bundle..."
    echo ""
    
    NOTARIZE_ZIP="dist/${APP_NAME}.zip"
    
    echo "Creating ZIP for notarization..."
    ditto -c -k --keepParent "$APP_PATH" "$NOTARIZE_ZIP"
    
    echo "Submitting app bundle to Apple..."
    xcrun notarytool submit "$NOTARIZE_ZIP" \
        --apple-id "$APPLE_ID" \
        --team-id "$TEAM_ID" \
        --password "$APP_SPECIFIC_PASSWORD" \
        --wait
    
    if [ $? -eq 0 ]; then
        echo "Stapling notarization ticket to app bundle..."
        xcrun stapler staple "$APP_PATH"
        echo -e "${GREEN}✅ App bundle notarization complete${NC}"
    else
        echo -e "${RED}❌ App bundle notarization failed${NC}"
    fi
    
    # Cleanup ZIP
    rm "$NOTARIZE_ZIP"
    echo ""
    
    # Step 5b: Notarize DMG files
    if [ ${#DMG_FILES[@]} -gt 0 ]; then
        echo "💿 Step 5b: Notarizing DMG files..."
        echo ""
        
        for DMG_PATH in "${DMG_FILES[@]}"; do
            echo "Notarizing DMG: $(basename "$DMG_PATH")"
            echo "Submitting to Apple..."
            
            xcrun notarytool submit "$DMG_PATH" \
                --apple-id "$APPLE_ID" \
                --team-id "$TEAM_ID" \
                --password "$APP_SPECIFIC_PASSWORD" \
                --wait
            
            if [ $? -eq 0 ]; then
                echo "Stapling notarization ticket to DMG..."
                xcrun stapler staple "$DMG_PATH"
                echo -e "${GREEN}✅ $(basename "$DMG_PATH") notarization complete${NC}"
                echo ""
            else
                echo -e "${RED}❌ $(basename "$DMG_PATH") notarization failed${NC}"
                echo ""
            fi
        done
        
        echo -e "${GREEN}✅ All notarizations complete${NC}"
    else
        echo -e "${YELLOW}⚠️  No DMG files found to notarize${NC}"
    fi
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
if [ ${#DMG_FILES[@]} -gt 0 ]; then
    for DMG_PATH in "${DMG_FILES[@]}"; do
        echo "  💿 DMG:  $DMG_PATH"
    done
fi
echo ""
echo "Certificate used:"
echo "  🔐 $CERT_NAME"
echo ""

# Final verification
echo "🔍 Final Gatekeeper verification:"
echo ""

# Check if notarization was performed
if [ -n "$APPLE_ID" ] && [ -n "$TEAM_ID" ] && [ -n "$APP_SPECIFIC_PASSWORD" ]; then
    # Verify app bundle
    echo "App bundle:"
    APP_SPCTL_RESULT=$(spctl -a -t exec -vv "$APP_PATH" 2>&1)
    echo "$APP_SPCTL_RESULT"
    
    if echo "$APP_SPCTL_RESULT" | grep -q "accepted"; then
        echo -e "${GREEN}✅ App bundle passes Gatekeeper (Notarized)${NC}"
    else
        echo -e "${YELLOW}⚠️  App bundle rejected by Gatekeeper${NC}"
    fi
    echo ""
    
    # Verify DMGs (these have the stapled notarization ticket)
    if [ ${#DMG_FILES[@]} -gt 0 ]; then
        for DMG_PATH in "${DMG_FILES[@]}"; do
            echo "$(basename "$DMG_PATH"):"
            DMG_SPCTL_RESULT=$(spctl -a -t open --context context:primary-signature -vv "$DMG_PATH" 2>&1)
            echo "$DMG_SPCTL_RESULT"
            
            if echo "$DMG_SPCTL_RESULT" | grep -q "accepted"; then
                echo -e "${GREEN}✅ DMG passes Gatekeeper (Notarized)${NC}"
            else
                echo -e "${YELLOW}⚠️  DMG rejected by Gatekeeper${NC}"
            fi
            echo ""
        done
    fi
else
    echo -e "${YELLOW}⚠️  Skipping Gatekeeper check - app not notarized${NC}"
    echo ""
    echo "Current status (without notarization):"
    spctl -a -t exec -vv "$APP_PATH" 2>&1 || true
    echo ""
    echo -e "${YELLOW}The app is signed but will show warnings on first launch.${NC}"
    echo -e "${YELLOW}Users will need to right-click and select 'Open' to bypass Gatekeeper.${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Test the signed app on a different Mac"
echo "  2. Upload DMG to your website for distribution"
echo "  3. Users can download and install without Gatekeeper warnings"
echo ""
echo "Distribution checklist:"
echo "  ✅ Code signed with Developer ID"
if [ -n "$APPLE_ID" ] && [ -n "$TEAM_ID" ] && [ -n "$APP_SPECIFIC_PASSWORD" ]; then
    echo "  ✅ Notarized by Apple"
else
    echo "  ⚠️  Not notarized (recommended for macOS 10.15+)"
fi
echo "  ✅ Ready for distribution outside Mac App Store"
echo ""
