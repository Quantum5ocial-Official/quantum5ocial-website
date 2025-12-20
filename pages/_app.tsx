// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

export type LayoutProps = {
  variant?: "three" | "two-left" | "two-right" | "center";
  left?: React.ReactNode | null;
  right?: React.ReactNode | null;
  showNavbar?: boolean;
  mobileMode?: "middle-only" | "keep-columns";

  mobileMain?: React.ReactNode;
  wrapMiddle?: boolean;

  // wraps ONLY page content (and now also mobileMain), NOT the whole AppLayout
  wrap?: (children: React.ReactNode) => React.ReactNode;
};

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  layoutProps?: LayoutProps;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const isPublicRoute =
    router.pathname === "/auth" || router.pathname.startsWith("/auth/");

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      if (isPublicRoute) {
        if (!cancelled) {
          setAllowed(true);
          setCheckingAuth(false);
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        if (!cancelled) {
          setAllowed(false);
          setCheckingAuth(false);
        }
        router.replace("/auth");
        return;
      }

      if (!cancelled) {
        setAllowed(true);
        setCheckingAuth(false);
      }
    };

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [isPublicRoute, router.pathname]);

  // ✅ Public routes: no AppLayout (as before)
  if (isPublicRoute) return <Component {...pageProps} />;

  // ✅ If not allowed and not public, keep behavior (as before)
  if (!allowed && !checkingAuth) return null;

  const lp = Component.layoutProps ?? {};

  // ✅ Wrap ONLY the page content so AppLayout (and sidebars) never remount
  const pageInner = <Component {...pageProps} />;
  const page = lp.wrap ? lp.wrap(pageInner) : pageInner;

  // ✅ IMPORTANT: wrap mobileMain too (so JobsMiddle gets JobsProvider)
  const mobileMain = lp.mobileMain
    ? lp.wrap
      ? lp.wrap(lp.mobileMain)
      : lp.mobileMain
    : undefined;

  // ✅ NEW: show loading screen INSIDE the layout middle area
  const middleWhenLoading = (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#e5e7eb",
        fontSize: 16,
      }}
    >
      Checking access…
    </div>
  );

  return (
    <AppLayout
      variant={lp.variant ?? "three"}
      left={lp.left}
      right={lp.right}
      showNavbar={lp.showNavbar ?? true}
      mobileMode={lp.mobileMode ?? "middle-only"}
      mobileMain={mobileMain}
      wrapMiddle={lp.wrapMiddle ?? true}
    >
      {checkingAuth ? middleWhenLoading : page}
    </AppLayout>
  );
}
