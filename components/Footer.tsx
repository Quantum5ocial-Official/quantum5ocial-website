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
      }}
    >
      {/* TOP: LOGO + BRAND (unchanged) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "28px", // space above centered copyright
        }}
      >
        <Image
          src="/Q5_white_bg.png"
          width={80}     // your original size
          height={80}
          alt="Quantum5ocial logo"
          style={{ borderRadius: "2px" }}
        />

        <div
          style={{
            fontSize: "20px", // your original size
            fontWeight: 600,
            background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Quantum5ocial
        </div>
      </div>

      {/* BOTTOM: CENTERED COPYRIGHT */}
      <div
        style={{
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "14px",
          width: "100%",
        }}
      >
        © 2025 Quantum5ocial· All rights reserved·{" "}
        <Link href="mailto:info@quantum5ocial.com">
          <span style={{ color: "#3bc7f3" }}>Contact</span>
        </Link>
      </div>
    </footer>
  );
}
