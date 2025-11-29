// components/Footer.tsx

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        paddingTop: 40,
        paddingBottom: 30,
        marginTop: 40,
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* BRAND SECTION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: 0.9,
          marginBottom: 25,
        }}
      >
        <Image
          src="/Q5_black_bg2.png"
          alt="Quantum5ocial logo"
          width={30}
          height={30}
          style={{ borderRadius: 6 }}
        />

        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            background:
              "linear-gradient(90deg, #22d3ee 0%, #818cfe 60%, #a855f7 100%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Quantum5ocial
        </div>
      </div>

      {/* COPYRIGHT + CONTACT */}
      <div
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 14,
        }}
      >
        Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
        <Link
          href="mailto:info@quantum5ocial.com"
          style={{ color: "#22d3ee" }}
        >
          Contact
        </Link>
      </div>
    </footer>
  );
}
