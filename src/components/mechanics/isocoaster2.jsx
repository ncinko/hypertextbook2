import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./coaster.css";

// --- Configuration ---
const SEGMENT_DEFS = {
  START: { label: "Station", icon: "flag", color: 0x334155 },
  STRAIGHT: {
    label: "Straight",
    len: 30,
    icon: "minus",
    variants: [
      { id: "NORMAL", label: "Standard", color: 0x3b82f6 }, // Blue track
      { id: "BOOST", label: "Booster", color: 0x10b981, force: 12 }, // Emerald
      { id: "BRAKE", label: "Brakes", color: 0xef4444, drag: 0.15 }, // Red
    ],
  },
  UP: {
    label: "Hill Up",
    len: 40,
    height: 20,
    icon: "arrow-up",
    variants: [
      { id: "NORMAL", label: "Standard", color: 0x3b82f6 },
      { id: "CHAIN", label: "Chain Lift", color: 0xb45309, chainSpeed: 6 }, // Amber
    ],
  },
  DOWN: { label: "Drop", len: 40, height: -20, icon: "arrow-down", color: 0x3b82f6 },
  LEFT: { label: "Left Turn", len: 40, radius: 25, icon: "corner-up-left", color: 0x3b82f6 },
  RIGHT: { label: "Right Turn", len: 40, radius: 25, icon: "corner-up-right", color: 0x3b82f6 },
  LOOP: { label: "Loop", len: 10, radius: 20, icon: "rotate-ccw", color: 0x3b82f6 },
};

const GRAVITY = 9.81;
const FRICTION_COEFF = 0.005;
const INITIAL_SPEED = 20;

// --- Icons Component ---
const Icon = ({ name, size = 18 }) => {
  const icons = {
    flag: (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" x2="4" y1="22" y2="15" />
      </>
    ),
    "arrow-up": (
      <>
        <line x1="12" x2="12" y1="19" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </>
    ),
    "arrow-down": (
      <>
        <line x1="12" x2="12" y1="5" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </>
    ),
    "corner-up-left": (
      <>
        <polyline points="9 14 4 9 9 4" />
        <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
      </>
    ),
    "corner-up-right": (
      <>
        <polyline points="15 14 20 9 15 4" />
        <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
      </>
    ),
    minus: <line x1="5" x2="19" y1="12" y2="12" />,
    "refresh-cw": (
      <>
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
      </>
    ),
    play: <polygon points="5 3 19 12 5 21 5 3" />,
    square: <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />,
    video: (
      <>
        <path d="m22 8-6 4 6 4V8Z" />
        <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </>
    ),
    "rotate-ccw": (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    anchor: (
      <>
        <circle cx="12" cy="5" r="3" />
        <line x1="12" x2="12" y1="22" y2="8" />
        <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      </>
    ),
    "chevrons-up": (
      <>
        <polyline points="17 11 12 6 7 11" />
        <polyline points="17 18 12 13 7 18" />
      </>
    ),
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || icons.square}
    </svg>
  );
};

