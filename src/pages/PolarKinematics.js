import React from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import PolarAccelerationSim from "../components/PolarAccelerationSim";
import RotatingShip2D from "../components/RotatingShip2D";
import BeadOnRotatingRod from "../components/mechanics/BeadOnRotatingRod";
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
          <p>Up until this point, the various acceleration terms are byproducts of choosing to work in the polar coordinate system.  There's nothing particularly physical about them, and I find them trickier to understand outside of a tangible context. </p>
          <p>For example, it's really difficult when first learning about the centripetal term because it's a <strong>centrifugal</strong> effect that you actually feel in many real-life scenarios.  The distinction merely arises from a choice of reference frame. From the outside, spectators may see a Formula 1 car making a tight left turn.  From the inside, the driver feels like they're being thrown to the right.</p>
          <p>Below is a spaceship rotating against a background of stars.  Try switching between the two frames of reference and adjust the angular speed to a comfortable rate (the default works well).  Once you've got your bearings, click the drop ball button.</p>
          
          <RotatingShip2D />
          <p>From the star frame, the object just travels in a straight line until colliding with a wall.  From the ship frame, the motion is very strange.  If your entire existence was spent inside the ship, with no view of the outside, that would be unfortunate.  However, you may develop some interesting physics to describe your world.  Assuming you are familiar with acceleration, you would notice two distinct ways in which things accelerate:
            <ul>
              <li>Toward the floor, with a magnitude dependent on the distance from the floor (centrifugal).</li>
              <li>At a right angle to the velocity, with a magnitude dependent on the speed (Coriolis).</li>
            </ul>
            If you happened to realize that you lived in a giant rotating circle, the acceleration terms would let you estimate the angular speed of the ship.  In the original context,<MathJax inline>
              {String.raw`\( \ \dot \theta \ \)`}
            </MathJax> was just the rate of change of an object's angular coordinate. Here, it has become a physical property of the reference frame itself.
          </p>
        </div>
      </MathJaxContext>
    </div>
  );
}