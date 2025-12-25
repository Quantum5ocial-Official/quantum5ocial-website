// components/org/OrgJobsTab.tsx
import { useEffect, useState, useRef, useMemo } from "react";
import type React from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Org = {
  id: string;
  name: string;
  logo_url: string | null;
  slug?: string;
  kind: "company" | "research_group";
  hiring_status:
    | ""
    | "not_hiring"
    | "hiring_selectively"
    | "actively_hiring"
    | null;
};

type JobRow = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  salary_display: string | null;
  created_at?: string | null;
  owner_id?: string | null;
  org_id?: string | null;
};

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

function formatRelativeTime(created_at: string | null | undefined) {
  if (!created_at) return "";
  const t = Date.parse(created_at);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? "" : "s"} ago`;

  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
}

/* =========================
   ORG JOBS STRIP
   ========================= */

function OrgJobsStrip({ orgId }: { orgId: string }) {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JobRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: jobErr } = await supabase
        .from("jobs")
        .select(
          "id,title,company_name,location,employment_type,remote_type,short_description,salary_display,created_at,owner_id,org_id"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (jobErr) throw jobErr;
      setItems((data || []) as JobRow[]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load jobs.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // load saved jobs for current user
  const loadSaved = async () => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    try {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (!error && data) {
        const ids = (data || []).map((r: any) => r.job_id as string);
        setSavedIds(new Set(ids));
      } else {
        setSavedIds(new Set());
      }
    } catch (e) {
      console.error("Error loading saved jobs", e);
      setSavedIds(new Set());
    }
  };

  // realtime subscription + initial load
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadJobs();
      await loadSaved();
    };
    if (orgId) run();

    // subscribe to changes on jobs for this org
    const channel = supabase
      .channel(`org-jobs:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs", filter: `org_id=eq.${orgId}` },
        () => loadJobs()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, user]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const openJob = (jobId: string) => {
    router.push(`/jobs/${encodeURIComponent(jobId)}`);
  };

  const toggleSave = async (jobId: string) => {
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    const saved = savedIds.has(jobId);

    if (saved) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);
      if (!error) {
        setSavedIds((s) => {
          const next = new Set(s);
          next.delete(jobId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("saved_jobs")
        .insert({ user_id: user.id, job_id: jobId });
      if (!error) {
        setSavedIds((s) => new Set(s).add(jobId));
      }
    }
  };

  if (loading) return <div className="products-status">Loading jobs…</div>;
  if (error)
    return (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  if (items.length === 0)
    return <div className="products-empty">No jobs listed by this organization yet.</div>;

  const edgeBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    zIndex: 5,
    backdropFilter: "blur(8px)",
  };

  return (
    <div
      className="card"
      style={{
        position: "relative",
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.72)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(90deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(270deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <button type="button" onClick={() => scrollByCard(-1)} style={{ ...edgeBtn, left: 10 }} aria-label="Scroll left" title="Scroll left">
        ‹
      </button>
      <button type="button" onClick={() => scrollByCard(1)} style={{ ...edgeBtn, right: 10 }} aria-label="Scroll right" title="Scroll right">
        ›
      </button>

      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 44px 10px 44px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((j) => {
          const title = (j.title || "Untitled role").trim();
          const metaBits: string[] = [];
          if (j.company_name) metaBits.push(j.company_name);
          if (j.location) metaBits.push(j.location);
          if (j.remote_type) metaBits.push(j.remote_type);

          const saved = savedIds.has(j.id);

          return (
            <div
              key={j.id}
              onClick={() => openJob(j.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") openJob(j.id);
              }}
              style={{
                scrollSnapAlign: "start",
                flex: "0 0 auto",
                width: "clamp(260px, calc((100% - 24px) / 3), 420px)",
                cursor: "pointer",
              }}
            >
              <div
                className="card"
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.42)",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={title}
                    >
                      {title}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
                      {metaBits.join(" · ")}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="product-save-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSave(j.id);
                    }}
                    aria-label={saved ? "Remove from saved jobs" : "Save job"}
                    style={{ fontSize: 14 }}
                  >
                    {saved ? "❤️" : "🤍"}
                  </button>
                </div>

                {j.short_description && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: "rgba(226,232,240,0.92)",
                      whiteSpace: "pre-wrap",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      wordBreak: "break-word",
                    }}
                    title={j.short_description}
                  >
                    {j.short_description}
                  </div>
                )}

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "rgba(226,232,240,0.92)",
                    }}
                  >
                    {j.salary_display || ""}
                  </span>
                  {j.employment_type && (
                    <span
                      style={{
                        fontSize: 11,
                        borderRadius: 999,
                        padding: "2px 8px",
                        border: "1px solid rgba(148,163,184,0.4)",
                        color: "#cbd5f5",
                        background: "rgba(15,23,42,0.9)",
                      }}
                    >
                      {j.employment_type}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: 6, fontSize: 11, opacity: 0.65 }}>
                  {formatRelativeTime(j.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   PUBLIC EXPORT
   ========================= */

export default function OrgJobsTab({
  org,
  canListJob,
}: {
  org: Org;
  canListJob: boolean; // owner/co-owner only
}) {
  const router = useRouter();
  const isMobile = useIsMobile(520);

  const onPostJob = () => {
    // similar pattern as products; include org context
    const orgToken = (org.slug || org.id || "").trim();
    router.push(`/jobs/new?org=${encodeURIComponent(orgToken)}`);
  };

  /* -----------------
   hiring badge logic
   ----------------- */
const hiringBadge = useMemo(() => {
  if (!org) return null;
  if (org.kind !== "company") return null;

  const hs = org.hiring_status || "";

  // actively hiring
  if (hs === "actively_hiring") {
    return {
      text: "Actively hiring",
      title: "This company is actively hiring",
      border: "1px solid rgba(34,197,94,0.95)",
      background: "rgba(22,163,74,0.18)",
      color: "rgba(187,247,208,0.98)",
      icon: "⚡",
    };
  }

  // hiring selectively
  if (hs === "hiring_selectively") {
    return {
      text: "Hiring selectively",
      title: "This company is hiring selectively",
      border: "1px solid rgba(250,204,21,0.9)",
      background: "rgba(234,179,8,0.14)",
      color: "rgba(254,249,195,0.95)",
      icon: "✨",
    };
  }

  // explicitly not hiring
  if (hs === "not_hiring") {
    return {
      text: "Not hiring",
      title: "This company is not hiring right now",
      border: "1px solid rgba(239,68,68,0.9)", // red-ish
      background: "rgba(239,68,68,0.14)",
      color: "rgba(254,202,202,0.95)",
      icon: "🚫",
    };
  }

  // no status / empty
  // show as updates soon
  return {
    text: "Hiring updates soon",
    title: "Hiring status will be updated soon",
    border: "1px solid rgba(148,163,184,0.7)", // neutral
    background: "rgba(148,163,184,0.14)",
    color: "rgba(209,213,219,0.95)",
    icon: "🕒",
  };
}, [org]);
  /* -----------------
     header card styling
     ----------------- */
  const headerCard: CSSProperties = {
    padding: 16,
    marginBottom: 12,
    background: "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.16), rgba(15,23,42,0.98))",
    border: "1px solid rgba(148,163,184,0.35)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const primaryBtn: CSSProperties = {
    padding: "9px 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#0f172a",
    whiteSpace: "nowrap",
    border: "none",
    cursor: "pointer",
  };

  const hint: CSSProperties = {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(148,163,184,0.95)",
  };

  /* -----------------
     render
     ----------------- */
  return (
    <div style={{ marginTop: 18 }}>
      <div className="card" style={headerCard}>
        {/* left part: "We are" + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "rgba(226,232,240,0.95)",
              whiteSpace: "nowrap",
            }}
          >
            We are:
          </span>

          {hiringBadge && (
            <span
              title={hiringBadge.title}
              style={{
                fontSize: 12,
                borderRadius: 999,
                padding: "3px 10px",
                border: hiringBadge.border,
                background: hiringBadge.background,
                color: hiringBadge.color,
                fontWeight: 800,
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 12, lineHeight: 1 }}>{hiringBadge.icon}</span>
              {hiringBadge.text}
            </span>
          )}
        </div>

        {/* right part: Post a job */}
        {canListJob ? (
          <button type="button" className="nav-cta" style={{ cursor: "pointer" }} onClick={onPostJob}>
            Post a job
          </button>
        ) : (
          <button
            type="button"
            style={{
              ...primaryBtn,
              opacity: 0.45,
              cursor: "default",
            }}
            disabled
            title="Owner / co-owner only"
          >
            Post a job
          </button>
        )}
      </div>

      <OrgJobsStrip orgId={org.id} />
    </div>
  );
}
