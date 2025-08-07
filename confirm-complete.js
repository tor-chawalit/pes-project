// confirm-complete.js - Enhanced with Backend Integration
// =====================================================
// สำหรับตาราง ProductionResults
//
// ฟิลด์หลัก:
// ---------
// PlanID                    -> ID ของแผนงาน
// ActualStartTime           -> เวลาเริ่มต้นจริง
// ActualEndTime             -> เวลาสิ้นสุดจริง
// BreakMorningMinutes       -> เวลาพักเช้า (นาที)
// BreakLunchMinutes         -> เวลาพักเที่ยง (นาที)
// BreakEveningMinutes       -> เวลาพักเย็น (นาที)
// StandardRunRate           -> อัตราการผลิตมาตรฐาน
// GoodQuantity              -> จำนวนผลิตดี
// DowntimeMinutes           -> เวลาหยุดเครื่อง (นาที)
// DowntimeReason            -> สาเหตุการหยุดเครื่อง
// PlannedWorkMinutes        -> เวลาทำงานตามแผน (นาที)
// ActiveWorkMinutes         -> เวลาทำงานจริง (นาที)
// OEE_Overall               -> OEE รวม
// ActualRunRate             -> อัตราการผลิตจริง
// WorkingHours              -> ชั่วโมงทำงาน
// TotalBreakMinutes         -> เวลาพักรวม (นาที)
//
// ฟิลด์ที่ backend จัดการ:
// ----------------------
// ResultID, ProductCode, ProductName, ProductSize
// Department, MachineName, ShiftName, ProductionDate
// ConfirmedByUserName, ConfirmedAt

// ================================================================
// TIME DROPDOWN MANAGEMENT FOR CONFIRM-COMPLETE
// ================================================================

/**
 * สร้าง options สำหรับ dropdown เวลา (ชั่วโมง 00-23 และนาที 00-59)
 * สำหรับหน้า confirm-complete
 */
function populateConfirmTimeDropdowns() {
    console.log('🔄 populateConfirmTimeDropdowns() called');
    const timeSelects = ['actualStartHour', 'actualEndHour', 'actualStartMinute', 'actualEndMinute'];
    
    timeSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`❌ Element with ID '${selectId}' not found`);
            return;
        }
        
        console.log(`🔍 Processing dropdown: ${selectId}`);
        
        // ล้าง options เดิม แต่เก็บ default option
        const defaultOption = select.querySelector('option[value=""]');
        const defaultText = defaultOption ? defaultOption.textContent : 'เลือก';
        select.innerHTML = '';
        
        // เพิ่ม default option กลับ
        const newDefaultOption = document.createElement('option');
        newDefaultOption.value = '';
        newDefaultOption.textContent = defaultText;
        newDefaultOption.disabled = true;
        newDefaultOption.selected = true;
        select.appendChild(newDefaultOption);
        
        if (selectId.includes('Hour')) {
            // สร้าง options 00-23 สำหรับชั่วโมง (24-hour format)
            for (let i = 0; i <= 23; i++) {
                const option = document.createElement('option');
                const hourValue = String(i).padStart(2, '0');
                option.value = hourValue;
                option.textContent = hourValue;
                select.appendChild(option);
            }
            console.log(`✅ Created ${selectId} with 24 hours (00-23)`);
        } else if (selectId.includes('Minute')) {
            // สร้าง options 00-59 สำหรับนาที
            for (let i = 0; i <= 59; i++) {
                const option = document.createElement('option');
                const minuteValue = String(i).padStart(2, '0');
                option.value = minuteValue;
                option.textContent = minuteValue;
                select.appendChild(option);
            }
            console.log(`✅ Created ${selectId} with 60 minutes (00-59)`);
        }
        
        // ตรวจสอบจำนวน options ที่สร้างได้
        const totalOptions = select.querySelectorAll('option').length;
        console.log(`🔍 ${selectId} now has ${totalOptions} options total`);
    });
    
    console.log('✅ Confirm Complete time dropdowns populated successfully (24-hour format)');
}

/**
 * ดึงค่าเวลาจาก dropdown hour และ minute
 * @param {string} hourSelectId - ID ของ select element สำหรับชั่วโมง
 * @param {string} minuteSelectId - ID ของ select element สำหรับนาที
 * @returns {string|null} เวลาในรูปแบบ HH:MM หรือ null ถ้าไม่ได้เลือก
 */
function getConfirmTimeValue(hourSelectId, minuteSelectId) {
    const hourElement = document.getElementById(hourSelectId);
    const minuteElement = document.getElementById(minuteSelectId);
    
    if (!hourElement || !minuteElement) {
        console.error(`❌ Time elements not found: ${hourSelectId}, ${minuteSelectId}`);
        return null;
    }
    
    const hour = hourElement.value;
    const minute = minuteElement.value;
    
    console.log(`🔍 getConfirmTimeValue(${hourSelectId}, ${minuteSelectId}): hour="${hour}", minute="${minute}"`);
    
    // ตรวจสอบว่ามีค่าและไม่เป็นค่าว่าง
    if (!hour || !minute || hour === '' || minute === '' || hour === null || minute === null) {
        console.log(`⚠️ Time value not complete: hour="${hour}", minute="${minute}"`);
        return null;
    }
    
    // ตรวจสอบว่าเป็นตัวเลขหรือไม่
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    
    if (isNaN(hourNum) || isNaN(minuteNum)) {
        console.error(`❌ Non-numeric time values: hour="${hour}", minute="${minute}"`);
        return null;
    }
    
    // ตรวจสอบรูปแบบ 24 ชั่วโมง (00-23 สำหรับชั่วโมง, 00-59 สำหรับนาที)
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
        console.error(`❌ Invalid 24-hour time values: hour=${hourNum} (0-23), minute=${minuteNum} (0-59)`);
        return null;
    }
    
    // แปลงกลับเป็น string ด้วยรูปแบบ 2 หลัก
    const formattedHour = String(hourNum).padStart(2, '0');
    const formattedMinute = String(minuteNum).padStart(2, '0');
    const timeString = `${formattedHour}:${formattedMinute}`;
    
    console.log(`✅ Valid 24-hour time returned: ${timeString}`);
    return timeString;
}

/**
 * ตรวจสอบความถูกต้องของช่วงเวลา (เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น)
 * @param {string} startDate - วันที่เริ่มต้นในรูปแบบ DD/MM/YYYY
 * @param {string} startTime - เวลาเริ่มต้นในรูปแบบ HH:MM (24-hour format)
 * @param {string} endDate - วันที่สิ้นสุดในรูปแบบ DD/MM/YYYY
 * @param {string} endTime - เวลาสิ้นสุดในรูปแบบ HH:MM (24-hour format)
 * @returns {boolean} true ถ้าช่วงเวลาถูกต้อง
 */
function isValidTimeRange(startDate, startTime, endDate, endTime) {
    try {
        console.log(`🔍 isValidTimeRange() called with:`, {
            startDate, startTime, endDate, endTime
        });
        
        if (!startDate || !startTime || !endDate || !endTime) {
            console.log(`❌ Missing date/time values`);
            return false;
        }
        
        // แปลงวันที่และเวลาเริ่มต้น
        const [startDay, startMonth, startYear] = startDate.split('/');
        const [startHour, startMinute] = startTime.split(':');
        
        console.log(`🔍 Parsing start date/time:`, {
            startDay, startMonth, startYear, startHour, startMinute
        });
        
        const startDateTime = new Date(
            parseInt(startYear), 
            parseInt(startMonth) - 1, 
            parseInt(startDay), 
            parseInt(startHour), 
            parseInt(startMinute)
        );
        
        // แปลงวันที่และเวลาสิ้นสุด
        const [endDay, endMonth, endYear] = endDate.split('/');
        const [endHour, endMinute] = endTime.split(':');
        
        console.log(`🔍 Parsing end date/time:`, {
            endDay, endMonth, endYear, endHour, endMinute
        });
        
        const endDateTime = new Date(
            parseInt(endYear), 
            parseInt(endMonth) - 1, 
            parseInt(endDay), 
            parseInt(endHour), 
            parseInt(endMinute)
        );
        
        console.log(`🔍 Parsed DateTime objects:`, {
            startDateTime: startDateTime.toLocaleString('th-TH'),
            endDateTime: endDateTime.toLocaleString('th-TH')
        });
        
        // ตรวจสอบความถูกต้องของ Date objects
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.log(`❌ Invalid Date objects created`);
            return false;
        }
        
        // ตรวจสอบรูปแบบ 24 ชั่วโมง
        const startHourNum = parseInt(startHour);
        const startMinuteNum = parseInt(startMinute);
        const endHourNum = parseInt(endHour);
        const endMinuteNum = parseInt(endMinute);
        
        if (startHourNum < 0 || startHourNum > 23 || startMinuteNum < 0 || startMinuteNum > 59 ||
            endHourNum < 0 || endHourNum > 23 || endMinuteNum < 0 || endMinuteNum > 59) {
            console.log(`❌ Invalid 24-hour time format`);
            return false;
        }
        
        // เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น
        const isValid = endDateTime > startDateTime;
        
        console.log(`🔍 Time range validation result: ${isValid}`);
        if (!isValid) {
            console.log(`❌ End time (${endDateTime.toLocaleString('th-TH')}) must be after start time (${startDateTime.toLocaleString('th-TH')})`);
        } else {
            const diffMinutes = Math.floor((endDateTime - startDateTime) / (1000 * 60));
            console.log(`✅ Valid time range - Duration: ${diffMinutes} minutes`);
        }
        
        return isValid;
        
    } catch (error) {
        console.error('❌ Error in isValidTimeRange:', error);
        return false;
    }
}

/**
 * แปลงวันที่และเวลาให้เป็นรูปแบบ SQL DateTime
 * @param {string} dateStr - วันที่ในรูปแบบ DD/MM/YYYY
 * @param {string} timeStr - เวลาในรูปแบบ HH:MM
 * @returns {string} วันที่เวลาในรูปแบบ YYYY-MM-DD HH:MM:SS
 */
