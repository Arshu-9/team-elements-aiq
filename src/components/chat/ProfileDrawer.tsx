import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { User, Bell, Shield, LogOut } from "lucide-react";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  username?: string;
  avatar?: string;
  status: string;
  bio?: string;
}

export const ProfileDrawer = ({
  open,
  onOpenChange,
  name,
  username,
  avatar,
  status,
  bio,
}: ProfileDrawerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass border-l border-border/30 w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Profile</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <Avatar className="w-24 h-24 border-4 border-primary/20">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-2xl">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-semibold text-xl">{name}</h3>
              {username && (
                <p className="text-sm text-muted-foreground">@{username}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>

            {bio && (
              <p className="text-sm text-muted-foreground max-w-sm">{bio}</p>
            )}
          </div>

          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <User className="w-4 h-4" />
              View Full Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Bell className="w-4 h-4" />
              Notification Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Shield className="w-4 h-4" />
              Privacy & Security
            </Button>
          </div>

          <div className="glass rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold">Shared Media</h4>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Block User
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
