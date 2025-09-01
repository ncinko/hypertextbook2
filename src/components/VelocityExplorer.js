import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * VelocityExplorer (responsive + motion)
 * -------------------------------------------------------------
 * Interactive position–time plot that contrasts average (secant)
 * and instantaneous (tangent) velocity.
 * - Responsive canvas that scales with container size.
 * - Position axis locked to [0, 10] (like time axis).
 * - "Show Motion" button animates a point along the curve.
 *
 * Updates:
 * - Increased canvas font sizes for readability.
 * - Suppress (0.0, 0.0) tick labels at the axes origin.
 * - Replaced generic button with a styled Play/Pause pill button.
 */
export default function VelocityExplorer() {
  // ----------- FIXED MODEL -----------
  const a = 0.05, b = -0.6, c = 2.0, d = 0.0;
  const sOfT = ({ t }) => a * t * t * t + b * t * t + c * t + d;

  // ----------- FIXED AXES -----------
  const tMin = 0;
  const tMax = 10; // seconds
  const yMin = 0.0;
  const yMax = 10.0; // meters (locked)

  // Handles for secant endpoints and tangent point
  const [t1, setT1] = useState(2);
  const [t2, setT2] = useState(8);
  const [t0, setT0] = useState(5);
  const dt = 0.30; // symmetric window for instantaneous v estimate (fixed)

  // Motion playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [tMotion, setTMotion] = useState(0);
  const lastTsRef = useRef(null);
  const rafIdRef = useRef(null);
  const playSpeed = 1.0; // 1 sec of sim per 1 sec real time
  const runningRef = useRef(false);


  // Canvas + layout
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const [size, setSize] = useState({ w: 800, h: 500 }); // overridden by ResizeObserver

  // Typography controls (larger fonts)
  const FONT_FAMILY = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const FONT_AXIS = 15;        // axis titles
  const FONT_TICK = 14;        // tick labels
  const FONT_ANNOT = 14;       // on-plot annotations

  // Responsive: observe parent width and scale canvas; keep ~8:5 aspect and a minimum size
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const minW = 400, minH = 260;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(minW, Math.floor(entry.contentRect.width));
        const h = Math.max(minH, Math.floor(5*w/8));
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);




