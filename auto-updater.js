const { app, dialog } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GITHUB_REPO = 'Moiz-Jamaal/AJSBrowser';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

class AutoUpdater {
  constructor() {
    this.currentVersion = app.getVersion();
    this.updateCheckTimer = null;
    this.isChecking = false;
  }

  // Start automatic update checks
  startAutoUpdateChecks() {
    console.log('🔄 Auto-update system initialized');
    console.log(`📦 Current version: ${this.currentVersion}`);
    
    // Check immediately on startup
    setTimeout(() => this.checkForUpdates(false), 5000);
    
    // Then check periodically
    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdates(false);
    }, UPDATE_CHECK_INTERVAL);
  }

  // Stop automatic update checks
  stopAutoUpdateChecks() {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
    }
  }

  // Check for updates from GitHub
  async checkForUpdates(showNoUpdateDialog = true) {
    if (this.isChecking) {
      console.log('⏳ Update check already in progress...');
      return;
    }

    this.isChecking = true;
    console.log('🔍 Checking for updates...');

    try {
      const latestRelease = await this.fetchLatestRelease();
      
      if (!latestRelease) {
        console.log('ℹ️  No releases found on GitHub');
        if (showNoUpdateDialog) {
          dialog.showMessageBox({
            type: 'info',
            title: 'No Updates',
            message: 'No releases available yet.',
            buttons: ['OK']
          });
        }
        return;
      }

      const latestVersion = latestRelease.tag_name.replace('v', '');
      console.log(`📦 Latest version: ${latestVersion}`);

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log('🎉 New version available!');
        this.promptUpdate(latestRelease);
      } else {
        console.log('✅ You are running the latest version');
        if (showNoUpdateDialog) {
          dialog.showMessageBox({
            type: 'info',
            title: 'Up to Date',
            message: `You are running the latest version (${this.currentVersion})`,
            buttons: ['OK']
          });
        }
      }
    } catch (error) {
      console.error('❌ Update check failed:', error.message);
      if (showNoUpdateDialog) {
        dialog.showErrorBox('Update Check Failed', error.message);
      }
    } finally {
      this.isChecking = false;
    }
  }

  // Fetch latest release from GitHub
  fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'AJS-Exam-Browser'
        }
      };

      https.get(GITHUB_API_URL, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data);
              resolve(release);
            } catch (error) {
              reject(new Error('Failed to parse release data'));
            }
          } else if (res.statusCode === 404) {
            resolve(null); // No releases yet
          } else {
            reject(new Error(`GitHub API returned status ${res.statusCode}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });
    });
  }

  // Compare versions
  isNewerVersion(latestVersion, currentVersion) {
    const latest = latestVersion.split('.').map(Number);
    const current = currentVersion.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latest[i] > current[i]) return true;
      if (latest[i] < current[i]) return false;
    }

    return false;
  }

  // Prompt user to update
  async promptUpdate(release) {
    const version = release.tag_name.replace('v', '');
    const changelog = release.body || 'No changelog available';
    
    const response = await dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version is available: ${version}`,
      detail: `Current version: ${this.currentVersion}\n\nChangelog:\n${changelog}\n\nWould you like to download and install the update?`,
      buttons: ['Download & Install', 'Remind Me Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      // Download & Install
      this.downloadAndInstall(release);
    } else if (response.response === 2) {
      // Skip this version
      console.log(`⏭️  Skipped version ${version}`);
      // Could store this in settings to not prompt again
    }
  }

  // Download and install update
  async downloadAndInstall(release) {
    try {
      // Determine the correct asset based on platform
      const platform = process.platform;
      let assetName = '';
      
      if (platform === 'darwin') {
        // macOS
        const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
        assetName = release.assets.find(asset => 
          asset.name.includes('.dmg') && asset.name.includes(arch)
        )?.name;
      } else if (platform === 'win32') {
        // Windows
        assetName = release.assets.find(asset => 
          asset.name.includes('.exe') || asset.name.includes('.msi')
        )?.name;
      }

      if (!assetName) {
        throw new Error('No compatible installer found for your platform');
      }

      const asset = release.assets.find(a => a.name === assetName);
      const downloadUrl = asset.browser_download_url;

      dialog.showMessageBox({
        type: 'info',
        title: 'Downloading Update',
        message: `Downloading ${assetName}...`,
        detail: 'The installer will open when the download is complete.',
        buttons: ['OK']
      });

      // Open download URL in default browser
      require('electron').shell.openExternal(downloadUrl);

      console.log(`📥 Opening download URL: ${downloadUrl}`);

    } catch (error) {
      console.error('❌ Download failed:', error);
      dialog.showErrorBox('Download Failed', error.message);
    }
  }

  // Manual update check (triggered by user)
  manualCheckForUpdates() {
    this.checkForUpdates(true);
  }

  // Get current version
  getCurrentVersion() {
    return this.currentVersion;
  }

  // Get update status
  getStatus() {
    return {
      currentVersion: this.currentVersion,
      isChecking: this.isChecking,
      autoUpdateEnabled: this.updateCheckTimer !== null
    };
  }
}

// Export singleton instance
const autoUpdater = new AutoUpdater();

module.exports = autoUpdater;
