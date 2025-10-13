# 🖥️ Remote Desktop Access - Implementation Guide

## Overview
This document explains how to implement remote desktop viewing of student computers during exams.

---

## 🎯 **Solution Options**

### **Option 1: Periodic Screenshots** (CURRENT - Easy)
✅ **Already Implemented** - Taking periodic screenshots
- **Pros**: Simple, low bandwidth, works everywhere
- **Cons**: Not real-time, delayed view
- **Status**: Ready to use

### **Option 2: WebRTC Live Streaming** (RECOMMENDED)
🔄 **Can Be Implemented** - Real-time screen sharing
- **Pros**: Real-time view, interactive, low latency
- **Cons**: More complex, requires signaling server
- **Status**: Implementation guide below

### **Option 3: Remote Desktop Protocol** (Advanced)
⚠️ **Complex** - Full RDP/VNC integration
- **Pros**: Full control, can interact with student PC
- **Cons**: Very complex, security concerns, requires client software
- **Status**: Not recommended for exams

---

## 📸 **Current Implementation: Periodic Screenshots**

### How It Works Now:
1. **Student side**: Browser captures screen every 30 seconds
2. **Sends to**: AWS Lambda via API
3. **Stored in**: Database (exam_screenshots table)
4. **Admin views**: Screenshots in dashboard

### To Enable Screenshot Capture:

Add this to `index.html` after student registration:

```javascript
// Periodic screenshot capture every 30 seconds
let screenshotInterval = null;

async function captureAndSendScreenshot() {
    try {
        const sessionId = localStorage.getItem('sessionId');
        const itsId = localStorage.getItem('studentItsId');
        
        if (!sessionId || !itsId) return;
        
        // Request screen capture from Electron
        if (window.electronAPI && window.electronAPI.captureScreen) {
            const screenshotData = await window.electronAPI.captureScreen();
            
            if (screenshotData) {
                // Send to backend
                await fetch(`${API_URL}/api/screenshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId,
                        itsId,
                        screenshotData,
                        timestamp: new Date().toISOString()
                    })
                });
                
                console.log('📸 Screenshot captured and sent');
            }
        }
    } catch (error) {
        console.error('Screenshot capture error:', error);
    }
}

// Start capturing screenshots after session creation
function startScreenshotCapture() {
    // Capture immediately
    captureAndSendScreenshot();
    
    // Then every 30 seconds
    screenshotInterval = setInterval(captureAndSendScreenshot, 30000);
}

// Stop on page unload
window.addEventListener('beforeunload', () => {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
    }
});

// Start after successful login
// Call this after session is created:
startScreenshotCapture();
```

### Admin Side - View Screenshots:

Add to `admin.html`:

```javascript
async function viewScreenshots(sessionId, itsId) {
    const token = checkAuth();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/api/screenshots/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Display screenshots in modal
            showScreenshotsModal(data.screenshots, itsId);
        }
    } catch (error) {
        console.error('Error loading screenshots:', error);
    }
}

