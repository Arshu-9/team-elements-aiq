import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { Mail, Calendar, Edit, Shield, LogOut, Copy, Check, IdCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
    return <div className="min-h-screen gradient-animated flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Profile" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="glass rounded-3xl p-6 border-primary/30 elegant-glow text-center">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent elegant-glow mb-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img src={logo} alt="AI-Q" className="w-16 h-16 object-contain" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-1">{profile?.display_name || user.email}</h2>
          <p className="text-muted-foreground">@{profile?.username || user.email?.split('@')[0]}</p>
          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>
          )}
          
          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Verified User</span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <Button 
              size="sm" 
              variant="outline" 
              className="glass border-primary/30"
              onClick={() => navigate("/profile/edit")}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <IdCard className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">User ID</p>
                <code className="text-sm font-mono text-primary">{profile?.user_id}</code>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyUserId}
              >
                {copiedUserId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleSignOut}
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
