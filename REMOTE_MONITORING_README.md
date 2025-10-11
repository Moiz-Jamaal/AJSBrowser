# AJS Exam Browser - Remote Monitoring System

## 🎯 Overview

This is a comprehensive remote PC access and monitoring system for the AJS Exam Browser. It provides real-time monitoring of student examination sessions with the following features:

### ✨ Key Features

1. **Student Identification**: ITS ID-based authentication
2. **Explicit Consent Management**: Students must consent to monitoring before exam
3. **Real-time Session Monitoring**: Track all active exam sessions
4. **Automatic Screenshot Capture**: Screenshots taken every 30 seconds
5. **Activity Logging**: Track window switches, suspicious activities, and more
6. **Admin Dashboard**: Web-based panel to view and manage sessions
7. **WebSocket Communication**: Real-time bidirectional communication
8. **Database Integration**: MySQL/Aurora database for persistent storage
9. **Role-Based Access**: Super Admin, Admin, and Monitor roles

---

## 📋 Prerequisites

- Node.js v16 or higher
- MySQL/Aurora database (AWS RDS)
- macOS or Windows

---

## 🚀 Installation & Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Database

The database connection is already configured in `database.js`:
- **Host**: cfdatabase-aurora-dbinstance.cwuunmslcju0.us-east-1.rds.amazonaws.com
- **Port**: 3306
- **Database**: aurora_iltehaaq
- **Username**: admin
- **Password**: JhsDB#515253.

### Step 3: Initialize Database and Create Admin Users

```bash
node setup-admin.js
```

This will:
- Create all necessary database tables
- Create database views for reporting
- Create default admin users

**Default Credentials:**
- **Super Admin**
  - Username: `admin`
  - Password: `Admin@123`
  
- **Monitor**
  - Username: `monitor`
  - Password: `Monitor@123`

⚠️ **IMPORTANT**: Change these passwords after first login!

---

## 🎮 Usage

### Starting the Remote Monitoring Server

```bash
node remote-server.js
```

The server will start on `http://localhost:3000`

### Accessing the Admin Panel

1. Open your browser and go to: **http://localhost:3000/admin**
2. Login with admin credentials
3. View active sessions, screenshots, and activities

### Running the Student Browser

```bash
npm start
```

Students will:
1. Enter their ITS ID and full name
2. Consent to remote monitoring
3. Agree to compliance terms
4. Connect to exam portal with automatic monitoring

---

## 📊 Database Schema

### Tables Created:

1. **exam_students** - Student information and consent records
2. **exam_remote_sessions** - Active and historical exam sessions
3. **exam_activity_logs** - All student activities during exams
4. **exam_admin_users** - Administrator accounts
5. **exam_admin_sessions** - Admin login sessions
6. **exam_screenshots** - Captured screenshots with metadata

### Views Created:

1. **active_exam_sessions** - Real-time view of active sessions with statistics
2. **session_statistics** - Daily statistics and analytics

---

## 🔐 Security Features

### Student Side:
- ITS ID verification
- Explicit consent before monitoring starts
- Encrypted WebSocket communication
- Activity tracking (window switches, suspicious behavior)
- Automatic screenshot capture every 30 seconds
- Session logging with timestamps

### Admin Side:
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session token management
- Audit trail of all admin actions

---

## 🌐 API Endpoints

### Admin Endpoints (Require Authentication)

```
POST   /api/admin/login                    - Admin login
POST   /api/admin/create                   - Create new admin (temp)
GET    /api/admin/sessions/active          - Get all active sessions
GET    /api/admin/sessions/:sessionId      - Get session details
GET    /api/admin/statistics               - Get exam statistics
POST   /api/admin/sessions/:sessionId/end  - End a session
```

### Student Endpoints

```
POST   /api/student/verify                 - Verify student ITS ID and consent
```

### WebSocket Messages

**Student → Server:**
- `student_connect` - Initial connection
- `screenshot` - Screenshot data
- `activity` - Activity log entry

**Admin → Server:**
- `admin_connect` - Initial connection
- `admin_request_screenshot` - Request screenshot from student
- `admin_view_session` - Get session details

