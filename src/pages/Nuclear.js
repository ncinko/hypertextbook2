import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import HiddenExposition from "../components/shared/HiddenExposition";
import NuclearDecayExplorer from "../components/modern/NuclearDecayExplorer";
import NuclearBindingApp from "../components/modern/NuclearBindingApp";
import CP1Simulation from "../components/modern/CP1Simulation";
import RetroReactor from "../components/modern/RetroReactor";
import PWRSimulator from "../components/modern/PWRReactor";

export default function Nuclear() {
  const [selectedReactor, setSelectedReactor] = useState("cp-1");

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Nuclear Physics</h1>

          <h2>Introduction</h2>
          <p>
            Nuclear physics describes how protons and neutrons behave inside the atomic nucleus.
            Although nuclei are tiny, nuclear processes release vast amounts of energy due to the strong
            nuclear force. 
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Binding energy</strong>
              <span>
                The nucleus has less mass than the sum of its nucleons (once separated). The missing mass
                appears as binding energy:
                <MathJax inline>{" \\( E_b = \\Delta m c^2 \\)"}</MathJax>.
              </span>
            </li>
            <li>
              <strong>Radioactive decay</strong>
              <span>
                Not all nuclei are stable, and unstable nuclei spontaneously transform into
                other nuclei via radioactive decay.  Although this process is random, large samples follow predictable exponential
                behavior.
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

         



          <h2>Binding Energy</h2>
          <p>
            Explore how mass defect turns into binding energy and see where isotopes fall on the
            binding-energy-per-nucleon (BEN) curve.
          </p>
          <NuclearBindingApp />

          <HiddenExposition title="Why is iron so stable?">
            <MathJax>
              {
                "The stability of nuclei is determined by the balance between the attractive strong nuclear force and the repulsive electromagnetic force among protons.  Small nuclei are dominated by the strong force, while electromagnetic repulsion becomes significant in larger nuclei."
              }
            </MathJax>
            <br />
            <MathJax>
              {
                "Iron-56 sits at the peak of the BEN curve, meaning it has the highest binding energy per nucleon. This optimal balance of forces makes Iron-56 particularly stable against both fusion and fission processes."
              }
            </MathJax>
          </HiddenExposition>

          
          <h2>Reactor Simulations</h2>
          <div className="flex space-x-3 mb-4">
            <button 
              onClick={() => setSelectedReactor("cp-1")}
              className={`
                px-4 py-2 text-sm font-bold border-2 bg-[#c0c0c0]
                border-t-white border-l-white border-b-black border-r-black
                active:border-t-black active:border-l-black active:border-b-white active:border-r-white
                ${selectedReactor === 'cp-1' ? 'text-white bg-[#000080]' : 'text-black'}
              `}
            >
              CP-1
            </button>
            <button 
              onClick={() => setSelectedReactor("retro")}
              className={`
                px-4 py-2 text-sm font-bold border-2 bg-[#c0c0c0]
                border-t-white border-l-white border-b-black border-r-black
                active:border-t-black active:border-l-black active:border-b-white active:border-r-white
                ${selectedReactor === 'retro' ? 'text-white bg-[#000080]' : 'text-black'}
              `}
            >
              RBMK
            </button>
            <button 
              onClick={() => setSelectedReactor("pwr")}
              className={`
                px-4 py-2 text-sm font-bold border-2 bg-[#c0c0c0]
                border-t-white border-l-white border-b-black border-r-black
                active:border-t-black active:border-l-black active:border-b-white active:border-r-white
                ${selectedReactor === 'pwr' ? 'text-white bg-[#000080]' : 'text-black'}
              `}
            >
              PWR
            </button>
          </div>

          {selectedReactor === "cp-1" && <CP1Simulation />}
          {selectedReactor === "retro" && <RetroReactor />}
          {selectedReactor === "pwr" && <PWRSimulator />}

          

          <h2>Practice</h2>
          <div className="px-6 py-0 pb-24">
          <div className="exposition-list">
            <HiddenQuestion title={<span>A source has half-life 10 days. What fraction remains after 30 days?</span>}>
              <MathJax>{"After 3 half-lives, the remaining fraction is \\( (1/2)^3 = 1/8 = 12.5\\% \\)"}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>In beta-minus decay, what changes in the nucleus?</span>}>
              <MathJax>{"A neutron converts into a proton, electron, and antineutrino. Atomic number increases by 1 while mass number stays constant."}</MathJax>
               <br />
              We represent this as: <MathJax inline>{" \\( _{Z}^{A}X \\rightarrow _{Z+1}^{A}Y + e^{-} + \\bar{\\nu}_e \\)"}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>Why can gamma emission follow alpha or beta decay?</span>}>
              <MathJax>{"Alpha/beta decay may leave the child nucleus in an excited state. Gamma emission de-excites the nucleus without changing proton or neutron counts."}</MathJax>
            </HiddenQuestion>
          </div>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
