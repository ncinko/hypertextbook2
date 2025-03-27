import React, { useEffect, useRef, useState } from "react";

export default function MomentumSimulation() {
  const canvasRef = useRef(null);
  const massesRef = useRef([]); // Array of mass objects
  const collidingPairsRef = useRef({}); // Tracks collision cooldowns for pairs (keyed by "id1-id2")
  const nextIdRef = useRef(0); // For assigning unique ids to masses
  const [growingMass, setGrowingMass] = useState(null);
  const holdStartRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const initialMassesAddedRef = useRef(false);
  let animationFrameId;

  // Helper: interpolate mass color between blue and red based on size
  function getMassColor(size) {
    const minSize = 2;
    const maxSize = 40;
    const t = (size - minSize) / (maxSize - minSize);
    const blue = [100, 149, 237]; // Cornflower blue
    const red = [220, 20, 60]; // Crimson
    const color = blue.map((b, i) => Math.round(b + t * (red[i] - b)));
    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  }

  // Handler to clear all masses
  function handleClear() {
    massesRef.current = [];
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 400;

    // On first mount, add two initial masses so the user sees an interactive canvas
    if (initialMassesAddedRef.current === false) {
      initialMassesAddedRef.current = true;
      massesRef.current.push(
        {
          id: nextIdRef.current++,
          x: 150,
          y: 200,
          size: 10,
          color: getMassColor(10),
          mass: 10,
          vx: 1,
          vy: 0,
        },
        {
          id: nextIdRef.current++,
          x: 450,
          y: 200,
          size: 10,
          color: getMassColor(10),
          mass: 10,
          vx: -1,
          vy: 0,
        }
      );
    }

    // Update collision cooldowns each frame:
    function updateCollisionCooldowns() {
      for (const key in collidingPairsRef.current) {
        collidingPairsRef.current[key] -= 1;
        if (collidingPairsRef.current[key] <= 0) {
          delete collidingPairsRef.current[key];
        }
      }
    }

    // Update positions and resolve collisions over a small dt
    function updatePhysics(dt) {
      // Update positions and handle wall collisions
      massesRef.current.forEach((mass) => {
        mass.x += mass.vx * dt;
        mass.y += mass.vy * dt;

        if (mass.x - mass.size < 0) {
          mass.x = mass.size;
          mass.vx = Math.abs(mass.vx);
        }
        if (mass.x + mass.size > canvas.width) {
          mass.x = canvas.width - mass.size;
          mass.vx = -Math.abs(mass.vx);
        }
        if (mass.y - mass.size < 0) {
          mass.y = mass.size;
          mass.vy = Math.abs(mass.vy);
        }
        if (mass.y + mass.size > canvas.height) {
          mass.y = canvas.height - mass.size;
          mass.vy = -Math.abs(mass.vy);
        }
      });

      // Resolve collisions with iterative sub-steps
      resolveCollisions();
      updateCollisionCooldowns();
    }

    // Resolve collisions with a cooldown for each pair
    function resolveCollisions() {
      const iterations = 5;
      const collisionCooldownFrames = 3; // Frames to skip collision resolution after a collision
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < massesRef.current.length; i++) {
          for (let j = i + 1; j < massesRef.current.length; j++) {
            const mass1 = massesRef.current[i];
            const mass2 = massesRef.current[j];
            const dx = mass2.x - mass1.x;
            const dy = mass2.y - mass1.y;
            const distance = Math.hypot(dx, dy);
            const minDist = mass1.size + mass2.size; // Using size as the radius
            if (distance < minDist && distance !== 0) {
              // Create a unique key for this pair (order the ids)
              const key =
                mass1.id < mass2.id
                  ? `${mass1.id}-${mass2.id}`
                  : `${mass2.id}-${mass1.id}`;
              if (collidingPairsRef.current[key] && collidingPairsRef.current[key] > 0) {
                // Skip this collision if the pair is still in cooldown
                continue;
              }
              // Compute the collision normal
              const nx = dx / distance;
              const ny = dy / distance;

              // Compute relative velocity along the collision normal
              const vxRel = mass2.vx - mass1.vx;
              const vyRel = mass2.vy - mass1.vy;
              const velAlongNormal = vxRel * nx + vyRel * ny;
              if (velAlongNormal < 0) {
                const restitution = 1; // perfectly elastic
                const impulse =
                  (-(1 + restitution) * velAlongNormal) /
                  (1 / mass1.mass + 1 / mass2.mass);
                const impulseX = impulse * nx;
                const impulseY = impulse * ny;
                mass1.vx -= impulseX / mass1.mass;
                mass1.vy -= impulseY / mass1.mass;
                mass2.vx += impulseX / mass2.mass;
                mass2.vy += impulseY / mass2.mass;
              }

              // Set a cooldown so that this pair won't trigger another collision resolution immediately
              collidingPairsRef.current[key] = collisionCooldownFrames;
            }
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw each mass
      massesRef.current.forEach((mass) => {
        ctx.fillStyle = mass.color;
        ctx.beginPath();
        ctx.arc(mass.x, mass.y, mass.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw the growing mass (if any)
      if (growingMass) {
        ctx.fillStyle = growingMass.color;
        ctx.beginPath();
        ctx.arc(growingMass.x, growingMass.y, growingMass.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Use sub-stepping: perform multiple physics updates per frame
      const subSteps = 5;
      const dt = 1 / subSteps; // Smaller time step per sub-step
      for (let i = 0; i < subSteps; i++) {
        updatePhysics(dt);
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [growingMass]);

  // Helper: get mouse position relative to canvas
  function getMousePos(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  // Grow a new mass while mouse is held down
  function growMass() {
    if (holdStartRef.current) {
      const holdDuration = (Date.now() - holdStartRef.current) / 1000;
      const newSize = Math.min(40, 5 + holdDuration * 10);
      setGrowingMass((prev) =>
        prev ? { ...prev, size: newSize, color: getMassColor(newSize) } : null
      );
      requestAnimationFrame(growMass);
    }
  }

  // On mouse down, start creating a new mass
  function handleMouseDown(event) {
    holdStartRef.current = Date.now();
    const { x, y } = getMousePos(event);
    startPosRef.current = { x, y };
    setGrowingMass({ x, y, size: 5, color: getMassColor(5) });
    requestAnimationFrame(growMass);
  }

  // On mouse up, finalize the new mass with an initial velocity from the drag
  function handleMouseUp(event) {
    if (growingMass) {
      const { x, y } = getMousePos(event);
      const dx = x - startPosRef.current.x;
      const dy = y - startPosRef.current.y;
      const velocityScale = 0.05;
      const vx = dx * velocityScale;
      const vy = dy * velocityScale;
      massesRef.current.push({
        ...growingMass,
        id: nextIdRef.current++,
        mass: growingMass.size, // Use size as a proxy for mass
        vx,
        vy,
      });
      setGrowingMass(null);
    }
    holdStartRef.current = null;
  }

  return (
    <div className="container flex flex-col items-center">
      <div className="controls mb-4">
        <button className= "modern-button"
          onClick={handleClear}
        >
          Clear Masses
        </button>
      </div>
      <div className="canvas-container">
        <div className="momentum-simulation-container">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            style={{ border: "1px solid #ccc", background: "#fff" }}
          ></canvas>
        </div>
      </div>
    </div>
  );
}
