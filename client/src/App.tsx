import { useEffect, useState } from 'react';

type Status = 'checking' | 'online' | 'offline';

export default function App() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => setStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>PrepAI</h1>
      <p>AI-powered placement preparation platform.</p>
      <p role="status">API status: <strong>{status}</strong></p>
    </main>
  );
}
