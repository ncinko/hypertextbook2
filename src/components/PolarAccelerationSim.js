// src/components/PolarAccelerationSimple.js
import React, { useRef, useState, useEffect } from "react";
import Sketch from "react-p5";

// ---------- Helpers ----------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const parseNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Reusable mini "zero" chip
function ZeroChip({ onClick, title = "Set to 0" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        marginLeft: 8,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #ddd",
        background: "#f7f7f7",
        cursor: "pointer",
        lineHeight: 1.4,
        fontSize: 12,
        fontWeight: 600
      }}
    >
      0
    </button>
  );
}

// Slider + numeric input, with optional right-side addon (e.g., ZeroChip)
const NumberSlider = ({
  label, value, setValue, min, max, step,
  fmt = (x) => x.toFixed(2),
  inputWidth = 82,
  disabled = false,
  addon = null
}) => (
  <label
    className="slider-row"
    style={{
      display: "grid",
      gridTemplateColumns: "140px 1fr auto auto",
      gap: 10,
      alignItems: "center",
      marginBottom: 6,
      opacity: disabled ? 0.6 : 1
    }}
  >
    <div style={{ textAlign: "right", fontWeight: 600 }}>{label}</div>

    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => setValue(parseNum(e.target.value, value))}
      onInput={(e) => setValue(parseNum(e.target.value, value))}
      style={{ width: "100%" }}
      disabled={disabled}
    />

    <input
      type="number"
      inputMode="decimal"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = parseNum(e.target.value, value);
        setValue(clamp(n, min, max));
      }}
      onBlur={(e) => {
        const n = parseNum(e.target.value, value);
        setValue(clamp(n, min, max));
      }}
      style={{
        width: inputWidth,
        padding: "6px 8px",
        fontVariantNumeric: "tabular-nums",
        border: "1px solid #ddd",
        borderRadius: 8
      }}
      disabled={disabled}
      aria-label={`${label} numeric input`}
    />

    <div>{addon}</div>
  </label>
);

const Toggle = ({ label, checked, onChange }) => (
  <label
    style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginRight: 14,
      userSelect: "none",
      cursor: "pointer"
    }}
  >
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

const PlayPauseButton = ({ playing, setPlaying }) => (
  <button
    onClick={() => setPlaying((p) => !p)}
    aria-pressed={playing}
    aria-label={playing ? "Pause motion" : "Play motion"}
    style={{
      appearance: "none",
      border: "none",
      cursor: "pointer",
      padding: "10px 16px",
      borderRadius: 9999,
      fontWeight: 700,
      fontSize: 14,
      color: "#fff",
      background: playing
        ? "linear-gradient(90deg,#ef4444,#f59e0b)"
        : "linear-gradient(90deg,#4f46e5,#06b6d4)",
      boxShadow: "0 8px 16px rgba(0,0,0,0.15)"
    }}
  >
    {playing ? "Pause" : "Play"}
  </button>
);

