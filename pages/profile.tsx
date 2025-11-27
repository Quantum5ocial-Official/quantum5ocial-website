// pages/profile.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;
  role: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
  focus_areas: string | null;
  skills: string | null;
  highest_education: string | null;
};

export default function ProfileViewPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/profile");
    }
  }, [loading, user, router]);

  // Load profile from Supabase
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }

      setProfileLoading(false);
    };

    if (user) loadProfile();
  }, [user]);

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const displayName = profile?.full_name || fallbackName;

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  const focusTags =
    profile?.focus_areas
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  const skillTags =
    profile?.skills
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          {/* Page header */}
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">My profile</div>
              <div className="section-sub">
                This is how you appear inside Quantum5ocial.
              </div>
            </div>

            <Link href="/profile/edit" className="nav-ghost-btn">
              Edit / complete profile
            </Link>
          </div>

          <div className="profile-summary-card">
            {profileLoading ? (
              <p className="profile-muted">Loading your profile…</p>
            ) : (
              <>
                {/* Top identity */}
                <div className="profile-header">
                  <div className="profile-avatar">
                    <span>{initials || "Q5"}</span>
                  </div>
                  <div className="profile-header-text">
                    <div className="profile-name">{displayName}</div>

                    {(profile?.role || profile?.affiliation) && (
                      <div className="profile-role">
                        {[profile?.role, profile?.affiliation]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}

                    {(profile?.city || profile?.country) && (
                      <div className="profile-location">
                        {[profile?.city, profile?.country]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio */}
                {profile?.short_bio && (
                  <p className="profile-bio">{profile.short_bio}</p>
                )}

                {/* Affiliation / education */}
                <div className="profile-summary-columns">
                  {profile?.affiliation && (
                    <div className="profile-summary-item">
                      <div className="profile-summary-label">Affiliation</div>
                      <div className="profile-summary-text">
                        {profile.affiliation}
                      </div>
                    </div>
                  )}

                  {profile?.highest_education && (
                    <div className="profile-summary-item">
                      <div className="profile-summary-label">
                        Highest education
                      </div>
                      <div className="profile-summary-text">
                        {profile.highest_education}
                      </div>
                    </div>
                  )}
                </div>

                {/* Focus areas & skills */}
                {(focusTags.length > 0 || skillTags.length > 0) && (
                  <div className="profile-tags-block" style={{ marginTop: 10 }}>
                    {focusTags.length > 0 && (
                      <div>
                        <div className="profile-tags-label">Focus areas</div>
                        <div className="profile-tags">
                          {focusTags.map((tag) => (
                            <span key={tag} className="profile-tag-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {skillTags.length > 0 && (
                      <div>
                        <div className="profile-tags-label">Skills</div>
                        <div className="profile-tags">
                          {skillTags.map((tag) => (
                            <span key={tag} className="profile-tag-chip">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit button at bottom as well */}
                <div className="profile-summary-actions">
                  <Link href="/profile/edit" className="nav-ghost-btn">
                    Edit / complete your profile
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
