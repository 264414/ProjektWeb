import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="page-shell">
      <div className="card auth-card">
        <h1>Page not found</h1>
        <p className="muted">The requested route does not exist in the client application.</p>
        <p>
          <Link to="/dashboard">Go to dashboard</Link>
        </p>
      </div>
    </div>
  );
}
