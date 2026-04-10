import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError, apiGet, apiPatch, apiPost } from '../lib/api';
import { formatCurrency, formatDate, formatGenre } from '../lib/format';
import { queryClient } from '../lib/query-client';
import type { AdminGame, AdminSmtpConfig, AuditLog, AuthUser, Role } from '../types/api';

interface AdminOverviewResponse {
  users: AuthUser[];
  games: AdminGame[];
  auditLogs: AuditLog[];
}

const roleChangeSchema = z.object({
  userId: z.string().min(1, 'Wybierz użytkownika.'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
});
type RoleChangeValues = z.infer<typeof roleChangeSchema>;

const createUserSchema = z.object({
  fullName: z.string().min(2, 'Min. 2 znaki.'),
  email: z.string().email('Nieprawidłowy adres e-mail.'),
  password: z.string().min(8, 'Min. 8 znaków.'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
});
type CreateUserValues = z.infer<typeof createUserSchema>;

const smtpConfigSchema = z.object({
  host: z.string().min(1, 'Host SMTP jest wymagany.'),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1, 'Login SMTP jest wymagany.'),
  pass: z.string().optional(),
  from: z.string().email('Nieprawidlowy adres e-mail nadawcy.')
});
type SmtpConfigValues = z.infer<typeof smtpConfigSchema>;

const smtpTestSchema = z.object({
  to: z.string().email('Nieprawidlowy adres e-mail odbiorcy.')
});
type SmtpTestValues = z.infer<typeof smtpTestSchema>;

type TabType = 'USERS' | 'GAMES' | 'AUDIT';

const ROLE_STYLES: Record<Role, { color: string; bg: string; label: string }> = {
  ADMIN:   { color: 'text-error',     bg: 'bg-error/10',     label: 'Admin' },
  MANAGER: { color: 'text-secondary', bg: 'bg-secondary/10', label: 'Manager' },
  USER:    { color: 'text-on-surface-variant', bg: 'bg-surface-container-high', label: 'Użytkownik' },
};

function InputField({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      <div className="[&_input]:w-full [&_input]:bg-surface-container-low [&_input]:rounded-xl [&_input]:py-3 [&_input]:px-4 [&_input]:outline-none [&_input]:font-medium [&_input]:focus:ring-2 [&_input]:focus:ring-primary [&_select]:w-full [&_select]:bg-surface-container-low [&_select]:rounded-xl [&_select]:py-3 [&_select]:px-4 [&_select]:outline-none [&_select]:font-medium [&_select]:focus:ring-2 [&_select]:focus:ring-primary">
        {children}
      </div>
      {error && <p className="text-error text-xs font-bold">{error}</p>}
    </div>
  );
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('USERS');
  const [auditSort, setAuditSort] = useState<'DATE_DESC' | 'DATE_ASC' | 'ACTION' | 'ACTOR' | 'RESULT'>('DATE_DESC');

  const overviewQuery = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiGet<AdminOverviewResponse>('/admin/overview'),
  });

  const users = overviewQuery.data?.users ?? [];
  const sortedAuditLogs = useMemo(() => {
    const logs = [...(overviewQuery.data?.auditLogs ?? [])];

    if (auditSort === 'DATE_ASC') {
      return logs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    if (auditSort === 'ACTION') {
      return logs.sort((a, b) => a.action.localeCompare(b.action));
    }

    if (auditSort === 'ACTOR') {
      return logs.sort((a, b) => (a.actorUser?.email ?? 'system').localeCompare(b.actorUser?.email ?? 'system'));
    }

    if (auditSort === 'RESULT') {
      return logs.sort((a, b) => Number(a.success) - Number(b.success));
    }

    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [overviewQuery.data?.auditLogs, auditSort]);

  // Role change form
  const roleForm = useForm<RoleChangeValues>({
    resolver: zodResolver(roleChangeSchema),
    defaultValues: { userId: '', role: 'USER' },
  });
  const selectedUserId = roleForm.watch('userId');
  const selectedUser = users.find((u) => u.id === selectedUserId);

  const updateRoleMutation = useMutation({
    mutationFn: (values: RoleChangeValues) =>
      apiPatch<{ user: AuthUser }>(`/admin/users/${values.userId}`, { role: values.role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Create user form
  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { fullName: '', email: '', password: '', role: 'USER' },
  });

  const createUserMutation = useMutation({
    mutationFn: (values: CreateUserValues) =>
      apiPost<{ user: AuthUser }>('/admin/users', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      createForm.reset();
    },
  });

  const smtpConfigQuery = useQuery({
    queryKey: ['admin', 'smtp-config'],
    queryFn: () => apiGet<AdminSmtpConfig>('/admin/smtp-config')
  });

  const smtpForm = useForm<SmtpConfigValues>({
    resolver: zodResolver(smtpConfigSchema),
    defaultValues: {
      host: 'smtp.gmail.com',
      port: 587,
      user: '',
      pass: '',
      from: ''
    }
  });

  const smtpTestForm = useForm<SmtpTestValues>({
    resolver: zodResolver(smtpTestSchema),
    defaultValues: { to: '' }
  });

  useEffect(() => {
    if (!smtpConfigQuery.data) {
      return;
    }

    smtpForm.reset({
      host: smtpConfigQuery.data.host,
      port: smtpConfigQuery.data.port,
      user: smtpConfigQuery.data.user,
      pass: '',
      from: smtpConfigQuery.data.from
    });
  }, [smtpConfigQuery.data, smtpForm]);

  const saveSmtpMutation = useMutation({
    mutationFn: (values: SmtpConfigValues) => apiPost<{ success: boolean }>('/admin/smtp-config', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'smtp-config'] });
      smtpForm.setValue('pass', '');
    }
  });

  const sendSmtpTestMutation = useMutation({
    mutationFn: (values: SmtpTestValues) => apiPost<{ success: boolean; message: string }>('/admin/smtp-config/test', values)
  });

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'USERS',  label: 'Użytkownicy', icon: 'group' },
    { id: 'GAMES',  label: 'Gry',         icon: 'sports_esports' },
    { id: 'AUDIT',  label: 'Audit log',   icon: 'security' },
  ];

  return (
    <>
      <header className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
          Panel{' '}
          <span className="bg-gradient-to-br from-error to-tertiary bg-clip-text text-transparent">
            Administratora
          </span>
        </h1>
        <p className="text-on-surface-variant max-w-2xl">
          Zarządzanie użytkownikami, katalogiem i pełny podgląd zdarzeń systemowych.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Użytkownicy', value: users.length, icon: 'group', color: 'text-primary bg-primary/10' },
          { label: 'Admini',   value: users.filter(u => u.role === 'ADMIN').length,   icon: 'admin_panel_settings', color: 'text-error bg-error/10' },
          { label: 'Managerzy', value: users.filter(u => u.role === 'MANAGER').length, icon: 'manage_accounts',      color: 'text-secondary bg-secondary/10' },
          { label: 'Gry',      value: overviewQuery.data?.games.length ?? 0,          icon: 'sports_esports',       color: 'text-tertiary bg-tertiary/10' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
              <span className="material-symbols-outlined text-xl">{s.icon}</span>
            </div>
            <div>
              <p className="font-headline font-black text-2xl leading-none">{s.value}</p>
              <p className="text-xs text-on-surface-variant font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-2xl p-1.5 mb-8 max-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest shadow text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {activeTab === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: forms */}
          <div className="lg:col-span-5 space-y-6">
            {/* Create user */}
            <div className="bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">person_add</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg">Utwórz konto</h2>
                  <p className="text-xs text-on-surface-variant">Admin, Manager lub Użytkownik</p>
                </div>
              </div>

              {createUserMutation.error instanceof ApiError && (
                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-sm font-bold mb-4">
                  {createUserMutation.error.message}
                </div>
              )}
              {createUserMutation.isSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Konto zostało utworzone!
                </div>
              )}

              <form
                className="space-y-4"
                onSubmit={createForm.handleSubmit((v) => createUserMutation.mutate(v))}
              >
                <InputField label="Imię i nazwisko" error={createForm.formState.errors.fullName?.message}>
                  <input {...createForm.register('fullName')} placeholder="Jan Kowalski" />
                </InputField>
                <InputField label="Adres e-mail" error={createForm.formState.errors.email?.message}>
                  <input type="email" {...createForm.register('email')} placeholder="jan@example.com" />
                </InputField>
                <InputField label="Hasło tymczasowe" error={createForm.formState.errors.password?.message}>
                  <input type="password" {...createForm.register('password')} placeholder="Min. 8 znaków" />
                </InputField>
                <InputField label="Rola" error={createForm.formState.errors.role?.message}>
                  <select {...createForm.register('role')}>
                    <option value="USER">Użytkownik</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </InputField>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span className="material-symbols-outlined">person_add</span>
                  {createUserMutation.isPending ? 'Tworzenie...' : 'Utwórz konto'}
                </button>
              </form>
            </div>

            {/* Change role */}
            <div className="bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">manage_accounts</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg">Zmień rolę</h2>
                  <p className="text-xs text-on-surface-variant">Aktualizuj uprawnienia istniejącego konta</p>
                </div>
              </div>

              {updateRoleMutation.error instanceof ApiError && (
                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-sm font-bold mb-4">
                  {updateRoleMutation.error.message}
                </div>
              )}
              {updateRoleMutation.isSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-xl text-sm font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Rola zaktualizowana!
                </div>
              )}

              <form
                className="space-y-4"
                onSubmit={roleForm.handleSubmit((v) => updateRoleMutation.mutate(v))}
              >
                <InputField label="Użytkownik" error={roleForm.formState.errors.userId?.message}>
                  <select
                    {...roleForm.register('userId')}
                    onChange={(e) => {
                      roleForm.setValue('userId', e.target.value);
                      const u = users.find((x) => x.id === e.target.value);
                      if (u) roleForm.setValue('role', u.role);
                    }}
                  >
                    <option value="">Wybierz użytkownika...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} — {u.role}
                      </option>
                    ))}
                  </select>
                </InputField>
                {selectedUser && (
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    Obecna rola:{' '}
                    <span className={`font-bold ${ROLE_STYLES[selectedUser.role].color}`}>
                      {ROLE_STYLES[selectedUser.role].label}
                    </span>
                  </div>
                )}
                <InputField label="Nowa rola" error={roleForm.formState.errors.role?.message}>
                  <select {...roleForm.register('role')}>
                    <option value="USER">Użytkownik</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </InputField>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending || !selectedUserId}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-secondary to-tertiary text-on-secondary font-bold shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  <span className="material-symbols-outlined">edit</span>
                  {updateRoleMutation.isPending ? 'Zapisywanie...' : 'Zmień rolę'}
                </button>
              </form>
            </div>

            {/* SMTP config */}
            <div className="bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary">mail</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-lg">Konfiguracja SMTP</h2>
                  <p className="text-xs text-on-surface-variant">Ustawienia e-mail oraz test wysylki</p>
                </div>
              </div>

              {smtpConfigQuery.data && (
                <div className="mb-4 text-xs font-medium text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-2">
                  Zrodlo: <span className="font-bold">{smtpConfigQuery.data.source}</span>
                  {' · '}
                  Haslo zapisane: <span className="font-bold">{smtpConfigQuery.data.hasPassword ? 'tak' : 'nie'}</span>
                </div>
              )}

              {saveSmtpMutation.error instanceof ApiError && (
                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-sm font-bold mb-4">
                  {saveSmtpMutation.error.message}
                </div>
              )}

              {saveSmtpMutation.isSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-xl text-sm font-bold mb-4">
                  Konfiguracja SMTP zapisana.
                </div>
              )}

              <form className="space-y-4" onSubmit={smtpForm.handleSubmit((values) => saveSmtpMutation.mutate(values))}>
                <InputField label="Host SMTP" error={smtpForm.formState.errors.host?.message}>
                  <input {...smtpForm.register('host')} placeholder="smtp.gmail.com" />
                </InputField>
                <InputField label="Port" error={smtpForm.formState.errors.port?.message}>
                  <input type="number" {...smtpForm.register('port', { valueAsNumber: true })} placeholder="587" />
                </InputField>
                <InputField label="Login (Gmail)" error={smtpForm.formState.errors.user?.message}>
                  <input {...smtpForm.register('user')} placeholder="twojmail@gmail.com" />
                </InputField>
                <InputField label="Haslo aplikacji Gmail" error={smtpForm.formState.errors.pass?.message}>
                  <input type="password" {...smtpForm.register('pass')} placeholder="16-znakowe haslo aplikacji" />
                </InputField>
                <InputField label="Adres nadawcy" error={smtpForm.formState.errors.from?.message}>
                  <input type="email" {...smtpForm.register('from')} placeholder="twojmail@gmail.com" />
                </InputField>

                <button
                  type="submit"
                  disabled={saveSmtpMutation.isPending}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-tertiary to-primary text-on-tertiary font-bold disabled:opacity-60"
                >
                  {saveSmtpMutation.isPending ? 'Zapisywanie...' : 'Zapisz SMTP'}
                </button>
              </form>

              <div className="h-px bg-outline-variant/20 my-5" />

              {sendSmtpTestMutation.error instanceof ApiError && (
                <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-sm font-bold mb-4">
                  {sendSmtpTestMutation.error.message}
                </div>
              )}

              {sendSmtpTestMutation.isSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-3 rounded-xl text-sm font-bold mb-4">
                  Wiadomosc testowa wyslana.
                </div>
              )}

              <form className="space-y-3" onSubmit={smtpTestForm.handleSubmit((values) => sendSmtpTestMutation.mutate(values))}>
                <InputField label="E-mail testowy" error={smtpTestForm.formState.errors.to?.message}>
                  <input type="email" {...smtpTestForm.register('to')} placeholder="odbiorca@example.com" />
                </InputField>
                <button
                  type="submit"
                  disabled={sendSmtpTestMutation.isPending}
                  className="w-full py-3 rounded-xl bg-surface-container-high text-on-surface font-bold border border-outline-variant/20 disabled:opacity-60"
                >
                  {sendSmtpTestMutation.isPending ? 'Wysylanie...' : 'Wyslij test SMTP'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: users table */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10 shadow-sm">
            <h2 className="font-headline font-bold text-xl mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">group</span>
              Wszyscy użytkownicy
            </h2>
            {overviewQuery.isPending ? (
              <div className="text-center py-12 text-on-surface-variant font-bold">Ładowanie...</div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const rs = ROLE_STYLES[user.role];
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors"
                    >
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=4647d3&color=fff&size=40`}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-full flex-shrink-0"
                      />
                      <div className="flex-grow min-w-0">
                        <p className="font-bold text-sm truncate">{user.fullName}</p>
                        <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex-shrink-0 ${rs.color} ${rs.bg}`}>
                        {rs.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GAMES TAB ── */}
      {activeTab === 'GAMES' && (
        <div className="bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
          <h2 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">sports_esports</span>
            Katalog gier
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  {['Tytuł', 'Gatunek', 'Cena', 'Stan', 'Status'].map((h) => (
                    <th key={h} className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant px-3 first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overviewQuery.data?.games.map((game) => (
                  <tr key={game.id} className="border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-4 pl-0 pr-3 font-bold text-sm">{game.title}</td>
                    <td className="py-4 px-3">
                      <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {formatGenre(game.genre)}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-bold text-sm">
                      {game.price === 0 ? <span className="text-emerald-600">FREE</span> : formatCurrency(game.price)}
                    </td>
                    <td className="py-4 px-3 text-sm">{game.stock}</td>
                    <td className="py-4 px-3">
                      <span className={`text-xs font-bold ${game.isActive ? 'text-emerald-600' : 'text-error'}`}>
                        {game.isActive ? '● Aktywna' : '○ Nieaktywna'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AUDIT TAB ── */}
      {activeTab === 'AUDIT' && (
        <div className="bg-surface-container-lowest rounded-[2rem] p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">security</span>
              </div>
              <div>
                <h2 className="font-headline font-bold text-xl">Audit log</h2>
                <p className="text-xs text-on-surface-variant">Ostatnie 20 zdarzeń systemowych</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Sortowanie</label>
              <select
                className="bg-surface-container-low rounded-xl py-2 px-3 text-sm font-medium"
                value={auditSort}
                onChange={(event) => setAuditSort(event.target.value as typeof auditSort)}
              >
                <option value="DATE_DESC">Najnowsze</option>
                <option value="DATE_ASC">Najstarsze</option>
                <option value="ACTION">Po akcji</option>
                <option value="ACTOR">Po aktorze</option>
                <option value="RESULT">Po wyniku</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {sortedAuditLogs.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${
                  entry.success
                    ? 'bg-surface-container-low border-emerald-500'
                    : 'bg-error/5 border-error'
                }`}
              >
                <span className={`material-symbols-outlined mt-0.5 flex-shrink-0 ${entry.success ? 'text-emerald-600' : 'text-error'}`}>
                  {entry.success ? 'check_circle' : 'warning'}
                </span>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-sm">{entry.action}</span>
                    <span className="text-xs text-on-surface-variant flex-shrink-0">{formatDate(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Aktor: <span className="font-medium">{entry.actorUser?.email ?? 'system'}</span>
                    {entry.targetUser && <> · Cel: <span className="font-medium">{entry.targetUser.email}</span></>}
                    {entry.ipAddress && <> · IP: {entry.ipAddress}</>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
