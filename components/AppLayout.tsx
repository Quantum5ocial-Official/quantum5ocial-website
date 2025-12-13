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
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        {showNavbar && <Navbar />}

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