export default function PolarAccelerationSimple() {
  // --- State ---
  const r = useRef(100);
  const theta = useRef(0);
  const rdot = useRef(0.0);
  const thetadot = useRef(0.5); // 0.25 rev/s default
  const [rddot, setRddot] = useState(0.0);
  const [thetaddot, setThetaddot] = useState(0.0);

  const [playing, setPlaying] = useState(true);
  const [arrowScale, setArrowScale] = useState(0.1);
  const [animScale, setAnimScale] = useState(1.0); // 0.25× … 4×
  const [gridOn, setGridOn] = useState(true);
  const [showBasis, setShowBasis] = useState(false);
  const [showVel, setShowVel] = useState(true); // velocity vector
  const [showRadial, setShowRadial] = useState(false);
  const [showCentripetal, setShowCentripetal] = useState(false);
  const [showAngularAcc, setShowAngularAcc] = useState(false);
  const [showCoriolis, setShowCoriolis] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const [lockRdot, setLockRdot] = useState(false);
  const [lockThetadot, setLockThetadot] = useState(false);
  const [, forceUpdate] = useState(0);

  // clickable legend hitboxes
  const legendBoxesRef = useRef([]); // [{x,y,w,h,idx}]

  // responsive layout
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // track canvas size to keep 'r' slider max in sync with drawable radius
  const [canvasSize, setCanvasSize] = useState(600);
  const dynamicRMax = Math.max(20, canvasSize * 0.45);

  // ---- EFFECTIVE VALUES (locks => accelerations go to zero) ----
  const effRdot = lockRdot ? 0 : rdot.current;
  const effThetadot = lockThetadot ? 0 : thetadot.current;
  const effRddot = lockRdot ? 0 : rddot;
  const effThetaddot = lockThetadot ? 0 : thetaddot;

  // readout (throttled)
  const [readout, setReadout] = useState({ a_r: 0, a_cent: 0, a_t: 0, a_cor: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      setReadout({
        a_r: effRddot,
        a_cent: -(r.current * effThetadot * effThetadot),
        a_t: r.current * effThetaddot,
        a_cor: 2 * effRdot * effThetadot
      });
    }, 100);
    return () => clearInterval(id);
  }, [effRddot, effThetadot, effThetaddot, effRdot]);

  const prevT = useRef(0);

  const drawArrow = (p5, x1, y1, x2, y2, color = "#111", w = 3, head = 10) => {
    p5.stroke(color);
    p5.strokeWeight(w);
    p5.fill(color);
    p5.line(x1, y1, x2, y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    p5.push();
    p5.translate(x2, y2);
    p5.rotate(ang);
    p5.triangle(0, 0, -head, head * 0.6, -head, -head * 0.6);
    p5.pop();
  };

  const labelText = (p5, text, x, y, bg = "rgba(255,255,255,0.85)", fg = "#111") => {
    p5.noStroke();
    p5.fill(bg);
    const pad = 4;
    const w = p5.textWidth(text) + 2 * pad;
    const h = 14 + 2 * pad;
    p5.rect(x - w / 2, y - h - 2, w, h, 6);
    p5.fill(fg);
    p5.textAlign(p5.CENTER, p5.CENTER);
    p5.text(text, x, y - h / 2 - 2);
  };

  // --- CCW CONVENTION ---
  // Screen coords: x right, y down. Make θ increase CCW visually with y = cy - r sinθ.
  const computeTerms = () => {
    const er = [Math.cos(theta.current), -Math.sin(theta.current)];     // r̂
    const et = [-Math.sin(theta.current), -Math.cos(theta.current)];    // θ̂ (CCW)

    // accelerations
    const a_r = effRddot;
    const a_cent = -r.current * effThetadot * effThetadot;
    const a_t = r.current * effThetaddot;
    const a_cor = 2 * effRdot * effThetadot;

    // velocity: v = ṙ r̂ + r θ̇ θ̂
    const v_r = effRdot;
    const v_t = r.current * effThetadot;

    const toXY = (ar, at) => [ ar*er[0] + at*et[0], ar*er[1] + at*et[1] ];

    const termRadial = toXY(a_r, 0);
    const termCentripetal = toXY(a_cent, 0);
    const termAngular = toXY(0, a_t);
    const termCoriolis = toXY(0, a_cor);
    const total = [
      termRadial[0] + termCentripetal[0] + termAngular[0] + termCoriolis[0],
      termRadial[1] + termCentripetal[1] + termAngular[1] + termCoriolis[1]
    ];
    const vel = toXY(v_r, v_t);

    return { er, et, termRadial, termCentripetal, termAngular, termCoriolis, total, vel };
  };

  // --- p5 setup/draw ---
  const setup = (p5, parent) => {
    const parentRect = parent.getBoundingClientRect();
    const size = Math.min(parentRect.width, 1400);
    const cnv = p5.createCanvas(size, size);
    cnv.parent(parent);
    cnv.style("display", "block");
    cnv.style("margin", "0 auto");
    p5.textFont("Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Arial");
    p5.textSize(12);
    prevT.current = p5.millis();
    setCanvasSize(size);

    // legend mouse handlers
    p5.mouseMoved = () => {
      const { mouseX: mx, mouseY: my } = p5;
      const hover = legendBoxesRef.current.some(({x,y,w,h}) =>
        mx >= x && mx <= x + w && my >= y && my <= y + h
      );
      p5.cursor(hover ? p5.HAND : p5.ARROW);
    };

    p5.mousePressed = () => {
      const { mouseX: mx, mouseY: my } = p5;
      const hit = legendBoxesRef.current.find(({x,y,w,h}) =>
        mx >= x && mx <= x + w && my >= y && my <= y + h
      );
      if (!hit) return;
      switch (hit.idx) {
        case 0: setShowVel(v => !v); break;
        case 1: setShowRadial(v => !v); break;
        case 2: setShowCentripetal(v => !v); break;
        case 3: setShowAngularAcc(v => !v); break;
        case 4: setShowCoriolis(v => !v); break;
        case 5: setShowTotal(v => !v); break;
        default: break;
      }
    };

    p5.windowResized = () => {
      const rect = parent.getBoundingClientRect();
      const newSize = Math.min(rect.width, 1400);
      p5.resizeCanvas(newSize, newSize);
      setCanvasSize(newSize);
      r.current = clamp(r.current, 20, Math.max(20, newSize * 0.45));
    };
  };

  const draw = (p5) => {
    // real-time dt (seconds) scaled by animScale
    const now = p5.millis();
    let dt = (now - prevT.current) / 1000;
    prevT.current = now;
    dt = Math.min(dt, 0.05) * animScale;

    // integrate (velocities zeroed while locked)
    if (playing) {
      const nextRdot = lockRdot ? 0 : rdot.current + rddot * dt;
      const nextThetadot = lockThetadot ? 0 : thetadot.current + thetaddot * dt;

      r.current = clamp(r.current + nextRdot * dt, 20, Math.max(20, p5.width * 0.45));

      let th = theta.current + nextThetadot * dt;
      const twoPi = 2 * Math.PI;
      th = th % twoPi;
      if (th < 0) th += twoPi;
      theta.current = th;

      if (!lockRdot) rdot.current = nextRdot;
      if (!lockThetadot) thetadot.current = nextThetadot;
    }

    p5.background(255);
    const cx = p5.width / 2;
    const cy = p5.height / 2;

    // polar grid (CCW visual)
    if (gridOn) {
      p5.push();
      p5.stroke(230);
      p5.strokeWeight(1);
      const maxR = p5.width * 0.48;
      for (let rr = 60; rr < maxR; rr += 60) {
        p5.noFill();
        p5.circle(cx, cy, 2 * rr);
      }
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        const x2 = cx + maxR * Math.cos(ang);
        const y2 = cy - maxR * Math.sin(ang); // minus for CCW
        p5.line(cx, cy, x2, y2);
      }
      p5.pop();
    }

    // position (CCW visual)
    const px = cx + r.current * Math.cos(theta.current);
    const py = cy - r.current * Math.sin(theta.current); // minus for CCW
    p5.stroke("#999");
    p5.strokeWeight(1.5);
    p5.line(cx, cy, px, py);

    const { er, et, termRadial, termCentripetal, termAngular, termCoriolis, total, vel } = computeTerms();
    const basisL = Math.max(40, p5.width * 0.04);

    // basis vectors (toggleable)
    if (showBasis) {
      drawArrow(p5, px, py, px + basisL * er[0], py + basisL * er[1], "#7e57c2", 3, 8);
      drawArrow(p5, px, py, px + basisL * et[0], py + basisL * et[1], "#666", 2.5, 7);
      labelText(p5, "r̂", px + basisL * er[0] + 16, py + basisL * er[1], "rgba(126,87,194,0.12)", "#4b2b8d");
      labelText(p5, "θ̂", px + basisL * et[0] + 16, py + basisL * et[1], "rgba(0,0,0,0.06)", "#333");
    }

    // vectors
    const S = 24 * arrowScale;  // accel scale
    const Sv = 16 * arrowScale; // velocity scale

    if (showVel) {
      drawArrow(p5, px, py, px + Sv * vel[0], py + Sv * vel[1], "#6a1b9a", 4, 10);
    }
    if (showRadial) {
      drawArrow(p5, px, py, px + S * termRadial[0], py + S * termRadial[1], "#1e88e5", 4, 10);
    }
    if (showCentripetal) {
      drawArrow(p5, px, py, px + S * termCentripetal[0], py + S * termCentripetal[1], "#e53935", 4, 10);
    }
    if (showAngularAcc) {
      drawArrow(p5, px, py, px + S * termAngular[0], py + S * termAngular[1], "#43a047", 4, 10);
    }
    if (showCoriolis) {
      drawArrow(p5, px, py, px + S * termCoriolis[0], py + S * termCoriolis[1], "#fb8c00", 4, 10);
    }
    if (showTotal) {
      drawArrow(p5, px, py, px + S * total[0], py + S * total[1], "#111", 4.5, 11);
    }

    // particle
    p5.noStroke();
    p5.fill("#444");
    p5.ellipse(px, py, 10, 10);

    // legend (clickable)
    const legend = [
      { label: "v",             color: "#6a1b9a", enabled: showVel },
      { label: "r̈ r̂",         color: "#1e88e5", enabled: showRadial },
      { label: "− r θ̇² r̂",     color: "#e53935", enabled: showCentripetal },
      { label: "r θ̈ θ̂",       color: "#43a047", enabled: showAngularAcc },
      { label: "2 ṙ θ̇ θ̂",     color: "#fb8c00", enabled: showCoriolis },
      { label: "a (total)",     color: "#111",    enabled: showTotal },
    ];

    p5.textAlign(p5.LEFT, p5.CENTER);
    let lx = 12, ly = 16;
    legendBoxesRef.current = []; // reset each frame

    legend.forEach((item, idx) => {
      const chipW = 18, chipH = 6, chipR = 2;
      const gap = 6;
      const txt = item.label;
      const tw = p5.textWidth(txt);

      // Hitbox covering chip + text
      const hbX = lx;
      const hbY = ly - 12;
      const hbW = chipW + gap + tw + 10;
      const hbH = 20;
      legendBoxesRef.current.push({ x: hbX, y: hbY, w: hbW, h: hbH, idx });

      // Dim if disabled
      const alpha = item.enabled ? 1.0 : 0.45;

      // Chip
      p5.push();
      p5.drawingContext.globalAlpha = alpha;
      p5.noStroke();
      p5.fill(item.color);
      p5.rect(lx, ly - chipH, chipW, chipH, chipR);
      p5.pop();

      // Text
      p5.push();
      p5.drawingContext.globalAlpha = alpha;
      p5.fill("#111");
      p5.text(txt, lx + chipW + gap, ly - 3);
      p5.pop();

      // Hover underline
      const mx = p5.mouseX, my = p5.mouseY;
      const hovering = (mx >= hbX && mx <= hbX + hbW && my >= hbY && my <= hbY + hbH);
      if (hovering) {
        p5.stroke(0, 0, 0, 70);
        p5.strokeWeight(1);
        const underlineY = ly + 4;
        p5.line(lx + chipW + gap, underlineY, lx + chipW + gap + tw, underlineY);
      }

      ly += 18;
    });
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "8px 12px" }}>
      <h2 style={{ margin: "8px 0 10px", textAlign: "center" }}>
        Acceleration in Polar Coordinates
      </h2>

      {/* Controls + Canvas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "minmax(300px, 520px) 1fr",
          gap: 18,
          alignItems: "start"
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 10,
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            pointerEvents: "auto"
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <PlayPauseButton playing={playing} setPlaying={setPlaying} />
            <Toggle label="Polar grid" checked={gridOn} onChange={setGridOn} />
            <Toggle label="Show basis" checked={showBasis} onChange={setShowBasis} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <Toggle label="lock ṙ = 0" checked={lockRdot} onChange={(v) => { setLockRdot(v); if (v) rdot.current = 0; }} />
            <Toggle label="lock θ̇ = 0" checked={lockThetadot} onChange={(v) => { setLockThetadot(v); if (v) thetadot.current = 0; }} />
          </div>

          <NumberSlider
            label="Arrow scale"
            value={arrowScale}
            setValue={setArrowScale}
            min={0.4}
            max={3}
            step={0.01}
            fmt={(x) => x.toFixed(2) + "×"}
          />
          <NumberSlider
            label="Animation rate"
            value={animScale}
            setValue={setAnimScale}
            min={0.25}
            max={4}
            step={0.01}
            fmt={(x) => x.toFixed(2) + "×"}
          />

          <div style={{ borderTop: "1px solid #eee", margin: "8px 0", paddingTop: 8, fontWeight: 600 }}>
            State
          </div>
          <NumberSlider
            label="r (px)"
            value={r.current}
            setValue={(v) => { r.current = v; forceUpdate((c) => c + 1); }}
            min={20}
            max={dynamicRMax}
            step={1}
            fmt={(x) => x.toFixed(0)}
          />
          <NumberSlider
            label="θ (rad)"
            value={theta.current}
            setValue={(v) => { theta.current = v; forceUpdate((c) => c + 1); }}
            min={0}
            max={2 * Math.PI}
            step={0.1}
          />
          <NumberSlider
            label="ṙ"
            value={rdot.current}
            setValue={(v) => { rdot.current = v; if (lockRdot && v !== 0) setLockRdot(false); forceUpdate((c) => c + 1); }}
            min={-10}
            max={10}
            step={0.1}
            addon={<ZeroChip onClick={() => { rdot.current = 0; forceUpdate(c => c + 1); }} title="Set ṙ to 0" />}
          />
          <NumberSlider
            label="θ̇ (rad/s)"
            value={thetadot.current}
            setValue={(v) => { thetadot.current = v; if (lockThetadot && v !== 0) setLockThetadot(false); forceUpdate((c) => c + 1); }}
            min={-6.28}
            max={6.28}
            step={0.1}
            addon={<ZeroChip onClick={() => { thetadot.current = 0; forceUpdate(c => c + 1); }} title="Set θ̇ to 0" />}
          />

          <div style={{ borderTop: "1px solid #eee", margin: "8px 0", paddingTop: 8, fontWeight: 600 }}>
            Accelerations
          </div>
          <NumberSlider
            label="r̈"
            value={rddot}
            setValue={setRddot}
            min={-10}
            max={10}
            step={0.1}
            disabled={lockRdot}
            addon={<ZeroChip onClick={() => setRddot(0)} title="Set r̈ to 0" />}
          />
          <NumberSlider
            label="θ̈"
            value={thetaddot}
            setValue={setThetaddot}
            min={-6.28}
            max={6.28}
            step={0.1}
            disabled={lockThetadot}
            addon={<ZeroChip onClick={() => setThetaddot(0)} title="Set θ̈ to 0" />}
          />

          {/* Simple numeric readout */}
          <div
            style={{
              marginTop: 10,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.35
            }}
          >
            <div><strong>a components (r̂, θ̂):</strong></div>
            <div>r̂: {readout.a_r.toFixed(2)} + ({readout.a_cent.toFixed(2)}) = {(readout.a_r + readout.a_cent).toFixed(2)}</div>
            <div>θ̂: {readout.a_t.toFixed(2)} + {readout.a_cor.toFixed(2)} = {(readout.a_t + readout.a_cor).toFixed(2)}</div>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <Sketch setup={setup} draw={draw} />
        </div>
      </div>
    </div>
  );
}
