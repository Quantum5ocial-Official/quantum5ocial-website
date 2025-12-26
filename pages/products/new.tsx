// pages/products/new.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

const CATEGORIES = [
  "Cryogenics",
  "Control Electronics",
  "Readout / Amplifiers",
  "Fabrication Services",
  "Qubits / Devices",
  "Software / Simulation",
  "Consulting",
  "Other",
];

type Org = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  is_active?: boolean | null;
};

type OrgMemberRole = "owner" | "co_owner" | "admin" | "member";

type ProductRow = {
  id: string;
  owner_id: string | null;
  org_id?: string | null;

  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;

  // ✅ NEW: long-form description
  full_description?: string | null;

  specifications: string | null;
  product_url: string | null;
  keywords: string | null;
  price_type: string | null; // 'fixed' | 'contact' | null
  price_value: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;
  datasheet_url: string | null;
};

function firstQueryValue(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

function looksLikeUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export default function NewProductPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const id = firstQueryValue(router.query.id as any);
  const orgParam = firstQueryValue(router.query.org as any);

  const isEditMode = !!id;

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    category: "",
    short_description: "",

    // ✅ NEW
    full_description: "",

    // ✅ keep "technical details" one-liner
    specifications: "",

    product_url: "",
    keywords: "",
    price_type: "contact",
    price_value: "",
    in_stock: "yes",
    stock_quantity: "",
  });

  const [existingImages, setExistingImages] = useState<(string | null)[]>([null, null, null]);
  const [existingDatasheetUrl, setExistingDatasheetUrl] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);

  const [loadingExisting, setLoadingExisting] = useState(false);

  const [org, setOrg] = useState<Org | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [canListForOrg, setCanListForOrg] = useState(false);

  const [eligibleOrgs, setEligibleOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  const isMarketplaceCreate = !isEditMode && !orgParam;

  useEffect(() => {
    if (!loading && !user) {
      router.replace(
        isEditMode
          ? `/auth?redirect=/products/new?id=${encodeURIComponent(id)}`
          : "/auth?redirect=/products/new"
      );
    }
  }, [loading, user, router, isEditMode, id]);

  useEffect(() => {
    const loadEligibleOrgs = async () => {
      if (!router.isReady) return;
      if (!user) return;
      if (!isMarketplaceCreate) return;

      setLoadingOrg(true);
      setCreateError(null);

      try {
        const { data: created, error: createdErr } = await supabase
          .from("organizations")
          .select("id,name,slug,created_by,is_active")
          .eq("is_active", true)
          .eq("created_by", user.id);

        if (createdErr) throw createdErr;

        const { data: memberRows, error: memberErr } = await supabase
          .from("org_members")
          .select("org_id, role")
          .eq("user_id", user.id)
          .in("role", ["owner", "co_owner"]);

        if (memberErr) throw memberErr;

        const memberOrgIds = Array.from(
          new Set((memberRows || []).map((r: any) => String(r.org_id)).filter(Boolean))
        );

        const { data: memberOrgs, error: memberOrgsErr } = memberOrgIds.length
          ? await supabase
              .from("organizations")
              .select("id,name,slug,created_by,is_active")
              .eq("is_active", true)
              .in("id", memberOrgIds)
          : { data: [], error: null as any };

        if (memberOrgsErr) throw memberOrgsErr;

        const merged = [...(created || []), ...(memberOrgs || [])] as Org[];
        const uniq = Array.from(new Map(merged.map((o) => [o.id, o])).values());

        setEligibleOrgs(uniq);

        if (uniq.length === 1) {
          const only = uniq[0];
          setOrg(only);
          setSelectedOrgId(only.id);
          setCanListForOrg(true);
          setForm((prev) => ({ ...prev, company_name: only.name || prev.company_name }));
          setCreateError(null);
        } else if (uniq.length > 1) {
          setOrg(null);
          setCanListForOrg(false);
          setCreateError("Choose an organization to publish under.");
        } else {
          setOrg(null);
          setCanListForOrg(false);
          setCreateError("You need an organization to publish a product.");
        }
      } catch (e: any) {
        console.error("Error loading eligible orgs", e);
        setOrg(null);
        setCanListForOrg(false);
        setEligibleOrgs([]);
        setCreateError("Could not load your organizations.");
      } finally {
        setLoadingOrg(false);
      }
    };

    loadEligibleOrgs();
  }, [router.isReady, user, isMarketplaceCreate]);

  const onPickOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    const found = eligibleOrgs.find((o) => o.id === orgId) || null;

    if (!found) {
      setOrg(null);
      setCanListForOrg(false);
      setCreateError("Choose an organization to publish under.");
      setForm((prev) => ({ ...prev, company_name: "" }));
      return;
    }

    setOrg(found);
    setCanListForOrg(true);
    setCreateError(null);
    setForm((prev) => ({ ...prev, company_name: found.name || prev.company_name }));
  };

  useEffect(() => {
    const loadOrgContextFromParam = async () => {
      if (!router.isReady) return;
      if (!user) return;
      if (!orgParam) return;

      setLoadingOrg(true);
      setCreateError(null);

      let foundOrg: Org | null = null;

      try {
        if (looksLikeUuid(orgParam)) {
          const { data, error } = await supabase
            .from("organizations")
            .select("id,name,slug,created_by,is_active")
            .eq("id", orgParam)
            .eq("is_active", true)
            .maybeSingle();

          if (!error && data) foundOrg = data as Org;
        } else {
          const { data, error } = await supabase
            .from("organizations")
            .select("id,name,slug,created_by,is_active")
            .eq("slug", orgParam)
            .eq("is_active", true)
            .maybeSingle();

          if (!error && data) foundOrg = data as Org;
        }

        if (!foundOrg) {
          setOrg(null);
          setCanListForOrg(false);
          setCreateError("Organization not found or inactive.");
          return;
        }

        setOrg(foundOrg);
        setSelectedOrgId(foundOrg.id);

        let allowed = false;

        if (foundOrg.created_by && foundOrg.created_by === user.id) {
          allowed = true;
        } else {
          const { data: mem, error: memErr } = await supabase
            .from("org_members")
            .select("role")
            .eq("org_id", foundOrg.id)
            .eq("user_id", user.id)
            .maybeSingle<{ role: OrgMemberRole }>();

          if (!memErr && mem && (mem.role === "owner" || mem.role === "co_owner")) {
            allowed = true;
          }
        }

        setCanListForOrg(allowed);

        setForm((prev) => ({
          ...prev,
          company_name: foundOrg!.name || prev.company_name,
        }));

        if (!allowed) {
          setCreateError("Only the organization owner/co-owner can list products for this org.");
        }
      } catch (e: any) {
        console.error("Error loading org context", e);
        setOrg(null);
        setCanListForOrg(false);
        setCreateError("Could not load organization.");
      } finally {
        setLoadingOrg(false);
      }
    };

    loadOrgContextFromParam();
  }, [router.isReady, user, isEditMode, orgParam]);

  useEffect(() => {
    const loadExisting = async () => {
      if (!router.isReady) return;
      if (!isEditMode || !user || !id) return;

      setLoadingExisting(true);
      setCreateError(null);

      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();

      if (error || !data) {
        console.error("Error loading product for edit", error);
        setCreateError("Could not load product for editing.");
        setLoadingExisting(false);
        return;
      }

      const product = data as ProductRow;

      if (product.owner_id && product.owner_id !== user.id) {
        setCreateError("You are not allowed to edit this product.");
        setLoadingExisting(false);
        return;
      }

      setForm({
        name: product.name || "",
        company_name: product.company_name || "",
        category: product.category || "",
        short_description: product.short_description || "",
        full_description: (product as any).full_description || "",
        specifications: product.specifications || "",
        product_url: product.product_url || "",
        keywords: product.keywords || "",
        price_type: product.price_type === "fixed" ? "fixed" : "contact",
        price_value: product.price_value ? String(product.price_value) : "",
        in_stock: product.in_stock === false ? "no" : "yes",
        stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : "",
      });

      setExistingImages([product.image1_url, product.image2_url, product.image3_url]);
      setExistingDatasheetUrl(product.datasheet_url);

      if (product.org_id && !org) {
        setLoadingOrg(true);

        const { data: o } = await supabase
          .from("organizations")
          .select("id,name,slug,created_by,is_active")
          .eq("id", product.org_id)
          .eq("is_active", true)
          .maybeSingle();

        if (o) {
          setOrg(o as Org);
          setSelectedOrgId((o as Org).id);
          setForm((prev) => ({ ...prev, company_name: (o as Org).name || prev.company_name }));
          setCanListForOrg(true);
        }

        setLoadingOrg(false);
      }

      setLoadingExisting(false);
    };

    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, isEditMode, id, user]);

  const handleFormChange =
    (field: keyof typeof form) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setImageFiles(files);
  };

  const handleDatasheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDatasheetFile(file);
  };

  const uploadFileAndGetUrl = async (
    bucket: "product-images" | "product-datasheets",
    path: string,
    file: File
  ): Promise<string | null> => {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
    });

    if (uploadError) {
      console.error(`Error uploading to ${bucket}`, uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isEditMode) {
      if (!org) {
        setCreateError(
          isMarketplaceCreate
            ? "Choose an organization to publish under."
            : "You must create a product from an organization page."
        );
        return;
      }
      if (!canListForOrg) {
        setCreateError("Only the organization owner/co-owner can list products for this org.");
        return;
      }
    }

    setCreating(true);
    setCreateError(null);

    if (!form.name.trim()) {
      setCreateError("Product name is required.");
      setCreating(false);
      return;
    }

    const inStock = form.in_stock === "yes";

    const stockQty =
      form.stock_quantity.trim() === ""
        ? null
        : Number.isNaN(Number(form.stock_quantity))
        ? null
        : parseInt(form.stock_quantity, 10);

    const priceType = form.price_type === "fixed" ? "fixed" : "contact";
    const priceValue =
      priceType === "fixed" && form.price_value.trim() !== "" ? form.price_value.trim() : null;

    try {
      let productId: string;

      if (isEditMode && id) {
        const { error: updateBaseError } = await supabase
          .from("products")
          .update({
            name: form.name.trim(),
            company_name: form.company_name.trim() || null,
            category: form.category || null,
            short_description: form.short_description.trim() || null,
            full_description: form.full_description.trim() || null,
            specifications: form.specifications.trim() || null,
            product_url: form.product_url.trim() || null,
            keywords: form.keywords.trim() || null,
            price_type: priceType,
            price_value: priceValue,
            in_stock: inStock,
            stock_quantity: stockQty,
          })
          .eq("id", id)
          .eq("owner_id", user.id);

        if (updateBaseError) {
          console.error("Error updating product", updateBaseError);
          setCreateError("Could not update product. Please try again.");
          setCreating(false);
          return;
        }

        productId = id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("products")
          .insert({
            owner_id: user.id,
            org_id: org!.id,
            name: form.name.trim(),
            company_name: org!.name,
            category: form.category || null,
            short_description: form.short_description.trim() || null,
            full_description: form.full_description.trim() || null,
            specifications: form.specifications.trim() || null,
            product_url: form.product_url.trim() || null,
            keywords: form.keywords.trim() || null,
            price_type: priceType,
            price_value: priceValue,
            in_stock: inStock,
            stock_quantity: stockQty,
          })
          .select()
          .single();

        if (insertError || !inserted) {
          console.error("Error creating product", insertError);
          setCreateError("Could not create product. Please try again.");
          setCreating(false);
          return;
        }

        productId = (inserted as any).id as string;
      }

      let imageUrls: (string | null)[] = isEditMode ? [...existingImages] : [null, null, null];
      let datasheetUrl: string | null = isEditMode ? existingDatasheetUrl : null;

      if (imageFiles.length > 0) {
        imageUrls = [null, null, null];
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${productId}/image-${i + 1}-${Date.now()}.${ext}`;
          const url = await uploadFileAndGetUrl("product-images", path, file);
          imageUrls[i] = url;
        }
      }

      if (datasheetFile) {
        const ext = datasheetFile.name.split(".").pop() || "pdf";
        const path = `${user.id}/${productId}/datasheet-${Date.now()}.${ext}`;
        const url = await uploadFileAndGetUrl("product-datasheets", path, datasheetFile);
        datasheetUrl = url;
      }

      const { error: updateFilesError } = await supabase
        .from("products")
        .update({
          image1_url: imageUrls[0],
          image2_url: imageUrls[1],
          image3_url: imageUrls[2],
          datasheet_url: datasheetUrl,
        })
        .eq("id", productId);

      if (updateFilesError) {
        console.error("Error updating product with file URLs", updateFilesError);
      }

      router.push(`/products/${productId}`);
    } catch (err) {
      console.error("Unexpected error", err);
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const title = isEditMode ? "Edit your product" : "List your product";
  const subtitle = isEditMode
    ? "Update the information for this product listing."
    : "Create a product listing that will appear in the Quantum5ocial marketplace.";

  const lockCompanyField = !!org;

  const backTarget = useMemo(() => {
  // ✅ If editing: always go back to the product detail page
  if (isEditMode) return id ? `/products/${id}` : "/products";

  // ✅ If creating from an org page: go back to org products tab
  if (org?.slug) return `/orgs/${org.slug}?tab=products`;

  // ✅ If creating from marketplace: go back to products list
  return "/products";
}, [isEditMode, id, org?.slug]);

  const showPublishAsPicker = !isEditMode && isMarketplaceCreate && eligibleOrgs.length > 1;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* ✅ negative top offset like jobs/new */}
        <section className="section" style={{ marginTop: -70 }}>
          <div className="section-header" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="section-title">{title}</div>
              <div className="section-sub">
                {subtitle}
                {!isEditMode && org?.name ? (
                  <span
                    style={{
                      display: "block",
                      marginTop: 6,
                      color: "rgba(148,163,184,0.95)",
                    }}
                  >
                    Publishing as:{" "}
                    <strong style={{ color: "rgba(226,232,240,0.95)" }}>{org.name}</strong>
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => router.push(backTarget)}
                className="nav-ghost-btn"
                style={{ cursor: "pointer" }}
              >
                ← Back
              </button>
            </div>
          </div>

          {!isEditMode && loadingOrg && <p className="profile-muted">Loading organization…</p>}

          {loadingExisting && isEditMode ? (
            <p className="profile-muted">Loading product data…</p>
          ) : (
            <div className="products-create-layout">
              <div className="products-create-main" style={{ gridColumn: "1 / -1" }}>
                <div className="products-create-card">
                  <h3 className="products-create-title">Product details</h3>

                  <form onSubmit={handleSubmit} className="products-create-form">
                    {/* Basics */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Basics</h4>
                        <p className="products-section-sub">
                          The core information that appears on the product card.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field">
                          <label>Product name *</label>
                          <input
                            type="text"
                            value={form.name}
                            onChange={handleFormChange("name")}
                            required
                          />
                        </div>

                        {showPublishAsPicker && (
                          <div className="products-field">
                            <label>Publish as *</label>
                            <select
                              value={selectedOrgId}
                              onChange={(e) => onPickOrg(e.target.value)}
                            >
                              <option value="">Select…</option>
                              {eligibleOrgs.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              This determines the organization shown on the product listing.
                            </span>
                          </div>
                        )}

                        <div className="products-field">
                          <label>Company / organisation</label>
                          <input
                            type="text"
                            value={form.company_name}
                            onChange={handleFormChange("company_name")}
                            placeholder="Startup, company, or lab name"
                            disabled={lockCompanyField}
                          />
                          {lockCompanyField && (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              This is fixed to the organization you’re publishing under.
                            </span>
                          )}
                        </div>

                        <div className="products-field">
                          <label>Category</label>
                          <select value={form.category} onChange={handleFormChange("category")}>
                            <option value="">Select…</option>
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="products-field">
                          <label>Product URL</label>
                          <input
                            type="url"
                            value={form.product_url}
                            onChange={handleFormChange("product_url")}
                            placeholder="https://…"
                          />
                        </div>

                        <div className="products-field products-field-full">
                          <label>Short description</label>
                          <input
                            type="text"
                            value={form.short_description}
                            onChange={handleFormChange("short_description")}
                            placeholder="1–2 line summary of what this product does."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Technical details */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Technical details</h4>
                        <p className="products-section-sub">
                          Add a quick one-liner, plus a longer description if needed.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field products-field-full">
                          <label>Technical details (one line)</label>
                          <input
                            type="text"
                            value={form.specifications}
                            onChange={handleFormChange("specifications")}
                            placeholder="e.g. 4–12 GHz, 40 dB gain, 1–8 K, USB/Ethernet control…"
                          />
                        </div>

                        <div className="products-field products-field-full">
                          <label>Full description</label>
                          <textarea
                            rows={6}
                            value={form.full_description}
                            onChange={handleFormChange("full_description")}
                            placeholder="Long-form description: features, use-cases, integration notes, performance, lead time, etc."
                          />
                        </div>

                        <div className="products-field products-field-full">
                          <label>Keywords (comma-separated)</label>
                          <input
                            type="text"
                            value={form.keywords}
                            onChange={handleFormChange("keywords")}
                            placeholder="cryostat, RF, control, amplifier"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price & stock */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Price & stock</h4>
                        <p className="products-section-sub">
                          You can either show a fixed price or let users contact you for a quote.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field">
                          <label>Price</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 13 }}>
                              <input
                                type="radio"
                                name="price_type"
                                value="fixed"
                                checked={form.price_type === "fixed"}
                                onChange={handleFormChange("price_type")}
                                style={{ marginRight: 6 }}
                              />
                              Fixed price
                            </label>
                            <label style={{ fontSize: 13 }}>
                              <input
                                type="radio"
                                name="price_type"
                                value="contact"
                                checked={form.price_type === "contact"}
                                onChange={handleFormChange("price_type")}
                                style={{ marginRight: 6 }}
                              />
                              Contact for price
                            </label>
                          </div>
                        </div>

                        <div className="products-field">
                          <label>Price details</label>
                          <input
                            type="text"
                            value={form.price_value}
                            onChange={handleFormChange("price_value")}
                            placeholder="€3,000 per unit, $10k per system, etc."
                            disabled={form.price_type !== "fixed"}
                          />
                        </div>

                        <div className="products-field">
                          <label>In stock?</label>
                          <select value={form.in_stock} onChange={handleFormChange("in_stock")}>
                            <option value="yes">In stock</option>
                            <option value="no">Out of stock</option>
                          </select>
                        </div>

                        <div className="products-field">
                          <label>Stock quantity</label>
                          <input
                            type="number"
                            min={0}
                            value={form.stock_quantity}
                            onChange={handleFormChange("stock_quantity")}
                            placeholder="Optional"
                            disabled={form.in_stock !== "yes"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Media */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Media</h4>
                        <p className="products-section-sub">
                          Good images and a clear datasheet make your product easier to evaluate.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field products-field-full">
                          <label>Product images (up to 3)</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImagesChange}
                          />
                          {imageFiles.length > 0 ? (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              Selected: {imageFiles.map((f) => f.name).join(", ")}
                            </span>
                          ) : (
                            isEditMode &&
                            existingImages.some(Boolean) && (
                              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                Existing images will be kept unless you upload new ones.
                              </span>
                            )
                          )}
                        </div>

                        <div className="products-field products-field-full">
                          <label>Datasheet (PDF)</label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleDatasheetChange}
                          />
                          {datasheetFile ? (
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              Selected: {datasheetFile.name}
                            </span>
                          ) : (
                            isEditMode &&
                            existingDatasheetUrl && (
                              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                Existing datasheet will be kept unless you upload a new one.
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="products-create-actions">
                      <button
                        type="submit"
                        className="nav-cta"
                        disabled={
                          creating ||
                          (!isEditMode && (!org || !canListForOrg)) ||
                          loadingOrg ||
                          loading
                        }
                      >
                        {creating
                          ? isEditMode
                            ? "Saving…"
                            : "Publishing…"
                          : isEditMode
                          ? "Save changes"
                          : "Publish product"}
                      </button>

                      {createError && <span className="products-status error">{createError}</span>}
                    </div>
                  </form>
                </div>
              </div>

              {/* ✅ tips removed */}
              <aside className="products-create-aside" style={{ display: "none" }} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}

(NewProductPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