function formatDateTimeSQL(dateStr, timeStr) {
    try {
        if (!dateStr || !timeStr) {
            throw new Error('Date or time string is missing');
        }
        
        const [day, month, year] = dateStr.split('/');
        const [hour, minute] = timeStr.split(':');
        
        // สร้าง Date object
        const dateTime = new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hour), 
            parseInt(minute), 
            0 // seconds
        );
        
        if (isNaN(dateTime.getTime())) {
            throw new Error('Invalid date/time values');
        }
        
        // แปลงเป็นรูปแบบ SQL: YYYY-MM-DD HH:MM:SS
        const sqlYear = dateTime.getFullYear();
        const sqlMonth = String(dateTime.getMonth() + 1).padStart(2, '0');
        const sqlDay = String(dateTime.getDate()).padStart(2, '0');
        const sqlHour = String(dateTime.getHours()).padStart(2, '0');
        const sqlMinute = String(dateTime.getMinutes()).padStart(2, '0');
        const sqlSecond = String(dateTime.getSeconds()).padStart(2, '0');
        
        return `${sqlYear}-${sqlMonth}-${sqlDay} ${sqlHour}:${sqlMinute}:${sqlSecond}`;
        
    } catch (error) {
        console.error('Error in formatDateTimeSQL:', error);
        throw new Error('Invalid date/time format');
    }
}

/**
 * แปลงรูปแบบวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY
 * @param {string} dateStr - วันที่ในรูปแบบ YYYY-MM-DD (จาก input type="date")
 * @returns {string} วันที่ในรูปแบบ DD/MM/YYYY
 */
function convertDateFormat(dateStr) {
    if (!dateStr) return '';
    
    // ถ้าอยู่ในรูปแบบ YYYY-MM-DD แล้วแปลงเป็น DD/MM/YYYY
    if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // ถ้าอยู่ในรูปแบบ DD/MM/YYYY อยู่แล้ว ให้คืนค่าเดิม
    return dateStr;
}

/**
 * ตั้งค่าเวลาใน dropdown
 * @param {string} hourSelectId - ID ของ select element สำหรับชั่วโมง
 * @param {string} minuteSelectId - ID ของ select element สำหรับนาที
 * @param {string} timeString - เวลาในรูปแบบ HH:MM
 */
function setConfirmTimeValue(hourSelectId, minuteSelectId, timeString) {
    if (!timeString) return;
    
    const [hours, minutes] = timeString.split(':');
    
    const hourElement = document.getElementById(hourSelectId);
    const minuteElement = document.getElementById(minuteSelectId);
    
    if (hourElement && hours) {
        hourElement.value = hours.padStart(2, '0');
    }
    if (minuteElement && minutes) {
        minuteElement.value = minutes.padStart(2, '0');
    }
}

/**
 * คลาสหลักสำหรับจัดการหน้ายืนยันจบงาน
 * รับผิดชอบการโหลดข้อมูล คำนวณ OEE และส่งข้อมูลไปยัง backend
 */
class ConfirmCompleteManager {
    constructor() {
        this.taskData = null;      // ข้อมูลงานที่โหลดจากฐานข้อมูล
        this.taskId = null;        // ID ของงานที่ต้องการยืนยัน
        this.isLoading = false;    // สถานะการโหลดข้อมูล
    }

    /**
     * ฟังก์ชันเริ่มต้นของระบบ
     * - ดึง task ID จาก URL parameter
     * - โหลดข้อมูลงาน
     * - ตั้งค่า event listeners
     * - เริ่มการคำนวณเบื้องต้น
     */
    async init() {
        try {
                        // ดึง task ID จาก URL parameter (?id=123)
            const urlParams = new URLSearchParams(window.location.search);
            this.taskId = urlParams.get('id');
            
            console.log('URL parameters:', window.location.search);
            console.log('Extracted taskId:', this.taskId, 'Type:', typeof this.taskId);
            
            // ตรวจสอบว่ามี ID หรือไม่
            if (!this.taskId) {
                this.showError('ไม่พบ ID ของงาน กรุณาตรวจสอบ URL หรือกลับไปที่หน้าหลัก');
                return;
            }

            console.log('Loading task data for ID:', this.taskId);
            
            // โหลดข้อมูลงาน ตั้งค่า listeners และเริ่มคำนวณ
            await this.loadTaskData();
            this.setupEventListeners();
            this.initializeCalculations();
            
        } catch (error) {
            console.error('Init error:', error);
            this.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        }
    }

    /**
     * ฟังก์ชันโหลดข้อมูลงานจาก backend
     * - ส่ง request ไปยัง tasks.php?action=get_plan_detail
     * - ตรวจสอบ response และ error handling
     * - เก็บข้อมูลไว้ใน this.taskData
     * - เรียกฟังก์ชันแสดงผลข้อมูล
     */
    async loadTaskData() {
        try {
            // แสดง loading spinner
            this.showLoading(true);
            
            // ส่ง request ไปยัง backend เพื่อดึงข้อมูลแผนงาน
            const response = await fetch(`tasks.php?action=get_plan_detail&id=${this.taskId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // แปลง response เป็น JSON และตรวจสอบผลลัพธ์
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลแผนงานได้');
            }

            // เก็บข้อมูลแผนงานและแสดงใน console สำหรับ debug
            this.taskData = result.data;
            console.log('Plan data loaded:', this.taskData);
            
            // ตรวจสอบสถานะงาน (ปิดไว้ชั่วคราวเพื่อทดสอบ)
            // if (this.taskData.Status !== 'completed') {
            //     throw new Error('งานนี้ยังไม่ได้ทำเสร็จ ไม่สามารถยืนยันได้');
            // }

            // แสดงข้อมูลในฟอร์มและแสดงฟอร์ม
            this.populateTaskData();
            this.showForm();
            
        } catch (error) {
            console.error('Load task data error:', error);
            this.showError('ไม่สามารถโหลดข้อมูลงานได้: ' + error.message);
        } finally {
            // ซ่อน loading spinner เสมอ
            this.showLoading(false);
        }
    }

    /**
     * ฟังก์ชันแสดงข้อมูลแผนงานในฟอร์ม
     * - นำข้อมูลจาก this.taskData มาแสดงในฟิลด์ต่างๆ
     * - ตั้งค่าเวลาเริ่มต้นและสิ้นสุดจากข้อมูลแผนงาน
     * - ตั้งค่าจำนวนผลิตเป้าหมายจาก TargetOutput
     * - ตั้งค่า StandardRunRate (ถ้ามี)
     */
    populateTaskData() {
        if (!this.taskData) return;

        // แสดงข้อมูลงานใน header
        const taskInfoDisplay = document.getElementById('taskInfoDisplay');
        if (taskInfoDisplay) {
            const taskInfo = `งาน: ${this.taskData.ProductDisplayName || this.taskData.ProductName || 'ไม่ระบุ'} | ` +
                           `แผนก: ${this.taskData.DepartmentName || 'ไม่ระบุ'} | ` +
                           `เครื่องจักร: ${this.taskData.MachineName || 'ไม่ระบุ'}`;
            taskInfoDisplay.textContent = taskInfo;
        }

        // ตั้งค่าจำนวนผลิตรวมจาก TargetOutput
        if (this.taskData.TargetOutput) {
            const totalPiecesEl = document.getElementById('totalPieces');
            if (totalPiecesEl) {
                totalPiecesEl.value = this.taskData.TargetOutput;
            }
        }

        // ตั้งค่า standard run rate จากข้อมูล (ถ้ามี)
        if (this.taskData.StandardRunRate) {
            const idealRunRateEl = document.getElementById('idealRunRate');
            if (idealRunRateEl) {
                idealRunRateEl.value = this.taskData.StandardRunRate;
            }
        }

        // ตั้งค่า downtime และ downtime reason ถ้ามี
        if (this.taskData.DowntimeMinutes) {
            const downtimeEl = document.getElementById('downtime');
            if (downtimeEl) {
                downtimeEl.value = this.taskData.DowntimeMinutes;
            }
        }
        if (this.taskData.DowntimeReason) {
            const downtimeDetailEl = document.getElementById('downtimeDetail');
            if (downtimeDetailEl) {
                downtimeDetailEl.value = this.taskData.DowntimeReason;
            }
        }

        // คำนวณเวลาผลิตตามแผนใหม่
        // หมายเหตุ: การเติมเวลาปัจจุบันจะทำใน setupEventListeners()
        this.updatePlannedProductionTime();
    }

    /**
     * ฟังก์ชันเติมเวลาปัจจุบันอัตโนมัติ (ไม่เติมวันที่)
     * - เติมเฉพาะเวลาปัจจุบันใน dropdown เวลาเริ่มต้นเท่านั้น
     * - ไม่เติมวันที่ ให้ผู้ใช้เลือกเองเพื่อรองรับการบันทึกย้อนหลัง
     * - ไม่เติมวันที่และเวลาสิ้นสุด ให้ผู้ใช้เลือกเอง
     */
    fillCurrentStartDateTime() {
        console.log('🕐 fillCurrentStartDateTime() called - เติมแค่เวลาเริ่มต้น (ไม่เติมวันที่)');
        const now = new Date();
        
        // เติมเฉพาะเวลาปัจจุบันใน dropdown (รูปแบบ 24 ชั่วโมง)
        const currentHour = String(now.getHours()).padStart(2, '0');  // 00-23
        const currentMinute = String(now.getMinutes()).padStart(2, '0'); // 00-59
        
        console.log(`🕐 Current time: ${currentHour}:${currentMinute} (24-hour format)`);
        
        // ได้รับ elements สำหรับเวลาเริ่มต้นเท่านั้น
        const startHourEl = document.getElementById('actualStartHour');
        const startMinuteEl = document.getElementById('actualStartMinute');
        
        console.log('🔍 Start time elements found:', {
            startHourEl: !!startHourEl,
            startMinuteEl: !!startMinuteEl
        });
        
        // เติมเฉพาะเวลาเริ่มต้น (ไม่เติมวันที่)
        if (startHourEl && startMinuteEl) {
            // ตรวจสอบว่า dropdown มี options หรือยัง
            const startHourOptions = startHourEl.querySelectorAll('option');
            const startMinuteOptions = startMinuteEl.querySelectorAll('option');
            
            console.log(`🔍 Start time dropdowns - Hour: ${startHourOptions.length} options, Minute: ${startMinuteOptions.length} options`);
            
            if (startHourOptions.length > 1 && startMinuteOptions.length > 1) {
                startHourEl.value = currentHour;
                startMinuteEl.value = currentMinute;
                
                console.log(`✅ เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
                
                // ตรวจสอบว่าค่าถูกตั้งได้จริง
                if (startHourEl.value !== currentHour || startMinuteEl.value !== currentMinute) {
                    console.warn(`⚠️ Start time not set correctly. Expected: ${currentHour}:${currentMinute}, Actual: ${startHourEl.value}:${startMinuteEl.value}`);
                }
            } else {
                console.warn(`⚠️ Start time dropdowns not ready yet`);
            }
        } else {
            console.error('❌ Start time elements not found!');
        }
        
        console.log(`🎯 Auto-fill completed (TIME ONLY):
        - Time: ${currentHour}:${currentMinute} (เติมในช่องเวลาเริ่มต้นเท่านั้น)
        - Date: ไม่เติม - ให้ผู้ใช้เลือกเองเพื่อรองรับการบันทึกย้อนหลัง`);
        
        // เรียกคำนวณเวลาทันทีหลังจากเติมค่า (ถ้าผู้ใช้ได้เลือกวันที่และเวลาสิ้นสุดแล้ว)
        setTimeout(() => {
            console.log('🔄 Triggering calculateTimes() after filling start time');
            this.calculateTimes();
        }, 100);
    }

