// pages/glossary/[slug]/edit.tsx
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabaseClient";
import { useSupabaseUser } from "../../../lib/useSupabaseUser";

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

type GlossaryFormState = {
  category: string;
  level: GlossaryLevel;
  oneLine: string;
  overview: string;
  explanation: string;
  whyItMatters: string;
  intuition: string;
  visualTitle: string;
  visualDescription: string;
  visualImageUrl: string;
  visualCaption: string;
  math: string;
  relatedTerms: string;
  furtherReading: string;
  editNote: string;
};

const CATEGORY_OPTIONS = [
  "Fundamentals",
  "Hardware",
  "Gates & Circuits",
  "Software & Algorithms",
  "Error Correction",
  "Communication & Networking",
  "Industry & Ecosystem",
];

const LEVEL_OPTIONS: GlossaryLevel[] = ["Beginner", "Intermediate", "Advanced"];

const FORM_SECTIONS = [
  { id: "basic-info", label: "Basic info" },
  { id: "overview", label: "Overview" },
  { id: "explanation", label: "Explanation" },
  { id: "why-it-matters", label: "Why it matters" },
  { id: "intuition", label: "Intuition / Example" },
  { id: "visual", label: "Visual" },
  { id: "math", label: "Mathematical form" },
  { id: "related-terms", label: "Related terms" },
  { id: "further-reading", label: "Further reading" },
  { id: "edit-note", label: "Edit note" },
] as const;

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

function toInitialForm(entry: GlossaryEntry): GlossaryFormState {
  return {
    category: entry.category,
    level: entry.level,
    oneLine: entry.oneLine,
    overview: entry.overview,
    explanation: entry.explanation,
    whyItMatters: entry.whyItMatters || "",
    intuition: entry.intuition || "",
    visualTitle: entry.visual?.title || "",
    visualDescription: entry.visual?.description || "",
    visualImageUrl: entry.visual?.imageUrl || "",
    visualCaption: entry.visual?.caption || "",
    math: entry.math || "",
    relatedTerms: entry.relatedTerms.map((t) => t.name).join(", "),
    furtherReading: (entry.furtherReading || [])
      .map((item) => `${item.label} — ${item.href}`)
      .join("\n"),
    editNote: "",
  };
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

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 13,
        fontWeight: 700,
        color: "rgba(226,232,240,0.94)",
        marginBottom: 8,
      }}
    >
      {children}
      {required ? <span style={{ marginLeft: 6, color: "#7dd3fc" }}>*</span> : null}
    </label>
  );
}

function inputStyle(multiline = false): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.62)",
    color: "white",
    padding: multiline ? "12px 14px" : "11px 14px",
    fontSize: 14,
    outline: "none",
    resize: multiline ? "vertical" : "none",
    minHeight: multiline ? 120 : undefined,
  };
}

function FormSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
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
          marginBottom: subtitle ? 4 : 14,
        }}
      >
        {title}
      </div>

      {subtitle ? (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "rgba(226,232,240,0.68)",
            marginBottom: 14,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      {children}
    </section>
  );
}

function GlossaryEditRightSidebar() {
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
          Form sections
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FORM_SECTIONS.map((item) => (
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
          Edit mode
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <MetaPill text="Prefilled from current term" />
          <MetaPill text="Pending review" />
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: "rgba(226,232,240,0.75)",
          }}
        >
          Suggested edits do not overwrite the live glossary immediately. They can be
          reviewed and approved before publication.
        </div>
      </div>
    </div>
  );
}

