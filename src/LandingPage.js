// src/LandingPage.js — BH sim + 3x3 (9‑frame) hawk sprite sheet with proper orientation
// Place your 3x3 sheet at: public/assets/hawk_3x3.png
// Each hawk rotates to match its velocity so it “faces” its flight direction.

import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const titleRef = useRef(null);

  // Bodies (stars, collapsing stars, BHs)
  const bodiesRef = useRef([]);

  // Hawks (from sprite sheet)
  const hawksRef = useRef([]);
  const hawkSpawnRef = useRef({ nextAt: 0 });
  const spriteRef = useRef({ img: null, loaded: false, fw: 0, fh: 0, frames: 9, cols: 3, rows: 3 });

  // Title-suck state
  const bhFormedRef = useRef(false);
  const bhCenterRef = useRef({ x: 0, y: 0 });
  const textSuckProgressRef = useRef(0);

  // Mouse-grow star
  const growingStarRef = useRef(null);
  const holdStartRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // RAF & timing
  const animationRef = useRef(0);
  const resizeRafRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Physics constants
  const G = 0.2;
  const MAX_DISTANCE = 2000;
  const BH_THRESHOLD_MASS = 50;

  // Hawk config
  const HAWK_MIN_INTERVAL_MS = 5000;
  const HAWK_MAX_INTERVAL_MS = 12000;
  const HAWK_SPEED_MIN = 120;   // px/s
  const HAWK_SPEED_MAX = 120;  // px/s
  const HAWK_SIZE = 28;        // render size (px)
  const HAWK_LIFETIME_MIN = 10000;
  const HAWK_LIFETIME_MAX = 10000;
  const HAWK_FPS = 14;         // animation speed

  useEffect(() => {
    // Preload 3x3 sprite sheet
    const img = new Image();
    img.src = process.env.PUBLIC_URL + "/assets/hawks.png";
    img.onload = () => {
      spriteRef.current = {
        img,
        loaded: true,
        fw: Math.floor(img.width / 3 - 10), //trim a bit to avoid edge artifacts
        fh: Math.floor(img.height / 3 -10),
        frames: 9,
        cols: 3,
        rows: 3,
      };
    };

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");

    const resizeNow = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };
    const throttledResize = () => {
      if (resizeRafRef.current) return;
      resizeRafRef.current = requestAnimationFrame(() => { resizeNow(); resizeRafRef.current = 0; });
    };

    resizeNow();

    // Init bodies (two starter stars)
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2; const cy = rect.height / 2;
    bodiesRef.current = [
      { x: cx - 60, y: cy - 10, size: 10, color: "#bde5f4", vx: 0.05, vy: 0.12, mass: 6, type: "star" },
      { x: cx + 60, y: cy + 10, size: 16, color: "#f5957a", vx: -0.04, vy: -0.08, mass: 9, type: "star" },
    ];

    const ro = new ResizeObserver(throttledResize);
    ro.observe(container);

    lastTimeRef.current = performance.now();
    hawkSpawnRef.current.nextAt = lastTimeRef.current + rand(HAWK_MIN_INTERVAL_MS, HAWK_MAX_INTERVAL_MS);

    const animate = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw bodies
      for (const b of bodiesRef.current) {
        if (b.type === "bh") drawBH(ctx, b);
        else if (b.type === "collapsing") drawCollapsing(ctx, b);
        else drawStar(ctx, b);
      }
      if (growingStarRef.current) drawStar(ctx, growingStarRef.current);

      // Update bodies physics
      updateBodies();

      // Hawk spawning + update + draw
      if (now >= hawkSpawnRef.current.nextAt) {
        trySpawnHawks();
        hawkSpawnRef.current.nextAt = now + rand(HAWK_MIN_INTERVAL_MS, HAWK_MAX_INTERVAL_MS);
      }
      updateHawks(dt);
      drawHawks(ctx);

      if (bhFormedRef.current) advanceTitleSuck();

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      ro.disconnect();
    };
  }, []);

  // ---------- helpers ----------
  function rand(min, max) { return min + Math.random() * (max - min); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function drawStar(ctx, s){ ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); }
  function drawBH(ctx, bh) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, bh.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw gravitational wave pulse from merger
    if (bh.gwProgress !== undefined && bh.gwProgress < 1) {
        const p = bh.gwProgress;
        const easeOutQuad = t => t * (2 - t);
        const currentRadius = bh.gwMaxRadius * easeOutQuad(p);
        const opacity = 1 - p;

        ctx.strokeStyle = `rgba(200, 200, 255, ${opacity * 0.7})`;
        ctx.lineWidth = 1 + (1 - opacity) * 8;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
  }
  function drawCollapsing(ctx,s){ drawStar(ctx,s); ctx.strokeStyle='rgba(255,200,120,0.25)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.size*1.12,0,Math.PI*2); ctx.stroke(); }

  function updateBodies(){
    // merge pass
    let arr=bodiesRef.current, bodies=[]; const merged=new Set();
    for(let i=0;i<arr.length;i++){ if(merged.has(i)) continue; const A=arr[i]; let did=false; for(let j=i+1;j<arr.length;j++){ if(merged.has(j)) continue; const B=arr[j]; const dx=B.x-A.x, dy=B.y-A.y; const dist=Math.hypot(dx,dy); const As=A.size??A.initialSize??10, Bs=B.size??B.initialSize??10; if(dist < (As/2+Bs/2)){
            if(A.type==='bh'&&B.type==='bh'){
              const m=A.mass+B.mass; const x=(A.x*A.mass+B.x*B.mass)/m; const y=(A.y*A.mass+B.y*B.mass)/m; const vx=(A.vx*A.mass+B.vx*B.mass)/m; const vy=(A.vy*A.mass+B.vy*B.mass)/m; const size=Math.sqrt(A.size**2+B.size**2);
              bodies.push({x,y,vx,vy,mass:m,type:'bh',size, fixed:true, gwProgress:0, gwMaxRadius:size*2.5});
              merged.add(i); merged.add(j); did=true; break;
            } else if(A.type!=='bh'&&B.type!=='bh'){
              const m=A.mass+B.mass; const x=(A.x*A.mass+B.x*B.mass)/m; const y=(A.y*A.mass+B.y*B.mass)/m; const vx=(A.vx*A.mass+B.vx*B.mass)/m; const vy=(A.vy*A.mass+B.vy*B.mass)/m; const size=Math.sqrt((A.size??A.initialSize)**2+(B.size??B.initialSize)**2);
              if(m>=BH_THRESHOLD_MASS){ const fixed=Math.max(10,size*0.6); bodies.push({x,y,vx,vy,mass:m,type:'collapsing',initialSize:size,size, targetSize:fixed,color:'#222',collapseProgress:0}); if(!bhFormedRef.current){ bhCenterRef.current={x,y}; bhFormedRef.current=true; textSuckProgressRef.current=0; } }
              else { bodies.push({x,y,size,color:getStarColor(size),vx,vy,mass:m,type:'star'}); }
              merged.add(i); merged.add(j); did=true; break;
            }
        }
      }
      if(!did) bodies.push(A);
    }

    // gravity + collapse
    const updated=bodies.map(A=>{ let fx=0,fy=0; for(const B of bodies){ if(A===B) continue; const dx=B.x-A.x, dy=B.y-A.y; const dist=Math.hypot(dx,dy); const As=A.size??A.initialSize??10, Bs=B.size??B.initialSize??10; if(dist>(As/2+Bs/2)){ const F=(G*A.mass*B.mass)/(dist*dist); fx+=(dx/dist)*F; fy+=(dy/dist)*F; } } A.vx=(A.vx||0)+fx; A.vy=(A.vy||0)+fy; A.x+=A.vx; A.y+=A.vy; if(A.type==='collapsing'){ A.collapseProgress=Math.min(1,(A.collapseProgress||0)+0.06); const p=A.collapseProgress; A.size=A.initialSize*(1-p)+A.targetSize*p; A.vx*=0.985; A.vy*=0.985; if(p===1){ A.type='bh'; A.size=A.targetSize; A.fixed=true; delete A.initialSize; delete A.targetSize; delete A.collapseProgress; } } if(A.gwProgress !== undefined){ A.gwProgress = Math.min(1, (A.gwProgress||0) + 0.015); if(A.gwProgress >= 1) { delete A.gwProgress; delete A.gwMaxRadius; } } return { ...A }; });

    // BH absorb (no radius growth)
    for(let i=0;i<updated.length;i++){ const A=updated[i]; if(A.type==='bh') continue; for(let j=0;j<updated.length;j++){ const B=updated[j]; if(B.type!=='bh') continue; if(Math.hypot(A.x-B.x,A.y-B.y) < B.size){ B.mass += A.mass; updated.splice(i,1); i--; break; } } }

    bodiesRef.current = updated.filter(b=>Math.abs(b.x)<MAX_DISTANCE && Math.abs(b.y)<MAX_DISTANCE);
  }

 function trySpawnHawks(){
const bhs = bodiesRef.current.filter(b=>b.type==='bh');
if(!bhs.length) return;
const bh=bhs[(Math.random()*bhs.length)|0];
const count = Math.random() < 0 ? 2 : 1;


for(let k=0;k<count;k++){
const angle=Math.random()*Math.PI*2;
const speed=rand(HAWK_SPEED_MIN, HAWK_SPEED_MAX);
const x=bh.x+Math.cos(angle)*(bh.size+2);
const y=bh.y+Math.sin(angle)*(bh.size+2);
const delayMs = k * 0; // stagger inside-burst spawns


hawksRef.current.push({
x, y,
vx: Math.cos(angle)*speed,
vy: Math.sin(angle)*speed,
bornAt: performance.now(),
delayMs,
active: (delayMs === 0), // start inactive if delayed
lifeMs: rand(HAWK_LIFETIME_MIN, HAWK_LIFETIME_MAX),
frame: (Math.random()*spriteRef.current.frames)|0,
acc: 0
});
}
}

// Example: your sprite sheet is 3 cols × 3 rows but rows are uneven
// Hardcode the top coordinate + height for each row
const rowBounds = [
  { y: 0,    h: 180 },   // row 0
  { y: 180,   h: 165 },   // row 1
  { y: 345,  h: 111 }    // row 2
];
const cols = 3;
const totalFrames = 9;

function updateHawks(dt){
const now = performance.now();
hawksRef.current = hawksRef.current.filter(h => {
// activate after per-hawk delay
if (!h.active && now - h.bornAt >= (h.delayMs||0)) h.active = true;


if (h.active) {
h.x += h.vx * dt;
h.y += h.vy * dt;
h.acc += dt;
const step = 1/HAWK_FPS;
while(h.acc >= step){ h.acc -= step; h.frame = (h.frame + 1) % spriteRef.current.frames; }
}


const rect = canvasRef.current.getBoundingClientRect();
const off = h.x < -40 || h.y < -40 || h.x > rect.width + 40 || h.y > rect.height + 40;
const old = now - h.bornAt > h.lifeMs + (h.delayMs||0);
return !(off || old);
});
}


// In drawHawks:
function drawHawks(ctx) {
  const spr = spriteRef.current;
  if (!spr.loaded) return;

  const fw = Math.floor(spr.img.width / cols); // still evenly spaced in X
  const scale = HAWK_SIZE / fw;

  for (const h of hawksRef.current) {
    const col = h.frame % cols;
    const row = Math.floor(h.frame / cols);
    const { y: sy, h: fh } = rowBounds[row];

    const sx = col * fw;

    // rotate to velocity
    const angle = Math.atan2(h.vy, h.vx);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(angle);
    ctx.drawImage(
      spr.img,
      sx, sy, fw, fh,            // src rect (x,y,w,h)
      -fw * scale / 2, -fh * scale / 2, // dest rect centered
      fw * scale, fh * scale
    );
    ctx.restore();
  }
}
  function advanceTitleSuck(){ const title=titleRef.current, canvas=canvasRef.current; if(!title||!canvas) return; const tr=title.getBoundingClientRect(), cr=canvas.getBoundingClientRect(); const c=bhCenterRef.current; const bx=cr.left+c.x, by=cr.top+c.y; const cx=tr.left+tr.width/2, cy=tr.top+tr.height/2; const p=Math.min(1, textSuckProgressRef.current+0.01); textSuckProgressRef.current=p; const x=lerp(cx,bx,p), y=lerp(cy,by,p); const scale=Math.max(0.1,1-p); const rotate=p*540; const opacity=Math.max(0,1-p*1.2); title.style.transform=`translate(${x-cx}px, ${y-cy}px) scale(${scale}) rotate(${rotate}deg)`; title.style.opacity=String(opacity); }

  // --- star color helper ---
  function getStarColor(size){ const min=5,max=20; const t=Math.max(0,Math.min(1,(size-min)/(max-min))); const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+t*(b[i]-v))); const blue=[173,216,230], yellow=[255,240,200], red=[240,80,0]; const c = t<0.5?mix(blue,yellow,t*2):mix(yellow,red,(t-0.5)*2); return `rgb(${c[0]},${c[1]},${c[2]})`; }

  // --- mouse interactions: grow a star then launch on release ---
  const getMousePos = (e) => { const r=canvasRef.current.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; };
  function handleMouseDown(e){ holdStartRef.current=Date.now(); const {x,y}=getMousePos(e); startPosRef.current={x,y}; growingStarRef.current={ x,y,size:5,color:getStarColor(5), mass:2.5, type:'star' }; requestAnimationFrame(growStar); }
  function growStar(){ if(!holdStartRef.current||!growingStarRef.current) return; const t=(Date.now()-holdStartRef.current)/1000; const s=Math.min(26, 5 + t*6); growingStarRef.current.size=s; growingStarRef.current.color=getStarColor(s); growingStarRef.current.mass=s/2; requestAnimationFrame(growStar); }
  function handleMouseUp(e){ if(growingStarRef.current){ const {x,y}=getMousePos(e); const dx=x-startPosRef.current.x, dy=y-startPosRef.current.y; const vs=0.01; const vx=dx*vs, vy=dy*vs; const s=growingStarRef.current; bodiesRef.current.push({ x:s.x, y:s.y, size:s.size, color:s.color, mass:s.mass, vx, vy, type:'star' }); growingStarRef.current=null; } holdStartRef.current=null; }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div ref={containerRef} style={{ width: "100%", maxWidth: 1100, margin: "0 auto", aspectRatio: "16 / 9" }}>
        <canvas ref={canvasRef} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} style={{ display: "block", width: "100%", height: "100%", borderRadius: 16 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <h1 ref={titleRef} style={{ fontSize: 48, margin: 0, transition: "transform 0.05s linear" }}>Welcome to the Physics Nook</h1>
        <p style={{ fontSize: 18, opacity: 0.9, marginTop: 8 }}>Explore interactive simulations for a variety of topics.</p>
        <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link to="/kinematics" style={{ padding: "10px 14px", borderRadius: 12, background: "#1f2937", color: "white", textDecoration: "none" }}>Kinematics</Link>
          <Link to="/electric-fields" style={{ padding: "10px 14px", borderRadius: 12, background: "#1f2937", color: "white", textDecoration: "none" }}>Electric Fields</Link>
        </div>
      </div>
    </div>
  );
}