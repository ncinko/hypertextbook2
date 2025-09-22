import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Physics constants
 */
const MASS = 60; // kg
const GRAVITY = 9.8; // m/s^2
const MOVE_THRUST = 120; // N maximum tangential ground reaction you can "request"
const MU = 0.55; // static ~= kinetic for this demo
const JUMP_VELOCITY = 5.5; // m/s upward impulse
const SIM_WIDTH = 560;
const SIM_HEIGHT = 360;
const GROUND_Y = SIM_HEIGHT - 60;
const PX_PER_METER = 80;
const HORIZONTAL_BOUND = 3.2; // m from center
const ARROW_SCALE = 0.07; // px per Newton
const STATIC_V_THRESH = 0.06; // m/s for "at rest" handling

export default function StickFigureForcesDemo() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // physics state
  const stateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, onGround: true });

  // input
  const keysRef = useRef({ left: false, right: false });

  // force readout
  const netForceRef = useRef({ x: 0, y: 0 });
  const [gravityOn, setGravityOn] = useState(true);
  const [frictionOn, setFrictionOn] = useState(true);
  const [netForce, setNetForce] = useState({ x: 0, y: 0 });

  // animation state
  const animRef = useRef({
    phase: 0,
    torsoTilt: 0,
    headBob: 0,
    legA: 0, legB: 0,
    armA: 0, armB: 0
  });

  const commitNetForce = useCallback((fx, fy) => {
    const prev = netForceRef.current;
    if (Math.abs(prev.x - fx) > 0.2 || Math.abs(prev.y - fy) > 0.2) {
      netForceRef.current = { x: fx, y: fy };
      setNetForce({ x: fx, y: fy });
    }
  }, []);

  /**
   * Draw the scene + stick figure
   */
  const drawScene = useCallback((ctx, state, forces, netX, netY, animActive) => {
    ctx.clearRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

    // background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, SIM_WIDTH, SIM_HEIGHT);

    // ground
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

    // stick figure proportions (px)
    const legLength = 48;
    const torsoLength = 54;
    const headRadius = 16;

    // === Velocity- and intent-gated running animation ===
    const a = animRef.current;
    const intent = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
    const animEnabled = animActive && intent !== 0; // only when trying to accelerate on ground
    const speed = Math.abs(state.vx); // m/s
    const amp = animEnabled ? Math.min(1, speed / 3) : 0;
    const targetSwing = 0.7 * amp;
    const targetPhaseSpeed = animEnabled ? (2.4 + 1.8 * amp) * Math.max(speed, 1.2) * 0.06 : 0;

    a.phase += targetPhaseSpeed;
    const ease = (val, target, t = 0.18) => val * (1 - t) + target * t;

    const desLegA = Math.sin(a.phase) * targetSwing;
    const desLegB = Math.sin(a.phase + Math.PI) * targetSwing;
    const desArmA = -Math.sin(a.phase) * (targetSwing * 0.8);
    const desArmB = -Math.sin(a.phase + Math.PI) * (targetSwing * 0.8);
    const desTilt = animEnabled ? Math.max(-0.25, Math.min(0.25, state.vx * 0.08)) : 0;
    const desBob = animEnabled ? Math.sin(a.phase * 2) * 4 * amp : 0;

    a.legA = ease(a.legA, desLegA);
    a.legB = ease(a.legB, desLegB);
    a.armA = ease(a.armA, desArmA);
    a.armB = ease(a.armB, desArmB);
    a.torsoTilt = ease(a.torsoTilt, desTilt, 0.22);
    a.headBob = ease(a.headBob, desBob, 0.16);

    // skeleton points
    const hipX = baseX;
    const hipY = footY - legLength;
    const shoulderX = hipX + Math.sin(a.torsoTilt) * torsoLength;
    const shoulderY = hipY - Math.cos(a.torsoTilt) * torsoLength;
    const headCx = shoulderX + Math.sin(a.torsoTilt) * (headRadius + 6);
    const headCy = shoulderY - Math.cos(a.torsoTilt) * (headRadius + 6) - a.headBob;

    // helper to place endpoints given an angle from origin
    const segment = (ox, oy, len, ang) => ({ x: ox + Math.sin(ang) * len, y: oy + Math.cos(ang) * len });

    const footA = segment(hipX, hipY, legLength, a.legA);
    const footB = segment(hipX, hipY, legLength, a.legB);
    const handA = segment(shoulderX, shoulderY, 36, a.armA + a.torsoTilt + 0.25);
    const handB = segment(shoulderX, shoulderY, 36, a.armB + a.torsoTilt - 0.25);

    const stroke = (fn, width = 4, color = "#1f2937") => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      fn();
      ctx.restore();
    };

    // legs
    stroke(() => {
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(footA.x, footA.y);
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(footB.x, footB.y);
      ctx.stroke();
    });

    // torso
    stroke(() => {
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(shoulderX, shoulderY);
      ctx.stroke();
    });

    // arms
    stroke(() => {
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(handA.x, handA.y);
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(handB.x, handB.y);
      ctx.stroke();
    });

    // head
    stroke(() => {
      ctx.beginPath();
      ctx.arc(headCx, headCy, headRadius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // force arrows anchor near torso
    const anchor = { x: (hipX + shoulderX) / 2, y: (hipY + shoulderY) / 2 };
    forces.forEach(f => drawArrow(ctx, anchor, f, f.color, f.label));

    const netForceVector = { x: netX, y: netY, color: "#0f766e", label: "Net" };
    drawArrow(ctx, anchor, netForceVector, netForceVector.color, netForceVector.label);

    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.font = "13px 'Inter', 'Segoe UI', sans-serif";
    ctx.fillText(`Net F = (${netX.toFixed(1)} N, ${netY.toFixed(1)} N)`, anchor.x + 18, anchor.y - 18);
    ctx.restore();
  }, []);

  /**
   * Input
   */
  useEffect(() => {
    function handleKeyDown(e) {
      if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(e.code)) e.preventDefault();
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = true;
      if (e.code === "Space") {
        const s = stateRef.current;
        if (s.onGround) {
          s.vy = JUMP_VELOCITY;
          s.onGround = false;
          s.y = Math.max(s.y, 0.01);
        }
      }
    }
    function handleKeyUp(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keysRef.current.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keysRef.current.right = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  /**
   * Simulation
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let last = performance.now();

    function step(ts) {
      const dt = Math.min((ts - last) / 1000, 0.032);
      last = ts;

      const s = stateRef.current;
      const keys = keysRef.current;

      let Fx = 0, Fy = 0;
      const forces = [];

      // weight
      if (gravityOn) {
        const weight = -MASS * GRAVITY;
        Fy += weight;
        forces.push({ label: "Weight", x: 0, y: weight, color: "#ef4444" });
      }

      // ground contact + normal
      let onGround = s.y <= 0.0001 && s.vy <= 0;
      let normal = 0;
      if (onGround) {
        normal = Math.max(0, -Fy); // support balances downwards forces
        if (normal > 0) {
          Fy += normal;
          forces.push({ label: "Normal", x: 0, y: normal, color: "#3b82f6" });
        }
      }

      // --- Only ground friction can accelerate horizontally ---
      const intent = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (frictionOn && onGround) {
        const limit = MU * normal; // max static/kinetic magnitude

        if (intent !== 0) {
          // Request a tangential ground reaction in direction of intent
          const drive = intent * MOVE_THRUST;
          const friction = Math.max(-limit, Math.min(limit, drive)); // static up to μN
          Fx += friction;
          forces.push({ label: "Friction", x: friction, y: 0, color: "#f97316" });

          // If already sliding fast opposite our intent (rare in this simple model),
          // the static limit still caps our usable ground reaction.
        } else {
          // No intent: friction only works to reduce slipping
          if (Math.abs(s.vx) > STATIC_V_THRESH) {
            const friction = -limit * Math.sign(s.vx); // kinetic
            Fx += friction;
            forces.push({ label: "Friction", x: friction, y: 0, color: "#f97316" });
          } else if (Math.abs(s.vx) > 0.002) {
            // Try to come to exact rest with static friction
            const needed = -s.vx * MASS / Math.max(dt, 0.016);
            const friction = Math.max(-limit, Math.min(limit, needed));
            Fx += friction;
            forces.push({ label: "Friction", x: friction, y: 0, color: "#f97316" });
            if (Math.abs(needed) <= limit) s.vx = 0;
          }
        }
      }
      // In the air: NO horizontal forces at all (no acceleration mid-air)

      // integrate
      const netX = Fx;
      const netY = Fy;

      s.vx += (netX / MASS) * dt;
      s.vy += (netY / MASS) * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // resolve floor
      if (s.y < 0) {
        s.y = 0;
        if (s.vy < 0) s.vy = 0;
        onGround = true;
      } else {
        onGround = false;
      }
      s.onGround = onGround;

      // horizontal bounds
      if (s.x < -HORIZONTAL_BOUND) { s.x = -HORIZONTAL_BOUND; if (s.vx < 0) s.vx = 0; }
      if (s.x >  HORIZONTAL_BOUND) { s.x =  HORIZONTAL_BOUND; if (s.vx > 0) s.vx = 0; }

      commitNetForce(netX, netY);
      const animActive = onGround && frictionOn; // for gating animation
      drawScene(ctx, s, forces, netX, netY, animActive);

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
        <span className="control-hint">Use ←/→ or A/D to accelerate, Space to jump.</span>
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
        <div><strong>Horizontal velocity:</strong> {velocity.toFixed(2)} m/s</div>
        <div className="forces-legend">
          <span><span className="legend-box" style={{ background: "#ef4444" }} /> Weight</span>
          <span><span className="legend-box" style={{ background: "#3b82f6" }} /> Normal</span>
          <span><span className="legend-box" style={{ background: "#f97316" }} /> Friction (ground)</span>
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
          max-width: 640px;
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
        .forces-controls input[type="checkbox"] { accent-color: #4f46e5; }
        .control-hint { font-size: 13px; color: #6b7280; }
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
        .readout-detail { margin-left: 8px; color: #64748b; font-size: 13px; }
        .forces-legend {
          display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;
          font-size: 13px; color: #334155;
        }
        .legend-box { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; }
      `}</style>
    </div>
  );
}

function drawArrow(ctx, anchor, force, color, label) {
  const dx = force.x * ARROW_SCALE;
  const dy = -force.y * ARROW_SCALE; // canvas y inverted
  const L = Math.hypot(dx, dy);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  if (L < 0.5) {
    ctx.beginPath();
    ctx.arc(anchor.x, anchor.y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(anchor.x + dx, anchor.y + dy);
    ctx.stroke();

    const ang = Math.atan2(dy, dx);
    const head = 10;
    ctx.beginPath();
    ctx.moveTo(anchor.x + dx, anchor.y + dy);
    ctx.lineTo(
      anchor.x + dx - head * Math.cos(ang - Math.PI / 6),
      anchor.y + dy - head * Math.sin(ang - Math.PI / 6)
    );
    ctx.lineTo(
      anchor.x + dx - head * Math.cos(ang + Math.PI / 6),
      anchor.y + dy - head * Math.sin(ang + Math.PI / 6)
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
