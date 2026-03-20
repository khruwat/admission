// v1_20_3: Bugfix — clear publicStats cache เมื่อบันทึก settings
/* =============================================================
   ระบบรับสมัครนักเรียน โรงเรียนหนองนาคำวิทยาคม
   Student Enrollment System  v1.20.3
   ─────────────────────────────────────────────────────────────
   Sheets   : Applications | Users | Settings | AuditLog
              ExamConfig | ExamScores
   Roles    : ADMIN | STAFF
   Run once : setupSystem()  ←  สร้าง Sheet + default admin
   Default  : admin / admin1234
   ─────────────────────────────────────────────────────────────
   CHANGELOG
   v1.20.3 – 2569-03-18 – Bugfix: dropdown โรงเรียนเดิมไม่แสดงหลัง save settings
              สาเหตุ: updateSettings() clear เฉพาะ _CFG_CACHE แต่ไม่ clear
                _PUB_STATS_CACHE (60 วินาที) ทำให้ getPublicStats() คืน
                serviceSchools=[] จาก cache เก่า แม้จะบันทึกโรงเรียนแล้ว
              แก้: updateSettings() เพิ่ม _CACHE.remove(_PUB_STATS_CACHE)
                   serviceSchools พร้อมใช้ทันทีหลัง save settings
   v1.20.2 – 2569-03-18 – APP_TYPE ม.1 บันทึก ในเขต/นอกเขต อัตโนมัติ
              frontend คำนวณ APP_TYPE จากที่อยู่โรงเรียนเดิม แล้วส่งมาใน payload
              backend รับค่าตามปกติ — ไม่มี logic เปลี่ยนฝั่ง server
              ค่าที่เป็นไปได้สำหรับ ม.1:
                "นักเรียนทั่วไป (ในเขตพื้นที่)"  — ที่อยู่ตรงกับ SERVICE_AREA_ZONES
                "นักเรียนทั่วไป (นอกเขตพื้นที่)" — ที่อยู่ไม่ตรง
                "นักเรียนทั่วไป"                  — ไม่ได้กรอกที่อยู่ / ไม่มี zone config
              SYSTEM_VERSION, CHANGELOG_TEXT อัปเดต
   v1.20.1 – 2569-03-18 – ลบ APP_TYPE ในเขต/นอกเขต ออกจากระบบ (frontend)
              APP_COLS: เพิ่ม OLD_SCHOOL_SUBDISTRICT, OLD_SCHOOL_DISTRICT,
                OLD_SCHOOL_PROVINCE (หลัง OLD_SCHOOL)
              SETTINGS: เพิ่ม SERVICE_AREA_ZONES (กฎ จ/อ/ต บรรทัดละ 1 ข้อ)
              _checkZoneByAddress(): helper ตรวจสอบเขตจากที่อยู่
              checkOldSchoolZone(): public API สำหรับ frontend เช็ค real-time
              getPublicStats(): เพิ่ม serviceZones array
              getStats(): inZone/outZone ใช้ address-based ถ้ามี SERVICE_AREA_ZONES
                          fallback ชื่อโรงเรียนถ้าไม่มี ZONES
              exportApplications(): เพิ่ม 3 columns ที่อยู่โรงเรียนเดิม
              updateApplicationByStudent(): ขยาย ALLOWED_FIELDS + 3 fields ใหม่
              submitApplication(): map OLD_SCHOOL_SUBDISTRICT/DISTRICT/PROVINCE
   v1.19.2 – 2569-03-17 – Fix: uploadLogo
              regex รองรับ mime type ทุกรูปแบบ (svg+xml, webp ฯลฯ)
              fallback folder → root Drive ถ้า _getPhotoFolder() fail
              ลบโลโก้เดิมทุก extension ก่อน upload
              ใช้ thumbnail URL แทน uc?id= (เปิดได้ใน <img> tag ตรงๆ)
              เพิ่ม log audit
   v1.19.1 – 2569-03-17 – Bugfix addAdminUser + exportScoreSheetUrl
              addAdminUser: ใช้ role param แทน hardcode ADMIN + แก้ var 'r' undefined
              exportScoreSheetUrl: ลบ addEditor('*@*') ที่ throw error
   v1.19.0 – 2569-03-17 – ระบบคะแนนสอบ + Export Google Sheet
              Sheet ExamConfig: config วิชา/สัดส่วน/เกณฑ์ต่อ level+plan
              Sheet ExamScores: คะแนนรายวิชารายคน
              getExamConfig / saveExamConfig
              exportScoreSheetUrl: สร้าง Google Sheet แชร์ครู
              importScoreSheet: ดึงคะแนนกลับ + คำนวณ + อัปเดต STATUS
              calculateApplicantResult: คิดคะแนน GPA+สอบ → ผ่าน/ไม่ผ่าน
   v1.18.0 – 2569-03-17 – Export รายชื่อ PDF + Excel แบบมืออาชีพ
              exportApplications: filter level, studyPlan, status, appType
                เรียงตาม APP_ID (ลำดับการสมัคร)
                return เฉพาะ columns ที่จำเป็น + metadata
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

const SH = { APP:'Applications', USERS:'Users', SETTINGS:'Settings', LOGS:'AuditLog',
             EXAM_CFG:'ExamConfig', EXAM_SCR:'ExamScores' };

const APP_COLS = [
  'APP_ID','LEVEL','APP_TYPE','PREFIX','GENDER','FNAME','LNAME','ID_CARD',
  'BIRTHDATE','NATIONALITY','RELIGION',
  // ที่อยู่ตามทะเบียนบ้าน
  'HOUSE_CODE','ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP',
  // ที่อยู่ปัจจุบัน (ติดต่อได้)
  'CURR_SAME','CURR_ADDRESS','CURR_SUBDISTRICT','CURR_DISTRICT','CURR_PROVINCE','CURR_ZIP',
  // นักเรียน
  'PHONE','WEIGHT_KG','HEIGHT_CM','SIBLINGS_MALE','SIBLINGS_FEMALE','STUDYING_COUNT',
  'DISABILITY','DISEASE','HEALTH_NOTE','PHOTO_URL',
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
  'OLD_SCHOOL','OLD_SCHOOL_SUBDISTRICT','OLD_SCHOOL_DISTRICT','OLD_SCHOOL_PROVINCE',
  'OLD_STUDENT_ID','OLD_LEVEL','GPA','SPECIAL_ABILITY',
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
  // เขตพื้นที่บริการแบบที่อยู่ (แต่ละบรรทัด = กฎ 1 ข้อ)
  // รูปแบบ: จังหวัด  หรือ  จังหวัด/อำเภอ  หรือ  จังหวัด/อำเภอ/ตำบล
  // ตัวอย่าง: ขอนแก่น/หนองนาคำ = ทุกตำบลในอำเภอหนองนาคำ จ.ขอนแก่น
  ['SERVICE_AREA_ZONES',''],
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
  ['SYSTEM_VERSION',     'v1.21.0'],
  ['CHANGELOG_TEXT',     'v1.21.0 – 2569-03-20 – ดาวน์โหลดใบสมัคร+ใบมอบตัวเมื่อสถานะผ่าน/รายงานตัวแล้ว\nv1.20.3 – 2569-03-18 – Bugfix: dropdown โรงเรียนเดิมไม่แสดงหลัง save settings\nv1.20.2 – 2569-03-18 – APP_TYPE ม.1 บันทึก ในเขต/นอกเขต อัตโนมัติ\nv1.20.1 – 2569-03-18 – ลบ APP_TYPE ในเขต/นอกเขต ออกจากระบบ\nv1.20.0 – 2569-03-18 – เขตพื้นที่บริการแบบที่อยู่โรงเรียนเดิม'],
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

// ─── ZONE CHECK BY ADDRESS ───
// ตรวจสอบว่าที่อยู่โรงเรียนเดิมอยู่ในเขตพื้นที่บริการหรือไม่
// return: true (ในเขต) | false (นอกเขต) | null (ไม่ได้ตั้งค่า SERVICE_AREA_ZONES)
function _checkZoneByAddress(subdistrict, district, province, cfgOverride) {
  var cfg  = cfgOverride || getSettings();
  var raw  = String(cfg.SERVICE_AREA_ZONES || '').trim();
  if (!raw) return null; // ไม่ได้ตั้งค่า → ไม่ตัดสิน
  var zones = raw.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
  var sub  = String(subdistrict || '').trim();
  var dist = String(district    || '').trim();
  var prov = String(province    || '').trim();
  for (var i = 0; i < zones.length; i++) {
    var parts = zones[i].split('/').map(function(s){ return s.trim(); });
    var zProv = parts[0] || '';
    var zDist = parts[1] || '';
    var zSub  = parts[2] || '';
    if (zProv && prov !== zProv) continue; // จังหวัดไม่ตรง
    if (zDist && dist !== zDist) continue; // อำเภอไม่ตรง
    if (zSub  && sub  !== zSub)  continue; // ตำบลไม่ตรง
    return true; // match → ในเขต
  }
  return false; // ไม่ match ทุกกฎ → นอกเขต
}

// ─── PUBLIC: CHECK ZONE BY OLD SCHOOL ADDRESS ───
// เรียกจาก frontend ตอนนักเรียนกรอกที่อยู่โรงเรียนเดิม (real-time check)
function checkOldSchoolZone(subdistrict, district, province) {
  var cfg    = getSettings();
  var zones  = String(cfg.SERVICE_AREA_ZONES || '').trim();
  var result = _checkZoneByAddress(subdistrict, district, province, cfg);
  return {
    hasZoneConfig: zones !== '',
    inZone: result,
    label:  result === true  ? 'ในเขตพื้นที่บริการ'
          : result === false ? 'นอกเขตพื้นที่บริการ'
          : 'ยังไม่ได้ตั้งค่าเขตพื้นที่บริการ'
  };
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

  // ─── ExamConfig ───
  const ecSh = _sheet(SH.EXAM_CFG);
  if (!ecSh.getLastRow()) {
    ecSh.appendRow(['CONFIG_ID','LEVEL','STUDY_PLAN','SUBJECT_NAME','MAX_SCORE','WEIGHT_PCT','GPA_WEIGHT_PCT','PASS_SCORE','CREATED_AT']);
    ecSh.getRange(1,1,1,9).setFontWeight('bold').setBackground('#fef9c3');
    ecSh.setColumnWidths(1,9,120);
  }

  // ─── ExamScores ───
  const esSh = _sheet(SH.EXAM_SCR);
  if (!esSh.getLastRow()) {
    esSh.appendRow(['APP_ID','LEVEL','STUDY_PLAN','CONFIG_ID','SUBJECT_NAME','SCORE','MAX_SCORE','UPDATED_AT']);
    esSh.getRange(1,1,1,8).setFontWeight('bold').setBackground('#fef3c7');
    esSh.setColumnWidths(1,8,120);
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

  const chText = String(s.CHANGELOG_TEXT || SETTINGS_DEFAULTS.find(r => r[0] === 'CHANGELOG_TEXT')?.[1] || '');
  const firstLog = chText.split('\n').map(t => String(t || '').trim()).filter(Boolean)[0] || '';
  s.CODE_VERSION = ((firstLog.match(/v\d+(?:\.\d+)+/i) || [])[0]) || String(s.SYSTEM_VERSION || SETTINGS_DEFAULTS.find(r => r[0] === 'SYSTEM_VERSION')?.[1] || 'v–');
  s.CODE_UPDATED = ((firstLog.match(/(25\d{2}-\d{2}-\d{2}|20\d{2}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/) || [])[0]) || '';

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
    _CACHE.remove(_PUB_STATS_CACHE); // clear publicStats cache ด้วย เพราะ serviceSchools/serviceZones มาจาก settings
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
      WEIGHT_KG:        data.WEIGHT_KG !== '' && data.WEIGHT_KG != null ? _toNum(data.WEIGHT_KG) : '',
      HEIGHT_CM:        data.HEIGHT_CM !== '' && data.HEIGHT_CM != null ? _toNum(data.HEIGHT_CM) : '',
      SIBLINGS_MALE:    data.SIBLINGS_MALE !== '' && data.SIBLINGS_MALE != null ? _toNum(data.SIBLINGS_MALE) : '',
      SIBLINGS_FEMALE:  data.SIBLINGS_FEMALE !== '' && data.SIBLINGS_FEMALE != null ? _toNum(data.SIBLINGS_FEMALE) : '',
      STUDYING_COUNT:   data.STUDYING_COUNT !== '' && data.STUDYING_COUNT != null ? _toNum(data.STUDYING_COUNT) : '',
      DISABILITY:       _str(data.DISABILITY),
      DISEASE:          _str(data.DISEASE),
      HEALTH_NOTE:      _str(data.HEALTH_NOTE),
      FATHER_ID_CARD:   _str(data.FATHER_ID_CARD),
      FATHER_PHONE:     _str(data.FATHER_PHONE),
      FATHER_INCOME:    data.FATHER_INCOME ? _toNum(data.FATHER_INCOME) : '',
      MOTHER_ID_CARD:   _str(data.MOTHER_ID_CARD),
      MOTHER_PHONE:     _str(data.MOTHER_PHONE),
      MOTHER_INCOME:    data.MOTHER_INCOME ? _toNum(data.MOTHER_INCOME) : '',
      GUARDIAN_ID_CARD: _str(data.GUARDIAN_ID_CARD),
      GUARDIAN_PHONE:   _str(data.GUARDIAN_PHONE),
      OLD_SCHOOL:            _str(data.OLD_SCHOOL),
      OLD_SCHOOL_SUBDISTRICT:_str(data.OLD_SCHOOL_SUBDISTRICT),
      OLD_SCHOOL_DISTRICT:   _str(data.OLD_SCHOOL_DISTRICT),
      OLD_SCHOOL_PROVINCE:   _str(data.OLD_SCHOOL_PROVINCE),
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
    'OLD_SCHOOL','OLD_SCHOOL_SUBDISTRICT','OLD_SCHOOL_DISTRICT','OLD_SCHOOL_PROVINCE',
    'OLD_LEVEL','GPA','SPECIAL_ABILITY',
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
    'PHONE','WEIGHT_KG','HEIGHT_CM','SIBLINGS_MALE','SIBLINGS_FEMALE','STUDYING_COUNT',
    'DISABILITY','DISEASE','HEALTH_NOTE',
    'FATHER_PREFIX','FATHER_FNAME','FATHER_LNAME',
    'FATHER_PHONE','FATHER_OCCUPATION','FATHER_INCOME',
    'MOTHER_PREFIX','MOTHER_FNAME','MOTHER_LNAME',
    'MOTHER_PHONE','MOTHER_OCCUPATION','MOTHER_INCOME',
    'GUARDIAN_NAME','GUARDIAN_PHONE',
    'OLD_SCHOOL','OLD_SCHOOL_SUBDISTRICT','OLD_SCHOOL_DISTRICT','OLD_SCHOOL_PROVINCE',
    'OLD_LEVEL','GPA','SPECIAL_ABILITY',
    'STUDY_PLAN','STUDY_PLAN_ALT'
  ];

  const safeUpdates = {};
  ALLOWED_FIELDS.forEach(function(k) {
    if (updates[k] !== undefined && updates[k] !== null) {
      const numericFields = ['FATHER_INCOME','MOTHER_INCOME','GPA','WEIGHT_KG','HEIGHT_CM','SIBLINGS_MALE','SIBLINGS_FEMALE','STUDYING_COUNT'];
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
const _PUB_STATS_CACHE = 'pub_stats_v1';

function getPublicStats() {
  const cached = _CACHE.get(_PUB_STATS_CACHE);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }

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

  const result = {
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
    serviceZones:   String(cfg.SERVICE_AREA_ZONES||'').split('\n').map(s=>s.trim()).filter(Boolean),
  };

  _CACHE.put(_PUB_STATS_CACHE, JSON.stringify(result), 60);
  return result;
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
  // ใช้ที่อยู่โรงเรียนเดิม (SERVICE_AREA_ZONES) ถ้ากำหนดไว้
  // fallback: ชื่อโรงเรียน (SERVICE_AREA_SCHOOLS) ถ้าไม่มี ZONES
  var hasZoneConfig  = String(cfg.SERVICE_AREA_ZONES||'').trim() !== '';
  const serviceSchools = String(cfg.SERVICE_AREA_SCHOOLS||'')
    .split('\n').map(s=>s.trim()).filter(Boolean);
  var inZone = null;
  if (hasZoneConfig) {
    inZone = apps.filter(function(a){
      return _checkZoneByAddress(
        a.OLD_SCHOOL_SUBDISTRICT, a.OLD_SCHOOL_DISTRICT, a.OLD_SCHOOL_PROVINCE, cfg
      ) === true;
    }).length;
  } else if (serviceSchools.length) {
    inZone = apps.filter(a => serviceSchools.includes(String(a.OLD_SCHOOL||'').trim())).length;
  }

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
      if (hasZoneConfig || serviceSchools.length) {
        var izM1 = hasZoneConfig
          ? _checkZoneByAddress(a.OLD_SCHOOL_SUBDISTRICT, a.OLD_SCHOOL_DISTRICT, a.OLD_SCHOOL_PROVINCE, cfg) === true
          : serviceSchools.includes(String(a.OLD_SCHOOL||'').trim());
        if (izM1) row.m1.ในเขต++; else row.m1.นอกเขต++;
      }
    } else if (a.LEVEL === 'ม.4') {
      row.m4.รวม++;
      if (a.GENDER==='ชาย') row.m4.ชาย++; else if (a.GENDER==='หญิง') row.m4.หญิง++;
      // ม.3 เดิม = OLD_LEVEL มี 'ม.3' AND อยู่ในเขตพื้นที่บริการ
      var isInZoneM4 = hasZoneConfig
        ? _checkZoneByAddress(a.OLD_SCHOOL_SUBDISTRICT, a.OLD_SCHOOL_DISTRICT, a.OLD_SCHOOL_PROVINCE, cfg) === true
        : serviceSchools.includes(String(a.OLD_SCHOOL||'').trim());
      var isM3Old = String(a.OLD_LEVEL||'').includes('ม.3') && isInZoneM4;
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

// ═══════════════════════════════════════════════════════════
// ─── EXAM SYSTEM v1.19.0 ───
// ═══════════════════════════════════════════════════════════

// ─── GET EXAM CONFIG ───
// return: { ok, configs: [{configId, level, studyPlan, subjects:[{name,maxScore,weightPct}], gpaWeightPct, passScore}] }
function getExamConfig(token) {
  _requireAdmin(token);
  const rows = _sheetData(SH.EXAM_CFG);
  // group by configId (level+studyPlan combo)
  const map = {};
  rows.forEach(function(r) {
    if (!r.CONFIG_ID) return;
    const id = String(r.CONFIG_ID);
    if (!map[id]) {
      map[id] = {
        configId:     id,
        level:        r.LEVEL      || '',
        studyPlan:    r.STUDY_PLAN || '',
        gpaWeightPct: parseFloat(r.GPA_WEIGHT_PCT) || 0,
        passScore:    parseFloat(r.PASS_SCORE)     || 60,
        subjects:     []
      };
    }
    if (r.SUBJECT_NAME) {
      map[id].subjects.push({
        name:      r.SUBJECT_NAME,
        maxScore:  parseFloat(r.MAX_SCORE)   || 100,
        weightPct: parseFloat(r.WEIGHT_PCT)  || 0,
      });
    }
  });
  return { ok:true, configs: Object.values(map) };
}

// ─── SAVE EXAM CONFIG ───
// configs: [{level, studyPlan, gpaWeightPct, passScore, subjects:[{name,maxScore,weightPct}]}]
function saveExamConfig(token, configs) {
  const sess = _requireAdmin(token);
  if (!configs || !Array.isArray(configs)) return { ok:false, msg:'ข้อมูลไม่ถูกต้อง' };
  return _withLock(function() {
    const sh = _sheet(SH.EXAM_CFG);
    sh.clearContents();
    sh.appendRow(['CONFIG_ID','LEVEL','STUDY_PLAN','SUBJECT_NAME','MAX_SCORE','WEIGHT_PCT','GPA_WEIGHT_PCT','PASS_SCORE','CREATED_AT']);
    sh.getRange(1,1,1,9).setFontWeight('bold').setBackground('#fef9c3');
    const now = new Date();
    configs.forEach(function(cfg) {
      const cfgId = (cfg.level||'ALL') + '_' + (cfg.studyPlan||'ALL').replace(/\s/g,'_');
      (cfg.subjects||[]).forEach(function(s) {
        sh.appendRow([cfgId, cfg.level||'', cfg.studyPlan||'', s.name||'',
          parseFloat(s.maxScore)||100, parseFloat(s.weightPct)||0,
          parseFloat(cfg.gpaWeightPct)||0, parseFloat(cfg.passScore)||60, now]);
      });
      // ถ้าไม่มีวิชา ให้บันทึกแถว placeholder
      if (!(cfg.subjects||[]).length) {
        sh.appendRow([cfgId, cfg.level||'', cfg.studyPlan||'', '',
          0, 0, parseFloat(cfg.gpaWeightPct)||0, parseFloat(cfg.passScore)||60, now]);
      }
    });
    _logWithRole(sess.name, sess.role, 'SAVE_EXAM_CFG', configs.length + ' configs');
    return { ok:true };
  });
}

// ─── GET EXAM SCORES ───
function getExamScores(token, level, studyPlan) {
  _requireAdmin(token);
  let rows = _sheetData(SH.EXAM_SCR);
  if (level)     rows = rows.filter(function(r){ return r.LEVEL===level; });
  if (studyPlan) rows = rows.filter(function(r){ return r.STUDY_PLAN===studyPlan; });
  // join กับ applications
  const apps = _sheetData(SH.APP);
  const appMap = {};
  apps.forEach(function(a){ appMap[a.APP_ID] = a; });
  // group by APP_ID
  const scoreMap = {};
  rows.forEach(function(r) {
    if (!r.APP_ID) return;
    if (!scoreMap[r.APP_ID]) scoreMap[r.APP_ID] = { appId:r.APP_ID, subjects:{} };
    scoreMap[r.APP_ID].subjects[r.SUBJECT_NAME] = parseFloat(r.SCORE)||0;
  });
  return { ok:true, data: scoreMap, appMap: appMap };
}

// ─── SAVE EXAM SCORES (batch) ───
// scores: [{appId, subjectName, score}]
function saveExamScores(token, scores) {
  const sess = _requireAdmin(token);
  if (!scores || !Array.isArray(scores)) return { ok:false, msg:'ข้อมูลไม่ถูกต้อง' };
  return _withLock(function() {
    const sh   = _sheet(SH.EXAM_SCR);
    const last = sh.getLastRow();
    const now  = new Date();
    // อ่านข้อมูลเดิม
    const existing = last >= 2 ? sh.getRange(2,1,last-1,8).getValues() : [];
    const hdrs = ['APP_ID','LEVEL','STUDY_PLAN','CONFIG_ID','SUBJECT_NAME','SCORE','MAX_SCORE','UPDATED_AT'];
    // สร้าง map key = APP_ID+|+SUBJECT
    const keyMap = {};
    existing.forEach(function(row, i) { if(row[0]) keyMap[String(row[0])+'|'+String(row[4])] = i+2; });
    // apps lookup
    const apps = _sheetData(SH.APP);
    const appMap = {};
    apps.forEach(function(a){ appMap[a.APP_ID]=a; });
    let updated=0, added=0;
    scores.forEach(function(s) {
      const app = appMap[s.appId];
      const key = String(s.appId)+'|'+String(s.subjectName);
      const cfgId = (app?app.LEVEL:'') + '_' + ((app&&app.STUDY_PLAN)||'ALL').replace(/\s/g,'_');
      const row = [s.appId, app?app.LEVEL:'', app?app.STUDY_PLAN:'', cfgId,
                   s.subjectName, parseFloat(s.score)||0, parseFloat(s.maxScore)||100, now];
      if (keyMap[key]) { sh.getRange(keyMap[key],1,1,8).setValues([row]); updated++; }
      else { sh.appendRow(row); added++; }
    });
    _logWithRole(sess.name,sess.role,'SAVE_SCORES','updated:'+updated+' added:'+added);
    return { ok:true, updated:updated, added:added };
  });
}

// ─── CALCULATE RESULTS ───
// คำนวณผลสำหรับผู้สมัครทั้งหมด (หรือ level/plan ที่กำหนด)
// สูตร: totalScore = (GPA/4*100)*gpaWeight + Σ(subjectScore/maxScore*100)*subjectWeight
// ทุก weight รวมกันต้องเท่ากับ 100%
function calculateResults(token, level, studyPlan) {
  const sess = _requireAdmin(token);
  const cfgRes = getExamConfig(token);
  if (!cfgRes.ok) return cfgRes;

  const apps    = _sheetData(SH.APP);
  const scores  = _sheetData(SH.EXAM_SCR);
  const cfg     = getSettings();

  // build score map: appId → { subjectName: score }
  const scoreMap = {};
  scores.forEach(function(r) {
    if (!r.APP_ID) return;
    if (!scoreMap[r.APP_ID]) scoreMap[r.APP_ID] = {};
    scoreMap[r.APP_ID][String(r.SUBJECT_NAME)] = { score: parseFloat(r.SCORE)||0, maxScore: parseFloat(r.MAX_SCORE)||100 };
  });

  const results = [];
  const updates = [];

  apps.forEach(function(a) {
    if (level     && a.LEVEL      !== level)     return;
    if (studyPlan && a.STUDY_PLAN !== studyPlan) return;
    if (a.STATUS === 'รายงานตัวแล้ว') return; // ล็อคแล้ว

    // หา config ที่ตรงกับ level+studyPlan
    var examCfg = cfgRes.configs.find(function(c) {
      return c.level === a.LEVEL && c.studyPlan === a.STUDY_PLAN;
    });
    // fallback: level เดียว ไม่สน plan
    if (!examCfg) examCfg = cfgRes.configs.find(function(c) {
      return c.level === a.LEVEL && !c.studyPlan;
    });
    if (!examCfg) return; // ไม่มี config → ข้าม

    const gpaW   = parseFloat(examCfg.gpaWeightPct) || 0;
    const passS  = parseFloat(examCfg.passScore)    || 60;
    const subMap = scoreMap[a.APP_ID] || {};

    // คิด GPA component: GPA 0–4 scale → 0–100
    const gpaScore = Math.min(100, (parseFloat(a.GPA)||0) / 4 * 100);
    let totalScore = gpaScore * (gpaW / 100);
    let totalSubW  = 0;
    const subDetail = [];

    examCfg.subjects.forEach(function(sub) {
      const w   = parseFloat(sub.weightPct) || 0;
      const sm  = subMap[sub.name];
      const s   = sm ? sm.score   : null;
      const mx  = sm ? sm.maxScore : sub.maxScore;
      const pct = (s !== null && mx > 0) ? (s / mx * 100) : null;
      totalSubW += w;
      if (pct !== null) totalScore += pct * (w / 100);
      subDetail.push({ name:sub.name, score:s, maxScore:mx, pct:pct!==null?Math.round(pct*10)/10:null, weight:w });
    });

    // normalize ถ้า weight ไม่ครบ 100
    const allW = gpaW + totalSubW;
    if (allW > 0 && allW !== 100) totalScore = totalScore * (100 / allW);
    totalScore = Math.round(totalScore * 10) / 10;

    const passed = totalScore >= passS;
    results.push({
      appId:      a.APP_ID,
      name:       (a.PREFIX||'')+' '+a.FNAME+' '+a.LNAME,
      level:      a.LEVEL,
      studyPlan:  a.STUDY_PLAN||'',
      gpa:        parseFloat(a.GPA)||0,
      gpaScore:   Math.round(gpaScore*10)/10,
      gpaWeight:  gpaW,
      subjects:   subDetail,
      totalScore: totalScore,
      passScore:  passS,
      passed:     passed,
      currentStatus: a.STATUS
    });

    // อัปเดต STATUS ถ้าผ่าน/ไม่ผ่าน
    if (a.STATUS === 'มีสิทธิ์สอบ') {
      updates.push({ appId: a.APP_ID, newStatus: passed ? 'ผ่าน' : 'ไม่ผ่าน', score: totalScore });
    }
  });

  // batch update STATUS + SCORE
  if (updates.length) {
    return _withLock(function() {
      updates.forEach(function(u) {
        _updateRow(SH.APP, 'APP_ID', u.appId, {
          STATUS:     u.newStatus,
          SCORE:      u.totalScore,
          UPDATED_AT: new Date()
        });
        // Supabase sync
        try { _supaPatch('applications', u.appId, { status:u.newStatus, score:String(u.totalScore), updated_at:new Date().toISOString() }); } catch(e){}
      });
      _logWithRole(sess.name,sess.role,'CALCULATE_RESULTS',
        (level||'all')+' '+updates.length+' updated');
      return { ok:true, results:results, updated:updates.length };
    });
  }
  return { ok:true, results:results, updated:0 };
}

// ─── EXPORT SCORE SHEET (สร้าง Google Sheet แชร์ครู) ───
function exportScoreSheetUrl(token, level, studyPlan) {
  const sess = _requireAdmin(token);
  const cfgRes = getExamConfig(token);
  if (!cfgRes.ok || !cfgRes.configs.length) return { ok:false, msg:'ยังไม่มีการตั้งค่าวิชาสอบ กรุณาตั้งค่าก่อน' };

  // หา config
  var examCfg = cfgRes.configs.find(function(c){ return c.level===level && c.studyPlan===studyPlan; });
  if (!examCfg) examCfg = cfgRes.configs.find(function(c){ return c.level===level; });
  if (!examCfg) return { ok:false, msg:'ไม่พบการตั้งค่าวิชาสำหรับ '+level+(studyPlan?' แผน'+studyPlan:'') };

  const cfg    = getSettings();
  const school = cfg.SCHOOL_FULLNAME || 'โรงเรียน';
  const year   = cfg.ACADEMIC_YEAR   || '';
  const tz     = Session.getScriptTimeZone();
  const dateStr= Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');

  // ผู้สมัครที่มีสิทธิ์สอบ
  let apps = _sheetData(SH.APP).filter(function(a){
    return a.LEVEL === level && a.STATUS === 'มีสิทธิ์สอบ';
  });
  if (studyPlan) apps = apps.filter(function(a){ return a.STUDY_PLAN === studyPlan; });
  apps.sort(function(a,b){ return String(a.EXAM_NO||'').localeCompare(String(b.EXAM_NO||''),'th'); });

  // สร้าง Spreadsheet ใหม่
  const title  = 'คะแนนสอบ_'+school+'_'+year+'_'+(level||'')+(studyPlan?'_'+studyPlan.replace(/\s/g,''):'')+'_'+dateStr;
  const ss     = SpreadsheetApp.create(title);
  const sheet  = ss.getActiveSheet();
  sheet.setName('คะแนนสอบ');

  // หัวตาราง row 1: ชื่อเอกสาร
  sheet.getRange(1,1).setValue(
    'บันทึกคะแนนสอบ '+school+' ปีการศึกษา '+year+' ระดับ'+level+(studyPlan?' แผน'+studyPlan:'')
  ).setFontSize(13).setFontWeight('bold');
  sheet.getRange(1,1,1,8+examCfg.subjects.length).merge().setBackground('#1e3a8a').setFontColor('#ffffff');

  // หัวตาราง row 2: คำอธิบายสัดส่วน
  const subHeaders = examCfg.subjects.map(function(s){ return s.name+'\n(เต็ม '+s.maxScore+', '+s.weightPct+'%)'; });
  sheet.getRange(2,1).setValue('เผยแพร่เมื่อ: '+dateStr+'  |  GPA weight: '+examCfg.gpaWeightPct+'%  |  เกณฑ์ผ่าน: '+examCfg.passScore+'%');
  sheet.getRange(2,1,1,8+subHeaders.length).merge().setBackground('#374151').setFontColor('#e5e7eb').setFontSize(10);

  // หัวคอลัมน์ row 3
  const hdr = ['เลขนั่งสอบ','เลขที่ใบสมัคร','ชื่อ-นามสกุล','แผนการเรียน','โรงเรียนเดิม','GPA','ห้องสอบ','สถานะ']
    .concat(subHeaders);
  const hdrRange = sheet.getRange(3,1,1,hdr.length);
  hdrRange.setValues([hdr]);
  hdrRange.setBackground('#1e40af').setFontColor('#fff').setFontWeight('bold')
          .setWrap(true).setVerticalAlignment('middle');
  sheet.setRowHeight(3, 48);

  // ข้อมูลผู้สมัคร row 4 เป็นต้นไป
  if (apps.length) {
    const dataRows = apps.map(function(a) {
      const base = [a.EXAM_NO||'', a.APP_ID, (a.PREFIX||'')+' '+a.FNAME+' '+a.LNAME,
                    a.STUDY_PLAN||'', a.OLD_SCHOOL||'', a.GPA||'', a.EXAM_ROOM||'', a.STATUS||''];
      const scores = examCfg.subjects.map(function(){ return ''; }); // blank for teachers
      return base.concat(scores);
    });
    sheet.getRange(4,1,dataRows.length,hdr.length).setValues(dataRows);

    // format: score columns → number + highlight
    const scoreColStart = 9;
    examCfg.subjects.forEach(function(s, i) {
      const col = scoreColStart + i;
      const rng = sheet.getRange(4, col, apps.length, 1);
      rng.setNumberFormat('0.##').setHorizontalAlignment('center')
         .setBackground('#fefce8').setBorder(true,true,true,true,false,false,'#d1d5db',SpreadsheetApp.BorderStyle.SOLID);
      // data validation: 0 - maxScore
      const rule = SpreadsheetApp.newDataValidation()
        .requireNumberBetween(0, parseFloat(s.maxScore)||100)
        .setAllowInvalid(false)
        .setHelpText('กรอกคะแนน 0–'+s.maxScore)
        .build();
      rng.setDataValidation(rule);
    });

    // freeze + format base columns
    sheet.getRange(4,1,apps.length,8).setBackground('#f9fafb');
    sheet.setFrozenRows(3); sheet.setFrozenColumns(3);
    sheet.setColumnWidth(3, 160); sheet.setColumnWidth(5, 140);
    sheet.autoResizeColumns(1,2); sheet.autoResizeColumns(4,4);
  }

  // share: anyone with link can edit (ครูทั่วไปแก้ไขได้)
  DriveApp.getFileById(ss.getId())
    .setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);

  // บันทึก Sheet URL ใน Settings
  const sheetUrl = ss.getUrl();
  try {
    const settingsSh = _sheet(SH.SETTINGS);
    const vals = settingsSh.getRange(1,1,settingsSh.getLastRow(),2).getValues();
    const key  = 'EXAM_SCORE_SHEET_URL_'+(level||'').replace(/\./g,'')+(studyPlan||'').replace(/\s/g,'_');
    const idx  = vals.findIndex(function(r){ return String(r[0]).trim()===key; });
    if (idx >= 0) settingsSh.getRange(idx+1,2).setValue(sheetUrl);
    else settingsSh.appendRow([key, sheetUrl]);
    _CACHE.remove(_CFG_CACHE);
  } catch(e){ Logger.log('save url failed: '+e); }

  _logWithRole(sess.name,sess.role,'EXPORT_SCORE_SHEET',
    (level||'')+' '+(studyPlan||'')+' '+apps.length+' คน → '+sheetUrl);
  return { ok:true, url:sheetUrl, count:apps.length, title:title };
}

// ─── IMPORT SCORE SHEET (ดึงคะแนนกลับ) ───
function importScoreSheet(token, sheetUrl, level, studyPlan) {
  const sess = _requireAdmin(token);
  if (!sheetUrl) return { ok:false, msg:'กรุณาระบุ URL ของ Google Sheet' };

  const cfgRes = getExamConfig(token);
  var examCfg = cfgRes.configs.find(function(c){ return c.level===level && c.studyPlan===studyPlan; });
  if (!examCfg) examCfg = cfgRes.configs.find(function(c){ return c.level===level; });
  if (!examCfg) return { ok:false, msg:'ไม่พบการตั้งค่าวิชาสำหรับ '+level };

  // เปิด Spreadsheet จาก URL
  var ss;
  try {
    const m  = sheetUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!m) return { ok:false, msg:'URL ไม่ถูกต้อง' };
    ss = SpreadsheetApp.openById(m[1]);
  } catch(e) {
    return { ok:false, msg:'ไม่สามารถเปิด Google Sheet ได้: '+e };
  }

  const sheet = ss.getSheetByName('คะแนนสอบ') || ss.getActiveSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 4) return { ok:false, msg:'ไม่พบข้อมูลในชีต' };

  const vals = sheet.getRange(3,1,lastRow-2,8+examCfg.subjects.length).getValues();
  const hdrRow  = vals[0];
  const dataRows= vals.slice(1);

  // map header → column index
  const subColMap = {};
  examCfg.subjects.forEach(function(s) {
    const idx = hdrRow.findIndex(function(h){ return String(h).startsWith(s.name); });
    if (idx >= 0) subColMap[s.name] = idx;
  });

  const scoresBatch = [];
  let imported = 0;
  dataRows.forEach(function(row) {
    const appId = String(row[1]||'').trim();
    if (!appId) return;
    examCfg.subjects.forEach(function(s) {
      const ci = subColMap[s.name];
      if (ci === undefined) return;
      const v = row[ci];
      if (v === '' || v === null || v === undefined) return;
      const score = parseFloat(v);
      if (isNaN(score)) return;
      scoresBatch.push({ appId:appId, subjectName:s.name, score:score, maxScore:s.maxScore });
      imported++;
    });
  });

  if (!scoresBatch.length) return { ok:false, msg:'ไม่พบคะแนนในชีต (ครูอาจยังไม่ได้กรอก)' };

  const saveRes = saveExamScores(token, scoresBatch);
  if (!saveRes.ok) return saveRes;

  _logWithRole(sess.name,sess.role,'IMPORT_SCORES',
    (level||'')+' '+(studyPlan||'')+' '+imported+' scores imported');
  return { ok:true, imported:imported, msg:'นำเข้าคะแนนสำเร็จ '+imported+' รายการ' };
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
  const safeRole = ['ADMIN','STAFF'].includes(String(role||'').toUpperCase())
    ? String(role).toUpperCase() : 'STAFF';
  return _withLock(() => {
    const existing = _sheetData(SH.USERS);
    if (existing.find(u => String(u.USERNAME).trim()===String(username).trim()))
      return { ok:false, msg:'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
    _sheet(SH.USERS).appendRow([username.trim(),password,name.trim(),safeRole,'']);
    _logWithRole(sess.name,sess.role,'ADD_USER',username+' (role:'+safeRole+')');
    return { ok:true };
  });
}


function updateAdminUser(token, username, name, role) {
  const sess = _requirePerm(token, 'USERS');
  if (!username || !name) return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบ' };
  const safeRole = ['ADMIN','STAFF'].includes(String(role||'').toUpperCase())
    ? String(role).toUpperCase() : 'STAFF';
  if (String(username).trim() === 'admin' && safeRole !== 'ADMIN') {
    return { ok:false, msg:'ไม่สามารถลดสิทธิ์ผู้ใช้ admin ได้' };
  }
  return _withLock(() => {
    const users = _sheetData(SH.USERS);
    if (!users.find(x => String(x.USERNAME).trim() === String(username).trim())) {
      return { ok:false, msg:'ไม่พบผู้ใช้' };
    }
    _updateRow(SH.USERS,'USERNAME',username,{NAME:name.trim(), ROLE:safeRole});
    _logWithRole(sess.name,sess.role,'UPDATE_USER',username+' (role:'+safeRole+')');
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

function _driveImageUrls(fileId) {
  const id = String(fileId || '').trim();
  return {
    viewUrl: 'https://drive.google.com/uc?export=view&id=' + id,
    thumbUrl: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id
  };
}

// ─── UPLOAD PHOTO ───
function uploadPhoto(base64Data, appId) {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      return { ok:false, msg:'ไม่ได้รับข้อมูลรูปภาพผู้สมัคร' };
    }
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const type = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const rawExt = type.split('/')[1] || 'jpg';
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const raw = base64Data.replace(/^data:[^;]+;base64,/, '');
    if (!raw) return { ok:false, msg:'ข้อมูล base64 ว่างเปล่า' };

    const bytes  = Utilities.base64Decode(raw);
    const blob   = Utilities.newBlob(bytes, type, 'photo_' + appId + '.' + ext);
    const folder = _getPhotoFolder();
    const file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const urls = _driveImageUrls(file.getId());
    return {
      ok:true,
      url: urls.viewUrl,
      thumbUrl: urls.thumbUrl,
      downloadUrl: urls.downloadUrl,
      id: file.getId(),
      folderUrl: 'https://drive.google.com/drive/folders/' + folder.getId()
    };
  } catch(e) {
    Logger.log('uploadPhoto error: ' + e);
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
  if (!base64Data || typeof base64Data !== 'string')
    return { ok:false, msg:'ไม่ได้รับข้อมูลรูปภาพ' };

  try {
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const type = mimeMatch ? mimeMatch[1] : 'image/png';
    const rawExt = type.split('/')[1] || 'png';
    const ext    = rawExt === 'jpeg' ? 'jpg' : rawExt.replace(/[^a-z0-9]/g,'') || 'png';
    const raw    = base64Data.replace(/^data:[^;]+;base64,/, '');
    if (!raw) return { ok:false, msg:'ข้อมูล base64 ว่างเปล่า' };

    const bytes  = Utilities.base64Decode(raw);
    const blob   = Utilities.newBlob(bytes, type, 'logo_school.' + ext);

    let folder;
    try {
      folder = _getPhotoFolder();
    } catch(fe) {
      Logger.log('_getPhotoFolder failed: ' + fe);
      folder = DriveApp.getRootFolder();
    }

    ['png','jpg','jpeg','gif','webp'].forEach(function(e) {
      const iter = folder.getFilesByName('logo_school.' + e);
      while (iter.hasNext()) iter.next().setTrashed(true);
    });

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const urls = _driveImageUrls(fileId);
    const url = urls.viewUrl;

    updateSettings(token, { LOGO_URL: url });
    _logWithRole('ADMIN', 'ADMIN', 'UPLOAD_LOGO', 'fileId:' + fileId);
    return { ok:true, url: url, thumbUrl: urls.thumbUrl, downloadUrl: urls.downloadUrl, fileId: fileId };

  } catch(e) {
    Logger.log('uploadLogo error: ' + e);
    return { ok:false, msg: 'Upload ไม่สำเร็จ: ' + String(e) };
  }
}


// ─── EXPORT APPLICATIONS (admin) ───
// filters: { level, studyPlan, status, appType }
function exportApplications(token, filters) {
  _requireAdmin(token);
  filters = filters || {};
  const cfg  = getSettings();
  let apps = _sheetData(SH.APP);

  // กรอง
  if (filters.level)     apps = apps.filter(a => a.LEVEL     === filters.level);
  if (filters.studyPlan) apps = apps.filter(a => a.STUDY_PLAN === filters.studyPlan);
  if (filters.status)    apps = apps.filter(a => a.STATUS     === filters.status);
  if (filters.appType)   apps = apps.filter(a => a.APP_TYPE   === filters.appType);

  // เรียงตาม APP_ID (ลำดับการสมัคร)
  apps.sort(function(a, b) {
    return String(a.APP_ID||'').localeCompare(String(b.APP_ID||''), 'th');
  });

  // columns สำหรับ Excel export (ภาษาไทย)
  const EXPORT_COLS = [
    { key:'APP_ID',        label:'เลขที่ใบสมัคร' },
    { key:'EXAM_NO',       label:'เลขที่นั่งสอบ' },
    { key:'EXAM_ROOM',     label:'ห้องสอบ' },
    { key:'LEVEL',         label:'ระดับชั้น' },
    { key:'APP_TYPE',      label:'ประเภท' },
    { key:'PREFIX',        label:'คำนำหน้า' },
    { key:'FNAME',         label:'ชื่อ' },
    { key:'LNAME',         label:'นามสกุล' },
    { key:'GENDER',        label:'เพศ' },
    { key:'ID_CARD',       label:'เลขบัตรประชาชน' },
    { key:'BIRTHDATE',     label:'วันเกิด' },
    { key:'NATIONALITY',   label:'สัญชาติ' },
    { key:'RELIGION',      label:'ศาสนา' },
    { key:'PHONE',         label:'โทรศัพท์' },
    { key:'ADDRESS',       label:'ที่อยู่' },
    { key:'SUBDISTRICT',   label:'ตำบล' },
    { key:'DISTRICT',      label:'อำเภอ' },
    { key:'PROVINCE',      label:'จังหวัด' },
    { key:'ZIP',           label:'รหัสไปรษณีย์' },
    { key:'STUDY_PLAN',    label:'แผนการเรียน' },
    { key:'STUDY_PLAN_ALT',label:'แผนการเรียนสำรอง' },
    { key:'OLD_SCHOOL',             label:'โรงเรียนเดิม' },
    { key:'OLD_SCHOOL_SUBDISTRICT', label:'ตำบลที่ตั้งโรงเรียนเดิม' },
    { key:'OLD_SCHOOL_DISTRICT',    label:'อำเภอที่ตั้งโรงเรียนเดิม' },
    { key:'OLD_SCHOOL_PROVINCE',    label:'จังหวัดที่ตั้งโรงเรียนเดิม' },
    { key:'OLD_LEVEL',     label:'ชั้นที่จบ' },
    { key:'GPA',           label:'GPA' },
    { key:'SPECIAL_ABILITY',label:'ความสามารถพิเศษ' },
    { key:'FATHER_FNAME',  label:'ชื่อบิดา' },
    { key:'FATHER_LNAME',  label:'นามสกุลบิดา' },
    { key:'FATHER_PHONE',  label:'โทรบิดา' },
    { key:'MOTHER_FNAME',  label:'ชื่อมารดา' },
    { key:'MOTHER_LNAME',  label:'นามสกุลมารดา' },
    { key:'MOTHER_PHONE',  label:'โทรมารดา' },
    { key:'GUARDIAN_NAME', label:'ชื่อผู้ปกครอง' },
    { key:'GUARDIAN_PHONE',label:'โทรผู้ปกครอง' },
    { key:'STATUS',        label:'สถานะ' },
    { key:'SCORE',         label:'คะแนนสอบ' },
    { key:'CREATED_AT',    label:'วันที่สมัคร' },
  ];

  // columns สำหรับ PDF ใบลงชื่อ (ย่อ)
  const LIST_COLS = [
    { key:'APP_ID',    label:'เลขที่ใบสมัคร' },
    { key:'EXAM_NO',   label:'เลขนั่งสอบ' },
    { key:'EXAM_ROOM', label:'ห้องสอบ' },
    { key:'PREFIX',    label:'คำนำหน้า' },
    { key:'FNAME',     label:'ชื่อ' },
    { key:'LNAME',     label:'นามสกุล' },
    { key:'GENDER',    label:'เพศ' },
    { key:'OLD_SCHOOL',label:'โรงเรียนเดิม' },
    { key:'GPA',       label:'GPA' },
    { key:'STUDY_PLAN',label:'แผนการเรียน' },
    { key:'STATUS',    label:'สถานะ' },
  ];

  return {
    ok:       true,
    data:     apps,
    total:    apps.length,
    exportCols: EXPORT_COLS,
    listCols:   LIST_COLS,
    cols:     APP_COLS,          // backward compat
    meta: {
      school:    cfg.SCHOOL_FULLNAME || '',
      year:      cfg.ACADEMIC_YEAR   || '',
      level:     filters.level     || '',
      studyPlan: filters.studyPlan || '',
      status:    filters.status    || '',
      appType:   filters.appType   || '',
    }
  };
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

/* ─────────────────────────────────────────────────────────────
   ENROLLMENT PDF DIRECT DOWNLOAD
   ออก PDF ใบสมัคร/ใบมอบตัวโดยตรง (1 คลิก)
   เงื่อนไข: สถานะต้องเป็น "ผ่าน" หรือ "รายงานตัวแล้ว"
   ───────────────────────────────────────────────────────────── */
