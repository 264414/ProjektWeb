import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, apiGet, apiPatch, apiPost } from '../lib/api';
import { formatCurrency, formatDate, formatGenre } from '../lib/format';
import { queryClient } from '../lib/query-client';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Game, Order, OrderStatus, Promotion } from '../types/api';

const GENRES = [
  'ACTION',
  'RPG',
  'STRATEGY',
  'SPORTS',
  'HORROR',
  'ADVENTURE',
  'PUZZLE',
  'SIMULATION'
] as const;

const gameFormSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().min(0).max(999.99),
  genre: z.enum(GENRES),
  publisher: z.string().min(2).max(100),
  releaseYear: z.number().int().min(1970).max(new Date().getFullYear() + 2),
  stock: z.number().int().min(0).max(99999),
  isActive: z.boolean().optional()
});

const promotionFormSchema = z.object({
  name: z.string().min(3).max(120),
  minDistinctGames: z.number().int().min(2).max(10),
  discountPercent: z.number().min(1).max(90),
  isActive: z.boolean().default(true)
});

type GameFormValues = z.infer<typeof gameFormSchema>;
type PromotionFormValues = z.infer<typeof promotionFormSchema>;
type TabType = 'GAMES' | 'ORDERS' | 'PROMOTIONS';

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Oczekuje', color: 'bg-amber-500/10 text-amber-700' },
  SHIPPED: { label: 'Wyslane', color: 'bg-blue-500/10 text-blue-700' },
  COMPLETED: { label: 'Zrealizowane', color: 'bg-emerald-500/10 text-emerald-700' },
  CANCELLED: { label: 'Anulowane', color: 'bg-error/10 text-error' }
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block">{label}</label>
      {children}
      {error && <p className="text-error text-xs font-bold">{error}</p>}
    </div>
  );
}

