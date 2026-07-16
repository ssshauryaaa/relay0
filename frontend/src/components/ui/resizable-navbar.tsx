"use client";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import React, { useRef, useState } from "react";
import {
  IconRadio,
  IconActivity,
  IconBell,
  IconVolume,
  IconVolumeOff,
  IconSettings,
} from "@tabler/icons-react";
import { audioManager } from "../../utils/audio.js";

export const Navbar = ({ children, className }) => {
  const ref = useRef(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > 40);
  });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        width: "100%",
        pointerEvents: "none", // Click-through to background main panel if clicking outside navbar
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { visible })
            : child
        )}
      </div>
    </motion.div>
  );
};

export const NavBody = ({ children, visible, className }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: "blur(16px)",
        boxShadow: visible
          ? "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(34,211,238,0.1), 0 4px 20px rgba(0,0,0,0.3)",
        background: visible ? "rgba(10,14,23,0.95)" : "rgba(10,14,23,0.85)",
        borderRadius: "16px",
        width: visible ? "90%" : "95%",
        y: 12,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      style={{
        position: "relative",
        zIndex: 60,
        margin: "0 auto",
        maxWidth: "1400px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 24px",
      }}
      className={`relay-nav-desktop ${className || ""}`}
    >
      {children}
    </motion.div>
  );
};

export const NavItems = ({ items }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        pointerEvents: "none",
      }}
    >
      {items.map((item, idx) => (
        <a
          key={`nav-${idx}`}
          href={item.link}
          onClick={item.onClick}
          onMouseEnter={() => setHovered(idx)}
          style={{
            position: "relative",
            padding: "8px 16px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: item.active ? "var(--teal)" : "var(--text-dim)",
            textDecoration: "none",
            pointerEvents: "auto",
            transition: "color 0.15s ease",
            cursor: "pointer",
          }}
        >
          {hovered === idx && (
            <motion.div
              layoutId="relay-nav-hover"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: "6px",
                background: "rgba(34,211,238,0.07)",
                border: "1px solid rgba(34,211,238,0.15)",
              }}
            />
          )}
          {item.active && (
            <motion.div
              layoutId="relay-nav-active"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                height: "2px",
                width: "16px",
                borderRadius: "999px",
                background: "var(--teal)",
                boxShadow: "0 0 8px var(--teal)",
              }}
            />
          )}
          <span style={{ position: "relative", zIndex: 2 }}>{item.name}</span>
        </a>
      ))}
    </div>
  );
};

export const MobileNav = ({ children, visible, className }) => {
  return (
    <motion.div
      animate={{
        backdropFilter: "blur(16px)",
        background: visible ? "rgba(10,14,23,0.95)" : "rgba(10,14,23,0.85)",
        boxShadow: "0 0 0 1px rgba(34,211,238,0.15), 0 8px 32px rgba(0,0,0,0.4)",
        borderRadius: "12px",
        width: "92%",
        y: 12,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 50 }}
      style={{
        position: "relative",
        zIndex: 50,
        margin: "0 auto",
        display: "none",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
      }}
      className={`relay-nav-mobile ${className || ""}`}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({ children }) => {
  return (
    <div style={{ display: "flex", width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      {children}
    </div>
  );
};

export const MobileNavMenu = ({ children, isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            position: "absolute",
            top: "56px",
            left: 0,
            right: 0,
            zIndex: 50,
            display: "flex",
            width: "100%",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(34,211,238,0.15)",
            background: "rgba(10,14,23,0.97)",
            padding: "20px 16px",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            backdropFilter: "blur(20px)",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: isOpen ? "var(--teal)" : "var(--text-dim)",
      }}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {isOpen ? (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        ) : (
          <>
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </>
        )}
      </svg>
    </button>
  );
};

export const NavbarLogo = ({ username, connected, onClick }) => {
  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="var(--violet)" style={{ filter: "drop-shadow(0 0 4px var(--violet))" }} />
        <circle cx="12" cy="12" r="7" stroke="var(--violet)" strokeWidth="1" strokeOpacity="0.5" fill="none" />
        <circle cx="12" cy="12" r="11" stroke="var(--violet)" strokeWidth="0.6" strokeOpacity="0.2" fill="none" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 900, letterSpacing: "0.16em",
          fontSize: "15px", color: "var(--violet)", textShadow: "var(--glow-violet)",
        }}>
          RELAY
        </span>
        {username && (
          <span style={{ fontSize: "9px", letterSpacing: "0.14em", fontFamily: "var(--font-mono)", color: "var(--text-faint)" }}>
            {connected ? "●" : "○"} {username}
          </span>
        )}
      </div>
    </div>
  );
};

