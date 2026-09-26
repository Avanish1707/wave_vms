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
  Search,
  SlidersHorizontal,
  Users,
  Video,
  X,
} from "lucide-react";
import "../styles.css";
import "./registration-modal.css";

const DEFAULT_HOST = (
  import.meta.env.VITE_API_BASE_URL || "http://103.234.71.180:5000"
).replace(/\/+$/, "");
const ADMIN_USERNAME = "admin";
const DEVICE_TOKEN_KEY = "wave-vms-web-device-token";
const SESSION_KEY = "wave-vms-web-session";
const PAGE_KEY = "wave-vms-web-page";
const ALERT_PAGE_SIZE = 25;
const REPORT_PAGE_SIZE = 25;
const reportTimeSlots = [
  { label: "12:00 AM - 03:00 AM", start: 0, end: 3 },
  { label: "03:00 AM - 06:00 AM", start: 3, end: 6 },
  { label: "06:00 AM - 09:00 AM", start: 6, end: 9 },
  { label: "09:00 AM - 12:00 PM", start: 9, end: 12 },
  { label: "12:00 PM - 03:00 PM", start: 12, end: 15 },
  { label: "03:00 PM - 06:00 PM", start: 15, end: 18 },
  { label: "06:00 PM - 09:00 PM", start: 18, end: 21 },
  { label: "09:00 PM - 12:00 AM", start: 21, end: 24 },
];
const currentDateInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const detectionDateAndHour = (value) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):/);
    if (match) return { date: match[1], hour: Number(match[2]) };
  }
  if (value) {
    const date = new Date(typeof value === "number" ? value * 1000 : value);
    if (!Number.isNaN(date.getTime())) {
      return {
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        hour: date.getHours(),
      };
    }
  }
  return null;
};
const detectionTypes = [
  "all",
  "vehicle",
  "known_person",
  "unknown_person",
  "helmet_detected",
  "fall_detected",
  "smoke_detected",
  "fire_detected",
  "object_theft",
];
const normalizeDetectionType = (type) =>
  type === "object_theft_detected" ? "object_theft" : type;
const typeLabel = (type) =>
  ({
    vehicle: "Vehicle detected",
    known_person: "Known person detected",
    unknown_person: "Unknown person detected",
    helmet_detected: "Helmet detected",
    fall_detected: "Fall detected",
    smoke_detected: "Smoke detected",
    fire_detected: "Fire detected",
    object_theft: "Object theft detection",
    object_theft_detected: "Object theft detection",
  })[type] || String(type || "Detection").replaceAll("_", " ");
