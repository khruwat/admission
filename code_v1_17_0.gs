/* =============================================================
   ระบบรับสมัครนักเรียน โรงเรียนหนองนาคำวิทยาคม
   Student Enrollment System  v1.17.0
   ─────────────────────────────────────────────────────────────
   Sheets   : Applications | Users | Settings | AuditLog
   Roles    : ADMIN | STAFF
   Run once : setupSystem()  ←  สร้าง Sheet + default admin
   Default  : admin / admin1234
   ─────────────────────────────────────────────────────────────
   CHANGELOG
   v1.17.0 – 2569-03-17 – รอบ 2 + ย้ายเข้าไม่มีวันปิด + ตารางรายวันตามช่วงจริง
              SETTINGS: M1_REG2_START/END, M4_REG2_START/END, REG2_OPEN_TIME/CLOSE_TIME
              submitApplication: ย้ายเข้า → ข้ามตรวจวันเปิด/ปิด
                ม.1/ม.4 → ตรวจรอบ 1 ก่อน ถ้าหมดเขต → ตรวจรอบ 2 อัตโนมัติ
              getStats: dailyDetailedTrend สร้าง range จากวันเปิดจริง
                ถ้าไม่ตั้งค่า → fallback 30 วัน (ช่วงทดสอบ)
                รวมทั้งรอบ 1 + รอบ 2 (ข้ามช่วงว่างระหว่างรอบ)
              getPublicStats: return reg2 dates
   v1.16.0 – 2569-03-17 – Announcement popup + Export PDF
              getStats(): เพิ่ม byGender, byStudyPlan, byOldSchoolFull,
                dailyDetailedTrend (ชาย/หญิง/ม.3เดิม/รร.อื่น รายวัน 30 วัน)
              รองรับ filter: level, gender, studyPlan, oldSchool, status
   v1.14.0 – 2569-03-17 – ระบุเพศอัตโนมัติจากคำนำหน้าชื่อ
              APP_COLS: เพิ่ม GENDER (ต่อจาก PREFIX)
              submitApplication: derive GENDER — เด็กชาย/นาย → ชาย,
                เด็กหญิง/นาง/นางสาว → หญิง, อื่นๆ → ''
              checkStatus: return GENDER ในผลลัพธ์
              _migrateAppSheet: รองรับ column ใหม่อัตโนมัติ
   v1.13.0 – 2569-03-17 – แผนการเรียนรายชั้น (per-grade study plans)
              SETTINGS_DEFAULTS: STUDY_PLANS_M1–M6 (optional, fallback → MID/HIGH)
              getPublicStats(): studyPlansByLevel {'ม.1':[], ..., 'ม.6':[]}
              ม.ต้น: M1/M2/M3 → fallback STUDY_PLANS_MID
              ม.ปลาย: M4/M5/M6 → fallback STUDY_PLANS_HIGH
   v1.12.0 – 2569-03-17 – เพิ่มรหัสประจำบ้าน + ที่อยู่ปัจจุบัน
              APP_COLS: HOUSE_CODE, CURR_SAME, CURR_ADDRESS,
                CURR_SUBDISTRICT, CURR_DISTRICT, CURR_PROVINCE, CURR_ZIP
              TEXT_COLS: เพิ่ม HOUSE_CODE, CURR_ZIP
              submitApplication: map HOUSE_CODE + CURR_* fields
              updateApplicationByStudent: ขยาย ALLOWED_FIELDS
   v1.11.0 – 2569-03-17 – ขยายสิทธิ์แก้ไขข้อมูลตนเอง
              แก้ไขได้ทุก field ยกเว้น ID_CARD (reference)
              เพิ่ม STATUS "รายงานตัวแล้ว" → ล็อคการแก้ไขทั้งหมด
              ขยาย ALLOWED_FIELDS: ชื่อ, สัญชาติ, ศาสนา, ที่อยู่,
                บิดา/มารดา (ชื่อ+อาชีพ+รายได้+เบอร์), ผู้ปกครอง,
                โรงเรียนเดิม, GPA, แผนการเรียน
              safeUpdates: GPA เก็บเป็น number
   v1.10.0 – 2569-03-17 – แก้บั๊ก timezone วันเดือนปีเกิด (critical fix)
               _localDateStr(): Utilities.formatDate ใน timezone script (UTC+7)
               _sheetData(): Date → timezone-safe, แยก date-only vs timestamp
               _toDateStr(): ใช้ _localDateStr แทน toISOString()
               _toSupaRec(): BIRTHDATE ใช้ _localDateStr แทน toISOString().slice
               ก่อน fix: "5/5/2014 7:00:00" → "2014-05-04" (ผิด 1 วัน!)
               หลัง fix: "5/5/2014 7:00:00" → "2014-05-05" (ถูกต้อง)
   v1.9.0 – 2569-03-17 – ยืนยันตัวตนด้วยวันเกิดก่อนแก้ไข
              verifyOwnerAndGetApp(idCard, birthdate) — ตรวจสอบเจ้าของ
              updateApplicationByStudent(idCard, birthdate, appId, updates)
              อนุญาตแก้ไขเฉพาะ: ที่อยู่, เบอร์โทร, อาชีพ/รายได้บิดา-มารดา
              จำกัดการพยายาม 3 ครั้ง (frontend) — บันทึก Audit log
              Supabase sync อัตโนมัติเมื่อแก้ไขสำเร็จ
   v1.8.0 – 2569-03-17 – อัปเกรดระบบที่อยู่ (index.html)
              แทนที่ GAS GeoData cascade + CDN fallback
              ด้วย jquery.Thailand.js autocomplete ครอบคลุมทุกจังหวัด
              ลบ _buildGeo() / getGeoData() (dead code ~130 บรรทัด)
              เพิ่ม fields: reg-moo, reg-soi, reg-road
              ADDRESS บันทึกครบ เลขที่+หมู่+ซอย+ถนน
   v1.7.0 – 2569-03-16 – Supabase dual-write (applications table)
              SUPA_URL/SUPA_KEY ตั้งค่าใน Settings + syncAllToSupabase()
              _supaReq/_supaUpsert/_supaPatch/_supaDelete/_supaGetAll helpers
              submit/update/delete/cancel sync อัตโนมัติ
   v1.6.0 – 2569-03-16 – เพิ่ม ROLE: STAFF (เจ้าหน้าที่รับสมัคร)
   v1.5.2 – 2569-03-16 – Footer/System info, Photo upload, Checklist modal
   v1.5.0 – 2569-03-16 – Embed geo data, parent ID validation
   ============================================================= */

// OAuth scopes declaration (ต้องมีเพื่อให้ DriveApp ทำงานได้)
// @ts-ignore
/* global DriveApp, SpreadsheetApp, CacheService, LockService, Utilities, HtmlService, ContentService */

const _SS    = SpreadsheetApp.getActiveSpreadsheet();
const _CACHE = CacheService.getScriptCache();

// ─── SUPABASE CONFIG (อ่านค่าจาก Settings sheet ณ runtime) ───
const SUPA_URL     = 'https://vudbdydinxcdwowdlbti.supabase.co';
const SUPA_KEY     = 'sb_publishable_4WaexTTMtcZC6N7anTEaLA_XOgrAZQR';
const SUPA_ENABLED = (SUPA_URL !== '' && SUPA_KEY !== '');

const SH = { APP:'Applications', USERS:'Users', SETTINGS:'Settings', LOGS:'AuditLog' };

const APP_COLS = [
  'APP_ID','LEVEL','APP_TYPE','PREFIX','GENDER','FNAME','LNAME','ID_CARD',
  'BIRTHDATE','NATIONALITY','RELIGION',
  // ที่อยู่ตามทะเบียนบ้าน
  'HOUSE_CODE','ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP',
  // ที่อยู่ปัจจุบัน (ติดต่อได้)
  'CURR_SAME','CURR_ADDRESS','CURR_SUBDISTRICT','CURR_DISTRICT','CURR_PROVINCE','CURR_ZIP',
  // นักเรียน
  'PHONE',
  'PHOTO_URL',
  'FATHER_PREFIX','FATHER_FNAME','FATHER_LNAME','FATHER_ID_CARD',
  'FATHER_OCCUPATION','FATHER_INCOME','FATHER_PHONE','FATHER_STATUS',
  // มารดา (ปพ.3)
  'MOTHER_PREFIX','MOTHER_FNAME','MOTHER_LNAME','MOTHER_ID_CARD',
  'MOTHER_OCCUPATION','MOTHER_INCOME','MOTHER_PHONE','MOTHER_STATUS',
  // ผู้ปกครอง
  'GUARDIAN_TYPE','GUARDIAN_NAME','GUARDIAN_RELATION','GUARDIAN_ID_CARD','GUARDIAN_PHONE',
  // ความสัมพันธ์บิดา-มารดา
  'PARENT_COUPLE_RELATION',
  // การศึกษา
  'OLD_SCHOOL','OLD_STUDENT_ID','OLD_LEVEL','GPA','SPECIAL_ABILITY',
  'STUDY_PLAN','STUDY_PLAN_ALT','TRANSFER_LEVEL',
  // สถานะ
  'STATUS','EXAM_NO','EXAM_ROOM','SCORE','RESULT_NOTE',
  'REMARK','CREATED_AT','UPDATED_AT'
];

