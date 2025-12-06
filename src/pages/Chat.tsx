import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Sparkles, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Chat = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const sendMessage = async () => {
    if (!message.trim() || isStreaming) return;

    const userMessage = { role: "user", content: message.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsStreaming(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/candy-chat`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (resp.status === 429 || resp.status === 402) {
        const errorData = await resp.json();
        toast({
          title: "Error",
          description: errorData.error || "Service unavailable",
          variant: "destructive",
        });
        setIsStreaming(false);
        return;
      }

      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasText = message.trim().length > 0;

  const quickPrompts = [
    "Analyze this message for threats",
    "Is this link safe to click?",
    "Check if this is phishing",
    "What's the tone of this message?",
  ];

  return (
    <div className="min-h-screen bg-gradient-soft flex flex-col">
      {/* Header */}
      <header className="glass-soft border-b border-border/30 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-xl hover:bg-secondary transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[15px]">Candy AI</h2>
              <p className="text-xs text-muted-foreground">Security Assistant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <div className="max-w-screen-xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 glow-primary">
                <Sparkles className="w-9 h-9 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Hi, I'm Candy 🍬</h3>
              <p className="text-muted-foreground mb-8">Your AI-powered security assistant</p>
              
              <div className="card-modern p-5 max-w-sm mx-auto text-left mb-6">
                <p className="text-sm font-medium mb-3">I can protect you from:</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span>🎣</span>
                    <span>Phishing attempts and scams</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>🦠</span>
                    <span>Malware and suspicious links</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Spam and unwanted content</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>😤</span>
                    <span>Toxic messages and harassment</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessage(prompt)}
                    className="w-full text-left text-sm p-3 rounded-2xl bg-secondary/50 hover:bg-secondary transition-smooth"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex mb-0.5",
                    msg.role === "user" 
                      ? "justify-end animate-slide-in-right" 
                      : "justify-start animate-slide-in-left"
                  )}
                >
                  <div className={cn(
                    "max-w-[75%] px-4 py-2.5",
                    msg.role === "user" ? "bubble-sent" : "bubble-received"
                  )}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start animate-slide-in-left">
                  <div className="bubble-received px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse-soft" />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Bar */}
      <div className="glass-soft border-t border-border/30 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Paste a message to analyze..."
              className="w-full h-11 px-4 bg-secondary/50 border-0 rounded-full text-[15px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
              disabled={isStreaming}
            />
          </div>
          
          <Button
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full flex-shrink-0 transition-all",
              hasText && !isStreaming 
                ? "bg-primary hover:bg-primary/90 send-glow" 
                : "bg-secondary text-muted-foreground"
            )}
            onClick={sendMessage}
            disabled={isStreaming || !hasText}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
