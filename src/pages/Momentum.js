import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
// If you have a momentum simulation component, you could import it here
import MomentumSim from "../components/MomentumSim";

const Momentum = () => {
  const [showAnswer, setShowAnswer] = useState(false);
  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

return (
    <div className="mathjax-container">
        <MathJaxContext>
            <div className="container mx-auto p-4 left-aligned-container">
                <h1>Momentum</h1>

                <h2>Introduction</h2>
                <p>
                    Momentum is a quantity that represents an object's motion and inertia. Along with energy, it provides a conceptual foundation for most of classical and modern mechanics.
                </p>

                <h2>Key Concepts</h2>
                <ul className="card-list">
                    <li>
                        <strong>Momentum</strong>
                        <span>
                            {" "}
                            Defined as{" "}
                            <MathJax inline>{"\\( \\vec{p} = m \\vec{v} \\)"}</MathJax>, where{" "}
                            <MathJax inline>{"\\( m \\)"}</MathJax> is the mass of an object and{" "}
                            <MathJax inline>{"\\( \\vec{v} \\)"}</MathJax> is its velocity.
                        </span>
                    </li>
                    <li>
                        <strong>Conservation of Momentum</strong>
                        <span>
                            {" "}
                            In an isolated system, the total momentum before and after an
                            event (such as a collision) remains constant.
                        </span>
                    </li>
                    <li>
                        <strong>Impulse</strong>
                        <span>
                            {" "}
                            External forces result in a change momentum according to {" "}
                            <MathJax inline>{"\\(\\Delta \\vec{p} = \\vec{F} \\Delta t \\)"}</MathJax>,
                            where <MathJax inline>{"\\( \\vec{F} \\)"}</MathJax> is the applied force
                            and <MathJax inline>{"\\( \\Delta t \\)"}</MathJax> is the time over
                            which the force acts.  The right-hand side of the equation is known as the impulse.
                        </span>
                    </li>
                </ul>

                <h2>Applications</h2>
                <p>
                    Momentum is central to the study of collisions, explosions, and other processes. During collisions, momentum is exchanged between objects.  
                    Although this quantity changes for each individual object, the total momentum of the system is conserved.
                </p>
                <p>
                Click and drag below to create additional masses.
                </p>

                {/* Optional: Insert a momentum simulation if available */}
                {<MomentumSim />}

                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <p
                        onClick={handleToggleAnswer}
                        style={{ cursor: "pointer", color: "#222", fontWeight: "600" }}
                    >
                        In the collisions above, which quantities are conserved?
                    </p>
                    {showAnswer && (
                        <><p>
                            The total momentum is conserved during collisions between any of the masses.  In this particular simulation the collisions are elastic, so kinetic energy is also conserved.
                        </p><p>
                                Collisions with the wall do not conserve momentum, as the wall imparts an external force on the system.
                            </p></>
                    )}
                </div>

                
            </div>
        </MathJaxContext>
    </div>
);
};

export default Momentum;
