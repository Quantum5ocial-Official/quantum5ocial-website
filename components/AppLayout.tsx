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

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    if (variant === "three") return "280px minmax(0, 1fr) 280px";
    if (variant === "two-left") return "280px minmax(0, 1fr)";
    if (variant === "two-right") return "minmax(0, 1fr) 340px";
    return "minmax(0, 1fr)";
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
