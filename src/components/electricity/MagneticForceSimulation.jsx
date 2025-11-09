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
    <div>
      <div style={{ fontSize: 13, color: "#1f2b6c", marginBottom: 6 }}>Field Direction</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { key: "out", label: "Out of page", symbol: "⊙" },
          { key: "in", label: "Into page", symbol: "⊗" },
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
  const [size, setSize] = useState({ width: 640, height: 480 });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const computeSize = () => {
      const parent = canvas.parentElement;
      // Take up more of the available width
      const parentWidth = parent ? parent.getBoundingClientRect().width : 760;
      const width = Math.round(parentWidth);
      // Adjust aspect ratio for a wider feel
      const height = Math.round(width * 0.6);
      return { width, height };
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
    // Ensure backing store and CSS pixels match 1:1 mapping for pointer coords
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = "#040712";
    ctx.fillRect(0, 0, size.width, size.height);

    // Start with a few particles
    particlesRef.current = [];
    for (let i = 0; i < 5; i++) launchRandomParticle();
    lastTimeRef.current = null;

    cancelAnimationFrame(animationRef.current);
    const loop = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
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

    // Exact CSS-pixel mapping
    const toCanvasXY = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const handlePointerDown = (event) => {
      const { x, y } = toCanvasXY(event.clientX, event.clientY);
      spawnParticle({ x, y });
      event.preventDefault();
    };

    const handleTouch = (event) => {
      for (const touch of event.changedTouches) {
        const { x, y } = toCanvasXY(touch.clientX, touch.clientY);
        spawnParticle({ x, y });
      }
      event.preventDefault();
    };

    // IMPORTANT: only pointer/touch — no "click" (which also fires after pointerup)
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("touchstart", handleTouch);
    };
  }, [size]);

  const spawnParticle = (override = {}) => {
    const currentSettings = settingsRef.current;
    const launchSpeed = override.launchSpeed ?? currentSettings.launchSpeed;
    const charge = override.charge ?? currentSettings.charge;
    const mass = override.mass ?? currentSettings.mass;

    const width = size.width;
    const height = size.height;

    const angle = 0;
    const speed = launchSpeed;
    const vx0 = speed * Math.cos(angle);
    const vy0 = speed * Math.sin(angle);

    // Exact user click if provided
    const x = override.x ?? Math.random() * width * 0.8 + width * 0.1;
    const y = override.y ?? Math.random() * height * 0.8 + height * 0.1;

    // Color mapping: RED for positive, BLUE for negative
    const chargeSign = Math.sign(charge);

    const hue = chargeSign > 0 ? 12 : 210; // red vs blue

    particlesRef.current.push({
      x,
      y,
      vx: chargeSign > 0 ? vx0 : -vx0,
      vy: vy0,
      charge: chargeSign * Math.max(Math.abs(charge), 0.05),
      mass: Math.max(0.2, mass),
      hue,
    });
  };

  const launchRandomParticle = () => {
    const randomCharge = (Math.random() * 6) - 3; // from -3 to 3
    const randomMass = Math.random() * 2.8 + 0.2; // from 0.2 to 3
    const randomSpeed = Math.random() * 180 + 40; // from 40 to 220

    spawnParticle({
        charge: randomCharge,
        mass: randomMass,
        launchSpeed: randomSpeed,
    });
  };

  // Energy-conserving velocity update in a uniform B-field (B along z): exact rotation by angle omega*dt
  const rotateVelocityInBz = (vx, vy, omega_dt) => {
    // rotation matrix [[cos, sin], [-sin, cos]]
    const c = Math.cos(-omega_dt);
    const s = Math.sin(-omega_dt);
    const vxNew = vx * c + vy * s;
    const vyNew = -vx * s + vy * c;
    return [vxNew, vyNew];
  };

  const evolveParticles = (dt, ctx, dims) => {
    const { fieldStrength, direction } = settingsRef.current;
    const Bz = fieldStrength * (direction === "out" ? 1 : -1);

    // Longer trails (slow fade)
    ctx.fillStyle = "rgba(4, 7, 18, 0.10)";
    ctx.fillRect(0, 0, dims.width, dims.height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const chargeToMass = p.charge / p.mass;

      // Exact velocity rotation under uniform B (no energy change)
      const omega = chargeToMass * Bz;
      if (Math.abs(omega) > 0) {
        [p.vx, p.vy] = rotateVelocityInBz(p.vx, p.vy, omega * dt);
      }

      const prevX = p.x;
      const prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Draw motion streak
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, 0.45)`;
      ctx.lineWidth = 1.6;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(prevX, prevY);
      ctx.stroke();

      // Particle "glow"
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, 0.9)`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 75%, 0.9)`;
      ctx.shadowBlur = 14;
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Cull when offscreen
      if (p.x < -50 || p.x > dims.width + 50 || p.y < -50 || p.y > dims.height + 50) {
        particles.splice(i, 1);
      }
    }

    ctx.restore();
  };

  const resetSimulation = () => {
    particlesRef.current = [];
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
          alignItems: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          style={{
            // IMPORTANT: give explicit CSS size to match our computed size (avoid stretch / aspect skew)
            width: `${size.width}px`,
            height: `${size.height}px`,
            borderRadius: 12,
            background: "#040712",
            touchAction: "none",
            cursor: "crosshair",
            display: "block",
          }}
        />
        <div
          style={{
            width: "100%",
            maxWidth: `${size.width}px`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            alignItems: "flex-start",
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
            unit=""
            onChange={(value) => setSettings((prev) => ({ ...prev, launchSpeed: value }))}
          />
          <ControlSlider
            label="Charge"
            value={settings.charge}
            min={-3}
            max={3}
            step={0.1}
            unit=""
            onChange={(value) => setSettings((prev) => ({ ...prev, charge: value }))}
          />
          <ControlSlider
            label="Mass"
            value={settings.mass}
            min={0.2}
            max={3}
            step={0.1}
            unit=""
            onChange={(value) => setSettings((prev) => ({ ...prev, mass: value }))}
          />

          <div style={{ gridColumn: "1" }}>
            <DirectionToggle
              direction={settings.direction}
              onToggle={(direction) => setSettings((prev) => ({ ...prev, direction }))}
            />
          </div>

          <div
            style={{
              gridColumn: "2 / -1",
              display: "flex",
              justifyContent: "center",
              gap: 12,
              width: "100%",
            }}
          >
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
              Reset
            </button>
            <button
              onClick={launchRandomParticle}
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
              Launch Random
            </button>
          </div>
        </div>
        <div style={{ width: "100%", maxWidth: `${size.width}px`, fontSize: 12, color: "#5f6f9e", textAlign: "center", marginTop: 8 }}>
          Tip: click/tap on the canvas to inject a particle exactly at the cursor location. Red = q &gt; 0, Blue = q &lt; 0.
        </div>
      </div>
    </div>
  );
}
