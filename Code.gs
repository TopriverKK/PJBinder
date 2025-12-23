// タイムゾーン（readAllStrongなどで使用）
const TZ = Session.getScriptTimeZone(); // 例: "Asia/Tokyo" 

/** ===== Supabase config =====
 * 最初に setSupabase(url,key) を一度実行して保存してください。
 * key には service_role キーを使うとサーバ側(GAS)からRLS越しでもフルCRUDできます。
 */
function setSupabase(url, serviceRoleKey){
  const sp = PropertiesService.getScriptProperties();
  sp.setProperty('SUPABASE_URL', String(url).replace(/\/+$/,''));
  sp.setProperty('SUPABASE_KEY', String(serviceRoleKey));
  return 'OK';
}
function _sb_(){
  const sp  = PropertiesService.getScriptProperties();
  const url = sp.getProperty('SUPABASE_URL');
  const key = sp.getProperty('SUPABASE_KEY');
  if(!url || !key) throw new Error('Supabase 接続情報が未設定です。setSupabase(url, key) を一度実行してください。');
  return { url, key };
}
function _supaFetch_(path, opt){
  const {url, key} = _sb_();
  const u = url.replace(/\/+$/,'') + '/rest/v1/' + path.replace(/^\/+/,'');
  const params = {
    method: (opt && opt.method) || 'get',
    contentType: 'application/json; charset=utf-8',
    muteHttpExceptions: true,
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      Prefer: (opt && opt.prefer) || 'return=representation'
    },
    payload: opt && opt.payload ? JSON.stringify(opt.payload) : undefined
  };
  const res = UrlFetchApp.fetch(u, params);
  const code = res.getResponseCode();
  const body = res.getContentText() || '';
  if (code >= 200 && code < 300) return body ? JSON.parse(body) : null;
  throw new Error('Supabase error '+code+' on '+path+' : '+body);
}
// 便利関数
function sbSelect(table, query){ // query: 'select=*&order=updatedAt.desc'
  const q = query || 'select=*';
  return _supaFetch_(table + '?' + q, {method:'get', prefer:'return=representation'});
}
function sbUpsert(table, rows, onConflictCol){
  // id 主キー(or unique) を前提に UPSERT
  const q = onConflictCol ? ('?on_conflict=' + encodeURIComponent(onConflictCol)) : '';
  return _supaFetch_(table + q, {method:'post', payload: Array.isArray(rows)?rows:[rows], prefer:'resolution=merge-duplicates,return=representation'});
}
function sbDeleteById(table, id){
  return _supaFetch_(table + '?id=eq.' + encodeURIComponent(String(id)), {method:'delete', prefer:'return=minimal'});
}
function sbFindById(table, id){
  const rows = sbSelect(table, 'select=*&id=eq.' + encodeURIComponent(String(id)));
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}


