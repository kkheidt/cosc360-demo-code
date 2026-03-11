import type { User } from "@/features/auth/types";

export interface Tweet {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface TweetWithAuthor extends Tweet {
  author: User;
}
