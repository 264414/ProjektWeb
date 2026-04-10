import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { ApiError, apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '../schemas/auth';

export function ChangePasswordPage() {
  const navigate = useNavigate();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) => apiPost<{ message: string }>('/auth/change-password', values),
    onSuccess: () => {
      queryClient.clear();
      navigate('/login', {
        replace: true,
        state: {
          message: 'Hasło zostało zmienione. Zaloguj się ponownie.'
        }
      });
    }
  });

  return (
    <>
      <div className="mb-8 flex items-center gap-2 text-on-surface-variant max-w-xl mx-auto">
        <span className="text-xs font-bold tracking-widest uppercase">Konto</span>
        <span className="material-symbols-outlined text-sm" data-icon="chevron_right">chevron_right</span>
        <span className="text-xs font-bold tracking-widest uppercase text-primary">Bezpieczeństwo</span>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-8 md:p-12 shadow-[0px_20px_40px_rgba(44,47,49,0.06)] hover:scale-[1.01] transition-transform duration-300 max-w-xl mx-auto z-10 relative">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight mb-4 font-headline">Change password</h1>
            <p className="text-on-surface-variant leading-relaxed font-body">
              Po zmianie hasła backend unieważnia wszystkie aktywne sesje, co ogranicza utrzymanie przejętych cookies.
            </p>
          </div>

          {changePasswordMutation.error instanceof ApiError ? (
            <div className="bg-error-container text-on-error-container p-4 rounded-xl font-bold">{changePasswordMutation.error.message}</div>
          ) : null}

          <form className="space-y-6 mt-4" onSubmit={form.handleSubmit((values) => changePasswordMutation.mutate(values))}>
            {/* Input Group: Current */}
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Current password</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" data-icon="lock_open">lock_open</span>
                <input 
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-on-surface placeholder:text-outline/50" 
                  placeholder="••••••••" 
                  type="password"
                  autoComplete="current-password"
                  {...form.register('currentPassword')} 
                />
              </div>
              {form.formState.errors.currentPassword?.message && (
                <span className="text-error text-sm font-bold pl-1 block">{form.formState.errors.currentPassword.message}</span>
              )}
            </div>

            {/* Divider decoration */}
            <div className="py-2 flex items-center gap-4">
              <div className="flex-grow h-px bg-surface-container"></div>
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-tighter">New Credentials</span>
              <div className="flex-grow h-px bg-surface-container"></div>
            </div>

            {/* Input Group: New */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">New password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" data-icon="key">key</span>
                  <input 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-on-surface placeholder:text-outline/50" 
                    placeholder="••••••••" 
                    type="password"
                    autoComplete="new-password"
                    {...form.register('newPassword')}
                  />
                </div>
                {form.formState.errors.newPassword?.message && (
                  <span className="text-error text-sm font-bold pl-1 block">{form.formState.errors.newPassword.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Repeat new password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" data-icon="verified_user">verified_user</span>
                  <input 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low rounded-xl border-none ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-on-surface placeholder:text-outline/50" 
                    placeholder="••••••••" 
                    type="password"
                    autoComplete="new-password"
                    {...form.register('confirmPassword')}
                  />
                </div>
                {form.formState.errors.confirmPassword?.message && (
                  <span className="text-error text-sm font-bold pl-1 block">{form.formState.errors.confirmPassword.message}</span>
                )}
              </div>
            </div>

            {/* Submit Section */}
            <div className="pt-6">
              <button 
                className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-dim text-on-primary font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50" 
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                <span className="material-symbols-outlined" data-icon="update">update</span>
                {changePasswordMutation.isPending ? 'Updating...' : 'Change password'}
              </button>
              <p className="text-center mt-6 text-sm text-on-surface-variant">
                Problemy z dostępem? <Link to="#" className="text-primary font-semibold hover:underline">Skontaktuj się ze wsparciem</Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Footer Decorative Element */}
      <div className="mt-12 text-center opacity-50 flex items-center justify-center gap-2 grayscale">
        <span className="material-symbols-outlined text-2xl" data-icon="shield">shield</span>
        <span className="font-headline font-bold text-on-surface-variant tracking-tighter">GameVault Security Protocol v4.2</span>
      </div>

      {/* Visual Accents (Background Decorations) */}
      <div className="fixed top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-5%] left-[-5%] w-[30vw] h-[30vw] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
    </>
  );
}

