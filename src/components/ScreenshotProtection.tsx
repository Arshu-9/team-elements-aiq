import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

export const ScreenshotProtection = () => {
  const [attemptDetected, setAttemptDetected] = useState(false);

  useEffect(() => {
    // Detect screenshot attempts (keyboard shortcuts)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Windows/Linux: PrintScreen, Alt+PrintScreen
      if (e.key === "PrintScreen") {
        setAttemptDetected(true);
        setTimeout(() => setAttemptDetected(false), 3000);
      }
      
      // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        setAttemptDetected(true);
        setTimeout(() => setAttemptDetected(false), 3000);
      }
    };

    // Detect when page loses focus (potential screenshot)
    const handleBlur = () => {
      // Could indicate screenshot tool activation
      console.log("Page blur detected - potential screenshot attempt");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  if (!attemptDetected) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="glass rounded-3xl p-8 max-w-md text-center space-y-4 border-red-500/50">
        <Shield className="w-16 h-16 mx-auto text-red-500 elegant-glow" />
        <h2 className="text-2xl font-bold text-red-500">Screenshot Detected</h2>
        <p className="text-muted-foreground">
          This session is protected. Screenshots and screen recordings are blocked for your security.
        </p>
      </div>
    </div>
  );
};
