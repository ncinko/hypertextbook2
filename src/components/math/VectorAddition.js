import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * VectorAdditionDragDrop
 * (click pick/drop, terminal glow, end-only negate/remove, smart labels, unit grid)
 * - Grid is in math units with pixels-per-unit scaling; palette vectors are <3,0>, <2,2>, <0,-3>.
 * - Click a palette chip or a movable singleton to pick it up; click on canvas to drop.
 * - Snap ONLY to chain end; chains with ≥2 vectors become locked (can't be moved).
 * - Alt-click on the terminal vector of any chain (or a singleton) to NEGATE; Alt+Shift-click to REMOVE it.
 * - Terminal tips glow; nearest valid endpoint glows brighter.
 * - Labels: toggle between coefficient form (e.g., v₁ + 2v₂ − v₃) and component form <vₓ, vᵧ>.
 * - Labels are placed with a small, angle-aware perpendicular offset to reduce overlap.
 */

// --- Display scale ---
const PPU = 60; // pixels per 1 unit on the grid

// Palette vectors in *math* units (x right, y up)
const VECTORS = [
  { id: "v1", label: "v₁", ux: 3, uy: 0, color: "#2563eb" },   // <3, 0>
  { id: "v2", label: "v₂", ux: 2, uy: 2, color: "#10b981" },  // <2, 2>
  { id: "v3", label: "v₃", ux: 0, uy: -3, color: "#f59e0b" }, // <0, -3>
];

const SNAP_RADIUS = 16; // px

function Arrow({ x, y, dx, dy, color = "#111", width = 4 }) {
  const x2 = x + dx;
  const y2 = y + dy;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const head = Math.max(12, width * 2.6);
  // Stop the shaft BEFORE the tip so tails don't poke through the head.
  const shaftX2 = x2 - ux * head;
  const shaftY2 = y2 - uy * head;
  const lx = x2 - ux * head + (-uy) * (head * 0.6);
  const ly = y2 - uy * head + (ux) * (head * 0.6);
  const rx = x2 - ux * head - (-uy) * (head * 0.6);
  const ry = y2 - uy * head - (ux) * (head * 0.6);
  return (
    <g>
      <line x1={x} y1={y} x2={shaftX2} y2={shaftY2} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${lx},${ly} ${rx},${ry}`} fill={color} />
    </g>
  );
}

function Grid({ w, h }) {
  const step = PPU;
  const verts = [];
  for (let x = 0; x < w; x += step) verts.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#e5e7eb" />);
  for (let y = 0; y < h; y += step) verts.push(<line key={`vy${y}`} x1={0} y1={y} x2={w} y2={y} stroke="#e5e7eb" />);
  return (
    <g>
      {verts}
    </g>
  );
}

// distance from point to segment helper (for hit testing)
function pointSegDist(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const wx = px - x1, wy = py - y1;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);
  const b = c1 / c2;
  const bx = x1 + b * vx, by = y1 + b * vy;
  return Math.hypot(px - bx, py - by);
}

function fmtNum(n) {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-6 ? String(r) : n.toFixed(2);
}

export default function VectorAdditionDragDrop() {
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 780, h: 480 });

  // placed vectors: { uid, baseId, x, y, dx, dy, color, chain, sign }
  // Note: dx,dy are in pixels (SVG), with y down positive; math uy was flipped when created
  const [placed, setPlaced] = useState([]);

  // carry state for click-pick/drop
  // { type: 'palette', paletteId } | { type: 'placed', uid }
  const [carry, setCarry] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [labelMode, setLabelMode] = useState('coeff'); // 'coeff' | 'components'

  // responsive sizing
  useEffect(() => {
    const onResize = () => {
      if (!svgRef.current) return;
      const parent = svgRef.current.parentElement;
      if (!parent) return;
      const w = Math.max(420, parent.clientWidth);
      const h = Math.round((w * 3) / 5);
      setSize({ w, h });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const uidRef = useRef(1);
  const nextUid = () => `p${uidRef.current++}`;

  // --- Chain analysis helpers ---
  const chainMap = useMemo(() => {
    // group by chain id
    const groups = new Map();
    for (const v of placed) {
      const id = v.chain || v.uid;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(v);
    }
    // Build info: start tail, end tip, length, locked, tips/tails sets
    const info = new Map();
    for (const [id, arr] of groups) {
      const tails = new Map();
      const tips = new Map();
      for (const v of arr) {
        const tailKey = `${v.x},${v.y}`;
        const tipKey = `${v.x + v.sign * v.dx},${v.y + v.sign * v.dy}`;
        tails.set(tailKey, { x: v.x, y: v.y, uid: v.uid });
        tips.set(tipKey, { x: v.x + v.sign * v.dx, y: v.y + v.sign * v.dy, uid: v.uid });
      }
      let start = null, end = null;
      for (const [k, val] of tails) if (!tips.has(k)) { start = val; break; }
      for (const [k, val] of tips) if (!tails.has(k)) { end = val; break; }
      if (!start && arr[0]) start = { x: arr[0].x, y: arr[0].y, uid: arr[0].uid };
      if (!end && arr[0]) end = { x: arr[0].x + arr[0].sign * arr[0].dx, y: arr[0].y + arr[0].sign * arr[0].dy, uid: arr[0].uid };
      info.set(id, { vectors: arr, start, end, length: arr.length, locked: arr.length >= 2, tips, tails });
    }
    return info;
  }, [placed]);

  const isVectorEnd = (vec) => {
    const ci = chainMap.get(vec.chain || vec.uid);
    if (!ci || !ci.end) return true; // singleton counts as end
    const tipX = vec.x + vec.sign * vec.dx;
    const tipY = vec.y + vec.sign * vec.dy;
    return Math.abs(ci.end.x - tipX) < 0.5 && Math.abs(ci.end.y - tipY) < 0.5;
  };

  // Snap anchors = ONLY chain endpoints (end tip). Singles also have an endpoint.
  const endAnchors = useMemo(() => {
    const arr = [];
    for (const [id, ci] of chainMap) {
      if (!ci?.end) continue;
      arr.push({ chain: id, x: ci.end.x, y: ci.end.y });
    }
    return arr;
  }, [chainMap]);

  function nearestEndAnchor(x, y) {
    let best = null, bestD = Infinity;
    for (const a of endAnchors) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bestD) { best = a; bestD = d; }
    }
    return best && bestD <= SNAP_RADIUS ? best : null;
  }

  // --- Interaction helpers ---
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  function pickFromPalette(paletteId, e) {
    e.preventDefault();
    setCarry({ type: 'palette', paletteId });
  }

  function pickPlaced(v) {
    // only pick up if not locked (chain length < 2)
    const ci = chainMap.get(v.chain || v.uid);
    if (ci?.locked) return; // locked -> not movable
    setCarry({ type: 'placed', uid: v.uid });
  }

  function removeVector(uid) {
    setPlaced((arr) => arr.filter((p) => p.uid !== uid));
  }

  function negateVector(uid) {
    setPlaced((arr) => arr.map((p) => (p.uid === uid ? { ...p, sign: -p.sign } : p)));
  }

  function hitTestVector(x, y) {
    // choose nearest by segment distance
    let best = null, bestD = 1e9;
    for (const v of placed) {
      const x1 = v.x, y1 = v.y;
      const x2 = v.x + v.sign * v.dx, y2 = v.y + v.sign * v.dy;
      const d = pointSegDist(x, y, x1, y1, x2, y2);
      if (d < bestD) { bestD = d; best = v; }
    }
    return bestD < 18 ? best : null; // tolerance
  }

  function handleCanvasClick(e) {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRaw = e.clientX - rect.left;
    const yRaw = e.clientY - rect.top;
    const x = clamp(xRaw, 4, size.w - 4);
    const y = clamp(yRaw, 4, size.h - 4);

    // Alt-click: negate or remove terminal vector at cursor
    if (e.altKey) {
      const hit = hitTestVector(x, y);
      if (hit && isVectorEnd(hit)) {
        if (e.shiftKey) removeVector(hit.uid);
        else negateVector(hit.uid);
      }
      return; // don't treat as drop
    }

    if (!carry) return; // nothing to drop

    if (carry.type === 'palette') {
      const base = VECTORS.find((v) => v.id === carry.paletteId);
      if (!base) { setCarry(null); return; }
      const snap = nearestEndAnchor(x, y);
      const px = snap ? snap.x : x;
      const py = snap ? snap.y : y;
      const chain = snap ? snap.chain : nextUid();
      const dx = base.ux * PPU; // x right
      const dy = -base.uy * PPU; // y up in math -> down in SVG
      const newPlaced = { uid: nextUid(), baseId: base.id, x: px, y: py, dx, dy, color: base.color, chain, sign: 1 };
      setPlaced((arr) => [...arr, newPlaced]);
      setCarry(null);
      return;
    }

    if (carry.type === 'placed') {
      const v = placed.find((p) => p.uid === carry.uid);
      if (!v) { setCarry(null); return; }
      const snap = nearestEndAnchor(x, y);
      const px = snap ? snap.x : x;
      const py = snap ? snap.y : y;
      const chain = snap ? snap.chain : v.chain; // keep chain unless snapped into another
      setPlaced((arr) => arr.map((p) => (p.uid === v.uid ? { ...p, x: px, y: py, chain } : p)));
      setCarry(null);
      return;
    }
  }

  function onMouseMove(e) {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  // Build resultants & labels per chain (for chains with ≥2)
  const chains = useMemo(() => {
    const out = [];
    for (const [id, ci] of chainMap) {
      if (!ci || ci.length === 0) continue;
      const arr = ci.vectors;
      if (arr.length < 2) continue;
      const start = ci.start;
      const sumDx = arr.reduce((s, v) => s + v.sign * v.dx, 0);
      const sumDy = arr.reduce((s, v) => s + v.sign * v.dy, 0);

      // labels
      const coeffs = new Map();
      for (const v of arr) coeffs.set(v.baseId, (coeffs.get(v.baseId) || 0) + v.sign);
      const coeffTerms = [];
      for (const base of VECTORS) {
        const c = coeffs.get(base.id) || 0;
        if (!c) continue;
        if (coeffTerms.length === 0) {
          if (c === -1) coeffTerms.push(`−${base.label}`);
          else if (c === 1) coeffTerms.push(`${base.label}`);
          else if (c < 0) coeffTerms.push(`−${Math.abs(c)}${base.label}`);
          else coeffTerms.push(`${c}${base.label}`);
        } else {
          if (c === -1) coeffTerms.push(`− ${base.label}`);
          else if (c < 0) coeffTerms.push(`− ${Math.abs(c)}${base.label}`);
          else if (c === 1) coeffTerms.push(`+ ${base.label}`);
          else coeffTerms.push(`+ ${c}${base.label}`);
        }
      }
      const coeffLabel = coeffTerms.join(" ");
      const compLabel = `<${fmtNum(sumDx / PPU)}, ${fmtNum(-sumDy / PPU)}>`; // convert back to math coords (y up)

      out.push({ id, resultant: { start, dx: sumDx, dy: sumDy, coeffLabel, compLabel } });
    }
    return out;
  }, [chainMap]);

  const clearCanvas = () => { setPlaced([]); setCarry(null); };

  // --- Render ---
  return (
    <div className="vector-dd" style={{ userSelect: 'none' }}>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onClick={handleCanvasClick}
        onMouseMove={onMouseMove}
        style={{ touchAction: "none", background: "#fff", borderRadius: 12, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Grid w={size.w} h={size.h} />

        {/* Toolbar INSIDE SVG (top area) */}
        <g transform="translate(8,8)">
          <rect x={0} y={0} rx={12} ry={12} width={size.w - 16} height={64} fill="#ffffffd9" stroke="#e5e7eb" />

          {/* Palette chips (entire button is clickable) */}
          {VECTORS.map((v, i) => (
            <g key={v.id} transform={`translate(${12 + i * 160}, 8)`} style={{ cursor: 'pointer' }} onClick={(e) => pickFromPalette(v.id, e)}>
              <rect width={148} height={48} rx={16} ry={16} fill="#f8fafc" stroke="#e5e7eb" />
              {/* mini arrow: convert units->pixels and scale down */}
              <Arrow x={20} y={24} dx={(v.ux * PPU) / 3} dy={(-v.uy * PPU) / 3} color={v.color} width={5} />
              <text x={112} y={26} dominantBaseline="middle" textAnchor="middle" fontSize={26} fill="#111827" fontWeight={700}>{v.label}</text>
            </g>
          ))}

          {/* Clear + Label toggle buttons */}
          <g transform={`translate(${size.w - 16 - 410}, 8)`} style={{ cursor: "pointer" }} onClick={() => setLabelMode((m) => (m === 'coeff' ? 'components' : 'coeff'))}>
            <rect width={210} height={48} rx={12} ry={12} fill="#ffffff" stroke="#e5e7eb" />
            <text x={105} y={26} dominantBaseline="middle" textAnchor="middle" fontSize={22} fontWeight={800} fill="#111">
              Label: {labelMode === 'coeff' ? 'vector sum' : 'components'}
            </text>
          </g>

          <g transform={`translate(${size.w - 16 - 180}, 8)`} onClick={clearCanvas} style={{ cursor: "pointer" }}>
            <rect width={180} height={48} rx={12} ry={12} fill="#ffffff" stroke="#e5e7eb" />
            <text x={90} y={26} dominantBaseline="middle" textAnchor="middle" fontSize={24} fontWeight={800} fill="#111">Clear canvas</text>
          </g>
        </g>

        {/* Terminal tip glow (all end anchors) */}
        {endAnchors.map((a, idx) => {
          const near = nearestEndAnchor(mousePos.x, mousePos.y);
          const isHot = near && near.chain === a.chain && Math.hypot(near.x - a.x, near.y - a.y) < 0.1;
          const r = isHot ? 12 : 9;
          const stroke = isHot ? "#0284c7" : "#38bdf8";
          const opacity = isHot ? 0.9 : 0.5;
          return (
            <circle key={`anc${idx}`} cx={a.x} cy={a.y} r={r} fill="none" stroke={stroke} strokeWidth={3} opacity={opacity} filter="url(#glow)" />
          );
        })}

        {/* Live preview while carrying from palette or placed */}
        {carry && (() => {
          let dx = 0, dy = 0, color = '#000';
          if (carry.type === 'palette') {
            const base = VECTORS.find((v) => v.id === carry.paletteId);
            if (!base) return null;
            dx = base.ux * PPU; dy = -base.uy * PPU; color = base.color;
          } else if (carry.type === 'placed') {
            const v = placed.find((p) => p.uid === carry.uid);
            if (!v) return null;
            dx = v.sign * v.dx; dy = v.sign * v.dy; color = v.color;
          }
          const snap = nearestEndAnchor(mousePos.x, mousePos.y);
          const x = snap ? snap.x : mousePos.x;
          const y = snap ? snap.y : mousePos.y;
          return <Arrow x={x} y={y} dx={dx} dy={dy} color={color} width={6} />;
        })()}

        {/* Placed constituents */}
        {placed.map((v) => {
          const ci = chainMap.get(v.chain || v.uid);
          const movable = !(ci?.locked);
          const cursor = movable ? 'pointer' : 'default';
          const x1 = v.x, y1 = v.y;
          const x2 = v.x + v.sign * v.dx, y2 = v.y + v.sign * v.dy;
          const minX = Math.min(x1, x2) - 14;
          const minY = Math.min(y1, y2) - 14;
          const w = Math.abs(x2 - x1) + 28;
          const h = Math.abs(y2 - y1) + 28;
          return (
            <g key={v.uid} style={{ cursor }} onClick={(e) => { if (!e.altKey && movable) pickPlaced(v); /* Alt handled on svg */ }}>
              {/* Invisible, bigger hit box for singletons (movable only) */}
              {movable && (
                <rect x={minX} y={minY} width={w} height={h} fill="transparent" pointerEvents="all" />
              )}
              <Arrow x={v.x} y={v.y} dx={v.sign * v.dx} dy={v.sign * v.dy} color={v.color} width={6} />
            </g>
          );
        })}

        {/* Resultants for chains with ≥2 (black + smart label) */}
        {chains.map(({ id, resultant }) => {
          const { start, dx, dy, coeffLabel, compLabel } = resultant;
          const L = Math.hypot(dx, dy) || 1;
          const ux = dx / L, uy = dy / L; // SVG coords (y down)
          const nx = -uy, ny = ux; // left-normal
          const s = uy > 0 ? -1 : 1; // prefer offset "above" when pointing downward
          const perp = 30; // px
          const t = 0.5; // place near middle, away from head
          const labelX = start.x + dx * t + nx * perp * s;
          const labelY = start.y + dy * t + ny * perp * s;
          const text = labelMode === 'coeff' ? coeffLabel : compLabel;
          return (
            <g key={`R${id}`}>
              <Arrow x={start.x} y={start.y} dx={dx} dy={dy} color="#111" width={7} />
              <text x={labelX} y={labelY} fontSize={28} textAnchor="middle" dominantBaseline="central" fill="#111" stroke="#fff" strokeWidth={4} paintOrder="stroke">{text}</text>
            </g>
          );
        })}
      </svg>

      <style>{`
        .vector-dd { width: 100%; }
        .vector-dd * { user-select: none; -webkit-user-select: none; -ms-user-select: none; }
      `}</style>
    </div>
  );
}
