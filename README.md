# 介護事業所向けシフト管理アプリ

管理者がシフトを作成・管理し、職員はスマホでシフト確認と希望提出ができるWebアプリです。

- 管理者用：職員マスタ（メールアドレス不要・手打ち登録）・勤務パターン（早番/日勤/遅出/夜勤）・曜日ごとの人員配置基準の設定、シフトカレンダーでの割り当て（基準未達を自動で警告）、職員からの希望一覧の確認・編集
- 職員用：事業所で共有しているアカウントでログインし、自分の名前を選ぶだけでシフト確認・休み希望／半休の提出ができます（個別のメールアドレス登録は不要）

## 技術構成

- Next.js（App Router / TypeScript）+ Tailwind CSS
- Supabase（Postgres + 認証 + Row Level Security）
- デプロイ先：Vercel（無料枠で開始可能）

## セットアップ手順

### 1. Supabaseプロジェクトを作成する

1. [supabase.com](https://supabase.com) にアクセスし、無料アカウントを作成
2. 「New Project」から新しいプロジェクトを作成（リージョンは Tokyo (ap-northeast-1) がおすすめです）
3. プロジェクト作成後、左メニューの「SQL Editor」を開く
4. `supabase/migrations/0001_init.sql` の内容をすべてコピーして貼り付けて実行する
   - 職員マスタ・資格マスタ・勤務パターン・配置基準・シフト・希望提出の各テーブルと、権限（RLS）の設定が一括で作られます
5. 続けて `supabase/migrations/0002_mock_update.sql` の内容も同じSQL Editorで実行する（新しいクエリとして貼り付けてください）
   - 職員マスタからメールアドレス・権限を削除し、役職名を追加
   - 管理者かどうかを判定する専用テーブル（`admin_users`）を新設
   - 人員配置基準を「曜日 × 勤務パターン」で最低人数を持つ形に変更（デフォルト値入り）
   - 勤務パターンに「夜勤」を追加し、資格を6種類（介護福祉士・看護師・リハビリ職・ケアマネージャー・社会福祉士・事務職）に統一
   - 希望一覧を「休み希望・半休」のシンプルな形に変更

### 2. 環境変数を設定する

1. Supabaseのプロジェクト画面で「Settings」→「API」を開く
2. `Project URL` と `anon public` キーをコピー
3. `.env.local.example` を `.env.local` にコピーし、値を貼り付ける

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=あなたのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon public key
```

### 3. ローカルで動作確認する

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くとログイン画面が表示されます。

### 4. 最初の管理者アカウントを作る

このアプリはアプリ内サインアップを廃止しています。アカウントはSupabaseの管理画面から作成してください。

1. Supabaseの「Authentication」→「Users」→「Add user」で、管理者用のメールアドレス・パスワードを設定してユーザーを作成する
2. 「SQL Editor」で以下を実行し、そのユーザーを管理者として登録する（メールアドレスは実際に作成したものに置き換えてください）

```sql
insert into admin_users (id, full_name)
select id, 'あなたの氏名' from auth.users where email = 'あなたのメールアドレス';
```

3. アプリの `/login` からそのメールアドレス・パスワードでログインすると、管理者画面に入れます

### 5. 職員を登録する・職員用の共有アカウントを作る

1. 管理者画面の「職員管理」から、氏名・雇用形態・役職名・保有資格を登録します（メールアドレスの入力は不要です）
2. 職員がスマホで使うためのアカウントを1つ、Supabaseの「Authentication」→「Users」→「Add user」から作成します（例: `staff@あなたの事業所ドメイン` のような共有メールアドレス＋パスワード）。これは職員全員で共有して使うアカウントです
3. そのメールアドレス・パスワードを職員に伝えてください。職員は `/login` でログイン後、最初に自分の名前を選ぶと、以降その端末では自動的に自分のシフト・希望提出画面が開きます（名前は「名前を変更」からいつでも選び直せます）

### 6. Vercelにデプロイする

1. このプロジェクトをGitHubリポジトリにpushする
2. [vercel.com](https://vercel.com) でアカウント作成し、「Add New Project」からこのリポジトリを選択
3. 環境変数（`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`）をVercelのプロジェクト設定に追加
4. デプロイすると、職員がスマホからアクセスできるURLが発行されます

## 画面構成

- `/login` — ログイン（アカウントはSupabase側であらかじめ作成）
- `/admin` — シフトカレンダー（管理者）
- `/admin/staff` — 職員管理（管理者）
- `/admin/shift-types` — 勤務パターン・人員配置基準（管理者）
- `/admin/requests` — 職員からの希望一覧（管理者）
- `/staff` — 自分のシフト確認（職員）
- `/staff/requests` — 希望を出す（職員）

## 今後の拡張案（Phase 2）

- 希望・公平性を加味した自動シフト提案
- 職員ごとの勤務回数・休日数の公平性の可視化
- LINE WORKSなどへの通知連携
- 有給休暇の管理

## データを削除・リセットしたいとき

Supabaseの「Table Editor」から各テーブルのデータを直接編集・削除できます。テーブル構造自体を変更したい場合は、`supabase/migrations/` に新しいSQLファイルを追加し、SQL Editorで実行してください。
