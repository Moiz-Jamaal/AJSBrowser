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
  const token = event.headers.Authorization?.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' })
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
