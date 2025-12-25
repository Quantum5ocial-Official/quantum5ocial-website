// /lib/qnaHelpers.ts

import { ProfileLite, ProfileMaybe } from "../types/qna";

export function pickProfile(p: ProfileMaybe): ProfileLite | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function timeAgo(iso: string) {
  const t = Date.parse(iso);
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
