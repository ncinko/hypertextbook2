import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Constants ---
const G = 40; // Gravitational constant
const TIME_STEP = 0.01; // Fixed time step for physics update (s)
const MAX_PATH_LENGTH = 2000; // Max points in orbital path

// --- Embedded Styles ---
// We embed the styles directly into the component for a single-file solution.
const Styles = () => (
  <style>{`
    /* Use Inter font */
    body {
        font-family: 'Inter', sans-serif;
    }
    /* Make canvas responsive and sharp */
    canvas {
        width: 100%;
        height: 100%;
        display: block;
        background-color: #000000;
    }
    /* Custom scrollbar for control panel */
    .controls-panel::-webkit-scrollbar {
        width: 6px;
    }
    .controls-panel::-webkit-scrollbar-track {
        background: #2d3748; /* gray-800 */
    }
    .controls-panel::-webkit-scrollbar-thumb {
        background: #718096; /* gray-500 */
        border-radius: 3px;
    }
    .controls-panel::-webkit-scrollbar-thumb:hover {
        background: #a0aec0; /* gray-400 */
    }
    /* Style for range slider thumbs */
    input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #4299e1; /* blue-500 */
        cursor: pointer;
        margin-top: -6px; /* Center thumb on track */
    }
    input[type=range]::-moz-range-thumb {
        height: 16px;
        width: 16px;
        border-radius: 50%;
        background: #4299e1; /* blue-500 */
        cursor: pointer;
    }
  `}</style>
);

// --- Stats Overlay Component ---
const StatsOverlay = ({ stats }) => (
  <div className="absolute top-2 left-2 p-3 bg-gray-900 bg-opacity-75 rounded-lg text-sm text-white pointer-events-none">
    <div className="font-mono">
      <div>Rel. Dist: {stats.r_rel.toFixed(1)}</div>
      <div>Rel. Speed: {stats.v_rel.toFixed(1)}</div>
      <div>e:          {stats.e.toFixed(3)}</div>
      <div>a:          {(stats.a === Infinity ? '∞' : stats.a.toFixed(1))}</div>
    </div>
  </div>
);