// === Perf helpers: cache & fast row lookup ==============================
function _dataVer_(){
  var sp = PropertiesService.getScriptProperties();
  var v = Number(sp.getProperty('DATA_VER') || '0') || 0;
  return v;
}
function _bumpDataVer_(){
  var sp = PropertiesService.getScriptProperties();
  var v = Number(sp.getProperty('DATA_VER') || '0') || 0;
  sp.setProperty('DATA_VER', String(v+1));
}
function _cacheGet_(key){
  try{
    var raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function _cachePut_(key, obj, sec){
  try{ CacheService.getScriptCache().put(key, JSON.stringify(obj), sec||300); }catch(_){}
}
/**
 * id列でTextFinder検索（完全一致）
 * @return {number} 見つかった行番号（1始まり） / -1
 */
function _findRowById_(sheet, idIdx, id){
  if(!sheet || !id) return -1;
  var last = sheet.getLastRow();
  if(last < 2) return -1;
  var col = idIdx + 1;
  var rng = sheet.getRange(2, col, last-1, 1);
  var hit = rng.createTextFinder(String(id)).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : -1;
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t=>ScriptApp.deleteTrigger(t));
  // 朝のバッチを1本に集約
  ScriptApp.newTrigger('runMorningJobs').timeBased().atHour(9).everyDays(1).create();
}
function setChatWebhook(url) { setSetting('CHAT_WEBHOOK_URL', url); }

// API for HTML
//function appVersion() { return 'v5.1.0'; }
/** Web配信: 例 https://.../exec?feed=tasks&assignee=USER_ID */

// 置き換え版 doGet（UIを既定で返す／ICSや診断はクエリで）
function doGet(e) {
  const company = PropertiesService.getScriptProperties()
                   .getProperty('Company_Name') || '桃園計画';

  try {
    const p = (e && e.parameter) || {};

    // 1) ICSフィード ?feed=tasks[&assignee=...]
    if (p.feed === 'tasks') {
      const ics = buildTasksIcs_(p.assignee || '');
      return ContentService
        .createTextOutput(ics)
        .setMimeType(ContentService.MimeType.ICAL);
    }

    // 2) 簡易ダイアグノスティクス ?diag=1
    if (p.diag === '1') {
      const info = getSpreadsheetInfo();
      const counts = {
        Users: readAllStrong('Users').length,
        Projects: readAllStrong('Projects').length,
        Tasks: readAllStrong('Tasks').length
      };
      return ContentService
        .createTextOutput(JSON.stringify({ ok:true, info, counts }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3) 既定: UI を返す（Index.htmlに company を埋め込み）
    const tpl = HtmlService.createTemplateFromFile('Index');
    tpl.company = company;  // ★ Index.html 内で <?= company ?> として使える
    return tpl.evaluate()
      .setTitle(company + ' PJバインダー')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (err) {
    const msg = 'エラー: ' + String(err && err.message || err);
    return HtmlService.createHtmlOutput(
      '<pre style="white-space:pre-wrap">' + msg + '</pre>'
    );
  }
}



function icsEscape_(s){
  return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function fmtDateYMD_(s){
  // 期限は終日イベントで出す
  var d = new Date(s); if (isNaN(d)) return '';
  var y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
  return ''+y+m+dd;
}
// --- PATCH 3: ICS 改良 ---
function buildTasksIcs_(assigneeId){
  const tasks = fetchTasksForIcs_(assigneeId);
  const lines = [];
  const dtstampUtc = Utilities.formatDate(new Date(), 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//TouenPlan/PM//JP');
  lines.push('X-WR-CALNAME:Touen Tasks');
  lines.push('CALSCALE:GREGORIAN');

  tasks.forEach(function(t){
    if (!t.dueDate) return;
    const uid  = (t.id||Utilities.getUuid()) + '@touenpm';
    const sum  = icsEscape_(t.title||'(無題)');
    const desc = icsEscape_(
      'プロジェクト: ' + (t.projectName||'') + '\n' +
      '優先度: ' + (t.priority||'') + '\n' +
      '担当: ' + (t.assignees||'') + '\n' +
      (t.docUrl ? 'Doc: '+t.docUrl : '')
    );
    const dt = fmtDateYMD_(t.dueDate); if(!dt) return;

    lines.push('BEGIN:VEVENT');
    lines.push('UID:'+uid);
    lines.push('DTSTAMP:'+dtstampUtc);
    lines.push('SUMMARY:'+sum);
    lines.push('DESCRIPTION:'+desc);
    lines.push('DTSTART;VALUE=DATE:'+dt);
    // 終日は排他的 → 翌日を DTEND に
    lines.push('DTEND;VALUE=DATE:'+fmtDateYMD_(_shift_(t.dueDate, 1)));
    if (t.rrule) lines.push('RRULE:'+t.rrule);
    if (String(t.status||'').toLowerCase()==='done') lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function fetchTasksForIcs_(assigneeId){
  const key = 'ics:'+ (assigneeId||'all') + ':' + _dataVer_();
  const hit = _cacheGet_(key); if (hit) return hit;
  const all = getAllDataPlain ? getAllDataPlain() : getAllData();
  let list = (all && all.tasks) || [];
  if (assigneeId){
    list = list.filter(t => String(t.assignees||'').split(',').includes(String(assigneeId)));
  }
  _cachePut_(key, list, 120); // 2分キャッシュ
  return list;
}


/** WebアプリURLを設定/取得（手動で最初だけセット） */
function setIcsBaseUrl(url){
  PropertiesService.getScriptProperties().setProperty('ICS_BASE_URL', String(url||''));
}
function getIcsBaseUrl(){ return PropertiesService.getScriptProperties().getProperty('ICS_BASE_URL') || ''; }
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
function getAllData() {
  const data = {
    projects:      readAllStrong('Projects'),
    tasks:         readAllStrong('Tasks'),
    subs:          readAllStrong('Subscriptions'),
    ledger:        readAllStrong('Ledger'),
    ledgerPlans:   readAllStrong('LedgerPlans'),
    users:         readUsers('Users'),
    credentials:   readAllStrong('Credentials'),
    settings:      readAllStrong('Settings'),
    attachments:   readAllStrong('Attachments'),
    minutes:       readAllStrong('Minutes'),
    dailyReports:  readAllStrong('DailyReports')
  };
  try { data.shareds = sbSelect('shareds', 'select=*&order=updatedAt.desc.nullslast'); } catch(_) { data.shareds = []; }
  return data;
}
function _sanitizeName_(s){
  // Drive上の見た目を崩さず安全な文字に
  return String(s||'')
    .replace(/[\\/:*?"<>|]/g, '／') // 代表的な区切り/記号を全角スラッシュへ
    .replace(/\s+/g, ' ')           // 連続空白は1つに
    .trim();
}
function upsertSubscription(s) { s.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); if (!s.id) s.createdAt = s.updatedAt; if (!s.nextBillDate && s.startDate) s.nextBillDate = s.startDate; return upsert('Subscriptions', subscriptionHeaders(), s); }
function upsertLedgerEntry(e) { e.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); if (!e.id) e.createdAt = e.updatedAt; return upsert('Ledger', ledgerHeaders(), e); }
function upsertUser(u) { u.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); if (!u.id) u.createdAt = u.updatedAt; return upsert('Users', userHeaders(), u); }

function deleteTask(id) { return removeById('Tasks', id); }
function deleteProject(id) { return removeById('Projects', id); }
function deleteSubscription(id) { return removeById('Subscriptions', id); }
function deleteLedgerEntry(id) { return removeById('Ledger', id); }
function deleteUser(id) { return removeById('Users', id); }
function deleteMinute(id) { return removeById('Minutes', id); }

// Kanban status update
function setTaskStatus(id, status) {
  var t = findById('Tasks', id);
  if (!t) throw new Error('Task not found: ' + id);
  const old = t.status || 'todo';
  t.status = status || 'todo';
  t.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  upsert('Tasks', taskHeaders(), t);
  try { notifyTaskStatusChange_(t, old, t.status); } catch(e) {}
  return t;
}

// CRUD for LedgerPlans
function upsertLedgerPlan(p) {
  p.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (!p.id) p.createdAt = p.updatedAt;
  // 初回 nextOccurrence の補完
  if (!p.nextOccurrence && p.rrule) {
    const base = today();
    const n = computeNextOccurrence(base, p.rrule);
    p.nextOccurrence = n ? Utilities.formatDate(n, TZ, 'yyyy-MM-dd') : '';
  }
  return upsert('LedgerPlans', ledgerPlanHeaders(), p);
}
function deleteLedgerPlan(id){ return removeById('LedgerPlans', id); }

/** Debug helpers */
function debugGetCounts() {
  return {
    //version: appVersion(),
    users: readAll('Users').length,
    projects: readAll('Projects').length,
    tasks: readAll('Tasks').length,
    subs: readAll('Subscriptions').length,
    ledger: readAll('Ledger').length,
    credentials: readAll('Credentials').length
  };
}

/** Plain data endpoints for debug */
function getUsers(){ return readAll('Users'); }
function getProjects(){ return readAll('Projects'); }
function getAllDataPlain(){ return getAllData(); }

/** 接続先診断 */
function getSpreadsheetInfo(){
  const sp = PropertiesService.getScriptProperties();
  const pid = sp.getProperty('TARGET_SPREADSHEET_ID');
  let ss = null, via = 'active';
  if (pid) { try { ss = SpreadsheetApp.openById(pid); via = 'property(TARGET_SPREADSHEET_ID)'; } catch(e){} }
  if (!ss) { ss = SpreadsheetApp.getActiveSpreadsheet(); via = via==='active' ? 'active' : 'active(fallback)'; }
  return { id: ss.getId(), name: ss.getName(), url: ss.getUrl(), via };
}
function ping(){
  const meta = getSpreadsheetInfo();
  return {
    ok:true,
    //version: appVersion(),
    spreadsheet: meta,
    counts: {
      users: readAllStrong('Users').length,
      projects: readAllStrong('Projects').length,
      tasks: readAllStrong('Tasks').length,
      subs: readAllStrong('Subscriptions').length,
      ledger: readAllStrong('Ledger').length,
      credentials: readAllStrong('Credentials').length
    }
  };
}
function runSetupSheets(){ setupSheets(); return ping(); }

/**
 * 会社ロゴを data URL で返す
 * 画像は Drive 上に置き、fileId を設定してください
 */
function getLogoDataUrl(){
  var fileId = PropertiesService.getScriptProperties().getProperty('Logo_ID'); // ←差し替え
  console.log(fileId);
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob(); // contentType を維持
  var base64 = Utilities.base64Encode(blob.getBytes());
  return 'data:' + blob.getContentType() + ';base64,' + base64;
}

/**
 * Docsを「リンクを知っている全員」に共有する
 * @param {string} docId
 * @param {'viewer'|'commenter'|'editor'} role
 * @return {{docId:string, url:string}}
 */
function setDocLinkShare(docId, role) {
  var file = DriveApp.getFileById(docId);
  var perm = DriveApp.Permission.VIEW;
  if (role === 'commenter') perm = DriveApp.Permission.COMMENT;
  if (role === 'editor')    perm = DriveApp.Permission.EDIT;
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, perm);
  return { docId: docId, url: file.getUrl() };
}


function getMinutes(){
  const sh = _openReadOnly_('Minutes');
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  return v.slice(1).map(r=>({
    id:r[0], date:r[1], title:r[2], projectId:r[3], taskId:r[4],
    attendees:r[5], docId:r[6], docUrl:r[7], createdBy:r[8], createdAt:r[9],
  })).filter(x=>x.id);
}


// 通知（WebHook）
function sendChat(text) {
  const url = getSetting('CHAT_WEBHOOK_URL');
  if (!url) return;
  const payload = { text: text };
  const params = { method: 'post', contentType: 'application/json; charset=utf-8', payload: JSON.stringify(payload), muteHttpExceptions: true };
  UrlFetchApp.fetch(url, params);
}

// ステータス変更通知（setTaskStatus の最後で呼ぶ）
function notifyTaskStatusChange_(task, oldStatus, newStatus){
  const title = task.title||task.id;
  const proj = task.projectId||'';
  sendChat(`ステータス更新: [${title}] ${oldStatus} → ${newStatus} (P:${proj})`);
}
// 担当アサイン通知（upsertTask 内から差分検知で呼ぶ想定）
function notifyAssignees_(task, addedAssigneesCsv){
  if(!addedAssigneesCsv) return;
  sendChat(`担当アサイン: [${task.title||task.id}] → ${addedAssigneesCsv}`);
}
// 期限前チェック（朝ダイジェストと統合）
function notifyDueSoon_(){
  const tasks = getAllData().tasks || [];
  const today = _today_();
  const tomorrow = _shift_(today, 1);
  const soon = tasks.filter(t=>{
    const st = String(t.status||'').toLowerCase();
    const due = t.dueDate || '';
    return st!=='done' && (due===today || due===tomorrow);
  });
  if(soon.length){
    const lines = soon.slice(0,50).map(t=>`・${t.dueDate} ${t.title} (P:${t.projectId||''})`).join('\n');
    sendChat(`期限接近タスク（本日/明日）\n${lines}`);
  }
}
function runMorningJobs(){  // 毎朝の定期実行
  try { processRecurringTasks(); } catch(e){ Logger.log('processRecurringTasks error: '+e); }
  try { processSubscriptions(); } catch(e){ Logger.log('processSubscriptions error: '+e); }
  try { processRecurringLedger(); } catch(e){ Logger.log('processRecurringLedger error: '+e); }
  try { notifyDueSoon_(); } catch(e){ Logger.log('notifyDueSoon_ error: '+e); }
}


function _today_(){ const d = new Date(); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function _now_(){ const d = new Date(); return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); }
function _shift_(ymd, plusDays){
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(ymd); if(!m) return ymd;
  const d = new Date(+m[1], +m[2]-1, +m[3]); d.setDate(d.getDate()+plusDays);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ✅ どの環境でも必ずフォルダが取れる（シート未設定でもOK）
function _safeBaseFolder_(){
  try{
    const ss = getSS_();                    // 設定されていないときは例外
    const file = DriveApp.getFileById(ss.getId());
    const it = file.getParents();
    if (it.hasNext()) return it.next();
  }catch(_){}
  return DriveApp.getRootFolder();          // フォールバック：マイドライブ直下
}

function ensureNotesFolder_() {
  const base = _safeBaseFolder_();
  const name = 'PJ_Binder_Docs';
  const it = base.getFoldersByName(name);
  return it.hasNext() ? it.next() : base.createFolder(name);
}

function _ensureFolderByName_(parent, name){
  const it = parent.getFoldersByName(String(name));
  return it.hasNext() ? it.next() : parent.createFolder(String(name));
}
function _ensurePathUnderNotes_(paths){
  let f = ensureNotesFolder_();
  paths.forEach(seg=>{ f = _ensureFolderByName_(f, seg); });
  return f;
}

// ✅ 共有設定は“試してダメなら黙って継続”に（環境ポリシー差を吸収）
function _tryMakeEditable_(fileId){
  try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT); return 'ANYONE'; } catch(_){}
  try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT); return 'DOMAIN'; } catch(_){}
  try {
    // Advanced Drive API が有効ならここで拾える（無効でも無視）
    Drive.Permissions.insert({type:'anyone', role:'writer', withLink:true}, fileId, {supportsAllDrives:true, sendNotificationEmails:false});
    return 'ADV_ANYONE';
  } catch(_){}
  return 'NONE';
}


function supaRequest_(path, method, payloadObj) {
  const { url, key } = SUPABASE_CONF_();
  const params = {
    method: method || 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    muteHttpExceptions: true
  };
  if (payloadObj !== undefined) params.payload = JSON.stringify(payloadObj);
  const res = UrlFetchApp.fetch(url + path, params);
  const code = res.getResponseCode();
  const body = res.getContentText() || '';
  if (code >= 200 && code < 300) {
    return body ? JSON.parse(body) : null;
  }
  throw new Error(`Supabase error ${code} on ${path} : ${body}`);
}

function upsertDailyReport(r){
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const row = {
    id: r.id || uuid(),
    date: r.date || _today_(),
    userId: r.userId || '',
    hours: Number(r.hours || 0),
    projectId: r.projectId || '',
    body: r.body || '',
    tasks: r.tasks || '',
    // docId / docUrl は後段で付与（列が無い環境でも動かすため）
    createdAt: now,
    updatedAt: now
  };
  const res = sbUpsertCompat('DailyReports', row);
  return (Array.isArray(res) && res[0]) ? res[0] : row;
}



/** Db.gs 共通CRUD */
function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  } else {
    const firstRow = sheet.getRange(1,1,1,headers.length).getValues()[0];
    let changed = false;
    for (let i=0;i<headers.length;i++) { if (firstRow[i] !== headers[i]) { changed = true; break; } }
    if (changed) sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }
  return sheet;
}
function readAll(name) {
  const ss = getSS_();
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, i) => o[h] = r[i]);
    return o;
  });
}
function upsert(name, headers, obj) {
  var ss = getSS_();
  var sheet = ensureSheet(ss, name, headers);
  var header = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  var idIdx = header.indexOf('id');
  if (idIdx < 0) throw new Error('Header must contain id');

  var id = obj.id || uuid();
  var rowIdx = _findRowById_(sheet, idIdx, id); // 1-based, or -1
  var rowArr = header.map(function(h){ return (obj[h] !== undefined) ? obj[h] : ''; });
  rowArr[idIdx] = id;

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, header.length).setValues([rowArr]);
  } else {
    sheet.appendRow(rowArr);
  }
  _bumpDataVer_(); // ← キャッシュ無効化
  return id;
}
function findById(name, id) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return null;
  var headers = sheet.getRange(1,1,1, sheet.getLastColumn() || 1).getValues()[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return null;
  var rowIdx = _findRowById_(sheet, idIdx, id);
  if (rowIdx < 0) return null;
  var values = sheet.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var o = {};
  headers.forEach(function(h, j){ o[h] = values[j]; });
  return o;
}

