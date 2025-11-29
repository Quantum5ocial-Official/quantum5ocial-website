// components/JobCard.tsx
import Link from "next/link";

export type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  keywords: string | null;
  salary_display: string | null;
};

type JobCardProps = {
  job: Job;
  isSaved: boolean;
  onToggleSave: () => void;
};

const JobCard: React.FC<JobCardProps> = ({ job, isSaved, onToggleSave }) => {
  const keywordTags =
    job.keywords
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) || [];

  const title = job.title || "Untitled role";

  return (
    <div className="job-card">
      {/* Top row: just a spacer + heart on the right */}
      <div className="job-card-top">
        <span />
        <button
          type="button"
          className="job-save-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave();
          }}
          aria-label={isSaved ? "Unsave job" : "Save job"}
        >
          <span className={`job-heart ${isSaved ? "saved" : ""}`}>
            {isSaved ? "❤️" : "🤍"}
          </span>
        </button>
      </div>

      {/* Title links to job detail */}
      <Link href={`/jobs/${job.id}`} className="job-card-title">
        {title}
      </Link>

      {/* Company / location / remote */}
      {(job.company_name || job.location || job.remote_type) && (
        <div className="job-card-meta">
          {[job.company_name, job.location, job.remote_type]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      {/* Short description */}
      {job.short_description && (
        <div className="job-card-meta">{job.short_description}</div>
      )}

      {/* Keywords */}
      {keywordTags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 6,
          }}
        >
          {keywordTags.slice(0, 4).map((tag) => (
            <span key={tag} className="job-chip">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: salary bottom-left, employment type bottom-right */}
      <div
        className="job-card-bottom"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
        }}
      >
        {/* Salary on the left */}
        {job.salary_display ? (
          <span className="job-salary">{job.salary_display}</span>
        ) : (
          <span />
        )}

        {/* Employment type on the right */}
        {job.employment_type && (
          <span className="job-badge">{job.employment_type}</span>
        )}
      </div>
    </div>
  );
};

export default JobCard;