function generateEnrollmentPdf(appId) {
  try {
    appId = String(appId || '').trim();
    if (!appId) return { ok:false, msg:'ไม่พบเลขที่ใบสมัคร' };

    var app = _sheetData(SH.APP).find(function(r){ return String(r.APP_ID||'') === appId; });
    if (!app) return { ok:false, msg:'ไม่พบข้อมูลใบสมัคร' };
    const APPROVED_STATUSES = ['ผ่าน', 'รายงานตัวแล้ว'];
    if (!APPROVED_STATUSES.includes(String(app.STATUS || ''))) {
      return { ok:false, msg:'สามารถดาวน์โหลดใบสมัครได้เมื่อสถานะเป็น "ผ่าน" หรือ "รายงานตัวแล้ว" เท่านั้น' };
    }

    var cfg  = getSettings();
    var html = _buildEnrollmentPdfHtml(app, cfg);
    var blob = HtmlService.createHtmlOutput(html).getBlob().getAs(MimeType.PDF);
    var safeName = ('ใบสมัคร-ใบมอบตัว_' + (app.APP_ID || 'APP') + '_' + [app.PREFIX, app.FNAME, app.LNAME].filter(Boolean).join('')).replace(/[\\\/:*?"<>|]/g,'').trim();
    blob.setName(safeName + '.pdf');

    return {
      ok:true,
      filename: blob.getName(),
      mime: 'application/pdf',
      base64: Utilities.base64Encode(blob.getBytes())
    };
  } catch (e) {
    return { ok:false, msg: e && e.message ? e.message : String(e) };
  }
}

function _buildEnrollmentPdfHtml(a, cfg) {
  var school    = _pdfSafe(cfg.SCHOOL_FULLNAME || 'โรงเรียนหนองนาคำวิทยาคม');
  var schoolSub = _pdfSafe(cfg.SCHOOL_SUBDISTRICT || '');
  var schoolDis = _pdfSafe(cfg.SCHOOL_DISTRICT || '');
  var schoolPrv = _pdfSafe(cfg.SCHOOL_PROVINCE || '');
  var schoolTel = _pdfSafe(cfg.SCHOOL_PHONE || '');
  var yr        = _pdfSafe(cfg.ACADEMIC_YEAR || '2568');
  var logoUrl   = _pdfSafe(cfg.LOGO_URL || '');

  var _v = function(v){ return (v !== null && v !== undefined && String(v).trim() !== '') ? _pdfSafe(String(v).trim()) : '–'; };
  var _vb= function(v){ return (v !== null && v !== undefined && String(v).trim() !== '') ? _pdfSafe(String(v).trim()) : ''; };
  var _name = function(pfx, fn, ln){ return _v([pfx, fn, ln].filter(Boolean).join(' ')); };
  var _addr = function(addr, sub, dis, prv, zip){
    var bits = [];
    if (addr) bits.push(addr);
    if (sub) bits.push('ต.' + sub);
    if (dis) bits.push('อ.' + dis);
    if (prv) bits.push('จ.' + prv);
    if (zip) bits.push(zip);
    return _v(bits.join(' '));
  };
  var _currAddr = function(same, addr, sub, dis, prv, zip){
    return String(same) === 'true' ? '(ใช้ที่อยู่เดียวกับทะเบียนบ้าน)' : _addr(addr, sub, dis, prv, zip);
  };
  var idFormat = function(id){
    var s = String(id || '').replace(/\D/g, '');
    if (s.length !== 13) return _v(id);
    return _pdfSafe(s[0] + '-' + s.slice(1,5) + '-' + s.slice(5,10) + '-' + s.slice(10,12) + '-' + s[12]);
  };
  var inc = function(v){ return (v && String(v) !== '0') ? Number(v).toLocaleString() + ' บาท/เดือน' : '–'; };
  var num = function(v){ return (v !== null && v !== undefined && String(v).trim() !== '') ? _pdfSafe(String(v).trim()) : '–'; };
  var fullName    = _name(a.PREFIX, a.FNAME, a.LNAME);
  var fatherName  = _name(a.FATHER_PREFIX, a.FATHER_FNAME, a.FATHER_LNAME);
  var motherName  = _name(a.MOTHER_PREFIX, a.MOTHER_FNAME, a.MOTHER_LNAME);
  var photoUrl    = _vb(a.PHOTO_URL);
  var guardianType= _vb(a.GUARDIAN_TYPE);
  var gName = '–', gRel = '–', gPhone = '–';
  if (guardianType === 'บิดา') {
    gName = fatherName; gRel = 'บิดา'; gPhone = _v(a.FATHER_PHONE);
  } else if (guardianType === 'มารดา') {
    gName = motherName; gRel = 'มารดา'; gPhone = _v(a.MOTHER_PHONE);
  } else {
    gName = _v(a.GUARDIAN_NAME); gRel = _v(a.GUARDIAN_RELATION); gPhone = _v(a.GUARDIAN_PHONE);
  }
  var healthBits = [
    _vb(a.DISABILITY) ? 'ความพิการ: ' + _v(a.DISABILITY) : '',
    _vb(a.DISEASE) ? 'โรคประจำตัว: ' + _v(a.DISEASE) : '',
    _vb(a.HEALTH_NOTE) ? 'อื่นๆ: ' + _v(a.HEALTH_NOTE) : ''
  ].filter(Boolean).join(' · ');

  var row = function(l, v){
    return '<div class="frow"><div class="flabel">' + _pdfSafe(l) + '</div><div class="fvalue">' + _v(v) + '</div></div>';
  };
  var rowId = function(l, v){
    return '<div class="frow"><div class="flabel">' + _pdfSafe(l) + '</div><div class="fvalue mono">' + idFormat(v) + '</div></div>';
  };
  var row2 = function(l1, v1, l2, v2){
    return '<div class="frow two"><div class="pair"><div class="flabel">' + _pdfSafe(l1) + '</div><div class="fvalue">' + _v(v1) + '</div></div><div class="pair"><div class="flabel">' + _pdfSafe(l2) + '</div><div class="fvalue">' + _v(v2) + '</div></div></div>';
  };
  var logoHtml = logoUrl ? '<img src="' + logoUrl + '" style="width:100%;height:100%;object-fit:contain;display:block">' : '<div class="logo-fallback">🏫</div>';
  var photoHtml = photoUrl ? '<img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;display:block">' : '<div class="photo-placeholder"><div>ติดรูปถ่าย</div><div>นักเรียน 1 นิ้ว</div></div>';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
'*{box-sizing:border-box;margin:0;padding:0} @page{size:A4 portrait;margin:8mm} ' +
'html,body{background:#fff;color:#111;font-family:Arial,Tahoma,sans-serif;font-size:10.6pt;line-height:1.26;-webkit-print-color-adjust:exact;print-color-adjust:exact} ' +
'.sheet{width:100%;min-height:auto;background:#fff;padding:0;position:relative} ' +
'.sheet::after{content:"' + _v(a.APP_ID) + '";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:54pt;font-weight:700;color:rgba(26,58,107,.035);transform:rotate(-30deg);pointer-events:none} ' +
'.header{display:grid;grid-template-columns:20mm 1fr 30mm;gap:6mm;align-items:start;border-bottom:1.6pt solid #163a6b;padding-bottom:4mm} ' +
'.logo{width:20mm;height:20mm;display:flex;align-items:center;justify-content:center}.logo-fallback{width:20mm;height:20mm;border:1pt solid #b6c2d3;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16pt;background:#f5f8fc}.head-main{text-align:center}.doc-code{font-size:8.3pt;color:#555;letter-spacing:.3px;margin-bottom:1mm}.doc-title{font-size:15pt;font-weight:700;color:#163a6b;line-height:1.2}.doc-sub{font-size:10pt;margin-top:1mm}.school-line{font-size:10.5pt;font-weight:700;margin-top:1mm}.school-meta{font-size:8.8pt;color:#555;margin-top:1mm}.photo{width:30mm;height:38mm;border:1pt solid #888;overflow:hidden;background:#fafafa}.photo-placeholder{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#777;font-size:8pt;text-align:center;padding:4px} ' +
'.app-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:2mm;margin:3mm 0 3mm;position:relative;z-index:1}.mini{border:1pt solid #c8d3e0;background:#f8fbff;padding:1.8mm 2.2mm}.mini .k{font-size:7.6pt;color:#5b6470}.mini .v{font-size:9.6pt;font-weight:700;color:#163a6b;margin-top:.5mm} ' +
'.grid{display:grid;grid-template-columns:1.08fr .92fr;gap:3mm;position:relative;z-index:1}.section{border:1pt solid #bfcada;margin-bottom:3mm}.section-title{background:#163a6b;color:#fff;padding:1.6mm 2.4mm;font-size:8.8pt;font-weight:700;letter-spacing:.2px}.section-body{padding:1.6mm 2.2mm 1.8mm}.frow{display:grid;grid-template-columns:31mm 1fr;border-bottom:.6pt solid #d6deea;min-height:7mm}.frow:last-child{border-bottom:none}.frow.two{grid-template-columns:1fr 1fr;gap:2mm}.pair{display:grid;grid-template-columns:22mm 1fr}.flabel{background:#f3f6fb;padding:1.4mm 1.8mm;font-size:8.2pt;font-weight:700;color:#314055;display:flex;align-items:center}.fvalue{padding:1.4mm 1.8mm;display:flex;align-items:center;min-height:7mm}.mono{font-family:"Courier New",monospace;letter-spacing:.5px} ' +
'.sub-title{font-size:8.8pt;font-weight:700;color:#163a6b;margin:1mm 0}.sub-gap{margin-top:2mm}.band{border:1pt solid #bfcada;padding:1.8mm 2.4mm;margin-bottom:3mm;position:relative;z-index:1}.band-title{font-size:8.8pt;font-weight:700;color:#163a6b;margin-bottom:1mm}.band-text{font-size:8.7pt;line-height:1.35}.check-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.4mm 8mm;margin-top:1mm}.check-item{font-size:8.2pt;display:flex;align-items:flex-start;gap:6px}.checkbox{width:10px;height:10px;border:1px solid #555;display:inline-block;flex:0 0 auto;margin-top:2px}. ' +
'.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:2.5mm;position:relative;z-index:1}.sig{border:1pt solid #c3ccd8;min-height:23mm;padding:2mm;text-align:center}.sig-title{font-size:8.2pt;font-weight:700;color:#163a6b}.sig-line{border-top:.8pt dotted #666;margin:12mm 2mm 1.2mm}.sig-name{font-size:8.2pt;min-height:4mm}.sig-date{font-size:7.6pt;color:#666}.footer-box{border:1.2pt solid #163a6b;margin-top:3mm;position:relative;z-index:1}.footer-title{background:#163a6b;color:#fff;padding:1.6mm 2.4mm;font-size:8.6pt;font-weight:700}.footer-grid{display:grid;grid-template-columns:repeat(4,1fr)}.footer-cell{padding:2mm 2.2mm;border-right:.8pt solid #d6deea;min-height:13mm}.footer-cell:last-child{border-right:none}.footer-k{font-size:7.5pt;color:#666}.footer-v{font-size:8.4pt;font-weight:600;margin-top:1mm;border-bottom:.7pt dotted #999;min-height:5mm}.doc-foot{display:flex;justify-content:space-between;align-items:center;font-size:7.4pt;color:#666;margin-top:2.2mm;position:relative;z-index:1} ' +
'</style></head><body><div class="sheet">' +
'<div class="header"><div class="logo">' + logoHtml + '</div><div class="head-main"><div class="doc-code">ระบบรับสมัครนักเรียนออนไลน์ / STUDENT ADMISSION SYSTEM</div><div class="doc-title">ใบสมัครและใบมอบตัวนักเรียน ปีการศึกษา ' + yr + '</div><div class="school-line">' + school + '</div><div class="doc-sub">สำหรับผู้ผ่านการคัดเลือกและมารายงานตัวพร้อมเอกสารประกอบ</div><div class="school-meta">' + [schoolSub && ('ต.'+schoolSub), schoolDis && ('อ.'+schoolDis), schoolPrv && ('จ.'+schoolPrv)].filter(Boolean).join(' ') + (schoolTel ? ' · โทร. ' + schoolTel : '') + '</div></div><div class="photo">' + photoHtml + '</div></div>' +
'<div class="app-strip">' +
'<div class="mini"><div class="k">เลขที่ใบสมัคร</div><div class="v">' + _v(a.APP_ID) + '</div></div>' +
'<div class="mini"><div class="k">ระดับชั้น</div><div class="v">' + _v(a.LEVEL) + '</div></div>' +
'<div class="mini"><div class="k">สถานะ</div><div class="v">' + _v(a.STATUS) + '</div></div>' +
'<div class="mini"><div class="k">ห้อง</div><div class="v">' + _v(a.CLASS_ROOM || a.EXAM_ROOM || '') + '</div></div>' +
'<div class="mini"><div class="k">เลขที่/เลขนั่งสอบ</div><div class="v">' + _v(a.CLASS_NO || a.EXAM_NO || '') + '</div></div>' +
'</div>' +
'<div class="grid">' +
'<div>' +
'<div class="section"><div class="section-title">1) ข้อมูลนักเรียน</div><div class="section-body">' +
row('ชื่อ-สกุล', fullName) + rowId('เลขประจำตัวประชาชน', a.ID_CARD) + row2('วันเดือนปีเกิด', _v(a.BIRTHDATE), 'อายุ', _v(a.AGE||'')) +
row2('สัญชาติ', a.NATIONALITY, 'ศาสนา', a.RELIGION) + row('ที่อยู่ตามทะเบียนบ้าน', _addr(a.ADDRESS, a.SUBDISTRICT, a.DISTRICT, a.PROVINCE, a.ZIP)) +
row('ที่อยู่ปัจจุบัน', _currAddr(a.CURR_SAME, a.CURR_ADDRESS, a.CURR_SUBDISTRICT, a.CURR_DISTRICT, a.CURR_PROVINCE, a.CURR_ZIP)) +
row2('โทรศัพท์นักเรียน', a.PHONE, 'โรงเรียนเดิม', (function(){
  var s = _vb(a.OLD_SCHOOL);
  var addr = [_vb(a.OLD_SCHOOL_SUBDISTRICT), _vb(a.OLD_SCHOOL_DISTRICT), _vb(a.OLD_SCHOOL_PROVINCE)].filter(Boolean).join(' ');
  return s + (addr ? (' <span style="font-size:7.5pt;color:#555">(' + _pdfSafe(addr) + ')</span>') : '');
})()) + row2('ระดับเดิม', a.OLD_LEVEL, 'ผลการเรียน (ปพ.1)', a.GPA) +
row2('น้ำหนัก', a.WEIGHT_KG ? a.WEIGHT_KG + ' กก.' : '–', 'ส่วนสูง', a.HEIGHT_CM ? a.HEIGHT_CM + ' ซม.' : '–') +
row('ข้อมูลสุขภาพ', healthBits || 'ไม่มี') +
'</div></div>' +
'<div class="section"><div class="section-title">2) ข้อมูลบิดา มารดา และผู้ปกครอง</div><div class="section-body">' +
'<div class="sub-title">บิดา</div>' + row('ชื่อ-สกุล', fatherName) + row2('สถานะ', a.FATHER_STATUS, 'โทรศัพท์', a.FATHER_PHONE) + row2('อาชีพ', a.FATHER_OCCUPATION, 'รายได้', inc(a.FATHER_INCOME)) +
'<div class="sub-title sub-gap">มารดา</div>' + row('ชื่อ-สกุล', motherName) + row2('สถานะ', a.MOTHER_STATUS, 'โทรศัพท์', a.MOTHER_PHONE) + row2('อาชีพ', a.MOTHER_OCCUPATION, 'รายได้', inc(a.MOTHER_INCOME)) +
'<div class="sub-title sub-gap">ผู้ปกครอง</div>' + row('ชื่อ-สกุล', gName) + row2('ความเกี่ยวข้อง', gRel, 'โทรศัพท์', gPhone) +
row('สถานภาพครอบครัว', a.PARENT_COUPLE_RELATION) + row('ข้อมูลพี่น้อง', 'พี่น้องชาย ' + num(a.SIBLINGS_MALE) + ' คน · พี่น้องหญิง ' + num(a.SIBLINGS_FEMALE) + ' คน · กำลังเรียนอยู่รวม ' + num(a.STUDYING_COUNT) + ' คน') +
'</div></div>' +
'</div>' +
'<div>' +
'<div class="band"><div class="band-title">3) เอกสารที่ยื่นประกอบการรายงานตัว / มอบตัว (สำหรับเจ้าหน้าที่ตรวจเอกสาร)</div>' +
'<div class="check-grid">' +
'<div class="check-item"><span class="checkbox"></span><span>สำเนาทะเบียนบ้านนักเรียน</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>สำเนาบัตรประชาชนผู้สมัคร</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>สำเนาทะเบียนบ้านบิดา/มารดา/ผู้ปกครอง</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>สำเนาบัตรประชาชนบิดา/มารดา/ผู้ปกครอง</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>ปพ.1 หรือใบรับรองผลการเรียน</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>รูปถ่ายตามที่โรงเรียนกำหนด</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>หลักฐานเปลี่ยนชื่อ-สกุล (ถ้ามี)</span></div>' +
'<div class="check-item"><span class="checkbox"></span><span>เอกสารอื่น ๆ ................................</span></div>' +
'</div></div>' +
'<div class="band"><div class="band-title">4) คำรับรอง</div><div class="band-text">ข้าพเจ้าและผู้ปกครองขอรับรองว่าข้อมูลและเอกสารประกอบการมอบตัวฉบับนี้เป็นความจริงทุกประการ และยินยอมให้โรงเรียนตรวจสอบหลักฐาน ตลอดจนปฏิบัติตามระเบียบของโรงเรียนทุกประการ</div></div>' +
'<div class="signatures">' +
'<div class="sig"><div class="sig-title">ลงชื่อผู้สมัคร</div><div class="sig-line"></div><div class="sig-name">' + fullName + '</div><div class="sig-date">วันที่ ................................</div></div>' +
'<div class="sig"><div class="sig-title">ลงชื่อผู้ปกครอง</div><div class="sig-line"></div><div class="sig-name">' + gName + '</div><div class="sig-date">วันที่ ................................</div></div>' +
'<div class="sig"><div class="sig-title">ลงชื่อเจ้าหน้าที่รับมอบตัว</div><div class="sig-line"></div><div class="sig-name">................................</div><div class="sig-date">วันที่ ................................</div></div>' +
'</div>' +
'<div class="footer-box"><div class="footer-title">บันทึกการรายงานตัว / มอบตัว (สำหรับเจ้าหน้าที่)</div><div class="footer-grid">' +
'<div class="footer-cell"><div class="footer-k">เลขประจำตัวนักเรียน</div><div class="footer-v">' + _v(a.STUDENT_NO || a.STUDENT_ID || '') + '</div></div>' +
'<div class="footer-cell"><div class="footer-k">ห้อง</div><div class="footer-v">' + _v(a.CLASS_ROOM || a.EXAM_ROOM || '') + '</div></div>' +
'<div class="footer-cell"><div class="footer-k">เลขที่</div><div class="footer-v">' + _v(a.CLASS_NO || a.EXAM_NO || '') + '</div></div>' +
'<div class="footer-cell"><div class="footer-k">หมายเหตุ</div><div class="footer-v">' + _v(a.REMARK || '') + '</div></div>' +
'</div></div>' +
'</div></div>' +
'<div class="doc-foot"><div>ออกเอกสารเมื่อสถานะ “ผ่าน” หรือ “รายงานตัวแล้ว”</div><div>เลขที่ใบสมัคร ' + _v(a.APP_ID) + '</div></div>' +
'</div></body></html>';

  return html;
}

function _pdfSafe(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
