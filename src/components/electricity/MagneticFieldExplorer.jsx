// MagneticFieldExplorer.jsx (updated)
// - Adds "wire" configuration (infinite straight wire along z through origin)
// - Indicates current direction for loop/solenoid/wire
// - Masks field vectors inside bar magnet volumes
// - Draws full box edges for bar magnets (sides)
// - Fixed-length arrows with color/opacity encoding |B| (kept)
import React, { useEffect, useMemo, useRef, useState } from "react";

const MU0 = 4 * Math.PI * 1e-7; // vacuum permeability
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const rotateAroundX = (vec, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: vec.x, y: vec.y * c - vec.z * s, z: vec.y * s + vec.z * c };
};

const rotateYawPitch = (vec, yaw, pitch) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  const x1 = vec.x * cy + vec.z * sy;
  const y1 = vec.y;
  const z1 = -vec.x * sy + vec.z * cy;

  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
};

const addVec = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

const dipoleField = (point, dipole) => {
  const rx = point.x - dipole.position[0];
  const ry = point.y - dipole.position[1];
  const rz = point.z - dipole.position[2];
  const r2 = rx * rx + ry * ry + rz * rz + 1e-6;
  const r = Math.sqrt(r2);
  const dot = rx * dipole.moment[0] + ry * dipole.moment[1] + rz * dipole.moment[2];
  const coeff = (MU0 / (4 * Math.PI)) * (1 / (r2 * r2 * r));
  return {
    x: coeff * (3 * dot * rx - r2 * dipole.moment[0]),
    y: coeff * (3 * dot * ry - r2 * dipole.moment[1]),
    z: coeff * (3 * dot * rz - r2 * dipole.moment[2]),
  };
};

const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const loopField = (point, { radius, current, segments, tiltDeg, center }) => {
  const tilt = (tiltDeg * Math.PI) / 180;
  const shifted = {
    x: point.x - center.x,
    y: point.y - center.y,
    z: point.z - center.z,
  };
  const localPoint = rotateAroundX(shifted, -tilt);

  const muPrefactor = (MU0 * current) / (4 * Math.PI);
  let fieldLocal = { x: 0, y: 0, z: 0 };

  for (let i = 0; i < segments; i++) {
    const phi1 = (2 * Math.PI * i) / segments;
    const phi2 = (2 * Math.PI * (i + 1)) / segments;
    const p1 = { x: radius * Math.cos(phi1), y: radius * Math.sin(phi1), z: 0 };
    const p2 = { x: radius * Math.cos(phi2), y: radius * Math.sin(phi2), z: 0 };
    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, z: 0 };
    const dl = { x: p2.x - p1.x, y: p2.y - p1.y, z: 0 };
    const rVec = {
      x: localPoint.x - midpoint.x,
      y: localPoint.y - midpoint.y,
      z: localPoint.z - midpoint.z,
    };
    const rMag = Math.max(Math.hypot(rVec.x, rVec.y, rVec.z), 0.05);
    const contrib = cross(dl, rVec);
    const scale = muPrefactor / (rMag * rMag * rMag);
    fieldLocal.x += contrib.x * scale;
    fieldLocal.y += contrib.y * scale;
    fieldLocal.z += contrib.z * scale;
  }

  return rotateAroundX(fieldLocal, tilt);
};

// Infinite straight wire along +z (through origin).
// B = μ0 I / (2π ρ^2) * (-y, x, 0), where ρ^2 = x^2 + y^2
const wireField = (point, { current }) => {
  const x = point.x;
  const y = point.y;
  const rho2 = Math.max(x * x + y * y, 1e-6);
  const coeff = (MU0 * current) / (2 * Math.PI * rho2);
  return { x: -y * coeff, y: x * coeff, z: 0 };
};

const colorRamp = (t) => {
  const clampT = clamp(t, 0, 1);
  const r = Math.round(30 + clampT * 180);
  const g = Math.round(80 + clampT * 120);
  const b = Math.round(200 - clampT * 120);
  return `rgb(${r}, ${g}, ${b})`;
};

