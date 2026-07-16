import { useState, useEffect, useCallback } from "react";
import "./CountdownTimers.css";
import { IconClock, IconTrash, IconX } from "@tabler/icons-react";

const PRESETS = [
  { label: "5 min",  seconds: 5 * 60 },
  { label: "10 min", seconds: 10 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "30 min", seconds: 30 * 60 },
  { label: "1 hr",   seconds: 60 * 60 },
];

function formatCountdown(secondsLeft) {
  if (secondsLeft <= 0) return "00:00";
  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getSecondsLeft(endsAt) {
  return Math.max(0, endsAt - Date.now() / 1000);
}

function chipClass(secondsLeft) {
  if (secondsLeft <= 0) return "critical";
  if (secondsLeft <= 60) return "critical";
  if (secondsLeft <= 5 * 60) return "warning";
  return "";
}

function TimerCard({ timer, onDelete, onExpire }) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(timer.endsAt));

  useEffect(() => {
    const tick = setInterval(() => {
      const left = getSecondsLeft(timer.endsAt);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        onExpire(timer.id);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [timer.endsAt, timer.id, onExpire]);

  const cls = chipClass(secondsLeft);

  return (
    <div className={`ct-timer-card ${cls}`}>
      <div className="ct-timer-clock">{formatCountdown(secondsLeft)}</div>
      <div className="ct-timer-info">
        <div className="ct-timer-label">{timer.label}</div>
        <div className="ct-timer-meta">set by {timer.createdBy || timer.created_by}</div>
      </div>
      <button type="button" className="ct-timer-del" onClick={() => onDelete(timer.id)} title="Cancel timer">
        <IconTrash size={13} />
      </button>
    </div>
  );
}

function ExpiredOverlay({ label, onDismiss }) {
  return (
    <div className="ct-expired-overlay">
      <div className="ct-expired-card">
        <IconClock size={36} style={{ color: "var(--red,#ff3b3b)" }} />
        <div className="ct-expired-label">Timer expired</div>
        <h2 className="ct-expired-title">{label}</h2>
        <p className="ct-expired-sub">This scheduled window has ended. All nodes have been notified.</p>
        <button type="button" className="ct-expired-dismiss" onClick={onDismiss}>
          Acknowledge
        </button>
      </div>
    </div>
  );
}

export function TimerPersistentBar({ timers }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!timers || timers.length === 0) return null;

  return (
    <div className="ct-persistent-bar">
      <IconClock size={11} style={{ color: "var(--teal,#0ef0fb)", flexShrink: 0 }} />
      {timers.map((t) => {
        const left = getSecondsLeft(t.endsAt ?? t.ends_at);
        const cls = chipClass(left);
        return (
          <span key={t.id} className={`ct-bar-chip ${cls}`}>
            <span className="ct-bar-label">{t.label}</span>
            <span className="ct-bar-time">{formatCountdown(left)}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function CountdownTimersView({ timers, self, onCreateTimer, onDeleteTimer, onExpireTimer }) {
  const [label, setLabel] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customMins, setCustomMins] = useState("");
  const [expiredTimer, setExpiredTimer] = useState(null);

  const handleExpire = useCallback((id) => {
    const t = timers.find((x) => x.id === id);
    if (t) setExpiredTimer(t);
    onExpireTimer(id);
  }, [timers, onExpireTimer]);

  function getDurationSeconds() {
    if (selectedPreset !== null) return PRESETS[selectedPreset].seconds;
    const mins = parseFloat(customMins);
    if (!isNaN(mins) && mins > 0) return Math.round(mins * 60);
    return null;
  }

  function handleCreate(e) {
    e.preventDefault();
    const dur = getDurationSeconds();
    if (!label.trim() || !dur || !self) return;
    onCreateTimer(label.trim(), dur);
    setLabel("");
    setSelectedPreset(null);
    setCustomMins("");
  }

  const dur = getDurationSeconds();
  const canCreate = label.trim() && dur && self;

  return (
    <>
      {expiredTimer && (
        <ExpiredOverlay
          label={expiredTimer.label}
          onDismiss={() => setExpiredTimer(null)}
        />
      )}

      <div className="ct-page">
        <div className="ct-field-beam" aria-hidden>
          <div className="ct-beam ct-beam-a" />
          <div className="ct-beam ct-beam-b" />
        </div>

        <div className="ct-header">
          <IconClock size={14} style={{ color: "var(--teal,#0ef0fb)", flexShrink: 0 }} />
          <span className="ct-header-title">Countdown Timers</span>
        </div>

        <div className="ct-body">
          <div>
            <div className="ct-section-label">Create timer</div>
            <form className="ct-create-form" onSubmit={handleCreate}>
              <div className="ct-input-row">
                <input
                  className="ct-input"
                  type="text"
                  placeholder="Timer label (e.g. Evacuation window closes)…"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div className="ct-section-label" style={{ marginBottom: 6 }}>Duration</div>
              <div className="ct-dur-row">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`ct-dur-preset ${selectedPreset === i ? "active" : ""}`}
                    onClick={() => { setSelectedPreset(i); setCustomMins(""); }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="ct-dur-custom-row">
                <input
                  className="ct-input ct-dur-input"
                  type="number"
                  min="1"
                  max="1440"
                  placeholder="—"
                  value={customMins}
                  onChange={(e) => { setCustomMins(e.target.value); setSelectedPreset(null); }}
                />
                <span className="ct-dur-unit">minutes (custom)</span>
              </div>
              <button type="submit" className="ct-create-btn" disabled={!canCreate}>
                Start Timer — broadcast to all nodes
              </button>
            </form>
          </div>

          <div>
            <div className="ct-section-label">Active timers ({timers.length})</div>
            <div className="ct-timers-list">
              {timers.length === 0 ? (
                <div className="ct-empty">
                  <IconClock size={28} style={{ opacity: 0.2 }} />
                  <h3 className="ct-empty-title">No active timers</h3>
                  <p className="ct-empty-desc">Create a timer above to broadcast a shared countdown to all nodes in the mesh.</p>
                </div>
              ) : (
                timers.map((t) => (
                  <TimerCard
                    key={t.id}
                    timer={{ ...t, endsAt: t.endsAt ?? t.ends_at, createdBy: t.createdBy ?? t.created_by }}
                    onDelete={onDeleteTimer}
                    onExpire={handleExpire}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
