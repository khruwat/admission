// v1_22_5: getStats cache 30s + cache invalidation ใน write ops
/* =============================================================
   ระบบรับสมัครนักเรียน โรงเรียนหนองนาคำวิทยาคม
   Student Enrollment System  v1.22.15
   ─────────────────────────────────────────────────────────────
   Sheets   : Applications | Users | Settings | AuditLog
              ExamConfig | ExamScores
   Roles    : ADMIN | STAFF
   Run once : setupSystem()  ←  สร้าง Sheet + default admin
   Default  : admin / admin1234
   ─────────────────────────────────────────────────────────────
   CHANGELOG
   v1.22.5 – 2569-03-21 – Performance: getStats cache 30s
              เพิ่ม _STATS_CACHE (30 วินาที) ใน getStats()
              ป้องกัน admin หลายคนเปิด dashboard พร้อมกัน → scan Sheet ซ้ำ
              cache clear อัตโนมัติใน: updateApplication, deleteApplication,
              assignExamNumbers, submitApplication (ข้อมูลเปลี่ยน → clear ทันที)
   v1.22.4 – 2569-03-21 – เพิ่ม LINE Group config
              SETTINGS_DEFAULTS: LINE_GROUP_URL, LINE_QR_URL
              แสดงในหน้าตรวจสอบสถานะ (frontend) เท่านั้น
   v1.22.3 – 2569-03-20 – ระบบ Sync Google Sheet → Supabase (Sheet เป็นหลัก)
              syncSheetToSupabase(): upsert ทุกแถวจาก Sheet + ลบ orphan ใน Supabase
              getSyncStatus(): ดูเวลา/ผล sync ล่าสุด
              setupSyncTrigger(hours): ตั้ง time-based trigger อัตโนมัติ
              removeSyncTrigger(): ลบ trigger ทั้งหมด
              _autoSyncFromTrigger(): entry point สำหรับ GAS Trigger เรียก
   v1.22.2 – 2569-03-20 – Bugfix TEST_MODE: ใช้ _isTestModeActive() อ่านจาก Sheet โดยตรง
              ป้องกัน cache ค้างทำให้ยังตรวจ checksum อยู่แม้เปิด TEST_MODE
              เพิ่มตรวจว่าเลขบัตรครบ 13 หลักเสมอแม้ใน testMode
   v1.22.1 – 2569-03-20 – โหมดทดสอบระบบ (TEST_MODE)
              SETTINGS_DEFAULTS: เพิ่ม TEST_MODE ('false' = ปกติ, 'true' = ทดสอบ)
              submitApplication(): ข้าม validateThaiId + ข้ามตรวจวันเปิด/ปิดรับสมัคร
                เมื่อ TEST_MODE=true — ป้องกันด้วย log audit ทุก submit ที่ใช้โหมดนี้
              getSettings(): return testMode flag ให้ frontend
              frontend (index v1.15.13):
                เมนู admin "🧪 โหมดทดสอบ" ใน sidebar
                banner สีส้ม/แดงเตือนชัดเจนทุกหน้า เมื่อ TEST_MODE=true
                ปุ่มเปิด/ปิด พร้อม confirm dialog ป้องกันเปิดโดยไม่ตั้งใจ
                ข้าม validateIdCard + idCardErrorReason + _checkExistingRegistration
                (ซ้ำ) เมื่อ testMode
   v1.22.0 – 2569-03-20 – ใบลงชื่อเข้าห้องสอบ (PDF แยกตามแผนการเรียนและห้องสอบ)
              getExamSignSheetData(): ดึงผู้มีสิทธิ์สอบ กรองตาม level/studyPlan
                คืน applicants + สถิติห้อง/แผน สำหรับ frontend
              frontend: ปุ่ม "🖊 ใบลงชื่อเข้าห้องสอบ" ใน admin → ข้อมูลการสมัคร
                modal เลือก ระดับ/แผน/ห้อง พร้อม preview จำนวนคน
                PDF A4 portrait แต่ละห้องสอบ = 1 หน้า
                คอลัมน์: ลำดับ, เลขนั่งสอบ, ชื่อ-นามสกุล, โรงเรียนเดิม,
                         ลายมือชื่อ, หมายเหตุ
                info strip: วันสอบ, เวลา, ห้อง, แผน, จำนวน
                ช่องลายมือชื่อกรรมการคุมสอบ 2 คน + หัวหน้าสนามสอบ
   v1.21.2 – 2569-03-20 – (index) ปรับปรุง UI ใบสมัคร+ใบมอบตัว
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
  'REMARK','PDF_URL','CREATED_AT','UPDATED_AT'
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
  ['PDF_FOLDER_URL',     ''],
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
  ['SYSTEM_VERSION',     'v1.22.5'],
  ['CHANGELOG_TEXT',     'v1.22.5 – 2569-03-21 – Performance: getStats cache 30s + cache invalidation\nv1.22.4 – 2569-03-21 – เพิ่ม LINE_GROUP_URL, LINE_QR_URL (แสดงในหน้าตรวจสอบสถานะ)\nv1.22.3 – 2569-03-20 – ระบบ Sync Sheet→Supabase (Sheet เป็นหลัก) + Auto Trigger\nv1.22.2 – 2569-03-20 – Bugfix TEST_MODE: _isTestModeActive() อ่านจาก Sheet โดยตรง\nv1.22.1 – 2569-03-20 – โหมดทดสอบระบบ (TEST_MODE) ข้าม checksum + วันเปิด/ปิด\nv1.22.0 – 2569-03-20 – ใบลงชื่อเข้าห้องสอบ PDF แยกตามแผน/ห้องสอบ\nv1.21.1 – 2569-03-20 – ล็อคแก้ไขข้อมูลเมื่อสถานะผ่าน/รายงานตัวแล้ว\nv1.21.0 – 2569-03-20 – ดาวน์โหลดใบสมัคร+ใบมอบตัวเมื่อสถานะผ่าน/รายงานตัวแล้ว'],
  ['ANNOUNCEMENT',       ''],
  ['ANNOUNCE_IMAGE',     ''],
  ['ANNOUNCE_POPUP',     'true'],
  // LINE กลุ่มโรงเรียน — แสดงในหน้าตรวจสอบสถานะเท่านั้น
  ['LINE_GROUP_URL',     ''],
  ['LINE_QR_URL',        ''],
  ['SUPA_URL',           'https://vudbdydinxcdwowdlbti.supabase.co'],
  ['SUPA_KEY',           'sb_publishable_4WaexTTMtcZC6N7anTEaLA_XOgrAZQR'],
  // โหมดทดสอบระบบ — 'true' = ข้ามตรวจ checksum บัตรประชาชน + ข้ามตรวจวันเปิด/ปิดรับสมัคร
  // *** ต้องเปลี่ยนกลับเป็น 'false' ก่อนใช้งานจริงทุกครั้ง ***
  ['TEST_MODE',          'false'],
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
        const isTimestamp = ['CREATED_AT','UPDATED_AT','LAST_LOGIN','TIMESTAMP'].includes(h);
        if (isTimestamp) {
          o[h] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
        } else if (h === 'BIRTHDATE') {
          // ใช้ local Date parts โดยตรง ป้องกัน timezone shift
          // getFullYear/Month/Date อ่านค่าตาม local time ของ GAS script
          var bd = row[i];
          o[h] = Utilities.formatDate(bd, Session.getScriptTimeZone(), 'yyyy-MM-dd');
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

// ─── TEST MODE HELPERS ───
// ดึงสถานะโหมดทดสอบ (public — ใช้ได้โดยไม่ต้อง login)
function getTestMode() {
  const cfg = getSettings();
  return { testMode: String(cfg.TEST_MODE || 'false') === 'true' };
}

// เปิด/ปิดโหมดทดสอบ (admin only)
function setTestMode(token, enabled) {
  const sess = _requirePerm(token, 'SETTINGS');
  const val  = enabled ? 'true' : 'false';
  _withLock(function() {
    const sh   = _sheet(SH.SETTINGS);
    const last = sh.getLastRow();
    const vals = sh.getRange(1,1,last,2).getValues();
    const idx  = vals.findIndex(function(r){ return String(r[0]).trim() === 'TEST_MODE'; });
    if (idx >= 0) sh.getRange(idx+1, 2).setValue(val);
    else sh.appendRow(['TEST_MODE', val]);
    _CACHE.remove(_CFG_CACHE);
    _CACHE.remove(_PUB_STATS_CACHE);
  });
  _logWithRole(sess.name, sess.role, 'SET_TEST_MODE',
    (enabled ? '🟡 เปิดโหมดทดสอบ' : '🟢 ปิดโหมดทดสอบ (กลับสู่การใช้งานจริง)'));
  return { ok: true, testMode: enabled };
}

function getSettings() {
  const cached = _CACHE.get(_CFG_CACHE);
  if (cached) { try { return JSON.parse(cached); } catch(e) {} }
  // useDisplay=true → อ่านค่าที่แสดงใน cell จริง ป้องกัน 043... → 43...
  const rows = _sheetData(SH.SETTINGS, true);
  const s = {};
  rows.forEach(r => { if (r.KEY) s[String(r.KEY).trim()] = String(r.VALUE); });

  // ── แปลง Drive viewUrl → thumbUrl อัตโนมัติ ──
  // Google ปิด uc?export=view สำหรับ <img> ตั้งแต่ปี 2023
  ['LOGO_URL','LINE_QR_URL'].forEach(function(k) {
    if (s[k] && s[k].indexOf('uc?export=view') !== -1) {
      var m = s[k].match(/[?&]id=([\w-]+)/);
      if (m) s[k] = 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800';
    }
  });

  const chText = String(s.CHANGELOG_TEXT || (SETTINGS_DEFAULTS.find(function(r){return r[0]==='CHANGELOG_TEXT';}) || ['',''])[1] || '');
  const firstLog = chText.split('\n').map(t => String(t || '').trim()).filter(Boolean)[0] || '';
  s.CODE_VERSION = ((firstLog.match(/v\d+(?:\.\d+)+/i) || [])[0]) || String(s.SYSTEM_VERSION || (SETTINGS_DEFAULTS.find(function(r){return r[0]==='SYSTEM_VERSION';}) || ['',''])[1] || 'v–');
  s.CODE_UPDATED = ((firstLog.match(/(25\d{2}-\d{2}-\d{2}|20\d{2}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/) || [])[0]) || '';

  _CACHE.put(_CFG_CACHE, JSON.stringify(s), 60);
  return s;
}


function _splitCfgLines(v, fallback) {
  var s = String(v || '').trim();
  var arr = s ? s.split(/\r?\n|\|/).map(function(x){ return String(x || '').trim(); }).filter(Boolean) : [];
  return arr.length ? arr : (fallback || []);
}

function getPublicConfig() {
  var cfg = getSettings();
  var stats = getPublicStats();
  var year = String(cfg.ACADEMIC_YEAR || new Date().getFullYear() + 543);
  var schoolName = String(cfg.SCHOOL_FULLNAME || cfg.SCHOOL_NAME || 'โรงเรียน');
  var docs = _splitCfgLines(cfg.REQUIRED_DOCS_LIST || cfg.HOME_DOCS_LIST, [
    'รูปถ่ายชุดนักเรียน หน้าตรง',
    'สำเนาบัตรประชาชนของนักเรียน/ผู้ปกครอง',
    'ระเบียนแสดงผลการเรียน หรือเอกสารผลการเรียนล่าสุด',
    'สำเนาทะเบียนบ้านฉบับเจ้าบ้าน'
  ]);
  var checklist = _splitCfgLines(cfg.HOME_DOCS_CHECKLIST || cfg.REQUIRED_DOCS_CHECKLIST, [
    'ตรวจสอบชื่อ-สกุล เลขประชาชน และวันเกิดให้ถูกต้อง',
    'เตรียมเบอร์โทรที่ติดต่อได้จริงของผู้สมัครหรือผู้ปกครอง',
    'บันทึกเลขที่ใบสมัครไว้ใช้ติดตามสถานะในภายหลัง',
    'หากมีการแก้ไขข้อมูล ให้ดำเนินการผ่านระบบตามสิทธิ์ที่กำหนด'
  ]);

  var timeline = [
    { icon:'edit', title: cfg.HOME_TL1_TITLE || 'เปิดรับสมัคร ม.1 และ ม.4', desc: cfg.HOME_TL1_DESC || 'รับสมัครออนไลน์ผ่านระบบเว็บไซต์โรงเรียน กรุณาเตรียมไฟล์เอกสารให้พร้อมตามที่กำหนด', date: cfg.HOME_TL1_DATE || cfg.M1_REG_START || 'มีนาคม ' + year },
    { icon:'task', title: cfg.HOME_TL2_TITLE || 'ประกาศรายชื่อผู้มีสิทธิ์สอบ', desc: cfg.HOME_TL2_DESC || 'ผู้สมัครสามารถเข้าตรวจสอบเลขที่นั่งสอบ ห้องสอบ และพิมพ์บัตรประจำตัวผู้เข้าสอบได้จากระบบ', date: cfg.HOME_TL2_DATE || cfg.M1_EXAM_DATE || 'เมษายน ' + year },
    { icon:'celebration', title: cfg.HOME_TL3_TITLE || 'ประกาศผลและรายงานตัว', desc: cfg.HOME_TL3_DESC || 'ประกาศผลการสอบคัดเลือกผ่านเว็บไซต์ และต้องรายงานตัวผ่านระบบออนไลน์และที่โรงเรียนตามกำหนด', date: cfg.HOME_TL3_DATE || cfg.M1_RESULT_DATE || 'เมษายน ' + year }
  ];

  return {
    ok: true,
    settings: cfg,
    publicStats: stats,
    schoolName: schoolName,
    year: year,
    phone: String(cfg.SCHOOL_PHONE || ''),
    email: String(cfg.SCHOOL_EMAIL || cfg.CONTACT_EMAIL || ''),
    address: String(cfg.SCHOOL_ADDRESS || cfg.SCHOOL_ADDRESS_TEXT || ''),
    lineUrl: String(cfg.LINE_GROUP_URL || ''),
    documents: docs,
    checklist: checklist,
    timeline: timeline,
    generatedAt: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  };
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

// อ่าน TEST_MODE โดยตรงจาก Sheet (ไม่ผ่าน cache) เพื่อให้แน่ใจว่าได้ค่าล่าสุด
function _isTestModeActive() {
  try {
    const sh   = _sheet(SH.SETTINGS);
    const last = sh.getLastRow();
    if (last < 2) return false;
    const vals = sh.getRange(1, 1, last, 2).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === 'TEST_MODE') {
        return String(vals[i][1]).trim() === 'true';
      }
    }
    return false;
  } catch(e) {
    // fallback: ใช้จาก cache
    return String((getSettings()).TEST_MODE || 'false') === 'true';
  }
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

  // migrate sheet header ก่อนเสมอ (นอก lock)
  try { _migrateAppSheet(); } catch(e) {}

  const cfg      = getSettings();
  const testMode = _isTestModeActive();

  // ตรวจ checksum บัตรประชาชน
  if (!testMode && !_validateThaiId(data.ID_CARD))
    return { ok:false, msg:'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
  if (String(data.ID_CARD).trim().replace(/\D/g,'').length !== 13)
    return { ok:false, msg:'เลขประจำตัวประชาชนต้องมี 13 หลัก' };

  // ตรวจช่วงเวลารับสมัคร
  if (data.LEVEL !== 'ย้ายเข้า' && !testMode) {
    const openKey = data.LEVEL === 'ม.1' ? 'REG_OPEN_M1' : 'REG_OPEN_M4';
    const reg2Key = data.LEVEL === 'ม.1' ? 'REG2_OPEN_M1' : 'REG2_OPEN_M4';
    const isOpen1 = String(cfg[openKey])  === 'true';
    const isOpen2 = String(cfg[reg2Key])  === 'true';
    if (!isOpen1 && !isOpen2)
      return { ok:false, msg:'ขณะนี้ยังไม่เปิดรับสมัครในระดับชั้นนี้' };

    const pfx = data.LEVEL === 'ม.1' ? 'M1' : 'M4';
    const now  = new Date();

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
      if (!isOpen2) return { ok:false, msg:r1.msg || 'ขณะนี้ยังไม่เปิดรับสมัคร' };
      const r2 = _inRange(pfx+'_REG2_START', pfx+'_REG2_END', 'REG2_OPEN_TIME', 'REG2_CLOSE_TIME');
      if (!r2.ok) return { ok:false, msg:r2.msg || 'ปิดรับสมัครทั้งรอบ 1 และรอบ 2 แล้ว' };
    }
  }

  // ── FAST PATH: Lock สั้นๆ แค่เพื่อ (1) ตรวจ duplicate (2) สร้าง APP_ID ──
  // appendRow ทำหลัง lock release → ทุก concurrent user รอกันแค่ ~200ms
  var appId, row, hdrs, nowTs;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok:false, msg:'ระบบยุ่งชั่วคราว กรุณาลองใหม่อีกครั้ง' };
  try {
    var sh      = _sheet(SH.APP);
    var last    = sh.getLastRow();
    var shCols  = sh.getLastColumn();
    hdrs        = sh.getRange(1,1,1,shCols).getValues()[0].map(function(h){ return String(h).trim(); });
    var iId     = hdrs.indexOf('ID_CARD');
    var iLv     = hdrs.indexOf('LEVEL');
    var iApId   = hdrs.indexOf('APP_ID');

    // ตรวจ duplicate
    if (last >= 2) {
      var dataRows = sh.getRange(2,1,last-1,shCols).getValues();
      for (var r = 0; r < dataRows.length; r++) {
        if (iId >= 0 && String(dataRows[r][iId]).trim() === String(data.ID_CARD).trim()) {
          var existId = iApId >= 0 ? dataRows[r][iApId] : '–';
          lock.releaseLock();
          return { ok:false, msg:'เลขประจำตัวประชาชนนี้ได้สมัครแล้ว (เลขที่ใบสมัคร: '+existId+') หากต้องการแก้ไขกรุณาติดต่อเจ้าหน้าที่' };
        }
      }
    }

    // สร้าง APP_ID (นับจาก sheet ณ ขณะนี้)
    var yr      = String(cfg.ACADEMIC_YEAR||'2568').slice(-2);
    var pfxMap  = {'ม.1':'M1','ม.4':'M4','ย้ายเข้า':'TX'};
    var apPfx   = pfxMap[data.LEVEL] || 'MX';
    var cnt     = 1;
    if (last >= 2 && iLv >= 0) {
      var dRows2 = sh.getRange(2,1,last-1,shCols).getValues();
      cnt = dRows2.filter(function(rw){ return String(rw[iLv]) === data.LEVEL; }).length + 1;
    }
    appId = yr+'-'+apPfx+'-'+String(cnt).padStart(4,'0');
    nowTs = new Date();

    var _str = function(v){ return (v === null || v === undefined) ? '' : String(v); };
    var rec = Object.assign({}, data, {
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
      EXAM_NO:'', EXAM_ROOM:'', SCORE:'', RESULT_NOTE:'', REMARK:'', PDF_URL:'',
      CREATED_AT: nowTs, UPDATED_AT: nowTs
    });

    // เตรียม row ตาม header ของ sheet จริง
    row = hdrs.map(function(h){ return rec[h] !== undefined ? rec[h] : ''; });

    // appendRow ใน lock — เร็วมาก (~50ms) ทำให้ concurrent users ไม่ชนกัน
    sh.appendRow(row);

    // ตั้ง Plain Text format สำหรับ TEXT_COLS
    var newRowIdx = sh.getLastRow();
    TEXT_COLS.forEach(function(col) {
      var ci = hdrs.indexOf(col);
      if (ci >= 0) sh.getRange(newRowIdx, ci+1).setNumberFormat('@');
    });

  } finally {
    lock.releaseLock();
  }

  // ── Supabase dual-write ทำนอก lock (ไม่ block user อื่น) ──
  try { _supaUpsert('applications', _toSupaRec(Object.assign({}, data, { APP_ID:appId, STATUS:'สมัครแล้ว', CREATED_AT:nowTs, UPDATED_AT:nowTs }))); }
  catch(e) { Logger.log('Supabase write failed: '+e); }

  _log('PUBLIC','SUBMIT',appId+' | '+data.FNAME+' '+data.LNAME+' | '+data.LEVEL+(testMode?' | ⚠️ TEST_MODE':''));
  // ── invalidate stats cache: ข้อมูลใหม่เข้า → dashboard ต้องแสดงผลสด ──
  try { _CACHE.remove(_STATS_CACHE); _CACHE.remove(_PUB_STATS_CACHE); } catch(e) {}
  return { ok:true, appId:appId };
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
var _migrated = false; // cache flag ป้องกันรันซ้ำใน request เดียวกัน
function _migrateAppSheet() {
  if (_migrated) return; // ไม่ migrate ซ้ำใน GAS execution เดียวกัน
  const sh   = _sheet(SH.APP);
  const last = sh.getLastRow();
  if (!last) {
    sh.appendRow(APP_COLS);
    sh.getRange(1,1,1,APP_COLS.length).setFontWeight('bold').setBackground('#e0f2fe').setNumberFormat('@');
    _migrated = true;
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
  _migrated = true;
}

// ─── PUBLIC: VERIFY OWNER (student self-edit) ───
// ตรวจสอบความเป็นเจ้าของโดยใช้วันเดือนปีเกิดเป็น PIN
function verifyOwnerAndGetApp(idCard, birthdate) {
  if (!idCard || !birthdate) return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบ' };
  const apps = _sheetData(SH.APP);
  const app  = apps.find(a => String(a.ID_CARD).trim() === String(idCard).trim());
  if (!app) return { ok:false, msg:'ไม่พบข้อมูลการสมัคร' };

  // ── แปลง BIRTHDATE ในแบบที่ทนทานต่อ timezone/locale ──
  // app.BIRTHDATE จาก _sheetData อาจเป็น "YYYY-MM-DD" (ผ่าน _localDateStr)
  // หรือ Date object ที่ยังไม่ถูก convert
  // inputDOB จาก HTML คือ "YYYY-MM-DD" (ค.ศ.) เสมอ
  var appDOBStr = '';
  if (app.BIRTHDATE instanceof Date) {
    // ป้องกัน timezone shift: อ่านตรงจาก Date ด้วย local parts
    var d = app.BIRTHDATE;
    appDOBStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
  } else {
    // ถ้าเป็น string เช่น "2001-01-01" หรือ "1/1/2001 7:00:00"
    var raw = String(app.BIRTHDATE || '').trim();
    if (raw.match(/^\d{4}-\d{2}-\d{2}/)) {
      appDOBStr = raw.slice(0, 10);
    } else if (raw) {
      // fallback: parse ด้วย new Date แล้วแปลงด้วย local parts
      var pd = new Date(raw);
      if (!isNaN(pd)) {
        appDOBStr = pd.getFullYear() + '-'
          + String(pd.getMonth() + 1).padStart(2, '0') + '-'
          + String(pd.getDate()).padStart(2, '0');
      }
    }
  }

  const inputDOB = String(birthdate).slice(0, 10);

  if (!appDOBStr || appDOBStr !== inputDOB) {
    _log('PUBLIC', 'VERIFY_FAIL', 'ID:' + String(idCard).slice(-4)
      + ' dob mismatch app=' + appDOBStr + ' input=' + inputDOB);
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

  // ล็อคการแก้ไขเมื่อโรงเรียนอนุมัติแล้ว (ผ่าน หรือ รายงานตัวแล้ว)
  // เพื่อป้องกันนักเรียนแก้ไขข้อมูลหลังพิมพ์เอกสารการสมัคร
  const LOCKED_STATUSES = ['ผ่าน', 'รายงานตัวแล้ว'];
  if (LOCKED_STATUSES.includes(verify.app.STATUS))
    return { ok:false, msg:'ไม่สามารถแก้ไขได้ เนื่องจากโรงเรียนอนุมัติรับเข้าศึกษาแล้ว (สถานะ: ' + verify.app.STATUS + ')' };

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
    ID_CARD:a.ID_CARD,
    PREFIX:a.PREFIX, GENDER:a.GENDER, FNAME:a.FNAME, LNAME:a.LNAME,
    STATUS:a.STATUS, EXAM_NO:a.EXAM_NO, EXAM_ROOM:a.EXAM_ROOM,
    SCORE:a.SCORE, RESULT_NOTE:a.RESULT_NOTE, CREATED_AT:a.CREATED_AT,
    PDF_URL:a.PDF_URL||''
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

    // ── Auto-generate PDF เมื่อสถานะเป็น 'ผ่าน' ──
    var prevStatus = '';
    var newStatus  = updates.STATUS || '';
    if (newStatus === 'ผ่าน') {
      try {
        var appData = _sheetData(SH.APP).find(function(r){ return String(r.APP_ID||'') === String(appId); });
        prevStatus  = appData ? String(appData.STATUS || '') : '';
        // สร้าง PDF เฉพาะถ้าสถานะเดิมยังไม่เป็น 'ผ่าน' (ป้องกันสร้างซ้ำ)
        if (prevStatus !== 'ผ่าน' && appData) {
          var mergedApp  = Object.assign({}, appData, updates);
          var cfg        = getSettings();
          var pdfResult  = _savePdfToDrive(mergedApp, cfg);
          if (pdfResult.ok) {
            updates.PDF_URL = pdfResult.url;
            _log(sess.name, 'AUTO_PDF', appId + ' → ' + pdfResult.url);
          } else {
            _log(sess.name, 'AUTO_PDF_FAIL', appId + ': ' + pdfResult.msg);
          }
        }
      } catch(e) {
        _log(sess.name, 'AUTO_PDF_ERR', appId + ': ' + String(e));
      }
    }

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
    // ── invalidate stats cache: สถานะ/ข้อมูลเปลี่ยน → dashboard ต้อง refresh ──
    try { _CACHE.remove(_STATS_CACHE); } catch(e) {}
    return { ok: ok, pdfUrl: updates.PDF_URL || '' };
  });
}

// ─── PDF: สร้างและบันทึกลง Drive ───
function _getPdfFolder(cfg) {
  var folderUrl = String(cfg.PDF_FOLDER_URL || '').trim();
  if (folderUrl) {
    // ดึง folder ID จาก URL
    var m = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (m) {
      try { return DriveApp.getFolderById(m[1]); } catch(e) {}
    }
  }
  // fallback: สร้างโฟลเดอร์ใหม่ชื่อ ใบสมัคร2568 ใน root Drive
  var yr    = String(cfg.ACADEMIC_YEAR || new Date().getFullYear() + 543);
  var fname = 'ใบสมัคร' + yr;
  var root  = DriveApp.getRootFolder();
  var iter  = root.getFoldersByName(fname);
  if (iter.hasNext()) return iter.next();
  var folder = root.createFolder(fname);
  // บันทึก URL กลับเข้า Settings อัตโนมัติ
  try {
    var sh   = _sheet(SH.SETTINGS);
    var last = sh.getLastRow();
    var vals = sh.getRange(1,1,last,2).getValues();
    var idx  = vals.findIndex(function(r){ return String(r[0]).trim() === 'PDF_FOLDER_URL'; });
    if (idx >= 0) sh.getRange(idx+1, 2).setValue(folder.getUrl());
    else sh.appendRow(['PDF_FOLDER_URL', folder.getUrl()]);
    _CACHE.remove(_CFG_CACHE);
  } catch(e) {}
  return folder;
}

// ─── HELPER: ดึงไฟล์ภายนอกแปลงเป็น base64 data URI ───
function _fetchAsDataUri(url) {
  if (!url) return '';
  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) return '';
    var bytes     = resp.getContent();
    var mime      = resp.getHeaders()['Content-Type'] || 'image/jpeg';
    // ตัด charset ออก เช่น "image/jpeg; charset=utf-8"
    mime = mime.split(';')[0].trim();
    return 'data:' + mime + ';base64,' + Utilities.base64Encode(bytes);
  } catch(e) { return ''; }
}

// ─── HELPER: ดึง Sarabun font แบบ base64 สำหรับ embed ใน HTML/PDF ───
var _SARABUN_CACHE = null;
function _getSarabunFontFace() {
  if (_SARABUN_CACHE) return _SARABUN_CACHE;
  try {
    // ดึง Sarabun Regular (400) และ Bold (700) จาก Google Fonts CDN
    var urls = {
      '400': 'https://fonts.gstatic.com/s/sarabun/v13/DtVmJx26TKEr37c9YHZ5ioE.woff2',
      '700': 'https://fonts.gstatic.com/s/sarabun/v13/DtVhJx26TKEr37c9aBBxUoIvmYU.woff2'
    };
    var css = '';
    Object.keys(urls).forEach(function(weight) {
      try {
        var resp = UrlFetchApp.fetch(urls[weight], { muteHttpExceptions: true });
        if (resp.getResponseCode() === 200) {
          var b64 = Utilities.base64Encode(resp.getContent());
          css += '@font-face{font-family:"Sarabun";font-weight:' + weight +
                 ';font-style:normal;src:url(data:font/woff2;base64,' + b64 + ') format("woff2")}';
        }
      } catch(e) {}
    });
    // fallback: ถ้าดึง font ไม่ได้ ใช้ system Thai font
    if (!css) css = '';
    _SARABUN_CACHE = css;
    return css;
  } catch(e) { return ''; }
}

function _savePdfToDrive(app, cfg) {
  try {
    // ── ดึง font Sarabun + รูปภาพมา embed เป็น base64 ──
    var fontFaceCSS = _getSarabunFontFace();
    var logoDataUri  = _fetchAsDataUri(_fixDriveUrlForGas(cfg.LOGO_URL  || ''));
    var photoDataUri = _fetchAsDataUri(_fixDriveUrlForGas(app.PHOTO_URL || ''));

    var html = _buildEnrollmentPdfHtml(app, cfg, fontFaceCSS, logoDataUri, photoDataUri);
    var blob = HtmlService.createHtmlOutput(html).getBlob().getAs(MimeType.PDF);

    var level    = String(app.LEVEL  || '').replace(/\./g,'');
    var fullName = [app.PREFIX, app.FNAME, app.LNAME].filter(Boolean).join('');
    var safeName = (String(app.APP_ID || '') + '_' + level + '_' + fullName)
                    .replace(/[\\/:*?"<>|\s]/g,'_').replace(/_+/g,'_');
    blob.setName('ใบสมัคร_' + safeName + '.pdf');

    var folder = _getPdfFolder(cfg);
    var existing = folder.getFilesByName(blob.getName());
    while (existing.hasNext()) { existing.next().setTrashed(true); }

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { ok:true, url:file.getUrl(), filename:blob.getName() };
  } catch(e) {
    return { ok:false, msg: e && e.message ? e.message : String(e) };
  }
}

// แปลง Drive URL → download URL สำหรับ UrlFetchApp
function _fixDriveUrlForGas(url) {
  if (!url) return '';
  var u = String(url).trim();
  var m = u.match(/[?&]id=([\w-]+)/);
  if (!m) m = u.match(/\/d\/([\w-]+)\//);
  if (m) return 'https://drive.google.com/uc?export=download&id=' + m[1];
  return u;
}

// ─── ADMIN: สร้าง PDF ด้วยตนเอง (กรณีต้องการสร้างซ้ำ) ───
function generateAndSaveEnrollmentPdf(token, appId) {
  const sess = _requireAdmin(token);
  try {
    appId = String(appId || '').trim();
    var app = _sheetData(SH.APP).find(function(r){ return String(r.APP_ID||'') === appId; });
    if (!app) return { ok:false, msg:'ไม่พบข้อมูลใบสมัคร' };
    const APPROVED = ['ผ่าน','รายงานตัวแล้ว'];
    if (!APPROVED.includes(String(app.STATUS||'')))
      return { ok:false, msg:'สถานะต้องเป็น "ผ่าน" หรือ "รายงานตัวแล้ว" เท่านั้น' };

    var cfg    = getSettings();
    var result = _savePdfToDrive(app, cfg);
    if (!result.ok) return result;

    // บันทึก PDF_URL ลง Sheet
    _withLock(function(){
      _updateRow(SH.APP, 'APP_ID', appId, { PDF_URL: result.url, UPDATED_AT: new Date() });
    });
    _log(sess.name, 'GEN_PDF', appId + ' → ' + result.url);
    return { ok:true, url:result.url, filename:result.filename };
  } catch(e) {
    return { ok:false, msg: e && e.message ? e.message : String(e) };
  }
}

function deleteApplication(token, appId) {
  const sess = _requirePerm(token, 'DELETE_APP');
  return _withLock(() => {
    const ok = _deleteRow(SH.APP,'APP_ID',appId);
    if (ok) {
      _log(sess.name,'DELETE_APP',appId);
      // ── Sync delete to Supabase ──
      try { _supaDelete('applications', appId); } catch(e) {}
      // ── invalidate stats cache ──
      try { _CACHE.remove(_STATS_CACHE); _CACHE.remove(_PUB_STATS_CACHE); } catch(e) {}
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
    // ── invalidate stats cache: สถานะเปลี่ยนเป็น มีสิทธิ์สอบ ──
    try { _CACHE.remove(_STATS_CACHE); } catch(e) {}
    return { ok:true, count };
  });
}

// ─── ADMIN: STATS ───
const _STATS_CACHE = 'admin_stats_v1'; // TTL 30s — cache dashboard stats

function getStats(token) {
  _requireAdmin(token);

  // ── cache hit ──────────────────────────────────────────────
  const cached = _CACHE.get(_STATS_CACHE);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

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

  const result = {
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

  // ── cache write: 30s — ลด Sheet reads เมื่อ admin หลายคนเปิด dashboard ──
  try { _CACHE.put(_STATS_CACHE, JSON.stringify(result), 30); } catch(e) {}
  return result;
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
      url: urls.thumbUrl,  // thumbUrl แสดงใน <img> ได้ — viewUrl ถูก Google block
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
    // ใช้ thumbUrl สำหรับแสดงใน <img> tag — viewUrl ถูก block โดย Google ตั้งแต่ปี 2023
    const url = urls.thumbUrl;

    updateSettings(token, { LOGO_URL: url });
    _logWithRole('ADMIN', 'ADMIN', 'UPLOAD_LOGO', 'fileId:' + fileId);
    return { ok:true, url: url, thumbUrl: urls.thumbUrl, downloadUrl: urls.downloadUrl, fileId: fileId };

  } catch(e) {
    Logger.log('uploadLogo error: ' + e);
    return { ok:false, msg: 'Upload ไม่สำเร็จ: ' + String(e) };
  }
}


// ─── UPLOAD LINE QR CODE ───
function uploadLineQr(token, base64Data) {
  _requireAdmin(token);
  if (!base64Data || typeof base64Data !== 'string')
    return { ok:false, msg:'ไม่ได้รับข้อมูลรูปภาพ' };

  try {
    const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
    const type = mimeMatch ? mimeMatch[1] : 'image/png';
    const raw  = base64Data.replace(/^data:[^;]+;base64,/, '');
    if (!raw) return { ok:false, msg:'ข้อมูล base64 ว่างเปล่า' };

    const bytes = Utilities.base64Decode(raw);
    const blob  = Utilities.newBlob(bytes, type, 'line_qr_school.png');

    let folder;
    try { folder = _getPhotoFolder(); }
    catch(fe) { folder = DriveApp.getRootFolder(); }

    // ลบ QR เก่าก่อน
    ['png','jpg','jpeg'].forEach(function(e) {
      const iter = folder.getFilesByName('line_qr_school.' + e);
      while (iter.hasNext()) iter.next().setTrashed(true);
    });

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const urls   = _driveImageUrls(fileId);
    // ใช้ thumbUrl สำหรับแสดงใน <img> tag — viewUrl ถูก block โดย Google ตั้งแต่ปี 2023
    const url    = urls.thumbUrl;

    updateSettings(token, { LINE_QR_URL: url });
    _logWithRole('ADMIN', 'ADMIN', 'UPLOAD_LINE_QR', 'fileId:' + fileId);
    return { ok:true, url: url, fileId: fileId };

  } catch(e) {
    Logger.log('uploadLineQr error: ' + e);
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

// ─── EXAM SIGN SHEET DATA ───
// ดึงข้อมูลผู้มีสิทธิ์สอบสำหรับพิมพ์ใบลงชื่อเข้าห้องสอบ
// แยกตามแผนการเรียน (และห้องสอบ — frontend จัดกลุ่มเอง)
// params: level (required), studyPlan (optional, '' = ทุกแผน)
function getExamSignSheetData(token, level, studyPlan) {
  _requireAdmin(token);
  if (!level) return { ok:false, msg:'กรุณาระบุระดับชั้น' };

  let apps = _sheetData(SH.APP);

  // กรองเฉพาะผู้มีสิทธิ์สอบ (STATUS = 'มีสิทธิ์สอบ')
  apps = apps.filter(function(a) { return a.STATUS === 'มีสิทธิ์สอบ'; });

  // กรองระดับชั้น
  apps = apps.filter(function(a) { return a.LEVEL === level; });

  // กรองแผนการเรียน (ถ้าระบุ)
  if (studyPlan) {
    apps = apps.filter(function(a) { return a.STUDY_PLAN === studyPlan; });
  }

  // เรียงตามเลขนั่งสอบ → ตัวเลขก่อน
  apps.sort(function(a, b) {
    const na = parseInt(String(a.EXAM_NO || '').replace(/\D/g,'')) || 0;
    const nb = parseInt(String(b.EXAM_NO || '').replace(/\D/g,'')) || 0;
    if (na !== nb) return na - nb;
    return String(a.EXAM_NO || '').localeCompare(String(b.EXAM_NO || ''), 'th');
  });

  // คืนเฉพาะ fields ที่ใช้สำหรับใบลงชื่อ
  const result = apps.map(function(a) {
    return {
      APP_ID:     a.APP_ID     || '',
      EXAM_NO:    a.EXAM_NO    || '',
      EXAM_ROOM:  a.EXAM_ROOM  || '',
      PREFIX:     a.PREFIX     || '',
      FNAME:      a.FNAME      || '',
      LNAME:      a.LNAME      || '',
      GENDER:     a.GENDER     || '',
      OLD_SCHOOL: a.OLD_SCHOOL || '',
      STUDY_PLAN: a.STUDY_PLAN || '',
      STATUS:     a.STATUS     || '',
      LEVEL:      a.LEVEL      || '',
    };
  });

  // สถิติสรุป: จำนวนต่อห้อง / ต่อแผน
  const rooms = {};
  result.forEach(function(a) {
    const r = a.EXAM_ROOM || 'ไม่ระบุห้อง';
    rooms[r] = (rooms[r] || 0) + 1;
  });
  const plans = {};
  result.forEach(function(a) {
    const p = a.STUDY_PLAN || 'ไม่ระบุแผน';
    plans[p] = (plans[p] || 0) + 1;
  });

  _logWithRole('ADMIN', 'ADMIN', 'GET_EXAM_SIGN_SHEET',
    level + ' ' + (studyPlan || 'ทุกแผน') + ' → ' + result.length + ' คน');

  return {
    ok:         true,
    applicants: result,
    total:      result.length,
    rooms:      rooms,
    plans:      plans,
    level:      level,
    studyPlan:  studyPlan || '',
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

// ─── SHEET → SUPABASE SYNC (Sheet เป็นหลัก เสมอ) ───
// Cache key สำหรับเก็บสถานะ sync ล่าสุด
const _SYNC_STATUS_CACHE = 'sync_status_v1';

/**
 * syncSheetToSupabase(token)
 * ─────────────────────────────────────────────────────
 * หลักการ: Google Sheet คือ source of truth
 *   1. อ่านข้อมูลทั้งหมดจาก Applications sheet
 *   2. Upsert ทุกแถว → Supabase (on_conflict APP_ID)
 *   3. ดึง APP_ID ทั้งหมดจาก Supabase → ลบรายการที่ไม่มีใน Sheet (orphan)
 *   4. บันทึกผลใน Settings: LAST_SYNC_AT, LAST_SYNC_RESULT
 * ผลลัพธ์: { ok, upserted, deleted, failed, duration_ms, syncedAt }
 */
