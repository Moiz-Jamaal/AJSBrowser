const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: 'cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'JhsDB#515253.',
  database: 'aurora_iltehaaq',
  port: 3306
};

async function createAdminUser() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Create admin user with hashed password
    const username = 'admin';
    const password = 'admin123';
    const fullName = 'System Administrator';
    const role = 'super_admin';

    console.log('\n🔐 Creating admin user...');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Role:', role);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if admin user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM exam_admin_users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      console.log('\n⚠️  Admin user already exists!');
      console.log('Updating password...');
      
      await connection.execute(
        'UPDATE exam_admin_users SET password_hash = ?, full_name = ?, role = ? WHERE username = ?',
        [passwordHash, fullName, role, username]
      );
      
      console.log('✅ Admin user password updated successfully!');
    } else {
      // Insert new admin user
      await connection.execute(
        'INSERT INTO exam_admin_users (username, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username, passwordHash, fullName, role]
      );

      console.log('✅ Admin user created successfully!');
    }

    // Verify the user was created
    const [users] = await connection.execute(
      'SELECT * FROM exam_admin_users WHERE username = ?',
      [username]
    );

    console.log('\n📋 Admin User Details:');
    console.log(JSON.stringify(users[0], null, 2));

    console.log('\n🎉 Setup Complete!');
    console.log('\n📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login at: adminlogin.html');

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

// Run the script
createAdminUser();
