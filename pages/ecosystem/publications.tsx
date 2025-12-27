// pages/ecosystem/publications.tsx
import Link from "next/link";

export default function EcosystemPublicationsPage() {
  return (
    <section className="section">
      <div className="section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="section-title">My publications</div>
          <div className="section-sub">
            Placeholder page. Next: add publication list, links, and import (DOI / arXiv).
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
            <li>Featured publications</li>
            <li>Preprints</li>
            <li>Patents</li>
            <li>Talks / posters</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

(EcosystemPublicationsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