export function ManageGamesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('GAMES');
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  const currentUserQuery = useCurrentUser();
  const isAdmin = currentUserQuery.data?.role === 'ADMIN';

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ games: Game[] }>('/games')
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiGet<{ orders: Order[] }>('/orders'),
    enabled: activeTab === 'ORDERS'
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: () => apiGet<{ promotions: Promotion[] }>('/promotions'),
    enabled: activeTab === 'PROMOTIONS'
  });

  const createGameForm = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      genre: 'ACTION',
      publisher: '',
      releaseYear: new Date().getFullYear(),
      stock: 100,
      isActive: true
    }
  });

  const editGameForm = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      genre: 'ACTION',
      publisher: '',
      releaseYear: new Date().getFullYear(),
      stock: 0,
      isActive: true
    }
  });

  const createPromotionForm = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: '',
      minDistinctGames: 2,
      discountPercent: 10,
      isActive: true
    }
  });

  const editPromotionForm = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: '',
      minDistinctGames: 2,
      discountPercent: 10,
      isActive: true
    }
  });

  const createGameMutation = useMutation({
    mutationFn: (values: GameFormValues) => apiPost('/games', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      createGameForm.reset();
    }
  });

  const updateGameMutation = useMutation({
    mutationFn: ({ gameId, values }: { gameId: string; values: Partial<GameFormValues> }) =>
      apiPatch(`/games/${gameId}`, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      setEditingGame(null);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const createPromotionMutation = useMutation({
    mutationFn: (values: PromotionFormValues) => apiPost('/promotions', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] });
      createPromotionForm.reset({
        name: '',
        minDistinctGames: 2,
        discountPercent: 10,
        isActive: true
      });
    }
  });

  const updatePromotionMutation = useMutation({
    mutationFn: ({ promotionId, values }: { promotionId: string; values: Partial<PromotionFormValues> }) =>
      apiPatch(`/promotions/${promotionId}`, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] });
      setEditingPromotion(null);
    }
  });

  const games = gamesQuery.data?.games ?? [];
  const orders = ordersQuery.data?.orders ?? [];
  const promotions = promotionsQuery.data?.promotions ?? [];

  return (
    <>
      <header className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
          Panel <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">Managera</span>
        </h1>
        <p className="text-on-surface-variant">Katalog gier, zamowienia i promocje w jednym miejscu.</p>
      </header>

      <div className="flex gap-1 bg-surface-container-low rounded-2xl p-1.5 mb-8 max-w-max">
        {[
          { id: 'GAMES', label: 'Katalog gier', icon: 'sports_esports' },
          { id: 'ORDERS', label: 'Zamowienia', icon: 'receipt_long' },
          { id: 'PROMOTIONS', label: 'Promocje', icon: 'local_offer' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
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

      {activeTab === 'GAMES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-xl mb-5">Dodaj nowa gre</h2>

            {createGameMutation.error instanceof ApiError && (
              <p className="text-error text-sm font-bold mb-3">{createGameMutation.error.message}</p>
            )}

            <form
              className="space-y-4"
              onSubmit={createGameForm.handleSubmit((values) => createGameMutation.mutate(values))}
            >
              <Field label="Tytul" error={createGameForm.formState.errors.title?.message}>
                <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('title')} />
              </Field>
              <Field label="Opis" error={createGameForm.formState.errors.description?.message}>
                <textarea className="w-full bg-surface-container-low rounded-xl py-3 px-4 resize-none" rows={3} {...createGameForm.register('description')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cena" error={createGameForm.formState.errors.price?.message}>
                  <input type="number" step="0.01" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('price', { valueAsNumber: true })} />
                </Field>
                <Field label="Stan" error={createGameForm.formState.errors.stock?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('stock', { valueAsNumber: true })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Gatunek" error={createGameForm.formState.errors.genre?.message}>
                  <select className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('genre')}>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>{formatGenre(g)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Rok" error={createGameForm.formState.errors.releaseYear?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('releaseYear', { valueAsNumber: true })} />
                </Field>
              </div>
              <Field label="Wydawca" error={createGameForm.formState.errors.publisher?.message}>
                <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createGameForm.register('publisher')} />
              </Field>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-primary text-white font-bold">
                Dodaj gre
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-xl mb-5">Katalog gier</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    {['Tytul', 'Cena', 'Stan', 'Status', 'Akcje'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold uppercase tracking-widest text-on-surface-variant pb-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id} className="border-b border-outline-variant/10">
                      <td className="py-3 font-bold">{game.title}</td>
                      <td className="py-3 font-semibold">{game.price === 0 ? 'FREE' : formatCurrency(game.price)}</td>
                      <td className="py-3">{game.stock}</td>
                      <td className="py-3">{game.isActive ? 'Aktywna' : 'Nieaktywna'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-bold"
                            onClick={() => {
                              setEditingGame(game);
                              editGameForm.reset({
                                title: game.title,
                                description: game.description,
                                price: game.price,
                                genre: game.genre,
                                publisher: game.publisher,
                                releaseYear: game.releaseYear,
                                stock: game.stock,
                                isActive: game.isActive
                              });
                            }}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${game.isActive ? 'bg-error/10 text-error' : 'bg-emerald-500/10 text-emerald-700'}`}
                            onClick={() => updateGameMutation.mutate({ gameId: game.id, values: { isActive: !game.isActive } })}
                          >
                            {game.isActive ? 'Dezaktywuj' : 'Aktywuj'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ORDERS' && (
        <div className="bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10 space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="rounded-2xl border border-outline-variant/15 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${STATUS_LABELS[order.status].color}`}>
                      {STATUS_LABELS[order.status].label}
                    </span>
                    <span className="text-xs text-on-surface-variant">{formatDate(order.createdAt)}</span>
                  </div>
                  <p className="font-bold">{order.game?.title}</p>
                  <p className="text-xs text-on-surface-variant">Kupujacy: {order.user?.fullName} ({order.user?.email})</p>
                </div>
                <div className="font-bold text-primary">{formatCurrency(order.totalPrice)}</div>
                <div className="flex gap-2 flex-wrap">
                  {order.status === 'PENDING' && (
                    <button className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 text-xs font-bold" onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'SHIPPED' })}>Wyslij</button>
                  )}
                  {order.status === 'SHIPPED' && (
                    <button className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 text-xs font-bold" onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'COMPLETED' })}>Dostarczono</button>
                  )}
                  {(order.status === 'PENDING' || order.status === 'SHIPPED') && (
                    <button className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-bold" onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'CANCELLED' })}>Anuluj</button>
                  )}
                  <button className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold" onClick={() => setSelectedOrder(order)}>
                    Szczegoly
                  </button>
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-on-surface-variant">Brak zamowien.</p>}
        </div>
      )}

      {activeTab === 'PROMOTIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-xl mb-5">Dodaj promocje</h2>
            {createPromotionMutation.error instanceof ApiError && (
              <p className="text-error text-sm font-bold mb-3">{createPromotionMutation.error.message}</p>
            )}
            <form className="space-y-4" onSubmit={createPromotionForm.handleSubmit((values) => createPromotionMutation.mutate(values))}>
              <Field label="Nazwa" error={createPromotionForm.formState.errors.name?.message}>
                <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createPromotionForm.register('name')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min. roznych gier" error={createPromotionForm.formState.errors.minDistinctGames?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createPromotionForm.register('minDistinctGames', { valueAsNumber: true })} />
                </Field>
                <Field label="Znizka %" error={createPromotionForm.formState.errors.discountPercent?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...createPromotionForm.register('discountPercent', { valueAsNumber: true })} />
                </Field>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-primary text-white font-bold">Zapisz promocje</button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-surface-container-lowest rounded-[2rem] p-7 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-xl mb-5">Aktywne promocje</h2>
            <div className="space-y-3">
              {promotions.map((promotion) => (
                <div key={promotion.id} className="rounded-2xl border border-outline-variant/15 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{promotion.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      Min. {promotion.minDistinctGames} roznych gier, znizka {promotion.discountPercent}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${promotion.isActive ? 'text-emerald-700' : 'text-error'}`}>
                      {promotion.isActive ? 'Aktywna' : 'Wylaczona'}
                    </span>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-bold"
                      onClick={() => {
                        setEditingPromotion(promotion);
                        editPromotionForm.reset({
                          name: promotion.name,
                          minDistinctGames: promotion.minDistinctGames,
                          discountPercent: promotion.discountPercent,
                          isActive: promotion.isActive
                        });
                      }}
                    >
                      Edytuj
                    </button>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-bold"
                      onClick={() => updatePromotionMutation.mutate({ promotionId: promotion.id, values: { isActive: !promotion.isActive } })}
                    >
                      {promotion.isActive ? 'Wylacz' : 'Wlacz'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingGame && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-surface-container-lowest p-7 border border-outline-variant/15">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline font-bold text-2xl">Edycja gry</h3>
              <button onClick={() => setEditingGame(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={editGameForm.handleSubmit((values) => {
                updateGameMutation.mutate({ gameId: editingGame.id, values });
              })}
            >
              <Field label="Tytul" error={editGameForm.formState.errors.title?.message}>
                <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editGameForm.register('title')} />
              </Field>
              <Field label="Opis" error={editGameForm.formState.errors.description?.message}>
                <textarea rows={3} className="w-full bg-surface-container-low rounded-xl py-3 px-4 resize-none" {...editGameForm.register('description')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Cena" error={editGameForm.formState.errors.price?.message}>
                  <input type="number" step="0.01" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editGameForm.register('price', { valueAsNumber: true })} />
                </Field>
                <Field label="Stan" error={editGameForm.formState.errors.stock?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editGameForm.register('stock', { valueAsNumber: true })} />
                </Field>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-primary text-white font-bold">
                Zapisz zmiany
              </button>
            </form>
          </div>
        </div>
      )}

      {editingPromotion && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-surface-container-lowest p-7 border border-outline-variant/15">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline font-bold text-2xl">Edycja promocji</h3>
              <button onClick={() => setEditingPromotion(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              className="space-y-4"
              onSubmit={editPromotionForm.handleSubmit((values) => {
                updatePromotionMutation.mutate({ promotionId: editingPromotion.id, values });
              })}
            >
              <Field label="Nazwa" error={editPromotionForm.formState.errors.name?.message}>
                <input className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editPromotionForm.register('name')} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min. roznych gier" error={editPromotionForm.formState.errors.minDistinctGames?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editPromotionForm.register('minDistinctGames', { valueAsNumber: true })} />
                </Field>
                <Field label="Znizka %" error={editPromotionForm.formState.errors.discountPercent?.message}>
                  <input type="number" className="w-full bg-surface-container-low rounded-xl py-3 px-4" {...editPromotionForm.register('discountPercent', { valueAsNumber: true })} />
                </Field>
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl bg-primary text-white font-bold">
                Zapisz promocje
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-surface-container-lowest p-7 border border-outline-variant/15">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline font-bold text-2xl">Szczegoly zamowienia</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <p><strong>Gra:</strong> {selectedOrder.game?.title}</p>
              <p><strong>Status:</strong> {STATUS_LABELS[selectedOrder.status].label}</p>
              <p><strong>Data:</strong> {formatDate(selectedOrder.createdAt)}</p>
              <p><strong>Cena:</strong> {formatCurrency(selectedOrder.totalPrice)}</p>
              <p><strong>Ilosc:</strong> {selectedOrder.quantity}</p>
              <p><strong>Kupujacy:</strong> {selectedOrder.user?.fullName} ({selectedOrder.user?.email})</p>
              {(isAdmin || currentUserQuery.data?.role === 'MANAGER') && (
                <>
                  <p><strong>Adres dostawy:</strong> {selectedOrder.address ?? 'Brak'}</p>
                  <p><strong>Telefon:</strong> {selectedOrder.phone ?? 'Brak'}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
