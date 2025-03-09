import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import MassSpringSimulation from "../components/MassSpringSimulation"; // Adjust path if needed
import PendulumSimulation from "../components/PendulumSimulation"; // Adjust path if needed


const Oscillations = () => {
  return (
    <MathJaxContext>
      <div className="container mx-auto p-4 left-aligned-container">
        <h1 style={{ fontSize: "2rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Periodic Motion</h1>
        
        <h2 style={{ fontSize: "1.6rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Introduction</h2>
        <p>A system that returns to the same state after regular intervals of time is said to exhibit <strong> periodic motion</strong>. 
		 This repetitive motion occurs in many physical systems, from a swinging pendulum to vibrating molecules. 
		It may be also be referred to as oscillatory motion, or more simply, <strong>oscillations</strong>.</p>

<p>The quintessential oscillation is <strong>simple harmonic motion (SHM)</strong>, which occurs when a restoring force is proportional to a system's displacement from an equilibrium position. 
This results in sinusoidal motion, described by key properties such as period, frequency, and amplitude.</p>
        
        <h2 style={{ fontSize: "1.6rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Characteristics of Simple Harmonic Motion</h2>
        <ul className="mathjax-list">
          <li><strong>Equilibrium Position:</strong> The point where the net force is zero.</li>
          <li><strong>Restoring Force:</strong> A force that always acts toward equilibrium.</li>
          <li><strong>Amplitude (A):</strong> The maximum displacement from equilibrium.</li>
          <li><strong>Period (T):</strong> The time taken for one complete cycle.</li>
          <li><strong>Frequency (f):</strong> The number of cycles per second, given by <MathJax className="mathjax-align-left">{"\\( f = \\frac{1}{T} \\)"}</MathJax>.</li>
        </ul>
        
        <h2 style={{ fontSize: "1.6rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Examples of SHM</h2>
        <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Mass-Spring System</h3>
		
		<p>In this case, the restoring force is provided by the spring :</p>
        <MathJax className="mathjax-align-left">{"\\( F = -k x \\)"}</MathJax>
        <p>Applying Newton’s Second Law gives us an equation relating the acceleration and position for the mass :</p>
        <MathJax className="mathjax-align-left">{"\\( ma = -kx \\Rightarrow a = -\\frac{k}{m} x \\)"}</MathJax>
		<p>Techniques from calculus give us the following time-dependent solution for the position :</p>
        <MathJax className="mathjax-align-left">{"\\( x(t) = A \\sin(\\sqrt{\\frac{k}{m}} t + \\phi) \\)"}</MathJax>
		
		
        
        
        <MassSpringSimulation />

        <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Simple Pendulum</h3>
		
		
		<p>The pendulum system is a bit more complicated, but it exhibits SHM for "small" oscillations.</p>
       
        <p>When the angle is near the vertical, the horizontal position of the mass is approximately</p>
        <MathJax className="mathjax-align-left">{"\\( x(t) \\approx A \\sin(\\sqrt{\\frac{g}{L}} t + \\phi). \\)"}</MathJax>
        
		
		<PendulumSimulation />
		

        <h2 style={{ fontSize: "1.6rem", fontWeight: "600", marginTop: "1rem", color: "#222" }}>Practice Problems</h2>
        <ol className="mathjax-list">
          <li><strong>1</strong> A 0.5 kg mass is attached to a spring with stiffness 200 N/m. Find the period.</li>
          <li><strong>2</strong> A pendulum has a length of 1.5 m. Calculate its period on Earth.</li>
          <li><strong>3</strong> A mass oscillates with amplitude 0.1 m and frequency 2 Hz. What is its max velocity?</li>
        </ol>
      </div>
    </MathJaxContext>
  );
};


export default Oscillations;
