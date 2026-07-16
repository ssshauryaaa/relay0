"use client";
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";

export const FloatingNav = ({
  navItems,
  rightSlot,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactNode;
    active?: boolean;
    onClick?: (e: React.MouseEvent) => void;
  }[];
  rightSlot?: React.ReactNode;
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - (scrollYProgress.getPrevious() ?? 0);
      if (scrollYProgress.get() < 0.05) {
        setVisible(true);
      } else {
        setVisible(direction < 0);
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          top: "16px",
          left: 0,
          right: 0,
          margin: "0 auto",
          zIndex: 5000,
          display: "flex",
          justifyContent: "center",
          pointerEvents: visible ? "auto" : "none",
        }}
        className={className}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            borderRadius: "999px",
            border: "1px solid rgba(34,211,238,0.15)",
            background: "rgba(10,14,23,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: "6px 10px",
            boxShadow:
              "0 0 0 1px rgba(34,211,238,0.08), 0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Logo pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "4px 12px 4px 8px",
              marginRight: "4px",
              userSelect: "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="3"
                fill="var(--violet, #8b5cf6)"
                style={{ filter: "drop-shadow(0 0 4px var(--violet,#8b5cf6))" }}
              />
              <circle
                cx="12"
                cy="12"
                r="7"
                stroke="var(--violet, #8b5cf6)"
                strokeWidth="1"
                strokeOpacity="0.5"
                fill="none"
              />
              <circle
                cx="12"
                cy="12"
                r="11"
                stroke="var(--violet, #8b5cf6)"
                strokeWidth="0.6"
                strokeOpacity="0.2"
                fill="none"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-display, monospace)",
                fontWeight: 900,
                letterSpacing: "0.18em",
                fontSize: "13px",
                color: "var(--violet, #8b5cf6)",
                textShadow: "0 0 12px var(--violet, #8b5cf6)",
              }}
            >
              RELAY
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "20px",
              background: "rgba(34,211,238,0.15)",
              margin: "0 4px",
            }}
          />

          {/* Nav items */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            {navItems.map((navItem, idx) => (
              <a
                key={`link-${idx}`}
                href={navItem.link}
                onClick={navItem.onClick}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "999px",
                  padding: "6px 14px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono, monospace)",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "color 0.15s ease",
                  color: navItem.active
                    ? "var(--teal, #22d3ee)"
                    : hoveredIdx === idx
                    ? "var(--text, #e2e8f0)"
                    : "var(--text-dim, #64748b)",
                  background:
                    navItem.active
                      ? "rgba(34,211,238,0.1)"
                      : hoveredIdx === idx
                      ? "rgba(255,255,255,0.05)"
                      : "transparent",
                }}
              >
                {/* Active underline */}
                {navItem.active && (
                  <motion.span
                    layoutId="floating-nav-active"
                    style={{
                      position: "absolute",
                      bottom: "3px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "14px",
                      height: "2px",
                      borderRadius: "999px",
                      background: "var(--teal, #22d3ee)",
                      boxShadow: "0 0 8px var(--teal, #22d3ee)",
                    }}
                  />
                )}
                <span style={{ display: "flex" }}>{navItem.icon}</span>
                <span>{navItem.name}</span>
              </a>
            ))}
          </div>

          {rightSlot && (
            <>
              {/* Divider */}
              <div
                style={{
                  width: "1px",
                  height: "20px",
                  background: "rgba(34,211,238,0.15)",
                  margin: "0 4px",
                }}
              />
              {rightSlot}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
