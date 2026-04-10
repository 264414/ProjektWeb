import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, apiGet } from '../lib/api';
import { formatCurrency, formatGenre } from '../lib/format';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { Game, LivePurchaseEvent } from '../types/api';

const GENRES = ['ACTION', 'RPG', 'STRATEGY', 'SPORTS', 'HORROR', 'ADVENTURE', 'PUZZLE', 'SIMULATION'] as const;
type FilterTab = 'ALL' | 'BESTSELLERS';

export function GamesPage() {
  const currentUserQuery = useCurrentUser();
  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ games: Game[] }>('/games'),
  });

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('ALL');
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const [latestPurchase, setLatestPurchase] = useState<LivePurchaseEvent | null>(null);

  const user = currentUserQuery.data;
  const isPrivileged = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const filteredGames = useMemo(() => {
    let list = gamesQuery.data?.games ?? [];

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.publisher.toLowerCase().includes(q) ||
          formatGenre(g.genre).toLowerCase().includes(q)
      );
    }

    // Genre filter
    if (genreFilter) {
      list = list.filter((g) => g.genre === genreFilter);
    }

    // Bestsellers = most reviews
    if (tab === 'BESTSELLERS') {
      list = [...list].sort(
        (a, b) =>
          (b.purchaseStats?.uniqueBuyersCount ?? 0) -
            (a.purchaseStats?.uniqueBuyersCount ?? 0) ||
          (b.purchaseStats?.completedOrdersCount ?? 0) - (a.purchaseStats?.completedOrdersCount ?? 0)
      );
      list = list.slice(0, 3);
    }

    return list;
  }, [gamesQuery.data, search, genreFilter, tab]);

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL.slice(0, -1)
      : import.meta.env.BASE_URL;
    const streamUrl = `${basePath}/api/games/live-purchases`;
    const stream = new EventSource(streamUrl);

    const onPurchase = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as LivePurchaseEvent;
        setLatestPurchase(payload);
      } catch {
        // Ignore malformed event payloads.
      }
    };

    stream.addEventListener('purchase', onPurchase);

    return () => {
      stream.removeEventListener('purchase', onPurchase);
      stream.close();
    };
  }, []);

  if (gamesQuery.isPending) {
    return (
      <div className="flex justify-center items-center py-20 text-on-surface-variant font-bold">
        Ładowanie katalogu gier...
      </div>
    );
  }

  if (gamesQuery.error instanceof ApiError) {
    return (
      <div className="bg-error-container text-on-error-container p-4 rounded-xl font-bold">
        {gamesQuery.error.message}
      </div>
    );
  }

  return (
    <>
      <header className="mb-10">
        <h1 className="font-headline text-5xl font-extrabold tracking-tight mb-4">
          Cyfrowy{' '}
          <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
            Katalog
          </span>
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">
          Eksploruj naszą rosnącą bibliotekę. Znajdź swój następny tytuł i dołącz do rozgrywki.
        </p>
      </header>

      {/* Toolbar */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tab toggle */}
        <div className="flex bg-surface-container-low rounded-xl p-1 shadow-inner max-w-max">
          <button
            onClick={() => setTab('ALL')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              tab === 'ALL'
                ? 'bg-surface shadow text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            Pełna kolekcja
          </button>
          <button
            onClick={() => setTab('BESTSELLERS')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              tab === 'BESTSELLERS'
                ? 'bg-surface shadow text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            Bestsellery
          </button>
        </div>

        {/* Search + genre filter */}
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-72">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary transition-all text-on-surface placeholder:text-on-surface-variant/50 outline-none"
              placeholder="Szukaj gry, wydawcy..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Genre filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGenreMenu((v) => !v)}
              className={`h-full px-4 rounded-xl border transition-colors flex items-center justify-center gap-2 text-sm font-bold ${
                genreFilter
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              {genreFilter ? formatGenre(genreFilter as (typeof GENRES)[number]) : ''}
            </button>

            {showGenreMenu && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden z-50">
                <button
                  onClick={() => { setGenreFilter(null); setShowGenreMenu(false); }}
                  className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-container-low transition-colors ${!genreFilter ? 'text-primary' : 'text-on-surface'}`}
                >
                  Wszystkie gatunki
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => { setGenreFilter(g); setShowGenreMenu(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-surface-container-low transition-colors ${genreFilter === g ? 'text-primary font-bold' : 'text-on-surface'}`}
                  >
                    {formatGenre(g)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isPrivileged && (
            <Link
              to="/manage/games"
              className="bg-primary text-white font-bold px-4 rounded-xl shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center group"
            >
              <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
            </Link>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
          {filteredGames.length} {tab === 'BESTSELLERS' ? 'bestsellerów' : 'tytułów'}
        </span>
        {tab === 'BESTSELLERS' && (
          <span className="bg-amber-500/10 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">
            Top 3 wg liczby kupujących
          </span>
        )}
        {genreFilter && (
          <button
            onClick={() => setGenreFilter(null)}
            className="flex items-center gap-1 bg-secondary/10 text-secondary px-3 py-1 rounded-full text-xs font-bold hover:bg-secondary/20 transition-colors"
          >
            {formatGenre(genreFilter as (typeof GENRES)[number])}
            <span className="material-symbols-outlined text-[12px]">close</span>
          </button>
        )}
        {search && (
          <button
            onClick={() => setSearch('')}
            className="flex items-center gap-1 bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold hover:bg-surface-container-highest transition-colors"
          >
            "{search}"
            <span className="material-symbols-outlined text-[12px]">close</span>
          </button>
        )}
      </div>

      {latestPurchase && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3 text-emerald-800">
          <span className="material-symbols-outlined">campaign</span>
          <p className="text-sm font-semibold">
            Ktos wlasnie kupil: {latestPurchase.gameTitle} (x{latestPurchase.quantity}).
          </p>
        </div>
      )}

      {/* Grid */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant font-medium bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/30">
          <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">search_off</span>
          Brak gier pasujących do kryteriów.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredGames.map((game, index) => {
            const seed = encodeURIComponent(
              game.title.replace(/\s+/g, '-').toLowerCase() + index
            );
            const coverUrl = `https://picsum.photos/seed/${seed}/600/800`;

            return (
              <div
                key={game.id}
                className="bg-surface-container-lowest rounded-[2rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500 shadow-sm hover:shadow-2xl border border-outline-variant/5 flex flex-col"
              >
                {/* Cover */}
                <div className="relative h-72 w-full overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 blur-[2px] group-hover:blur-0"
                    src={coverUrl}
                    alt="Game Cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  <div className="absolute top-5 left-5">
                    <span className="bg-white/10 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-xl">
                      {formatGenre(game.genre)}
                    </span>
                  </div>

                  {isPrivileged && !game.isActive ? (
                    <div className="absolute top-5 right-5">
                      <span className="bg-error/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">visibility_off</span>
                        Ukryta
                      </span>
                    </div>
                  ) : null}

                  <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end">
                    <h3
                      className="font-headline text-2xl font-black text-white leading-tight pr-4"
                      title={game.title}
                    >
                      {game.title}
                    </h3>
                    <div className="flex bg-primary text-white border-2 border-primary/20 shadow-lg px-3 py-2 rounded-xl rotate-3 group-hover:rotate-0 transition-transform flex-shrink-0">
                      <span className="font-black text-lg">
                        {game.price === 0 ? 'FREE' : formatCurrency(game.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 flex flex-col flex-grow bg-surface-container-lowest relative">
                  <div className="flex justify-between items-center mb-4 text-xs font-semibold text-on-surface-variant">
                    <span className="flex items-center gap-1.5 uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                      {game.publisher}
                    </span>
                    <span className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[14px]">event</span>
                      {game.releaseYear}
                    </span>
                  </div>

                  <p
                    className="text-on-surface-variant text-sm line-clamp-3 mb-6 flex-grow leading-relaxed"
                    title={game.description}
                  >
                    {game.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto border-t border-outline-variant/10 pt-5">
                    <span className="flex items-center gap-1 text-xs font-bold text-on-surface-variant bg-surface-container-low px-2.5 py-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                      {game._count?.reviews ?? 0} Recenzji
                    </span>
                    {game.stock < 10 && game.stock > 0 ? (
                      <span className="text-[10px] font-bold text-error uppercase tracking-widest bg-error-container px-2 py-1 rounded">
                        Ostatnie: {game.stock}
                      </span>
                    ) : game.stock === 0 ? (
                      <span className="text-[10px] font-bold text-error uppercase tracking-widest bg-error-container px-2 py-1 rounded">
                        Wyprzedano
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        Dostępna
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <div className="rounded-lg bg-primary/10 text-primary px-2.5 py-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">shopping_cart</span>
                      Zakupy: {game.purchaseStats?.completedOrdersCount ?? 0}
                    </div>
                    <div className="rounded-lg bg-secondary/10 text-secondary px-2.5 py-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">groups</span>
                      Kupilo osob: {game.purchaseStats?.uniqueBuyersCount ?? 0}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="p-4 bg-surface-container/50 border-t border-outline-variant/5">
                  <Link
                    to="/orders"
                    state={{ preselectGameId: game.id, autoStart: true }}
                    className="w-full bg-[#1a1b1e] dark:bg-white text-white dark:text-black font-bold py-3.5 rounded-xl shadow-md hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 group/btn"
                  >
                    <span className="material-symbols-outlined text-xl group-hover/btn:-translate-y-1 transition-transform">
                      {game.price === 0 ? 'play_arrow' : 'shopping_bag'}
                    </span>
                    {game.price === 0 ? 'Zagraj za darmo' : 'Dodaj do biblioteki'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
