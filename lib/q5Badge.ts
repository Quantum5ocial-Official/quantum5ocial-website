export type BadgeAnswers = {
  involvement: number;   // 0..4
  contribution: number;  // 0..4
  role_context: string;
  education: string;
  impact: number;        // 0..4
};

export type BadgeResult = {
  level: number;         // 0..5
  label: string;         // e.g. "Q5-Expert"
  review_status: "auto" | "pending" | "verified";
  rationale: string;     // short explanation for the UI
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computeQ5Badge(a: BadgeAnswers): BadgeResult {
  const involvementMax = clamp(a.involvement, 0, 4);

  // Weighted score (0..100-ish), then mapped to 0..5.
  // involvement is also a hard cap on max level.
  const score =
    (clamp(a.contribution, 0, 4) * 18) +   // 0..72
    (clamp(a.impact, 0, 4) * 10) +         // 0..40
    (["PhD", "Postdoc / Other-not-applicable"].includes(a.education) ? 6 : 0) +
    (["Master"].includes(a.education) ? 3 : 0);

  // base from score
  let level = 0;
  if (score >= 15) level = 1;
  if (score >= 35) level = 2;
  if (score >= 55) level = 3;
  if (score >= 75) level = 4;
  if (score >= 95) level = 5;

  // cap by involvement track (0..4 -> max 0..4 unless we let 5 only via impact)
  // Rule: Authority (5) requires involvement=4 AND impact>=4 AND contribution>=4.
  if (!(involvementMax >= 4 && a.impact >= 4 && a.contribution >= 4)) {
    level = Math.min(level, involvementMax); // involvement 0..4 caps level 0..4
  }

  // Labels
  const labelByLevel: Record<number, string> = {
    0: "Q5-Observer",
    1: "Q5-Initiate",
    2: "Q5-Practitioner",
    3: "Q5-Expert",
    4: "Q5-Pioneer",
    5: "Q5-Authority",
  };

  const label = labelByLevel[level] || "Q5-Observer";

  // Review rule: Authority is extremely rare => always pending review.
  let review_status: BadgeResult["review_status"] = "auto";
  if (level === 5) review_status = "pending";

  const rationale =
    level === 0
      ? "You’re joining the ecosystem—welcome in."
      : level === 5
      ? "Authority is reviewed for verification."
      : "Based on your contribution + impact signals.";

  return { level, label, review_status, rationale };
}
