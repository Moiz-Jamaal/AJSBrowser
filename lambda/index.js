// AWS Lambda Handler for AJS Exam Browser
// Handles all API requests via API Gateway

const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'JhsDB#515253.',
  database: process.env.DB_NAME || 'aurora_iltehaaq',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

// Initialize connection pool
function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

// Lambda handler
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS for CORS
  const requestMethod = event.httpMethod || event.requestContext?.http?.method || 'GET';
  if (requestMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Handle both /api/... and /prod/api/... paths
    let path = event.path || event.rawPath || '';
    // Remove /prod prefix if present
    path = path.replace(/^\/prod/, '');
    
    const method = requestMethod;
    
    // Parse body - handle both string and object
    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        console.error('Failed to parse body:', e);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
    }

    console.log('Processed path:', path);
    console.log('Method:', method);
    console.log('Body:', body);

    const db = getPool();

    // Route handling
    if (path === '/api/student/verify' && method === 'POST') {
      return await verifyStudent(db, body);
    }
    
    if (path === '/api/session/create' && method === 'POST') {
      return await createSession(db, body);
    }
    
    if (path === '/api/sessions' && method === 'GET') {
      return await getSessions(db);
    }
    
    if (path === '/api/activity' && method === 'POST') {
      return await logActivity(db, body);
    }
    
    if (path === '/api/screenshot' && method === 'POST') {
      return await saveScreenshot(db, body);
    }
    
    if (path === '/api/admin/login' && method === 'POST') {
      return await adminLogin(db, body);
    }
    
    if (path === '/api/admin/sessions' && method === 'GET') {
      return await getAdminSessions(db, event);
    }
    
    if (path === '/api/session/end' && method === 'POST') {
      return await endSession(db, body);
    }
    
    if (path === '/api/session/terminate' && method === 'POST') {
      return await terminateSession(db, body, event);
    }
    
    if (path.startsWith('/api/screenshots/') && method === 'GET') {
      const sessionId = path.split('/').pop();
      return await getScreenshots(db, sessionId, event);
    }
    
    if (path === '/api/remote-control/command' && method === 'POST') {
      return await sendRemoteCommand(db, body, event);
    }
    
    if (path === '/api/remote-control/poll' && method === 'POST') {
      return await pollRemoteCommands(db, body);
    }
    
    if (path === '/api/remote-control/result' && method === 'POST') {
      return await updateCommandResult(db, body);
    }

    // 404 Not Found
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

// ==================== API FUNCTIONS ====================

async function verifyStudent(db, body) {
  const { itsId, fullName, email, consentGiven } = body;
  
  if (!itsId || !consentGiven) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'ITS ID and consent required' })
    };
  }

  await db.execute(
    'INSERT INTO exam_students (its_id, full_name, email, consent_given, consent_timestamp) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE full_name = ?, email = ?, consent_given = ?, consent_timestamp = NOW()',
    [itsId, fullName, email, consentGiven, fullName, email, consentGiven]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Student verified successfully',
      itsId
    })
  };
}

async function createSession(db, body) {
  const { itsId, studentName, machineInfo } = body;
  
  if (!itsId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'ITS ID required' })
    };
  }

  const sessionId = 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  await db.execute(
    'INSERT INTO exam_remote_sessions (session_id, its_id, ip_address, machine_info, os_info, screen_resolution, start_time, status) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)',
    [
      sessionId,
      itsId,
      'global',
      machineInfo?.userAgent || 'Unknown',
      machineInfo?.platform || 'Unknown',
      machineInfo?.screenResolution || 'Unknown',
      'active'
    ]
  );

  console.log(`✅ Session created: ${sessionId} for ${itsId}`);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      sessionId,
      itsId,
      message: 'Session created successfully'
    })
  };
}

async function getSessions(db) {
  const [rows] = await db.execute(
    'SELECT * FROM exam_remote_sessions WHERE status = ? ORDER BY start_time DESC LIMIT 100',
    ['active']
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      sessions: rows
    })
  };
}

async function logActivity(db, body) {
  const { sessionId, itsId, activityType, details } = body;

  await db.execute(
    'INSERT INTO exam_activity_logs (session_id, its_id, activity_type, activity_details, timestamp) VALUES (?, ?, ?, ?, NOW())',
    [sessionId, itsId, activityType, details]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true })
  };
}

async function saveScreenshot(db, body) {
  const { sessionId, itsId, screenshotData } = body;

  await db.execute(
    'INSERT INTO exam_screenshots (session_id, its_id, screenshot_data, captured_at) VALUES (?, ?, ?, NOW())',
    [sessionId, itsId, screenshotData]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true })
  };
}

async function adminLogin(db, body) {
  const { username, password } = body;

  if (!username || !password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Username and password required' })
    };
  }

  const [rows] = await db.execute(
    'SELECT * FROM exam_admin_users WHERE username = ?',
    [username]
  );

  if (rows.length === 0) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }

  const admin = rows[0];
  const bcrypt = require('bcryptjs');
  const validPassword = await bcrypt.compare(password, admin.password_hash);

  if (!validPassword) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid credentials' })
    };
  }

  // Create session token
  const token = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64');

  await db.execute(
    'INSERT INTO exam_admin_sessions (admin_id, session_token, ip_address, login_time, expires_at) VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))',
    [admin.id, token, 'global']
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role
      }
    })
  };
}

