import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import {
  IconRadio,
  IconMap2,
  IconClipboardList,
  IconUsers,
  IconSearch,
  IconAlertTriangle,
  IconWifi,
  IconArrowRight,
  IconActivity,
  IconSatellite,
} from "@tabler/icons-react";

const NODE_HISTORY = [
  820, 1240, 1890, 2550, 3400, 4200, 5100, 6800, 7400, 8900,
  10200, 11400, 12300, 13100, 13800, 14100, 14204,
];

const FEED_ENTRIES = [
  {
    id: 1,
    type: "system",
    time: "22:31:04",
    text: "Relay Tower 7 (Sector 4-N) came back online. Route re-established via BRAVO mesh.",
  },
  {
    id: 2,
    type: "message",
    time: "22:29:47",
    from: "KD9XVT",
    text: "Medical supplies secured at Grid 47-B. Routing convoy to Shelter-12 now.",
  },
  {
    id: 3,
    type: "system",
    time: "22:28:12",
    text: "New mesh path established to Sector 12 via relay node ALPHA-04. Latency nominal.",
  },
  {
    id: 4,
    type: "broadcast",
    time: "22:25:33",
    from: "COORD-DELTA",
    text: "Route 9 northbound confirmed clear. Evacuation convoy may proceed.",
  },
  {
    id: 5,
    type: "message",
    time: "22:22:18",
    from: "WB4TTZ",
    text: "Family of 4 at 33.74°N, 84.39°W. Awaiting extraction team confirmation.",
  },
  {
    id: 6,
    type: "system",
    time: "22:19:01",
    text: "Mesh density increased in Sector 3. 204 new nodes synchronized this cycle.",
  },
  {
    id: 7,
    type: "message",
    time: "22:17:44",
    from: "N7XKQ",
    text: "Power at Node BRAVO-12 holding. Battery reserve estimated 6h at current load.",
  },
];

function buildMeshNodes(selfName, peers) {
  const W = 600, H = 340, cx = W / 2, cy = H / 2;
  const ring1r = 90, ring2r = 155;
  const systemLabels = ["RELAY-α", "TOWER-7", "NODE-Δ", "HUB-12", "MESH-β", "GRID-9", "RELAY-γ", "BASE-1"];

  const nodes = [{ id: "self", label: selfName || "YOU", x: cx, y: cy, kind: "self" }];

  const peerNames = peers.filter(p => p.username !== selfName).slice(0, 4).map(p => p.username);
  const r1Names = [...peerNames, ...systemLabels].slice(0, 6);
  const r2Names = systemLabels.slice(2, 10);

  r1Names.forEach((name, i) => {
    const a = (i / r1Names.length) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ id: `r1-${i}`, label: name, x: cx + Math.cos(a) * ring1r, y: cy + Math.sin(a) * ring1r, kind: i < peerNames.length ? "peer" : "relay" });
  });

  r2Names.forEach((name, i) => {
    const a = (i / r2Names.length) * Math.PI * 2 - Math.PI / 6;
    nodes.push({ id: `r2-${i}`, label: name, x: cx + Math.cos(a) * ring2r, y: cy + Math.sin(a) * ring2r, kind: "relay" });
  });

  return nodes;
}

