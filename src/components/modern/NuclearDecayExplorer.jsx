import React, { useEffect, useMemo, useState } from "react";

const PRESETS = {
  Uranium238: {
    label: "U-238 (mostly alpha)",
    halfLife: 4.5,
    alphaProb: 0.92,
    betaProb: 0.05,
  },
  Cobalt60: {
    label: "Co-60 (beta + gamma)",
    halfLife: 1.2,
    alphaProb: 0.0,
    betaProb: 0.86,
  },
  Custom: {
    label: "Custom mix",
    halfLife: 2.0,
    alphaProb: 0.33,
    betaProb: 0.33,
  },
};

const COLORS = {
  alpha: "#ef4444",
  beta: "#3b82f6",
  gamma: "#f59e0b",
  remaining: "#111827",
};

export default function NuclearDecayExplorer() {
  const [preset, setPreset] = useState("Uranium238");
  const [initialNuclei, setInitialNuclei] = useState(1000);
  const [timeStep, setTimeStep] = useState(0.1);
  const [state, setState] = useState(() => ({
    t: 0,
    remaining: 1000,
    alpha: 0,
    beta: 0,
    gamma: 0,
  }));
  const [running, setRunning] = useState(false);

  const active = PRESETS[preset];
  const alphaProb = active.alphaProb;
  const betaProb = active.betaProb;
  const gammaProb = Math.max(0, 1 - alphaProb - betaProb);

  useEffect(() => {
    setState({ t: 0, remaining: initialNuclei, alpha: 0, beta: 0, gamma: 0 });
    setRunning(false);
  }, [preset, initialNuclei]);

  useEffect(() => {
    if (!running) return undefined;

    const id = setInterval(() => {
      setState((prev) => {
        const decayProbThisStep = 1 - Math.pow(0.5, timeStep / active.halfLife);
        const expectedDecays = prev.remaining * decayProbThisStep;

        const alphaDecays = expectedDecays * alphaProb;
        const betaDecays = expectedDecays * betaProb;
        const gammaDecays = expectedDecays * gammaProb;

        const totalDecays = alphaDecays + betaDecays + gammaDecays;
        const nextRemaining = Math.max(0, prev.remaining - totalDecays);

        return {
          t: prev.t + timeStep,
          remaining: nextRemaining,
          alpha: prev.alpha + alphaDecays,
          beta: prev.beta + betaDecays,
          gamma: prev.gamma + gammaDecays,
        };
      });
    }, 120);

    return () => clearInterval(id);
  }, [running, timeStep, active.halfLife, alphaProb, betaProb, gammaProb]);

  const bars = useMemo(() => {
    const total = Math.max(initialNuclei, state.alpha + state.beta + state.gamma + state.remaining, 1);
    return [
      { label: "Alpha", value: state.alpha, color: COLORS.alpha },
      { label: "Beta", value: state.beta, color: COLORS.beta },
      { label: "Gamma", value: state.gamma, color: COLORS.gamma },
      { label: "Undecayed", value: state.remaining, color: COLORS.remaining },
    ].map((item) => ({
      ...item,
      pct: (item.value / total) * 100,
    }));
  }, [state, initialNuclei]);

  const reset = () => {
    setState({ t: 0, remaining: initialNuclei, alpha: 0, beta: 0, gamma: 0 });
    setRunning(false);
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <h3 style={{ marginTop: 0 }}>Decay mode explorer</h3>
      <p style={{ marginTop: 0 }}>
        This simulation applies exponential decay each time step, then splits emitted radiation into
        alpha, beta, and gamma channels using configurable probabilities.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <label>
          Isotope preset
          <select value={preset} onChange={(e) => setPreset(e.target.value)} style={{ display: "block", width: "100%" }}>
            {Object.entries(PRESETS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Initial nuclei: {initialNuclei}
          <input
            type="range"
            min="200"
            max="5000"
            step="100"
            value={initialNuclei}
            onChange={(e) => setInitialNuclei(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>

        <label>
          Time step: {timeStep.toFixed(2)} half-life units
          <input
            type="range"
            min="0.02"
            max="0.5"
            step="0.02"
            value={timeStep}
            onChange={(e) => setTimeStep(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setRunning((x) => !x)}>
          {running ? "Pause" : "Run"}
        </button>
        <button type="button" onClick={reset}>Reset</button>
      </div>

      <div style={{ marginTop: 12, fontSize: 14 }}>
        <strong>Time:</strong> {state.t.toFixed(2)} | <strong>Half-life:</strong> {active.halfLife} | <strong>Mode split:</strong>{" "}
        α {(alphaProb * 100).toFixed(0)}%, β {(betaProb * 100).toFixed(0)}%, γ {(gammaProb * 100).toFixed(0)}%
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {bars.map((bar) => (
          <div key={bar.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>{bar.label}</span>
              <span>{bar.value.toFixed(1)}</span>
            </div>
            <div style={{ height: 12, background: "#f3f4f6", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(2, bar.pct)}%`,
                  background: bar.color,
                  borderRadius: 999,
                  transition: "width 120ms linear",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
