import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import HiddenExposition from "../components/HiddenExposition";
import Kepler from "../components/mechanics/Kepler";
import TwoBody from "../components/mechanics/TwoBody";

export default function KeplerLaws() {
  const [showFoci, setShowFoci] = useState(true);
  const [showAreas, setShowAreas] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [activeSimulation, setActiveSimulation] = useState('kepler');

  const [readout, setReadout] = useState({ e: null, a: null, T: null });

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Kepler’s Laws</h1>

          <h2>Introduction</h2>
          <p>
            We model a planet of negligible mass orbiting a fixed Sun under Newtonian gravity. The orbit is a conic section determined by
            the specific orbital energy and the eccentricity vector. Use the simulation to explore circular, elliptical, and escape
            trajectories and to visualize each of Kepler’s laws.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>First law</strong>&nbsp;&nbsp;
              <span>Bound orbits (<MathJax inline>{"\\(e<1\\)"}</MathJax>) are ellipses with the Sun at one focus.</span>
            </li>
            <li>
              <strong>Second law</strong>&nbsp;&nbsp;
              <span>The line from the Sun to the planet sweeps equal areas in equal times.</span>
            </li>
            <li>
              <strong>Third law</strong>&nbsp;&nbsp;
              <span>For bound orbits, <MathJax inline>{"\\(T^2\\propto a^3\\)"}</MathJax>.</span>
            </li>
          </ul>

          <h2>Simulation</h2>
          <p>
            Use the checkboxes to toggle the display of orbit features. The readout shows the current orbit's eccentricity <MathJax inline>{"\\(e\\)"}</MathJax>,
            semi-major axis <MathJax inline>{"\\(a\\)"}</MathJax>, and period <MathJax inline>{"\\(T\\)"}</MathJax> (if bound).
          </p>
          <Kepler isRunning={activeSimulation === 'kepler'} onPlay={() => setActiveSimulation(activeSimulation === 'kepler' ? null : 'kepler')} />

          <HiddenExposition title={<span className="force-black">Why equal areas in equal times?</span>}>
            <p>
              The torque from a central force is zero, so angular momentum <MathJax inline>{"\\(\\vec{L}\\)"}</MathJax> is conserved.
              
              The planet sweeps out wedges of area
              <MathJax inline>{" \\(\\Delta A = \\tfrac12 r^2 \\Delta\\theta\\)"}</MathJax> in time <MathJax inline>{" \\(\\Delta t\\)"}</MathJax>.
              Thus the areal velocity is
              <MathJax inline>{" \\(\\dot A = \\dfrac{\\Delta A}{\\Delta t} = \\dfrac{r^2 \\Delta\\theta}{2 \\Delta t}\\)"}</MathJax>, which can be rewritten using
              <MathJax inline>{" \\(L = m r^2 \\dot\\theta\\, \\)"}</MathJax> as
              <MathJax inline>{" \\(\\dot A = \\dfrac{L}{2m} \\)"}</MathJax>.
            </p>
          </HiddenExposition>
          <TwoBody isRunning={activeSimulation === 'twobody'} onPlay={() => setActiveSimulation(activeSimulation === 'twobody' ? null : 'twobody')} />

          <HiddenExposition 
  title={<span className="force-black">Why is the center of mass a common focus?</span> }
>

  <p style={{ marginTop: 0 }}>
    Begin with Newton’s law of gravitation for two bodies of masses 
    <MathJax inline>{" \\(m_1\\)"} </MathJax> and 
    <MathJax inline>{" \\(m_2\\)"} </MathJax> separated by 
    <MathJax inline>{" \\(\\vec{\\mathbf r} = \\vec{\\mathbf r}_2 - \\vec{\\mathbf r}_1\\)"} </MathJax>:
  </p>

  <div style={{ textAlign: "center", margin: "6px 0" }}>
    <MathJax>{"\\(\\vec{\\mathbf F}_{12} = -G\\,\\dfrac{m_1 m_2}{r^2}\\,\\hat{\\mathbf r}\\)"}</MathJax>
  </div>

  <p>
    Each body accelerates toward the other, but the forces are equal and opposite.  
    Writing Newton’s second law for each body and then subtracting gives an equation for the 
    <em> relative</em> motion:
  </p>

  <div style={{ textAlign: "center", margin: "6px 0" }}>
    <MathJax>{"\\(\\mu\\,\\ddot{\\vec{\\mathbf r}} = -G\\,\\dfrac{m_1 m_2}{r^2}\\,\\hat{\\mathbf r}\\)"}</MathJax>
  </div>

  <p>
    Here <MathJax inline>{" \\(\\mu = \\dfrac{m_1 m_2}{m_1 + m_2}\\)"}</MathJax> is the <strong>reduced mass</strong>.  
    This equation has exactly the same form as the equation for a single particle of mass 
    <MathJax inline>{"  \\( \\mu\\)"} </MathJax> moving in a 
    <MathJax inline>{"  \\( -G(m_1+m_2)/r\\)"} </MathJax> potential centered at the origin.
  </p>

  <p>
    Choosing the origin at the <strong>center of mass</strong> ,
    <div style={{ textAlign: "center", margin: "6px 0" }}>
    <MathJax >{"\\(\\vec{\\mathbf R}_{CM} = \\dfrac{m_1 \\vec{\\mathbf r}_1 + m_2 \\vec{\\mathbf r}_2}{m_1 + m_2} = 0 \\)"}</MathJax>
    </div>
    ensures that the total momentum is zero, so the barycenter remains fixed.  
    The resulting trajectory for the relative vector 
    <MathJax inline>{" \\( \\vec r\\)"} </MathJax> is a conic section—an ellipse, parabola, or hyperbola—
    with one focus at the origin.
  </p>

  <p>
    Because each body’s position is just a scaled version of 
    <MathJax inline>{" \\( \\vec r\\)"} </MathJax>  
    <div style={{ textAlign: "center", margin: "6px 0" }}>
    <MathJax>{"\\(\\vec r_1 = -\\dfrac{m_2}{m_1+m_2}\\vec r\\,,\\quad \\vec r_2 = \\dfrac{m_1}{m_1+m_2}\\vec r\\)"} </MathJax>
    </div>
    both ellipses share that same focus—the <strong>center of mass</strong>.
  </p>
</HiddenExposition>



          

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion title={<span>Show that the areal velocity is constant for any central force.</span>}>
              <MathJax>{`
                For a central force, \\(\\vec F = f(r)\\,\\hat r\\), so the torque on the planet is \\(\\vec\\tau = \\vec r \\times \\vec F = 0\\).
                Since torque is related to angular momentum through \\(\\vec{\\tau} = d\\vec{L}/dt\\), angular momentum is conserved: \\(\\vec{L} = \\text{constant}\\).  Areal velocity,
                the area swept out per unit time, is given by \\(\\dot A = \\vec{r} \\times \\vec{v}/2 = \\vec{L}/(2m)\\), which is also constant.
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>Use the simulation to measure T and estimate a. Verify T^2/a^3 is approximately constant across two different ellipses.</span>}>
              <MathJax>{`
                For each ellipse: record \\(a\\) from the live readout and wait for one periapsis-to-periapsis period \\(T\\).
                Compute \\(T^2/a^3\\). Repeat for another ellipse (different \\(a\\)). The values should agree within numerical error.
              `}</MathJax>
            </HiddenQuestion>

          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
