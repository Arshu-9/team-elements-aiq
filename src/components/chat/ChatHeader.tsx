import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  status: "online" | "offline" | "typing";
  subtitle?: string;
  modeBadge?: {
    label: string;
    color: "gray" | "blue" | "red";
  };
  onBack: () => void;
  onOpenProfile: () => void;
}

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  typing: "bg-orange-500",
};

const modeBadgeColors = {
  gray: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
};

export const ChatHeader = ({
  name,
  avatar,
  status,
  subtitle,
  modeBadge,
  onBack,
  onOpenProfile,
}: ChatHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30 backdrop-blur-xl">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full hover:bg-accent transition-smooth"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-3 hover:bg-accent/50 rounded-xl px-2 py-1 transition-smooth"
          >
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage src={avatar} alt={name} />
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${statusColors[status]} transition-smooth`}
              />
            </div>

            <div className="text-left">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm">{name}</h2>
                {modeBadge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      modeBadgeColors[modeBadge.color]
                    } transition-smooth`}
                  >
                    {modeBadge.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {status === "typing" ? "typing..." : subtitle || status}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent transition-smooth"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-accent transition-smooth"
          >
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-accent transition-smooth"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border/30">
              <DropdownMenuItem onClick={onOpenProfile}>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search Messages</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
