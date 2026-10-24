export const TOPICS = {
  arrays: 'Arrays', strings: 'Strings', 'linked-list': 'Linked list', 'stack-queue': 'Stack and queue',
  trees: 'Trees', graphs: 'Graphs', dp: 'Dynamic programming', greedy: 'Greedy', recursion: 'Recursion',
  'sorting-searching': 'Sorting and searching', hashing: 'Hashing', other: 'Other',
} as const;
export const DIFFICULTIES = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;
export const STATUSES = { todo: 'To do', attempted: 'Attempted', solved: 'Solved', revisit: 'Revisit' } as const;
export const PLATFORMS = { leetcode: 'LeetCode', gfg: 'GeeksforGeeks', codeforces: 'Codeforces', hackerrank: 'HackerRank', other: 'Other' } as const;

export type Topic = keyof typeof TOPICS;
export type Difficulty = keyof typeof DIFFICULTIES;
export type Status = keyof typeof STATUSES;
export type Platform = keyof typeof PLATFORMS;

export interface User { id: string; email: string; name: string; role: 'user' | 'admin' }
export interface Problem {
  id: string; title: string; platform: Platform; url: string | null;
  topic: Topic; difficulty: Difficulty; status: Status;
}
export interface ProblemList { items: Problem[]; page: number; limit: number; total: number }
export interface Stats {
  total: number; solved: number;
  byStatus: Record<Status, number>;
  byDifficulty: Record<Difficulty, { total: number; solved: number }>;
  byTopic: { topic: Topic; total: number; solved: number }[];
}

export interface ResumeItem {
  id: string; originalName: string; sizeBytes: number; createdAt: string;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed'; errorCode: string | null;
  analysis: null | {
    score: number; strengths: string[]; gaps: string[]; suggestions: string[]; disclaimer: string;
    breakdown: { category: string; score: number; reason: string }[];
  };
}
