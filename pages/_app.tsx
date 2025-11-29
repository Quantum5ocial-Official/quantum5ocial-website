// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Routes that do NOT require login
const PUBLIC_ROUTES = ["/auth"];

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    const checkAuth = async () => {
      try {
        // 1) Public routes → always allowed
        if (PUBLIC_ROUTES.includes(router.pathname)) {
          if (!cancelled) {
            setAllowed(true);
            setCheckingAuth(false);
          }
          return;
        }

        // 2) For all other routes, ask Supabase
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("Supabase getUser error:", error);
        }

        const user = data?.user;

        if (!user) {
          // Not logged in: send to /auth
          if (!cancelled) {
            setAllowed(false);
            setCheckingAuth(false);
          }

          if (router.pathname !== "/auth") {
            router.replace("/auth");
          }

          return;
        }

        // Logged in → allow
        if (!cancelled) {
          setAllowed(true);
          setCheckingAuth(false);
        }
      } catch (e) {
        console.error("checkAuth crashed:", e);
        // Fail-open so you never get stuck on the loader
        if (!cancelled) {
          setAllowed(true);
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.pathname]);

  // While checking, show loader
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

  // If not allowed *and* not on a public route, render nothing while redirecting
  if (!allowed && !PUBLIC_ROUTES.includes(router.pathname)) {
    return null;
  }

  // Normal render
  return <Component {...pageProps} />;
}
