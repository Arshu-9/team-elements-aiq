import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Shield, Bell, Sparkles, Lock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen gradient-animated flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen gradient-animated pb-20 pt-20">
      <TopBar title="Settings" />
      
      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* AI Guardian & Candy AI */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Bot className="w-6 h-6 text-primary elegant-glow-sm" />
            <div>
              <h3 className="font-semibold text-lg">AI Guardian & Candy AI</h3>
              <p className="text-sm text-muted-foreground">Intelligent message analysis & assistance</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="spam-detection" className="text-base">🎣 Spam Detection</Label>
                <p className="text-xs text-muted-foreground">Automatically flag suspicious messages</p>
              </div>
              <Switch id="spam-detection" defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="toxic-filter" className="text-base">😤 Toxic Content Filter</Label>
                <p className="text-xs text-muted-foreground">Filter harmful language and harassment</p>
              </div>
              <Switch id="toxic-filter" defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="auto-translate" className="text-base">🌍 Auto Translate</Label>
                <p className="text-xs text-muted-foreground">Real-time message translation across languages</p>
              </div>
              <Switch id="auto-translate" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="auto-summarize" className="text-base">📝 Auto Summarize</Label>
                <p className="text-xs text-muted-foreground">Condense lengthy conversations and documents</p>
              </div>
              <Switch id="auto-summarize" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="tone-analysis" className="text-base">😊 Tone Analysis</Label>
                <p className="text-xs text-muted-foreground">Analyze message sentiment with emoji labels</p>
              </div>
              <Switch id="tone-analysis" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="space-y-1">
                <Label htmlFor="malware-detection" className="text-base">🦠 Malware Detection</Label>
                <p className="text-xs text-muted-foreground">Scan links and attachments for threats</p>
              </div>
              <Switch id="malware-detection" defaultChecked />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 elegant-glow-sm" />
              <div className="space-y-1">
                <p className="text-sm font-semibold">AI-Powered Protection</p>
                <p className="text-xs text-muted-foreground">
                  Our AI keeps conversations clean, safe, and smart. All analysis happens securely without compromising your privacy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-primary elegant-glow-sm" />
            <div>
              <h3 className="font-semibold text-lg">Privacy & Security</h3>
              <p className="text-sm text-muted-foreground">Your security settings</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="screenshot-protection">Screenshot Protection</Label>
                <p className="text-xs text-muted-foreground">Prevent unauthorized screenshots</p>
              </div>
              <Switch id="screenshot-protection" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="stealth-mode">Stealth & Offline Mode</Label>
                <p className="text-xs text-muted-foreground">P2P encrypted tunnels, local storage when offline</p>
              </div>
              <Switch id="stealth-mode" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="quantum-lock">Quantum File Lock</Label>
                <p className="text-xs text-muted-foreground">QRNG-encrypted attachments with one-time keys</p>
              </div>
              <Switch id="quantum-lock" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="encryption">QRNG Encryption</Label>
                <p className="text-xs text-muted-foreground">Always active • Adaptive key refresh</p>
              </div>
              <Lock className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 mt-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Security Core
            </h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ Quantum-secured encryption (QRNG keys)</li>
              <li>✓ Zero metadata storage (no IPs, timestamps, device info)</li>
              <li>✓ Peer-to-peer architecture with stealth mode</li>
              <li>✓ Adaptive encryption with automatic key rotation</li>
              <li>✓ Offline sync support for true privacy</li>
              <li>✓ Screenshot & screen recording protection</li>
            </ul>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary elegant-glow-sm" />
            <div>
              <h3 className="font-semibold text-lg">Notifications</h3>
              <p className="text-sm text-muted-foreground">Manage your alerts</p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <Switch id="push-notifications" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="session-alerts">Session Alerts</Label>
              <Switch id="session-alerts" defaultChecked />
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
