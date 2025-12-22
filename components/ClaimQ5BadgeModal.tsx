import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { computeQ5Badge, type BadgeAnswers } from "../lib/q5Badge";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  onClaimed?: (r: { level: number; label: string; review_status: string }) => void;
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,0.65)",
  backdropFilter: "blur(8px)",
  zIndex: 60,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle: React.CSSProperties = {
  width: "min(680px, 100%)",
  borderRadius: 18,
  border: "1px solid rgba(148,163,184,0.22)",
  background:
    "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.14), rgba(15,23,42,0.96))",
  boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
  padding: 16,
};

const pillBtn: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(2,6,23,0.35)",
  padding: "7px 12px",
  color: "rgba(226,232,240,0.95)",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const ctaBtn: React.CSSProperties = {
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
  padding: "9px 14px",
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.22)",
  color: "rgba(226,232,240,0.95)",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

const steps = [
  { key: "involvement", title: "Quantum involvement" },
  { key: "contribution", title: "Contribution depth" },
  { key: "role_context", title: "Role context" },
  { key: "education", title: "Highest education" },
  { key: "impact", title: "Recognition / impact" },
] as const;

export default function ClaimQ5BadgeModal({
  open,
  onClose,
  userId,
  onClaimed,
}: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [answers, setAnswers] = useState<BadgeAnswers>({
    involvement: 0,
    contribution: 0,
    role_context: "Student / Trainee",
    education: "Bachelor",
    impact: 0,
  });

  const result = useMemo(() => computeQ5Badge(answers), [answers]);

  if (!open) return null;

  const close = () => {
    setErr(null);
    setStep(0);
    onClose();
  };

  const next = () => setStep((s) => Math.min(s + 1, steps.length));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const saveClaim = async () => {
    setSaving(true);
    setErr(null);

    try {
      const r = computeQ5Badge(answers);

      // ✅ UPSERT claim (one row per user)
      const { data: claimRow, error: e1 } = await supabase
        .from("profile_badge_claims")
        .upsert(
          {
            user_id: userId,
            involvement: answers.involvement,
            contribution: answers.contribution,
            role_context: answers.role_context,
            education: answers.education,
            impact: answers.impact,
            computed_level: r.level,
            computed_label: r.label,
            review_status: r.review_status,
          },
          { onConflict: "user_id" }
        )
        .select("computed_level, computed_label, review_status")
        .maybeSingle();

      if (e1) throw e1;

      const finalLevel = (claimRow as any)?.computed_level ?? r.level;
      const finalLabel = (claimRow as any)?.computed_label ?? r.label;
      const finalStatus = (claimRow as any)?.review_status ?? r.review_status;

      // ✅ Mirror into profiles (fast read everywhere)
      const { error: e2 } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            q5_badge_level: finalLevel,
            q5_badge_label: finalLabel,
            q5_badge_claimed_at: new Date().toISOString(),
            q5_badge_review_status: finalStatus,
          },
          { onConflict: "id" }
        );

      if (e2) throw e2;

      onClaimed?.({
        level: finalLevel,
        label: finalLabel,
        review_status: finalStatus,
      });

      close();
    } catch (e: any) {
      setErr(e?.message || "Could not claim badge.");
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    const k = steps[step]?.key;

    if (k === "involvement") {
      return (
        <>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
            Which best describes you today?
          </div>
          <select
            style={fieldStyle}
            value={answers.involvement}
            onChange={(e) =>
              setAnswers((p) => ({ ...p, involvement: Number(e.target.value) }))
            }
          >
            <option value={0}>
              Q5-Observer — I am not yet working in quantum, but I want to engage.
            </option>
            <option value={1}>Q5-Initiate — I’m learning / transitioning into quantum.</option>
            <option value={2}>Q5-Practitioner — I’m actively contributing to quantum work.</option>
            <option value={3}>Q5-Expert track — I deliver independently at a professional level.</option>
            <option value={4}>Leadership track — I lead teams/products/research in quantum.</option>
          </select>
        </>
      );
    }

    if (k === "contribution") {
      return (
        <>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
            What best matches your contribution level in the last 12 months?
          </div>
          <select
            style={fieldStyle}
            value={answers.contribution}
            onChange={(e) =>
              setAnswers((p) => ({ ...p, contribution: Number(e.target.value) }))
            }
          >
            <option value={0}>Exploring / learning only</option>
            <option value={1}>Assisted on projects (supporting contributor)</option>
            <option value={2}>Delivered independently (owned work end-to-end)</option>
            <option value={3}>Led projects/teams/products (people or technical leadership)</option>
            <option value={4}>Field-shaping contributions (widely adopted results)</option>
          </select>
        </>
      );
    }

    if (k === "role_context") {
      return (
        <>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
            Which describes your primary role right now?
          </div>
          <select
            style={fieldStyle}
            value={answers.role_context}
            onChange={(e) => setAnswers((p) => ({ ...p, role_context: e.target.value }))}
          >
            <option>Student / Trainee</option>
            <option>Researcher / Scientist</option>
            <option>Engineer (hardware/software/RF/cryogenics/fab)</option>
            <option>Product / Business / BD</option>
            <option>Founder / Executive</option>
            <option>Investor / Advisor</option>
            <option>Policy / Ecosystem builder</option>
            <option>Other</option>
          </select>
        </>
      );
    }

    if (k === "education") {
      return (
        <>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
            Highest completed education level
          </div>
          <select
            style={fieldStyle}
            value={answers.education}
            onChange={(e) => setAnswers((p) => ({ ...p, education: e.target.value }))}
          >
            <option>Secondary / High school</option>
            <option>Bachelor</option>
            <option>Master</option>
            <option>PhD</option>
            <option>Postdoc / Other-not-applicable</option>
          </select>
        </>
      );
    }

    if (k === "impact") {
      return (
        <>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>
            How broadly has your work been recognized or used?
          </div>
          <select
            style={fieldStyle}
            value={answers.impact}
            onChange={(e) => setAnswers((p) => ({ ...p, impact: Number(e.target.value) }))}
          >
            <option value={0}>Not yet / personal learning only</option>
            <option value={1}>Within my team / lab / company</option>
            <option value={2}>Across multiple teams or external collaborators</option>
            <option value={3}>Adopted externally (customers/community)</option>
            <option value={4}>Field-defining / standard / globally recognized</option>
          </select>
        </>
      );
    }

    return null;
  };

  const isLast = step === steps.length - 1;

  return (
    <div style={overlayStyle} onMouseDown={close}>
      <div style={modalStyle} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Claim your Q5 badge</div>
            <div style={{ opacity: 0.85, fontSize: 13, marginTop: 3 }}>
              Answer a few questions. We’ll assign your level automatically.
            </div>
          </div>
          <button style={pillBtn} onClick={close} type="button">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div
              key={s.key}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.22)",
                background: i === step ? "rgba(56,189,248,0.10)" : "rgba(2,6,23,0.18)",
                fontSize: 12,
                fontWeight: 900,
                opacity: i === step ? 1 : 0.75,
              }}
            >
              {i + 1}. {s.title}
            </div>
          ))}
        </div>

        {/* Body */}
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            background: "rgba(2,6,23,0.25)",
          }}
        >
          {renderStep()}
        </div>

        {/* Preview */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 900 }}>
              Preview:{" "}
              <span style={{ color: "rgba(34,211,238,0.95)" }}>{result.label}</span>
              {result.review_status === "pending" ? " (review)" : ""}
            </div>
            <div style={{ opacity: 0.85, marginTop: 2 }}>{result.rationale}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={pillBtn} type="button" onClick={back} disabled={step === 0}>
              Back
            </button>

            {!isLast ? (
              <button style={ctaBtn} type="button" onClick={next}>
                Next →
              </button>
            ) : (
              <button style={ctaBtn} type="button" onClick={saveClaim} disabled={saving}>
                {saving ? "Claiming…" : "Claim badge"}
              </button>
            )}
          </div>
        </div>

        {err && (
          <div style={{ marginTop: 10, color: "#f87171", fontWeight: 900, fontSize: 13 }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
