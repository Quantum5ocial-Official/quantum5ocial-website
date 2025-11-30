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

      {/* RIGHT: SOCIAL ICONS */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "18px",
  }}
>
  {/* EMAIL ICON */}
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

  {/* X (formerly Twitter) ICON */}
  <a
    href="#"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: "flex", alignItems: "center" }}
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="#94a3b8"
      style={{ cursor: "pointer" }}
    >
      <path d="M18.9 2H22L14.6 10.4L23.1 22H16.3L10.9 14.9L4.7 22H1.6L9.5 13.1L1.3 2H8.3L13.2 8.5L18.9 2ZM17.7 20.1H19.7L7.2 3.8H5.1L17.7 20.1Z" />
    </svg>
  </a>

  {/* GITHUB ICON */}
  <a
    href="#"
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: "flex", alignItems: "center" }}
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="#94a3b8"
      style={{ cursor: "pointer" }}
    >
      <path d="M12 0.5C5.4 0.5 0 5.9 0 12.5C0 17.8 3.4 22.3 8.2 23.9C8.8 24 9 23.6 9 23.3C9 23 9 22.2 9 21.3C5.7 22 5 19.5 5 19.5C4.5 18.2 3.7 17.9 3.7 17.9C2.6 17.2 3.8 17.2 3.8 17.2C5 17.3 5.7 18.5 5.7 18.5C6.8 20.4 8.6 19.9 9.3 19.6C9.4 18.8 9.7 18.3 10 18C7.3 17.7 4.5 16.6 4.5 12.1C4.5 10.8 5 9.8 5.7 9C5.6 8.7 5.2 7.5 5.8 5.8C5.8 5.8 6.8 5.5 9 7.1C9.9 6.9 11 6.8 12 6.8C13 6.8 14.1 6.9 15 7.1C17.2 5.5 18.2 5.8 18.2 5.8C18.8 7.5 18.4 8.7 18.3 9C19 9.8 19.5 10.8 19.5 12.1C19.5 16.6 16.7 17.7 14 18C14.4 18.4 14.8 19.2 14.8 20.4C14.8 22.1 14.8 23 14.8 23.3C14.8 23.6 15 24 15.7 23.9C20.6 22.3 24 17.8 24 12.5C24 5.9 18.6 0.5 12 0.5Z" />
    </svg>
  </a>
</div>
    </footer>
  );
}
