-- ============================================================
-- 職員管理・勤務パターン・人員配置基準・希望一覧・シフトカレンダー
-- モックの内容に合わせたスキーマ更新
--
-- 変更点の要約:
--   1. 職員登録はメールアドレス不要（管理者が手打ちで登録）に変更
--      → staff.email / role / user_id / desired_work_days_per_week を削除
--      → staff.position（役職名）を追加
--   2. 管理者かどうかは新しい admin_users テーブルで判定する
--      （これまで staff.role = 'admin' で判定していたものを分離）
--   3. 人員配置基準は「曜日 × 勤務パターン」で最低人数を持つ形に再設計
--   4. 希望一覧は「休み希望・半休」の種別＋日付＋メモのシンプルな形に変更
--   5. 勤務パターンに「夜勤」を追加
-- ============================================================

-- ------------------------------------------------------------
-- 1. 管理者テーブル（Supabase Authのユーザーと1:1）
-- ------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

comment on table admin_users is '管理者アカウント。SQL Editorから手動で登録する。';

-- 既存の「staff.role = admin」だった職員を admin_users に移行
insert into admin_users (id, full_name)
select user_id, full_name from staff
where user_id is not null
  and exists (
    select 1 from information_schema.columns
    where table_name = 'staff' and column_name = 'role'
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. staff テーブルの再設計
-- ------------------------------------------------------------
alter table staff add column if not exists position text;
alter table staff drop column if exists role;
alter table staff drop column if exists email;
alter table staff drop column if exists user_id;
alter table staff drop column if exists desired_work_days_per_week;

comment on table staff is '職員マスタ。管理者がこの画面から直接登録する（メールアドレス・ログインアカウントは不要）。';

-- ------------------------------------------------------------
-- 3. helper関数の更新
-- ------------------------------------------------------------
drop function if exists my_staff_id();
drop function if exists claim_staff_profile();

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

-- ------------------------------------------------------------
-- 4. 勤務パターン：夜勤を追加し、名称を統一（早番・日勤・遅出・夜勤）
-- ------------------------------------------------------------
update shift_types set name = '遅出', sort_order = 2 where name = '遅番';
update shift_types set sort_order = 0 where name = '早番';
update shift_types set sort_order = 1 where name = '日勤';

insert into shift_types (name, start_time, end_time, color, sort_order)
select '早番', '07:00', '16:00', '#c98a2f', 0
where not exists (select 1 from shift_types where name = '早番');

insert into shift_types (name, start_time, end_time, color, sort_order)
select '日勤', '09:00', '18:00', '#3e7c6b', 1
where not exists (select 1 from shift_types where name = '日勤');

insert into shift_types (name, start_time, end_time, color, sort_order)
select '遅出', '11:00', '20:00', '#5a7fb0', 2
where not exists (select 1 from shift_types where name = '遅出');

insert into shift_types (name, start_time, end_time, color, sort_order)
select '夜勤', '16:30', '09:30', '#6a5aa8', 3
where not exists (select 1 from shift_types where name = '夜勤');

-- ------------------------------------------------------------
-- 5. 人員配置基準の再設計（曜日 × 勤務パターン）
-- ------------------------------------------------------------
drop table if exists staffing_rules;

create table staffing_rules (
  weekday int not null check (weekday between 0 and 6), -- 0=月 ... 6=日
  shift_type_id uuid not null references shift_types(id) on delete cascade,
  min_count int not null default 0,
  primary key (weekday, shift_type_id)
);

comment on table staffing_rules is '曜日ごと・勤務パターンごとの最低必要人数。シフトカレンダーの初期値になる。';

-- 平日は少し手厚く、土日は少なめのデフォルトを投入
insert into staffing_rules (weekday, shift_type_id, min_count)
select wd, st.id, case
  when wd in (5, 6) then case st.name when '早番' then 1 when '日勤' then 2 when '遅出' then 1 when '夜勤' then 1 else 0 end
  else case st.name when '早番' then 2 when '日勤' then 3 when '遅出' then 2 when '夜勤' then 1 else 0 end
end
from generate_series(0, 6) as wd
cross join shift_types st
on conflict (weekday, shift_type_id) do nothing;

-- ------------------------------------------------------------
-- 6. 資格マスタを固定の6種類に統一
-- ------------------------------------------------------------
delete from qualifications
where name not in ('介護福祉士', '看護師', 'リハビリ職', 'ケアマネージャー', '社会福祉士', '事務職');

insert into qualifications (name)
values ('介護福祉士'), ('看護師'), ('リハビリ職'), ('ケアマネージャー'), ('社会福祉士'), ('事務職')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- 7. 希望一覧（shift_requests）の再設計
-- ------------------------------------------------------------
alter table shift_requests drop constraint if exists shift_requests_request_type_check;
alter table shift_requests drop constraint if exists shift_requests_staff_id_work_date_request_type_key;

alter table shift_requests add column if not exists type text;
update shift_requests set type = '休み希望' where type is null;
alter table shift_requests alter column type set not null;
alter table shift_requests add constraint shift_requests_type_check check (type in ('休み希望', '半休'));

alter table shift_requests drop column if exists request_type;
alter table shift_requests drop column if exists shift_type_id;

comment on table shift_requests is '職員から提出された休み希望・半休。管理者が一覧で確認・編集する。';

-- ------------------------------------------------------------
-- 8. Row Level Security の再設定
-- ------------------------------------------------------------
alter table admin_users enable row level security;

drop policy if exists "staff_select_own_or_admin" on staff;
drop policy if exists "staff_admin_write" on staff;
drop policy if exists "staff_admin_update" on staff;
drop policy if exists "staff_admin_delete" on staff;

drop policy if exists "staff_qualifications_select" on staff_qualifications;
drop policy if exists "shifts_select_own_or_admin" on shifts;
drop policy if exists "shift_requests_select_own_or_admin" on shift_requests;
drop policy if exists "shift_requests_insert_own" on shift_requests;
drop policy if exists "shift_requests_delete_own_or_admin" on shift_requests;
drop policy if exists "shift_requests_update_admin" on shift_requests;

create policy "admin_users_select_self" on admin_users
  for select using (id = auth.uid());

create policy "staff_select_authenticated" on staff
  for select using (auth.uid() is not null);
create policy "staff_admin_insert" on staff
  for insert with check (is_admin());
create policy "staff_admin_update" on staff
  for update using (is_admin());
create policy "staff_admin_delete" on staff
  for delete using (is_admin());

create policy "staff_qualifications_select_authenticated" on staff_qualifications
  for select using (auth.uid() is not null);

create policy "staffing_rules_select_authenticated" on staffing_rules
  for select using (auth.uid() is not null);
create policy "staffing_rules_admin_write" on staffing_rules
  for all using (is_admin()) with check (is_admin());

create policy "shifts_select_authenticated" on shifts
  for select using (auth.uid() is not null);

create policy "shift_requests_select_authenticated" on shift_requests
  for select using (auth.uid() is not null);
create policy "shift_requests_insert_authenticated" on shift_requests
  for insert with check (auth.uid() is not null);
create policy "shift_requests_update_authenticated" on shift_requests
  for update using (auth.uid() is not null);
create policy "shift_requests_delete_authenticated" on shift_requests
  for delete using (auth.uid() is not null);
