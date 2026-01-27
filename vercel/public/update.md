# アップデート
## 2026-01-27 (v1.410a)
- 概要: 休日ICSの繰り返し対応と更新履歴の修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>休日ICSのRRULE/EXDATEを展開して公休日に反映</li>
<li>更新履歴の文字化けを修正</li>
</ul>
</details>
## 2026-01-27 (v1.410)
- 概要: 出勤カレンダーの公休日表示と勤務サマリ
<details>
<summary>個別の変更内容</summary>
<ul>
<li>会社休日ICSの日は「公休日」表示に変更</li>
<li>カレンダー上部に勤務サマリ（出勤日数/勤務時間/所定/所定内/時間外/有給）を追加</li>
</ul>
</details>
## 2026-01-27 (v1.409)
- 概要: ユーザーパスワードのハッシュ化と変更時の本人確認
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ユーザーパスワードをbcryptで保存（平文保存を廃止）</li>
<li>パスワード変更時に「現在PW」の照合を必須化</li>
<li>勤怠修正時のパスワード照合もbcrypt対応（初回照合時に再ハッシュ）</li>
</ul>
</details>
## 2026-01-27 (v1.408a)
- 概要: ダッシュボードの工数管理表示を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>プロジェクト/タスク追加・編集モーダルに想定工数を追加</li>
<li>タスク一覧・プロジェクト一覧に工数列（投下/想定）を追加</li>
<li>数値項目が空欄でも保存できるように修正</li>
</ul>
</details>
## 2026-01-27 (v1.407)
- 概要: プロジェクト工数/コスト集計の基盤追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ユーザー時給・プロジェクト見積/予算・タスク配賦工数の項目を追加</li>
<li>プロジェクト一覧に実績工数/コストと消化率を表示</li>
<li>期間指定の集計（週/今月/期間）に対応</li>
</ul>
</details>
## 2026-01-27 (v1.406)
- 概要: ユーザー勤務情報の拡張と自動休憩
<details>
<summary>個別の変更内容</summary>
<ul>
<li>勤務情報修正モーダルを追加（定時/コアタイム/フレックス＋複数休憩）</li>
<li>パスワード未設定の表示を追加</li>
<li>勤務中の自動休憩切替を追加（固定休憩時刻）</li>
</ul>
</details>
## 2026-01-27 (v1.405b)
- 概要: 出勤ガントの表示改善（改行/ホバー）
<details>
<summary>個別の変更内容</summary>
<ul>
<li>勤務状況/予定/タスクを改行表示で読みやすく調整</li>
<li>タスク未設定のグレー表示対応</li>
<li>全ガント項目にホバー詳細（title）を付与</li>
</ul>
</details>
## 2026-01-27 (v1.405a)
- 概要: 出勤状況カレンダー/週ガントの表示調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>カレンダー日付に曜日を追加表示</li>
<li>週ガントを「日付ごとに3レーン横並び」に修正</li>
</ul>
</details>
## 2026-01-27 (v1.405)
- 概要: 出勤状況UIの調整（曜日表示/データタブ/週ガント）
<details>
<summary>個別の変更内容</summary>
<ul>
<li>勤怠修正モーダルで日付の曜日を表示</li>
<li>出勤状況の「サマリ/修正」を統合して「データ」タブに移動</li>
<li>週ガントを各ユーザーの3レーン横並び表示に変更</li>
</ul>
</details>
## 2026-01-27 (v1.404)
- 概要: 出勤状況カレンダー/勤怠修正/ガントの表示改善
<details>
<summary>個別の変更内容</summary>
<ul>
<li>カレンダーに日別の「編集」ボタンを追加</li>
<li>勤怠修正モーダルでパスワード誤り時に警告ポップアップを表示</li>
<li>ガントを日単位/週単位で切替（横並び表示・列幅調整）</li>
</ul>
</details>
## 2026-01-27 (v1.403)
- 概要: 出勤状況のカレンダー詳細・勤怠修正リスト・縦ガントを改善
<details>
<summary>個別の変更内容</summary>
<ul>
<li>カレンダーの日セルに勤務時間とタスク一覧を表示</li>
<li>勤怠修正を「人×月」のリスト表示に変更し、修正はモーダルで実施</li>
<li>縦ガントを「勤務状況/タスク/予定」の3レーン構成で表示</li>
</ul>
</details>

