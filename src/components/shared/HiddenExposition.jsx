import React, { useState, useId } from "react";

/**
 * HiddenExposition
 * A consistent, reusable expander for tucking away explanatory text.
 *
 * Props:
 * - title: string shown in the header (e.g., "Why a single field viewpoint?")
 * - children: content to reveal
 */
export default function HiddenExposition({ title = "Read more", children }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const card = {
    border: "1px solid #e7e7e7",
    borderRadius: 12,
    background: "#fff",
    boxShadow: open ? "0 2px 14px rgba(0,0,0,0.06)" : "0 1px 6px rgba(0,0,0,0.04)",
    transition: "box-shadow 200ms ease, border-color 200ms ease",
    maxWidth: 820,
    margin: "12px auto",
  };

  const header = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "12px 16px",
    gap: 12,
    cursor: "pointer",
    background: open ? "linear-gradient(180deg, #fafafa, #fff)" : "#fff",
    borderRadius: 12,
    userSelect: "none",
  };

  const chevron = {
    width: 18,
    height: 18,
    flex: "0 0 18px",
    transform: `rotate(${open ? 90 : 0}deg)`,
    transition: "transform 160ms ease",
    opacity: 0.6,
  };

  const titleStyle = {
    fontWeight: 650,
    fontSize: 15,
    letterSpacing: 0.2,
  };

  const body = {
    padding: "0 16px 14px 46px",
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
        style={header}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Chevron */}
        <svg style={chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M8 5l8 7-8 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

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
