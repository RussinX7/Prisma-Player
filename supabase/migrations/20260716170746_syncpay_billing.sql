create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  interval text not null default 'monthly' check (interval = 'monthly'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  provider text not null default 'syncpay' check (provider = 'syncpay'),
  provider_subscription_token text unique,
  checkout_request_id uuid not null unique,
  status text not null default 'creating' check (status in ('creating','pending_first_payment','active','past_due','grace_period','suspended','cancel_requested','cancelled','expired','failed')),
  billing_method text check (billing_method is null or billing_method = 'qr_code'),
  document_hash text not null,
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  terms_ip inet,
  terms_user_agent text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_one_open_per_user_idx on public.subscriptions (user_id)
where status in ('creating','pending_first_payment','active','past_due','grace_period','suspended','cancel_requested');
create index subscriptions_user_created_idx on public.subscriptions (user_id, created_at desc);

create table public.subscription_charges (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.billing_plans(id),
  provider_identifier text unique,
  billing_cycle integer not null default 1 check (billing_cycle > 0),
  status text not null default 'creating' check (status in ('creating','pending','paid','expired','failed','refunded')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  pix_code text,
  qr_code text,
  expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, billing_cycle)
);
create index subscription_charges_user_created_idx on public.subscription_charges (user_id, created_at desc);
create index subscription_charges_subscription_idx on public.subscription_charges (subscription_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'syncpay' check (provider = 'syncpay'),
  event_name text not null,
  event_key text not null unique,
  provider_object_id text,
  payload_hash text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received','processing','processed','ignored','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);
create index payment_events_status_received_idx on public.payment_events (status, received_at);

create table public.subscription_audit_logs (
  id bigint generated always as identity primary key,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('user','syncpay','system')),
  action text not null,
  old_status text,
  new_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index subscription_audit_subscription_created_idx on public.subscription_audit_logs (subscription_id, created_at desc);

alter table public.billing_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_charges enable row level security;
alter table public.payment_events enable row level security;
alter table public.subscription_audit_logs enable row level security;

create policy billing_plans_read_active on public.billing_plans for select to anon, authenticated using (is_active);
create policy subscriptions_read_own on public.subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy charges_read_own on public.subscription_charges for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.billing_plans to anon, authenticated;
grant select on public.subscriptions, public.subscription_charges to authenticated;
revoke all on public.payment_events, public.subscription_audit_logs from anon, authenticated;

insert into public.billing_plans (slug, name, amount_cents)
values ('prisma-completo', 'Prisma Completo', 9700)
on conflict (slug) do update set name = excluded.name, amount_cents = excluded.amount_cents, is_active = true, updated_at = now();
