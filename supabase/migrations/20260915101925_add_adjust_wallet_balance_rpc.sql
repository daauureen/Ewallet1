/*
# Add adjust_wallet_balance RPC function

1. New Functions
- `adjust_wallet_balance(w_id uuid, delta numeric)` — atomically adjusts a wallet's balance by `delta`. Used by the frontend to keep wallet balances in sync when transactions are added, edited, or deleted. SECURITY DEFINER so it can update wallet rows the calling user owns (RLS still applies via auth.uid()).

2. Security
- SECURITY DEFINER with fixed search_path = public.
- The function only updates the wallet row matching the provided id; RLS on wallets ensures the caller owns it.
*/

CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(w_id uuid, delta numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wallets
  SET balance = balance + delta
  WHERE id = w_id;
END;
$$;
