import { Router } from 'express';
import { csrfGuard } from '../middleware/csrf';
import { authRouter } from './auth.routes';
import { dsaRouter } from './dsa.routes';
import { meRouter } from './me.routes';
import { resumesRouter } from './resumes.routes';

export const v1 = Router();
v1.use(csrfGuard);
v1.use('/auth', authRouter);
v1.use('/me', meRouter);
v1.use('/dsa', dsaRouter);
v1.use('/resumes', resumesRouter);
