import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';

const MassSpringSimulation = ({ initialK = 0.5, initialMass = 1, initialDamping = 0.02 }) => {
  // State variables (using SI units)
  const [k, setK] = useState(initialK);
  const [mass, setMass] = useState(initialMass);
  const [damping, setDamping] = useState(initialDamping);
  const [showTrace, setShowTrace] = useState(true);

  // Simulation state: x (in meters) and velocity v (in m/s)
  // Initial displacement is now in meters.
  const stateRef = useRef({ x: 0.2, v: 0 });
  // History for the trace (records x, v, and timestamp)
  const historyRef = useRef([]);
  const prevTimeSim = useRef(0);
  const draggingRef = useRef(false);
  const massSize = 30; // For mouse detection (in pixels)

  // --- Constants for drawing ---
  // Scaling factor to convert meters to pixels.
  const meterToPixel = 100;
  // Define the simulation region: we now place the spring-mass system on the right.
  const simOriginX = 0.75; // fraction of canvas width for the spring's fixed origin
  // For vertical placement of the spring system, define:
  const originYFrac = 0.125; // fraction of canvas height for the pivot's y position
  const eqFrac = 0.5;      // fraction offset for the equilibrium position

  // Maximum history time (ms) to display in the trace.
  const historyDuration = 10000; // 10 seconds
  // Maximum horizontal trace length in pixels.
  const traceMaxWidth = 300;

  // --- Simulation Sketch ---
  const setupSim = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
    prevTimeSim.current = p5.millis();
  };

  const drawSim = (p5) => {
    p5.background(255);
    let currentTime = p5.millis();
    let dt = (currentTime - prevTimeSim.current) / 1000;
    if (dt > 0.05) dt = 0.05;
    prevTimeSim.current = currentTime;

    // --- Update simulation state ---
    let { x, v } = stateRef.current;
    // Mass-spring equation: m*x'' = -k*x - damping*v
    const a = (-k * x - damping * v) / mass;
    if (!draggingRef.current) {
      v += a * dt;
      x += v * dt;
      stateRef.current = { x, v };
    }

    // Record simulation history (x, v in SI and timestamp)
    historyRef.current.push({ x, v, t: currentTime });
    historyRef.current = historyRef.current.filter((pt) => pt.t >= currentTime - historyDuration);

    // --- Determine drawing coordinates ---
    // Fixed pivot (origin) for the spring is at:
    const originX = p5.width * simOriginX;
    const originY = p5.height * originYFrac;
    // Equilibrium position is below the pivot:
    const equilibriumY = originY + p5.height * eqFrac;
    // Mass position (convert displacement x in meters to pixels):
    const massY = equilibriumY + x * meterToPixel;

    // --- Draw the spring ---
    p5.stroke(0);
    p5.strokeWeight(2);
    const segments = 12;
    const springLength = massY - originY;
    const segLength = springLength / segments;
    const amplitude = 20;
    p5.noFill();
    p5.beginShape();
    p5.vertex(originX, originY);
    for (let i = 1; i < segments; i++) {
      const offset = (i % 2 === 0) ? amplitude : -amplitude;
      p5.vertex(originX + offset, originY + i * segLength);
    }
    p5.vertex(originX, massY);
    p5.endShape();

    // --- Draw the mass ---
    p5.fill(127);
    p5.ellipse(originX, massY, 20 * Math.sqrt(mass), 20 * Math.sqrt(mass));

    // --- Draw the trace if enabled ---
    if (showTrace) {
      p5.stroke(200, 0, 0);
      p5.strokeWeight(2);
      p5.noFill();
      p5.beginShape();
      // For each recorded history point, calculate its horizontal offset:
      historyRef.current.forEach((pt) => {
        const timeDelta = currentTime - pt.t;
        // Map timeDelta (0 to historyDuration) to horizontal offset (0 to traceMaxWidth)
        const offsetX = p5.map(timeDelta, 0, historyDuration, 0, traceMaxWidth);
        // The x position of the trace is the spring's origin minus offsetX.
        const traceX = originX - offsetX;
        // The y position is determined by the displacement at that time.
        const traceY = equilibriumY + pt.x * meterToPixel;
        p5.vertex(traceX, traceY);
      });
      p5.endShape();
    }
  };

  const mousePressed = (p5) => {
    const originX = p5.width * simOriginX;
    const originY = p5.height * originYFrac;
    const equilibriumY = originY + p5.height * eqFrac;
    const { x } = stateRef.current;
    const massY = equilibriumY + x * meterToPixel;
    if (p5.dist(p5.mouseX, p5.mouseY, originX, massY) < massSize / 2) {
      draggingRef.current = true;
    } else if (p5.mouseX < p5.width * 0.6) {
      setShowTrace(!showTrace);
    }
  };

  const mouseDragged = (p5) => {
    if (draggingRef.current) {
      const originY = p5.height * originYFrac;
      const equilibriumY = originY + p5.height * eqFrac;
      // Update x based on mouseY relative to equilibrium (convert pixels to meters)
      let newX = (p5.mouseY - equilibriumY) / meterToPixel;
      stateRef.current.x = newX;
      stateRef.current.v = 0;
    }
  };

  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // --- Phase Plot Sketch (Displacement vs. Velocity) ---
  const setupPhase = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
  };

  const drawPhase = (p5) => {
    p5.background(255);
    
    // Draw axes (centered at zero for both displacement and velocity)
    p5.stroke(0);
    p5.strokeWeight(1);
    p5.line(0, p5.height / 2, p5.width, p5.height / 2); // Displacement axis
    p5.line(p5.width / 2, 0, p5.width / 2, p5.height); // Velocity axis

    // Set mapping ranges for displacement (x) and velocity (v)
    const xMin = -1.5, xMax = 1.5;
    const vMin = -2, vMax = 2;
    
    // Get the current time for fade calculation
    const currentTime = p5.millis();
    const fadeDuration = 7000; // Time in ms over which traces fade out

    // Plot the phase trajectory with fading effect
    p5.noFill();
    p5.strokeWeight(2);
    
    for (let i = 1; i < historyRef.current.length; i++) {
        const pt1 = historyRef.current[i - 1];
        const pt2 = historyRef.current[i];

        const plotX1 = p5.map(pt1.x, xMin, xMax, 0, p5.width);
        const plotY1 = p5.map(pt1.v, vMin, vMax, p5.height, 0);
        const plotX2 = p5.map(pt2.x, xMin, xMax, 0, p5.width);
        const plotY2 = p5.map(pt2.v, vMin, vMax, p5.height, 0);

        // Calculate fade based on how old the point is
        const timeDelta = currentTime - pt1.t;
        const alpha = p5.map(timeDelta, 0, fadeDuration, 255, 0, true); // Fade from full to transparent

        if (alpha > 0) { // Only draw if still visible
            p5.stroke(0, 150, 150, alpha); // Blue with fading opacity
            p5.line(plotX1, plotY1, plotX2, plotY2); // Draw fading line segments
        }
    }
};



  return (
    <div className="container flex flex-col items-center">
      {/* Control Panel */}
      <div className="control-panel w-full max-w-lg">
        <div className="slider-group">
          <div className="slider-item">
            <label>Spring Constant</label>
            <input type="range" min="0.1" max="2" step="0.01" value={k} onChange={(e) => setK(parseFloat(e.target.value))} />
            <span>{k.toFixed(1)} N/m</span>
          </div>
          <div className="slider-item">
            <label>Mass</label>
            <input type="range" min="0.5" max="5" step="0.1" value={mass} onChange={(e) => setMass(parseFloat(e.target.value))} />
            <span>{mass.toFixed(1)} kg</span>
          </div>
          <div className="slider-item">
            <label>Damping</label>
            <input type="range" min="0" max="0.1" step="0.005" value={damping} onChange={(e) => setDamping(parseFloat(e.target.value))} />
            <span>{damping.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Layout with two canvases side by side */}
      <div className="canvases flex flex-wrap justify-center gap-4 w-full">
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
};

export default MassSpringSimulation;
