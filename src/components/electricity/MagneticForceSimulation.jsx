import React, { useEffect, useRef, useState } from "react";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const defaultSettings = {
  fieldStrength: 0.6, // tesla (arbitrary scale)
  direction: "out", // out of the page
  launchSpeed: 140, // pixels per second
  charge: 1, // elementary charges
  mass: 1.2, // arbitrary mass units
};

function ControlSlider({ label, value, min, max, step, onChange, unit }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: "#1f2b6c", marginBottom: 4 }}>
        {label}
        <span style={{ fontWeight: 600 }}>{` ${value.toFixed ? value.toFixed(2) : value}`}</span>
        {unit ? <span style={{ color: "#5f6f9e" }}>{` ${unit}`}</span> : null}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
      />
    </label>
  );
}

function DirectionToggle({ direction, onToggle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: "#1f2b6c", marginBottom: 6 }}>Field Direction</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { key: "out", label: "Out of page", symbol: "\u2299" },
          { key: "in", label: "Into page", symbol: "\u2297" },
        ].map((option) => (
          <button
            key={option.key}
            onClick={() => onToggle(option.key)}
            style={{
              flex: 1,
              padding: "6px 8px",
              borderRadius: 8,
              border: direction === option.key ? "2px solid #4c6ef5" : "1px solid #c7d2ff",
              background: direction === option.key ? "#eef2ff" : "#f8f9ff",
              color: "#152559",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18, marginRight: 6 }}>{option.symbol}</span>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MagneticForceSimulation() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);
  const particlesRef = useRef([]);
  const settingsRef = useRef(defaultSettings);

  const [settings, setSettings] = useState(defaultSettings);
  const [size, setSize] = useState({ width: 640, height: 420 });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const computeSize = () => {
      const parent = canvas.parentElement;
      const width = parent ? clamp(parent.getBoundingClientRect().width, 320, 760) : 640;
      return { width: Math.round(width), height: Math.round(width * 0.65) };
    };

    const updateSize = () => setSize(computeSize());
    updateSize();

    const handleResize = () => updateSize();
    window.addEventListener("resize", handleResize);

    let observer;
    if (canvas.parentElement && "ResizeObserver" in window) {
      observer = new ResizeObserver(updateSize);
      observer.observe(canvas.parentElement);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (observer) observer.disconnect();
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

    ctx.fillStyle = "#040712";
    ctx.fillRect(0, 0, size.width, size.height);

    particlesRef.current = [];
    for (let i = 0; i < 18; i++) {
      spawnParticle();
    }
    lastTimeRef.current = null;

    cancelAnimationFrame(animationRef.current);
    const loop = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.032);
      lastTimeRef.current = timestamp;

      evolveParticles(dt, ctx, size);
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationRef.current);
  }, [size.width, size.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointer = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      spawnParticle({ x, y });
    };

    const handleClick = (event) => {
      handlePointer(event.clientX, event.clientY);
    };

    const handleTouch = (event) => {
      for (const touch of event.changedTouches) {
        handlePointer(touch.clientX, touch.clientY);
      }
      event.preventDefault();
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });

    return () => {
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleTouch);
    };
  }, [size]);

  const spawnParticle = (override = {}) => {
    const { launchSpeed, charge, mass } = settingsRef.current;
    const width = size.width;
    const height = size.height;

    const angle = (Math.random() * Math.PI) / 6 - Math.PI / 12;
    const speed = launchSpeed * (0.8 + Math.random() * 0.4);
    const vx = speed * Math.cos(angle);
    const vy = speed * Math.sin(angle);

    const x = override.x ?? (Math.random() < 0.5 ? width * 0.18 : width * 0.82);
    const y = override.y ?? Math.random() * height * 0.8 + height * 0.1;
    const chargeSign = override.charge ?? (Math.random() > 0.5 ? 1 : -1) * Math.sign(charge || 1);
    const hue = chargeSign > 0 ? 200 : 12;

    particlesRef.current.push({
      x,
      y,
      vx: chargeSign > 0 ? vx : -vx,
      vy,
      charge: chargeSign * Math.max(Math.abs(charge), 0.05),
      mass: Math.max(0.2, mass),
      hue,
    });
  };

  const evolveParticles = (dt, ctx, dims) => {
    const { fieldStrength, direction } = settingsRef.current;
    const Bz = fieldStrength * (direction === "out" ? 1 : -1);

    ctx.fillStyle = "rgba(4, 7, 18, 0.2)";
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const chargeToMass = p.charge / p.mass;

      const ax = chargeToMass * p.vy * Bz;
      const ay = -chargeToMass * p.vx * Bz;

      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      ctx.beginPath();
      ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, 0.4)`;
      ctx.lineWidth = 1.6;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.08, p.y - p.vy * 0.08);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, 0.9)`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 75%, 0.9)`;
      ctx.shadowBlur = 14;
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (p.x < -50 || p.x > dims.width + 50 || p.y < -50 || p.y > dims.height + 50) {
        particles.splice(i, 1);
        spawnParticle();
      }
    }

    ctx.restore();

    drawFieldOverlay(ctx, dims, Bz);
  };

  const drawFieldOverlay = (ctx, dims, Bz) => {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(160, 178, 255, 0.35)";
    const spacing = 64;

    for (let x = spacing / 2; x < dims.width; x += spacing) {
      for (let y = spacing / 2; y < dims.height; y += spacing) {
        ctx.beginPath();
        if (Math.abs(Bz) < 0.02) {
          ctx.fillStyle = "rgba(200, 205, 230, 0.3)";
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (Bz > 0) {
          ctx.strokeStyle = "rgba(240, 170, 255, 0.45)";
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(240, 170, 255, 0.45)";
          ctx.fill();
        } else {
          ctx.strokeStyle = "rgba(120, 200, 255, 0.45)";
          ctx.moveTo(x - 6, y - 6);
          ctx.lineTo(x + 6, y + 6);
          ctx.moveTo(x - 6, y + 6);
          ctx.lineTo(x + 6, y - 6);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  };

  const resetSimulation = () => {
    particlesRef.current = [];
    for (let i = 0; i < 18; i++) {
      spawnParticle();
    }
  };

  return (
    <div
      style={{
        border: "1px solid #d1d9ff",
        borderRadius: 16,
        padding: 16,
        background: "linear-gradient(135deg, #f8f9ff 0%, #eef3ff 100%)",
        boxShadow: "0 12px 30px rgba(31, 59, 123, 0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: `${size.height}px`,
            borderRadius: 12,
            background: "#040712",
            touchAction: "none",
            cursor: "crosshair",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <ControlSlider
            label="Magnetic field"
            value={settings.fieldStrength}
            min={0}
            max={1.5}
            step={0.05}
            unit="T"
            onChange={(value) => setSettings((prev) => ({ ...prev, fieldStrength: value }))}
          />
          <ControlSlider
            label="Launch speed"
            value={settings.launchSpeed}
            min={40}
            max={220}
            step={5}
            unit="px/s"
            onChange={(value) => setSettings((prev) => ({ ...prev, launchSpeed: value }))}
          />
          <ControlSlider
            label="Charge"
            value={settings.charge}
            min={-3}
            max={3}
            step={0.1}
            unit="q"
            onChange={(value) => setSettings((prev) => ({ ...prev, charge: value }))}
          />
          <ControlSlider
            label="Mass"
            value={settings.mass}
            min={0.2}
            max={3}
            step={0.1}
            unit="m"
            onChange={(value) => setSettings((prev) => ({ ...prev, mass: value }))}
          />
        </div>
        <DirectionToggle
          direction={settings.direction}
          onToggle={(direction) => setSettings((prev) => ({ ...prev, direction }))}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={resetSimulation}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #4c6ef5",
              background: "#4c6ef5",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Reset particles
          </button>
          <button
            onClick={() => spawnParticle()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #1f3b7b",
              background: "#f4f6ff",
              color: "#1f2b6c",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Launch one more
          </button>
          <div style={{ fontSize: 12, color: "#5f6f9e", alignSelf: "center" }}>
            Tip: tap or click anywhere on the canvas to inject a particle from that spot.
          </div>
        </div>
      </div>
    </div>
  );
}
