import React from "react";
import { Link } from "react-router-dom";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenExposition from "../components/shared/HiddenExposition";
import HiddenQuestion from "../components/shared/HiddenQuestion";

const chipStyle = {
  display: "inline-block",
  border: "1px solid #dde1ff",
  borderRadius: "999px",
  padding: "4px 12px",
  margin: "4px 6px",
  fontSize: 12,
  background: "#f4f6ff",
};

export default function Energy() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Energy</h1>

          <h2>Introduction</h2>
          <p>
            Energy tracks what a system can do. It is stored as kinetic motion, potential
            position, thermal agitation, or field configuration. In mechanics, the core idea
            is that the total energy of a closed system remains constant, while energy can
            flow between objects and change form.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Kinetic energy</strong>
              <span>
                Translational motion carries kinetic energy
                <MathJax inline>{" \\( K = \\tfrac{1}{2}mv^2 \\)"}</MathJax>.
                Faster or heavier objects store more energy in motion.
              </span>
            </li>
            <li>
              <strong>Potential energy</strong>
              <span>
                In a uniform gravitational field, potential energy is
                <MathJax inline>{" \\( U = mgh \\)"}</MathJax>. For a spring,
                <MathJax inline>{" \\( U = \\tfrac{1}{2}kx^2 \\)"}</MathJax>. These forms
                connect energy storage to position and deformation.
              </span>
            </li>
            <li>
              <strong>Work-energy theorem</strong>
              <span>
                Net work changes kinetic energy:
                <MathJax inline>{" \\( W_{\text{net}} = \\Delta K \\)"}</MathJax>. This links
                forces, displacement, and changes in speed.
              </span>
            </li>
            <li>
              <strong>Conservation</strong>
              <span>
                When only conservative forces act,
                <MathJax inline>{" \\( K + U = \\text{constant} \\)"}</MathJax>. This lets you
                compare energy at two points instead of tracking every force at every instant.
              </span>
            </li>
          </ul>

          <h2>Energy pathways</h2>
          <p>
            Mechanical energy is transferred through work, while power tracks the rate of
            transfer:
            <MathJax inline>{" \\( P = \\tfrac{dW}{dt} = \\vec{\\mathbf F} \\cdot \\vec{\\mathbf v} \\)"}</MathJax>.
            When nonconservative forces such as friction act, energy converts to thermal or
            sound energy rather than disappearing.
          </p>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ marginBottom: 6, fontStyle: "italic" }}>Try it:</div>
            <span style={chipStyle}>Track energy as a cart rolls down a ramp</span>
            <span style={chipStyle}>Compare gravitational and spring energy forms</span>
            <span style={chipStyle}>Relate power to how quickly work is done</span>
          </div>

          <HiddenExposition title="Why does speed increase as height decreases?">
            <p>
              In the absence of nonconservative forces, mechanical energy stays constant:
              <MathJax inline>{" \\( K_1 + U_1 = K_2 + U_2 \\)"}</MathJax>. When an object drops,
              gravitational potential energy decreases. The difference appears as kinetic energy,
              which means the speed must increase.
            </p>
          </HiddenExposition>

          <HiddenExposition title="How does energy link to momentum?">
            <p>
              For nonrelativistic motion, kinetic energy and momentum are connected by
              <MathJax inline>{" \\( K = \\tfrac{p^2}{2m} \\)"}</MathJax>. This is useful when you know
              momentum but want to compare energy, especially in collisions.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A 2.0 kg cart rolls down a 1.5 m tall ramp. Ignoring friction, what speed does it reach?
                </span>
              }
            >
              <MathJax>
                {`Use conservation: \\n                K_f = mgh = (2.0)(9.8)(1.5) = 29.4\\,\\text{J}. \\n                Then \\n                v = \\sqrt{2K_f/m} = \\sqrt{2(29.4)/2.0} \\approx 5.4\\,\\text{m/s}.`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  A spring with \\n                  <MathJax inline>{"\\(k = 200\\,\\text{N/m}\\)"}</MathJax> is compressed 0.10 m. How much energy is stored?
                </span>
              }
            >
              <MathJax>
                {`Spring energy is \\( U = \\tfrac{1}{2}kx^2 \\).
                With \\( k = 200 \\) and \\( x = 0.10 \\), \\n                U = 0.5(200)(0.10^2) = 1.0\\,\\text{J}.`}
              </MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={<span>How much power is required to lift a 50 kg load at 0.60 m/s?</span>}
            >
              <MathJax>
                {`Power for constant speed: \\( P = Fv = mgv \\).
                With \\( m = 50 \\), \\( g = 9.8 \\), and \\( v = 0.60 \\), \\n                P = (50)(9.8)(0.60) \\approx 294\\,\\text{W}.`}
              </MathJax>
            </HiddenQuestion>
          </div>

          <p>
            Ready for more? Connect energy to <Link to="/momentum">momentum</Link> or
            explore oscillations where energy shuttles between kinetic and potential forms.
          </p>
        </div>
      </MathJaxContext>
    </div>
  );
}
