// DrudeSommerfeld.js
import React, { useEffect, useRef, useState } from "react";

/**
 * Drude–Sommerfeld Visualization (k-space)
 * ----------------------------------------
 * Visualizes:
 * - Fermi sea (disk), Fermi surface, thermal shell thickness δk ~ kB T / (ħ v_F)
 * - Shift in distribution Δk = e E τ / ħ
 * - Only states near the Fermi surface contribute to current
 *
 * Controls:
 * - Electric field E (V/m), Temperature T (K), Relaxation time τ (s),
 *   Effective mass m* (relative to m_e), Electron density n (m^-3).
 *
 * Metrics:
 * - EF, kF, vF, Δk, δk, drift velocity v_d = eEτ / m*, current density J = n e v_d.
 *
 * Notes:
 * - The k-space drawing is a 2D slice (Fermi "disk") for pedagogy; the physics is 3D.
 * - Units are realistic; the visualization rescales internally for clarity.
 */

const e = 1.602176634e-19;      // C
const hbar = 1.054571817e-34;   // J·s
const me = 9.10938356e-31;      // kg
const kB = 1.380649e-23;        // J/K

// Reasonable defaults (copper-like)
const DEFAULTS = {
  n: 8.5e28,          // m^-3
  mstarOverMe: 1.0,   // effective mass / me
  tau: 1.6e-14,       // s (room temp order)
  T: 300,             // K
  E: 0.10,            // V/m (small field typical for bulk metal)
};

