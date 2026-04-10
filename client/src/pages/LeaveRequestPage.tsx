import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FormField } from '../components/FormField';
import { RequestTable } from '../components/RequestTable';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { leaveRequestFormSchema, type LeaveRequestFormValues } from '../schemas/leave-request';
import type { LeaveRequest } from '../types/api';

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LeaveRequestPage() {
  const currentUserQuery = useCurrentUser();
  const requestsQuery = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => apiGet<{ items: LeaveRequest[] }>('/leave-requests')
  });

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      startDate: getToday(),
      endDate: getToday(),
      reason: ''
    }
  });

  const createMutation = useMutation({
    mutationFn: (values: LeaveRequestFormValues) => apiPost<{ item: LeaveRequest }>('/leave-requests', values),
    onSuccess: () => {
      form.reset({
        startDate: getToday(),
        endDate: getToday(),
        reason: ''
      });
      void queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  return (
    <div className="grid-2">
      <section className="panel">
        <h1 className="section-title">Leave request form</h1>
        <p className="muted">Daty sa walidowane po obu stronach i zapisywane jako bezpieczne rekordy przez ORM.</p>

        {createMutation.error instanceof ApiError ? (
          <div className="alert alert-error">{createMutation.error.message}</div>
        ) : null}
        {createMutation.isSuccess ? <div className="alert alert-success">Wniosek urlopowy zostal zapisany.</div> : null}

        <form className="form-grid" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <FormField label="Start date" error={form.formState.errors.startDate?.message}>
            <input type="date" {...form.register('startDate')} />
          </FormField>

          <FormField label="End date" error={form.formState.errors.endDate?.message}>
            <input type="date" {...form.register('endDate')} />
          </FormField>

          <FormField label="Reason" error={form.formState.errors.reason?.message}>
            <textarea rows={5} {...form.register('reason')} />
          </FormField>

          <div className="button-row">
            <button className="button button-primary" disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? 'Saving...' : 'Save leave request'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Visible records</h2>
        <p className="muted">
          API wymusza zakres danych po stronie serwera. Aktualna rola: <strong>{currentUserQuery.data?.role}</strong>
        </p>

        {requestsQuery.error instanceof ApiError ? (
          <div className="alert alert-error">{requestsQuery.error.message}</div>
        ) : (
          <RequestTable items={requestsQuery.data?.items ?? []} kind="leave" />
        )}
      </section>
    </div>
  );
}
