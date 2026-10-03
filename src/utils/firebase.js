import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const VAPID_PUBLIC_KEY = import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY;

let app = null;
let messaging = null;

export function initializeFirebase() {
  if (app) return app;

  try {
    app = initializeApp(FIREBASE_CONFIG);
    messaging = getMessaging(app);
    console.log("Firebase initialized successfully");
    return app;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return null;
  }
}

export async function registerFirebasePushNotifications(
  serviceWorkerRegistration,
) {
  if (!messaging) {
    console.warn("Firebase messaging not initialized");
    return null;
  }

  try {
    const permission = Notification.permission;
    if (permission === "denied") {
      console.warn("Push notification permission denied");
      return null;
    }

    if (permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        console.warn("Push notification permission not granted");
        return null;
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration,
    });

    if (token) {
      console.log("Firebase push token registered:", token);
      return token;
    } else {
      console.warn("Failed to get Firebase push token");
      return null;
    }
  } catch (error) {
    console.error("Failed to register Firebase push notifications:", error);
    return null;
  }
}

export function listenForFirebasePushNotifications(callback) {
  if (!messaging) {
    console.warn("Firebase messaging not initialized");
    return () => {};
  }

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Firebase message received:", payload);

      const alert = {
        title: payload.notification?.title || "Alert",
        message: payload.notification?.body || "",
        type: payload.data?.type,
        camera_id: payload.data?.camera_id,
        camera_name: payload.data?.camera_name,
        gate: payload.data?.gate,
        person_name: payload.data?.person_name,
        vehicle_type: payload.data?.vehicle_type,
        id: payload.data?.id || Date.now(),
      };

      callback(alert);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Failed to set up Firebase message listener:", error);
    return () => {};
  }
}

export function isFirebaseConfigured() {
  return (
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.apiKey &&
    VAPID_PUBLIC_KEY &&
    "serviceWorker" in navigator
  );
}