    /**
     * ฟังก์ชันอัพเดทเวลาปัจจุบัน (สำหรับปุ่ม "ใช้เวลาปัจจุบัน")
     * - เติมวันที่และเวลาปัจจุบันในช่องเริ่มต้น
     * - รองรับการใช้วันที่ปัจจุบันเมื่อผู้ใช้ต้องการ
     */
    updateCurrentDateTime() {
        console.log('🕐 updateCurrentDateTime() called - เติมวันที่และเวลาปัจจุบัน');
        const now = new Date();
        
        // เติมวันที่ปัจจุบัน (รูปแบบ YYYY-MM-DD สำหรับ input type="date")
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const currentDateForInput = `${year}-${month}-${day}`;  // YYYY-MM-DD สำหรับ input
        
        // เติมเวลาปัจจุบันใน dropdown (รูปแบบ 24 ชั่วโมง)
        const currentHour = String(now.getHours()).padStart(2, '0');  // 00-23
        const currentMinute = String(now.getMinutes()).padStart(2, '0'); // 00-59
        
        // เติมวันที่เริ่มต้น
        const startDateEl = document.getElementById('actualStartDate');
        if (startDateEl) {
            startDateEl.value = currentDateForInput;
            console.log(`✅ เติมวันที่เริ่มต้น: ${currentDateForInput}`);
        }
        
        // เติมเวลาเริ่มต้น
        const startHourEl = document.getElementById('actualStartHour');
        const startMinuteEl = document.getElementById('actualStartMinute');
        if (startHourEl && startMinuteEl) {
            startHourEl.value = currentHour;
            startMinuteEl.value = currentMinute;
            console.log(`✅ เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
        }
        
        // คำนวณใหม่หลังจากเปลี่ยนเวลา
        this.calculateTimes();
    }

    /**
     * ฟังก์ชันคำนวณและแสดงเวลาผลิตตามแผน (Planned Production Time)
     * - ใช้เวลาจากแผนงานที่วางไว้ในหน้า index (PlannedStartTime และ PlannedEndTime)
     * - หักเวลาพักที่กำหนดมาตรฐาน (60 นาทีสำหรับพักกลางวัน)
     * - แสดงผลลัพธ์ในฟิลด์ plannedProductionTime
     */
    updatePlannedProductionTime() {
        if (!this.taskData || !this.taskData.PlannedStartTime || !this.taskData.PlannedEndTime) {
            const plannedProductionTimeEl = document.getElementById('plannedProductionTime');
            if (plannedProductionTimeEl) {
                plannedProductionTimeEl.value = 'ไม่มีข้อมูลแผนงาน';
            }
            return;
        }

        // ใช้เวลาจากแผนงานที่วางไว้ในหน้า index
        const plannedStartTime = new Date(this.taskData.PlannedStartTime);
        const plannedEndTime = new Date(this.taskData.PlannedEndTime);
        
        if (isNaN(plannedStartTime) || isNaN(plannedEndTime) || plannedEndTime <= plannedStartTime) {
            const plannedProductionTimeEl = document.getElementById('plannedProductionTime');
            if (plannedProductionTimeEl) {
                plannedProductionTimeEl.value = 'เวลาแผนงานไม่ถูกต้อง';
            }
            return;
        }
        
        // คำนวณระยะเวลารวมจากแผนงาน (นาที)
        const diffMs = plannedEndTime - plannedStartTime;
        const plannedTotalMinutes = Math.floor(diffMs / (1000 * 60));
        
        // === สูตรใหม่: ไม่หักเวลาพักที่นี่แล้ว ===
        // Planned Production Time = เวลารวมจากแผนงาน (ไม่หักเวลาพัก)
        const plannedProductionTime = plannedTotalMinutes;
        
        // แสดงผลลัพธ์ (ป้องกันค่าติดลบ)
        const plannedProductionTimeEl = document.getElementById('plannedProductionTime');
        if (plannedProductionTimeEl) {
            plannedProductionTimeEl.value = `${Math.max(0, plannedProductionTime)} นาที (จากแผนงาน - ไม่หักเวลาพัก)`;
        }
        
        console.log('Planned Production Time calculated from plan data (NEW FORMULA):', {
            plannedStartTime: this.taskData.PlannedStartTime,
            plannedEndTime: this.taskData.PlannedEndTime,
            plannedTotalMinutes,
            plannedProductionTime: plannedProductionTime, // ไม่หักเวลาพัก
            note: 'เวลาพักจะถูกหักที่ Actual Run Time แทน'
        });
    }

    /**
     * ฟังก์ชันตั้งค่า Event Listeners สำหรับฟอร์มและ input ต่างๆ
     * - Form submission
     * - การเปลี่ยนแปลงเวลา
     * - การเลือกเวลาพัก
     * - การเปิด/ปิดโอที
     * - การป้อนตัวเลขต่างๆ
     */
    setupEventListeners() {
        try {
            console.log('🔄 กำลังตั้งค่า Event Listeners...');
            
            // เติม dropdown เวลาก่อน
            populateConfirmTimeDropdowns();
            console.log('✅ Time dropdowns populated');
            
            // รอให้ dropdown พร้อม แล้วเติมเวลาปัจจุบัน (เพิ่มเวลารอมากขึ้น)
            setTimeout(() => {
                console.log('🕐 Attempting to fill current start date time...');
                this.fillCurrentStartDateTime();
            }, 300);  // เพิ่มเวลารอเป็น 300ms เพื่อให้แน่ใจว่า dropdown พร้อม
            
            // ตั้งค่า listener สำหรับการส่งฟอร์ม
            const form = document.getElementById('emergencyStopForm');
            if (form) {
                form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            } else {
                console.warn('Form element not found');
            }

            // ตั้งค่า listener สำหรับการเปลี่ยนแปลงเวลา (dropdown)
            const timeDropdowns = [
                'actualStartHour', 'actualStartMinute', 'actualEndHour', 'actualEndMinute'
            ];
            
            timeDropdowns.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => {
                        console.log(`⏰ Time dropdown changed: ${id} = ${element.value}`);
                        this.calculateTimes();
                    });
                    console.log(`✅ Event listener added for: ${id}`);
                } else {
                    console.warn(`❌ Time dropdown element '${id}' not found`);
                }
            });
            
            // ตั้งค่า listener สำหรับการเปลี่ยนแปลงวันที่
            const dateElements = ['actualStartDate', 'actualEndDate'];
            dateElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', () => {
                        console.log(`📅 Date changed: ${id} = ${element.value}`);
                        this.calculateTimes();
                    });
                    console.log(`✅ Event listener added for: ${id}`);
                } else {
                    console.warn(`❌ Element ${id} not found`);
                }
            });

        // ตั้งค่า listener สำหรับ checkbox เวลาพัก
        document.querySelectorAll('input[name="breakTime[]"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculateBreakTime());
        });

        // ตั้งค่า listener สำหรับ checkbox โอที (เปิด/ปิดฟิลด์ overtime)
        document.getElementById('overtimeEnable')?.addEventListener('change', (e) => {
            const overtimeInput = document.getElementById('overtime');
            if (overtimeInput) {
                overtimeInput.disabled = !e.target.checked;  // เปิด/ปิดฟิลด์ตามการเลือก
                if (!e.target.checked) {
                    overtimeInput.value = '';  // ลบค่าเมื่อปิด
                }
            }
            this.calculateTimes();  // คำนวณใหม่
        });

        // ตั้งค่า listener สำหรับฟิลด์ตัวเลขที่ส่งผลต่อการคำนวณ
        document.getElementById('overtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('downtime')?.addEventListener('input', () => this.calculateTimes());
        document.getElementById('idealRunRate')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('totalPieces')?.addEventListener('input', () => this.calculatePerformance());
        document.getElementById('rejectPieces')?.addEventListener('input', () => this.calculateQuality());

        // ตั้งค่า listener สำหรับ checkbox ความยาวกะ (10 ชั่วโมง)
        document.getElementById('shiftLength8h')?.addEventListener('change', () => this.calculateTimes());

        // ตั้งค่า listener สำหรับปุ่ม "ใช้เวลาปัจจุบัน" (ถ้ามี)
        const currentTimeBtn = document.getElementById('useCurrentTimeBtn');
        if (currentTimeBtn) {
            currentTimeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.updateCurrentDateTime();
                console.log('🕐 ผู้ใช้กดใช้เวลาปัจจุบัน');
            });
        }

        // แสดงปุ่มส่งฟอร์มทันที
        const confirmFooter = document.getElementById('confirmFooter');
        if (confirmFooter) {
            confirmFooter.style.display = 'block';
        }
        
        console.log('✅ Event listeners setup complete');
        
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            this.showToast('เกิดข้อผิดพลาดในการตั้งค่า กรุณาโหลดหน้าใหม่', 'danger');
        }
    }

    /**
     * ฟังก์ชันเริ่มต้นการคำนวณทั้งหมด
     * เรียกใช้หลังจากโหลดข้อมูลเสร็จเพื่อคำนวณค่าเริ่มต้น
     */
    initializeCalculations() {
        try {
            console.log('🔄 initializeCalculations() called');
            this.calculateBreakTime();     // คำนวณเวลาพัก
            this.calculateTimes();         // คำนวณเวลาต่างๆ
            this.calculatePerformance();   // คำนวณ Performance
            this.calculateQuality();       // คำนวณ Quality
            console.log('✅ initializeCalculations() completed');
        } catch (error) {
            console.error('❌ Error in initializeCalculations:', error);
        }
    }

    /**
     * ฟังก์ชันคำนวณเวลาพักรวม
     * - รวมเวลาพักจาก checkbox ที่เลือกไว้
     * - แสดงผลรวมเวลาพัก
     * - เรียกคำนวณเวลาอื่นๆ ใหม่
     */
    calculateBreakTime() {
        try {
            let totalBreakMinutes = 0;
            
            // กำหนดเวลาพักแต่ละช่วง (นาที)
            const breakTimes = {
                'morning': 15,   // พักเช้า 15 นาที
                'lunch': 60,     // พักกลางวัน 60 นาที  
                'evening': 15    // พักเย็น 15 นาที
            };

            // นับเวลาพักจาก checkbox ที่ถูกเลือก
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                totalBreakMinutes += breakTimes[checkbox.value] || 0;
            });

            // แสดงผลรวมเวลาพัก
            const breakTotalMinutesEl = document.getElementById('breakTotalMinutes');
            if (breakTotalMinutesEl) {
                breakTotalMinutesEl.textContent = totalBreakMinutes;
            }
            
            // แสดง/ซ่อน alert ของเวลาพักรวม
            const breakTotalDisplayEl = document.getElementById('breakTotalDisplay');
            if (breakTotalDisplayEl) {
                breakTotalDisplayEl.style.display = totalBreakMinutes > 0 ? 'block' : 'none';
            }

            // คำนวณเวลาอื่นๆ ใหม่
            this.calculateTimes();
        } catch (error) {
            console.error('Error in calculateBreakTime:', error);
        }
    }

    /**
     * ฟังก์ชันคำนวณเวลาต่างๆ ที่ใช้ในการคำนวณ OEE
     * - เวลาทำงานรวม (Total Minutes)
     * - เวลาพัก (Break Minutes) 
     * - เวลาโอที (Overtime Minutes)
     * - เวลา downtime
     * - เวลาผลิตตามแผน (Planned Production Time)
     * - เวลาเดินเครื่องจริง (Operating Time/Run Time)
     */
    calculateTimes() {
        console.log('🔄 calculateTimes() called');
        
        // อ่านค่าเวลาจาก dropdown แทน input type="time"
        const startDateInput = document.getElementById('actualStartDate');
        const endDateInput = document.getElementById('actualEndDate');
        
        console.log('📅 Date inputs:', {
            startDateInput: startDateInput ? startDateInput.value : 'not found',
            endDateInput: endDateInput ? endDateInput.value : 'not found'
        });
        
        // ดึงเวลาจาก dropdown
        const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
        const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
        
        console.log('⏰ Time values:', {
            actualStartTime,
            actualEndTime
        });
        
        // ตรวจสอบว่ามี elements และมีข้อมูลเวลาหรือไม่
        if (!startDateInput || !endDateInput || !actualStartTime || !actualEndTime ||
            !startDateInput.value || !endDateInput.value) {
            console.log('⚠️ Missing date/time data, clearing fields');
            const operatingTimeEl = document.getElementById('operatingTime');
            const netRunTimeEl = document.getElementById('netRunTime');
            
            if (operatingTimeEl) operatingTimeEl.value = '';
            if (netRunTimeEl) netRunTimeEl.value = '';
            return;
        }

        console.log('✅ All date/time data available, proceeding with calculation');

        // แปลงรูปแบบวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY สำหรับใช้ใน isValidTimeRange()
        const startDateFormatted = convertDateFormat(startDateInput.value);
        const endDateFormatted = convertDateFormat(endDateInput.value);
        
        console.log('📅 Converted date formats:', {
            startDateOriginal: startDateInput.value,
            startDateFormatted,
            endDateOriginal: endDateInput.value,
            endDateFormatted
        });

        // ตรวจสอบความถูกต้องของช่วงเวลา
        if (!isValidTimeRange(startDateFormatted, actualStartTime, endDateFormatted, actualEndTime)) {
            console.log('❌ Invalid time range detected');
            const operatingTimeEl = document.getElementById('operatingTime');
            if (operatingTimeEl) {
                operatingTimeEl.value = 'เวลาไม่ถูกต้อง';
            }
            return;
        }

        console.log('✅ Time range validation passed');

        // สร้าง DateTime object สำหรับการคำนวณ (ใช้ข้อมูลจาก input type="date" โดยตรง)
        const [startYear, startMonth, startDay] = startDateInput.value.split('-');  // YYYY-MM-DD
        const [startHour, startMinute] = actualStartTime.split(':');
        const startTime = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), parseInt(startHour), parseInt(startMinute));
        
        const [endYear, endMonth, endDay] = endDateInput.value.split('-');  // YYYY-MM-DD
        const [endHour, endMinute] = actualEndTime.split(':');
        const endTime = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay), parseInt(endHour), parseInt(endMinute));

        console.log('📅 DateTime objects created:', {
            startTime: startTime.toLocaleString('th-TH'),
            endTime: endTime.toLocaleString('th-TH'),
            isValidStart: !isNaN(startTime.getTime()),
            isValidEnd: !isNaN(endTime.getTime())
        });

        // ตรวจสอบความถูกต้องของ DateTime objects
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            console.error('❌ Invalid DateTime objects created in calculateTimes()');
            const operatingTimeEl = document.getElementById('operatingTime');
            if (operatingTimeEl) {
                operatingTimeEl.value = 'วันที่เวลาไม่ถูกต้อง';
            }
            return;
        }

        // คำนวณเวลาทำงานรวม (นาที)
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
        
        // คำนวณเวลาพักรวม
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });

        // คำนวณเวลาโอที
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        // คำนวณเวลา downtime
        const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

        // === คำนวณตามสูตรใหม่ ===
        // Actual Run Time = เวลาทำงานจริง - เวลาพักจริง - Downtime
        const actualRunTime = totalMinutes - breakMinutes - downtimeMinutes;
        
        console.log(`📊 calculateTimes() - การคำนวณเวลา:
        - เวลาทำงานจริง: ${totalMinutes} นาที
        - เวลาพักจริง: ${breakMinutes} นาที  
        - Downtime: ${downtimeMinutes} นาที
        - Actual Run Time: ${actualRunTime} นาที`);
        
        // แสดงผลลัพธ์ในฟิลด์ต่างๆ (ใช้ Actual Run Time)
        const operatingTimeEl = document.getElementById('operatingTime');
        const netRunTimeEl = document.getElementById('netRunTime');
        
        console.log('🔍 Debug elements found:', {
            operatingTimeEl: !!operatingTimeEl,
            netRunTimeEl: !!netRunTimeEl,
            actualRunTime: actualRunTime,
            operatingTimeElHTML: operatingTimeEl ? operatingTimeEl.outerHTML.substring(0, 100) : 'NOT FOUND',
            netRunTimeElHTML: netRunTimeEl ? netRunTimeEl.outerHTML.substring(0, 100) : 'NOT FOUND'
        });
        
        if (operatingTimeEl) {
            const newValue = `${Math.max(0, actualRunTime)} นาที`;
            operatingTimeEl.value = newValue;
            console.log('✅ operatingTime updated to:', newValue);
            console.log('🔍 operatingTime after update:', operatingTimeEl.value);
        } else {
            console.error('❌ operatingTime element not found in DOM!');
            console.log('🔍 All input elements with id containing "operating":', 
                Array.from(document.querySelectorAll('input[id*="operating"]')).map(el => el.id));
        }
        
        if (netRunTimeEl) {
            const newValue = `${Math.max(0, actualRunTime)} นาที`;
            netRunTimeEl.value = newValue;
            console.log('✅ netRunTime updated to:', newValue);
            console.log('🔍 netRunTime after update:', netRunTimeEl.value);
        } else {
            console.error('❌ netRunTime element not found in DOM!');
            console.log('🔍 All input elements with id containing "run":', 
                Array.from(document.querySelectorAll('input[id*="run"]')).map(el => el.id));
        }

        // แสดงเวลากะที่มี (สำหรับข้อมูล) - กะ 10 ชั่วโมง
        const shiftMinutes = document.getElementById('shiftLength8h')?.checked ? 600 : 0;  // 10 ชั่วโมง
        const availableTime = shiftMinutes + overtimeMinutes;
        
        const shiftDisplay = document.getElementById('shiftAvailableTimeDisplay');
        const shiftText = document.getElementById('shiftAvailableTimeText');
        if (shiftDisplay && shiftText) {
            shiftText.textContent = `${availableTime} นาที`;
            shiftDisplay.style.display = 'block';
        }

        // แสดงระยะเวลาทำงานจริง
        const actualDurationTextEl = document.getElementById('actualDurationText');
        const actualDurationDisplayEl = document.getElementById('actualDurationDisplay');
        
        if (actualDurationTextEl) {
            actualDurationTextEl.textContent = `${totalMinutes} นาที`;
        }
        if (actualDurationDisplayEl) {
            actualDurationDisplayEl.style.display = 'block';
        }

        // คำนวณ OEE ใหม่
        this.calculateOEE();
    }

    calculatePerformance() {
        try {
            console.log('🔄 calculatePerformance() called');
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const netRunTimeEl = document.getElementById('netRunTime');
            const netRunTimeText = netRunTimeEl?.value || '';
            
            console.log('🔍 Performance calculation inputs:', {
                idealRate,
                totalPieces,
                netRunTimeEl: !!netRunTimeEl,
                netRunTimeText
            });
            
            const netRunTimeMatch = netRunTimeText.match(/(\d+)/);
            const netRunTimeMinutes = netRunTimeMatch ? parseInt(netRunTimeMatch[1]) : 0;

            console.log('🔍 Performance calculation values:', {
                netRunTimeMinutes,
                canCalculate: netRunTimeMinutes > 0 && totalPieces > 0
            });

            if (netRunTimeMinutes > 0 && totalPieces > 0) {
                const actualRate = totalPieces / netRunTimeMinutes;
                const actualRunRateEl = document.getElementById('actualRunRate');
                
                console.log('🔍 actualRunRate element found:', !!actualRunRateEl);
                console.log('🔍 Calculated actualRate:', actualRate);
                
                if (actualRunRateEl) {
                    const newValue = `${actualRate.toFixed(2)} ชิ้น/นาที`;
                    actualRunRateEl.value = newValue;
                    console.log('✅ actualRunRate updated to:', newValue);
                    console.log('🔍 actualRunRate after update:', actualRunRateEl.value);
                } else {
                    console.error('❌ actualRunRate element not found in DOM!');
                    console.log('🔍 All input elements with id containing "rate":', 
                        Array.from(document.querySelectorAll('input[id*="rate"]')).map(el => el.id));
                }
            } else {
                const actualRunRateEl = document.getElementById('actualRunRate');
                if (actualRunRateEl) {
                    actualRunRateEl.value = '';
                    console.log('⚠️ actualRunRate cleared (insufficient data)');
                } else {
                    console.error('❌ actualRunRate element not found in DOM!');
                }
            }

            this.calculateQuality();
        } catch (error) {
            console.error('Error in calculatePerformance:', error);
        }
    }

    calculateQuality() {
        try {
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
            
            const goodPieces = Math.max(0, totalPieces - rejectPieces);
            const goodPiecesEl = document.getElementById('goodPieces');
            if (goodPiecesEl) {
                goodPiecesEl.value = goodPieces;
            }

            this.calculateOEE();
        } catch (error) {
            console.error('Error in calculateQuality:', error);
        }
    }

    /**
     * ฟังก์ชันคำนวณค่า OEE (Overall Equipment Effectiveness) - แก้ไขใหม่
     * 
     * สูตรการคำนวณ OEE ใหม่:
     * OEE = Availability × Performance × Quality (หารด้วย 10,000 เพื่อให้เป็นเปอร์เซ็นต์)
     * 
     * โดยที่:
     * - Availability = (Actual Run Time / Planned Production Time) × 100
     * - Performance = (Total Count / (Actual Run Time × Ideal Run Rate)) × 100  
     * - Quality = (Good Pieces / Total Pieces) × 100
     * 
     * คำอธิบายเพิ่มเติม:
     * - Planned Production Time = เวลาจากแผนงาน (ไม่หักเวลาพัก)
     * - Actual Run Time = เวลาทำงานจริง - เวลาพักจริง - Downtime
     * - Good Pieces = Total Pieces - Reject Pieces
     */
    calculateOEE() {
        try {
            // อ่านค่าจากฟิลด์ต่างๆ ใช้ dropdown แทน input type="time"
            const startDateInput = document.getElementById('actualStartDate')?.value;
            const endDateInput = document.getElementById('actualEndDate')?.value;
            
            // ดึงเวลาจาก dropdown
            const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
            const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
            
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
            const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');

            // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ
            if (!startDateInput || !endDateInput || !actualStartTime || !actualEndTime || idealRate <= 0 || totalPieces <= 0) {
                this.resetOEEDisplay();
                return;
            }

            // แปลงรูปแบบวันที่สำหรับใช้ใน isValidTimeRange()
            const startDateFormatted = convertDateFormat(startDateInput);
            const endDateFormatted = convertDateFormat(endDateInput);

            // ตรวจสอบความถูกต้องของช่วงเวลา
            if (!isValidTimeRange(startDateFormatted, actualStartTime, endDateFormatted, actualEndTime)) {
                this.resetOEEDisplay();
                return;
            }

            // สร้าง DateTime object สำหรับการคำนวณ (ใช้ข้อมูลจาก input type="date" โดยตรง)
            const [startYear, startMonth, startDay] = startDateInput.split('-');  // YYYY-MM-DD
            const [startHour, startMinute] = actualStartTime.split(':');
            const startTime = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), parseInt(startHour), parseInt(startMinute));
            
            const [endYear, endMonth, endDay] = endDateInput.split('-');  // YYYY-MM-DD
            const [endHour, endMinute] = actualEndTime.split(':');
            const endTime = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay), parseInt(endHour), parseInt(endMinute));
            
            // ตรวจสอบความถูกต้องของ DateTime objects
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                console.error('❌ Invalid DateTime objects in calculateOEE()');
                this.resetOEEDisplay();
                return;
            }
            
            const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));

            // คำนวณเวลาพักรวม
            let breakMinutes = 0;
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
                breakMinutes += breakTimes[checkbox.value] || 0;
            });

            // คำนวณเวลาโอที
            let overtimeMinutes = 0;
            if (document.getElementById('overtimeEnable')?.checked) {
                overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
            }

            // === คำนวณ Planned Production Time จากแผนงาน (ไม่หักเวลาพัก) ===
            let plannedProductionTime = 0;
            if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
                const plannedStartTime = new Date(this.taskData.PlannedStartTime);
                const plannedEndTime = new Date(this.taskData.PlannedEndTime);
                const plannedTotalMinutes = Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
                // ✅ ไม่หักเวลาพักที่นี่แล้ว - ใช้เวลารวมจากแผนงาน
                plannedProductionTime = plannedTotalMinutes;
                console.log(`📊 Planned Production Time จากแผนงาน (ไม่หักเวลาพัก): ${plannedProductionTime} นาที`);
            } else {
                // ถ้าไม่มีข้อมูลแผนงาน ใช้วิธีเดิม
                plannedProductionTime = totalMinutes;
                console.log(`⚠️ ใช้เวลาจริงเป็น Planned Production Time: ${plannedProductionTime} นาที`);
            }
            
            // === คำนวณ Actual Run Time (หักเวลาพักที่นี่) ===
            // Actual Run Time = เวลาทำงานจริง - เวลาพักจริง - Downtime
            const actualRunTime = totalMinutes - breakMinutes - downtimeMinutes;
            
            console.log(`📊 การคำนวณเวลาใหม่:
            - เวลาทำงานจริง: ${totalMinutes} นาที
            - เวลาพักจริง: ${breakMinutes} นาที  
            - Downtime: ${downtimeMinutes} นาที
            - Actual Run Time: ${actualRunTime} นาที
            - Planned Production Time: ${plannedProductionTime} นาที (ไม่หักเวลาพัก)`);

            // คำนวณองค์ประกอบของ OEE ด้วยสูตรใหม่
            // ✅ Availability = (Actual Run Time / Planned Production Time) × 100
            const availability = plannedProductionTime > 0 ? (actualRunTime / plannedProductionTime) * 100 : 0;
            
            // ✅ Performance = (Total Count / (Actual Run Time × Ideal Run Rate)) × 100
            const theoreticalMaxCount = actualRunTime * idealRate; // จำนวนที่ควรผลิตได้ตามเวลาและอัตราผลิตมาตรฐาน
            const performance = theoreticalMaxCount > 0 ? (totalPieces / theoreticalMaxCount) * 100 : 0;
            
            // Quality = Good Pieces / Total Pieces × 100
            const goodPieces = totalPieces - rejectPieces;
            const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;

            // คำนวณ OEE รวม = (Availability × Performance × Quality) / 10,000
            const oeeTotal = (availability * performance * quality) / 10000;

            console.log(`📊 ผลการคำนวณ OEE ใหม่:
            - Availability: ${availability.toFixed(2)}% (${actualRunTime}/${plannedProductionTime})
            - Performance: ${performance.toFixed(2)}% (${totalPieces}/${theoreticalMaxCount.toFixed(1)})
            - Quality: ${quality.toFixed(2)}% (${goodPieces}/${totalPieces})
            - OEE Total: ${oeeTotal.toFixed(2)}%`);

            // อัปเดตการแสดงผล
            this.updateOEEDisplay(availability, performance, quality, oeeTotal);

            // อัปเดตฟิลด์เพิ่มเติม
            const actualRunRateEl = document.getElementById('actualRunRate');
            if (actualRunRateEl && actualRunTime > 0) {
                const actualRunRate = totalPieces / actualRunTime;
                actualRunRateEl.value = `${actualRunRate.toFixed(2)} ชิ้น/นาที`;
            }

            const operatingTimeEl = document.getElementById('operatingTime');
            if (operatingTimeEl) {
                const newValue = `${Math.max(0, actualRunTime)} นาที`;
                operatingTimeEl.value = newValue;
                console.log('🔄 calculateOEE() - operatingTime updated to:', newValue);
            } else {
                console.error('❌ calculateOEE() - operatingTime element not found!');
            }

            const netRunTimeEl = document.getElementById('netRunTime');
            if (netRunTimeEl) {
                const newValue = `${Math.max(0, actualRunTime)} นาที`;
                netRunTimeEl.value = newValue;
                console.log('🔄 calculateOEE() - netRunTime updated to:', newValue);
            } else {
                console.error('❌ calculateOEE() - netRunTime element not found!');
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการคำนวณ OEE:', error);
            this.resetOEEDisplay();
        }
    }

    /**
     * ฟังก์ชันอัปเดตการแสดงผลค่า OEE
     * 
     * @param {number} availability - ค่า Availability (%)
     * @param {number} performance - ค่า Performance (%)
     * @param {number} quality - ค่า Quality (%)
     * @param {number} oeeTotal - ค่า OEE รวม (%)
     */
    updateOEEDisplay(availability, performance, quality, oeeTotal) {
        // ฟังก์ชันจัดรูปแบบเปอร์เซ็นต์ (จำกัดค่าระหว่าง 0-100%)
        const formatPercent = (value) => `${Math.round(Math.max(0, Math.min(100, value)))}%`;
        
        // อัปเดตข้อความแสดงผล
        document.getElementById('oeeAvailability').textContent = formatPercent(availability);
        document.getElementById('oeePerformance').textContent = formatPercent(performance);
        document.getElementById('oeeQuality').textContent = formatPercent(quality);
        document.getElementById('oeeTotal').textContent = formatPercent(oeeTotal);

        // อัปเดตสีของ badge ตามค่าที่ได้
        this.updateBadgeColor('oeeAvailability', availability);
        this.updateBadgeColor('oeePerformance', performance);
        this.updateBadgeColor('oeeQuality', quality);
        this.updateBadgeColor('oeeTotal', oeeTotal);
    }

    /**
     * ฟังก์ชันอัปเดตสีของ badge ตามค่าเปอร์เซ็นต์
     * 
     * @param {string} elementId - ID ของ element ที่ต้องการเปลี่ยนสี
     * @param {number} value - ค่าเปอร์เซ็นต์ที่ใช้ในการกำหนดสี
     * 
     * เกณฑ์การให้สีตามมาตรฐาน OEE:
     * - เขียว (success): >= 85% = ระดับดีเยี่ยม (World Class)
     * - น้ำเงิน (info): 75-84% = ระดับดี (Good)  
     * - เหลือง (warning): 60-74% = ระดับปานกลาง (Average)
     * - แดง (danger): < 60% = ต้องปรับปรุงวิเคราะห์หาสาเหตุ (Needs Improvement)
     */
    updateBadgeColor(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // ลบคลาสสีเก่าออก
        element.className = element.className.replace(/bg-\w+/g, '');
        
        // เพิ่มคลาสสีใหม่ตามค่าที่ได้
        if (value >= 85) {
            element.classList.add('bg-success');      // เขียว - ระดับดีเยี่ยม (World Class OEE)
        } else if (value >= 75) {
            element.classList.add('bg-info');         // น้ำเงิน - ระดับดี (Good OEE)
        } else if (value >= 60) {
            element.classList.add('bg-warning');      // เหลือง - ระดับปานกลาง (Average OEE)
        } else {
            element.classList.add('bg-danger');       // แดง - ต้องปรับปรุงวิเคราะห์หาสาเหตุ
        }
    }

    /**
     * ฟังก์ชันรีเซ็ตการแสดงผล OEE เป็นค่าเริ่มต้น
     * - แสดงเครื่องหมาย "-" แทนค่า
     * - เปลี่ยนสีเป็นสีเทา (secondary)
     */
    resetOEEDisplay() {
        ['oeeAvailability', 'oeePerformance', 'oeeQuality', 'oeeTotal'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '-';
                element.className = element.className.replace(/bg-\w+/g, '') + ' bg-secondary';
            }
        });
    }

    /**
     * ฟังก์ชันจัดการการส่งฟอร์ม
     * - ตรวจสอบความถูกต้องของข้อมูล
     * - รวบรวมข้อมูลจากฟอร์ม
     * - ส่งข้อมูลไปยัง API
     * - แสดงผลลัพธ์การส่งข้อมูล
     * 
     * @param {Event} event - event object จากการส่งฟอร์ม
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        
        console.log('=== FORM SUBMIT DEBUG ===');
        console.log('Form submit started...');
        console.log('Current taskId:', this.taskId);
        console.log('Task data:', this.taskData);
        console.log('IsLoading:', this.isLoading);
        
        // ป้องกันการส่งซ้ำขณะกำลังประมวลผล
        if (this.isLoading) {
            console.log('Already loading, skipping...');
            return;
        }

        try {
            // ตรวจสอบความถูกต้องของฟอร์ม
            console.log('Validating form...');
            if (!this.validateForm()) {
                console.log('Form validation failed');
                return;
            }

            console.log('Form validation passed');
            this.isLoading = true;
            this.showLoading(true);

            // รวบรวมข้อมูลจากฟอร์ม
            console.log('Collecting form data...');
            const formData = this.collectFormData();
            console.log('กำลังส่งข้อมูล OEE:', formData);
            
            // ตรวจสอบ PlanID ก่อนส่ง
            if (!formData.PlanID || formData.PlanID <= 0) {
                throw new Error(`PlanID ไม่ถูกต้อง: ${formData.PlanID}, taskId: ${this.taskId}`);
            }
            
            console.log('PlanID validated:', formData.PlanID);

            // ส่งข้อมูลไปยัง backend API (ใช้ endpoint ใหม่สำหรับโครงสร้างฐานข้อมูลใหม่)
            console.log('=== DEBUG: Form Data ===');
            console.log('PlanID:', formData.PlanID, 'Type:', typeof formData.PlanID);
            console.log('Full Form Data:', JSON.stringify(formData, null, 2));
            console.log('========================');
            
            const response = await fetch('tasks.php?action=save_production_result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            // อ่าน response เป็น text ก่อน
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            // ตรวจสอบสถานะการตอบกลับ
            if (!response.ok) {
                console.error('HTTP Error:', response.status, response.statusText);
                console.error('Response body:', responseText);
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 200)}`);
            }

            // Parse JSON response
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response: ' + responseText.substring(0, 100));
            }
            
