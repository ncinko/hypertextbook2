import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  Zap,
  Thermometer,
  Activity,
  Minimize,
  Maximize,
  X,
  AlertTriangle,
  Atom,
  Droplets,
  Wind
} from 'lucide-react';

// This component is a rewritten version of the original PWR reactor simulation.
// The physics model has been updated to use a more physically accurate point kinetics
// formulation (with a single delayed neutron group) for the neutron population and
// reactivity. The previous neutron animation has been removed and replaced with
// a static core visual. Reactivity coefficients have been tuned based on
// approximate values from reactor physics literature. See sources in the
// accompanying analysis for justification.

// --- Reusable Windows 95 Components ---

const Win95Panel = ({ title, children, className = '', onClose }) => (
  <div
    className={`bg-[#c0c0c0] p-[2px] shadow-[1px_1px_0px_1px_#000000,inset_1px_1px_0px_1px_#ffffff] flex flex-col ${className}`}
  >
    <div className="bg-[#000080] text-white px-2 py-0.5 flex justify-between items-center mb-1 select-none shrink-0">
      <span className="font-bold text-sm tracking-wide flex items-center gap-2">{title}</span>
      <div className="flex gap-[2px]">
        <button
          onClick={onClose}
          className="bg-[#c0c0c0] w-4 h-4 text-black border-b border-r border-black border-t border-l border-white flex items-center justify-center active:border-t-black active:border-l-black active:border-b-white active:border-r-white ml-1 disabled:opacity-50"
          disabled={!onClose}
        >
          <X size={10} strokeWidth={3} />
        </button>
      </div>
    </div>
    <div className="flex-1 p-2 flex flex-col min-h-0">{children}</div>
  </div>
);

