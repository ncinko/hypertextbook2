
import { useState, useEffect, useCallback } from 'react';
import { PALETTE } from './CircuitKit';

// === Animation helpers (signed currents -> stable direction & speed) ===
function measureElementCurrent(el, nodeV, branchCurrents, dt) {
  if (branchCurrents && branchCurrents.get && branchCurrents.has(el.id)) {
    return branchCurrents.get(el.id);
  } else if (branchCurrents && typeof branchCurrents[el.id] === 'number') {
    return branchCurrents[el.id];
  }

  const v1 = (nodeV?.get ? nodeV.get(el.n1) : nodeV?.[el.n1]) ?? 0;
  const v2 = (nodeV?.get ? nodeV.get(el.n2) : nodeV?.[el.n2]) ?? 0;
  const dv = v1 - v2; // drop from n1 to n2

  switch (el.type) {
    case PALETTE.RESISTOR: {
      const R = Math.max(el.params?.R ?? 0, 1e-9);
      return dv / R;
    }
    case PALETTE.CAPACITOR: {
      const C = el.params?.C ?? 0;
      el._prevDV = el._prevDV ?? dv;
      const i = C * (dv - el._prevDV) / Math.max(dt, 1e-6);
      el._prevDV = dv;
      return i;
    }
    default:
      return 0; // wires, battery, switch unless solver supplies current
  }
}

/**
 * Update per-element animation state.
 * - Direction is sign of current (n1 -> n2 is positive).
 * - Hysteresis avoids flip-flops near 0 A.
 * - Speed grows smoothly with |I|; clamped to avoid aliasing.
 */
function updateElementAnimations(elements, nodeVMap, elemIMap, dt, animSpeed01) {
  const I_EPS = 1e-10; // Stricter threshold for stopping animation
  const I_ON = 5e-10; // Stricter threshold for starting animation
  const MAX_PX_PER_S = 400;
  const BASE_PX_PER_S = 20;
  const SMOOTH = 0.25;

  const nodeV = nodeVMap?.get ? Object.fromEntries(nodeVMap) : (nodeVMap || {});
  const branchCurrents = elemIMap?.get ? Object.fromEntries(elemIMap) : (elemIMap || {});

  return elements.map(el => {
    const I_inst = measureElementCurrent(el, nodeV, branchCurrents, dt);
    const prevAnim = el.anim || {};
    const wasActive = !!prevAnim.active;

    // Smooth displayed current for stability
    const I_disp = prevAnim.I_disp == null ? I_inst : (1 - SMOOTH) * prevAnim.I_disp + SMOOTH * I_inst;
    const mag = Math.abs(I_disp);

    const nowActive = (wasActive && mag > I_EPS) || (!wasActive && mag > I_ON);
    const dir = Math.sign(I_disp) || 1;

    // Logarithmic speed scaling to handle wide current ranges
    const LOG_SCALE = 1e6; // Makes 1µA a good reference point
    const speedFactor = Math.log1p(mag * LOG_SCALE);

    const pxPerSecRaw = BASE_PX_PER_S + speedFactor * 40 * (0.5 + animSpeed01);
    const speed = nowActive ? Math.min(pxPerSecRaw, MAX_PX_PER_S) : 0;

    // Animate any element that can carry current, including batteries
    const canCarryCurrent = el.type !== PALETTE.SWITCH || el.params.closed;
    const active = canCarryCurrent && nowActive && speed > 0;

    return {
      ...el,
      anim: { active, dir, speed, I_disp },
    };
  });
}

export function useAnimation({ isRunning, simRate, animSpeed, nodes, groundNodeId, elements, setElements, setSolution, setSimTime }) {
  useEffect(() => {
    let animFrameId;
    let lastTS = performance.now() / 1000;
    const effectiveDT = 1e-6 * simRate;
    
    const step = () => {
      const now = performance.now() / 1000;
      const realDT = Math.max(0, Math.min(0.1, now - lastTS));
      lastTS = now;
      
      if (isRunning) {
        setElements(prevElements => {
          const { nodeV, elemI, ground, newStates } = buildAndSolveTransient(nodes, prevElements, groundNodeId, effectiveDT);
          setSolution({ nodeV, elemI, ground });
          setSimTime(t => t + effectiveDT);
          
          const nextElements = prevElements.map(el => {
            if (newStates[el.id]) {
              return { ...el, params: { ...el.params, ...newStates[el.id] } };
            }
            return el;
          });
          
          const animSpeed01 = Math.max(0, Math.min(1, (animSpeed) / 5000));
          const withAnim = updateElementAnimations(nextElements, nodeV, elemI, effectiveDT, animSpeed01);
          return withAnim;
        });
      }
      
      animFrameId = requestAnimationFrame(step);
    };
    
    animFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameId);
  }, [isRunning, nodes, groundNodeId, simRate, animSpeed, setElements, setSolution, setSimTime]);
}