function removeById(name, id) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return false;
  var headers = sheet.getRange(1,1,1, sheet.getLastColumn() || 1).getValues()[0];
  var idIdx = headers.indexOf('id');
  if (idIdx < 0) return false;
  var rowIdx = _findRowById_(sheet, idIdx, id);
  if (rowIdx > 0) { sheet.deleteRow(rowIdx); _bumpDataVer_(); return true; }
  return false;
}

function readAllStrong(name) {
  var ss = getSS_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var cacheKey = 'ras:'+ss.getId()+':'+name+':'+_dataVer_();
  var cached = _cacheGet_(cacheKey);
  if (cached) return cached;

  var rows = sheet.getDataRange().getValues();
  if (!rows || rows.length < 2) { _cachePut_(cacheKey, [], 120); return []; }
  var headers = rows[0].map(function(h){ return String(h||'').trim(); });
  var out = [];
  for (var i=1;i<rows.length;i++){
    var r = rows[i];
    var allEmpty = true;
    for (var j=0;j<headers.length;j++){ if (String(r[j]||'').trim()!==''){ allEmpty=false; break; } }
    if (allEmpty) continue;
    var o = {};
    for (var j=0;j<headers.length;j++){
      var key = headers[j] || ('col'+(j+1));
      var v = r[j];
      if (v && Object.prototype.toString.call(v)==='[object Date]'){
        v = Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
      }
      o[key] = v;
    }
    out.push(o);
  }
  _cachePut_(cacheKey, out, 300); // 5分キャッシュ
  return out;
}
/**
 * Users 専用の読取（ヘッダー表記ゆれを吸収）
 * - 'ユーザー名' / 'userName' / 'name '（末尾空白）などを name に正規化
 * - name が空なら email の @ より前を仮名として補完
 */
function readUsers(){
  var rows = readAllStrong('Users');
  return rows.map(function(u){
    var name =
      (u.name && String(u.name).trim()) ||
      (u['ユーザー名'] && String(u['ユーザー名']).trim()) ||
      (u.userName && String(u.userName).trim()) ||
      (u['name '] && String(u['name ']).trim()) || // 末尾スペース汚染対策
      (u.email ? String(u.email).replace(/@.*$/, '') : '') || // email から推定
      '';
    // 正規化して返す（既存の他キーは維持）
    var out = Object.assign({}, u);
    out.name = name;
    return out;
  });
}

function getTagColors_(){
  var rows = readAllStrong('Settings');
  var map = {};
  rows.forEach(function(r){
    var k = String(r.key||'').trim();
    var v = String(r.value||'').trim();
    if (k.toLowerCase().indexOf('tag:')===0 && v){ map[k.substring(4)] = v; }
  });
  return map;
}

/** Reminders & Subscriptions */
function notifyTaskCreated(instTask, recurringTask) {
  const msg = [
    '🆕 生成された定期タスク',
    `・タイトル: ${instTask.title}`,
    `・期限: ${instTask.dueDate}`,
    `・担当: ${instTask.assignees || '-'}`,
    `・親タスク: ${recurringTask.title}`
  ].join('\n');
  sendChat(msg);
}
function notifyDueTasksDigest() {
  const t = today();
  const tasks = readAll('Tasks').filter(x=>{
    const due = parseDate(x.dueDate);
    return x.status !== 'done' && due && isoDate(due) === isoDate(t);
  });
  if (tasks.length === 0) return;
  const lines = tasks.map(x=>`・[${x.priority||'-'}] ${x.title}（担当:${x.assignees||'-'} / プロジェクト:${x.projectId}）`);
  const msg = `📌 本日期限のタスク (${isoDate(t)})\n` + lines.join('\n');
  sendChat(msg);
}
function notifySubscriptionUpcoming(sub, days) {
  const msg = [
    '💳 サブスク請求予定の通知',
    `・サービス: ${sub.serviceName}`,
    `・ベンダ: ${sub.vendor || '-'}`,
    `・金額: ${sub.amount || '-'} / ${sub.cycle}`,
    `・次回請求日: ${sub.nextBillDate}`,
    `・あと ${days} 日`
  ].join('\n');
  sendChat(msg);
}
function rollNextBillDate(current, cycle) {
  const d = parseDate(current);
  if (!d) return '';
  const c = String(cycle || '').toLowerCase();
  switch (c) {
    case 'monthly': return isoDate(addMonths(d, 1));
    case 'yearly':
    case 'annual': return isoDate(addMonths(d, 12));
    case 'weekly': return isoDate(addDays(d, 7));
    case 'quarterly': return isoDate(addMonths(d, 3));
    default: return isoDate(addMonths(d, 1));
  }
}
function processSubscriptions() {
  const subs = readAll('Subscriptions');
  const t = today();
  subs.forEach(s=>{
    const next = parseDate(s.nextBillDate);
    if (!next) return;
    const diff = Math.floor((next - t)/(1000*60*60*24));
    if (diff === 30 || diff === 7 || diff === 1) notifySubscriptionUpcoming(s, diff);
    if (isoDate(next) === isoDate(t)) {
      if (String(s.autoJournal || '').toLowerCase() === 'true') {
        const entry = {
          id: uuid(), date: isoDate(t), type: 'expense', amount: Number(s.amount||0),
          taxCode: s.taxCode || '', account: s.account || 'サブスク費用',
          projectId: s.projectId || '', subscriptionId: s.id, taskId: '',
          counterpart: s.vendor || s.serviceName || '', memo: '自動計上',
          createdAt: isoDate(new Date())
        };
        upsert('Ledger', ledgerHeaders(), entry);
      }
      s.nextBillDate = rollNextBillDate(s.nextBillDate, s.cycle);
      upsert('Subscriptions', subscriptionHeaders(), s);
    }
  });
}

