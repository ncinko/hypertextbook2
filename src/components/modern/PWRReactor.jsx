import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Minus, Square, X, Activity, Zap, Thermometer, Droplet, Wind, AlertTriangle, Settings, ChevronDown, ChevronUp, Play } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* PHYSICS ENGINE                               */
/* -------------------------------------------------------------------------- */

const NOMINAL_POWER_MWTH = 3411;
const NOMINAL_POWER_MWE = 1200;
const MAX_FLOW_RATE = 18000; // kg/s (approx for 1 loop or normalized total)

const INITIAL_STATE = {
  // Core Neutronics
  neutronFlux: 0.15, // Start at 15% power (Warm/Stable)
  thermalPower: 511, // 15% of 3411 MWth
  reactivity: 0,     // Critical
  controlRodPos: 50, // Withdrawn enough to be critical at this temp/boron
  boronConc: 1200,   // ppm

  // Primary Loop (RCS)
  T_fuel: 1000,       // Warmer to match lower heat transfer coeff at 15% power
  T_clad: 350,
  T_coolant_avg: 278, // Adjusted for higher coupling (closer to steam temp)
  T_hot: 300,         // Tighter leg spread
  T_cold: 280,
  pressure_primary: 155, 
  pumpSpeed: 100,    // Pumps running
  flowRate: 18000,   // Full flow

  // Secondary Loop (Steam)
  steamPressure: 60, 
  steamTemp: 275,    
  steamFlow: 200,      
  feedwaterFlow: 200,  
  sgLevel: 50,       

  // Turbine & Electric
  turbineValve: 15,  // Slightly open to maintain idle/house load
  turbineSpeed: 3600,// Synced speed
  gridLoad: 300,    
  genOutput: 180,    // House load approx
  frequency: 0,      

  // System
  tripped: false,
  alarm: null,
  time: 0,
};

// Physics Constants
const ALPHAS = {
  doppler: -1.5e-5,   // Reduced slightly to allow easier power escalation
  moderator: -2e-4,   // Reduced slightly to prevent hard crashes at high temp
  void: -1e-3,      
  boron: -1e-4,     
};

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS (WIN95)                           */
/* -------------------------------------------------------------------------- */

const Win95Window = ({ title, children, x, y, width, height, onClose, onMinimize, active, onFocus }) => {
  const [pos, setPos] = useState({ x, y });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    onFocus();
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging) {
        setPos({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    };
    const handleMouseUp = () => setDragging(false);

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: width,
        height: height,
        zIndex: active ? 100 : 10,
        backgroundColor: '#c0c0c0',
        boxShadow: 'inset 1px 1px #dfdfdf, 1px 1px #000000, 2px 2px gray',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        fontSize: '11px',
        border: '2px solid #dfdfdf',
        borderRightColor: '#404040',
        borderBottomColor: '#404040',
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          background: active ? 'linear-gradient(90deg, #000080, #1084d0)' : '#808080',
          color: 'white',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'default',
          fontWeight: 'bold',
          height: '24px',
        }}
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
        </div>
        <div className="flex gap-1">
          <button 
            className="win95-btn w-4 h-4 p-0 flex items-center justify-center leading-none"
            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          >_</button>
          <button 
            className="win95-btn w-4 h-4 p-0 flex items-center justify-center leading-none"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >X</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-auto text-black relative">
        {children}
      </div>
    </div>
  );
};

const BevelBox = ({ children, className = "", style = {} }) => (
  <div 
    className={`bg-white border-2 border-[#808080] border-r-white border-b-white ${className}`}
    style={{ boxShadow: 'inset 1px 1px #000, 1px 1px white', ...style }}
  >
    {children}
  </div>
);

const WinButton = ({ children, onClick, active = false, className = "", disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`win95-btn px-3 py-1 ${active ? 'active' : ''} ${className}`}
  >
    {children}
  </button>
);

const ProgressBar = ({ value, max = 100, color = "green", height = "16px" }) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const chunks = Math.floor(percent / 5); // 5% chunks
  
  return (
    <BevelBox className="w-full relative bg-black p-[2px]" style={{ height }}>
      <div className="flex h-full gap-[2px]">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i} 
            className={`flex-1 ${i < chunks ? (color === 'red' ? 'bg-[#ff0000]' : color === 'yellow' ? 'bg-[#ffff00]' : 'bg-[#00ff00]') : 'bg-[#003300]'}`}
          />
        ))}
      </div>
    </BevelBox>
  );
};

const LabeledValue = ({ label, value, unit }) => (
  <div className="flex justify-between items-center text-xs mb-1">
    <span>{label}</span>
    <span className="font-mono bg-black text-[#00ff00] px-2 py-0.5 border border-gray-600 w-24 text-right">
      {value} <span className="text-[#008800] text-[10px]">{unit}</span>
    </span>
  </div>
);

