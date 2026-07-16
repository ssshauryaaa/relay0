import { useState, useEffect, useRef, useCallback } from "react";
import "./login.css";
import { motion, AnimatePresence, useMotionValue, useSpring } from "motion/react";
import { Button } from "./ui/stateful-button";
import { IconCheck, IconRadio } from "@tabler/icons-react";
import { audioManager } from "../utils/audio.js";

const DEVICE_LABELS = {
  radio:   "Portable Field Radio Set",
  lantern: "Emergency Beacon Unit",
  compass: "Tactical Direction Finder",
  beacon:  "Static Repeater Node",
  anchor:  "Command Base Transceiver",
  signal:  "Mesh Auxiliary Relayer",
};

const ICONS = [
  { id: "radio",   glyph: "◉", label: "Radio" },
  { id: "lantern", glyph: "◈", label: "Lantern" },
  { id: "compass", glyph: "✛", label: "Compass" },
  { id: "beacon",  glyph: "▲", label: "Beacon" },
  { id: "anchor",  glyph: "⚓", label: "Anchor" },
  { id: "signal",  glyph: "≡", label: "Signal" },
];

const NAME_MAX = 18;
const NAME_MIN = 2;
const OPENING_TEXT = "The mesh is listening. Bring your node online.";

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useIsTouch() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

function BackgroundBeams({ reduced }) {
  const beams = [
    { x: "12%",  dur: "9s",   delay: "0s",    opacity: 0.06 },
    { x: "35%",  dur: "13s",  delay: "2.1s",  opacity: 0.04 },
    { x: "58%",  dur: "11s",  delay: "4.7s",  opacity: 0.07 },
    { x: "78%",  dur: "15s",  delay: "1.3s",  opacity: 0.05 },
    { x: "90%",  dur: "10s",  delay: "6.2s",  opacity: 0.04 },
  ];

  if (reduced) {
    return (
      <div
        className="log-bg-static"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,166,35,0.04) 0%, rgba(5,7,10,0) 70%)",
        }}
      />
    );
  }

  return (
    <div className="log-beams" aria-hidden="true">
      {beams.map((b, i) => (
        <div
          key={i}
          className="log-beam"
          style={{
            left: b.x,
            animationDuration: b.dur,
            animationDelay: b.delay,
            opacity: b.opacity,
          }}
        />
      ))}
      {/* Scan line that sweeps across */}
      <div className="log-scan-line" />
    </div>
  );
}

