import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionMessages } from "@/hooks/useSessionMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useSyncedChatMode } from "@/hooks/useSyncedChatMode";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Shield, Users, X, Key, Copy, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ScrollToBottomButton } from "@/components/chat/ScrollToBottomButton";
import { MessageOptionsMenu } from "@/components/chat/MessageOptionsMenu";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatModeSelector } from "@/components/ChatModeSelector";
import { SessionTimer } from "@/components/SessionTimer";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { FileUploadButton } from "@/components/FileUploadButton";
import { ScreenshotProtection } from "@/components/ScreenshotProtection";
import { SessionFiles } from "@/components/SessionFiles";
import { IntrusionAlerts } from "@/components/IntrusionAlerts";
import { SessionParticipants } from "@/components/SessionParticipants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const SessionChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, loading, sendMessage, markAsRead } = useSessionMessages(id);
  const { typingUsers, setTyping } = useTypingIndicator(id);
  const { chatMode, updateChatMode } = useSyncedChatMode(id);
  const { status } = useRealtimeConnection(`session-${id}`);
  const { queueLength, isOnline } = useOfflineQueue();
  
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showDestroyDialog, setShowDestroyDialog] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [intrusionAlerts, setIntrusionAlerts] = useState<any[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  const [replyTo, setReplyTo] = useState<{ content: string; sender: string } | undefined>();
  
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
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id) return;

    const fetchSessionData = async () => {
      const { data: sessionData, error: sessionError } = await (supabase as any)
        .from("sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (sessionError || !sessionData) {
        toast({
          title: "Session not found",
          description: "This session may have expired or been deleted",
          variant: "destructive",
        });
        navigate("/sessions");
        return;
      }

      setSession(sessionData);

      const { data: participantsData } = await (supabase as any)
        .from("session_participants")
        .select(`
          *,
          profile:profiles!user_id(display_name, avatar_url, status)
        `)
        .eq("session_id", id);

      if (participantsData) setParticipants(participantsData);

      if (sessionData.creator_id === user?.id) {
        const { data: alertsData } = await (supabase as any)
          .from("intrusion_attempts")
          .select("*")
          .eq("session_id", id)
          .order("attempt_timestamp", { ascending: false })
          .limit(5);

        if (alertsData) setIntrusionAlerts(alertsData);
      }
    };

    fetchSessionData();

    const channel = supabase
      .channel(`session-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setSession(payload.new);
            if (!payload.new.is_active) {
              toast({
                title: "Session ended",
                description: "This session has been closed",
              });
              navigate("/sessions");
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${id}`,
        },
        async () => {
          const { data } = await (supabase as any)
            .from("session_participants")
            .select(`
              *,
              profile:profiles!user_id(display_name, avatar_url, status)
            `)
            .eq("session_id", id);

          if (data) setParticipants(data);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "intrusion_attempts",
          filter: `session_id=eq.${id}`,
        },
        (payload) => {
          if (session?.creator_id === user?.id) {
            setIntrusionAlerts((prev) => [payload.new, ...prev].slice(0, 5));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, navigate]);

  const copySessionKey = () => {
    if (session?.session_key) {
      navigator.clipboard.writeText(session.session_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
      toast({
        title: "Session key copied",
        description: "Share this key with authorized participants",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(message, chatMode);
      setMessage("");
      setTyping(false);
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

  const handleInputChange = (value: string) => {
    setMessage(value);
    setTyping(value.length > 0);
  };

  const handleDestroySession = async () => {
    if (!session || session.creator_id !== user?.id) return;

    setIsDestroying(true);
    try {
      await supabase.functions.invoke("session-manager", {
        body: {
          action: "destroy-session",
          sessionId: id,
          userId: user.id,
        },
      });

      toast({
        title: "Session Destroyed",
        description: "All session data has been permanently deleted",
      });
      navigate("/sessions");
    } catch (error) {
      console.error("Destroy session error:", error);
      toast({
        title: "Error",
        description: "Failed to destroy session",
        variant: "destructive",
      });
    } finally {
      setIsDestroying(false);
      setShowDestroyDialog(false);
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
      const isGrouped =
        prevMsg &&
        prevMsg.sender_id === msg.sender_id &&
        new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000;

      grouped.push({ ...msg, isGrouped });
    });
    return grouped;
  };

  const getModeBadge = () => {
    if (chatMode === "self-destruct") {
      return { label: "💣 Burn", color: "red" as const };
    }
    return { label: "🔒 Normal", color: "gray" as const };
  };

  if (authLoading || loading || !session) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedMessages = groupMessages(messages);
  const participantCount = participants.length;
  const typingStatus = typingUsers.length > 0 ? "typing" : "online";

  return (
    <div className="min-h-screen gradient-animated flex flex-col">
      <ScreenshotProtection />
      <ConnectionStatus status={isOnline ? status : "disconnected"} queueLength={queueLength} />

      <AlertDialog open={showDestroyDialog} onOpenChange={setShowDestroyDialog}>
        <AlertDialogContent className="glass border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Destroy Session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              As the session creator, leaving will permanently destroy this session for all participants.
              All messages, files, and session data will be irreversibly deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDestroySession}
              disabled={isDestroying}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDestroying ? "Destroying..." : "Destroy Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChatHeader
        name={session?.name}
        avatar=""
        status={typingStatus}
        subtitle={`${participantCount} participants`}
        modeBadge={getModeBadge()}
        onBack={() => navigate("/sessions")}
        onOpenProfile={() => setShowSessionInfo(true)}
      />

      <Sheet open={showSessionInfo} onOpenChange={setShowSessionInfo}>
        <SheetContent className="glass border-l border-border/30 w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Session Info
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Session Key</span>
                <SessionTimer expiresAt={session?.expires_at} className="text-xs" />
              </div>
              <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 border border-primary/30">
                <Key className="w-4 h-4 text-primary flex-shrink-0" />
                <code className="text-xs font-mono text-primary flex-1 truncate">
                  {session?.session_key}
                </code>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={copySessionKey}>
                  {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Chat Mode</h3>
              <ChatModeSelector mode={chatMode} onModeChange={updateChatMode} />
            </div>

            <SessionParticipants participants={participants} creatorId={session?.creator_id} />

            {session?.creator_id === user?.id && (
              <IntrusionAlerts sessionId={id!} isCreator={true} />
            )}

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Shared Files
              </h3>
              <SessionFiles sessionId={id!} />
            </div>

            {session?.creator_id === user?.id && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowDestroyDialog(true)}
              >
                <X className="w-4 h-4" />
                End Session
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto pt-20 pb-32 px-4 space-y-2 max-w-screen-xl mx-auto w-full"
      >
        {groupedMessages.map((msg) => (
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
              canDelete={msg.sender_id === user?.id}
            >
              <MessageBubble
                id={msg.id}
                content={msg.content}
                timestamp={msg.created_at}
                isOwn={msg.sender_id === user?.id}
                senderName={msg.sender?.display_name}
                senderAvatar={msg.sender?.avatar_url}
                isGrouped={msg.isGrouped}
                isRead={msg.read_by && msg.read_by.length > 1}
                chatMode={msg.chat_mode}
              />
            </MessageOptionsMenu>
          </div>
        ))}

        <TypingIndicator typingUsers={typingUsers.filter((u) => u.user_id !== user?.id)} />
        <div ref={messagesEndRef} />
      </div>

      {intrusionAlerts.length > 0 && session?.creator_id === user?.id && (
        <div className="fixed bottom-28 left-4 right-4 max-w-screen-xl mx-auto z-30">
          <div className="glass border border-destructive/50 rounded-xl p-3 shadow-lg animate-fade-in">
            <p className="text-sm font-semibold text-destructive mb-1">
              🚨 {intrusionAlerts.length} Intrusion Alert{intrusionAlerts.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Recent unauthorized access attempts detected. Session key refreshed.
            </p>
          </div>
        </div>
      )}

      <ScrollToBottomButton
        show={showScrollButton}
        hasNewMessages={hasNewMessages}
        onClick={() => scrollToBottom()}
      />

      <ChatInput
        value={message}
        onChange={handleInputChange}
        onSend={handleSendMessage}
        onTyping={setTyping}
        disabled={isSending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(undefined)}
        onAttachment={() => {
          /* File upload handled separately */
        }}
      />
    </div>
  );
};

export default SessionChat;
