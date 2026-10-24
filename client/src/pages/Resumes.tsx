import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errMsg } from '../api';
import { Bar } from '../components';
import type { ResumeItem } from '../constants';

const MAX_BYTES = 5 * 1024 * 1024;
const STATUS_TEXT: Record<ResumeItem['status'], string> = {
  uploaded: 'Waiting to start', processing: 'Analyzing', analyzed: 'Analyzed', failed: 'Failed',
};
const FAIL_TEXT: Record<string, string> = {
  FILE_INVALID: 'We could not read text from this file. Upload a text-based PDF or a .docx.',
  AI_UNAVAILABLE: 'The AI service was unavailable. Delete this upload and try again later.',
  AI_INVALID_OUTPUT: 'The AI gave an unusable answer. Delete this upload and try again.',
};

function Analysis({ a }: { a: NonNullable<ResumeItem['analysis']> }) {
  const lists: [string, string[]][] = [['Strengths', a.strengths], ['Gaps', a.gaps], ['What to change', a.suggestions]];
  return (
    <div className="analysis">
      <p className="big small"><span className="mark">{a.score}</span> / 100</p>
      <p className="muted">{a.disclaimer}</p>
      {a.breakdown.map((b) => (
        <div key={b.category} className="crit">
          <div className="row"><span>{b.category}</span><Bar solved={b.score} total={100} /><span className="num">{b.score}</span></div>
          <p className="muted">{b.reason}</p>
        </div>
      ))}
      {lists.filter(([, items]) => items.length > 0).map(([title, items]) => (
        <section key={title}>
          <h3>{title}</h3>
          <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

export default function Resumes() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: ResumeItem[] }>('/resumes?limit=20')).items);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Poll while any resume is still being processed.
  const pending = items.some((r) => r.status === 'uploaded' || r.status === 'processing');
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [pending, load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = (new FormData(form).get('file') as File | null) ?? null;
    if (!file || file.size === 0) return setError('Choose a PDF or .docx file first.');
    if (file.size > MAX_BYTES) return setError('That file is larger than 5 MB.');
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      await api('/resumes', { method: 'POST', body });
      form.reset();
      await load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: ResumeItem) {
    if (!window.confirm(`Delete "${r.originalName}" and its analysis? This cannot be undone.`)) return;
    try {
      await api(`/resumes/${r.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="page">
      <h1>Resume</h1>
      <form className="card upload" onSubmit={onUpload}>
        <label>
          Upload a resume
          <input name="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
          <small>PDF or Word (.docx), up to 5 MB. Only you can see your files.</small>
        </label>
        <button className="primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload and analyze'}</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p role="status" className="muted">Loading your resumes…</p>}
      {!loading && items.length === 0 && (
        <section className="card empty"><h2>No resumes yet</h2><p>Upload one to get a scored review with specific changes to make.</p></section>
      )}

      <ul className="resumes">
        {items.map((r, i) => (
          <li key={r.id} className="card">
            <details open={i === 0}>
              <summary>
                <span className="fname">{r.originalName}</span>
                <span className={`tag st-${r.status}`}>{STATUS_TEXT[r.status]}</span>
                {r.analysis && <span className="num">{r.analysis.score}/100</span>}
              </summary>
              {r.status === 'failed' && <p className="error" role="alert">{FAIL_TEXT[r.errorCode ?? ''] ?? 'Analysis failed. Delete this upload and try again.'}</p>}
              {(r.status === 'uploaded' || r.status === 'processing') && <p role="status" className="muted">This usually takes under a minute. You can leave this page.</p>}
              {r.analysis && <Analysis a={r.analysis} />}
              <button className="link danger" onClick={() => remove(r)}>Delete</button>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
