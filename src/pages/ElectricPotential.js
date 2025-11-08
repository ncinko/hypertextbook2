// src/pages/ElectricPotential.js
import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
// Placeholder imports for simulations (replace with real components later)
import PotentialFieldSimulation from "../components/electricity/PotentialFieldSimulation";
import PotentialEnergyLandscape from "../components/electricity/PotentialEnergyLandscape";
import ScalarPotential2D from "../components/electricity/ScalarPotential2D";
import ElectricPotentialSimulation from "../components/electricity/ElectricPotentialSimulation";
import HiddenExposition from "../components/shared/HiddenExposition"; 

const ElectricPotential = () => {
  const [showAnswer1, setShowAnswer1] = useState(false);
  const [showAnswer2, setShowAnswer2] = useState(false);
  const [showAnswer3, setShowAnswer3] = useState(false);
  const [showDerivation, setShowDerivation] = useState(false);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Electric Potential</h1>

          <h2>Introduction</h2>
          <p>
            The concept of <strong>electric potential</strong> provides a way to
            describe electric interactions in terms of energy, rather than force.
            Just as gravitational potential energy relates to gravitational force,
            electric potential energy relates to electric force.
          </p>
          <p>
            When a charge moves in an electric field, its potential energy
            changes. We define the <strong>electric potential</strong>{" "}
            <MathJax inline>{"\\( V \\)"}</MathJax> as the potential energy per
            unit charge.
          </p>

          <h2>Key Concepts</h2>
          <ul className="card-list">
            <li>
              <strong>Potential Energy</strong>
              <span>
                The electric force does work on moving charges. The change in potential
                energy is{" "}
                <MathJax inline>{"\\( \\Delta U = - W_{\\text{force}} \\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Electric Potential</strong>
              <span>
                Defined as{" "}
                <MathJax inline>{"\\( V = \\tfrac{U}{q} \\)"}</MathJax>, the
                potential energy per unit charge.
              </span>
            </li>
            
            <li>
              <strong>Equipotential Surfaces</strong>
              <span>
                Surfaces where the electric potential is constant. No work is required to
                move a charge along such a surface.
              </span>
            </li>
            <li>
              <strong>Relation to Electric Field</strong>
              <span>
                The field is the negative gradient of the potential:{" "}
                <MathJax inline>{"\\( \\vec{E} = -\\nabla V \\)"}</MathJax>.
              </span>
            </li>
          </ul>


          <div className="mathjax-container" style={{ marginTop: "1rem" }}>
            <h2>Potential Energy Landscapes</h2>
            <p>
              Visualizing objects "rolling" on a potential energy surface helps connect the force and energy perspectives.  In the simulation below, a mass feels either a spring-like force or a simple gravitational force.  In both cases, we can see how the object has a tendency to move "downhill" along the 1D potential energy curve.
            </p>
            <p></p>
            <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
            <PotentialEnergyLandscape />
            </div>
<p> </p>
            <p>

              This tendency is a general property of conservative forces.  The force always acts in the direction of decreasing potential energy, which is captured mathematically by
                
<MathJax inline>{" \\( F \\approx -\\frac{\\Delta U}{\\Delta x}\\)"}</MathJax>.  You may note that this corresponds to the slope of the potential energy function <MathJax inline>{"\\( U(x) \\)"}</MathJax>.
              </p>

            <HiddenExposition title="Are there liberal forces?" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
    <p>
The work done by a conservative force depends only on the initial and final positions of an object, not the path it takes.  These are the types of forces for which we define a (scalar) potential energy function.  The electric, gravitational, and spring-like forces are conservative.  Forces like air resistance and friction are not conservative.</p>
<p>In one dimension, the work done by a force along a small segment of path is <MathJax inline>{" \\( W \\approx F \\Delta x \\)"}</MathJax>.  If the force is conservative, we say this work corresponds to a change in potential energy, <MathJax inline>{" \\( \\Delta U = -W \\)"}</MathJax>.  Combining these gives the relationship between force and potential energy in one dimension:</p>
<p><MathJax inline>{" \\( F \\approx -\\frac{\\Delta U}{\\Delta x} \\)"}</MathJax>.</p>
<p>This means that the force points in the direction of decreasing potential energy.  If the potential energy increases with position, the force is negative (pointing left); if the potential energy decreases with position, the force is positive (pointing right).</p>
</HiddenExposition>
<p>In three dimensions, this relationship is captured by the gradient operator, which points in the direction of steepest increase of a scalar field.</p>
            <p><MathJax inline>{"\\( \\vec{F} = -\\nabla U = -\\langle \\frac{\\partial U}{\\partial x}, \\frac{\\partial U}{\\partial y}, \\frac{\\partial U}{\\partial z} \\rangle \\)"}</MathJax>.  <em>  Don't worry if this notation is unfamiliar.</em></p>
            <p>We may not have the tools to evaluate this expression, but we can still use our intuition.  In 2D, we can imagine space has a corresponding energy landscape <MathJax inline>{"\\( U(x,y) \\)"}</MathJax> defined by various hills, valleys, and other topographical features.  The dynamics are then analogous to matter tending to flow "downhill".</p>
          </div>

          <h2>After U</h2>
            <p>Before jumping to the electrical case, let's consider the gravitational potential energy near Earth's surface.  We often write this as <MathJax inline>{"\\( U = mgh \\)"}</MathJax>, where <MathJax inline>{"\\( h \\)"}</MathJax> is the height above some reference level.</p>
            <HiddenExposition title="Does this agree with our definition for potential energy?">
    <p>Yes!  The gravitational force near Earth's surface (with "up" as the positive direction) is  <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( F = - mg \\)"}</MathJax>.</div>
      The work done by this force when moving an object vertically by a small distance <MathJax inline>{"\\( \\Delta h \\)"}</MathJax> is
       <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( W = F \\Delta h = -mg \\Delta h \\)"}</MathJax>.</div>  
    Thus, the change in potential energy is 
    <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( \\Delta U = -W = mg \\Delta h \\)"}</MathJax>.</div>
      If we choose our reference level so that <MathJax inline>{"\\( U = 0 \\)"}</MathJax> at <MathJax inline>{"\\( h = 0 \\)"}</MathJax>, then we can write the potential energy as
    <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( U(h) = mgh \\)"}</MathJax></div>.</p>
</HiddenExposition>
            <p>Suppose we wanted to express the potential energy independently of mass <MathJax inline>{"\\( m \\)"}</MathJax>.  
            To do this, we may define a function <MathJax inline>{"\\( V = gh\\)"}</MathJax>, with the rule that <MathJax inline>{" \\( U = mV \\)"}</MathJax>.  
            This function <MathJax inline>{"\\( V \\)"}</MathJax>, which has units of J/kg, would tell us how much gravitational potential energy an object would have per unit mass at a given height.</p>
            <p>In the case of the electric force, <em>we do this exact procedure </em>.  
            The electric potential function <MathJax inline>{"\\( V \\)"}</MathJax> is defined such that <MathJax inline>{"\\( U = qV \\)"}</MathJax>, 
            where <MathJax inline>{"\\( q \\)"}</MathJax> is the charge.  The electric potential has units of J/C, which we call volts (V).</p>
            <p>It's worth pointing out that only changes in potential energy, and therefore changes in electric potential, are physical.  Our potential energy function can
                be shifted up or down by an arbitrary constant without changing the physics.  Analogously, changes in elevation do not depend on our choice of sea level.  
                When defining <MathJax inline>{"\\( V \\)"}</MathJax>, we say we have a choice of 'zero potential'. </p>

            <h2>Point Charge Potential</h2>
            <p>The electric potential due to a point charge <MathJax inline>{"\\( Q \\)"}</MathJax> is given by</p>
            <div style={{ textAlign: "center", margin: "10px 0" }}>
              <MathJax inline>{"\\( V = k \\frac{Q}{r} \\)"}</MathJax>
            </div>
            <p>where <MathJax inline>{"\\( r \\)"}</MathJax> is the distance from the charge, and <MathJax inline>{"\\( k = 9 \\times 10^9 \\; \\frac{\\text{N m}^2}{\\text{C}^2} \\)"}</MathJax>.</p>
            <HiddenExposition title="How is this derived?" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
    <p>We start with the definition of electric potential in terms of potential energy: <MathJax inline>{"\\( V = \\tfrac{U}{q} \\)"}</MathJax>.  Thus, we need to find the potential energy <MathJax inline>{"\\( U \\)"}</MathJax> of a charge <MathJax inline>{"\\( q \\)"}</MathJax> in the electric field of another point charge <MathJax inline>{"\\( Q \\)"}</MathJax>.</p>
    <p>The electric force between two point charges is given by Coulomb's law: <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( F = k \\frac{Qq}{r^2} \\)"}</MathJax>,</div> where <MathJax inline>{"\\( r \\)"}</MathJax> is the distance between the charges.  This force is repulsive if the charges have the same sign and attractive if they have opposite signs.</p>
    <p>To find the potential energy, we consider the work done by this force when moving the charge <MathJax inline>{"\\( q \\)"}</MathJax> from a reference point at infinity to a distance <MathJax inline>{"\\( r \\)"}</MathJax> from <MathJax inline>{"\\( Q \\)"}</MathJax>.  The work done by the electric force is given by <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( W = \\int_{\\infty}^{r} F \\, dr = \\int_{\\infty}^{r} k \\frac{Qq}{r^2} \\, dr \\)"}</MathJax>.</div></p>
    <p>Evaluating this integral, we have <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\(\\Delta U = -\\int_{\\infty}^{r} k \\frac{Qq}{r^2} \\, dr = - kQq \\left[ -\\frac{1}{r} \\right]_{\\infty}^{r} = k \\frac{Qq}{r} \\)"}</MathJax>.</div></p>
    <p>Finally, substituting this expression for <MathJax inline>{"\\( U \\)"}</MathJax> into the definition of electric potential, we find <div style={{ textAlign: "center", margin: "6px 0" }}><MathJax inline>{"\\( V = \\frac{U}{q} = k \\frac{Q}{r} \\)"}</MathJax>.</div></p>
</HiddenExposition>
            <p>Let's first turn to the issue of visualizing this function.  We'll stick with 2D space and represent values of <MathJax inline>{"\\( V(x,y) \\)"}</MathJax> using a color map. 
             The plot below shows the potential field of a single positive point charge.  You can see that the potential decreases as you move away from the charge, and increases as you move closer.</p>
            <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
            <ScalarPotential2D />
            </div>
            <p>In 3D, we usually visualize <MathJax inline>{"\\( V(x,y,z) \\)"}</MathJax> by drawing <em>equipotential surfaces</em>, which are analogous to the equipotential lines shown above.  
            Note that since</p>
<div style={{ textAlign: "center", margin: "10px 0" }}>
              <MathJax inline>{"\\( U = qV\\),"}</MathJax>
            </div>
            <p>positive and negative charges have different behavior in a space described by the same potential function.  In both cases, they have a tendency to flow toward regions of lower <em>electric potential energy</em>, not lower <em>electric potential</em>.  
             It can be tricky to keep track of the signs of everything at first (not to mention the symbols which overlap with units).   When in doubt, make sure the dynamics agrees with "like charges repel, opposites attract".</p>

            <p>In this final simulation, we'll add electric potential into our existing electric field visualization.  Try to develop some sense of how placing source charges affects the potential, 
                how a test charge behaves in a given potential landscape, and the relationship between electric field and potential</p>  
            <div style={{ marginTop: "2rem", marginBottom: "2rem" }}>
            <ElectricPotentialSimulation />
            </div>
            <p><strong>Note:</strong> lines of equipotential are usually drawn at common intervals (100 Volts, 200 Volts, ...).  
            These are analogous to lines of constant elevation on a topographical map (perhaps drawn every 100 feet).  
            It turns out this is rather tricky to simulate, so the ones above are haphazardly placed.    </p>
            <p>However, they do retain the important feature of being perpendicular to the electric field lines.
               In the same way <MathJax inline>{" \\( F \\approx -\\frac{\\Delta U}{\\Delta x}\\)"}</MathJax> in one dimension,
                <MathJax inline>{" \\( E \\approx -\\frac{\\Delta V}{\\Delta x}\\)"}</MathJax>.   </p> 
                <h2>Practice Problems</h2>
          <ol className="mathjax-list">
            <li
              onClick={() => setShowAnswer1(!showAnswer1)}
              style={{ cursor: "pointer", fontWeight: 600 }}
            >
              What is the electric potential 0.25 m from a +3 µC point charge?
            </li>
            {showAnswer1 && (
              <p>
                Using{" "}
                <MathJax inline>{"\\( V = k q / r \\)"}</MathJax> with{" "}
                <MathJax inline>{"\\( k = 9\\times10^9 \\)"}</MathJax>,{" "}
                <MathJax inline>{"\\( q = 3\\times10^{-6} \\)"}</MathJax> C, and{" "}
                <MathJax inline>{"\\( r = 0.25 \\)"}</MathJax> m:
                <MathJax>
                  {"\\( V = 9\\times10^9 \\tfrac{3\\times10^{-6}}{0.25} \\approx 1.1\\times10^5 \\; \\text{V} \\)"}
                </MathJax>
              </p>
            )}

            <li
              onClick={() => setShowAnswer2(!showAnswer2)}
              style={{ cursor: "pointer", fontWeight: 600 }}
            >
              Why is no work required to move a charge along an equipotential surface?
            </li>
            {showAnswer2 && (
              <p>
                Along an equipotential surface,{" "}
                <MathJax inline>{"\\( \\Delta V = 0 \\)"}</MathJax>. Thus,{" "}
                <MathJax inline>{"\\( \\Delta U = q\\Delta V = 0 \\)"}</MathJax>.
              </p>
            )}
            <li
              onClick={() => setShowAnswer3(!showAnswer3)}
              style={{ cursor: "pointer", fontWeight: 600 }}
            >
              Find the change in electric potential energy of a -3 µC charge moving from 5 V to 12 V.
            </li>
            {showAnswer3 && (
              <p>
                Using{" "} 
                <MathJax inline>{"\\( \\Delta U = q \\Delta V \\)"}</MathJax> with{" "}
                <MathJax inline>{"\\( q = -3\\times10^{-6} \\)"}</MathJax> C, and{" "}
                <MathJax inline>{"\\( \\Delta V = 7 \\)"}</MathJax> V:
                <MathJax>{"\\( \\Delta U = -3\\times10^{-6} \\times 7 = -2.1\\times10^{-5} \\; \\text{J} \\)"}</MathJax>
              </p>
              
            )}
          </ol>
        </div>
      </MathJaxContext>
    </div>
  );
};

export default ElectricPotential;
