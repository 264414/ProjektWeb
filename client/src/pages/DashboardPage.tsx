import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, apiGet, apiPatch } from '../lib/api';
import { formatCurrency, formatDate, formatGenre, renderStars } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';
import { queryClient } from '../lib/query-client';
import type { DashboardResponse, Order, OrderStatus } from '../types/api';

const Panel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-surface-container-lowest/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 shadow-[0_20px_60px_rgba(10,12,30,0.06)] border border-outline-variant/15 ${className}`}>
    {children}
  </div>
);

const Metric = ({
  label,
  value,
  icon,
  accent = 'from-primary to-secondary'
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  accent?: string;
}) => (
  <Panel className="flex flex-col gap-2 relative overflow-hidden">
    <div className="absolute -right-8 -top-8 w-28 h-28 bg-primary/10 rounded-full blur-2xl" />
    <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </div>
    <div className="text-on-surface-variant font-bold text-xs tracking-widest uppercase relative z-10">{label}</div>
    <div className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br ${accent} tracking-tight relative z-10`}>
      {value}
    </div>
  </Panel>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-6 flex items-center gap-3">
    <span className="w-2 h-8 rounded-full bg-gradient-to-b from-primary to-secondary" />
    {children}
  </h2>
);

const RoleHero = ({
  title,
  subtitle,
  icon,
  accent
}: {
  title: React.ReactNode;
  subtitle: string;
  icon: string;
  accent: string;
}) => (
  <section className="relative overflow-hidden rounded-[2rem] border border-outline-variant/15 p-8 md:p-10 bg-surface-container-low/70 backdrop-blur-sm">
    <div className={`absolute inset-0 opacity-15 bg-gradient-to-br ${accent}`} />
    <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/30 blur-3xl" />
    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-2">{title}</h1>
        <p className="text-on-surface-variant text-base md:text-lg font-medium">{subtitle}</p>
      </div>
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-surface-container-lowest/80 border border-outline-variant/20 flex items-center justify-center shadow-lg">
        <span className="material-symbols-outlined text-4xl text-on-surface">{icon}</span>
      </div>
    </div>
  </section>
);

