import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import ElectricFieldSimulation from "../components/ElectricFieldSimulation"; // Adjust path if needed
import EquipotentialSimulation from "../components/EquipotentialSimulation"; // Adjust path if needed
import PointChargeUnitVectorDemo from "../components/PointChargeField";
import TwoPointChargeSuperposition from "../components/TwoPointChargeSimulation";

const chipStyle = {
  display: "inline-block",
  border: "1px solid #ddd",
  borderRadius: "999px",
  padding: "4px 10px",
  margin: "4px 6px",
  fontSize: 12,
  background: "#fafafa",
};

const ElectricFields = () => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const handleToggleAnswer1 = () => {
    setShowAnswer1(!showAnswer1);
  };

  const handleToggleAnswer2 = () => {
    setShowAnswer2(!showAnswer2);
  };

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Electric Fields</h1>

          <h2>Introduction</h2>
          <p>
            An <strong>electric field</strong> is the force per unit charge at a point in space. It describes what force a small positive test charge would feel if placed there. We define the electric field by
          </p>
          <MathJax inline>{" \\( \\qquad \\vec{\\mathbf E} = \\frac{\\vec{\\mathbf F}}{q_{\\text{test}}} \\),"}</MathJax>
          <p>
            where <MathJax inline>{"\\( \\vec{\\mathbf F} \\)"}</MathJax> is the force acting on a test charge <MathJax inline>{"\\( q_{\\text{test}} \\)"}</MathJax>.
          </p>

          <h2>Point Charge</h2>
          <p>In the presence of a single point charge, the electric field is</p>
          <MathJax inline>{"\\(\\qquad \\vec{\\mathbf E}= k \\frac{q}{r^2} \\hat{\\mathbf r} \\),"}</MathJax>
          <p>
            where <MathJax inline>{"\\( k \\)"}</MathJax> is Coulomb's constant and <MathJax inline>{"\\( q \\)"}</MathJax> is the charge (in Coulombs).
          </p>

{/* Collapsible check-understanding (details/summary), centered */}
<details style={{ textAlign: "center", marginTop: 8 }}>
  <summary
    style={{
      cursor: "pointer",
      fontWeight: 600,
      display: "inline-block",
      outline: "none",
    }}
  >
    Check understanding: do these two definitions of the electric field agree with Coulomb’s law?
  </summary>

  <div style={{ maxWidth: 720, margin: "12px auto 0", textAlign: "left" }}>
    <p style={{ marginTop: 0 }}>
      Start from Coulomb’s law for the force on a test charge, in the presence of a point charge:
    </p>
    <div style={{ textAlign: "center", margin: "6px 0" }}>
      <MathJax>{"\\(\\vec{\\mathbf F}=k\\,\\dfrac{q\\,q_{\\text{test}}}{r^2}\\,\\hat{\\mathbf r}\\)"}</MathJax>
    </div>

    <p>Divide both sides by the test charge to get the electric field:</p>
    <div style={{ textAlign: "center", margin: "6px 0" }}>
      <MathJax>{"\\(\\vec{\\mathbf E}=\\dfrac{\\vec{\\mathbf F}}{q_{\\text{test}}}=k\\,\\dfrac{q}{r^2}\\,\\hat{\\mathbf r}\\)"}</MathJax>
    </div>

    
  </div>
