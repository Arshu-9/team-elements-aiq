import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  sender?: {
    display_name: string;
    username: string;
  };
}

export interface OtherUser {
  id: string;
  display_name: string;
  username: string;
  status: string;
}

export const useUserChat = (conversationId: string | undefined, userId: string | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const channelRef = useRef<any>(null);
  const messageQueueRef = useRef<ChatMessage[]>([]);

  // Fetch initial data
  useEffect(() => {
    if (!conversationId || !userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch other participant
        const { data: participants } = await (supabase as any)
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", userId);

        if (participants && participants.length > 0) {
          const otherUserId = participants[0].user_id;
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("id, display_name, username, status")
            .eq("id", otherUserId)
            .single();

          if (profile) {
            setOtherUser(profile);
          }
        }

        // Fetch messages
        const { data: messagesData } = await (supabase as any)
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (messagesData) {
          const formattedMessages = messagesData.map((msg: any) => ({
            ...msg,
            status: msg.is_read ? 'read' : 'delivered' as const,
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Error fetching chat data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [conversationId, userId]);

  // Real-time subscription with reconnection handling
  useEffect(() => {
    if (!conversationId || !userId) return;

    const setupChannel = () => {
      const channel = supabase
        .channel(`user-chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: any) => {
            // Check if message already exists (optimistic update)
            setMessages((prev) => {
              const exists = prev.some(m => m.id === payload.new.id);
              if (exists) {
                // Update status of optimistic message
                return prev.map(m => 
                  m.id === payload.new.id 
                    ? { ...m, status: 'sent' as const }
                    : m
                );
              }
              
              // New message from other user
              return [
                ...prev,
                {
                  ...payload.new,
                  status: 'delivered' as const,
                },
              ];
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
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? { ...msg, ...payload.new, status: payload.new.is_read ? 'read' : 'delivered' as const }
                  : msg
              )
            );
          }
        )
        .on('presence', { event: 'sync' }, () => {
          setConnectionStatus('connected');
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            // Process queued messages
            processMessageQueue();
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('reconnecting');
          } else if (status === 'CLOSED') {
            setConnectionStatus('disconnected');
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, userId]);

  // Process queued messages when reconnected
  const processMessageQueue = async () => {
    const queue = [...messageQueueRef.current];
    messageQueueRef.current = [];

    for (const msg of queue) {
      try {
        await (supabase as any).from("messages").insert({
          id: msg.id,
          conversation_id: conversationId,
          sender_id: userId,
          content: msg.content,
          is_read: false,
        });
      } catch (error) {
        console.error("Error sending queued message:", error);
        // Re-queue failed messages
        messageQueueRef.current.push(msg);
      }
    }
  };

  // Send message with optimistic update
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !conversationId || !userId) return;

    const tempId = crypto.randomUUID();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content: content.trim(),
      sender_id: userId,
      created_at: new Date().toISOString(),
      is_read: false,
      status: 'sending',
    };

    // Optimistic update
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update with real message ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: data.id, status: 'sent' as const }
            : m
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Queue message if disconnected
      if (connectionStatus !== 'connected') {
        messageQueueRef.current.push(optimisticMessage);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, status: 'sending' as const }
              : m
          )
        );
      } else {
        // Remove failed message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw error;
      }
    }
  }, [conversationId, userId, connectionStatus]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!messageIds.length || !userId) return;

    try {
      await (supabase as any)
        .from("messages")
        .update({ is_read: true })
        .in("id", messageIds)
        .neq("sender_id", userId);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [userId]);

  return {
    messages,
    otherUser,
    loading,
    isTyping,
    connectionStatus,
    sendMessage,
    markAsRead,
  };
};
