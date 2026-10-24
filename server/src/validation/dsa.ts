import { z } from 'zod';
import { DSA_TOPICS } from '../models/DsaProblem';
import { objectId, pagination } from './common';

const difficulty = z.enum(['easy', 'medium', 'hard']);
const status = z.enum(['todo', 'attempted', 'solved', 'revisit']);

// Only http(s): a stored "javascript:" URL would become an XSS vector once rendered as a link.
const httpUrl = z
  .string()
  .url()
  .max(500)
  .refine((u) => /^https?:\/\//i.test(u), 'URL must start with http:// or https://');

// Field definitions WITHOUT defaults. Defaults apply only on create; if they were part of the
// update schema, a partial update (e.g. just notes) would silently reset platform and status.
const fields = {
  title: z.string().trim().min(1).max(200),
  platform: z.enum(['leetcode', 'gfg', 'codeforces', 'hackerrank', 'other']),
  url: httpUrl.optional(),
  topic: z.enum(DSA_TOPICS),
  difficulty,
  status,
  notes: z.string().max(2000).optional(),
};

export const createDsaBody = z
  .object({ ...fields, platform: fields.platform.default('other'), status: fields.status.default('todo') })
  .strict();
export const updateDsaBody = z
  .object(fields)
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');
export const dsaIdParams = z.object({ id: objectId });
export const listDsaQuery = pagination.extend({
  topic: z.enum(DSA_TOPICS).optional(),
  difficulty: difficulty.optional(),
  status: status.optional(),
});
