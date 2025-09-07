// src/pages/Kinematics2D.js
import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import Kinematics2DGame from "../components/Kinematics2DGame"; 
import ProjectileLauncher from "../components/ProjectileLauncher";
import LaunchDecomposition from "../components/LaunchDecomposition";
import HiddenExposition from "../components/HiddenExposition";

const Kinematics2D = () => {
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  const [showAnswer3, setShowAnswer3] = useState(false);
  const [showAnswer4, setShowAnswer4] = useState(false);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>2D Kinematics</h1>

          <h2>Introduction</h2>
          <p>
            In two dimensions, motion is described using vectors. Position, velocity,
            and acceleration each have both <strong>x</strong> and <strong>y</strong> components.  Common scenarios that require a 2D description include projectiles, cars on banked curves, and orbits of planets.
          </p>

          <h2>Key Concepts</h2>
          <ul className="card-list">
            <li>
              <strong>Position vector</strong>
              <span> <MathJax inline>{"\\( \\vec{r} = \\langle x, y \\rangle \\)"}</MathJax> describes location in a two-dimensional space.</span>
            </li>
            <li>
              <strong>Velocity vector</strong>
              <span> <MathJax inline>{"\\( \\vec{v} = \\langle v_x, v_y \\rangle \\)"}</MathJax> gives both speed and direction.</span>
            </li>
            <li>
              <strong>Acceleration vector</strong>
              <span> <MathJax inline>{"\\( \\vec{a} = \\langle a_x, a_y\\rangle \\)"}</MathJax> tells us how velocity changes.</span>
            </li>
            <li>
              <strong>Independence of Motion</strong>
              <span> The x- and y-components evolve independently (except for time linking them).</span>
            </li>
          </ul>

          <h2>Constant Acceleration</h2>
          <p>
            When acceleration is constant, we can describe the motion with a set of simple kinematic equations.
            The velocity vector changes linearly with time, and the position vector changes quadratically.
          </p>
          <MathJax>{"\\\[ \\vec{v}(t) = \\vec{v}_0 + \\vec{a}t \\]"}</MathJax>
          <MathJax>{"\\\[ \\vec{r}(t) = \\vec{r}_0 + \\vec{v}_0 t + \\tfrac{1}{2} \\vec{a} t^2 \\\]"}</MathJax>
          <p>
            These equations apply to any situation where the net force is constant, such as an object in free fall
            (ignoring air resistance) or a car accelerating uniformly.
          </p>

          <HiddenExposition title="How do I read these vector equations?">
            <p>
              Since we're in 2D, each vector has two components. For example,
              <MathJax inline>{" \\( \\vec{v} = \\langle v_x, v_y \\rangle \\)"}</MathJax> means{" "}
              <MathJax inline>{"\\( v_x \\)"}</MathJax> is the horizontal velocity and{" "}
              <MathJax inline>{"\\( v_y \\)"}</MathJax> is the vertical velocity.  
              The equations above apply to each component separately:
            </p>
            <MathJax>{"\\[ v_x(t) = v_{0x} + a_x t, \\qquad v_y(t) = v_{0y} + a_y t \\]"}</MathJax>
            <MathJax>{"\\[ x(t) = x_0 + v_{0x} t + \\tfrac{1}{2} a_x t^2, \\qquad y(t) = y_0 + v_{0y} t + \\tfrac{1}{2} a_y t^2 \\]"}</MathJax>
            <p>
              This means you can analyze the horizontal and vertical motions independently,
              which is especially useful in projectile motion.</p>

            <p>
              As an example, suppose a boat is constantly drifting with the current at 3 m/s eastward.
              If the boat's engine suddenly causes it to accelerate northward at 2 m/s², then after 4 seconds:
            </p>
            
            <MathJax>{"\\[ x =  (3 \\,\\frac{\\text{m}}{\\text{s}})(4 \\,\\text{s}) = 12 \\,\\text{m}, \\qquad y =\\frac{1}{2} (2\\frac{\\text{m}}{\\text{s}^2})(4 \\,\\text{s})^2 = 16 \\,\\text{m} \\]"}</MathJax>
            <p>
              Meaning it's 12 m east and 8 m north of its starting point.  If we are interested in the speed of the boat at that moment, we can find the velocity components:
            </p>
            <MathJax>{"\\[ v_x = 3 \\,\\frac{\\text{m}}{\\text{s}}, \\qquad v_y = (2 \\,\\frac{\\text{m}}{\\text{s}^2})(4 \\,\\text{s}) = 8 \\,\\frac{\\text{m}}{\\text{s}} \\]"}</MathJax>
            <p>
              The speed is the magnitude of the velocity vector:
            </p>
            <MathJax>{"\\[ |\\vec{v}| = \\sqrt{v_x^2 + v_y^2} = \\sqrt{(3)^2 + (8)^2} =\\approx 8.54 \\,\\frac{\\text{m}}{\\text{s}} \\]"}</MathJax>
            <p>
              So the boat is moving at approximately 8.5 m/s at that instant.
            </p>
          
          </HiddenExposition>

          <h2>Projectile Motion</h2>
          <p>
            We'll often be interested in the special case of simple projectile motion, where the only force acting on an object is gravity.
    
          </p>
          <p>
            The initial velocity is usually given in terms of a launch speed and angle.  A projectile launched with speed <MathJax inline>{"\\( v_0 \\)"}</MathJax> at an angle <MathJax inline>{"\\( \\theta \\)"}</MathJax> above the horizontal
            has initial velocity components:
          </p>
          <MathJax>{"\\[ v_{0x} = v_0 \\cos \\theta, \\qquad v_{0y} = v_0 \\sin \\theta \\]"}</MathJax>
          <LaunchDecomposition />
          <p>The effect of gravity is to cause a constant downward acceleration, <MathJax inline>{"\\( \\vec{a} = \\langle 0, -g \\rangle \\)"}</MathJax>, where <MathJax inline>{"\\( g \\approx 9.8 \\,\\text{m/s}^2 \\)"}.</MathJax>The kinematic equations become:</p>  
          <MathJax>{"\\[ x = v_{0x} t, \\qquad y = v_{0y} t - \\tfrac{1}{2} g t^2 \\]"}</MathJax>
          <MathJax>{"\\[ v_x = v_{0x}, \\qquad v_y = v_{0y} - g t \\]"}</MathJax>
          <p>
            Notice that the horizontal velocity <MathJax inline>{"\\( v_x \\)"}</MathJax> is constant, while the vertical velocity <MathJax inline>{"\\( v_y \\)"}</MathJax> decreases linearly due to gravity.
          </p>

          <HiddenExposition title="What is the shape of the actual trajectory?">
            <p>
              The trajectory of a projectile is a parabola.  We can see this by eliminating time from the position equations.
              From <MathJax inline>{"\\( x = v_{0x} t \\)"}</MathJax>, we have <MathJax inline>{"\\( t = x / v_{0x} \\)"}</MathJax>.
              Substituting into the equation for <MathJax inline>{"\\( y \\)"}</MathJax> gives:
            </p>
            <MathJax>{"\\[ y = v_{0y} \\left( \\frac{x}{v_{0x}} \\right) - \\tfrac{1}{2} g \\left( \\frac{x}{v_{0x}} \\right)^2 \\]"}</MathJax>
            <MathJax>{"\\[ = \\left( \\frac{v_{0y}}{v_{0x}} \\right) x - \\left( \\frac{g}{2 v_{0x}^2} \\right) x^2 \\]"}</MathJax>
            <MathJax>{"\\[ = (\\tan \\theta) x - \\left( \\frac{g}{2 v_0^2 \\cos^2 \\theta} \\right) x^2 \\]"}</MathJax>
            <p>
              This is a quadratic equation in <MathJax inline>{"\\( x \\)"}</MathJax>, confirming that the path is a parabola.
              The coefficients depend on the launch angle and speed, which determine the shape of the trajectory.
            </p>
          </HiddenExposition>
          <ProjectileLauncher />

          <h2>Try It</h2>
          <p>
            Use the interactive game below to explore 2D kinematics. Mouse or keyboard controls the acceleration vector.
          </p>
          <Kinematics2DGame />

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li
              onClick={() => setShowAnswer1(s => !s)}
              style={{ cursor: "pointer", fontWeight: "600", color: "#222" }}
            >
              A soccer ball is kicked at 20 m/s at an angle of 30°. What are the initial velocity components?
            </li>
            {showAnswer1 && (
              <p>
                Initial components:{" "}
                <MathJax inline>{"\\( v_{0x} = v_0 \\cos \\theta = 20 \\cos 30^\\circ \\approx 17.3 \\,\\text{m/s} \\)"}</MathJax>,{" "}
                <MathJax inline>{"\\( v_{0y} = v_0 \\sin \\theta = 20 \\sin 30^\\circ = 10 \\,\\text{m/s} \\)"}</MathJax>.
              </p>
            )}

            <li
              onClick={() => setShowAnswer2(s => !s)}
              style={{ cursor: "pointer", fontWeight: "600", color: "#222" }}
            >
              How long will it take the ball to reach its maximum height?
            </li>
            {showAnswer2 && (
              <p>
                The vertical velocity becomes zero at max height:{" "}
                <MathJax inline>{"\\( 0 = v_{0y} - g t \\)"}</MathJax> so{" "}
                <MathJax inline>{"\\( t = v_{0y}/g = 10/9.8 \\approx 1.02 \\,\\text{s} \\)"}</MathJax>. 
              </p>
            )}

            <li
              onClick={() => setShowAnswer3(s => !s)}
              style={{ cursor: "pointer", fontWeight: "600", color: "#222" }}
            >
              What is the total flight time until the ball lands (same height as launch)?
            </li>
            {showAnswer3 && (
              <p>
                The total time is double the time to max height:{" "}
                <MathJax inline>{"\\( T = 2 t = 2.04 \\,\\text{s} \\)"}</MathJax>.
                This can also be found by solving{" "}
                <MathJax inline>{"\\( 0 = v_{0y} T - \\tfrac{1}{2} g T^2 \\)"}</MathJax> for{" "}
                <MathJax inline>{"\\( T \\)"}</MathJax>.
              </p>
            )}

            <li
              onClick={() => setShowAnswer4(s => !s)}
              style={{ cursor: "pointer", fontWeight: "600", color: "#222" }}
            >
              What is the horizontal range of the ball?
            </li>
            {showAnswer4 && (
              <p>
                The horizontal range is{" "}
                <MathJax inline>{"\\( R = v_{0x} T = 17.3 \\times 2.04 \\approx 35.3 \\,\\text{m} \\)"}</MathJax>.
              </p>
            )}            
            <li>
            </li>

          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default Kinematics2D;
