import type { LeaveRequest, ProjectRequest } from '../types/api';
import { formatCurrency, formatDate, formatDateOnly } from '../lib/format';
import { StatusBadge } from './StatusBadge';

interface RequestTableProps {
  kind: 'project' | 'leave';
  items: Array<ProjectRequest | LeaveRequest>;
}

export function RequestTable({ kind, items }: RequestTableProps) {
  if (items.length === 0) {
    return <div className="empty-state">Brak rekordow do wyswietlenia.</div>;
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Record</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {kind === 'project' ? (
                  <>
                    <strong>{(item as ProjectRequest).title}</strong>
                    <div className="muted">
                      {(item as ProjectRequest).riskLevel} - {formatCurrency((item as ProjectRequest).requestedBudget)}
                    </div>
                  </>
                ) : (
                  <>
                    <strong>
                      {formatDateOnly((item as LeaveRequest).startDate)} - {formatDateOnly((item as LeaveRequest).endDate)}
                    </strong>
                    <div className="muted">{(item as LeaveRequest).reason}</div>
                  </>
                )}
              </td>
              <td>
                {item.user ? (
                  <>
                    <strong>{item.user.fullName}</strong>
                    <div className="muted">{item.user.email}</div>
                  </>
                ) : (
                  'Current user'
                )}
              </td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>{formatDate(item.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
