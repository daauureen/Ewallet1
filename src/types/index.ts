export type TransactionType = 'income' | 'expense';

export interface Profile {
  id: string;
  full_name: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  comment: string | null;
  transaction_date: string;
  created_at: string;
  // joined fields
  wallet?: Wallet;
  category?: Category;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_amount: number;
  period: string;
  created_at: string;
  // joined fields
  category?: Category;
}

export interface TransactionInput {
  wallet_id: string;
  category_id: string;
  amount: number;
  type: TransactionType;
  comment?: string | null;
  transaction_date: string;
}
