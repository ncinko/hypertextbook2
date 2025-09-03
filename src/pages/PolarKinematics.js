import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import PolarAccelerationSim from "../components/PolarAccelerationSim";
import kk from '../assets/kk.png';

export default function PolarKinematics() {
  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <img src={kk} alt="kk slider"
     style={{ maxWidth: "100px", margin: "1rem auto", display: "block" }} />
          <p>
            Acceleration decomposes as
            <MathJax inline>
              {String.raw`\( \ \vec a = (\ddot r - r\dot\theta^2)\,\hat{\mathbf r} + (r\ddot\theta + 2\dot r \dot\theta)\,\hat{\boldsymbol\theta} \ \)`}
            </MathJax>
          </p>
          <p>
            Use the controls to isolate each term and watch how it depends on <MathJax inline>\(r,\ \dot r,\ \dot\theta,\ \ddot r,\ \ddot\theta\)</MathJax>
          </p>
          <PolarAccelerationSim />
        </div>
      </MathJaxContext>
    </div>
  );
}