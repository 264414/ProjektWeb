import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { queryClient } from '../lib/query-client';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Game, Order, OrderStatus } from '../types/api';

interface CartItem {
  gameId: string;
  quantity: number;
}

interface OrderGroup {
  id: string;
  orders: Order[];
  createdAt: string;
  status: OrderStatus;
  totalPrice: number;
}

type WizardStep =
  | 'IDLE'
  | 'SELECT_GAME'
  | 'CONTACT'
  | 'PAYMENT'
  | 'BLIK'
  | 'BANK'
  | 'PROCESSING'
  | 'SUCCESS';

type DeliveryType = 'ELECTRONIC' | 'PHYSICAL';
type PaymentMethod = 'BLIK' | 'BANK';

const WIZARD_STEPS = [
  { label: 'Wybierz grę' },
  { label: 'Twoje dane' },
  { label: 'Płatność' },
  { label: 'Potwierdzenie' },
];

function stepToIdx(s: WizardStep): number {
  if (s === 'SELECT_GAME') return 0;
  if (s === 'CONTACT') return 1;
  if (s === 'PAYMENT' || s === 'BLIK' || s === 'BANK') return 2;
  return 3;
}

export function OrderPage() {
  const location = useLocation();
  const locationState = location.state as
    | { preselectGameId?: string; autoStart?: boolean }
    | null;
  const { data: user } = useCurrentUser();

  const [step, setStep] = useState<WizardStep>('IDLE');
  const [selectedGameId, setSelectedGameId] = useState(
    locationState?.preselectGameId ?? ''
  );
  const [cartItems, setCartItems] = useState<CartItem[]>(
    locationState?.preselectGameId ? [{ gameId: locationState.preselectGameId, quantity: 1 }] : []
  );
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('ELECTRONIC');
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [blikCode, setBlikCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const txId = useRef(Math.random().toString(36).substring(2, 10).toUpperCase());
  const blikRefs = useRef<(HTMLInputElement | null)[]>([]);

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ games: Game[] }>('/games'),
  });

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiGet<{ orders: Order[] }>('/orders'),
  });

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (locationState?.autoStart) {
      setStep('SELECT_GAME');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<{ order: Order; orders: Order[]; summary: { totalPrice: number; discountAmount: number; promotionName?: string | null } }>('/orders', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStep('SUCCESS');
    },
    onError: () => {
      setStep('PAYMENT');
    },
  });

  const activeGames =
    gamesQuery.data?.games.filter((g) => g.isActive && g.stock > 0) ?? [];
  const allGames = gamesQuery.data?.games ?? [];
  const selectedGame = allGames.find((g) => g.id === selectedGameId);
  const orders = ordersQuery.data?.orders ?? [];
  const totalPrice = cartItems.reduce((sum, item) => {
    const game = allGames.find((g) => g.id === item.gameId);
    return sum + (game ? game.price * item.quantity : 0);
  }, 0);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderGroup>();

    for (const order of orders) {
      const key = order.groupId ?? order.id;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          id: key,
          orders: [order],
          createdAt: order.createdAt,
          status: order.status,
          totalPrice: order.totalPrice
        });
        continue;
      }

      existing.orders.push(order);
      existing.totalPrice += order.totalPrice;
      if (new Date(order.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        existing.createdAt = order.createdAt;
      }
      if (order.status === 'CANCELLED') {
        existing.status = 'CANCELLED';
      } else if (order.status === 'PENDING') {
        existing.status = 'PENDING';
      } else if (order.status === 'SHIPPED' && existing.status !== 'PENDING') {
        existing.status = 'SHIPPED';
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders]);

  function validateStep1() {
    const e: Record<string, string> = {};
    if (cartItems.length === 0) e.gameId = 'Dodaj przynajmniej jedna gre do koszyka.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = 'Podaj imię i nazwisko.';
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      e.email = 'Podaj poprawny adres e-mail.';
    if (!/^[0-9+ \-]{9,15}$/.test(phone))
      e.phone = 'Nieprawidłowy numer telefonu (9–15 cyfr).';
    if (!street.trim() || street.trim().length < 3)
      e.street = 'Podaj ulice i numer budynku.';
    if (!city.trim() || city.trim().length < 2) e.city = 'Podaj miasto.';
    if (!/^\d{2}-\d{3}$/.test(postalCode))
      e.postalCode = 'Wymagany format: 00-000';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleStep1Next() {
    if (selectedGameId && !cartItems.some((item) => item.gameId === selectedGameId)) {
      setCartItems((prev) => [...prev, { gameId: selectedGameId, quantity }]);
    }

    if (validateStep1()) setStep('CONTACT');
  }

  function addSelectedGameToCart() {
    if (!selectedGameId) {
      setErrors({ gameId: 'Wybierz gre.' });
      return;
    }

    if (quantity < 1 || quantity > 10) {
      setErrors({ quantity: 'Ilosc musi wynosic 1-10.' });
      return;
    }

    setErrors({});
    setCartItems((prev) => {
      const existing = prev.find((item) => item.gameId === selectedGameId);
      if (!existing) {
        return [...prev, { gameId: selectedGameId, quantity }];
      }

      return prev.map((item) =>
        item.gameId === selectedGameId
          ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
          : item
      );
    });
  }

  function removeFromCart(gameId: string) {
    setCartItems((prev) => prev.filter((item) => item.gameId !== gameId));
  }

  function handleStep2Next() {
    if (validateStep2()) setStep('PAYMENT');
  }

  function handleSelectPayment(m: PaymentMethod) {
    setPaymentMethod(m);
    setStep(m === 'BLIK' ? 'BLIK' : 'BANK');
  }

  function triggerOrder() {
    setStep('PROCESSING');
    const address = `${street}, ${postalCode} ${city}`;
    setTimeout(() => {
      orderMutation.mutate({ items: cartItems, phone, address });
    }, 2200);
  }

  function handleBlikPay() {
    if (!/^\d{6}$/.test(blikCode)) {
      setErrors({ blikCode: 'Wpisz poprawny 6-cyfrowy kod BLIK.' });
      return;
    }
    setErrors({});
    triggerOrder();
  }

  function resetWizard() {
    setStep('IDLE');
    setSelectedGameId('');
    setCartItems([]);
    setDeliveryType('ELECTRONIC');
    setQuantity(1);
    setPhone('');
    setStreet('');
    setCity('');
    setPostalCode('');
    setPaymentMethod(null);
    setBlikCode('');
    setErrors({});
    txId.current = Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  const canClose = step !== 'PROCESSING';
  const activeIdx = stepToIdx(step);

  const statusMap: Record<
    string,
    { color: string; icon: string; label: string }
  > = {
    PENDING: {
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
      icon: 'pending',
      label: 'Oczekuje',
    },
    SHIPPED: {
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
      icon: 'local_shipping',
      label: 'Wysłane',
    },
    COMPLETED: {
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'check_circle',
      label: 'Zrealizowano',
    },
    CANCELLED: {
      color: 'text-error bg-error-container',
      icon: 'cancel',
      label: 'Anulowano',
    },
  };

  return (
    <>
      <header className="mb-10">
        <h1 className="font-headline text-5xl font-extrabold tracking-tight mb-3">
          Twoje{' '}
          <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
            Zamówienia
          </span>
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">
          Historia zakupów i zarządzanie licencjami w Twoim skarbcu.
        </p>
      </header>

      <div className="mb-10">
        <button
          onClick={() => setStep('SELECT_GAME')}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all"
        >
          <span className="material-symbols-outlined">add_shopping_cart</span>
          Kup nową grę
        </button>
      </div>

      {/* Order History */}
      <div className="space-y-4">
        {ordersQuery.isPending ? (
          <div className="text-center py-12 font-bold text-on-surface-variant">
            Ładowanie historii zamówień...
          </div>
        ) : groupedOrders.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-5xl text-outline-variant">
              receipt_long
            </span>
            <p className="font-bold text-lg">Brak zamówień</p>
            <p className="text-on-surface-variant text-sm">
              Twoja historia transakcji jest pusta.
            </p>
          </div>
        ) : (
          groupedOrders.map((group) => {
            const s = statusMap[group.status] ?? statusMap.PENDING;
            const groupAddress = group.orders[0]?.address;
            const groupPromotion = group.orders.find((item) => item.promotionName)?.promotionName;
            const groupDiscount = group.orders.reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
            return (
              <div
                key={group.id}
                className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${s.color}`}
                  >
                    <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                    {s.label}
                  </span>
                  <span className="text-xs text-on-surface-variant">• {formatDate(group.createdAt)}</span>
                  <span className="text-xs font-mono bg-surface-container-low px-2 py-1 rounded">
                    #{group.id.slice(-8).toUpperCase()}
                  </span>
                  {groupPromotion && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-700 px-2 py-1 rounded-full">
                      {groupPromotion}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {group.orders.map((order) => {
                    const seed = encodeURIComponent(`${order.game?.title ?? 'game'}-${order.id}`.toLowerCase().replace(/\s+/g, '-'));
                    const imageUrl = `https://picsum.photos/seed/${seed}/200/260`;

                    return (
                      <div key={order.id} className="rounded-2xl border border-outline-variant/10 p-3 flex items-center gap-3">
                        <img src={imageUrl} alt={order.game?.title ?? 'Game'} className="w-14 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{order.game?.title ?? '—'}</p>
                          <p className="text-xs text-on-surface-variant">Ilosc: {order.quantity} szt.</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(order.totalPrice)}</p>
                          {(order.discountAmount ?? 0) > 0 && (
                            <p className="text-[10px] text-emerald-700 font-bold">- {formatCurrency(order.discountAmount ?? 0)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/10 pt-4">
                  <div className="text-xs text-on-surface-variant">
                    {groupAddress && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                        {groupAddress}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {(groupDiscount ?? 0) > 0 && (
                      <p className="text-xs text-emerald-700 font-bold">Znizka: -{formatCurrency(groupDiscount)}</p>
                    )}
                    <p className="font-headline font-black text-xl text-primary">{formatCurrency(group.totalPrice)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ──────────── WIZARD OVERLAY ──────────── */}
      {step !== 'IDLE' && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-5xl rounded-[2rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
            {/* Stepper header */}
            <div className="bg-[#0c0e12] px-8 py-5 flex items-center gap-0">
              <div className="flex items-center gap-0 flex-1">
                {WIZARD_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          i < activeIdx
                            ? 'bg-emerald-500 text-white'
                            : i === activeIdx
                            ? 'bg-primary text-white ring-4 ring-primary/30'
                            : 'bg-white/10 text-white/30'
                        }`}
                      >
                        {i < activeIdx ? (
                          <span className="material-symbols-outlined text-[14px]">
                            check
                          </span>
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold hidden sm:block ${
                          i <= activeIdx ? 'text-white' : 'text-white/30'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-px mx-3 ${
                          i < activeIdx ? 'bg-emerald-500/40' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {canClose && (
                <button
                  onClick={resetWizard}
                  className="ml-6 text-white/30 hover:text-white transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left sidebar summary */}
              <div className="w-60 bg-[#111318] text-white p-7 flex-shrink-0 flex-col justify-between hidden md:flex">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-5">
                    Podsumowanie
                  </p>
                  {cartItems.length > 0 ? (
                    <>
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-2xl text-primary-container">
                          sports_esports
                        </span>
                      </div>
                      <h4 className="font-bold text-sm mb-1 leading-tight">Koszyk gier</h4>
                      <p className="text-white/40 text-xs mb-1">
                        {deliveryType === 'ELECTRONIC' ? '📧 Elektroniczna' : '📦 Pudełkowa'}
                      </p>
                      <p className="text-white/40 text-xs mb-4">Pozycji: {cartItems.length}</p>
                      <div className="h-px bg-white/10 my-3" />
                      <p className="text-white/40 text-[10px] mb-1">Do zapłaty</p>
                      <p className="font-headline font-black text-2xl text-emerald-400">
                        {formatCurrency(totalPrice)}
                      </p>
                    </>
                  ) : (
                    <p className="text-white/30 text-sm">Nie wybrano gry.</p>
                  )}
                </div>
                <p className="text-[10px] font-mono text-white/20 break-all">
                  TX/{txId.current}
                </p>
              </div>

              {/* Right step content */}
              <div className="flex-1 overflow-y-auto p-8 bg-surface-container-lowest">
                {/* ── STEP 1: SELECT GAME ── */}
                {step === 'SELECT_GAME' && (
                  <div>
                    <h2 className="font-headline font-bold text-2xl mb-1">
                      Wybierz grę
                    </h2>
                    <p className="text-on-surface-variant text-sm mb-5">
                      Wskaż tytuł i rodzaj dostawy.
                    </p>

                    {/* Delivery type toggle */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {(
                        [
                          {
                            type: 'ELECTRONIC' as DeliveryType,
                            icon: 'email',
                            title: 'Elektroniczna',
                            sub: 'Klucz aktywacyjny na e-mail',
                          },
                          {
                            type: 'PHYSICAL' as DeliveryType,
                            icon: 'inventory_2',
                            title: 'Pudełkowa',
                            sub: 'Dostawa fizyczna pod adres',
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => setDeliveryType(opt.type)}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            deliveryType === opt.type
                              ? 'border-primary bg-primary/5'
                              : 'border-outline-variant/20 hover:border-outline-variant/50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-primary text-xl">
                            {opt.icon}
                          </span>
                          <div className="text-left">
                            <p className="font-bold text-sm">{opt.title}</p>
                            <p className="text-xs text-on-surface-variant">
                              {opt.sub}
                            </p>
                          </div>
                          {deliveryType === opt.type && (
                            <span className="material-symbols-outlined text-primary ml-auto text-base">
                              check_circle
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Game list */}
                    {errors.gameId && (
                      <p className="text-error text-sm font-bold mb-3">
                        {errors.gameId}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto mb-5 pr-1">
                      {activeGames.map((game) => (
                        <button
                          key={game.id}
                          onClick={() => setSelectedGameId(game.id)}
                          className={`p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                            selectedGameId === game.id
                              ? 'border-primary bg-primary/5'
                              : 'border-outline-variant/20 hover:border-outline-variant/50'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-lg">
                              sports_esports
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">
                              {game.title}
                            </p>
                            <p className="text-primary font-bold text-xs">
                              {game.price === 0
                                ? 'DARMOWA'
                                : formatCurrency(game.price)}
                            </p>
                          </div>
                          {selectedGameId === game.id && (
                            <span className="material-symbols-outlined text-primary flex-shrink-0 text-base">
                              check_circle
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Quantity selector */}
                    <div className="flex items-center gap-4 mb-7">
                      <span className="text-sm font-bold text-on-surface-variant">
                        Ilość:
                      </span>
                      <div className="flex items-center bg-surface-container-low rounded-xl overflow-hidden">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-10 h-10 flex items-center justify-center font-black text-xl hover:bg-surface-container transition-colors"
                        >
                          −
                        </button>
                        <span className="font-black text-lg w-10 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                          className="w-10 h-10 flex items-center justify-center font-black text-xl hover:bg-surface-container transition-colors"
                        >
                          +
                        </button>
                      </div>
                      {errors.quantity && (
                        <p className="text-error text-xs font-bold">
                          {errors.quantity}
                        </p>
                      )}
                      {selectedGame && (
                        <p className="text-xs text-on-surface-variant">
                          Magazyn:{' '}
                          <strong className="text-on-surface">
                            {selectedGame.stock}
                          </strong>{' '}
                          szt.
                        </p>
                      )}
                    </div>

                    <button
                      onClick={addSelectedGameToCart}
                      className="w-full py-3 rounded-xl border border-outline-variant/20 bg-surface-container-low font-bold text-sm mb-4 hover:bg-surface-container transition-colors"
                    >
                      Dodaj wybrana gre do koszyka
                    </button>

                    <div className="mb-7 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                        Koszyk ({cartItems.length})
                      </p>
                      {cartItems.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">Brak gier w koszyku.</p>
                      ) : (
                        <div className="space-y-2">
                          {cartItems.map((item) => {
                            const game = allGames.find((entry) => entry.id === item.gameId);
                            if (!game) return null;

                            return (
                              <div key={item.gameId} className="flex items-center justify-between gap-3 bg-surface rounded-lg px-3 py-2">
                                <div>
                                  <p className="font-bold text-sm">{game.title}</p>
                                  <p className="text-xs text-on-surface-variant">{item.quantity} szt. • {formatCurrency(game.price * item.quantity)}</p>
                                </div>
                                <button
                                  onClick={() => removeFromCart(item.gameId)}
                                  className="text-error text-xs font-bold"
                                >
                                  Usun
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleStep1Next}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-base shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                    >
                      Dalej: Twoje dane
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                )}

                {/* ── STEP 2: CONTACT ── */}
                {step === 'CONTACT' && (
                  <div>
                    <h2 className="font-headline font-bold text-2xl mb-1">
                      Twoje dane
                    </h2>
                    <p className="text-on-surface-variant text-sm mb-5">
                      {deliveryType === 'PHYSICAL'
                        ? 'Dane kontaktowe i adres dostawy.'
                        : 'Dane kontaktowe — klucz trafi na podany e-mail.'}
                    </p>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                          Imię i nazwisko
                        </label>
                        <input
                          className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jan Kowalski"
                        />
                        {errors.fullName && (
                          <p className="text-error text-xs font-bold mt-1">
                            {errors.fullName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                          Adres e-mail
                        </label>
                        <input
                          className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jan@email.com"
                        />
                        {deliveryType === 'ELECTRONIC' && (
                          <p className="text-xs text-on-surface-variant mt-1 ml-1">
                            Klucz aktywacyjny zostanie wysłany na ten adres.
                          </p>
                        )}
                        {errors.email && (
                          <p className="text-error text-xs font-bold mt-1">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                          Numer telefonu
                        </label>
                        <input
                          className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+48 123 456 789"
                        />
                        {errors.phone && (
                          <p className="text-error text-xs font-bold mt-1">
                            {errors.phone}
                          </p>
                        )}
                      </div>

                      <>
                        <div className="pt-3 pb-1 border-t border-outline-variant/20">
                          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            Adres dostawy (wymagany)
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                            Ulica i numer
                          </label>
                          <input
                            className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="ul. Kwiatowa 12/3"
                          />
                          {errors.street && (
                            <p className="text-error text-xs font-bold mt-1">
                              {errors.street}
                            </p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                              Miasto
                            </label>
                            <input
                              className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Warszawa"
                            />
                            {errors.city && (
                              <p className="text-error text-xs font-bold mt-1">
                                {errors.city}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                              Kod pocztowy
                            </label>
                            <input
                              className="w-full bg-surface-container-low rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-primary outline-none font-medium"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              placeholder="00-000"
                              maxLength={6}
                            />
                            {errors.postalCode && (
                              <p className="text-error text-xs font-bold mt-1">
                                {errors.postalCode}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep('SELECT_GAME')}
                        className="px-5 py-4 rounded-2xl bg-surface-container-high font-bold hover:bg-surface-container-highest transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          arrow_back
                        </span>
                      </button>
                      <button
                        onClick={handleStep2Next}
                        className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-base shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                      >
                        Dalej: Płatność
                        <span className="material-symbols-outlined">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: PAYMENT METHOD ── */}
                {step === 'PAYMENT' && (
                  <div>
                    <h2 className="font-headline font-bold text-2xl mb-1">
                      Metoda płatności
                    </h2>
                    <p className="text-on-surface-variant text-sm mb-7">
                      Wybierz preferowany sposób opłacenia zamówienia.
                    </p>

                    <div className="space-y-4 mb-8">
                      <button
                        onClick={() => handleSelectPayment('BLIK')}
                        className="w-full p-5 rounded-2xl border-2 border-outline-variant/20 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-black text-xs tracking-widest">
                            BLIK
                          </span>
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-base">BLIK</p>
                          <p className="text-sm text-on-surface-variant">
                            6-cyfrowy kod z aplikacji bankowej
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      </button>

                      <button
                        onClick={() => handleSelectPayment('BANK')}
                        className="w-full p-5 rounded-2xl border-2 border-outline-variant/20 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-2xl">
                            account_balance
                          </span>
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-base">Przelew tradycyjny</p>
                          <p className="text-sm text-on-surface-variant">
                            Przelew bankowy na konto GameVault
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">
                          chevron_right
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => setStep('CONTACT')}
                      className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>{' '}
                      Wróć
                    </button>
                  </div>
                )}

                {/* ── STEP 3a: BLIK ── */}
                {step === 'BLIK' && (
                  <div>
                    <h2 className="font-headline font-bold text-2xl mb-1">
                      Płatność BLIK
                    </h2>
                    <p className="text-on-surface-variant text-sm mb-7">
                      Wpisz 6-cyfrowy kod BLIK z aplikacji mobilnej swojego banku.
                    </p>

                    <div className="flex justify-center mb-4">
                      <div className="flex gap-2.5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              blikRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={blikCode[i] ?? ''}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, '').slice(-1);
                              const arr = Array.from({ length: 6 }, (_, k) =>
                                blikCode[k] ?? ''
                              );
                              arr[i] = v;
                              setBlikCode(arr.join(''));
                              if (v && i < 5) blikRefs.current[i + 1]?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (
                                e.key === 'Backspace' &&
                                !blikCode[i] &&
                                i > 0
                              )
                                blikRefs.current[i - 1]?.focus();
                            }}
                            className="w-12 h-16 text-center text-3xl font-black rounded-xl bg-surface-container-low border-2 border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          />
                        ))}
                      </div>
                    </div>

                    {errors.blikCode && (
                      <p className="text-error text-sm font-bold text-center mb-4">
                        {errors.blikCode}
                      </p>
                    )}
                    {orderMutation.error instanceof ApiError && (
                      <p className="text-error text-sm font-bold text-center mb-4">
                        {orderMutation.error.message}
                      </p>
                    )}

                    <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3 mb-7">
                      <span className="material-symbols-outlined text-primary text-xl">
                        lock
                      </span>
                      <p className="text-xs text-on-surface-variant">
                        Transakcja zabezpieczona. Kod BLIK jest ważny przez 2 minuty.
                      </p>
                    </div>

                    <button
                      onClick={handleBlikPay}
                      className="w-full py-5 rounded-2xl bg-black text-white font-bold text-lg shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 mb-4"
                    >
                      <span className="font-black tracking-widest text-sm bg-white/10 px-2 py-0.5 rounded">
                        BLIK
                      </span>
                      Zapłać {formatCurrency(totalPrice)}
                    </button>

                    <button
                      onClick={() => {
                        setStep('PAYMENT');
                        setBlikCode('');
                        setErrors({});
                      }}
                      className="w-full flex items-center justify-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Zmień metodę płatności
                    </button>
                  </div>
                )}

                {/* ── STEP 3b: BANK TRANSFER ── */}
                {step === 'BANK' && (
                  <div>
                    <h2 className="font-headline font-bold text-2xl mb-1">
                      Przelew tradycyjny
                    </h2>
                    <p className="text-on-surface-variant text-sm mb-5">
                      Wykonaj przelew na poniższe dane bankowe, a następnie kliknij
                      potwierdzenie.
                    </p>

                    <div className="bg-surface-container-low rounded-2xl divide-y divide-outline-variant/10 mb-6 border border-outline-variant/20 overflow-hidden">
                      {[
                        {
                          label: 'Odbiorca',
                          value: 'GameVault sp. z o.o.',
                          mono: false,
                        },
                        {
                          label: 'IBAN',
                          value: 'PL 61 1090 1014 0000 0712 1981 2874',
                          mono: true,
                        },
                        {
                          label: 'Kwota',
                          value: formatCurrency(totalPrice),
                          mono: false,
                        },
                        {
                          label: 'Tytuł przelewu',
                          value: `Zamówienie #${txId.current}`,
                          mono: true,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="px-6 py-4 flex justify-between items-center gap-4"
                        >
                          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex-shrink-0">
                            {row.label}
                          </span>
                          <span
                            className={`font-bold text-sm text-right ${
                              row.mono ? 'font-mono' : ''
                            }`}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {orderMutation.error instanceof ApiError && (
                      <p className="text-error text-sm font-bold mb-4">
                        {orderMutation.error.message}
                      </p>
                    )}

                    <button
                      onClick={triggerOrder}
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-on-primary font-bold text-base shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 mb-4"
                    >
                      <span className="material-symbols-outlined">
                        account_balance
                      </span>
                      Potwierdzam wykonanie przelewu
                    </button>

                    <button
                      onClick={() => setStep('PAYMENT')}
                      className="w-full flex items-center justify-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined">arrow_back</span>
                      Zmień metodę płatności
                    </button>
                  </div>
                )}

                {/* ── PROCESSING ── */}
                {step === 'PROCESSING' && (
                  <div className="flex flex-col items-center justify-center min-h-64 text-center py-12">
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl text-primary animate-pulse">
                          lock
                        </span>
                      </div>
                    </div>
                    <h3 className="font-headline font-bold text-2xl mb-3">
                      Przetwarzanie płatności
                    </h3>
                    <p className="text-on-surface-variant mb-2">
                      Trwa weryfikacja transakcji. Nie zamykaj okna.
                    </p>
                    <p className="text-xs text-primary font-bold animate-pulse">
                      Łączenie z serwerem płatności...
                    </p>
                  </div>
                )}

                {/* ── SUCCESS ── */}
                {step === 'SUCCESS' && (
                  <div className="flex flex-col items-center justify-center min-h-64 text-center py-8 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                      <span className="material-symbols-outlined text-5xl text-emerald-500">
                        check_circle
                      </span>
                    </div>
                    <h3 className="font-headline font-bold text-3xl mb-2 text-emerald-600 dark:text-emerald-400">
                      Zamówienie potwierdzone!
                    </h3>
                    <p className="text-on-surface-variant mb-5 max-w-sm">
                      Twoja płatność została zweryfikowana. Dziękujemy za zakup w
                      GameVault!
                    </p>

                    {deliveryType === 'ELECTRONIC' ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4 mb-8 max-w-sm w-full">
                        <p className="text-sm font-bold text-primary flex items-center gap-1 justify-center mb-1">
                          <span className="material-symbols-outlined text-base">
                            email
                          </span>
                          Klucz aktywacyjny wysłany na:
                        </p>
                        <p className="font-mono font-bold text-on-surface">
                          {email}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-secondary/5 border border-secondary/20 rounded-2xl px-6 py-4 mb-8 max-w-sm w-full">
                        <p className="text-sm font-bold text-secondary flex items-center gap-1 justify-center mb-1">
                          <span className="material-symbols-outlined text-base">
                            local_shipping
                          </span>
                          Przesyłka zostanie dostarczona na:
                        </p>
                        <p className="font-mono font-bold text-on-surface">
                          {street}, {postalCode} {city}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={resetWizard}
                      className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-10 py-4 rounded-2xl font-bold transition-colors"
                    >
                      Wróć do zamówień
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
