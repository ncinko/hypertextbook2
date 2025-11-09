import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import MagneticForceSimulation from "../components/electricity/MagneticForceSimulation";
import HiddenExposition from "../components/shared/HiddenExposition";
import HiddenQuestion from "../components/shared/HiddenQuestion";

const chipStyle = {
  display: "inline-block",
  border: "1px solid #dde1ff",
  borderRadius: "999px",
  padding: "4px 12px",
  margin: "4px 6px",
  fontSize: 12,
  background: "#f4f6ff",
};

export default function MagneticForce() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Magnetic Force</h1>

          <h2>Introduction</h2>
          <p>
            When charged particles move through a magnetic field they experience the Lorentz force,
            <MathJax inline>{" \\(\\vec{\\mathbf F} = q(\\vec{\\mathbf v} \\times \\vec{\\mathbf B})\\)"}</MathJax>.
            The resulting force is always perpendicular to the velocity, bending beams of electrons
            in cathode-ray tubes, steering ions inside cyclotrons, and painting glowing arcs across the sky.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Magnitude</strong>
              <span>
                The magnitude of the force is given by
                <MathJax inline>{" \\( F = |q|vB\\sin(\\theta) \\)"}</MathJax>, where
                <MathJax inline>{" \\(\\theta\\)"}</MathJax> is the angle between velocity and field.
                The force is largest when the motion is perpendicular to the field and zero when moving
                parallel or antiparallel.
              </span>
            </li>
            
            <li>
              <strong>Direction</strong>
              <span>
                Placing your (right hand) pointer finger along <MathJax inline>{"\\(\\vec{\\mathbf v}\\)"}</MathJax> and your middle finger along
                <MathJax inline>{" \\(\\vec{\\mathbf B}\\)"}</MathJax>, your thumb points in the direction of the force for a positive charge.
                Negative charges experience the opposite force.
              </span>
            </li>
            <li>
              <strong>Radius encodes momentum</strong>
              <span>
                For a uniform field and speed <MathJax inline>{"\\(v\\)"}</MathJax>, the trajectory radius is
                <MathJax inline>{" \\( r = \\frac{mv}{|q|B} \\)"}</MathJax>.  Lower momentum or stronger field tightens the curvature.
              </span>
            </li>
          </ul>

          <h2>Charged particle playground</h2>
          <p>
            Explore how mass, charge, speed, and field shape the trajectories of particles.
            The simulation below only includes magnetostatic forces with the external field.  Particle-particle interactions are ignored.
          </p>

          <MagneticForceSimulation />

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>Swap the field direction to reverse curvature</span>
            <span style={chipStyle}>Decrease the field to watch radius expand</span>
            <span style={chipStyle}>Tap the canvas to inject new particles</span>
          </div>

          <HiddenExposition title="Why does the speed stay constant?">
            <p>
              The magnetic force is always perpendicular to the particle's velocity. Work requires a component of force parallel to displacement, but
              <MathJax inline>{" \\(\\vec{\\mathbf F} \\cdot \\vec{\\mathbf v} = 0 \\) "}</MathJax>. Energy therefore remains constant and the particle's speed does not change.
            </p>
          </HiddenExposition>

          <HiddenExposition title="Why is the trajectory a circle?">
            <p>
              When the velocity is perpendicular to a uniform magnetic field, the force has constant magnitude <MathJax inline>{"\\(F = |q|vB\\sin(90^\\circ)\\)"}</MathJax> and
              is orthogonal to the velocity. This is exactly the condition for uniform circular motion.
            </p>
            <p>The radius can be found by equating the magnetic force to the net force under centripetal acceleration:</p>
            <MathJax>
              {`\\[ |q|vB = \\frac{mv^2}{r} \\implies r = \\frac{mv}{|q|B} \\]`}
            </MathJax>
            <p>
              If the velocity has a component parallel to the field, that part of the motion remains unaffected by the magnetic force.
              The resulting trajectory is a helix, spiraling around the field lines while advancing along them.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A proton enters a <MathJax inline>{"\\(0.80\\,\\text{T}\\)"}</MathJax> field at
                  <MathJax inline>{" \\(3.0\\times10^5\\,\\text{m/s}\\)"}</MathJax>. What radius of curvature do you expect?
                </span>
              }
            >
              <MathJax>
                {`Use \\( r = \\frac{mv}{|q|B} \\). With \\( m_p = 1.67\\times10^{-27}\\,\\text{kg} \\),
                \\( q = 1.60\\times10^{-19}\\,\\text{C} \\), and the stated values, \\(r = \\frac{(1.67\\times10^{-27})(3.0\\times10^5)}{(1.60\\times10^{-19})(0.80)} \\approx 3.9\\,\\text{cm}. \\)`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  If the magnetic field is doubled, how does that affect the radius and period of the motion?
                </span>
              }
            >
              <MathJax>
                {`Doubling \\(B\\) halves the radius since \\( r \\propto \\frac{1}{B} \\).
                The period is also halved because \\( T \\propto \\frac{1}{B} \\).`}
              </MathJax>
            </HiddenQuestion>
            <HiddenQuestion
              title={
                <span>
                  If you see electrons curving clockwise, which direction is the magnetic field pointing?
                </span>
              }
            >
              <MathJax>
                {`As seen from above the page (or screen), the magnetic field must be pointing into the page.  To confirm this, place your pointer finger
                along the velocity (let's say to the right), your middle finger into the page, and your thumb will point up.
                Since electrons are negative, the force is downward, causing clockwise curvature.`}
              </MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
