// components/Footer.tsx
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: "40px",
        padding: "24px 32px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        color: "#94a3b8",
        fontSize: "14px",
      }}
    >
      {/* LEFT SIDE — LOGO + BRAND NAME */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <Image
          src="/Q5_black_bg2.png"
          width={60}     // bigger logo
          height={60}
          alt="Quantum5ocial logo"
          style={{ borderRadius: "8px" }}
        />

        <div
          style={{
            fontSize: "20px", // bigger brand text
            fontWeight: 600,
            background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Quantum5ocial
        </div>
      </div>

      {/* RIGHT SIDE — COPYRIGHT */}
      <div style={{ textAlign: "right" }}>
        Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
        <Link href="mailto:info@quantum5ocial.com">
          <span style={{ color: "#3bc7f3" }}>Contact</span>
        </Link>
      </div>
    </footer>
  );
}
