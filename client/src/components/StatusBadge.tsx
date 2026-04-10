import type { OrderStatus } from '../types/api';

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Oczekuje',
  SHIPPED: 'Wysłane',
  COMPLETED: 'Zrealizowane',
  CANCELLED: 'Anulowane'
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
