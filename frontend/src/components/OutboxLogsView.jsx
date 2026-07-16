import { useEffect, useRef } from "react";
import "./OutboxLogs.css";
import {
  IconInbox,
  IconTerminal2,
  IconArrowUp,
  IconTrash,
  IconRefresh,
  IconDownload,
  IconRadioOff,
  IconServer,
  IconDeviceMobile,
} from "@tabler/icons-react";
function formatTs(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function relativeTime(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const m = diff / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
function LocalQueuePanel({ localOutbox, onDiscard, onPrioritize, connected }) {
  return (
    <div className="ol-panel">
      <div className="ol-panel-header">
        <span className="ol-panel-title">
          <IconDeviceMobile size={12} />
          Local Buffer
        </span>
        <span className="ol-header-badge" style={{ fontSize: "8px" }}>
          {localOutbox.length} item{localOutbox.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="ol-scroll">
        {localOutbox.length === 0 ? (
          <div className="ol-empty">
            <IconRadioOff size={22} className="ol-empty-icon" />
            <h3 className="ol-empty-title">Local queue empty</h3>
            <p className="ol-empty-desc">
              Messages sent while offline will appear here and auto-flush on reconnect.
            </p>
          </div>
        ) : (
          <>
            <div className="ol-section-label">Buffered — awaiting link</div>
            {localOutbox.map((item) => (
              <div key={item._bufferedAt} className="ol-queue-item">
                <div className="ol-queue-item-row">
                  <span className="ol-queue-to">→ {item.to}</span>
                  <span className="ol-queue-badge">QUEUED</span>
                  <span className="ol-queue-time">{relativeTime(item._bufferedAt)}</span>
                </div>
                <span className="ol-queue-text">{item.text}</span>
                <div className="ol-queue-item-btns">
                  <button
                    type="button"
                    className="ol-queue-btn priority"
                    onClick={() => onPrioritize(item._bufferedAt)}
                    title="Move to top of send queue"
                  >
                    <IconArrowUp size={9} /> Prioritize
                  </button>
                  <button
                    type="button"
                    className="ol-queue-btn discard"
                    onClick={() => onDiscard(item._bufferedAt)}
                    title="Discard this message"
                  >
                    <IconTrash size={9} /> Discard
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
function ServerQueuePanel({ serverOutbox, onDelete, onRefresh }) {
  return (
    <div className="ol-panel">
      <div className="ol-panel-header">
        <span className="ol-panel-title">
          <IconServer size={12} />
          Relay Server Queue
        </span>
        <div className="ol-panel-actions">
          <button type="button" className="ol-action-btn" onClick={onRefresh} title="Refresh server outbox">
            <IconRefresh size={10} /> Refresh
          </button>
        </div>
      </div>
      <div className="ol-scroll">
        {serverOutbox.length === 0 ? (
          <div className="ol-empty">
            <IconRadioOff size={22} className="ol-empty-icon" />
            <h3 className="ol-empty-title">Server queue clear</h3>
            <p className="ol-empty-desc">
              No pending DMs in the relay database. Hit Refresh to check for undelivered transmissions.
            </p>
          </div>
        ) : (
          <>
            <div className="ol-section-label">Awaiting recipient</div>
            {serverOutbox.map((msg) => (
              <div key={msg.id} className="ol-queue-item">
                <div className="ol-queue-item-row">
                  <span className="ol-queue-to">→ {msg.to_user}</span>
                  <span className="ol-queue-badge">PENDING</span>
                  <span className="ol-queue-time">{relativeTime(msg.timestamp)}</span>
                </div>
                <span className="ol-queue-text">{msg.text}</span>
                <div className="ol-queue-item-btns">
                  <button
                    type="button"
                    className="ol-queue-btn discard"
                    onClick={() => onDelete(msg.id)}
                    title="Cancel and delete this transmission"
                  >
                    <IconTrash size={9} /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
function LogPanel({ connectionLogs }) {
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [connectionLogs]);
  const handleExport = () => {
    const lines = connectionLogs
      .map((l) => `[${formatTs(l.timestamp)}] [${l.type.toUpperCase().padEnd(10)}] ${l.text}`)
      .join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relay-diagnostics-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="ol-panel" style={{ gridColumn: "span 1" }}>
      <div className="ol-panel-header">
        <span className="ol-panel-title">
          <IconTerminal2 size={12} />
          Connection Log
        </span>
        <div className="ol-panel-actions">
          <button type="button" className="ol-action-btn" onClick={handleExport} title="Export logs as .log file">
            <IconDownload size={10} /> Export
          </button>
        </div>
      </div>
      <div className="ol-log-terminal">
        <div className="ol-log-lines">
          {connectionLogs.length === 0 ? (
            <div className="ol-empty" style={{ paddingTop: "40px" }}>
              <IconTerminal2 size={20} className="ol-empty-icon" />
              <h3 className="ol-empty-title">No events yet</h3>
              <p className="ol-empty-desc">Connection events will appear here in real time.</p>
            </div>
          ) : (
            connectionLogs.map((log, i) => (
              <div key={i} className="ol-log-line">
                <span className="ol-log-ts">{formatTs(log.timestamp)}</span>
                <span className={`ol-log-tag ${log.type}`}>{log.type}</span>
                <span className="ol-log-text">{log.text}</span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
export default function OutboxLogsView({
  connected,
  localOutbox,
  serverOutbox,
  connectionLogs,
  fetchServerOutbox,
  deleteServerOutboxMessage,
  discardLocalOutboxMessage,
  prioritizeLocalOutboxMessage,
}) {
  const totalPending = localOutbox.length + serverOutbox.length;
  return (
    <div className="ol-page">
      {}
      <div className="ol-field" aria-hidden="true">
        <div className="ol-field-beam ol-field-beam-a" />
        <div className="ol-field-beam ol-field-beam-b" />
      </div>
      <div className="ol-header">
        <IconInbox size={14} style={{ color: "var(--ol-teal)", flexShrink: 0 }} />
        <span className="ol-header-title">Outbox &amp; Diagnostics</span>
        <span className={`ol-header-badge ${connected ? "" : "offline"}`}>
          {connected ? "LINKED" : "OFFLINE"}
        </span>
        {totalPending > 0 && (
          <span className="ol-header-badge" style={{ marginLeft: 4, borderColor: "rgba(245,166,35,0.3)", background: "rgba(245,166,35,0.08)", color: "var(--ol-amber)" }}>
            {totalPending} PENDING
          </span>
        )}
      </div>
      <div className="ol-body" style={{ position: "relative", zIndex: 1 }}>
        {}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--ol-border)", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", borderBottom: "1px solid var(--ol-border)" }}>
            <LocalQueuePanel
              localOutbox={localOutbox}
              connected={connected}
              onDiscard={discardLocalOutboxMessage}
              onPrioritize={prioritizeLocalOutboxMessage}
            />
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <ServerQueuePanel
              serverOutbox={serverOutbox}
              onDelete={deleteServerOutboxMessage}
              onRefresh={fetchServerOutbox}
            />
          </div>
        </div>
        {}
        <LogPanel connectionLogs={connectionLogs} />
      </div>
    </div>
  );
}
