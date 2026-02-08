import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Zap, Thermometer, Activity, Lock, Play, Pause, RefreshCw, Eye, ChevronRight, Clock, Target, Briefcase, Waves } from 'lucide-react';

// --- VISUALIZER COMPONENT (Physics Preserved) ---
const FissionCanvas = ({ active, controlRodLevel, onClose }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const frameRef = useRef();
    
    const activeRef = useRef(active);
    const rodLevelRef = useRef(controlRodLevel);

    useEffect(() => {
        activeRef.current = active;
        rodLevelRef.current = controlRodLevel;
    }, [active, controlRodLevel]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        if (particlesRef.current.length === 0) {
            for(let i=0; i<20; i++) {
                particlesRef.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 1, 
                    vy: (Math.random() - 0.5) * 1,
                    life: 200,
                    type: 'thermal' 
                });
            }
        }

        const fuelCells = [];
        const rows = 4;
        const cols = 4;
        const cellW = width / cols;
        const cellH = height / rows;
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                fuelCells.push({ x: c * cellW + 10, y: r * cellH + 10, w: cellW - 20, h: cellH - 20 });
            }
        }

        const render = () => {
            ctx.fillStyle = '#001100';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#1a2e1a';
            fuelCells.forEach(cell => {
                ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
                ctx.fillStyle = '#2d4a2d';
                ctx.fillRect(cell.x + 5, cell.y + 5, cell.w - 10, cell.h - 10);
                ctx.fillStyle = '#1a2e1a';
            });

            const currentRodLevel = rodLevelRef.current;
            const rodHeight = (height) * (currentRodLevel / 100);
            
            ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
            ctx.strokeStyle = '#555';
            for(let c=0; c<cols; c++) {
                 const rx = (c * cellW) + (cellW/2) - 5;
                 ctx.fillRect(rx, 0, 10, rodHeight);
                 ctx.strokeRect(rx, 0, 10, rodHeight);
            }

            if (particlesRef.current.length > 300) {
                particlesRef.current = particlesRef.current.slice(0, 300);
            }

            if (activeRef.current && Math.random() < 0.1 && particlesRef.current.length < 60) {
                 particlesRef.current.push({
                    x: Math.random() * width,
                    y: height - 10,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 3 - 2,
                    life: 200,
                    type: 'fast'
                });
            }

            particlesRef.current.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;

                if (p.type === 'fast') {
                    if (Math.random() < 0.03) {
                        p.type = 'thermal';
                        p.vx *= 0.3; 
                        p.vy *= 0.3;
                    }
                }

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                let absorbed = false;
                if (p.y < rodHeight) {
                    for(let c=0; c<cols; c++) {
                        const rx = (c * cellW) + (cellW/2);
                        if (Math.abs(p.x - rx) < 10) absorbed = true;
                    }
                }

                if (absorbed) {
                    particlesRef.current.splice(index, 1);
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    return;
                }

                if (p.type === 'thermal') {
                    fuelCells.forEach(cell => {
                        if (p.x > cell.x && p.x < cell.x + cell.w && p.y > cell.y && p.y < cell.y + cell.h) {
                            if (Math.random() < 0.04) {
                                ctx.fillStyle = '#aaffaa';
                                ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
                                particlesRef.current.push({
                                    x: p.x, y: p.y,
                                    vx: (Math.random() - 0.5) * 6,
                                    vy: (Math.random() - 0.5) * 6,
                                    life: 100,
                                    type: 'fast'
                                });
                            }
                        }
                    });
                }

                ctx.fillStyle = p.type === 'fast' ? '#ffffff' : '#33ff33';
                ctx.beginPath();
                const radius = p.type === 'fast' ? 1.5 : 2.5;
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.fill();
            });

            particlesRef.current = particlesRef.current.filter(p => p.life > 0);
            frameRef.current = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameRef.current);
    }, []);

    return (
        <div className="relative h-full w-full bg-black group border-2 border-green-900/50">
            <canvas 
                ref={canvasRef} 
                width={400} 
                height={300} 
                className="w-full h-full bg-black shadow-[inset_0_0_20px_rgba(0,50,0,0.8)] cursor-pointer"
                onClick={onClose}
                title="Click to return to dashboard"
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-[10px] text-green-300"><div className="w-2 h-2 rounded-full bg-white"></div> FAST</div>
                <div className="flex items-center gap-2 text-[10px] text-green-300"><div className="w-2 h-2 rounded-full bg-green-500"></div> THERMAL</div>
            </div>
            <div className="absolute top-2 right-2">
                 <button onClick={onClose} className="bg-black border border-green-500 text-green-500 text-xs px-2 py-1 hover:bg-green-900">X CLOSE</button>
            </div>
        </div>
    );
};

