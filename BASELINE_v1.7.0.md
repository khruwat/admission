# ระบบรับสมัครนักเรียน — BASELINE v1.7.0
**โรงเรียนหนองนาคำวิทยาคม** · ตำบลบ้านโคก อำเภอหนองนาคำ จังหวัดขอนแก่น  
Baselined: **16 มีนาคม 2569**  
Files: `code.gs` (~1,250 lines) · `index.html` (4,196 lines)

---

## 1. TECH STACK

| Layer | Technology |
|---|---|
| Backend | Google Apps Script (GAS) — `code.gs` |
| Frontend | Single HTML file — `index.html` (SPA, no framework) |
| Database | Google Sheets (4 sheets) |
| File Storage | Google Drive (rูปภาพผู้สมัคร + โลโก้) |
| Cache | CacheService (Script) — session token 3 ชั่วโมง, settings 60s |
| Locking | LockService (Script) — ทุก write operation |

---

## 2. GOOGLE SHEETS STRUCTURE

### Sheet: `Applications`
Header row = `APP_COLS` (53 columns):
```
APP_ID, LEVEL, APP_TYPE, PREFIX, FNAME, LNAME, ID_CARD,
BIRTHDATE, NATIONALITY, RELIGION,
ADDRESS, SUBDISTRICT, DISTRICT, PROVINCE, ZIP,
PHONE, PHOTO_URL,
FATHER_PREFIX, FATHER_FNAME, FATHER_LNAME, FATHER_ID_CARD,
FATHER_OCCUPATION, FATHER_INCOME, FATHER_PHONE, FATHER_STATUS,
MOTHER_PREFIX, MOTHER_FNAME, MOTHER_LNAME, MOTHER_ID_CARD,
MOTHER_OCCUPATION, MOTHER_INCOME, MOTHER_PHONE, MOTHER_STATUS,
GUARDIAN_TYPE, GUARDIAN_NAME, GUARDIAN_RELATION, GUARDIAN_ID_CARD, GUARDIAN_PHONE,
PARENT_COUPLE_RELATION,
OLD_SCHOOL, OLD_STUDENT_ID, OLD_LEVEL, GPA, SPECIAL_ABILITY,
STUDY_PLAN, STUDY_PLAN_ALT, TRANSFER_LEVEL,
STATUS, EXAM_NO, EXAM_ROOM, SCORE, RESULT_NOTE,
REMARK, CREATED_AT, UPDATED_AT
```

**TEXT_COLS** (ต้อง setNumberFormat('@') ก่อน setValue):
```
ID_CARD, ZIP, PHONE, PARENT_PHONE, EXAM_NO, APP_ID, EXAM_ROOM,
OLD_STUDENT_ID, FATHER_ID_CARD, MOTHER_ID_CARD, GUARDIAN_ID_CARD,
FATHER_PHONE, MOTHER_PHONE, GUARDIAN_PHONE
```

**STATUSES**: `['สมัครแล้ว','ชำระเงินแล้ว','มีสิทธิ์สอบ','ผ่าน','ไม่ผ่าน']`

**APP_ID format**: `68-M1-0001` (ปีการศึกษา 2 หลัก - M1/M4/TX - running 4 หลัก)
- ม.1 → `M1`, ม.4 → `M4`, ย้ายเข้า → `TX`

### Sheet: `Users`
Columns: `USERNAME, PASSWORD, NAME, ROLE, LAST_LOGIN`  
- ROLE values: `ADMIN` | `STAFF`
- Default: admin / admin1234

### Sheet: `Settings`
Columns: `KEY, VALUE` — ทุก cell ใน column VALUE ต้อง setNumberFormat('@')

