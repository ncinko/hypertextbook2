import React, { useState, useRef, useEffect } from 'react';
import Sketch from 'react-p5';

export default function ElasticPendulumSim() {
  // Simulation parameters
  const [m, setM] = useState(20);        // Mass of the bob (diameter)
  const [k, setK] = useState(0.5);         // Spring constant
  const [L0, setL0] = useState(100);       // Natural length of the spring
  const [simSpeed, setSimSpeed] = useState(1); // Simulation speed multiplier

  // States for initial conditions inputs
  const [initR, setInitR] = useState(L0 + 100);
  const [initTheta, setInitTheta] = useState(Math.PI / 4);
  const [initRdot, setInitRdot] = useState(0);
  const [initThetadot, setInitThetadot] = useState(0);

  // Simulation state: polar coordinates (r, theta) and their derivatives
  const stateRef = useRef({
    r: initR,
    theta: initTheta,
    r_dot: initRdot,
    theta_dot: initThetadot,
  });

  // History for phase plot: storing { time, r, theta }
  const historyRef = useRef([]);

  // Ref to track if the mass is being dragged
  const draggingRef = useRef(false);

  // Gravitational constant (using a similar scale as in the double pendulum)
  const g = 1;
  const prevTimeRef = useRef(0);

  // Initialize history with current state
  useEffect(() => {
    const { r, theta } = stateRef.current;
    const currentTime = prevTimeRef.current;
    historyRef.current.push({ r, theta, time: currentTime });
  }, []);

  // Handler for setting initial conditions manually
  const handleSetInitialConditions = () => {
    stateRef.current = {
      r: initR,
      theta: initTheta,
      r_dot: initRdot,
      theta_dot: initThetadot,
    };
    // Clear the phase plot history
    historyRef.current = [];
  };

  // ------------------ Simulation Sketch ------------------
  const setupSim = (p5, canvasParentRef) => {
    const resizeCanvasToParent = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      p5.resizeCanvas(parentWidth, parentWidth);
    };

    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    prevTimeRef.current = p5.millis();
    p5.windowResized = resizeCanvasToParent;
  };

  const drawSim = (p5) => {
    // Use site background color for consistency
    p5.background("#f8f9fa");

    // Calculate time step (seconds)
    const currentTime = p5.millis();
    let dt = (currentTime - prevTimeRef.current) / 1000;
    dt = Math.min(dt, 0.05) * simSpeed * 5;
    prevTimeRef.current = currentTime;

    let { r, theta, r_dot, theta_dot } = stateRef.current;

    // Update physics only if mass is not being dragged
    if (!draggingRef.current) {
      // Equations of motion for elastic pendulum:
      // Radial acceleration: a_r = r * theta_dot^2 - (k/m)*(r - L0) - g*cos(theta)
      // Angular acceleration: a_theta = - (2*r_dot*theta_dot)/r - (g*sin(theta))/r
      const a_r = r * theta_dot * theta_dot - (k / m) * (r - L0) - g * p5.cos(theta);
      const a_theta = - (2 * r_dot * theta_dot) / r - (g * p5.sin(theta)) / r;

      r_dot += a_r * dt;
      theta_dot += a_theta * dt;
      r += r_dot * dt;
      theta += theta_dot * dt;

      // Clamp the compression so the spring doesn't flip.
      // Here we limit r to be no less than 10% of its natural length.
      const minR = L0 * 0.1;
      if (r < minR) {
        r = minR;
        r_dot = 0;
      }

      stateRef.current = { r, theta, r_dot, theta_dot };
    }

    // Record history for phase plot (keeping last 10 seconds)
    historyRef.current.push({ r, theta, time: currentTime });
    const cutoff = currentTime - 10000;
    historyRef.current = historyRef.current.filter(pt => pt.time >= cutoff);

    // Responsive scaling (base design width 600)
    const scaleFactor = p5.width / 600;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const effectiveR = r * scaleFactor;

    // Calculate bob position (using polar coordinates)
    const x = originX + effectiveR * p5.sin(theta);
    const y = originY + effectiveR * p5.cos(theta);

    // Draw the spring as a zigzag (spring-like appearance)
    const dx = x - originX;
    const dy = y - originY;
    const numSegments = 30;
    const frequency = 5 * p5.PI; // adjust for more or fewer oscillations along the spring
    const amplitude = 10 * scaleFactor; // amplitude of the zigzag offset

    // Compute the unit vector perpendicular to the spring
    const len = Math.sqrt(dx * dx + dy * dy);
    const px = -dy / len;
    const py = dx / len;

    p5.stroke(0);
    p5.strokeWeight(2);
    p5.noFill();
    p5.beginShape();
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const baseX = originX + dx * t;
      const baseY = originY + dy * t;
      // Only offset the internal points, not the endpoints
      let offset = 0;
      if (i > 0 && i < numSegments) {
        offset = p5.sin(t * frequency) * amplitude;
      }
      const sx = baseX + px * offset;
      const sy = baseY + py * offset;
      p5.vertex(sx, sy);
    }
    p5.endShape();

    // Draw the bob (make it clickable)
    const effectiveM = m * scaleFactor; // using mass value as diameter
    p5.fill(127);
    p5.ellipse(x, y, effectiveM, effectiveM);
  };

  // ------------------ Mouse Interactions for Simulation ------------------
  const mousePressed = (p5) => {
    const scaleFactor = p5.width / 600;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const { r, theta } = stateRef.current;
    const effectiveR = r * scaleFactor;
    const x = originX + effectiveR * p5.sin(theta);
    const y = originY + effectiveR * p5.cos(theta);
    const effectiveM = m * scaleFactor;
    if (p5.dist(p5.mouseX, p5.mouseY, x, y) < effectiveM) {
      draggingRef.current = true;
    } else {
      draggingRef.current = false;
    }
  };

  const mouseDragged = (p5) => {
    if (draggingRef.current) {
      const scaleFactor = p5.width / 600;
      const originX = p5.width / 2;
      const originY = 50 * scaleFactor;
      // Compute new polar coordinates from mouse position relative to origin
      const newR = p5.dist(p5.mouseX, p5.mouseY, originX, originY) / scaleFactor;
      // Theta measured from vertical downward; use atan2(dx, dy)
      const newTheta = p5.atan2(p5.mouseX - originX, p5.mouseY - originY);
      stateRef.current = { r: newR, theta: newTheta, r_dot: 0, theta_dot: 0 };
    }
  };

  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // ------------------ Phase Plot Sketch ------------------
  // In this version, the phase plot maps theta (x-axis) from -π to π and r (y-axis) around L0.
  // Clicking on the phase plot clears the history.
  const setupPhasePlot = (p5, canvasParentRef) => {
    const resizeCanvasToParent = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      p5.resizeCanvas(parentWidth, parentWidth);
    };

    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    p5.windowResized = resizeCanvasToParent;
  };

  const drawPhasePlot = (p5) => {
    // Set background to match site color
    p5.background("#f8f9fa");

    const margin = 20;
    // Define theta range and choose a symmetric range for r around L0.
    const thetaMin = -Math.PI, thetaMax = Math.PI;
    const rDelta = 150;
    const rMin = L0 - rDelta, rMax = L0 + rDelta;

    // Draw vertical axis (theta = 0)
    const xAxisPos = p5.map(0, thetaMin, thetaMax, margin, p5.width - margin);
    p5.stroke(0);
    p5.strokeWeight(1);
    p5.line(xAxisPos, margin, xAxisPos, p5.height - margin);

    // Draw horizontal axis (r = L0)
    const yAxisPos = p5.map(L0, rMin, rMax, p5.height - margin, margin);
    p5.line(margin, yAxisPos, p5.width - margin, yAxisPos);

    // Draw phase plot points (no fade effect)
    p5.noFill();
    p5.strokeWeight(2);
    p5.stroke(20, 150, 150);
    historyRef.current.forEach(pt => {
      const x = p5.map(pt.theta, thetaMin, thetaMax, margin, p5.width - margin);
      const y = p5.map(pt.r, rMin, rMax, p5.height - margin, margin);
      p5.point(x, y);
    });
  };

  // Clear the phase plot when the phase canvas is clicked
  const phasePlotMousePressed = () => {
    historyRef.current = [];
  };

  // ------------------ Render ------------------
  return (
    <div className="container">
      <h1>Elastic Pendulum</h1>
      <div className="control-panel">
        <div className="slider-group">
          <div>
            <label>
              Mass&nbsp;
              <input
                type="range"
                min="10"
                max="50"
                value={m}
                onChange={(e) => setM(parseFloat(e.target.value))}
              />
            </label>
            <span>{m}</span>
          </div>
          <div>
            <label>
              Spring Constant&nbsp;
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={k}
                onChange={(e) => setK(parseFloat(e.target.value))}
              />
            </label>
            <span>{k}</span>
          </div>
          <div>
            <label>
              Natural Length&nbsp;
              <input
                type="range"
                min="50"
                max="200"
                value={L0}
                onChange={(e) => setL0(parseFloat(e.target.value))}
              />
            </label>
            <span>{L0}</span>
          </div>
          <div>
            <label>
              Simulation Speed&nbsp;
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={simSpeed}
                onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
        <div className="initial-conditions">
          <h2>Initial Conditions</h2>
          <div>
            <label>
              r:&nbsp;
              <input
                type="number"
                value={initR}
                onChange={(e) => setInitR(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              θ (radians):&nbsp;
              <input
                type="number"
                value={initTheta}
                onChange={(e) => setInitTheta(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              ṙ:&nbsp;
              <input
                type="number"
                value={initRdot}
                onChange={(e) => setInitRdot(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <div>
            <label>
              θ̇:&nbsp;
              <input
                type="number"
                value={initThetadot}
                onChange={(e) => setInitThetadot(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <button onClick={handleSetInitialConditions}>Set Initial Conditions</button>
        </div>
      </div>
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
          <Sketch
            setup={setupPhasePlot}
            draw={drawPhasePlot}
            mousePressed={phasePlotMousePressed}
          />
        </div>
      </div>
    </div>
  );
}
