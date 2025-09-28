import React, { useEffect, useRef, useState } from "react";

/**
 * Platformer2 — force-accurate arrows with:
 *  - Drive-only speed cap (gravity can exceed it)
 *  - Static/kinetic friction with dynamic stick tolerances
 *  - Applied-arrow display smoothing & slew limiting
 *  - Tiny-vector suppression
 *  - Clean draw-preview lifecycle
 */
export default function Platformer2() {
  const canvasRef = useRef(null);
  const rafRef   = useRef(null);

  const [showForces, setShowForces] = useState(false);
  const showForcesRef = useRef(showForces);
  useEffect(() => { showForcesRef.current = showForces; }, [showForces]);

  const clearFnRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // ---------- Layout / responsive ----------
    const lastSize = { w: 0, h: 0 };
    const bottomMargin = 48;

    function fit() {
      const parent = canvas.parentElement || document.body;
      const w = Math.min(1200, parent.clientWidth - 24);
      const h = Math.min(720, Math.max(480, Math.floor(w * 0.62)));
      canvas.width = w; canvas.height = h;

      if (lastSize.w && lastSize.h) {
        const sx = w / lastSize.w, sy = h / lastSize.h;
        segmentsRef.current = segmentsRef.current.map(s => seg(s.x1 * sx, s.y1 * sy, s.x2 * sx, s.y2 * sy));
        player.x *= sx; player.y *= sy;
        player.vx *= sx; player.vy *= sy;
      }
      lastSize.w = w; lastSize.h = h;
    }
    fit(); window.addEventListener("resize", fit);

    // ---------- World params (m = 1) ----------
    const world = {
      w: () => canvas.width,
      h: () => canvas.height,
      g: 2000,          // gravity (px/s^2)
      runAccel: 1800,   // desired drive along ground tangent (px/s^2) at full input
      airAccel: 1200,   // in-air horizontal control
      vDriveMax: 600,   // top speed enforced only for *applied drive*
      jumpVy: 700,      // jump impulse
      mu_s: 0.5,        // static friction coefficient (user can change)
      mu_k: 0.2,        // kinetic friction coefficient (will clamp to <= mu_s)
      substeps: 3,
      coyote: 0.08,
      buffer: 0.12,
    };

    // ---------- Arrow display thresholds ----------
    const FORCE_SHOW_EPS = 0.5;   // hide arrows smaller than this (px/s^2)
    const FORCE_ZERO_EPS = 0.25;  // snap smoothed vectors to zero below this
    const FORCE_SLEW_RATE_A = 8000; // applied arrow display slew (px/s^2 per second)

    // ---------- Segments ----------
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
    function resetToFloor() {
      const y = world.h() - bottomMargin;
      const padX = 20;
      segmentsRef.current = [seg(padX, y, world.w() - padX, y)];
      Object.assign(player, {
        x: 80, y: y - 120, vx: 0, vy: 0,
        grounded: false, calm: 0, sticking: false
      });
    }
    clearFnRef.current = resetToFloor;

    // ---------- Player ----------
    const player = {
      x: 140, y: 200, vx: 0, vy: 0,
      r: 18, size: 36,
      grounded: false,
      groundN: { x: 0, y: -1 },
      timeSinceGround: 0,
      timeSinceJump: 999,
      calm: 0,
      sticking: false, // current static-friction state
      F: {
        g: { x: 0, y: world.g, on: true },
        N: { x: 0, y: 0, on: false },
        f: { x: 0, y: 0, on: false, mode: null },
        A: { x: 0, y: 0, on: false },
        contact: null,
      },
      S: {
        g: { x: 0, y: world.g, on: true },
        N: { x: 0, y: 0, on: false },
        f: { x: 0, y: 0, on: false },
        A: { x: 0, y: 0, on: false },
      }
    };

    // ---------- Input ----------
    const input = { L:false, R:false, jump:false, jumpHeld:false };
    const blockKeys = new Set([" ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    function onDown(e) {
      if (blockKeys.has(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.L = true;
      if (e.key === "ArrowRight"|| e.key === "d" || e.key === "D") input.R = true;
      if (e.key === " " || e.key === "w" || e.key === "W") {
        if (!input.jumpHeld) { input.jump = true; player.timeSinceJump = 0; }
        input.jumpHeld = true;
      }
    }
    function onUp(e) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") input.L = false;
      if (e.key === "ArrowRight"|| e.key === "d" || e.key === "D") input.R = false;
      if (e.key === " " || e.key === "w" || e.key === "W") input.jumpHeld = false;
    }
    window.addEventListener("keydown", onDown, { capture:true });
    window.addEventListener("keyup", onUp, { capture:true });

    // ---------- Draw-your-own terrain (preview clears correctly) ----------
    const drawState = { dragging:false, sx:0, sy:0, cx:0, cy:0 };
    function getMouse(evt) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width, sy = canvas.height / r.height;
      return { x: (evt.clientX - r.left) * sx, y: (evt.clientY - r.top) * sy };
    }
    function clampToCanvas(x, y) {
      const m = 2;
      return { x: Math.max(m, Math.min(world.w()-m, x)), y: Math.max(m, Math.min(world.h()-m, y)) };
    }
    function clearPreview() {
      drawState.dragging = false;
      drawState.sx = drawState.sy = drawState.cx = drawState.cy = 0;
    }
    function onMouseDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      const { x, y } = getMouse(e);
      const p = clampToCanvas(x, y);
      drawState.dragging = true; drawState.sx = p.x; drawState.sy = p.y;
      drawState.cx = p.x; drawState.cy = p.y;
    }
    function onMouseMove(e) {
      if (!drawState.dragging) return;
      const { x, y } = getMouse(e);
      const p = clampToCanvas(x, y);
      drawState.cx = p.x; drawState.cy = p.y;
    }
    function onMouseUp(e) {
      if (!drawState.dragging) return;
      e.preventDefault();
      const { x, y } = getMouse(e);
      const p = clampToCanvas(x, y);
      const len = Math.hypot(p.x - drawState.sx, p.y - drawState.sy);
      if (len >= 10) segmentsRef.current.push(seg(drawState.sx, drawState.sy, p.x, p.y));
      clearPreview();
    }
    function onMouseLeave() { if (drawState.dragging) clearPreview(); }
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // ---------- Math helpers ----------
    function seg(x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const L = Math.hypot(dx, dy) || 1;
      const tx = dx / L, ty = dy / L;
      const nx = -ty, ny = tx; // right-hand normal
      return { x1, y1, x2, y2, tx, ty, nx, ny, L };
    }
    const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
    const dot = (ax,ay,bx,by) => ax*bx + ay*by;
    const magnitude = (x, y) => Math.hypot(x, y);

    function closestPointOnSeg(px, py, s) {
      const ax = s.x1, ay = s.y1, bx = s.x2, by = s.y2;
      const abx = bx - ax, aby = by - ay;
      const ab2 = abx*abx + aby*aby || 1;
      let t = ((px-ax)*abx + (py-ay)*aby) / ab2; t = clamp(t, 0, 1);
      const qx = ax + abx*t, qy = ay + aby*t;
      const dx = px - qx, dy = py - qy;
      return { qx, qy, dx, dy, d2: dx*dx + dy*dy };
    }

    function collideCircleSeg(p, s, R) {
      const c = closestPointOnSeg(p.x, p.y, s);
      if (c.d2 >= R*R) return null;
      const d  = Math.sqrt(c.d2) || 0;
      const pen = R - d;
      let nx, ny;
      if (d > 0) { nx = c.dx / d; ny = c.dy / d; } else { nx = s.nx; ny = s.ny; }
      return { nx, ny, pen, qx:c.qx, qy:c.qy, seg:s };
    }

    function projectTN(vx, vy, tx, ty, nx, ny) {
      return { vt: vx*tx + vy*ty, vn: vx*nx + vy*ny };
    }

    function snapTiny(v, eps) {
      if (magnitude(v.x, v.y) < eps) { v.x = 0; v.y = 0; v.on = false; }
      else v.on = true;
      return v;
    }

    // Display-only slew for applied force
    function slewToward(prev, target, maxDelta) {
      const dx = target.x - prev.x;
      const dy = target.y - prev.y;
      const d  = Math.hypot(dx, dy);
      if (d <= maxDelta || maxDelta <= 0) return { x: target.x, y: target.y };
      const s = maxDelta / d;
      return { x: prev.x + dx * s, y: prev.y + dy * s };
    }

    // Dynamic velocity tolerances for static friction entry/exit (angle/step aware)
    function stickVelocityTols(g_t, dt) {
      const base = 0.5;  // px/s baseline to absorb quantization
      const kEnter = 1.5, kExit = 3.5; // wider on exit for hysteresis
      return {
        enter: base + kEnter * Math.abs(g_t) * dt,
        exit:  base + kExit  * Math.abs(g_t) * dt,
      };
    }

    // ---------- Arrow drawing ----------
    function drawArrow(ctx, x, y, fx, fy, color, label, offset = 0, opts = {}) {
      const mag = Math.hypot(fx, fy);
      if (mag < FORCE_SHOW_EPS) return;
      const scale = opts.scale ?? 0.08;
      const maxPx = opts.maxPx ?? 96;
      const L = clamp(mag * scale, 14, maxPx);
      const ux = fx / mag, uy = fy / mag;

      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      const ah = 10, aw = 7;
      const bx = x + ux * (L - ah), by = y + uy * (L - ah);
      const tipx = x + ux * L, tipy = y + uy * L;

      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tipx, tipy);
      ctx.lineTo(bx - uy * aw, by + ux * aw);
      ctx.lineTo(bx + uy * aw, by - ux * aw);
      ctx.closePath(); ctx.fill();

      if (label) {
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(label, tipx + 6, tipy + 4 + offset);
      }
      ctx.restore();
    }

    function lerp(a,b,t){ return a + (b-a)*t; }

    // Smooth all forces; for A, also apply slew-rate limiting (display only).
    function smoothForces(alpha, dt){
      for (const k of ["g","N","f"]) {
        player.S[k].x = lerp(player.S[k].x, player.F[k].x, alpha);
        player.S[k].y = lerp(player.S[k].y, player.F[k].y, alpha);
        snapTiny(player.S[k], FORCE_ZERO_EPS);
      }

      // applied force: low-pass then slew-limit
      const aAlpha = 0.20;
      const targetAx = lerp(player.S.A.x, player.F.A.x, aAlpha);
      const targetAy = lerp(player.S.A.y, player.F.A.y, aAlpha);
      const maxDelta = FORCE_SLEW_RATE_A * dt;
      const nextA = slewToward(player.S.A, { x: targetAx, y: targetAy }, maxDelta);
      player.S.A.x = nextA.x;
      player.S.A.y = nextA.y;
      snapTiny(player.S.A, FORCE_ZERO_EPS);

      player.S.g.on = magnitude(player.S.g.x, player.S.g.y) >= FORCE_SHOW_EPS;
      player.S.N.on = magnitude(player.S.N.x, player.S.N.y) >= FORCE_SHOW_EPS;
      player.S.f.on = magnitude(player.S.f.x, player.S.f.y) >= FORCE_SHOW_EPS;
      player.S.A.on = magnitude(player.S.A.x, player.S.A.y) >= FORCE_SHOW_EPS;
    }

    // ---------- Ground physics with honest forces + stiction hysteresis ----------
    function groundResolve(dt, contact) {
      const nx = contact.nx, ny = contact.ny;
      const tx = -ny, ty = nx;
      const { vt, vn } = projectTN(player.vx, player.vy, tx, ty, nx, ny);

      // Gravity components along (t, n)
      const g_t = dot(0, world.g, tx, ty);
      const g_n = dot(0, world.g, nx, ny);

      // Normal load & friction limits
      const N = Math.max(0, -g_n);
      const mu_k_eff = Math.min(world.mu_k, world.mu_s); // ensure μk ≤ μs
      const F_static_max  = world.mu_s * N;
      const F_kin_mag     = mu_k_eff * N;
      const margin = 0.02 * Math.max(1, N); // small load-scaled margin

      // Desired applied-drive along tangent
      const want = (input.R ? 1:0) - (input.L ? 1:0);
      const F_drive_desired = world.runAccel * want;

      // base values
      let F_A = 0;
      let F_f = 0;
      let mode = null;

      // Try/maintain static regime with hysteresis (dt & slope aware)
      const a_t_no_fric = F_drive_desired + g_t;
      const { enter: VT_ENTER, exit: VT_EXIT } = stickVelocityTols(g_t, dt);
      const canStaticByCapacity = Math.abs(a_t_no_fric) <= (F_static_max - margin);
      const canEnterStatic = (Math.abs(vt) <= VT_ENTER) && canStaticByCapacity;
      const canStayStatic  = (Math.abs(vt) <= VT_EXIT)  &&
                             (Math.abs(a_t_no_fric) <= (F_static_max + margin));

      if ((player.sticking && canStayStatic) || (!player.sticking && canEnterStatic)) {
        // Static: exactly cancel tangent acceleration
        F_A = F_drive_desired;
        F_f = -a_t_no_fric;
        mode = "static";
        player.sticking = true;

        // lock vt to zero in world coords (removes pre-pass gravity leak)
        const vn_now = vn;
        player.vx = nx * vn_now;
        player.vy = ny * vn_now;
      } else {
        // Kinetic sliding
        player.sticking = false;

        const dir = Math.sign(vt !== 0 ? vt : (a_t_no_fric || 1));
        const F_kin = F_kin_mag * dir;

        // ---- Drive-only speed cap logic ----
        // If at/over the drive cap and the *applied* drive would increase |vt|,
        // cut throttle (do NOT brake against gravity; allow free downhill accel).
        const at_if_full = F_drive_desired + g_t - F_kin;
        const overPosCap = (vt >= world.vDriveMax && at_if_full > 0);
        const overNegCap = (vt <= -world.vDriveMax && at_if_full < 0);

        if (want !== 0 && (overPosCap || overNegCap)) {
          const holdZeroAccel_A = -g_t + F_kin; // would make a_t = 0
          // If "holding" would reverse the user's input (i.e., brake), just cut throttle.
          if (Math.sign(holdZeroAccel_A) === Math.sign(F_drive_desired)) {
            F_A = holdZeroAccel_A; // flat/low-slope: applied ≈ friction at cap
          } else {
            F_A = 0; // no engine braking on steep downhills
          }
        } else {
          F_A = F_drive_desired;
        }

        F_f = -F_kin;
        mode = "kinetic";

        // Integrate sliding vt
        const a_t = F_A + g_t + F_f;
        let vtNew = vt + a_t * dt;
        // Only enforce the speed cap when the user is actively pushing.
        if (want !== 0) vtNew = clamp(vtNew, -world.vDriveMax, world.vDriveMax);

        // Recompose world velocity
        const v_world_x = tx * vtNew + nx * vn;
        const v_world_y = ty * vtNew + ny * vn;
        player.vx = v_world_x; player.vy = v_world_y;
      }

      // Update true forces (then snap tiny)
      player.F.g = snapTiny({ x: 0, y: world.g, on: true }, FORCE_SHOW_EPS);
      const Nvec = { x: nx * N, y: ny * N, on: N > 1e-3 };
      player.F.N = snapTiny(Nvec, FORCE_SHOW_EPS);
      player.F.f = snapTiny({ x: tx * F_f, y: ty * F_f, on: Math.abs(F_f) > 1e-3, mode }, FORCE_SHOW_EPS);
      player.F.A = snapTiny({ x: tx * F_A, y: ty * F_A, on: Math.abs(F_A) > 1e-3 }, FORCE_SHOW_EPS);
    }

    function tryJump() {
      const canCoyote = player.timeSinceGround <= world.coyote;
      const buffered  = player.timeSinceJump <= world.buffer;
      if (buffered && canCoyote) {
        const n = player.groundN;
        const vn = dot(player.vx, player.vy, n.x, n.y);
        if (vn < 0) { player.vx -= vn * n.x; player.vy -= vn * n.y; }
        player.vy -= world.jumpVy;
        player.grounded = false;
        player.sticking = false;
        player.timeSinceJump = 999; player.timeSinceGround = 999;
      }
    }

    // ---------- Main loop ----------
    let last = performance.now();
    const stepT = 1/120;
    let acc = 0;

    function step(dt) {
      player.timeSinceGround += dt;
      player.timeSinceJump   += dt;

      // Gravity & integrate (temporary)
      player.vy += world.g * dt;
      player.x  += player.vx * dt;
      player.y  += player.vy * dt;

      // Collide & keep best walkable contact
      let best = null; let maxPen=0;
      for (let k=0;k<4;k++){
        let hit=null;
        for (const s of segmentsRef.current) {
          const col = collideCircleSeg(player, s, player.r);
          if (col && col.pen > maxPen) { hit=col; maxPen=col.pen; }
        }
        if (!hit) break;

        // depenetrate
        player.x += hit.nx * hit.pen;
        player.y += hit.ny * hit.pen;

        // remove into-normal velocity
        const vn = dot(player.vx, player.vy, hit.nx, hit.ny);
        if (vn < 0) {
          player.vx -= vn * hit.nx;
          player.vy -= vn * hit.ny;
        }

        if (hit.ny < -0.35) {
          if (!best || hit.ny < best.ny) best = hit;
        }
      }

      // Reset view-forces each step
      player.F.A = { x:0,y:0,on:false };
      player.F.f = { x:0,y:0,on:false,mode:null };
      player.F.N = { x:0,y:0,on:false };
      player.F.g = { x:0,y:world.g,on:true };
      player.F.contact = null;

      if (best) {
        player.grounded = true;
        player.groundN = { x: best.nx, y: best.ny };
        player.timeSinceGround = 0;
        player.F.contact = { x: best.qx, y: best.qy };

        // Ground dynamics (with hysteresis & drive-only cap)
        groundResolve(dt, best);
      } else {
        player.grounded = false;
        player.sticking = false;

        // Air control (applied horizontal in world-x) — keep a gentle cap in air
        const want = (input.R ? 1:0) - (input.L ? 1:0);
        const F_Air = world.airAccel * want;
        player.vx += F_Air * dt;

        const vMaxAir = world.vDriveMax * 1.05;
        player.vx = clamp(player.vx, -vMaxAir, vMaxAir);

        player.F.A = snapTiny({ x: F_Air, y: 0, on: Math.abs(F_Air) > 1e-3 }, FORCE_SHOW_EPS);
        player.F.f = snapTiny({ x: 0, y: 0, on: false, mode: null }, FORCE_SHOW_EPS);
        player.F.N = snapTiny({ x: 0, y: 0, on: false }, FORCE_SHOW_EPS);
        player.F.g = snapTiny({ x: 0, y: world.g, on: true }, FORCE_SHOW_EPS);
      }

      // Jump
      if (input.jump) input.jump = false;
      tryJump();

      // Keep in bounds
      const pad = 4;
      if (player.x < pad + player.r) { player.x = pad + player.r; if (player.vx < 0) player.vx = 0; }
      if (player.x > world.w()-pad-player.r){ player.x = world.w()-pad-player.r; if (player.vx > 0) player.vx = 0; }
      if (player.y < pad + player.r) { player.y = pad + player.r; if (player.vy < 0) player.vy = 0; }
      if (player.y > world.h() + 200) { Object.assign(player, { x: 60, y: 120, vx:0, vy:0, grounded:false, sticking:false }); }

      // Display smoothing
      smoothForces(0.25, dt);
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

      // Drawing preview (only if actively dragging)
      if (drawState.dragging) {
        ctx.save();
        ctx.setLineDash([8,8]); ctx.strokeStyle = "#64748b"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(drawState.sx, drawState.sy); ctx.lineTo(drawState.cx, drawState.cy); ctx.stroke();
        ctx.restore();
      }

      // Player body
      const sz = player.size;
      const x0 = Math.round(player.x - sz/2);
      const y0 = Math.round(player.y - sz/2);
      ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#2563eb"; ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2;
      roundRect(ctx, x0, y0, sz, sz, 6); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

      // HUD
      ctx.fillStyle = "#495057";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Click–drag to add segments. A/D or ←/→ to move — W/Space to jump.", 16, 24);
      ctx.fillText(player.grounded ? (player.sticking ? "Grounded (static)" : "Grounded (sliding)") : "Airborne", 16, 44);

      // Forces
      if (showForcesRef.current) {
        const C = { g:"#495057", N:"#16a34a", f:"#f59e0b", A:"#7c3aed" };
        const cx = player.x, cy = player.y;
        const contact = player.F.contact || { x: cx, y: cy };

        drawArrow(ctx, cx, cy, player.S.g.x, player.S.g.y, C.g, "g", 0);
        if (player.S.N.on) drawArrow(ctx, contact.x, contact.y, player.S.N.x, player.S.N.y, C.N, "N", 0, { scale: 0.045 });
        if (player.S.f.on) drawArrow(ctx, contact.x, contact.y, player.S.f.x, player.S.f.y, C.f, "f", 15);
        if (player.S.A.on) drawArrow(ctx, cx, cy, player.S.A.x, player.S.A.y, C.A, "F", 0);

        // Legend
        const pad = 40, boxW = 158, boxH = 80;
        const bx = w - boxW - pad, by = pad;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
        roundRect(ctx, bx, by, boxW, boxH, 10); ctx.fill(); ctx.stroke();
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillStyle = "#334155";
        const row = i => by + i*16;
        function dash(x,y,color,text){
          ctx.strokeStyle = color; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+16,y); ctx.stroke();
          ctx.fillText(text, x+22, y+4);
        }
        dash(bx+10, row(1), C.g, "g (gravity)");
        dash(bx+10, row(2), C.N, "N (normal)");
        dash(bx+10, row(3), C.f, "f (friction)");
        dash(bx+10, row(4), C.A, "F (applied)");
        ctx.restore();
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.lineTo(x+w-rr, y);
      ctx.quadraticCurveTo(x+w, y, x+w, y+rr);
      ctx.lineTo(x+w, y+h-rr);
      ctx.quadraticCurveTo(x+w, y+h, x+w-rr, y+h);
      ctx.lineTo(x+rr, y+h);
      ctx.quadraticCurveTo(x, y+h, x, y+h-rr);
      ctx.lineTo(x, y+rr);
      ctx.quadraticCurveTo(x, y, x+rr, y);
      ctx.closePath();
    }

    function loop(now){
      const dt = Math.min(0.05, (now - last)/1000);
      last = now; acc += dt;
      const subDt = (1/120) / world.substeps;
      while (acc >= 1/120) {
        for (let i=0;i<world.substeps;i++) step(subDt);
        acc -= 1/120;
      }
      render();
      rafRef.current = requestAnimationFrame(loop);
    }
    last = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onDown, { capture:true });
      window.removeEventListener("keyup", onUp, { capture:true });
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
