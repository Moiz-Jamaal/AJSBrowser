// Client-side monitoring for student sessions
// This script handles WebSocket connection and screen monitoring

class ExamMonitor {
  constructor() {
    this.ws = null;
    this.sessionId = this.generateSessionId();
    this.itsId = localStorage.getItem('studentItsId');
    this.studentName = localStorage.getItem('studentName');
    this.connected = false;
    this.screenshotInterval = null;
    this.activityInterval = null;
  }

  generateSessionId() {
    return 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async connect() {
    try {
      // Connect to monitoring server
      this.ws = new WebSocket('ws://localhost:3000');

      this.ws.onopen = () => {
        console.log('📡 Connected to monitoring server');
        this.connected = true;
        
        // Send initial connection data
        this.sendMessage({
          type: 'student_connect',
          sessionId: this.sessionId,
          itsId: this.itsId,
          studentName: this.studentName,
          machineInfo: this.getMachineInfo(),
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          osInfo: navigator.platform,
          browserVersion: navigator.userAgent
        });
        
        // Start monitoring
        this.startMonitoring();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleServerMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from monitoring server');
        this.connected = false;
        this.stopMonitoring();
        
        // Try to reconnect after 5 seconds
        setTimeout(() => this.connect(), 5000);
      };
    } catch (error) {
      console.error('Connection error:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  sendMessage(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleServerMessage(data) {
    switch (data.type) {
      case 'connected':
        console.log('✅ Server acknowledged connection');
        break;
      
      case 'capture_screenshot':
        // Admin requested screenshot
        this.captureScreenshot();
        break;
      
      case 'session_ended':
        alert('Your examination session has been ended by the administrator');
        window.close();
        break;
    }
  }

  getMachineInfo() {
    return {
      platform: navigator.platform,
      language: navigator.language,
      cpuCores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      connection: navigator.connection?.effectiveType
    };
  }

  startMonitoring() {
    // Capture screenshot every 30 seconds
    this.screenshotInterval = setInterval(() => {
      this.captureScreenshot();
    }, 30000);

    // Log activity every 10 seconds
    this.activityInterval = setInterval(() => {
      this.logActivity('heartbeat', 'Session active');
    }, 10000);

    // Monitor window focus
    window.addEventListener('blur', () => {
      this.logActivity('window_switch', 'Window lost focus - possible tab/app switch', {
        suspicious: true
      });
    });

    window.addEventListener('focus', () => {
      this.logActivity('window_switch', 'Window regained focus');
    });

    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logActivity('suspicious', 'Page hidden - user may have switched tabs', {
          suspicious: true
        });
      }
    });

    // Monitor keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Detect Alt+Tab, Cmd+Tab, etc.
      if (e.altKey && e.key === 'Tab') {
        this.logActivity('suspicious', 'Alt+Tab detected - attempting to switch windows', {
          suspicious: true
        });
      }
      
      if (e.metaKey && e.key === 'Tab') {
        this.logActivity('suspicious', 'Cmd+Tab detected - attempting to switch windows', {
          suspicious: true
        });
      }
    });

    console.log('👁️ Monitoring started');
  }

  stopMonitoring() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }

  async captureScreenshot() {
    try {
      // Use Electron's desktopCapturer if available
      if (window.electronAPI && window.electronAPI.captureScreen) {
        const screenshot = await window.electronAPI.captureScreen();
        
        this.sendMessage({
          type: 'screenshot',
          sessionId: this.sessionId,
          screenshot: screenshot,
          timestamp: new Date().toISOString()
        });
        
        console.log('📸 Screenshot captured and sent');
      } else {
        console.warn('Screenshot capture not available in this mode');
      }
    } catch (error) {
      console.error('Screenshot capture error:', error);
    }
  }

  logActivity(activityType, description, metadata = null) {
    this.sendMessage({
      type: 'activity',
      sessionId: this.sessionId,
      activityType: activityType,
      description: description,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
  }

  disconnect() {
    this.stopMonitoring();
    
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Initialize monitoring when page loads
let examMonitor = null;

if (localStorage.getItem('studentItsId')) {
  examMonitor = new ExamMonitor();
  examMonitor.connect();
  
  // Disconnect when window closes
  window.addEventListener('beforeunload', () => {
    if (examMonitor) {
      examMonitor.logActivity('logout', 'Student closing browser');
      examMonitor.disconnect();
    }
  });
}
