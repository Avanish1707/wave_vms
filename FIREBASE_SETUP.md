# Firebase Push Notifications Setup Guide

This guide explains how to configure and use Firebase Cloud Messaging for push notifications in the Wave FR Admin Portal instead of relying solely on Chrome desktop notifications.

The frontend obtains an FCM registration token and submits it during login. It
does not send push messages itself. End-to-end delivery also requires the API
backend to store the token and send FCM messages using Firebase Admin SDK
credentials for the same Firebase project.

## Prerequisites

1. **Firebase Project**: Already set up at [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Web App**: Registered in your Firebase project
3. **Web Push VAPID Key**: Generated in Firebase Console

## Setup Steps

### 1. Gather Firebase Configuration

From Firebase Console → **Project settings**:

1. Go to **General** tab
2. Under "Your apps", copy your **Web app configuration**:
   - `apiKey`
   - `authDomain`
   - `databaseURL`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (if available)

### 2. Generate/Get VAPID Public Key

1. Go to **Cloud Messaging** tab
2. Under "Web Push certificates", click **Generate Key Pair** (if not already done)
3. Copy the **public key** (it starts with `B...`)

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in all Firebase values:

```bash
# Copy the template
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_BASE_URL=http://your-api-server:5000

VITE_FIREBASE_API_KEY=AIzaSyA-GPA32nXctLuQWtUSLCFUQLPqq3IrCnY
VITE_FIREBASE_AUTH_DOMAIN=pythonai-cfe6b.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://pythonai-cfe6b-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=pythonai-cfe6b
VITE_FIREBASE_STORAGE_BUCKET=pythonai-cfe6b.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=313929799917
VITE_FIREBASE_APP_ID=1:313929799917:web:2b931bacfcb351f44614e4
VITE_FIREBASE_MEASUREMENT_ID=G-TNQFGMERY1

VITE_FIREBASE_VAPID_PUBLIC_KEY=BCrAkyYG3-4Hcj5htmSDD_M-YFfZ2iHWQXE-PseDtua8afjJAClegaNueRti4qpLOW5sWWlm5kgf5TL1rqqIa0Q
```

### 4. Run the Development Server

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` and log in. The app will:
1. Request Notification permission
2. Register a Firebase service worker
3. Obtain a Firebase Cloud Messaging token
4. Send it to your API server

### 5. Production Build

```bash
npm run build
```

The build output includes `firebase-messaging-sw.js`, which handles background notifications.

## How It Works

### Desktop Notifications (Foreground)
- While the app is open in a browser tab:
  - Alerts from Socket.IO trigger in-browser notifications
  - In-app popup shows alert details
  - Desktop notifications via native `Notification` API

### Push Notifications (Background)
- While the app is closed/minimized:
  - Your backend sends Firebase Cloud Messaging (FCM) messages using the stored token
  - Firebase service worker (background process) receives the message
  - Desktop notification appears
  - Clicking the notification refocuses the app

### Notification Flow

1. **Login**: User logs in → Browser requests Notification permission
2. **Firebase Registration**: 
   - Service worker registers at `/firebase-messaging-sw.js`
   - Firebase token obtained and sent to backend via `fcm_token`
3. **Real-time Alerts**:
   - Backend detects event (face, vehicle, etc.)
   - Firebase Admin SDK sends message to stored FCM token
   - User receives push notification regardless of app state
4. **Logout**: Token deactivated on server, notifications stop

## Backend Integration

Your API backend should:

1. **Store FCM tokens** on login (already in your API):
   ```json
   POST /api/admin/login
   {
     "username": "admin",
     "password": "...",
     "fcm_token": "c-cloud-messaging-token..."
   }
   ```

2. **Send notifications** using Firebase Admin SDK:
   ```python
   from firebase_admin import messaging

   message = messaging.Message(
       notification=messaging.Notification(
           title="Face Detected",
           body="Known person: John Doe"
       ),
       data={
           "camera_id": "CAM001",
           "camera_name": "Main Gate",
           "person_name": "John Doe",
           "type": "known_person"
       },
       token=fcm_token
   )
   
   response = messaging.send(message)
   ```

3. **Clear tokens** on logout (already in your API):
   ```json
   POST /api/admin/logout
   {
     "admin_id": 1,
     "fcm_token": "..."
   }
   ```

## Testing Push Notifications

### From Firebase Console

1. Go to **Cloud Messaging** tab
2. Click **Send your first message**
3. Paste a test FCM token (find it in browser console: `console.log()` in `registerFirebasePush()`)
4. Observe notification on your device

### From Python Backend

```python
from firebase_admin import credentials, messaging
import firebase_admin

# Initialize once
if not firebase_admin.get_app():
    cred = credentials.Certificate('path/to/serviceAccountKey.json')
    firebase_admin.initialize_app(cred)

# Send a message
message = messaging.Message(
    notification=messaging.Notification(
        title="Test Alert",
        body="This is a test push notification"
    ),
    token=fcm_token
)

messaging.send(message)
```

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure `public/firebase-messaging-sw.js` is served at root
- Service workers only work over HTTPS or localhost

### No Notifications Received
- Verify VAPID key in `.env.local` matches Firebase Console
- Check Firebase Console → Cloud Messaging → check that your web app is enabled
- Look at browser Console (Ctrl+Shift+J) for Firebase SDK errors
- Verify `fcm_token` is actually sent to backend on login

### Token Not Persisting
- Check localStorage; token should be stored as device token
- Browser storage must be allowed (not cleared on exit)
- Private/incognito mode clears storage on close

### Background Notifications Not Showing
- Ensure service worker is active (DevTools → Application → Service Workers)
- Verify backend sends FCM message with correct token
- Check browser permissions for notifications (Settings → Privacy → Notifications)

## File Structure

```
wave_vms/
├── src/
│   ├── main.jsx                 # Firebase integration here
│   └── utils/
│       └── firebase.js          # Firebase utilities (new)
├── public/
│   └── firebase-messaging-sw.js # Service worker (new)
├── .env.local                   # Firebase config (create from .env.example)
└── .env.example                 # Template with all config keys
```

## References

- [Firebase Cloud Messaging Web Docs](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Worker Spec](https://www.w3.org/TR/service-workers/)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
