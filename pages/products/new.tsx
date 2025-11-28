// pages/products/new.tsx
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

type ProductRow = {
  id: string;
  owner_id: string | null;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
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

export default function NewProductPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const { id } = router.query;

  const isEditMode = !!id;

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

  // existing file URLs when editing
  const [existingImages, setExistingImages] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [existingDatasheetUrl, setExistingDatasheetUrl] = useState<string | null>(
    null
  );

  // new files chosen in the form
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);

  const [loadingExisting, setLoadingExisting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace(
        isEditMode
          ? `/auth?redirect=/products/new?id=${id}`
          : "/auth?redirect=/products/new"
      );
    }
  }, [loading, user, router, isEditMode, id]);

  // If edit mode: load existing product & prefill
  useEffect(() => {
    const loadExisting = async () => {
      if (!isEditMode || !user || !id) return;

      setLoadingExisting(true);
      setCreateError(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();

      if (error || !data) {
        console.error("Error loading product for edit", error);
        setCreateError("Could not load product for editing.");
        setLoadingExisting(false);
        return;
      }

      const product = data as ProductRow;

      // Only allow owner to edit
      if (product.owner_id && product.owner_id !== user.id) {
        setCreateError("You are not allowed to edit this product.");
        setLoadingExisting(false);
        return;
      }

      // Prefill form
      setForm({
        name: product.name || "",
        company_name: product.company_name || "",
        category: product.category || "",
        short_description: product.short_description || "",
        specifications: product.specifications || "",
        product_url: product.product_url || "",
        keywords: product.keywords || "",
        price_type: product.price_type === "fixed" ? "fixed" : "contact",
        price_value: product.price_value ? String(product.price_value) : "",
        in_stock: product.in_stock === false ? "no" : "yes",
        stock_quantity:
          product.stock_quantity != null
            ? String(product.stock_quantity)
            : "",
      });

      setExistingImages([
        product.image1_url,
        product.image2_url,
        product.image3_url,
      ]);
      setExistingDatasheetUrl(product.datasheet_url);

      setLoadingExisting(false);
    };

    if (isEditMode) {
      loadExisting();
    }
  }, [isEditMode, id, user]);

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

    try {
      let productId: string;

      if (isEditMode && id) {
        // UPDATE existing product
        const { error: updateBaseError } = await supabase
          .from("products")
          .update({
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
          .eq("id", id as string)
          .eq("owner_id", user.id);

        if (updateBaseError) {
          console.error("Error updating product", updateBaseError);
          setCreateError("Could not update product. Please try again.");
          setCreating(false);
          return;
        }

        productId = id as string;
      } else {
        // INSERT new product
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

        productId = (inserted as any).id as string;
      }

      // --- FILES ---

      // Start with existing URLs if we’re editing; otherwise empty.
      let imageUrls: (string | null)[] = isEditMode
        ? [...existingImages]
        : [null, null, null];
      let datasheetUrl: string | null = isEditMode
        ? existingDatasheetUrl
        : null;

      // If user selected new images, we overwrite the old ones with only the new ones.
      if (imageFiles.length > 0) {
        imageUrls = [null, null, null];
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${productId}/image-${
            i + 1
          }-${Date.now()}.${ext}`;
          const url = await uploadFileAndGetUrl("product-images", path, file);
          imageUrls[i] = url;
        }
      }

      // If user selected a new datasheet, overwrite; otherwise keep existing.
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

      // Update URLs (for both create and edit)
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
        // Non-fatal; we still continue.
      }

      // Redirect to product detail after save
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

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="section-title">{title}</div>
              <div className="section-sub">{subtitle}</div>
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  isEditMode
                    ? router.push(`/products/${id}`)
                    : router.push("/products")
                }
                className="nav-ghost-btn"
                style={{ cursor: "pointer" }}
              >
                ← Back to {isEditMode ? "product" : "marketplace"}
              </button>
            </div>
          </div>

          {loadingExisting && isEditMode ? (
            <p className="profile-muted">Loading product data…</p>
          ) : (
            <div className="products-create-layout">
              <div className="products-create-main">
                <div className="products-create-card">
                  <h3 className="products-create-title">Product details</h3>

                  <form onSubmit={handleSubmit} className="products-create-form">
                    {/* SECTION: Basic info */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Basics</h4>
                        <p className="products-section-sub">
                          The core information that appears on the product
                          card.
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
                      </div>
                    </div>

                    {/* SECTION: Technical details */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">
                          Technical details
                        </h4>
                        <p className="products-section-sub">
                          Specifications and keywords used for discovery and
                          matching.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field products-field-full">
                          <label>Specifications / technical details</label>
                          <textarea
                            rows={4}
                            value={form.specifications}
                            onChange={handleFormChange("specifications")}
                            placeholder="Key specs, performance, interfaces, compatibility, etc."
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

                    {/* SECTION: Price & stock */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">
                          Price & stock
                        </h4>
                        <p className="products-section-sub">
                          You can either show a fixed price or let users
                          contact you for a quote.
                        </p>
                      </div>

                      <div className="products-grid">
                        <div className="products-field">
                          <label>Price</label>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
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
                      </div>
                    </div>

                    {/* SECTION: Media */}
                    <div className="products-section">
                      <div className="products-section-header">
                        <h4 className="products-section-title">Media</h4>
                        <p className="products-section-sub">
                          Good images and a clear datasheet make your product
                          easier to evaluate.
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
                            <span
                              style={{ fontSize: 12, color: "#9ca3af" }}
                            >
                              Selected:{" "}
                              {imageFiles.map((f) => f.name).join(", ")}
                            </span>
                          ) : (
                            isEditMode &&
                            (existingImages.some(Boolean) && (
                              <span
                                style={{ fontSize: 12, color: "#9ca3af" }}
                              >
                                Existing images will be kept unless you upload
                                new ones.
                              </span>
                            ))
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
                            <span
                              style={{ fontSize: 12, color: "#9ca3af" }}
                            >
                              Selected: {datasheetFile.name}
                            </span>
                          ) : (
                            isEditMode &&
                            existingDatasheetUrl && (
                              <span
                                style={{ fontSize: 12, color: "#9ca3af" }}
                              >
                                Existing datasheet will be kept unless you
                                upload a new one.
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
                        disabled={creating}
                      >
                        {creating
                          ? isEditMode
                            ? "Saving…"
                            : "Publishing…"
                          : isEditMode
                          ? "Save changes"
                          : "Publish product"}
                      </button>

                      {createError && (
                        <span className="products-status error">
                          {createError}
                        </span>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Right-hand tips panel */}
              <aside className="products-create-aside">
                <div className="products-tips-card">
                  <h4 className="products-tips-title">
                    Tips for a strong listing
                  </h4>
                  <ul className="products-tips-list">
                    <li>Use a clear, specific product name.</li>
                    <li>
                      Mention key specs (frequency range, noise, temp, etc.).
                    </li>
                    <li>Add relevant keywords for better discovery.</li>
                    <li>Upload at least one clean product image.</li>
                    <li>Add a datasheet so people can evaluate quickly.</li>
                  </ul>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
