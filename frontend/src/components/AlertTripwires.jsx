import { useState } from "react";
import "./AlertTripwires.css";
import { IconBell, IconAlertTriangle, IconX } from "@tabler/icons-react";

export function TripwireAlertBanner({ alert, onDismiss }) {
  if (!alert) return null;
  return (
    <div className="at-banner" role="alert">
      <IconAlertTriangle size={20} className="at-banner-icon" />
      <div className="at-banner-body">
        <div className="at-banner-label">
          ⚠ Tripwire triggered — keyword match
          <span className="at-banner-keyword">{alert.keyword}</span>
        </div>
        <div className="at-banner-from">
          from <strong>{alert.from}</strong>
        </div>
        <div className="at-banner-text">"{alert.text}"</div>
      </div>
      <button type="button" className="at-dismiss" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}

export default function AlertTripwiresView({ watchlist, onSetWatchlist }) {
  const [input, setInput] = useState("");

  function addKeyword() {
    const kw = input.trim().toLowerCase();
    if (!kw || watchlist.includes(kw)) {
      setInput("");
      return;
    }
    onSetWatchlist([...watchlist, kw]);
    setInput("");
  }

  function removeKeyword(kw) {
    onSetWatchlist(watchlist.filter((w) => w !== kw));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  }

  return (
    <div className="at-page">
      <div className="at-field-beam" aria-hidden>
        <div className="at-beam at-beam-a" />
        <div className="at-beam at-beam-b" />
      </div>

      <div className="at-header">
        <IconBell size={14} style={{ color: "var(--amber, #f5a623)", flexShrink: 0 }} />
        <span className="at-header-title">Alert Tripwires</span>
      </div>

      <div className="at-body">
        <div>
          <div className="at-section-label">Add watch word</div>
          <div className="at-add-row">
            <input
              className="at-add-input"
              type="text"
              placeholder="e.g. fire, evacuate, help…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
            />
            <button
              type="button"
              className="at-add-btn"
              onClick={addKeyword}
              disabled={!input.trim()}
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <div className="at-section-label">Active watch words ({watchlist.length})</div>
          <div className="at-chips">
            {watchlist.length === 0 ? (
              <span className="at-empty-chips">No keywords set — all messages pass through silently.</span>
            ) : (
              watchlist.map((kw) => (
                <span key={kw} className="at-chip">
                  {kw}
                  <button
                    type="button"
                    className="at-chip-remove"
                    onClick={() => removeKeyword(kw)}
                    title={`Remove "${kw}"`}
                  >
                    <IconX size={10} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="at-info">
          When any incoming message (channel, DM, or broadcast) contains a watch word, a banner alert fires and a tone plays — even if you're on a different view. Watch words are stored locally in your browser and never sent to the server.
        </div>
      </div>
    </div>
  );
}