export default function DrudeSommerfeld() {
  // Controls
  const [E, setE] = useState(DEFAULTS.E);                      // V/m
  const [T, setT] = useState(DEFAULTS.T);                      // K
  const [tau, setTau] = useState(DEFAULTS.tau);               // s
  const [mstarOverMe, setMstarOverMe] = useState(DEFAULTS.mstarOverMe);
  const [n, setN] = useState(DEFAULTS.n);                     // m^-3

  // Canvas refs
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const animRef = useRef(null);
  const lastRef = useRef(null);
  const phaseRef = useRef(0); // small phase for subtle animation

  // Derived quantities (recomputed in draw)
  const metricsRef = useRef({
    EF: 0,
    kF: 0,
    vF: 0,
    deltaK: 0,
    deltaK_shell: 0,
    vd: 0,
    J: 0,
  });

  // Setup canvas and animation
  useEffect(() => {
    const cvs = canvasRef.current;
    const ctx = cvs.getContext("2d");
    ctxRef.current = ctx;

    const resize = () => {
      const parent = cvs.parentElement;
      const width = Math.max(320, Math.min(920, parent ? parent.clientWidth : 640));
      const height = Math.round(width * 0.52);
      const dpr = window.devicePixelRatio || 1;

      cvs.width = Math.floor(width * dpr);
      cvs.height = Math.floor(height * dpr);
      cvs.style.width = `${width}px`;
      cvs.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = (t) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;
      phaseRef.current += dt; // for subtle motion
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main draw routine (no heavy physics work; just algebra + drawing)
  const draw = () => {
    const cvs = canvasRef.current;
    const ctx = ctxRef.current;
    if (!cvs || !ctx) return;

    const W = cvs.clientWidth;
    const H = cvs.clientHeight;

    // Background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1226");
    g.addColorStop(1, "#1a2a5e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // ---- Physics (derived) ----
    const mstar = mstarOverMe * me;

    // 3D free-electron (Sommerfeld) relations:
    // kF = (3π^2 n)^(1/3)
    // EF = ħ^2 kF^2 / (2 m*)
    // vF = ħ kF / m*
    const kF = Math.cbrt(3 * Math.PI ** 2 * n);
    const EF = (hbar ** 2 * kF ** 2) / (2 * mstar);
    const vF = (hbar * kF) / mstar;

    // Shell thickness in k due to thermal smearing: δk ~ kB T / (ħ vF)
    const deltaK_shell = (kB * Math.max(1, T)) / (hbar * Math.max(1e-12, vF));

    // Field-induced shift of the distribution: Δk = e E τ / ħ
    const deltaK = (e * Math.max(0, E) * Math.max(1e-16, tau)) / hbar;

    // Drude–Sommerfeld drift and current density (same algebraic forms as Drude, but m*)
    const vd = (e * E * tau) / mstar;          // m/s
    const J = n * e * vd;                      // A/m^2

    metricsRef.current = { EF, kF, vF, deltaK, deltaK_shell, vd, J };

    // ---- k-space visualization mapping ----
    // We'll map k in units of kF to pixels: radius Rpx corresponds to kF
    const cx = W * 0.30; // k-space diagram center x
    const cy = H * 0.55;
    const Rpx = Math.min(W, H) * 0.32; // radius for kF

    // Small dynamic wobble of shell for life
    const wobble = 0.5 * Math.sin(phaseRef.current * 1.3);

    // Helper to draw a circle
    const circle = (x, y, r, color, fill = true, dash = []) => {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash(dash);
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    };

    // Title
    ctx.fillStyle = "#eff6ff";
    ctx.font = "600 16px Inter, system-ui, sans-serif";
    ctx.fillText("k-space: Fermi sea (2D slice)", cx - Rpx, cy - Rpx - 16);

    // Fermi sea (disk)
    circle(cx, cy, Rpx, "rgba(120,170,255,0.20)", true);

    // Fermi surface
    circle(cx, cy, Rpx, "rgba(240,250,255,0.9)", false);

    // Thermal shell thickness δk (draw as a ring around Rpx)
    const shellPx = Math.max(1, (deltaK_shell / kF) * Rpx + wobble);
    circle(cx, cy, Rpx + shellPx, "rgba(255,210,120,0.12)", true);
    circle(cx, cy, Rpx - shellPx, "rgba(11,18,38,1)", true); // carve inner part to make a ring

    // Shifted distribution by Δk: draw the Fermi surface shifted left (electron response opposite E)
    const dpx = (deltaK / kF) * Rpx; // pixel shift corresponding to Δk
    const cxShift = cx - dpx; // electrons shift opposite field
    circle(cxShift, cy, Rpx, "rgba(255,110,110,0.18)", true);
    circle(cxShift, cy, Rpx, "rgba(255,120,120,0.9)", false, [6, 6]);

    // Arrow for Δk
    const ax0 = cx, ay0 = cy - Rpx - 24;
    const ax1 = cxShift, ay1 = ay0;
    drawArrow(ctx, ax0, ay0, ax1, ay1, "Δk", "#fecaca");

    // Reference axes (k_x, k_y)
    ctx.strokeStyle = "rgba(240,248,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - Rpx - 24, cy);
    ctx.lineTo(cx + Rpx + 24, cy);
    ctx.moveTo(cx, cy - Rpx - 24);
    ctx.lineTo(cx, cy + Rpx + 24);
    ctx.stroke();

    ctx.fillStyle = "rgba(240,248,255,0.8)";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText("k_x", cx + Rpx + 8, cy + 12);
    ctx.fillText("k_y", cx - 12, cy - Rpx - 8);

    // Right panel: E-field & legends
    const rx = W * 0.60;
    const ry = cy - Rpx * 0.75;
    drawEFieldPanel(ctx, rx, ry, E);

    // Metrics panel
    drawMetrics(ctx, W * 0.56, cy - 10, metricsRef.current);
    drawLegend(ctx, cx - Rpx, cy + Rpx + 18, shellPx);
  };

  return (
    <div className="simulation-card">
      <h3>Drude–Sommerfeld Conduction (k-space visualization)</h3>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="k-space Fermi sea with thermal shell and Δk shift under electric field"
        style={{ width: "100%", height: "auto", borderRadius: 12, background: "#0f172a" }}
      />

      <div className="control-panel" style={panelStyle}>
        <div style={colStyle}>
          <label style={labelStyle}>
            Electric field E (V/m)
            <input
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={E}
              onChange={(e) => setE(Number(e.target.value))}
            />
            <span>{E.toFixed(2)} V/m</span>
          </label>

          <label style={labelStyle}>
            Temperature T (K)
            <input
              type="range"
              min="1"
              max="900"
              step="1"
              value={T}
              onChange={(e) => setT(Number(e.target.value))}
            />
            <span>{T} K</span>
          </label>
        </div>

        <div style={colStyle}>
          <label style={labelStyle}>
            Relaxation time τ (fs)
            <input
              type="range"
              min="1"      // 1 fs
              max="200"    // 200 fs
              step="1"
              value={tau * 1e15}
              onChange={(e) => setTau(Number(e.target.value) * 1e-15)}
            />
            <span>{(tau * 1e15).toFixed(0)} fs</span>
          </label>

          <label style={labelStyle}>
            Effective mass m*/m<sub>e</sub>
            <input
              type="range"
              min="0.3"
              max="2.0"
              step="0.01"
              value={mstarOverMe}
              onChange={(e) => setMstarOverMe(Number(e.target.value))}
            />
            <span>{mstarOverMe.toFixed(2)}</span>
          </label>
        </div>

        <div style={colStyle}>
          <label style={labelStyle}>
            Electron density n (×10<sup>28</sup> m⁻³)
            <input
              type="range"
              min="1"
              max="15"
              step="0.1"
              value={n / 1e28}
              onChange={(e) => setN(Number(e.target.value) * 1e28)}
            />
            <span>{(n / 1e28).toFixed(1)} ×10²⁸</span>
          </label>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers: drawing UI ---------- */

function drawArrow(ctx, x0, y0, x1, y1, label, color = "#fff") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const ah = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ah * Math.cos(ang - Math.PI / 6), y1 - ah * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x1 - ah * Math.cos(ang + Math.PI / 6), y1 - ah * Math.sin(ang + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(label, (x0 + x1) / 2 + 6, y0 - 6);
  }
  ctx.restore();
}

function drawEFieldPanel(ctx, x, y, E) {
  const w = 220, h = 90, r = 12;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // E-field arrow
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.fillText("Applied field (real space)", x + 12, y + 22);
  const ax0 = x + 24, ay0 = y + 56;
  const ax1 = x + 24 + 120 * Math.min(1, E / 0.5);
  drawArrow(ctx, ax0, ay0, ax1, ay0, `E = ${E.toFixed(2)} V/m`, "#c7d2fe");
  ctx.restore();
}

function drawMetrics(ctx, x, baselineY, m) {
  ctx.save();
  const w = 310, h = 150, r = 12;
  roundRect(ctx, x, baselineY - h + 10, w, h, r);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();

  ctx.fillStyle = "rgba(240,248,255,0.92)";
  ctx.font = "600 13px Inter, system-ui, sans-serif";
  const lines = [
    [`E_F`, `${(m.EF / e).toFixed(2)} eV`],
    [`k_F`, `${m.kF.toExponential(2)} m⁻¹`],
    [`v_F`, `${m.vF.toExponential(2)} m/s`],
    [`Δk`, `${m.deltaK.toExponential(2)} m⁻¹`],
    [`δk (thermal)`, `${m.deltaK_shell.toExponential(2)} m⁻¹`],
    [`|v_d|`, `${Math.abs(m.vd).toExponential(2)} m/s`],
    [`|J|`, `${Math.abs(m.J).toExponential(2)} A/m²`],
  ];

  let y = baselineY - h + 36;
  for (const [k, v] of lines) {
    ctx.fillText(`${k}:`, x + 16, y);
    ctx.fillText(v, x + 140, y);
    y += 20;
  }
  ctx.restore();
}

function drawLegend(ctx, x, y, shellPx) {
  ctx.save();
  ctx.fillStyle = "rgba(240,248,255,0.9)";
  ctx.font = "12px Inter, system-ui, sans-serif";
  const items = [
    ["Fermi sea", "rgba(120,170,255,0.20)"],
    ["Fermi surface", "rgba(240,250,255,0.9)"],
    ["Thermal shell", "rgba(255,210,120,0.5)"],
    ["Shifted surface", "rgba(255,120,120,0.9)"]
  ];

  let x0 = x, y0 = y;
  for (const [label, color] of items) {
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0 - 10, 16, 10);
    ctx.fillStyle = "rgba(240,248,255,0.9)";
    ctx.fillText(label, x0 + 24, y0);
    y0 += 16;
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Only the thin thermal shell near kF responds to E,", x0, y0 + 8);
  ctx.fillText("and E shifts the distribution by Δk = e E τ / ħ.", x0, y0 + 24);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- lightweight inline styles ---------- */
const panelStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 10,
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)"
};
const colStyle = { display: "flex", flexDirection: "column", gap: 10 };
const labelStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 10,
  color: "#eaf2ff",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14
};
