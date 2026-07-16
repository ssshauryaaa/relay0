import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { StatusService } from "../services/StatusService";
import { STATUS_CONFIG } from "./StatusButton";
import {
  IconActivity,
  IconRadioOff
} from "@tabler/icons-react";

function formatRelativeTime(ts) {
  if (!ts) return "";
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 5) return "just now";
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  const mins = diff / 60;
  if (mins < 60) return `${Math.floor(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  const days = hrs / 24;
  return `${Math.floor(days)}d ago`;
}

export default function StatusFeed({ peers, self }) {
  const [contacts, setContacts] = useState(StatusService.getContacts());
  const [tick, setTick] = useState(0);
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function handleMouseMove(e) {
    const r = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -8;
    setTilt({ x, y, active: true });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  useEffect(() => {
    const handleUpdate = () => setContacts(StatusService.getContacts());
    return StatusService.subscribeToUpdates(handleUpdate);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const watchedNames = new Set(contacts.map((c) => c.name));

  const feed = (peers || [])
    .filter(
      (p) =>
        p.username !== self?.username && watchedNames.has(p.username)
    )
    .map((p) => ({
      name: p.username,
      status: p.crisisStatus || "unknown",
      note: p.statusNote || "",
      timestamp: p.lastSeen || 0,
      online: p.status === "online",
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <motion.div
      ref={cardRef}
      className="sb-card"
      style={{
        flex: 1,
        transform: tilt.active
          ? `perspective(800px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.015)`
          : "perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)",
        transition: tilt.active ? "transform 0.08s ease-out" : "transform 0.3s ease-out",
        borderColor: tilt.active ? "rgba(14,240,251,0.2)" : undefined,
        boxShadow: tilt.active
          ? "0 12px 30px rgba(0,0,0,0.5), 0 0 20px rgba(14,240,251,0.06)"
          : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sb-feed-header">
        <h2 className="sb-card-title" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <IconActivity size={13} />
          Contact Status Feed
        </h2>
      </div>
      <div style={{ borderBottom: "1px solid var(--sb-panel-border)", margin: "-6px 0 4px 0" }} />
      <div className="sb-feed-container">
        {feed.length === 0 ? (
          <div className="sb-empty">
            <IconRadioOff size={24} style={{ color: "var(--sb-text-dim)" }} />
            <h3 className="sb-empty-title">Feed is empty</h3>
            <p className="sb-empty-desc">
              {watchedNames.size === 0
                ? "Add contacts from the Monitored Contacts panel to track their status."
                : "None of your monitored contacts are currently online or have broadcast a status."}
            </p>
          </div>
        ) : (
          feed.map((entry) => {
            const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.unknown;
            const StatusIcon = config.icon;
            return (
              <div key={entry.name} className="sb-feed-item">
                <div className="sb-feed-item-header">
                  <span className="sb-feed-name">
                    {entry.name}
                    {entry.online && (
                      <span
                        style={{
                          display: "inline-block",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--teal)",
                          boxShadow: "0 0 4px var(--teal)",
                          marginLeft: "6px",
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                  </span>
                  <div className={`sb-badge ${config.badgeClass}`}>
                    <StatusIcon size={12} />
                    <span>{config.label}</span>
                  </div>
                </div>
                {entry.note && <p className="sb-feed-note">"{entry.note}"</p>}
                <span className="sb-feed-time">{formatRelativeTime(entry.timestamp)}</span>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
