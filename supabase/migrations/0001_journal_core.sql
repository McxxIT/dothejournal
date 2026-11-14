create extension if not exists "pgcrypto";

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  broker text,
  account_type text,
  starting_balance numeric(18, 2) not null default 0,
  daily_loss_limit numeric(18, 2),
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.trading_accounts (id) on delete cascade,
  symbol text not null,
  asset_class text not null default 'stock',
  direction text not null check (direction in ('long', 'short')),
  status text not null default 'open' check (status in ('open', 'closed')),
  entry_time timestamptz not null,
  exit_time timestamptz,
  avg_entry_price numeric(18, 6) not null,
  avg_exit_price numeric(18, 6),
  total_quantity numeric(18, 6) not null,
  gross_pnl numeric(18, 2),
  fees numeric(18, 2) not null default 0,
  net_pnl numeric(18, 2) generated always as (
    coalesce(gross_pnl, 0) - coalesce(fees, 0)
  ) stored,
  initial_risk_amount numeric(18, 2),
  r_multiple numeric(12, 4),
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.trades
  add column if not exists tags text[] not null default '{}';

create index if not exists trading_accounts_user_idx
  on public.trading_accounts (user_id, name);

create index if not exists trades_user_exit_idx
  on public.trades (user_id, exit_time desc)
  where status = 'closed';

create index if not exists trades_account_exit_idx
  on public.trades (account_id, exit_time desc);

create index if not exists trades_user_symbol_idx
  on public.trades (user_id, symbol);

alter table public.trading_accounts enable row level security;
alter table public.trades enable row level security;

create policy "trading_accounts_select_own"
  on public.trading_accounts for select
  using (auth.uid() = user_id);

create policy "trading_accounts_insert_own"
  on public.trading_accounts for insert
  with check (auth.uid() = user_id);

create policy "trading_accounts_update_own"
  on public.trading_accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trading_accounts_delete_own"
  on public.trading_accounts for delete
  using (auth.uid() = user_id);

create policy "trades_select_own"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "trades_insert_own"
  on public.trades for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.trading_accounts
      where trading_accounts.id = trades.account_id
        and trading_accounts.user_id = auth.uid()
    )
  );

create policy "trades_update_own"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trades_delete_own"
  on public.trades for delete
  using (auth.uid() = user_id);
