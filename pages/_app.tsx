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

  // ✅ wraps the WHOLE layout (AppLayout + left/middle/right + mobile drawers)
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

  if (checkingAuth) {
    return (
      <div className="page">
        <div className="bg-layer" />
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#e5e7eb",
            fontSize: 16,
          }}
        >
          Checking access…
        </div>
      </div>
    );
  }

  if (!allowed && !isPublicRoute) return null;
  if (isPublicRoute) return <Component {...pageProps} />;

  const lp = Component.layoutProps ?? {};

  // ✅ Build the WHOLE layout first
  const layout = (
    <AppLayout
      variant={lp.variant ?? "three"}
      left={lp.left}
      right={lp.right}
      showNavbar={lp.showNavbar ?? true}
      mobileMode={lp.mobileMode ?? "middle-only"}
      mobileMain={lp.mobileMain}
      wrapMiddle={lp.wrapMiddle ?? true}
    >
      <Component {...pageProps} />
    </AppLayout>
  );

  // ✅ Now wrap the WHOLE layout (so right column + drawers are inside the provider)
  return lp.wrap ? <>{lp.wrap(layout)}</> : layout;
}
