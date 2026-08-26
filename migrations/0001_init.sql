-- ============================================================
-- 介護事業所向けシフト作成アプリ 初期スキーマ
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- staff: 職員マスタ（Supabase Authのユーザーとemailで紐付ける）
-- ------------------------------------------------------------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  full_name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  employment_type text, -- 例: 常勤, 非常勤, パート
  desired_work_days_per_week int,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table staff is '職員マスタ。adminがemailで登録し、本人がサインアップ後にuser_idが紐付く。';

-- ------------------------------------------------------------
-- qualifications: 資格マスタ
-- ------------------------------------------------------------
create table if not exists qualifications (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists staff_qualifications (
  staff_id uuid not null references staff(id) on delete cascade,
  qualification_id uuid not null references qualifications(id) on delete cascade,
  primary key (staff_id, qualification_id)
);

-- ------------------------------------------------------------
-- shift_types: 勤務パターン（早番・日勤・遅番など）
-- ------------------------------------------------------------
create table if not exists shift_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  color text not null default '#4F86C6',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- staffing_rules: 勤務パターンごとの人員配置基準
-- ------------------------------------------------------------
create table if not exists staffing_rules (
  id uuid primary key default gen_random_uuid(),
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  min_staff_count int not null default 1,
  required_qualification_id uuid references qualifications(id) on delete set null,
  min_qualified_count int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- shifts: 実際のシフト割り当て（確定分）
-- ------------------------------------------------------------
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  work_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, work_date)
);

-- ------------------------------------------------------------
-- shift_requests: 職員からの希望提出
-- ------------------------------------------------------------
create table if not exists shift_requests (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  work_date date not null,
  request_type text not null check (request_type in ('day_off', 'want_shift')),
  shift_type_id uuid references shift_types(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (staff_id, work_date, request_type)
);

-- ============================================================
-- ヘルパー関数
-- ============================================================

-- 現在ログイン中のユーザーが管理者かどうか
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid() and role = 'admin' and active = true
  );
$$;

-- 現在ログイン中のユーザーに対応するstaff.idを返す
create or replace function my_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where user_id = auth.uid();
$$;

-- 初回ログイン時にemailでstaffレコードとauthユーザーを紐付ける
create or replace function claim_staff_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update staff
  set user_id = auth.uid()
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and user_id is null;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table staff enable row level security;
alter table qualifications enable row level security;
alter table staff_qualifications enable row level security;
alter table shift_types enable row level security;
alter table staffing_rules enable row level security;
alter table shifts enable row level security;
alter table shift_requests enable row level security;

-- staff -----------------------------------------------------
create policy "staff_select_own_or_admin" on staff
  for select using (user_id = auth.uid() or is_admin());

create policy "staff_admin_write" on staff
  for insert with check (is_admin());
create policy "staff_admin_update" on staff
  for update using (is_admin());
create policy "staff_admin_delete" on staff
  for delete using (is_admin());

-- qualifications ---------------------------------------------
create policy "qualifications_select_all" on qualifications
  for select using (auth.uid() is not null);
create policy "qualifications_admin_write" on qualifications
  for all using (is_admin()) with check (is_admin());

-- staff_qualifications ----------------------------------------
create policy "staff_qualifications_select" on staff_qualifications
  for select using (
    is_admin() or staff_id = my_staff_id()
  );
create policy "staff_qualifications_admin_write" on staff_qualifications
  for all using (is_admin()) with check (is_admin());

-- shift_types ---------------------------------------------------
create policy "shift_types_select_all" on shift_types
  for select using (auth.uid() is not null);
create policy "shift_types_admin_write" on shift_types
  for all using (is_admin()) with check (is_admin());

-- staffing_rules --------------------------------------------------
create policy "staffing_rules_select_all" on staffing_rules
  for select using (auth.uid() is not null);
create policy "staffing_rules_admin_write" on staffing_rules
  for all using (is_admin()) with check (is_admin());

-- shifts ------------------------------------------------------------
create policy "shifts_select_own_or_admin" on shifts
  for select using (is_admin() or staff_id = my_staff_id());
create policy "shifts_admin_write" on shifts
  for all using (is_admin()) with check (is_admin());

-- shift_requests -------------------------------------------------------
create policy "shift_requests_select_own_or_admin" on shift_requests
  for select using (is_admin() or staff_id = my_staff_id());
create policy "shift_requests_insert_own" on shift_requests
  for insert with check (is_admin() or staff_id = my_staff_id());
create policy "shift_requests_delete_own_or_admin" on shift_requests
  for delete using (is_admin() or staff_id = my_staff_id());
create policy "shift_requests_update_admin" on shift_requests
  for update using (is_admin());

-- ============================================================
-- 初期データ（サンプル）
-- ============================================================
insert into qualifications (name) values
  ('介護福祉士'), ('看護師'), ('介護職員初任者研修'), ('実務者研修')
on conflict (name) do nothing;

insert into shift_types (name, start_time, end_time, color, sort_order) values
  ('早番', '08:00', '17:00', '#4F86C6', 1),
  ('日勤', '09:00', '18:00', '#5CB85C', 2),
  ('遅番', '10:30', '19:30', '#E0A526', 3)
on conflict do nothing;
