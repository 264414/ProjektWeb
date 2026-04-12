import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser, currentUserQueryKey } from '../hooks/useCurrentUser';
import { ApiError, apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth';
import type { AuthUser } from '../types/api';

export function LoginPage() {
  const recaptchaEnabled = useMemo(() => {
    const raw = import.meta.env.VITE_RECAPTCHA_ENABLED;
    if (raw === undefined) {
      return true;
    }
    return raw === 'true';
  }, []);
  const recaptchaSiteKey = useMemo(
    () => import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '6LdFV68sAAAAAAaRL-r44RHRz0-ba-4olFMzai4',
    []
  );
  const recaptchaEnforceHost = useMemo(() => import.meta.env.VITE_RECAPTCHA_ENFORCE_HOST ?? '31.97.72.66', []);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const isProtectedRecaptchaHost = useMemo(() => window.location.hostname === recaptchaEnforceHost, [recaptchaEnforceHost]);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserQuery = useCurrentUser();
  const state = location.state as { from?: string; message?: string } | null;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', recaptchaToken: '' }
  });

  function loadRecaptchaScript(domain: 'google' | 'recaptcha'): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha-enterprise="true"]');
      if (existing && window.grecaptcha?.enterprise) {
        setRecaptchaReady(true);
        resolve();
        return;
      }

      if (existing) {
        existing.remove();
      }

      const host = domain === 'google' ? 'www.google.com' : 'www.recaptcha.net';
      const script = document.createElement('script');
      script.src = `https://${host}/recaptcha/enterprise.js?render=${encodeURIComponent(recaptchaSiteKey)}`;
      script.async = true;
      script.defer = true;
      script.dataset.recaptchaEnterprise = 'true';
      script.onload = () => {
        setRecaptchaReady(true);
        resolve();
      };
      script.onerror = () => {
        setRecaptchaReady(false);
        script.remove();
        reject(new Error(`Failed to load reCAPTCHA script from ${host}`));
      };
      document.head.appendChild(script);
    });
  }

  useEffect(() => {
    if (!recaptchaEnabled || !isProtectedRecaptchaHost) {
      setRecaptchaReady(true);
      return;
    }

    void loadRecaptchaScript('google').catch(async () => {
      await loadRecaptchaScript('recaptcha').catch(() => undefined);
    });
  }, [isProtectedRecaptchaHost, recaptchaEnabled, recaptchaSiteKey]);

  async function getRecaptchaToken(): Promise<string> {
    const tryExecute = async (): Promise<string> => {
      if (!window.grecaptcha?.enterprise) {
        throw new Error('reCAPTCHA Enterprise is not loaded.');
      }

      const enterprise = window.grecaptcha.enterprise;

      await new Promise<void>((resolve) => {
        enterprise.ready(() => resolve());
      });

      const token = await enterprise.execute(recaptchaSiteKey, { action: 'login' });
      if (!token) {
        throw new Error('Empty reCAPTCHA token.');
      }
      return token;
    };

    try {
      return await tryExecute();
    } catch {
      await loadRecaptchaScript('recaptcha');
      return tryExecute();
    }
  }

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => apiPost<{ user: AuthUser }>('/auth/login', values),
    onSuccess: (response) => {
      queryClient.setQueryData(currentUserQueryKey, response.user);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(state?.from ?? '/dashboard', { replace: true });
    }
  });

  if (currentUserQuery.data) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic background matching landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-background to-tertiary-container opacity-20"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-secondary/20 blur-[150px]"></div>

      <div className="w-full max-w-md p-6 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-surface/60 dark:bg-surface-container-lowest/60 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 dark:border-white/5">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="material-symbols-outlined text-4xl text-white">sports_esports</span>
            </div>
            <h1 className="font-headline font-black text-3xl tracking-tight text-on-surface">Witaj ponownie</h1>
            <p className="text-on-surface-variant font-medium mt-2">Dostęp do Twojej cyfrowej biblioteki.</p>
          </div>

          {state?.message && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl font-bold mb-6 text-center text-sm">
              {state.message}
            </div>
          )}
          {loginMutation.error instanceof ApiError && (
            <div className="bg-error/10 border border-error/20 text-error p-4 rounded-xl font-bold mb-6 text-center text-sm">
              {loginMutation.error.message}
            </div>
          )}

          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(async (values) => {
              let token = '';

              if (recaptchaEnabled && isProtectedRecaptchaHost && recaptchaReady) {
                try {
                  token = await getRecaptchaToken();
                } catch {
                  token = '';
                }
              }

              form.setValue('recaptchaToken', token, { shouldValidate: true });
              loginMutation.mutate({ ...values, recaptchaToken: token });
            })}
          >
            <input type="hidden" {...form.register('recaptchaToken')} />
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">E-mail</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="email" 
                  placeholder="adres@email.com"
                  {...form.register('email')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">mail</span>
              </div>
              {form.formState.errors.email && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.email.message}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-widest uppercase text-on-surface-variant ml-1">Hasło</label>
              <div className="relative group">
                <input 
                  className="w-full bg-surface-container-highest/50 border border-transparent rounded-2xl py-4 pl-5 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-on-surface shadow-inner" 
                  autoComplete="current-password" 
                  type="password" 
                  placeholder="••••••••"
                  {...form.register('password')} 
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
              </div>
              {form.formState.errors.password && (
                <span className="text-error text-xs font-bold pl-1 block">{form.formState.errors.password.message}</span>
              )}
            </div>

            <button 
              className="w-full mt-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dim text-on-primary font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 group disabled:opacity-50" 
              disabled={loginMutation.isPending} 
              type="submit"
            >
              {loginMutation.isPending ? 'Autoryzacja...' : 'Zaloguj się'}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">login</span>
            </button>
            {form.formState.errors.root?.message && (
              <p className="text-error text-xs font-bold text-center">{form.formState.errors.root.message}</p>
            )}
            {!recaptchaReady && isProtectedRecaptchaHost && recaptchaEnabled && (
              <p className="text-on-surface-variant text-xs text-center">Ladowanie zabezpieczenia reCAPTCHA...</p>
            )}
            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-sm font-bold text-primary hover:text-primary-dim transition-colors">
                Odzyskaj haslo
              </Link>
            </div>
          </form>

          <div className="mt-8 text-center border-t border-outline-variant/10 pt-6">
            <p className="text-sm text-on-surface-variant font-medium">
              Nie masz konta?{' '}
              <Link to="/register" className="text-primary font-bold hover:text-primary-dim transition-colors">
                Zarejestruj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

