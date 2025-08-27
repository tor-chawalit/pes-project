// ================================================================
// Partial Confirmation System - JavaScript (คัดลอกจาก confirm-complete)
// ================================================================
// สำหรับการบันทึกผลผลิตแบบ partial จนกว่าจะครบเป้าหมาย
// ================================================================

// ================================================================
// HYBRID DATE PICKER FUNCTIONS - คัดลอกจาก confirm-complete.js
// ================================================================

/**
 * ตั้งค่าการเชื่อมโยง Native Date Picker ที่ซ่อนไว้กับ Text Field ที่แสดงผล
 */
function setupPartialHiddenDatePickers() {
  console.log('Setting up partial page hidden date pickers...');
  
  // Setup Actual Start Date
  setupPartialDatePickerWithButton('actualStartDate', 'actualStartDateHidden', 'actualStartDateBtn');
  
  // Setup Actual End Date  
  setupPartialDatePickerWithButton('actualEndDate', 'actualEndDateHidden', 'actualEndDateBtn');
  
  console.log('Partial page hidden date pickers setup completed');
}

/**
 * ตั้งค่า date picker พร้อมปุ่มสำหรับหน้า partial
 */
function setupPartialDatePickerWithButton(displayId, hiddenId, buttonId) {
  const displayField = document.getElementById(displayId);
  const hiddenField = document.getElementById(hiddenId);
  const button = document.getElementById(buttonId);
  
  if (!displayField || !hiddenField || !button) {
    console.warn(`Partial date picker elements not found: ${displayId}, ${hiddenId}, ${buttonId}`);
    return;
  }
  
  console.log(`Setting up partial date picker: ${displayId} -> ${hiddenId} (button: ${buttonId})`);
  
  // เมื่อคลิกปุ่ม
  button.addEventListener('click', () => {
    console.log(`Button ${buttonId} clicked, triggering ${hiddenId}`);
    triggerPartialDatePicker(hiddenField);
  });
  
  // เมื่อคลิกที่ display field
  displayField.addEventListener('click', () => {
    console.log(`Display field ${displayId} clicked, triggering ${hiddenId}`);
    triggerPartialDatePicker(hiddenField);
  });
  
  // เมื่อ focus ที่ display field
  displayField.addEventListener('focus', () => {
    console.log(`Display field ${displayId} focused, triggering ${hiddenId}`);
    triggerPartialDatePicker(hiddenField);
  });
  
  // ป้องกันการพิมพ์
  displayField.addEventListener('keydown', (e) => {
    e.preventDefault();
    triggerPartialDatePicker(hiddenField);
  });
  
  // เมื่อเปลี่ยนค่าใน hidden field
  hiddenField.addEventListener('change', () => {
    console.log(`${hiddenId} changed to:`, hiddenField.value);
    updatePartialDisplayField(hiddenField, displayField);
  });
  
  // เมื่อ input ใน hidden field
  hiddenField.addEventListener('input', () => {
    console.log(`${hiddenId} input:`, hiddenField.value);
    updatePartialDisplayField(hiddenField, displayField);
  });
}

/**
 * เปิด native date picker สำหรับหน้า partial
 */
function triggerPartialDatePicker(hiddenField) {
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
    console.error('Error triggering partial date picker:', error);
    // คืนค่าการซ่อน field
    hiddenField.style.pointerEvents = 'none';
    hiddenField.style.opacity = '0';
    hiddenField.style.position = 'absolute';
  }
}

/**
 * อัปเดต display field เมื่อเปลี่ยนค่าสำหรับหน้า partial
 */
function updatePartialDisplayField(hiddenField, displayField) {
  if (hiddenField.value) {
    const date = new Date(hiddenField.value);
    displayField.value = formatPartialDateToDDMMYYYY(date);
    
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
 * แปลง Date object เป็นรูปแบบ DD/MM/YYYY สำหรับหน้า partial
 */
function formatPartialDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * ดึงค่าวันที่จาก hidden date picker (ISO format) สำหรับหน้า partial
 */
function getPartialDateValue(fieldId) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  return hiddenField ? hiddenField.value : '';
}

/**
 * ตั้งค่าวันที่ให้ hidden date picker สำหรับหน้า partial
 */
function setPartialDateValue(fieldId, isoDate) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  const displayField = document.getElementById(fieldId);
  
  if (hiddenField && displayField) {
    hiddenField.value = isoDate;
    
    if (isoDate) {
      const date = new Date(isoDate);
      displayField.value = formatPartialDateToDDMMYYYY(date);
    } else {
      displayField.value = '';
    }
  }
}

// ================================================================
// TIME DROPDOWN FUNCTIONS - คัดลอกจาก confirm-complete.js
// ================================================================

/**
 * สร้าง options สำหรับ dropdown เวลา (ชั่วโมง 00-23 และนาที 00-59)
 * สำหรับหน้า partial-confirm
 */
