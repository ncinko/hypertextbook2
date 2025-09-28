import React, { useRef, useEffect, useMemo, useState } from "react";

// ElectronGasDrude.jsx
// Visually appealing Drude-like electron gas with e–e and lattice scattering
// — focus: smooth animation, glow, trails, and an obvious E-field acceleration.
// Physics (coarse):
//   • Between collisions: dv/dt = (q/m) E  (constant E here)
//   • Lattice scattering: Poisson process with mean time tauL, randomize direction
//   • Electron–electron scattering: short-range elastic-style swaps via spatial hashing
//   • Toroidal boundaries (wrap) so flow is continuous across edges
//
// Notes for future iterations:
//   – Replace tauL slider with something more tangible (mean free path; mobility)
//   – Add temperature/phonon visualization by jittering lattice nodes & changing color
//   – Show drift-velocity readout and current density estimates
//   – Hook into your app's UI components; here we only render a minimal control bar

const TAU_DEFAULT = 0.35; // mean time between lattice collisions (s, sim units)
const TAU_EE = 0.12;      // characteristic e–e scattering time (soft)
const Q_OVER_M = 1.0;     // q/m in sim units; scales acceleration from E
const BASE_SPEED = 60;    // initial thermal speed (px/s, sim units)
const ELECTRON_RADIUS = 2.0;
const EE_RADIUS = 9;      // proximity for e–e scatter (px)
const TRAIL_DECAY = 0.1; // lower = longer trails
const LATTICE_SPACING = 28; // px
const LATTICE_DISORDER = 0.25; // fraction of spacing for random offset

