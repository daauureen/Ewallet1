import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Plus, TrendingUp, TrendingDown, Wallet as WalletIcon, ArrowRight } from 'lucide-react';
import { useWallets, useCategories, useTransactions } from '@/lib/useData';
import { formatCurrency, formatShortDate, getMonthRange, getLast30DaysRange } from '@/lib/format';
import { TransactionModal } from '@/components/TransactionModal';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Spinner } from '@/components/Spinner';
import type { Transaction } from '@/types';

export function Dashboard() {
  const { wallets, loading: walletsLoading, reload: reloadWallets } = useWallets();
  const { categories, loading: categoriesLoading } = useCategories();
  const { transactions, loading: txLoading, reload: reloadTx } = useTransactions(10);

  const [modalOpen, setModalOpen] = useState(false);

  const loading = walletsLoading || categoriesLoading || txLoading;

  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + Number(w.balance), 0),
    [wallets],
  );

  // Pie chart: expenses by category for current month
  const expenseByCategory = useMemo(() => {
    const { start, end } = getMonthRange();
    const filtered = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        t.transaction_date >= start &&
        t.transaction_date <= end,
    );
    const map = new Map<string, { name: string; value: number; color: string }>();
    for (const t of filtered) {
      const cat = categories.find((c) => c.id === t.category_id);
      const key = cat?.name ?? 'Без категории';
      const existing = map.get(key);
      if (existing) {
        existing.value += Number(t.amount);
      } else {
        map.set(key, { name: key, value: Number(t.amount), color: cat?.color ?? '#6b7280' });
      }
    }
    return Array.from(map.values());
  }, [transactions, categories]);

  // Line chart: balance over last 30 days
  const balanceData = useMemo(() => {
    const { start, end } = getLast30DaysRange();
    const allTx = transactions; // already has all (limited to 10 though for dashboard)

    // For a proper 30-day chart we need all transactions, not just 10.
    // We'll compute from the loaded transactions.
    const dates: { date: string; balance: number; label: string }[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Build a map of date -> net change
    const dailyNet = new Map<string, number>();
    for (const t of allTx) {
      if (t.transaction_date >= start && t.transaction_date <= end) {
        const key = t.transaction_date;
        const delta = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
        dailyNet.set(key, (dailyNet.get(key) ?? 0) + delta);
      }
    }

    // Start from total balance and work backwards, or start from 0 and accumulate
    let runningBalance = totalBalance;
    // Subtract future deltas to get starting balance
    const today = new Date().toISOString().split('T')[0];
    for (const [d] of dailyNet) {
      if (d > today) runningBalance -= dailyNet.get(d) ?? 0;
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      runningBalance += dailyNet.get(dateStr) ?? 0;
      dates.push({
        date: dateStr,
        balance: Math.round(runningBalance * 100) / 100,
        label: formatShortDate(dateStr),
      });
    }
    return dates;
  }, [transactions, totalBalance]);

  const monthIncome = useMemo(() => {
    const { start, end } = getMonthRange();
    return transactions
      .filter((t) => t.type === 'income' && t.transaction_date >= start && t.transaction_date <= end)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const monthExpense = useMemo(() => {
    const { start, end } = getMonthRange();
    return transactions
      .filter((t) => t.type === 'expense' && t.transaction_date >= start && t.transaction_date <= end)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

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
          <h1 className="text-2xl font-bold text-slate-900">Главная</h1>
          <p className="text-sm text-slate-500 mt-0.5">Обзор ваших финансов</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Добавить транзакцию
        </button>
      </div>

      {/* Total balance card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/10">
        <p className="text-emerald-50 text-sm font-medium">Общий баланс</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance, wallets[0]?.currency ?? 'KZT')}</p>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-100">Доходы за месяц</p>
              <p className="text-sm font-semibold">{formatCurrency(monthIncome, wallets[0]?.currency ?? 'KZT')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-100">Расходы за месяц</p>
              <p className="text-sm font-semibold">{formatCurrency(monthExpense, wallets[0]?.currency ?? 'KZT')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Мои кошельки</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl">
              У вас пока нет кошельков.{' '}
              <Link to="/wallets" className="text-emerald-600 font-medium hover:underline">
                Создать кошелёк
              </Link>
            </div>
          )}
          {wallets.map((w) => (
            <Link
              key={w.id}
              to="/wallets"
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100">
                    <WalletIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{w.name}</p>
                    <p className="text-xs text-slate-400">{w.currency}</p>
                  </div>
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(Number(w.balance), w.currency)}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense pie chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Расходы по категориям</h3>
          {expenseByCategory.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              Нет расходов в этом месяце
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value), 'KZT')}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Balance line chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Баланс за 30 дней</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" interval={6} />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={60} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), 'KZT')}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Последние транзакции</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:underline"
          >
            Все транзакции
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {transactions.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              Пока нет транзакций. Нажмите «Добавить транзакцию»
            </div>
          )}
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          reloadWallets();
          reloadTx();
        }}
        wallets={wallets}
        categories={categories}
      />
    </div>
  );
}

function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  const isIncome = t.type === 'income';
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <CategoryIcon
        name={t.category?.icon ?? 'Wallet'}
        color={t.category?.color}
        size={20}
      />
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
    </div>
  );
}
