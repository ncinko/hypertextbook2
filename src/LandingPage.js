import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './styles.css';

export default function LandingPage() {
  const canvasRef = useRef(null);
  const starsRef = useRef([
    { x: 150, y: 150, size: 8, color: '#bde5f4', vx: 0, vy: 0.15, mass: 4 },
    { x: 250, y: 150, size: 16, color: '#f5957a', vx: 0, vy: -0.1, mass: 8 }
  ]);
  const [growingStar, setGrowingStar] = useState(null);
  const holdStartRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  let animationFrameId;
  
  const G = 0.2;
  const maxDistance = 600;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

function updateStars() {
  let newStars = [];
  let mergedIndices = new Set(); // Tracks stars that were merged

  // Detect merging and create new stars
  starsRef.current.forEach((star, i) => {
    if (mergedIndices.has(i)) return; // Skip stars that have already merged

    let merged = false;

    for (let j = i + 1; j < starsRef.current.length; j++) {
      if (mergedIndices.has(j)) continue; // Skip already merged stars

      const other = starsRef.current[j];
      const dx = other.x - star.x;
      const dy = other.y - star.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = star.size / 2 + other.size / 2;

      if (distance < minDistance) {
        // Merge the two stars
        const totalMass = star.mass + other.mass;
        const newX = (star.x * star.mass + other.x * other.mass) / totalMass;
        const newY = (star.y * star.mass + other.y * other.mass) / totalMass;
        const newVX = (star.vx * star.mass + other.vx * other.mass) / totalMass;
        const newVY = (star.vy * star.mass + other.vy * other.mass) / totalMass;
        const newSize = Math.sqrt(star.size ** 2 + other.size ** 2); // Approximate size
        const newColor = getStarColor(newSize);

        newStars.push({ x: newX, y: newY, size: newSize, color: newColor, vx: newVX, vy: newVY, mass: totalMass });

        // Mark both merged stars so they aren't processed again
        mergedIndices.add(i);
        mergedIndices.add(j);
        merged = true;
        break;
      }
    }

    if (!merged) {
      newStars.push(star); // Add star if it didn't merge
    }
  });

  // Apply gravitational forces to updated stars
  starsRef.current = newStars.map(star => {
    let fx = 0;
    let fy = 0;

    newStars.forEach(other => {
      if (star !== other) {
        const dx = other.x - star.x;
        const dy = other.y - star.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > star.size / 2 + other.size / 2) { // Prevent singularities
          const force = (G * star.mass * other.mass) / (distance * distance);
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      }
    });

    star.vx += fx;
    star.vy += fy;
    star.x += star.vx;
    star.y += star.vy;

    if (Math.abs(star.x - 100) > maxDistance || Math.abs(star.y - 100) > maxDistance) {
      return null; // Remove stars that fly too far
    }

    return { ...star };
  }).filter(star => star !== null);
}



    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      starsRef.current.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      if (growingStar) {
        ctx.fillStyle = growingStar.color;
        ctx.beginPath();
        ctx.arc(growingStar.x, growingStar.y, growingStar.size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      updateStars();
      animationFrameId = requestAnimationFrame(animate);
    }
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [growingStar]);

  function getMousePos(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function getStarColor(size) {
  const minSize = 5;
  const maxSize = 20;
  const t = (size - minSize) / (maxSize - minSize);

  const blue = [173, 216, 230];  // Pale blue (small stars)
  const yellow = [255, 240, 200]; // Pale yellow (medium stars)
  const red = [240, 80, 0];       // Deep red (large stars)

  let color;
  if (t < 0.5) {
    // Interpolate between blue and yellow
    const t2 = t * 2; // Scale to [0,1] for this section
    color = blue.map((b, i) => Math.round(b + t2 * (yellow[i] - b)));
  } else {
    // Interpolate between yellow and red
    const t2 = (t - 0.5) * 2; // Scale to [0,1] for this section
    color = yellow.map((y, i) => Math.round(y + t2 * (red[i] - y)));
  }

  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}


  function growStar() {
    if (holdStartRef.current) {
      const holdDuration = (Date.now() - holdStartRef.current) / 1000;
      const newSize = Math.min(20, 5 + holdDuration * 5);
      setGrowingStar(prev => prev ? { ...prev, size: newSize, color: getStarColor(newSize) } : null);
      requestAnimationFrame(growStar);
    }
  }

  function handleMouseDown(event) {
    holdStartRef.current = Date.now();
    const { x, y } = getMousePos(event);
    startPosRef.current = { x, y };
    setGrowingStar({ x, y, size: 5, color: getStarColor(5) });
    requestAnimationFrame(growStar);
  }

  function handleMouseUp(event) {
    if (growingStar) {
      const { x, y } = getMousePos(event);
      const dx = x - startPosRef.current.x;
      const dy = y - startPosRef.current.y;
      
      const velocityScale = 0.01;
      const vx = dx * velocityScale;
      const vy = dy * velocityScale;
      
      starsRef.current.push({ ...growingStar, mass: growingStar.size / 2, vx, vy });
      setGrowingStar(null);
    }
    holdStartRef.current = null;
  }

  return (
    <div className="landing-container">
      <div className="binary-star-container">
        <canvas 
          ref={canvasRef} 
          className="binary-star-canvas" 
          onMouseDown={handleMouseDown} 
          onMouseUp={handleMouseUp}
        ></canvas>
      </div>
      <div className="hero-section">
        <h1 className="hero-title">Welcome to the Physics Nook</h1>
        <p className="hero-description">
          Explore interactive simulations of various physics topics.
        </p>
      </div>
      
      
    </div>
  );
}