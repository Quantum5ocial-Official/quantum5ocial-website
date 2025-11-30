// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Footer from "../components/Footer";

// Routes that should be accessible without login.
const PUBLIC_ROUTES = ["/auth"];

export default function MyApp({ Component, pageProps }: AppProps) {
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

  // If not allowed and redirect in progress, render nothing
  if (!allowed && router.pathname !== "/auth") {
    return null;
  }

  // Normal render if allowed or on /auth
  return (
    <>
      <Component {...pageProps} />
    </>
  );
}
