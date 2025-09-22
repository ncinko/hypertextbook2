// ===== File: src/pages/Vectors.js
import React, { useRef, useState, useEffect } from "react";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import VectorAddition from "../components/math/VectorAddition";
import VectorComponentsDemo from "../components/math/VectorComponentsDemo";
import HiddenExposition from "../components/shared/HiddenExposition";
import HiddenQuestion from "../components/shared/HiddenQuestion";



// ===== Page =====
export default function Vectors() {
  const [showAns1, setShowAns1] = useState(false);
  const [showAns2, setShowAns2] = useState(false);
  const [showAns3, setShowAns3] = useState(false);
  const [showAns4, setShowAns4] = useState(false);

  return (
    <div className="mathjax-container">
      <MathJaxContext>
        <div className="container mx-auto p-4 left-aligned-container">
          <h1>Vectors</h1>

          <h2>Introduction</h2>
          <p>
            A <strong>vector</strong> is a mathematical object with <em>magnitude</em> and <em>direction</em>. Displacement, velocity, acceleration, and force are represented using vectors.
            In electromagnetism, the electric and magnetic fields are represented with a vector at every point in space. 
          </p>

          <h2>Key Ideas</h2>
          <ul className="card-list">
            <li>
              <strong>Components</strong>
              <span>A vector can be represented by its components along perpendicular axes: <MathJax inline>{"\\( \\vec{A} = \\langle A_x, A_y \\rangle \\)"}</MathJax> (and <MathJax inline>{"\\( A_z \\)"}</MathJax> in 3D).</span>
            </li>
            <li>
              <strong>Magnitude</strong>
              <span>The length of a vector, found by applying the Pythagorean theorem to perpendicular components. <MathJax inline>{"\\( |\\vec{A}| = \\sqrt{A_x^2 + A_y^2} \\)"}</MathJax></span>
            </li>
            <li>
              <strong>Vector addition</strong>
              <span>Vectors add <em>tip-to-tail</em> or by summing their corresponding components.</span>
            </li>
        
          </ul>

          <h2>Graphical Representation</h2>
          <p>Vectors are often represented using arrows.  The length of the arrow corresponds to the vector's magnitude, and the arrow points in a particular direction.
            For example, a velocity vector might point to the right to indicate motion in that direction, with a longer arrow indicating a higher speed.</p>
        <p> <b>Axes:</b>  Once you start drawing arrows, it's helpful to imagine a set of perpendicular axes.  In a purely mathematical context, these could be the usual Cartesian axes.  
        In physics, they implicitly carry units corresponding to the type of vector (meters per second for velocity vectors, Newtons for force vectors, etc.).</p>
          <VectorComponentsDemo />

          <h2>Vector Addition</h2>
          <p>In graphical notation, the arrowhead is commonly referred to as the <em>tip</em> of the vector.  Vectors add <em>tip-to-tail</em> or by summing their respective components.  
          For example, <MathJax inline>{"\\( \\langle 2,3 \\rangle + \\langle 4,-1 \\rangle = \\langle 6,2 \\rangle \\)"}</MathJax>.  Why are these two methods equivalent?</p>
          <p>Click and drop the vectors onto the canvas to sum them tip-to-tail. Alt-click to negate vectors.</p>
          <VectorAddition />

<h2>Practice</h2>
<div className="exposition-list">

  {/* Problem 1 */}
  <HiddenQuestion
    title={
      <span>
        <MathJax inline>{`\\( \\vec{v}_1=\\langle 3,0\\rangle,\\ \\vec{v}_2=\\langle 2,2\\rangle,\\ \\vec{v}_3=\\langle 0,-3\\rangle. \\)`}</MathJax>
        {" "}Compute{" "}
        <MathJax inline>{`\\( \\vec{R}=\\vec{v}_1+2\\vec{v}_2-\\vec{v}_3 \\)`}</MathJax>.  Check your answer in the canvas above.
      </span>
    }
  >
    <MathJax>{`\\( \\vec{R}=\\langle 3,0\\rangle+2\\langle 2,2\\rangle-\\langle 0,-3\\rangle=\\langle 3,0\\rangle+\\langle 4,4\\rangle+\\langle 0,3\\rangle = \\langle 7,7 \\rangle \\)`}</MathJax>
  </HiddenQuestion>

  {/* Problem 2 */}
  <HiddenQuestion
    title={
      <span>
        A vector has magnitude 10 and points 30 degrees above the +x-axis. Find its x and y components.
      </span>
    }
  >
    <MathJax>{`\\( \\langle v_x,v_y \\rangle = \\langle 10\\cos 30^\\circ,\\ 10\\sin 30^\\circ \\rangle = \\langle 5\\sqrt{3},\\ 5 \\rangle \\approx \\langle 8.66,\\ 5.00 \\rangle \\)`}</MathJax>
  </HiddenQuestion>

    {/* Problem 3 */}
    <HiddenQuestion
        title={
            <span>
                You run 3 km north, then 4 km east, then 2 km south. Represent your net displacement as a vector.
            </span>
        }
        >
        Let east correspond to +x-direction and north to +y-direction.  <MathJax>{`\\( \\Delta \\vec{x} = \\langle 0,3 \\rangle \\text{ km}+ \\langle 4,0 \\rangle \\text{ km} + \\langle 0,-2 \\rangle \\text{ km}= \\langle 4,1 \\rangle \\text{ km}\\)`}</MathJax>
    </HiddenQuestion>   
        


</div>

          


        </div>
      </MathJaxContext>
      <style>{`
        .demo-card { margin: 12px 0 22px; }
        .readout { margin-top: 8px; font-size: 0.95rem; color: #111; }
        .hint { color: #6b7280; font-size: 0.9rem; }
        .mathjax-list { padding-left: 18px; }
      `}</style>
    </div>
  );
}
