// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// Routes that should be accessible without login.
const PUBLIC_ROUTES = ["/", "/auth"];

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      // Public pages: no auth check needed
      if (PUBLIC_ROUTES.includes(router.pathname)) {
        if (!cancelled) {
          setAllowed(true);
          setCheckingAuth(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          console.error("supabase.auth.getUser error:", error);
          if (!cancelled) {
            setAllowed(false);
            setCheckingAuth(false);
          }
          router.replace("/auth");
          return;
        }

        const user = data.user;

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
      } catch (err) {
        console.error("Auth check failed:", err);
        if (!cancelled) {
          setAllowed(false);
          setCheckingAuth(false);
        }
        router.replace("/auth");
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router.pathname]);

  // While checking auth, show a simple loading state
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

  // If route is protected and user not allowed, render nothing
  if (!allowed && !PUBLIC_ROUTES.includes(router.pathname)) {
    return null;
  }

  // Normal render (public routes or authenticated protected routes)
  return (
    <>
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
