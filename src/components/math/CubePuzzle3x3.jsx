import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * CubePuzzle3x3.jsx
 *
 * A 3D-ish (isometric) voxel editor + exact-cover style backtracking solver
 * for packing three identical copies of a user-designed polycube (1..9 unit cubes)
 * inside a 3x3x3 box. Gaps may remain if the piece has < 9 cubes.
 *
 * No external deps (Canvas 2D renderer). Drop into your React app and add a route.
 */

// ---------- Utility: 3D integer vector ops ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
const key = (v) => v.join(",");

// 6-neighborhood (face adjacency)
const NEI6 = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

// ---------- Rotation group (24 cube rotations) ----------
// Represent rotation as function pos->[x,y,z]. We'll generate via axis permutations and sign flips with det=+1.
function generateRotations24() {
  const axes = [0, 1, 2];
  const perms = permute(axes);
  const rots = [];
  for (const p of perms) {
    // p maps new axes -> old axes indices
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        for (const sz of [-1, 1]) {
          // Build 3x3 with columns being unit vectors e_p0*sx, e_p1*sy, e_p2*sz
          const M = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ];
          M[p[0]][0] = sx;
          M[p[1]][1] = sy;
          M[p[2]][2] = sz;
          const det =
            M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
            M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
            M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
          if (det === 1) {
            rots.push((v) => {
              return [
                M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
                M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
                M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
              ];
            });
          }
        }
  }
  // Dedup by applying to basis vectors and keying
  const seen = new Set();
  const uniq = [];
  for (const f of rots) {
    const sig = [f([1, 0, 0]), f([0, 1, 0]), f([0, 0, 1])]
      .map(key)
      .join("|");
    if (!seen.has(sig)) {
      seen.add(sig);
      uniq.push(f);
    }
  }
  return uniq; // should be 24
}

function permute(arr) {
  if (arr.length === 0) return [[]];
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) res.push([arr[i], ...p]);
  }
  return res;
}

const ROT24 = generateRotations24();

// Normalize a set of voxel coords: translate so min x,y,z = 0
function normalizeShape(cells) {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const zs = cells.map((c) => c[2]);
  const minx = Math.min(...xs);
  const miny = Math.min(...ys);
  const minz = Math.min(...zs);
  return cells.map((c) => [c[0] - minx, c[1] - miny, c[2] - minz]).sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]));
}

// Canonical signature string for shape
function shapeSig(cells) {
  return normalizeShape(cells).map(key).join(";");
}

// Generate all unique oriented variants of a shape (by 24 rotations), in normalized form
function orientedVariants(shape) {
  const set = new Set();
  const variants = [];
  for (const R of ROT24) {
    const rot = shape.map((c) => R(c));
    const norm = normalizeShape(rot);
    const sig = shapeSig(norm);
    if (!set.has(sig)) {
      set.add(sig);
      variants.push(norm);
    }
  }
  return variants;
}

// ---------- Connectivity check (BFS over voxels) ----------
function isConnected(cells) {
  if (cells.length === 0) return false;
  const S = new Set(cells.map(key));
  const start = cells[0];
  const Q = [start];
  const V = new Set([key(start)]);
  while (Q.length) {
    const u = Q.shift();
    for (const d of NEI6) {
      const v = add(u, d);
      const k = key(v);
      if (S.has(k) && !V.has(k)) {
        V.add(k);
        Q.push(v);
      }
    }
  }
  return V.size === cells.length;
}

