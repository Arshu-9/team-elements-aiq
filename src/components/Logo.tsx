import logo from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex items-center gap-3">
      <img 
        src={logo} 
        alt="AI-Q Logo" 
        className={`${sizeClasses[size]} object-contain elegant-glow-sm`}
      />
      {showText && (
        <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          AI-Q
        </span>
      )}
    </div>
  );
};

export default Logo;