function syncSheetToSupabase(token) {
  const sess = _requirePerm(token, 'BACKUP');
  if (!SUPA_ENABLED) return { ok:false, msg:'Supabase ไม่ได้เปิดใช้งาน (กรุณาตั้งค่า SUPA_URL และ SUPA_KEY)' };

  const startTime = Date.now();
  const apps = _sheetData(SH.APP);

  // ── ขั้น 1: Upsert ทุกแถวจาก Sheet → Supabase ──
  let upserted = 0, failed = 0;
  apps.forEach(function(a) {
    try {
      const r = _supaUpsert('applications', _toSupaRec(a));
      r !== null ? upserted++ : failed++;
    } catch(e) {
      failed++;
      Logger.log('syncSheet upsert error: ' + e + ' appId:' + a.APP_ID);
    }
  });

  // ── ขั้น 2: ดึง APP_ID ทั้งหมดจาก Supabase → ลบ orphan ──
  let deleted = 0;
  try {
    const supaRows = _supaGetAll('applications');
    if (supaRows && Array.isArray(supaRows)) {
      const sheetIds = new Set(apps.map(function(a){ return String(a.APP_ID || '').trim(); }));
      const orphans  = supaRows
        .map(function(r){ return String(r.app_id || '').trim(); })
        .filter(function(id){ return id && !sheetIds.has(id); });

      orphans.forEach(function(id) {
        try {
          _supaDelete('applications', id);
          deleted++;
        } catch(e) {
          Logger.log('syncSheet delete orphan error: ' + e + ' appId:' + id);
        }
      });
    }
  } catch(e) {
    Logger.log('syncSheet fetch supabase ids error: ' + e);
  }

  const duration = Date.now() - startTime;
  const syncedAt = new Date().toISOString();
  const result   = { upserted:upserted, deleted:deleted, failed:failed, duration_ms:duration, syncedAt:syncedAt };

  // ── ขั้น 3: บันทึกสถานะ sync ใน Settings ──
  try {
    _withLock(function() {
      const sh   = _sheet(SH.SETTINGS);
      const vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
      const keyMap = {};
      vals.forEach(function(r, i){ if (i > 0 && r[0]) keyMap[String(r[0]).trim()] = i + 1; });

      const updates = {
        'LAST_SYNC_AT':     syncedAt,
        'LAST_SYNC_RESULT': JSON.stringify(result),
        'LAST_SYNC_BY':     sess.name + ' (' + sess.role + ')',
      };
      Object.entries(updates).forEach(function([k, v]) {
        if (keyMap[k]) sh.getRange(keyMap[k], 2).setValue(v);
        else           sh.appendRow([k, v]);
      });
      _CACHE.remove(_CFG_CACHE);
    });
  } catch(e) {
    Logger.log('syncSheet save status error: ' + e);
  }

  // ── ขั้น 4: Audit log ──
  _logWithRole(sess.name, sess.role, 'SYNC_SHEET_TO_SUPA',
    'upserted:' + upserted + ' deleted:' + deleted + ' failed:' + failed +
    ' (' + duration + 'ms)');

  return { ok: failed === 0, upserted:upserted, deleted:deleted, failed:failed,
           duration_ms:duration, syncedAt:syncedAt };
}

