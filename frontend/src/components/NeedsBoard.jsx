import "./NeedsBoard.css";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { audioManager } from "../utils/audio.js";
import {
  IconClipboardList,
  IconAlertTriangle,
  IconPackage,
  IconSend,
  IconCheck,
  IconSearch,
  IconArrowsSort,
  IconFlame,
  IconBolt,
  IconCircleDot,
} from "@tabler/icons-react";

const PRIORITIES = {
  standard: { label: "Standard", short: "STD", dot: "nb-dot-standard" },
  urgent: { label: "Urgent", short: "URG", dot: "nb-dot-urgent" },
  critical: { label: "Critical", short: "CRIT", dot: "nb-dot-critical" },
};

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => b.timestamp - a.timestamp },
  oldest: { label: "Oldest first", fn: (a, b) => a.timestamp - b.timestamp },
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function formatClock(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(ts, now) {
  if (!ts) return "";
  const diff = Math.max(0, now - ts);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function AmbientField({ reduced }) {
  if (reduced) {
    return (
      <div
        className="nb-field-static"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 22% 0%, rgba(14,240,251,0.05) 0%, rgba(5,7,10,0) 70%)",
        }}
      />
    );
  }
  return (
    <div className="nb-field" aria-hidden="true">
      <div className="nb-field-beam nb-field-beam-a" />
      <div className="nb-field-beam nb-field-beam-b" />
      <div className="nb-field-sweep" />
    </div>
  );
}

function SignalPulse({ reduced }) {
  return (
    <span className="nb-pulse" aria-hidden="true">
      <span className="nb-pulse-core" />
      {!reduced && (
        <>
          <span className="nb-pulse-ring nb-pulse-ring-1" />
          <span className="nb-pulse-ring nb-pulse-ring-2" />
        </>
      )}
    </span>
  );
}

