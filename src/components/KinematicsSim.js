import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * components/KinematicsSim.jsx
 *
 * 1D kinematics sandbox — single game mode:
 *   STOP-IN-ZONES CHALLENGE (with local + cloud leaderboard)
 *
 * Controls: ←/→ accelerate, Space pause, R restart.
 */

// ----- Styles / Colors (avoid harsh primaries) -----
const COLORS = {
  bg: "#f7f7f7",
  panel: "#ffffff",
  panelBorder: "#e5e7eb",
  text: "#1f2937",
  subtext: "#6b7280",
  accent: "#0f766e",
  accentSoft: "#65a30d",
  cart: "#475569",
  track: "#e5e7eb",
  grid: "#e5e7eb",
  x: "#0ea5a0",
  v: "#9061f9",
  a: "#dc8850",
  zoneFill: "rgba(148,163,184,0.25)",
  zoneBorder: "#94a3b8",
  success: "#16a34a",
  danger: "#b45309",
};

// ----- Simulation constants -----
const DEFAULTS = {
  A_MAX: 4,
  SCALE: 80,
  HISTORY_SECONDS: 12,
  WORLD_HALF_WIDTH_M: 6,
  START_ZONE_HALF: 1.2,
  MIN_ZONE_HALF: 0.25,
  SHRINK_FACTOR: 0.93,
  V_THRESH: 0.35,
  HOLD_TIME: 0.5,
  ZONE_TIME_START: 10.0,
  ZONE_TIME_INCREMENT: 3.0,
  WIN_STOPS: 15,
};

const INITIAL_STATE = { x: 0, v: 0, a: 0 };

// ===== Backend config (Google Apps Script) =====
// Replace these with your deployed Apps Script URLs and shared token.
// writeUrl: Web App URL for doPost
// readUrl: Web App URL for doGet (same base if you deploy once)
const SCORE_API = {
  writeUrl: "https://script.google.com/macros/s/AKfycbxqYWYSJHCwp90JNgNspPqGuYOH6MsxSU_mWmJYXGzMGvXvOZNvUArzfCVqcU3blsr0Ig/exec",
  readUrl:  "https://script.google.com/macros/s/AKfycbxqYWYSJHCwp90JNgNspPqGuYOH6MsxSU_mWmJYXGzMGvXvOZNvUArzfCVqcU3blsr0Ig/exec", // doGet handler
  token: "tomnook",
};



async function submitScoreToSheet({ name, timeSec, stops }) {
  try {
    const payload = {
      token: SCORE_API.token,          // must match SECRET in Code.gs
      name: name || "Player",
      time_sec: timeSec,
      stops,
    };

    // text/plain keeps it a simple request (no preflight), body is JSON
    const resp = await fetch(SCORE_API.writeUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    console.log("POST response:", text);

    let j;
    try { j = JSON.parse(text); }
    catch { j = { ok: false, error: "Non-JSON response", text }; }

    return !!j.ok;
  } catch (err) {
    console.warn("Score submit network error", err);
    return false;
  }
}


async function fetchTopScores(limit = 10) {
  try {
    const url = new URL(SCORE_API.readUrl);
    url.searchParams.set("limit", String(limit));
    // Optional: simple read token (same SECRET) to avoid random scraping
    url.searchParams.set("token", SCORE_API.token);
    const resp = await fetch(url.toString());
    const j = await resp.json();
    if (j && Array.isArray(j.scores)) return j.scores; // [{name,time_sec,date}]
    return [];
  } catch {
    return [];
  }
}


// ----- Local fallback (kept for continuity, but not shown by default) -----
const LS_KEY = "pnook_kinematics_leaderboard_v1";
function loadLB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}
function saveLB(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}
function recordScore(name, timeSec) {
  const now = new Date().toISOString();
  const next = [...loadLB(), { name: name?.trim() || "Player", timeSec, date: now }]
    .sort((a, b) => a.timeSec - b.timeSec)
    .slice(0, 10);
  saveLB(next);
  return next;
}

