# Quick Start: Firebase Push Notifications

## Frontend Setup

The frontend is configured to request an FCM token at login and register it with
the API. End-to-end push delivery is not complete until the backend uses Firebase
Admin SDK to send notifications to registered tokens.

## 1. Verify Installation (30 seconds)

```bash
cd D:\webPortal
npm.cmd run dev
```

Visit `http://localhost:5173` — server should start at port 5173.

## 2. Check Configuration

Ensure `.env.local` contains the Firebase settings and VAPID public key from
`.env.example`, and that `VITE_API_BASE_URL` points to the API server you use.
Restart Vite after changing environment variables.

Serve the app from `localhost` for local testing or deploy it over HTTPS. Service
workers do not work on an ordinary HTTP production domain.

## 3. Test the Flow

1. **Open browser console** (Ctrl+Shift+J)
2. **Log in** with your admin credentials
3. **Watch console logs** for:
   - `"Firebase initialized successfully"`
   - `"Firebase service worker registered"`
   - `"Firebase push token registered: c..."`
4. **Copy that token** (the long string after "registered:")

## 4. Test Push Delivery

First confirm the API login request includes a real, long FCM token as
`fcm_token` (not the `wave-vms-web-...` fallback). Then send a test notification
to that token from Firebase Console → **Messaging**, if the console offers test
message delivery for your project.

To verify background delivery, log in, then close or background the app before
sending the test message. To verify foreground handling, keep the app open.

If the console does not offer test-to-token delivery, the backend team must send
the test using Firebase Admin SDK. The frontend cannot send FCM messages itself.

## 5. Files You Need to Know

- **`src/main.jsx`** - App entry point (modified)
- **`src/utils/firebase.js`** - Firebase logic ⭐ NEW
- **`public/firebase-messaging-sw.js`** - Background notifications ⭐ NEW
- **`.env.local`** - Your config ⭐ NEW
- **`FIREBASE_SETUP.md`** - Full guide for backend integration
- **`IMPLEMENTATION_SUMMARY.md`** - Technical architecture

## 6. For Backend Developers

The API login endpoint accepts `fcm_token`. The backend still needs to use Firebase
Admin SDK credentials to send push messages to stored tokens:

**Python Example:**
```python
from firebase_admin import messaging

message = messaging.Message(
    notification=messaging.Notification(
        title="Face Detected",
        body="Employee: John Doe"
    ),
    data={
        "camera_id": "CAM001",
        "camera_name": "Main Gate",
        "person_name": "John Doe"
    },
    token=fcm_token
)

messaging.send(message)
```

See **`FIREBASE_SETUP.md`** for complete backend integration guide.

## 7. Production Deployment

```bash
npm.cmd run build
```

This creates `dist/` folder with everything needed:
- ✅ Bundled app
- ✅ Firebase service worker
- ✅ All assets

Deploy `dist/` to your web server (any static file host works).

## 8. How It Works

**When App is Open:**
- Real-time alerts via Socket.IO
- Desktop notifications via Notification API
- In-app popup notification

**When App is Closed:**
- Firebase service worker (background process) receives message
- Desktop notification appears
- Click notification → App opens

**Notification Flow:**
```
Backend Event → Firebase Cloud Messaging → Service Worker → Desktop Notification
```

## 9. Troubleshooting (2 min)

### "Service worker failed to register"
- Check browser console for errors
- Ensure `public/firebase-messaging-sw.js` exists
- Service workers only work over HTTPS or localhost

### "No notifications received"
- Verify token in console logs
- Check Firebase Console → Cloud Messaging (web app enabled?)
- Look for Firebase SDK errors in console

### "Token not showing in logs"
- Check browser permissions for notifications
- Verify `.env.local` has all Firebase values filled
- Try clearing localStorage and logging in again

See **`FIREBASE_SETUP.md`** for more troubleshooting.

## 10. What's New

| Before | After |
|--------|-------|
| Only Chrome desktop notifications | Chrome + Firefox + Safari + all browsers |
| Only when app is open | Works when app is closed (background) |
| No persistent token | Persistent FCM token via Firebase |
| Manual push setup | Automatic Firebase integration |

---

## Next Steps

1. **Test locally** with `npm.cmd run dev`
2. **Read FIREBASE_SETUP.md** for backend integration details
3. **Build for production** with `npm.cmd run build`
4. **Deploy dist/ folder** to your web server

**Questions?** Check the full guides:
- 📖 **FIREBASE_SETUP.md** - Complete setup and backend integration
- 📖 **IMPLEMENTATION_SUMMARY.md** - Technical details and architecture

Happy push notifications! 🚀
