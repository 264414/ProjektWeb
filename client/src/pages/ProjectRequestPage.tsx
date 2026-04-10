import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FormField } from '../components/FormField';
import { RequestTable } from '../components/RequestTable';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { projectRequestFormSchema, type ProjectRequestFormValues } from '../schemas/project-request';
import type { ProjectRequest } from '../types/api';

export function ProjectRequestPage() {
  const currentUserQuery = useCurrentUser();
  const requestsQuery = useQuery({
    queryKey: ['project-requests'],
    queryFn: () => apiGet<{ items: ProjectRequest[] }>('/project-requests')
  });

  const form = useForm<ProjectRequestFormValues>({
    resolver: zodResolver(projectRequestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      businessJustification: '',
      requestedBudget: 1000,
      riskLevel: 'MEDIUM'
    }
  });

  const createMutation = useMutation({
    mutationFn: (values: ProjectRequestFormValues) => apiPost<{ item: ProjectRequest }>('/project-requests', values),
    onSuccess: () => {
      form.reset({
        title: '',
        description: '',
        businessJustification: '',
        requestedBudget: 1000,
        riskLevel: 'MEDIUM'
      });
      void queryClient.invalidateQueries({ queryKey: ['project-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  return (
    <div className="grid-2">
      <section className="panel">
        <h1 className="section-title">Project request form</h1>
        <p className="muted">
          Formularz zapisuje rekord do PostgreSQL przez Prisma. Walidacja jest wykonywana lokalnie i ponownie na backendzie.
        </p>

        {createMutation.error instanceof ApiError ? (
          <div className="alert alert-error">{createMutation.error.message}</div>
        ) : null}
        {createMutation.isSuccess ? <div className="alert alert-success">Wniosek projektowy zostal zapisany.</div> : null}

        <form className="form-grid" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <FormField label="Title" error={form.formState.errors.title?.message}>
            <input {...form.register('title')} />
          </FormField>

          <FormField label="Description" error={form.formState.errors.description?.message}>
            <textarea rows={4} {...form.register('description')} />
          </FormField>

          <FormField label="Business justification" error={form.formState.errors.businessJustification?.message}>
            <textarea rows={4} {...form.register('businessJustification')} />
          </FormField>

          <FormField label="Requested budget (PLN)" error={form.formState.errors.requestedBudget?.message}>
            <input min={100} step={100} type="number" {...form.register('requestedBudget', { valueAsNumber: true })} />
          </FormField>

          <FormField label="Risk level" error={form.formState.errors.riskLevel?.message}>
            <select {...form.register('riskLevel')}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </FormField>

          <div className="button-row">
            <button className="button button-primary" disabled={createMutation.isPending} type="submit">
              {createMutation.isPending ? 'Saving...' : 'Save request'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="section-title">Visible records</h2>
        <p className="muted">
          Zakres danych zalezy od roli: admin widzi wszystko, manager zespol, user tylko swoje rekordy. Aktualna rola:
          <strong> {currentUserQuery.data?.role}</strong>
        </p>

        {requestsQuery.error instanceof ApiError ? (
          <div className="alert alert-error">{requestsQuery.error.message}</div>
        ) : (
          <RequestTable items={requestsQuery.data?.items ?? []} kind="project" />
        )}
      </section>
    </div>
  );
}

