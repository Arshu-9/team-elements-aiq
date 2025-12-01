import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
  chatMode?: string;
  conversationId?: string;
  sessionId?: string;
  retryCount: number;
}

const STORAGE_KEY = "offline_message_queue";
const MAX_RETRY_ATTEMPTS = 3;

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [queue]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addToQueue = useCallback((message: Omit<QueuedMessage, "retryCount">) => {
    setQueue((prev) => [...prev, { ...message, retryCount: 0 }]);
  }, []);

  const removeFromQueue = useCallback((messageId: string) => {
    setQueue((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const messagesToProcess = [...queue];
    
    for (const msg of messagesToProcess) {
      try {
        if (msg.sessionId) {
          await (supabase as any).from("session_messages").insert({
            session_id: msg.sessionId,
            sender_id: user.id,
            content: msg.content,
            chat_mode: msg.chatMode || "normal",
          });
        } else if (msg.conversationId) {
          await (supabase as any).from("messages").insert({
            conversation_id: msg.conversationId,
            sender_id: user.id,
            content: msg.content,
            is_read: false,
          });
        }
        
        removeFromQueue(msg.id);
      } catch (error) {
        console.error("Failed to send queued message:", error);
        
        if (msg.retryCount >= MAX_RETRY_ATTEMPTS) {
          removeFromQueue(msg.id);
        } else {
          setQueue((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, retryCount: m.retryCount + 1 } : m
            )
          );
        }
      }
    }
  }, [isOnline, queue, removeFromQueue]);

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

  return { addToQueue, removeFromQueue, queueLength: queue.length, isOnline };
};
