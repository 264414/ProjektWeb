import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCurrentUser, currentUserQueryKey } from '../hooks/useCurrentUser';
import { apiPost } from '../lib/api';
import { queryClient } from '../lib/query-client';

export function TopNavBar() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !!user;
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  const logoutMutation = useMutation({
    mutationFn: () => apiPost<{ message: string }>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      navigate('/login', {
        replace: true,
        state: { message: 'Sesja została bezpiecznie zakończona.' }
      });
    }
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-indigo-600 text-white rounded-full px-5 py-2 shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300 font-label text-sm font-medium'
      : 'text-slate-600 dark:text-slate-400 px-4 py-2 hover:-translate-y-0.5 hover:text-indigo-500 transition-all duration-300 font-label text-sm font-medium';

  const roleLabel: Record<string, { label: string; color: string }> = {
    ADMIN:   { label: 'Administrator', color: 'text-error' },
    MANAGER: { label: 'Manager',       color: 'text-secondary' },
    USER:    { label: 'Użytkownik',    color: 'text-on-surface-variant' },
  };
  const roleInfo = user ? (roleLabel[user.role] ?? roleLabel.USER) : roleLabel.USER;

  return (
    <header className="fixed top-0 w-full z-[100] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm dark:shadow-none border-b border-surface-variant">
      <div className="flex justify-between items-center px-4 md:px-8 py-3 w-full max-w-screen-2xl mx-auto">

        {/* Logo */}
        <Link
          to="/"
          className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-headline flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-primary text-3xl">sports_esports</span>
          GameVault
        </Link>

        {/* Main nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavLink className={navLinkClass} to="/" end>Strona główna</NavLink>
          {isLoggedIn && (
            <>
              <NavLink className={navLinkClass} to="/dashboard">Dashboard</NavLink>
              <NavLink className={navLinkClass} to="/games">Sklep</NavLink>
              <NavLink className={navLinkClass} to="/orders">Zamówienia</NavLink>
              <NavLink className={navLinkClass} to="/reviews">Recenzje</NavLink>
            </>
          )}
        </nav>

        {/* Right side */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3 relative" ref={dropdownRef}>
            {/* Avatar + name button */}
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-3 hover:bg-surface-container-low rounded-2xl px-3 py-2 transition-colors"
            >
              <img
                alt={`${user.fullName} avatar`}
                className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shadow-sm flex-shrink-0"
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=4647d3&color=fff`}
              />
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-bold text-on-surface leading-none">
                  {user.fullName}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              <span
                className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-200 hidden sm:block ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">

                {/* User header */}
                <div className="px-5 py-4 border-b border-outline-variant/10 bg-surface-container-low/50">
                  <p className="font-bold text-sm text-on-surface">{user.fullName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                  <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 inline-block ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>

                {/* Common links */}
                <div className="p-2">
                  {[
                    { to: '/dashboard',        icon: 'dashboard',    label: 'Dashboard' },
                    { to: '/games',            icon: 'storefront',   label: 'Sklep' },
                    { to: '/orders',           icon: 'receipt_long', label: 'Zamówienia' },
                    { to: '/reviews',          icon: 'star',         label: 'Recenzje' },
                    { to: '/account/password', icon: 'lock',         label: 'Zmień hasło' },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container-low transition-colors text-sm font-medium text-on-surface"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>

                {/* Manager / Admin links */}
                {isManager && (
                  <>
                    <div className="px-4 pt-2 pb-1 border-t border-outline-variant/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50">
                        {isAdmin ? 'Panel admina' : 'Panel managera'}
                      </p>
                    </div>
                    <div className="p-2 pt-0">
                      <Link
                        to="/manage/games"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/10 transition-colors text-sm font-bold text-secondary"
                      >
                        <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                        Panel managera
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error/10 transition-colors text-sm font-bold text-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                          Panel administratora
                        </Link>
                      )}
                    </div>
                  </>
                )}

                {/* Logout */}
                <div className="p-2 border-t border-outline-variant/10">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-error/10 transition-colors text-sm font-bold text-error disabled:opacity-50"
                    onClick={() => {
                      setDropdownOpen(false);
                      logoutMutation.mutate();
                    }}
                    disabled={logoutMutation.isPending}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    {logoutMutation.isPending ? 'Wylogowywanie...' : 'Wyloguj się'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="font-bold text-sm text-primary hover:text-primary-dim transition-colors px-4 py-2"
            >
              Zaloguj się
            </Link>
            <Link
              to="/register"
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm tracking-tight active:scale-95 transition-all hidden sm:block shadow-lg shadow-primary/20"
            >
              Dołącz teraz
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
