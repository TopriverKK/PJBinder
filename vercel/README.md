# pj-binder (vercel)

`vercel/public/index.html` を静的配信し、`/api/rpc` 経由で Google Drive/Docs API を叩く移行用の足場です。

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

## ローカルチェック

TypeScriptの型チェックのみ（Google/Supabaseの認証までは行いません）。

```powershell
cd .\vercel
npm install
npx tsc -p .\tsconfig.json --noEmit
```
