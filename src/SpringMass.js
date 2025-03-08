// src/SpringMass.js
import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';
import { Link } from 'react-router-dom';
import './styles.css';  // Import your custom styles

export default function SpringMass() {
  // Control panel state
  const [k, setK] = useState(0.5);             // Spring constant
  const [mass, setMass] = useState(1);           // Mass
  const [damping, setDamping] = useState(0.02);    // Damping factor

  // Simulation state stored in a ref (to avoid re-renders)
  // x: displacement from equilibrium; v: velocity
  const stateRef = useRef({ x: 50, v: 0 });
  // History for phase plot: array of { x, v, t }
  const historyRef = useRef([]);
  const prevTimeSim = useRef(0);
  // For tracking dragging status
  const draggingRef = useRef(false);
  // Define the mass size (diameter) for both drawing and hit detection
  const massSize = 30;

  // ===== Simulation Canvas (Spring Animation) =====
  const setupSim = (p5, canvasParentRef) => {
    p5.createCanvas(600, 400).parent(canvasParentRef);
    prevTimeSim.current = p5.millis();
  };

  const drawSim = (p5) => {
    p5.background(255);

    // Calculate time step in seconds (with a cap for stability)
    let currentTime = p5.millis();
    let dt = (currentTime - prevTimeSim.current) / 1000;
    if (dt > 0.05) dt = 0.05;
    prevTimeSim.current = currentTime;

    // Retrieve current simulation state
    let { x, v } = stateRef.current;

    // Compute acceleration using Hooke's Law with damping: a = (-k*x - damping*v) / mass
    const a = (-k * x - damping * v) / mass;

    // Only update physics when not dragging
    if (!draggingRef.current) {
      v += a * dt;
      x += v * dt;
      stateRef.current = { x, v };
    }
    // Push the current state into history for the phase plot
    historyRef.current.push({ x, v, t: currentTime });
    // Keep only data from the last 10 seconds
    const cutoff = currentTime - 10000;
    historyRef.current = historyRef.current.filter((pt) => pt.t >= cutoff);

    // Define drawing coordinates for the simulation:
    const originX = 300;
    const originY = 50;
    // Equilibrium position (vertical)
    const equilibriumY = originY + 200;
    // Current mass position is equilibrium plus displacement
    const massY = equilibriumY + x;

    // Draw the spring as a zig-zag between the fixed origin and the mass
    p5.stroke(0);
    p5.strokeWeight(2);
    const segments = 12;
    const springLength = massY - originY;
    const segLength = springLength / segments;
    const amplitude = 20; // width of spring coils
    p5.noFill();
    p5.beginShape();
    p5.vertex(originX, originY);
    for (let i = 1; i < segments; i++) {
      const offset = (i % 2 === 0) ? amplitude : -amplitude;
      p5.vertex(originX + offset, originY + i * segLength);
    }
    p5.vertex(originX, massY);
    p5.endShape();

    // Draw the mass as a red circle
    p5.fill(127);
    p5.ellipse(originX, massY, 20*Math.sqrt(mass), 20*Math.sqrt(mass));
  };

  // ===== Mouse Interactions for Dragging the Mass =====
  const mousePressed = (p5) => {
    const originX = 300;
    const originY = 50;
    const equilibriumY = originY + 200;
    const { x } = stateRef.current;
    const massY = equilibriumY + x;
    // Check if the mouse is within half the mass's diameter (i.e. a circle radius)
    const d = p5.dist(p5.mouseX, p5.mouseY, originX, massY);
    if (d < massSize / 2) {
      draggingRef.current = true;
    }
  };

  const mouseDragged = (p5) => {
    if (draggingRef.current) {
      const originY = 50;
      const equilibriumY = originY + 200;
      // New displacement is mouseY minus equilibrium position
      let newX = p5.mouseY - equilibriumY;
      // Update the simulation state and reset velocity
      stateRef.current.x = newX;
      stateRef.current.v = 0;
    }
  };

  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // ===== Phase Plot Canvas (Displacement vs. Velocity) =====
  const setupPhase = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
    p5.loop(); // Ensure continuous redraw
  };

  const drawPhase = (p5) => {
    p5.background(255);

    // Draw axis lines
    p5.stroke(0);
    p5.strokeWeight(1);
    const cx = p5.width / 2;
    const cy = p5.height / 2;
    p5.line(cx, 0, cx, p5.height); // vertical axis
    p5.line(0, cy, p5.width, cy);  // horizontal axis

    // Define fixed mapping ranges for phase plot:
    // Displacement (x): from -150 to 150
    // Velocity (v): from -200 to 200
    const xMin = -150;
    const xMax = 150;
    const vMin = -200;
    const vMax = 200;

    // Plot each recorded state as a small ellipse on the phase plot
    p5.noStroke();
    p5.fill(50, 100, 200, 150);
    historyRef.current.forEach((pt) => {
      const plotX = p5.map(pt.x, xMin, xMax, 0, p5.width);
      // Invert y so that higher velocity appears toward the top
      const plotY = p5.map(pt.v, vMin, vMax, p5.height, 0);
      p5.ellipse(plotX, plotY, 4, 4);
    });
  };

  return (
    <div className="container">
      <h1>Harmonic Oscillator</h1>
      {/* Control Panel */}
      <div className="control-panel">
        <div className="slider-group">
          <div>
            <label>
              Spring Constant (k): {k.toFixed(2)}
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.01"
                value={k}
                onChange={(e) => setK(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Mass (m): {mass.toFixed(2)}
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={mass}
                onChange={(e) => setMass(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              Damping: {damping.toFixed(2)}
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.005"
                value={damping}
                onChange={(e) => setDamping(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>
      {/* Canvases: Simulation and Phase Plot Side by Side */}
      <div className="canvases">
        <div className="canvas">
          <Sketch
            setup={setupSim}
            draw={drawSim}
            mousePressed={mousePressed}
            mouseDragged={mouseDragged}
            mouseReleased={mouseReleased}
          />
        </div>
        <div className="canvas">
          <Sketch setup={setupPhase} draw={drawPhase} />
        </div>
      </div>
    </div>
  );
}