const STATUSES = ['สมัครแล้ว','ชำระเงินแล้ว','มีสิทธิ์สอบ','ผ่าน','ไม่ผ่าน','รายงานตัวแล้ว'];

const SETTINGS_DEFAULTS = [
  ['SCHOOL_FULLNAME',    'โรงเรียนหนองนาคำวิทยาคม'],
  ['SCHOOL_SUBDISTRICT', 'ตำบลบ้านโคก'],
  ['SCHOOL_DISTRICT',    'อำเภอหนองนาคำ'],
  ['SCHOOL_PROVINCE',    'จังหวัดขอนแก่น'],
  ['SCHOOL_PHONE',       ''],
  ['PRINCIPAL_NAME',     ''],
  ['PRINCIPAL_TITLE',    'ผู้อำนวยการโรงเรียน'],
  ['ACADEMIC_YEAR',      '2568'],
  ['M1_QUOTA',           '150'],
  ['M1_REG_START',       ''],
  ['M1_REG_END',         ''],
  ['M1_EXAM_DATE',       ''],
  ['M1_EXAM_TIME',       ''],
  ['M1_EXAM_LOCATION',   ''],
  ['M1_RESULT_DATE',     ''],
  ['REG_OPEN_M1',        'true'],
  ['M1_REG_OPEN_TIME',  '08:30'],
  ['M1_REG_CLOSE_TIME', '16:30'],
  ['M4_QUOTA',           '120'],
  ['M4_REG_START',       ''],
  ['M4_REG_END',         ''],
  ['M4_EXAM_DATE',       ''],
  ['M4_EXAM_TIME',       ''],
  ['M4_EXAM_LOCATION',   ''],
  ['M4_RESULT_DATE',     ''],
  ['REG_OPEN_M4',        'true'],
  ['M4_REG_OPEN_TIME',  '08:30'],
  ['M4_REG_CLOSE_TIME', '16:30'],
  // รอบ 2
  ['M1_REG2_START',      ''],
  ['M1_REG2_END',        ''],
  ['REG2_OPEN_M1',       'false'],
  ['M4_REG2_START',      ''],
  ['M4_REG2_END',        ''],
  ['REG2_OPEN_M4',       'false'],
  ['REG2_OPEN_TIME',    '08:30'],
  ['REG2_CLOSE_TIME',   '16:30'],
  ['EXAM_FEE',           '0'],
  ['LOGO_URL',           ''],
  ['PHOTO_FOLDER_URL',   ''],
  ['SERVICE_AREA_SCHOOLS',''],
  ['STUDY_PLANS_MID',     'แผนการเรียนทั่วไป'],
  ['STUDY_PLANS_HIGH',    'วิทยาศาสตร์-คณิตศาสตร์\nศิลปะ-ภาษา\nศิลปะ-การงานอาชีพ'],
  // แผนการเรียนรายชั้น (ถ้าว่าง → ใช้ pool รวม MID/HIGH)
  ['STUDY_PLANS_M1',      ''],
  ['STUDY_PLANS_M2',      ''],
  ['STUDY_PLANS_M3',      ''],
  ['STUDY_PLANS_M4',      ''],
  ['STUDY_PLANS_M5',      ''],
  ['STUDY_PLANS_M6',      ''],
  ['SYSTEM_NAME',        'ระบบรับสมัครนักเรียนออนไลน์'],
  ['DEVELOPER_NAME',     ''],
  ['DEVELOPER_POSITION', ''],
  ['DEVELOPER_PHONE',    ''],
  ['SYSTEM_VERSION',     'v1.17.0'],
  ['CHANGELOG_TEXT',     'v1.17.0 – 2569-03-17 – รอบ 2 + ย้ายเข้าไม่มีวันปิด + ตารางรายวันตามช่วงจริง\nv1.16.0 – 2569-03-17 – Announcement popup + Export PDF\nv1.15.0 – 2569-03-17 – Dashboard filter + ตารางรายวัน + Export CSV'],
  ['ANNOUNCEMENT',       ''],
  ['ANNOUNCE_IMAGE',     ''],
  ['ANNOUNCE_POPUP',     'true'],
  ['SUPA_URL',           'https://vudbdydinxcdwowdlbti.supabase.co'],
  ['SUPA_KEY',           'sb_publishable_4WaexTTMtcZC6N7anTEaLA_XOgrAZQR'],
];

// ─── SUPABASE HELPERS ───
function _supaReq(method, table, body, params) {
  if (!SUPA_ENABLED) return null;
  try {
    let url = SUPA_URL + '/rest/v1/' + table;
    if (params) url += '?' + Object.entries(params).map(([k,v]) => k+'='+encodeURIComponent(v)).join('&');
    const opts = {
      method, muteHttpExceptions: true,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };
    if (body) opts.payload = JSON.stringify(body);
    const res  = UrlFetchApp.fetch(url, opts);
    const code = res.getResponseCode();
    if (code >= 400) {
      Logger.log('Supabase error ' + code + ': ' + res.getContentText());
      return null;
    }
    const txt = res.getContentText();
    return txt ? JSON.parse(txt) : null;
  } catch(e) {
    Logger.log('Supabase exception: ' + e);
    return null;
  }
}

function _supaUpsert(table, record) {
  return _supaReq('POST', table, record, {'on_conflict': 'app_id'});
}

function _supaPatch(table, appId, updates) {
  return _supaReq('PATCH', table, updates, {'app_id': 'eq.'+appId});
}

function _supaDelete(table, appId) {
  return _supaReq('DELETE', table, null, {'app_id': 'eq.'+appId});
}

function _supaGetAll(table) {
  return _supaReq('GET', table, null, {'select': '*', 'limit': '5000'});
}

// แปลง rec (APP_COLS uppercase) → Supabase record (lowercase)
function _toSupaRec(rec) {
  const sr = {};
  APP_COLS.forEach(c => {
    let v = rec[c];
    if (c === 'BIRTHDATE' && v && v !== '') {
      // timezone-safe: ถ้าเป็น Date object ใช้ _localDateStr; ถ้าเป็น string ตัดเฉพาะวัน
      v = (v instanceof Date) ? _localDateStr(v) : String(v).slice(0, 10);
    } else {
      v = (v === null || v === undefined) ? '' : String(v);
    }
    sr[c.toLowerCase()] = v;
  });
  sr.app_id = rec.APP_ID || sr.app_id;
  return sr;
}

// ─── SERVE ───
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบรับสมัครนักเรียน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width,initial-scale=1.0');
}

// ─── LOCK ───
function _withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(12000)) throw new Error('ระบบยุ่ง กรุณาลองใหม่');
  try { return fn(); } finally { lock.releaseLock(); }
}

// ─── SHEET HELPERS ───
function _sheet(name) {
  return _SS.getSheetByName(name) || _SS.insertSheet(name);
}