// --- Main Application Component ---
export default function TwoBody() {
  // --- Refs for non-render-triggering state ---
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const simStateRef = useRef({
    simTime: 0,
    accumulator: 0,
    body1: {
      pos: { x: -75, y: 0 },
      vel: { x: 0, y: -8.165 },
      mass: 500,
      path: []
    },
    body2: {
      pos: { x: 75, y: 0 },
      vel: { x: 0, y: 8.165 },
      mass: 500,
      path: []
    },
    relativeOrbit: {
      eccentricity: 0,
      semiMajorAxis: 0
    },
  });
  const lastFrameTimeRef = useRef(performance.now());
  const animationFrameIdRef = useRef(null);

  // --- React State for UI (triggers re-renders) ---
  const [isRunning, setIsRunning] = useState(true);
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

  const showVectorSlider = overlays.showVector || overlays.showForceVector;

  // --- Drawing & Physics Functions (memoized) ---

  // All drawing functions are wrapped in `useCallback`
  // They read directly from `simStateRef.current` and `ctxRef.current`
  
  const drawBody = useCallback((body, color, ctx, currentZoom) => {
    const bodyRadius = (3 + Math.log10(body.mass) * 2) / currentZoom;
    
    ctx.beginPath();
    ctx.arc(body.pos.x, body.pos.y, bodyRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(body.pos.x, body.pos.y, bodyRadius * 1.5, 0, 2 * Math.PI);
    const gradient = ctx.createRadialGradient(body.pos.x, body.pos.y, bodyRadius, body.pos.x, body.pos.y, bodyRadius * 1.5);
    gradient.addColorStop(0, `${color}80`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();
  }, []);

  const drawOnePath = useCallback((path, color, ctx, currentZoom) => {
    if (path.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 / currentZoom;
    ctx.stroke();
  }, []);

  const drawOneVector = useCallback((body, ctx, currentZoom, currentVectorScale) => {
    const { pos, vel } = body;
    const baseScale = 0.5;
    const scale = baseScale * currentVectorScale;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + vel.x * scale, pos.y + vel.y * scale);
    ctx.strokeStyle = '#FF00FF'; // Magenta
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();
  }, []);
  
  const drawOneForceVector = useCallback((pos, force, scale, color, ctx, currentZoom) => {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + force.x * scale, pos.y + force.y * scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / currentZoom;
    ctx.stroke();
  }, []);

  const drawForceVectors = useCallback((ctx, currentZoom, currentVectorScale) => {
    const { body1, body2 } = simStateRef.current;
    
    const delta_x = body2.pos.x - body1.pos.x;
    const delta_y = body2.pos.y - body1.pos.y;
    const r_sq = delta_x * delta_x + delta_y * delta_y;
    if (r_sq === 0) return;
    const r = Math.sqrt(r_sq);
    const F_mag = (G * body1.mass * body2.mass) / r_sq;
    const u_x = delta_x / r;
    const u_y = delta_y / r;

    const f1 = { x: F_mag * u_x, y: F_mag * u_y };
    const f2 = { x: -F_mag * u_x, y: -F_mag * u_y };

    const baseScale = 0.005; 
    const finalScale = baseScale * currentVectorScale;
    drawOneForceVector(body1.pos, f1, finalScale, '#FF4136', ctx, currentZoom);
    drawOneForceVector(body2.pos, f2, finalScale, '#FF4136', ctx, currentZoom);
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
    const totalMass = body1.mass + body2.mass;
    const cm_x = (body1.pos.x * body1.mass + body2.pos.x * body2.mass) / totalMass;
    const cm_y = (body1.pos.y * body1.mass + body2.pos.y * body2.mass) / totalMass;
    return { x: cm_x, y: cm_y };
  }, []);
  
  const drawBarycenter = useCallback((ctx, currentZoom) => {
      const cm = calculateBarycenter();
      drawX(cm.x, cm.y, '#AAAAAA', ctx, currentZoom); // Gray 'X'
  }, [calculateBarycenter, drawX]);

  const calculateOrbitalElements = useCallback(() => {
    const { body1, body2 } = simStateRef.current;
    
    const r_vec = { x: body2.pos.x - body1.pos.x, y: body2.pos.y - body1.pos.y, z: 0 };
    const v_vec = { x: body2.vel.x - body1.vel.x, y: body2.vel.y - body1.vel.y, z: 0 };
    
    const MU = G * (body1.mass + body2.mass);
    const r = Math.sqrt(r_vec.x**2 + r_vec.y**2);
    if (r === 0) return;
    
    const h_vec = { z: r_vec.x * v_vec.y - r_vec.y * v_vec.x };
    const h = h_vec.z;
    const v_cross_h = { x: v_vec.y * h_vec.z, y: -v_vec.x * h_vec.z };
    const e_vec = { x: (v_cross_h.x / MU) - (r_vec.x / r), y: (v_cross_h.y / MU) - (r_vec.y / r) };
    const e = Math.sqrt(e_vec.x**2 + e_vec.y**2);
    
    simStateRef.current.relativeOrbit.eccentricity = e;

    if (e < 1) {
      const a = (h**2 / MU) * (1 / (1 - e**2));
      simStateRef.current.relativeOrbit.semiMajorAxis = a;
    } else {
      simStateRef.current.relativeOrbit.semiMajorAxis = Infinity;
    }

    // Update stats overlay (triggers React re-render for stats only)
    const r_rel = r;
    const v_rel = Math.sqrt(v_vec.x**2 + v_vec.y**2);
    setStats({
      r_rel: r_rel,
      v_rel: v_rel,
      e: simStateRef.current.relativeOrbit.eccentricity,
      a: simStateRef.current.relativeOrbit.semiMajorAxis
    });
  }, []);

  const draw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    
    const simState = simStateRef.current;

    ctx.save();
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, -zoom);

    if (overlays.showPath) {
      drawOnePath(simState.body1.path, 'rgba(255, 215, 0, 0.25)', ctx, zoom);
      drawOnePath(simState.body2.path, 'rgba(0, 191, 255, 0.25)', ctx, zoom);
    }
    if (overlays.showFoci) {
      drawBarycenter(ctx, zoom);
    }

    drawBody(simState.body1, '#FFD700', ctx, zoom);
    drawBody(simState.body2, '#00BFFF', ctx, zoom);

    if (overlays.showVector) {
      drawOneVector(simState.body1, ctx, zoom, vectorScale);
      drawOneVector(simState.body2, ctx, zoom, vectorScale);
    }
    if (overlays.showForceVector) {
      drawForceVectors(ctx, zoom, vectorScale);
    }

    ctx.restore();
  }, [
      zoom, overlays, vectorScale, 
      drawBody, drawOnePath, drawBarycenter, 
      drawOneVector, drawForceVectors
  ]);

  const updatePhysics = useCallback((dt) => {
    const { body1, body2 } = simStateRef.current;

    const delta_x = body2.pos.x - body1.pos.x;
    const delta_y = body2.pos.y - body1.pos.y;
    const r_sq = delta_x * delta_x + delta_y * delta_y;
    if (r_sq === 0) return; // Prevent division by zero
    
    const r = Math.sqrt(r_sq);
    const F_mag = (G * body1.mass * body2.mass) / r_sq;
    const u_x = delta_x / r;
    const u_y = delta_y / r;

    const a1_x = (F_mag * u_x) / body1.mass;
    const a1_y = (F_mag * u_y) / body1.mass;
    const a2_x = (-F_mag * u_x) / body2.mass;
    const a2_y = (-F_mag * u_y) / body2.mass;

    body1.vel.x += a1_x * dt;
    body1.vel.y += a1_y * dt;
    body2.vel.x += a2_x * dt;
    body2.vel.y += a2_y * dt;

    body1.pos.x += body1.vel.x * dt;
    body1.pos.y += body1.vel.y * dt;
    body2.pos.x += body2.vel.x * dt;
    body2.pos.y += body2.vel.y * dt;

    body1.path.push({ ...body1.pos });
    if (body1.path.length > MAX_PATH_LENGTH) body1.path.shift();
    
    body2.path.push({ ...body2.pos });
    if (body2.path.length > MAX_PATH_LENGTH) body2.path.shift();
  }, []);

  // --- Scenario Setup ---
  const setScenario = useCallback((preset) => {
    const simState = simStateRef.current;
    const m1 = simState.body1.mass;
    const m2 = simState.body2.mass;
    const totalMass = m1 + m2;
    const MU = G * totalMass;

    simState.body1.path = [];
    simState.body2.path = [];
    simState.simTime = 0;

    let r_rel_vec = { x: 150, y: 0 };
    let v_rel_vec = { x: 0, y: Math.sqrt(MU / 150) };

    switch (preset) {
      case 'circular':
        break;
      case 'elliptical': {
        r_rel_vec = { x: 200, y: 0 };
        const a_ellip = 200 / (1 + 0.5);
        const v_ellip = Math.sqrt(MU / a_ellip * (1 - 0.5) / (1 + 0.5));
        v_rel_vec = { x: 0, y: v_ellip };
        break;
      }
      case 'highlyElliptical': {
        r_rel_vec = { x: 300, y: 0 };
        const a_high = 300 / (1 + 0.8);
        const v_high = Math.sqrt(MU / a_high * (1 - 0.8) / (1 + 0.8));
        v_rel_vec = { x: 0, y: v_high };
        break;
      }
      case 'hyperbolic': {
        r_rel_vec = { x: -300, y: 100 };
        const r_hyp = Math.sqrt(r_rel_vec.x**2 + r_rel_vec.y**2);
        const a_hyp = -100;
        const v_mag_hyp = Math.sqrt(MU * (2 / r_hyp - 1 / a_hyp));
        const target = { x: 0, y: 50 };
        const dir_x = target.x - r_rel_vec.x;
        const dir_y = target.y - r_rel_vec.y;
        const dir_mag = Math.sqrt(dir_x**2 + dir_y**2);
        v_rel_vec = {
          x: (dir_x / dir_mag) * v_mag_hyp,
          y: (dir_y / dir_mag) * v_mag_hyp
        };
        break;
      }
      default:
        break;
    }

    simState.body1.pos = { x: -r_rel_vec.x * (m2 / totalMass), y: -r_rel_vec.y * (m2 / totalMass) };
    simState.body2.pos = { x: r_rel_vec.x * (m1 / totalMass), y: r_rel_vec.y * (m1 / totalMass) };
    simState.body1.vel = { x: -v_rel_vec.x * (m2 / totalMass), y: -v_rel_vec.y * (m2 / totalMass) };
    simState.body2.vel = { x: v_rel_vec.x * (m1 / totalMass), y: v_rel_vec.y * (m1 / totalMass) };
    
    simState.body1.path.push({ ...simState.body1.pos });
    simState.body2.path.push({ ...simState.body2.pos });
    calculateOrbitalElements();
  }, [calculateOrbitalElements]);

  // --- Game Loop ---
  const gameLoop = useCallback((currentTime) => {
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    if (!isRunning) {
      lastFrameTimeRef.current = currentTime;
      return;
    }

    const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000.0;
    lastFrameTimeRef.current = currentTime;
    const effectiveDeltaTime = Math.min(deltaTime, 0.1) * simSpeed;
    
    simStateRef.current.accumulator += effectiveDeltaTime;

    while (simStateRef.current.accumulator >= TIME_STEP) {
      updatePhysics(TIME_STEP);
      simStateRef.current.accumulator -= TIME_STEP;
      simStateRef.current.simTime += TIME_STEP;
    }
    
    calculateOrbitalElements();
    draw();
  }, [isRunning, simSpeed, updatePhysics, calculateOrbitalElements, draw]);

  // --- useEffect for Initialization and Resize ---
  useEffect(() => {
    const canvas = canvasRef.current;
    ctxRef.current = canvas.getContext('2d');
    
    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      if (!isRunning) {
        draw(); // Redraw on resize if paused
      }
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    handleResize(); // Initial call

    // Set initial scenario
    setScenario('circular');
    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameIdRef.current);
      resizeObserver.disconnect();
    };
  }, [setScenario, gameLoop, isRunning, draw]); // Add isRunning and draw to re-draw if paused

  // --- Event Handlers ---
  
  const handleMass1Change = (e) => {
    const newMass = parseFloat(e.target.value);
    setMass1(newMass);
    simStateRef.current.body1.mass = newMass;
  };
  
  const handleMass2Change = (e) => {
    const newMass = parseFloat(e.target.value);
    setMass2(newMass);
    simStateRef.current.body2.mass = newMass;
  };

  const handleMassRatio = (m1, m2) => {
    setMass1(m1);
    setMass2(m2);
    simStateRef.current.body1.mass = m1;
    simStateRef.current.body2.mass = m2;
    setScenario('circular');
  };

  const handleToggleOverlay = (overlay) => {
    setOverlays(prev => ({ ...prev, [overlay]: !prev[overlay] }));
  };

  // --- Render JSX ---
  return (
    <>
      <Styles />
      <div className="bg-gray-900 text-gray-200 overflow-hidden h-screen flex flex-col md:flex-row">
        {/* Control Panel */}
        <div className="w-full md:w-80 lg:w-96 p-4 bg-gray-800 shadow-2xl overflow-y-auto flex-shrink-0 controls-panel">
          <h1 className="text-2xl font-bold text-white mb-4">Two-Body Simulation</h1>

          {/* Mass & Scenarios */}
          <div className="space-y-4 mb-4 panel-card">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Mass &amp; Scenarios</h2>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="slider-mass1">
                Body 1 (Yellow) Mass: <span className="font-bold text-yellow-300">{mass1}</span>
              </label>
              <input
                type="range"
                id="slider-mass1"
                min="1"
                max="1000"
                value={mass1}
                onChange={handleMass1Change}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="slider-mass2">
                Body 2 (Blue) Mass: <span className="font-bold text-sky-300">{mass2}</span>
              </label>
              <input
                type="range"
                id="slider-mass2"
                min="1"
                max="1000"
                value={mass2}
                onChange={handleMass2Change}
              />
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
                  {key === 'showFoci' && 'Show Barycenter (F1)'}
                  {key === 'showVector' && 'Show Velocity Vectors'}
                  {key === 'showForceVector' && 'Show Force Vectors'}
                </span>
              </label>
            ))}
          </div>

          {/* Controls */}
          <div className="space-x-3 mb-4 panel-card">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Controls</h2>
            <button
              onClick={() => setIsRunning(!isRunning)}
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
                  Vector Scale: <span className="font-medium text-white">{vectorScale.toFixed(1)}</span>x
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
        </div>

        {/* Canvas + HUD */}
        <div className="flex-grow relative">
          <canvas ref={canvasRef} className="w-full h-full block bg-black" />
          <StatsOverlay stats={stats} />
        </div>
      </div>
    </>
  );
}