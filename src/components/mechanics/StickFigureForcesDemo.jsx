import React, { useCallback, useEffect, useRef, useState } from "react";

const MASS = 60; // kg
const GRAVITY = 9.8; // m/s^2
const MOVE_FORCE = 120; // N applied by player input
const FRICTION_COEFF = 0.55;
const JUMP_VELOCITY = 5.5; // m/s upward impulse
const SIM_WIDTH = 560;
const SIM_HEIGHT = 360;
const GROUND_Y = SIM_HEIGHT - 60;
const PX_PER_METER = 80;
const HORIZONTAL_BOUND = 3.2; // meters from center
const ARROW_SCALE = 0.07; // pixels per Newton

export default function StickFigureForcesDemo() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, onGround: true });
  const keysRef = useRef({ left: false, right: false });
  const netForceRef = useRef({ x: 0, y: 0 });

  const [gravityOn, setGravityOn] = useState(true);
  const [frictionOn, setFrictionOn] = useState(true);
  const [netForce, setNetForce] = useState({ x: 0, y: 0 });

  const commitNetForce = useCallback((fx, fy) => {
    const prev = netForceRef.current;
    if (Math.abs(prev.x - fx) > 0.2 || Math.abs(prev.y - fy) > 0.2) {
      netForceRef.current = { x: fx, y: fy };
      setNetForce({ x: fx, y: fy });
    }
  }, []);

  const drawScene = useCallback((ctx, state, forces, netX, netY) => {
    ctx.clearRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

    // background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

    // ground platform
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, GROUND_Y, SIM_WIDTH, SIM_HEIGHT - GROUND_Y);
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, GROUND_Y);
    ctx.lineTo(SIM_WIDTH - 40, GROUND_Y);
    ctx.stroke();

    const baseX = SIM_WIDTH / 2 + state.x * PX_PER_METER;
    const footY = GROUND_Y - state.y * PX_PER_METER;

    // stick figure proportions
    const legLength = 48;
    const torsoLength = 54;
    const headRadius = 16;
    const hipY = footY - legLength;
    const shoulderY = hipY - torsoLength;
    const headCenterY = shoulderY - headRadius - 6;
    const anchorY = shoulderY + torsoLength * 0.4;

    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // legs
    ctx.beginPath();
    ctx.moveTo(baseX, hipY);
    ctx.lineTo(baseX - 16, footY);
    ctx.moveTo(baseX, hipY);
    ctx.lineTo(baseX + 16, footY);
    ctx.stroke();

    // torso
    ctx.beginPath();
    ctx.moveTo(baseX, hipY);
    ctx.lineTo(baseX, shoulderY);
    ctx.stroke();

    // arms
    ctx.beginPath();
    ctx.moveTo(baseX, shoulderY + 4);
    ctx.lineTo(baseX - 28, shoulderY + 22);
    ctx.moveTo(baseX, shoulderY + 4);
    ctx.lineTo(baseX + 28, shoulderY + 18);
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(baseX, headCenterY, headRadius, 0, Math.PI * 2);
    ctx.stroke();

    const anchorX = baseX;
    const anchor = { x: anchorX, y: anchorY };

    // draw each individual force vector
    forces.forEach(force => {
      drawArrow(ctx, anchor, force, force.color, force.label);
    });

    // net force arrow
    const netForceVector = { x: netX, y: netY, color: "#0f766e", label: "Net" };
    drawArrow(ctx, anchor, netForceVector, netForceVector.color, netForceVector.label);

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "13px 'Inter', 'Segoe UI', sans-serif";
    ctx.fillText(
      `Net F = (${netX.toFixed(1)} N, ${netY.toFixed(1)} N)`,
      anchor.x + 18,
      anchor.y - 18
    );
    ctx.restore();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        keysRef.current.left = true;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        keysRef.current.right = true;
      }
      if (e.code === "Space") {
        const state = stateRef.current;
        if (state.onGround) {
          state.vy = JUMP_VELOCITY;
          state.onGround = false;
          state.y = Math.max(state.y, 0.01);
        }
      }
    }

    function handleKeyUp(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        keysRef.current.left = false;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        keysRef.current.right = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let last = performance.now();

    function step(timestamp) {
      const dt = Math.min((timestamp - last) / 1000, 0.032);
      last = timestamp;

      const state = stateRef.current;
      const keys = keysRef.current;

      let Fx = 0;
      let Fy = 0;
      const forces = [];

      if (gravityOn) {
        const weight = -MASS * GRAVITY;
        Fy += weight;
        forces.push({ label: "Weight", x: 0, y: weight, color: "#ef4444" });
      }

      let onGround = state.y <= 0.0001 && state.vy <= 0;
      let normalForce = 0;
      if (onGround) {
        normalForce = Math.max(0, -Fy);
        if (normalForce > 0) {
          Fy += normalForce;
          forces.push({ label: "Normal", x: 0, y: normalForce, color: "#3b82f6" });
        }
      }

      let driveForce = 0;
      if (keys.left) driveForce -= MOVE_FORCE;
      if (keys.right) driveForce += MOVE_FORCE;
      if (driveForce !== 0) {
        Fx += driveForce;
        forces.push({ label: "Applied", x: driveForce, y: 0, color: "#8b5cf6" });
      }

      if (onGround && frictionOn) {
        const limit = FRICTION_COEFF * normalForce;
        let friction = 0;
        if (Math.abs(state.vx) > 0.15) {
          friction = -limit * Math.sign(state.vx);
        } else if (driveForce === 0) {
          const needed = -state.vx * MASS / Math.max(dt, 0.016);
          friction = Math.max(-limit, Math.min(limit, needed));
          if (Math.abs(needed) <= limit) {
            state.vx = 0;
          }
        }
        if (friction !== 0) {
          Fx += friction;
          forces.push({ label: "Friction", x: friction, y: 0, color: "#f97316" });
        }
      }

      const netX = Fx;
      const netY = Fy;

      state.vx += (netX / MASS) * dt;
      state.vy += (netY / MASS) * dt;
      state.x += state.vx * dt;
      state.y += state.vy * dt;

      if (state.y < 0) {
        state.y = 0;
        if (state.vy < 0) state.vy = 0;
        onGround = true;
      } else {
        onGround = false;
      }
      state.onGround = onGround;

      if (state.x < -HORIZONTAL_BOUND) {
        state.x = -HORIZONTAL_BOUND;
        if (state.vx < 0) state.vx = 0;
      }
      if (state.x > HORIZONTAL_BOUND) {
        state.x = HORIZONTAL_BOUND;
        if (state.vx > 0) state.vx = 0;
      }

      commitNetForce(netX, netY);
      drawScene(ctx, state, forces, netX, netY);
      animationRef.current = requestAnimationFrame(step);
    }

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gravityOn, frictionOn, commitNetForce, drawScene]);

  const velocity = stateRef.current ? stateRef.current.vx : 0;
  const netMagnitude = Math.hypot(netForce.x, netForce.y);

  return (
    <div className="forces-demo">
      <div className="forces-controls">
        <label>
          <input
            type="checkbox"
            checked={gravityOn}
            onChange={e => setGravityOn(e.target.checked)}
          />
          Gravity
        </label>
        <label>
          <input
            type="checkbox"
            checked={frictionOn}
            onChange={e => setFrictionOn(e.target.checked)}
          />
          Friction
        </label>
        <span className="control-hint">Use ←/→ or A/D to push, space to jump.</span>
      </div>

      <canvas
        ref={canvasRef}
        width={SIM_WIDTH}
        height={SIM_HEIGHT}
        className="forces-canvas"
        aria-label="Stick figure forces sandbox"
      />

      <div className="forces-readout">
        <div>
          <strong>Net force:</strong> {netMagnitude.toFixed(1)} N
          <span className="readout-detail">
            ({netForce.x.toFixed(1)} i, {netForce.y.toFixed(1)} j)
          </span>
        </div>
        <div>
          <strong>Horizontal velocity:</strong> {velocity.toFixed(2)} m/s
        </div>
        <div className="forces-legend">
          <span><span className="legend-box" style={{ background: "#ef4444" }} /> Weight</span>
          <span><span className="legend-box" style={{ background: "#3b82f6" }} /> Normal</span>
          <span><span className="legend-box" style={{ background: "#f97316" }} /> Friction</span>
          <span><span className="legend-box" style={{ background: "#8b5cf6" }} /> Applied</span>
          <span><span className="legend-box" style={{ background: "#0f766e" }} /> Net</span>
        </div>
      </div>

      <style>{`
        .forces-demo {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
          background: linear-gradient(180deg, #fff, #f9fafb);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
          margin: 20px 0 26px;
        }
        .forces-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 12px;
        }
        .forces-controls label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #eef2ff;
          border: 1px solid #c7d2fe;
          font-weight: 600;
        }
        .forces-controls input[type="checkbox"] {
          accent-color: #4f46e5;
        }
        .control-hint {
          font-size: 13px;
          color: #6b7280;
        }
        .forces-canvas {
          width: 100%;
          max-width: 560px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #d1d5db;
        }
        .forces-readout {
          margin-top: 14px;
          font-size: 14px;
          color: #0f172a;
          display: grid;
          gap: 6px;
          align-items: start;
        }
        .readout-detail {
          margin-left: 8px;
          color: #64748b;
          font-size: 13px;
        }
        .forces-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 8px;
          font-size: 13px;
          color: #334155;
        }
        .legend-box {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 3px;
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
}

function drawArrow(ctx, anchor, force, color, label) {
  const dx = force.x * ARROW_SCALE;
  const dy = -force.y * ARROW_SCALE; // canvas y-axis is inverted
  const length = Math.hypot(dx, dy);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  if (length < 0.5) {
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x + dx, anchor.y + dy);
    ctx.stroke();

    const angle = Math.atan2(dy, dx);
    const head = 10;
    ctx.beginPath();
    ctx.moveTo(anchor.x + dx, anchor.y + dy);
    ctx.lineTo(
      anchor.x + dx - head * Math.cos(angle - Math.PI / 6),
      anchor.y + dy - head * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      anchor.x + dx - head * Math.cos(angle + Math.PI / 6),
      anchor.y + dy - head * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  }

  if (label) {
    ctx.font = "12px 'Inter', 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";
    const labelX = anchor.x + dx + 10;
    const labelY = anchor.y + dy + (dy < 0 ? -8 : 8);
    ctx.fillText(label, labelX, labelY);
  }

  ctx.restore();
}
