// src/components/potential/PotentialEnergyLandscape.js
import React, { useRef, useState, useEffect } from "react";
import Sketch from "react-p5";
import HiddenExposition from "../HiddenExposition"; // adjust path if needed
import { MathJax, MathJaxContext } from "better-react-mathjax";

export default function PotentialEnergyLandscape() {
  // ---------- UI / Params ----------
  const [mode, setMode] = useState("bowl"); // 'bowl' | 'double' | 'charges'
  const [running, setRunning] = useState(true);

  // Physics params
  const [mass, setMass] = useState(1.0);
  const [damping, setDamping] = useState(0.25);

  // Bowl: U = 0.5*k*(x^2 + y^2)
  const [kBowl, setKBowl] = useState(0.5);

  // Double well: U = a*(x^2 - b^2)^2 + 0.5*c*y^2
  const [aDouble, setADouble] = useState(0.002);
  const [bDouble, setBDouble] = useState(120);
  const [cDouble, setCDouble] = useState(0.005);

  // Charges: U = K*q/r (softened at small r)
  const [q1, setQ1] = useState(+5);
  const [q2, setQ2] = useState(-5);
  const [sep, setSep] = useState(180); // separation between charges
  const [soft, setSoft] = useState(20); // softening radius

  // Display toggles
  const [showContours, setShowContours] = useState(true);
  const [showGrad, setShowGrad] = useState(false);

  // ---------- Sim state ----------
  // Position/velocity of the bead (in canvas pixels, origin at canvas center)
  const stateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const prevTimeRef = useRef(0);
  const draggingRef = useRef(false);

  // Re-draw cache trigger (recompute heatmap when params/mode change)
  const redrawKey =
    JSON.stringify({
      mode,
      kBowl,
      aDouble,
      bDouble,
      cDouble,
      q1,
      q2,
      sep,
      soft,
      showContours,
    });

  // ---------- Utilities: coordinate mapping ----------
  // We treat the canvas center as (0,0). Units are "pixels as units".
  const toCanvas = (p5, x, y) => [p5.width / 2 + x, p5.height / 2 + y];
  const toWorld = (p5, X, Y) => [X - p5.width / 2, Y - p5.height / 2];

  // ---------- Potential definitions ----------
  const K = 500; // scaled Coulomb-like constant for on-canvas visualization

  const U_bowl = (x, y) => 0.5 * kBowl * (x * x + y * y);
  const gradU_bowl = (x, y) => [kBowl * x, kBowl * y];

  const U_double = (x, y) => aDouble * (x * x - bDouble * bDouble) ** 2 + 0.5 * cDouble * y * y;
  const gradU_double = (x, y) => [
    4 * aDouble * x * (x * x - bDouble * bDouble),
    cDouble * y,
  ];

  // Charges at (-sep/2, 0) and (+sep/2, 0)
  const U_charges = (x, y) => {
    const s2 = soft * soft;
    const r1 = Math.sqrt((x + sep / 2) ** 2 + y * y + s2);
    const r2 = Math.sqrt((x - sep / 2) ** 2 + y * y + s2);
    return K * (q1 / r1 + q2 / r2);
  };
  const gradU_charges = (x, y) => {
    const s2 = soft * soft;
    // Charge 1 at (-sep/2, 0)
    let dx1 = x + sep / 2;
    let dy1 = y;
    const r13 = Math.pow(dx1 * dx1 + dy1 * dy1 + s2, 1.5);
    // Charge 2 at (+sep/2, 0)
    let dx2 = x - sep / 2;
    let dy2 = y;
    const r23 = Math.pow(dx2 * dx2 + dy2 * dy2 + s2, 1.5);

    // dU/dx = K*q * d(1/r)/dx = -K*q*(dx)/r^3
    const dUdx = -K * (q1 * dx1 / r13 + q2 * dx2 / r23);
    const dUdy = -K * (q1 * dy1 / r13 + q2 * dy2 / r23);
    return [dUdx, dUdy];
  };

  const U = (x, y) => {
    if (mode === "bowl") return U_bowl(x, y);
    if (mode === "double") return U_double(x, y);
    return U_charges(x, y);
  };
  const gradU = (x, y) => {
    if (mode === "bowl") return gradU_bowl(x, y);
    if (mode === "double") return gradU_double(x, y);
    return gradU_charges(x, y);
  };

  // ---------- Controls styling ----------
  const btn = (primary) => ({
    appearance: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 14,
    color: "#fff",
    background: primary
      ? "linear-gradient(90deg,#4f46e5,#06b6d4)" // indigo → cyan
      : "linear-gradient(90deg,#ef4444,#f59e0b)", // red → amber
    boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
  });

  // ---------- p5 setup/draw ----------
  const setup = (p5, parent) => {
    const resize = () => {
      const w = parent.getBoundingClientRect().width || 600;
      p5.resizeCanvas(w, Math.max(360, Math.round(w * 0.62)));
    };
    const w = parent.getBoundingClientRect().width || 600;
    p5.createCanvas(w, Math.max(360, Math.round(w * 0.62))).parent(parent);
    p5.frameRate(60);
    prevTimeRef.current = p5.millis();

    // Start bead near left well by default
    stateRef.current = { x: -140, y: -40, vx: 0, vy: 0 };

    p5.windowResized = resize;
  };

  const drawBackground = (p5) => {
    // Cheap heatmap / contour-ish: sample on a coarse grid and color by U
    const step = 10; // coarser = faster
    const margin = 6;
    let minU = +Infinity,
      maxU = -Infinity;

    // Scan for bounds (sparse)
    for (let Y = margin; Y < p5.height - margin; Y += step) {
      for (let X = margin; X < p5.width - margin; X += step) {
        const [x, y] = toWorld(p5, X, Y);
        const val = U(x, y);
        if (val < minU) minU = val;
        if (val > maxU) maxU = val;
      }
    }

    // Map potential to grayscale/blueish
    const colorMap = (val) => {
      // normalize to [0,1]
      const t = (val - minU) / (maxU - minU + 1e-6);
      // subtle blue/purple scale
      const r = Math.floor(240 - 120 * t);
      const g = Math.floor(245 - 160 * t);
      const b = Math.floor(255 - 30 * (1 - t));
      return [r, g, b, 220];
    };

    // Draw blocks
    for (let Y = margin; Y < p5.height - margin; Y += step) {
      for (let X = margin; X < p5.width - margin; X += step) {
        const [x, y] = toWorld(p5, X, Y);
        const val = U(x, y);
        const [r, g, b, a] = colorMap(val);
        p5.noStroke();
        p5.fill(r, g, b, a);
        p5.rect(X, Y, step + 1, step + 1);
      }
    }

    // Optional “contour” lines by thresholding a few levels
    if (showContours) {
      p5.stroke(40, 40, 60, 140);
      p5.noFill();
      const levels = 8;
      for (let i = 1; i < levels; i++) {
        const target = minU + (i / levels) * (maxU - minU);
        // draw small dots where |U - target| is small
        for (let Y = margin; Y < p5.height - margin; Y += step) {
          for (let X = margin; X < p5.width - margin; X += step) {
            const [x, y] = toWorld(p5, X, Y);
            const val = U(x, y);
            if (Math.abs(val - target) < 0.04 * (maxU - minU)) {
              p5.point(X, Y);
            }
          }
        }
      }
    }

    // Show sources for "charges" mode
    if (mode === "charges") {
      const [x1, y1] = toCanvas(p5, -sep / 2, 0);
      const [x2, y2] = toCanvas(p5, +sep / 2, 0);
      p5.noStroke();
      // q1
      p5.fill(q1 >= 0 ? "#ef4444" : "#3b82f6");
      p5.circle(x1, y1, 14);
      // q2
      p5.fill(q2 >= 0 ? "#ef4444" : "#3b82f6");
      p5.circle(x2, y2, 14);
    }

    // Optional gradient arrows (−∇U direction = force direction)
    if (showGrad) {
      p5.stroke(30, 120, 120, 180);
      const gStep = 30;
      for (let Y = margin + 15; Y < p5.height - margin; Y += gStep) {
        for (let X = margin + 15; X < p5.width - margin; X += gStep) {
          const [x, y] = toWorld(p5, X, Y);
          const [dUx, dUy] = gradU(x, y);
          const fx = -dUx;
          const fy = -dUy;
          // scale for visibility
          const s = 0.12;
          const x2 = X + s * fx;
          const y2 = Y + s * fy;
          p5.line(X, Y, x2, y2);
        }
      }
    }

    // Axes (light)
    p5.stroke(0, 0, 0, 60);
    p5.line(0, p5.height / 2, p5.width, p5.height / 2);
    p5.line(p5.width / 2, 0, p5.width / 2, p5.height);
  };

  const draw = (p5) => {
    // Background (recomputed when params change)
    drawBackground(p5);

    const now = p5.millis();
    let dt = (now - prevTimeRef.current) / 1000;
    dt = Math.min(dt, 0.05);
    prevTimeRef.current = now;

    // Update physics
    let { x, y, vx, vy } = stateRef.current;

    if (running && !draggingRef.current) {
      const [dUx, dUy] = gradU(x, y);
      const fx = -dUx - damping * vx;
      const fy = -dUy - damping * vy;

      // Semi-implicit Euler
      vx += (fx / mass) * dt;
      vy += (fy / mass) * dt;
      x += vx * dt;
      y += vy * dt;

      // Keep inside canvas a bit
      const pad = 20;
      const maxX = p5.width / 2 - pad;
      const maxY = p5.height / 2 - pad;
      x = Math.max(-maxX, Math.min(maxX, x));
      y = Math.max(-maxY, Math.min(maxY, y));
    }

    stateRef.current = { x, y, vx, vy };

    // Draw bead
    const [X, Y] = toCanvas(p5, x, y);
    p5.noStroke();
    p5.fill("#111");
    p5.circle(X, Y, 12);

    // Draw a small velocity arrow
    p5.stroke(20, 150, 150);
    p5.line(X, Y, X + 10 * vx, Y + 10 * vy);
  };

  // ---------- Mouse interactions ----------
  const mousePressed = (p5) => {
    const { x, y } = stateRef.current;
    const [X, Y] = toCanvas(p5, x, y);
    const d = p5.dist(p5.mouseX, p5.mouseY, X, Y);
    if (d < 10) draggingRef.current = true;
  };
  const mouseDragged = (p5) => {
    if (!draggingRef.current) return;
    const [wx, wy] = toWorld(p5, p5.mouseX, p5.mouseY);
    stateRef.current.x = wx;
    stateRef.current.y = wy;
    stateRef.current.vx = 0;
    stateRef.current.vy = 0;
  };
  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // ---------- Reset ----------
  const resetBead = () => {
    stateRef.current = { x: -140, y: -40, vx: 0, vy: 0 };
  };

  // ---------- Redraw when params change ----------
  useEffect(() => {
    // No-op: p5 draw uses current state each frame; this is just to tie into React deps
  }, [redrawKey]);

  return (
    <div className="container" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ marginTop: 8 }}>Potential Energy Landscape</h2>

      {/* Controls */}
      <div className="control-panel" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setRunning((s) => !s)}
            aria-pressed={running}
            style={btn(true)}
          >
            {running ? "Pause" : "Play"}
          </button>
          <button onClick={resetBead} style={btn(false)}>Reset bead</button>

          <label style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showContours}
              onChange={(e) => setShowContours(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            show contours
          </label>
          <label style={{ marginLeft: 6 }}>
            <input
              type="checkbox"
              checked={showGrad}
              onChange={(e) => setShowGrad(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            show −∇U arrows
          </label>
        </div>

        <div className="slider-group" style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: 600 }}>Landscape:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
                fontWeight: 600,
              }}
            >
              <option value="bowl">Quadratic bowl</option>
              <option value="double">Double well</option>
              <option value="charges">Two charges (U = kq/r)</option>
            </select>
          </div>

          {/* Common sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <label>
              Mass: {mass.toFixed(2)}
              <input
                type="range"
                min="0.2"
                max="5"
                step="0.1"
                value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
              />
            </label>
            <label>
              Damping: {damping.toFixed(2)}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={damping}
                onChange={(e) => setDamping(parseFloat(e.target.value))}
              />
            </label>
          </div>

          {/* Mode-specific sliders */}
          {mode === "bowl" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>
                k (curvature): {kBowl.toFixed(2)}
                <input
                  type="range"
                  min="0.05"
                  max="2.0"
                  step="0.05"
                  value={kBowl}
                  onChange={(e) => setKBowl(parseFloat(e.target.value))}
                />
              </label>
            </div>
          )}

          {mode === "double" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>
                a (well depth): {aDouble.toFixed(3)}
                <input
                  type="range"
                  min="0.0005"
                  max="0.01"
                  step="0.0005"
                  value={aDouble}
                  onChange={(e) => setADouble(parseFloat(e.target.value))}
                />
              </label>
              <label>
                b (well centers): {bDouble.toFixed(0)}
                <input
                  type="range"
                  min="60"
                  max="200"
                  step="1"
                  value={bDouble}
                  onChange={(e) => setBDouble(parseFloat(e.target.value))}
                />
              </label>
              <label>
                c (vertical curvature): {cDouble.toFixed(3)}
                <input
                  type="range"
                  min="0.001"
                  max="0.02"
                  step="0.001"
                  value={cDouble}
                  onChange={(e) => setCDouble(parseFloat(e.target.value))}
                />
              </label>
            </div>
          )}

          {mode === "charges" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <label>
                q₁: {q1.toFixed(1)}
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={q1}
                  onChange={(e) => setQ1(parseFloat(e.target.value))}
                />
              </label>
              <label>
                q₂: {q2.toFixed(1)}
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={q2}
                  onChange={(e) => setQ2(parseFloat(e.target.value))}
                />
              </label>
              <label>
                separation: {sep.toFixed(0)} px
                <input
                  type="range"
                  min="80"
                  max="300"
                  step="1"
                  value={sep}
                  onChange={(e) => setSep(parseFloat(e.target.value))}
                />
              </label>
              <label>
                softening: {soft.toFixed(0)} px
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={soft}
                  onChange={(e) => setSoft(parseFloat(e.target.value))}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="canvases" style={{ marginTop: 10 }}>
        <div className="canvas">
          <Sketch
            setup={setup}
            draw={draw}
            mousePressed={mousePressed}
            mouseDragged={mouseDragged}
            mouseReleased={mouseReleased}
          />
        </div>
      </div>

      {/* Exposition block (re-usable style via your HiddenExposition) */}
      <HiddenExposition title="Why does the bead accelerate down −∇U?">
        <p>
          The potential energy gradient gives the direction of steepest increase in{" "}
          <em>U</em>. Forces derived from a potential are{" "}
          <MathJax inline>{"\\( \\vec F = -\\nabla U \\)"}</MathJax>, so the bead
          feels a force pushing it “downhill.” With damping, the motion settles into a
          minimum; with little damping, it can oscillate and even cross between wells.
        </p>
      </HiddenExposition>
    </div>
  );
}
