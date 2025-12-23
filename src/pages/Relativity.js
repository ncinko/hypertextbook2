// src/pages/Relativity.js
import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";

// Option A (recommended): move LightClock.js into src/components/relativity/LightClockSim.js
import LightClockSim from "../components/modern/LightClock";

const Relativity = () => {
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  const [showAnswer3, setShowAnswer3] = useState(false);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Special Relativity</h1>

          <h2>Introduction</h2>
          <p>
            Special relativity describes how measurements of time and space depend on the
            observer’s state of motion. The key idea is that the speed of light in vacuum,
            <MathJax inline>{"\\(c\\)"}</MathJax>, is the same for all inertial observers.
          </p>

          <h2>Postulates</h2>
          <ul className="card-list">
            <li>
              <strong>Relativity Principle</strong>
              <span>
                The laws of physics are the same in all inertial frames (no “preferred” inertial frame).
              </span>
            </li>
            <li>
              <strong>Constancy of Light Speed</strong>
              <span>
                All inertial observers measure the same value of{" "}
                <MathJax inline>{"\\(c\\)"}</MathJax> for the speed of light in vacuum.
              </span>
            </li>
          </ul>

          <h2>Core Results</h2>
          <p>
            Define the Lorentz factor
            <MathJax inline>{"\\(\\;\\gamma = \\frac{1}{\\sqrt{1-v^2/c^2}}\\;\\)"}</MathJax>.
          </p>

          <ul className="card-list">
            <li>
              <strong>Time Dilation</strong>
              <span>
                A moving clock runs slow:
                <MathJax inline>{"\\(\\;\\Delta t = \\gamma\\,\\Delta \\tau\\;\\)"}</MathJax>,
                where <MathJax inline>{"\\(\\Delta\\tau\\)"}</MathJax> is the proper time (time measured by the clock).
              </span>
            </li>
            <li>
              <strong>Length Contraction</strong>
              <span>
                Length along the direction of motion contracts:
                <MathJax inline>{"\\(\\;L = \\frac{L_0}{\\gamma}\\;\\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Relativity of Simultaneity</strong>
              <span>
                Events simultaneous in one inertial frame may not be simultaneous in another.
              </span>
            </li>
          </ul>

          <h2>The Light Clock</h2>
          <p>
            A “light clock” is a simple thought experiment: light bounces between two mirrors.
            In the clock’s rest frame, the light travels straight up and down; in another frame
            where the clock is moving, the light must trace a diagonal path. Since the speed of
            light is fixed, the diagonal path implies a longer tick time.
          </p>

          {/* --- Simulation Slot (your component) --- */}
          <div className="mathjax-container" style={{ marginTop: "1rem" }}>
            <LightClockSim />
          </div>

          <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li
              onClick={() => setShowAnswer1((s) => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}
            >
              A spaceship moves past Earth at <MathJax inline>{"\\(v = 0.80c\\)"}</MathJax>.
              What is <MathJax inline>{"\\(\\gamma\\)"}</MathJax>?
            </li>
            {showAnswer1 && (
              <p>
                <MathJax inline>
                  {
                    "\\(\\gamma = \\frac{1}{\\sqrt{1-0.8^2}} = \\frac{1}{\\sqrt{0.36}} \\approx 1.667\\)."
                  }
                </MathJax>
              </p>
            )}

            <li
              onClick={() => setShowAnswer2((s) => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}
            >
              A process takes <MathJax inline>{"\\(\\Delta\\tau = 3.0\\text{ s}\\)"}</MathJax> in its own rest frame.
              How long does it take in a frame where it moves at <MathJax inline>{"\\(0.60c\\)"}</MathJax>?
            </li>
            {showAnswer2 && (
              <p>
                <MathJax inline>{"\\(\\gamma = 1/\\sqrt{1-0.6^2} = 1/0.8 = 1.25\\)"}</MathJax>, so{" "}
                <MathJax inline>{"\\(\\Delta t = \\gamma\\Delta\\tau = 1.25\\times 3.0 = 3.75\\text{ s}\\)"}</MathJax>.
              </p>
            )}

            <li
              onClick={() => setShowAnswer3((s) => !s)}
              style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}
            >
              A rod has proper length <MathJax inline>{"\\(L_0 = 2.0\\text{ m}\\)"}</MathJax>.
              If it moves at <MathJax inline>{"\\(0.90c\\)"}</MathJax> along its length, what length is measured in the lab frame?
            </li>
            {showAnswer3 && (
              <p>
                <MathJax inline>{"\\(\\gamma = 1/\\sqrt{1-0.9^2} = 1/\\sqrt{0.19} \\approx 2.294\\)"}</MathJax>, so{" "}
                <MathJax inline>{"\\(L = L_0/\\gamma \\approx 2.0/2.294 \\approx 0.872\\text{ m}\\)"}</MathJax>.
              </p>
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default Relativity;
