import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserChat } from "@/hooks/useUserChat";
import { ArrowLeft, Send, Check, CheckCheck, Clock, Paperclip, Mic, Image as ImageIcon, MoreVertical, Phone, Video } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
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
      inputRef.current?.focus();
    }
  };

  const getStatusIcon = (status: string, isMine: boolean) => {
    if (!isMine) return null;
    
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-primary-foreground/50 animate-pulse-soft" />;
      case 'sent':
        return <Check className="w-3 h-3 text-primary-foreground/60" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-primary-foreground/60" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-primary-foreground" />;
      default:
        return null;
    }
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasText = message.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      {/* Header */}
      <header className="glass-soft border-b border-border/30 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="h-9 w-9 rounded-xl hover:bg-secondary transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  {otherUser?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                {otherUser?.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-online rounded-full border-2 border-card" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-[15px]">{otherUser?.display_name || "User"}</h2>
                <p className="text-xs text-muted-foreground">
                  {otherUser?.status === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <Video className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <div className={cn(
          "px-4 py-2 text-center text-xs font-medium animate-fade-in",
          connectionStatus === 'reconnecting' 
            ? "bg-warning/10 text-warning" 
            : "bg-destructive/10 text-destructive"
        )}>
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'No connection'}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="max-w-screen-xl mx-auto space-y-1">
          {messages.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                <span className="text-2xl font-semibold text-foreground/50">
                  {otherUser?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <p className="text-muted-foreground font-medium">
                Start a conversation
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Say hello to {otherUser?.display_name || "this user"}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.sender_id === user.id;
              const showDate = index === 0 || 
                new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();
              const showGap = index > 0 && 
                new Date(msg.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center py-4">
                      <span className="text-xs text-muted-foreground/60 bg-secondary/50 px-3 py-1 rounded-full">
                        {new Date(msg.created_at).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  
                  {showGap && !showDate && <div className="h-4" />}
                  
                  <div
                    className={cn(
                      "flex items-end gap-2 mb-0.5",
                      isMine ? "justify-end animate-slide-in-right" : "justify-start animate-slide-in-left"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-2.5 transition-all",
                        isMine ? "bubble-sent" : "bubble-received",
                        msg.status === 'sending' && "opacity-70"
                      )}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isMine ? "justify-end" : "justify-start"
                      )}>
                        <span className={cn(
                          "text-[10px]",
                          isMine ? "text-primary-foreground/60" : "text-muted-foreground/60"
                        )}>
                          {formatMessageTime(msg.created_at)}
                        </span>
                        {getStatusIcon(msg.status, isMine)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Bar */}
      <div className="glass-soft border-t border-border/30 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Message..."
              className="w-full h-11 px-4 bg-secondary/50 border-0 rounded-full text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
              disabled={isSending}
            />
          </div>
          
          {hasText ? (
            <Button
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full flex-shrink-0 transition-all",
                "bg-primary hover:bg-primary/90 send-glow"
              )}
              onClick={handleSendMessage}
              disabled={isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserChat;
