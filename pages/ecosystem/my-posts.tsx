import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import FeedList from "../../components/feed/FeedList";

export default function EcosystemMyPostsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/my-posts");
    }
  }, [loading, user, router]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header card */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.18), rgba(15,23,42,0.96))",
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
            <div className="section-title">📝 My posts</div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              Your public posts on the global feed — same view as homepage (likes/comments included).
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <Link href="/profile" className="section-link" style={{ fontSize: 13 }}>
              ← Back to profile
            </Link>
            <Link href="/" className="section-link" style={{ fontSize: 13 }}>
              Go to feed →
            </Link>
          </div>
        </div>
      </div>

      {/* Feed only (filtered to me) */}
      <FeedList
        filterUserId={user?.id}
        limit={200}
        hideCopyLink
        imageFit="contain"
      />
    </section>
  );
}

(EcosystemMyPostsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
