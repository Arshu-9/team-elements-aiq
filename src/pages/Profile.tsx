import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Calendar, Edit, Shield, LogOut, Copy, Check, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
      }
    };
    
    loadProfile();
  }, [user]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const copyUserId = () => {
    if (profile?.user_id) {
      navigator.clipboard.writeText(profile.user_id);
      setCopiedUserId(true);
      setTimeout(() => setCopiedUserId(false), 2000);
      toast({
        title: "User ID copied",
        description: "Share this ID with others to connect",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft pb-24 pt-20">
      <TopBar title="Profile" />
      
      <div className="max-w-screen-xl mx-auto px-5 py-4 space-y-4">
        {/* Profile Header */}
        <div className="card-modern p-6 text-center animate-fade-in">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl font-bold text-white">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                profile?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-soft">
              <Camera className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold mt-4">{profile?.display_name || user.email}</h2>
          <p className="text-sm text-muted-foreground">@{profile?.username || user.email?.split('@')[0]}</p>
          
          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">{profile.bio}</p>
          )}
          
          <div className="flex items-center justify-center gap-1.5 mt-4 text-primary">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        </div>

        {/* User ID Card */}
        <div 
          className="card-modern p-4 cursor-pointer animate-fade-in"
          onClick={copyUserId}
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your User ID</p>
              <code className="text-sm font-mono text-foreground">{profile?.user_id}</code>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
              {copiedUserId ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="card-modern p-4 space-y-0 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <span className="text-sm font-medium">Personal Information</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 text-primary hover:text-primary/80"
              onClick={() => navigate("/profile/edit")}
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Button>
          </div>

          <div className="divide-y divide-border/50">
            <div className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Mail className="w-4 h-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-foreground/70" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm">{new Date(user.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 animate-fade-in"
          onClick={handleSignOut}
          style={{ animationDelay: '150ms' }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
