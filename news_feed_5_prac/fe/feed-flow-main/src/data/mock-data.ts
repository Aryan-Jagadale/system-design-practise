import { Post, User } from "@/types/feed";

export const USERS: User[] = [
  { id: "1", name: "Ada Lovelace", handle: "@ada", avatar: "AL", bio: "First programmer. Analytical engine enthusiast.", isFollowing: false },
  { id: "2", name: "Alan Turing", handle: "@turing", avatar: "AT", bio: "Can machines think? Working on it.", isFollowing: false },
  { id: "3", name: "Grace Hopper", handle: "@gracehopper", avatar: "GH", bio: "Bug hunter. Compiler creator. Navy Admiral.", isFollowing: true },
  { id: "4", name: "Linus Torvalds", handle: "@linus", avatar: "LT", bio: "I talk mass-storage not fashion.", isFollowing: false },
  { id: "5", name: "Margaret Hamilton", handle: "@margaret", avatar: "MH", bio: "Software engineering is a thing now.", isFollowing: true },
];

export const INITIAL_POSTS: Post[] = [
  { id: "p1", userId: "3", content: "Just found a moth in the Mark II. Literally debugging. 🦗", timestamp: new Date(Date.now() - 3600000), likes: 42, retweets: 12, replies: 5, liked: false, retweeted: false },
  { id: "p2", userId: "2", content: "Sometimes it is the people no one imagines anything of who do the things that no one can imagine.", timestamp: new Date(Date.now() - 7200000), likes: 128, retweets: 56, replies: 18, liked: true, retweeted: false },
  { id: "p3", userId: "5", content: "There was no choice but to be pioneers. We wrote the code that took humans to the moon. 🌕🚀", timestamp: new Date(Date.now() - 14400000), likes: 301, retweets: 89, replies: 24, liked: false, retweeted: true },
  { id: "p4", userId: "1", content: "The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers and leaves.", timestamp: new Date(Date.now() - 28800000), likes: 95, retweets: 33, replies: 7, liked: false, retweeted: false },
  { id: "p5", userId: "4", content: "Talk is cheap. Show me the code.", timestamp: new Date(Date.now() - 43200000), likes: 512, retweets: 200, replies: 44, liked: true, retweeted: true },
];
