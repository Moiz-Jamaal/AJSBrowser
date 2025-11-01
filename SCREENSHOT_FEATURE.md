# Screenshot Automation Feature

## Overview
The AJS Exam Browser now includes an automated screenshot capture and upload system that monitors a cookie to control when and how often full-screen screenshots are taken and uploaded to the exam server.

## How It Works

### Cookie-Based Control
The feature is controlled by a cookie named `BrowserAllowScreenShots` with the format:
```
UserEvalID_IntervalInSeconds
```

**Examples:**
- `2859_30` - UserEvalID is 2859, capture every 30 seconds
- `1234_60` - UserEvalID is 1234, capture every 60 seconds  
- `2859_0` - Stop screenshot automation

### Server Endpoint
Screenshots are uploaded to:
```
https://exams.jameasaifiyah.org/AJSEvalWS.asmx/SaveScreenShot
```

**Parameters:**
- `UserEvalID` - The user evaluation ID
- `base64String` - PNG screenshot encoded as base64

## Implementation Details

### Screenshot Capture
- **Type:** Full-screen capture (not just browser window)
- **Format:** PNG
- **Resolution:** Native display resolution
- **Method:** Uses Electron's `desktopCapturer` API

### Upload Method
- **Protocol:** HTTPS POST
- **Content-Type:** `application/x-www-form-urlencoded`
- **Encoding:** Base64

### Automation Behavior
1. **On page load:** Checks for the cookie and starts automation if valid
2. **Initial capture:** Takes and uploads screenshot immediately
3. **Interval captures:** Continues at specified interval
4. **Cookie changes:** Automatically adjusts when cookie is updated
5. **Stop condition:** When interval is 0 or cookie is removed

## Usage from Website

### JavaScript Implementation (ASP.NET/ASPX)

```javascript
// Start screenshot automation
function startScreenshots(userEvalID, intervalSeconds) {
    const cookieValue = `${userEvalID}_${intervalSeconds}`;
    
    // Use Electron API (recommended - works with all protocols)
    if (window.electronAPI && window.electronAPI.setScreenshotCookie) {
        window.electronAPI.setScreenshotCookie(cookieValue);
    } else {
        // Fallback: Set browser cookie (only works for HTTP/HTTPS)
        document.cookie = `BrowserAllowScreenShots=${cookieValue}; path=/; max-age=86400`;
        
        // Notify browser to check cookie
        if (window.electronAPI && window.electronAPI.checkScreenshotCookie) {
            window.electronAPI.checkScreenshotCookie();
        }
    }
}

// Stop screenshot automation
function stopScreenshots() {
    const userEvalID = getCurrentUserEvalID(); // Your method to get current user
    const cookieValue = `${userEvalID}_0`;
    
    if (window.electronAPI && window.electronAPI.setScreenshotCookie) {
        window.electronAPI.setScreenshotCookie(cookieValue);
    } else {
        document.cookie = `BrowserAllowScreenShots=${cookieValue}; path=/; max-age=86400`;
        
        if (window.electronAPI && window.electronAPI.checkScreenshotCookie) {
            window.electronAPI.checkScreenshotCookie();
        }
    }
}

// Example: Start when exam begins
function onExamStart(userEvalID) {
    startScreenshots(userEvalID, 30); // Screenshot every 30 seconds
}

// Example: Stop when exam ends
function onExamEnd() {
    stopScreenshots();
}
```

### ASP.NET Code-Behind (C#)

```csharp
// Set cookie from server-side
protected void StartExam_Click(object sender, EventArgs e)
{
    string userEvalID = GetCurrentUserEvalID(); // Your method
    int intervalSeconds = 30;
    
    Response.Cookies.Add(new HttpCookie("BrowserAllowScreenShots", 
        $"{userEvalID}_{intervalSeconds}")
    {
        Path = "/",
        Expires = DateTime.Now.AddHours(4)
    });
}

// Stop screenshots
protected void EndExam_Click(object sender, EventArgs e)
{
    string userEvalID = GetCurrentUserEvalID();
    
    Response.Cookies.Add(new HttpCookie("BrowserAllowScreenShots", 
        $"{userEvalID}_0")
    {
        Path = "/",
        Expires = DateTime.Now.AddHours(1)
    });
}
```

