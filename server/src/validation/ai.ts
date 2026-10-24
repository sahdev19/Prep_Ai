import { z } from 'zod';

// Schemas for LLM output. Model responses are untrusted until they pass these checks.
const score100 = z.number().min(0).max(100);
const score5 = z.number().min(1).max(5);
const shortList = z.array(z.string().max(300)).max(10);

export const resumeAnalysisOutput = z.object({
  score: score100,
  breakdown: z.array(z.object({ category: z.string().max(60), score: score100, reason: z.string().max(400) })).min(1).max(8),
  strengths: shortList,
  gaps: shortList,
  suggestions: shortList,
});

export const jobMatchOutput = z.object({
  score: score100,
  matchedSkills: shortList,
  missingSkills: shortList,
  suggestions: shortList,
  explanation: z.string().max(800),
});

export const interviewFeedbackOutput = z.object({
  scores: z.object({ clarity: score5, correctness: score5, depth: score5 }),
  strengths: shortList,
  improvements: shortList,
});

export const ragAnswerOutput = z.object({
  sufficientEvidence: z.boolean(),
  answer: z.string().max(4000),
  citedChunkIds: z.array(z.string()).max(8), // must be a subset of retrieved chunk ids; checked in service
});

// Request bodies for AI features
export const startInterviewBody = z.object({
  targetRole: z.string().trim().min(2).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.number().int().min(3).max(10).default(5),
}).strict();

export const answerBody = z.object({ answer: z.string().trim().min(1).max(5000) }).strict();

export const jobMatchBody = z.object({
  resumeId: z.string().regex(/^[a-f\d]{24}$/i),
  jobTitle: z.string().trim().min(2).max(150),
  jobDescription: z.string().trim().min(50).max(8000),
}).strict();

export const askBody = z.object({
  question: z.string().trim().min(3).max(1000),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();
