import React, { useEffect, useRef, useState } from "react";

// Utility helpers
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function makeCoordUtils(width, height, pixelsPerUnit = 60) {
  const cx = width / 2;
  const cy = height / 2;
  return {
    toMath([x, y]) {
      return [(x - cx) / pixelsPerUnit, (cy - y) / pixelsPerUnit];
    },
    toSvg([mx, my]) {
      return [cx + mx * pixelsPerUnit, cy - my * pixelsPerUnit];
    },
    cx,
    cy,
    ppu: pixelsPerUnit,
  };
}

function Arrow({ origin, tip, color = "#2563eb", width = 5 }) {
  const [x1, y1] = origin;
  const [x2, y2] = tip;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const head = Math.max(10, width * 2.2);
  const backX = x2 - ux * head;
  const backY = y2 - uy * head;
  const leftX = backX + (-uy) * (head * 0.6);
  const leftY = backY + (ux) * (head * 0.6);
  const rightX = backX - (-uy) * (head * 0.6);
  const rightY = backY - (ux) * (head * 0.6);
  return (
    <g>
      <line x1={x1} y1={y1} x2={backX} y2={backY} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`} fill={color} />
    </g>
  );
}

function Grid({ width, height, ppu }) {
  const cx = width / 2;
  const cy = height / 2;
  const lines = [];
  for (let x = cx % ppu; x < width; x += ppu) {
    lines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#e5e7eb" strokeWidth="1" />);
  }
  for (let y = cy % ppu; y < height; y += ppu) {
    lines.push(<line key={`hz${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeWidth="1" />);
  }
  return (
    <g>
      {lines}
      <line x1={0} y1={cy} x2={width} y2={cy} stroke="#111827" strokeWidth="1.5" />
      <line x1={cx} y1={0} x2={cx} y2={height} stroke="#111827" strokeWidth="1.5" />
    </g>
  );
}

function Readout({ label, value, suffix, color }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "8px 10px",
        display: "flex",
        justifyContent: "space-between",
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: 16,
      }}
    >
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>
        {value}
        {suffix}
      </span>
    </div>
  );
}

export default function VectorComponentsDemo() {
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [tip, setTip] = useState(null); // svg coords
  const [snap, setSnap] = useState(false);

  useEffect(() => {
    function onResize() {
      if (!svgRef.current) return;
      const parent = svgRef.current.parentElement;
      if (!parent) return;
      const w = clamp(parent.clientWidth, 320, 1500);
      const h = Math.round((w * 9) / 10);
      setSize({ w, h });
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { w, h } = size;
  const C = makeCoordUtils(w, h, 60);
  const defaultTip = C.toSvg([2, 1.2]);
  const tipXY = tip ?? defaultTip;

  // click-drag anywhere to aim (no visible handle/dot)
  const drag = useRef({ active: false });
  function onPointerDown() {
    drag.current.active = true;
  }
  function onPointerUp() {
    drag.current.active = false;
  }
  function onPointerMove(e) {
    if (!drag.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (snap) {
      const [mx, my] = C.toMath([x, y]);
      const sx = Math.round(mx);
      const sy = Math.round(my);
      const [gx, gy] = C.toSvg([sx, sy]);
      setTip([gx, gy]);
    } else {
      setTip([x, y]);
    }
  }

  const [mx, my] = C.toMath(tipXY);
  const mag = Math.sqrt(mx * mx + my * my);

  const compXEnd = C.toSvg([mx, 0]);
  const compYEnd = C.toSvg([mx, my]);

  // toggle snap; if turning on, snap current tip immediately
  function toggleSnap() {
    setSnap((s) => {
      const ns = !s;
      if (ns) {
        const sx = Math.round(mx);
        const sy = Math.round(my);
        const [gx, gy] = C.toSvg([sx, sy]);
        setTip([gx, gy]);
      }
      return ns;
    });
  }

  return (
    <div
      className="demo-card"
      style={{
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center", // center everything
      }}
    >
      {/* Canvas container (relative) so we can overlay the toggle in the top-right */}
      <div style={{ position: "relative", width: w }}>
        <svg
          ref={svgRef}
          width={w}
          height={h}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerMove={onPointerMove}
          style={{
            touchAction: "none",
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            cursor: "crosshair",
            display: "block",
            margin: "0 auto",
          }}
        >
          <Grid width={w} height={h} ppu={C.ppu} />
          {/* components */}
          <Arrow origin={[C.cx, C.cy]} tip={compXEnd} color="#10b981" width={4} />
          <Arrow origin={compXEnd} tip={compYEnd} color="#f59e0b" width={4} />
          {/* main vector */}
          <Arrow origin={[C.cx, C.cy]} tip={tipXY} color="#2563eb" width={5} />
        </svg>

        {/* Snap-to-grid pill (top-right of canvas) */}
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}>
          <button
            type="button"
            onClick={toggleSnap}
            aria-pressed={snap}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 9999,
              background: "#ffffffd9",
              fontWeight: 700,
              fontSize: 14,
              color: "#111827",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              backdropFilter: "blur(4px)",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 34,
                height: 20,
                borderRadius: 9999,
                background: snap ? "#2563eb" : "#e5e7eb",
                position: "relative",
                display: "inline-block",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: snap ? 16 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: "left 120ms ease",
                }}
              />
            </span>
            Snap to grid
          </button>
        </div>
      </div>

      {/* Readouts — exact same width as canvas and centered */}
      <div style={{ marginTop: 10, width: w }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: "100%" }}>
          <Readout label="Aₓ" value={mx.toFixed(2)} suffix=" (units)" color="#10b981" />
          <Readout label="Aᵧ" value={my.toFixed(2)} suffix=" (units)" color="#f59e0b" />
          <Readout label="|A|" value={mag.toFixed(3)} suffix=" (units)" color="#2563eb" />
        </div>
        <div style={{ color: "#6b7280", fontSize: 14, marginTop: 6, textAlign: "center" }}>
          Drag anywhere in the panel to aim the vector.
          Green = x-component, Amber = y-component.
        </div>
      </div>
    </div>
  );
}
