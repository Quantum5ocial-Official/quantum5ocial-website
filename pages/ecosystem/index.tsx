// pages/ecosystem/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function EcosystemIndexPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [entangledCount, setEntangledCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [savedPostsCount, setSavedPostsCount] = useState(0);

  const [myPostsCount, setMyPostsCount] = useState(0);
  const [questionsAskedCount, setQuestionsAskedCount] = useState(0);
  const [questionsAnsweredCount, setQuestionsAnsweredCount] = useState(0);

  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      return;
    }

    const loadValidEntangledCount = async (userId: string) => {
      const { data: connData, error: connErr } = await supabase
        .from("connections")
        .select("user_id, target_user_id")
        .eq("status", "accepted")
        .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

      if (connErr) throw connErr;

      const otherIds = Array.from(
        new Set(
          (connData || []).map((c: any) =>
            c.user_id === userId ? c.target_user_id : c.user_id
          )
        )
      ).filter((id) => !!id && id !== userId);

      if (otherIds.length === 0) return 0;

      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select("id")
        .in("id", otherIds);

      if (profErr) throw profErr;

      return (profData || []).length;
    };

    const loadCounts = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        const validEntangledCount = await loadValidEntangledCount(user.id);
        setEntangledCount(validEntangledCount);

        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followErr) throw followErr;

        setFollowingCount(
          new Set((followRows || []).map((r: any) => r.org_id)).size
        );

        const { data: savedJobs, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        if (savedJobsErr) throw savedJobsErr;
        setSavedJobsCount(savedJobs?.length || 0);

        const { data: savedProducts, error: savedProductsErr } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        if (savedProductsErr) throw savedProductsErr;
        setSavedProductsCount(savedProducts?.length || 0);

        const { data: savedPosts, error: savedPostsErr } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", user.id);

        if (savedPostsErr) throw savedPostsErr;
        setSavedPostsCount(savedPosts?.length || 0);

        const { data: myPosts, error: myPostsErr } = await supabase
          .from("posts")
          .select("id")
          .eq("user_id", user.id);

        if (myPostsErr) throw myPostsErr;
        setMyPostsCount(myPosts?.length || 0);

        const { data: askedQs, error: askedQsErr } = await supabase
          .from("qna_questions")
          .select("id")
          .eq("user_id", user.id);

        if (askedQsErr) throw askedQsErr;
        setQuestionsAskedCount(askedQs?.length || 0);

        const { data: answers, error: answersErr } = await supabase
          .from("qna_answers")
          .select("id")
          .eq("user_id", user.id);

        if (answersErr) throw answersErr;
        setQuestionsAnsweredCount(answers?.length || 0);
      } catch (e) {
        console.error("Ecosystem count error", e);
        setErrorMsg("Could not load your ecosystem right now.");
      } finally {
        setMainLoading(false);
      }
    };

    void loadCounts();
  }, [user]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 16,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.95))",
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
            <div className="section-title">My ecosystem</div>
            <div className="section-sub" style={{ maxWidth: 680 }}>
              Your personal quantum5ocial dashboard. This would be customize-able soon.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/community" className="section-link">
              Explore community →
            </Link>
            <Link href="/orgs" className="section-link">
              Discover organizations →
            </Link>
          </div>
        </div>
      </div>

      {mainLoading && <div className="products-status">Loading your ecosystem…</div>}
      {errorMsg && !mainLoading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {errorMsg}
        </div>
      )}

      {!mainLoading && !errorMsg && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <Tile
            href="/ecosystem/entangled"
            label="Entanglements"
            count={entangledCount}
            icon="🧬"
            color="#22d3ee"
            description="People you are connected with in the quantum ecosystem."
          />

          <Tile
            href="/ecosystem/following"
            label="Organizations I follow"
            count={followingCount}
            icon="🏢"
            color="#a855f7"
            description="Companies and research groups you track."
          />

          <Tile
            href="/ecosystem/saved-jobs"
            label="Saved jobs"
            count={savedJobsCount}
            icon="💼"
            color="#22c55e"
            description="Roles you’ve bookmarked for later."
          />

          <Tile
            href="/ecosystem/saved-products"
            label="Saved products"
            count={savedProductsCount}
            icon="🛒"
            color="#f59e0b"
            description="Marketplace items you want to revisit."
          />

          <Tile
            href="/ecosystem/saved-posts"
            label="Saved posts"
            count={savedPostsCount}
            icon="📌"
            color="#ec4899"
            description="Posts you bookmarked for later reading."
          />

          <Tile
            href="/ecosystem/my-posts"
            label="My posts"
            count={myPostsCount}
            icon="📝"
            color="#94a3b8"
            description="Your posts in the global feed."
          />

          <Tile
            href="/ecosystem/questions-asked"
            label="Questions asked"
            count={questionsAskedCount}
            icon="❓"
            color="#60a5fa"
            description="Questions you posted to Q&A."
          />

          <Tile
            href="/ecosystem/questions-answered"
            label="Questions answered"
            count={questionsAnsweredCount}
            icon="✅"
            color="#34d399"
            description="Q&A threads where you replied."
          />

          <Tile
            href="/ecosystem/publications"
            label="My publications"
            count={0}
            icon="📚"
            color="#f472b6"
            description="Your papers, preprints, and publication links."
          />

          <Tile
            href="/ecosystem/cv"
            label="My CV"
            count={0}
            icon="📄"
            color="#f97316"
            description="Your CV / resume, editable and shareable."
          />
        </div>
      )}
    </section>
  );
}

function Tile({
  href,
  label,
  count,
  description,
  icon,
  color,
}: {
  href: string;
  label: string;
  count: number;
  description: string;
  icon: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        textDecoration: "none",
        color: "inherit",
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${color}66`,
        background: `radial-gradient(circle at top left, ${color}22, rgba(15,23,42,0.96))`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color,
            }}
          >
            {label}
          </div>
          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>
            {count}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
            {description}
          </div>
        </div>
        <div style={{ fontSize: 18 }}>{icon}</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color }}>Open →</div>
    </Link>
  );
}

(EcosystemIndexPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
