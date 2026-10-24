import { getLlm } from '../ai/llm';
import { buildResumeUser, RESUME_SYSTEM } from '../ai/prompts';
import { Resume } from '../models';
import { addTokens } from '../services/quota';
import { getStorage } from '../storage';
import { extractText, kindFromMime } from '../utils/extract';
import { resumeAnalysisOutput } from '../validation/ai';

export async function handleResumeAnalysis(payload: { resumeId: string }) {
  const resume = await Resume.findById(payload.resumeId).select('+extractedText');
  if (!resume) return; // deleted while queued
  resume.status = 'processing';
  await resume.save();

  if (!resume.extractedText) {
    const kind = kindFromMime(resume.mimeType) ?? 'pdf';
    resume.extractedText = await extractText(await getStorage().get(resume.storageKey), kind);
    await resume.save();
  }

  const llm = getLlm();
  const { data, usage } = await llm.completeJson({
    system: RESUME_SYSTEM,
    user: buildResumeUser(resume.extractedText),
    schema: resumeAnalysisOutput,
    maxTokens: 1500,
  });
  resume.analysis = { ...data, model: llm.modelName, analyzedAt: new Date() } as never;
  resume.status = 'analyzed';
  resume.errorCode = undefined;
  await resume.save();
  await addTokens(String(resume.userId), usage.inputTokens + usage.outputTokens).catch(() => undefined);
}
