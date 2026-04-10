import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiPost } from '../lib/api';
import {
  forgotPasswordConfirmFormSchema,
  forgotPasswordRequestFormSchema,
  type ForgotPasswordConfirmFormValues,
  type ForgotPasswordRequestFormValues
} from '../schemas/auth';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [requestEmail, setRequestEmail] = useState('');
  const [requested, setRequested] = useState(false);

  const requestForm = useForm<ForgotPasswordRequestFormValues>({
    resolver: zodResolver(forgotPasswordRequestFormSchema),
    defaultValues: { email: '' }
  });

  const confirmForm = useForm<ForgotPasswordConfirmFormValues>({
    resolver: zodResolver(forgotPasswordConfirmFormSchema),
    defaultValues: {
      email: '',
      code: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const requestMutation = useMutation({
    mutationFn: (values: ForgotPasswordRequestFormValues) =>
      apiPost<{ message: string }>('/auth/forgot-password/request', values),
    onSuccess: (_response, values) => {
      setRequestEmail(values.email);
      setRequested(true);
      confirmForm.setValue('email', values.email);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: (values: ForgotPasswordConfirmFormValues) =>
      apiPost<{ message: string }>('/auth/forgot-password/confirm', values),
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { message: 'Haslo zostalo zmienione. Zaloguj sie nowym haslem.' }
      });
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl border border-outline-variant/10 p-8 shadow-xl">
        <h1 className="font-headline text-3xl font-black mb-2">Odzyskaj haslo</h1>
        <p className="text-on-surface-variant text-sm mb-6">Wyslemy kod jednorazowy na e-mail i ustawisz nowe haslo.</p>

        {!requested ? (
          <form className="space-y-4" onSubmit={requestForm.handleSubmit((values) => requestMutation.mutate(values))}>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">E-mail</label>
              <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...requestForm.register('email')} />
              {requestForm.formState.errors.email && (
                <p className="text-error text-xs font-bold mt-1">{requestForm.formState.errors.email.message}</p>
              )}
            </div>

            {requestMutation.error instanceof ApiError && (
              <p className="text-error text-xs font-bold">{requestMutation.error.message}</p>
            )}

            <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold" disabled={requestMutation.isPending} type="submit">
              {requestMutation.isPending ? 'Wysylanie...' : 'Wyslij kod jednorazowy'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={confirmForm.handleSubmit((values) => confirmMutation.mutate(values))}>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-medium px-3 py-2">
              Kod wyslany na: {requestEmail}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Kod jednorazowy</label>
              <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" maxLength={6} {...confirmForm.register('code')} />
              {confirmForm.formState.errors.code && (
                <p className="text-error text-xs font-bold mt-1">{confirmForm.formState.errors.code.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Nowe haslo</label>
              <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" type="password" {...confirmForm.register('newPassword')} />
              {confirmForm.formState.errors.newPassword && (
                <p className="text-error text-xs font-bold mt-1">{confirmForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-1">Powtorz nowe haslo</label>
              <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" type="password" {...confirmForm.register('confirmPassword')} />
              {confirmForm.formState.errors.confirmPassword && (
                <p className="text-error text-xs font-bold mt-1">{confirmForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {confirmMutation.error instanceof ApiError && (
              <p className="text-error text-xs font-bold">{confirmMutation.error.message}</p>
            )}

            <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold" disabled={confirmMutation.isPending} type="submit">
              {confirmMutation.isPending ? 'Zapisywanie...' : 'Ustaw nowe haslo'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-primary font-bold text-sm">Powrot do logowania</Link>
        </div>
      </div>
    </div>
  );
}
