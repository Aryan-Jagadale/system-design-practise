import { User } from "@/types/feed";
import { Button } from "@/components/ui/button";

interface WhoToFollowProps {
  users: User[];
  onToggleFollow: (userId: string) => void;
}

const WhoToFollow = ({ users, onToggleFollow }: WhoToFollowProps) => {
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <h2 className="px-4 py-3 text-xl font-bold text-foreground">Who to follow</h2>

      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tweet-hover">
          <div className="h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {user.avatar}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
            <p className="text-sm text-muted-foreground truncate">{user.handle}</p>
          </div>

          <Button
            size="sm"
            variant={user.isFollowing ? "secondary" : "default"}
            className="rounded-full font-bold text-xs px-4"
            onClick={() => onToggleFollow(user.id)}
          >
            {user.isFollowing ? "Following" : "Follow"}
          </Button>
        </div>
      ))}
    </div>
  );
};

export default WhoToFollow;
