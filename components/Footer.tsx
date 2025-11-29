import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        width: "100%",
        padding: "30px 40px",
        marginTop: "80px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Image
          src="/logo.png"
          alt="Quantum5ocial Logo"
          width={38}
          height={38}
          style={{ borderRadius: 8 }}
        />

        {/* Brand name with same gradient as navbar */}
        <span className="brand-gradient" style={{ fontSize: "20px", fontWeight: 600 }}>
          Quantum5ocial
        </span>
      </Link>
    </footer>
  );
}
