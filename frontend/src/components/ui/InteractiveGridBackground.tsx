"use client";

import React, { useEffect, useRef } from "react";

export const InteractiveGridBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; opacity: number }[]>([]);
  const waveOffsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseDown = (e: MouseEvent) => {
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.25,
        opacity: 0.25,
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousedown", handleMouseDown);

    const telemetryStrings = [
      "SYS.LOC.MESH // LINK_OK",
      "SEC_CH: 04 // FREQ: 2.445GHZ",
      "NET_STATUS: ACTIVE // HUB_SRV",
      "TX_PWR: 20dBm // RX_SENS: -98dBm",
      "COORDINATES: 45.109N / 12.344E",
      "PACKET_LOSS: 0.00% // HOP_COUNT: 1",
      "BANDWIDTH: 115200 BPS // RAW_LINK",
      "PEER_COUNT: -- // MESH_NET_OK"
    ];

    const noisePoints: { x: number; y: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 60; i++) {
      noisePoints.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.2 + 0.5,
        alpha: Math.random() * 0.08 + 0.02
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(14, 240, 251, 0.008)";
      const gridSize = 80;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      noisePoints.forEach(p => {
        ctx.fillStyle = `rgba(14, 240, 251, ${p.alpha})`;
        ctx.fillRect(p.x * width, p.y * height, p.size, p.size);
      });

      waveOffsetRef.current += 0.015;
      const sweepY = (waveOffsetRef.current * 80) % (height + 200) - 100;
      if (sweepY > 0 && sweepY < height) {
        const grad = ctx.createLinearGradient(0, sweepY - 50, 0, sweepY + 50);
        grad.addColorStop(0, "rgba(14, 240, 251, 0)");
        grad.addColorStop(0.5, "rgba(14, 240, 251, 0.02)");
        grad.addColorStop(1, "rgba(14, 240, 251, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - 50, width, 100);

        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(width, sweepY);
        ctx.strokeStyle = "rgba(14, 240, 251, 0.035)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "rgba(14, 240, 251, 0.012)";
      for (let x = 0; x < width; x += 5) {
        const y = height - 60 + Math.sin(x * 0.005 + waveOffsetRef.current * 0.5) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = "rgba(58, 79, 107, 0.25)";
      ctx.textAlign = "left";
      
      ctx.fillText(telemetryStrings[0], 24, 40);
      ctx.fillText(telemetryStrings[1], 24, 55);
      ctx.fillText(telemetryStrings[2], 24, 70);

      ctx.textAlign = "right";
      ctx.fillText(telemetryStrings[3], width - 24, 40);
      ctx.fillText(telemetryStrings[4], width - 24, 55);
      ctx.fillText(telemetryStrings[5], width - 24, 70);

      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        ripple.radius += 3.5;
        ripple.opacity -= 0.005;

        if (ripple.opacity <= 0) return false;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(14, 240, 251, ${ripple.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        return true;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleMouseDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
};
