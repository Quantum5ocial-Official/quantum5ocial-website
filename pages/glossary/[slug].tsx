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
  overview: string;
  explanation: string;
  whyItMatters?: string;
  intuition?: string;
  visual?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    caption?: string;
  };
  math?: string;
  relatedTerms: { name: string; slug: string }[];
  furtherReading?: { label: string; href: string }[];
};

const GLOSSARY_ENTRIES: Record<string, GlossaryEntry> = {
  qubit: {
    name: "Qubit",
    slug: "qubit",
    category: "Fundamentals",
    level: "Beginner",
    oneLine: "The fundamental unit of quantum information.",
    overview:
      "A qubit is the quantum analogue of a classical bit. It is the basic unit used to store and process information in a quantum system.",
    explanation:
      "A classical bit can only be in one of two states, 0 or 1. A qubit, however, can exist in a quantum state described by a superposition of the basis states |0⟩ and |1⟩ until it is measured. This means that the state of a qubit is not restricted to only the two classical endpoints, but can be any valid combination of them allowed by quantum mechanics.",
    whyItMatters:
      "Qubits are the basic building blocks of quantum computers. Quantum gates act on qubits, quantum circuits are built from qubits, and the power of quantum computation comes from how multiple qubits can be controlled, correlated, and entangled.",
    intuition:
      "A classical bit is like a switch that is either off or on. A qubit is different: it is a quantum state that can contain amplitudes for both basis states at the same time. This does not mean it is classically both values in a simple everyday sense, but rather that its state must be described using quantum mechanics.",
    visual: {
      title: "Visual idea",
      description:
        "A useful way to picture a qubit is with the Bloch sphere. The north and south poles correspond to |0⟩ and |1⟩, while points on the sphere represent other valid qubit states.",
      caption: "Later this section can contain a Bloch sphere graphic or simple diagram.",
    },
    math:
      "|ψ⟩ = α|0⟩ + β|1⟩\n\nwhere α and β are complex amplitudes satisfying:\n\n|α|² + |β|² = 1",
    relatedTerms: [
      { name: "Superposition", slug: "superposition" },
      { name: "Bloch Sphere", slug: "bloch-sphere" },
      { name: "Entanglement", slug: "entanglement" },
      { name: "Quantum Circuit", slug: "quantum-circuit" },
      { name: "Measurement", slug: "measurement" },
    ],
    furtherReading: [
      { label: "Bloch Sphere", href: "/glossary/bloch-sphere" },
      { label: "Superposition", href: "/glossary/superposition" },
    ],
  },
};

function getSectionItems(entry: GlossaryEntry) {
  const items: { id: string; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "explanation", label: "Explanation" },
  ];

  if (entry.whyItMatters) items.push({ id: "why-it-matters", label: "Why it matters" });
  if (entry.intuition) items.push({ id: "intuition", label: "Intuition / Example" });
  if (entry.visual) items.push({ id: "visual", label: "Visual" });
  if (entry.math) items.push({ id: "math", label: "Mathematical form" });
  items.push({ id: "related-terms", label: "Related terms" });
  if (entry.furtherReading && entry.furtherReading.length > 0) {
    items.push({ id: "further-reading", label: "Further reading" });
  }

  return items;
}

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
  const sectionItems = getSectionItems(entry);

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
          {sectionItems.map((item) => (
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
              style={{ textDecoration: "none" }}
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
        <GlossarySection id="overview" title="Overview">
          {entry.overview}
        </GlossarySection>

        <GlossarySection id="explanation" title="Explanation">
          {entry.explanation}
        </GlossarySection>

        {entry.whyItMatters ? (
          <GlossarySection id="why-it-matters" title="Why it matters">
            {entry.whyItMatters}
          </GlossarySection>
        ) : null}

        {entry.intuition ? (
          <GlossarySection id="intuition" title="Intuition / Example">
            {entry.intuition}
          </GlossarySection>
        ) : null}

        {entry.visual ? (
          <GlossarySection id="visual" title={entry.visual.title || "Visual"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {entry.visual.description ? <div>{entry.visual.description}</div> : null}

              {entry.visual.imageUrl ? (
                <img
                  src={entry.visual.imageUrl}
                  alt={entry.name}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.16)",
                  }}
                />
              ) : (
                <div
                  style={{
                    borderRadius: 14,
                    border: "1px dashed rgba(148,163,184,0.28)",
                    background: "rgba(255,255,255,0.02)",
                    padding: "22px 16px",
                    color: "rgba(226,232,240,0.62)",
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  Graphic placeholder
                </div>
              )}

              {entry.visual.caption ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(226,232,240,0.65)",
                  }}
                >
                  {entry.visual.caption}
                </div>
              ) : null}
            </div>
          </GlossarySection>
        ) : null}

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

        {entry.furtherReading && entry.furtherReading.length > 0 ? (
          <GlossarySection id="further-reading" title="Further reading">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entry.furtherReading.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#7dd3fc",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {item.label} →
                </Link>
              ))}
            </div>
          </GlossarySection>
        ) : null}
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
