import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "60px",
        padding: "28px 32px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px",
      }}
    >
      {/* LEFT: LOGO + BRAND NAME */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Image
          src="/Q5_white_bg.png"
          width={60}
          height={60}
          alt="Quantum5ocial logo"
          style={{ borderRadius: "4px" }}
        />

        <div
          style={{
            fontSize: "22px",
            fontWeight: 600,
            background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Quantum5ocial
        </div>
      </div>

      {/* CENTER: COPYRIGHT */}
      <div
        style={{
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "14px",
          flex: 1,
        }}
      >
        © 2025 Quantum5ocial · All rights reserved
      </div>

      {/* RIGHT: SOCIAL ICONS (SVG only) */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "18px",
  }}
>
  {/* EMAIL ICON (opens new tab) */}
  <a
    href="mailto:info@quantum5ocial.com"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: "flex", alignItems: "center" }}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: "pointer" }}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
      <polyline points="3 7 12 13 21 7" />
    </svg>
  </a>

  {/* LINKEDIN ICON */}
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="#94a3b8"
    style={{ cursor: "pointer" }}
  >
    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5C1.11 6 0 4.881 0 3.5S1.11 1 2.5 1s2.48 1.119 2.48 2.5zM.5 8h4v12h-4V8zm7 0h3.8v1.7h.05c.53-.96 1.82-2 3.75-2 4 0 4.75 2.63 4.75 6v6.3h-4v-5.6c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.14 1.45-2.14 2.95V20h-4V8z" />
  </svg>

  {/* TWITTER ICON */}
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="#94a3b8"
    style={{ cursor: "pointer" }}
  >
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53A4.48 4.48 0 0 0 22.43.36a9.09 9.09 0 0 1-2.88 1.1A4.52 4.52 0 0 0 16 0c-2.53 0-4.5 2.2-4.5 4.9 0 .38.04.75.13 1.1C7.69 5.83 4.07 3.88 1.64.9A5.15 5.15 0 0 0 1 3.4c0 1.7.82 3.21 2.06 4.1A4.37 4.37 0 0 1 .96 7v.06c0 2.37 1.57 4.34 3.66 4.79a4.52 4.52 0 0 1-2.03.08c.57 1.9 2.26 3.3 4.24 3.34A9.06 9.06 0 0 1 0 19.54 12.76 12.76 0 0 0 6.92 22c8.3 0 12.9-7.4 12.9-13.8 0-.21 0-.42-.01-.63A9.88 9.88 0 0 0 23 3z" />
  </svg>
</div>
    </footer>
  );
}
