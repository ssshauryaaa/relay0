"use client";

import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`relay-dock-mobile ${className || ""}`}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99,
        display: "flex",
        flexDirection: "column-reverse",
        alignItems: "end",
        gap: "8px",
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            style={{
              display: "flex",
              flexDirection: "column-reverse",
              gap: "8px",
              marginBottom: "8px",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.03 } }}
                transition={{ delay: (items.length - 1 - idx) * 0.04 }}
              >
                <DockItemButton item={item} size={40} iconSize={18} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          height: "48px",
          width: "48px",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
          cursor: "pointer",
          color: "var(--text-dim)",
          padding: 0,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  let mouseY = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseY.set(e.pageY)}
      onMouseLeave={() => mouseY.set(Infinity)}
      className={`relay-dock-desktop ${className || ""}`}
      style={{
        position: "fixed",
        left: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 99,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        borderRadius: "16px",
        padding: "16px 8px",
        background: "rgba(16, 22, 34, 0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(34, 211, 238, 0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(34, 211, 238, 0.06)",
      }}
    >
      {items.map((item) => (
        <IconContainer mouseY={mouseY} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function DockItemButton({
  item,
  size,
  iconSize,
}: {
  item: DockItem;
  size: number;
  iconSize: number;
}) {
  const Tag = item.href ? "a" : "button";
  return (
    <Tag
      href={item.href}
      onClick={item.onClick}
      title={item.title}
      style={{
        width: size,
        height: size,
        background: item.active ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${item.active ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: item.active ? "0 0 10px rgba(34,211,238,0.3)" : "none",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: item.active ? "var(--teal)" : "var(--text-dim)",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div style={{ width: iconSize, height: iconSize, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {item.icon}
      </div>
    </Tag>
  );
}

function IconContainer({
  mouseY,
  title,
  icon,
  href,
  onClick,
  active,
  badge,
}: DockItem & { mouseY: MotionValue }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseY, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  const sizeTransform = useTransform(distance, [-120, 0, 120], [40, 58, 40]);
  const iconSizeTransform = useTransform(distance, [-120, 0, 120], [18, 28, 18]);

  const size = useSpring(sizeTransform, { mass: 0.1, stiffness: 160, damping: 12 });
  const iconSize = useSpring(iconSizeTransform, { mass: 0.1, stiffness: 160, damping: 12 });

  const [hovered, setHovered] = useState(false);

  const Tag = href ? "a" : "button";

  return (
    <Tag
      href={href}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
        display: "block",
        outline: "none",
      }}
    >
      <motion.div
        ref={ref}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: size,
          height: size,
          border: "1px solid",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
        animate={{
          background: active
            ? "rgba(34,211,238,0.15)"
            : "rgba(255,255,255,0.04)",
          borderColor: active ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.07)",
          boxShadow: active ? "0 0 10px rgba(34,211,238,0.3)" : "none",
        }}
      >
        {/* Tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="absolute left-full ml-3 whitespace-pre rounded-md px-2 py-1 text-xs font-mono tracking-widest pointer-events-none"
              style={{
                position: "absolute",
                left: "100%",
                marginLeft: "12px",
                whiteSpace: "pre",
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: active ? "var(--teal)" : "var(--text-dim)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        {badge != null && badge > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              display: "flex",
              height: "16px",
              width: "16px",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              fontSize: "8px",
              fontFamily: "var(--font-mono)",
              fontWeight: "bold",
              background: "var(--teal)",
              color: "var(--bg)",
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}

        {/* Icon */}
        <motion.div
          style={{
            width: iconSize,
            height: iconSize,
            color: active ? "var(--teal)" : "var(--text-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </motion.div>
      </motion.div>
    </Tag>
  );
}
