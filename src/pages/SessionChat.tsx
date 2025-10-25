import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionMessages } from "@/hooks/useSessionMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useSyncedChatMode } from "@/hooks/useSyncedChatMode";
import { ArrowLeft, Send, Users, Shield, Loader2, AlertTriangle, X, Key, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageReactions } from "@/components/MessageReactions";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatModeSelector } from "@/components/ChatModeSelector";
import { SessionTimer } from "@/components/SessionTimer";
import { FileUploadButton } from "@/components/FileUploadButton";
import { ScreenshotProtection } from "@/components/ScreenshotProtection";
import { SessionFiles } from "@/components/SessionFiles";
import { IntrusionAlerts } from "@/components/IntrusionAlerts";
import { SessionParticipants } from "@/components/SessionParticipants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const SessionChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { messages, loading, sendMessage, markAsRead } = useSessionMessages(id);
  const { typingUsers, setTyping } = useTypingIndicator(id);
  const { chatMode, updateChatMode } = useSyncedChatMode(id);
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showDestroyDialog, setShowDestroyDialog] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [intrusionAlerts, setIntrusionAlerts] = useState<any[]>([]);
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

      // Fetch intrusion alerts for creator
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setTyping(e.target.value.length > 0);
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

  const handleLeaveSession = async () => {
    if (!session || !user) return;

    const isCreator = session.creator_id === user.id;

    if (isCreator) {
      // Creator leaving triggers auto-destroy
      setShowDestroyDialog(true);
    } else {
      // Regular participant just leaves
      navigate("/sessions");
    }
  };

  if (authLoading || loading || !session) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-animated flex flex-col">
      <ScreenshotProtection />

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

      <header className="glass border-b border-border/50 p-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/sessions")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary elegant-glow-sm" />
              <div>
                <h2 className="font-semibold">{session?.name}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{participants.length} participants</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-primary/30">
              <Key className="w-4 h-4 text-primary" />
              <code className="text-sm font-mono text-primary">{session?.session_key}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={copySessionKey}
              >
                {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SessionTimer expiresAt={session?.expires_at} className="text-sm" />
            {session?.creator_id === user?.id && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDestroyDialog(true)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                End Session
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Info
                </Button>
              </SheetTrigger>
              <SheetContent className="glass w-full sm:max-w-md overflow-y-auto">
                <div className="space-y-4 mt-6">
                  <SessionParticipants participants={participants} creatorId={session?.creator_id} />
                  <IntrusionAlerts sessionId={id!} isCreator={session?.creator_id === user?.id} />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Shared Files
                    </h3>
                    <SessionFiles sessionId={id!} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-screen-xl mx-auto w-full">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[70%] rounded-2xl p-3 space-y-1 ${
                msg.sender_id === user?.id
                  ? "bg-primary text-primary-foreground elegant-glow-sm"
                  : "glass"
              }`}
            >
              {msg.sender_id !== user?.id && (
                <p className="text-xs font-semibold opacity-70">
                  {msg.sender?.display_name}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.chat_mode === 'burn' && (
                <p className="text-xs opacity-50 flex items-center gap-1">
                  🔥 Auto-delete
                </p>
              )}
              {msg.chat_mode === 'spy' && (
                <p className="text-xs opacity-50 flex items-center gap-1">
                  🕵️ No logs
                </p>
              )}
              <div className="flex items-center gap-2 text-xs opacity-70">
                <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                {msg.sender_id === user?.id && (
                  <span>
                    {msg.read_by && msg.read_by.length > 0 ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
              <MessageReactions messageId={msg.id} />
            </div>
          </div>
        ))}
        <TypingIndicator typingUsers={typingUsers.filter((u) => u.user_id !== user?.id)} />
        <div ref={messagesEndRef} />
      </div>

      <div className="glass border-t border-border/50 p-4 space-y-3">
        <div className="max-w-screen-xl mx-auto space-y-3">
          {intrusionAlerts.length > 0 && session?.creator_id === user?.id && (
            <div className="glass border border-destructive/50 rounded-xl p-3 animate-fade-in">
              <p className="text-sm font-semibold text-destructive mb-2">
                🚨 {intrusionAlerts.length} Intrusion Alert{intrusionAlerts.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Recent unauthorized access attempts detected. Session key refreshed.
              </p>
            </div>
          )}
          <ChatModeSelector mode={chatMode} onModeChange={updateChatMode} />
        </div>
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <FileUploadButton sessionId={id!} />
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a secure message..."
            className="flex-1 glass border-primary/30"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="elegant-glow"
            onClick={handleSendMessage}
            disabled={isSending || !message.trim()}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionChat;
