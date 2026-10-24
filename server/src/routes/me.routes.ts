import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getMe, requestDeletion, updateMe } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { clearAuthCookies } from '../utils/cookies';
import { updateProfileBody } from '../validation/auth';
import { ctxOf } from './auth.routes';

export const meRouter = Router();
meRouter.use(authenticate);

meRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ user: await getMe(req.user!.id) });
}));

meRouter.patch('/', validate(updateProfileBody), asyncHandler(async (req, res) => {
  res.json({ user: await updateMe(req.user!.id, req.body) });
}));

meRouter.delete('/', asyncHandler(async (req, res) => {
  await requestDeletion(req.user!.id, ctxOf(req));
  clearAuthCookies(res);
  res.status(202).json({ message: 'Account scheduled for deletion' });
}));
