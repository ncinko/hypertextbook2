import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
// Simulation lives in a separate component file, e.g. src/components/KinematicsSim.jsx
import KinematicsSim from "../components/KinematicsSim";
import VelocityExplorer from "../components/VelocityExplorer";  
import HiddenExposition from "../components/HiddenExposition";

/**
 * Kinematics.js
 * Page layout mirrors the Momentum page: intro text + concepts + embedded sim + prompt.
 * - Uses MathJax for inline/block equations
 * - Keeps the simulation as a separate component (see import above)
 */

const Kinematics = () => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showVectorAnswer, setShowVectorAnswer] = useState(false);
  const [showAnswer3, setShowAnswer3] = useState(false);



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
          <h2>Velocity</h2>
<p>
            The <strong>average velocity</strong> is the average rate at which position changes between two moments in time:
          </p>
          <p>
          <MathJax inline>{" \\( \\overline{v} = \\frac{\\Delta x}{\\Delta t} \\),"}</MathJax>
</p>
          <p>
            where <MathJax inline>{" \\( \\Delta x = x_{\\text{2}} - x_{\\text{1}} \\)"}</MathJax> is the change in position (<strong>displacement</strong>) and <MathJax inline>{" \\( \\Delta t = t_{\\text{2}} - t_{\\text{1}} \\)"}</MathJax> is the change in time.
          </p>
          <p>
            The <strong>instantaneous velocity</strong> is the velocity at a specific moment in time, defined as the limit of the average velocity as the time interval approaches zero:
          </p>
          <p>
          <MathJax inline>{" \\( v(t) = \\lim_{\\Delta t \\to 0} \\frac{\\Delta x}{\\Delta t} = \\frac{dx}{dt} \\)."}</MathJax>
</p>
          <p>
            Even if this notation is unfamiliar, there is a simple graphical interpretation of these concepts. When position is plotted as a function of time, the average velocity corresponds to the slope of the <strong style={{ color: "#e53935" }}>secant line</strong> between two points, while the instantaneous velocity corresponds to the slope of the <strong style={{ color: "#43a047" }}>tangent line</strong> at a single point.
          </p>  

          <HiddenExposition title="Isn't this the same thing as speed?">
          
              <p style={{ marginTop: 0 }}>
                Almost.  Speed only tells you how fast something is moving, while velocity also tells you the direction of motion. Notice that in our definitions, velocity can be positive or negative, depending on whether <MathJax inline>{" \\( x_2 > x_1\\)"}</MathJax> or <MathJax inline>{" \\( x_2 < x_1\\)"}</MathJax>.
              </p> 
              <p>In one dimension, it is common to indicate rightward/upward movement with positive velocity and leftward/downward movement with negative velocity.  The speed is then given by the absolute value of velocity.</p>
                    </HiddenExposition>
          

          <VelocityExplorer />




<h2>Acceleration</h2>
<p>
            The <strong>average acceleration</strong> is the average rate at which velocity changes between two moments in time:
          </p>
          <p>
          <MathJax inline>{" \\( \\overline{a} = \\frac{\\Delta v}{\\Delta t} \\),"}</MathJax>
</p>
          <p>
            where <MathJax inline>{" \\( \\Delta v = v_{\\text{2}} - v_{\\text{1}} \\)"}</MathJax> is the change in velocity and <MathJax inline>{" \\( \\Delta t = t_{\\text{2}} - t_{\\text{1}} \\)"}</MathJax> is the change in time.
          </p>
          <p>
            The <strong>instantaneous acceleration</strong> is the acceleration at a specific moment in time, defined as the limit of the average acceleration as the time interval approaches zero:
          </p>
          <p>
          <MathJax inline>{" \\( a(t) = \\lim_{\\Delta t \\to 0} \\frac{\\Delta v}{\\Delta t} = \\frac{dv}{dt} \\)."}</MathJax>
</p>
          <p>
            Even if this notation is unfamiliar, there is a simple graphical interpretation of these concepts. When velocity is plotted as a function of time, the average acceleration corresponds to the slope of the <strong style={{ color: "#e53935" }}>secant line</strong> between two points, while the instantaneous acceleration corresponds to the slope of the <strong style={{ color: "#43a047" }}>tangent line</strong> at a single point.
          </p>  

          <HiddenExposition title="Did you just copy and paste the previous section?">
          
              <p style={{ marginTop: 0 }}>
                Yes.  Acceleration is to velocity as velocity is to position.  Colloquially speaking, acceleration tells you whether or not something is speeding up or slowing down.  As with velocity, the sign of acceleration is important.
              </p> 
              <p>You may be tempted to immediately interpret negative acceleration as the "slowing down" case.  Instead, negative acceleration is better thought of as velocity "getting more negative".  With standard sign conventions, this could either be a rightward moving object slowing down or a leftward moving object speeding up.</p>
                    </HiddenExposition>
          {/* Embedded simulation component */}
                    <h2>Try It</h2>
          <p>
            Use the simulation below to explore 1D motion. Hold the left/right arrow keys to apply negative/positive
            acceleration. Toggle pause with <kbd>Space</kbd>, and press <kbd>R</kbd> to reset. The traces show
            <MathJax inline>{" \\(x(t)\\)"}</MathJax>, <MathJax inline>{"\\(v(t)\\)"}</MathJax>, and
            <MathJax inline>{" \\(a(t)\\)"}</MathJax> over time.
          </p>
          <KinematicsSim />

          

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p
              onClick={() => setShowVectorAnswer(s => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: 600 }}
            >
              Describe the motion of the object when position is positive and velocity is negative.
            </p>
            {showVectorAnswer && (
              <>
                <p>
                  Negative velocity means the object is moving left. Since the position is positive, the object is moving back toward the origin.
                </p>
              </>
            )}
          </div>

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
                  Negative acceleration means the velocity is decreasing. Since the velocity is still positive, the object is moving to the right but slowing down.
                </p>
              </>
            )}
          </div>

          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <p
              onClick={() => setShowAnswer3(s => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: 600 }}
            >
              Describe the shape of the position and velocity traces when acceleration is constant (non-zero).
            </p>
            {showAnswer3 && (
              <>
                <p>
                  Under constant accleration, the velocity trace is a straight line. The position trace appears curved; in fact, it is a parabola.
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
