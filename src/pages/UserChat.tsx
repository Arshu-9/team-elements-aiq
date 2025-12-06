import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserChat } from "@/hooks/useUserChat";
import { ArrowLeft, Send, Check, CheckCheck, Clock, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const UserChat = () => {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const {
    messages,
    otherUser,
    loading,
    connectionStatus,
    sendMessage: sendChatMessage,
    markAsRead,
  } = useUserChat(conversationId, user?.id);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (!user) return;
    
    const unreadMessageIds = messages
      .filter((m) => m.sender_id !== user.id && m.status !== 'read')
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      markAsRead(unreadMessageIds);
    }
  }, [messages, user, markAsRead]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    const content = message.trim();
    setMessage("");
    setIsSending(true);

    try {
      await sendChatMessage(content);
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

  const getStatusIcon = (status: string, isMine: boolean) => {
    if (!isMine) return null;
    
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary" />;
      default:
        return null;
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
      {/* Header */}
      <header className="glass border-b border-border/50 p-4 transition-all duration-300">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10 transition-colors duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                  {otherUser?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-colors duration-300",
                  otherUser?.status === 'online' ? "bg-green-500" : "bg-muted"
                )} />
              </div>
              <div>
                <h2 className="font-semibold">{otherUser?.display_name || "User"}</h2>
                <p className="text-xs text-muted-foreground">
                  {otherUser?.status === 'online' ? 'Online' : `@${otherUser?.username || "username"}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <div className={cn(
          "px-4 py-2 text-center text-sm flex items-center justify-center gap-2 transition-all duration-300",
          connectionStatus === 'reconnecting' 
            ? "bg-yellow-500/20 text-yellow-500" 
            : "bg-destructive/20 text-destructive"
        )}>
          {connectionStatus === 'reconnecting' ? (
            <>
              <Wifi className="w-4 h-4 animate-pulse" />
              <span>Reconnecting...</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span>No connection</span>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 max-w-screen-xl mx-auto w-full scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-center mt-12 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
              <span className="text-2xl">{otherUser?.display_name?.charAt(0)?.toUpperCase() || "?"}</span>
            </div>
            <p className="text-muted-foreground">Start a conversation with {otherUser?.display_name || "this user"}</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id === user.id;
            const showTimestamp = index === 0 || 
              new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;

            return (
              <div key={msg.id} className="animate-fade-in">
                {showTimestamp && (
                  <div className="text-center text-xs text-muted-foreground mb-3">
                    {new Date(msg.created_at).toLocaleDateString([], {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
                <div className={cn(
                  "flex items-end gap-2",
                  isMine ? "justify-end" : "justify-start"
                )}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 transition-all duration-200",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "glass rounded-bl-md",
                      msg.status === 'sending' && "opacity-70"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      isMine ? "justify-end" : "justify-start"
                    )}>
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {getStatusIcon(msg.status, isMine)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-border/50 p-4 transition-all duration-300">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 glass border-primary/30 transition-all duration-200 focus:border-primary/50"
            disabled={isSending}
          />
          <Button
            size="icon"
            className={cn(
              "transition-all duration-200",
              message.trim() ? "elegant-glow scale-100" : "opacity-50 scale-95"
            )}
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
          >
            <Send className={cn(
              "w-5 h-5 transition-transform duration-200",
              isSending && "animate-pulse"
            )} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserChat;
