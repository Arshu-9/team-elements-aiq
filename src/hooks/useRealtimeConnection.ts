import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export const useRealtimeConnection = (channelName: string) => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const handleStatusChange = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      handleStatusChange("disconnected");
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      handleStatusChange("connecting");
      if (channelRef.current) {
        channelRef.current.subscribe();
      }
    }, delay);
  }, [handleStatusChange]);

  const createChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    channelRef.current = supabase.channel(channelName);
    
    channelRef.current
      .on("system", {}, (payload) => {
        if (payload.type === "connected") {
          handleStatusChange("connected");
          reconnectAttemptsRef.current = 0;
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          handleStatusChange("connected");
          reconnectAttemptsRef.current = 0;
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          handleStatusChange("disconnected");
          attemptReconnect();
        }
      });

    return channelRef.current;
  }, [channelName, handleStatusChange, attemptReconnect]);

  useEffect(() => {
    const channel = createChannel();

    const handleOnline = () => {
      handleStatusChange("connecting");
      channel.subscribe();
    };

    const handleOffline = () => {
      handleStatusChange("disconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [createChannel, handleStatusChange]);

  return { status, channel: channelRef.current };
};
