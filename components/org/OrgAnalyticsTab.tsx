import type React from "react";
import type { CSSProperties } from "react";

type Org = {
  id: string;
  name: string;
};

export default function OrgAnalyticsTab({ org }: { org: Org }) {
  const card: CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.72)",
    padding: 20,
    color: "rgba(226,232,240,0.95)",
  };

  const muted: CSSProperties = {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(148,163,184,0.9)",
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div className="card" style={card}>
        <div className="section-title">Analytics</div>
        <div className="section-sub">
          Private insights for organization owners.
        </div>

        <div style={muted}>
          Analytics are coming soon. This section will include:
          <ul style={{ marginTop: 8, paddingLeft: 18 }}>
            <li>Profile views</li>
            <li>Follower growth</li>
            <li>Job impressions & clicks</li>
            <li>Product views</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
