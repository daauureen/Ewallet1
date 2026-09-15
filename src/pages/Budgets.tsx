import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2, X, AlertCircle, PiggyBank } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCategories } from '@/lib/useData';
import { formatCurrency, getMonthRange } from '@/lib/format';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Spinner } from '@/components/Spinner';
import type { Budget, Category } from '@/types';

export function Budgets() {
  const { categories, loading: catLoading } = useCategories();
  const [budgets, setBudgets] = useState<(Budget & { category?: Category })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('budgets')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setBudgets((data as (Budget & { category?: Category })[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [spentMap, setSpentMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const { start, end } = getMonthRange();
    supabase
      .from('transactions')
      .select('category_id, amount, type, transaction_date')
      .eq('type', 'expense')
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .then(({ data, error }) => {
        if (error || !data) return;
        const map = new Map<string, number>();
        for (const t of data) {
          map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
        }
        setSpentMap(map);
      });
  }, [budgets]);

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = expenseCategories.filter((c) => !budgetedCategoryIds.has(c.id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const num = parseFloat(limitAmount);
    if (!selectedCategory) {
      setFormError('Выберите категорию');
      return;
    }
    if (!num || num <= 0) {
      setFormError('Лимит должен быть положительным числом');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('budgets')
      .insert({ category_id: selectedCategory, limit_amount: num });
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
    } else {
      setShowAdd(false);
      setSelectedCategory('');
      setLimitAmount('');
      load();
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (!error) load();
  }

  if (catLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Бюджеты</h1>
          <p className="text-sm text-slate-500 mt-0.5">Лимиты расходов по категориям на месяц</p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowAdd(true);
          }}
          disabled={availableCategories.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить лимит
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            У вас пока нет бюджетов. Создайте лимит, чтобы контролировать расходы.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => {
            const spent = spentMap.get(b.category_id) ?? 0;
            const limit = Number(b.limit_amount);
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
            const isOver90 = pct >= 90;
            const isOver = spent > limit;
            const barColor = isOver90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';

            return (
              <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-4 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      name={b.category?.icon ?? 'Wallet'}
                      color={b.category?.color}
                      size={20}
                    />
                    <div>
                      <p className="font-medium text-slate-900">{b.category?.name ?? 'Категория'}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(spent, 'KZT')} из {formatCurrency(limit, 'KZT')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-400">{pct.toFixed(0)}% использовано</p>
                  {isOver && (
                    <p className="text-xs font-medium text-red-500">
                      Превышен на {formatCurrency(spent - limit, 'KZT')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add budget modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">Новый лимит бюджета</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Категория</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {availableCategories.length === 0 && (
                    <p className="col-span-2 text-sm text-slate-400 text-center py-4">
                      Все категории уже имеют лимиты
                    </p>
                  )}
                  {availableCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategory(c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedCategory === c.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <CategoryIcon name={c.icon} color={c.color} size={16} />
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Лимит на месяц
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting && <Spinner className="h-4 w-4" />}
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
