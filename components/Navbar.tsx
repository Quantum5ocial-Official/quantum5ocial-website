// components/Navbar.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Load full_name + avatar from profiles so we show the edited profile data
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        setProfileName(null);
        setAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setProfileName((data.full_name as string) || null);
        setAvatarUrl((data.avatar_url as string) || null);
      } else {
        setProfileName(null);
        setAvatarUrl(null);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dashboardRef.current &&
        !dashboardRef.current.contains(e.target as Node)
      ) {
        setIsDashboardOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Fallback name from auth if profile.full_name is missing
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const fullName = profileName || fallbackName;
  const firstName =
    fullName && typeof fullName === "string"
      ? fullName.split(" ")[0] || fullName
      : "User";

  return (
    <header className="nav">
      {/* Brand – clickable to home */}
      <Link href="/" className="brand-clickable">
        <div className="brand">
          <img
            src="/Q5_white_bg.png"
            alt="Quantum5ocial logo"
            className="brand-logo"
          />
          <div>
            <div className="brand-text-main brand-text-gradient">
              Quantum5ocial
            </div>
            <div className="brand-text-sub">
              Socializing the quantum world
            </div>
          </div>
        </div>
      </Link>

      <nav className="nav-links">
        <Link href="/jobs" className="nav-link">
          Jobs
        </Link>

        <Link href="/products" className="nav-link">
          Products
        </Link>

        {/* Dashboard dropdown */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={dashboardRef}>
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={() => setIsDashboardOpen((o) => !o)}
            >
              Dashboard
            </button>

            {isDashboardOpen && (
              <div className="nav-dashboard-menu">
                <Link
                  href="/dashboard"
                  className="nav-dropdown-item"
                  onClick={() => setIsDashboardOpen(false)}
                >
                  Overview
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="nav-dropdown-item"
                  onClick={() => setIsDashboardOpen(false)}
                >
                  Saved jobs
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="nav-dropdown-item"
                  onClick={() => setIsDashboardOpen(false)}
                >
                  Saved products
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Logged-out CTA */}
        {!loading && !user && (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}

        {/* Avatar + first name dropdown */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={userMenuRef}>
            <button
              type="button"
              className="nav-user-button nav-link-button"
              onClick={() => setIsUserMenuOpen((o) => !o)}
            >
              <div className="nav-user-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={firstName} />
                ) : (
                  <span className="nav-user-initial">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="nav-user-name">{firstName}</span>
            </button>

            {isUserMenuOpen && (
              <div className="nav-dashboard-menu right-align">
                <Link
                  href="/profile"
                  className="nav-dropdown-item"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  My profile
                </Link>
                <button
                  type="button"
                  className="nav-dropdown-item nav-dropdown-danger"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
