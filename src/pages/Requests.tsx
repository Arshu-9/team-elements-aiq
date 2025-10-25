import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserPlus, Loader2 } from "lucide-react";

interface ConnectionRequest {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: string;
  created_at: string;
  profile: {
    display_name: string;
    avatar_url: string;
    user_id: string;
  };
}

const Requests = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    fetchRequests();

    const channel = supabase
      .channel('connection-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `connected_user_id=eq.${user.id}`,
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data: requestsData, error } = await (supabase as any)
        .from("connections")
        .select("*")
        .eq("connected_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch sender profiles separately
      if (requestsData && requestsData.length > 0) {
        const senderIds = requestsData.map((r: any) => r.user_id);
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, avatar_url, user_id")
          .in("id", senderIds);

        // Combine the data
        const formattedRequests = requestsData.map((request: any) => {
          const profile = profilesData?.find((p: any) => p.id === request.user_id);
          return {
            ...request,
            profile: profile || { display_name: "Unknown", avatar_url: "", user_id: "" }
          };
        });

        setRequests(formattedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await (supabase as any)
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request accepted",
        description: "You are now connected!",
      });

      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await (supabase as any)
        .from("connections")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: "The connection request was declined",
      });

      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Connection Requests" />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {requests.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <UserPlus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No pending requests</h3>
            <p className="text-muted-foreground">
              When someone sends you a connection request, it will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="glass rounded-2xl p-4 flex items-center justify-between hover:border-primary/50 transition-all animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/30">
                    <AvatarImage src={request.profile.avatar_url} />
                    <AvatarFallback>
                      {request.profile.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{request.profile.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {request.profile.user_id}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(request.id)}
                    disabled={processingId === request.id}
                    className="elegant-glow"
                  >
                    {processingId === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Requests;
