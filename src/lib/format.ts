const CURRENCY_SYMBOLS: Record<string, string> = {
  KZT: '₸',
  USD: '$',
  EUR: '€',
  RUB: '₽',
  RSD: 'din',
};

export function formatCurrency(amount: number, currency: string = 'KZT'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${symbol}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

export function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getLast30DaysRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