function populatePartialTimeDropdowns() {
    console.log('🔄 populatePartialTimeDropdowns() called');
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
    
    console.log('✅ Partial time dropdowns populated successfully (24-hour format)');
}

/**
 * ดึงค่าเวลาจาก dropdown hour และ minute
 */
function getPartialTimeValue(hourId, minuteId) {
    const hourSelect = document.getElementById(hourId);
    const minuteSelect = document.getElementById(minuteId);
    
    if (!hourSelect || !minuteSelect) {
        console.warn(`Time dropdowns not found: ${hourId}, ${minuteId}`);
        return null;
    }
    
    const hour = hourSelect.value;
    const minute = minuteSelect.value;
    
    if (!hour || !minute) {
        return null;
    }
    
    return `${hour}:${minute}`;
}

/**
 * ตั้งค่าเวลาให้ dropdown hour และ minute
 */
function setPartialTimeValue(hourId, minuteId, timeString) {
    const hourSelect = document.getElementById(hourId);
    const minuteSelect = document.getElementById(minuteId);
    
    if (!hourSelect || !minuteSelect) {
        console.warn(`Time dropdowns not found: ${hourId}, ${minuteId}`);
        return;
    }
    
    if (!timeString) {
        hourSelect.value = '';
        minuteSelect.value = '';
        return;
    }
    
    const [hour, minute] = timeString.split(':');
    if (hour !== undefined && minute !== undefined) {
        hourSelect.value = hour.padStart(2, '0');
        minuteSelect.value = minute.padStart(2, '0');
    }
}

class PartialConfirmationManager {
    constructor() {
        this.planId = null;
        this.planData = null;
        this.partialData = {
            targetOutput: 0,
            totalProduced: 0,
            currentSession: 1,
            remainingQuantity: 0,
            sessions: []
        };
        this.isLoading = false;
        
        this.init();
    }

    /**
     * เริ่มต้นระบบ
     */
    async init() {
        console.log('🚀 Initializing Partial Confirmation System...');
        
        // ดึง Plan ID จาก URL
        this.planId = this.getPlanIdFromURL();
        if (!this.planId) {
            this.showError('ไม่พบรหัสแผนงาน กรุณาตรวจสอบ URL');
            return;
        }

        // ตั้งค่า Date Pickers และ Time Dropdowns
        setupPartialHiddenDatePickers();
        populatePartialTimeDropdowns();

        // โหลดข้อมูลแผนงาน
        await this.loadPlanData();
        
        // โหลดประวัติ partial confirmations
        await this.loadPartialHistory();
        
        // ตั้งค่า Event Listeners
        this.setupEventListeners();
        
        // แสดงฟอร์ม
        this.showForm();
        
        // อัปเดตการคำนวณครั้งแรกหลังจากโหลดข้อมูล
        this.updateCalculations();
        
        console.log('✅ System initialized successfully');
    }

