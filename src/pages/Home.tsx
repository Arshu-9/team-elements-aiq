import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import SecurityBadge from "@/components/SecurityBadge";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { MessageSquare, Bot, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { conversations, loading: convLoading } = useConversations();
  const [candyAiEnabled, setCandyAiEnabled] = useState(() => {
    const saved = localStorage.getItem("candyAiEnabled");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("candyAiEnabled");
      setCandyAiEnabled(saved !== null ? JSON.parse(saved) : true);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  if (loading || !user) {
    return <div className="min-h-screen gradient-animated flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Dashboard" rightElement={<SecurityBadge />} />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Candy AI Assistant - Conditional based on settings */}
        {candyAiEnabled && (
          <div
            className="glass rounded-3xl p-6 border-primary/30 elegant-glow cursor-pointer transition-smooth hover:scale-[1.02] elegant-shimmer animate-fade-in"
            onClick={() => navigate("/chat/candy")}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center elegant-glow">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  Candy 🍬 AI Assistant
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-Powered
                  </Badge>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your intelligent companion • Smart analysis • Privacy-first
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">
            Recent Conversations
          </h2>
          
          {convLoading ? (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No conversations yet</p>
              <p className="text-sm text-muted-foreground">
                Connect with others to start chatting
              </p>
            </div>
          ) : (
            conversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="glass rounded-3xl p-4 cursor-pointer transition-smooth hover:scale-[1.02] hover:border-primary/50 elegant-shimmer"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background elegant-glow-sm" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold truncate">{chat.name}</h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                  
                  {chat.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground elegant-glow-sm">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
