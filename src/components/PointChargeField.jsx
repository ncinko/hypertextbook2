// PointChargeField.jsx
import React, { useRef, useState, useEffect } from "react";

export default function PointChargeUnitVectorDemo() {
  const canvasRef = useRef(null);

  // --- Responsive sizing ---
  const computeSize = () => {
    const w = Math.min(900, Math.max(320, window.innerWidth - 48));
    const h = Math.min(520, Math.max(260, Math.round(w * 0.55)));
    return { width: w, height: h };
  };
  const [size, setSize] = useState(computeSize());
  useEffect(() => {
    const onResize = () => setSize(computeSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- Units / constants ---
  const PIXEL_TO_MICROMETER = 1;   // 1 px = 1 µm
  const UM_TO_M = 1e-6;            // µm → m
  const GRID_SPACING_UM = 50;      // grid every 50 µm
  const k = 9e9;                   // N·m^2/C^2

  // Linear pixels-per-(N/C) factor for E arrow length.
  // Chosen so at r = 100 µm with q = 1 nC (E ≈ 9e8 N/C) you get ~60 px.
  // EL = ALPHA * |E|, capped to avoid runaway near the core.
  const E_PIXELS_PER_SI = 6.5e-8;  // tweak to taste
  const E_LEN_MAX = 260;           // px hard cap

  // --- Charge in nC (slider −10..+10) ---
  const [qNanoC, setQNanoC] = useState(5.0);
  const q = qNanoC * 1e-9;         // C

  // Source (origin) & probe
  const source = useRef({ x: size.width * 0.5, y: size.height * 0.55 });
  const [probe, setProbe] = useState({ x: size.width * 0.78, y: size.height * 0.35 });
  const prevSize = useRef(size);

  useEffect(() => {
    const sx = size.width / prevSize.current.width;
    const sy = size.height / prevSize.current.height;
    source.current = { x: size.width * 0.5, y: size.height * 0.55 };
    setProbe(p => ({ x: p.x * sx, y: p.y * sy }));
    prevSize.current = size;
  }, [size]);

  const [draggingProbe, setDraggingProbe] = useState(false);

  // --- Helpers ---
  const getMousePos = (evt) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };
  const clampProbe = (x, y) => ({
    x: Math.max(0, Math.min(size.width, x)),
    y: Math.max(0, Math.min(size.height, y)),
  });

  // --- Geometry (screen coords: +y downward) ---
  const dx_px = probe.x - source.current.x;
  const dy_px = probe.y - source.current.y;
  const r_px = Math.hypot(dx_px, dy_px);
  const rhx_screen = r_px > 1e-9 ? dx_px / r_px : 0;
  const rhy_screen = r_px > 1e-9 ? dy_px / r_px : 0;

  // --- Physics in SI ---
  const r_um = r_px * PIXEL_TO_MICROMETER;     // µm
  const r_m  = r_um * UM_TO_M;                 // m

  // Soften singularity at small radii (e.g., 5 µm)
  const soft_um = 5;
  const soft_m  = soft_um * UM_TO_M;
  const r_eff_m = Math.max(r_m, soft_m);

  // Use magnitude based on |q| so length is always positive and scales linearly with |q|
  const E_mag_abs = k * Math.abs(q) / (r_eff_m * r_eff_m); // N/C
  const Ex_screen = E_mag_abs * rhx_screen * Math.sign(q); // include charge sign in direction
  const Ey_screen = E_mag_abs * rhy_screen * Math.sign(q);

  // --- Drawing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(size.width * dpr) || canvas.height !== Math.round(size.height * dpr)) {
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);

    // Grid aligned to origin (source)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    const grid_px = GRID_SPACING_UM / PIXEL_TO_MICROMETER;
    for (let x = source.current.x; x < size.width; x += grid_px) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke(); }
    for (let x = source.current.x - grid_px; x >= 0; x -= grid_px) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke(); }
    for (let y = source.current.y; y < size.height; y += grid_px) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke(); }
    for (let y = source.current.y - grid_px; y >= 0; y -= grid_px) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke(); }

    // Source charge
    ctx.beginPath();
    ctx.arc(source.current.x, source.current.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = q >= 0 ? "#e53935" : "#1e88e5";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(q >= 0 ? "+" : "−", source.current.x, source.current.y);

 // r vector (gray, dashed) from source to probe
ctx.beginPath();
ctx.moveTo(source.current.x, source.current.y);
ctx.lineTo(probe.x, probe.y);
ctx.strokeStyle = "rgba(0,0,0,0.55)";
ctx.lineWidth = 2;
ctx.setLineDash([6, 4]);  // 6px dash, 4px gap
ctx.stroke();
ctx.setLineDash([]);      // reset to solid for future drawings

    // r-hat (purple) — fixed length from source
    const RhatLen = 60;
    const rx = source.current.x + RhatLen * rhx_screen;
    const ry = source.current.y + RhatLen * rhy_screen;
    drawArrow(ctx, source.current.x, source.current.y, rx, ry, "#7e57c2", 3);
    drawLabel(ctx, "r̂", rx, ry, rhx_screen, rhy_screen, "#7e57c2", 16);

    // E vector (orange) — linear |E| scaling with charge and 1/r^2
    let EL = E_PIXELS_PER_SI * E_mag_abs;      // proportional to |E|
    EL = Math.min(EL, E_LEN_MAX);              // cap to avoid runaway near core
    const ex = probe.x + EL * rhx_screen * Math.sign(q);
    const ey = probe.y + EL * rhy_screen * Math.sign(q);
    drawArrow(ctx, probe.x, probe.y, ex, ey, "#fb8c00", 3.25);
    drawLabel(ctx, "E", ex, ey, Ex_screen, Ey_screen, "#fb8c00", 16);

    // Probe handle
    ctx.beginPath();
    ctx.arc(probe.x, probe.y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = "#2e7d32";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.stroke();

  }, [size, q, probe.x, probe.y]); 

  function drawArrow(ctx, x1, y1, x2, y2, color = "#000", width = 2) {
    const head = 15;
    const dx = x2 - x1, dy = y2 - y1;
    const ang = Math.atan2(dy, dx);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2+5*Math.cos(ang), y2+5*Math.sin(ang));
    ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  // Perpendicular label offset
  function drawLabel(ctx, text, x, y, dx, dy, color, fontPx = 15) {
    const mag = Math.hypot(dx, dy) || 1;
    const offx = -(dy / mag) * 16;
    const offy = (dx / mag) * 16;
    ctx.fillStyle = color;
    ctx.font = `${fontPx}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + offx, y + offy);
  }

  // Mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    const down = (e) => {
      const { x, y } = getMousePos(e);
      if (Math.hypot(x - probe.x, y - probe.y) < 10) setDraggingProbe(true);
    };
    const move = (e) => {
      if (!draggingProbe) return;
      const { x, y } = getMousePos(e);
      setProbe(clampProbe(x, y));
    };
    const up = () => setDraggingProbe(false);
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", up);
    canvas.addEventListener("mouseleave", up);
    return () => {
      canvas.removeEventListener("mousedown", down);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", up);
      canvas.removeEventListener("mouseleave", up);
    };
  }, [draggingProbe, probe]);

  // ---------- Physics-facing readout (y up = +) ----------
  const dx_um = dx_px * PIXEL_TO_MICROMETER;
  const dy_um_up = -dy_px * PIXEL_TO_MICROMETER; // flip sign for display
  const r_um_disp = r_px * PIXEL_TO_MICROMETER;

  const rhx_phys = rhx_screen;
  const rhy_phys = -rhy_screen;

  const Ex_phys = Ex_screen;
  const Ey_phys = -Ey_screen;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Single Point Charge: </strong>
        <label style={{ marginLeft: 8 }}>
          q (nC):{" "}
          <input
            type="range"
            min={-10}
            max={10}
            step={0.1}
            value={qNanoC}
            onChange={(e) => setQNanoC(+e.target.value)}
          />{" "}
          <span style={{ display: "inline-block", minWidth: 56, textAlign: "left" }}>
            {qNanoC.toFixed(1)}
          </span>
        </label>
      </div>

      <canvas
        ref={canvasRef}
        style={{ border: "1px solid #ccc", maxWidth: "100%", cursor: "pointer" }}
      />
<p style={{ marginTop: 8, maxWidth: 800, marginInline: "auto" }}>
        Drag the <span style={{ color: "#2e7d32" }}><b>point</b></span> to see the value of the <span style={{ color: "#fb8c00" }}><b>electric field</b></span> at different locations.
      </p>
      <div
        style={{
          marginTop: 8,
          display: "block",
          width: "100%",
          textAlign: "left",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          background: "#fafafa",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: "8px 12px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          maxWidth: 780,
          marginInline: "auto"
        }}
      >
         
        <div><b>Geometry</b></div>
        <div>
          r = ⟨{dx_um.toFixed(1)}, {dy_um_up.toFixed(1)}⟩ µm,&nbsp;
          |r| = {r_um_disp.toFixed(1)} µm
        </div>
        <div>r̂ = ⟨{rhx_phys.toFixed(3)}, {rhy_phys.toFixed(3)}⟩</div>

        <div style={{ marginTop: 6 }}><b>Field</b></div>
        <div>|E| = {formatSciReact(Math.abs(E_mag_abs), 3)} N/C</div>
        <div>E = ⟨{formatSciReact(Ex_phys, 3)}, {formatSciReact(Ey_phys, 3)}⟩ N/C  </div>
      </div>

     
    </div>
  );
}

// ---------- Utilities ----------
function formatSciReact(x, sig = 3) {
  if (!isFinite(x) || x === 0) return <>0</>;
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const man = (x / Math.pow(10, exp)).toFixed(Math.max(0, sig - 1));
  return <>{man} × 10<sup>{exp}</sup></>;
}
