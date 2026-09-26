import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  ALERT_PAGE_SIZE,
  detectionTypes,
  dateText,
  normalizeDetectionType,
  typeLabel,
} from "../utils/detection.js";
import { AlertModal, Facts, LoadingBanner } from "./Shared.jsx";

export default function Alerts({
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
  isCameraOnline,
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
                {isCameraOnline(item) ? "🟢" : "🔴"} {item.name || item.camera_id}
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
                    <span>{Math.round(alert.confidence * 100)}% confidence</span>
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
          <span>{alert.camera_name || alert.camera_id || "Unknown camera"}</span>
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