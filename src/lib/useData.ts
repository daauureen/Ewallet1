import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Wallet, Category, Transaction } from '@/types';

export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setWallets((data as Wallet[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { wallets, setWallets, loading, error, reload: load };
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setCategories((data as Category[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, setCategories, loading, error, reload: load };
}

export function useTransactions(limit?: number) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('transactions')
      .select('*, wallet:wallets(*), category:categories(*)')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setTransactions((data as Transaction[]) ?? []);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, setTransactions, loading, error, reload: load };
}
