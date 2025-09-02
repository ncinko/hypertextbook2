import React, { useEffect, useMemo, useRef, useState } from "react";

export default function VelocityExplorer() {
  // ----------- Model -----------
  const a = 0.05, b = -0.6, c = 2.0, d = 0.0;
  const sOfT = ({ t }) => a * t * t * t + b * t * t + c * t + d;
  const vOfT = (t) => 3 * a * t * t + 2 * b * t + c; // analytic derivative

  // ----------- Axes -----------
  const tMin = 0, tMax = 10;
  const yMin = 0, yMax = 10;

  // Secant & tangent handles
  const [t1, setT1] = useState(2);
  const [t2, setT2] = useState(8);
  const [t0, setT0] = useState(5);
  const dt = 0.30;

  // Motion playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [tMotion, setTMotion] = useState(0);
  const lastTsRef = useRef(null);
  const rafIdRef = useRef(null);
  const playSpeed = 1.0;
  const runningRef = useRef(false);

  // Layout / canvases
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);   // position canvas
  const vCanvasRef = useRef(null);  // velocity canvas
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const [size, setSize] = useState({ w: 800, h: 500 });

  // Typography
  const FONT_FAMILY = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const FONT_AXIS = 15, FONT_TICK = 14, FONT_ANNOT = 14;

  // Responsive sizing
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const minW = 400, minH = 260;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.max(minW, Math.floor(entry.contentRect.width));
        const h = Math.max(minH, Math.floor(5 * w / 8));
        setSize({ w, h });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Show Motion loop
  useEffect(() => {
    if (!isPlaying) {
      runningRef.current = false;
      lastTsRef.current = null;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      return;
    }
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = (ts) => {
      if (!runningRef.current) return;
      if (lastTsRef.current === null) lastTsRef.current = ts;
      else {
        const dtMs = ts - lastTsRef.current;
        lastTsRef.current = ts;
        const dtSec = (dtMs / 1000) * playSpeed;
        setTMotion(prev => {
          const span = tMax - tMin;
          let next = prev + dtSec;
          return span > 0 ? ((next - tMin) % span + span) % span + tMin : next;
        });
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    lastTsRef.current = null;
    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      runningRef.current = false;
      lastTsRef.current = null;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [isPlaying]);

  // Mappers & padding (position plot)
  const PAD_L = 64, PAD_R = 24, PAD_T = 18, PAD_B = 56;
  const xPix = (t) => PAD_L + ((t - tMin) / (tMax - tMin)) * (size.w - PAD_L - PAD_R);
  const yPix = (s) => size.h - PAD_B - ((s - yMin) / (yMax - yMin)) * (size.h - PAD_T - PAD_B);

  // Readouts
  const avgV = useMemo(() => (t2 === t1 ? NaN : (sOfT({ t: t2 }) - sOfT({ t: t1 })) / (t2 - t1)), [t1, t2]);
  const instV = useMemo(() => {
    const L = Math.max(tMin, t0 - dt);
    const R = Math.min(tMax, t0 + dt);
    if (R === L) return NaN;
    return (sOfT({ t: R }) - sOfT({ t: L })) / (R - L);
  }, [t0]);

  // ---------- Draw: position canvas ----------
  // simple on-canvas button geometry (below origin)
  const playBtn = useRef({ x: 12, y: 0, w: 140, h: 34 }); // y gets set after we know height

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = Math.floor(size.w * dpr);
    canvas.height = Math.floor(size.h * dpr);
    canvas.style.width = size.w + "px";
    canvas.style.height = size.h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // bg
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

    // draw on-canvas Play/Pause button
    drawPlayButton(ctx);
  }, [t1, t2, t0, dpr, size, tMotion, isPlaying]);

  function drawGrid(ctx) {
    ctx.save(); ctx.strokeStyle = "#eee"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { // time grid
      const t = tMin + (i / 10) * (tMax - tMin);
      const x = xPix(t);
      ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, size.h - PAD_B); ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) { // position grid
      const s = yMin + (i / 10) * (yMax - yMin);
      const y = yPix(s);
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(size.w - PAD_R, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawAxes(ctx) {
    ctx.save(); ctx.strokeStyle = "#222"; ctx.lineWidth = 1.6;
    // axes
    ctx.beginPath(); ctx.moveTo(PAD_L, size.h - PAD_B); ctx.lineTo(size.w - PAD_R, size.h - PAD_B); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, size.h - PAD_B); ctx.stroke();
    // titles
    ctx.fillStyle = "#222"; ctx.font = `${FONT_AXIS}px ${FONT_FAMILY}`; ctx.textAlign = "center";
    ctx.fillText("time (s)", (PAD_L + size.w - PAD_R) / 2, size.h - 14);
    ctx.save(); ctx.translate(16, (PAD_T + size.h - PAD_B) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("position (m)", 0, 0); ctx.restore();
    // ticks (skip 0.0 at origin)
    ctx.font = `${FONT_TICK}px ${FONT_FAMILY}`; ctx.textAlign = "center";
    for (let i = 1; i <= 10; i++) ctx.fillText((i).toFixed(0), xPix(tMin + i), size.h - PAD_B + 18);
    ctx.textAlign = "right";
    for (let i = 1; i <= 10; i++) ctx.fillText((i).toFixed(0), PAD_L - 8, yPix(i) + 4);
    ctx.restore();
  }

  function drawCurve(ctx) {
    ctx.save(); ctx.strokeStyle = "#1976d2"; ctx.lineWidth = 2.4;
    ctx.beginPath();
    const N = 512;
    for (let i = 0; i <= N; i++) {
      const t = tMin + (i / N) * (tMax - tMin);
      const x = xPix(t), y = yPix(sOfT({ t }));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.restore();
  }

  function drawSecant(ctx) {
    const x1 = xPix(t1), y1 = yPix(sOfT({ t: t1 }));
    const x2 = xPix(t2), y2 = yPix(sOfT({ t: t2 }));
    ctx.save();
    ctx.strokeStyle = "#e53935"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "#e53935"; ctx.font = `${FONT_ANNOT}px ${FONT_FAMILY}`;
    ctx.fillText(`v̄ = ${Number.isFinite(avgV) ? avgV.toFixed(2) : "—"} m/s`, (x1 + x2) / 2 - 15, (y1 + y2) / 2 - 30);
    ctx.globalAlpha = 0.6; ctx.strokeStyle = "#e57373"; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(x1, size.h - PAD_B); ctx.lineTo(x1, y1);
    ctx.moveTo(x2, size.h - PAD_B); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function drawTangent(ctx) {
    const L = Math.max(tMin, t0 - dt);
    const R = Math.min(tMax, t0 + dt);
    const sL = sOfT({ t: L }), sR = sOfT({ t: R });
    const slope = (sR - sL) / (R - L);
    const s0 = sOfT({ t: t0 });

    const xA = xPix(tMin), yA = yPix(s0 + slope * (tMin - t0));
    const xB = xPix(tMax), yB = yPix(s0 + slope * (tMax - t0));

    ctx.save();
    ctx.strokeStyle = "#43a047"; // green
    ctx.lineWidth = 2; ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(xA, yA); ctx.lineTo(xB, yB); ctx.stroke();

    // mini window markers
    const xL = xPix(L), yL = yPix(sL), xR = xPix(R), yR = yPix(sR);
    ctx.setLineDash([]); ctx.globalAlpha = 0.9; ctx.fillStyle = "#43a047";
    ctx.beginPath(); ctx.arc(xL, yL, 3.8, 0, Math.PI * 2); ctx.arc(xR, yR, 3.8, 0, Math.PI * 2); ctx.fill();

    // label near the point
    ctx.font = `${FONT_ANNOT}px ${FONT_FAMILY}`; ctx.fillStyle = "#1b5e20";
    ctx.fillText(`v(t) ≈ ${Number.isFinite(instV) ? instV.toFixed(2) : "—"} m/s`, xPix(t0) + 8, yPix(s0) +30);
    ctx.restore();
  }

  function drawHandle(ctx, x, y, color) {
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function drawHandles(ctx) {
    drawHandle(ctx, xPix(t1), yPix(sOfT({ t: t1 })), "#e53935");
    drawHandle(ctx, xPix(t2), yPix(sOfT({ t: t2 })), "#e53935");
    drawHandle(ctx, xPix(t0), yPix(sOfT({ t: t0 })), "#43a047");
  }

  function drawMotionOverlay(ctx) {
    const xm = sOfT({ t: tMotion });
    const cx = xPix(tMotion), cy = yPix(xm);
    ctx.save();
    ctx.fillStyle = "#1976d2"; ctx.beginPath(); ctx.arc(cx, cy, 4.8, 0, Math.PI * 2); ctx.fill();
    const railX = PAD_L;
    ctx.strokeStyle = "#444"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(railX, PAD_T); ctx.lineTo(railX, size.h - PAD_B); ctx.stroke();
    ctx.beginPath(); const y0p = yPix(0), y10p = yPix(10);
    ctx.moveTo(railX - 6, y0p); ctx.lineTo(railX + 6, y0p);
    ctx.moveTo(railX - 6, y10p); ctx.lineTo(railX + 6, y10p); ctx.stroke();
    ctx.fillStyle = "#1976d2"; ctx.beginPath(); ctx.arc(railX, Math.max(PAD_T, Math.min(size.h - PAD_B, yPix(xm))), 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---- On-canvas Play/Pause button (position canvas) ----
  function drawPlayButton(ctx) {
    const x0 = 12; // left margin area
    const y0 = size.h - PAD_B + 8; // just below the origin line, inside canvas
    const w = 148, h = 34;
    playBtn.current = { x: x0, y: y0, w, h };

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x0, y0, w, h, 16);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(isPlaying ? "Pause motion" : "Show motion", x0 + w / 2, y0 + h / 2);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r = 10) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function inPlayButton(mx, my) {
    const { x, y, w, h } = playBtn.current;
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  }

  // ---------- Velocity plot (fixed range & draggable marker) ----------
  useEffect(() => {
    drawVelocityPlot(t0);
  }, [size.w, size.h, t0]);

  const vGeomRef = useRef({ pL: 64, pR: 24, pT: 12, pB: 40, vmin: -5, vmax: 5 });

  const drawVelocityPlot = (tMarker) => {
    const canvas = vCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = size.w, H = size.h/2;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pL = 64, pR = 24, pT = 12, pB = 40;
    vGeomRef.current = { pL, pR, pT, pB, vmin: -5, vmax: 5 };

    const xMap = (t) => pL + ((t - tMin) / (tMax - tMin)) * (W - pL - pR);
    const yMap = (v) => H - pB - ((v - (-5)) / (10)) * (H - pT - pB);

    // bg
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#fafafa"; ctx.fillRect(0, 0, W, H);

    // grid & zero line
    ctx.strokeStyle = "#eee"; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const t = tMin + (i / 10) * (tMax - tMin);
      const x = xMap(t);
      ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, H - pB); ctx.stroke();
    }
    const zy = yMap(0);
    ctx.beginPath(); ctx.moveTo(pL, zy); ctx.lineTo(W - pR, zy);
    ctx.strokeStyle = "#e5e7eb"; ctx.stroke();

    // axes
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(pL, H - pB); ctx.lineTo(W - pR, H - pB); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pL, pT); ctx.lineTo(pL, H - pB); ctx.stroke();

    // labels/ticks
    ctx.fillStyle = "#222"; ctx.font = `${FONT_AXIS}px ${FONT_FAMILY}`; ctx.textAlign = "center";
    ctx.fillText("time (s)", (pL + W - pR) / 2, H - 8);
    ctx.save(); ctx.translate(14, (pT + H - pB) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("velocity (m/s)", 0, 0); ctx.restore();

    ctx.font = `${FONT_TICK}px ${FONT_FAMILY}`; ctx.textAlign = "center";
    for (let i = 1; i <= 10; i++) ctx.fillText(String(i), xMap(tMin + i), H - pB + 18);

    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = -5 + (i / 4) * (10);
      ctx.fillText(v.toFixed(1), pL - 8, yMap(v) + 4);
    }

    // v(t) curve (green)
    ctx.strokeStyle = "#43a047"; ctx.lineWidth = 2.2;
    ctx.beginPath();
    const steps = 512;
    for (let i = 0; i <= steps; i++) {
      const t = tMin + (i / steps) * (tMax - tMin);
      const x = xMap(t), y = yMap(vOfT(t));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // marker at t₀
    const tx = xMap(Math.min(Math.max(tMarker, tMin), tMax));
    const ty = yMap(vOfT(Math.min(Math.max(tMarker, tMin), tMax)));
    ctx.fillStyle = "#43a047";
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#1b5e20"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI * 2); ctx.stroke();
  };

  // ---------- Interaction ----------
  // (A) Drag handles on position plot, PLUS clicking the on-canvas button
  const draggingRef = useRef(null); // "t1" | "t2" | "t0" | "playbtn" | null

  function whichHandleOnPosition(mx, my) {
    // button first
    if (inPlayButton(mx, my)) return "playbtn";
    // then handles
    const hit = 12;
    const pts = [
      { key: "t1", x: xPix(t1), y: yPix(sOfT({ t: t1 })) },
      { key: "t2", x: xPix(t2), y: yPix(sOfT({ t: t2 })) },
      { key: "t0", x: xPix(t0), y: yPix(sOfT({ t: t0 })) },
    ];
    for (const p of pts) {
      const dx = mx - p.x, dy = my - p.y;
      if (dx * dx + dy * dy <= hit * hit) return p.key;
    }
    return null;
  }
  function clampT(t) { return Math.max(tMin, Math.min(tMax, t)); }
  function eventToCanvasCoords(evt, targetCanvas) {
    const rect = targetCanvas.getBoundingClientRect();
    const touch = evt.touches && evt.touches[0];
    const clientX = touch ? touch.clientX : evt.clientX;
    const clientY = touch ? touch.clientY : evt.clientY;
    return { mx: clientX - rect.left, my: clientY - rect.top };
  }
  function eventToTOnPosition(evt) {
    const { mx } = eventToCanvasCoords(evt, canvasRef.current);
    const t = tMin + ((mx - PAD_L) / (size.w - PAD_L - PAD_R)) * (tMax - tMin);
    return clampT(t);
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;

    const onDown = (e) => {
      const { mx, my } = eventToCanvasCoords(e, canvas);
      const hit = whichHandleOnPosition(mx, my);
      draggingRef.current = hit;
      if (hit === "playbtn") {
        setIsPlaying(p => !p);
      }
    };
    const onMove = (e) => {
      if (!draggingRef.current) return;
      if (draggingRef.current === "t1" || draggingRef.current === "t2" || draggingRef.current === "t0") {
        const t = eventToTOnPosition(e);
        if (draggingRef.current === "t1") setT1(Math.min(t, t2 - 0.0001));
        if (draggingRef.current === "t2") setT2(Math.max(t, t1 + 0.0001));
        if (draggingRef.current === "t0") setT0(t);
      }
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
  }, [t1, t2, t0, size.w, isPlaying]);

  // (B) Drag the v(t) marker to bind t₀
  const draggingVRef = useRef(false);
  function vCanvasXToTime(mx) {
    const { pL, pR } = vGeomRef.current;
    const W = size.w;
    const t = tMin + ((mx - pL) / (W - pL - pR)) * (tMax - tMin);
    return clampT(t);
  }
  useEffect(() => {
    const canvas = vCanvasRef.current; if (!canvas) return;

    const onDown = (e) => {
      const { mx, my } = eventToCanvasCoords(e, canvas);
      // start dragging if near the marker (within ~14px) OR anywhere on plot (feels nice)
      draggingVRef.current = true;
      setT0(vCanvasXToTime(mx));
    };
    const onMove = (e) => {
      if (!draggingVRef.current) return;
      const { mx } = eventToCanvasCoords(e, canvas);
      setT0(vCanvasXToTime(mx));
    };
    const onUp = () => { draggingVRef.current = false; };

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
  }, [size.w]);

  // ---------- UI ----------
  const Fraction = ({ top, bottom, style }) => (
    <span style={{ display: "inline-block", textAlign: "center", lineHeight: 1.05, verticalAlign: "-0.2em", ...style }}>
      <span>{top}</span>
      <span style={{ display: "block", borderTop: "1px solid #777" }}>{bottom}</span>
    </span>
  );

  const deltaX = sOfT({ t: t2 }) - sOfT({ t: t1 });
  const deltaT = t2 - t1;
  const x_t0 = sOfT({ t: t0 });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 12 }}>
      

      {/* Position plot (with on-canvas button) */}
      <div ref={wrapperRef} style={{ width: "100%", marginTop: 10 }}>
        <canvas
          ref={canvasRef}
          style={{
            width: size.w,
            height: size.h,
            borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
            display: "block",
            marginInline: "auto",
            touchAction: "none", // allow custom gestures
          }}
          aria-label="Position versus time plot with on-canvas play/pause button"
        />
      </div>

      {/* Readout 
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
      */}

      {/* Velocity plot (fixed range, green curve, draggable t₀ marker) */}
      <div style={{ marginTop: 12 }}>
        <canvas
          ref={vCanvasRef}
          style={{
            width: size.w,
            height: size.h/2,
            borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e0e0e0",
            display: "block",
            marginInline: "auto",
            touchAction: "none"
          }}
          aria-label="Velocity versus time plot (−5 to +5 m/s) with draggable marker to set t₀"
        />
      </div>
    </div>
  );
}