export default function NeedsBoard({ board, self, onPost, onResolve }) {
  const [type, setType] = useState("have");
  const [priority, setPriority] = useState("standard");
  const [item, setItem] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const inputRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (p) => !q || p.item.toLowerCase().includes(q) || p.from.toLowerCase().includes(q);
    return board.filter(match).sort(SORTS[sort].fn);
  }, [board, query, sort]);

  const haves = useMemo(() => filtered.filter((p) => p.type === "have"), [filtered]);
  const needs = useMemo(() => filtered.filter((p) => p.type === "need"), [filtered]);
  const criticalCount = useMemo(
    () => board.filter((p) => p.type === "need" && p.priority === "critical").length,
    [board]
  );

  function handleTypeToggle(t) {
    audioManager.playKeystroke();
    setType(t);
    inputRef.current?.focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = item.trim();
    if (!trimmed) return;
    audioManager.playLock();
    onPost(type, trimmed, type === "need" ? priority : undefined);
    setItem("");
    setPriority("standard");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  }

  return (
    <section className="nb-page" aria-label="Needs and resources board">
      <AmbientField reduced={reduced} />
      <div className="nb-grain" aria-hidden="true" />

      {/* ── HERO ── */}
      <div className="nb-hero">
        <div className="nb-hero-inner">
          <motion.div
            className="nb-eyebrow mono"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <SignalPulse reduced={reduced} />
            <IconClipboardList size={12} />
            <span>SECURE MESH DATA ROUTE // SECTOR BULLETIN</span>
          </motion.div>

          <motion.h1
            className="nb-hero-title"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          >
            Mesh Bulletin Board
          </motion.h1>

          <motion.p
            className="nb-hero-desc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: "easeOut" }}
          >
            Synchronized peer-to-peer dispatch. Register available supplies or flag critical
            needs — every node on the mesh sees this in real time, no signal required.
          </motion.p>

          <motion.div
            className="nb-tele-row"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease: "easeOut" }}
          >
            <TeleChip tone="teal" label="CARGO" value={haves.length} suffix="dispatches" />
            <TeleChip tone="amber" label="REQUESTS" value={needs.length} suffix="open" />
            {criticalCount > 0 && (
              <TeleChip tone="red" label="CRITICAL" value={criticalCount} suffix="flagged" pulse />
            )}
            <div className="nb-tele-chip nb-tele-green">
              <span className="nb-tele-label">STATUS</span>
              <span className="nb-tele-val">MESH_OK</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── POST COMMAND BAR ── */}
      <motion.div
        className="nb-post-bar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.32, ease: "easeOut" }}
      >
        <form className="nb-post-form" onSubmit={handleSubmit}>
          <div className="nb-type-row">
            <TypeButton
              active={type === "have"}
              onClick={() => handleTypeToggle("have")}
              icon={<IconPackage size={14} />}
              label="Cargo (Have)"
              variant="have"
            />
            <TypeButton
              active={type === "need"}
              onClick={() => handleTypeToggle("need")}
              icon={<IconAlertTriangle size={14} />}
              label="Request (Need)"
              variant="need"
            />
          </div>

          <AnimatePresence initial={false}>
            {type === "need" && (
              <motion.div
                className="nb-priority-row"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <span className="nb-priority-label mono">SEVERITY</span>
                {Object.entries(PRIORITIES).map(([key, cfg]) => (
                  <button
                    type="button"
                    key={key}
                    className={`nb-priority-chip ${priority === key ? "nb-priority-chip--active" : ""} ${cfg.dot}`}
                    onClick={() => {
                      audioManager.playKeystroke();
                      setPriority(key);
                    }}
                  >
                    <span className={`nb-priority-dot ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="nb-post-divider" />

          <div className="nb-input-wrap">
            <input
              ref={inputRef}
              className="nb-input"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
              placeholder={
                type === "have"
                  ? "Describe resources available (e.g. Bottled water × 6 crates)…"
                  : "Describe items needed urgently (e.g. Insulin, first-aid kit)…"
              }
              maxLength={120}
            />
            {item.length > 0 && <span className="nb-char-counter mono">{120 - item.length}</span>}
          </div>

          <motion.button
            type="submit"
            disabled={!item.trim()}
            className={`nb-submit ${type === "have" ? "nb-submit-have" : "nb-submit-need"} ${!item.trim() ? "nb-submit-disabled" : ""
              }`}
            whileTap={item.trim() ? { scale: 0.95 } : {}}
            whileHover={item.trim() ? { scale: 1.03 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.span
                  key="check"
                  className="nb-submit-inner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                >
                  <IconCheck size={15} />
                  <span>Posted!</span>
                </motion.span>
              ) : (
                <motion.span
                  key="send"
                  className="nb-submit-inner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.18 }}
                >
                  <IconSend size={14} />
                  <span>Post to Sector</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </motion.div>

      {/* ── FILTER / SORT TOOLBAR ── */}
      <motion.div
        className="nb-toolbar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="nb-search-wrap">
          <IconSearch size={14} className="nb-search-icon" />
          <input
            className="nb-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by item or callsign…"
          />
        </div>
        <button
          type="button"
          className="nb-sort-btn mono"
          onClick={() => {
            audioManager.playKeystroke();
            setSort((s) => (s === "newest" ? "oldest" : "newest"));
          }}
        >
          <IconArrowsSort size={13} />
          {SORTS[sort].label}
        </button>
      </motion.div>

      {/* ── BULLETIN GRID ── */}
      <div className="nb-grid-wrap">
        <div className="nb-grid">
          <BoardColumn
            icon="⚓"
            tone="teal"
            title="Available Cargo"
            count={haves.length}
            posts={haves}
            self={self}
            now={now}
            onResolve={onResolve}
            emptyCode="[ EMPTY_CARGO ]"
            emptySub="No resource dispatches match this filter."
          />
          <BoardColumn
            icon="⚠"
            tone="amber"
            title="Active Requests"
            count={needs.length}
            posts={needs}
            self={self}
            now={now}
            onResolve={onResolve}
            emptyCode="[ EMPTY_REQUESTS ]"
            emptySub="No pending emergency dispatches match this filter."
          />
        </div>
      </div>
    </section>
  );
}

function TeleChip({ tone, label, value, suffix, pulse }) {
  return (
    <div className={`nb-tele-chip nb-tele-${tone} ${pulse ? "nb-tele-chip--pulse" : ""}`}>
      <span className="nb-tele-label">{label}</span>
      <span className="nb-tele-val">
        <AnimatePresence mode="wait">
          <motion.span
            key={value}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        &nbsp;{suffix}
      </span>
    </div>
  );
}

function TypeButton({ active, onClick, icon, label, variant }) {
  return (
    <motion.button
      type="button"
      className={`nb-type-btn ${active ? `nb-type-${variant}` : "nb-type-inactive"}`}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div className={`nb-type-active-pill nb-type-active-${variant}`} layoutId="nb-type-active-pill" />}
    </motion.button>
  );
}

function BoardColumn({ icon, tone, title, count, posts, self, now, onResolve, emptyCode, emptySub }) {
  return (
    <div className="nb-col">
      <div className={`nb-col-header nb-col-${tone}`}>
        <span className="nb-col-icon">{icon}</span>
        <h3 className="nb-col-title">{title}</h3>
        <span className="nb-col-count">{count}</span>
      </div>

      <div className="nb-cards">
        <AnimatePresence mode="popLayout">
          {posts.length === 0 ? (
            <motion.div
              key={`empty-${tone}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="nb-empty"
            >
              <div className="nb-empty-code mono">{emptyCode}</div>
              <div className="nb-empty-sub">{emptySub}</div>
            </motion.div>
          ) : (
            posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.03 }}
                layout
              >
                <BoardCard post={p} self={self} now={now} onResolve={onResolve} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BoardCard({ post, self, now, onResolve }) {
  const isHave = post.type === "have";
  const isMine = post.from === self?.username;
  const cfg = !isHave ? PRIORITIES[post.priority] || PRIORITIES.standard : null;
  const isCritical = cfg?.short === "CRIT";

  const cardRef = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 260, damping: 24 });
  const springY = useSpring(rotY, { stiffness: 260, damping: 24 });

  const handleMove = useCallback(
    (e) => {
      const el = cardRef.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      rotX.set(((e.clientY - (top + height / 2)) / height) * -4);
      rotY.set(((e.clientX - (left + width / 2)) / width) * 4);
    },
    [rotX, rotY]
  );
  const handleLeave = useCallback(() => {
    rotX.set(0);
    rotY.set(0);
  }, [rotX, rotY]);

  return (
    <motion.div
      ref={cardRef}
      className={`nb-card ${isHave ? "nb-card-have" : "nb-card-need"} ${isCritical ? "nb-card-critical" : ""}`}
      style={{ rotateX: springX, rotateY: springY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={{
        y: -3,
        boxShadow: isHave ? "0 10px 34px rgba(14,240,251,0.14)" : "0 10px 34px rgba(245,166,35,0.14)",
      }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
    >
      <div className="nb-card-top">
        <span className={`nb-card-tag ${isHave ? "nb-tag-have" : "nb-tag-need"}`}>
          {isHave ? "⚓ CARGO" : "⚠ REQUEST"}
        </span>
        {cfg && (
          <span className={`nb-card-priority mono ${cfg.dot}`}>
            {isCritical && <IconFlame size={11} />}
            {cfg.short === "URG" && <IconBolt size={11} />}
            {cfg.short === "STD" && <IconCircleDot size={11} />}
            {cfg.short}
          </span>
        )}
        <span className="nb-card-time mono" title={formatClock(post.timestamp)}>
          {formatRelative(post.timestamp, now)}
        </span>
      </div>

      <p className="nb-card-item">{post.item}</p>

      <div className="nb-card-footer">
        <div className="nb-card-author">
          <span className={`nb-author-dot ${isHave ? "nb-dot-teal" : "nb-dot-amber"}`} />
          <span className="nb-author-name">{post.from}</span>
          {isMine && <span className="nb-author-you mono">YOU</span>}
        </div>
        {isMine && (
          <motion.button
            className="nb-resolve-btn mono"
            onClick={() => {
              audioManager.playKeystroke();
              onResolve(post.id);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
          >
            RESOLVE ×
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}