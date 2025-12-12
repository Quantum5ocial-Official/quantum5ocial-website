// components/AppLayout.tsx
import { ReactNode, useEffect, useState } from "react";
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
};

export default function AppLayout({
  children,
  left,
  right,
  variant = "three",
  showNavbar = true,
  mobileMode = "middle-only",
}: AppLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth <= 900);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const resolvedLeft =
    left === undefined ? <LeftSidebar /> : left; // undefined => default
  const resolvedRight =
    right === undefined ? <div /> : right; // undefined => keep column but empty

  // If we're on mobile and the current mode is "middle-only", show only center content
  const hideSidebarsOnMobile = isMobile && mobileMode === "middle-only";

  // Decide what to render based on variant
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

  // Grid template (no CSS required)
  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "1fr";

    if (variant === "three") return "280px minmax(0, 1fr) 340px";
    if (variant === "two-left") return "280px minmax(0, 1fr)";
    if (variant === "two-right") return "minmax(0, 1fr) 340px";
    return "minmax(0, 1fr)"; // center
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
          <section className="layout-main">{children}</section>

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
