// Client-side monitoring for student sessions - LIGHTWEIGHT MODE
// Minimal performance overhead - only essential session management

const API_URL = 'https://5wgk4koei8.execute-api.us-east-1.amazonaws.com/prod';

class ExamMonitor {
  constructor() {
    this.sessionId = localStorage.getItem('sessionId');
    this.itsId = localStorage.getItem('studentItsId');
    this.studentName = localStorage.getItem('studentName');
    console.log('🔧 ExamMonitor initialized - Lightweight mode');
  }

  async start() {
    if (!this.sessionId || !this.itsId) {
      console.warn('⚠️ No session/ITS ID found');
      return;
    }

    console.log('✅ Exam session active - Performance optimized (no background monitoring)');
    this.setupBasicMonitoring();
  }

  setupBasicMonitoring() {
    // Only handle browser close - send session end
    window.addEventListener('beforeunload', () => {
      this.endSession('browser_closed');
    });

    // Check for QusID cookie and enable minimize if QusID=16
    this.checkQuestionTypeCookie();

    console.log('👁️ Basic session management active (browser close handler only)');
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  checkQuestionTypeCookie() {
    try {
      // Check if on exam portal
      if (!window.location.hostname.includes('jameasaifiyah')) {
        return;
      }

      // Get QusID from cookie
      const qusId = this.getCookie('QusID');
      console.log('🍪 Cookie QusID:', qusId);

      if (qusId === '16') {
        console.log('✅ QusID=16 detected - Enabling minimize functionality');
        // Notify Electron main process to allow minimize
        if (window.electronAPI && window.electronAPI.allowMinimize) {
          window.electronAPI.allowMinimize();
        }
      } else {
        console.log('🔒 QusID not 16 - Minimize remains disabled');
      }

      // Re-check cookie every 5 seconds in case it changes
      setInterval(() => {
        const currentQusId = this.getCookie('QusID');
        if (currentQusId === '16' && qusId !== '16') {
          console.log('🔄 QusID changed to 16 - Enabling minimize');
          if (window.electronAPI && window.electronAPI.allowMinimize) {
            window.electronAPI.allowMinimize();
          }
        }
      }, 5000);
    } catch (error) {
      console.error('Error checking cookie:', error);
    }
  }

  async endSession(reason) {
    try {
      // Use sendBeacon for reliable delivery during page unload
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
console.log('🔄 Lightweight monitoring script loaded');

setTimeout(() => {
  if (localStorage.getItem('sessionId') && localStorage.getItem('studentItsId')) {
    console.log('✅ Session data found, starting lightweight monitor');
    const examMonitor = new ExamMonitor();
    examMonitor.start();
    window.examMonitor = examMonitor;
  } else {
    console.log('⚠️ No session data found');
  }
}, 1000);
