import React, { useEffect, useRef, useState } from "react";

export default function Platformer() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const [showForces, setShowForces] = useState(false);
  const showForcesRef = useRef(showForces);
  useEffect(() => { showForcesRef.current = showForces; }, [showForces]);

  const clearFnRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // -------- Canvas sizing (larger) + scale-on-resize --------
    const lastSize = { w: 0, h: 0 };
    const bottomMargin = 48;

    function fit() {
      const parent = canvas.parentElement || document.body;
      const w = Math.min(1200, parent.clientWidth - 24);
      const h = Math.min(720, Math.max(480, Math.floor(w * 0.62)));
      canvas.width = w;
      canvas.height = h;

      if (lastSize.w && lastSize.h) {
        const sx = w / lastSize.w;
        const sy = h / lastSize.h;
        segmentsRef.current = segmentsRef.current.map(s =>
          seg(s.x1 * sx, s.y1 * sy, s.x2 * sx, s.y2 * sy)
        );
        player.x *= sx; player.y *= sy;
        player.vx *= sx; player.vy *= sy;
      }
      lastSize.w = w; lastSize.h = h;
    }
    fit();
    window.addEventListener("resize", fit);

    // -------- World (physics unchanged) --------
    const world = {
      w: () => canvas.width,
      h: () => canvas.height,
      gravity: 2000,
      airControl: 1200,
      runAccel: 2000,
      maxRunSpeed: 400,
      jumpSpeed: 700,
      mu_s: 0.5,
      mu_k: 0.3,
      substeps: 3,
      coyoteTime: 0.08,
      jumpBuffer: 0.12,
      groundTangentialDamping: 1.0,
      sleepVt: 2.0,
      sleepVy: 12.0,
      sleepTime: 0.22,
      vtStick: 6.0,
      stickMargin: 1.05,
      unlockBoost: 1.12,
    };

    // -------- Segments --------
    const segmentsRef = { current: initialSegments() };
    function initialSegments() {
      return [
        seg(20, 520, 340, 520),
        seg(340, 520, 520, 460),
        seg(520, 460, 700, 460),
        seg(700, 460, 900, 520),
        seg(140, 360, 300, 320),
        seg(300, 320, 460, 320),
        seg(460, 320, 620, 360),
        seg(680, 260, 850, 150),
        seg(800, 220, 1000, 220),
      ];
    }
    function resetSegmentsToFloor() {
      const y = world.h() - bottomMargin;
      const padX = 20;
      segmentsRef.current = [seg(padX, y, world.w() - padX, y)];
      Object.assign(player, { x: 80, y: y - 120, vx: 0, vy: 0, calmTimer: 0, stickLocked: false });
    }
    clearFnRef.current = resetSegmentsToFloor;

    // -------- Player --------
    const player = {
      x: 140, y: 200, vx: 0, vy: 0,
      r: 18, squareSize: 36,
      grounded: false,
      groundNormal: { x: 0, y: -1 },
      groundSeg: null,
      timeSinceGrounded: 0,
      timeSinceJumpPressed: 0,
      calmTimer: 0,
      stickLocked: false,
      lastForces: {
        gravity: { x: 0, y: world.gravity },
        normal:  { x: 0, y: 0, on: false },
        friction:{ x: 0, y: 0, on: false },
        frictionMode: null,   // "static" | "kinetic" (display only)
        applied: { x: 0, y: 0, on: false },
        jumpFlash: 0,
        contact: null,
      },
      smoothForces: {
        gravity: { x: 0, y: world.gravity },
        normal:  { x: 0, y: 0, on: false },
        friction:{ x: 0, y: 0, on: false },
        applied: { x: 0, y: 0, on: false },
      },
    };

    // -------- Input --------
    const input = { left: false, right: false, jumpPressed: false, jumpHeld: false };
    const scrollBlockKeys = new Set([" ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const onDown = (e) => {
      const k = e.key;
      if (scrollBlockKeys.has(k)) e.preventDefault();
      if (k === "ArrowLeft" || k === "a" || k === "A") input.left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") input.right = true;
      if (k === "w" || k === "W" || k === " ") {
        if (!input.jumpHeld) { input.jumpPressed = true; player.timeSinceJumpPressed = 0; }
        input.jumpHeld = true;
      }
    };
    const onUp = (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") input.left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") input.right = false;
      if (k === "w" || k === "W" || k === " ") input.jumpHeld = false;
    };
    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });

    // -------- Mouse: click–drag segments --------
    const drawState = { dragging: false, sx: 0, sy: 0, cx: 0, cy: 0 };

    function getMousePos(evt) {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width / r.width;
      const scaleY = canvas.height / r.height;
      return {
        x: (evt.clientX - r.left) * scaleX,
        y: (evt.clientY - r.top) * scaleY,
      };
    }
    function clampToCanvas(x, y) {
      const m = 2;
      return {
        x: Math.max(m, Math.min(world.w() - m, x)),
        y: Math.max(m, Math.min(world.h() - m, y)),
      };
    }

    function onMouseDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      const p0 = getMousePos(e);
      const p = clampToCanvas(p0.x, p0.y);
      drawState.dragging = true;
      drawState.sx = p.x; drawState.sy = p.y;
      drawState.cx = p.x; drawState.cy = p.y;
    }
    function onMouseMove(e) {
      if (!drawState.dragging) return;
      e.preventDefault();
      const p0 = getMousePos(e);
      const p = clampToCanvas(p0.x, p0.y);
      drawState.cx = p.x; drawState.cy = p.y;
    }
    function onMouseUp(e) {
      if (!drawState.dragging) return;
      e.preventDefault();
      const p0 = getMousePos(e);
      const p = clampToCanvas(p0.x, p0.y);
      drawState.dragging = false;
      const x1 = drawState.sx, y1 = drawState.sy;
      const x2 = p.x, y2 = p.y;
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len >= 10) segmentsRef.current.push(seg(x1, y1, x2, y2));
    }
    function onMouseLeave() {
      if (drawState.dragging) drawState.dragging = false;
    }

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // -------- Math helpers --------
    function seg(x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = dy / len, ny = -dx / len; // authoring normal (not trusted for physics)
      const tx = dx / len, ty = dy / len;
      return { x1, y1, x2, y2, nx, ny, tx, ty, len };
    }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const dot = (ax, ay, bx, by) => ax * bx + ay * by;

    function closestPointOnSeg(px, py, s) {
      const ax = s.x1, ay = s.y1, bx = s.x2, by = s.y2;
      const abx = bx - ax, aby = by - ay;
      const apx = px - ax, apy = py - ay;
      const ab2 = abx * abx + aby * aby || 1;
      let t = (apx * abx + apy * aby) / ab2;
      t = clamp(t, 0, 1);
      const qx = ax + abx * t, qy = ay + aby * t;
      const dx = px - qx, dy = py - qy;
      return { qx, qy, dx, dy, t, d2: dx * dx + dy * dy };
    }
    function projectTN(vx, vy, tx, ty, nx, ny) {
      const vt = dot(vx, vy, tx, ty);
      const vn = dot(vx, vy, nx, ny);
      return { vt, vn };
    }
    function resolveCircleSegment(p, s, radius) {
      const c = closestPointOnSeg(p.x, p.y, s);
      if (c.d2 >= radius * radius) return null;
      const d = Math.sqrt(c.d2) || 0;
      const pen = radius - d;
      let nx, ny;
      if (d > 0) { nx = c.dx / d; ny = c.dy / d; }     // contact normal (robust)
      else { nx = s.nx; ny = s.ny; }                   // fallback if on the point
      return { nx, ny, penetration: pen, pointX: c.qx, pointY: c.qy, seg: s };
    }

    // -------- Force arrows (supports per-arrow scale) --------
    // drawArrow(ctx, x, y, vx, vy, color, label, offset=0, opts={ scale?, maxPx? })
    function drawArrow(ctx, x, y, vx, vy, color, label, offset = 0, opts = {}) {
      const len = Math.hypot(vx, vy);
      if (len < 1e-6) return;
      const scale = opts.scale ?? 0.08;
      const maxPx = opts.maxPx ?? 96;
      const ah = 10, aw = 7;
      const L = clamp(len * scale, 14, maxPx);
      const ux = vx / len, uy = vy / len;

      const bx = x + ux * (L - ah);
      const by = y + uy * (L - ah);
      const tipx = x + ux * L;
      const tipy = y + uy * L;

      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tipx, tipy);
      ctx.lineTo(bx - uy * aw, by + ux * aw);
      ctx.lineTo(bx + uy * aw, by - ux * aw);
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(label, tipx + 6, tipy + 4 + offset);
      }
      ctx.restore();
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smoothForces(alpha = 0.25) {
      const L = player.lastForces, S = player.smoothForces;
      for (const k of ["gravity", "normal", "friction", "applied"]) {
        S[k].x = lerp(S[k].x, L[k].x, alpha);
        S[k].y = lerp(S[k].y, L[k].y, alpha);
        S[k].on = L[k].on;
      }
    }

    // Applied force recorded along a provided tangent (and drawn to scale)
    // recordAppliedForce(aDesired_tangent, tx, ty, didJumpImpulse)
    function recordAppliedForce(aDesired_tangent, tx, ty, didJumpImpulse) {
      const ax = tx * aDesired_tangent;
      const ay = ty * aDesired_tangent;
      if (didJumpImpulse) player.lastForces.jumpFlash = 0.12;
      player.lastForces.applied = {
        x: ax, y: ay,
        on: Math.hypot(ax, ay) > 1e-3 || player.lastForces.jumpFlash > 0
      };
    }

    // -------- Ground physics using contact basis (segment direction agnostic) --------
    function applyFrictionAndControl(dt, contact) {
      // Contact basis
      const nx = contact.nx, ny = contact.ny; // collision normal (points out of surface)
      const tx = -ny, ty = nx;                // tangent (consistent regardless of draw direction)

      const { vt, vn } = projectTN(player.vx, player.vy, tx, ty, nx, ny);

      const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const hasInput = want !== 0;
      const aDesired = player.grounded ? world.runAccel * want : world.airControl * want;

      // Gravity in contact basis
      const g_t = dot(0, world.gravity, tx, ty);
      const g_n = dot(0, world.gravity, nx, ny);

      // Normal load per mass (positive when pressing into surface)
      const N_per_mass = Math.max(0, -g_n);
      const maxStatic = world.mu_s * N_per_mass;

      let aDrive = aDesired + g_t;

      // Stick/unlock
      const tryStick =
        Math.abs(vt) < world.vtStick &&
        Math.abs(aDrive) <= maxStatic * world.stickMargin;

      const wantToMove =
        Math.abs(aDrive) > maxStatic * world.unlockBoost ||
        Math.abs(vt) >= world.vtStick * 1.5 ||
        (hasInput && Math.abs(aDesired) > 1e-3);

      if (player.stickLocked && wantToMove) player.stickLocked = false;
      if (!player.stickLocked && tryStick) player.stickLocked = true;

      let vtNew = vt;
      let aFricVis = { x: 0, y: 0, on: false };
      let frictionMode = null;

      if (player.grounded) {
        if (player.stickLocked) {
          // Static friction cancels tangent accel
          const aStatic = clamp(-aDrive, -maxStatic, maxStatic);
          aFricVis = { x: tx * aStatic, y: ty * aStatic, on: Math.abs(aStatic) > 1e-3 };
          vtNew = 0; aDrive = 0; frictionMode = "static";

          // Snap center to surface to avoid micro-creep
          if (player.lastForces.contact) {
            player.x = player.lastForces.contact.x + nx * player.r;
            player.y = player.lastForces.contact.y + ny * player.r;
          }
        } else {
          // Kinetic friction opposes motion/impending motion
          const dir = Math.sign(vt !== 0 ? vt : aDrive || 1);
          const aFricMag = world.mu_k * N_per_mass;
          aDrive -= aFricMag * dir;
          aFricVis = { x: -tx * aFricMag * dir, y: -ty * aFricMag * dir, on: true };
          frictionMode = "kinetic";

          // Only add viscous damping when the player is actively pushing
          vtNew = hasInput ? vt * Math.exp(-world.groundTangentialDamping * dt) : vt;
        }
      }

      // Integrate tangent velocity
      vtNew += aDrive * dt;

      // Clamp only when there's input (don’t cap pure gravity sliding)
      if (player.grounded) {
        if (hasInput) vtNew = clamp(vtNew, -world.maxRunSpeed, world.maxRunSpeed);
      } else {
        const maxAir = world.maxRunSpeed * 1.05;
        vtNew = clamp(vtNew, -maxAir, maxAir);
      }

      // Recompose world velocity
      player.vx = tx * vtNew + nx * vn;
      player.vy = ty * vtNew + ny * vn;

      // Record forces
      player.lastForces.gravity  = { x: 0, y: world.gravity };
      player.lastForces.friction = aFricVis;
      player.lastForces.frictionMode = frictionMode;
      player.lastForces.normal   = { x: nx * N_per_mass, y: ny * N_per_mass, on: N_per_mass > 1e-3 };

      // Record applied along tangent, drawn to scale
      recordAppliedForce(player.grounded ? world.runAccel * want : world.airControl * want, tx, ty, false);
    }

    function tryJump() {
      const canCoyote = player.timeSinceGrounded <= world.coyoteTime;
      const buffered = player.timeSinceJumpPressed <= world.jumpBuffer;
      if (buffered && canCoyote) {
        const n = player.groundNormal;
        const vn = dot(player.vx, player.vy, n.x, n.y);
        player.vx -= vn * n.x;
        player.vy -= vn * n.y;
        player.vy -= world.jumpSpeed;
        recordAppliedForce(0, 1, 0, true); // tangent doesn't matter for the flash
        player.timeSinceJumpPressed = 999;
        player.timeSinceGrounded = 999;
        player.grounded = false;
        player.calmTimer = 0;
        player.stickLocked = false;
      }
    }

    // -------- Main loop --------
    let last = performance.now();
    const fixedFrame = 1 / 120;
    let accumulator = 0;

    function step(dt) {
      player.timeSinceGrounded += dt;
      player.timeSinceJumpPressed += dt;

      // Gravity & integrate
      player.vy += world.gravity * dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;

      // Collisions (collect best ground contact)
      let bestGround = null;
      for (let k = 0; k < 4; k++) {
        let hit = null, maxPen = 0;
        for (const s of segmentsRef.current) {
          const res = resolveCircleSegment(player, s, player.r);
          if (res && res.penetration > maxPen) { hit = res; maxPen = res.penetration; }
        }
        if (!hit) break;

        player.x += hit.nx * hit.penetration;
        player.y += hit.ny * hit.penetration;

        const vn = dot(player.vx, player.vy, hit.nx, hit.ny);
        if (vn < 0) {
          player.vx -= vn * hit.nx;
          player.vy -= vn * hit.ny;
        }

        // "Up-ish" normal means walkable ground (y up is negative)
        if (hit.ny < -0.35) {
          if (!bestGround || hit.ny < bestGround.ny) bestGround = hit;
        }
      }

      if (bestGround) {
        player.grounded = true;
        player.groundNormal = { x: bestGround.nx, y: bestGround.ny };
        player.groundSeg = bestGround.seg;
        player.timeSinceGrounded = 0;
        player.lastForces.contact = { x: bestGround.pointX, y: bestGround.pointY };
        applyFrictionAndControl(dt, bestGround);
      } else {
        player.grounded = false;
        player.groundSeg = null;
        player.lastForces.contact = null;
        player.stickLocked = false;

        const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const aAir = world.airControl * want;
        player.vx += aAir * dt;

        const maxAir = world.maxRunSpeed * 1.05;
        player.vx = clamp(player.vx, -maxAir, maxAir);

        player.lastForces.gravity = { x: 0, y: world.gravity };
        player.lastForces.normal = { x: 0, y: 0, on: false };
        player.lastForces.friction = { x: 0, y: 0, on: false };
        player.lastForces.frictionMode = null;

        // In air, use world-x as "tangent" for applied force
        recordAppliedForce(aAir, 1, 0, false);
      }

      if (input.jumpPressed) input.jumpPressed = false;
      tryJump();

      // Sleep when calm on ground
      if (player.grounded && player.groundSeg) {
        // project onto ground basis for calmness check
        const nx = player.groundNormal.x, ny = player.groundNormal.y;
        const tx = -ny, ty = nx;
        const { vt, vn } = projectTN(player.vx, player.vy, tx, ty, nx, ny);
        const noInput = !input.left && !input.right && !input.jumpHeld;
        const calmTangential = Math.abs(vt) <= world.sleepVt;
        const calmVertical = Math.abs(player.vy) <= world.sleepVy && vn >= -2;
        if (noInput && calmTangential && calmVertical) {
          player.calmTimer += dt;
          if (player.calmTimer >= world.sleepTime) { player.vx = 0; player.vy = 0; }
        } else {
          player.calmTimer = 0;
        }
      }

      if (player.lastForces.jumpFlash > 0) {
        player.lastForces.jumpFlash = Math.max(0, player.lastForces.jumpFlash - dt);
      }

      smoothForces(0.25);

      // bounds
      const pad = 4;
      if (player.x < pad + player.r) { player.x = pad + player.r; if (player.vx < 0) player.vx = 0; }
      if (player.x > world.w() - pad - player.r) { player.x = world.w() - pad - player.r; if (player.vx > 0) player.vx = 0; }
      if (player.y < pad + player.r) { player.y = pad + player.r; if (player.vy < 0) player.vy = 0; }
      if (player.y > world.h() + 200) { Object.assign(player, { x: 60, y: 120, vx: 0, vy: 0, calmTimer: 0, stickLocked: false }); }
    }

    function render() {
      const w = world.w(), h = world.h();
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#f7f9fc"); grad.addColorStop(1, "#eef2f7");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      // Terrain
      ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.strokeStyle = "#343a40";
      ctx.shadowColor = "rgba(0,0,0,0.05)"; ctx.shadowBlur = 2;
      ctx.beginPath();
      for (const s of segmentsRef.current) { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); }
      ctx.stroke();

      // Drawing preview
      if (drawState.dragging) {
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(drawState.sx, drawState.sy);
        ctx.lineTo(drawState.cx, drawState.cy);
        ctx.stroke();
        ctx.restore();
      }

      // Player
      const sz = player.squareSize;
      const x0 = Math.round(player.x - sz / 2);
      const y0 = Math.round(player.y - sz / 2);
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#2563eb"; ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2;
      roundRect(ctx, x0, y0, sz, sz, 6); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

      // HUD
      ctx.fillStyle = "#495057";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Click–drag to add segments. A/D or ←/→ to move — W/Space to jump.", 16, 24);
      const sleeping = player.grounded && player.vx === 0 && player.vy === 0 && player.calmTimer >= world.sleepTime;
      ctx.globalAlpha = sleeping ? 0.8 : 1;
      ctx.fillText(sleeping ? (player.stickLocked ? "Resting (stuck)" : "Resting") : (player.grounded ? "Grounded" : "Airborne"), 16, 44);
      ctx.globalAlpha = 1;

      // Forces + legend
      if (showForcesRef.current) {
        const cx = player.x, cy = player.y;
        const contact = player.lastForces.contact || { x: cx, y: cy };
        const C = { g: "#495057", N: "#16a34a", f: "#f59e0b", A: "#7c3aed" };

        // Gravity (base reference)
        drawArrow(ctx, cx, cy, player.smoothForces.gravity.x, player.smoothForces.gravity.y, C.g, "g", 0);

        // Normal scaled by cosθ relative to gravity arrow
        if (player.smoothForces.normal.on) {
          const Nx = player.smoothForces.normal.x;
          const Ny = player.smoothForces.normal.y;
          const Nmag = Math.hypot(Nx, Ny);
          const cosTheta = Math.max(0, Math.min(1, Nmag / world.gravity));
          const baseScale = 0.08, baseMax = 96;
          const baseGravityPx = Math.max(14, Math.min(baseMax, world.gravity * baseScale));
          const desiredPx = Math.max(14, baseGravityPx * cosTheta);
          const normalOpts = { scale: desiredPx / Math.max(1e-6, Nmag), maxPx: desiredPx + 1 };
          drawArrow(ctx, contact.x, contact.y, Nx, Ny, C.N, "N", 0, normalOpts);
        }

        // Friction (kinetic slightly shorter than static)
        if (player.smoothForces.friction.on) {
          const isStatic = player.lastForces.frictionMode === "static";
          const vis = isStatic ? { scale: 0.08, maxPx: 96 } : { scale: 0.072, maxPx: 90 };
          drawArrow(ctx, contact.x, contact.y,
            player.smoothForces.friction.x, player.smoothForces.friction.y,
            C.f, "f", 15, vis);
        }

        // Applied (to scale; along tangent when grounded, world-x in air)
        let ax = player.smoothForces.applied.x;
        let ay = player.smoothForces.applied.y;
        if (player.lastForces.jumpFlash > 0) ay += -2200; // visual pulse (optional)
        if (player.smoothForces.applied.on || player.lastForces.jumpFlash > 0) {
          drawArrow(ctx, cx, cy, ax, ay, C.A, "F", 0);
        }

        // Legend
        const pad = 40, boxW = 158, boxH = 80;
        const bx = w - boxW - pad, by = pad;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
        roundRect(ctx, bx, by, boxW, boxH, 10); ctx.fill(); ctx.stroke();
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#334155";
        const row = (i) => by + i * 16;
        function dash(x, y, color, text) {
          ctx.strokeStyle = color; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y); ctx.stroke();
          ctx.fillStyle = "#334155"; ctx.fillText(text, x + 22, y + 4);
        }
        dash(bx + 10, row(1), C.g, "g (gravity)");
        dash(bx + 10, row(2), C.N, "N (normal)");
        dash(bx + 10, row(3), C.f, "f (friction)");
        dash(bx + 10, row(4), C.A, "F (applied)");
        ctx.restore();
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; accumulator += dt;
      const subDt = fixedFrame / world.substeps;
      while (accumulator >= fixedFrame) {
        for (let i = 0; i < world.substeps; i++) step(subDt);
        accumulator -= fixedFrame;
      }
      render();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onDown, { capture: true });
      window.removeEventListener("keyup", onUp, { capture: true });
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onClear = () => { clearFnRef.current && clearFnRef.current(); };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ position: "relative" }}>
          <div style={toolbarStyle}>
            <button
              onClick={onClear}
              style={pillButton("#ffffff", "#334155")}
              title="Clear canvas to a single floor line"
            >Clear canvas</button>
            <button
              onClick={() => setShowForces(v => !v)}
              aria-pressed={showForces}
              style={pillButton(showForces ? "#eef2ff" : "#ffffff", showForces ? "#4f46e5" : "#334155")}
              title="Toggle force vectors"
            >{showForces ? "Hide forces" : "Show forces"}</button>
          </div>
          <canvas ref={canvasRef} style={canvasStyle} />
        </div>
      </div>
    </div>
  );
}

/* ---------- styling ---------- */
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "16px",
  background: "#f6f8fb",
  minHeight: "100vh",
  boxSizing: "border-box",
};
const cardStyle = {
  width: "100%",
  maxWidth: 1200,
  background: "#fff",
  border: "1px solid #e9ecef",
  borderRadius: 14,
  boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
  padding: "12px 12px 18px",
};
const titleStyle = {
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  fontSize: 18,
  fontWeight: 600,
  color: "#212529",
  margin: "8px 8px 6px 8px",
};
const toolbarStyle = {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2,
  display: "flex",
  gap: 8,
};
function pillButton(bg, fg) {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: bg,
    color: fg,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    cursor: "pointer",
  };
}
const canvasStyle = {
  width: "100%",
  display: "block",
  borderRadius: 12,
  border: "1px solid #e7ebf0",
  background: "#f7f9fc",
};
