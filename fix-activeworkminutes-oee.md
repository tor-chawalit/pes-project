## การแก้ไข ActiveWorkMinutes และ OEE Calculation
=======================================================

### ปัญหาที่พบ:
1. **Double counting** - นับเวลา partial sessions ซ้ำ
2. **results.php** - ใช้ `WorkingMinutes` แทน `ActiveWorkMinutes`
3. **การคำนวณ OEE** - ใช้เวลาที่ไม่ถูกต้อง

### การแก้ไข:

#### 1. confirm-complete.js
- แยกการคำนวณ: `totalWorkingMinutesFromSessions` (หักแล้ว) กับ `currentFormActualRunTime` (หักแล้ว)
- `actualRunTimeMinutes = totalWorkingMinutesFromSessions + currentFormActualRunTime`
- `ActiveWorkMinutes: actualRunTimeMinutes` (เวลาทำงานสุทธิรวม)

#### 2. results.php  
- เปลี่ยนจาก `$data['WorkingMinutes']` เป็น `$data['ActiveWorkMinutes']`
- ไม่ต้องรวม partial sessions ซ้ำ เพราะ frontend รวมให้แล้ว

#### 3. การคำนวณ OEE ที่ถูกต้อง:
```
Availability = (actualRunTimeMinutes / plannedProductionMinutesForOEE) × 100
Performance = (totalPieces / (actualRunTimeMinutes × idealRunRate)) × 100  
Quality = (goodPieces / totalPieces) × 100
OEE = (Availability × Performance × Quality) / 10000
```

### ผลลัพธ์:
- **ActiveWorkMinutes** = เวลาทำงานสุทธิ (หัก break + downtime แล้ว)
- **OEE** = คำนวณจากเวลาทำงานสุทธิที่ถูกต้อง
- **ไม่มี double counting** = partial sessions + form ไม่ซ้ำซ้อน

### วิธีทดสอบ:
1. เปิด Browser Console ใน confirm-complete.html
2. กรอกข้อมูลและดู debug logs:
   - `=== WORKING TIME CALCULATION DEBUG ===`  
   - `=== OEE CALCULATION DEBUG ===`
3. ตรวจสอบค่า ActiveWorkMinutes ที่ส่งไป API
4. ตรวจสอบการคำนวณ OEE แต่ละ component

### Debug Console Logs:
```
currentFormMinutes (ก่อนหัก): 600
totalWorkingMinutesFromSessions (หักแล้ว): 240  
totalBreakMinutes: 75
downtimeMinutes: 30
currentFormActualRunTime (หลังหัก): 495
actualRunTimeMinutes (รวมสุทธิ): 735
ActiveWorkMinutes ที่ส่งไป API: 735
```
