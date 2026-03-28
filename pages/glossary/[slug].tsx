// pages/glossary/[slug].tsx
import React, { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
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
    mediaUrl?: string;
    mediaType?: "image" | "video";
    caption?: string;
    link?: string;
  };
  math?: string;
  relatedTerms: { name: string; slug: string }[];
  furtherReading?: { label: string; href: string }[];
  interestingFact?: string;
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
  visual_media_url: string | null;
  visual_media_type: "image" | "video" | null;
  visual_caption: string | null;
  visual_link: string | null;
  status: string;
  interesting_fact: string | null;
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
    !!row.visual_media_url ||
    !!row.visual_caption ||
    !!row.visual_link;

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
          mediaUrl: row.visual_media_url || undefined,
          mediaType: row.visual_media_type || undefined,
          caption: row.visual_caption || undefined,
          link: row.visual_link || undefined,
        }
      : undefined,
    math: row.math || undefined,
    relatedTerms,
    furtherReading: furtherReading.length > 0 ? furtherReading : undefined,
    interestingFact: row.interesting_fact || undefined,
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
  if (entry.furtherReading && entry.furtherReading.length > 0) {
    items.push({ id: "further-reading", label: "Further reading" });
  }

  return items;
}

function useIsMobile(maxWidth = 820) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);

    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
  }, [maxWidth]);

  return isMobile;
}

function RightDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(2,6,23,0.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.985))",
          borderLeft: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 14px",
            borderBottom: "1px solid rgba(148,163,184,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 14,
              color: "rgba(226,232,240,0.92)",
            }}
          >
            {title || "Panel"}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.22)",
              color: "rgba(226,232,240,0.92)",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 12, overflowY: "auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
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

function RelatedMetaPill({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(34,211,238,0.12)",
        border: "1px solid rgba(34,211,238,0.35)",
        color: "#a5f3fc",
        transition: "all 140ms ease",
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

      {children}
    </section>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

function GlossaryRightSidebar({ entry }: { entry: GlossaryEntry }) {
  const sectionItems = getSectionItems(entry);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>✍️</span>
        <span>Suggest an edit</span>
      </Link>

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
    Interesting fact
  </div>

  {entry.interestingFact ? (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(168,85,247,0.25)",
        background: "rgba(168,85,247,0.08)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "rgba(226,232,240,0.9)",
      }}
    >
      {entry.interestingFact}
    </div>
  ) : (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px dashed rgba(148,163,184,0.25)",
        background: "rgba(255,255,255,0.02)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "rgba(226,232,240,0.6)",
      }}
    >
      Know something surprising about this concept? Add an interesting fact and help others see it differently.
    </div>
  )}
