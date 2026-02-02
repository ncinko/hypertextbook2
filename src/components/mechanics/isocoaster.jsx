import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * IsoCoaster.jsx
 * - React port of your HTML "isometric coaster engine" prototype.
 * - No Tailwind dependency, no DOM querying by id.
 * - Canvas render loop + editor/sim controls.
 *
 * Patches:
 * 1) Removed Loop button (kept loop logic).
 * 2) Rotate View acts like camera rotation (rotate around pivot).
 * 3) If track forms a closed circuit, coaster can run multiple laps.
 */

const TILE_W = 64;
const TILE_H = 32;

// Physics/constants
const GRAVITY = 9.81;
const SCALE_METERS = 4;
const LIFT_SPEED = 3.5;
const BOOST_SPEED = 40; // m/s
const TRACK_WIDTH = 0.45;

const PALETTE = {
  RAIL: "#cbd5e1",
  TIE: "#475569",
  SPINE: "#1e293b",
  CHAIN: "#eab308",
  BOOST: "#10b981",
};

const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
];

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

/**
 * Camera-like iso: rotate around a pivot (world-space)
 * so Rotate View feels like rotating the camera, not the coaster.
 */
function toIso(x, y, z, rot, pivot = { x: 0, y: 0 }) {
  let rx = x - pivot.x;
  let ry = y - pivot.y;

  if (rot === 1) {
    const nx = ry;
    const ny = -rx;
    rx = nx;
    ry = ny;
  } else if (rot === 2) {
    rx = -rx;
    ry = -ry;
  } else if (rot === 3) {
    const nx = -ry;
    const ny = rx;
    rx = nx;
    ry = ny;
  }

  rx += pivot.x;
  ry += pivot.y;

  return {
    x: (rx - ry) * TILE_W * 0.5,
    y: (rx + ry) * TILE_H * 0.5 - z * TILE_H,
  };
}

function bezier(t, p0, p1, p2, p3) {
  const iT = 1 - t;
  const x =
    iT * iT * iT * p0.x +
    3 * iT * iT * t * p1.x +
    3 * iT * t * t * p2.x +
    t * t * t * p3.x;
  const y =
    iT * iT * iT * p0.y +
    3 * iT * iT * t * p1.y +
    3 * iT * t * t * p2.y +
    t * t * t * p3.y;
  const z =
    iT * iT * iT * p0.z +
    3 * iT * iT * t * p1.z +
    3 * iT * t * t * p2.z +
    t * t * t * p3.z;
  return { x, y, z };
}

function bezierTangent(t, p0, p1, p2, p3) {
  const iT = 1 - t;
  const dx =
    3 * iT * iT * (p1.x - p0.x) +
    6 * iT * t * (p2.x - p1.x) +
    3 * t * t * (p3.x - p2.x);
  const dy =
    3 * iT * iT * (p1.y - p0.y) +
    6 * iT * t * (p2.y - p1.y) +
    3 * t * t * (p3.y - p2.y);
  const dz =
    3 * iT * iT * (p1.z - p0.z) +
    6 * iT * t * (p2.z - p1.z) +
    3 * t * t * (p3.z - p2.z);
  return { x: dx, y: dy, z: dz };
}

// 3D vector helpers
function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function norm(v) {
  const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return l > 0 ? { x: v.x / l, y: v.y / l, z: v.z / l } : v;
}

function estimateBezierLength(bz) {
  // 10-chord estimate like your original
  let len = 0;
  let prev = bz.p0;
  for (let i = 1; i <= 10; i++) {
    const cur = bezier(i / 10, bz.p0, bz.p1, bz.p2, bz.p3);
    const dx = cur.x - prev.x,
      dy = cur.y - prev.y,
      dz = cur.z - prev.z;
    len += Math.sqrt(dx * dx + dy * dy + dz * dz) * SCALE_METERS;
    prev = cur;
  }
  return len;
}

function makeId() {
  return Math.floor(Math.random() * 1e9) + Date.now();
}

