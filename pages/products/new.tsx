import { useEffect, useState } from "react";
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

export default function NewProductPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  // If user somehow not logged in, rely on _app redirect, but as a safety:
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/products/new");
    }
  }, [loading, user, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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

    const productId = (inserted as any).id as string;

    // 2) Upload files if present
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
    }

    // 3) Update product row with file URLs
    const { error: updateError } = await supabase
      .from("products")
      .update({
        image1_url: imageUrls[0],
        image2_url: imageUrls[1],
        image3_url: imageUrls[2],
        datasheet_url: datasheetUrl,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Error updating product with file URLs", updateError);
      // but we still created the product, so we proceed
    }

    // 4) Redirect back to marketplace
    router.push("/products");
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="section-title">List your product</div>
              <div className="section-sub">
                Create a product listing that will appear in the Quantum5ocial
                marketplace.
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="nav-ghost-btn"
                style={{ cursor: "pointer" }}
              >
                ← Back to marketplace
              </button>
            </div>
          </div>

          <div className="products-create-card">
            <h3 className="products-create-title">Product details</h3>
            <p className="products-create-sub">
              Add clear information so researchers and companies can quickly
              understand what you offer.
            </p>

            <form onSubmit={handleSubmit} className="products-create-form">
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

                {/* Price */}
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

                {/* Stock */}
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
                  {creating ? "Publishing…" : "Publish product"}
                </button>

                {createError && (
                  <span className="products-status error">{createError}</span>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