</details>


          <p>
            The vector <MathJax inline>{"\\( \\vec{\\mathbf r} \\)"}</MathJax> is directed from the charge's position to the "location of interest" where we are computing the field.
          </p>
          <p>
            This means the magnitude <MathJax inline>{" \\( r = \\lVert \\vec{\\mathbf r} \\rVert \\)"}</MathJax> is the distance (in meters) from the charge.
          </p>

          {/* Point-charge unit vector demo */}
          <div className="mathjax-container" style={{ marginTop: "0.75rem" }}>
            <p>
              The direction of <MathJax inline>{"\\( \\vec{\\mathbf E} \\)"}</MathJax> comes from the unit vector{" "}
              <MathJax inline>{" \\( \\hat{\\mathbf r} = \\dfrac{\\vec{\\mathbf r}}{\\lVert \\vec{\\mathbf r} \\rVert} \\)"}</MathJax>,
              which points from the source charge to the location of interest.
            </p>
            <p></p>
            <PointChargeUnitVectorDemo />

            {/* Try it card — centered */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
              <span style={chipStyle}>
                Double <MathJax inline>{"\\( q \\)"}</MathJax> → confirm <MathJax inline>{"\\( E \\propto q \\)"}</MathJax>
              </span>
              <span style={chipStyle}>
                Halve <MathJax inline>{"\\( r \\)"}</MathJax> → confirm <MathJax inline>{"\\( E \\propto 1/r^2 \\)"}</MathJax>
              </span>
              <span style={chipStyle}>
                Flip sign of <MathJax inline>{"\\( q \\)"}</MathJax> → field direction reverses
              </span>
            </div>
          </div>

          <h2>Superposition Principle</h2>
          <p>When multiple charges are present, the net electric field is the vector sum of the individual fields:</p>
          <MathJax inline>{"\\(\\qquad \\vec{\\mathbf{E}}_{\\text{net}} = \\sum_i \\vec{\\mathbf{E}}_i \\)"}</MathJax>
          <p>With two point charges, the net field is</p>
          <MathJax inline>{"\\(\\qquad \\vec{\\mathbf{E}}_{\\text{net}} =  \\vec{\\mathbf{E}}_1 + \\vec{\\mathbf{E}}_2 \\)"}</MathJax>
          <p></p>
          <TwoPointChargeSuperposition />

          {/* Try it card — centered */}
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>
              Place equal charges → find where <MathJax inline>{"\\( E=0 \\)"}</MathJax>
            </span>
            <span style={chipStyle}>Make a dipole (+q, −q) → describe the field shape</span>
          </div>

          <p>
            We often speak of <em>individual electric fields</em> due to each point charge. This makes the connection to Coulomb's law clearer, as we can compute the field from each charge separately and then add them up.
            In the long run, it is better to imagine that space is filled with a single electric field. This perspective emphasizes that the field is a property of space itself, shaped by the configuration of charges,
            rather than a set of separate “mini-fields” that coexist.
          </p>

          <h2>Electrodynamics</h2>

          <div className="mathjax-container">
            <p>
              The <span style={{ color: "green", fontWeight: "bold" }}>test charge</span> below experience a net force{" "}
            </p>
            <MathJax inline>{"\\(\\qquad \\vec{\\mathbf{F}}_{\\text{net}} = \\color{green}q_{\\text{test}}\\color{black}\\vec{\\mathbf{E}}_{\\text{net}}\\)"}</MathJax>
            <p>
              This simulation displays the electric field lines around point charges. You can interact with the charges to see how the field changes.
            </p>
            <ElectricFieldSimulation />

          </div>

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li onClick={handleToggleAnswer} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              Calculate the electric field 0.5 m away from a point charge of 2 µC.
            </li>
            {showAnswer && (
              <p>
                Using Coulomb's law <MathJax inline>{"\\( E = k \\frac{|q|}{r^2} \\)"}</MathJax>, with
                <MathJax inline>{"\\( k \\approx 9 \\times 10^9 \\)"}</MathJax> N·m²/C², <MathJax inline>{"\\( q = 2 \\times 10^{-6} \\)"}</MathJax> C,
                and <MathJax inline>{"\\( r = 0.5 \\)"}</MathJax> m, we find:
                <MathJax inline>{"\\( E \\approx 9 \\times 10^9 \\times \\frac{2 \\times 10^{-6}}{(0.5)^2} \\)"}</MathJax>,
                which simplifies to approximately <MathJax inline>{"\\( 72,000 \\)"}</MathJax> N/C.
              </p>
            )}

            <li onClick={handleToggleAnswer1} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              For two identical point charges of 1 µC placed 1 m apart, determine the net electric field at the midpoint.
            </li>
            {showAnswer1 && (
              <p>
                At the midpoint, the contributions from each charge are equal in magnitude but opposite in direction (if the charges are like-signed), resulting in a net electric field of
                <MathJax inline>{" \\( 0 \\)"}</MathJax> N/C.
              </p>
            )}

            <li onClick={handleToggleAnswer2} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              Why is the electric field inside a conductor at electrostatic equilibrium zero?
            </li>
            {showAnswer2 && (
              <p>
                In electrostatic equilibrium, free charges within a conductor redistribute themselves so that the internal electric field cancels out, ensuring that
                <MathJax inline>{" \\( \\vec{E} = 0 \\)"}</MathJax> inside the conductor.
              </p>
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default ElectricFields;
