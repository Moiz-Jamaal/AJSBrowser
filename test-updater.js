#!/usr/bin/env node

// Test Auto-Updater Platform Detection
// Run with: node test-updater.js

const os = require('os');

console.log('\n🔍 Auto-Updater Platform Detection Test\n');
console.log('═'.repeat(50));

const platform = process.platform;
const arch = process.arch;
const osType = os.type();
const osRelease = os.release();

console.log(`\n📊 System Information:`);
console.log(`   Platform: ${platform}`);
console.log(`   Architecture: ${arch}`);
console.log(`   OS Type: ${osType}`);
console.log(`   OS Release: ${osRelease}`);

console.log('\n📦 File Selection Logic:\n');

if (platform === 'darwin') {
  console.log('   ✅ Detected: macOS');
  if (arch === 'arm64') {
    console.log('   🍎 CPU: Apple Silicon (M1/M2/M3)');
    console.log('   📥 Would download: AJS Exam Browser-1.1.0-arm64.dmg');
  } else if (arch === 'x64') {
    console.log('   💻 CPU: Intel');
    console.log('   📥 Would download: AJS Exam Browser-1.1.0.dmg');
  } else {
    console.log(`   ⚠️  Unknown architecture: ${arch}`);
  }
} else if (platform === 'win32') {
  console.log('   ✅ Detected: Windows');
  console.log('   📥 Would download: AJS Exam Browser Setup 1.1.0.exe');
} else if (platform === 'linux') {
  console.log('   ✅ Detected: Linux');
  console.log('   ⚠️  No Linux build available yet');
} else {
  console.log(`   ❌ Unknown platform: ${platform}`);
}

console.log('\n' + '═'.repeat(50));
console.log('\n✅ Detection test complete!\n');
