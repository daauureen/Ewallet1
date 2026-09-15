import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Wallet as WalletIcon, X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWallets } from '@/lib/useData';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { Spinner } from '@/components/Spinner';
import type { Wallet } from '@/types';

const CURRENCIES = ['KZT', 'USD', 'EUR', 'RUB', 'RSD'];

export function Wallets() {
  const { wallets, loading, error, reload } = useWallets();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('KZT');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTxCount, setDeleteTxCount] = useState<number>(0);

  function openAdd() {
    setEditingId(null);
    setName('');
    setCurrency('KZT');
    setFormError(null);
    setShowAdd(true);
  }

  function openEdit(w: Wallet) {
    setEditingId(w.id);
    setName(w.name);
    setCurrency(w.currency);
    setFormError(null);
    setShowAdd(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Введите название кошелька');
      return;
    }

    setSubmitting(true);
    if (editingId) {
      const { error } = await supabase
        .from('wallets')
        .update({ name: name.trim(), currency })
        .eq('id', editingId);
      if (error) setFormError(error.message);
    } else {
      const { error } = await supabase
        .from('wallets')
        .insert({ name: name.trim(), currency, user_id: user?.id });
      if (error) setFormError(error.message);
    }
    setSubmitting(false);

    if (!formError) {
      setShowAdd(false);
      reload();
    }
  }

  async function confirmDelete() {
    if (!deletingId) return;
    const { error } = await supabase.from('wallets').delete().eq('id', deletingId);
    setDeletingId(null);
    if (!error) reload();
  }

  async function askDelete(id: string) {
    // Count transactions for this wallet
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('wallet_id', id);
    setDeleteTxCount(count ?? 0);
    setDeletingId(id);
  }

  if (loading) {
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
          <h1 className="text-2xl font-bold text-slate-900">Кошельки</h1>
          <p className="text-sm text-slate-500 mt-0.5">Управляйте своими кошельками</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить кошелёк
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl">
            У вас пока нет кошельков
          </div>
        )}
        {wallets.map((w) => (
          <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-5 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100">
                  <WalletIcon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{w.name}</p>
                  <p className="text-xs text-slate-400">{w.currency}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(w)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => askDelete(w.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(Number(w.balance), w.currency)}
            </p>
          </div>
        ))}
      </div>

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                {editingId ? 'Переименовать кошелёк' : 'Новый кошелёк'}
              </h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Название</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Карта Kaspi"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Валюта</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
                  {submitting ? <Spinner className="h-4 w-4" /> : <Check className="w-4 h-4" />}
                  {editingId ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
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
            <h3 className="text-center font-semibold text-slate-900 mb-1">Удалить кошелёк?</h3>
            <p className="text-center text-sm text-slate-500 mb-5">
              {deleteTxCount > 0
                ? `Вместе с кошельком будут удалены все ${deleteTxCount} транзакций. Это действие нельзя отменить.`
                : 'Это действие нельзя отменить.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-medium text-sm hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