/** Docs & Credentials integration: Headers */
function projectHeaders() {
  return ['id','parentProjectId','name','status','priority','fiscalYear','budget','ownerUserId','members','startDate','endDate','note','docId','memoText','createdAt','updatedAt'];
}
function taskHeaders() {
  return ['id','projectId','parentTaskId','type','title','ownerUserId','assignees','dueDate','status','priority','estimateHours','actualHours','rrule','nextOccurrence','docId','memoText','createdAt','updatedAt'];
}
function subscriptionHeaders() {
  return ['id','serviceName','vendor','startDate','amount','taxIncluded','cycle','payMethod','ownerUserId','autoRenew','nextBillDate','projectId','taxCode','account','autoJournal','createdAt','updatedAt'];
}
function ledgerHeaders() {
  return ['id','date','type','amount','taxCode','account','projectId','subscriptionId','taskId','counterpart','memo','createdAt','updatedAt'];
}
function ledgerPlanHeaders(){
  return ['id','title','type','amount','account','counterpart','projectId','rrule','nextOccurrence','memoText','createdAt','updatedAt'];
}
function userHeaders() {
  return ['id','name','email','role','department','createdAt','updatedAt'];
}
function credentialsHeaders() {
  return ['id','serviceName','url','loginId','passwordCipher','ownerUserId','note','createdAt','updatedAt'];
}

/**
 * @deprecated 破壊的なclear()を廃止し、テンプレ/既存本文を保持したまま安全に挿入する
 * 優先度:
 *  1) {{BODY}} / 【本文】 / ＜本文＞ プレースホルダー置換
 *  2) 「■ 議題 / メモ」見出しの直下に挿入
 *  3) 見つからなければ末尾に追記
 */
function replaceDocWithMemo(docId, memoText) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  const text = String(memoText || '');

  let done = false;

  // 1) プレースホルダー置換（$ をエスケープ）
  try {
    const safe = text.replace(/\$/g, '$$$$');
    const before = body.getText();
    body.replaceText('\\{\\{BODY\\}\\}|【本文】|＜本文＞', safe);
    done = (before !== body.getText());
  } catch (_) {}

  // 2) 「■ 議題 / メモ」系の見出し直下に挿入
  if (!done) {
    let m = body.findText('■\\s*議題\\s*/\\s*メモ') || body.findText('■\\s*メモ');
    if (m) {
      let el = m.getElement();
      while (el && el.getType() !== DocumentApp.ElementType.PARAGRAPH) {
        el = el.getParent();
      }
      if (el) {
        const idx = body.getChildIndex(el) + 1;
        body.insertParagraph(idx, text);
        done = true;
      }
    }
  }

  // 3) 見つからなければ末尾に追記
  //if (!done) {
  //  body.appendParagraph(text);
  //}

  doc.saveAndClose();
  return true;
}


function appendDocWithMemo(docId, memoText) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.appendParagraph(String(memoText||''));
  doc.saveAndClose();
  return true;
}

// Memo text save
function saveProjectMemo(projectId, memoText) {
  const p = findById('Projects', projectId);
  if (!p) throw new Error('プロジェクトが見つかりません: ' + projectId);
  p.memoText = memoText || '';
  p.updatedAt = isoDate(new Date());
  upsert('Projects', projectHeaders(), p);
  return true;
}
function saveTaskMemo(taskId, memoText) {
  const t = findById('Tasks', taskId);
  if (!t) throw new Error('タスクが見つかりません: ' + taskId);
  t.memoText = memoText || '';
  t.updatedAt = isoDate(new Date());
  upsert('Tasks', taskHeaders(), t);
  return true;
}
function upsertCredential(c) {
  c.updatedAt = isoDate(new Date());
  if (!c.id) c.createdAt = c.updatedAt;
  return upsert('Credentials', credentialsHeaders(), c);
}

function deleteCredential(id) {
  return removeById('Credentials', id);
}

/** Recurring logic */
const DOW = ['SU','MO','TU','WE','TH','FR','SA'];
function parseRRule(rrule) {
  if (!rrule) return null;
  const parts = String(rrule).split(';').map(s=>s.trim()).filter(Boolean);
  const obj = {};
  for (const p of parts) { const [k,v] = p.split('='); obj[k.toUpperCase()] = v; }
  if (!obj.FREQ) return null;
  obj.INTERVAL = obj.INTERVAL ? parseInt(obj.INTERVAL,10) : 1;
  if (obj.BYDAY) obj.BYDAY = obj.BYDAY.split(',').map(s=>s.trim().toUpperCase());
  if (obj.BYMONTHDAY) obj.BYMONTHDAY = obj.BYMONTHDAY.split(',').map(s=>parseInt(s,10));
  return obj;
}
function addDays(d, n) { const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()); dt.setDate(dt.getDate() + n); return dt; }
function addMonths(d, n) { const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate()); dt.setMonth(dt.getMonth() + n); return dt; }
function nextWeekly(from, bydays, interval) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i=1; i<=370; i++) {
    const cand = addDays(start, i);
    const weekOffset = Math.floor(i/7);
    if (weekOffset % interval !== 0) continue;
    const day = DOW[cand.getDay()];
    if (!bydays || bydays.indexOf(day) >= 0) return cand;
  }
  return null;
}
function nextMonthly(from, monthdays, interval) {
  let y = from.getFullYear(); let m = from.getMonth();
  const days = monthdays && monthdays.length ? monthdays.slice().sort((a,b)=>a-b) : [from.getDate()];
  let count = 0;
  while (count < 24) {
    m += interval;
    const dtBase = new Date(y, m, 1);
    const maxDay = new Date(dtBase.getFullYear(), dtBase.getMonth()+1, 0).getDate();
    for (const md of days) {
      const realDay = Math.min(md, maxDay);
      const cand = new Date(dtBase.getFullYear(), dtBase.getMonth(), realDay);
      if (cand > from) return cand;
    }
    count++;
  }
  return null;
}
function computeNextOccurrence(fromDate, rrule) {
  const rule = parseRRule(rrule);
  if (!rule) return null;
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  switch (rule.FREQ) {
    case 'DAILY': return addDays(from, rule.INTERVAL);
    case 'WEEKLY': return nextWeekly(from, rule.BYDAY, rule.INTERVAL);
    case 'MONTHLY': return nextMonthly(from, rule.BYMONTHDAY, rule.INTERVAL);
    default: return null;
  }
}
function processRecurringTasks() {
  const tasks = readAll('Tasks').filter(t=>String(t.type||'').toLowerCase()==='recurring');
  const todayD = today();
  tasks.forEach(t=>{
    const next = parseDate(t.nextOccurrence);
    if (!next) return;
    if (next <= todayD) {
      const inst = {
        id: uuid(), projectId: t.projectId, parentTaskId: t.id, type: 'generated',
        title: t.title, ownerUserId: t.ownerUserId, assignees: t.assignees,
        dueDate: isoDate(next), status: 'todo', priority: t.priority || '',
        estimateHours: t.estimateHours || '', actualHours: '', rrule: '',
        nextOccurrence: '', createdAt: isoDate(new Date())
      };
      upsert('Tasks', taskHeaders(), inst);
      const nn = computeNextOccurrence(next, t.rrule);
      const nextStr = nn ? isoDate(nn) : '';
      t.nextOccurrence = nextStr;
      upsert('Tasks', taskHeaders(), t);
      notifyTaskCreated(inst, t);
    }
  });
}
// 日次で回し、nextOccurrence <= 今日 のプランをLedgerに起票してnextを進める
function processRecurringLedger(){
  const plans = readAllStrong('LedgerPlans');
  const todayStr = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const headersE = ledgerHeaders();
  plans.forEach(function(p){
    if (!p.rrule) return;
    var next = p.nextOccurrence || '';
    while (next && next <= todayStr){
      var entry = {
        date: next,
        type: p.type,
        amount: p.amount,
        account: p.account,
        counterpart: p.counterpart,
        projectId: p.projectId,
        memo: (p.title ? ('[定期] '+p.title) : '[定期]') + (p.memoText ? (' ' + p.memoText) : '')
      };
      upsert('Ledger', headersE, entry);

      var base = parseDate(next) || today();
      var n = computeNextOccurrence(base, p.rrule);
      next = n ? Utilities.formatDate(n, TZ, 'yyyy-MM-dd') : '';
    }
    if (next !== p.nextOccurrence){
      p.nextOccurrence = next;
      upsert('LedgerPlans', ledgerPlanHeaders(), p);
    }
  });
}

