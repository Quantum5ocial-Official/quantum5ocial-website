import { GetServerSideProps } from "next";
import { supabase } from "../lib/supabaseClient";

type Job = {
  id: string;
  title: string;
  organisation_name: string | null;
  location_text: string | null;
  job_type: string | null;
  is_published: boolean;
};

type Props = {
  jobs: Job[];
  error: string | null;
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  // read only published jobs
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, organisation_name, location_text, job_type, is_published")
    .eq("is_published", true)
    .limit(5);

  return {
    props: {
      jobs: data ?? [],
      error: error ? error.message : null,
    },
  };
};

export default function TestSupabasePage({ jobs, error }: Props) {
  return (
    <div style={{ padding: "24px", fontFamily: "system-ui", color: "#e5e7eb", background: "#020617", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Supabase test · jobs table</h1>
      <p style={{ marginBottom: "16px", color: "#9ca3af" }}>
        This page queries the <code>jobs</code> table on the server using your Supabase project.
      </p>

      {error && (
        <div style={{ marginBottom: "16px", padding: "10px 12px", borderRadius: 8, background: "#7f1d1d", color: "#fecaca" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {jobs.length === 0 && !error && (
        <p style={{ color: "#9ca3af" }}>
          No published jobs found. Try adding a row in Supabase → Table Editor → jobs (set <code>is_published = true</code>).
        </p>
      )}

      {jobs.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
          {jobs.map((job) => (
            <li
              key={job.id}
              style={{
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#020617",
                border: "1px solid #1f2937",
              }}
            >
              <div style={{ fontWeight: 600 }}>{job.title}</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                {job.organisation_name || "Unknown org"} · {job.location_text || "Location TBA"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Type: {job.job_type || "other"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
