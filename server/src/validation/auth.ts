import { z } from 'zod';

export const registerBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, 'Use at least 10 characters').max(128),
  name: z.string().trim().min(1).max(100),
});

export const loginBody = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    targetRole: z.string().trim().max(100),
    college: z.string().trim().max(150),
    graduationYear: z.number().int().min(2000).max(2100),
  })
  .partial()
  .strict();
