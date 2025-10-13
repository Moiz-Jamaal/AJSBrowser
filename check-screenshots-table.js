const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'JhsDB#515253.',
  database: 'aurora_iltehaaq',
  port: 3306
};

async function checkScreenshotsTable() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check exam_screenshots structure
    console.log('\n📋 Checking exam_screenshots table structure...');
    const [columns] = await connection.execute('DESCRIBE exam_screenshots');
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

checkScreenshotsTable();
