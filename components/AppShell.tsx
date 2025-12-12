// components/AppShell.tsx
import { ReactNode, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("../components/NavbarIcons"), { ssr: false });

type Props = {
  left: ReactNode;   // LeftSidebar
  right: ReactNode;  // Right column content
  children: ReactNode; // Middle/main column
};

export default function AppShell({ left, right, children }: Props) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const anyOpen = leftOpen || rightOpen;

  // Keep responsiveness consistent with your navbar breakpoint
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll when drawers open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [anyOpen]);

  // ESC closes drawers
  useEffect(() => {
    if (!anyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyOpen]);

  // If one opens, close the other (optional but usually nicer)
  useEffect(() => {
    if (leftOpen) setRightOpen(false);
  }, [leftOpen]);
  useEffect(() => {
    if (rightOpen) setLeftOpen(false);
  }, [rightOpen]);

  const closeAll = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  return (
    <>
      <Navbar />

      {/* Backdrop */}
      {isMobile && anyOpen && (
        <div className="q5-drawer-backdrop" onClick={closeAll} />
      )}

      {/* LEFT EDGE BUTTON (middle-left of screen) */}
      {isMobile && !leftOpen && !rightOpen && (
        <button
          type="button"
          className="q5-edge-btn q5-edge-btn-left"
          onClick={() => setLeftOpen(true)}
          aria-label="Open left drawer"
        >
          ‹
        </button>
      )}

      {/* RIGHT EDGE BUTTON (middle-right of screen) */}
      {isMobile && !leftOpen && !rightOpen && (
        <button
          type="button"
          className="q5-edge-btn q5-edge-btn-right"
          onClick={() => setRightOpen(true)}
          aria-label="Open right drawer"
        >
          ›
        </button>
      )}

      {/* LEFT DRAWER */}
      <aside
        className={`q5-drawer q5-drawer-left ${leftOpen ? "open" : ""}`}
        aria-hidden={!leftOpen}
      >
        <div className="q5-drawer-header">
          <div className="q5-drawer-title">Menu</div>
          <button
            type="button"
            className="q5-drawer-close"
            onClick={() => setLeftOpen(false)}
            aria-label="Close left drawer"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="q5-drawer-body">{left}</div>
      </aside>

      {/* RIGHT DRAWER */}
      <aside
        className={`q5-drawer q5-drawer-right ${rightOpen ? "open" : ""}`}
        aria-hidden={!rightOpen}
      >
        <div className="q5-drawer-header">
          <div className="q5-drawer-title">Shortcuts</div>
          <button
            type="button"
            className="q5-drawer-close"
            onClick={() => setRightOpen(false)}
            aria-label="Close right drawer"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="q5-drawer-body">{right}</div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="q5-mobile-main">{children}</main>
    </>
  );
}
