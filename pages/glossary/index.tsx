// pages/glossary/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type GlossaryTerm = {
  id: string;
  name: string;
  slug: string;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
};

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function GlossaryIndexPage() {
  const [search, setSearch] = useState("");
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const loadTerms = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("glossary_terms")
        .select("id, name, slug, category, level")
        .eq("status", "published")
        .order("name", { ascending: true });

      if (!alive) return;

      if (error) {
        console.error("Error loading glossary terms:", error);
        setErrorMsg("Could not load glossary terms right now.");
        setTerms([]);
      } else {
        setTerms((data || []) as GlossaryTerm[]);
      }

      setLoading(false);
    };

    void loadTerms();

    return () => {
      alive = false;
    };
  }, []);

  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return terms;

    return terms.filter((term) => {
      return (
        term.name.toLowerCase().includes(q) ||
        term.category.toLowerCase().includes(q) ||
        term.level.toLowerCase().includes(q)
      );
    });
  }, [search, terms]);

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
              error correction, communication, and the wider ecosystem. This will
              grow into a community-built knowledge base over time.
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
            <span>Contribute a term →</span>
          </Link>
        </div>
      </div>

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
              outline: "none",
            }}
          />

          <div
            style={{
              fontSize: 12,
              color: "rgba(226,232,240,0.72)",
              whiteSpace: "nowrap",
            }}
          >
            {visibleCount} term{visibleCount === 1 ? "" : "s"}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {ALL_LETTERS.map((letter) => {
            const active = availableLetters.has(letter);

            return (
              <a
                key={letter}
                href={`#letter-${letter}`}
                style={{
                  textDecoration: "none",
                  minWidth: 34,
                  height: 34,
                  display: "inline-flex",
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
                  fontSize: 13,
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

      {loading ? (
        <div className="products-status">Loading glossary terms…</div>
      ) : errorMsg ? (
        <div className="products-status" style={{ color: "#f87171" }}>
          {errorMsg}
        </div>
      ) : visibleCount === 0 ? (
        <div className="products-status">No glossary terms found for this search.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {ALL_LETTERS.map((letter) => {
            const items = groupedTerms[letter] || [];
            if (items.length === 0) return null;

            return (
              <div
                id={`letter-${letter}`}
                key={letter}
                className="card"
                style={{
                  padding: 18,
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.96)",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#c084fc",
                    marginBottom: 14,
                  }}
                >
                  {letter}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  {items.map((term) => (
                    <Link
                      key={term.id}
                      href={`/glossary/${term.slug}`}
                      className="card"
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        padding: 14,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background:
                          "radial-gradient(circle at top left, rgba(168,85,247,0.08), rgba(15,23,42,0.96))",
                        transition: "transform 140ms ease, border-color 140ms ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          lineHeight: 1.35,
                          color: "white",
                        }}
                      >
                        {term.name}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        <MetaPill text={term.category} />
                        <MetaPill text={term.level} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 8px",
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(148,163,184,0.16)",
        color: "rgba(226,232,240,0.88)",
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
