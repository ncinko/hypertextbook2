import React, { useEffect, useRef, useState } from "react";

/**
 * SimplePlatformer – rigid square (tumbles), platform-styled ramps, smoothed CoM force vectors
 *
 * This revision addresses:
 * 1) **Tunneling / ground clipping** at high landing speeds via **adaptive substepping**
 *    and Baumgarte-stabilized impulses + clamped positional correction.
 * 2) **Jittery force arrows** by averaging forces over substeps and applying an EMA smoother
 *    before drawing. (We still draw **only CoM forces**.)
 * 3) **Trouble coming to rest**: adds a gentle sleep when net force and velocities are tiny
 *    (no static friction model; just damping + sleep threshold).
 */
export default function SimplePlatformer() {
  // ---------- Tunables ----------
  const CANVAS_W = 900, CANVAS_H = 540;
  const WORLD_W = 4200, WORLD_H = 1600;

  const BOX = { w: 44, h: 44 };
  const MASS = 0.6;                // kg
  const INV_M = 1 / MASS;
  const Izz = (1 / 12) * MASS * (BOX.w * BOX.w + BOX.h * BOX.h); // kg·px^2 (visual units)
  const INV_I = 1 / Izz;

  const F_MOVE = 1150;             // N (left/right applied force)
  const JUMP_FORCE = 43000;        // N
  const JUMP_DURATION = 0.35;      // s
  const GRAVITY = 980;             // px/s^2
  const MU_K = 0.28;               // kinetic friction coefficient
  const RESTITUTION = 0.03;        // tiny bounce

  const ANGULAR_DAMP = 0.995;      // global angular damping per step
  const LINEAR_DAMP  = 0.999;      // mild linear damping per step
  const MAX_SPEED = 1200;          // clamp to avoid numeric explosions
  const MAX_OMEGA = 10;            // rad/s clamp

  // Baumgarte stabilization (bias term uses penetration depth)
  const BAUMG = 0.25;              // 0..1 (higher = more aggressive separation)
  const PEN_SLOP = 0.5;            // penetration slop before bias kicks in (px)
  const POS_CORR_MAX = 6;          // max positional correction per substep (px)

  // Force display smoothing
  const FORCE_EMA_ALPHA = 0.3;     // 0..1; higher = more responsive, lower = smoother

  // Sleep thresholds (helps the box actually come to rest)
  const SLEEP_V = 2.0;             // px/s
  const SLEEP_W = 0.12;            // rad/s
  const SLEEP_F = 30.0;            // N (net CoM force magnitude)

  // Render style
  const PLATFORM_FILL = "#d9e3f0";
  const PLATFORM_STROKE = "#94a3b8";
  const PLATFORM_BORDER_W = 2;
  const RAMP_THICKNESS = 12;

  // ---------- World geometry ----------
  const PLATFORMS = [
    { x: 0, y: WORLD_H - 40, w: WORLD_W, h: 40 },
    { x: 260,  y: WORLD_H - 280, w: 200, h: 24 },
    { x: 580,  y: WORLD_H - 420, w: 220, h: 24 },
    { x: 940,  y: WORLD_H - 520, w: 240, h: 24 },
    { x: 1340, y: WORLD_H - 420, w: 240, h: 24 },
    { x: 1660, y: WORLD_H - 300, w: 220, h: 24 },
    { x: 2400, y: WORLD_H - 420, w: 280, h: 24 },
    { x: 2820, y: WORLD_H - 560, w: 260, h: 24 },
    { x: 3160, y: WORLD_H - 700, w: 240, h: 24 },
  ];

  // Ramps with a range of slopes (all drawn like platforms)
  const RAMPS = [
    { x1: 700,  y1: WORLD_H - 180, x2: 1000, y2: WORLD_H - 220 }, // shallow up
    { x1: 1000, y1: WORLD_H - 220, x2: 1280, y2: WORLD_H - 160 }, // shallow down
    { x1: 1500, y1: WORLD_H - 220, x2: 1720, y2: WORLD_H - 320 }, // medium up
    { x1: 1720, y1: WORLD_H - 320, x2: 1950, y2: WORLD_H - 260 }, // medium down
    { x1: 2100, y1: WORLD_H - 200, x2: 2220, y2: WORLD_H - 360 }, // steep up
    { x1: 2350, y1: WORLD_H - 360, x2: 2520, y2: WORLD_H - 220 }, // steep down
    { x1: 3300, y1: WORLD_H - 260, x2: 3550, y2: WORLD_H - 340 }, // medium up
    { x1: 3550, y1: WORLD_H - 340, x2: 3800, y2: WORLD_H - 300 }, // medium down
  ];

  // ---------- State ----------
  const canvasRef = useRef(null);
  const [gravityOn, setGravityOn] = useState(true);
  const [frictionOn, setFrictionOn] = useState(true);

  const keysRef = useRef({ left: false, right: false, jump: false });
  const wantJumpRef = useRef(false);
  const jumpTimerRef = useRef(0);

  const bodyRef = useRef({
    // position stored as TOP-LEFT; center derived
    x: 80,
    y: WORLD_H - 80 - BOX.h,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    _forcesSmooth: null, // EMA store for display
  });

  const camRef = useRef({ x: 0, y: 0 });

  // ---------- Utils ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function drawArrow(ctx, fromX, fromY, toX, toY, color, label, opts = {}) {
    const dx = toX - fromX, dy = toY - fromY; const len = Math.hypot(dx, dy); if (len < 1e-6) return;
    const ux = dx / len, uy = dy / len;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = opts.lineWidth || 3; ctx.globalAlpha = opts.alpha ?? 1;
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
    const ah = opts.head || 12, aw = opts.wing || 8;
    const p1x = toX - ux * ah - uy * aw, p1y = toY - uy * ah + ux * aw;
    const p2x = toX - ux * ah + uy * aw, p2y = toY - uy * ah - ux * aw;
    ctx.beginPath(); ctx.moveTo(toX, toY); ctx.lineTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.closePath();
    if (opts.strokeOnly) ctx.stroke(); else { ctx.fillStyle = color; ctx.fill(); }
    if (label) { ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = color; ctx.fillText(label, toX + 6, toY - 6); }
    ctx.restore();
  }

  function lineAtX(seg, x) {
    const { x1, y1, x2, y2 } = seg;
    if (x < Math.min(x1, x2) || x > Math.max(x1, x2)) return null;
    const t = (x2 === x1) ? 0 : (x - x1) / (x2 - x1);
    const y = y1 + t * (y2 - y1);
    const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy) || 1;
    // Upward normal (screen y down -> upward means ny < 0)
    let nx = -dy / len, ny = dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
    return { y, nx, ny };
  }

  function topmostSurfaceAtX(x, yCorner, tolerance = 160) {
    // return smallest y within band (topmost) and its upward normal
    let best = null; // choose MIN y
    for (const s of RAMPS) { const d = lineAtX(s, x); if (!d) continue; if (d.y <= yCorner + tolerance) { if (!best || d.y < best.y) best = d; } }
    for (const r of PLATFORMS) { if (x >= r.x && x <= r.x + r.w) { const y = r.y; const nx = 0, ny = -1; if (y <= yCorner + tolerance) { if (!best || y < best.y) best = { y, nx, ny }; } } }
    return best;
  }

  // 2D helpers
  const dot = (ax, ay, bx, by) => ax * bx + ay * by;
  const crossZ = (ax, ay, bx, by) => ax * by - ay * bx; // 2D cross -> z scalar

  function getCorners(x, y, angle) {
    const cx = x + BOX.w / 2, cy = y + BOX.h / 2; const c = Math.cos(angle), s = Math.sin(angle); const hw = BOX.w / 2, hh = BOX.h / 2;
    const ptsLocal = [ { x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh } ];
    const pts = ptsLocal.map(p => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c }));
    return { cx, cy, pts };
  }

  // ---------- Input ----------
  useEffect(() => {
    const onDown = (e) => { if (e.repeat) return; if (e.key === "ArrowLeft") keysRef.current.left = true; if (e.key === "ArrowRight") keysRef.current.right = true; if (e.code === "Space") { keysRef.current.jump = true; wantJumpRef.current = true; } };
    const onUp =   (e) => { if (e.key === "ArrowLeft") keysRef.current.left = false; if (e.key === "ArrowRight") keysRef.current.right = false; if (e.code === "Space") { keysRef.current.jump = false; jumpTimerRef.current = 0; } };
    window.addEventListener("keydown", onDown); window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // ---------- Main loop ----------
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    let last = performance.now(); let rafId; const baseH = 1 / 120; let acc = 0;

    function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt; while (acc >= baseH) { physics(baseH); acc -= baseH; } render(ctx); rafId = requestAnimationFrame(loop); }

    function physics(dt) {
      const b = bodyRef.current;
      let frameAcc = { Applied: {x:0,y:0}, Gravity: {x:0,y:0}, Normal: {x:0,y:0}, Friction: {x:0,y:0}, Jump: {x:0,y:0} };
      let onGround = false;

      // Adaptive substepping to limit travel per substep (prevents tunneling)
      const maxTravel = 0.25 * Math.min(BOX.w, BOX.h); // px per substep
      const estTravel = Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt;
      const subSteps = Math.max(1, Math.min(12, Math.ceil(estTravel / maxTravel)));
      const h = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        // External forces (constant within the frame)
        let Fx = 0, Fy = 0;
        if (keysRef.current.left)  Fx -= F_MOVE;
        if (keysRef.current.right) Fx += F_MOVE;
        if (gravityOn) Fy += MASS * GRAVITY;

        // Integrate free motion
        b.vx = (b.vx + (Fx * INV_M) * h) * LINEAR_DAMP;
        b.vy = (b.vy + (Fy * INV_M) * h) * LINEAR_DAMP;
        b.vx = clamp(b.vx, -MAX_SPEED, MAX_SPEED);
        b.vy = clamp(b.vy, -MAX_SPEED, MAX_SPEED);

        let nx = b.x + b.vx * h;
        let ny = b.y + b.vy * h;
        let angle = b.angle;
        let omega = b.omega * ANGULAR_DAMP;

        // Contact: deepest penetrating corner vs TOPMOST surface
        const { cx, cy, pts } = getCorners(nx, ny, angle);
        let bestContact = null; // { cornerIndex, pen, nx, ny, ySurf }
        for (let i = 0; i < 4; i++) {
          const corner = pts[i];
          const surf = topmostSurfaceAtX(corner.x, corner.y);
          if (!surf) continue;
          const penetration = corner.y - surf.y; // >0: corner below surface
          if (penetration > 0) {
            if (!bestContact || penetration > bestContact.pen) {
              bestContact = { cornerIndex: i, pen: penetration, nx: surf.nx, ny: surf.ny, ySurf: surf.y };
            }
          }
        }

        if (bestContact) {
          onGround = true;
          const n = { x: bestContact.nx, y: bestContact.ny }; // upward normal
          const t = { x: -n.y, y: n.x };

          const corner = pts[bestContact.cornerIndex];
          const rx = corner.x - cx, ry = corner.y - cy; // r from CoM to contact point
          const vpx = b.vx + (-omega * ry);
          const vpy = b.vy + ( omega * rx);

          let vrel_n = dot(vpx, vpy, n.x, n.y);
          const vrel_t = dot(vpx, vpy, t.x, t.y);

          // Baumgarte positional bias
          const bias = BAUMG * Math.max(0, bestContact.pen - PEN_SLOP) / h;
          vrel_n += bias;

          const rn = crossZ(rx, ry, n.x, n.y);
          const rt = crossZ(rx, ry, t.x, t.y);
          const k_n = INV_M + (rn * rn) * INV_I;
          const k_t = INV_M + (rt * rt) * INV_I;

          // Normal impulse
          let jn = 0;
          if (vrel_n < 0) {
            jn = -(1 + RESTITUTION) * vrel_n / k_n;
            if (jn < 0) jn = 0;
          }

          // Friction impulse (kinetic)
          let jt = 0;
          if (frictionOn && Math.abs(vrel_t) > 1e-6) {
            const jtRaw = -vrel_t / k_t;
            const jtMax = MU_K * jn;
            jt = Math.max(-jtMax, Math.min(jtRaw, jtMax));
          }

          // Apply impulses
          const Jx = n.x * jn + t.x * jt;
          const Jy = n.y * jn + t.y * jt;
          b.vx += Jx * INV_M;
          b.vy += Jy * INV_M;
          omega += (rn * jn + rt * jt) * INV_I;

          // Positional correction – push OUT along normal (clamped)
          const corr = Math.min(bestContact.pen, POS_CORR_MAX);
          nx += n.x * corr;
          ny += n.y * corr;

          // Jump support (only while in contact)
          if (wantJumpRef.current) jumpTimerRef.current = 0;
          if (keysRef.current.jump && jumpTimerRef.current < JUMP_DURATION) {
            const Fy_jump = -JUMP_FORCE;
            b.vy += (Fy_jump * INV_M) * h;
            frameAcc.Jump.x += 0; frameAcc.Jump.y += Fy_jump;
            jumpTimerRef.current += h;
          }

          // Collect forces for display (convert impulses to average forces over the substep)
          const Nforce = jn / h; const Tforce = jt / h;
          frameAcc.Normal.x += n.x * Nforce; frameAcc.Normal.y += n.y * Nforce;
          frameAcc.Friction.x += t.x * Tforce; frameAcc.Friction.y += t.y * Tforce;
        } else {
          if (!keysRef.current.jump) jumpTimerRef.current = 0;
        }

        // Commit this substep state
        b.x = clamp(nx, 0, WORLD_W - BOX.w);
        b.y = clamp(ny, 0, WORLD_H - BOX.h);
        omega = clamp(omega, -MAX_OMEGA, MAX_OMEGA);
        b.angle = b.angle + omega * h;
        b.omega = omega;

        // Accumulate constant external forces for display
        if (keysRef.current.left || keysRef.current.right) { frameAcc.Applied.x += Fx; frameAcc.Applied.y += 0; }
        if (gravityOn) { frameAcc.Gravity.y += MASS * GRAVITY; }
      }

      // Average forces over substeps
      const invSub = 1 / subSteps;
      const frameForces = [];
      const names = ["Applied","Gravity","Normal","Friction","Jump"];
      for (const n of names) {
        const v = frameAcc[n];
        if (!v) continue;
        const fx = v.x * invSub, fy = v.y * invSub;
        if (Math.abs(fx) + Math.abs(fy) > 1e-6) frameForces.push({ name: n, x: fx, y: fy, color: colorFor(n) });
      }

      // EMA smoothing for display
      const prev = b._forcesSmooth || null;
      const smooth = smoothForces(prev, frameForces, FORCE_EMA_ALPHA);
      b._forcesSmooth = smooth;

      // Optional sleep to truly settle
      const net = netForce(smooth);
      const speed = Math.hypot(b.vx, b.vy);
      if (onGround && net.mag < SLEEP_F && speed < SLEEP_V && Math.abs(b.omega) < SLEEP_W) {
        b.vx = 0; b.vy = 0; b.omega = 0; // do not snap angle; let it rest as-is
      }

      // Camera
      camRef.current.x = clamp(b.x + BOX.w / 2 - CANVAS_W / 2, 0, WORLD_W - CANVAS_W);
      camRef.current.y = clamp(b.y + BOX.h / 2 - CANVAS_H / 2, 0, WORLD_H - CANVAS_H);

      // Stash flags for HUD
      b._onGround = onGround;
    }

    function render(ctx) {
      const cam = camRef.current; const b = bodyRef.current;

      // Clear & sky
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#eef6ff"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid
      ctx.save(); ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 1;
      const grid = 50; const startX = -((cam.x % grid) + grid) % grid; const startY = -((cam.y % grid) + grid) % grid;
      for (let x = startX; x < CANVAS_W; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke(); }
      for (let y = startY; y < CANVAS_H; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_H, y); ctx.stroke(); }
      ctx.restore();

      // Platforms
      for (const r of PLATFORMS) {
        const sx = r.x - cam.x, sy = r.y - cam.y;
        ctx.fillStyle = PLATFORM_FILL; ctx.fillRect(sx, sy, r.w, r.h);
        ctx.strokeStyle = PLATFORM_STROKE; ctx.lineWidth = PLATFORM_BORDER_W; ctx.strokeRect(sx, sy, r.w, r.h);
      }

      // Ramps as thick quads
      function drawThickSegment(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1; const len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
        const offX = nx * RAMP_THICKNESS, offY = ny * RAMP_THICKNESS;
        const a1x = x1 - cam.x, a1y = y1 - cam.y; const a2x = x2 - cam.x, a2y = y2 - cam.y;
        ctx.beginPath(); ctx.moveTo(a1x, a1y); ctx.lineTo(a2x, a2y); ctx.lineTo(a2x + offX, a2y + offY); ctx.lineTo(a1x + offX, a1y + offY); ctx.closePath();
        ctx.fillStyle = PLATFORM_FILL; ctx.fill(); ctx.strokeStyle = PLATFORM_STROKE; ctx.lineWidth = PLATFORM_BORDER_W; ctx.stroke();
      }
      for (const s of RAMPS) drawThickSegment(s.x1, s.y1, s.x2, s.y2);

      // Player (rigid, rotated square)
      const { cx, cy } = getCorners(b.x, b.y, b.angle);
      ctx.save(); ctx.translate(cx - cam.x, cy - cam.y); ctx.rotate(b.angle);
      ctx.fillStyle = "#222"; ctx.fillRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h);
      ctx.strokeStyle = "#444"; ctx.lineWidth = 2; ctx.strokeRect(-BOX.w / 2, -BOX.h / 2, BOX.w, BOX.h);
      ctx.restore();

      // Force vectors (smoothed) from CoM
      const scale = 0.22; const cmx = cx - cam.x, cmy = cy - cam.y;
      const smooth = b._forcesSmooth || [];
      let netX = 0, netY = 0;
      for (const f of smooth) { netX += f.x; netY += f.y; drawArrow(ctx, cmx, cmy, cmx + f.x * scale, cmy + f.y * scale, f.color, f.name); }
      drawArrow(ctx, cmx, cmy, cmx + netX * scale, cmy + netY * scale, "#e63946", "Net", { strokeOnly: true, lineWidth: 6, alpha: 0.9, head: 14, wing: 9 });

      // HUD
      ctx.fillStyle = "#111"; ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`x=${b.x.toFixed(1)}  y=${b.y.toFixed(1)}   vx=${b.vx.toFixed(1)}  vy=${b.vy.toFixed(1)}  angle=${(b.angle*180/Math.PI).toFixed(1)}°`, 12, 20);
      ctx.fillText(`grounded=${b._onGround?"yes":"no"}  gravity=${gravityOn?"on":"off"}  friction=${frictionOn?"on":"off"}`, 12, 40);

      // Legend
      const legend = [["Gravity", "#2a9d8f"],["Normal", "#1d3557"],["Friction", "#e76f51"],["Applied/Jump", "#f72585"],["Net (outline)", "#e63946"]];
      let lx = CANVAS_W - 210, ly = 16; ctx.font = "13px system-ui, sans-serif";
      for (const [name, col] of legend) { ctx.fillStyle = col; ctx.fillRect(lx, ly, 10, 10); ctx.fillStyle = "#111"; ctx.fillText(name, lx + 16, ly + 10); ly += 18; }
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gravityOn, frictionOn]);

  return (
    <div style={{ maxWidth: CANVAS_W, margin: "12px auto", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ margin: "4px 0 8px" }}>Simple Platformer – rigid square & ramps</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <Toggle checked={gravityOn} onChange={setGravityOn} label="Gravity" />
        <Toggle checked={frictionOn} onChange={setFrictionOn} label="Sliding friction" />
        <div style={{ opacity: 0.8, fontSize: 13, color: "#334155" }}>←/→ move, Space jump. No static friction; kinetic when in contact.</div>
      </div>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: "100%", height: "auto", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.06)" }} />
    </div>
  );
}

