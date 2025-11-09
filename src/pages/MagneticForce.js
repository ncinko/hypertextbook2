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
            <MathJax inline>{"\\(\\vec{\\mathbf F} = q(\\vec{\\mathbf v} \\times \\vec{\\mathbf B})\\)"}</MathJax>.
            The resulting motion is always perpendicular to the velocity, bending beams of electrons
            in cathode-ray tubes, steering ions inside cyclotrons, and painting glowing arcs across the
            aurora-filled sky.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Force is perpendicular to motion</strong>
              <span>
                Magnetic forces change a particle&apos;s direction but not its speed. The acceleration obeys
                <MathJax inline>{"\\(\\frac{d\\vec{\\mathbf v}}{dt} = \\frac{q}{m} (\\vec{\\mathbf v} \\times \\vec{\\mathbf B})\\)"}</MathJax>
                , leading to circular or helical paths.
              </span>
            </li>
            <li>
              <strong>Radius encodes momentum</strong>
              <span>
                For a uniform field and speed <MathJax inline>{"\\(v\\)"}</MathJax>, the trajectory radius is
                <MathJax inline>{"\\( r = \\frac{mv}{|q|B} \\)"}</MathJax>. Bigger momentum or smaller field spreads the arc.
              </span>
            </li>
            <li>
              <strong>Handedness tracks charge sign</strong>
              <span>
                Right-hand rules still apply: point your thumb along velocity and curl toward the field.
                Positively charged particles deflect in that sense, while negative charges follow the opposite spiral.
              </span>
            </li>
          </ul>

          <h2>Charged particle playground</h2>
          <p>
            Explore how particle mass, charge, launch speed, and field direction sculpt the trajectories.
            The simulation below injects both positive and negative charges into a uniform field.
            Trails fade over time to highlight curvature and the difference in handedness for opposite charges.
          </p>

          <MagneticForceSimulation />

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>Swap the field direction to reverse curvature</span>
            <span style={chipStyle}>Lighten the field to watch radius expand</span>
            <span style={chipStyle}>Tap the canvas to seed particles anywhere</span>
          </div>

          <HiddenExposition title="Why does the speed stay constant?">
            <p>
              The magnetic force is always perpendicular to velocity because the cross product removes
              the parallel component. Work requires a component of force along displacement, but
              <MathJax inline>{"\\(\\vec{\\mathbf F} \\cdot \\vec{\\mathbf v} = 0\\)"}</MathJax>
              for magnetic forces. Energy therefore remains constant and the path is uniform circular motion with
              period <MathJax inline>{"\\( T = \\frac{2\\pi m}{|q|B} \\)"}</MathJax>.
            </p>
            <p>
              Increasing the field makes the perpendicular acceleration larger, shrinking the radius and time needed
              to sweep out a full circle. Conversely, heavier particles or faster beams resist bending, tracing wide arcs
              that particle physicists use to measure momenta inside bubble chambers.
            </p>
          </HiddenExposition>

          <h2>Questions to Ponder</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A proton enters a <MathJax inline>{"\\(0.80\\,\\text{T}\\)"}</MathJax> field at
                  <MathJax inline>{"\\(3.0\\times10^5\\,\\text{m/s}\\)"}</MathJax>. What radius of curvature do you expect?
                </span>
              }
            >
              <MathJax>
                {`Use \\( r = \\frac{mv}{|q|B} \\). With \\( m_p = 1.67\\times10^{-27}\\,\\text{kg} \\),
                \\( q = 1.60\\times10^{-19}\\,\\text{C} \\), and the stated values, \\n                r = \\frac{(1.67\\times10^{-27})(3.0\\times10^5)}{(1.60\\times10^{-19})(0.80)} \\approx 3.9\\,\\text{cm}. \\)`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  Why do electrons spiral inward when the launch point starts off-center in the simulation, even though the force
                  does no work?
                </span>
              }
            >
              <p>
                Off-center launches give the particle a velocity component toward or away from the canvas center. The magnetic
                force continuously bends that velocity, so the particle executes uniform circular motion about its instantaneous
                center. Because the simulation removes particles after they leave the viewing window, you see only a portion of
                the circle—looking like an inward spiral even though the speed stays constant.
              </p>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  Cyclotrons rely on alternating electric fields and a steady magnetic field. How does the radius formula guide
                  when to ramp the frequency of the accelerating voltage?
                </span>
              }
            >
              <p>
                As particles gain speed their radius grows proportionally to <MathJax inline>{"\\(v\\)"}</MathJax>, so the time
                to complete a semicircle increases. Engineers adjust the oscillating electric field to stay in phase with the
                arrival of the particles at the accelerating gap, matching <MathJax inline>{"\\( T = 2\\pi m/(|q|B) \\)"}</MathJax>
                as momentum climbs.
              </p>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
