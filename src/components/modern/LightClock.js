import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Info, ArrowRight } from 'lucide-react';

const LightClockSim = () => {
  // --- Configuration Constants ---
  const C = 400; // Speed of light in pixels per second
  const HEIGHT = 200; // Distance between mirrors (L)
  const MIRROR_WIDTH = 60;
  const MIRROR_HEIGHT = 10;
  
  // --- State ---
  const [velocityRatio, setVelocityRatio] = useState(0.5); // v/c (0 to 0.99)
  const [isRunning, setIsRunning] = useState(false);
  const [showPath, setShowPath] = useState(true);
  
  // Simulation State (Refs for performance in animation loop)
  const stateRef = useRef({
    restY: HEIGHT / 2,         // Y position of photon in rest frame (starts middle to sync)
    restDir: 1,                // 1 for down, -1 for up
    movingX: 50,               // X position of moving clock
    movingY: HEIGHT / 2,       // Y position of photon in moving frame
    movingDir: 1,              // Vertical direction
    restTicks: 0,
    movingTicks: 0,
    lastTime: 0,
    trailRest: [],             // Array of {x, y}
    trailMoving: [],           // Array of {x, y}
  });

  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // --- Physics Helpers ---
  const getGamma = (v) => {
    if (v >= 1) return 999; // Singularity protection
    return 1 / Math.sqrt(1 - v * v);
  };

  const resetSimulation = useCallback(() => {
    stateRef.current = {
      restY: MIRROR_HEIGHT, 
      restDir: 1,
      movingX: 50,
      movingY: MIRROR_HEIGHT,
      movingDir: 1,
      restTicks: 0,
      movingTicks: 0,
      lastTime: performance.now(),
      trailRest: [],
      trailMoving: [],
    };
    // Force a re-render to clear ticks display if needed, 
    // though usually we read refs in the loop. 
    // To update UI counters, we might need a separate state sync or just read ref in a simpler way.
    // For high freq updates, we'll keep counters in ref and update a state occasionally or just draw them on canvas.
    // Let's draw counters on canvas for 60fps smoothness, and use state for the "final" values if stopped.
  }, []);

  // --- Animation Loop ---
  const animate = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const state = stateRef.current;

    // Calculate delta time in seconds
    const dt = Math.min((time - state.lastTime) / 1000, 0.1); // Cap at 0.1s to prevent huge jumps
    state.lastTime = time;

    if (isRunning) {
      // 1. Update Rest Frame Physics
      // Distance = rate * time. Rate is C.
      const distRest = C * dt;
      let newRestY = state.restY + (distRest * state.restDir);

      // Bounce Logic Rest
      if (newRestY >= HEIGHT + MIRROR_HEIGHT) {
        newRestY = HEIGHT + MIRROR_HEIGHT;
        state.restDir = -1;
        state.restTicks += 0.5; // Half a tick (one way)
      } else if (newRestY <= MIRROR_HEIGHT) {
        newRestY = MIRROR_HEIGHT;
        state.restDir = 1;
        state.restTicks += 0.5;
      }
      state.restY = newRestY;

      // 2. Update Moving Frame Physics
      // The moving clock moves horizontally at v = velocityRatio * C
      // The photon moves Diagonally at speed C.
      // Therefore, vertical component Vy = sqrt(C^2 - v^2)
      // This is the core of Time Dilation!
      const v = velocityRatio * C;
      const vy = Math.sqrt(C*C - v*v);
      
      // Horizontal movement
      state.movingX += v * dt;
      
      // Vertical movement
      const distVertical = vy * dt;
      let newMovingY = state.movingY + (distVertical * state.movingDir);

      // Bounce Logic Moving
      if (newMovingY >= HEIGHT + MIRROR_HEIGHT) {
        newMovingY = HEIGHT + MIRROR_HEIGHT;
        state.movingDir = -1;
        state.movingTicks += 0.5;
      } else if (newMovingY <= MIRROR_HEIGHT) {
        newMovingY = MIRROR_HEIGHT;
        state.movingDir = 1;
        state.movingTicks += 0.5;
      }
      state.movingY = newMovingY;

      // Wrap around logic for moving clock visualization
      if (state.movingX > width / 2 + 100) {
        // Find how much trail to keep to make it look seamless? 
        // For simplicity, just reset X and clear trails to avoid drawing artifacts across screen
        state.movingX = 50;
        state.trailMoving = []; 
      }

      // 3. Update Trails
      if (showPath) {
        state.trailRest.push({ x: width * 0.25, y: state.restY });
        state.trailMoving.push({ x: state.movingX, y: state.movingY });
        
        // Limit trail length
        if (state.trailRest.length > 200) state.trailRest.shift();
        if (state.trailMoving.length > 300) state.trailMoving.shift();
      }
    }

    // --- Drawing ---
    ctx.clearRect(0, 0, width, height);

    // Background divider
    ctx.beginPath();
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 2;
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    // Helper: Draw Clock
    const drawClock = (cx, cy, photonY, label, isMoving) => {
      // Mirrors
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.fillRect(cx - MIRROR_WIDTH/2, 0, MIRROR_WIDTH, MIRROR_HEIGHT); // Top
      ctx.fillRect(cx - MIRROR_WIDTH/2, HEIGHT + MIRROR_HEIGHT, MIRROR_WIDTH, MIRROR_HEIGHT); // Bottom

      // Frame connector (faint)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - MIRROR_WIDTH/2 + 5, MIRROR_HEIGHT);
      ctx.lineTo(cx - MIRROR_WIDTH/2 + 5, HEIGHT + MIRROR_HEIGHT);
      ctx.moveTo(cx + MIRROR_WIDTH/2 - 5, MIRROR_HEIGHT);
      ctx.lineTo(cx + MIRROR_WIDTH/2 - 5, HEIGHT + MIRROR_HEIGHT);
      ctx.stroke();

      // Photon
      ctx.beginPath();
      ctx.arc(cx, photonY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15'; // yellow-400
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      if (label) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx, height - 20);
      }
    };

    // Draw Trails
    if (showPath) {
      ctx.lineWidth = 3;
      
      // Rest Trail
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'; // cyan-400 low opacity
      ctx.beginPath();
      state.trailRest.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Moving Trail
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.3)'; // pink-400 low opacity
      ctx.beginPath();
      state.trailMoving.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Draw Left Clock (Rest Frame)
    drawClock(width * 0.25, 0, state.restY, "Stationary Frame (Alice)", false);

    // Draw Right Clock (Moving Frame)
    drawClock(state.movingX + width/2, 0, state.movingY, "", true);
    
    // Draw Label for Moving Clock manually since it moves
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Moving Frame (Bob)", width * 0.75, height - 20);

    // Draw Ticks Counters on Canvas
    ctx.font = '24px monospace';
    ctx.fillStyle = '#38bdf8'; // cyan
    ctx.fillText(`Ticks: ${Math.floor(state.restTicks)}`, width * 0.25, 40);

    ctx.fillStyle = '#f472b6'; // pink
    ctx.fillText(`Ticks: ${Math.floor(state.movingTicks)}`, width * 0.75, 40);

    // Loop
    requestRef.current = requestAnimationFrame(animate);
  }, [isRunning, velocityRatio, showPath]);

  // Handle Play/Pause
  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // Initial Reset
  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  const gamma = getGamma(velocityRatio);
  const percentC = Math.round(velocityRatio * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 p-4 font-sans">
      
      {/* Header */}
      <div className="w-full max-w-4xl mb-6 text-center space-y-2">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500">
          Special Relativity: The Light Clock
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Compare a stationary clock with a moving clock. As velocity increases, the light must travel a longer diagonal path, causing time to slow down (Time Dilation).
        </p>
      </div>

      {/* Main Simulation Viewport */}
      <div className="relative w-full max-w-5xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden mb-6">
        
        {/* Canvas Layer */}
        <canvas 
          ref={canvasRef} 
          width={1000} 
          height={300} 
          className="w-full h-auto block"
        />

        {/* Overlay Info (Lorentz Factor) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-slate-600 flex gap-4 text-sm font-mono">
           <span className="text-cyan-400">v = {percentC}% c</span>
           <span className="text-pink-400">γ = {gamma.toFixed(3)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Playback Controls */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-semibold flex items-center gap-2">
               <Info size={18} className="text-cyan-400"/> Controls
             </h2>
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`p-3 rounded-lg flex items-center gap-2 font-bold transition-colors ${isRunning ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-900'}`}
                >
                  {isRunning ? <><Pause size={18}/> Pause</> : <><Play size={18}/> Start</>}
                </button>
                <button 
                  onClick={resetSimulation}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={18}/>
                </button>
             </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Velocity (v/c)</label>
                <span className="text-sm font-mono text-cyan-400">{percentC}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                value={velocityRatio}
                onChange={(e) => {
                  setVelocityRatio(parseFloat(e.target.value));
                  resetSimulation(); // Reset on change to keep sync clear
                }}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0% (Stationary)</span>
                <span>99% (Speed of Light)</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <input 
                type="checkbox" 
                id="showPath" 
                checked={showPath} 
                onChange={() => setShowPath(!showPath)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-800"
               />
               <label htmlFor="showPath" className="text-slate-300 cursor-pointer select-none">Show light path trails</label>
            </div>
          </div>
        </div>

        {/* Explanation Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-semibold text-pink-400">Why does time slow down?</h2>
          <p>
            The speed of light ($c$) is constant for all observers.
          </p>
          <ul className="space-y-2 text-slate-300">
            <li className="flex gap-2">
              <ArrowRight size={16} className="mt-1 flex-shrink-0 text-cyan-400"/>
              <span>
                <strong>Alice (Left):</strong> Sees the light bounce straight up and down. Distance is short ($2L$).
              </span>
            </li>
            <li className="flex gap-2">
              <ArrowRight size={16} className="mt-1 flex-shrink-0 text-pink-400"/>
              <span>
                <strong>Bob (Right):</strong> Sees the clock moving. The light must travel a diagonal zigzag path to keep up with the mirrors.
              </span>
            </li>
          </ul>
          <div className="bg-slate-900 p-3 rounded border border-slate-700 font-mono text-xs text-center text-slate-400">
            Δt' = Δt / √(1 - v²/c²)
          </div>
          <p>
            Since the diagonal path is longer, but the speed of light cannot change, the "tick" takes longer to complete for the moving clock.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LightClockSim;