function showScreenshotsModal(screenshots, itsId) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 10000; overflow: auto; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Screenshots - ITS ID: ${itsId}</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                ${screenshots.map(ss => `
                    <div style="border: 2px solid #ddd; border-radius: 8px; padding: 10px;">
                        <img src="${ss.screenshot_data}" style="width: 100%; border-radius: 5px;" />
                        <p style="text-align: center; margin-top: 10px; font-size: 0.9em; color: #666;">
                            ${new Date(ss.captured_at).toLocaleString()}
                        </p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}
```

---

## 🔴 **Real-Time Solution: WebRTC Live Streaming**

### Architecture:
```
[Student PC] --WebRTC Stream--> [Signaling Server] --Stream--> [Admin Dashboard]
```

### Step 1: Add WebRTC Support to Student Side

Create `screen-stream.js`:

```javascript
class ScreenStreamer {
    constructor(sessionId, itsId) {
        this.sessionId = sessionId;
        this.itsId = itsId;
        this.peerConnection = null;
        this.stream = null;
        this.signalingSocket = null;
    }

    async startStreaming() {
        try {
            // Get screen capture stream
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: false
            });

            // Create WebRTC peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });

            // Add stream to peer connection
            this.stream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.stream);
            });

            // Connect to signaling server
            this.connectSignaling();

            console.log('🎥 Screen streaming started');
        } catch (error) {
            console.error('Failed to start screen streaming:', error);
        }
    }

    connectSignaling() {
        // WebSocket connection to your signaling server
        const wsUrl = 'wss://your-signaling-server.com';
        this.signalingSocket = new WebSocket(wsUrl);

        this.signalingSocket.onopen = () => {
            // Register this student session
            this.signalingSocket.send(JSON.stringify({
                type: 'register',
                sessionId: this.sessionId,
                itsId: this.itsId,
                role: 'student'
            }));
        };

        this.signalingSocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'offer') {
                // Admin wants to view this student's screen
                await this.handleOffer(message.offer);
            } else if (message.type === 'ice-candidate') {
                await this.peerConnection.addIceCandidate(message.candidate);
            }
        };

        // Send ICE candidates to admin
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signalingSocket.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    sessionId: this.sessionId
                }));
            }
        };
    }

    async handleOffer(offer) {
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.signalingSocket.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            sessionId: this.sessionId
        }));
    }

    stopStreaming() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        if (this.signalingSocket) {
            this.signalingSocket.close();
        }
    }
}

// Usage in index.html after session creation:
const streamer = new ScreenStreamer(sessionId, itsId);
streamer.startStreaming();
```

### Step 2: Admin Side - View Live Stream

Add to `admin.html`:

```javascript
class RemoteViewer {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.peerConnection = null;
        this.signalingSocket = null;
    }

    async connectToStudent() {
        // Connect to signaling server
        const wsUrl = 'wss://your-signaling-server.com';
        this.signalingSocket = new WebSocket(wsUrl);

        this.signalingSocket.onopen = () => {
            // Register as admin viewer
            this.signalingSocket.send(JSON.stringify({
                type: 'register',
                sessionId: this.sessionId,
                role: 'admin'
            }));

            // Request to view student
            this.requestStream();
        };

        this.signalingSocket.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'answer') {
                await this.peerConnection.setRemoteDescription(message.answer);
            } else if (message.type === 'ice-candidate') {
                await this.peerConnection.addIceCandidate(message.candidate);
            }
        };
    }

    async requestStream() {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // Handle incoming stream
        this.peerConnection.ontrack = (event) => {
            const videoElement = document.getElementById('remote-screen');
            videoElement.srcObject = event.streams[0];
            videoElement.play();
        };

        // Create offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        this.signalingSocket.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            sessionId: this.sessionId
        }));

        // Send ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signalingSocket.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    sessionId: this.sessionId
                }));
            }
        };
    }
}

// Add button to admin dashboard
function viewRemoteDesktop(sessionId) {
    // Create modal with video player
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 10000; padding: 20px;
    `;
    
    modal.innerHTML = `
        <div style="max-width: 1600px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h2 style="color: white;">🖥️ Remote Desktop - Session: ${sessionId}</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()"
                        style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
            <video id="remote-screen" 
                   style="width: 100%; border: 3px solid #667eea; border-radius: 10px; background: #000;"
                   autoplay></video>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Start viewing
    const viewer = new RemoteViewer(sessionId);
    viewer.connectToStudent();
}
```

### Step 3: Create Signaling Server

Create `signaling-server.js` (Node.js):

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const connections = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'register':
                connections.set(data.sessionId, {
                    ws: ws,
                    role: data.role,
                    itsId: data.itsId
                });
                console.log(`Registered ${data.role} for session ${data.sessionId}`);
                break;

            case 'offer':
            case 'answer':
            case 'ice-candidate':
                // Forward to the other party
                const target = connections.get(data.sessionId);
                if (target && target.ws !== ws) {
                    target.ws.send(JSON.stringify(data));
                }
                break;
        }
    });

    ws.on('close', () => {
        // Clean up connections
        for (const [sessionId, conn] of connections.entries()) {
            if (conn.ws === ws) {
                connections.delete(sessionId);
                console.log(`Disconnected session ${sessionId}`);
            }
        }
    });
});

console.log('Signaling server running on ws://localhost:8080');
```

---

## 🚀 **Easiest Implementation: Enhanced Screenshots**

For a quick solution without WebRTC complexity, enhance the current screenshot system:

### 1. Add Screenshot Viewing to Admin Dashboard

Update the Actions column in `admin.html`:

```javascript
<td>
    <button onclick="terminateSession('${session.session_id}', '${session.its_id}')" 
            style="background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
        🛑 Terminate
    </button>
    <button onclick="viewScreenshots('${session.session_id}', '${session.its_id}')" 
            style="background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em; margin: 0 5px;">
        📸 Screenshots
    </button>
    <button onclick="viewDetails('${session.session_id}')" 
            style="background: #17a2b8; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 0.85em;">
        👁️ Details
    </button>
</td>
```

### 2. Add Screenshot Retrieval Endpoint to Lambda

Add to `lambda/index.js`:

```javascript
if (path.startsWith('/api/screenshots/') && method === 'GET') {
  const sessionId = path.split('/').pop();
  return await getScreenshots(db, sessionId, event);
}

async function getScreenshots(db, sessionId, event) {
  // Verify admin token
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Verify admin session
  const [adminSessions] = await db.execute(
    'SELECT * FROM exam_admin_sessions WHERE session_token = ? AND expires_at > NOW()',
    [token]
  );

  if (adminSessions.length === 0) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }

  // Get screenshots for session
  const [screenshots] = await db.execute(
    'SELECT id, session_id, its_id, screenshot_data, captured_at FROM exam_screenshots WHERE session_id = ? ORDER BY captured_at DESC',
    [sessionId]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      screenshots: screenshots
    })
  };
}
```

---

## 📊 **Comparison**

| Feature | Screenshots | WebRTC | RDP/VNC |
|---------|------------|---------|---------|
| **Complexity** | ⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Hard |
| **Real-time** | ❌ No | ✅ Yes | ✅ Yes |
| **Bandwidth** | Low | Medium | High |
| **Latency** | 30s+ | <1s | <1s |
| **Implementation Time** | 1 hour | 1 day | 1 week+ |
| **Maintenance** | Easy | Medium | Hard |
| **Security** | High | High | Complex |

---

## 🎯 **Recommendation**

**For Production Exam Environment:**
1. ✅ Start with **Enhanced Screenshots** (quick, reliable)
2. 🔄 Add **WebRTC** if real-time viewing needed
3. ⚠️ Avoid **RDP/VNC** (security concerns)

---

## 📝 **Next Steps**

1. **Immediate**: Implement screenshot viewing in admin dashboard
2. **Short-term**: Add screenshot capture to student browser
3. **Medium-term**: Consider WebRTC if real-time is required
4. **Long-term**: Add video recording for complete audit trail

---

Would you like me to implement the screenshot viewing feature now?
