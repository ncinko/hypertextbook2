import React, { useEffect, useMemo, useRef, useState } from "react";

const MU0 = 4 * Math.PI * 1e-7; // vacuum permeability
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const rotateAroundX = (vec, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: vec.x,
    y: vec.y * c - vec.z * s,
    z: vec.y * s + vec.z * c,
  };
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

  const rotatedBack = rotateAroundX(fieldLocal, tilt);
  return rotatedBack;
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
  const [size, setSize] = useState({ width: 560, height: 420 });
  const [config, setConfig] = useState("loop");
  const [density, setDensity] = useState(5);
  const [yaw, setYaw] = useState(0.65);
  const [pitch, setPitch] = useState(0.45);
  const [tiltAngle, setTiltAngle] = useState(20);
  const [pairSeparation, setPairSeparation] = useState(1.2);
  const [pairMode, setPairMode] = useState("anti");
  const [solenoidTurns, setSolenoidTurns] = useState(5);
  const [loopRadius, setLoopRadius] = useState(0.85);

  useEffect(() => {
    const computeSize = () => {
      const parent = canvasRef.current?.parentElement;
      const width = parent
        ? clamp(parent.getBoundingClientRect().width, 320, 900)
        : clamp(window.innerWidth - 48, 320, 900);
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

  const samplePoints = useMemo(() => {
    const n = Math.max(3, Math.floor(density));
    const extent = 1.2;
    const values = Array.from({ length: n }, (_, i) => ((i / (n - 1)) * 2 - 1) * extent);
    const pts = [];
    values.forEach((x) => {
      values.forEach((y) => {
        values.forEach((z) => {
          if (Math.hypot(x, y, z) < 0.05) return;
          pts.push({ x, y, z });
        });
      });
    });
    return pts;
  }, [density]);

  const fieldVectors = useMemo(() => {
    const momentVec = rotateAroundX({ x: 0, y: 0, z: 1 }, (tiltAngle * Math.PI) / 180);
    const computeField = (point) => {
      if (config === "loop") {
        return loopField(point, {
          radius: loopRadius,
          current: 1,
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
            current: 1,
            segments: 64,
            tiltDeg: tiltAngle,
            center,
          });
          total = addVec(total, loopB);
        }
        return total;
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

      return dipoles.reduce(
        (acc, dip) => addVec(acc, dipoleField(point, dip)),
        { x: 0, y: 0, z: 0 }
      );
    };

    return samplePoints.map((pt) => ({ point: pt, field: computeField(pt) }));
  }, [samplePoints, config, loopRadius, tiltAngle, solenoidTurns, pairSeparation, pairMode]);

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

    const gradient = ctx.createLinearGradient(0, 0, 0, size.height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#1e293b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    const gridSpacing = size.width / 10;
    for (let x = gridSpacing / 2; x < size.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.stroke();
    }
    for (let y = gridSpacing / 2; y < size.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.stroke();
    }

    const center = { x: size.width / 2, y: size.height / 2 };
    const scale = size.width * 0.26;
    const camera = 6;

    const magnitudes = fieldVectors.map((item) =>
      Math.hypot(item.field.x, item.field.y, item.field.z)
    );
    const maxMagnitude = Math.max(...magnitudes, 1e-6);

    fieldVectors.forEach(({ point, field }, index) => {
      const rotatedPoint = rotateYawPitch(point, yaw, pitch);
      const perspective = camera / (camera - rotatedPoint.z);
      const screenX = center.x + rotatedPoint.x * scale * perspective;
      const screenY = center.y - rotatedPoint.y * scale * perspective;

      const rotatedField = rotateYawPitch(field, yaw, pitch);
      const fieldMag = magnitudes[index];
      const norm = fieldMag / maxMagnitude;
      const arrowScale = clamp(norm * 120, 12, 110);
      const arrowX = screenX + rotatedField.x * arrowScale * perspective;
      const arrowY = screenY - rotatedField.y * arrowScale * perspective;

      const depthFade = clamp((camera - rotatedPoint.z) / camera, 0.35, 1);
      ctx.strokeStyle = colorRamp(norm);
      ctx.globalAlpha = depthFade;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(arrowX, arrowY);
      ctx.stroke();

      const angle = Math.atan2(arrowY - screenY, arrowX - screenX);
      const headLength = 10;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle - Math.PI / 6),
        arrowY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - headLength * Math.cos(angle + Math.PI / 6),
        arrowY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = colorRamp(norm);
      ctx.fill();

      ctx.globalAlpha = clamp(depthFade + 0.1, 0, 1);
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.beginPath();
      ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

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
      const rotated = rotateYawPitch(dir, yaw, pitch);
      const perspective = camera / (camera - rotated.z);
      const endX = center.x + rotated.x * axisLen * perspective;
      const endY = center.y - rotated.y * axisLen * perspective;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.fillText(label, endX + 4, endY - 4);
    });

    ctx.font = "14px 'Inter', sans-serif";
    ctx.fillStyle = "#cbd5f5";
    ctx.fillText("drag to orbit", 16, size.height - 18);
  }, [size, yaw, pitch, fieldVectors]);

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
            <button
              type="button"
              className={`field-chip ${config === "loop" ? "active" : ""}`}
              onClick={() => setConfig("loop")}
            >
              Current loop
            </button>
            <button
              type="button"
              className={`field-chip ${config === "dipole" ? "active" : ""}`}
              onClick={() => setConfig("dipole")}
            >
              Bar magnet
            </button>
            <button
              type="button"
              className={`field-chip ${config === "pair" ? "active" : ""}`}
              onClick={() => setConfig("pair")}
            >
              Two magnets
            </button>
            <button
              type="button"
              className={`field-chip ${config === "solenoid" ? "active" : ""}`}
              onClick={() => setConfig("solenoid")}
            >
              Solenoid
            </button>
          </div>
        </div>

        <div className="field-explorer-grid">
          <div>
            <label htmlFor="density-slider">Sample density</label>
            <input
              id="density-slider"
              type="range"
              min="4"
              max="7"
              step="1"
              value={density}
              onChange={(event) => setDensity(parseInt(event.target.value, 10))}
            />
            <div className="field-explorer-value">{density} × {density} × {density}</div>
          </div>

          <div>
            <label htmlFor="tilt-slider">Tilt / orientation</label>
            <input
              id="tilt-slider"
              type="range"
              min="-45"
              max="60"
              step="1"
              value={tiltAngle}
              onChange={(event) => setTiltAngle(parseFloat(event.target.value))}
            />
            <div className="field-explorer-value">{tiltAngle.toFixed(0)}° about x-axis</div>
          </div>

          {config === "pair" && (
            <div>
              <label htmlFor="pair-separation">Magnet spacing</label>
              <input
                id="pair-separation"
                type="range"
                min="0.6"
                max="2.0"
                step="0.05"
                value={pairSeparation}
                onChange={(event) => setPairSeparation(parseFloat(event.target.value))}
              />
              <div className="field-explorer-value">{pairSeparation.toFixed(2)} units center-to-center</div>
              <div className="field-explorer-chip-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className={`field-chip ${pairMode === "parallel" ? "active" : ""}`}
                  onClick={() => setPairMode("parallel")}
                >
                  Same polarity
                </button>
                <button
                  type="button"
                  className={`field-chip ${pairMode === "anti" ? "active" : ""}`}
                  onClick={() => setPairMode("anti")}
                >
                  Opposite polarity
                </button>
              </div>
            </div>
          )}

          {config === "loop" && (
            <div>
              <label htmlFor="loop-radius">Loop radius</label>
              <input
                id="loop-radius"
                type="range"
                min="0.5"
                max="1.4"
                step="0.05"
                value={loopRadius}
                onChange={(event) => setLoopRadius(parseFloat(event.target.value))}
              />
              <div className="field-explorer-value">{loopRadius.toFixed(2)} units</div>
            </div>
          )}

          {config === "solenoid" && (
            <div>
              <label htmlFor="solenoid-turns">Turns</label>
              <input
                id="solenoid-turns"
                type="range"
                min="3"
                max="9"
                step="1"
                value={solenoidTurns}
                onChange={(event) => setSolenoidTurns(parseInt(event.target.value, 10))}
              />
              <div className="field-explorer-value">{solenoidTurns} stacked loops</div>
            </div>
          )}
        </div>

        <div className="field-explorer-caption">
          Drag the view to orbit in 3D. Colors encode |B|, from cool blues (weak) to warm gold (strong). Try comparing the near
          field of a loop with the interior of a solenoid, or flip the polarity of the magnet pair to see where the neutral
          zone forms.
        </div>
      </div>
    </div>
  );
}