/**
 * getSyncStatus(token)
 * ─────────────────────────────────────────────────────
 * ดึงสถานะ sync ล่าสุด และ trigger config
 */
function getSyncStatus(token) {
  _requireAuth(token);
  const cfg = getSettings();

  // parse ผล sync ล่าสุด
  let lastResult = null;
  try {
    const raw = String(cfg.LAST_SYNC_RESULT || '');
    if (raw && raw.startsWith('{')) lastResult = JSON.parse(raw);
  } catch(e) {}

  // อ่านสถานะ trigger จาก Settings (ไม่ใช้ ScriptApp — ไม่มีสิทธิ์จาก Web App)
  const triggerHours  = String(cfg.SYNC_TRIGGER_HOURS || '').trim();
  const triggerActive = triggerHours !== '' && triggerHours !== '0';

  return {
    ok:            true,
    lastSyncAt:    cfg.LAST_SYNC_AT     || null,
    lastSyncBy:    cfg.LAST_SYNC_BY     || null,
    lastResult:    lastResult,
    triggerActive: triggerActive,
    triggerHours:  triggerHours || null,
  };
}

/**
 * installAutoSyncTrigger(intervalHours)
 * ─────────────────────────────────────────────────────
 * ⚠️  รันใน GAS Editor โดยตรงเท่านั้น (Extensions → Apps Script → Run)
 *     ไม่สามารถเรียกจาก Web App ได้ (ต้องการ auth/script.scriptapp scope)
 *
 * วิธีใช้:
 *   1. เปิด Apps Script Editor
 *   2. เลือกฟังก์ชัน installAutoSyncTrigger แล้วกด ▶ Run
 *   3. อนุญาต permission ครั้งแรก
 *   4. Trigger จะทำงานอัตโนมัติตามรอบที่กำหนด
 */