function useAnimationFrame(callback, isRunning) {
  const requestRef = useRef(null);
  const previousTimeRef = useRef(undefined);

  const loop = useCallback(
    (time) => {
      if (previousTimeRef.current !== undefined) {
        const dt = (time - previousTimeRef.current) / 1000;
        callback(Math.min(dt, 0.05));
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(loop);
    },
    [callback]
  );

  useEffect(() => {
    if (!isRunning) return;
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, loop]);
}

function niceNumber(n, sig = 2) {
  return Number.parseFloat(n.toFixed(sig));
}

// component: KinematicsSim (cloud leaderboard enabled)
export default function KinematicsSim() {
  const submittedRef = useRef(false);
  // identify a single run attempt (optional but handy if you later want server upserts)
  const runIdRef = useRef(null);
  const [state, setState] = useState(INITIAL_STATE);
  const [paused, setPaused] = useState(false);
  const [A_MAX, setAMax] = useState(DEFAULTS.A_MAX);
  const [scale] = useState(DEFAULTS.SCALE);
  const [wrapWorld, setWrapWorld] = useState(true);
  const [plotTick, setPlotTick] = useState(0);

  // Game state
  const [gameOn, setGameOn] = useState(false);
  const [zoneCenter, setZoneCenter] = useState(2);
  const [zoneHalfWidth, setZoneHalfWidth] = useState(DEFAULTS.START_ZONE_HALF);
  const [dwell, setDwell] = useState(0);
  const [stops, setStops] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const gameStartAbs = useRef(performance.now() / 1000);
  const zoneDeadlineAbs = useRef(performance.now() / 1000);

  // Leaderboard UI
  const [cloudScores, setCloudScores] = useState([]); // fetched from Sheet
  const [leaderboard, setLeaderboard] = useState(() => loadLB()); // local fallback (hidden by default)
  const [showLB, setShowLB] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [finalTime, setFinalTime] = useState(null);
  const [pendingSubmitted, setPendingSubmitted] = useState(false);

  // fetch cloud scores on mount
  useEffect(() => {
    (async () => {
      const arr = await fetchTopScores(10);
      setCloudScores(arr);
    })();
  }, []);

  const worldWidthM = DEFAULTS.WORLD_HALF_WIDTH_M * 2;

  const keys = useRef({ left: false, right: false });
  const history = useRef([]);
  const t0 = useRef(performance.now() / 1000);

  const pauseAbsRef = useRef(null);
  const wasPausedRef = useRef(false);
  useEffect(() => {
    const now = performance.now() / 1000;
    if (paused && !wasPausedRef.current) {
      pauseAbsRef.current = now;
    } else if (!paused && wasPausedRef.current) {
      const delta = now - (pauseAbsRef.current ?? now);
      t0.current += delta;
      zoneDeadlineAbs.current += delta;
      gameStartAbs.current += delta;
      pauseAbsRef.current = null;
    }
    wasPausedRef.current = paused;
  }, [paused]);

  const canvasRef = useRef(null);

  // Keyboard
  useEffect(() => {
    function onKeyDown(e) {
      if (document.activeElement && document.activeElement.tagName === "INPUT") return;
      if (e.repeat) return;
      if (e.key === "ArrowLeft") { keys.current.left = true; }
      if (e.key === "ArrowRight") { keys.current.right = true; }
      if (e.code === "Space") { e.preventDefault(); setPaused((p) => !p); }
      if (e.key.toLowerCase() === "r") { restart(); }
    }
    function onKeyUp(e) {
      if (e.key === "ArrowLeft") { keys.current.left = false; }
      if (e.key === "ArrowRight") { keys.current.right = false; }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      if (touchX < canvas.clientWidth / 2) {
        keys.current.left = true; keys.current.right = false;
      } else {
        keys.current.right = true; keys.current.left = false;
      }
    };
    const onTouchEnd = (e) => { e.preventDefault(); keys.current.left = false; keys.current.right = false; };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const restart = useCallback(() => {
    submittedRef.current = false;
    runIdRef.current = (crypto?.randomUUID?.() || String(Date.now()));
    setState({ ...INITIAL_STATE });
    history.current = [];
    t0.current = performance.now() / 1000;
    gameStartAbs.current = performance.now() / 1000;
    setStops(0);
    zoneDeadlineAbs.current = gameStartAbs.current + DEFAULTS.ZONE_TIME_START;
    setDwell(0);
    setZoneCenter(2);
    setZoneHalfWidth(DEFAULTS.START_ZONE_HALF);
    setGameOver(false);
    setWin(false);
    setPaused(false);
    setPlotTick((k) => k + 1);
  }, []);

  const newZone = useCallback(() => {
    const half = DEFAULTS.WORLD_HALF_WIDTH_M;
    let z = 0;
    for (let i = 0; i < 20; i++) {
      z = (Math.random() * 2 - 1) * (half - 0.5);
      const dx = wrapDelta(z, state.x, half);
      if (Math.abs(dx) > 1.2) break;
    }
    setZoneCenter(z);
    setDwell(0);
    zoneDeadlineAbs.current += DEFAULTS.ZONE_TIME_INCREMENT;
  }, [state.x]);

  // Integrate motion + game logic
  useAnimationFrame(
    (dt) => {
      if (paused || gameOver) return;

      const inputA = keys.current.right === keys.current.left ? 0 : (keys.current.right ? +A_MAX : -A_MAX);

      setState((s) => {
        const a = inputA;
        let v = s.v + a * dt;
        let x = s.x + v * dt;

        if (wrapWorld) {
          const half = DEFAULTS.WORLD_HALF_WIDTH_M;
          if (x < -half) x += worldWidthM;
          if (x > half) x -= worldWidthM;
        }

        const t = performance.now() / 1000 - t0.current;
        history.current.push({ t, x, v, a });
        const cutoff = t - DEFAULTS.HISTORY_SECONDS - 0.25;
        while (history.current.length && history.current[0].t < cutoff) history.current.shift();

        if (gameOn) {
          const half = DEFAULTS.WORLD_HALF_WIDTH_M;
          const dx = Math.abs(wrapDelta(x, zoneCenter, half));
          const inside = dx <= zoneHalfWidth;
          const slow = Math.abs(v) <= DEFAULTS.V_THRESH;
          if (inside && slow) setDwell((d) => d + dt); else setDwell(0);

          if (inside && slow && dwell + dt >= DEFAULTS.HOLD_TIME) {
            const nextStops = stops + 1;
            setStops(nextStops);
            setZoneHalfWidth((w) => Math.max(DEFAULTS.MIN_ZONE_HALF, w * DEFAULTS.SHRINK_FACTOR));
            newZone();
            if (nextStops >= DEFAULTS.WIN_STOPS) {
              const total = performance.now() / 1000 - gameStartAbs.current;
              setFinalTime(total);
              setGameOver(true);
              setWin(true);
              setNameModalOpen(true);
              setPendingSubmitted(false); // we haven't submitted yet
            }
          }

          if (performance.now() / 1000 > zoneDeadlineAbs.current) {
            setGameOver(true);
            setWin(false);
          }
        }

        setPlotTick((k) => k + 1);
        return { x, v, a };
      });
    },
    true
  );

  // Draw animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(0, 0, cssW, cssH);

    const midY = Math.round(cssH * 0.65);
    ctx.strokeStyle = COLORS.track;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, midY);
    ctx.lineTo(cssW - 16, midY);
    ctx.stroke();

    const pxPerMeter = scale;
    let originX = Math.round(cssW / 2);
    if (!wrapWorld) originX -= state.x * pxPerMeter;

    // meter ticks
    ctx.strokeStyle = COLORS.grid;
    const viewMinM = -(originX / pxPerMeter);
    const viewMaxM = (cssW - originX) / pxPerMeter;
    for (let m = Math.floor(viewMinM); m <= Math.ceil(viewMaxM); m += 1) {
      const xPx = originX + m * pxPerMeter;
      ctx.beginPath();
      ctx.moveTo(xPx, midY - 12);
      ctx.lineTo(xPx, midY + 12);
      ctx.stroke();
    }

    if (gameOn) drawZone(ctx, zoneCenter, zoneHalfWidth, originX, pxPerMeter, midY, cssW);

    const cartX = originX + state.x * pxPerMeter;
    const cartY = midY - 18;
    const cartW = 44, cartH = 24;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.beginPath();
    ctx.ellipse(cartX, midY + 8, cartW * 0.55, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = COLORS.cart;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    roundRect(ctx, cartX - cartW / 2, cartY - cartH / 2, cartW, cartH, 8);
    ctx.fill();
    ctx.stroke();

    // vectors
    const posY = midY + 28;
    drawArrow(ctx, originX, posY, originX + state.x * pxPerMeter, posY, COLORS.x);
    const vPx = Math.max(-300, Math.min(300, state.v * 10));
    drawArrow(ctx, cartX, cartY - cartH * 0.9, cartX + vPx, cartY - cartH * 0.9, COLORS.v);
    const aPx = Math.max(-100, Math.min(100, state.a * 10));
    drawArrow(ctx, cartX, cartY - cartH * 1.65, cartX + aPx, cartY - cartH * 1.65, COLORS.a);

    // labels
    ctx.fillStyle = COLORS.subtext;
    ctx.font = "500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("position", originX - 30, posY - 5);
    ctx.fillText("velocity", cartX - 24, cartY - cartH * 0.9 - 8);
    ctx.fillText("acceleration", cartX - 32, cartY - cartH * 1.55 - 8);
  }, [state, scale, zoneCenter, zoneHalfWidth, gameOn, wrapWorld]);

  // Derived readouts
  const readouts = useMemo(() => ({ x: niceNumber(state.x), v: niceNumber(state.v), a: niceNumber(state.a) }), [state]);
  const autoScale = !gameOn && !wrapWorld;

  // Handlers for leaderboard modal
const submitScore = useCallback(() => {
  if (finalTime == null) {
    setNameModalOpen(false);
    return;
  }
  if (submittedRef.current) {
    setNameModalOpen(false);
    return;
  }
  submittedRef.current = true;

  // Local leaderboard update (instant)
  const updated = recordScore(playerName, finalTime);
  setLeaderboard(updated);

  const nameToSend = (playerName || "Player").trim();

  // ✅ Close modal immediately & show LB with "posting…" banner
  setNameModalOpen(false);
  setShowLB(true);
  setPendingSubmitted(true);

  // Fire-and-forget network submit; refresh cloud scores when it returns
  submitScoreToSheet({
    name: nameToSend,
    timeSec: finalTime,
    stops: DEFAULTS.WIN_STOPS,
    runId: runIdRef.current,
  })
    .then(async () => {
      try {
        const scores = await fetchTopScores(10);
        setCloudScores(scores);
      } catch (e) {
        console.warn("Refresh cloud scores failed", e);
      }
    })
    .catch((err) => {
      console.warn("Submit failed", err);
      // (optional) you could show a small toast here indicating the cloud submit failed
    });
}, [playerName, finalTime]);



  const clearLB = useCallback(() => {
    saveLB([]);
    setLeaderboard([]);
  }, []);

  return (
    <div style={{
      background: COLORS.bg,
      color: COLORS.text,
      border: `1px solid ${COLORS.panelBorder}`,
      borderRadius: 16,
      padding: 16,
    }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setPaused((p) => !p)} style={btnStyle}>{paused ? "Resume" : "Pause"}</button>
        <button onClick={restart} style={{ ...btnStyle, background: "#e5e7eb", color: COLORS.text }}>Restart (R)</button>

        <LabeledSlider label={`a: ${A_MAX.toFixed(1)} m/s²`} min={0} max={10} step={0.1} value={A_MAX} onChange={setAMax} />

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext }}>
          <input
            type="checkbox"
            checked={gameOn}
            onChange={(e) => {
              const v = e.target.checked;
              setGameOn(v);
              if (v) { setWrapWorld(true); restart(); } else { setGameOver(false); setWin(false); setDwell(0); }
            }}
          />
          game mode
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.subtext, marginLeft: "auto" }}>
          <input type="checkbox" checked={wrapWorld} onChange={(e) => setWrapWorld(e.target.checked)} disabled={gameOn} />
          wrap world
        </label>

        <button onClick={() => setShowLB((s) => !s)} style={{ ...btnStyle, background: "#e5e7eb", color: COLORS.text }}>{showLB ? "Hide" : "Show"} leaderboard</button>
      </div>

      {/* HUD */}
      {gameOn && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 12, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: "10px 12px" }}>
          <div><strong>stops</strong>: {stops} / {DEFAULTS.WIN_STOPS}</div>
          <div>| <strong>time left</strong>: {Math.max(0, zoneDeadlineAbs.current - performance.now() / 1000).toFixed(2)} s</div>
          <div style={{ marginLeft: "auto", color: COLORS.subtext }}>total time: {(performance.now() / 1000 - gameStartAbs.current).toFixed(2)} s</div>
        </div>
      )}

      {/* Game over banner */}
      {gameOn && gameOver && (
        <div style={{ background: win ? "rgba(22,163,74,0.12)" : "rgba(180,83,9,0.12)", border: `1px solid ${win ? COLORS.success : COLORS.danger}`, color: win ? COLORS.success : COLORS.danger, borderRadius: 12, padding: 12, marginBottom: 12, fontWeight: 700, textAlign: "center" }}>
          {win ? `You won! 15 stops in ${(performance.now() / 1000 - gameStartAbs.current).toFixed(1)} s` : "Time's up! Press R to try again."}
        </div>
      )}

      {/* Readouts */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat label="x (m)" value={readouts.x} />
        <Stat label="v (m/s)" value={readouts.v} />
        <Stat label="a (m/s²)" value={readouts.a} />
      </div>

      {/* Animation */}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 14, padding: 12 }}>
        <div style={{ height: 200, position: "relative" }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
      </div>

      {/* Traces */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
        <MiniPlot historyRef={history} color={COLORS.x} label="x(t) [m]" heightPx={140} yMin={autoScale ? null : -DEFAULTS.WORLD_HALF_WIDTH_M} yMax={autoScale ? null : DEFAULTS.WORLD_HALF_WIDTH_M} tick={plotTick} />
        <MiniPlot historyRef={history} color={COLORS.v} label="v(t) [m/s]" heightPx={140} yMin={autoScale ? null : 3 * -A_MAX} yMax={autoScale ? null : 3 * A_MAX} tick={plotTick} />
        <MiniPlot historyRef={history} color={COLORS.a} label="a(t) [m/s²]" tick={plotTick} />
      </div>

      {/* Leaderboard Panel */}
      {showLB && (
        <div style={{ marginTop: 14, background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Leaderboard</h3>
          </div>

          {/* Pending local victory: show a temporary banner IF it would place on board */}
          {finalTime != null && !nameModalOpen && (
            (() => {
              const qualifies = cloudScores.length < 10 || finalTime < Math.max(...cloudScores.map(s => s.time_sec));
              const alreadyListed = cloudScores.some(s => Math.abs(s.time_sec - finalTime) < 1e-6 && (s.name || "").trim() === (playerName || "Player").trim());
              if (qualifies && !alreadyListed && pendingSubmitted) {
                return (
                  <div style={{ marginTop: 8, padding: 8, border: `1px dashed ${COLORS.accent}`, borderRadius: 8, color: COLORS.accent }}>
                    Your new score <strong>{finalTime.toFixed(2)} s</strong> is posting… it should appear here shortly.
                  </div>
                );
              }
              return null;
            })()
          )}

          {cloudScores.length === 0 ? (
            <p style={{ color: COLORS.subtext, marginTop: 8 }}>No cloud scores yet.</p>
          ) : (
            <ol style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
              {cloudScores.map((s, i) => (
                <li key={`${s.name}-${s.time_sec}-${i}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 200px", gap: 8, padding: "6px 0", borderBottom: `1px solid ${COLORS.panelBorder}` }}>
                  <div style={{ fontWeight: 700, color: COLORS.subtext, textAlign: "right", paddingRight: 6 }}>#{i + 1}</div>
                  <div style={{ fontWeight: 600 }}>{s.name || 'Player'}</div>
                  <div>{Number(s.time_sec).toFixed(2)} s</div>
            
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Name Entry Modal */}
      {nameModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 14, padding: 16, minWidth: 320 }}>
            <h3 style={{ marginTop: 0 }}>Great run! Add your name</h3>
            <p style={{ marginTop: 4, color: COLORS.subtext }}>15 stops in <strong>{finalTime?.toFixed(2)} s</strong></p>
            <input
              type="text"
              placeholder="Display name or initials (not full name)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={24}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.panelBorder}`, marginTop: 6 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => setNameModalOpen(false)} style={{ ...btnStyle, background: "#e5e7eb", color: COLORS.text }}>Skip</button>
              <button onClick={submitScore} style={btnStyle}>Save score</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- UI bits ----
const btnStyle = {
  background: COLORS.accent,
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "8px 12px",
  fontWeight: 600,
  cursor: "pointer",
};

function Stat({ label, value }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: "10px 12px", minWidth: 120 }}>
      <div style={{ fontSize: 12, color: COLORS.subtext }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function LabeledSlider({ label, min, max, step, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: COLORS.subtext, minWidth: 110 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ accentColor: COLORS.accent }} />
    </div>
  );
}

// ---- Plot component ----
function MiniPlot({ historyRef, color, label, tick, heightPx = 90, yMin = null, yMax = null }) {
  const svgRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = svgRef.current ? svgRef.current.parentElement : null;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const padding = { l: 40, r: 10, t: 10, b: 24 };

  const { pathD, zeroY } = useMemo(() => {
    const data = historyRef.current;
    if (!data.length || width === 0) return { pathD: "", zeroY: null };
    const tMin = Math.max(0, data[data.length - 1].t - DEFAULTS.HISTORY_SECONDS);
    const tMax = data[data.length - 1].t;

    let ymin = yMin, ymax = yMax;
    if (ymin == null || ymax == null) {
      ymin = Infinity; ymax = -Infinity;
      for (const d of data) {
        if (d.t < tMin) continue;
        const y = pickLabelValue(label, d);
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
      if (!isFinite(ymin) || !isFinite(ymax)) return { pathD: "", zeroY: null };
      if (ymin === ymax) { ymin -= 1; ymax += 1; }
    }

    const W = width - padding.l - padding.r;
    const H = heightPx - padding.t - padding.b;
    const mapX = (t) => padding.l + ((t - tMin) / (tMax - tMin || 1)) * W;
    const mapY = (y) => padding.t + (1 - (y - ymin) / (ymax - ymin || 1)) * H;

    let dStr = "";
    let started = false;
    for (const s of data) {
      if (s.t < tMin) continue;
      const x = mapX(s.t);
      const y = mapY(pickLabelValue(label, s));
      if (!started) { dStr += `M ${x},${y}`; started = true; }
      else { dStr += ` L ${x},${y}`; }
    }

    const zeroYLine = (ymin < 0 && ymax > 0) ? mapY(0) : null;
    return { pathD: dStr, zeroY: zeroYLine };
  }, [historyRef, label, width, tick, heightPx, yMin, yMax]);

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 12, padding: 8 }}>
      <div style={{ fontSize: 12, color: COLORS.subtext, marginBottom: 6 }}>{label}</div>
      <svg ref={svgRef} width="100%" height={heightPx}>
        <rect x={0} y={0} width={width} height={heightPx} fill={COLORS.panel} rx={10} />
        {zeroY !== null && (
          <line x1={padding.l} y1={zeroY} x2={width - padding.r} y2={zeroY} stroke={COLORS.grid} strokeWidth={1} />
        )}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      </svg>
    </div>
  );
}

// ---- helpers ----
function pickLabelValue(label, d) {
  if (label.startsWith("x(")) return d.x;
  if (label.startsWith("v(")) return d.v;
  if (label.startsWith("a(")) return d.a;
  return 0;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawArrow(ctx, x1, y1, x2, y2, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const size = 6;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * 10 - uy * size, y2 - uy * 10 + ux * size);
  ctx.lineTo(x2 - ux * 10 + uy * size, y2 - uy * 10 - ux * size);
  ctx.closePath(); ctx.fill();
}

function drawZone(ctx, centerM, halfWm, originX, pxPerMeter, midY, cssW) {
  const leftPx = originX + (centerM - halfWm) * pxPerMeter;
  const rightPx = originX + (centerM + halfWm) * pxPerMeter;
  const yTop = midY - 22; const yH = 44;
  ctx.lineWidth = 2; ctx.strokeStyle = COLORS.zoneBorder; ctx.fillStyle = COLORS.zoneFill;
  const pad = 16;
  const drawSegment = (x1, x2) => {
    const w = Math.max(0, x2 - x1); if (w <= 0) return;
    ctx.beginPath(); roundRect(ctx, x1, yTop, w, yH, 8); ctx.fill(); ctx.stroke();
  };
  if (leftPx >= pad && rightPx <= cssW - pad) { drawSegment(leftPx, rightPx); }
  else {
    if (leftPx < pad) { drawSegment(pad, Math.min(rightPx, cssW - pad)); drawSegment(Math.max(leftPx + cssW, pad), cssW - pad); }
    else if (rightPx > cssW - pad) { drawSegment(leftPx, cssW - pad); drawSegment(pad, (rightPx - cssW)); }
  }
}

function wrapDelta(x, x0, half) {
  let dx = x - x0; const C = 2 * half; if (dx > half) dx -= C; if (dx < -half) dx += C; return dx;
}
