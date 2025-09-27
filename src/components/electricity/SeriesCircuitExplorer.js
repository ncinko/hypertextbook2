import React, { useMemo, useState } from "react";

// SeriesCircuitExplorer ------------------------------------------------------
// Lets students adjust two resistors and the supply voltage, toggling between
// series and parallel arrangements to see how the total resistance, current,
// and component power change. The diagram responds to the configuration and
// brightens the "lamp" in proportion to dissipated power.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const Lamp = ({ power, maxPower }) => {
  const intensity = clamp(power / maxPower, 0, 1);
  const haloRadius = 28 + intensity * 16;
  const coreRadius = 20 + intensity * 6;
  const haloOpacity = 0.2 + 0.45 * intensity;
  const coreOpacity = 0.5 + 0.4 * intensity;

  return (
    <g>
      <title>{`Lamp dissipating ${power.toFixed(2)} watts`}</title>
      <circle cx="0" cy="0" r={haloRadius} fill={`rgba(250, 204, 21, ${haloOpacity})`} />
      <circle
        cx="0"
        cy="0"
        r={coreRadius}
        fill={`rgba(253, 224, 71, ${coreOpacity})`}
        stroke="#facc15"
        strokeWidth="3"
      />
      <text
        x="0"
        y={coreRadius + 24}
        textAnchor="middle"
        dominantBaseline="hanging"
        fill="#1e293b"
        fontSize="12"
      >
        {power.toFixed(2)} W
      </text>
    </g>
  );
};

export default function SeriesCircuitExplorer() {
  const [voltage, setVoltage] = useState(9);
  const [resistorA, setResistorA] = useState(12);
  const [resistorB, setResistorB] = useState(24);
  const [configuration, setConfiguration] = useState("series");

  const resistorPath = "M0 0 h40 l10 -12 l10 12 l10 -12 l10 12 l10 -12 l10 12 h40";

  const {
    totalResistance,
    current,
    branchCurrents,
    powerA,
    powerB,
  } = useMemo(() => {
    const R1 = Math.max(resistorA, 0.1);
    const R2 = Math.max(resistorB, 0.1);

    if (configuration === "parallel") {
      const totalR = 1 / (1 / R1 + 1 / R2);
      const I1 = voltage / R1;
      const I2 = voltage / R2;
      return {
        totalResistance: totalR,
        current: I1 + I2,
        branchCurrents: [I1, I2],
        powerA: voltage * I1,
        powerB: voltage * I2,
      };
    }

    const totalR = R1 + R2;
    const I = voltage / totalR;
    return {
      totalResistance: totalR,
      current: I,
      branchCurrents: [I, I],
      powerA: I * I * R1,
      powerB: I * I * R2,
    };
  }, [configuration, resistorA, resistorB, voltage]);

  const maxPower = Math.max(powerA, powerB, 1);

  return (
    <div className="simulation-card">
      <h3>Circuit Response to Ohm's Law</h3>
      <div className={`circuit-diagram ${configuration}`}>
        <svg width="100%" height="220" viewBox="0 0 520 220" role="img" aria-label="Simple circuit diagram">
          <defs>
            <linearGradient id="batteryGradient" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {/* Battery */}
          <rect x="30" y="70" width="40" height="80" fill="url(#batteryGradient)" rx="6" />
          <line x1="50" y1="60" x2="50" y2="40" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
          <line x1="50" y1="160" x2="50" y2="190" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
          <text x="22" y="115" fill="#f8fafc" fontSize="14">{voltage.toFixed(1)} V</text>

          {/* Left bus */}
          <line x1="70" y1="80" x2="150" y2="80" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
          <line x1="70" y1="140" x2="150" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />

          {/* Resistors */}
          <g transform="translate(150, 65)">
            <path d={resistorPath} fill="none" stroke="#f87171" strokeWidth="6" strokeLinejoin="round" />
            <text x="60" y="-12" fill="#f87171" fontSize="14">R₁ = {resistorA.toFixed(0)} Ω</text>
          </g>

          {configuration === "series" ? (
            <>
              <g transform="translate(150, 125)">
                <path d={resistorPath} fill="none" stroke="#34d399" strokeWidth="6" strokeLinejoin="round" />
                <text x="60" y="52" fill="#34d399" fontSize="14">R₂ = {resistorB.toFixed(0)} Ω</text>
              </g>
              <line x1="390" y1="80" x2="470" y2="80" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
              <line x1="390" y1="140" x2="470" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            </>
          ) : (
            <>
              <line x1="150" y1="80" x2="150" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
              <line x1="390" y1="80" x2="390" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
              <g transform="translate(150, 65)">
                <path d={resistorPath} fill="none" stroke="#34d399" strokeWidth="6" strokeLinejoin="round" />
                <text x="60" y="52" fill="#34d399" fontSize="14">R₂ = {resistorB.toFixed(0)} Ω</text>
              </g>
              <line x1="390" y1="110" x2="470" y2="110" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
            </>
          )}

          {/* Lamp load */}
          <g transform="translate(470, 70)">
            <Lamp power={powerA + powerB} maxPower={maxPower * 1.2} />
          </g>

          {/* Return path */}
          <line x1="470" y1="80" x2="490" y2="80" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
          <line x1="470" y1="140" x2="490" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
          <line x1="490" y1="80" x2="490" y2="140" stroke="#94a3b8" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      <div className="control-panel stacked-controls">
        <label>
          Supply voltage (V):
          <input
            type="range"
            min="1"
            max="24"
            step="0.5"
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
          />
          <span>{voltage.toFixed(1)} V</span>
        </label>
        <label>
          R₁ (Ω):
          <input
            type="range"
            min="2"
            max="60"
            step="1"
            value={resistorA}
            onChange={(e) => setResistorA(Number(e.target.value))}
          />
          <span>{resistorA.toFixed(0)} Ω</span>
        </label>
        <label>
          R₂ (Ω):
          <input
            type="range"
            min="2"
            max="60"
            step="1"
            value={resistorB}
            onChange={(e) => setResistorB(Number(e.target.value))}
          />
          <span>{resistorB.toFixed(0)} Ω</span>
        </label>
        <label className="toggle">
          <input
            type="radio"
            name="configuration"
            value="series"
            checked={configuration === "series"}
            onChange={() => setConfiguration("series")}
          />
          Series
        </label>
        <label className="toggle">
          <input
            type="radio"
            name="configuration"
            value="parallel"
            checked={configuration === "parallel"}
            onChange={() => setConfiguration("parallel")}
          />
          Parallel
        </label>
      </div>

      <div className="metrics-grid">
        <div>
          <strong>Total resistance</strong>
          <div>{totalResistance.toFixed(1)} Ω</div>
        </div>
        <div>
          <strong>Circuit current</strong>
          <div>{current.toFixed(2)} A</div>
        </div>
        <div>
          <strong>R₁ power</strong>
          <div>{powerA.toFixed(2)} W</div>
        </div>
        <div>
          <strong>R₂ power</strong>
          <div>{powerB.toFixed(2)} W</div>
        </div>
        {configuration === "parallel" ? (
          <div className="span-2">
            <strong>Branch currents</strong>
            <div>
              I₁ = {branchCurrents[0].toFixed(2)} A, I₂ = {branchCurrents[1].toFixed(2)} A
            </div>
          </div>
        ) : null}
      </div>
      <p className="caption">
        Drag the sliders to see how changing resistance or arrangement controls the current. Ohm's law applies locally to each
        resistor, yet the total response depends on whether the same current flows through both components or the same voltage is
        shared across them.
      </p>
    </div>
  );
}
