import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ReviewsSection } from '../components/ReviewsSection';
import { TopNavBar } from '../components/TopNavBar';
import { apiGet } from '../lib/api';
import type { FaqItem } from '../types/api';

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const faqQuery = useQuery({
    queryKey: ['faq', 'public'],
    queryFn: () => apiGet<{ faqItems: FaqItem[] }>('/faq')
  });

  const faqItems = faqQuery.data?.faqItems ?? [];

  return (
    <section className="py-24 px-8 bg-surface-container-low">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase mb-4">
            <span className="material-symbols-outlined text-sm">help</span>
            FAQ
          </div>
          <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tighter mb-3">Często zadawane pytania</h2>
          <p className="text-on-surface-variant">Wszystko co musisz wiedzieć o GameVault.</p>
        </div>
        {faqQuery.isPending && (
          <div className="space-y-3">
            {[1, 2, 3].map((placeholder) => (
              <div key={placeholder} className="h-16 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 animate-pulse" />
            ))}
          </div>
        )}
        {!faqQuery.isPending && faqItems.length === 0 && (
          <div className="text-center py-8 text-on-surface-variant">
            Brak pytań FAQ w bazie danych.
          </div>
        )}
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div key={item.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-container-low/50 transition-colors gap-4"
              >
                <span className="font-bold text-on-surface">{item.question}</span>
                <span className={`material-symbols-outlined text-primary flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-on-surface-variant leading-relaxed text-sm border-t border-outline-variant/10 pt-4">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { data: user } = useCurrentUser();
  const isLoggedIn = !!user;

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      <TopNavBar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-8 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8 z-10">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold tracking-widest uppercase">
              Ethereal Gaming Experience
            </div>
            <h1 className="font-headline font-extrabold text-7xl leading-[1.1] text-on-surface tracking-tighter">
              Your Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">Gaming Vault</span>.
            </h1>
            <p className="text-on-surface-variant text-xl max-w-xl leading-relaxed font-medium">
              A digital sanctuary curated for the modern gamer. Store your legacy, explore new realms, and connect with the global elite.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {isLoggedIn ? (
                <>
                  <Link to="/games" className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-10 py-5 rounded-xl font-bold text-lg shadow-[0px_10px_40px_rgba(99,102,241,0.2)] active:scale-95 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined">storefront</span>
                    Przeglądaj sklep
                  </Link>
                  <Link to="/orders" className="px-10 py-5 rounded-xl font-bold text-lg text-primary border border-outline-variant/15 hover:bg-surface-container-low transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined">receipt_long</span>
                    Moje zamówienia
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-10 py-5 rounded-xl font-bold text-lg shadow-[0px_10px_40px_rgba(99,102,241,0.2)] active:scale-95 transition-all">Get Started</Link>
                  <Link to="/login" className="px-10 py-5 rounded-xl font-bold text-lg text-primary border border-outline-variant/15 hover:bg-surface-container-low transition-all">Zaloguj się</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]"></div>
            <div className="relative grid grid-cols-2 gap-6 stagger-grid">
              <div className="space-y-6 pt-12">
                <div className="rounded-xl overflow-hidden shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <img className="w-full h-80 object-cover" src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2670" alt="Cinematic gaming setup" />
                </div>
                <div className="bg-white/60 dark:bg-black/60 backdrop-blur-xl p-6 rounded-xl shadow-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-tertiary-container">military_tech</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Players</p>
                      <p className="text-2xl font-headline font-black text-on-surface">2.4M+</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  <img className="w-full h-96 object-cover" src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2000" alt="Vibrant digital landscape" />
                </div>
                <div className="bg-primary p-6 rounded-xl shadow-xl text-on-primary">
                  <p className="text-[40px] font-headline font-black leading-none mb-2">99%</p>
                  <p className="text-sm font-medium opacity-90">Uptime for seamless library synchronization.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games Section */}
      <section id="catalog" className="py-24 px-8 bg-surface-container-low">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div className="space-y-4">
              <h2 className="font-headline font-extrabold text-5xl text-on-surface tracking-tighter">Vault Favorites</h2>
              <p className="text-on-surface-variant font-medium">Curated masterpieces ready for instant playback.</p>
            </div>
            <Link to="/games" className="group flex items-center gap-2 font-bold text-primary hover:gap-4 transition-all">
              Pełny katalog <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(48,41,80,0.04)] hover:shadow-[0px_10px_40px_rgba(99,102,241,0.08)] transition-all duration-500">
              <div className="h-64 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&w=800" alt="Cyberpunk city" />
                <div className="absolute top-4 right-4 bg-tertiary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Prestige</div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-headline font-bold text-2xl text-on-surface">Cyberpunk 2077</h3>
                  <span className="text-primary font-bold">$59.99</span>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-6">Explore the sprawling neon metropolis of Night City in this definitive RPG experience.</p>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">RPG</span>
                </div>
              </div>
            </div>
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(48,41,80,0.04)] hover:shadow-[0px_10px_40px_rgba(99,102,241,0.08)] transition-all duration-500 md:mt-12">
              <div className="h-64 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=2684" alt="Medieval forest" />
                <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Classic</div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-headline font-bold text-2xl text-on-surface">The Witcher 3</h3>
                  <span className="text-primary font-bold">$39.99</span>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-6">Become a monster slayer for hire and embark on an epic journey to find the child of prophecy.</p>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">Adventure</span>
                </div>
              </div>
            </div>
            <div className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(48,41,80,0.04)] hover:shadow-[0px_10px_40px_rgba(99,102,241,0.08)] transition-all duration-500">
              <div className="h-64 overflow-hidden relative">
                <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&q=80&w=2584" alt="Esports stadium" />
                <div className="absolute top-4 right-4 bg-error text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Trending</div>
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-headline font-bold text-2xl text-on-surface">Counter-Strike 2</h3>
                  <span className="text-primary font-bold">Free</span>
                </div>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-6">The next era of the world's premier tactical shooter has arrived with enhanced visuals.</p>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">FPS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Community Reviews Section */}
      <section id="community" className="py-24 px-8 bg-surface">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase">
              <span className="material-symbols-outlined text-sm">forum</span>
              Opinie Graczy
            </div>
            <h2 className="font-headline font-extrabold text-5xl text-on-surface tracking-tighter">Co mówi nasza społeczność</h2>
            <p className="text-on-surface-variant font-medium max-w-xl mx-auto">Recenzje pisane przez prawdziwych graczy — bez filtrów, bez cenzury.</p>
          </div>
          <ReviewsSection />
        </div>
      </section>


      <section className="py-32 px-8 relative overflow-hidden bg-surface">
        <div className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-tertiary opacity-90"></div>
          <div className="relative z-10 p-16 md:p-24 text-center space-y-10">
            <h2 className="font-headline font-black text-6xl text-on-primary tracking-tight">Ready to Enter the <br/>Ethereal Arena?</h2>
            <p className="text-on-primary/80 text-xl max-w-2xl mx-auto font-medium">Join over 2 million gamers already using GameVault to curate their digital legacy.</p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-6">
              {isLoggedIn ? (
                <>
                  <Link to="/games" className="bg-surface-container-lowest text-primary px-12 py-5 rounded-xl font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 justify-center">
                    <span className="material-symbols-outlined">storefront</span>
                    Przejdź do sklepu
                  </Link>
                  <Link to="/dashboard" className="bg-white/10 text-white border border-white/20 px-12 py-5 rounded-xl font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 justify-center">
                    <span className="material-symbols-outlined">dashboard</span>
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link to="/register" className="bg-surface-container-lowest text-primary px-12 py-5 rounded-xl font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all">Dołącz do GameVault</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection />

      {/* Footer */}
      <footer className="w-full rounded-t-[2rem] bg-[#f4eeff] dark:bg-[#120f1a]">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 gap-8 max-w-screen-2xl mx-auto">
          <div className="space-y-4 text-center md:text-left">
            <div className="text-xl font-bold text-[#302950] dark:text-[#faf4ff] italic font-headline font-black tracking-tighter">GameVault</div>
            <p className="font-body text-sm text-[#302950]/60 dark:text-[#faf4ff]/60 max-w-xs">The premium digital ecosystem for curators and enthusiasts of gaming excellence.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            <a className="font-body text-sm text-[#302950]/60 dark:text-[#faf4ff]/60 hover:text-[#6366F1] transition-colors" href="#">Privacy</a>
            <a className="font-body text-sm text-[#302950]/60 dark:text-[#faf4ff]/60 hover:text-[#6366F1] transition-colors" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
