import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Settings, MousePointer2, Activity, Trash2 } from "lucide-react";

const PX_PER_M = 10;
const SPEED_MULT = 1.5; // ~50% faster visual/physics step rate

// --- Catmull-Rom spline ---
const getSplinePoints = (points, numSegments = 40) => {
  if (!points || points.length < 2) return [];
  const pts = [...points];
  pts.unshift(pts[0]);
  pts.push(pts[pts.length - 1]);

  const res = [];
  for (let i = 0; i < pts.length - 3; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1],
      p2 = pts[i + 2],
      p3 = pts[i + 3];
    for (let t = 0; t <= numSegments; t++) {
      const u = t / numSegments;
      const u2 = u * u;
      const u3 = u2 * u;

      const x =
        0.5 *
        ((2 * p1.x) +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);

      const y =
        0.5 *
        ((2 * p1.y) +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);

      res.push({ x, y });
    }
  }
  return res;
};

const calculatePathData = (smoothPoints) => {
  if (!smoothPoints || smoothPoints.length === 0) return { path: [], totalLength: 0 };

  let totalLength = 0;
  const path = smoothPoints.map((pt, i) => {
    let segmentLen = 0;
    let angle = 0;

    if (i > 0) {
      const prev = smoothPoints[i - 1];
      const dx = pt.x - prev.x;
      const dy = pt.y - prev.y;
      segmentLen = Math.hypot(dx, dy);
      angle = Math.atan2(dy, dx);
    }

    totalLength += segmentLen;
    return { x: pt.x, y: pt.y, angle, dist: totalLength };
  });

  return { path, totalLength };
};

const PRESETS = {
  Bowl: [
    { x: 60, y: 100 },
    { x: 200, y: 400 },
    { x: 400, y: 600 },
    { x: 600, y: 400 },
    { x: 800, y: 100 },
  ],
  Loop: [
    { x: 60, y: 120 },
    { x: 240, y: 470 },
    { x: 430, y: 470 },
    { x: 500, y: 230 },
    { x: 390, y: 230 },
    { x: 340, y: 470 },
    { x: 660, y: 470 },
    { x: 920, y: 120 },
  ],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function getCartPosition(path, progress) {
  if (!path || path.length === 0) return { x: 0, y: 0, angle: 0 };
  let idx = path.findIndex((p) => p.dist >= progress);
  if (idx === -1) return path[path.length - 1];
  if (idx === 0) return path[0];

  const pNext = path[idx];
  const pPrev = path[idx - 1];
  const segLen = pNext.dist - pPrev.dist;
  const dSeg = progress - pPrev.dist;
  const t = segLen > 0 ? dSeg / segLen : 0;

  return {
    x: pPrev.x + (pNext.x - pPrev.x) * t,
    y: pPrev.y + (pNext.y - pPrev.y) * t,
    angle: pNext.angle,
  };
}

function nearestProgressToPoint(path, x, y) {
  if (!path || path.length === 0) return 0;
  let best = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dx = path[i].x - x;
    const dy = path[i].y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = path[i].dist;
    }
  }
  return best;
}

function drawGrid(ctx, width, height, spacing = 50) {
  ctx.save();
  ctx.lineWidth = 1;

  // minor lines
  ctx.strokeStyle = "rgba(15, 23, 42, 0.06)";
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // major lines
  ctx.strokeStyle = "rgba(15, 23, 42, 0.10)";
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing * 2) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += spacing * 2) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.restore();
}

