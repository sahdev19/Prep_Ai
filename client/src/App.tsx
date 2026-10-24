import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Dsa from './pages/Dsa';
import Resumes from './pages/Resumes';

function Shell() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <aside className="side">
        <p className="brand">Prep<span className="mark">AI</span></p>
        <nav aria-label="Main">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/dsa">DSA tracker</NavLink>
          <NavLink to="/resume">Resume</NavLink>
        </nav>
        <div className="who">
          <span>{user?.name}</span>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main id="main"><Outlet /></main>
    </div>
  );
}

function RequireAuth() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="center" role="status">Loading…</p>;
  return user ? <Shell /> : <Navigate to="/login" replace state={{ from: loc }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<RequireAuth />}>
        <Route index element={<Dashboard />} />
        <Route path="dsa" element={<Dsa />} />
        <Route path="resume" element={<Resumes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
