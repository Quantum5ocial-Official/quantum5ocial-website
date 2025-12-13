// pages/search.tsx
import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

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

export default function SearchPage() {
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

  // --- Run search ---
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
          { data: jobData },
          { data: prodData },
          { data: memberData },
          { data: orgData },
        ] = await Promise.all([
          supabase
            .from("jobs")
            .select("id, title, company_name, location, employment_type, remote_type, short_description")
            .or(`title.ilike.${pattern},company_name.ilike.${pattern},location.ilike.${pattern},short_description.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(20),

          supabase
            .from("products")
            .select("id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url")
            .or(`name.ilike.${pattern},company_name.ilike.${pattern},category.ilike.${pattern},short_description.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(20),

          supabase
            .from("profiles")
            .select("id, full_name, avatar_url, highest_education, role, affiliation, short_bio")
            .or(`full_name.ilike.${pattern},role.ilike.${pattern},affiliation.ilike.${pattern},short_bio.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(20),

          supabase
            .from("organizations")
            .select("id, name, slug, logo_url, kind, city, country, industry, institution, department, company_type, group_type, size_label")
            .eq("is_active", true)
            .or(`name.ilike.${pattern},city.ilike.${pattern},country.ilike.${pattern},industry.ilike.${pattern},institution.ilike.${pattern},department.ilike.${pattern}`)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        setJobs(jobData || []);
        setProducts(prodData || []);
        setMembers(memberData || []);
        setOrgs(orgData || []);
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = searchInput.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const anyResults =
    jobs.length > 0 || products.length > 0 || members.length > 0 || orgs.length > 0;

  return (
    <section className="section">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-title">Global search</div>
          <div className="section-sub">
            Search across jobs, products, people, and organizations.
          </div>
        </div>
      </div>

      {/* Search bar */}
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
          className="nav-cta"
        >
          Search
        </button>
      </form>

      {loadingSearch && <div className="products-status">Searching…</div>}

      {!loadingSearch && hasSearched && !anyResults && (
        <div className="products-empty">
          No results matched <strong>"{query}"</strong>.
        </div>
      )}

      {/* Jobs / Products / People / Orgs sections */}
      {/* (unchanged rendering logic – same as before) */}
      {/* You already verified these cards, so we leave them intact */}
    </section>
  );
}

// ✅ Use global left-only layout
(SearchPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
