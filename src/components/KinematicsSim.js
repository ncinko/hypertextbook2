import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * components/KinematicsSim.jsx
 *
 * 1D kinematics sandbox — single game mode:
 *   STOP-IN-ZONES CHALLENGE
 *   • Toggle game on/off (off by default).
 *   • A highlighted zone appears on the track.
 *   • You have a per-zone time limit (starts at 5s, +5s each successful stop).
 *   • Stop inside the zone with |v| ≤ V_THRESH and hold for HOLD_TIME.
 *   • Each success shrinks the zone width and spawns a new one elsewhere.
 *   • 30 successful stops = WIN. Shows total time from game start.
 *
 * Controls: ←/→ accelerate, Space pause, R restart.
 * Clean, low-contrast palette; traces are below the animation.
 */

// ----- Styles / Colors (avoid harsh primaries) -----
const COLORS = {
  bg: "#f7f7f7",          // page background
  panel: "#ffffff",       // panels/cards
  panelBorder: "#e5e7eb", // light gray border
  text: "#1f2937",        // slate-800
  subtext: "#6b7280",     // slate-500
  accent: "#0f766e",      // teal-700 (muted)
  accentSoft: "#65a30d",  // olive/lime-600 (muted)
  cart: "#475569",        // slate-600
  track: "#e5e7eb",       // light gray
  grid: "#e5e7eb",        // light gray for plots
  x: "#0ea5a0",           // teal-500
  v: "#9061f9",           // violet-500 (soft)
  a: "#dc8850",           // orange-400/500
  zoneFill: "rgba(148,163,184,0.25)", // translucent slate
  zoneBorder: "#94a3b8",
  success: "#16a34a",     // green-600 (muted)
  danger: "#b45309",      // amber-700
};

// ----- Simulation constants -----
const DEFAULTS = {
  A_MAX: 4,               // m/s^2
  SCALE: 80,              // px per meter (internal only)
  HISTORY_SECONDS: 10,    // seconds of traces
  WORLD_HALF_WIDTH_M: 6,  // meters to either side of origin (render ramp)

  // Game tuning
  START_ZONE_HALF: 1.2,       // meters (starts easy)
  MIN_ZONE_HALF: 0.25,        // meters (difficulty floor)
  SHRINK_FACTOR: 0.05,        // multiply zone half-width after each success
  V_THRESH: 0.35,             // m/s required for a valid stop
  HOLD_TIME: 0.6,             // seconds of dwell while slow inside zone
  ZONE_TIME_START: 8.0,       // seconds on first zone
  ZONE_TIME_INCREMENT: 2.0,   // add 5s after each successful stop
  WIN_STOPS: 15,
};

const INITIAL_STATE = { x: 0, v: 0, a: 0 };

