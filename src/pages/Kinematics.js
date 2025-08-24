import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
// Simulation lives in a separate component file, e.g. src/components/KinematicsSim.jsx
import KinematicsSim from "../components/KinematicsSim";

/**
 * Kinematics.js
 * Page layout mirrors the Momentum page: intro text + concepts + embedded sim + prompt.
 * - Uses MathJax for inline/block equations
 * - Keeps the simulation as a separate component (see import above)
 */

const Kinematics = () => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Kinematics</h1>

          <h2>Introduction</h2>
          <p>
            Kinematics describes <em>how </em>  things move, but not <em>why </em>  they move. It focuses on
            quantities like position, velocity, and acceleration, and the relationships between them. 
            </p>
          <h2>Key Concepts</h2>
          <ul className="card-list">
            <li>
              <strong>Time</strong>
              <span>
                {" "}
                A quantity that orders events.  It is useful to think of other kinematic variables as functions of time. The SI unit is the second (s).
              </span>
            </li>
            <li>
              <strong>Position</strong>
              <span>
                {" "}
                Specifies an object’s location. The SI unit is the meter (m).
              </span>
            </li>
            <li>
              <strong>Velocity</strong>
              <span>
                {" "}
                Rate of change of position. The SI unit is meters per second (m/s).
              </span>
            </li>
            <li>
              <strong>Acceleration</strong>
              <span>
                {" "}
                Rate of change of velocity. The SI unit is meters per second squared (m/s²).
              </span>
            </li>
            
          </ul>

          <h2>Try It</h2>
          <p>
            Use the simulation below to explore 1D motion. Hold the left/right arrow keys to apply negative/positive
            acceleration. Toggle pause with <kbd>Space</kbd>, and press <kbd>R</kbd> to reset. The traces show
            <MathJax inline>{" \\(x(t)\\)"}</MathJax>, <MathJax inline>{"\\(v(t)\\)"}</MathJax>, and
            <MathJax inline>{" \\(a(t)\\)"}</MathJax> over time.
          </p>

          {/* Embedded simulation component */}
          <KinematicsSim />

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p
              onClick={() => setShowAnswer(s => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: 600 }}
            >
              Describe the motion of the object when velocity is positive and acceleration is negative.
            </p>
            {showAnswer && (
              <>
                <p>
                  Negative acceleration means the velocity is decreasing. Since the velocity is still positive, the object is moving forward but slowing down.
                </p>
              </>
            )}
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default Kinematics;