            console.log('Parsed response:', result);
            
            if (!result.success) {
                throw new Error(result.error || 'การบันทึกข้อมูลล้มเหลว');
            }

            // แสดงข้อความสำเร็จ
            this.showToast('บันทึกข้อมูลสำเร็จ!', 'success');
            
            // เปลี่ยนหน้าหลังจากหน่วงเวลาเล็กน้อย
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการส่งฟอร์ม:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                taskId: this.taskId,
                formElements: {
                    startDate: document.getElementById('actualStartDate')?.value,
                    startTime: document.getElementById('actualStartTime')?.value,
                    endDate: document.getElementById('actualEndDate')?.value,
                    endTime: document.getElementById('actualEndTime')?.value
                }
            });
            
            // แสดงข้อความ error ที่เฉพาะเจาะจง
            let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
            
            if (error.message.includes('taskId')) {
                errorMessage = 'ไม่พบรหัสงาน กรุณาตรวจสอบลิงก์หรือลองใหม่อีกครั้ง';
            } else if (error.message.includes('วันที่') || error.message.includes('เวลา')) {
                errorMessage = 'กรุณาตรวจสอบวันที่และเวลาให้ถูกต้อง';
            } else if (error.message.includes('ของเสีย')) {
                errorMessage = 'จำนวนของเสียต้องไม่เกินจำนวนผลิตรวม';
            } else if (error.message.includes('HTTP')) {
                errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง';
            } else if (error.message.includes('JSON')) {
                errorMessage = 'ข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ';
            }
            
            this.showToast(errorMessage, 'danger');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * ฟังก์ชันตรวจสอบความถูกต้องของข้อมูลในฟอร์ม
     * 
     * @returns {boolean} true หากข้อมูลถูกต้อง, false หากมีข้อผิดพลาด
     */
    validateForm() {
        const form = document.getElementById('emergencyStopForm');
        
        // ตรวจสอบ HTML5 validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            this.showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
            return false;
        }

        // ตรวจสอบเวลาเริ่มต้นและสิ้นสุด ใช้ dropdown แทน input type="time"
        const startDateInput = document.getElementById('actualStartDate');
        const endDateInput = document.getElementById('actualEndDate');
        
        // ดึงเวลาจาก dropdown
        const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
        const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
        
        if (!startDateInput || !endDateInput) {
            this.showToast('ไม่พบฟิลด์วันที่ กรุณาโหลดหน้าใหม่', 'danger');
            return false;
        }
        
        if (!startDateInput.value || !endDateInput.value || !actualStartTime || !actualEndTime) {
            this.showToast('กรุณากรอกวันที่และเวลาให้ครบถ้วน', 'warning');
            return false;
        }
        
        // แปลงรูปแบบวันที่สำหรับใช้ใน isValidTimeRange()
        const startDateFormatted = convertDateFormat(startDateInput.value);
        const endDateFormatted = convertDateFormat(endDateInput.value);
        
        // ตรวจสอบความถูกต้องของช่วงเวลา
        if (!isValidTimeRange(startDateFormatted, actualStartTime, endDateFormatted, actualEndTime)) {
            this.showToast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น', 'warning');
            return false;
        }

        // ตรวจสอบจำนวนผลิตและของเสีย
        const totalPiecesEl = document.getElementById('totalPieces');
        const rejectPiecesEl = document.getElementById('rejectPieces');
        
        if (!totalPiecesEl || !rejectPiecesEl) {
            this.showToast('ไม่พบฟิลด์จำนวนผลิต กรุณาโหลดหน้าใหม่', 'danger');
            return false;
        }
        
        const totalPieces = parseInt(totalPiecesEl.value || '0');
        const rejectPieces = parseInt(rejectPiecesEl.value || '0');
        
        if (rejectPieces > totalPieces) {
            this.showToast('จำนวนของเสียไม่สามารถมากกว่าจำนวนผลิตรวมได้', 'warning');
            return false;
        }

        return true;
    }

    /**
     * ฟังก์ชันรวบรวมข้อมูลจากฟอร์มเพื่อส่งไปยัง API
     * 
     * สำหรับตาราง ProductionResults:
     * - PlanID: ID ของแผนงาน
     * - BreakMorningMinutes/BreakLunchMinutes/BreakEveningMinutes: เวลาพักแต่ละช่วง
     * - StandardRunRate: อัตราการผลิตมาตรฐาน
     * - GoodQuantity: จำนวนผลิตดี
     * - DowntimeMinutes: เวลาหยุดเครื่อง
     * - PlannedWorkMinutes: เวลาทำงานตามแผน
     * - ActiveWorkMinutes: เวลาทำงานจริง
     * - OEE_Overall: OEE รวม
     * - ActualRunRate, WorkingHours, TotalBreakMinutes, DowntimeReason: ฟิลด์เพิ่มเติม
     * 
     * @returns {Object} ข้อมูลฟอร์มสำหรับตาราง ProductionResults
     */
    collectFormData() {
        console.log('=== collectFormData() STARTED ===');
        console.log('Current taskId:', this.taskId, 'Type:', typeof this.taskId);
        
        // ตรวจสอบ taskId ก่อนอื่น
        if (!this.taskId) {
            throw new Error('taskId ไม่ได้ถูกตั้งค่า กรุณาตรวจสอบ URL parameter');
        }
        
        try {
            console.log('Step 1: Getting date/time elements...');
            // คำนวณค่า OEE ก่อนรวบรวมข้อมูล แยกวันที่และเวลา
            const startDateInput = document.getElementById('actualStartDate');
            const endDateInput = document.getElementById('actualEndDate');
            
            // ดึงเวลาจาก dropdown แทน input type="time"
            const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
            const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
            
            console.log('Date/Time elements:', { 
                startDateInput: startDateInput ? startDateInput.value : 'not found', 
                endDateInput: endDateInput ? endDateInput.value : 'not found', 
                actualStartTime, 
                actualEndTime 
            });
            
            if (!startDateInput || !endDateInput || !actualStartTime || !actualEndTime) {
                throw new Error('กรุณากรอกวันที่และเวลาให้ครบถ้วน');
            }
            
            // แปลงรูปแบบวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY สำหรับใช้ใน isValidTimeRange()
            const startDateFormatted = convertDateFormat(startDateInput.value);
            const endDateFormatted = convertDateFormat(endDateInput.value);
            
            console.log('Converted date formats for validation:', {
                startDateOriginal: startDateInput.value,
                startDateFormatted,
                endDateOriginal: endDateInput.value,
                endDateFormatted
            });
            
            // ตรวจสอบความถูกต้องของช่วงเวลาโดยใช้รูปแบบที่ถูกต้อง
            if (!isValidTimeRange(startDateFormatted, actualStartTime, endDateFormatted, actualEndTime)) {
                throw new Error('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
            }
            
            // สร้าง DateTime สำหรับการคำนวณ (ใช้ข้อมูลจาก input type="date" โดยตรง)
            const [startYear, startMonth, startDay] = startDateInput.value.split('-');  // YYYY-MM-DD
            const [startHour, startMinute] = actualStartTime.split(':');
            const startTime = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), parseInt(startHour), parseInt(startMinute));
            
            const [endYear, endMonth, endDay] = endDateInput.value.split('-');  // YYYY-MM-DD
            const [endHour, endMinute] = actualEndTime.split(':');
            const endTime = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay), parseInt(endHour), parseInt(endMinute));
            
            const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
            
            console.log('Step 2: Time calculation completed:', { 
                startTime: startTime.toLocaleString('th-TH'), 
                endTime: endTime.toLocaleString('th-TH'), 
                totalMinutes 
            });

        console.log('Step 3: Calculating break times...');
        // Break time calculation - แยกเป็น 3 ช่วง
        let breakMorning = 0;
        let breakLunch = 0;
        let breakEvening = 0;
        
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            if (checkbox.value === 'morning') breakMorning = breakTimes[checkbox.value];
            if (checkbox.value === 'lunch') breakLunch = breakTimes[checkbox.value];
            if (checkbox.value === 'evening') breakEvening = breakTimes[checkbox.value];
        });

        const totalBreakMinutes = breakMorning + breakLunch + breakEvening;
        console.log('Step 4: Break times calculated:', { breakMorning, breakLunch, breakEvening, totalBreakMinutes });

        console.log('Step 5: Calculating overtime...');
        // Calculate overtime
        let overtimeMinutes = 0;
        if (document.getElementById('overtimeEnable')?.checked) {
            overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
        }

        const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');
        const downtimeReason = document.getElementById('downtimeDetail')?.value || '';
        
        console.log('Step 6: Downtime calculated:', { downtimeMinutes, downtimeReason });
        
        console.log('Step 7: Calculating shift and production times...');
        // Calculate shift hours and planned production time - กะ 10 ชั่วโมง
        const shiftHours = document.getElementById('shiftLength8h')?.checked ? 10.0 : 0;  // 10 ชั่วโมง ถ้าเลือก
        
        // ใช้เวลาผลิตตามแผนจากข้อมูลแผนงาน
        let plannedProductionMinutes = 0;
        if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
            const plannedStartTime = new Date(this.taskData.PlannedStartTime);
            const plannedEndTime = new Date(this.taskData.PlannedEndTime);
            const plannedTotalMinutes = Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
            const standardBreakMinutes = 60; // เวลาพักมาตรฐาน
            plannedProductionMinutes = Math.max(0, plannedTotalMinutes - standardBreakMinutes);
        } else {
            // ถ้าไม่มีข้อมูลแผนงาน ใช้วิธีเดิม
            plannedProductionMinutes = totalMinutes - totalBreakMinutes;
        }
        
        const runTimeMinutes = plannedProductionMinutes - downtimeMinutes;
        
        console.log('Step 8: Production times calculated:', { 
            shiftHours, plannedProductionMinutes, runTimeMinutes 
        });

        console.log('Step 9: Getting performance calculation fields...');
        // Performance calculation - ตรวจสอบฟิลด์ที่จำเป็น
        const idealRunRateEl = document.getElementById('idealRunRate');
        const totalPiecesEl = document.getElementById('totalPieces');
        const rejectPiecesEl = document.getElementById('rejectPieces');
        
        if (!idealRunRateEl || !totalPiecesEl || !rejectPiecesEl) {
            throw new Error('ไม่พบฟิลด์ข้อมูลการผลิต กรุณาโหลดหน้าใหม่');
        }
        
        const idealRunRateUsed = parseFloat(idealRunRateEl.value || '0');
        const totalPieces = parseInt(totalPiecesEl.value || '0');
        const rejectPieces = parseInt(rejectPiecesEl.value || '0');
        
        // ตรวจสอบความถูกต้องของข้อมูล
        if (idealRunRateUsed < 0 || totalPieces < 0 || rejectPieces < 0) {
            throw new Error('ค่าข้อมูลการผลิตต้องไม่เป็นค่าลบ');
        }
        
        if (rejectPieces > totalPieces) {
            throw new Error('จำนวนของเสียไม่สามารถมากกว่าจำนวนผลิตรวมได้');
        }
        
        const goodPieces = totalPieces - rejectPieces;
        
        console.log('Step 10: Performance data validated:', { 
            idealRunRateUsed, totalPieces, rejectPieces, goodPieces 
        });

        console.log('Step 11: Calculating OEE components...');
        // OEE calculation with new correct formulas
        
        // ใช้เวลาผลิตตามแผนจากข้อมูลแผนงาน (ไม่หักเวลาพัก)
        let plannedProductionMinutesForOEE = 0;
        if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
            const plannedStartTime = new Date(this.taskData.PlannedStartTime);
            const plannedEndTime = new Date(this.taskData.PlannedEndTime);
            const plannedTotalMinutes = Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
            // ✅ ไม่หักเวลาพักที่นี่แล้ว
            plannedProductionMinutesForOEE = plannedTotalMinutes;
        } else {
            // ถ้าไม่มีข้อมูลแผนงาน ใช้วิธีเดิม
            plannedProductionMinutesForOEE = totalMinutes;
        }
        
        // คำนวณ Actual Run Time = เวลาทำงานจริง - เวลาพักจริง - Downtime
        const actualRunTimeMinutes = totalMinutes - totalBreakMinutes - downtimeMinutes;
        
        // Availability = (Actual Run Time / Planned Production Time) × 100
        const availability = plannedProductionMinutesForOEE > 0 ? (actualRunTimeMinutes / plannedProductionMinutesForOEE) * 100 : 0;
        
        // Performance = (Total Count / (Actual Run Time × Ideal Run Rate)) × 100
        const theoreticalMaxCount = actualRunTimeMinutes * idealRunRateUsed;
        const performance = theoreticalMaxCount > 0 ? (totalPieces / theoreticalMaxCount) * 100 : 0;
        
        const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;
        const oeeTotal = (availability * performance * quality) / 10000;
        
        console.log('Step 12: OEE calculated with new formula:', { 
            plannedProductionMinutesForOEE, actualRunTimeMinutes, availability, performance, quality, oeeTotal 
        });

        console.log('Step 13: Calculating additional fields...');
        // Calculate additional fields for new schema
        const actualRunRate = actualRunTimeMinutes > 0 ? (totalPieces / actualRunTimeMinutes) : 0;
        const workingHours = totalMinutes / 60; // Convert minutes to hours
        
        console.log('Step 14: Additional fields calculated:', { actualRunRate, workingHours });
        
        console.log('Step 15: Creating form data object...');
        const formData = {
            PlanID: parseInt(this.taskId),  // แปลงเป็น integer
            ActualStartTime: formatDateTimeSQL(startDateFormatted, actualStartTime),
            ActualEndTime: formatDateTimeSQL(endDateFormatted, actualEndTime),
            ShiftHours: shiftHours,
            OvertimeMinutes: overtimeMinutes,
            BreakMorningMinutes: breakMorning,
            BreakLunchMinutes: breakLunch,
            BreakEveningMinutes: breakEvening,
            StandardRunRate: idealRunRateUsed,
            TotalPieces: totalPieces,
            RejectPieces: rejectPieces,
            GoodQuantity: goodPieces,  // เพิ่ม GoodQuantity
            DowntimeMinutes: downtimeMinutes,
            DowntimeReason: downtimeReason,
            PlannedWorkMinutes: plannedProductionMinutesForOEE, // ใช้เวลาจากแผนงาน (ไม่หักเวลาพัก)
            ActiveWorkMinutes: actualRunTimeMinutes, // เวลาทำงานจริงหลังหักเวลาพักและ downtime
            OEE_Availability: Math.round(availability * 100) / 100,
            OEE_Performance: Math.round(performance * 100) / 100,
            OEE_Quality: Math.round(quality * 100) / 100,
            OEE_Overall: Math.round(oeeTotal * 100) / 100,
            ActualRunRate: Math.round(actualRunRate * 100) / 100,
            WorkingHours: Math.round(workingHours * 100) / 100,  // เพิ่ม WorkingHours
            TotalBreakMinutes: totalBreakMinutes,  // เพิ่ม TotalBreakMinutes
            ConfirmedByUserID: 1
        };
        
        console.log('Step 16: Form data object created successfully');
        console.log('Form data collected for ProductionResults:', formData);
        console.log('PlanID check:', formData.PlanID, 'Type:', typeof formData.PlanID, 'Valid:', !isNaN(formData.PlanID) && formData.PlanID > 0);
        console.log('=== collectFormData() COMPLETED SUCCESSFULLY ===');
        
        return formData;
        
        } catch (error) {
            console.error('=== ERROR in collectFormData ===');
            console.error('Error occurred at step during form data collection');
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            console.error('=== END ERROR LOG ===');
            throw error;
        }
    }

    // Utility functions
    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    formatDateTime(date) {
        const d = new Date(date);
        const dateStr = this.formatDate(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${dateStr} ${hours}:${minutes}`;
    }

    formatTime(date, includeSeconds = false) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        if (includeSeconds) {
            const seconds = String(d.getSeconds()).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        
        return `${hours}:${minutes}`;
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    formatDateTimeSQL(date) {
        if (!date || isNaN(date.getTime())) {
            throw new Error('Invalid date object provided to formatDateTimeSQL');
        }
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    showLoading(show) {
        const loadingSection = document.getElementById('loadingSection');
        const form = document.getElementById('emergencyStopForm');
        
        if (loadingSection) {
            loadingSection.style.display = show ? 'block' : 'none';
        }
        
        if (form) {
            form.style.display = show ? 'none' : 'block';
        }

        // Disable form controls when loading
        const submitBtn = document.getElementById('confirmCompleteBtn');
        if (submitBtn) {
            submitBtn.disabled = show;
            if (show) {
                submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>กำลังบันทึก...';
            } else {
                submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>บันทึก';
            }
        }
    }

    showForm() {
        document.getElementById('emergencyStopForm').style.display = 'block';
    }

    showError(message) {
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) {
            loadingSection.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                    <h5 class="text-danger mb-3">เกิดข้อผิดพลาด</h5>
                    <p class="text-muted mb-4">${message}</p>
                    <a href="index.html" class="btn btn-primary">
                        <i class="bi bi-arrow-left me-2"></i>กลับหน้าหลัก
                    </a>
                </div>
            `;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('mainToast');
        const toastBody = document.getElementById('mainToastBody');
        
        if (toast && toastBody) {
            toast.className = `toast align-items-center text-bg-${type} border-0`;
            toastBody.textContent = message;
            
            const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
            bsToast.show();
        }
    }
    /**
     * ฟังก์ชันสำหรับยืนยันแผนงานที่เสร็จสิ้นแล้ว (เพื่อใช้กับ TaskManager)
     * เมื่อเรียกใช้ฟังก์ชันนี้ แผนงานจะหายไปจากปฏิทิน
     * @param {number} planId - ID ของแผนงานที่ต้องการยืนยัน
     * @returns {Promise<boolean>} - true หากยืนยันสำเร็จ
     */
    static async confirmTaskCompletion(planId) {
        try {
            // ส่งข้อมูลไปยัง backend API เพื่อยืนยันแผนงาน
            const response = await fetch('tasks.php?action=save_production_result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    PlanID: planId,
                    // ใช้ข้อมูลเริ่มต้นสำหรับการยืนยันจาก TaskManager
                    ActualStartTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    ActualEndTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    ShiftHours: 10.0,
                    OvertimeMinutes: 0,
                    BreakMorningMinutes: 0,
                    BreakLunchMinutes: 60,
                    BreakEveningMinutes: 0,
                    StandardRunRate: 0,
                    TotalPieces: 0,
                    RejectPieces: 0,
                    // ไม่ส่ง GoodQuantity, WorkingHours, TotalBreakMinutes เพราะเป็น computed columns
                    DowntimeMinutes: 0,
                    DowntimeReason: '',
                    PlannedWorkMinutes: 0,
                    ActiveWorkMinutes: 0,
                    OEE_Availability: 0,
                    OEE_Performance: 0,
                    OEE_Quality: 0,
                    OEE_Overall: 0,
                    ActualRunRate: 0,
                    ConfirmedByUserID: 1
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'การยืนยันงานล้มเหลว');
            }

            console.log(`Plan ${planId} confirmed successfully`);
            return true;

        } catch (error) {
            console.error('Error confirming plan:', error);
            return false;
        }
    }
}

