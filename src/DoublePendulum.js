// src/DoublePendulum.js
import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';
import { Link } from 'react-router-dom';

export default function DoublePendulum() {
  // Adjustable parameters via sliders
  const [l1, setL1] = useState(200); // length of first arm
  const [l2, setL2] = useState(200); // length of second arm
  const [m1, setM1] = useState(20);  // mass of first bob (ellipse diameter)
  const [m2, setM2] = useState(20);  // mass of second bob
  const [simSpeed, setSimSpeed] = useState(1); // simulation speed multiplier

  // Simulation state (angles and angular velocities)
  const stateRef = useRef({
    theta1: 0.1,
    theta2: 2.5,
    omega1: 0,
    omega2: 0,
  });

  // History for phase plot (store timestamp, theta1, theta2)
  const historyRef = useRef([]);

  // Ref to track which bob (if any) is being dragged
  const draggingRef = useRef(null);

  const g = 1; // gravitational constant (adjust as needed)
  const prevTime = useRef(0);

  // ===================== Simulation Canvas =====================
  const setupSim = (p5, canvasParentRef) => {
    p5.createCanvas(600, 600).parent(canvasParentRef);
    prevTime.current = p5.millis();
  };

  const drawSim = (p5) => {
    p5.background(255);

    // Compute time step in seconds; cap for stability, then scale with simSpeed
    let dt = (p5.millis() - prevTime.current) / 1000;
    if (dt > 0.05) dt = 0.05;
    dt *= simSpeed*10;
    prevTime.current = p5.millis();

    // Retrieve current simulation state
    let { theta1, theta2, omega1, omega2 } = stateRef.current;
    const delta = theta2 - theta1;

    // Only update physics when not dragging a bob
    if (!draggingRef.current) {
      const denominator1 = l1 * (2 * m1 + m2 - m2 * p5.cos(2 * delta));
      const domega1 = (
        -g * (2 * m1 + m2) * p5.sin(theta1)
        - m2 * g * p5.sin(theta1 - 2 * theta2)
        - 2 * p5.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * p5.cos(delta))
      ) / denominator1;

      const domega2 = (
        2 * p5.sin(delta) * (
          omega1 * omega1 * l1 * (m1 + m2)
          + g * (m1 + m2) * p5.cos(theta1)
          + omega2 * omega2 * l2 * m2 * p5.cos(delta)
        )
      ) / (l2 * (2 * m1 + m2 - m2 * p5.cos(2 * delta)));

      omega1 += domega1 * dt;
      omega2 += domega2 * dt;
      theta1 += omega1 * dt;
      theta2 += omega2 * dt;
    }

    // Save the updated state
    stateRef.current = { theta1, theta2, omega1, omega2 };

    // Record history for the phase plot
    const now = p5.millis();
    historyRef.current.push({ time: now, theta1, theta2 });
    // Keep only the last 10 seconds of data
    const cutoff = now - 10000;
    historyRef.current = historyRef.current.filter((pt) => pt.time >= cutoff);

    // Calculate pendulum bob positions
    const originX = 300;
    const originY = 150;
    const x1 = originX + l1 * p5.sin(theta1);
    const y1 = originY + l1 * p5.cos(theta1);
    const x2 = x1 + l2 * p5.sin(theta2 + Math.PI);
    const y2 = y1 + l2 * p5.cos(theta2 + Math.PI);

    // Draw the pendulum arms
    p5.stroke(0);
    p5.strokeWeight(2);
    p5.line(originX, originY, x1, y1);
    p5.line(x1, y1, x2, y2);

    // Draw the bobs
    p5.fill(127);
    p5.ellipse(x1, y1, m1, m1);
    p5.ellipse(x2, y2, m2, m2);
  };

  // ===================== Phase Plot Canvas =====================
  const setupPhasePlot = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
  };

  const drawPhasePlot = (p5) => {
    // Clear background with some transparency to create a fading effect
    p5.background(255, 255, 255, 50);
    const now = p5.millis();
    const cutoff = now - 10000; // 10-second history

    historyRef.current.forEach((pt) => {
      // Map theta1 from [-PI, PI] to x position [0, p5.width]
      const x = p5.map(pt.theta1, -Math.PI, Math.PI, 100, p5.width/1.5);
      // Map theta2 from [-PI, PI] to y position [p5.height, 0] (inverting y-axis)
      const y = p5.map(pt.theta2, -Math.PI, Math.PI, p5.height/1.5, 100);
      
      // Compute alpha based on age: older points are more transparent.
      const alpha = p5.map(pt.time, cutoff, now, 50, 255);
      
      p5.noStroke();
      p5.fill(0, 50, 200, alpha); // Blue color for phase points
      p5.ellipse(x, y, 2, 2);
    });
  };

  // ===================== Mouse Interactions =====================
  const mousePressed = (p5) => {
    const originX = 300;
    const originY = 150;
    const { theta1, theta2 } = stateRef.current;
    const x1 = originX + l1 * p5.sin(theta1);
    const y1 = originY + l1 * p5.cos(theta1);
    const x2 = x1 + l2 * p5.sin(theta2 + Math.PI);
    const y2 = y1 + l2 * p5.cos(theta2 + Math.PI);

    if (p5.dist(p5.mouseX, p5.mouseY, x2, y2) < m2) {
      draggingRef.current = "mass2";
    } else if (p5.dist(p5.mouseX, p5.mouseY, x1, y1) < m1) {
      draggingRef.current = "mass1";
    } else {
      draggingRef.current = null;
    }
  };

  const mouseDragged = (p5) => {
    if (draggingRef.current === "mass1") {
      const originX = 300;
      const originY = 150;
      const newTheta1 = p5.atan2(p5.mouseY - originY, p5.mouseX - originX) - Math.PI / 2;
      stateRef.current.theta1 = -newTheta1;
      stateRef.current.omega1 = 0;
    } else if (draggingRef.current === "mass2") {
      const originX = 300;
      const originY = 150;
      const { theta1 } = stateRef.current;
      const x1 = originX + l1 * p5.sin(theta1);
      const y1 = originY + l1 * p5.cos(theta1);
      const newTheta2 = -p5.atan2(p5.mouseY - y1, p5.mouseX - x1) - Math.PI/2;
      stateRef.current.theta2 = newTheta2;
      stateRef.current.omega2 = 0;
    }
  };

  const mouseReleased = () => {
    draggingRef.current = null;
  };

  // ===================== Render =====================
return (
  <div className="max-w-5xl mx-auto text-center p-6">
    <h1 className="text-2xl font-bold mb-4">
      Double Pendulum Simulation with Phase Plot
    </h1>
    {/* Control Panel above canvases */}
    <div className="flex justify-center mb-4">
      <div className="space-y-4 max-w-md w-full">
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
          <span> {l1}px</span>
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
          <span> {l2}px</span>
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
          <span> {m1}</span>
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
          <span> {m2}</span>
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
          <span> {simSpeed}x</span>
        </div>
      </div>
    </div>
    {/* Canvases container */}
    <div className="flex flex-row justify-center">
      <div className="m-2">
        <Sketch
          setup={setupSim}
          draw={drawSim}
          mousePressed={mousePressed}
          mouseDragged={mouseDragged}
          mouseReleased={mouseReleased}
        />
      </div>
      <div className="m-2">
        <Sketch
          setup={setupPhasePlot}
          draw={drawPhasePlot}
        />
      </div>
    </div>
    <div className="mt-4">
      <Link to="/" className="text-blue-500 hover:underline">
        Back to Landing Page
      </Link>
    </div>
  </div>
);



}
