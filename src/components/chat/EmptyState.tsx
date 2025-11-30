import { MessageCircle } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState = ({
  title = "Start your private conversation",
  description = "Your messages are end-to-end encrypted. No one else can read them.",
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <div className="glass rounded-full p-8 mb-6 animate-fade-in">
        <MessageCircle className="w-16 h-16 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md animate-fade-in" style={{ animationDelay: "200ms" }}>
        {description}
      </p>
    </div>
  );
};