    /**
     * ดึง Plan ID จาก URL
     */
    getPlanIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('planId') || urlParams.get('id');
    }

    /**
     * โหลดข้อมูลแผนงาน
     */
    async loadPlanData() {
        try {
            console.log('📡 Loading plan data for ID:', this.planId);
            
            // โหลดรายละเอียดแผนงานจาก plans.php
            const planResponse = await fetch(`api/plans.php?action=get_plan&PlanID=${this.planId}`);
            if (!planResponse.ok) {
                throw new Error(`Plans API Error: ${planResponse.status} ${planResponse.statusText}`);
            }
            
            const planResponseText = await planResponse.text();
            console.log('🔍 Plan API Raw Response:', planResponseText.substring(0, 200) + '...');
            
            let planResult;
            try {
                planResult = JSON.parse(planResponseText);
            } catch (parseError) {
                console.error('❌ Plans API JSON Parse Error:', parseError);
                throw new Error(`Invalid JSON from plans API: ${parseError.message}`);
            }
            console.log('🔍 Plan API Response:', planResult);
            
            // โหลดสถานะจาก partial-confirmations.php
            const statusResponse = await fetch(`api/partial-confirmations.php?action=get_plan_status&plan_id=${this.planId}`);
            if (!statusResponse.ok) {
                throw new Error(`Status API Error: ${statusResponse.status} ${statusResponse.statusText}`);
            }
            
            const statusResponseText = await statusResponse.text();
            console.log('🔍 Status API Raw Response:', statusResponseText.substring(0, 200) + '...');
            
            let statusResult;
            try {
                statusResult = JSON.parse(statusResponseText);
            } catch (parseError) {
                console.error('❌ Status API JSON Parse Error:', parseError);
                throw new Error(`Invalid JSON from status API: ${parseError.message}`);
            }
            console.log('🔍 Status API Response:', statusResult);
            
            if (planResult && statusResult.success && statusResult.data) {
                // รวมข้อมูลจากทั้งสอง API
                this.planData = {
                    ...planResult,  // ข้อมูลรายละเอียดแผนงาน
                    ...statusResult.data  // ข้อมูลสถานะและจำนวนผลิต
                };
                
                console.log('🔍 Combined Plan Data:', this.planData);
                
                // เก็บข้อมูล partial
                this.partialData.targetOutput = statusResult.data.targetOutput;
                this.partialData.totalProduced = statusResult.data.totalProduced;
                this.partialData.remainingQuantity = statusResult.data.remainingQuantity;
                this.partialData.currentSession = statusResult.data.lastSession + 1;
                
                console.log('🎯 API Response targetOutput:', statusResult.data.targetOutput);
                console.log('🎯 API Response totalProduced:', statusResult.data.totalProduced);
                console.log('🎯 API Response remainingQuantity:', statusResult.data.remainingQuantity);
                console.log('🎯 Saved to partialData.targetOutput:', this.partialData.targetOutput);
                console.log('🎯 Saved to partialData.totalProduced:', this.partialData.totalProduced);
                console.log('🎯 Saved to partialData.remainingQuantity:', this.partialData.remainingQuantity);
                console.log('✅ Plan data loaded:', this.planData);
                console.log('✅ Partial data updated:', this.partialData);
                
                this.updatePlanHeader();
                
                // ถ้าเสร็จแล้ว แสดงส่วนเสร็จสิ้น
                if (statusResult.data.isCompleted) {
                    await this.loadSessionHistory();
                    this.showCompletionSection();
                    return;
                }
                
            } else {
                throw new Error('Failed to load plan data or status');
            }
        } catch (error) {
            console.error('❌ Error loading plan data:', error);
            this.showError('ไม่สามารถโหลดข้อมูลแผนงานได้: ' + error.message);
        }
    }

    /**
     * โหลดประวัติ partial confirmations
     */
    async loadPartialHistory() {
        try {
            console.log('📡 Loading partial history...');
            
            // ใช้ API ของ partial-confirmations
            const response = await fetch(`api/partial-confirmations.php?action=get_partial_confirmations&plan_id=${this.planId}`);
            
            // Check if response is OK
            if (!response.ok) {
                console.error('❌ HTTP Error:', response.status, response.statusText);
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            // Get response text first to debug
            const responseText = await response.text();
            console.log('📡 Raw response:', responseText.substring(0, 200) + '...');
            
            // Try to parse JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                console.error('❌ Response text:', responseText);
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }
            
            if (result.success && result.data) {
                this.partialData.sessions = result.data.confirmations || [];
                
                console.log('✅ Partial history loaded:', this.partialData.sessions);
                
                // แสดงประวัติถ้ามี
                if (this.partialData.sessions.length > 0) {
                    this.showSessionHistory();
                }
                
            }
        } catch (error) {
            console.error('❌ Error loading partial history:', error);
            // ไม่ต้อง throw error เพราะอาจจะยังไม่มีประวัติ
        }
    }

    /**
     * โหลดรายละเอียด sessions ก่อนหน้า
     */
    async loadSessionHistory() {
        try {
            const response = await fetch(`api/partial-confirmations.php?action=get_partial_confirmations&plan_id=${this.planId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.partialData.sessions = result.data.confirmations || [];
                console.log('✅ Session history loaded:', this.partialData.sessions);
            }
        } catch (error) {
            console.error('❌ Error loading session history:', error);
        }
    }

    /**
     * แสดงประวัติ sessions
     */
    showSessionHistory() {
        const historySection = document.getElementById('sessionHistorySection');
        const historyContainer = document.getElementById('sessionHistoryContainer');
        
        if (this.partialData.sessions.length === 0) {
            historySection.style.display = 'none';
            return;
        }
        
        historySection.style.display = 'block';
        historyContainer.innerHTML = '';
        
        this.partialData.sessions.forEach(session => {
            const sessionCard = this.createSessionHistoryCard(session);
            historyContainer.appendChild(sessionCard);
        });
    }

    /**
     * สร้าง card แสดงประวัติ session
     */
    createSessionHistoryCard(session) {
        const div = document.createElement('div');
        div.className = 'col-md-3 col-sm-6';
        
        const startTime = new Date(session.ActualStartDateTime).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const endTime = new Date(session.ActualEndDateTime).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="card session-card border-info">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge badge-session bg-info">Session ${session.SessionNumber}</span>
                        <small class="text-muted">${startTime}-${endTime}</small>
                    </div>
                    <div class="row g-1 small">
                        <div class="col-6">
                            <strong class="text-success">${session.SessionGoodQuantity || (session.SessionQuantity - session.SessionRejectQuantity)}</strong>
                            <small class="text-muted d-block">ผลิตดี</small>
                        </div>
                        <div class="col-6">
                            <strong class="text-primary">${Math.round(session.WorkingMinutes || 0)}</strong>
                            <small class="text-muted d-block">นาทีสุทธิ</small>
                        </div>
                        <div class="col-6">
                            <strong class="text-danger">${session.SessionRejectQuantity || 0}</strong>
                            <small class="text-muted d-block">ของเสีย</small>
                        </div>
                        <div class="col-6">
                            <strong class="text-info">${session.SessionReworkQuantity || 0}</strong>
                            <small class="text-muted d-block">Rework</small>
                        </div>
                    </div>
                    ${session.Remark ? `
                        <div class="mt-2">
                            <small class="text-muted">หมายเหตุ: ${session.Remark.substring(0, 50)}${session.Remark.length > 50 ? '...' : ''}</small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        return div;
    }

    /**
     * อัปเดต header ข้อมูルแผนงาน
     */
    updatePlanHeader() {
        const planTitle = document.getElementById('planTitle');
        const targetBadge = document.getElementById('targetBadge');
        const producedBadge = document.getElementById('producedBadge');
        const remainingBadge = document.getElementById('remainingBadge');
        const sessionBadge = document.getElementById('sessionBadge');
        
        if (planTitle && this.planData) {
            // แสดงข้อมูลแผนงานที่ครบถ้วน
            const productName = this.planData.ProductDisplayName || this.planData.ProductName || 'แผนงาน';
            const lotNumber = this.planData.LotNumber || 'N/A';
            const department = this.planData.DepartmentName || '';
            const machineName = this.planData.MachineName || '';
            const plannedStartDate = this.planData.PlannedStartDate ? 
                new Date(this.planData.PlannedStartDate).toLocaleDateString('th-TH') : '';
            
            // สร้าง title ที่มีข้อมูลครบถ้วน
            let titleText = `${productName}`;
            if (lotNumber !== 'N/A') titleText += ` - Lot: ${lotNumber}`;
            if (department) titleText += ` | แผนก: ${department}`;
            if (machineName) titleText += ` | เครื่อง: ${machineName}`;
            if (plannedStartDate) titleText += ` | วันที่: ${plannedStartDate}`;
            
            planTitle.textContent = titleText;
        }
        
        console.log('🎯 updatePlanHeader - partialData object:', this.partialData);
        console.log('🎯 updatePlanHeader - Target Output:', this.partialData.targetOutput, typeof this.partialData.targetOutput);
        console.log('🎯 updatePlanHeader - Total Produced:', this.partialData.totalProduced, typeof this.partialData.totalProduced);
        console.log('🎯 updatePlanHeader - Remaining:', this.partialData.remainingQuantity, typeof this.partialData.remainingQuantity);
        
        if (targetBadge) targetBadge.textContent = `เป้าหมาย: ${this.partialData.targetOutput.toLocaleString()} ชิ้น`;
        if (producedBadge) producedBadge.textContent = `ผลิตแล้ว: ${this.partialData.totalProduced.toLocaleString()} ชิ้น`;
        if (remainingBadge) remainingBadge.textContent = `คงเหลือ: ${this.partialData.remainingQuantity.toLocaleString()} ชิ้น`;
        if (sessionBadge) sessionBadge.textContent = `Session: ${this.partialData.currentSession}`;
        
        // อัปเดตรายละเอียดแผนงาน
        this.updatePlanDetails();
        
        this.updateProgress();
    }

    /**
     * อัปเดตรายละเอียดแผนงาน
     */
    updatePlanDetails() {
        if (!this.planData) return;

        const planDetailsSection = document.getElementById('planDetailsSection');
        if (planDetailsSection) {
            planDetailsSection.style.display = 'block';
        }

        // อัปเดตข้อมูลรายละเอียด
        const productNameDisplay = document.getElementById('productNameDisplay');
        const departmentDisplay = document.getElementById('departmentDisplay');
        const machineDisplay = document.getElementById('machineDisplay');
        const plannedDateDisplay = document.getElementById('plannedDateDisplay');
        const plannedTimeDisplay = document.getElementById('plannedTimeDisplay');
        const standardRunRateDisplay = document.getElementById('standardRunRateDisplay');

        if (productNameDisplay) {
            const productName = this.planData.ProductDisplayName || this.planData.ProductName || '-';
            const productSize = this.planData.ProductSize || '';
            productNameDisplay.textContent = productSize ? `${productName} (${productSize})` : productName;
        }

        if (departmentDisplay) {
            departmentDisplay.textContent = this.planData.DepartmentName || '-';
        }

        if (machineDisplay) {
            machineDisplay.textContent = this.planData.MachineName || '-';
        }

        if (plannedDateDisplay) {
            const plannedDate = this.planData.PlannedStartDate ? 
                new Date(this.planData.PlannedStartDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : '-';
            plannedDateDisplay.textContent = plannedDate;
        }

        if (plannedTimeDisplay) {
            let timeText = '-';
            if (this.planData.PlannedStartTime && this.planData.PlannedEndTime) {
                const startTime = this.planData.PlannedStartTime.substring(0, 5); // HH:MM
                const endTime = this.planData.PlannedEndTime.substring(0, 5); // HH:MM
                timeText = `${startTime} - ${endTime} น.`;
            }
            plannedTimeDisplay.textContent = timeText;
        }

        if (standardRunRateDisplay) {
            const runRate = this.planData.StandardRunRate || 0;
            standardRunRateDisplay.textContent = `${runRate} ชิ้น/นาที`;
        }

        console.log('✅ Plan details updated');
    }

    /**
     * อัปเดต progress ring
     */
    updateProgress() {
        const progressCircle = document.getElementById('progressCircle');
        const progressText = document.getElementById('progressText');
        const currentSessionNumber = document.getElementById('currentSessionNumber');
        const currentRemaining = document.getElementById('currentRemaining');
        
        const percentage = this.partialData.targetOutput > 0 ? 
            (this.partialData.totalProduced / this.partialData.targetOutput) * 100 : 0;
        
        if (progressCircle) {
            const circumference = 2 * Math.PI * 52; // radius = 52
            const dashArray = (percentage / 100) * circumference;
            progressCircle.style.strokeDasharray = `${dashArray} ${circumference}`;
        }
        
        if (progressText) progressText.textContent = `${Math.round(percentage)}%`;
        if (currentSessionNumber) currentSessionNumber.textContent = this.partialData.currentSession;
        if (currentRemaining) currentRemaining.textContent = this.partialData.remainingQuantity;
    }

    /**
     * ตั้งค่า Event Listeners
     */
    setupEventListeners() {
        const form = document.getElementById('partialConfirmForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // เวลาเริ่ม-สิ้นสุด เปลี่ยนแปลง (ใช้ระบบ date picker + time dropdown)
        const timeElements = [
            'actualStartHour', 'actualStartMinute', 'actualEndHour', 'actualEndMinute'
        ];
        const downtimeInput = document.getElementById('downtimeMinutes');

        // Event listeners สำหรับเวลา
        timeElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', () => this.calculateNetWorkingTime());
            }
        });

        // Event listeners สำหรับเวลาพักและหยุดเครื่อง
        [downtimeInput].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.calculateNetWorkingTime();
                    this.calculateBreakTime();
                });
            }
        });

        // Event listeners สำหรับ break checkboxes (แบบใหม่)
        ['breakMorning', 'breakLunch', 'breakEvening'].forEach(checkboxId => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.calculateNetWorkingTime();
                    this.calculateBreakTime();
                });
            }
        });

        // จำนวนผลิต, ของเสีย, rework เปลี่ยนแปลง
        const sessionQuantity = document.getElementById('sessionQuantity');
        const rejectQuantity = document.getElementById('rejectQuantity');
        const reworkQuantity = document.getElementById('reworkQuantity');
        const Remark = document.getElementById('Remark');
        
        if (sessionQuantity) sessionQuantity.addEventListener('input', () => this.updateCalculations());
        if (rejectQuantity) rejectQuantity.addEventListener('input', () => this.updateCalculations());
        if (reworkQuantity) reworkQuantity.addEventListener('input', () => this.updateCalculations());
        if (Remark) Remark.addEventListener('input', () => this.updateRemarkDisplay());

        // ปุ่มอื่นๆ
        const proceedBtn = document.getElementById('proceedToFinalConfirmBtn');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.proceedToFinalConfirmation());
        }

        // ตั้งค่าเวลาเริ่มต้น
        this.setDefaultTimes();
    }

    /**
     * ตั้งค่าเวลาเริ่มต้น
     */
    setDefaultTimes() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // ตั้งค่าวันที่เริ่มต้น
        setPartialDateValue('actualStartDate', today);
        
        // ตั้งค่าเวลาเริ่มต้น
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        
        setPartialTimeValue('actualStartHour', 'actualStartMinute', `${currentHour}:${currentMinute}`);
    }

    /**
     * คำนวณและแสดงเวลาพักรวม (แบบใหม่ตาม confirm-complete)
     */
    calculateBreakTime() {
        const breakMorning = document.getElementById('breakMorning')?.checked ? 15 : 0;
        const breakLunch = document.getElementById('breakLunch')?.checked ? 60 : 0;
        const breakEvening = document.getElementById('breakEvening')?.checked ? 15 : 0;
        
        const totalBreakMinutes = breakMorning + breakLunch + breakEvening;
        
        // แสดงผลรวมเวลาพัก
        const breakTotalDisplay = document.getElementById('breakTotalDisplay');
        const breakTotalMinutesSpan = document.getElementById('breakTotalMinutes');
        
        if (totalBreakMinutes > 0) {
            if (breakTotalDisplay) breakTotalDisplay.style.display = 'block';
            if (breakTotalMinutesSpan) breakTotalMinutesSpan.textContent = totalBreakMinutes;
        } else {
            if (breakTotalDisplay) breakTotalDisplay.style.display = 'none';
        }
        
        return totalBreakMinutes;
    }

    /**
     * คำนวณเวลาทำงานสุทธิ
     */
    calculateNetWorkingTime() {
        // ดึงค่าวันที่และเวลา
        const startDate = getPartialDateValue('actualStartDate');
        const startTime = getPartialTimeValue('actualStartHour', 'actualStartMinute');
        const endDate = getPartialDateValue('actualEndDate');
        const endTime = getPartialTimeValue('actualEndHour', 'actualEndMinute');
        
        if (!startDate || !startTime || !endDate || !endTime) {
            document.getElementById('netWorkingTime').value = '0 นาที';
            return 0;
        }

        // สร้าง Date objects
        const startDateTime = new Date(`${startDate}T${startTime}:00`);
        const endDateTime = new Date(`${endDate}T${endTime}:00`);
        
        const totalMinutes = (endDateTime - startDateTime) / (1000 * 60);

        if (totalMinutes <= 0) {
            document.getElementById('netWorkingTime').value = '0 นาที';
            return 0;
        }

        // หักเวลาต่างๆ (ใช้ checkbox system แบบใหม่)
        const breakMorning = document.getElementById('breakMorning')?.checked ? 15 : 0;
        const breakLunch = document.getElementById('breakLunch')?.checked ? 60 : 0;
        const breakEvening = document.getElementById('breakEvening')?.checked ? 15 : 0;
        const downtime = parseInt(document.getElementById('downtimeMinutes')?.value || '0');

        const netMinutes = totalMinutes - breakMorning - breakLunch - breakEvening - downtime;
        const finalNetMinutes = Math.max(0, Math.round(netMinutes));

        document.getElementById('netWorkingTime').value = `${finalNetMinutes} นาที`;
        return finalNetMinutes;
    }

    /**
     * อัปเดตการคำนวณ
     */
    updateCalculations() {
        console.log('🔢 updateCalculations called');
        console.log('partialData:', this.partialData);
        
        const sessionQuantity = parseInt(document.getElementById('sessionQuantity')?.value || '0');
        const rejectQuantity = parseInt(document.getElementById('rejectQuantity')?.value || '0');
        const reworkQuantity = parseInt(document.getElementById('reworkQuantity')?.value || '0');
        
        console.log('Form inputs:', { sessionQuantity, rejectQuantity, reworkQuantity });
        
        const goodQuantity = Math.max(0, sessionQuantity - rejectQuantity);
        const newTotalProduced = this.partialData.totalProduced + goodQuantity;
        const remainingAfter = Math.max(0, this.partialData.targetOutput - newTotalProduced);
        
        console.log('Calculated values:', { goodQuantity, newTotalProduced, remainingAfter });
        
        // อัปเดต displays
        const goodQuantityDisplay = document.getElementById('goodQuantityDisplay');
        const totalProducedDisplay = document.getElementById('totalProducedDisplay');
        const remainingAfterDisplay = document.getElementById('remainingAfterDisplay');
        
        console.log('Display elements found:', {
            goodQuantityDisplay: !!goodQuantityDisplay,
            totalProducedDisplay: !!totalProducedDisplay, 
            remainingAfterDisplay: !!remainingAfterDisplay
        });
        
        if (goodQuantityDisplay) goodQuantityDisplay.textContent = goodQuantity;
        if (totalProducedDisplay) totalProducedDisplay.textContent = newTotalProduced;
        if (remainingAfterDisplay) remainingAfterDisplay.textContent = remainingAfter;
        
        // แสดงข้อมูล Rework
        const reworkDisplay = document.getElementById('reworkQuantityDisplay');
        if (reworkDisplay) {
            reworkDisplay.textContent = reworkQuantity;
        }
        
        const statusDisplay = document.getElementById('completionStatusDisplay');
        if (remainingAfter <= 0) {
            statusDisplay.innerHTML = '<span class="badge bg-success">เสร็จสิ้น</span>';
        } else {
            statusDisplay.innerHTML = '<span class="badge bg-warning">ยังไม่เสร็จ</span>';
        }

        // ตรวจสอบว่าจำนวนผลิตไม่เกิน remaining
        if (goodQuantity > this.partialData.remainingQuantity) {
            const sessionInput = document.getElementById('sessionQuantity');
            sessionInput.setCustomValidity(`จำนวนผลิตไม่ควรเกิน ${this.partialData.remainingQuantity} ชิ้น`);
        } else {
            document.getElementById('sessionQuantity').setCustomValidity('');
        }
    }

    /**
     * อัปเดตการแสดง Remark
     */
    updateRemarkDisplay() {
        const remarkText = document.getElementById('Remark')?.value || '';
        const remarkDisplay = document.getElementById('remarkPreview');
        if (remarkDisplay) {
            remarkDisplay.textContent = remarkText || 'ไม่มีหมายเหตุ';
        }
    }

    /**
     * จัดการการส่งฟอร์ม
     */
    async handleFormSubmit(event) {
        console.log('🔥 handleFormSubmit called');
        event.preventDefault();
        
        if (this.isLoading) {
            console.log('⚠️ Already loading, returning');
            return;
        }

        const form = event.target;
        console.log('📋 Form:', form);
        
        // ตรวจสอบความถูกต้องของฟอร์ม
        if (!form.checkValidity()) {
            console.log('❌ Form validation failed');
            form.classList.add('was-validated');
            
            // แสดง field ที่ไม่ผ่าน validation
            const invalidFields = form.querySelectorAll(':invalid');
            console.log('❌ Invalid fields:', invalidFields);
            invalidFields.forEach(field => {
                console.log(`❌ Invalid field: ${field.id} - ${field.validationMessage}`);
            });
            return;
        }

        console.log('✅ Form validation passed');
        this.isLoading = true;
        this.showLoading(true);

        try {
            console.log('📊 Collecting form data...');
            const formData = this.collectFormData();
            console.log('📊 Form data collected:', formData);
            
            console.log('💾 Saving partial confirmation...');
            await this.savePartialConfirmation(formData);
            
            // รีเฟรชข้อมูล
            await this.loadPartialHistory();
            
            if (this.partialData.remainingQuantity <= 0) {
                this.showCompletionSection();
            } else {
                // รีเซ็ตฟอร์มสำหรับ session ใหม่
                this.resetFormForNewSession();
                this.updatePlanHeader();
            }

        } catch (error) {
            console.error('❌ Error saving partial confirmation:', error);
            this.showToast('เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'danger');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * รวบรวมข้อมูลจากฟอร์ม
     */
    collectFormData() {
        console.log('📊 Starting collectFormData...');
        
        const sessionQuantity = parseInt(document.getElementById('sessionQuantity').value);
        const rejectQuantity = parseInt(document.getElementById('rejectQuantity').value || '0');
        const reworkQuantity = parseInt(document.getElementById('reworkQuantity')?.value || '0');
        
        console.log('📊 Quantities:', { sessionQuantity, rejectQuantity, reworkQuantity });
        
        // รวมวันที่และเวลา
        const startDate = getPartialDateValue('actualStartDate');
        const startTime = getPartialTimeValue('actualStartHour', 'actualStartMinute');
        const endDate = getPartialDateValue('actualEndDate');
        const endTime = getPartialTimeValue('actualEndHour', 'actualEndMinute');
        
        console.log('📊 Date/Time:', { startDate, startTime, endDate, endTime });
        
        const actualStartTime = `${startDate} ${startTime}:00`;
        const actualEndTime = `${endDate} ${endTime}:00`;
        
        // คำนวณเวลาทำงานสุทธิ
        const workingMinutes = this.calculateNetWorkingTime();
        
        console.log('📊 Formatted DateTime:', { actualStartTime, actualEndTime, workingMinutes });
        
        const data = {
            PlanID: parseInt(this.planId),
            SessionQuantity: sessionQuantity,
            SessionRejectQuantity: rejectQuantity,
            SessionReworkQuantity: reworkQuantity,
            WorkingMinutes: workingMinutes, // เพิ่มเวลาทำงานสุทธิ
            Remark: document.getElementById('Remark')?.value || '',
            ActualStartTime: actualStartTime,
            ActualEndTime: actualEndTime,
            BreakMorningMinutes: document.getElementById('breakMorning')?.checked ? 15 : 0,
            BreakLunchMinutes: document.getElementById('breakLunch')?.checked ? 60 : 0,
            BreakEveningMinutes: document.getElementById('breakEvening')?.checked ? 15 : 0,
            DowntimeMinutes: parseInt(document.getElementById('downtimeMinutes').value || '0'),
            DowntimeReason: document.getElementById('downtimeReason').value || '',
            CreatedBy: 'User'
        };
        
        console.log('📊 Final form data:', data);
        return data;
    }

    /**
     * บันทึก Partial Confirmation
     */
    async savePartialConfirmation(data) {
        console.log('💾 savePartialConfirmation called with data:', data);
        
        const url = `api/partial-confirmations.php?action=save_partial_confirmation`;
        console.log('💾 Making request to:', url);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('💾 Response received:', response);
            console.log('💾 Response status:', response.status);
            console.log('💾 Response ok:', response.ok);

            if (!response.ok) {
                // ดึง error message จาก response
                const errorText = await response.text();
                console.error('💾 Server Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 300)}`);
            }

            const responseText = await response.text();
            console.log('💾 Response text:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
                console.log('💾 Parsed result:', result);
            } catch (parseError) {
                console.error('💾 JSON parse error:', parseError);
                throw new Error('Invalid JSON response: ' + responseText.substring(0, 200));
            }

            if (!result.success) {
                throw new Error(result.error || 'การบันทึกล้มเหลว');
            }

            // อัปเดตข้อมูล partial จาก response
            if (result.data && result.data.progress) {
                const progress = result.data.progress;
                this.partialData.totalProduced = progress.totalProduced;
                this.partialData.remainingQuantity = progress.remainingQuantity;
                this.partialData.currentSession = progress.currentSession;
                console.log('💾 Updated partial data:', this.partialData);
            }

            this.showToast(result.message || 'บันทึกสำเร็จ!', 'success');
            return result.data;
            
        } catch (error) {
            console.error('💾 Error in savePartialConfirmation:', error);
            throw error;
        }
    }

    /**
     * รีเซ็ตฟอร์มสำหรับ session ใหม่
     */
    resetFormForNewSession() {
        const form = document.getElementById('partialConfirmForm');
        
        // เคลียร์ field ที่ต้องใส่ใหม่
        const fieldsToReset = [
            'actualStartTime', 'actualEndTime',
            'sessionQuantity', 'rejectQuantity',
            'downtimeMinutes', 'downtimeReason'
        ];
        
        fieldsToReset.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                if (field.type === 'number') {
                    field.value = '0';
                } else {
                    field.value = '';
                }
            }
        });

        // รีเซ็ต break time checkboxes (แบบใหม่)
        ['breakMorning', 'breakLunch', 'breakEvening'].forEach(checkboxId => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.checked = false;
            }
        });

        // ตั้งเวลาใหม่
        this.setDefaultTimes();
        
        // เคลียร์ validation
        form.classList.remove('was-validated');
        
        // อัปเดตการคำนวณ
        this.calculateNetWorkingTime();
        this.updateCalculations();

        // รีโหลดประวัติ
        this.showSessionHistory();
    }

    /**
     * แสดงส่วนเสร็จสิ้น
     */
    showCompletionSection() {
        document.getElementById('partialConfirmForm').style.display = 'none';
        document.getElementById('completionSection').style.display = 'block';

        // คำนวณข้อมูลสรุป
        const totalSessions = this.partialData.sessions.length;
        const totalRuntime = this.partialData.sessions.reduce((sum, session) => sum + (session.WorkingMinutes || 0), 0);
        const totalProduced = this.partialData.totalProduced;

        document.getElementById('totalSessionsDisplay').textContent = totalSessions;
        document.getElementById('totalRuntimeDisplay').textContent = `${totalRuntime} นาที`;
        document.getElementById('finalProducedDisplay').textContent = `${totalProduced} ชิ้น`;

        // อัปเดตสถานะ
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'เสร็จสิ้น';
            statusBadge.className = 'badge bg-success';
        }
    }

    /**
     * ไปยังหน้ายืนยันสุดท้าย
     */
    proceedToFinalConfirmation() {
        window.location.href = `confirm-complete.html?planId=${this.planId}`;
    }

    /**
     * แสดงฟอร์ม
     */
    showForm() {
        document.getElementById('loadingSection').style.display = 'none';
        document.getElementById('headerSection').style.display = 'block';
        document.getElementById('partialConfirmForm').style.display = 'block';
    }

    /**
     * แสดง Loading
     */
    showLoading(show) {
        const btn = document.getElementById('savePartialBtn');
        if (btn) {
            btn.disabled = show;
            if (show) {
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';
            } else {
                btn.innerHTML = '<i class="bi bi-save me-2"></i>บันทึก Session นี้';
            }
        }
    }

    /**
     * แสดง Toast
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('mainToast');
        const toastBody = document.getElementById('mainToastBody');
        
        if (toast && toastBody) {
            toastBody.textContent = message;
            toast.className = `toast border-${type}`;
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }

    /**
     * แสดงข้อผิดพลาด
     */
    showError(message) {
        console.error('❌ Error:', message);
        
        const loadingSection = document.getElementById('loadingSection');
        if (loadingSection) {
            loadingSection.innerHTML = `
                <div class="text-center text-danger py-5">
                    <i class="bi bi-exclamation-triangle fs-1 mb-3"></i>
                    <h5>เกิดข้อผิดพลาด</h5>
                    <p>${message}</p>
                    <button class="btn btn-outline-primary" onclick="window.location.reload()">
                        <i class="bi bi-arrow-clockwise me-2"></i>ลองใหม่
                    </button>
                </div>
            `;
        }
    }
}

// เริ่มต้นระบบเมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 Partial Confirmation page loaded');
    window.partialManager = new PartialConfirmationManager();
});
