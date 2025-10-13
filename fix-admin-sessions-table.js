const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'JhsDB#515253.',
  database: 'aurora_iltehaaq',
  port: 3306
};

async function checkTables() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check exam_admin_sessions structure
    console.log('\n📋 Checking exam_admin_sessions table structure...');
    const [columns] = await connection.execute('DESCRIBE exam_admin_sessions');
    console.log(columns);

    // Check if expires_at column exists
    const hasExpiresAt = columns.some(col => col.Field === 'expires_at');
    
    if (!hasExpiresAt) {
      console.log('\n⚠️  expires_at column does not exist!');
      console.log('Adding expires_at column...');
      
      await connection.execute(`
        ALTER TABLE exam_admin_sessions 
        ADD COLUMN expires_at DATETIME NULL AFTER login_time
      `);
      
      console.log('✅ expires_at column added!');
    } else {
      console.log('✅ expires_at column exists');
    }

    // Check the current structure again
    console.log('\n📋 Final table structure:');
    const [finalColumns] = await connection.execute('DESCRIBE exam_admin_sessions');
    console.table(finalColumns);

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

checkTables();
