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

    console.log('👁️ Basic session management active (browser close handler only)');
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
