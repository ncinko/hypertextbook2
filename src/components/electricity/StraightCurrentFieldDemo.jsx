import React, { useEffect, useRef, useState } from "react";

const MU0 = 4 * Math.PI * 1e-7; // T·m/A

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

function formatTesla(value) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1) return `${value.toFixed(3)} T`;
  if (abs >= 1e-3) return `${(value * 1e3).toFixed(2)} mT`;
  if (abs >= 1e-6) return `${(value * 1e6).toFixed(2)} µT`;
  return `${(value * 1e9).toFixed(1)} nT`;
}

export default function StraightCurrentFieldDemo() {
  const canvasRef = useRef(null);

  // Layout to match Ampère card
  const computeSize = () => {
    const parent = canvasRef.current?.parentElement;
    const width = parent
      ? clamp(parent.getBoundingClientRect().width, 320, 720)
      : clamp(window.innerWidth - 48, 320, 720);
    return { width: Math.round(width), height: Math.round(width * 0.9) };
  };

  const [size, setSize] = useState({ width: 480, height: 430 });

  // Single straight wire (infinite, along ẑ)
  const [current, setCurrent] = useState(2.0); // amps, can be ±
  const [probe, setProbe] = useState({ x: 360, y: 220 });

  const draggingRef = useRef(false);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width: cssWidth, height: cssHeight } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // --- Coordinate system / scaling ---
    // Physical domain: x,y ∈ [-0.5 m, +0.5 m]
    const physicalHalfRange = 0.5; // meters
    const minDim = Math.min(cssWidth, cssHeight);

    // Each grid spacing is 0.1 m, and there are 10 intervals → minDim / 10 px per spacing
    const spacing = minDim / 10; // pixels per 0.1 m
    const metersPerPixel = 0.1 / spacing; // 0.1 m per spacing

    // Center of canvas = (0,0) in physical coordinates
    const centerX = cssWidth * 0.5;
    const centerY = cssHeight * 0.5;

    // --- Background ---
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = "#f9fbff"; // soft blue
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // --- Grid: lines every 0.1 m, from -0.5 m to +0.5 m ---
    ctx.strokeStyle = "#dde5ff";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);

    // k = -5...+5 → -0.5 m ... +0.5 m
    for (let k = -5; k <= 5; k++) {
      const x = centerX + k * spacing;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssHeight);
      ctx.stroke();
    }

    for (let k = -5; k <= 5; k++) {
      const y = centerY + k * spacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssWidth, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // --- Wire at the origin (center of canvas) ---
    const wireX = centerX;
    const wireY = centerY;


    // Wire symbol (dot or cross) at center depending on current direction
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(wireX, wireY, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#1f3b7b";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (current >= 0) {
      // dot: current out of page
      ctx.beginPath();
      ctx.fillStyle = "#1f3b7b";
      ctx.arc(wireX, wireY, 4, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // cross: current into page
      ctx.beginPath();
      ctx.moveTo(wireX - 5, wireY - 5);
      ctx.lineTo(wireX + 5, wireY + 5);
      ctx.moveTo(wireX - 5, wireY + 5);
      ctx.lineTo(wireX + 5, wireY - 5);
      ctx.stroke();
    }

    // --- Compute B at the probe location ---
    const dx = probe.x - wireX;
    const dy = probe.y - wireY;
    let rPix = Math.hypot(dx, dy);
    const minPix = 3; // avoid singularity right on the wire
    if (rPix < minPix) rPix = minPix;

    const rMeters = rPix * metersPerPixel;
    const magnitude = (MU0 * Math.abs(current)) / (2 * Math.PI * rMeters);

    // Tangential direction (screen coords y down); +I => CCW
    const tx = dy / rPix;
    const ty = -dx / rPix;
    const sign = current >= 0 ? 1 : -1;
    const Bx = sign * magnitude * tx;
    const By = sign * magnitude * ty;
    const Bmag = Math.hypot(Bx, By);

    // --- Draw field arrow at probe ---
    function drawArrow(baseX, baseY, vx, vy, strength) {
      if (!isFinite(vx) || !isFinite(vy)) return;
      const len = Math.hypot(vx, vy);
      if (len === 0) return;

      // Larger arrows overall
      const minLen = 20;
      const maxLen = 100;
      const L = minLen + (maxLen - minLen) * strength;

      const headSize = 12;

      const ux = vx / len;
      const uy = vy / len;

      // Arrow tip (apex of the triangle)
      const arrowTipX = baseX + ux * L;
      const arrowTipY = baseY + uy * L;

      // Shaft ends exactly where head begins (no body through the head)
      const shaftEndX = arrowTipX - ux * headSize;
      const shaftEndY = arrowTipY - uy * headSize;

      // Shaft
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(shaftEndX, shaftEndY);
      ctx.stroke();

      // Head (triangle)
      const angle = Math.atan2(uy, ux);
      const a1 = angle + Math.PI * 0.87;
      const a2 = angle - Math.PI * 0.87;

      ctx.beginPath();
      ctx.moveTo(arrowTipX, arrowTipY);
      ctx.lineTo(
        arrowTipX + headSize * Math.cos(a1),
        arrowTipY + headSize * Math.sin(a1)
      );
      ctx.lineTo(
        arrowTipX + headSize * Math.cos(a2),
        arrowTipY + headSize * Math.sin(a2)
      );
      ctx.closePath();
      ctx.fillStyle = "#1d4ed8";
      ctx.fill();
    }

    // scale arrow based on |B| (just relative visual scaling)
    const referenceB = 1e-5; // ~20 µT reference
    const strength = clamp(Bmag / referenceB, 0, 1);

    // probe circle
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    ctx.arc(probe.x, probe.y, 7, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    drawArrow(probe.x, probe.y, Bx, By, strength);

    // Save values onto the canvas so we can read them outside
    canvas._Bmag = Bmag;
    canvas._rPix = Math.hypot(dx, dy); // original distance in pixels
    canvas._metersPerPixel = metersPerPixel;
  }, [size, current, probe]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (e) => {
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);
      draggingRef.current = true;
      setProbe({ x, y });
    };

    const handlePointerMove = (e) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      const { x, y } = getCanvasCoords(e);
      setProbe({ x, y });
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
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
  }, []);

  // Read back B and r from canvas (computed in draw effect)
  const canvas = canvasRef.current;
  const Bmag = canvas?._Bmag ?? NaN;
  const rPix = canvas?._rPix ?? NaN;
  const metersPerPixel = canvas?._metersPerPixel ?? NaN;
  const rMeters = isFinite(rPix) && isFinite(metersPerPixel)
    ? rPix * metersPerPixel
    : NaN;

  return (
    <div
      className="canvas-card"
      style={{
        maxWidth: 760,
        margin: "0 auto",
        display: "grid",
        gap: 12,
        justifyItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        {/* Canvas column */}
        <div
          style={{
            flex: "1 1 360px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: size.width,
              height: size.height,
              borderRadius: 12,
              cursor: "pointer",
              touchAction: "none",
            }}
          />
        </div>

        {/* Controls column */}
        <div style={{ flex: "0 0 260px", minWidth: 260 }}>
          <div
            className="current-field-panel"
            style={{
              width: "100%",
              display: "grid",
              gap: 10,
              justifyItems: "stretch",
            }}
          >
            <div className="current-field-row">
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 4,
                  fontSize: 16,
                  color: "#111827",
                }}
              >
                Magnetic field of a straight wire
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "#495057",
                  lineHeight: 1.4,
                }}
              >
                Drag the probe around the wire and adjust the current to see
                how <strong>B</strong> depends on distance and current.
              </p>
            </div>

            {/* Current slider */}
            <div className="current-field-row">
              <span style={{ fontWeight: 600 }}>Current</span>
              <div style={{ marginTop: 4, marginBottom: 2, fontSize: 13 }}>
                I ={" "}
                <span style={{ fontFamily: "monospace" }}>
                  {current.toFixed(2)} A
                </span>{" "}
                ({current >= 0 ? "⨀ out of page" : "⨂ into page"})
              </div>
              <input
                type="range"
                min={-5}
                max={5}
                step={0.1}
                value={current}
                onChange={(e) => setCurrent(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12.5,
                  color: "#6b7280",
                }}
              >
                Positive = current out of the screen (⨀). Negative = into the screen (⨂).
              </div>
            </div>

            {/* Readout */}
            <div className="current-field-row" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>Measurement at probe</span>
              <div style={{ marginTop: 4 }}>
                <strong>r</strong> ={" "}
                <span style={{ fontFamily: "monospace" }}>
                  {isFinite(rMeters) ? rMeters.toFixed(3) : "—"} m
                </span>{" "}
                (distance from wire)
              </div>
              <div>
                <strong>|B|</strong> ={" "}
                <span style={{ fontFamily: "monospace" }}>
                  {formatTesla(Bmag)}
                </span>
              </div>
              <div style={{ marginTop: 4, color: "#374151", lineHeight: 1.4 }}>
                Right-hand rule: point your thumb along the current. Your curled fingers
                show the direction of <strong>B</strong> — matching the{" "}
                <span style={{ color: "#1d4ed8", fontWeight: 600 }}>blue arrow</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