function installAutoSyncTrigger(intervalHours) {
  var hours = [1, 2, 4, 6, 12, 24].includes(Number(intervalHours))
    ? Number(intervalHours) : 6;

  // ลบ trigger เดิมก่อน
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === '_autoSyncFromTrigger') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // สร้าง trigger ใหม่
  ScriptApp.newTrigger('_autoSyncFromTrigger')
    .timeBased()
    .everyHours(hours)
    .create();

  // บันทึก config ใน Settings เพื่อให้ UI อ่านสถานะได้
  _withLock(function() {
    var sh   = _sheet(SH.SETTINGS);
    var vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
    var keyMap = {};
    vals.forEach(function(r, i){ if (i > 0 && r[0]) keyMap[String(r[0]).trim()] = i + 1; });
    if (keyMap['SYNC_TRIGGER_HOURS']) sh.getRange(keyMap['SYNC_TRIGGER_HOURS'], 2).setValue(String(hours));
    else sh.appendRow(['SYNC_TRIGGER_HOURS', String(hours)]);
    _CACHE.remove(_CFG_CACHE);
  });

  _log('SYSTEM', 'INSTALL_SYNC_TRIGGER', 'ทุก ' + hours + ' ชั่วโมง');
  Logger.log('✅ installAutoSyncTrigger: ตั้ง trigger สำเร็จ — ทุก ' + hours + ' ชั่วโมง');
}

