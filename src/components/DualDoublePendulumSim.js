import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';

export default function DualDoublePendulumSim() {
  // Common simulation parameters (lengths in pixels, masses in pixels as diameter)
  const [l1, setL1] = useState(200);
  const [l2, setL2] = useState(100);
  const [m1, setM1] = useState(50);
  const [m2, setM2] = useState(5);
  const [simSpeed, setSimSpeed] = useState(10);
  const g = 1;

  // Initial conditions for Pendulum 1 (left)
  const [initTheta1_1, setInitTheta1_1] = useState(1);
  const [initTheta2_1, setInitTheta2_1] = useState(4.5);
  // Initial conditions for Pendulum 2 (right)
  const [initTheta1_2, setInitTheta1_2] = useState(1);
  const [initTheta2_2, setInitTheta2_2] = useState(4.51);

  // Simulation states for each pendulum: {theta1, theta2, omega1, omega2}
  const state1Ref = useRef({ theta1: initTheta1_1, theta2: initTheta2_1, omega1: 0, omega2: 0 });
  const state2Ref = useRef({ theta1: initTheta1_2, theta2: initTheta2_2, omega1: 0, omega2: 0 });

  // Histories for phase plot (each stores objects: {theta1, theta2, time})
  const history1Ref = useRef([]);
  const history2Ref = useRef([]);

  // Dragging flags for each simulation
  const dragging1Ref = useRef(null);
  const dragging2Ref = useRef(null);

  // Time trackers for each simulation
  const prevTime1Ref = useRef(0);
  const prevTime2Ref = useRef(0);

  // Helper: Normalize an angle to [-π, π]
  const normalizeAngle = (angle) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  // ------------------ Double Pendulum Dynamics ------------------
  // Standard equations (scaled units):
  // delta = theta1 - theta2
  // domega1 = [ -g*(2*m1+m2)*sin(theta1) - m2*g*sin(theta1-2*theta2)
  //            - 2*sin(delta)*m2*(omega2²*l2 + omega1²*l1*cos(delta)) ]
  //          / [ l1*(2*m1+m2 - m2*cos(2*delta)) ]
  //
  // domega2 = [ 2*sin(delta)*( omega1²*l1*(m1+m2) + g*(m1+m2)*cos(theta1)
  //            + omega2²*l2*m2*cos(delta) ) ]
  //          / [ l2*(2*m1+m2 - m2*cos(2*delta)) ]
  const updateDoublePendulum = (state, dt) => {
    let { theta1, theta2, omega1, omega2 } = state;
    const delta = theta1 - theta2;
    const denom1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const domega1 = (
      -g * (2 * m1 + m2) * Math.sin(theta1)
      - m2 * g * Math.sin(theta1 - 2 * theta2)
      - 2 * Math.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta))
    ) / denom1;
    const denom2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * delta));
    const domega2 = (
      2 * Math.sin(delta) * (omega1 * omega1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(theta1) + omega2 * omega2 * l2 * m2 * Math.cos(delta))
    ) / denom2;
    omega1 += domega1 * dt;
    omega2 += domega2 * dt;
    theta1 += omega1 * dt;
    theta2 += omega2 * dt;
    return { theta1, theta2, omega1, omega2 };
  };

  const pixelfactor = 600;
  // ------------------ Simulation 1 (Left, Red) ------------------
  const setupSim1 = (p5, canvasParentRef) => {
    const resize = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      p5.resizeCanvas(parentWidth, parentWidth);
    };
    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    prevTime1Ref.current = p5.millis();
    p5.windowResized = resize;
  };

  const drawSim1 = (p5) => {
    p5.background("#f8f9fa");
    const currentTime = p5.millis();
    let dt = (currentTime - prevTime1Ref.current) / 1000;
    dt = Math.min(dt, 0.05) * simSpeed;
    prevTime1Ref.current = currentTime;
    if (!dragging1Ref.current) {
      state1Ref.current = updateDoublePendulum(state1Ref.current, dt);
    }
    history1Ref.current.push({ theta1: state1Ref.current.theta1, theta2: state1Ref.current.theta2, time: currentTime });
    const cutoff = currentTime - 10000;
    history1Ref.current = history1Ref.current.filter(pt => pt.time >= cutoff);
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const x1 = originX + l1 * scaleFactor * p5.sin(state1Ref.current.theta1);
    const y1 = originY + l1 * scaleFactor * p5.cos(state1Ref.current.theta1);
    const x2 = x1 + l2 * scaleFactor * p5.sin(state1Ref.current.theta2);
    const y2 = y1 + l2 * scaleFactor * p5.cos(state1Ref.current.theta2);
    p5.stroke(0);
    p5.strokeWeight(2);
    p5.line(originX, originY, x1, y1);
    p5.line(x1, y1, x2, y2);
    p5.fill(200, 50, 50);
    p5.ellipse(x1, y1, m1 * scaleFactor, m1 * scaleFactor);
    p5.ellipse(x2, y2, m2 * scaleFactor, m2 * scaleFactor);
  };

  const mousePressed1 = (p5) => {
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const x1 = originX + l1 * scaleFactor * p5.sin(state1Ref.current.theta1);
    const y1 = originY + l1 * scaleFactor * p5.cos(state1Ref.current.theta1);
    const x2 = x1 + l2 * scaleFactor * p5.sin(state1Ref.current.theta2);
    const y2 = y1 + l2 * scaleFactor * p5.cos(state1Ref.current.theta2);
    if (p5.dist(p5.mouseX, p5.mouseY, x2, y2) < m2 * scaleFactor) {
      dragging1Ref.current = 'bob2';
    } else if (p5.dist(p5.mouseX, p5.mouseY, x1, y1) < m1 * scaleFactor) {
      dragging1Ref.current = 'bob1';
    } else {
      dragging1Ref.current = null;
    }
  };

  const mouseDragged1 = (p5) => {
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    if (dragging1Ref.current === 'bob1') {
      const newTheta1 = p5.atan2(p5.mouseX - originX, p5.mouseY - originY);
      state1Ref.current = { ...state1Ref.current, theta1: newTheta1, omega1: 0 };
    } else if (dragging1Ref.current === 'bob2') {
      const x1 = originX + l1 * scaleFactor * p5.sin(state1Ref.current.theta1);
      const y1 = originY + l1 * scaleFactor * p5.cos(state1Ref.current.theta1);
      const newTheta2 = p5.atan2(p5.mouseX - x1, p5.mouseY - y1);
      state1Ref.current = { ...state1Ref.current, theta2: newTheta2, omega2: 0 };
    }
  };

  const mouseReleased1 = () => { dragging1Ref.current = null; };

  // ------------------ Simulation 2 (Right, Blue) ------------------
  const setupSim2 = (p5, canvasParentRef) => {
    const resize = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      p5.resizeCanvas(parentWidth, parentWidth);
    };
    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    prevTime2Ref.current = p5.millis();
    p5.windowResized = resize;
  };

  const drawSim2 = (p5) => {
    p5.background("#f8f9fa");
    const currentTime = p5.millis();
    let dt = (currentTime - prevTime2Ref.current) / 1000;
    dt = Math.min(dt, 0.05) * simSpeed;
    prevTime2Ref.current = currentTime;
    if (!dragging2Ref.current) {
      state2Ref.current = updateDoublePendulum(state2Ref.current, dt);
    }
    history2Ref.current.push({ theta1: state2Ref.current.theta1, theta2: state2Ref.current.theta2, time: currentTime });
    const cutoff = currentTime - 10000;
    history2Ref.current = history2Ref.current.filter(pt => pt.time >= cutoff);
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const x1 = originX + l1 * scaleFactor * p5.sin(state2Ref.current.theta1);
    const y1 = originY + l1 * scaleFactor * p5.cos(state2Ref.current.theta1);
    const x2 = x1 + l2 * scaleFactor * p5.sin(state2Ref.current.theta2);
    const y2 = y1 + l2 * scaleFactor * p5.cos(state2Ref.current.theta2);
    p5.stroke(0);
    p5.strokeWeight(2);
    p5.line(originX, originY, x1, y1);
    p5.line(x1, y1, x2, y2);
    p5.fill(50, 50, 200);
    p5.ellipse(x1, y1, m1 * scaleFactor, m1 * scaleFactor);
    p5.ellipse(x2, y2, m2 * scaleFactor, m2 * scaleFactor);
  };

  const mousePressed2 = (p5) => {
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const x1 = originX + l1 * scaleFactor * p5.sin(state2Ref.current.theta1);
    const y1 = originY + l1 * scaleFactor * p5.cos(state2Ref.current.theta1);
    const x2 = x1 + l2 * scaleFactor * p5.sin(state2Ref.current.theta2);
    const y2 = y1 + l2 * scaleFactor * p5.cos(state2Ref.current.theta2);
    if (p5.dist(p5.mouseX, p5.mouseY, x2, y2) < m2 * scaleFactor) {
      dragging2Ref.current = 'bob2';
    } else if (p5.dist(p5.mouseX, p5.mouseY, x1, y1) < m1 * scaleFactor) {
      dragging2Ref.current = 'bob1';
    } else {
      dragging2Ref.current = null;
    }
  };

  const mouseDragged2 = (p5) => {
    const scaleFactor = p5.width / pixelfactor;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    if (dragging2Ref.current === 'bob1') {
      const newTheta1 = p5.atan2(p5.mouseX - originX, p5.mouseY - originY);
      state2Ref.current = { ...state2Ref.current, theta1: newTheta1, omega1: 0 };
    } else if (dragging2Ref.current === 'bob2') {
      const x1 = originX + l1 * scaleFactor * p5.sin(state2Ref.current.theta1);
      const y1 = originY + l1 * scaleFactor * p5.cos(state2Ref.current.theta1);
      const newTheta2 = p5.atan2(p5.mouseX - x1, p5.mouseY - y1);
      state2Ref.current = { ...state2Ref.current, theta2: newTheta2, omega2: 0 };
    }
  };

  const mouseReleased2 = () => { dragging2Ref.current = null; };

  // ------------------ Phase Plot (θ₁ vs. θ₂) with Normalization ------------------
  const setupPhasePlot = (p5, canvasParentRef) => {
    const resize = () => {
      const parentWidth = canvasParentRef.getBoundingClientRect().width;
      p5.resizeCanvas(parentWidth, parentWidth);
    };
    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    p5.createCanvas(parentWidth, parentWidth).parent(canvasParentRef);
    p5.frameRate(60);
    p5.windowResized = resize;
  };

  const drawPhasePlot = (p5) => {
    p5.background("#f8f9fa");
    const margin = 20;
    const thetaMin = -Math.PI, thetaMax = Math.PI;
    p5.strokeWeight(2);
    // Vertical axis: θ₁ = 0
    const xAxisPos = p5.map(0, thetaMin, thetaMax, margin, p5.width - margin);
    p5.stroke(0);
    p5.line(xAxisPos, margin, xAxisPos, p5.height - margin);
    // Horizontal axis: θ₂ = 0
    const yAxisPos = p5.map(0, thetaMin, thetaMax, p5.height - margin, margin);
    p5.line(margin, yAxisPos, p5.width - margin, yAxisPos);
    // Plot pendulum 1 history (red) using normalized angles
    history1Ref.current.forEach(pt => {
      const normTheta1 = normalizeAngle(pt.theta1);
      const normTheta2 = normalizeAngle(pt.theta2);
      const x = p5.map(normTheta1, thetaMin, thetaMax, margin, p5.width - margin);
      const y = p5.map(normTheta2, thetaMin, thetaMax, p5.height - margin, margin);
      p5.stroke(200, 50, 50);
      p5.point(x, y);
    });
    // Plot pendulum 2 history (blue)
    history2Ref.current.forEach(pt => {
      const normTheta1 = normalizeAngle(pt.theta1);
      const normTheta2 = normalizeAngle(pt.theta2);
      const x = p5.map(normTheta1, thetaMin, thetaMax, margin, p5.width - margin);
      const y = p5.map(normTheta2, thetaMin, thetaMax, p5.height - margin, margin);
      p5.stroke(50, 50, 200);
      p5.point(x, y);
    });
  };

  // Clicking the phase plot clears both histories
  const phasePlotMousePressed = () => {
    history1Ref.current = [];
    history2Ref.current = [];
  };

  // ------------------ Set Initial Conditions ------------------
  const setInitialConditions = () => {
    state1Ref.current = { theta1: initTheta1_1, theta2: initTheta2_1, omega1: 0, omega2: 0 };
    state2Ref.current = { theta1: initTheta1_2, theta2: initTheta2_2, omega1: 0, omega2: 0 };
    history1Ref.current = [];
    history2Ref.current = [];
  };

  // ------------------ Render Layout ------------------
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '10px' }}>
      {/* Common Sliders for lengths, masses, and speed */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
        <label>
          l₁
          <input type="range" min="100" max="300" value={l1} onChange={(e) => setL1(parseFloat(e.target.value))} />
        </label>
        <label>
          l₂
          <input type="range" min="100" max="300" value={l2} onChange={(e) => setL2(parseFloat(e.target.value))} />
        </label>
        <label>
          m₁
          <input type="range" min="5" max="50" value={m1} onChange={(e) => setM1(parseFloat(e.target.value))} />
        </label>
        <label>
          m₂
          <input type="range" min="5" max="50" value={m2} onChange={(e) => setM2(parseFloat(e.target.value))} />
        </label>
        <label>
          Speed
          <input type="range" min="0.0" max="20" step="0.1" value={simSpeed} onChange={(e) => setSimSpeed(parseFloat(e.target.value))} />
        </label>
      </div>
      {/* Main Row: Left Simulation, Phase Plot, Right Simulation */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
        {/* Left Double Pendulum */}
        <div style={{ flex: '0 0 25%', textAlign: 'center' }}>
          <Sketch
            setup={setupSim1}
            draw={drawSim1}
            mousePressed={mousePressed1}
            mouseDragged={mouseDragged1}
            mouseReleased={mouseReleased1}
          />
          <div style={{ marginTop: '5px' }}>
            <label>
              θ₁:&nbsp;
              <input type="number" step = "0.01" value={initTheta1_1} onChange={(e) => setInitTheta1_1(parseFloat(e.target.value))} style={{ width: '60px' }} />
            </label>
            &nbsp;
            <label>
              θ₂:&nbsp;
              <input type="number" step = "0.01" value={initTheta2_1} onChange={(e) => setInitTheta2_1(parseFloat(e.target.value))} style={{ width: '60px' }} />
            </label>
          </div>
        </div>
        {/* Phase Plot */}
        <div style={{ flex: '0 0 40%', textAlign: 'center' }}>
          <Sketch
            setup={setupPhasePlot}
            draw={drawPhasePlot}
            mousePressed={phasePlotMousePressed}
          />
        </div>
        {/* Right Double Pendulum */}
        <div style={{ flex: '0 0 25%', textAlign: 'center' }}>
          <Sketch
            setup={setupSim2}
            draw={drawSim2}
            mousePressed={mousePressed2}
            mouseDragged={mouseDragged2}
            mouseReleased={mouseReleased2}
          />
          <div style={{ marginTop: '5px' }}>
            <label>
              θ₁:&nbsp;
              <input type="number" step = "0.01" value={initTheta1_2} onChange={(e) => setInitTheta1_2(parseFloat(e.target.value))} style={{ width: '60px' }} />
            </label>
            &nbsp;
            <label>
              θ₂:&nbsp;
              <input type="number" step = "0.01" value={initTheta2_2} onChange={(e) => setInitTheta2_2(parseFloat(e.target.value))} style={{ width: '60px' }} />
            </label>
          </div>
        </div>
      </div>
      {/* Reset Button */}
      <div style={{ textAlign: 'center', marginTop: '10px' }}>
        <button onClick={setInitialConditions} style={{ padding: '5px 10px' }}>
          Set Initial Conditions
        </button>
      </div>
    </div>
  );
}
