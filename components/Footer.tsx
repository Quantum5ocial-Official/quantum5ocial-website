export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        padding: "20px 32px",
        marginTop: "80px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Logo + Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src="/q5-logo.png"
          alt="Quantum5ocial"
          style={{ width: 32, height: 32 }}
        />

        <span
          style={{
            fontSize: 20,
            fontWeight: 600,
            background: "linear-gradient(90deg,#22d3ee,#818cf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Quantum5ocial
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          marginLeft: 42,
        }}
      >
        Socializing the quantum world
      </div>

      {/* Copyright */}
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
        <a
          href="mailto:info@quantum5ocial.com"
          style={{ color: "#22d3ee" }}
        >
          Contact
        </a>
      </div>
    </footer>
  );
}
