// ===== File: src/pages/Forces.js
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import StickFigureForcesDemo from "../components/mechanics/StickFigureForcesDemo";

export default function Forces() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Forces</h1>

          <h2>Introduction</h2>
          <p>
            A <strong>force</strong> is any interaction that can change an object's motion or deform it. Forces are
            vector quantities, so they combine using both magnitude and direction. When several forces act on an object we
            summarize them by the <em>net force</em>, the vector sum of all individual contributions.
          </p>
          <p>
            Newton's second law connects forces to motion:
            <MathJax inline>{"\\( \\vec{F}_{\\text{net}} = m\\vec{a} \\)"}</MathJax>.  Drawing and labeling each
            contributor is often the cleanest path to solving mechanics problems.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Free-body diagrams</strong>
              <span>
                Represent each distinct interaction (weight, normal, tension, thrust, friction, drag, etc.) with an arrow
                attached to the object. This makes it easier to track directions before writing equations.
              </span>
            </li>
            <li>
              <strong>Newton's second law</strong>
              <span>
                The net force is the vector sum of all forces and sets the acceleration through
                <MathJax inline>{"\\( \\vec{F}_{\\text{net}} = m\\vec{a} \\)"}</MathJax>.  If the net force is zero the object
                moves at constant velocity (possibly zero).
              </span>
            </li>
            <li>
              <strong>Surface forces</strong>
              <span>
                Normal and friction forces arise from contact with a surface. The normal acts perpendicular to the surface while
                friction opposes relative motion along it with magnitude up to
                <MathJax inline>{"\\( f_{\\text{max}} = \\mu_s N \\)"}</MathJax> for static friction.
              </span>
            </li>
          </ul>

          <h2>Force Playground</h2>
          <p>
            Use the stick-figure platformer to experiment with applied pushes, gravity, and friction. Toggle interactions on and
            off to see how the free-body diagram and the net force vector respond. Try taking a running start, then remove
            friction to watch the character coast.
          </p>

          <StickFigureForcesDemo />

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A 65 kg skateboarder pushes off the ground so that the ground exerts a 110 N force to the right while static
                  friction provides 40 N to the left. What is the horizontal acceleration?
                </span>
              }
            >
              <MathJax>{`
                \\( F_{\\text{net},x} = 110\\,\\text{N} - 40\\,\\text{N} = 70\\,\\text{N}.\\)
                With mass 65 kg, \\
                \\( a_x = F_{\\text{net},x}/m = 70/65 \\approx 1.1\\,\\text{m/s}^2. \\)
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  A 12 kg crate rests on a level floor. The coefficient of static friction is 0.5. What minimum horizontal force
                  is required to start it sliding?
                </span>
              }
            >
              <MathJax>{`
                \\( N = mg = 12\\,\\text{kg} \times 9.8\\,\\text{m/s}^2 = 118 \\\,\\text{N}.\\)
                Static friction can supply up to \\( f_{\\max} = \\mu_s N = 0.5 \times 118 \\approx 59\\,\\text{N}.\\)
                Any applied force greater than about 59 N will break the grip and start the motion.
              `}</MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
      <style>{`
        .card-list {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .card-list li {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 160px 1fr;
          align-items: center;
        }
        .card-list li strong {
          color: #111827;
        }
      `}</style>
    </div>
  );
}
