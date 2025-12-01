import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserMessages } from "@/hooks/useUserMessages";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
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
import { ConnectionStatus } from "@/components/ConnectionStatus";

const UserChat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, loading, sendMessage: sendMessageHook, markAsRead } = useUserMessages(conversationId);
  const { status } = useRealtimeConnection(`conversation:${conversationId}`);
  const { queueLength, isOnline } = useOfflineQueue();
  
  const [message, setMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [replyTo, setReplyTo] = useState<{ content: string; sender: string } | undefined>();
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
    if (!user) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute("data-message-id");
            const senderId = entry.target.getAttribute("data-sender-id");
            if (messageId && senderId !== user.id) {
              markAsRead(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    messageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [messages, user, markAsRead]);

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
      } catch (error) {
        console.error("Error fetching conversation:", error);
      }
    };

    fetchConversationData();
  }, [conversationId, user, authLoading, navigate]);

  const sendMessage = async () => {
    if (!message.trim() || !conversationId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessageHook(message);
      setMessage("");
      setReplyTo(undefined);
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Tap to retry",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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

  const groupMessages = (messages: any[]) => {
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
      <ConnectionStatus status={isOnline ? status : "disconnected"} queueLength={queueLength} />
      
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
            <div
              key={msg.id}
              ref={(el) => {
                if (el) messageRefs.current.set(msg.id, el);
              }}
              data-message-id={msg.id}
              data-sender-id={msg.sender_id}
            >
              <MessageOptionsMenu
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
            </div>
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
        disabled={isSending}
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
