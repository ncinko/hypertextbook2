import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import StraightCurrentFieldDemo from "../components/electricity/StraightCurrentFieldDemo";
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
            Magnetic fields form whenever electric charges move. They create forces on other moving charges, steer compass
            needles, and thread through transformers and motors. Unlike electric fields, which point outward from positive
            charges, magnetic fields curl around current. That curling structure links magnetism to geometry and motion: a
            magnetic field always wraps around the direction of the current that created it.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Biot–Savart law</strong>
              <span>
                The magnetic field from a small current element is
                <MathJax inline>{" \\( d\vec{\\mathbf B} = \\frac{\\mu_0}{4\\pi} \\frac{I \, d\\vec{\\mathbf \ell} \\times \\hat{\\mathbf r}}{r^2} \\)"}</MathJax>
                . Adding (integrating) all the pieces gives the total field.
              </span>
            </li>
            <li>
              <strong>Right-hand rule</strong>
              <span>
                Point your thumb along the current direction. Your curled fingers show the sense of
                <MathJax inline>{" \\( \\vec{\\mathbf B} \\)"}</MathJax> around the wire, matching
                <MathJax inline>{" \\( d\\vec{\\mathbf \ell} \\times \\hat{\\mathbf r} \\)"}</MathJax> in the Biot–Savart law.
              </span>
            </li>
            <li>
              <strong>Ampère’s law</strong>
              <span>
                For highly symmetric situations, the line integral of the field relates to enclosed current:
                <MathJax inline>{" \\( \\oint \\vec{\\mathbf B}\cdot d\\vec{\\mathbf s} = \\mu_0 I_{\\text{enc}} \\)"}</MathJax>
                . It complements the Biot–Savart law when symmetry lets us evaluate the loop integral easily.
              </span>
            </li>
          </ul>

          <h2>Long straight current</h2>
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
            <span style={chipStyle}>Reverse the direction → orange arrow flips sense</span>
            <span style={chipStyle}>Slide the probe around a circle → magnitude stays constant</span>
          </div>

          <HiddenExposition title="Where does the “curl” come from?">
            <p>
              The Biot–Savart law says each current element contributes a vector proportional to
              <MathJax inline>{" \\( d\\vec{\\mathbf \ell} \\times \\hat{\\mathbf r} \\)"}</MathJax>.
              For a straight wire the current element points along the wire, while <MathJax inline>{"\\( \\hat{\\mathbf r} \\)"}</MathJax>
              points from the wire to your location. Their cross product therefore lies perpendicular to both: tangent to a
              circle centered on the wire. Integrating those identical tangent contributions yields perfectly circular field
              lines.
            </p>
            <p>
              Ampère’s law encodes the same idea. A circular path of radius <MathJax inline>{"\\( r \\)"}</MathJax> centered on the
              wire has constant <MathJax inline>{"\\( B \\)"}</MathJax>, so
              <MathJax inline>{" \\( \\oint \\vec{\\mathbf B}\cdot d\\vec{\\mathbf s} = B (2\\pi r) = \\mu_0 I \\)"}</MathJax>.
              Solving for <MathJax inline>{"\\( B \\)"}</MathJax> reproduces the expression above.
            </p>
          </HiddenExposition>

          <h2>Exploring 3D magnetic fields</h2>
          <p>
            Complex current arrangements require full vector superposition. The explorer below lets you compare a circular loop,
            a bar magnet (modeled as a dipole), two magnets in different polar alignments, and a stack of loops resembling a
            solenoid. Drag to orbit the grid of sample points and notice how field strength concentrates near the source while
            the far field tends toward a dipole pattern.
          </p>

          <MagneticFieldExplorer />

          <HiddenExposition title="Why do the loop and bar magnet look alike far away?">
            <p>
              Any localized current distribution has a magnetic dipole moment
              <MathJax inline>{" \\( \\vec{\\boldsymbol m} = \\frac{1}{2} \\int \\vec{\\mathbf r} \\times (I d\\vec{\\mathbf \ell}) \\)"}</MathJax>
              . Far from the source the details blur together and only that net dipole moment matters, giving the field
              <MathJax inline>{" \\( \\vec{\\mathbf B}_{\\text{dip}} = \\frac{\\mu_0}{4\\pi r^3}[3(\\vec{\\boldsymbol m}\cdot \\hat{\\mathbf r}) \\hat{\\mathbf r} - \\vec{\\boldsymbol m}] \\)"}</MathJax>.
              That is why the current loop, bar magnet, and even the solenoid (when viewed from outside) share similar far-field
              patterns.
            </p>
          </HiddenExposition>

          <h2>Questions for practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  You place a field probe <MathJax inline>{"\\( 4.0\\,\\text{cm} \\)"}</MathJax> from a long wire carrying
                  <MathJax inline>{"\\( 5.0\\,\\text{A} \\)"}</MathJax>. What magnetic-field magnitude do you read?
                </span>
              }
            >
              <MathJax>{`
                Use \\( B = \frac{\mu_0 I}{2\pi r} \). With \\( r = 0.040\,\text{m} \) and \\( \mu_0 = 4\pi\times10^{-7}\,\text{T·m/A} \)
                we get \\( B = \frac{(4\pi\times10^{-7})(5.0)}{2\pi(0.040)} \approx 2.5\times10^{-5}\,\text{T} \) (25 µT).
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  The explorer shows a nearly uniform interior field for the solenoid configuration. Using Ampère’s law, estimate
                  <MathJax inline>{"\\( B \\)"}</MathJax> inside an ideal solenoid with <MathJax inline>{"\\( n = 900 \\)"}</MathJax>
                  turns per meter carrying <MathJax inline>{"\\( 1.2\\,\\text{A} \\)"}</MathJax>.
                </span>
              }
            >
              <MathJax>{`
                For an ideal solenoid \\( B = \mu_0 n I \). Plugging in the numbers gives
                \\( B = (4\pi\times10^{-7})(900)(1.2) \approx 1.36\times10^{-3}\,\text{T} \) (1.36 mT).
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
                them. The explorer’s “Two magnets → same polarity” option shows arrows shrinking and reversing direction near
                that plane. Flipping one magnet (opposite polarity) makes the fields reinforce, producing a strong bridge of
                field lines that connect the north pole of one magnet to the south pole of the other.
              </p>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