const dateText = (value) => {
  if (!value) return "—";
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date)
    ? String(value)
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};
const isToday = (value) => {
  if (!value) return false;
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return (
    !Number.isNaN(date) && date.toDateString() === new Date().toDateString()
  );
};
const Brand = () => (
  <div className="brand">
    <span className="brand-mark">W</span> WAVE <em>VMS</em>
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
  const [host, setHost] = useState(DEFAULT_HOST),
    [username, setUsername] = useState(ADMIN_USERNAME),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    requestDesktopNotifications();
    setError("");
    setLoading(true);
    const fcmToken = deviceToken();
    const apiHost = host.trim().replace(/\/+$/, "");
    try {
      const response = await fetch(`${apiHost}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fcm_token: fcmToken }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false)
        throw new Error(data.message || `Login failed (${response.status})`);
      onLogin({
        host: apiHost,
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
            API server URL
            <input
              type="url"
              autoComplete="url"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              placeholder="http://localhost:5000"
              required
            />
          </label>
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
    ),
    [employees, setEmployees] = useState([]),
    [detections, setDetections] = useState([]),
    [detectionTotal, setDetectionTotal] = useState(0),
    [cameras, setCameras] = useState([]),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState("—"),
    [search, setSearch] = useState(""),
    [type, setType] = useState("all"),
    [camera, setCamera] = useState("all"),
    [alertPage, setAlertPage] = useState(1),
    [alertsLoading, setAlertsLoading] = useState(true),
    [alertReload, setAlertReload] = useState(0),
    [reportReload, setReportReload] = useState(0),
    [loading, setLoading] = useState(true);
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
              label="Total detections"
              value={detectionTotal}
            />
          </div>
        )}
        {page === "registrations" ? (
          <Registrations
            people={people}
            search={search}
            onSearch={setSearch}
            loading={loading}
          />
        ) : page === "alerts" ? (
          <Alerts
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
          />
        ) : (
          <Reports host={session.host} reload={reportReload} />
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

function LoadingBanner() {
  return (
    <div className="loading-banner" role="status" aria-live="polite">
      <RefreshCw className="loading-spin" size={15} aria-hidden="true" />
      <span>Reloading portal data…</span>
    </div>
  );
}

function Registrations({ people, search, onSearch, loading }) {
  const [selected, setSelected] = useState(null);
  return (
    <section>
      <div className="toolbar">
        <div className="search">
          <Search size={17} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by name, ID, designation or gate"
          />
        </div>
        <span className="result-count">
          {people.length} {people.length === 1 ? "person" : "people"}
        </span>
      </div>
      {loading && <LoadingBanner />}
      {loading ? (
        <div className="person-grid" aria-label="Loading registrations">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="person-skeleton" key={index} />
          ))}
        </div>
      ) : people.length ? (
        <div className="person-grid">
          {people.map((person) => (
            <PersonCard
              person={person}
              key={person.registration_id}
              onClick={() => setSelected(person)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {search
            ? "No registered people match your search."
            : "No registered people found."}
        </div>
      )}
      <DetailModal person={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
function PersonCard({ person, onClick }) {
  return (
    <article
      className="person-card"
      role="button"
      tabIndex="0"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
    >
      <div className="person-photo">
        {person.image_urls?.[0] ? (
          <img
            src={person.image_urls[0]}
            alt={`Registered face of ${person.employee_name || "employee"}`}
          />
        ) : (
          <span className="no-photo">NO IMAGE</span>
        )}
      </div>
      <div className="person-body">
        <span className="gate-tag">{person.gate_no || "NO GATE"}</span>
        <h3>{person.employee_name || "Unnamed person"}</h3>
        <p className="designation">{person.designation || "No designation"}</p>
        <dl>
          <div>
            <dt>Employee ID</dt>
            <dd>{person.employee_id || "—"}</dd>
          </div>
          <div>
            <dt>Registered</dt>
            <dd>{dateText(person.created_at)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
function DetailModal({ person, onClose }) {
  if (!person) return null;
  const details = [
    ["Employee ID", person.employee_id || "—"],
    ["Gate", person.gate_no || "—"],
    ["Designation", person.designation || "—"],
    ["Registration ID", person.registration_id || "—"],
    ["Registered", dateText(person.created_at)],
    ["Last updated", dateText(person.updated_at)],
  ];
  return (
    <div className="registration-overlay" role="presentation" onClick={onClose}>
      <article
        className="registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Registration details"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="registration-close"
          type="button"
          onClick={onClose}
          aria-label="Close registration details"
        >
          <X size={19} aria-hidden="true" />
        </button>
        <div className="registration-detail">
          <div>
            {person.image_urls?.[0] ? (
              <img
                className="registration-primary-photo"
                src={person.image_urls[0]}
                alt={`Registered face of ${person.employee_name || "employee"}`}
              />
            ) : (
              <div className="registration-no-photo">NO IMAGE</div>
            )}
          </div>
          <div>
            <p className="eyebrow">REGISTRATION DETAILS</p>
            <span className="gate-tag">{person.gate_no || "NO GATE"}</span>
            <h2>{person.employee_name || "Unnamed person"}</h2>
            <p className="designation">
              {person.designation || "No designation"}
            </p>
            <Facts details={details} />
          </div>
          <section className="registration-gallery">
            <h3>Registered face images</h3>
            <div className="registration-gallery-grid">
              {person.image_urls?.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`Registration image ${index + 1}`}
                />
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
function Facts({ details }) {
  return (
    <dl className="registration-facts">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function isCameraOnline(camera) {
  const status = String(
    camera.status || camera.state || camera.camera_status || "",
  ).toLowerCase();
  const unavailableStatuses = ["disabled", "offline", "closed", "disconnected"];
  return (
    camera.enabled !== false &&
    !unavailableStatuses.includes(status) &&
    (camera.is_online === true ||
      camera.online === true ||
      camera.connected === true ||
      camera.active === true ||
      ["online", "live", "running", "connected", "active", "open", "opened"].includes(status) ||
      camera.enabled === true)
  );
}
function Reports({ host, reload }) {
  const [reportDate, setReportDate] = useState(currentDateInput);
  const [timeSlot, setTimeSlot] = useState("all");
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let active = true;
    const loadReportData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${host}/api/detections?limit=0`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false)
          throw new Error(data.message || `Request failed (${response.status})`);
        if (active) setDetections(data.detections || []);
      } catch (err) {
        if (active) setError(`Could not load report data: ${err.message}`);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadReportData();
    return () => {
      active = false;
    };
  }, [host, reload]);

  const selectedSlot = reportTimeSlots.find((slot) => slot.label === timeSlot);
  const matchingDetections = useMemo(
    () =>
      detections.filter((detection) => {
        const parts = detectionDateAndHour(detection.time);
        return (
          parts?.date === reportDate &&
          (!selectedSlot ||
            (parts.hour >= selectedSlot.start && parts.hour < selectedSlot.end))
        );
      }),
    [detections, reportDate, selectedSlot],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(matchingDetections.length / REPORT_PAGE_SIZE),
  );
  const visibleDetections = matchingDetections.slice(
    (page - 1) * REPORT_PAGE_SIZE,
    page * REPORT_PAGE_SIZE,
  );

  useEffect(() => setPage(1), [reportDate, timeSlot]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <section className="reports-view">
      <div className="report-filters">
        <div className="report-filter-heading">
          <CalendarDays size={17} aria-hidden="true" />
          <div>
            <strong>Filter reports</strong>
            <span>Choose a date and time slot</span>
          </div>
        </div>
        <label>
          Date
          <input
            type="date"
            value={reportDate}
            max={currentDateInput()}
            onChange={(event) => {
              setReportDate(event.target.value);
              setTimeSlot("all");
            }}
          />
        </label>
        <label>
          Time slot
          <select
            value={timeSlot}
            onChange={(event) => setTimeSlot(event.target.value)}
          >
            <option value="all">All day</option>
            {reportTimeSlots.map((slot) => (
              <option key={slot.label} value={slot.label}>
                {slot.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="report-activity-heading">
        <div>
          <h3>Alert activity</h3>
          <p>
            Showing reports for {reportDate}
            {selectedSlot ? `, ${selectedSlot.label}` : ", all day"}.
          </p>
        </div>
        <strong className="report-count">
          {matchingDetections.length}
          <span>{matchingDetections.length === 1 ? "alert" : "alerts"}</span>
        </strong>
      </div>
      {error && <p className="portal-error">{error}</p>}
      {loading ? (
        <div className="alerts-list" aria-label="Loading report data">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="alert-skeleton" key={index} />
          ))}
        </div>
      ) : visibleDetections.length ? (
        <div className="alerts-list">
          {visibleDetections.map((detection) => (
            <article
              className={`alert-card ${detection.type}`}
              key={detection.id}
              role="button"
              tabIndex="0"
              onClick={() => setSelected(detection)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelected(detection);
                }
              }}
            >
              {detection.image_url && (
                <img
                  className="alert-image"
                  src={detection.image_url}
                  alt="Detection evidence"
                  loading="lazy"
                />
              )}
              <div className="alert-info">
                <h3>{detection.title || typeLabel(detection.type)}</h3>
                <p>
                  {detection.message ||
                    detection.person_name ||
                    detection.vehicle_type ||
                    "Detection recorded"}
                </p>
                <div className="alert-meta">
                  <span>
                    {detection.camera_name ||
                      detection.gate ||
                      detection.camera_id ||
                      "Unknown camera"}
                  </span>
                  {detection.confidence != null && (
                    <span>
                      {Math.round(detection.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
              <time className="alert-time">{dateText(detection.time)}</time>
            </article>
          ))}
          {pageCount > 1 && (
            <nav className="alerts-pagination" aria-label="Report pages">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page === pageCount}
              >
                Next
              </button>
            </nav>
          )}
        </div>
      ) : (
        <div className="empty-state">No alerts found for this date and time slot.</div>
      )}
      <AlertModal alert={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
function Alerts({
  alerts,
  cameras,
  type,
  camera,
  page,
  hasMore,
  onPage,
  onType,
  onCamera,
  onClear,
  loading,
}) {
  const [selected, setSelected] = useState(null);
  const [selectedKnown, setSelectedKnown] = useState(null);
  const visibleAlerts = alerts.slice(
    (page - 1) * ALERT_PAGE_SIZE,
    page * ALERT_PAGE_SIZE,
  );
  const visibleKnownPeople = visibleAlerts.filter(
    (alert) => normalizeDetectionType(alert.type) === "known_person",
  );
  return (
    <section>
      <div className="filter-bar">
        <div className="filter-heading">
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>Filter events</span>
        </div>
        <label>
          Detection type
          <select value={type} onChange={(event) => onType(event.target.value)}>
            {detectionTypes.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All events" : typeLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Camera / host
          <select
            value={camera}
            onChange={(event) => onCamera(event.target.value)}
          >
            <option value="all">All cameras</option>
            {cameras.map((item) => (
              <option key={item.camera_id} value={item.camera_id}>
                {isCameraOnline(item) ? "🟢" : "🔴"}{" "}
                {item.name || item.camera_id}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={onClear}>
          <X size={14} aria-hidden="true" />
          Clear filters
        </button>
      </div>
      {loading && <LoadingBanner />}
      {loading ? (
        <div className="alerts-list" aria-label="Loading alerts">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="alert-skeleton" key={index} />
          ))}
        </div>
      ) : type === "known_person" && visibleKnownPeople.length ? (
        <div className="alerts-list" aria-label="Known person detections">
          {visibleKnownPeople.map((alert) => (
            <KnownPersonResult
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedKnown(alert)}
            />
          ))}
        </div>
      ) : alerts.length ? (
        <div className="alerts-list">
          {visibleAlerts.map((alert) => (
            <article
              className={`alert-card ${alert.type}`}
              key={alert.id}
              role="button"
              tabIndex="0"
              onClick={() => setSelected(alert)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setSelected(alert);
              }}
            >
              {alert.image_url && (
                <img
                  className="alert-image"
                  src={alert.image_url}
                  alt="Detection evidence"
                  loading="lazy"
                />
              )}
              <div className="alert-info">
                <h3>{alert.title || typeLabel(alert.type)}</h3>
                <p>
                  {alert.message ||
                    alert.person_name ||
                    alert.vehicle_type ||
                    "Detection recorded"}
                </p>
                <div className="alert-meta">
                  <span>
                    {alert.camera_name ||
                      alert.gate ||
                      alert.camera_id ||
                      "Unknown camera"}
                  </span>
                  {alert.confidence && (
                    <span>
                      {Math.round(alert.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              </div>
              <time className="alert-time">{dateText(alert.time)}</time>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No alerts match the selected filters.</div>
      )}
      {(page > 1 || hasMore) && (
        <nav className="alerts-pagination" aria-label="Alert pages">
          <button
            type="button"
            onClick={() => onPage((value) => Math.max(1, value - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            onClick={() => onPage((value) => value + 1)}
            disabled={!hasMore || loading}
          >
            Next
          </button>
        </nav>
      )}
      <AlertModal alert={selected} onClose={() => setSelected(null)} />
      <KnownPersonModal
        detection={selectedKnown}
        onClose={() => setSelectedKnown(null)}
      />
    </section>
  );
}
function KnownPersonResult({ alert, onClick }) {
  return (
    <article
      className="alert-card known-person-alert"
      role="button"
      tabIndex="0"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {alert.image_url ? (
        <img
          className="alert-image"
          src={alert.image_url}
          alt="Known person detection evidence"
          loading="lazy"
        />
      ) : null}
      <div className="alert-info">
        <h3>{alert.title || typeLabel(alert.type)}</h3>
        <p>{alert.message || alert.person_name || "Detection recorded"}</p>
        <div className="alert-meta">
          <span>Person ID: {alert.person_id || "—"}</span>
          <span>Gate: {alert.gate || "—"}</span>
          <span>
            {alert.camera_name || alert.camera_id || "Unknown camera"}
          </span>
          {alert.confidence != null && (
            <span>{Math.round(alert.confidence * 100)}% confidence</span>
          )}
        </div>
      </div>
      <time className="alert-time">{dateText(alert.time)}</time>
    </article>
  );
}
function KnownPersonModal({ detection, onClose }) {
  if (!detection) return null;
  const name = detection.person_name || "Known person";
  const details = [
    ["Detection ID", detection.id || "—"],
    ["Person ID", detection.person_id || "—"],
    ["Gate", detection.gate || "—"],
    ["Camera", detection.camera_name || detection.camera_id || "—"],
    ["Detected", dateText(detection.time)],
    [
      "Confidence",
      detection.confidence == null
        ? "—"
        : `${Math.round(detection.confidence * 100)}%`,
    ],
  ];
  return (
    <div className="registration-overlay" role="presentation" onClick={onClose}>
      <article
        className="registration-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Known person detection details"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="registration-close"
          type="button"
          onClick={onClose}
          aria-label="Close known person details"
        >
          <X size={19} aria-hidden="true" />
        </button>
        <div className="registration-detail">
          <div>
            {detection.image_url ? (
              <img
                className="registration-primary-photo"
                src={detection.image_url}
                alt={`Detection image of ${name}`}
              />
            ) : (
              <div className="registration-no-photo">NO IMAGE</div>
            )}
          </div>
          <div>
            <p className="eyebrow">KNOWN PERSON DETECTED</p>
            <h2>{name}</h2>
            <Facts details={details} />
          </div>
        </div>
      </article>
    </div>
  );
}
function AlertModal({ alert, onClose }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => setZoom(1), [alert?.id]);
  if (!alert) return null;
  const details = [
    [
      "Camera",
      alert.camera_name || alert.gate || alert.camera_id || "Unknown camera",
    ],
    ["Time", dateText(alert.time)],
    ["Detection type", typeLabel(alert.type)],
    [
      "Confidence",
      alert.confidence ? `${Math.round(alert.confidence * 100)}%` : "—",
    ],
  ];
  return (
    <div className="registration-overlay" role="presentation" onClick={onClose}>
      <article
        className="registration-dialog alert-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Alert details"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="registration-close"
          type="button"
          onClick={onClose}
          aria-label="Close alert details"
        >
          <X size={19} aria-hidden="true" />
        </button>
        <div className="alert-detail-layout">
          <div className="alert-detail-media">
            {alert.image_url ? (
              <div className="alert-image-viewer">
                <div className="alert-image-viewport">
                  <img
                    className="alert-detail-image"
                    src={alert.image_url}
                    alt="Detection evidence"
                    style={{ transform: `scale(${zoom})` }}
                    onWheel={(event) => {
                      event.preventDefault();
                      setZoom((value) =>
                        Math.min(2.5, Math.max(1, value - event.deltaY * 0.002)),
                      );
                    }}
                    onDoubleClick={() => setZoom((value) => (value === 1 ? 2.5 : 1))}
                  />
                </div>
              </div>
            ) : (
              <div className="alert-detail-no-image">NO IMAGE</div>
            )}
          </div>
          <div className="alert-detail-content">
            <p className="eyebrow">SECURITY EVENT</p>
            <h2>{alert.title || typeLabel(alert.type)}</h2>
            <p className="designation">
              {alert.message ||
                alert.person_name ||
                alert.vehicle_type ||
                "Detection recorded"}
            </p>
            <Facts details={details} />
          </div>
        </div>
      </article>
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