function useOrderStatusMutation() {
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiPatch<{ order: Order }>(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

function StatusActions({ order, mutation }: { order: Order; mutation: ReturnType<typeof useOrderStatusMutation> }) {
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {order.status === 'PENDING' && (
        <button
          onClick={() => mutation.mutate({ orderId: order.id, status: 'SHIPPED' })}
          disabled={mutation.isPending}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
        >
          Wyślij
        </button>
      )}
      {order.status === 'SHIPPED' && (
        <button
          onClick={() => mutation.mutate({ orderId: order.id, status: 'COMPLETED' })}
          disabled={mutation.isPending}
          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          Dostarczone
        </button>
      )}
      <button
        onClick={() => mutation.mutate({ orderId: order.id, status: 'CANCELLED' })}
        disabled={mutation.isPending}
        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50"
      >
        Anuluj
      </button>
    </div>
  );
}

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardResponse>('/dashboard')
  });
  const statusMutation = useOrderStatusMutation();

  if (dashboardQuery.isPending) {
    return <div className="flex justify-center items-center py-20 text-on-surface-variant font-bold">Ładowanie dashboardu...</div>;
  }

  if (dashboardQuery.error instanceof ApiError) {
    return <div className="bg-error-container text-on-error-container p-4 rounded-xl font-bold">{dashboardQuery.error.message}</div>;
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) return <div className="text-center py-20 text-on-surface-variant">Brak danych.</div>;

  /* ── ADMIN view ─────────────────────────────── */
  if (dashboard.role === 'ADMIN') {
    return (
      <div className="space-y-8">
        <RoleHero
          title={<>Panel <span className="bg-gradient-to-r from-error to-tertiary bg-clip-text text-transparent">Admina</span></>}
          subtitle="Pełny widok platformy, zdarzeń bezpieczeństwa i aktywności sklepu w czasie rzeczywistym."
          icon="shield_person"
          accent="from-error via-primary to-tertiary"
        />

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Metric label="Użytkownicy" value={dashboard.stats.totalUsers} icon="groups" accent="from-primary to-tertiary" />
          <Metric label="Aktywne gry" value={dashboard.stats.totalGames} icon="sports_esports" accent="from-secondary to-primary" />
          <Metric label="Zamówienia" value={dashboard.stats.totalOrders} icon="receipt_long" accent="from-tertiary to-secondary" />
          <Metric label="Przychód" value={formatCurrency(dashboard.stats.totalRevenue)} icon="payments" accent="from-emerald-500 to-teal-500" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <SectionTitle>Użytkownicy wg ról</SectionTitle>
            <div className="space-y-3">
              {dashboard.stats.usersByRole.map((entry) => (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10" key={entry.role}>
                  <strong className="font-headline tracking-wide">{entry.role}</strong>
                  <div className="text-on-surface-variant font-medium text-sm">{entry.count} kont(a)</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Ostatnie zdarzenia audytowe</SectionTitle>
            <div className="space-y-3">
              {dashboard.recentAuditLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border-l-4 ${entry.success ? 'bg-surface-container-low border-emerald-500' : 'bg-error-container/20 border-error'}`}
                >
                  <span className={`material-symbols-outlined mt-0.5 ${entry.success ? 'text-emerald-600' : 'text-error'}`}>
                    {entry.success ? 'check_circle' : 'warning'}
                  </span>
                  <div>
                    <div className="font-bold">{entry.action}</div>
                    <div className="text-xs text-on-surface-variant font-medium mt-1">
                      {entry.actorUser?.email ?? 'system'} · {formatDate(entry.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel>
          <SectionTitle>Ostatnie zamówienia</SectionTitle>
          {dashboard.recentOrders.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">Brak zamówień.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                    <th className="pb-4 pl-2">Gra</th>
                    <th className="pb-4">Klient</th>
                    <th className="pb-4">Kwota</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Data</th>
                    <th className="pb-4">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {dashboard.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-4 pl-2">
                        <strong className="block">{order.game?.title}</strong>
                        <span className="text-xs text-on-surface-variant">{order.game ? formatGenre(order.game.genre) : ''}</span>
                      </td>
                      <td className="py-4 text-sm font-medium">{order.user?.fullName ?? '—'}</td>
                      <td className="py-4 font-bold text-primary">{formatCurrency(order.totalPrice)}</td>
                      <td className="py-4"><StatusBadge status={order.status} /></td>
                      <td className="py-4 text-sm text-on-surface-variant">{formatDate(order.createdAt)}</td>
                      <td className="py-4"><StatusActions order={order} mutation={statusMutation} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionTitle>Ostatnie recenzje</SectionTitle>
          {dashboard.recentReviews.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">Brak recenzji.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.recentReviews.map((review) => (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-3 shadow-sm" key={review.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="block text-lg line-clamp-1">{review.game?.title}</strong>
                      <span className="text-xs text-on-surface-variant font-semibold">{review.user?.fullName}</span>
                    </div>
                    <span className="text-primary flex">{renderStars(review.rating)}</span>
                  </div>
                  <p className="text-sm italic text-on-surface-variant leading-relaxed">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  /* ── MANAGER view ───────────────────────────── */
  if (dashboard.role === 'MANAGER') {
    return (
      <div className="space-y-8">
        <RoleHero
          title={<>Panel <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">Managera</span></>}
          subtitle="Kontroluj przepływ zamówień i reaguj na sytuacje wymagające szybkiej zmiany statusu."
          icon="monitoring"
          accent="from-secondary via-primary to-tertiary"
        />

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Metric label="Aktywne gry" value={dashboard.stats.activeGames} icon="sports_esports" accent="from-primary to-secondary" />
          <Metric label="Wszystkie zamówienia" value={dashboard.stats.totalOrders} icon="shopping_cart" accent="from-secondary to-tertiary" />
          <Metric label="Oczekujące" value={dashboard.stats.pendingOrders} icon="hourglass_top" accent="from-amber-500 to-orange-500" />
        </section>

        <Panel>
          <SectionTitle>Ostatnie zamówienia — zmiana statusu</SectionTitle>
          {dashboard.recentOrders.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">Brak zamówień.</div>
          ) : (
             <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                    <th className="pb-4 pl-2">Gra</th>
                    <th className="pb-4">Klient</th>
                    <th className="pb-4">Kwota</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Data</th>
                    <th className="pb-4">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {dashboard.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-4 pl-2">
                        <strong className="block">{order.game?.title}</strong>
                        <span className="text-xs text-on-surface-variant">{order.game ? formatGenre(order.game.genre) : ''}</span>
                      </td>
                      <td className="py-4 text-sm font-medium">{order.user?.email ?? '—'}</td>
                      <td className="py-4 font-bold text-primary">{formatCurrency(order.totalPrice)}</td>
                      <td className="py-4"><StatusBadge status={order.status} /></td>
                      <td className="py-4 text-sm text-on-surface-variant">{formatDate(order.createdAt)}</td>
                      <td className="py-4"><StatusActions order={order} mutation={statusMutation} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <SectionTitle>Ostatnie recenzje</SectionTitle>
          {dashboard.recentReviews.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant">Brak recenzji.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.recentReviews.map((review) => (
                <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex flex-col gap-2 shadow-sm" key={review.id}>
                  <div className="flex justify-between items-start">
                    <strong className="block text-lg line-clamp-1">{review.game?.title}</strong>
                    <span className="text-primary flex">{renderStars(review.rating)}</span>
                  </div>
                  <div className="text-xs font-bold text-on-surface-variant">{review.user?.email}</div>
                  <p className="text-sm text-on-surface-variant mt-2">"{review.comment}"</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  /* ── USER view ──────────────────────────────── */
  return (
    <div className="space-y-8">
      <RoleHero
        title={<>Witaj, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">{dashboard.profile.fullName.split(' ')[0]}</span> 👋</>}
        subtitle="Twoje zamówienia, recenzje i podsumowanie wydatków w jednym miejscu."
        icon="stadia_controller"
        accent="from-primary via-secondary to-tertiary"
      />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Metric label="Moje zamówienia" value={dashboard.stats.totalOrders} icon="shopping_bag" accent="from-primary to-secondary" />
        <Metric label="Łączne wydatki" value={formatCurrency(dashboard.stats.totalSpent)} icon="savings" accent="from-emerald-500 to-teal-500" />
        <Metric label="Moje recenzje" value={dashboard.stats.totalReviews} icon="rate_review" accent="from-secondary to-tertiary" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Panel>
            <SectionTitle>Moje ostatnie zamówienia</SectionTitle>
            {dashboard.ownOrders.length === 0 ? (
              <div className="text-center py-12 px-6 rounded-2xl bg-surface-container border border-dashed border-outline-variant/30">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">shopping_bag</span>
                <p className="font-bold text-lg">Nie masz jeszcze żadnych zamówień.</p>
                <p className="text-sm text-on-surface-variant mt-1">Przejdź do Sklepu i sprawdź Katalog gier!</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-xs font-bold text-on-surface-variant tracking-wider uppercase">
                      <th className="pb-4 pl-2">Gra</th>
                      <th className="pb-4 text-center">Qty</th>
                      <th className="pb-4">Kwota</th>
                      <th className="pb-4">Status</th>
                      <th className="pb-4">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {dashboard.ownOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-container-low/70 transition-colors">
                        <td className="py-4 pl-2">
                          <strong className="block">{order.game?.title}</strong>
                          <span className="text-xs text-on-surface-variant">{order.game ? formatGenre(order.game.genre) : ''}</span>
                        </td>
                        <td className="py-4 font-bold text-center">{order.quantity}</td>
                        <td className="py-4 font-bold text-primary">{formatCurrency(order.totalPrice)}</td>
                        <td className="py-4"><StatusBadge status={order.status} /></td>
                        <td className="py-4 text-sm text-on-surface-variant">{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionTitle>Moje recenzje</SectionTitle>
            {dashboard.ownReviews.length === 0 ? (
              <div className="text-center py-8 text-on-surface-variant font-medium">Nie napisałeś jeszcze żadnej recenzji.</div>
            ) : (
              <div className="space-y-4">
                {dashboard.ownReviews.map((review) => (
                  <div className="p-5 rounded-2xl bg-surface-container-low border border-transparent hover:border-outline-variant/20 hover:shadow-md transition-all flex flex-col gap-2" key={review.id}>
                    <div className="flex justify-between items-center">
                      <strong className="text-lg font-headline">{review.game?.title}</strong>
                      <span className="text-primary flex gap-0.5">{renderStars(review.rating)}</span>
                    </div>
                    <p className="text-sm italic text-on-surface-variant">"{review.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="bg-gradient-to-br from-primary to-primary-container text-on-primary border-none shadow-xl shadow-primary/20">
            <h2 className="font-headline text-xl font-bold mb-4 opacity-90">Konto gracza</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-white/20 p-1 flex items-center justify-center backdrop-blur-md">
                <span className="material-symbols-outlined text-4xl">person</span>
              </div>
              <div>
                <strong className="block text-2xl font-black tracking-tight">{dashboard.profile.fullName}</strong>
                <span className="text-sm opacity-80">{dashboard.profile.email}</span>
              </div>
            </div>
            <div className="bg-black/10 rounded-xl p-4 backdrop-blur-sm text-sm font-medium leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-xl">security</span>
                <span className="font-bold tracking-widest uppercase text-xs">Security Protocol</span>
              </div>
              Rola USER widzi wyłącznie własne dane — filtrowanie jest wymuszone po stronie API, nie tylko na froncie.
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
