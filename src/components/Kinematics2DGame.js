import React, { useRef, useState, useEffect, useCallback } from "react";
import Sketch from "react-p5";

// ==========================================
// Config (Apps Script endpoints + token)
// ==========================================
const SCORE_API = {
  writeUrl: "https://script.google.com/macros/s/AKfycbxqYWYSJHCwp90JNgNspPqGuYOH6MsxSU_mWmJYXGzMGvXvOZNvUArzfCVqcU3blsr0Ig/exec",
  readUrl:  "https://script.google.com/macros/s/AKfycbxqYWYSJHCwp90JNgNspPqGuYOH6MsxSU_mWmJYXGzMGvXvOZNvUArzfCVqcU3blsr0Ig/exec",
  token: "tomnook",            // must match SECRET in Code.gs
  sheet: "Kinematics2D",       // tab name (allowed by ALLOWED_TABS)
};

const COLORS = {
  bg: "#ffffff",
  panel: "#ffffff",
  panelBorder: "#e5e7eb",
  text: "#1f2937",
  subtext: "#6b7280",
  grid: "#e5e7eb",
  x: "#0ea5a0",
  v: "#9061f9",
  a: "#dc8850",
  zone: "#28a745",
  golden: "rgba(218,165,32,1)",
  boostOuter: "#f97316",
  clock: "#8b5cf6",
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand  = (a, b) => a + Math.random() * (b - a);

export default function Kinematics2DGame() {
  // ---------- Gameplay tunables ----------
  const PLAYER_R = 8;
  const GAME_TIME = 30;

  // accel/vel caps
  const A_STEP = 175, A_MAX = 350, V_MAX = 1000;
  const A_MOUSE = 200;

  // goals
  const GOAL_R = 18, GOLDEN_R = 20, GOLDEN_VALUE = 3, NORMAL_VALUE = 1, GOLDEN_CHANCE = 0.15;

  // collectibles
  const BOOST_R = 16, BOOST_MULT = 2.0, BOOST_DURATION = 5.0; // 🔥
  const CLOCK_R = 16, CLOCK_BONUS = 5.0; // ⏱️

  // spawn mix (4 items active)
  const MAX_SPAWNS = 4;
  const PROB_CLOCK = 0.15;
  const PROB_BOOST = 0.15;

  // ---------- Game state ----------
  const [running, setRunning] = useState(false);
  const [gravityOn, setGravityOn] = useState(false);
  const [gameOn, setGameOn] = useState(false); // sandbox vs Goal Rush
  const [score, setScore] = useState(0);
  const [goldenHits, setGoldenHits] = useState(0);
  const [normalHits, setNormalHits] = useState(0);
  const [ended, setEnded] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [pendingSubmitted, setPendingSubmitted] = useState(false);

  // Leaderboard UI
  const [playerName, setPlayerName] = useState("");
  const [cloudScores, setCloudScores] = useState([]);
  const [showLB, setShowLB] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingBoard, setFetchingBoard] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // World
  const worldRef = useRef({
    W: 600, H: 600,
    x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    tLeft: GAME_TIME,
    lastMs: 0,
    spawns: [],
    boostLeft: 0,
  });

  const mouseActiveRef = useRef(false);

  // ============== Leaderboard helpers ==============
  const fetchLeaderboard = useCallback(async (limit = 10) => {
    try {
      setFetchingBoard(true);
      const url = new URL(SCORE_API.readUrl);
      url.searchParams.set("token", SCORE_API.token);
      url.searchParams.set("sheet", SCORE_API.sheet);
      url.searchParams.set("limit", String(limit));
      const res = await fetch(url.toString()); // keep it simple
      const data = await res.json();
      if (data?.ok && Array.isArray(data.scores)) setCloudScores(data.scores);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingBoard(false);
    }
  }, []);

  // ---------- CORS-safe score submit (no preflight) ----------
  const submitScore = useCallback(async ({ score, goldenHits, normalHits, timeSec, mode }) => {
    try {
      setSubmitting(true);
      setPendingSubmitted(true);

      const payload = {
        token: SCORE_API.token,
        sheet: SCORE_API.sheet,
        name: (playerName || "anon").trim(),
        score,
        goldenHits,
        normalHits,
        timeSec,            // GAME_TIME (plus any bonus time you award)
        version: "2D-v1",
        mode,
      };

// ✅ preflight-free
const resp = await fetch(SCORE_API.writeUrl, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=UTF-8" }, // simple → no OPTIONS
  body: JSON.stringify({
    token: SCORE_API.token,
    sheet: SCORE_API.sheet,
    name: (playerName || "anon").trim(),
    score,
    goldenHits,
    normalHits,
    timeSec: GAME_TIME, // your round time (or GAME_TIME + bonuses if you track them)
    version: "2D-v1",
    mode: "GoalRush",
  }),
});

// Parse without assuming JSON to aid debugging
const text = await resp.text();
let j;
try {
  j = JSON.parse(text);
} catch {
  j = { ok: false, error: "Non-JSON response", text, status: resp.status };
}

if (j?.ok) {
  await fetchLeaderboard(10); // refresh cloud board
} else {
  console.warn("Score submit failed:", j);
}
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
      setPendingSubmitted(false);
    }
  }, [playerName, fetchLeaderboard]);

  useEffect(() => {
    if (gameOn && showLB) fetchLeaderboard(10);
  }, [gameOn, showLB, fetchLeaderboard]);

  // ============== Input: disable scroll + Space starts ==============
  useEffect(() => {
    const block = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Spacebar","w","a","s","d","W","A","S","D"]);
    const onKeyDown = (e) => {
      if (isInputFocused) return;
      if (block.has(e.key)) e.preventDefault();
      if ((e.key === " " || e.key === "Spacebar") && !running) setRunning(true);
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [running, isInputFocused]);

  // ============== Spawns ==============
  const jitterAwayFromCenter = (w, gx, gy, minR = 100) => {
    const d0 = Math.hypot(gx, gy);
    if (d0 < minR) {
      const s = minR / Math.max(1e-6, d0);
      return { x: gx * s, y: gy * s };
    }
    return { x: gx, y: gy };
  };

  const placeSpawn = (w, r) => {
    const margin = 80;
    let gx = rand(-w.W * 0.5 + margin, w.W * 0.5 - margin);
    let gy = rand(-w.H * 0.5 + margin, w.H * 0.5 - margin);
    const p = jitterAwayFromCenter(w, gx, gy);
    return { x: p.x, y: p.y, r };
  };

  const makeGoal = (w) => {
    const isGolden = Math.random() < GOLDEN_CHANCE;
    const base = placeSpawn(w, isGolden ? GOLDEN_R : GOAL_R);
    return { type: "goal", ...base, golden: isGolden, points: isGolden ? GOLDEN_VALUE : NORMAL_VALUE };
  };
  const makeBoost = (w) => ({ type: "boost", ...placeSpawn(w, BOOST_R) });
  const makeClock = (w) => ({ type: "clock", ...placeSpawn(w, CLOCK_R) });

  const makeSpawn = (w) => {
    if (Math.random() < PROB_CLOCK) return makeClock(w);
    if (Math.random() < PROB_BOOST) return makeBoost(w);
    return makeGoal(w);
  };

  const seedSpawns = (w) => {
    w.spawns = [];
    for (let i = 0; i < MAX_SPAWNS; i++) w.spawns.push(makeSpawn(w));
  };

  const resetGame = useCallback((p5) => {
    const w = worldRef.current;
    w.x = 0; w.y = 0; w.vx = 0; w.vy = 0; w.ax = 0; w.ay = 0;
    w.tLeft = GAME_TIME;
    w.boostLeft = 0;
    setEnded(false);
    setFinalScore(null);
    setPendingSubmitted(false);
    setScore(0); setGoldenHits(0); setNormalHits(0);
    setSubmitted(false);
    if (gameOn) seedSpawns(w); else w.spawns = [];
    w.lastMs = p5 ? p5.millis() : 0;
    setRunning(false);
  }, [gameOn]);

  // ============== p5 setup & helpers ==============
  const setup = (p5, parent) => {
    const pw = parent.getBoundingClientRect().width || 600;
    p5.createCanvas(pw, pw).parent(parent);
    const w = worldRef.current;
    w.W = pw; w.H = pw; w.lastMs = p5.millis();
    p5.frameRate(60);
    p5.windowResized = () => {
      const nw = parent.getBoundingClientRect().width || 600;
      p5.resizeCanvas(nw, nw);
      w.W = nw; w.H = nw;
    };
    resetGame(p5);
  };

  const drawGrid = (p5, cx, cy) => {
    const w = worldRef.current;
    p5.push(); p5.translate(cx, cy);
    p5.stroke(COLORS.grid); p5.strokeWeight(1);
    const step = 50;
    for (let x = -w.W; x <= w.W; x += step) p5.line(x, -w.H, x, w.H);
    for (let y = -w.H; y <= w.H; y += step) p5.line(-w.W, y, w.W, y);
    p5.stroke("#b9c0c7"); // axes
    p5.line(-w.W, 0, w.W, 0);
    p5.line(0, -w.H, 0, w.H);
    p5.pop();
  };

  const drawArrow = (p5, x0, y0, vx, vy, color, label) => {
    const L = Math.hypot(vx, vy); if (L < 1e-6) return;
    const s = 0.25, dx = vx * s, dy = vy * s;
    const x1 = x0 + dx, y1 = y0 + dy;
    p5.stroke(color); p5.strokeWeight(2);
    p5.line(x0, y0, x1, y1);
    const ang = Math.atan2(dy, dx);
    const ah = 14, aw = 5;
    p5.fill(color);
    p5.push(); p5.translate(x1, y1); p5.rotate(ang);
    p5.triangle(0, 0, -ah, aw, -ah, -aw);
    p5.pop();
    if (label) {
      const offset = 14;
      const perp = ang + Math.PI / 2;
      const lx = x1 + offset * Math.cos(perp);
      const ly = y1 + offset * Math.sin(perp);
      p5.noStroke(); p5.fill(color);
      p5.textAlign(p5.CENTER, p5.CENTER);
      p5.text(label, lx, ly);
    }
  };

  const drawSpawns = (p5, cx, cy, spawns) => {
    spawns.forEach(s => {
      const gx = cx + s.x, gy = cy + s.y;
      if (s.type === "goal") {
        p5.noFill();
        p5.stroke(s.golden ? COLORS.golden : COLORS.zone);
        p5.strokeWeight(s.golden ? 4 : 3);
        p5.circle(gx, gy, s.r * 2);
        const pulse = 0.5 + 0.5 * Math.sin(p5.millis() * 0.006);
        p5.noStroke();
        p5.fill(s.golden ? "rgba(218,165,32,0.7)" : "rgba(40,160,40,0.7)");
        p5.circle(gx, gy, 7 + 4 * pulse);
      } else if (s.type === "boost") {
        p5.noStroke(); p5.fill(COLORS.boostOuter); p5.circle(gx, gy, s.r * 2);
        p5.push(); p5.translate(gx, gy);
        p5.fill("#fde047");
        p5.beginShape();
        p5.vertex(0, -7);
        p5.bezierVertex(5, -2, 5, 4, 0, 8);
        p5.bezierVertex(-5, 4, -5, -2, 0, -7);
        p5.endShape(p5.CLOSE);
        p5.fill("#ffffff");
        p5.beginShape();
        p5.vertex(0, -4);
        p5.bezierVertex(2, -1, 2, 2, 0, 4);
        p5.bezierVertex(-2, 2, -2, -1, 0, -4);
        p5.endShape(p5.CLOSE);
        p5.pop();
      } else if (s.type === "clock") {
        p5.noFill(); p5.stroke(COLORS.clock); p5.strokeWeight(3);
        p5.circle(gx, gy, s.r * 2);
        p5.stroke(COLORS.clock); p5.strokeWeight(2);
        p5.line(gx, gy, gx, gy - 6);
        p5.line(gx, gy, gx + 5, gy + 3);
      }
    });
  };

  const mouseUnitDir = (p5) => {
    const w = worldRef.current;
    const CX = p5.width / 2, CY = p5.height / 2;
    const worldMx = p5.mouseX - CX, worldMy = p5.mouseY - CY;
    const dx = worldMx - w.x, dy = worldMy - w.y;
    const L = Math.hypot(dx, dy);
    if (L > 1e-6) return { x: dx / L, y: dy / L };
    return { x: 0, y: 0 };
  };

  // ============== Physics & draw ==============
  const stepPhysics = (p5, dt) => {
    const w = worldRef.current;

    if (w.boostLeft > 0) w.boostLeft = Math.max(0, w.boostLeft - dt);

    let ax = 0, ay = 0;

    if (!isInputFocused) {
      if (mouseActiveRef.current) {
        const d = mouseUnitDir(p5);
        ax = A_MOUSE * d.x; ay = A_MOUSE * d.y;
      } else {
        if (p5.keyIsDown(p5.LEFT_ARROW))  ax -= A_STEP;
        if (p5.keyIsDown(p5.RIGHT_ARROW)) ax += A_STEP;
        if (p5.keyIsDown(p5.UP_ARROW))    ay -= A_STEP;
        if (p5.keyIsDown(p5.DOWN_ARROW))  ay += A_STEP;
        if (p5.keyIsDown(65)) ax -= A_STEP; // A
        if (p5.keyIsDown(68)) ax += A_STEP; // D
        if (p5.keyIsDown(87)) ay -= A_STEP; // W
        if (p5.keyIsDown(83)) ay += A_STEP; // S
      }
    }

    if (gravityOn) ay += 100;

    const mult = w.boostLeft > 0 ? BOOST_MULT : 1;
    w.ax = clamp(ax * mult, -A_MAX * mult, A_MAX * mult);
    w.ay = clamp(ay * mult, -A_MAX * mult, A_MAX * mult);

    if (running && (!gameOn || w.tLeft > 0)) {
      w.vx += w.ax * dt; w.vy += w.ay * dt;
      const v = Math.hypot(w.vx, w.vy);
      if (v > V_MAX) { const s = V_MAX / v; w.vx *= s; w.vy *= s; }
      w.x += w.vx * dt; w.y += w.vy * dt;

      if (gameOn) {
        const before = w.tLeft;
        w.tLeft = Math.max(0, w.tLeft - dt);
        if (before > 0 && w.tLeft === 0) {
          setEnded(true);
          setFinalScore(score);
          setRunning(false);
        }
      }
    } else {
      const drag = Math.exp(-2 * dt);
      w.vx *= drag; w.vy *= drag;
      w.x += w.vx * dt; w.y += w.vy * dt;
    }

    const halfW = w.W * 0.5 - PLAYER_R, halfH = w.H * 0.5 - PLAYER_R;
    if (w.x < -halfW) { w.x = -halfW; w.vx *= -0.6; }
    if (w.x >  halfW) { w.x =  halfW; w.vx *= -0.6; }
    if (w.y < -halfH) { w.y = -halfH; w.vy *= -0.6; }
    if (w.y >  halfH) { w.y =  halfH; w.vy *= -0.6; }

    if (gameOn && running && w.tLeft > 0) {
      for (let i = 0; i < w.spawns.length; i++) {
        const s = w.spawns[i];
        if (Math.hypot(w.x - s.x, w.y - s.y) <= (PLAYER_R + s.r)) {
          if (s.type === "goal") {
            setScore(sc => sc + s.points);
            if (s.golden) setGoldenHits(n => n + 1); else setNormalHits(n => n + 1);
          } else if (s.type === "boost") {
            w.boostLeft = BOOST_DURATION;
          } else if (s.type === "clock") {
            w.tLeft += CLOCK_BONUS;
          }
          w.spawns[i] = makeSpawn(w);
        }
      }
    }
  };

  const draw = (p5) => {
    const w = worldRef.current;
    const now = p5.millis();
    let dt = Math.min((now - w.lastMs) / 1000, 0.04);
    w.lastMs = now;

    p5.background(COLORS.bg);
    const CX = p5.width / 2, CY = p5.height / 2;

    drawGrid(p5, CX, CY);
    stepPhysics(p5, dt);

    if (gameOn) drawSpawns(p5, CX, CY, w.spawns);

    if (w.boostLeft > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(p5.millis() * 0.01);
      const glowR = PLAYER_R * (2.5 + pulse);
      p5.noStroke();
      p5.fill(249, 115, 22, 100);
      p5.circle(CX + w.x, CY + w.y, glowR * 2);
    }

    p5.fill("#2f3747"); p5.stroke("#cbd5e1"); p5.strokeWeight(1.5);
    p5.circle(CX + w.x, CY + w.y, PLAYER_R * 2);

    const px = CX + w.x, py = CY + w.y;
    drawArrow(p5, px, py, w.vx, w.vy, COLORS.v, "v");
    drawArrow(p5, px, py, w.ax, w.ay, COLORS.a, "a");

    // ======= HUD (top-left) — only time & score =======
    p5.noStroke(); p5.fill(COLORS.text); p5.textAlign(p5.LEFT, p5.TOP);
    let y = 10;
    if (gameOn) {
      p5.text(`time: ${w.tLeft.toFixed(2)} s`, 10, y); y += 18;
    }
    p5.text(`score: ${score}`, 10, y);

    // border
    p5.noFill(); p5.stroke("#505a66"); p5.strokeWeight(2);
    p5.rect(1, 1, p5.width - 2, p5.height - 2);
  };

  const keyPressed = (p5) => {
    if (p5.key.toLowerCase() === "r") resetGame(p5);
  };

  // toggle seeds/clear spawns on mode switch
  useEffect(() => {
    const w = worldRef.current;
    if (gameOn) {
      w.tLeft = GAME_TIME;
      w.boostLeft = 0;
      seedSpawns(w);
      setScore(0); setGoldenHits(0); setNormalHits(0);
      setEnded(false);
      setFinalScore(null);
      setPendingSubmitted(false);
    } else {
      w.spawns = [];
    }
  }, [gameOn]);

  // For 2D, higher score is better.
  const qualifies = finalScore != null && (
    cloudScores.length < 10 ||
    finalScore > Math.min(...cloudScores.map(s => Number(s.score || 0)))
  );
  const alreadyListed =
    finalScore != null &&
    cloudScores.some(s =>
      Number(s.score) === Number(finalScore) &&
      (String(s.name || "").trim() === String(playerName || "anon").trim())
    );

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button className="btn" onClick={() => setRunning(true)} disabled={running}>
          {running ? "Running…" : "Start (Space)"}
        </button>
        <button className="btn btn-secondary" onClick={() => resetGame({ millis: () => performance.now() })}>
          Reset (R)
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext }}>
          <input
            type="checkbox"
            checked={gameOn}
            onChange={(e) => { setGameOn(e.target.checked); setRunning(false); }}
          />
          game mode
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext }}>
          <input type="checkbox" checked={gravityOn} onChange={(e) => setGravityOn(e.target.checked)} />
          gravity
        </label>
        {gameOn && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <button
              className={`lb-toggle ${showLB ? "hide" : ""}`}
              onClick={() => setShowLB((s) => !s)}
            >
              {showLB ? "Hide" : "Show"} leaderboard
            </button>
          </label>
        )}
      </div>

      <div
        className="canvas"
        style={{
          maxWidth: 900,
          marginInline: "auto",
          background: COLORS.panel,
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: 14,
          padding: 12,
        }}
        onMouseDown={() => { mouseActiveRef.current = true; }}
        onMouseUp={() => { mouseActiveRef.current = false; }}
        onMouseLeave={() => { mouseActiveRef.current = false; }}
      >
        <Sketch setup={setup} draw={draw} keyPressed={keyPressed} />
      </div>

      {gameOn && ended && (
        <div style={{ marginTop: 10, textAlign: "center" }}>
          {!submitted ? (
            <div style={{ marginBottom: 8 }}>
              <input
                className="input"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", marginRight: 8 }}
              />
              <button
                className="btn"
                disabled={submitting}
                onClick={() => {
                  setSubmitted(true);
                  setFinalScore(score);
                  submitScore({
                    score,
                    goldenHits,
                    normalHits,
                    timeSec: GAME_TIME,
                    mode: "GoalRush",
                  });
                }}
              >
                {submitting ? "Submitting..." : "Submit score"}
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 8, color: COLORS.subtext, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Score submitted! Thanks for playing.
            </div>
          )}
          
        </div>
      )}

      {gameOn && showLB && (
        <div style={{ marginTop: 14, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Leaderboard</h3>
          </div>

          {finalScore != null && (
            (() => {
              if (qualifies && !alreadyListed && pendingSubmitted) {
                return (
                  <div style={{ marginTop: 8, padding: 8, border: `1px dashed #0ea5a0`, borderRadius: 8, color: "#0ea5a0" }}>
                    Your new score <strong>{finalScore}</strong> is posting… it should appear here shortly.
                  </div>
                );
              }
              return null;
            })()
          )}

          {fetchingBoard ? (
            <p style={{ color: COLORS.subtext, marginTop: 8 }}>Loading…</p>
          ) : cloudScores.length === 0 ? (
            <p style={{ color: COLORS.subtext, marginTop: 8 }}>No cloud scores yet.</p>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
              {cloudScores.map((s, i) => (
                <li
                  key={`${s.name}-${s.score}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 120px 200px",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: `1px solid ${COLORS.panelBorder}`,
                  }}
                >
                  <div style={{ fontWeight: 700, color: COLORS.subtext, textAlign: "right", paddingRight: 6 }}>
                    #{i + 1}
                  </div>
                  <div style={{ fontWeight: 600 }}>{s.name || "Player"}</div>
                  <div>{Number(s.score).toFixed(0)} pts</div>
                  <div style={{ color: COLORS.subtext }}>
                    ⭐ {s.goldenHits ?? 0} · ✓ {s.normalHits ?? 0} · {s.date ? new Date(s.date).toLocaleDateString() : ""}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {gameOn && (
        <p style={{ textAlign: "center", marginTop: 6, fontSize: 14, color: COLORS.subtext }}>
          Reach as many zones as you can in {GAME_TIME}s. Golden zones are worth {GOLDEN_VALUE} points. Collect 🔥 for a temporary boost and ⏱️ to add time.
        </p>
      )}
    </div>
  );
}
