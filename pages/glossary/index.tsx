// pages/glossary/index.tsx
import { useMemo, useState } from "react";
import Link from "next/link";

type GlossaryTerm = {
  name: string;
  slug: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
};

const TERMS: GlossaryTerm[] = [
  { name: "Algorithm", slug: "algorithm", category: "Software & Algorithms", level: "Beginner" },
  { name: "Ancilla Qubit", slug: "ancilla-qubit", category: "Error Correction", level: "Intermediate" },
  { name: "Bell State", slug: "bell-state", category: "Fundamentals", level: "Beginner" },
  { name: "Bloch Sphere", slug: "bloch-sphere", category: "Fundamentals", level: "Beginner" },
  { name: "Coherence", slug: "coherence", category: "Fundamentals", level: "Beginner" },
  { name: "Controlled-NOT Gate", slug: "controlled-not-gate", category: "Gates & Circuits", level: "Beginner" },
  { name: "Decoherence", slug: "decoherence", category: "Fundamentals", level: "Beginner" },
  { name: "Dilution Refrigerator", slug: "dilution-refrigerator", category: "Hardware", level: "Intermediate" },
  { name: "Entanglement", slug: "entanglement", category: "Fundamentals", level: "Beginner" },
  { name: "Fault-Tolerant Quantum Computing", slug: "fault-tolerant-quantum-computing", category: "Error Correction", level: "Intermediate" },
  { name: "Gate Fidelity", slug: "gate-fidelity", category: "Gates & Circuits", level: "Intermediate" },
  { name: "Hadamard Gate", slug: "hadamard-gate", category: "Gates & Circuits", level: "Beginner" },
  { name: "Logical Qubit", slug: "logical-qubit", category: "Error Correction", level: "Intermediate" },
  { name: "NISQ", slug: "nisq", category: "Industry & Ecosystem", level: "Beginner" },
  { name: "Pauli-X Gate", slug: "pauli-x-gate", category: "Gates & Circuits", level: "Beginner" },
  { name: "Quantum Advantage", slug: "quantum-advantage", category: "Industry & Ecosystem", level: "Beginner" },
  { name: "Quantum Circuit", slug: "quantum-circuit", category: "Gates & Circuits", level: "Beginner" },
  { name: "Quantum Error Correction", slug: "quantum-error-correction", category: "Error Correction", level: "Intermediate" },
  { name: "Quantum Fourier Transform", slug: "quantum-fourier-transform", category: "Software & Algorithms", level: "Intermediate" },
  { name: "Quantum Key Distribution", slug: "quantum-key-distribution", category: "Communication & Networking", level: "Intermediate" },
  { name: "Qubit", slug: "qubit", category: "Fundamentals", level: "Beginner" },
  { name: "Readout Resonator", slug: "readout-resonator", category: "Hardware", level: "Intermediate" },
  { name: "Shor's Algorithm", slug: "shors-algorithm", category: "Software & Algorithms", level: "Intermediate" },
  { name: "Superconducting Qubit", slug: "superconducting-qubit", category: "Hardware", level: "Beginner" },
  { name: "Superposition", slug: "superposition", category: "Fundamentals", level: "Beginner" },
  { name: "Surface Code", slug: "surface-code", category: "Error Correction", level: "Advanced" },
  { name: "T1 Relaxation Time", slug: "t1-relaxation-time", category: "Fundamentals", level: "Intermediate" },
  { name: "Transmon Qubit", slug: "transmon-qubit", category: "Hardware", level: "Intermediate" },
  { name: "Variational Quantum Eigensolver", slug: "variational-quantum-eigensolver", category: "Software & Algorithms", level: "Intermediate" },
  { name: "Wave Function", slug: "wave-function", category: "Fundamentals", level: "Beginner" },
];

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryIndexPage() {
  const [search, setSearch] = useState("");

  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return TERMS;

    return TERMS.filter((term) => {
      return (
        term.name.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.level.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};

    for (const letter of ALL_LETTERS) groups[letter] = [];

    for (const term of filteredTerms) {
      const first = term.name.charAt(0).toUpperCase();
      if (groups[first]) groups[first].push(term);
    }

    for (const letter of ALL_LETTERS) {
      groups[letter] = groups[letter].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [filteredTerms]);

  const availableLetters = useMemo(() => {
    return new Set(
      ALL_LETTERS.filter((letter) => (groupedTerms[letter] || []).length > 0)
    );
  }, [groupedTerms]);

  const visibleCount = filteredTerms.length;

  return (
    <section className="section">
      {/* HEADER */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 16,
          background:
            "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.18), rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="section-title">Quantum Glossary</div>
            <div className="section-sub" style={{ maxWidth: 760 }}>
              Explore core concepts across quantum computing, hardware, algorithms,
              error correction, communication, and the wider ecosystem.
            </div>
          </div>

          <Link
            href="/glossary/contribute"
            style={{
              textDecoration: "none",
              color: "white",
              padding: "11px 16px",
              borderRadius: 14,
              border: "1px solid rgba(34,211,238,0.45)",
              background:
                "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
              fontSize: 13,
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ✍️ Contribute a term →
          </Link>
        </div>
      </div>

      {/* SEARCH + LETTERS */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
          border: "1px solid rgba(148,163,184,0.22)",
          background: "rgba(15,23,42,0.92)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quantum terms..."
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.72)",
              color: "white",
              padding: "12px 14px",
              fontSize: 14,
            }}
          />

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {visibleCount} terms
          </div>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALL_LETTERS.map((letter) => {
            const active = availableLetters.has(letter);
            return (
              <a
                key={letter}
                href={`#letter-${letter}`}
                style={{
                  minWidth: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  border: active
                    ? "1px solid rgba(168,85,247,0.38)"
                    : "1px solid rgba(148,163,184,0.12)",
                  background: active
                    ? "rgba(168,85,247,0.12)"
                    : "rgba(255,255,255,0.02)",
                  color: active ? "#e9d5ff" : "rgba(148,163,184,0.4)",
                  fontWeight: 700,
                  pointerEvents: active ? "auto" : "none",
                }}
              >
                {letter}
              </a>
            );
          })}
        </div>
      </div>

      {/* TERMS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ALL_LETTERS.map((letter) => {
          const items = groupedTerms[letter];
          if (!items.length) return null;

          return (
            <div key={letter} id={`letter-${letter}`} className="card" style={{ padding: 18 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#c084fc" }}>
                {letter}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {items.map((term) => (
                  <Link key={term.slug} href={`/glossary/${term.slug}`}>
                    <div className="card" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 700 }}>{term.name}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        <MetaPill text={term.category} />
                        <MetaPill text={term.level} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 11,
        background: "rgba(255,255,255,0.05)",
      }}
    >
      {text}
    </span>
  );
}

(GlossaryIndexPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
