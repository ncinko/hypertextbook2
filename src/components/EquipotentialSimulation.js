import React, { useEffect, useRef } from "react";

const EquipotentialSimulation = () => {
  const canvasRef = useRef(null);
  const width = 500;
  const height = 300;
  const k = 9e9; // Coulomb's constant

  // Define two charges for the simulation (same as in ElectricFieldSimulation)
  const charges = [
    { x: 150, y: 150, q: 1e-6 },  // positive charge
    { x: 350, y: 150, q: -1e-6 }  // negative charge
  ];

  // Function to compute the electric potential at a given point (x, y)
  const computePotential = (x, y) => {
    let V = 0;
    for (const charge of charges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 5) continue; // avoid singularities near the charge
      V += k * charge.q / r;
    }
    return V;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    // Define equipotential levels (in volts) to display.
    // These levels can be adjusted depending on the charge configuration.
    const levels = [];
    for (let V = -20000; V <= 20000; V += 2000) {
      levels.push(V);
    }
    const tolerance = 100; // How close (in volts) a point's potential must be to a level to be drawn

    // Loop over a grid of points on the canvas for high resolution.
    const spacing = 5;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        const V = computePotential(x, y);
        // If the computed potential is within the tolerance of any level, plot a small dot.
        for (const level of levels) {
          if (Math.abs(V - level) < tolerance) {
            ctx.fillRect(x, y, 1, 1);
            break;
          }
        }
      }
    }

    // Draw the charges on the canvas.
    for (const charge of charges) {
      ctx.beginPath();
      ctx.arc(charge.x, charge.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = charge.q > 0 ? "red" : "blue";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
    }
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: "1px solid #ccc" }}
      />
    </div>
  );
};

export default EquipotentialSimulation;
