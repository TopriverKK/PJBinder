# pj-binder (vercel)

`vercel/public/index.html` を静的配信し、`/api/rpc` 経由で Google Drive/Docs API を叩く移行用の足場です。

## ドキュメント

- [初使用者向け](docs/BEGINNER.md)
- [使用者向け](docs/USER_GUIDE.md)
- [仕様書（簡易）](docs/SPEC.md)

## 必須の環境変数

### Google (Service Account)

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
  - `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` の形式でOK（`\n` は自動で改行に変換します）

推奨（共有ドライブを使う場合）
- `GOOGLE_DRIVE_ID`（Shared Drive の ID）

フォルダ指定（どれか1つは必要）
- `GOOGLE_BASE_FOLDER_ID`（ベースフォルダ）
  - もしくは用途別に
    - `GOOGLE_PROJECT_DOCS_FOLDER_ID`
    - `GOOGLE_MINUTES_FOLDER_ID`
    - `GOOGLE_DAILY_REPORTS_FOLDER_ID`

任意
- `GOOGLE_LOGO_FILE_ID`（`getLogoDataUrl` 用）

## ここが一番大事：サービスアカウントに権限を渡す

サービスアカウントは「人」ではないので、
**対象のフォルダ/共有ドライブを、サービスアカウントのメールアドレスに共有**しないと一切見えません。

### 1) サービスアカウントのメールを確認

- GCPコンソール → **IAM と管理** → **サービス アカウント**
- 対象のサービスアカウントを開く
- `xxxx@xxxx.iam.gserviceaccount.com` をコピー

これが `GOOGLE_CLIENT_EMAIL` です。

### 2-A) 「マイドライブのフォルダ」を使う場合（おすすめ：まずこれで動作確認）

1. Google Driveで、Docsを置きたいフォルダを右クリック → **共有**
2. 「ユーザーやグループを追加」にサービスアカウントのメールを貼り付け
3. 権限はまず **編集者**（Editor）
4. 共有

このフォルダのURLが
`https://drive.google.com/drive/folders/<FOLDER_ID>`
なら、`<FOLDER_ID>` が `GOOGLE_BASE_FOLDER_ID` になります。

### 2-B) 「共有ドライブ（Shared Drive）」を使う場合

共有ドライブ配下に作るなら、フォルダ共有だけでなく **共有ドライブのメンバー**に入れるのが確実です。

1. Google Drive → 左の **共有ドライブ** を開く
2. 対象の共有ドライブ名の右側メニュー → **メンバーを管理**
3. サービスアカウントのメールを追加
4. ロールはまず **コンテンツ管理者**（または少なくとも編集できるロール）

次に、Docsを置く「基準フォルダ」を1つ決めて、そのフォルダIDを `GOOGLE_BASE_FOLDER_ID` に入れます。

※ `GOOGLE_DRIVE_ID` は「共有ドライブそのもののID」です。分からない場合は最初は空でもOK（この実装は allDrives を検索します）。

### 3) ロゴファイル（任意）

`GOOGLE_LOGO_FILE_ID` はDrive上の画像ファイルIDです。
URLが
`https://drive.google.com/file/d/<FILE_ID>/view`
なら `<FILE_ID>` を設定します。

## Vercelの環境変数の入れ方

1. Vercelでプロジェクトを開く
2. **Settings** → **Environment Variables**
3. 下記を **すべて** 追加（少なくとも Google と Supabase）

注意：`GOOGLE_PRIVATE_KEY` は改行を含むので、どちらかの方法で入れます。

- 方法A（おすすめ）：値に改行を含めてそのまま貼る
- 方法B：改行を `\n` に置換して1行で貼る（このプロジェクトは自動で `\n`→改行に戻します）

例（方法Bのイメージ）

`-----BEGIN PRIVATE KEY-----\nAAAA...\n-----END PRIVATE KEY-----\n`

### Supabase の値

