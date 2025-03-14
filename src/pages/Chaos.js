import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
// Import a simulation component for a double pendulum (adjust path as needed)
import DoublePendulumSim from "../components/DoublePendulumSim";
import ElasticPendulumSim from "../components/ElasticPendulumSim";
import DualElasticPendulumSim from "../components/DualElasticPendulumSim";
import DualDoublePendulumSim from "../components/DualDoublePendulumSim";

const Chaos = () => {
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);

  const toggleAnswer1 = () => setShowAnswer1(!showAnswer1);
  const toggleAnswer2 = () => setShowAnswer2(!showAnswer2);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Chaos</h1>

          <h2>Introduction</h2>
          <p>
            Chaos theory explores how systems governed by deterministic laws can exhibit unpredictable behavior. Even in simple mechanical systems, such as a double pendulum, tiny differences in the initial state can lead to vastly different outcomes.
          </p>

          <h2>Key Concepts</h2>
          <ul class="card-list">
            <li>
                <strong>Butterfly Effect</strong>
                <span>Small variations in the starting conditions can lead to significant differences in the system's evolution.  The metaphorical flap of a butterfly's wing, a seemingly insignficant perturbation, eventually leads to a tornado.</span>
            </li>
            <li>
                <strong>Non-Periodic</strong>
                <span>These systems do not settle into a repeating pattern, making their long-term behavior appear random.</span>
            </li>
            <li>
                <strong>Deterministic</strong>
                <span>Despite their apparent randomness, chaotic systems follow specific laws of motion.  If the initial conditions were exactly known, the future states could be predicted indefinitely.</span>
            </li>
    
            </ul>

          <h2>Double Pendulum</h2>
          <p>
            The double pendulum is a classic example from mechanics that demonstrates chaotic behavior.
             Although its motion is entirely deterministic, even a minute difference in the initial angles can lead to completely different trajectories.
          </p>
          <p>
            The middle plot shows the (position) state of each pendulum, tracing the angles of the two masses over time.
              The chaotic nature of the system is evident as the trajectories diverge, even though the initial conditions are nearly identical.
          </p>
          <DualDoublePendulumSim />

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li onClick={toggleAnswer1} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              How does the double pendulum illustrate sensitive dependence on initial conditions?
            </li>
            {showAnswer1 && (
              <p>
                The double pendulum shows that even a small change in the initial angle or velocity can result in significantly different motion over time, making its future behavior hard to predict.
              </p>
            )}
            <li onClick={toggleAnswer2} style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}>
              What does it mean for a system to be deterministic yet unpredictable?
            </li>
            {showAnswer2 && (
              <p>
                Although the double pendulum obeys the precise laws of physics, its nonlinear dynamics amplify tiny differences in initial conditions, which leads to unpredictable long-term behavior.
              </p>
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default Chaos;
