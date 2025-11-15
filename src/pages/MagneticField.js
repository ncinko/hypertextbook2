import React from "react";
import { Link } from "react-router-dom";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import StraightCurrentFieldDemo from "../components/electricity/StraightCurrentFieldDemo";
import Ampere from "../components/electricity/Ampere";
import MagneticFieldExplorer from "../components/electricity/MagneticFieldExplorer";
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

export default function MagneticField() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Magnetic Fields</h1>

          <h2>Introduction</h2>
          <p>
            Magnetic fields arise from the motion of electric charge. They create <Link to="/magnetic-force">forces</Link> on other moving charges, redirect compass needles, and
            underly the operation of electric motors and generators.  Unlike electric fields, the fields and resulting magnetic forces always
            act perpendicular to the velocity of the moving charge. This often leads to a swirling or "curling" pattern in both the field and trajectories of particles.              
            
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Biot–Savart law</strong>
              <span>
                The magnetic field from a small current element is
                <MathJax inline>{" \\( d\\vec{\\mathbf B} = \\frac{\\mu_0}{4\\pi} \\frac{I  \\vec{\\mathbf d \\mathbf l} \\times \\hat{\\mathbf r}}{r^2} \\)"}</MathJax>
                . Adding (integrating) all the pieces gives the total field.
              </span>
            </li>
            <li>
              <strong>Right-hand rule</strong>
              <span>
                Point your thumb along the current direction. Your curled fingers show the sense of
                <MathJax inline>{" \\( \\vec{\\mathbf B} \\)"}</MathJax> around the wire, matching
                <MathJax inline>{" \\( \\vec{\\mathbf d \\mathbf l} \\times \\hat{\\mathbf r} \\)"}</MathJax> in the Biot–Savart law.
              </span>
            </li>
            <li>
              <strong>Ampère’s law</strong>
              <span>
                The line integral of the field relates to enclosed current:
                <MathJax inline>{" \\( \\oint \\vec{\\mathbf B} \\cdot \\vec{\\mathbf d \\mathbf s} = \\mu_0 I_{\\text{enc}} \\)"}</MathJax>
                .  It complements the Biot–Savart law when symmetry lets us evaluate the integral easily.
              </span>
            </li>
          </ul>

          <h2>Current-carrying wire</h2>
          <p>
            A straight wire carrying current <MathJax inline>{"\\( I \\)"}</MathJax> produces circular magnetic field lines. At a
            distance <MathJax inline>{"\\( r \\)"}</MathJax> from the wire, the magnitude is
          </p>
          <MathJax>{"\\[ B = \\frac{\\mu_0 I}{2\\pi r} \\]"}</MathJax>
          <p>
            The vector direction follows the right-hand rule. Drag the probe in the simulation below to see how the field wraps
            around the wire and scales with current or distance.
          </p>

          <StraightCurrentFieldDemo />
          


          <div style={{ textAlign: "center", marginTop: 10 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>Halve <MathJax inline>{"\\( r \\)"}</MathJax> → field doubles</span>
            <span style={chipStyle}>Reverse current → field flips</span>
            <span style={chipStyle}>Slide the probe around a circle → magnitude stays constant</span>
          </div>

          <HiddenExposition title="Where does the “curl” come from?">
            <p>
              The Biot–Savart law says each current element contributes a vector proportional to
              <MathJax inline>{" \\( \\vec{\\mathbf d \\mathbf l} \\times \\hat{\\mathbf r} \\)"}</MathJax>.
              For a straight wire the current element  <MathJax inline>{" \\( I \\vec{\\mathbf d \\mathbf l} \\) "}</MathJax> points along the wire, while <MathJax inline>{" \\( \\hat{\\mathbf r} \\) "}</MathJax>
              points from the wire to the location of interest. Their cross product therefore lies perpendicular to both: tangent to a
              circle centered on the wire.
            </p>
            <p>
              Ampère’s law encodes the same idea. A circular path of radius <MathJax inline>{"\\( r \\)"}</MathJax> centered on the
              wire has constant <MathJax inline>{"\\( B \\)"}</MathJax>, so
              <MathJax inline>{" \\( \\oint \\vec{\\mathbf B} \\cdot \\vec{\\mathbf d \\mathbf l} = B (2\\pi r) = \\mu_0 I \\)"}</MathJax>.
              Solving for <MathJax inline>{"\\( B \\)"}</MathJax> reproduces the expression above.
            </p>
          </HiddenExposition>

          <h2>Ampère’s law</h2>
          <p>
            Ampère’s law relates the magnetic field around a <b>closed</b> path to the net current flowing through the interior of the path.
            Like Gauss's law, it is especially useful for finding fields in situations with high symmetry.
          </p>
          <p>Mathematically, it says:</p>
          <MathJax>{"\\[ \\oint \\vec{\\mathbf B} \\cdot \\vec{\\mathbf d \\mathbf l} = \\mu_0 I_{\\text{enc}} \\]"}</MathJax>
          <p>
            The line integral on the left sums the component of the magnetic field <MathJax inline>{"\\( \\vec{\\mathbf B} \\)"}</MathJax> tangent to each segment of the path.
            The right side counts the total current <MathJax inline>{"\\( I_{\\text{enc}} \\)"}</MathJax> passing through the area enclosed by the path, multiplied by the permeability of free space
            <MathJax inline>{" \\( \\mu_0 = 4\\pi \\times 10^{-7} \\,\\text{T}\\cdot\\text{m/A} \\)"}</MathJax>.
          </p>
          <p>The simulation below allows you to create a current distribution and evaluate the line integral for a chosen path (it's up to you to make sure it's closed).</p>

          <Ampere />

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>Create a closed loop around a single wire → integral matches μ₀I</span>
            <span style={chipStyle}>Add more current through the loop → integral increases</span>
            <span style={chipStyle}>Make an open path → integral may not match μ₀I</span>
          </div>

          <h2>3D Field Visualization</h2>
          <p>
            Complex current arrangements require full vector superposition. The explorer below lets you compare the field near several different 
            configurations of current. The vector field directions are shown on a finite grid of sample points.  You can rotate the view, adjust the sample density, and change parameters specific to each configuration.  
            I prefer this <a href="https://www.falstad.com/vector3dm/" target="_blank" rel="noreferrer">field visualizer</a> by Falstad.
          </p>

          <MagneticFieldExplorer />

          <HiddenExposition title="Why do the loop and bar magnet look alike far away?">
            <p>
              Any localized current distribution has a magnetic dipole moment
              <MathJax inline>{" \\( \\vec{\\textbf m} = \\frac{1}{2} \\int \\vec{\\mathbf r} \\times (I \\vec{\\mathbf d \\mathbf l}) \\)"}</MathJax>. 
              Far from the source, the details blur together and only the net dipole moment matters.  We are left with the field pattern of a magnetic dipole:
            </p>
            <MathJax>{"\\[ \\vec{\\mathbf B}_{\\text{dipole}} = \\frac{\\mu_0}{4\\pi r^3} \\left[ 3(\\vec{\\mathbf m} \\cdot \\hat{\\mathbf r}) \\hat{\\mathbf r} - \\vec{\\mathbf m} \\right] \\]"}</MathJax>
            <p>   
              
              This may seem like a complex expression, but the important feature is that we expect the field strength to fall off as the cube of the distance from the source <MathJax inline>{"\\( (1/r^3) \\)"}</MathJax>.

              </p>
              <p>
              In short, the current loop, bar magnet, and even the solenoid share a similar dipole field far away because they all have the same basic structure: circulating currents that produce a net magnetic moment.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  You place a field probe <MathJax inline>{"\\( 4.0\\,\\text{cm} \\)"}</MathJax> from a long wire carrying
                  <MathJax inline>{" \\( 5.0\\,\\text{A} \\)"}</MathJax>. What magnetic-field magnitude do you read?
                </span>
              }
            >
              <MathJax>{`Using \\( B = \\frac{\\mu_0 I}{2\\pi r} \\) with
                \\( I = 5.0\\,\\text{A} \\) and \\( r = 4.0\\,\\text{cm} = 0.040\\,\\text{m} \\) gives
                \\( B = \\frac{(4\\pi\\times10^{-7})(5.0)}{2\\pi(0.040)} = 2.5\\times10^{-5}\\,\\text{T} \\) (25 µT).
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  The explorer shows a nearly uniform interior field for the solenoid configuration. Using Ampère’s law, estimate
                  <MathJax inline>{" \\( B \\)"}</MathJax> inside an ideal solenoid with <MathJax inline>{"\\( n = 900 \\) "}</MathJax>
                  turns per meter carrying <MathJax inline>{"\\( 1.2\\,\\text{A} \\)"}</MathJax>.
                </span>
              }
            >
              <MathJax>{`For an ideal solenoid, \\( B = \\mu_0 n I \\). Plugging in the numbers gives
                \\( B = (4\\pi\\times10^{-7})(900)(1.2) \\approx 1.36\\times10^{-3}\\,\\text{T} \\) (1.36 mT).
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  Two identical bar magnets are arranged with like poles facing each other. Sketch or describe the region of
                  weakest field between them. How does switching to opposite poles alter the field map?
                </span>
              }
            >
              <p>
                With like poles facing, the fields oppose between the magnets, creating a neutral plane roughly midway between
                them.  Flipping one magnet (opposite polarity) makes the fields reinforce, producing a strong bridge of
                field lines that connect the north pole of one magnet to the south pole of the other.
              </p>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
