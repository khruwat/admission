# 📋 MASTER PROMPT — ระบบบันทึกที่อยู่
# สำหรับระบบรับสมัครนักเรียน
# ใช้ prompt นี้กับ Claude / ChatGPT / Gemini เพื่อสร้าง address form ใหม่
# ════════════════════════════════════════════════════════════════

---

## 🔰 PROMPT พื้นฐาน (ใช้ได้ทุกระบบ)

```
สร้างฟอร์มบันทึกที่อยู่สำหรับระบบรับสมัครนักเรียน โดยมีเงื่อนไขดังนี้:

LIBRARY ที่ใช้:
- jquery.Thailand.js (earthchie/jquery.Thailand.js บน GitHub)
- ใช้ autocomplete ตำบล → อำเภอ → จังหวัด → รหัสไปรษณีย์ อัตโนมัติ
- Database URL: https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/database/db.json

DESIGN SYSTEM:
- Font: Sarabun (Google Fonts) — ภาษาไทย
- Theme: Navy (#0a1628) + Gold (#c9a84c) + Cream (#fdf8ef)
- CSS class prefix: addr- (เช่น addr-card, addr-field, addr-row)
- Input id prefix: [ชื่อที่อยู่]-[ชื่อfield] เช่น home-district, parent-amphoe

FIELDS ที่ต้องมีในทุก address block:
Required: เลขที่บ้าน (house_no), ตำบล (district), อำเภอ (amphoe), จังหวัด (province), รหัสไปรษณีย์ (zipcode)
Optional: ชื่ออาคาร (building), หมู่ที่ (moo), ซอย (soi), ถนน (road)

FEATURES:
- Validation: ตรวจ required fields + รูปแบบรหัสไปรษณีย์ 5 หลัก
- Error state: class "has-error" บน .addr-field
- "ใช้ที่อยู่เดียวกัน" checkbox ที่ซ่อน/แสดง fields พร้อม copy preview
- Responsive: 1 column บนมือถือ, grid บน desktop

[ระบุความต้องการเพิ่มเติมด้านล่าง]
```

---

## 🎯 PROMPT สำเร็จรูป — แยกตามหน้าจอ

---

### PROMPT-01 | ขั้นตอน 2: ที่อยู่นักเรียน (สองที่อยู่)

```
สร้าง address form สำหรับขั้นตอนที่ 2 "ที่อยู่" ในระบบรับสมัครนักเรียน
ใช้ jquery.Thailand.js autocomplete + design system Navy/Gold

ต้องมี:
1. Card "ที่อยู่ตามทะเบียนบ้าน" (prefix: home)
   - fields: เลขที่, อาคาร/หมู่บ้าน, หมู่, ซอย, ถนน, รหัสไปรษณีย์, ตำบล, อำเภอ, จังหวัด
   - ตำบล/อำเภอ/จังหวัด/รหัสไปรษณีย์ ใช้ jquery.Thailand.js autocomplete

2. Card "ที่อยู่ที่ติดต่อได้" (prefix: contact)
   - มี checkbox "ใช้ที่อยู่เดียวกับทะเบียนบ้าน"
   - ถ้าติ๊ก checkbox → ซ่อน fields + แสดง preview ที่อยู่ที่คัดลอก
   - fields เหมือนข้อ 1

3. JavaScript:
   - initThailand('home') และ initThailand('contact')
   - collectAddress(prefix) → return object
   - validateAddress(prefix) → return boolean
   - formatAddress(obj) → return string ที่อยู่บรรทัดเดียว

4. Platform: [ระบุ: Google Apps Script / PHP / HTML standalone]
   - ถ้า GAS: บันทึกด้วย google.script.run.saveAddress(payload)
   - ถ้า PHP: ส่ง fetch POST ไปยัง save_address.php
   - ถ้า standalone: console.log payload

รูปแบบ output: ไฟล์ HTML เดียว (inline CSS + JS)
```

---

### PROMPT-02 | ขั้นตอน 3: ข้อมูลผู้ปกครอง