export const NavbarButton = ({ as: Tag = "button", children, variant = "primary", className, ...props }) => {
  const variants = {
    primary: { background: "var(--teal)", color: "var(--bg)", fontWeight: "bold", boxShadow: "var(--glow-teal)" },
    secondary: { background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)" },
    danger: { background: "var(--red)", color: "white", fontWeight: "bold", boxShadow: "var(--glow-red)" },
    ghost: { background: "transparent", color: "var(--text-dim)" },
  };

  return (
    <Tag
      className={className}
      style={{
        padding: "6px 14px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        border: "none",
        transition: "opacity 0.15s ease",
        ...variants[variant],
      }}
      {...props}
    >
      {children}
    </Tag>
  );
};

export const TransceiverDashboard = ({
  open,
  frequency,
  onFrequencyChange,
  pingActive,
  onTriggerPing,
  pingLog,
  onlineCount,
  signal,
  connected,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 22 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "absolute",
            top: "100%",
            left: "5%",
            right: "5%",
            margin: "0 auto",
            maxWidth: "1400px",
            background: "rgba(10, 14, 23, 0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(34, 211, 238, 0.2)",
            borderRadius: "16px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05)",
            padding: "24px",
            zIndex: 40,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Column 1: Tuning dials & lock status */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border-soft)", paddingBottom: "10px" }}>
              <IconRadio size={18} style={{ color: "var(--teal)" }} />
              <span className="field-label" style={{ color: "var(--teal)", fontSize: "11px", letterSpacing: "0.15em", fontWeight: 700 }}>
                TRANSCEIVER FREQUENCY TUNER
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                <span style={{ color: "var(--text-faint)" }}>BANDWIDTH FREQ:</span>
                <span style={{ color: "var(--teal)", fontWeight: "bold", textShadow: "var(--glow-teal)" }}>
                  {frequency.toFixed(3)} MHz
                </span>
              </div>
              <input
                type="range"
                min="140.000"
                max="150.000"
                step="0.025"
                value={frequency}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onFrequencyChange(val);
                  if (audioManager && audioManager.playKeystroke) {
                    audioManager.playKeystroke();
                  }
                }}
                style={{
                  width: "100%",
                  accentColor: "var(--teal)",
                  background: "var(--bg-raised)",
                  height: "6px",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                <span>140.000 MHz (VHF)</span>
                <span>150.000 MHz</span>
              </div>
            </div>

            {/* Signal lock diagnostic meter */}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-soft)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-dim)" }}>SIGNAL LINK STATE</span>
                <span style={{
                  fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: "bold",
                  color: signal === "strong" ? "var(--teal)" : signal === "weak" ? "var(--amber)" : "var(--red)"
                }}>
                  {signal === "strong" ? "SIGNAL LOCK" : signal === "weak" ? "DEGRADED" : "UNREACHABLE"}
                </span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden" }}>
                <motion.div
                  animate={{
                    width: signal === "strong" ? "100%" : signal === "weak" ? "35%" : "0%",
                    background: signal === "strong" ? "var(--teal)" : signal === "weak" ? "var(--amber)" : "var(--red)"
                  }}
                  style={{ height: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Column 2: Diagnostic transceiver pings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border-soft)", paddingBottom: "10px" }}>
              <IconActivity size={18} style={{ color: "var(--violet)" }} />
              <span className="field-label" style={{ color: "var(--violet)", fontSize: "11px", letterSpacing: "0.15em", fontWeight: 700 }}>
                SONAR DIAGNOSTICS & PING TEST
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button
                onClick={onTriggerPing}
                disabled={pingActive || !connected}
                style={{
                  flex: 1,
                  background: pingActive ? "rgba(139,92,246,0.1)" : "var(--violet)",
                  border: pingActive ? "1px solid rgba(139,92,246,0.3)" : "none",
                  color: pingActive ? "var(--violet)" : "#ffffff",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  fontWeight: "bold",
                  cursor: connected ? "pointer" : "not-allowed",
                  letterSpacing: "0.1em",
                  boxShadow: pingActive ? "none" : "var(--glow-violet)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  outline: "none",
                }}
              >
                <IconActivity size={14} className={pingActive ? "animate-pulse" : ""} />
                {pingActive ? "DISPATCHING PING..." : "SEND SONAR DIAGNOSTIC"}
              </button>
            </div>

            {/* Simulated live terminal readout screen */}
            <div style={{
              background: "#030407",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "8px",
              padding: "10px 14px",
              height: "90px",
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(139,92,246,0.85)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}>
              {pingLog.map((log, i) => (
                <div key={i} style={{ lineBreak: "anywhere" }}>{log}</div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
