import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { dateText, typeLabel } from "../utils/detection.js";

export function LoadingBanner() {
  return (
    <div className="loading-banner" role="status" aria-live="polite">
      <RefreshCw className="loading-spin" size={15} aria-hidden="true" />
      <span>Reloading portal data…</span>
    </div>
  );
}

export function Facts({ details }) {
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

export function AlertModal({ alert, onClose }) {
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
                    onDoubleClick={() =>
                      setZoom((value) => (value === 1 ? 2.5 : 1))
                    }
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