export default function IsoCoaster() {
  const canvasRef = useRef(null);

  // HUD state (lightweight values; we update these at ~30fps)
  const [hud, setHud] = useState({
    v: 0,
    gVert: 1.0,
    gLat: 0.0,
    h: 0,
    maxZ: 10,
    maxSpeed: 40,
    stalled: false,
    laps: 0,
    closed: false,
  });

  // Keep the engine in a ref so React doesn’t re-render the whole world each frame.
  const engineRef = useRef(null);

  // Styles (simple “tailwind-ish” look without Tailwind)
  const styles = useMemo(() => {
    const panel = {
      background: "rgba(15, 23, 42, 0.95)",
      border: "1px solid #334155",
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
    };
    const btn = (active, activeBg, activeText) => ({
      userSelect: "none",
      transition: "all 0.1s",
      border: "1px solid #475569",
      background: active ? activeBg : "rgba(51,65,85,0.7)",
      color: active ? activeText : "#e2e8f0",
      borderRadius: 10,
      padding: "10px 12px",
      fontWeight: 800,
      fontSize: 12,
      cursor: "pointer",
    });
    const smallBtn = (active, activeBg, activeText) => ({
      ...btn(active, activeBg, activeText),
      padding: "8px 10px",
      borderRadius: 10,
      fontSize: 11,
    });
    return { panel, btn, smallBtn };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });

    const engine = {
      // view
      offsetX: window.innerWidth / 2,
      offsetY: window.innerHeight / 3,
      zoom: 1.0,
      rotation: 0,
      showHeight: true,

      // build mode toggles
      liftActive: false,
      boostActive: false,

      // track + cursor
      track: [],
      cursor: { x: 0, y: 0, z: 10, dir: 0, slope: 0 },
      trackStats: { minZ: 0, maxZ: 10, maxSpeed: 40 },

      // sim
      simActive: false,
      cart: {
        segmentIdx: 0,
        subSegIdx: 0,
        t: 0,
        v: 0,
        dist: 0,
        stopped: true,
        totalE: 0,
        laps: 0,
      },

      // cached circuit state
      isClosed: false,

      // timing
      lastTime: 0,
      lastHudPush: 0,

      resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },

      // Focus point for camera-style rotation
      getPivot() {
        if (this.track.length) {
          let sx = 0,
            sy = 0,
            n = 0;
          for (const seg of this.track) {
            sx += seg.p0.x + seg.p3.x;
            sy += seg.p0.y + seg.p3.y;
            n += 2;
          }
          return { x: sx / n, y: sy / n };
        }
        return { x: this.cursor.x, y: this.cursor.y };
      },

      recomputeClosedCircuit() {
        // "closed" means last endpoint matches first start (x,y,z), within eps.
        if (this.track.length < 2) {
          this.isClosed = false;
          return this.isClosed;
        }
        const first = this.track[0];
        const last = this.track[this.track.length - 1];
        if (!first || !last) {
          this.isClosed = false;
          return this.isClosed;
        }
        const eps = 1e-6;
        const dx = Math.abs(last.p3.x - first.p0.x);
        const dy = Math.abs(last.p3.y - first.p0.y);
        const dz = Math.abs(last.p3.z - first.p0.z);

        this.isClosed = dx < eps && dy < eps && dz < eps;
        return this.isClosed;
      },

      updateTrackStats() {
        if (this.track.length === 0) return;

        let min = Infinity,
          max = -Infinity;

        this.track.forEach((s) => {
          min = Math.min(min, s.p0.z, s.p3.z);
          max = Math.max(max, s.p0.z, s.p3.z);
          if (s.subs) {
            s.subs.forEach((sub) => {
              max = Math.max(max, sub.p1?.z ?? -Infinity, sub.p2?.z ?? -Infinity, sub.p3?.z ?? -Infinity);
              min = Math.min(min, sub.p0?.z ?? Infinity, sub.p3?.z ?? Infinity);
            });
          }
        });

        const hDrop = (max - min) * SCALE_METERS;
        const vMax = Math.sqrt(Math.max(0, 2 * GRAVITY * hDrop));
        this.trackStats = { minZ: min, maxZ: max, maxSpeed: Math.max(vMax, BOOST_SPEED) };

        this.recomputeClosedCircuit();
      },

      addSegment(input) {
        if (this.simActive) this.resetSim();

        const start = { ...this.cursor };
        const end = { ...this.cursor };
        let newDir = start.dir;
        let newSlope = start.slope;
        let type = "straight";
        let isLift = false;
        let isBoost = false;

        const dIn = DIRS[start.dir];

        if (input === "straight") {
          end.x += dIn.dx;
          end.y += dIn.dy;
          if (start.slope === 1) {
            type = "crest";
            end.z += 1;
            newSlope = 0;
            if (this.liftActive) isLift = true;
          } else if (start.slope === -1) {
            type = "valley_end";
            end.z -= 1;
            newSlope = 0;
          } else {
            type = "straight";
            newSlope = 0;
            if (this.boostActive) isBoost = true;
          }
        } else if (input === "up") {
          end.x += dIn.dx;
          end.y += dIn.dy;
          end.z += 1;
          if (start.slope < 1) {
            if (start.slope === -1) return;
            type = "transition_up";
            newSlope = 1;
          } else {
            type = "steep_up";
            newSlope = 1;
          }
          if (this.liftActive) isLift = true;
        } else if (input === "down") {
          end.x += dIn.dx;
          end.y += dIn.dy;
          end.z -= 1;
          if (start.slope > -1) {
            if (start.slope === 1) return;
            type = "transition_down";
            newSlope = -1;
          } else {
            type = "steep_down";
            newSlope = -1;
          }
        } else if (input === "left" || input === "right") {
          if (start.slope !== 0) return;
          const turnDir = input === "left" ? 3 : 1;
          newDir = (start.dir + turnDir) % 4;
          const dOut = DIRS[newDir];
          end.x += dIn.dx + dOut.dx;
          end.y += dIn.dy + dOut.dy;
          type = input;
          newSlope = 0;
        } else if (input === "wide_left" || input === "wide_right") {
          if (start.slope !== 0) return;
          const turnDir = input === "wide_left" ? 3 : 1;
          newDir = (start.dir + turnDir) % 4;
          const dOut = DIRS[newDir];
          end.x += dIn.dx * 2 + dOut.dx * 2;
          end.y += dIn.dy * 2 + dOut.dy * 2;
          type = input;
          newSlope = 0;
        } else if (input === "loop") {
          // Loop logic stays even if UI button is removed.
          if (start.slope !== 0) return;
          end.x += dIn.dx * 2;
          end.y += dIn.dy * 2;
          type = "loop";
          newSlope = 0;
        }

        if (end.z < 0) return;

        const segment = {
          id: makeId(),
          type,
          isLift,
          isBoost,
          p0: { x: start.x, y: start.y, z: start.z },
          p3: { x: end.x, y: end.y, z: end.z },
          dirIn: start.dir,
          dirOut: newDir,
          length: 0,
          subs: [],
        };

        const getTan = (dx, dy, slope) => {
          const len = Math.sqrt(dx * dx + dy * dy + slope * slope);
          return { x: dx / len, y: dy / len, z: slope / len };
        };

        const tIn = getTan(dIn.dx, dIn.dy, start.slope);
        const dEnd = DIRS[newDir];
        const tOut = getTan(dEnd.dx, dEnd.dy, newSlope);

        if (type === "loop") {
          const h = 4.0;
          const mid = { x: start.x + dIn.dx, y: start.y + dIn.dy, z: start.z + h };
          const kLoop = 1.3;

          const sub1 = {
            p0: segment.p0,
            p1: {
              x: segment.p0.x + tIn.x * kLoop,
              y: segment.p0.y + tIn.y * kLoop,
              z: segment.p0.z + 3.0,
            },
            p2: { x: mid.x - tIn.x * 0.5, y: mid.y - tIn.y * 0.5, z: mid.z },
            p3: mid,
          };

          const sub2 = {
            p0: mid,
            p1: { x: mid.x + tIn.x * 0.5, y: mid.y + tIn.y * 0.5, z: mid.z },
            p2: { x: end.x - tOut.x * kLoop, y: end.y - tOut.y * kLoop, z: end.z + 3.0 },
            p3: end,
          };

          segment.subs = [sub1, sub2];
          segment.length = estimateBezierLength(sub1) + estimateBezierLength(sub2);
        } else {
          let k = 0.55;
          if (type === "steep_up" || type === "steep_down" || type === "straight") k = 0.33;
          else if (type.includes("transition") || type === "crest" || type === "valley_end") k = 0.33;
          else if (type.includes("wide")) k = 1.1;

          segment.p1 = {
            x: start.x + tIn.x * k * 1.5,
            y: start.y + tIn.y * k * 1.5,
            z: start.z + tIn.z * k * 1.5,
          };
          segment.p2 = {
            x: end.x - tOut.x * k * 1.5,
            y: end.y - tOut.y * k * 1.5,
            z: end.z - tOut.z * k * 1.5,
          };

          if (type.includes("left") || type.includes("right")) {
            segment.p1.z = start.z;
            segment.p2.z = end.z;
          }

          segment.subs = [segment];
          segment.length = estimateBezierLength(segment);
        }

        this.track.push(segment);
        this.cursor = { ...end, dir: newDir, slope: newSlope };
        this.updateTrackStats();
      },

      undo() {
        if (this.track.length === 0) return;
        this.resetSim();
        const seg = this.track.pop();
        const prev = this.track[this.track.length - 1];

        let slope = 0;
        if (prev) {
          if (prev.type === "transition_up" || prev.type === "steep_up") slope = 1;
          else if (prev.type === "transition_down" || prev.type === "steep_down") slope = -1;
        }

        this.cursor = { x: seg.p0.x, y: seg.p0.y, z: seg.p0.z, dir: seg.dirIn, slope };
        this.updateTrackStats();
      },

      toggleSim() {
        if (this.simActive) {
          this.simActive = false;
          this.cart.stopped = true;
          return;
        }
        if (this.track.length === 0) return;

        this.resetSim();
        this.simActive = true;
        this.cart.stopped = false;
        this.cart.v = 2.78; // 10 km/h
      },

      resetSim() {
        this.simActive = false;
        this.cart = {
          segmentIdx: 0,
          subSegIdx: 0,
          t: 0,
          v: 0,
          dist: 0,
          stopped: true,
          totalE: 0,
          laps: 0,
        };
      },

      advanceToNextSegmentOrWrap() {
        // Called after we finish a segment/subsegment and are ready to move onward.
        const nextSegIdx = this.cart.segmentIdx + 1;

        if (nextSegIdx < this.track.length) {
          this.cart.segmentIdx = nextSegIdx;
          this.cart.subSegIdx = 0;
          this.cart.t = 0;
          return true;
        }

        // End of track:
        if (this.isClosed && this.track.length > 0) {
          // Wrap seamlessly to start, preserving energy/speed.
          this.cart.segmentIdx = 0;
          this.cart.subSegIdx = 0;
          this.cart.t = 0;
          this.cart.laps += 1;
          return true;
        }

        // Not closed => stop.
        this.cart.stopped = true;
        this.simActive = false;
        return false;
      },

      updatePhysics(dtMs) {
        if (!this.simActive || this.cart.stopped) return;

        const dt = dtMs / 1000;

        const mainSeg = this.track[this.cart.segmentIdx];
        if (!mainSeg) {
          this.cart.stopped = true;
          this.simActive = false;
          return;
        }

        const subSeg = mainSeg.subs[this.cart.subSegIdx];
        const pos = bezier(this.cart.t, subSeg.p0, subSeg.p1, subSeg.p2, subSeg.p3);
        const h = pos.z * SCALE_METERS;
        const PE = GRAVITY * h;

        // establish initial total energy at start
        if (this.cart.segmentIdx === 0 && this.cart.subSegIdx === 0 && this.cart.t === 0 && this.cart.dist === 0) {
          this.cart.totalE = PE + 0.5 * this.cart.v * this.cart.v;
        }

        // lift/boost/drag
        if (mainSeg.isLift) {
          if (this.cart.v < LIFT_SPEED) {
            this.cart.v = LIFT_SPEED;
            this.cart.totalE = PE + 0.5 * LIFT_SPEED * LIFT_SPEED;
          }
        } else if (mainSeg.isBoost) {
          if (this.cart.v < BOOST_SPEED) {
            this.cart.v += 10 * dt;
            if (this.cart.v > BOOST_SPEED) this.cart.v = BOOST_SPEED;
            this.cart.totalE = PE + 0.5 * this.cart.v * this.cart.v;
          }
        } else {
          // small energy bleed; keep it gentle
          this.cart.totalE -= this.cart.v * dt * 0.3;
        }

        let KE = this.cart.totalE - PE;

        // stall detection
        if (KE < 0.1) {
          if (KE < -0.1) {
            this.cart.v = 0;
            this.cart.stopped = true;
            this.simActive = false;
            return { stalled: true, v: 0, gVert: 0, gLat: 0, h, laps: this.cart.laps };
          }
          KE = 0;
        }

        this.cart.v = Math.sqrt(Math.max(0, 2 * KE));

        // advance along curve using arc length estimate
        const subLen = estimateBezierLength(subSeg);
        const moveDist = this.cart.v * dt;
        this.cart.dist += moveDist;

        const dtParam = subLen > 1e-6 ? moveDist / subLen : 0;
        this.cart.t += dtParam;

        // If we overshoot past the end of this subsegment, carry forward remainder.
        // (This makes high-speed wraps on closed tracks much more stable.)
        let safety = 0;
        while (this.cart.t >= 1.0 && safety++ < 12) {
          // leftover fraction beyond end
          const overshoot = this.cart.t - 1.0;

          this.cart.t = 1.0;

          // step to next subsegment/segment
          this.cart.subSegIdx++;
          if (this.cart.subSegIdx >= mainSeg.subs.length) {
            this.cart.subSegIdx = 0;
            const ok = this.advanceToNextSegmentOrWrap();
            if (!ok) break;
          }

          // apply the overshoot to the next subsegment, scaled by its length
          const newMainSeg = this.track[this.cart.segmentIdx];
          if (!newMainSeg) break;
          const newSub = newMainSeg.subs[this.cart.subSegIdx];
          const newSubLen = estimateBezierLength(newSub);

          // overshoot was in param units of previous sub; convert to meters then back
          const overshootMeters = overshoot * subLen;
          this.cart.t = newSubLen > 1e-6 ? overshootMeters / newSubLen : 0;
        }

        // recompute at updated position for HUD & g-force
        const curMainSeg = this.track[this.cart.segmentIdx];
        if (!curMainSeg) return;

        const curSub = curMainSeg.subs[this.cart.subSegIdx];
        const curPos = bezier(this.cart.t, curSub.p0, curSub.p1, curSub.p2, curSub.p3);

        const tan = bezierTangent(this.cart.t, curSub.p0, curSub.p1, curSub.p2, curSub.p3);
        const vLen = Math.sqrt(tan.x * tan.x + tan.y * tan.y + tan.z * tan.z) || 1;
        const dir = { x: tan.x / vLen, y: tan.y / vLen, z: tan.z / vLen };

        const angleVert = Math.asin(dir.z);
        let gStatic = Math.cos(angleVert);
        let gDynamic = 0;
        let gLat = 0;

        const isLoop = curMainSeg.type === "loop";
        if (isLoop && curPos.z > curMainSeg.p0.z + 1.5) gStatic = -1;

        if (isLoop) {
          const r = 3 * SCALE_METERS;
          gDynamic = (this.cart.v * this.cart.v) / r / GRAVITY;
        } else if (curMainSeg.type === "valley_end" || curMainSeg.type === "transition_up") {
          const r = 4 * SCALE_METERS;
          gDynamic = (this.cart.v * this.cart.v) / r / GRAVITY;
        } else if (curMainSeg.type === "crest" || curMainSeg.type === "transition_down") {
          const r = 4 * SCALE_METERS;
          gDynamic = -((this.cart.v * this.cart.v) / r / GRAVITY);
        } else if (curMainSeg.type.includes("left") || curMainSeg.type.includes("right")) {
          const r = curMainSeg.type.includes("wide") ? 2.5 * SCALE_METERS : 1.5 * SCALE_METERS;
          gLat = (this.cart.v * this.cart.v) / r / GRAVITY;
        }

        return {
          stalled: false,
          v: this.cart.v,
          gVert: gStatic + gDynamic,
          gLat,
          h: curPos.z * SCALE_METERS,
          laps: this.cart.laps,
        };
      },

      drawGrid() {
        const pivot = this.getPivot();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        const GS = 20;
        for (let i = -GS; i <= GS; i++) {
          const s1 = toIso(i, -GS, 0, this.rotation, pivot);
          const e1 = toIso(i, GS, 0, this.rotation, pivot);
          ctx.beginPath();
          ctx.moveTo(s1.x, s1.y);
          ctx.lineTo(e1.x, e1.y);
          ctx.stroke();

          const s2 = toIso(-GS, i, 0, this.rotation, pivot);
          const e2 = toIso(GS, i, 0, this.rotation, pivot);
          ctx.beginPath();
          ctx.moveTo(s2.x, s2.y);
          ctx.lineTo(e2.x, e2.y);
          ctx.stroke();
        }
      },

      drawSegment(seg) {
        const pivot = this.getPivot();

        if (this.showHeight) {
          const p = toIso(seg.p0.x, seg.p0.y, seg.p0.z, this.rotation, pivot);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(String(seg.p0.z), p.x, p.y - 40);
        }

        const STEPS = 16;

        seg.subs.forEach((sub, subIdx) => {
          const lR = [];
          const rR = [];
          const cR = [];

          for (let i = 0; i <= STEPS; i++) {
            const t = i / STEPS;
            const pos = bezier(t, sub.p0, sub.p1, sub.p2, sub.p3);
            const tan = bezierTangent(t, sub.p0, sub.p1, sub.p2, sub.p3);

            const binormal = norm(cross(tan, { x: 0, y: 0, z: 1 }));
            const normal = norm(cross(binormal, tan));

            let rx = binormal.x,
              ry = binormal.y,
              rz = binormal.z;

            // roll rails through a loop
            if (seg.type === "loop") {
              const tGlobal = subIdx * 0.5 + t * 0.5;
              const angle = tGlobal * Math.PI * 2;
              rx = binormal.x * Math.cos(angle) + normal.x * Math.sin(angle);
              ry = binormal.y * Math.cos(angle) + normal.y * Math.sin(angle);
              rz = binormal.z * Math.cos(angle) + normal.z * Math.sin(angle);
            }

            const w = TRACK_WIDTH;
            lR.push(toIso(pos.x + rx * w, pos.y + ry * w, pos.z + rz * w, this.rotation, pivot));
            rR.push(toIso(pos.x - rx * w, pos.y - ry * w, pos.z - rz * w, this.rotation, pivot));
            cR.push(toIso(pos.x, pos.y, pos.z, this.rotation, pivot));
          }

          // ties
          ctx.strokeStyle = PALETTE.TIE;
          ctx.lineWidth = 3;
          const step = seg.isLift ? 1 : 2;
          for (let i = 0; i <= STEPS; i += step) {
            ctx.beginPath();
            ctx.moveTo(lR[i].x, lR[i].y);
            ctx.lineTo(rR[i].x, rR[i].y);
            ctx.stroke();
          }

          // spine / chain / boost
          if (seg.isLift) {
            ctx.strokeStyle = PALETTE.CHAIN;
            ctx.lineWidth = 4;
          } else if (seg.isBoost) {
            ctx.strokeStyle = PALETTE.BOOST;
            ctx.lineWidth = 4;
          } else {
            ctx.strokeStyle = PALETTE.SPINE;
            ctx.lineWidth = 1;
          }
          ctx.beginPath();
          ctx.moveTo(cR[0].x, cR[0].y);
          for (let i = 1; i <= STEPS; i++) ctx.lineTo(cR[i].x, cR[i].y);
          ctx.stroke();

          // boost chevrons
          if (seg.isBoost) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1;
            for (let i = 2; i < STEPS; i += 4) {
              ctx.beginPath();
              ctx.moveTo(cR[i].x - 2, cR[i].y - 2);
              ctx.lineTo(cR[i + 1].x, cR[i + 1].y);
              ctx.lineTo(cR[i].x + 2, cR[i].y - 2);
              ctx.stroke();
            }
          }

          // rails
          ctx.strokeStyle = PALETTE.RAIL;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lR[0].x, lR[0].y);
          for (let i = 1; i <= STEPS; i++) ctx.lineTo(lR[i].x, lR[i].y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rR[0].x, rR[0].y);
          for (let i = 1; i <= STEPS; i++) ctx.lineTo(rR[i].x, rR[i].y);
          ctx.stroke();
        });
      },

      drawCursor() {
        const pivot = this.getPivot();

        const c = this.cursor;
        const d = DIRS[c.dir];
        const nextPos = toIso(c.x + d.dx, c.y + d.dy, c.z, this.rotation, pivot);
        const pIso = toIso(c.x, c.y, c.z, this.rotation, pivot);

        const c1 = toIso(c.x, c.y, c.z, this.rotation, pivot);
        const c2 = toIso(c.x + 1, c.y, c.z, this.rotation, pivot);
        const c3 = toIso(c.x + 1, c.y + 1, c.z, this.rotation, pivot);
        const c4 = toIso(c.x, c.y + 1, c.z, this.rotation, pivot);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pIso.x, pIso.y);
        ctx.lineTo(nextPos.x, nextPos.y);
        ctx.stroke();

        const midX = (pIso.x + nextPos.x) / 2;
        const midY = (pIso.y + nextPos.y) / 2;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(midX, midY, 3, 0, Math.PI * 2);
        ctx.fill();
      },

      drawCart() {
        const pivot = this.getPivot();

        const mainSeg = this.track[this.cart.segmentIdx];
        if (!mainSeg && this.cart.stopped) return;

        let p3d;
        if (mainSeg) {
          const sub = mainSeg.subs[this.cart.subSegIdx];
          p3d = bezier(this.cart.t, sub.p0, sub.p1, sub.p2, sub.p3);
        } else {
          p3d = this.track[0]?.p0 ?? { x: 0, y: 0, z: 0 };
        }

        const pIso = toIso(p3d.x, p3d.y, p3d.z, this.rotation, pivot);

        ctx.fillStyle = "#ef4444";
        const w = 16,
          h = 10;
        ctx.fillRect(pIso.x - w / 2, pIso.y - h - 2, w, h);
      },

      draw() {
        // Note: canvas is DPR-scaled via ctx transform; fill using CSS pixels
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);

        this.drawGrid();
        this.track.forEach((s) => this.drawSegment(s));
        if (!this.simActive) this.drawCursor();
        if (this.simActive || this.track.length > 0) this.drawCart();

        ctx.restore();
      },

      tick(ts) {
        const dt = ts - (this.lastTime || ts);
        this.lastTime = ts;

        const phys = this.updatePhysics(dt);

        // push HUD at ~30fps
        if (ts - this.lastHudPush > 33) {
          this.lastHudPush = ts;

          const stats = this.trackStats;
          const stalled = phys?.stalled ?? false;
          const v = phys?.v ?? 0;
          const gVert = phys?.gVert ?? 1.0;
          const gLat = phys?.gLat ?? 0.0;
          const h = phys?.h ?? 0;
          const laps = phys?.laps ?? this.cart.laps;

          setHud((prev) => ({
            ...prev,
            v,
            gVert,
            gLat,
            h,
            maxZ: stats.maxZ,
            maxSpeed: stats.maxSpeed,
            stalled,
            laps,
            closed: this.isClosed,
          }));
        }

        this.draw();
        this.raf = requestAnimationFrame((t) => this.tick(t));
      },
    };

    engine.resize();

    // start station like your original
    engine.addSegment("straight");
    engine.addSegment("straight");
    engine.updateTrackStats();

    engineRef.current = engine;

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    // input: pan + zoom
    let isDragging = false;
    let last = { x: 0, y: 0 };

    const getXY = (e) => {
      if ("touches" in e && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e) => {
      isDragging = true;
      last = getXY(e);
    };
    const onMove = (e) => {
      if (!isDragging) return;
      const cur = getXY(e);
      engine.offsetX += cur.x - last.x;
      engine.offsetY += cur.y - last.y;
      last = cur;
    };
    const onUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      engine.zoom += e.deltaY * -0.001;
      engine.zoom = clamp(engine.zoom, 0.2, 3);
    };

    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (e.key === " ") {
        e.preventDefault();
        engine.toggleSim();
      }
      if (k === "1") engine.addSegment("straight");
      if (k === "2") engine.addSegment("up");
      if (k === "3") engine.addSegment("down");
      if (k === "4") engine.addSegment("left");
      if (k === "5") engine.addSegment("right");
      if (k === "z") engine.undo();
      if (k === "r") engine.rotation = (engine.rotation + 1) % 4;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);

    engine.raf = requestAnimationFrame((t) => engine.tick(t));

    return () => {
      cancelAnimationFrame(engine.raf);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const vKmh = hud.v * 3.6;
  const vPct = hud.maxSpeed > 1e-6 ? clamp((hud.v / hud.maxSpeed) * 100, 0, 100) : 0;

  const gVert = hud.gVert;
  const gLat = hud.gLat;

  const maxPE = GRAVITY * (hud.maxZ * SCALE_METERS);
  const currentPE = GRAVITY * hud.h;
  const currentKE = 0.5 * hud.v * hud.v;
  const currentTE = currentPE + currentKE;

  const pePct = maxPE > 1e-6 ? clamp((currentPE / maxPE) * 100, 0, 100) : 0;
  const kePct = maxPE > 1e-6 ? clamp((currentKE / maxPE) * 100, 0, 100) : 0;
  const tePct = maxPE > 1e-6 ? clamp((currentTE / maxPE) * 100, 0, 100) : 0;

  const eng = engineRef.current;

  const safeBtn = (fn) => () => {
    const e = engineRef.current;
    if (e) fn(e);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#0f172a",
        overflow: "hidden",
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        color: "#e2e8f0",
        userSelect: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: "crosshair",
        }}
      />

      {/* Top HUD */}
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
        {/* Stats panel */}
        <div style={{ ...styles.panel, padding: 16, borderRadius: 16, display: "flex", gap: 18, alignItems: "flex-start" }}>
          {/* Velocity */}
          <HudBlock label="Velocity" value={`${vKmh.toFixed(0)} km/h`} valueColor="#22d3ee">
            <Bar pct={vPct} color="#06b6d4" />
          </HudBlock>

          {/* G-Vert */}
          <HudBlock label="G-Force (Vert)" value={`${gVert.toFixed(1)} G`} valueColor="#facc15">
            <CenteredBar pct={clamp(Math.abs((gVert / 6) * 100), 0, 100)} positive={gVert >= 0} color={gVert > 4 ? "#ef4444" : "#f59e0b"} />
          </HudBlock>

          {/* G-Lat */}
          <HudBlock label="G-Force (Lat)" value={`${gLat.toFixed(1)} G`} valueColor="#fb7185">
            <CenteredBar pct={clamp((Math.abs(gLat) / 3) * 50, 0, 50)} positive={gLat >= 0} color="#fb7185" />
          </HudBlock>

          {/* Laps / circuit indicator */}
          <div style={{ display: "flex", flexDirection: "column", width: 140 }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              Circuit
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: hud.closed ? "#34d399" : "#fbbf24" }}>
              {hud.closed ? "Closed" : "Open"}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#cbd5e1" }}>
              Laps: <span style={{ fontWeight: 900 }}>{hud.laps}</span>
            </div>
          </div>
        </div>

        {/* Energy bars (hidden on narrow screens) */}
        <div
          style={{
            ...styles.panel,
            padding: 16,
            borderRadius: 16,
            width: 280,
            display: "none",
          }}
          className="iso-energy-panel"
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#94a3b8", fontWeight: 800 }}>Mechanical Energy</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>
              Max H: {hud.maxZ.toFixed(1)}u | Max V: {(hud.maxSpeed * 3.6).toFixed(0)} km/h
            </div>
          </div>

          <EnergyRow label="PE" labelColor="#60a5fa" pct={pePct} fill="#3b82f6" />
          <EnergyRow label="KE" labelColor="#fb923c" pct={kePct} fill="#f97316" />
        </div>
      </div>

      {/* Stalled message */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          opacity: hud.stalled ? 1 : 0,
          transition: "opacity 300ms",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        <div
          style={{
            background: "rgba(239,68,68,0.9)",
            color: "white",
            padding: "12px 18px",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 18,
            border: "1px solid rgba(248,113,113,0.8)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
          }}
        >
          ⚠️ Train Stalled!
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 18, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {/* small row */}
          <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
            <button
              style={styles.smallBtn(false, "#f59e0b", "#451a03")}
              onClick={safeBtn((e) => (e.rotation = (e.rotation + 1) % 4))}
            >
              Rotate View (R)
            </button>
            <button
              style={styles.smallBtn(eng?.showHeight ?? true, "#38bdf8", "#0f172a")}
              onClick={safeBtn((e) => (e.showHeight = !e.showHeight))}
            >
              123 Height
            </button>
          </div>

          {/* main tray */}
          <div style={{ ...styles.panel, padding: 10, borderRadius: 18, display: "flex", gap: 10, pointerEvents: "auto" }}>
            {/* build tools */}
            <div style={{ display: "flex", gap: 8, padding: 8, borderRadius: 14, border: "1px solid #334155", background: "rgba(30,41,59,0.5)" }}>
              <button
                style={styles.btn(eng?.liftActive ?? false, "#f59e0b", "#451a03")}
                onClick={safeBtn((e) => {
                  e.liftActive = !e.liftActive;
                  if (e.liftActive) e.boostActive = false;
                })}
              >
                Lift
              </button>
              <button
                style={styles.btn(eng?.boostActive ?? false, "#10b981", "#064e3b")}
                onClick={safeBtn((e) => {
                  e.boostActive = !e.boostActive;
                  if (e.boostActive) e.liftActive = false;
                })}
              >
                Boost
              </button>

              <Divider />

              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("straight"))}>
                Flat (1)
              </button>
              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("up"))}>
                Up (2)
              </button>
              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("down"))}>
                Down (3)
              </button>

              <Divider />

              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("left"))}>
                Left (4)
              </button>
              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("right"))}>
                Right (5)
              </button>

              <Divider />

              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("wide_left"))}>
                Wide L
              </button>
              <button style={styles.btn(false)} onClick={safeBtn((e) => e.addSegment("wide_right"))}>
                Wide R
              </button>

              {/* Loop button removed intentionally */}
            </div>

            {/* sim tools */}
            <div style={{ display: "flex", gap: 8, padding: 8, borderRadius: 14, border: "1px solid #334155", background: "rgba(30,41,59,0.5)" }}>
              <button
                style={{
                  ...styles.btn(false),
                  background: "rgba(127,29,29,0.35)",
                  borderColor: "rgba(127,29,29,0.6)",
                  color: "#fecaca",
                }}
                onClick={safeBtn((e) => e.undo())}
              >
                Undo (Z)
              </button>

              <button
                style={{
                  ...styles.btn(false),
                  background: (eng?.simActive ?? false) ? "rgba(239,68,68,0.85)" : "rgba(16,185,129,0.85)",
                  borderColor: "rgba(255,255,255,0.10)",
                  color: "#fff",
                  minWidth: 120,
                }}
                onClick={safeBtn((e) => e.toggleSim())}
              >
                {(eng?.simActive ?? false) ? "Stop (Space)" : "Test (Space)"}
              </button>

              <button
                style={{
                  ...styles.btn(false),
                  background: "rgba(14,116,144,0.45)",
                  borderColor: "rgba(125,211,252,0.25)",
                  color: "#bae6fd",
                }}
                onClick={safeBtn((e) => e.resetSim())}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive helper: show energy panel on wider screens */}
      <style>{`
        @media (min-width: 768px) {
          .iso-energy-panel { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: "#334155", margin: "0 2px" }} />;
}

function HudBlock({ label, value, valueColor, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 140 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontWeight: 900, color: valueColor }}>
        {value}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ width: "100%", height: 8, background: "#334155", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 80ms" }} />
    </div>
  );
}

function CenteredBar({ pct, positive, color }) {
  const left = positive ? "50%" : `calc(50% - ${pct}%)`;
  return (
    <div style={{ width: "100%", height: 8, background: "#334155", borderRadius: 999, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.8)" }} />
      <div style={{ position: "absolute", left, top: 0, height: "100%", width: `${pct}%`, background: color, transition: "all 80ms" }} />
    </div>
  );
}

function EnergyRow({ label, labelColor, pct, fill }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ width: 22, textAlign: "right", fontSize: 10, fontWeight: 900, color: labelColor }}>{label}</div>
      <div style={{ flex: 1, height: 12, background: "#334155", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: fill, transition: "width 80ms" }} />
      </div>
    </div>
  );
}
