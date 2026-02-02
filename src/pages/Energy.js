import React from "react";
import { Link } from "react-router-dom";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenExposition from "../components/shared/HiddenExposition";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import Coaster from "../components/mechanics/coaster";

const chipStyle = {
  display: "inline-block",
  border: "1px solid #dde1ff",
  borderRadius: "999px",
  padding: "4px 12px",
  margin: "4px 6px",
  fontSize: 12,
  background: "#f4f6ff",
};

export default function Energy() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Energy</h1>

          <h2>Introduction</h2>
          <p>
            Energy is a central concept in physics that quantifies the ability for a system to do work or cause change.  It exists in various forms, including kinetic energy (energy of motion) and potential energy (stored energy due to position or configuration).
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Kinetic energy</strong>
              <span>
                An object undergoing translational motion has kinetic energy:
                <MathJax inline>{" \\( K = \\tfrac{1}{2}mv^2 \\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Work-Energy Theorem</strong>
              <span>
                Changes in kinetic energy equal the net work done on a system:
                <MathJax inline>{" \\( \\Delta K = W_{\\text{net}} \\)"}</MathJax>, where work is a function of applied force and displacement.
              </span>
            </li>
            <li>
              <strong>Potential energy</strong>
              <span>
                Rather than using the work formalism, we can often define a potential energy function.
                  For gravity near Earth's surface,
                <MathJax inline>{" \\( U = mgh \\)"}</MathJax>.  For the spring force,
                <MathJax inline>{" \\( U = \\tfrac{1}{2}kx^2 \\)"}</MathJax>. 
              </span>
            </li>
            
            <li>
              <strong>Conservation</strong>
              <span>
                When only conservative forces act,
                <MathJax inline>{" \\(\\Delta K + \\Delta U = 0\\)"}</MathJax>.  This lets you
                compare energy at two points instead of tracking every force at every instant.
              </span>
            </li>
          </ul>

          <h2>Energy pathways</h2>
          <Coaster />  

          <HiddenExposition title="Why does speed increase as height decreases?">
            <p>
              When an object falls, its gravitational potential energy decreases. The difference is balanced by a corresponding increase in kinetic energy,
              which means the speed must increase.  Alternatively, the gravitational force does positive work on the object as it falls.
            </p>
          </HiddenExposition>

          <HiddenExposition title="What happens if there is friction?">
            <p>
              Friction converts mechanical energy (kinetic + potential) into thermal energy. 
              It is difficult to account for thermal energy, but in principle, the total energy (mechanical + thermal) is still conserved. 
              This is an example of a "nonconservative" force, and we can only account for it using the extended work-energy theorem:
              <MathJax inline>{" \\( \\Delta K + \\Delta U = W_{\\text{fric}} \\)"}</MathJax>, where
              <MathJax inline>{" \\( W_{\\text{fric}} < 0 \\)"}</MathJax>.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="px-6 py-0 pb-24">
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A 2.0 kg cart rolls down a 1.5 m tall ramp. Ignoring friction, what speed does it reach?
                </span>
              }
            >
              <MathJax>
                {`Using conservation of energy: \\( mgh = \\tfrac{1}{2}mv^2 \\).
                The mass cancels, so \\( v = \\sqrt{2gh} = \\sqrt{2\\times 9.8 \\times 1.5} \\approx 5.4\\,\\text{m/s}.\\)`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  A spring with <MathJax inline>{"\\(k = 200\\,\\text{N/m}\\)"}</MathJax> is compressed 0.10 m. How much energy is stored?
                </span>
              }
            >
              <MathJax>
                {`The potential energy of a compressed spring is \\( U = \\tfrac{1}{2}kx^2 \\). \\( U = 0.5(200)(0.10)^2 = 1.0\\,\\text{J}. \\)`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  A 2.0 kg box slides across a rough floor with friction coefficient 0.30. If it starts with 50 J of kinetic energy, how far does it slide before stopping?
                </span>
              }
            >
              <MathJax>
                {`Friction does negative work, removing kinetic energy: \\( W_{\\text{fric}} = -\\mu mgd \\).
                Setting \\( W_{\\text{fric}} = -K_0 \\) gives \\( d = \\frac{K_0}{\\mu mg} = \\frac{50}{0.30 \\times 2.0 \\times 9.8} \\approx 8.5\\,\\text{m}. \\)`}
              </MathJax>
            </HiddenQuestion>
          </div>  
        </div>
        </div>
      </MathJaxContext>
    </div>
    
  );
}
