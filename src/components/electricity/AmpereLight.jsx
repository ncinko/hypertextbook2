// src/components/AmpereLight.jsx
import React, { useEffect, useRef, useState } from "react";

const MU0 = 4 * Math.PI * 1e-7; // T·m/A
const METER_PER_PIXEL = 0.01;   // 1 px ≈ 1 cm

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function formatLineIntegral(value) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1) return `${value.toExponential(3)} T·m`;
  if (abs >= 1e-3) return `${(value * 1e3).toFixed(3)} mT·m`;
  if (abs >= 1e-6) return `${(value * 1e6).toFixed(3)} µT·m`;
  return `${(value * 1e9).toFixed(3)} nT·m`;
}

// B-field from straight currents (along ±z)
function computeFieldAtPoint(px, py, sources) {
  let Bx = 0;
  let By = 0;

  for (const s of sources) {
    const dx = px - s.x;
    const dy = py - s.y;
    const rPix = Math.hypot(dx, dy);
    if (rPix < 6) continue; // avoid singularity very close to wire

    const rMeters = rPix * METER_PER_PIXEL;
    const I = s.I; // can be + or -
    const sign = I >= 0 ? 1 : -1;
    const magnitude = (MU0 * Math.abs(I)) / (2 * Math.PI * rMeters);

    // Tangential unit vector adjusted for screen coords (y down):
    // +I (out of screen) => B circulates CCW visually (right-hand rule).
    const tx = dy / rPix;
    const ty = -dx / rPix;

    Bx += sign * magnitude * tx;
    By += sign * magnitude * ty;
  }

  return { Bx, By };
}

const dist2 = (x1, y1, x2, y2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
};

