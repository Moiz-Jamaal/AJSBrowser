const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'JhsDB#515253.',
  database: 'aurora_iltehaaq',
  port: 3306
};

async function createRemoteCommandsTable() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create remote commands table
    console.log('\n📋 Creating exam_remote_commands table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exam_remote_commands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        command_type VARCHAR(50) NOT NULL,
        command_data JSON,
        status ENUM('pending', 'executing', 'completed', 'failed') DEFAULT 'pending',
        result JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        executed_at DATETIME,
        INDEX idx_session_status (session_id, status),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Table created successfully');

    // Check table structure
    console.log('\n📋 Table structure:');
    const [columns] = await connection.execute('DESCRIBE exam_remote_commands');
    console.table(columns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

createRemoteCommandsTable();
