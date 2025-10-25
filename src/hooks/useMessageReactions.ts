import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export const useMessageReactions = (messageId: string) => {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    const fetchReactions = async () => {
      const { data } = await (supabase as any)
        .from("message_reactions")
        .select("*")
        .eq("message_id", messageId);

      if (data) setReactions(data);
    };

    fetchReactions();

    const channel = supabase
      .channel(`message-reactions-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          setReactions((prev) => [...prev, payload.new as Reaction]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
          filter: `message_id=eq.${messageId}`,
        },
        (payload) => {
          setReactions((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const addReaction = async (emoji: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user already reacted with this emoji
      const existing = reactions.find(
        (r) => r.user_id === user.id && r.emoji === emoji
      );

      if (existing) {
        // Remove reaction
        await (supabase as any).from("message_reactions").delete().eq("id", existing.id);
      } else {
        // Add reaction
        await (supabase as any).from("message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return { reactions, groupedReactions, addReaction };
};
