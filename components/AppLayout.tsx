// components/AppLayout.tsx
import { ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
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
   * On mobile:
   * - "middle-only" => AppLayout collapses to 1 column (default)
   * - "keep-columns" => keeps desktop columns (rare)
   */
  mobileMode?: "middle-only" | "keep-columns";

  /**
   * Optional: For pages that render their own "middle + right" split INSIDE children
   * (like Jobs), provide what should be shown on mobile instead of children.
   *
   * Example for Jobs: mobileMain = <JobsMiddle />
   */
  mobileMain?: ReactNode;

  /**
   * If true, AppLayout will wrap content in <section className="layout-main" />.
   * Default: true.
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
  mobileMain,
  wrapMiddle = true,
}: AppLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  // ✅ mobile left drawer (ONLY used in mobile middle-only mode)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth <= 900);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Close drawer when switching out of mobile or out of middle-only mode
  useEffect(() => {
    if (!isMobile || mobileMode !== "middle-only") setMobileLeftOpen(false);
  }, [isMobile, mobileMode]);

  // ESC to close (mobile drawer only)
  useEffect(() => {
    if (!mobileLeftOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileLeftOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileLeftOpen]);

  const resolvedLeft = useMemo(() => {
    if (left === undefined) return <LeftSidebar />;
    return left;
  }, [left]);

  const resolvedRight = useMemo(() => {
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
  // Default <LeftSidebar /> already draws its own right border.
  // Inject a divider only if the page provides a CUSTOM left sidebar.
  const useLeftInjectedDivider = showLeft && left !== undefined;

  // Right divider is safe to inject
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
    // ✅ Mobile collapsed to 1 column
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    const cols: string[] = [];

    if (showLeft) {
      cols.push("280px");
      if (useLeftInjectedDivider) cols.push("1px");
    }

    cols.push("minmax(0, 1fr)");

    if (showRight) {
      if (useRightInjectedDivider) cols.push("1px");
      cols.push("280px");
    }

    return cols.join(" ");
  })();

  // ✅ Mobile left drawer only makes sense if left exists in desktop world
  const canOpenMobileLeftDrawer =
    hideSidebarsOnMobile &&
    variant !== "two-right" &&
    variant !== "center" &&
    resolvedLeft !== null;

  // ✅ What to render in the main (middle) column
  // If a page provides mobileMain, use it on mobile (middle-only mode).
  const mainContent =
    hideSidebarsOnMobile && mobileMain !== undefined ? mobileMain : children;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        {showNavbar && <Navbar />}

        {/* ✅ MOBILE: mid-left arrow tab + drawer */}
        {canOpenMobileLeftDrawer && (
          <>
            <button
              type="button"
              aria-label={mobileLeftOpen ? "Close sidebar" : "Open sidebar"}
              onClick={() => setMobileLeftOpen((v) => !v)}
              style={{
                position: "fixed",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 60,
                width: 44,
                height: 84,
                border: "1px solid rgba(148,163,184,0.35)",
                borderLeft: "none",
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                background: "rgba(2,6,23,0.72)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  color: "rgba(226,232,240,0.95)",
                  transform: mobileLeftOpen ? "rotate(180deg)" : "none",
                  transition: "transform 160ms ease",
                  userSelect: "none",
                }}
              >
                ❯
              </span>
            </button>

            {mobileLeftOpen && (
              <div
                aria-hidden="true"
                onClick={() => setMobileLeftOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 55,
                  background: "rgba(0,0,0,0.45)",
                }}
              />
            )}

            <aside
              aria-label="Sidebar drawer"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                zIndex: 56,
                transform: mobileLeftOpen ? "translateX(0)" : "translateX(-105%)",
                transition: "transform 200ms ease",
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderRight: "1px solid rgba(148,163,184,0.35)",
                overflowY: "auto",
              }}
            >
              {resolvedLeft}
            </aside>
          </>
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
            <section className="layout-main">{mainContent}</section>
          ) : (
            <>{mainContent}</>
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
