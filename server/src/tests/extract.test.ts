import { describe, expect, it } from 'vitest';
import { detectFileType, kindFromMime, MIME } from '../utils/extract';

describe('file type detection uses real bytes', () => {
  it('detects PDF and DOCX signatures', () => {
    expect(detectFileType(Buffer.from('%PDF-1.7 ...'))).toBe('pdf');
    expect(detectFileType(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBe('docx');
  });
  it('rejects executables and text pretending to be documents', () => {
    expect(detectFileType(Buffer.from('MZ\x90\x00 fake exe'))).toBeNull();
    expect(detectFileType(Buffer.from('just some text'))).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
  });
  it('maps MIME types', () => {
    expect(kindFromMime(MIME.pdf)).toBe('pdf');
    expect(kindFromMime('text/plain')).toBeNull();
  });
});
