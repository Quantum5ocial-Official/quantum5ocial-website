import "../styles/globals.css";
import type { AppProps } from "next/app";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user && router.pathname !== "/auth") {
        router.replace("/auth");
      }
    }

    checkUser();
  }, [router]);

  return <Component {...pageProps} />;
}

export default MyApp;
