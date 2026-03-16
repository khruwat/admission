/* =============================================================
   ระบบรับสมัครนักเรียน โรงเรียนหนองนาคำวิทยาคม
   Student Enrollment System  v1.6.0
   ─────────────────────────────────────────────────────────────
   Sheets   : Applications | Users | Settings | AuditLog
   Roles    : ADMIN | STAFF
   Run once : setupSystem()  ←  สร้าง Sheet + default admin
   Default  : admin / admin1234
   ─────────────────────────────────────────────────────────────
   CHANGELOG
   v1.6.0 – 2569-03-16 – เพิ่ม ROLE: STAFF (เจ้าหน้าที่รับสมัคร)
              STAFF: ดูข้อมูลสมัคร/แก้ไขสถานะ/กำหนดเลขสอบ ได้
              STAFF: ไม่มีสิทธิ์ Settings/Users/Backup/ลบ
              DriveApp OAuth scope ประกาศชัดเจน (แก้ permission error)
              Audit log ทุก action ครบถ้วน (IP, role, timestamp)
              addAdminUser รองรับ role STAFF
   v1.5.2 – 2569-03-16 – Footer/System info, Photo upload, Checklist modal
   v1.5.0 – 2569-03-16 – Embed geo data, parent ID validation
   ============================================================= */

// OAuth scopes declaration (ต้องมีเพื่อให้ DriveApp ทำงานได้)
// @ts-ignore
/* global DriveApp, SpreadsheetApp, CacheService, LockService, Utilities, HtmlService, ContentService */

const _SS    = SpreadsheetApp.getActiveSpreadsheet();
const _CACHE = CacheService.getScriptCache();

const SH = { APP:'Applications', USERS:'Users', SETTINGS:'Settings', LOGS:'AuditLog' };

const APP_COLS = [
  'APP_ID','LEVEL','APP_TYPE','PREFIX','FNAME','LNAME','ID_CARD',
  'BIRTHDATE','NATIONALITY','RELIGION',
  // ที่อยู่
  'ADDRESS','SUBDISTRICT','DISTRICT','PROVINCE','ZIP',
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

const STATUSES = ['สมัครแล้ว','ชำระเงินแล้ว','มีสิทธิ์สอบ','ผ่าน','ไม่ผ่าน'];

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
  ['EXAM_FEE',           '0'],
  ['LOGO_URL',           ''],
  ['PHOTO_FOLDER_URL',   ''],
  ['SERVICE_AREA_SCHOOLS',''],
  ['STUDY_PLANS_MID',     'แผนการเรียนทั่วไป'],
  ['STUDY_PLANS_HIGH',    'วิทยาศาสตร์-คณิตศาสตร์\nศิลปะ-ภาษา\nศิลปะ-การงานอาชีพ'],
  ['SYSTEM_NAME',        'ระบบรับสมัครนักเรียนออนไลน์'],
  ['DEVELOPER_NAME',     ''],
  ['DEVELOPER_POSITION', ''],
  ['DEVELOPER_PHONE',    ''],
  ['SYSTEM_VERSION',     'v1.5.2'],
  ['CHANGELOG_TEXT',     'v1.5.2 – 2569-03-16 – Footer/System info, Photo upload, Register checklist'],
  ['ANNOUNCEMENT',       ''],
];

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
      // getValues: Date → ISO string; getDisplayValues: already string
      o[h] = (!useDisplay && row[i] instanceof Date) ? row[i].toISOString() : row[i];
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
  const d = new Date(v);
  return isNaN(d) ? '' : d.toISOString().slice(0,10);
}
function _toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// ─── SETUP ───

// คอลัมน์ที่ต้องเก็บเป็น Plain Text เสมอ (มี 0 นำหน้า หรือเป็น string ล้วน)
const TEXT_COLS = [
  'ID_CARD','ZIP','PHONE','PARENT_PHONE','EXAM_NO','APP_ID','EXAM_ROOM',
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
                       'M1_EXAM_DATE','M4_EXAM_DATE','M1_RESULT_DATE','M4_RESULT_DATE'];

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

