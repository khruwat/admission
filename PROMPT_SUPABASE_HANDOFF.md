# HANDOFF PROMPT — ระบบรับสมัครนักเรียน v1.6.2 → เพิ่ม Supabase Integration

## บริบทโครงการ

คุณกำลังรับช่วงต่อการพัฒนา **ระบบรับสมัครนักเรียนออนไลน์** โรงเรียนหนองนาคำวิทยาคม จากช่วงงานก่อนหน้า  
ระบบนี้สร้างด้วย **Google Apps Script (GAS)** + **Google Sheets** เป็น database + **Single HTML file (SPA)**  
ภาษาหลัก: **ภาษาไทย**

ไฟล์ที่ต้องใช้งาน (แนบมาด้วย):
- `code_v1.6.2.gs` — backend GAS (1,134 lines)
- `index_v1.6.2.html` — frontend SPA (4,595 lines)
- `BASELINE_v1.6.0.md` — เอกสาร architecture ครบถ้วน (อ่านก่อนทุกครั้ง)

---

## งานที่ต้องทำ: เพิ่ม Supabase Dual-Write

### เป้าหมาย
เพิ่ม Supabase เป็น **secondary database** แบบ dual-write  
Google Sheets ยังคงเป็น primary — Supabase เป็น backup + real-time sync

### Supabase Project (FREE tier, Singapore)
```
SUPA_URL = 'https://mgspxcxmkpanxfxoczvh.supabase.co'
SUPA_KEY = 'sb_publishable_VYxfHMbwaj64YiwbQeWF2A_wGYq2hS0'
```
**ต้องประกาศ 2 บรรทัดนี้ที่บรรทัด 25-26 ของ code.gs เสมอ** (ต่อจาก `const _CACHE = ...`)

---

## Architecture ปัจจุบัน (อ่านให้เข้าใจก่อนแก้ไข)

### Sheets (4 sheets)
```
Applications  — ข้อมูลผู้สมัคร (53 columns, ดู APP_COLS ใน BASELINE)
Users         — USERNAME, PASSWORD, NAME, ROLE, LAST_LOGIN
Settings      — KEY, VALUE (ใช้ getDisplayValues() เสมอ)
AuditLog      — TIMESTAMP, USER, ACTION, DETAIL, ROLE
```

### APP_COLS (53 คอลัมน์ — ห้ามเปลี่ยนลำดับ)
```javascript
const APP_COLS = [
  'APP_ID','LEVEL','APP_TYPE','PREFIX','FNAME','LNAME','ID_CARD',
  'BIRTHDATE','NATIONALITY','RELIGION',
  'ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP',
  'PHONE','PHOTO_URL',
  'FATHER_PREFIX','FATHER_FNAME','FATHER_LNAME','FATHER_ID_CARD',
  'FATHER_OCCUPATION','FATHER_INCOME','FATHER_PHONE','FATHER_STATUS',
  'MOTHER_PREFIX','MOTHER_FNAME','MOTHER_LNAME','MOTHER_ID_CARD',
  'MOTHER_OCCUPATION','MOTHER_INCOME','MOTHER_PHONE','MOTHER_STATUS',
  'GUARDIAN_TYPE','GUARDIAN_NAME','GUARDIAN_RELATION','GUARDIAN_ID_CARD','GUARDIAN_PHONE',
  'PARENT_COUPLE_RELATION',
  'OLD_SCHOOL','OLD_STUDENT_ID','OLD_LEVEL','GPA','SPECIAL_ABILITY',
  'STUDY_PLAN','STUDY_PLAN_ALT','TRANSFER_LEVEL',
  'STATUS','EXAM_NO','EXAM_ROOM','SCORE','RESULT_NOTE',
  'REMARK','CREATED_AT','UPDATED_AT'
];
```

### Roles & Permissions
```javascript
ADMIN: ['VIEW_APPS','EDIT_APP','DELETE_APP','CHANGE_STATUS','ASSIGN_EXAM','SETTINGS','USERS','BACKUP','EXPORT','VIEW_LOG']
STAFF: ['VIEW_APPS','EDIT_APP','CHANGE_STATUS','ASSIGN_EXAM','EXPORT']
```

