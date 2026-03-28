// pages/glossary/[slug]/edit.tsx
import React, { useMemo, useState } from "react";
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

function toInitialForm(entry: GlossaryEntry): GlossaryFormState {
  return {
    name: entry.name,
    slug: entry.slug,
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
  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || "";
  const entry = slug ? GLOSSARY_ENTRIES[slug] : null;

  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<GlossaryFormState | null>(
    entry ? toInitialForm(entry) : null
  );

  React.useEffect(() => {
    if (entry) setForm(toInitialForm(entry));
  }, [slug]);

  if (!slug) return <section className="section" />;

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

  const updateField = <K extends keyof GlossaryFormState>(
    key: K,
    value: GlossaryFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const requiredMissing =
    !form.name.trim() ||
    !form.slug.trim() ||
    !form.category.trim() ||
    !form.level.trim() ||
    !form.oneLine.trim() ||
    !form.overview.trim() ||
    !form.explanation.trim() ||
    !form.editNote.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiredMissing) return;

    const payload = {
      originalSlug: entry.slug,
      suggestionType: "edit_existing_term",
      proposedEntry: {
        name: form.name.trim(),
        slug: form.slug.trim(),
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
      status: "pending_review",
    };

    console.log("Glossary edit suggestion payload:", payload);
    setSubmitted(true);
  };

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
            disabled={requiredMissing}
            style={{
              color: "white",
              padding: "11px 16px",
              borderRadius: 14,
              border: requiredMissing
                ? "1px solid rgba(148,163,184,0.22)"
                : "1px solid rgba(34,211,238,0.45)",
              background: requiredMissing
                ? "rgba(51,65,85,0.55)"
                : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
              boxShadow: requiredMissing ? "none" : "0 10px 28px rgba(15,23,42,0.35)",
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: requiredMissing ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ fontSize: 14 }}>✍️</span>
            <span>Submit edit suggestion</span>
          </button>
        </div>
      </div>

      {submitted ? (
        <div
          className="card"
          style={{
            padding: 22,
            marginBottom: 14,
            borderRadius: 18,
            border: "1px solid rgba(34,197,94,0.28)",
            background:
              "radial-gradient(circle at top left, rgba(34,197,94,0.10), rgba(15,23,42,0.96))",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "rgba(226,232,240,0.96)",
              marginBottom: 8,
            }}
          >
            Edit suggestion received
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "rgba(226,232,240,0.8)",
            }}
          >
            Your proposed changes have been prepared and are ready for review.
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
          subtitle="You can update the term identity and summary if needed."
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
                style={inputStyle()}
              />
            </div>

            <div>
              <FieldLabel required>Slug</FieldLabel>
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                style={inputStyle()}
              />
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
              Required: basic info, overview, explanation, and a short edit note.
            </div>

            <button
              type="submit"
              disabled={requiredMissing}
              style={{
                color: "white",
                padding: "11px 16px",
                borderRadius: 14,
                border: requiredMissing
                  ? "1px solid rgba(148,163,184,0.22)"
                  : "1px solid rgba(34,211,238,0.45)",
                background: requiredMissing
                  ? "rgba(51,65,85,0.55)"
                  : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
                boxShadow: requiredMissing ? "none" : "0 10px 28px rgba(15,23,42,0.35)",
                fontSize: 13,
                fontWeight: 800,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: requiredMissing ? "not-allowed" : "pointer",
              }}
            >
              <span style={{ fontSize: 14 }}>✍️</span>
              <span>Submit edit suggestion</span>
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