/**
 * uninstallAutoSyncTrigger()
 * ─────────────────────────────────────────────────────
 * ⚠️  รันใน GAS Editor โดยตรงเท่านั้น
 * ลบ trigger _autoSyncFromTrigger ทั้งหมด
 */
function uninstallAutoSyncTrigger() {
  var count = 0;
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === '_autoSyncFromTrigger') {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  });

  // ล้าง config ใน Settings
  _withLock(function() {
    var sh   = _sheet(SH.SETTINGS);
    var vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
    vals.forEach(function(r, i) {
      if (i > 0 && String(r[0]).trim() === 'SYNC_TRIGGER_HOURS') {
        sh.getRange(i + 1, 2).setValue('');
      }
    });
    _CACHE.remove(_CFG_CACHE);
  });

  _log('SYSTEM', 'UNINSTALL_SYNC_TRIGGER', count + ' trigger(s) ถูกลบ');
  Logger.log('✅ uninstallAutoSyncTrigger: ลบ ' + count + ' trigger(s) สำเร็จ');
}

// ชื่อฟังก์ชันเดิม (deprecated — ใช้ installAutoSyncTrigger แทน)
function setupSyncTrigger(token, intervalHours) {
  _requirePerm(token, 'SETTINGS');
  return {
    ok:  false,
    msg: 'กรุณาติดตั้ง Trigger จาก GAS Editor โดยตรง: รัน installAutoSyncTrigger() ใน Apps Script Editor'
  };
}
function removeSyncTrigger(token) {
  _requirePerm(token, 'SETTINGS');
  return {
    ok:  false,
    msg: 'กรุณาลบ Trigger จาก GAS Editor โดยตรง: รัน uninstallAutoSyncTrigger() ใน Apps Script Editor'
  };
}

/**
 * _autoSyncFromTrigger()
 * ─────────────────────────────────────────────────────
 * Entry point สำหรับ GAS Time-based Trigger เรียก
 * ไม่ต้องการ token — ใช้ SYSTEM token แทน
 */
