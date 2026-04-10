import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCurrentUser, currentUserQueryKey } from '../hooks/useCurrentUser';
import { ApiError, apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { registerFormSchema, type RegisterFormValues } from '../schemas/auth';
import type { AuthUser } from '../types/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const currentUserQuery = useCurrentUser();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' }
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) => apiPost<{ user: AuthUser }>('/auth/register', values),
    onSuccess: (response) => {
      queryClient.setQueryData(currentUserQueryKey, response.user);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/dashboard', { replace: true });
    }
  });

  if (currentUserQuery.data) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background py-16">
      {/* Dynamic background matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-tertiary-container via-background to-primary opacity-20"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-tertiary/20 blur-[150px]"></div>

      <div className="w-full max-w-lg p-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-surface/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 dark:border-white/5">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-bl from-tertiary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-tertiary/30 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="material-symbols-outlined text-4xl text-white">person_add</span>
            </div>
            <h1 className="font-headline font-black text-3xl tracking-tight text-on-surface">Zarejestruj się</h1>
            <p className="text-on-surface-variant font-medium mt-2">Dołącz do społeczności GameVault.</p>
          </div>

          {registerMutation.error instanceof ApiError && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl font-bold mb-6 text-center text-sm">
              {registerMutation.error.message}
            </div>
          )}

          <form className="space-y-4" onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}>
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Imię i nazwisko</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-tertiary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="name" 
                  placeholder="Jan Kowalski"
                  {...form.register('fullName')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-tertiary transition-colors">badge</span>
              </div>
              {form.formState.errors.fullName && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.fullName.message}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">E-mail</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-tertiary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="email" 
                  placeholder="adres@email.com"
                  {...form.register('email')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-tertiary transition-colors">mail</span>
              </div>
              {form.formState.errors.email && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.email.message}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Hasło</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-tertiary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="new-password" 
                  type="password" 
                  placeholder="••••••••"
                  {...form.register('password')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-tertiary transition-colors">lock</span>
              </div>
              {form.formState.errors.password && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.password.message}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Powtórz hasło</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-tertiary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="new-password" 
                  type="password" 
                  placeholder="••••••••"
                  {...form.register('confirmPassword')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-tertiary transition-colors">lock_reset</span>
              </div>
              {form.formState.errors.confirmPassword && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.confirmPassword.message}</span>
              )}
            </div>

            <button 
              className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-tertiary to-secondary text-white font-bold text-lg shadow-xl shadow-tertiary/20 hover:shadow-tertiary/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-50" 
              disabled={registerMutation.isPending} 
              type="submit"
            >
              {registerMutation.isPending ? 'Tworzenie konta...' : 'Utwórz konto'}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">how_to_reg</span>
            </button>
          </form>

          <div className="mt-8 text-center border-t border-outline-variant/10 pt-6">
            <p className="text-sm text-on-surface-variant font-medium">
              Masz już konto?{' '}
              <Link to="/login" className="text-tertiary font-bold hover:text-secondary transition-colors">
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

