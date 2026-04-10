import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import type { Review } from '../types/api';

export function ReviewsSection() {
  const reviewsQuery = useQuery({
    queryKey: ['reviews', 'public'],
    queryFn: () => apiGet<{ reviews: Review[] }>('/reviews/public')
  });

  const reviews = reviewsQuery.data?.reviews ?? [];

  if (reviewsQuery.isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 animate-pulse h-48" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">rate_review</span>
        <p className="font-medium">Brak recenzji. Bądź pierwszym recenzentem!</p>
      </div>
    );
  }

  const starIcons = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`material-symbols-outlined text-lg ${i < rating ? 'text-amber-400' : 'text-surface-container-highest'}`}
        style={i < rating ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        star
      </span>
    ));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-default">
          <div className="flex items-center gap-1 mb-4">{starIcons(review.rating)}</div>
          <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-4 mb-5 italic">
            &ldquo;{review.comment}&rdquo;
          </p>
          <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary">
                {(review.user?.fullName ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">{review.user?.fullName ?? 'Anonim'}</p>
                <p className="text-xs text-on-surface-variant">{review.game?.title ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