- `SUPABASE_URL` … SupabaseプロジェクトのURL（`https://xxxx.supabase.co`）
- `SUPABASE_SERVICE_ROLE_KEY` … Supabaseの **Service Role** キー
  - Supabaseダッシュボード → Project Settings → API → `service_role` を使用
  - これは **絶対にフロントへ出さない**（今は `/api/rpc` だけが使うのでOK）

## GitHub連携でデプロイする（おすすめ）

このリポジトリには **秘密情報をコミットしません**（鍵JSON / `GOOGLE_PRIVATE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 等）。

### 1) GitHubにpush

PowerShell例（リポジトリ未作成なら先にGitHubで空のrepoを作成してURLを取得）：

```powershell
cd "C:\Users\kodai\Box\06. TRアカデミー\002. システム開発・運用\099. 個人用\川尻\PJバインダー\20251223"

git init
git add -A
git commit -m "Initial import"

git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

### 2) VercelでImport

1. Vercel → **Add New...** → **Project**
2. GitHubのリポジトリを選択
3. **Root Directory** は `vercel` を指定（ここが重要）
4. Framework preset は **Other**（静的 + API）
5. **Environment Variables** を設定（このREADMEの通り）
6. Deploy

### Supabase (Server side)

Docs作成後に `Projects/Tasks/Minutes/DailyReports` の `docId` 等を更新するために使います。

- `SUPABASE_URL`（例: `https://xxxx.supabase.co`）
- `SUPABASE_SERVICE_ROLE_KEY`

## 実装済みRPC

UI(`index.html`)から呼ばれるDocs系RPCを、Google APIで実装しました。

- `createProjectDoc(projectId)` → `{ ok:true, project, url }`
- `createTaskDoc(taskId)` → `{ docId, url }`
- `createMinuteDoc(input)` → `{ docId, url, id }`
- `createDailyReportDoc(r)` → `{ ok:true, docId, url }`
- `setDocLinkShare(docId, role)`
- `replaceDocWithMemo(docId, memoText)`
- `appendDocWithMemo(docId, memoText)`
- `getLogoDataUrl()`

## Deep link（URLパラメータ）

各ページはクエリパラメータで直接開けます（ブックマーク/ショートカット用）。

- `?page=<pageId>` … 例: `?page=attendance`
- `?page=attendance&view=dashboard|summary`
  - `dashboard` … 今日の勤怠（打刻/予定表示）
  - `summary` … 月次/週次サマリ（freee CSV含む）
- `?tab=list|board|gantt` … タスク表示のタブ直行（例: `?page=dashboard&tab=gantt`）

※ `tab` は主に「タスク表示（List/Board/Gantt）」の切替に使われます。

## 勤怠：タブレット常時表示（自動更新）

勤怠ダッシュボードには「自動更新」チェックボックスと更新間隔の選択があります。

- チェックONで自動更新開始、チェックOFFで停止
- 勤怠以外のページを開く / サマリ表示へ切替 / 画面が非表示（タブ切替等）になると自動停止
- 間隔: `10s / 60s / 120s(デフォルト) / 300s`

おすすめ（タブレット固定表示）: `?page=attendance&view=dashboard` をブックマークし、自動更新をONにします。

## Supabase: Users に追加する列（勤怠設定）

ユーザーごとの設定を `users` テーブルに持たせます（UIの「ユーザー」タブで編集）。

- `employeeNumber` … freee の従業員番号（CSV出力に使用）
- `calendarUrl` … 個人カレンダーの ICS URL（勤怠画面の予定表示に使用）
- `attendanceVisible` … 勤怠画面/CSVに表示するか（`false` で非表示）

Supabase の SQL Editor で以下を実行してください（camelCase のためダブルクォート必須）。

```sql
alter table public.users add column if not exists "employeeNumber" text;
alter table public.users add column if not exists "calendarUrl" text;
alter table public.users add column if not exists "attendanceVisible" boolean default true;
```

## ローカルチェック

TypeScriptの型チェックのみ（Google/Supabaseの認証までは行いません）。

```powershell
cd .\vercel
npm install
npx tsc -p .\tsconfig.json --noEmit
```
