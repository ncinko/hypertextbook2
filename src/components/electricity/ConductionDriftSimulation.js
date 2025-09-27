import React, { useEffect, useRef, useState } from "react";

// ConductionDriftSimulation --------------------------------------------------
// Visualizes a simplified electron gas colliding with a lattice while an
// applied electric field pushes the electrons to create a drift velocity.
// The controls expose an electric field slider and a mean free time slider so
// that students can connect microscopic motion to macroscopic quantities such
// as drift speed, current density, and resistivity (Ohm's law).

const ELECTRON_COUNT = 120;
const NUCLEI_ROWS = 5;
const NUCLEI_COLS = 10;
const ELECTRON_CHARGE = 1.602e-19; // C
const ELECTRON_MASS = 9.109e-31; // kg
const ELECTRON_DENSITY = 8.5e28; // m^-3 (copper order of magnitude)
const WIRE_LENGTH = 0.08; // 8 cm
const WIRE_AREA = 1e-6; // 1 mm^2 cross-section

const randomDirection = () => {
  const theta = Math.random() * Math.PI * 2;
  return { x: Math.cos(theta), y: Math.sin(theta) };
};

const createElectron = (width, height, speed) => {
  const dir = randomDirection();
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: dir.x * speed,
    vy: dir.y * speed,
  };
};

