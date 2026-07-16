import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { audioManager } from "../utils/audio.js";
import { IconRadio } from "@tabler/icons-react";

const ICON_GLYPHS = {
  radio: "◉",
  lantern: "◈",
  compass: "✛",
  beacon: "▲",
  anchor: "⚓",
  signal: "≡",
};

const DEVICE_LABELS = {
  radio: "Portable Field Radio Set",
  lantern: "Emergency Beacon Unit",
  compass: "Tactical Direction Finder",
  beacon: "Static Repeater Node",
  anchor: "Command Base Transceiver",
  signal: "Mesh Auxiliary Relayer",
};

function project3D(x, y, z, fov, cx, cy, camDist) {
  const scale = fov / (fov + z + camDist);
  return { x: cx + x * scale, y: cy + y * scale, scale };
}

function rotatePoint(x, y, z, rotX, rotY) {
  const rx = x * Math.cos(rotY) - z * Math.sin(rotY);
  const ry = y;
  const rz = x * Math.sin(rotY) + z * Math.cos(rotY);
  const fx = rx;
  const fy = ry * Math.cos(rotX) - rz * Math.sin(rotX);
  const fz = ry * Math.sin(rotX) + rz * Math.cos(rotX);
  return { x: fx, y: fy, z: fz };
}

function Sparkles() {
  const sparks = [
    { style: { top: "6px",  left: "-8px",  animationDelay: "0s",    animationDuration: "5.2s" } },
    { style: { top: "-4px", left: "40%",   animationDelay: "1.3s",  animationDuration: "6.8s" } },
    { style: { top: "18px", left: "80%",   animationDelay: "2.1s",  animationDuration: "4.9s" } },
    { style: { top: "0px",  left: "110%",  animationDelay: "0.7s",  animationDuration: "7.4s" } },
    { style: { top: "28px", left: "55%",   animationDelay: "3.5s",  animationDuration: "5.6s" } },
  ];
  return (
    <>
      {sparks.map((s, i) => (
        <span key={i} className="nmap-sparkle" style={s.style} aria-hidden="true" />
      ))}
    </>
  );
}

