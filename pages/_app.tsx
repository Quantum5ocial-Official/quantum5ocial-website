// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import AppLayout from "../components/AppLayout";

// Routes that should be accessible without login.
const PUBLIC_ROUTES = ["/auth"];

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // If this is a public route, allow immediately
      if (PUBLIC_ROUTES.includes(router.pathname)) {
        setAllowed(true);
        setCheckingAuth(false);
        return;
      }

      // For all other routes, require Supabase user
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        setAllowed(false);
        setCheckingAuth(false);
        router.replace("/auth");
        return;
      }

      setAllowed(true);
      setCheckingAuth(false);
    };

    checkAuth();
  }, [router.pathname]);

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

  // If not allowed and redirect in progress, render nothing
  if (!allowed && router.pathname !== "/auth") {
    return null;
  }

  // Default global layout:
  // - variant is "three"
  // - left sidebar is default
  // - right is empty (page can override later)
  const defaultGetLayout = (page: React.ReactElement) => (
    <AppLayout variant="three">{page}</AppLayout>
  );

  const getLayout = Component.getLayout ?? defaultGetLayout;

  // IMPORTANT:
  // For /auth, you probably want no layout at all (clean screen).
  if (router.pathname === "/auth") {
    return <Component {...pageProps} />;
  }

  return getLayout(<Component {...pageProps} />);
}