/** 基本ユーティリティ */
function uuid() { return Utilities.getUuid(); }
function isoDate(d) { return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); }
function today() { return new Date(Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'00:00:00")); }
function parseDate(s) {
  if (!s) return null;
  if (Object.prototype.toString.call(s) === '[object Date]') return s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Settings: 接続先スプレッドシート側の Settings シートを使用 */
function setSetting(key, value) {
  const ss = getSS_();
  const sheet = ensureSheet(ss, 'Settings', ['key','value']);
  const rows = sheet.getDataRange().getValues().slice(1);
  for (let i=0;i<rows.length;i++) {
    if (rows[i][0] === key) { sheet.getRange(i+2, 2).setValue(value); _bumpDataVer_(); return; }
  }
  sheet.appendRow([key, value]);
  _bumpDataVer_();
}
function getSetting(key) {
  const ss = getSS_();
  const sheet = ensureSheet(ss, 'Settings', ['key','value']);
  const rows = sheet.getDataRange().getValues().slice(1);
  for (let i=0;i<rows.length;i++) {
    if (rows[i][0] === key) return rows[i][1];
  }
  return null;
}

/** 接続先切替API（サーバ側で一度設定） */
function setTargetSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('TARGET_SPREADSHEET_ID', String(id || ''));
  return getSpreadsheetInfo();
}

/** 診断：接続先と件数の簡易可視化 */
function diagBindingAndCounts(){
  const sp = PropertiesService.getScriptProperties();
  const pid = sp.getProperty('TARGET_SPREADSHEET_ID') || '';
  let via='active', ss=null;
  try{
    ss = pid ? SpreadsheetApp.openById(pid) : SpreadsheetApp.getActiveSpreadsheet();
    via = pid ? 'property(TARGET_SPREADSHEET_ID)' : 'active';
  }catch(e){
    ss = SpreadsheetApp.getActiveSpreadsheet();
    via = 'active(fallback)';
  }
  const readRows = (name)=>{ const sh = ss.getSheetByName(name); return sh ? (Math.max(sh.getLastRow()-1, 0)) : 0; };

  return {
    via,
    target: { id: ss.getId(), name: ss.getName(), url: ss.getUrl() },
    counts: {
      Projects: readRows('Projects'),
      Tasks: readRows('Tasks'),
      Subscriptions: readRows('Subscriptions'),
      Ledger: readRows('Ledger'),
      LedgerPlans: readRows('LedgerPlans'),
      Users: readRows('Users'),
      Credentials: readRows('Credentials'),
      Attachments: readRows('Attachments'),
      Minutes: readRows('Minutes'),
      DailyReports: readRows('DailyReports')
    }
  };
}
function getVersion(){
  const buildVer = PropertiesService.getScriptProperties().getProperty("APP_VERSION");
  console.log(buildVer);
  return buildVer;
}


/**
 * 共有を「リンク編集可」に設定（まずはANYONE、ダメならドメインに自動フォールバック）
 * 返り値でどのモードになったか確認できます
 */
function ensureEditableLinkShare_(fileId) {
  var file = DriveApp.getFileById(fileId);

  // 1) “リンクを知っている全員” を編集可に（管理ポリシーで許可されていればこれで完了）
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
    return { ok: true, mode: 'ANYONE_WITH_LINK' };
  } catch (e1) {
    // 2) フォールバック: “組織内（リンクあり）” を編集可に
    try {
      file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
      return { ok: true, mode: 'DOMAIN_WITH_LINK', err: String(e1) };
    } catch (e2) {
      // 3) さらにダメな場合のみ Advanced Drive API（有効化済みなら拾える）
      try {
        Drive.Permissions.insert(
          { type: 'anyone', role: 'writer', withLink: true },
          fileId,
          { supportsAllDrives: true, sendNotificationEmails: false }
        );
        return { ok: true, mode: 'ADV_ANYONE_WRITER', err: String(e2) };
      } catch (e3) {
        return { ok: false, err: String(e3) };
      }
    }
  }
}
// 追加: スプレッドシートが置かれているフォルダを返す
function _getBaseFolder_(){
  try{
    const ss = getSS_();
    const file = DriveApp.getFileById(ss.getId());
    const parents = file.getParents();
    if (parents.hasNext()) return parents.next();
  }catch(e){}
  // 取れなければマイドライブ直下にフォールバック
  return DriveApp.getRootFolder();
}
/** ====== DB 抽象化：Sheets → Supabase 置換 ====== */

// 互換：存在チェックは不要なのでダミー
function ensureSheet(_ss, _name, _headers){ return true; }
function readAll(name)        { return readAllStrong(name); }
function _open_(){ /* NO-OP（互換用） */ }

/** 全件読み（日時列はそのまま文字列として扱う） */
// Supabase 版 readAllStrong を置き換え
function readAllStrong(name){
  const tname = sbTable(name);
  const tryCols = [];

  const likelyUpdated = ['projects','tasks','users','subscriptions','ledger','ledger_plans','credentials','settings'];
  if (likelyUpdated.includes(tname)) tryCols.push('updatedAt');
  tryCols.push('createdAt');
  tryCols.push('id');

  for (var i=0; i<tryCols.length; i++){
    var col = tryCols[i];
    try {
      const q = `select=*&order=${col}.desc.nullslast`;
      const rows = sbSelect(tname, q);
      return Array.isArray(rows) ? rows : [];
    } catch (e){
      const s = String(e||'');
      if (s.includes('42703')) continue;           // 列なし → 次の候補
      if (s.includes(' 404 ') || s.includes('Could not find the table')) {
        console.warn('skip missing table: '+tname);
        return [];                                  // テーブルなし → 空配列
      }
      throw e;                                      // それ以外は本当のエラー
    }
  }
  try { const rows = sbSelect(tname, 'select=*'); return Array.isArray(rows)?rows:[]; }
  catch(e){
    const s = String(e||'');
    if (s.includes(' 404 ') || s.includes('Could not find the table')) return [];
    throw e;
  }
}


/** UPSERT：id が無ければ uuid 発番して作成。戻り値は id */
function upsert(name, headers, obj){
  const row = Object.assign({}, obj);
  if (!row.id) row.id = uuid();
  // 代表的な updatedAt/createdAt の補完（存在すれば）
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (!row.createdAt) row.createdAt = now;
  row.updatedAt = now;
  const res = sbUpsert(name, row, 'id');     // ← id 一意制約が必要
  _bumpDataVer_();  
  return (Array.isArray(res) && res[0] && res[0].id) ? res[0].id : row.id;
}

/** 主キー検索 */
function findById(name, id){ return sbFindById(name, id); }

/** 主キー削除 */
function removeById(name, id){
  sbDeleteById(name, id);
  _bumpDataVer_();                 // ← これも必要
  return true;
}
function setSetting(key, value){
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  sbUpsert('Settings', { key:String(key), value:String(value), updatedAt:now, createdAt:now }, 'key');
}
function getSetting(key){
  const rows = sbSelect('Settings', 'select=*&key=eq.'+encodeURIComponent(String(key))+'&limit=1');
  return (Array.isArray(rows) && rows[0]) ? rows[0].value : null;
}
/** ---------- Supabase table name mapper ---------- */
/** 必要な大文字→小文字・スネークケース化マップ（存在すればこちらを優先） */
const SB_TABLE = {
  Users: 'users',
  Projects: 'projects',
  Tasks: 'tasks',
  Subscriptions: 'subscriptions',
  Ledger: 'ledger',
  LedgerPlans: 'ledgerplans',
  Credentials: 'credentials',
  Attachments: 'attachments',
  Minutes: 'minutes',
  DailyReports: 'dailyreports',
  Settings: 'settings',
};



/* 参考：最低限の sbReq（もし未実装なら）
const SB = { url: '', key: '' };
function setSupabase(url, key){ SB.url=url; SB.key=key; }
function sbReq(path, method, body, extraHeaders){
  const url = SB.url.replace(/\/+$/,'') + '/rest/v1/' + path.replace(/^\/+/,'');
  const opt = {
    method: method.toUpperCase(),
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: Object.assign({
      apikey: SB.key,
      Authorization: 'Bearer ' + SB.key
    }, extraHeaders||{})
  };
  if (body !== undefined) opt.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch(url, opt);
  const code = res.getResponseCode();
  const txt  = res.getContentText();
  if (code >= 200 && code < 300) return txt ? JSON.parse(txt) : null;
  throw new Error('Supabase error '+code+' on '+path+' : '+txt);
}
*/
/** ---------- Supabase REST wrapper (fix) ---------- */
/** _supaFetch_ をラップして sbReq を提供（Prefer も反映） */
function sbReq(path, method, body, extraHeaders){
  const prefer = extraHeaders && extraHeaders.Prefer ? extraHeaders.Prefer : 'return=representation';
  return _supaFetch_(path, {
    method: (method || 'get').toLowerCase(),
    payload: body,
    prefer: prefer
  });
}

/** 任意の入力名を実テーブル名に変換（既存 SB_TABLE を使用） */
function sbTable(name) {
  if (!name) return name;
  if (SB_TABLE && SB_TABLE[name]) return SB_TABLE[name];
  const s = String(name);
  const snake = s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/__/g, '_');
  return snake.toLowerCase();
}

/** 正しいクエリ結合に修正（?select=...） */
function sbSelect(table, queryString) {
  const q = queryString ? String(queryString).replace(/^\?/, '') : 'select=*';
  const path = sbTable(table) + '?' + q;
  return sbReq(path, 'get');
}

function sbUpsert(table, objOrArray) {
  const path = sbTable(table);
  const body = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  return sbReq(path, 'post', body, { Prefer: 'resolution=merge-duplicates,return=representation' });
}