function Spotlight({ reduced, isTouch }) {
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const springX = useSpring(x, { stiffness: 80, damping: 25 });
  const springY = useSpring(y, { stiffness: 80, damping: 25 });

  useEffect(() => {
    if (reduced || isTouch) return;
    const handler = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [reduced, isTouch, x, y]);

  if (reduced || isTouch) return null;

  return (
    <motion.div
      className="log-spotlight"
      aria-hidden="true"
      style={{ left: springX, top: springY }}
    />
  );
}

function TextGenerate({ text, reduced, delay = 0 }) {
  const words = text.split(" ");
  const [visible, setVisible] = useState(reduced);

  useEffect(() => {
    if (reduced) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [reduced, delay]);

  if (!visible) return <span className="log-headline-text">{text}</span>;

  if (reduced) {
    return <span className="log-headline-text">{text}</span>;
  }

  return (
    <span className="log-headline-text" aria-label={text}>
      {words.map((word, wi) => (
        <motion.span
          key={wi}
          className="log-headline-word"
          initial={{ opacity: 0, filter: "blur(8px)", y: 6 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{
            duration: 0.35,
            delay: delay + wi * 0.07,
            ease: "easeOut",
          }}
          aria-hidden="true"
        >
          {word}{" "}
        </motion.span>
      ))}
    </span>
  );
}

function IconTile({ opt, selected, onSelect, reduced }) {
  const tileRef = useRef(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const springX = useSpring(rotX, { stiffness: 260, damping: 22 });
  const springY = useSpring(rotY, { stiffness: 260, damping: 22 });

  const handleMouseMove = useCallback(
    (e) => {
      if (reduced) return;
      const el = tileRef.current;
      if (!el) return;
      const { left, top, width, height } = el.getBoundingClientRect();
      const cx = left + width / 2;
      const cy = top + height / 2;
      rotX.set(((e.clientY - cy) / height) * -10);
      rotY.set(((e.clientX - cx) / width) * 10);
    },
    [reduced, rotX, rotY]
  );

  const handleMouseLeave = useCallback(() => {
    rotX.set(0);
    rotY.set(0);
  }, [rotX, rotY]);

  const handleClick = () => {
    onSelect(opt.id);
    audioManager.playKeystroke();
  };

  return (
    <motion.div
      ref={tileRef}
      className={`log-icon-tile ${selected ? "log-icon-tile--selected" : ""}`}
      role="radio"
      aria-checked={selected}
      aria-label={`${opt.label} — ${DEVICE_LABELS[opt.id]}`}
      tabIndex={0}
      style={{
        rotateX: reduced ? 0 : springX,
        rotateY: reduced ? 0 : springY,
        transformStyle: "preserve-3d",
      }}
      whileHover={reduced ? {} : { y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Selected indicator — not color-only */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="log-icon-check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
          >
            <IconCheck size={9} strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="log-icon-glyph" aria-hidden="true">
        {opt.glyph}
      </span>
      <span className="log-icon-label">{opt.label}</span>
      <span className="log-icon-sublabel">{DEVICE_LABELS[opt.id]}</span>
    </motion.div>
  );
}

function nameError(name) {
  if (!name) return null;
  if (name.trim().length < NAME_MIN) return `Callsign must be at least ${NAME_MIN} characters`;
  return null;
}

export default function Login({ onJoin, joinError, connected }) {
  const [name, setName]           = useState("");
  const [icon, setIcon]           = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [touched, setTouched]     = useState(false);  // for inline validation

  const reduced = useReducedMotion();
  const isTouch = useIsTouch();
  const inputRef  = useRef(null);
  const groupRef  = useRef(null);
  const submitRef = useRef(null);

  const validName  = name.trim().length >= NAME_MIN;
  const canSubmit  = validName && icon !== null;
  const valError   = touched ? nameError(name.trim()) : null;

  useEffect(() => {
    audioManager.playTuneSweep?.();
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const handleGroupKey = (e) => {
      const tiles = Array.from(group.querySelectorAll("[role='radio']"));
      const curIdx = tiles.indexOf(document.activeElement);
      if (curIdx === -1) return;

      let nextIdx = curIdx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = (curIdx + 1) % tiles.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = (curIdx - 1 + tiles.length) % tiles.length;
      }

      if (nextIdx !== curIdx) {
        tiles[nextIdx].focus();
        const id = ICONS[nextIdx].id;
        setIcon(id);
        audioManager.playKeystroke();
      }
    };

    group.addEventListener("keydown", handleGroupKey);
    return () => group.removeEventListener("keydown", handleGroupKey);
  }, []);

  const handleNameChange = (e) => {
    setName(e.target.value);
    audioManager.playKeystroke();
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!canSubmit || connecting || submitted) return;
    setTouched(true);

    audioManager.playLock();
    setConnecting(true);

    await new Promise((r) => setTimeout(r, 1400));

    setConnecting(false);
    setSubmitted(true);

    await new Promise((r) => setTimeout(r, 700));

    onJoin(name.trim(), icon);
  };

  const T = reduced ? 0 : 1;   // scale factor: 0 collapses all delays

  const fadeUp = (delay) => ({
    initial: { opacity: 0, y: reduced ? 0 : 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.01 : 0.45, delay: delay * T, ease: "easeOut" },
  });

  return (
    <div className="log-root" role="main" aria-label="Node Registration">
      {/* ── Ambient background ── */}
      <BackgroundBeams reduced={reduced} />
      <Spotlight reduced={reduced} isTouch={isTouch} />
      <div className="log-grain" aria-hidden="true" />

      {/* ── Page layout ── */}
      <div className="log-page">

        {/* ── Eyebrow + Headline ── */}
        <motion.div className="log-headline-wrap" {...fadeUp(0)}>
          <div className="log-eyebrow mono">
            <span className="log-eyebrow-dot" aria-hidden="true" />
            NODE REGISTRATION // FIRST CONTACT PROTOCOL
          </div>
        </motion.div>

        <motion.h1 className="log-headline" {...fadeUp(0.08)}>
          <TextGenerate text={OPENING_TEXT} reduced={reduced} delay={0.1} />
        </motion.h1>

        {/* ── Registration Card ── */}
        <motion.div
          className="log-card"
          initial={{ opacity: 0, y: reduced ? 0 : 20, filter: reduced ? "none" : "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: reduced ? 0.01 : 0.55, delay: 0.18 * T, ease: "easeOut" }}
        >
          <form className="log-form" onSubmit={handleSubmit} noValidate>

            {/* ── Name field ── */}
            <div className="log-field-group">
              <label className="log-field-label" htmlFor="log-name-input">
                CALLSIGN NAME
              </label>

              <motion.div
                className={`log-input-shell ${isFocused ? "log-input-shell--focused" : ""}`}
                animate={{
                  borderColor: isFocused
                    ? "rgba(245,166,35,0.55)"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: isFocused
                    ? "0 0 0 3px rgba(245,166,35,0.09), 0 4px 24px rgba(0,0,0,0.45)"
                    : "0 4px 20px rgba(0,0,0,0.3)",
                }}
                transition={{ duration: 0.2 }}
              >
                <span className="log-input-prefix mono" aria-hidden="true">
                  ◈
                </span>
                <input
                  id="log-name-input"
                  ref={inputRef}
                  className="log-input"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => { setIsFocused(false); setTouched(true); }}
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  autoFocus
                  spellCheck={false}
                  disabled={connecting || submitted}
                  aria-required="true"
                  aria-invalid={!!valError}
                  aria-describedby={
                    [valError ? "log-name-error" : null, "log-name-hint", "log-submit-hint"]
                      .filter(Boolean)
                      .join(" ")
                  }
                />
                {name.length > 0 && (
                  <span className="log-char-counter mono" aria-live="polite" aria-label={`${NAME_MAX - name.length} characters remaining`}>
                    {NAME_MAX - name.length}
                  </span>
                )}
              </motion.div>

              <div id="log-name-hint" className="log-field-hint mono">
                2–18 chars · letters, numbers, hyphens recommended
              </div>

              <AnimatePresence>
                {valError && (
                  <motion.div
                    id="log-name-error"
                    className="log-field-error mono"
                    role="alert"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    ⚠ {valError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Icon picker ── */}
            <div className="log-field-group">
              <div className="log-field-label" id="log-icon-group-label">
                SELECT DEVICE ICON
              </div>

              {/* RadioGroup semantics via aria attributes */}
              <div
                ref={groupRef}
                className="log-icon-grid"
                role="radiogroup"
                aria-labelledby="log-icon-group-label"
                aria-required="true"
              >
                {ICONS.map((opt) => (
                  <IconTile
                    key={opt.id}
                    opt={opt}
                    selected={icon === opt.id}
                    onSelect={setIcon}
                    reduced={reduced}
                  />
                ))}
              </div>
            </div>

            {/* ── Accessibility hint for disabled submit ── */}
            {!canSubmit && (
              <div id="log-submit-hint" className="log-submit-hint mono" aria-live="polite">
                Choose a name and device icon to continue
              </div>
            )}

            {/* ── Join error from server ── */}
            <AnimatePresence>
              {joinError && (
                <motion.div
                  className="log-join-error mono"
                  role="alert"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ⚠ {joinError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Submit ── */}
            <div className="log-submit-wrap">
              {/*
                The stateful-button handles its own loading (spinner) and
                success (check) animations internally by awaiting our onClick.
                We pass static children — just the label + icon — so the two
                animation systems don't fight each other.
              */}
              <Button
                ref={submitRef}
                type="button"
                className={`log-submit-btn ${!canSubmit ? "log-submit-btn--disabled" : ""}`}
                disabled={!canSubmit || connecting || submitted}
                onClick={handleSubmit}
                aria-disabled={!canSubmit}
                aria-describedby={!canSubmit ? "log-submit-hint" : undefined}
              >
                <span className="log-btn-inner">
                  <IconRadio size={14} aria-hidden="true" />
                  Establish Node
                </span>
              </Button>

              {/* Mesh handshake status line — appears while awaiting the handshake */}
              <AnimatePresence>
                {(connecting || submitted) && (
                  <motion.div
                    className={`log-status-line mono ${submitted ? "log-status-line--ok" : ""}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22 }}
                    aria-live="polite"
                  >
                    <span
                      className={`log-status-dot ${submitted ? "log-status-dot--ok" : ""}`}
                      aria-hidden="true"
                    />
                    {submitted ? "Node online — joining mesh…" : "Connecting to mesh…"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </form>
        </motion.div>

        {/* ── Footer ── */}
        <motion.footer className="log-footer mono" {...fadeUp(0.45)}>
          <span className="log-footer-proto">RELAY // PROTOCOL v1.0</span>
          <span className="log-footer-sep" aria-hidden="true">·</span>
          <span className="log-footer-note">
            First time on the mesh? This creates a new node.
          </span>
        </motion.footer>

      </div>
    </div>
  );
}