## 2026-01-27 (v1.402)
- 概要: タスク保留対応と日報残タスクの階層調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>タスク一覧に「保留」を追加</li>
<li>保留中タスクは日報の残タスク自動記入から除外</li>
<li>日報の残タスク階層のインデントを調整</li>
</ul>
</details>

## 2026-01-27 (v1.401)
- 概要: 勤怠修正と勤怠可視化（カレンダー/ガント）を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ユーザーの勤怠修正用パスワードに対応（users.userPassword 追加）</li>
<li>勤怠修正の保存時にパスワード入力を必須化</li>
<li>勤怠修正画面を追加（パスワード照合で手動修正）</li>
<li>月次カレンダーと日次ガントで勤怠の可視化を追加</li>
</ul>
</details>

## 2026-01-22 (v1.40ad)
- 概要: 日報の残タスク箇条書きをリンク付き階層で出力
<details>
<summary>個別の変更内容</summary>
<ul>
<li>残タスクの箇条書きをプロジェクト→タスク→メモの階層で生成</li>
<li>プロジェクト/タスク名にのみハイパーリンクを設定</li>
</ul>
</details>

## 2026-01-22 (v1.40ac)
- 概要: 日報の残タスクをプロジェクト階層で出力
<details>
<summary>個別の変更内容</summary>
<ul>
<li>残タスクをプロジェクト→タスク→メモの階層で出力</li>
<li>プロジェクト/タスクのDocs URLを自動で付与</li>
</ul>
</details>

## 2026-01-22 (v1.40ab)
- 概要: 日報の残タスク表記を調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>残タスクの箇条書きから - [ ] を削除</li>
</ul>
</details>

## 2026-01-22 (v1.40aa)
- 概要: 承認ルートの順序/メンバー検証を強化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>承認者がルートに含まれるかをクライアント/サーバで検証</li>
<li>承認順は選択順で保存し、順序が違う承認は拒否</li>
</ul>
</details>

## 2026-01-22 (v1.40z)
- 概要: 日報テンプレートの重複表示と承認ルート判定を修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>テンプレート利用時は本文プレースホルダ置換のみで追記しない</li>
<li>承認ルートが未完了のときは承認済みにしない</li>
</ul>
</details>

## 2026-01-22 (v1.40y)
- 概要: 日報の残タスク差し替えと承認エラー対策
<details>
<summary>個別の変更内容</summary>
<ul>
<li>日報テンプレート生成時に残タスクを未完了タスクの箇条書きへ置換</li>
<li>承認処理時に申請情報が不足している場合は中断</li>
</ul>
</details>

## 2026-01-22 (v1.40x)
- 概要: 日報テンプレートと入出金一覧の表示改善
<details>
<summary>個別の変更内容</summary>
<ul>
<li>日報テンプレートの【残タスク】を担当未完了タスクの箇条書きに差し替え</li>
<li>日報Docsの末尾タイトル行を非表示化</li>
<li>入出金一覧を画面横幅いっぱいに表示</li>
<li>ダッシュボードのメモ欄はコンパクト表示でも自動伸縮</li>
</ul>
</details>

## 2026-01-22 (v1.40w)
- 概要: 決済申請の空データ登録を防止
<details>
<summary>個別の変更内容</summary>
<ul>
<li>承認処理で申請IDが空のときは処理しない</li>
<li>新規作成時は件名/申請者が必須になるようサーバー側でも検証</li>
</ul>
</details>

## 2026-01-22 (v1.40v)
- 概要: iCD非表示切替と設定のパスワード保護
<details>
<summary>個別の変更内容</summary>
<ul>
<li>未実装タブの表示切替をデバッグに追加（デフォルトOFF）</li>
<li>設定タブのテナント設定をパスワード解除後のみ表示/操作</li>
</ul>
</details>