export default function Ampere() {
  const canvasRef = useRef(null);

  const computeSize = () => {
    const parent = canvasRef.current?.parentElement;
    const width = parent
      ? clamp(parent.getBoundingClientRect().width, 320, 900)
      : clamp(window.innerWidth - 48, 320, 900);
    return { width: Math.round(width), height: Math.round(width * 0.7) };
  };

  const [size, setSize] = useState({ width: 600, height: 420 });

  const [sources, setSources] = useState([
    { id: 1, x: 300, y: 210, I: 1 }, // default +1 A near center
  ]);
  const [nextId, setNextId] = useState(2);

  const [mode, setMode] = useState("move"); // "move" | "addOut" | "addIn" | "drawPath"
  const [pathPoints, setPathPoints] = useState([]);

  const isDrawingPathRef = useRef(false);
  const draggingSourceRef = useRef(null);

  const fieldGridRef = useRef([]); // array of {x,y,Bx,By,Bmag}
  const [integrating, setIntegrating] = useState(false);
  const [integrationIndex, setIntegrationIndex] = useState(-1);
  const [lineIntegral, setLineIntegral] = useState(null);
  const [highlightGridIndex, setHighlightGridIndex] = useState(-1);
  const pathStepsRef = useRef([]); // steps for integration
  const frameCounterRef = useRef(0);

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => setSize(computeSize());
    handleResize();

    window.addEventListener("resize", handleResize);

    const parent = canvasRef.current?.parentElement;
    let observer;
    if (parent && "ResizeObserver" in window) {
      observer = new ResizeObserver(handleResize);
      observer.observe(parent);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
    };
  }, []);

  // Main draw effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width: cssWidth, height: cssHeight } = size;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Build field grid (for visualization)
    const margin = 30;
    const spacing = 40;
    const grid = [];
    let maxB = 0;

    for (let y = margin; y <= cssHeight - margin; y += spacing) {
      for (let x = margin; x <= cssWidth - margin; x += spacing) {
        const { Bx, By } = computeFieldAtPoint(x, y, sources);
        const Bmag = Math.hypot(Bx, By);
        if (Bmag > maxB) maxB = Bmag;
        grid.push({ x, y, Bx, By, Bmag });
      }
    }

    fieldGridRef.current = grid;

    // Faint background grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)"; // slate-400-ish
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    for (let y = margin; y <= cssHeight - margin; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(cssWidth - margin, y);
      ctx.stroke();
    }
    for (let x = margin; x <= cssWidth - margin; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, cssHeight - margin);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw field vectors
    function drawArrow(baseX, baseY, vx, vy, strength, highlighted) {
      if (!isFinite(vx) || !isFinite(vy)) return;
      const len = Math.hypot(vx, vy);
      if (len === 0) return;

      const minLen = 10;
      const maxLen = 28;
      let L = minLen + (maxLen - minLen) * strength;

      let strokeStyle;
      let lineWidth;
      let headSize;
      if (highlighted) {
        // Strong highlight: pale golden, bigger
        L = maxLen + 10;
        strokeStyle = "rgba(202, 138, 4, 0.95)"; // amber-700-ish
        lineWidth = 3.4;
        headSize = 11;
      } else {
        const alpha = 0.25 + 0.7 * strength;
        // calm blue
        strokeStyle = `rgba(37, 99, 235, ${alpha})`; // blue-600 with alpha
        lineWidth = 1.7;
        headSize = 7;
      }

      const ux = vx / len;
      const uy = vy / len;
      const tipX = baseX + ux * L;
      const tipY = baseY + uy * L;

      ctx.strokeStyle = strokeStyle;
      ctx.fillStyle = strokeStyle;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      const angle = Math.atan2(uy, ux);
      const a1 = angle + Math.PI * 0.8;
      const a2 = angle - Math.PI * 0.8;

      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX + headSize * Math.cos(a1),
        tipY + headSize * Math.sin(a1)
      );
      ctx.lineTo(
        tipX + headSize * Math.cos(a2),
        tipY + headSize * Math.sin(a2)
      );
      ctx.closePath();
      ctx.fill();
    }

    const maxNonzeroB = maxB || 1e-12;
    grid.forEach((g, idx) => {
      const t = clamp(g.Bmag / maxNonzeroB, 0, 1);
      const highlighted = idx === highlightGridIndex;
      drawArrow(g.x, g.y, g.Bx, g.By, t, highlighted);
    });

    // Draw current sources
    for (const s of sources) {
      const radius = 10;

      // outer ring
      ctx.beginPath();
      ctx.fillStyle = "#e5f0ff"; // very light blue
      ctx.strokeStyle = "#1d4ed8"; // blue-700
      ctx.lineWidth = 2;
      ctx.arc(s.x, s.y, radius + 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      // inner disc
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(s.x, s.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2;

      if (s.I >= 0) {
        // dot for current out of page
        ctx.beginPath();
        ctx.fillStyle = "#1d4ed8";
        ctx.arc(s.x, s.y, 3, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        // cross for current into page
        ctx.beginPath();
        ctx.moveTo(s.x - 4, s.y - 4);
        ctx.lineTo(s.x + 4, s.y + 4);
        ctx.moveTo(s.x - 4, s.y + 4);
        ctx.lineTo(s.x + 4, s.y - 4);
        ctx.stroke();
      }
    }

    // Draw full Amperian path
    if (pathPoints.length > 1) {
      ctx.strokeStyle = integrating ? "#15803d" : "#0f172a"; // green-700 or slate-900
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
    }

    // Highlight current finite path segment during integration
    if (integrating || integrationIndex >= 0) {
      const steps = pathStepsRef.current;
      if (
        steps &&
        steps.length > 0 &&
        integrationIndex >= 0 &&
        integrationIndex < steps.length
      ) {
        const step = steps[integrationIndex];
        const { startX, startY, endX, endY } = step;

        ctx.strokeStyle = "rgba(202, 138, 4, 0.95)"; // amber
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const midX = 0.5 * (startX + endX);
        const midY = 0.5 * (startY + endY);
        ctx.fillStyle = "rgba(202, 138, 4, 0.95)";
        ctx.beginPath();
        ctx.arc(midX, midY, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [size, sources, pathPoints, highlightGridIndex, integrating, integrationIndex]);

  function getCanvasCoords(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX ?? (event.touches && event.touches[0]?.clientX);
    const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  }

  // Pointer interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e) => {
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);

      if (mode === "drawPath") {
        isDrawingPathRef.current = true;
        setPathPoints([{ x, y }]);
        return;
      }

      // Try to grab a source
      const hitRadius2 = 20 * 20;
      let hitId = null;
      let hitSource = null;
      for (const s of sources) {
        if (dist2(x, y, s.x, s.y) <= hitRadius2) {
          hitId = s.id;
          hitSource = s;
          break;
        }
      }

      if (hitId != null && mode === "move") {
        draggingSourceRef.current = {
          id: hitId,
          offsetX: x - hitSource.x,
          offsetY: y - hitSource.y,
        };
        return;
      }

      if (mode === "addOut" || mode === "addIn") {
        const sign = mode === "addOut" ? 1 : -1;
        setSources((prev) => [
          ...prev,
          { id: nextId, x, y, I: sign * 1 },
        ]);
        setNextId((id) => id + 1);
      }
    };

    const handlePointerMove = (e) => {
      const { x, y } = getCanvasCoords(e);

      if (isDrawingPathRef.current && mode === "drawPath") {
        setPathPoints((prev) => {
          if (prev.length === 0) return [{ x, y }];
          const last = prev[prev.length - 1];
          const dx = x - last.x;
          const dy = y - last.y;
          if (dx * dx + dy * dy < 4) return prev;
          return [...prev, { x, y }];
        });
        return;
      }

      const drag = draggingSourceRef.current;
      if (drag) {
        setSources((prev) =>
          prev.map((s) =>
            s.id === drag.id
              ? { ...s, x: x - drag.offsetX, y: y - drag.offsetY }
              : s
          )
        );
      }
    };

    const handlePointerUp = () => {
      draggingSourceRef.current = null;
      isDrawingPathRef.current = false;
    };

    canvas.addEventListener("mousedown", handlePointerDown);
    canvas.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    canvas.addEventListener("touchstart", handlePointerDown, { passive: false });
    canvas.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("touchcancel", handlePointerUp);

    return () => {
      canvas.removeEventListener("mousedown", handlePointerDown);
      canvas.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);

      canvas.removeEventListener("touchstart", handlePointerDown);
      canvas.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("touchcancel", handlePointerUp);
    };
  }, [mode, sources, nextId]);

  // Build integration steps (high-res B, coarse grid only for highlighting)
  function buildPathSteps() {
    const pts = pathPoints;
    const grid = fieldGridRef.current;
    if (!pts || pts.length < 2 || !grid || grid.length === 0) return [];

    const steps = [];
    let cumulative = 0;
    const stepSizePx = 12;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const segDx = p2.x - p1.x;
      const segDy = p2.y - p1.y;
      const segLenPix = Math.hypot(segDx, segDy);
      if (segLenPix === 0) continue;

      const nSteps = Math.max(1, Math.round(segLenPix / stepSizePx));
      const dℓxPix = segDx / nSteps;
      const dℓyPix = segDy / nSteps;

      for (let k = 0; k < nSteps; k++) {
        const t0 = k / nSteps;
        const t1 = (k + 1) / nSteps;

        const startX = p1.x + t0 * segDx;
        const startY = p1.y + t0 * segDy;
        const endX = p1.x + t1 * segDx;
        const endY = p1.y + t1 * segDy;

        const sx = 0.5 * (startX + endX);
        const sy = 0.5 * (startY + endY);

        // nearest visual grid vector for highlighting
        let bestIndex = 0;
        let bestDist2 = Infinity;
        for (let gi = 0; gi < grid.length; gi++) {
          const g = grid[gi];
          const d2 = dist2(sx, sy, g.x, g.y);
          if (d2 < bestDist2) {
            bestDist2 = d2;
            bestIndex = gi;
          }
        }

        // accurate B at midpoint
        const { Bx, By } = computeFieldAtPoint(sx, sy, sources);

        const dℓx = dℓxPix * METER_PER_PIXEL;
        const dℓy = dℓyPix * METER_PER_PIXEL;
        const BdotDl = Bx * dℓx + By * dℓy;
        cumulative += BdotDl;

        steps.push({
          sx,
          sy,
          gridIndex: bestIndex,
          BdotDl,
          cumulative,
          startX,
          startY,
          endX,
          endY,
        });
      }
    }

    return steps;
  }

  function startIntegration() {
    if (integrating) return;
    if (pathPoints.length < 2 || sources.length === 0) return;

    const steps = buildPathSteps();
    if (steps.length === 0) return;

    pathStepsRef.current = steps;
    setIntegrating(true);
    setIntegrationIndex(0);
    setLineIntegral(null);
    frameCounterRef.current = 0;

    const framesPerStep = 3; // tweak for speed

    const animate = (currentIndex) => {
      const localSteps = pathStepsRef.current;
      if (!localSteps || localSteps.length === 0) {
        setIntegrating(false);
        setHighlightGridIndex(-1);
        return;
      }

      if (currentIndex >= localSteps.length) {
        const final = localSteps[localSteps.length - 1].cumulative;
        setLineIntegral(final);
        setIntegrating(false);
        setHighlightGridIndex(-1);
        return;
      }

      const { gridIndex, cumulative } = localSteps[currentIndex];
      setHighlightGridIndex(gridIndex);
      setIntegrationIndex(currentIndex);
      setLineIntegral(cumulative);

      frameCounterRef.current += 1;
      const shouldAdvance = frameCounterRef.current % framesPerStep === 0;
      const nextIndex = shouldAdvance ? currentIndex + 1 : currentIndex;

      requestAnimationFrame(() => animate(nextIndex));
    };

    requestAnimationFrame(() => animate(0));
  }

  function resetPath() {
    setPathPoints([]);
    setHighlightGridIndex(-1);
    setIntegrationIndex(-1);
    setLineIntegral(null);
    setIntegrating(false);
    pathStepsRef.current = [];
  }

  function clearCanvas() {
    setSources([]);
    setNextId(1);
    resetPath();
  }

  const totalCurrent = sources.reduce((sum, s) => sum + s.I, 0);

  return (
    <div
      className="mx-auto my-4 p-4 rounded-xl shadow-sm"
      style={{
        width: "100%",
        background: "#f9fafb", // slate-50
        color: "#111827",      // slate-900
        border: "1px solid rgba(209, 213, 219, 0.9)", // gray-300
        boxSizing: "border-box",
      }}
    >
        <p style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "0.95rem" }}>
        Create a current distribution using straight currents into/out of the screen. The grid shows the resulting magnetic field vectors. The integral{" "}
        <span style={{ fontFamily: "serif" }}>∫</span>
        <b> B·dℓ</b> is approximated by finite steps along your chosen path.  
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* Canvas column */}
        <div
          style={{
            flex: "1 1 380px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: size.width,
              height: size.height,
              borderRadius: "0.75rem",
              border: "1px solid rgba(209, 213, 219, 0.9)", // gray-300
              boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
              backgroundColor: "#ffffff",
              cursor:
                mode === "drawPath"
                  ? "crosshair"
                  : mode === "move"
                  ? "grab"
                  : "copy",
              touchAction: "none",
            }}
          />
        </div>

        {/* Controls column */}
        <div style={{ flex: "0 0 260px", fontSize: "0.9rem" }}>
          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(209, 213, 219, 0.9)",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
              Current sources
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMode("addOut")}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border:
                    mode === "addOut"
                      ? "1px solid #2563eb"
                      : "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor:
                    mode === "addOut" ? "rgba(191, 219, 254, 0.85)" : "#ffffff",
                  color: "#1f2937",
                  fontSize: "0.85rem",
                }}
              >
                ⨀ (out)
              </button>
              <button
                type="button"
                onClick={() => setMode("addIn")}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border:
                    mode === "addIn"
                      ? "1px solid #2563eb"
                      : "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor:
                    mode === "addIn" ? "rgba(219, 234, 254, 0.85)" : "#ffffff",
                  color: "#1f2937",
                  fontSize: "0.85rem",
                }}
              >
                ⨂ (in)
              </button>
              <button
                type="button"
                onClick={() => setMode("move")}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border:
                    mode === "move"
                      ? "1px solid #16a34a"
                      : "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor:
                    mode === "move" ? "rgba(187, 247, 208, 0.9)" : "#ffffff",
                  color: "#1f2937",
                  fontSize: "0.85rem",
                }}
              >
                Move
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "0.85rem",
                }}
              >
                Clear
              </button>
            </div>
            <div
              style={{
                marginTop: "0.45rem",
                fontSize: "0.8rem",
                color: "#4b5563",
              }}
            >
              Click on the canvas to place currents. Drag in{" "}
              <span style={{ fontWeight: 600 }}>Move</span> mode to reposition.
            </div>
            <div
              style={{
                marginTop: "0.35rem",
                fontSize: "0.8rem",
                color: "#111827",
              }}
            >
              Total current (signed):{" "}
              <span style={{ fontFamily: "monospace" }}>
                {totalCurrent.toFixed(1)} A
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(209, 213, 219, 0.9)",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
              Amperian path 
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMode("drawPath")}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border:
                    mode === "drawPath"
                      ? "1px solid #2563eb"
                      : "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor:
                    mode === "drawPath" ? "rgba(191, 219, 254, 0.85)" : "#ffffff",
                  color: "#1f2937",
                  fontSize: "0.85rem",
                }}
              >
                Draw path
              </button>
              <button
                type="button"
                onClick={startIntegration}
                disabled={integrating || pathPoints.length < 2 || sources.length === 0}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid #16a34a",
                  backgroundColor: integrating
                    ? "rgba(187, 247, 208, 0.8)"
                    : "#16a34a",
                  color: integrating ? "#065f46" : "#ecfdf3",
                  fontSize: "0.85rem",
                  opacity:
                    pathPoints.length < 2 || sources.length === 0 ? 0.6 : 1,
                  cursor:
                    pathPoints.length < 2 || sources.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {integrating ? "Integrating…" : " ∫ B·dℓ"}
              </button>
              <button
                type="button"
                onClick={resetPath}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(156, 163, 175, 0.9)",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontSize: "0.85rem",
                }}
              >
                Reset
              </button>
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: "#111827",
              }}
            >
              Estimate of{" "}
              <span style={{ fontFamily: "serif" }}>∫ </span>B·dℓ ≈{" "}
              <span style={{ fontFamily: "monospace" }}>
                {lineIntegral == null ? "—" : formatLineIntegral(lineIntegral)}
              </span>
            </div>
            <div
              style={{
                marginTop: "0.3rem",
                fontSize: "0.78rem",
                color: "#4b5563",
              }}
            >
              For a loop encircling a net current{" "}
              <span style={{ fontFamily: "monospace" }}>I</span>, Ampère&apos;s law
              predicts{" "}
              <span style={{ fontFamily: "serif" }}>∮</span>B·dℓ = μ₀ I.
            </div>
          </div>

          <div
            style={{
              padding: "0.6rem 0.8rem",
              borderRadius: "0.75rem",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(209, 213, 219, 0.9)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
              Right-hand rule reminder
            </div>
            <ul
              style={{
                paddingLeft: "1.1rem",
                margin: 0,
                fontSize: "0.8rem",
                listStyleType: "disc",
                color: "#374151",
              }}
            >
              <li style={{ marginBottom: "0.2rem" }}>
                ⨀ (dot): current out of the screen. Curl your fingers to see the{" "}
                <b>B</b> direction (counterclockwise).
              </li>
              <li style={{ marginBottom: "0.2rem" }}>
                ⨂ (cross): current into the screen. Field direction reverses (clockwise).
              </li>
              
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
