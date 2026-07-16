import { useState, useRef, useEffect } from "react";
import "./IncidentLog.css";
import {
  IconClipboardList,
  IconDownload,
  IconAlertTriangle,
  IconAlertOctagon,
  IconInfoCircle,
  IconFlame,
} from "@tabler/icons-react";

const SEVERITIES = ["LOW", "MED", "HIGH", "CRITICAL"];

const SEV_ICON = {
  LOW: <IconInfoCircle size={11} />,
  MED: <IconAlertTriangle size={11} />,
  HIGH: <IconAlertOctagon size={11} />,
  CRITICAL: <IconFlame size={11} />,
};

function relativeTime(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const m = diff / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTs(ts) {
  return new Date(ts * 1000).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function IncidentLog({ incidents, self, onPost }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [incidents]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !self) return;
    onPost(title.trim(), body.trim(), severity);
    setTitle("");
    setBody("");
    setSeverity("LOW");
  }

  function handleExport() {
    const lines = incidents.map((entry, i) =>
      [
        `[${String(i + 1).padStart(3, "0")}] [${entry.severity.padEnd(8)}] [${formatTs(entry.timestamp)}] by ${entry.from}`,
        `TITLE: ${entry.title}`,
        entry.body ? `NOTES: ${entry.body}` : null,
        "---",
      ]
        .filter(Boolean)
        .join("\n")
    );
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relay-incident-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="il-page">
      <div className="il-field-beam" aria-hidden>
        <div className="il-beam il-beam-a" />
        <div className="il-beam il-beam-b" />
      </div>

      <div className="il-header">
        <IconClipboardList size={14} style={{ color: "var(--teal, #0ef0fb)", flexShrink: 0 }} />
        <span className="il-header-title">Incident Log</span>
        <span className="il-badge">{incidents.length} entries</span>
      </div>

      <div className="il-body" style={{ position: "relative", zIndex: 1 }}>
        <div className="il-feed">
          <div className="il-feed-scroll">
            {incidents.length === 0 ? (
              <div className="il-empty">
                <IconClipboardList size={28} style={{ opacity: 0.2 }} />
                <h3 className="il-empty-title">Log is clear</h3>
                <p className="il-empty-desc">Post the first entry to start the mission record. All entries are append-only and synced to all nodes.</p>
              </div>
            ) : (
              incidents.map((entry, i) => (
                <div key={entry.id} className="il-entry">
                  <div className="il-entry-num">{String(i + 1).padStart(3, "0")}</div>
                  <div className="il-entry-main">
                    <div className="il-entry-top">
                      <span className={`il-severity il-sev-${entry.severity}`}>
                        {SEV_ICON[entry.severity]} {entry.severity}
                      </span>
                      <span className="il-entry-title">{entry.title}</span>
                    </div>
                    <div className="il-entry-meta">
                      <span>{entry.from}</span>
                      <span>·</span>
                      <span>{relativeTime(entry.timestamp)}</span>
                    </div>
                    {entry.body && <div className="il-entry-body">{entry.body}</div>}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {incidents.length > 0 && (
            <button type="button" className="il-export-btn" onClick={handleExport}>
              <IconDownload size={11} /> Export Report
            </button>
          )}
        </div>

        <div className="il-composer">
          <div className="il-composer-header">New Entry</div>
          <form className="il-composer-body" onSubmit={handleSubmit}>
            <div className="il-field">
              <label>Severity</label>
              <div className="il-sev-btns">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`il-sev-btn ${severity === s ? `active ${s}` : ""}`}
                    onClick={() => setSeverity(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="il-field">
              <label>Title *</label>
              <input
                className="il-input"
                type="text"
                placeholder="Brief summary of the event…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="il-field">
              <label>Notes (optional)</label>
              <textarea
                className="il-input il-textarea"
                placeholder="Additional context, actions taken, resources involved…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
              />
            </div>
            <button
              type="submit"
              className="il-submit-btn"
              disabled={!title.trim() || !self}
            >
              Log Entry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
