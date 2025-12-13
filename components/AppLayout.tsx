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

  // ✅ MOBILE: left drawer state (does not affect desktop)
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

  // ✅ IMPORTANT:
  // Your default <LeftSidebar /> already has a right border/line.
  // So we only inject a left divider if the page provides a CUSTOM left sidebar.
  const useLeftInjectedDivider = showLeft && left !== undefined;

  // Right divider is safe to inject (your right column does not draw its own divider).
  const useRightInjectedDivider = showRight;

  const Divider = () => (
    <div
      aria-hidden="true"
      style={{
        width: 1,
        background: "rgba(148,163,184,0.35)",
        alignSelf: "stretch",
      }}
    />
  );

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    const cols: string[] = [];

    // LEFT
    if (showLeft) {
      cols.push("280px");
      if (useLeftInjectedDivider) cols.push("1px");
    }

    // MIDDLE (always)
    cols.push("minmax(0, 1fr)");

    // RIGHT
    if (showRight) {
      if (useRightInjectedDivider) cols.push("1px");
      cols.push("280px");
    }

    return cols.join(" ");
  })();

  // ✅ MOBILE drawer is available when we're hiding sidebars (middle-only),
  // and a left sidebar exists for this variant.
  const showMobileLeftDrawer =
    hideSidebarsOnMobile &&
    resolvedLeft !== null &&
    variant !== "two-right" &&
    variant !== "center";

  // close drawer on navigation
  useEffect(() => {
    const close = () => setLeftDrawerOpen(false);
    router.events.on("routeChangeStart", close);
    return () => router.events.off("routeChangeStart", close);
  }, [router.events]);

  // ESC closes drawer
  useEffect(() => {
    if (!leftDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLeftDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [leftDrawerOpen]);

  // lock scroll while drawer open
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

        {/* ✅ MOBILE ONLY: left drawer button (no desktop impact) */}
        {showMobileLeftDrawer && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setLeftDrawerOpen(true)}
            style={{
              position: "fixed",
              left: 12,
              top: 12,
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

        {/* ✅ MOBILE ONLY: left drawer panel (no desktop impact) */}
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 10,
                }}
              >
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
          {showLeft && (
            <>
              {resolvedLeft}
              {useLeftInjectedDivider && <Divider />}
            </>
          )}

          {/* MIDDLE */}
          {wrapMiddle ? (
            <section className="layout-main">{children}</section>
          ) : (
            <>{children}</>
          )}

          {/* RIGHT */}
          {showRight && (
            <>
              {useRightInjectedDivider && <Divider />}
              <aside
                className="layout-right sticky-col"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {resolvedRight}
              </aside>
            </>
          )}
        </main>
      </div>
    </>
  );
}
