# 介護事業所向けシフト管理アプリ

管理者がシフトを作成・管理し、職員はスマホでシフト確認と希望提出ができるWebアプリです。

- 管理者用：職員マスタ・勤務パターン・人員配置基準の設定、シフトカレンダーでの割り当て（基準未達を自動で警告）、職員からの希望一覧確認
- 職員用：自分のシフトをスマホで確認、休み希望・勤務希望の提出

## 技術構成

- Next.js（App Router / TypeScript）+ Tailwind CSS
- Supabase（Postgres + 認証 + Row Level Security）
- デプロイ先：Vercel（無料枠で開始可能）

## セットアップ手順

### 1. Supabaseプロジェクトを作成する

1. [supabase.com](https://supabase.com) にアクセスし、無料アカウントを作成
2. 「New Project」から新しいプロジェクトを作成（リージョンは Tokyo (ap-northeast-1) がおすすめです）
3. プロジェクト作成後、左メニューの「SQL Editor」を開く
4. このリポジトリの `supabase/migrations/0001_init.sql` の内容をすべてコピーして貼り付け、実行する
   - 職員マスタ・資格マスタ・勤務パターン・配置基準・シフト・希望提出の各テーブルと、権限（RLS）の設定が一括で作られます
   - サンプルの資格（介護福祉士など）と勤務パターン（早番・日勤・遅番）も入ります。事業所の実情に合わせて「勤務パターン・配置基準」画面から編集してください

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

1. アプリの「はじめての方はこちら」からアカウント作成（メールアドレス＋パスワード）
2. Supabaseの「SQL Editor」で以下を実行し、自分を職員マスタに管理者として登録する（メールアドレスは実際に登録したものに置き換えてください）

```sql
insert into staff (email, full_name, role)
values ('あなたのメールアドレス', 'あなたの氏名', 'admin');
```

3. 一度ログアウトして再度ログインすると、管理者画面に入れます

### 5. 職員を登録する

管理者画面の「職員管理」から、氏名・メールアドレス・保有資格を登録してください。職員本人が同じメールアドレスでアカウント作成（サインアップ）すると、自動的にその職員情報と紐付きます。

### 6. Vercelにデプロイする

1. このプロジェクトをGitHubリポジトリにpushする
2. [vercel.com](https://vercel.com) でアカウント作成し、「Add New Project」からこのリポジトリを選択
3. 環境変数（`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`）をVercelのプロジェクト設定に追加
4. デプロイすると、職員がスマホからアクセスできるURLが発行されます

## 画面構成

- `/login` — ログイン・アカウント作成
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
