import Logo from "@/components/Logo";

interface TopBarProps {
  title: string;
  rightElement?: React.ReactNode;
}

const TopBar = ({ title, rightElement }: TopBarProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-border/50">
      <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {rightElement}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
