export interface Post {
  id: string;
  userId: string;
  content: string;
  timestamp?: Date;
  likes: number;
  retweets: number;
  replies: number;
  liked: boolean;
  retweeted: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  isFollowing: boolean;
}
