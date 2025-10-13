const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'JhsDB#515253.',
  database: 'aurora_iltehaaq',
  port: 3306
};

async function checkActivityLogsTable() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check exam_activity_logs structure
    console.log('\n📋 Checking exam_activity_logs table structure...');
    const [columns] = await connection.execute('DESCRIBE exam_activity_logs');
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

checkActivityLogsTable();
