#!/bin/bash

echo "╔════════════════════════════════════════════════════════╗"
echo "║   AJS Exam Browser - Quick Start Setup                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Run setup
echo "🔧 Setting up database and admin users..."
node setup-admin.js

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║   NEXT STEPS                                           ║"
echo "╠════════════════════════════════════════════════════════╣"
echo "║                                                        ║"
echo "║   1. Start the monitoring server:                     ║"
echo "║      npm run server                                   ║"
echo "║                                                        ║"
echo "║   2. Access admin panel:                              ║"
echo "║      http://localhost:3000/admin                      ║"
echo "║                                                        ║"
echo "║   3. Start the student browser:                       ║"
echo "║      npm start                                        ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
