import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import RotatingDiskSimulation from "../components/RotatingDiskSimulation"; // Adjust path if needed
import TorqueSimulation from "../components/TorqueSimulation"; // Adjust path if needed
import PendulumDiskSimulation from "../components/PendulumDiskSimulation"; // Adjust path if needed

const RotationalDynamics = () => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  const [showAnswer3, setShowAnswer3] = useState(false);

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const handleToggleAnswer1 = () => {
    setShowAnswer1(!showAnswer1);
  };

  const handleToggleAnswer2 = () => {
    setShowAnswer2(!showAnswer2);
  };

  const handleToggleAnswer3 = () => {
    setShowAnswer3(!showAnswer3);
  };

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Rotational Dynamics</h1>

          <h2>Introduction</h2>
          <p>
            Rotational dynamics is the study of objects in rotational motion and the forces that produce and influence this motion.
            Just as linear dynamics deals with mass, velocity, and acceleration, rotational dynamics involves quantities such as
            <strong> torque</strong>, <strong>moment of inertia</strong>, and <strong>angular momentum</strong>.
          </p>

          <h2>Key Concepts</h2>
          <ul className="mathjax-list">
            <li>
              <strong>Torque (\\( \\tau \\)):</strong> The rotational equivalent of force, defined as 
              <MathJax inline>{"\\( \\tau = r \\times F \\)"}</MathJax>, where <MathJax inline>{"\\( r \\)"}</MathJax> is the lever arm and <MathJax inline>{"\\( F \\)"}</MathJax> is the applied force.
            </li>
            <li>
              <strong>Moment of Inertia (\\( I \\)):</strong> A measure of an object's resistance to changes in its rotational motion.
              For a point mass, it is given by <MathJax inline>{"\\( I = mr^2 \\)"}</MathJax>, while for extended bodies it is obtained by integrating over the mass distribution.
            </li>
            <li>
              <strong>Angular Kinematics:</strong> Describes rotational motion using angular displacement (<MathJax inline>{"\\( \\theta \\)"}</MathJax>),
              angular velocity (<MathJax inline>{"\\( \\omega = \\frac{d\\theta}{dt} \\)"}</MathJax>), and angular acceleration (<MathJax inline>{"\\( \\alpha = \\frac{d\\omega}{dt} \\)"}</MathJax>).
            </li>
            <li>
              <strong>Angular Momentum (\\( L \\)):</strong> Defined as <MathJax inline>{"\\( L = I\\omega \\)"}</MathJax>, it is a conserved quantity in the absence of external torques.
            </li>
            <li>
              <strong>Rotational Kinetic Energy:</strong> The energy associated with rotation, given by 
              <MathJax inline>{"\\( K_{rot} = \\frac{1}{2} I \\omega^2 \\)"}</MathJax>.
            </li>
          </ul>

          <h2>Examples</h2>
          <div className="mathjax-container">
            <h3>Rotating Disk</h3>
            <p>
              For a solid disk rotating about its central axis, the moment of inertia is given by 
              <MathJax inline>{"\\( I = \\frac{1}{2} m r^2 \\)"}</MathJax>. When a net torque is applied,
              the disk experiences an angular acceleration as described by Newton’s second law for rotation:
              <MathJax inline>{"\\( \\tau = I \\alpha \\)"}</MathJax>.
            </p>
            <RotatingDiskSimulation />
          </div>

          <div className="mathjax-container" style={{ marginTop: "1rem" }}>
            <h3>Lever Arm and Torque</h3>
            <p>
              When a force is applied at an angle at a distance from a pivot point, it produces a torque:
              <MathJax inline>{"\\( \\tau = r F \\sin(\\theta) \\)"}</MathJax>. Here, <MathJax inline>{"\\( \\theta \\)"}</MathJax> represents the angle between the force vector and the lever arm.
            </p>
            <TorqueSimulation />
          </div>

          <div className="mathjax-container" style={{ marginTop: "1rem" }}>
            <h3>Physical Pendulum</h3>
            <p>
              The angular frequency of a physical pendulum is given by:
              <MathJax inline>{"\\( \\omega = \\sqrt{\\frac{mgd}{I}}\\)"}</MathJax>. Here, <MathJax inline>{"\\( \\d \\)"}</MathJax> represents the distance between the pivot point and the pendulum's center of mass.
            </p>
            <PendulumDiskSimulation />
          </div>

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li onClick={handleToggleAnswer} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              A solid disk of mass 4 kg and radius 0.5 m is subjected to a net torque of 2 N·m. Calculate its angular acceleration.
            </li>
            {showAnswer && (
              <p>
                The moment of inertia for a solid disk is <MathJax inline>{"\\( I = \\frac{1}{2} m r^2 \\)"}</MathJax>.
                Substituting the values, we have:
                <MathJax inline>{"\\( I = \\frac{1}{2} \\times 4 \\times (0.5)^2 = 0.5 \\, \\text{kg}\\cdot\\text{m}^2 \\)"}</MathJax>.
                Using <MathJax inline>{"\\( \\tau = I \\alpha \\)"}</MathJax>, we find the angular acceleration:
                <MathJax inline>{"\\( \\alpha = \\frac{\\tau}{I} = \\frac{2}{0.5} = 4 \\, \\text{rad/s}^2 \\)"}</MathJax>.
              </p>
            )}
            <li onClick={handleToggleAnswer1} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              A force of 10 N is applied tangentially to the rim of a wheel with a radius of 0.3 m. What is the resulting torque?
            </li>
            {showAnswer1 && (
              <p>
                Using the formula <MathJax inline>{"\\( \\tau = rF \\)"}</MathJax>, we calculate:
                <MathJax inline>{"\\( \\tau = 0.3 \\times 10 = 3 \\, \\text{N·m} \\)"}</MathJax>.
              </p>
            )}
            <li onClick={handleToggleAnswer2} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              If a rotating object has an angular momentum of 8 kg·m²/s and a moment of inertia of 2 kg·m², what is its angular velocity?
            </li>
            {showAnswer2 && (
              <p>
                Since <MathJax inline>{"\\( L = I\\omega \\)"}</MathJax>, the angular velocity is:
                <MathJax inline>{"\\( \\omega = \\frac{L}{I} = \\frac{8}{2} = 4 \\, \\text{rad/s} \\)"}</MathJax>.
              </p>
            )}
            <li onClick={handleToggleAnswer3} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              Determine the rotational kinetic energy of a disk with a moment of inertia of 0.5 kg·m² rotating at 4 rad/s.
            </li>
            {showAnswer3 && (
              <p>
                The rotational kinetic energy is given by 
                <MathJax inline>{"\\( K_{rot} = \\frac{1}{2} I \\omega^2 \\)"}</MathJax>. Substituting in the values:
                <MathJax inline>{"\\( K_{rot} = \\frac{1}{2} \\times 0.5 \\times 4^2 = 4 \\, \\text{J} \\)"}</MathJax>.
              </p>
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default RotationalDynamics;
