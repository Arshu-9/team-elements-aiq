import { MessageSquare, Users, Shield, User, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: MessageSquare, label: "Chats", path: "/" },
    { icon: Users, label: "Connections", path: "/connections" },
    { icon: Shield, label: "Sessions", path: "/sessions" },
    { icon: User, label: "Profile", path: "/profile" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-soft border-t border-border/30">
      <div className="max-w-screen-xl mx-auto px-2">
        <div className="flex justify-around items-center py-2">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-smooth",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-scale-in")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-card/80" />
    </nav>
  );
};

export default BottomNav;
