// lib/useSupabaseUser.ts
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load auth session + profile
  useEffect(() => {
    async function loadSession() {
      // 1. Get logged–in user
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user ?? null;

      setUser(authUser);

      // 2. If user exists → load profile row from DB
      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        setProfile(profileData || null);
      } else {
        setProfile(null);
      }

      setLoading(false);
    }

    loadSession();

    // 3. Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user ?? null;
        setUser(authUser);

        if (authUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();

          setProfile(profileData || null);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
