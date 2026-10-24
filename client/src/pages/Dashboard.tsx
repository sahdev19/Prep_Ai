import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../auth';
import { Bar } from '../components';
import { DIFFICULTIES, STATUSES, TOPICS, type Stats } from '../constants';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/dsa/stats').then(setStats).catch((e) => setError(errMsg(e)));
  }, []);

  const next = stats?.byTopic
    .filter((t) => t.solved < t.total)
    .sort((a, b) => a.solved / a.total - b.solved / b.total || b.total - a.total)[0];

  return (
    <div className="page">
      <h1>Hi, {user?.name.split(' ')[0]}</h1>
      {error && <p className="error" role="alert">{error}</p>}
      {!stats && !error && <p role="status" className="muted">Loading your progress…</p>}
      {stats && stats.total === 0 && (
        <section className="card empty">
          <h2>Nothing tracked yet</h2>
          <p>Add the problems you want to practice and your progress will show up here.</p>
          <Link className="primary btn" to="/dsa">Add your first problem</Link>
        </section>
      )}
      {stats && stats.total > 0 && (
        <>
          <section className="hero" aria-label="Solved problems">
            <p className="big"><span className="mark">{stats.solved}</span> solved</p>
            <p className="muted">of {stats.total} problems you track</p>
            <ul className="chips">
              {(Object.keys(STATUSES) as (keyof typeof STATUSES)[]).filter((s) => s !== 'solved').map((s) => (
                <li key={s}>{STATUSES[s]}: <strong>{stats.byStatus[s]}</strong></li>
              ))}
            </ul>
          </section>
          {next && (
            <section className="card next">
              <h2>Practice next: {TOPICS[next.topic]}</h2>
              <p>You have solved {next.solved} of {next.total} problems in this topic, the lowest share of any topic.</p>
              <Link to="/dsa">Open tracker</Link>
            </section>
          )}
          <div className="two">
            <section className="card">
              <h2>By difficulty</h2>
              {(Object.keys(DIFFICULTIES) as (keyof typeof DIFFICULTIES)[]).map((d) => (
                <div className="row" key={d}>
                  <span>{DIFFICULTIES[d]}</span>
                  <Bar {...stats.byDifficulty[d]} />
                  <span className="num">{stats.byDifficulty[d].solved}/{stats.byDifficulty[d].total}</span>
                </div>
              ))}
            </section>
            <section className="card">
              <h2>By topic</h2>
              {stats.byTopic.map((t) => (
                <div className="row" key={t.topic}>
                  <span>{TOPICS[t.topic]}</span>
                  <Bar solved={t.solved} total={t.total} />
                  <span className="num">{t.solved}/{t.total}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
