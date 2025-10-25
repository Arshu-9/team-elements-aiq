import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Users } from "lucide-react";

interface Participant {
  user_id: string;
  profile?: {
    display_name: string;
    avatar_url?: string;
    status?: string;
  };
}

interface SessionParticipantsProps {
  participants: Participant[];
  creatorId: string;
}

export const SessionParticipants = ({ participants, creatorId }: SessionParticipantsProps) => {
  return (
    <Card className="glass border-primary/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Participants ({participants.length})</h3>
      </div>
      
      <div className="space-y-2">
        {participants.map((participant) => (
          <div key={participant.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
            <Avatar className="w-8 h-8">
              <AvatarImage src={participant.profile?.avatar_url} />
              <AvatarFallback>
                {participant.profile?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {participant.profile?.display_name || "Unknown"}
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    participant.profile?.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {participant.profile?.status || "offline"}
                </span>
              </div>
            </div>
            {participant.user_id === creatorId && (
              <Badge variant="secondary" className="text-xs">Creator</Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