## 2026-01-20 (v1.40u)
- 概要: iCDタブと初期データ取込の追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>iCDタブを追加し部門/役割/大分類/ユーザーで絞り込み</li>
<li>ユーザーごとの習熟度/達成目標/達成評価/コメントを保存</li>
<li>CSVの初期データ取込とiCDテーブル/テンプレートSQLを追加</li>
</ul>
</details>

## 2026-01-20 (v1.40t)
- 概要: Docs作成時の共有ドライブ不整合を回避
<details>
<summary>個別の変更内容</summary>
<ul>
<li>共有ドライブIDが無効な場合はallDrivesに自動フォールバック</li>
<li>設定の旧データ(tenant_idなし)を初回取得時に自動移行</li>
<li>Docs作成時にGoogle設定が欠けている場合は例外で止めず保存を継続</li>
</ul>
</details>

## 2026-01-19 (v1.40s)
- 概要: settingsテンプレート補完の強化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settings未設定時にsettings_templateから値を補完</li>
</ul>
</details>

## 2026-01-19 (v1.40r)
- 概要: ドキュメント設定と表示の修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ドキュメントテンプレートIDをsettings_templateからも補完</li>
<li>添付/Docsのアイコン表示を復旧</li>
</ul>
</details>

## 2026-01-19 (v1.40q)
- 概要: 設定の不具合を修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>メニューバー固定の挙動を密度変更後も維持</li>
<li>ダッシュボード既定ビューを画面遷移時に適用</li>
</ul>
</details>

## 2026-01-19 (v1.40p)
- 概要: 表示密度のスケールを追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>コンパクト/標準/ゆったりでUIスケールを切り替え</li>
<li>ゆったり表示で高解像度向けの文字レンダリングを強化</li>
</ul>
</details>

## 2026-01-19 (v1.40o)
- 概要: 設定値のマスク表示を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設定一覧のvalueを先頭8文字のみ表示し、それ以降はマスク</li>
</ul>
</details>

## 2026-01-19 (v1.40n)
- 概要: settingsキーの整理とロゴ設定の統一
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settings_templateをテナント非依存テーブルとして扱うよう更新</li>
<li>settings保存時のupsertをテナント対応に統一</li>
<li>settings取得時もテンプレート不足分を補完</li>
<li>ロゴ設定をGOOGLE_LOGO_FILE_IDへ統一</li>
</ul>
</details>

## 2026-01-19 (v1.40j)
- 概要: Google認証情報をsettings管理へ一本化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>Googleサービスアカウント情報をsettingsから読み込むよう変更</li>
<li>settings_templateにGoogle関連キーを追加</li>
</ul>
</details>

## 2026-01-19 (v1.40i)
- 概要: LOGO_URLをDrive APIで取得する方式に統一
<details>
<summary>個別の変更内容</summary>
<ul>
<li>LOGO_URLのID/共有URLからDrive API経由でロゴを取得</li>
<li>環境変数のロゴ取得と同じ仕組みに統一</li>
</ul>
</details>

## 2026-01-19 (v1.40h)
- 概要: settings補完のフォールバックを追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settings_template未作成でも既定キーで補完するよう改善</li>
<li>補完処理のエラー時に500にならないよう緩和</li>
</ul>
</details>

## 2026-01-19 (v1.40g)
- 概要: ロゴURLのDrive変換とsettings補完の安定化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>LOGO_URLがDrive共有URLの場合もIDとして解釈</li>
<li>settings保存時にユニーク制約未適用でも挿入できるように改善</li>
</ul>
</details>

## 2026-01-19 (v1.40f)
- 概要: LOGO_URLにGoogle Drive IDを直接指定可能に
<details>
<summary>個別の変更内容</summary>
<ul>
<li>LOGO_URLがURLでない場合はDriveのファイルIDとして解釈</li>
</ul>
</details>

## 2026-01-19 (v1.40e)
- 概要: settingsテンプレートの導入と自動補完を改善
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settings_templateから不足キーを補完するよう変更</li>
<li>settings_template作成/投入SQLを追加</li>
</ul>
</details>