export default function ConductionDriftSimulation() {
  const canvasRef = useRef(null);
  const electronsRef = useRef([]);
  const nucleiRef = useRef([]);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);
  const lastMetricsUpdateRef = useRef(0);

  const [fieldStrength, setFieldStrength] = useState(1.5); // kV/m
  const [meanFreeTime, setMeanFreeTime] = useState(1.6); // in 1e-14 s
  const [metrics, setMetrics] = useState({
    driftVelocity: 0,
    currentDensity: 0,
    resistivity: 0,
    resistance: 0,
    current: 0,
  });

  const fieldRef = useRef(fieldStrength);
  const meanFreeTimeRef = useRef(meanFreeTime);

  useEffect(() => {
    fieldRef.current = fieldStrength;
  }, [fieldStrength]);

  useEffect(() => {
    meanFreeTimeRef.current = meanFreeTime;
  }, [meanFreeTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== "function") {
      return undefined;
    }

    let ctx;
    try {
      ctx = canvas.getContext("2d");
    } catch (error) {
      console.warn("Canvas context unavailable", error);
      return undefined;
    }

    if (!ctx) {
      return undefined;
    }
    const thermalSpeed = 55; // pixels per second (visual scale)

    const computeSize = () => {
      const parent = canvas.parentElement;
      const width = Math.max(320, Math.min(900, parent ? parent.clientWidth : 640));
      return { width, height: Math.round(width * 0.55) };
    };

    const resize = () => {
      const { width, height } = computeSize();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const nuclei = [];
      const marginX = width * 0.08;
      const marginY = height * 0.12;
      for (let r = 0; r < NUCLEI_ROWS; r++) {
        for (let c = 0; c < NUCLEI_COLS; c++) {
          const x = marginX + (c / (NUCLEI_COLS - 1)) * (width - 2 * marginX);
          const y = marginY + (r / (NUCLEI_ROWS - 1)) * (height - 2 * marginY);
          nuclei.push({ x, y });
        }
      }
      nucleiRef.current = nuclei;

      electronsRef.current = Array.from({ length: ELECTRON_COUNT }, () =>
        createElectron(width, height, thermalSpeed)
      );
    };

    resize();

    const handleResize = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
    };

    window.addEventListener("resize", handleResize);

    const draw = (timestamp) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const electrons = electronsRef.current;
      const nuclei = nucleiRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const electricFieldKV = fieldRef.current;
      const tauUnits = meanFreeTimeRef.current;
      const electricField = electricFieldKV * 1e3; // convert to V/m for readouts
      const tauSeconds = tauUnits * 1e-14;

      // Background gradient indicating the field direction
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#172554");
      gradient.addColorStop(1, "#60a5fa");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw lattice nuclei
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const nucleus of nuclei) {
        ctx.beginPath();
        ctx.arc(nucleus.x, nucleus.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const meanFreeVisual = 0.2 + tauUnits * 0.12;
      const driftAcceleration = -electricFieldKV * 28; // px/s^2 visual scale
      const thermalJitter = 12;
      const collisionProbability = 1 - Math.exp(-dt / meanFreeVisual);

      for (const electron of electrons) {
        if (Math.random() < collisionProbability) {
          const dir = randomDirection();
          electron.vx = dir.x * thermalSpeed + driftAcceleration * 0.02;
          electron.vy = dir.y * thermalSpeed * 0.6;
        } else {
          electron.vx += driftAcceleration * dt;
          electron.vx += (Math.random() - 0.5) * thermalJitter;
          electron.vy += (Math.random() - 0.5) * thermalJitter;
        }

        electron.x += electron.vx * dt;
        electron.y += electron.vy * dt;

        if (electron.x < 0) electron.x += width;
        if (electron.x > width) electron.x -= width;
        if (electron.y < 0) {
          electron.y = 0;
          electron.vy *= -0.6;
        }
        if (electron.y > height) {
          electron.y = height;
          electron.vy *= -0.6;
        }

      }

      // electrons
      ctx.fillStyle = "#facc15";
      for (const electron of electrons) {
        ctx.beginPath();
        ctx.arc(electron.x, electron.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Field arrow overlay
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.strokeStyle = "rgba(248,250,252,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width * 0.85, height * 0.2);
      ctx.lineTo(width * 0.6, height * 0.2);
      ctx.lineTo(width * 0.6, height * 0.16);
      ctx.lineTo(width * 0.52, height * 0.24);
      ctx.lineTo(width * 0.6, height * 0.32);
      ctx.lineTo(width * 0.6, height * 0.28);
      ctx.lineTo(width * 0.85, height * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.font = "16px Inter, sans-serif";
      ctx.fillText("E-field", width * 0.66, height * 0.15);

      ctx.restore();

      if (timestamp - lastMetricsUpdateRef.current > 200) {
        const driftVelocity =
          (-ELECTRON_CHARGE * electricField * tauSeconds) / ELECTRON_MASS;
        const currentDensity = ELECTRON_DENSITY * ELECTRON_CHARGE * Math.abs(driftVelocity);
        const resistivity = ELECTRON_MASS / (ELECTRON_DENSITY * ELECTRON_CHARGE ** 2 * tauSeconds);
        const resistance = resistivity * (WIRE_LENGTH / WIRE_AREA);
        const voltageDrop = electricField * WIRE_LENGTH;
        const current = voltageDrop / resistance;

        setMetrics({
          driftVelocity,
          currentDensity,
          resistivity,
          resistance,
          current,
        });
        lastMetricsUpdateRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      lastTimeRef.current = null;
    };
  }, []);

  return (
    <div className="simulation-card">
      <h3>Electron Drift Inside a Metal</h3>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Electrons colliding with a lattice while drifting under an electric field"
        style={{ width: "100%", height: "auto", borderRadius: "12px", background: "#0f172a" }}
      />
      <div className="control-panel stacked-controls">
        <label>
          Electric field strength (kV/m):
          <input
            type="range"
            min="0"
            max="4"
            step="0.1"
            value={fieldStrength}
            onChange={(e) => setFieldStrength(Number(e.target.value))}
          />
          <span>{fieldStrength.toFixed(1)} kV/m</span>
        </label>
        <label>
          Mean time between collisions (×10⁻¹⁴ s):
          <input
            type="range"
            min="0.3"
            max="3"
            step="0.1"
            value={meanFreeTime}
            onChange={(e) => setMeanFreeTime(Number(e.target.value))}
          />
          <span>{meanFreeTime.toFixed(1)} ×10⁻¹⁴ s</span>
        </label>
      </div>
      <div className="metrics-grid">
        <div>
          <strong>Drift speed</strong>
          <div>{(metrics.driftVelocity || 0).toExponential(2)} m/s</div>
        </div>
        <div>
          <strong>Current density</strong>
          <div>{(metrics.currentDensity || 0).toExponential(2)} A/m²</div>
        </div>
        <div>
          <strong>Resistivity</strong>
          <div>{(metrics.resistivity || 0).toExponential(2)} Ω·m</div>
        </div>
        <div>
          <strong>Resistance of 8&nbsp;cm wire</strong>
          <div>{(metrics.resistance || 0).toPrecision(3)} Ω</div>
        </div>
        <div>
          <strong>Current (wire with area 1&nbsp;mm²)</strong>
          <div>{(metrics.current || 0).toPrecision(3)} A</div>
        </div>
      </div>
      <p className="caption">
        Collisions randomize the thermal velocity while the electric field adds a consistent drift. Increasing the mean free
        time (cleaner metal) produces a larger drift velocity and a smaller resistivity, which is the microscopic picture of
        Ohm's law.
      </p>
    </div>
  );
}
