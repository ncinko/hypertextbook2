// /src/TwoBody.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './simulations.css';

const G = 40; // Gravitational constant
const TIME_STEP = 0.01; // Fixed time step for physics update (s)
const MAX_PATH_LENGTH = 2000; // Max points in orbital path

// --- Embedded Styles ---
const Styles = () => (
  <style>{`
    body { font-family: 'Inter', sans-serif; }
    canvas { width:100%; height:100%; display:block; background-color:#000; cursor: grab; }

    .controls-panel::-webkit-scrollbar { width:6px; }
    .controls-panel::-webkit-scrollbar-track { background:#2d3748; }
    .controls-panel::-webkit-scrollbar-thumb { background:#718096; border-radius:3px; }
    .controls-panel::-webkit-scrollbar-thumb:hover { background:#a0aec0; }

    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance:none; height:16px; width:16px; border-radius:50%;
      background:#4299e1; cursor:pointer; margin-top:-6px;
    }
    input[type=range]::-moz-range-thumb {
      height:16px; width:16px; border-radius:50%; background:#4299e1; cursor:pointer;
    }
  `}</style>
);

// --- Stats Overlay Component ---
const StatsOverlay = React.memo(({ stats }) => (
  <div className="absolute top-2 left-2 p-3 bg-gray-900 bg-opacity-75 rounded-lg text-sm text-white pointer-events-none">
    <div className="font-mono">
      <div>Rel. Dist: {stats.r_rel.toFixed(1)}</div>
      <div>Rel. Speed: {stats.v_rel.toFixed(1)}</div>
      <div>e:          {stats.e.toFixed(3)}</div>
      <div>a:          {(stats.a === Infinity ? '∞' : stats.a.toFixed(1))}</div>
    </div>
  </div>
));