```
สร้าง address block สำหรับหน้า "ข้อมูลผู้ปกครอง" ในระบบรับสมัครนักเรียน
ใช้ design system และ jquery.Thailand.js เดิม

ในหน้านี้มีผู้ปกครอง 2 คน (บิดา + มารดา) แต่ละคนมีที่อยู่ของตัวเอง
- บิดา: prefix "father"
- มารดา: prefix "mother"

แต่ละ card ผู้ปกครองต้องมี:
- ข้อมูลส่วนตัว: ชื่อ-นามสกุล, เลขบัตรประชาชน, อาชีพ, เบอร์โทร
- Address block (prefix ตามชื่อ)
- Checkbox "ที่อยู่เดียวกับนักเรียน" (copy จาก prefix "home" ที่บันทึกไว้แล้ว)
- Checkbox "ที่อยู่เดียวกับบิดา" (เฉพาะ card มารดา — copy จาก "father")

JavaScript:
- initThailand สำหรับ father และ mother
- validateAddress ตรวจทั้งสองคน
- collectAll() → return { father: {...}, mother: {...} }
```

---

### PROMPT-03 | ขั้นตอน 5: หน้าตรวจสอบและยืนยัน

```
สร้างหน้า "ตรวจสอบข้อมูล" (Review Page) สำหรับระบบรับสมัครนักเรียน
โดยแสดงข้อมูลที่อยู่ที่กรอกมาทั้งหมดในรูปแบบ read-only summary card

แสดงข้อมูลต่อไปนี้แบบ readonly (ไม่ใช่ input):
1. ที่อยู่ตามทะเบียนบ้าน (จาก home_address)
2. ที่อยู่ที่ติดต่อได้ (จาก contact_address)
3. ที่อยู่บิดา (จาก father_address)
4. ที่อยู่มารดา (จาก mother_address)

แต่ละ section มีปุ่ม "แก้ไข" ที่ link กลับไปหน้าที่เกี่ยวข้อง
Design: ใช้ grid 2 columns สำหรับ label-value pair
ที่อยู่แสดงเป็น string เต็ม (formatAddress)
```

---

### PROMPT-04 | Admin: หน้าดูรายชื่อผู้สมัคร + ที่อยู่

```
สร้างหน้า Admin สำหรับดูรายชื่อนักเรียนที่สมัคร พร้อมที่อยู่
- Data source: Google Sheets (ดึงผ่าน google.script.run.getApplications())
- แสดงเป็น table: ลำดับ, ชื่อ-สกุล, ที่อยู่ตามทะเบียนบ้าน (สั้น), จังหวัด, สถานะ
- คลิกแถวเพื่อดู popup รายละเอียดที่อยู่ครบทุก field
- มีช่อง filter: กรองตามจังหวัด, search ชื่อ
- Export ปุ่ม: ดาวน์โหลดเป็น CSV
- Design: ใช้ theme เดิม Navy/Gold
```

---

### PROMPT-05 | Mobile-First: หน้ากรอกที่อยู่บนมือถือ

```
สร้าง address form เวอร์ชัน mobile-first สำหรับระบบรับสมัครนักเรียน
เน้นใช้งานง่ายบนหน้าจอขนาดเล็ก

Requirements:
- Layout: 1 column ทั้งหน้า, ไม่มี multi-column grid
- ที่อยู่เดียว (prefix: home) — compact version ไม่มี หมู่/ซอย/ถนน
- jquery.Thailand.js: autocomplete แบบ bottom-sheet style บนมือถือ
- Step indicator: แสดงว่าอยู่ step ที่เท่าไหร่ (แบบ dot indicator)
- ปุ่ม submit ใหญ่ sticky ที่ด้านล่างหน้าจอ
- Font size: ไม่เล็กกว่า 16px เพื่อป้องกัน zoom อัตโนมัติบน iOS
- Design: clean, minimal — ลด visual noise
```

---

## ⚙️ PROMPT เพิ่ม Feature

---

### ADD-01 | เพิ่ม Google Maps แสดงพิกัด