const MESH_EDGES = [
  [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],
  [1,7],[2,8],[3,9],[4,10],[5,11],[6,12],
  [1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[8,9],[10,11],
];

function Sparkline({ data }) {
  const W = 400, H = 90;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 4 - ((v - min) / (max - min)) * (H - 16);
    return [x, y];
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const lastPt = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sdash-sparkline" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6A1A" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FF6A1A" stopOpacity="0" />
        </linearGradient>
        <filter id="sg-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={area} fill="url(#sg-fill)" />
      <path d={line} stroke="#FF6A1A" strokeWidth="1.8" fill="none" filter="url(#sg-glow)" />
      {lastPt && (
        <>
          <circle cx={lastPt[0]} cy={lastPt[1]} r="6" fill="rgba(255,106,26,0.2)" />
          <circle cx={lastPt[0]} cy={lastPt[1]} r="3" fill="#FF6A1A" filter="url(#sg-glow)" />
        </>
      )}
    </svg>
  );
}

function MeshMapPreview({ peers, self }) {
  const nodes = buildMeshNodes(self?.username, peers);
  const [offset, setOffset] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      setOffset(((ts - startRef.current) / 18) % 80);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg viewBox="0 0 600 340" className="sdash-mesh-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="self-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6A1A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF6A1A" stopOpacity="0" />
        </radialGradient>
        <filter id="node-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="peer-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {MESH_EDGES.map(([a, b], i) => {
        const na = nodes[a], nb = nodes[b];
        if (!na || !nb) return null;
        return (
          <g key={i}>
            <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(255,106,26,0.1)" strokeWidth="1" />
            <line
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="#FF6A1A" strokeWidth="1.5" opacity="0.55"
              strokeDasharray="10 70"
              strokeDashoffset={-(offset + i * 14) % 80}
            />
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <g key={node.id}>
          {node.kind === "self" && (
            <circle cx={node.x} cy={node.y} r="32" fill="url(#self-halo)" />
          )}
          <circle
            cx={node.x} cy={node.y}
            r={node.kind === "self" ? 9 : node.kind === "peer" ? 5.5 : 3.5}
            fill={node.kind === "self" ? "#FF6A1A" : node.kind === "peer" ? "#39FF88" : "rgba(180,190,210,0.35)"}
            filter={node.kind !== "relay" ? (node.kind === "self" ? "url(#node-glow)" : "url(#peer-glow)") : undefined}
          />
          {node.kind !== "relay" && (
            <text
              x={node.x} y={node.y - (node.kind === "self" ? 16 : 12)}
              textAnchor="middle"
              fontSize={node.kind === "self" ? "9" : "7.5"}
              fill={node.kind === "self" ? "#FF6A1A" : "#39FF88"}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
              letterSpacing="0.08em"
              opacity="0.9"
            >
              {node.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ActionCard({ icon, title, desc, accent, critical, onClick, delay = 0 }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  function onMove(e) {
    const r = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 18;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -14;
    setTilt({ x, y, active: true });
  }

  function onLeave() {
    setTilt({ x: 0, y: 0, active: false });
  }

  return (
    <motion.div
      ref={cardRef}
      className={`sdash-action-card${critical ? " sdash-action-critical" : ""}`}
      style={{
        transform: tilt.active
          ? `perspective(700px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.025)`
          : "perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)",
        transition: tilt.active ? "transform 0.08s ease-out" : "transform 0.3s ease-out",
        borderColor: tilt.active ? (critical ? "rgba(255,106,26,0.45)" : "rgba(57,255,136,0.25)") : undefined,
        boxShadow: tilt.active
          ? `0 16px 40px rgba(0,0,0,0.5), 0 0 24px ${critical ? "rgba(255,106,26,0.12)" : "rgba(57,255,136,0.08)"}`
          : undefined,
      }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="sdash-action-icon-wrap" style={{ color: accent }}>
        {icon}
      </div>
      <div className="sdash-action-body">
        <div className="sdash-action-title" style={{ color: critical ? "#FF6A1A" : undefined }}>
          {title}
        </div>
        <div className="sdash-action-desc">{desc}</div>
      </div>
      <div className="sdash-action-arrow" style={{ color: accent }}>
        <IconArrowRight size={14} />
      </div>
    </motion.div>
  );
}

function FeedEntry({ entry, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const typeColor = entry.type === "broadcast" ? "#FF6A1A" : entry.type === "system" ? "#39FF88" : "rgba(180,190,210,0.5)";

  return (
    <motion.div
      ref={ref}
      className={`sdash-feed-entry sdash-feed-${entry.type}`}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
    >
      <div className="sdash-feed-dot" style={{ background: typeColor, boxShadow: `0 0 8px ${typeColor}` }} />
      <div className="sdash-feed-content">
        <div className="sdash-feed-meta">
          <span className="sdash-feed-time">{entry.time}</span>
          {entry.from && <span className="sdash-feed-from">{entry.from}</span>}
          {entry.type === "system" && <span className="sdash-feed-badge badge-system">SYS</span>}
          {entry.type === "broadcast" && <span className="sdash-feed-badge badge-bcast">BCAST</span>}
        </div>
        <p className="sdash-feed-text">{entry.text}</p>
      </div>
    </motion.div>
  );
}

function DecodeText({ text, startDelay = 0.5 }) {
  const words = text.split(" ");
  const wordStartIndices = [];
  let runningCount = 0;
  for (let w of words) {
    wordStartIndices.push(runningCount);
    runningCount += w.length + 1;
  }

  return (
    <>
      {words.map((word, wi) => {
        const wordStartIndex = wordStartIndices[wi];
        return (
          <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {word.split("").map((ch, ci) => {
              const delay = startDelay + (wordStartIndex + ci) * 0.028;
              return (
                <motion.span
                  key={ci}
                  style={{ display: "inline-block" }}
                  initial={{ opacity: 0, filter: "blur(10px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{ duration: 0.22, delay, ease: "easeOut" }}
                >
                  {ch}
                </motion.span>
              );
            })}
            {wi < words.length - 1 && "\u00A0"}
          </span>
        );
      })}
    </>
  );
}

function SignalBars({ signal }) {
  const lit = signal === "strong" ? 5 : signal === "weak" ? 2 : 0;
  return (
    <div className="sdash-sigbars" aria-label={`Signal: ${signal}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`sdash-sigbar ${i <= lit ? "sdash-sigbar-on" : ""}`}
          style={{ height: `${i * 5 + 8}px` }}
        />
      ))}
    </div>
  );
}

export default function SignalDashboard({ self, peers, broadcasts, board, signal, onNavigate }) {
  const [tick, setTick] = useState(0);
  const onlinePeers = peers.filter((p) => p.username !== self?.username && p.status === "online");
  const activeBroadcasts = broadcasts.length;
  const nodeCount = 14204;
  const latency = 42;

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const greeting = `Welcome back, ${self?.username ?? "Operator"}. The network held.`;
  const subline = `${onlinePeers.length} connection${onlinePeers.length !== 1 ? "s" : ""} nearby\u00A0·\u00A0${
    activeBroadcasts > 0
      ? `${activeBroadcasts} active broadcast${activeBroadcasts > 1 ? "s" : ""}`
      : "No active broadcasts"
  }`;

  return (
    <div className="sdash" role="main">

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="sdash-hero" aria-label="Welcome">
        {/* Background beams */}
        <div className="sdash-beams" aria-hidden="true">
          <div className="sdash-beam sdash-beam-a" />
          <div className="sdash-beam sdash-beam-b" />
          <div className="sdash-beam sdash-beam-c" />
        </div>

        {/* Pulse rings */}
        <div className="sdash-rings" aria-hidden="true">
          <svg viewBox="0 0 320 320" className="sdash-rings-svg">
            <defs>
              <radialGradient id="ring-self-g" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF6A1A" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#FF6A1A" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[50, 90, 130, 150].map((r, i) => (
              <circle
                key={r}
                cx="160" cy="160" r={r}
                className="sdash-ring"
                style={{ animationDelay: `${i * 0.55}s` }}
              />
            ))}
            <circle cx="160" cy="160" r="24" fill="url(#ring-self-g)" />
            <circle cx="160" cy="160" r="9" fill="#FF6A1A" opacity="0.95" />
            <circle cx="160" cy="160" r="4.5" fill="#fff" opacity="0.9" />
          </svg>
        </div>

        {/* Content */}
        <div className="sdash-hero-content">
          <motion.div
            className="sdash-eyebrow"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <span className="sdash-live-dot" />
            MESH ACTIVE&nbsp;·&nbsp;
            <span className="sdash-eyebrow-count">{nodeCount.toLocaleString()}</span>
            &nbsp;NODES ONLINE
          </motion.div>

          <h1 className="sdash-hero-title">
            <DecodeText text={greeting} startDelay={0.45} />
          </h1>

          <motion.p
            className="sdash-hero-sub"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.2, ease: "easeOut" }}
          >
            {subline}
          </motion.p>

          <motion.div
            className="sdash-hero-ctas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 2.5, ease: "easeOut" }}
          >
            <button className="sdash-cta-primary" onClick={() => onNavigate("map")}>
              <IconMap2 size={15} />
              Open Mesh Map
            </button>
            <button className="sdash-cta-outline" onClick={() => onNavigate("channel")}>
              <IconRadio size={15} />
              Join Channel
            </button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          BENTO GRID
      ═══════════════════════════════════════ */}
      <section className="sdash-section" aria-label="Network status">
        <motion.div
          className="sdash-section-heading"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <IconActivity size={13} className="sdash-heading-icon" />
          Network Status
        </motion.div>

        <div className="sdash-bento">
          {/* Tile 1 — Sparkline (large) */}
          <motion.div
            className="sdash-tile sdash-tile-lg"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="sdash-tile-head">
              <span className="sdash-tile-label">NODES RECONNECTED — LAST 24H</span>
              <span className="sdash-tile-stat amber-text">{nodeCount.toLocaleString()}</span>
            </div>
            <Sparkline data={NODE_HISTORY} />
            <div className="sdash-tile-foot mono">
              <span>Δ +2,104 since last cycle</span>
              <span className="green-text">↑ GROWING</span>
            </div>
          </motion.div>

          {/* Tile 2 — Contacts (medium) */}
          <motion.div
            className="sdash-tile sdash-tile-md"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.07, ease: "easeOut" }}
          >
            <div className="sdash-tile-head">
              <span className="sdash-tile-label">NEARBY CONTACTS</span>
              <span className="sdash-tile-stat green-text">{onlinePeers.length} online</span>
            </div>
            <div className="sdash-contacts-row">
              {peers.filter((p) => p.username !== self?.username).slice(0, 7).map((peer, i) => (
                <div key={peer.username} className="sdash-avatar-wrap" style={{ marginLeft: i > 0 ? "-10px" : 0, zIndex: 10 - i }}>
                  <div className={`sdash-avatar${peer.status === "online" ? " sdash-avatar-online" : ""}`}>
                    {peer.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`sdash-avatar-pip ${peer.status === "online" ? "pip-green" : "pip-dim"}`} />
                </div>
              ))}
              {peers.filter((p) => p.username !== self?.username).length === 0 && (
                <div className="sdash-no-contacts mono">[ SCANNING SECTOR... ]</div>
              )}
            </div>
            <div className="sdash-tile-foot mono">Sector 4-N mesh segment</div>
          </motion.div>

          {/* Tile 3 — Signal (small) */}
          <motion.div
            className="sdash-tile sdash-tile-sm"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.14, ease: "easeOut" }}
          >
            <div className="sdash-tile-label" style={{ marginBottom: "12px" }}>SIGNAL STRENGTH</div>
            <SignalBars signal={signal} />
            <div className="sdash-tile-stat mono" style={{ marginTop: "10px", fontSize: "12px" }}>
              {signal === "strong" ? (
                <span className="green-text">OPTIMAL</span>
              ) : signal === "weak" ? (
                <span className="amber-text">DEGRADED</span>
              ) : (
                <span style={{ color: "var(--red)" }}>NO LINK</span>
              )}
            </div>
            <div className="sdash-tile-foot mono">144.800 MHz</div>
          </motion.div>

          {/* Tile 4 — Broadcasts (small) */}
          <motion.div
            className={`sdash-tile sdash-tile-sm${activeBroadcasts > 0 ? " sdash-tile-alert" : ""}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.21, ease: "easeOut" }}
          >
            <div className="sdash-tile-label" style={{ marginBottom: "10px" }}>ACTIVE BROADCASTS</div>
            <div className="sdash-bcast-num">
              <span className={activeBroadcasts > 0 ? "amber-text" : "sdash-dim"}>
                {activeBroadcasts}
              </span>
              {activeBroadcasts > 0 && <span className="sdash-bcast-pulse" />}
            </div>
            <div className="sdash-tile-foot mono" style={{ color: activeBroadcasts > 0 ? "#FF6A1A" : undefined }}>
              {activeBroadcasts > 0 ? "EMERGENCY ACTIVE" : "ALL CLEAR"}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          QUICK ACTIONS
      ═══════════════════════════════════════ */}
      <section className="sdash-section" aria-label="Quick actions">
        <motion.div
          className="sdash-section-heading"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <IconSatellite size={13} className="sdash-heading-icon" />
          Quick Actions
        </motion.div>

        <div className="sdash-actions">
          <ActionCard
            delay={0}
            icon={<IconSearch size={20} />}
            title="Find Someone"
            desc="Search by callsign or last-known grid coordinates"
            accent="#39FF88"
            onClick={() => onNavigate("channel")}
          />
          <ActionCard
            delay={0.06}
            icon={<IconRadio size={20} />}
            title="Join Channel"
            desc="Open the sector relay coordination channel"
            accent="#39FF88"
            onClick={() => onNavigate("channel")}
          />
          <ActionCard
            delay={0.12}
            icon={<IconAlertTriangle size={20} />}
            title="Emergency Broadcast"
            desc="Send a priority alert to all nodes in range"
            accent="#FF6A1A"
            critical
            onClick={() => onNavigate("channel")}
          />
          <ActionCard
            delay={0.18}
            icon={<IconMap2 size={20} />}
            title="Mesh Map"
            desc="View live topology and peer-to-peer routing paths"
            accent="#39FF88"
            onClick={() => onNavigate("map")}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          MESH MAP PREVIEW
      ═══════════════════════════════════════ */}
      <section className="sdash-section" aria-label="Mesh network topology">
        <div className="sdash-section-head-row">
          <motion.div
            className="sdash-section-heading"
            style={{ marginBottom: 0 }}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <IconWifi size={13} className="sdash-heading-icon" />
            Mesh Network Topology
          </motion.div>
          <button className="sdash-expand-btn" onClick={() => onNavigate("map")}>
            Expand full map <IconArrowRight size={12} />
          </button>
        </div>

        <motion.div
          className="sdash-mesh-tile"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <MeshMapPreview peers={peers} self={self} />
          <div className="sdash-mesh-legend">
            <div className="sdash-legend-item">
              <span className="sdash-legend-dot" style={{ background: "#FF6A1A", boxShadow: "0 0 8px #FF6A1A" }} />
              <span>Your node</span>
            </div>
            <div className="sdash-legend-item">
              <span className="sdash-legend-dot" style={{ background: "#39FF88", boxShadow: "0 0 8px #39FF88" }} />
              <span>Peer online</span>
            </div>
            <div className="sdash-legend-item">
              <span className="sdash-legend-dot" style={{ background: "rgba(180,190,210,0.45)" }} />
              <span>Relay node</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════
          ACTIVITY FEED
      ═══════════════════════════════════════ */}
      <section className="sdash-section" aria-label="Recent activity">
        <motion.div
          className="sdash-section-heading"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <IconUsers size={13} className="sdash-heading-icon" />
          Recent Activity
        </motion.div>

        <div className="sdash-feed">
          <div className="sdash-feed-track" aria-hidden="true" />
          {FEED_ENTRIES.map((entry, i) => (
            <FeedEntry key={entry.id} entry={entry} index={i} />
          ))}
        </div>

        <motion.button
          className="sdash-load-more"
          onClick={() => onNavigate("channel")}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          Open full channel log <IconArrowRight size={12} />
        </motion.button>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer className="sdash-footer" aria-label="System status">
        <div className="sdash-footer-left">
          <span>SIGNAL//MESH&nbsp;v2.4.1</span>
          <span className="sdash-fsep">·</span>
          <span>PROTOCOL: RELAY-B</span>
          <span className="sdash-fsep">·</span>
          <span>LATENCY: {latency}ms</span>
        </div>
        <div className="sdash-footer-right">
          <span>Last sync: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          <span className="sdash-fsep">·</span>
          <button className="sdash-flink" onClick={() => onNavigate("channel")}>Channel</button>
          <button className="sdash-flink" onClick={() => onNavigate("board")}>
            <IconClipboardList size={11} /> Board
          </button>
        </div>
      </footer>

    </div>
  );
}