**SETTINGS_DEFAULTS keys:**
```
SCHOOL_FULLNAME, SCHOOL_SUBDISTRICT, SCHOOL_DISTRICT, SCHOOL_PROVINCE, SCHOOL_PHONE
PRINCIPAL_NAME, PRINCIPAL_TITLE, ACADEMIC_YEAR
M1_QUOTA, M1_REG_START, M1_REG_END, M1_EXAM_DATE, M1_EXAM_TIME, M1_EXAM_LOCATION, M1_RESULT_DATE
REG_OPEN_M1, M1_REG_OPEN_TIME, M1_REG_CLOSE_TIME
M4_QUOTA, M4_REG_START, M4_REG_END, M4_EXAM_DATE, M4_EXAM_TIME, M4_EXAM_LOCATION, M4_RESULT_DATE
REG_OPEN_M4, M4_REG_OPEN_TIME, M4_REG_CLOSE_TIME
EXAM_FEE, LOGO_URL, PHOTO_FOLDER_URL
SERVICE_AREA_SCHOOLS (newline-separated)
STUDY_PLANS_MID (newline-separated, ม.1-3)
STUDY_PLANS_HIGH (newline-separated, ม.4-6)
SYSTEM_NAME, DEVELOPER_NAME, DEVELOPER_POSITION, DEVELOPER_PHONE
SYSTEM_VERSION, CHANGELOG_TEXT
ANNOUNCEMENT
```

### Sheet: `AuditLog`
Columns: `TIMESTAMP, USER, ACTION, DETAIL, ROLE`

---

## 3. ROLES & PERMISSIONS

```javascript
const ROLE_PERMS = {
  ADMIN: ['VIEW_APPS','EDIT_APP','DELETE_APP','CHANGE_STATUS','ASSIGN_EXAM',
          'SETTINGS','USERS','BACKUP','EXPORT','VIEW_LOG'],
  STAFF: ['VIEW_APPS','EDIT_APP','CHANGE_STATUS','ASSIGN_EXAM','EXPORT'],
};
```

| Feature | ADMIN | STAFF |
|---|---|---|
| ดูข้อมูลสมัคร | ✅ | ✅ |
| แก้ไขข้อมูลสมัคร | ✅ | ✅ |
| เปลี่ยนสถานะ | ✅ | ✅ |
| กำหนดเลขสอบ | ✅ | ✅ |
| Export CSV | ✅ | ✅ |
| ลบข้อมูล | ✅ | ❌ |
| Settings | ✅ | ❌ |
| จัดการผู้ใช้ | ✅ | ❌ |
| Backup | ✅ | ❌ |
| ดู Audit Log | ✅ | ❌ |

---

## 4. GAS FUNCTIONS (code.gs)

### Public (ไม่ต้อง token)
| Function | Description |
|---|---|
| `doGet()` | serve HTML |
| `getSettings()` | คืน settings object (cache 60s) |
| `login(username, password)` | คืน `{ok, token, name, role}` |
| `submitApplication(data)` | สมัครใหม่, checksum+dup check |
| `checkStatus(idCard)` | ค้นหาด้วยเลขบัตร |
| `getPublicStats()` | สถิติสาธารณะ (ไม่มีข้อมูลส่วนตัว) |
| `getPublicResults(level)` | ผลการคัดเลือก |
| `getGeoData(province)` | `''` → provinces list, `'จังหวัด'` → districts+subdistricts |
| `uploadPhoto(base64Data, appId)` | อัปโหลดรูปผู้สมัครไป Drive |

### Admin (ต้อง token)
| Function | Perm | Description |
|---|---|---|
| `logout(token)` | any | ออกระบบ |
| `changePassword(token, old, new)` | any | เปลี่ยนรหัส |
| `getApplications(token, filters)` | VIEW_APPS | filters: {level,status,search} |
| `updateApplication(token, appId, updates)` | EDIT_APP | แก้ไขข้อมูล |
| `deleteApplication(token, appId)` | DELETE_APP | ลบ |
| `assignExamNumbers(token, level)` | ASSIGN_EXAM | batch กำหนดเลขสอบ |
| `getStats(token)` | VIEW_APPS | dashboard stats ทุกมิติ |
| `updateSettings(token, settings)` | SETTINGS | บันทึก settings |
| `uploadLogo(token, base64Data)` | SETTINGS | upload โลโก้ → Drive |
| `migrateSheet(token)` | SETTINGS | sync APP_COLS header กับ sheet |
| `getAuditLog(token)` | VIEW_LOG | ล่าสุด 500 รายการ |
| `getAdminUsers(token)` | USERS | รายชื่อ users |
| `addAdminUser(token, u, p, name, role)` | USERS | เพิ่ม user |
| `removeAdminUser(token, username)` | USERS | ลบ user |
| `resetUserPassword(token, target, pwd)` | USERS | reset password |
| `exportApplications(token, level)` | EXPORT | คืน data array |
| `exportBackup(token)` | BACKUP | JSON backup ทุก sheet |
| `getServiceAreaSchools(token)` | any | รายชื่อโรงเรียนเขตบริการ |