## Testing

### Test Page
Navigate to `test-screenshot.html` in the browser to:
- Set custom UserEvalID and interval
- Start/stop screenshot automation
- Test single screenshot capture
- View activity logs

### Manual Testing Steps
1. Open the test page
2. Enter UserEvalID (e.g., 2859)
3. Set interval (e.g., 30 seconds)
4. Click "Start Screenshot Automation"
5. Check console logs for confirmation
6. Wait for intervals to trigger
7. Verify uploads in your server logs

### Console Logs to Monitor
- `📋 Screenshot cookie found: 2859_30`
- `🎬 Starting screenshot automation: UserEvalID=2859, Interval=30s`
- `📸 Screenshot captured successfully (XXX KB)`
- `📤 Uploading screenshot for UserEvalID: 2859...`
- `✅ Screenshot uploaded successfully`

## Security Features

### Automatic Monitoring
- Cookie changes are detected automatically
- No way to disable from renderer process
- Runs in main process (secure)

### Full-Screen Capture
- Captures entire screen, not just browser window
- Includes all windows and desktop
- Cannot be manipulated by student

### Tamper Protection
- Screenshot blocking still active (Cmd+Shift+3/4/5 blocked)
- Window must stay maximized
- Multiple display detection active

## Troubleshooting

### Screenshots Not Capturing
1. Check cookie format: `UserEvalID_Interval`
2. Verify interval > 0
3. Check console for error messages
4. Ensure screen permissions granted to app

### Upload Failures
1. Verify server endpoint is accessible
2. Check UserEvalID is valid
3. Review server logs for errors
4. Ensure base64 data is valid

### Cookie Not Working
1. Check cookie domain and path
2. Verify cookie is set on correct domain
3. Use developer console: `document.cookie`
4. Try manual trigger: `window.electronAPI.checkScreenshotCookie()`

## Performance Considerations

### Recommended Intervals
- **Minimum:** 15 seconds (avoids excessive data)
- **Standard:** 30-60 seconds (balanced)
- **Maximum:** No limit (longer = less monitoring)

### Data Size
- Average screenshot: 200-500 KB (PNG)
- Per hour at 30s interval: ~24-60 MB
- Consider network bandwidth

### CPU Impact
- Screenshot capture: ~50-100ms
- Base64 encoding: ~50-100ms
- Upload: Depends on network
- Total per capture: <1 second

## Best Practices

### For Exam Start
```javascript
// Example: Start immediately when exam page loads
window.addEventListener('load', function() {
    if (isExamMode()) {
        const userEvalID = getUserEvalID();
        startScreenshots(userEvalID, 30);
    }
});
```

### For Exam End
```javascript
// Stop on submit
function submitExam() {
    stopScreenshots();
    // ... rest of submit logic
}

// Stop on window unload (backup)
window.addEventListener('beforeunload', function() {
    stopScreenshots();
});
```

### Error Handling
```javascript
// Verify automation started
setTimeout(function() {
    const cookie = getCookie('BrowserAllowScreenShots');
    if (!cookie || cookie.endsWith('_0')) {
        console.error('Screenshot automation failed to start');
        // Alert admin or retry
    }
}, 2000);
```

## API Reference

### Electron APIs (Available via window.electronAPI)

#### `setScreenshotCookie(cookieValue)`
Sets the screenshot cookie and triggers automation update. **Recommended method** - works with both file:// and HTTP/HTTPS protocols.
```javascript
await window.electronAPI.setScreenshotCookie('2859_30');
```

#### `checkScreenshotCookie()`
Manually triggers cookie check and automation update. Use this if setting cookie via document.cookie.
```javascript
await window.electronAPI.checkScreenshotCookie();
```

#### `captureScreenshot()`
Captures a single screenshot (for testing).
```javascript
const base64Image = await window.electronAPI.captureScreenshot();
console.log('Screenshot size:', base64Image.length);
```

## Version History

- **v3.1.0** - Initial screenshot automation feature
  - Full-screen capture
  - Cookie-based control
  - Automatic upload
  - Real-time monitoring

## Support

For issues or questions:
- Check console logs first
- Review server-side logs
- Verify cookie format
- Test with test-screenshot.html page
