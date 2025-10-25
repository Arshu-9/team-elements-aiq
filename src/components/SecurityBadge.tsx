import logo from "@/assets/logo.png";

const SecurityBadge = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-primary/30 elegant-glow-sm">
      <img src={logo} alt="AI-Q" className="w-4 h-4 object-contain" />
      <span className="text-xs font-medium text-primary">Secure</span>
    </div>
  );
};

export default SecurityBadge;
