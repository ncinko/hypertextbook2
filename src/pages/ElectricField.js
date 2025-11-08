import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import ElectricFieldSimulation from "../components/electricity/ElectricFieldSimulation"; // Adjust path if needed
import EquipotentialSimulation from "../components/electricity/EquipotentialSimulation"; // Adjust path if needed
import PointChargeUnitVectorDemo from "../components/electricity/PointChargeField";
import TwoPointChargeSuperposition from "../components/electricity/TwoPointChargeSimulation";
import HiddenExposition from "../components/shared/HiddenExposition";

const chipStyle = {
  display: "inline-block",
  border: "1px solid #ddd",
  borderRadius: "999px",
  padding: "4px 10px",
  margin: "4px 6px",
  fontSize: 12,
  background: "#fafafa",
};

const ElectricField = () => {
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
            An <strong>electric field</strong> is the force per unit charge at a point in space.  We define the electric field by
          </p>
          <MathJax inline>{" \\( \\qquad \\vec{\\mathbf E} = \\frac{\\vec{\\mathbf F}}{q_{\\text{test}}} \\),"}</MathJax>
          <p>
            where <MathJax inline>{"\\( \\vec{\\mathbf F} \\)"}</MathJax> is the electric force acting on a test charge <MathJax inline>{"\\( q_{\\text{test}} \\)"}</MathJax>.  
            </p><p>In other words, this field describes the force a small, positive test charge would experience if placed at a particular location.
          </p>


          <h2>Point Charge</h2>
          <p>In the presence of a single point charge, the electric field is</p>
          <MathJax inline>{"\\(\\qquad \\vec{\\mathbf E}= k \\frac{q}{r^2} \\hat{\\mathbf r} \\),"}</MathJax>
          <p>
            where <MathJax inline>{"\\( k \\)"}</MathJax> is Coulomb's constant and <MathJax inline>{"\\( q \\)"}</MathJax> is the charge (in Coulombs).
          </p>

      <HiddenExposition title="Do these two definitions of the electric field agree with Coulomb’s law?">

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
          </HiddenExposition>








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

          <HiddenExposition title="Is there one electric field or many?">
          <p>
            We often speak of <em>individual electric fields</em> due to each point charge.  
            This is a useful mental model for making the connection to Coulomb's law and applying the superposition principle.
          </p>
          <p>  
            In the long run, it is better to imagine that space is filled with a single, unified electric field <MathJax inline>{"\\(\\vec{\\mathbf{E}}_{\\text{net}} \\)"}</MathJax>.
            This perspective emphasizes that the field is a property of space itself, shaped by the configuration of charges, rather than a set of separate “mini-fields” that coexist.  
            The field then determines the force on charges within that space, which predicts the subsequent motion according to Newton's laws, which changes the field...
          </p>

<div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
  <svg viewBox="0 0 400 400" style={{ maxWidth: 320 }}>
    {/* Light gray loop */}
    <circle cx="200" cy="200" r="150" fill="none" stroke="#ccc" strokeWidth="2" />

    {/* Pill boxes */}
    <g fontSize="15" textAnchor="middle">
      {/* Top */}
      <rect x="115" y="40" rx="18" ry="18" width="170" height="36" fill="#f0f7ff" stroke="#ccc" />
      <text x="200" y="64">charge configuration</text>

      {/* Right */}
      <rect x="280" y="180" rx="18" ry="18" width="100" height="36" fill="#f0f7ff" stroke="#ccc" />
      <text x="330" y="204">electric field</text>

      {/* Bottom */}
      <rect x="115" y="324" rx="18" ry="18" width="170" height="36" fill="#f0f7ff" stroke="#ccc" />
      <text x="200" y="348">forces on charges</text>

      {/* Left */}
      <rect x="20" y="180" rx="18" ry="18" width="160" height="36" fill="#f0f7ff" stroke="#ccc" />
      <text x="100" y="204">motion of charges</text>
    </g>

    {/* Arrowheads placed on the circle at 45°, 135°, 225°, 315° */}
    {/* Each group translates to the point on the circle, then rotates so the triangle points along the tangent */}
    {/* Geometry: center (200,200), r=150. 
       45° point: (200+150/√2, 200+150/√2) = (306.066, 306.066); tangent angle = 45°+90° = 135°
       135°: (93.934, 306.066); tangent = 225°
       225°: (93.934, 93.934); tangent = 315°
       315°: (306.066, 93.934); tangent = 45°
    */}
    <g transform="translate(306.066,306.066) rotate(135)">
      {/* Triangle pointing along +x in local coords */}
      <path d="M0,-5 L10,0 L0,5 Z" fill="#888" />
    </g>
    <g transform="translate(93.934,306.066) rotate(225)">
      <path d="M0,-5 L10,0 L0,5 Z" fill="#888" />
    </g>
    <g transform="translate(93.934,93.934) rotate(315)">
      <path d="M0,-5 L10,0 L0,5 Z" fill="#888" />
    </g>
    <g transform="translate(306.066,93.934) rotate(45)">
      <path d="M0,-5 L10,0 L0,5 Z" fill="#888" />
    </g>
  </svg>
</div>




          </HiddenExposition>


          <h2>Electric Force</h2>

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

           <HiddenExposition title="Did we add anything new?">
          <p>
            We have not introduced any new physics yet.  At the moment, the electric field is just a way to organize our thinking about forces between charges.</p>
            <p>  
            You may have noticed that this field is implicitly a function of position (and time) since the force on a test charge depends on where it is placed:</p>
            <center>
            <MathJax inline>{" \\( \\vec{\\mathbf{E}} = \\vec{\\mathbf{E}}(\\vec{\\mathbf{r}}, t) \\)"}</MathJax>  </center>
            <p>
            In the above simulations, the field updates "instantaneously" as charges move around.  This is not the case in reality, and the field concept will become more powerful in time-dependent situations.
          </p>
          <p>
            A deeper exploration of electrodynamics will reveal that the electric field is a fundamental entity in its own right, with its own dynamics and energy.  
            Changing electric fields can generate magnetic fields, and vice versa, leading to the rich phenomena of electromagnetism. 
          </p>
          </HiddenExposition>

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li onClick={handleToggleAnswer} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              Calculate the magnitude of the electric field 0.5 m away from a 2 µC point charge.
            </li>
            {showAnswer && (
              <p>
                Using Coulomb's law <MathJax inline>{"\\( E = k \\frac{|q|}{r^2} \\)"}</MathJax>, with
                <MathJax inline>{" \\( k \\approx 9 \\times 10^9 \\)"}</MathJax> N·m²/C², <MathJax inline>{"\\( q = 2 \\times 10^{-6} \\)"}</MathJax> C,
                and <MathJax inline>{"\\( r = 0.5 \\)"}</MathJax> m, we find:
                <MathJax inline>{" \\( E \\approx 9 \\times 10^9 \\times \\frac{2 \\times 10^{-6}}{(0.5)^2} \\)"}</MathJax>,
                which simplifies to approximately <MathJax inline>{"\\( 72,000 \\)"}</MathJax> N/C.
              </p>
            )}

            <li onClick={handleToggleAnswer1} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              Two identical 1 µC point charges are placed 1 m apart.  Determine the net electric field at the midpoint.
            </li>
            {showAnswer1 && (
              <p>
                At the midpoint, the contributions from each charge are equal in magnitude but opposite in direction (if the charges are like-signed), resulting in a net electric field of
                <MathJax inline>{" \\( 0 \\)"}</MathJax> N/C.
              </p>
            )}

            <li onClick={handleToggleAnswer2} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              In electrostatic equilibrium (no motion of free charges), why must the electric field be zero inside a conductor?
            </li>
            {showAnswer2 && (
              <p>
                If the electric field was non-zero, free charges within a conductor would experience a net force.  A net force implies acceleration and motion, which is not equilibrium. The charges will continue to move until they reach a configuration in which the internal electric field is zero.
              </p>
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default ElectricField;
