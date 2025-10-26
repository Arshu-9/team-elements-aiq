import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        // Fetch user's conversation IDs
        const { data: convParticipants, error: convError } = await (supabase as any)
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        if (convError) {
          console.error("Error fetching conversation participants:", convError);
          setLoading(false);
          return;
        }

        if (!convParticipants || convParticipants.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const conversationIds = convParticipants.map((c: any) => c.conversation_id);

        // Fetch conversations data
        const { data: conversationsData } = await (supabase as any)
          .from("conversations")
          .select("id, created_at, updated_at")
          .in("id", conversationIds);

        // Fetch other participants (not current user)
        const { data: otherParticipants } = await (supabase as any)
          .from("conversation_participants")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds)
          .neq("user_id", user.id);

        // Get profiles for other participants
        if (otherParticipants && otherParticipants.length > 0) {
          const participantIds = otherParticipants.map((p: any) => p.user_id);
          const { data: profilesData } = await (supabase as any)
            .from("profiles")
            .select("id, display_name, username, status")
            .in("id", participantIds);

          // Fetch last messages for each conversation
          const { data: messagesData } = await (supabase as any)
            .from("messages")
            .select("conversation_id, content, created_at, is_read, sender_id")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

          // Group messages and calculate unread counts
          const lastMessages: Record<string, any> = {};
          const unreadCounts: Record<string, number> = {};

          messagesData?.forEach((msg: any) => {
            if (!lastMessages[msg.conversation_id]) {
              lastMessages[msg.conversation_id] = msg;
            }
            if (!msg.is_read && msg.sender_id !== user.id) {
              unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
            }
          });

          // Format conversations
          const formattedConversations = conversationsData?.map((conv: any) => {
            const participant = otherParticipants.find(
              (p: any) => p.conversation_id === conv.id
            );
            const profile = profilesData?.find((p: any) => p.id === participant?.user_id);
            const lastMsg = lastMessages[conv.id];

            return {
              id: conv.id,
              name: profile?.display_name || "Unknown User",
              username: profile?.username || "unknown",
              lastMessage: lastMsg?.content || "No messages yet",
              time: lastMsg?.created_at || conv.created_at,
              unread: unreadCounts[conv.id] || 0,
              online: profile?.status === "online",
            };
          }) || [];

          setConversations(formattedConversations);
        } else {
          setConversations([]);
        }
      } catch (error) {
        console.error("Error in fetchConversations:", error);
        setConversations([]);
      }
      
      setLoading(false);
    };

    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading };
};