// ---------- Solver ----------
// Place 3 copies of the shape (unique orientations) into 3x3x3 without overlap.
// Return placements as arrays of {cells: [[x,y,z],...], color}
function solveThreeCopies(baseShape) {
  if (!baseShape.length) return null;
  const N = 3;
  const variants = orientedVariants(baseShape);

  // Precompute placements for each variant at all translations fitting inside 3x3x3
  const BOX = 3;
  const placements = [];
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const maxx = Math.max(...v.map((c) => c[0]));
    const maxy = Math.max(...v.map((c) => c[1]));
    const maxz = Math.max(...v.map((c) => c[2]));
    for (let tx = 0; tx <= BOX - 1 - maxx; tx++)
      for (let ty = 0; ty <= BOX - 1 - maxy; ty++)
        for (let tz = 0; tz <= BOX - 1 - maxz; tz++) {
          const translated = v.map((c) => [c[0] + tx, c[1] + ty, c[2] + tz]);
          placements.push({ variantIndex: i, cells: translated });
        }
  }

  // Simple symmetry break: sort placements by a signature so early ones anchor low coords
  placements.sort((A, B) => shapeSig(A.cells).localeCompare(shapeSig(B.cells)));

  // Occupancy grid
  const occ = new Set();
  const picks = [];

  function fits(cells) {
    for (const c of cells) {
      const k = key(c);
      if (occ.has(k)) return false;
      // bounds already ensured
    }
    return true;
  }

  function place(cells) {
    for (const c of cells) occ.add(key(c));
  }
  function unplace(cells) {
    for (const c of cells) occ.delete(key(c));
  }

  // Quick pruning: ensure the first chosen placement has the smallest occupied cell in the whole packing
  let anchorKey = null;

  function backtrack(depth, startIdx) {
    if (depth === N) return true;
    for (let i = startIdx; i < placements.length; i++) {
      const P = placements[i];
      if (fits(P.cells)) {
        // anchor rule at depth 0
        if (depth === 0) {
          const smallest = P.cells
            .slice()
            .sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]))[0];
          anchorKey = key(smallest);
        } else if (anchorKey) {
          // Ensure current placement contains a cell >= anchorKey lexicographically
          const mins = P.cells
            .slice()
            .sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]))[0];
          const km = key(mins);
          if (km < anchorKey) continue;
        }

        place(P.cells);
        picks.push(P);
        if (backtrack(depth + 1, i)) return true; // allow reuse of same variant/translation for next copies? No conflict anyway
        picks.pop();
        unplace(P.cells);
      }
    }
    return false;
  }

  const ok = backtrack(0, 0);
  if (!ok) return null;

  // Colorize selections
  const colors = ["#3b82f6", "#10b981", "#f59e0b"]; // blue, green, amber
  return picks.map((p, idx) => ({ cells: p.cells, color: colors[idx % colors.length] }));
}

// ---------- Isometric Canvas Renderer ----------
function isoProject([x, y, z], cell, offx, offy, yaw = 45 * (Math.PI / 180), pitch = 0.615) {
  // Simple isometric-like projection
  const cx = x - 1; // center box around origin
  const cy = y - 1;
  const cz = z - 1;
  // rotate around Y (yaw), then X (pitch)
  const sy = Math.sin(yaw), cyaw = Math.cos(yaw);
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  // yaw: [x,z]
  let rx = cx * cyaw + cz * sy;
  let rz = -cx * sy + cz * cyaw;
  // pitch on [y,rz]
  let ry = cy * cp - rz * sp;
  rz = cy * sp + rz * cp;
  const scale = cell * 30;
  const X = offx + rx * scale;
  const Y = offy + ry * scale;
  return [X, Y, rz];
}

function drawCube2D(ctx, proj, cell = 16, fill = "#ddd", stroke = "#555") {
  // Render a cube as 3 visible faces via simple diamond-ish polygons
  const [x, y] = proj([0, 0, 0]); // access inside closure
}

// We'll implement a painter that draws cubes cell-by-cell using projected quads
function makeRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const offx = W / 2;
  const offy = H / 2 + 40;
  const cell = 1; // logical size for projection function
  const proj = (v) => isoProject(v, cell, offx, offy);

  function facePath(p) {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.closePath();
  }

  function cubeAt(x, y, z, color) {
    // corner points of unit cube faces after projection
    const corners = [
      [x, y, z],
      [x + 1, y, z],
      [x + 1, y + 1, z],
      [x, y + 1, z],
      [x, y, z + 1],
      [x + 1, y, z + 1],
      [x + 1, y + 1, z + 1],
      [x, y + 1, z + 1],
    ].map((c) => proj(c));

    // Faces: top (4,5,6,7), left (0,3,7,4), right (1,2,6,5)
    const faces = [
      { idx: [4, 5, 6, 7], shade: 1.0 },
      { idx: [0, 3, 7, 4], shade: 0.85 },
      { idx: [1, 2, 6, 5], shade: 0.7 },
    ];
    // depth for painter's algorithm
    const depth = corners.reduce((s, c) => s + c[2], 0) / corners.length;

    for (const f of faces) {
      const poly = f.idx.map((i) => [corners[i][0], corners[i][1]]);
      facePath(poly);
      ctx.fillStyle = shade(color, f.shade);
      ctx.fill();
      // no stroke to make joined voxels appear solid
    }

    return depth;
  }

  function shade(hex, s = 1.0) {
    const { r, g, b } = hexToRgb(hex);
    const rr = Math.round(r * s);
    const gg = Math.round(g * s);
    const bb = Math.round(b * s);
    return `rgb(${rr},${gg},${bb})`;
  }

  function clear() {
    ctx.clearRect(0, 0, W, H);
  }

  return { cubeAt, clear };
}

