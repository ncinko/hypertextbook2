import React, { useState, useRef, useEffect } from "react";
import Sketch from "react-p5";

const PendulumSimulation = () => {
  // Length is in meters now.
  const [length, setLength] = useState(1); // Pendulum length in meters
  const [gravity, setGravity] = useState(9.8); // Gravity in m/s²
  const angleRef = useRef(Math.PI / 4); // Initial angle (45 degrees)
  const angularVelocityRef = useRef(0);
  const prevTimeRef = useRef(0);
  const draggingRef = useRef(false);
  const historyRef = useRef([]);

  // Refs to always have the latest slider values
  const lengthRef = useRef(length);
  const gravityRef = useRef(gravity);
  useEffect(() => {
    lengthRef.current = length;
    gravityRef.current = gravity;
  }, [length, gravity]);

  // Scale factor to convert meters to pixels
  const meterToPixel = 100;

  // RK4 integration for updating angle and angular velocity
  const rk4 = (theta, omega, dt, g, L) => {
    const f = (theta, omega) => {
      // Returns [dtheta/dt, domega/dt]
      return [omega, -(g / L) * Math.sin(theta)];
    };

    const [k1_theta, k1_omega] = f(theta, omega);
    const [k2_theta, k2_omega] = f(theta + dt * k1_theta / 2, omega + dt * k1_omega / 2);
    const [k3_theta, k3_omega] = f(theta + dt * k2_theta / 2, omega + dt * k2_omega / 2);
    const [k4_theta, k4_omega] = f(theta + dt * k3_theta, omega + dt * k3_omega);

    const newTheta = theta + dt * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta) / 6;
    const newOmega = omega + dt * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega) / 6;
    return [newTheta, newOmega];
  };

  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
    prevTimeRef.current = p5.millis();
  };

  const draw = (p5) => {
    p5.background(255);
    let dt = (p5.millis() - prevTimeRef.current) / 1000;
    prevTimeRef.current = p5.millis();
    if (dt > 0.05) dt = 0.05;

    // Define the pivot point (origin) once for both drawing and mouse events.
    const origin = { x: p5.width / 2, y: 0 };
    const pixelLength = lengthRef.current * meterToPixel;
    const massX = origin.x + pixelLength * Math.sin(angleRef.current);
    const massY = origin.y + pixelLength * Math.cos(angleRef.current);

    if (!draggingRef.current) {
      // Update using RK4 integration for better accuracy at larger angles.
      [angleRef.current, angularVelocityRef.current] = rk4(
        angleRef.current,
        angularVelocityRef.current,
        dt,
        gravityRef.current,
        lengthRef.current
      );
    }

    // Record the current time and angle for plotting.
    historyRef.current.push({ time: p5.millis(), angle: angleRef.current });
    if (historyRef.current.length > 200) {
      historyRef.current.shift();
    }

    // Draw the pendulum arm and mass.
    p5.stroke(0);
    p5.line(origin.x, origin.y, massX, massY);
    p5.fill(127);
    p5.ellipse(massX, massY, 30, 30);
  };

  const mousePressed = (p5) => {
    const origin = { x: p5.width / 2, y: 0 };
    const pixelLength = lengthRef.current * meterToPixel;
    const massX = origin.x + pixelLength * Math.sin(angleRef.current);
    const massY = origin.y + pixelLength * Math.cos(angleRef.current);
    if (p5.dist(p5.mouseX, p5.mouseY, massX, massY) < 30) {
      draggingRef.current = true;
    }
  };

  const mouseDragged = (p5) => {
    if (draggingRef.current) {
      const origin = { x: p5.width / 2, y: 0 };
      let dx = p5.mouseX - origin.x;
      let dy = p5.mouseY - origin.y;
      // Compute angle relative to vertical (origin)
      angleRef.current = Math.atan2(dx, dy);
      angularVelocityRef.current = 0;
    }
  };

  const mouseReleased = () => {
    draggingRef.current = false;
  };

  // Plot sketch: draws a continuous angle vs. time graph.
  const setupPlot = (p5, canvasParentRef) => {
    p5.createCanvas(400, 200).parent(canvasParentRef);
  };

  const drawPlot = (p5) => {
    p5.background(255);
    p5.stroke(0);
    p5.noFill();
    // Draw a horizontal midline (angle = 0 reference).
    p5.line(0, p5.height / 2, p5.width, p5.height / 2);

    if (historyRef.current.length < 2) return;
    const firstTime = historyRef.current[0].time;
    const lastTime = historyRef.current[historyRef.current.length - 1].time;
    p5.beginShape();
    historyRef.current.forEach(({ time, angle }) => {
      const x = p5.map(time, firstTime, lastTime, 0, p5.width);
      const y = p5.height / 2 - angle * 50; // Adjust vertical scaling if needed.
      p5.vertex(x, y);
    });
    p5.endShape();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="canvas-container">
        <Sketch
          setup={setup}
          draw={draw}
          mousePressed={mousePressed}
          mouseDragged={mouseDragged}
          mouseReleased={mouseReleased}
        />
      </div>
      <div className="flex gap-4 mt-4">
        <label>
          Length (m):
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={length}
            onChange={(e) => setLength(parseFloat(e.target.value))}
          />
        </label>
        <span>{length} m</span>
      </div>
      <div className="flex gap-4 mt-2">
        <label>
          Gravity (m/s²):
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            value={gravity}
            onChange={(e) => setGravity(parseFloat(e.target.value))}
          />
        </label>
        <span>{gravity} m/s²</span>
      </div>
      <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Angle vs Time Plot</h3>
      <div className="canvas-container mt-2">
        <Sketch setup={setupPlot} draw={drawPlot} />
      </div>
    </div>
  );
};

export default PendulumSimulation;
