// Client-side monitoring for student sessions
// This script runs on the exam portal and handles all monitoring via AWS API

const API_URL = 'https://5wgk4koei8.execute-api.us-east-1.amazonaws.com/prod';

class ExamMonitor {
  constructor() {
    this.sessionId = localStorage.getItem('sessionId');
    this.itsId = localStorage.getItem('studentItsId');
    this.studentName = localStorage.getItem('studentName');
    this.screenshotInterval = null;
    this.sessionCheckInterval = null;
    this.activityInterval = null;
    console.log('🔧 ExamMonitor initialized', { sessionId: this.sessionId, itsId: this.itsId });
  }

  async start() {
    if (!this.sessionId || !this.itsId) {
      console.warn('⚠️ No session/ITS ID found, monitoring disabled');
      return;
    }

    console.log('� Starting exam monitoring...');
    this.startMonitoring();
    
    // Log that monitoring has started
    await this.logActivity('monitoring_started', 'Exam monitoring active on portal');
  }

  async checkSessionStatus() {
    try {
      const response = await fetch(`${API_URL}/api/session/status?sessionId=${this.sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ended' || data.status === 'terminated') {
          console.log('🛑 Session ended by admin');
          this.showTerminationPage();
        }
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  }

  showTerminationPage() {
    // Stop all monitoring
    this.stopMonitoring();
    
    // Show termination message
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: Arial, sans-serif;">
        <div style="background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center; max-width: 500px;">
          <div style="font-size: 72px; margin-bottom: 20px;">🛑</div>
          <h1 style="color: #e74c3c; margin: 0 0 20px 0;">Session Terminated</h1>
          <p style="color: #555; font-size: 18px; margin-bottom: 30px;">
            Your examination session has been terminated by the administrator.
          </p>
          <p style="color: #777; font-size: 14px;">
            Please contact your supervisor if you have any questions.
          </p>
          <button onclick="window.close()" style="margin-top: 30px; padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 25px; font-size: 16px; cursor: pointer; transition: all 0.3s;">
            Close Browser
          </button>
        </div>
      </div>
    `;
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
    
    // Capture first screenshot immediately
    setTimeout(() => this.captureScreenshot(), 2000);

    // Check session status every 5 seconds (to detect termination)
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionStatus();
    }, 5000);

    // Log heartbeat every 60 seconds
    this.activityInterval = setInterval(() => {
      this.logActivity('heartbeat', 'Session active');
    }, 60000);

    // Monitor window focus
    window.addEventListener('blur', () => {
      this.logActivity('window_blur', 'Window lost focus - possible tab/app switch');
    });

    window.addEventListener('focus', () => {
      this.logActivity('window_focus', 'Window regained focus');
    });

    // Monitor visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.logActivity('visibility_hidden', 'Page hidden - user may have switched tabs');
      } else {
        this.logActivity('visibility_visible', 'Page visible again');
      }
    });

    // Monitor keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Detect Alt+Tab, Cmd+Tab, etc.
      if ((e.altKey || e.metaKey) && e.key === 'Tab') {
        this.logActivity('suspicious_shortcut', `${e.altKey ? 'Alt' : 'Cmd'}+Tab detected`);
      }
    });

    // Handle browser close
    window.addEventListener('beforeunload', (e) => {
      this.endSession('browser_closed');
    });

    console.log('👁️ Monitoring started successfully');
  }

  stopMonitoring() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
    
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    
    console.log('🛑 Monitoring stopped');
  }

  async captureScreenshot() {
    try {
      if (!window.electronAPI || !window.electronAPI.captureScreen) {
        console.warn('⚠️ Screenshot API not available');
        return;
      }

      console.log('📸 Capturing screenshot...');
      const screenshotData = await window.electronAPI.captureScreen();
      
      if (screenshotData) {
        const response = await fetch(`${API_URL}/api/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            itsId: this.itsId,
            screenshotData,
            timestamp: new Date().toISOString()
          })
        });
        
        if (response.ok) {
          console.log('✅ Screenshot sent successfully');
        } else {
          console.error('❌ Failed to send screenshot:', response.status);
        }
      }
    } catch (error) {
      console.error('❌ Screenshot capture error:', error);
    }
  }

  async logActivity(activityType, details) {
    try {
      await fetch(`${API_URL}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          itsId: this.itsId,
          activityType,
          details,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async endSession(reason) {
    try {
      this.stopMonitoring();
      
      // Use sendBeacon for reliable delivery even during page unload
      const data = JSON.stringify({
        sessionId: this.sessionId,
        itsId: this.itsId,
        endReason: reason
      });
      
      navigator.sendBeacon(`${API_URL}/api/session/end`, data);
      console.log('📤 Session end signal sent');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
}

// Auto-initialize monitoring when script loads
console.log('🔄 Monitoring script loaded');

// Wait a bit for localStorage to be ready
setTimeout(() => {
  if (localStorage.getItem('sessionId') && localStorage.getItem('studentItsId')) {
    console.log('✅ Session data found, starting monitor');
    const examMonitor = new ExamMonitor();
    examMonitor.start();
    
    // Make it globally accessible for debugging
    window.examMonitor = examMonitor;
  } else {
    console.log('⚠️ No session data found, monitoring not started');
  }
}, 1000);
