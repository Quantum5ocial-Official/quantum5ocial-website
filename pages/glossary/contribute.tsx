// pages/glossary/contribute.tsx
import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type GlossaryLevel = "Beginner" | "Intermediate" | "Advanced";

type GlossaryFormState = {
  name: string;
  slug: string;
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
] as const;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      {required ? (
        <span style={{ marginLeft: 6, color: "#7dd3fc", fontWeight: 800 }}>*</span>
      ) : null}
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

function GlossaryContributeRightSidebar() {
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
          Submission notes
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <MetaPill text="Reviewed before publishing" />
          <MetaPill text="Stored in pending queue" />
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            color: "rgba(226,232,240,0.75)",
          }}
        >
          Keep the explanation clear and structured. Optional sections can be left empty.
          Approved entries can later appear in the same format as the glossary term pages.
        </div>
      </div>
    </div>
  );
}

function GlossaryContributeMiddle() {
  const router = useRouter();
  const { user, loading: userLoading } = useSupabaseUser();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<GlossaryFormState>({
    name: "",
    slug: "",
    category: "Fundamentals",
    level: "Beginner",
    oneLine: "",
    overview: "",
    explanation: "",
    whyItMatters: "",
    intuition: "",
    visualTitle: "",
    visualDescription: "",
    visualImageUrl: "",
    visualCaption: "",
    math: "",
    relatedTerms: "",
    furtherReading: "",
  });

  const derivedSlug = useMemo(() => slugify(form.name), [form.name]);
  const effectiveSlug = form.slug.trim() || derivedSlug;

  const updateField = <K extends keyof GlossaryFormState>(
    key: K,
    value: GlossaryFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const requiredMissing =
    !form.name.trim() ||
    !effectiveSlug.trim() ||
    !form.category.trim() ||
    !form.level.trim() ||
    !form.oneLine.trim() ||
    !form.overview.trim() ||
    !form.explanation.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiredMissing || submitting) return;

    if (!user) {
      router.push("/auth?redirect=/glossary/contribute");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: form.name.trim(),
      slug: effectiveSlug,
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
    };

    const { error } = await supabase.from("glossary_contributions").insert({
      submitted_by: user.id,
      payload,
      status: "pending",
    });

    if (error) {
      console.error("Error submitting glossary contribution:", error);
      setErrorMsg("Could not submit your glossary contribution right now.");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  };

      return (
    <section className="section">
      <div style={{ marginBottom: 12 }}>
        <Link
          href="/glossary"
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
          ← Back to glossary
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
            <div className="section-title">Contribute a glossary term</div>
            <div
              className="section-sub"
              style={{
                maxWidth: 760,
                color: "rgba(226,232,240,0.82)",
              }}
            >
              Submit a new glossary entry using the same structure as a published term page.
              Contributions are reviewed before they go live.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <MetaPill text="Required: basic info, overview, explanation" />
              <MetaPill text="Optional: visual, math, references" />
            </div>
          </div>

          <button
            type="submit"
            form="glossary-contribute-form"
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
            <span>{submitting ? "Submitting..." : "Submit for review"}</span>
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
        Submission under review
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.7,
          color: "rgba(226,232,240,0.82)",
          marginBottom: 20,
        }}
      >
        Your glossary contribution has been submitted successfully and is now under review.
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
        id="glossary-contribute-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <FormSection
          id="basic-info"
          title="Basic info"
          subtitle="These fields define the identity and summary of the term."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <FieldLabel required>Term name</FieldLabel>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Qubit"
                style={inputStyle()}
              />
            </div>

            <div>
              <FieldLabel required>Slug</FieldLabel>
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                placeholder={derivedSlug || "auto-generated-from-name"}
                style={inputStyle()}
              />
              <div
                style={{
                  fontSize: 12,
                  marginTop: 6,
                  color: "rgba(226,232,240,0.58)",
                }}
              >
                Final slug: <span style={{ color: "#7dd3fc" }}>{effectiveSlug || "—"}</span>
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
              placeholder="A short single-line description of the term."
              style={inputStyle()}
            />
          </div>
        </FormSection>

        <FormSection
          id="overview"
          title="Overview"
          subtitle="A short, accessible summary. This appears near the top of the final term page."
        >
          <FieldLabel required>Overview</FieldLabel>
          <textarea
            value={form.overview}
            onChange={(e) => updateField("overview", e.target.value)}
            placeholder="Briefly explain what this term is."
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection
          id="explanation"
          title="Explanation"
          subtitle="This is the main conceptual explanation of the term."
        >
          <FieldLabel required>Explanation</FieldLabel>
          <textarea
            value={form.explanation}
            onChange={(e) => updateField("explanation", e.target.value)}
            placeholder="Explain the concept in a clear and structured way."
            style={{ ...inputStyle(true), minHeight: 180 }}
          />
        </FormSection>

        <FormSection
          id="why-it-matters"
          title="Why it matters"
          subtitle="Explain why this term is important in the quantum ecosystem."
        >
          <FieldLabel>Why it matters</FieldLabel>
          <textarea
            value={form.whyItMatters}
            onChange={(e) => updateField("whyItMatters", e.target.value)}
            placeholder="Why does this concept matter in quantum computing, hardware, communication, or industry?"
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection
          id="intuition"
          title="Intuition / Example"
          subtitle="Use an analogy, simple example, or practical intuition."
        >
          <FieldLabel>Intuition / Example</FieldLabel>
          <textarea
            value={form.intuition}
            onChange={(e) => updateField("intuition", e.target.value)}
            placeholder="A beginner-friendly picture or example."
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection
          id="visual"
          title="Visual"
          subtitle="Optional visual information that can later appear as an image, diagram, or graphic card."
        >
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
                placeholder="e.g. Bloch sphere representation"
                style={inputStyle()}
              />
            </div>

            <div>
              <FieldLabel>Visual image URL</FieldLabel>
              <input
                value={form.visualImageUrl}
                onChange={(e) => updateField("visualImageUrl", e.target.value)}
                placeholder="Optional image URL"
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Visual description</FieldLabel>
            <textarea
              value={form.visualDescription}
              onChange={(e) => updateField("visualDescription", e.target.value)}
              placeholder="Describe what the visual should show."
              style={inputStyle(true)}
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Visual caption</FieldLabel>
            <input
              value={form.visualCaption}
              onChange={(e) => updateField("visualCaption", e.target.value)}
              placeholder="Short caption below the visual"
              style={inputStyle()}
            />
          </div>
        </FormSection>

        <FormSection
          id="math"
          title="Mathematical form"
          subtitle="Optional mathematical expression, notation, or equation."
        >
          <FieldLabel>Mathematical form</FieldLabel>
          <textarea
            value={form.math}
            onChange={(e) => updateField("math", e.target.value)}
            placeholder="e.g. |ψ⟩ = α|0⟩ + β|1⟩"
            style={inputStyle(true)}
          />
        </FormSection>

        <FormSection
          id="related-terms"
          title="Related terms"
          subtitle="Separate terms with commas."
        >
          <FieldLabel>Related terms</FieldLabel>
          <input
            value={form.relatedTerms}
            onChange={(e) => updateField("relatedTerms", e.target.value)}
            placeholder="e.g. Superposition, Bloch Sphere, Entanglement"
            style={inputStyle()}
          />
        </FormSection>

        <FormSection
          id="further-reading"
          title="Further reading"
          subtitle="One item per line. You can add titles, links, or short references."
        >
          <FieldLabel>Further reading</FieldLabel>
          <textarea
            value={form.furtherReading}
            onChange={(e) => updateField("furtherReading", e.target.value)}
            placeholder={`e.g.\nBloch Sphere — /glossary/bloch-sphere\nSuperposition — /glossary/superposition`}
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
              Required fields: term name, slug, category, level, one-line summary,
              overview, and explanation.
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
              <span>{submitting ? "Submitting..." : "Submit for review"}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function GlossaryContributeShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      <div style={{ paddingRight: 16 }}>
        <GlossaryContributeMiddle />
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
        <GlossaryContributeRightSidebar />
      </div>
    </div>
  );
}

export default function GlossaryContributePage() {
  return <GlossaryContributeShell />;
}

(GlossaryContributePage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <GlossaryContributeMiddle />,
};
