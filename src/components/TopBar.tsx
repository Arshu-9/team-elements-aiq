import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface TopBarProps {
  title: string;
  rightElement?: React.ReactNode;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
}

const TopBar = ({ title, rightElement, showSearch = false, onSearch }: TopBarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-soft">
      <div className="max-w-screen-xl mx-auto px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          
          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="relative">
                {searchOpen ? (
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onBlur={() => !searchQuery && setSearchOpen(false)}
                    className="w-48 h-9 text-sm bg-secondary/50 border-0 rounded-xl animate-scale-in"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-2 rounded-xl hover:bg-secondary transition-smooth"
                  >
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
            {rightElement}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
