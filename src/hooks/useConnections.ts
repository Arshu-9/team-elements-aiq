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
      try {
        // Fetch accepted connections
        const { data: acceptedData } = await (supabase as any)
          .from("connections")
          .select("id, connected_user_id")
          .eq("user_id", user.id)
          .eq("status", "accepted");

        // Fetch profiles for accepted connections
        if (acceptedData && acceptedData.length > 0) {
          const connectedUserIds = acceptedData.map((c: any) => c.connected_user_id);
          const { data: profilesData } = await (supabase as any)
            .from("profiles")
            .select("id, display_name, username, status")
            .in("id", connectedUserIds);

          const formattedConnections = acceptedData.map((connection: any) => {
            const profile = profilesData?.find((p: any) => p.id === connection.connected_user_id);
            return {
              id: connection.id,
              userId: profile?.id || connection.connected_user_id,
              name: profile?.display_name || "Unknown",
              username: profile?.username || "unknown",
              status: profile?.status || "offline",
            };
          });

          setConnections(formattedConnections);
        } else {
          setConnections([]);
        }

        // Fetch pending requests
        const { data: pendingData } = await (supabase as any)
          .from("connections")
          .select("id, user_id")
          .eq("connected_user_id", user.id)
          .eq("status", "pending");

        // Fetch profiles for pending requests
        if (pendingData && pendingData.length > 0) {
          const senderIds = pendingData.map((r: any) => r.user_id);
          const { data: profilesData } = await (supabase as any)
            .from("profiles")
            .select("id, display_name, username")
            .in("id", senderIds);

          const formattedRequests = pendingData.map((request: any) => {
            const profile = profilesData?.find((p: any) => p.id === request.user_id);
            return {
              id: request.id,
              userId: profile?.id || request.user_id,
              name: profile?.display_name || "Unknown",
              username: profile?.username || "unknown",
            };
          });

          setRequests(formattedRequests);
        } else {
          setRequests([]);
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
        setConnections([]);
        setRequests([]);
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
