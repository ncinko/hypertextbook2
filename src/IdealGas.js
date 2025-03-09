// src/IdealGas.js
import React, { useState, useRef, useEffect } from 'react';
import Sketch from 'react-p5';
import { Link } from 'react-router-dom';
import './styles.css';

export default function IdealGas() {
  const [temperature, setTemperature] = useState(50);
  const numParticles = 1000;
  const particlesRef = useRef([]);

  const initializeParticles = (p5, width, height) => {
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const r = 1;
      const x = p5.random(r, width - r);
      const y = p5.random(r, height - r);
      const speed = 50;
      const angle = p5.random(0, 2 * Math.PI);
      const vx = speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);
      particles.push({ x, y, vx, vy, r });
    }
    particlesRef.current = particles;
  };

  // Responsive Simulation Canvas
  // In setupSim, use the parent's bounding rect for a more reliable width
const setupSim = (p5, canvasParentRef) => {
  const resizeCanvasToParent = () => {
    const parentWidth = canvasParentRef.getBoundingClientRect().width;
    const canvasWidth = parentWidth || 600;
    const canvasHeight = canvasWidth / 1; // keep 3:2 aspect ratio
    p5.resizeCanvas(canvasWidth, canvasHeight);
  };

  const parentWidth = canvasParentRef.getBoundingClientRect().width;
  const canvasWidth = parentWidth || 600;
  const canvasHeight = canvasWidth / 1;
  const canvas = p5.createCanvas(canvasWidth, canvasHeight);
  canvas.parent(canvasParentRef);
  initializeParticles(p5, canvasWidth, canvasHeight);
  p5.loop();

  // Update canvas size on window resize
  p5.windowResized = resizeCanvasToParent;
};


  const drawSim = (p5) => {
    p5.background(240);
    const width = p5.width;
    const height = p5.height;
    const dt = 0.016;
    const particles = particlesRef.current;

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < p.r) { p.x = p.r; p.vx *= -1; }
      if (p.x > width - p.r) { p.x = width - p.r; p.vx *= -1; }
      if (p.y < p.r) { p.y = p.r; p.vy *= -1; }
      if (p.y > height - p.r) { p.y = height - p.r; p.vy *= -1; }
    }

    // Collision detection between particles (simplified)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.r + p2.r;
        if (distSq < minDist * minDist) {
          let distance = Math.sqrt(distSq);
          if (distance === 0) distance = 1;
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minDist - distance;
          p1.x -= (overlap / 2) * nx;
          p1.y -= (overlap / 2) * ny;
          p2.x += (overlap / 2) * nx;
          p2.y += (overlap / 2) * ny;
          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot < 0) {
            const impulse = -2 * dot / 2;
            p1.vx += impulse * nx;
            p1.vy += impulse * ny;
            p2.vx -= impulse * nx;
            p2.vy -= impulse * ny;
          }
        }
      }
    }

    p5.fill(200, 0, 0);
    p5.noStroke();
    particles.forEach(p => p5.ellipse(p.x, p.y, p.r * 2, p.r * 2));
    p5.redraw();
  };

  // Responsive Histogram Canvas
  const setupHist = (p5, canvasParentRef) => {
    const resizeCanvasToParent = () => {
      const canvasWidth = canvasParentRef.offsetWidth || 400;
      p5.resizeCanvas(canvasWidth, canvasWidth);
    };

    const canvasWidth = canvasParentRef.offsetWidth || 400;
    p5.createCanvas(canvasWidth, canvasWidth).parent(canvasParentRef);
    p5.frameRate(30);
    p5.loop();

    p5.windowResized = resizeCanvasToParent;
  };

  const drawHist = (p5) => {
    p5.background(255);
    const particles = particlesRef.current;
    if (particles.length === 0) return;
    const speeds = particles.map(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy));
    const binCount = 20;
    const maxSpeed = 200;
    const bins = Array(binCount).fill(0);
    speeds.forEach(speed => {
      let bin = Math.floor((speed / maxSpeed) * binCount);
      if (bin >= binCount) bin = binCount - 1;
      bins[bin]++;
    });

    const barWidth = p5.width / binCount;
    const maxCount = Math.max(...bins);
    p5.fill(50, 100, 200);
    for (let i = 0; i < binCount; i++) {
      const barHeight = p5.map(bins[i], 0, maxCount, 0, p5.height - 40);
      p5.rect(i * barWidth, p5.height - barHeight, barWidth - 2, barHeight);
    }

    const sigma = temperature / Math.sqrt(2);
    const theoretical = (v) => (v / (sigma * sigma)) * Math.exp(-v * v / (2 * sigma * sigma));
    const sampleCount = 100;
    const theoreticalValues = [];
    for (let i = 0; i <= sampleCount; i++) {
      const v = (i / sampleCount) * maxSpeed;
      theoreticalValues.push({ v, value: theoretical(v) });
    }
    const maxTheoretical = Math.max(...theoreticalValues.map(pt => pt.value));
    const scaleFactor = (p5.height - 40) / maxTheoretical;
    p5.noFill();
    p5.stroke(0, 0, 0);
    p5.strokeWeight(1);
    p5.beginShape();
    theoreticalValues.forEach(pt => {
      const x = p5.map(pt.v, 0, maxSpeed, 0, p5.width);
      const y = p5.height - (pt.value * scaleFactor);
      p5.vertex(x, y);
    });
    p5.endShape();
  };

  const handleTemperatureChange = (e) => {
    const newTemp = parseFloat(e.target.value);
    setTemperature(newTemp);
    const particles = particlesRef.current;
    if (particles.length > 0) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed = newTemp;
        const angle = Math.random() * 2 * Math.PI;
        p.vx = speed * Math.cos(angle);
        p.vy = speed * Math.sin(angle);
      }
    }
  };

  return (
    <div className="container">
      <h1 style={{ fontSize: "2rem", fontWeight: "600", marginTop: "1rem", color: "#111" }}>2D Ideal Gas</h1>
      <div className="control-panel">
        <div className="slider-group">
          <div>
            <label>
              Temperature: {temperature.toFixed(0)}
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={temperature}
                onChange={handleTemperatureChange}
              />
            </label>
          </div>
        </div>
      </div>
      <div className="canvases">
        <div className="canvas">
          <Sketch setup={setupSim} draw={drawSim} />
        </div>
        <div className="canvas">
          <Sketch setup={setupHist} draw={drawHist} />
        </div>
      </div>
    </div>
  );
}