useEffect(() => {
  // PAUSED: stop immediately, clear the frame, and reset timestamp
  if (!isPlaying) {
    runningRef.current = false;
    lastTsRef.current = null;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    return;
  }

  // Already running? (prevents double RAF in React 18 Strict Mode)
  if (runningRef.current) return;
  runningRef.current = true;

  const tick = (ts) => {
    if (!runningRef.current) return; // paused between frames
    if (lastTsRef.current === null) {
      lastTsRef.current = ts;
    } else {
      const dtMs = ts - lastTsRef.current;
      lastTsRef.current = ts;
      const dtSec = (dtMs / 1000) * playSpeed;
      setTMotion(prev => {
        let next = prev + dtSec;
        const span = tMax - tMin;
        return span > 0 ? ((next - tMin) % span + span) % span + tMin : next;
      });
    }
    rafIdRef.current = requestAnimationFrame(tick);
  };

  // fresh start on (re)play
  lastTsRef.current = null;
  rafIdRef.current = requestAnimationFrame(tick);

  return () => {
    runningRef.current = false;
    lastTsRef.current = null;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };
}, [isPlaying]);





  // Pixel mappers & padding (slightly larger for bigger labels)
  const PAD_L = 64; // left padding for y-axis labels
  const PAD_R = 24;
  const PAD_T = 18;
  const PAD_B = 56; // room for axis labels

  const xPix = (t) => PAD_L + ((t - tMin) / (tMax - tMin)) * (size.w - PAD_L - PAD_R);
  const yPix = (s) => size.h - PAD_B - ((s - yMin) / (yMax - yMin)) * (size.h - PAD_T - PAD_B);

  // Derived velocities
  const avgV = useMemo(() => (t2 === t1 ? NaN : (sOfT({ t: t2 }) - sOfT({ t: t1 })) / (t2 - t1)), [t1, t2]);
  const instV = useMemo(() => {
    const left = Math.max(tMin, t0 - dt);
    const right = Math.min(tMax, t0 + dt);
    if (right === left) return NaN;
    return (sOfT({ t: right }) - sOfT({ t: left })) / (right - left);
  }, [t0]);

  // ----------- DRAWING -----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Hi-DPI scaling
    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = size.w + "px";
    canvas.style.height = size.h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear & background
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, size.w, size.h);

    drawGrid(ctx);
    drawAxes(ctx);
    drawCurve(ctx);
    drawSecant(ctx);
    drawTangent(ctx);
    drawHandles(ctx);
    drawMotionOverlay(ctx);
  }, [t1, t2, t0, dpr, size, tMotion]);

  function drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;

    // vertical grid (time)
    const xTicks = 10;
    for (let i = 0; i <= xTicks; i++) {
      const t = tMin + (i / xTicks) * (tMax - tMin);
      const x = xPix(t);
      ctx.beginPath();
      ctx.moveTo(x, PAD_T);
      ctx.lineTo(x, size.h - PAD_B);
      ctx.stroke();
    }

    // horizontal grid (position)
    const yTicks = 10; // exact 0..10 locks
    for (let i = 0; i <= yTicks; i++) {
      const s = yMin + (i / yTicks) * (yMax - yMin);
      const y = yPix(s);
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(size.w - PAD_R, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAxes(ctx) {
    ctx.save();
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.6;

    // x-axis (time)
    ctx.beginPath();
    ctx.moveTo(PAD_L, size.h - PAD_B);
    ctx.lineTo(size.w - PAD_R, size.h - PAD_B);
    ctx.stroke();

    // y-axis (position)
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, size.h - PAD_B);
    ctx.stroke();

    // axis titles
    ctx.fillStyle = "#222";
    ctx.font = `${FONT_AXIS}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText("time (s)", (PAD_L + size.w - PAD_R) / 2, size.h - 14);

    ctx.save();
    ctx.translate(16, (PAD_T + size.h - PAD_B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("position (m)", 0, 0);
    ctx.restore();

    // tick labels (x) — skip origin 0.0
    ctx.font = `${FONT_TICK}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    const xTicks = 10;
    for (let i = 0; i <= xTicks; i++) {
      const t = tMin + (i / xTicks) * (tMax - tMin);
      if (i === 0) continue; // omit 0.0 at origin
      const x = xPix(t);
      ctx.fillText(t.toFixed(1), x, size.h - PAD_B + 18);
    }

    // tick labels (y) — skip origin 0.0
    ctx.textAlign = "right";
    const yTicks = 10;
    for (let i = 0; i <= yTicks; i++) {
      const s = yMin + (i / yTicks) * (yMax - yMin);
      if (i === 0) continue; // omit 0.0 at origin
      const y = yPix(s);
      ctx.fillText(s.toFixed(1), PAD_L - 8, y + 4);
    }

    ctx.restore();
  }

  function drawCurve(ctx) {
    ctx.save();
    ctx.strokeStyle = "#1976d2"; // blue
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const N = 512;
    for (let i = 0; i <= N; i++) {
      const t = tMin + (i / N) * (tMax - tMin);
      const x = xPix(t);
      const y = yPix(sOfT({ t }));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSecant(ctx) {
    const x1 = xPix(t1);
    const y1 = yPix(sOfT({ t: t1 }));
    const x2 = xPix(t2);
    const y2 = yPix(sOfT({ t: t2 }));

    ctx.save();
    ctx.strokeStyle = "#e53935"; // red
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#e53935";
    ctx.font = `${FONT_ANNOT}px ${FONT_FAMILY}`;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.fillText("secant → v̄ = Δx/Δt", midX - 15, midY - 30);

    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#e57373";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x1, size.h - PAD_B);
    ctx.lineTo(x1, y1);
    ctx.moveTo(x2, size.h - PAD_B);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  function drawTangent(ctx) {
    const left = Math.max(tMin, t0 - dt);
    const right = Math.min(tMax, t0 + dt);

    const sL = sOfT({ t: left });
    const sR = sOfT({ t: right });
    const slope = (sR - sL) / (right - left);

    const s0 = sOfT({ t: t0 });

    const xA = xPix(tMin);
    const yA = yPix(s0 + slope * (tMin - t0));
    const xB = xPix(tMax);
    const yB = yPix(s0 + slope * (tMax - t0));

    ctx.save();
    ctx.strokeStyle = "#43a047"; // green
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xB, yB);
    ctx.stroke();

    // mini secant window markers
    const xL = xPix(left);
    const yL = yPix(sL);
    const xR = xPix(right);
    const yR = yPix(sR);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#43a047";
    ctx.beginPath();
    ctx.arc(xL, yL, 3.8, 0, Math.PI * 2);
    ctx.arc(xR, yR, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // label
    ctx.font = `${FONT_ANNOT}px ${FONT_FAMILY}`;
    ctx.fillText("tangent → v ≈ dx/dt", xPix(t0) - 20, yPix(s0) + 30);

    ctx.restore();
  }

  function drawHandle(ctx, x, y, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawHandles(ctx) {
    drawHandle(ctx, xPix(t1), yPix(sOfT({ t: t1 })), "#e53935");
    drawHandle(ctx, xPix(t2), yPix(sOfT({ t: t2 })), "#e53935");
    drawHandle(ctx, xPix(t0), yPix(sOfT({ t: t0 })), "#43a047");
  }

  function drawMotionOverlay(ctx) {
    const xm = sOfT({ t: tMotion });

    // Moving point on x(t)
    const cx = xPix(tMotion);
    const cy = yPix(xm);
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Vertical 1D rail aligned with the position (y) axis
    const railX = PAD_L; // align with y-axis
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX, PAD_T);
    ctx.lineTo(railX, size.h - PAD_B);
    ctx.stroke();

    // ticks at x=0 and x=10 (positions)
    ctx.beginPath();
    const y0 = yPix(0);
    const y10 = yPix(10);
    ctx.moveTo(railX - 6, y0); ctx.lineTo(railX + 6, y0);
    ctx.moveTo(railX - 6, y10); ctx.lineTo(railX + 6, y10);
    ctx.stroke();

    // Moving object on vertical rail at current position xm ∈ [0,10]
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const dotY = clamp(yPix(xm), PAD_T, size.h - PAD_B);
    ctx.fillStyle = "#1976d2";
    ctx.beginPath();
    ctx.arc(railX - 0, dotY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ----------- INTERACTION (drag handles) -----------
  const draggingRef = useRef(null); // "t1" | "t2" | "t0" | null

  function whichHandle(mx, my) {
    const hitRadius = 12;
    const pts = [
      { key: "t1", x: xPix(t1), y: yPix(sOfT({ t: t1 })) },
      { key: "t2", x: xPix(t2), y: yPix(sOfT({ t: t2 })) },
      { key: "t0", x: xPix(t0), y: yPix(sOfT({ t: t0 })) },
    ];
    for (const p of pts) {
      const dx = mx - p.x;
      const dy = my - p.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) return p.key;
    }
    return null;
  }

  function clampT(t) { return Math.max(tMin, Math.min(tMax, t)); }

  function eventToT(evt) {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = evt.touches && evt.touches[0];
    const clientX = touch ? touch.clientX : evt.clientX;
    const clientY = touch ? touch.clientY : evt.clientY;
    const mx = (clientX - rect.left);
    const my = (clientY - rect.top);
    const t = tMin + ((mx - PAD_L) / (size.w - PAD_L - PAD_R)) * (tMax - tMin);
    return { t: clampT(t), mx, my };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e) => {
      const { mx, my } = eventToT(e);
      const key = whichHandle(mx, my);
      draggingRef.current = key;
    };
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const { t } = eventToT(e);
      if (draggingRef.current === "t1") setT1(Math.min(t, t2 - 0.0001));
      if (draggingRef.current === "t2") setT2(Math.max(t, t1 + 0.0001));
      if (draggingRef.current === "t0") setT0(t);
    };
    const onUp = () => { draggingRef.current = null; };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [t1, t2, t0, size.w]);

  // ----------- Styled Play/Pause Button -----------
  function PlayPauseButton({ playing, onClick }) {
    return (
      <button
        type="button"
        aria-pressed={playing}
        aria-label={playing ? "Pause motion" : "Show motion"}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: "10px 16px",
          borderRadius: 9999,
          fontWeight: 700,
          fontSize: 15,
          color: "#ffffff",
          background: playing
            ? "linear-gradient(90deg,#ef4444,#f59e0b)" // red → amber when playing
            : "linear-gradient(90deg,#4f46e5,#06b6d4)", // indigo → cyan when idle
          boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
          transform: "translateY(0)",
          transition: "transform 120ms ease, filter 120ms ease, box-shadow 120ms ease",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          if (onClick) onClick(e);
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.05)")}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <span style={{ marginRight: 6 }}>{playing ? "⏸" : "▶"}</span>
        {playing ? "Pause motion" : "Show motion"}
      </button>
    );
  }

  const Fraction = ({ top, bottom, style }) => (
  <span
    style={{
      display: "inline-block",
      textAlign: "center",
      lineHeight: 1.05,
      verticalAlign: "-0.2em",
      ...style
    }}
    aria-label={`${top} over ${bottom}`}
  >
    <span>{top}</span>
    <span style={{ display: "block", borderTop: "1px solid #777" }}>{bottom}</span>
  </span>
);


  // ----------- RENDER -----------
  const deltaX = sOfT({ t: t2 }) - sOfT({ t: t1 });
  const deltaT = t2 - t1;
  const x_t0 = sOfT({ t: t0 });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 12 }}>
      <h2 style={{ margin: "8px 0 4px", fontWeight: 700 }}>Average vs. Instantaneous Velocity</h2>
      <p style={{ margin: 0, color: "#444", fontSize: 15 }}>
        The <strong style={{ color: "#e53935" }}>secant </strong> slope gives the average velocity between two <strong style={{ color: "#e53935" }}>points </strong>. </p>
        <p style={{ margin: 0, color: "#444", fontSize: 15 }}>
          The <strong style={{ color: "#43a047" }}>
              tangent
            </strong> slope gives the instantaneous velocity at a particular <strong style={{ color: "#43a047" }}>point</strong>.
      </p>

      <div ref={wrapperRef} style={{ width: "100%", marginTop: 10 }}>
        <canvas
          ref={canvasRef}
          style={{
            width: size.w,
            height: size.h,
            borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
          }}
        />
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
        <PlayPauseButton playing={isPlaying} onClick={() => setIsPlaying(p => !p)} />
        <div style={{ fontSize: 15, color: "#555" }}>t = {tMotion.toFixed(2)} s</div>
      </div>

      {/* Readout only */}
      <div style={{ padding: 12, border: "1px solid #e0e0e0", borderRadius: 10, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 16 }}>Readout</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            rowGap: 8,
            columnGap: 10,
            fontVariantNumeric: "tabular-nums",
            fontSize: 15,
          }}
        >
          <div>Average velocity v̄ (t₁→t₂)</div>
            <div>
            {/* symbolic fraction  Δx/Δt  =  numeric fraction  = value */}
            <Fraction top="Δx" bottom="Δt" />
            <span style={{ margin: "0 8px" }}>=</span>
            <Fraction top={`${deltaX.toFixed(1)} m`} bottom={`${deltaT.toFixed(1)} s`} />
            <span style={{ margin: "0 8px" }}>=</span>
            <strong style={{ color: "#e53935" }}>
                {Number.isFinite(avgV) ? avgV.toFixed(2) : "—"} m/s
            </strong>
            </div>

          <div>Instantaneous velocity v(t₀)</div>
          <div>
            <strong style={{ color: "#43a047" }}>
              {Number.isFinite(instV) ? instV.toFixed(2) : "—"} m/s
            </strong>
            <span style={{ marginLeft: 10, color: "#555" }}>
              (t₀ = {t0.toFixed(1)} s, x(t₀) = {x_t0.toFixed(1)} m)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
