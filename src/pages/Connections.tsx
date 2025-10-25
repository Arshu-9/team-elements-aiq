import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useConnections";
import { AddConnectionDialog } from "@/components/AddConnectionDialog";
import { Search, Check, X, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Connections = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { connections, requests, loading, acceptRequest, rejectRequest } = useConnections();

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(requestId);
      toast({
        title: "Connection accepted",
        description: "You are now connected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest(requestId);
      toast({
        title: "Request rejected",
        description: "Connection request has been rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return <div className="min-h-screen gradient-animated flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Connections" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            className="pl-10 glass border-primary/30"
          />
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">
              Pending Requests ({requests.length})
            </h2>
            
            {requests.map((request) => (
              <div key={request.id} className="glass rounded-3xl p-4 border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{request.name}</h3>
                    <p className="text-sm text-muted-foreground">@{request.username}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="elegant-glow-sm"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="glass"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connections List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              My Connections ({connections.length})
            </h2>
            <AddConnectionDialog />
          </div>
          
          {loading ? (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-muted-foreground">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No connections yet</p>
              <p className="text-sm text-muted-foreground">
                Start connecting with others to build your network
              </p>
            </div>
          ) : (
            connections.map((connection) => (
              <div key={connection.id} className="glass rounded-3xl p-4 hover:scale-[1.02] transition-smooth cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent elegant-glow-sm" />
                      {connection.status === "online" && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{connection.name}</h3>
                      <p className="text-sm text-muted-foreground">@{connection.username}</p>
                    </div>
                  </div>
                  
                  <Button size="sm" variant="secondary" className="glass">
                    Message
                  </Button>
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

export default Connections;
