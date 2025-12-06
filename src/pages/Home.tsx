import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { MessageSquare, Bot, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { conversations, loading: convLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredConversations = conversations.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft pb-24 pt-20">
      <TopBar title="Messages" />
      
      <div className="max-w-screen-xl mx-auto px-5 py-4 space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-card border-border/50 rounded-2xl text-sm placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Candy AI Assistant */}
        {candyAiEnabled && (
          <div
            className="card-modern p-4 cursor-pointer animate-fade-in"
            onClick={() => navigate("/chat/candy")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Candy AI</h3>
                  <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 font-medium">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Assistant
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Security analysis & smart assistance
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Chats Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground/60">{conversations.length} chats</span>
          )}
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {convLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-modern p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-32 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="card-modern p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No conversations yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Connect with others to start chatting
              </p>
            </div>
          ) : (
            filteredConversations.map((chat, index) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="card-modern p-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center text-lg font-semibold text-foreground/70">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                    {chat.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-online rounded-full border-2 border-card" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-[15px] truncate">{chat.name}</h3>
                      <span className="text-xs text-muted-foreground/60 ml-2 flex-shrink-0">
                        {new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate pr-8">
                      {chat.lastMessage}
                    </p>
                  </div>
                  
                  {/* Unread Badge */}
                  {chat.unread > 0 && (
                    <Badge className={cn(
                      "h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-semibold",
                      "bg-primary text-primary-foreground"
                    )}>
                      {chat.unread > 99 ? "99+" : chat.unread}
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
