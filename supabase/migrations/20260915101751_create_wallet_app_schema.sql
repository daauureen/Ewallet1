/*
# Create schema for "Электронный кошелёк" personal finance tracker

1. New Tables
- `profiles` — user profile (full_name). PK = auth.users.id. One row per user.
- `wallets` — user wallets (Наличные, Карта, etc). Each has name, currency (default KZT), balance (default 0).
- `categories` — transaction categories. user_id NULL = system/default category visible to everyone; user_id set = personal category. type is 'income' or 'expense'.
- `transactions` — income/expense records linked to a wallet and category. amount, type, comment, transaction_date.
- `budgets` — monthly spending limit per category. limit_amount, period ('monthly').

2. Security (RLS)
- profiles: owner-scoped CRUD (auth.uid() = id).
- wallets: owner-scoped CRUD (auth.uid() = user_id).
- categories: SELECT visible to everyone (system categories have user_id = null) plus personal ones; INSERT/UPDATE/DELETE only for personal categories (auth.uid() = user_id).
- transactions: owner-scoped CRUD (auth.uid() = user_id).
- budgets: owner-scoped CRUD (auth.uid() = user_id).

3. Automation
- Trigger `handle_new_user` on auth.users INSERT: creates a profiles row, a default wallet "Наличные", and 10 default system categories (user_id = null).

4. Important notes
- Owner columns default to auth.uid() so frontend inserts that omit user_id still satisfy RLS WITH CHECK.
- categories.user_id is nullable (null = system category shared with all users).
- Wallet balance is kept in sync by the application layer (add/update/delete transaction adjusts wallet balance).
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- wallets
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallets" ON wallets;
CREATE POLICY "select_own_wallets" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallets" ON wallets;
CREATE POLICY "insert_own_wallets" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallets" ON wallets;
CREATE POLICY "update_own_wallets" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wallets" ON wallets;
CREATE POLICY "delete_own_wallets" ON wallets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text NOT NULL DEFAULT 'Wallet',
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- System categories (user_id null) visible to all authenticated users; personal ones only to owner.
DROP POLICY IF EXISTS "select_categories" ON categories;
CREATE POLICY "select_categories" ON categories FOR SELECT
  TO authenticated USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_categories" ON categories;
CREATE POLICY "insert_own_categories" ON categories FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_categories" ON categories;
CREATE POLICY "update_own_categories" ON categories FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_categories" ON categories;
CREATE POLICY "delete_own_categories" ON categories FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  comment text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- budgets
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount numeric NOT NULL CHECK (limit_amount > 0),
  period text NOT NULL DEFAULT 'monthly',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_budgets" ON budgets;
CREATE POLICY "select_own_budgets" ON budgets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_budgets" ON budgets;
CREATE POLICY "insert_own_budgets" ON budgets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_budgets" ON budgets;
CREATE POLICY "update_own_budgets" ON budgets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_budgets" ON budgets;
CREATE POLICY "delete_own_budgets" ON budgets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- Function to handle new user signup: create profile, default wallet, and default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Create default wallet
  INSERT INTO public.wallets (user_id, name, currency, balance)
  VALUES (NEW.id, 'Наличные', 'KZT', 0);

  -- Create default system categories (user_id = null, visible to all)
  INSERT INTO public.categories (user_id, name, type, icon, color) VALUES
    (NULL, 'Еда', 'expense', 'UtensilsCrossed', '#ef4444'),
    (NULL, 'Транспорт', 'expense', 'Car', '#f97316'),
    (NULL, 'Жильё', 'expense', 'Home', '#3b82f6'),
    (NULL, 'Развлечения', 'expense', 'Gamepad2', '#a855f7'),
    (NULL, 'Здоровье', 'expense', 'HeartPulse', '#ec4899'),
    (NULL, 'Покупки', 'expense', 'ShoppingBag', '#14b8a6'),
    (NULL, 'Связь', 'expense', 'Smartphone', '#6366f1'),
    (NULL, 'Образование', 'expense', 'GraduationCap', '#0ea5e9'),
    (NULL, 'Зарплата', 'income', 'Wallet', '#22c55e'),
    (NULL, 'Подарки', 'income', 'Gift', '#eab308');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();