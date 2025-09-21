import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CubePuzzle3x3.jsx (final)
 *
 * • Editor: z-slice buttons, click squares (no labels), same UI for 3×3×3 and 4×4×4.
 * • Viewer: left-drag orbit, right-drag pan, wheel zoom; renders solid (outer faces only).
 * • Solver: packs N identical copies (N = box size: 3 or 4) of the user piece into BOX×BOX×BOX.
 *
 * No external deps.
 */

// ------------------------- math & geometry helpers -------------------------
const keyN = (v) => v.join(",");
const addN = (a, b) => a.map((v, i) => v + b[i]);
const neighborsD = (D) => {
  const dirs = [];
  for (let i = 0; i < D; i++) {
    const d = Array(D).fill(0);
    d[i] = 1; dirs.push(d.slice());
    d[i] = -1; dirs.push(d.slice());
  }
  return dirs;
};

function normalizeShapeND(shape) {
  if (!shape.length) return [];
  const D = shape[0].length;
  const mins = Array(D).fill(Infinity);
  for (const v of shape) for (let i = 0; i < D; i++) mins[i] = Math.min(mins[i], v[i]);
  const shifted = shape.map((v) => v.map((c, i) => c - mins[i]));
  shifted.sort((a, b) => { for (let i = 0; i < D; i++) { if (a[i] !== b[i]) return a[i] - b[i]; } return 0; });
  return shifted;
}

function isConnectedND(cells, D) {
  if (cells.length === 0) return false;
  const S = new Set(cells.map(keyN));
  const dirs = neighborsD(D);
  const V = new Set([keyN(cells[0])]);
  const Q = [cells[0]];
  while (Q.length) {
    const v = Q.shift();
    for (const d of dirs) {
      const n = addN(v, d); const k = keyN(n);
      if (S.has(k) && !V.has(k)) { V.add(k); Q.push(n); }
    }
  }
  return V.size === cells.length;
}

// Orientation-preserving signed-permutation rotations in D=3
// Robust 24 rotations for 3D (orientation-preserving)
function rotations24() {
  const dirs = [ [1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1] ];
  const dot = (a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross = (a,b)=>[ a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0] ];
  const orth = (a,b)=>dot(a,b)===0;
  const rots = [];
  for (const ex of dirs) {
    for (const ey of dirs) {
      if (!orth(ex,ey)) continue; // must be perpendicular
      const ez = cross(ex,ey);
      // ensure right-handed (det=+1): ez must be one of dirs
      if (!dirs.some(d => d[0]===ez[0] && d[1]===ez[1] && d[2]===ez[2])) continue;
      // Build mapping v -> ex*x + ey*y + ez*z
      rots.push((v) => [ v[0]*ex[0] + v[1]*ey[0] + v[2]*ez[0],
                         v[0]*ex[1] + v[1]*ey[1] + v[2]*ez[1],
                         v[0]*ex[2] + v[1]*ey[2] + v[2]*ez[2] ]);
    }
  }
  // Dedup
  const seen = new Set(); const out = [];
  for (const R of rots) {
    const basis = [[1,0,0],[0,1,0],[0,0,1]].map(e => R(e));
    const sig = basis.map((v)=>v.join(",")).join("|");
    if (!seen.has(sig)) { seen.add(sig); out.push(R); }
  }
  return out; // 24
}

function orientedVariantsND(shape, D) {
  // D is ignored; we only need 3D here
  const ROT = rotations24();
  const set = new Set(); const out = [];
  for (const R of ROT) {
    const rot = shape.map((c) => R(c));
    const norm = normalizeShapeND(rot);
    const sig = norm.map((v)=>v.join(",")).join(";");
    if (!set.has(sig)) { set.add(sig); out.push(norm); }
  }
  return out;
}


