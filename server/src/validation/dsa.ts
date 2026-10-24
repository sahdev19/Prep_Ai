import { z } from 'zod';
import { DSA_TOPICS } from '../models/DsaProblem';
import { pagination } from './common';

const base = {
  title: z.string().trim().min(1).max(200),
  platform: z.enum(['leetcode', 'gfg', 'codeforces', 'hackerrank', 'other']).default('other'),
  url: z.string().url().max(500).optional(),
  topic: z.enum(DSA_TOPICS),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  status: z.enum(['todo', 'attempted', 'solved', 'revisit']).default('todo'),
  notes: z.string().max(2000).optional(),
};

export const createDsaBody = z.object(base).strict();
export const updateDsaBody = z.object(base).partial().strict();
export const listDsaQuery = pagination.extend({
  topic: z.enum(DSA_TOPICS).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['todo', 'attempted', 'solved', 'revisit']).optional(),
});