```
เพิ่ม feature แสดง Google Maps ใน address block ที่มีอยู่แล้ว
เมื่อ jquery.Thailand.js กรอก district/amphoe/province แล้ว
→ ใช้ Geocoding API แปลงที่อยู่เป็นพิกัด lat/lng
→ แสดง Google Maps iframe embed ขนาด 300x200px
→ เพิ่ม input hidden 2 ตัว: [prefix]-lat, [prefix]-lng
→ มีปุ่ม "ตรวจสอบตำแหน่ง" เปิด Google Maps ใน tab ใหม่

Google Maps API Key: [ใส่ key ของคุณ]
```

---

### ADD-02 | เพิ่ม Address History / Autosave Draft

```
เพิ่ม feature บันทึก draft อัตโนมัติใน address form ที่มีอยู่
- ทุกครั้งที่ user พิมพ์ → save ลง localStorage key "enroll_draft_address"
- เมื่อโหลดหน้า → ถ้ามี draft → แสดง banner "พบข้อมูลที่กรอกค้างไว้ กู้คืน?"
- ปุ่ม "กู้คืน" → fill ข้อมูลกลับ, ปุ่ม "เริ่มใหม่" → ลบ draft
- เมื่อ submit สำเร็จ → ลบ draft ออก
```

---

### ADD-03 | เพิ่ม Copy Address จาก Clipboard / QR

```
เพิ่มปุ่ม "วางที่อยู่" ใน address block
เมื่อคลิก → อ่านข้อความจาก clipboard
→ ใช้ AI (Claude API) parse ที่อยู่ภาษาไทยแบบ free-text 
  เช่น "123 ซอยสุขุมวิท 11 แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพฯ 10110"
→ map ผลลัพธ์ใส่ fields อัตโนมัติ
→ แสดง confirmation dialog ก่อน fill

Claude API system prompt:
"แปลงที่อยู่ภาษาไทยต่อไปนี้เป็น JSON object ที่มี keys: 
house_no, building, moo, soi, road, district, amphoe, province, zipcode
ตอบกลับด้วย JSON เท่านั้น ไม่ต้องมีคำอธิบาย"
```

---

## 🗂️ DATA STRUCTURE อ้างอิง

### Address Object (JavaScript)
```javascript
{
  house_no: "123/4",       // เลขที่บ้าน  (required)
  building: "หมู่บ้านสุขสันต์", // อาคาร/หมู่บ้าน
  moo:      "5",           // หมู่ที่
  soi:      "สุขสันต์ 3",  // ซอย
  road:     "พหลโยธิน",    // ถนน
  district: "คลองหนึ่ง",   // ตำบล/แขวง  (required, autocomplete)
  amphoe:   "คลองหลวง",    // อำเภอ/เขต  (required, auto-fill)
  province: "ปทุมธานี",    // จังหวัด    (required, auto-fill)
  zipcode:  "12120"        // รหัสไปรษณีย์ (required, auto-fill)
}
```

### Full Enrollment Payload (Google Sheets / API)
```javascript
{
  // Step 1 — ข้อมูลนักเรียน
  student: {
    prefix: "เด็กชาย",
    firstname: "สมชาย",
    lastname: "ใจดี",
    id_card: "1234567890123",
    dob: "2558-05-20",
    gender: "male",
    nationality: "ไทย",
    religion: "พุทธ",
    blood_type: "O"
  },
  // Step 2 — ที่อยู่
  home_address:    { ...address_object },
  contact_address: { ...address_object },
  same_as_home: true,
  // Step 3 — ผู้ปกครอง
  father: { name, id_card, occupation, phone, address: { ...address_object } },
  mother: { name, id_card, occupation, phone, address: { ...address_object } },
  guardian: { name, id_card, relation, phone, address: { ...address_object } },
  // Step 4 — เอกสาร
  documents: { id_card_copy: true, house_reg_copy: true, photo: true },
  // Meta
  submitted_at: "2025-03-17T09:00:00+07:00",
  academic_year: "2568",
  apply_level: "ม.1"
}
```

---

## 🔧 SNIPPET อ้างอิง

