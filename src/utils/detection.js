export const ALERT_PAGE_SIZE = 25;
export const REPORT_PAGE_SIZE = 25;
export const reportTimeSlots = [
  { label: "12:00 AM - 03:00 AM", start: 0, end: 3 },
  { label: "03:00 AM - 06:00 AM", start: 3, end: 6 },
  { label: "06:00 AM - 09:00 AM", start: 6, end: 9 },
  { label: "09:00 AM - 12:00 PM", start: 9, end: 12 },
  { label: "12:00 PM - 03:00 PM", start: 12, end: 15 },
  { label: "03:00 PM - 06:00 PM", start: 15, end: 18 },
  { label: "06:00 PM - 09:00 PM", start: 18, end: 21 },
  { label: "09:00 PM - 12:00 AM", start: 21, end: 24 },
];

export const currentDateInput = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const detectionDateAndHour = (value) => {
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

export const detectionTypes = [
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

export const normalizeDetectionType = (type) =>
  type === "object_theft_detected" ? "object_theft" : type;

export const typeLabel = (type) =>
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

export const dateText = (value) => {
  if (!value) return "—";
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date)
    ? String(value)
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

export const isCameraOnline = (camera) => {
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
};