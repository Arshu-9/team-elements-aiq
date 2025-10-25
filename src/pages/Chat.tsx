import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    if (!message.trim() || isStreaming || id !== "candy") return;

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
    }
  };


  if (loading || !user) {
    return <div className="min-h-screen gradient-animated flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen gradient-animated flex flex-col">
      <header className="glass border-b border-border/50 p-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h2 className="font-semibold">Candy 🍬 Security Assistant</h2>
                <p className="text-xs text-muted-foreground">AI-powered threat detection</p>
              </div>
            </div>
          </div>
        </div>
      </header>


      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-screen-xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center mt-12 space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent elegant-glow flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <p className="text-2xl font-semibold mb-2">👋 Hi! I'm Candy 🍬</p>
              <p className="text-muted-foreground">Your AI-powered security assistant</p>
            </div>
            
            <div className="glass rounded-3xl p-6 max-w-md mx-auto text-left space-y-4">
              <p className="text-sm font-semibold">🛡️ I can protect you from:</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">🎣</span>
                  <span>Phishing attempts and scam messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">🦠</span>
                  <span>Malware links and suspicious URLs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">⚠️</span>
                  <span>Spam and unwanted content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">😤</span>
                  <span>Toxic messages and harassment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">🔐</span>
                  <span>Privacy violations and data exposure</span>
                </li>
              </ul>
            </div>

            <div className="glass rounded-3xl p-4 max-w-md mx-auto space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Try asking:</p>
              <div className="space-y-2">
                {[
                  "Analyze this message for threats",
                  "Is this link safe to click?",
                  "Check if this is a phishing attempt",
                  "What's the tone of this message?",
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setMessage(prompt)}
                    className="w-full text-left text-sm p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            <div className={`max-w-[70%] rounded-2xl p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground elegant-glow-sm" : "glass"}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="glass rounded-2xl p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="glass border-t border-border/50 p-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <Input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Paste a message to analyze for threats..." 
            className="flex-1 glass border-primary/30"
            disabled={isStreaming}
          />
          <Button 
            size="icon" 
            className="elegant-glow" 
            onClick={sendMessage}
            disabled={isStreaming || !message.trim()}
          >
            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
