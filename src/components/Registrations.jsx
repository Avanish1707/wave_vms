import { useState } from "react";
import { Search, X } from "lucide-react";
import { dateText } from "../utils/detection.js";
import { Facts, LoadingBanner } from "./Shared.jsx";

export default function Registrations({ people, search, onSearch, loading }) {
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
            <article
              className="person-card"
              key={person.registration_id}
              role="button"
              tabIndex="0"
              onClick={() => setSelected(person)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setSelected(person);
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
                <p className="designation">
                  {person.designation || "No designation"}
                </p>
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
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {search
            ? "No registered people match your search."
            : "No registered people found."}
        </div>
      )}
      {selected && (
        <RegistrationDetail
          person={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function RegistrationDetail({ person, onClose }) {
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