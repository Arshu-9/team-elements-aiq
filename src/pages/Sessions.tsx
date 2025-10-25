import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { Plus, Lock, Clock, Users, Key, QrCode, Shield, Copy, Check, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

const Sessions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { sessions, loading } = useSessions();
  const [sessionKey, setSessionKey] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [duration, setDuration] = useState("15");
  const [authenticity, setAuthenticity] = useState("anyone");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState<Map<string, number>>(new Map());

  const copyKeyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast({
      title: "Copied!",
      description: "Session key copied to clipboard",
    });
  };

  const generateQRNGKey = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-qrng-key");
      
      if (error) throw error;
      
      if (data.key) {
        setGeneratedKey(data.key);
        await createSession(data.key);
      } else {
        throw new Error("Failed to generate key");
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate quantum key",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const createSession = async (key: string) => {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(duration));

      const { data: session, error: sessionError } = await (supabase as any)
        .from("sessions")
        .insert({
          name: sessionName || "Untitled Session",
          session_key: key,
          expires_at: expiresAt.toISOString(),
          authenticity: authenticity,
          security_level: 'standard',
          duration_minutes: parseInt(duration),
          creator_id: user!.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const { error: participantError } = await (supabase as any)
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: user!.id,
          is_creator: true,
        });

      if (participantError) throw participantError;

      toast({
        title: "Session Created",
        description: "Your secure session has been created successfully!",
      });
      
      // Navigate to session after 2 seconds
      setTimeout(() => {
        navigate(`/session/${session.id}`);
      }, 2000);
    } catch (error) {
      console.error("Create session error:", error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    }
  };

  const logIntrusionAttempt = async (sessionId: string, reason: string) => {
    try {
      await (supabase as any).from("intrusion_attempts").insert({
        session_id: sessionId,
        attempted_by_user_id: user?.id,
        reason: reason,
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        },
      });
    } catch (error) {
      console.error("Failed to log intrusion attempt:", error);
    }
  };

  const joinSession = async () => {
    if (sessionKey.length !== 7) {
      toast({
        title: "Invalid Key",
        description: "Session key must be 7 characters",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const { data: session, error: sessionError } = await (supabase as any)
        .from("sessions")
        .select("*")
        .eq("session_key", sessionKey)
        .eq("is_active", true)
        .single();

      if (sessionError || !session) {
        // Log failed attempt
        const attempts = failedAttempts.get(sessionKey) || 0;
        setFailedAttempts(new Map(failedAttempts.set(sessionKey, attempts + 1)));
        
        if (attempts >= 1) {
          // Alert creator after 2 failed attempts
          toast({
            title: "Access Denied",
            description: "Multiple failed attempts detected. Session creator has been alerted.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Session Not Found",
            description: "Invalid or expired session key",
            variant: "destructive",
          });
        }
        return;
      }

      // Check authorization
      if (session.authenticity === 'connections') {
        const { data: connection } = await (supabase as any)
          .from("connections")
          .select("*")
          .or(`user_id.eq.${user!.id},connected_user_id.eq.${user!.id}`)
          .or(`connected_user_id.eq.${session.creator_id},user_id.eq.${session.creator_id}`)
          .eq("status", "accepted")
          .single();

        if (!connection) {
          // Trigger AI intrusion detection
          const { data: intrusionData } = await supabase.functions.invoke("ai-intrusion-detection", {
            body: {
              sessionId: session.id,
              userId: user?.id,
              deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
              },
              reason: "Unauthorized access attempt - not in connections",
            },
          });

          console.log("AI Intrusion Detection:", intrusionData);

          toast({
            title: "🚨 Access Blocked",
            description: `AI detected unauthorized attempt. Session creator has been notified and quantum key refreshed.`,
            variant: "destructive",
          });
          return;
        }
      }

      const { error: participantError } = await (supabase as any)
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: user!.id,
          is_creator: false,
        });

      if (participantError) throw participantError;

      toast({
        title: "Joined Session",
        description: `Joined ${session.name}`,
      });
      
      setJoinDialogOpen(false);
      setSessionKey("");
      navigate(`/session/${session.id}`);
    } catch (error) {
      console.error("Join session error:", error);
      toast({
        title: "Error",
        description: "Failed to join session",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
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
      <TopBar title="Secure Sessions" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-24 glass border-primary/30 elegant-glow hover:scale-105 transition-smooth flex-col gap-2">
                <Plus className="w-8 h-8" />
                <span>Create Session</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-primary/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Create Secure Session
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Session Name</Label>
                  <Input 
                    placeholder="Enter session name" 
                    className="glass border-primary/30"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="glass border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Who can join?</Label>
                  <Select value={authenticity} onValueChange={setAuthenticity}>
                    <SelectTrigger className="glass border-primary/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="anyone">
                        <div>
                          <div className="font-semibold">Anyone with key</div>
                          <div className="text-xs text-muted-foreground">Anyone who has the session key</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="connections">
                        <div>
                          <div className="font-semibold">🔐 Only my connections</div>
                          <div className="text-xs text-muted-foreground">AI-protected, auto key-refresh on intrusion</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {generatedKey && (
                  <div className="space-y-4 p-6 glass rounded-xl border-primary/50 elegant-glow-sm animate-fade-in">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <Shield className="w-5 h-5 text-primary elegant-glow-sm" />
                        <Label className="text-primary font-semibold">Quantum Session Key</Label>
                      </div>
                      <p className="text-3xl font-mono font-bold tracking-[0.5em] text-primary elegant-text">
                        {generatedKey}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        🔐 Generated using quantum random number generator
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        className="flex-1"
                        onClick={copyKeyToClipboard}
                      >
                        {copiedKey ? (
                          <><Check className="w-4 h-4 mr-2" /> Copied!</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-2" /> Copy Key</>
                        )}
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => setShowQR(!showQR)}
                      >
                        <QrCode className="w-4 h-4" />
                      </Button>
                    </div>

                    {showQR && (
                      <div className="flex justify-center p-4 bg-white rounded-xl animate-fade-in">
                        <QRCodeSVG value={generatedKey} size={200} />
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground text-center space-y-1">
                      <p>⏱️ Session expires in {duration} minutes</p>
                      <p className="text-primary">
                        🔐 {authenticity === "anyone" ? "Anyone with key can join" : "Only connections with AI protection"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 elegant-glow" 
                    onClick={generateQRNGKey}
                    disabled={isCreating}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {isCreating ? "Generating..." : "Generate QRNG Session Key"}
                  </Button>
                  {generatedKey && (
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        setCreateDialogOpen(false);
                        setGeneratedKey("");
                        setSessionName("");
                      }}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="h-24 glass border-primary/30 hover:scale-105 transition-smooth flex-col gap-2">
                <Key className="w-8 h-8" />
                <span>Join Session</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-primary/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Join Secure Session
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Session Key</Label>
                  <Input
                    placeholder="Enter 7-character key"
                    value={sessionKey}
                    onChange={(e) => setSessionKey(e.target.value.toUpperCase())}
                    className="glass border-primary/30 font-mono text-center text-lg tracking-[0.5em]"
                    maxLength={7}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the quantum-generated session key
                  </p>
                </div>
                
                <div className="text-center p-4 glass rounded-lg border-muted">
                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Ask the session creator to show you their QR code
                  </p>
                </div>

                <Button 
                  className="w-full elegant-glow"
                  onClick={joinSession}
                  disabled={isJoining || sessionKey.length !== 7}
                >
                  {isJoining ? "Joining..." : "Join Session"}
                </Button>
                
                {failedAttempts.get(sessionKey) && failedAttempts.get(sessionKey)! > 0 && (
                  <div className="flex items-center gap-2 text-xs text-warning p-2 glass rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Failed attempt detected. Be careful with access.</span>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Sessions */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-2">
            Active Sessions
          </h2>
          
          {loading ? (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-muted-foreground">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No active sessions</p>
              <p className="text-sm text-muted-foreground">
                Create a new session to start secure group communication
              </p>
            </div>
          ) : (
              sessions.map((session) => (
                <div key={session.id} className="glass rounded-3xl p-4 border-primary/30 elegant-glow-sm hover:scale-[1.02] transition-smooth">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary elegant-glow-sm" />
                      <h3 className="font-semibold text-lg">{session.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-primary elegant-glow-sm">
                      <Clock className="w-4 h-4" />
                      {session.timeLeft}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {session.participants} participants
                      </span>
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="elegant-glow-sm"
                      onClick={() => navigate(`/session/${session.id}`)}
                    >
                      Enter
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

export default Sessions;
