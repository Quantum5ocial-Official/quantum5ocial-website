// lib/profileCompleteness.ts

type PublicProfileLike = {
  full_name?: string | null;
  short_bio?: string | null;
  role?: string | null;
  current_title?: string | null;
  affiliation?: string | null;
  country?: string | null;
  city?: string | null;
  focus_areas?: string | null;
  skills?: string | null;
  highest_education?: string | null;
  key_experience?: string | null;
  avatar_url?: string | null;
  orcid?: string | null;
  google_scholar?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  personal_website?: string | null;
  lab_website?: string | null;
  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
};

type PrivateProfileLike = {
  phone?: string | null;
  institutional_email?: string | null;
} | null;

type CompletenessItem = {
  key: string;
  label: string;
  w: number;
  ok: boolean;
};

function has(v: any) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

export function computePublicProfileCompleteness(p: PublicProfileLike | null) {
  const headlineOk = has(p?.current_title) || has(p?.role);

  const items: CompletenessItem[] = [
    { key: "full_name", label: "Add your full name", w: 10, ok: has(p?.full_name) },
    { key: "avatar_url", label: "Add a profile photo", w: 10, ok: has(p?.avatar_url) },
    { key: "short_bio", label: "Write a short bio", w: 10, ok: has(p?.short_bio) },
    { key: "headline", label: "Add a current title or primary role", w: 10, ok: headlineOk },

    { key: "affiliation", label: "Add your affiliation", w: 8, ok: has(p?.affiliation) },
    { key: "country", label: "Add your country", w: 4, ok: has(p?.country) },
    { key: "city", label: "Add your city", w: 4, ok: has(p?.city) },

    { key: "focus_areas", label: "Add focus areas", w: 8, ok: has(p?.focus_areas) },
    { key: "skills", label: "Add skills", w: 8, ok: has(p?.skills) },

    { key: "highest_education", label: "Select your highest education", w: 5, ok: has(p?.highest_education) },
    { key: "key_experience", label: "Add key experience", w: 5, ok: has(p?.key_experience) },

    { key: "orcid", label: "Add your ORCID", w: 4, ok: has(p?.orcid) },
    { key: "google_scholar", label: "Add Google Scholar", w: 4, ok: has(p?.google_scholar) },
    { key: "linkedin_url", label: "Add LinkedIn", w: 4, ok: has(p?.linkedin_url) },
    { key: "github_url", label: "Add GitHub", w: 3, ok: has(p?.github_url) },
    { key: "personal_website", label: "Add personal website", w: 2, ok: has(p?.personal_website) },
    { key: "lab_website", label: "Add lab or company website", w: 1, ok: has(p?.lab_website) },

    {
      key: "q5_badge",
      label: "Claim Q5 badge",
      w: 4,
      ok: has(p?.q5_badge_label) || p?.q5_badge_level != null,
    },
  ];

  const total = items.reduce((s, x) => s + x.w, 0);
  const score = items.reduce((s, x) => s + (x.ok ? x.w : 0), 0);
  const pct = total ? Math.round((score / total) * 100) : 0;

  const missing = items.filter((x) => !x.ok).sort((a, b) => b.w - a.w);
  return { pct, score, total, missing };
}

export function computeFullProfileCompleteness(
  p: PublicProfileLike | null,
  priv: PrivateProfileLike
) {
  const base = computePublicProfileCompleteness(p);

  const extra: CompletenessItem[] = [
    { key: "institutional_email", label: "Add an institutional email", w: 6, ok: has(priv?.institutional_email) },
    { key: "phone", label: "Add a phone number", w: 4, ok: has(priv?.phone) },
  ];

  const total = base.total + extra.reduce((s, x) => s + x.w, 0);
  const score = base.score + extra.reduce((s, x) => s + (x.ok ? x.w : 0), 0);
  const pct = total ? Math.round((score / total) * 100) : 0;

  const missing = [...base.missing, ...extra.filter((x) => !x.ok)].sort((a, b) => b.w - a.w);
  return { pct, score, total, missing };
}

export function computeCommunityProfileScore(p: {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  current_title?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  short_bio?: string | null;
  focus_areas?: string | null;
  skills?: string | null;
  country?: string | null;
  city?: string | null;
  orcid?: string | null;
  google_scholar?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  personal_website?: string | null;
  lab_website?: string | null;
}) {
  const has = (v: any) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  };

  const headlineOk = has(p.current_title) || has(p.role);

  const items = [
    { key: "full_name", w: 10, ok: has(p.full_name) },
    { key: "avatar_url", w: 18, ok: has(p.avatar_url) },
    { key: "headline", w: 18, ok: headlineOk },
    { key: "affiliation", w: 16, ok: has(p.affiliation) },
    { key: "highest_education", w: 12, ok: has(p.highest_education) },

    { key: "short_bio", w: 8, ok: has(p.short_bio) },
    { key: "focus_areas", w: 6, ok: has(p.focus_areas) },
    { key: "skills", w: 6, ok: has(p.skills) },

    { key: "country", w: 3, ok: has(p.country) },
    { key: "city", w: 3, ok: has(p.city) },

    { key: "orcid", w: 2, ok: has(p.orcid) },
    { key: "google_scholar", w: 2, ok: has(p.google_scholar) },
    { key: "linkedin_url", w: 4, ok: has(p.linkedin_url) },
    { key: "github_url", w: 2, ok: has(p.github_url) },
    { key: "personal_website", w: 4, ok: has(p.personal_website) },
    { key: "lab_website", w: 4, ok: has(p.lab_website) },
  ];

  const total = items.reduce((s, x) => s + x.w, 0);
  const score = items.reduce((s, x) => s + (x.ok ? x.w : 0), 0);
  const pct = total ? Math.round((score / total) * 100) : 0;

  return {
    pct,
    score,
    total,
  };
}
