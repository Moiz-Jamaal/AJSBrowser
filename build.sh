#!/bin/bash

# Quick Build Script for macOS
# Run this on a Mac to build macOS installers

echo "========================================"
echo "  AJS Exam Browser - Quick Build (Mac)"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Clean previous build
if [ -d "dist" ]; then
    echo "Cleaning previous build..."
    rm -rf dist
    echo ""
fi

# Build
echo "Building macOS installers..."
npm run build-mac

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  BUILD SUCCESSFUL!"
    echo "========================================"
    echo ""
    echo "Output location: dist/"
    echo ""
    echo "Files created:"
    find dist -name "*.dmg" -o -name "*.zip" | while read file; do
        size=$(du -h "$file" | cut -f1)
        echo "  - $(basename "$file") ($size)"
    done
    echo ""
    echo "Ready to distribute!"
else
    echo ""
    echo "Build failed! Check errors above."
    exit 1
fi
