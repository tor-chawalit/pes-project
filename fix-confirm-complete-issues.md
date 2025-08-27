# แก้ไขปัญหาหน้า Confirm Complete - สรุปการแก้ไข

## ปัญหาที่แก้ไข

### 1. ✅ SubdepartmentName ไม่เข้าตาราง ProductionResults

**ปัญหา:** ข้อมูล SubdepartmentName ไม่ถูกบันทึกลงฐานข้อมูล

**การแก้ไข:**
- เพิ่ม SubDepartments JOIN ใน SQL query ของ `api/results.php`
- เพิ่ม SubdepartmentName ลงในพารามิเตอร์ INSERT และ UPDATE statements
- เพิ่ม SubdepartmentName ลงใน collectFormData() ใน `confirm-complete.js`

**ไฟล์ที่แก้ไข:**
- `api/results.php` - เพิ่ม LEFT JOIN SubDepartments และ field SubdepartmentName
- `confirm-complete.js` - เพิ่ม SubdepartmentName ใน formData object

### 2. ✅ TotalPieces ไม่ถูกคำนวณกับจำนวนล่าสุด (แก้ไขเพิ่มเติม)

**ปัญหา:** TotalPieces ใช้ logic เปรียบเทียบ (เลือกค่าที่มากกว่า) แทนการบวกรวมกับข้อมูลล่าสุด

**ปัญหาเดิม:**
- Partial Sessions = 20,000 ชิ้น  
- Form ล่าสุด = 10,000 ชิ้น
- โค้ดเดิม: max(20000, 10000) = 20,000 ✗
- ที่ถูกต้อง: 20,000 + 10,000 = 30,000 ✓

**การแก้ไข:**
- แก้ไข logic ให้บวกรวมกันแทนการเปรียบเทียบ
- `totalPieces += formTotalPieces` (บวกรวม) แทน `if (formTotalPieces > totalPieces)`
- เพิ่ม console.log แสดงรายละเอียดการคำนวณ

**ไฟล์ที่แก้ไข:**
- `confirm-complete.js` - แก้ไข logic การรวมข้อมูล TotalPieces, RejectPieces, ReworkPieces ให้บวกรวมกัน

### 3. ✅ Break Time ไม่เข้าฐานข้อมูล

**ปัญหา:** ข้อมูล Break Time ไม่ถูกส่งไปฐานข้อมูลอย่างถูกต้อง

**การแก้ไข:**
- แก้ไข logic ให้ใช้ Break Time จาก checkbox ในหน้า Confirm เสมอ
- ไม่ขึ้นกับว่าจะมี partial sessions หรือไม่
- ข้อมูล Break Time จะถูกบันทึกลงฟิลด์ BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes

**ไฟล์ที่แก้ไข:**
- `confirm-complete.js` - แก้ไขให้ใช้ checkbox เป็นหลักเสมอ

### 4. ✅ เวลาทำงานจริงต้องใช้ Total Runtime (แก้ไขเพิ่มเติม)

**ปัญหา:** 
1. การคำนวณเวลาทำงานใช้เฉพาะ Runtime จากฟอร์ม ไม่รวม Sessions
2. **Section การเปรียบเทียบเวลา** ยังใช้ `actualRunTime` แทน `totalRuntimeValue`
3. **ActiveWorkMinutes** ใช้ `actualRunTimeMinutes` (หัก break/downtime แล้ว) แทน Total Runtime

**ปัญหาเพิ่มเติมที่พบ:**
- Section การเปรียบเทียบเวลาแผน vs เวลาจริง ใช้แค่เวลาจากฟอร์ม
- Section เวลาที่ปฏิบัติงานได้ vs เวลาที่ปฏิบัติงานจริง ใช้แค่เวลาจากฟอร์ม
- **ActiveWorkMinutes** ในตาราง ProductionResults ใช้เวลาที่หัก break/downtime แทน Total Runtime
- ทำให้ข้อมูลการเปรียบเทียบและการบันทึกไม่ถูกต้อง

**การแก้ไข:**
- สร้างตัวแปร `totalRuntimeForComparison` ที่ดึงจาก `totalRuntimeValue` element
- ใช้ `totalRuntimeForComparison` ในฟังก์ชัน `updateTimeDifferenceFromCalculateTimes()`
- ใช้ `totalRuntimeForComparison` ในฟังก์ชัน `updateShiftRuntimeComparison()`
- **เปลี่ยน `ActiveWorkMinutes: actualRunTimeMinutes` เป็น `ActiveWorkMinutes: totalRuntimeMinutes`**
- เพิ่ม console.log แสดงการใช้ Total Runtime แทน actualRunTime

