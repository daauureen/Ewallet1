import { useEffect, useState, type FormEvent } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Wallet, Category, Transaction, TransactionType, TransactionInput } from '@/types';
import { Spinner } from './Spinner';
import { CategoryIcon } from './CategoryIcon';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  wallets: Wallet[];
  categories: Category[];
  editingTransaction?: Transaction | null;
}

export function TransactionModal({
  open,
  onClose,
  onSaved,
  wallets,
  categories,
  editingTransaction,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setWalletId(editingTransaction.wallet_id);
        setCategoryId(editingTransaction.category_id);
        setAmount(String(editingTransaction.amount));
        setDate(editingTransaction.transaction_date);
        setComment(editingTransaction.comment ?? '');
      } else {
        setType('expense');
        setWalletId(wallets[0]?.id ?? '');
        setCategoryId('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setComment('');
      }
      setError(null);
    }
  }, [open, editingTransaction, wallets]);

  if (!open) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!walletId) {
      setError('Выберите кошелёк');
      return;
    }
    if (!categoryId) {
      setError('Выберите категорию');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Сумма должна быть положительным числом');
      return;
    }

    setSubmitting(true);

    const payload: TransactionInput = {
      wallet_id: walletId,
      category_id: categoryId,
      amount: numAmount,
      type,
      comment: comment.trim() || null,
      transaction_date: date,
    };

    try {
      if (editingTransaction) {
        // Update transaction
        const { error: updateError } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id);

        if (updateError) throw updateError;

        // Adjust wallet balance: reverse old, apply new
        const oldAmount =
          editingTransaction.type === 'income'
            ? -editingTransaction.amount
            : editingTransaction.amount;
        const newAmount = type === 'income' ? numAmount : -numAmount;
        const delta = oldAmount + newAmount;

        if (delta !== 0) {
          await supabase.rpc('adjust_wallet_balance', {
            w_id: editingTransaction.wallet_id,
            delta,
          });
          // If wallet changed, also adjust old wallet (already done by oldAmount) and new wallet
          if (editingTransaction.wallet_id !== walletId) {
            // old wallet already reversed via oldAmount above applied to old wallet
            await supabase.rpc('adjust_wallet_balance', {
              w_id: editingTransaction.wallet_id,
              delta: oldAmount,
            });
            // new wallet gets newAmount
            await supabase.rpc('adjust_wallet_balance', {
              w_id: walletId,
              delta: newAmount,
            });
          }
        }
      } else {
        // Insert new transaction
        const { error: insertError } = await supabase.from('transactions').insert(payload);
        if (insertError) throw insertError;

        // Adjust wallet balance
        const delta = type === 'income' ? numAmount : -numAmount;
        await supabase.rpc('adjust_wallet_balance', { w_id: walletId, delta });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить транзакцию');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-slate-900">
            {editingTransaction ? 'Редактировать транзакцию' : 'Новая транзакция'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategoryId('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Расход
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategoryId('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Доход
            </button>
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Кошелёк</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {wallets.length === 0 && <option value="">Нет кошельков</option>}
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Категория</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {filteredCategories.length === 0 && (
                <p className="col-span-2 text-sm text-slate-400 text-center py-4">
                  Нет категорий для этого типа
                </p>
              )}
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    categoryId === c.id
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

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Сумма</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Дата</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Комментарий (необязательно)
            </label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: обед в кафе"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {submitting && <Spinner className="h-4 w-4" />}
              {editingTransaction ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
