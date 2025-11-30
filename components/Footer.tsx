import Link from "next/link";
import Image from "next/image";
import { FiMail } from "react-icons/fi";
import { FaLinkedin, FaTwitter } from "react-icons/fa";

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
        {/* EMAIL */}
        <Link href="mailto:info@quantum5ocial.com">
          <FiMail size={22} style={{ color: "#94a3b8", cursor: "pointer" }} />
        </Link>

        {/* LINKEDIN (placeholder for now) */}
        <div
          style={{
            cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          <FaLinkedin size={20} />
        </div>

        {/* TWITTER (placeholder) */}
        <div
          style={{
            cursor: "pointer",
            color: "#94a3b8",
          }}
        >
          <FaTwitter size={20} />
        </div>
      </div>
    </footer>
  );
}
