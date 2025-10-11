const bcrypt = require('bcryptjs');
const db = require('./database');

async function setupAdmin() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   AJS Exam Browser - Admin Setup                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await db.initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Create default admin user
    console.log('👤 Creating default admin user...');
    const defaultPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    try {
      await db.createAdmin(
        'admin',
        passwordHash,
        'System Administrator',
        'admin@jameasaifiyah.org',
        'super_admin'
      );
      
      console.log('✅ Admin user created successfully!');
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║   DEFAULT ADMIN CREDENTIALS                            ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║   Username: admin                                      ║');
      console.log('║   Password: Admin@123                                  ║');
      console.log('║   Role: super_admin                                    ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║   ⚠️  IMPORTANT: Change the password after first login ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️  Admin user already exists\n');
      } else {
        throw error;
      }
    }

    // Create additional monitor user
    console.log('👤 Creating monitor user...');
    const monitorPassword = 'Monitor@123';
    const monitorHash = await bcrypt.hash(monitorPassword, 10);
    
    try {
      await db.createAdmin(
        'monitor',
        monitorHash,
        'Exam Monitor',
        'monitor@jameasaifiyah.org',
        'monitor'
      );
      
      console.log('✅ Monitor user created successfully!');
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║   MONITOR USER CREDENTIALS                             ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║   Username: monitor                                    ║');
      console.log('║   Password: Monitor@123                                ║');
      console.log('║   Role: monitor                                        ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️  Monitor user already exists\n');
      } else {
        throw error;
      }
    }

    console.log('✅ Setup completed successfully!');
    console.log('\n🚀 You can now start the remote monitoring server with:');
    console.log('   node remote-server.js\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupAdmin();
