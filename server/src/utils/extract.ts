import mammoth from 'mammoth';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { AppError } from './AppError';

export type FileKind = 'pdf' | 'docx';
export const MIME: Record<FileKind, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export const kindFromMime = (mime: string): FileKind | null => (mime === MIME.pdf ? 'pdf' : mime === MIME.docx ? 'docx' : null);

// Trust the file's bytes, not the client-declared type or extension.
export function detectFileType(buf: Buffer): FileKind | null {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 3 && buf[3] === 4) return 'docx';
  return null;
}

const unreadable = () =>
  new AppError(422, 'FILE_INVALID', 'We could not read text from this file. Scanned images are not supported; upload a text-based PDF or a .docx.');

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function extractText(buf: Buffer, kind: FileKind): Promise<string> {
  let raw: string;
  try {
    raw = await withTimeout(kind === 'pdf' ? pdf(buf).then((r) => r.text) : mammoth.extractRawText({ buffer: buf }).then((r) => r.value), 20_000);
  } catch {
    throw unreadable();
  }
  const text = raw.replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length < 200) throw unreadable();
  return text.slice(0, 50_000);
}
