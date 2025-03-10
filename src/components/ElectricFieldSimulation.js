import React, { useState, useEffect, useRef } from "react";

const ElectricFieldSimulation = () => {
  const canvasRef = useRef(null);
  const width = 500;
  const height = 300;
  const k = 9e9; // Coulomb's constant

  // Pre-defined configurations
  const dipoleConfig = [
    { x: 150, y: 150, q: 1e-6 },
    { x: 350, y: 150, q: -1e-6 }
  ];
  const capacitorConfig = () => {
    const plateYs = [50, 100, 150, 200, 250];
    const leftPlate = plateYs.map((y) => ({ x: 100, y, q: 1e-6 }));
    const rightPlate = plateYs.map((y) => ({ x: 400, y, q: -1e-6 }));
    return [...leftPlate, ...rightPlate];
  };

  // State for the currently selected configuration.
  const [configuration, setConfiguration] = useState("dipole");
  // Charges state.
  const [charges, setCharges] = useState(dipoleConfig);
  // For dragging a charge.
  const [draggingChargeIndex, setDraggingChargeIndex] = useState(null);
  // For dragging the test charge.
  const [draggingTestCharge, setDraggingTestCharge] = useState(false);
  // Controls whether the test charge animation is active.
  const [animateTestCharge, setAnimateTestCharge] = useState(false);

  // Initial test charge properties.
  const initialTestCharge = { x: 250, y: 100, vx: 0, vy: 0, q: 1e-8, m: 1e-6 };
  // We'll store the test charge in a ref so that its state updates without re-rendering.
  const testChargeRef = useRef({ ...initialTestCharge });

  // Acceleration scale factor to amplify the test charge motion.
  const accelerationScale = 10000;

  // Helper: Get mouse position relative to canvas.
  const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  };

  // Compute the net electric field at (x, y) from all charges.
  const computeField = (x, y, localCharges = charges) => {
    let Ex = 0;
    let Ey = 0;
    for (const charge of localCharges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const rSquared = dx * dx + dy * dy;
      const r = Math.sqrt(rSquared);
      if (r < 5) continue; // avoid singularity near the charge
      const E = k * charge.q / rSquared;
      Ex += E * (dx / r);
      Ey += E * (dy / r);
    }
    return { Ex, Ey };
  };

  // Updated drawArrow: fixed length arrow with opacity determined by field strength.
  const drawArrow = (ctx, fromX, fromY, toX, toY, opacity) => {
    const headLength = 8; // Increased arrowhead size
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    ctx.lineWidth = 2;
    // Set stroke and fill with the desired opacity.
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    // Draw the main line.
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    // Draw the arrowhead.
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Handle configuration change via dropdown.
  const handleConfigurationChange = (e) => {
    const newConfig = e.target.value;
    setConfiguration(newConfig);
    if (newConfig === "dipole") {
      setCharges(dipoleConfig);
    } else if (newConfig === "capacitor") {
      setCharges(capacitorConfig());
    }
    // Reset test charge.
    testChargeRef.current = { ...initialTestCharge };
  };

  // Mouse event handlers.
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getMousePos(canvas, e);

    // First, check if the click is near the test charge.
    const dxTest = x - testChargeRef.current.x;
    const dyTest = y - testChargeRef.current.y;
    if (Math.sqrt(dxTest * dxTest + dyTest * dyTest) < 8) {
      setDraggingTestCharge(true);
      return;
    }

    // Then check if the click is near an existing charge.
    const index = charges.findIndex((charge) => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      return Math.sqrt(dx * dx + dy * dy) < 10;
    });

    if (index !== -1) {
      setDraggingChargeIndex(index);
    } else {
      // If no charge was clicked, add a new charge.
      const newCharge = { x, y, q: e.shiftKey ? -1e-6 : 1e-6 };
      setCharges((prev) => [...prev, newCharge]);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const { x, y } = getMousePos(canvas, e);
    if (draggingTestCharge) {
      // Update test charge position and reset velocity.
      testChargeRef.current = { ...testChargeRef.current, x, y, vx: 0, vy: 0 };
    } else if (draggingChargeIndex !== null) {
      setCharges((prev) => {
        const newCharges = [...prev];
        newCharges[draggingChargeIndex] = { ...newCharges[draggingChargeIndex], x, y };
        return newCharges;
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingTestCharge(false);
    setDraggingChargeIndex(null);
  };

  // Reset simulation: clear charges and reset test charge.
  const resetSimulation = () => {
    // Reset based on current configuration.
    if (configuration === "dipole") {
      setCharges(dipoleConfig);
    } else if (configuration === "capacitor") {
      setCharges(capacitorConfig());
    }
    testChargeRef.current = { ...initialTestCharge };
    setAnimateTestCharge(false);
  };

  // Attach mouse event listeners to the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [draggingTestCharge, draggingChargeIndex, charges]);

  // Animation loop: update the test charge (if enabled) and redraw the simulation.
 // Inside your component's useEffect for animation:
useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    let mounted = true; // flag to track if component is still mounted
  
    const animate = (time) => {
      if (!mounted) return; // if the component has unmounted, exit the loop
  
      const canvas = canvasRef.current;
      // Check if canvas is available; if not, skip drawing.
      if (!canvas) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      const dt = (time - lastTime) / 1000; // dt in seconds
      lastTime = time;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
  
      // Draw electric field arrows on a grid.
      const spacing = 30;
      const arrowLength = 15; // fixed arrow length
      const opacityScale = 0.01; // scale factor to map field magnitude to opacity
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          const { Ex, Ey } = computeField(x, y);
          const E_mag = Math.sqrt(Ex * Ex + Ey * Ey);
          const angle = Math.atan2(Ey, Ex);
          const toX = x + arrowLength * Math.cos(angle);
          const toY = y + arrowLength * Math.sin(angle);
          const arrowOpacity = Math.min(1, E_mag * opacityScale);
          drawArrow(ctx, x, y, toX, toY, arrowOpacity);
        }
      }
  
      // Draw each user-placed charge.
      charges.forEach((charge) => {
        ctx.beginPath();
        ctx.arc(charge.x, charge.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = charge.q > 0 ? "red" : "blue";
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.stroke();
      });
  
      // Update and draw the test charge.
      let { x, y, vx, vy, q, m } = testChargeRef.current;
      if (animateTestCharge && !draggingTestCharge) {
        const { Ex, Ey } = computeField(x, y);
        const ax = (q / m) * Ex * accelerationScale;
        const ay = (q / m) * Ey * accelerationScale;
        vx = vx + ax * dt;
        vy = vy + ay * dt;
        x = x + vx * dt;
        y = y + vy * dt;
        testChargeRef.current = { x, y, vx, vy, q, m };
      }
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "green";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
  
      animationFrameId = requestAnimationFrame(animate);
    };
  
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      mounted = false; // signal that the component is unmounting
      cancelAnimationFrame(animationFrameId);
    };
  }, [charges, animateTestCharge, draggingTestCharge]);
  

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "0.5rem" }}>
        <label htmlFor="configuration">Select Configuration: </label>
        <select
          id="configuration"
          value={configuration}
          onChange={handleConfigurationChange}
        >
          <option value="dipole">Dipole</option>
          <option value="capacitor">Capacitor Plates</option>
        </select>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: "1px solid #ccc", cursor: "pointer" }}
      />
      <div style={{ marginTop: "0.5rem" }}>
        <button onClick={resetSimulation}>Reset Simulation</button>
      </div>
      <div style={{ marginTop: "0.5rem" }}>
        <button
          onClick={() => setAnimateTestCharge(true)}
          disabled={animateTestCharge}
        >
          {animateTestCharge
            ? "Test Charge Animating"
            : "Start Test Charge Animation"}
        </button>
      </div>
      <p style={{ marginTop: "0.5rem" }}>
        Click on a charge and drag to move it. Click on an empty space to add a new charge
        (hold <strong>Shift</strong> for a negative charge).<br />
      </p>
    </div>
  );
};

export default ElectricFieldSimulation;