function hexToRgb(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return { r: 200, g: 200, b: 200 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// ---------- UI Component ----------
export default function CubePuzzle3x3() {
  const [vox, setVox] = useState(() => new Set()); // selected voxels for the piece editor (within 3x3x3)
  const [activeZ, setActiveZ] = useState(0);
  const [solution, setSolution] = useState(null);
  const [yawDeg, setYawDeg] = useState(40);
  const [pitchDeg, setPitchDeg] = useState(35);
  const canvasRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const variant = { box: 3 };

  const piece = useMemo(() => Array.from(vox).map((k) => k.split(",").map((n) => parseInt(n, 10))), [vox]);

  // keep editor state sane when switching box size
  useEffect(() => {
    setActiveZ((z) => Math.min(z, variant.box - 1));
    setVox((S) => {
      const out = new Set();
      for (const s of S) {
        const [x,y,z] = s.split(',').map(Number);
        if (x < variant.box && y < variant.box && z < variant.box) out.add(s);
      }
      return out;
    });
  }, [variant.box]);
  const pieceCount = piece.length;

  function toggle(x, y, z) {
    const k = `${x},${y},${z}`;
    setVox((S) => {
      const T = new Set(S);
      if (T.has(k)) T.delete(k); else T.add(k);
      return limitTo(T, 9);
    });
  }

  function limitTo(S, max) {
    // keep connectivity by greedily removing far voxels if over max
    if (S.size <= max) return S;
    const arr = Array.from(S).map((s) => s.split(",").map((n) => parseInt(n, 10)));
    // remove the furthest from centroid until size<=max
    while (arr.length > max) {
      const cx = arr.reduce((s, v) => s + v[0], 0) / arr.length;
      const cy = arr.reduce((s, v) => s + v[1], 0) / arr.length;
      const cz = arr.reduce((s, v) => s + v[2], 0) / arr.length;
      let bestI = 0, bestD = -1;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        const d = (v[0] - cx) ** 2 + (v[1] - cy) ** 2 + (v[2] - cz) ** 2;
        if (d > bestD) { bestD = d; bestI = i; }
      }
      arr.splice(bestI, 1);
    }
    return new Set(arr.map(key));
  }

  function clearPiece() {
    setVox(new Set());
    setSolution(null);
  }

  function randomConnected(n = 7) {
    n = Math.max(1, Math.min(9, n));
    const cells = [[1, 1, 1]];
    const S = new Set([key(cells[0])]);
    while (cells.length < n) {
      const base = cells[Math.floor(Math.random() * cells.length)];
      const d = NEI6[Math.floor(Math.random() * NEI6.length)];
      const v = add(base, d);
      if (v.some((c) => c < 0 || c > 2)) continue; // keep inside 3x3x3 for editor convenience
      const k = key(v);
      if (!S.has(k)) { S.add(k); cells.push(v); }
    }
    setVox(new Set(cells.map(key)));
    setSolution(null);
  }

  function findSolution() {
    const cells = piece;
    if (cells.length === 0) {
      setSolution(null);
      return;
    }
    if (!isConnected(cells)) {
      alert("The piece must be face-connected (one continuous piece).\nTry connecting all selected cubes.");
      return;
    }
    const base = normalizeShape(cells);
    const sol = solveThreeCopies(base);
    setSolution(sol);
  }

  // Draw solution (if any)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.clientWidth, H = canvas.clientHeight;
    // sync display size to backing store for crispness
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(W * ratio);
    canvas.height = Math.floor(H * ratio);
    ctx.scale(ratio, ratio);

    const Wcss = W, Hcss = H;
    const offx = Wcss / 2 + pan.x;
    const offy = Hcss / 2 + 60 + pan.y;

    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;

    function proj(v) {
      const [X, Y, Z] = isoProject(v, zoom, offx, offy, yaw, pitch);
      return [X, Y, Z];
    }

    ctx.clearRect(0, 0, Wcss, Hcss);

    // draw wireframe 3x3x3 box
    drawBoundingBox(ctx, proj, variant.box);

    if (solution && solution.length) {
      // surface extraction for a solid look (only boundary faces per piece)
      const colorMap = new Map();
      solution.forEach((part, idx) => part.cells.forEach((c) => colorMap.set(key(c), idx)));
      const faces = buildVisibleFacesFromColorMap(colorMap);
      const projected = faces.map((f) => {
        const pts = f.poly.map((p) => proj(p));
        const depth = pts.reduce((s, c) => s + c[2], 0) / pts.length;
        return { pts, depth, shade: f.shade, colorIdx: f.colorIdx };
      });
      projected.sort((a, b) => a.depth - b.depth);
      for (const f of projected) {
        ctx.beginPath();
        ctx.moveTo(f.pts[0][0], f.pts[0][1]);
        for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
        ctx.closePath();
        const baseColor = solution[f.colorIdx % solution.length]?.color || "#888";
        ctx.fillStyle = shade(baseColor, f.shade);
        ctx.fill();
      }
    }
  }, [solution, yawDeg, pitchDeg, pan, zoom, variant]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>3×3×3 Polycube Triplet Checker</h1>
      <p style={{ marginTop: 0 }}>
        Build a single connected polycube (≤ 9 cubes) in the 3×3×3 editor. Then click
        <em> Find Configuration</em> to see if three identical copies can fit inside a 3×3×3 box (gaps allowed).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        {/* Editor */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Piece Editor</h3>
          <p style={{ margin: "4px 0" }}>Active layer (z): {activeZ + 1} / {variant.box}</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {Array.from({ length: variant.box }).map((_, z) => (
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

          <LayerGrid vox={vox} z={activeZ} toggle={toggle} size={variant.box} />
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button onClick={() => randomConnected(7)} style={btn()}>Random 7</button>
            <button onClick={() => randomConnected(9)} style={btn()}>Random 9</button>
            <button onClick={clearPiece} style={btn("#ef4444")}>Clear</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 14, color: "#374151" }}>
            Cubes selected: <b>{pieceCount}</b>{" "}
            {!isConnected(piece) && pieceCount > 0 ? (
              <span style={{ color: "#b45309" }}>— not connected</span>
            ) : null}
          </div>
        </div>

        {/* Viewer + controls */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Packing Viewer</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button onClick={findSolution} style={btn("#10b981")}>Find Configuration</button>
            <button onClick={() => setSolution(null)} style={btn("#6b7280")}>Clear Solution</button>
          </div>
          {/* Drag to orbit view (no sliders) */}

          <div style={{
            width: "100%",
            height: 520,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
          }}>
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                if (!canvasRef.current) return;
                canvasRef.current.setPointerCapture?.(e.pointerId);
                if (!canvasRef.current.__drag) canvasRef.current.__drag = { on: false, x: 0, y: 0 };
                canvasRef.current.__drag.on = true;
                canvasRef.current.__drag.x = e.clientX;
                canvasRef.current.__drag.y = e.clientY;
              }}
              onPointerMove={(e) => {
                const d = canvasRef.current?.__drag;
                if (!d || !d.on) return;
                const dx = e.clientX - d.x;
                const dy = e.clientY - d.y;
                setYawDeg((v) => v + dx * 0.4);
                setPitchDeg((v) => Math.max(5, Math.min(85, v - dy * 0.4)));
                d.x = e.clientX;
                d.y = e.clientY;
              }}
              onPointerUp={(e) => {
                const d = canvasRef.current?.__drag;
                if (d) d.on = false;
                canvasRef.current?.releasePointerCapture?.(e.pointerId);
              }}
              onPointerCancel={(e) => {
                const d = canvasRef.current?.__drag;
                if (d) d.on = false;
                canvasRef.current?.releasePointerCapture?.(e.pointerId);
              }}
              style={{ width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
            />
            {solution === null ? (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#6b7280" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>No solution yet</div>
                  <div style={{ fontSize: 14 }}>Build a piece and click “Find Configuration”.</div>
                </div>
              </div>
            ) : solution === false || solution === undefined ? null : solution?.length === 0 ? (
              <div />
            ) : null}
          </div>

          <div style={{ marginTop: 8, fontSize: 14 }}>
            {solution === null ? null : solution ? (
              <span style={{ color: "#065f46" }}>Found a valid packing of three copies.</span>
            ) : (
              <span style={{ color: "#7f1d1d" }}>No packing of three copies exists (search exhausted).</span>
            )}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 16, fontSize: 14, color: "#4b5563" }}>
        Tip: Drag on the packing view to orbit the camera (yaw/pitch). Voxels render without edge lines so merged pieces look solid.
      </p>
    </div>
  );
}

