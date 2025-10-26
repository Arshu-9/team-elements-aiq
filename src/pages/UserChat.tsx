import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    display_name: string;
    username: string;
  };
}

const UserChat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!conversationId || !user) return;

    const fetchConversationData = async () => {
      try {
        // Fetch other participant
        const { data: participants } = await (supabase as any)
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id);

        if (participants && participants.length > 0) {
          const otherUserId = participants[0].user_id;
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("display_name, username, status")
            .eq("id", otherUserId)
            .single();

          setOtherUser(profile);
        }

        // Fetch messages
        const { data: messagesData } = await (supabase as any)
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read,
            profiles:sender_id (display_name, username)
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (messagesData) {
          setMessages(messagesData);
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
        toast({
          title: "Error",
          description: "Failed to load conversation",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();

    // Subscribe to new messages
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
          // Fetch sender profile
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("display_name, username")
            .eq("id", payload.new.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            {
              ...payload.new,
              sender: profile,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, authLoading, navigate]);

  const sendMessage = async () => {
    if (!message.trim() || !conversationId || !user) return;

    try {
      const { error } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: message.trim(),
          is_read: false,
        });

      if (error) throw error;

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-animated flex flex-col">
      <header className="glass border-b border-border/50 p-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="font-semibold">{otherUser?.display_name || "User"}</h2>
              <p className="text-xs text-muted-foreground">@{otherUser?.username || "username"}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-screen-xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div
                className={`max-w-[70%] rounded-2xl p-3 ${
                  msg.sender_id === user.id
                    ? "bg-primary text-primary-foreground elegant-glow-sm"
                    : "glass"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="glass border-t border-border/50 p-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 glass border-primary/30"
          />
          <Button
            size="icon"
            className="elegant-glow"
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserChat;
