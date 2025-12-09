// pages/notifications.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Sidebar profile summary (aligned with homepage/community)
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  describes_you: string | null;
  affiliation: string | null;
  current_org: string | null;
  country: string | null;
  city: string | null;
};

// Minimal org summary for sidebar tile
type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

// Connection row (pending / accepted / declined)
type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: string;
  created_at: string | null;
};

// Minimal profile for request & entanglement cards
type UserProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type PendingRequest = {
  connectionId: string;
  created_at: string | null;
  sender: UserProfile;
};

type RecentEntanglement = {
  connectionId: string;
  created_at: string | null;
  status: "accepted" | "declined" | "rejected";
  isSender: boolean; // is *current* user the one who sent the request?
  otherUser: UserProfile;
};

export default function NotificationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Sidebar state
  const [sidebarProfile, setSidebarProfile] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  // My organization for sidebar tile
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);
  const [loadingMyOrg, setLoadingMyOrg] = useState<boolean>(true);

  // Notifications data
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionLoadingIds, setActionLoadingIds] = useState<string[]>([]);

  const [recentEntanglements, setRecentEntanglements] = useState<
    RecentEntanglement[]
  >([]);
  const [loadingEntanglements, setLoadingEntanglements] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/notifications");
    }
  }, [loading, user, router]);

  // Format date/time for entanglement cards
  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Load sidebar profile + counts
  useEffect(() => {
    const loadSidebar = async () => {
      if (!user) {
        setSidebarProfile(null);
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        // Profile
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, describes_you, affiliation, current_org, country, city"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && prof) {
          setSidebarProfile(prof as ProfileSummary);
        } else {
          setSidebarProfile(null);
        }

        // Saved jobs
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // Saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // Entangled states (unique others in accepted connections)
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (!connErr && connRows && connRows.length > 0) {
          const otherIds = Array.from(
            new Set(
              connRows.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        } else {
          setEntangledCount(0);
        }
      } catch (e) {
        console.error("Error loading notifications sidebar", e);
        setSidebarProfile(null);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadSidebar();
  }, [user]);

  // Load FIRST organization created by this user for sidebar tile
  useEffect(() => {
    const loadMyOrg = async () => {
      if (!user) {
        setMyOrg(null);
        setLoadingMyOrg(false);
        return;
      }

      setLoadingMyOrg(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setMyOrg(data as MyOrgSummary);
      } else {
        setMyOrg(null);
        if (error) {
          console.error("Error loading my organization for sidebar", error);
        }
      }
      setLoadingMyOrg(false);
    };

    loadMyOrg();
  }, [user]);

  // Load pending requests (status=pending where current user is target)
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!user) {
        setPendingRequests([]);
        setLoadingRequests(false);
        return;
      }

      setLoadingRequests(true);
      setRequestsError(null);

      try {
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .eq("target_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (connErr) throw connErr;

        if (!connRows || connRows.length === 0) {
          setPendingRequests([]);
          return;
        }

        const senderIds = Array.from(
          new Set((connRows as ConnectionRow[]).map((c) => c.user_id))
        );

        const { data: senderProfiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, country, city"
          )
          .in("id", senderIds);

        if (profErr) throw profErr;

        const profilesById: Record<string, UserProfile> = {};
        (senderProfiles || []).forEach((p: any) => {
          profilesById[p.id] = p as UserProfile;
        });

        const requests: PendingRequest[] = (connRows as ConnectionRow[])
          .map((c) => {
            const sender = profilesById[c.user_id];
            if (!sender) return null;
            return {
              connectionId: c.id,
              created_at: c.created_at,
              sender,
            };
          })
          .filter(Boolean) as PendingRequest[];

        setPendingRequests(requests);
      } catch (e) {
        console.error("Error loading pending requests", e);
        setRequestsError(
          "Could not load your notifications. Please try again later."
        );
        setPendingRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadPendingRequests();
  }, [user]);

  // Load recent entanglements (accepted + declined where current user is either side)
  useEffect(() => {
    const loadEntanglements = async () => {
      if (!user) {
        setRecentEntanglements([]);
        setLoadingEntanglements(false);
        return;
      }

      setLoadingEntanglements(true);

      try {
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .in("status", ["accepted", "declined", "rejected"])
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(30);

        if (connErr) throw connErr;
        if (!connRows || connRows.length === 0) {
          setRecentEntanglements([]);
          return;
        }

        const rows = connRows as ConnectionRow[];

        // figure out whom to load profiles for
        const otherIdByConnection: Record<string, string> = {};
        const isSenderByConnection: Record<string, boolean> = {};
        const otherIdsSet = new Set<string>();

        rows.forEach((c) => {
          const isSender = c.user_id === user.id;
          const otherId = isSender ? c.target_user_id : c.user_id;
          isSenderByConnection[c.id] = isSender;
          otherIdByConnection[c.id] = otherId;
          otherIdsSet.add(otherId);
        });

        const otherIds = Array.from(otherIdsSet);

        const { data: otherProfiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, country, city"
          )
          .in("id", otherIds);

        if (profErr) throw profErr;

        const profilesById: Record<string, UserProfile> = {};
        (otherProfiles || []).forEach((p: any) => {
          profilesById[p.id] = p as UserProfile;
        });

        const entanglements: RecentEntanglement[] = rows
          .map((c) => {
            const otherId = otherIdByConnection[c.id];
            const otherUser = profilesById[otherId];
            if (!otherUser) return null;

            const status =
              (c.status as "accepted" | "declined" | "rejected") || "accepted";

            return {
              connectionId: c.id,
              created_at: c.created_at,
              status,
              isSender: isSenderByConnection[c.id],
              otherUser,
            };
          })
          .filter(Boolean) as RecentEntanglement[];

        setRecentEntanglements(entanglements);
      } catch (e) {
        console.error("Error loading entanglements", e);
        setRecentEntanglements([]);
      } finally {
        setLoadingEntanglements(false);
      }
    };

    loadEntanglements();
  }, [user]);

  const isActionLoading = (connectionId: string) =>
    actionLoadingIds.includes(connectionId);

  const handleRespond = async (
    connectionId: string,
    accept: boolean,
    sender?: UserProfile
  ) => {
    if (!user) {
      router.push("/auth?redirect=/notifications");
      return;
    }

    setActionLoadingIds((prev) => [...prev, connectionId]);

    try {
      if (accept) {
        // Simple accept: set status = 'accepted'
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", connectionId);

        if (error) {
          console.error("Error accepting connection", error);
        } else {
          // Remove from pending list
          setPendingRequests((prev) =>
            prev.filter((r) => r.connectionId !== connectionId)
          );

          // Add to recent entanglements immediately (you are target here)
          if (sender) {
            setRecentEntanglements((prev) => [
              {
                connectionId,
                created_at: new Date().toISOString(),
                status: "accepted",
                isSender: false,
                otherUser: sender,
              },
              ...prev,
            ]);
          }
        }
      } else {
        // Decline: try status = 'declined', fallback to delete
        const { error } = await supabase
          .from("connections")
          .update({ status: "declined" })
          .eq("id", connectionId);

        if (error) {
          console.error(
            "Error declining connection, falling back to delete",
            error
          );
          const { error: deleteError } = await supabase
            .from("connections")
            .delete()
            .eq("id", connectionId);

          if (deleteError) {
            console.error(
              "Error deleting connection on decline fallback",
              deleteError
            );
          }
        }

        // Remove from pending list locally
        setPendingRequests((prev) =>
          prev.filter((r) => r.connectionId !== connectionId)
        );

        if (sender) {
          setRecentEntanglements((prev) => [
            {
              connectionId,
              created_at: new Date().toISOString(),
              status: "declined",
              isSender: false,
              otherUser: sender,
            },
            ...prev,
          ]);
        }
      }
    } catch (e) {
      console.error("Unexpected error updating connection", e);
    } finally {
      setActionLoadingIds((prev) =>
        prev.filter((id) => id !== connectionId)
      );
    }
  };

  if (!user && !loading) return null;

  // Sidebar helpers (same pattern as community/homepage)
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    sidebarProfile?.full_name || fallbackName || "Your profile";

  const avatarUrl = sidebarProfile?.avatar_url || null;
  const educationLevel = sidebarProfile?.highest_education || "";
  const describesYou =
    sidebarProfile?.describes_you || sidebarProfile?.role || "";
  const affiliation =
    sidebarProfile?.affiliation ||
    sidebarProfile?.current_org ||
    [sidebarProfile?.city, sidebarProfile?.country].filter(Boolean).join(", ");

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const entangledLabel = !user
    ? "Entangled states"
    : `Entangled states (${entangledCount === null ? "…" : entangledCount})`;

  const savedJobsLabel = !user
    ? "Saved jobs"
    : `Saved jobs (${savedJobsCount === null ? "…" : savedJobsCount})`;

  const savedProductsLabel = !user
    ? "Saved products"
    : `Saved products (${
        savedProductsCount === null ? "…" : savedProductsCount
      })`;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR – same as homepage/community */}
          <aside
            className="layout-left sticky-col"
            style={{
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid rgba(148,163,184,0.18)", // vertical divider
              paddingRight: 16,
            }}
          >
            {/* Profile card – clickable */}
            <Link
              href="/profile"
              className="sidebar-card profile-sidebar-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={sidebarFullName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarFullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-name">{sidebarFullName}</div>
              </div>

              {hasProfileExtraInfo && (
                <div className="profile-sidebar-info-block">
                  {educationLevel && (
                    <div className="profile-sidebar-info-value">
                      {educationLevel}
                    </div>
                  )}
                  {describesYou && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {describesYou}
                    </div>
                  )}
                  {affiliation && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {affiliation}
                    </div>
                  )}
                </div>
              )}
            </Link>

            {/* Quick dashboard */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  {entangledLabel}
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  {savedJobsLabel}
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  {savedProductsLabel}
                </Link>
              </div>
            </div>

            {/* My organization tile */}
            {user && !loadingMyOrg && myOrg && (
              <div
                className="sidebar-card dashboard-sidebar-card"
                style={{ marginTop: 16 }}
              >
                <div className="dashboard-sidebar-title">My organization</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {/* Logo + name row */}
                  <Link
                    href={`/orgs/${myOrg.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid rgba(148,163,184,0.45)",
                        background:
                          "linear-gradient(135deg,#3bc7f3,#8468ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {myOrg.logo_url ? (
                        <img
                          src={myOrg.logo_url}
                          alt={myOrg.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        myOrg.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {myOrg.name}
                    </div>
                  </Link>

                  {/* Simple stats (placeholder) */}
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(148,163,184,0.95)",
                      marginTop: 4,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div>
                      Followers:{" "}
                      <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div>
                      Views:{" "}
                      <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Link
                        href="/dashboard/my-organizations"
                        style={{
                          color: "#7dd3fc",
                          textDecoration: "none",
                        }}
                      >
                        Analytics →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social icons + brand logo/name */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Icons row */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 18,
                  alignItems: "center",
                }}
              >
                {/* Email */}
                <a
                  href="mailto:info@quantum5ocial.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Quantum5ocial"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                    <polyline points="3 7 12 13 21 7" />
                  </svg>
                </a>

                {/* X icon */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on X"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4l8 9.5L20 4" />
                    <path d="M4 20l6.5-7.5L20 20" />
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on GitHub"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.49.55-3.01-1.09-3.01-1.09-.45-1.17-1.11-1.48-1.11-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-1.99-.23-4.09-1.03-4.09-4.6 0-1.02.35-1.85.93-2.5-.09-.23-.4-1.16.09-2.42 0 0 .75-.25 2.46.95A8.23 8.23 0 0 1 12 6.84c.76 0 1.53.1 2.25.29 1.7-1.2 2.45-.95 2.45-.95.5 1.26.19 2.19.09 2.42.58.65.93 1.48.93 2.5 0 3.58-2.11 4.37-4.12 4.6.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                  </svg>
                </a>
              </div>

              {/* Brand row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Quantum5ocial
                </span>
              </div>
            </div>
          </aside>

          {/* CENTER – NOTIFICATIONS */}
          <section className="layout-center">
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title">Notifications</div>
                <div className="section-sub">
                  Entanglement activity in your Quantum5ocial ecosystem.
                </div>
              </div>
            </div>

            {/* PENDING REQUESTS – wrapped in its own card block */}
            <div
              className="card"
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 18,
              }}
            >
              <div
                className="section-subtitle"
                style={{ marginBottom: 8 }}
              >
                Pending entanglement requests
              </div>

              {loadingRequests && (
                <p className="profile-muted">Loading your requests…</p>
              )}

              {requestsError && !loadingRequests && (
                <p
                  className="profile-muted"
                  style={{ color: "#f97373", marginTop: 8 }}
                >
                  {requestsError}
                </p>
              )}

              {!loadingRequests &&
                !requestsError &&
                pendingRequests.length === 0 && (
                  <div className="products-empty">
                    You have no entanglement requests at the moment.
                  </div>
                )}

              {!loadingRequests &&
                !requestsError &&
                pendingRequests.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      marginTop: 4,
                    }}
                  >
                    {pendingRequests.map(({ connectionId, sender }) => {
                      const name =
                        sender.full_name || "Quantum5ocial member";
                      const initials = name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      const location = [sender.city, sender.country]
                        .filter(Boolean)
                        .join(", ");
                      const metaLines: string[] = [];
                      if (sender.highest_education)
                        metaLines.push(sender.highest_education);
                      if (sender.affiliation)
                        metaLines.push(sender.affiliation);
                      if (location) metaLines.push(location);
                      const meta = metaLines.join(" · ");

                      return (
                        <div
                          key={connectionId}
                          className="card"
                          style={{
                            padding: 18,
                            borderRadius: 18,
                            border: "1px solid rgba(56,189,248,0.35)",
                            background:
                              "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.14), rgba(15,23,42,0.98))",
                            boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 14,
                              alignItems: "flex-start",
                            }}
                          >
                            {/* Avatar */}
                            <div
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: "999px",
                                overflow: "hidden",
                                flexShrink: 0,
                                background:
                                  "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border:
                                  "1px solid rgba(148,163,184,0.55)",
                                color: "#e5e7eb",
                                fontWeight: 600,
                                fontSize: 18,
                              }}
                            >
                              {sender.avatar_url ? (
                                <img
                                  src={sender.avatar_url}
                                  alt={name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                initials
                              )}
                            </div>

                            {/* Text block */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      fontSize: 15,
                                    }}
                                  >
                                    {name}
                                  </div>
                                  {sender.role && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "rgba(148,163,184,0.95)",
                                        marginTop: 2,
                                      }}
                                    >
                                      {sender.role}
                                    </div>
                                  )}
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 9px",
                                    borderRadius: 999,
                                    border:
                                      "1px solid rgba(148,163,184,0.7)",
                                    color: "rgba(226,232,240,0.95)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Member
                                </span>
                              </div>

                              {meta && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(148,163,184,0.95)",
                                    marginBottom: 6,
                                  }}
                                >
                                  {meta}
                                </div>
                              )}

                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  lineHeight: 1.45,
                                  marginBottom: 12,
                                }}
                              >
                                {sender.short_bio ||
                                  "Wants to entangle with you on Quantum5ocial and join your ecosystem."}
                              </div>

                              {/* Actions */}
                              <div
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  disabled={isActionLoading(connectionId)}
                                  onClick={() =>
                                    handleRespond(
                                      connectionId,
                                      true,
                                      sender
                                    )
                                  }
                                  style={{
                                    flex: 1,
                                    minWidth: 140,
                                    padding: "8px 0",
                                    borderRadius: 999,
                                    border: "none",
                                    background: isActionLoading(connectionId)
                                      ? "rgba(34,197,94,0.7)"
                                      : "#22c55e",
                                    color: "#022c22",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  {isActionLoading(connectionId)
                                    ? "Accepting…"
                                    : "Accept request"}
                                </button>

                                <button
                                  type="button"
                                  disabled={isActionLoading(connectionId)}
                                  onClick={() =>
                                    handleRespond(connectionId, false, sender)
                                  }
                                  style={{
                                    flex: 1,
                                    minWidth: 120,
                                    padding: "8px 0",
                                    borderRadius: 999,
                                    border:
                                      "1px solid rgba(148,163,184,0.7)",
                                    background: "transparent",
                                    color: "rgba(248,250,252,0.9)",
                                    fontSize: 13,
                                    cursor: "pointer",
                                  }}
                                >
                                  {isActionLoading(connectionId)
                                    ? "Processing…"
                                    : "Decline"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* RECENT ENTANGLEMENTS – separate card block */}
            <div
              className="card"
              style={{
                padding: 16,
                borderRadius: 18,
              }}
            >
              <div
                className="section-subtitle"
                style={{ marginBottom: 8 }}
              >
                Recent entanglements
              </div>

              {loadingEntanglements && (
                <p className="profile-muted">
                  Loading your entangled states…
                </p>
              )}

              {!loadingEntanglements &&
                recentEntanglements.length === 0 && (
                  <div className="products-empty">
                    No entangled activity yet. Once you accept, send, or decline
                    requests, you&apos;ll see a history of entanglements here.
                  </div>
                )}

              {!loadingEntanglements &&
                recentEntanglements.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginTop: 4,
                    }}
                  >
                    {recentEntanglements.map(
                      ({
                        connectionId,
                        otherUser,
                        created_at,
                        status,
                        isSender,
                      }) => {
                        const name =
                          otherUser.full_name || "Quantum5ocial member";
                        const initials = name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const when = formatDateTime(created_at);

                        let message: string;

                        if (status === "accepted") {
                          message = `You are now entangled with ${name}`;
                        } else if (
                          status === "declined" ||
                          status === "rejected"
                        ) {
                          if (isSender) {
                            message = `Your entanglement request has been declined by ${name}`;
                          } else {
                            message = `You declined the entanglement request from ${name}`;
                          }
                        } else {
                          message = `Entanglement activity with ${name}`;
                        }

                        return (
                          <div
                            key={`ent-${connectionId}`}
                            className="card"
                            style={{
                              padding: 10,
                              borderRadius: 12,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "999px",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  background:
                                    "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 13,
                                  color: "#e5e7eb",
                                  fontWeight: 600,
                                }}
                              >
                                {otherUser.avatar_url ? (
                                  <img
                                    src={otherUser.avatar_url}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div style={{ fontSize: 13 }}>
                                <span style={{ opacity: 0.9 }}>
                                  {message}
                                </span>
                              </div>
                            </div>
                            {when && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {when}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
          </section>

          {/* RIGHT COLUMN – with subtle divider to the middle */}
          <aside
            className="layout-right"
            style={{
              borderLeft: "1px solid rgba(148,163,184,0.18)", // vertical divider on right
              paddingLeft: 16,
            }}
          />
        </main>
      </div>
    </>
  );
}
