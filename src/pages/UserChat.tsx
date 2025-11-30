import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollToBottomButton } from "@/components/chat/ScrollToBottomButton";
import { ProfileDrawer } from "@/components/chat/ProfileDrawer";
import { MessageOptionsMenu } from "@/components/chat/MessageOptionsMenu";
import { EmptyState } from "@/components/chat/EmptyState";
import { TypingIndicator } from "@/components/TypingIndicator";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    display_name: string;
    username: string;
    avatar_url?: string;
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [replyTo, setReplyTo] = useState<{ content: string; sender: string } | undefined>();
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
    
    if (isNearBottom) {
      setHasNewMessages(false);
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    const isAtBottom = !showScrollButton;
    if (isAtBottom) {
      scrollToBottom();
    } else {
      setHasNewMessages(true);
    }
  }, [messages]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!conversationId || !user) return;

    const fetchConversationData = async () => {
      try {
        const { data: participants } = await (supabase as any)
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", user.id);

        if (participants && participants.length > 0) {
          const otherUserId = participants[0].user_id;
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("display_name, username, status, avatar_url, bio")
            .eq("id", otherUserId)
            .single();

          setOtherUser(profile);
        }

        const { data: messagesData } = await (supabase as any)
          .from("messages")
          .select(`
            id,
            content,
            sender_id,
            created_at,
            is_read,
            profiles:sender_id (display_name, username, avatar_url)
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
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("display_name, username, avatar_url")
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
      setReplyTo(undefined);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  const handleReplyToMessage = (content: string, senderName: string) => {
    setReplyTo({ content, sender: senderName });
  };

  const groupMessages = (messages: Message[]) => {
    const grouped: any[] = [];
    messages.forEach((msg, index) => {
      const prevMsg = messages[index - 1];
      const isGrouped = prevMsg && prevMsg.sender_id === msg.sender_id &&
        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000;
      
      grouped.push({ ...msg, isGrouped });
    });
    return grouped;
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedMessages = groupMessages(messages);

  return (
    <div className="min-h-screen gradient-animated flex flex-col">
      <ChatHeader
        name={otherUser?.display_name || "User"}
        avatar={otherUser?.avatar_url}
        status={otherUser?.status === "online" ? "online" : "offline"}
        subtitle={`@${otherUser?.username || "username"}`}
        onBack={() => navigate("/")}
        onOpenProfile={() => setShowProfileDrawer(true)}
      />

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pt-20 pb-32 px-4 space-y-2 max-w-screen-xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          groupedMessages.map((msg) => (
            <MessageOptionsMenu
              key={msg.id}
              onCopy={() => handleCopyMessage(msg.content)}
              onReply={() => handleReplyToMessage(msg.content, msg.sender?.display_name || "User")}
              onReact={() => {}}
              canDelete={msg.sender_id === user.id}
            >
              <MessageBubble
                id={msg.id}
                content={msg.content}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === user.id}
                senderName={msg.sender?.display_name}
                senderAvatar={msg.sender?.avatar_url}
                isGrouped={msg.isGrouped}
                isRead={msg.is_read}
              />
            </MessageOptionsMenu>
          ))
        )}
        
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      <ScrollToBottomButton
        show={showScrollButton}
        hasNewMessages={hasNewMessages}
        onClick={() => scrollToBottom()}
      />

      <ChatInput
        value={message}
        onChange={setMessage}
        onSend={sendMessage}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
      />

      <ProfileDrawer
        open={showProfileDrawer}
        onOpenChange={setShowProfileDrawer}
        name={otherUser?.display_name || "User"}
        username={otherUser?.username}
        avatar={otherUser?.avatar_url}
        status={otherUser?.status || "offline"}
        bio={otherUser?.bio}
      />
    </div>
  );
};

export default UserChat;