export default function CoasterBuilder3D() {
  const [segments, setSegments] = useState([{ type: "START", variant: "NORMAL" }]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [cameraMode, setCameraMode] = useState("ORBIT");
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [stats, setStats] = useState({
    velocity: 0,
    gVertical: 0,
    gLateral: 0,
    gTotal: 0,
    pe: 0,
    ke: 0,
  });

  // DOM/Three refs
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  const curveRef = useRef(null);
  const cartRef = useRef(null);

  const birdsRef = useRef([]);
  const deerRef = useRef([]);

  const controlsRef = useRef({
    rotation: 0.5,
    pitch: 0.5,
    zoom: 120,
    target: new THREE.Vector3(0, 0, 0),
  });

  const keysRef = useRef({ w: false, a: false, s: false, d: false });

  const physicsRef = useRef({
    t: 0,
    velocity: 0,
    lastVel: new THREE.Vector3(),
    lastBinormal: new THREE.Vector3(1, 0, 0),
  });

  const segmentsMapRef = useRef([]);
  const maxEnergyRef = useRef(5000);

  // Avoid stale closures in render loop
  const cameraModeRef = useRef(cameraMode);
  const isSimulatingRef = useRef(isSimulating);
  useEffect(() => void (cameraModeRef.current = cameraMode), [cameraMode]);
  useEffect(() => void (isSimulatingRef.current = isSimulating), [isSimulating]);

  const resetSim = () => {
    setIsSimulating(false);

    if (curveRef.current) {
      const t = 0;
      const tangent = curveRef.current.getTangentAt(t).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      physicsRef.current = {
        t: 0,
        velocity: INITIAL_SPEED,
        lastVel: new THREE.Vector3(),
        lastBinormal: binormal,
      };

      if (cartRef.current) {
        cartRef.current.position.copy(curveRef.current.getPointAt(0));
        const up = new THREE.Vector3().crossVectors(binormal, tangent).normalize();
        cartRef.current.up.copy(up);
        cartRef.current.lookAt(curveRef.current.getPointAt(0).add(tangent));
      }
    }
  };

  const addSegment = (type, variant = "NORMAL") => {
    setSegments((prev) => [...prev, { type, variant }]);
  };

  const undo = () => {
    if (segments.length > 1) setSegments((prev) => prev.slice(0, -1));
  };

  // --- 3D Setup (runs once) ---
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f5ff);
    scene.fog = new THREE.Fog(0xf0f5ff, 50, 600);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 2000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(100, 200, 100);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    scene.add(dir);

    // Grid/Ground
    scene.add(new THREE.GridHelper(2000, 100, 0x708090, 0xa0b0c0));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({ color: 0x9dcc9a }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Helpers for Trees and Deer
    const createTree = () => {
      const group = new THREE.Group();

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x5a3e2b, roughness: 0.9 })
      );
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(4, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 })
      );
      foliage.position.y = 6;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      group.add(foliage);

      return group;
    };

    const createDeer = (hasAntlers, isStrafing) => {
      const group = new THREE.Group(); // Parent Group
      const internalGroup = new THREE.Group(); // Orientation Group
      group.add(internalGroup);

      if (isStrafing) internalGroup.rotation.y = Math.PI / 2; // Face sideways

      const deerMat = new THREE.MeshStandardMaterial({ color: 0x8c5e35, roughness: 0.8 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });

      const bodyGroup = new THREE.Group();
      internalGroup.add(bodyGroup);

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 3), deerMat);
      body.position.y = 2.2;
      body.castShadow = true;
      bodyGroup.add(body);

      const neckPivot = new THREE.Group();
      neckPivot.position.set(0, 2.8, 1.3);
      neckPivot.rotation.x = -0.5;
      bodyGroup.add(neckPivot);

      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), deerMat);
      neck.position.y = 1;
      neck.castShadow = true;
      neckPivot.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.2), deerMat);
      head.position.set(0, 2.2, 0.4);
      head.castShadow = true;
      neckPivot.add(head);

      if (hasAntlers) {
        const antlerGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
        const leftAntler = new THREE.Mesh(antlerGeo, darkMat);
        leftAntler.castShadow = true;
        leftAntler.position.set(0.3, 0.8, 0);
        leftAntler.rotation.set(0.2, 0, -0.5);
        head.add(leftAntler);

        const rightAntler = new THREE.Mesh(antlerGeo, darkMat);
        rightAntler.castShadow = true;
        rightAntler.position.set(-0.3, 0.8, 0);
        rightAntler.rotation.set(0.2, 0, 0.5);
        head.add(rightAntler);
      }

      const legGeo = new THREE.BoxGeometry(0.5, 2.5, 0.5);
      const legPositions = [
        [-0.4, 1.25, -1.2],
        [0.4, 1.25, -1.2],
        [-0.4, 1.25, 1.2],
        [0.4, 1.25, 1.2],
      ];
      const legs = [];
      legPositions.forEach((pos) => {
        const leg = new THREE.Mesh(legGeo, deerMat);
        leg.position.set(pos[0], 1.25, pos[2]);
        leg.castShadow = true;
        legs.push(leg);
        internalGroup.add(leg);
      });

      return { group, neckPivot, legs, internalGroup };
    };

    // Trees
    for (let i = 0; i < 80; i++) {
      const tree = createTree();
      const x = (Math.random() - 0.5) * 1600;
      const z = (Math.random() - 0.5) * 1600;
      if (Math.abs(x) < 50 && Math.abs(z) < 50) continue;
      tree.position.set(x, 0, z);
      const scale = 0.8 + Math.random() * 0.6;
      tree.scale.set(scale, scale, scale);
      tree.rotation.y = Math.random() * Math.PI * 2;
      scene.add(tree);
    }

    // Deer
    const deerList = [];
    for (let i = 0; i < 15; i++) {
      const hasAntlers = Math.random() > 0.6;
      const isStrafing = Math.random() > 0.5;
      const deerObj = createDeer(hasAntlers, isStrafing);

      const x = (Math.random() - 0.5) * 1400;
      const z = (Math.random() - 0.5) * 1400;
      if (Math.abs(x) < 60 && Math.abs(z) < 60) continue;

      deerObj.group.position.set(x, 0, z);
      deerObj.group.rotation.y = Math.random() * Math.PI * 2;
      scene.add(deerObj.group);

      deerList.push({
        ...deerObj,
        state: 0,
        timer: Math.random() * 5,
        target: new THREE.Vector3(x, 0, z),
        isStrafing,
        flipProgress: 0,
      });
    }
    deerRef.current = deerList;

    // Birds
    const birdCount = 15;
    const birdData = [];
    const birdGeo = new THREE.PlaneGeometry(1.2, 0.4);
    birdGeo.rotateX(-Math.PI / 2);
    const lWingGeo = birdGeo.clone();
    lWingGeo.translate(-0.6, 0, 0);
    const rWingGeo = birdGeo.clone();
    rWingGeo.translate(0.6, 0, 0);
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });

    for (let i = 0; i < birdCount; i++) {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(lWingGeo, birdMat));
      group.add(new THREE.Mesh(rWingGeo, birdMat));

      group.position.set((Math.random() - 0.5) * 800, 30 + Math.random() * 40, (Math.random() - 0.5) * 800);
      scene.add(group);

      const velocity = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5)
        .normalize()
        .multiplyScalar(0.2 + Math.random() * 0.1);

      birdData.push({
        group,
        lWing: group.children[0],
        rWing: group.children[1],
        velocity,
        phase: Math.random() * Math.PI * 2,
      });
    }
    birdsRef.current = birdData;

    // Cart
    const cartGroup = new THREE.Group();
    const cartBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 3.5),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.6 })
    );
    cartBody.position.y = 1.2;
    cartBody.castShadow = true;
    cartGroup.add(cartBody);

    [-1, 1].forEach((z) => {
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 3, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      axle.rotation.z = Math.PI / 2;
      axle.position.set(0, 0.5, z * 1.2);
      cartGroup.add(axle);
    });

    scene.add(cartGroup);
    cartRef.current = cartGroup;

    // --- ResizeObserver: fit renderer to your component container ---
    const resizeToContainer = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resizeToContainer);
    ro.observe(container);
    resizeToContainer();

    // Event Listeners
    let dragType = null;
    let lastMouse = { x: 0, y: 0 };

    const onDown = (e) => {
      // Raycasting for Deer Click
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const deerGroups = deerRef.current.map((d) => d.group);
      const intersects = raycaster.intersectObjects(deerGroups, true);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const deer = deerRef.current.find((d) => {
          let p = hitObj;
          while (p) {
            if (p === d.group) return true;
            p = p.parent;
          }
          return false;
        });

        if (deer) {
          deer.state = 3; // FLIP
          deer.flipProgress = 0;
          return; // consume click
        }
      }

      if (e.button === 2) dragType = "PAN";
      else if (e.button === 0) dragType = "ROTATE";
      lastMouse = { x: e.clientX, y: e.clientY };
    };

    const onUp = () => (dragType = null);

    const onMove = (e) => {
      const mode = cameraModeRef.current;
      if (!dragType || mode === "RIDE") return;

      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };

      if (dragType === "ROTATE") {
        controlsRef.current.rotation -= dx * 0.005;
        controlsRef.current.pitch = Math.max(0.1, Math.min(1.5, controlsRef.current.pitch + dy * 0.005));
      } else if (dragType === "PAN") {
        const sensitivity = controlsRef.current.zoom * 0.0015;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
        const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraRef.current.quaternion);

        controlsRef.current.target.addScaledVector(right, -dx * sensitivity);
        controlsRef.current.target.addScaledVector(upVec, dy * sensitivity);
        controlsRef.current.target.y = Math.max(0, controlsRef.current.target.y);
      }
    };

    const onWheel = (e) => {
    // if you want zoom to work only in ORBIT:
    if (cameraModeRef.current === "RIDE") return;

    e.preventDefault(); // <- stops page scroll
    controlsRef.current.zoom = Math.max(10, Math.min(400, controlsRef.current.zoom + e.deltaY * 0.1));
    };

    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (keysRef.current[k] !== undefined) keysRef.current[k] = true;
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (keysRef.current[k] !== undefined) keysRef.current[k] = false;
    };

    const onContext = (e) => e.preventDefault();

    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);

    // IMPORTANT: passive must be false or preventDefault won't work
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Main render loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = Date.now();
      const dt = 0.016;

      // Birds
      birdsRef.current.forEach((bird) => {
        bird.group.position.add(bird.velocity);
        if (Math.abs(bird.group.position.x) > 500) bird.group.position.x *= -1;
        if (Math.abs(bird.group.position.z) > 500) bird.group.position.z *= -1;
        bird.group.lookAt(bird.group.position.clone().add(bird.velocity));
        if (Math.random() < 0.02) bird.velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.5);
        const flap = Math.sin(now * 0.01 + bird.phase) * 0.4;
        bird.lWing.rotation.z = flap;
        bird.rWing.rotation.z = -flap;
      });

      // Deer
      deerRef.current.forEach((deer) => {
        if (deer.state === 3) {
          deer.flipProgress += dt * 2.0;
          if (deer.flipProgress >= 1) {
            deer.state = 0;
            deer.internalGroup.rotation.x = 0;
            deer.internalGroup.position.y = 0;
          } else {
            deer.internalGroup.rotation.x = -deer.flipProgress * Math.PI * 2;
            deer.internalGroup.position.y = 15 * Math.sin(deer.flipProgress * Math.PI);
            deer.group.translateZ(0.2);
          }
          deer.legs.forEach((l) => {
            l.rotation.x = 0;
            l.rotation.z = 0;
          });
          return;
        }

        deer.timer -= dt;

        if (deer.timer <= 0) {
          const roll = Math.random();
          if (roll < 0.3) {
            deer.state = 0;
            deer.timer = 2 + Math.random() * 3;
          } else if (roll < 0.6) {
            deer.state = 2;
            deer.timer = 3 + Math.random() * 4;
          } else {
            deer.state = 1;
            deer.timer = 4 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 30;
            deer.target.x = deer.group.position.x + Math.cos(angle) * dist;
            deer.target.z = deer.group.position.z + Math.sin(angle) * dist;
          }
        }

        if (deer.state === 1) {
          deer.neckPivot.rotation.x = THREE.MathUtils.lerp(deer.neckPivot.rotation.x, -0.5, 0.1);

          const dirVec = new THREE.Vector3().subVectors(deer.target, deer.group.position);
          if (dirVec.length() > 0.5) {
            dirVec.normalize();
            const targetRot = Math.atan2(dirVec.x, dirVec.z);
            let rotDiff = targetRot - deer.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            deer.group.rotation.y += rotDiff * 0.05;

            deer.group.translateZ(0.08);

            const legPhase = now * 0.008;
            if (deer.isStrafing) {
              deer.legs[0].rotation.z = Math.sin(legPhase) * 0.4;
              deer.legs[1].rotation.z = Math.sin(legPhase + Math.PI) * 0.4;
              deer.legs[2].rotation.z = Math.sin(legPhase + Math.PI) * 0.4;
              deer.legs[3].rotation.z = Math.sin(legPhase) * 0.4;
              deer.legs.forEach((l) => (l.rotation.x = 0));
            } else {
              deer.legs[0].rotation.x = Math.sin(legPhase) * 0.4;
              deer.legs[1].rotation.x = Math.sin(legPhase + Math.PI) * 0.4;
              deer.legs[2].rotation.x = Math.sin(legPhase + Math.PI) * 0.4;
              deer.legs[3].rotation.x = Math.sin(legPhase) * 0.4;
              deer.legs.forEach((l) => (l.rotation.z = 0));
            }
          } else {
            deer.state = 0;
          }
        } else if (deer.state === 2) {
          deer.neckPivot.rotation.x = THREE.MathUtils.lerp(deer.neckPivot.rotation.x, 2.5, 0.05);
          deer.legs.forEach((l) => {
            l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, 0.1);
            l.rotation.z = THREE.MathUtils.lerp(l.rotation.z, 0, 0.1);
          });
        } else {
          deer.neckPivot.rotation.x = THREE.MathUtils.lerp(deer.neckPivot.rotation.x, -0.5, 0.1);
          deer.legs.forEach((l) => {
            l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, 0, 0.1);
            l.rotation.z = THREE.MathUtils.lerp(l.rotation.z, 0, 0.1);
          });
        }
      });

      // Camera controls
      const mode = cameraModeRef.current;
      if (mode === "ORBIT") {
        const { w, a, s, d } = keysRef.current;
        if (w || a || s || d) {
          const speed = controlsRef.current.zoom * 0.02;
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraRef.current.quaternion);
          forward.y = 0;
          forward.normalize();

          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
          right.y = 0;
          right.normalize();

          const move = new THREE.Vector3();
          if (w) move.add(forward);
          if (s) move.sub(forward);
          if (d) move.add(right);
          if (a) move.sub(right);

          controlsRef.current.target.add(move.multiplyScalar(speed));
        }

        if (cartRef.current) cartRef.current.visible = true;

        const { rotation, pitch, zoom, target } = controlsRef.current;
        const x = Math.sin(rotation) * zoom * Math.cos(pitch);
        const z = Math.cos(rotation) * zoom * Math.cos(pitch);
        const y = zoom * Math.sin(pitch);
        camera.position.set(target.x + x, target.y + y, target.z + z);
        camera.lookAt(target);
      } else if (mode === "RIDE" && curveRef.current) {
        if (cartRef.current) cartRef.current.visible = false;

        const t = physicsRef.current.t;
        const point = curveRef.current.getPointAt(t);
        const tangent = curveRef.current.getTangentAt(t).normalize();
        const frameBinormal = physicsRef.current.lastBinormal.clone();
        const normal = new THREE.Vector3().crossVectors(frameBinormal, tangent).normalize();

        const eyeOffset = normal.clone().multiplyScalar(1.2).add(tangent.clone().multiplyScalar(0.5));
        const eyePos = point.clone().add(eyeOffset);

        camera.position.copy(eyePos);
        camera.up.copy(normal);
        camera.lookAt(eyePos.clone().add(tangent));
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();

      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);

      // Remove canvas
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);

      // Dispose renderer (basic)
      renderer.dispose();
    };
  }, []);

  // --- Track Generation ---
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    ["TRACK", "SUPPORTS"].forEach((name) => {
      const obj = scene.getObjectByName(name);
      if (obj) scene.remove(obj);
    });

    const points = [];
    const colors = [];
    const segmentInfoList = [];

    let pos = new THREE.Vector3(0, 5, 0);
    let dir = new THREE.Vector3(0, 0, 1);
    const up = new THREE.Vector3(0, 1, 0);

    points.push(pos.clone());
    colors.push(0.3, 0.3, 0.3);

    segments.forEach((seg) => {
      const def = SEGMENT_DEFS[seg.type];
      let segColor = def.color || 0xff3333;
      if (def.variants) {
        const v = def.variants.find((vv) => vv.id === seg.variant);
        if (v && v.color) segColor = v.color;
      }
      const colorObj = new THREE.Color(segColor);
      const startIdx = points.length;

      if (seg.type === "START") {
        pos.add(dir.clone().multiplyScalar(15));
        points.push(pos.clone());
      } else if (seg.type === "STRAIGHT") {
        pos.add(dir.clone().multiplyScalar(def.len));
        points.push(pos.clone());
      } else if (seg.type === "UP" || seg.type === "DOWN") {
        const p1 = pos.clone().add(dir.clone().multiplyScalar(def.len * 0.33));
        p1.y += def.height * 0.1;
        const p2 = pos.clone().add(dir.clone().multiplyScalar(def.len * 0.66));
        p2.y += def.height * 0.9;
        pos.add(dir.clone().multiplyScalar(def.len));
        pos.y += def.height;
        points.push(p1, p2, pos.clone());
      } else if (seg.type === "LEFT" || seg.type === "RIGHT") {
        const r = def.radius || 25;
        const steps = 8;

        const rightVec = new THREE.Vector3().crossVectors(dir, up).normalize();
        const leftVec = new THREE.Vector3().crossVectors(up, dir).normalize();

        const turnCenterDir = seg.type === "LEFT" ? leftVec : rightVec;
        const turnCenter = pos.clone().add(turnCenterDir.clone().multiplyScalar(r));

        const startVec = pos.clone().sub(turnCenter);
        const totalAngle = seg.type === "LEFT" ? Math.PI / 2 : -Math.PI / 2;

        for (let i = 1; i <= steps; i++) {
          const tt = i / steps;
          const theta = tt * totalAngle;
          const rotatedVec = startVec.clone().applyAxisAngle(up, theta);
          const nextPt = turnCenter.clone().add(rotatedVec);
          nextPt.y = pos.y;
          points.push(nextPt);
        }

        pos.copy(points[points.length - 1]);
        dir.applyAxisAngle(up, totalAngle);
      } else if (seg.type === "LOOP") {
        const r = def.radius;
        const steps = 24;
        const forward = dir.clone().normalize();
        const upVec = new THREE.Vector3(0, 1, 0);

        for (let i = 1; i <= steps; i++) {
          const tt = i / steps;
          const angle = tt * Math.PI * 2;
          const loopY = (1 - Math.cos(angle)) * r;
          const loopFwd = Math.sin(angle) * r;
          const spacing = tt * 2;
          const finalPt = pos
            .clone()
            .add(forward.clone().multiplyScalar(loopFwd + spacing))
            .add(upVec.clone().multiplyScalar(loopY));
          points.push(finalPt);
        }
        pos.copy(points[points.length - 1]);
      }

      const endIdx = points.length;
      for (let i = startIdx; i < endIdx; i++) {
        colors.push(colorObj.r, colorObj.g, colorObj.b);
      }

      segmentInfoList.push({
        type: seg.type,
        variant: seg.variant,
        endPointIndex: endIdx - 1,
      });
    });

    const maxY = points.reduce((max, p) => Math.max(max, p.y), 0);
    maxEnergyRef.current = GRAVITY * (maxY + 15);

    if (points.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(points);
    curve.tension = 0.2;
    curveRef.current = curve;

    // Length mapping
    const pointLengths = [0];
    let totalPolyLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalPolyLength += points[i].distanceTo(points[i - 1]);
      pointLengths.push(totalPolyLength);
    }

    // Track mesh
    const tubeGeo = new THREE.TubeGeometry(curve, 400, 0.4, 6, false);
    const count = tubeGeo.attributes.position.count;
    const colorAttr = new Float32Array(count * 3);

    const radial = 6;
    const tubular = 400;
    let currentPtIdx = 0;

    for (let i = 0; i < count; i++) {
      const ringIndex = Math.floor(i / (radial + 1));
      const t = ringIndex / tubular;
      const targetLen = t * totalPolyLength;

      while (currentPtIdx < pointLengths.length - 1 && targetLen > pointLengths[currentPtIdx + 1]) currentPtIdx++;
      while (currentPtIdx > 0 && targetLen < pointLengths[currentPtIdx]) currentPtIdx--;

      if (colors[currentPtIdx * 3] !== undefined) {
        colorAttr[i * 3] = colors[currentPtIdx * 3];
        colorAttr[i * 3 + 1] = colors[currentPtIdx * 3 + 1];
        colorAttr[i * 3 + 2] = colors[currentPtIdx * 3 + 2];
      } else {
        colorAttr[i * 3] = 1;
        colorAttr[i * 3 + 1] = 1;
        colorAttr[i * 3 + 2] = 1;
      }
    }

    tubeGeo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

    const mesh = new THREE.Mesh(
      tubeGeo,
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.4,
      })
    );
    mesh.name = "TRACK";
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);

    // Supports (skip loops)
    const supports = new THREE.Group();
    supports.name = "SUPPORTS";
    const suppMat = new THREE.MeshStandardMaterial({ color: 0x64748b });

    const totalLen = curve.getLength();
    const supCount = Math.max(2, Math.floor(totalLen / 15));

    const pointSegmentTypes = new Array(points.length).fill("NORMAL");
    let curSegIdx = 0;
    let nextEndIdx = segmentInfoList[0]?.endPointIndex ?? 0;
    for (let i = 0; i < points.length; i++) {
      if (i > nextEndIdx && curSegIdx < segmentInfoList.length - 1) {
        curSegIdx++;
        nextEndIdx = segmentInfoList[curSegIdx].endPointIndex;
      }
      pointSegmentTypes[i] = segmentInfoList[curSegIdx]?.type ?? "NORMAL";
    }

    let supportPtIdx = 0;
    for (let i = 0; i <= supCount; i++) {
      const t = i / supCount;
      const targetLen = t * totalPolyLength;

      while (supportPtIdx < pointLengths.length - 1 && targetLen > pointLengths[supportPtIdx + 1]) supportPtIdx++;

      const segType = pointSegmentTypes[supportPtIdx];
      if (segType === "LOOP") continue;

      const pt = curve.getPointAt(t);
      if (pt.y > 1) {
        const h = pt.y;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, h, 6), suppMat);
        col.position.set(pt.x, h / 2, pt.z);
        col.frustumCulled = false;
        supports.add(col);
      }
    }
    scene.add(supports);

    // Segment map
    const map = [];
    let lastEndT = 0;
    segmentInfoList.forEach((info) => {
      const endPtIdx = info.endPointIndex;
      const lenAtEnd = pointLengths[endPtIdx];
      const endT = lenAtEnd / totalPolyLength;
      map.push({ startT: lastEndT, endT, type: info.type, variant: info.variant });
      lastEndT = endT;
    });
    segmentsMapRef.current = map;

    resetSim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  // --- Physics ---
  useEffect(() => {
    if (!isSimulating) return;

    const dt = 0.016;
    const interval = setInterval(() => {
      if (!curveRef.current || !cartRef.current) return;

      const phys = physicsRef.current;
      const curve = curveRef.current;
      const map = segmentsMapRef.current;

      const currentSeg = map.find((s) => phys.t >= s.startT && phys.t < s.endT) || map[map.length - 1];

      const point = curve.getPointAt(phys.t);
      const tangent = curve.getTangentAt(phys.t).normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);

      // --- PARALLEL TRANSPORT ---
      let frameBinormal = phys.lastBinormal.clone().projectOnPlane(tangent).normalize();
      if (frameBinormal.length() === 0) frameBinormal = new THREE.Vector3(1, 0, 0);

      let worldBinormal = new THREE.Vector3().crossVectors(tangent, worldUp);
      const worldBinormalLen = worldBinormal.length();
      if (worldBinormalLen > 0.9) {
        worldBinormal.normalize();
        if (worldBinormal.dot(frameBinormal) > 0.8) frameBinormal.copy(worldBinormal);
      }

      phys.lastBinormal.copy(frameBinormal);

      const normal = new THREE.Vector3().crossVectors(frameBinormal, tangent).normalize();
      const localUp = normal;

      const sinSlope = tangent.y;
      const accelG = -GRAVITY * sinSlope;

      let friction = -FRICTION_COEFF * phys.velocity;
      let accelExternal = 0;

      if (currentSeg) {
        if (currentSeg.type === "UP" && currentSeg.variant === "CHAIN") {
          const def = SEGMENT_DEFS.UP.variants.find((v) => v.id === "CHAIN");
          const target = def?.chainSpeed ?? 5;
          if (phys.velocity < target) {
            phys.velocity = THREE.MathUtils.lerp(phys.velocity, target, 0.1);
            friction = 0;
          }
        }
        if (currentSeg.type === "STRAIGHT" && currentSeg.variant === "BOOST") {
          const def = SEGMENT_DEFS.STRAIGHT.variants.find((v) => v.id === "BOOST");
          accelExternal = def?.force ?? 20;
        }
        if (currentSeg.type === "STRAIGHT" && currentSeg.variant === "BRAKE") {
          const def = SEGMENT_DEFS.STRAIGHT.variants.find((v) => v.id === "BRAKE");
          friction = -phys.velocity * (def?.drag ?? 2.0);
        }
      }

      phys.velocity += (accelG + friction + accelExternal) * dt;
      if (phys.velocity < 0.1) phys.velocity = 0.1;

      const len = curve.getLength();
      const dist = phys.velocity * dt;
      phys.t += dist / len;

      if (phys.t >= 1) {
        phys.t = 0;
        phys.velocity = INITIAL_SPEED;
      }

      cartRef.current.position.copy(point);
      cartRef.current.up.copy(normal);
      cartRef.current.lookAt(point.clone().add(tangent));

      const vVec = tangent.clone().multiplyScalar(phys.velocity);
      const accelVec = vVec.clone().sub(phys.lastVel).divideScalar(dt);
      phys.lastVel.copy(vVec);

      const gVec = new THREE.Vector3(0, -GRAVITY, 0);
      const feltAccel = accelVec.sub(gVec);

      const vertG = feltAccel.dot(localUp) / GRAVITY;
      const latG = feltAccel.dot(frameBinormal) / GRAVITY;
      const totalG = feltAccel.length() / GRAVITY;

      const pe = GRAVITY * point.y;
      const ke = 0.5 * phys.velocity * phys.velocity;
      const totalE = pe + ke;

      if (totalE > maxEnergyRef.current) maxEnergyRef.current = totalE;

      setStats({
        velocity: (phys.velocity * 3.6).toFixed(0),
        gVertical: vertG.toFixed(1),
        gLateral: latG.toFixed(1),
        gTotal: totalG.toFixed(1),
        pe: pe.toFixed(0),
        ke: ke.toFixed(0),
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="relative w-full h-full text-slate-800 select-none overflow-hidden font-sans">
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
        {/* Top Bar */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="glass-panel px-6 py-4 rounded-2xl">
            <h1 className="text-2xl font-black italic tracking-tighter text-blue-600">
              COASTER<span className="text-slate-800">BUILDER</span>
            </h1>
            <div className="text-xs text-slate-500 font-mono mt-1 font-semibold">
              {segments.length} SEGM • BUILD MODE
            </div>
          </div>

          <button
            onClick={() => setShowTelemetry((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl backdrop-blur-md transition-all border shadow-sm ${
              showTelemetry
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-white/90 border-white/60 hover:bg-white text-slate-700"
            }`}
          >
            <Icon name="activity" size={20} />
            <span className="font-bold text-sm">TELEMETRY</span>
          </button>
        </div>

        {/* Telemetry Panel */}
        {showTelemetry && (
          <div className="absolute top-24 right-6 w-64 glass-panel p-4 rounded-xl pointer-events-auto animate-in fade-in slide-in-from-right-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-blue-600">LIVE DATA</h3>
              <button onClick={() => setShowTelemetry(false)} className="hover:text-red-500 text-slate-400">
                <Icon name="x" size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1 font-bold">
                  <span>VERTICAL G</span>
                  <span className={Math.abs(stats.gVertical) > 4 ? "text-red-500" : "text-slate-800"}>
                    {stats.gVertical} G
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 left-1/2"></div>
                  <div
                    className={`h-full ${Math.abs(stats.gVertical) > 4 ? "bg-red-500" : "bg-blue-500"}`}
                    style={{
                      width: `${Math.min(100, Math.abs(stats.gVertical) * 10)}%`,
                      left: stats.gVertical < 0 ? `${50 - Math.min(50, Math.abs(stats.gVertical) * 10)}%` : "50%",
                      position: "absolute",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1 font-bold">
                  <span>LATERAL G</span>
                  <span className={Math.abs(stats.gLateral) > 2 ? "text-red-500" : "text-slate-800"}>
                    {stats.gLateral} G
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 left-1/2"></div>
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${Math.min(100, Math.abs(stats.gLateral) * 20)}%`,
                      left: stats.gLateral < 0 ? `${50 - Math.min(50, Math.abs(stats.gLateral) * 20)}%` : "50%",
                      position: "absolute",
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold uppercase">
                  <span>Energy (J/kg)</span>
                </div>
                <div className="flex h-16 items-end gap-1">
                  <div className="w-1/2 h-full bg-emerald-100 rounded-t relative group overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-emerald-500 rounded-t"
                      style={{ height: `${Math.min(100, (stats.ke / maxEnergyRef.current) * 100)}%` }}
                    />
                    <div className="absolute top-1 w-full text-center text-[9px] font-bold text-emerald-700">KE</div>
                  </div>
                  <div className="w-1/2 h-full bg-purple-100 rounded-t relative group overflow-hidden">
                    <div
                      className="absolute bottom-0 w-full bg-purple-500 rounded-t"
                      style={{ height: `${Math.min(100, (stats.pe / maxEnergyRef.current) * 100)}%` }}
                    />
                    <div className="absolute top-1 w-full text-center text-[9px] font-bold text-purple-700">PE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Builder Toolbar */}
        <div className="pointer-events-auto self-start mt-4 flex flex-col gap-3">
          {Object.entries(SEGMENT_DEFS).map(([key, def]) => {
            if (key === "START") return null;
            return (
              <div key={key} className="group relative flex items-center hover:z-30">
                <button
                  onClick={() => addSegment(key)}
                  className="w-14 h-14 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-md active:scale-95 z-20 relative"
                >
                  <Icon name={def.icon} />
                  <span className="text-[10px] font-bold uppercase">{def.label.split(" ")[0]}</span>
                </button>

                {def.variants && (
                  <div className="submenu absolute left-12 ml-2 pl-4 flex gap-2 opacity-0 invisible -translate-x-4 transition-all duration-200 z-10 before:absolute before:inset-0 before:-left-4 before:w-full before:h-full before:content-[''] before:z-[-1]">
                    <div className="relative z-10 flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xl">
                      {def.variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            addSegment(key, v.id);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-xs font-bold whitespace-nowrap transition-colors border border-transparent hover:border-slate-200"
                          style={{ color: `#${v.color.toString(16).padStart(6, "0")}` }}
                        >
                          {v.id === "CHAIN" && <Icon name="chevrons-up" size={14} />}
                          {v.id === "BOOST" && <Icon name="zap" size={14} />}
                          {v.id === "BRAKE" && <Icon name="anchor" size={14} />}
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="h-px bg-slate-300 my-2 w-14" />

          <button
            onClick={undo}
            className="w-14 h-14 bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 border border-slate-200 hover:border-red-200 rounded-xl flex items-center justify-center transition-all shadow-md"
          >
            <Icon name="rotate-ccw" />
          </button>
        </div>

        {/* Dashboard */}
        <div className="pointer-events-auto self-center glass-panel rounded-2xl p-2 flex items-center gap-6 pr-8 mt-auto">
          <button
            onClick={() => setIsSimulating((v) => !v)}
            className={`w-16 h-16 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              isSimulating ? "bg-amber-400 text-black animate-pulse" : "bg-green-500 hover:bg-green-400 text-white"
            }`}
          >
            <Icon name={isSimulating ? "square" : "play"} size={24} />
          </button>

          <button
            onClick={resetSim}
            className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
          >
            <Icon name="refresh-cw" />
          </button>

          <div className="h-10 w-px bg-slate-300 mx-2" />

          <button
            onClick={() => setCameraMode((m) => (m === "ORBIT" ? "RIDE" : "ORBIT"))}
            className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
              cameraMode === "RIDE" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Icon name="video" />
            {cameraMode === "RIDE" ? "RIDE CAM" : "ORBIT"}
          </button>

          <div className="flex gap-8 ml-4">
            <div>
              <div className="text-[10px] text-slate-400 font-bold tracking-wider">SPEED</div>
              <div className="text-2xl font-mono font-bold text-slate-800">
                {stats.velocity} <span className="text-sm text-slate-500">km/h</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold tracking-wider">TOTAL G</div>
              <div className={`text-2xl font-mono font-bold ${Math.abs(stats.gTotal) > 4 ? "text-red-500" : "text-slate-800"}`}>
                {stats.gTotal} <span className="text-sm text-slate-500">G</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTE: parent controls height. This component fills its container. */}
    </div>
  );
}