// ------------------------- solver (3D) -------------------------
function solveCopiesND(baseShape, D, BOX, copies) {
  if (!baseShape.length) return null;
  const variants = orientedVariantsND(baseShape, D);

  // Enumerate all placements (variant + translation)
  const placements = [];
  const maxs = (arr) => { const m = Array(D).fill(0); for (const c of arr) for (let i = 0; i < D; i++) m[i] = Math.max(m[i], c[i]); return m; };
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const m = maxs(v);
    const limits = m.map((mi) => BOX - 1 - mi);
    const trans = Array(D).fill(0);
    (function loop(dim) {
      if (dim === D) {
        const placed = v.map((c) => c.map((x, j) => x + trans[j]));
        placements.push({ cells: placed, variantIndex: i });
        return;
      }
      for (let t = 0; t <= limits[dim]; t++) { trans[dim] = t; loop(dim + 1); }
    })(0);
  }

  // Map: cell key -> list of placement indices that cover it
  const cover = new Map();
  const k = (c) => c.join(",");
  placements.forEach((P, idx) => {
    for (const c of P.cells) {
      const key = k(c);
      if (!cover.has(key)) cover.set(key, []);
      cover.get(key).push(idx);
    }
  });

  const occ = new Set();
  const picks = [];
  const fits = (cells) => { for (const c of cells) if (occ.has(k(c))) return false; return true; };
  const place = (cells) => { for (const c of cells) occ.add(k(c)); };
  const unplace = (cells) => { for (const c of cells) occ.delete(k(c)); };

  function chooseAnchorWithOptions() {
    // pick an empty cell that is coverable by at least one *currently feasible* placement
    let best = null; // { key, options }
    for (let z = 0; z < BOX; z++) for (let y = 0; y < BOX; y++) for (let x = 0; x < BOX; x++) {
      const kk = k([x, y, z]);
      if (occ.has(kk)) continue;
      const arr = cover.get(kk) || [];
      if (arr.length === 0) continue; // we don't require covering all empty cells
      // filter by feasibility under current occ
      const options = [];
      for (const pidx of arr) { const P = placements[pidx]; if (fits(P.cells)) options.push(pidx); }
      if (options.length === 0) continue;
      if (!best || options.length < best.options.length) best = { key: kk, options };
    }
    return best; // may be null if no feasible options remain
  }

  function backtrack(depth) {
    if (depth === copies) return true; // placed enough copies
    const choice = chooseAnchorWithOptions();
    if (!choice) return false; // no feasible anchor => cannot place remaining copies
    // try options with simple ordering (fewest fits first already)
    for (const pidx of choice.options) {
      const P = placements[pidx];
      place(P.cells); picks.push(P);
      if (backtrack(depth + 1)) return true;
      picks.pop(); unplace(P.cells);
    }
    return false;
  }

  const ok = backtrack(0);
  if (!ok) return false;

  const palette = ["#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#06b6d4"];
  return picks.map((p, idx) => ({ ...p, color: palette[idx % palette.length] }));
}

// ------------------------- rendering helpers -------------------------
function isoProject([x, y, z], scale, offx, offy, yaw, pitch, boxSize) {
  const cx = x - (boxSize - 1) / 2; // center the box
  const cy = y - (boxSize - 1) / 2;
  const cz = z - (boxSize - 1) / 2;
  const sy = Math.sin(yaw), cyaw = Math.cos(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  let rx = cx * cyaw + cz * sy;
  let rz = -cx * sy + cz * cyaw;
  let ry = cy * cp - rz * sp;
  rz = cy * sp + rz * cp;
  const S = scale * 30;
  const X = offx + rx * S;
  const Y = offy + ry * S;
  return [X, Y, rz];
}

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return { r: 200, g: 200, b: 200 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
const shade = (hex, s = 1) => { const { r, g, b } = hexToRgb(hex); return `rgb(${Math.round(r * s)},${Math.round(g * s)},${Math.round(b * s)})`; };

function faceQuad([x, y, z], dir) {
  const [dx, dy, dz] = dir;
  if (dx === 1) return [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]];
  if (dx === -1) return [[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]];
  if (dy === 1) return [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]];
  if (dy === -1) return [[x, y, z], [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y, z]];
  if (dz === 1) return [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]];
  return [[x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z]]; // dz === -1
}

function buildVisibleFacesFromColorMap(colorMap) {
  const faces = [];
  const DIRS = [
    { d: [1, 0, 0], nShade: 0.85 },
    { d: [-1, 0, 0], nShade: 0.70 },
    { d: [0, 1, 0], nShade: 0.90 },
    { d: [0, -1, 0], nShade: 0.75 },
    { d: [0, 0, 1], nShade: 1.00 },
    { d: [0, 0, -1], nShade: 0.55 },
  ];
  for (const [k, idx] of colorMap.entries()) {
    const [x, y, z] = k.split(',').map(Number);
    for (const { d, nShade } of DIRS) {
      const nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (!colorMap.has(keyN([nx, ny, nz])) ) {
        faces.push({ poly: faceQuad([x, y, z], d), shade: nShade, colorIdx: idx });
      }
    }
  }
  return faces;
}