// แปลง Date object → "YYYY-MM-DD" ในเวลา timezone ของ Script (ไทย UTC+7)
// ใช้ Utilities.formatDate แทน toISOString() ป้องกันบั๊ก timezone เลื่อนวัน
function _localDateStr(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function _sheetData(name, useDisplay) {
  const sh   = _sheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rng  = sh.getRange(1, 1, last, sh.getLastColumn());
  const vals = useDisplay ? rng.getDisplayValues() : rng.getValues();
  const hdrs = vals[0].map(h => String(h).trim());
  return vals.slice(1).map(row => {
    const o = {};
    hdrs.forEach((h,i) => {
      if (!useDisplay && row[i] instanceof Date) {
        // DATE-ONLY columns (วันเกิด, วันสมัคร ฯลฯ) → "YYYY-MM-DD" timezone-safe
        // TIMESTAMP columns (CREATED_AT, UPDATED_AT) → "YYYY-MM-DDTHH:mm:ss" ยังคง timezone ไว้
        const isTimestamp = ['CREATED_AT','UPDATED_AT','LAST_LOGIN','TIMESTAMP'].includes(h);
        if (isTimestamp) {
          o[h] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
        } else {
          o[h] = _localDateStr(row[i]);
        }
      } else {
        o[h] = row[i];
      }
    });
    return o;
  });
}

function _updateRow(shName, matchCol, matchVal, updates) {
  const sh   = _sheet(shName);
  const last = sh.getLastRow();
  if (last < 2) return false;
  const vals = sh.getRange(1,1,last,sh.getLastColumn()).getValues();
  const hdrs = vals[0].map(h => String(h).trim());
  const mi   = hdrs.indexOf(matchCol);
  if (mi < 0) return false;
  for (let r = 1; r < vals.length; r++) {
    if (String(vals[r][mi]) === String(matchVal)) {
      Object.entries(updates).forEach(([k,v]) => {
        const ci = hdrs.indexOf(k);
        if (ci >= 0) vals[r][ci] = v;
      });
      sh.getRange(r+1, 1, 1, vals[r].length).setValues([vals[r]]);
      return true;
    }
  }
  return false;
}

function _deleteRow(shName, matchCol, matchVal) {
  const sh   = _sheet(shName);
  const last = sh.getLastRow();
  if (last < 2) return false;
  const vals = sh.getRange(1,1,last,sh.getLastColumn()).getValues();
  const hdrs = vals[0].map(h => String(h).trim());
  const mi   = hdrs.indexOf(matchCol);
  if (mi < 0) return false;
  for (let r = 1; r < vals.length; r++) {
    if (String(vals[r][mi]) === String(matchVal)) { sh.deleteRow(r+1); return true; }
  }
  return false;
}

function _toDateStr(v) {
  if (!v || v === '') return '';
  if (v instanceof Date) return _localDateStr(v);  // Date object → timezone-safe
  const d = new Date(v);
  return isNaN(d) ? '' : _localDateStr(d);
}
function _toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// ─── SETUP ───

// คอลัมน์ที่ต้องเก็บเป็น Plain Text เสมอ (มี 0 นำหน้า หรือเป็น string ล้วน)
const TEXT_COLS = [
  'ID_CARD','HOUSE_CODE','ZIP','CURR_ZIP','PHONE','PARENT_PHONE','EXAM_NO','APP_ID','EXAM_ROOM',
  'OLD_STUDENT_ID','FATHER_ID_CARD','MOTHER_ID_CARD','GUARDIAN_ID_CARD',
  'FATHER_PHONE','MOTHER_PHONE','GUARDIAN_PHONE'
];

function setupSystem() {
  const aSh = _sheet(SH.APP);
  if (!aSh.getLastRow()) {
    aSh.appendRow(APP_COLS);
    aSh.getRange(1,1,1,APP_COLS.length).setFontWeight('bold').setBackground('#dbeafe');
    // กำหนด Plain Text (@) ให้คอลัมน์ที่มี 0 นำหน้า หรือเป็น string ล้วน
    TEXT_COLS.forEach(col => {
      const ci = APP_COLS.indexOf(col);
      if (ci >= 0) aSh.getRange(2, ci+1, 1000, 1).setNumberFormat('@');
    });
  } else {
    // Sheet มีอยู่แล้ว — อัปเดต format ให้คอลัมน์ที่ต้องการด้วย (เรียกซ้ำได้ปลอดภัย)
    TEXT_COLS.forEach(col => {
      const ci = APP_COLS.indexOf(col);
      if (ci >= 0) aSh.getRange(2, ci+1, Math.max(aSh.getLastRow(), 2), 1).setNumberFormat('@');
    });
  }

  const uSh = _sheet(SH.USERS);
  if (!uSh.getLastRow()) {
    uSh.appendRow(['USERNAME','PASSWORD','NAME','ROLE','LAST_LOGIN']);
    uSh.appendRow(['admin','admin1234','ผู้ดูแลระบบ','ADMIN','']);
    uSh.getRange('A1:E1').setFontWeight('bold').setBackground('#dcfce7');
  }
  // USERNAME และ PASSWORD เป็น text เสมอ
  uSh.getRange(2,1,Math.max(uSh.getLastRow(),2),2).setNumberFormat('@');

  const sSh = _sheet(SH.SETTINGS);
  if (!sSh.getLastRow()) {
    sSh.appendRow(['KEY','VALUE']);
    SETTINGS_DEFAULTS.forEach(r => sSh.appendRow(r));
    sSh.getRange('A1:B1').setFontWeight('bold').setBackground('#fef9c3');
    sSh.setColumnWidth(1,200); sSh.setColumnWidth(2,400);
  }
  // VALUE column = Plain Text ทั้งหมด (เบอร์โทร ปี ฯลฯ)
  sSh.getRange(2,2,Math.max(sSh.getLastRow(),2),1).setNumberFormat('@');

  const lSh = _sheet(SH.LOGS);
  if (!lSh.getLastRow()) {
    lSh.appendRow(['TIMESTAMP','USER','ACTION','DETAIL']);
    lSh.getRange('A1:D1').setFontWeight('bold').setBackground('#f3e8ff');
  }
  return { ok:true, msg:'Setup complete — login: admin / admin1234' };
}

// ─── SETTINGS ───
const _CFG_CACHE = 'cfg_v12';

function getSettings() {
  const cached = _CACHE.get(_CFG_CACHE);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  // useDisplay=true → อ่านค่าที่แสดงใน cell จริง ป้องกัน 043... → 43...
  const rows = _sheetData(SH.SETTINGS, true);
  const s = {};
  rows.forEach(r => { if (r.KEY) s[String(r.KEY).trim()] = String(r.VALUE); });
  _CACHE.put(_CFG_CACHE, JSON.stringify(s), 60);
  return s;
}

function updateSettings(token, settings) {
  const sess = _requirePerm(token, 'SETTINGS');
  if (!settings || typeof settings !== 'object') return { ok:false, msg:'ข้อมูลไม่ถูกต้อง' };

  _withLock(() => {
    const sh   = _sheet(SH.SETTINGS);
    const last = sh.getLastRow();
    if (!last) sh.appendRow(['KEY','VALUE']);
    const vals  = sh.getRange(1,1,Math.max(last,1),2).getValues();
    const keyMap = {};
    vals.forEach((r,i) => { if (i>0 && r[0]) keyMap[String(r[0]).trim()] = i+1; });

    const NUM_KEYS  = ['M1_QUOTA','M4_QUOTA','EXAM_FEE'];
    const DATE_KEYS = ['M1_REG_START','M1_REG_END','M4_REG_START','M4_REG_END',
                       'M1_EXAM_DATE','M4_EXAM_DATE','M1_RESULT_DATE','M4_RESULT_DATE',
                       'M1_REG2_START','M1_REG2_END','M4_REG2_START','M4_REG2_END'];

    Object.entries(settings).forEach(([k,v]) => {
      let sv;
      if (NUM_KEYS.includes(k))       sv = _toNum(v);
      else if (DATE_KEYS.includes(k)) sv = _toDateStr(v);
      else                            sv = String(v === null || v === undefined ? '' : v);

      if (keyMap[k] !== undefined) {
        const cell = sh.getRange(keyMap[k], 2);
        // บังคับ Plain Text ก่อน setValue เสมอ — ป้องกัน Sheets แปลง 043... เป็น 43...
        if (typeof sv === 'string') cell.setNumberFormat('@');
        cell.setValue(sv);
      } else {
        sh.appendRow([k, sv]);
        // ตั้ง format ให้แถวใหม่ด้วย
        if (typeof sv === 'string') sh.getRange(sh.getLastRow(), 2).setNumberFormat('@');
      }
    });

    _CACHE.remove(_CFG_CACHE);
  });

  _logWithRole(sess.name, sess.role, 'UPDATE_SETTINGS', Object.keys(settings).join(', '));
  return { ok:true };
}

// ─── ROLES & PERMISSIONS ───
const ROLES = {
  ADMIN: 'ADMIN',   // ทุกสิทธิ์
  STAFF: 'STAFF',   // เจ้าหน้าที่รับสมัคร
};

// สิทธิ์แต่ละ role
const ROLE_PERMS = {
  ADMIN: ['VIEW_APPS','EDIT_APP','DELETE_APP','CHANGE_STATUS','ASSIGN_EXAM',
          'SETTINGS','USERS','BACKUP','EXPORT','VIEW_LOG'],
  STAFF: ['VIEW_APPS','EDIT_APP','CHANGE_STATUS','ASSIGN_EXAM','EXPORT'],
};

function _hasPerm(role, perm) {
  return (ROLE_PERMS[role] || []).includes(perm);
}

function _requireAuth(token) {
  // ต้อง login เท่านั้น — ทุก role
  const s = _getSession(token);
  if (!s) throw new Error('กรุณาเข้าสู่ระบบ (session หมดอายุ)');
  return s;
}

function _requireAdmin(token) {
  // backward-compat: ใช้ชื่อเดิม แต่ตอนนี้ยอมรับทุก role ที่ login แล้ว
  return _requireAuth(token);
}

function _requirePerm(token, perm) {
  const s = _requireAuth(token);
  if (!_hasPerm(s.role, perm)) {
    _log(s.name, 'ACCESS_DENIED', perm + ' (role:' + s.role + ')');
    throw new Error('ไม่มีสิทธิ์ดำเนินการนี้ (ต้องการสิทธิ์: ' + perm + ')');
  }
  return s;
}

// ─── ENHANCED AUDIT LOG ───
function _log(user, action, detail) {
  try {
    const sh = _sheet(SH.LOGS);
    if (!sh.getLastRow()) {
      sh.appendRow(['TIMESTAMP','USER','ACTION','DETAIL','ROLE']);
      sh.getRange('A1:E1').setFontWeight('bold').setBackground('#fef3c7');
    }
    // ดึง role จาก session ถ้ามี
    let role = '';
    try {
      const sessions = _CACHE; // role ไม่ได้เก็บแยก → ใส่ว่างไว้
      role = '';
    } catch(e) {}
    sh.appendRow([new Date(), user||'SYSTEM', action, String(detail||''), role]);
  } catch(e) {}
}

// version ที่รับ role ด้วย
function _logWithRole(user, role, action, detail) {
  try {
    const sh = _sheet(SH.LOGS);
    if (!sh.getLastRow()) {
      sh.appendRow(['TIMESTAMP','USER','ACTION','DETAIL','ROLE']);
      sh.getRange('A1:E1').setFontWeight('bold').setBackground('#fef3c7');
    }
    sh.appendRow([new Date(), user||'SYSTEM', action, String(detail||''), role||'']);
  } catch(e) {}
}

function login(username, password) {
  if (!username || !password) return { ok:false, msg:'กรุณากรอกข้อมูล' };
  const users = _sheetData(SH.USERS);
  const u = users.find(x =>
    String(x.USERNAME).trim() === String(username).trim() &&
    String(x.PASSWORD) === String(password)
  );
  if (!u) {
    _log('UNKNOWN','LOGIN_FAILED','username:'+username);
    return { ok:false, msg:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }
  const token = Utilities.getUuid();
  const role  = String(u.ROLE||'STAFF').trim().toUpperCase();
  _CACHE.put('tok_'+token, JSON.stringify({username:u.USERNAME, name:u.NAME, role}), 10800);
  _updateRow(SH.USERS,'USERNAME',u.USERNAME,{LAST_LOGIN:new Date()});
  _logWithRole(u.NAME, role, 'LOGIN', '');
  return { ok:true, token, name:u.NAME, role };
}

function logout(token) {
  if (token) _CACHE.remove('tok_'+token);
  _log('', 'LOGOUT', '');
  return { ok:true };
}

function _getSession(token) {
  if (!token) return null;
  const raw = _CACHE.get('tok_'+token);
  return raw ? JSON.parse(raw) : null;
}

function changePassword(token, oldPwd, newPwd) {
  const sess = _requireAdmin(token);
  if (!newPwd || newPwd.length < 6) return { ok:false, msg:'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' };
  return _withLock(() => {
    const users = _sheetData(SH.USERS);
    const u = users.find(x => x.USERNAME === sess.username);
    if (!u || String(u.PASSWORD) !== String(oldPwd)) return { ok:false, msg:'รหัสผ่านเดิมไม่ถูกต้อง' };
    _updateRow(SH.USERS,'USERNAME',sess.username,{PASSWORD:newPwd});
    _log(sess.name,'CHANGE_PWD',sess.username);
    return { ok:true };
  });
}

// ─── ตรวจ checksum เลขบัตรประชาชนไทย ───
function _validateThaiId(id) {
  id = String(id).trim().replace(/\D/g, '');
  if (id.length !== 13) return false;
  if (id[0] === '0' || id[0] === '9') return false; // เลข 0 และ 9 ไม่ใช้สำหรับบุคคลทั่วไป
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === parseInt(id[12]);
}

// ─── DERIVE GENDER FROM PREFIX ───
function _deriveGender(prefix) {
  const p = String(prefix || '').trim();
  if (['เด็กชาย','นาย'].includes(p))               return 'ชาย';
  if (['เด็กหญิง','นาง','นางสาว'].includes(p))     return 'หญิง';
  return '';
}

// ─── PUBLIC: SUBMIT ───
function submitApplication(data) {
  if (!data || !data.FNAME || !data.LNAME || !data.ID_CARD || !data.LEVEL)
    return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบถ้วน' };
  if (!_validateThaiId(data.ID_CARD))
    return { ok:false, msg:'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };

  // migrate sheet header ก่อนเสมอ
  try { _migrateAppSheet(); } catch(e) {}

  const cfg     = getSettings();

  // ย้ายเข้า — ไม่ตรวจวันเปิด/ปิด เปิดตลอดปีการศึกษา
  if (data.LEVEL !== 'ย้ายเข้า') {
    const openKey = data.LEVEL === 'ม.1' ? 'REG_OPEN_M1' : 'REG_OPEN_M4';
    const reg2Key = data.LEVEL === 'ม.1' ? 'REG2_OPEN_M1' : 'REG2_OPEN_M4';
    const isOpen1 = String(cfg[openKey])  === 'true';
    const isOpen2 = String(cfg[reg2Key])  === 'true';
    if (!isOpen1 && !isOpen2)
      return { ok:false, msg:'ขณะนี้ยังไม่เปิดรับสมัครในระดับชั้นนี้' };

    const pfx = data.LEVEL === 'ม.1' ? 'M1' : 'M4';
    const now  = new Date();

    // ─── ตรวจช่วงเวลา: ผ่านถ้าอยู่ในรอบ 1 หรือรอบ 2 อย่างน้อยหนึ่งรอบ ───
    function _inRange(startKey, endKey, openTimeKey, closeTimeKey) {
      const s = cfg[startKey]; const e = cfg[endKey];
      const ot = cfg[openTimeKey]  || '00:00';
      const ct = cfg[closeTimeKey] || '23:59';
      if (s) {
        const startDT = new Date(s + 'T' + ot + ':00');
        if (!isNaN(startDT) && now < startDT) return { ok:false, msg:'ยังไม่ถึงเวลาเปิดรับสมัคร (เปิด '+s+' เวลา '+ot+' น.)' };
      }
      if (e) {
        const endDT = new Date(e + 'T' + ct + ':00');
        if (!isNaN(endDT) && now > endDT) return { ok:false, msg:'หมดเขตรับสมัครแล้ว (ปิด '+e+' เวลา '+ct+' น.)' };
      }
      return { ok:true };
    }

    const r1 = isOpen1
      ? _inRange(pfx+'_REG_START', pfx+'_REG_END', pfx+'_REG_OPEN_TIME', pfx+'_REG_CLOSE_TIME')
      : { ok:false, msg:'' };

    if (!r1.ok) {
      // รอบ 1 ไม่ผ่าน → ลองรอบ 2
      if (!isOpen2) return { ok:false, msg:r1.msg || 'ขณะนี้ยังไม่เปิดรับสมัคร' };
      const r2 = _inRange(pfx+'_REG2_START', pfx+'_REG2_END', 'REG2_OPEN_TIME', 'REG2_CLOSE_TIME');
      if (!r2.ok) return { ok:false, msg:r2.msg || 'ปิดรับสมัครทั้งรอบ 1 และรอบ 2 แล้ว' };
    }
  }

  return _withLock(() => {
    const sh   = _sheet(SH.APP);
    // migrate ก่อนทุกครั้ง — เพิ่ม column ที่ขาดหาย
    _migrateAppSheet();

    const last   = sh.getLastRow();
    const shCols = sh.getLastColumn();
    // อ่าน header ตาม sheet จริง (ไม่ใช้ APP_COLS.length เพราะอาจไม่ตรง)
    const hdrs   = sh.getRange(1,1,1,shCols).getValues()[0].map(h => String(h).trim());
    const iId    = hdrs.indexOf('ID_CARD');
    const iLv    = hdrs.indexOf('LEVEL');
    const iApId  = hdrs.indexOf('APP_ID');

    // ตรวจ duplicate จากข้อมูลที่มีอยู่
    if (last >= 2) {
      const dataRows = sh.getRange(2,1,last-1,shCols).getValues();
      for (let r = 0; r < dataRows.length; r++) {
        if (iId >= 0 && String(dataRows[r][iId]).trim() === String(data.ID_CARD).trim()) {
          const existId = iApId >= 0 ? dataRows[r][iApId] : '–';
          return { ok:false, msg:'เลขประจำตัวประชาชนนี้ได้สมัครแล้ว (เลขที่ใบสมัคร: '+existId+') หากต้องการแก้ไขกรุณาติดต่อเจ้าหน้าที่' };
        }
      }
    }

    const yr    = String(cfg.ACADEMIC_YEAR||'2568').slice(-2);
    const pfxMap = {'ม.1':'M1','ม.4':'M4','ย้ายเข้า':'TX'};
    const pfx   = pfxMap[data.LEVEL] || 'MX';
    let   cnt   = 1;
    if (last >= 2 && iLv >= 0) {
      const dataRows2 = sh.getRange(2,1,last-1,shCols).getValues();
      cnt = dataRows2.filter(r => String(r[iLv]) === data.LEVEL).length + 1;
    }
    const appId = yr+'-'+pfx+'-'+String(cnt).padStart(4,'0');
    const nowTs = new Date();

    const _str = v => (v === null || v === undefined) ? '' : String(v);
    const rec = Object.assign({}, data, {
      APP_ID:           _str(appId),
      GENDER:           _deriveGender(data.PREFIX),
      ID_CARD:          _str(data.ID_CARD).trim(),
      HOUSE_CODE:       _str(data.HOUSE_CODE).replace(/\D/g,'').slice(0,11),
      ZIP:              _str(data.ZIP),
      CURR_SAME:        _str(data.CURR_SAME),
      CURR_ADDRESS:     _str(data.CURR_ADDRESS),
      CURR_SUBDISTRICT: _str(data.CURR_SUBDISTRICT),
      CURR_DISTRICT:    _str(data.CURR_DISTRICT),
      CURR_PROVINCE:    _str(data.CURR_PROVINCE),
      CURR_ZIP:         _str(data.CURR_ZIP),
      PHONE:            _str(data.PHONE),
      FATHER_ID_CARD:   _str(data.FATHER_ID_CARD),
      FATHER_PHONE:     _str(data.FATHER_PHONE),
      FATHER_INCOME:    data.FATHER_INCOME ? _toNum(data.FATHER_INCOME) : '',
      MOTHER_ID_CARD:   _str(data.MOTHER_ID_CARD),
      MOTHER_PHONE:     _str(data.MOTHER_PHONE),
      MOTHER_INCOME:    data.MOTHER_INCOME ? _toNum(data.MOTHER_INCOME) : '',
      GUARDIAN_ID_CARD: _str(data.GUARDIAN_ID_CARD),
      GUARDIAN_PHONE:   _str(data.GUARDIAN_PHONE),
      OLD_STUDENT_ID:   _str(data.OLD_STUDENT_ID),
      STUDY_PLAN:       _str(data.STUDY_PLAN),
      STUDY_PLAN_ALT:   _str(data.STUDY_PLAN_ALT),
      TRANSFER_LEVEL:   _str(data.TRANSFER_LEVEL),
      GPA:              _toNum(data.GPA),
      BIRTHDATE:        data.BIRTHDATE ? new Date(data.BIRTHDATE) : '',
      STATUS:           'สมัครแล้ว',
      EXAM_NO:'', EXAM_ROOM:'', SCORE:'', RESULT_NOTE:'', REMARK:'',
      CREATED_AT: nowTs, UPDATED_AT: nowTs
    });

    // เขียนข้อมูลตาม header ของ sheet จริง (ไม่ใช้ APP_COLS order)
    // วิธีนี้ทำให้ข้อมูลอยู่ถูกตำแหน่งแม้ sheet เก่าหรือใหม่
    const row = hdrs.map(h => rec[h] !== undefined ? rec[h] : '');
    sh.appendRow(row);

    // ── Dual-write to Supabase ──
    try { _supaUpsert('applications', _toSupaRec(rec)); } catch(e) { Logger.log('Supabase write failed: '+e); }

    // ตั้ง format Plain Text สำหรับ TEXT_COLS ในแถวใหม่
    const newRowIdx = sh.getLastRow();
    TEXT_COLS.forEach(col => {
      const ci = hdrs.indexOf(col);
      if (ci >= 0) sh.getRange(newRowIdx, ci+1).setNumberFormat('@');
    });

    _log('PUBLIC','SUBMIT',appId+' | '+data.FNAME+' '+data.LNAME+' | '+data.LEVEL);
    return { ok:true, appId };
  });
}

// ─── PUBLIC: CANCEL APPLICATION (student self-cancel) ───
function cancelApplicationByStudent(appId, reason) {
  if (!appId) return { ok:false, msg:'ไม่ระบุเลขที่ใบสมัคร' };
  return _withLock(() => {
    const apps = _sheetData(SH.APP);
    const app  = apps.find(a => String(a.APP_ID).trim() === String(appId).trim());
    if (!app) return { ok:false, msg:'ไม่พบใบสมัครเลขที่ '+appId };
    // ห้ามยกเลิกถ้าผ่านหรือมีสิทธิ์สอบแล้ว (admin เท่านั้น)
    if (['ผ่าน','มีสิทธิ์สอบ'].includes(app.STATUS))
      return { ok:false, msg:'ไม่สามารถยกเลิกได้ เนื่องจากได้รับสิทธิ์แล้ว กรุณาติดต่อเจ้าหน้าที่' };

    _deleteRow(SH.APP, 'APP_ID', appId);
    // ── Sync delete to Supabase ──
    try { _supaDelete('applications', appId); } catch(e) {}
    _log('STUDENT_CANCEL', 'CANCEL_APP', appId + ' | เหตุผล: ' + (reason||'ไม่ระบุ'));
    return { ok:true };
  });
}

// ─── ADMIN: MIGRATE SHEET ───
function migrateSheet(token) {
  _requirePerm(token, 'SETTINGS');
  try {
    _migrateAppSheet();
    return { ok:true, msg:'Migrate header สำเร็จ — column ใหม่ถูกเพิ่มแล้ว' };
  } catch(e) {
    return { ok:false, msg:String(e) };
  }
}

// ─── AUTO-MIGRATE Applications sheet header ───
// 1. เพิ่ม column ที่ขาด
// 2. เรียง column ตาม APP_COLS order (สร้าง sheet ชั่วคราวถ้าจำเป็น)
function _migrateAppSheet() {
  const sh   = _sheet(SH.APP);
  const last = sh.getLastRow();
  if (!last) {
    sh.appendRow(APP_COLS);
    sh.getRange(1,1,1,APP_COLS.length).setFontWeight('bold').setBackground('#e0f2fe').setNumberFormat('@');
    return;
  }

  const shCols = sh.getLastColumn();
  const hdrs   = sh.getRange(1,1,1,shCols).getValues()[0].map(h => String(h).trim());

  // ขั้น 1: เพิ่ม column ที่ขาด
  APP_COLS.forEach(col => {
    if (!hdrs.includes(col)) {
      const newIdx = sh.getLastColumn() + 1;
      sh.getRange(1, newIdx).setValue(col).setFontWeight('bold').setBackground('#dcfce7').setNumberFormat('@');
      hdrs.push(col);
    }
  });

  // ขั้น 2: ถ้า header order ตรงกับ APP_COLS แล้ว → จบ
  const appColsPresent = APP_COLS.filter(c => hdrs.includes(c));
  const currentOrder   = hdrs.filter(h => APP_COLS.includes(h));
  const needReorder    = appColsPresent.some((c,i) => currentOrder[i] !== c);
  if (!needReorder) return;

  // ขั้น 3: มีข้อมูลใน sheet → reorder โดยสร้าง mapping ใหม่
  if (last < 2) {
    // ไม่มีข้อมูล → เขียน header ใหม่ตาม APP_COLS
    sh.clearContents();
    sh.appendRow(APP_COLS);
    sh.getRange(1,1,1,APP_COLS.length).setFontWeight('bold').setBackground('#e0f2fe');
    return;
  }

  // มีข้อมูล: อ่านทั้งหมด → map ใหม่ → เขียนทับ
  const currentHdrs = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(h=>String(h).trim());
  const allData     = sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();

  // สร้าง object แต่ละแถว
  const rows = allData.map(row => {
    const obj = {};
    currentHdrs.forEach((h,i) => { if (h) obj[h] = row[i]; });
    return obj;
  });

  // เขียนทับด้วย order ใหม่
  sh.clearContents();
  sh.appendRow(APP_COLS);
  sh.getRange(1,1,1,APP_COLS.length).setFontWeight('bold').setBackground('#e0f2fe').setNumberFormat('@');

  if (rows.length) {
    const newData = rows.map(obj => APP_COLS.map(c => obj[c] !== undefined ? obj[c] : ''));
    sh.getRange(2,1,newData.length,APP_COLS.length).setValues(newData);
    // ตั้ง TEXT format
    TEXT_COLS.forEach(col => {
      const ci = APP_COLS.indexOf(col);
      if (ci >= 0 && newData.length > 0)
        sh.getRange(2, ci+1, newData.length, 1).setNumberFormat('@');
    });
  }
}

// ─── PUBLIC: VERIFY OWNER (student self-edit) ───
// ตรวจสอบความเป็นเจ้าของโดยใช้วันเดือนปีเกิดเป็น PIN
function verifyOwnerAndGetApp(idCard, birthdate) {
  if (!idCard || !birthdate) return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบ' };
  const apps = _sheetData(SH.APP);
  const app  = apps.find(a => String(a.ID_CARD).trim() === String(idCard).trim());
  if (!app) return { ok:false, msg:'ไม่พบข้อมูลการสมัคร' };

  // เปรียบเทียบวันเกิด (เก็บ ISO YYYY-MM-DD)
  const appDOB   = String(app.BIRTHDATE || '').slice(0, 10);
  const inputDOB = String(birthdate).slice(0, 10);

  if (!appDOB || appDOB !== inputDOB) {
    _log('PUBLIC', 'VERIFY_FAIL', 'ID:' + String(idCard).slice(-4) + ' dob mismatch');
    return { ok:false, msg:'วันเดือนปีเกิดไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
  }

  // ไม่ส่งรหัสผ่าน / ข้อมูลอ่อนไหวกลับ (ส่งเฉพาะที่ UI ต้องการ)
  const safe = {};
  [
    'APP_ID','LEVEL','APP_TYPE','STATUS',
    'PREFIX','FNAME','LNAME','ID_CARD','BIRTHDATE','NATIONALITY','RELIGION',
    'PHOTO_URL',
    'ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP','PHONE',
    'FATHER_PREFIX','FATHER_FNAME','FATHER_LNAME','FATHER_PHONE',
    'FATHER_OCCUPATION','FATHER_INCOME','FATHER_STATUS',
    'MOTHER_PREFIX','MOTHER_FNAME','MOTHER_LNAME','MOTHER_PHONE',
    'MOTHER_OCCUPATION','MOTHER_INCOME','MOTHER_STATUS',
    'GUARDIAN_TYPE','GUARDIAN_NAME','GUARDIAN_PHONE',
    'OLD_SCHOOL','OLD_LEVEL','GPA','SPECIAL_ABILITY',
    'STUDY_PLAN','STUDY_PLAN_ALT','TRANSFER_LEVEL',
    'EXAM_NO','CREATED_AT'
  ].forEach(k => { if (app[k] !== undefined) safe[k] = app[k]; });

  _log('PUBLIC', 'VERIFY_OK', 'APP:' + app.APP_ID);
  return { ok:true, app:safe };
}

// ─── PUBLIC: UPDATE BY STUDENT (หลังยืนยันตัวตน) ───
// อนุญาตแก้ไขเฉพาะฟิลด์ที่ไม่กระทบสถานะการสมัคร
function updateApplicationByStudent(idCard, birthdate, appId, updates) {
  // ยืนยันตัวตนก่อนทุกครั้ง (double-verify)
  const verify = verifyOwnerAndGetApp(idCard, birthdate);
  if (!verify.ok) return verify;
  if (String(verify.app.APP_ID) !== String(appId))
    return { ok:false, msg:'ข้อมูลใบสมัครไม่ตรงกัน' };

  // ห้ามแก้ไขเฉพาะเมื่อ "รายงานตัวแล้ว" (ยืนยันตัวรับเป็นนักเรียนแล้ว)
  if (verify.app.STATUS === 'รายงานตัวแล้ว')
    return { ok:false, msg:'ไม่สามารถแก้ไขได้ เนื่องจากยืนยันตัวรับเป็นนักเรียนแล้ว' };

  // whitelist — ห้ามแก้ ID_CARD, APP_ID, STATUS, EXAM_NO, EXAM_ROOM, SCORE, RESULT_NOTE (admin-only)
  const ALLOWED_FIELDS = [
    'PREFIX','FNAME','LNAME','NATIONALITY','RELIGION','PHOTO_URL',
    'HOUSE_CODE',
    'ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP',
    'CURR_SAME','CURR_ADDRESS','CURR_SUBDISTRICT','CURR_DISTRICT','CURR_PROVINCE','CURR_ZIP',
    'PHONE',
    'FATHER_PREFIX','FATHER_FNAME','FATHER_LNAME',
    'FATHER_PHONE','FATHER_OCCUPATION','FATHER_INCOME',
    'MOTHER_PREFIX','MOTHER_FNAME','MOTHER_LNAME',
    'MOTHER_PHONE','MOTHER_OCCUPATION','MOTHER_INCOME',
    'GUARDIAN_NAME','GUARDIAN_PHONE',
    'OLD_SCHOOL','OLD_LEVEL','GPA','SPECIAL_ABILITY',
    'STUDY_PLAN','STUDY_PLAN_ALT'
  ];

  const safeUpdates = {};
  ALLOWED_FIELDS.forEach(function(k) {
    if (updates[k] !== undefined && updates[k] !== null) {
      const numericFields = ['FATHER_INCOME','MOTHER_INCOME','GPA'];
      safeUpdates[k] = (numericFields.includes(k) && updates[k] !== '')
        ? _toNum(updates[k])
        : String(updates[k]);
    }
  });
  safeUpdates.UPDATED_AT = new Date();

  return _withLock(function() {
    const ok = _updateRow(SH.APP, 'APP_ID', appId, safeUpdates);
    if (ok) {
      // Supabase sync
      try {
        const supaUpdates = {};
        Object.entries(safeUpdates).forEach(function([k,v]) {
          supaUpdates[k.toLowerCase()] = (v instanceof Date)
            ? v.toISOString() : (v === null ? '' : String(v));
        });
        _supaPatch('applications', appId, supaUpdates);
      } catch(e) { Logger.log('Supabase patch failed: '+e); }

      _log('STUDENT_EDIT', 'EDIT_APP',
        appId + ' | fields: ' + Object.keys(safeUpdates).filter(k=>k!=='UPDATED_AT').join(', '));
    }
    return { ok:ok, msg:ok ? '' : 'ไม่พบใบสมัคร' };
  });
}

// ─── PUBLIC: CHECK STATUS ───
function checkStatus(idCard) {
  if (!idCard) return { ok:false, msg:'กรุณาระบุเลขบัตรประชาชน' };
  const all   = _sheetData(SH.APP);
  const found = all.filter(a => String(a.ID_CARD).trim() === String(idCard).trim());
  if (!found.length) return { ok:false, msg:'ไม่พบข้อมูลการสมัคร กรุณาตรวจสอบเลขบัตรประชาชน' };
  return { ok:true, data:found.map(a => ({
    APP_ID:a.APP_ID, LEVEL:a.LEVEL, APP_TYPE:a.APP_TYPE,
    PREFIX:a.PREFIX, GENDER:a.GENDER, FNAME:a.FNAME, LNAME:a.LNAME,
    STATUS:a.STATUS, EXAM_NO:a.EXAM_NO, EXAM_ROOM:a.EXAM_ROOM,
    SCORE:a.SCORE, RESULT_NOTE:a.RESULT_NOTE, CREATED_AT:a.CREATED_AT
  }))};
}

// ─── PUBLIC: RESULTS ───
function getPublicResults(level) {
  return _sheetData(SH.APP)
    .filter(a => (!level || a.LEVEL===level) && ['มีสิทธิ์สอบ','ผ่าน','ไม่ผ่าน'].includes(a.STATUS))
    .map(a => ({
      APP_ID:a.APP_ID, LEVEL:a.LEVEL, PREFIX:a.PREFIX, FNAME:a.FNAME, LNAME:a.LNAME,
      EXAM_NO:a.EXAM_NO, EXAM_ROOM:a.EXAM_ROOM, STATUS:a.STATUS,
      SCORE:a.SCORE, RESULT_NOTE:a.RESULT_NOTE
    }));
}

// ─── PUBLIC: STATS (เปิดเผยได้ ไม่มีข้อมูลส่วนบุคคล) ───
function getPublicStats() {
  const apps = _sheetData(SH.APP);
  const cfg  = getSettings();

  const count = (arr, fn) => arr.filter(fn).length;
  const m1    = apps.filter(a => a.LEVEL === 'ม.1');
  const m4    = apps.filter(a => a.LEVEL === 'ม.4');

  function levelStat(arr, quota) {
    return {
      total:       arr.length,
      quota:       parseInt(quota) || 0,
      สมัครแล้ว:   count(arr, a => a.STATUS === 'สมัครแล้ว'),
      ชำระเงินแล้ว: count(arr, a => a.STATUS === 'ชำระเงินแล้ว'),
      มีสิทธิ์สอบ:  count(arr, a => a.STATUS === 'มีสิทธิ์สอบ'),
      ผ่าน:         count(arr, a => a.STATUS === 'ผ่าน'),
      ไม่ผ่าน:      count(arr, a => a.STATUS === 'ไม่ผ่าน'),
    };
  }

  return {
    m1:           levelStat(m1, cfg.M1_QUOTA),
    m4:           levelStat(m4, cfg.M4_QUOTA),
    total:        apps.length,
    m1ExamDate:   cfg.M1_EXAM_DATE   || '',
    m4ExamDate:   cfg.M4_EXAM_DATE   || '',
    m1ExamTime:   cfg.M1_EXAM_TIME   || '',
    m4ExamTime:   cfg.M4_EXAM_TIME   || '',
    m1ResultDate: cfg.M1_RESULT_DATE || '',
    m4ResultDate: cfg.M4_RESULT_DATE || '',
    m1RegStart:   cfg.M1_REG_START   || '',
    m1RegEnd:     cfg.M1_REG_END     || '',
    m4RegStart:   cfg.M4_REG_START   || '',
    m4RegEnd:     cfg.M4_REG_END     || '',
    m1Open:       String(cfg.REG_OPEN_M1) !== 'false',
    m4Open:       String(cfg.REG_OPEN_M4) !== 'false',
    // รอบ 2
    m1Reg2Start:  cfg.M1_REG2_START  || '',
    m1Reg2End:    cfg.M1_REG2_END    || '',
    m4Reg2Start:  cfg.M4_REG2_START  || '',
    m4Reg2End:    cfg.M4_REG2_END    || '',
    m1Open2:      String(cfg.REG2_OPEN_M1) === 'true',
    m4Open2:      String(cfg.REG2_OPEN_M4) === 'true',
    studyPlansMid:  String(cfg.STUDY_PLANS_MID ||'แผนการเรียนทั่วไป').split('\n').map(s=>s.trim()).filter(Boolean),
    studyPlansHigh: String(cfg.STUDY_PLANS_HIGH||'วิทยาศาสตร์-คณิตศาสตร์\nศิลปะ-ภาษา\nศิลปะ-การงานอาชีพ').split('\n').map(s=>s.trim()).filter(Boolean),
    // แผนการเรียนรายชั้น — ถ้าว่างใช้ pool รวม (MID/HIGH) แทน
    studyPlansByLevel: (function() {
      function _plans(key, fallback) {
        var v = String(cfg[key] || '').trim();
        return v ? v.split('\n').map(function(s){return s.trim();}).filter(Boolean) : fallback;
      }
      var mid  = String(cfg.STUDY_PLANS_MID ||'แผนการเรียนทั่วไป').split('\n').map(function(s){return s.trim();}).filter(Boolean);
      var high = String(cfg.STUDY_PLANS_HIGH||'วิทยาศาสตร์-คณิตศาสตร์\nศิลปะ-ภาษา\nศิลปะ-การงานอาชีพ').split('\n').map(function(s){return s.trim();}).filter(Boolean);
      return {
        'ม.1': _plans('STUDY_PLANS_M1', mid),
        'ม.2': _plans('STUDY_PLANS_M2', mid),
        'ม.3': _plans('STUDY_PLANS_M3', mid),
        'ม.4': _plans('STUDY_PLANS_M4', high),
        'ม.5': _plans('STUDY_PLANS_M5', high),
        'ม.6': _plans('STUDY_PLANS_M6', high),
      };
    })(),
    serviceSchools: String(cfg.SERVICE_AREA_SCHOOLS||'').split('\n').map(s=>s.trim()).filter(Boolean),
  };
}

// ─── ADMIN: APPLICATIONS ───
function getApplications(token, filters) {
  _requireAdmin(token);
  filters = filters || {};
  let apps = _sheetData(SH.APP);
  if (filters.level)   apps = apps.filter(a => a.LEVEL    === filters.level);
  if (filters.status)  apps = apps.filter(a => a.STATUS   === filters.status);
  if (filters.appType) apps = apps.filter(a => a.APP_TYPE === filters.appType);
  if (filters.search) {
    const q = String(filters.search).toLowerCase();
    apps = apps.filter(a =>
      String(a.APP_ID||'').toLowerCase().includes(q) ||
      String(a.FNAME||'').toLowerCase().includes(q)  ||
      String(a.LNAME||'').toLowerCase().includes(q)  ||
      String(a.ID_CARD||'').includes(q)
    );
  }
  return apps;
}

function updateApplication(token, appId, updates) {
  const sess = _requireAdmin(token);
  return _withLock(() => {
    if (updates.SCORE !== undefined && updates.SCORE !== '') updates.SCORE = _toNum(updates.SCORE);
    updates.UPDATED_AT = new Date();
    const ok = _updateRow(SH.APP,'APP_ID',appId,updates);
    // ── Sync update to Supabase ──
    try {
      const supaUpdates = {};
      Object.entries(updates).forEach(([k,v]) => {
        if (k === 'BIRTHDATE' && v && v !== '') {
          supaUpdates[k.toLowerCase()] = (v instanceof Date) ? v.toISOString().slice(0,10) : String(v).slice(0,10);
        } else {
          supaUpdates[k.toLowerCase()] = (v === null || v === undefined) ? '' : String(v);
        }
      });
      _supaPatch('applications', appId, supaUpdates);
    } catch(e) { Logger.log('Supabase patch failed: '+e); }
    _log(sess.name,'UPDATE_APP',appId+' → '+JSON.stringify(updates));
    return { ok };
  });
}

function deleteApplication(token, appId) {
  const sess = _requirePerm(token, 'DELETE_APP');
  return _withLock(() => {
    const ok = _deleteRow(SH.APP,'APP_ID',appId);
    if (ok) {
      _log(sess.name,'DELETE_APP',appId);
      // ── Sync delete to Supabase ──
      try { _supaDelete('applications', appId); } catch(e) {}
    }
    return { ok, msg:ok?'':'ไม่พบข้อมูล' };
  });
}

// ─── ADMIN: ASSIGN EXAM ───
function assignExamNumbers(token, level) {
  const sess = _requirePerm(token, 'ASSIGN_EXAM');
  return _withLock(() => {
    const sh   = _sheet(SH.APP);
    const last = sh.getLastRow();
    if (last < 2) return { ok:false, msg:'ไม่มีข้อมูลการสมัคร' };
    const vals   = sh.getRange(1,1,last,sh.getLastColumn()).getValues();
    const h      = vals[0].map(x => String(x).trim());
    const iLevel = h.indexOf('LEVEL');
    const iStat  = h.indexOf('STATUS');
    const iExam  = h.indexOf('EXAM_NO');
    const ELIGIBLE = ['สมัครแล้ว','ชำระเงินแล้ว'];

    let maxNum = 0;
    for (let r = 1; r < vals.length; r++) {
      if (vals[r][iLevel]===level && vals[r][iExam]) {
        const n = parseInt(String(vals[r][iExam]).replace(/\D/g,''));
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    let counter = maxNum+1, count = 0;
    const rows = [];
    for (let r = 1; r < vals.length; r++) {
      if (vals[r][iLevel]===level && ELIGIBLE.includes(vals[r][iStat]) && !vals[r][iExam]) {
        vals[r][iExam] = (level==='ม.1'?'1':'4')+String(counter).padStart(4,'0');
        vals[r][iStat] = 'มีสิทธิ์สอบ';
        rows.push({ row:r+1, data:vals[r] });
        counter++; count++;
      }
    }
    rows.forEach(({row,data}) => sh.getRange(row,1,1,data.length).setValues([data]));
    _logWithRole(sess.name,sess.role,'ASSIGN_EXAM',level+': '+count+' คน');
    return { ok:true, count };
  });
}

// ─── ADMIN: STATS ───
function getStats(token) {
  _requireAdmin(token);
  const apps = _sheetData(SH.APP);
  const cfg  = getSettings();

  const byStatus = arr => {
    const obj = {}; STATUSES.forEach(s => { obj[s]=0; });
    arr.forEach(a => { if (obj[a.STATUS]!==undefined) obj[a.STATUS]++; });
    return obj;
  };

  const m1 = apps.filter(a => a.LEVEL==='ม.1');
  const m4 = apps.filter(a => a.LEVEL==='ม.4');

  // Daily trend 14 วัน
  const days = {};
  for (let i=13; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days[d.toISOString().slice(0,10)] = 0;
  }
  apps.forEach(a => {
    const k = String(a.CREATED_AT||'').slice(0,10);
    if (days[k]!==undefined) days[k]++;
  });

  // By APP_TYPE
  const byType = {};
  apps.forEach(a => { byType[a.APP_TYPE||'ไม่ระบุ'] = (byType[a.APP_TYPE||'ไม่ระบุ']||0)+1; });

  // Top 10 old schools
  const schoolCount = {};
  apps.forEach(a => { if(a.OLD_SCHOOL) schoolCount[a.OLD_SCHOOL]=(schoolCount[a.OLD_SCHOOL]||0)+1; });
  const topSchools = Object.entries(schoolCount)
    .sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([name,count])=>({name,count}));

  // By Province
  const byProvince = {};
  apps.forEach(a => { if(a.PROVINCE) byProvince[a.PROVINCE]=(byProvince[a.PROVINCE]||0)+1; });

  // In-zone vs out-of-zone
  const serviceSchools = String(cfg.SERVICE_AREA_SCHOOLS||'')
    .split('\n').map(s=>s.trim()).filter(Boolean);
  const inZone  = serviceSchools.length
    ? apps.filter(a => serviceSchools.includes(String(a.OLD_SCHOOL||'').trim())).length
    : null;

  // Registration pace (เปอร์เซ็นต์เต็มโควตา)
  const m1Quota = parseInt(cfg.M1_QUOTA)||0;
  const m4Quota = parseInt(cfg.M4_QUOTA)||0;
  const m1Eligible = m1.filter(a=>['มีสิทธิ์สอบ','ผ่าน'].includes(a.STATUS)).length;
  const m4Eligible = m4.filter(a=>['มีสิทธิ์สอบ','ผ่าน'].includes(a.STATUS)).length;

  // ─── เพิ่มใหม่ v1.15.0 ───

  // By Gender (รวม + แยกระดับ)
  function byGenderOf(arr) {
    return { ชาย: arr.filter(a=>a.GENDER==='ชาย').length, หญิง: arr.filter(a=>a.GENDER==='หญิง').length };
  }
  const byGender   = byGenderOf(apps);
  const m1ByGender = byGenderOf(m1);
  const m4ByGender = byGenderOf(m4);

  // By StudyPlan (ม.1 / ม.4 แยกกัน)
  function byPlanOf(arr) {
    const o = {};
    arr.forEach(a => { const p = a.STUDY_PLAN||'ไม่ระบุ'; o[p]=(o[p]||0)+1; });
    return o;
  }
  const m1ByStudyPlan = byPlanOf(m1);
  const m4ByStudyPlan = byPlanOf(m4);

  // By OldSchool — รายการทั้งหมด (ไม่ตัด Top 10) สำหรับ filter dropdown
  const allSchools = [...new Set(apps.map(a=>a.OLD_SCHOOL||'').filter(Boolean))].sort();

  // ─── Daily Detailed Trend — ช่วงวันตามการเปิดรับสมัครจริง ───
  // Logic: รวมช่วง rng1 + rng2 ของ ม.1 และ ม.4 ทั้งหมด
  // ถ้าไม่มีวันกำหนดเลย → fallback 30 วัน (ช่วงทดสอบ)
  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  function _dateRange(startStr, endStr) {
    // คืน array ของ 'yyyy-MM-dd' ระหว่าง start..end (inclusive)
    if (!startStr && !endStr) return [];
    const s = startStr ? new Date(startStr) : new Date();
    const e = endStr   ? new Date(endStr)   : new Date();
    if (isNaN(s) || isNaN(e)) return [];
    const days = [], cur = new Date(s);
    cur.setHours(0,0,0,0); e.setHours(0,0,0,0);
    while (cur <= e) {
      days.push(Utilities.formatDate(cur, tz, 'yyyy-MM-dd'));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  // รวบรวม date keys ทุกช่วง
  const allDateSet = new Set();
  [
    [cfg.M1_REG_START,  cfg.M1_REG_END],
    [cfg.M1_REG2_START, cfg.M1_REG2_END],
    [cfg.M4_REG_START,  cfg.M4_REG_END],
    [cfg.M4_REG2_START, cfg.M4_REG2_END],
  ].forEach(function(pair) {
    _dateRange(pair[0], pair[1]).forEach(function(d){ allDateSet.add(d); });
  });

  // ถ้าไม่มีวันกำหนดเลย → fallback 30 วัน
  if (allDateSet.size === 0) {
    for (let i=29; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      allDateSet.add(Utilities.formatDate(d, tz, 'yyyy-MM-dd'));
    }
  }

  // เรียงวันและสร้าง object
  const days30 = {};
  [...allDateSet].sort().forEach(function(k) {
    days30[k] = {
      m1:{ ชาย:0, หญิง:0, ในเขต:0, นอกเขต:0, รวม:0 },
      m4:{ ชาย:0, หญิง:0, ม3เดิม:0, ม3อื่น:0, รวม:0 },
      total:0
    };
  });
  apps.forEach(function(a) {
    const k = String(a.CREATED_AT||'').slice(0,10);
    if (!days30[k]) return;
    const row = days30[k];
    row.total++;
    if (a.LEVEL === 'ม.1') {
      row.m1.รวม++;
      if (a.GENDER==='ชาย') row.m1.ชาย++; else if (a.GENDER==='หญิง') row.m1.หญิง++;
      if (serviceSchools.length) {
        if (serviceSchools.includes(String(a.OLD_SCHOOL||'').trim())) row.m1.ในเขต++;
        else row.m1.นอกเขต++;
      }
    } else if (a.LEVEL === 'ม.4') {
      row.m4.รวม++;
      if (a.GENDER==='ชาย') row.m4.ชาย++; else if (a.GENDER==='หญิง') row.m4.หญิง++;
      // ม.3 เดิม = APP_TYPE === 'นักเรียนในสังกัด' หรือ OLD_LEVEL มี 'ม.3'
      const isM3Old = String(a.OLD_LEVEL||'').includes('ม.3') &&
                      serviceSchools.includes(String(a.OLD_SCHOOL||'').trim());
      if (isM3Old) row.m4.ม3เดิม++; else row.m4.ม3อื่น++;
    }
  });

  return {
    total:apps.length, m1Total:m1.length, m4Total:m4.length,
    m1Quota, m4Quota,
    byStatus:byStatus(apps), m1ByStatus:byStatus(m1), m4ByStatus:byStatus(m4),
    dailyTrend:days, byType, topSchools, byProvince,
    inZone, outZone: inZone !== null ? apps.length - inZone : null,
    m1Eligible, m4Eligible,
    // v1.15.0
    byGender, m1ByGender, m4ByGender,
    m1ByStudyPlan, m4ByStudyPlan,
    allSchools,
    dailyDetailedTrend: days30
  };
}

// ─── ADMIN: AUDIT LOG ───
function getAuditLog(token) {
  _requireAdmin(token);
  return _sheetData(SH.LOGS).slice(-500).reverse();
}

// ─── ADMIN: USERS ───
function getAdminUsers(token) {
  _requireAdmin(token);
  return _sheetData(SH.USERS).map(u => ({
    USERNAME:u.USERNAME, NAME:u.NAME, ROLE:u.ROLE, LAST_LOGIN:u.LAST_LOGIN
  }));
}

function addAdminUser(token, username, password, name, role) {
  const sess = _requirePerm(token, 'USERS');
  if (!username||!password||!name) return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบ' };
  if (password.length<6) return { ok:false, msg:'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
  return _withLock(() => {
    const existing = _sheetData(SH.USERS);
    if (existing.find(u => String(u.USERNAME).trim()===String(username).trim()))
      return { ok:false, msg:'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
    _sheet(SH.USERS).appendRow([username.trim(),password,name.trim(),'ADMIN','']);
    _logWithRole(sess.name,sess.role,'ADD_USER',username+' (role:'+r+')');
    return { ok:true };
  });
}

function removeAdminUser(token, username) {
  const sess = _requirePerm(token, 'USERS');
  if (username===sess.username) return { ok:false, msg:'ไม่สามารถลบตนเองได้' };
  return _withLock(() => {
    const ok = _deleteRow(SH.USERS,'USERNAME',username);
    if (ok) _log(sess.name,'REMOVE_USER',username);
    return { ok, msg:ok?'':'ไม่พบผู้ใช้' };
  });
}

function resetUserPassword(token, targetUsername, newPwd) {
  const sess = _requireAdmin(token);
  if (!newPwd||newPwd.length<6) return { ok:false, msg:'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' };
  return _withLock(() => {
    const users = _sheetData(SH.USERS);
    if (!users.find(x => x.USERNAME===targetUsername)) return { ok:false, msg:'ไม่พบผู้ใช้' };
    _updateRow(SH.USERS,'USERNAME',targetUsername,{PASSWORD:newPwd});
    _log(sess.name,'RESET_PWD',targetUsername);
    return { ok:true };
  });
}

// ─── UPLOAD PHOTO ───
function uploadPhoto(base64Data, appId) {
  try {
    const raw    = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const bytes  = Utilities.base64Decode(raw);
    const blob   = Utilities.newBlob(bytes, 'image/jpeg', 'photo_'+appId+'.jpg');
    const folder = _getPhotoFolder();
    const file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok:true, url: file.getDownloadUrl(), id: file.getId(),
             folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId() };
  } catch(e) {
    return { ok:false, msg: String(e) };
  }
}

function _getPhotoFolder() {
  const cfg       = getSettings();
  const customUrl = String(cfg.PHOTO_FOLDER_URL || '').trim();
  // ถ้ากำหนด folder URL ไว้ → ดึง folder นั้น
  if (customUrl) {
    const m = customUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (m) {
      try { return DriveApp.getFolderById(m[1]); } catch(e) {}
    }
  }
  // สร้าง/หา folder อัตโนมัติ
  const name    = (cfg.SCHOOL_FULLNAME||'School') + ' - รูปภาพผู้สมัคร';
  const folders = DriveApp.getFoldersByName(name);
  const folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  // auto-save folder URL กลับไป settings ถ้ายังไม่มี
  if (!customUrl) {
    try {
      const sh = _sheet(SH.SETTINGS);
      const vals = sh.getRange(1,1,sh.getLastRow(),2).getValues();
      const hdrs = vals.map(r=>String(r[0]).trim());
      const idx  = hdrs.indexOf('PHOTO_FOLDER_URL');
      const fUrl = 'https://drive.google.com/drive/folders/' + folder.getId();
      if (idx >= 0) sh.getRange(idx+1, 2).setValue(fUrl);
      else sh.appendRow(['PHOTO_FOLDER_URL', fUrl]);
      _CACHE.remove(_CFG_CACHE);
    } catch(e) {}
  }
  return folder;
}

// ─── UPLOAD LOGO ───
function uploadLogo(token, base64Data) {
  _requireAdmin(token);
  try {
    const raw  = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const bytes= Utilities.base64Decode(raw);
    // หา mime type จาก data URL
    const mime = base64Data.match(/^data:(image\/\w+);base64,/);
    const type = mime ? mime[1] : 'image/png';
    const ext  = type.split('/')[1] || 'png';
    const blob = Utilities.newBlob(bytes, type, 'logo_school.'+ext);
    // เก็บใน root Drive (หรือ folder เดียวกับรูปผู้สมัคร)
    const folder = _getPhotoFolder();
    // ลบโลโก้เก่าถ้ามี
    const existing = folder.getFilesByName('logo_school.'+ext);
    while (existing.hasNext()) existing.next().setTrashed(true);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    // บันทึก URL กลับไป settings
    const url = 'https://drive.google.com/uc?id=' + file.getId();
    updateSettings(token, { LOGO_URL: url });
    return { ok:true, url };
  } catch(e) {
    return { ok:false, msg: String(e) };
  }
}


function exportApplications(token, level) {
  _requireAdmin(token);
  const apps = _sheetData(SH.APP).filter(a => !level || a.LEVEL===level);
  return { ok:true, data:apps, cols:APP_COLS };
}

// ─── SUPABASE: FULL SYNC (admin) ───
function syncAllToSupabase(token) {
  _requirePerm(token, 'BACKUP');
  if (!SUPA_ENABLED) return { ok:false, msg:'Supabase ไม่ได้เปิดใช้งาน (SUPA_URL หรือ SUPA_KEY ว่าง)' };
  try {
    const apps = _sheetData(SH.APP);
    let success = 0, failed = 0;
    apps.forEach(function(a) {
      const r = _supaUpsert('applications', _toSupaRec(a));
      r !== null ? success++ : failed++;
    });
    _logWithRole('ADMIN','ADMIN','SYNC_SUPABASE', success+' ok / '+failed+' fail');
    return { ok:true, success:success, failed:failed };
  } catch(e) {
    return { ok:false, msg:String(e) };
  }
}

// ─── BACKUP ───
function exportBackup(token) {
  _requirePerm(token, 'BACKUP');
  const ts = new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-');
  return {
    ok:       true,
    timestamp:ts,
    version:  '1.2.0',
    school:   getSettings().SCHOOL_FULLNAME || '',
    sheets: {
      Applications: _sheetData(SH.APP),
      Users:        _sheetData(SH.USERS).map(u => ({ ...u, PASSWORD:'***' })),
      Settings:     _sheetData(SH.SETTINGS, true),
    }
  };
}

// ─── SERVICE AREA SCHOOLS ───
function getServiceAreaSchools(token) {
  _requireAdmin(token);
  const cfg = getSettings();
  return {
    ok:   true,
    list: String(cfg.SERVICE_AREA_SCHOOLS||'').split('\n').map(s=>s.trim()).filter(Boolean)
  };
}

function updateServiceAreaSchools(token, list) {
  const sess = _requireAdmin(token);
  const val  = Array.isArray(list)
    ? list.map(s=>String(s).trim()).filter(Boolean).join('\n')
    : String(list||'');
  return updateSettings(token, { SERVICE_AREA_SCHOOLS: val });
}

// ─── PUBLIC: CHECK ZONE ───
function checkSchoolZone(schoolName) {
  const cfg     = getSettings();
  const schools = String(cfg.SERVICE_AREA_SCHOOLS||'')
    .split('\n').map(s=>s.trim()).filter(Boolean);
  if (!schools.length) return { hasZone:false };
  const inZone = schools.some(s => s === String(schoolName||'').trim());
  return { hasZone:true, inZone };
}
function fixHeaders() {
  _migrateAppSheet();
}