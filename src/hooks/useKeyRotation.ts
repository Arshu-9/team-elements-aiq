import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useKeyRotation = (sessionId: string | undefined, securityLevel: string) => {
  const [currentKey, setCurrentKey] = useState<string>("");
  const [lastRotation, setLastRotation] = useState<Date | null>(null);

  const getRotationInterval = (level: string) => {
    switch (level) {
      case "standard": return 10 * 60 * 1000; // 10 minutes
      case "high": return 5 * 60 * 1000; // 5 minutes
      case "maximum": return 1 * 60 * 1000; // 1 minute
      default: return 10 * 60 * 1000;
    }
  };

  useEffect(() => {
    if (!sessionId || !securityLevel) return;

    const rotateKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("session-manager", {
          body: {
            action: "rotate-key",
            sessionId,
          },
        });

        if (error) throw error;

        if (data.newKey) {
          setCurrentKey(data.newKey);
          setLastRotation(new Date());
          toast({
            title: "Key Rotated",
            description: "Encryption key has been automatically updated",
            duration: 2000,
          });
        }
      } catch (error) {
        console.error("Key rotation error:", error);
      }
    };

    const interval = setInterval(rotateKey, getRotationInterval(securityLevel));

    // Subscribe to key rotation events
    const channel = supabase
      .channel(`key-rotation-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_key_rotations",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setCurrentKey(payload.new.new_key);
          setLastRotation(new Date(payload.new.rotated_at));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [sessionId, securityLevel]);

  return { currentKey, lastRotation };
};
