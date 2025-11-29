// lib/useSupabaseUser.ts
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

type UseSupabaseUserResult = {
  user: User | null;
  loading: boolean;
};

export function useSupabaseUser(): UseSupabaseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadInitialUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.warn("getUser error in useSupabaseUser:", error);
        }
        if (!cancelled) {
          setUser(data?.user ?? null);
          setLoading(false);
        }
      } catch (e) {
        console.error("useSupabaseUser loadInitialUser crashed:", e);
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    loadInitialUser();

    // Subscribe to auth changes so Navbar etc stay up-to-date
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
