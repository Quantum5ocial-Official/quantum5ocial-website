// pages/notifications.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Sidebar profile summary type
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  describes_you: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type NotificationProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  affiliation: string | null;
  current_org: string | null;
  describes_you: string | null;
};

type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export default function NotificationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Sidebar
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // Notifications data
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRow[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ConnectionRow[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<
    ConnectionRow[]
  >([]);
  const [profilesMap, setProfilesMap] = useState<
    Record<string, NotificationProfile>
  >({});

  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/notifications");
    }
  }, [loading, user, router]);

  // Load sidebar profile + counters (same flavor as ecosystem)
  useEffect(() => {
    if (!user) {
      setProfileSummary(null);
      setSavedJobsCount(0);
      setSavedProductsCount(0);
      setEntangledCount(0);
      return;
    }

    const loadSidebar = async () => {
      try {
        // profile
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, describes_you, affiliation, country, city"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && prof) {
          setProfileSummary(prof as ProfileSummary);
        } else {
          setProfileSummary(null);
        }

        // saved jobs
        const { data: savedJobRows, error: savedJobErr } = await supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id);

        if (!savedJobErr && savedJobRows) {
          setSavedJobsCount(savedJobRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // entangled count
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
        setProfileSummary(null);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadSidebar();
  }, [user]);

  // Helper: load notifications (connections + counterpart profiles)
  const loadNotifications = async () => {
    if (!user) {
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setAcceptedConnections([]);
      setProfilesMap({});
      return;
    }

    setMainLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("connections")
        .select("id, user_id, target_user_id, status, created_at")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as ConnectionRow[];

      const incoming = rows.filter(
        (c) => c.status === "pending" && c.target_user_id === user.id
      );
      const outgoing = rows.filter(
        (c) => c.status === "pending" && c.user_id === user.id
      );

      const accepted = rows.filter((c) => c.status === "accepted").slice(0, 12);

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setAcceptedConnections(accepted);

      // Collect all counterpart IDs
      const counterpartIds = new Set<string>();

      incoming.forEach((c) => {
        counterpartIds.add(c.user_id); // requester
      });
      outgoing.forEach((c) => {
        counterpartIds.add(c.target_user_id); // receiver
      });
      accepted.forEach((c) => {
        const otherId = c.user_id === user.id ? c.target_user_id : c.user_id;
        counterpartIds.add(otherId);
      });

      if (counterpartIds.size === 0) {
        setProfilesMap({});
        return;
      }

      const { data: profData, error: profErr } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, role, affiliation, current_org, describes_you"
        )
        .in("id", Array.from(counterpartIds));

      if (profErr) throw profErr;

      const map: Record<string, NotificationProfile> = {};
      (profData || []).forEach((p: any) => {
        map[p.id] = p as NotificationProfile;
      });

      setProfilesMap(map);
    } catch (e) {
      console.error("Error loading notifications", e);
      setErrorMsg("Could not load notifications. Please try again later.");
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setAcceptedConnections([]);
      setProfilesMap({});
    } finally {
      setMainLoading(false);
    }
  };

  // Load notifications on mount / when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  // Action handlers
  const markProcessing = (id: string, on: boolean) => {
    setProcessingIds((prev) =>
      on ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const acceptRequest = async (id: string) => {
    if (!user) return;
    markProcessing(id, true);
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", id);

      if (error) {
        console.error("Error accepting entanglement", error);
      } else {
        await loadNotifications();
      }
    } catch (e) {
      console.error("Error accepting entanglement", e);
    } finally {
      markProcessing(id, false);
    }
  };

  const declineRequest = async (id: string) => {
    if (!user) return;
    markProcessing(id, true);
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "declined" })
        .eq("id", id);

      if (error) {
        console.error("Error declining entanglement", error);
      } else {
        await loadNotifications();
      }
    } catch (e) {
      console.error("Error declining entanglement", e);
    } finally {
      markProcessing(id, false);
    }
  };

  const cancelOutgoing = async (id: string) => {
    if (!user) return;
    markProcessing(id, true);
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error cancelling entanglement request", error);
      } else {
        await loadNotifications();
      }
    } catch (e) {
      console.error("Error cancelling entanglement request", e);
    } finally {
      markProcessing(id, false);
    }
  };

  if (!user && !loading) return null;

  // Sidebar presentation
  const sidebarName = profileSummary?.full_name || "Quantum explorer";
  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel = profileSummary?.highest_education || "";
  const describesYou = profileSummary?.describes_you || "";
  const affiliation =
    profileSummary?.affiliation ||
    [profileSummary?.city, profileSummary?.country]
      .filter(Boolean)
      .join(", ") ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const totalIncoming = incomingRequests.length;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card */}
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
                      alt={sidebarName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarName
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-title-block">
                  <div className="profile-sidebar-name">{sidebarName}</div>
                  {profileSummary?.role && (
                    <div className="profile-sidebar-role">
                      {profileSummary.role}
                    </div>
                  )}
                </div>
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
                  Entangled states ({entangledCount})
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs ({savedJobsCount})
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products ({savedProductsCount})
                </Link>
              </div>
            </div>
          </aside>

          {/* CENTER CONTENT */}
          <section className="layout-center">
            {/* HERO CARD */}
            <div
              className="card"
              style={{
                padding: 20,
                marginBottom: 24,
                background:
                  "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.2), rgba(15,23,42,0.98))",
                border: "1px solid rgba(148,163,184,0.35)",
                boxShadow: "0 18px 45px rgba(15,23,42,0.7)",
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
                  <div className="section-title">Notifications</div>
                  <div className="section-sub">
                    Stay up to date with new entanglement requests and recent
                    connections in your quantum network.
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span className="pill pill-soft">
                      🔔 New requests:{" "}
                      <strong style={{ marginLeft: 4 }}>
                        {totalIncoming}
                      </strong>
                    </span>
                    <span className="pill pill-soft">
                      🧬 Entangled states:{" "}
                      <strong style={{ marginLeft: 4 }}>
                        {entangledCount}
                      </strong>
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    minWidth: 160,
                  }}
                >
                  <Link
                    href="/community"
                    className="section-link"
                    style={{ fontSize: 13 }}
                  >
                    Explore community →
                  </Link>
                  <Link
                    href="/ecosystem"
                    className="section-link"
                    style={{ fontSize: 13 }}
                  >
                    View my ecosystem →
                  </Link>
                </div>
              </div>
            </div>

            {mainLoading ? (
              <p className="profile-muted">Loading notifications…</p>
            ) : errorMsg ? (
              <p className="profile-muted">{errorMsg}</p>
            ) : (
              <>
                {/* Incoming requests */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <div className="section-subtitle">
                      🔔 Incoming entanglement requests
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "rgba(148,163,184,0.9)",
                          fontWeight: 400,
                        }}
                      >
                        {totalIncoming === 0
                          ? "No new requests"
                          : `${totalIncoming} pending`}
                      </span>
                    </div>
                  </div>

                  {incomingRequests.length === 0 ? (
                    <div className="products-empty">
                      You have no new entanglement requests. Visit the{" "}
                      <Link href="/community" className="section-link">
                        community
                      </Link>{" "}
                      to connect with other quantum people.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {incomingRequests.map((req) => {
                        const counterpart =
                          profilesMap[req.user_id as string];
                        const name =
                          counterpart?.full_name || "Quantum member";
                        const meta = [
                          counterpart?.role ||
                            counterpart?.describes_you ||
                            null,
                          counterpart?.affiliation ||
                            counterpart?.current_org ||
                            null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        const isProcessing = processingIds.includes(req.id);

                        return (
                          <div
                            key={req.id}
                            className="card"
                            style={{
                              padding: 14,
                              border: "1px solid rgba(148,163,184,0.3)",
                              background:
                                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(56,189,248,0.25))",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  width: 42,
                                  height: 42,
                                  borderRadius: "999px",
                                  background:
                                    "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                {counterpart?.avatar_url ? (
                                  <img
                                    src={counterpart.avatar_url}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "white",
                                      fontSize: 16,
                                    }}
                                  >
                                    {name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    marginBottom: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {name}
                                </div>
                                {meta && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "rgba(191,219,254,0.9)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {meta}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(148,163,184,0.9)",
                                    marginTop: 4,
                                  }}
                                >
                                  wants to entangle with you 🧬
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 8,
                                marginTop: 4,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => declineRequest(req.id)}
                                disabled={isProcessing}
                                style={{
                                  padding: "5px 10px",
                                  fontSize: 12,
                                  borderRadius: 999,
                                  border:
                                    "1px solid rgba(148,163,184,0.6)",
                                  background: "transparent",
                                  color: "rgba(148,163,184,0.95)",
                                  cursor: isProcessing
                                    ? "default"
                                    : "pointer",
                                }}
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                onClick={() => acceptRequest(req.id)}
                                disabled={isProcessing}
                                style={{
                                  padding: "5px 12px",
                                  fontSize: 12,
                                  borderRadius: 999,
                                  border: "none",
                                  background:
                                    "linear-gradient(90deg,#22c55e,#16a34a)",
                                  color: "white",
                                  fontWeight: 500,
                                  cursor: isProcessing
                                    ? "default"
                                    : "pointer",
                                }}
                              >
                                {isProcessing ? "Processing…" : "Accept"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Outgoing pending */}
                <div style={{ marginBottom: 28 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <div className="section-subtitle">
                      📤 Requests you&apos;ve sent
                    </div>
                  </div>

                  {outgoingRequests.length === 0 ? (
                    <p className="profile-muted">
                      You haven&apos;t sent any entanglement requests yet.
                      Visit the{" "}
                      <Link href="/community" className="section-link">
                        community
                      </Link>{" "}
                      to discover people and start entangling.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {outgoingRequests.map((req) => {
                        const counterpart =
                          profilesMap[req.target_user_id as string];
                        const name =
                          counterpart?.full_name || "Quantum member";
                        const meta = [
                          counterpart?.role ||
                            counterpart?.describes_you ||
                            null,
                          counterpart?.affiliation ||
                            counterpart?.current_org ||
                            null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                        const isProcessing = processingIds.includes(req.id);

                        return (
                          <div
                            key={req.id}
                            className="card"
                            style={{
                              padding: 14,
                              border: "1px solid rgba(148,163,184,0.3)",
                              background:
                                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(59,130,246,0.25))",
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: "999px",
                                  background:
                                    "radial-gradient(circle at 0% 0%, #60a5fa, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                {counterpart?.avatar_url ? (
                                  <img
                                    src={counterpart.avatar_url}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "white",
                                      fontSize: 14,
                                    }}
                                  >
                                    {name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 14,
                                    marginBottom: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {name}
                                </div>
                                {meta && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "rgba(191,219,254,0.9)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {meta}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "rgba(148,163,184,0.9)",
                                    marginTop: 4,
                                  }}
                                >
                                  waiting for them to respond
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 4,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => cancelOutgoing(req.id)}
                                disabled={isProcessing}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  borderRadius: 999,
                                  border:
                                    "1px solid rgba(148,163,184,0.7)",
                                  background: "transparent",
                                  color: "rgba(148,163,184,0.95)",
                                  cursor: isProcessing
                                    ? "default"
                                    : "pointer",
                                }}
                              >
                                {isProcessing ? "Cancelling…" : "Cancel request"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent accepted */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 10,
                    }}
                  >
                    <div className="section-subtitle">
                      ✅ Recently accepted entanglements
                    </div>
                  </div>

                  {acceptedConnections.length === 0 ? (
                    <p className="profile-muted">
                      You don&apos;t have any accepted entanglements yet. Once
                      you start accepting requests, they will appear here.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {acceptedConnections.map((conn) => {
                        const otherId =
                          conn.user_id === user?.id
                            ? conn.target_user_id
                            : conn.user_id;
                        const counterpart = profilesMap[otherId];
                        const name =
                          counterpart?.full_name || "Quantum member";
                        const meta = [
                          counterpart?.role ||
                            counterpart?.describes_you ||
                            null,
                          counterpart?.affiliation ||
                            counterpart?.current_org ||
                            null,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <div
                            key={conn.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              padding: "8px 10px",
                              borderRadius: 10,
                              border:
                                "1px dashed rgba(148,163,184,0.4)",
                              background: "rgba(15,23,42,0.8)",
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
                                  width: 28,
                                  height: 28,
                                  borderRadius: "999px",
                                  background:
                                    "radial-gradient(circle at 0% 0%, #4ade80, #065f46)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                }}
                              >
                                {counterpart?.avatar_url ? (
                                  <img
                                    src={counterpart.avatar_url}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "white",
                                      fontSize: 13,
                                    }}
                                  >
                                    {name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  You&apos;re now entangled with {name}
                                </div>
                                {meta && (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "rgba(148,163,184,0.95)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {meta}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Link
                              href={`/profile/${otherId}`}
                              className="section-link"
                              style={{ fontSize: 11, flexShrink: 0 }}
                            >
                              View profile →
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* RIGHT COLUMN – reserved for future global notifications (jobs/products etc.) */}
          <aside className="layout-right" />
        </main>
      </div>
    </>
  );
}
