import { GetServerSideProps } from "next";
import { supabase } from "../lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  organisation_name: string | null;
  location_text: string | null;
  job_type: string | null;
};

type Props = {
  jobs: Job[];
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const { data } = await supabase
    .from("jobs")
    .select("id, title, organisation_name, location_text, job_type")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return {
    props: {
      jobs: data ?? [],
    },
  };
};

export default function JobsPage({ jobs }: Props) {
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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Quantum jobs</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>
          Live preview of jobs posted on Quantum5ocial. Later we can add filters, search and
          categories.
        </p>

        {jobs.length === 0 && (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            No jobs yet. Once you or others post, they will appear here.
          </p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #1f2937",
                background:
                  "radial-gradient(circle at top left, rgba(34,211,238,0.10), transparent 55%), #020617",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {job.title}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>
                {job.organisation_name || "Unknown org"} ·{" "}
                {job.location_text || "Location TBA"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Type: {job.job_type || "other"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
