import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

export default function Home() {
  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* HERO */}
        <section className="hero" id="about">
          <div>
            <div className="eyebrow">Quantum ecosystem hub</div>
            <h1 className="hero-title">
              Discover <span className="hero-highlight">jobs &amp; tools</span> shaping
              the future of quantum technology.
            </h1>
            <p className="hero-sub">
              Quantum5ocial connects students, researchers, and companies with curated
              opportunities and products across the global quantum ecosystem.
            </p>

            <div className="hero-tags">
              <span className="tag-chip">PhD, postdoc, and industry roles</span>
              <span className="tag-chip">Startups, vendors, and labs</span>
              <span className="tag-chip">Hardware · Software · Services</span>
            </div>

            <p className="hero-note">
              Start with marketplace features now – and evolve into a full social
              platform as the community grows.
            </p>
          </div>

          <aside>
            <div className="hero-tiles">
              {/* Jobs tile */}
              <a href="#jobs" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Explore</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Jobs Universe</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    Browse internships, MSc/PhD positions, postdocs, and industry roles
                    from labs and companies worldwide.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">MSc / PhD</span>
                    <span className="tile-pill">Postdoc</span>
                    <span className="tile-pill">Industry</span>
                  </div>
                  <div className="tile-cta">
                    Browse jobs <span>›</span>
                  </div>
                </div>
              </a>

              {/* Products tile */}
              <a href="#products" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Discover</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Products Lab</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    Discover quantum hardware, control electronics, software tools, and
                    services from specialized vendors.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Hardware</span>
                    <span className="tile-pill">Control &amp; readout</span>
                    <span className="tile-pill">Software &amp; services</span>
                  </div>
                  <div className="tile-cta">
                    Browse products <span>›</span>
                  </div>
                </div>
              </a>
            </div>
          </aside>
        </section>

        {/* FEATURED JOBS */}
        <section className="section" id="jobs">
          <div className="section-header">
            <div>
              <div className="section-title">Featured quantum roles</div>
              <div className="section-sub">
                A preview of the opportunities the community will share.
              </div>
            </div>
            <a href="/jobs" className="section-link">
              View all jobs →
            </a>
          </div>

          <div className="card-row">
            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">PhD in superconducting qubits</div>
                  <div className="card-pill">Academic</div>
                </div>
                <div className="card-meta">Quantum Lab · Zurich · On-site</div>
                <div className="card-tags">
                  <span className="card-tag">Superconducting</span>
                  <span className="card-tag">cQED</span>
                  <span className="card-tag">Low temperature</span>
                </div>
                <div className="card-footer-text">Application deadline: TBA</div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">Quantum software engineer</div>
                  <div className="card-pill">Industry</div>
                </div>
                <div className="card-meta">Quantum Startup · Remote-friendly</div>
                <div className="card-tags">
                  <span className="card-tag">Quantum SDK</span>
                  <span className="card-tag">Python</span>
                  <span className="card-tag">Algorithms</span>
                </div>
                <div className="card-footer-text">
                  Hiring soon via Quantum5ocial.
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">Cryogenic RF engineer</div>
                  <div className="card-pill">Industry</div>
                </div>
                <div className="card-meta">Hardware Company · Hybrid</div>
                <div className="card-tags">
                  <span className="card-tag">Cryo</span>
                  <span className="card-tag">RF</span>
                  <span className="card-tag">Control electronics</span>
                </div>
                <div className="card-footer-text">
                  Join to see full job details soon.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="section" id="products">
          <div className="section-header">
            <div>
              <div className="section-title">
                Highlighted quantum tools &amp; products
              </div>
              <div className="section-sub">
                Vendors and startups showcasing their hero products.
              </div>
            </div>
            <a href="/" className="section-link">
              Browse all products →
            </a>
          </div>

          <div className="card-row">
            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">High-impedance resonator chip</div>
                  <div className="card-pill">Hardware</div>
                </div>
                <div className="card-meta">Vendor: Quantum Devices Inc.</div>
                <div className="card-tags">
                  <span className="card-tag">Superconducting</span>
                  <span className="card-tag">cQED</span>
                  <span className="card-tag">Foundry-ready</span>
                </div>
                <div className="card-footer-text">
                  Datasheet &amp; quotes coming to the platform.
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">Cryogenic control stack</div>
                  <div className="card-pill">Electronics</div>
                </div>
                <div className="card-meta">Vendor: Quantum Control Co.</div>
                <div className="card-tags">
                  <span className="card-tag">DAC/ADC</span>
                  <span className="card-tag">Scalable</span>
                  <span className="card-tag">Integration</span>
                </div>
                <div className="card-footer-text">
                  Discover compatible stacks for your platform.
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-inner">
                <div className="card-top-row">
                  <div className="card-title">Cloud simulation platform</div>
                  <div className="card-pill">Software</div>
                </div>
                <div className="card-meta">Vendor: Quantum Sim Labs</div>
                <div className="card-tags">
                  <span className="card-tag">Simulation</span>
                  <span className="card-tag">API</span>
                  <span className="card-tag">Education</span>
                </div>
                <div className="card-footer-text">
                  Linking users directly to quantum software providers.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GAMIFICATION */}
        <section className="section">
          <div className="gamify-strip">
            <div>
              <div className="gamify-title">
                Earn Quantum Points (QP) &amp; unlock quantum-themed badges
              </div>
              <p className="gamify-text">
                Quantum5ocial stays professional but adds a light gamified layer –
                rewarding meaningful activity like completing your profile, posting
                jobs/products, and exploring the ecosystem.
              </p>
              <ul className="gamify-list">
                <li>Complete your profile → gain QP and visibility</li>
                <li>Post roles or products → earn vendor &amp; mentor badges</li>
                <li>
                  Explore and engage → unlock levels like Superposition, Entangled,
                  Resonant
                </li>
              </ul>
            </div>
            <div className="gamify-badges">
              <div className="badge-pill">
                <span className="badge-dot" /> Superposition · New member
              </div>
              <div className="badge-pill">
                <span className="badge-dot" /> Entangled · Connected with labs
              </div>
              <div className="badge-pill">
                <span className="badge-dot" /> Quantum Vendor · Active startup
              </div>
              <div className="badge-pill">
                <span className="badge-dot" /> Resonant · Highly active profile
              </div>
            </div>
          </div>
        </section>

        {/* FOR WHOM */}
        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                Built for the entire quantum community
              </div>
              <div className="section-sub">Different paths, one shared platform.</div>
            </div>
          </div>

          <div className="who-grid">
            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">👨‍🎓</span>
                <span className="who-title">Students &amp; early-career</span>
              </div>
              <p className="who-text">
                Explore internships, MSc/PhD projects, and your first postdoc or industry
                role. Build your profile as you grow into the field.
              </p>
            </div>

            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">🧑‍🔬</span>
                <span className="who-title">Researchers &amp; labs</span>
              </div>
              <p className="who-text">
                Showcase your group, attract collaborators, and make it easier to find the
                right candidates for your quantum projects.
              </p>
            </div>

            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">🏢</span>
                <span className="who-title">Companies &amp; startups</span>
              </div>
              <p className="who-text">
                Post jobs, list your hero products, and reach a focused audience that
                already cares about quantum technologies.
              </p>
            </div>
          </div>
        </section>

        {/* LOGIN PLACEHOLDER */}
        <section id="login" className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Login &amp; sign up (live)</div>
              <div className="section-sub">
                Use the Login / Sign up button in the top-right corner to access your
                dashboard and start posting jobs and products.
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
          <a href="mailto:info@quantum5ocial.com">Contact</a>
        </footer>
      </div>
    </>
  );
}
