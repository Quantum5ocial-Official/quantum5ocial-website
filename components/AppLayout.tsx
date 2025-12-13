// components/AppLayout.tsx
import { ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import LeftSidebar from "./LeftSidebar";

const Navbar = dynamic(() => import("./NavbarIcons"), { ssr: false });

type LayoutVariant = "three" | "two-left" | "two-right" | "center";

type AppLayoutProps = {
  children: ReactNode;

  /**
   * left:
   * - undefined => default left sidebar (<LeftSidebar />)
   * - null      => no left sidebar
   * - ReactNode => custom left sidebar
   */
  left?: ReactNode | null;

  /**
   * right:
   * - undefined => empty right column (keeps 3-col symmetry)
   * - null      => no right column at all (use variant "two-left" / "center")
   * - ReactNode => custom right sidebar
   */
  right?: ReactNode | null;

  variant?: LayoutVariant;

  /** show navbar globally (usually true) */
  showNavbar?: boolean;

  /**
   * For now, on mobile we show only the middle content (no left/right).
   * Later we’ll implement drawers.
   */
  mobileMode?: "middle-only" | "keep-columns";

  /**
   * If true, AppLayout will wrap children in <section className="layout-main" />.
   * Set to false for pages that already include their own layout wrappers.
   * Default: true (recommended style: pages return middle content only).
   */
  wrapMiddle?: boolean;
};

export default function AppLayout({
  children,
  left,
  right,
  variant = "three",
  showNavbar = true,
  mobileMode = "middle-only",
  wrapMiddle = true,
}: AppLayoutProps) {
  const router = useRouter();

  const [isMobile, setIsMobile] = useState(false);

  // ✅ NEW: global mobile left drawer state
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth <= 900);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const resolvedLeft = useMemo(() => {
    // undefined => default
    if (left === undefined) return <LeftSidebar />;
    return left;
  }, [left]);

  const resolvedRight = useMemo(() => {
    // undefined => keep column but empty (symmetry)
    if (right === undefined) return <div />;
    return right;
  }, [right]);

  const hideSidebarsOnMobile = isMobile && mobileMode === "middle-only";

  const showLeft =
    !hideSidebarsOnMobile &&
    variant !== "two-right" &&
    variant !== "center" &&
    resolvedLeft !== null;

  const showRight =
    !hideSidebarsOnMobile &&
    variant !== "two-left" &&
    variant !== "center" &&
    resolvedRight !== null;

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    if (variant === "three") return "280px minmax(0, 1fr) 280px";
    if (variant === "two-left") return "280px minmax(0, 1fr)";
    if (variant === "two-right") return "minmax(0, 1fr) 280px";
    return "minmax(0, 1fr)";
  })();

  // ✅ NEW: only show drawer button on mobile middle-only when left exists
  const showMobileLeftDrawer =
    hideSidebarsOnMobile &&
    resolvedLeft !== null &&
    variant !== "two-right" &&
    variant !== "center";

  // ✅ NEW: close drawer on navigation
  useEffect(() => {
    const handleRoute = () => setLeftDrawerOpen(false);
    router.events.on("routeChangeStart", handleRoute);
    return () => router.events.off("routeChangeStart", handleRoute);
  }, [router.events]);

  // ✅ NEW: ESC closes drawer
  useEffect(() => {
    if (!leftDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeftDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [leftDrawerOpen]);

  // ✅ NEW: lock body scroll while drawer is open
  useEffect(() => {
    if (!leftDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [leftDrawerOpen]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        {showNavbar && <Navbar />}

        {/* ✅ NEW: Global mobile left drawer button */}
        {showMobileLeftDrawer && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setLeftDrawerOpen(true)}
            style={{
              position: "fixed",
              left: 14,
              top: 14,
              zIndex: 60,
              width: 42,
              height: 42,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.85)",
              color: "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            ☰
          </button>
        )}

        {/* ✅ NEW: Global mobile left drawer */}
        {showMobileLeftDrawer && leftDrawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 70,
              display: "flex",
            }}
          >
            {/* overlay */}
            <div
              onClick={() => setLeftDrawerOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,6,23,0.55)",
              }}
            />

            {/* panel */}
            <aside
              style={{
                position: "relative",
                width: 320,
                maxWidth: "86vw",
                height: "100%",
                padding: 14,
                background: "rgba(2,6,23,0.92)",
                borderRight: "1px solid rgba(148,163,184,0.22)",
                boxShadow: "20px 0 60px rgba(0,0,0,0.45)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
            >
              {/* close row */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setLeftDrawerOpen(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.25)",
                    background: "rgba(15,23,42,0.7)",
                    color: "#e5e7eb",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* actual sidebar */}
              <div style={{ height: "calc(100% - 46px)", overflowY: "auto" }}>
                {resolvedLeft}
              </div>
            </aside>
          </div>
        )}

        <main
          className="layout-3col"
          style={{
            display: "grid",
            gridTemplateColumns,
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* LEFT */}
          {showLeft && <>{resolvedLeft}</>}

          {/* MIDDLE */}
          {wrapMiddle ? (
            <section className="layout-main">{children}</section>
          ) : (
            <>{children}</>
          )}

          {/* RIGHT */}
          {showRight && (
            <aside
              className="layout-right sticky-col"
              style={{ display: "flex", flexDirection: "column" }}
            >
              {resolvedRight}
            </aside>
          )}
        </main>
      </div>
    </>
  );
}
