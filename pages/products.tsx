import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  created_at: string;
  owner_id: string | null;
  name: string;
  company_name: string | null;
  short_description: string | null;
  specifications: string | null;
  keywords: string | null;
  category: string | null;
  product_url: string | null;
  datasheet_url: string | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  price_type: string | null;   // 'fixed' or 'contact'
  price_value: string | null;  // text description when fixed
};

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

export default function ProductsPage() {
  const { user } = useSupabaseUser();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // form state for creating a new product
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    category: "",
    short_description: "",
    specifications: "",
    product_url: "",
    keywords: "",
    price_type: "contact", // 'fixed' | 'contact'
    price_value: "",
    in_stock: "yes", // 'yes' | 'no'
    stock_quantity: "",
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading products", error);
        setProducts([]);
      } else {
        setProducts(data as Product[]);
      }

      setLoading(false);
    };

    loadProducts();
  }, []);

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

  const handleImagesChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setImageFiles(files);
  };

  const handleDatasheetChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    setDatasheetFile(file);
  };

  const uploadFileAndGetUrl = async (
    bucket: "product-images" | "product-datasheets",
    path: string,
    file: File
  ): Promise<string | null> => {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error(`Error uploading to ${bucket}`, uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(false);

    if (!form.name.trim()) {
      setCreateError("Product name is required.");
      setCreating(false);
      return;
    }

    // Interpret stock + price fields
    const inStock = form.in_stock === "yes";
    const stockQty =
      form.stock_quantity.trim() === ""
        ? null
        : Number.isNaN(Number(form.stock_quantity))
        ? null
        : parseInt(form.stock_quantity, 10);

    const priceType = form.price_type === "fixed" ? "fixed" : "contact";
    const priceValue =
      priceType === "fixed" && form.price_value.trim() !== ""
        ? form.price_value.trim()
        : null;

    // 1) Insert base product row (without files)
    const { data: inserted, error: insertError } = await supabase
      .from("products")
      .insert({
        owner_id: user.id,
        name: form.name.trim(),
        company_name: form.company_name.trim() || null,
        category: form.category || null,
        short_description: form.short_description.trim() || null,
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

    const productId = (inserted as Product).id;

    // 2) Upload files (images + datasheet) if present
    let imageUrls: (string | null)[] = [null, null, null];
    let datasheetUrl: string | null = null;

    try {
      // images
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${productId}/image-${i + 1}-${Date.now()}.${ext}`;
        const url = await uploadFileAndGetUrl("product-images", path, file);
        imageUrls[i] = url;
      }

      // datasheet
      if (datasheetFile) {
        const ext = datasheetFile.name.split(".").pop() || "pdf";
        const path = `${user.id}/${productId}/datasheet-${Date.now()}.${ext}`;
        const url = await uploadFileAndGetUrl(
          "product-datasheets",
          path,
          datasheetFile
        );
        datasheetUrl = url;
      }
    } catch (err) {
      console.error("Error during file upload", err);
      // we still proceed to update whatever uploads succeeded
    }

    // 3) Update product row with file URLs
    const { error: updateError, data: updated } = await supabase
      .from("products")
      .update({
        image1_url: imageUrls[0],
        image2_url: imageUrls[1],
        image3_url: imageUrls[2],
        datasheet_url: datasheetUrl,
      })
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating product with file URLs", updateError);
    }

    const finalProduct = (updated || inserted) as Product;

    // 4) Update local state + reset form
    setProducts((prev) => [finalProduct, ...prev]);
    setCreateSuccess(true);
    setForm({
      name: "",
      company_name: "",
      category: "",
      short_description: "",
      specifications: "",
      product_url: "",
      keywords: "",
      price_type: "contact",
      price_value: "",
      in_stock: "yes",
      stock_quantity: "",
    });
    setImageFiles([]);
    setDatasheetFile(null);

    setCreating(false);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      categoryFilter === "All" ||
      !categoryFilter ||
      (p.category || "").toLowerCase() === categoryFilter.toLowerCase();

    const text =
      (p.name || "") +
      " " +
      (p.company_name || "") +
      " " +
      (p.short_description || "") +
      " " +
      (p.specifications || "") +
      " " +
      (p.keywords || "");

    const matchesSearch = text.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Quantum product marketplace</div>
              <div className="section-sub">
                A curated space for quantum startups, vendors, and labs to show
                their hardware, software, and services.
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="products-filters">
            <input
              type="text"
              placeholder="Search by product, company, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="products-search"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="products-select"
            >
              <option value="All">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Create product section (only when logged in) */}
          {user && (
            <div className="products-create-card">
              <h3 className="products-create-title">List a product</h3>
              <p className="products-create-sub">
                Add your hardware, software, service, or platform to the quantum
                marketplace.
              </p>

              <form onSubmit={handleCreateProduct} className="products-create-form">
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

                  <div className="products-field">
                    <label>Company / organisation</label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={handleFormChange("company_name")}
                      placeholder="Startup, company, or lab name"
                    />
                  </div>

                  <div className="products-field">
                    <label>Category</label>
                    <select
                      value={form.category}
                      onChange={handleFormChange("category")}
                    >
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

                  <div className="products-field products-field-full">
                    <label>Specifications / technical details</label>
                    <textarea
                      rows={3}
                      value={form.specifications}
                      onChange={handleFormChange("specifications")}
                      placeholder="Key specs, performance, compatibility, etc."
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

                  {/* Price type */}
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

                  {/* Stock info */}
                  <div className="products-field">
                    <label>In stock?</label>
                    <select
                      value={form.in_stock}
                      onChange={handleFormChange("in_stock")}
                    >
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

                  {/* Files */}
                  <div className="products-field products-field-full">
                    <label>Product images (up to 3)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                    />
                    {imageFiles.length > 0 && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        Selected: {imageFiles.map((f) => f.name).join(", ")}
                      </span>
                    )}
                  </div>

                  <div className="products-field products-field-full">
                    <label>Datasheet (PDF)</label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleDatasheetChange}
                    />
                    {datasheetFile && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        Selected: {datasheetFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="products-create-actions">
                  <button
                    type="submit"
                    className="nav-cta"
                    disabled={creating}
                  >
                    {creating ? "Listing…" : "Publish product"}
                  </button>

                  {createError && (
                    <span className="products-status error">{createError}</span>
                  )}
                  {createSuccess && (
                    <span className="products-status success">
                      Product listed ✓
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Product cards */}
          <div className="products-list">
            {loading && <div className="products-loading">Loading products…</div>}

            {!loading && filteredProducts.length === 0 && (
              <div className="products-empty">
                No products found yet.  
                Be the first quantum startup or vendor to list something here.
              </div>
            )}

            {!loading &&
              filteredProducts.map((p) => {
                const images = [p.image1_url, p.image2_url, p.image3_url].filter(
                  Boolean
                ) as string[];
                const priceLabel =
                  p.price_type === "fixed" && p.price_value
                    ? p.price_value
                    : "Contact for price";
                const stockLabel =
                  p.in_stock === false
                    ? "Out of stock"
                    : p.stock_quantity && p.stock_quantity > 0
                    ? `In stock • ${p.stock_quantity} pcs`
                    : "In stock";

                return (
                  <article key={p.id} className="product-card">
                    <div className="product-header">
                      <h3 className="product-name">{p.name}</h3>
                      {p.category && (
                        <span className="product-category">{p.category}</span>
                      )}
                    </div>

                    {p.company_name && (
                      <div className="product-company">{p.company_name}</div>
                    )}

                    {images.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          marginBottom: 4,
                          display: "flex",
                          gap: 6,
                          overflow: "hidden",
                        }}
                      >
                        {images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${p.name} image ${idx + 1}`}
                            style={{
                              width: "32%",
                              borderRadius: 8,
                              objectFit: "cover",
                              maxHeight: 120,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {p.short_description && (
                      <p className="product-short">{p.short_description}</p>
                    )}

                    {p.specifications && (
                      <p
                        style={{
                          margin: "2px 0 4px",
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        {p.specifications}
                      </p>
                    )}

                    {p.keywords && (
                      <div className="product-tags">
                        {p.keywords.split(",").map((tag) => (
                          <span key={tag.trim()} className="product-tag-chip">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="product-footer">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <span className="product-price-model">{priceLabel}</span>
                        <span
                          style={{ fontSize: 11, color: "#a3e635" }}
                        >
                          {stockLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          alignItems: "flex-end",
                        }}
                      >
                        {p.datasheet_url && (
                          <a
                            href={p.datasheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="product-link"
                          >
                            View datasheet
                          </a>
                        )}
                        {p.product_url && (
                          <a
                            href={p.product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="product-link"
                          >
                            View product
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </div>
    </>
  );
}