---

## 5. FRONTEND STRUCTURE (index.html)

### Views (SPA)
```
home          → หน้าแรก + hero + public stats + countdown
register      → Wizard 5 ขั้น (สมัครใหม่)
check         → ตรวจสอบสถานะด้วยเลขบัตร
results       → ประกาศผลการคัดเลือก
admin-login   → Login หน้าจอ admin
admin-main    → ระบบจัดการ admin (sidebar layout)
```

### Admin Sidebar Pages
```
dash      → Dashboard (สถิติ, quota%, trend 14 วัน, byType, topSchools, byProvince)
apps      → ข้อมูลการสมัคร (filter, edit, delete, assign exam, print)
settings  → ตั้งค่าระบบทั้งหมด
backup    → Backup JSON + Export CSV
log       → Audit Log
users     → จัดการผู้ใช้ (add/remove/reset pwd)
changepwd → เปลี่ยนรหัสผ่านตนเอง
```

### Wizard 5 ขั้น (Step 1-5)
**Step 1 — ระดับชั้น + ประเภทการสมัคร**
- ม.1: นักเรียนทั่วไป (ในเขต) | นักเรียนทั่วไป (นอกเขต)
- ม.4: นักเรียนในโรงเรียน | นักเรียนทั่วไป
- ย้ายเข้าระหว่างปี → เลือกชั้นปี ม.1-ม.6

**Step 2 — ข้อมูลส่วนตัวนักเรียน**
- คำนำหน้า: เด็กชาย/เด็กหญิง/นาย/นางสาว (auto-switch เมื่ออายุครบ 15 ปี)
- ชื่อ, นามสกุล
- เลขบัตรประชาชน 13 หลัก (checksum + ห้ามซ้ำกับบิดา/มารดา/ผู้ปกครอง)
- วันเกิด dropdown พ.ศ. (คำนวณอายุ realtime)
- เบอร์โทร (ไม่บังคับ)
- รูปภาพผู้สมัคร (ไม่บังคับ — auto-crop 1×1.5 นิ้ว)
- สัญชาติ + ศาสนา (dropdown + อื่นๆ ระบุ)

**Step 3 — ที่อยู่และข้อมูลครอบครัว**
- ที่อยู่ cascade: จังหวัด → อำเภอ → ตำบล → ZIP (GAS embedded + CDN lazy fallback)
- บิดา: คำนำหน้า, ชื่อ, นามสกุล, เลขบัตร, อาชีพ(dropdown), รายได้(range), เบอร์, สถานภาพ
- มารดา: เหมือนบิดา
- สถานภาพบิดา/มารดา: มีชีวิต | เสียชีวิต | ไม่ทราบสถานะ | ไม่ปรากฏ | ติดต่อไม่ได้
  - เสียชีวิต/ไม่ปรากฏ/ติดต่อไม่ได้ → ซ่อนฟิลด์อาชีพ/รายได้/เบอร์
  - ไม่มีชีวิต → ซ่อนตัวเลือกเป็นผู้ปกครอง
- ความสัมพันธ์บิดา-มารดา: อยู่ด้วยกัน | แยกกันอยู่ | หย่าร้าง | ...
- ผู้ปกครอง: บิดา | มารดา | คนอื่น (ถ้าคนอื่น → ชื่อ, ความสัมพันธ์dropdown, เลขบัตร, เบอร์)

**Step 4 — การศึกษาเดิมและแผนการเรียน**
- นักเรียนในโรงเรียน: เลขประจำตัว 5 หลัก (มี 0 นำหน้า) + note กรณีย้ายกลับ
- นักเรียนอื่น: school search จาก SERVICE_AREA_SCHOOLS + "ไม่พบในรายการ"
- ระดับชั้นที่จบ + GPA
- แผนการเรียน: ม.4 = STUDY_PLANS_HIGH, ม.1/ย้ายเข้า = STUDY_PLANS_MID

**Step 5 — ยืนยัน (ดูข้อมูลสรุปก่อนส่ง)**

### Global State
```javascript
const S = {
  token:      '',       // session token
  adminName:  '',
  settings:   {},       // getSettings() result
  apps:       [],       // admin app list
  regData:    {},       // wizard form data
  regStep:    1,
  publicStats: null,    // getPublicStats() result
};
window._geoSubsCache = {}; // subdistrict cache จาก GAS
```