**Server → Admin:**
- `new_session` - New student connected
- `session_disconnected` - Student disconnected
- `suspicious_activity` - Suspicious behavior detected
- `new_screenshot` - New screenshot available

---

## 📸 Screenshot Storage

Screenshots are stored in two places:
1. **File System**: `./screenshots/` directory
2. **Database**: BLOB storage in `exam_screenshots` table

Access screenshots via: `http://localhost:3000/screenshots/{filename}.jpg`

---

## 🎯 Monitoring Features

### Automatic Monitoring:
- ✅ Screenshot capture every 30 seconds
- ✅ Window focus/blur detection
- ✅ Tab visibility changes
- ✅ Alt+Tab / Cmd+Tab detection
- ✅ Heartbeat signals every 10 seconds

### Suspicious Activity Detection:
- Window switches (Alt+Tab, Cmd+Tab)
- Page hidden events (tab switching)
- Loss of focus events
- Multiple application access attempts

---

## 🔧 Configuration

### Change Screenshot Interval

Edit `monitoring-client.js`:
```javascript
this.screenshotInterval = setInterval(() => {
  this.captureScreenshot();
}, 30000); // Change 30000 to desired milliseconds
```

### Change Server Port

Edit `remote-server.js`:
```javascript
const PORT = process.env.PORT || 3000; // Change 3000 to desired port
```

### Add Custom Admin

```bash
node
> const db = require('./database');
> const bcrypt = require('bcryptjs');
> const hash = await bcrypt.hash('your-password', 10);
> await db.createAdmin('username', hash, 'Full Name', 'email@example.com', 'admin');
```

---

## 📦 Building Installers

### For macOS:
```bash
npm run build-mac
```

### For Windows:
```bash
npm run build-win
```

### For Both:
```bash
npm run build-all
```

---

## 🐛 Troubleshooting

### Database Connection Issues

If you get database connection errors:
1. Verify the AWS RDS instance is running
2. Check security group allows connections from your IP
3. Verify credentials in `database.js`

### WebSocket Connection Issues

If students can't connect:
1. Ensure remote server is running (`node remote-server.js`)
2. Check if port 3000 is available
3. Verify firewall settings

### Screenshot Capture Issues

If screenshots aren't being captured:
1. Ensure Electron has screen recording permissions (macOS)
2. Check console for errors
3. Verify `desktopCapturer` API is available

---

## 🚀 Production Deployment

### Server Deployment:

1. **Deploy to AWS/Cloud Server**
   ```bash
   # Install PM2 for process management
   npm install -g pm2
   
   # Start server with PM2
   pm2 start remote-server.js --name ajs-monitoring
   pm2 save
   pm2 startup
   ```

2. **Use HTTPS**
   - Configure SSL certificate
   - Update WebSocket connection to use `wss://`

3. **Change JWT Secret**
   Edit `remote-server.js`:
   ```javascript
   const JWT_SECRET = 'your-secure-random-secret-key';
   ```

4. **Environment Variables**
   ```bash
   export PORT=3000
   export JWT_SECRET="your-secret"
   export NODE_ENV=production
   ```

### Student Browser Deployment:

1. Build installers for target platforms
2. Distribute DMG/EXE files to students
3. Configure exam portal URL in `main.js`

---

## 📄 Privacy & Compliance

This system collects and stores:
- Student ITS ID and personal information
- Screenshots of student screens during exams
- Activity logs (window switches, keystrokes metadata)
- Video/audio if enabled

**Ensure compliance with:**
- GDPR (if applicable)
- FERPA (educational records)
- Institutional privacy policies
- Student consent requirements

---

## 👥 Support

For technical support, contact:
- Email: admin@jameasaifiyah.org
- System Administrator

---

## 📝 License

Copyright © 2025 Jamea Saifiyah. All rights reserved.

---

## 🔄 Version History

- **v1.0.0** (Oct 2025) - Initial release with remote monitoring
  - ITS ID authentication
  - Consent management
  - Real-time monitoring
  - Admin dashboard
  - Database integration
  - Screenshot capture
  - Activity logging

---

## 🎓 Credits

Developed for Jamea Saifiyah examination system.