function drawBoxEdges(ctx, proj, BOX) {
  const C = (x, y, z) => proj([x, y, z]);
  const edges = [
    [C(0, 0, 0), C(BOX, 0, 0)], [C(0, BOX, 0), C(BOX, BOX, 0)], [C(0, 0, BOX), C(BOX, 0, BOX)], [C(0, BOX, BOX), C(BOX, BOX, BOX)],
    [C(0, 0, 0), C(0, BOX, 0)], [C(BOX, 0, 0), C(BOX, BOX, 0)], [C(0, 0, BOX), C(0, BOX, BOX)], [C(BOX, 0, BOX), C(BOX, BOX, BOX)],
    [C(0, 0, 0), C(0, 0, BOX)], [C(BOX, 0, 0), C(BOX, 0, BOX)], [C(0, BOX, 0), C(0, BOX, BOX)], [C(BOX, BOX, 0), C(BOX, BOX, BOX)],
  ];
  ctx.strokeStyle = "#9ca3af"; ctx.lineWidth = 1;
  for (const [a, b] of edges) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
}

// ------------------------- component -------------------------
export default function CubePuzzle3x3() {
  const [variant, setVariant] = useState("3"); // "3" for 3×3×3, "4" for 4×4×4

  // editor (same Set for both modes; we prune when switching sizes)
  const [vox, setVox] = useState(() => new Set()); // keys: "x,y,z"
  const [activeZ, setActiveZ] = useState(0);

  // viewer state
  const [solution, setSolution] = useState(null); // null|false|array
  const [yawDeg, setYawDeg] = useState(40);
  const [pitchDeg, setPitchDeg] = useState(35);
  const [zoom, setZoom] = useState(1.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const BOX = variant === "3" ? 3 : 4;
  const COPIES = BOX; // 3 copies in 3×3×3, 4 copies in 4×4×4

  // piece
  const piece = useMemo(() => Array.from(vox).map((k) => k.split(",").map(Number)), [vox]);
  const pieceOK = useMemo(() => isConnectedND(piece, 3), [piece]);
  const pieceCount = piece.length;

  // keep editor sane when switching sizes
  useEffect(() => {
    setActiveZ((z) => Math.min(z, BOX - 1));
    setVox((S) => {
      const out = new Set();
      for (const s of S) {
        const [x, y, z] = s.split(',').map(Number);
        if (x < BOX && y < BOX && z < BOX) out.add(s);
      }
      return out;
    });
    setSolution(null);
  }, [BOX]);

  function toggle(x, y, z) {
    const k = `${x},${y},${z}`;
    setVox((S) => { const T = new Set(S); if (T.has(k)) T.delete(k); else T.add(k); return T; });
    setSolution(null);
  }

  function clearPiece() { setVox(new Set()); setSolution(null); }

  function randomConnected(n, size) {
    const cells = []; const S = new Set();
    const start = [Math.floor(size/2), Math.floor(size/2), Math.floor(size/2)];
    cells.push(start); S.add(keyN(start));
    const NEI6 = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    while (cells.length < n) {
      const base = cells[(Math.random() * cells.length) | 0];
      const d = NEI6[(Math.random() * NEI6.length) | 0];
      const v = [base[0] + d[0], base[1] + d[1], base[2] + d[2]];
      if (v.some((c) => c < 0 || c >= size)) continue;
      const k = keyN(v); if (!S.has(k)) { S.add(k); cells.push(v); }
    }
    setVox(new Set(cells.map(keyN)));
    setSolution(null);
    setTimeout(() => findSolutionFromCells(cells), 0);
  }

  function random3(n = 7) { randomConnected(n, 3); }
  function random3b() { randomConnected(8, 3); }
  function random4(n = 8) { randomConnected(n, 4); }
  function random4b() { randomConnected(12, 4); }

  function findSolution() { findSolutionFromCells(piece); }

  function findSolutionFromCells(cells) {
    if (cells.length === 0) { setSolution(null); return; }
    if (!isConnectedND(cells, 3)) { alert("The piece must be face-connected (one continuous piece).\nTry connecting all selected cubes."); return; }
    const base = normalizeShapeND(cells);
    const sol = solveCopiesND(base, 3, BOX, COPIES);
    if (sol && sol.length) setSolution(sol); else setSolution(false);
  }

  // --------------- canvas draw ---------------
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const offx = W / 2 + pan.x; const offy = H / 2 + 60 + pan.y;
    const yaw = (yawDeg * Math.PI) / 180; const pitch = (pitchDeg * Math.PI) / 180;
    const proj = (v) => isoProject(v, zoom, offx, offy, yaw, pitch, BOX);

    ctx.clearRect(0, 0, W, H);

    // bounding cube
    drawBoxEdges(ctx, (p) => proj(p), BOX);

    if (solution && solution.length) {
      const colorMap = new Map();
      for (let i = 0; i < solution.length; i++) for (const c of solution[i].cells) colorMap.set(keyN(c), i);
      const faces = buildVisibleFacesFromColorMap(colorMap);
      const projected = faces.map((f) => {
        const pts = f.poly.map((p) => proj(p));
        const depth = pts.reduce((s, c) => s + c[2], 0) / pts.length;
        return { pts, depth, shade: f.shade, colorIdx: f.colorIdx };
      }).sort((a, b) => a.depth - b.depth);
      for (const f of projected) {
        ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]);
        for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
        ctx.closePath();
        const baseColor = solution[f.colorIdx % solution.length]?.color || "#888";
        ctx.fillStyle = shade(baseColor, f.shade); ctx.fill();
      }
    }
  }, [solution, yawDeg, pitchDeg, pan, zoom, BOX]);

  // interactions
  function onPointerDown(e) {
    const c = canvasRef.current; if (!c) return;
    c.setPointerCapture?.(e.pointerId);
    c.__drag = { on: true, x: e.clientX, y: e.clientY, mode: (e.button === 2 || e.buttons === 2) ? "pan" : "orbit" };
  }
  function onPointerMove(e) {
    const c = canvasRef.current; const d = c?.__drag; if (!d || !d.on) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (d.mode === "pan") setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    else { setYawDeg((v) => v + dx * 0.4); setPitchDeg((v) => Math.max(5, Math.min(85, v - dy * 0.4))); }
    d.x = e.clientX; d.y = e.clientY;
  }
  function onPointerUp(e) {
    const c = canvasRef.current; const d = c?.__drag; if (d) d.on = false; c?.releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e) {
    e.preventDefault(); const delta = Math.sign(e.deltaY);
    setZoom((z) => Math.max(0.5, Math.min(2.5, z * (delta > 0 ? 0.9 : 1.1))));
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Polycube Packing Checker</h1>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Editor */}
        <div style={{ flex: "0 0 360px", minWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 700, marginRight: 8 }}>Variant:</label>
            <select value={variant} onChange={(e) => setVariant(e.target.value)}>
              <option value="3">3×3×3 (3 copies)</option>
              <option value="4">4×4×4 (4 copies)</option>
            </select>
          </div>

          <h3 style={{ margin: "8px 0 4px" }}>Piece Editor ({BOX}×{BOX}×{BOX})</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {Array.from({ length: BOX }).map((_, z) => (
              <button
                key={z}
                onClick={() => setActiveZ(z)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: activeZ === z ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  background: activeZ === z ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                z = {z}
              </button>
            ))}
          </div>

          <LayerGrid vox={vox} z={activeZ} size={BOX} toggle={toggle} />

          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {BOX === 3 ? (
              <>
                <button onClick={() => random3(7)} style={btn()}>Random 7</button>
                <button onClick={random3b} style={btn()}>Random 8</button>
              </>
            ) : (
              <>
                <button onClick={() => random4(8)} style={btn()}>Random 8</button>
                <button onClick={random4b} style={btn()}>Random 12</button>
              </>
            )}
            <button onClick={clearPiece} style={btn("#ef4444")}>Clear</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: "#374151" }}>
            Cubes selected: <b>{pieceCount}</b>{!pieceOK && pieceCount > 0 ? (<span style={{ color: "#b45309" }}> — not connected</span>) : null}
          </div>
        </div>

        {/* Viewer */}
        <div style={{ flex: 1, minWidth: 420 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <h3 style={{ marginTop: 0 }}>Packing Viewer</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <button onClick={findSolution} style={btn("#10b981")}>Find Configuration</button>
              <button onClick={() => setSolution(null)} style={btn("#6b7280")}>Clear Solution</button>
            </div>

            <div
              style={{ width: "100%", height: 520, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", position: "relative" }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
                style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
              />
              {solution === null ? (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#6b7280" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>No solution yet</div>
                    <div style={{ fontSize: 14 }}>Build a piece and click “Find Configuration”.</div>
                  </div>
                </div>
              ) : solution === false ? (
                <div style={{ position: "absolute", inset: 8, color: "#7f1d1d", fontWeight: 600 }}>No packing exists (search exhausted).</div>
              ) : null}
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Tip: Left‑drag to orbit, right‑drag to pan, wheel to zoom. 
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(bg = "#3b82f6") {
  return { background: bg, color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" };
}

function LayerGrid({ vox, z, size = 3, toggle }) {
  const cells = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) cells.push({ x, y, z, k: `${x},${y},${z}` });
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 64px)`, gap: 8 }}>
      {cells.map(({ x, y, z, k }) => (
        <button
          key={k}
          onClick={() => toggle(x, y, z)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 10,
            border: vox.has(k) ? "2px solid #111827" : "1px solid #d1d5db",
            background: vox.has(k) ? "#fde68a" : "#fff",
            boxShadow: vox.has(k) ? "inset 0 2px 8px rgba(0,0,0,0.15)" : "none",
            cursor: "pointer",
          }}
          title={`(${x},${y},${z})`}
        />
      ))}
    </div>
  );
}
