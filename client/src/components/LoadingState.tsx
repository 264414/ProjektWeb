export function LoadingState({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="page-shell">
      <div className="card auth-card">
        <h1>Secure Workspace Portal</h1>
        <p className="muted">{message}</p>
      </div>
    </div>
  );
}

