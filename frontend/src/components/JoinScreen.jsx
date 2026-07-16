import { useState, useEffect, useRef } from "react";
import { audioManager } from "../utils/audio.js";

const ICONS = [
  { id: "radio", glyph: "◉", label: "Radio" },
  { id: "lantern", glyph: "◈", label: "Lantern" },
  { id: "compass", glyph: "✛", label: "Compass" },
  { id: "beacon", glyph: "▲", label: "Beacon" },
  { id: "anchor", glyph: "⚓", label: "Anchor" },
  { id: "signal", glyph: "≡", label: "Signal" },
];

export default function JoinScreen({ onJoin, joinError, connected }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("radio");
  const [isTuning, setIsTuning] = useState(false);
  const [tuningProgress, setTuningProgress] = useState(0);
  const [staticLevel, setStaticLevel] = useState(0.85);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const progressTimerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { width, height, left, top } = container.getBoundingClientRect();

      const x = (clientX - left) / width - 0.5;
      const y = (clientY - top) / height - 0.5;

      const tiltX = y * -12;
      const tiltY = x * 12;

      container.style.setProperty("--mouse-x", `${clientX}px`);
      container.style.setProperty("--mouse-y", `${clientY}px`);
      container.style.setProperty("--tilt-x", `${tiltX}deg`);
      container.style.setProperty("--tilt-y", `${tiltY}deg`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (audioManager && audioManager.playTuneSweep) audioManager.playTuneSweep();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const start = Date.now();
    const duration = 1200;

    const draw = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentStatic = Math.max(0.85 - progress * 0.83, 0.02);
      setStaticLevel(currentStatic);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (currentStatic > 0.03) {
        const noiseSize = 90;
        const offscreen = document.createElement("canvas");
        offscreen.width = noiseSize;
        offscreen.height = noiseSize;
        const octx = offscreen.getContext("2d");
        const imgData = octx.createImageData(noiseSize, noiseSize);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const val = Math.random() * 255;
          data[i] = val * 0.16;
          data[i + 1] = val * 0.24;
          data[i + 2] = val * 0.18;
          data[i + 3] = val * currentStatic * 0.4; // Slightly softer static
        }
        octx.putImageData(imgData, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, w, h);
      }
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  function handleNameChange(e) {
    const uppercaseVal = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    setName(uppercaseVal);
    if (audioManager && audioManager.playKeystroke) audioManager.playKeystroke();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isTuning) return;

    setIsTuning(true);
    setTuningProgress(0);
    if (audioManager && audioManager.playTuneSweep) audioManager.playTuneSweep();

    let prog = 0;
    progressTimerRef.current = setInterval(() => {
      prog += 6;
      if (prog >= 100) {
        clearInterval(progressTimerRef.current);
        setTuningProgress(100);
        setTimeout(() => onJoin(trimmed, icon), 200);
      } else {
        setTuningProgress(prog);
      }
    }, 50);
  }

  return (
    <div
      className="join-screen clean-container"
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        cursor: "none",
        backgroundColor: "#030305",
        fontFamily: "'Courier New', Courier, monospace"
      }}
    >
      <style>{`
        .clean-container * {
          cursor: none !important; 
        }
        
        .cursor-glow {
          position: absolute;
          top: 0; left: 0;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(138,43,226,0.15) 0%, rgba(0,0,0,0) 70%);
          transform: translate(calc(var(--mouse-x) - 300px), calc(var(--mouse-y) - 300px));
          pointer-events: none;
          z-index: 5;
          mix-blend-mode: screen;
          transition: transform 0.15s cubic-bezier(0.2, 0, 0.2, 1);
        }

        .cursor-ring {
          position: fixed;
          top: 0; left: 0;
          width: 32px; height: 32px;
          border: 1.5px solid rgba(138,43,226, 0.6);
          border-radius: 50%;
          transform: translate(calc(var(--mouse-x) - 16px), calc(var(--mouse-y) - 16px));
          pointer-events: none;
          z-index: 9998;
          box-shadow: 0 0 10px rgba(138,43,226, 0.3), inset 0 0 10px rgba(138,43,226, 0.3);
          transition: transform 0.1s ease-out; /* Slight drag effect */
        }
        
        .cursor-dot {
          position: fixed;
          top: 0; left: 0;
          width: 4px; height: 4px;
          background: #fff;
          border-radius: 50%;
          transform: translate(calc(var(--mouse-x) - 2px), calc(var(--mouse-y) - 2px));
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
        }

        .card-3d-wrapper {
          position: relative;
          z-index: 10;
          perspective: 1000px;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%; height: 100%;
        }

        .card-3d-inner {
          transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg));
          transform-style: preserve-3d;
          transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          background: linear-gradient(145deg, rgba(20,20,25,0.7) 0%, rgba(10,10,12,0.9) 100%);
          border: 1px solid rgba(138,43,226,0.2);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05);
          backdrop-filter: blur(16px);
          padding: 2.5rem;
          max-width: 440px;
          width: 90%;
        }
        
        .card-3d-inner > * {
          transform: translateZ(30px);
        }

        .clean-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: #fff;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .clean-input:focus {
          border-color: rgba(138,43,226, 0.8);
          box-shadow: 0 0 15px rgba(138,43,226, 0.2);
        }

        .icon-flex {
          display: flex;
          gap: 12px;
          justify-content: space-between;
          margin-top: 12px;
        }

        .icon-small {
          flex: 1;
          aspect-ratio: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255, 0.5);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          transition: all 0.2s ease;
        }

        .icon-small:hover {
          background: rgba(138,43,226, 0.1);
          color: rgba(255,255,255, 0.9);
          border-color: rgba(138,43,226, 0.4);
          transform: translateY(-2px);
        }

        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(138,43,226, 0.3); }
          100% { box-shadow: 0 0 20px rgba(138,43,226, 0.6); }
        }

        .icon-small-active {
          background: rgba(138,43,226, 0.2);
          border-color: var(--violet, #8a2be2);
          color: #ffffff;
          text-shadow: 0 0 10px rgba(255,255,255,0.5);
          animation: pulse-glow 2s infinite alternate;
          transform: translateY(-2px);
        }

        .btn-clean {
          width: 100%;
          padding: 16px;
          background: var(--violet, #8a2be2);
          color: #fff;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          letter-spacing: 1.5px;
          margin-top: 32px;
          box-shadow: 0 4px 15px rgba(138,43,226,0.3);
          transition: all 0.2s ease;
        }
        .btn-clean:not(:disabled):hover {
          box-shadow: 0 6px 20px rgba(138,43,226,0.5);
          transform: translateY(-1px);
        }
        .btn-clean:disabled {
          opacity: 0.5;
          filter: grayscale(100%);
        }
      `}</style>

      {/* Background & Cursors */}
      <canvas ref={canvasRef} style={{ pointerEvents: "none", position: "absolute", inset: 0, zIndex: 1 }} />
      <div className="cursor-glow" />
      <div className="cursor-ring" />
      <div className="cursor-dot" />

      <div className="card-3d-wrapper">
        <div className="card-3d-inner" style={{ animation: "crt-flicker 0.15s ease-out 1" }}>

          {/* Status Header */}
          <div style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "8px", marginBottom: "2rem", color: "rgba(255,255,255,0.6)" }}>
            <span style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: connected ? "#00ffcc" : "#ff4444",
              boxShadow: connected ? "0 0 8px #00ffcc" : "0 0 8px #ff4444"
            }} />
            {connected ? "SYS.OK: RELAY FREQUENCY LOCK" : "SYS.ERR: CONNECTING TO LOCAL RELAY..."}
          </div>

          <h1 style={{ color: "var(--violet, #8a2be2)", textShadow: "0 0 15px rgba(138,43,226,0.6)", fontSize: "2.5rem", margin: "0 0 1rem 0", fontWeight: 700 }}>
            RELAY
          </h1>
          <p style={{ opacity: 0.7, lineHeight: 1.6, marginBottom: "2rem", fontSize: "0.9rem" }}>
            The wider network is offline. This terminal routes packets to other nearby transceivers on this local LAN sector only.
          </p>

          <form onSubmit={handleSubmit}>
            <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "1px", marginBottom: "8px", opacity: 0.8 }}>
              OPERATOR CALLSIGN
            </label>
            <input
              id="callsign"
              className="clean-input"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. ALPHA-SEC-1"
              maxLength={18}
              autoFocus
              autoComplete="off"
              disabled={isTuning}
            />

            <label style={{ display: "block", fontSize: "0.8rem", letterSpacing: "1px", margin: "24px 0 8px 0", opacity: 0.8 }}>
              SIGNAL FREQUENCY
            </label>

            {/* Compact Flex Icon Row */}
            <div className="icon-flex">
              {ICONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  className={`icon-small ${icon === opt.id ? "icon-small-active" : ""}`}
                  onClick={() => {
                    setIcon(opt.id);
                    if (audioManager && audioManager.playKeystroke) audioManager.playKeystroke();
                  }}
                  disabled={isTuning}
                  title={opt.label}
                >
                  <span aria-hidden="true">{opt.glyph}</span>
                </button>
              ))}
            </div>

            {joinError && <div style={{ color: "#ff4444", marginTop: "1rem", fontSize: "0.85rem" }}>{joinError}</div>}

            {isTuning ? (
              <div style={{ marginTop: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.8rem" }}>
                  <span>TUNING FREQUENCY...</span>
                  <span>{tuningProgress}%</span>
                </div>
                <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${tuningProgress}%`, height: "100%", background: "var(--violet, #8a2be2)", boxShadow: "0 0 10px var(--violet, #8a2be2)", transition: "width 0.05s linear" }} />
                </div>
              </div>
            ) : (
              <button type="submit" className="btn-clean" disabled={!name.trim() || isTuning}>
                ESTABLISH LINK
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}