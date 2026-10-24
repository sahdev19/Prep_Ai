import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { deleteResume, getResume, listResumes, uploadResume } from '../services/resume.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { MIME } from '../utils/extract';
import { idParams, pagination } from '../validation/common';
import { ctxOf } from './auth.routes';

const ALLOWED = new Set(Object.values(MIME));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.has(file.mimetype) ? cb(null, true) : cb(new AppError(400, 'FILE_INVALID', 'Upload a PDF or Word (.docx) file.')),
});

export const resumesRouter = Router();
resumesRouter.use(authenticate);

resumesRouter.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'Attach a file in the "file" field.');
  res.status(202).json({ resume: await uploadResume(req.user!.id, req.file, ctxOf(req)) });
}));

resumesRouter.get('/', validate(pagination, 'query'), asyncHandler(async (req, res) => {
  res.json(await listResumes(req.user!.id, req.query as never));
}));

resumesRouter.get('/:id', validate(idParams, 'params'), asyncHandler(async (req, res) => {
  res.json({ resume: await getResume(req.user!.id, String(req.params.id)) });
}));

resumesRouter.delete('/:id', validate(idParams, 'params'), asyncHandler(async (req, res) => {
  await deleteResume(req.user!.id, String(req.params.id), ctxOf(req));
  res.status(204).end();
}));
