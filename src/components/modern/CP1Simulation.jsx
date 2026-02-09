import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const CP1Simulation = () => {
  const mountRef = useRef(null);
  const chartCanvasRef = useRef(null);
  
  // UI Refs for high-frequency updates (bypassing React render cycle for performance)
  const fluxRef = useRef(null);
  const stateRef = useRef(null);
  const kRef = useRef(null);
  const tempRef = useRef(null);
  const mainPanelRef = useRef(null);
  
  // React state for low-frequency UI changes
  const [isZipTriggered, setIsZipTriggered] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Simulation State Container (Mutable)
  // We use a ref object to hold physics state so it's accessible in the animation loop
  // without being trapped in a stale closure.
  const sim = useRef({
    // Physics State
    neutronFlux: 100,
    kEffective: 0.99,
    temperature: 20,
    isMeltdown: false,
    
    // Rod States
    controlRodPos: 0.40, // 0.0 to 1.0 (Initial hard stop)
    zipRodPos: 1.0,      // 1.0 (out) to 0.0 (in)
    zipTriggered: false, // Internal flag for physics loop
    
    // Constants
    INITIAL_ROD_POS: 0.40,
    MELT_TEMP: 2500,
    NEUTRON_LIFETIME: 0.05,
    BACKGROUND_SOURCE: 50,
    HEATING_RATE: 0.0001,
    COOLING_RATE: 0.005,
    
    // Chart
    fluxHistory: [],
    MAX_HISTORY: 300,
    frameCount: 0,
    CHART_UPDATE_RATE: 20,
    
    // Interaction
    isDragging: false,
    dragOffset: 0,
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster()
  });

  // Three.js Objects Container
  const threeObjects = useRef({
    scene: null,
    camera: null,
    renderer: null,
    pileGroup: null,
    controlRod: null,
    zipRod: null,
    dragPlane: null,
    chartCtx: null
  });

  useEffect(() => {
    // 1. INIT THREE.JS
    if (!mountRef.current) return;

    // Safety: Clear any existing children to prevent double-canvas in Strict Mode
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Use container dimensions instead of window to support embedding
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); 
    scene.fog = new THREE.FogExp2(0x1a1a1a, 0.02);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(10, 12, 18);
    camera.lookAt(0, 4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Handle High DPI screens for sharper text/lines
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    
    // Force styles to ensure canvas is properly positioned and sized within container
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    mountRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ADJUSTMENTS ---
    // 1. General ambient visibility (White instead of dark grey)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); 
    scene.add(ambientLight);

    // 2. Main Key Light (Warm, brighter)
    const spotLight = new THREE.SpotLight(0xffaa55, 3.0);
    spotLight.position.set(20, 30, 10);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // 3. Fill Light (Cool, helps define edges in shadows)
    const fillLight = new THREE.DirectionalLight(0xaaddff, 0.8);
    fillLight.position.set(-20, 10, -10);
    scene.add(fillLight);
    // ----------------------------

    // 2. BUILD SCENE
    const pileGroup = new THREE.Group();
    const blockGeo = new THREE.BoxGeometry(0.95, 0.45, 0.95);
    // Lighter graphite color for visibility
    const graphiteMat = new THREE.MeshLambertMaterial({ color: 0x2c2c2c }); 
    
    // Build Pile
    for (let y = 0; y < 14; y++) {
      const radius = 6 * Math.sin(Math.PI * ((y + 1) / 16));
      for (let x = -7; x <= 7; x++) {
        for (let z = -7; z <= 7; z++) {
          const dist = Math.sqrt(x*x + z*z);
          if (dist < radius + 0.2) {
            // Slots
            if (y === 7 && Math.abs(x) < 2 && z > 0) continue; 
            // Widen the Zip rod hole (deeper and slightly wider to ensure visibility)
            if (y > 4 && Math.abs(x) < 1 && Math.abs(z) < 1) continue; 
            
            const block = new THREE.Mesh(blockGeo, graphiteMat.clone());
            block.position.set(x, y * 0.5, z);
            block.castShadow = true;
            block.receiveShadow = true;
            pileGroup.add(block);
          }
        }
      }
    }
    scene.add(pileGroup);

    // Wood Structure
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b }); // Lighter wood
    const timber = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 12), woodMat);
    timber.position.y = -0.5;
    timber.receiveShadow = true;
    scene.add(timber);

    // Rods
    // Main Control Rod - Thicker for easier interaction (0.4 -> 0.6 width)
    const rodGeo = new THREE.BoxGeometry(0.6, 0.3, 14);
    const cadmiumMat = new THREE.MeshPhongMaterial({ color: 0xaaccff, shininess: 40 }); // Lighter metallic
    const controlRod = new THREE.Mesh(rodGeo, cadmiumMat);
    const initialZ = (sim.current.INITIAL_ROD_POS * 8) - 4;
    controlRod.position.set(0.5, 3.5, initialZ);
    scene.add(controlRod);

    // Zip Rod - Thicker for visibility
    const zipGeo = new THREE.CylinderGeometry(0.3, 0.3, 10);
    const zipMat = new THREE.MeshPhongMaterial({ color: 0xff3333 }); // Bright red
    const zipRod = new THREE.Mesh(zipGeo, zipMat);
    zipRod.position.set(0, 10, 0);
    scene.add(zipRod);

    const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, 10);
    const ropeMat = new THREE.MeshBasicMaterial({ color: 0xffffee }); // Bright rope
    const rope = new THREE.Mesh(ropeGeo, ropeMat);
    rope.position.y = 5;
    zipRod.add(rope);

    // Interaction Plane
    // FIXED: Use transparent material instead of visible:false to ensure raycaster hits it
    const planeGeo = new THREE.PlaneGeometry(50, 50);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0, transparent: true });
    const dragPlane = new THREE.Mesh(planeGeo, planeMat);
    dragPlane.rotation.x = -Math.PI / 2;
    dragPlane.position.y = 3.5;
    scene.add(dragPlane);

    // Chart Context
    const ctx = chartCanvasRef.current.getContext('2d');
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(0, 0, chartCanvasRef.current.width, chartCanvasRef.current.height);

    // Store refs
    threeObjects.current = {
      scene, camera, renderer, pileGroup, controlRod, zipRod, dragPlane, chartCtx: ctx
    };

    // 3. EVENTS
    const onMouseDown = (event) => {
      if (sim.current.isMeltdown) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      sim.current.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      sim.current.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      sim.current.raycaster.setFromCamera(sim.current.mouse, camera);
      const intersects = sim.current.raycaster.intersectObject(controlRod);

      if (intersects.length > 0) {
        sim.current.isDragging = true;
        sim.current.dragOffset = controlRod.position.z - intersects[0].point.z;
        document.body.style.cursor = 'grabbing';
      }
    };

    const onMouseMove = (event) => {
      if (!sim.current.isDragging) return;

      const rect = renderer.domElement.getBoundingClientRect();
      sim.current.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      sim.current.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      sim.current.raycaster.setFromCamera(sim.current.mouse, camera);
      const intersects = sim.current.raycaster.intersectObject(dragPlane);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        let rawZ = point.z + sim.current.dragOffset;
        
        // Hard constraint
        const minZ = (sim.current.INITIAL_ROD_POS * 8) - 4;
        let newZ = Math.max(minZ, Math.min(4, rawZ));
        
        controlRod.position.z = newZ;
        sim.current.controlRodPos = (newZ + 4) / 8;
      }
    };

    const onMouseUp = () => {
      sim.current.isDragging = false;
      document.body.style.cursor = ''; 
    };

    // --- REPLACEMENT: ResizeObserver for robust sizing ---
    const resizeObserver = new ResizeObserver(() => {
        if (!mountRef.current) return;
        
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
        // Prevent 0-size errors if container is hidden/collapsed
        if (width === 0 || height === 0) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
    
    // Start observing the container
    resizeObserver.observe(mountRef.current);
    // -----------------------------------------------------

    // Attach listeners
    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    // Note: window resize listener removed in favor of ResizeObserver

    // 4. ANIMATION LOOP
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      updatePhysics();
      renderer.render(scene, camera);
    };

    const updatePhysics = () => {
      const s = sim.current; 
      const objs = threeObjects.current;

      if (s.isMeltdown) return;

      // Zip Logic
      if (s.zipTriggered) {
        if (s.zipRodPos > 0) {
          s.zipRodPos -= 0.05;
          if (s.zipRodPos < 0) s.zipRodPos = 0;
        }
      }
      objs.zipRod.position.y = 4 + (s.zipRodPos * 6);

      // Reactivity
      const mainRodEffect = 0.06 * (1.0 - s.controlRodPos);
      const zipRodEffect = 0.10 * (1.0 - s.zipRodPos);
      s.kEffective = 1.025 - mainRodEffect - zipRodEffect;

      // Kinetics
      const deltaK = s.kEffective - 1.0;
      const change = ((deltaK / s.NEUTRON_LIFETIME) * s.neutronFlux) + s.BACKGROUND_SOURCE;
      s.neutronFlux += change * 0.016;

      if (s.neutronFlux < 10) s.neutronFlux = 10;
      if (s.neutronFlux > 1e9) s.neutronFlux = 1e9;

      // Thermal
      const heatGen = Math.sqrt(s.neutronFlux) * s.HEATING_RATE * 50;
      const cooling = (s.temperature - 20) * s.COOLING_RATE;
      s.temperature += (heatGen - cooling);
      if (s.temperature < 20) s.temperature = 20;

      // Meltdown Check
      if (s.temperature > s.MELT_TEMP) {
        handleMeltdown();
      }

      // UI Updates
      if (fluxRef.current) fluxRef.current.innerText = Math.floor(s.neutronFlux).toLocaleString();
      if (kRef.current) kRef.current.innerText = s.kEffective.toFixed(4);
      if (tempRef.current) {
        tempRef.current.innerText = Math.floor(s.temperature);
        tempRef.current.style.color = s.temperature > 2000 ? '#ff0000' : '#ffffff';
      }

      if (stateRef.current) {
         if (s.kEffective < 0.9995) {
             stateRef.current.innerText = "SUB-CRITICAL";
             stateRef.current.className = "font-bold text-blue-400";
         } else if (s.kEffective < 1.0005) {
             stateRef.current.innerText = "CRITICAL";
             stateRef.current.className = "font-bold text-green-400";
         } else {
             stateRef.current.innerText = "SUPER-CRITICAL";
             stateRef.current.className = "font-bold text-red-500 animate-pulse";
         }
      }
      
      if (mainPanelRef.current) {
        if (s.temperature > 2000 && !s.isMeltdown) {
            mainPanelRef.current.classList.add('animate-pulse', 'bg-red-900/50');
        } else {
            mainPanelRef.current.classList.remove('animate-pulse', 'bg-red-900/50');
        }
      }

      // Visual Heat
      if (s.temperature > 500) {
        const heatFactor = (s.temperature - 500) / 2000;
        const glow = Math.min(1, heatFactor);
        objs.pileGroup.children.forEach(child => {
          if (child.material && child.material.emissive) {
             child.material.emissive.setRGB(glow * 0.8, glow * 0.2, 0);
          }
        });
      } else {
         objs.pileGroup.children.forEach(child => {
           if (child.material && child.material.emissive) {
             child.material.emissive.setHex(0x000000);
           }
         });
      }

      // Chart Update
      s.frameCount++;
      if (s.frameCount % s.CHART_UPDATE_RATE === 0) {
        updateChart();
      }
    };

    const handleMeltdown = () => {
      const s = sim.current;
      const objs = threeObjects.current;
      s.isMeltdown = true;
      
      if (stateRef.current) {
        stateRef.current.innerText = "MELTDOWN";
        stateRef.current.className = "font-bold text-red-600 blink";
      }

      objs.pileGroup.children.forEach(child => {
          child.material.color.setHex(0xff0000);
          child.material.emissive.setHex(0xff5500);
      });

      objs.chartCtx.fillStyle = 'rgba(255,0,0,0.3)';
      objs.chartCtx.fillRect(0,0,300,150);

      setShowReset(true);
    };

    const updateChart = () => {
      const s = sim.current;
      const ctx = threeObjects.current.chartCtx;
      const w = chartCanvasRef.current.width;
      const h = chartCanvasRef.current.height;

      s.fluxHistory.push(s.neutronFlux);
      if (s.fluxHistory.length > s.MAX_HISTORY) {
        s.fluxHistory.shift();
      }

      const maxVal = Math.max(...s.fluxHistory, 200);

      ctx.fillStyle = '#f0e6d2';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#e0d6c2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < h; i += 25) {
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
      }
      ctx.stroke();

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < s.fluxHistory.length; i++) {
        const flux = s.fluxHistory[i];
        const normalized = flux / maxVal;
        const y = h - (normalized * h * 0.95);
        const x = w - (s.fluxHistory.length - i);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', onMouseDown); 
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // Clean up observer
      resizeObserver.disconnect();
      
      document.body.style.cursor = ''; 
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (object.material.isMaterial) object.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, []);

  const handleZip = () => {
    if (sim.current.isMeltdown || isZipTriggered) return;
    sim.current.zipTriggered = true;
    setIsZipTriggered(true);
    setShowReset(true);
  };

  const handleReset = () => {
    sim.current.isMeltdown = false;
    sim.current.zipTriggered = false;
    sim.current.neutronFlux = 100;
    sim.current.temperature = 20;
    sim.current.controlRodPos = sim.current.INITIAL_ROD_POS;
    sim.current.zipRodPos = 1.0;
    sim.current.fluxHistory = [];
    
    setIsZipTriggered(false);
    setShowReset(false);

    const objs = threeObjects.current;
    if (objs.controlRod) {
        const initialZ = (sim.current.INITIAL_ROD_POS * 8) - 4;
        objs.controlRod.position.z = initialZ;
    }
    if (objs.zipRod) objs.zipRod.position.y = 10;
    
    if (objs.pileGroup) {
        objs.pileGroup.children.forEach(child => {
            child.material.color.setHex(0x2c2c2c);
            if (child.material.emissive) child.material.emissive.setHex(0x000000);
        });
    }

    if (objs.chartCtx) {
        objs.chartCtx.fillStyle = '#f0e6d2';
        objs.chartCtx.fillRect(0, 0, 300, 150);
    }
  };

  return (
    // Added min-h-[500px] to ensure visibility even if h-screen collapses in certain layouts
    <div className="relative w-full h-screen min-h-[500px] bg-[#1a1a1a] overflow-hidden font-mono cursor-grab">
      {/* 3D Container */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* UI Overlay */}
      <div className="absolute top-5 left-5 pointer-events-none z-10 text-green-500" style={{ textShadow: '2px 2px 4px #000' }}>
        <div ref={mainPanelRef} className="bg-[#282828f2] border-2 border-[#555] p-4 rounded mb-2 shadow-lg pointer-events-auto transition-colors duration-200">
          <h1 className="text-xl font-bold mb-2 text-green-500" style={{ color: '#4ade80' }}>STAGG FIELD, DEC 2, 1942</h1>
          <p className="text-xs uppercase opacity-70 mb-4 text-green-500" style={{ color: '#4ade80' }}>Project: Manhattan - CP-1</p>
          
          <div className="space-y-2 text-sm">
            <div>NEUTRON FLUX: <span ref={fluxRef}>0</span></div>
            <div>STATE: <span ref={stateRef} className="font-bold text-blue-400">SUB-CRITICAL</span></div>
            <div>K-EFFECTIVE: <span ref={kRef}>0.990</span></div>
            <div>CORE TEMP: <span ref={tempRef}>20</span>°C</div>
          </div>
          
          <div className="mt-4 border-t border-gray-600 pt-4 space-y-2">
            <button 
              onClick={handleZip}
              disabled={isZipTriggered}
              className={`w-full py-2 font-bold uppercase transition-all duration-200 border-2
                ${isZipTriggered 
                  ? 'bg-[#333] border-[#555] text-[#777] cursor-not-allowed' 
                  : 'bg-[#8b0000] border-[#ff0000] text-white hover:bg-[#ff0000] hover:shadow-[0_0_15px_#ff0000] active:scale-95'
                }`}
            >
              {isZipTriggered ? "ZIP TRIGGERED" : "SCRAM (ZIP)"}
            </button>
            
            {showReset && (
              <button 
                onClick={handleReset}
                className="w-full py-2 font-bold uppercase transition-all duration-200 border-2 bg-[#224488] border-[#4488ff] text-white hover:bg-[#3366cc] hover:shadow-[0_0_15px_#3366cc]"
              >
                SYSTEM RESET
              </button>
            )}
            
            <div className="text-[10px] text-gray-400 text-center">EMERGENCY SAFETY ROD</div>
          </div>
        </div>

        <div className="bg-[#282828f2] border-2 border-[#555] p-4 rounded shadow-lg pointer-events-auto max-w-[250px] text-[10px]">
          <strong>INSTRUCTIONS:</strong><br/>
          1. <strong>Click & Drag</strong> the cadmium rod sticking out of the pile.<br/>
          2. Pull OUT to increase reactivity.<br/>
          3. Press <strong>SCRAM</strong> if it goes out of control.
        </div>
      </div>

      {/* Instrument Cluster */}
      <div className="absolute top-10 right-10 flex flex-col gap-2 items-end pointer-events-none">
        <div className="w-[300px] h-[150px] bg-[#f0e6d2] border-4 border-[#333] rounded relative overflow-hidden shadow-2xl">
          <canvas ref={chartCanvasRef} width={300} height={150} className="w-full h-full" />
          <div className="absolute top-1 left-2 text-[10px] text-black font-bold opacity-50">NEUTRON FLUX (AUTO SCALE)</div>
        </div>
      </div>
    </div>
  );
};

export default CP1Simulation;