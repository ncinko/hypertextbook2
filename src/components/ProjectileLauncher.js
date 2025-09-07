// src/components/ProjectileLauncher.js
// Two‑trace update:
//  • Show only the most recent live trace and the immediately previous trace (fainter)
//  • Remove predictive "ghost" path
//  • Always draw the initial velocity vector before launches while user adjusts settings
//  • Keep on‑canvas aim drag + angle/speed sliders, gravity + air‑drag sliders, live readout
//  • Small anti‑alias polish (rounded joins/caps)

import React, { useEffect, useMemo, useRef, useState } from "react";

const COLORS = {
  bg: "#f8fafc",
  panel: "#f3f4f6",
  panelBorder: "#e5e7eb",
  text: "#111827",
  axis: "#9ca3af",
  grid: "#e5e7eb",
  grass: "#16a34a",
  accent: "#2563eb",
  accent2: "#06b6d4",
  warn: "#ef4444",
  amber: "#f59e0b",
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function toRad(deg) { return (deg * Math.PI) / 180; }
function toDeg(rad) { return (rad * 180) / Math.PI; }

export default function ProjectileLauncher() {
  // --- Simulation state ---
  const [angleDeg, setAngleDeg] = useState(45);
  const [speed, setSpeed] = useState(20); // m/s
  const [g, setG] = useState(9.8); // m/s^2 downward
  const [drag, setDrag] = useState(0.0); // linear drag coeff (1/s)
  const [wind, setWind] = useState(0.0); // (kept but unused in drawing logic)
  const [timeScale, setTimeScale] = useState(1.0);
  const [zoom, setZoom] = useState(10);

  const [playing, setPlaying] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  // target/ruler flag to measure horizontal distance
  const [flagX, setFlagX] = useState(50); // in meters along ground

  // previous completed path (array of {x,y} in world meters)
  const [prevPath, setPrevPath] = useState([]);

  // computed metrics
  const [metrics, setMetrics] = useState({ tof: 0, range: 0, hmax: 0 });

  const canvasRef = useRef(null);
  const parentRef = useRef(null);
  const rafRef = useRef(0);
  const tPrevRef = useRef(0);
  


  // world state (meters, seconds)
  const stateRef = useRef({
    t: 0,
    x: 0,
    y: 0.0, // launch height above ground (meters)
    vx: 0,
    vy: 0,
    path: [], // [{x,y}]
    landed: false,
    hmax: 0,
  });

  const [readout, setReadout] = useState(stateRef.current);

  // launcher origin in world coords (meters)
  const origin = useMemo(() => ({ x: 0, y: 0.0 }), []);

  // Responsive sizing
  const [dims, setDims] = useState({ w: 720, h: 420 });
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!parentRef.current) return;
      const w = parentRef.current.clientWidth;
      const h = Math.max(340, Math.round(w * 0.55));
      setDims({ w, h });
    });
    if (parentRef.current) ro.observe(parentRef.current);
    return () => ro.disconnect();
  }, []);

  // Reset sim state to pre-launch
  function prime() {
    const th = toRad(angleDeg);
    stateRef.current = {
      t: 0,
      x: origin.x,
      y: origin.y,
      vx: speed * Math.cos(th),
      vy: speed * Math.sin(th),
      path: [],
      landed: false,
      hmax: origin.y,
    };
    setReadout(stateRef.current);
    tPrevRef.current = 0;
    setLaunched(false);
    setPlaying(false);
    setMetrics({ tof: 0, range: 0, hmax: origin.y });
  }

  // Initialize
  useEffect(() => { prime(); /* eslint-disable-next-line */ }, []);

  // Re-prime when angle or speed changes and not launched
  useEffect(() => {
    if (!launched) prime();
    // eslint-disable-next-line
  }, [angleDeg, speed, g, drag, wind]);

  // World <-> Screen helpers
  function worldToScreen(xm, ym) {
    const { w, h } = dims;
    const px = Math.round(xm * zoom + 40); // left margin
    const py = Math.round(h - (ym * zoom + 40)); // bottom margin
    return [px, py];
  }
  function screenToWorld(px, py) {
    const { w, h } = dims;
    const xm = (px - 40) / zoom;
    const ym = (h - py - 40) / zoom;
    return [xm, ym];
  }
  // Physics step (semi-implicit Euler)
  function step(dt) {
    const s = stateRef.current;
    const [bx, by] = worldToScreen(s.x, s.y);

    // screen position of projectile (for vectors/dot)
    if (s.landed) return;

    // Air drag: simple linear model F_d = -m*k*v  => dv/dt = -k*v
    // Wind: act as background x-velocity of air; drag acts on (v - wind)
    const relVx = s.vx - wind;
    const relVy = s.vy;
    const ax = -drag * relVx;
    const ay = -g - drag * relVy;

    s.vx += ax * dt;
    s.vy += ay * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.t += dt;
    s.hmax = Math.max(s.hmax, s.y);
    s.path.push({ x: s.x, y: s.y });

    // Ground collision (y<=0) -> land with simple inelastic stop
    if (s.y <= 0 && s.t > 0.0001) {
      // interpolate landing for slightly below ground
      const n = s.path.length;
      if (n >= 2) {
        const A = s.path[n - 2];
        const B = s.path[n - 1];
        const t = clamp(A.y / (A.y - B.y), 0, 1);
        const xLand = lerp(A.x, B.x, t);
        s.x = xLand;
      }
      s.y = 0;
      s.vx = 0; s.vy = 0;
      s.landed = true;
      setPlaying(false);
      setMetrics({ tof: s.t, range: s.x - origin.x, hmax: s.hmax });

      // save this completed path as the faint previous trace
      setPrevPath([{ x: origin.x, y: origin.y }, ...s.path]);
      // trigger a final redraw to show the faint previous after landing
      requestAnimationFrame(draw);
    }
  }

  // Animation loop
  useEffect(() => {
    if (!playing) {
      tPrevRef.current = 0;
      return;
    }

    function loop(ts) {
      if (tPrevRef.current === 0) tPrevRef.current = ts;
      const dtMs = ts - tPrevRef.current;
      tPrevRef.current = ts;

      // simulate at ~120 Hz internal with timeScale multiplier
      let dt = (dtMs / 1000) * timeScale;
      const sub = Math.ceil(dt / (1 / 240));
      const h = dt / Math.max(1, sub);
      for (let i = 0; i < sub; i++) step(h);
      setReadout({ ...stateRef.current });
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [playing, timeScale, zoom, showGrid, showVectors, dims]);

  // Draw everything
  function draw() {

    const [bx, by] = worldToScreen(stateRef.current.x, stateRef.current.y);
    const cvs = canvasRef.current; if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = cvs.getContext("2d");
    const { w, h } = dims;

    // HiDPI scale
    if (cvs.width !== Math.floor(w * dpr) || cvs.height !== Math.floor(h * dpr)) {
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // anti-aliased strokes
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // margins
    const left = 40, bottom = 40;

    // grid
    if (showGrid) {
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      const stepM = gridStep(zoom);
      for (let xm = 0; xm * zoom + left < w; xm += stepM) {
        const x = xm * zoom + left;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - bottom); ctx.stroke();
      }
      for (let ym = 0; ym * zoom + bottom < h; ym += stepM) {
        const y = h - (ym * zoom + bottom);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }

    // ground
    ctx.strokeStyle = COLORS.grass; ctx.lineWidth = 3;
    const groundY = h - bottom;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();

    // axes ticks (x)
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(left, 0); ctx.lineTo(left, h); ctx.stroke();
    ctx.fillStyle = COLORS.axis; ctx.font = "12px ui-sans-serif, system-ui";
    const stepMLabel = niceStep((w - left) / zoom);
    for (let xm = 0; xm <= (w - left) / zoom; xm += stepMLabel) {
      const X = xm * zoom + left;
      ctx.beginPath(); ctx.moveTo(X, groundY - 4); ctx.lineTo(X, groundY + 4); ctx.stroke();
      if (xm % (stepMLabel * 2) === 0) ctx.fillText(xm.toFixed(0) + " m", X - 8, groundY + 16);
    }

    // launcher origin marker
    const [ox, oy] = worldToScreen(origin.x, origin.y);
    ctx.fillStyle = COLORS.text;
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();

    // --- faint previous trace ---
    if (prevPath && prevPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = COLORS.accent;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      prevPath.forEach((p, i) => {
        const [px, py] = worldToScreen(p.x, p.y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    const s = stateRef.current;

    if (playing) { // --- current (live) path ---
    ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2.5;
    ctx.beginPath();
    const path = [{ x: origin.x, y: origin.y }, ...s.path];
    path.forEach((p, i) => {
      const [px, py] = worldToScreen(p.x, p.y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // projectile
    ctx.fillStyle = COLORS.accent;
    ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();

    }

    // vectors
    if (playing && showVectors) {
      drawArrow(ctx, bx, by, bx + s.vx * 0.5 * zoom, by - s.vy * 0.5 * zoom, COLORS.accent, 2);
      drawArrow(ctx, bx, by, bx + (-(drag * (s.vx - wind))) * 0.6 * zoom, by - (-(g + drag * s.vy)) * 0.6 * zoom, COLORS.amber, 2);
      ctx.fillStyle = COLORS.text; ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText("v", bx + 8, by - 8);
      ctx.fillText("a", bx + 12, by + 14);
    }

    // ALWAYS draw the initial velocity vector when not launched
    if (!playing) {
      const th = toRad(angleDeg);
      const vx0 = speed * Math.cos(th);
      const vy0 = speed * Math.sin(th);
      drawArrow(ctx, ox, oy, ox + vx0 * 0.5 * zoom, oy - vy0 * 0.5 * zoom, COLORS.accent, 2);
    }

    // flag/target
    const [fx, fy] = worldToScreen(flagX, 0);
    ctx.strokeStyle = COLORS.warn; ctx.fillStyle = COLORS.warn; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy - 40); ctx.lineTo(fx + 10, fy - 28); ctx.lineTo(fx, fy - 28); ctx.closePath(); ctx.fill();

    // if landed: draw miss distance
    if (s.landed) {
      const [lx, ly] = worldToScreen(s.x, 0);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = COLORS.warn;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Helper to choose a reasonable grid step in meters for the current zoom
  function gridStep(z) {
    const pxAim = 40; // ~40px apart
    const m = pxAim / z; // meters per step target
    return niceStep(m);
  }
  function niceStep(m) {
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1e-6, m))));
    const cand = [1, 2, 5].map(c => c * pow);
    let best = cand[0], err = Math.abs(cand[0] - m);
    for (const c of cand) { const e = Math.abs(c - m); if (e < err) { best = c; err = e; } }
    return best;
  }

  // Interaction: drag handle from origin to set angle & speed
  const dragRef = useRef({ active: false, mode: "none" });
  function handlePointerDown(e) {
  if (!canvasRef.current) return;
  const rect = canvasRef.current.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // Check if near flag first
  const [fx, fy] = worldToScreen(flagX, 0);
  const dFlag = Math.hypot(px - fx, py - (fy - 20));
  if (dFlag < 24) {
    dragRef.current = { active: true, mode: "flag" };
  } else {
    // Aim drag from anywhere
    dragRef.current = { active: true, mode: "aim" };
    const [mx, my] = screenToWorld(px, py);
    const dx = mx - origin.x, dy = my - origin.y;
    setAngleDeg(clamp(toDeg(Math.atan2(dy, dx)), 0, 90));
    setSpeed(clamp(Math.hypot(dx, dy) * 2, 1, 100)); // drag length -> speed
  }

  if (canvasRef.current.setPointerCapture && e.pointerId != null) {
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch {}
  }
  e.preventDefault?.();
  draw();
}

  function handlePointerMove(e) {
    if (!dragRef.current.active) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;

    if (dragRef.current.mode === "aim") {
      const [mx, my] = screenToWorld(px, py);
      const dx = mx - origin.x, dy = my - origin.y;
      const ang = clamp(toDeg(Math.atan2(dy, dx)), 0, 90);
      const spd = clamp(Math.hypot(dx, dy)*2, 1, 100); // drag length -> speed
      setAngleDeg(ang);
      setSpeed(spd);
      draw(); // reflect aiming immediately
    } else if (dragRef.current.mode === "flag") {
      const [mx] = screenToWorld(px, 0);
      setFlagX(clamp(mx, 0, 1e6));
      draw();
    }
  }
  function handlePointerUp() { dragRef.current = { active: false, mode: "none" }; }

  // Controls
  function onLaunch() { prime(); setLaunched(true); setPlaying(true); }
  function onPause() { setPlaying(p => !p); }
  function onClear() { prime(); setLaunched(false); setPrevPath([]); draw(); }

  // Derived/preview values (kept for potential future UI; not drawn)
  const preview = useMemo(() => {
    const th = toRad(angleDeg);
    const vx = speed * Math.cos(th), vy = speed * Math.sin(th);
    const tof = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * origin.y))) / g; // y0>0
    const range = vx * tof;
    const hmax = origin.y + (vy * vy) / (2 * g);
    return { tof, range, hmax };
  }, [angleDeg, speed, g, origin.y]);

  // Draw once when static UI changes
  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [dims, zoom, showGrid, showVectors, flagX, angleDeg, speed, prevPath]);

  return (
    <div ref={parentRef} style={{ maxWidth: 980, margin: "16px auto", padding: 12 }}>
      <p style={{ margin: "6px 0 12px", color: "#374151" }}>
        Drag from the launch point to set <em>angle</em> and <em>speed</em>, or use the sliders. Place the red flag to set a target and measure the horizontal miss distance.
      </p>

      {/* Canvas Panel */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 8 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ width: dims.w, height: dims.h, display: "block", borderRadius: 8, cursor: "crosshair" }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Launch Settings</h3>
          <Row label={`Angle: ${angleDeg.toFixed(1)}°`}>
            <input type="range" min={0} max={90} step={0.1} value={angleDeg} onChange={e => setAngleDeg(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </Row>
          <Row label={`Speed: ${speed.toFixed(1)} m/s`}>
            <input type="range" min={1} max={100} step={0.1} value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </Row>
          <Row label={`Gravity: ${g.toFixed(2)} m/s²`}>
            <input type="range" min={1} max={20} step={0.1} value={g} onChange={e => setG(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </Row>
          <Row label={`Air drag k: ${drag.toFixed(2)} s⁻¹`}>
            <input type="range" min={0} max={1.0} step={0.01} value={drag} onChange={e => setDrag(parseFloat(e.target.value))} style={{ width: "100%" }} />
          </Row>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Button onClick={onLaunch} primary>{launched ? "Relaunch" : "Launch"}</Button>
            <Button onClick={onPause}>{playing ? "Pause" : "Play"}</Button>
            <Button onClick={onClear}>Clear</Button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Grid
            </label>

          </div>
        </div>

        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Live Readout</h3>
          <Metric label="time" value={readout.t} suffix=" s" />
          <Metric label="x" value={readout.x} suffix=" m" />
          <Metric label="y" value={readout.y} suffix=" m" />
          <Metric label="vx" value={readout.vx} suffix=" m/s" />
          <Metric label="vy" value={readout.vy} suffix=" m/s" />
          <hr style={{ border: 0, borderTop: `1px solid ${COLORS.panelBorder}`, margin: "8px 0" }} />
          <div style={{ marginTop: 8, background: "#fff", border: `1px dashed ${COLORS.panelBorder}`, borderRadius: 8, padding: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>Target Flag</div>
              <small style={{ color: "#6b7280" }}>drag flag on canvas</small>
            </div>
            <Metric label="xₜ" value={flagX} suffix=" m" />
            {readout.landed && (
              <Metric label="miss" value={Math.abs(flagX - readout.x)} suffix=" m" />
            )}
          </div>
        </div>
      </div>

      <small style={{ display: "block", marginTop: 8, color: "#6b7280" }}>
        Tips: drag from the black dot to aim. Use the flag to set a goal. Previous trace stays faint when you relaunch.
      </small>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "center", gap: 10, marginTop: 8 }}>
      <div style={{ fontSize: 13, color: "#374151" }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Metric({ label, value, suffix = "" }) {
  const v = Number.isFinite(value) ? value : 0;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, margin: "2px 0" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{v.toFixed(2)}{suffix}</span>
    </div>
  );
}

function Button({ children, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})` : COLORS.panel,
        color: primary ? "white" : COLORS.text,
        border: primary ? "none" : `1px solid ${COLORS.panelBorder}`,
        borderRadius: 12,
        padding: "8px 12px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function drawArrow(ctx, x1, y1, x2, y2, color = "#000", lw = 2) {
  const head = 8;
  const ang = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
  ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
