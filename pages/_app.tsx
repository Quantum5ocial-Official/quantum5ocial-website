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

  // wraps the CONTENT REGION (middle + right + mobile drawers), not the whole app shell
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

  // public pages: no layout
  if (isPublicRoute) return <Component {...pageProps} />;

  // while checking: render nothing heavy (prevents odd remount loops)
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

  if (!allowed) return null;

  const lp = Component.layoutProps ?? {};

  // ✅ DO NOT wrap <Component/> here anymore.
  // Wrapping here can cause provider separation + flicker.
  const page = <Component {...pageProps} />;

  return (
    <AppLayout
      variant={lp.variant ?? "three"}
      left={lp.left}
      right={lp.right}
      showNavbar={lp.showNavbar ?? true}
      mobileMode={lp.mobileMode ?? "middle-only"}
      mobileMain={lp.mobileMain}
      wrapMiddle={lp.wrapMiddle ?? true}
      // ✅ THIS is the key: AppLayout wraps middle+right+mobile drawers consistently
      contentWrap={lp.wrap}
    >
      {page}
    </AppLayout>
  );
}
