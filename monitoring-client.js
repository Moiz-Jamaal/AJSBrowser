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

  getCookie(Ckey, CSKey) {
    let name = Ckey + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            var vl = c.substring(name.length, c.length);
            var myarray = vl.split(/&/);
            for (var a = 0; a < myarray.length; a++) {
                if (myarray[a].includes(CSKey)) {
                    return myarray[a].split("=")[1];
                }
            }
        }
    }
    return "";
  }

  checkQuestionTypeCookie() {
    try {
      // Check if on exam portal
      if (!window.location.hostname.includes('jameasaifiyah')) {
        return;
      }

      // Get QusID from cookie using the exam portal's cookie format
      // Cookie format: CKQusType=QusID=16&OtherData=value
      const qusId = this.getCookie('CKQusType', 'QusID');
      console.log('🍪 Cookie QusID:', qusId);

      // Handle QusID=16 (minimize allowed)
      if (qusId === '16') {
        console.log('✅ QusID=16 detected - Enabling minimize functionality');
        if (window.electronAPI && window.electronAPI.allowMinimize) {
          window.electronAPI.allowMinimize();
        }
      } else {
        console.log('🔒 QusID not 16 - Minimize remains disabled');
        if (window.electronAPI && window.electronAPI.disableMinimize) {
          window.electronAPI.disableMinimize();
        }
      }

      // Handle QusID=17 (audio recording - disable DRM for screen visibility)
      if (qusId === '17') {
        console.log('🎤 QusID=17 detected - Disabling content protection for audio recording');
        if (window.electronAPI && window.electronAPI.disableContentProtection) {
          window.electronAPI.disableContentProtection();
        }
      } else {
        console.log('🔒 Enabling content protection');
        if (window.electronAPI && window.electronAPI.enableContentProtection) {
          window.electronAPI.enableContentProtection();
        }
      }

      // Re-check cookie every 5 seconds in case it changes
      let previousQusId = qusId;
      setInterval(() => {
        const currentQusId = this.getCookie('CKQusType', 'QusID');
        
        if (currentQusId !== previousQusId) {
          console.log(`🔄 QusID changed from ${previousQusId} to ${currentQusId}`);
          
          // Handle minimize
          if (currentQusId === '16') {
            console.log('✅ Enabling minimize');
            if (window.electronAPI && window.electronAPI.allowMinimize) {
              window.electronAPI.allowMinimize();
            }
          } else {
            console.log('🔒 Disabling minimize');
            if (window.electronAPI && window.electronAPI.disableMinimize) {
              window.electronAPI.disableMinimize();
            }
          }

          // Handle content protection (DRM)
          if (currentQusId === '17') {
            console.log('🎤 Disabling content protection for audio recording');
            if (window.electronAPI && window.electronAPI.disableContentProtection) {
              window.electronAPI.disableContentProtection();
            }
          } else {
            console.log('🔒 Enabling content protection');
            if (window.electronAPI && window.electronAPI.enableContentProtection) {
              window.electronAPI.enableContentProtection();
            }
          }
          
          previousQusId = currentQusId;
        }
      }, 30000);
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
