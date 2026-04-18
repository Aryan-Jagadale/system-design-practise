import { useState, useEffect } from "react";
import { Post, User } from "@/types/feed";
import { USERS, INITIAL_POSTS } from "@/data/mock-data";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import WhoToFollow from "@/components/WhoToFollow";
import { Hash, Home, Bell, Mail, Search } from "lucide-react";

const Index = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>(USERS);
  const apiBaseUrl = 'https://tjev7xpx95.execute-api.ap-south-1.amazonaws.com';
  const postsEndpoint = `${apiBaseUrl}/posts`;
  console.log("API Base URL:", apiBaseUrl);

  const handlePost = (userId: string, content: string) => {
    const newPost: Post = {
      id: `p${Date.now()}`,
      userId,
      content,
      createdAt: new Date(),
      likes: 0,
      retweets: 0,
      replies: 0,
      liked: false,
      retweeted: false,
    };
    const payload = {
      content,
      "creatorId": userId
    }

    const response = fetch(postsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    console.log("Post response:", response);

    setPosts([newPost, ...posts]);
  };

  const handleLike = (id: string) => {
    setPosts(posts.map((p) =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handleRetweet = (id: string) => {
    setPosts(posts.map((p) =>
      p.id === id ? { ...p, retweeted: !p.retweeted, retweets: p.retweeted ? p.retweets - 1 : p.retweets + 1 } : p
    ));
  };

  const toggleFollow = (userId: string) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, isFollowing: !u.isFollowing } : u)));
  };

  const getUserById = (id: string) => users.find((u) => u.id === id);

  const navItems = [
    { icon: Home, label: "Home" },
    { icon: Search, label: "Explore" },
    { icon: Bell, label: "Notifications" },
    { icon: Mail, label: "Messages" },
    { icon: Hash, label: "Trending" },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${apiBaseUrl}/feed?userId=user_Rohan456`);
        const json = await res.json();
        console.log("Fetched posts:", json);
        setPosts(json.posts);
      } catch (err) {
        console.error(err);
      }
    }

    fetchData();
  }, [])


  return (
    <div className="min-h-screen bg-background flex justify-center">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex flex-col items-end w-[275px] px-3 py-4 sticky top-0 h-screen">
        <div className="flex flex-col gap-1 w-full max-w-[230px]">
          <div className="p-3 mb-2">
            <span className="text-2xl font-bold text-primary">𝕏</span>
          </div>

          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-4 px-4 py-3 rounded-full text-foreground text-lg hover:bg-secondary transition-colors"
            >
              <Icon className="h-6 w-6" />
              <span className="hidden xl:inline">{label}</span>
            </button>
          ))}

          <div className="mt-4">
            <CreatePostModal onPost={handlePost} />
          </div>
        </div>
      </aside>

      {/* Main Feed */}
      <main className="w-full max-w-[600px] border-x border-border min-h-screen">
        <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
          <h1 className="text-xl font-bold text-foreground">Home</h1>
        </header>

        {/* Mobile post button */}
        <div className="lg:hidden px-4 py-3 border-b border-border">
          <CreatePostModal onPost={handlePost} />
        </div>

        <div>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              user={getUserById(post.userId)}
              onLike={handleLike}
              onRetweet={handleRetweet}
            />
          ))}
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden lg:block w-[350px] px-6 py-4 sticky top-0 h-screen">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search"
              className="w-full rounded-full bg-secondary border-none py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <WhoToFollow users={users} onToggleFollow={toggleFollow} />
        </div>
      </aside>
    </div>
  );
};

export default Index;
