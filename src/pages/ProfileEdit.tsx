import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Sparkles, Loader2, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const defaultAvatarOptions = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
];

const ProfileEdit = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiStyle, setAiStyle] = useState("professional");
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [aiGeneratedAvatar, setAiGeneratedAvatar] = useState<string | null>(null);
  
  const avatarOptions = aiGeneratedAvatar 
    ? [aiGeneratedAvatar, ...defaultAvatarOptions]
    : defaultAvatarOptions;

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
        setDisplayName(data.display_name || "");
        setUsername(data.username || "");
        setBio(data.bio || "");
        setSelectedAvatar(data.avatar_url || avatarOptions[0]);
        setUserId(data.user_id || "");
      }
    };
    
    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          display_name: displayName,
          username: username,
          bio: bio,
          avatar_url: selectedAvatar,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      navigate("/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAIAvatar = async () => {
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-profile-pic", {
        body: { style: aiStyle },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setAiGeneratedAvatar(data.imageUrl);
        setSelectedAvatar(data.imageUrl);
        toast({
          title: "Avatar generated!",
          description: "Your AI profile picture is ready and added to selection",
        });
      }
    } catch (error) {
      console.error("Error generating AI avatar:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI avatar",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
    toast({
      title: "User ID copied",
      description: "Share this ID with others to connect",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen gradient-animated flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Edit Profile" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="glass border-primary/30"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        {/* User ID Display */}
        <div className="glass rounded-3xl p-6">
          <Label className="mb-3 block">Your User ID</Label>
          <div className="flex items-center gap-2 p-3 glass rounded-xl border border-primary/30">
            <code className="flex-1 text-lg font-mono text-primary">{userId}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyUserId}
            >
              {copiedUserId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this ID with others so they can send you connection requests
          </p>
        </div>

        {/* AI Avatar Generation */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>AI Generated Avatar</Label>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex gap-3">
            <Select value={aiStyle} onValueChange={setAiStyle}>
              <SelectTrigger className="glass border-primary/30 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="artistic">Artistic</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="futuristic">Futuristic</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerateAIAvatar}
              disabled={generatingAI}
              className="elegant-glow"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <Label>Choose Avatar or Use AI Generated</Label>
          <div className="grid grid-cols-4 gap-4">
            {avatarOptions.map((avatar, index) => (
              <button
                key={index}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                  selectedAvatar === avatar
                    ? "border-primary elegant-glow scale-105"
                    : "border-primary/20 hover:border-primary/50"
                }`}
              >
                <img
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedAvatar === avatar && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Info */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="glass border-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="glass border-primary/30"
            />
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              className="glass border-primary/30 min-h-[100px]"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          className="w-full elegant-glow"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfileEdit;