const VerticalSlider = ({ value, min, max, onChange, label, height = 150 }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-8 bg-[#808080] border border-white border-l-[#404040] border-t-[#404040]" style={{ height }}>
        {/* Track Line */}
        <div className="absolute left-1/2 top-2 bottom-2 w-[2px] bg-[#404040] -translate-x-1/2"></div>
        
        {/* Thumb */}
        <div 
          className="absolute left-0 w-full h-4 bg-[#c0c0c0] border-2 border-white border-r-black border-b-black cursor-ns-resize z-10"
          style={{ bottom: `calc(${percentage}% - 8px)` }}
          onMouseDown={(e) => {
            const startY = e.clientY;
            const startVal = value;
            const handleMove = (moveEvent) => {
              const deltaY = startY - moveEvent.clientY;
              const deltaVal = (deltaY / height) * (max - min);
              onChange(Math.min(max, Math.max(min, startVal + deltaVal)));
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        ></div>
      </div>
      <span className="text-xs text-center">{label}</span>
      <BevelBox className="px-1 bg-white text-xs w-12 text-center">
        {value.toFixed(1)}
      </BevelBox>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* APP COMPONENT                               */
/* -------------------------------------------------------------------------- */

const App = () => {
  const [sim, setSim] = useState(INITIAL_STATE);
  const [windows, setWindows] = useState({
    main: { isOpen: true, isMinimized: false, z: 1 },
    reactor: { isOpen: false, isMinimized: false, z: 0 },
    steam: { isOpen: false, isMinimized: false, z: 0 },
    turbine: { isOpen: false, isMinimized: false, z: 0 },
  });
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  const lastTimeRef = useRef(Date.now());

  // Helper to calculate reactivity components for display
  const getReactivityComponents = () => {
    const deltaT_fuel = sim.T_fuel - 300;
    const deltaT_mod = sim.T_coolant_avg - 290;
    
    return {
      rods: ((sim.controlRodPos / 100) * 0.055) * 100000,
      boron: ((sim.boronConc - 1200) * ALPHAS.boron) * 100000,
      doppler: (deltaT_fuel * ALPHAS.doppler) * 100000,
      moderator: (deltaT_mod * ALPHAS.moderator) * 100000,
      baseline: -2000 // -0.02 delta k/k
    };
  };

  const bringToFront = (key) => {
    setWindows(prev => {
      const maxZ = Math.max(...Object.values(prev).map(w => w.z));
      return {
        ...prev,
        [key]: { ...prev[key], isMinimized: false, z: maxZ + 1 }
      };
    });
  };

  const openWindow = (key) => {
    setWindows(prev => {
      const maxZ = Math.max(...Object.values(prev).map(w => w.z));
      return {
        ...prev,
        [key]: { ...prev[key], isOpen: true, isMinimized: false, z: maxZ + 1 }
      };
    });
    setStartMenuOpen(false);
  };

  const closeWindow = (key) => {
    setWindows(prev => ({
      ...prev,
      [key]: { ...prev[key], isOpen: false }
    }));
  };

  const minimizeWindow = (key) => {
    setWindows(prev => ({
      ...prev,
      [key]: { ...prev[key], isMinimized: true }
    }));
  };

  const handleTaskbarClick = (key) => {
    setWindows(prev => {
      const win = prev[key];
      const maxZ = Math.max(...Object.values(prev).map(w => w.z));
      const isActive = win.z === maxZ && !win.isMinimized;

      if (isActive) {
        // If active, minimize
        return {
          ...prev,
          [key]: { ...win, isMinimized: true }
        };
      } else {
        // If minimized or background, bring to front
        return {
          ...prev,
          [key]: { ...win, isMinimized: false, z: maxZ + 1 }
        };
      }
    });
  };

  const updateSim = useCallback((dt) => {
    setSim(prev => {
      // 1. Core Physics & Inputs
      const targetFlow = (prev.pumpSpeed / 100) * MAX_FLOW_RATE; // kg/s
      
      const deltaT_fuel = prev.T_fuel - 300;
      const deltaT_mod = prev.T_coolant_avg - 290;
      
      const rho_rods = (prev.controlRodPos / 100) * 0.055; // Increased worth slightly
      const rho_boron = (prev.boronConc - 1200) * ALPHAS.boron; 
      const rho_doppler = deltaT_fuel * ALPHAS.doppler;
      const rho_mod = deltaT_mod * ALPHAS.moderator;
      
      const rho_total = rho_rods + rho_boron + rho_doppler + rho_mod - 0.02;

      let nextFlux = prev.neutronFlux * Math.exp(rho_total * dt * 20); 
      if (rho_total < -0.1) nextFlux *= 0.9; 
      
      if (nextFlux < 1e-9) nextFlux = 1e-9;

      const thermalPower = nextFlux * NOMINAL_POWER_MWTH;

      // 2. Thermal Hydraulics - Variables declared before calculation
      const heatCapacityFuel = 5000; 
      const heatCapacityCoolant = 8000; 
      // Re-tuned Heat Transfer: Lower coeff means fuel gets hotter (Nominal ~980C, Melt ~2200C at ~9500MW)
      const heatTransferCoeff = 1 + (prev.flowRate / MAX_FLOW_RATE) * 8;
      
      // FIX: Make UA_SG flow dependent.
      // Base transfer (conduction/natural circ) + Flow driven component.
      // If pumps off, heat transfer drops significantly, preventing SG pressure spike from core heat alone.
      const baseUA = 20; 
      const maxUA = 180;
      const UA_SG = baseUA + (prev.flowRate / MAX_FLOW_RATE) * (maxUA - baseUA);

      const Cp_water = 0.005; 
      const flowLag = 0.95;

      // Calculations
      const energyToCoolant = heatTransferCoeff * (prev.T_fuel - prev.T_coolant_avg) * dt;
      const heatToSG = UA_SG * (prev.T_coolant_avg - prev.steamTemp) * dt;
      
      const nextT_fuel = Math.max(20, prev.T_fuel + (thermalPower - energyToCoolant) / heatCapacityFuel * dt);
      const nextFlow = prev.flowRate * flowLag + targetFlow * (1 - flowLag);
      
      // Calculate derived temperatures
      const nextT_coolant_avg = Math.max(20, prev.T_coolant_avg + (energyToCoolant - heatToSG) / heatCapacityCoolant * dt);
      
      // Defensively calc deltaT_legs to avoid division by zero if flow is very small
      const safeFlow = Math.max(nextFlow, 1);

      // FIX: Calculate leg delta based on Heat Transfer (Fuel->Water) rather than Core Power (Neutrons).
      // This applies the fuel's thermal inertia to the water loop, preventing instantaneous leg temp spikes
      // that cause the "cold leg drop" artifact.
      const currentHeatTransferMW = heatTransferCoeff * (prev.T_fuel - prev.T_coolant_avg);
      let deltaT_legs = currentHeatTransferMW / (safeFlow * Cp_water);
      
      // PHYSICS FIX: Clamp T_hot to never exceed T_fuel. 
      // At low flow, the simple Q = m*Cp*dT equation yields impossible dT values.
      // We limit the spread so T_hot stays bounded by the source temp (T_fuel).
      const maxPhysicalDelta = 2 * (nextT_fuel - nextT_coolant_avg);
      if (deltaT_legs > maxPhysicalDelta) {
         deltaT_legs = Math.max(0, maxPhysicalDelta);
      }
      
      // FIX: Ensure T_hot and T_cold are fully defined in this scope before return
      const T_hot = Math.max(20, nextT_coolant_avg + deltaT_legs / 2);
      const T_cold = Math.max(20, 40+ nextT_coolant_avg - deltaT_legs / 2);

      // 3. Steam Cycle
      const valveCoeff = 1.1; // Reduced to maintain pressure better against load
      const steamOut = prev.steamPressure * (prev.turbineValve / 100) * valveCoeff;
      
      const energyIn = heatToSG; 
      const energyOut = steamOut * 2.8; 
      
      const pressureChange = (energyIn - energyOut) * 0.005 * dt;
      const nextSteamPressure = Math.max(1, prev.steamPressure + pressureChange);
      const nextSteamTemp = 100 + nextSteamPressure * 2.5; 

      // 4. Turbine & Generator
      const turbineSpinup = 0.5 * dt;
      const targetSpeed = (prev.steamPressure / 60) * (prev.turbineValve / 100) * 3600; 
      const nextTurbineSpeed = prev.turbineSpeed + (targetSpeed - prev.turbineSpeed) * turbineSpinup;
      
      // Adjusted multiplier to reach ~1200MW with lower valveCoeff
      const genOutput = steamOut * 18 * (nextTurbineSpeed / 3600);

      // 5. Trip Logic
      const trip = prev.tripped || nextT_fuel > 2200 || nextSteamPressure > 85;

      return {
        ...prev,
        neutronFlux: trip ? 0 : nextFlux,
        thermalPower: trip ? 0 : thermalPower,
        controlRodPos: trip ? 0 : prev.controlRodPos,
        tripped: trip,
        T_fuel: nextT_fuel,
        T_coolant_avg: nextT_coolant_avg,
        T_hot: T_hot,
        T_cold: T_cold,
        flowRate: nextFlow,
        steamPressure: nextSteamPressure,
        steamTemp: nextSteamTemp,
        steamFlow: steamOut,
        turbineSpeed: nextTurbineSpeed,
        genOutput: genOutput,
        reactivity: rho_total,
        time: prev.time + dt,
        alarm: trip ? "REACTOR TRIP" : (nextT_fuel > 1800 ? "HIGH FUEL TEMP" : null)
      };
    });
  }, []);

  useEffect(() => {
    const loop = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      updateSim(Math.min(dt, 0.1));
      requestAnimationFrame(loop);
    };
    const frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [updateSim]);



  return (
    <div className="w-full h-screen bg-[#008080] overflow-hidden relative select-none font-[Tahoma]">
      <style>{`
        @keyframes flow {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .pipe-flow {
          stroke-dasharray: 8 4;
          animation: flow 1s linear infinite;
        }
        .pipe-static {
          stroke-dasharray: none;
        }

        @keyframes bubble {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0; }
        }
        .bubble {
          animation: bubble 1.5s infinite linear;
        }
        .bubble-delay-1 { animation-delay: 0.5s; }
        .bubble-delay-2 { animation-delay: 1.0s; }

        /* --- Win95 Button Styles --- */
        .win95-btn {
          appearance: none;
          -webkit-appearance: none;
          border-radius: 0;
          box-shadow: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background-color: #c0c0c0;
          border: 2px solid #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
          color: black;
          font-family: "MS Sans Serif", Tahoma, sans-serif;
          font-size: 11px;
          cursor: pointer;
          outline: none;
        }
        .win95-btn:active, .win95-btn.active {
          border: 2px solid #808080;
          border-right-color: #ffffff;
          border-bottom-color: #ffffff;
          transform: translateY(1px);
        }
        .win95-btn.active {
          background-color: #e0e0e0;
          font-weight: bold;
        }
        .win95-btn:disabled {
          color: #808080;
          cursor: not-allowed;
          transform: none;
          border: 2px solid #ffffff;
          border-right-color: #808080;
          border-bottom-color: #808080;
        }

        /* --- Win95 Menu Item Styles --- */
        .win95-menu-item {
          appearance: none;
          -webkit-appearance: none;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
          border-radius: 0;
          font-family: "MS Sans Serif", Tahoma, sans-serif;
          font-size: 11px;
          color: black;
          padding: 4px 8px;
          cursor: default;
          display: flex;
          align-items: center;
          gap: 8px;
          outline: none;
        }
        .win95-menu-item:hover {
          background-color: #000080;
          color: white;
        }
        .win95-menu-item:active, .win95-menu-item:focus {
          border: none;
          outline: none;
          box-shadow: none;
        }

        /* --- Win95 Range Slider Styles --- */
        .win95-range {
          -webkit-appearance: none !important;
          appearance: none !important;
          width: 100% !important;
          background: transparent !important;
          margin: 5px 0 !important;
          border: none !important;
          border-radius: 0 !important;
        }
        .win95-range:focus {
          outline: 1px dotted #000 !important;
        }

        /* Track - Webkit */
        .win95-range::-webkit-slider-runnable-track {
          width: 100% !important;
          height: 20px !important;
          cursor: pointer !important;
          background: #ffffff !important;
          border-top: 2px solid #808080 !important;
          border-left: 2px solid #808080 !important;
          border-right: 2px solid #ffffff !important;
          border-bottom: 2px solid #ffffff !important;
          box-shadow: inset 1px 1px 0px #000000, inset -1px -1px 0px #dfdfdf !important;
          border-radius: 0 !important;
        }

        /* Thumb - Webkit */
        .win95-range::-webkit-slider-thumb {
          height: 24px !important;
          width: 12px !important;
          border-top: 2px solid #ffffff !important;
          border-left: 2px solid #ffffff !important;
          border-right: 2px solid #000000 !important;
          border-bottom: 2px solid #000000 !important;
          background: #c0c0c0 !important;
          cursor: pointer !important;
          -webkit-appearance: none !important;
          margin-top: -4px !important;
          box-shadow: 1px 1px 0px #808080 !important;
          border-radius: 0 !important;
        }

        /* Track - Moz */
        .win95-range::-moz-range-track {
          width: 100% !important;
          height: 20px !important;
          cursor: pointer !important;
          background: #ffffff !important;
          border-top: 2px solid #808080 !important;
          border-left: 2px solid #808080 !important;
          border-right: 2px solid #ffffff !important;
          border-bottom: 2px solid #ffffff !important;
          box-shadow: inset 1px 1px 0px #000000, inset -1px -1px 0px #dfdfdf !important;
          border-radius: 0 !important;
        }

        /* Thumb - Moz */
        .win95-range::-moz-range-thumb {
          height: 24px !important;
          width: 12px !important;
          border-top: 2px solid #ffffff !important;
          border-left: 2px solid #ffffff !important;
          border-right: 2px solid #000000 !important;
          border-bottom: 2px solid #000000 !important;
          background: #c0c0c0 !important;
          cursor: pointer !important;
          box-shadow: 1px 1px 0px #808080 !important;
          border-radius: 0 !important;
        }
      `}</style>
      
      {/* ------------------ SYSTEM DIAGRAM (Interactive) ------------------ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 pointer-events-none scale-150">
      </div>

      {/* No Desktop Icons (Start Menu Only) */}

      {/* ------------------ WINDOWS ------------------ */}

      {/* --- MAIN CONTROL --- */}
      {windows.main.isOpen && !windows.main.isMinimized && (
        <Win95Window 
          title="Unit 1 Control - Overview" 
          x={50} y={30} width={800} height={600} 
          onClose={() => closeWindow('main')}
          onMinimize={() => minimizeWindow('main')}
          active={windows.main.z === Math.max(...Object.values(windows).map(w => w.z))}
          onFocus={() => bringToFront('main')}
        >
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left: Diagram */}
            <BevelBox className="col-span-12 h-80 bg-gray-200 relative p-4 flex items-center justify-center overflow-hidden">
               {/* Enhanced SVG P&ID */}
               <svg viewBox="0 0 500 300" className="w-full h-full">
                 
                 {/* Secondary Return Loop (Feedwater) */}
                 <path 
                    d="M 400 260 L 400 280 L 280 280 L 280 250" 
                    fill="none" 
                    stroke="#4682B4" 
                    strokeWidth="4" 
                    className={sim.steamPressure > 10 && sim.turbineValve > 0 ? "pipe-flow" : "pipe-static"}
                 />

                 {/* Primary Loop Pipes */}
                 <path 
                    d="M 120 150 L 240 150 L 240 220 L 120 220 Z" 
                    fill="none" 
                    stroke={sim.T_hot > 300 ? "red" : "maroon"} 
                    strokeWidth="12" 
                    className={sim.pumpSpeed > 5 ? "pipe-flow" : "pipe-static"}
                 />
                 
                 {/* Reactor Group */}
                 <g onClick={() => openWindow('reactor')} className="cursor-pointer hover:opacity-80 transition-opacity">
                    <rect x="80" y="120" width="60" height="130" rx="5" fill="#444" stroke="black" strokeWidth="2" />
                    {/* Visual Control Rods */}
                    <rect 
                        x="90" 
                        y={130 - (sim.controlRodPos / 100) * 40} 
                        width="40" 
                        height="40" 
                        fill="#ccc" 
                        stroke="black"
                        className="transition-all duration-300"
                    />
                    <text x="110" y="185" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">RX</text>
                 </g>
                 
                 {/* SG Group */}
                 <g onClick={() => openWindow('steam')} className="cursor-pointer hover:opacity-80 transition-opacity">
                    <rect x="240" y="110" width="60" height="140" rx="5" fill="#ccc" stroke="black" strokeWidth="2" />
                    <text x="270" y="180" textAnchor="middle" fill="black" fontSize="12" fontWeight="bold">SG</text>
                 </g>

                 {/* Steam Pipes (To Turbine) */}
                 <path 
                    d="M 270 110 L 270 80 L 400 80 L 400 110" 
                    fill="none" 
                    stroke="#aaa" 
                    strokeWidth="8" 
                    className={sim.steamPressure > 10 && sim.turbineValve > 0 ? "pipe-flow" : "pipe-static"}
                 />

                 {/* Turbine Exhaust Pipe (To Condenser) */}
                 <path 
                    d="M 400 140 L 400 220" 
                    fill="none" 
                    stroke="#aaa" 
                    strokeWidth="8"
                    className={sim.steamPressure > 10 && sim.turbineValve > 0 ? "pipe-flow" : "pipe-static"} 
                 />
                 
                 {/* Turbine Group */}
                 <g onClick={() => openWindow('turbine')} className="cursor-pointer hover:opacity-80 transition-opacity">
                    <path d="M 360 110 L 440 140 L 440 110 L 360 140 Z" fill="#666" stroke="black" strokeWidth="2" />
                    <text x="400" y="160" textAnchor="middle" fill="black" fontSize="12" fontWeight="bold">TURB</text>

                 </g>

                 {/* Condenser Box */}
                 <rect x="360" y="220" width="80" height="40" fill="#8899AA" stroke="black" />
                 <text x="400" y="245" textAnchor="middle" fill="white" fontSize="10">CONDENSER</text>

               </svg>

               <div className="absolute top-2 right-2 bg-black border border-gray-500 p-1 text-green-500 font-mono text-xs">
                 SYS: {sim.tripped ? "TRIPPED" : "NORMAL"}
               </div>
            </BevelBox>

            {/* Bottom: Controls & Telemetry */}
            <div className="col-span-8 grid grid-cols-2 gap-4">
              <fieldset className="border border-white p-2 h-full col-span-2">
                <legend className="px-1 text-xs">Unit Controls</legend>
                <div className="flex gap-4 justify-around items-end h-full pb-2">
                    
                    {/* Pump Control */}
                    <div className="flex flex-col items-center gap-1 w-1/3">
                        <span className="text-xs">Primary Pump</span>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={sim.pumpSpeed}
                            onChange={(e) => setSim(s => ({...s, pumpSpeed: parseFloat(e.target.value)}))}
                            className="w-full win95-range"
                        />
                        <div className="w-8 text-xs font-mono border bg-white text-center">{sim.pumpSpeed.toFixed(0)}%</div>
                    </div>

                    {/* Rod Control */}
                    <div className="flex flex-col items-center gap-1 w-1/3">
                        <span className="text-xs">Control Rods</span>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={sim.controlRodPos}
                            onChange={(e) => !sim.tripped && setSim(s => ({...s, controlRodPos: parseFloat(e.target.value)}))}
                            className="w-full win95-range"
                        />
                        <div className="w-8 text-xs font-mono border bg-white text-center">{sim.controlRodPos.toFixed(0)}%</div>
                    </div>

                    {/* Turbine Control */}
                    <div className="flex flex-col items-center gap-1 w-1/3">
                        <span className="text-xs">Turbine Valve</span>
                        <input 
                            type="range" 
                            min="0" max="100" 
                            value={sim.turbineValve}
                            onChange={(e) => setSim(s => ({...s, turbineValve: parseFloat(e.target.value)}))}
                            className="w-full win95-range"
                        />
                        <div className="w-8 text-xs font-mono border bg-white text-center">{sim.turbineValve.toFixed(0)}%</div>
                    </div>

                </div>
              </fieldset>
              
              <div className="col-span-2 flex gap-4">
                 <div className="flex-1">
                     <LabeledValue label="Loop Flow" value={sim.flowRate.toFixed(0)} unit="kg/s" />
                     <LabeledValue label="Hot Leg T" value={sim.T_hot.toFixed(1)} unit="°C" />
                     <LabeledValue label="Cold Leg T" value={sim.T_cold.toFixed(1)} unit="°C" />
                 </div>
                 <div className="flex-1">
                     <LabeledValue label="RX Power" value={sim.thermalPower.toFixed(0)} unit="MWth" />
                     <LabeledValue label="Gen Out" value={sim.genOutput.toFixed(0)} unit="MWe" />
                     <LabeledValue label="Stm Press" value={sim.steamPressure.toFixed(1)} unit="BAR" />
                 </div>
              </div>
            </div>

            <div className="col-span-4">
               <fieldset className="border border-white p-2 h-full">
                <legend className="px-1 text-xs">Annunciator Panel</legend>
                <div className="grid grid-cols-2 gap-1">
                  <div className={`p-1 text-center text-xs font-bold border border-gray-500 ${sim.tripped ? 'bg-red-600 text-white animate-pulse' : 'bg-[#404040] text-gray-600'}`}>RX TRIP</div>
                  <div className={`p-1 text-center text-xs font-bold border border-gray-500 ${sim.T_fuel > 1800 ? 'bg-yellow-600 text-black animate-pulse' : 'bg-[#404040] text-gray-600'}`}>HI FUEL T</div>
                  <div className={`p-1 text-center text-xs font-bold border border-gray-500 ${sim.steamPressure > 70 ? 'bg-yellow-600 text-black' : 'bg-[#404040] text-gray-600'}`}>HI PRESS</div>
                  <div className={`p-1 text-center text-xs font-bold border border-gray-500 ${sim.genOutput > 1250 ? 'bg-red-600 text-white' : 'bg-[#404040] text-gray-600'}`}>OVERLOAD</div>
                </div>
                
                <div className="mt-4 flex justify-center">
                  {sim.tripped ? (
                     <WinButton 
                       className="w-full font-bold text-black border-red-900"
                       onClick={() => setSim(INITIAL_STATE)}
                     >
                       SYSTEM RESET
                     </WinButton>
                  ) : (
                     <WinButton 
                       className="w-full font-bold text-red-800"
                       onClick={() => setSim(s => ({...s, tripped: true, controlRodPos: 0}))}
                     >
                       MANUAL SCRAM
                     </WinButton>
                  )}
                </div>
              </fieldset>
            </div>
          </div>
        </Win95Window>
      )}

      {/* --- REACTOR DETAILS --- */}
      {windows.reactor.isOpen && !windows.reactor.isMinimized && (
        <Win95Window 
          title="Reactor Core Control" 
          x={150} y={80} width={400} height={500}
          onClose={() => closeWindow('reactor')}
          onMinimize={() => minimizeWindow('reactor')}
          active={windows.reactor.z === Math.max(...Object.values(windows).map(w => w.z))}
          onFocus={() => bringToFront('reactor')}

        >
          <div className="flex gap-4 h-full">
            {/* Control Rods Slider */}
            <div className="w-24 flex flex-col items-center border-r border-gray-400 pr-2">
               <VerticalSlider 
                 label="Control Rods" 
                 min={0} max={100} 
                 value={sim.controlRodPos} 
                 onChange={(v) => !sim.tripped && setSim(s => ({...s, controlRodPos: v}))}
                 height={300}
               />
               <div className="mt-4 text-center">
                  <div className="text-[10px] text-gray-600">Net Reactivity</div>
                  <div className={`font-mono border px-1 ${sim.reactivity > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {(sim.reactivity * 100000).toFixed(0)} pcm
                  </div>
               </div>
            </div>

            {/* Core Data */}
            <div className="flex-1 flex flex-col gap-4">
               <fieldset className="border border-gray-400 p-2">
                 <legend className="text-xs px-1">Neutronics</legend>
                 <LabeledValue 
                   label="Thermal Power" 
                   value={sim.thermalPower < 1 ? sim.thermalPower.toExponential(2) : sim.thermalPower.toFixed(1)} 
                   unit="MWth" 
                 />
                 <div className="text-xs mb-1">Flux Level</div>
                 <ProgressBar value={sim.neutronFlux * 100} color={sim.neutronFlux > 1.05 ? 'red' : 'green'} />
               </fieldset>

               {/* Reactivity Monitor (NEW) */}
               <fieldset className="border border-gray-400 p-2 bg-gray-100">
                 <legend className="text-xs px-1 ">Reactivity Monitor (pcm)</legend>
                 {(() => {
                   const comps = getReactivityComponents();
                   return (
                     <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-mono">
                        <span className="text-gray-600">Rod Worth:</span>
                        <span className="text-right text-green-700">+{comps.rods.toFixed(0)}</span>
                        
                        <span className="text-gray-600">Boron (relative):</span>
                        <span className="text-right text-red-700">{comps.boron.toFixed(0)}</span>
                        
                        <span className="text-gray-600">Doppler:</span>
                        <span className="text-right text-blue-700">{comps.doppler.toFixed(0)}</span>
                        
                        <span className="text-gray-600">Moderator:</span>
                        <span className="text-right text-blue-700">{comps.moderator.toFixed(0)}</span>

                        <span className="text-gray-600">Core Design:</span>
                        <span className="text-right text-blue-700">{comps.baseline.toFixed(0)}</span>
                     </div>
                   );
                 })()}
               </fieldset>

               <fieldset className="border border-gray-400 p-2">
                 <legend className="text-xs px-1">Chemical Shim</legend>
                 <div className="flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                     <span className="text-xs">Boron Conc.</span>
                     <span className="font-mono bg-white border border-gray-600 px-1 text-sm">{sim.boronConc.toFixed(0)} ppm</span>
                   </div>
                   <div className="flex gap-1 justify-center">
                      <WinButton 
                        className="text-xs flex-1"
                        onClick={() => setSim(s => ({...s, boronConc: Math.max(0, s.boronConc - 10)}))}
                      >Dilute</WinButton>
                      <WinButton 
                        className="text-xs flex-1"
                        onClick={() => setSim(s => ({...s, boronConc: s.boronConc + 10}))}
                      >Borate</WinButton>
                   </div>
                 </div>
               </fieldset>

               <fieldset className="border border-gray-400 p-2">
                 <legend className="text-xs px-1">Core Thermodynamics</legend>
                 <LabeledValue label="Avg Fuel Temp" value={sim.T_fuel.toFixed(0)} unit="°C" />
                 <LabeledValue label="Outlet Temp" value={sim.T_hot.toFixed(1)} unit="°C" />
                 

               </fieldset>
            </div>
          </div>
        </Win95Window>
      )}

      {/* --- TURBINE DETAILS --- */}
      {windows.turbine.isOpen && !windows.turbine.isMinimized && (
        <Win95Window 
          title="Turbine & Generator" 
          x={400} y={150} width={400} height={350}
          onClose={() => closeWindow('turbine')}
          onMinimize={() => minimizeWindow('turbine')}
          active={windows.turbine.z === Math.max(...Object.values(windows).map(w => w.z))}
          onFocus={() => bringToFront('turbine')}

        >
          <div className="flex gap-4 h-full">
            <div className="w-24 flex flex-col items-center border-r border-gray-400 pr-2">
               <VerticalSlider 
                 label="Gov Valve" 
                 min={0} max={100} 
                 value={sim.turbineValve} 
                 onChange={(v) => setSim(s => ({...s, turbineValve: v}))}
                 height={200}
               />
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
              <fieldset className="border border-gray-400 p-2 bg-gray-100">
                <legend className="text-xs px-1">Generator Output</legend>
                <div className="flex items-end gap-1 mb-2">
                   <span className="font-mono text-3xl font-bold text-blue-800 leading-none">
                     {sim.genOutput.toFixed(0)}
                   </span>
                   <span className="text-sm font-bold text-gray-600 mb-1">MWe</span>
                </div>
                <ProgressBar value={sim.genOutput / 15} max={100} color="green" height="24px" />
                <div className="mt-2 flex justify-between text-xs">
                   <span>Grid Load: {sim.gridLoad} MW</span>
                   <span className={sim.genOutput < sim.gridLoad ? "text-red-600" : "text-green-600"}>
                     {sim.genOutput < sim.gridLoad ? "IMPORTING" : "EXPORTING"}
                   </span>
                </div>
              </fieldset>

              <fieldset className="border border-gray-400 p-2">
                <legend className="text-xs px-1">Turbine Stats</legend>
                <LabeledValue label="Speed" value={sim.turbineSpeed.toFixed(0)} unit="RPM" />
                <LabeledValue label="Frequency" value={(sim.turbineSpeed / 60).toFixed(2)} unit="Hz" />
                <LabeledValue label="Vibration" value={(sim.turbineSpeed / 4000).toFixed(2)} unit="mils" />
              </fieldset>
            </div>
          </div>
        </Win95Window>
      )}

      {/* --- STEAM GENERATOR DETAILS --- */}
      {windows.steam.isOpen && !windows.steam.isMinimized && (
        <Win95Window 
          title="Steam Generators (SG)" 
          x={300} y={100} width={500} height={300}
          onClose={() => closeWindow('steam')}
          onMinimize={() => minimizeWindow('steam')}
          active={windows.steam.z === Math.max(...Object.values(windows).map(w => w.z))}
          onFocus={() => bringToFront('steam')}

        >
          <div className="flex gap-4 h-full">
             {/* Left: Animated SG Diagram */}
             <div className="w-[220px] h-full bg-gray-200 border-2 border-gray-600 border-r-white border-b-white relative overflow-hidden">
                <svg viewBox="0 0 200 250" className="w-full h-full">
                  {/* SG Shell */}
                  <rect x="50" y="20" width="100" height="220" rx="20" fill="#e0e0e0" stroke="black" strokeWidth="2" />
                  
                  {/* Water Level (Secondary) */}
                  <defs>
                    <clipPath id="sgShellClip">
                       <rect x="50" y="20" width="100" height="220" rx="20" />
                    </clipPath>
                  </defs>
                  <rect 
                    x="50" 
                    y={240 - (sim.sgLevel/100)*180} 
                    width="100" 
                    height={(sim.sgLevel/100)*180} 
                    fill="#87CEEB" 
                    clipPath="url(#sgShellClip)" 
                    opacity="0.6" 
                  />
                  
                  {/* Boiling Animation (Bubbles) */}
                  {sim.thermalPower > 10 && (
                     <g>
                        <circle cx="80" cy="150" r="3" fill="white" className="bubble bubble-delay-1" />
                        <circle cx="120" cy="120" r="4" fill="white" className="bubble bubble-delay-2" />
                        <circle cx="100" cy="180" r="2" fill="white" className="bubble" />
                        <circle cx="90" cy="130" r="2" fill="white" className="bubble bubble-delay-2" />
                     </g>
                  )}

                  {/* Primary U-Tubes (Inverted U) */}
                  <path d="M 80 240 L 80 100 A 20 20 0 0 1 120 100 L 120 240" fill="none" stroke="maroon" strokeWidth="12" />
                  
                  {/* Flow Animation inside tubes */}
                  <path 
                    d="M 80 240 L 80 100 A 20 20 0 0 1 120 100 L 120 240" 
                    fill="none" 
                    stroke="#ff4444" 
                    strokeWidth="4" 
                    className={sim.pumpSpeed > 5 ? "pipe-flow" : ""} 
                  />

                  {/* Labels */}
                  <text x="70" y="248" fontSize="10" fontWeight="bold">Hot</text>
                  <text x="110" y="248" fontSize="10" fontWeight="bold">Cold</text>
                  
                  {/* Steam Outlet */}
                  <path d="M 100 20 L 100 0" stroke="gray" strokeWidth="8" />
                </svg>
             </div>

             {/* Right: Data Controls */}
             <div className="flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                   <BevelBox className="p-1 flex flex-col items-center justify-center bg-black h-16">
                      <span className="text-green-500 font-mono text-xl">{sim.steamPressure.toFixed(1)}</span>
                      <span className="text-green-700 text-[10px]">BAR</span>
                   </BevelBox>
                   <BevelBox className="p-1 flex flex-col items-center justify-center bg-black h-16">
                      <span className="text-green-500 font-mono text-xl">{sim.steamTemp.toFixed(1)}</span>
                      <span className="text-green-700 text-[10px]">°C</span>
                   </BevelBox>
                </div>

                <fieldset className="border border-gray-400 p-2 flex-1">
                  <legend className="text-xs px-1">Feedwater</legend>
                  <div className="h-full flex flex-col justify-around">
                      <LabeledValue label="Flow" value={sim.steamFlow.toFixed(1)} unit="kg/s" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs">SG Level</span>
                        <ProgressBar value={sim.sgLevel} color="blue" />
                      </div>
                  </div>
                </fieldset>
             </div>
          </div>
        </Win95Window>
      )}
      
      {/* Taskbar */}
      <div className="absolute bottom-0 w-full h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center px-1 gap-1 z-[200] shadow-md select-none">
         <div className="relative">
            <WinButton 
              className="flex items-center gap-1 font-bold italic pr-4 pl-2 py-0.5"
              active={startMenuOpen}
              onClick={() => setStartMenuOpen(!startMenuOpen)}
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Windows_logo_and_wordmark_-_1995-2001.svg/512px-Windows_logo_and_wordmark_-_1995-2001.svg.png" className="h-4 w-auto opacity-80" alt="" />
              Start
            </WinButton>
            {startMenuOpen && (
              <div className="absolute bottom-8 left-0 w-48 bg-[#c0c0c0] border-2 border-white border-r-gray-800 border-b-gray-800 shadow-xl flex flex-col p-1 z-[201]">
                 <div className="bg-blue-900 text-white font-bold p-1 pl-8 mb-1 vertical-text relative">
                    <span className="text-lg">Windows 95</span>
                 </div>
                 <button onClick={() => openWindow('main')} className="win95-menu-item">
                    <Activity size={16} /> Unit 1 Overview
                 </button>
                 <button onClick={() => openWindow('reactor')} className="win95-menu-item">
                    <Zap size={16} /> Reactor Core
                 </button>
                 <button onClick={() => openWindow('steam')} className="win95-menu-item">
                    <Droplet size={16} /> Steam Gen
                 </button>
                 <button onClick={() => openWindow('turbine')} className="win95-menu-item">
                    <Wind size={16} /> Turbine
                 </button>
                 <div className="h-[1px] bg-gray-500 my-1"></div>
                 <button onClick={() => setStartMenuOpen(false)} className="win95-menu-item">
                    Shut Down...
                 </button>
              </div>
            )}
         </div>
         
         <div className="w-[2px] h-6 border-l border-gray-400 border-r border-white mx-1"></div>
         
         {Object.entries(windows).map(([key, win]) => (
            win.isOpen && (
              <WinButton 
                key={key} 
                active={win.z === Math.max(...Object.values(windows).map(w => w.z)) && !win.isMinimized}
                onClick={() => handleTaskbarClick(key)}
                className="w-32 text-left truncate text-xs py-1"
              >
                {key === 'main' ? 'Unit 1 Control' : key === 'reactor' ? 'Reactor Core' : key === 'steam' ? 'Steam Gen' : 'Turbine'}
              </WinButton>
            )
         ))}
         
         <div className="flex-1"></div>
         <BevelBox className="px-2 py-1 bg-gray-200 text-xs flex gap-2 w-24 justify-center">
            <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
         </BevelBox>
      </div>

    </div>
  );
};

export default App;