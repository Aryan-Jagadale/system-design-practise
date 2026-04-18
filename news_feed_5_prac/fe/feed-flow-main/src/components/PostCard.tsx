import { Heart, MessageCircle, Repeat2, Share } from "lucide-react";
import { Post, User } from "@/types/feed";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: Post;
  user: User | undefined;
  onLike: (id: string) => void;
  onRetweet: (id: string) => void;
}

const PostCard = ({ post, user, onLike, onRetweet }: PostCardProps) => {
  const timeAgo = formatDistanceToNow(post?.createdAt, { addSuffix: true });

  return (
    <article className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-tweet-hover cursor-pointer">
      <div className="h-10 w-10 shrink-0 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground">
        {user?.avatar ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground truncate">{user?.name ?? "Unknown"}</span>
          <span className="text-muted-foreground truncate">{user?.handle}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground whitespace-nowrap">{timeAgo}</span>
        </div>

        <p className="mt-1 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">{post.content}</p>

        <div className="mt-3 flex items-center justify-between max-w-md">
          <ActionButton icon={MessageCircle} count={post.replies} />
          <ActionButton icon={Repeat2} count={post.retweets} active={post.retweeted} activeClass="text-retweet" onClick={() => onRetweet(post.id)} />
          <ActionButton icon={Heart} count={post.likes} active={post.liked} activeClass="text-like" filled={post.liked} onClick={() => onLike(post.id)} />
          <ActionButton icon={Share} />
        </div>
      </div>
    </article>
  );
};

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string; fill?: string }>;
  count?: number;
  active?: boolean;
  activeClass?: string;
  filled?: boolean;
  onClick?: () => void;
}

const ActionButton = ({ icon: Icon, count, active, activeClass, filled, onClick }: ActionButtonProps) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className={`group flex items-center gap-1.5 text-sm transition-colors ${active ? activeClass : "text-muted-foreground hover:text-primary"}`}
  >
    <Icon className="h-[18px] w-[18px]" fill={filled ? "currentColor" : "none"} />
    {count !== undefined && count > 0 && <span>{count}</span>}
  </button>
);

export default PostCard;
