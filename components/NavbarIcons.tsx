// components/NavbarIcons.tsx
import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Theme = "dark" | "light";

// Shared sizing
const NAV_BLOCK_HEIGHT = 68;
const NAV_HEADER_HEIGHT = 84;
const NAV_BLOCK_MIN_WIDTH = 90;

export default function NavbarIcons() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");
  const [hasOrganizations, setHasOrganizations] = useState(false);

  // mobile drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [notificationsCount, setNotificationsCount] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");

  const handleGlobalSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // ---------------- Responsive ----------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ---------------- Theme ----------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("q5_theme");
    const initial: Theme = stored === "light" ? "light" : "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("theme-light", initial === "light");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("theme-light", next === "light");
      window.localStorage.setItem("q5_theme", next);
      return next;
    });
  };

  // ---------------- Profile ----------------
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled && data) {
        setProfileName(data.full_name || null);
        setAvatarUrl(data.avatar_url || null);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ---------------- Organizations ----------------
  useEffect(() => {
    let cancelled = false;

    const checkOrganizations = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("organizations")
        .select("id")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!cancelled) setHasOrganizations(!!data);
    };

    checkOrganizations();
    return () => {
      cancelled = true;
    };
  }, [user, router.pathname]);

  // ---------------- Notifications ----------------
  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!user) return setNotificationsCount(0);

      const { count: pending } = await supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", user.id)
        .eq("status", "pending");

      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (!cancelled) setNotificationsCount((pending || 0) + (unread || 0));
    };

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [user, router.pathname]);

  // ---------------- Helpers ----------------
  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + "/");

  const fallbackName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const firstName = (profileName || fallbackName).split(" ")[0];

  const renderIconNavLink = (
    href: string,
    label: string,
    iconSrc: string,
    badgeCount?: number,
    iconSize = 36
  ) => {
    const active = isActive(href);
    const showBadge = typeof badgeCount === "number" && badgeCount > 0;

    return (
      <Link href={href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
        <div
          style={{
            position: "relative",
            height: NAV_BLOCK_HEIGHT,
            minWidth: NAV_BLOCK_MIN_WIDTH,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            borderRadius: 16,
            background: active
              ? "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.6), rgba(15,23,42,0.98))"
              : "transparent",
            boxShadow: active
              ? "0 0 0 1px rgba(56,189,248,0.7), 0 0 18px rgba(56,189,248,0.45)"
              : "none",
          }}
        >
          <img
            src={iconSrc}
            alt={label}
            style={{ width: iconSize, height: iconSize }}
          />

          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(226,232,240,0.96)",
            }}
          >
            {label}
          </span>

          {showBadge && (
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 10,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: "#ef4444",
                color: "#fff",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {badgeCount! > 9 ? "9+" : badgeCount}
            </span>
          )}
        </div>
      </Link>
    );
  };

  // ================= RENDER =================
  return (
    <header className="nav">
      <div className="nav-inner" style={{ height: NAV_HEADER_HEIGHT }}>
        {!isMobile && (
          <nav className="nav-links nav-links-desktop">
            {renderIconNavLink("/jobs", "Jobs", "/icons/jobs.svg")}
            {renderIconNavLink("/products", "Products", "/icons/products.svg")}
            {renderIconNavLink("/community", "Community", "/icons/community.svg")}
            {renderIconNavLink("/qna", "QnA", "/icons/qna.svg", undefined, 40)}
            {!loading &&
              user &&
              renderIconNavLink(
                "/notifications",
                "Notifications",
                "/icons/notifications.svg",
                notificationsCount
              )}

            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
