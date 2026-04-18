import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Feather } from "lucide-react";

interface CreatePostModalProps {
  onPost: (userId: string, content: string) => void;
}

const CreatePostModal = ({ onPost }: CreatePostModalProps) => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!userId.trim() || !content.trim()) return;
    onPost(userId.trim(), content.trim());
    setUserId("");
    setContent("");
    setOpen(false);
  };

  const remaining = 280 - content.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full rounded-full font-bold text-base gap-2">
          <Feather className="h-5 w-5" />
          Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create a post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">User ID</label>
            <Input
              placeholder="e.g. 1, 2, 3..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-background border-border text-foreground"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">What's happening?</label>
            <Textarea
              placeholder="Start typing..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 280))}
              rows={4}
              className="bg-background border-border text-foreground resize-none"
            />
            <p className={`text-xs mt-1 text-right ${remaining < 20 ? "text-like" : "text-muted-foreground"}`}>
              {remaining}
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!userId.trim() || !content.trim()}
            className="w-full rounded-full font-bold"
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