### Critical GAS Patterns (ห้ามแก้ไข)
```javascript
// 1. setNumberFormat('@') ก่อน setValue เสมอสำหรับ TEXT_COLS
// 2. getSettings() ใช้ getDisplayValues() ป้องกัน 0 หาย
// 3. _withLock() ครอบทุก write operation
// 4. submitApplication เขียน row ตาม hdrs.map(h => rec[h]) ไม่ใช่ APP_COLS.map
// 5. _migrateAppSheet() รันก่อน submit เสมอ
// 6. _logWithRole(user, role, action, detail) ทุก action
```

---

## สิ่งที่ต้องเพิ่มใน code.gs

### 1. Supabase Constants (บรรทัด 25-26)
```javascript
const SUPA_URL = 'https://mgspxcxmkpanxfxoczvh.supabase.co';
const SUPA_KEY = 'sb_publishable_VYxfHMbwaj64YiwbQeWF2A_wGYq2hS0';
const SUPA_ENABLED = (SUPA_URL !== '' && SUPA_KEY !== '');
```

### 2. Supabase Helper Functions (เพิ่มใน code.gs)
```javascript
// HTTP helper สำหรับ Supabase REST API
function _supaReq(method, table, body, params) {
  if (!SUPA_ENABLED) return null;
  try {
    let url = SUPA_URL + '/rest/v1/' + table;
    if (params) url += '?' + Object.entries(params).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
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
    const res = UrlFetchApp.fetch(url, opts);
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

// Upsert record (INSERT or UPDATE by app_id)
function _supaUpsert(table, record) {
  return _supaReq('POST', table, record, {'on_conflict': 'app_id'});
}

// Update by app_id
function _supaPatch(table, appId, updates) {
  return _supaReq('PATCH', table, updates, {'app_id': 'eq.' + appId});
}

// Delete by app_id
function _supaDelete(table, appId) {
  return _supaReq('DELETE', table, null, {'app_id': 'eq.' + appId});
}

// Fetch all records from table
function _supaGetAll(table) {
  return _supaReq('GET', table, null, {'select': '*', 'limit': '5000'});
}
```

### 3. Supabase Table Schema (รัน SQL นี้ใน Supabase SQL Editor)
```sql
-- ตาราง applications (mirror ของ Google Sheets)
CREATE TABLE IF NOT EXISTS applications (
  id              BIGSERIAL PRIMARY KEY,
  app_id          TEXT UNIQUE NOT NULL,
  level           TEXT,
  app_type        TEXT,
  prefix          TEXT,
  fname           TEXT,
  lname           TEXT,
  id_card         TEXT,
  birthdate       TEXT,
  nationality     TEXT,
  religion        TEXT,
  address         TEXT,
  subdistrict     TEXT,
  district        TEXT,
  province        TEXT,
  zip             TEXT,
  phone           TEXT,
  photo_url       TEXT,
  father_prefix   TEXT, father_fname  TEXT, father_lname  TEXT,
  father_id_card  TEXT, father_occupation TEXT, father_income TEXT,
  father_phone    TEXT, father_status TEXT,
  mother_prefix   TEXT, mother_fname  TEXT, mother_lname  TEXT,
  mother_id_card  TEXT, mother_occupation TEXT, mother_income TEXT,
  mother_phone    TEXT, mother_status TEXT,
  guardian_type   TEXT, guardian_name TEXT, guardian_relation TEXT,
  guardian_id_card TEXT, guardian_phone TEXT,
  parent_couple_relation TEXT,
  old_school      TEXT, old_student_id TEXT, old_level TEXT,
  gpa             TEXT, special_ability TEXT,
  study_plan      TEXT, study_plan_alt TEXT, transfer_level TEXT,
  status          TEXT DEFAULT 'สมัครแล้ว',
  exam_no         TEXT, exam_room TEXT,
  score           TEXT, result_note TEXT, remark TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS + allow anon read/write (สำหรับ GAS publishable key)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON applications FOR ALL USING (true) WITH CHECK (true);
```

