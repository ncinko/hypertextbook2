import React, { useEffect, useRef, useState } from "react";
import "./simulations.css";

/**
 * Kepler's Laws Simulation
 * - Velocity-Verlet integration
 * - Stable orbital elements (eccentricity vector fixed; vis-viva presets)
 * - Overlays: path, foci (Sun + f2 for bound ellipses), velocity & force vectors
 * - Kepler's 2nd law helpers (manual & auto Δt wedges)
 * - Canvas pan with LEFT-CLICK drag
 * - Layout uses simulations.css (no Tailwind required)
 */
export default function Kepler() {
  // ---------- UI state ----------
  const [isRunning, setIsRunning] = useState(true);
  const [zoom, setZoom] = useState(1.5);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [showPath, setShowPath] = useState(true);
  const [showFoci, setShowFoci] = useState(false);
  const [showVel, setShowVel] = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [autoAreas, setAutoAreas] = useState(false);

  // ---------- Refs ----------
  const canvasRef = useRef(null);
  const statsRef = useRef(null);
  const sweepInfoRef = useRef(null);
  const rafRef = useRef(null);
  const resizeObsRef = useRef(null);

  // live refs for RAF (avoid stale closures)
  const isRunningRef = useRef(isRunning);
  const zoomRef = useRef(zoom);
  const simSpeedRef = useRef(simSpeed);
  const showPathRef = useRef(showPath);
  const showFociRef = useRef(showFoci);
  const showVelRef = useRef(showVel);
  const showForceRef = useRef(showForce);
  const autoAreasRef = useRef(autoAreas);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { simSpeedRef.current = simSpeed; }, [simSpeed]);
  useEffect(() => { showPathRef.current = showPath; }, [showPath]);
  useEffect(() => { showFociRef.current = showFoci; }, [showFoci]);
  useEffect(() => { showVelRef.current = showVel; }, [showVel]);
  useEffect(() => { showForceRef.current = showForce; }, [showForce]);
  useEffect(() => { autoAreasRef.current = autoAreas; }, [autoAreas]);

  // ---------- Sim constants ----------
  const MU = 40000;           // μ = GM (sim units)
  const TIME_STEP = 0.01;     // physics step (s)
  const MAX_PATH_LENGTH = 2000;

  // ---------- Sim state ----------
  const simRef = useRef({
    lastFrameTime: 0,
    accumulator: 0,
    simTime: 0,
    body: { pos: { x: 150, y: 0 }, vel: { x: 0, y: 12 }, path: [] },
    foci: { f1: { x: 0, y: 0 }, f2: null, eccentricity: 0, semiMajorAxis: Infinity },
    sweeps: { isSweeping: false, currentSweep: null, completedSweeps: [] },
    autoAreas: { window: 1.5, bucket: [], wedges: [] },
  });

  // ---------- View (pan) ----------
  // World-space translation applied after scale (before drawing). Units are "simulation units".
  const viewRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // ---------- Helpers ----------
  const visVivaSpeed = (r, a) =>
    (Number.isFinite(a) && a !== 0) ? Math.sqrt(MU * (2 / r - 1 / a)) : null;
  const keplerPeriod = (a) =>
    (a > 0 && Number.isFinite(a)) ? 2 * Math.PI * Math.sqrt((a ** 3) / MU) : null;

  // ---------- Presets (consistent via vis-viva) ----------
  const setOrbit = (which) => {
    const s = simRef.current;
    s.simTime = 0;
    s.accumulator = 0;
    s.body.path = [];
    s.sweeps.isSweeping = false;
    s.sweeps.currentSweep = null;
    s.sweeps.completedSweeps = [];
    s.autoAreas.bucket = [];
    s.autoAreas.wedges = [];

    const placeAtApoapsis = (r_ap, e) => {
      const a = r_ap / (1 + e);
      const v_ap = Math.sqrt(MU * (1 - e) / (a * (1 + e))); // vis-viva at apoapsis
      s.body.pos = { x: r_ap, y: 0 };
      s.body.vel = { x: 0, y: v_ap };
    };

    switch (which) {
      case "circular": {
        const r = 150;
        s.body.pos = { x: r, y: 0 };
        s.body.vel = { x: 0, y: Math.sqrt(MU / r) };
        break;
      }
      case "elliptical": {
        placeAtApoapsis(200, 0.5);
        break;
      }
      case "highlyElliptical": {
        placeAtApoapsis(300, 0.8);
        break;
      }
      case "hyperbolic": {
        s.body.pos = { x: -100, y: -50 };
        s.body.vel = { x: 30, y: 0 }; // > escape
        break;
      }
      default: break;
    }

    s.body.path.push({ ...s.body.pos });
    calculateOrbitalElements();
  };

  // ---------- Physics (Velocity Verlet) ----------
  function updatePhysics(dt) {
    const s = simRef.current;
    const { pos, vel, path } = s.body;

    // a = -μ r / r^3
    const r2 = pos.x * pos.x + pos.y * pos.y;
    const r = Math.sqrt(r2);
    const invr3 = 1 / (r2 * r);
    const ax = -MU * pos.x * invr3;
    const ay = -MU * pos.y * invr3;

    // half-step velocity
    const vxh = vel.x + 0.5 * dt * ax;
    const vyh = vel.y + 0.5 * dt * ay;

    // new position
    const nx = pos.x + dt * vxh;
    const ny = pos.y + dt * vyh;

    // new acceleration
    const r2n = nx * nx + ny * ny;
    const rn = Math.sqrt(r2n);
    const invr3n = 1 / (r2n * rn);
    const axn = -MU * nx * invr3n;
    const ayn = -MU * ny * invr3n;

    // complete velocity
    s.body.vel.x = vxh + 0.5 * dt * axn;
    s.body.vel.y = vyh + 0.5 * dt * ayn;

    // commit position
    s.body.pos.x = nx;
    s.body.pos.y = ny;

    // trail
    path.push({ x: nx, y: ny });
    if (path.length > MAX_PATH_LENGTH) path.shift();

    // manual sweep
    if (s.sweeps.isSweeping && s.sweeps.currentSweep) {
      s.sweeps.currentSweep.path.push({ x: nx, y: ny });
      s.sweeps.currentSweep.time += dt;
    }

    // auto equal-Δt wedges
    updateAutoSweeps(dt, nx, ny);
  }

  function updateAutoSweeps(dt, x, y) {
    const s = simRef.current;
    if (!autoAreasRef.current) {
      s.autoAreas.bucket = [];
      return;
    }
    const bucket = s.autoAreas.bucket;
    const W = s.autoAreas.window;
    bucket.push({ x, y, dt });

    // accumulate from end until reaching window W, then drop a wedge
    let sum = 0;
    for (let i = bucket.length - 1; i >= 0; i--) {
      sum += bucket[i].dt;
      if (sum >= W) {
        const startIndex = Math.max(0, i);
        const path = [bucket[startIndex], ...bucket.slice(startIndex + 1)].map(p => ({ x: p.x, y: p.y }));
        s.autoAreas.wedges.push(path);
        if (s.autoAreas.wedges.length > 30) s.autoAreas.wedges.shift();
        s.autoAreas.bucket = [];
        return;
      }
    }
  }

  // ---------- Orbital elements (fixed e-vector) ----------
  function calculateOrbitalElements() {
    const s = simRef.current;
    const { x: rx, y: ry } = s.body.pos;
    const { x: vx, y: vy } = s.body.vel;

    const r = Math.hypot(rx, ry);
    const v2 = vx * vx + vy * vy;

    const hz = rx * vy - ry * vx; // specific angular momentum (z)

    // e⃗ = (v × h)/μ − r̂
    // 2D: v×h = h * (vy, -vx)
    const ex = (hz / MU) * (vy)  - rx / r;
    const ey = (hz / MU) * (-vx) - ry / r;
    const e = Math.hypot(ex, ey);

    // ε = v^2/2 − μ/r ; a = −μ/(2ε)
    const eps = 0.5 * v2 - MU / r;
    const a = -MU / (2 * eps);

    s.foci.eccentricity = e;
    s.foci.semiMajorAxis = Number.isFinite(a) ? a : Infinity;

    // Only draw f2 for bound ellipses (a > 0), skip near-circular
    if (Number.isFinite(a) && a > 0 && e > 1e-5) {
      const inv = 1 / e;
      const ehatx = ex * inv, ehaty = ey * inv;
      s.foci.f1 = { x: 0, y: 0 };
      s.foci.f2 = { x: 2 * a * e * ehatx, y: 2 * a * e * ehaty };
    } else {
      s.foci.f1 = { x: 0, y: 0 };
      s.foci.f2 = null;
    }
  }

  // ---------- Drawing ----------
  const pxStrokeWidth = (min = 0.5) => Math.max(1 / zoomRef.current, min);

  function drawSun(ctx) {
    const r = 12 * Math.sqrt(zoomRef.current);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFD700";
    ctx.fill();

    // corona
    const r2 = r * 1.5;
    const grad = ctx.createRadialGradient(0, 0, r, 0, 0, r2);
    grad.addColorStop(0, "rgba(255,215,0,0.5)");
    grad.addColorStop(1, "rgba(255,215,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, r2, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function drawBody(ctx, s) {
    const br = 7 * Math.sqrt(zoomRef.current);
    ctx.beginPath();
    ctx.arc(s.body.pos.x, s.body.pos.y, br, 0, 2 * Math.PI);
    ctx.fillStyle = "#00BFFF";
    ctx.fill();
  }

  function drawPath(ctx, s) {
    if (!showPathRef.current) return;
    const path = s.body.path;
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = pxStrokeWidth();
    ctx.stroke();
  }

  function drawX(ctx, x, y, color) {
    const size = 5 / zoomRef.current;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.strokeStyle = color;
    ctx.lineWidth = pxStrokeWidth(0.75);
    ctx.stroke();
  }

  function drawFoci(ctx, s) {
    if (!showFociRef.current) return;
    const { f1, f2 } = s.foci;
    drawX(ctx, -f1.x, f1.y, "#FFD700");
    if (f2) drawX(ctx, -f2.x, f2.y, "#AAAAAA");
    if (f2) {
      ctx.beginPath();
      ctx.moveTo(-f1.x, f1.y);
      ctx.lineTo(-f2.x, f2.y);
      ctx.strokeStyle = "rgba(180,0,200,0.25)";
      ctx.lineWidth = pxStrokeWidth(0.5);
      ctx.stroke();
    }
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = pxStrokeWidth(1.2);
    ctx.stroke();

    const ang = Math.atan2(y2 - y1, x2 - x1);
    const ah = 8 / zoomRef.current;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang - Math.PI / 6), y2 - ah * Math.sin(ang - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ah * Math.cos(ang + Math.PI / 6), y2 - ah * Math.sin(ang + Math.PI / 6));
    ctx.strokeStyle = color;
    ctx.lineWidth = pxStrokeWidth(1.2);
    ctx.stroke();
  }

  function drawVelocityVector(ctx, s) {
    if (!showVelRef.current) return;
    const { pos, vel } = s.body;
    const scale = 1;
    drawArrow(ctx, pos.x, pos.y, pos.x + vel.x * scale, pos.y + vel.y * scale, "#FF00FF");
  }

  function drawForceVector(ctx, s) {
    if (!showForceRef.current) return;
    const { pos } = s.body;
    const r2 = pos.x * pos.x + pos.y * pos.y;
    const r = Math.sqrt(r2);
    const ax = -MU * pos.x / (r2 * r);
    const ay = -MU * pos.y / (r2 * r);
    const scale = 10; // tuned for visibility
    drawArrow(ctx, pos.x, pos.y, pos.x + ax * scale, pos.y + ay * scale, "#ff5959");
  }

  function drawSweeps(ctx, s) {
    const colors = [
      "rgba(0,191,255,0.30)",
      "rgba(50,205,50,0.30)",
      "rgba(255,105,180,0.30)",
      "rgba(255,165,0,0.30)",
    ];
    s.sweeps.completedSweeps.forEach((sw, i) => {
      drawSweepPolygon(ctx, sw.path, colors[i % colors.length]);
    });

    if (s.sweeps.isSweeping && s.sweeps.currentSweep) {
      drawSweepPolygon(ctx, s.sweeps.currentSweep.path, "rgba(255,255,255,0.2)");
    }

    if (autoAreasRef.current) {
      for (const path of s.autoAreas.wedges) {
        drawSweepPolygon(ctx, path, "rgba(80,220,140,0.28)");
      }
    }
  }

  function drawSweepPolygon(ctx, path, color) {
    if (!path || path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ---------- HUD ----------
  function polygonArea(path) {
    let area = 0;
    if (!path || path.length < 2) return 0;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i], p2 = path[i + 1];
      area += 0.5 * (p1.x * p2.y - p2.x * p1.y);
    }
    return Math.abs(area);
  }

  function updateHUD() {
    const div = statsRef.current;
    if (!div) return;
    const s = simRef.current;
    const { pos, vel } = s.body;
    const r = Math.hypot(pos.x, pos.y);
    const v = Math.hypot(vel.x, vel.y);
    const e = s.foci.eccentricity;
    const a = s.foci.semiMajorAxis;
    const vv = visVivaSpeed(r, a);
    const T = keplerPeriod(a);

    div.innerHTML = `
      <div class="font-mono">
        <div>Altitude: ${r.toFixed(1)}</div>
        <div>Speed:    ${v.toFixed(1)} ${vv ? `(vv ${vv.toFixed(1)})` : ""}</div>
        <div>e:        ${e.toFixed(3)}</div>
        <div>a:        ${Number.isFinite(a) ? a.toFixed(1) : "∞"}</div>
        ${T ? `<div>T:        ${T.toFixed(2)}</div>` : ""}
      </div>
    `;

    const info = sweepInfoRef.current;
    if (info) {
      const list = s.sweeps.completedSweeps.map((sw, i) => {
        const A = polygonArea(sw.path);
        return `
          <div class="flex justify-between items-center text-white">
            <span>Sweep ${i + 1}:</span>
            <span class="font-mono">${A.toFixed(0)}</span>
          </div>
          <div class="flex justify-between items-center text-gray-400 text-xs">
            <span>Duration:</span>
            <span class="font-mono">${sw.time.toFixed(2)}s</span>
          </div>
        `;
      }).join('<hr class="border-gray-700 my-1">');

      info.innerHTML = s.sweeps.completedSweeps.length ? list :
        `<p class="text-gray-400">Create sweeps to compare areas.</p>`;
    }
  }

  // ---------- Frame draw ----------
  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = simRef.current;

    ctx.save();
    // background
    ctx.fillStyle = "#000010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // center, scale, then pan (world units)
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoomRef.current, -zoomRef.current);
    ctx.translate(viewRef.current.x, viewRef.current.y);

    // layers
    drawPath(ctx, s);
    drawSweeps(ctx, s);
    calculateOrbitalElements(); // keep foci up-to-date
    drawFoci(ctx, s);
    drawSun(ctx);
    drawBody(ctx, s);
    drawVelocityVector(ctx, s);
    drawForceVector(ctx, s);

    ctx.restore();

    // HUD
    updateHUD();
  }

  // ---------- RAF Loop ----------
  function tick(nowMs) {
    const s = simRef.current;

    if (!isRunningRef.current) {
      s.lastFrameTime = nowMs;
      drawFrame();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const dtFrame = Math.min((nowMs - s.lastFrameTime) / 1000, 0.1) * simSpeedRef.current; // cap dt
    s.lastFrameTime = nowMs;
    s.accumulator += dtFrame;

    while (s.accumulator >= TIME_STEP) {
      updatePhysics(TIME_STEP);
      s.simTime += TIME_STEP;
      s.accumulator -= TIME_STEP;
    }

    drawFrame();
    rafRef.current = requestAnimationFrame(tick);
  }

  // ---------- Canvas events: resize + pan ----------
  useEffect(() => {
    setOrbit("elliptical");

    const canvas = canvasRef.current;
    if (!canvas) return;

    // ResizeObserver for crisp DPR rendering
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const wCss = entry.contentRect?.width ?? canvas.clientWidth;
      const hCss = entry.contentRect?.height ?? canvas.clientHeight;
      const nextW = Math.max(2, Math.floor(wCss * dpr));
      const nextH = Math.max(2, Math.floor(hCss * dpr));
      if (canvas.width === nextW && canvas.height === nextH) return;
      requestAnimationFrame(() => {
        if (!canvas) return;
        canvas.width = nextW;
        canvas.height = nextH;
      });
    });
    ro.observe(canvas);
    resizeObsRef.current = ro;

    // initial size
    (() => {
      const dpr = window.devicePixelRatio || 1;
      const nextW = Math.max(2, Math.floor(canvas.clientWidth * dpr));
      const nextH = Math.max(2, Math.floor(canvas.clientHeight * dpr));
      canvas.width = nextW; canvas.height = nextH;
    })();

    // --- PAN HANDLERS ---
    const onMouseDown = (e) => {
      if (e.button !== 0) return; // left-click only
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isPanningRef.current) return;
      const { x: lx, y: ly } = lastMouseRef.current;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      const z = Math.max(0.05, Number.isFinite(zoomRef.current) ? zoomRef.current : 1);
      // Convert screen delta to world delta. Y is inverted due to scale(zoom,-zoom).
      viewRef.current.x += dx / z;
      viewRef.current.y -= dy / z;
      e.preventDefault();
    };

    const endPan = () => {
      isPanningRef.current = false;
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endPan);
    canvas.addEventListener("mouseleave", endPan);

    // start loop
    simRef.current.lastFrameTime = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeObsRef.current) resizeObsRef.current.disconnect();
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endPan);
      canvas.removeEventListener("mouseleave", endPan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // ---------- Render (layout) ----------
  return (
    <div className="h-screen flex md:flex-row overflow-hidden bg-gray-900">
      {/* Control Panel (left) — width clamped by .controls-panel so canvas ≥ ~2/3 */}
      <aside className="controls-panel p-4 bg-gray-800 shadow-2xl overflow-y-auto flex-shrink-0 text-gray-200">
        <h1 className="text-2xl font-bold text-white mb-4">Kepler's Laws</h1>

        {/* Presets */}

<div className="grid grid-cols-2 gap-2">
  
              <button onClick={() => setOrbit("circular")} className="btn w-full">Circular</button>
          <button onClick={() => setOrbit("elliptical")} className="btn w-full">Elliptical</button>
          <button onClick={() => setOrbit("highlyElliptical")} className="btn w-full">High-e</button>
          <button onClick={() => setOrbit("hyperbolic")} className="btn w-full bg-yellow-600 hover:bg-yellow-700">Hyperbolic</button>
            </div>

          

        {/* Overlays */}
        <div className="space-y-2 mb-4 panel-card">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Overlays</h2>

          <label className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" className="checkbox"
              checked={showPath} onChange={(e) => setShowPath(e.target.checked)} />
            <span className="text-gray-200">Orbit Path</span>
          </label>

          <label className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" className="checkbox"
              checked={showFoci} onChange={(e) => setShowFoci(e.target.checked)} />
            <span className="text-gray-200">Foci</span>
          </label>

          <label className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" className="checkbox"
              checked={showVel} onChange={(e) => setShowVel(e.target.checked)} />
            <span className="text-gray-200">Velocity Vector</span>
          </label>

          <label className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" className="checkbox"
              checked={showForce} onChange={(e) => setShowForce(e.target.checked)} />
            <span className="text-gray-200">Force Vector</span>
          </label>

          <label className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
            <input type="checkbox" className="checkbox"
              checked={autoAreas} onChange={(e) => setAutoAreas(e.target.checked)} />
            <span className="text-gray-200">Equal-Δt Areas</span>
          </label>
        </div>

        {/* Kepler's 2nd Law (manual tool) */}
        <div className="space-y-2 mb-4 panel-card">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Kepler&apos;s 2nd Law</h2>
          <p className="text-sm text-gray-300 mb-2">
            “A line joining a planet and the Sun sweeps out equal areas during equal intervals of time.”
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                const s = simRef.current;
                s.sweeps.isSweeping = !s.sweeps.isSweeping;
                if (s.sweeps.isSweeping) {
                  s.sweeps.currentSweep = { path: [{ ...s.body.pos }], time: 0 };
                } else if (s.sweeps.currentSweep) {
                  s.sweeps.completedSweeps.push(s.sweeps.currentSweep);
                  s.sweeps.currentSweep = null;
                }
              }}
              className={`btn w-full ${simRef.current.sweeps.isSweeping ? "bg-yellow-600 hover:bg-yellow-700 text-gray-900" : ""}`}
            >
              {simRef.current.sweeps.isSweeping ? "End Sweep" : "Start Sweep"}
            </button>
            <button
              onClick={() => {
                const s = simRef.current;
                s.sweeps.completedSweeps = [];
                if (s.sweeps.isSweeping) {
                  s.sweeps.currentSweep = { path: [{ ...s.body.pos }], time: 0 };
                }
                updateHUD();
              }}
              className="btn w-full bg-red-600 hover:bg-red-700"
            >
              Clear Sweeps
            </button>
          </div>
          <div ref={sweepInfoRef} className="mt-2 p-3 bg-gray-900 rounded-lg text-sm">
            <p className="text-gray-300">Create sweeps to compare areas.</p>
          </div>
        </div>

        {/* Controls — stacked */}
        <div className="space-y-3 mb-4 panel-card">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">Controls</h2>
          <button
            onClick={() => setIsRunning((r) => !r)}
            className={`btn w-full ${isRunning ? "bg-yellow-600 hover:bg-yellow-700 text-gray-900" : ""}`}
          >
            {isRunning ? "Pause" : "Resume"}
          </button>

          <label className="block">
            <span className="text-gray-200">Zoom</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
          </label>

          <label className="block">
            <span className="text-gray-200">Simulation Speed</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={simSpeed}
              onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </aside>

      {/* Canvas + HUD (right) */}
      <div className="flex-grow relative h-full">
        <canvas ref={canvasRef} className="w-full h-full block bg-black" />
        <div
          ref={statsRef}
          className="absolute top-2 left-2 p-3 bg-gray-900 bg-opacity-75 rounded-lg text-sm text-white pointer-events-none"
        />
      </div>
    </div>
  );
}
