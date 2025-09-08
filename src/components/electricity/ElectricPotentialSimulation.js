import React, { useState, useEffect, useRef, useMemo } from "react";

// ElectricFieldSimulation — with potential colormap + equipotential lines (togglable)
// -------------------------------------------------------------------------------
// What’s new vs your original file:
//  • Show potential as a 2D color map (diverging palette, negative→blue, zero→white, positive→red)
//  • Optional equipotential lines overlay (computed with marching-squares from the sampled V(x,y) grid)
//  • Toggles to show/hide: colormap, equipotentials, field arrows, field lines
//  • Colormap quality slider (controls the sampling resolution / performance)
//  • Resize-safe: regenerates cached colormap/contours only when size/charges/settings change
//  • Keeps all of your interactions: add/drag/delete charges + draggable/animatable test charge

const ElectricFieldSimulation = () => {
  const canvasRef = useRef(null);
  const k = 9e9; // Coulomb's constant

  // -------- Responsive sizing --------
  const ASPECT = 0.6; // height = aspect * width
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

  const computeSize = () => {
    const parent = canvasRef.current?.parentElement;
    const parentWidth = parent
      ? parent.getBoundingClientRect().width
      : window.innerWidth - 48;
    const w = clamp(parentWidth, 320, 900);
    return { width: Math.round(w), height: Math.round(w * ASPECT) };
  };

  const [size, setSize] = useState(computeSize());
  const prevSizeRef = useRef(size);

  const scaleSceneToNewSize = (oldSize, newSize) => {
    const sx = newSize.width / oldSize.width;
    const sy = newSize.height / oldSize.height;
    setCharges((prev) => prev.map((c) => ({ ...c, x: c.x * sx, y: c.y * sy })));
    const t = testChargeRef.current;
    testChargeRef.current = { ...t, x: t.x * sx, y: t.y * sy };
  };

  useEffect(() => {
    const update = () => {
      const newSize = computeSize();
      const old = prevSizeRef.current;
      if (newSize.width !== old.width || newSize.height !== old.height) {
        setSize(newSize);
        scaleSceneToNewSize(old, newSize);
        prevSizeRef.current = newSize;
      }
    };
    update();
    const parent = canvasRef.current?.parentElement;
    let ro;
    if (parent && "ResizeObserver" in window) {
      ro = new ResizeObserver(update);
      ro.observe(parent);
    }
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      if (ro) ro.disconnect();
    };
  }, []);

  // -------- Presets relative to size --------
  const monopoleConfig = (W, H) => [{ x: 0.5 * W, y: 0.5 * H, q: 1e-6 }];
  const dipoleConfig = (W, H) => [
    { x: 0.35 * W, y: 0.5 * H, q: 1e-6 },
    { x: 0.65 * W, y: 0.5 * H, q: -1e-6 },
  ];
  const capacitorConfig = (W, H) => {
    const rows = 5;
    const ys = Array.from({ length: rows }, (_, i) => ((i + 1) / (rows + 1)) * H);
    const leftX = 0.25 * W, rightX = 0.75 * W;
    const leftPlate = ys.map((y) => ({ x: leftX, y, q: 1e-6 }));
    const rightPlate = ys.map((y) => ({ x: rightX, y, q: -1e-6 }));
    return [...leftPlate, ...rightPlate];
  };

  // -------- State --------
  const [configuration, setConfiguration] = useState("dipole");
  const [charges, setCharges] = useState(() => dipoleConfig(size.width, size.height));
  const [draggingChargeIndex, setDraggingChargeIndex] = useState(null);
  const [draggingTestCharge, setDraggingTestCharge] = useState(false);
  const [animateTestCharge, setAnimateTestCharge] = useState(false);

  // Field arrows & lines toggles
  const [showArrows, setShowArrows] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(false);
  const [linesPerMicroC, setLinesPerMicroC] = useState(12);

  // Potential colormap & equipotentials
  const [showColormap, setShowColormap] = useState(true);
  const [showEquipotentials, setShowEquipotentials] = useState(true);
  const [logColors, setLogColors] = useState(true); // log mapping for dynamic range
  const [quality, setQuality] = useState(0.6); // 0.4..1 recommended

  // Cached colormap + contours so we don't recompute in every frame
  const colorCacheRef = useRef({ imageBitmap: null, w: 0, h: 0 });
  const contourCacheRef = useRef({ paths: [], w: 0, h: 0 });

  const initialTestChargeFromSize = (W, H) => ({ x: 0.5 * W, y: 0.33 * H, vx: 0, vy: 0, q: 1e-8, m: 1e-6 });
  const testChargeRef = useRef(initialTestChargeFromSize(size.width, size.height));

  const accelerationScale = 10000;

  // Helpers
  const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const computeField = (x, y, localCharges = charges) => {
    let Ex = 0, Ey = 0;
    for (const c of localCharges) {
      const dx = x - c.x, dy = y - c.y;
      const r2 = dx * dx + dy * dy + 25; // soften singularity (5 px core)
      const r = Math.sqrt(r2);
      const E = k * c.q / r2;
      Ex += E * (dx / r);
      Ey += E * (dy / r);
    }
    return { Ex, Ey };
  };

  const computePotential = (x, y, localCharges = charges) => {
    // V = k Σ q / r  (softened with 5 px core to avoid infinities)
    let V = 0;
    for (const c of localCharges) {
      const dx = x - c.x, dy = y - c.y;
      const r = Math.hypot(dx, dy);
      const rSoft = Math.sqrt(r * r + 25); // soften with same 5 px core
      V += (k * c.q) / rSoft;
    }
    return V;
  };

  // --- Field lines helpers ---
  const norm2 = (x, y) => { const m = Math.hypot(x, y) || 1e-12; return [x / m, y / m]; };
  const distToAnyCharge = (x, y, localCharges = charges) => localCharges.reduce((d, c) => Math.min(d, Math.hypot(x - c.x, y - c.y)), Infinity);

  // --- RK4 streamline integrator with adaptive step on curvature ---
  const traceFieldLine = (ctx, x0, y0, dir, baseStepPx, maxSteps) => {
    let x = x0, y = y0;
    ctx.beginPath();
    ctx.moveTo(x, y);

    const fieldUnit = (X, Y) => {
      const { Ex, Ey } = computeField(X, Y);
      let [ux, uy] = norm2(Ex, Ey);
      return [ux * dir, uy * dir];
    };

    let [uxPrev, uyPrev] = fieldUnit(x, y);

    for (let i = 0; i < maxSteps; i++) {
      const dNear = distToAnyCharge(x, y);
      const nearFactor = Math.max(0.25, Math.min(1, (dNear - 8) / 40));
      let h = baseStepPx * nearFactor;

      const [k1x, k1y] = fieldUnit(x, y);
      const [k2x, k2y] = fieldUnit(x + 0.5 * h * k1x, y + 0.5 * h * k1y);
      const [k3x, k3y] = fieldUnit(x + 0.5 * h * k2x, y + 0.5 * h * k2y);
      const [k4x, k4y] = fieldUnit(x + h * k3x, y + h * k3y);

      let dx = (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      let dy = (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);

      let [uxCurr, uyCurr] = norm2(dx, dy);
      if (uxCurr * uxPrev + uyCurr * uyPrev < 0) {
        h *= 0.5;
        const [k1x2, k1y2] = fieldUnit(x, y);
        const [k2x2, k2y2] = fieldUnit(x + 0.5 * h * k1x2, y + 0.5 * h * k1y2);
        const [k3x2, k3y2] = fieldUnit(x + 0.5 * h * k2x2, y + 0.5 * h * k2y2);
        const [k4x2, k4y2] = fieldUnit(x + h * k3x2, y + h * k3y2);
        dx = (h / 6) * (k1x2 + 2 * k2x2 + 2 * k3x2 + k4x2);
        dy = (h / 6) * (k1y2 + 2 * k2y2 + 2 * k3y2 + k4y2);
        [uxCurr, uyCurr] = norm2(dx, dy);
      }

      x += dx; y += dy;
      ctx.lineTo(x, y);
      [uxPrev, uyPrev] = [uxCurr, uyCurr];

      if (x < 0 || x > size.width || y < 0 || y > size.height) break;
      if (distToAnyCharge(x, y) < 10) break;
    }
    ctx.stroke();
  };

  const drawFieldLines = (ctx) => {
    if (!showFieldLines) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.5)";

    const baseStepPx = Math.max(0.75, Math.min(size.width, size.height) / 500);
    const maxSteps = 2000;
    const r0 = 10;

    for (const c of charges) {
      const muC = Math.abs(c.q) / 1e-6;
      const N = Math.max(4, Math.min(24, Math.round(linesPerMicroC * muC)));
      for (let k = 0; k < N; k++) {
        const theta = (2 * Math.PI * k) / N;
        const sx = c.x + r0 * Math.cos(theta);
        const sy = c.y + r0 * Math.sin(theta);
        const dir = c.q >= 0 ? +1 : -1; // from +q outward, into –q
        traceFieldLine(ctx, sx, sy, dir, baseStepPx, maxSteps);
      }
    }
  };

  // --- Potential colormap generation (cached) ---
  const regenerateColormapAndContours = useMemo(() => {
    return () => {
      if (!showColormap && !showEquipotentials) return; // nothing to do
      const W = Math.max(64, Math.round(size.width * quality));
      const H = Math.max(64, Math.round(size.height * quality));

      // Sample potential on a coarse grid for speed
      const V = new Float32Array(W * H);
      let vMin = Infinity, vMax = -Infinity;
      for (let j = 0; j < H; j++) {
        const y = (j / (H - 1)) * size.height;
        for (let i = 0; i < W; i++) {
          const x = (i / (W - 1)) * size.width;
          const v = computePotential(x, y);
          V[j * W + i] = v;
          if (v < vMin) vMin = v;
          if (v > vMax) vMax = v;
        }
      }

      // Symmetric range about 0 for diverging colors; robust clip (winsorize)
      const absVals = [];
      for (let s = 0; s < V.length; s += Math.max(1, (W * H) / 5000)) absVals.push(Math.abs(V[s]));
      absVals.sort((a, b) => a - b);
      const qIdx = Math.max(0, Math.min(absVals.length - 1, Math.floor(absVals.length * 0.98)));
      const Vabs = absVals[qIdx] || Math.max(Math.abs(vMin), Math.abs(vMax)) || 1;
      const Vscale = Vabs; // map [-Vscale, Vscale] to [-1, 1]

      // Build ImageData (offscreen)
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const ictx = off.getContext("2d");
      const img = ictx.createImageData(W, H);
      const data = img.data;

      const logAlpha = 1 / (Vscale * 0.2 + 1e-9); // mapping strength
      const logDen = Math.log(1 + logAlpha * Vscale);

      let p = 0;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          let v = V[j * W + i];
          // Normalize and optionally log-map, preserving sign
          let t = clamp(v / Vscale, -1, 1);
          if (logColors) {
            const sgn = Math.sign(t);
            const a = Math.log(1 + logAlpha * Math.abs(t) * Vscale) / logDen; // 0..1
            t = sgn * a; // -1..1
          }
          const [r, g, b] = divergingColor(t);
          data[p++] = r; data[p++] = g; data[p++] = b; data[p++] = 255;
        }
      }
      ictx.putImageData(img, 0, 0);

      // Cache imageBitmap for fast drawImage scaling
      off.toBlob((blob) => {
        if (!blob) return;
        createImageBitmap(blob).then((bmp) => {
          colorCacheRef.current = { imageBitmap: bmp, w: W, h: H };
        });
      });

      // Equipotential contours via marching squares (precomputed Path2D list)
      if (showEquipotentials) {
        const levels = buildFixedContourLevels(size.width, size.height, 9); // symmetric ± fixed levels (stable)
        const paths = buildEquipotentialPathsWithTracer(levels, V, W, H);
        contourCacheRef.current = { paths, w: W, h: H };
      } else {
        contourCacheRef.current = { paths: [], w: W, h: H };
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, charges, quality, logColors, showColormap, showEquipotentials]);

  // Regenerate when dependencies change
  useEffect(() => {
    // Throttle regeneration a bit while dragging to reduce flicker
    const isDragging = draggingTestCharge || draggingChargeIndex !== null;
    const delay = isDragging ? 80 : 0; // ms
    const id = setTimeout(() => {
      requestAnimationFrame(regenerateColormapAndContours);
    }, delay);
    return () => clearTimeout(id);
  }, [regenerateColormapAndContours, draggingTestCharge, draggingChargeIndex]);

  // Config change
  const handleConfigurationChange = (e) => {
    const newConfig = e.target.value;
    setConfiguration(newConfig);
    const { width: W, height: H } = size;
    if (newConfig === "dipole") setCharges(dipoleConfig(W, H));
    else if (newConfig === "capacitor") setCharges(capacitorConfig(W, H));
    else if (newConfig === "monopole") setCharges(monopoleConfig(W, H));
    testChargeRef.current = initialTestChargeFromSize(W, H);
    setAnimateTestCharge(false);
  };

  // Mouse handlers (with Ctrl-click delete)
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getMousePos(canvas, e);

    // Never delete the test charge; prioritize dragging it
    const dxT = x - testChargeRef.current.x;
    const dyT = y - testChargeRef.current.y;
    if (Math.hypot(dxT, dyT) < 8) { setDraggingTestCharge(true); return; }

    const idx = charges.findIndex((c) => Math.hypot(x - c.x, y - c.y) < 10);

    // Ctrl-click (or Cmd on Mac) deletes a source charge
    if (idx !== -1 && (e.ctrlKey || e.metaKey)) {
      setCharges((prev) => prev.filter((_, i) => i !== idx));
      return;
    }

    if (idx !== -1) {
      setDraggingChargeIndex(idx);
    } else {
      const newCharge = { x, y, q: e.shiftKey ? -1e-6 : 1e-6 };
      setCharges((prev) => [...prev, newCharge]);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getMousePos(canvas, e);
    if (draggingTestCharge) {
      testChargeRef.current = { ...testChargeRef.current, x, y, vx: 0, vy: 0 };
    } else if (draggingChargeIndex !== null) {
      setCharges((prev) => {
        const next = [...prev];
        next[draggingChargeIndex] = { ...next[draggingChargeIndex], x, y };
        return next;
      });
    }
  };

  const handleMouseUp = () => { setDraggingTestCharge(false); setDraggingChargeIndex(null); };

  const resetSimulation = () => {
    const { width: W, height: H } = size;
    if (configuration === "dipole") setCharges(dipoleConfig(W, H));
    else if (configuration === "capacitor") setCharges(capacitorConfig(W, H));
    else if (configuration === "monopole") setCharges(monopoleConfig(W, H));
    testChargeRef.current = initialTestChargeFromSize(W, H);
    setAnimateTestCharge(false);
  };

  // Bind events to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [draggingTestCharge, draggingChargeIndex, charges]);

  // Animation
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    let mounted = true;

    const animate = (time) => {
      if (!mounted) return;
      const canvas = canvasRef.current;
      if (!canvas) { animationFrameId = requestAnimationFrame(animate); return; }

      const rawDt = (time - lastTime) / 1000; const dt = Math.min(rawDt, 0.033); lastTime = time;
      const { width, height } = size;

      // HiDPI/crisp
      if (canvas.width !== width || canvas.height !== height) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Draw potential colormap (cached image)
      if (showColormap && colorCacheRef.current.imageBitmap) {
        ctx.drawImage(colorCacheRef.current.imageBitmap, 0, 0, width, height);
      }

      // Equipotential paths (draw over the colormap)
      if (showEquipotentials && contourCacheRef.current.paths.length) {
        ctx.save();
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = "rgba(17,24,39,0.7)";
        for (const p of contourCacheRef.current.paths) ctx.stroke(p);
        ctx.restore();
      }

      // Field arrows
      if (showArrows) {
        const spacing = Math.max(20, Math.round(Math.min(width, height) / 20));
        const arrowLength = 15;
        const opacityScale = 0.01;
        ctx.lineWidth = 2;
        for (let x = spacing; x < width; x += spacing) {
          for (let y = spacing; y < height; y += spacing) {
            const { Ex, Ey } = computeField(x, y);
            const E_mag = Math.hypot(Ex, Ey);
            const angle = Math.atan2(Ey, Ex);
            const toX = x + arrowLength * Math.cos(angle);
            const toY = y + arrowLength * Math.sin(angle);
            ctx.strokeStyle = `rgba(0,0,0,${Math.min(1, E_mag * 0.01)})`;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(toX, toY); ctx.stroke();
          }
        }
      }

      // Optional field lines overlay
      drawFieldLines(ctx);

      // Charges
      charges.forEach((c) => {
        ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = c.q > 0 ? "red" : "blue"; ctx.fill();
        ctx.strokeStyle = "#000"; ctx.stroke();
      });

      // Test charge (integrate if animating)
      let { x, y, vx, vy, q, m } = testChargeRef.current;
      if (animateTestCharge && !draggingTestCharge) {
        const { Ex, Ey } = computeField(x, y);
        const ax = (q / m) * Ex * accelerationScale;
        const ay = (q / m) * Ey * accelerationScale;
        vx += ax * dt; vy += ay * dt; x += vx * dt; y += vy * dt;
        if (x < 0 || x > size.width || y < 0 || y > size.height) {
          setAnimateTestCharge(false);
        } else {
          testChargeRef.current = { x, y, vx, vy, q, m };
        }
      }
      ctx.beginPath(); ctx.arc(testChargeRef.current.x, testChargeRef.current.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "green"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.stroke();

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => { mounted = false; cancelAnimationFrame(animationFrameId); };
  }, [charges, animateTestCharge, draggingTestCharge, showFieldLines, linesPerMicroC, size, showColormap, showArrows, showEquipotentials]);

  // UI
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "0.5rem", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "center" }}>
        <label htmlFor="configuration">Select Configuration:</label>
        <select id="configuration" value={configuration} onChange={handleConfigurationChange}>
          <option value="monopole">Monopole</option>
          <option value="dipole">Dipole</option>
          <option value="capacitor">Capacitor Plates</option>
        </select>

        <label style={{ marginLeft: 12 }}>
          <input type="checkbox" checked={showColormap} onChange={(e) => setShowColormap(e.target.checked)} /> Show potential colormap
        </label>
        <label>
          <input type="checkbox" checked={showEquipotentials} onChange={(e) => setShowEquipotentials(e.target.checked)} /> Equipotential lines
        </label>
        <label>
          <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} /> Field arrows
        </label>
        <label>
          <input type="checkbox" checked={showFieldLines} onChange={(e) => setShowFieldLines(e.target.checked)} /> Streamlines
        </label>

        <label style={{ marginLeft: 8 }}>
          Colormap quality
          <input type="range" min="0.4" max="1" step="0.05" value={quality} onChange={(e) => setQuality(+e.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={logColors} onChange={(e) => setLogColors(e.target.checked)} /> Log color scale
        </label>
      </div>

      {/* Responsive, centered canvas */}
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          cursor: "pointer",
          maxWidth: "100%",
          height: "auto",
          display: "block",
          marginInline: "auto",
          touchAction: "none",
          background: "#fff",
        }}
      />

      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={resetSimulation} className="btn btn-secondary">Reset Simulation</button>
        <button onClick={() => setAnimateTestCharge(true)} disabled={animateTestCharge} style={{ marginLeft: 8 }} className="btn">
          {animateTestCharge ? "Test Charge Animating" : "Start Test Charge Animation"}
        </button>
      </div>

      <p style={{ marginTop: "0.5rem" }}>
        Click to add a charge (Shift = negative). Drag to move. <strong>Ctrl-click</strong> (or ⌘-click) a charge to remove it. Drag the green test charge to reposition it.
      </p>
    </div>
  );

  // ===== Helper fns below =====

  function buildContourLevels(Vmax, nPerSide) {
    // symmetric levels around 0, mildly log-spaced for visual balance
    const levels = [];
    for (let i = 1; i <= nPerSide; i++) {
      const t = i / (nPerSide + 1); // 0..1 (exclude 0)
      const w = Math.pow(t, 1.2);   // bias toward low values
      const v = w * Vmax;
      levels.push(+v, -v);
    }
    return levels;
  }

  function buildContourPathFromGrid(V, W, H, level) {
    const path = new Path2D();
    // marching squares over W x H scalar field V (row-major)
    const ix = (i, j) => V[j * W + i];

    for (let j = 0; j < H - 1; j++) {
      for (let i = 0; i < W - 1; i++) {
        const v00 = ix(i, j);
        const v10 = ix(i + 1, j);
        const v11 = ix(i + 1, j + 1);
        const v01 = ix(i, j + 1);
        const mask = (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0);
        if (mask === 0 || mask === 15) continue;

        // Interpolate along edges
        const f = (a, b) => (level - a) / (b - a + 1e-12);
        const xL = i;       const xR = i + 1;
        const yT = j;       const yB = j + 1;

        const pt = [];
        switch (mask) {
          case 1: case 14: pt.push([xL, yT + f(v00, v01)], [xL + f(v00, v10), yT]); break;
          case 2: case 13: pt.push([xL + f(v10, v11), yT], [xR, yT + f(v10, v00)]); break;
          case 3: case 12: pt.push([xL, yT + f(v00, v01)], [xR, yT + f(v10, v11)]); break;
          case 4: case 11: pt.push([xR, yT + f(v11, v10)], [xL + f(v11, v01), yB]); break;
          case 5:          pt.push([xL, yT + f(v00, v01)], [xL + f(v00, v10), yT], [xR, yT + f(v11, v10)], [xL + f(v11, v01), yB]); break;
          case 6: case 9:  pt.push([xL + f(v10, v11), yT], [xL + f(v00, v10), yT], [xL + f(v11, v01), yB], [xL + f(v00, v01), yB]); break;
          case 7: case 8:  pt.push([xL, yT + f(v01, v11)], [xL + f(v00, v10), yT]); break;
        }
        // Each pair of points is a segment. Convert grid coords to canvas px
        for (let k = 0; k < pt.length; k += 2) {
          const [ax, ay] = pt[k];
          const [bx, by] = pt[k + 1];
          const xA = (ax / (W - 1)) * size.width;
          const yA = (ay / (H - 1)) * size.height;
          const xB = (bx / (W - 1)) * size.width;
          const yB = (by / (H - 1)) * size.height;
          path.moveTo(xA, yA); path.lineTo(xB, yB);
        }
      }
    }
    return path;
  }
  function buildFixedContourLevels(W, H, nPerSide) {
    // Build *absolute* potential levels for contours that don't jitter as the scene changes.
    // Reference: 1 µC at a range of radii between a small core and ~40% of the viewport.
    const qRef = 1e-6;            // 1 microcoulomb
    const rCore = 5;              // same softening used in potential/field (pixels)
    const rMin = 12;              // just outside the core
    const rMax = 0.42 * Math.min(W, H);
    const levels = [];
    for (let i = 1; i <= nPerSide; i++) {
      const t = i / (nPerSide + 1);             // (0,1)
      const r = rMin * Math.pow(rMax / rMin, t); // log-spaced radii
      const V = (k * qRef) / Math.sqrt(r * r + rCore * rCore);
      levels.push(+V, -V); // symmetric ±V
    }
    return levels;
  }
  // --- Hybrid equipotential tracer helpers (seed with marching squares, trace ⟂ to E, project to V0) ---
  function buildEquipotentialPathsWithTracer(levels, Vgrid, W, H) {
    const paths = [];
    const cellSize = 18; // coarse occupancy grid size in px
    const keyCell = (x, y) => `${Math.floor(x / cellSize)}|${Math.floor(y / cellSize)}`;

    for (const V0 of levels) {
      const seeds = marchingSquaresSeeds(Vgrid, W, H, V0);
      const occupied = new Set(); // cells already covered by a traced loop at this level

      for (const s of seeds) {
        // Project seed to canvas & onto the V=V0 iso; skip if its cell is already covered
        const sx = (s.x / (W - 1)) * size.width;
        const sy = (s.y / (H - 1)) * size.height;
        let [px, py] = projectToIso(sx, sy, V0);
        const startKey = keyCell(px, py);
        if (occupied.has(startKey)) continue;

        const traced = traceEquipotentialFromSeed(V0, s.x, s.y, W, H, 1);
        if (!traced) continue;

        // Mark all coarse cells touched by the loop as occupied
        for (const [ux, uy] of traced.samples) occupied.add(keyCell(ux, uy));
        paths.push(traced.path);
      }
    }
    return paths;
  }

  function traceEquipotentialFromSeed(V0, x0grid, y0grid, W, H, dir = 1) {
    const x0 = (x0grid / (W - 1)) * size.width;
    const y0 = (y0grid / (H - 1)) * size.height;
    let [x, y] = projectToIso(x0, y0, V0);

    const path = new Path2D();
    path.moveTo(x, y);

    const samples = [[x, y]]; // coarse coverage samples
    const maxSteps = 5000;
    const rCore = 10; // px avoid singularities
    const closeTol = 3;
    const minLoop = 50;

    let step = Math.max(0.9, Math.min(size.width, size.height) / 420);
    const rk = (X, Y) => {
      const { Ex, Ey } = computeField(X, Y);
      let tx = dir * Ey, ty = dir * -Ex; // ⟂ to E
      const m = Math.hypot(tx, ty) || 1e-9; return [tx / m, ty / m];
    };

    const clampIn = (X, Y) => [
      Math.max(0, Math.min(size.width, X)),
      Math.max(0, Math.min(size.height, Y)),
    ];

    const xStart = x, yStart = y;
    for (let i = 0; i < maxSteps; i++) {
      const [k1x, k1y] = rk(x, y);
      const [k2x, k2y] = rk(x + 0.5 * step * k1x, y + 0.5 * step * k1y);
      const [k3x, k3y] = rk(x + 0.5 * step * k2x, y + 0.5 * step * k2y);
      const [k4x, k4y] = rk(x + step * k3x, y + step * k3y);
      let xn = x + (step / 6) * (k1x + 2*k2x + 2*k3x + k4x);
      let yn = y + (step / 6) * (k1y + 2*k2y + 2*k3y + k4y);

      ;[xn, yn] = projectToIso(xn, yn, V0);
      ;[xn, yn] = clampIn(xn, yn);

      const dNear = distToAnyCharge(xn, yn);
      const sFac = Math.max(0.4, Math.min(1.2, (dNear - 8) / 36));
      step *= 0.72 + 0.28 * sFac;

      if (xn <= 0 || xn >= size.width || yn <= 0 || yn >= size.height) break;
      if (dNear < rCore) break;

      path.lineTo(xn, yn);
      if (i % 4 === 0) samples.push([xn, yn]);
      x = xn; y = yn;
      if (i > minLoop && Math.hypot(x - xStart, y - yStart) < closeTol) { path.closePath(); break; }
    }

    if (samples.length < 8) return null; // too tiny/degenerate
    return { path, samples };
  }

  function traceEquipotentialFromSeed(V0, x0grid, y0grid, W, H, dir = 1) {
    const x0 = (x0grid / (W - 1)) * size.width;
    const y0 = (y0grid / (H - 1)) * size.height;
    let [x, y] = projectToIso(x0, y0, V0);

    const path = new Path2D();
    path.moveTo(x, y);

    const maxSteps = 4000;
    const rCore = 10; // px avoid singularities
    const closeTol = 3;
    const minLoop = 50;

    let step = Math.max(0.9, Math.min(size.width, size.height) / 420);
    const rk = (X, Y) => {
      const { Ex, Ey } = computeField(X, Y);
      let tx = dir * Ey, ty = dir * -Ex; // ⟂ to E
      const m = Math.hypot(tx, ty) || 1e-9; return [tx / m, ty / m];
    };

    const clampIn = (X, Y) => [
      Math.max(0, Math.min(size.width, X)),
      Math.max(0, Math.min(size.height, Y)),
    ];

    const xStart = x, yStart = y;
    for (let i = 0; i < maxSteps; i++) {
      const [k1x, k1y] = rk(x, y);
      const [k2x, k2y] = rk(x + 0.5 * step * k1x, y + 0.5 * step * k1y);
      const [k3x, k3y] = rk(x + 0.5 * step * k2x, y + 0.5 * step * k2y);
      const [k4x, k4y] = rk(x + step * k3x, y + step * k3y);
      let xn = x + (step / 6) * (k1x + 2*k2x + 2*k3x + k4x);
      let yn = y + (step / 6) * (k1y + 2*k2y + 2*k3y + k4y);

      ;[xn, yn] = projectToIso(xn, yn, V0);
      ;[xn, yn] = clampIn(xn, yn);

      const dNear = distToAnyCharge(xn, yn);
      const sFac = Math.max(0.35, Math.min(1.25, (dNear - 8) / 36));
      step *= 0.7 + 0.3 * sFac;

      if (xn <= 0 || xn >= size.width || yn <= 0 || yn >= size.height) break;
      if (dNear < rCore) break;

      path.lineTo(xn, yn);
      x = xn; y = yn;
      if (i > minLoop && Math.hypot(x - xStart, y - yStart) < closeTol) { path.closePath(); break; }
    }
    return path;
  }

  function projectToIso(x, y, V0) {
    const Vhere = computePotential(x, y);
    const { Ex, Ey } = computeField(x, y);
    const gx = -Ex, gy = -Ey; // ∇V = -E
    const g2 = gx*gx + gy*gy + 1e-9;
    const t = (Vhere - V0) / g2;
    return [x - t * gx, y - t * gy];
  }

  function marchingSquaresSeeds(V, W, H, level) {
    // Return *sparse* seeds by emitting only left & top edge crossings.
    const seeds = [];
    const at = (i, j) => V[j * W + i];
    for (let j = 0; j < H - 1; j++) {
      for (let i = 0; i < W - 1; i++) {
        const v00 = at(i, j), v10 = at(i + 1, j), v11 = at(i + 1, j + 1), v01 = at(i, j + 1);
        const mask = (v00 > level ? 1 : 0) | (v10 > level ? 2 : 0) | (v11 > level ? 4 : 0) | (v01 > level ? 8 : 0);
        if (mask === 0 || mask === 15) continue;
        const lerp01 = (a, b) => (level - a) / (b - a + 1e-12);
        const xL = i, xR = i + 1, yT = j, yB = j + 1;
        // left edge
        if ((mask & 1) !== (mask & 8)) seeds.push({ x: xL, y: yT + lerp01(v00, v01) });
        // top edge
        if ((mask & 1) !== (mask & 2)) seeds.push({ x: xL + lerp01(v00, v10), y: yT });
      }
    }
    return seeds;
  }
    }
    return seeds;
  }

  function divergingColor(t) {
    // t in [-1,1]; -1 deep blue, 0 white, +1 deep red
    t = Math.max(-1, Math.min(1, t));
    const w = 1 - Math.abs(t); // whiteness toward center
    const to255 = (x) => Math.max(0, Math.min(255, Math.round(x)));

    // endpoints
    const neg = [30, 90, 200];  // blue
    const pos = [230, 60, 50];  // red

    const base = t < 0 ? neg : pos;
    const r = base[0] * Math.abs(t) + 255 * w;
    const g = base[1] * Math.abs(t) + 255 * w;
    const b = base[2] * Math.abs(t) + 255 * w;
    return [to255(r), to255(g), to255(b)];
  }
};

export default ElectricFieldSimulation;