const Win95Button = ({ onClick, disabled, children, className = '', active = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      !bg-[#c0c0c0] !px-4 !py-1 !text-black !font-bold !text-sm !outline-none !rounded-none !shadow-none !no-underline
      !border-t-2 !border-l-2 !border-b-2 !border-r-2 !border-solid
      hover:!bg-[#c0c0c0] hover:!text-black
      ${active
        ? '!border-t-black !border-l-black !border-b-white !border-r-white'
        : '!border-t-white !border-l-white !border-b-black !border-r-black active:!border-t-black active:!border-l-black active:!border-b-white active:!border-r-white'}
      disabled:!text-gray-500 disabled:!cursor-not-allowed disabled:active:!border-t-white disabled:active:!border-l-white
      ${className}
    `}
  >
    {children}
  </button>
);

const Win95Inset = ({ children, className = '' }) => (
  <div className={`bg-white border-2 border-gray-500 border-t-black border-l-black border-r-white border-b-white ${className}`}>{children}</div>
);

// Memoized Helper Components
const VerticalGauge = memo(({ label, value, max, unit, color = '#000080', warningThreshold }) => {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const isWarning = warningThreshold && value > warningThreshold;

  return (
    <div className="flex flex-col items-center w-16 mx-1">
      <div className="text-xs text-black mb-1">{label}</div>
      <div className="h-40 w-6 bg-white border-2 border-gray-500 border-t-black border-l-black border-r-white border-b-white relative">
        {/* Warning Indicator Background */}
        {isWarning && <div className="absolute inset-0 bg-red-200 animate-pulse opacity-50"></div>}
        {/* Fill */}
        <div
          className="absolute bottom-0 left-0 right-0 w-full"
          style={{ height: `${percent}%`, backgroundColor: isWarning ? '#ff0000' : color }}
        />
        {/* Tick marks overlay */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-full border-t border-black h-[10%]"></div>
          ))}
        </div>
      </div>
      <div className="text-xs font-bold mt-1 text-black bg-white px-1 border border-gray-400 min-w-[3rem] text-center">
        {value.toFixed(0)}{unit}
      </div>
    </div>
  );
});

const ControlSlider = memo(({ label, value, onChange, disabled, min = 0, max = 100, unit = '%' }) => {
  const handleChange = useCallback(
    (e) => {
      onChange(Number(e.target.value));
    },
    [onChange]
  );

  return (
    <div className="!mb-4">
      <div className="!flex !justify-between !mb-1">
        <label className="!text-sm !text-black !font-bold">{label}</label>
        <span className="!text-sm !font-mono !bg-white !border !border-gray-500 !px-1 !min-w-[3rem] !text-right !text-black">
          {value.toFixed(0)}{unit}
        </span>
      </div>
      <div className="!relative !h-8 !flex !items-center">
        {/* Track Line */}
        <div className="!absolute !left-0 !right-0 !h-2 !border-t !border-l !border-gray-500 !border-b !border-r !border-white !bg-white"></div>
        {/* Tick Marks */}
        <div className="!absolute !top-6 !left-0 !right-0 !flex !justify-between !px-1">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="!w-[1px] !h-2 !bg-black"></div>
          ))}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="!w-full !h-8 !appearance-none !bg-transparent !bg-none !relative !z-10 !cursor-pointer !rounded-none !shadow-none !border-none !outline-none !p-0 !m-0
            [&::-webkit-slider-runnable-track]:!bg-transparent [&::-webkit-slider-runnable-track]:!border-none [&::-webkit-slider-runnable-track]:!shadow-none
            [&::-moz-range-track]:!bg-transparent [&::-moz-range-track]:!border-none [&::-moz-range-track]:!shadow-none
            [&::-webkit-slider-thumb]:!appearance-none
            [&::-webkit-slider-thumb]:!w-4
            [&::-webkit-slider-thumb]:!h-6
            [&::-webkit-slider-thumb]:!bg-[#c0c0c0]
            [&::-webkit-slider-thumb]:!border-t-2 [&::-webkit-slider-thumb]:!border-l-2 [&::-webkit-slider-thumb]:!border-white
            [&::-webkit-slider-thumb]:!border-b-2 [&::-webkit-slider-thumb]:!border-r-2 [&::-webkit-slider-thumb]:!border-black
            [&::-webkit-slider-thumb]:!-mt-1
            [&::-webkit-slider-thumb]:!rounded-none
            active:[&::-webkit-slider-thumb]:!border-t-black active:[&::-webkit-slider-thumb]:!border-l-black active:[&::-webkit-slider-thumb]:!border-b-white active:[&::-webkit-slider-thumb]:!border-r-white
            [&::-moz-range-thumb]:!appearance-none
            [&::-moz-range-thumb]:!w-4
            [&::-moz-range-thumb]:!h-6
            [&::-moz-range-thumb]:!bg-[#c0c0c0]
            [&::-moz-range-thumb]:!border-t-2 [&::-moz-range-thumb]:!border-l-2 [&::-moz-range-thumb]:!border-white
            [&::-moz-range-thumb]:!border-b-2 [&::-moz-range-thumb]:!border-r-2 [&::-moz-range-thumb]:!border-black
            [&::-moz-range-thumb]:!rounded-none
            active:[&::-moz-range-thumb]:!border-t-black active:[&::-moz-range-thumb]:!border-l-black active:[&::-moz-range-thumb]:!border-b-white active:[&::-moz-range-thumb]:!border-r-white"
        />
      </div>
    </div>
  );
});

// --- SUB-VIEWS ---

// 2. Flux Monitor (Graph + Readout)
// The flux monitor is unchanged, still showing counts per second derived from the
// normalized neutron population (flux) value.
const FluxMonitor = ({ flux, isCritical }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [history, setHistory] = useState(new Array(40).fill(0));

  const fluxRef = useRef(flux);
  const isCriticalRef = useRef(isCritical);

  useEffect(() => {
    fluxRef.current = flux;
    isCriticalRef.current = isCritical;
  }, [flux, isCritical]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentFlux = fluxRef.current;
      // Baseline counts from background and flux
      const sourceCounts = 15 + Math.random() * 10;
      const powerCounts = currentFlux * 500000 + (Math.random() * (currentFlux > 0 ? 500 : 0));
      const totalCPS = Math.floor(sourceCounts + powerCounts);
      setDisplayValue(totalCPS);
      setHistory((prev) => [...prev.slice(1), totalCPS]);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const maxVal = Math.max(100, ...history);
  const points = history
    .map((val, i) => {
      const x = (i / (history.length - 1)) * 100;
      const y = 100 - ((val / maxVal) * 90);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <div key={`v-${i}`} className="border-r border-green-900/50 h-full w-full"></div>
        ))}
        {[...Array(4)].map((_, i) => (
          <div key={`h-${i}`} className="border-b border-green-900/50 w-full h-full absolute top-0" style={{ top: `${i * 25}%` }}></div>
        ))}
      </div>
      <svg className="w-full h-full relative z-10" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#00ff00"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute bottom-1 right-1 text-green-400 text-[10px] font-mono bg-black/50 px-1 border border-green-900">
        {displayValue} CPS
      </div>
    </div>
  );
};

// 3. Core Internals View
// This view now shows a static cross-section of the core without neutron animations.
const CoreInternalsView = ({ state, onClose, onRodChange, onBoronChange }) => {
  // Recalculate reactivity locally for visualization - synchronized with engine
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const rodWithdrawFrac = clamp((100 - state.controlRodPosition) / 100, 0, 1);
  const rhoRodsPcm = rodWithdrawFrac * 2500;
  const boronEff = state._boronEff ?? state.boronConcentration;
  const rhoBoronPcm = -(boronEff - 1500) * 1.5;
  const rhoTempPcm = -(state.coreTemp - 300) * 4.0;
  const saturationTemp = 100 + state.pressure * 1.6;
  const subcoolMargin = saturationTemp - state.coolantTempHot;
  const boilOvershoot = Math.max(0, 10 - subcoolMargin);
  const rhoVoidPcm = -boilOvershoot * 120;
  const rhoOffsetPcm = -350;
  let rhoPcm = rhoRodsPcm + rhoBoronPcm + rhoTempPcm + rhoVoidPcm + rhoOffsetPcm;
  if (state.isScrammed) rhoPcm = -5000;
  rhoPcm = clamp(rhoPcm, -8000, 2500);
  const reactivity = rhoPcm / 10000;
  const tempWorth = rhoTempPcm / 10000;
  const boronWorth = rhoBoronPcm / 10000;
  const isCritical = state.flux > 0.0001;
  const fuelColor = `rgb(${100 + (state.coreTemp / 10) * 4}, ${100 - state.coreTemp / 10}, ${100 - state.coreTemp / 10})`;
  const moderatorColor = `rgba(0, ${Math.max(100, 255 - state.coreTemp / 3)}, 255, 0.4)`;
  // Interleaved generation of 5 fuel and 4 rods
  const internals = [];
  for (let i = 0; i < 9; i++) {
    const isFuel = i % 2 === 0;
    if (isFuel) {
      internals.push(
        <div
          key={`f-${i}`}
          className="w-6 h-[90%] border-x border-black transition-colors duration-500 relative"
          style={{ backgroundColor: fuelColor }}
        >
          <div className="absolute inset-0 flex flex-col justify-between opacity-20 pointer-events-none">
            {[...Array(20)].map((_, j) => (
              <div key={j} className="h-px bg-black w-full"></div>
            ))}
          </div>
        </div>
      );
    } else {
      internals.push(
        <div key={`r-${i}`} className="w-4 h-[90%] relative bg-black/20 border-x border-white/20">
          <div
            className="absolute top-0 left-0 right-0 bg-[#808080] border-2 border-white border-b-black border-r-black transition-all duration-300"
            style={{ height: `${state.controlRodPosition}%` }}
          >
            <div className="absolute bottom-2 left-1 right-1 h-1 bg-black/20 rounded-full"></div>
          </div>
        </div>
      );
    }
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Win95Panel title="Core Physics Simulation - Assembly A1 [LIVE]" className="w-[700px] h-[500px]" onClose={onClose}>
        <div className="flex gap-4 h-full">
          {/* Main Visualizer */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <Win95Inset className="flex-1 relative overflow-hidden bg-slate-900">
              <div className="absolute inset-0 transition-colors duration-1000" style={{ backgroundColor: moderatorColor }}></div>
              <div className="absolute inset-0 flex justify-center items-end p-8 gap-2">{internals}</div>
              {/* Legend / Info */}
              <div className="absolute top-2 left-2 text-white font-mono text-xs drop-shadow-md z-30">
                VIEW: CROSS-SECTION<br />
                MODERATOR: H2O + BORON<br />
              </div>
            </Win95Inset>
            <div className="text-center text-xs font-bold bg-[#c0c0c0] border border-white p-1 shadow-[inset_1px_1px_0px_0px_#ffffff] shrink-0">
              FEED FROM CORE 04
            </div>
          </div>
          <div className="w-40 flex flex-col gap-2 min-h-0">
            <fieldset className="border border-white border-l-gray-500 border-t-gray-500 p-2 shrink-0">
              <legend className="text-xs ml-1 px-1">Flux Monitor</legend>
              <Win95Inset className="h-32 bg-black relative flex items-end overflow-hidden">
                <FluxMonitor reactivity={reactivity} flux={state.flux} isCritical={isCritical} />
              </Win95Inset>
            </fieldset>
            <fieldset className="border border-white border-l-gray-500 border-t-gray-500 p-2 flex-1 min-h-0 overflow-y-auto">
              <legend className="text-xs ml-1 px-1">Physics Data</legend>
              <div className="text-xs font-mono flex flex-col gap-2 mt-1">
                <div className="flex justify-between">
                  <span>Reactivity:</span>
                  <span className={reactivity > 0 ? 'text-red-600 font-bold' : reactivity < -0.001 ? 'text-blue-600' : 'text-gray-600'}>
                    {reactivity.toFixed(5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Doppler:</span>
                  <span className="text-blue-800">{tempWorth.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Boron:</span>
                  <span className="text-yellow-700">{boronWorth.toFixed(5)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-400">
                  <ControlSlider
                    label="Rod Height"
                    value={state.controlRodPosition}
                    onChange={onRodChange}
                    disabled={state.isScrammed}
                  />
                  <ControlSlider
                    label="Boron"
                    value={state.boronConcentration}
                    min={0}
                    max={2000}
                    unit=" ppm"
                    onChange={onBoronChange}
                  />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </Win95Panel>
    </div>
  );
};

// 4. Steam Generator View (unchanged from original)
const SteamGeneratorView = ({ state, onClose, onPrimaryPumpChange }) => {
  const primaryFlow = state.primaryPumpSpeed / 100;
  const secondaryFlow = state.secondaryPumpSpeed / 100;
  const heatTransfer = (state.coolantTempHot - 100) * primaryFlow;
  const bubbleSpeed = Math.max(0.5, heatTransfer / 100);
  const bubbles = useMemo(
    () =>
      [...Array(25)].map((_, i) => ({
        id: i,
        left: Math.random() * 80 + 10,
        delay: Math.random() * 2,
        size: Math.random() * 10 + 5,
        duration: Math.random() * 2 + 1.5,
      })),
    []
  );
  const tubeConfig = [
    { x: 40, yControl: 270 },
    { x: 52, yControl: 258 },
    { x: 64, yControl: 246 },
    { x: 76, yControl: 234 },
    { x: 88, yControl: 222 },
  ];
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Win95Panel title="Steam Generator Internal Physics [LIVE]" className="w-[600px] h-[500px]" onClose={onClose}>
        <div className="flex gap-4 h-full">
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <Win95Inset className="flex-1 relative overflow-hidden bg-slate-800">
              <div
                className="absolute bottom-0 left-0 right-0 bg-[#00ffff] opacity-30 transition-all duration-1000 border-t border-[#00ffff]"
                style={{ height: '70%' }}
              >
                {secondaryFlow > 0 && (
                  <div className="absolute right-0 bottom-10 flex gap-2 animate-pulse">
                    <span className="text-white text-xs font-bold">← FEED</span>
                  </div>
                )}
                {heatTransfer > 10 &&
                  bubbles.map((b) => (
                    <div
                      key={b.id}
                      className="absolute rounded-full bg-white opacity-40 animate-float-up"
                      style={{
                        left: `${b.left}%`,
                        width: `${b.size}px`,
                        height: `${b.size}px`,
                        animationDuration: `${b.duration / Math.max(0.2, bubbleSpeed)}s`,
                        animationDelay: `${b.delay}s`,
                      }}
                    />
                  ))}
              </div>
              <div className="absolute inset-0 flex justify-center items-end pb-10">
                <svg width="100%" height="100%" viewBox="0 0 200 300">
                  {tubeConfig.map((t, i) => (
                    <g key={i}>
                      <path
                        d={`M ${t.x} 0 L ${t.x} 200 C ${t.x} ${t.yControl}, ${200 - t.x} ${t.yControl}, ${200 - t.x} 200 L ${200 - t.x} 0`}
                        fill="none"
                        stroke={`rgb(${state.coolantTempHot}, 50, 50)`}
                        strokeWidth="8"
                        className="transition-colors duration-500"
                      />
                      {primaryFlow > 0 && (
                        <path
                          d={`M ${t.x} 0 L ${t.x} 200 C ${t.x} ${t.yControl}, ${200 - t.x} ${t.yControl}, ${200 - t.x} 200 L ${200 - t.x} 0`}
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeDasharray="5 5"
                          strokeOpacity="0.6"
                          className="animate-flow"
                          style={{ animationDuration: `${200 / Math.max(1, state.primaryPumpSpeed)}s` }}
                        />
                      )}
                    </g>
                  ))}
                </svg>
              </div>
              {state.steamPressure > 1 && (
                <>
                  <div className="absolute top-10 right-0 h-20 bg-gray/10 blur-xl animate-pulse"></div>
                  <div className="absolute top-2 right-0 translate-x-10 flex flex-col  gap-1 opacity-60 animate-bounce">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-black"></div>
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-black"></div>
                    <span className="text-gray -translate-x-3 text-[10px] font-bold">STEAM OUT</span>
                  </div>
                </>
              )}
              <div className="absolute bottom-2 left-2 text-gray font-mono text-xs drop-shadow-md">
                PRIMARY IN: {state.coolantTempHot.toFixed(1)}°C
                <br />PRIMARY OUT: {state.coolantTempCold.toFixed(1)}°C
              </div>
            </Win95Inset>
            <div className="text-center text-xs font-bold bg-[#c0c0c0] border border-white p-1 shrink-0">S/G LEVEL MONITOR</div>
          </div>
          <div className="w-40 flex flex-col gap-2 min-h-0">
            <fieldset className="border border-white border-l-gray-500 border-t-gray-500 p-2 flex-1 shrink-0">
              <legend className="text-xs ml-1 px-1">Exchange Data</legend>
              <div className="text-xs font-mono flex flex-col gap-2 mt-1">
                <div className="flex justify-between">
                  <span>Delta T:</span>
                  <span className="text-blue-800">{(state.coolantTempHot - state.coolantTempCold).toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span>Press:</span>
                  <span className="text-black font-bold">{state.steamPressure.toFixed(1)} bar</span>
                </div>
                <div className="mt-4 border-t border-gray-400 pt-2">
                  <div className="mb-1 text-[10px] text-gray-600">Feed Flow Rate</div>
                  <Win95Inset className="h-4 bg-gray-200">
                    <div className="h-full bg-blue-400" style={{ width: `${state.secondaryPumpSpeed}%` }}></div>
                  </Win95Inset>
                </div>
                <div className="mt-2">
                  <div className="mb-1 text-[10px] text-gray-600">Steam Flow</div>
                  <Win95Inset className="h-4 bg-gray-200">
                    <div className="h-full bg-gray-400" style={{ width: `${state.turbineValve}%` }}></div>
                  </Win95Inset>
                </div>
                {/* NEW PRIMARY PUMP CONTROL */}
                <div className="mt-4 pt-2 border-t border-gray-400">
                  <ControlSlider label="Pri. Pump" value={state.primaryPumpSpeed} onChange={onPrimaryPumpChange} />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </Win95Panel>
    </div>
  );
};

// 5. Turbine Physics View (unchanged)
const TurbinePhysicsView = ({ state, onClose, onTurbineValveChange }) => {
  const isSpinning = state.turbineRPM > 10;
  const steamFlow = state.turbineValve > 0;
  // Simulated grid freq based on RPM (3000 RPM = 50Hz)
  const frequency = state.turbineRPM > 0 ? (state.turbineRPM / 60).toFixed(2) : '0.00';
  const vibration = state.turbineRPM > 0 ? (Math.random() * 0.5 + state.turbineRPM / 3000).toFixed(2) : '0.00';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Win95Panel title="Turbine Generator Monitoring [LIVE]" className="w-[600px] h-[500px]" onClose={onClose}>
        <div className="flex gap-4 h-full">
          {/* Turbine Graphic */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <Win95Inset className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
              {/* Background Grid for industrial feel */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(#004000 1px, transparent 1px), linear-gradient(90deg, #004000 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.5,
                }}
              ></div>
              {/* Turbine Housing (Static) */}
              <div className="absolute w-64 h-64 border-4 border-[#808080] rounded-full opacity-80"></div>
              {/* Rotor Assembly */}
              <div
                className={`relative w-56 h-56 ${isSpinning ? 'animate-spin-visual' : ''}`}
                style={{ animationDuration: `${Math.max(0.05, 1000 / (state.turbineRPM || 1))}s` }}
              >
                {/* Central Hub */}
                <div className="absolute inset-0 m-auto w-16 h-16 bg-[#c0c0c0] rounded-full border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black z-20"></div>
                {/* Blades - darker industrial grey with high contrast borders */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-6 h-24 bg-[#808080] origin-bottom -translate-x-1/2 -translate-y-full border-2 border-[#404040]"
                    style={{ transform: `translateX(-50%) translateY(-100%) rotate(${i * 45}deg)` }}
                  >
                    {/* Retro shine */}
                    <div className="absolute top-0 left-1 w-1 h-full bg-[#a0a0a0]"></div>
                  </div>
                ))}
              </div>
              {/* Steam Injection Visuals - Pixelated particles */}
              {steamFlow && (
                <>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex space-x-2 animate-flow opacity-80">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-white"></div>
                    ))}
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex space-x-2 animate-flow opacity-80" style={{ transform: 'scaleX(-1)' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-white"></div>
                    ))}
                  </div>
                </>
              )}
              {/* Info Overlay */}
              <div className="absolute top-2 left-2 text-[#00ff00] font-mono text-xs drop-shadow-md bg-black/50 p-1 border border-[#004000]">
                ROTOR: HP-STAGE-1
                <br />STATUS: {state.turbineRPM > 2900 ? 'SYNCED' : 'SPINNING UP'}
              </div>
            </Win95Inset>
            <div className="text-center text-xs font-bold bg-[#c0c0c0] border border-white p-1 shrink-0">GENERATOR CAM 01</div>
          </div>
          {/* Data Panel */}
          <div className="w-40 flex flex-col gap-2 min-h-0">
            <fieldset className="border border-white border-l-gray-500 border-t-gray-500 p-2 flex-1 shrink-0">
              <legend className="text-xs ml-1 px-1">Generator</legend>
              <div className="text-xs font-mono flex flex-col gap-2 mt-1">
                <div className="flex justify-between border-b border-gray-400 pb-1">
                  <span>Output:</span>
                  <span className="text-green-700 font-bold">{state.powerOutput.toFixed(0)} MW</span>
                </div>
                <div className="flex justify-between">
                  <span>RPM:</span>
                  <span className="text-black">{state.turbineRPM.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freq:</span>
                  <span className={state.turbineRPM > 2950 ? 'text-green-700' : 'text-red-600'}>{frequency} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span>Phase:</span>
                  <span className="text-gray-600">LOCKED</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 text-[10px] text-gray-600">Vibration (mm/s)</div>
                  <div className="flex justify-between items-center bg-black px-1 py-0.5 border border-gray-500">
                    <span className="text-red-500 font-bold">{vibration}</span>
                    <div className={`w-2 h-2 rounded-full ${parseFloat(vibration) > 2 ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`}></div>
                  </div>
                </div>
              </div>
            </fieldset>
            <fieldset className="border border-white border-l-gray-500 border-t-gray-500 p-2 shrink-0">
              <legend className="text-xs ml-1 px-1">Steam Control</legend>
              <div className="text-xs font-mono">
                <ControlSlider label="Valve" value={state.turbineValve} onChange={onTurbineValveChange} />
              </div>
            </fieldset>
          </div>
        </div>
      </Win95Panel>
    </div>
  );
};

const PWRSimulator = () => {
  // --- Simulation State ---
  const [simState, setSimState] = useState({
    controlRodPosition: 100,
    boronConcentration: 1500, // default 1500 ppm near hot full power
    primaryPumpSpeed: 0,
    secondaryPumpSpeed: 0,
    turbineValve: 0,
    coreTemp: 30,
    coolantTempHot: 30,
    coolantTempCold: 30,
    pressure: 1,
    steamPressure: 0,
    turbineRPM: 0,
    powerOutput: 0,
    flux: 0,
    isScrammed: false,
    meltdown: false,
    statusMessage: 'SYSTEM READY - COLD SHUTDOWN',
    // Internal hidden variables for point kinetics
    _power: 0,
    _precursor: 0,
    _boronEff: 1500,
    reactivityPcm: -350,
  });
  const [activeView, setActiveView] = useState(null); // null, 'CORE', 'SG', 'TURBINE'
  // Constants for global simulation
  const MELTDOWN_TEMP = 2800;
  const OPERATING_TEMP = 315;
  const MAX_PRESSURE = 175;
  const CRITICAL_PRESSURE = 160;
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // --- Physics Engine ---
  // Updated physics engine using point kinetics with delayed neutrons.
  const updatePhysics = (deltaTime) => {
    setSimState((prev) => {
      if (prev.meltdown) return prev;
      // Time scaling: speeds up simulation relative to real time
      const TIME_SCALE = 20.0;
      const dt = Math.max(0, deltaTime) * TIME_SCALE;
      // Plant anchors
      const P_ELEC_NOM = 1200; // MWe nominal electric power
      const ETA_ELEC = 0.33; // thermal-to-electric efficiency
      const P_TH_NOM = P_ELEC_NOM / ETA_ELEC; // ~3600 MWth
      const PZR_SET_BAR = 155; // pressurizer setpoint
      const TURBINE_SYNC_RPM = 3600;
      const MW_PER_K_NOM = 96; // heat capacity constant for delta-T
      // Time constants (in simulated seconds)
      const TAU_NEUTRON = 8.0; // effective prompt neutron lifetime scaling
      const TAU_PRIMARY = 35.0;
      const TAU_HOTLEG = 12.0;
      const TAU_TURBINE = 6.0;
      const TAU_PZR = 10.0;
      const TAU_BORON = 240.0;
      // Helper functions
      const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
      const lerpExp = (x, target, tau) => {
        const a = 1 - Math.exp(-dt / Math.max(1e-6, tau));
        return x + (target - x) * a;
      };
      // 1) Flow model (primary)
      const pumpFrac = clamp(prev.primaryPumpSpeed / 100, 0, 1);
      // Natural circulation increases with deltaT
      const dT_nc = Math.max(0, prev.coolantTempHot - prev.coolantTempCold);
      const natCirc = clamp(dT_nc * 0.003, 0, 0.25);
      const primaryFlowFrac = clamp(pumpFrac + natCirc, 0.02, 1.2);
      // 2) Reactivity model in pcm
      const rodWithdrawFrac = clamp((100 - prev.controlRodPosition) / 100, 0, 1);
      const rho_rods_pcm = rodWithdrawFrac * 2500; // +2500 pcm at full withdrawal
      // Slow boron effect uses a hidden internal state _boronEff
      const boronTarget = clamp(prev.boronConcentration, 0, 2000);
      const boronEff = lerpExp(prev._boronEff ?? boronTarget, boronTarget, TAU_BORON);
      const rho_boron_pcm = -(boronEff - 1500) * 1.5; // ±1.5 pcm per ppm deviation
      // Moderator temperature coefficient (Doppler): around -4 pcm/°C
      const T_ref = 300;
      const T_avg = prev.coreTemp;
      const rho_temp_pcm = -(T_avg - T_ref) * 4.0;
      // Pressure & void feedback approximation
      const isHot = prev.coreTemp > 180 || prev.primaryPumpSpeed > 10;
      let pressureTarget = isHot ? PZR_SET_BAR : clamp(1 + (prev.coreTemp / 200) * 20, 1, 30);
      if (isHot) pressureTarget += (T_avg - 300) * 0.03;
      let newPressure = lerpExp(prev.pressure, pressureTarget, TAU_PZR);
      newPressure = clamp(newPressure, 1, MAX_PRESSURE);
      const saturationTemp = 100 + newPressure * 1.6;
      const subcoolMargin = saturationTemp - (prev.coolantTempHot ?? prev.coreTemp);
      const nearBoiling = subcoolMargin < 10;
      const boilOvershoot = Math.max(0, 10 - subcoolMargin);
      const rho_void_pcm = -boilOvershoot * 120;
      const pressureSpike = Math.max(0, prev.coolantTempHot - saturationTemp) * 1.8;
      newPressure = clamp(newPressure + pressureSpike, 1, MAX_PRESSURE);
      const rho_offset_pcm = -350;
      let rho_pcm = rho_rods_pcm + rho_boron_pcm + rho_temp_pcm + rho_void_pcm + rho_offset_pcm;
      if (prev.isScrammed) rho_pcm = -5000;
      rho_pcm = clamp(rho_pcm, -8000, 2500);
      // 3) Point kinetics for neutron population (normalized power)
      // Convert pcm to Δk/k (rho)
      const rho = rho_pcm / 10000;
      // Delayed neutron parameters (single effective group)
      const BETA_FRAC = 0.0065; // 0.65% delayed neutron fraction
      const LAMBDA_DN = 0.08; // 1/s effective precursor decay constant
      const source = 0.00003; // constant neutron source term
      let P = prev._power ?? prev.flux;
      let C = prev._precursor ?? 0;
      // Differential changes
      const dP = ((rho - BETA_FRAC) / TAU_NEUTRON) * P + LAMBDA_DN * C + source;
      const dC = (BETA_FRAC / TAU_NEUTRON) * P - LAMBDA_DN * C;
      let newP = P + dP * dt;
      let newC = C + dC * dt;
      // Prevent negative populations
      newP = Math.max(0, newP);
      newC = Math.max(0, newC);
      // Scram kills prompt neutrons and precursors instantly
      if (prev.isScrammed) {
        newP = 0;
        newC = 0;
      }
      // Keep normalized within bounds for stability and readable instrumentation
      const MAX_POWER_NORM = 1.25;
      newP = clamp(newP, 0, MAX_POWER_NORM);
      let newPNorm = newP;
      // 4) Thermal power and decay heat
      const Pth = newPNorm * P_TH_NOM;
      const decayFrac = prev.isScrammed ? 0.02 : 0.006;
      const Pth_total = Pth + decayFrac * P_TH_NOM * clamp(prev.coreTemp / 300, 0, 1);
      // 5) Primary temperatures
      const effFlow = Math.max(0.05, primaryFlowFrac);
      const deltaT_target = Pth_total / (MW_PER_K_NOM * effFlow);
      const ambient = 25;
      const coldBaseAtPower = 295;
      const coldTarget = newPNorm > 0.05 || prev.coreTemp > 120
        ? coldBaseAtPower + (1 - effFlow) * 12
        : ambient + (prev.primaryPumpSpeed / 100) * 15;
      const hotTarget = coldTarget + clamp(deltaT_target, 0, 80);
      const avgTarget = coldTarget + clamp(deltaT_target, 0, 80) * 0.5;
      const newColdLegTemp = lerpExp(prev.coolantTempCold, coldTarget, TAU_PRIMARY);
      const newHotLegTemp = lerpExp(prev.coolantTempHot, hotTarget, TAU_HOTLEG);
      let newCoreTemp = lerpExp(prev.coreTemp, avgTarget, TAU_PRIMARY);
      if (newPNorm < 0.02 && prev.primaryPumpSpeed < 5) {
        newCoreTemp = lerpExp(newCoreTemp, ambient, 140);
      }
      // 6) Secondary/steam pressure + turbine/load
      const newSecondaryPumpSpeed = prev.turbineValve;
      const secFlowFrac = clamp(newSecondaryPumpSpeed / 100, 0, 1);
      const steamP = clamp(prev.steamPressure, 0, 100);
      const Tsat2 = 100 + 3.0 * steamP;
      const UA = 80 * (0.25 + 0.75 * secFlowFrac);
      const dT_sg = Math.max(0, newHotLegTemp - Tsat2);
      const Q_sg = clamp(UA * dT_sg, 0, Pth_total);
      const valveFrac = clamp(prev.turbineValve / 100, 0, 1);
      const K_turb = 60;
      const Q_turb = clamp(K_turb * steamP * valveFrac, 0, P_TH_NOM * 1.1);
      const C_steam = 700;
      let newSteamPressure = steamP + ((Q_sg - Q_turb) / C_steam) * dt;
      newSteamPressure -= newSteamPressure * 0.0025 * dt;
      newSteamPressure = clamp(newSteamPressure, 0, 100);
      const loadFrac = clamp(Q_turb / P_TH_NOM, 0, 1.2);
      const rpmTarget = TURBINE_SYNC_RPM * clamp(loadFrac, 0, 1.02);
      const newTurbineRPM = lerpExp(prev.turbineRPM, rpmTarget, TAU_TURBINE);
      const newPowerOutput = clamp((newTurbineRPM / TURBINE_SYNC_RPM) * P_ELEC_NOM, 0, P_ELEC_NOM);
      // 7) Status and safety
      let newStatus = 'NORMAL OPERATION';
      let isMeltdown = false;
      if (prev.isScrammed) newStatus = 'SCRAM ACTIVATED';
      else if (newCoreTemp < 100) newStatus = 'COLD SHUTDOWN';
      else if (newCoreTemp > 290 && newCoreTemp < 325) newStatus = 'POWER OPERATION';
      else if (newCoreTemp >= 325) newStatus = 'WARNING: HIGH TEMP';
      if (nearBoiling) newStatus = 'CRIT: LOW SUBCOOL';
      if (newPressure > CRITICAL_PRESSURE) newStatus = 'CRIT: OVERPRESSURE';
      let coreTempCapped = newCoreTemp;
      if (coreTempCapped >= MELTDOWN_TEMP) {
        isMeltdown = true;
        newStatus = 'FATAL: CORE MELT';
        coreTempCapped = MELTDOWN_TEMP;
      }
      return {
        ...prev,
        _boronEff: boronEff,
        _power: newP,
        _precursor: newC,
        reactivityPcm: rho_pcm,
        flux: newPNorm,
        secondaryPumpSpeed: newSecondaryPumpSpeed,
        coreTemp: Math.max(ambient, coreTempCapped),
        coolantTempHot: newHotLegTemp,
        coolantTempCold: newColdLegTemp,
        pressure: newPressure,
        steamPressure: newSteamPressure,
        turbineRPM: Math.max(0, newTurbineRPM),
        powerOutput: newPowerOutput,
        meltdown: isMeltdown,
        statusMessage: newStatus,
      };
    });
  };
  // Animation loop
  const tick = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = (time - previousTimeRef.current) / 1000;
      updatePhysics(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);
  const handleScram = useCallback(() => {
    setSimState((prev) => ({
      ...prev,
      controlRodPosition: 100,
      turbineValve: 0,
      isScrammed: true,
      statusMessage: 'SCRAM INITIATED',
    }));
  }, []);
  const resetSim = useCallback(() => {
    setSimState({
      controlRodPosition: 100,
      boronConcentration: 1500,
      primaryPumpSpeed: 0,
      secondaryPumpSpeed: 0,
      turbineValve: 0,
      coreTemp: 30,
      coolantTempHot: 30,
      coolantTempCold: 30,
      pressure: 1,
      steamPressure: 0,
      turbineRPM: 0,
      powerOutput: 0,
      flux: 0,
      isScrammed: false,
      meltdown: false,
      statusMessage: 'SYSTEM READY - COLD SHUTDOWN',
      _power: 0,
      _precursor: 0,
      _boronEff: 1500,
      reactivityPcm: -350,
    });
    setActiveView(null);
  }, []);
  const handleRodChange = useCallback((val) => {
    setSimState((p) => {
      if (p.isScrammed) return p;
      return { ...p, controlRodPosition: val };
    });
  }, []);
  const handleBoronChange = useCallback((val) => {
    setSimState((p) => ({ ...p, boronConcentration: val }));
  }, []);
  const handlePrimaryPumpChange = useCallback((val) => setSimState((p) => ({ ...p, primaryPumpSpeed: val })), []);
  const handleTurbineValveChange = useCallback((val) => setSimState((p) => ({ ...p, turbineValve: val })), []);
  return (
    <div className="min-h-screen bg-[#008080] p-4 font-[Tahoma,sans-serif] select-none flex items-center justify-center">
      {/* Main Window */}
      <Win95Panel title="PWR Control System v1.0" className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4 border-b-2 border-white pb-2 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-600">STATUS</span>
              <div className={`text-sm font-bold border border-gray-500 bg-white px-2 py-0.5 w-64 ${simState.meltdown ? 'text-red-600 animate-pulse' : 'text-black'}`}>{simState.statusMessage}</div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-600">NET OUTPUT</span>
              <div className="text-sm font-bold border border-gray-500 bg-black text-green-400 font-mono px-2 py-0.5 w-32 text-right">{simState.powerOutput.toFixed(0)} MW</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Win95Button onClick={resetSim} disabled={!simState.isScrammed && !simState.meltdown}>System Reset</Win95Button>
            <Win95Button onClick={() => setActiveView('CORE')}>Core View</Win95Button>
            <Win95Button onClick={() => setActiveView('SG')}>Steam Gen</Win95Button>
            <Win95Button onClick={() => setActiveView('TURBINE')}>Turbine</Win95Button>
          </div>
        </div>
        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-0">
          {/* Schematic View */}
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <Win95Inset className="flex-1 relative overflow-hidden bg-[#808080]">
              {/* Label positioned to avoid overlap */}
              <div className="absolute top-2 left-2 text-white font-bold text-xs bg-black/20 px-1 pointer-events-none z-10">SYSTEM DIAGRAM</div>
              <svg viewBox="0 0 800 500" className="w-full h-full relative z-0">
                {/* LOOP LABELS */}
                <text x="300" y="130" fill="black" fontSize="10" fontWeight="bold" opacity="0.6">PRIMARY LOOP</text>
                <text x="500" y="130" fill="black" fontSize="10" fontWeight="bold" opacity="0.6">SECONDARY LOOP</text>
                {/* Primary: Hot Leg (Reactor -> SG) - RED */}
                <path d="M 250 300 L 250 150 L 400 150" fill="none" stroke={simState.coreTemp > 300 ? '#ff0000' : '#800000'} strokeWidth="16" />
                {/* Flow Overlay - Hot Leg (Up then Right) */}
                <path d="M 250 300 L 250 150 L 400 150" fill="none" stroke="white" strokeWidth="4" strokeOpacity="0.8" strokeDasharray="10 10" className={simState.primaryPumpSpeed > 0 ? 'animate-flow' : ''} style={{ animationDuration: `${200 / Math.max(1, simState.primaryPumpSpeed)}s` }} />
                {/* Primary: Cold Leg (SG -> Pump -> Reactor) - BLUE */}
                <path d="M 400 350 L 250 350" fill="none" stroke="#000080" strokeWidth="16" />
                {/* Flow Overlay - Cold Leg (Right to Left) */}
                <path d="M 400 350 L 250 350" fill="none" stroke="white" strokeWidth="4" strokeOpacity="0.8" strokeDasharray="10 10" className={simState.primaryPumpSpeed > 0 ? 'animate-flow' : ''} style={{ animationDuration: `${200 / Math.max(1, simState.primaryPumpSpeed)}s` }} />
                {/* Secondary: Steam Line (SG -> Turbine) - GREY */}
                <path d="M 450 150 L 600 150" fill="none" stroke="#cccccc" strokeWidth="12" />
                {/* Flow Overlay - Steam (Left to Right) */}
                <path d="M 450 150 L 600 150" fill="none" stroke="white" strokeWidth="4" strokeOpacity="0.8" strokeDasharray="10 10" className={simState.turbineValve > 0 ? 'animate-flow' : 'opacity-0'} style={{ animationDuration: `${200 / Math.max(1, simState.turbineValve)}s` }} />
                {/* Secondary: Feedwater Return (Condenser/Turbine -> SG) - DARK BLUE */}
                <path d="M 640 150 L 640 350 L 460 350" fill="none" stroke="#000080" strokeWidth="10" strokeOpacity="0.6" />
                {/* Flow Overlay - Feed (Down then Left) */}
                <path d="M 640 100 L 640 350 L 460 350" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.8" strokeDasharray="10 10" className={simState.secondaryPumpSpeed > 0 ? 'animate-flow' : ''} style={{ animationDuration: `${200 / Math.max(1, simState.secondaryPumpSpeed)}s` }} />
                {/* Components (Flat 2D Style) */}
                {/* Reactor Vessel - Clickable */}
                <g transform="translate(150, 250)" className="cursor-pointer hover:opacity-90 transition-opacity group pointer-events-auto" onClick={() => setActiveView('CORE')}>
                  <rect x="0" y="0" width="100" height="180" stroke="black" strokeWidth="2" fill="#808080" />
                  <rect x="5" y="5" width="90" height="170" stroke="white" strokeWidth="2" fill="none" />
                  {/* Fuel Rods */}
                  <rect x="20" y="40" width="10" height="100" stroke="black" fill={simState.coreTemp > 1000 ? '#ff0000' : '#404040'} />
                  <rect x="45" y="40" width="10" height="100" stroke="black" fill={simState.coreTemp > 1000 ? '#ff0000' : '#404040'} />
                  <rect x="70" y="40" width="10" height="100" stroke="black" fill={simState.coreTemp > 1000 ? '#ff0000' : '#404040'} />
                  {/* Control Rods */}
                  <g transform={`translate(0, -${(100 - simState.controlRodPosition) * 0.8})`}>
                    <rect x="18" y="20" width="14" height="100" stroke="black" fill="#c0c0c0" />
                    <rect x="43" y="20" width="14" height="100" stroke="black" fill="#c0c0c0" />
                    <rect x="68" y="20" width="14" height="100" stroke="black" fill="#c0c0c0" />
                    <rect x="10" y="10" width="80" height="10" stroke="black" fill="#c0c0c0" />
                  </g>
                  <text x="50" y="195" textAnchor="middle" fill="black" fontSize="12" fontWeight="bold" className="group-hover:fill-yellow-300">REACTOR</text>
                </g>
                {/* Steam Generator - Clickable */}
                <g transform="translate(400, 150)" className="cursor-pointer hover:opacity-90 transition-opacity group pointer-events-auto" onClick={() => setActiveView('SG')}>
                  <rect x="0" y="0" width="60" height="200" stroke="black" strokeWidth="2" fill="#808080" />
                  <rect x="5" y="5" width="50" height="190" stroke="white" strokeWidth="1" fill="none" />
                  {/* Water Level */}
                  <rect x="2" y={200 - simState.steamPressure * 1.5} width="56" height={simState.steamPressure * 1.5} fill="#00ffff" opacity="0.5" />
                  {/* U-Tubes representation */}
                  <path d="M 20 60 L 20 30 C 20 10, 40 10, 40 30 L 40 60" fill="none" stroke="#800000" strokeWidth="4" />
                  <text x="30" y="215" textAnchor="middle" fill="black" fontSize="12" fontWeight="bold" className="group-hover:fill-yellow-300">S/G</text>
                </g>
                {/* Turbine - Clickable */}
                <g transform="translate(600, 100)" className="cursor-pointer hover:opacity-90 transition-opacity group pointer-events-auto" onClick={() => setActiveView('TURBINE')}>
                  <path d="M 0 20 L 80 0 L 80 100 L 0 80 Z" stroke="black" strokeWidth="2" fill="#808080" />
                  <circle cx="40" cy="50" r="25" fill="#404040" stroke="black" strokeWidth="2" />
                  {/* Blades */}
                  <g className={simState.turbineRPM > 10 ? 'animate-spin-visual' : ''} style={{ animationDuration: `${Math.max(0.1, 5000 / (simState.turbineRPM || 1))}s`, transformOrigin: '40px 50px' }}>
                    <line x1="40" y1="25" x2="40" y2="75" stroke="white" strokeWidth="2" />
                    <line x1="15" y1="50" x2="65" y2="50" stroke="white" strokeWidth="2" />
                  </g>
                  <text x="0" y="115" textAnchor="middle" fill="black" fontSize="12" fontWeight="bold" className="group-hover:fill-yellow-300">TURBINE</text>
                </g>
                {/* Generator visuals removed per request */}
              </svg>
            </Win95Inset>
          </div>
          {/* Controls & Gauges */}
          <div className="lg:col-span-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
            {/* Operator Controls Box */}
            <fieldset className="border-2 border-white border-l-gray-500 border-t-gray-500 p-2 relative mt-2 shrink-0">
              <legend className="ml-2 px-1 text-sm font-bold text-black">Operator Controls</legend>
              <div className="flex flex-col gap-2 mt-2">
                <ControlSlider label="Control Rods" value={simState.controlRodPosition} onChange={handleRodChange} disabled={simState.isScrammed} />
                {/* Boron removed from here, only in Core View */}
                <ControlSlider label="Primary Pump" value={simState.primaryPumpSpeed} onChange={handlePrimaryPumpChange} />
                {/* Feed Pump slider removed - automatic control */}
                <ControlSlider label="Turbine Valve" value={simState.turbineValve} onChange={handleTurbineValveChange} />
              </div>
              {/* SCRAM Button Area */}
              <div className="mt-4 p-2 border-2 border-gray-500 border-b-white border-r-white bg-gray-300">
                <Win95Button onClick={handleScram} disabled={simState.isScrammed} className={`w-full py-2 text-lg ${simState.isScrammed ? 'bg-[#b0b0b0] text-gray-600' : 'bg-[#ff0000] text-white hover:bg-[#e00000]'}`}>
                  ⚠ SCRAM ⚠
                </Win95Button>
              </div>
            </fieldset>
            {/* Gauges Box */}
            <fieldset className="border-2 border-white border-l-gray-500 border-t-gray-500 p-2 relative flex-1 shrink-0">
              <legend className="ml-2 px-1 text-sm font-bold text-black">Telemetry</legend>
              <div className="flex justify-around mb-4 mt-2">
                <VerticalGauge label="CORE" value={simState.coreTemp} max={400} unit="°C" color="#ff0000" warningThreshold={330} />
                <VerticalGauge label="PRESS" value={simState.pressure} max={200} unit="Bar" color="#0000ff" warningThreshold={165} />
                <VerticalGauge label="RPM" value={simState.turbineRPM} max={3500} unit="" color="#008000" />
              </div>
              {/* Data Table */}
              <Win95Inset className="bg-black text-green-400 font-mono text-xs p-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between"><span>T.HOT:</span><span>{simState.coolantTempHot.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>T.COLD:</span><span>{simState.coolantTempCold.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>STM.P:</span><span>{simState.steamPressure.toFixed(1)}</span></div>
                <div className="flex justify-between"><span>RX.PWR:</span><span>{simState.powerOutput > 0 ? 'ON' : 'OFF'}</span></div>
              </Win95Inset>
            </fieldset>
          </div>
        </div>
        {/* Styles for animations */}
        <style>{`
          @keyframes flow {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -20; }
          }
          @keyframes float-up {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-200px); opacity: 0; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-flow {
            animation: flow 1s linear infinite;
          }
          .animate-float-up {
            animation: float-up 3s ease-in infinite;
          }
          .animate-spin-visual {
            animation: spin 1s linear infinite;
          }
        `}</style>
        {/* MODALS */}
        {activeView === 'CORE' && (
          <CoreInternalsView state={simState} onClose={() => setActiveView(null)} onRodChange={handleRodChange} onBoronChange={handleBoronChange} />
        )}
        {activeView === 'SG' && (
          <SteamGeneratorView state={simState} onClose={() => setActiveView(null)} onPrimaryPumpChange={handlePrimaryPumpChange} />
        )}
        {activeView === 'TURBINE' && (
          <TurbinePhysicsView state={simState} onClose={() => setActiveView(null)} onTurbineValveChange={handleTurbineValveChange} />
        )}
        {/* Failure Modal */}
        {simState.meltdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Win95Panel title="Critical Error" className="w-96">
              <div className="flex gap-4 p-4">
                <AlertTriangle size={32} className="text-red-600" />
                <div>
                  <p className="font-bold mb-2">A fatal exception has occurred at 0028:C0RE_MELT.</p>
                  <p className="text-sm mb-4">The current application will be terminated.</p>
                  <p className="text-sm mb-4 text-red-600 font-bold uppercase">Radiation Leak Detected.</p>
                </div>
              </div>
              <div className="flex justify-center p-2">
                <Win95Button onClick={resetSim}>Restart System</Win95Button>
              </div>
            </Win95Panel>
          </div>
        )}
      </Win95Panel>
    </div>
  );
};

export default PWRSimulator;
