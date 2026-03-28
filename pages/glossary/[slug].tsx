// pages/glossary/[slug].tsx
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

type GlossaryLevel = "Beginner" | "Intermediate" | "Advanced";

type GlossaryEntry = {
  name: string;
  slug: string;
  category: string;
  level: GlossaryLevel;
  oneLine: string;
  definition: string;
  whyItMatters: string;
  intuition: string;
  math?: string;
  relatedTerms: { name: string; slug: string }[];
};

const GLOSSARY_ENTRIES: Record<string, GlossaryEntry> = {
  qubit: {
    name: "Qubit",
    slug: "qubit",
    category: "Fundamentals",
    level: "Beginner",
    oneLine: "The fundamental unit of quantum information.",
    definition:
      "A qubit is the quantum analogue of a classical bit. While a classical bit can only be in one of two states, 0 or 1, a qubit can exist in a quantum state described by a superposition of the basis states |0⟩ and |1⟩ until it is measured.",
    whyItMatters:
      "Qubits are the basic building blocks of quantum computers. Quantum gates act on qubits, quantum circuits are built from qubits, and the power of quantum computation comes from how multiple qubits can be controlled, correlated, and entangled.",
    intuition:
      "A classical bit is like a switch that is either off or on. A qubit is different: it is a quantum state that can contain amplitudes for both basis states at the same time. This does not mean it is classically both values in a simple everyday sense, but rather that its state must be described using quantum mechanics.",
    math:
      "|ψ⟩ = α|0⟩ + β|1⟩\n\nwhere α and β are complex amplitudes satisfying:\n\n|α|² + |β|² = 1",
    relatedTerms: [
      { name: "Superposition", slug: "superposition" },
      { name: "Bloch Sphere", slug: "bloch-sphere" },
      { name: "Entanglement", slug: "entanglement" },
      { name: "Quantum Circuit", slug: "quantum-circuit" },
      { name: "Measurement", slug: "measurement" },
    ],
  },
};

const SECTION_ITEMS = [
  { id: "definition", label: "Definition" },
  { id: "why-it-matters", label: "Why it matters" },
  { id: "intuition", label: "Intuition" },
  { id: "math", label: "Mathematical form" },
  { id: "related-terms", label: "Related terms" },
] as const;

function MetaPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(148,163,184,0.16)",
        color: "rgba(226,232,240,0.9)",
      }}
    >
      {text}
    </span>
  );
}

function GlossarySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="card"
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.96)",
        scrollMarginTop: 24,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: "rgba(226,232,240,0.96)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(226,232,240,0.86)",
          whiteSpace: "pre-wrap",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function GlossaryRightSidebar({ entry }: { entry: GlossaryEntry }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="sidebar-card">
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 10,
            color: "rgba(226,232,240,0.96)",
          }}
        >
          On this page
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SECTION_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              style={{
                textDecoration: "none",
                color: "rgba(226,232,240,0.84)",
                fontSize: 13,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(148,163,184,0.12)",
                background: "rgba(15,23,42,0.45)",
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <div className="sidebar-card">
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 10,
            color: "rgba(226,232,240,0.96)",
          }}
        >
          Quick facts
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <MetaPill text={entry.category} />
          <MetaPill text={entry.level} />
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(226,232,240,0.75)",
          }}
        >
          This page is part of the Quantum Glossary and will later support community
          contributions, edits, and review.
        </div>
      </div>

      <div className="sidebar-card">
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 10,
            color: "rgba(226,232,240,0.96)",
          }}
        >
          Related terms
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {entry.relatedTerms.map((term) => (
            <Link
              key={term.slug}
              href={`/glossary/${term.slug}`}
              style={{
                textDecoration: "none",
              }}
            >
              <MetaPill text={term.name} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function GlossaryMiddle() {
  const router = useRouter();
  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || "";
  const entry = slug ? GLOSSARY_ENTRIES[slug] : null;

  if (!slug) {
    return <section className="section" />;
  }

  if (!entry) {
    return (
      <section className="section">
        <div className="card" style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "rgba(226,232,240,0.96)",
              marginBottom: 8,
            }}
          >
            Term not found
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(226,232,240,0.78)",
              marginBottom: 14,
            }}
          >
            We haven’t added this glossary term yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
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
            <div
              className="section-title"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {entry.name}
            </div>

            <div
              className="section-sub"
              style={{
                maxWidth: 760,
                marginTop: 6,
                color: "rgba(226,232,240,0.82)",
              }}
            >
              {entry.oneLine}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <MetaPill text={entry.category} />
              <MetaPill text={entry.level} />
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
              boxShadow: "0 10px 28px rgba(15,23,42,0.35)",
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>✍️</span>
            <span>Suggest an edit →</span>
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <GlossarySection id="definition" title="Definition">
          {entry.definition}
        </GlossarySection>

        <GlossarySection id="why-it-matters" title="Why it matters">
          {entry.whyItMatters}
        </GlossarySection>

        <GlossarySection id="intuition" title="Intuition">
          {entry.intuition}
        </GlossarySection>

        {entry.math ? (
          <GlossarySection id="math" title="Mathematical form">
            {entry.math}
          </GlossarySection>
        ) : null}

        <GlossarySection id="related-terms" title="Related terms">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {entry.relatedTerms.map((term) => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                style={{ textDecoration: "none" }}
              >
                <MetaPill text={term.name} />
              </Link>
            ))}
          </div>
        </GlossarySection>
      </div>
    </section>
  );
}

function GlossaryTwoColumnShell() {
  const router = useRouter();
  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || "";
  const entry = slug ? GLOSSARY_ENTRIES[slug] : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      <div style={{ paddingRight: 16 }}>
        <GlossaryMiddle />
      </div>

      <div
        style={{
          width: 1,
          background: "rgba(148,163,184,0.35)",
          position: "sticky",
          top: 0,
          height: "100vh",
          alignSelf: "start",
        }}
      />

      <div
        style={{
          paddingLeft: 16,
          position: "sticky",
          top: 16,
          alignSelf: "start",
        }}
      >
        {entry ? <GlossaryRightSidebar entry={entry} /> : null}
      </div>
    </div>
  );
}

export default function GlossarySlugPage() {
  return <GlossaryTwoColumnShell />;
}

(GlossarySlugPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <GlossaryMiddle />,
};