// --- Main Application Component ---
export default function TwoBody({ isRunning, onPlay }) {
  // --- Refs for non-render-triggering state ---
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const simStateRef = useRef({
    simTime: 0,
    accumulator: 0,
    body1: { pos: { x: -75, y: 0 }, vel: { x: 0, y: -8.165 }, mass: 500, path: [] },
    body2: { pos: { x: 75, y: 0 }, vel: { x: 0, y: 8.165 }, mass: 500, path: [] },
    relativeOrbit: { eccentricity: 0, semiMajorAxis: 0, evec: { x: 1, y: 0 } },
  });
  const lastFrameTimeRef = useRef(performance.now());
  const animationFrameIdRef = useRef(null);
  const didMountRef = useRef(false);

  // Panning
  const panRef = useRef({ x: 0, y: 0 });                  // world-units pan
  const draggingRef = useRef({ active: false, x: 0, y: 0 });

  // --- React State for UI (triggers re-renders) ---
  const [stats, setStats] = useState({ r_rel: 0, v_rel: 0, e: 0, a: Infinity });

  // Control Panel State
  const [mass1, setMass1] = useState(500);
  const [mass2, setMass2] = useState(500);
  const [zoom, setZoom] = useState(1.5);
  const [simSpeed, setSimSpeed] = useState(1);
  const [vectorScale, setVectorScale] = useState(1);
  const [overlays, setOverlays] = useState({
    showPath: true,
    showFoci: false,
    showVector: false,
    showForceVector: false,
  });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const vectorScaleRef = useRef(vectorScale);
  vectorScaleRef.current = vectorScale;

  const showVectorSlider = overlays.showVector || overlays.showForceVector;

  // --- Drawing & Physics ---
  const drawBody = useCallback((body, color, ctx, currentZoom) => {
    const bodyRadius = (4 + Math.log10(body.mass) * 2.5) / currentZoom;
    ctx.beginPath();
    ctx.arc(body.pos.x, body.pos.y, bodyRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(body.pos.x, body.pos.y, bodyRadius * 1.5, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(
      body.pos.x, body.pos.y, bodyRadius, body.pos.x, body.pos.y, bodyRadius * 1.5
    );
    gradient.addColorStop(0, `${color}80`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, []);

  const drawOnePath = useCallback((path, color, ctx, currentZoom) => {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 / currentZoom;
    ctx.stroke();
  }, []);

  const drawArrowhead = useCallback((ctx, from, to, radius) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.beginPath();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);
    ctx.moveTo(0, 0);
    ctx.lineTo(-radius, -radius / 2);
    ctx.lineTo(-radius, radius / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, []);

  const drawOneVector = useCallback((body, ctx, currentZoom, currentVectorScale) => {
    const { pos, vel } = body;
    const baseScale = 0.5;
    const scale = baseScale * currentVectorScale;
    const to = { x: pos.x + vel.x * scale, y: pos.y + vel.y * scale };
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();
    ctx.fillStyle = '#FF00FF';
    drawArrowhead(ctx, pos, to, 10 / currentZoom);
  }, [drawArrowhead]);

  const drawOneForceVector = useCallback((pos, force, scale, color, ctx, currentZoom) => {
    const to = { x: pos.x + force.x * scale, y: pos.y + force.y * scale };
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();
    ctx.fillStyle = color;
    drawArrowhead(ctx, pos, to, 10 / currentZoom);
  }, [drawArrowhead]);

  const drawForceVectors = useCallback((ctx, currentZoom, currentVectorScale) => {
    const { body1, body2 } = simStateRef.current;
    const dx = body2.pos.x - body1.pos.x;
    const dy = body2.pos.y - body1.pos.y;
    const r2 = dx*dx + dy*dy;
    if (r2 === 0) return;
    const r = Math.sqrt(r2);
    const F = (G * body1.mass * body2.mass) / r2;
    const ux = dx / r, uy = dy / r;

    const f1 = { x: F * ux, y: F * uy };
    const f2 = { x: -F * ux, y: -F * uy };

    const base = 0.005;
    const s = base * currentVectorScale;
    drawOneForceVector(body1.pos, f1, s, '#FF4136', ctx, currentZoom);
    drawOneForceVector(body2.pos, f2, s, '#FF4136', ctx, currentZoom);
  }, [drawOneForceVector]);

  const drawX = useCallback((x, y, color, ctx, currentZoom) => {
    const size = 5 / currentZoom;
    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size);
    ctx.lineTo(x - size, y + size);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();
  }, []);

  const calculateBarycenter = useCallback(() => {
    const { body1, body2 } = simStateRef.current;
    const M = body1.mass + body2.mass;
    return {
      x: (body1.pos.x * body1.mass + body2.pos.x * body2.mass) / M,
      y: (body1.pos.y * body1.mass + body2.pos.y * body2.mass) / M
    };
  }, []);

  const drawBarycenter = useCallback((ctx, currentZoom) => {
    const cm = calculateBarycenter();
    drawX(cm.x, cm.y, '#AAAAAA', ctx, currentZoom);
  }, [calculateBarycenter, drawX]);

  // --- New: draw both foci (shared barycenter + second focus for each body's ellipse) ---
  const drawFoci = useCallback((ctx, currentZoom) => {
    // Always draw the shared focus (barycenter)
    const cm = calculateBarycenter();
    drawX(cm.x, cm.y, '#CCCCCC', ctx, currentZoom);

    const { body1, body2, relativeOrbit } = simStateRef.current;
    const e = relativeOrbit.eccentricity;
    const a_rel = relativeOrbit.semiMajorAxis;

    if (!(e > 0 && e < 1 && Number.isFinite(a_rel))) {
      // Only closed ellipses have a second focus well-defined here
      return;
    }

    let { x: ex, y: ey } = relativeOrbit.evec || { x: 1, y: 0 };
    const em = Math.hypot(ex, ey) || 1;
    ex /= em; ey /= em; // unit vector along major axis toward periapsis

    const M = body1.mass + body2.mass;
    const a1 = a_rel * (body2.mass / M);
    const a2 = a_rel * (body1.mass / M);
    const c1 = e * a1;
    const c2 = e * a2;

    // The "other" focus for each ellipse lies +2c along the major axis from the shared focus
    const f2_body1 = { x: cm.x + 2 * c1 * ex, y: cm.y + 2 * c1 * ey };
    const f2_body2 = { x: cm.x - 2 * c2 * ex, y: cm.y - 2 * c2 * ey };

    drawX(f2_body1.x, f2_body1.y, '#FFD700', ctx, currentZoom); // yellow other focus
    drawX(f2_body2.x, f2_body2.y, '#00BFFF', ctx, currentZoom); // blue other focus
  }, [calculateBarycenter, drawX]);

  const calculateOrbitalElements = useCallback(() => {
    const { body1, body2 } = simStateRef.current;
    const r_vec = { x: body2.pos.x - body1.pos.x, y: body2.pos.y - body1.pos.y };
    const v_vec = { x: body2.vel.x - body1.vel.x, y: body2.vel.y - body1.vel.y };
    const MU = G * (body1.mass + body2.mass);
    const r = Math.hypot(r_vec.x, r_vec.y);
    if (!r) return;

    const h = r_vec.x * v_vec.y - r_vec.y * v_vec.x;                 // scalar z-component (2D)
    const v_cross_h = { x: v_vec.y * h, y: -v_vec.x * h };           // v × h (in-plane)
    const e_vec = { x: (v_cross_h.x / MU) - (r_vec.x / r), y: (v_cross_h.y / MU) - (r_vec.y / r) };
    const e = Math.hypot(e_vec.x, e_vec.y);

    simStateRef.current.relativeOrbit.eccentricity = e;
    simStateRef.current.relativeOrbit.evec = e_vec;
    simStateRef.current.relativeOrbit.semiMajorAxis = (e < 1) ? (h*h / MU) * (1 / (1 - e*e)) : Infinity;

    const newStats = {
      r_rel: r,
      v_rel: Math.hypot(v_vec.x, v_vec.y),
      e: simStateRef.current.relativeOrbit.eccentricity,
      a: simStateRef.current.relativeOrbit.semiMajorAxis
    };

    setStats(prevStats => {
      if (
        Math.abs(prevStats.r_rel - newStats.r_rel) < 0.1 &&
        Math.abs(prevStats.v_rel - newStats.v_rel) < 0.1 &&
        Math.abs(prevStats.e - newStats.e) < 0.001 &&
        Math.abs(prevStats.a - newStats.a) < 0.1
      ) {
        return prevStats;
      }
      return newStats;
    });
  }, []);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const currentZoom = zoomRef.current;
    const currentOverlays = overlaysRef.current;
    const currentVectorScale = vectorScaleRef.current;

    const { body1, body2 } = simStateRef.current;
    ctx.save();
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(currentZoom, -currentZoom);

    // Apply world-space panning after scale
    ctx.translate(panRef.current.x, panRef.current.y);

    if (currentOverlays.showPath) {
      drawOnePath(body1.path, 'rgba(255, 215, 0, 0.25)', ctx, currentZoom);
      drawOnePath(body2.path, 'rgba(0, 191, 255, 0.25)', ctx, currentZoom);
    }
    if (currentOverlays.showFoci) drawFoci(ctx, currentZoom);

    drawBody(body1, '#FFD700', ctx, currentZoom);
    drawBody(body2, '#00BFFF', ctx, currentZoom);

    if (currentOverlays.showVector) {
      drawOneVector(body1, ctx, currentZoom, currentVectorScale);
      drawOneVector(body2, ctx, currentZoom, currentVectorScale);
    }
    if (currentOverlays.showForceVector) drawForceVectors(ctx, currentZoom, currentVectorScale);
    ctx.restore();
  }, [drawBody, drawOnePath, drawFoci, drawOneVector, drawForceVectors]);

  const updatePhysics = useCallback((dt) => {
    const { body1, body2 } = simStateRef.current;
    const dx = body2.pos.x - body1.pos.x;
    const dy = body2.pos.y - body1.pos.y;
    const r2 = dx*dx + dy*dy;
    if (r2 === 0) return;
    const r = Math.sqrt(r2);
    const F = (G * body1.mass * body2.mass) / r2;
    const ux = dx / r, uy = dy / r;

    const a1x = (F * ux) / body1.mass;
    const a1y = (F * uy) / body1.mass;
    const a2x = (-F * ux) / body2.mass;
    const a2y = (-F * uy) / body2.mass;

    body1.vel.x += a1x * dt; body1.vel.y += a1y * dt;
    body2.vel.x += a2x * dt; body2.vel.y += a2y * dt;

    body1.pos.x += body1.vel.x * dt; body1.pos.y += body1.vel.y * dt;
    body2.pos.x += body2.vel.x * dt; body2.pos.y += body2.vel.y * dt;

    body1.path.push({ ...body1.pos }); if (body1.path.length > MAX_PATH_LENGTH) body1.path.shift();
    body2.path.push({ ...body2.pos }); if (body2.path.length > MAX_PATH_LENGTH) body2.path.shift();
  }, []);

  const setScenario = useCallback((preset) => {
    const simState = simStateRef.current;
    const m1 = simState.body1.mass;
    const m2 = simState.body2.mass;
    const M = m1 + m2;
    const MU = G * M;

    simState.body1.path = [];
    simState.body2.path = [];
    simState.simTime = 0;

    let r_rel_vec = { x: 150, y: 0 };
    let v_rel_vec = { x: 0, y: Math.sqrt(MU / 150) };

    switch (preset) {
      case 'elliptical': {
        r_rel_vec = { x: 200, y: 0 };
        const a = 200 / (1 + 0.5);
        const v = Math.sqrt((MU / a) * ((1 - 0.5) / (1 + 0.5)));
        v_rel_vec = { x: 0, y: v };
        break;
      }
      case 'highlyElliptical': {
        r_rel_vec = { x: 300, y: 0 };
        const a = 300 / (1 + 0.8);
        const v = Math.sqrt((MU / a) * ((1 - 0.8) / (1 + 0.8)));
        v_rel_vec = { x: 0, y: v };
        break;
      }
      case 'hyperbolic': {
        r_rel_vec = { x: -300, y: 100 };
        const r = Math.hypot(r_rel_vec.x, r_rel_vec.y);
        const a = -100;
        const vmag = Math.sqrt(MU * (2 / r - 1 / a));
        const target = { x: 0, y: 50 };
        const dirx = target.x - r_rel_vec.x;
        const diry = target.y - r_rel_vec.y;
        const dirm = Math.hypot(dirx, diry);
        v_rel_vec = { x: (dirx / dirm) * vmag, y: (diry / dirm) * vmag };
        break;
      }
      default: /* circular */ break;
    }

    simState.body1.pos = { x: -r_rel_vec.x * (m2 / M), y: -r_rel_vec.y * (m2 / M) };
    simState.body2.pos = { x:  r_rel_vec.x * (m1 / M), y:  r_rel_vec.y * (m1 / M) };
    simState.body1.vel = { x: -v_rel_vec.x * (m2 / M), y: -v_rel_vec.y * (m2 / M) };
    simState.body2.vel = { x:  v_rel_vec.x * (m1 / M), y:  v_rel_vec.y * (m1 / M) };

    simState.body1.path.push({ ...simState.body1.pos });
    simState.body2.path.push({ ...simState.body2.pos });
    calculateOrbitalElements();
  }, [calculateOrbitalElements]);

  const gameLoop = useCallback((currentTime) => {
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    const delta = (currentTime - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = currentTime;

    if (isRunning) {
      const dt = Math.min(delta, 0.1) * simSpeed;
      simStateRef.current.accumulator += dt;

      while (simStateRef.current.accumulator >= TIME_STEP) {
        updatePhysics(TIME_STEP);
        simStateRef.current.accumulator -= TIME_STEP;
        simStateRef.current.simTime += TIME_STEP;
      }
      calculateOrbitalElements();
    }
    
    draw();
  }, [isRunning, simSpeed, updatePhysics, calculateOrbitalElements, draw]);

  // --- Init & Resize ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      draw();
    };

    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);
    handleResize();

    if (didMountRef.current === false) {
      setScenario('circular');
      didMountRef.current = true;
    }

    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);


    // --- Pointer (Left-click) Pan bindings ---
    const dpr = window.devicePixelRatio || 1;

    const onPointerDown = (e) => {
      if (e.button !== 0) return; // left-click only
      draggingRef.current = { active: true, x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e) => {
      if (!draggingRef.current.active) return;
      const dx_px = e.clientX - draggingRef.current.x;
      const dy_px = e.clientY - draggingRef.current.y;
      draggingRef.current.x = e.clientX;
      draggingRef.current.y = e.clientY;

      // Convert pixel delta to world-units (note inverted Y due to scale(..., -zoom))
      panRef.current.x += dx_px / (zoom * dpr);
      panRef.current.y += -dy_px / (zoom * dpr);
    };

    const endDrag = () => {
      draggingRef.current.active = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointerleave', endDrag);

    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointerleave', endDrag);
    };
  }, [setScenario, gameLoop, draw, zoom]);

  // --- Handlers ---
  const handleMass1Change = (e) => {
    const m = parseFloat(e.target.value);
    setMass1(m);
    simStateRef.current.body1.mass = m;
  };
  const handleMass2Change = (e) => {
    const m = parseFloat(e.target.value);
    setMass2(m);
    simStateRef.current.body2.mass = m;
  };
  const handleMassRatio = (m1, m2) => {
    setMass1(m1); setMass2(m2);
    simStateRef.current.body1.mass = m1;
    simStateRef.current.body2.mass = m2;
    setScenario('circular');
  };
  const handleToggleOverlay = (k) => setOverlays(prev => ({ ...prev, [k]: !prev[k] }));

  // --- Render ---
  return (
    <>
      <Styles />
      {/* APP SHELL: full height, toolbar left, canvas right */}
      <div className="h-screen flex md:flex-row overflow-hidden bg-gray-900">
        {/* CONTROL PANEL (left) — width clamped by .controls-panel so canvas >= ~2/3 */}
        <aside className="controls-panel p-4 bg-gray-800 shadow-2xl overflow-y-auto flex-shrink-0 text-gray-200">
          <h1 className="text-2xl font-bold text-white mb-4">Two-Body Simulation</h1>

          {/* Mass & Scenarios */}
          <div className="space-y-4 mb-4 panel-card">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Mass &amp; Scenarios</h2>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="slider-mass1">
                Body 1 (Yellow) Mass: <span className="font-bold text-yellow-300">{mass1}</span>
              </label>
              <input type="range" id="slider-mass1" min="1" max="1000" value={mass1} onChange={handleMass1Change} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="slider-mass2">
                Body 2 (Blue) Mass: <span className="font-bold text-sky-300">{mass2}</span>
              </label>
              <input type="range" id="slider-mass2" min="1" max="1000" value={mass2} onChange={handleMass2Change} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleMassRatio(500, 500)} className="btn btn-neutral w-full text-sm">1:1</button>
              <button onClick={() => handleMassRatio(750, 250)} className="btn btn-neutral w-full text-sm">3:1</button>
              <button onClick={() => handleMassRatio(1000, 1)} className="btn btn-neutral w-full text-sm">1000:1</button>
            </div>

            <hr className="border-gray-700" />

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScenario('circular')} className="btn w-full">Circular</button>
              <button onClick={() => setScenario('elliptical')} className="btn w-full">Elliptical</button>
              <button onClick={() => setScenario('highlyElliptical')} className="btn w-full">High-e</button>
              <button onClick={() => setScenario('hyperbolic')} className="btn w-full">Hyperbolic</button>
            </div>
          </div>

          {/* Overlays */}
          <div className="space-x-1 mb-4 panel-card">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Overlays</h2>
            {['showPath', 'showFoci', 'showVector', 'showForceVector'].map((key) => (
              <label key={key} className="flex items-center gap-3 bg-gray-700 p-2 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={overlays[key]}
                  onChange={() => handleToggleOverlay(key)}
                />
                <span className="text-gray-200">
                  {key === 'showPath' && 'Show Orbit Paths'}
                  {key === 'showFoci' && 'Show Foci'}
                  {key === 'showVector' && 'Show Velocity Vectors'}
                  {key === 'showForceVector' && 'Show Force Vectors'}
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-3 mb-4 panel-card">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Controls</h2>

            <button
              onClick={onPlay}
              className={`btn w-full ${isRunning ? '' : 'btn-neutral'}`}
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>

            <label className="block">
              <span className="text-gray-200">Zoom</span>
              <input
                type="range"
                min="0.1"
                max="5"
                value={zoom}
                step="0.1"
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
            </label>

            <label className="block">
              <span className="text-gray-200">Simulation Speed</span>
              <input
                type="range"
                min="0.1"
                max="5"
                value={simSpeed}
                step="0.1"
                onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
              />
            </label>

            {showVectorSlider && (
              <label className="block">
                <span className="text-gray-200">
                  Vector Scale: <span className="font-medium text-white">{vectorScale.toFixed(1)}</span>
                </span>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  value={vectorScale}
                  step="0.1"
                  onChange={(e) => setVectorScale(parseFloat(e.target.value))}
                />
              </label>
            )}
          </div>
        </aside>

        {/* CANVAS (right) — make sure this container has explicit height */}
        <div className="flex-grow relative h-full">
          <canvas ref={canvasRef} className="w-full h-full block bg-black" />
          <StatsOverlay stats={stats} />
        </div>
      </div>
    </>
  );
}
