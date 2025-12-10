// lib/useEntanglements.ts
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabaseClient";

export type ConnectionStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "declined";

export type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: "pending" | "accepted" | "declined";
};

type UseEntanglementsOptions = {
  user: any; // you can swap to a proper Supabase user type later if you like
  /**
   * Path to redirect back to after auth.
   * We’ll build /auth?redirect=... from this.
   */
  redirectPath?: string;
};

export function useEntanglements({
  user,
  redirectPath = "/community",
}: UseEntanglementsOptions) {
  const router = useRouter();

  const [connectionsByOtherId, setConnectionsByOtherId] = useState<
    Record<string, ConnectionRow>
  >({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);

  // ---- Helpers ----
  const getConnectionStatus = useCallback(
    (otherUserId: string): ConnectionStatus => {
      if (!user) return "none";
      const row = connectionsByOtherId[otherUserId];
      if (!row) return "none";

      if (row.status === "accepted") return "accepted";
      if (row.status === "declined") return "declined";

      if (row.status === "pending") {
        if (row.user_id === user.id) return "pending_outgoing";
        if (row.target_user_id === user.id) return "pending_incoming";
      }

      return "none";
    },
    [user, connectionsByOtherId]
  );

  const isEntangleLoading = useCallback(
    (otherUserId: string) => loadingIds.includes(otherUserId),
    [loadingIds]
  );

  // ---- Load all connections for the current user ----
  useEffect(() => {
    const loadConnections = async () => {
      if (!user) {
        setConnectionsByOtherId({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (error) {
          console.error("Error loading entanglement connections", error);
          setConnectionsByOtherId({});
          return;
        }

        const rows = (data || []) as ConnectionRow[];
        const map: Record<string, ConnectionRow> = {};

        rows.forEach((c) => {
          const otherId = c.user_id === user.id ? c.target_user_id : c.user_id;
          map[otherId] = c;
        });

        setConnectionsByOtherId(map);
      } catch (e) {
        console.error("Unexpected error loading entanglement connections", e);
        setConnectionsByOtherId({});
      }
    };

    loadConnections();
  }, [user]);

  // ---- Internal helper: auth redirect ----
  const redirectToAuth = useCallback(() => {
    router.push(
      `/auth?redirect=${encodeURIComponent(
        redirectPath || router.asPath || "/community"
      )}`
    );
  }, [router, redirectPath]);

  // ---- Public handlers: entangle & decline ----
  const handleEntangle = useCallback(
    async (targetUserId: string) => {
      if (!user) {
        redirectToAuth();
        return;
      }

      if (targetUserId === user.id) return; // no self-entanglement

      const currentRow = connectionsByOtherId[targetUserId];
      const currentStatus = getConnectionStatus(targetUserId);

      if (currentStatus === "accepted" || currentStatus === "pending_outgoing") {
        return;
      }

      setLoadingIds((prev) => [...prev, targetUserId]);

      try {
        // Case 1: there's a pending request *to you* → accept it
        if (currentStatus === "pending_incoming" && currentRow) {
          const { error } = await supabase
            .from("connections")
            .update({ status: "accepted" })
            .eq("id", currentRow.id);

          if (error) {
            console.error("Error accepting entanglement", error);
          } else {
            setConnectionsByOtherId((prev) => ({
              ...prev,
              [targetUserId]: { ...currentRow, status: "accepted" },
            }));
          }
          return;
        }

        // Case 2: no connection yet → send request (pending_outgoing)
        if (currentStatus === "none" || currentStatus === "declined") {
          const { data, error } = await supabase
            .from("connections")
            .insert({
              user_id: user.id,
              target_user_id: targetUserId,
              status: "pending",
            })
            .select("id, user_id, target_user_id, status")
            .maybeSingle();

          if (error) {
            console.error("Error creating entanglement request", error);
          } else if (data) {
            const newRow = data as ConnectionRow;
            setConnectionsByOtherId((prev) => ({
              ...prev,
              [targetUserId]: newRow,
            }));
          }
        }
      } catch (e) {
        console.error("Unexpected error creating/accepting entanglement", e);
      } finally {
        setLoadingIds((prev) => prev.filter((id) => id !== targetUserId));
      }
    },
    [user, redirectToAuth, connectionsByOtherId, getConnectionStatus]
  );

  const handleDeclineEntangle = useCallback(
    async (targetUserId: string) => {
      if (!user) {
        redirectToAuth();
        return;
      }

      const currentRow = connectionsByOtherId[targetUserId];
      const currentStatus = getConnectionStatus(targetUserId);

      if (!currentRow || currentStatus !== "pending_incoming") {
        return;
      }

      setLoadingIds((prev) => [...prev, targetUserId]);

      try {
        const { error } = await supabase
          .from("connections")
          .update({ status: "declined" })
          .eq("id", currentRow.id);

        if (error) {
          console.error(
            "Error declining entanglement, falling back to delete",
            error
          );

          const { error: deleteError } = await supabase
            .from("connections")
            .delete()
            .eq("id", currentRow.id);

          if (deleteError) {
            console.error("Error deleting entanglement on decline", deleteError);
          }
        }

        setConnectionsByOtherId((prev) => {
          const copy = { ...prev };
          delete copy[targetUserId];
          return copy;
        });
      } catch (e) {
        console.error("Unexpected error declining entanglement", e);
      } finally {
        setLoadingIds((prev) => prev.filter((id) => id !== targetUserId));
      }
    },
    [user, redirectToAuth, connectionsByOtherId, getConnectionStatus]
  );

  return {
    connectionsByOtherId,
    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,
  };
}
