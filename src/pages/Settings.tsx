import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Shield, Bell, Moon, ChevronRight, Lock, Sparkles, Eye, Globe, FileText, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [candyAiEnabled, setCandyAiEnabled] = useState(() => {
    const saved = localStorage.getItem("candyAiEnabled");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleCandyAiToggle = (checked: boolean) => {
    setCandyAiEnabled(checked);
    localStorage.setItem("candyAiEnabled", JSON.stringify(checked));
    toast({
      title: checked ? "Candy AI enabled" : "Candy AI disabled",
    });
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
    toast({
      title: checked ? "Dark mode enabled" : "Light mode enabled",
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    description, 
    checked, 
    onCheckedChange,
    className
  }: { 
    icon: any; 
    label: string; 
    description?: string; 
    checked?: boolean; 
    onCheckedChange?: (checked: boolean) => void;
    className?: string;
  }) => (
    <div className={cn("flex items-center justify-between py-3", className)}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
        <div>
          <Label className="text-[15px] font-medium cursor-pointer">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {onCheckedChange && (
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      )}
    </div>
  );

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card-modern p-4 animate-fade-in">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{title}</h3>
      <div className="divide-y divide-border/50">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-soft pb-24 pt-20">
      <TopBar title="Settings" />
      
      <div className="max-w-screen-xl mx-auto px-5 py-4 space-y-4">
        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingItem
            icon={Moon}
            label="Dark Mode"
            description="Switch to dark theme"
            checked={darkMode}
            onCheckedChange={handleDarkModeToggle}
          />
        </SettingSection>

        {/* AI Features */}
        <SettingSection title="AI Features">
          <SettingItem
            icon={Bot}
            label="Candy AI Assistant"
            description="Show AI assistant in chats"
            checked={candyAiEnabled}
            onCheckedChange={handleCandyAiToggle}
          />
          <SettingItem
            icon={Zap}
            label="Spam Detection"
            description="Automatically flag suspicious messages"
            checked={true}
            onCheckedChange={() => {}}
          />
          <SettingItem
            icon={Eye}
            label="Toxic Content Filter"
            description="Filter harmful language"
            checked={true}
            onCheckedChange={() => {}}
          />
          <SettingItem
            icon={Globe}
            label="Auto Translate"
            description="Real-time message translation"
            checked={false}
            onCheckedChange={() => {}}
          />
          <SettingItem
            icon={FileText}
            label="Auto Summarize"
            description="Condense lengthy conversations"
            checked={false}
            onCheckedChange={() => {}}
          />
        </SettingSection>

        {/* Security */}
        <SettingSection title="Privacy & Security">
          <SettingItem
            icon={Shield}
            label="Screenshot Protection"
            description="Prevent unauthorized screenshots"
            checked={true}
            onCheckedChange={() => {}}
          />
          <SettingItem
            icon={Lock}
            label="QRNG Encryption"
            description="Quantum-secured encryption"
            checked={true}
            onCheckedChange={() => {}}
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingItem
            icon={Bell}
            label="Push Notifications"
            description="Get notified of new messages"
            checked={true}
            onCheckedChange={() => {}}
          />
        </SettingSection>

        {/* Info Card */}
        <div className="card-modern p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">AI-Powered Protection</p>
              <p className="text-xs text-muted-foreground mt-1">
                All analysis happens securely without compromising your privacy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