/**
 * ฟังก์ชันสำหรับยืนยันแผนงานที่เสร็จสิ้นแล้ว (Global function สำหรับใช้กับ TaskManager)
 * เมื่อเรียกใช้ฟังก์ชันนี้ แผนงานจะหายไปจากปฏิทิน
 * @param {number} planId - ID ของแผนงานที่ต้องการยืนยัน
 * @returns {Promise<boolean>} - true หากยืนยันสำเร็จ
 */
async function confirmTaskCompletion(planId) {
    return await ConfirmCompleteManager.confirmTaskCompletion(planId);
}

/**
 * ฟังก์ชันตั้งค่าปุ่มยืนยันสำหรับใช้ในหน้าอื่น
 * เพื่อความสะดวกในการ integrate กับหน้าอื่นๆ
 */
function setupConfirmButton() {
    // ดึง plan ID จาก URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const planId = urlParams.get('id');
    
    if (!planId) {
        console.error('No plan ID found in URL');
        return;
    }
    
    // หาปุ่มยืนยัน
    const confirmButton = document.getElementById('confirmCompleteBtn');
    
    if (confirmButton) {
        confirmButton.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // แสดง loading หรือ disable ปุ่ม
            confirmButton.disabled = true;
            confirmButton.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>กำลังยืนยัน...';
            
            try {
                // ยืนยันแผนงาน
                const success = await confirmTaskCompletion(parseInt(planId));
                
                if (success) {
                    // แสดงข้อความสำเร็จ
                    alert('ยืนยันแผนงานสำเร็จ! แผนงานจะหายไปจากปฏิทิน');
                    
                    // redirect กลับไปหน้าหลัก
                    window.location.href = 'index.html';
                } else {
                    // แสดงข้อความผิดพลาด
                    alert('เกิดข้อผิดพลาดในการยืนยันแผนงาน');
                    
                    // เปิดปุ่มกลับมา
                    confirmButton.disabled = false;
                    confirmButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>ยืนยันเสร็จสิ้น';
                }
            } catch (error) {
                console.error('Confirm error:', error);
                alert('เกิดข้อผิดพลาดในการยืนยันแผนงาน: ' + error.message);
                
                // เปิดปุ่มกลับมา
                confirmButton.disabled = false;
                confirmButton.innerHTML = '<i class="bi bi-check-circle me-2"></i>ยืนยันเสร็จสิ้น';
            }
        });
    }
}

