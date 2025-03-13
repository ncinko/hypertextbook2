import React, { useState } from "react";
import Plot from "react-plotly.js";
import { MathJax, MathJaxContext } from "better-react-mathjax";

const SHMPlot = () => {
  // State for amplitude, period (T), and phase
  const [amplitude, setAmplitude] = useState(1);
  const [period, setPeriod] = useState(1); // period in seconds
  const [phase, setPhase] = useState(0);

  // Calculate angular frequency from period: ω = 2π/T
  const omega = 2 * Math.PI / period;

  // Generate time values from 0 to 10 seconds
  const time = Array.from({ length: 200 }, (_, i) => i * 0.05);
  // Compute displacement values: x(t) = A sin(ωt + φ)
  const yValues = time.map(t => amplitude * Math.sin(omega * t + phase));

  return (
    <div style={{ backgroundColor: "#f8f9fa", padding: "2rem", textAlign: "center" }}>
      <MathJaxContext>
        {/* Equation above the plot */}
        <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
          <MathJax inline>{"\\( x(t) = A \\sin\\left(\\frac{2\\pi}{T}t + \\phi\\right) \\)"}</MathJax>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Plot
            data={[
              {
                x: time,
                y: yValues,
                type: "scatter",
                mode: "lines",
                line: { color: "#3498db" } // Trace color
              }
            ]}
            layout={{
              title: "Simple Harmonic Motion",
              xaxis: { title: { text: "Time (s)" }, range: [0, 10] }, // Fixed horizontal axis scale with title
              yaxis: { title: { text: "Displacement" }, range: [-6, 6] }, // Fixed vertical axis scale with title
              margin: { t: 40, l: 40, r: 40, b: 40 },
              plot_bgcolor: "#f8f9fa",
              paper_bgcolor: "#f8f9fa"
            }}
            config={{
              displayModeBar: false
            }}
            style={{ width: "80%", maxWidth: "800px", margin: "0 auto" }} // Centers the plot
          />
        </div>
        {/* Horizontal slider container */}
        <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginTop: "1rem" }}>
          <div style={{ minWidth: "150px" }}>
            <label>
              Amplitude (A): {amplitude.toFixed(2)}
              <br />
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={amplitude}
                onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label>
              Period (T): {period.toFixed(2)} s
              <br />
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={period}
                onChange={(e) => setPeriod(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
          <div style={{ minWidth: "150px" }}>
            <label>
              Phase (φ): {phase.toFixed(2)} rad
              <br />
              <input
                type="range"
                min="-6.3"
                max="6.3"
                step="0.1"
                value={phase}
                onChange={(e) => setPhase(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default SHMPlot;
