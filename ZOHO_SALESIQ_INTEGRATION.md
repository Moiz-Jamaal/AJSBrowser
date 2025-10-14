# Zoho SalesIQ Integration for AJS Exam Browser

## Overview
This document explains the integration of Zoho SalesIQ widget into the AJS Exam Browser to enable live chat, voice/video calling, and remote screen sharing support during examinations.

## Changes Made

### 1. Content Security Policy (CSP) Updates - `index.html`

Added Zoho domains to all CSP directives:
- **Domains Added:**
  - `https://*.zohopublic.in`
  - `https://*.zoho.in`
  - `https://*.zoho.com`
  - `wss://*.zohopublic.in` (WebSocket for real-time chat)
  - `wss://*.zoho.in`
  - `wss://*.zoho.com`

- **CSP Directives Updated:**
  - `default-src` - Allow Zoho resources
  - `script-src` - Allow Zoho scripts
  - `style-src` - Allow Zoho stylesheets
  - `connect-src` - Allow Zoho API calls and WebSocket connections
  - `frame-src` - Allow Zoho iframes for chat widget
  - `media-src` - Allow Zoho media streams for voice/video calls

### 2. Permission Handler Updates - `main.js`

Added `displayCapture` permission to both permission handlers:

**Before:**
```javascript
const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture'];
```

**After:**
```javascript
const allowedPermissions = ['media', 'microphone', 'camera', 'audioCapture', 'videoCapture', 'displayCapture'];
```

This allows Zoho SalesIQ to:
- ✅ Access microphone for voice calls
- ✅ Access camera for video calls
- ✅ Capture screen for remote assistance
- ✅ Record audio/video for call recording
- ✅ Share student's screen with support team

## Zoho SalesIQ Widget Installation

The Zoho SalesIQ widget should already be installed on your exam portal pages:

```html
<script type="text/javascript" id="zsiqchat">
var $zoho=$zoho || {};
$zoho.salesiq = $zoho.salesiq || {
    widgetcode: "siq8b669419a5dba148780f10e8ac639aec7d902fcbaee74b50e2bdac018c76bafc", 
    values:{},
    ready:function(){}
};
var d=document;
s=d.createElement("script");
s.type="text/javascript";
s.id="zsiqscript";
s.defer=true;
s.src="https://salesiq.zohopublic.in/widget";
t=d.getElementsByTagName("script")[0];
t.parentNode.insertBefore(s,t);
</script>
```

## Features Enabled

### 1. Live Chat
- Students can chat with support staff in real-time
- Chat history is maintained
- File sharing capabilities

### 2. Voice Calling
- Students can initiate voice calls with support
- Microphone access is automatically granted
- No additional permissions needed

### 3. Video Calling
- Full video conferencing capability
- Camera and microphone access pre-approved
- High-quality video streaming

### 4. Remote Screen Sharing
- Support staff can request screen access
- Students can share their screen for troubleshooting
- Display capture permission pre-approved

### 5. Co-browsing (if enabled)
- Support can view student's screen in real-time
- Helpful for technical issues during exams

## Security Considerations

### What's Protected:
- ✅ Domain locking still active (only exams.jameasaifiyah.org)
- ✅ DevTools remain disabled
- ✅ Context menu still blocked
- ✅ Extensions still blocked
- ✅ Navigation controls remain in place

### What's Allowed:
- ✅ Zoho SalesIQ scripts and widgets
- ✅ WebSocket connections to Zoho servers
- ✅ Media permissions for support calls
- ✅ Screen sharing with Zoho only

## Testing the Integration

1. **Build the application:**
   ```bash
   npm run build-win
   ```

2. **Test the widget:**
   - Open the exam browser
   - Navigate to the exam portal
   - Look for the Zoho chat widget (usually bottom-right corner)
   - Test chat functionality
   - Test voice/video call (if configured)
   - Test screen sharing

3. **Verify permissions:**
   - When prompted for camera/mic, they should be auto-granted
   - Screen sharing should work without manual approval

## Troubleshooting

### Widget Not Appearing
- Check if the widget code is properly embedded on exam portal pages
- Verify the widget code matches your Zoho SalesIQ account
- Check browser console for CSP errors (there should be none)

### Permissions Not Working
- Ensure you've rebuilt the application after changes
- Verify `displayCapture` is in the allowed permissions list
- Check that Zoho domains are in the CSP

### WebSocket Connection Fails
- Verify WSS (WebSocket Secure) domains are in CSP
- Check firewall settings on the exam server
- Ensure port 443 is open for WebSocket connections

## Production Deployment

After testing:

1. **Rebuild the installer:**
   ```bash
   npm run build-win
   ```

2. **Distribute new version to students**

3. **Update documentation** to inform students about support chat availability

4. **Train support staff** on using Zoho SalesIQ during exams

## Zoho SalesIQ Dashboard

Access your Zoho SalesIQ dashboard at:
- https://salesiq.zoho.com/

Configure:
- Operating hours
- Auto-responses
- Routing rules
- Call recording settings
- Screen sharing permissions

## Notes

- All Zoho features work within the secure exam environment
- Students cannot use Zoho to cheat (domain locking prevents external sites)
- Support can monitor and assist students without compromising exam integrity
- Screen sharing only works with Zoho servers (not arbitrary screen capture)

## Version History

- **v2.0.0** - Added Zoho SalesIQ integration with full media permissions
- **v1.2.0** - Initial release with basic security features

---

**Last Updated:** October 14, 2025  
**Integration Status:** ✅ Complete and Ready for Testing