// --- GAME DATA ---
const LEVELS = [
    { id: 1, name: "GRAVEYARD SHIFT", quota: 15000, time: 60, desc: "Low demand. Keep the core steady." },
    { id: 2, name: "MORNING SURGE", quota: 35000, time: 60, desc: "Grid demand increasing. Ramp it up." },
    { id: 3, name: "COLD WINTER", quota: 55000, time: 60, desc: "Maximum output required. Do not fail us." }
];

const FACTS = [
    "The RBMK design lacked a containment structure, a standard safety feature in Western reactors.",
    "The 'AZ-5' emergency button actually inserted graphite-tipped rods, momentarily increasing reactivity.",
    "The disaster released 400 times more radioactive material than the Hiroshima bomb.",
    "The 'Elephant's Foot' is a solid mass of melted nuclear fuel (corium) still radioactive today.",
    "Pripyat was founded in 1970 specifically to serve the nearby nuclear power plant.",
    "Liquidators used 'bio-robots' (humans) to clear roof debris after mechanical robots failed due to radiation.",
    "The plant continued to produce electricity with the remaining reactors until 2000.",
    "Xenon-135 'poisoning' in the core played a critical role in the instability leading up to the accident.",
    "The Exclusion Zone has inadvertently become a thriving wildlife sanctuary due to lack of human activity.",
    "Red Forest got its name when the pine trees turned ginger-brown and died from high-level radiation."
];

