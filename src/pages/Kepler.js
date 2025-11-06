import React, { useState } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import HiddenQuestion from "../components/shared/HiddenQuestion";
import HiddenExposition from "../components/HiddenExposition";
import Kepler from "../components/mechanics/Kepler";
import TwoBody from "../components/mechanics/TwoBody";

export default function KeplerLaws() {
  const [showFoci, setShowFoci] = useState(true);
  const [showAreas, setShowAreas] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  const [readout, setReadout] = useState({ e: null, a: null, T: null });

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Kepler’s Laws</h1>

          <h2>Introduction</h2>
          <p>
            We model a planet of negligible mass orbiting a fixed Sun under Newtonian gravity. The orbit is a conic section determined by
            the specific orbital energy and the eccentricity vector. Use the simulation to explore circular, elliptical, and escape
            trajectories and to visualize each of Kepler’s laws.
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>First law</strong>&nbsp;&nbsp;
              <span>Bound orbits (<MathJax inline>{"\\(e<1\\)"}</MathJax>) are ellipses with the Sun at one focus.</span>
            </li>
            <li>
              <strong>Second law</strong>&nbsp;&nbsp;
              <span>The line from the Sun to the planet sweeps equal areas in equal times.</span>
            </li>
            <li>
              <strong>Third law</strong>&nbsp;&nbsp;
              <span>For bound orbits, <MathJax inline>{"\\(T^2\\propto a^3\\)"}</MathJax>.</span>
            </li>
          </ul>

          <h2>Simulation</h2>
          <p>
            Toggle overlays to connect geometry with dynamics. The “second focus” is computed from the osculating elements via the eccentricity vector.
            Equal-time wedges demonstrate Kepler’s second law. Vectors show instantaneous velocity and the central inverse-square force.
          </p>

          <Kepler
            showFoci={showFoci}
            setShowFoci={setShowFoci}
            showAreas={showAreas}
            setShowAreas={setShowAreas}   />
          <TwoBody/>

          <p style={{ marginTop: "0.5rem" }}>
            <em>Live readout:</em>{" "}
            e ≈ {readout.e?.toFixed?.(3) ?? "—"} &nbsp; | &nbsp;
            a ≈ {Number.isFinite(readout.a) ? readout.a.toFixed(1) : "—"} &nbsp; | &nbsp;
            T ≈ {readout.T ? readout.T.toFixed(2) : "—"}
          </p>

          <HiddenExposition title="Where does the second focus come from?">
            <p>
              The eccentricity vector is
              <MathJax inline>{"\\(\\; \\vec e = \\frac{\\vec v\\times\\vec h}{\\mu} - \\hat r \\;\\)"}</MathJax>,
              with <MathJax inline>{"\\(\\vec h = \\vec r \\times \\vec v\\)"}</MathJax> and <MathJax inline>{"\\(\\mu=GM_\\odot\\)"}</MathJax>.
              Its magnitude is <MathJax inline>{"\\(e=|\\vec e|\\)"}</MathJax>. From the specific energy
              <MathJax inline>{"\\(\\epsilon=\\tfrac12 v^2-\\mu/r\\)"}</MathJax>, we obtain
              <MathJax inline>{"\\(a=-\\mu/(2\\epsilon)\\)"}</MathJax>. For an ellipse, the other focus lies a distance
              <MathJax inline>{"\\(2ae\\)"}</MathJax> along <MathJax inline>{"\\(\\hat e=\\vec e/\\!e\\)"}</MathJax>.
            </p>
          </HiddenExposition>

          <HiddenExposition title="Why equal areas in equal times?">
            <p>
              The areal velocity is constant because the torque from a central force is zero, so angular momentum is conserved:
              <MathJax inline>{"\\(\\dot A = \\tfrac12 r^2\\dot\\theta = h/2\\)"}</MathJax>. The wedges in the simulation represent equal
              <MathJax inline>{"\\(\\Delta t\\)"}</MathJax> intervals; hence their areas match.
            </p>
          </HiddenExposition>

          <h2>Practice</h2>
          <div className="exposition-list">
            <HiddenQuestion title={<span>Show that the areal velocity is constant for any central force.</span>}>
              <MathJax>{`
                For a central force, \\(\\vec F = f(r)\\,\\hat r\\), so \\(\\vec\\tau = \\vec r \\times \\vec F = 0\\).
                Thus \\(\\vec h = \\vec r \\times \\vec v\\) is constant. The areal velocity is
                \\(\\dot A = \\tfrac12 r^2\\dot\\theta = h/2\\), a constant.
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>Use the simulation to measure \\(T\\) and estimate \\(a\\). Verify \\(T^2/a^3\\) is approximately constant across two different ellipses.</span>}>
              <MathJax>{`
                For each ellipse: record \\(a\\) from the live readout and wait for one periapsis-to-periapsis period \\(T\\).
                Compute \\(T^2/a^3\\). Repeat for another ellipse (different \\(a\\)). The values should agree within numerical error.
              `}</MathJax>
            </HiddenQuestion>

            <HiddenQuestion title={<span>Derive the vis-viva equation and compare with the simulation speed at periapsis and apoapsis.</span>}>
              <MathJax>{`
                From \\(\\epsilon=\\tfrac12 v^2-\\mu/r=-\\mu/(2a)\\) we get the vis-viva equation
                \\(\\displaystyle v^2 = \\mu\\Big(\\frac{2}{r}-\\frac{1}{a}\\Big).\\)
                In an ellipse, \\(r_p=a(1-e)\\) and \\(r_a=a(1+e)\\); plug into the vis-viva relation and compare to the velocity vector length.
              `}</MathJax>
            </HiddenQuestion>
          </div>
        </div>
      </MathJaxContext>
    </div>
  );
}