## 2026-01-19 (v1.40d)
- 概要: settings保存時のモジュール読み込みエラーを修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settings保存時の動的import先を修正</li>
</ul>
</details>

## 2026-01-19 (v1.40c)
- 概要: 透かしロゴの前面表示と透明度設定を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>透かしロゴを最前面に表示するよう調整</li>
<li>設定で透かしロゴの透明度を指定可能に</li>
</ul>
</details>

## 2026-01-19 (v1.40b)
- 概要: テナント別settingsの自動補完を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設定タブを開いた際に不足キーを補完する処理を追加</li>
<li>既存テナントのsettingsキーをテンプレートとして流用</li>
</ul>
</details>

## 2026-01-19 (v1.40a)
- 概要: ロゴURLをsettingsで管理
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settingsのLOGO_URLがあればそれを優先してロゴを表示</li>
<li>未設定時は従来通り環境変数のロゴを使用</li>
</ul>
</details>

## 2026-01-19 (v1.40)
- 概要: テナント別のSettings編集を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設定画面からテナントごとのsettingsキー/値を編集可能に</li>
<li>settings保存時にupdatedAtを更新</li>
</ul>
</details>

## 2026-01-19 (v1.34p)
- 概要: settingsのテナント対応を強化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>settingsをUUID主キーへ移行するSQLを追加</li>
<li>settings取得/保存をtenant_id + keyの組み合わせで更新</li>
</ul>
</details>

## 2026-01-19 (v1.34o)
- 概要: メニューバーの表示位置/固定を設定可能に
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設定タブにメニューバー位置（上/下）と固定表示の設定を追加</li>
<li>メニューバーを上部/下部に移動できるようUIを調整</li>
</ul>
</details>

## 2026-01-19 (v1.34n)
- 概要: 設定タブを追加しローカル保存に対応
<details>
<summary>個別の変更内容</summary>
<ul>
<li>「設定」タブで表示密度/既定ビュー/ガントスケールなどを編集可能に</li>
<li>透かし/ツールチップ/右下ボタンの表示切替を追加</li>
<li>設定内容をブラウザに保存して反映</li>
</ul>
</details>

## 2026-01-19 (v1.34m)
- 概要: ヘッダーにテナント名を表示
<details>
<summary>個別の変更内容</summary>
<ul>
<li>テナント名の取得RPCを追加</li>
<li>ヘッダー左側にテナント名バッジを表示</li>
</ul>
</details>

## 2026-01-19 (v1.34l)
- 概要: テナント初期データのSQL追加と文言調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>tenants 追加用SQLを作成（既存テナントの名称反映/新規テナント追加）</li>
<li>画面上の文言/絵文字の調整を反映</li>
</ul>
</details>

## 2026-01-19 (v1.34k)
- 概要: テナント識別の自動化とURL指定を追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>RPCでtenant_idを必須化し、host/ヘッダー/環境変数から解決</li>
<li>Supabaseアクセスでtenant_idの自動付与とフィルタを追加</li>
<li>URLの?tenant=...でテナントを指定して接続できるよう対応</li>
</ul>
</details>

## 2026-01-19 (v1.34j)
- 概要: 使い方表示の正規表現エラーを修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>Shift_JIS判定用の正規表現を修正</li>
</ul>
</details>

## 2026-01-19 (v1.34i)
- 概要: GAS依存を撤去してRPCに統一
<details>
<summary>個別の変更内容</summary>
<ul>
<li>google.script.run を廃止して /api/rpc に直接接続</li>
<li>GASチェックやGAS用のポリフィルを削除</li>
</ul>
</details>

## 2026-01-19 (v1.34h)
- 概要: 週次フィルタの保持改善と上部メニューのキャプション追加
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次フィルタをデータ読み込み後に復元するよう調整</li>
<li>上部メニューにタブ説明のツールチップを追加</li>
</ul>
</details>

## 2026-01-19 (v1.34g)
- 概要: 週次の絞り込み復元とヘッダーのバージョン表示を改善
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次フィルタの保存を初期描画で上書きしないよう調整</li>
<li>update.md からヘッダーにバージョンを表示</li>
</ul>
</details>