// --- MAIN COMPONENT ---
const RetroReactor = () => {
  // Game Flow State
  const [gamePhase, setGamePhase] = useState('SIMULATOR'); // SIMULATOR, MENU, PLAYING, WON, LOST, SIM_CRASH
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [levelScore, setLevelScore] = useState(0); // Energy accumulated this level
  const [timeLeft, setTimeLeft] = useState(0);
  const [endReason, setEndReason] = useState(null); // 'MELTDOWN', 'PRESSURE', 'FIRED'
  const [winFact, setWinFact] = useState('');
  
  // Physics State
  const [active, setActive] = useState(false);
  const [viewMode, setViewMode] = useState('DASHBOARD');
  const [controlRodLevel, setControlRodLevel] = useState(100);
  const [coolantFlow, setCoolantFlow] = useState(0);
  const [coreTemp, setCoreTemp] = useState(25);
  const [pressure, setPressure] = useState(1);
  const [powerOutput, setPowerOutput] = useState(0); // MWe
  const [reactivity, setReactivity] = useState(0);
  
  // Refs
  const lastUpdateRef = useRef(Date.now());
  const requestRef = useRef();
  const fluxNoiseRef = useRef(0); // Holds the current random drift value
  // Offset Phases for organic wave generation (randomized on load)
  const driftOffsetsRef = useRef({ 
      p1: Math.random() * 100, 
      p2: Math.random() * 100, 
      p3: Math.random() * 100 
  });

  const MAX_TEMP = 3000;
  const CRITICAL_TEMP = 2000;
  const MELTDOWN_TEMP = 2500;
  const FAILURE_PRESSURE = 220;
  const AMBIENT_TEMP = 25;

  // --- GAME LOGIC ---
  const enterMenu = () => {
      setGamePhase('MENU');
      setActive(false);
  };

  const startSimulator = () => {
      setControlRodLevel(100);
      setCoolantFlow(0);
      setCoreTemp(25);
      setPressure(1);
      setPowerOutput(0);
      setReactivity(0);
      setGamePhase('SIMULATOR');
      fluxNoiseRef.current = 0;
      setActive(false); // Let user toggle it
      setEndReason(null);
      lastUpdateRef.current = Date.now();
  };

  const startGame = (levelIndex) => {
      setCurrentLevelIdx(levelIndex);
      setControlRodLevel(100);
      setCoolantFlow(0);
      setCoreTemp(25);
      setPressure(1);
      setPowerOutput(0);
      setReactivity(0);
      
      fluxNoiseRef.current = 0;
      setLevelScore(0);
      setTimeLeft(LEVELS[levelIndex].time);
      setGamePhase('PLAYING');
      setActive(true);
      setEndReason(null);
      lastUpdateRef.current = Date.now();
  };

  const nextLevel = () => {
      if (currentLevelIdx < LEVELS.length - 1) {
          startGame(currentLevelIdx + 1);
      } else {
          // Game Completed Loop
          startGame(0);
      }
  };

  const retryLevel = () => {
      startGame(currentLevelIdx);
  };

  // Helper to format simulated time (1 real sec = 12 sim minutes)
  const formatSimTime = (realSeconds) => {
    // 60s level = 12 hours = 720 minutes
    const simMinutes = Math.floor(realSeconds * 12);
    const hours = Math.floor(simMinutes / 60);
    const minutes = simMinutes % 60;
    return `T-${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const updatePhysics = useCallback(() => {
    // Only update physics in PLAYING or SIMULATOR modes
    if (gamePhase !== 'PLAYING' && gamePhase !== 'SIMULATOR') return;

    const now = Date.now();
    const dt = (now - lastUpdateRef.current) / 1000;
    lastUpdateRef.current = now;

    // --- PHYSICS CALCS ---
    const insertionFactor = controlRodLevel / 100;
    const baseReactivity = 60 * Math.pow(1 - insertionFactor, 3); 
    const tempCoefficient = -0.002 * (coreTemp - AMBIENT_TEMP);
    
    // --- NEW: Organic Drift (Smoothed Noise) ---
    // Only apply oscillations in Career Mode (PLAYING), disable in Sandbox (SIMULATOR)
    if (gamePhase === 'SIMULATOR') {
        fluxNoiseRef.current = 0;
    } else {
        const t = now / 1000;
        const { p1, p2, p3 } = driftOffsetsRef.current;
        
        // 1. Heavy Heave (~20s cycle): The main "breathing" of the reactor
        const wave1 = Math.sin(t * 0.3 + p1); 
        // 2. Medium Drift (~7s cycle): Standard variance
        const wave2 = Math.sin(t * 0.9 + p2) * 0.5;
        // 3. Texture Ripple (~2s cycle): Adds "life" without jaggedness
        const wave3 = Math.sin(t * 3.0 + p3) * 0.2;
        
        const rawDrift = wave1 + wave2 + wave3; // Continuous smooth value

        // Instability Multiplier: Higher temp = High Amplitude (Swings get WIDER, not faster)
        const instabilityMultiplier = 1 + (Math.max(0, coreTemp - 800) / 1000);
        
        // Final noise application 
        fluxNoiseRef.current = rawDrift * 0.15 * instabilityMultiplier;
    }
    
    let currentReactivity = baseReactivity + tempCoefficient + fluxNoiseRef.current;
    if (currentReactivity < 0) currentReactivity = 0;

    const heatGen = currentReactivity * 200; 
    const coolingRate = coolantFlow * 8.0; 
    const passiveCooling = (coreTemp - AMBIENT_TEMP) * 0.1;

    const netHeat = heatGen - coolingRate - passiveCooling;
    let newTemp = coreTemp + (netHeat * dt);
    if (newTemp < AMBIENT_TEMP) newTemp = AMBIENT_TEMP;

    let targetPressure = 1;
    if (newTemp > 100) {
      const steamPressure = (newTemp - 100) * 0.2;
      const flowRelief = coolantFlow * 0.05; 
      targetPressure = 1 + Math.max(0, steamPressure - flowRelief);
    }
    const pressureChange = (targetPressure - pressure) * dt * 0.8;
    let newPressure = pressure + pressureChange;

    let generatedPower = 0;
    if (newPressure > 5 && coolantFlow > 0) {
        generatedPower = (newPressure * coolantFlow * 0.5); // MWe
    }

    // --- GAME LOOP & WIN/LOSS CONDITIONS ---
    if (gamePhase === 'PLAYING') {
        const displayPower = generatedPower * 0.15; // Scaled to match UI
        const energyThisFrame = displayPower * dt; // MW * s
        let newScore = levelScore + energyThisFrame;
        let newTime = timeLeft - dt;

        if (newTemp > MELTDOWN_TEMP) {
            setEndReason('MELTDOWN');
            setGamePhase('LOST');
            setActive(false);
        } else if (newPressure > FAILURE_PRESSURE) {
            setEndReason('PRESSURE');
            setGamePhase('LOST');
            setActive(false);
        } else if (newScore >= LEVELS[currentLevelIdx].quota) {
            // IMMEDIATE WIN CONDITION
            // Pick a random fact
            const randomFact = FACTS[Math.floor(Math.random() * FACTS.length)];
            setWinFact(randomFact);
            setGamePhase('WON');
            setActive(false);
        } else if (newTime <= 0) {
            setEndReason('FIRED');
            setGamePhase('LOST');
            setActive(false);
        }

        setLevelScore(newScore);
        setTimeLeft(newTime);
    } 
    else if (gamePhase === 'SIMULATOR') {
        // Sandbox Fail States
        if (newTemp > MELTDOWN_TEMP) {
            setEndReason('MELTDOWN');
            setGamePhase('SIM_CRASH');
            setActive(false);
        } else if (newPressure > FAILURE_PRESSURE) {
            setEndReason('PRESSURE');
            setGamePhase('SIM_CRASH');
            setActive(false);
        }
    }

    // Update State
    setReactivity(currentReactivity);
    setCoreTemp(newTemp);
    setPressure(newPressure);
    setPowerOutput(generatedPower);

    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [gamePhase, controlRodLevel, coolantFlow, coreTemp, pressure, levelScore, timeLeft, currentLevelIdx]);

  useEffect(() => {
    if (active) {
        requestRef.current = requestAnimationFrame(updatePhysics);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [updatePhysics, active]);

  const handleScram = () => {
    setControlRodLevel(100);
  };

  // --- Display Scaling ---
  const displayThermalPower = reactivity * 400; 
  const displayElectricalPower = powerOutput * 0.15; 
  const currentQuota = LEVELS[currentLevelIdx].quota;

  return (
    <div className="bg-black text-green-500 font-mono p-4 md:p-8 relative selection:bg-green-900 selection:text-white">
      
      {/* CRT SCANLINE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
      </div>

      {/* --- MENU OVERLAYS --- */}
      {gamePhase === 'MENU' && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
              <div className="max-w-2xl w-full border-4 border-green-600 bg-black p-8 shadow-[0_0_50px_rgba(0,255,0,0.2)] text-center">
                  <h1 className="text-6xl font-black mb-2 text-green-500 tracking-tighter crt-flicker">SKALA</h1>
                  <p className="text-xl mb-8 text-green-700 tracking-[0.5em] uppercase">Shift Manager Career</p>
                  
                  <div className="space-y-4 mb-8 text-left border border-green-900 p-6">
                      <p className="text-green-400">OBJECTIVE: Fulfill the energy quota for your shift.</p>
                      <p className="text-green-400">WARNING: Do not exceed thermal or pressure limits.</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button onClick={() => startGame(0)} className="bg-green-700 text-black font-bold text-2xl px-12 py-4 hover:bg-green-500 hover:scale-105 transition-all uppercase tracking-widest">
                        Start Shift
                    </button>
                    <button onClick={startSimulator} className="border border-green-700 text-green-500 text-sm px-4 py-2 hover:bg-green-900/50">
                        RETURN TO SANDBOX
                    </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- GAME OVER / WON OVERLAYS --- */}
      {gamePhase === 'WON' && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
               <div className="max-w-xl w-full border-4 border-green-500 bg-black p-8 text-center animate-in fade-in zoom-in duration-300">
                  <h2 className="text-4xl font-bold text-green-400 mb-4">SHIFT COMPLETE</h2>
                  
                  <div className="border border-green-800 bg-green-900/20 p-6 mb-8 relative">
                      <div className="absolute top-0 left-0 bg-green-800 text-black text-[10px] font-bold px-2 py-0.5 uppercase">Historical Archive</div>
                      <p className="text-green-300 font-mono italic text-lg mt-2">"{winFact}"</p>
                  </div>
                  
                  <button onClick={nextLevel} className="bg-green-700 text-black font-bold px-8 py-3 hover:bg-green-500 transition-all w-full mb-2">
                      {currentLevelIdx < LEVELS.length - 1 ? "START NEXT SHIFT" : "REPLAY CAMPAIGN"}
                  </button>
              </div>
          </div>
      )}

      {gamePhase === 'LOST' && (
          <div className="fixed inset-0 z-[60] bg-red-900/90 flex items-center justify-center p-4">
               <div className="max-w-xl w-full border-4 border-red-500 bg-black p-8 text-center">
                  <h2 className="text-5xl font-black text-red-600 mb-2 blink">CRITICAL FAILURE</h2>
                  <p className="text-2xl text-red-400 mb-8 uppercase tracking-widest">
                      {endReason === 'MELTDOWN' && "CORE LIQUEFACTION EVENT"}
                      {endReason === 'PRESSURE' && "CONTAINMENT BREACH"}
                      {endReason === 'FIRED' && "QUOTA MISSED // TERMINATED"}
                  </p>

                  <div className="text-left font-mono text-red-300 text-xs border border-red-900 p-4 mb-8">
                      <div>INCIDENT REPORT #9921</div>
                      <div>OPERATOR STATUS: DECEASED/FIRED</div>
                      <div>FINAL OUTPUT: {levelScore.toFixed(0)} MWs</div>
                  </div>
                  
                  <button onClick={retryLevel} className="border-2 border-red-600 text-red-600 font-bold px-8 py-3 hover:bg-red-900/50 transition-all w-full">
                      RETRY SHIFT
                  </button>
                  <button onClick={startSimulator} className="text-red-400 text-sm mt-4 hover:underline">
                      ABANDON CAREER & RESET SIM
                  </button>
              </div>
          </div>
      )}

      {/* --- SANDBOX CRASH OVERLAY --- */}
      {gamePhase === 'SIM_CRASH' && (
          <div className="fixed inset-0 z-[60] bg-red-900/50 flex items-center justify-center p-4">
               <div className="max-w-lg w-full border-2 border-red-500 bg-black p-8 text-center">
                  <AlertTriangle className="mx-auto w-16 h-16 text-red-500 mb-4" />
                  <h2 className="text-3xl font-bold text-red-500 mb-2">SIMULATION HALTED</h2>
                  <p className="text-red-400 mb-8 uppercase">
                      {endReason === 'MELTDOWN' ? "CORE MELTDOWN DETECTED" : "VESSEL RUPTURE DETECTED"}
                  </p>
                  <button onClick={startSimulator} className="bg-red-900/50 border border-red-500 text-white font-bold px-8 py-3 hover:bg-red-800 transition-all w-full">
                      RESET SYSTEM
                  </button>
              </div>
          </div>
      )}

      {/* HEADER */}
      <header className="border-b-2 border-green-800 pb-4 mb-8 flex flex-col md:flex-row justify-between items-end relative z-10">
        <div>
            <h1 className="text-3xl font-black tracking-widest text-green-500 mb-1">
                SKALA <span className="text-xs align-top opacity-50">v1.0</span>
            </h1>
            <div className="flex items-center gap-4 text-xs text-green-700 uppercase tracking-wider">
                {gamePhase === 'PLAYING' ? (
                     <span>Shift: {LEVELS[currentLevelIdx].name}</span>
                ) : (
                     <span>MODE: SANDBOX // UNLIMITED</span>
                )}
                <span>Reactor-4</span>
            </div>
        </div>
        
        {/* GAME STATUS BAR */}
        <div className="flex gap-4 mt-4 md:mt-0 items-center">
            {gamePhase === 'PLAYING' ? (
                <>
                    <div className="bg-green-900/20 border border-green-700 px-4 py-2 flex flex-col items-end min-w-[120px]">
                        <div className="text-[10px] text-green-500 uppercase flex items-center gap-1"><Clock size={10}/> Shift Ends</div>
                        <div className={`text-2xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-green-300'}`}>
                            {formatSimTime(Math.max(0, timeLeft))}
                        </div>
                    </div>
                    <div className="bg-green-900/20 border border-green-700 px-4 py-2 flex flex-col items-end min-w-[140px]">
                        <div className="text-[10px] text-green-500 uppercase flex items-center gap-1"><Target size={10}/> Quota Status</div>
                        <div className="text-xl font-mono font-bold text-white">
                            {(levelScore/currentQuota*100).toFixed(0)}%
                        </div>
                        <div className="w-full h-1 bg-green-900 mt-1">
                            <div className="h-full bg-green-400" style={{ width: `${Math.min(100, levelScore/currentQuota*100)}%` }}></div>
                        </div>
                    </div>
                </>
            ) : (
                <button 
                    onClick={enterMenu}
                    className="flex items-center gap-2 bg-green-900/20 border border-green-600 text-green-400 px-4 py-3 hover:bg-green-500 hover:text-black transition-all font-bold tracking-wider text-sm"
                >
                    <Briefcase size={16} /> ENTER CAREER MODE
                </button>
            )}
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-4 space-y-6">
            <div className="border-2 border-green-800 p-6 bg-black/80 shadow-[0_0_20px_rgba(0,20,0,0.2)]">
                <h2 className="text-green-400 border-b border-green-900 pb-2 mb-6 uppercase tracking-wider flex items-center">
                    <Activity className="w-4 h-4 mr-2" /> Manual Override
                </h2>
                
                <RetroSlider 
                    label="Control Rods (Absorber)" 
                    value={controlRodLevel} 
                    onChange={(e) => setControlRodLevel(parseFloat(e.target.value))} 
                />
                
                <RetroSlider 
                    label="Primary Coolant Pumps" 
                    value={coolantFlow} 
                    onChange={(e) => setCoolantFlow(parseInt(e.target.value))} 
                />

                <div className="mt-8 pt-4 border-t border-green-900/50">
                    <button 
                        onClick={handleScram}
                        className="w-full bg-red-900/20 border-2 border-red-800 text-red-600 hover:bg-red-900/40 hover:text-red-500 hover:border-red-500 py-4 font-black tracking-[0.5em] text-xl transition-all shadow-[0_0_15px_rgba(150,0,0,0.2)] animate-pulse"
                    >
                        AZ-5 SCRAM
                    </button>
                    <p className="text-center text-[10px] text-red-900 mt-2 uppercase">Emergency Shutdown Only</p>
                </div>
            </div>
            
            {gamePhase === 'PLAYING' ? (
                <div className="text-xs text-green-800 font-mono p-4 border border-green-900 opacity-50">
                    <div className="mb-1 uppercase font-bold text-green-700">Shift Briefing:</div>
                    {LEVELS[currentLevelIdx].desc}
                </div>
            ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <CRTButton onClick={() => setActive(!active)} active={active}>
                        {active ? <Pause className="mx-auto" /> : <Play className="mx-auto" />}
                    </CRTButton>
                    <CRTButton onClick={startSimulator}>
                        <RefreshCw className="mx-auto" />
                    </CRTButton>
                </div>
            )}
        </div>

        {/* CENTER COLUMN: Visualization */}
        <div className="lg:col-span-5 flex flex-col">
            <div className="border-2 border-green-600 p-1 flex-grow bg-black relative min-h-[400px]">
                {/* Decorative Grid Background */}
                <div className="absolute inset-0 opacity-10" style={{ 
                    backgroundImage: 'linear-gradient(0deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #0f0 25%, #0f0 26%, transparent 27%, transparent 74%, #0f0 75%, #0f0 76%, transparent 77%, transparent)',
                    backgroundSize: '50px 50px'
                }}></div>

                {viewMode === 'DASHBOARD' ? (
                    <div className="relative h-full flex flex-col items-center justify-center p-8">
                        <div 
                            className="font-mono leading-none text-xs md:text-sm whitespace-pre text-center cursor-pointer hover:scale-105 transition-transform group"
                            onClick={() => setViewMode('MICROSCOPE')}
                        >
                            <div className="text-green-700 mb-4 opacity-50 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Eye size={16} /> CLICK TO VISUALIZE CORE
                            </div>
                            {/* Dynamic ASCII based on Temp */}
                            {Array(12).fill(0).map((_, i) => (
                                <div key={i} className="flex justify-center gap-1">
                                    {Array(8).fill(0).map((_, j) => {
                                        const isRod = j % 2 === 0;
                                        const rodDepth = (controlRodLevel / 100) * 12;
                                        const isActive = i >= rodDepth; 
                                        return (
                                            <span key={j} className={`${isRod ? (isActive ? 'text-green-300 animate-pulse' : 'text-green-900') : 'text-green-900'}`}>
                                                {isRod ? '██' : '::'}
                                            </span>
                                        )
                                    })}
                                </div>
                            ))}
                            {coreTemp > CRITICAL_TEMP && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 animate-ping pointer-events-none"></div>
                            )}
                        </div>
                    </div>
                ) : (
                    <FissionCanvas active={active} controlRodLevel={controlRodLevel} onClose={() => setViewMode('DASHBOARD')} />
                )}
            </div>
            
            {/* Terminal Output */}
            <div className="mt-4 h-32 border border-green-800 bg-black p-2 font-mono text-xs overflow-y-auto font-bold opacity-80">
                <div className="text-green-900 border-b border-green-900 mb-1">:: TERMINAL OUTPUT ::</div>
                {active && (
                    <>
                         <div className="flex gap-4"><span className="text-green-600">FLUX:</span><span className="text-green-400">{(reactivity * 1000).toFixed(0)} n/cm2/s</span></div>
                         <div className="flex gap-4"><span className="text-green-600">THERMAL:</span><span className="text-green-400">{displayThermalPower.toFixed(0)} MWt</span></div>
                         <div className="flex gap-4"><span className="text-green-600">RPM:</span><span className={displayElectricalPower > 800 ? 'text-amber-500' : 'text-green-400'}>{(displayElectricalPower * 1.5).toFixed(0)}</span></div>
                    </>
                )}
                <div className="text-green-800 mt-2">_</div>
            </div>
        </div>

        {/* RIGHT COLUMN: Gauges */}
        <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Temp Gauge */}
            <div className="border border-green-800 p-4 bg-black relative overflow-hidden group">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-green-700">CORE TEMP</span>
                    <Thermometer size={14} className="text-green-700"/>
                </div>
                <div className="text-4xl font-bold text-right mb-2 font-mono relative z-10">
                    <span className={coreTemp > CRITICAL_TEMP ? 'text-red-500 animate-pulse' : 'text-green-400'}>
                        {coreTemp.toFixed(0)}
                    </span>
                    <span className="text-sm text-green-800 ml-1">°C</span>
                </div>
                <div className="flex items-end h-12 gap-1 opacity-50">
                     {[...Array(10)].map((_, i) => (
                         <div key={i} className={`flex-1 transition-all duration-300 ${(coreTemp / MAX_TEMP) * 10 > i ? i > 7 ? 'bg-red-600' : 'bg-green-500' : 'bg-green-900/30'}`}></div>
                     ))}
                </div>
            </div>

            {/* Pressure Gauge */}
            <div className="border border-green-800 p-4 bg-black relative overflow-hidden">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-green-700">PRESSURE</span>
                    <Lock size={14} className="text-green-700"/>
                </div>
                <div className="text-4xl font-bold text-right mb-2 font-mono relative z-10">
                    <span className={pressure > 200 ? 'text-red-500 animate-pulse' : 'text-green-400'}>
                        {pressure.toFixed(1)}
                    </span>
                    <span className="text-sm text-green-800 ml-1">BAR</span>
                </div>
                 <div className="w-full h-4 border border-green-900 p-0.5">
                    <div className={`h-full transition-all duration-100 ${pressure > 200 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(pressure / FAILURE_PRESSURE) * 100}%` }}></div>
                 </div>
            </div>

             {/* Power Output */}
             <div className="border-2 border-green-600 p-4 bg-green-900/10 relative overflow-hidden flex-grow flex flex-col justify-center items-center text-center">
                 <span className="text-xs text-green-600 tracking-widest uppercase mb-2">Net Output</span>
                 <div className="text-5xl font-black text-amber-400 mb-2 font-mono drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    {displayElectricalPower.toFixed(0)}
                 </div>
                 <span className="text-sm text-amber-600 font-bold">MEGAWATTS</span>
                 <div className="absolute bottom-0 w-full h-1 bg-amber-900">
                     <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.min((displayElectricalPower/1200)*100, 100)}%` }}></div>
                 </div>
            </div>

        </div>

      </div>

      <style>{`
        .crt-flicker { animation: flicker 0.15s infinite; }
        @keyframes flicker { 0% { opacity: 0.95; } 50% { opacity: 1; } 100% { opacity: 0.98; } }
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }

        /* Custom styles for transparent slider thumb */
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: transparent !important;
          cursor: pointer;
          border: none;
          box-shadow: none;
        }

        .custom-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: transparent !important;
          cursor: pointer;
          border: none;
          box-shadow: none;
        }
        
        .custom-slider::-ms-thumb {
          width: 24px;
          height: 24px;
          background: transparent !important;
          cursor: pointer;
          border: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

// UI Helper
const CRTButton = ({ onClick, children, className = '', active = false, danger = false }) => (
    <button onClick={onClick} className={`relative uppercase font-bold tracking-widest px-6 py-3 border-2 transition-all active:translate-y-1 ${danger ? 'border-red-600 text-red-600' : 'border-green-800 text-green-700 hover:border-green-500 hover:text-green-500'} ${className}`}>{children}</button>
);

const RetroSlider = ({ value, onChange, label, min = 0, max = 100 }) => (
    <div className="mb-6 group">
        <div className="flex justify-between text-green-600 font-mono mb-1 uppercase text-xs">
            <span>{label}</span>
            <span>[{value.toFixed(1)}]</span>
        </div>
        <div className="relative h-8 bg-black border border-green-900">
            {/* Tick marks remain in the background */}
            <div className="absolute inset-0 flex justify-between items-center opacity-20 pointer-events-none px-2">
                {[...Array(20)].map((_, i) => <div key={i} className="h-4 w-px bg-green-500"></div>)}
            </div>

            {/* The visual bar showing the current value */}
            <div
                className="absolute top-0 left-0 h-full bg-green-700/50 transition-all duration-75"
                style={{ width: `${(value / max) * 100}%` }}
            >
            </div>

            {/* The interactive slider, now in the foreground */}
            <input
                type="range"
                min={min}
                max={max}
                step="0.5"
                value={value}
                onChange={onChange}
                className="custom-slider relative w-full h-full appearance-none bg-transparent cursor-pointer z-10"
            />
        </div>
    </div>
);

export default RetroReactor;