function sbDelete(table, match /* 例: 'id=eq.123' */) {
  const path = sbTable(table) + (match ? ('?' + String(match).replace(/^\?/, '')) : '');
  return sbReq(path, 'delete', undefined, { Prefer: 'return=minimal' });
}

/** 便宜: 既存の sbDeleteById/sbFindById も内部的にこの3関数と整合 */
function sbDeleteById(table, id){
  return sbDelete(table, 'id=eq.' + encodeURIComponent(String(id)));
}
function sbFindById(table, id){
  const rows = sbSelect(table, 'select=*&id=eq.' + encodeURIComponent(String(id)) + '&limit=1');
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
function pingSupabaseUsers(){
  return sbSelect('Users', 'select=id,name&order=id.asc&limit=5');
}


// ===== upsert 系は「行」返却に変更 =====
function upsertProject(p) {
  p.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (!p.id) p.createdAt = p.updatedAt;
  const id = upsert('Projects', projectHeaders(), p);

    // ★新規または docId 未設定なら Docs 自動作成
  try {
    const rec = findById('Projects', id);
    if (rec && !rec.docId) createProjectDoc(id);
  } catch (e) { Logger.log('auto create project doc failed: ' + e); }
  return findById('Projects', id); // ← 変更
}
function upsertTask(t) {
  t.updatedAt = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  if (!t.id) t.createdAt = t.updatedAt;
  if (String(t.type||'').toLowerCase()==='recurring' && t.rrule && !t.nextOccurrence) {
    const d = parseDate(t.dueDate) || today();
    const n = computeNextOccurrence(d, t.rrule);
    t.nextOccurrence = n ? Utilities.formatDate(n, TZ, 'yyyy-MM-dd') : '';
  }
  const id = upsert('Tasks', taskHeaders(), t);

  // ★新規または docId 未設定なら Docs 自動作成
  // 生成タスク(type==='generated')だけは膨張を避けるため既定でスキップ
  try {
    const rec = findById('Tasks', id);
    const typ = String(rec && rec.type || '').toLowerCase();
    if (rec && !rec.docId && typ !== 'generated') createTaskDoc(id);
  } catch (e) { Logger.log('auto create task doc failed: ' + e); }

  return findById('Tasks', id);    // ← 変更
}
function upsertSubscription(s){ s.updatedAt=isoDate(new Date()); if(!s.id) s.createdAt=s.updatedAt; const id=upsert('Subscriptions', subscriptionHeaders(), s); return findById('Subscriptions', id); }
function upsertLedgerEntry(e){ e.updatedAt=isoDate(new Date()); if(!e.id) e.createdAt=e.updatedAt; const id=upsert('Ledger', ledgerHeaders(), e); return findById('Ledger', id); }
function upsertUser(u){ u.updatedAt=isoDate(new Date()); if(!u.id) u.createdAt=u.updatedAt; const id=upsert('Users', userHeaders(), u); return findById('Users', id); }
function upsertLedgerPlan(p){ p.updatedAt=isoDate(new Date()); if(!p.id) p.createdAt=p.updatedAt; if(!p.nextOccurrence && p.rrule){ const n=computeNextOccurrence(today(), p.rrule); p.nextOccurrence = n? isoDate(n):''; } const id=upsert('LedgerPlans', ledgerPlanHeaders(), p); return findById('LedgerPlans', id); }

// ===== delete 系は {ok, id} だけ返せばOK =====
function deleteTask(id){ removeById('Tasks', id); return {ok:true, id}; }
function deleteProject(id){ removeById('Projects', id); return {ok:true, id}; }
function deleteSubscription(id){ removeById('Subscriptions', id); return {ok:true, id}; }
function deleteLedgerEntry(id){ removeById('Ledger', id); return {ok:true, id}; }
function deleteUser(id){ removeById('Users', id); return {ok:true, id}; }
function deleteLedgerPlan(id){ removeById('LedgerPlans', id); return {ok:true, id}; }




// ===== Docs 作成：docId だけ保存し、更新後の行も返す =====
function createProjectDoc(projectId){
  const p = findById('Projects', projectId); if(!p) throw new Error('Project not found');
  const folder = _ensurePathUnderNotes_(['プロジェクトDocs', _sanitizeName_(p.name||p.id)]);
  const title = 'プロジェクト ' + (p.name||p.id);
  const doc = DocumentApp.create(title);
  DriveApp.getFileById(doc.getId()).moveTo(folder);
  try { ensureEditableLinkShare_(doc.getId()); } catch(_) {}
  const body = doc.getBody(); body.clear();
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`期間: ${(p.startDate||'-')} 〜 ${(p.endDate||'-')}　予算: ${(Number(p.budget||0)).toLocaleString()} 円`);
  body.appendParagraph(`責任者: ${p.ownerUserId||'-'}`);

  p.docId = doc.getId();
  if ('docUrl' in p) delete p.docUrl;  // ← DBに列がないので保存しない
  upsert('Projects', projectHeaders(), p);
  const updated = findById('Projects', projectId);
  const url = 'https://docs.google.com/document/d/'+doc.getId();
  return { ok:true, project: updated, url };
}
function createTaskDoc(taskId){
  const t = findById('Tasks', taskId); if(!t) throw new Error('Task not found');
  const proj = t.projectId ? findById('Projects', t.projectId) : null;
  const folder = _ensurePathUnderNotes_(['プロジェクトDocs', _sanitizeName_(proj ? (proj.name||proj.id) : '未割当'), 'タスクDocs']);
  const title = (proj ? (proj.name+' - ') : '') + 'タスク ' + (t.title||t.id);
  const doc = DocumentApp.create(title);
  DriveApp.getFileById(doc.getId()).moveTo(folder);
  try { ensureEditableLinkShare_(doc.getId()); } catch(_) {}
  
  const body = doc.getBody(); body.clear();
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`期限: ${t.dueDate||'-'}　優先度: ${t.priority||'-'}　状態: ${t.status||'todo'}`);
  if (proj) body.appendParagraph(`プロジェクト: ${proj.name||proj.id}`);

  t.docId = doc.getId();
  if ('docUrl' in t) delete t.docUrl;  // ← 保存しない
  upsert('Tasks', taskHeaders(), t);
  const updated = findById('Tasks', taskId);
  const url = 'https://docs.google.com/document/d/'+doc.getId();
  return { ok:true, task: updated, url };
}

// 置換: SUPABASE_CONF_
function SUPABASE_CONF_() {
  // Project/Task と同じ保存先を使う
  const { url, key } = _sb_();  // ← setSupabase() で保存した SUPABASE_URL / SUPABASE_KEY
  return { url, key };
}

