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

  // ✅ Use real divider columns in "three" layout
  const hasLeftDivider = !hideSidebarsOnMobile && variant === "three" && showLeft;
  const hasRightDivider = !hideSidebarsOnMobile && variant === "three" && showRight;

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    if (variant === "three") {
      // LEFT | divider | MIDDLE | divider | RIGHT
      // (if left/right are missing we collapse accordingly)
      if (hasLeftDivider && hasRightDivider) return "280px 1px minmax(0, 1fr) 1px 280px";
      if (hasLeftDivider && !hasRightDivider) return "280px 1px minmax(0, 1fr)";
      if (!hasLeftDivider && hasRightDivider) return "minmax(0, 1fr) 1px 280px";
      return "minmax(0, 1fr)";
    }

    if (variant === "two-left") return "280px minmax(0, 1fr)";
    if (variant === "two-right") return "minmax(0, 1fr) 280px";
    return "minmax(0, 1fr)";
  })();

  // When using divider columns, we must not use grid gap
  const useDividerCols = hasLeftDivider || hasRightDivider;
  const gridGap = useDividerCols ? 0 : 24;

  const dividerStyle = {
    background: "rgba(148,163,184,0.35)",
    width: 1,
  } as const;

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
            gap: gridGap,
            // stretch so divider columns run full height
            alignItems: useDividerCols ? "stretch" : "start",
          }}
        >
          {/* LEFT */}
          {showLeft && <>{resolvedLeft}</>}

          {/* ✅ LEFT DIVIDER */}
          {hasLeftDivider && <div aria-hidden style={dividerStyle} />}

          {/* MIDDLE */}
          {wrapMiddle ? (
            <section
              className="layout-main"
              style={
                useDividerCols
                  ? {
                      paddingLeft: hasLeftDivider ? 24 : undefined,
                      paddingRight: hasRightDivider ? 24 : undefined,
                    }
                  : undefined
              }
            >
              {children}
            </section>
          ) : (
            <div
              style={
                useDividerCols
                  ? {
                      paddingLeft: hasLeftDivider ? 24 : undefined,
                      paddingRight: hasRightDivider ? 24 : undefined,
                    }
                  : undefined
              }
            >
              {children}
            </div>
          )}

          {/* ✅ RIGHT DIVIDER */}
          {hasRightDivider && <div aria-hidden style={dividerStyle} />}

          {/* RIGHT */}
          {showRight && (
            <aside
              className="layout-right sticky-col"
              style={{
                display: "flex",
                flexDirection: "column",
                ...(useDividerCols ? { paddingLeft: 24 } : null),
              }}
            >
              {resolvedRight}
            </aside>
          )}
        </main>
      </div>
    </>
  );
}