// Export functions for global use
window.confirmTaskCompletion = confirmTaskCompletion;
window.setupConfirmButton = setupConfirmButton;
window.ConfirmCompleteManager = ConfirmCompleteManager;

// Export ฟังก์ชันสำหรับใช้เวลาปัจจุบัน
window.useCurrentDateTime = function() {
    const manager = window.currentConfirmManager;
    if (manager && manager.updateCurrentDateTime) {
        manager.updateCurrentDateTime();
        return true;
    }
    console.warn('ConfirmCompleteManager ยังไม่พร้อม');
    return false;
};

// ================================================================
// FORCE 24-HOUR TIME FORMAT
// ================================================================

/**
 * บังคับรูปแบบเวลา 24 ชั่วโมง และลบ AM/PM ออกจากระบบ
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Content Loaded - Initializing ConfirmCompleteManager');
    
    // ตรวจสอบ elements ที่สำคัญ
    const criticalElements = [
        'operatingTime',
        'netRunTime', 
        'actualRunRate',
        'totalPieces',
        'idealRunRate',
        'rejectPieces',
        'actualStartHour',
        'actualStartMinute',
        'actualEndHour',
        'actualEndMinute'
    ];
    
    console.log('🔍 Checking critical elements in DOM:');
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`  - ${id}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
        if (element) {
            console.log(`    Element type: ${element.tagName}, value: "${element.value}", readonly: ${element.readOnly}`);
        }
    });
    
    const manager = new ConfirmCompleteManager();
    // เก็บ reference ไว้สำหรับเรียกใช้ภายนอก
    window.currentConfirmManager = manager;
    manager.init();
});
