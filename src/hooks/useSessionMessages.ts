import { useEffect, useState, useRef } from "react";
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
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const messageMapRef = useRef<Map<string, SessionMessage>>(new Map());

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data: messagesData, error } = await (supabase as any)
          .from("session_messages")
          .select("*")
          .eq("session_id", sessionId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const messageList = messagesData || [];
        
        // Fetch sender profiles separately
        const senderIds = [...new Set(messageList.map((m: any) => m.sender_id))];
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", senderIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

        const messagesWithProfiles = messageList.map((msg: any) => ({
          ...msg,
          sender: profileMap.get(msg.sender_id),
        }));

        messagesWithProfiles.forEach((msg: SessionMessage) => {
          messageMapRef.current.set(msg.id, msg);
        });
        setMessages(messagesWithProfiles);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

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
          if (messageMapRef.current.has(payload.new.id)) return;

          const { data: senderData } = await (supabase as any)
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          const newMessage = { ...payload.new, sender: senderData } as SessionMessage;
          messageMapRef.current.set(newMessage.id, newMessage);

          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
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
            messageMapRef.current.delete(payload.new.id);
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.new.id));
          } else {
            const updatedMessage = { ...messageMapRef.current.get(payload.new.id), ...payload.new };
            messageMapRef.current.set(payload.new.id, updatedMessage);
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? updatedMessage : msg
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

    const tempId = `temp-${Date.now()}`;
    setSendingMessageId(tempId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const optimisticMessage: SessionMessage = {
        id: tempId,
        session_id: sessionId,
        sender_id: user.id,
        content,
        chat_mode: chatMode,
        is_deleted: false,
        created_at: new Date().toISOString(),
        sender: {
          display_name: "You",
          avatar_url: undefined,
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const { data, error } = await (supabase as any)
        .from("session_messages")
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          content,
          chat_mode: chatMode,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, id: data.id } : msg))
      );
      messageMapRef.current.delete(tempId);
      messageMapRef.current.set(data.id, data);
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      console.error("Error sending message:", error);
      throw error;
    } finally {
      setSendingMessageId(null);
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

  return { messages, loading, sendMessage, markAsRead, sendingMessageId };
};
