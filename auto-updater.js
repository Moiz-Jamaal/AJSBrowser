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

  // Prompt user to update (auto-install)
  async promptUpdate(release) {
    const version = release.tag_name.replace('v', '');
    const changelog = release.body || 'No changelog available';
    
    // Show notification that update is starting
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Detected',
      message: `New version ${version} detected!`,
      detail: `Current: ${this.currentVersion}\nNew: ${version}\n\nDownloading and installing automatically...\n\nThe browser will restart when installation is complete.`,
      buttons: ['OK']
    });

    // Automatically start download and install
    this.downloadAndInstall(release);
  }

  // Download and install update
  async downloadAndInstall(release) {
    try {
      // Determine the correct asset based on platform
      const platform = process.platform;
      const arch = process.arch;
      let asset = null;
      
      if (platform === 'darwin') {
        // macOS - look for DMG file
        if (arch === 'arm64') {
          asset = release.assets.find(a => 
            a.name.match(/arm64\.dmg$/i)
          );
        } else {
          asset = release.assets.find(a => 
            a.name.match(/\.dmg$/i) && !a.name.includes('arm64')
          );
        }
      } else if (platform === 'win32') {
        // Windows - look for EXE installer
        asset = release.assets.find(a => 
          a.name.match(/\.exe$/i)
        );
      }

      if (!asset) {
        throw new Error(`No installer found for ${platform} (${arch})`);
      }

      const downloadUrl = asset.browser_download_url;
      const fileName = asset.name;
      const downloadPath = path.join(app.getPath('downloads'), fileName);

      console.log(`📥 Downloading update from: ${downloadUrl}`);
      console.log(`💾 Saving to: ${downloadPath}`);

      // Download the file
      await this.downloadFile(downloadUrl, downloadPath);

      console.log('✅ Download complete!');
      
      // Show completion dialog
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Update Downloaded',
        message: 'Update has been downloaded successfully!',
        detail: 'The browser will now close and install the update. Please wait for the installer to open.',
        buttons: ['Install Now'],
        defaultId: 0
      });

      if (result.response === 0) {
        // Install based on platform
        if (platform === 'darwin') {
          // macOS: Open DMG file
          console.log('🍎 Opening DMG installer...');
          const { shell } = require('electron');
          shell.openPath(downloadPath);
          
          // Wait a moment for DMG to mount, then quit
          setTimeout(() => {
            console.log('� Quitting app for installation...');
            app.quit();
          }, 2000);
        } else if (platform === 'win32') {
          // Windows: Run EXE installer
          console.log('🪟 Running Windows installer...');
          const { spawn } = require('child_process');
          spawn(downloadPath, [], { detached: true, stdio: 'ignore' });
          
          // Quit app so installer can replace files
          setTimeout(() => {
            console.log('🔄 Quitting app for installation...');
            app.quit();
          }, 1000);
        }
      }

    } catch (error) {
      console.error('❌ Update failed:', error);
      dialog.showErrorBox('Update Failed', `Failed to download or install update:\n\n${error.message}`);
    }
  }

  // Download file from URL
  downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      
      https.get(url, {
        headers: {
          'User-Agent': 'AJS-Exam-Browser'
        }
      }, (response) => {
        // Follow redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          return this.downloadFile(response.headers.location, dest)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`Download failed with status ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'], 10);
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          console.log(`📊 Download progress: ${progress}%`);
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('✅ File downloaded successfully');
          resolve();
        });
      }).on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });

      file.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    });
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
