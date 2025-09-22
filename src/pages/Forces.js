// ===== File: src/pages/Forces.js
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import StickFigureForcesDemo from "../components/mechanics/StickFigureForcesDemo";
import SimplePlatformer from "../components/mechanics/SimplePlatformer";
import Platformer from "../components/mechanics/Platformer";

export default function Forces() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Forces</h1>

          <h2>Introduction</h2>
          <p>
            When two objects interact, mutual <strong>forces</strong> arise between them.  Some examples include electrical repulsion, gravitational attraction, and contact forces.  
          </p>
          <p>
            The forces on a single object can be combined into the <strong>net force</strong> that determines its acceleration according to Newton's second law: 
            <MathJax inline>{" \\( \\vec{F}_{\\text{net}} = m\\vec{a} \\)"}</MathJax>. 
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong >Free-body diagrams</strong>&nbsp;&nbsp;&nbsp;
              <span>
                Represent each distinct force with an arrow
                attached to the object. This makes it easier to track directions before writing equations.
              </span>
            </li>
            <li>
              <strong>Newton's second law</strong>&nbsp;&nbsp;&nbsp;
              <span>
                The net force is the vector sum of all forces and determines the acceleration according to
                <MathJax inline>{" \\( \\vec{F}_{\\text{net}} = m\\vec{a} \\)"}</MathJax>.  If the net force is zero, the object
                moves at constant velocity.
              </span>
            </li>
            <li>
              <strong>Surface forces</strong>&nbsp;&nbsp;&nbsp;
              <span>
                Normal and friction forces arise from contact with a surface. The normal acts perpendicular to the surface while
                friction opposes relative motion along the surface.
              </span>
            </li>
          </ul>

          <h2>Force Playground</h2>
          <p>
            Introductory physics problems are filled with blocks often resting or sliding along a surface.  
            There are more interesting things, but blocks are a good starting point.  
            The better you understand blocks, the better you will understand the rest of existence. </p>
          <p>
              The forces on these blocks can be tricky to visualize, especially frictional forces.  The interactive below allows you to apply forces to a block and see how it responds.  You can also see the free-body diagram of the block, which shows all the forces acting on it.
          </p>

          <Platformer />

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A 65 kg skateboarder pushes off the ground so that the ground exerts a 110 N force to the right while friction provides 40 N to the left. What is the horizontal acceleration?
                </span>
              }
            >
              <MathJax>{`
                \\( F_{\\text{net}} = 110\\,\\text{N} - 40\\,\\text{N} = 70\\,\\text{N}.\\)
                With mass 65 kg, \
                \\( a = F_{\\text{net}}/m = 70/65 \\approx 1.1\\,\\text{m/s}^2 \\) to the right.
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  A 12 kg crate falls from a cargo plane.  The force of gravity is 118 N downward, and air resistance is 20 N upward.  What is the crate's acceleration?
                </span>
              }
            >
              <MathJax>{`
                \\( F_{\\text{net}} = 118\\,\\text{N} - 20\\,\\text{N} = 98\\,\\text{N}.\\)
                With mass 12 kg, \
                \\( a = F_{\\text{net}}/m = 98/12 \\approx 8.2\\,\\text{m/s}^2 \\) downward.
              `}</MathJax>
            </HiddenQuestion> 
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
