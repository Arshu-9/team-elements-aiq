import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  conversation_id: string;
  sender?: {
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export const useUserMessages = (conversationId: string | undefined) => {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const messageMapRef = useRef<Map<string, UserMessage>>(new Map());

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read,
            conversation_id,
            profiles:sender_id (display_name, username, avatar_url)
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const messageList = data || [];
        messageList.forEach((msg: UserMessage) => {
          messageMapRef.current.set(msg.id, msg);
        });
        setMessages(messageList);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          if (messageMapRef.current.has(payload.new.id)) return;

          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender: profile,
          } as UserMessage;

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
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const updatedMessage = { ...messageMapRef.current.get(payload.new.id), ...payload.new };
          messageMapRef.current.set(payload.new.id, updatedMessage);
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;

    const tempId = `temp-${Date.now()}`;
    setSendingMessageId(tempId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const optimisticMessage: UserMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
        sender: {
          display_name: "You",
          username: "you",
        },
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          is_read: false,
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
      if (!message || message.sender_id === user.id || message.is_read) return;

      await (supabase as any)
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  return { messages, loading, sendMessage, markAsRead, sendingMessageId };
};