### Key JS Functions
```javascript
// Address cascade (ใช้ global cache)
onProvinceChange()      // runs getGeoData(prov), stores res.subdistricts in window._geoSubsCache
onDistrictChange()      // reads window._geoSubsCache[dist], fallback → CDN lazy load
onSubdistrictChange()   // fills ZIP auto

// Validation
validateIdCard(id)      // checksum + หลักแรก 1-8 + ไม่ซ้ำ 13 หลัก
idCardErrorReason(id)   // returns specific error message
checkDuplicateIds()     // นักเรียน vs บิดา/มารดา/ผู้ปกครอง (ไม่ตรวจบิดา vs มารดา)

// Wizard
goRegister()            // → showRegisterChecklist(null)
startRegister(level)    // → showRegisterChecklist(level)
proceedToRegister()     // → showView+resetWizard+selectLevel
selectLevel(level)      // ตั้ง APP_TYPE options, transfer-level group
selectType(v)           // ซ่อน/แสดง group-current-student, group-other-student, group-study-plan
validateStep(s)         // per-step validation
collectStep(s)          // เก็บค่าลง S.regData

// Auto prefix
autoSwitchPrefix(age)   // อายุ>=15: เด็กชาย→นาย, เด็กหญิง→นางสาว
_calcAge()              // คำนวณจาก hidden #reg-birthdate (ISO)

// Parent status
onParentStatusChange(parent)   // ซ่อนฟิลด์ + hint + _refreshGuardianOptions()
_refreshGuardianOptions()      // ซ่อน radio บิดา/มารดาถ้าไม่มีชีวิต

// Countdown
_startCountdown(level, prefix, start, openTime, end, closeTime, manualOpen)
// อัปเดตทุก 1 วินาที, 4 states: waiting/open/closing/closed

// Photo
onPhotoSelected(input)  // Canvas resize → 200x300px (1×1.5 นิ้ว) → base64
onLogoFileSelected(input) // Canvas resize → 200x200px → uploadLogo() → GAS

// Settings
fillSettings()          // โหลดค่าจาก S.settings → form
saveSettings()          // เก็บค่าจาก form → updateSettings()
applySettings()         // อัปเดต DOM: navbar, hero, badges, countdown, footer, logo
```

---

## 6. CRITICAL PATTERNS

### setNumberFormat('@') ก่อน setValue เสมอ
```javascript
// code.gs — ทุกครั้งที่เขียน text field
const cell = sh.getRange(row, col);
cell.setNumberFormat('@');
cell.setValue(value);
```

### getSettings ใช้ getDisplayValues()
```javascript
// ป้องกัน 0xxxxxxxxx หรือรหัสไปรษณีย์ถูก parse เป็น number
const rows = _sheetData(SH.SETTINGS, true); // useDisplay=true
```

### _sheetData header-based mapping
ใช้ header row เป็น key → ถ้า sheet เก่าไม่มี column ใหม่ → ต้องรัน `_migrateAppSheet()`

### LockService ทุก write
```javascript
return _withLock(() => { ... });
```

### _str() ป้องกัน falsy 0
```javascript
const _str = v => (v === null || v === undefined) ? '' : String(v);
```

---

## 7. GEO DATA ARCHITECTURE

**ขอนแก่น**: ฝังครบใน `_buildGeo()` ใน code.gs — ทุกอำเภอ + ตำบล + ZIP  
**จังหวัดอื่น**: มีเฉพาะรายชื่ออำเภอ — ตำบลโหลด lazy จาก jsDelivr CDN:
```
https://cdn.jsdelivr.net/gh/thailand-geography-data/thailand-geography-json@main/src/geography.json
```
Cache: `window._geoSubsCache` (JS) + `sessionStorage('thaiGeo_cdn_v2')` (browser)

`getGeoData(province)` returns:
- `''` → `{ provinces: ['จังหวัด',...] }`
- `'ขอนแก่น'` → `{ districts: [...], subdistricts: {'อำเภอ': [['ตำบล','ZIP'],...]} }`
- จังหวัดอื่น → `{ districts: [...], subdistricts: {} }`

---

## 8. PHOTO/LOGO UPLOAD

