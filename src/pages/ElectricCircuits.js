// ===== File: src/pages/ElectricCircuits.js
import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import ConductionDriftSimulation from "../components/electricity/ConductionDriftSimulation";
import SeriesCircuitExplorer from "../components/electricity/SeriesCircuitExplorer";

export default function ElectricCircuits() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Electric Circuits</h1>

          <h2>Introduction</h2>
          <p>
            Microscopic charge motion and macroscopic circuit behavior are two views of the same physics. Inside a metal, a sea
            of electrons collides with the lattice while being nudged by an electric field. In circuits, components arrange those
            fields to control current and energy transfer. Bridging the two pictures is the essence of Ohm&apos;s law.
          </p>
          <p>
            A conductor&apos;s drift speed is tiny compared with the thermal jitter of electrons, yet the collective motion carries
            measurable current. By shaping how components share voltage and current, we can design useful devices from that
            seemingly chaotic motion.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Ohm&apos;s law</strong>&nbsp;&nbsp;&nbsp;
              <span>
                The macroscopic relation <MathJax inline>{" \\( V = IR \\)"}</MathJax> emerges from the microscopic drift velocity
                <MathJax inline>{" \\( v_d = -\\frac{e E \\tau}{m_e} \\)"}</MathJax>. Longer mean free times or stronger fields boost
                drift and reduce resistivity.
              </span>
            </li>
            <li>
              <strong>Energy flow</strong>&nbsp;&nbsp;&nbsp;
              <span>
                Power delivered to a component is <MathJax inline>{" \\( P = IV \\)"}</MathJax>. In series circuits the same current
                flows through each element, while parallel circuits share the same voltage drop.
              </span>
            </li>
            <li>
              <strong>Circuit topology</strong>&nbsp;&nbsp;&nbsp;
              <span>
                Rearranging components changes how currents divide and voltages add. Equivalent resistance depends on whether paths
                are in series (<MathJax inline>{" \\( R_{\\text{eq}} = R_1 + R_2 + \\ldots \\)"}</MathJax>) or parallel
                (<MathJax inline>{" \\( 1/R_{\\text{eq}} = 1/R_1 + 1/R_2 + \\ldots \\)"}</MathJax>).
              </span>
            </li>
          </ul>

          <h2>Microscopic picture of conduction</h2>
          <p>
            Metals host a dense gas of conduction electrons that ricochet off the ionic lattice. Each collision resets an
            electron&apos;s random thermal velocity, but a persistent electric field biases the motion to produce a slight drift.
            The interactive below shows that drift emerging from repeated collisions and computes the resulting resistivity.
          </p>

          <ConductionDriftSimulation />

          <p>
            The slider labelled &quot;mean time between collisions&quot; controls the average time <MathJax inline>{" \\( \\tau \\)"}</MathJax>
            between momentum-randomizing events. Cleaner metals (large <MathJax inline>{" \\( \\tau \\)"}</MathJax>) keep electrons
            drifting longer before scattering, which increases the drift speed and reduces resistivity via
            <MathJax inline>{" \\( \\rho = \\frac{m_e}{n e^2 \\tau} \\)"}</MathJax>.
          </p>

          <h2>Macroscopic circuits</h2>
          <p>
            Circuit components are macroscopic guides for electric fields. Batteries set potential differences, resistors limit
            current, and loads like lamps turn electrical energy into light or heat. Ohm&apos;s law applied to each branch predicts how
            currents split or voltages divide.
          </p>

          <SeriesCircuitExplorer />

          <p>
            Switch between series and parallel to see how equivalent resistance changes. In series, a single current flows and the
            voltage drop divides proportionally to resistance. In parallel, each branch feels the full battery voltage, so the
            total current is the sum of branch currents.
          </p>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion
              title={
                <span>
                  A copper wire <MathJax inline>{" \\( 0.10 \\)"}</MathJax> m long and
                  <MathJax inline>{" \\( 1.0\\,\\text{mm}^2 \\)"}</MathJax> in cross-section carries an electric field of
                  <MathJax inline>{" \\( 1.2\\times 10^4 \\)"}</MathJax> V/m. Estimate the drift speed if
                  <MathJax inline>{" \\( \\tau = 2.5\\times10^{-14}\\,\\text{s} \\)"}</MathJax>.
                </span>
              }
            >
              <MathJax>{`
                The drift speed follows \\
                \\( v_d = -\\frac{e E \\tau}{m_e}. \\)
                Using \\( e = 1.60\\times10^{-19}\\,\\text{C} \\) and \\( m_e = 9.11\\times10^{-31}\\,\\text{kg} \\)
                gives \\( |v_d| = 1.60\\times10^{-19} \times 1.2\\times10^{4} \times 2.5\\times10^{-14} / 9.11\\times10^{-31} \\approx 0.53\\,\\text{mm/s}. \\)
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
                \\n                (b) Parallel: \\( 1/R_{eq} = 1/30 + 1/60 = 1/20 \\Rightarrow R_{eq} = 20\\,\\Omega \\) so \\( I = 12/20 = 0.60\\,\\text{A}. \\)
              `}</MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
