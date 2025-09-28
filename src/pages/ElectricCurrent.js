// ===== File: src/pages/ElectricCurrent.js
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import ElectronGas from "../components/electricity/ElectronGas";
import SeriesCircuitExplorer from "../components/electricity/SeriesCircuitExplorer";
import HiddenExposition from "../components/HiddenExposition";

export default function ElectricCurrent() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Electric Current</h1>

          <h2>Introduction</h2>
          <p>
            The microscopic motion of charges and macroscopic circuit behavior provide two views of the same physics. Inside a metal, a sea
            of conduction electrons collides with the lattice while being nudged along by the electric field. In circuits, components shape the
            field to control current and energy transfer. Bridging the two pictures is the essence of Ohm&apos;s law.
          </p>
          

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Ohm&apos;s law</strong>&nbsp;&nbsp;&nbsp;
              <span>
                The macroscopic relation <MathJax inline>{" \\( \\Delta V = IR \\)"}</MathJax> emerges from the microscopic drift velocity
                <MathJax inline>{" \\( v_d = -\\frac{e E \\tau}{m_e} \\)"}</MathJax>. Longer times between lattice collisions or stronger fields boost
                drift speed and reduce resistivity.
              </span>
            </li>
            <li>
              <strong>Energy flow</strong>&nbsp;&nbsp;&nbsp;
              <span>
                Power delivered to a component is <MathJax inline>{" \\( P = I \\Delta V \\)"}</MathJax>. This comes from the potential energy/voltage relationship
                <MathJax inline>{" \\(\\Delta U = q \\Delta V \\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Circuit topology</strong>&nbsp;&nbsp;&nbsp;
              <span>
                The arrangement of components determines how current flows throughout a circuit.  Series and parallel combinations can be used to simplify the analysis of complex circuits.
              </span>
            </li>
          </ul>

          <h2>Microscopic picture of conduction</h2>
          <p>
            In the classical Drude model, metals host a dense gas of conduction electrons that ricochet off the ionic lattice. Each collision resets an
            electron&apos;s random thermal velocity, but a net electric field biases the motion to produce a slight drift.
            The interactive below shows that drift emerging from repeated collisions.
          </p>

          <ElectronGas />

          <p>
            The drift velocity can be estimated from the average time between lattice collisions <MathJax inline>{" \\( \\tau \\)"}</MathJax> and the
            electric field <MathJax inline>{" \\( E \\)"}</MathJax>:
          </p>
          <MathJax>{` 
            \\[
              v_d = -\\frac{e E \\tau}{m_e}
            \\]
          `}</MathJax>
          <p>
            Here, <MathJax inline>{" \\( e \\)"}</MathJax> and <MathJax inline>{" \\( m_e \\)"}</MathJax> are the electron charge and mass. The negative sign 
            indicates that electrons drift opposite the field direction. The drift speed is typically very small compared to the random thermal velocity.
            For example, in copper with <MathJax inline>{" \\( \\tau \\approx 2.5\\times10^{-14}\\,\\text{s} \\)"}</MathJax> and a field of <MathJax inline>{" \\( 1.0\\,\\text{V/m} \\)"}</MathJax>,
            the drift speed is only about <MathJax inline>{" \\( 0.4\\,\\text{mm/s} \\)"}</MathJax>.
          </p>
          <HiddenExposition title="How does this connect to Ohm's law? ">
          <p>
            Consider a metal's conductivity <MathJax inline>{" \\( \\sigma \\)"}</MathJax> and current density <MathJax inline>{" \\( J = I/A \\)"}</MathJax>. Higher conductivity means
            more current for a given electric field <MathJax inline>{" \\( E \\)"}</MathJax>, while current density is the current per cross-sectional area.
          </p>
          <p>The relationship between conductivity and current density is given by </p>
          <MathJax>{` 
            \\[
              J = \\sigma E 
            \\]
          `}</MathJax>
          
          <p>
            For a wire of length <MathJax inline>{" \\( L \\)"}</MathJax> and constant electric field, the potential difference across the wire is <MathJax inline>{" \\( \\Delta V = EL \\)"}</MathJax>. 
            Altogether we have
          </p>
          <MathJax>{`
            \\[
          J = \\sigma E = \\sigma \\frac{\\Delta V}{L} \\implies \\Delta V = \\frac{L}{\\sigma A} I
            \\]
          `}</MathJax>
          
          <p>This is Ohm&apos;s law with resistance <MathJax inline>{" \\( R = \\frac{L}{\\sigma A} \\)"}</MathJax>.</p>
          <p>If we wish to connect this back to drift velocity, a geometric argument shows that current density can also be expressed as </p>
          <MathJax>{` 
            \\[
              J = -n e v_d
            \\]
          `}</MathJax>
          <p>where <MathJax inline>{" \\( n \\)"}</MathJax> is the number of electrons per cubic meter. Combining this with the earlier expression for drift velocity gives </p>
          <MathJax>{` 
            \\[
              v_d = -\\frac{e E \\tau}{m_e} \\implies J = n e \\frac{e E \\tau}{m_e} = \\frac{n e^2 \\tau}{m_e} E
            \\]
          `}</MathJax>
          <p>So the conductivity is </p>
          <MathJax>{` 
            \\[
              \\sigma = \\frac{n e^2 \\tau}{m_e} \\]
          `}</MathJax>
          <p>This shows that materials with more conduction electrons or longer times between lattice collisions have higher conductivity.</p>
        
          
          </HiddenExposition>
          <p>
            The Drude model provides a simple picture of conduction, but it has limitations. It treats electrons as classical particles and ignores quantum
            effects like the Pauli exclusion principle. More sophisticated models are needed to explain phenomena like superconductivity and the temperature
            dependence of resistivity.
          </p>

          <h2>Macroscopic circuits</h2>
          <p>
            Circuit components are macroscopic guides for the electric field. Batteries set potential differences, resistors limit
            current, and loads like lamps turn electrical energy into light or heat. Ohm&apos;s law applied to each component can be used
            to predict how much current flows through each branch of the circuit.
          </p>

        

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A copper wire <MathJax inline>{" \\( 0.10 \\)"}</MathJax> m long and
                  <MathJax inline>{" \\( 1.0\\,\\text{mm}^2 \\)"}</MathJax> in cross-sectional area carries an electric field of
                  <MathJax inline>{" \\( 1.2\\times 10^4 \\)"}</MathJax> V/m. Estimate the drift speed if
                  <MathJax inline>{" \\( \\tau = 2.5\\times10^{-14}\\,\\text{s} \\)"}</MathJax>.
                </span>
              }
            >
              <MathJax>{`
                The drift speed follows \\( v_d = -\\frac{e E \\tau}{m_e}. \\)
                Using \\( e = 1.60\\times10^{-19}\\,\\text{C} \\) and \\( m_e = 9.11\\times10^{-31}\\,\\text{kg} \\)
                gives \\( |v_d| = 1.60\\times10^{-19} \\cdot 1.2\\times10^{4} \\cdot 2.5\\times10^{-14} / 9.11\\times10^{-31} \\approx 0.53\\,\\text{mm/s}. \\)
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion
              title={
                <span>
                  Two resistors of 30 Ω and 60 Ω are connected across a 12 V battery.
                  What is the total current if they are (a) in series and (b) in parallel?
                </span>
              }
            >
              <MathJax>{`
                (a) Series: \\( R_{eq} = 30 + 60 = 90\\,\\Omega \\) so \\( I = V/R = 12/90 \\approx 0.13\\,\\text{A}. \\)

                               
              `}</MathJax>
              <MathJax>{`

                
                               (b) Parallel: \\( 1/R_{eq} = 1/30 + 1/60 = 1/20 \\Rightarrow R_{eq} = 20\\,\\Omega \\) so \\( I = 12/20 = 0.60\\,\\text{A}. \\)
              `}</MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
