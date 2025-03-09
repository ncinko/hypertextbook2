import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';
import './styles.css';

export default function DoublePendulum() {
  // Simulation parameters
  const [l1, setL1] = useState(200); // Length of first arm
  const [l2, setL2] = useState(200); // Length of second arm
  const [m1, setM1] = useState(20);  // Mass of first bob (diameter)
  const [m2, setM2] = useState(20);  // Mass of second bob
  const [simSpeed, setSimSpeed] = useState(1); // Simulation speed multiplier

  // Simulation state: angles (theta) and angular velocities (omega)
  const stateRef = useRef({
    theta1: 0.1,
    theta2: 2.5,
    omega1: 0,
    omega2: 0,
  });

  // History for phase plot: stores { time, theta1, theta2 }
  const historyRef = useRef([]);

  // Ref to track which bob is being dragged (if any)
  const draggingRef = useRef(null);

  // Gravitational constant and time-tracking
  const g = 1;
  const prevTimeRef = useRef(0);

  // ------------------ Responsive Simulation Sketch ------------------
  const setupSim = (p5, canvasParentRef) => {
    const resizeCanvasToParent = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      // Maintain a square canvas based on parent's width
      p5.resizeCanvas(parentWidth, parentWidth);
    };

    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    prevTimeRef.current = p5.millis();
    p5.windowResized = resizeCanvasToParent;
  };

  const drawSim = (p5) => {
    p5.background(255);

    // Calculate time step (in seconds), cap dt for stability, and scale with simSpeed
    const currentTime = p5.millis();
    let dt = (currentTime - prevTimeRef.current) / 1000;
    dt = Math.min(dt, 0.05) * simSpeed * 10;
    prevTimeRef.current = currentTime;

    let { theta1, theta2, omega1, omega2 } = stateRef.current;
    const delta = theta2 - theta1;

    // Update physics only when not dragging a bob
    if (!draggingRef.current) {
      const denom1 = l1 * (2 * m1 + m2 - m2 * p5.cos(2 * delta));
      const domega1 = (
        -g * (2 * m1 + m2) * p5.sin(theta1) -
        m2 * g * p5.sin(theta1 - 2 * theta2) -
        2 * p5.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * p5.cos(delta))
      ) / denom1;

      const domega2 = (
        2 * p5.sin(delta) * (
          omega1 * omega1 * l1 * (m1 + m2) +
          g * (m1 + m2) * p5.cos(theta1) +
          omega2 * omega2 * l2 * m2 * p5.cos(delta)
        )
      ) / (l2 * (2 * m1 + m2 - m2 * p5.cos(2 * delta)));

      omega1 += domega1 * dt;
      omega2 += domega2 * dt;
      theta1 += omega1 * dt;
      theta2 += omega2 * dt;

      stateRef.current = { theta1, theta2, omega1, omega2 };
    }
    // Ensure state is up to date
    stateRef.current = { theta1, theta2, omega1, omega2 };

    // Record history for the phase plot (keep last 10 seconds)
    historyRef.current.push({ theta1, theta2, time: currentTime });
    const cutoff = currentTime - 10000;
    historyRef.current = historyRef.current.filter(pt => pt.time >= cutoff);

    // Responsive scaling: assume a base width of 600 (original design)
    const scaleFactor = p5.width / 600;
    // Use a responsive origin: center horizontally and scale vertical offset
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    // Scale pendulum lengths and masses
    const effectiveL1 = l1 * scaleFactor;
    const effectiveL2 = l2 * scaleFactor;
    const effectiveM1 = m1 * scaleFactor;
    const effectiveM2 = m2 * scaleFactor;

    // Calculate pendulum bob positions
    const x1 = originX + effectiveL1 * p5.sin(theta1);
    const y1 = originY + effectiveL1 * p5.cos(theta1);
    const x2 = x1 + effectiveL2 * p5.sin(theta2 + Math.PI);
    const y2 = y1 + effectiveL2 * p5.cos(theta2 + Math.PI);

    // Draw arms and bobs
    p5.stroke(0);
    p5.strokeWeight(2);
    p5.line(originX, originY, x1, y1);
    p5.line(x1, y1, x2, y2);

    p5.fill(127);
    p5.ellipse(x1, y1, effectiveM1, effectiveM1);
    p5.ellipse(x2, y2, effectiveM2, effectiveM2);
  };

  // ------------------ Responsive Mouse Interactions ------------------
  const mousePressed = (p5) => {
    const scaleFactor = p5.width / 600;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const effectiveL1 = l1 * scaleFactor;
    const effectiveL2 = l2 * scaleFactor;
    const effectiveM1 = m1 * scaleFactor;
    const effectiveM2 = m2 * scaleFactor;
    const { theta1, theta2 } = stateRef.current;
    const x1 = originX + effectiveL1 * p5.sin(theta1);
    const y1 = originY + effectiveL1 * p5.cos(theta1);
    const x2 = x1 + effectiveL2 * p5.sin(theta2 + Math.PI);
    const y2 = y1 + effectiveL2 * p5.cos(theta2 + Math.PI);

    if (p5.dist(p5.mouseX, p5.mouseY, x1, y1) < effectiveM1) {
      draggingRef.current = 'mass1';
    } else if (p5.dist(p5.mouseX, p5.mouseY, x2, y2) < effectiveM2) {
      draggingRef.current = 'mass2';
    } else {
      draggingRef.current = false;
    }
  };

  const mouseDragged = (p5) => {
    const scaleFactor = p5.width / 600;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    if (draggingRef.current === 'mass1') {
      const newTheta1 = p5.atan2(p5.mouseY - originY, p5.mouseX - originX) - Math.PI / 2;
      stateRef.current.theta1 = -newTheta1;
      stateRef.current.omega1 = 0;
    } else if (draggingRef.current === 'mass2') {
      const { theta1 } = stateRef.current;
      const effectiveL1 = l1 * scaleFactor;
      const x1 = originX + effectiveL1 * p5.sin(theta1);
      const y1 = originY + effectiveL1 * p5.cos(theta1);
      const newTheta2 = -p5.atan2(p5.mouseY - y1, p5.mouseX - x1) - Math.PI / 2;
      stateRef.current.theta2 = newTheta2;
      stateRef.current.omega2 = 0;
    }
  };

  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // ------------------ Responsive Phase Plot Sketch ------------------
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
    p5.background(255);

    // Define margins and mapping ranges for θ1 and θ2
    const margin = 50;
    const xMin = -Math.PI, xMax = Math.PI;
    const yMin = -Math.PI, yMax = Math.PI;

    // Draw axes
    p5.stroke(0);
    p5.strokeWeight(1);
    const yAxisPos = p5.map(0, yMin, yMax, p5.height - margin, margin);
    p5.line(margin, yAxisPos, p5.width - margin, yAxisPos);
    const xAxisPos = p5.map(0, xMin, xMax, margin, p5.width - margin);
    p5.line(xAxisPos, margin, xAxisPos, p5.height - margin);

    // Draw phase plot points
    p5.noStroke();
    p5.fill(50, 100, 200, 150);
    historyRef.current.forEach(pt => {
      const x = p5.map(pt.theta1, xMin, xMax, margin, p5.width - margin);
      // Shifting theta2 by π to adjust the phase plot range
      const y = p5.map(pt.theta2 + Math.PI, yMin, yMax, p5.height - margin, margin);
      p5.ellipse(x, y, 2, 2);
    });
  };

  // ------------------ Render ------------------
  return (
    <div className="container">
      <h1 style={{ fontSize: "2rem", fontWeight: "600", marginTop: "1rem", color: "#111" }}>Double Pendulum</h1>
      <div className="control-panel">
        <div className="slider-group">
          <div>
            <label>
              Length 1:&nbsp;
              <input
                type="range"
                min="50"
                max="300"
                value={l1}
                onChange={(e) => setL1(parseFloat(e.target.value))}
              />
            </label>
            <span>{l1}px</span>
          </div>
          <div>
            <label>
              Length 2:&nbsp;
              <input
                type="range"
                min="50"
                max="300"
                value={l2}
                onChange={(e) => setL2(parseFloat(e.target.value))}
              />
            </label>
            <span>{l2}px</span>
          </div>
          <div>
            <label>
              Mass 1:&nbsp;
              <input
                type="range"
                min="10"
                max="50"
                value={m1}
                onChange={(e) => setM1(parseFloat(e.target.value))}
              />
            </label>
            <span>{m1}</span>
          </div>
          <div>
            <label>
              Mass 2:&nbsp;
              <input
                type="range"
                min="10"
                max="50"
                value={m2}
                onChange={(e) => setM2(parseFloat(e.target.value))}
              />
            </label>
            <span>{m2}</span>
          </div>
          <div>
            <label>
              Simulation Speed:&nbsp;
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={simSpeed}
                onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
              />
            </label>
            <span>{simSpeed}x</span>
          </div>
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
          <Sketch setup={setupPhasePlot} draw={drawPhasePlot} />
        </div>
      </div>
    </div>
  );
}
