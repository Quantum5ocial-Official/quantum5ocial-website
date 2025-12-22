// pages/ecosystem/my-posts.tsx
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import UserPostsFeed from "../../components/UserPostsFeed";

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
      {/* keep your existing header links (optional) */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
          ← Back to ecosystem
        </Link>
        <Link href="/" className="section-link" style={{ fontSize: 13 }}>
          Go to feed →
        </Link>
      </div>

      {user?.id ? (
        <UserPostsFeed
          userId={user.id}
          headerTitle="Posts"
          headerSubtitle="Your public posts on the global feed."
          viewAllHref={undefined}
          limit={200}
          showHeader={true}
          showOpenInFeed={true}
          searchEnabled={true}
        />
      ) : null}
    </section>
  );
}

(EcosystemMyPostsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