export default function Coaster() {
  const [presetName, setPresetName] = useState("Loop");
  const [controlPoints, setControlPoints] = useState(PRESETS["Loop"]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [gravity, setGravity] = useState(9.8);
  const [friction, setFriction] = useState(0.0);
  const [mass, setMass] = useState(500);
  const [showVectors, setShowVectors] = useState(false);

  const [energyDisplay, setEnergyDisplay] = useState({ pe: 0, ke: 0, te: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastTRef = useRef(null);

  const configRef = useRef({ gravity, friction, mass });
  useEffect(() => {
    configRef.current = { gravity, friction, mass };

    // If parameters change mid-run, keep motion continuous by re-anchoring the
    // total-energy budget to the cart's *current* state (same position & speed).
    // Otherwise, the new PE/KE scales can make `keAllowed` go negative and the
    // cart will “stick”.
    const { path } = pathRef.current;
    const container = containerRef.current;
    if (!path?.length || !container) return;

    const { progress, velocity_mps, thermalEnergy } = physicsRef.current;
    const height = container.getBoundingClientRect().height;
    const pos = getCartPosition(path, progress);
    const h_m = (height - pos.y) / PX_PER_M;

    const peNow = mass * gravity * h_m;
    const keNow = 0.5 * mass * velocity_mps * velocity_mps;
    physicsRef.current.initialTotalEnergy = peNow + keNow + thermalEnergy;

    // Update readout immediately.
    setEnergyDisplay({ pe: peNow, ke: keNow, te: thermalEnergy });
  }, [gravity, friction, mass]);

  const pathRef = useRef({ path: [], totalLength: 0 });

  const physicsRef = useRef({
    progress: 0,
    velocity_mps: 0,
    thermalEnergy: 0,
    initialTotalEnergy: 0,
  });

  const draggedPointIndexRef = useRef(null);
  const draggingCartRef = useRef(false);

  const toCanvasPoint = useCallback((pt, width, height) => {
    const sx = width / 1000;
    const sy = height / 600;
    return { x: pt.x * sx, y: pt.y * sy };
  }, []);
  const fromCanvasPoint = useCallback((pt, width, height) => {
    const sx = width / 1000;
    const sy = height / 600;
    return { x: pt.x / sx, y: pt.y / sy };
  }, []);

  const maxRefEnergy = useMemo(() => {
    const highestY = controlPoints.length ? Math.min(...controlPoints.map((p) => p.y)) : 0;
    const h_m = (600 - highestY) / PX_PER_M;
    return mass * gravity * Math.max(1, h_m);
  }, [controlPoints, mass, gravity]);

  const computeEnergiesAt = useCallback((progress, velocity_mps, thermalEnergy) => {
    const { path } = pathRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const { gravity, mass } = configRef.current;
    if (!path.length || !canvas || !container) return { pe: 0, ke: 0, te: 0 };

    const rect = container.getBoundingClientRect();
    const height = Math.max(10, rect.height);

    const pos = getCartPosition(path, progress);
    const h_m = (height - pos.y) / PX_PER_M;
    const pe = mass * gravity * h_m;
    const ke = 0.5 * mass * velocity_mps * velocity_mps;

    return { pe, ke, te: thermalEnergy, total: physicsRef.current.initialTotalEnergy };
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(10, rect.width);
    const height = Math.max(10, rect.height);

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { path } = pathRef.current;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(0, 0, width, height);

    // faint grid to show height scale
    drawGrid(ctx, width, height, 50);

    // track
    if (path.length > 1) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#475569";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }

    // edit points (in the order you placed them)
    if (isEditMode) {
      const scaledPoints = controlPoints.map((p) => toCanvasPoint(p, width, height));

      // draw polyline through control points to make the "next piece" behavior obvious
      if (scaledPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
        for (let i = 1; i < scaledPoints.length; i++) ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
        ctx.stroke();
        ctx.restore();
      }

      scaledPoints.forEach((pt, i) => {
        const isDragged = draggedPointIndexRef.current === i;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = isDragged ? "#2563eb" : "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // index label (helps when looping back / double-backing)
        ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
        ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), pt.x, pt.y);
      });
    }

    // cart (offset so it sits on top of the track)
    if (path.length > 0) {
      const { progress, velocity_mps } = physicsRef.current;
      const cartPos = getCartPosition(path, progress);

      // Unit normal to track (world direction of local +y after rotation)
      const normalX = -Math.sin(cartPos.angle);
      const normalY = Math.cos(cartPos.angle);

      const wheelRadius = 4;
      const wheelCenterY = 6; // your wheel draw uses y=6
      const trackHalfThickness = 3; // track is 6px wide
      const offset = wheelCenterY + wheelRadius + trackHalfThickness; // ~13px

      const ox = -normalX * offset;
      const oy = -normalY * offset;

      ctx.save();
      ctx.translate(cartPos.x + ox, cartPos.y + oy);
      ctx.rotate(cartPos.angle);

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-15, -10, 30, 16);

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(-10, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, 6, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(0, -14, 6, 0, Math.PI * 2);
      ctx.fill();

      if (showVectors) {
        const v_px_s = velocity_mps * PX_PER_M;
        ctx.beginPath();
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(clamp(v_px_s * 0.2, -80, 80), 0);
        ctx.stroke();

        ctx.rotate(-cartPos.angle);
        ctx.beginPath();
        ctx.strokeStyle = "#eab308";
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 36);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [controlPoints, isEditMode, showVectors, toCanvasPoint]);

  // Preserve position on recompute (pause/resize/control points)
  const recomputePathPreserveProgress = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(10, rect.width);
    const height = Math.max(10, rect.height);

    const prevTotal = pathRef.current.totalLength || 0;
    const prevProgress = physicsRef.current.progress || 0;
    const ratio = prevTotal > 0 ? prevProgress / prevTotal : 0;

    const scaledPoints = controlPoints.map((p) => toCanvasPoint(p, width, height));
    const smooth = getSplinePoints(scaledPoints, 40);
    const data = calculatePathData(smooth);
    pathRef.current = data;

    if (data.totalLength > 0) {
      physicsRef.current.progress = clamp(ratio * data.totalLength, 0, data.totalLength);
    } else {
      physicsRef.current.progress = 0;
      physicsRef.current.velocity_mps = 0;
      physicsRef.current.thermalEnergy = 0;
      physicsRef.current.initialTotalEnergy = 0;
    }

    // If total energy not yet initialized, initialize at current height.
    if (!physicsRef.current.initialTotalEnergy && data.path.length) {
      const pos = getCartPosition(data.path, physicsRef.current.progress);
      const h_m = (height - pos.y) / PX_PER_M;
      const pe = mass * gravity * h_m;
      physicsRef.current.initialTotalEnergy = pe + physicsRef.current.thermalEnergy;
    }

    const { progress, velocity_mps, thermalEnergy } = physicsRef.current;
    const energies = computeEnergiesAt(progress, velocity_mps, thermalEnergy);
    setEnergyDisplay(energies);

    requestAnimationFrame(drawFrame);
  }, [controlPoints, toCanvasPoint, computeEnergiesAt, drawFrame, mass, gravity]);

  useEffect(() => {
    recomputePathPreserveProgress();

    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recomputePathPreserveProgress());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recomputePathPreserveProgress]);

  const stepPhysics = useCallback(
    (dt) => {
      const { path, totalLength } = pathRef.current;
      if (!path.length) return;

      const { gravity, friction, mass } = configRef.current;
      const container = containerRef.current;
      if (!container) return;
      const height = container.getBoundingClientRect().height;

      let { progress, velocity_mps, thermalEnergy, initialTotalEnergy } = physicsRef.current;

      let idx = path.findIndex((p) => p.dist >= progress);
      if (idx === -1) idx = path.length - 1;
      idx = Math.max(1, idx);
      const pCurrent = path[idx];

      const slopeAngle = pCurrent.angle;
      const a_g = gravity * Math.sin(slopeAngle);

      const N = mass * gravity * Math.cos(slopeAngle);
      const f_k = friction * Math.abs(N);
      const a_f = mass > 0 ? f_k / mass : 0;

      const dir = velocity_mps === 0 ? Math.sign(a_g) || 1 : Math.sign(velocity_mps);
      const a_along = a_g - dir * a_f;

      velocity_mps += a_along * dt;

      const v_px_s = velocity_mps * PX_PER_M;
      progress += v_px_s * dt;

      if (progress >= totalLength) {
        progress = totalLength;
        velocity_mps = 0;
        physicsRef.current = { progress, velocity_mps, thermalEnergy, initialTotalEnergy };
        setIsPlaying(false);
        return;
      }
      if (progress <= 0) {
        progress = 0;
        velocity_mps = Math.max(0, velocity_mps);
      }

      const dist_m = Math.abs(v_px_s * dt) / PX_PER_M;
      thermalEnergy += f_k * dist_m;

      const pos = getCartPosition(path, progress);
      const h_m = (height - pos.y) / PX_PER_M;
      const pe = mass * gravity * h_m;

      let keAllowed = initialTotalEnergy - pe - thermalEnergy;
      if (keAllowed < 0) {
        keAllowed = 0;
        velocity_mps = 0;
      } else {
        const vAllowed = Math.sqrt((2 * keAllowed) / mass);
        velocity_mps = vAllowed * Math.sign(velocity_mps || 1);
      }

      physicsRef.current = { progress, velocity_mps, thermalEnergy, initialTotalEnergy };

      const energies = computeEnergiesAt(progress, velocity_mps, thermalEnergy);
      setEnergyDisplay(energies);
    },
    [computeEnergiesAt]
  );

  const animate = useCallback(
    (t) => {
      if (!isPlaying) return;
      if (lastTRef.current == null) lastTRef.current = t;

      const dtBase = clamp((t - lastTRef.current) / 1000, 0, 0.033);
      lastTRef.current = t;

      const dt = dtBase * SPEED_MULT;

      stepPhysics(dt);
      drawFrame();

      rafRef.current = requestAnimationFrame(animate);
    },
    [drawFrame, isPlaying, stepPhysics]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate, isPlaying]);

  useEffect(() => {
    if (!isPlaying) drawFrame();
  }, [drawFrame, isPlaying, isEditMode, showVectors]);

  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    const { path } = pathRef.current;
    const container = containerRef.current;
    if (!path.length || !container) return;

    const height = container.getBoundingClientRect().height;
    const startY = path[0]?.y ?? height * 0.5;
    const h_m = (height - startY) / PX_PER_M;

    const pe = mass * gravity * h_m;
    physicsRef.current = { progress: 0, velocity_mps: 0, thermalEnergy: 0, initialTotalEnergy: pe };
    setEnergyDisplay({ pe, ke: 0, te: 0 });
    requestAnimationFrame(drawFrame);
  }, [drawFrame, gravity, mass]);

  const loadPreset = useCallback((name) => {
    setIsPlaying(false);
    setIsEditMode(false);
    setPresetName(name);
    setControlPoints(PRESETS[name]);
  }, []);

  // bar heights
  const getBarHeight = (val) => {
    const max = physicsRef.current.initialTotalEnergy || maxRefEnergy || 1;
    return clamp((val / max) * 100, 0, 100);
  };

  const getPointerXY = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
    return { x: clientX - rect.left, y: clientY - rect.top, width: rect.width, height: rect.height };
  };

  const onPointerDown = (e) => {
    const { x, y, width, height } = getPointerXY(e);

    if (isEditMode) {
      // In edit mode, points are ordered by *placement*, not by x-position.
      // Click near a point to drag it; otherwise, append a new point as the "next" segment.
      const scaledPts = controlPoints.map((p) => toCanvasPoint(p, width, height));
      const idx = scaledPts.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 18);
      if (idx !== -1) {
        draggedPointIndexRef.current = idx;
      } else {
        const newDesignPt = fromCanvasPoint({ x, y }, width, height);
        setControlPoints((prev) => [...prev, newDesignPt]);
      }
      return;
    }

    if (!isPlaying) {
      const { path } = pathRef.current;
      if (!path.length) return;

      draggingCartRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);

      const newProgress = nearestProgressToPoint(path, x, y);
      physicsRef.current.progress = newProgress;
      physicsRef.current.velocity_mps = 0;

      const energies = computeEnergiesAt(newProgress, 0, physicsRef.current.thermalEnergy);
      physicsRef.current.initialTotalEnergy = energies.pe + energies.te;
      setEnergyDisplay({ ...energies, ke: 0 });
      requestAnimationFrame(drawFrame);
    }
  };

  const onPointerMove = (e) => {
    const { x, y } = getPointerXY(e);

    if (isEditMode) {
      const idx = draggedPointIndexRef.current;
      if (idx == null) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const newDesignPt = fromCanvasPoint({ x, y }, rect.width, rect.height);
      setControlPoints((prev) => {
        const next = [...prev];
        next[idx] = newDesignPt;
        return next;
      });
      return;
    }

    if (!isPlaying && draggingCartRef.current) {
      const { path } = pathRef.current;
      if (!path.length) return;

      const newProgress = nearestProgressToPoint(path, x, y);
      physicsRef.current.progress = newProgress;
      physicsRef.current.velocity_mps = 0;

      const energies = computeEnergiesAt(newProgress, 0, physicsRef.current.thermalEnergy);
      physicsRef.current.initialTotalEnergy = energies.pe + energies.te;
      setEnergyDisplay({ ...energies, ke: 0 });
      requestAnimationFrame(drawFrame);
    }
  };

  const onPointerUp = () => {
    draggedPointIndexRef.current = null;
    draggingCartRef.current = false;
  };

  return (
    <div className="w-full">
      {/* Top summary strip */}

      {/* Controls (top) */}
      <div className="mt-3 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const { totalLength } = pathRef.current;
                if (!isPlaying && physicsRef.current.progress >= totalLength - 2) resetSimulation();
                setIsPlaying((v) => !v);
              }}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              onClick={resetSimulation}
              className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-2"
              title="Reset"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              onClick={() => setIsEditMode((v) => !v)}
              className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                isEditMode
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              {isEditMode ? <Activity size={16} /> : <MousePointer2 size={16} />}
              {isEditMode ? "Done Editing" : "Edit Track"}
            </button>

            {isEditMode && (
              <button
                onClick={() => setControlPoints([])}
                className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors flex items-center gap-2"
                title="Clear points"
              >
                <Trash2 size={16} />
                Clear
              </button>
            )}
          </div>
           <div className="flex items-center gap-6 text-sm font-medium tabular-nums">
          <div className="flex items-center gap-2 min-w-[180px]" title="Potential Energy">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-blue-600">Potential:</span>
            <span className="text-blue-600 font-mono inline-block w-[110px] text-right">
              {Math.round(energyDisplay.pe).toLocaleString()} J
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-[180px]" title="Kinetic Energy">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-green-600">Kinetic:</span>
            <span className="text-green-600 font-mono inline-block w-[110px] text-right">
              {Math.round(energyDisplay.ke).toLocaleString()} J
            </span>
          </div>

          {friction > 0 && (
            <div className="flex items-center gap-2 min-w-[180px]" title="Thermal Energy (Friction)">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span className="text-orange-600">Thermal:</span>
              <span className="text-orange-600 font-mono inline-block w-[110px] text-right">
                {Math.round(energyDisplay.te).toLocaleString()} J
              </span>
            </div>
          )}
        </div>     
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => loadPreset(name)}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  presetName === name
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                {name}
              </button>
            ))}
            <button
              onClick={() => {
                setIsPlaying(false);
                setPresetName("Custom");
                setControlPoints([]);
                setIsEditMode(true);
              }}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Empty
            </button>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500">
          {isEditMode ? (
            <>Edit mode: click to append points (in order), drag points to move them.</>
          ) : (
            <>Paused: drag the cart (or click near the track) to set the starting position.</>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="mt-3 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative"
        style={{ height: "70vh", minHeight: 420, position: "relative" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          className={`w-full h-full ${isEditMode ? "cursor-crosshair" : isPlaying ? "cursor-default" : "cursor-grab"}`}
        />

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 9999,
            pointerEvents: "none",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8 }}>Energy</div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 96 }}>
            <div style={{ width: 24, height: 96, background: "#f1f5f9", borderRadius: 8, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${getBarHeight(energyDisplay.pe)}%`, background: "#3b82f6" }} />
            </div>
            <div style={{ width: 24, height: 96, background: "#f1f5f9", borderRadius: 8, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${getBarHeight(energyDisplay.ke)}%`, background: "#22c55e" }} />
            </div>
            <div style={{ width: 24, height: 96, background: "#f1f5f9", borderRadius: 8, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${getBarHeight(energyDisplay.te)}%`, background: "#f97316" }} />
            </div>
          </div>

          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12, fontWeight: 700, textAlign: "center" }}>
            <div style={{ color: "#2563eb" }}>PE</div>
            <div style={{ color: "#16a34a" }}>KE</div>
            <div style={{ color: "#ea580c" }}>TE</div>
          </div>
        </div>
      </div>

      {/* Physics parameters */}
      <div className="mt-3">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mx-auto w-full max-w-xl">
          <div className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Settings size={16} className="text-slate-500" />
            Physics Parameters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="mx-auto w-full max-w-md">
              {/* Gravity */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Gravity (g)</label>
                  <span className="text-xs font-mono text-indigo-600">{gravity.toFixed(1)} m/s²</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="0.1"
                  value={gravity}
                  onChange={(e) => setGravity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Mass */}
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Cart Mass</label>
                  <span className="text-xs font-mono text-indigo-600">{mass} kg</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Friction */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-medium text-slate-600">Friction (μ)</label>
                  <span className="text-xs font-mono text-indigo-600">{friction.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={friction}
                  onChange={(e) => setFriction(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="text-[10px] text-slate-500 mt-1">Friction converts mechanical energy into thermal energy.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Coaster };