function btn(bg = "#3b82f6") {
  return {
    background: bg,
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function LayerGrid({ vox, z, toggle, size = 3 }) {
  // size×size grid for a given z-layer
  const cells = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      cells.push({ x, y, z, k: `${x},${y},${z}` });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 8 }}>
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
        />) // eslint-disable-line react/jsx-key
      )}
    </div>
  );
}

function drawBoundingBox(ctx, proj) {
  // Draw edges of the 3x3x3 box
  const edges = [];
  const pts = (x, y, z) => proj([x, y, z]);
  const corners = [];
  for (const X of [0, 3])
    for (const Y of [0, 3])
      for (const Z of [0, 3])
        corners.push(pts(X, Y, Z));
  function line(a, b) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1;

  // 12 edges of cube
  const C = (x, y, z) => pts(x, y, z);
  const E = [
    [C(0, 0, 0), C(3, 0, 0)],
    [C(0, 3, 0), C(3, 3, 0)],
    [C(0, 0, 3), C(3, 0, 3)],
    [C(0, 3, 3), C(3, 3, 3)],

    [C(0, 0, 0), C(0, 3, 0)],
    [C(3, 0, 0), C(3, 3, 0)],
    [C(0, 0, 3), C(0, 3, 3)],
    [C(3, 0, 3), C(3, 3, 3)],

    [C(0, 0, 0), C(0, 0, 3)],
    [C(3, 0, 0), C(3, 0, 3)],
    [C(0, 3, 0), C(0, 3, 3)],
    [C(3, 3, 0), C(3, 3, 3)],
  ];
  for (const [a, b] of E) line(a, b);
}

