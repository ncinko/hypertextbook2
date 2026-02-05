import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import HiddenExposition from "../components/shared/HiddenExposition";
import NuclearDecayExplorer from "../components/modern/NuclearDecayExplorer";
import NuclearBindingApp from "../components/modern/NuclearBindingApp";

export default function Nuclear() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Nuclear Physics</h1>

          <h2>Introduction</h2>
          <p>
            Nuclear physics describes how protons and neutrons behave inside the atomic nucleus.
            Although nuclei are tiny, nuclear processes release large energies because of
            mass-energy conversion and strong-force binding.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Mass defect and binding energy</strong>
              <span>
                The nucleus has less mass than the sum of isolated nucleons. The missing mass
                appears as binding energy:
                <MathJax inline>{" \\( E_b = \\Delta m c^2 \\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Radioactive decay is probabilistic</strong>
              <span>
                Individual decays are random, but large samples follow predictable exponential
                behavior with half-life <MathJax inline>{"\\(t_{1/2}\\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Decay channels carry different signatures</strong>
              <span>
                <MathJax inline>{"\\(\\alpha\\)"}</MathJax> decay emits helium nuclei,
                <MathJax inline>{" \\(\\beta\\)"}</MathJax> decay changes neutron/proton count,
                and <MathJax inline>{" \\(\\gamma\\)"}</MathJax> decay releases photons from
                excited nuclei.
              </span>
            </li>
            <li>
              <strong>Applications</strong>
              <span>
                Nuclear science underpins medical imaging/therapy, carbon dating,
                reactor power, and stellar nucleosynthesis.
              </span>
            </li>
          </ul>

          <h2>Decay Modes: Interactive Explorer</h2>
          <p>
            Use the simulation below to compare alpha, beta, and gamma contributions while the
            nucleus population decays over time.
          </p>
          <NuclearDecayExplorer />



          <h2>Binding Energy: Interactive Visualizer</h2>
          <p>
            Explore how mass defect turns into binding energy and see where isotopes fall on the
            binding-energy-per-nucleon curve.
          </p>
          <NuclearBindingApp />

          <HiddenExposition title="Why do we see exponential decay?">
            <p>
              If each nucleus has constant decay probability per unit time
              <MathJax inline>{" \\(\\lambda\\)"}</MathJax>, then the population obeys
              <MathJax inline>{" \\(dN/dt = -\\lambda N\\)"}</MathJax>. Solving gives
              <MathJax inline>{" \\(N(t)=N_0e^{-\\lambda t}\\)"}</MathJax>. The half-life relation is
              <MathJax inline>{" \\(t_{1/2}=\\ln 2/\\lambda\\)"}</MathJax>.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion title={<span>A source has half-life 10 days. What fraction remains after 30 days?</span>}>
              <MathJax>{"After 3 half-lives, remaining fraction is \\( (1/2)^3 = 1/8 = 12.5\\% \\."}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>In beta-minus decay, what changes in the nucleus?</span>}>
              <MathJax>{"A neutron converts into a proton, electron, and antineutrino. Atomic number increases by 1 while mass number stays constant."}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>Why can gamma emission follow alpha or beta decay?</span>}>
              <MathJax>{"Alpha/beta decay can leave the daughter nucleus in an excited state. Gamma emission de-excites the nucleus without changing proton or neutron counts."}</MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