// ─── PUBLIC: SUBMIT ───
function submitApplication(data) {
  if (!data || !data.FNAME || !data.LNAME || !data.ID_CARD || !data.LEVEL)
    return { ok:false, msg:'กรุณากรอกข้อมูลให้ครบถ้วน' };
  if (!_validateThaiId(data.ID_CARD))
    return { ok:false, msg:'เลขประจำตัวประชาชนไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };

  // migrate sheet header ก่อนเสมอ
  try { _migrateAppSheet(); } catch(e) {}

  const cfg     = getSettings();
  const openKey = data.LEVEL === 'ม.1' ? 'REG_OPEN_M1' : 'REG_OPEN_M4';
  if (String(cfg[openKey]) !== 'true')
    return { ok:false, msg:'ขณะนี้ยังไม่เปิดรับสมัครในระดับชั้นนี้' };

  const startKey    = data.LEVEL === 'ม.1' ? 'M1_REG_START'      : 'M4_REG_START';
  const endKey      = data.LEVEL === 'ม.1' ? 'M1_REG_END'        : 'M4_REG_END';
  const openTimeKey = data.LEVEL === 'ม.1' ? 'M1_REG_OPEN_TIME'  : 'M4_REG_OPEN_TIME';
  const closeTimeKey= data.LEVEL === 'ม.1' ? 'M1_REG_CLOSE_TIME' : 'M4_REG_CLOSE_TIME';
  const now         = new Date();

  if (cfg[startKey]) {
    const openTime  = cfg[openTimeKey] || '00:00';
    const startDT   = new Date(cfg[startKey] + 'T' + openTime + ':00');
    if (!isNaN(startDT) && now < startDT)
      return { ok:false, msg:'ยังไม่ถึงเวลาเปิดรับสมัคร (เปิด ' + cfg[startKey] + ' เวลา ' + openTime + ' น.)' };
  }
  if (cfg[endKey]) {
    const closeTime = cfg[closeTimeKey] || '23:59';
    const endDT     = new Date(cfg[endKey] + 'T' + closeTime + ':00');
    if (!isNaN(endDT) && now > endDT)
      return { ok:false, msg:'หมดเขตรับสมัครแล้ว (ปิด ' + cfg[endKey] + ' เวลา ' + closeTime + ' น.)' };
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
      ID_CARD:          _str(data.ID_CARD).trim(),
      ZIP:              _str(data.ZIP),
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

// ─── PUBLIC: CHECK STATUS ───
function checkStatus(idCard) {
  if (!idCard) return { ok:false, msg:'กรุณาระบุเลขบัตรประชาชน' };
  const all   = _sheetData(SH.APP);
  const found = all.filter(a => String(a.ID_CARD).trim() === String(idCard).trim());
  if (!found.length) return { ok:false, msg:'ไม่พบข้อมูลการสมัคร กรุณาตรวจสอบเลขบัตรประชาชน' };
  return { ok:true, data:found.map(a => ({
    APP_ID:a.APP_ID, LEVEL:a.LEVEL, APP_TYPE:a.APP_TYPE,
    PREFIX:a.PREFIX, FNAME:a.FNAME, LNAME:a.LNAME,
    STATUS:a.STATUS, EXAM_NO:a.EXAM_NO, EXAM_ROOM:a.EXAM_ROOM,
    SCORE:a.SCORE, RESULT_NOTE:a.RESULT_NOTE, CREATED_AT:a.CREATED_AT
  }))};
}

// ─── GEO DATA (ข้อมูลที่อยู่ไทย ฝังใน code.gs ไม่ต้องโหลดจากภายนอก) ───
// รูปแบบ: province → { districts: ['อำเภอ',...], sub: {'อำเภอ': [['ตำบล','ZIP'],...] } }
// ขอนแก่น: ครบทุกตำบล | จังหวัดอื่น: ครบทุกอำเภอ ตำบล fallback → text input
var _GEO_DATA = null;
function _buildGeo() {
  if (_GEO_DATA) return _GEO_DATA;
  _GEO_DATA = {
'กรุงเทพมหานคร':{d:['พระนคร','ดุสิต','หนองจอก','บางรัก','บางเขน','บางกะปิ','ปทุมวัน','ป้อมปราบศัตรูพ่าย','พระโขนง','มีนบุรี','ลาดกระบัง','ยานนาวา','สัมพันธวงศ์','พระโขนง','บางกอกน้อย','ห้วยขวาง','บางกอกใหญ่','ธนบุรี','บางกอกน้อย','บางขุนเทียน','ภาษีเจริญ','หนองแขม','ราษฎร์บูรณะ','หลักสี่','ลาดพร้าว','วังทองหลาง','คลองสาน','ตลิ่งชัน','บางซื่อ','จตุจักร','บึงกุ่ม','สาทร','บางคอแหลม','ประเวศ','คลองเตย','สวนหลวง','จอมทอง','ดอนเมือง','ราษฎร์บูรณะ','หลักสี่','ลาดพร้าว','วังทองหลาง','ทวีวัฒนา','ทุ่งครุ','บางบอน']},
'กระบี่':{d:['เมืองกระบี่','เขาพนม','เกาะลันตา','ปลายพระยา','ลำทับ','เหนือคลอง','อ่าวลึก','คลองท่อม']},
'กาญจนบุรี':{d:['เมืองกาญจนบุรี','ไทรโยค','บ่อพลอย','ศรีสวัสดิ์','ท่ามะกา','ท่าม่วง','ทองผาภูมิ','สังขละบุรี','พนมทวน','เลาขวัญ','ด่านมะขามเตี้ย','หนองปรือ','ห้วยกระเจา']},
'กาฬสินธุ์':{d:['เมืองกาฬสินธุ์','นามน','กมลาไสย','ร่องคำ','กุฉินารายณ์','เขาวง','ยางตลาด','ห้วยเม็ก','สหัสขันธ์','คำม่วง','ท่าคันโท','หนองกุงศรี','สมเด็จ','ห้วยผึ้ง','สามชัย','นาคู','ดอนจาน','ฆ้องชัย']},
'กำแพงเพชร':{d:['เมืองกำแพงเพชร','ไทรงาม','คลองลาน','ขาณุวรลักษบุรี','คลองขลุง','พรานกระต่าย','ลานกระบือ','ทรายทองวัฒนา','ปางศิลาทอง','บึงสามัคคี','โกสัมพีนคร']},
'ขอนแก่น':{d:['เมืองขอนแก่น','บ้านฝาง','พระยืน','หนองเรือ','ชุมแพ','สีชมพู','น้ำพอง','อุบลรัตน์','กระนวน','บ้านไผ่','เปือยน้อย','พล','แวงใหญ่','แวงน้อย','หนองสองห้อง','ภูเวียง','มัญจาคีรี','ชนบท','เขาสวนกวาง','ภูผาม่าน','ซำสูง','โคกโพธิ์ไชย','หนองนาคำ','บ้านแฮด','โนนศิลา','เวียงเก่า'],
s:{
'เมืองขอนแก่น':[['พระลับ','40000'],['สาวะถี','40000'],['บ้านทุ่ม','40000'],['เมืองเก่า','40000'],['บึงเนียม','40000'],['โนนทอง','40000'],['บ้านเป็ด','40000'],['หนองตูม','40000'],['โคกสี','40000'],['ท่าพระ','40260'],['บ้านค้อ','40000'],['พระลับ','40000'],['บ้านหว้า','40000'],['ในเมือง','40000'],['สาวะถี','40000'],['บ้านทุ่ม','40000'],['โนนทอง','40000'],['บึงเนียม','40000'],['สาวะถี','40000'],['โคกสี','40000'],['เมืองเก่า','40000']],
'บ้านฝาง':[['บ้านฝาง','40270'],['ป่าหวายนั่ง','40270'],['โนนฆ้อง','40270'],['บ้านเหล่า','40270'],['ป่ามะนาว','40270'],['โคกงาม','40270'],['หนองบัว','40270']],
'พระยืน':[['พระยืน','40320'],['พระบุ','40320'],['บ้านโต้น','40320'],['หนองแวง','40320'],['ขามป้อม','40320']],
'หนองเรือ':[['หนองเรือ','40240'],['บ้านเม็ง','40240'],['บ้านกง','40240'],['ยางคำ','40240'],['จระเข้','40240'],['โนนทอง','40240'],['กุดกว้าง','40240'],['โนนสะอาด','40240'],['บ้านผือ','40240']],
'ชุมแพ':[['ชุมแพ','40130'],['โนนหัน','40130'],['นาหนองทุ่ม','40130'],['โนนอุดม','40130'],['ขัวเรียง','40130'],['หนองไผ่','40130'],['ไชยสอ','40130'],['วังหินลาด','40130'],['นาเพียง','40130'],['หนองเขียด','40130'],['หนองทุ่มลุมพุก','40130']],
'สีชมพู':[['สีชมพู','40220'],['ศรีสุข','40220'],['นาจาน','40220'],['วังเพิ่ม','40220'],['ซำยาง','40220'],['หนองแดง','40220'],['ดงลาน','40220'],['บริบูรณ์','40220'],['บ้านใหม่','40220'],['ภูห่าน','40220']],
'น้ำพอง':[['น้ำพอง','40140'],['วังชัย','40140'],['หนองกุง','40140'],['บัวใหญ่','40140'],['สะอาด','40140'],['ม่วงหวาน','40140'],['พังทุย','40140'],['กุดน้ำใส','40140'],['หนองโก','40140'],['บ้านขาม','40140'],['โนนทอง','40140']],
'อุบลรัตน์':[['อุบลรัตน์','40250'],['นาคำ','40250'],['ศรีสุขสำราญ','40250'],['ทุ่งโป่ง','40250'],['เขื่อนอุบลรัตน์','40250'],['โคกสูง','40250']],
'กระนวน':[['หนองโก','40170'],['หนองกุงใหญ่','40170'],['ห้วยโจด','40170'],['ห้วยยาง','40170'],['บ้านฝาง','40170'],['ดูนสาด','40170'],['หนองโน','40170'],['น้ำอ้อม','40170'],['หัวนาคำ','40170']],
'บ้านไผ่':[['บ้านไผ่','40110'],['ในเมือง','40110'],['เมืองเพีย','40110'],['บ้านลาน','40110'],['แคนเหนือ','40110'],['ภูเหล็ก','40110'],['ป่าปอ','40110'],['หินตั้ง','40110'],['หนองน้ำใส','40110'],['บ้านทุ่ม','40110']],
'เปือยน้อย':[['เปือยน้อย','40340'],['วังม่วง','40340'],['ขามป้อม','40340'],['สระแก้ว','40340']],
'พล':[['เมืองพล','40120'],['โจดหนองแก','40120'],['เก่างิ้ว','40120'],['หนองมะเขือ','40120'],['หนองแวงโสกพระ','40120'],['เพ็กใหญ่','40120'],['โคกสง่า','40120'],['หนองแวงนางเบ้า','40120'],['ลอมคอม','40120'],['โนนข่า','40120'],['หัวทุ่ง','40120']],
'แวงใหญ่':[['แวงใหญ่','40330'],['ก้านเหลือง','40330'],['หัวทุ่ง','40330'],['โนนสะอาด','40330'],['คอนฉิม','40330']],
'แวงน้อย':[['แวงน้อย','40230'],['ก้านเหลือง','40230'],['ท่านางแนว','40230'],['ละหานนา','40230'],['ทางขวาง','40230']],
'หนองสองห้อง':[['หนองสองห้อง','40190'],['คึมชาด','40190'],['โนนธาตุ','40190'],['ตะกั่วป่า','40190'],['สำโรง','40190'],['หนองเม็ก','40190'],['ดอนดู่','40190'],['ดงเค็ง','40190'],['หันโจด','40190'],['ดอนดั่ง','40190'],['วังหิน','40190'],['หนองไผ่ล้อม','40190']],
'ภูเวียง':[['หน้าพระธาตุ','40150'],['กุดขอนแก่น','40150'],['นาชุมแสง','40150'],['นาหว้า','40150'],['หนองกุงธนสาร','40150'],['หนองกุงเซิน','40150'],['บ้านเรือ','40150'],['หว้าทอง','40150'],['กุดเค้า','40150'],['สาวะถี','40150']],
'มัญจาคีรี':[['กุดเค้า','40160'],['สวนหม่อน','40160'],['หนองแวง','40160'],['ท่าศาลา','40160'],['นาข่า','40160'],['นางาม','40160'],['โพนเพ็ก','40160'],['คำแคน','40160'],['หนองไผ่','40160'],['หนองปลาเข็ง','40160']],
'ชนบท':[['ชนบท','40180'],['กุดเพียขอม','40180'],['วังแสง','40180'],['ห้วยแก','40180'],['บ้านแท่น','40180'],['ศรีบุญเรือง','40180'],['โนนพะยอม','40180'],['ปอแดง','40180']],
'เขาสวนกวาง':[['เขาสวนกวาง','40280'],['ดงเมืองแอม','40280'],['นางิ้ว','40280'],['โนนสมบูรณ์','40280'],['คำม่วง','40280']],
'ภูผาม่าน':[['ภูผาม่าน','40350'],['วังสวาบ','40350'],['ห้วยม่วง','40350'],['โนนคอม','40350']],
'ซำสูง':[['คูคำ','40170'],['ห้วยเตย','40170'],['คำแมด','40170'],['บ้านโนน','40170'],['สูงเนิน','40170'],['หนองช้างใหญ่','40170']],
'โคกโพธิ์ไชย':[['บ้านโคก','40160'],['โพธิ์ไชย','40160'],['ซับสมบูรณ์','40160'],['นาแพง','40160']],
'หนองนาคำ':[['กุดธาตุ','40150'],['บ้านโคก','40150'],['หนองนาคำ','40150']],
'บ้านแฮด':[['บ้านแฮด','40110'],['โมนน้อย','40110'],['หนองแวงโสกพระ','40110'],['โนนสมบูรณ์','40110']],
'โนนศิลา':[['โนนศิลา','40340'],['หนองปลาหมอ','40340'],['บ้านหัน','40340'],['เปือยใหญ่','40340'],['โนนแดง','40340']],
'เวียงเก่า':[['เมืองเก่าพัฒนา','40150'],['เขาน้อย','40150'],['ในเมือง','40150']],
}},
'จันทบุรี':{d:['เมืองจันทบุรี','ขลุง','ท่าใหม่','โป่งน้ำร้อน','มะขาม','แหลมสิงห์','สอยดาว','แก่งหางแมว','นายายอาม','เขาคิชฌกูฏ']},
'ฉะเชิงเทรา':{d:['เมืองฉะเชิงเทรา','คลองเขื่อน','บางคล้า','บางน้ำเปรี้ยว','บางปะกง','บ้านโพธิ์','พนมสารคาม','ราชสาส์น','สนามชัยเขต','แปลงยาว','ท่าตะเกียบ']},
'ชลบุรี':{d:['เมืองชลบุรี','บ้านบึง','หนองใหญ่','บางละมุง','พานทอง','พนัสนิคม','ศรีราชา','เกาะสีชัง','สัตหีบ','บ่อทอง','เกาะจันทร์']},
'ชัยนาท':{d:['เมืองชัยนาท','มโนรมย์','วัดสิงห์','สรรพยา','สรรคบุรี','หันคา','หนองมะโมง','เนินขาม']},
'ชัยภูมิ':{d:['เมืองชัยภูมิ','บ้านเขว้า','คอนสวรรค์','เกษตรสมบูรณ์','หนองบัวแดง','จัตุรัส','บำเหน็จณรงค์','หนองบัวระเหว','เทพสถิต','ภูเขียว','บ้านแท่น','แก้งคร้อ','คอนสาร','ภักดีชุมพล','เนินสง่า','ซับใหญ่']},
'ชุมพร':{d:['เมืองชุมพร','ท่าแซะ','ปะทิว','หลังสวน','ละแม','พะโต๊ะ','สวี','ทุ่งตะโก']},
'เชียงราย':{d:['เมืองเชียงราย','เวียงชัย','เชียงของ','เทิง','พาน','ป่าแดด','แม่จัน','เชียงแสน','แม่ลาว','เวียงป่าเป้า','พญาเม็งราย','เวียงแก่น','ขุนตาล','แม่ฟ้าหลวง','แม่ลาว','เวียงเชียงรุ้ง','ดอยหลวง']},
'เชียงใหม่':{d:['เมืองเชียงใหม่','จอมทอง','แม่แจ่ม','เชียงดาว','ดอยสะเก็ด','แม่แตง','แม่ริม','สะเมิง','ฝาง','แม่อาย','พร้าว','สันป่าตอง','สันกำแพง','สันทราย','หางดง','ฮอด','ดอยเต่า','อมก๋อย','สารภี','เวียงแหง','ไชยปราการ','แม่วาง','แม่ออน','ดอยหล่อ','กัลยาณิวัฒนา']},
'ตรัง':{d:['เมืองตรัง','กันตัง','ย่านตาขาว','ปะเหลียน','สิเกา','ห้วยยอด','วังวิเศษ','นาโยง','รัษฎา','หาดสำราญ']},
'ตราด':{d:['เมืองตราด','คลองใหญ่','เขาสมิง','บ่อไร','แหลมงอบ','เกาะกูด','เกาะช้าง']},
'ตาก':{d:['เมืองตาก','บ้านตาก','สามเงา','แม่ระมาด','ท่าสองยาง','แม่สอด','พบพระ','อุ้มผาง','วังเจ้า']},
'นครนายก':{d:['เมืองนครนายก','ปากพลี','บ้านนา','องครักษ์']},
'นครปฐม':{d:['เมืองนครปฐม','กำแพงแสน','นครชัยศรี','ดอนตูม','บางเลน','สามพราน','พุทธมณฑล']},
'นครพนม':{d:['เมืองนครพนม','ปลาปาก','ท่าอุเทน','บ้านแพง','ธาตุพนม','เรณูนคร','นาแก','ศรีสงคราม','นาหว้า','โพนสวรรค์','นาทม','วังยาง']},
'นครราชสีมา':{d:['เมืองนครราชสีมา','ครบุรี','เสิงสาง','คง','บ้านเหลื่อม','จักราช','โชคชัย','ด่านขุนทด','โนนไทย','โนนสูง','ขามสะแกแสง','บัวใหญ่','ประทาย','ปักธงชัย','พิมาย','ห้วยแถลง','ชุมพวง','สูงเนิน','ขามทะเลสอ','สีดา','เฉลิมพระเกียรติ','เมืองยาง','พระทองคำ','ลำทะเมนชัย','บัวลาย','สีคิ้ว','ปากช่อง','หนองบุญมาก','แก้งสนามนาง','โนนแดง','วังน้ำเขียว','พิมาย','เทพารักษ์']},
'นครศรีธรรมราช':{d:['เมืองนครศรีธรรมราช','พรหมคีรี','ลานสกา','ฉวาง','พิปูน','เชียรใหญ่','ชะอวด','ท่าศาลา','ทุ่งสง','นาบอน','ทุ่งใหญ่','ปากพนัง','ร่อนพิบูลย์','สิชล','ขนอม','หัวไทร','บางขัน','ถ้ำพรรณรา','จุฬาภรณ์','พระพรหม','นบพิตำ','ช้างกลาง','เฉลิมพระเกียรติ']},
'นครสวรรค์':{d:['เมืองนครสวรรค์','โกรกพระ','ชุมแสง','หนองบัว','บรรพตพิสัย','เก้าเลี้ยว','ตาคลี','ท่าตะโก','ไพศาลี','พยุหะคีรี','ลาดยาว','ตากฟ้า','แม่วงก์','แม่เปิน','ชุมตาบง']},
'นนทบุรี':{d:['เมืองนนทบุรี','บางกรวย','บางใหญ่','บางบัวทอง','ไทรน้อย','ปากเกร็ด']},
'นราธิวาส':{d:['เมืองนราธิวาส','ตากใบ','บาเจาะ','ยี่งอ','ระแงะ','รือเสาะ','ศรีสาคร','แว้ง','สุคิริน','สุไหงโก-ลก','สุไหงปาดี','จะแนะ','เจาะไอร้อง']},
'น่าน':{d:['เมืองน่าน','แม่จริม','บ้านหลวง','นาน้อย','ปัว','ท่าวังผา','เวียงสา','ทุ่งช้าง','เชียงกลาง','นาหมื่น','สันติสุข','บ่อเกลือ','สองแคว','ภูเพียง','เฉลิมพระเกียรติ']},
'บึงกาฬ':{d:['เมืองบึงกาฬ','พรเจริญ','โซ่พิสัย','เซกา','ปากคาด','บึงโขงหลง','ศรีวิไล','บุ้งคล้า']},
'บุรีรัมย์':{d:['เมืองบุรีรัมย์','คูเมือง','กระสัง','นางรอง','หนองกี่','ละหานทราย','ประโคนชัย','บ้านกรวด','พุทไธสง','ลำปลายมาศ','สตึก','ปะคำ','นาโพธิ์','หนองหงส์','พลับพลาชัย','ห้วยราช','โนนสุวรรณ','ชำนิ','บ้านใหม่ไชยพจน์','โนนดินแดง','บ้านด่าน','แคนดง','เฉลิมพระเกียรติ']},
'ปทุมธานี':{d:['เมืองปทุมธานี','คลองหลวง','ธัญบุรี','หนองเสือ','ลาดหลุมแก้ว','ลำลูกกา','สามโคก']},
'ประจวบคีรีขันธ์':{d:['เมืองประจวบคีรีขันธ์','กุยบุรี','ทับสะแก','บางสะพาน','บางสะพานน้อย','บึงนาราง','สามร้อยยอด','หัวหิน','ปราณบุรี','เขาย้อย','ปากท่อ','วังมะนาว']},
'ปราจีนบุรี':{d:['เมืองปราจีนบุรี','กบินทร์บุรี','นาดี','บ้านสร้าง','ประจันตคาม','ศรีมหาโพธิ','ศรีมโหสถ']},
'ปัตตานี':{d:['เมืองปัตตานี','โคกโพธิ์','หนองจิก','ปะนาเระ','มายอ','ทุ่งยางแดง','สายบุรี','ไม้แก่น','ยะหริ่ง','ยะรัง','กะพ้อ','แม่ลาน']},
'พระนครศรีอยุธยา':{d:['พระนครศรีอยุธยา','ท่าเรือ','นครหลวง','บางซ้าย','บางบาล','บางปะอิน','บางปะหัน','บางไทร','บางสาย','บ้านแพรก','ผักไห่','ภาชี','ลาดบัวหลวง','วังน้อย','เสนา','บางเมือง']},
'พะเยา':{d:['เมืองพะเยา','จุน','เชียงคำ','เชียงม่วน','ดอกคำใต้','ปง','แม่ใจ','ภูซาง','ภูกามยาว']},
'พังงา':{d:['เมืองพังงา','เกาะยาว','กะปง','ตะกั่วทุ่ง','ตะกั่วป่า','ทับปุด','ท้ายเหมือง','คุระบุรี','ตะกั่วป่า']},
'พัทลุง':{d:['เมืองพัทลุง','กงหรา','เขาชัยสน','ตะโหมด','ควนขนุน','ปากพะยูน','ศรีบรรพต','ป่าบอน','บางแก้ว','ป่าพะยอม','เขาย้อย']},
'พิจิตร':{d:['เมืองพิจิตร','วังทรายพูน','โพธิ์ประทับช้าง','ตะพานหิน','บางมูลนาก','โพทะเล','สามง่าม','ทับคล้อ','สากเหล็ก','บึงนาราง','ดงเจริญ','วชิรบารมี']},
'พิษณุโลก':{d:['เมืองพิษณุโลก','นครไทย','ชาติตระการ','บางระกำ','บางกระทุ่ม','พรหมพิราม','วัดโบสถ์','วังทอง','เนินมะปราง']},
'เพชรบุรี':{d:['เมืองเพชรบุรี','เขาย้อย','หนองหญ้าปล้อง','ชะอำ','ท่ายาง','บ้านลาด','บ้านแหลม','แก่งกระจาน']},
'เพชรบูรณ์':{d:['เมืองเพชรบูรณ์','ชนแดน','หล่มสัก','หล่มเก่า','วิเชียรบุรี','ศรีเทพ','หนองไผ่','บึงสามพัน','น้ำหนาว','วังโป่ง','เขาค้อ']},
'แพร่':{d:['เมืองแพร่','ร้องกวาง','ลอง','สูงเม่น','เด่นชัย','สอง','วังชิ้น','หนองม่วงไข่']},
'ภูเก็ต':{d:['เมืองภูเก็ต','กะทู้','ถลาง']},
'มหาสารคาม':{d:['เมืองมหาสารคาม','แกดำ','โกสุมพิสัย','กันทรวิชัย','เชียงยืน','บรบือ','นาเชือก','พยัคฆภูมิพิสัย','วาปีปทุม','นาดูน','ยางสีสุราช','กุดรัง','ชื่นชม']},
'มุกดาหาร':{d:['เมืองมุกดาหาร','นิคมคำสร้อย','ดอนตาล','ดงหลวง','คำชะอี','หว้านใหญ่','หนองสูง']},
'แม่ฮ่องสอน':{d:['เมืองแม่ฮ่องสอน','ขุนยวม','ปาย','แม่สะเรียง','แม่ลาน้อย','สบเมย','ปางมะผ้า']},
'ยโสธร':{d:['เมืองยโสธร','ทรายมูล','กุดชุม','คำเขื่อนแก้ว','ป่าติ้ว','มหาชนะชัย','ค้อวัง','เลิงนกทา','ไทยเจริญ']},
'ยะลา':{d:['เมืองยะลา','เบตง','บันนังสตา','ธารโต','ยะหา','รามัน','กาบัง','กรงปินัง']},
'ร้อยเอ็ด':{d:['เมืองร้อยเอ็ด','เกษตรวิสัย','ปทุมรัตต์','จตุรพักตรพิมาน','ธวัชบุรี','พนมไพร','โพนทอง','โพธิ์ชัย','หนองพอก','เสลภูมิ','สุวรรณภูมิ','เมืองสรวง','โพนทราย','อาจสามารถ','เมยวดี','ศรีสมเด็จ','จังหาร','เชียงขวัญ','หนองฮี','ทุ่งเขาหลวง']},
'ระนอง':{d:['เมืองระนอง','ละอุ่น','กะเปอร์','กระบุรี','สุขสำราญ']},
'ระยอง':{d:['เมืองระยอง','บ้านฉาง','แกลง','วังจันทร์','บ้านค่าย','ปลวกแดง','เขาชะเมา','นิคมพัฒนา']},
'ราชบุรี':{d:['เมืองราชบุรี','จอมบึง','สวนผึ้ง','ดำเนินสะดวก','บ้านโป่ง','บางแพ','โพธาราม','ปากท่อ','วัดเพลง','บ้านคา']},
'ลพบุรี':{d:['เมืองลพบุรี','พัฒนานิคม','โคกสำโรง','ชัยบาดาล','ท่าวุ้ง','บ้านหมี่','ท่าหลวง','สระโบสถ์','โคกเจริญ','ลำสนธิ','หนองม่วง']},
'ลำปาง':{d:['เมืองลำปาง','แม่เมาะ','เกาะคา','เสริมงาม','งาว','แจ้ห่ม','วังเหนือ','เถิน','แม่พริก','แม่ทะ','สบปราบ','ห้างฉัตร','เมืองปาน']},
'ลำพูน':{d:['เมืองลำพูน','แม่ทา','บ้านโฮ่ง','ลี้','ทุ่งหัวช้าง','ป่าซาง','บ้านธิ','เวียงหนองล่อง']},
'เลย':{d:['เมืองเลย','นาด้วง','เชียงคาน','ปากชม','ด่านซ้าย','นาแห้ว','ภูเรือ','ท่าลี่','วังสะพุง','ภูกระดึง','ภูหลวง','ผาขาว','เอราวัณ','หนองหิน']},
'ศรีสะเกษ':{d:['เมืองศรีสะเกษ','ยางชุมน้อย','กันทรารมย์','กันทรลักษ์','ขุขันธ์','ไพรบึง','ปรางค์กู่','ขุนหาญ','ราษีไศล','อุทุมพรพิสัย','บึงบูรพ์','ห้วยทับทัน','โนนคูณ','ศรีรัตนะ','น้ำเกลี้ยง','วังหิน','ภูสิงห์','เมืองจันทร์','เบญจลักษ์','พยุห์','โพธิ์ศรีสุวรรณ','ศิลาลาด']},
'สกลนคร':{d:['เมืองสกลนคร','กุสุมาลย์','กุดบาก','พรรณานิคม','พังโคน','วาริชภูมิ','นิคมน้ำอูน','วานรนิวาส','คำตากล้า','บ้านม่วง','อากาศอำนวย','สว่างแดนดิน','ส่องดาว','เต่างอย','โคกศรีสุพรรณ','เจริญศิลป์','โพนนาแก้ว','ภูพาน']},
'สงขลา':{d:['เมืองสงขลา','สทิงพระ','จะนะ','นาทวี','เทพา','สะบ้าย้อย','ระโนด','กระแสสินธุ์','รัตภูมิ','สะเดา','หาดใหญ่','นาหม่อม','ควนเนียง','บางกล่ำ','สิงหนคร','คลองหอยโข่ง']},
'สตูล':{d:['เมืองสตูล','ควนโดน','ควนกาหลง','ท่าแพ','ละงู','ทุ่งหว้า','มะนัง']},
'สมุทรปราการ':{d:['เมืองสมุทรปราการ','บางบ่อ','บางพลี','พระประแดง','พระสมุทรเจดีย์','บางเสาธง']},
'สมุทรสงคราม':{d:['เมืองสมุทรสงคราม','บางคนที','อัมพวา']},
'สมุทรสาคร':{d:['เมืองสมุทรสาคร','กระทุ่มแบน','บ้านแพ้ว']},
'สระแก้ว':{d:['เมืองสระแก้ว','คลองหาด','ตาพระยา','วังน้ำเย็น','วัฒนานคร','อรัญประเทศ','เขาฉกรรจ์','โคกสูง','วังสมบูรณ์']},
'สระบุรี':{d:['เมืองสระบุรี','แก่งคอย','หนองแค','วิหารแดง','หนองแซง','บ้านหมอ','ดอนพุด','หนองโดน','พระพุทธบาท','สระโบสถ์','วังม่วง','เฉลิมพระเกียรติ']},
'สิงห์บุรี':{d:['เมืองสิงห์บุรี','บางระจัน','ค่ายบางระจัน','พรหมบุรี','ท่าช้าง','อินทร์บุรี']},
'สุโขทัย':{d:['เมืองสุโขทัย','บ้านด่านลานหอย','คีรีมาศ','กงไกรลาศ','ศรีสัชนาลัย','ศรีสำโรง','สวรรคโลก','ศรีนคร','ทุ่งเสลี่ยม']},
'สุพรรณบุรี':{d:['เมืองสุพรรณบุรี','เดิมบางนางบวช','ด่านช้าง','บางปลาม้า','ศรีประจันต์','ดอนเจดีย์','สองพี่น้อง','สามชุก','อู่ทอง','หนองหญ้าไซ']},
'สุราษฎร์ธานี':{d:['เมืองสุราษฎร์ธานี','กาญจนดิษฐ์','ดอนสัก','เกาะสมุย','เกาะพะงัน','ไชยา','ท่าชนะ','คีรีรัฐนิคม','บ้านตาขุน','พนม','ท่าฉาง','บ้านนาสาร','บ้านนาเดิม','เคียนซา','เวียงสระ','พระแสง','พุนพิน','ชัยบุรี','วิภาวดี']},
'สุรินทร์':{d:['เมืองสุรินทร์','ชุมพลบุรี','ท่าตูม','จอมพระ','ปราสาท','กาบเชิง','รัตนบุรี','สนม','ศรีขรภูมิ','สังขะ','ลำดวน','สำโรงทาบ','บัวเชด','พนมดงรัก','ศรีณรงค์','เขวาสินรินทร์','โนนนารายณ์']},
'หนองคาย':{d:['เมืองหนองคาย','ท่าบ่อ','โพนพิสัย','ศรีเชียงใหม่','สังคม','สระใคร','เฝ้าไร่','รัตนวาปี','โพธิ์ตาก']},
'หนองบัวลำภู':{d:['เมืองหนองบัวลำภู','นากลาง','โนนสัง','ศรีบุญเรือง','สุวรรณคูหา','นาวัง']},
'อ่างทอง':{d:['เมืองอ่างทอง','ไชโย','ป่าโมก','โพธิ์ทอง','แสวงหา','วิเศษชัยชาญ','สามโก้']},
'อำนาจเจริญ':{d:['เมืองอำนาจเจริญ','ชานุมาน','ปทุมราชวงศา','พนา','เสนางคนิคม','หัวตะพาน','ลืออำนาจ']},
'อุดรธานี':{d:['เมืองอุดรธานี','กุดจับ','หนองวัวซอ','กุมภวาปี','โนนสะอาด','หนองหาน','ทุ่งฝน','ไชยวาน','ศรีธาตุ','วังสามหมอ','บ้านดุง','บ้านผือ','น้ำโสม','เพ็ญ','สร้างคอม','หนองแสง','นายูง','พิบูลย์รักษ์','กู่แก้ว','ประจักษ์ศิลปาคม']},
'อุตรดิตถ์':{d:['เมืองอุตรดิตถ์','ตรอน','ท่าปลา','น้ำปาด','ฟากท่า','บ้านโคก','พิชัย','ลับแล','ทองแสนขัน']},
'อุทัยธานี':{d:['เมืองอุทัยธานี','ทัพทัน','สว่างอารมณ์','หนองฉาง','หนองขาหย่าง','บ้านไร่','ลานสัก','ห้วยคต']},
'อุบลราชธานี':{d:['เมืองอุบลราชธานี','ศรีเมืองใหม่','โขงเจียม','เขื่องใน','เขมราฐ','เดชอุดม','นาจะหลวย','น้ำยืน','บุณฑริก','ตระการพืชผล','กุดข้าวปุ้น','ม่วงสามสิบ','วารินชำราบ','พิบูลมังสาหาร','ตาลสุม','โพธิ์ไทร','สำโรง','ดอนมดแดง','สิรินธร','ทุ่งศรีอุดม','นาเยีย','นาตาล','เหล่าเสือโก้ก','สว่างวีระวงศ์','น้ำขุ่น']}
};
  return _GEO_DATA;
}

function getGeoData(province) {
  const g = _buildGeo();
  if (!province) {
    return { provinces: Object.keys(g).sort() };
  }
  const p = g[province];
  if (!p) return { districts:[], subdistricts:{} };
  const subs = {};
  if (p.s) {
    Object.entries(p.s).forEach(([dist, pairs]) => {
      const seen = new Set();
      subs[dist] = pairs.filter(([name]) => { if (seen.has(name)) return false; seen.add(name); return true; });
    });
  }
  return { districts: (p.d || []).slice().sort(), subdistricts: subs };
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
    studyPlansMid:  String(cfg.STUDY_PLANS_MID ||'แผนการเรียนทั่วไป').split('\n').map(s=>s.trim()).filter(Boolean),
    studyPlansHigh: String(cfg.STUDY_PLANS_HIGH||'วิทยาศาสตร์-คณิตศาสตร์\nศิลปะ-ภาษา\nศิลปะ-การงานอาชีพ').split('\n').map(s=>s.trim()).filter(Boolean),
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
    _log(sess.name,'UPDATE_APP',appId+' → '+JSON.stringify(updates));
    return { ok };
  });
}

function deleteApplication(token, appId) {
  const sess = _requirePerm(token, 'DELETE_APP');
  return _withLock(() => {
    const ok = _deleteRow(SH.APP,'APP_ID',appId);
    if (ok) _log(sess.name,'DELETE_APP',appId);
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

  return {
    total:apps.length, m1Total:m1.length, m4Total:m4.length,
    m1Quota, m4Quota,
    byStatus:byStatus(apps), m1ByStatus:byStatus(m1), m4ByStatus:byStatus(m4),
    dailyTrend:days, byType, topSchools, byProvince,
    inZone, outZone: inZone !== null ? apps.length - inZone : null,
    m1Eligible, m4Eligible
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
