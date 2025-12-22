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
  const chipPad = size === "md" ? "4px 10px" : "3px 8px";
  const lineH = size === "md" ? "16px" : "14px";

  const badgeChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: chipPad,
    borderRadius: 999,
    border: "1px solid rgba(34,211,238,0.35)",
    background: "rgba(34,211,238,0.08)",
    color: "rgba(226,232,240,0.95)",
    fontSize: chipFont,
    fontWeight: 900,
    whiteSpace: "nowrap",
    lineHeight: lineH,
  };

  const badgeStatusStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: chipPad,
    borderRadius: 999,
    fontSize: chipFont,
    fontWeight: 900,
    whiteSpace: "nowrap",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2,6,23,0.35)",
    color: "rgba(226,232,240,0.92)",
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
      : "rgba(226,232,240,0.92)";

  return (
    <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      <span style={badgeChipStyle} title={label || ""}>
        {label}
      </span>

      {statusLabel && (
        <span
          style={{ ...badgeStatusStyle, border: statusBorder, color: statusColor }}
          title={statusLabel}
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
}
