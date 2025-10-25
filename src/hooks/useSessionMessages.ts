import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SessionMessage {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  encrypted_content?: string;
  chat_mode: 'normal' | 'self-destruct';
  is_deleted: boolean;
  read_by?: string[];
  delivered_to?: string[];
  auto_delete_at?: string;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url?: string;
  };
  reactions?: Array<{
    id: string;
    emoji: string;
    user_id: string;
  }>;
}

export const useSessionMessages = (sessionId: string | undefined) => {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("session_messages")
          .select(`
            *,
            sender:profiles!sender_id(display_name, avatar_url)
          `)
          .eq("session_id", sessionId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true });

        if (error) throw error;

        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`session-messages-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const { data: senderData } = await (supabase as any)
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...payload.new, sender: senderData } as SessionMessage,
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "session_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new.is_deleted) {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.new.id));
          } else {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Handle auto-deletion of self-destruct messages
  useEffect(() => {
    const checkForDeletion = () => {
      messages.forEach((msg) => {
        if (msg.auto_delete_at && new Date(msg.auto_delete_at) <= new Date() && !msg.is_deleted) {
          // Mark message as deleted in database
          supabase
            .from("session_messages")
            .update({ is_deleted: true })
            .eq("id", msg.id);
        }
      });
    };

    const interval = setInterval(checkForDeletion, 1000);
    return () => clearInterval(interval);
  }, [messages]);

  const sendMessage = async (content: string, chatMode: 'normal' | 'self-destruct' = 'normal') => {
    if (!sessionId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("session_messages").insert({
        session_id: sessionId,
        sender_id: user.id,
        content,
        chat_mode: chatMode,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      const readBy = message.read_by || [];
      if (readBy.includes(user.id)) return;

      const updates: any = { read_by: [...readBy, user.id] };
      
      // If self-destruct mode and this is the last unread user, set auto_delete_at
      if (message.chat_mode === 'self-destruct') {
        updates.auto_delete_at = new Date(Date.now() + 10000).toISOString();
      }

      await (supabase as any)
        .from("session_messages")
        .update(updates)
        .eq("id", messageId);
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return { messages, loading, sendMessage, markAsRead };
};