async function getAdminSessions(db, event) {
  // API Gateway v2 lowercases all headers
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized - No token provided' })
    };
  }

  // Verify token
  const [sessions] = await db.execute(
    'SELECT * FROM exam_admin_sessions WHERE session_token = ? AND expires_at > NOW()',
    [token]
  );

  if (sessions.length === 0) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }

  // Get all active sessions with student info
  const [rows] = await db.execute(`
    SELECT 
      s.*,
      st.full_name,
      st.email,
      (SELECT COUNT(*) FROM exam_activity_logs WHERE session_id = s.session_id) as activity_count,
      (SELECT COUNT(*) FROM exam_screenshots WHERE session_id = s.session_id) as screenshot_count
    FROM exam_remote_sessions s
    LEFT JOIN exam_students st ON s.its_id = st.its_id
    WHERE s.status = 'active'
    ORDER BY s.start_time DESC
  `);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      sessions: rows
    })
  };
}

async function endSession(db, body) {
  const { sessionId, itsId, endReason } = body;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Session ID required' })
    };
  }

  await db.execute(
    'UPDATE exam_remote_sessions SET status = ?, end_time = NOW() WHERE session_id = ?',
    ['ended', sessionId]
  );

  // Log the session end activity
  if (itsId) {
    await db.execute(
      'INSERT INTO exam_activity_logs (session_id, its_id, activity_type, description, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [sessionId, itsId, 'logout', endReason || 'Normal exit']
    );
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Session ended successfully'
    })
  };
}

async function terminateSession(db, body, event) {
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

  // Verify admin token
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

  const { sessionId, reason } = body;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Session ID required' })
    };
  }

  // Get session details
  const [sessions] = await db.execute(
    'SELECT * FROM exam_remote_sessions WHERE session_id = ?',
    [sessionId]
  );

  if (sessions.length === 0) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Session not found' })
    };
  }

  const session = sessions[0];

  // Update session status to ended (terminated by admin)
  await db.execute(
    'UPDATE exam_remote_sessions SET status = ?, end_time = NOW() WHERE session_id = ?',
    ['ended', sessionId]
  );

  // Log the termination
  await db.execute(
    'INSERT INTO exam_activity_logs (session_id, its_id, activity_type, description, timestamp) VALUES (?, ?, ?, ?, NOW())',
    [sessionId, session.its_id, 'admin_access', `Admin terminated session. Reason: ${reason || 'Not specified'}`]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Session terminated by admin',
      sessionId
    })
  };
}

// ==================== GET SCREENSHOTS ====================
async function getScreenshots(db, sessionId, event) {
  // Verify admin token
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized - Token required' })
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
    `SELECT id, session_id, its_id, screenshot_data, capture_time 
     FROM exam_screenshots 
     WHERE session_id = ? 
     ORDER BY capture_time DESC`,
    [sessionId]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      count: screenshots.length,
      screenshots: screenshots
    })
  };
}

// ==================== REMOTE CONTROL COMMAND ====================
async function sendRemoteCommand(db, body, event) {
  // Verify admin token
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized - Token required' })
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

  const { sessionId, commandType, commandData } = body;

  if (!sessionId || !commandType) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Session ID and command type required' })
    };
  }

  // Store command in database for student client to poll
  await db.execute(
    `INSERT INTO exam_remote_commands (session_id, command_type, command_data, status, created_at) 
     VALUES (?, ?, ?, 'pending', NOW())`,
    [sessionId, commandType, JSON.stringify(commandData || {})]
  );

  // Log the remote control action
  const [sessions] = await db.execute(
    'SELECT its_id FROM exam_remote_sessions WHERE session_id = ?',
    [sessionId]
  );

  if (sessions.length > 0) {
    await db.execute(
      'INSERT INTO exam_activity_logs (session_id, its_id, activity_type, description, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [sessionId, sessions[0].its_id, 'admin_access', `Admin executed remote control: ${commandType}`]
    );
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Remote command sent',
      commandType
    })
  };
}

// Poll for pending remote commands
async function pollRemoteCommands(db, body) {
  const { sessionId } = body;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Session ID required' })
    };
  }

  // Get pending commands
  const [commands] = await db.execute(
    `SELECT id, command_type, command_data FROM exam_remote_commands 
     WHERE session_id = ? AND status = 'pending' 
     ORDER BY created_at ASC 
     LIMIT 10`,
    [sessionId]
  );

  // Mark commands as executing
  if (commands.length > 0) {
    const commandIds = commands.map(c => c.id);
    await db.execute(
      `UPDATE exam_remote_commands SET status = 'executing', executed_at = NOW() 
       WHERE id IN (${commandIds.map(() => '?').join(',')})`,
      commandIds
    );
  }

  // Parse command_data JSON
  const parsedCommands = commands.map(cmd => ({
    ...cmd,
    command_data: typeof cmd.command_data === 'string' ? JSON.parse(cmd.command_data) : cmd.command_data
  }));

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      commands: parsedCommands
    })
  };
}

// Update command execution result
async function updateCommandResult(db, body) {
  const { commandId, status, result } = body;

  if (!commandId || !status) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Command ID and status required' })
    };
  }

  await db.execute(
    'UPDATE exam_remote_commands SET status = ?, result = ? WHERE id = ?',
    [status, JSON.stringify(result || {}), commandId]
  );

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: 'Command result updated'
    })
  };
}