// Utility
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export default function ElectronGas({
  width = 900,
  height = 540,
  density = 0.00055, // electrons per pixel
  initialE = { x: 300, y: 0 }, // px/s^2 in sim units
  background = "#081018",
}) {
  const canvasRef = useRef(null);
  const trailRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [E, setE] = useState(initialE);
  const [tauL, setTauL] = useState(TAU_DEFAULT);
  const [eeStrength, setEeStrength] = useState(1.0);

  // Derived counts
  const N = useMemo(() => Math.max(30, Math.floor(width * height * density)), [width, height, density]);

  // Build a pseudo-hex lattice (with gentle disorder)
  const lattice = useMemo(() => {
    const pts = [];
    const dx = LATTICE_SPACING;
    const dy = Math.sqrt(3) * dx * 0.5;
    const cols = Math.ceil(width / dx) + 2;
    const rows = Math.ceil(height / dy) + 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const ox = (j % 2) * (dx * 0.5);
        let x = i * dx + ox;
        let y = j * dy;
        // subtle static disorder to hint at phonons/imperfections
        x += (Math.random() - 0.5) * dx * LATTICE_DISORDER;
        y += (Math.random() - 0.5) * dx * LATTICE_DISORDER;
        if (x >= -20 && x <= width + 20 && y >= -20 && y <= height + 20) {
          pts.push({ x, y });
        }
      }
    }
    return pts;
  }, [width, height]);

  // Particles state
  const electronsRef = useRef([]);
  const lastTimeRef = useRef(null);

  // Spatial hash for e–e interactions
  const cellSize = EE_RADIUS * 1.25;
  const gridRef = useRef(new Map());

  const reseed = () => {
    const arr = new Array(N).fill(0).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const speed = BASE_SPEED * (0.6 + 0.8 * Math.random());
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tSinceL: Math.random() * tauL, // stagger lattice-collision clocks
        hue: 190 + Math.random() * 30, // bluish
      };
    });
    electronsRef.current = arr;
  };

  // Build/clear trail buffer
  useEffect(() => {
    reseed();
    const trail = trailRef.current;
    if (trail) {
      const tctx = trail.getContext("2d");
      tctx.clearRect(0, 0, width, height);
    }
    lastTimeRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, N]);

  // Helpers for spatial hashing
  const keyFor = (x, y) => `${Math.floor(x / cellSize)}_${Math.floor(y / cellSize)}`;
  const buildGrid = (arr) => {
    const grid = new Map();
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      const k = keyFor(p.x, p.y);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    gridRef.current = grid;
  };

  // Draw helpers
  const drawLattice = (ctx) => {
    ctx.save();
    for (const { x, y } of lattice) {
      const r = 1.6;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      grad.addColorStop(0, "rgba(200,220,255,0.18)");
      grad.addColorStop(1, "rgba(200,220,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(180,200,255,0.25)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawEVector = (ctx) => {
    const cx = width - 140;
    const cy = 70;
    const ex = E.x * 0.7; // scale for glyph
    const ey = E.y * 0.7;
    const len = Math.hypot(ex, ey);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "#7dd3fc"; // cyan-ish
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // arrowhead
    if (len > 0.001) {
      const nx = ex / len;
      const ny = ey / len;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 8 * nx + 6 * ny, ey - 8 * ny - 6 * nx);
      ctx.lineTo(ex - 8 * nx - 6 * ny, ey - 8 * ny + 6 * nx);
      ctx.closePath();
      ctx.fillStyle = "#7dd3fc";
      ctx.fill();
    }
    ctx.font = "12px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillStyle = "#a8dadc";
    ctx.fillText("E-field", -10, -12);
    ctx.restore();
  };

  const drawElectrons = (ctx, arr) => {
    ctx.save();
    for (const p of arr) {
      const r = ELECTRON_RADIUS;
      // soft glow
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
      g.addColorStop(0, `hsla(${p.hue}, 90%, 70%, 0.9)`);
      g.addColorStop(0.4, `hsla(${p.hue}, 90%, 60%, 0.35)`);
      g.addColorStop(1, `hsla(${p.hue}, 90%, 60%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${p.hue}, 95%, 85%, 0.95)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const trail = trailRef.current;
    if (!canvas || !trail) return;

    const ctx = canvas.getContext("2d");
    const tctx = trail.getContext("2d");

    let rafId;

    const step = (t) => {
      if (!running) {
        rafId = requestAnimationFrame(step);
        lastTimeRef.current = t;
        return;
      }
      const last = lastTimeRef.current == null ? t : lastTimeRef.current;
      let dt = (t - last) / 1000; // seconds
      dt = clamp(dt, 0, 0.05); // clamp to avoid huge jumps
      lastTimeRef.current = t;

      const arr = electronsRef.current;

      // semi-persistent trails
      tctx.fillStyle = `rgba(8,16,24,${TRAIL_DECAY})`;
      tctx.fillRect(0, 0, width, height);

      // Advance particles
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];

        // Acceleration by E between collisions
        p.vx += Q_OVER_M * E.x * dt;
        p.vy += Q_OVER_M * E.y * dt;

        // Lattice scattering as Poisson process
        p.tSinceL += dt;
        const collideNow = Math.random() < 1 - Math.exp(-p.tSinceL / tauL);
        if (collideNow) {
          const speed = Math.hypot(p.vx, p.vy);
          // randomize direction; preserve some speed (slight energy exchange)
          const th = Math.random() * Math.PI * 2;
          const keep = 0.85 + 0.1 * Math.random();
          p.vx = keep * speed * Math.cos(th);
          p.vy = keep * speed * Math.sin(th);
          p.tSinceL = 0;
          p.hue = 190 + Math.random() * 30; // twinkle a bit on collisions
        }

        // Integrate position
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Toroidal boundary conditions
        if (p.x < 0) p.x += width; else if (p.x >= width) p.x -= width;
        if (p.y < 0) p.y += height; else if (p.y >= height) p.y -= height;
      }

      // Electron–electron scattering (soft, local)
      buildGrid(arr);
      const eeRate = 1 - Math.exp(-dt / TAU_EE);
      if (eeStrength > 0 && eeRate > 0) {
        for (let i = 0; i < arr.length; i++) {
          if (Math.random() > eeRate * eeStrength) continue;
          const a = arr[i];
          const kx = Math.floor(a.x / cellSize);
          const ky = Math.floor(a.y / cellSize);
          // search 3x3 neighboring cells
          let partner = -1;
          for (let gx = kx - 1; gx <= kx + 1 && partner < 0; gx++) {
            for (let gy = ky - 1; gy <= ky + 1 && partner < 0; gy++) {
              const bucket = gridRef.current.get(`${gx}_${gy}`);
              if (!bucket) continue;
              for (const j of bucket) {
                if (j === i) continue;
                const b = arr[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < EE_RADIUS * EE_RADIUS) {
                  partner = j;
                  break;
                }
              }
            }
          }
          if (partner >= 0) {
            // Simple elastic-like exchange along the normal
            const b = arr[partner];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            const nx = dx / d;
            const ny = dy / d;
            const va_n = a.vx * nx + a.vy * ny;
            const vb_n = b.vx * nx + b.vy * ny;
            // swap normal components (equal masses)
            const dvn = vb_n - va_n;
            a.vx += dvn * nx;
            a.vy += dvn * ny;
            b.vx -= dvn * nx;
            b.vy -= dvn * ny;
            // tiny tangential randomization to prevent locking
            const jitter = 0.05;
            const tx = -ny, ty = nx;
            a.vx += (Math.random() - 0.5) * jitter * tx;
            a.vy += (Math.random() - 0.5) * jitter * ty;
            b.vx += (Math.random() - 0.5) * jitter * tx;
            b.vy += (Math.random() - 0.5) * jitter * ty;
          }
        }
      }

      // Compose frame
      // 1) copy trails buffer to main
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(trail, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // 2) lattice
      drawLattice(ctx);

      // 3) electrons (also paint trails buffer for next frame)
      drawElectrons(ctx, arr);
      drawElectrons(tctx, arr);

      // 4) E vector glyph
      drawEVector(ctx);

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [running, E, tauL, eeStrength, width, height, background]);

  // UI Handlers
  const onDragE = (evt) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = clamp(evt.clientX - rect.left, 0, rect.width);
    const y = clamp(evt.clientY - rect.top, 0, rect.height);
    const ex = (x / rect.width - 0.5) * 1000;  // tune range
    const ey = (y / rect.height - 0.5) * 1000;
    setE({ x: ex, y: ey });
  };

  return (
    <div style={{ width, margin: "0 auto", color: "#e8f1ff", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}>
        {/* Trails layer (accumulates) */}
        <canvas ref={trailRef} width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} />
        {/* Main frame */}
        <canvas ref={canvasRef} width={width} height={height} style={{ display: "block" }} />

        {/* Minimal HUD */}
        <div style={{ position: "absolute", left: 12, top: 10, display: "flex", gap: 12, alignItems: "center", background: "rgba(12,16,24,0.5)", padding: "8px 10px", borderRadius: 10, backdropFilter: "blur(6px)", border: "1px solid rgba(130,180,250,0.15)" }}>
          <button
            onClick={() => setRunning(r => !r)}
            style={{
              background: running ? "#10b981" : "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >{running ? "Pause" : "Play"}</button>

          <button
            onClick={reseed}
            style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
          >Reseed</button>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ opacity: 0.85 }}>τ<sub>L</sub></span>
            <input type="range" min={0.08} max={0.8} step={0.02} value={tauL}
              onChange={(e) => setTauL(parseFloat(e.target.value))}
            />
          </label>

          
        </div>

        {/* Drag area to set E vector */}
        <div
          onMouseDown={onDragE}
          onMouseMove={(e) => e.buttons === 1 && onDragE(e)}
          title="Drag here to set E"
          style={{ position: "absolute", right: 12, top: 12, width: 160, height: 120, borderRadius: 12, border: "1px dashed rgba(125,211,252,0.35)", cursor: "crosshair", background: "rgba(12,20,28,0.35)", backdropFilter: "blur(6px)" }}
        />

        {/* Footer gloss */}
        
      </div>
      <p style={{ marginTop: 0, fontSize: 13, opacity: 0.8 }}>
        Tip: click+drag in the top-right panel to set the electric field direction/magnitude. Use τ<sub>L</sub> to control lattice scattering.
      </p>
    </div>
  );
}