### 4. Dual-Write Pattern (เพิ่มใน functions ที่ write data)

**submitApplication** — เพิ่มหลัง `sh.appendRow(row)`:
```javascript
// Dual-write to Supabase
try {
  const supaRec = {};
  APP_COLS.forEach(c => { supaRec[c.toLowerCase()] = rec[c] !== undefined ? String(rec[c]||'') : ''; });
  supaRec.app_id = rec.APP_ID;
  _supaUpsert('applications', supaRec);
} catch(e) { Logger.log('Supabase write failed: '+e); }
```

**updateApplication** — เพิ่มหลัง `_updateRow(...)`:
```javascript
// Sync update to Supabase
try {
  const supaUpdates = {};
  Object.entries(updates).forEach(([k,v]) => { supaUpdates[k.toLowerCase()] = String(v||''); });
  _supaPatch('applications', appId, supaUpdates);
} catch(e) { Logger.log('Supabase patch failed: '+e); }
```

**deleteApplication** — เพิ่มหลัง `_deleteRow(...)`:
```javascript
// Sync delete to Supabase
try { _supaDelete('applications', appId); } catch(e) {}
```

**cancelApplicationByStudent** — เพิ่มเช่นกัน

### 5. Full Sync Function (admin เรียกได้)
```javascript
function syncAllToSupabase(token) {
  _requirePerm(token, 'BACKUP');
  if (!SUPA_ENABLED) return { ok:false, msg:'Supabase ไม่ได้เปิดใช้งาน' };
  try {
    const apps = _sheetData(SH.APP);
    let success = 0, failed = 0;
    apps.forEach(a => {
      const rec = {};
      APP_COLS.forEach(c => { rec[c.toLowerCase()] = String(a[c]||''); });
      rec.app_id = a.APP_ID;
      const r = _supaUpsert('applications', rec);
      r ? success++ : failed++;
    });
    _logWithRole('ADMIN', 'ADMIN', 'SYNC_SUPABASE', success+' ok / '+failed+' fail');
    return { ok:true, success, failed };
  } catch(e) {
    return { ok:false, msg:String(e) };
  }
}
```

---

## สิ่งที่ต้องเพิ่มใน index.html (Settings UI)

### เพิ่มในหน้า Settings — หัวข้อ "Supabase"
```html
<!-- ── Supabase ── -->
<div class="card mt-16">
  <div class="card-header">🗄 <h2>Supabase (Real-time Sync)</h2></div>
  <div class="card-body">
    <div class="grid-2">
      <div class="form-group">
        <label>Supabase URL</label>
        <input type="url" id="cfg-supa-url" class="form-control"
          placeholder="https://xxxx.supabase.co">
      </div>
      <div class="form-group">
        <label>Supabase Anon/Publishable Key</label>
        <input type="text" id="cfg-supa-key" class="form-control"
          placeholder="sb_publishable_...">
      </div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="doSyncSupabase()">
      🔄 Sync ข้อมูลทั้งหมดไป Supabase
    </button>
    <div id="supa-sync-status" class="form-hint" style="margin-top:8px"></div>
  </div>
</div>
```

### เพิ่มใน fillSettings() / saveSettings() / SETTINGS_DEFAULTS
```javascript
// fillSettings
setInputVal('cfg-supa-url', c.SUPA_URL || '');
setInputVal('cfg-supa-key', c.SUPA_KEY || '');

// saveSettings
SUPA_URL: val('cfg-supa-url'),
SUPA_KEY: val('cfg-supa-key'),
```

```javascript
// SETTINGS_DEFAULTS ใน code.gs
['SUPA_URL', 'https://mgspxcxmkpanxfxoczvh.supabase.co'],
['SUPA_KEY', 'sb_publishable_VYxfHMbwaj64YiwbQeWF2A_wGYq2hS0'],
```

