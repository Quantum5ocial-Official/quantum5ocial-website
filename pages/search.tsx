// pages/search.tsx
import {
  useEffect,
  useState,
  FormEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
};

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  image1_url: string | null;
};

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  role?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
};

type Org = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  kind: "company" | "research_group" | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  institution: string | null;
  department: string | null;
  company_type: string | null;
  group_type: string | null;
  size_label: string | null;
};

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export default function GlobalSearchPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const [jobs, setJobs] = useState<Job[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<CommunityProfile[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Sidebar stuff
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);
  const [loadingMyOrg, setLoadingMyOrg] = useState<boolean>(true);

  // --- Read q from URL ---
  useEffect(() => {
    const q = router.query.q;
    if (typeof q === "string") {
      setQuery(q);
      setSearchInput(q);
    } else {
      setQuery("");
      setSearchInput("");
    }
  }, [router.query.q]);

  // --- Run search whenever query changes ---
  useEffect(() => {
    const runSearch = async () => {
      const term = query.trim();
      if (!term) {
        setJobs([]);
        setProducts([]);
        setMembers([]);
        setOrgs([]);
        setHasSearched(false);
        return;
      }

      setLoadingSearch(true);
      setHasSearched(true);

      const pattern = `%${term}%`;

      try {
        const [
          { data: jobData, error: jobErr },
          { data: prodData, error: prodErr },
          { data: memberData, error: memberErr },
          { data: orgData, error: orgErr },
        ] = await Promise.all([
          supabase
            .from("jobs")
            .select(
              "id, title, company_name, location, employment_type, remote_type, short_description"
            )
            .or(
              `title.ilike.${pattern},company_name.ilike.${pattern},location.ilike.${pattern},short_description.ilike.${pattern}`
            )
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("products")
            .select(
              "id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url"
            )
            .or(
              `name.ilike.${pattern},company_name.ilike.${pattern},category.ilike.${pattern},short_description.ilike.${pattern}`
            )
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("profiles")
            .select(
              "id, full_name, avatar_url, highest_education, role, affiliation, short_bio"
            )
            .or(
              `full_name.ilike.${pattern},role.ilike.${pattern},affiliation.ilike.${pattern},short_bio.ilike.${pattern}`
            )
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("organizations")
            .select(
              "id, name, slug, logo_url, kind, city, country, industry, institution, department, company_type, group_type, size_label"
            )
            .eq("is_active", true)
            .or(
              `name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},industry.ilike.${pattern},institution.ilike.${pattern},department.ilike.${pattern}`
            )
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (!jobErr && jobData) setJobs(jobData as Job[]);
        else setJobs([]);

        if (!prodErr && prodData) setProducts(prodData as Product[]);
        else setProducts([]);

        if (!memberErr && memberData) setMembers(memberData as CommunityProfile[]);
        else setMembers([]);

        if (!orgErr && orgData) setOrgs(orgData as Org[]);
        else setOrgs([]);
      } catch (e) {
        console.error("Global search error", e);
        setJobs([]);
        setProducts([]);
        setMembers([]);
        setOrgs([]);
      } finally {
        setLoadingSearch(false);
      }
    };

    runSearch();
  }, [query]);

  // --- Submit from search bar on this page ---
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = searchInput.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // === Sidebar: profile ===
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileSummary(data as ProfileSummary);
      } else {
        setProfileSummary(null);
      }
    };

    loadProfile();
  }, [user]);

  // === Sidebar: counts ===
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) {
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        const { data: savedJobsRows } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        setSavedJobsCount(savedJobsRows ? savedJobsRows.length : 0);

        const { data: savedProdRows } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        setSavedProductsCount(savedProdRows ? savedProdRows.length : 0);

        const { data: connRows } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connRows && connRows.length > 0) {
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
        console.error("Error loading sidebar counts", e);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadCounts();
  }, [user]);

  // === Sidebar: my org ===
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
        if (error) console.error("Error loading my organization", error);
      }
      setLoadingMyOrg(false);
    };

    loadMyOrg();
  }, [user]);

  // === Helper formatting ===
  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type].filter(Boolean).join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const formatProductMeta = (p: Product) =>
    [p.company_name ? `Vendor: ${p.company_name}` : null]
      .filter(Boolean)
      .join(" · ");

  const formatProductTags = (p: Product) => {
    const tags: string[] = [];
    const price = formatPrice(p);
    if (p.category) tags.push(p.category);
    if (price) tags.push(price);
    if (p.in_stock === true) tags.push("In stock");
    if (p.in_stock === false) tags.push("Out of stock");
    return tags.slice(0, 3);
  };

  const formatMemberMeta = (m: CommunityProfile) =>
    [
      (m as any).highest_education || (m as any).education_level || undefined,
      (m as any).role || (m as any).describes_you || undefined,
      (m as any).affiliation || (m as any).current_org || undefined,
    ]
      .filter(Boolean)
      .join(" · ");

  const formatOrgMeta = (o: Org) => {
    const bits: string[] = [];
    if (o.kind === "company") {
      if (o.industry) bits.push(o.industry);
      if (o.company_type) bits.push(o.company_type);
    } else {
      if (o.institution) bits.push(o.institution);
      if (o.department) bits.push(o.department);
    }
    if (o.size_label) bits.push(o.size_label);
    if (o.city && o.country) bits.push(`${o.city}, ${o.country}`);
    else if (o.country) bits.push(o.country);
    return bits.join(" · ");
  };

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const sidebarAvatarUrl = profileSummary?.avatar_url || null;
  const educationLevel =
    (profileSummary as any)?.education_level ||
    (profileSummary as any)?.highest_education ||
    "";
  const describesYou =
    (profileSummary as any)?.describes_you ||
    (profileSummary as any)?.role ||
    "";
  const affiliation =
    (profileSummary as any)?.affiliation ||
    (profileSummary as any)?.current_org ||
    "";

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

  const anyResults =
    jobs.length > 0 || products.length > 0 || members.length > 0 || orgs.length > 0;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR – same style as homepage */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
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
                  {sidebarAvatarUrl ? (
                    <img
                      src={sidebarAvatarUrl}
                      alt={sidebarFullName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarFullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-name">
                  {sidebarFullName}
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
                      Followers: <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div>
                      Views: <span style={{ color: "#e5e7eb" }}>0</span>
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
          </aside>

          {/* CENTER: search results */}
          <section className="layout-main">
            <section className="section" style={{ paddingTop: 24 }}>
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <div className="section-title">Global search</div>
                  <div className="section-sub">
                    Search across jobs, products, people, and organizations.
                  </div>
                </div>
              </div>

              {/* search bar */}
              <form
                onSubmit={handleSubmit}
                style={{
                  marginBottom: 24,
                  maxWidth: 580,
                  display: "flex",
                  gap: 10,
                }}
              >
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search jobs, products, people, organizations…"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.5)",
                    background: "rgba(15,23,42,0.95)",
                    color: "#e5e7eb",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "10px 18px",
                    borderRadius: 999,
                    border: "none",
                    background:
                      "linear-gradient(135deg,#3bc7f3,#8468ff)",
                    color: "#0f172a",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Search
                </button>
              </form>

              {loadingSearch && (
                <div className="products-status">Searching…</div>
              )}

              {!loadingSearch && hasSearched && !anyResults && (
                <div className="products-empty">
                  No results matched{" "}
                  <span style={{ fontWeight: 600 }}>"{query}"</span>.
                </div>
              )}

              {/* Jobs */}
              {!loadingSearch && jobs.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div className="section-subtitle" style={{ marginBottom: 8 }}>
                    Jobs
                  </div>
                  <div
                    className="card-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {jobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="card"
                        style={{
                          textDecoration: "none",
                          color: "#e5e7eb",
                        }}
                      >
                        <div className="card-inner">
                          <div className="card-top-row">
                            <div className="card-title">
                              {job.title || "Untitled role"}
                            </div>
                            <div className="card-pill">
                              {job.employment_type || "Job"}
                            </div>
                          </div>
                          <div className="card-meta">
                            {formatJobMeta(job) || "Quantum role"}
                          </div>
                          {job.short_description && (
                            <div className="card-tags">
                              <span className="card-tag">
                                {job.short_description.length > 60
                                  ? job.short_description.slice(0, 57) +
                                    "..."
                                  : job.short_description}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Products */}
              {!loadingSearch && products.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div className="section-subtitle" style={{ marginBottom: 8 }}>
                    Products
                  </div>
                  <div
                    className="card-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        className="card"
                        style={{
                          textDecoration: "none",
                          color: "#e5e7eb",
                        }}
                      >
                        <div
                          className="card-inner"
                          style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              width: 72,
                              height: 72,
                              borderRadius: 14,
                              overflow: "hidden",
                              flexShrink: 0,
                              background: "rgba(15,23,42,0.9)",
                              border: "1px solid rgba(15,23,42,0.9)",
                            }}
                          >
                            {p.image1_url ? (
                              <img
                                src={p.image1_url}
                                alt={p.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  color: "#6b7280",
                                }}
                              >
                                No image
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="card-top-row">
                              <div className="card-title">{p.name}</div>
                              <div className="card-pill">
                                {p.category || "Product"}
                              </div>
                            </div>
                            <div className="card-meta">
                              {formatProductMeta(p) || "Quantum product"}
                            </div>
                            {p.short_description && (
                              <div className="card-tags">
                                {formatProductTags(p).map((tag) => (
                                  <span key={tag} className="card-tag">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* People */}
              {!loadingSearch && members.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div className="section-subtitle" style={{ marginBottom: 8 }}>
                    People
                  </div>
                  <div
                    className="card-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {members.map((m) => {
                      const name = m.full_name || "Quantum member";
                      const firstName =
                        typeof name === "string"
                          ? name.split(" ")[0] || name
                          : "Member";
                      const meta = formatMemberMeta(m);
                      const bio =
                        (m as any).short_bio ||
                        (m as any).short_description ||
                        "";

                      return (
                        <div key={m.id} className="card">
                          <div
                            className="card-inner"
                            style={{
                              display: "flex",
                              gap: 14,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: "999px",
                                overflow: "hidden",
                                border: "1px solid rgba(148,163,184,0.5)",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                color: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              {m.avatar_url ? (
                                <img
                                  src={m.avatar_url}
                                  alt={firstName}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                firstName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="card-title">{name}</div>
                              {meta && (
                                <div
                                  className="card-meta"
                                  style={{ marginTop: 2 }}
                                >
                                  {meta}
                                </div>
                              )}
                              {bio && (
                                <div
                                  className="card-footer-text"
                                  style={{ marginTop: 6 }}
                                >
                                  {bio.length > 80
                                    ? bio.slice(0, 77) + "..."
                                    : bio}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Organizations */}
              {!loadingSearch && orgs.length > 0 && (
                <section style={{ marginBottom: 24 }}>
                  <div className="section-subtitle" style={{ marginBottom: 8 }}>
                    Organizations
                  </div>
                  <div
                    className="card-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {orgs.map((o) => {
                      const firstLetter =
                        o.name?.charAt(0).toUpperCase() || "Q";
                      const meta = formatOrgMeta(o);

                      return (
                        <Link
                          key={o.id}
                          href={`/orgs/${o.slug}`}
                          className="card"
                          style={{
                            textDecoration: "none",
                            color: "#e5e7eb",
                          }}
                        >
                          <div
                            className="card-inner"
                            style={{
                              display: "flex",
                              gap: 14,
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 18,
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
                                fontSize: 20,
                              }}
                            >
                              {o.logo_url ? (
                                <img
                                  src={o.logo_url}
                                  alt={o.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                firstLetter
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="card-title">{o.name}</div>
                              {meta && (
                                <div
                                  className="card-meta"
                                  style={{ marginTop: 2 }}
                                >
                                  {meta}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </section>
          </section>

          {/* RIGHT SIDEBAR – copyright only */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                marginTop: "auto",
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                fontSize: 12,
                color: "rgba(148,163,184,0.9)",
                textAlign: "right",
              }}
            >
              © 2025 Quantum5ocial
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