## 2026-01-19 (v1.34f)
- 概要: 週次のユーザー絞り込みを保存
<details>
<summary>個別の変更内容</summary>
<ul>
<li>所属/ユーザーのフィルタをブラウザに保存</li>
<li>次回起動時に前回の選択を復元</li>
</ul>
</details>

## 2026-01-19 (v1.34e)
- 概要: 週次の保存時にuserId/projectIdの混入を防止
<details>
<summary>個別の変更内容</summary>
<ul>
<li>保存時にuserIdとprojectIdを正規化</li>
<li>壊れたキーの上書き保存で正しいキーへ更新</li>
</ul>
</details>

## 2026-01-19 (v1.34d)
- 概要: 週次メモの表示欠落を修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次保存時のID復元をdata属性で安定化</li>
<li>壊れたuserIdを表示時に正規化して読み取り</li>
<li>週次レコード由来のプロジェクトも表示対象に追加</li>
</ul>
</details>

## 2026-01-19 (v1.34c)
- 概要: ダッシュボードのクイック追加を廃止し右下ボタンに一本化
<details>
<summary>個別の変更内容</summary>
<ul>
<li>左側のクイック追加パネルを非表示化</li>
<li>折りたたみ状態の制御を無効化して依存フォームは維持</li>
</ul>
</details>


## 2026-01-16 (v1.34b)
- 概要: ドキュメントを現行の勤怠仕様に合わせて更新
<details>
<summary>個別の変更内容</summary>
<ul>
<li>BEGINNER/USER_GUIDE/SPEC の勤怠・ユーザー設定項目を更新</li>
<li>勤怠表示の最新仕様を反映</li>
</ul>
</details>

## 2026-01-16 (v1.34a)
- 概要: 出勤状況の勤務時間表示を休憩前の値に変更
<details>
<summary>個別の変更内容</summary>
<ul>
<li>本日の勤務時間を「本日hh時間mm分(うち休憩mm分)」で表示</li>
</ul>
</details>

## 2026-01-16 (v1.34)
- 概要: 出勤の固定休憩と所定勤務をユーザー別に設定可能に変更
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ユーザーに勤務形態・所定勤務時間・固定休憩時間を追加</li>
<li>勤務時間計算と月次集計にユーザー設定を反映</li>
<li>ATTENDANCE_SPEC を vercel 配下へ移動して更新</li>
</ul>
</details>

## 2026-01-16 (v1.33a)
- 概要: 設備予約の右側ガント表示の崩れを修正
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設備予約タブを1カラム化して右側ガントが全幅で表示されるよう調整</li>
</ul>
</details>

## 2026-01-16 (v1.33)
- 概要: 設備予約のガント表示を右カラム全幅に調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>予約フォームは固定幅、ガント側は残り全幅で表示</li>
<li>ガントの横幅をカラム内で100%に統一</li>
</ul>
</details>

## 2026-01-16 (v1.32)
- 概要: 設備予約のガント下に今日の予約一覧を配置
<details>
<summary>個別の変更内容</summary>
<ul>
<li>予約一覧をガントの下へ移動して重なりを解消</li>
<li>予約一覧は当日の予約のみ表示</li>
</ul>
</details>

## 2026-01-16 (v1.31)
- 概要: 設備予約の登録とガントを同時表示に変更
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設備予約タブで登録フォームと週次ガントを並列表示</li>
<li>ガント専用タブを廃止</li>
</ul>
</details>

## 2026-01-16 (v1.30)
- 概要: 週次のプロジェクト並び順を優先度順に調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次の各ユーザー内でプロジェクトを優先度(高→中→低)順に並べ替え</li>
</ul>
</details>

## 2026-01-16 (v1.29)
- 概要: 週次メモを非アクティブ時に自動保存へ変更
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次の課題/実施メモをフォーカス解除で保存</li>
<li>週次の保存ボタンを削除</li>
</ul>
</details>

