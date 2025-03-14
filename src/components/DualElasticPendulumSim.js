import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';

export default function DualElasticPendulumSim() {
  // Common simulation parameters
  const [m, setM] = useState(20);
  const [k, setK] = useState(0.5);
  const [L0, setL0] = useState(100);
  const [simSpeed, setSimSpeed] = useState(1);
  const g = 1;

  // Initial conditions inputs for each pendulum
  const [initR1, setInitR1] = useState(L0 + 100);
  const [initTheta1, setInitTheta1] = useState(Math.PI / 4);
  const [initR2, setInitR2] = useState(L0 + 100);
  const [initTheta2, setInitTheta2] = useState(Math.PI / 3);

  // Simulation states for each pendulum
  const state1Ref = useRef({ r: initR1, theta: initTheta1, r_dot: 0, theta_dot: 0 });
  const state2Ref = useRef({ r: initR2, theta: initTheta2, r_dot: 0, theta_dot: 0 });

  // Histories for phase plot for each pendulum
  const history1Ref = useRef([]);
  const history2Ref = useRef([]);

  // Drag flags for each simulation
  const dragging1Ref = useRef(false);
  const dragging2Ref = useRef(false);

  // Time trackers for each simulation
  const prevTime1Ref = useRef(0);
  const prevTime2Ref = useRef(0);

  // ------------------ Common Functions ------------------
  const commonDrawSim = (p5, stateRef, historyRef, prevTimeRef, draggingRef) => {
    const currentTime = p5.millis();
    let dt = (currentTime - prevTimeRef.current) / 1000;
    dt = Math.min(dt, 0.05) * simSpeed * 5;
    prevTimeRef.current = currentTime;

    let { r, theta, r_dot, theta_dot } = stateRef.current;
    if (!draggingRef.current) {
      const a_r = r * theta_dot * theta_dot - (k / m) * (r - L0) - g * p5.cos(theta);
      const a_theta = - (2 * r_dot * theta_dot) / r - (g * p5.sin(theta)) / r;
      r_dot += a_r * dt;
      theta_dot += a_theta * dt;
      r += r_dot * dt;
      theta += theta_dot * dt;
      const minR = L0 * 0.1;
      if (r < minR) { r = minR; r_dot = 0; }
      stateRef.current = { r, theta, r_dot, theta_dot };
    }
    historyRef.current.push({ r, theta, time: currentTime });
    const cutoff = currentTime - 10000;
    historyRef.current = historyRef.current.filter(pt => pt.time >= cutoff);
  };

  const commonDrawPendulum = (p5, stateRef) => {
    const scaleFactor = p5.width / 600;
    const originX = p5.width / 2;
    const originY = 50 * scaleFactor;
    const { r, theta } = stateRef.current;
    const effectiveR = r * scaleFactor;
    const x = originX + effectiveR * p5.sin(theta);
    const y = originY + effectiveR * p5.cos(theta);
    return { x, y, originX, originY, scaleFactor };
  };

  const commonDrawSpring = (p5, originX, originY, x, y, scaleFactor) => {
    const dx = x - originX;
    const dy = y - originY;
    const numSegments = 30;
    const frequency = 5 * p5.PI;
    const amplitude = 10 * scaleFactor;
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
      let offset = (i > 0 && i < numSegments) ? p5.sin(t * frequency) * amplitude : 0;
      p5.vertex(baseX + px * offset, baseY + py * offset);
    }
    p5.endShape();
  };

  // ------------------ Simulation 1 (Red) ------------------
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
    commonDrawSim(p5, state1Ref, history1Ref, prevTime1Ref, dragging1Ref);
    const { x, y, originX, originY, scaleFactor } = commonDrawPendulum(p5, state1Ref);
    commonDrawSpring(p5, originX, originY, x, y, scaleFactor);
    p5.fill(200, 50, 50);
    p5.ellipse(x, y, m * scaleFactor, m * scaleFactor);
  };

  const mousePressed1 = (p5) => {
    const { x, y, originX, originY, scaleFactor } = commonDrawPendulum(p5, state1Ref);
    dragging1Ref.current = p5.dist(p5.mouseX, p5.mouseY, x, y) < m * scaleFactor;
  };

  const mouseDragged1 = (p5) => {
    if (dragging1Ref.current) {
      const scaleFactor = p5.width / 600;
      const originX = p5.width / 2;
      const originY = 50 * scaleFactor;
      const newR = p5.dist(p5.mouseX, p5.mouseY, originX, originY) / scaleFactor;
      const newTheta = p5.atan2(p5.mouseX - originX, p5.mouseY - originY);
      state1Ref.current = { r: newR, theta: newTheta, r_dot: 0, theta_dot: 0 };
    }
  };

  const mouseReleased1 = () => { dragging1Ref.current = false; };

  // ------------------ Simulation 2 (Blue) ------------------
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
    commonDrawSim(p5, state2Ref, history2Ref, prevTime2Ref, dragging2Ref);
    const { x, y, originX, originY, scaleFactor } = commonDrawPendulum(p5, state2Ref);
    commonDrawSpring(p5, originX, originY, x, y, scaleFactor);
    p5.fill(50, 50, 200);
    p5.ellipse(x, y, m * scaleFactor, m * scaleFactor);
  };

  const mousePressed2 = (p5) => {
    const { x, y, originX, originY, scaleFactor } = commonDrawPendulum(p5, state2Ref);
    dragging2Ref.current = p5.dist(p5.mouseX, p5.mouseY, x, y) < m * scaleFactor;
  };

  const mouseDragged2 = (p5) => {
    if (dragging2Ref.current) {
      const scaleFactor = p5.width / 600;
      const originX = p5.width / 2;
      const originY = 50 * scaleFactor;
      const newR = p5.dist(p5.mouseX, p5.mouseY, originX, originY) / scaleFactor;
      const newTheta = p5.atan2(p5.mouseX - originX, p5.mouseY - originY);
      state2Ref.current = { r: newR, theta: newTheta, r_dot: 0, theta_dot: 0 };
    }
  };

  const mouseReleased2 = () => { dragging2Ref.current = false; };

  // ------------------ Phase Plot ------------------
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
    const rDelta = 150;
    const rMin = L0 - rDelta, rMax = L0 + rDelta;
    // Vertical axis (θ = 0)
    const xAxisPos = p5.map(0, thetaMin, thetaMax, margin, p5.width - margin);
    p5.stroke(0);
    p5.strokeWeight(1);
    p5.line(xAxisPos, margin, xAxisPos, p5.height - margin);
    // Horizontal axis (r = L0)
    const yAxisPos = p5.map(L0, rMin, rMax, p5.height - margin, margin);
    p5.line(margin, yAxisPos, p5.width - margin, yAxisPos);
    // Pendulum 1 trace (red)
    p5.strokeWeight(2);
    history1Ref.current.forEach(pt => {
      const x = p5.map(pt.theta, thetaMin, thetaMax, margin, p5.width - margin);
      const y = p5.map(pt.r, rMin, rMax, p5.height - margin, margin);
      p5.stroke(200, 50, 50);
      p5.point(x, y);
    });
    // Pendulum 2 trace (blue)
    history2Ref.current.forEach(pt => {
      const x = p5.map(pt.theta, thetaMin, thetaMax, margin, p5.width - margin);
      const y = p5.map(pt.r, rMin, rMax, p5.height - margin, margin);
      p5.stroke(50, 50, 200);
      p5.point(x, y);
    });
  };

  // Clicking the phase plot clears both traces
  const phasePlotMousePressed = () => {
    history1Ref.current = [];
    history2Ref.current = [];
  };

  // ------------------ Set Initial Conditions ------------------
  const setInitialConditions = () => {
    state1Ref.current = { r: initR1, theta: initTheta1, r_dot: 0, theta_dot: 0 };
    state2Ref.current = { r: initR2, theta: initTheta2, r_dot: 0, theta_dot: 0 };
    history1Ref.current = [];
    history2Ref.current = [];
  };

  // ------------------ Render ------------------
  return (
    <div className="container" style={{ fontFamily: 'sans-serif', padding: '10px' }}>
      <div className="control-panel" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
        <input
          type="number"
          value={initR1}
          onChange={(e) => setInitR1(parseFloat(e.target.value))}
          placeholder="Pendulum 1 r"
          style={{ width: '80px' }}
        />
        <input
          type="number"
          value={initTheta1}
          onChange={(e) => setInitTheta1(parseFloat(e.target.value))}
          placeholder="Pendulum 1 θ"
          style={{ width: '80px' }}
        />
        <input
          type="number"
          value={initR2}
          onChange={(e) => setInitR2(parseFloat(e.target.value))}
          placeholder="Pendulum 2 r"
          style={{ width: '80px' }}
        />
        <input
          type="number"
          value={initTheta2}
          onChange={(e) => setInitTheta2(parseFloat(e.target.value))}
          placeholder="Pendulum 2 θ"
          style={{ width: '80px' }}
        />
        <button onClick={setInitialConditions} style={{ padding: '5px 10px' }}>
          Set Initial Conditions
        </button>
      </div>
      <div className="sliders" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
        <label>
          Mass
          <input type="range" min="10" max="50" value={m} onChange={(e) => setM(parseFloat(e.target.value))} />
        </label>
        <label>
          Spring Constant
          <input type="range" min="0.1" max="5" step="0.1" value={k} onChange={(e) => setK(parseFloat(e.target.value))} />
        </label>
        <label>
          Natural Length
          <input type="range" min="50" max="200" value={L0} onChange={(e) => setL0(parseFloat(e.target.value))} />
        </label>
        <label>
          Speed
          <input type="range" min="0.1" max="5" step="0.1" value={simSpeed} onChange={(e) => setSimSpeed(parseFloat(e.target.value))} />
        </label>
      </div>
      <div className="simulations" style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <div className="canvas" style={{ flex: '1 1 45%' }}>
          <Sketch
            setup={setupSim1}
            draw={drawSim1}
            mousePressed={mousePressed1}
            mouseDragged={mouseDragged1}
            mouseReleased={mouseReleased1}
          />
        </div>
        <div className="canvas" style={{ flex: '1 1 45%' }}>
          <Sketch
            setup={setupSim2}
            draw={drawSim2}
            mousePressed={mousePressed2}
            mouseDragged={mouseDragged2}
            mouseReleased={mouseReleased2}
          />
        </div>
      </div>
      <div className="phase-plot" style={{ margin: '20px auto', width: '60%' }}>
        <Sketch
          setup={setupPhasePlot}
          draw={drawPhasePlot}
          mousePressed={phasePlotMousePressed}
        />
      </div>
    </div>
  );
}