### Init jquery.Thailand.js
```javascript
function initThailand(prefix) {
  $.Thailand({
    database: 'https://earthchie.github.io/jquery.Thailand.js/jquery.Thailand.js/database/db.json',
    $district: $('#' + prefix + '-district'),
    $amphoe:   $('#' + prefix + '-amphoe'),
    $province: $('#' + prefix + '-province'),
    $zipcode:  $('#' + prefix + '-zipcode'),
    onDataFill: function(data) {
      // callback หลัง auto-fill
    }
  });
}
```

### Validate Address
```javascript
function validateAddress(prefix, optional) {
  if (optional) {
    var $fields = $('#' + prefix + '-fields');
    if ($fields.length && !$fields.is(':visible')) return true;
  }
  var ok = true;
  ['no','district','amphoe','province','zipcode'].forEach(function(key) {
    var $input = $('#' + prefix + '-' + key);
    if (!$input.length) return;
    var fid = 'f-' + prefix + '-' + (key === 'zipcode' ? 'zip' : key);
    if (!$input.val().trim()) {
      $('#' + fid).addClass('has-error'); ok = false;
    } else if (key === 'zipcode' && !/^\d{5}$/.test($input.val().trim())) {
      $('#' + fid).addClass('has-error'); ok = false;
    } else {
      $('#' + fid).removeClass('has-error');
    }
  });
  return ok;
}
```

### Format Address (Thai style)
```javascript
function formatAddress(d) {
  var p = [];
  if (d.house_no) p.push('เลขที่ ' + d.house_no);
  if (d.building) p.push(d.building);
  if (d.moo)      p.push('หมู่ ' + d.moo);
  if (d.soi)      p.push('ซอย' + d.soi);
  if (d.road)     p.push('ถนน' + d.road);
  if (d.district) p.push('ต.' + d.district);
  if (d.amphoe)   p.push('อ.' + d.amphoe);
  if (d.province) p.push('จ.' + d.province);
  if (d.zipcode)  p.push(d.zipcode);
  return p.join(' ');
}
```

### Same-As Toggle Engine
```javascript
// data-source="home" data-target="contact"
$('.addr-same-toggle').each(function() {
  var source = $(this).data('source');
  var target = $(this).data('target');
  $(this).find('input').on('change', function() {
    if (this.checked) {
      $('#' + target + '-fields').hide();
      $('#' + target + '-copy-preview')
        .html('📋 ที่อยู่เดียวกัน: ' + formatAddress(collectAddress(source)))
        .show();
    } else {
      $('#' + target + '-fields').show();
      $('#' + target + '-copy-preview').hide();
    }
  });
});
```

---

## 📁 FILE STRUCTURE อ้างอิง

```
📁 project/
├── 📄 address-template.html   ← template ครบทุก block (A–D)
├── 📄 address-component.css   ← CSS component แยกไฟล์
├── 📄 address-prompt.md       ← ไฟล์นี้ (prompt สำเร็จรูป)
│
├── 📁 google-apps-script/
│   ├── Code.gs                ← doGet / doPost / saveAddress
│   └── Index.html             ← หน้า form (embed ใน GAS)
│
├── 📁 standalone/
│   ├── step2-address.html     ← ขั้นตอน 2 (standalone HTML)
│   ├── step3-guardian.html    ← ขั้นตอน 3
│   └── step5-review.html      ← ขั้นตอน 5
│
└── 📁 php/
    ├── step2-address.php      ← form page
    └── save_address.php       ← backend save
```

---

## 💡 TIP การใช้ Prompt

1. **ระบุ Platform** เสมอ (GAS / PHP / HTML / React)
2. **ระบุ prefix** ของที่อยู่ที่จะสร้าง เพื่อให้ตั้งชื่อ id ได้ถูกต้อง
3. **ระบุ Block ที่อยากได้** (A=เดี่ยว, B=คู่+toggle, C=compact, D=ผู้ปกครอง)
4. **ระบุ Save destination** (Google Sheets ID / MySQL table / JSON file)
5. ใส่ SNIPPET อ้างอิงท้าย prompt เพื่อให้ AI ใช้โครงสร้างเดิม
