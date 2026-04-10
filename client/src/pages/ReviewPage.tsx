import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '../lib/api';
import { formatDate, renderStars } from '../lib/format';
import { queryClient } from '../lib/query-client';
import { reviewFormSchema, type ReviewFormValues } from '../schemas/review';
import type { Game, Review } from '../types/api';

export function ReviewPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const gamesQuery = useQuery({
    queryKey: ['games'],
    queryFn: () => apiGet<{ games: Game[] }>('/games')
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: () => apiGet<{ reviews: Review[] }>('/reviews')
  });

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { gameId: '', rating: 5, comment: '' }
  });

  const reviewMutation = useMutation({
    mutationFn: (values: ReviewFormValues) => {
      const payload = {
        gameId: values.gameId,
        rating: Math.round(Number(values.rating)),
        comment: values.comment
      };
      return apiPost<{ review: Review }>('/reviews', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      form.reset({ gameId: '', rating: 5, comment: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, rating, comment }: { reviewId: string; rating: number; comment: string }) =>
      apiPatch<{ review: Review }>(`/reviews/${reviewId}`, { rating: Math.round(Number(rating)), comment }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingId(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => apiDelete<void>(`/reviews/${reviewId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteConfirmId(null);
    }
  });

  const activeGames = gamesQuery.data?.games.filter((g) => g.isActive) ?? [];
  const reviews = reviewsQuery.data?.reviews ?? [];
  const currentRating = form.watch('rating');

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const cancelEdit = () => setEditingId(null);

  const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="transition-transform hover:scale-110 active:scale-90"
          onClick={() => onChange(star)}
        >
          <span
            className={`material-symbols-outlined text-3xl ${star <= value ? 'text-primary' : 'text-surface-container-highest'}`}
            style={star <= value ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            star
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <header className="mb-12">
        <h1 className="font-headline text-5xl font-extrabold tracking-tight mb-4">
          Twoje <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">Recenzje</span>
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg">Zarządzaj swoimi opiniami i dziel się doświadczeniami z innymi graczami w społeczności GameVault.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Write a Review */}
        <section className="lg:col-span-5">
          <div className="sticky top-32">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-container">edit_note</span>
                </div>
                <h2 className="font-headline text-2xl font-bold">Napisz recenzję</h2>
              </div>

              {reviewMutation.error instanceof ApiError ? (
                <div className="bg-error-container text-on-error-container p-4 rounded-xl font-bold mb-6">{reviewMutation.error.message}</div>
              ) : null}
              {reviewMutation.isSuccess ? (
                <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl font-bold mb-6">Recenzja opublikowana pomyślnie!</div>
              ) : null}

              <form className="space-y-6" onSubmit={form.handleSubmit((values) => reviewMutation.mutate(values))}>
                {/* Game Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-2 ml-1 text-on-surface-variant" htmlFor="game-select">Gra</label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface-container-low border-none rounded-xl py-4 px-5 appearance-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                      id="game-select"
                      {...form.register('gameId')}
                    >
                      <option disabled value="">Wybierz grę z listy...</option>
                      {activeGames.map((game) => (
                        <option key={game.id} value={game.id}>{game.title}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                  </div>
                  {form.formState.errors.gameId?.message && (
                    <span className="text-error text-sm font-bold pl-1 block mt-1">{form.formState.errors.gameId.message}</span>
                  )}
                </div>

                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-semibold mb-3 ml-1 text-on-surface-variant">Ocena</label>
                  <StarPicker value={currentRating} onChange={(v) => form.setValue('rating', v, { shouldValidate: true })} />
                  {form.formState.errors.rating?.message && (
                    <span className="text-error text-sm font-bold pl-1 block mt-1">{form.formState.errors.rating.message}</span>
                  )}
                </div>

                {/* Comment Area */}
                <div>
                  <label className="block text-sm font-semibold mb-2 ml-1 text-on-surface-variant" htmlFor="comment">Komentarz</label>
                  <textarea
                    className="w-full bg-surface-container-low border-none rounded-xl p-5 focus:ring-2 focus:ring-primary transition-all resize-none"
                    id="comment"
                    placeholder="Co sądzisz o tym tytule? Podziel się swoimi wrażeniami (min. 10 znaków)..."
                    rows={6}
                    {...form.register('comment')}
                  />
                  {form.formState.errors.comment?.message && (
                    <span className="text-error text-sm font-bold pl-1 block mt-1">{form.formState.errors.comment.message}</span>
                  )}
                </div>

                <button
                  className="w-full bg-gradient-to-br from-primary to-secondary text-white font-bold py-5 rounded-full shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  type="submit"
                  disabled={reviewMutation.isPending}
                >
                  <span>{reviewMutation.isPending ? 'Wysyłanie...' : 'Opublikuj recenzję'}</span>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </form>
            </div>

            <div className="mt-8 p-6 bg-secondary-container/30 rounded-lg border-l-4 border-secondary flex gap-4">
              <span className="material-symbols-outlined text-secondary text-3xl">lightbulb</span>
              <p className="text-sm text-on-secondary-container leading-relaxed">
                Pamiętaj, że Twoje recenzje pomagają innym graczom w wyborze kolejnej przygody. Bądź szczery, ale merytoryczny!
              </p>
            </div>
          </div>
        </section>

        {/* Right Column: Reviews List */}
        <section className="lg:col-span-7">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="font-headline text-2xl font-bold">Twoje publikacje</h2>
            <span className="text-sm text-on-surface-variant">{reviews.length} recenzji</span>
          </div>

          <div className="space-y-6">
            {reviewsQuery.isPending ? (
              <div className="text-center py-20 font-bold text-on-surface-variant">Ładowanie opinii...</div>
            ) : reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-48 h-48 mb-8 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/20">
                  <span className="material-symbols-outlined text-8xl">rate_review</span>
                </div>
                <h3 className="font-headline text-2xl font-bold mb-2">Brak recenzji do wyświetlenia.</h3>
                <p className="text-on-surface-variant max-w-sm">Wybierz grę po lewej i podziel się wrażeniami!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden transition-all hover:shadow-lg hover:shadow-indigo-500/5">
                  {/* Normal view */}
                  {editingId !== review.id ? (
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-3xl text-primary opacity-40">sports_esports</span>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h3 className="font-headline font-bold text-xl">{review.game?.title ?? '—'}</h3>
                              <div className="flex text-primary gap-0.5 mt-1">
                                {renderStars(review.rating)}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full hidden sm:block">
                              {formatDate(review.createdAt).split(',')[0]}
                            </span>
                          </div>
                          <p className="text-on-surface-variant leading-relaxed mt-3 mb-4 whitespace-pre-wrap">{review.comment}</p>
                          <div className="flex gap-4 border-t border-outline-variant/10 pt-4">
                            <button
                              onClick={() => startEdit(review)}
                              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dim transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span> Edytuj
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(review.id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-error hover:opacity-80 transition-opacity"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span> Usuń
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Inline edit form */
                    <div className="p-6 bg-surface-container-low/50">
                      <h4 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                        Edytujesz: {review.game?.title}
                      </h4>

                      {updateMutation.error instanceof ApiError && (
                        <div className="bg-error-container text-on-error-container p-3 rounded-xl font-bold mb-4 text-sm">{updateMutation.error.message}</div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Ocena</label>
                          <StarPicker value={editRating} onChange={setEditRating} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Komentarz</label>
                          <textarea
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 focus:ring-2 focus:ring-primary transition-all resize-none text-sm"
                            rows={5}
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                          />
                          <p className="text-xs text-on-surface-variant mt-1">{editComment.length}/500 znaków (min. 10)</p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => updateMutation.mutate({ reviewId: review.id, rating: editRating, comment: editComment })}
                            disabled={updateMutation.isPending || editComment.length < 10}
                            className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:-translate-y-0.5 transition-transform shadow disabled:opacity-50 text-sm"
                          >
                            {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-6 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors"
                          >
                            Anuluj
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation overlay */}
                  {deleteConfirmId === review.id && (
                    <div className="bg-error-container/20 border-t border-error/20 p-4 flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-error text-base">warning</span>
                        Na pewno chcesz usunąć tę recenzję?
                      </p>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => deleteMutation.mutate(review.id)}
                          disabled={deleteMutation.isPending}
                          className="bg-error text-white font-bold px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                        >
                          {deleteMutation.isPending ? '...' : 'Usuń'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="border border-outline-variant/20 font-bold px-4 py-2 rounded-lg text-sm hover:bg-surface-container transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