// 置換: supaRequest_（pathは /rest/v1/ を含まない形に統一）
function supaRequest_(path, method, payloadObj) {
  const { url, key } = SUPABASE_CONF_();
  const params = {
    method: method || 'get',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    muteHttpExceptions: true,
    payload: payloadObj === undefined ? undefined : JSON.stringify(payloadObj)
  };
  const res = UrlFetchApp.fetch(url.replace(/\/+$/,'') + '/rest/v1/' + path.replace(/^\/+/,'') , params);
  const code = res.getResponseCode();
  const body = res.getContentText() || '';
  if (code >= 200 && code < 300) return body ? JSON.parse(body) : null;
  throw new Error(`Supabase error ${code} on ${path} : ${body}`);
}
// 置換: createMinuteDoc（Supabase一本化 + docUrl フォールバック）
function createMinuteDoc(input) {
  try {
    if (!input || !input.date || !input.title) throw new Error('date と title は必須です');
    
    // 1) Google Docs 作成
    const doc = DocumentApp.create('議事録: ' + input.title);
    try { ensureEditableLinkShare_(doc.getId()); } catch(_) {}
    const ym = Utilities.formatDate(new Date(input.date), 'JST', 'yyyy年MM月');
    const folder = _ensurePathUnderNotes_(['議事録', ym]);
    DriveApp.getFileById(doc.getId()).moveTo(folder);
    const url  = doc.getUrl();
    const docId = doc.getId();

    const body = doc.getBody(); body.clear();
    body.appendParagraph(`議事録: ${input.title}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(`日付: ${input.date}　プロジェクト: ${input.projectId || '-'}　タスク: ${(input.taskIds || '').split(',').filter(Boolean).join(', ') || '-'}`);
    body.appendParagraph(`参加者: ${input.attendees || '-'}`);
    body.appendHorizontalRule();
    body.appendParagraph('■ アクションアイテム');
    body.appendParagraph('■ 議題 / メモ');

    // 2) Supabaseへ INSERT（存在しない列は投げない）
    const id = Utilities.getUuid();
    const nowIso = new Date().toISOString();

    const row = {
      id,
      date: input.date,
      title: input.title,
      projectId: input.projectId || null,
      attendees: input.attendees || null,
      docId,             // ← Docへのリンクは docId だけ保存
      docUrl: url,
      createdAt: nowIso  // updatedAt が無ければ送らない
    };

    // ★これで minutes 側の列不足に自動追従
    sbUpsertCompat('Minutes', row);

    return { docId, url, id };

      } catch (e) {
        throw new Error('createMinuteDoc failed: ' + (e && e.stack ? e.stack : e));
      }
}
// 置換: getDailyReports（Supabase読み）
function getDailyReports(){
  try {
    return sbSelect('DailyReports', 'select=*');
  } catch (e) {
    // テーブルが未作成の環境でも壊れないように
    if (String(e).includes(' 404 ') || String(e).includes('Could not find the table')) return [];
    throw e;
  }
}

// 置換: upsertDailyReport（同日×同ユーザーを重複禁止でガード）
function upsertDailyReport(r){
  const ymd = r.date || _today_();
  const uid = r.userId || '';
  // 重複チェック（date + userId）
  const exist = sbSelect('DailyReports',
    'select=id&date=eq.'+encodeURIComponent(ymd)+'&userId=eq.'+encodeURIComponent(uid)+'&limit=1');
  if (Array.isArray(exist) && exist.length) {
    throw new Error('同一ユーザーの同日の日報は複数作成できません。既存の日報を更新するか、削除してから再登録してください。');
  }
  const row = {
    id: 'dr_'+Utilities.getUuid().slice(0,8),
    date: ymd,
    userId: uid,
    hours: Number(r.hours||0),
    projectId: r.projectId || null,
    body: r.body || '',
    tasks: r.tasks || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  sbUpsert('DailyReports', row);
  _bumpDataVer_();
  return { ok:true, id: row.id };
}

// Supabase から1ユーザー取得（id, name, email を返す）
// 失敗時は null を返す（Apps Script想定の同期版ラッパ）
function fetchUserById(uid){
  try{
    if (!uid) return null;
    const { data, error } = supabase.from('Users').select('id,name,email').eq('id', uid).maybeSingle();
    if (error) return null;
    return data || null;
  }catch(_){ return null; }
}

// camel/snake 混在でも拾えるユーティリティ
function pick(obj, ...keys){
  for (const k of keys){
    if (obj && obj[k] != null && obj[k] !== '') return obj[k];
  }
  return '';
}

function createDailyReportDoc(r){
  // 1) まず行を確定（同日×同ユーザーの重複ガードは upsertDailyReport で実施）
  const saved = upsertDailyReport(r) || {};

  // 2) date / userId を安全に取得
  const dateStr = pick(r, 'date') || pick(saved, 'date', 'reportDate', 'report_date') || _today_();
  const userId  = pick(r, 'userId') || pick(saved, 'userId', 'user_id') || '';

  // 3) ユーザー名の解決
  let uname = 'unknown';
  const uRow = fetchUserById(userId);
  if (uRow) {
    uname = uRow.name || uRow.email || userId || 'unknown';
  } else {
    try{
      const users = readAllStrong && readAllStrong('Users');
      const u = Array.isArray(users) ? users.find(x => String(x.id) === String(userId)) : null;
      if (u) uname = u.name || u.email || userId || 'unknown';
    }catch(_){ uname = userId || 'unknown'; }
  }

  // 4) フォルダ（従来と同じルール）
  const yyyy  = (String(dateStr).slice(0,4)) || Utilities.formatDate(new Date(), TZ, 'yyyy');
  const folder = _ensurePathUnderNotes_(['日報', _sanitizeName_(uname), yyyy]);

  // 5) ファイル名と本文タイトル
  const fileTitle  = `日報 ${dateStr} ${uname}`;          // ← ファイル名
  const titleLine  = `日報 ${dateStr} / ${uname}`;        // ← 本文タイトル置換用

  // 6) テンプレから作る or 従来フォールバック
  const tplId = getDailyReportTemplateId();
  let doc, docId, url, file;

  if (tplId) {
    // テンプレートコピー
    const created = _createDocFromTemplate_(tplId, fileTitle, folder);
    doc   = created.doc;
    docId = created.docId;
    url   = created.url;
    file  = created.file;

    // 共有は従来通りの方針で
    try { ensureEditableLinkShare_(docId); } catch(_) {}

    // 6-1) 本文置換
    const body = doc.getBody();
    // 明示されたタイトル文を置換（テンプレに入っていることを想定）
    // - 正確一致用
    body.replaceText('日報\\s+\\d{4}-\\d{2}-\\d{2}\\s*/\\s*【User】', titleLine);
    // - プレースホルダーがあればついでに置換
    body.replaceText('【User】', uname);
    body.replaceText('\\{\\{USER\\}\\}', uname);
    body.replaceText('\\{\\{DATE\\}\\}', dateStr);

    // タイトルが見つからなかった場合は先頭に見出しを追加（保険）
    if (body.getText().indexOf(titleLine) === -1) {
      body.insertParagraph(0, titleLine).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    }

    doc.setName(fileTitle);
    doc.saveAndClose();

  } else {
    // フォールバック：従来の空ドキュメント生成
    const rawDoc = DocumentApp.create(fileTitle);
    docId = rawDoc.getId();
    try { ensureEditableLinkShare_(docId); } catch(_) {}
    DriveApp.getFileById(docId).moveTo(folder);

    const b = rawDoc.getBody(); b.clear();
    b.appendParagraph(titleLine).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    b.appendParagraph(`ユーザー: ${uname}　日付: ${dateStr}　工数: ${Number(pick(r,'hours') || pick(saved,'hours')) || 0}h`);
    if (pick(r,'projectId') || pick(saved,'projectId','project_id')) {
      b.appendParagraph(`プロジェクト: ${pick(r,'projectId') || pick(saved,'projectId','project_id')}`);
    }
    b.appendParagraph('');
    b.appendParagraph(pick(r,'body') || pick(saved,'body') || '');
    rawDoc.setName(fileTitle);
    rawDoc.saveAndClose();

    url = 'https://docs.google.com/document/d/' + docId;
  }

  // 7) Supabase に docId / docUrl を反映
  const now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const patch = {
    id: pick(saved,'id') || pick(r,'id'),
    docId: docId,
    doc_id: docId,
    docUrl: url,
    doc_url: url,
    updatedAt: now,
    updated_at: now
  };
  sbUpsertCompat('DailyReports', patch);

  return { ok:true, docId, url };
}



// 存在しない列が原因の 400/42703 を検知したら、その列を削って再送
function sbUpsertCompat(table, objOrArray) {
  const path = sbTable(table);
  let rows = Array.isArray(objOrArray) ? objOrArray.map(r=>({ ...r })) : [{ ...objOrArray }];
  for (let i=0;i<5;i++){
    try {
      return sbReq(path, 'post', rows, { Prefer: 'resolution=merge-duplicates,return=representation' });
    } catch (e) {
      const s = String(e||'');
      const m = s.match(/'([^']+)' column/) || s.match(/column\s+"([^"]+)"/i) || s.match(/'([^']+)' of '.*' in the schema cache/);
      if (m && m[1]) { rows.forEach(r=>delete r[m[1]]); continue; }
      if (/42703/.test(s)) { const m2 = s.match(/"([^"]+)"/) || s.match(/'([^']+)'/); if (m2 && m2[1]) { rows.forEach(r=>delete r[m2[1]]); continue; } }
      throw e;
    }
  }
  throw new Error('sbUpsertCompat: too many retries');
}

/** 新規 or 更新（id があれば更新、無ければ新規） */
function upsertShared(shared) {
  // クライアントから来る想定項目:
  // { id?, name, category, ownerUserId, tags, color, memoText, status? }
  var row = {
    id: shared.id || undefined,                 // PK: UUID (DBで自動なら省略)
    name: shared.name || '',
    category: shared.category || '',
    ownerUserId: shared.ownerUserId || '',
    tags: shared.tags || '',
    color: shared.color || '',
    memoText: shared.memoText || '',
    status: shared.status || 'active',
    updatedAt: nowIso(),
    createdAt: shared.createdAt || nowIso()
  };
  // on_conflict に PK かユニークキー名を指定
  var res = supaUpsert('shareds', row, 'id');
  return res && res[0];
}

function deleteShared(id) {
  supaDelete('shareds', '?id=eq.' + encodeURIComponent(id));
  return { ok:true };
}
/** GAS: Supabase REST helper */
function supaHeaders() {
  var svcKey = PropertiesService.getScriptProperties().getProperty('SUPABASE_KEY');
  return {
    'Content-Type': 'application/json',
    'apikey': svcKey,
    'Authorization': 'Bearer ' + svcKey,
    'Prefer': 'return=representation'
  };
}
function supabaseUrl(path) {
  var base = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL');
  if (!base) throw new Error('SUPABASE_URL is not set');
  return base.replace(/\/+$/,'') + '/rest/v1' + path;
}
/** POST/UPSERT/GET/DELETE wrapper */
function supaFetch_(path, opt) {
  var url = supabaseUrl(path);
  var res = UrlFetchApp.fetch(url, Object.assign({
    method: 'get',
    headers: supaHeaders(),
    muteHttpExceptions: true
  }, opt || {}));
  var code = res.getResponseCode();
  var body = res.getContentText() || '';
  if (code >= 400) throw new Error('Supabase error '+code+': '+body);
  return body ? JSON.parse(body) : null;
}
/** insert rows (array or single object) */
function supaInsert(table, rows) {
  return supaFetch_('/' + table, {
    method: 'post',
    payload: JSON.stringify(Array.isArray(rows) ? rows : [rows])
  });
}
/** upsert rows (requires PK/unique constraint) */
function supaUpsert(table, rows, onConflict) {
  var qs = onConflict ? ('?on_conflict=' + encodeURIComponent(onConflict)) : '';
  return supaFetch_('/' + table + qs, {
    method: 'post',
    payload: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
    headers: Object.assign(supaHeaders(), {'Prefer': 'resolution=merge-duplicates,return=representation'})
  });
}
/** select with query string already encoded (e.g. '?select=*&id=eq.123') */
function supaSelectRaw(table, queryString) {
  return supaFetch_('/' + table + (queryString||''), { method: 'get' });
}
/** delete with query string filter (e.g. '?id=eq.123') */
function supaDelete(table, queryString) {
  return supaFetch_('/' + table + (queryString||''), { method: 'delete' });
}
/** now-ISO helper */
function nowIso() { return new Date().toISOString(); }
/** ---- Env helpers ---- */
function getEnv_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v || typeof v !== 'string' || !v.trim()) {
    throw new Error('環境変数が未設定です: ' + key);
  }
  return v.trim();
}

/** ヘッダーを安全化（null/undefined を落とす） */
function safeHeaders_(h) {
  var out = {};
  Object.keys(h || {}).forEach(function(k){
    var v = h[k];
    if (typeof v === 'string') out[k] = v;  // 文字列のみ通す
  });
  return out;
}

function supaHeaders() {
  var svcKey = getEnv_('SUPABASE_KEY'); // 未設定ならここで throw
  return safeHeaders_({
    'Content-Type': 'application/json',
    'apikey': svcKey,
    'Authorization': 'Bearer ' + svcKey,
    'Prefer': 'return=representation'
  });
}

function supabaseUrl(path) {
  var base = getEnv_('SUPABASE_URL');          // 未設定ならここで throw
  return base.replace(/\/+$/,'') + '/rest/v1' + path;
}

/** fetch ラッパ（headers を毎回 safe 化） */
function supaFetch_(path, opt) {
  var url = supabaseUrl(path);
  var defaults = {
    method: 'get',
    muteHttpExceptions: true,
    headers: supaHeaders()
  };
  var req = Object.assign({}, defaults, opt || {});
  // もし opt.headers を渡したらマージして安全化
  req.headers = safeHeaders_(Object.assign({}, defaults.headers, (opt && opt.headers) || {}));

  // payload は必ず文字列に
  if (req.payload && typeof req.payload !== 'string') {
    req.payload = JSON.stringify(req.payload);
  }

  var res = UrlFetchApp.fetch(url, req);
  var code = res.getResponseCode();
  var text = res.getContentText() || '';
  if (code >= 400) throw new Error('Supabase error ' + code + ': ' + text);
  return text ? JSON.parse(text) : null;
}

function supaInsert(table, rows) {
  return supaFetch_('/' + table, {
    method: 'post',
    payload: Array.isArray(rows) ? rows : [rows]
  });
}

function supaUpsert(table, rows, onConflict) {
  var qs = onConflict ? ('?on_conflict=' + encodeURIComponent(onConflict)) : '';
  return supaFetch_('/' + table + qs, {
    method: 'post',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=representation' },
    payload: Array.isArray(rows) ? rows : [rows]
  });
}

function supaSelectRaw(table, queryString) {
  return supaFetch_('/' + table + (queryString || ''), { method: 'get' });
}

function supaDelete(table, queryString) {
  return supaFetch_('/' + table + (queryString || ''), { method: 'delete' });
}
function upsertShared(shared) {
  var now = new Date().toISOString();
  var row = {
    id: shared.id || undefined,                // DBが自動なら省略可
    name: shared.name || '',
    category: shared.category || '',
    ownerUserId: shared.ownerUserId || '',
    tags: shared.tags || '',
    color: shared.color || '',
    memoText: shared.memoText || '',
    status: shared.status || 'active',
    updatedAt: now,
    createdAt: shared.createdAt || now
  };
  var res = supaUpsert('shareds', row, 'id');
  return res && res[0];
}
function addShared(shared) { return upsertShared(shared); }
/**
 * 添付の一括追加（Supabase）
 * - id を必ず発番（DBがNOT NULLでもOK）
 * - 列名ゆれ対策：type と kind の両方を送って sbUpsertCompat が不要列を自動削る
 * - 既存と重複しないよう基本は INSERT 相当（id を新規にする）
 */
// 例: GAS 側
function upsertAttachments(kind, parentId, items){
  const now = new Date().toISOString();

  // 受け取る items: [{type,title,url,fileId, id?}, ...]
  const rows = items.map(it => {
    const r = {
      id: uuid(),
      parentType: kind,                 // ★ DB列名に合わせて snake_case
      parentId: String(parentId),
      type: it.type || 'url',
      title: it.title || '',
      url: it.url || '',
      fileId: it.fileId || null,
      updatedAt: now                    // created_at はDBデフォルトに任せる
    };
    if (it.id) r.id = it.id;            // 既存更新時のみ id を付与
    var res = supaUpsert('attachments',r,'id');
    return r;
  });

}
/** 日報テンプレートIDの設定・取得（Script Propertiesを使用） */
function setDailyReportTemplateId(fileId){
  PropertiesService.getScriptProperties().setProperty('DAILY_REPORT_TPL_ID', String(fileId||''));
  return 'OK';
}
function getDailyReportTemplateId(){
  return PropertiesService.getScriptProperties().getProperty('DAILY_REPORT_TPL_ID') || '';
}


/** テンプレからコピーしてDocを作成 */
function _createDocFromTemplate_(templateFileId, name, targetFolder){
  const tplFile = DriveApp.getFileById(templateFileId);
  const copied  = tplFile.makeCopy(name, targetFolder);        // Drive File
  const docId   = copied.getId();
  const doc     = DocumentApp.openById(docId);                 // Google Docs
  return { doc, docId, url: doc.getUrl(), file: copied };
}
/** ===== Base Spreadsheet / Folder Resolution ===== */

/**
 * 接続先スプレッドシートを取得
 * 1) Script Properties: TARGET_SPREADSHEET_ID
 * 2) Active Spreadsheet（コンテナバインド時）
 * 失敗時は throw（呼び元でフォールバック）
 */
function getSS_() {
  const sp = PropertiesService.getScriptProperties();
  const pid = sp.getProperty('TARGET_SPREADSHEET_ID') || '';
  if (pid) {
    try { return SpreadsheetApp.openById(pid); } catch (e) { /* 続行 */ }
  }
  // コンテナバインドされている場合のみ成功
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('No target spreadsheet bound (TARGET_SPREADSHEET_ID is not set and no active spreadsheet).');
}

/**
 * メモ系/Docs系のベースフォルダを明示設定（共有ドライブでもOK）
 * @param {string} folderId - DriveフォルダID
 */
function setNotesBaseFolderId(folderId){
  PropertiesService.getScriptProperties().setProperty('NOTES_BASE_FOLDER_ID', String(folderId||''));
  return 'OK';
}

/** 旧互換: URLからIDを抜く時に使えます（任意） */
function _extractIdFromDriveUrl_(url){
  const m = String(url||'').match(/[-\w]{25,}/);
  return m ? m[0] : '';
}

/**
 * どの環境でも安全にベースフォルダを返す
 * 優先度:
 *  1) Script Properties: NOTES_BASE_FOLDER_ID
 *  2) スプレッドシートの親フォルダ（getSS_()）
 *  3) 旧互換: TARGET_FOLDER_ID
 *  4) 最後の手段: My Drive 直下
 */
function _safeBaseFolder_(){
  const sp = PropertiesService.getScriptProperties();

  const notesId = sp.getProperty('NOTES_BASE_FOLDER_ID');
  if (notesId) {
    try { return DriveApp.getFolderById(notesId); } catch(e){}
  }

  try{
    const ss = getSS_();
    const file = DriveApp.getFileById(ss.getId());
    const it = file.getParents();
    if (it.hasNext()) return it.next();
  }catch(_){}

  const legacy = sp.getProperty('TARGET_FOLDER_ID');
  if (legacy) {
    try { return DriveApp.getFolderById(legacy); } catch(e){}
  }

  return DriveApp.getRootFolder();
}

/** getMinutes()用の簡易リーダ（無ければnull） */
function _openReadOnly_(name){
  try {
    const ss = getSS_();
    return ss ? ss.getSheetByName(name) : null;
  } catch(_){ return null; }
}
