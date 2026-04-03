// lib/entanglements.ts

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useSupabaseUser } from "./useSupabaseUser";
import posthog from "./posthogClient";

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
  created_at?: string;
};

export function useEntanglements() {
  const { user } = useSupabaseUser();

  const [connectionsByOtherId, setConnectionsByOtherId] = useState<
    Record<string, ConnectionRow>
  >({});
  const [entangleLoadingIds, setEntangleLoadingIds] = useState<string[]>([]);

  const getConnectionStatus = (otherUserId: string): ConnectionStatus => {
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
  };

  const isEntangleLoading = (otherUserId: string) =>
    entangleLoadingIds.includes(otherUserId);

  useEffect(() => {
    const loadConnections = async () => {
      if (!user) {
        setConnectionsByOtherId({});
        return;
      }

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      if (error) {
        console.error("Error loading connections", error);
        return;
      }

      const map: Record<string, ConnectionRow> = {};

      (data || []).forEach((row: any) => {
        const otherId =
          row.user_id === user.id ? row.target_user_id : row.user_id;
        map[otherId] = row;
      });

      setConnectionsByOtherId(map);
    };

    loadConnections();
  }, [user]);

  const handleEntangle = async (targetUserId: string) => {
    if (!user) return;

    const currentRow = connectionsByOtherId[targetUserId];
    const status = getConnectionStatus(targetUserId);

    if (targetUserId === user.id) return;

    setEntangleLoadingIds((prev) => [...prev, targetUserId]);

    try {
      if (status === "pending_incoming" && currentRow) {
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", currentRow.id);

        if (!error) {
          setConnectionsByOtherId((prev) => ({
            ...prev,
            [targetUserId]: { ...currentRow, status: "accepted" },
          }));

          posthog.capture("entanglement_accepted", {
            source_user_id: currentRow.user_id,
            target_user_id: currentRow.target_user_id,
            other_user_id: targetUserId,
            connection_id: currentRow.id,
          });
        }

        return;
      }

      if (status === "none" || status === "declined") {
        const { data, error } = await supabase
          .from("connections")
          .insert({
            user_id: user.id,
            target_user_id: targetUserId,
            status: "pending",
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          setConnectionsByOtherId((prev) => ({
            ...prev,
            [targetUserId]: data as ConnectionRow,
          }));

          posthog.capture("entanglement_requested", {
            source_user_id: user.id,
            target_user_id: targetUserId,
            connection_id: (data as ConnectionRow).id,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEntangleLoadingIds((prev) =>
        prev.filter((id) => id !== targetUserId)
      );
    }
  };

  const handleDeclineEntangle = async (targetUserId: string) => {
    if (!user) return;

    const row = connectionsByOtherId[targetUserId];
    if (!row) return;

    const status = getConnectionStatus(targetUserId);
    if (status !== "pending_incoming") return;

    setEntangleLoadingIds((prev) => [...prev, targetUserId]);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "declined" })
        .eq("id", row.id);

      if (!error) {
        setConnectionsByOtherId((prev) => {
          const copy = { ...prev };
          delete copy[targetUserId];
          return copy;
        });

        posthog.capture("entanglement_declined", {
          source_user_id: row.user_id,
          target_user_id: row.target_user_id,
          other_user_id: targetUserId,
          connection_id: row.id,
        });
      }
    } catch (err) {
      console.error("Decline failed", err);
    } finally {
      setEntangleLoadingIds((prev) =>
        prev.filter((id) => id !== targetUserId)
      );
    }
  };

  return {
    connectionsByOtherId,
    getConnectionStatus,
    handleEntangle,
    handleDeclineEntangle,
    isEntangleLoading,
  };
}
