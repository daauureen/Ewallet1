import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Filter, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWallets, useCategories } from '@/lib/useData';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { TransactionModal } from '@/components/TransactionModal';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Spinner } from '@/components/Spinner';
import type { Transaction, TransactionType } from '@/types';

export function Transactions() {
  const { wallets, loading: walletsLoading, reload: reloadWallets } = useWallets();
  const { categories, loading: categoriesLoading } = useCategories();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterWallet, setFilterWallet] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filterWallet !== 'all') query = query.eq('wallet_id', filterWallet);
    if (filterCategory !== 'all') query = query.eq('category_id', filterCategory);
    if (filterType !== 'all') query = query.eq('type', filterType);
    if (filterFrom) query = query.gte('transaction_date', filterFrom);
    if (filterTo) query = query.lte('transaction_date', filterTo);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setTransactions((data as Transaction[]) ?? []);
    }
    setLoading(false);
  }, [filterWallet, filterCategory, filterType, filterFrom, filterTo]);

  useEffect(() => {
    load();
  }, [load]);

  const hasActiveFilters =
    filterWallet !== 'all' ||
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterFrom !== '' ||
    filterTo !== '';

  function clearFilters() {
    setFilterWallet('all');
    setFilterCategory('all');
    setFilterType('all');
    setFilterFrom('');
    setFilterTo('');
  }

  async function handleDelete(id: string) {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }

    // Reverse wallet balance
    const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
    await supabase.rpc('adjust_wallet_balance', { w_id: tx.wallet_id, delta });

    setDeletingId(null);
    load();
    reloadWallets();
  }

  const totalIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );
  const totalExpense = useMemo(
    () => transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [transactions],
  );

  if (walletsLoading || categoriesLoading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Транзакции</h1>
          <p className="text-sm text-slate-500 mt-0.5">Все ваши доходы и расходы</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Доходы</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {formatCurrency(totalIncome, wallets[0]?.currency ?? 'KZT')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Расходы</p>
          <p className="text-xl font-bold text-red-500 mt-1">
            {formatCurrency(totalExpense, wallets[0]?.currency ?? 'KZT')}
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Фильтрация</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Кошелёк</label>
              <select
                value={filterWallet}
                onChange={(e) => setFilterWallet(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Все кошельки</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Категория</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Все категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Тип</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Все</option>
                <option value="income">Доходы</option>
                <option value="expense">Расходы</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">С даты</label>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">По дату</label>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8 text-emerald-600" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl">
          {hasActiveFilters ? 'Нет транзакций по выбранным фильтрам' : 'Пока нет транзакций'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {transactions.map((t) => {
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 group">
                <CategoryIcon name={t.category?.icon ?? 'Wallet'} color={t.category?.color} size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {t.category?.name ?? 'Без категории'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {formatShortDate(t.transaction_date)}
                    {t.wallet ? ` · ${t.wallet.name}` : ''}
                    {t.comment ? ` · ${t.comment}` : ''}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold whitespace-nowrap ${
                    isIncome ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {isIncome ? '+' : '−'}
                  {formatCurrency(Number(t.amount), t.wallet?.currency ?? 'KZT')}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditing(t);
                      setModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDeletingId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-center font-semibold text-slate-900 mb-1">Удалить транзакцию?</h3>
            <p className="text-center text-sm text-slate-500 mb-5">
              Это действие нельзя отменить. Баланс кошелька будет пересчитан.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          load();
          reloadWallets();
        }}
        wallets={wallets}
        categories={categories}
        editingTransaction={editing}
      />
    </div>
  );
}
