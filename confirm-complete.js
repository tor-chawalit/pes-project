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
// HYBRID DATE PICKER FUNCTIONS
// ================================================================

/**
 * ตั้งค่าการเชื่อมโยง Native Date Picker ที่ซ่อนไว้กับ Text Field ที่แสดงผล
 */
function setupConfirmHiddenDatePickers() {
  console.log('Setting up confirm page hidden date pickers...');
  
  // Setup Actual Start Date
  setupConfirmDatePickerWithButton('actualStartDate', 'actualStartDateHidden', 'actualStartDateBtn');
  
  // Setup Actual End Date  
  setupConfirmDatePickerWithButton('actualEndDate', 'actualEndDateHidden', 'actualEndDateBtn');
  
  console.log('Confirm page hidden date pickers setup completed');
}

/**
 * ตั้งค่า date picker พร้อมปุ่มสำหรับหน้า confirm
 */
function setupConfirmDatePickerWithButton(displayId, hiddenId, buttonId) {
  const displayField = document.getElementById(displayId);
  const hiddenField = document.getElementById(hiddenId);
  const button = document.getElementById(buttonId);
  
  if (!displayField || !hiddenField || !button) {
    console.warn(`Confirm date picker elements not found: ${displayId}, ${hiddenId}, ${buttonId}`);
    return;
  }
  
  console.log(`Setting up confirm date picker: ${displayId} -> ${hiddenId} (button: ${buttonId})`);
  
  // เมื่อคลิกปุ่ม
  button.addEventListener('click', () => {
    console.log(`Button ${buttonId} clicked, triggering ${hiddenId}`);
    triggerConfirmDatePicker(hiddenField);
  });
  
  // เมื่อคลิกที่ display field
  displayField.addEventListener('click', () => {
    console.log(`Display field ${displayId} clicked, triggering ${hiddenId}`);
    triggerConfirmDatePicker(hiddenField);
  });
  
  // เมื่อ focus ที่ display field
  displayField.addEventListener('focus', () => {
    console.log(`Display field ${displayId} focused, triggering ${hiddenId}`);
    triggerConfirmDatePicker(hiddenField);
  });
  
  // ป้องกันการพิมพ์
  displayField.addEventListener('keydown', (e) => {
    e.preventDefault();
    triggerConfirmDatePicker(hiddenField);
  });
  
  // เมื่อเปลี่ยนค่าใน hidden field
  hiddenField.addEventListener('change', () => {
    console.log(`${hiddenId} changed to:`, hiddenField.value);
    updateConfirmDisplayField(hiddenField, displayField);
  });
  
  // เมื่อ input ใน hidden field
  hiddenField.addEventListener('input', () => {
    console.log(`${hiddenId} input:`, hiddenField.value);
    updateConfirmDisplayField(hiddenField, displayField);
  });
}

/**
 * เปิด native date picker สำหรับหน้า confirm
 */
function triggerConfirmDatePicker(hiddenField) {
  try {
    // แสดง field ชั่วคราว
    hiddenField.style.pointerEvents = 'auto';
    hiddenField.style.opacity = '1';
    hiddenField.style.position = 'relative';
    hiddenField.style.zIndex = '9999';
    
    hiddenField.focus();
    
    // ใช้ showPicker() ถ้าเบราว์เซอร์รองรับ
    if (hiddenField.showPicker && typeof hiddenField.showPicker === 'function') {
      hiddenField.showPicker();
      console.log('Used showPicker()');
    } else {
      // Fallback: สร้าง click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      hiddenField.dispatchEvent(clickEvent);
      console.log('Used click event fallback');
    }
    
    // ซ่อนกลับหลังจาก 200ms
    setTimeout(() => {
      hiddenField.style.pointerEvents = 'none';
      hiddenField.style.opacity = '0';
      hiddenField.style.position = 'absolute';
    }, 200);
    
  } catch (error) {
    console.error('Error triggering confirm date picker:', error);
    // คืนค่าการซ่อน field
    hiddenField.style.pointerEvents = 'none';
    hiddenField.style.opacity = '0';
    hiddenField.style.position = 'absolute';
  }
}

/**
 * อัปเดต display field เมื่อเปลี่ยนค่าสำหรับหน้า confirm
 */
function updateConfirmDisplayField(hiddenField, displayField) {
  if (hiddenField.value) {
    const date = new Date(hiddenField.value);
    displayField.value = formatConfirmDateToDDMMYYYY(date);
    
    // เพิ่ม visual feedback
    displayField.classList.add('is-valid');
    displayField.classList.remove('is-invalid');
    setTimeout(() => displayField.classList.remove('is-valid'), 2000);
    
    console.log(`Updated ${displayField.id} to: ${displayField.value}`);
  } else {
    displayField.value = '';
    displayField.classList.remove('is-valid', 'is-invalid');
  }
}

/**
 * แปลง Date object เป็นรูปแบบ DD/MM/YYYY สำหรับหน้า confirm
 */
function formatConfirmDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * ดึงค่าวันที่จาก hidden date picker (ISO format) สำหรับหน้า confirm
 */
function getConfirmDateValue(fieldId) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  return hiddenField ? hiddenField.value : '';
}

/**
 * ตั้งค่าวันที่ให้ hidden date picker สำหรับหน้า confirm
 */
function setConfirmDateValue(fieldId, isoDate) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  const displayField = document.getElementById(fieldId);
  
  if (hiddenField && displayField) {
    hiddenField.value = isoDate;
    
    if (isoDate) {
      const date = new Date(isoDate);
      displayField.value = formatConfirmDateToDDMMYYYY(date);
    } else {
      displayField.value = '';
    }
  }
}

// ================================================================
// RESPONSE PARSER UTILITY
// ================================================================

/**
 * Parse response safely - handles both JSON and HTML responses
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} - Parsed result object
 */
