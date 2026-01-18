import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

type JobType = "internship" | "msc" | "phd" | "postdoc" | "researcher" | "engineer" | "other";
type WorkMode = "onsite" | "hybrid" | "remote";

export default function PostJobPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [locationText, setLocationText] = useState("");
  const [jobType, setJobType] = useState<JobType>("other");
  const [workMode, setWorkMode] = useState<WorkMode>("onsite");
  const [description, setDescription] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in
  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setUserId(null);
      } else {
        setUserId(data.user.id);
      }
      setCheckingAuth(false);
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) {
      setError("You must be logged in to post a job.");
      return;
    }

    if (!title || !organisationName) {
      setError("Please fill in at least a title and organisation name.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("jobs").insert({
        title,
        organisation_name: organisationName,
        location_text: locationText || null,
        job_type: jobType,
        work_mode: workMode,
        description: description || null,
        apply_url: applyUrl || null,
        contact_email: contactEmail || null,
        owner_id: userId,
        is_published: true,
      })
        .select()
        .single();

      if (data) {
        // Sync to search index
        await fetch("/api/search/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "job",
            data: {
              ...data,
              company_name: organisationName, // Map mismatch naming
              additional_description: description,
              location: locationText
            }
          })
        });
      }

      if (error) {
        setError(error.message);
      } else {
        setSuccess("Job posted successfully!");
        // Reset some fields
        setTitle("");
        setDescription("");
        setApplyUrl("");
        setContactEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        Checking session...
      </div>
    );
  }

  if (!userId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            borderRadius: 18,
            border: "1px solid #1f2937",
            padding: "18px 20px",
            background:
              "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 55%), rgba(15,23,42,0.96)",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Login required</h1>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
            You need to be logged in to post jobs. Please go to the auth page and log in or
            create an account.
          </p>
          <button
            onClick={() => router.push("/auth")}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "1px solid #22d3ee",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Go to login / sign up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Post a job</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>
          This is a simple MVP form that inserts directly into the <code>jobs</code> table.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Job title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Organisation / lab name *
            </label>
            <input
              value={organisationName}
              onChange={(e) => setOrganisationName(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Location
            </label>
            <input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="City / country / remote"
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 10,
              flexWrap: "wrap",
              fontSize: 13,
            }}
          >
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Job type</label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 9,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              >
                <option value="internship">Internship</option>
                <option value="msc">MSc project</option>
                <option value="phd">PhD position</option>
                <option value="postdoc">Postdoc</option>
                <option value="researcher">Researcher</option>
                <option value="engineer">Engineer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ display: "block", marginBottom: 4 }}>Work mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 9,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              >
                <option value="onsite">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Short description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Application link (URL)
            </label>
            <input
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              Contact email
            </label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="jobs@lab-or-company.com"
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 9,
                background: "#7f1d1d",
                color: "#fecaca",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 9,
                background: "#064e3b",
                color: "#bbf7d0",
                fontSize: 12,
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #22d3ee",
              background: loading ? "#0f172a" : "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {loading ? "Publishing..." : "Publish job"}
          </button>
        </form>
      </div>
    </div>
  );
}