function _autoSyncFromTrigger() {
  if (!SUPA_ENABLED) { Logger.log('_autoSyncFromTrigger: Supabase ไม่ได้เปิดใช้งาน'); return; }

  try {
    const apps = _sheetData(SH.APP);
    let upserted = 0, failed = 0, deleted = 0;

    // Upsert ทุกแถว
    apps.forEach(function(a) {
      try {
        const r = _supaUpsert('applications', _toSupaRec(a));
        r !== null ? upserted++ : failed++;
      } catch(e) { failed++; }
    });

    // ลบ orphan
    try {
      const supaRows = _supaGetAll('applications');
      if (supaRows && Array.isArray(supaRows)) {
        const sheetIds = new Set(apps.map(function(a){ return String(a.APP_ID || '').trim(); }));
        supaRows
          .map(function(r){ return String(r.app_id || '').trim(); })
          .filter(function(id){ return id && !sheetIds.has(id); })
          .forEach(function(id) {
            try { _supaDelete('applications', id); deleted++; } catch(e) {}
          });
      }
    } catch(e) {}

    const syncedAt = new Date().toISOString();
    const result   = { upserted:upserted, deleted:deleted, failed:failed, syncedAt:syncedAt };

    // บันทึกสถานะ
    try {
      const sh   = _sheet(SH.SETTINGS);
      const vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
      const keyMap = {};
      vals.forEach(function(r, i){ if (i > 0 && r[0]) keyMap[String(r[0]).trim()] = i + 1; });
      const updates = {
        'LAST_SYNC_AT':     syncedAt,
        'LAST_SYNC_RESULT': JSON.stringify(result),
        'LAST_SYNC_BY':     'AUTO TRIGGER',
      };
      Object.entries(updates).forEach(function([k, v]) {
        if (keyMap[k]) sh.getRange(keyMap[k], 2).setValue(v);
        else           sh.appendRow([k, v]);
      });
      _CACHE.remove(_CFG_CACHE);
    } catch(e) {}

    _logWithRole('AUTO TRIGGER', 'SYSTEM', 'AUTO_SYNC_SUPA',
      'upserted:' + upserted + ' deleted:' + deleted + ' failed:' + failed);
    Logger.log('_autoSyncFromTrigger done: ' + JSON.stringify(result));

  } catch(e) {
    Logger.log('_autoSyncFromTrigger error: ' + e);
    _log('AUTO TRIGGER', 'AUTO_SYNC_ERROR', String(e));
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

    // ชื่อไฟล์: เลขที่_ระดับ_ชื่อ-นามสกุล
    var level    = String(app.LEVEL  || '').replace(/\./g,'');   // ม1, ม4
    var fullName = [app.PREFIX, app.FNAME, app.LNAME].filter(Boolean).join('');
    var safeName = (app.APP_ID + '_' + level + '_' + fullName)
                    .replace(/[\\\/:*?"<>|\s]/g,'_').replace(/_+/g,'_').trim();
    blob.setName('ใบสมัคร_' + safeName + '.pdf');

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

function _buildEnrollmentPdfHtml(a, cfg, fontFaceCSS, logoDataUri, photoDataUri) {
  var school         = String(cfg.SCHOOL_FULLNAME     || 'โรงเรียนหนองนาคำวิทยาคม');
  var schoolSub      = String(cfg.SCHOOL_SUBDISTRICT  || '');
  var schoolDis      = String(cfg.SCHOOL_DISTRICT     || '');
  var schoolPrv      = String(cfg.SCHOOL_PROVINCE     || '');
  var schoolTel      = String(cfg.SCHOOL_PHONE        || '');
  var principal      = String(cfg.PRINCIPAL_NAME      || '');
  var principalTitle = String(cfg.PRINCIPAL_TITLE     || 'ผู้อำนวยการโรงเรียน');
  var yr             = String(cfg.ACADEMIC_YEAR       || '2568');
  var printDate      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy');

  function _fixDriveUrl(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    var m = u.match(/[?&]id=([\w-]+)/);
    if (!m) m = u.match(/\/d\/([\w-]+)\//);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400';
    return u;
  }
  // ใช้ data URI ที่ดึงมาแล้ว (สำหรับ PDF) หรือ thumbnail URL (สำหรับ print preview)
  var logoSrc  = (logoDataUri  && logoDataUri  !== '') ? logoDataUri  : _fixDriveUrl(cfg.LOGO_URL  || '');
  var photoSrc = (photoDataUri && photoDataUri !== '') ? photoDataUri : _fixDriveUrl(a.PHOTO_URL   || '');

  var E = _pdfSafe;
  var _v   = function(v){ return (v!==null&&v!==undefined&&String(v).trim()!=='') ? E(String(v).trim()) : '\u2013'; };
  var _vb  = function(v){ return (v!==null&&v!==undefined&&String(v).trim()!=='') ? String(v).trim() : ''; };
  var _name = function(p,f,l){ var parts=[p,f,l].filter(Boolean); return parts.length?E(parts.join(' ')):'\u2013'; };
  var _addr = function(addr,sub,dis,prv,zip){
    var bits=[]; if(addr)bits.push(addr); if(sub)bits.push('\u0e15.'+sub);
    if(dis)bits.push('\u0e2d.'+dis); if(prv)bits.push('\u0e08.'+prv); if(zip)bits.push(zip);
    return bits.length ? E(bits.join(' ')) : '\u2013';
  };
  var _currAddr = function(same,addr,sub,dis,prv,zip){
    return String(same)==='true'?'(\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e40\u0e14\u0e35\u0e22\u0e27\u0e01\u0e31\u0e1a\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19)'
           :_addr(addr,sub,dis,prv,zip);
  };
  var _phone = function(v){
    var s=String(v===null||v===undefined?'':v).trim();
    if(!s||s==='0')return '\u2013';
    if(/^\d{9}$/.test(s))s='0'+s;
    return E(s);
  };
  var _inc = function(v){ return (v&&String(v)!=='0')?Number(v).toLocaleString()+' \u0e1a\u0e32\u0e17/\u0e40\u0e14\u0e37\u0e2d\u0e19':'\u2013'; };
  var idFmt = function(id){
    var s=String(id||'').replace(/\D/g,'');
    if(s.length!==13)return _v(id);
    return E(s[0]+'-'+s.slice(1,5)+'-'+s.slice(5,10)+'-'+s.slice(10,12)+'-'+s[12]);
  };
  var num = function(v){ return (v!==null&&v!==undefined&&String(v).trim()!=='')?E(String(v).trim()):'0'; };

  var fullName   = _name(a.PREFIX,a.FNAME,a.LNAME);
  var fatherName = _name(a.FATHER_PREFIX,a.FATHER_FNAME,a.FATHER_LNAME);
  var motherName = _name(a.MOTHER_PREFIX,a.MOTHER_FNAME,a.MOTHER_LNAME);
  var regAddr    = _addr(a.ADDRESS,a.SUBDISTRICT,a.DISTRICT,a.PROVINCE,a.ZIP);
  var currAddr   = _currAddr(a.CURR_SAME,a.CURR_ADDRESS,a.CURR_SUBDISTRICT,a.CURR_DISTRICT,a.CURR_PROVINCE,a.CURR_ZIP);
  var oldSchoolLoc = [a.OLD_SCHOOL_DISTRICT&&('\u0e2d.'+a.OLD_SCHOOL_DISTRICT), a.OLD_SCHOOL_PROVINCE&&('\u0e08.'+a.OLD_SCHOOL_PROVINCE)].filter(Boolean).join(' ');

  var gName = '\u2013', gRel = '\u2013', gPhone = '\u2013';
  var gType = _vb(a.GUARDIAN_TYPE);
  if(gType==='\u0e1a\u0e34\u0e14\u0e32'){gName=fatherName;gRel='\u0e1a\u0e34\u0e14\u0e32';gPhone=_phone(a.FATHER_PHONE);}
  else if(gType==='\u0e21\u0e32\u0e23\u0e14\u0e32'){gName=motherName;gRel='\u0e21\u0e32\u0e23\u0e14\u0e32';gPhone=_phone(a.MOTHER_PHONE);}
  else{gName=_v(a.GUARDIAN_NAME);gRel=_v(a.GUARDIAN_RELATION);gPhone=_phone(a.GUARDIAN_PHONE);}

  var healthArr = [
    _vb(a.DISABILITY)&&('\u0e04\u0e27\u0e32\u0e21\u0e1e\u0e34\u0e01\u0e32\u0e23: '+a.DISABILITY),
    _vb(a.DISEASE)&&('\u0e42\u0e23\u0e04\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27: '+a.DISEASE),
    _vb(a.HEALTH_NOTE)&&('\u0e2d\u0e37\u0e48\u0e19\u0e46: '+a.HEALTH_NOTE),
  ].filter(Boolean);

  var logoHtml  = logoSrc  ? '<img src="'+logoSrc +'" style="width:100%;height:100%;object-fit:contain;display:block">'
                           : '<div class="logo-fb">&#127979;</div>';
  var photoHtml = photoSrc ? '<img src="'+photoSrc+'" style="width:100%;height:100%;object-fit:cover;display:block">'
                           : '<div class="ph-ph"><div>\u0e15\u0e34\u0e14\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22</div><div class="ph-sub">\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e23\u0e07 \u0e1e\u0e37\u0e49\u0e19\u0e02\u0e32\u0e27</div></div>';

  var R2 = function(l1,v1,l2,v2){
    return '<tr><td class="lbl">'+E(l1)+'</td><td class="val">'+v1+'</td><td class="lbl">'+E(l2)+'</td><td class="val">'+v2+'</td></tr>';
  };
  var R = function(l,v){
    return '<tr><td class="lbl">'+E(l)+'</td><td class="val sm" colspan="3">'+v+'</td></tr>';
  };

  var schoolAddr = [schoolSub&&('\u0e15.'+schoolSub),schoolDis&&('\u0e2d.'+schoolDis),schoolPrv&&('\u0e08.'+schoolPrv)].filter(Boolean).join(' \u00b7 ');
  if(schoolTel) schoolAddr += (schoolAddr?' \u00b7 ':'')+' \u0e42\u0e17\u0e23. '+schoolTel;

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">'+
'<style>'+
(fontFaceCSS || '')+
'*{box-sizing:border-box;margin:0;padding:0}'+
'@page{size:A4 portrait;margin:5mm 8mm 5mm 18mm}'+
'html,body{background:#fff;font-family:"Sarabun","Noto Sans Thai","TH Sarabun New",Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:8.4pt;line-height:1.28}'+
'.sheet{width:100%;background:#fff;padding:0;position:relative;display:flex;flex-direction:column;min-height:calc(297mm - 10mm)}'+
'.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60pt;font-weight:700;color:rgba(26,58,107,.028);transform:rotate(-28deg);pointer-events:none;overflow:hidden;z-index:0}'+
'.sheet>*{position:relative;z-index:1}'+
'.hdr{border-top:2.5pt solid #1a3a6b;border-bottom:2.5pt solid #1a3a6b;padding:2.5mm 0;margin-bottom:2mm;display:grid;grid-template-columns:20mm 1fr 30mm;gap:4mm;align-items:center}'+
'.logo{width:20mm;height:20mm;display:flex;align-items:center;justify-content:center}'+
'.logo-fb{width:20mm;height:20mm;border:1pt solid #b6c2d3;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14pt;background:#f5f8fc}'+
'.hc{text-align:center}.hc-title{font-size:15.5pt;font-weight:700;color:#1a3a6b;line-height:1.15;margin:.5mm 0 .4mm}'+
'.hc-yr{font-size:9pt;font-weight:700;color:#1a3a6b;margin-bottom:.4mm}'+
'.hc-school{font-size:9pt;font-weight:700;color:#1a3a6b}'+
'.hc-addr{font-size:7pt;color:#666;margin-top:.4mm}'+
'.photo{width:30mm;height:36mm;border:1pt solid #8896a4;overflow:hidden;background:#f5f7fa}'+
'.ph-ph{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#aab;text-align:center;padding:3px;gap:1mm}'+
'.ph-sub{font-size:6.2pt;opacity:.75}'+
'.strip{display:grid;grid-template-columns:repeat(5,1fr);gap:1mm;margin-bottom:2mm}'+
'.sc{border:.5pt solid #b8c8d8;background:#eef3fa;padding:.8mm 1.8mm}'+
'.sc-k{font-size:6.3pt;color:#607282;line-height:1.2}.sc-v{font-size:8.5pt;font-weight:700;color:#1a3a6b;margin-top:.2mm;line-height:1.2}'+
'.sec{margin-bottom:2mm}.sec-hd{background:#1a3a6b;color:#fff;padding:.8mm 2.4mm;font-size:8pt;font-weight:700;letter-spacing:.15px;display:flex;align-items:center;gap:3mm}'+
'.sn{font-size:9pt;min-width:5mm;opacity:.75}'+
'.dt{width:100%;border-collapse:collapse}.dt td{border:.5pt solid #ccd6e0;padding:.8mm 1.6mm;vertical-align:middle;font-size:7.8pt;line-height:1.3}'+
'.lbl{background:#edf2f8;color:#3a5070;font-weight:700;font-size:6.8pt;white-space:nowrap;width:1%}'+
'.val{color:#111}.mno{font-family:"Courier New",monospace;letter-spacing:.5px;font-size:7.5pt}'+
'.sm{font-size:7.2pt}.bold{font-weight:700;font-size:9pt}.red{color:#b92020}'+
'.two{display:grid;grid-template-columns:56% 44%;gap:2mm;margin-top:1mm}'+
'.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm;margin-top:1mm}'+
'.phr-hd{background:#dce9f6;color:#1a3a6b;font-weight:700;text-align:center;font-size:7.3pt}'+
'.divider{display:flex;align-items:center;gap:3mm;margin:2.5mm 0 2mm}'+
'.divline{flex:1;border-top:1pt solid #1a3a6b}'+
'.divtxt{background:#1a3a6b;color:#fff;font-size:8.5pt;font-weight:700;padding:1.2mm 7mm;letter-spacing:.6px;white-space:nowrap}'+
'.mb-grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:2mm}'+
'.chk-box,.pledge{border:.5pt solid #b8c8d8;padding:1.5mm 2.5mm}'+
'.chk-title,.pledge-t{font-size:7.5pt;font-weight:700;color:#1a3a6b;margin-bottom:1.5mm}'+
'.chk-items{display:grid;grid-template-columns:1fr 1fr;gap:.5mm 4mm}'+
'.chk-row{display:flex;align-items:center;gap:2mm;font-size:7.2pt;line-height:1.5}'+
'.chk-sq{width:9px;height:9px;border:.8pt solid #555;flex-shrink:0;display:inline-block}'+
'.pledge-p{font-size:7.3pt;color:#222;line-height:1.6}.pledge-p u{text-decoration-color:#888}'+
'.sig-row{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm;margin-bottom:1.5mm}'+
'.sig{border:.5pt solid #b8c8d8;min-height:19mm;padding:1.5mm;text-align:center}'+
'.sig-t{font-size:7pt;font-weight:700;color:#1a3a6b;margin-bottom:6mm}'+
'.sig-ln{border-top:.8pt dotted #888;margin:0 3mm;padding-top:.8mm}'+
'.sig-n{font-size:6.8pt;min-height:3mm;color:#333}.sig-d{font-size:6.3pt;color:#888;margin-top:.3mm}'+
'.offi{border:1pt solid #1a3a6b}.offi-hd{background:#1a3a6b;color:#fff;font-size:7.5pt;font-weight:700;padding:.8mm 2.5mm}'+
'.offi-cells{display:grid;grid-template-columns:repeat(5,1fr)}'+
'.oc{padding:1.5mm 2mm;border-right:.5pt solid #ccd6e0;min-height:11mm}.oc:last-child{border-right:none}'+
'.oc-k{font-size:6.3pt;color:#607282}.oc-v{font-size:7.5pt;font-weight:600;border-bottom:.5pt dotted #aaa;min-height:4mm;margin-top:.8mm}'+
'.doc-ft{display:flex;justify-content:space-between;align-items:center;font-size:6.3pt;color:#aaa;margin-top:auto;padding-top:2mm;border-top:.5pt dotted #ccc}'+
'</style></head><body><div class="sheet">'+
'<div class="wm">'+E(_v(a.APP_ID))+'</div>'+

'<div class="hdr">'+
'<div class="logo">'+logoHtml+'</div>'+
'<div class="hc">'+
'<div class="hc-title">\u0e43\u0e1a\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e40\u0e02\u0e49\u0e32\u0e40\u0e23\u0e35\u0e22\u0e19 \u0e41\u0e25\u0e30\u0e43\u0e1a\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div>'+
'<div class="hc-yr">\u0e1b\u0e35\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32 '+E(yr)+'</div>'+
'<div class="hc-school">'+E(school)+'</div>'+
'<div class="hc-addr">'+E(schoolAddr)+'</div>'+
'</div>'+
'<div class="photo">'+photoHtml+'</div>'+
'</div>'+

'<div class="strip">'+
'<div class="sc"><div class="sc-k">\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e43\u0e1a\u0e2a\u0e21\u0e31\u0e04\u0e23</div><div class="sc-v">'+_v(a.APP_ID)+'</div></div>'+
'<div class="sc"><div class="sc-k">\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e0a\u0e31\u0e49\u0e19\u0e17\u0e35\u0e48\u0e2a\u0e21\u0e31\u0e04\u0e23</div><div class="sc-v">'+_v(a.LEVEL)+'</div></div>'+
'<div class="sc"><div class="sc-k">\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17\u0e01\u0e32\u0e23\u0e2a\u0e21\u0e31\u0e04\u0e23</div><div class="sc-v" style="font-size:7pt">'+_v(a.APP_TYPE)+'</div></div>'+
'<div class="sc"><div class="sc-k">\u0e40\u0e25\u0e02\u0e19\u0e31\u0e48\u0e07\u0e2a\u0e2d\u0e1a</div><div class="sc-v">'+E(a.EXAM_NO||'\u2013')+'</div></div>'+
'<div class="sc"><div class="sc-k">\u0e2a\u0e16\u0e32\u0e19\u0e30</div><div class="sc-v" style="font-size:7pt">'+_v(a.STATUS)+'</div></div>'+
'</div>'+

'<div class="sec"><div class="sec-hd"><span class="sn">&#3665;</span>\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div>'+
'<div class="two">'+
'<table class="dt">'+
'<tr><td class="lbl">\u0e0a\u0e37\u0e48\u0e2d\u2013\u0e19\u0e32\u0e21\u0e2a\u0e01\u0e38\u0e25</td><td class="val bold" colspan="3">'+fullName+'</td></tr>'+
'<tr><td class="lbl">\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1b\u0e23\u0e30\u0e0a\u0e32\u0e0a\u0e19</td><td class="val mno" colspan="3">'+idFmt(a.ID_CARD)+'</td></tr>'+
R2('\u0e27\u0e31\u0e19\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e1b\u0e35\u0e40\u0e01\u0e34\u0e14',_v(a.BIRTHDATE),'\u0e40\u0e1e\u0e28',_v(a.GENDER))+
R2('\u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34',_v(a.NATIONALITY||'\u0e44\u0e17\u0e22'),'\u0e28\u0e32\u0e2a\u0e19\u0e32',_v(a.RELIGION||'\u0e1e\u0e38\u0e17\u0e18'))+
R2('\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c',_phone(a.PHONE),'\u0e19\u0e49\u0e33\u0e2b\u0e19\u0e31\u0e01 / \u0e2a\u0e48\u0e27\u0e19\u0e2a\u0e39\u0e07',(a.WEIGHT_KG?a.WEIGHT_KG+' \u0e01\u0e01.':'\u2013')+' / '+(a.HEIGHT_CM?a.HEIGHT_CM+' \u0e0b\u0e21.':'\u2013'))+
'<tr><td class="lbl">\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19</td><td class="val sm" colspan="3">'+regAddr+(_vb(a.HOUSE_CODE)?' <span style="color:#607282;font-size:6.8pt">(\u0e23\u0e2b\u0e31\u0e2a\u0e1a\u0e49\u0e32\u0e19: '+E(a.HOUSE_CODE)+')</span>':'')+'</td></tr>'+
'<tr><td class="lbl">\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e1b\u0e31\u0e08\u0e08\u0e38\u0e1a\u0e31\u0e19</td><td class="val sm" colspan="3">'+currAddr+'</td></tr>'+
(healthArr.length?'<tr><td class="lbl">\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2a\u0e38\u0e02\u0e20\u0e32\u0e1e</td><td class="val sm red" colspan="3">'+E(healthArr.join(' \u00b7 '))+'</td></tr>':'')+
'</table>'+
'<table class="dt">'+
'<tr><td class="lbl">\u0e1e\u0e35\u0e48\u0e19\u0e49\u0e2d\u0e07\u0e0a\u0e32\u0e22 / \u0e2b\u0e0d\u0e34\u0e07</td><td class="val sm">'+num(a.SIBLINGS_MALE)+' \u0e04\u0e19 / '+num(a.SIBLINGS_FEMALE)+' \u0e04\u0e19 (\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19 '+num(a.STUDYING_COUNT)+' \u0e04\u0e19)</td></tr>'+
'<tr><td class="lbl">\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e40\u0e14\u0e34\u0e21</td><td class="val sm">'+_v(a.OLD_SCHOOL)+(oldSchoolLoc?' <span style="color:#607282;font-size:6.8pt">('+E(oldSchoolLoc)+')</span>':'')+'</td></tr>'+
R2('\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e0a\u0e31\u0e49\u0e19\u0e17\u0e35\u0e48\u0e08\u0e1a',_v(a.OLD_LEVEL),'\u0e40\u0e01\u0e23\u0e14\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22 (GPA)',_v(a.GPA))+
'<tr><td class="lbl">\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19</td><td class="val sm">'+_v(a.STUDY_PLAN)+(_vb(a.STUDY_PLAN_ALT)?' <span style="font-size:6.8pt;color:#607282">(\u0e2a\u0e33\u0e23\u0e2d\u0e07: '+E(a.STUDY_PLAN_ALT)+')</span>':'')+'</td></tr>'+
'</table>'+
'</div></div>'+

'<div class="sec"><div class="sec-hd"><span class="sn">&#3666;</span>\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1a\u0e34\u0e14\u0e32 \u0e21\u0e32\u0e23\u0e14\u0e32 \u0e41\u0e25\u0e30\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07</div>'+
'<div class="three">'+
'<table class="dt">'+
'<tr><td class="lbl phr-hd" colspan="2">\u0e1a\u0e34\u0e14\u0e32</td></tr>'+
'<tr><td class="lbl">\u0e0a\u0e37\u0e48\u0e2d\u2013\u0e2a\u0e01\u0e38\u0e25</td><td class="val sm">'+fatherName+'</td></tr>'+
'<tr><td class="lbl">\u0e2a\u0e16\u0e32\u0e19\u0e20\u0e32\u0e1e</td><td class="val sm">'+_v(a.FATHER_STATUS||'\u0e21\u0e35\u0e0a\u0e35\u0e27\u0e34\u0e15')+'</td></tr>'+
'<tr><td class="lbl">\u0e2d\u0e32\u0e0a\u0e35\u0e1e</td><td class="val sm">'+_v(a.FATHER_OCCUPATION)+'</td></tr>'+
'<tr><td class="lbl">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49/\u0e40\u0e14\u0e37\u0e2d\u0e19</td><td class="val sm">'+_inc(a.FATHER_INCOME)+'</td></tr>'+
'<tr><td class="lbl">\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c</td><td class="val">'+_phone(a.FATHER_PHONE)+'</td></tr>'+
'</table>'+
'<table class="dt">'+
'<tr><td class="lbl phr-hd" colspan="2">\u0e21\u0e32\u0e23\u0e14\u0e32</td></tr>'+
'<tr><td class="lbl">\u0e0a\u0e37\u0e48\u0e2d\u2013\u0e2a\u0e01\u0e38\u0e25</td><td class="val sm">'+motherName+'</td></tr>'+
'<tr><td class="lbl">\u0e2a\u0e16\u0e32\u0e19\u0e20\u0e32\u0e1e</td><td class="val sm">'+_v(a.MOTHER_STATUS||'\u0e21\u0e35\u0e0a\u0e35\u0e27\u0e34\u0e15')+'</td></tr>'+
'<tr><td class="lbl">\u0e2d\u0e32\u0e0a\u0e35\u0e1e</td><td class="val sm">'+_v(a.MOTHER_OCCUPATION)+'</td></tr>'+
'<tr><td class="lbl">\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49/\u0e40\u0e14\u0e37\u0e2d\u0e19</td><td class="val sm">'+_inc(a.MOTHER_INCOME)+'</td></tr>'+
'<tr><td class="lbl">\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c</td><td class="val">'+_phone(a.MOTHER_PHONE)+'</td></tr>'+
'</table>'+
'<table class="dt">'+
'<tr><td class="lbl phr-hd" colspan="2">\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07</td></tr>'+
'<tr><td class="lbl">\u0e0a\u0e37\u0e48\u0e2d\u2013\u0e2a\u0e01\u0e38\u0e25</td><td class="val sm">'+gName+'</td></tr>'+
'<tr><td class="lbl">\u0e04\u0e27\u0e32\u0e21\u0e2a\u0e31\u0e21\u0e1e\u0e31\u0e19\u0e18\u0e4c</td><td class="val sm">'+gRel+'</td></tr>'+
'<tr><td class="lbl">\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e04\u0e23\u0e2d\u0e1a\u0e04\u0e23\u0e31\u0e27</td><td class="val sm">'+_v(a.PARENT_COUPLE_RELATION)+'</td></tr>'+
'<tr><td class="lbl">\u0e42\u0e17\u0e23\u0e28\u0e31\u0e1e\u0e17\u0e4c</td><td class="val">'+gPhone+'</td></tr>'+
'<tr><td class="lbl">&nbsp;</td><td class="val">&nbsp;</td></tr>'+
'</table>'+
'</div></div>'+

'<div class="divider"><div class="divline"></div><div class="divtxt">\u0e2a\u0e48\u0e27\u0e19\u0e17\u0e35\u0e48 \u0e52 \u2014 \u0e43\u0e1a\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div><div class="divline"></div></div>'+

'<div class="mb-grid">'+
'<div class="chk-box"><div class="chk-title">\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e17\u0e35\u0e48\u0e19\u0e33\u0e21\u0e32\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27 (\u0e40\u0e08\u0e49\u0e32\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e15\u0e23\u0e27\u0e08\u0e2a\u0e2d\u0e1a)</div>'+
'<div class="chk-items">'+
['\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19\u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19',
 '\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e1a\u0e31\u0e15\u0e23\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1b\u0e23\u0e30\u0e0a\u0e32\u0e0a\u0e19\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19',
 '\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e17\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e19\u0e1a\u0e49\u0e32\u0e19\u0e1a\u0e34\u0e14\u0e32/\u0e21\u0e32\u0e23\u0e14\u0e32/\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07',
 '\u0e2a\u0e33\u0e40\u0e19\u0e32\u0e1a\u0e31\u0e15\u0e23\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1b\u0e23\u0e30\u0e0a\u0e32\u0e0a\u0e19\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07',
 '\u0e1b\u0e1e.1 \u0e2b\u0e23\u0e37\u0e2d\u0e43\u0e1a\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19',
 '\u0e23\u0e39\u0e1b\u0e16\u0e48\u0e32\u0e22\u0e15\u0e32\u0e21\u0e17\u0e35\u0e48\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e01\u0e33\u0e2b\u0e19\u0e14',
 '\u0e2b\u0e25\u0e31\u0e01\u0e10\u0e32\u0e19\u0e40\u0e1b\u0e25\u0e35\u0e48\u0e22\u0e19\u0e0a\u0e37\u0e48\u0e2d-\u0e2a\u0e01\u0e38\u0e25 (\u0e16\u0e49\u0e32\u0e21\u0e35)',
 '\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e37\u0e48\u0e19 \u0e46 (\u0e16\u0e49\u0e32\u0e21\u0e35) ...............................'].map(function(d){return '<div class="chk-row"><span class="chk-sq"></span><span>'+d+'</span></div>';}).join('')+
'</div></div>'+
'<div class="pledge"><div class="pledge-t">\u0e04\u0e33\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07\u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e41\u0e25\u0e30\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07</div>'+
'<div class="pledge-p">\u0e02\u0e49\u0e32\u0e1e\u0e40\u0e08\u0e49\u0e32 <u>'+fullName+'</u> \u0e1c\u0e39\u0e49\u0e2a\u0e21\u0e31\u0e04\u0e23 \u0e41\u0e25\u0e30 <u>'+(gName!=='\u2013'?gName:'........................................')+'</u> \u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07 \u0e02\u0e2d\u0e23\u0e31\u0e1a\u0e23\u0e2d\u0e07\u0e27\u0e48\u0e32\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e41\u0e25\u0e30\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e01\u0e2d\u0e1a\u0e01\u0e32\u0e23\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e09\u0e1a\u0e31\u0e1a\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e04\u0e27\u0e32\u0e21\u0e08\u0e23\u0e34\u0e07\u0e17\u0e38\u0e01\u0e1b\u0e23\u0e30\u0e01\u0e32\u0e23 \u0e41\u0e25\u0e30\u0e02\u0e2d\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e40\u0e02\u0e49\u0e32\u0e28\u0e36\u0e01\u0e29\u0e32\u0e23\u0e30\u0e14\u0e31\u0e1a <strong>'+_v(a.LEVEL)+'</strong> \u0e02\u0e2d\u0e07<strong>'+E(school)+'</strong> \u0e1b\u0e35\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32 <strong>'+E(yr)+'</strong> \u0e42\u0e14\u0e22\u0e22\u0e34\u0e19\u0e22\u0e2d\u0e21\u0e43\u0e2b\u0e49\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1b\u0e0f\u0e34\u0e1a\u0e31\u0e15\u0e34\u0e15\u0e32\u0e21\u0e23\u0e30\u0e40\u0e1a\u0e35\u0e22\u0e1a\u0e02\u0e2d\u0e07\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e17\u0e38\u0e01\u0e1b\u0e23\u0e30\u0e01\u0e32\u0e23</div></div>'+
'</div>'+

'<div class="sig-row">'+
'<div class="sig"><div class="sig-t">\u0e25\u0e32\u0e22\u0e21\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d\u0e1c\u0e39\u0e49\u0e2a\u0e21\u0e31\u0e04\u0e23&nbsp;/&nbsp;\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div><div class="sig-ln"></div><div class="sig-n">('+fullName+')</div><div class="sig-d">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 &nbsp;......&nbsp;/&nbsp;......&nbsp;/&nbsp;..........</div></div>'+
'<div class="sig"><div class="sig-t">\u0e25\u0e32\u0e22\u0e21\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07</div><div class="sig-ln"></div><div class="sig-n">('+gName+')</div><div class="sig-d">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 &nbsp;......&nbsp;/&nbsp;......&nbsp;/&nbsp;..........</div></div>'+
'<div class="sig"><div class="sig-t">\u0e25\u0e32\u0e22\u0e21\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d\u0e40\u0e08\u0e49\u0e32\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48\u0e23\u0e31\u0e1a\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27</div><div class="sig-ln"></div><div class="sig-n">(..........................................)</div><div class="sig-d">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 &nbsp;......&nbsp;/&nbsp;......&nbsp;/&nbsp;..........</div></div>'+
'<div class="sig"><div class="sig-t">\u0e25\u0e32\u0e22\u0e21\u0e37\u0e2d\u0e0a\u0e37\u0e48\u0e2d '+E(principalTitle)+'</div><div class="sig-ln"></div><div class="sig-n">('+E(principal||'..........................................')+')</div><div class="sig-d">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 &nbsp;......&nbsp;/&nbsp;......&nbsp;/&nbsp;..........</div></div>'+
'</div>'+

'<div class="offi"><div class="offi-hd">\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e40\u0e08\u0e49\u0e32\u0e2b\u0e19\u0e49\u0e32\u0e17\u0e35\u0e48 \u2014 \u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e01\u0e32\u0e23\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19\u0e15\u0e31\u0e27\u0e41\u0e25\u0e30\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div>'+
'<div class="offi-cells">'+
'<div class="oc"><div class="oc-k">\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19\u0e15\u0e31\u0e27\u0e41\u0e25\u0e30\u0e21\u0e2d\u0e1a\u0e15\u0e31\u0e27</div><div class="oc-v">&nbsp;</div></div>'+
'<div class="oc"><div class="oc-k">\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19</div><div class="oc-v">&nbsp;</div></div>'+
'<div class="oc"><div class="oc-k">\u0e2b\u0e49\u0e2d\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19 / \u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19</div><div class="oc-v">&nbsp;</div></div>'+
'<div class="oc"><div class="oc-k">\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e43\u0e19\u0e2b\u0e49\u0e2d\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19</div><div class="oc-v">&nbsp;</div></div>'+
'<div class="oc"><div class="oc-k">\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38</div><div class="oc-v">&nbsp;</div></div>'+
'</div></div>'+

'<div class="doc-ft">'+
'<span>\u0e08\u0e31\u0e14\u0e17\u0e33\u0e42\u0e14\u0e22\u0e23\u0e30\u0e1a\u0e1a\u0e23\u0e31\u0e1a\u0e2a\u0e21\u0e31\u0e04\u0e23\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e2d\u0e19\u0e44\u0e25\u0e19\u0e4c &nbsp;\u00b7&nbsp; '+E(school)+' &nbsp;\u00b7&nbsp; \u0e1b\u0e35\u0e01\u0e32\u0e23\u0e28\u0e36\u0e01\u0e29\u0e32 '+E(yr)+'</span>'+
'<span>\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e43\u0e1a\u0e2a\u0e21\u0e31\u0e04\u0e23 '+_v(a.APP_ID)+' &nbsp;\u00b7&nbsp; \u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48 '+E(printDate)+'</span>'+
'</div>'+
'</div></body></html>';
}



function _pdfSafe(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}