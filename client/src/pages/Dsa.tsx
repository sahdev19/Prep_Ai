import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errMsg } from '../api';
import { DIFFICULTIES, PLATFORMS, STATUSES, TOPICS, type Problem, type ProblemList, type Status } from '../constants';

const PAGE_SIZE = 10;

function Options({ map }: { map: Record<string, string> }) {
  return <>{Object.entries(map).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>;
}

function AddForm({ onAdded, onCancel }: { onAdded: () => void; onCancel: () => void }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const k of ['title', 'topic', 'difficulty', 'platform', 'status', 'url']) {
      const v = String(f.get(k) ?? '').trim();
      if (v) body[k] = v;
    }
    setBusy(true);
    setError('');
    try {
      await api('/dsa', { method: 'POST', body });
      onAdded();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <form className="card form-grid" onSubmit={submit} aria-label="Add a problem">
      <h2>Add a problem</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <label className="wide">Title<input name="title" required maxLength={200} placeholder="Two Sum" /></label>
      <label>Topic<select name="topic" required defaultValue="arrays"><Options map={TOPICS} /></select></label>
      <label>Difficulty<select name="difficulty" required defaultValue="easy"><Options map={DIFFICULTIES} /></select></label>
      <label>Platform<select name="platform" defaultValue="leetcode"><Options map={PLATFORMS} /></select></label>
      <label>Status<select name="status" defaultValue="todo"><Options map={STATUSES} /></select></label>
      <label className="wide">Link (optional)<input name="url" type="url" maxLength={500} placeholder="https://" /></label>
      <div className="actions wide">
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Add problem'}</button>
        <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Dsa() {
  const [data, setData] = useState<ProblemList | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ topic: '', difficulty: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
      setData(await api<ProblemList>(`/dsa?${q}`));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (k: keyof typeof filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(1);
  };

  async function changeStatus(p: Problem, status: Status) {
    try {
      const r = await api<{ problem: Problem }>(`/dsa/${p.id}`, { method: 'PATCH', body: { status } });
      setData((d) => d && { ...d, items: d.items.map((x) => (x.id === p.id ? r.problem : x)) });
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function remove(p: Problem) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await api(`/dsa/${p.id}`, { method: 'DELETE' });
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
      else void load();
    } catch (e) {
      setError(errMsg(e));
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="page">
      <div className="head">
        <h1>DSA tracker</h1>
        {!adding && <button className="primary" onClick={() => setAdding(true)}>Add problem</button>}
      </div>

      {adding && <AddForm onCancel={() => setAdding(false)} onAdded={() => { setAdding(false); if (page === 1) void load(); else setPage(1); }} />}

      <div className="filters" role="group" aria-label="Filters">
        <label>Topic<select value={filters.topic} onChange={(e) => setFilter('topic', e.target.value)}><option value="">All</option><Options map={TOPICS} /></select></label>
        <label>Difficulty<select value={filters.difficulty} onChange={(e) => setFilter('difficulty', e.target.value)}><option value="">All</option><Options map={DIFFICULTIES} /></select></label>
        <label>Status<select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}><option value="">All</option><Options map={STATUSES} /></select></label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && !data && <p role="status" className="muted">Loading problems…</p>}

      {data && data.items.length === 0 && !loading && (
        <section className="card empty">
          <h2>{filtered ? 'No problems match these filters' : 'No problems yet'}</h2>
          <p>{filtered ? 'Clear a filter to see more.' : 'Add the first problem you want to solve.'}</p>
        </section>
      )}

      {data && data.items.length > 0 && (
        <ul className="list" aria-busy={loading}>
          {data.items.map((p) => (
            <li key={p.id} className="item">
              <div className="title">
                {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a> : <span>{p.title}</span>}
                <small>{TOPICS[p.topic]}, {PLATFORMS[p.platform]}</small>
              </div>
              <span className={`tag ${p.difficulty}`}>{DIFFICULTIES[p.difficulty]}</span>
              <select aria-label={`Status for ${p.title}`} value={p.status} onChange={(e) => changeStatus(p, e.target.value as Status)}>
                <Options map={STATUSES} />
              </select>
              <button className="link danger" onClick={() => remove(p)} aria-label={`Delete ${p.title}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > PAGE_SIZE && (
        <nav className="pager" aria-label="Pagination">
          <button className="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pages}</span>
          <button className="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
    </div>
  );
}