function colorFor(name){
  switch(name){
    case "Gravity": return "#2a9d8f";
    case "Normal": return "#1d3557";
    case "Friction": return "#e76f51";
    case "Applied": return "#f72585";
    case "Jump": return "#f72585";
    default: return "#000";
  }
}

function smoothForces(prev, current, alpha){
  // Merge by force name with EMA on vectors
  const out = [];
  const byName = new Map();
  for(const f of current){ byName.set(f.name, {x:f.x, y:f.y, color:f.color}); }
  if(prev){
    for(const pf of prev){
      const cur = byName.get(pf.name) || {x:0,y:0,color:pf.color};
      const sx = pf.x + alpha*(cur.x - pf.x);
      const sy = pf.y + alpha*(cur.y - pf.y);
      out.push({ name: pf.name, x: sx, y: sy, color: cur.color || pf.color });
      byName.delete(pf.name);
    }
  }
  for(const [name, v] of byName.entries()){
    out.push({ name, x: v.x, y: v.y, color: v.color }); // first frame for this term
  }
  return out;
}

function netForce(arr){
  let x=0,y=0; for(const f of (arr||[])){ x+=f.x; y+=f.y; } return { x, y, mag: Math.hypot(x,y) };
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, userSelect: "none", cursor: "pointer" }}>
      <span onClick={() => onChange(!checked)} style={{ width: 48, height: 28, borderRadius: 999, padding: 3, background: checked ? "#4ade80" : "#cbd5e1", position: "relative", transition: "background 160ms", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)" }} role="switch" aria-checked={checked} aria-label={label}>
        <span style={{ position: "absolute", top: 3, left: checked ? 48 - 3 - 22 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 160ms" }} />
      </span>
      <span style={{ fontSize: 14, color: "#111827" }}>{label}</span>
    </label>
  );
}
