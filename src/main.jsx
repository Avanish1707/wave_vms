import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Eye,
  EyeOff,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Users,
  Video,
  X,
} from "lucide-react";
import "../styles.css";
import "./registration-modal.css";
import AlertsView from "./components/Alerts.jsx";
import RegistrationView from "./components/Registrations.jsx";
import ReportsView from "./components/Reports.jsx";
import {
  ALERT_PAGE_SIZE,
  detectionTypes,
  isCameraOnline,
  normalizeDetectionType,
  typeLabel,
} from "./utils/detection.js";

const DEFAULT_HOST = (
  import.meta.env.VITE_API_BASE_URL || "http://103.234.71.180:5000"
).replace(/\/+$/, "");
const ADMIN_USERNAME = "admin";
const DEVICE_TOKEN_KEY = "wave-vms-web-device-token";
const SESSION_KEY = "wave-vms-web-session";
const PAGE_KEY = "wave-vms-web-page";

const Brand = () => (
  <div className="brand">
    <span className="brand-mark">i</span> Logic
  </div>
);

function deviceToken() {
  let token = localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!token) {
    token = `wave-vms-web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  }
  return token;
}

function requestDesktopNotifications() {
  if ("Notification" in window && Notification.permission === "default")
    Notification.requestPermission();
}

function showDesktopNotification(alert) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  const notification = new Notification(alert.title || typeLabel(alert.type), {
    body: `${alert.message || alert.person_name || alert.vehicle_type || "Detection recorded"}\n${alert.camera_name || alert.gate || alert.camera_id || ""}`,
    tag: `wave-vms-alert-${alert.id || Date.now()}`,
    icon: "/favicon.ico",
  });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function Login({ onLogin }) {
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    requestDesktopNotifications();
    setError("");
    setLoading(true);
    const fcmToken = deviceToken();
    try {
      const response = await fetch(`${DEFAULT_HOST}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fcm_token: fcmToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false)
        throw new Error(data.message || `Login failed (${response.status})`);
      onLogin({
        host: DEFAULT_HOST,
        username: data.username || username,
        adminId: data.admin_id,
        fcmToken,
      });
    } catch (err) {
      setError(
        err.message.includes("Failed to fetch")
          ? "Could not reach the API server."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-layout">
      <section className="login-copy">
        <Brand />
        <p className="eyebrow">SECURITY INTELLIGENCE</p>
        <h1>
          See every
          <br />
          <span>critical moment.</span>
        </h1>
        <p className="intro"> 
          A focused control center for your face recognition and gate
          intelligence system.
        </p>
        <div className="signal-line">
          <i /> SECURE ADMIN ACCESS
        </div>
      </section>
      <section className="login-panel">
        <form className="auth-card" onSubmit={submit}>
          <p className="eyebrow">ADMINISTRATOR</p>
          <h2>Welcome back</h2>
          <p className="subtle">
            Sign in to monitor registrations and detection alerts.
          </p>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <p className="form-message">{error}</p>}
          <button className="primary-button" disabled={loading}>
            {loading ? (
              <>
                <span>Logging in…</span>
                <RefreshCw
                  className="loading-spin"
                  size={18}
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                <span>Login</span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

function Portal({ session, onLogout }) {
  const [page, setPageState] = useState(
    () => localStorage.getItem(PAGE_KEY) || "registrations",
  );
  const [employees, setEmployees] = useState([]);
  const [detections, setDetections] = useState([]);
  const [detectionTotal, setDetectionTotal] = useState(0);
  const [cameras, setCameras] = useState([]);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("—");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [camera, setCamera] = useState("all");
  const [alertPage, setAlertPage] = useState(1);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertReload, setAlertReload] = useState(0);
  const [reportReload, setReportReload] = useState(0);
  const [loading, setLoading] = useState(true);

  const setPage = (nextPage) => {
    localStorage.setItem(PAGE_KEY, nextPage);
    setPageState(nextPage);
  };
  const get = async (path) => {
    const response = await fetch(`${session.host}${path}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false)
      throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  };
  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const [people, cameraResponse] = await Promise.all([
        get("/api/registered-employees"),
        get("/api/cameras"),
      ]);
      setEmployees(people.employees || []);
      setCameras(cameraResponse.cameras || []);
      setUpdated(
        `UPDATED ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      );
    } catch (err) {
      setError(`Could not load portal data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      if (session.adminId && session.fcmToken)
        await fetch(`${session.host}/api/admin/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            admin_id: session.adminId,
            fcm_token: session.fcmToken,
          }),
        });
    } finally {
      onLogout();
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    let active = true;
    const loadDetections = async () => {
      setAlertsLoading(true);
      setError("");
      try {
        let nextDetections;
        if (type === "helmet_detected") {
          const params = new URLSearchParams({ limit: "0" });
          if (camera !== "all") params.set("camera_id", camera);
          const response = await get(`/api/detections?${params}`);
          nextDetections = response.detections || [];
        } else {
          const params = new URLSearchParams({
            limit: String(alertPage * ALERT_PAGE_SIZE + 1),
            include_snapshot: "false",
          });
          if (type !== "all")
            params.set("type", normalizeDetectionType(type));
          if (camera !== "all") params.set("camera_id", camera);
          const response = await get(`/api/mobile?${params}`);
          nextDetections = response.data?.detections || [];
          setDetectionTotal(response.data?.detection_summary?.total_events || 0);
        }
        if (active) setDetections(nextDetections);
      } catch (err) {
        if (active) setError(`Could not load detection alerts: ${err.message}`);
      } finally {
        if (active) setAlertsLoading(false);
      }
    };
    loadDetections();
    return () => {
      active = false;
    };
  }, [session.host, type, camera, alertPage, alertReload]);
  useEffect(() => {
    const socket = io(session.host, { transports: ["websocket", "polling"] });
    const addDetection = (alert) => {
      setDetections((current) =>
        current.some((item) => item.id === alert.id)
          ? current
          : [alert, ...current],
      );
      setDetectionTotal((current) => current + 1);
      setUpdated(
        `UPDATED ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      );
    };
    socket.on("detection_event", addDetection);
    return () => socket.disconnect();
  }, [session.host]);
  const people = useMemo(() => {
    const text = search.toLowerCase();
    return employees.filter((person) =>
      [
        person.employee_name,
        person.employee_id,
        person.designation,
        person.gate_no,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(text),
      ),
    );
  }, [employees, search]);
  const alerts = useMemo(
    () =>
      detections.filter(
        (alert) =>
          (type === "all" || normalizeDetectionType(alert.type) === type) &&
          (camera === "all" || alert.camera_id === camera),
      ),
    [detections, type, camera],
  );
  return (
    <main className="portal">
      <aside className="sidebar">
        <Brand />
        <div className="admin-chip">
          <span className="avatar">{session.username[0].toUpperCase()}</span>
          <div>
            <strong>{session.username}</strong>
            <small>Administrator</small>
          </div>
          <i/>
        </div>
        <nav>
          <button
            className={`nav-item ${page === "registrations" ? "active" : ""}`}
            onClick={() => setPage("registrations")}
          >
            <LayoutGrid size={17} aria-hidden="true" />
            <span>Registrations</span>
          </button>
          <button
            className={`nav-item ${page === "alerts" ? "active" : ""}`}
            onClick={() => setPage("alerts")}
          >
            <Bell size={17} aria-hidden="true" />
            <span>Alerts</span>{" "}
            {detectionTotal > 0 && <b>{detectionTotal}</b>}
          </button>
          <button
            className={`nav-item ${page === "reports" ? "active" : ""}`}
            onClick={() => setPage("reports")}
          >
            <CalendarDays size={17} aria-hidden="true" />
            <span>Reports</span>
          </button>
        </nav>
        <button className="logout sidebar-logout" onClick={logout}>
          <LogOut size={15} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">
              {page === "alerts"
                ? "SECURITY EVENTS"
                : page === "reports"
                  ? "DETECTION HISTORY"
                  : "EMPLOYEE DIRECTORY"}
            </p>
            <h2>
              {page === "alerts"
                ? "Detection alerts"
                : page === "reports"
                  ? "Reports"
                  : "Registered people"}
            </h2>
          </div>
          <div className="header-actions">
            <span>{updated}</span>
            <button
              className="icon-button"
              onClick={() => {
                refresh();
                setAlertReload((value) => value + 1);
                setReportReload((value) => value + 1);
              }}
              aria-label="Refresh portal data"
              title={loading ? "Refreshing portal data" : "Refresh portal data"}
            >
              <RefreshCw
                className={loading ? "loading-spin" : ""}
                size={17}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>
        {error && <p className="portal-error">{error}</p>}
        {page !== "reports" && (
          <div className="summary-grid" aria-label="Portal summary">
            <SummaryCard
              icon={<Users size={18} />}
              label="Registered people"
              value={employees.length}
            />
            <SummaryCard
              icon={<Video size={18} />}
              label="Active cameras"
              value={cameras.filter(isCameraOnline).length}
            />
            <SummaryCard
              icon={<Bell size={18} />}
              label="Total alerts"
              value={detectionTotal}
            />
          </div>
        )}
        {page === "registrations" ? (
          <RegistrationView
            people={people}
            search={search}
            onSearch={setSearch}
            loading={loading}
          />
        ) : page === "alerts" ? (
          <AlertsView
            alerts={alerts}
            cameras={cameras}
            type={type}
            camera={camera}
            page={alertPage}
            hasMore={alerts.length > alertPage * ALERT_PAGE_SIZE}
            onPage={setAlertPage}
            onType={(nextType) => {
              setAlertPage(1);
              setType(nextType);
            }}
            onCamera={(nextCamera) => {
              setAlertPage(1);
              setCamera(nextCamera);
            }}
            onClear={() => {
              setAlertPage(1);
              setType("all");
              setCamera("all");
            }}
            loading={alertsLoading}
            isCameraOnline={isCameraOnline}
          />
        ) : (
          <ReportsView host={session.host} reload={reportReload} />
        )}
      </section>
    </main>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="summary-card">
      <span className="summary-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function AlertWatcher({ host }) {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const socket = io(host, { transports: ["websocket", "polling"] });
    const notify = (alert) => {
      if (normalizeDetectionType(alert.type) === "known_person") return;
      setNotification(alert);
      showDesktopNotification(alert);
    };
    socket.on("detection_event", notify);
    socket.on("face_alert", notify);
    return () => socket.disconnect();
  }, [host]);

  if (!notification) return null;
  return (
    <aside className="alert-popup" role="status">
      <button
        type="button"
        onClick={() => setNotification(null)}
        aria-label="Close alert notification"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <p>NEW SECURITY ALERT</p>
      <strong>{notification.title || typeLabel(notification.type)}</strong>
      <span>
        {notification.message ||
          notification.person_name ||
          notification.vehicle_type ||
          "Detection recorded"}
      </span>
      <small>
        {notification.camera_name ||
          notification.gate ||
          notification.camera_id ||
          "Unknown camera"}
      </small>
    </aside>
  );
}

function App() {
  const [session, setSession] = useState(() =>
    readStoredJson(SESSION_KEY, null),
  );
  const login = (nextSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };
  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };
  return (
    <>
      <AlertWatcher host={session?.host || DEFAULT_HOST} />
      {session ? (
        <Portal session={session} onLogout={logout} />
      ) : (
        <Login onLogin={login} />
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
