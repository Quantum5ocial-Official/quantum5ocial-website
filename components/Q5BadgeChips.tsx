// components/Q5BadgeChips.tsx
import React from "react";

export default function Q5BadgeChips({
  label,
  reviewStatus,
  size = "sm",
}: {
  label?: string | null;
  reviewStatus?: string | null; // "pending" | "approved" | "rejected" | ...
  size?: "sm" | "md";
}) {
  const hasBadge = !!(label && label.trim().length > 0);
  if (!hasBadge) return null;

  const status = (reviewStatus || "").toLowerCase();
  const statusLabel =
    status === "pending"
      ? "Pending"
      : status === "approved"
      ? "Verified"
      : status === "rejected"
      ? "Needs update"
      : null;

  const chipFont = size === "md" ? 12 : 10;
  const chipPad = size === "md" ? "4px 11px" : "3px 9px";
  const lineH = size === "md" ? "16px" : "14px";

  /* ============================
     MAIN BADGE (fancy)
     ============================ */
  const badgeChipStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    padding: chipPad,
    borderRadius: 999,

    /* Gradient border illusion */
    background:
      "linear-gradient(135deg, rgba(34,211,238,0.35), rgba(168,85,247,0.35))",

    boxShadow:
      "0 0 0 1px rgba(34,211,238,0.35), 0 0 10px rgba(34,211,238,0.35)",

    color: "rgba(226,232,240,0.98)",
    fontSize: chipFont,
    fontWeight: 900,
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
    lineHeight: lineH,
  };

  /* Inner fill so the border looks crisp */
  const badgeInnerStyle: React.CSSProperties = {
    background: "rgba(2,6,23,0.85)",
    padding: chipPad,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
  };

  /* ============================
     STATUS CHIP (secondary)
     ============================ */
  const badgeStatusStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: chipPad,
    borderRadius: 999,
    fontSize: chipFont,
    fontWeight: 800,
    whiteSpace: "nowrap",
    background: "rgba(2,6,23,0.45)",
    lineHeight: lineH,
  };

  const statusBorder =
    status === "approved"
      ? "1px solid rgba(74,222,128,0.45)"
      : status === "rejected"
      ? "1px solid rgba(248,113,113,0.45)"
      : "1px solid rgba(148,163,184,0.35)";

  const statusColor =
    status === "approved"
      ? "rgba(187,247,208,0.95)"
      : status === "rejected"
      ? "rgba(254,202,202,0.95)"
      : "rgba(226,232,240,0.9)";

  return (
    <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {/* MAIN BADGE */}
      <span style={badgeChipStyle} title={label || ""}>
        <span style={badgeInnerStyle}>{label}</span>
      </span>

      {/* STATUS */}
      {statusLabel && (
        <span
          style={{
            ...badgeStatusStyle,
            border: statusBorder,
            color: statusColor,
          }}
          title={statusLabel}
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
}
