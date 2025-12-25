import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ProfileLite, ProfileMaybe } from "../types/qna";

// ---------- BodyPortal ----------
export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ---------- pickProfile ----------
export function pickProfile(p: ProfileMaybe): ProfileLite | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

// ---------- timeAgo ----------
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

// ---------- tag pill styling ----------
export function pillTagStyle(active: boolean) {
  return {
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
    border: active
      ? "1px solid rgba(56,189,248,0.7)"
      : "1px solid rgba(148,163,184,0.45)",
    background: active ? "rgba(56,189,248,0.12)" : "rgba(15,23,42,0.55)",
    color: active ? "#7dd3fc" : "rgba(226,232,240,0.9)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}

// ---------- avatarBubble ----------
export function avatarBubble(
  name: string,
  avatar_url: string | null,
  size = 28
) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(148,163,184,0.5)",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f172a",
        fontWeight: 800,
        fontSize: Math.max(12, Math.floor(size * 0.45)),
      }}
    >
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

// ---------- useIsMobile hook ----------
export function useIsMobile(maxWidth = 520) {
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