export default function MagneticFieldExplorer() {
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 600, height: 500 });
  const [config, setConfig] = useState("wire");
  const [density, setDensity] = useState(7);
  const [yaw, setYaw] = useState(0.0);
  const [pitch, setPitch] = useState(0.0);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [pairSeparation, setPairSeparation] = useState(1.2);
  const [pairMode, setPairMode] = useState("anti");
  const [solenoidTurns, setSolenoidTurns] = useState(10);
  const [loopRadius, setLoopRadius] = useState(0.85);
  const [showSource, setShowSource] = useState(true); // faint source sketch toggle
  const [currentSign, setCurrentSign] = useState(1); // +1 or -1

  useEffect(() => {
    const computeSize = () => {
      const parent = canvasRef.current?.parentElement;
      const width = parent
        ? clamp(parent.getBoundingClientRect().width, 320, 900)
        : clamp(window.innerWidth - 48, 320, 900);
      // keep current aspect; if you want it squarer later, change 0.72 → 0.9
      return { width: Math.round(width), height: Math.round(width * 0.72) };
    };

    const updateSize = () => setSize(computeSize());
    updateSize();

    window.addEventListener("resize", updateSize);
    const parent = canvasRef.current?.parentElement;
    let observer;
    if (parent && "ResizeObserver" in window) {
      observer = new ResizeObserver(updateSize);
      observer.observe(parent);
    }
    return () => {
      window.removeEventListener("resize", updateSize);
      if (observer) observer.disconnect();
    };
  }, []);

  // Helper to test if a sample point is inside any bar magnet volume
  const isInsideBar = useMemo(() => {
    return (pt) => {
      if (!(config === "dipole" || config === "pair")) return false;
      const len = 1.4;
      const thick = 0.3;
      const hw = thick / 2;
      const hl = len / 2;
      const half = config === "pair" ? pairSeparation / 2 : 0;
      const centers = config === "pair" ? [-half, half] : [0];
      const tilt = (tiltAngle * Math.PI) / 180;

      // inverse-rotate point into the un-tilted bar frame
      const toLocal = (p) => rotateAroundX(p, -tilt);
      const pLocal = toLocal(pt);

      for (const cx of centers) {
        const dx = pLocal.x - cx;
        if (Math.abs(dx) <= hw && Math.abs(pLocal.y) <= hw && Math.abs(pLocal.z) <= hl) {
          return true;
        }
      }
      return false;
    };
  }, [config, pairSeparation, tiltAngle]);

  const samplePoints = useMemo(() => {
    const n = Math.max(3, Math.floor(density));
    const extent = 1.2;
    const values = Array.from({ length: n }, (_, i) => ((i / (n - 1)) * 2 - 1) * extent);
    const pts = [];
    values.forEach((x) => {
      values.forEach((y) => {
        values.forEach((z) => {
          if (Math.hypot(x, y, z) < 0.05) return;
          const pt = { x, y, z };
          if (!isInsideBar(pt)) pts.push(pt);
        });
      });
    });
    return pts;
  }, [density, isInsideBar]);

  const fieldVectors = useMemo(() => {
    const momentVec = rotateAroundX({ x: 0, y: 0, z: 1 }, (tiltAngle * Math.PI) / 180);
    const computeField = (point) => {
      if (config === "loop") {
        return loopField(point, {
          radius: loopRadius,
          current: 1 * currentSign,
          segments: 72,
          tiltDeg: tiltAngle,
          center: { x: 0, y: 0, z: 0 },
        });
      }
      if (config === "solenoid") {
        const spacing = 0.55;
        const turns = Math.max(2, Math.floor(solenoidTurns));
        let total = { x: 0, y: 0, z: 0 };
        const offsetStart = -((turns - 1) * spacing) / 2;
        for (let i = 0; i < turns; i++) {
          const center = { x: 0, y: 0, z: offsetStart + i * spacing };
          const loopB = loopField(point, {
            radius: loopRadius * 0.75,
            current: 1 * currentSign,
            segments: 64,
            tiltDeg: 0,
            center,
          });
          total = addVec(total, loopB);
        }
        return total;
      }
      if (config === "wire") {
        return wireField(point, { current: 1 * currentSign });
      }

      const dipoles = [];
      if (config === "dipole") {
        dipoles.push({ position: [0, 0, 0], moment: [momentVec.x, momentVec.y, momentVec.z] });
      } else if (config === "pair") {
        const half = pairSeparation / 2;
        const orientationA = [momentVec.x, momentVec.y, momentVec.z];
        const orientationB =
          pairMode === "parallel"
            ? [momentVec.x, momentVec.y, momentVec.z]
            : [-momentVec.x, -momentVec.y, -momentVec.z];
        dipoles.push({ position: [-half, 0, 0], moment: orientationA });
        dipoles.push({ position: [half, 0, 0], moment: orientationB });
      }
      return dipoles.reduce((acc, dip) => addVec(acc, dipoleField(point, dip)), { x: 0, y: 0, z: 0 });
    };
    return samplePoints.map((pt) => ({ point: pt, field: computeField(pt) }));
  }, [samplePoints, config, loopRadius, tiltAngle, solenoidTurns, pairSeparation, pairMode, currentSign]);

  const dragRef = useRef({ active: false, x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleDown = (event) => {
      dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    };
    const handleMove = (event) => {
      if (!dragRef.current.active) return;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      dragRef.current = { active: true, x: event.clientX, y: event.clientY };
      setYaw((prev) => prev + dx * 0.005);
      setPitch((prev) => clamp(prev + dy * 0.005, -1.2, 1.2));
    };
    const handleUp = () => {
      dragRef.current = { active: false, x: 0, y: 0 };
    };

    canvas.addEventListener("mousedown", handleDown);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    const handleTouchStart = (event) => {
      const touch = event.touches[0];
      dragRef.current = { active: true, x: touch.clientX, y: touch.clientY };
      event.preventDefault();
    };
    const handleTouchMove = (event) => {
      if (!dragRef.current.active) return;
      const touch = event.touches[0];
      const dx = touch.clientX - dragRef.current.x;
      const dy = touch.clientY - dragRef.current.y;
      dragRef.current = { active: true, x: touch.clientX, y: touch.clientY };
      setYaw((prev) => prev + dx * 0.005);
      setPitch((prev) => clamp(prev + dy * 0.005, -1.2, 1.2));
      event.preventDefault();
    };
    const handleTouchEnd = () => {
      dragRef.current = { active: false, x: 0, y: 0 };
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, size.width, size.height);

    // background
    const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);

    const center = { x: size.width / 2, y: size.height / 2 };
    const scale = size.width * 0.26;
    const camera = 6;

    const project = (p) => {
      const rp = rotateYawPitch(p, yaw, pitch);
      const persp = camera / (camera - rp.z);
      return { x: center.x + rp.x * scale * persp, y: center.y - rp.y * scale * persp, z: rp.z, persp };
    };

    // optional faint sketch of the source
    if (showSource) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(248, 250, 252, 0.7)"; // near-white
      ctx.fillStyle = "rgba(148, 163, 184, 0.10)";

      if (config === "loop") {
        // single current ring
        const R = loopRadius;
        const tilt = (tiltAngle * Math.PI) / 180;
        const ringPts = 96;
        // ring
        ctx.beginPath();
        for (let i = 0; i <= ringPts; i++) {
          const t = (2 * Math.PI * i) / ringPts;
          const local = rotateAroundX({ x: R * Math.cos(t), y: R * Math.sin(t), z: 0 }, tilt);
          const s = project(local);
          if (i === 0) ctx.moveTo(s.x, s.y);
          else ctx.lineTo(s.x, s.y);
        }
        ctx.stroke();
        // add a small arrow on the ring to indicate current direction (CCW for currentSign=+1)
        const tArrow = 0.15 * 2 * Math.PI;
        const pA = rotateAroundX({ x: R * Math.cos(tArrow), y: R * Math.sin(tArrow), z: 0 }, tilt);
        const pB = rotateAroundX({ x: R * Math.cos(tArrow + 0.05 * currentSign), y: R * Math.sin(tArrow + 0.05 * currentSign), z: 0 }, tilt);
        const sA = project(pA); const sB = project(pB);
        const ang = Math.atan2(sB.y - sA.y, sB.x - sA.x);
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
        ctx.stroke();
        ctx.beginPath();
        const h = 10;
        ctx.moveTo(sB.x, sB.y);
        ctx.lineTo(sB.x - h * Math.cos(ang - Math.PI/6), sB.y - h * Math.sin(ang - Math.PI/6));
        ctx.lineTo(sB.x - h * Math.cos(ang + Math.PI/6), sB.y - h * Math.sin(ang + Math.PI/6));
        ctx.closePath();
        ctx.fill();
      } else if (config === "solenoid") {
        const turns = Math.max(2, Math.floor(solenoidTurns));
        const spacing = 1/solenoidTurns;
        const offsetStart = -((turns - 1) * spacing) / 2;
        const R = loopRadius * 0.75;
        const tilt = (tiltAngle * Math.PI) / 180;
        for (let k = 0; k < turns; k++) {
          ctx.beginPath();
          const zc = offsetStart + k * spacing;
          const ringPts = 80;
          for (let i = 0; i <= ringPts; i++) {
            const t = (2 * Math.PI * i) / ringPts;
            const local = rotateAroundX(
              { x: R * Math.cos(t), y: R * Math.sin(t), z: 0 },
              tilt
            );
            const s = project({ x: local.x, y: local.y, z: local.z + zc });
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
          }
          ctx.stroke();
        }
        // add central current direction marker (dot/cross) per right-hand rule
        const c = project({ x: 0, y: 0, z: 0 });
        ctx.save();
        ctx.globalAlpha = 0.75;
        if (currentSign > 0) {
          // dot (out of screen)
          ctx.beginPath(); ctx.arc(c.x, c.y, 6, 0, 2*Math.PI); ctx.fillStyle = "rgba(248,250,252,0.85)"; ctx.fill();
        } else {
          // cross (into screen)
          ctx.strokeStyle = "rgba(248,250,252,0.85)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(c.x - 6, c.y - 6); ctx.lineTo(c.x + 6, c.y + 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.x - 6, c.y + 6); ctx.lineTo(c.x + 6, c.y - 6); ctx.stroke();
        }
        ctx.restore();
      } else if (config === "wire") {
        // draw a vertical line (wire) along z axis, projected as a point at the center with a line indicating axis
        // We'll draw the x-y projection as a small circle with dot/cross to show +z/-z current direction.
        const c = project({ x: 0, y: 0, z: 0 });
        // a faint vertical guide
        const top = project({ x: 0, y: 0, z: 1 });
        const bot = project({ x: 0, y: 0, z: -1});
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
        // current direction marker at center
        ctx.save();
        ctx.globalAlpha = 0.9;
        if (currentSign > 0) {
          ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, 2*Math.PI); ctx.fillStyle = "rgba(248,250,252,0.9)"; ctx.fill(); // dot = +z
        } else {
          ctx.strokeStyle = "rgba(248,250,252,0.9)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(c.x - 7, c.y - 7); ctx.lineTo(c.x + 7, c.y + 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(c.x - 7, c.y + 7); ctx.lineTo(c.x + 7, c.y - 7); ctx.stroke(); // cross = -z
        }
        ctx.restore();
      } else if (config === "dipole" || config === "pair") {
        // bar magnet(s) as oriented boxes with full edges
        const len = 1.4; // bar length
        const thick = 0.3; // bar thickness
        const half = config === "pair" ? pairSeparation / 2 : 0;
        const centers = config === "pair" ? [-half, half] : [0];

        const tilt = (tiltAngle * Math.PI) / 180;
        centers.forEach((cx) => {
          const hw = thick / 2;
          const hl = len / 2;
          // 8 corners of a box centered at (cx,0,0) and oriented along z then tilted
          const corners = [
            { x: cx - hw, y: -hw, z: -hl },
            { x: cx + hw, y: -hw, z: -hl },
            { x: cx + hw, y: hw,  z: -hl },
            { x: cx - hw, y: hw,  z: -hl },
            { x: cx - hw, y: -hw, z: hl },
            { x: cx + hw, y: -hw, z: hl },
            { x: cx + hw, y: hw,  z: hl },
            { x: cx - hw, y: hw,  z: hl },
          ].map((p) => rotateAroundX(p, tilt));

          // draw faces subtle fill
          const face = (idxs) => {
            ctx.beginPath();
            const p0 = project(corners[idxs[0]]);
            ctx.moveTo(p0.x, p0.y);
            for (let i = 1; i < idxs.length; i++) {
              const pi = project(corners[idxs[i]]);
              ctx.lineTo(pi.x, pi.y);
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          };
          ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
          ctx.strokeStyle = "rgba(248, 250, 252, 0.6)";
          ctx.lineWidth = 1.5;
          // six faces
          face([0,1,2,3]);
          face([4,5,6,7]);
          face([0,1,5,4]);
          face([1,2,6,5]);
          face([2,3,7,6]);
          face([3,0,4,7]);
        });
      }
      ctx.restore();
    }

    // field magnitudes for normalization
    // Replace with:
    const magnitudes = fieldVectors.map(({ field }) => Math.hypot(field.x, field.y, field.z));
    // Use a fixed reference to keep color scaling consistent
    const referenceMagnitude = 1e-6; // tune this value
    const maxMagnitude = referenceMagnitude;
    // --- draw field arrows (FIXED LENGTH + color/opacity encode |B|) ---
    const L = size.width * 0.055;          // fixed on-screen arrow length
    const alphaFrom = (t) => clamp(0.22 + 0.78 * Math.pow(t, 0.65), 0.22, 1); // perceptual

    fieldVectors.forEach(({ point, field }, index) => {
      const sp = project(point);
      const rf = rotateYawPitch(field, yaw, pitch);

      // magnitude (for color/opacity), but direction from normalized vector
      const fieldMag = magnitudes[index];
      const norm = fieldMag / maxMagnitude;

      // normalize direction (avoid degenerate zero)
      const len = Math.hypot(rf.x, rf.y, rf.z) || 1e-9;
      const dir = { x: rf.x / len, y: rf.y / len, z: rf.z / len };

      // fixed-length endpoint
      const ax = sp.x + dir.x * L * sp.persp;
      const ay = sp.y - dir.y * L * sp.persp;

      // encode |B| with color + opacity
      const col = colorRamp(norm);
      const depthFade = clamp((camera - sp.z) / camera, 0.35, 1);
      const alpha = depthFade * alphaFrom(norm);

      // shaft
      ctx.strokeStyle = col;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // head (kept proportional to L so arrows don’t look like tiny triangles)
      const angle = Math.atan2(ay - sp.y, ax - sp.x);
      const headLength = Math.max(8, L * 0.22);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - headLength * Math.cos(angle - Math.PI / 6), ay - headLength * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ax - headLength * Math.cos(angle + Math.PI / 6), ay - headLength * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();

      // reset alpha for safety
      ctx.globalAlpha = 1;
    });

    // axes
    ctx.strokeStyle = "rgba(226, 232, 240, 0.65)";
    ctx.lineWidth = 2;
    const axisLen = scale * 1.05;
    const axes = [
      { dir: { x: 1, y: 0, z: 0 }, label: "x" },
      { dir: { x: 0, y: 1, z: 0 }, label: "y" },
      { dir: { x: 0, y: 0, z: 1 }, label: "z" },
    ];
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillStyle = "#e2e8f0";
    axes.forEach(({ dir, label }) => {
      const rd = rotateYawPitch(dir, yaw, pitch);
      const persp = camera / (camera - rd.z);
      const ex = center.x + rd.x * axisLen * persp;
      const ey = center.y - rd.y * axisLen * persp;
      ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillText(label, ex + 4, ey - 4);
    });

    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillStyle = "#cbd5f5";
    ctx.fillText("drag to orbit", 16, size.height - 18);
  }, [size, yaw, pitch, fieldVectors, showSource, config, loopRadius, tiltAngle, solenoidTurns, pairSeparation, pairMode, currentSign]);

  return (
    <div className="canvas-card" style={{ marginTop: 18 }}>
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: "grab", touchAction: "none" }}
      />
      <div className="field-explorer-controls">
        <div className="field-explorer-row">
          <span className="field-explorer-label">Configuration</span>
          <div className="field-explorer-chip-row">
            <button type="button" className={`field-chip ${config === "loop" ? "active" : ""}`} onClick={() => setConfig("loop")}>Current loop</button>
            <button type="button" className={`field-chip ${config === "wire" ? "active" : ""}`} onClick={() => setConfig("wire")}>Straight wire</button>
            <button type="button" className={`field-chip ${config === "dipole" ? "active" : ""}`} onClick={() => setConfig("dipole")}>Bar magnet</button>
            <button type="button" className={`field-chip ${config === "pair" ? "active" : ""}`} onClick={() => setConfig("pair")}>Two magnets</button>
            <button type="button" className={`field-chip ${config === "solenoid" ? "active" : ""}`} onClick={() => setConfig("solenoid")}>Solenoid</button>
          </div>
        </div>

        <div className="field-explorer-grid">
          <div>
            <label htmlFor="density-slider">Sample density</label>
            <input id="density-slider" type="range" min="4" max="10" step="1" value={density}
              onChange={(e) => setDensity(parseInt(e.target.value, 10))} />
            <div className="field-explorer-value">{density} × {density} × {density}</div>
          </div>

          {(config === "loop") && (
            <>
              <div>
                <label htmlFor="tilt-slider">Tilt / orientation</label>
                <input id="tilt-slider" type="range" min="-45" max="60" step="1" value={tiltAngle}
                  onChange={(e) => setTiltAngle(parseFloat(e.target.value))} />
                <div className="field-explorer-value">{tiltAngle.toFixed(0)}° about x-axis</div>
              </div>
            </>
          )}

          {config === "pair" && (
            <div>
              <label htmlFor="pair-separation">Magnet spacing</label>
              <input id="pair-separation" type="range" min="0.6" max="2.0" step="0.05" value={pairSeparation}
                onChange={(e) => setPairSeparation(parseFloat(e.target.value))} />
              <div className="field-explorer-value">{pairSeparation.toFixed(2)} units center-to-center</div>
              <div className="field-explorer-chip-row" style={{ marginTop: 8 }}>
                <button type="button" className={`field-chip ${pairMode === "parallel" ? "active" : ""}`} onClick={() => setPairMode("parallel")}>Same polarity</button>
                <button type="button" className={`field-chip ${pairMode === "anti" ? "active" : ""}`} onClick={() => setPairMode("anti")}>Opposite polarity</button>
              </div>
            </div>
          )}

          {config === "loop" && (
            <div>
              <label htmlFor="loop-radius">Loop radius</label>
              <input id="loop-radius" type="range" min="0.5" max="1.4" step="0.05" value={loopRadius}
                onChange={(e) => setLoopRadius(parseFloat(e.target.value))} />
              <div className="field-explorer-value">{loopRadius.toFixed(2)} units</div>
            </div>
          )}

          {config === "solenoid" && (
            <div>
              <label htmlFor="solenoid-turns">Turns</label>
              <input id="solenoid-turns" type="range" min="3" max="20" step="1" value={solenoidTurns}
                onChange={(e) => setSolenoidTurns(parseInt(e.target.value, 10))} />
              <div className="field-explorer-value">{solenoidTurns} stacked loops</div>
            </div>
          )}

          {(config === "loop" || config === "solenoid" || config === "wire") && (
            <div>
              <label>Current direction</label>
              <div className="field-explorer-chip-row">
                <button type="button" className={`field-chip ${currentSign === 1 ? "active" : ""}`} onClick={() => setCurrentSign(1)}>
                  {config === "wire" ? "+z (⊙)" : "CCW (⊙)"}
                </button>
                <button type="button" className={`field-chip ${currentSign === -1 ? "active" : ""}`} onClick={() => setCurrentSign(-1)}>
                  {config === "wire" ? "-z (⊗)" : "CW (⊗)"}
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="show-source">Source sketch</label>
            <input id="show-source" type="checkbox" checked={showSource} onChange={(e) => setShowSource(e.target.checked)} />
            <div className="field-explorer-value">{showSource ? "visible" : "hidden"}</div>
          </div>
        </div>

        <div className="field-explorer-caption">
          Colors/opacity encode |B|, from cool blues (weak) to warm gold (strong).
          Toggle “Source sketch” to see current distribution. ⊙ = +z  ⊗ = -z.
        </div>
      </div>
    </div>
  );
}