**ไฟล์ที่แก้ไข:**
- `confirm-complete.js` - แก้ไขการคำนวณ totalRuntimeMinutes และใช้ในการเปรียบเทียบเวลาและ ActiveWorkMinutes

### 5. ✅ เพิ่ม Partial Sessions Support

**การเพิ่มเติม:**
- เพิ่มฟิลด์ `IsFromPartialSessions` และ `TotalPartialSessions` ใน formData
- API จะตรวจสอบและรวม WorkingMinutes จาก ProductionSessions table
- ปรับปรุงการคำนวณให้สอดคล้องกับข้อมูลจาก partial sessions

## สรุปการเปลี่ยนแปลง

### API Changes (`api/results.php`)
```sql
-- เพิ่ม SubDepartments JOIN
LEFT JOIN SubDepartments sd ON p.SubDepartmentID = sd.SubDepartmentID

-- เพิ่ม field ใน INSERT/UPDATE
SubdepartmentName, -- เพิ่มฟิลด์นี้
```

### Frontend Changes (`confirm-complete.js`)
```javascript
// 1. TotalPieces Logic (แก้ไขแล้ว - บวกรวมกัน)
if (this.partialSessions && this.partialSessions.length > 0) {
    // รวมข้อมูลจาก partial sessions
    this.partialSessions.forEach(session => {
        totalPieces += session.SessionQuantity || 0;
        rejectPieces += session.SessionRejectQuantity || 0;
        reworkPieces += session.SessionReworkQuantity || 0;
    });
    
    // บวกรวมข้อมูลจากฟอร์มกับ partial sessions
    totalPieces += formTotalPieces;
    rejectPieces += formRejectPieces;
    reworkPieces += formReworkPieces;
}

// 2. Total Runtime Calculation  
let totalRuntimeMinutes = totalMinutes;
if (this.partialSessions && this.partialSessions.length > 0) {
    const partialRuntimeMinutes = this.partialSessions.reduce((sum, session) => {
        return sum + (session.WorkingMinutes || 0);
    }, 0);
    totalRuntimeMinutes += partialRuntimeMinutes;
}

// 3. Break Time from Form Checkboxes (แก้ไขแล้ว)
document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
    const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
    if (checkbox.value === 'morning') breakMorning = breakTimes[checkbox.value];
    if (checkbox.value === 'lunch') breakLunch = breakTimes[checkbox.value];
    if (checkbox.value === 'evening') breakEvening = breakTimes[checkbox.value];
});

// 4. เพิ่ม Fields ใน formData (แก้ไขเพิ่มเติม)
WorkingMinutes: totalRuntimeMinutes,
SubdepartmentName: this.taskData ? (this.taskData.SubdepartmentName || '') : '',
ActiveWorkMinutes: totalRuntimeMinutes, // เปลี่ยนจาก actualRunTimeMinutes เป็น totalRuntimeMinutes
IsFromPartialSessions: this.partialSessions && this.partialSessions.length > 0,
TotalPartialSessions: this.partialSessions ? this.partialSessions.length : 0,
```

## ผลลัพธ์ที่คาดหวัง

1. **SubdepartmentName** จะถูกบันทึกลงตาราง ProductionResults
2. **TotalPieces** จะรวมข้อมูลจาก partial sessions + ข้อมูลล่าสุดจากฟอร์ม
3. **Break Time** จะถูกบันทึกทั้งจาก partial sessions และ checkbox
4. **เวลาทำงานจริง** จะใช้ Total Runtime (ฟอร์ม + sessions) ในการคำนวณ OEE และการเปรียบเทียบ
5. ระบบจะทำงานได้ถูกต้องทั้งกรณีมี partial sessions และไม่มี partial sessions

## การทดสอบ

กรุณาทดสอบโดย:
1. สร้าง partial sessions และ confirm complete - ตรวจสอบข้อมูลในตาราง ProductionResults
2. Confirm complete โดยไม่มี partial sessions - ตรวจสอบการทำงานปกติ
3. ตรวจสอบการคำนวณ OEE ว่าใช้เวลารวมถูกต้อง
4. ตรวจสอบ SubdepartmentName ว่าถูกบันทึกลงฐานข้อมูล