### รูปผู้สมัคร
- Browser: Canvas crop+resize → 200×300px (2:3 = 1×1.5 นิ้ว) → JPEG base64
- Submit: `_PHOTO_DATA` ส่งแยก → `uploadPhoto(base64, tmpId)` → Drive → URL เก็บใน `PHOTO_URL`
- Drive folder: `PHOTO_FOLDER_URL` จาก settings หรือสร้างใหม่อัตโนมัติ

### โลโก้
- Browser: Canvas resize → 200×200px → PNG base64 → `uploadLogo(token, base64)` → Drive
- URL เก็บใน `LOGO_URL` settings
- แสดงใน navbar (#nav-logo-img) + footer (#footer-logo) + settings preview

---

## 9. SCHOOL INFO (ค่า hardcode เริ่มต้น)

```
SCHOOL_FULLNAME    = โรงเรียนหนองนาคำวิทยาคม
SCHOOL_SUBDISTRICT = ตำบลบ้านโคก
SCHOOL_DISTRICT    = อำเภอหนองนาคำ
SCHOOL_PROVINCE    = จังหวัดขอนแก่น
```

---

## 10. DEPLOY INSTRUCTIONS

1. สร้าง Google Apps Script project ใหม่
2. วาง `code.gs` ทับ Code.gs
3. สร้างไฟล์ `index.html` วางเนื้อหา
4. Project Settings → เพิ่ม OAuth scope:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/script.external_request`
5. รัน `setupSystem()` ครั้งแรก (สร้าง Sheets + default admin)
6. Deploy → Web App → Execute as: Me → Who: Anyone
7. Login: `admin` / `admin1234` → เปลี่ยนรหัสผ่านทันที

### หลัง Deploy ครั้งแรก
- Settings: กรอกข้อมูลโรงเรียน, ผู้อำนวยการ, ปีการศึกษา
- Upload โลโก้
- ตั้ง STUDY_PLANS_MID / STUDY_PLANS_HIGH
- ตั้ง SERVICE_AREA_SCHOOLS (รายชื่อโรงเรียนเขตบริการ)
- ถ้า sheet เก่ามีอยู่แล้ว: รัน `migrateSheet(token)` จาก admin panel

---

## 11. KNOWN CONSTRAINTS & NOTES

- **GAS HtmlService**: ไม่รองรับ `fetch()` จาก server-side, ใช้ `google.script.run` เท่านั้น
- **CDN for subdistricts**: ต้องการ internet ฝั่ง client (ขอนแก่นไม่ต้อง)
- **Drive permission**: ต้อง authorize `drive` scope ก่อน uploadPhoto/uploadLogo ถึงจะใช้งานได้
- **Session**: token อยู่ใน `localStorage` ฝั่ง client, หมดอายุ 3 ชั่วโมง
- **Sheet migration**: เมื่อเพิ่ม APP_COLS ใหม่ ต้องรัน `_migrateAppSheet()` เพื่อ sync header
- **Duplicate ID**: ตรวจ cross-application (ห้ามเลขบัตรซ้ำในระบบ) + ตรวจ student vs parent (ภายใน form)
- **Photo**: ไม่บังคับ สามารถเพิ่มภายหลังได้
- **Changelog**: ต้องอัปเดตทั้งใน code.gs header และ Settings `CHANGELOG_TEXT` พร้อมกัน

---

## 12. CHANGELOG (Latest)

```
v1.7.0 – 2569-03-16 – Supabase dual-write (applications table)
             SUPA_URL/SUPA_KEY ใน Settings + syncAllToSupabase()
             _supaUpsert/_supaPatch/_supaDelete helpers + _toSupaRec()
             submit/update/delete/cancel sync อัตโนมัติ
v1.6.0 – 2569-03-16 – ROLE: STAFF, Permission system, Audit log ครบ
v1.5.2 – 2569-03-16 – Footer, System info, Register checklist modal, Countdown
v1.5.1 – 2569-03-16 – Photo upload (1×1.5 นิ้ว), Logo upload → Drive
v1.5.0 – 2569-03-16 – Geo data embed, Parent status/ID, Guardian options
v1.4.0 – 2569-03-16 – บิดา/มารดา/ผู้ปกครอง ปพ.3, Address cascade
v1.3.0 – 2569-03-16 – Transfer type, School search, Study plan
v1.2.0 – 2569-03-16 – Settings fix, Auto open/close, Dashboard ทุกมิติ
v1.0.0 – 2569-03-16 – Initial release
```
