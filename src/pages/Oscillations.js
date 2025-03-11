import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import MassSpringSimulation from "../components/MassSpringSimulation"; // Adjust path if needed
import PendulumSimulation from "../components/PendulumSimulation"; // Adjust path if needed
import PendulumDiskSimulation from "../components/PendulumDiskSimulation"; // Adjust path if needed

const Oscillations = () => {
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
        <h1>Periodic Motion</h1>
        
        <h2>Introduction</h2>

        
        <p>A system that returns to the same state after regular intervals of time is said to exhibit <strong> periodic motion</strong>. 
         This repetitive motion occurs in many physical systems, from a swinging pendulum to vibrating molecules. 
        It may be also be referred to as oscillatory motion, or more simply, <strong>oscillations</strong>.</p>

        <p>The quintessential oscillation is <strong>simple harmonic motion (SHM)</strong>, which occurs when a restoring force is proportional to a system's displacement from an equilibrium position. 
        This results in sinusoidal motion, described by key properties such as period, frequency, and amplitude.</p>

        <h2>Characteristics of Simple Harmonic Motion</h2>
        <ul className="mathjax-list">
          <li><strong>Equilibrium Position:</strong> The point where the net force is zero.</li>
          <li><strong>Restoring Force:</strong> A force that always acts toward equilibrium.</li>
          <li><strong>Amplitude (A):</strong> The maximum displacement from equilibrium.</li>
          <li><strong>Period (T):</strong> The time taken for one complete cycle.</li>
          <li><strong>Frequency (f):</strong> The number of cycles per second, given by <MathJax inline>{"\\( f = \\frac{1}{T} \\)"}</MathJax>.</li>
        </ul>
        
        <h2>Examples of SHM</h2>
        
        <div className="mathjax-container">
        <h3>Mass-Spring System</h3>
        
        <p>In this case, the restoring force is provided by the spring :</p>
        <MathJax inline>{"\\( \\qquad F = -k x \\)"}</MathJax>
        <p>Applying Newton’s Second Law gives us an equation relating the acceleration and position for the mass :</p>
        <MathJax inline>{"\\( \\qquad ma = -kx \\Rightarrow a = -\\frac{k}{m} x \\)"}</MathJax>
        <p>Techniques from calculus give us the following time-dependent solution for the position :</p>
        <MathJax inline>{"\\( \\qquad x(t) = A \\sin(\\sqrt{\\frac{k}{m}} t + \\phi) \\)"}</MathJax>
        </div>
        <MassSpringSimulation />

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <p onClick={handleToggleAnswer} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
            What do the axes of the plot on the right represent?
          </p>
          {showAnswer && (
            <p>The horizontal axis represents the position (x) and the vertical axis represents the velocity (v). This is called a <strong>phase-space</strong> plot.</p>
          )}
        </div>

        <h3>Simple Pendulum</h3>
        
        <p>The pendulum system is a bit more complicated, but it exhibits SHM for "small" oscillations.</p>
       
        <p>When the angle is near the vertical, the horizontal position of the mass is approximately</p>
        <MathJax inline>{"\\(\\qquad x(t) \\approx A \\sin(\\sqrt{\\frac{g}{L}} t + \\phi) \\)"}</MathJax>
        
        <PendulumSimulation />

        <h3>Physical Pendulum</h3>

            
        <p>
          The angular frequency of a physical pendulum is given by </p>
          <MathJax >{"\\(\\qquad \\omega = \\sqrt{\\frac{mgd}{I}}\\)."}</MathJax>
        <p>Here, <MathJax inline>{"\\( d \\)"}</MathJax> represents the distance between the pivot point and the pendulum's center of mass and <MathJax inline>{"\\( I \\)"}</MathJax> represents the moment of inertia (about the pivot point).
        </p>
        <PendulumDiskSimulation />

        
        <h2>Practice Problems</h2>
        <ol className="mathjax-list">
          <li onClick={handleToggleAnswer1} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
            A 0.5 kg mass is attached to a spring with stiffness 200 N/m. Find the period.
          </li>
          {showAnswer1 && (
            <p>The period of a mass-spring system is given by <MathJax inline>{"\\( T = 2\\pi \\sqrt{\\frac{m}{k}} \\)"}</MathJax>.  Substituting <MathJax inline>{"\\( m = 0.5 \\)"}</MathJax> kg and <MathJax inline>{"\\( k = 200 \\)"}</MathJax> N/m, we get <MathJax inline>{"\\( T \\approx 0.314 \\)"}</MathJax> s.</p>
          )}
          <li onClick={handleToggleAnswer2} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
            A pendulum has a length of 1.5 m. Calculate its period on Earth.
          </li>
          {showAnswer2 && (
            <p>The period of a pendulum is given by <MathJax inline>{"\\( T = 2\\pi \\sqrt{\\frac{L}{g}} \\)"}</MathJax>.  Substituting <MathJax inline>{"\\( L = 1.5 \\)"}</MathJax> m and <MathJax inline>{"\\( g = 9.8 \\)"}</MathJax> m/s², we get <MathJax inline>{"\\( T \\approx 2.45 \\)"}</MathJax> s.</p>
          )}
          <li onClick={handleToggleAnswer3} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
            A mass oscillates with amplitude 0.1 m and frequency 2 Hz. What is its max velocity?
          </li>
          {showAnswer3 && (
            <p>The maximum velocity is given by <MathJax inline>{"\\( v_{max} = 2\\pi f A \\)"}</MathJax> (confirm this using conservation of energy).  Substituting <MathJax inline>{"\\( f = 2 \\)"}</MathJax> Hz and <MathJax inline>{"\\( A = 0.1 \\)"}</MathJax> m, we get <MathJax inline>{"\\( v_{max} \\approx 1.26 \\)"}</MathJax> m/s.</p>
          )}
        </ol>
      </div>
    </MathJaxContext>
    </div>
  );
};

export default Oscillations;
