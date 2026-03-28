// pages/glossary/[slug].tsx
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

type GlossaryLevel = "Beginner" | "Intermediate" | "Advanced";

type GlossaryEntry = {
  id: string;
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

type GlossaryTermRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  level: GlossaryLevel;
  one_line: string;
  overview: string;
  explanation: string;
  why_it_matters: string | null;
  intuition: string | null;
  math: string | null;
  visual_title: string | null;
  visual_description: string | null;
  visual_image_url: string | null;
  visual_caption: string | null;
  status: string;
};

type GlossaryRelationRow = {
  related: {
    name: string;
    slug: string;
  } | null;
};

type GlossaryFurtherReadingRow = {
  label: string;
  href: string;
  sort_order: number | null;
};

function mapTermRowToEntry(
  row: GlossaryTermRow,
  relatedTerms: { name: string; slug: string }[],
  furtherReading: { label: string; href: string }[]
): GlossaryEntry {
  const hasVisual =
    !!row.visual_title ||
    !!row.visual_description ||
    !!row.visual_image_url ||
    !!row.visual_caption;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    level: row.level,
    oneLine: row.one_line,
    overview: row.overview,
    explanation: row.explanation,
    whyItMatters: row.why_it_matters || undefined,
    intuition: row.intuition || undefined,
    visual: hasVisual
      ? {
          title: row.visual_title || undefined,
          description: row.visual_description || undefined,
          imageUrl: row.visual_image_url || undefined,
          caption: row.visual_caption || undefined,
        }
      : undefined,
    math: row.math || undefined,
    relatedTerms,
    furtherReading: furtherReading.length > 0 ? furtherReading : undefined,
  };
}

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

function GlossaryMiddle({
  loading,
  entry,
}: {
  loading: boolean;
  entry: GlossaryEntry | null;
}) {
  if (loading) {
    return (
      <section className="section">
        <div className="products-status">Loading glossary term…</div>
      </section>
    );
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
            href={`/glossary/${entry.slug}/edit`}
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
                  key={`${item.label}-${item.href}`}
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

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);

  useEffect(() => {
    let alive = true;

    const loadTerm = async () => {
      if (!router.isReady || !slug) return;

      setLoading(true);
      setEntry(null);

      const { data: termRow, error: termError } = await supabase
        .from("glossary_terms")
        .select(
          `
            id,
            name,
            slug,
            category,
            level,
            one_line,
            overview,
            explanation,
            why_it_matters,
            intuition,
            math,
            visual_title,
            visual_description,
            visual_image_url,
            visual_caption,
            status
          `
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle<GlossaryTermRow>();

      if (termError) {
        console.error("Error loading glossary term:", termError);
        if (alive) {
          setEntry(null);
          setLoading(false);
        }
        return;
      }

      if (!termRow) {
        if (alive) {
          setEntry(null);
          setLoading(false);
        }
        return;
      }

      const { data: relationRows, error: relationError } = await supabase
        .from("glossary_term_relations")
        .select(
          `
            related:related_term_id (
              name,
              slug
            )
          `
        )
        .eq("term_id", termRow.id)
        .returns<GlossaryRelationRow[]>();

      if (relationError) {
        console.error("Error loading glossary relations:", relationError);
      }

      const relatedTerms =
        (relationRows || [])
          .map((row) => row.related)
          .filter(Boolean)
          .map((related) => ({
            name: related!.name,
            slug: related!.slug,
          })) || [];

      const { data: furtherRows, error: furtherError } = await supabase
        .from("glossary_further_reading")
        .select("label, href, sort_order")
        .eq("term_id", termRow.id)
        .order("sort_order", { ascending: true })
        .returns<GlossaryFurtherReadingRow[]>();

      if (furtherError) {
        console.error("Error loading glossary further reading:", furtherError);
      }

      const furtherReading =
        (furtherRows || []).map((item) => ({
          label: item.label,
          href: item.href,
        })) || [];

      if (!alive) return;

      setEntry(mapTermRowToEntry(termRow, relatedTerms, furtherReading));
      setLoading(false);
    };

    void loadTerm();

    return () => {
      alive = false;
    };
  }, [router.isReady, slug]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      <div style={{ paddingRight: 16 }}>
        <GlossaryMiddle loading={loading} entry={entry} />
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
        {!loading && entry ? <GlossaryRightSidebar entry={entry} /> : null}
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
  mobileMain: <GlossaryMiddle loading={true} entry={null} />,
};
