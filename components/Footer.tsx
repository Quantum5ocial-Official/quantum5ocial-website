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
      {/* FOOTER BRAND SECTION */}
<div
  style={{
    padding: "28px 0 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    opacity: 0.8,
    marginTop: 40,
  }}
>
  <img
    src="/Q5_black_bg2.png"
    alt="Quantum5ocial logo"
    style={{ width: 28, height: 28, borderRadius: 6 }}
  />

  <div
    style={{
      fontSize: 15,
      fontWeight: 600,
      background:
        "linear-gradient(90deg, #22d3ee 0%, #818cfe 70%, #a855f7 100%)",
      WebkitBackgroundClip: "text",
      color: "transparent",
    }}
  >
    Quantum5ocial
  </div>
</div>

{/* COPYRIGHT BELOW */}
<footer style={{ paddingTop: 10, paddingBottom: 30, opacity: 0.7 }}>
  Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
  <a href="mailto:info@quantum5ocial.com" style={{ color: "#22d3ee" }}>
    Contact
  </a>
</footer>
  );
}
