import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  currentDateInput,
  dateText,
  detectionDateAndHour,
  REPORT_PAGE_SIZE,
  reportTimeSlots,
  typeLabel,
} from "../utils/detection.js";
import { AlertModal } from "./Shared.jsx";

export default function Reports({ host, reload }) {
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
        <div className="empty-state">
          No alerts found for this date and time slot.
        </div>
      )}
      <AlertModal alert={selected} onClose={() => setSelected(null)} />
    </section>
  );
}