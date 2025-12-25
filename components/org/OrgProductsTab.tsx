// components/org/OrgProductsTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Org = {
  id: string;
  name: string;
  logo_url: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;

  product_type: string | null;
  technology_type: string | null;
  organisation_type: string | null;
  quantum_domain: string | null;

  created_at?: string | null;

  // IMPORTANT: your org filtering relies on having org_id in products table
  org_id?: string | null;
};

function useIsMobile(maxWidth = 820) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);
    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
  }, [maxWidth]);

  return isMobile;
}

function formatRelativeTime(created_at: string | null | undefined) {
  if (!created_at) return "";
  const t = Date.parse(created_at);
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const diffWk = Math.floor(diffDay / 7);
  if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? "" : "s"} ago`;

  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
}

function formatPrice(p: ProductRow) {
  if (p.price_type === "fixed" && p.price_value) return p.price_value;
  return "Contact for price";
}

function formatStock(p: ProductRow) {
  if (p.in_stock) {
    if (p.stock_quantity != null) return `In stock · ${p.stock_quantity} pcs`;
    return "In stock";
  }
  if (p.in_stock === false) return "Out of stock";
  return "Stock not specified";
}

/* =========================
   ORG PRODUCTS STRIP
   ========================= */

function OrgProductsStrip({
  orgId,
}: {
  orgId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: prodErr } = await supabase
        .from("products")
        .select(
          "id, name, company_name, category, short_description, price_type, price_value, in_stock, stock_quantity, image1_url, image2_url, image3_url, product_type, technology_type, organisation_type, quantum_domain, created_at, org_id"
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (prodErr) throw prodErr;

      setItems((data || []) as ProductRow[]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load products.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await load();
    };

    if (orgId) run();

    const channel = supabase
      .channel(`org-products:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `org_id=eq.${orgId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const openProduct = (productId: string) => {
    router.push(`/products/${encodeURIComponent(productId)}`);
  };

  if (loading) return <div className="products-status">Loading products…</div>;
  if (error)
    return (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  if (items.length === 0)
    return <div className="products-empty">No products listed by this organization yet.</div>;

  const chipStyle: CSSProperties = {
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.30)",
    background: "rgba(2,6,23,0.22)",
    color: "rgba(226,232,240,0.92)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const edgeBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    zIndex: 5,
    backdropFilter: "blur(8px)",
  };

  return (
    <div
      className="card"
      style={{
        position: "relative",
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.72)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(90deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(270deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        style={{ ...edgeBtn, left: 10 }}
        aria-label="Scroll left"
        title="Scroll left"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        style={{ ...edgeBtn, right: 10 }}
        aria-label="Scroll right"
        title="Scroll right"
      >
        ›
      </button>

      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 44px 10px 44px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((p) => {
          const title = (p.name || "Untitled product").trim();
          const desc = (p.short_description || "").trim();
          const img = p.image1_url || p.image2_url || p.image3_url;
          const hasImage = !!img;

          const badgeBits: string[] = [];
          if (p.product_type) badgeBits.push(p.product_type);
          if (p.technology_type) badgeBits.push(p.technology_type);
          if (p.category) badgeBits.push(p.category);

          return (
            <div
              key={p.id}
              onClick={() => openProduct(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") openProduct(p.id);
              }}
              style={{
                scrollSnapAlign: "start",
                flex: "0 0 auto",
                width: "clamp(260px, calc((100% - 24px) / 3), 420px)",
                cursor: "pointer",
              }}
            >
              <div
                className="card"
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.42)",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={title}
                    >
                      {title}
                    </div>
                    {p.company_name ? (
                      <div style={{ fontSize: 12, opacity: 0.72, marginTop: 2 }}>
                        {p.company_name}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>
                        {formatRelativeTime(p.created_at)}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(226,232,240,0.92)" }}>
                      {formatPrice(p)}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{formatStock(p)}</div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.55)",
                    minHeight: 210,
                    display: "grid",
                    gridTemplateRows: hasImage ? "190px auto" : "1fr",
                    gap: 10,
                    padding: 10,
                  }}
                >
                  {hasImage && (
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.14)",
                        height: 190,
                      }}
                    >
                      <img
                        src={img as string}
                        alt="Product image"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.14)",
                      background: "rgba(2,6,23,0.18)",
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "rgba(226,232,240,0.92)",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: hasImage ? 4 : 9,
                        WebkitBoxOrient: "vertical",
                        wordBreak: "break-word",
                      }}
                      title={desc || title}
                    >
                      {desc ? desc : <span style={{ opacity: 0.75 }}>—</span>}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {badgeBits.length > 0 ? (
                    <span style={chipStyle} title="Type / technology / category">
                      🧩 {badgeBits.join(" · ")}
                    </span>
                  ) : (
                    <span style={chipStyle} title="Listed product">
                      🧩 Product
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   PUBLIC EXPORT
   ========================= */

export default function OrgProductsTab({
  org,
  canListProduct,
}: {
  org: Org;
  canListProduct: boolean; // owner/co-owner only
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const isMobile = useIsMobile(520);

  const onListProduct = () => {
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }
    // ✅ EXACT SAME PATH as /pages/products/index.tsx
    router.push("/products/new");
  };

  const headerCard: CSSProperties = {
    padding: 16,
    marginBottom: 12,
    background: "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.16), rgba(15,23,42,0.98))",
    border: "1px solid rgba(148,163,184,0.35)",
    boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
    borderRadius: 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const primaryBtn: CSSProperties = {
    padding: "9px 16px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: "none",
    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#0f172a",
    whiteSpace: "nowrap",
    border: "none",
    cursor: "pointer",
  };

  const hint: CSSProperties = {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(148,163,184,0.95)",
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div className="card" style={headerCard}>
        <div style={{ minWidth: 0 }}>
          <div className="section-title">Products</div>
          <div className="section-sub" style={{ maxWidth: 680 }}>
            Marketplace listings from this organization. Click a card to open it.
          </div>
          {!canListProduct ? (
            <div style={hint}>Only owners / co-owners can list products for an organization.</div>
          ) : null}
        </div>

        {canListProduct ? (
          <button type="button" className="nav-cta" style={{ cursor: "pointer" }} onClick={onListProduct}>
            List your product
          </button>
        ) : (
          <button
            type="button"
            style={{
              ...primaryBtn,
              opacity: 0.45,
              cursor: "default",
            }}
            disabled
            title="Owner / co-owner only"
          >
            List your product
          </button>
        )}
      </div>

      <OrgProductsStrip orgId={org.id} />
    </div>
  );
}
