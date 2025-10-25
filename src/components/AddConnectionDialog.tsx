import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export const AddConnectionDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, user_id, display_name, username, avatar_url")
        .eq("user_id", searchQuery.toUpperCase())
        .single();

      if (error || !data) {
        toast({
          title: "User not found",
          description: "No user found with this ID",
          variant: "destructive",
        });
        setSearchResult(null);
      } else if (data.id === user?.id) {
        toast({
          title: "Cannot add yourself",
          description: "You cannot send a connection request to yourself",
          variant: "destructive",
        });
        setSearchResult(null);
      } else {
        setSearchResult(data);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: "Failed to search for user",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult || !user) return;

    setSending(true);
    try {
      // Check if connection already exists (both directions)
      const { data: existingOut } = await (supabase as any)
        .from("connections")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("connected_user_id", searchResult.id)
        .maybeSingle();

      const { data: existingIn } = await (supabase as any)
        .from("connections")
        .select("id, status")
        .eq("user_id", searchResult.id)
        .eq("connected_user_id", user.id)
        .maybeSingle();

      const existing = existingOut || existingIn;

      if (existing) {
        toast({
          title: "Connection exists",
          description: existing.status === "pending" 
            ? "You already have a pending request with this user"
            : "You are already connected with this user",
          variant: "destructive",
        });
        return;
      }

      // Send connection request
      const { error } = await (supabase as any)
        .from("connections")
        .insert({
          user_id: user.id,
          connected_user_id: searchResult.id,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request sent",
        description: `Connection request sent to ${searchResult.display_name}`,
      });

      setOpen(false);
      setSearchQuery("");
      setSearchResult(null);
    } catch (error) {
      console.error("Send request error:", error);
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="glass border-primary/30">
          <UserPlus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle>Add Connection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter User ID (e.g., ABC12345)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="glass border-primary/30"
              maxLength={8}
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {searchResult && (
            <div className="glass rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent elegant-glow-sm" />
                <div>
                  <h3 className="font-semibold">{searchResult.display_name}</h3>
                  <p className="text-sm text-muted-foreground">@{searchResult.username}</p>
                  <p className="text-xs text-muted-foreground">ID: {searchResult.user_id}</p>
                </div>
              </div>
              <Button 
                className="w-full elegant-glow" 
                onClick={handleSendRequest}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Connection Request
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};