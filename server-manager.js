// Embedded Remote Server Manager
// Manages the monitoring server within the browser application

const path = require('path');
const { fork } = require('child_process');

class RemoteServerManager {
  constructor() {
    this.serverProcess = null;
    this.isRunning = false;
    this.port = 3000;
  }

  // Start the remote monitoring server
  start() {
    if (this.isRunning) {
      console.log('⚠️  Remote server is already running');
      return { success: false, message: 'Server already running' };
    }

    try {
      console.log('🚀 Starting embedded remote monitoring server...');

      const serverPath = path.join(__dirname, 'remote-server.js');
      
      // Fork the server as a child process
      this.serverProcess = fork(serverPath, [], {
        stdio: 'inherit',
        env: {
          ...process.env,
          EMBEDDED_MODE: 'true'
        }
      });

      this.serverProcess.on('error', (error) => {
        console.error('❌ Server error:', error);
        this.isRunning = false;
      });

      this.serverProcess.on('exit', (code) => {
        console.log(`🛑 Server exited with code ${code}`);
        this.isRunning = false;
        this.serverProcess = null;
      });

      this.isRunning = true;
      
      console.log('✅ Remote monitoring server started');
      console.log(`📊 Admin panel: http://localhost:${this.port}/admin`);
      
      return {
        success: true,
        message: 'Server started successfully',
        port: this.port,
        adminUrl: `http://localhost:${this.port}/admin`
      };

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      this.isRunning = false;
      return {
        success: false,
        message: `Failed to start server: ${error.message}`
      };
    }
  }

  // Stop the remote monitoring server
  stop() {
    if (!this.isRunning || !this.serverProcess) {
      console.log('⚠️  Remote server is not running');
      return { success: false, message: 'Server not running' };
    }

    try {
      console.log('🛑 Stopping remote monitoring server...');
      
      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if not stopped
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);

      this.isRunning = false;
      this.serverProcess = null;
      
      console.log('✅ Remote monitoring server stopped');
      
      return {
        success: true,
        message: 'Server stopped successfully'
      };

    } catch (error) {
      console.error('❌ Failed to stop server:', error);
      return {
        success: false,
        message: `Failed to stop server: ${error.message}`
      };
    }
  }

  // Restart the server
  restart() {
    console.log('🔄 Restarting remote monitoring server...');
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  // Get server status
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      adminUrl: this.isRunning ? `http://localhost:${this.port}/admin` : null
    };
  }

  // Open admin panel in browser
  openAdminPanel(mainWindow = null) {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Server is not running. Please start the server first.'
      };
    }

    // If mainWindow is provided, load in the same window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`http://localhost:${this.port}/admin`);
      return {
        success: true,
        message: 'Admin panel opened in browser window',
        url: `http://localhost:${this.port}/admin`
      };
    }
    
    // Fallback to external browser if no window provided
    const { shell } = require('electron');
    shell.openExternal(`http://localhost:${this.port}/admin`);
    
    return {
      success: true,
      message: 'Admin panel opened in external browser'
    };
  }
}

// Export singleton instance
const remoteServerManager = new RemoteServerManager();

module.exports = remoteServerManager;
