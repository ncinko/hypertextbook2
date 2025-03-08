// src/IdealGas.js
import React, { useState, useRef } from 'react';
import Sketch from 'react-p5';
import { Link } from 'react-router-dom';
import './styles.css';

export default function IdealGas() {
  // Temperature slider state (controls average speed)
  const [temperature, setTemperature] = useState(1);
  const numParticles = 1000; // number of gas particles

  // Simulation state: an array of particles (each particle: {x, y, vx, vy, r})
  const particlesRef = useRef([]);

  // Initialize particles when simulation starts
  const initializeParticles = (p5, width, height) => {
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const r = 1; // radius of each particle
      const x = p5.random(r, width - r);
      const y = p5.random(r, height - r);
      // Set initial speed proportional to temperature (adjust scaling factor as needed)
      const speed = Math.sqrt(temperature);
      const angle = p5.random(0, 2 * Math.PI);
      const vx = speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);
      particles.push({ x, y, vx, vy, r });
    }
    particlesRef.current = particles;
  };

  // ===== Simulation Canvas (Ideal Gas) =====
  const setupSim = (p5, canvasParentRef) => {
    const canvas = p5.createCanvas(600, 400);
    canvas.parent(canvasParentRef);
    initializeParticles(p5, 600, 400);
  };

  const drawSim = (p5) => {
    p5.background(240);
    const width = p5.width;
    const height = p5.height;
    const dt = 0.016; // roughly 60 fps

    const particles = particlesRef.current;

    // Update particle positions and check wall collisions
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Wall collisions (elastic)
      if (p.x < p.r) { p.x = p.r; p.vx *= -1; }
      if (p.x > width - p.r) { p.x = width - p.r; p.vx *= -1; }
      if (p.y < p.r) { p.y = p.r; p.vy *= -1; }
      if (p.y > height - p.r) { p.y = height - p.r; p.vy *= -1; }
    }

    // Check collisions between particles (naive O(n²) loop)
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
      // Avoid division by zero if particles are exactly overlapping
      if (distance === 0) {
        distance = 1;
      }
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Position correction: push particles apart so they no longer overlap
      const overlap = minDist - distance;
      p1.x -= (overlap / 2) * nx;
      p1.y -= (overlap / 2) * ny;
      p2.x += (overlap / 2) * nx;
      p2.y += (overlap / 2) * ny;
      
      // Now resolve velocity (impulse) only if they are moving toward each other
      const dvx = p1.vx - p2.vx;
      const dvy = p1.vy - p2.vy;
      const dot = dvx * nx + dvy * ny;
      if (dot < 0) {
        // Simple impulse calculation for equal masses:
        const impulse = -2 * dot / 2;
        p1.vx += impulse * nx;
        p1.vy += impulse * ny;
        p2.vx -= impulse * nx;
        p2.vy -= impulse * ny;
      }
    }
  }
}


    // Draw particles as red circles
    p5.fill(200, 0, 0);
    p5.noStroke();
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      p5.ellipse(p.x, p.y, p.r * 2, p.r * 2);
    }
  };

  // ===== Histogram Canvas (Particle Energy Distribution) =====
  const setupHist = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef);
  };

  const drawHist = (p5) => {
  p5.background(255);
  const particles = particlesRef.current;
  if (particles.length === 0) return;
  
  // Compute speeds for each particle (sqrt(vx² + vy²))
  const speeds = particles.map(p => Math.sqrt(p.vx * p.vx + p.vy * p.vy));
  
  // Build a histogram of speeds
  const binCount = 20;
  const maxSpeed = 200;
  const bins = Array(binCount).fill(0);
  speeds.forEach(speed => {
    let bin = Math.floor((speed / maxSpeed) * binCount);
    if (bin >= binCount) bin = binCount - 1;
    bins[bin]++;
  });
  
  // Draw histogram bars
  const barWidth = p5.width / binCount;
  const maxCount = Math.max(...bins);
  p5.fill(50, 100, 200);
  for (let i = 0; i < binCount; i++) {
    const barHeight = p5.map(bins[i], 0, maxCount, 0, p5.height - 40);
    p5.rect(i * barWidth, p5.height - barHeight, barWidth - 2, barHeight);
  }
  
  // --- Overlay the Theoretical Curve ---
  // For a 2D Maxwell–Boltzmann speed distribution (with mass = 1 and k_B = 1),
  // one form (ignoring normalization) is: f(v) = (v / (sigma^2)) * exp(-v²/(2σ²))
  // where sigma is related to the temperature.
  const sigma = (temperature) / Math.sqrt(2);
  const theoretical = (v) => {
    return (v / (sigma * sigma)) * Math.exp(-v * v / (2 * sigma * sigma));
  };
  
  // Sample the theoretical function over the range of speeds
  const sampleCount = 100;
  const theoreticalValues = [];
  for (let i = 0; i <= sampleCount; i++) {
    const v = (i / sampleCount) * maxSpeed;
    const value = theoretical(v);
    theoreticalValues.push({ v, value });
  }
  
  // Scale the theoretical values to match the vertical scale of the histogram.
  // First, determine the maximum theoretical value.
  const maxTheoretical = Math.max(...theoreticalValues.map(pt => pt.value));
  const scaleFactor = (p5.height - 40) / maxTheoretical;
  
  // Draw the theoretical curve (in red)
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


  // When the temperature slider changes, reinitialize all particle velocities
  const handleTemperatureChange = (e) => {
    const newTemp = parseFloat(e.target.value);
    setTemperature(newTemp);
    const particles = particlesRef.current;
    if (particles.length > 0) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const speed = newTemp; // scaling factor for speed
        const angle = Math.random() * 2 * Math.PI;
        p.vx = speed * Math.cos(angle);
        p.vy = speed * Math.sin(angle);
      }
    }
  };

  return (
    <div className="container">
      <h1>2D Ideal Gas Simulation with Energy Histogram</h1>
      {/* Control Panel */}
      <div className="control-panel">
        <div className="slider-group">
          <div>
            <label>
              Temperature: {temperature.toFixed(2)}
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
      {/* Canvases: Simulation and Histogram Side by Side */}
      <div className="canvases">
        <div className="canvas">
          <Sketch setup={setupSim} draw={drawSim} />
        </div>
        <div className="canvas">
          <Sketch setup={setupHist} draw={drawHist} />
        </div>
      </div>
      <div className="back-link">
        <Link to="/">Back to Landing Page</Link>
      </div>
    </div>
  );
}