function useAnimationFrame(callback, isRunning) {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const loop = useCallback(
    (time) => {
      if (previousTimeRef.current !== undefined) {
        const dt = (time - previousTimeRef.current) / 1000;
        callback(Math.min(dt, 0.05)); // clamp to avoid huge steps when tab is inactive
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(loop);
    },
    [callback]
  );

  useEffect(() => {
    if (!isRunning) return;
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isRunning, loop]);
}

function niceNumber(n, sig = 2) {
  return Number.parseFloat(n.toFixed(sig));
}

export default function KinematicsSim() {
  const [state, setState] = useState(INITIAL_STATE);
  const [paused, setPaused] = useState(false);
  const [A_MAX, setAMax] = useState(DEFAULTS.A_MAX);
  const [scale] = useState(DEFAULTS.SCALE); // internal only
  const [wrapWorld, setWrapWorld] = useState(true);
  const [plotTick, setPlotTick] = useState(0); // forces plot refresh

  // Game state
  const [gameOn, setGameOn] = useState(false); // off by default
  const [zoneCenter, setZoneCenter] = useState(2); // meters from origin
  const [zoneHalfWidth, setZoneHalfWidth] = useState(DEFAULTS.START_ZONE_HALF);
  const [dwell, setDwell] = useState(0);
  const [stops, setStops] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const gameStartAbs = useRef(performance.now() / 1000);
  const zoneDeadlineAbs = useRef(performance.now() / 1000);

  const worldWidthM = DEFAULTS.WORLD_HALF_WIDTH_M * 2;

  // Input state
  const keys = useRef({ left: false, right: false });

  // History for traces
  const history = useRef([]); // entries: { t, x, v, a }
  const t0 = useRef(performance.now() / 1000);

  // Pause handling to keep trace time continuous
  const pauseAbsRef = useRef(null);
  const wasPausedRef = useRef(false);
  useEffect(() => {
    const now = performance.now() / 1000;
    if (paused && !wasPausedRef.current) {
      // just entered pause
      pauseAbsRef.current = now;
    } else if (!paused && wasPausedRef.current) {
      // just resumed: shift trace epoch forward by paused duration
      const delta = now - (pauseAbsRef.current ?? now);
      t0.current += delta;
      zoneDeadlineAbs.current += delta; // push the zone deadline forward by the paused duration
      gameStartAbs.current += delta;    // exclude paused time from total elapsed

      pauseAbsRef.current = null;
    }
    wasPausedRef.current = paused;
  }, [paused]);

  // Canvas ref
  const canvasRef = useRef(null);

  // Keyboard
  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return;
      if (e.key === "ArrowLeft") { keys.current.left = true; }
      if (e.key === "ArrowRight") { keys.current.right = true; }
      if (e.code === "Space") { e.preventDefault(); setPaused(p => !p); }
      if (e.key.toLowerCase() === "r") { restart(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") { keys.current.left = false; }
      if (e.key === "ArrowRight") { keys.current.right = false; }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const restart = useCallback(() => {
    // Reset simulation + game; start a fresh run
    setState({ ...INITIAL_STATE });
    history.current = [];
    t0.current = performance.now() / 1000;
    gameStartAbs.current = performance.now() / 1000;
    setStops(0);
    // First zone deadline: 5s
    zoneDeadlineAbs.current = gameStartAbs.current + DEFAULTS.ZONE_TIME_START;
    setDwell(0);
    setZoneCenter(2);
    setZoneHalfWidth(DEFAULTS.START_ZONE_HALF);
    setGameOver(false);
    setWin(false);
    setPaused(false);
    setPlotTick((k) => k + 1);
  }, []);

  const newZone = useCallback((stopsCount = stops) => {
    // place new zone somewhere not too close to current x to encourage travel
    const half = DEFAULTS.WORLD_HALF_WIDTH_M;
    let z;
    for (let i = 0; i < 20; i++) {
      z = (Math.random() * 2 - 1) * (half - 0.5);
      const dx = wrapDelta(z, state.x, half);
      if (Math.abs(dx) > 1.2) break;
    }
    setZoneCenter(z);
    setDwell(0);
    // deadline grows with successes achieved so far
    const now = performance.now() / 1000;
    const extra = DEFAULTS.ZONE_TIME_START + stopsCount * DEFAULTS.ZONE_TIME_INCREMENT;
    zoneDeadlineAbs.current = now + extra;
  }, [state.x, stops]);

  // Integrate motion + game logic
  useAnimationFrame(
    (dt) => {
      if (paused || gameOver) return;

      const inputA = keys.current.right === keys.current.left
        ? 0
        : keys.current.right
        ? +A_MAX
        : -A_MAX;

      setState((s) => {
        // Semi-implicit Euler
        const a = inputA;
        let v = s.v + a * dt;
        let x = s.x + v * dt;

        if (wrapWorld) {
          const half = DEFAULTS.WORLD_HALF_WIDTH_M;
          if (x < -half) x += worldWidthM;
          if (x > half) x -= worldWidthM;
        }

        // push history sample with new state
        const t = performance.now() / 1000 - t0.current;
        history.current.push({ t, x, v, a });
        const cutoff = t - DEFAULTS.HISTORY_SECONDS - 0.25;
        while (history.current.length && history.current[0].t < cutoff) history.current.shift();

        // Stop-in-Zones logic (only when game is on)
        if (gameOn) {
          const half = DEFAULTS.WORLD_HALF_WIDTH_M;
          const dx = Math.abs(wrapDelta(x, zoneCenter, half));
          const inside = dx <= zoneHalfWidth;
          const slow = Math.abs(v) <= DEFAULTS.V_THRESH;
          if (inside && slow) {
            setDwell((d) => d + dt);
          } else {
            setDwell(0);
          }

          // Check success
          if (inside && slow && dwell + dt >= DEFAULTS.HOLD_TIME) {
            const nextStops = stops + 1;
            setStops(nextStops);
            // shrink difficulty
            setZoneHalfWidth((w) => Math.max(DEFAULTS.MIN_ZONE_HALF, w - DEFAULTS.SHRINK_FACTOR));
            // spawn new zone & reset timer using nextStops
            newZone(nextStops);
            // win condition
            if (nextStops >= DEFAULTS.WIN_STOPS) {
              setGameOver(true);
              setWin(true);
            }
          }

          // Time-out loss
          if (performance.now() / 1000 > zoneDeadlineAbs.current) {
            setGameOver(true);
            setWin(false);
          }
        }

        setPlotTick((k) => k + 1);
        return { x, v, a };
      });
    },
    true // keep sim loop active
  );

  // Draw animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(0, 0, cssW, cssH);

    // Track center line
    const midY = Math.round(cssH * 0.65);
    ctx.strokeStyle = COLORS.track;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, midY);
    ctx.lineTo(cssW - 16, midY);
    ctx.stroke();

    // Tick marks (every meter)
    const metersPerTick = 1;
    const pxPerMeter = scale;
    const originX = Math.round(cssW / 2);
    ctx.strokeStyle = COLORS.grid;
    for (let m = -DEFAULTS.WORLD_HALF_WIDTH_M; m <= DEFAULTS.WORLD_HALF_WIDTH_M; m += metersPerTick) {
      const xPx = originX + m * pxPerMeter;
      if (xPx < 8 || xPx > cssW - 8) continue;
      ctx.beginPath();
      ctx.moveTo(xPx, midY - 12);
      ctx.lineTo(xPx, midY + 12);
      ctx.stroke();
    }

    // Zone (only when game on)
    if (gameOn) {
      drawZone(ctx, zoneCenter, zoneHalfWidth, originX, pxPerMeter, midY, cssW);
    }

    // Draw cart
    const cartX = originX + state.x * pxPerMeter;
    const cartY = midY - 18;
    const cartW = 44;
    const cartH = 24;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.beginPath();
    ctx.ellipse(cartX, midY + 8, cartW * 0.55, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = COLORS.cart;
    ctx.strokeStyle = "#cbd5e1"; // slate-300 outline, soft
    ctx.lineWidth = 1.5;
    roundRect(ctx, cartX - cartW / 2, cartY - cartH / 2, cartW, cartH, 8);
    ctx.fill();
    ctx.stroke();

    // velocity arrow
    const vPx = Math.max(-60, Math.min(60, state.v * 10));
    drawArrow(ctx, cartX, cartY - cartH * 0.9, cartX + vPx, cartY - cartH * 0.9, COLORS.accent);

    // acceleration arrow
    const aPx = Math.max(-60, Math.min(60, state.a * 15));
    drawArrow(ctx, cartX, cartY - cartH * 1.55, cartX + aPx, cartY - cartH * 1.55, COLORS.accentSoft);

    // Labels
    ctx.fillStyle = COLORS.subtext;
    ctx.font = "500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("velocity", cartX - 24, cartY - cartH * 0.9 - 8);
    ctx.fillText("acceleration", cartX - 32, cartY - cartH * 1.55 - 8);
  }, [state, scale, zoneCenter, zoneHalfWidth, gameOn]);

  // Derived readouts
  const readouts = useMemo(
    () => ({ x: niceNumber(state.x), v: niceNumber(state.v), a: niceNumber(state.a) }),
    [state]
  );

  // --- Render ---
  return (
    <div style={{
      background: COLORS.bg,
      color: COLORS.text,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 16,
      padding: 16,
    }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setPaused(p => !p)} style={btnStyle}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button onClick={restart} style={{ ...btnStyle, background: "#e5e7eb", color: COLORS.text }}>Restart (R)</button>

        <LabeledSlider
          label={`a: ${A_MAX.toFixed(1)} m/s²`}
          min={0}
          max={10}
          step={0.1}
          value={A_MAX}
          onChange={setAMax}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext }}>
          <input
            type="checkbox"
            checked={gameOn}
            onChange={(e) => {
              const v = e.target.checked;
              setGameOn(v);
              if (v) {
                restart();
              } else {
                setGameOver(false);
                setWin(false);
                setDwell(0);
              }
            }}
          />
          game mode
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext, marginLeft: "auto" }}>
          <input type="checkbox" checked={wrapWorld} onChange={(e) => setWrapWorld(e.target.checked)} />
          wrap world
        </label>
      </div>

      {/* HUD */}
      {gameOn && (
        <div style={{
          display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12,
          background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: "10px 12px"
        }}>
          <div><strong>stops</strong>: {stops} / {DEFAULTS.WIN_STOPS}</div>
          <div>| <strong>zone width</strong>: {(zoneHalfWidth*2).toFixed(2)} m</div>
          <div>| <strong>time left</strong>: {Math.max(0, zoneDeadlineAbs.current - performance.now() / 1000).toFixed(1)} s</div>
          <div style={{ marginLeft: "auto", color: COLORS.subtext }}>
            total time: {(performance.now() / 1000 - gameStartAbs.current).toFixed(1)} s
          </div>
        </div>
      )}

      {/* Game over banner */}
      {gameOn && gameOver && (
        <div style={{
          background: win ? "rgba(22,163,74,0.12)" : "rgba(180,83,9,0.12)",
          border: `1px solid ${win ? COLORS.success : COLORS.danger}`,
          color: win ? COLORS.success : COLORS.danger,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          fontWeight: 700,
          textAlign: "center",
        }}>
          {win ? `You won! 15 stops in ${(performance.now() / 1000 - gameStartAbs.current).toFixed(1)} s` : "Time's up! Toggle game to try again."}
        </div>
      )}

      {/* Readouts */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat label="x (m)" value={readouts.x} />
        <Stat label="v (m/s)" value={readouts.v} />
        <Stat label="a (m/s²)" value={readouts.a} />
      </div>

      {/* Animation */}
      <div style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 14,
        padding: 12,
      }}>
        <div style={{ height: 200, position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>

      {/* Traces (fixed y-scales for x and v, taller plots) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
        <MiniPlot
          historyRef={history}
          color={COLORS.x}
          label="x(t) [m]"
          heightPx={140}
          yMin={-DEFAULTS.WORLD_HALF_WIDTH_M}
          yMax={DEFAULTS.WORLD_HALF_WIDTH_M}
          tick={plotTick}
        />
        <MiniPlot
          historyRef={history}
          color={COLORS.v}
          label="v(t) [m/s]"
          heightPx={140}
          yMin={-3 * A_MAX}
          yMax={3 * A_MAX}
          tick={plotTick}
        />
        <MiniPlot
          historyRef={history}
          color={COLORS.a}
          label="a(t) [m/s²]"
          tick={plotTick}
        />
      </div>
    </div>
  );
}

// ---- UI bits ----
const btnStyle = {
  background: COLORS.accent,
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "8px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

function Stat({ label, value }) {
  return (
    <div style={{
      background: COLORS.panel,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 12,
      padding: "10px 12px",
      minWidth: 120,
    }}>
      <div style={{ fontSize: 12, color: COLORS.subtext }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function LabeledSlider({ label, min, max, step, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: COLORS.subtext, minWidth: 110 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor: COLORS.accent }}
      />
    </div>
  );
}

// ---- Plot component (fixed or auto y-scale) ----
function MiniPlot({ historyRef, color, label, tick, heightPx = 90, yMin = null, yMax = null }) {
  const svgRef = useRef(null);
  const [width, setWidth] = useState(0);

  // Resize observer for responsive SVG width
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padding = { l: 40, r: 10, t: 10, b: 24 };

  const pathD = useMemo(() => {
    const data = historyRef.current;
    if (!data.length || width === 0) return "";

    const tMin = Math.max(0, data[data.length - 1].t - DEFAULTS.HISTORY_SECONDS);
    const tMax = data[data.length - 1].t;

    // Y-range: fixed if yMin/yMax provided; else auto from data
    let ymin = yMin, ymax = yMax;
    if (ymin == null || ymax == null) {
      ymin = Infinity; ymax = -Infinity;
      for (const d of data) {
        if (d.t < tMin) continue;
        const y = pickLabelValue(label, d);
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
      if (!isFinite(ymin) || !isFinite(ymax)) return "";
      if (ymin === ymax) { ymin -= 1; ymax += 1; }
    }

    const W = width - padding.l - padding.r;
    const H = heightPx - padding.t - padding.b;
    const mapX = (t) => padding.l + ((t - tMin) / (tMax - tMin || 1)) * W;
    const mapY = (y) => padding.t + (1 - (y - ymin) / (ymax - ymin || 1)) * H;

    let dStr = "", started = false;
    for (const s of data) {
      if (s.t < tMin) continue;
      const x = mapX(s.t);
      const y = mapY(pickLabelValue(label, s));
      if (!started) { dStr += `M ${x},${y}`; started = true; }
      else { dStr += ` L ${x},${y}`; }
    }
    return dStr;
  }, [historyRef, label, width, tick, heightPx, yMin, yMax]);

  return (
    <div style={{
      background: COLORS.panel,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 12,
      padding: 8,
    }}>
      <div style={{ fontSize: 12, color: COLORS.subtext, marginBottom: 6 }}>{label}</div>
      <svg ref={svgRef} width="100%" height={heightPx}>
        <rect x={0} y={0} width={width} height={heightPx} fill={COLORS.panel} rx={10} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    </div>
  );
}

// ---- helpers ----
function pickLabelValue(label, d) {
  if (label.startsWith("x(")) return d.x;
  if (label.startsWith("v(")) return d.v;
  if (label.startsWith("a(")) return d.a;
  return 0;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const size = 6;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 10 - uy * size, y2 - uy * 10 + ux * size);
  ctx.lineTo(x2 - ux * 10 + uy * size, y2 - uy * 10 - ux * size);
  ctx.closePath();
  ctx.fill();
}

function drawZone(ctx, centerM, halfWm, originX, pxPerMeter, midY, cssW) {
  // Convert zone [center-half, center+half] meters to pixel spans; may wrap past edges
  const leftPx = originX + (centerM - halfWm) * pxPerMeter;
  const rightPx = originX + (centerM + halfWm) * pxPerMeter;
  const yTop = midY - 22;
  const yH = 44;

  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.zoneBorder;
  ctx.fillStyle = COLORS.zoneFill;

  const pad = 16;
  const drawSegment = (x1, x2) => {
    const w = Math.max(0, x2 - x1);
    if (w <= 0) return;
    ctx.beginPath();
    roundRect(ctx, x1, yTop, w, yH, 8);
    ctx.fill();
    ctx.stroke();
  };

  if (leftPx >= pad && rightPx <= cssW - pad) {
    // Simple case: inside bounds
    drawSegment(leftPx, rightPx);
  } else {
    // Wrap: draw two pieces
    if (leftPx < pad) {
      drawSegment(pad, Math.min(rightPx, cssW - pad));
      drawSegment(Math.max(leftPx + cssW, pad), cssW - pad);
    } else if (rightPx > cssW - pad) {
      drawSegment(leftPx, cssW - pad);
      drawSegment(pad, (rightPx - cssW));
    }
  }
}

function wrapDelta(x, x0, half) {
  // minimal signed distance on a circular track [-half, half]
  let dx = x - x0;
  const C = 2 * half;
  if (dx > half) dx -= C;
  if (dx < -half) dx += C;
  return dx;
}
