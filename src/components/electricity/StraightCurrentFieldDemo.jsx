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

  const computeSize = () => {
    const parent = canvasRef.current?.parentElement;
    const width = parent
      ? clamp(parent.getBoundingClientRect().width, 280, 720)
      : clamp(window.innerWidth - 48, 280, 720);
    return { width: Math.round(width), height: Math.round(width * 0.6) };
  };

  const [size, setSize] = useState({ width: 480, height: 280 });
  const [current, setCurrent] = useState(8);
  const [direction, setDirection] = useState("out");
  const [probe, setProbe] = useState({ x: 340, y: 120 });

  useEffect(() => {
    setSize(computeSize());
    const handleResize = () => setSize(computeSize());
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
    setProbe((prev) => ({
      x: clamp(prev.x, 32, size.width - 32),
      y: clamp(prev.y, 32, size.height - 32),
    }));
  }, [size]);

  const dragRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPoint = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(event.clientX - rect.left, 32, size.width - 32),
        y: clamp(event.clientY - rect.top, 32, size.height - 32),
      };
    };

    const getTouchPoint = (touch) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clamp(touch.clientX - rect.left, 32, size.width - 32),
        y: clamp(touch.clientY - rect.top, 32, size.height - 32),
      };
    };

    const handleMouseDown = (event) => {
      dragRef.current = true;
      setProbe(getPoint(event));
    };

    const handleMouseMove = (event) => {
      if (!dragRef.current) return;
      setProbe(getPoint(event));
    };

    const stopDrag = () => {
      dragRef.current = false;
    };

    const handleTouchStart = (event) => {
      dragRef.current = true;
      setProbe(getTouchPoint(event.touches[0]));
      event.preventDefault();
    };

    const handleTouchMove = (event) => {
      if (!dragRef.current) return;
      setProbe(getTouchPoint(event.touches[0]));
      event.preventDefault();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrag);
    canvas.addEventListener("mouseleave", stopDrag);

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", stopDrag);
    canvas.addEventListener("touchcancel", stopDrag);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", stopDrag);
      canvas.removeEventListener("mouseleave", stopDrag);

      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", stopDrag);
      canvas.removeEventListener("touchcancel", stopDrag);
    };
  }, [size]);

  const origin = { x: size.width / 2, y: size.height / 2 };
  const dx = probe.x - origin.x;
  const dy = probe.y - origin.y;
  const r = Math.max(Math.hypot(dx, dy), 8);
  const Bmag = (MU0 * current) / (2 * Math.PI * r * 1e-2); // scale px → meters (1 px ~ 1 cm)
  const tangential = direction === "out" ? { x: -dy, y: dx } : { x: dy, y: -dx };
  const tLen = Math.hypot(tangential.x, tangential.y) || 1;
  const hat = { x: tangential.x / tLen, y: tangential.y / tLen };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size.width, size.height);

    // background
    ctx.fillStyle = "#f9fbff";
    ctx.fillRect(0, 0, size.width, size.height);

    // grid lines
    ctx.strokeStyle = "#dde5ff";
    ctx.lineWidth = 1;
    const spacing = 40;
    for (let x = spacing / 2; x < size.width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.stroke();
    }
    for (let y = spacing / 2; y < size.height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }

    // concentric circles
    ctx.strokeStyle = "#c3d1ff";
    ctx.lineWidth = 1.2;
    const maxRadius = Math.max(size.width, size.height) * 0.5;
    for (let radius = 40; radius <= maxRadius; radius += 40) {
      ctx.beginPath();
      ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // wire symbol
    ctx.fillStyle = "#1f3b7b";
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (direction === "out") {
      ctx.moveTo(origin.x - 6, origin.y);
      ctx.lineTo(origin.x + 6, origin.y);
      ctx.moveTo(origin.x, origin.y - 6);
      ctx.lineTo(origin.x, origin.y + 6);
    } else {
      ctx.moveTo(origin.x - 6, origin.y - 6);
      ctx.lineTo(origin.x + 6, origin.y + 6);
      ctx.moveTo(origin.x - 6, origin.y + 6);
      ctx.lineTo(origin.x + 6, origin.y - 6);
    }
    ctx.stroke();

    // probe point
    ctx.fillStyle = "#0b7285";
    ctx.beginPath();
    ctx.arc(probe.x, probe.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // field arrow
    const arrowScale = clamp(Bmag * 600, 18, 120);
    const arrowX = probe.x + hat.x * arrowScale;
    const arrowY = probe.y + hat.y * arrowScale;

    ctx.strokeStyle = "#f08c00";
    ctx.fillStyle = "#f08c00";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(probe.x, probe.y);
    ctx.lineTo(arrowX, arrowY);
    ctx.stroke();

    const drawArrowhead = (x1, y1, x2, y2) => {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 12;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 8),
        y2 - headLength * Math.sin(angle - Math.PI / 8)
      );
      ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 8),
        y2 - headLength * Math.sin(angle + Math.PI / 8)
      );
      ctx.closePath();
      ctx.fill();
    };

    drawArrowhead(probe.x, probe.y, arrowX, arrowY);

    // circular guideline through probe
    ctx.strokeStyle = "rgba(240, 140, 0, 0.45)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, Math.hypot(dx, dy), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // radius line
    ctx.strokeStyle = "#adb5bd";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(probe.x, probe.y);
    ctx.stroke();
  }, [size, probe, direction, Bmag, hat.x, hat.y, dx, dy]);

  return (
    <div className="canvas-card">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: "grab", touchAction: "none" }}
      />
      <div className="current-field-panel">
        <div className="current-field-row">
          <label htmlFor="current-slider" style={{ fontWeight: 600 }}>
            Current magnitude
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              id="current-slider"
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={current}
              onChange={(event) => setCurrent(parseFloat(event.target.value))}
              style={{ flexGrow: 1 }}
            />
            <span style={{ minWidth: 64, textAlign: "right" }}>{current.toFixed(1)} A</span>
          </div>
        </div>
        <div className="current-field-row" style={{ marginTop: 8 }}>
          <span style={{ fontWeight: 600 }}>Direction</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setDirection("out")}
              className={
                direction === "out" ? "current-field-chip active" : "current-field-chip"
              }
            >
              ⨀ out of screen
            </button>
            <button
              type="button"
              onClick={() => setDirection("in")}
              className={
                direction === "in" ? "current-field-chip active" : "current-field-chip"
              }
            >
              ⨂ into screen
            </button>
          </div>
        </div>
        <div
          className="current-field-row"
          style={{ marginTop: 8, fontSize: 14, color: "#495057" }}
        >
          <div><strong>r</strong> = {(r * 1e-2).toFixed(3)} m (distance from wire)</div>
          <div><strong>|B|</strong> = {formatTesla(Bmag)}</div>
          <div>
            Right-hand rule: thumb along current, fingers curl with <strong>⇒</strong> the orange arrow.
          </div>
        </div>
      </div>
    </div>
  );
}