function GlossaryEditMiddle() {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();

  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || "";

  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<GlossaryEntry | null>(null);
  const [form, setForm] = useState<GlossaryFormState | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const loadTerm = async () => {
      if (!router.isReady || !slug) return;

      setLoading(true);
      setEntry(null);
      setForm(null);
      setErrorMsg(null);

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
          setLoading(false);
          setEntry(null);
          setForm(null);
          setErrorMsg("Could not load this glossary term.");
        }
        return;
      }

      if (!termRow) {
        if (alive) {
          setLoading(false);
          setEntry(null);
          setForm(null);
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

      const mapped = mapTermRowToEntry(termRow, relatedTerms, furtherReading);

      if (!alive) return;

      setEntry(mapped);
      setForm(toInitialForm(mapped));
      setLoading(false);
    };

    void loadTerm();

    return () => {
      alive = false;
    };
  }, [router.isReady, slug]);

  const updateField = <K extends keyof GlossaryFormState>(
    key: K,
    value: GlossaryFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const requiredMissing =
    !form ||
    !form.category.trim() ||
    !form.level.trim() ||
    !form.oneLine.trim() ||
    !form.overview.trim() ||
    !form.explanation.trim() ||
    !form.editNote.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !form || requiredMissing || submitting) return;

    if (!user) {
      router.push(`/auth?redirect=/glossary/${entry.slug}/edit`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      originalSlug: entry.slug,
      suggestionType: "edit_existing_term",
      proposedEntry: {
        name: entry.name,
        slug: entry.slug,
        category: form.category,
        level: form.level,
        oneLine: form.oneLine.trim(),
        overview: form.overview.trim(),
        explanation: form.explanation.trim(),
        whyItMatters: form.whyItMatters.trim() || undefined,
        intuition: form.intuition.trim() || undefined,
        visual:
          form.visualTitle.trim() ||
          form.visualDescription.trim() ||
          form.visualImageUrl.trim() ||
          form.visualCaption.trim()
            ? {
                title: form.visualTitle.trim() || undefined,
                description: form.visualDescription.trim() || undefined,
                imageUrl: form.visualImageUrl.trim() || undefined,
                caption: form.visualCaption.trim() || undefined,
              }
            : undefined,
        math: form.math.trim() || undefined,
        relatedTerms: form.relatedTerms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        furtherReading: form.furtherReading
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
      editNote: form.editNote.trim(),
    };

    const { error } = await supabase.from("glossary_edit_suggestions").insert({
      term_id: entry.id,
      submitted_by: user.id,
      payload,
      edit_note: form.editNote.trim(),
      status: "pending",
    });

    if (error) {
      console.error("Error submitting glossary edit suggestion:", error);
      setErrorMsg("Could not submit your edit suggestion right now.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (!slug) return <section className="section" />;

  if (loading) {
    return (
      <section className="section">
        <div className="products-status">Loading glossary term…</div>
      </section>
    );
  }

  if (!entry || !form) {
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
            }}
          >
            We couldn’t load this glossary term for editing.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div style={{ marginBottom: 12 }}>
        <Link
          href={`/glossary/${entry.slug}`}
          style={{
            textDecoration: "none",
            fontSize: 13,
            color: "#7dd3fc",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back to term
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
            <div className="section-title">Suggest an edit</div>
            <div
              className="section-sub"
              style={{ maxWidth: 760, color: "rgba(226,232,240,0.82)" }}
            >
              You are suggesting changes to <strong>{entry.name}</strong>. The form is
              prefilled from the current glossary page.
            </div>

            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <MetaPill text={entry.category} />
              <MetaPill text={entry.level} />
              <MetaPill text={`Slug: ${entry.slug}`} />
            </div>
          </div>

          <button
            type="submit"
            form="glossary-edit-form"
            disabled={requiredMissing || submitting || userLoading}
            style={{
              color: "white",
              padding: "11px 16px",
              borderRadius: 14,
              border:
                requiredMissing || submitting || userLoading
                  ? "1px solid rgba(148,163,184,0.22)"
                  : "1px solid rgba(34,211,238,0.45)",
              background:
                requiredMissing || submitting || userLoading
                  ? "rgba(51,65,85,0.55)"
                  : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
              boxShadow:
                requiredMissing || submitting || userLoading
                  ? "none"
                  : "0 10px 28px rgba(15,23,42,0.35)",
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor:
                requiredMissing || submitting || userLoading ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>✍️</span>
            <span>{submitting ? "Submitting..." : "Submit edit suggestion"}</span>
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div
          className="card"
          style={{
            padding: 18,
            marginBottom: 14,
            borderRadius: 18,
            border: "1px solid rgba(248,113,113,0.28)",
            background:
              "radial-gradient(circle at top left, rgba(248,113,113,0.10), rgba(15,23,42,0.96))",
            color: "rgba(254,226,226,0.95)",
          }}
        >
          {errorMsg}
        </div>
      ) : null}

      {submitted ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(2,6,23,0.68)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    }}
  >
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: 520,
        padding: 24,
        borderRadius: 22,
        border: "1px solid rgba(34,197,94,0.28)",
        background:
          "radial-gradient(circle at top left, rgba(34,197,94,0.12), rgba(15,23,42,0.98))",
        boxShadow: "0 24px 60px rgba(2,6,23,0.55)",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          fontSize: 24,
          background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.28)",
        }}
      >
        ✅
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "rgba(226,232,240,0.97)",
          marginBottom: 10,
        }}
      >
        Edit under review
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(226,232,240,0.82)",
          marginBottom: 20,
        }}
      >
        Your edit suggestion has been submitted successfully and is now under review.
        It will appear in the main glossary once approved.
      </div>

      <button
        type="button"
        onClick={() => router.push("/glossary")}
        style={{
          color: "white",
          padding: "11px 18px",
          borderRadius: 14,
          border: "1px solid rgba(34,211,238,0.45)",
          background:
            "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
          boxShadow: "0 10px 28px rgba(15,23,42,0.35)",
          fontSize: 13,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        Okay
      </button>
    </div>
  </div>
) : null}

      <form
        id="glossary-edit-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <FormSection
          id="basic-info"
          title="Basic info"
          subtitle="The term identity is fixed. You can suggest changes to category, level, and summary."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <FieldLabel>Term name</FieldLabel>
              <div
                style={{
                  ...inputStyle(),
                  display: "flex",
                  alignItems: "center",
                  opacity: 0.85,
                }}
              >
                {entry.name}
              </div>
            </div>

            <div>
              <FieldLabel>Slug</FieldLabel>
              <div
                style={{
                  ...inputStyle(),
                  display: "flex",
                  alignItems: "center",
                  opacity: 0.85,
                }}
              >
                {entry.slug}
              </div>
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                style={inputStyle()}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel required>Level</FieldLabel>
              <select
                value={form.level}
                onChange={(e) => updateField("level", e.target.value as GlossaryLevel)}
                style={inputStyle()}
              >
                {LEVEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel required>One-line summary</FieldLabel>
            <input
              value={form.oneLine}
              onChange={(e) => updateField("oneLine", e.target.value)}
              style={inputStyle()}
            />
          </div>
        </FormSection>

        <FormSection id="overview" title="Overview">
          <FieldLabel required>Overview</FieldLabel>
          <textarea
            value={form.overview}
            onChange={(e) => updateField("overview", e.target.value)}
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection id="explanation" title="Explanation">
          <FieldLabel required>Explanation</FieldLabel>
          <textarea
            value={form.explanation}
            onChange={(e) => updateField("explanation", e.target.value)}
            style={{ ...inputStyle(true), minHeight: 180 }}
          />
        </FormSection>

        <FormSection id="why-it-matters" title="Why it matters">
          <FieldLabel>Why it matters</FieldLabel>
          <textarea
            value={form.whyItMatters}
            onChange={(e) => updateField("whyItMatters", e.target.value)}
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection id="intuition" title="Intuition / Example">
          <FieldLabel>Intuition / Example</FieldLabel>
          <textarea
            value={form.intuition}
            onChange={(e) => updateField("intuition", e.target.value)}
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection id="visual" title="Visual">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <FieldLabel>Visual title</FieldLabel>
              <input
                value={form.visualTitle}
                onChange={(e) => updateField("visualTitle", e.target.value)}
                style={inputStyle()}
              />
            </div>

            <div>
              <FieldLabel>Visual image URL</FieldLabel>
              <input
                value={form.visualImageUrl}
                onChange={(e) => updateField("visualImageUrl", e.target.value)}
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Visual description</FieldLabel>
            <textarea
              value={form.visualDescription}
              onChange={(e) => updateField("visualDescription", e.target.value)}
              style={inputStyle(true)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Visual caption</FieldLabel>
            <input
              value={form.visualCaption}
              onChange={(e) => updateField("visualCaption", e.target.value)}
              style={inputStyle()}
            />
          </div>
        </FormSection>

        <FormSection id="math" title="Mathematical form">
          <FieldLabel>Mathematical form</FieldLabel>
          <textarea
            value={form.math}
            onChange={(e) => updateField("math", e.target.value)}
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection id="related-terms" title="Related terms">
          <FieldLabel>Related terms</FieldLabel>
          <input
            value={form.relatedTerms}
            onChange={(e) => updateField("relatedTerms", e.target.value)}
            style={inputStyle()}
          />
        </FormSection>

        <FormSection id="further-reading" title="Further reading">
          <FieldLabel>Further reading</FieldLabel>
          <textarea
            value={form.furtherReading}
            onChange={(e) => updateField("furtherReading", e.target.value)}
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection
          id="edit-note"
          title="Edit note"
          subtitle="Briefly explain what you changed or why your revision improves the entry."
        >
          <FieldLabel required>Edit note</FieldLabel>
          <textarea
            value={form.editNote}
            onChange={(e) => updateField("editNote", e.target.value)}
            placeholder="e.g. Clarified the explanation of superposition and improved the mathematical notation."
            style={inputStyle(true)}
          />
        </FormSection>

        <div
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
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: "rgba(226,232,240,0.72)",
              }}
            >
              Required: category, level, one-line summary, overview, explanation, and
              a short edit note.
            </div>

            <button
              type="submit"
              disabled={requiredMissing || submitting || userLoading}
              style={{
                color: "white",
                padding: "11px 16px",
                borderRadius: 14,
                border:
                  requiredMissing || submitting || userLoading
                    ? "1px solid rgba(148,163,184,0.22)"
                    : "1px solid rgba(34,211,238,0.45)",
                background:
                  requiredMissing || submitting || userLoading
                    ? "rgba(51,65,85,0.55)"
                    : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
                boxShadow:
                  requiredMissing || submitting || userLoading
                    ? "none"
                    : "0 10px 28px rgba(15,23,42,0.35)",
                fontSize: 13,
                fontWeight: 800,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor:
                  requiredMissing || submitting || userLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <span style={{ fontSize: 14 }}>✍️</span>
              <span>{submitting ? "Submitting..." : "Submit edit suggestion"}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function GlossaryEditShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      <div style={{ paddingRight: 16 }}>
        <GlossaryEditMiddle />
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
        <GlossaryEditRightSidebar />
      </div>
    </div>
  );
}

export default function GlossaryEditPage() {
  return <GlossaryEditShell />;
}

(GlossaryEditPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <GlossaryEditMiddle />,
};
