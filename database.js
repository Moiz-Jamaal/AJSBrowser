const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  port: 3306,
  database: 'aurora_iltehaaq',
  user: 'admin',
  password: 'JhsDB#515253.',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database tables
async function initializeDatabase() {
  const connection = await pool.getConnection();
  
  try {
    // Create students table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        its_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        email VARCHAR(255),
        consent_given BOOLEAN DEFAULT FALSE,
        consent_timestamp DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_its_id (its_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create remote sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_remote_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        its_id VARCHAR(20) NOT NULL,
        student_name VARCHAR(255),
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status ENUM('active', 'ended', 'disconnected') DEFAULT 'active',
        ip_address VARCHAR(45),
        machine_info TEXT,
        screen_resolution VARCHAR(50),
        os_info VARCHAR(100),
        browser_version VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id),
        INDEX idx_its_id (its_id),
        INDEX idx_status (status),
        FOREIGN KEY (its_id) REFERENCES exam_students(its_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create activity logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        its_id VARCHAR(20) NOT NULL,
        activity_type ENUM('login', 'logout', 'screenshot', 'window_switch', 'suspicious', 'keypress', 'mouse_click', 'admin_access') NOT NULL,
        description TEXT,
        screenshot_path VARCHAR(500),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata JSON,
        INDEX idx_session_id (session_id),
        INDEX idx_its_id (its_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_activity_type (activity_type),
        FOREIGN KEY (session_id) REFERENCES exam_remote_sessions(session_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create admin users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        email VARCHAR(255),
        role ENUM('super_admin', 'admin', 'monitor') DEFAULT 'monitor',
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create admin session logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_admin_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        logout_time DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_session_token (session_token),
        FOREIGN KEY (admin_id) REFERENCES exam_admin_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create screenshots table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS exam_screenshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        its_id VARCHAR(20) NOT NULL,
        screenshot_data LONGBLOB,
        file_path VARCHAR(500),
        file_size INT,
        capture_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT,
        INDEX idx_session_id (session_id),
        INDEX idx_its_id (its_id),
        INDEX idx_capture_time (capture_time),
        FOREIGN KEY (session_id) REFERENCES exam_remote_sessions(session_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create view for active sessions with student info
    await connection.query(`
      CREATE OR REPLACE VIEW active_exam_sessions AS
      SELECT 
        s.session_id,
        s.its_id,
        st.full_name as student_name,
        st.email,
        s.start_time,
        s.status,
        s.ip_address,
        s.machine_info,
        s.screen_resolution,
        s.os_info,
        TIMESTAMPDIFF(MINUTE, s.start_time, NOW()) as duration_minutes,
        (SELECT COUNT(*) FROM exam_screenshots WHERE session_id = s.session_id) as screenshot_count,
        (SELECT COUNT(*) FROM exam_activity_logs WHERE session_id = s.session_id AND activity_type = 'suspicious') as suspicious_count
      FROM exam_remote_sessions s
      LEFT JOIN exam_students st ON s.its_id = st.its_id
      WHERE s.status = 'active'
      ORDER BY s.start_time DESC;
    `);

    // Create view for session statistics
    await connection.query(`
      CREATE OR REPLACE VIEW session_statistics AS
      SELECT 
        DATE(start_time) as exam_date,
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnected_sessions,
        AVG(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW()))) as avg_duration_minutes
      FROM exam_remote_sessions
      GROUP BY DATE(start_time)
      ORDER BY exam_date DESC;
    `);

    console.log('✅ Database tables and views created successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Student functions
async function createStudent(itsId, fullName, email, consentGiven) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO exam_students (its_id, full_name, email, consent_given, consent_timestamp)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
       full_name = VALUES(full_name),
       email = VALUES(email),
       consent_given = VALUES(consent_given),
       consent_timestamp = IF(VALUES(consent_given) = TRUE, NOW(), consent_timestamp)`,
      [itsId, fullName, email, consentGiven]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function getStudent(itsId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM exam_students WHERE its_id = ?',
      [itsId]
    );
    return rows[0];
  } finally {
    connection.release();
  }
}

// Session functions
async function createSession(sessionData) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO exam_remote_sessions 
       (session_id, its_id, student_name, ip_address, machine_info, screen_resolution, os_info, browser_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionData.sessionId,
        sessionData.itsId,
        sessionData.studentName,
        sessionData.ipAddress,
        sessionData.machineInfo,
        sessionData.screenResolution,
        sessionData.osInfo,
        sessionData.browserVersion
      ]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function endSession(sessionId) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `UPDATE exam_remote_sessions 
       SET status = 'ended', end_time = NOW()
       WHERE session_id = ?`,
      [sessionId]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function getActiveSessions() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM active_exam_sessions');
    return rows;
  } finally {
    connection.release();
  }
}

async function getSessionById(sessionId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM exam_remote_sessions WHERE session_id = ?',
      [sessionId]
    );
    return rows[0];
  } finally {
    connection.release();
  }
}

// Activity log functions
async function logActivity(sessionId, itsId, activityType, description, metadata = null) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO exam_activity_logs 
       (session_id, its_id, activity_type, description, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, itsId, activityType, description, JSON.stringify(metadata)]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function getSessionLogs(sessionId) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT * FROM exam_activity_logs 
       WHERE session_id = ? 
       ORDER BY timestamp DESC`,
      [sessionId]
    );
    return rows;
  } finally {
    connection.release();
  }
}

// Screenshot functions
async function saveScreenshot(sessionId, itsId, screenshotData, filePath) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO exam_screenshots 
       (session_id, its_id, screenshot_data, file_path, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, itsId, screenshotData, filePath, screenshotData.length]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function getScreenshots(sessionId, limit = 50) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT id, session_id, its_id, file_path, file_size, capture_time, is_flagged, flag_reason
       FROM exam_screenshots 
       WHERE session_id = ? 
       ORDER BY capture_time DESC 
       LIMIT ?`,
      [sessionId, limit]
    );
    return rows;
  } finally {
    connection.release();
  }
}

// Admin functions
async function createAdmin(username, passwordHash, fullName, email, role = 'monitor') {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      `INSERT INTO exam_admin_users (username, password_hash, full_name, email, role)
       VALUES (?, ?, ?, ?, ?)`,
      [username, passwordHash, fullName, email, role]
    );
    return result;
  } finally {
    connection.release();
  }
}

async function getAdminByUsername(username) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT * FROM exam_admin_users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    return rows[0];
  } finally {
    connection.release();
  }
}

async function updateAdminLastLogin(adminId) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query(
      'UPDATE exam_admin_users SET last_login = NOW() WHERE id = ?',
      [adminId]
    );
    return result;
  } finally {
    connection.release();
  }
}

// Statistics functions
async function getSessionStatistics() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM session_statistics LIMIT 30');
    return rows;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  createStudent,
  getStudent,
  createSession,
  endSession,
  getActiveSessions,
  getSessionById,
  logActivity,
  getSessionLogs,
  saveScreenshot,
  getScreenshots,
  createAdmin,
  getAdminByUsername,
  updateAdminLastLogin,
  getSessionStatistics
};