function DisabledTooltip({ lastSeen }) {
  const time = lastSeen
    ? new Date(lastSeen * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;
  return (
    <div className="nmap-tooltip" role="tooltip" id="nmap-disabled-tip">
      Node unreachable{time ? ` — last seen ${time}` : " — no signal"}
    </div>
  );
}

export default function NetworkMap({ peers, self, onSelectPeer }) {
  const canvasRef     = useRef(null);
  const animRef       = useRef(null);
  const rotRef        = useRef({ x: 0.3, y: 0 });
  const dragRef       = useRef({ dragging: false, lastX: 0, lastY: 0, startX: 0, startY: 0 });
  const autoRotRef    = useRef(true);
  const tickRef       = useRef(0);
  const nodesRef      = useRef([]);
  const sizeRef       = useRef({ w: 0, h: 0 });          // updated by ResizeObserver only
  const colorsRef     = useRef({});                        // CSS var values read at mount
  const reducedMotion = useRef(false);
  const coarsePointer = useRef(false);
  const rippleRef     = useRef(null);                      // { x, y, frame } for canvas miss feedback
  const isMobileSheet = useRef(false);                     // true when <768px

  const [selectedNode, setSelectedNode]     = useState(null);
  const [hoveredNode,  setHoveredNode]      = useState(null);
  const [tappedNode,   setTappedNode]       = useState(null);   // for CSS tap-pulse on SR items
  const [announcement, setAnnouncement]    = useState("");      // aria-live text
  const [isMobile,     setIsMobile]         = useState(false);

  const others      = peers.filter((p) => p.username !== self?.username);
  const onlineCount = others.filter((p) => p.status === "online").length;
  const allNodes    = [
    { username: self?.username, deviceIcon: self?.deviceIcon, status: "online", isSelf: true },
    ...others,
  ];
  const nodeCount = allNodes.length;

  const canvasAriaLabel = `Network map: ${nodeCount} node${nodeCount !== 1 ? "s" : ""}, ${onlineCount} online, hub relay active`;

  const buildNodes = useCallback(() => {
    const nodeRadius = 240;
    return allNodes.map((n, i) => {
      if (n.isSelf) return { ...n, pos3d: { x: 0, y: 0, z: 0 } };
      const peerIdx   = i - 1;
      const peerCount = allNodes.length - 1;
      const phi       = Math.acos(1 - (2 * (peerIdx + 0.5)) / Math.max(peerCount, 1));
      const theta     = Math.PI * (1 + Math.sqrt(5)) * peerIdx;
      return {
        ...n,
        pos3d: {
          x: nodeRadius * Math.sin(phi) * Math.cos(theta),
          y: nodeRadius * 0.4 * Math.cos(phi),
          z: nodeRadius * Math.sin(phi) * Math.sin(theta),
        },
      };
    });
  }, [peers, self]);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    colorsRef.current = {
      teal:      cs.getPropertyValue("--teal").trim()   || "#0ef0fb",
      amber:     cs.getPropertyValue("--amber").trim()  || "#f5a623",
      violet:    cs.getPropertyValue("--violet").trim() || "#9b6dff",
      textFaint: cs.getPropertyValue("--text-faint").trim() || "#3a4f6b",
    };

    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion.current) autoRotRef.current = false;

    coarsePointer.current = window.matchMedia("(pointer: coarse)").matches;

    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    isMobileSheet.current = mq.matches;
    const handleMQ = (e) => { setIsMobile(e.matches); isMobileSheet.current = e.matches; };
    mq.addEventListener("change", handleMQ);
    return () => mq.removeEventListener("change", handleMQ);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        if (w === sizeRef.current.w && h === sizeRef.current.h) return;
        sizeRef.current = { w, h };
        canvas.width  = w * dpr;
        canvas.height = h * dpr;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
      }
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      tickRef.current++;
      const tick = tickRef.current;
      const { w, h } = sizeRef.current;
      if (!w || !h) { animRef.current = requestAnimationFrame(draw); return; }

      const C = colorsRef.current; // color shortcuts
      const cx = w / 2;
      const cy = h / 2;
      const fov = 650;
      const camDist = 10;

      if (autoRotRef.current && !reducedMotion.current) {
        rotRef.current.y += 0.003;
      }

      const nodes = buildNodes();

      ctx.clearRect(0, 0, w, h);

      const gridSize = 600, gridStep = 60, gridOpacity = 0.08;
      ctx.save();
      for (let gx = -gridSize; gx <= gridSize; gx += gridStep) {
        const p1 = project3D(...Object.values(rotatePoint(gx, 120, -gridSize, rotRef.current.x, rotRef.current.y)), fov, cx, cy, camDist);
        const p2 = project3D(...Object.values(rotatePoint(gx, 120, gridSize, rotRef.current.x, rotRef.current.y)), fov, cx, cy, camDist);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(14,240,251,${gridOpacity})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let gz = -gridSize; gz <= gridSize; gz += gridStep) {
        const p1 = project3D(...Object.values(rotatePoint(-gridSize, 120, gz, rotRef.current.x, rotRef.current.y)), fov, cx, cy, camDist);
        const p2 = project3D(...Object.values(rotatePoint(gridSize, 120, gz, rotRef.current.x, rotRef.current.y)), fov, cx, cy, camDist);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(14,240,251,${gridOpacity})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.restore();

      const drawOrbitRing = (radius, color, dashOn, dashOff, lw) => {
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2;
          const rot = rotatePoint(radius * Math.cos(a), 0, radius * Math.sin(a), rotRef.current.x, rotRef.current.y);
          const proj = project3D(rot.x, rot.y, rot.z, fov, cx, cy, camDist);
          i === 0 ? ctx.moveTo(proj.x, proj.y) : ctx.lineTo(proj.x, proj.y);
        }
        ctx.closePath();
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.setLineDash([dashOn, dashOff]); ctx.stroke(); ctx.setLineDash([]);
      };
      drawOrbitRing(240, `rgba(14,240,251,0.10)`, 4, 8, 1);
      drawOrbitRing(120, `rgba(245,166,35,0.06)`, 2, 6, 0.5);

      const projectedNodes = nodes.map((n) => {
        const rot  = rotatePoint(n.pos3d.x, n.pos3d.y, n.pos3d.z, rotRef.current.x, rotRef.current.y);
        const proj = project3D(rot.x, rot.y, rot.z, fov, cx, cy, camDist);
        return { ...n, proj, rotZ: rot.z };
      });
      nodesRef.current = projectedNodes;

      const sorted = [...projectedNodes].sort((a, b) => a.rotZ - b.rotZ);
      const hubProj = projectedNodes.find((n) => n.isSelf)?.proj || { x: cx, y: cy };

      projectedNodes.filter((n) => !n.isSelf).forEach((n) => {
        const isOnline = n.status === "online";
        ctx.beginPath(); ctx.moveTo(hubProj.x, hubProj.y); ctx.lineTo(n.proj.x, n.proj.y);
        ctx.strokeStyle = isOnline ? `rgba(14,240,251,0.15)` : `rgba(71,85,105,0.2)`;
        ctx.lineWidth   = isOnline ? 1.5 : 1;
        if (!isOnline) ctx.setLineDash([2, 5]);
        ctx.stroke(); ctx.setLineDash([]);

        if (isOnline && !reducedMotion.current) {
          [[1.5, 1.0, "rgba(14,240,251,0.9)", 0, 2.5], [1.5, 0.5, "rgba(14,240,251,0.5)", 50, 2]].forEach(([speed, , color, offset, r]) => {
            const t  = (((tick * speed) + offset) % 100) / 100;
            const px = hubProj.x + (n.proj.x - hubProj.x) * t;
            const py = hubProj.y + (n.proj.y - hubProj.y) * t;
            ctx.beginPath(); ctx.arc(px, py, r * n.proj.scale, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = `rgba(14,240,251,0.8)`; ctx.shadowBlur = 6;
            ctx.fill(); ctx.shadowBlur = 0;
          });
        }
      });

      sorted.forEach((n) => {
        const { proj } = n;
        const isOnline   = n.status === "online";
        const isSelected = selectedNode?.username === n.username;
        const isHovered  = hoveredNode === n.username;

        const baseColor = n.isSelf ? C.violet : isOnline ? C.teal : C.textFaint;
        const nodeR  = (n.isSelf ? 18 : 13) * proj.scale;
        const glowR  = nodeR + 8 * proj.scale;

        if (isOnline && !reducedMotion.current) {
          const pingT = (tick % 80) / 80;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, nodeR + pingT * 20 * proj.scale, 0, Math.PI * 2);
          ctx.strokeStyle = `${baseColor}${Math.floor((1 - pingT) * 40).toString(16).padStart(2, "0")}`;
          ctx.lineWidth = 1; ctx.stroke();
        }

        if (isOnline || n.isSelf) {
          const grad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowR);
          grad.addColorStop(0, n.isSelf ? "rgba(139,92,246,0.3)" : "rgba(14,240,251,0.25)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(proj.x, proj.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grad; ctx.fill();
        }

        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, nodeR + 6 * proj.scale, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? "rgba(255,255,255,0.8)" : baseColor;
          ctx.lineWidth   = isSelected ? 2 : 1;
          ctx.setLineDash(isSelected ? [4, 3] : []);
          ctx.stroke(); ctx.setLineDash([]);
        }

        ctx.beginPath(); ctx.arc(proj.x, proj.y, nodeR, 0, Math.PI * 2);
        ctx.fillStyle   = n.isSelf ? "rgba(19,12,42,0.95)" : isOnline ? "rgba(6,26,38,0.95)" : "rgba(15,20,32,0.95)";
        ctx.fill();
        ctx.strokeStyle = isSelected ? "white" : baseColor;
        ctx.lineWidth   = isSelected ? 2.5 * proj.scale : 1.8 * proj.scale;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur  = isOnline || n.isSelf ? 8 : 0;
        ctx.stroke(); ctx.shadowBlur = 0;

        const glyph = ICON_GLYPHS[n.deviceIcon] || "◉";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font      = `${Math.round((n.isSelf ? 15 : 12) * proj.scale)}px "Inter", system-ui, sans-serif`;
        ctx.fillStyle = baseColor; ctx.shadowColor = baseColor; ctx.shadowBlur = 6;
        ctx.fillText(glyph, proj.x, proj.y); ctx.shadowBlur = 0;

        const labelY = proj.y + nodeR + 14 * proj.scale;
        ctx.font      = `600 ${Math.round(10 * proj.scale)}px "Inter", system-ui, sans-serif`;
        ctx.fillStyle = isSelected ? "#ffffff" : n.isSelf ? "#b39dfa" : isOnline ? "#d0e8f5" : "#4a5c73";
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(n.username.toUpperCase(), proj.x, labelY);

        const subY = labelY + Math.round(13 * proj.scale);
        ctx.font  = `500 ${Math.round(7.5 * proj.scale)}px "JetBrains Mono", "Share Tech Mono", monospace`;
        if (n.isSelf) {
          ctx.fillStyle = "rgba(155,109,255,0.55)"; ctx.fillText("◆ LOCAL NODE", proj.x, subY);
        } else if (isOnline) {
          ctx.fillStyle = "rgba(14,240,251,0.45)"; ctx.fillText("● ONLINE", proj.x, subY);
        } else {
          ctx.fillStyle = "rgba(58,79,107,0.6)"; ctx.fillText("○ OFFLINE", proj.x, subY);
        }

        n._projX = proj.x; n._projY = proj.y; n._projR = nodeR;
      });

      const hubR = 12 * (hubProj.scale || 1);
      ctx.beginPath(); ctx.arc(hubProj.x, hubProj.y, hubR * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 166, 35, 0.04)"; ctx.fill();
      ctx.beginPath(); ctx.arc(hubProj.x, hubProj.y, hubR * 2.0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(245, 166, 35, 0.35)"; ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(hubProj.x, hubProj.y, hubR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8, 13, 24, 0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(245, 166, 35, 0.7)"; ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(245, 166, 35, 0.5)"; ctx.shadowBlur = 8;
      ctx.stroke(); ctx.shadowBlur = 0;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(8 * (hubProj.scale || 1))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "rgba(245, 166, 35, 0.9)"; ctx.fillText("HUB", hubProj.x, hubProj.y);
      ctx.font = `500 ${Math.round(7 * (hubProj.scale || 1))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "rgba(245, 166, 35, 0.45)"; ctx.textBaseline = "top";
      ctx.fillText("RELAY.SRV", hubProj.x, hubProj.y + hubR + 6 * (hubProj.scale || 1));

      if (rippleRef.current) {
        const { x, y, frame } = rippleRef.current;
        const progress = frame / 18; // 0 → 1 over 18 frames
        const radius   = progress * 30;
        const opacity  = 1 - progress;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.4})`;
        ctx.lineWidth   = 1.5; ctx.stroke();
        rippleRef.current.frame++;
        if (rippleRef.current.frame > 18) rippleRef.current = null;
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(animRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [peers, self, selectedNode, hoveredNode, buildNodes]);

  const hitRadius = (nodeR) => nodeR + (coarsePointer.current ? 12 : 6);

  const selectNode = useCallback((node) => {
    audioManager.playKeystroke();
    const next = node?.username === selectedNode?.username ? null : node;
    setSelectedNode(next);
    if (next) {
      const status = next.isSelf ? "local node, active" : `${next.status}, ${next.status === "online" ? "direct channel available" : "unreachable"}`;
      setAnnouncement(`Node ${next.username.toUpperCase()} selected — ${status}`);
    } else {
      setAnnouncement("Node deselected");
    }
  }, [selectedNode]);

  const handleMouseDown = useCallback((e) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY };
    autoRotRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (dragRef.current.dragging) {
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      rotRef.current.y += dx * 0.005;
      rotRef.current.x += dy * 0.005;
      rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x));
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    } else {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let found = null;
      nodesRef.current.forEach((n) => {
        if (n._projX && Math.hypot(mx - n._projX, my - n._projY) < hitRadius(n._projR)) found = n.username;
      });
      setHoveredNode(found);
    }
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const dist = Math.hypot(e.clientX - dragRef.current.startX, e.clientY - dragRef.current.startY);
    dragRef.current.dragging = false;
    setTimeout(() => { autoRotRef.current = true; }, 3000);

    if (dist < 6) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let hit = null;
      nodesRef.current.forEach((n) => {
        if (n._projX && Math.hypot(mx - n._projX, my - n._projY) < hitRadius(n._projR)) hit = n;
      });
      if (hit) {
        selectNode(hit);
      } else {
        rippleRef.current = { x: mx, y: my, frame: 0 };
      }
    }
  }, [selectNode]);

  const handleMouseLeave = useCallback(() => {
    dragRef.current.dragging = false;
    setHoveredNode(null);
  }, []);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    dragRef.current = { dragging: true, startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY };
    autoRotRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.lastX;
    const dy = t.clientY - dragRef.current.lastY;
    rotRef.current.y += dx * 0.005;
    rotRef.current.x += dy * 0.005;
    rotRef.current.x = Math.max(-1.2, Math.min(1.2, rotRef.current.x));
    dragRef.current.lastX = t.clientX;
    dragRef.current.lastY = t.clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!dragRef.current.dragging) return;
    const startX = dragRef.current.startX, startY = dragRef.current.startY;
    dragRef.current.dragging = false;
    setTimeout(() => { autoRotRef.current = true; }, 3000);

    const changedTouch = e.changedTouches[0];
    if (!changedTouch) return;
    const dist = Math.hypot(changedTouch.clientX - startX, changedTouch.clientY - startY);
    if (dist < 10) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = changedTouch.clientX - rect.left, my = changedTouch.clientY - rect.top;
      let hit = null;
      nodesRef.current.forEach((n) => {
        if (n._projX && Math.hypot(mx - n._projX, my - n._projY) < hitRadius(n._projR)) hit = n;
      });
      if (hit) {
        setTappedNode(hit.username);
        setTimeout(() => setTappedNode(null), 160);
        selectNode(hit);
      } else {
        rippleRef.current = { x: mx, y: my, frame: 0 };
      }
    }
  }, [selectNode]);

  const sidebarVariants = isMobile
    ? {
        hidden:  { y: "100%", opacity: 0 },
        visible: { y: 0,      opacity: 1, transition: { type: "spring", damping: 28, stiffness: 300 } },
        exit:    { y: "100%", opacity: 0, transition: { duration: 0.22 } },
      }
    : {
        hidden:  { width: 0, opacity: 0 },
        visible: { width: 300,   opacity: 1, transition: { type: "spring", damping: 28, stiffness: 300 } },
        exit:    { width: 0, opacity: 0, transition: { duration: 0.22 } },
      };

  const telemCells = selectedNode
    ? [
        { label: "STATUS",   value: selectedNode.isSelf ? "ACTIVE" : selectedNode.status.toUpperCase(),
          color: selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--text-faint)" },
        { label: "LAST RX",  value: selectedNode.isSelf ? "CONT." : selectedNode.status === "online" ? "NOW" : selectedNode.lastSeen ? new Date(selectedNode.lastSeen * 1000).toLocaleTimeString() : "—" },
        { label: "SECTOR",   value: "LAN MESH" },
        { label: "PROTOCOL", value: "HUB-SPOKE" },
        { label: "FREQ",     value: "2.4 GHz" },
        { label: "CHANNEL",  value: "SRV:RELAY", color: "var(--teal)" },
      ]
    : [];

  return (
    <section className="nmap-view" aria-label="Network map">

      {/* ── Visually-hidden aria-live announcement region ── */}
      <div
        className="nmap-sr-announce"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      {/* ── Visually-hidden keyboard-accessible node list ── */}
      <ul
        className="nmap-sr-list"
        role="listbox"
        aria-label="Network nodes — keyboard navigation"
        aria-multiselectable="false"
      >
        {allNodes.map((n) => (
          <li
            key={n.username}
            role="option"
            aria-selected={selectedNode?.username === n.username}
          >
            <button
              className={[
                "nmap-sr-item",
                hoveredNode === n.username   ? "nmap-sr-item--hovered"  : "",
                tappedNode  === n.username   ? "nmap-sr-item--tapped"   : "",
                selectedNode?.username === n.username ? "nmap-sr-item--selected" : "",
              ].join(" ").trim()}
              onClick={() => selectNode(n)}
              aria-label={`${n.username}${n.isSelf ? " (you)" : ""} — ${n.isSelf ? "local node, active" : n.status}`}
            >
              <span aria-hidden="true">{ICON_GLYPHS[n.deviceIcon] || "◉"}</span>
              <span>{n.username.toUpperCase()}</span>
              <span className="nmap-sr-item-status">
                {n.isSelf ? "LOCAL" : n.status.toUpperCase()}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* ── Full-height 3D Canvas area ── */}
      <div className="nmap-3d-wrap">
        <canvas
          ref={canvasRef}
          className="nmap-3d-canvas"
          role="img"
          aria-label={canvasAriaLabel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: hoveredNode ? "pointer" : dragRef.current?.dragging ? "grabbing" : "grab" }}
          tabIndex={-1}
          aria-hidden="false"
        />

        {/* ── Top-left title block with sparkles ── */}
        <div className="nmap-title-overlay" aria-hidden="true">
          <Sparkles />
          <div className="nmap-title-eyebrow">RELAY NETWORK</div>
          <div className="nmap-title-main">Network Map</div>
        </div>

        {/* ── Top-right HUD ── */}
        <div className="nmap-hud nmap-hud-tr" aria-hidden="true">
          <div>TOPOLOGY: HUB-SPOKE</div>
          <div style={{ color: "var(--teal)" }}>FREQ: 2.4 GHz [LOCK]</div>
        </div>

        {/* ── Bottom status bar ── */}
        <div className="nmap-bottom-bar" aria-hidden="true">
          <div className="nmap-status-chips">
            <div className="nmap-chip nmap-chip-hub">
              <span className="nmap-chip-dot nmap-chip-dot-amber" />
              HUB RELAY ACTIVE
            </div>
            <div className={`nmap-chip ${onlineCount > 0 ? "nmap-chip-online" : "nmap-chip-offline"}`}>
              <span className={`nmap-chip-dot ${onlineCount > 0 ? "nmap-chip-dot-teal" : "nmap-chip-dot-dim"}`} />
              {onlineCount}/{others.length} ONLINE
            </div>
            <div className="nmap-chip nmap-chip-freq">
              <span className="nmap-chip-dot nmap-chip-dot-violet" />
              {peers.length} NODES
            </div>
          </div>
          <div className="nmap-3d-hint">
            <span aria-hidden="true">⟳</span> Drag to orbit · Click to inspect
          </div>
        </div>
      </div>

      {/* ── Node detail sidebar (motion/react animated) ── */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <motion.aside
            key="nmap-sidebar"
            className={`nmap-sidebar ${isMobile ? "nmap-sidebar-mobile" : ""}`}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="complementary"
            aria-label={`Node details: ${selectedNode.username}`}
          >
            {/* Header */}
            <div
              className="nmap-sidebar-header"
              style={{
                borderBottomColor: selectedNode.isSelf
                  ? "rgba(155,109,255,0.2)"
                  : selectedNode.status === "online"
                  ? "rgba(14,240,251,0.15)"
                  : "var(--border)",
              }}
            >
              <div className="nmap-sidebar-eyebrow">NODE INSPECTION</div>
              <button
                className="nmap-sidebar-close"
                onClick={() => { audioManager.playKeystroke(); setSelectedNode(null); setAnnouncement("Inspection panel closed"); }}
                aria-label="Close node inspection"
              >
                ✕
              </button>
            </div>

            {/* Identity */}
            <div className="nmap-sidebar-identity">
              <div
                className="nmap-sidebar-avatar"
                style={{
                  borderColor: selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--border)",
                  boxShadow:   selectedNode.isSelf ? "0 0 20px rgba(155,109,255,0.3)" : selectedNode.status === "online" ? "0 0 20px rgba(14,240,251,0.2)" : "none",
                  background:  selectedNode.isSelf ? "rgba(155,109,255,0.06)" : selectedNode.status === "online" ? "rgba(14,240,251,0.05)" : "rgba(22,33,58,0.5)",
                }}
              >
                <span
                  className="nmap-sidebar-glyph"
                  style={{ color: selectedNode.isSelf ? "var(--violet)" : selectedNode.status === "online" ? "var(--teal)" : "var(--text-faint)" }}
                >
                  {ICON_GLYPHS[selectedNode.deviceIcon] || "◉"}
                </span>
              </div>
              <div className="nmap-sidebar-name-block">
                <div className="nmap-sidebar-callsign">
                  {selectedNode.username.toUpperCase()}
                  {selectedNode.isSelf && <span className="nmap-sidebar-you-badge">YOU</span>}
                </div>
                <div className="nmap-sidebar-device-label">{DEVICE_LABELS[selectedNode.deviceIcon] || "Unknown Device"}</div>
                <div className={`nmap-sidebar-status-pill ${selectedNode.isSelf ? "status-self" : selectedNode.status === "online" ? "status-online" : "status-offline"}`}>
                  <span className="status-dot" />
                  {selectedNode.isSelf ? "LOCAL — ACTIVE" : selectedNode.status === "online" ? "REACHABLE — ONLINE" : "UNREACHABLE — OFFLINE"}
                </div>
              </div>
            </div>

            <div className="nmap-sidebar-divider" />

            {/* Telemetry grid — staggered */}
            <div className="nmap-sidebar-section-label">SIGNAL TELEMETRY</div>
            <div className="nmap-sidebar-tele-grid">
              {telemCells.map((cell, i) => (
                <motion.div
                  key={cell.label}
                  className="nmap-tele-cell"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                >
                  <div className="nmap-tele-label">{cell.label}</div>
                  <div className="nmap-tele-value" style={cell.color ? { color: cell.color } : undefined}>
                    {cell.value}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="nmap-sidebar-divider" />

            {/* Device info */}
            <div className="nmap-sidebar-section-label">DEVICE INFO</div>
            <div className="nmap-sidebar-device-info">
              <div className="nmap-device-row">
                <span className="nmap-device-icon">{ICON_GLYPHS[selectedNode.deviceIcon] || "◉"}</span>
                <div>
                  <div className="nmap-device-name">{DEVICE_LABELS[selectedNode.deviceIcon] || "Unknown"}</div>
                  <div className="nmap-device-type mono">TYPE: {selectedNode.deviceIcon?.toUpperCase() || "RADIO"}</div>
                </div>
              </div>
            </div>

            <div className="nmap-sidebar-divider" />

            {/* Actions */}
            {!selectedNode.isSelf && (
              <>
                <div className="nmap-sidebar-section-label">ACTIONS</div>
                <div className="nmap-sidebar-actions">
                  <div className="nmap-action-wrapper">
                    <button
                      className={`nmap-action-btn nmap-action-primary ${selectedNode.status !== "online" ? "nmap-action-disabled" : ""}`}
                      onClick={() => {
                        if (selectedNode.status === "online") {
                          audioManager.playLock();
                          onSelectPeer(selectedNode.username);
                        }
                      }}
                      disabled={selectedNode.status !== "online"}
                      aria-describedby={selectedNode.status !== "online" ? "nmap-disabled-tip" : undefined}
                    >
                      <IconRadio size={15} />
                      <span>Open Direct Channel</span>
                    </button>
                    {selectedNode.status !== "online" && (
                      <DisabledTooltip lastSeen={selectedNode.lastSeen} />
                    )}
                  </div>
                  <div className="nmap-action-note mono">
                    {selectedNode.status === "online"
                      ? "↳ Route a private packet to this node"
                      : "↳ Node unreachable — cannot establish link"}
                  </div>
                </div>
              </>
            )}

            {selectedNode.isSelf && (
              <div className="nmap-sidebar-self-note mono">
                This is your local node. You are the relay origin point for this mesh network.
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </section>
  );
}