### doSyncSupabase() ใน index.html
```javascript
function doSyncSupabase() {
  const statusEl = document.getElementById('supa-sync-status');
  if (statusEl) { statusEl.textContent = '⏳ กำลัง sync...'; statusEl.style.color = 'var(--gray)'; }
  run('syncAllToSupabase', S.token, function(res) {
    if (res && res.ok) {
      if (statusEl) { statusEl.textContent = '✅ Sync สำเร็จ: '+res.success+' รายการ'; statusEl.style.color = 'var(--success)'; }
      toast('Sync Supabase สำเร็จ '+res.success+' รายการ', 'success');
    } else {
      if (statusEl) { statusEl.textContent = '❌ '+(res&&res.msg||'ไม่สำเร็จ'); statusEl.style.color = 'var(--danger)'; }
    }
  });
}
```

---

## CHANGELOG ที่ต้องอัปเดต

### code.gs header (บรรทัด 10-11)
```
v1.7.0 – 2569-03-16 – Supabase dual-write (applications table)
             SUPA_URL/SUPA_KEY in Settings + syncAllToSupabase()
             _supaUpsert/_supaPatch/_supaDelete/_supaGetAll helpers
             submit/update/delete sync อัตโนมัติ
```

### Settings CHANGELOG_TEXT
```
v1.7.0 – 2569-03-16 – Supabase dual-write, real-time sync
```

---

## กฎที่ต้องปฏิบัติตาม (Critical Rules)

1. **ส่งไฟล์แบบครบ ไม่ตัดทอน** — ทุกครั้งที่แก้ไขต้องส่ง file เต็ม ไม่ใช่ diff
2. **node --check + duplicate function check** ทุกครั้งก่อนส่ง
3. **ชื่อไฟล์ตาม version** เช่น `code_v1.7.0.gs`, `index_v1.7.0.html`
4. **CHANGELOG อัปเดตทุก version** ทั้งใน code.gs header และ SETTINGS_DEFAULTS
5. **อ่าน BASELINE_v1.6.0.md ก่อนทุกครั้ง** เพื่อเข้าใจ architecture
6. **ห้ามเปลี่ยน** APP_COLS order, _withLock pattern, setNumberFormat('@') pattern
7. **Supabase write ต้อง try/catch** — ถ้า fail ให้ log แต่ไม่ throw error (Sheets = primary)
8. **APP_COLS key → lowercase** เมื่อเขียนลง Supabase (SQL column ใช้ lowercase)
9. **BIRTHDATE** ต้องแปลงเป็น ISO string ก่อนส่ง Supabase
10. **GAS UrlFetchApp** ไม่รองรับ async — เรียก Supabase แบบ synchronous เท่านั้น

---

## ลำดับงานที่แนะนำ

1. อ่าน `BASELINE_v1.6.0.md` ทั้งหมดก่อน
2. เพิ่ม SUPA constants ใน code.gs (บรรทัด 25-27)
3. เพิ่ม SETTINGS_DEFAULTS สำหรับ SUPA_URL / SUPA_KEY
4. เพิ่ม _supaReq / _supaUpsert / _supaPatch / _supaDelete helpers
5. เพิ่ม dual-write ใน submitApplication
6. เพิ่ม dual-write ใน updateApplication, deleteApplication, cancelApplicationByStudent
7. เพิ่ม syncAllToSupabase() admin function
8. เพิ่ม Settings UI (cfg-supa-url, cfg-supa-key, ปุ่ม Sync)
9. เพิ่ม fillSettings / saveSettings / doSyncSupabase ใน index.html
10. รัน SQL schema ใน Supabase dashboard
11. verify syntax → ส่ง code_v1.7.0.gs + index_v1.7.0.html + BASELINE_v1.7.0.md

---

## ข้อมูลโรงเรียน (Hardcode ไม่เปลี่ยน)
```
SCHOOL_FULLNAME    = โรงเรียนหนองนาคำวิทยาคม
SCHOOL_SUBDISTRICT = ตำบลบ้านโคก
SCHOOL_DISTRICT    = อำเภอหนองนาคำ
SCHOOL_PROVINCE    = จังหวัดขอนแก่น
```
