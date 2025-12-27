// pages/ecosystem/cv.tsx
import Link from "next/link";

export default function EcosystemCvPage() {
  return (
    <section className="section">
      <div className="section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="section-title">My CV</div>
          <div className="section-sub">
            Placeholder page. Next: add editable CV blocks + export/share link.
          </div>
        </div>

        <Link href="/ecosystem" className="nav-ghost-btn">
          ← Back to ecosystem
        </Link>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="profile-muted" style={{ marginBottom: 10 }}>
          Coming soon
        </div>
        <div style={{ fontSize: 13, color: "rgba(148,163,184,0.9)" }}>
          Example sections:
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            <li>Experience</li>
            <li>Education</li>
            <li>Skills</li>
            <li>Publications</li>
            <li>Links</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

(EcosystemCvPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
