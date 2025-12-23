import React, { useEffect, useRef, useState } from "react";

// Simple 1D collision playground where users can set the masses,
// initial velocities, and coefficient of restitution.
export default function OneDCollisionLab() {
  const [mass1, setMass1] = useState(2);
  const [mass2, setMass2] = useState(4);
  const [velocity1, setVelocity1] = useState(2);
  const [velocity2, setVelocity2] = useState(-1.5);
  const [restitution, setRestitution] = useState(1);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Tap play after setting the sliders.");
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const width = 720;
  const height = 180;
  const cartWidth = 60;
  const cartHeight = 40;

  const stateRef = useRef({
    x1: 140,
    x2: 520,
    v1: velocity1,
    v2: velocity2,
  });

  // Compute post-collision velocities for a given coefficient of restitution
  function resolveCollision() {
    const { v1, v2 } = stateRef.current;
    const m1 = mass1;
    const m2 = mass2;
    const e = restitution;

    const newV1 = ((m1 - e * m2) / (m1 + m2)) * v1 + ((1 + e) * m2 * v2) / (m1 + m2);
    const newV2 = ((1 + e) * m1 * v1) / (m1 + m2) + ((m2 - e * m1) / (m1 + m2)) * v2;
    stateRef.current.v1 = newV1;
    stateRef.current.v2 = newV2;
    setStatus(
      `After the hit: v₁ = ${newV1.toFixed(2)} m/s, v₂ = ${newV2.toFixed(2)} m/s`
    );
  }

  function resetPositions() {
    stateRef.current = {
      x1: 140,
      x2: 520,
      v1: Number(velocity1),
      v2: Number(velocity2),
    };
    setStatus("Ready — press Play to watch the carts collide.");
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, width, height);

    // Track
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, height / 2 + cartHeight / 2);
    ctx.lineTo(width - 40, height / 2 + cartHeight / 2);
    ctx.stroke();

    // Carts
    const { x1, x2 } = stateRef.current;
    const cartColor1 = "#3b82f6";
    const cartColor2 = "#ef4444";

    ctx.fillStyle = cartColor1;
    ctx.fillRect(x1 - cartWidth / 2, height / 2 - cartHeight / 2, cartWidth, cartHeight);
    ctx.fillStyle = "#1f2937";
    ctx.fillText(`m₁=${mass1} kg`, x1 - cartWidth / 2 + 6, height / 2 + 18);

    ctx.fillStyle = cartColor2;
    ctx.fillRect(x2 - cartWidth / 2, height / 2 - cartHeight / 2, cartWidth, cartHeight);
    ctx.fillStyle = "#1f2937";
    ctx.fillText(`m₂=${mass2} kg`, x2 - cartWidth / 2 + 6, height / 2 + 18);
  }

  function animate(timestamp) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const dt = 0.016; // ~60 FPS
    const { x1, x2, v1, v2 } = stateRef.current;

    // Detect collision (when carts touch or overlap) while they are moving toward each other
    if (x2 - x1 <= cartWidth && v2 - v1 < 0) {
      resolveCollision();
    }

    // Update positions
    stateRef.current.x1 += v1 * 40 * dt;
    stateRef.current.x2 += v2 * 40 * dt;

    draw(ctx);

    // Stop if carts exit the track
    if (stateRef.current.x1 < 40 - cartWidth || stateRef.current.x2 > width - 40 + cartWidth) {
      setRunning(false);
      setStatus("Reset to run another collision.");
      return;
    }

    requestRef.current = requestAnimationFrame(animate);
  }

  // Start or stop the animation
  useEffect(() => {
    if (running) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.font = "14px Inter, system-ui, sans-serif";
        draw(ctx);
      }
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Redraw when parameters change while stopped
  useEffect(() => {
    if (!running) {
      resetPositions();
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.font = "14px Inter, system-ui, sans-serif";
        draw(ctx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mass1, mass2, velocity1, velocity2, restitution]);

  const totalMomentum = (mass1 * velocity1 + mass2 * velocity2).toFixed(2);

  return (
    <div className="concept-card">
      <h3 style={{ marginTop: 0 }}>1D Collision Sandbox</h3>
      <p className="hint">
        Adjust the masses, velocities, and coefficient of restitution (elasticity), then press Play to watch
        the carts collide. Momentum should stay constant no matter the elasticity.
      </p>
      <div className="controls" style={{ marginBottom: 12 }}>
        <label>
          m₁ (kg)
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={mass1}
            onChange={(e) => setMass1(parseFloat(e.target.value))}
          />
          <span className="readout">{mass1.toFixed(1)}</span>
        </label>
        <label>
          m₂ (kg)
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.5"
            value={mass2}
            onChange={(e) => setMass2(parseFloat(e.target.value))}
          />
          <span className="readout">{mass2.toFixed(1)}</span>
        </label>
        <label>
          v₁ (m/s)
          <input
            type="range"
            min="-5"
            max="5"
            step="0.25"
            value={velocity1}
            onChange={(e) => setVelocity1(parseFloat(e.target.value))}
          />
          <span className="readout">{velocity1.toFixed(2)}</span>
        </label>
        <label>
          v₂ (m/s)
          <input
            type="range"
            min="-5"
            max="5"
            step="0.25"
            value={velocity2}
            onChange={(e) => setVelocity2(parseFloat(e.target.value))}
          />
          <span className="readout">{velocity2.toFixed(2)}</span>
        </label>
        <label>
          e (elasticity)
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={restitution}
            onChange={(e) => setRestitution(parseFloat(e.target.value))}
          />
          <span className="readout">{restitution.toFixed(2)}</span>
        </label>
      </div>

      <div className="button-row" style={{ marginBottom: 12 }}>
        <button
          className="modern-button"
          onClick={() => {
            resetPositions();
            setRunning(true);
          }}
          disabled={running}
        >
          Play
        </button>
        <button
          className="modern-button"
          style={{ background: "linear-gradient(90deg, #6b7280, #9ca3af)" }}
          onClick={() => {
            resetPositions();
            setRunning(false);
          }}
        >
          Reset
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: "100%", maxWidth: width, borderRadius: 12, border: "1px solid #e5e7eb" }}
      />

      <div className="readout" style={{ marginTop: 10 }}>
        <div>Total initial momentum: {totalMomentum} kg·m/s</div>
        <div style={{ color: "#111", marginTop: 4 }}>{status}</div>
      </div>
    </div>
  );
}
