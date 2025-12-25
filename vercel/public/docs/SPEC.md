# PJバインダー 仕様（概要）

この文書は、実装と運用の共通理解のための「仕様メモ」です。

## 1. 構成

- 静的配信：`vercel/public/index.html`
- API：Vercel API Routes
  - `/api/rpc`：RPCディスパッチ（遅延import）
  - `/api/docs`：ヘルプMarkdown取得（※環境差が出る場合がある）
- データ：Supabase（service role）
- 外部：Google APIs（Docs作成など）

## 2. 重要な設計方針

### 2.1 失敗許容と必達
- Google Docs作成：ベストエフォート（失敗しても処理継続）
- Supabase保存：必達（主データの整合性を優先）

### 2.2 RPCの遅延import
- トップレベルimportでの失敗を避けるため、RPC単位でimportを遅延させる
- これにより `FUNCTION_INVOCATION_FAILED` のリスクを低減

## 3. ルーティングと表示

### 3.1 クエリパラメータ
- `?page=...`：ページ切替
- `?tab=...`：ダッシュボード内タブ切替（list/board/gantt）

### 3.2 注意点
- ページDOMが存在しない状態でタブ切替しない（ガードが必要）
- タブクリックが反応しない場合は、sticky要素の重なり（z-index）や初期化順が疑わしい

## 4. 勤怠仕様

### 4.1 打刻ボタン
- 出勤：オフィス / テレワーク / 外出 の3ボタン
- 休憩：休憩 / 休憩戻り
- 外出：外出 / 外出戻り
- 退勤：退勤 / 退勤取消（トグル）

### 4.2 退勤取消の扱い
- 退勤後に出勤を押した場合は「退勤取消」として扱う（退勤時刻をクリア）

### 4.3 表示順
- 勤怠カードは freee従業員番号の昇順

## 5. タスク仕様

### 5.1 ステータス
- todo / doing / blocked / done

### 5.2 setTaskStatus
- タスク状態更新はRPC `setTaskStatus` で行う
- カンバン移動・ボタン操作はこれを呼ぶ

---

## 付録：データフロー（Mermaid）

```mermaid
flowchart TD
  UI[Frontend index.html] -->|fetch| RPC[/api/rpc/]
  UI -->|fetch| DOCS[/docs/*.md (static)]
  RPC --> SUPA[(Supabase)]
  RPC --> GGL[(Google APIs)]
```
