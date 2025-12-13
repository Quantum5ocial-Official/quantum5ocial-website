// components/AppLayout.tsx
import { ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import LeftSidebar from "./LeftSidebar";

const Navbar = dynamic(() => import("./NavbarIcons"), { ssr: false });

type LayoutVariant = "three" | "two-left" | "two-right" | "center";

type AppLayoutProps = {
  children: ReactNode;

  left?: ReactNode | null;
  right?: ReactNode | null;

  variant?: LayoutVariant;
  showNavbar?: boolean;
  mobileMode?: "middle-only" | "keep-columns";
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

  // ✅ Only ONE divider: between LEFT and MIDDLE (only in "three" layout)
  const hasLeftDivider = !hideSidebarsOnMobile && variant === "three" && showLeft;

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    if (variant === "three") {
      // LEFT | divider | MIDDLE | RIGHT   (NO divider between middle and right)
      if (hasLeftDivider && showRight) return "280px 1px minmax(0, 1fr) 280px";
      if (hasLeftDivider && !showRight) return "280px 1px minmax(0, 1fr)";
      // if left is hidden, fall back to normal 2-col right layout
      if (!showLeft && showRight) return "minmax(0, 1fr) 280px";
      return "minmax(0, 1fr)";
    }

    if (variant === "two-left") return "280px minmax(0, 1fr)";
    if (variant === "two-right") return "minmax(0, 1fr) 280px";
    return "minmax(0, 1fr)";
  })();

  const dividerStyle = {
    background: "rgba(148,163,184,0.35)",
    width: 1,
  } as const;

  // ✅ gap must be 0 so divider sits exactly between left and middle.
  // We recreate spacing with padding inside middle/right.
  const useDivider = hasLeftDivider;

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
            gap: useDivider ? 0 : 24,
            alignItems: useDivider ? "stretch" : "start",
          }}
        >
          {/* LEFT */}
          {showLeft && <>{resolvedLeft}</>}

          {/* ✅ ONLY DIVIDER (LEFT ↔ MIDDLE) */}
          {hasLeftDivider && <div aria-hidden style={dividerStyle} />}

          {/* MIDDLE */}
          {wrapMiddle ? (
            <section
              className="layout-main"
              style={
                useDivider
                  ? {
                      paddingLeft: hasLeftDivider ? 24 : undefined,
                      paddingRight: showRight ? 24 : undefined, // spacing before right column
                    }
                  : undefined
              }
            >
              {children}
            </section>
          ) : (
            <div
              style={
                useDivider
                  ? {
                      paddingLeft: hasLeftDivider ? 24 : undefined,
                      paddingRight: showRight ? 24 : undefined,
                    }
                  : undefined
              }
            >
              {children}
            </div>
          )}

          {/* RIGHT (no divider before it) */}
          {showRight && (
            <aside
              className="layout-right sticky-col"
              style={{
                display: "flex",
                flexDirection: "column",
                ...(useDivider ? { paddingLeft: 24 } : null), // spacing from middle
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
