import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConnections = async () => {
      // Fetch accepted connections
      const { data: accepted } = await (supabase as any)
        .from("connections")
        .select(`
          id,
          connected_user_id,
          profiles:connected_user_id (
            id,
            display_name,
            username,
            status
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      // Fetch pending requests
      const { data: pending } = await (supabase as any)
        .from("connections")
        .select(`
          id,
          user_id,
          profiles:user_id (
            id,
            display_name,
            username
          )
        `)
        .eq("connected_user_id", user.id)
        .eq("status", "pending");

      if (accepted) {
        setConnections(
          accepted.map((c: any) => ({
            id: c.id,
            userId: c.profiles.id,
            name: c.profiles.display_name,
            username: c.profiles.username,
            status: c.profiles.status,
          }))
        );
      }

      if (pending) {
        setRequests(
          pending.map((r: any) => ({
            id: r.id,
            userId: r.profiles.id,
            name: r.profiles.display_name,
            username: r.profiles.username,
          }))
        );
      }

      setLoading(false);
    };

    fetchConnections();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("connections")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        () => {
          fetchConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const acceptRequest = async (requestId: string) => {
    await (supabase as any)
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", requestId);
  };

  const rejectRequest = async (requestId: string) => {
    await (supabase as any).from("connections").delete().eq("id", requestId);
  };

  return { connections, requests, loading, acceptRequest, rejectRequest };
};
