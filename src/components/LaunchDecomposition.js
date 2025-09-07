// src/components/LaunchDecomposition.js
// Minimal interactive to demonstrate v0 decomposition into (v0x, v0y)
// - Sliders for launch speed and angle (smooth drag using onInput)
// - Click/drag on the canvas to set angle & speed (grab arrowhead or drag from origin)
// - Auto‑scales vector length to fit panel (removed manual scale slider)
// - Canvas shows v0 arrow and its x/y components with a right triangle
// - Responsive, crisp on HiDPI, Physics Nook styling

import React, { useEffect, useRef, useState } from "react";

const COLORS = {
  panel: "#f3f4f6",
  panelBorder: "#e5e7eb",
  text: "#111827",
  axis: "#9ca3af",
  grid: "#e5e7eb",
  accent: "#2563eb", // v0
  xcomp: "#10b981", // v0x
  ycomp: "#f59e0b", // v0y
  handle: "#111827",
};

const ANGLE_MIN = 0;
const ANGLE_MAX = 90;
const SPEED_MIN = 0;
const SPEED_MAX = 200;

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export default function LaunchDecomposition() {
  const [angleDeg, setAngleDeg] = useState(30);
  const [speed, setSpeed] = useState(100); // m/s

  const canvasRef = useRef(null);
  const parentRef = useRef(null);
  const [dims, setDims] = useState({ w: 680, h: 360 });

  // Pointer drag state
  const dragRef = useRef({ active: false, mode: "none" }); // mode: 'aim' | 'handle'

  // Resize to parent
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!parentRef.current) return;
      const w = parentRef.current.clientWidth;
      const h = Math.max(300, Math.round(w * 0.52));
      setDims({ w, h });
    });
    if (parentRef.current) ro.observe(parentRef.current);
    return () => ro.disconnect();
  }, []);

  // Draw
  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [angleDeg, speed, dims]);

  function draw() {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = dims;

    // scale for HiDPI
    if (cvs.width !== Math.floor(w * dpr) || cvs.height !== Math.floor(h * dpr)) {
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);

    // panel background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // origin near bottom-left
    const left = 60, bottom = 50;
    const ox = left, oy = h - bottom;

    // Store for hit testing later
    (draw._geom ||= {}).origin = { ox, oy };

    // grid (light)
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    for (let x = left; x < w - 10; x += 40) { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, h - bottom + 0); ctx.stroke(); }
    for (let y = h - bottom; y > 10; y -= 40) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w - 10, y); ctx.stroke(); }

    // axes
    ctx.strokeStyle = COLORS.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, oy); ctx.lineTo(w - 10, oy); ctx.stroke(); // x-axis
    ctx.beginPath(); ctx.moveTo(ox, h - 10); ctx.lineTo(ox, 10); ctx.stroke(); // y-axis
    ctx.fillStyle = COLORS.axis; ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText("x", w - 22, oy - 6);
    ctx.fillText("y", ox + 6, 18);

    // compute components
    const th = toRad(angleDeg);
    const vx = speed * Math.cos(th);
    const vy = speed * Math.sin(th);

    // compute auto scale so the vector fits comfortably in the panel
    const padX = 24, padY = 24;
    const maxLenX = (w - ox - padX);
    const maxLenY = (oy - padY);
    const zoom = 1.0 * Math.min(maxLenX / Math.max(1, SPEED_MAX/2), maxLenY / Math.max(1, SPEED_MAX/2));

    // endpoints in screen coords
    const endX = ox + vx * zoom;
    const endY = oy - vy * zoom;

    // component corners
    const compXEnd = ox + vx * zoom;
    const compYEnd = oy - vy * zoom;

    // draw right triangle (projections)
    ctx.strokeStyle = COLORS.xcomp; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(compXEnd, oy); ctx.stroke();
    ctx.strokeStyle = COLORS.ycomp; ctx.beginPath(); ctx.moveTo(compXEnd, oy); ctx.lineTo(compXEnd, compYEnd); ctx.stroke();

    // hypotenuse: v0
    drawArrow(ctx, ox, oy, endX, endY, COLORS.accent, 3);



    // angle arc
    const rArc = 36;
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox, oy, rArc, 0, -th, true); // clockwise because y-down canvas
    ctx.stroke();
    // theta label
    ctx.fillStyle = COLORS.text; ctx.font = "13px ui-sans-serif, system-ui";
    const tx = ox + (rArc + 8) * Math.cos(th / 2);
    const ty = oy - (rArc + 8) * Math.sin(th / 2);
    ctx.fillText("θ", tx, ty);

    // labels for vectors
    ctx.font = "20px ui-sans-serif, system-ui";
    ctx.fillStyle = COLORS.accent; ctx.fillText("v₀", endX + 8, endY - 8);
    ctx.fillStyle = COLORS.xcomp; ctx.fillText("v₀ₓ", (ox + compXEnd)/2, oy - 6);
    ctx.fillStyle = COLORS.ycomp; ctx.fillText("v₀ᵧ", compXEnd + 6, (oy + compYEnd) / 2);

    // origin dot
    ctx.fillStyle = COLORS.text; ctx.beginPath(); ctx.arc(ox, oy, 3, 0, Math.PI * 2); ctx.fill();
  }

  // --- Pointer interaction ---
  function toCanvasPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return { px, py };
  }

  function startDrag(e) {
    const { px, py } = toCanvasPos(e);
    const geom = draw._geom || {};
    const { ox, oy } = geom.origin || { ox: 0, oy: 0 };
    const handle = geom.handle || { x: 0, y: 0 };

    const dOrigin = Math.hypot(px - ox, py - oy);
    const dHandle = Math.hypot(px - handle.x, py - handle.y);

    if (dHandle <= 12) {
      dragRef.current = { active: true, mode: "handle" };
    } else {
      dragRef.current = { active: true, mode: "aim" };
      updateFromPointer(px, py);
    }
  }

  function moveDrag(e) {
    if (!dragRef.current.active) return;
    const { px, py } = toCanvasPos(e);
    updateFromPointer(px, py);
  }

  function endDrag() {
    dragRef.current = { active: false, mode: "none" };
  }

  function updateFromPointer(px, py) {
    const geom = draw._geom || {};
    const { ox, oy } = geom.origin || { ox: 0, oy: 0 };
    const dx = px - ox;
    const dy = py - oy; // y-down canvas

    // Convert to physics convention: angle above +x (counterclockwise), so use -dy
    let theta = Math.atan2(-dy, dx);

    // infer speed from current auto zoom (recompute like in draw just in case)
    const w = dims.w, h = dims.h;
    const padX = 24, padY = 24;
    const maxLenX = (w - ox - padX);
    const maxLenY = (oy - padY);
    const zoom = 1.0 * Math.min(maxLenX / Math.max(1, SPEED_MAX/2), maxLenY / Math.max(1, SPEED_MAX/2));
    let spd = Math.hypot(dx, dy) / Math.max(zoom, 1e-6);

    // clamps
    theta = clamp(theta, toRad(ANGLE_MIN), toRad(ANGLE_MAX));
    spd = clamp(spd, SPEED_MIN, SPEED_MAX);

    setAngleDeg(toDeg(theta));
    setSpeed(spd);
  }

  return (
    <div ref={parentRef} style={{ maxWidth: 820, margin: "12px auto", padding: 12, userSelect: "none" }}>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 8 }}>
        <canvas
          ref={canvasRef}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          style={{ width: dims.w, height: dims.h, display: "block", borderRadius: 8, touchAction: "none", cursor: "crosshair", userSelect: "none" }}
        />
      </div>

      {/* Controls: angle + speed (smooth with onInput); scale slider removed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <Control label={`Angle: ${angleDeg.toFixed(1)}°`}>
          <input
            type="range"
            min={ANGLE_MIN}
            max={ANGLE_MAX}
            step={0.1}
            value={angleDeg}
            onInput={(e) => setAngleDeg(parseFloat(e.target.value))}
            onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
            style={{ width: "100%", touchAction: "none" }}
          />
        </Control>
        <Control label={`Speed: ${speed.toFixed(2)} m/s`}>
          <input
            type="range"
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={0.01}
            value={speed}
            onInput={(e) => setSpeed(parseFloat(e.target.value))}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={{ width: "100%", touchAction: "none" }}
          />
        </Control>
      </div>

      {/* Numeric readout that mirrors the textbook equation (no MathJax in loop) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 10 }}>
        <Readout label="v₀ₓ" value={(speed * Math.cos(toRad(angleDeg))).toFixed(2)} suffix=" m/s" color={COLORS.xcomp} />
        <Readout label="v₀ᵧ" value={(speed * Math.sin(toRad(angleDeg))).toFixed(2)} suffix=" m/s" color={COLORS.ycomp} />
        <Readout label="v₀" value={speed.toFixed(2)} suffix=" m/s" color={COLORS.accent} />
      </div>


    </div>
  );
}

function Control({ label, children }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` , borderRadius: 12, padding: 10 }}>
      <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Readout({ label, value, suffix, color }) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 10,
      padding: "8px 10px",
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "ui-sans-serif, system-ui",
      fontSize: 16,
    }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}{suffix}</span>
    </div>
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