async function parseResponse(response) {
    if (!response.ok) {
        throw new Error('Request failed with status: ' + response.status);
    }
    
    const responseText = await response.text();
    
    try {
        // พยายาม parse เป็น JSON ก่อน
        return JSON.parse(responseText);
    } catch (parseError) {
        console.log("Response is not JSON:", responseText);
        
        // ถ้าไม่ใช่ JSON แต่ไม่มี error HTML (response สำเร็จ)
        if (!responseText.includes('<html') && !responseText.includes('error') && !responseText.includes('Error')) {
            // ถือว่าสำเร็จ
            return { success: true, message: 'Operation completed successfully' };
        } else {
            // มี error HTML หรือ error message
            throw new Error('Server returned HTML error response: ' + responseText.substring(0, 200));
        }
    }
}

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
        this.partialSessions = []; // ข้อมูล partial sessions
        this.partialSummary = null; // ข้อมูลสรุปจาก partial sessions
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
     * - โหลดข้อมูล partial sessions
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
            
            // แปลง response และตรวจสอบผลลัพธ์
            const result = await parseResponse(response);
            if (!result.success) {
                throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลแผนงานได้');
            }

            // เก็บข้อมูลแผนงานและแสดงใน console สำหรับ debug
            this.taskData = result.data;
            console.log('Plan data loaded:', this.taskData);
            
            // 🔧 Debug ข้อมูลเครื่องจักรโดยเฉพาะ
            console.log('🔧 Machine Debug Info:', {
                MachineName: this.taskData.MachineName,
                MachineNames: this.taskData.MachineNames,  
                MachineIDs: this.taskData.MachineIDs,
                MachineID: this.taskData.MachineID
            });
            
            // โหลดข้อมูล partial sessions
            await this.loadPartialSessions();
            
            // เพิ่มการ debug ข้อมูลที่จำเป็น
            console.log('🔍 Debug - Plan Data Fields:', {
                PlanID: this.taskData.PlanID,
                TargetOutput: this.taskData.TargetOutput,
                PlannedMinutes: this.taskData.PlannedMinutes,
                SetupMinutes: this.taskData.SetupMinutes,
                SetupNote: this.taskData.SetupNote,
                BreakMorningMinutes: this.taskData.BreakMorningMinutes,
                BreakLunchMinutes: this.taskData.BreakLunchMinutes,
                BreakEveningMinutes: this.taskData.BreakEveningMinutes,
                PlannedStartTime: this.taskData.PlannedStartTime,
                PlannedEndTime: this.taskData.PlannedEndTime,
                StandardRunRate: this.taskData.StandardRunRate
            });
            
            // ตรวจสอบสถานะงาน (ปิดไว้ชั่วคราวเพื่อทดสอบ)
            // if (this.taskData.Status !== 'completed') {
            //     throw new Error('งานนี้ยังไม่ได้ทำเสร็จ ไม่สามารถยืนยันได้');
            // }

            // แสดงข้อมูลในฟอร์มและแสดงฟอร์ม
            this.populateTaskData();
            
            // โหลดและใส่ข้อมูลจาก partial sessions
            if (typeof integratePartialSessionsData === 'function') {
                const partialResult = await integratePartialSessionsData(this.taskId);
                if (partialResult.hasPartialData) {
                    console.log('✅ Partial sessions data integrated successfully');
                    this.partialData = partialResult.data;
                } else {
                    console.log('ℹ️ No partial sessions data available');
                }
            } else {
                console.log('ℹ️ Partial sessions helper not loaded, trying direct API call...');
                // ทดลองเรียก API โดยตรง
                try {
                    await this.loadPartialSessionsDirect();
                } catch (error) {
                    console.log('ℹ️ Direct API call failed:', error.message);
                }
            }
            
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
     * โหลดข้อมูล partial sessions จาก API
     */
    async loadPartialSessions() {
        try {
            console.log('📡 Loading partial sessions for plan:', this.taskId);
            
            const response = await fetch(`api/production-sessions.php?action=get_sessions&plan_id=${this.taskId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.sessions) {
                this.partialSessions = result.data.sessions;
                console.log('✅ Partial sessions loaded:', this.partialSessions);
                
                // แสดงประวัติ partial sessions
                this.displayPartialSummary();
                
                // อัพเดท Runtime จาก partial sessions ทันที
                this.updateRuntimeFromPartialSessions();
            } else {
                this.partialSessions = [];
                console.log('ℹ️ No partial sessions found');
                this.hidePartialHistory();
            }
            
        } catch (error) {
            console.error('❌ Error loading partial sessions:', error);
            this.partialSessions = [];
            this.hidePartialHistory();
        }
    }
    

    
    /**
     * ตั้งค่าเวลาพักจากจำนวนนาที
     */
    setBreakTimeFromMinutes(breakType, totalMinutes) {
        const checkboxes = document.querySelectorAll(`input[name="${breakType}"]`);
        let remainingMinutes = totalMinutes;
        
        // เรียงลำดับ checkbox จากน้อยไปมาก
        const sortedCheckboxes = Array.from(checkboxes).sort((a, b) => 
            parseInt(a.value) - parseInt(b.value)
        );
        
        sortedCheckboxes.forEach(checkbox => {
            const minutes = parseInt(checkbox.value);
            if (remainingMinutes >= minutes) {
                checkbox.checked = true;
                remainingMinutes -= minutes;
            }
        });
        
        console.log(`✅ Set ${breakType} checkboxes for ${totalMinutes} minutes`);
    }
    
    /**
     * ตั้งค่าวันที่และเวลาจาก partial sessions
     */
    setDateTimeFromPartialSessions(startDateTime, endDateTime) {
        try {
            const startDate = new Date(startDateTime);
            const endDate = new Date(endDateTime);
            
            // ตั้งค่าวันที่เริ่มต้น
            const startDateEl = document.getElementById('actualStartDate');
            const startHourEl = document.getElementById('actualStartHour');
            const startMinuteEl = document.getElementById('actualStartMinute');
            
            if (startDateEl) {
                startDateEl.value = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
            }
            if (startHourEl) {
                startHourEl.value = String(startDate.getHours()).padStart(2, '0');
            }
            if (startMinuteEl) {
                startMinuteEl.value = String(startDate.getMinutes()).padStart(2, '0');
            }
            
            // ตั้งค่าวันที่สิ้นสุด
            const endDateEl = document.getElementById('actualEndDate');
            const endHourEl = document.getElementById('actualEndHour');
            const endMinuteEl = document.getElementById('actualEndMinute');
            
            if (endDateEl) {
                endDateEl.value = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
            }
            if (endHourEl) {
                endHourEl.value = String(endDate.getHours()).padStart(2, '0');
            }
            if (endMinuteEl) {
                endMinuteEl.value = String(endDate.getMinutes()).padStart(2, '0');
            }
            
            console.log('✅ Set date/time from partial sessions:', {
                start: startDateTime,
                end: endDateTime
            });
            
        } catch (error) {
            console.error('❌ Error setting date/time from partial sessions:', error);
        }
    }
    
    /**
     * แสดงข้อความแจ้งเตือนเกี่ยวกับ partial sessions
     */
    showPartialSessionsNotice(data) {
        const noticeHtml = `
            <div class="alert alert-info mt-3" id="partialSessionsNotice">
                <div class="d-flex align-items-center">
                    <i class="bi bi-info-circle me-2"></i>
                    <div>
                        <strong>ข้อมูลจาก Partial Sessions:</strong>
                        <div class="small mt-1">
                            จำนวนผลิต: ${data.TotalPieces || 0} ชิ้น | 
                            ของเสีย: ${data.RejectPieces || 0} ชิ้น | 
                            งาน Rework: ${data.ReworkPieces || 0} ชิ้น |
                            เวลาทำงานจริง: ${Math.round((data.ActiveWorkMinutes || 0) / 60 * 100) / 100} ชม.
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const formContainer = document.getElementById('confirmForm');
        if (formContainer) {
            // ลบ notice เก่าถ้ามี
            const oldNotice = document.getElementById('partialSessionsNotice');
            if (oldNotice) oldNotice.remove();
            
            // เพิ่ม notice ใหม่
            formContainer.insertAdjacentHTML('afterbegin', noticeHtml);
        }
    }
    
    /**
     * โหลดข้อมูล partial sessions โดยตรงจาก API (สำรอง)
     */
    async loadPartialSessionsDirect() {
        try {
            console.log('📡 Loading partial sessions directly for plan:', this.taskId);
            
            const response = await fetch(`/api/production-sessions.php?action=get_session_summary&plan_id=${this.taskId}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.hasSessions) {
                console.log('✅ Direct API call successful:', result.data);
                this.partialData = result.data;
                
                // ใส่ข้อมูลลงในฟอร์มแบบง่าย
                this.populateBasicPartialData(result.data.forConfirmForm);
                
                return true;
            } else {
                console.log('ℹ️ No partial sessions found via direct API');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Direct API call error:', error);
            throw error;
        }
    }
    
    /**
     * ใส่ข้อมูลพื้นฐานจาก partial sessions ลงในฟอร์ม
     */
    populateBasicPartialData(data) {
        if (!data) return;
        
        console.log('🔄 Populating basic partial data:', data);
        
        // ใส่ข้อมูลจำนวนผลผลิต
        const basicFields = {
            'totalPieces': data.TotalPieces,
            'rejectPieces': data.RejectPieces,
            'reworkPieces': data.ReworkPieces,
            'downtimeMinutes': data.DowntimeMinutes
            // ลบ Remark ออก - ไม่ต้องเติมอัตโนมัติ
        };
        
        Object.entries(basicFields).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element && value !== undefined && value !== null) {
                element.value = value;
                console.log(`✅ Set ${fieldId}:`, value);
            }
        });
        
        // แสดงข้อความแจ้งเตือน
        this.showBasicPartialNotice(data);
    }
    
    /**
     * แสดงข้อความแจ้งเตือนแบบพื้นฐาน
     */
    showBasicPartialNotice(data) {
        const notice = document.createElement('div');
        notice.className = 'alert alert-info mt-3';
        notice.id = 'basicPartialNotice';
        notice.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-info-circle me-2"></i>
                <div>
                    <strong>ข้อมูลจาก Partial Sessions (โหลดโดยตรง):</strong>
                    <div class="small mt-1">
                        จำนวนผลิต: ${data.TotalPieces || 0} | 
                        ของเสีย: ${data.RejectPieces || 0} | 
                        Rework: ${data.ReworkPieces || 0} |
                        เวลาทำงาน: ${Math.round((data.ActiveWorkMinutes || 0) / 60 * 100) / 100} ชม.
                    </div>
                </div>
            </div>
        `;
        
        const form = document.getElementById('confirmForm');
        if (form) {
            // ลบ notice เก่าถ้ามี
            const oldNotice = document.getElementById('basicPartialNotice');
            if (oldNotice) oldNotice.remove();
            
            form.insertBefore(notice, form.firstChild);
        }
    }

    /**
     * คำนวณข้อมูลสรุปจาก partial sessions
     */
    calculatePartialSummary() {
        if (!this.partialSessions || this.partialSessions.length === 0) {
            this.partialSummary = {
                totalSessions: 0,
                totalRuntime: 0,
                totalProduced: 0,
                totalRejects: 0,
                totalRework: 0,
                totalBreakTime: 0,
                totalDowntime: 0,
                averageRunRate: 0
            };
            return;
        }

        const summary = this.partialSessions.reduce((acc, session) => {
            acc.totalRuntime += session.WorkingMinutes || 0;
            acc.totalProduced += session.SessionGoodQuantity || 0;
            acc.totalRejects += session.SessionRejectQuantity || 0;
            acc.totalRework += session.SessionReworkQuantity || 0;
            acc.totalBreakTime += session.TotalBreakMinutes || 0;
            acc.totalDowntime += session.DowntimeMinutes || 0;
            return acc;
        }, {
            totalSessions: this.partialSessions.length,
            totalRuntime: 0,
            totalProduced: 0,
            totalRejects: 0,
            totalRework: 0,
            totalBreakTime: 0,
            totalDowntime: 0
        });

        // คำนวณ average run rate
        summary.averageRunRate = summary.totalRuntime > 0 ? 
            (summary.totalProduced / summary.totalRuntime) : 0;

        this.partialSummary = summary;
        console.log('📊 Partial summary calculated:', this.partialSummary);
    }

    /**
     * ดึงชื่อเครื่องจักรที่ถูกต้องจากแหล่งข้อมูลต่างๆ (เหมือน index.js)
     * @returns {string} - ชื่อเครื่องจักรหรือข้อความแสดงไม่มีข้อมูล
     */
    getResolvedMachineName() {
        if (!this.taskData) return 'ไม่ระบุเครื่องจักร';
        
        // ลำดับความสำคัญตาม index.js และ API ใหม่
        // 1. MachineNames จาก ProductionPlanMachines (หลายเครื่อง)
        if (this.taskData.MachineNames) {
            console.log('✅ Using MachineNames from JOIN:', this.taskData.MachineNames);
            return this.taskData.MachineNames;
        }
        
        // 2. PrimaryMachineName (เครื่องหลัก)
        if (this.taskData.PrimaryMachineName) {
            console.log('✅ Using PrimaryMachineName:', this.taskData.PrimaryMachineName);
            return this.taskData.PrimaryMachineName;
        }
        
        // 3. MachineName จาก field เดิม
        if (this.taskData.MachineName) {
            console.log('✅ Using MachineName field:', this.taskData.MachineName);
            return this.taskData.MachineName;
        }
        
        // 4. Fallback options
        if (this.taskData.MachineIDs) {
            console.log('⚠️ Using MachineIDs fallback:', this.taskData.MachineIDs);
            return `Machine IDs: ${this.taskData.MachineIDs}`;
        }
        
        if (this.taskData.MachineID) {
            console.log('⚠️ Using MachineID fallback:', this.taskData.MachineID);
            return `Machine ID: ${this.taskData.MachineID}`;
        }
        
        console.log('❌ No machine data found at all');
        return 'ไม่ระบุเครื่องจักร';
    }

    /**
     * แสดงฟอร์มหลังจากโหลดข้อมูลเสร็จ
     */
    showForm() {
        console.log('🎬 Showing form and setting up event listeners...');
        
        const form = document.getElementById('emergencyStopForm');
        if (form) {
            form.style.display = 'block';
            console.log('✅ Form displayed');
        } else {
            console.error('❌ Form element not found');
        }
        
        // ตั้งค่า event listeners
        this.setupEventListeners();
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

        console.log('🔧 populateTaskData called with:', this.taskData);

        // 🎯 แก้ไขส่วนเครื่องจักร - ใช้ helper function
        const machineName = this.getResolvedMachineName();
        console.log('✅ Resolved machine name:', machineName);

        // แสดงข้อมูลงานใน header
        const taskInfoDisplay = document.getElementById('taskInfoDisplay');
        if (taskInfoDisplay) {
            // 🎯 ใช้ลำดับความสำคัญเหมือนใน index.js
            let machineDisplay = 'ไม่ระบุ';
            
            if (this.taskData.MachineNames) {
                // ถ้ามี MachineNames แสดงทั้งหมด (เหมือน index.js)
                machineDisplay = this.taskData.MachineNames;
                console.log('✅ Using MachineNames from taskData:', machineDisplay);
            } else if (this.taskData.MachineName) {
                // ถ้ามี MachineName เดี่ยว
                machineDisplay = this.taskData.MachineName;
                console.log('✅ Using MachineName from taskData:', machineDisplay);
            } else {
                console.log('⚠️ No machine data found, using fallback');
            }
            
            const taskInfo = `งาน: ${this.taskData.ProductDisplayName || this.taskData.ProductName || 'ไม่ระบุ'} | ` +
                           `แผนก: ${this.taskData.DepartmentName || 'ไม่ระบุ'} | ` +
                           `เครื่องจักร: ${machineDisplay}`;
            taskInfoDisplay.textContent = taskInfo;
            console.log('✅ Task info updated:', taskInfo);
            console.log('✅ taskInfoDisplay element found and updated');
        } else {
            console.error('❌ taskInfoDisplay element not found in DOM');
        }

        // ตั้งค่าจำนวนผลิตเป้าหมายจาก TargetOutput และคำนวณ remaining
        if (this.taskData.TargetOutput) {
            const targetOutputEl = document.getElementById('targetOutput');
            if (targetOutputEl) {
                targetOutputEl.value = this.taskData.TargetOutput;
            }
            
            // เริ่มต้นการจัดการ partial confirmation
            this.initializePartialConfirmation();
        }

        // ตั้งค่าจำนวนผลิตรวมจาก partial sessions (ถ้ามี) หรือให้ผู้ใช้กรอกเอง
        const totalPiecesEl = document.getElementById('totalPieces');
        if (totalPiecesEl) {
            if (this.partialSummary && this.partialSummary.totalProduced > 0) {
                // มีข้อมูลจาก partial sessions - เติมค่าที่ผลิตได้แล้ว
                totalPiecesEl.value = this.partialSummary.totalProduced;
                totalPiecesEl.setAttribute('data-from-partial', 'true');
                console.log('📊 Set total pieces from partial sessions:', this.partialSummary.totalProduced);
            } else if (this.taskData.TargetOutput) {
                // ไม่มีข้อมูล partial - ให้ผู้ใช้กรอกเอง
                totalPiecesEl.placeholder = `เช่น ${Math.min(100, this.taskData.TargetOutput)}`;
            }
        }

        // แสดงข้อมูลสรุปจาก partial sessions
        this.displayPartialSummary();

        // คำนวณ Summary จาก Partial Sessions ก่อน
        this.calculateAndDisplaySummaryCards();
        
        // จากนั้นค่อยแสดงข้อมูล remaining
        console.log('🔄 Calling updatePartialDisplay from populateTaskData...');
        this.updatePartialDisplay();
        if (this.taskData.StandardRunRate) {
            const idealRunRateEl = document.getElementById('idealRunRate');
            if (idealRunRateEl) {
                idealRunRateEl.value = this.taskData.StandardRunRate;
            }
        }

        // ตรวจสอบและกำหนดค่าเริ่มต้นสำหรับข้อมูลที่อาจเป็น null
        this.taskData.SetupMinutes = this.taskData.SetupMinutes ?? 30;
        this.taskData.SetupNote = this.taskData.SetupNote ?? '';
        this.taskData.BreakMorningMinutes = this.taskData.BreakMorningMinutes ?? 0;
        this.taskData.BreakLunchMinutes = this.taskData.BreakLunchMinutes ?? 60;
        this.taskData.BreakEveningMinutes = this.taskData.BreakEveningMinutes ?? 0;
        
        console.log('✅ Default values applied:', {
            SetupMinutes: this.taskData.SetupMinutes,
            BreakMorningMinutes: this.taskData.BreakMorningMinutes,
            BreakLunchMinutes: this.taskData.BreakLunchMinutes,
            BreakEveningMinutes: this.taskData.BreakEveningMinutes
        });

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
        
        // อัปเดตการแสดงผล remaining quantity
        console.log('🔄 Calling updatePartialDisplay from populateTaskData...');
        this.updatePartialDisplay();
    }

    /**
     * ฟังก์ชันเติมวันที่และเวลาปัจจุบันอัตโนมัติ
     * - เติมวันที่ปัจจุบันใน hybrid date picker (แสดงเป็น DD/MM/YYYY)
     * - เติมเวลาปัจจุบันใน dropdown เวลาเริ่มต้น
     * - รองรับทั้งการใช้วันที่ปัจจุบันและการบันทึกย้อนหลัง
     */
    fillCurrentStartDateTime() {
        console.log('🕐 fillCurrentStartDateTime() called - เติมวันที่และเวลาปัจจุบัน');
        const now = new Date();
        
        // เตรียมข้อมูลวันที่และเวลาปัจจุบัน
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const currentDateForInput = `${year}-${month}-${day}`;  // YYYY-MM-DD สำหรับ ISO format
        
        // เติมเวลาปัจจุบันใน dropdown (รูปแบบ 24 ชั่วโมง)
        const currentHour = String(now.getHours()).padStart(2, '0');  // 00-23
        const currentMinute = String(now.getMinutes()).padStart(2, '0'); // 00-59
        
        console.log(`🕐 Current date/time: ${currentDateForInput} ${currentHour}:${currentMinute}`);
        
        // เติมวันที่เริ่มต้นด้วย hybrid date picker system
        setConfirmDateValue('actualStartDate', currentDateForInput);
        console.log(`✅ เติมวันที่เริ่มต้น: ${currentDateForInput} (แสดงเป็น DD/MM/YYYY)`);
        
        // ได้รับ elements สำหรับเวลาเริ่มต้น
        const startHourEl = document.getElementById('actualStartHour');
        const startMinuteEl = document.getElementById('actualStartMinute');
        
        console.log('🔍 Start time elements found:', {
            startHourEl: !!startHourEl,
            startMinuteEl: !!startMinuteEl
        });
        
        // เติมเวลาเริ่มต้น
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
        
        console.log(`🎯 Auto-fill completed (DATE & TIME):
        - Date: ${currentDateForInput} (แสดงเป็น DD/MM/YYYY ใน hybrid date picker)
        - Time: ${currentHour}:${currentMinute} (เติมในช่องเวลาเริ่มต้น)`);
        
        // เรียกคำนวณเวลาทันทีหลังจากเติมค่า (ถ้าผู้ใช้ได้เลือกเวลาสิ้นสุดแล้ว)
        setTimeout(() => {
            console.log('🔄 Triggering calculateTimes() after filling start date/time');
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
        
        // เติมวันที่เริ่มต้น (ใช้ hybrid date picker system)
        setConfirmDateValue('actualStartDate', currentDateForInput);
        console.log(`✅ เติมวันที่เริ่มต้น: ${currentDateForInput} (DD/MM/YYYY format)`);
        
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
     * เริ่มต้นระบบ Partial Confirmation
     */
    initializePartialConfirmation() {
        console.log('🔄 Initializing partial confirmation system...');
        
        // เริ่มต้น partial data ถ้ายังไม่มี
        if (!this.partialData) {
            this.partialData = {
                targetOutput: this.taskData.TargetOutput || 0,
                totalProduced: 0, // จำนวนที่ผลิตแล้วสะสม
                currentSession: 0, // จำนวนที่กำลังจะบันทึกครั้งนี้
                remaining: this.taskData.TargetOutput || 0,
                sessions: [] // เก็บประวัติการบันทึกแต่ละครั้ง
            };
        }
        
        // โหลดข้อมูล partial ที่มีอยู่จาก API
        this.loadExistingPartialData();
        
        // ตั้งค่า event listeners สำหรับ total pieces
        const totalPiecesEl = document.getElementById('totalPieces');
        if (totalPiecesEl) {
            totalPiecesEl.addEventListener('input', () => {
                this.updatePartialCalculation();
            });
        }
        
        console.log('✅ Partial confirmation system initialized');
    }

    /**
     * อัปเดตการคำนวณ partial confirmation - แก้ไขใหม่ให้ใช้ข้อมูลจาก Sessions
     */
    updatePartialCalculation() {
        const totalPiecesEl = document.getElementById('totalPieces');
        const currentSession = parseInt(totalPiecesEl?.value || 0);
        
        console.log('🔢 updatePartialCalculation called:', {
            currentSession,
            taskDataTargetOutput: this.taskData?.TargetOutput,
            partialSummaryTotalProduced: this.partialSummaryData?.totalProduced || 0
        });
        
        // ตรวจสอบว่ามีข้อมูลเป้าหมายจากแผนงาน
        if (!this.taskData?.TargetOutput) {
            console.log('⚠️ No target output from task data');
            return;
        }
        
        // คำนวณ remaining โดยใช้ข้อมูลจาก Sessions
        const targetOutput = this.taskData.TargetOutput;
        const totalProducedFromSessions = this.partialSummaryData?.totalProduced || 0;
        const totalProducedIncludingCurrent = totalProducedFromSessions + currentSession;
        const futureRemaining = Math.max(0, targetOutput - totalProducedIncludingCurrent);
        
        console.log('🔢 Remaining calculation (CORRECTED WITH SESSIONS):', {
            target: targetOutput,
            producedFromSessions: totalProducedFromSessions,
            currentSession: currentSession,
            totalProducedIncludingCurrent: totalProducedIncludingCurrent,
            futureRemaining: futureRemaining,
            formula: `${targetOutput} - (${totalProducedFromSessions} + ${currentSession}) = ${futureRemaining}`
        });
        
        // อัปเดตการแสดงผล
        this.updatePartialDisplay(futureRemaining);
        
        // แสดง/ซ่อน OEE section
        this.toggleOEESection(futureRemaining === 0 && currentSession > 0);
    }





    /**
     * โหลดข้อมูล Partial Confirmations ที่มีอยู่
     */
    async loadExistingPartialData() {
        if (!this.planId) return;
        
        try {
            const response = await fetch(`/api/partial-confirmations.php?action=get_plan_status&plan_id=${this.planId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                
                // อัปเดตข้อมูล partial
                this.partialData = {
                    planId: data.planId,
                    targetOutput: data.targetOutput,
                    totalProduced: data.totalProduced,
                    remainingQuantity: data.remainingQuantity,
                    sessionNumber: data.lastSession + 1,
                    hasPartialConfirmations: data.hasPartialConfirmations
                };
                
                console.log('📊 Loaded existing partial data:', this.partialData);
                
                // แสดง session info ถ้ามี partial confirmations
                if (data.hasPartialConfirmations) {
                    this.showExistingSessionInfo(data);
                }
                
                // อัปเดต UI
                this.updateRemainingQuantityDisplay(data.remainingQuantity);
                this.toggleOEESection(data.isCompleted);
                
                // ถ้าเสร็จแล้วให้คำนวณ OEE
                if (data.isCompleted) {
                    this.calculateOEE();
                }
                
            }
        } catch (error) {
            console.error('Error loading partial data:', error);
        }
    }
    
    /**
     * แสดงข้อมูล session ที่มีอยู่
     */
    showExistingSessionInfo(data) {
        const sessionInfoContainer = document.getElementById('sessionInfoContainer');
        const sessionInfo = document.getElementById('sessionInfo');
        
        if (sessionInfoContainer && sessionInfo) {
            sessionInfoContainer.style.display = 'block';
            
            sessionInfo.innerHTML = `
                <div class="alert alert-info">
                    <strong><i class="bi bi-info-circle me-1"></i>ข้อมูลปัจจุบัน</strong><br>
                    เป้าหมาย: ${data.targetOutput} ชิ้น<br>
                    ผลิตแล้ว: ${data.totalProduced} ชิ้น<br>
                    คงเหลือ: <span class="text-${data.remainingQuantity > 0 ? 'warning' : 'success'}">${data.remainingQuantity} ชิ้น</span><br>
                    Session ถัดไป: #${data.lastSession + 1}
                </div>
                ${data.remainingQuantity > 0 ?
                    '<div class="alert alert-warning small"><i class="bi bi-arrow-clockwise me-1"></i>พร้อมสำหรับการผลิตต่อ</div>' :
                    '<div class="alert alert-success small"><i class="bi bi-check-circle me-1"></i>งานเสร็จสิ้นแล้ว</div>'
                }
            `;
        }
    }

    /**
     * คำนวณเวลาทำงานจริง
     */
    calculateWorkingMinutes() {
        try {
            // อ่านเวลาจาก dropdown แทนการใช้ form.querySelector
            const startDate = getConfirmDateValue('actualStartDate');
            const endDate = getConfirmDateValue('actualEndDate');
            const startTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
            const endTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
            
            if (!startDate || !endDate || !startTime || !endTime) {
                return 0;
            }
            
            // สร้าง datetime string
            const startDateFormatted = convertDateFormat(startDate);
            const endDateFormatted = convertDateFormat(endDate);
            const actualStartTimeStr = formatDateTimeSQL(startDateFormatted, startTime);
            const actualEndTimeStr = formatDateTimeSQL(endDateFormatted, endTime);
            
            const actualStartTime = new Date(actualStartTimeStr);
            const actualEndTime = new Date(actualEndTimeStr);
            const totalMinutes = (actualEndTime - actualStartTime) / (1000 * 60);
            
            // คำนวณ break time จาก checkbox
            let breakMorning = 0, breakLunch = 0, breakEvening = 0;
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                if (checkbox.value === 'morning') breakMorning = 15;
                if (checkbox.value === 'lunch') breakLunch = 60;
                if (checkbox.value === 'evening') breakEvening = 15;
            });
            
            const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');
            
            const workingMinutes = totalMinutes - breakMorning - breakLunch - breakEvening - downtimeMinutes;
            
            return Math.max(0, Math.round(workingMinutes));
        } catch (error) {
            console.error('Error in calculateWorkingMinutes:', error);
            return 0;
        }
    }

    /**
     * อัปเดตการแสดงผล remaining quantity - แก้ไขใหม่ให้ดึงจาก Sessions
     */
    updatePartialDisplay(futureRemaining = null) {
        const remainingDisplay = document.getElementById('remainingDisplay');
        const remainingQuantity = document.getElementById('remainingQuantity');
        const remainingTargetDisplay = document.getElementById('remainingTargetDisplay');
        const remainingProducedDisplay = document.getElementById('remainingProducedDisplay');
        
        console.log('📊 updatePartialDisplay called with:', {
            futureRemaining,
            hasTaskData: !!this.taskData,
            hasPartialSummaryData: !!this.partialSummaryData,
            partialSessionsCount: this.partialSessions?.length || 0
        });
        
        // 1. ดึงเป้าหมายจาก taskData (แผนงาน)
        const targetOutput = this.taskData?.TargetOutput || 0;
        
        // 2. ดึงจำนวนที่ผลิตแล้วจาก partialSummaryData (จาก Sessions)
        const totalProducedFromSessions = this.partialSummaryData?.totalProduced || 0;
        
        // 3. ดึงจำนวนที่กำลังจะกรอกในครั้งนี้ (Current Session)
        const totalPiecesEl = document.getElementById('totalPieces');
        const currentSession = parseInt(totalPiecesEl?.value || '0');
        
        console.log('📊 Data sources for remaining calculation:', {
            targetOutput: `${targetOutput} (จากแผนงาน)`,
            totalProducedFromSessions: `${totalProducedFromSessions} (จาก ${this.partialSessions?.length || 0} sessions)`,
            currentSession: `${currentSession} (จากฟอร์ม Current Session)`,
            calculation: `${targetOutput} - ${totalProducedFromSessions} - ${currentSession}`
        });
        
        // คำนวณจำนวนคงเหลือ
        const currentRemaining = futureRemaining !== null ? 
            futureRemaining : Math.max(0, targetOutput - totalProducedFromSessions - currentSession);
        
        // แสดงผลเฉพาะเมื่อมีเป้าหมาย
        if (remainingDisplay && targetOutput > 0) {
            remainingDisplay.style.display = 'block';
            
            // อัปเดตจำนวนคงเหลือ
            if (remainingQuantity) {
                remainingQuantity.textContent = currentRemaining.toLocaleString();
                
                // เปลี่ยนสีตามสถานะ
                if (currentRemaining === 0) {
                    remainingQuantity.className = 'badge bg-success fs-5 fw-bold'; // เสร็จแล้ว
                } else if (currentRemaining <= 10) {
                    remainingQuantity.className = 'badge bg-warning text-dark fs-5 fw-bold'; // ใกล้เสร็จ
                } else {
                    remainingQuantity.className = 'badge bg-primary fs-5 fw-bold'; // ยังเหลือเยอะ
                }
            }
            
            // แสดงเป้าหมายรวม (จากแผน)
            if (remainingTargetDisplay) {
                remainingTargetDisplay.textContent = targetOutput.toLocaleString();
            }
            
            // แสดงจำนวนที่ผลิตแล้ว (จาก Sessions + Current)
            if (remainingProducedDisplay) {
                const totalIncludingCurrent = totalProducedFromSessions + currentSession;
                remainingProducedDisplay.textContent = totalIncludingCurrent.toLocaleString();
                
                // เปลี่ยนสีตามความคืบหน้า
                const progressPercentage = targetOutput > 0 ? (totalIncludingCurrent / targetOutput) * 100 : 0;
                if (progressPercentage >= 100) {
                    remainingProducedDisplay.className = remainingProducedDisplay.className.replace(/text-\w+/g, '') + ' text-success fw-bold';
                } else if (progressPercentage >= 80) {
                    remainingProducedDisplay.className = remainingProducedDisplay.className.replace(/text-\w+/g, '') + ' text-warning fw-bold';
                } else {
                    remainingProducedDisplay.className = remainingProducedDisplay.className.replace(/text-\w+/g, '') + ' text-primary fw-bold';
                }
            }
            
            console.log('✅ Remaining display updated successfully:', {
                targetOutput: targetOutput.toLocaleString(),
                producedFromSessions: totalProducedFromSessions.toLocaleString(),
                currentSession: currentSession.toLocaleString(),
                totalProduced: (totalProducedFromSessions + currentSession).toLocaleString(),
                remaining: currentRemaining.toLocaleString(),
                progressPercent: targetOutput > 0 ? Math.round((totalProducedFromSessions + currentSession) / targetOutput * 100) : 0
            });
            
        } else {
            // ซ่อนเมื่อไม่มีเป้าหมาย
            if (remainingDisplay) {
                remainingDisplay.style.display = 'none';
            }
            console.log('ℹ️ Remaining display hidden - no target output');
        }
    }

    /**
     * แสดง/ซ่อน OEE Section ตาม remaining quantity
     */
    toggleOEESection(shouldShow) {
        const oeeSection = document.getElementById('oeeSection');
        
        if (oeeSection) {
            if (shouldShow) {
                oeeSection.style.display = 'block';
                console.log('✅ OEE Section shown - production complete');
                
                // เริ่มการคำนวณ OEE
                this.calculateOEE();
            } else {
                oeeSection.style.display = 'none';
                console.log('ℹ️ OEE Section hidden - production not complete');
                
                // รีเซ็ต OEE display
                this.resetOEEDisplay();
            }
        }
    }

    /**
     * ฟังก์ชันคำนวณและแสดงเวลาผลิตตามแผน (Planned Production Time)
     * - ใช้ PlannedMinutes จากข้อมูลแผนงาน (เป็นเวลาที่หักเวลาพักและ setup แล้ว)
     * - แสดงผลลัพธ์ในฟิลด์ plannedProductionTime
     */
    updatePlannedProductionTime() {
        if (!this.taskData) {
            const plannedProductionTimeEl = document.getElementById('plannedProductionTime');
            if (plannedProductionTimeEl) {
                plannedProductionTimeEl.value = 'ไม่มีข้อมูลแผนงาน';
            }
            return;
        }

        // ใช้ PlannedMinutes จากข้อมูลแผนงาน (เวลาที่หักเวลาพักและ setup แล้ว)
        let plannedProductionTime = 0;
        
        if (this.taskData.PlannedMinutes && this.taskData.PlannedMinutes > 0) {
            // ใช้ PlannedMinutes ที่หักเวลาพักและ setup แล้ว
            plannedProductionTime = this.taskData.PlannedMinutes;
        } else if (this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
            // fallback: คำนวณจากเวลาเริ่มต้นและสิ้นสุดหากไม่มี PlannedMinutes
            const plannedStartTime = new Date(this.taskData.PlannedStartTime);
            const plannedEndTime = new Date(this.taskData.PlannedEndTime);
            
            if (!isNaN(plannedStartTime) && !isNaN(plannedEndTime) && plannedEndTime > plannedStartTime) {
                const diffMs = plannedEndTime - plannedStartTime;
                plannedProductionTime = Math.floor(diffMs / (1000 * 60));
            }
        }
        
        // แสดงผลลัพธ์
        const plannedProductionTimeEl = document.getElementById('plannedProductionTime');
        if (plannedProductionTimeEl) {
            if (plannedProductionTime > 0) {
                plannedProductionTimeEl.value = `${plannedProductionTime} นาที (หักเวลาพัก/setup แล้ว)`;
            } else {
                plannedProductionTimeEl.value = 'ไม่มีข้อมูลเวลาแผนงาน';
            }
        }
        
        console.log('Planned Production Time from PlannedMinutes:', {
            plannedMinutes: this.taskData.PlannedMinutes,
            plannedStartTime: this.taskData.PlannedStartTime,
            plannedEndTime: this.taskData.PlannedEndTime,
            finalPlannedProductionTime: plannedProductionTime,
            note: 'ใช้ PlannedMinutes ที่หักเวลาพักและ setup แล้ว'
        });
    }

    /**
     * แสดงข้อมูลสรุปจาก partial sessions - แก้ไขใหม่
     */
    displayPartialSummary() {
        if (!this.partialSessions || this.partialSessions.length === 0) {
            console.log('ℹ️ No partial sessions to display');
            this.hidePartialHistory();
            // รีเซ็ต summary data
            this.partialSummaryData = {
                totalProduced: 0,
                totalRuntime: 0,
                totalRejects: 0,
                totalRework: 0
            };
            return;
        }

        console.log('📊 Displaying partial sessions:', this.partialSessions);

        // แสดงส่วน Partial History
        const partialHistorySection = document.getElementById('partialHistorySection');
        if (partialHistorySection) {
            partialHistorySection.style.display = 'block';
            console.log('✅ Partial history section is now visible');
        }

        // อัปเดต Summary Badge
        const partialSummaryBadge = document.getElementById('partialSummaryBadge');
        if (partialSummaryBadge) {
            partialSummaryBadge.textContent = `${this.partialSessions.length} sessions`;
        }

        // คำนวณและแสดง Summary Cards (สำคัญ!)
        this.calculateAndDisplaySummaryCards();

        // แสดงรายการ Sessions
        this.displayPartialSessionsCards();
        this.displayPartialSessionsTable();
        
        // อัปเดต Runtime
        this.updateRuntimeFromPartialSessions();
        this.displayActualTimeFromPartialSessions();
        
        // อัปเดต remaining display หลังจากคำนวณ summary เสร็จ
        setTimeout(() => {
            console.log('🔄 Delayed updatePartialDisplay after summary calculation');
            this.updatePartialDisplay();
        }, 100);
    }

    /**
     * ซ่อน Partial History Section
     */
    hidePartialHistory() {
        const partialHistorySection = document.getElementById('partialHistorySection');
        if (partialHistorySection) {
            partialHistorySection.style.display = 'none';
        }
    }

    /**
     * คำนวณและแสดง Summary Cards จากข้อมูล partial sessions - แก้ไขใหม่
     */
    calculateAndDisplaySummaryCards() {
        if (!this.partialSessions || this.partialSessions.length === 0) {
            console.log('ℹ️ No partial sessions to calculate summary');
            // รีเซ็ต partialSummaryData
            this.partialSummaryData = {
                totalProduced: 0,
                totalRuntime: 0,
                totalRejects: 0,
                totalRework: 0
            };
            return;
        }

        let totalProduced = 0;
        let totalRuntime = 0;
        let totalRejects = 0;
        let totalRework = 0;

        console.log('📊 Calculating summary from', this.partialSessions.length, 'sessions:');
        
        this.partialSessions.forEach((session, index) => {
            // ใช้ชื่อฟิลด์ที่ถูกต้องตาม API
            const sessionQuantity = parseInt(session.SessionQuantity) || 0;
            const sessionRejects = parseInt(session.SessionRejectQuantity) || 0;
            const sessionRework = parseInt(session.SessionReworkQuantity) || 0;
            
            totalProduced += sessionQuantity;
            totalRejects += sessionRejects;
            totalRework += sessionRework;
            
            console.log(`  Session ${index + 1}: ${sessionQuantity} ผลิต, ${sessionRejects} เสีย, ${sessionRework} Rework`);
            
            // คำนวณ runtime จากข้อมูล WorkingMinutes หรือจากช่วงเวลา
            if (session.WorkingMinutes) {
                totalRuntime += parseInt(session.WorkingMinutes);
            } else if (session.ActualStartDateTime && session.ActualEndDateTime) {
                const start = new Date(session.ActualStartDateTime);
                const end = new Date(session.ActualEndDateTime);
                const runtimeMinutes = Math.floor((end - start) / (1000 * 60));
                totalRuntime += runtimeMinutes;
            }
        });

        console.log('📊 Summary calculated:', { totalProduced, totalRuntime, totalRejects, totalRework });

        // อัปเดต Summary Cards ใน UI
        const summaryProduced = document.getElementById('summaryProduced');
        const summaryRuntime = document.getElementById('summaryRuntime');
        const summaryRejects = document.getElementById('summaryRejects');
        const summaryRework = document.getElementById('summaryRework');

        if (summaryProduced) summaryProduced.textContent = totalProduced.toLocaleString();
        if (summaryRuntime) summaryRuntime.textContent = totalRuntime.toLocaleString();
        if (summaryRejects) summaryRejects.textContent = totalRejects.toLocaleString();
        if (summaryRework) summaryRework.textContent = totalRework.toLocaleString();

        // เก็บข้อมูลสำหรับใช้ในฟังก์ชันอื่น
        this.partialSummaryData = {
            totalProduced,
            totalRuntime,
            totalRejects,
            totalRework
        };
        
        console.log('✅ PartialSummaryData stored for remaining calculation:', this.partialSummaryData);
    }

    /**
     * คำนวณ Runtime จากเวลาทำงานจริง (actualStartDate/Time ถึง actualEndDate/Time)
     * และแสดงเวลาจาก partial sessions แยกต่างหาก
     */
    updateRuntimeFromPartialSessions() {
        // คำนวณเวลาทำงานจริงจาก actualStartDate/Time ถึง actualEndDate/Time
        const actualRuntime = this.calculateActualWorkingTime();
        
        if (actualRuntime > 0) {
            // Auto-fill ลงในช่อง operatingTime
            const operatingTimeEl = document.getElementById('operatingTime');
            if (operatingTimeEl) {
                operatingTimeEl.value = `${actualRuntime} นาที`;
                console.log('✅ Auto-filled operatingTime with actual working time:', actualRuntime, 'minutes');
            }
        }

        // คำนวณเวลาจาก partial sessions สำหรับแสดงในช่องแยกต่างหาก
        if (!this.partialSessions || this.partialSessions.length === 0) {
            console.log('⚠️ No partial sessions found');
            return;
        }

        let totalNetRuntime = 0; // เวลาสุทธิรวม (หัก break, downtime แล้ว)
        let sessionCount = 0;

        console.log('🔄 Calculating NET runtime from', this.partialSessions.length, 'partial sessions...');

        this.partialSessions.forEach((session, index) => {
            let sessionNetRuntime = 0;
            
            // ลำดับความสำคัญ: WorkingMinutes (เวลาสุทธิ) -> NetOperatingTime -> คำนวณจาก DateTime
            if (session.WorkingMinutes && parseInt(session.WorkingMinutes) > 0) {
                sessionNetRuntime = parseInt(session.WorkingMinutes);
                console.log(`📊 Session ${index + 1}: Using WorkingMinutes (NET) = ${sessionNetRuntime} minutes`);
            } else if (session.NetOperatingTime && parseInt(session.NetOperatingTime) > 0) {
                sessionNetRuntime = parseInt(session.NetOperatingTime);
                console.log(`📊 Session ${index + 1}: Using NetOperatingTime (NET) = ${sessionNetRuntime} minutes`);
            } else if (session.ActualStartDateTime && session.ActualEndDateTime) {
                // คำนวณจากเวลา แล้วหักเบรกและ downtime (ถ้ามีข้อมูล)
                const start = new Date(session.ActualStartDateTime);
                const end = new Date(session.ActualEndDateTime);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    let grossTime = Math.floor((end - start) / (1000 * 60));
                    
                    // หักเบรกและ downtime ถ้ามีข้อมูล
                    const breakTime = (session.BreakMorningMinutes || 0) + 
                                     (session.BreakLunchMinutes || 0) + 
                                     (session.BreakEveningMinutes || 0);
                    const downtime = session.DowntimeMinutes || 0;
                    
                    sessionNetRuntime = Math.max(0, grossTime - breakTime - downtime);
                    console.log(`📊 Session ${index + 1}: Calculated NET from DateTime = ${sessionNetRuntime} minutes (${grossTime} - ${breakTime + downtime})`);
                }
            }
            
            if (sessionNetRuntime > 0) {
                totalNetRuntime += sessionNetRuntime;
                sessionCount++;
            } else {
                console.warn(`⚠️ Session ${index + 1}: No valid NET runtime data found`);
            }
        });

        console.log(`📊 Total NET runtime from sessions: ${totalNetRuntime} minutes from ${sessionCount}/${this.partialSessions.length} sessions`);

        // เก็บข้อมูลไว้สำหรับการรวมกับการกรอก confirm
        this.partialRuntimeMinutes = totalNetRuntime;
        
        // แสดงผลในช่องแสดงนาทีจาก partial sessions
        this.displayPartialRuntimeSummary(totalNetRuntime, sessionCount);
        
        return actualRuntime; // คืนค่าเวลาทำงานจริง
    }

    /**
     * คำนวณเวลาทำงานจริงจาก actualStartDate/Time ถึง actualEndDate/Time - แก้ไขใหม่
     */
    calculateActualWorkingTime() {
        try {
            // ดึงวันที่จาก hybrid date picker
            const startDate = getConfirmDateValue('actualStartDate'); // ISO format
            const endDate = getConfirmDateValue('actualEndDate');
            
            // ดึงเวลาจาก dropdown
            const startTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
            const endTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
            
            if (!startDate || !endDate || !startTime || !endTime) {
                console.log('⚠️ Actual start/end date/time not complete');
                return 0;
            }

            // สร้าง DateTime objects
            const startDateTime = new Date(`${startDate}T${startTime}:00`);
            const endDateTime = new Date(`${endDate}T${endTime}:00`);

            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                console.error('❌ Invalid date/time values');
                return 0;
            }

            if (endDateTime <= startDateTime) {
                console.error('❌ End time must be after start time');
                return 0;
            }

            // คำนวณเวลาทำงานรวม (นาที)
            const grossMinutes = Math.floor((endDateTime - startDateTime) / (1000 * 60));
            
            // หักเวลาพัก
            let breakMinutes = 0;
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
                breakMinutes += breakTimes[checkbox.value] || 0;
            });
            
            // หัก downtime
            const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');
            
            // คำนวณเวลาทำงานสุทธิ
            const netWorkingTime = Math.max(0, grossMinutes - breakMinutes - downtimeMinutes);
            
            console.log(`📊 calculateActualWorkingTime result:`, {
                startDateTime: startDateTime.toLocaleString('th-TH'),
                endDateTime: endDateTime.toLocaleString('th-TH'),
                grossMinutes: grossMinutes,
                breakMinutes: breakMinutes,
                downtimeMinutes: downtimeMinutes,
                netWorkingTime: netWorkingTime,
                formula: `${grossMinutes} - ${breakMinutes} - ${downtimeMinutes} = ${netWorkingTime}`
            });

            return netWorkingTime;
            
        } catch (error) {
            console.error('Error calculating actual working time:', error);
            return 0;
        }
    }

    /**
     * อัปเดต Runtime จากเวลาทำงานจริง
     */
    updateRuntimeFromActualTime() {
        const actualRuntime = this.calculateActualWorkingTime();
        
        if (actualRuntime > 0) {
            const operatingTimeEl = document.getElementById('operatingTime');
            if (operatingTimeEl) {
                operatingTimeEl.value = `${actualRuntime} นาที`;
                console.log('✅ Updated operatingTime with actual working time:', actualRuntime, 'minutes');
                
                // อัปเดตช่อง Total Runtime ด้วย
                this.updateTotalRuntimeForOEEDisplay();
            }
        }
    }

    /**
     * รวมเวลาจาก partial sessions กับเวลาที่กรอกใน confirm - แก้ไขใหม่
     */
    calculateTotalRuntimeForOEE() {
        let partialRuntime = this.partialRuntimeMinutes || 0;
        let confirmRuntime = 0;
        
        // ดึงเวลาจาก operatingTime field
        const operatingTimeEl = document.getElementById('operatingTime');
        if (operatingTimeEl && operatingTimeEl.value) {
            // แยกตัวเลขออกจาก string (กรณีมี "นาที" ต่อท้าย)
            const matches = operatingTimeEl.value.match(/(\d+)/);
            if (matches) {
                confirmRuntime = parseInt(matches[1]);
            }
        } else {
            // ถ้าไม่มีค่าใน operatingTime ให้คำนวณจากเวลาจริง
            confirmRuntime = this.calculateActualWorkingTime();
            console.log('📊 Calculated runtime from actual time:', confirmRuntime);
        }
        
        const totalRuntime = partialRuntime + confirmRuntime;
        
        console.log('📊 calculateTotalRuntimeForOEE result:', {
            partialRuntime: partialRuntime,
            confirmRuntime: confirmRuntime,
            totalRuntime: totalRuntime,
            note: 'รวมเวลาจาก partial sessions + confirm input (updated for downtime)'
        });
        
        return {
            partialRuntime,
            confirmRuntime,
            totalRuntime
        };
    }

    /**
     * อัปเดตการแสดงผลใน Total Runtime for OEE Card - แก้ไขใหม่
     */
    updateTotalRuntimeForOEEDisplay() {
        const totalRuntimeCard = document.getElementById('totalRuntimeForOEECard');
        if (!totalRuntimeCard) {
            console.log('⚠️ totalRuntimeForOEECard not found - skipping update');
            return;
        }

        // คำนวณค่าใหม่โดยใช้ calculateTotalRuntimeForOEE()
        const runtimeData = this.calculateTotalRuntimeForOEE();
        const partialRuntime = runtimeData.partialRuntime;
        const operatingTimeMinutes = runtimeData.confirmRuntime;
        const totalRuntime = runtimeData.totalRuntime;

        console.log('🔄 updateTotalRuntimeForOEEDisplay called with data:', {
            partialRuntime,
            operatingTimeMinutes,
            totalRuntime,
            source: 'calculateTotalRuntimeForOEE()'
        });

        // อัปเดตค่าในการ์ด
        const operatingTimeValue = document.getElementById('operatingTimeValue');
        const totalRuntimeValue = document.getElementById('totalRuntimeValue');

        if (operatingTimeValue) {
            operatingTimeValue.textContent = `${operatingTimeMinutes.toLocaleString()} นาที`;
            console.log('✅ operatingTimeValue updated:', operatingTimeMinutes);
        }

        if (totalRuntimeValue) {
            totalRuntimeValue.textContent = `${totalRuntime.toLocaleString()} นาที`;
            
            // อัปเดตชั่วโมงด้วย
            const hoursSpan = totalRuntimeValue.parentElement.parentElement.querySelector('.text-muted');
            if (hoursSpan) {
                hoursSpan.textContent = `(${Math.round(totalRuntime / 60 * 100) / 100} ชั่วโมง)`;
            }
            console.log('✅ totalRuntimeValue updated:', totalRuntime);
        }

        console.log('✅ Total Runtime for OEE display updated successfully:', {
            operatingTime: operatingTimeMinutes,
            partialRuntime: partialRuntime,
            totalRuntime: totalRuntime,
            hours: Math.round(totalRuntime / 60 * 100) / 100
        });
    }

    /**
     * แสดงช่องสรุปเวลาทำงานจาก partial sessions แยกต่างหาก
     */
    displayPartialRuntimeSummary(totalNetRuntime, sessionCount) {
        // หาตำแหน่งที่จะแทรกช่องแสดงผล (หลังจาก operatingTime card)
        const operatingTimeCard = document.getElementById('operatingTime')?.closest('.card');
        
        if (!operatingTimeCard) {
            console.error('❌ Cannot find operatingTime card to insert partial runtime summary');
            return;
        }

        // ลบช่องเก่าถ้ามี
        const existingSummary = document.getElementById('partialRuntimeSummaryCard');
        if (existingSummary) {
            existingSummary.remove();
        }

        // สร้างช่องแสดงผลใหม่
        const runtimeSummaryHtml = `
            <div class="col-md-6" id="partialRuntimeSummaryCard">
                <div class="card border-info border-2">
                    <div class="card-body text-center">
                        <label class="form-label fw-bold text-info">
                            <i class="bi bi-clock me-1"></i>เวลาจาการ Partial Sessions
                            <span class="tooltip-help" 
                                data-tooltip="<span class='tooltip-formula'>เวลารวมทั้งหมดจาก ${sessionCount} Sessions</span>">
                                <i class="bi bi-info-circle text-info"></i>
                            </span>
                        </label>
                        <p class="small text-muted mb-2">จำนวนนาทีจาก Sessions</p>
                        <div class=" bg-opacity-15 p-3 rounded">
                            <h4 class="mb-1 fw-bold" id="partialNetRuntimeDisplay">
                                ${totalNetRuntime.toLocaleString()} นาที
                            </h4>
                            <small class="text-muted d-block">
                                (${Math.round(totalNetRuntime / 60 * 100) / 100} ชั่วโมง)
                            </small>
                            <div class="mt-2">
                                <span class="badge bg-info">
                                    <i class="bi bi-check-circle me-1"></i>
                                    ${sessionCount} Sessions
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // แทรกหลังจาก operatingTime card
        const parentRow = operatingTimeCard.closest('.row');
        if (parentRow) {
            const operatingTimeCol = operatingTimeCard.closest('.col-md-6');
            if (operatingTimeCol) {
                operatingTimeCol.insertAdjacentHTML('afterend', runtimeSummaryHtml);
                console.log('✅ Partial runtime summary card inserted');
                
                // เพิ่ม event listener สำหรับการเปลี่ยนแปลงใน operatingTime
                this.setupRuntimeSummaryListeners();
            }
        }

        // เพิ่ม tooltip functionality ถ้ายังไม่มี
        setTimeout(() => {
            const tooltipEl = document.querySelector('#partialRuntimeSummaryCard [data-tooltip]');
            if (tooltipEl && !tooltipEl.querySelector('.tooltip-content')) {
                const tooltipText = tooltipEl.getAttribute('data-tooltip');
                const tooltipContent = document.createElement('div');
                tooltipContent.className = 'tooltip-content';
                tooltipContent.innerHTML = tooltipText;
                tooltipEl.appendChild(tooltipContent);
            }
        }, 100);

        console.log('✅ Partial runtime summary displayed:', {
            totalNetRuntime: totalNetRuntime,
            sessionCount: sessionCount,
            hours: Math.round(totalNetRuntime / 60 * 100) / 100,
            note: 'แสดงเฉพาะ sessions'
        });

        // แสดงช่อง Total Runtime (สำหรับคำนวณ OEE)
        this.displayTotalRuntimeForOEE(totalNetRuntime);
    }

    /**
     * แสดงช่อง Total Runtime (operatingTime + sessions) สำหรับคำนวณ OEE
     */
    displayTotalRuntimeForOEE(partialRuntime) {
        // หาตำแหน่งที่จะแทรก (หลังจาก partialRuntimeSummaryCard)
        const partialCard = document.getElementById('partialRuntimeSummaryCard');
        
        if (!partialCard) {
            console.error('❌ Cannot find partialRuntimeSummaryCard to insert total runtime');
            return;
        }

        // ลบช่องเก่าถ้ามี
        const existingCard = document.getElementById('totalRuntimeForOEECard');
        if (existingCard) {
            existingCard.remove();
        }

        // คำนวณ operatingTime
        const operatingTimeEl = document.getElementById('operatingTime');
        let operatingTimeMinutes = 0;
        if (operatingTimeEl && operatingTimeEl.value) {
            const matches = operatingTimeEl.value.match(/(\d+)/);
            if (matches) {
                operatingTimeMinutes = parseInt(matches[1]);
            }
        }

        const totalRuntime = operatingTimeMinutes + partialRuntime;

        // สร้างช่อง Total Runtime
        const totalRuntimeHtml = `
            <div class="col-md-6" id="totalRuntimeForOEECard">
                <div class="card border-warning border-2">
                    <div class="card-body text-center">
                        <label class="form-label fw-bold text-warning">
                            <i class="bi bi-calculator me-1"></i>Total Runtime
                            <span class="tooltip-help" 
                                data-tooltip="<span class='tooltip-formula'>Total = Runtime + Sessions</span><br>ใช้สำหรับการคำนวณ OEE หลัก">
                                <i class="bi bi-info-circle text-warning"></i>
                            </span>
                        </label>
                        <p class="small text-muted mb-2">เวลาการผลิตจริง</p>
                        <div class="p-3 rounded">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Runtime:</small>
                                <span class="fw-bold" id="operatingTimeValue">${operatingTimeMinutes.toLocaleString()} นาที</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Sessions:</small>
                                <span class="fw-bold">+ ${partialRuntime.toLocaleString()} นาที</span>
                            </div>
                            <hr class="my-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong class="text-warning ">Total:</strong>
                                <h4 class="text-warning mb-0 fw-bold" id="totalRuntimeValue">${totalRuntime.toLocaleString()} นาที</h4>
                            </div>
                            <small class="text-muted d-block mt-1">
                                (${Math.round(totalRuntime / 60 * 100) / 100} ชั่วโมง)
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // แทรกหลังจาก partial runtime summary card
        partialCard.insertAdjacentHTML('afterend', totalRuntimeHtml);

        // เพิ่ม tooltip functionality
        setTimeout(() => {
            const tooltipEl = document.querySelector('#totalRuntimeForOEECard [data-tooltip]');
            if (tooltipEl && !tooltipEl.querySelector('.tooltip-content')) {
                const tooltipText = tooltipEl.getAttribute('data-tooltip');
                const tooltipContent = document.createElement('div');
                tooltipContent.className = 'tooltip-content';
                tooltipContent.innerHTML = tooltipText;
                tooltipEl.appendChild(tooltipContent);
            }
        }, 100);

        console.log('✅ Total Runtime for OEE displayed:', {
            operatingTime: operatingTimeMinutes,
            partialRuntime: partialRuntime,
            totalRuntime: totalRuntime
        });
    }

    /**
     * แสดงช่องเวลารวมจาก actualStartDate, actualEndDate และรวมกับ session
     */
    displayTotalActualTimeCard(partialSessionRuntime) {
        // คำนวณเวลาจาก actualStartDate และ actualEndDate
        const actualStartDateEl = document.getElementById('actualStartDate');
        const actualEndDateEl = document.getElementById('actualEndDate');
        
        if (!actualStartDateEl || !actualEndDateEl) {
            console.log('❌ actualStartDate หรือ actualEndDate element ไม่พบ');
            return;
        }

        const startDate = actualStartDateEl.value;
        const endDate = actualEndDateEl.value;
        
        if (!startDate || !endDate) {
            console.log('⚠️ actualStartDate หรือ actualEndDate ยังไม่ได้กรอก');
            return;
        }

        // คำนวณระยะเวลาจาก actualStart ถึง actualEnd
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);
        const totalMinutesFromActual = Math.floor((endDateTime - startDateTime) / (1000 * 60));

        if (totalMinutesFromActual <= 0) {
            console.log('⚠️ เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
            return;
        }

        // รวมกับเวลาจาก partial sessions
        const grandTotalMinutes = totalMinutesFromActual + partialSessionRuntime;

        // หาตำแหน่งที่จะแทรก (หลังจาก partial runtime summary card)
        const partialCard = document.getElementById('partialRuntimeSummaryCard');
        
        if (!partialCard) {
            console.error('❌ Cannot find partialRuntimeSummaryCard to insert total actual time');
            return;
        }

        // ลบช่องเก่าถ้ามี
        const existingCard = document.getElementById('totalActualTimeCard');
        if (existingCard) {
            existingCard.remove();
        }

        // สร้างช่องแสดงเวลารวม
        const totalActualTimeHtml = `
            <div class="col-md-6" id="totalActualTimeCard">
                <div class="card border-primary border-2">
                    <div class="card-body text-center">
                        <label class="form-label fw-bold text-primary">
                            <i class="bi bi-clock-history me-1"></i>เวลาทำงานรวม
                            <span class="tooltip-help" 
                                data-tooltip="<span class='tooltip-formula'>เวลาจาก Actual Start-End + Partial Sessions</span><br>รวมเวลาทำงานจริงทั้งหมด<br><span class='tooltip-example'>สำหรับตรวจสอบเปรียบเทียบ</span>">
                                <i class="bi bi-info-circle text-primary"></i>
                            </span>
                        </label>
                        <p class="small text-muted mb-2">เวลาจาก Actual Start-End + Sessions</p>
                        <div class="bg-primary bg-opacity-15 p-3 rounded">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Actual Start-End:</small>
                                <span class="fw-bold text-primary">${totalMinutesFromActual.toLocaleString()} นาที</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">Partial Sessions:</small>
                                <span class="fw-bold text-success">+ ${partialSessionRuntime.toLocaleString()} นาที</span>
                            </div>
                            <hr class="my-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong class="text-primary">รวมทั้งหมด:</strong>
                                <h4 class="text-primary mb-0 fw-bold">${grandTotalMinutes.toLocaleString()} นาที</h4>
                            </div>
                            <small class="text-muted d-block mt-1">
                                (${Math.round(grandTotalMinutes / 60 * 100) / 100} ชั่วโมง)
                            </small>
                        </div>
                        <div class="mt-2">
                            <span class="badge bg-primary">
                                <i class="bi bi-calculator me-1"></i>
                                Total Actual Time
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // แทรกหลังจาก partial runtime summary card
        partialCard.insertAdjacentHTML('afterend', totalActualTimeHtml);

        // เพิ่ม tooltip functionality
        setTimeout(() => {
            const tooltipEl = document.querySelector('#totalActualTimeCard [data-tooltip]');
            if (tooltipEl && !tooltipEl.querySelector('.tooltip-content')) {
                const tooltipText = tooltipEl.getAttribute('data-tooltip');
                const tooltipContent = document.createElement('div');
                tooltipContent.className = 'tooltip-content';
                tooltipContent.innerHTML = tooltipText;
                tooltipEl.appendChild(tooltipContent);
            }
        }, 100);

        console.log('✅ Total actual time card displayed:', {
            actualStartEnd: totalMinutesFromActual,
            partialSessions: partialSessionRuntime,
            grandTotal: grandTotalMinutes,
            hours: Math.round(grandTotalMinutes / 60 * 100) / 100
        });
    }

    /**
     * ตั้งค่า listener สำหรับอัพเดตการแสดงผลเมื่อมีการเปลี่ยนแปลง operatingTime
     */
    setupRuntimeSummaryListeners() {
        const operatingTimeEl = document.getElementById('operatingTime');
        if (!operatingTimeEl) return;

        // ป้องกันการ attach listener ซ้ำ
        if (operatingTimeEl.hasAttribute('data-runtime-listener')) return;
        operatingTimeEl.setAttribute('data-runtime-listener', 'true');

        operatingTimeEl.addEventListener('input', () => {
            this.updateRuntimeTotalDisplay();
            this.updateTotalRuntimeForOEEDisplay(); // อัปเดตช่อง Total Runtime
        });

        operatingTimeEl.addEventListener('change', () => {
            this.updateRuntimeTotalDisplay();
            this.updateTotalRuntimeForOEEDisplay(); // อัปเดตช่อง Total Runtime
        });

        // เพิ่ม listeners สำหรับ actualStartDate และ actualEndDate
        const actualStartDateEl = document.getElementById('actualStartDate');
        const actualEndDateEl = document.getElementById('actualEndDate');

        if (actualStartDateEl && !actualStartDateEl.hasAttribute('data-actual-listener')) {
            actualStartDateEl.setAttribute('data-actual-listener', 'true');
            actualStartDateEl.addEventListener('change', () => {
                this.updateTotalActualTimeDisplay();
            });
        }

        if (actualEndDateEl && !actualEndDateEl.hasAttribute('data-actual-listener')) {
            actualEndDateEl.setAttribute('data-actual-listener', 'true');
            actualEndDateEl.addEventListener('change', () => {
                this.updateTotalActualTimeDisplay();
            });
        }

        console.log('✅ Runtime summary listeners setup completed');
    }

    /**
     * อัพเดตการแสดงผลเวลารวม
     */
    updateRuntimeTotalDisplay() {
        const runtimeData = this.calculateTotalRuntimeForOEE();
        
        // อัพเดตข้อความใน partial runtime card
        const totalDisplay = document.getElementById('totalRuntimeDisplay');
        if (totalDisplay) {
            if (runtimeData.confirmRuntime > 0) {
                totalDisplay.innerHTML = `
                    <small class="text-success fw-bold">
                        <i class="bi bi-calculator me-1"></i>
                        เวลารวม = ${runtimeData.confirmRuntime} + ${runtimeData.partialRuntime} = <span class="badge bg-success">${runtimeData.totalRuntime} นาที</span>
                    </small>
                `;
            } else {
                totalDisplay.innerHTML = `
                    <small class="text-success fw-bold">
                        <i class="bi bi-calculator me-1"></i>
                        เวลารวม = Runtime + ${runtimeData.partialRuntime} นาที
                    </small>
                `;
            }
        }

        console.log('✅ Runtime total display updated:', runtimeData);
    }

    /**
     * อัปเดตการแสดงผลเวลารวมจาก actualStartDate และ actualEndDate
     */
    updateTotalActualTimeDisplay() {
        // หาเวลาจาก partial sessions
        let partialSessionRuntime = 0;
        if (this.partialSessions && this.partialSessions.length > 0) {
            this.partialSessions.forEach(session => {
                const netRuntime = session.WorkingMinutes || session.NetOperatingTime || 0;
                partialSessionRuntime += parseInt(netRuntime) || 0;
            });
        }

        // เรียก displayTotalActualTimeCard เพื่ออัปเดตการแสดงผล
        this.displayTotalActualTimeCard(partialSessionRuntime);

        console.log('✅ Total actual time display updated');
    }

    /**
     * อัปเดตการแสดงผลใน Total Runtime for OEE Card
     */
    updateTotalRuntimeForOEEDisplay() {
        const totalRuntimeCard = document.getElementById('totalRuntimeForOEECard');
        if (!totalRuntimeCard) return;

        // คำนวณค่าใหม่
        const partialRuntime = this.partialRuntimeMinutes || 0;
        const operatingTimeEl = document.getElementById('operatingTime');
        let operatingTimeMinutes = 0;
        
        if (operatingTimeEl && operatingTimeEl.value) {
            const matches = operatingTimeEl.value.match(/(\d+)/);
            if (matches) {
                operatingTimeMinutes = parseInt(matches[1]);
            }
        }

        const totalRuntime = operatingTimeMinutes + partialRuntime;

        // อัปเดตค่าในการ์ด
        const operatingTimeValue = document.getElementById('operatingTimeValue');
        const totalRuntimeValue = document.getElementById('totalRuntimeValue');

        if (operatingTimeValue) {
            operatingTimeValue.textContent = `${operatingTimeMinutes.toLocaleString()} นาที`;
        }

        if (totalRuntimeValue) {
            totalRuntimeValue.textContent = `${totalRuntime.toLocaleString()} นาที`;
            
            // อัปเดตชั่วโมงด้วย
            const hoursSpan = totalRuntimeValue.parentElement.parentElement.querySelector('.text-muted');
            if (hoursSpan) {
                hoursSpan.textContent = `(${Math.round(totalRuntime / 60 * 100) / 100} ชั่วโมง)`;
            }
        }

        console.log('✅ Total Runtime for OEE display updated:', {
            operatingTime: operatingTimeMinutes,
            partialRuntime: partialRuntime,
            totalRuntime: totalRuntime
        });
    }

    /**
     * แสดงรายการ Sessions แบบ Cards
     */
    displayPartialSessionsCards() {
        const sessionsList = document.getElementById('partialSessionsList');
        if (!sessionsList) return;

        sessionsList.innerHTML = '';

        // แสดงแค่ 4 sessions แรก
        const sessionsToShow = this.partialSessions.slice(0, 4);
        
        sessionsToShow.forEach((session, index) => {
            const startTime = session.ActualStartDateTime ? 
                new Date(session.ActualStartDateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 
                '-';
            const endTime = session.ActualEndDateTime ? 
                new Date(session.ActualEndDateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 
                '-';

            let runtime = 0;
            if (session.WorkingMinutes) {
                runtime = parseInt(session.WorkingMinutes);
            } else if (session.ActualStartDateTime && session.ActualEndDateTime) {
                const start = new Date(session.ActualStartDateTime);
                const end = new Date(session.ActualEndDateTime);
                runtime = Math.floor((end - start) / (1000 * 60));
            }

            const cardHtml = `
                <div class="col-md-6 mb-2">
                    <div class="card border-0 shadow-sm h-100 session-card">
                        <div class="card-body p-2">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="card-title mb-0 text-info">
                                    <i class="bi bi-clock me-1"></i>Session ${index + 1}
                                </h6>
                                <span class="badge bg-light text-dark">${startTime} - ${endTime}</span>
                            </div>
                            <div class="row g-1 text-center">
                                <div class="col-3">
                                    <div class="text-success fw-bold">${session.SessionQuantity || 0}</div>
                                    <small class="text-muted">ผลิต</small>
                                </div>
                                <div class="col-3">
                                    <div class="text-danger fw-bold">${session.SessionRejectQuantity || 0}</div>
                                    <small class="text-muted">เสีย</small>
                                </div>
                                <div class="col-3">
                                    <div class="text-warning fw-bold">${session.SessionReworkQuantity || 0}</div>
                                    <small class="text-muted">Rework</small>
                                </div>
                                <div class="col-3">
                                    <div class="text-primary fw-bold">${runtime}</div>
                                    <small class="text-muted">นาที</small>
                                </div>
                            </div>
                            ${session.Remark ? `<div class="mt-2"><small class="text-muted">${session.Remark}</small></div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            sessionsList.innerHTML += cardHtml;
        });

        // แสดงข้อความถ้ามี sessions เยอะ
        if (this.partialSessions.length > 4) {
            const moreCard = `
                <div class="col-12">
                    <div class="text-center text-muted">
                        <small>และอีก ${this.partialSessions.length - 4} sessions (ดูรายละเอียดทั้งหมดด้านล่าง)</small>
                    </div>
                </div>
            `;
            sessionsList.innerHTML += moreCard;
        }
    }

    /**
     * แสดงรายการ Sessions แบบ Table
     */
    displayPartialSessionsTable() {
        const tableBody = document.getElementById('partialSessionsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        this.partialSessions.forEach((session, index) => {
            const startDateTime = session.ActualStartDateTime ? new Date(session.ActualStartDateTime) : null;
            const endDateTime = session.ActualEndDateTime ? new Date(session.ActualEndDateTime) : null;
            
            let timeRange = '-';
            if (startDateTime && endDateTime) {
                timeRange = `${startDateTime.toLocaleDateString('th-TH')} ${startDateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endDateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
            }

            let runtime = 0;
            if (session.WorkingMinutes) {
                runtime = parseInt(session.WorkingMinutes);
            } else if (startDateTime && endDateTime) {
                runtime = Math.floor((endDateTime - startDateTime) / (1000 * 60));
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="badge bg-info">S${index + 1}</span></td>
                <td><small>${timeRange}</small></td>
                <td><span class="badge bg-success">${session.SessionQuantity || 0}</span></td>
                <td><span class="badge bg-danger">${session.SessionRejectQuantity || 0}</span></td>
                <td><span class="badge bg-warning">${session.SessionReworkQuantity || 0}</span></td>
                <td><span class="badge bg-primary">${runtime} น.</span></td>
                <td><small class="text-muted">${session.Remark ? session.Remark.substring(0, 30) + (session.Remark.length > 30 ? '...' : '') : '-'}</small></td>
            `;
            tableBody.appendChild(row);
        });
    }

    /**
     * แสดงข้อมูลเวลาจาก partial sessions ในหน้า confirm
     */
    displayActualTimeFromPartialSessions() {
        if (!this.partialSessions || this.partialSessions.length === 0) {
            return;
        }

        // เรียงลำดับ sessions ตามเวลา
        const sortedSessions = [...this.partialSessions].sort((a, b) => 
            new Date(a.ActualStartDateTime) - new Date(b.ActualStartDateTime)
        );

        const firstSession = sortedSessions[0];
        const lastSession = sortedSessions[sortedSessions.length - 1];

        const actualStartTime = new Date(firstSession.ActualStartDateTime);
        const actualEndTime = new Date(lastSession.ActualEndDateTime);
        const totalMinutes = Math.floor((actualEndTime - actualStartTime) / (1000 * 60));

        // คำนวณเวลาสุทธิรวมจากทุก sessions
        let totalNetRuntime = 0;
        this.partialSessions.forEach(session => {
            if (session.WorkingMinutes && parseInt(session.WorkingMinutes) > 0) {
                totalNetRuntime += parseInt(session.WorkingMinutes);
            } else if (session.NetOperatingTime && parseInt(session.NetOperatingTime) > 0) {
                totalNetRuntime += parseInt(session.NetOperatingTime);
            }
        });

        // แสดงข้อมูลในส่วน partial history
        let timeInfoEl = document.getElementById('partialTimeInfo');
        if (!timeInfoEl) {
            // สร้าง element ใหม่
            const timeInfoHtml = `
                <div id="partialTimeInfo" class="alert alert-info border-0 shadow-sm mb-3">
                    <div class="d-flex align-items-center mb-2">
                        <i class="bi bi-clock-history me-2 fs-5"></i>
                        <h6 class="mb-0 fw-bold">ข้อมูลเวลาจาก Partial Sessions</h6>
                        <span class="badge bg-info ms-auto">Reference Data</span>
                    </div>
                    
                    <!-- ช่วงเวลาการผลิต -->
                    <div class="row g-2 mb-3">
                        <div class="col-md-4">
                            <div class="text-center p-2 bg-white rounded">
                                <small class="text-muted d-block">เริ่มต้นครั้งแรก (S1)</small>
                                <strong class="text-primary" id="actualStartFromPartial">
                                    ${actualStartTime.toLocaleString('th-TH')}
                                </strong>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center p-2 bg-white rounded">
                                <small class="text-muted d-block">สิ้นสุดสุดท้าย (S${this.partialSessions.length})</small>
                                <strong class="text-primary" id="actualEndFromPartial">
                                    ${actualEndTime.toLocaleString('th-TH')}
                                </strong>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center p-2 bg-white rounded">
                                <small class="text-muted d-block">ระยะเวลารวม</small>
                                <strong class="text-warning" id="totalMinutesFromPartial">
                                    ${totalMinutes} นาที
                                </strong>
                            </div>
                        </div>
                    </div>

                    <!-- เวลาสุทธิ -->
                    <div class="bg-success bg-opacity-10 p-2 rounded mb-3">
                        <div class="text-center">
                            <small class="text-muted d-block">เวลาทำงานสุทธิรวม (หักเบรก + downtime แล้ว)</small>
                            <h5 class="text-success mb-0 fw-bold" id="totalNetRuntimeFromPartial">
                                ${totalNetRuntime} นาที (${Math.round(totalNetRuntime / 60 * 100) / 100} ชม.)
                            </h5>
                        </div>
                    </div>
                    
                    <!-- รายละเอียดแต่ละ session -->
                    <div class="bg-light p-2 rounded">
                        <small class="text-muted d-block mb-2">
                            <strong>รายละเอียดแต่ละ Session:</strong>
                        </small>
                        <div class="row g-1" id="sessionTimeDetails">
                            ${this.generateSessionTimeDetails()}
                        </div>
                    </div>
                    
                    <div class="mt-3 p-2 bg-warning bg-opacity-10 rounded">
                        <small class="text-dark">
                            <i class="bi bi-info-circle me-1"></i>
                            <strong>คำแนะนำ:</strong> ข้อมูลนี้เป็นการอ้างอิงจาก partial sessions 
                            กรุณากรอกเวลาจริงที่ใช้ในการผลิตในช่องด้านบน
                        </small>
                    </div>
                    
                    <div class="mt-2 text-center">
                        <span class="badge bg-info">
                            <i class="bi bi-list-ol me-1"></i>
                            รวม ${this.partialSessions.length} sessions
                        </span>
                        <span class="badge bg-success ms-2">
                            <i class="bi bi-clock me-1"></i>
                            ${totalNetRuntime} นาทีสุทธิ
                        </span>
                    </div>
                </div>
            `;
            
            const partialHistorySection = document.getElementById('partialHistorySection');
            if (partialHistorySection) {
                partialHistorySection.insertAdjacentHTML('afterbegin', timeInfoHtml);
            }
        } else {
            // อัปเดต element ที่มีอยู่
            document.getElementById('actualStartFromPartial').textContent = actualStartTime.toLocaleString('th-TH');
            document.getElementById('actualEndFromPartial').textContent = actualEndTime.toLocaleString('th-TH');
            document.getElementById('totalMinutesFromPartial').textContent = `${totalMinutes} นาที`;
            document.getElementById('totalNetRuntimeFromPartial').textContent = `${totalNetRuntime} นาที (${Math.round(totalNetRuntime / 60 * 100) / 100} ชม.)`;
            
            const sessionTimeDetails = document.getElementById('sessionTimeDetails');
            if (sessionTimeDetails) {
                sessionTimeDetails.innerHTML = this.generateSessionTimeDetails();
            }
        }

        console.log('✅ Partial sessions time reference displayed:', {
            firstSession: firstSession.SessionNumber,
            lastSession: lastSession.SessionNumber,
            grossTime: totalMinutes,
            netTime: totalNetRuntime,
            totalSessions: this.partialSessions.length
        });
    }

    /**
     * สร้างรายละเอียดเวลาแต่ละ session
     */
    generateSessionTimeDetails() {
        return this.partialSessions.map((session, index) => {
            const startTime = session.ActualStartDateTime ? 
                new Date(session.ActualStartDateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 
                '-';
            const endTime = session.ActualEndDateTime ? 
                new Date(session.ActualEndDateTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 
                '-';
            
            // คำนวณเวลาสุทธิ
            let netWorkingTime = 0;
            if (session.WorkingMinutes && parseInt(session.WorkingMinutes) > 0) {
                netWorkingTime = parseInt(session.WorkingMinutes);
            } else if (session.NetOperatingTime && parseInt(session.NetOperatingTime) > 0) {
                netWorkingTime = parseInt(session.NetOperatingTime);
            } else if (session.ActualStartDateTime && session.ActualEndDateTime) {
                const start = new Date(session.ActualStartDateTime);
                const end = new Date(session.ActualEndDateTime);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    let grossTime = Math.floor((end - start) / (1000 * 60));
                    const breakTime = (session.BreakMorningMinutes || 0) + 
                                     (session.BreakLunchMinutes || 0) + 
                                     (session.BreakEveningMinutes || 0);
                    const downtime = session.DowntimeMinutes || 0;
                    netWorkingTime = Math.max(0, grossTime - breakTime - downtime);
                }
            }
            
            return `
                <div class="col-6 col-md-3">
                    <div class="text-center p-2 bg-white rounded border">
                        <div class="fw-bold text-primary">S${index + 1}</div>
                        <div class="small text-muted">${startTime}-${endTime}</div>
                        <div class="small">
                            <span class="badge bg-success">${netWorkingTime}น.</span>
                        </div>
                        <div class="small">
                            <span class="text-success">${session.SessionQuantity || 0}</span> /
                            <span class="text-danger">${session.SessionRejectQuantity || 0}</span> /
                            <span class="text-warning">${session.SessionReworkQuantity || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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
            
            // ตั้งค่า hybrid date picker สำหรับหน้า confirm
            setupConfirmHiddenDatePickers();
            console.log('✅ Hybrid date pickers setup completed');
            
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
                // แสดงฟอร์มที่ถูกซ่อนไว้
                form.style.display = 'block';
                
                // ป้องกันการ attach event listener ซ้ำ
                if (!form._submitHandlerAttached) {
                    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
                    form._submitHandlerAttached = true;
                    console.log('✅ Form event listener attached (first time)');
                } else {
                    console.log('⚠️ Form event listener already attached, skipping');
                }
                
                console.log('✅ Form displayed');
            } else {
                console.warn('❌ Form element not found');
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
                        // อัปเดต Runtime จากเวลาจริง
                        this.updateRuntimeFromActualTime();
                        // อัปเดต Total Runtime for OEE Card
                        this.updateTotalRuntimeForOEEDisplay();
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
                        // อัปเดต Runtime จากเวลาจริง
                        this.updateRuntimeFromActualTime();
                        // อัปเดต Total Runtime for OEE Card
                        this.updateTotalRuntimeForOEEDisplay();
                    });
                    console.log(`✅ Event listener added for: ${id}`);
                } else {
                    console.warn(`❌ Element ${id} not found`);
                }
            });

        // ตั้งค่า listener สำหรับ checkbox เวลาพัก
        document.querySelectorAll('input[name="breakTime[]"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.calculateBreakTime();
                // อัปเดต Total Runtime for OEE Card เมื่อเปลี่ยนเวลาพัก
                this.updateTotalRuntimeForOEEDisplay();
            });
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
            // อัปเดต Total Runtime for OEE Card
            this.updateTotalRuntimeForOEEDisplay();
        });

        // ตั้งค่า listener สำหรับฟิลด์ตัวเลขที่ส่งผลต่อการคำนวณ
        document.getElementById('overtime')?.addEventListener('input', () => {
            this.calculateTimes();
            // อัปเดต Total Runtime for OEE Card เมื่อเปลี่ยน overtime
            this.updateTotalRuntimeForOEEDisplay();
        });
        
        // ✅ เพิ่ม listener สำหรับ downtime - สำคัญมาก!
        document.getElementById('downtime')?.addEventListener('input', () => {
            console.log('📊 Downtime changed - recalculating times and updating Total Runtime');
            this.calculateTimes();
            // อัปเดต Total Runtime for OEE Card เมื่อเปลี่ยน downtime
            this.updateTotalRuntimeForOEEDisplay();
        });
        document.getElementById('idealRunRate')?.addEventListener('input', () => {
            this.calculatePerformance();
            this.calculateOEE(); // คำนวณ OEE ใหม่เมื่อ idealRunRate เปลี่ยน
        });
        document.getElementById('totalPieces')?.addEventListener('input', () => {
            this.updatePartialCalculation(); // อัปเดต partial calculation ก่อน
            this.updatePartialDisplay(); // อัปเดตการแสดงผล remaining quantity
            this.calculatePerformance();
            this.calculateOEE(); // คำนวณ OEE ใหม่เมื่อ totalPieces เปลี่ยน
        });
        document.getElementById('rejectPieces')?.addEventListener('input', () => this.calculateQuality());
        document.getElementById('reworkPieces')?.addEventListener('input', () => this.calculateQuality());
        document.getElementById('Remark')?.addEventListener('input', () => this.updateRemarkDisplay());

        // ตั้งค่า listener สำหรับ checkbox ความยาวกะ (10 ชั่วโมง)
        document.getElementById('shiftLength8h')?.addEventListener('change', (e) => {
            const shiftMinutesEl = document.getElementById('shiftMinutes');
            if (shiftMinutesEl) {
                shiftMinutesEl.value = e.target.checked ? 600 : 0;
            }
            this.calculateTimes();
        });

        // ตั้งค่า listener สำหรับ Overtime checkbox และ input
        const overtimeEnable = document.getElementById('overtimeEnable');
        const overtimeInput = document.getElementById('overtime');
        
        if (overtimeEnable && overtimeInput) {
            overtimeEnable.addEventListener('change', (e) => {
                overtimeInput.disabled = !e.target.checked;
                if (!e.target.checked) {
                    overtimeInput.value = '';
                }
                this.calculateTimes();
            });
        }

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
            this.updatePlannedProductionTime(); // แสดงเวลาผลิตที่วางแผนจาก PlannedMinutes
            
            // เริ่มต้น partial confirmation system ถ้ายังไม่ได้เริ่ม
            if (this.taskData && this.taskData.TargetOutput && !this.partialData) {
                this.initializePartialConfirmation();
            }
            
            // อัปเดตการแสดงผล remaining quantity
            this.updatePartialDisplay();
            
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
        const startDateValue = getConfirmDateValue('actualStartDate');
        const endDateValue = getConfirmDateValue('actualEndDate');
        
        console.log('📅 Date values:', {
            startDateValue,
            endDateValue
        });
        
        // ดึงเวลาจาก dropdown
        const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
        const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
        
        console.log('⏰ Time values:', {
            actualStartTime,
            actualEndTime
        });
        
        // ตรวจสอบว่ามี elements และมีข้อมูลเวลาหรือไม่
        if (!startDateValue || !endDateValue || !actualStartTime || !actualEndTime ||
            !startDateValue || !endDateValue) {
            console.log('⚠️ Missing date/time data, clearing fields');
            const operatingTimeEl = document.getElementById('operatingTime');
            // const netRunTimeEl = document.getElementById('netRunTime'); // ซ่อนแล้วใน HTML
            
            if (operatingTimeEl) operatingTimeEl.value = '';
            // if (netRunTimeEl) netRunTimeEl.value = ''; // ซ่อนแล้วใน HTML
            return;
        }

        console.log('✅ All date/time data available, proceeding with calculation');

        // แปลงรูปแบบวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY สำหรับใช้ใน isValidTimeRange()
        const startDateFormatted = convertDateFormat(startDateValue);
        const endDateFormatted = convertDateFormat(endDateValue);
        
        console.log('📅 Converted date formats:', {
            startDateOriginal: startDateValue,
            startDateFormatted,
            endDateOriginal: endDateValue,
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
        const [startYear, startMonth, startDay] = startDateValue.split('-');  // YYYY-MM-DD
        const [startHour, startMinute] = actualStartTime.split(':');
        const startTime = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), parseInt(startHour), parseInt(startMinute));
        
        const [endYear, endMonth, endDay] = endDateValue.split('-');  // YYYY-MM-DD
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
        - เวลาหยุดเครื่อง: ${downtimeMinutes} นาที
        - เวลาทำงานสุทธิ: ${actualRunTime} นาที`);
        
        // แสดงผลลัพธ์ในฟิลด์ต่างๆ (ใช้เวลาทำงานสุทธิ)
        const operatingTimeEl = document.getElementById('operatingTime');
        // const netRunTimeEl = document.getElementById('netRunTime'); // ซ่อนแล้วใน HTML
        
        console.log('🔍 Debug elements found:', {
            operatingTimeEl: !!operatingTimeEl,
            // netRunTimeEl: !!netRunTimeEl, // ซ่อนแล้วใน HTML
            actualRunTime: actualRunTime,
            operatingTimeElHTML: operatingTimeEl ? operatingTimeEl.outerHTML.substring(0, 100) : 'NOT FOUND',
            // netRunTimeElHTML: netRunTimeEl ? netRunTimeEl.outerHTML.substring(0, 100) : 'NOT FOUND' // ซ่อนแล้วใน HTML
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
        
        // Comment out netRunTime update since the field is hidden
        /*
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
        */

        // แสดงเวลากะที่มี (สำหรับข้อมูล) - กะ 10 ชั่วโมง
        const shiftMinutes = document.getElementById('shiftLength8h')?.checked ? 600 : 0;  // 10 ชั่วโมง
        const availableTime = shiftMinutes + overtimeMinutes;
        
        const shiftDisplay = document.getElementById('shiftAvailableTimeDisplay');
        const shiftText = document.getElementById('shiftAvailableTimeText');
        if (shiftDisplay && shiftText) {
            shiftText.textContent = `${availableTime} นาที`;
            shiftDisplay.style.display = 'block';
        }


        // คำนวณ OEE ใหม่
        this.calculateOEE();
        
        // === ดึง Total Runtime Value (รวม partial sessions) สำหรับการเปรียบเทียบ ===
        const totalRuntimeElement = document.getElementById('totalRuntimeValue');
        let totalRuntimeForComparison = actualRunTime; // fallback
        
        if (totalRuntimeElement && totalRuntimeElement.textContent) {
            // ดึงค่าจาก totalRuntimeValue (ตัดคำว่า "นาที" และ comma ออก)
            const runtimeText = totalRuntimeElement.textContent.replace(/[^0-9]/g, '');
            if (runtimeText && !isNaN(parseInt(runtimeText))) {
                totalRuntimeForComparison = parseInt(runtimeText);
                console.log('📊 Using Total Runtime for comparison:', {
                    actualRunTimeOnly: actualRunTime,
                    totalRuntimeIncludingSessions: totalRuntimeForComparison,
                    source: 'totalRuntimeValue element'
                });
            }
        }
        
        // === อัปเดตการเปรียบเทียบเวลาแผน vs เวลาทำงานสุทธิ (ใช้ Total Runtime) ===
        this.updateTimeDifferenceFromCalculateTimes(totalRuntimeForComparison);
        
        // === อัปเดตการเปรียบเทียบเวลาที่ปฏิบัติงานได้ vs เวลาที่ปฏิบัติงานจริง (ใช้ Total Runtime) ===
        this.updateShiftRuntimeComparison(totalRuntimeForComparison, shiftMinutes, overtimeMinutes);
    }

    /**
     * ฟังก์ชันอัปเดตการเปรียบเทียบเวลาตามแผน vs เวลาทำงานสุทธิ
     */
    /**
     * ฟังก์ชันอัปเดตการเปรียบเทียบเวลาแผน vs เวลาทำงานสุทธิ (รวม partial sessions)
     * @param {number} totalActualRunTime - เวลาทำงานจริงรวม (รวม partial sessions + ปัจจุบัน)
     */
    updateTimeDifferenceFromCalculateTimes(totalActualRunTime) {
        try {
            // ดึงเวลาแผนจาก PlannedMinutes (หักเวลาพักและ setup แล้ว)
            let plannedTotalMinutes = 0;
            
            if (this.taskData && this.taskData.PlannedMinutes && this.taskData.PlannedMinutes > 0) {
                // ใช้ PlannedMinutes ที่หักเวลาพักและ setup แล้ว
                plannedTotalMinutes = this.taskData.PlannedMinutes;
            } else if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
                // fallback: คำนวณจากเวลาเริ่มต้นและสิ้นสุด
                const plannedStartTime = new Date(this.taskData.PlannedStartTime);
                const plannedEndTime = new Date(this.taskData.PlannedEndTime);
                plannedTotalMinutes = Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
            }
            
            // อัปเดตการแสดงผล (ใช้เวลาทำงานสุทธิรวม partial sessions)
            this.updateTimeDifferenceDisplay(totalActualRunTime, plannedTotalMinutes);
        } catch (error) {
            console.error('Error in updateTimeDifferenceFromCalculateTimes:', error);
        }
    }

    /**
     * ฟังก์ชันอัปเดตการเปรียบเทียบเวลาที่ปฏิบัติงานได้ vs เวลาที่ปฏิบัติงานจริง (รวม partial sessions)
     * @param {number} totalActualRunTime - เวลาที่ปฏิบัติงานจริงรวม (รวม partial sessions + ปัจจุบัน)
     * @param {number} shiftMinutes - เวลากะ (นาที)
     * @param {number} overtimeMinutes - เวลาโอที (นาที)
     */
    updateShiftRuntimeComparison(totalActualRunTime, shiftMinutes, overtimeMinutes) {
        try {
            console.log('🔄 updateShiftRuntimeComparison() called with Total Runtime:', {
                totalActualRunTime,
                shiftMinutes,
                overtimeMinutes
            });

            // คำนวณเวลาที่ปฏิบัติงานได้ทั้งหมด (Shift + Overtime)
            const totalAvailable = shiftMinutes + overtimeMinutes;
            
            // คำนวณเวลาว่าง/ส่วนต่าง
            const timeDifference = totalAvailable - totalActualRunTime;
            
            console.log('📊 เวลาที่ปฏิบัติงานได้ vs เวลาที่ปฏิบัติงานจริง (รวม partial sessions):', {
                shiftMinutes,
                overtimeMinutes,
                totalAvailable: `เวลาที่ปฏิบัติงานได้: ${totalAvailable} นาที`,
                totalActualRunTime: `เวลาที่ปฏิบัติงานจริงรวม: ${totalActualRunTime} นาที`,
                timeDifference
            });

            // อัปเดตการแสดงผล
            const totalAvailableDisplay = document.getElementById('totalAvailableDisplay');
            const runtimeUsedDisplay = document.getElementById('runtimeUsedDisplay');
            const shiftTimeDifferenceStatus = document.getElementById('shiftTimeDifferenceStatus');

            // แสดงเวลาที่ปฏิบัติงานได้ (Shift + Overtime รวมกัน)
            if (totalAvailableDisplay) {
                let displayText = `${totalAvailable} นาที`;
                if (overtimeMinutes > 0) {
                    displayText += ` (${shiftMinutes}+${overtimeMinutes})`;
                }
                totalAvailableDisplay.textContent = displayText;
            }
            
            // แสดงเวลาที่ปฏิบัติงานจริง (รวม partial sessions)
            if (runtimeUsedDisplay) {
                runtimeUsedDisplay.textContent = `${Math.max(0, totalActualRunTime)} นาที`;
            }

            // อัปเดตสถานะการเปรียบเทียบ
            if (shiftTimeDifferenceStatus) {
                let statusHTML = '';
                let badgeClass = '';
                let iconClass = '';
                
            if (totalActualRunTime <= 0) {
                // ยังไม่มีข้อมูลเวลาปฏิบัติงานจริง
                statusHTML = '<i class="bi bi-clock me-1"></i>กรุณากรอกข้อมูลเวลา';
                badgeClass = 'bg-secondary';
            } else if (timeDifference > 0) {
                // มีเวลาว่าง (ปฏิบัติงานจริงน้อยกว่าที่ปฏิบัติงานได้)
                const hours = Math.floor(timeDifference / 60);
                const minutes = timeDifference % 60;
                const timeText = hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
                
                statusHTML = `<i class="bi bi-check-circle me-1"></i>เหลือเวลาที่สามารถปฏิบัติงานได้ ${timeText}`;
                badgeClass = 'bg-success';
            } else if (timeDifference === 0) {
                // ปฏิบัติงานเต็มเวลา
                statusHTML = '<i class="bi bi-clock-fill me-1"></i>ปฏิบัติงานเต็มเวลาที่กำหนด';
                badgeClass = 'bg-warning';
            } else {
                // ปฏิบัติงานเกินเวลาที่กำหนด
                const overTime = Math.abs(timeDifference);
                const hours = Math.floor(overTime / 60);
                const minutes = overTime % 60;
                const timeText = hours > 0 ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
                
                statusHTML = `<i class="bi bi-exclamation-triangle me-1"></i>ปฏิบัติงานเกินกว่าที่กำหนด ${timeText}`;
                badgeClass = 'bg-danger';
            }                shiftTimeDifferenceStatus.innerHTML = `
                    <span class="badge ${badgeClass} fs-6 px-3 py-2">
                        ${statusHTML}
                    </span>
                `;
            }

            console.log('✅ การเปรียบเทียบเวลาที่ปฏิบัติงานได้ vs เวลาที่ปฏิบัติงานจริง อัปเดตสำเร็จ');
            
        } catch (error) {
            console.error('❌ Error in updateShiftRuntimeComparison:', error);
        }
    }

    calculatePerformance() {
        try {
            console.log('🔄 calculatePerformance() called');
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');

            // รวมจำนวนทั้งหมด (sessions + current)
            const currentFormPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const sessionsTotalProduced = this.partialSummaryData?.totalProduced || 0;
            const totalPieces = sessionsTotalProduced + currentFormPieces;

            // ใช้ totalRuntimeValue (เวลารวมทุก session) แทน operatingTime
            const totalRuntimeElement = document.getElementById('totalRuntimeValue');
            let totalRuntimeMinutes = 0;
            if (totalRuntimeElement && totalRuntimeElement.textContent) {
                const runtimeText = totalRuntimeElement.textContent.replace(/[^0-9]/g, '');
                if (runtimeText && !isNaN(parseInt(runtimeText))) {
                    totalRuntimeMinutes = parseInt(runtimeText);
                }
            }

            console.log('🔍 Performance calculation inputs:', {
                idealRate,
                totalPieces,
                totalRuntimeMinutes
            });

            // คำนวณ Performance
            let performance = 0;
            if (idealRate > 0 && totalRuntimeMinutes > 0) {
                const theoreticalMaxCount = totalRuntimeMinutes * idealRate;
                performance = theoreticalMaxCount > 0 ? (totalPieces / theoreticalMaxCount) * 100 : 0;
            }

            console.log('🔍 Performance calculation values:', {
                performance,
                canCalculate: totalRuntimeMinutes > 0 && totalPieces > 0
            });

            // คำนวณและอัพเดท idealCycleTime
            const actualRunRateEl = document.getElementById('actualRunRate');
            if (idealRate > 0) {
                const idealCycleTime = 1 / idealRate; // นาที/ชิ้น
                if (actualRunRateEl) {
                    const newValue = `${idealCycleTime.toFixed(4)} นาที/ชิ้น`;
                    actualRunRateEl.value = newValue;
                    console.log('✅ idealCycleTime updated to:', newValue);
                }
            } else {
                if (actualRunRateEl) {
                    actualRunRateEl.value = '';
                }
            }

            // เรียก calculateQuality แทน calculateOEE เพื่อป้องกัน infinite loop
            this.calculateQuality();
        } catch (error) {
            console.error('Error in calculatePerformance:', error);
        }
    }

    calculateQuality() {
        try {
            // ดึงข้อมูลจาก Current Session (ที่กรอกในฟอร์ม)
            const currentTotalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const currentRejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
            const currentReworkPieces = parseInt(document.getElementById('reworkPieces')?.value || '0');
            
            // ดึงข้อมูลจาก Partial Sessions (ถ้ามี)
            const sessionsTotalProduced = this.partialSummaryData?.totalProduced || 0;
            const sessionsRejects = this.partialSummaryData?.totalRejects || 0;
            const sessionsRework = this.partialSummaryData?.totalRework || 0;
            
            // คำนวณรวมทั้งหมด (Sessions + Current)
            const totalPieces = sessionsTotalProduced + currentTotalPieces;
            const totalRejectPieces = sessionsRejects + currentRejectPieces;
            const totalReworkPieces = sessionsRework + currentReworkPieces;
            const goodPieces = Math.max(0, totalPieces - totalRejectPieces);
            
            console.log('📊 Quality calculation with Sessions:', {
                sessions: {
                    totalProduced: sessionsTotalProduced,
                    rejects: sessionsRejects,
                    rework: sessionsRework
                },
                current: {
                    totalPieces: currentTotalPieces,
                    rejects: currentRejectPieces,
                    rework: currentReworkPieces
                },
                combined: {
                    totalPieces: totalPieces,
                    totalRejects: totalRejectPieces,
                    totalRework: totalReworkPieces,
                    goodPieces: goodPieces
                }
            });
            
            // อัปเดตช่อง Good Pieces
            const goodPiecesEl = document.getElementById('goodPieces');
            if (goodPiecesEl) {
                goodPiecesEl.value = goodPieces;
            }

            console.log(`✅ Quality Summary (Sessions + Current) - Total: ${totalPieces}, Good: ${goodPieces}, Reject: ${totalRejectPieces}, Rework: ${totalReworkPieces}`);

            this.calculateOEE();
        } catch (error) {
            console.error('Error in calculateQuality:', error);
        }
    }

    /**
     * อัปเดตการแสดง Remark
     */
    updateRemarkDisplay() {
        const remarkText = document.getElementById('Remark')?.value || '';
        console.log('Quality Remark updated:', remarkText);
        // อาจจะเพิ่ม UI feedback หรือ validation ในอนาคต
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
            // ใช้เวลารวมจาก partial sessions + confirm input
            const runtimeData = this.calculateTotalRuntimeForOEE();
            const actualRunTimeMinutes = runtimeData.totalRuntime;
            
            console.log('📊 OEE Calculation using total runtime:', runtimeData);
            
            // อ่านค่าสำหรับการคำนวณ OEE
            const idealRate = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');

            // ตรวจสอบข้อมูลที่จำเป็นสำหรับการคำนวณ
            if (idealRate <= 0 || totalPieces <= 0 || actualRunTimeMinutes <= 0) {
                console.log('⚠️ Missing data for OEE calculation:', {
                    idealRate, totalPieces, actualRunTimeMinutes
                });
                this.resetOEEDisplay();
                return;
            }

            // ใช้เวลาผลิตตามแผนจากข้อมูลแผนงาน
            let plannedProductionMinutesForOEE = 0;
            if (this.taskData && this.taskData.PlannedMinutes && this.taskData.PlannedMinutes > 0) {
                plannedProductionMinutesForOEE = this.taskData.PlannedMinutes;
            } else if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
                const plannedStartTime = new Date(this.taskData.PlannedStartTime);
                const plannedEndTime = new Date(this.taskData.PlannedEndTime);
                plannedProductionMinutesForOEE = Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
            } else {
                // fallback: ใช้เวลารวมที่คำนวณได้
                plannedProductionMinutesForOEE = actualRunTimeMinutes;
            }

            // คำนวณองค์ประกอบของ OEE
            const availability = plannedProductionMinutesForOEE > 0 ? (actualRunTimeMinutes / plannedProductionMinutesForOEE) * 100 : 0;
            
            const idealCycleTime = idealRate > 0 ? (1 / idealRate) : 0;
            const performance = actualRunTimeMinutes > 0 && idealCycleTime > 0 ? 
                ((idealCycleTime * totalPieces) / actualRunTimeMinutes) * 100 : 0;
            
            const goodPieces = totalPieces - rejectPieces;
            const quality = totalPieces > 0 ? (goodPieces / totalPieces) * 100 : 0;
            
            const oeeTotal = (availability * performance * quality) / 10000;
            
            console.log(`📊 OEE Results with Combined Runtime (${runtimeData.partialRuntime} + ${runtimeData.confirmRuntime}):
            - Planned Time: ${plannedProductionMinutesForOEE} minutes
            - Actual Run Time (Combined): ${actualRunTimeMinutes} minutes
            - Availability: ${availability.toFixed(2)}%
            - Performance: ${performance.toFixed(2)}%
            - Quality: ${quality.toFixed(2)}%
            - OEE Total: ${oeeTotal.toFixed(2)}%`);
            
            // อัปเดตการแสดงผล
            this.updateOEEDisplay(availability, performance, quality, oeeTotal);
            
            // อัปเดต runtime total display
            this.updateRuntimeTotalDisplay();
            
            // อัปเดตฟิลด์เพิ่มเติม
            const actualRunRateEl = document.getElementById('actualRunRate');
            if (actualRunRateEl && idealRate > 0) {
                const idealCycleTimeValue = 1 / idealRate;
                actualRunRateEl.value = `${idealCycleTimeValue.toFixed(4)} นาที/ชิ้น`;
            }
            
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการคำนวณ OEE:', error);
            this.resetOEEDisplay();
        }
    }

    /**
     * ฟังก์ชันอัปเดตการแสดงผลค่า OEE
     */
    updateOEEDisplay(availability, performance, quality, oee) {
        // อัปเดตองค์ประกอบ OEE
        const availabilityEl = document.getElementById('availability');
        const performanceEl = document.getElementById('performance');
        const qualityEl = document.getElementById('quality');
        const oeeEl = document.getElementById('oee');

        if (availabilityEl) {
            availabilityEl.textContent = availability.toFixed(1) + '%';
            this.updateBadgeColor('availabilityBadge', availability);
        }

        if (performanceEl) {
            performanceEl.textContent = performance.toFixed(1) + '%';
            this.updateBadgeColor('performanceBadge', performance);
        }

        if (qualityEl) {
            qualityEl.textContent = quality.toFixed(1) + '%';
            this.updateBadgeColor('qualityBadge', quality);
        }

        if (oeeEl) {
            oeeEl.textContent = oee.toFixed(1) + '%';
            this.updateBadgeColor('oeeBadge', oee);
        }
    }

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
     * ฟังก์ชันแสดงผลต่างเวลาระหว่างแผนกับ Runtime (ลบ downtime break แล้ว)
     * @param {number} actualRunTime - Runtime ที่ลบ downtime และ break แล้ว (นาที)
     * @param {number} plannedTotalMinutes - เวลาแผนรวม (นาที)
     */
    updateTimeDifferenceDisplay(actualRunTime, plannedTotalMinutes) {
        try {
            console.log('อัปเดตการเปรียบเทียบเวลา:', {
                actualRunTime,
                plannedTotalMinutes
            });

            // คำนวณผลต่าง (เปรียบเทียบ runtime กับแผน)
            const timeDifferenceMinutes = actualRunTime - plannedTotalMinutes;
            const isAheadOfSchedule = timeDifferenceMinutes < 0; // ลบ = เร็วกว่าแผน
            const isBehindSchedule = timeDifferenceMinutes > 0;  // บวก = ช้ากว่าแผน
            const isOnSchedule = timeDifferenceMinutes === 0;    // เท่ากัน = ตรงแผน

            console.log(`การเปรียบเทียบเวลา (แผน vs Runtime):
            - เวลาแผน: ${plannedTotalMinutes} นาที
            - Runtime (ลบ downtime break): ${actualRunTime} นาที
            - ผลต่าง: ${timeDifferenceMinutes > 0 ? '+' : ''}${timeDifferenceMinutes} นาที
            - สถานะ: ${isAheadOfSchedule ? 'เร็วกว่าแผน' : isBehindSchedule ? 'ช้ากว่าแผน' : 'ตรงแผน'}`);

            // อัปเดตค่าในการ์ด
            document.getElementById('plannedTotalTime').textContent = plannedTotalMinutes > 0 ? plannedTotalMinutes : '-';
            document.getElementById('actualTotalTime').textContent = actualRunTime > 0 ? actualRunTime : '-';

            // อัปเดตผลต่าง
            const timeDifferenceValueEl = document.getElementById('timeDifferenceValue');
            const timeDifferenceCardEl = document.getElementById('timeDifferenceCard');
            const timeDifferenceStatusEl = document.getElementById('timeDifferenceStatus');

            if (actualRunTime > 0 && plannedTotalMinutes > 0) {
                // แสดงผลต่าง
                if (timeDifferenceValueEl) {
                    timeDifferenceValueEl.textContent = timeDifferenceMinutes > 0 ? `+${timeDifferenceMinutes}` : timeDifferenceMinutes;
                }

                // เปลี่ยนสีการ์ดตามสถานะ
                if (timeDifferenceCardEl) {
                    // ลบคลาสเก่า
                    timeDifferenceCardEl.className = timeDifferenceCardEl.className.replace(/border-(success|warning|danger|secondary)/g, '');
                    
                    const titleEl = timeDifferenceCardEl.querySelector('.card-title');
                    const valueEl = timeDifferenceCardEl.querySelector('h4');
                    
                    if (isOnSchedule) {
                        timeDifferenceCardEl.classList.add('border-success');
                        titleEl.className = 'card-title text-success mb-2';
                        valueEl.className = 'text-success mb-0';
                    } else if (isAheadOfSchedule) {
                        timeDifferenceCardEl.classList.add('border-success');
                        titleEl.className = 'card-title text-success mb-2';
                        valueEl.className = 'text-success mb-0';
                    } else if (isBehindSchedule) {
                        timeDifferenceCardEl.classList.add('border-warning');
                        titleEl.className = 'card-title text-warning mb-2';
                        valueEl.className = 'text-warning mb-0';
                    }
                }

                // แสดง badge สถานะ (ไม่มีอิโมจิ)
                if (timeDifferenceStatusEl) {
                    let statusHTML = '';
                    
                    if (isOnSchedule) {
                        statusHTML = `
                            <span class="badge bg-success fs-6 px-3 py-2">
                                <i class="bi bi-check-circle me-1"></i>ตรงแผน (${timeDifferenceMinutes} นาที)
                            </span>
                        `;
                    } else if (isAheadOfSchedule) {
                        statusHTML = `
                            <span class="badge bg-success fs-6 px-3 py-2">
                                <i class="bi bi-lightning me-1"></i>เร็วกว่าแผน ${Math.abs(timeDifferenceMinutes)} นาที
                            </span>
                        `;
                    } else if (isBehindSchedule) {
                        statusHTML = `
                            <span class="badge bg-warning fs-6 px-3 py-2">
                                <i class="bi bi-clock me-1"></i>ช้ากว่าแผน ${timeDifferenceMinutes} นาที
                            </span>
                        `;
                    }
                    
                    timeDifferenceStatusEl.innerHTML = statusHTML;
                }
            } else {
                // ยังไม่มีข้อมูลเพียงพอ
                if (timeDifferenceValueEl) {
                    timeDifferenceValueEl.textContent = '-';
                }
                
                if (timeDifferenceCardEl) {
                    timeDifferenceCardEl.className = 'card border-secondary';
                    const titleEl = timeDifferenceCardEl.querySelector('.card-title');
                    const valueEl = timeDifferenceCardEl.querySelector('h4');
                    titleEl.className = 'card-title text-secondary mb-2';
                    valueEl.className = 'text-secondary mb-0';
                }
                
                if (timeDifferenceStatusEl) {
                    timeDifferenceStatusEl.innerHTML = `
                        <span class="badge bg-secondary fs-6 px-3 py-2">
                            <i class="bi bi-question-circle me-1"></i>รอข้อมูล
                        </span>
                    `;
                }
            }

        } catch (error) {
            console.error('Error in updateTimeDifferenceDisplay:', error);
        }
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
        
        // ตรวจสอบการเรียกซ้ำ
        if (this._isSubmitting) {
            console.warn('⚠️ Form is already being submitted, ignoring duplicate call');
            return;
        }
        
        this._isSubmitting = true;
        
        console.log('=== FORM SUBMIT DEBUG ===');
        console.log('📅 Timestamp:', new Date().toISOString());
        console.log('🔄 Call Count:', (this._submitCount || 0) + 1);
        this._submitCount = (this._submitCount || 0) + 1;
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
            
            // เพิ่มข้อมูล partial confirmation
            const totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
            const isCompleteProduction = this.partialData && 
                (this.partialData.totalProduced + totalPieces >= this.partialData.targetOutput);
            
            formData.IsPartialConfirmation = !isCompleteProduction;
            formData.CurrentSessionQuantity = totalPieces;
            
            console.log('Form data prepared:', formData);
            
            // ใช้ save_production_result API เดียวสำหรับทั้ง partial และ complete
            console.log('Using save_production_result API for all confirmations...');
            formData.TotalProducedBefore = this.partialData?.totalProduced || 0;
            formData.RemainingQuantity = Math.max(0, 
                (this.partialData?.targetOutput || 0) - (this.partialData?.totalProduced || 0) - totalPieces
            );
            
            console.log('กำลังส่งข้อมูล OEE (with Partial):', {
                ...formData,
                partialInfo: {
                    isCompleteProduction,
                    currentSession: totalPieces,
                    totalBefore: this.partialData?.totalProduced || 0,
                    remaining: formData.RemainingQuantity
                }
            });
            
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
            
            const response = await fetch('api/results.php?action=save_production_result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json',
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

            // แสดงข้อความสำเร็จตาม partial status
            if (formData.IsPartialConfirmation) {
                this.showToast(
                    `บันทึกข้อมูลสำเร็จ! คงเหลือที่ต้องผลิต: ${formData.RemainingQuantity} ชิ้น`, 
                    'success'
                );
                
                // รีโหลดหน้าเดิมเพื่อบันทึกต่อ
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                this.showToast('บันทึกข้อมูลสำเร็จ! งานเสร็จสิ้นครบถ้วนแล้ว', 'success');
                
                // กลับไปหน้าหลัก
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการส่งฟอร์ม:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                taskId: this.taskId,
                formElements: {
                    startDate: getConfirmDateValue('actualStartDate'),
                    startTime: getConfirmTimeValue('actualStartHour', 'actualStartMinute'),
                    endDate: getConfirmDateValue('actualEndDate'),
                    endTime: getConfirmTimeValue('actualEndHour', 'actualEndMinute')
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
            
            // ปลดล็อกการส่งฟอร์ม
            this._isSubmitting = false;
            console.log('🔓 Form submission unlocked');
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
        const startDateValue = getConfirmDateValue('actualStartDate');
        const endDateValue = getConfirmDateValue('actualEndDate');
        
        // ดึงเวลาจาก dropdown
        const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
        const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
        
        if (!startDateValue || !endDateValue) {
            this.showToast('ไม่พบฟิลด์วันที่ กรุณาโหลดหน้าใหม่', 'danger');
            return false;
        }
        
        if (!startDateValue || !endDateValue || !actualStartTime || !actualEndTime) {
            this.showToast('กรุณากรอกวันที่และเวลาให้ครบถ้วน', 'warning');
            return false;
        }
        
        // แปลงรูปแบบวันที่สำหรับใช้ใน isValidTimeRange()
        const startDateFormatted = convertDateFormat(startDateValue);
        const endDateFormatted = convertDateFormat(endDateValue);
        
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
            // ตรวจสอบว่ามี partial sessions หรือไม่
            let actualStartTimeStr, actualEndTimeStr;
            
            if (this.partialSessions && this.partialSessions.length > 0) {
                console.log('📊 Using time from partial sessions');
                
                // เรียงลำดับ sessions ตามเวลา
                const sortedSessions = [...this.partialSessions].sort((a, b) => 
                    new Date(a.ActualStartDateTime) - new Date(b.ActualStartDateTime)
                );
                
                // เวลาเริ่มจริง = เวลาเริ่มของ session แรกสุด
                const firstSession = sortedSessions[0];
                const lastSession = sortedSessions[sortedSessions.length - 1];
                
                actualStartTimeStr = firstSession.ActualStartDateTime;
                actualEndTimeStr = lastSession.ActualEndDateTime;
                
                console.log('✅ Time from partial sessions:', {
                    firstSession: firstSession.SessionNumber,
                    lastSession: lastSession.SessionNumber,
                    actualStartTime: actualStartTimeStr,
                    actualEndTime: actualEndTimeStr,
                    totalSessions: this.partialSessions.length
                });
                
            } else {
                console.log('📊 Using time from form input (no partial sessions)');
                
                // ใช้เวลาจาก input เหมือนเดิม (กรณีไม่มี partial)
                const startDateValue = getConfirmDateValue('actualStartDate');
                const endDateValue = getConfirmDateValue('actualEndDate');
                const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
                const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
                
                if (!startDateValue || !endDateValue || !actualStartTime || !actualEndTime) {
                    throw new Error('กรุณากรอกวันที่และเวลาให้ครบถ้วน');
                }
                
                const startDateFormatted = convertDateFormat(startDateValue);
                const endDateFormatted = convertDateFormat(endDateValue);
                
                actualStartTimeStr = formatDateTimeSQL(startDateFormatted, actualStartTime);
                actualEndTimeStr = formatDateTimeSQL(endDateFormatted, actualEndTime);
            }
            
            // สร้าง DateTime objects สำหรับการคำนวณ
            const startTime = new Date(actualStartTimeStr);
            const endTime = new Date(actualEndTimeStr);
            
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                throw new Error('วันที่เวลาไม่ถูกต้อง');
            }
            
            const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
            
            console.log('⏰ Final time calculation:', {
                actualStartTimeStr,
                actualEndTimeStr,
                totalMinutes,
                source: this.partialSessions?.length > 0 ? 'partial_sessions' : 'form_input'
            });
            
            // ใช้เวลาจาก partial sessions ในการคำนวณ Break Time
            let breakMorning = 0, breakLunch = 0, breakEvening = 0;
            
            // ใช้ Break Time จาก checkbox ในหน้า Confirm เสมอ (ไม่ขึ้นกับ partial sessions)
            document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
                const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
                if (checkbox.value === 'morning') breakMorning = breakTimes[checkbox.value];
                if (checkbox.value === 'lunch') breakLunch = breakTimes[checkbox.value];
                if (checkbox.value === 'evening') breakEvening = breakTimes[checkbox.value];
            });
            
            console.log('📊 Break time from form checkboxes:', {
                breakMorning, breakLunch, breakEvening
            });
            
            // คำนวณ Downtime จาก partial sessions
            let downtimeMinutes = 0;
            let downtimeReason = '';
            
            if (this.partialSessions && this.partialSessions.length > 0) {
                this.partialSessions.forEach(session => {
                    downtimeMinutes += session.DowntimeMinutes || 0;
                    if (session.DowntimeReason) {
                        downtimeReason += (downtimeReason ? ' | ' : '') + 
                            `S${session.SessionNumber}: ${session.DowntimeReason}`;
                    }
                });
            } else {
                downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');
                downtimeReason = document.getElementById('downtimeDetail')?.value || '';
            }
            
            // รวมข้อมูลจำนวนผลิตจาก partial sessions และฟอร์มปัจจุบัน
            let totalPieces = 0;
            let rejectPieces = 0;
            let reworkPieces = 0;
            let Remark = '';
            
            if (this.partialSessions && this.partialSessions.length > 0) {
                // รวมข้อมูลจาก partial sessions
                this.partialSessions.forEach(session => {
                    totalPieces += session.SessionQuantity || 0;
                    rejectPieces += session.SessionRejectQuantity || 0;
                    // reworkPieces += session.SessionReworkQuantity || 0;
                });
                
                // เพิ่มข้อมูลล่าสุดจากฟอร์ม (บวกรวมกัน)
                const formTotalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
                const formRejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
                const formReworkPieces = parseInt(document.getElementById('reworkPieces')?.value || '0');
                
                console.log('🔍 Form elements check:', {
                    totalPiecesElement: document.getElementById('totalPieces'),
                    rejectPiecesElement: document.getElementById('rejectPieces'),
                    reworkPiecesElement: document.getElementById('reworkPieces'),
                    formTotalPieces,
                    formRejectPieces,
                    formReworkPieces
                });
                
                // บวกรวมข้อมูลจากฟอร์มกับ partial sessions
                totalPieces += formTotalPieces;
                rejectPieces += formRejectPieces;
                reworkPieces += formReworkPieces;
                
                console.log('📊 Production data combined (partial + form):', {
                    partialSessionsTotal: totalPieces - formTotalPieces,
                    formTotal: formTotalPieces,
                    finalTotal: totalPieces,
                    partialSessionsReject: rejectPieces - formRejectPieces,
                    formReject: formRejectPieces,
                    finalReject: rejectPieces,
                    partialSessionsRework: reworkPieces - formReworkPieces,
                    formRework: formReworkPieces,
                    finalRework: reworkPieces
                });
            } else {
                // ใช้จากฟอร์มเหมือนเดิม
                totalPieces = parseInt(document.getElementById('totalPieces')?.value || '0');
                rejectPieces = parseInt(document.getElementById('rejectPieces')?.value || '0');
                reworkPieces = parseInt(document.getElementById('reworkPieces')?.value || '0');
            }
            
            // ใช้ Remark เฉพาะจากฟอร์มปัจจุบันเท่านั้น (ไม่รวม partial sessions)
            Remark = document.getElementById('Remark')?.value || '';
            
            const goodPieces = totalPieces - rejectPieces;
            
            // ใช้ idealRunRate จากฟอร์ม (ค่าคงที่)
            const idealRunRateUsed = parseFloat(document.getElementById('idealRunRate')?.value || '0');
            
            // คำนวณค่า Shift และ Overtime
            const shiftHours = 10.0; // ค่าคงที่สำหรับกะ 10 ชั่วโมง
            let overtimeMinutes = 0;
            if (document.getElementById('overtimeEnable')?.checked) {
                overtimeMinutes = parseInt(document.getElementById('overtime')?.value || '0');
            }
            
            // คำนวณเวลาพักรวมสำหรับการคำนวณ OEE
            const totalBreakMinutes = breakMorning + breakLunch + breakEvening;
        
        console.log('Step 10: Performance data validated:', { 
            idealRunRateUsed, totalPieces, rejectPieces, reworkPieces, goodPieces, Remark 
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
        
        // คำนวณ Total Runtime และ Actual Run Time ที่ถูกต้อง
        let totalRuntimeMinutes = totalMinutes; // เวลาจากฟอร์มปัจจุบัน (ยังไม่หัก break/downtime)
        let totalWorkingMinutesFromSessions = 0; // เวลาทำงานสุทธิจาก sessions (หักแล้ว)
        
        // เพิ่มเวลาจาก partial sessions (ถ้ามี)
        if (this.partialSessions && this.partialSessions.length > 0) {
            // WorkingMinutes จาก sessions หักแล้ว ไม่ต้องหักอีก
            totalWorkingMinutesFromSessions = this.partialSessions.reduce((sum, session) => {
                return sum + (session.WorkingMinutes || 0);
            }, 0);
            console.log('📊 Total working minutes from sessions:', totalWorkingMinutesFromSessions, 'minutes (already deducted break/downtime)');
        }
        
        // คำนวณ Actual Run Time สำหรับฟอร์มปัจจุบัน (หักเวลาพักและ downtime)
        const currentFormActualRunTime = Math.max(0, totalMinutes - totalBreakMinutes - downtimeMinutes);
        
        // รวม Working Time = เวลาจาก sessions (หักแล้ว) + เวลาจากฟอร์มปัจจุบัน (หักแล้ว)
        const actualRunTimeMinutes = totalWorkingMinutesFromSessions + currentFormActualRunTime;
        
        console.log('📊 Working time calculation in collectFormData:', {
            currentFormMinutes: totalMinutes,
            totalWorkingMinutesFromSessions: totalWorkingMinutesFromSessions,
            totalBreakMinutes,
            downtimeMinutes,
            currentFormActualRunTime, // เวลาจากฟอร์มปัจจุบันหลังหัก
            actualRunTimeMinutes // รวมเวลาทำงานสุทธิทั้งหมด
        });
        
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
        
        console.log('Step 14.5: ActiveWorkMinutes calculation correct:', {
            actualRunTimeMinutes: actualRunTimeMinutes, // เวลาทำงานสุทธิรวม (หัก break + downtime แล้ว)
            currentFormActualRunTime: currentFormActualRunTime, // เวลาจากฟอร์มปัจจุบันหลังหัก
            totalWorkingMinutesFromSessions: totalWorkingMinutesFromSessions, // เวลาจาก sessions (หักแล้ว)
            note: 'ActiveWorkMinutes uses actualRunTimeMinutes (net working time)'
        });
        
        console.log('Step 15: Creating form data object...');
        
        // คำนวณข้อมูลการเปรียบเทียบเวลา
        const plannedTotalMinutes = this.getPlannedTotalMinutes();
        const actualTotalMinutes = totalMinutes;
        const timeDifferenceMinutes = actualTotalMinutes - plannedTotalMinutes;
        
        // === เพิ่มข้อมูลแผนงาน (PlannedStartTime, PlannedEndTime, Status) ===
        let plannedStartTime = null;
        let plannedEndTime = null;
        let status = 'completed'; // ค่าเริ่มต้น
        
        if (this.taskData) {
            plannedStartTime = this.taskData.PlannedStartTime ? this.taskData.PlannedStartTime : null;
            plannedEndTime = this.taskData.PlannedEndTime ? this.taskData.PlannedEndTime : null;
            
            console.log('Plan data from taskData:', {
                plannedStartTime,
                plannedEndTime,
                status
            });
        }

        const formData = {
            PlanID: parseInt(this.taskId),  // แปลงเป็น integer
            ActualStartTime: actualStartTimeStr,
            ActualEndTime: actualEndTimeStr,
            PlannedStartTime: plannedStartTime,  // เพิ่มข้อมูลแผน
            PlannedEndTime: plannedEndTime,      // เพิ่มข้อมูลแผน
            Status: status,                      // เพิ่ม Status
            
            // === เพิ่ม MachineName และ Department จาก taskData ===
            MachineName: this.getResolvedMachineName(),
            Department: this.taskData ? (this.taskData.DepartmentName || '') : '',
            SubdepartmentName: this.taskData ? (this.taskData.SubdepartmentName || '') : '',
            
            ShiftHours: shiftHours,
            OvertimeMinutes: overtimeMinutes,
            BreakMorningMinutes: breakMorning,
            BreakLunchMinutes: breakLunch,
            BreakEveningMinutes: breakEvening,
            StandardRunRate: idealRunRateUsed,
            TotalPieces: totalPieces,
            RejectPieces: rejectPieces,
            ReworkPieces: reworkPieces,
            Remark: Remark,  // เก็บเฉพาะ Quality Remark
            GoodQuantity: goodPieces,  // เพิ่ม GoodQuantity
            DowntimeMinutes: downtimeMinutes,
            DowntimeReason: downtimeReason,
            PlannedWorkMinutes: plannedProductionMinutesForOEE, // ใช้เวลาจากแผนงาน (ไม่หักเวลาพัก)
            ActiveWorkMinutes: actualRunTimeMinutes, // เวลาทำงานจริง (หักเวลาพักและ downtime แล้ว)
            WorkingMinutes: actualRunTimeMinutes, // เวลาทำงานจริง (สำหรับ API)
            OEE_Availability: Math.round(availability * 100) / 100,
            OEE_Performance: Math.round(performance * 100) / 100,
            OEE_Quality: Math.round(quality * 100) / 100,
            OEE_Overall: Math.round(oeeTotal * 100) / 100,
            ActualRunRate: Math.round(actualRunRate * 100) / 100,
            WorkingHours: Math.round(workingHours * 100) / 100,  // เพิ่ม WorkingHours
            TotalBreakMinutes: totalBreakMinutes,  // เพิ่ม TotalBreakMinutes
            
            // === เพิ่มข้อมูล Partial Sessions Support ===
            IsFromPartialSessions: this.partialSessions && this.partialSessions.length > 0,
            TotalPartialSessions: this.partialSessions ? this.partialSessions.length : 0,
            
            // === เพิ่มข้อมูลการเปรียบเทียบเวลา ===
            PlannedTotalMinutes: plannedTotalMinutes,
            ActualTotalMinutes: actualTotalMinutes,
            TimeDifferenceMinutes: timeDifferenceMinutes,
            IsAheadOfSchedule: timeDifferenceMinutes < 0,
            IsBehindSchedule: timeDifferenceMinutes > 0,
            IsOnSchedule: timeDifferenceMinutes === 0,
            ConfirmedByUserID: 1
        };
        
        // === เพิ่ม DEBUG LOG สำหรับการคำนวณเวลา ===
        console.log('=== WORKING TIME CALCULATION DEBUG ===');
        console.log('currentFormMinutes (ก่อนหัก):', totalMinutes);
        console.log('totalWorkingMinutesFromSessions (หักแล้ว):', totalWorkingMinutesFromSessions);
        console.log('totalBreakMinutes:', totalBreakMinutes);
        console.log('downtimeMinutes:', downtimeMinutes);
        console.log('currentFormActualRunTime (หลังหัก):', currentFormActualRunTime);
        console.log('actualRunTimeMinutes (รวมสุทธิ):', actualRunTimeMinutes);
        console.log('ActiveWorkMinutes ที่ส่งไป API:', actualRunTimeMinutes);
        console.log('=== OEE CALCULATION DEBUG ===');
        console.log('Planned Production Minutes:', plannedProductionMinutesForOEE);
        console.log('Availability = (', actualRunTimeMinutes, '/', plannedProductionMinutesForOEE, ') × 100 =', availability.toFixed(2), '%');
        console.log('Performance = (', totalPieces, '/ (', actualRunTimeMinutes, '×', idealRunRateUsed, ')) × 100 =', performance.toFixed(2), '%');
        console.log('Quality = (', goodPieces, '/', totalPieces, ') × 100 =', quality.toFixed(2), '%');
        console.log('OEE = (', availability.toFixed(2), '×', performance.toFixed(2), '×', quality.toFixed(2), ') / 10000 =', oeeTotal.toFixed(2), '%');
        console.log('=========================================');
        
        console.log('Step 16: Form data object created successfully');
        console.log('Form data collected for ProductionResults:', formData);
        console.log('PlanID check:', formData.PlanID, 'Type:', typeof formData.PlanID, 'Valid:', !isNaN(formData.PlanID) && formData.PlanID > 0);
        
        // === DEBUG: ตรวจสอบ MachineName และ Department ===
        console.log('=== MachineName & Department DEBUG ===');
        console.log('taskData available:', !!this.taskData);
        if (this.taskData) {
            console.log('taskData.MachineName:', this.taskData.MachineName);
            console.log('taskData.DepartmentName:', this.taskData.DepartmentName);
        }
        console.log('formData.MachineName:', formData.MachineName);
        console.log('formData.Department:', formData.Department);
        console.log('========================================');
        
        
        console.log('✅ Form data with partial sessions integration:', {
            source: formData.IsFromPartialSessions ? 'partial_sessions' : 'form_input',
            totalSessions: formData.TotalPartialSessions,
            timeRange: `${actualStartTimeStr} -> ${actualEndTimeStr}`,
            duration: `${totalMinutes} minutes`,
            production: `${totalPieces} total, ${goodPieces} good, ${rejectPieces} reject`
        });
        
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

    /**
     * ฟังก์ชันดึงเวลาแผนรวม (helper function)
     */
    getPlannedTotalMinutes() {
        if (this.taskData && this.taskData.PlannedStartTime && this.taskData.PlannedEndTime) {
            const plannedStartTime = new Date(this.taskData.PlannedStartTime);
            const plannedEndTime = new Date(this.taskData.PlannedEndTime);
            return Math.floor((plannedEndTime - plannedStartTime) / (1000 * 60));
        }
        return 0;
    }

    /**
     * ฟังก์ชันดึงเวลาจริงรวม (helper function)
     */
    getActualTotalMinutes() {
        const startDateValue = getConfirmDateValue('actualStartDate');
        const endDateValue = getConfirmDateValue('actualEndDate');
        const actualStartTime = getConfirmTimeValue('actualStartHour', 'actualStartMinute');
        const actualEndTime = getConfirmTimeValue('actualEndHour', 'actualEndMinute');
        
        if (!startDateValue || !endDateValue || !actualStartTime || !actualEndTime) {
            return 0;
        }
        
        const [startYear, startMonth, startDay] = startDateValue.split('-');
        const [startHour, startMinute] = actualStartTime.split(':');
        const startTime = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay), parseInt(startHour), parseInt(startMinute));
        
        const [endYear, endMonth, endDay] = endDateValue.split('-');
        const [endHour, endMinute] = actualEndTime.split(':');
        const endTime = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay), parseInt(endHour), parseInt(endMinute));
        
        return Math.floor((endTime - startTime) / (1000 * 60));
    }

    /**
     * ฟังก์ชันคำนวณ Runtime ที่ลบ downtime และ break แล้ว (helper function)
     */
    getActualRunTime() {
        const totalMinutes = this.getActualTotalMinutes();
        
        // คำนวณเวลาพัก
        let breakMinutes = 0;
        document.querySelectorAll('input[name="breakTime[]"]:checked').forEach(checkbox => {
            const breakTimes = { 'morning': 15, 'lunch': 60, 'evening': 15 };
            breakMinutes += breakTimes[checkbox.value] || 0;
        });
        
        // คำนวณเวลา downtime
        const downtimeMinutes = parseInt(document.getElementById('downtime')?.value || '0');
        
        // Runtime = เวลาทำงานจริง - เวลาพัก - Downtime
        return Math.max(0, totalMinutes - breakMinutes - downtimeMinutes);
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
     * ฟังก์ชันสำหรับยืนยันแผนงาน - ปิดการใช้งานเพื่อป้องกันการบันทึกซ้ำ
     * ให้ใช้ handleFormSubmit จากฟอร์มแทน
     */
    static async confirmTaskCompletion(planId) {
        console.log('confirmTaskCompletion() - ถูกปิดการใช้งานเพื่อป้องกันการบันทึกซ้ำ');
        throw new Error('ใช้ handleFormSubmit จากฟอร์มแทนฟังก์ชันนี้');
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
 * 
 * หมายเหตุ: ฟังก์ชันนี้ถูกปิดการใช้งานเพื่อป้องกันการบันทึกซ้ำ
 * ใช้ handleFormSubmit จาก form listener แทน
 */
function setupConfirmButton() {
    console.log('setupConfirmButton() - ถูกปิดการใช้งานเพื่อป้องกันการบันทึกซ้ำ');
    return; // ปิดการทำงานของฟังก์ชันนี้
    
    // ส่วนนี้ถูกปิดการใช้งาน
    /*
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
    */
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
    
    // ป้องกันการสร้าง manager ซ้ำ
    if (window.currentConfirmManager) {
        console.log('⚠️ ConfirmCompleteManager already exists, skipping initialization');
        return;
    }
    
    const manager = new ConfirmCompleteManager();
    // เก็บ reference ไว้สำหรับเรียกใช้ภายนอก
    window.currentConfirmManager = manager;
    manager.init();
});