// face-based renderer helpers
function shade(hex, s = 1.0) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r*s)},${Math.round(g*s)},${Math.round(b*s)})`;
}

function buildVisibleFacesFromColorMap(colorMap) {
  // colorMap: key(x,y,z) -> piece index
  const faces = [];
  const DIRS = [
    { d:[1,0,0], nShade:0.85 },
    { d:[-1,0,0], nShade:0.70 },
    { d:[0,1,0], nShade:0.90 },
    { d:[0,-1,0], nShade:0.75 },
    { d:[0,0,1], nShade:1.00 },
    { d:[0,0,-1], nShade:0.55 },
  ];
  for (const [k,v] of colorMap.entries()) {
    const [x,y,z] = k.split(',').map(Number);
    for (const {d, nShade} of DIRS) {
      const nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (!colorMap.has(`${nx},${ny},${nz}`)) {
        const poly = faceQuad([x,y,z], d);
        faces.push({ poly, shade: nShade, colorIdx: v });
      }
    }
  }
  return faces;
}

function faceQuad([x,y,z], dir) {
  const [dx,dy,dz] = dir;
  if (dx === 1) return [[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]];
  if (dx === -1) return [[x,y,z],[x,y,z+1],[x,y+1,z+1],[x,y+1,z]];
  if (dy === 1) return [[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]];
  if (dy === -1) return [[x,y,z],[x,y,z+1],[x+1,y,z+1],[x+1,y,z]];
  if (dz === 1) return [[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]];
  return [[x,y,z],[x,y+1,z],[x+1,y+1,z],[x+1,y,z]]; // dz === -1
}