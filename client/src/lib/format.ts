export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatGenre(genre: string): string {
  const labels: Record<string, string> = {
    ACTION: 'Akcja',
    RPG: 'RPG',
    STRATEGY: 'Strategia',
    SPORTS: 'Sport',
    HORROR: 'Horror',
    ADVENTURE: 'Przygoda',
    PUZZLE: 'Logiczna',
    SIMULATION: 'Symulacja'
  };
  return labels[genre] ?? genre;
}

export function renderStars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}
