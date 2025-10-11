const WebSocket = require('ws');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const JWT_SECRET = 'ajs-exam-browser-secret-key-2025'; // Change this in production
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Express app for admin panel
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/screenshots', express.static(SCREENSHOT_DIR));

// WebSocket server for real-time communication
const wss = new WebSocket.Server({ noServer: true });

// Store active connections
const studentConnections = new Map(); // sessionId -> WebSocket
const adminConnections = new Map(); // adminId -> Set of WebSockets

// Initialize database
db.initializeDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
});

// ==================== ADMIN API ENDPOINTS ====================

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await db.getAdminByUsername(username);
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.updateAdminLastLogin(admin.id);

    const token = jwt.sign(
      { adminId: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create admin (temporary endpoint - remove in production)
app.post('/api/admin/create', async (req, res) => {
  try {
    const { username, password, fullName, email, role } = req.body;
    
    const passwordHash = await bcrypt.hash(password, 10);
    await db.createAdmin(username, passwordHash, fullName, email, role);
    
    res.json({ success: true, message: 'Admin created successfully' });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all active sessions
app.get('/api/admin/sessions/active', verifyAdminToken, async (req, res) => {
  try {
    const sessions = await db.getActiveSessions();
    
    // Add WebSocket connection status
    const sessionsWithStatus = sessions.map(session => ({
      ...session,
      isConnected: studentConnections.has(session.session_id)
    }));
    
    res.json({ success: true, sessions: sessionsWithStatus });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get session details
app.get('/api/admin/sessions/:sessionId', verifyAdminToken, async (req, res) => {
  try {
    const session = await db.getSessionById(req.params.sessionId);
    const logs = await db.getSessionLogs(req.params.sessionId);
    const screenshots = await db.getScreenshots(req.params.sessionId, 50);
    
    res.json({
      success: true,
      session,
      logs,
      screenshots,
      isConnected: studentConnections.has(req.params.sessionId)
    });
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// Get session statistics
app.get('/api/admin/statistics', verifyAdminToken, async (req, res) => {
  try {
    const stats = await db.getSessionStatistics();
    res.json({ success: true, statistics: stats });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// End a session
app.post('/api/admin/sessions/:sessionId/end', verifyAdminToken, async (req, res) => {
  try {
    await db.endSession(req.params.sessionId);
    
    // Notify student to close
    const ws = studentConnections.get(req.params.sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'session_ended',
        message: 'Session ended by administrator'
      }));
      ws.close();
    }
    
    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ==================== STUDENT API ENDPOINTS ====================

// Verify student ITS ID
app.post('/api/student/verify', async (req, res) => {
  try {
    const { itsId, fullName, email, consentGiven } = req.body;
    
    if (!itsId || !consentGiven) {
      return res.status(400).json({ error: 'ITS ID and consent required' });
    }

    // Create or update student
    await db.createStudent(itsId, fullName, email, consentGiven);
    
    res.json({
      success: true,
      message: 'Student verified successfully',
      itsId
    });
  } catch (error) {
    console.error('Student verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ==================== WEBSOCKET HANDLERS ====================

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  let sessionId = null;
  let itsId = null;
  let isAdmin = false;
  let adminId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'student_connect':
          // Student connecting
          sessionId = data.sessionId;
          itsId = data.itsId;
          
          studentConnections.set(sessionId, ws);
          
          // Create session in database
          await db.createSession({
            sessionId: data.sessionId,
            itsId: data.itsId,
            studentName: data.studentName,
            ipAddress: req.socket.remoteAddress,
            machineInfo: data.machineInfo,
            screenResolution: data.screenResolution,
            osInfo: data.osInfo,
            browserVersion: data.browserVersion
          });
          
          await db.logActivity(sessionId, itsId, 'login', 'Student connected', {
            ip: req.socket.remoteAddress
          });
          
          ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to monitoring server',
            sessionId
          }));
          
          // Notify all admins
          broadcastToAdmins({
            type: 'new_session',
            session: { sessionId, itsId, studentName: data.studentName }
          });
          
          console.log(`✅ Student connected: ${itsId} (${sessionId})`);
          break;

        case 'admin_connect':
          // Admin connecting
          isAdmin = true;
          adminId = data.adminId;
          
          if (!adminConnections.has(adminId)) {
            adminConnections.set(adminId, new Set());
          }
          adminConnections.get(adminId).add(ws);
          
          ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected as admin'
          }));
          
          console.log(`✅ Admin connected: ${adminId}`);
          break;

        case 'screenshot':
          // Save screenshot
          if (sessionId && itsId) {
            const screenshotData = Buffer.from(data.screenshot, 'base64');
            const filename = `${sessionId}_${Date.now()}.jpg`;
            const filePath = path.join(SCREENSHOT_DIR, filename);
            
            fs.writeFileSync(filePath, screenshotData);
            
            await db.saveScreenshot(sessionId, itsId, screenshotData, filename);
            
            // Notify admins watching this session
            broadcastToAdmins({
              type: 'new_screenshot',
              sessionId,
              screenshot: filename,
              timestamp: new Date().toISOString()
            });
          }
          break;

        case 'activity':
          // Log activity
          if (sessionId && itsId) {
            await db.logActivity(
              sessionId,
              itsId,
              data.activityType,
              data.description,
              data.metadata
            );
            
            // Notify admins if suspicious
            if (data.activityType === 'suspicious') {
              broadcastToAdmins({
                type: 'suspicious_activity',
                sessionId,
                itsId,
                description: data.description,
                timestamp: new Date().toISOString()
              });
            }
          }
          break;

        case 'admin_request_screenshot':
          // Admin requesting screenshot from student
          if (isAdmin && data.targetSessionId) {
            const studentWs = studentConnections.get(data.targetSessionId);
            if (studentWs && studentWs.readyState === WebSocket.OPEN) {
              studentWs.send(JSON.stringify({
                type: 'capture_screenshot'
              }));
            }
          }
          break;

        case 'admin_view_session':
          // Admin viewing a specific session
          if (isAdmin) {
            const session = await db.getSessionById(data.sessionId);
            const logs = await db.getSessionLogs(data.sessionId);
            
            ws.send(JSON.stringify({
              type: 'session_data',
              session,
              logs
            }));
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  });

  ws.on('close', async () => {
    if (sessionId) {
      studentConnections.delete(sessionId);
      await db.logActivity(sessionId, itsId, 'logout', 'Student disconnected');
      
      broadcastToAdmins({
        type: 'session_disconnected',
        sessionId
      });
      
      console.log(`❌ Student disconnected: ${itsId} (${sessionId})`);
    }
    
    if (isAdmin && adminId) {
      const adminWsSet = adminConnections.get(adminId);
      if (adminWsSet) {
        adminWsSet.delete(ws);
        if (adminWsSet.size === 0) {
          adminConnections.delete(adminId);
        }
      }
      console.log(`❌ Admin disconnected: ${adminId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast message to all connected admins
function broadcastToAdmins(message) {
  for (const [adminId, wsSet] of adminConnections.entries()) {
    for (const ws of wsSet) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

// ==================== ADMIN PANEL HTML ====================

app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AJS Exam Browser - Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #333;
        }
        
        .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .login-box {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 50px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 400px;
        }
        
        .login-box h1 {
            text-align: center;
            color: #667eea;
            margin-bottom: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            transition: border 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .btn-login {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.3s;
        }
        
        .btn-login:hover {
            transform: translateY(-2px);
        }
        
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        
        .dashboard {
            display: none;
            padding: 20px;
            max-width: 1600px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            color: #667eea;
        }
        
        .btn-logout {
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-card h3 {
            color: #667eea;
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .sessions-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
        }
        
        .sessions-container h2 {
            color: #667eea;
            margin-bottom: 20px;
        }
        
        .session-card {
            border: 2px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 15px;
            align-items: center;
        }
        
        .session-card.connected {
            border-color: #28a745;
            background: #d4edda;
        }
        
        .session-info h3 {
            color: #333;
            margin-bottom: 5px;
        }
        
        .session-info p {
            color: #666;
            font-size: 14px;
            margin: 3px 0;
        }
        
        .session-actions {
            display: flex;
            gap: 10px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .btn-view {
            background: #667eea;
            color: white;
        }
        
        .btn-screenshot {
            background: #ffc107;
            color: #333;
        }
        
        .btn-end {
            background: #dc3545;
            color: white;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-active {
            background: #28a745;
            color: white;
        }
        
        .status-disconnected {
            background: #6c757d;
            color: white;
        }
    </style>
</head>
<body>
    <!-- Login Screen -->
    <div class="login-container" id="loginScreen">
        <div class="login-box">
            <h1>🔐 Admin Login</h1>
            <div class="error-message" id="errorMessage"></div>
            <form id="loginForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit" class="btn-login">Login</button>
            </form>
        </div>
    </div>
    
    <!-- Dashboard -->
    <div class="dashboard" id="dashboard">
        <div class="header">
            <h1>📊 Exam Monitoring Dashboard</h1>
            <div>
                <span id="adminName" style="margin-right: 20px;"></span>
                <button class="btn-logout" onclick="logout()">Logout</button>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3 id="totalSessions">0</h3>
                <p>Active Sessions</p>
            </div>
            <div class="stat-card">
                <h3 id="suspiciousCount">0</h3>
                <p>Suspicious Activities</p>
            </div>
            <div class="stat-card">
                <h3 id="screenshotCount">0</h3>
                <p>Screenshots Captured</p>
            </div>
        </div>
        
        <div class="sessions-container">
            <h2>Active Exam Sessions</h2>
            <div id="sessionsList"></div>
        </div>
    </div>
    
    <script>
        let authToken = null;
        let ws = null;
        
        // Login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    authToken = data.token;
                    document.getElementById('adminName').textContent = data.admin.fullName || data.admin.username;
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
                    
                    connectWebSocket(data.admin.id);
                    loadSessions();
                } else {
                    showError(data.error || 'Login failed');
                }
            } catch (error) {
                showError('Connection error');
            }
        });
        
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        
        function connectWebSocket(adminId) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host);
            
            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'admin_connect',
                    adminId: adminId
                }));
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
        }
        
        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'new_session':
                case 'session_disconnected':
                    loadSessions();
                    break;
                case 'suspicious_activity':
                    alert('⚠️ Suspicious activity detected in session: ' + data.sessionId);
                    loadSessions();
                    break;
            }
        }
        
        async function loadSessions() {
            try {
                const response = await fetch('/api/admin/sessions/active', {
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    displaySessions(data.sessions);
                    updateStats(data.sessions);
                }
            } catch (error) {
                console.error('Failed to load sessions:', error);
            }
        }
        
        function displaySessions(sessions) {
            const container = document.getElementById('sessionsList');
            
            if (sessions.length === 0) {
                container.innerHTML = '<p style="text-align:center;color:#666;">No active sessions</p>';
                return;
            }
            
            container.innerHTML = sessions.map(session => \`
                <div class="session-card \${session.isConnected ? 'connected' : ''}">
                    <div class="session-info">
                        <h3>\${session.student_name || 'Unknown'} (ITS: \${session.its_id})</h3>
                        <p>Session ID: \${session.session_id}</p>
                        <p>Duration: \${session.duration_minutes || 0} minutes</p>
                        <p>Screenshots: \${session.screenshot_count || 0} | Suspicious: \${session.suspicious_count || 0}</p>
                        <span class="status-badge status-\${session.status}">\${session.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
                    </div>
                    <div class="session-actions">
                        <button class="btn btn-view" onclick="viewSession('\${session.session_id}')">View</button>
                        <button class="btn btn-screenshot" onclick="captureScreenshot('\${session.session_id}')">Screenshot</button>
                        <button class="btn btn-end" onclick="endSession('\${session.session_id}')">End</button>
                    </div>
                </div>
            \`).join('');
        }
        
        function updateStats(sessions) {
            document.getElementById('totalSessions').textContent = sessions.length;
            document.getElementById('suspiciousCount').textContent = 
                sessions.reduce((sum, s) => sum + (s.suspicious_count || 0), 0);
            document.getElementById('screenshotCount').textContent = 
                sessions.reduce((sum, s) => sum + (s.screenshot_count || 0), 0);
        }
        
        function viewSession(sessionId) {
            window.open('/admin/session/' + sessionId, '_blank');
        }
        
        function captureScreenshot(sessionId) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'admin_request_screenshot',
                    targetSessionId: sessionId
                }));
                alert('Screenshot request sent');
            }
        }
        
        async function endSession(sessionId) {
            if (!confirm('Are you sure you want to end this session?')) return;
            
            try {
                const response = await fetch('/api/admin/sessions/' + sessionId + '/end', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + authToken }
                });
                
                const data = await response.json();
                if (data.success) {
                    alert('Session ended');
                    loadSessions();
                }
            } catch (error) {
                alert('Failed to end session');
            }
        }
        
        function logout() {
            authToken = null;
            if (ws) ws.close();
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('dashboard').style.display = 'none';
        }
        
        // Refresh sessions every 5 seconds
        setInterval(() => {
            if (authToken) loadSessions();
        }, 5000);
    </script>
</body>
</html>
  `);
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   AJS Exam Browser - Remote Monitoring Server         ║
╠════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:${PORT}           ║
║   Admin Panel: http://localhost:${PORT}/admin          ║
║   WebSocket: ws://localhost:${PORT}                    ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

module.exports = { app, server, wss };
