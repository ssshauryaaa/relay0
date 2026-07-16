import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { StatusService } from "../services/StatusService";
import {
  IconCircleCheck,
  IconAlertTriangle,
  IconHelpCircle,
  IconChevronDown,
  IconChevronUp,
  IconRss
} from "@tabler/icons-react";
const STATUS_CONFIG = {
  safe: {
    label: "Safe",
    class: "sb-large-btn-safe",
    badgeClass: "sb-badge-safe",
    icon: IconCircleCheck,
  },
  help: {
    label: "Need Help",
    class: "sb-large-btn-help",
    badgeClass: "sb-badge-help",
    icon: IconAlertTriangle,
  },
  unknown: {
    label: "Unknown",
    class: "sb-large-btn-unknown",
    badgeClass: "sb-badge-unknown",
    icon: IconHelpCircle,
  }
};
export default function StatusButton({ peers, self, onUpdateStatus }) {
  const ownUser = peers.find((p) => p.username === self?.username);
  const ownStatus = {
    status: ownUser?.crisisStatus || "unknown",
    note: ownUser?.statusNote || "",
    timestamp: ownUser?.lastSeen || Date.now() / 1000,
  };

  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(ownStatus.status);
  const [note, setNote] = useState(ownStatus.note);
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
    if (!isOpen) {
      setSelectedStatus(ownStatus.status);
      setNote(ownStatus.note);
    }
  }, [ownStatus.status, ownStatus.note, isOpen]);

  const handleBroadcast = () => {
    onUpdateStatus(selectedStatus, note);
    setIsOpen(false);
  };
  const statusInfo = STATUS_CONFIG[ownStatus.status] || STATUS_CONFIG.unknown;
  const ActiveIcon = statusInfo.icon;
  return (
    <motion.div
      ref={cardRef}
      className="sb-card"
      style={{
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
      <h2 className="sb-card-title">
        <IconRss size={13} />
        My Broadcast Status
      </h2>
      <button
        type="button"
        className={`sb-large-btn ${statusInfo.class}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <ActiveIcon size={20} />
        <span>Status: {statusInfo.label}</span>
        <div style={{ flex: 1 }} />
        {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="sb-inline-panel">
          <div className="sb-options-row">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const OptIcon = config.icon;
              const isActive = selectedStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`sb-option-btn sb-opt-${key} ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedStatus(key)}
                  aria-pressed={isActive}
                >
                  <OptIcon size={18} />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
          <textarea
            className="sb-textarea"
            placeholder="Add optional note (e.g. current coordinates, supply needs...)"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            maxLength={140}
            rows={3}
            aria-label="Status note"
          />
          <div className="sb-textarea-footer">
            <span className="sb-counter">{140 - note.length} characters left</span>
            <button
              type="button"
              className="sb-broadcast-submit"
              onClick={handleBroadcast}
            >
              Broadcast Status
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
export { STATUS_CONFIG };
