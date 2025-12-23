/** usage.gs
 * 使い方のガイドをサーバ側で生成して返す。
 * クライアント側例:
 * google.script.run.withSuccessHandler(html => openModal('使い方', html)).getUsageGuideHtml();
 */
function getUsageGuideHtml() {
  const css = `
    <style>
      .u-wrap { line-height: 1.8; font-size: 13.5px; }
      .u-wrap h3 { margin: .6em 0 .2em; font-size: 15.5px; }
      .u-wrap h4 { margin: .6em 0 .2em; font-size: 14.5px; }
      .u-wrap ul { margin: .4em 0 1em 1.2em; }
      .u-badge { font-size: 12px; padding: 2px 6px; border-radius: 6px; background:#f2f4f7; }
      .u-kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; border:1px solid #ddd; padding:0 6px; border-radius:4px; }
      .u-note { background:#fffbeb; border:1px solid #f59e0b55; padding:.6em .8em; border-radius:8px; margin:.6em 0;}
      .u-grid { display:grid; grid-template-columns: 1fr 1fr; gap:.6em; }
      @media (max-width: 720px) { .u-grid { grid-template-columns: 1fr; } }
      .u-small { color:#667085; font-size:12px; }
    </style>
  `;

  const html = `
  <div class="u-wrap">
    <div class="u-note">
      このページは <span class="u-badge">使い方ガイド</span> の簡易版です。各機能の詳細はアプリ内のヘルプアイコン（？）からも参照できます。
    </div>
    <h3>PJバインダーとは</h3>
    <ul>
      <li><b>社内で進行している不定形のプロジェクトを、一元的に管理し、進捗管理やメモのフォーマット統一を行うためのツールです</b></li>
    </ul>
    <h3>このアプリの基本モデル</h3>
    <ul>
      <li><b>プロジェクト</b>が最上位の単位です。必要に応じて親子の階層化ができます。</li>
      <li><b>タスク</b>はプロジェクトの<b>子要素</b>です（必ずいずれかのプロジェクトに属します）。</li>
      <li>表示は「一覧／カンバン／ガント」を切替可能。用途に応じて使い分けます。</li>
    </ul>

    <h3>Googleドキュメント連携</h3>
    <ul>
      <li>プロジェクト／タスクごとに<b>Googleドキュメントを自動作成</b>できます（「<span class="u-badge">Docsを開く</span>」から作成・アクセス）。</li>
      <li>作成されたドキュメントのURLは各行に保持され、一覧・カンバン・ガントでも <span title="ドキュメント">📄</span> バッジから開けます。</li>
      <li>権限は可能な範囲で「リンク編集可」に自動設定します（組織ポリシーで制限される場合あり）。</li>
    </ul>

    <h3>添付URL（Drive／外部URL）</h3>
    <ul>
      <li>プロジェクト／タスク／議事録に<b>Driveファイルや任意URL</b>を添付できます（<span title="添付">📎</span> ボタン）。</li>
      <li>同一プロジェクト配下のタスク／議事録の添付は、親プロジェクトの添付カウントに合算表示されます。</li>
    </ul>

    <h3>カンバン（進行管理）</h3>
    <ul>
      <li>カードをドラッグ＆ドロップで<b>状態</b>（未着手／進行中／保留／完了）を更新できます。</li>
      <li>担当者・期限・優先度でフィルタ／並び替え可能。ボード右上の操作を活用してください。</li>
    </ul>

    <h3>ガント（スケジュール可視化）</h3>
    <ul>
      <li><span title="ドキュメント">📄</span>／<span title="添付">📎</span> バッジから関連ドキュメント・添付へショートアクセス。</li>
      <li>期日の未設定タスクは非表示になる場合があります。編集画面で期限を設定してください。</li>
    </ul>

    <h3>定期タスク</h3>
    <ul>
      <li>タスクの <code>type=recurring</code> ＋ <code>RRULE</code> を指定すると、<b>毎朝のジョブ</b>で次回分が自動生成されます。</li>
      <li>生成タスク（<code>type=generated</code>）は文書の自動作成を既定でスキップし、膨張を防ぎます。</li>
    </ul>

    <h3>議事録・日報</h3>
    <ul>
      <li><b>議事録</b>は「Docs自動作成」で作成し、Minutes に登録されます（直接の新規登録は不可）。</li>
      <li><b>日報</b>は重複ガード（同日×同ユーザー）付き。作成時にユーザー名フォルダ配下へ Docs が自動生成されます。</li>
    </ul>

    <h3>通知（任意）</h3>
    <ul>
      <li>Webhook を設定すると、<b>ステータス更新</b>や<b>期限接近（本日／明日）</b>、<b>定期タスク生成</b>等をチャット通知します。</li>
    </ul>

    <h3>編集の小ワザ</h3>
    <ul>
      <li>タスク行の<b>メモ欄はダブルクリック</b>で編集（<span class="u-kbd">Ctrl</span>/<span class="u-kbd">⌘</span> + <span class="u-kbd">Enter</span> で保存）。</li>
      <li>タイトル・担当・期日・優先度は一覧上からインライン編集できます。</li>
      <li>検索バーで <code>@担当</code>、<code>#タグ</code>、<code>status:done</code> 風のフィルタが使えることがあります（環境により仕様差）。</li>
    </ul>

    <h3>権限と共有の考え方</h3>
    <ul>
      <li>自動作成する Docs は、可能な限り「リンク編集可」に設定します（ポリシーにより「ドメイン限定」へフォールバック）。</li>
      <li>添付の Drive ファイルは元ファイルの権限に従います。閲覧できない場合はオーナーに共有依頼してください。</li>
    </ul>

    <h3>トラブルシューティング</h3>
    <div class="u-grid">
      <div>
        <h4>ドキュメントが作成されない</h4>
        <ul>
          <li>プロジェクト／タスクの保存に成功しているか確認。</li>
          <li>組織の Drive 権限ポリシーで自動共有が抑止されていないか確認。</li>
        </ul>
      </div>
    </div>

    <div class="u-small">最終更新: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')}</div>
  </div>
  `;

  return css + html;
}
