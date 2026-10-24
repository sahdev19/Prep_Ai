import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProblem, deleteProblem, getStats, listProblems, updateProblem } from '../services/dsa.service';
import { asyncHandler } from '../utils/asyncHandler';
import { createDsaBody, dsaIdParams, listDsaQuery, updateDsaBody } from '../validation/dsa';

export const dsaRouter = Router();
dsaRouter.use(authenticate);

dsaRouter.get('/', validate(listDsaQuery, 'query'), asyncHandler(async (req, res) => {
  res.json(await listProblems(req.user!.id, req.query as never));
}));

// Declared before '/:id' so "stats" is not treated as an id.
dsaRouter.get('/stats', asyncHandler(async (req, res) => {
  res.json(await getStats(req.user!.id));
}));

dsaRouter.post('/', validate(createDsaBody), asyncHandler(async (req, res) => {
  res.status(201).json({ problem: await createProblem(req.user!.id, req.body) });
}));

dsaRouter.patch('/:id', validate(dsaIdParams, 'params'), validate(updateDsaBody), asyncHandler(async (req, res) => {
  res.json({ problem: await updateProblem(req.user!.id, String(req.params.id), req.body) });
}));

dsaRouter.delete('/:id', validate(dsaIdParams, 'params'), asyncHandler(async (req, res) => {
  await deleteProblem(req.user!.id, String(req.params.id));
  res.status(204).end();
}));