## 2026-01-16 (v1.28)
- 概要: 画面拡大/縮小時のヘッダー表示崩れを防止
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ヘッダーを折り返し可能にしてツールバー/ナビのはみ出しを防止</li>
</ul>
</details>

## 2026-01-16 (v1.27)
- 概要: 設備予約の自動承認・重複禁止と入力デフォルトを調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>設備予約のステータス入力を廃止し自動承認に変更</li>
<li>同一設備の時間重複予約を禁止</li>
<li>開始/終了日を当日で初期化し、時刻は15分刻み＋クリックで30分刻み初期値</li>
<li>場所の例文を本社事務所に変更</li>
</ul>
</details>

## 2026-01-16 (v1.26)
- 概要: 設備予約ガントの重なり表示を分割レイアウトに対応
<details>
<summary>個別の変更内容</summary>
<ul>
<li>同一時間帯の予約を列分割して横並び表示</li>
<li>ガント内イベントのレイアウト計算を改善</li>
</ul>
</details>

## 2026-01-16 (v1.25)
- 概要: 週次メモの最小高さとヘッダーのバージョン表示を調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次の課題/実施メモの最小高さをさらに縮小</li>
<li>ヘッダーのタイトル横にバージョン表示を常時配置</li>
</ul>
</details>

## 2026-01-16 (v1.24)
- 概要: ダッシュボードのプロジェクト優先度をインライン編集対応し、Flyoutのnull参照を防止
<details>
<summary>個別の変更内容</summary>
<ul>
<li>プロジェクト一覧の優先度をクリックで更新可能に追加</li>
<li>フライアウトのclassList参照にnullガードを追加</li>
</ul>
</details>

## 2026-01-16 (v1.23)
- 概要: 週次メモの未入力時の行高をさらに縮小
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次メモの最小高さを短く調整</li>
</ul>
</details>

## 2026-01-16 (v1.22)
- 概要: 週次メモのデフォルト行数を調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>週次の課題/実施メモの初期行数を3行に変更</li>
</ul>
</details>

## 2026-01-16 (v1.21)
- 概要: アップデート表示モーダルの操作性と見た目を調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>モーダル外クリックで閉じるように修正</li>
<li>折りたたみ詳細が外に出ないよう非表示制御を追加</li>
<li>行間を詰めて読みやすく調整</li>
</ul>
</details>

## 2026-01-16 (v1.20)
- 概要: ダッシュボードの絞り込みをプロジェクト一覧に反映し、週次のメモ表示を読みやすく調整
<details>
<summary>個別の変更内容</summary>
<ul>
<li>ダッシュボードのフィルタ適用時にプロジェクト一覧も再描画</li>
<li>週次メモの文字色を黒に変更</li>
<li>週次メモのみBIZ UDPGothic系フォントに変更</li>
</ul>
</details>

## 2025-12-26
- 添付資料の管理をモーダル化（名称/URLの分割入力・削除に対応）
- タスク一覧/プロジェクト一覧から添付編集ボタンで直接管理
- 上部メニューに「アップデート」ボタンを追加
- `update.md` を参照して更新履歴を表示
- 既存添付の更新/削除APIを追加
- マニフェスト取得時の認証エラー対策（use-credentials）
- 添付ボタンの構文エラーを修正
- サブスク登録フォームを編集対応し、一覧から更新/削除できるように改善
- 設備予約・決済申請タブを実装（UI + 登録/一覧/編集/削除）
- 週次タブで担当タスクの割当判定を拡張（主担当以外でも未完了タスクを表示）
- 施設予約/決済申請のSupabaseテーブルSQLを追加
- index.html の構文エラーを修正
- サブスクのメモ保存を memo に統一し、税区分の表記を税率へ変更
- プロジェクト/タスクの??を行内スライド表示に戻し、添付数カウントを正規化
- 出勤状況の業務時間から休憩時間を除外
- サブスクに税込/税抜金額の保存列を追加し、税率から計算して保存
- 添付ボタンを「??n添付を表示」と「??添付を追加」に分離（一覧はインライン表示、追加はモーダル）





















































































