import React, { useState, useId } from "react";

/**
 * HiddenQuestion
 * Click-to-reveal card for practice problems.
 * - Left-aligned card layout (wider than HiddenExposition by default)
 * - Question-mark badge instead of chevron
 * - Keeps the original HiddenExposition card styling
 *
 * Props:
 * - title: ReactNode (question/header; supports MathJax inline nodes)
 * - children: ReactNode (answer/exposition)
 * - defaultOpen?: boolean (default false)
 * - maxWidth?: number (default 1040)
 */
export default function HiddenQuestion({
  title = "Question",
  children,
  defaultOpen = false,
  maxWidth = 1040,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  // --- Styles cloned/adapted from HiddenExposition ---
  const card = {
    border: "1px solid #e7e7e7",
    borderRadius: 12,
    background: "#fff",
    boxShadow: open ? "0 2px 14px rgba(0,0,0,0.06)" : "0 1px 6px rgba(0,0,0,0.04)",
    transition: "box-shadow 200ms ease, border-color 200ms ease",
    maxWidth,                 // wider default
    width: "100%",
    margin: "12px 0",        // left-aligned (no auto-centering)
  };

  const header = {
    display: "flex",
    alignItems: "left",
    justifyContent: "flex-start",
    width: "100%",
    padding: "12px 16px",
    gap: 12,
    cursor: "pointer",
    background: open ? "linear-gradient(180deg, #fafafa, #fff)" : "#fff",
    borderRadius: 12,
    userSelect: "none",
    textAlign: "left",
  };

  const qBadge = {
    width: 28,
    height: 28,
    flex: "0 0 28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#eef2ff",     // soft indigo
    color: "#2563eb",          // indigo-600
    fontWeight: 800,
    fontSize: 16,
  };

  const titleStyle = {
    fontWeight: 650,
    fontSize: 15,
    letterSpacing: 0.2,
    color: "#111",
    lineHeight: 1.35,
    flex: 1,
  };

  const endGlyph = {
    marginLeft: 8,
    opacity: 0.6,
    fontWeight: 700,
    fontSize: 18,
  };

  const body = {
    padding: "0 16px 14px 46px", // indent to line up with badge
    color: "#333",
    lineHeight: 1.55,
  };

  const hr = {
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent)",
    border: "none",
    margin: "6px 0 10px 46px",
  };

  return (
    <div style={card}>
      <button
        type="button"
        style={header}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(v => !v);
          }
        }}
      >
        {/* Question badge */}
        <span aria-hidden style={qBadge}>?</span>

        {/* Title (supports MathJax inline nodes) */}
        <span style={titleStyle}>{title}</span>


      </button>

      {open && (
        <>
          <hr style={hr} />
          <div id={panelId} style={body}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}