</div>

      {entry.relatedTerms.length > 0 ? (
        <div className="sidebar-card">
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              marginBottom: 10,
              color: "rgba(226,232,240,0.96)",
            }}
          >
            Also Read
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {entry.relatedTerms.map((term) => (
              <Link
                key={term.slug}
                href={`/glossary/${term.slug}`}
                style={{ textDecoration: "none" }}
              >
                <RelatedMetaPill text={term.name} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
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
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/glossary"
            style={{
              textDecoration: "none",
              color: "#7dd3fc",
              fontWeight: 700,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back to Glossary
          </Link>
        </div>

        <div className="products-status">Loading glossary term…</div>
      </section>
    );
  }

  if (!entry) {
    return (
      <section className="section">
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/glossary"
            style={{
              textDecoration: "none",
              color: "#7dd3fc",
              fontWeight: 700,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ← Back to Glossary
          </Link>
        </div>

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
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/glossary"
          style={{
            textDecoration: "none",
            color: "#7dd3fc",
            fontWeight: 700,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to Glossary
        </Link>
      </div>

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
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <GlossarySection id="overview" title="Overview">
          <BodyText>{entry.overview}</BodyText>
        </GlossarySection>

        <GlossarySection id="explanation" title="Explanation">
          <BodyText>{entry.explanation}</BodyText>
        </GlossarySection>

        {entry.whyItMatters ? (
          <GlossarySection id="why-it-matters" title="Why it matters">
            <BodyText>{entry.whyItMatters}</BodyText>
          </GlossarySection>
        ) : null}

        {entry.intuition ? (
          <GlossarySection id="intuition" title="Intuition / Example">
            <BodyText>{entry.intuition}</BodyText>
          </GlossarySection>
        ) : null}

        {entry.visual ? (
          <GlossarySection id="visual" title={entry.visual.title || "Visual"}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {entry.visual.description ? (
                <BodyText>{entry.visual.description}</BodyText>
              ) : null}

              {entry.visual.mediaUrl ? (
                entry.visual.mediaType === "video" ? (
                  <video
                    src={entry.visual.mediaUrl}
                    controls
                    style={{
                      width: "100%",
                      maxHeight: 420,
                      objectFit: "contain",
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,0.16)",
                      display: "block",
                      background: "rgba(2,6,23,0.35)",
                    }}
                  />
                ) : (
                  <img
                    src={entry.visual.mediaUrl}
                    alt={entry.name}
                    style={{
                      width: "100%",
                      maxHeight: 420,
                      objectFit: "contain",
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,0.16)",
                      display: "block",
                      background: "rgba(2,6,23,0.35)",
                    }}
                  />
                )
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

              {entry.visual.link ? (
                <a
                  href={entry.visual.link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    color: "#7dd3fc",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Open link →
                </a>
              ) : null}
            </div>
          </GlossarySection>
        ) : null}

        {entry.math ? (
          <GlossarySection id="math" title="Mathematical form">
            <BodyText>{entry.math}</BodyText>
          </GlossarySection>
        ) : null}

        {entry.furtherReading && entry.furtherReading.length > 0 ? (
          <GlossarySection id="further-reading" title="Further reading">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {entry.furtherReading.map((item) => {
                const isExternal = /^https?:\/\//i.test(item.href);

                return isExternal ? (
                  <a
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "#7dd3fc",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {item.label} →
                  </a>
                ) : (
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
                );
              })}
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

  const isMobile = useIsMobile(820);
  const [rightOpen, setRightOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);

  useEffect(() => {
    let alive = true;

    const loadTerm = async () => {
      if (!router.isReady) return;

      if (!slug) {
        if (alive) {
          setEntry(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setEntry(null);

      const { data: termRow, error: termError } = await supabase
        .from("glossary_terms")
        .select(`
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
  visual_media_url,
  visual_media_type,
  visual_caption,
  visual_link,
  interesting_fact,
  status
`)
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
        .select(`
          related:related_term_id (
            name,
            slug
          )
        `)
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
    <>
      {isMobile && entry ? (
        <button
          type="button"
          aria-label={rightOpen ? "Close glossary panel" : "Open glossary panel"}
          onClick={() => setRightOpen((v) => !v)}
          style={{
            position: "fixed",
            right: 0,
            top: "80%",
            transform: "translateY(-50%)",
            zIndex: 60,
            width: 30,
            height: 80,
            border: "1px solid rgba(148,163,184,0.35)",
            borderRight: "none",
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: "rgba(226,232,240,0.95)",
              transform: rightOpen ? "rotate(180deg)" : "none",
              transition: "transform 160ms ease",
              userSelect: "none",
            }}
          >
            ❮
          </span>
        </button>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) 1px 280px",
          alignItems: "stretch",
        }}
      >
        <div style={{ paddingRight: isMobile ? 0 : 16 }}>
          <GlossaryMiddle loading={loading} entry={entry} />
        </div>

        {!isMobile ? (
          <>
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
          </>
        ) : null}
      </div>

      {isMobile && entry ? (
        <RightDrawer
          open={rightOpen}
          onClose={() => setRightOpen(false)}
          title={entry.name}
        >
          <GlossaryRightSidebar entry={entry} />
        </RightDrawer>
      ) : null}
    </>
  );
}

export default function GlossarySlugPage() {
  return <GlossaryTwoColumnShell />;
}

(GlossarySlugPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
