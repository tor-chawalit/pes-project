// ================================================================
// ระบบ OEE (Overall Equipment Effectiveness) - Production Calendar
// ================================================================
// Main JavaScript file for production management and calendar system
// Author: GitHub Copilot Assistant
// Version: 2.0.0 (FullCalendar Integration)
// ================================================================

// ================================================================
// 2. GLOBAL STATE VARIABLES
// ================================================================

// FullCalendar instance และ ตัวแปรสถานะหลักของระบบ
let calendar;                 // FullCalendar instance
let plans = [];              // รายการแผนการผลิตทั้งหมดจากฐานข้อมูล ProductionPlans
let planIdCounter = 1;       // Counter สำหรับ PlanID ใหม่
let selectedEditPlan = null; // แผนที่เลือกสำหรับการแก้ไข

// ================================================================
// 2.1 HIDDEN DATE PICKER MANAGEMENT
// ================================================================

/**
 * ตั้งค่าการเชื่อมโยง Native Date Picker ที่ซ่อนไว้กับ Text Field ที่แสดงผล
 */
function setupHiddenDatePickers() {
  console.log('Setting up hidden date pickers...');
  
  // Setup Start Date
  setupDatePickerWithButton('startDate', 'startDateHidden', 'startDateBtn');
  
  // Setup End Date  
  setupDatePickerWithButton('endDate', 'endDateHidden', 'endDateBtn');
  
  console.log('Hidden date pickers setup completed');
}

/**
 * ตั้งค่า date picker พร้อมปุ่ม
 */
function setupDatePickerWithButton(displayId, hiddenId, buttonId) {
  const displayField = document.getElementById(displayId);
  const hiddenField = document.getElementById(hiddenId);
  const button = document.getElementById(buttonId);
  
  if (!displayField || !hiddenField || !button) {
    console.warn(`Date picker elements not found: ${displayId}, ${hiddenId}, ${buttonId}`);
    return;
  }
  
  console.log(`Setting up date picker: ${displayId} -> ${hiddenId} (button: ${buttonId})`);
  
  // เมื่อคลิกปุ่ม
  button.addEventListener('click', () => {
    console.log(`Button ${buttonId} clicked, triggering ${hiddenId}`);
    triggerDatePicker(hiddenField);
  });
  
  // เมื่อคลิกที่ display field
  displayField.addEventListener('click', () => {
    console.log(`Display field ${displayId} clicked, triggering ${hiddenId}`);
    triggerDatePicker(hiddenField);
  });
  
  // เมื่อ focus ที่ display field
  displayField.addEventListener('focus', () => {
    console.log(`Display field ${displayId} focused, triggering ${hiddenId}`);
    triggerDatePicker(hiddenField);
  });
  
  // ป้องกันการพิมพ์
  displayField.addEventListener('keydown', (e) => {
    e.preventDefault();
    triggerDatePicker(hiddenField);
  });
  
  // เมื่อเปลี่ยนค่าใน hidden field
  hiddenField.addEventListener('change', () => {
    console.log(`${hiddenId} changed to:`, hiddenField.value);
    updateDisplayField(hiddenField, displayField);
  });
  
  // เมื่อ input ใน hidden field
  hiddenField.addEventListener('input', () => {
    console.log(`${hiddenId} input:`, hiddenField.value);
    updateDisplayField(hiddenField, displayField);
  });
}

/**
 * เปิด native date picker
 */
function triggerDatePicker(hiddenField) {
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
    console.error('Error triggering date picker:', error);
    // คืนค่าการซ่อน field
    hiddenField.style.pointerEvents = 'none';
    hiddenField.style.opacity = '0';
    hiddenField.style.position = 'absolute';
  }
}

/**
 * อัปเดต display field เมื่อเปลี่ยนค่า
 */
function updateDisplayField(hiddenField, displayField) {
  if (hiddenField.value) {
    const date = new Date(hiddenField.value);
    displayField.value = formatDateToDDMMYYYY(date);
    
    // เพิ่ม visual feedback
    displayField.classList.add('is-valid');
    displayField.classList.remove('is-invalid');
    setTimeout(() => displayField.classList.remove('is-valid'), 2000);
    
    console.log(`Updated ${displayField.id} to: ${displayField.value}`);
  } else {
    displayField.value = '';
    displayField.classList.remove('is-valid', 'is-invalid');
  }
  
  // อัปเดตการคำนวณระยะเวลา
  if (window.updateDurationDisplay) {
    updateDurationDisplay();
  }
}

/**
 * แปลง Date object เป็นรูปแบบ DD/MM/YYYY
 */
function formatDateToDDMMYYYY(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * แปลงรูปแบบ DD/MM/YYYY เป็น Date object
 */
function parseDDMMYYYY(dateString) {
  if (!dateString) return null;
  const parts = dateString.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

/**
 * ดึงค่าวันที่จาก hidden date picker (ISO format)
 */
function getDateValue(fieldId) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  return hiddenField ? hiddenField.value : '';
}

/**
 * ตั้งค่าวันที่ให้ hidden date picker
 */
function setDateValue(fieldId, isoDate) {
  const hiddenField = document.getElementById(fieldId + 'Hidden');
  const displayField = document.getElementById(fieldId);
  
  if (hiddenField && displayField) {
    hiddenField.value = isoDate;
    
    if (isoDate) {
      const date = new Date(isoDate);
      displayField.value = formatDateToDDMMYYYY(date);
    } else {
      displayField.value = '';
    }
  }
}

// ================================================================
// 2.1 TIME DROPDOWN MANAGEMENT
// ================================================================

/**
 * สร้าง options สำหรับ dropdown เวลา (ชั่วโมง 00-23 และนาที 00-59)
 */
function populateTimeDropdowns() {
    const timeSelects = ['startHour', 'endHour', 'startMinute', 'endMinute'];
    
    timeSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn(`Element with ID '${selectId}' not found`);
            return;
        }
        
        // ล้าง options เดิม แต่เก็บ default option
        const defaultOption = select.querySelector('option[value=""]');
        select.innerHTML = '';
        if (defaultOption) {
            select.appendChild(defaultOption);
        }
        
        if (selectId.includes('Hour')) {
            // สร้าง options 00-23 สำหรับชั่วโมง
            for (let i = 0; i <= 23; i++) {
                const option = document.createElement('option');
                const hourValue = String(i).padStart(2, '0');
                option.value = hourValue;
                option.textContent = hourValue;
                select.appendChild(option);
            }
        } else if (selectId.includes('Minute')) {
            // สร้าง options 00-59 สำหรับนาที
            for (let i = 0; i <= 59; i++) {
                const option = document.createElement('option');
                const minuteValue = String(i).padStart(2, '0');
                option.value = minuteValue;
                option.textContent = minuteValue;
                select.appendChild(option);
            }
        }
    });
    
    console.log('Time dropdowns populated successfully');
}

/**
 * ดึงค่าเวลาจาก dropdown hour และ minute
 * @param {string} hourSelectId - ID ของ select element สำหรับชั่วโมง
 * @param {string} minuteSelectId - ID ของ select element สำหรับนาที
 * @returns {string|null} เวลาในรูปแบบ HH:MM:SS หรือ null ถ้าไม่ได้เลือก
 */
function getFormTimeValue(hourSelectId, minuteSelectId) {
    const hourElement = document.getElementById(hourSelectId);
    const minuteElement = document.getElementById(minuteSelectId);
    
    if (!hourElement || !minuteElement) {
        console.error(`Time elements not found: ${hourSelectId}, ${minuteSelectId}`);
        return null;
    }
    
    const hour = hourElement.value;
    const minute = minuteElement.value;
    
    if (!hour || !minute) {
        return null;
    }
    
    return `${hour}:${minute}:00`;
}

// ================================================================
// 2.3 BREAK TIME AND SETUP TIME MANAGEMENT
// ================================================================

/**
 * คำนวณเวลาพักรวมจาก checkbox และ input ที่เลือกไว้
 * @returns {number} เวลาพักรวมในหน่วยนาที
 */
function calculateTotalBreakTime() {
    let totalBreakMinutes = 0;
    
    // พักเช้า
    const breakMorning = document.getElementById('breakMorning');
    const breakMorningMinutes = document.getElementById('breakMorningMinutes');
    if (breakMorning && breakMorning.checked && breakMorningMinutes) {
        totalBreakMinutes += parseInt(breakMorningMinutes.value || 0);
    }
    
    // พักกลางวัน
    const breakLunch = document.getElementById('breakLunch');
    const breakLunchMinutes = document.getElementById('breakLunchMinutes');
    if (breakLunch && breakLunch.checked && breakLunchMinutes) {
        totalBreakMinutes += parseInt(breakLunchMinutes.value || 0);
    }
    
    // พักเย็น
    const breakEvening = document.getElementById('breakEvening');
    const breakEveningMinutes = document.getElementById('breakEveningMinutes');
    if (breakEvening && breakEvening.checked && breakEveningMinutes) {
        totalBreakMinutes += parseInt(breakEveningMinutes.value || 0);
    }
    
    // อัปเดตการแสดงผล
    const totalBreakTimeDisplay = document.getElementById('totalBreakTime');
    if (totalBreakTimeDisplay) {
        totalBreakTimeDisplay.textContent = totalBreakMinutes;
    }
    
    return totalBreakMinutes;
}

/**
 * อัปเดตการแสดงผลเวลาพักและ Setup ในส่วน duration display
 * @param {number} totalBreakMinutes - เวลาพักรวม (นาที)
 * @param {number} setupTimeMinutes - เวลา Setup (นาที)
 */
function updateBreakSetupDisplay(totalBreakMinutes, setupTimeMinutes) {
    const breakTimeDisplay = document.getElementById('breakTimeDisplay');
    const setupTimeDisplay = document.getElementById('setupTimeDisplay');
    
    if (breakTimeDisplay) {
        breakTimeDisplay.textContent = totalBreakMinutes;
    }
    
    if (setupTimeDisplay) {
        setupTimeDisplay.textContent = setupTimeMinutes;
    }
}

/**
 * ตั้งค่า Event Listeners สำหรับ Break time controls
 * @param {Function} calculateDurationCallback - ฟังก์ชันสำหรับคำนวณระยะเวลาใหม่
 */
function setupBreakTimeEventListeners(calculateDurationCallback) {
    console.log('Setting up break time event listeners...');
    
    // Break time checkboxes
    const breakCheckboxes = ['breakMorning', 'breakLunch', 'breakEvening'];
    const breakInputs = ['breakMorningMinutes', 'breakLunchMinutes', 'breakEveningMinutes'];
    
    breakCheckboxes.forEach((checkboxId, index) => {
        const checkbox = document.getElementById(checkboxId);
        const input = document.getElementById(breakInputs[index]);
        
        if (checkbox && input) {
            // เมื่อ checkbox เปลี่ยน
            checkbox.addEventListener('change', function() {
                input.disabled = !this.checked;
                if (!this.checked) {
                    input.value = checkboxId === 'breakLunch' ? 60 : 15; // ค่าเริ่มต้น
                }
                calculateTotalBreakTime();
                if (calculateDurationCallback) calculateDurationCallback();
            });
            
            // เมื่อ input value เปลี่ยน
            input.addEventListener('input', function() {
                // ตรวจสอบค่าที่ป้อน
                let value = parseInt(this.value || 0);
                if (value < 0) value = 0;
                if (value > 120) value = 120;
                this.value = value;
                
                calculateTotalBreakTime();
                if (calculateDurationCallback) calculateDurationCallback();
            });
            
            // เริ่มต้นสถานะ input ตาม checkbox
            input.disabled = !checkbox.checked;
        }
    });
    
    console.log('Break time event listeners setup completed');
}

/**
 * ตั้งค่า Event Listeners สำหรับ Setup time controls
 * @param {Function} calculateDurationCallback - ฟังก์ชันสำหรับคำนวณระยะเวลาใหม่
 */
function setupSetupTimeEventListeners(calculateDurationCallback) {
    console.log('Setting up setup time event listeners...');
    
    const setupTimeMinutes = document.getElementById('setupTimeMinutes');
    const setupNotes = document.getElementById('setupNotes');
    
    if (setupTimeMinutes) {
        setupTimeMinutes.addEventListener('input', function() {
            // ตรวจสอบค่าที่ป้อน
            let value = parseInt(this.value || 0);
            if (value < 0) value = 0;
            if (value > 480) value = 480; // สูงสุด 8 ชั่วโมง
            this.value = value;
            
            if (calculateDurationCallback) calculateDurationCallback();
        });
    }
    
    console.log('Setup time event listeners setup completed');
}

/**
 * รีเซ็ต Break time และ Setup time เป็นค่าเริ่มต้น
 */
function resetBreakAndSetupTime() {
    console.log('Resetting break and setup time to default values...');
    
    // รีเซ็ต Break time checkboxes และ inputs
    const breakMorning = document.getElementById('breakMorning');
    const breakLunch = document.getElementById('breakLunch');
    const breakEvening = document.getElementById('breakEvening');
    
    const breakMorningMinutes = document.getElementById('breakMorningMinutes');
    const breakLunchMinutes = document.getElementById('breakLunchMinutes');
    const breakEveningMinutes = document.getElementById('breakEveningMinutes');
    
    if (breakMorning) {
        breakMorning.checked = false;
        if (breakMorningMinutes) {
            breakMorningMinutes.value = 15;
            breakMorningMinutes.disabled = true;
        }
    }
    
    if (breakLunch) {
        breakLunch.checked = true; // เริ่มต้นเลือกพักกลางวัน
        if (breakLunchMinutes) {
            breakLunchMinutes.value = 60;
            breakLunchMinutes.disabled = false;
        }
    }
    
    if (breakEvening) {
        breakEvening.checked = false;
        if (breakEveningMinutes) {
            breakEveningMinutes.value = 15;
            breakEveningMinutes.disabled = true;
        }
    }
    
    // รีเซ็ต Setup time
    const setupTimeMinutes = document.getElementById('setupTimeMinutes');
    const setupNotes = document.getElementById('setupNotes');
    
    if (setupTimeMinutes) {
        setupTimeMinutes.value = 30;
    }
    
    if (setupNotes) {
        setupNotes.value = '';
    }
    
    // อัปเดตการแสดงผล
    calculateTotalBreakTime();
    
    // อัปเดต duration display
    const durationDisplay = document.getElementById('durationDisplay');
    const netWorkingTimeDisplay = document.getElementById('netWorkingTime');
    
    if (durationDisplay) {
        durationDisplay.textContent = '-';
        durationDisplay.className = '';
    }
    
    if (netWorkingTimeDisplay) {
        netWorkingTimeDisplay.textContent = '-';
        netWorkingTimeDisplay.className = '';
    }
    
    console.log('Break and setup time reset completed');
}

// ================================================================
// 3. MULTI-STEP FORM MANAGEMENT CLASS
// ================================================================

/**
 * จัดการฟอร์มแบบหลายขั้นตอนสำหรับการเพิ่ม/แก้ไขงาน
 * ประกอบด้วย 3 ขั้นตอน: 1) เลือกแผนก/เครื่องจักร 2) รายละเอียดงาน 3) เวลาดำเนินการ
 */
class FormStepManager {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 3;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    // ตรวจสอบให้แน่ใจว่า DOM โหลดเสร็จแล้ว
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        setupHiddenDatePickers(); // เพิ่มการตั้งค่า hidden date pickers
      });
    } else {
      this.setupEventListeners();
      setupHiddenDatePickers(); // เพิ่มการตั้งค่า hidden date pickers
    }
    
    this.initialized = true;
  }

  setupEventListeners() {
    console.log('Setting up FormStepManager event listeners...');
    
    // ค้นหาปุ่มต่างๆ
    const nextBtn = document.getElementById('nextStepBtn');
    const prevBtn = document.getElementById('prevStepBtn');
    const submitBtn = document.getElementById('submitJobBtn'); // Changed to correct ID

    console.log('Next button:', nextBtn);
    console.log('Prev button:', prevBtn);
    console.log('Submit button:', submitBtn);

    // Setup next button
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Next button clicked, current step:', this.currentStep);
        this.nextStep();
      });
      console.log('Next button event listener added');
    } else {
      console.error('Next button not found!');
    }

    // Setup previous button  
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Previous button clicked, current step:', this.currentStep);
        this.prevStep();
      });
      console.log('Previous button event listener added');
    } else {
      console.log('Previous button not found (OK for step 1)');
    }

    // Setup submit button
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Submit button clicked');
        // Validate last step before submit
        if (this.validateStep(this.currentStep)) {
          // Trigger form submit
          const form = document.getElementById('addJobForm');
          if (form) {
            form.dispatchEvent(new Event('submit'));
          }
        }
      });
      console.log('Submit button event listener added');
    } else {
      console.log('Submit button not found (OK if not on last step)');
    }
    
    // Duration calculation
    this.setupDurationCalculation();
    
    // Real-time updates
    this.setupRealTimeUpdates();

    // Initialize display
    this.updateStepDisplay();
    console.log('FormStepManager initialization complete');
  }

  nextStep() {
    console.log(`Attempting to go to next step. Current: ${this.currentStep}, Total: ${this.totalSteps}`);
    
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        console.log(`Moving to step ${this.currentStep}`);
        this.updateStepDisplay();
      } else {
        console.log('Already at last step');
      }
    } else {
      console.log('Validation failed for current step');
    }
  }

  prevStep() {
    console.log(`Attempting to go to previous step. Current: ${this.currentStep}`);
    
    if (this.currentStep > 1) {
      this.currentStep--;
      console.log(`Moving to step ${this.currentStep}`);
      this.updateStepDisplay();
    } else {
      console.log('Already at first step');
    }
  }

  updateStepDisplay() {
    console.log(`Updating step display for step ${this.currentStep}`);
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
      const stepNum = index + 1;
      step.classList.remove('active', 'completed');
      
      if (stepNum < this.currentStep) {
        step.classList.add('completed');
        console.log(`Step indicator ${stepNum} marked as completed`);
      } else if (stepNum === this.currentStep) {
        step.classList.add('active');
        console.log(`Step indicator ${stepNum} marked as active`);
      }
    });

    // Update progress line
    const progressLine = document.querySelector('.progress-line');
    if (progressLine) {
      progressLine.className = `progress-line step-${this.currentStep}`;
      console.log(`Progress line updated to step-${this.currentStep}`);
    }

    // Update form steps - Use display instead of class
    document.querySelectorAll('.form-step').forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum === this.currentStep) {
        step.style.display = 'block';
        console.log(`Form step ${stepNum} shown`);
      } else {
        step.style.display = 'none';
        console.log(`Form step ${stepNum} hidden`);
      }
    });

    // Update navigation buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const submitBtn = document.getElementById('submitJobBtn'); // Changed from 'submitBtn'

    console.log('Navigation buttons:', { prevBtn, nextBtn, submitBtn });

    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
      console.log(`Previous button ${this.currentStep > 1 ? 'shown' : 'hidden'}`);
    }

    if (this.currentStep === this.totalSteps) {
      if (nextBtn) {
        nextBtn.style.display = 'none';
        console.log('Next button hidden (last step)');
      }
      if (submitBtn) {
        submitBtn.style.display = 'inline-block';
        console.log('Submit button shown (last step)');
      }
    } else {
      if (nextBtn) {
        nextBtn.style.display = 'inline-block';
        console.log('Next button shown');
      }
      if (submitBtn) {
        submitBtn.style.display = 'none';
        console.log('Submit button hidden');
      }
    }
  }

  validateStep(step) {
    console.log(`Validating step ${step}`);
    
    const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!currentStepElement) {
      console.log(`Step element not found for step ${step}, assuming valid`);
      return true; // ถ้าไม่มี step element ให้ถือว่าผ่าน
    }

    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;

    console.log(`Found ${requiredFields.length} required fields in step ${step}`);

    requiredFields.forEach((field, index) => {
      const fieldValue = field.value ? field.value.trim() : '';
      console.log(`Field ${index + 1} (${field.name || field.id}): "${fieldValue}"`);
      
      if (!fieldValue) {
        field.classList.add('is-invalid');
        isValid = false;
        console.log(`Field ${field.name || field.id} is invalid`);
      } else {
        field.classList.remove('is-invalid');
      }
    });

    // Special validation for each step
    if (step === 1) {
      // Validate department and machine selection
      const departmentSelect = document.getElementById('department');
      const selectedMachines = document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked');
      
      console.log('Department selected:', departmentSelect ? departmentSelect.value : 'none');
      console.log('Machines selected:', selectedMachines.length);
      
      if (!departmentSelect || !departmentSelect.value) {
        isValid = false;
        console.log('Department validation failed');
        if (departmentSelect) departmentSelect.classList.add('is-invalid');
      }
      
      if (selectedMachines.length === 0) {
        showToast('กรุณาเลือกเครื่องจักรอย่างน้อย 1 เครื่อง', 'warning');
        isValid = false;
        console.log('Machine validation failed - no machines selected');
      }
    }

    if (step === 2) {
      // Validate job details - ใช้ dropdown แทน radio buttons
      const product = document.getElementById('product');
      const size = document.getElementById('size');
      const lotNumber = document.getElementById('lotNumber');
      const lotSize = document.getElementById('lotSize');
      const workerCount = document.getElementById('workerCount');
      
      // ตรวจสอบการเลือกผลิตภัณฑ์
      if (product && !product.value) {
        product.classList.add('is-invalid');
        showToast('กรุณาเลือกผลิตภัณฑ์', 'warning');
        isValid = false;
      } else if (product) {
        product.classList.remove('is-invalid');
      }
      
      // ตรวจสอบการเลือกขนาด (ถ้ามี)
      if (size && !size.disabled && !size.value) {
        size.classList.add('is-invalid');
        showToast('กรุณาเลือกขนาดผลิตภัณฑ์', 'warning');
        isValid = false;
      } else if (size) {
        size.classList.remove('is-invalid');
      }
      
      // ตรวจสอบ Lot Number
      if (lotNumber && !lotNumber.value.trim()) {
        lotNumber.classList.add('is-invalid');
        isValid = false;
      } else if (lotNumber) {
        lotNumber.classList.remove('is-invalid');
      }
      
      // ตรวจสอบ Lot Size
      if (lotSize && (!lotSize.value || parseInt(lotSize.value) <= 0)) {
        lotSize.classList.add('is-invalid');
        isValid = false;
      } else if (lotSize) {
        lotSize.classList.remove('is-invalid');
      }
      
      // ตรวจสอบจำนวนคนงาน
      if (workerCount && (!workerCount.value || parseInt(workerCount.value) <= 0)) {
        workerCount.classList.add('is-invalid');
        isValid = false;
      } else if (workerCount) {
        workerCount.classList.remove('is-invalid');
      }
    }

    if (step === 3) {
      // Validate time settings - ใช้ hidden date fields
      const startDateHidden = document.getElementById('startDateHidden');
      const endDateHidden = document.getElementById('endDateHidden');
      
      // ตรวจสอบวันที่
      const dateFields = [startDateHidden, endDateHidden];
      dateFields.forEach(field => {
        if (field && !field.value) {
          field.classList.add('is-invalid');
          // เพิ่มการแสดง validation ใน display field ด้วย
          const displayField = document.getElementById(field.id.replace('Hidden', ''));
          if (displayField) {
            displayField.classList.add('is-invalid');
          }
          isValid = false;
        } else if (field) {
          field.classList.remove('is-invalid');
          // ลบ validation จาก display field ด้วย
          const displayField = document.getElementById(field.id.replace('Hidden', ''));
          if (displayField) {
            displayField.classList.remove('is-invalid');
          }
        }
      });
      
      // ตรวจสอบเวลาจาก dropdown
      const startHour = document.getElementById('startHour');
      const startMinute = document.getElementById('startMinute');
      const endHour = document.getElementById('endHour');
      const endMinute = document.getElementById('endMinute');
      
      const timeSelects = [startHour, startMinute, endHour, endMinute];
      timeSelects.forEach(field => {
        if (field && !field.value) {
          field.classList.add('is-invalid');
          isValid = false;
        } else if (field) {
          field.classList.remove('is-invalid');
        }
      });
      
      // ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่มต้น - ใช้ hidden date fields
      if (startDateHidden && startDateHidden.value && endDateHidden && endDateHidden.value &&
          startHour && startHour.value && startMinute && startMinute.value &&
          endHour && endHour.value && endMinute && endMinute.value) {
        
        const startTime = `${startHour.value}:${startMinute.value}:00`;
        const endTime = `${endHour.value}:${endMinute.value}:00`;
        
        const startDateTime = new Date(`${startDateHidden.value}T${startTime}`);
        const endDateTime = new Date(`${endDateHidden.value}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
          [endHour, endMinute].forEach(field => field.classList.add('is-invalid'));
          isValid = false;
        }
      }
    }

    if (!isValid) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
    }

    console.log(`Step ${step} validation result:`, isValid);
    return isValid;
  }

  setupDurationCalculation() {
    const startDateHidden = document.getElementById('startDateHidden');
    const endDateHidden = document.getElementById('endDateHidden');
    const startHour = document.getElementById('startHour');
    const startMinute = document.getElementById('startMinute');
    const endHour = document.getElementById('endHour');
    const endMinute = document.getElementById('endMinute');
    const durationDisplay = document.getElementById('durationDisplay');

    const calculateDuration = () => {
      if (startDateHidden.value && endDateHidden.value && 
          startHour.value && startMinute.value && 
          endHour.value && endMinute.value) {
        
        const startTime = `${startHour.value}:${startMinute.value}:00`;
        const endTime = `${endHour.value}:${endMinute.value}:00`;
        
        const startDateTime = new Date(`${startDateHidden.value}T${startTime}`);
        const endDateTime = new Date(`${endDateHidden.value}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
          if (durationDisplay) {
            durationDisplay.textContent = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
            durationDisplay.className = 'text-danger';
          }
          // รีเซ็ต net working time
          const netWorkingTimeDisplay = document.getElementById('netWorkingTime');
          if (netWorkingTimeDisplay) {
            netWorkingTimeDisplay.textContent = '-';
          }
          return;
        }
        
        const diffMs = endDateTime - startDateTime;
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        // คำนวณเวลาพักรวม
        const totalBreakMinutes = calculateTotalBreakTime();
        
        // คำนวณเวลา Setup
        const setupTimeMinutes = parseInt(document.getElementById('setupTimeMinutes')?.value || 0);
        
        // คำนวณเวลาทำงานสุทธิ
        const netWorkingMinutes = totalMinutes - totalBreakMinutes - setupTimeMinutes;
        const netHours = Math.floor(netWorkingMinutes / 60);
        const netMins = netWorkingMinutes % 60;
        
        if (durationDisplay) {
          durationDisplay.textContent = `${hours} ชั่วโมง ${minutes} นาที`;
          durationDisplay.className = '';
        }
        
        // แสดงเวลาทำงานสุทธิ
        const netWorkingTimeDisplay = document.getElementById('netWorkingTime');
        if (netWorkingTimeDisplay) {
          if (netWorkingMinutes > 0) {
            netWorkingTimeDisplay.textContent = `${netHours} ชั่วโมง ${netMins} นาที`;
            netWorkingTimeDisplay.className = 'text-success';
          } else {
            netWorkingTimeDisplay.textContent = 'เวลาไม่เพียงพอ';
            netWorkingTimeDisplay.className = 'text-danger';
          }
        }
        
        // อัปเดตการแสดงเวลาพักและ Setup
        updateBreakSetupDisplay(totalBreakMinutes, setupTimeMinutes);
        
      } else {
        if (durationDisplay) {
          durationDisplay.textContent = '-';
          durationDisplay.className = '';
        }
        const netWorkingTimeDisplay = document.getElementById('netWorkingTime');
        if (netWorkingTimeDisplay) {
          netWorkingTimeDisplay.textContent = '-';
          netWorkingTimeDisplay.className = '';
        }
      }
    };

    // เพิ่ม global function สำหรับเรียกจากที่อื่น
    window.updateDurationDisplay = calculateDuration;

    [startDateHidden, endDateHidden, startHour, startMinute, endHour, endMinute].forEach(element => {
      if (element) {
        element.addEventListener('change', calculateDuration);
      }
    });

    // เพิ่ม Event Listeners สำหรับ Break time และ Setup time
    setupBreakTimeEventListeners(calculateDuration);
    setupSetupTimeEventListeners(calculateDuration);
  }

  setupRealTimeUpdates() {
    // Update current date time
    const updateDateTime = () => {
      const now = new Date();
      const dateTimeElement = document.getElementById('currentDateTime');
      if (dateTimeElement) {
        const dateStr = Utils.formatDate(now);
        const timeStr = Utils.formatTime(now, false);
        dateTimeElement.textContent = `${dateStr} ${timeStr}`;
      }
    };

    updateDateTime();
    setInterval(updateDateTime, 30000); // Update every 30 seconds
    
    // Update status counts
    this.updateStatusCounts();
  }

  updateStatusCounts() {
    try {
      // นับจากแผนงานทั้งหมด (ไม่ใช้ฟิลเตอร์) เพื่อแสดงสถิติที่ถูกต้อง
      const allPlans = PlanManager.getAllPlans();
      const counts = {
        planning: 0,
        'in-progress': 0,
        completed: 0,
        cancelled: 0
      };

      console.log('updateStatusCounts: Total plans:', allPlans.length);
      
      allPlans.forEach(plan => {
        console.log(`Plan ${plan.PlanID}: Status = ${plan.Status}`);
        
        if (counts.hasOwnProperty(plan.Status)) {
          counts[plan.Status]++;
        }
      });
      
      console.log('Status counts:', counts);

      // Update count displays
      const planningCountEl = document.getElementById('planningCount');
      const inProgressCountEl = document.getElementById('inProgressCount');
      const completedCountEl = document.getElementById('completedCount');
      const cancelledCountEl = document.getElementById('cancelledCount');

      if (planningCountEl) {
        planningCountEl.textContent = counts.planning;
        console.log('Updated planningCount:', counts.planning);
      }
      if (inProgressCountEl) {
        inProgressCountEl.textContent = counts['in-progress'];
        console.log('Updated inProgressCount:', counts['in-progress']);
      }
      if (completedCountEl) {
        completedCountEl.textContent = counts.completed;
        console.log('Updated completedCount:', counts.completed);
      }
      if (cancelledCountEl) {
        cancelledCountEl.textContent = counts.cancelled;
        console.log('Updated cancelledCount:', counts.cancelled);
      }
    } catch (error) {
      console.error('updateStatusCounts error:', error);
      // ไม่แสดง toast เพราะเป็น non-critical error
    }
  }

  reset() {
    this.currentStep = 1;
    this.updateStepDisplay();
  }
}

// Initialize form step manager
let formStepManager;
document.addEventListener('DOMContentLoaded', () => {
  formStepManager = new FormStepManager();
  formStepManager.init(); // เพิ่มการเรียก init()
  
  // เพิ่มการ populate time dropdowns
  populateTimeDropdowns();
  
  // เริ่มต้นค่า Break time และ Setup time
  setTimeout(() => {
    resetBreakAndSetupTime();
  }, 500);
});

// ================================================================
// 3. UTILITY CLASSES AND HELPER FUNCTIONS
// ================================================================

/**
 * ฟังก์ชันแปลงวันที่สำหรับ FullCalendar โดยไม่มีการแปลง timezone
 */
function formatDateForFullCalendar(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * คลาสยูทิลิตี้สำหรับการจัดการวันที่ เวลา และการจัดรูปแบบข้อมูล
 */
class Utils {
  // จัดรูปแบบวันที่เป็น DD/MM/YYYY (รูปแบบไทย)
  static formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // จัดรูปแบบวันที่และเวลาแบบไทย
  static formatDateTime(date, options = {}) {
    const d = new Date(date);
    const dateStr = this.formatDate(d);
    const timeStr = this.formatTime(d, false);
    return `${dateStr} ${timeStr}`;
  }

  // จัดรูปแบบเวลาแบบไทย 24 ชั่วโมง (HH:MM:SS)
  static formatTime(date, includeSeconds = true) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    if (includeSeconds) {
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    return `${hours}:${minutes}`;
  }

  // จัดรูปแบบวันที่สำหรับแสดงผลแบบเต็ม (เช่น วันจันทร์ที่ 04/08/2025)
  static formatDateFull(date) {
    const d = new Date(date);
    const weekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const weekday = weekdays[d.getDay()];
    const dateStr = this.formatDate(d);
    return `วัน${weekday}ที่ ${dateStr}`;
  }

  // คำนวณระยะเวลาระหว่างจุดเริ่มต้นและสิ้นสุด (หน่วยชั่วโมง)
  static calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    // ถ้าเวลาหรือวันที่ไม่ถูกต้อง ให้คืนค่า 0
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    // แสดงเป็น x.y ชั่วโมง (เช่น 1.5)
    return Math.round((hours + minutes / 60) * 10) / 10;
  }
}

// ================================================================
// 4. REMOVED: HISTORY MANAGEMENT 
// ================================================================
// History management has been removed as it was not being used in the system

// ================================================================
// 5. TASK MANAGEMENT (DATABASE OPERATIONS)
// ================================================================

/**
 * จัดการแผนการผลิตในระบบ รวมถึงการเพิ่ม แก้ไข ลบ และดึงข้อมูลจากฐานข้อมูล ProductionPlans
 * ประกอบด้วยฟังก์ชันหลักสำหรับ CRUD operations และการกรองข้อมูล
 */
class PlanManager {
  // ดึงแผนงานทั้งหมดจากฐานข้อมูล (รวมแผนที่ยืนยันแล้ว)
  static getAllPlans() {
    // คืน plans จาก DB เท่านั้น
    return [...plans];
  }
  
  // ดึงแผนงานที่ผ่านการกรองแล้ว (สำหรับแสดงในปฏิทิน)
  static getFilteredPlans() {
    const allPlans = this.getAllPlans();
    
    console.log('All plans from DB:', allPlans.length);
    
    // ใช้ฟิลเตอร์จากฟอร์ม
    const departmentFilter = document.getElementById("departmentFilter")?.value;
    const statusFilter = document.getElementById("statusFilter")?.value;
    const keywordFilter = document.getElementById("keywordFilter")?.value?.toLowerCase();
    const dateFilter = document.getElementById("dateFilter")?.value;
    
    console.log('Applied filters:', { departmentFilter, statusFilter, keywordFilter, dateFilter });
    
    let filteredPlans = allPlans;
    
    // ฟิลเตอร์ตามสถานะ
    if (statusFilter) {
      filteredPlans = filteredPlans.filter(plan => plan.Status === statusFilter);
      console.log('Plans after status filter:', filteredPlans.length);
    }
    
    // ฟิลเตอร์ตามวันที่
    if (dateFilter) {
      filteredPlans = filteredPlans.filter(plan => {
        if (!plan.PlannedStartTime) return false;
        
        const planDate = new Date(plan.PlannedStartTime);
        const filterDate = new Date(dateFilter);
        
        // เปรียบเทียบเฉพาะวันที่ (ไม่รวมเวลา)
        const planDateStr = planDate.toISOString().split('T')[0];
        const filterDateStr = filterDate.toISOString().split('T')[0];
        
        return planDateStr === filterDateStr;
      });
      console.log('Plans after date filter:', filteredPlans.length);
    }
    
    console.log('Plan statuses in filtered list:', filteredPlans.map(p => ({ id: p.PlanID, status: p.Status })));
    
    // ฟิลเตอร์ตามแผนก
    if (departmentFilter) {
      filteredPlans = filteredPlans.filter(plan => 
        plan.DepartmentID && plan.DepartmentID.toString() === departmentFilter
      );
      console.log('Plans after department filter:', filteredPlans.length);
    }
    
    // ฟิลเตอร์ตามคำค้นหา (ค้นหาในชื่อผลิตภัณฑ์, LotNumber, รายละเอียด)
    if (keywordFilter) {
      filteredPlans = filteredPlans.filter(plan => 
        (plan.ProductDisplayName && plan.ProductDisplayName.toLowerCase().includes(keywordFilter)) ||
        (plan.LotNumber && plan.LotNumber.toLowerCase().includes(keywordFilter)) ||
        (plan.Details && plan.Details.toLowerCase().includes(keywordFilter)) ||
        (plan.ProductName && plan.ProductName.toLowerCase().includes(keywordFilter))
      );
      console.log('Plans after keyword filter:', filteredPlans.length);
    }
    
    console.log('Final filtered plans:', filteredPlans.map(p => ({ id: p.PlanID, status: p.Status })));
    return filteredPlans;
  }
  
  // โหลดแผนงานทั้งหมดจากฐานข้อมูล
  static async loadFromDB() {
    try {
      const res = await fetch("tasks.php?action=get_plans");
      if (!res.ok) {
        throw new Error('ไม่สามารถเชื่อมต่อได้');
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        plans = data;
        // หา max PlanID
        planIdCounter =
          plans.reduce((max, p) => Math.max(max, p.PlanID || 0), 0) + 1;
        
        // Update calendar events after loading (with error handling)
        try {
          if (calendar) {
            updateCalendarEvents();
          }
        } catch (calendarError) {
          console.warn('Calendar update error (non-critical):', calendarError);
        }
        
        return true;
      } else {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (e) {
      console.error("PlanManager.loadFromDB error:", e);
      showToast("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "danger");
      return false;
    }
  }
  
  // เพิ่มแผนงานใหม่ลงฐานข้อมูล - Flow ใหม่ (2 ขั้นตอน)
  static async addPlan(planData) {
    try {
      console.log('🚀 Starting new 2-step plan creation flow');
      console.log('📋 Plan data:', planData);
      
      // ขั้นตอนที่ 1: บันทึกหัวแผนเพื่อรับ PlanID และ DepartmentID
      console.log('Step 1: Creating plan header...');
      const headerResponse = await fetch("tasks.php?action=create_plan_header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      
      if (!headerResponse.ok) {
        const errorText = await headerResponse.text();
        console.error('Header creation failed:', errorText);
        throw new Error('ไม่สามารถสร้างหัวแผนได้');
      }
      
      const headerResult = await headerResponse.json();
      console.log('✅ Header result:', headerResult);
      
      if (!headerResult.success) {
        throw new Error(headerResult.error || 'ไม่สามารถสร้างหัวแผนได้');
      }
      
      const planId = headerResult.PlanID;
      const departmentId = headerResult.DepartmentID;
      
      console.log(`📝 Plan created with ID: ${planId}, Department: ${departmentId}`);
      
      // ขั้นตอนที่ 2: กำหนด Machines และ Sub-Departments
      if ((planData.MachineIDs && planData.MachineIDs !== '') || 
          (planData.SubDepartmentIDs && planData.SubDepartmentIDs !== '')) {
        
        console.log('Step 2: Assigning resources...');
        const resourceData = {
          PlanID: planId,
          DepartmentID: departmentId,
          MachineIDs: planData.MachineIDs || '',
          SubDepartmentIDs: planData.SubDepartmentIDs || ''
        };
        
        console.log('📋 Resource data:', resourceData);
        
        const resourceResponse = await fetch("tasks.php?action=assign_plan_resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resourceData),
        });
        
        if (!resourceResponse.ok) {
          const errorText = await resourceResponse.text();
          console.error('Resource assignment failed:', errorText);
          throw new Error('ไม่สามารถกำหนดทรัพยากรได้');
        }
        
        const resourceResult = await resourceResponse.json();
        console.log('✅ Resource result:', resourceResult);
        
        if (!resourceResult.success) {
          throw new Error(resourceResult.error || 'ไม่สามารถกำหนดทรัพยากรได้');
        }
      } else {
        console.log('⏭️ No resources to assign');
      }
      
      // รีโหลดข้อมูลจากฐานข้อมูล
      await PlanManager.loadFromDB();
      
      return {
        success: true,
        PlanID: planId,
        message: 'แผนงานถูกสร้างสำเร็จ'
      };
      
    } catch (error) {
      console.error('❌ PlanManager.addPlan error:', error);
      throw new Error(error.message || 'ไม่สามารถเพิ่มแผนงานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  // อัปเดตข้อมูลแผนงานในฐานข้อมูล
  static async updatePlan(plan) {
    // ส่งทุก field รวม status
    try {
      console.log('=== PlanManager.updatePlan ===');
      console.log('Input plan:', plan);
      
      // ตรวจสอบ PlanID
      if (!plan.PlanID || plan.PlanID <= 0) {
        throw new Error('Invalid PlanID');
      }
      
      console.log('Sending request to tasks.php?action=update_plan');
      console.log('Request data:', JSON.stringify(plan, null, 2));
      
      const res = await fetch("tasks.php?action=update_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      
      console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        let errorMessage = 'HTTP ' + res.status;
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorJson = await res.json();
            errorMessage = errorJson.error || errorJson.message || errorMessage;
            console.error('Server error details:', errorJson);
          } else {
            const errorText = await res.text();
            console.error('Non-JSON error response:', errorText);
            errorMessage += ' - ตรวจสอบ PHP error log';
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error('ไม่สามารถอัปเดตแผนงานได้: ' + errorMessage);
      }
      
      const result = await res.json();
      console.log('Response result:', result);
      
      if (!result.success) {
        throw new Error('ไม่สามารถอัปเดตแผนงานได้: ' + (result.error || 'Unknown error'));
      }
      
      // Reload data and update calendar
      console.log('Reloading data from database...');
      await PlanManager.loadFromDB();
      console.log('Data reload completed');
      
      return result;
    } catch (e) {
      console.error("PlanManager.updatePlan error:", e);
      throw new Error('ไม่สามารถอัปเดตแผนงานได้ กรุณาลองใหม่อีกครั้ง: ' + e.message);
    }
  }
  
  // ลบแผนงานจากฐานข้อมูล
  static async deletePlan(planId) {
    try {
      const res = await fetch("api/plans.php?action=delete_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlanID: planId }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}: ไม่สามารถลบแผนงานได้`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถลบแผนงานได้');
      }
      
      await PlanManager.loadFromDB();
      updateCalendarEvents(); // อัปเดตปฏิทินทันที
      
      return result;
    } catch (e) {
      console.error("PlanManager.deletePlan error:", e);
      throw new Error(e.message || 'ไม่สามารถลบแผนงานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }
  
  // ยืนยันแผนงานที่เสร็จสิ้นแล้ว (เรียกจากหน้า confirm-complete)
  static async confirmPlan(planId) {
    try {
      const res = await fetch("tasks.php?action=confirm_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlanID: planId }),
      });
      
      if (!res.ok) {
        throw new Error('ไม่สามารถยืนยันแผนงานได้');
      }
      
      const result = await res.json();
      if (!result.success) {
        throw new Error('ไม่สามารถยืนยันแผนงานได้');
      }
      
      await PlanManager.loadFromDB();
      return result;
    } catch (e) {
      console.error("PlanManager.confirmPlan error:", e);
      throw new Error('ไม่สามารถยืนยันแผนงานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }
}

// ================================================================
// 6. FULLCALENDAR INITIALIZATION AND MANAGEMENT
// ================================================================

/**
 * จัดการปฏิทินแบบ FullCalendar สำหรับแสดงงานการผลิต
 * รองรับการแสดงแบบเดือน สัปดาห์ และรายวัน พร้อมกับ event handling
 */

// เริ่มต้นและกำหนดค่า FullCalendar
function initializeCalendar() {
  const calendarEl = document.getElementById('calendar');
  
  if (!calendarEl) {
    console.error('Calendar element not found!');
    return;
  }
  
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    locale: 'th',
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '01:00:00',
    slotLabelInterval: '01:00:00',
    allDaySlot: false,
    nowIndicator: true,
    scrollTime: '08:00:00',
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    displayEventTime: true, // แสดงเวลาใน event เพื่อให้เห็นช่วงเวลา
    displayEventEnd: true, // แสดงเวลาสิ้นสุด
    eventMinHeight: 35, // เพิ่มความสูงขั้นต่ำให้เหมาะกับตัวอักษรใหม่
    eventShortHeight: 30, // ความสูงเมื่อ event สั้น
    slotEventOverlap: false, // ป้องกัน events ซ้อนทับในช่อง time
    eventOverlap: true, // อนุญาตให้ events แสดงข้างกัน
    eventDisplay: 'block', // แสดง events แบบ block (เต็มช่วงเวลา)
    selectOverlap: false,
    // เพิ่มการตั้งค่าสำหรับการจัดการ overlapping events
    eventMaxStack: 4, // จำกัดจำนวน events ที่แสดงพร้อมกัน
    moreLinkClick: 'popover', // แสดง popover เมื่อคลิก "more" link
    dayMaxEvents: false, // ไม่จำกัดจำนวน events ใน day view
    dayMaxEventRows: false, // ไม่จำกัดจำนวนแถว
    eventOrder: ['start', 'title'], // เรียง events ตาม start time แล้วตาม title
    eventConstraint: {
      start: '00:00:00',
      end: '24:00:00'
    },
    eventOrder: ['start', 'title'],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'วันนี้',
      month: 'เดือน',
      week: 'สัปดาห์',
      day: 'วัน'
    },
    height: 'auto',
    aspectRatio: 1.8,
    expandRows: true,
    selectMirror: true,
    weekends: true,
    events: [],
    eventClick: function(info) {
      const plan = plans.find(p => p.PlanID == info.event.id);
      if (plan) {
        ModalManager.showPlanDetail(plan);
      }
    },
    dateClick: function(info) {
      // เติมแค่วันที่เริ่มต้นเท่านั้น ให้ผู้ใช้เป็นคนเลือกวันที่สิ้นสุดเอง
      console.log('Date clicked:', info.dateStr);
      
      // เติมเวลาปัจจุบันใน dropdown เวลาเริ่มต้นเท่านั้น
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      
      // Show the add job modal อย่างปลอดภัย
      safeModalOperation('addJobModal', 'show').then(() => {
        console.log('Modal opened, filling date and time...');
        
        // รอให้ modal render เสร็จ แล้วค่อยเติมข้อมูล
        setTimeout(() => {
          // ใช้ setDateValue เพื่อเติมทั้ง hidden และ display field
          setDateValue('startDate', info.dateStr);
          console.log('Set start date to:', info.dateStr);
          
          // เติมเวลาเริ่มต้น
          const startHourSelect = document.getElementById('startHour');
          const startMinuteSelect = document.getElementById('startMinute');
          
          if (startHourSelect && startMinuteSelect) {
            startHourSelect.value = currentHour;
            startMinuteSelect.value = currentMinute;
            console.log(`เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
          }
        }, 200);
        
      }).catch(error => {
        console.error('Error opening add job modal:', error);
        showToast('ไม่สามารถเปิดฟอร์มเพิ่มงานได้ กรุณาลองใหม่', 'danger');
      });
      
      // ไม่เติมวันที่และเวลาสิ้นสุด - ให้ผู้ใช้เป็นคนเลือกเอง
      console.log('เติมแค่วันที่และเวลาเริ่มต้น - ผู้ใช้ต้องเลือกเวลาสิ้นสุดเอง');
    },
    eventClassNames: function(arg) {
      return ['status-' + (arg.event.extendedProps.status || 'planning')];
    },
    eventDidMount: function(info) {
      const event = info.event;
      const props = event.extendedProps;
      const eventEl = info.el;
      const titleEl = eventEl.querySelector('.fc-event-title');
      
      if (titleEl) {
        titleEl.classList.add('fc-event-title-container');
        titleEl.innerHTML = '';
        
        // จัดเรียงข้อมูลตามลำดับความสำคัญ
        const infoLines = [];
        
        // บรรทัดที่ 1: ชื่อผลิตภัณฑ์ (หลัก)
        if (event.title) {
          const titleDiv = document.createElement('div');
          titleDiv.className = 'task-title';
          titleDiv.style.cssText = 'font-weight: bold; font-size: 0.75rem; margin-bottom: 2px; color: #fff; line-height: 1.2;';
          titleDiv.textContent = event.title;
          titleEl.appendChild(titleDiv);
        }
        
        // บรรทัดที่ 2: เครื่องจักร + แผนก
        const machineInfo = props.machineNames || props.machine || props.machineName;
        const deptInfo = props.department;
        if (machineInfo || deptInfo) {
          const locationDiv = document.createElement('div');
          locationDiv.className = 'task-location';
          locationDiv.style.cssText = 'font-size: 0.65rem; margin-bottom: 1px; color: #f0f0f0; line-height: 1.1;';
          
          const locationParts = [];
          if (machineInfo) locationParts.push(`🏭 ${machineInfo}`);
          if (deptInfo) locationParts.push(`📋 ${deptInfo}`);
          
          locationDiv.textContent = locationParts.join(' • ');
          titleEl.appendChild(locationDiv);
        }
        
        // บรรทัดที่ 3: ข้อมูลการผลิต
        const targetOutput = props.targetOutput || props.TargetOutput;
        const workerCount = props.workerCount || props.WorkerCount;
        if (targetOutput || workerCount) {
          const productionDiv = document.createElement('div');
          productionDiv.className = 'task-production';
          productionDiv.style.cssText = 'font-size: 0.6rem; color: #e0e0e0; line-height: 1.1;';
          
          const productionParts = [];
          if (targetOutput) productionParts.push(`🎯 ${targetOutput}ชิ้น`);
          if (workerCount) productionParts.push(`👥 ${workerCount}คน`);
          
          productionDiv.textContent = productionParts.join(' • ');
          titleEl.appendChild(productionDiv);
        }
      }
      
      // Tooltip ข้อมูลเต็ม
      const status = props.status || 'planning';
      const statusText = getStatusText(status);
      let startTime = '', endTime = '';
      
      if (event.start) startTime = Utils.formatDateTime(event.start);
      if (event.end) endTime = Utils.formatDateTime(event.end);
      
      const tooltipData = [
        `📋 งาน: ${event.title}`,
        `📊 สถานะ: ${statusText}`,
        `⏰ เวลา: ${startTime} - ${endTime}`,
        props.machineNames || props.machine ? `🏭 เครื่องจักร: ${props.machineNames || props.machine}` : '',
        props.department ? `🏢 แผนก: ${props.department}` : '',
        props.lotNumber ? `🏷️ Lot: ${props.lotNumber}` : '',
        props.targetOutput ? `🎯 เป้าหมาย: ${props.targetOutput} ชิ้น` : '',
        props.workerCount ? `👥 จำนวนคน: ${props.workerCount} คน` : ''
      ].filter(Boolean).join('\n');
      
      eventEl.setAttribute('title', tooltipData);
      
      // เพิ่ม attribute สำหรับการนับ overlapping events
      eventEl.setAttribute('data-event-id', event.id);
      
      // เพิ่มการจัดการ overlapping events หลังจาก render เสร็จ
      setTimeout(() => {
        handleOverlappingEvents(info);
        enhanceMultiDayEvents(info);
      }, 100);
    },
    
    // เพิ่มการจัดการ events หลังจาก render ทั้งหมดเสร็จ
    eventsSet: function(events) {
      // จัดการการแสดง overlapping events
      setTimeout(() => {
        updateOverlapIndicators();
        enhanceAllMultiDayEvents();
      }, 200);
    }
  });
  
  calendar.render();
  console.log('FullCalendar initialized successfully');
}

// แปลงสถานะงานเป็นข้อความภาษาไทย
function getStatusText(status) {
  const statusMap = {
    'planning': 'กำลังวางแผน',
    'in-progress': 'กำลังดำเนินงาน',
    'completed': 'เสร็จสิ้น',
    'cancelled': 'ยกเลิก'
  };
  return statusMap[status] || 'ไม่ระบุ';
}

// ================================================================
// OVERLAPPING EVENTS MANAGEMENT
// ================================================================

/**
 * จัดการ overlapping events สำหรับ event แต่ละตัว
 * @param {Object} info - FullCalendar event info object
 */
function handleOverlappingEvents(info) {
  try {
    const currentEvent = info.event;
    const currentEventEl = info.el;
    
    if (!currentEvent || !currentEventEl) return;
    
    // หาเครื่องจักรและเวลาของ event ปัจจุบัน
    const currentMachines = getCurrentEventMachines(currentEvent);
    const currentStart = currentEvent.start;
    const currentEnd = currentEvent.end;
    
    if (!currentStart || !currentEnd) return;
    
    // หา overlapping events ที่ใช้เครื่องจักรเดียวกัน
    const overlappingEvents = findOverlappingEvents(currentEvent, currentMachines, currentStart, currentEnd);
    
    if (overlappingEvents.length > 1) {
      // เพิ่ม overlap indicator
      addOverlapIndicator(currentEventEl, overlappingEvents.length);
      
      // ปรับ styling สำหรับ overlapping events
      adjustOverlappingEventStyles(currentEventEl, overlappingEvents.length);
    }
    
  } catch (error) {
    console.warn('Error handling overlapping events:', error);
  }
}

/**
 * หาเครื่องจักรของ event
 * @param {Object} event - FullCalendar event object
 * @returns {Array} array of machine names
 */
function getCurrentEventMachines(event) {
  const props = event.extendedProps || {};
  const machineNames = props.machineNames || props.machine || props.machineName || '';
  
  if (!machineNames) return [];
  
  // แปลง string เป็น array
  return machineNames.split(',').map(name => name.trim()).filter(name => name);
}

/**
 * หา overlapping events
 * @param {Object} currentEvent - Current FullCalendar event
 * @param {Array} machines - Machine names array
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @returns {Array} Array of overlapping events
 */
function findOverlappingEvents(currentEvent, machines, startTime, endTime) {
  if (!calendar || machines.length === 0) return [currentEvent];
  
  const allEvents = calendar.getEvents();
  const overlappingEvents = [currentEvent];
  
  allEvents.forEach(event => {
    if (event.id === currentEvent.id) return; // Skip same event
    
    const eventMachines = getCurrentEventMachines(event);
    const eventStart = event.start;
    const eventEnd = event.end;
    
    if (!eventStart || !eventEnd || eventMachines.length === 0) return;
    
    // ตรวจสอบว่ามีเครื่องจักรร่วมกัน
    const hasSharedMachine = machines.some(machine => 
      eventMachines.some(eventMachine => eventMachine === machine)
    );
    
    if (!hasSharedMachine) return;
    
    // ตรวจสอบว่าเวลาทับซ้อนกัน
    const isOverlapping = (
      (startTime < eventEnd && endTime > eventStart) ||
      (eventStart < endTime && eventEnd > startTime)
    );
    
    if (isOverlapping) {
      overlappingEvents.push(event);
    }
  });
  
  return overlappingEvents;
}

/**
 * เพิ่ม overlap indicator badge
 * @param {HTMLElement} eventEl - Event DOM element
 * @param {number} count - Number of overlapping events
 */
/**
 * แสดงรายละเอียด overlapping events
 * @param {HTMLElement} eventEl - Event DOM element
 * @param {number} count - Number of overlapping events
 */
function showOverlapDetails(eventEl, count) {
  const eventId = eventEl.getAttribute('data-event-id');
  const event = calendar.getEventById(eventId);
  
  if (!event) return;
  
  const machines = getCurrentEventMachines(event);
  const overlappingEvents = findOverlappingEvents(event, machines, event.start, event.end);
  
  let detailsHtml = `
    <div class="overlap-details-popup">
      <h6 class="text-danger"><i class="fas fa-exclamation-triangle"></i> งานที่ทับซ้อนกัน (${count} งาน)</h6>
      <p class="small text-muted mb-2">เครื่องจักร: ${machines.join(', ')}</p>
      <div class="overlap-events-list">
  `;
  
  overlappingEvents.forEach((ovEvent, index) => {
    const startTime = ovEvent.start ? ovEvent.start.toLocaleString('th-TH') : 'ไม่ระบุ';
    const endTime = ovEvent.end ? ovEvent.end.toLocaleString('th-TH') : 'ไม่ระบุ';
    const status = ovEvent.extendedProps?.status || 'planning';
    const statusText = getStatusText(status);
    
    detailsHtml += `
      <div class="overlap-event-item ${ovEvent.id === eventId ? 'current-event' : ''}" 
           style="padding: 8px; margin: 4px 0; border-left: 3px solid ${getStatusColor(status)}; 
                  background: ${ovEvent.id === eventId ? 'rgba(13, 110, 253, 0.1)' : 'rgba(248, 249, 250, 0.8)'}">
        <div class="fw-bold" style="font-size: 0.9rem;">${ovEvent.title}</div>
        <div class="small text-muted">${startTime} - ${endTime}</div>
        <div class="small"><span class="badge bg-${getStatusBadgeClass(status)}">${statusText}</span></div>
      </div>
    `;
  });
  
  detailsHtml += `
      </div>
      <div class="text-center mt-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="closeOverlapDetails()">
          <i class="fas fa-times"></i> ปิด
        </button>
      </div>
    </div>
  `;
  
  // แสดง popup
  showOverlapPopup(detailsHtml, eventEl);
}

/**
 * อัปเดต overlap indicators สำหรับ events ทั้งหมด
 */
function updateOverlapIndicators() {
  try {
    if (!calendar) return;
    
    const allEvents = calendar.getEvents();
    
    allEvents.forEach(event => {
      const eventEl = document.querySelector(`[data-event-id="${event.id}"]`);
      if (!eventEl) return;
      
      const machines = getCurrentEventMachines(event);
      if (machines.length === 0) return;
      
      const overlappingEvents = findOverlappingEvents(event, machines, event.start, event.end);
      
      if (overlappingEvents.length > 1) {
        addOverlapIndicator(eventEl, overlappingEvents.length);
        adjustOverlappingEventStyles(eventEl, overlappingEvents.length);
      }
    });
    
    console.log('Updated overlap indicators for all events');
  } catch (error) {
    console.warn('Error updating overlap indicators:', error);
  }
}

/**
 * Helper functions สำหรับ styling
 */
function getStatusColor(status) {
  const colors = {
    'planning': '#0d6efd',
    'in-progress': '#ffc107', 
    'completed': '#28a745',
    'cancelled': '#dc3545'
  };
  return colors[status] || '#6c757d';
}

function getStatusBadgeClass(status) {
  const classes = {
    'planning': 'primary',
    'in-progress': 'warning',
    'completed': 'success', 
    'cancelled': 'danger'
  };
  return classes[status] || 'secondary';
}

/**
 * แสดง overlap popup
 * @param {string} content - HTML content
 * @param {HTMLElement} targetEl - Target element
 */
function showOverlapPopup(content, targetEl) {
  // ลบ popup เดิมถ้ามี
  closeOverlapDetails();
  
  const popup = document.createElement('div');
  popup.id = 'overlapDetailsPopup';
  popup.className = 'overlap-popup';
  popup.innerHTML = content;
  
  // ตั้งค่า style
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #dc3545;
    border-radius: 12px;
    padding: 20px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 9999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: fadeInScale 0.3s ease-out;
  `;
  
  // เพิ่ม backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'overlap-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9998;
    animation: fadeIn 0.3s ease-out;
  `;
  
  backdrop.addEventListener('click', closeOverlapDetails);
  
  document.body.appendChild(backdrop);
  document.body.appendChild(popup);
}

/**
 * ปิด overlap details popup
 */
function closeOverlapDetails() {
  const popup = document.getElementById('overlapDetailsPopup');
  const backdrop = document.querySelector('.overlap-backdrop');
  
  if (popup) popup.remove();
  if (backdrop) backdrop.remove();
}

// ================================================================
// MULTI-DAY EVENTS ENHANCEMENT
// ================================================================

/**
 * ปรับปรุงการแสดงงานข้ามวันสำหรับ event แต่ละตัว
 * @param {Object} info - FullCalendar event info object
 */
function enhanceMultiDayEvents(info) {
  try {
    const event = info.event;
    const eventEl = info.el;
    
    if (!event || !eventEl || !event.start || !event.end) return;
    
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    // ตรวจสอบว่าเป็นงานข้ามวันหรือไม่
    const isMultiDay = !isSameDay(startDate, endDate);
    
    if (isMultiDay) {
      // เพิ่ม class สำหรับงานข้ามวัน
      eventEl.classList.add('multi-day-event');
      
      // เพิ่มข้อมูลระยะเวลา
      addMultiDayInfo(eventEl, startDate, endDate);
      
      // ปรับ tooltip สำหรับงานข้ามวัน
      enhanceMultiDayTooltip(eventEl, event, startDate, endDate);
    }
    
  } catch (error) {
    console.warn('Error enhancing multi-day event:', error);
  }
}

/**
 * ตรวจสอบว่าวันที่สองวันเหมือนกันหรือไม่
 * @param {Date} date1 
 * @param {Date} date2 
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

/**
 * เพิ่มข้อมูลระยะเวลาสำหรับงานข้ามวัน
 * @param {HTMLElement} eventEl - Event DOM element
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function addMultiDayInfo(eventEl, startDate, endDate) {
  // คำนวณจำนวนวัน
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // สร้าง duration indicator
  const durationEl = document.createElement('div');
  durationEl.className = 'multi-day-duration';
  durationEl.innerHTML = `
    <i class="fas fa-calendar-alt"></i> 
    ${diffDays} วัน 
    <small>(${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - 
    ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})</small>
  `;
  
  durationEl.style.cssText = `
    position: absolute;
    bottom: -18px;
    left: 0;
    right: 0;
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.4);
    padding: 2px 6px;
    border-radius: 0 0 6px 6px;
    text-align: center;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    z-index: 10;
  `;
  
  eventEl.style.paddingBottom = '20px';
  eventEl.appendChild(durationEl);
}

/**
 * ปรับปรุง tooltip สำหรับงานข้ามวัน
 * @param {HTMLElement} eventEl - Event DOM element
 * @param {Object} event - FullCalendar event object
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
function enhanceMultiDayTooltip(eventEl, event, startDate, endDate) {
  const props = event.extendedProps || {};
  const status = props.status || 'planning';
  const statusText = getStatusText(status);
  
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  
  const tooltipData = [
    `📋 งาน: ${event.title}`,
    `📊 สถานะ: ${statusText}`,
    `📅 ระยะเวลา: ${diffDays} วัน (${diffHours} ชั่วโมง)`,
    `🕐 เริ่ม: ${startDate.toLocaleString('th-TH')}`,
    `🕕 สิ้นสุด: ${endDate.toLocaleString('th-TH')}`,
    props.machineNames || props.machine ? `🏭 เครื่องจักร: ${props.machineNames || props.machine}` : '',
    props.department ? `🏢 แผนก: ${props.department}` : '',
    props.lotNumber ? `🏷️ Lot: ${props.lotNumber}` : '',
    props.targetOutput ? `🎯 เป้าหมาย: ${props.targetOutput} ชิ้น` : '',
    props.workerCount ? `👥 จำนวนคน: ${props.workerCount} คน` : '',
    `⚠️ หมายเหตุ: งานนี้ดำเนินการข้ามวัน`
  ].filter(Boolean).join('\n');
  
  eventEl.setAttribute('title', tooltipData);
}

/**
 * ปรับปรุงงานข้ามวันทั้งหมดในปฏิทิน
 */
function enhanceAllMultiDayEvents() {
  try {
    const allEvents = document.querySelectorAll('.fc-event');
    
    allEvents.forEach(eventEl => {
      const eventId = eventEl.getAttribute('data-event-id');
      if (!eventId || !calendar) return;
      
      const event = calendar.getEventById(eventId);
      if (!event || !event.start || !event.end) return;
      
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      if (!isSameDay(startDate, endDate)) {
        eventEl.classList.add('multi-day-event');
        
        // ลบ duration indicator เดิมถ้ามี
        const existingDuration = eventEl.querySelector('.multi-day-duration');
        if (existingDuration) {
          existingDuration.remove();
        }
        
        addMultiDayInfo(eventEl, startDate, endDate);
        enhanceMultiDayTooltip(eventEl, event, startDate, endDate);
      }
    });
    
    console.log('Enhanced all multi-day events');
  } catch (error) {
    console.warn('Error enhancing all multi-day events:', error);
  }
}

// อัปเดต events ในปฏิทิน (เรียกใช้เมื่อมีการเปลี่ยนแปลงข้อมูล)
function updateCalendarEvents() {
  console.log('updateCalendarEvents() called');
  
  try {
    if (!calendar) {
      console.warn('Calendar not initialized');
      return;
    }
    
    // Remove all existing events
    calendar.removeAllEvents();
    
    // Get filtered plans
    const filteredPlans = PlanManager.getFilteredPlans();
    
    console.log('Updating calendar with plans:', filteredPlans.length);
    console.log('Plan statuses:', filteredPlans.map(p => ({ id: p.PlanID, status: p.Status })));
    
    // Add events to calendar
    filteredPlans.forEach((plan, index) => {
    if (plan.PlannedStartTime && plan.PlannedEndTime) {
      // แปลง PlannedStartTime และ PlannedEndTime ให้เป็น Date objects
      const startDate = new Date(plan.PlannedStartTime);
      const endDate = new Date(plan.PlannedEndTime);
      
      // ตรวจสอบว่า Date objects ถูกต้อง
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error(`Invalid date for plan ${plan.PlanID}:`, plan.PlannedStartTime, plan.PlannedEndTime);
        return;
      }
      
      // ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่ม
      if (endDate <= startDate) {
        console.warn(`End time before start time for plan ${plan.PlanID}`);
        return;
      }
      
      const event = {
        id: plan.PlanID,
        title: getPlanDisplayName(plan),
        start: formatDateForFullCalendar(startDate), // ใช้ฟังก์ชันใหม่แทน toISOString()
        end: formatDateForFullCalendar(endDate),     // ใช้ฟังก์ชันใหม่แทน toISOString()
        extendedProps: {
          status: plan.Status,
          department: plan.DepartmentName,
          machine: plan.MachineName,
          machineName: plan.MachineName, // เพิ่มเพื่อความชัดเจน
          machineNames: plan.MachineNames, // สำหรับกรณีหลายเครื่องจักร
          machineIDs: plan.MachineIDs, // รายการ ID เครื่องจักร
          lotNumber: plan.LotNumber,
          lotSize: plan.LotSize,
          targetOutput: plan.TargetOutput,
          workerCount: plan.WorkerCount,
          details: plan.Details,
          productName: plan.ProductName,
          productSize: plan.ProductSize,
          productDisplayName: plan.ProductDisplayName,
          plannedDurationHours: plan.PlannedDurationHours
        }
      };
      
      // Debug logging for machine info
      console.log(`Plan ${plan.PlanID} machine info:`, {
        MachineName: plan.MachineName,
        MachineNames: plan.MachineNames,
        MachineIDs: plan.MachineIDs,
        extendedProps_machine: event.extendedProps.machine,
        extendedProps_machineNames: event.extendedProps.machineNames
      });
      
      // Debug logging for time info
      console.log(`Plan ${plan.PlanID} time info:`, {
        originalStart: plan.PlannedStartTime,
        originalEnd: plan.PlannedEndTime,
        parsedStart: startDate,
        parsedEnd: endDate,
        finalStart: event.start,
        finalEnd: event.end,
        localStartHour: startDate.getHours(),
        localEndHour: endDate.getHours()
      });
      
      calendar.addEvent(event);
    } else {
      console.warn(`Plan ${plan.PlanID} missing PlannedStartTime or PlannedEndTime`);
    }
  });
  
  console.log(`Updated calendar with ${filteredPlans.length} events`);
  
  } catch (error) {
    console.error('updateCalendarEvents error:', error);
    showToast("เกิดข้อผิดพลาดในการอัปเดตปฏิทิน", "warning");
  }
}

// สร้างชื่อแสดงสำหรับแผนงานในปฏิทิน
function getPlanDisplayName(plan) {
  // Debug logging
  console.log('getPlanDisplayName called with plan:', plan);
  console.log('ProductDisplayName:', plan.ProductDisplayName);
  console.log('ProductName:', plan.ProductName);
  console.log('ProductSize:', plan.ProductSize);
  
  // แสดงชื่อผลิตภัณฑ์และขนาดเป็นหลัก เหมือนในรูป
  if (plan.ProductDisplayName) {
    return plan.ProductDisplayName;
  } else if (plan.ProductName && plan.ProductSize) {
    return `${plan.ProductName} (${plan.ProductSize})`;
  } else if (plan.LotNumber) {
    return plan.LotNumber;
  } else {
    return `Plan ID: ${plan.PlanID}`;
  }
}

// ================================================================
// 7. CALENDAR RENDERING AND DATA MANAGEMENT
// ================================================================

/**
 * จัดการการแสดงผลปฏิทินและโหลดข้อมูลจากฐานข้อมูล
 * รวมถึงการอัปเดตจำนวนงานในแต่ละสถานะ
 */
class CalendarRenderer {
  // โหลดข้อมูลและแสดงผลปฏิทิน
  static async render() {
    try {
      await PlanManager.loadFromDB();
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "danger");
      return;
    }
    
    // Initialize FullCalendar if not already done
    if (!calendar) {
      initializeCalendar();
    }
    
    // Update calendar events
    updateCalendarEvents();
    
    // Update status counts after rendering
    if (formStepManager) {
      formStepManager.updateStatusCounts();
    }
  }

  // อัปเดต events ในปฏิทิน (เพื่อความ compatible กับโค้ดเดิม)
  static renderPlans() {
    updateCalendarEvents();
  }
}

// ================================================================
// 8. MODAL MANAGEMENT AND TASK DETAILS
// ================================================================

/**
 * จัดการ Modal สำหรับแสดงรายละเอียดงาน การแก้ไข และการลบงาน
 * รวมถึงการจัดการสถานะงานต่างๆ (เริ่มงาน เสร็จงาน ยืนยัน)
 */
class ModalManager {
  // แสดง Modal รายละเอียดแผนงาน พร้อมปุ่มจัดการต่างๆ
  static showPlanDetail = function (plan, confirmOnly = false) {
    const taskDetailTitle = document.getElementById("taskDetailTitle");
    if (taskDetailTitle) {
      taskDetailTitle.textContent = `แผนงาน: ${plan.ProductDisplayName || plan.LotNumber || `Plan ID: ${plan.PlanID}`}`;
    }
    
    let statusText = "-";
    let statusColor = "secondary";
    if (plan.Status === "planning") {
      statusText = "กำลังวางแผน";
      statusColor = "primary";
    } else if (plan.Status === "in-progress") {
      statusText = "กำลังดำเนินงาน";
      statusColor = "warning";
    } else if (plan.Status === "completed") {
      statusText = "เสร็จสิ้น";
      statusColor = "success";
    } else if (plan.Status === "cancelled") {
      statusText = "ยกเลิก";
      statusColor = "danger";
    }
    
    let detailHTML = `
      <div class="row g-4">
        <!-- Basic Information Card -->
        <div class="col-lg-6">
          <div class="card h-100 border-primary">
            <div class="card-header bg-light border-primary">
              <h6 class="mb-0 text-dark"><i class="bi bi-info-circle-fill me-2 text-primary"></i>ข้อมูลพื้นฐาน</h6>
            </div>
            <div class="card-body">
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">สถานะ:</span>
                <div class="mt-1">
                  <span class="badge bg-${statusColor} fs-6">${statusText}</span>
                </div>
              </div>
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">ผลิตภัณฑ์:</span>
                <div class="detail-value fw-bold text-dark mt-1">${plan.ProductDisplayName || plan.ProductName || "-"}</div>
              </div>
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">ขนาด:</span>
                <div class="detail-value text-dark mt-1">${plan.ProductSize || "-"}</div>
              </div>
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">Lot Number:</span>
                <div class="detail-value mt-1"><code class="bg-light px-2 py-1 rounded text-dark">${plan.LotNumber || "-"}</code></div>
              </div>
              ${plan.OrderNumber ? `
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">เลข Order:</span>
                <div class="detail-value mt-1">
                  <code class="text-primary bg-light px-2 py-1 rounded">${plan.OrderNumber}</code>
                  <span class="badge bg-success ms-2">
                    <i class="bi bi-check-circle me-1"></i>ดำเนินงานแล้ว
                  </span>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Department & Machine Card -->
        <div class="col-lg-6">
          <div class="card h-100 border-info">
            <div class="card-header bg-light border-info">
              <h6 class="mb-0 text-dark"><i class="bi bi-building me-2 text-info"></i>แผนก & เครื่องจักร</h6>
            </div>
            <div class="card-body">
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">แผนกหลัก:</span>
                <div class="detail-value mt-1">
                  <span class="badge bg-primary text-white">${plan.DepartmentName || "-"}</span>
                </div>
              </div>
              ${plan.SubDepartmentNames ? `
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">แผนกย่อย:</span>
                <div class="detail-value mt-1">
                  <div class="d-flex flex-wrap gap-1">
                    ${plan.SubDepartmentNames.split(',').map(name => 
                      `<span class="badge bg-secondary text-white">${name.trim()}</span>`
                    ).join('')}
                  </div>
                </div>
              </div>` : ''}
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">เครื่องจักร:</span>
                <div class="detail-value mt-1">
                  ${plan.MachineNames ? `
                    <div class="d-flex flex-wrap gap-1">
                      ${plan.MachineNames.split(',').map(name => 
                        `<span class="badge bg-warning text-dark">${name.trim()}</span>`
                      ).join('')}
                    </div>
                  ` : `
                    <span class="badge bg-warning text-dark">${plan.MachineName || "-"}</span>
                  `}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Production Target Card -->
        <div class="col-lg-6">
          <div class="card h-100 border-success">
            <div class="card-header bg-light border-success">
              <h6 class="mb-0 text-dark"><i class="bi bi-graph-up me-2 text-success"></i>เป้าหมายการผลิต</h6>
            </div>
            <div class="card-body">
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">Lot Size:</span>
                <div class="detail-value mt-1">
                  <span class="badge bg-info text-dark fs-6">${plan.LotSize || "0"} ชิ้น</span>
                </div>
              </div>
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">เป้าหมายผลิต:</span>
                <div class="detail-value mt-1">
                  <span class="badge bg-success fs-6">${plan.TargetOutput || "0"} ชิ้น</span>
                </div>
              </div>
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">จำนวนคนงาน:</span>
                <div class="detail-value mt-1">
                  <span class="badge bg-warning text-dark fs-6">${plan.WorkerCount || "0"} คน</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Time Schedule Card -->
        <div class="col-lg-6">
          <div class="card h-100 border-warning">
            <div class="card-header bg-light border-warning">
              <h6 class="mb-0 text-dark"><i class="bi bi-clock me-2 text-warning"></i>ตารางเวลา</h6>
            </div>
            <div class="card-body">
              ${plan.PlannedStartTime ? `
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">เวลาเริ่มตามแผน:</span>
                <div class="detail-value mt-1">
                  <i class="bi bi-play-circle text-success me-1"></i>
                  <span class="fw-bold text-dark">
                    ${new Date(plan.PlannedStartTime).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: '2-digit', 
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>` : ''}
              ${plan.PlannedEndTime ? `
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">เวลาสิ้นสุดตามแผน:</span>
                <div class="detail-value mt-1">
                  <i class="bi bi-stop-circle text-danger me-1"></i>
                  <span class="fw-bold text-dark">
                    ${new Date(plan.PlannedEndTime).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit', 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>` : ''}
              ${plan.PlannedDurationHours ? `
              <div class="detail-item mb-3">
                <span class="detail-label text-muted">ระยะเวลาตามแผน:</span>
                <div class="detail-value mt-1">
                  <i class="bi bi-stopwatch text-primary me-1"></i>
                  <span class="badge bg-primary text-white">${plan.PlannedDurationHours} ชั่วโมง</span>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Break Times & Setup Card -->
        ${(plan.BreakMorningMinutes || plan.BreakLunchMinutes || plan.BreakEveningMinutes || plan.SetupMinutes) ? `
        <div class="col-12">
          <div class="card border-secondary">
            <div class="card-header bg-light border-secondary">
              <h6 class="mb-0 text-dark"><i class="bi bi-pause-circle me-2 text-secondary"></i>เวลาพัก & Setup</h6>
            </div>
            <div class="card-body">
              <div class="row g-3">
                ${plan.BreakMorningMinutes ? `
                <div class="col-md-3">
                  <div class="text-center p-2 bg-light rounded">
                    <i class="bi bi-sun text-warning fs-4 d-block mb-1"></i>
                    <small class="text-muted">พักเช้า</small>
                    <div class="fw-bold text-dark">${plan.BreakMorningMinutes} นาที</div>
                  </div>
                </div>` : ''}
                ${plan.BreakLunchMinutes ? `
                <div class="col-md-3">
                  <div class="text-center p-2 bg-light rounded">
                    <i class="bi bi-sun text-warning fs-4 d-block mb-1"></i>
                    <small class="text-muted">พักเที่ยง</small>
                    <div class="fw-bold text-dark">${plan.BreakLunchMinutes} นาที</div>
                  </div>
                </div>` : ''}
                ${plan.BreakEveningMinutes ? `
                <div class="col-md-3">
                  <div class="text-center p-2 bg-light rounded">
                    <i class="bi bi-moon text-info fs-4 d-block mb-1"></i>
                    <small class="text-muted">พักเย็น</small>
                    <div class="fw-bold text-dark">${plan.BreakEveningMinutes} นาที</div>
                  </div>
                </div>` : ''}
                ${plan.SetupMinutes ? `
                <div class="col-md-3">
                  <div class="text-center p-2 bg-light rounded">
                    <i class="bi bi-tools text-primary fs-4 d-block mb-1"></i>
                    <small class="text-muted">Setup</small>
                    <div class="fw-bold text-dark">${plan.SetupMinutes} นาที</div>
                  </div>
                </div>` : ''}
              </div>
            </div>
          </div>
        </div>` : ''}

        <!-- System Information Card -->
        <div class="col-12">
          <div class="card border-dark">
            <div class="card-header bg-light border-dark">
              <h6 class="mb-0 text-dark"><i class="bi bi-gear-fill me-2 text-dark"></i>ข้อมูลระบบ</h6>
            </div>
            <div class="card-body bg-light">
              <div class="row g-3">
                <div class="col-md-6">
                  <small class="text-muted">วันที่สร้าง:</small>
                  <div class="fw-bold text-dark">
                    ${plan.CreatedAt ? new Date(plan.CreatedAt).toLocaleString('th-TH') : "-"}
                  </div>
                </div>
                <div class="col-md-6">
                  <small class="text-muted">สร้างโดย:</small>
                  <div class="fw-bold text-dark">User ID ${plan.CreatedByUserID || "-"}</div>
                </div>
                <div class="col-md-6">
                  <small class="text-muted">แก้ไขล่าสุด:</small>
                  <div class="fw-bold text-dark">
                    ${plan.UpdatedAt ? new Date(plan.UpdatedAt).toLocaleString('th-TH') : "-"}
                  </div>
                </div>
                <div class="col-md-6">
                  <small class="text-muted">แก้ไขโดย:</small>
                  <div class="fw-bold text-dark">User ID ${plan.UpdatedByUserID || "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (plan.Details && plan.Details.trim()) {
      detailHTML += `
        <div class="row mt-3">
          <div class="col-12">
            <div class="card border-success">
              <div class="card-header bg-light border-success">
                <h6 class="mb-0 text-dark"><i class="bi bi-journal-text me-2 text-success"></i>รายละเอียดเพิ่มเติม</h6>
              </div>
              <div class="card-body">
                <div class="bg-light p-3 rounded">
                  <p class="mb-0 text-dark">${plan.Details}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    detailHTML += `
      <div class="row mt-4">
        <div class="col-12">
          <div class="card border-light">
            <div class="card-header bg-light">
              <h6 class="mb-0 text-dark"><i class="bi bi-gear-wide-connected me-2 text-secondary"></i>การจัดการงาน</h6>
            </div>
            <div class="card-body">`;

    // ตรวจสอบสถานะงาน - ถ้าเป็น completed จะแสดงเฉพาะปุ่มลบ
    if (plan.Status === "completed") {
      // งานที่เสร็จสิ้นแล้ว - แสดงเฉพาะปุ่มลบ และข้อความแจ้งเตือน
      detailHTML += `
        <div class="alert alert-success d-flex align-items-center mb-3">
          <i class="bi bi-check-circle-fill me-3 fs-4 text-success"></i>
          <div class="flex-grow-1">
            <div class="fw-bold">งานนี้เสร็จสิ้นแล้ว</div>
            <small class="text-muted">ไม่สามารถแก้ไขหรือยืนยันเพิ่มเติมได้</small>
          </div>
        </div>
        <div class="d-flex justify-content-end">
          <button id="deletePlanBtn" class="btn btn-outline-danger">
            <i class="bi bi-trash me-2"></i>ลบงาน
          </button>
        </div>`;
    } else {
      // งานที่ยังไม่เสร็จ - แสดงปุ่มต่างๆ แบ่งกลุ่ม
      detailHTML += `
        <div class="row g-3">
          <div class="col-md-6">
            <div class="d-grid gap-2">
              <small class="text-muted fw-bold">การแก้ไข</small>
              <button id="editPlanBtn" class="btn btn-primary">
                <i class="bi bi-pencil-square me-2"></i>แก้ไขงาน
              </button>
              <button id="deletePlanBtn" class="btn btn-outline-danger">
                <i class="bi bi-trash me-2"></i>ลบงาน
              </button>
            </div>
          </div>
          <div class="col-md-6">
            <div class="d-grid gap-2">
              <small class="text-muted fw-bold">การดำเนินงาน</small>`;
              
    if (plan.Status === "planning") {
      detailHTML += `
              <button id="startPlanBtn" class="btn btn-success">
                <i class="bi bi-play-circle-fill me-2"></i>เริ่มดำเนินงาน
              </button>
              <button id="cancelPlanBtn" class="btn btn-danger">
                <i class="bi bi-x-circle-fill me-2"></i>ยกเลิกงาน
              </button>`;
    } else if (plan.Status === "in-progress") {
      detailHTML += `
              <button id="partialConfirmBtn" class="btn btn-primary">
                <i class="bi bi-speedometer me-2"></i>บันทึกผลผลิตบางส่วน
              </button>
              <button id="viewOEEBtn" class="btn btn-info">
                <i class="bi bi-clipboard-check me-2"></i>กรอกข้อมูลผลผลิตเต็ม
              </button>
              <button id="cancelPlanBtn" class="btn btn-danger">
                <i class="bi bi-x-circle-fill me-2"></i>ยกเลิกงาน
              </button>`;
    }
    
    detailHTML += `
            </div>
          </div>
        </div>`;
    }

    detailHTML += `
            </div>
          </div>
        </div>
      </div>
    `;
    // Inject into the correct modal body
    const taskDetailBody = document.getElementById("taskDetailBody");
    if (taskDetailBody) {
      taskDetailBody.innerHTML = detailHTML + `<div id="partialSessionsSection" class="my-3"><div class="text-center text-secondary"><span class="spinner-border spinner-border-sm"></span> กำลังโหลดข้อมูล Session Partial...</div></div>`;
      // Fetch and display partial sessions
      const planId = plan.PlanID || plan.PlanId || plan.plan_id;
      if (planId) {
        fetch('api/production-sessions.php?action=get_sessions&plan_id=' + planId)
          .then(res => res.json())
          .then(result => {
            let html = '';
            let sessions = (result && result.success && result.data && Array.isArray(result.data.sessions)) ? result.data.sessions : [];
            // Calculate remaining quantity from partials
            let totalProduced = 0;
            sessions.forEach(s => {
              totalProduced += (parseInt(s.SessionGoodQuantity) || 0);
            });
            let remaining = (plan.TargetOutput || 0) - totalProduced;
            // Update remaining badge in Production Target Card
            const prodTargetCard = document.querySelector('.card.border-success .card-body');
            if (prodTargetCard) {
              let badge = prodTargetCard.querySelector('.badge.bg-danger');
              if (!badge) {
                // Insert after target output
                const targetDiv = prodTargetCard.querySelector('.detail-item:nth-child(2) .detail-value');
                if (targetDiv) {
                  targetDiv.insertAdjacentHTML('afterend', `<div class="detail-value mt-1"><span class="badge bg-danger fs-6">คงเหลือ: ${remaining < 0 ? 0 : remaining} ชิ้น</span></div>`);
                }
              } else {
                badge.textContent = `คงเหลือ: ${remaining < 0 ? 0 : remaining} ชิ้น`;
              }
            }
            if (sessions.length > 0) {
              html += `<div class="row g-2 mt-2">`;
              sessions.forEach((s, idx) => {
                const startDateObj = s.ActualStartDateTime ? new Date(s.ActualStartDateTime) : null;
                const endDateObj = s.ActualEndDateTime ? new Date(s.ActualEndDateTime) : null;
                const startTime = startDateObj ? startDateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                const endTime = endDateObj ? endDateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                const startDateStr = startDateObj ? `${String(startDateObj.getDate()).padStart(2, '0')}/${String(startDateObj.getMonth() + 1).padStart(2, '0')}/${startDateObj.getFullYear()}` : '-';
                const endDateStr = endDateObj ? `${String(endDateObj.getDate()).padStart(2, '0')}/${String(endDateObj.getMonth() + 1).padStart(2, '0')}/${endDateObj.getFullYear()}` : '';
                let dateRange = '';
                if (startDateStr && endDateStr && startDateStr !== '-' && endDateStr !== '' && startDateStr !== endDateStr) {
                  dateRange = `<i class=\"bi bi-calendar-event me-1\"></i>วันที่: ${startDateStr} - ${endDateStr}`;
                } else if (startDateStr && startDateStr !== '-') {
                  dateRange = `<i class=\"bi bi-calendar-event me-1\"></i>วันที่: ${startDateStr}`;
                } else {
                  dateRange = '';
                }
                html += `
                  <div class="col-md-4 col-sm-6">
                    <div class="card session-card border-info h-100">
                      <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <span class="badge badge-session bg-info">Session ${idx + 1}</span>
                          <small class="text-muted">${startTime} - ${endTime}</small>
                        </div>
                        ${dateRange ? `<div class=\"mb-2 text-secondary small\">${dateRange}</div>` : ''}
                        <div class="row g-1 small">
                          <div class="col-6">
                            <strong class="text-success">${s.SessionGoodQuantity ?? '-'}</strong>
                            <small class="text-muted d-block">ผลิตดี</small>
                          </div>
                          <div class="col-6">
                            <strong class="text-primary">${Math.round(s.WorkingMinutes || 0)}</strong>
                            <small class="text-muted d-block">นาทีสุทธิ</small>
                          </div>
                          <div class="col-6">
                            <strong class="text-danger">${s.SessionRejectQuantity ?? 0}</strong>
                            <small class="text-muted d-block">ของเสีย</small>
                          </div>
                          <div class="col-6">
                            <strong class="text-info">${s.SessionReworkQuantity ?? 0}</strong>
                            <small class="text-muted d-block">Rework</small>
                          </div>
                        </div>
                        ${s.Remark ? `<div class="mt-2"><small class="text-muted">หมายเหตุ: ${s.Remark.length > 50 ? s.Remark.substring(0, 50) + '...' : s.Remark}</small></div>` : ''}
                      </div>
                    </div>
                  </div>
                `;
              });
              html += `</div>`;
            } else {
              html = '<div class="text-center text-muted">ไม่พบข้อมูล Session Partial<\/div>';
            }
            const section = document.getElementById('partialSessionsSection');
            if (section) section.innerHTML = `<h6 class="mt-3 mb-2 text-primary"><i class="bi bi-list-check me-1"></i>Session Partial (ยืนยันบางส่วน)</h6>` + html;
          })
          .catch(() => {
            const section = document.getElementById('partialSessionsSection');
            if (section) section.innerHTML = '<div class="text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล Session Partial</div>';
          });
      }
    }
    setTimeout(() => {
      const editBtn = document.getElementById("editPlanBtn");
      if (editBtn) {
        editBtn.disabled = false;
        editBtn.onclick = async function (e) {
          e.preventDefault();
          try {
            await fillAddJobFormWithPlan(plan);
            
            // ใช้ safeModalOperation สำหรับจัดการ modal อย่างปลอดภัย
            try {
              await safeModalOperation('taskDetailModal', 'hide');
              await safeModalOperation('addJobModal', 'show');
            } catch (modalError) {
              console.error('Modal operation error:', modalError);
              // แม้ modal จะมีปัญหา แต่ฟอร์มก็ควรจะพร้อมแล้ว
            }
          } catch (error) {
            console.error('Error opening edit form:', error);
            showToast('ไม่สามารถเปิดฟอร์มแก้ไขได้ กรุณาลองใหม่', 'danger');
          }
        };
      }
      const deleteBtn = document.getElementById("deletePlanBtn");
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.onclick = async function (e) {
          e.preventDefault();
          
          // สร้างข้อความ confirm ตามสถานะของงาน
          let confirmMessage = "คุณต้องการลบงานนี้ใช่หรือไม่?\n\n⚠️ การลบจะไม่สามารถยกเลิกได้";
          
          if (plan.Status === 'completed') {
            confirmMessage = "คุณต้องการลบงานที่เสร็จสิ้นแล้วนี้ใช่หรือไม่?\n\n⚠️ คำเตือน: งานนี้เสร็จสิ้นแล้ว การลบจะทำให้ข้อมูลผลการผลิตหายไป\n⚠️ การลบจะไม่สามารถยกเลิกได้";
          } else if (plan.Status === 'in-progress') {
            confirmMessage = "ไม่สามารถลบงานที่กำลังดำเนินการได้\n\nกรุณาหยุดงานก่อนหรือรอให้งานเสร็จสิ้น";
            alert(confirmMessage);
            return;
          }
          
          if (confirm(confirmMessage)) {
            try {
              // แสดง loading
              deleteBtn.disabled = true;
              deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังลบ...';
              
              await PlanManager.deletePlan(plan.PlanID);
              
              showToast("ลบแผนงานสำเร็จ", "success");
              
              // ปิด modal อย่างปลอดภัย
              try {
                await safeModalOperation('taskDetailModal', 'hide');
              } catch (modalError) {
                console.error('Error closing task detail modal:', modalError);
              }
              
            } catch (error) {
              console.error('Delete plan error:', error);
              showToast(error.message || "เกิดข้อผิดพลาดในการลบแผนงาน", "danger");
              
              // คืนค่าปุ่มกลับมา
              deleteBtn.disabled = false;
              deleteBtn.innerHTML = '<i class="bi bi-trash me-2"></i>ลบงาน';
            }
          }
        };
      }
      const confirmBtn = document.getElementById("confirmPlanBtn");
      if (confirmBtn) {
        confirmBtn.onclick = async function (e) {
          e.preventDefault();
          await confirmPlanToServer(plan);
          
          // ปิด modal อย่างปลอดภัย
          try {
            await safeModalOperation('taskDetailModal', 'hide');
          } catch (modalError) {
            console.error('Error closing task detail modal:', modalError);
          }
        };
      }
      const finalConfirmBtn = document.getElementById("finalConfirmBtn");
      if (finalConfirmBtn) {
        finalConfirmBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(plan.PlanID)}`;
        };
      }
      
      // Handler for viewOEEBtn (Confirm Product button)
      const viewOEEBtn = document.getElementById("viewOEEBtn");
      if (viewOEEBtn) {
        viewOEEBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(plan.PlanID)}`;
        };
      }
      
      // Handler for partialConfirmBtn (Partial Confirmation button)
      const partialConfirmBtn = document.getElementById("partialConfirmBtn");
      if (partialConfirmBtn) {
        partialConfirmBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `partial-confirm.html?planId=${encodeURIComponent(plan.PlanID)}`;
        };
      }
      
      // Handler for startPlanBtn (Start Work button)
      const startPlanBtn = document.getElementById("startPlanBtn");
      if (startPlanBtn) {
        startPlanBtn.onclick = async function (e) {
          e.preventDefault();
          
          // เปิด Modal กรอกเลข Order แทนการ confirm ธรรมดา อย่างปลอดภัย
          try {
            const orderNumberInput = document.getElementById("orderNumber");
            const planIdInput = document.getElementById("startWorkPlanId");
            
            // Clear and set values
            if (orderNumberInput) orderNumberInput.value = "";
            if (planIdInput) planIdInput.value = plan.PlanID;
            
            await safeModalOperation('startWorkOrderModal', 'show');
          } catch (error) {
            console.error('Error opening start work modal:', error);
            showToast('ไม่สามารถเปิดฟอร์มเริ่มงานได้ กรุณาลองใหม่', 'danger');
          }
        };
      }
      
      // Handler for cancelPlanBtn (Cancel Work button)
      const cancelPlanBtn = document.getElementById("cancelPlanBtn");
      if (cancelPlanBtn) {
        cancelPlanBtn.onclick = async function (e) {
          e.preventDefault();
          
          // Enhanced logging for cancel action
          console.log('🗑️ Cancel Plan Button Clicked:', {
            planId: plan.PlanID,
            productName: plan.ProductName,
            lotNumber: plan.LotNumber,
            departmentName: plan.DepartmentName,
            currentStatus: plan.Status,
            plannedStart: plan.PlannedStartTime,
            plannedEnd: plan.PlannedEndTime,
            machineNames: plan.MachineNames || plan.MachineName,
            canceledAt: new Date().toISOString(),
            canceledBy: 'User Action'
          });
          
          if (confirm("⚠️ คุณต้องการยกเลิกงานนี้ใช่หรือไม่?\n\n" +
                     `งาน: ${plan.ProductName || 'ไม่ระบุ'}\n` +
                     `Lot: ${plan.LotNumber || 'ไม่ระบุ'}\n` +
                     `แผนก: ${plan.DepartmentName || 'ไม่ระบุ'}\n\n` +
                     "การยกเลิกงานจะไม่สามารถกู้คืนได้")) {
            try {
              const updatedPlan = { ...plan, Status: "cancelled" };
              
              console.log('🔄 Updating plan status to cancelled:', {
                planId: updatedPlan.PlanID,
                oldStatus: plan.Status,
                newStatus: updatedPlan.Status,
                timestamp: new Date().toISOString()
              });
              
              await PlanManager.updatePlan(updatedPlan);
              
              console.log('✅ Plan successfully cancelled:', {
                planId: updatedPlan.PlanID,
                productName: updatedPlan.ProductName,
                completedAt: new Date().toISOString()
              });
              
              showToast(`ยกเลิกงาน "${plan.ProductName} (${plan.LotNumber})" สำเร็จ`, "success");
              
              // ปิด modal อย่างปลอดภัย
              try {
                await safeModalOperation('taskDetailModal', 'hide');
              } catch (modalError) {
                console.error('Error closing task detail modal:', modalError);
              }
              // Update status counts after changing status
              if (formStepManager) {
                formStepManager.updateStatusCounts();
              }
            } catch (error) {
              console.error('❌ Cancel plan error:', error);
              console.error('Error details:', {
                planId: plan.PlanID,
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
              });
              showToast("เกิดข้อผิดพลาดในการยกเลิกงาน: " + error.message, "danger");
            }
          } else {
            console.log('🚫 Cancel operation aborted by user for plan:', plan.PlanID);
          }
        };
      }
    }, 0);
    
    // ใช้ safeModalOperation สำหรับเปิด modal อย่างปลอดภัย
    safeModalOperation('taskDetailModal', 'show').catch(error => {
      console.error('Error opening task detail modal:', error);
      showToast('ไม่สามารถเปิดหน้าต่างรายละเอียดได้ กรุณาลองใหม่', 'danger');
    });
  };
}

// ================================================================
// 8.1 START WORK ORDER MODAL HANDLER
// ================================================================

/**
 * จัดการ Modal สำหรับกรอกเลข Order เพื่อเริ่มดำเนินงาน
 */
function initializeStartWorkOrderModal() {
  const confirmStartWorkBtn = document.getElementById("confirmStartWorkBtn");
  
  if (confirmStartWorkBtn) {
    confirmStartWorkBtn.onclick = async function(e) {
      e.preventDefault();
      
      console.log('=== START WORK ORDER PROCESS ===');
      
      const orderNumberInput = document.getElementById("orderNumber");
      const planIdInput = document.getElementById("startWorkPlanId");
      
      console.log('Order input element:', orderNumberInput);
      console.log('Plan ID input element:', planIdInput);
      
      // Validate Order Number
      if (!orderNumberInput || !orderNumberInput.value.trim()) {
        console.log('Order number validation failed');
        if (orderNumberInput) {
          orderNumberInput.classList.add('is-invalid');
          orderNumberInput.focus();
        }
        showToast("กรุณากรอกเลข Order", "warning");
        return;
      }
      
      const orderNumber = orderNumberInput.value.trim();
      const planId = planIdInput ? planIdInput.value : null;
      
      console.log('Order Number:', orderNumber);
      console.log('Plan ID:', planId);
      
      if (!planId) {
        console.log('Plan ID not found');
        showToast("ไม่พบข้อมูลแผนงาน กรุณาลองใหม่อีกครั้ง", "danger");
        return;
      }
      
      try {
        // หา plan จาก planId
        console.log('Finding plan with ID:', planId);
        console.log('Available plans:', plans.map(p => ({ id: p.PlanID, status: p.Status })));
        
        const plan = plans.find(p => p.PlanID.toString() === planId.toString());
        if (!plan) {
          console.log('Plan not found in plans array');
          showToast("ไม่พบข้อมูลแผนงาน", "danger");
          return;
        }
        
        console.log('Found plan:', plan);
        
        // เพิ่มเลข Order ลงในข้อมูลแผนงานและเปลี่ยนสถานะ
        const updatedPlan = { 
          ...plan, 
          Status: "in-progress",
          OrderNumber: orderNumber
        };
        
        console.log('Updated plan data:', updatedPlan);
        
        // แสดง Loading
        showLoading(true);
        
        try {
          console.log('Calling PlanManager.updatePlan...');
          await PlanManager.updatePlan(updatedPlan);
          console.log('Plan updated successfully');
          
          // ซ่อน Loading
          showLoading(false);
          
          // ซ่อน Modal กรอกเลข Order อย่างปลอดภัย
          try {
            await safeModalOperation('startWorkOrderModal', 'hide');
            console.log('Start work order modal hidden successfully');
          } catch (modalError) {
            console.error('Error hiding start work order modal:', modalError);
          }
          
          // ซ่อน Plan Detail Modal อย่างปลอดภัย
          try {
            await safeModalOperation('taskDetailModal', 'hide');
            console.log('Task detail modal hidden successfully');
          } catch (modalError) {
            console.error('Error hiding task detail modal:', modalError);
          }
          
          console.log('Showing success toast');
          showToast(`เริ่มดำเนินงานสำเร็จ (Order: ${orderNumber})`, "success");
          
          // Update status counts after changing status (with error handling)
          try {
            console.log('Updating status counts...');
            if (formStepManager) {
              formStepManager.updateStatusCounts();
            }
            console.log('Status counts updated successfully');
          } catch (statusError) {
            console.warn('Status count update error (non-critical):', statusError);
          }
          
          console.log('=== START WORK ORDER PROCESS COMPLETED ===');
          
        } catch (updateError) {
          showLoading(false);
          console.error('Update plan error:', updateError);
          showToast("เกิดข้อผิดพลาดในการอัปเดตข้อมูล: " + updateError.message, "danger");
        }
        
      } catch (error) {
        showLoading(false);
        console.error('Start work with order error:', error);
        showToast("เกิดข้อผิดพลาดในการเริ่มดำเนินงาน: " + error.message, "danger");
      }
    };
  }
  
  // Handle Enter key in order number input
  const orderNumberInput = document.getElementById("orderNumber");
  if (orderNumberInput) {
    orderNumberInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const confirmBtn = document.getElementById("confirmStartWorkBtn");
        if (confirmBtn) {
          confirmBtn.click();
        }
      }
    });
    
    // Remove invalid class when user starts typing
    orderNumberInput.addEventListener('input', function() {
      this.classList.remove('is-invalid');
    });
  }
}

// ================================================================
// 9. APPLICATION INITIALIZATION
// ================================================================

/**
 * เริ่มต้นระบบเมื่อ DOM โหลดเสร็จ
 * ล้างฟิลเตอร์ เริ่มต้น FullCalendar และโหลดข้อมูลจากฐานข้อมูล
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log('DOM Content Loaded - Starting initialization...');
  
  try {
    // โหลดข้อมูลพื้นฐานจากฐานข้อมูล
    console.log('Loading basic data from database...');
    await Promise.all([
      loadDepartments(),
      loadProducts()
    ]);
    console.log('Basic data loaded successfully');
    
    // ล้างฟิลเตอร์เมื่อโหลดหน้าเพื่อแสดงงานทั้งหมด
    clearAllFiltersOnLoad();
    
    // Setup filter form listeners
    setupFilterForm();
    
    // Setup currentDateTime badge click handler
    setupCurrentDateTimeBadge();
    
    // Initialize FullCalendar first
    initializeCalendar();
    
    // โหลดข้อมูลขนาดผลิตภัณฑ์
    await loadProductSizes();
    
    // Then render calendar data
    await CalendarRenderer.render();
    
    console.log('Initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
    showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น', 'danger');
  }
});

/**
 * เริ่มต้น Bootstrap Tooltips สำหรับ UI elements
 */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
    new bootstrap.Tooltip(el);
  });
});

// ================================================================
// 10. FORM HANDLING AND TASK OPERATIONS
// ================================================================

/**
 * จัดการการเติมข้อมูลฟอร์มเมื่อแก้ไขแผนงาน
 * แปลงข้อมูลจากฐานข้อมูล ProductionPlans ให้เข้ากับฟอร์ม UI
 */

// ฟังก์ชันจัดการโหมด modal (ปรับปรุงให้ robust สำหรับ server environment)
function setModalMode(isEditMode, planData = null) {
  return new Promise((resolve, reject) => {
    // ตรวจสอบและรอให้ elements พร้อม
    const checkElements = () => {
      const modalTitle = document.getElementById('modalTitle');
      const submitBtnText = document.getElementById('submitBtnText');
      const cancelBtnText = document.getElementById('cancelBtnText');
      
      if (!modalTitle || !submitBtnText || !cancelBtnText) {
        return false;
      }
      
      try {
        if (isEditMode) {
          modalTitle.textContent = 'แก้ไขแผนงาน';
          submitBtnText.textContent = 'บันทึกการแก้ไข';
          cancelBtnText.textContent = 'ยกเลิกการแก้ไข';
        } else {
          modalTitle.textContent = 'เพิ่มงานใหม่';
          submitBtnText.textContent = 'เพิ่มแผนงาน';
          cancelBtnText.textContent = 'ยกเลิก';
        }
        return true;
      } catch (error) {
        console.error('Error setting modal mode:', error);
        return false;
      }
    };
    
    // ลองทำ 10 ครั้ง ห่างกัน 100ms
    let attempts = 0;
    const maxAttempts = 10;
    
    const trySetMode = () => {
      if (checkElements()) {
        resolve();
        return;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        console.warn('setModalMode: Could not find required elements after', maxAttempts, 'attempts');
        reject(new Error('Modal elements not available'));
        return;
      }
      
      setTimeout(trySetMode, 100);
    };
    
    trySetMode();
  });
}

async function fillAddJobFormWithPlan(plan) {
  const form = document.getElementById("addJobForm");
  if (!form || !plan) {
    console.error('fillAddJobFormWithPlan: Missing form or plan', { form: !!form, plan: !!plan });
    return;
  }
  
  console.log('📝 Starting fillAddJobFormWithPlan with plan:', plan);
  
  // ตั้งสถานะว่าเป็นการแก้ไข
  window.selectedEditPlan = plan;
  
  // ตั้งค่าโหมดแก้ไข (รอให้สำเร็จ)
  try {
    await setModalMode(true, plan);
  } catch (error) {
    console.error('Failed to set modal mode:', error);
    return;
  }
  
  // Helper to safely set value if field exists
  function setField(name, value) {
    const field = form[name] || form.querySelector(`[name="${name}"]`) || document.getElementById(name);
    if (field) {
      field.value = value;
      console.log(`✅ Set field ${name} to:`, value);
      return true;
    } else {
      console.warn(`⚠️ Field ${name} not found`);
      return false;
    }
  }
  
  // เซ็ตค่าฟิลด์ตามโครงสร้างฐานข้อมูล ProductionPlans
  if (plan.DepartmentID) {
    // เซ็ตแผนกและ trigger change event เพื่อโหลดเครื่องจักร
    const departmentSelect = form.querySelector('[name="departmentID"]') || document.getElementById("department");
    console.log('🏢 Department select element found:', !!departmentSelect);
    
    if (departmentSelect) {
      console.log('🏢 Setting department to:', plan.DepartmentID.toString());
      departmentSelect.value = plan.DepartmentID.toString();
      
      // Trigger change event เพื่อโหลดเครื่องจักร
      console.log('🔄 Triggering change event for department');
      departmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.error('❌ Department select element not found');
    }
  }
  
  // เซ็ตผลิตภัณฑ์และขนาด
  if (plan.ProductName) {
    setField("productName", plan.ProductName);
  }
  if (plan.ProductSize) {
    setField("productSize", plan.ProductSize);
  }
  
  // เซ็ตฟิลด์พื้นฐาน
  setField("lotNumber", plan.LotNumber || "");
  setField("lotSize", plan.LotSize || "");
  setField("targetOutput", plan.TargetOutput || "");
  setField("workerCount", plan.WorkerCount || "");
  setField("details", plan.Details || "");
  setField("Status", plan.Status || "planning");
  
  // เซ็ตวันที่และเวลาเริ่มต้นและสิ้นสุดเมื่อแก้ไขแผนงาน
  if (plan.PlannedStartTime) {
    const start = new Date(plan.PlannedStartTime);
    // ใช้ local date โดยตรง
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    
    // ตั้งค่าให้ hidden date field และ display field
    setDateValue("startDate", `${year}-${month}-${day}`);
    
    // Store start time values to set later
    window.tempEditStartHour = hours;
    window.tempEditStartMinute = minutes;
    console.log(`🕐 Stored start time for later: ${hours}:${minutes}`);
  }
  
  // เติมเวลาสิ้นสุดเมื่อแก้ไขแผนงาน (แต่ไม่เติมเมื่อเพิ่มใหม่)
  if (plan.PlannedEndTime) {
    const end = new Date(plan.PlannedEndTime);
    // ใช้ local date โดยตรง
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');
    const endHours = String(end.getHours()).padStart(2, '0');
    const endMinutes = String(end.getMinutes()).padStart(2, '0');
    
    // ตั้งค่าให้ hidden date field และ display field
    setDateValue("endDate", `${endYear}-${endMonth}-${endDay}`);
    
    // Store end time values to set later
    window.tempEditEndHour = endHours;
    window.tempEditEndMinute = endMinutes;
    console.log(`🕐 Stored end time for later: ${endHours}:${endMinutes}`);
  }
  
  // เลือกเครื่องจักรที่ถูกต้อง (checkbox multiple selection)
  // ใช้ timeout hierarchy เพื่อให้แน่ใจว่าเครื่องจักรโหลดเสร็จ
  setTimeout(async () => {
    console.log('🔧 Starting machine and sub-department checkbox selection...');
    
    // ===========================================
    // 1. จัดการ Machine Checkboxes
    // ===========================================
    const machineGroup = document.getElementById("machineCheckboxGroup");
    
    if (!machineGroup) {
      console.error('❌ Machine checkbox group not found');
      return;
    }
    
    // ล้างการเลือกเครื่องจักรเดิม
    const allMachineCheckboxes = machineGroup.querySelectorAll('input[type="checkbox"]');
    console.log(`🔧 Found ${allMachineCheckboxes.length} machine checkboxes`);
    allMachineCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    
    const machineResults = [];
    
    if (plan.MachineIDs) {
      // ถ้ามี MachineIDs (รายการเครื่องจักรหลายเครื่อง)
      const machineIds = plan.MachineIDs.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      console.log('🔧 Setting machine checkboxes for IDs:', machineIds);
      
      for (const machineId of machineIds) {
        let machineCheckbox = null;
        let selectionMethod = '';
        
        // วิธีที่ 1: getElementById
        machineCheckbox = document.getElementById(`machine${machineId}`);
        if (machineCheckbox) {
          selectionMethod = 'getElementById';
        }
        
        // วิธีที่ 2: querySelector by value
        if (!machineCheckbox) {
          machineCheckbox = machineGroup.querySelector(`input[value="${machineId}"]`);
          if (machineCheckbox) {
            selectionMethod = 'value selector';
          }
        }
        
        // วิธีที่ 3: querySelector by name และ value
        if (!machineCheckbox) {
          machineCheckbox = machineGroup.querySelector(`input[name="machines[]"][value="${machineId}"]`);
          if (machineCheckbox) {
            selectionMethod = 'name+value selector';
          }
        }
        
        const result = {
          machineId: machineId,
          found: !!machineCheckbox,
          method: selectionMethod,
          selected: false
        };
        
        if (machineCheckbox) {
          machineCheckbox.checked = true;
          result.selected = true;
          console.log(`✅ Machine ${machineId} selected via ${selectionMethod}`);
        } else {
          console.error(`❌ Machine checkbox for ID ${machineId} not found`);
        }
        
        machineResults.push(result);
      }
    } else if (plan.MachineID) {
      // ถ้ามีแค่ MachineID เดียว (backward compatibility)
      const machineId = parseInt(plan.MachineID);
      let machineCheckbox = null;
      let selectionMethod = '';
      
      // ลองหาด้วยหลายวิธี
      machineCheckbox = document.getElementById(`machine${machineId}`);
      if (machineCheckbox) {
        selectionMethod = 'getElementById';
      }
      
      if (!machineCheckbox) {
        machineCheckbox = machineGroup.querySelector(`input[value="${machineId}"]`);
        if (machineCheckbox) {
          selectionMethod = 'value selector';
        }
      }
      
      if (!machineCheckbox) {
        machineCheckbox = machineGroup.querySelector(`input[name="machines[]"][value="${machineId}"]`);
        if (machineCheckbox) {
          selectionMethod = 'name+value selector';
        }
      }
      
      const result = {
        machineId: machineId,
        found: !!machineCheckbox,
        method: selectionMethod,
        selected: false
      };
      
      if (machineCheckbox) {
        machineCheckbox.checked = true;
        result.selected = true;
        console.log(`✅ Single machine ${machineId} selected via ${selectionMethod}`);
      } else {
        console.error(`❌ Single machine checkbox for ID ${machineId} not found`);
      }
      
      machineResults.push(result);
    } else {
      console.warn('⚠️ No MachineIDs or MachineID found in plan');
    }
    
    // Log ผลลัพธ์สุดท้าย
    const checkedMachines = machineGroup.querySelectorAll('input[type="checkbox"]:checked');
    console.log(`🎯 Final result: ${checkedMachines.length} machines checked`);
    
    if (checkedMachines.length === 0) {
      console.error('🚨 No machines were selected! This might cause issues.');
    }
    
    // ===========================================
    // 2. จัดการ SubDepartment Checkboxes
    // ===========================================
    const subDepartmentGroup = document.getElementById("subDepartmentCheckboxGroup");
    const subDepartmentResults = [];
    
    if (subDepartmentGroup) {
      console.log('🔧 Starting sub-department checkbox selection...');
      
      // ล้างการเลือก sub-department เดิม
      const allSubDeptCheckboxes = subDepartmentGroup.querySelectorAll('input[type="checkbox"]');
      console.log(`🔧 Found ${allSubDeptCheckboxes.length} sub-department checkboxes`);
      allSubDeptCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
      
      if (plan.SubDepartmentIDs) {
        // ถ้ามี SubDepartmentIDs (รายการหน่วยงานย่อยหลายหน่วย)
        const subDeptIds = plan.SubDepartmentIDs.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        console.log('🔧 Setting sub-department checkboxes for IDs:', subDeptIds);
        
        for (const subDeptId of subDeptIds) {
          let subDeptCheckbox = null;
          let selectionMethod = '';
          
          // วิธีที่ 1: getElementById
          subDeptCheckbox = document.getElementById(`subDept${subDeptId}`);
          if (subDeptCheckbox) {
            selectionMethod = 'getElementById';
          }
          
          // วิธีที่ 2: querySelector by value
          if (!subDeptCheckbox) {
            subDeptCheckbox = subDepartmentGroup.querySelector(`input[value="${subDeptId}"]`);
            if (subDeptCheckbox) {
              selectionMethod = 'value selector';
            }
          }
          
          // วิธีที่ 3: querySelector by name และ value
          if (!subDeptCheckbox) {
            subDeptCheckbox = subDepartmentGroup.querySelector(`input[name="subDepartments[]"][value="${subDeptId}"]`);
            if (subDeptCheckbox) {
              selectionMethod = 'name+value selector';
            }
          }
          
          const result = {
            subDeptId: subDeptId,
            found: !!subDeptCheckbox,
            method: selectionMethod,
            selected: false
          };
          
          if (subDeptCheckbox) {
            subDeptCheckbox.checked = true;
            result.selected = true;
            console.log(`✅ SubDepartment ${subDeptId} selected via ${selectionMethod}`);
          } else {
            console.error(`❌ SubDepartment checkbox for ID ${subDeptId} not found`);
          }
          
          subDepartmentResults.push(result);
        }
      } else if (plan.SubDepartmentID) {
        // ถ้ามีแค่ SubDepartmentID เดียว (backward compatibility)
        const subDeptId = parseInt(plan.SubDepartmentID);
        let subDeptCheckbox = null;
        let selectionMethod = '';
        
        // ลองหาด้วยหลายวิธี
        subDeptCheckbox = document.getElementById(`subDept${subDeptId}`);
        if (subDeptCheckbox) {
          selectionMethod = 'getElementById';
        }
        
        if (!subDeptCheckbox) {
          subDeptCheckbox = subDepartmentGroup.querySelector(`input[value="${subDeptId}"]`);
          if (subDeptCheckbox) {
            selectionMethod = 'value selector';
          }
        }
        
        if (!subDeptCheckbox) {
          subDeptCheckbox = subDepartmentGroup.querySelector(`input[name="subDepartments[]"][value="${subDeptId}"]`);
          if (subDeptCheckbox) {
            selectionMethod = 'name+value selector';
          }
        }
        
        const result = {
          subDeptId: subDeptId,
          found: !!subDeptCheckbox,
          method: selectionMethod,
          selected: false
        };
        
        if (subDeptCheckbox) {
          subDeptCheckbox.checked = true;
          result.selected = true;
          console.log(`✅ Single sub-department ${subDeptId} selected via ${selectionMethod}`);
        } else {
          console.error(`❌ Single sub-department checkbox for ID ${subDeptId} not found`);
        }
        
        subDepartmentResults.push(result);
      } else {
        console.warn('⚠️ No SubDepartmentIDs or SubDepartmentID found in plan');
      }
      
      // Log ผลลัพธ์ sub-department
      const checkedSubDepts = subDepartmentGroup.querySelectorAll('input[type="checkbox"]:checked');
      console.log(`🎯 Final result: ${checkedSubDepts.length} sub-departments checked`);
      
    } else {
      console.warn('⚠️ SubDepartment checkbox group not found');
    }
    
    // Debug form population results
    debugFormPopulation(plan, machineResults, subDepartmentResults);
    
  }, 2000); // เพิ่มเวลารอเป็น 2 วินาที
  
  // ===========================================
  // 3. เติมข้อมูล Break Time และ Setup Time
  // ===========================================
  console.log('🍽️ Setting up break time and setup time from plan data...');
  
  // เติม Break Time จากข้อมูลแผนงาน
  if (plan.BreakMorningMinutes !== undefined) {
    const breakMorning = document.getElementById('breakMorning');
    const breakMorningMinutes = document.getElementById('breakMorningMinutes');
    if (breakMorning && breakMorningMinutes) {
      breakMorning.checked = plan.BreakMorningMinutes > 0;
      breakMorningMinutes.value = plan.BreakMorningMinutes || 15;
      console.log(`✅ Break Morning: ${breakMorning.checked}, Minutes: ${breakMorningMinutes.value}`);
    }
  }
  
  if (plan.BreakLunchMinutes !== undefined) {
    const breakLunch = document.getElementById('breakLunch');
    const breakLunchMinutes = document.getElementById('breakLunchMinutes');
    if (breakLunch && breakLunchMinutes) {
      breakLunch.checked = plan.BreakLunchMinutes > 0;
      breakLunchMinutes.value = plan.BreakLunchMinutes || 60;
      console.log(`✅ Break Lunch: ${breakLunch.checked}, Minutes: ${breakLunchMinutes.value}`);
    }
  }
  
  if (plan.BreakEveningMinutes !== undefined) {
    const breakEvening = document.getElementById('breakEvening');
    const breakEveningMinutes = document.getElementById('breakEveningMinutes');
    if (breakEvening && breakEveningMinutes) {
      breakEvening.checked = plan.BreakEveningMinutes > 0;
      breakEveningMinutes.value = plan.BreakEveningMinutes || 15;
      console.log(`✅ Break Evening: ${breakEvening.checked}, Minutes: ${breakEveningMinutes.value}`);
    }
  }
  
  // เติม Setup Time จากข้อมูลแผนงาน
  if (plan.SetupMinutes !== undefined) {
    const setupTimeMinutes = document.getElementById('setupTimeMinutes');
    if (setupTimeMinutes) {
      setupTimeMinutes.value = plan.SetupMinutes || 30;
      console.log(`✅ Setup Time Minutes: ${setupTimeMinutes.value}`);
    }
  }
  
  if (plan.SetupNote) {
    const setupNotes = document.getElementById('setupNotes');
    if (setupNotes) {
      setupNotes.value = plan.SetupNote;
      console.log(`✅ Setup Notes: ${setupNotes.value}`);
    }
  }
  
  // อัปเดตการคำนวณ Total Break Time
  setTimeout(() => {
    calculateTotalBreakTime();
    
    // เติมเวลาใน dropdown หลังจากที่ dropdown พร้อม
    if (window.tempEditStartHour && window.tempEditStartMinute) {
      const startHourSelect = document.getElementById('startHour');
      const startMinuteSelect = document.getElementById('startMinute');
      
      if (startHourSelect && startMinuteSelect) {
        startHourSelect.value = window.tempEditStartHour;
        startMinuteSelect.value = window.tempEditStartMinute;
        console.log(`✅ Set start time: ${window.tempEditStartHour}:${window.tempEditStartMinute}`);
        
        // ลบตัวแปรชั่วคราว
        delete window.tempEditStartHour;
        delete window.tempEditStartMinute;
      } else {
        console.warn('⚠️ Start time dropdowns not found');
      }
    }
    
    if (window.tempEditEndHour && window.tempEditEndMinute) {
      const endHourSelect = document.getElementById('endHour');
      const endMinuteSelect = document.getElementById('endMinute');
      
      if (endHourSelect && endMinuteSelect) {
        endHourSelect.value = window.tempEditEndHour;
        endMinuteSelect.value = window.tempEditEndMinute;
        console.log(`✅ Set end time: ${window.tempEditEndHour}:${window.tempEditEndMinute}`);
        
        // ลบตัวแปรชั่วคราว
        delete window.tempEditEndHour;
        delete window.tempEditEndMinute;
      } else {
        console.warn('⚠️ End time dropdowns not found');
      }
    }
    
    // อัปเดต duration display หลังจากเติมข้อมูลเสร็จ
    if (window.updateDurationDisplay) {
      window.updateDurationDisplay();
    }
    
    console.log('✅ Break time and setup time population completed');
  }, 100);
  
  console.log('✅ Form population setup completed');
}

// ฟังก์ชันแปลง Date เป็น string สำหรับฐานข้อมูล (ไม่แปลง timezone)
function formatDateForDB(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function setupAddJobFormHandler() {
  const addJobForm = document.getElementById("addJobForm");
  if (addJobForm && !addJobForm._handlerAdded) {
    addJobForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(addJobForm);
      
      // Validation พื้นฐาน
      if (!formData.get("departmentID")) {
        showToast("กรุณาเลือกแผนก", "danger");
        return;
      }
      
      if (!formData.get("productName")) {
        showToast("กรุณาเลือกผลิตภัณฑ์", "danger");
        return;
      }
      
      if (!formData.get("productSize")) {
        showToast("กรุณาเลือกขนาดผลิตภัณฑ์", "danger");
        return;
      }
      
      if (!formData.get("lotNumber")) {
        showToast("กรุณากรอก Lot Number", "danger");
        return;
      }
      
      const LotSize = parseInt(formData.get("lotSize"), 10);
      if (isNaN(LotSize) || LotSize <= 0) {
        showToast("Lot Size ต้องมากกว่า 0", "danger");
        return;
      }
      
      const WorkerCount = parseInt(formData.get("workerCount"), 10);
      if (isNaN(WorkerCount) || WorkerCount <= 0) {
        showToast("จำนวนคนต้องมากกว่า 0", "danger");
        return;
      }
      
      // ตรวจสอบวันที่และเวลา - ใช้ hidden date fields
      const startDate = getDateValue("startDate");  // จาก hidden field
      const endDate = getDateValue("endDate");     // จาก hidden field
      
      // อ่านเวลาจาก dropdown
      const startTime = getFormTimeValue('startHour', 'startMinute');
      const endTime = getFormTimeValue('endHour', 'endMinute');
      
      if (!startDate || !startTime || !endDate || !endTime) {
        showToast("กรุณากรอกวันที่และเวลาให้ครบถ้วน", "danger");
        return;
      }
      
      // สร้าง Date objects โดยใช้วันที่และเวลาแยกกัน
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      // ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่มต้น
      if (endDateTime <= startDateTime) {
        showToast("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น", "danger");
        return;
      }
      
      // ตรวจสอบการชนเวลาในแผนกเดียวกัน
      const departmentId = parseInt(formData.get("departmentID"), 10);
      const timeConflictCheck = await checkDepartmentTimeConflict(
        departmentId,
        startDateTime,
        endDateTime,
        window.selectedEditPlan?.PlanID // ไม่เช็คกับตัวเองถ้าเป็นการแก้ไข
      );
      
      if (timeConflictCheck.hasConflict) {
        console.warn('⚠️ Time conflict detected:', timeConflictCheck);
        showToast(
          `ไม่สามารถลงงานได้ เนื่องจากแผนกนี้มีงานอื่นในช่วงเวลาที่ซ้อนกัน\n` +
          `งานที่ชน: ${timeConflictCheck.conflictingPlan.ProductName} (${timeConflictCheck.conflictingPlan.LotNumber})\n` +
          `เวลาชน: ${Utils.formatDateTime(timeConflictCheck.conflictingPlan.PlannedStartTime)} - ${Utils.formatDateTime(timeConflictCheck.conflictingPlan.PlannedEndTime)}`,
          "danger"
        );
        return;
      }
      
      // ตรวจสอบเครื่องจักรที่เลือก (checkbox - อนุญาตให้เลือกได้หลายเครื่อง)
      const selectedMachines = document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked');
      if (selectedMachines.length === 0) {
        showToast("กรุณาเลือกเครื่องจักรอย่างน้อย 1 เครื่อง", "danger");
        return;
      }
      
      // รวบรวม MachineID ที่เลือก (เก็บเป็น array หรือ string รวมกัน)
      const machineIds = Array.from(selectedMachines).map(machine => parseInt(machine.value, 10));
      const machineIdString = machineIds.join(','); // เก็บเป็น "1,2,3" ในฐานข้อมูล
      
      // รวบรวม SubDepartmentIDs ที่เลือก
      const selectedSubDepartments = document.querySelectorAll('input[name="subDepartments[]"]:checked');
      const subDepartmentIds = Array.from(selectedSubDepartments).map(sub => parseInt(sub.value, 10));
      const subDepartmentIdString = subDepartmentIds.join(','); // เก็บเป็น "1,2,3" ในฐานข้อมูล
      
      // ดึงข้อมูลผลิตภัณฑ์และขนาด (ProductDisplayName จะถูกสร้างอัตโนมัติโดยฐานข้อมูล)
      const productName = formData.get("productName") || "";
      const productSize = formData.get("productSize") || "";
      
      // คำนวณข้อมูล Break time และ Setup time
      const breakMorningChecked = document.getElementById('breakMorning')?.checked || false;
      const breakLunchChecked = document.getElementById('breakLunch')?.checked || false;
      const breakEveningChecked = document.getElementById('breakEvening')?.checked || false;
      
      const breakMorningMinutes = breakMorningChecked ? parseInt(document.getElementById('breakMorningMinutes')?.value || 0) : 0;
      const breakLunchMinutes = breakLunchChecked ? parseInt(document.getElementById('breakLunchMinutes')?.value || 0) : 0;
      const breakEveningMinutes = breakEveningChecked ? parseInt(document.getElementById('breakEveningMinutes')?.value || 0) : 0;
      const setupTimeMinutes = parseInt(document.getElementById('setupTimeMinutes')?.value || 0);
      const setupNotes = document.getElementById('setupNotes')?.value || "";
      
      const planData = {
        LotNumber: formData.get("lotNumber"),
        LotSize: LotSize,
        TargetOutput: parseInt(formData.get("targetOutput") || "0", 10),
        WorkerCount: WorkerCount,
        ProductName: productName,
        ProductSize: productSize,
        DepartmentID: parseInt(formData.get("departmentID"), 10),
        SubDepartmentID: subDepartmentIds.length > 0 ? subDepartmentIds[0] : null, // SubDepartment แรกเป็น primary
        MachineID: machineIds[0], // เก็บเครื่องแรกเป็น primary machine
        MachineIDs: machineIdString, // เก็บรายการเครื่องทั้งหมด
        SubDepartmentIDs: subDepartmentIdString,
        Status: formData.get("Status") || "planning",
        PlannedStartTime: formatDateForDB(startDateTime),
        PlannedEndTime: formatDateForDB(endDateTime),
        Details: formData.get("details") || "",
        // เพิ่มข้อมูล Break time และ Setup time
        BreakMorningMinutes: breakMorningMinutes,
        BreakLunchMinutes: breakLunchMinutes,
        BreakEveningMinutes: breakEveningMinutes,
        SetupMinutes: setupTimeMinutes, // แก้ไขจาก SetupTimeMinutes เป็น SetupMinutes
        SetupNote: setupNotes,
        CreatedByUserID: 1,
        UpdatedByUserID: 1
      };
      
      // เพิ่ม debug การส่งข้อมูล
      const isEdit = window.selectedEditPlan && window.selectedEditPlan.PlanID;
      debugFormData(isEdit ? 'Edit Plan' : 'Add Plan', formData, planData);
      
      if (isEdit) {
        try {
          planData.PlanID = window.selectedEditPlan.PlanID;
          console.log("🔄 Updating plan with ID:", planData.PlanID);
          console.log("📋 Plan data being sent:", planData);
          
          const result = await PlanManager.updatePlan(planData);
          console.log("✅ Update result:", result);
          
          showToast("แก้ไขแผนงานสำเร็จ", "success");
        } catch (error) {
          console.error('❌ Update plan error:', error);
          showToast("เกิดข้อผิดพลาดในการแก้ไขแผนงาน: " + error.message, "danger");
          return;
        }
      } else {
        try {
          console.log("➕ Adding new plan");
          console.log("📋 Plan data being sent:", planData);
          
          const result = await PlanManager.addPlan(planData);
          console.log("✅ Add result:", result);
          
          showToast(`เพิ่มแผนงานสำเร็จ - ใช้เครื่องจักร ${selectedMachines.length} เครื่อง`, "success");
        } catch (error) {
          console.error('❌ Add plan error:', error);
          showToast("เกิดข้อผิดพลาดในการเพิ่มแผนงาน: " + error.message, "danger");
          return;
        }
      }
      
      // ปิด modal และ reset form อย่างปลอดภัย
      try {
        await safeModalOperation('addJobModal', 'hide');
      } catch (modalError) {
        console.error('Error closing modal:', modalError);
        // ไม่ต้อง return เพราะการปิด modal ไม่สำคัญเท่ากับการบันทึกข้อมูล
      }
      
      // รอให้ modal ปิดก่อนแล้วค่อย reset
      setTimeout(() => {
        addJobForm.reset();
        window.selectedEditPlan = null;
        
        // รีเซ็ต modal title และปุ่ม
        const modalTitle = document.querySelector("#addJobModal .modal-title span");
        const submitBtn = document.querySelector("#addJobModal button[type='submit']");
        if (modalTitle) modalTitle.textContent = "เพิ่มแผนงานใหม่";
        if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-save me-1"></i>เพิ่มแผนงาน';
        
        // รีเซ็ต step manager
        if (formStepManager) {
          formStepManager.reset();
        }
        
        // ล้างการเลือกเครื่องจักร
        const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
        if (machineCheckboxGroup) {
          machineCheckboxGroup.innerHTML = `
            <div class="text-muted text-center py-3">
              <i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน
            </div>
          `;
        }
        
        // ล้างการเลือกขนาดผลิตภัณฑ์
        const sizeRadios = document.querySelectorAll('input[name="productSize"]');
        sizeRadios.forEach(radio => {
          radio.checked = false;
        });
        
        // รีเซ็ต Break time และ Setup time
        resetBreakAndSetupTime();
        
        console.log("✅ Form reset completed");
      }, 300);
    });
    addJobForm._handlerAdded = true;
    console.log("✅ Form submit handler added");
  }
}
document.addEventListener("DOMContentLoaded", setupAddJobFormHandler);

// ================================================================
// DEBUG UTILITIES
// ================================================================

// Debug utility สำหรับตรวจสอบการแก้ไขข้อมูล
function debugFormData(operation, formData, planData) {
  console.group(`🔍 DEBUG: ${operation}`);
  
  // Log form data
  console.log('📝 Form Data:', {
    departmentID: formData.get("departmentID"),
    productName: formData.get("productName"),
    productSize: formData.get("productSize"),
    lotNumber: formData.get("lotNumber"),
    lotSize: formData.get("lotSize"),
    workerCount: formData.get("workerCount"),
    targetOutput: formData.get("targetOutput"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    details: formData.get("details")
  });
  
  // Log selected machines
  const selectedMachines = document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked');
  console.log('🔧 Selected Machines:', Array.from(selectedMachines).map(m => ({
    id: m.value,
    name: m.closest('.form-check').querySelector('label .machine-name')?.textContent
  })));
  
  // Log plan data
  console.log('📋 Plan Data:', planData);
  
  // Log edit context
  if (window.selectedEditPlan) {
    console.log('✏️ Edit Context:', {
      planID: window.selectedEditPlan.PlanID,
      originalDepartment: window.selectedEditPlan.DepartmentID,
      originalMachines: window.selectedEditPlan.MachineIDs
    });
  }
  
  console.groupEnd();
}

// Debug utility สำหรับตรวจสอบการ populate form
function debugFormPopulation(plan, machineResults, subDepartmentResults = []) {
  console.group('🔄 DEBUG: Form Population');
  
  console.log('📋 Plan to populate:', plan);
  console.log('🔧 Machine selection results:', machineResults);
  console.log('🏢 SubDepartment selection results:', subDepartmentResults);
  
  // ตรวจสอบ DOM elements
  const elements = {
    department: document.getElementById("department"),
    machineCheckboxGroup: document.getElementById("machineCheckboxGroup"),
    subDepartmentCheckboxGroup: document.getElementById("subDepartmentCheckboxGroup"),
    productName: document.getElementById("productName"),
    productSize: document.querySelector('input[name="productSize"]:checked')
  };
  
  console.log('🎯 DOM Elements:', Object.entries(elements).map(([key, el]) => ({
    element: key,
    found: !!el,
    value: el?.value || el?.textContent || 'N/A'
  })));
  
  // ตรวจสอบจำนวนที่เลือกจริง
  const actualSelections = {
    machines: document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked').length,
    subDepartments: document.querySelectorAll('#subDepartmentCheckboxGroup input[type="checkbox"]:checked').length
  };
  
  console.log('📊 Actual selections:', actualSelections);
  
  console.groupEnd();
}

// ================================================================
// 11. EVENT HANDLERS AND UI INTERACTIONS
// ================================================================

/**
 * ตั้งค่า Event Handlers สำหรับการโต้ตอบกับ UI
 * รวมถึงฟิลเตอร์ ปุ่มยกเลิก และการจัดการเครื่องจักร
 */

// ตั้งค่า Event Listeners สำหรับฟิลเตอร์
function setupFilterForm() {
  console.log('Setting up filter form...');
  
  [
    "departmentFilter",
    "subDepartmentFilter",
    "statusFilter", 
    "keywordFilter",
    "dateFilter",
  ].forEach((id) => {
    const element = document.getElementById(id);
    console.log(`Filter element ${id}:`, element);
    
    if (element) {
      // Event listener สำหรับ input (สำหรับ text input)
      element.addEventListener("input", function () {
        console.log(`Filter ${id} input changed to:`, this.value);
        updateCalendarEvents();
        if (formStepManager) {
          formStepManager.updateStatusCounts();
        }
      });
      
      // Event listener สำหรับ change (สำหรับ select dropdown และ date input)
      element.addEventListener("change", function () {
        console.log(`Filter ${id} changed to:`, this.value);
        
        // ถ้าเป็นการเปลี่ยนแผนกฟิลเตอร์ ให้โหลดหน่วยงานย่อยใหม่
        if (id === 'departmentFilter') {
          const subDepartmentFilter = document.getElementById('subDepartmentFilter');
          if (subDepartmentFilter) {
            subDepartmentFilter.value = '';
            subDepartmentFilter.disabled = true;
            
            if (this.value) {
              renderSubDepartments(this.value, 'subDepartmentFilter').catch(console.error);
            } else {
              subDepartmentFilter.innerHTML = '<option value="">ทุกหน่วยงาน</option>';
              subDepartmentFilter.disabled = true;
            }
          }
        }
        
        // อัปเดต visual feedback สำหรับ date filter
        if (id === 'dateFilter') {
          const dateFilterIcon = document.getElementById('dateFilterIcon');
          if (dateFilterIcon) {
            if (this.value) {
              dateFilterIcon.className = 'bi bi-funnel-fill ms-1';
              dateFilterIcon.style.color = '#0d6efd';
              dateFilterIcon.style.opacity = '1';
            } else {
              dateFilterIcon.className = 'bi bi-funnel ms-1';
              dateFilterIcon.style.color = '';
              dateFilterIcon.style.opacity = '0.6';
            }
          }
        }
        
        updateCalendarEvents();
        if (formStepManager) {
          formStepManager.updateStatusCounts();
        }
      });
      
      console.log(`Added event listeners for ${id}`);
    } else {
      console.error(`Filter element ${id} not found!`);
    }
  });
}

// ตั้งค่าปุ่มยกเลิกใน Modal เพิ่มงานใหม่/แก้ไขงาน
function setupCancelAddJobBtn() {
  const cancelBtn = document.getElementById("cancelAddJobBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      
      // ตรวจสอบว่าเป็นการแก้ไขงานหรือเพิ่มงานใหม่
      const isEditing = window.selectedEditPlan && window.selectedEditPlan.PlanID;
      const confirmMessage = isEditing 
        ? "คุณต้องการยกเลิกการแก้ไขงานใช่หรือไม่?" 
        : "คุณต้องการยกเลิกการเพิ่มงานใหม่ใช่หรือไม่?";
      
      if (confirm(confirmMessage)) {
        // รีเซ็ตข้อมูลการแก้ไข
        window.selectedEditPlan = null;
        
        const modalEl = document.getElementById("addJobModal");
        if (modalEl) {
          const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
          modal.hide();
        }
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", setupCancelAddJobBtn);

// ================================================================
// 12. MACHINE AND DEPARTMENT MANAGEMENT
// ================================================================

/**
 * จัดการเครื่องจักรและแผนกต่างๆ
 * รวมถึงการโหลดข้อมูลจาก API และการแสดงผลเครื่องจักรตามแผนกที่เลือก
 */

/**
 * แสดงผล Checkbox เครื่องจักรตามแผนกที่เลือก
 * รองรับการเลือกหลายเครื่องจักรพร้อมกัน - โหลดจาก API
 */
/**
 * แสดงผล Checkbox หน่วยงานย่อยตามแผนกที่เลือก
 */
async function renderSubDepartmentCheckboxes(departmentId, targetContainerId = 'subDepartmentCheckboxGroup') {
  const subDepartmentContainer = document.getElementById(targetContainerId);
  if (!subDepartmentContainer) {
    console.error(`Sub-department container element not found: ${targetContainerId}`);
    return;
  }
  
  if (!departmentId) {
    subDepartmentContainer.innerHTML = '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน</div>';
    return;
  }
  
  // แสดง loading
  subDepartmentContainer.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm" role="status"></div> กำลังโหลด...</div>';
  
  try {
    const response = await fetch(`tasks.php?action=get_sub_departments&department=${departmentId}`);
    console.log(`Fetching sub-departments for department ${departmentId}:`, response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Sub-departments API response:', data);
    
    if (data.success && data.data && data.data.length > 0) {
      // สร้าง HTML สำหรับ checkbox หน่วยงานย่อย
      let subDepartmentHTML = '<div class="row g-2">';
      
      data.data.forEach((subDept, index) => {
        subDepartmentHTML += `
          <div class="col-12">
            <div class="form-check sub-department-checkbox">
              <input class="form-check-input" type="checkbox" 
                     value="${subDept.SubDepartmentID}" 
                     id="subDept${subDept.SubDepartmentID}" 
                     name="subDepartments[]">
              <label class="form-check-label sub-department-label" 
                     for="subDept${subDept.SubDepartmentID}">
                <div class="sub-department-name">${subDept.SubDepartmentName}</div>
                ${subDept.SubDepartmentDescription ? `<div class="text-muted small">${subDept.SubDepartmentDescription}</div>` : ''}
              </label>
            </div>
          </div>
        `;
      });
      
      subDepartmentHTML += '</div>';
      
      // เพิ่มข้อมูลสรุป
      const activeSubDepartments = data.data.length;
      
      subDepartmentHTML += `
        <div class="mt-3 text-center">
          <small class="text-muted">
            <i class="bi bi-info-circle me-1"></i>
            หน่วยงานย่อยทั้งหมด: ${activeSubDepartments} หน่วยงาน
            <span class="badge bg-info ms-2">เลือกหรือไม่เลือกก็ได้</span>
          </small>
        </div>
      `;
      
      subDepartmentContainer.innerHTML = subDepartmentHTML;
      
      console.log(`Successfully loaded ${data.data.length} sub-departments with checkboxes`);
    } else {
      console.log(`No sub-departments found for department: ${departmentId}`, data);
      subDepartmentContainer.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-info-circle fs-2 d-block mb-2"></i>
          <p class="mb-2">ไม่มีหน่วยงานย่อยในแผนกนี้</p>
          <small class="text-muted d-block mb-2">เครื่องจักรจะโหลดจากแผนกหลักโดยตรง</small>
          <small class="text-muted">แผนก ID: ${departmentId}</small>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading sub-departments:', error);
    subDepartmentContainer.innerHTML = `
      <div class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
        <p class="mb-0">เกิดข้อผิดพลาดในการโหลดหน่วยงานย่อย</p>
        <small class="text-muted">กรุณาลองใหม่อีกครั้ง</small>
      </div>
    `;
  }
}

/**
 * แสดงผล Dropdown หน่วยงานย่อยตามแผนกที่เลือก (สำหรับฟิลเตอร์เท่านั้น)
 */
async function renderSubDepartments(departmentId, targetSelectId = 'subDepartment') {
  // ถ้าเป็น main form ให้ใช้ checkbox แทน
  if (targetSelectId === 'subDepartment') {
    return renderSubDepartmentCheckboxes(departmentId, 'subDepartmentCheckboxGroup');
  }
  
  // สำหรับ filter dropdown เท่านั้น
  const subDepartmentSelect = document.getElementById(targetSelectId);
  if (!subDepartmentSelect) {
    console.error(`Sub-department select element not found: ${targetSelectId}`);
    return;
  }
  
  if (!departmentId) {
    subDepartmentSelect.innerHTML = '<option value="">ทุกหน่วยงาน</option>';
    subDepartmentSelect.disabled = true;
    return;
  }
  
  // แสดง loading
  subDepartmentSelect.innerHTML = '<option value="">กำลังโหลด...</option>';
  subDepartmentSelect.disabled = true;
  
  try {
    const response = await fetch(`tasks.php?action=get_sub_departments&department=${departmentId}`);
    if (!response.ok) {
      throw new Error('Failed to load sub-departments');
    }
    
    const data = await response.json();
    console.log('Sub-departments API response:', data);
    
    if (data.success && data.data) {
      // เริ่มต้นด้วย default option สำหรับฟิลเตอร์
      let html = '<option value="">ทุกหน่วยงาน</option>';
      
      if (data.data.length > 0) {
        // เพิ่ม options สำหรับหน่วยงานย่อย
        data.data.forEach(subDept => {
          html += `<option value="${subDept.SubDepartmentID}">${subDept.SubDepartmentName}</option>`;
        });
        
        subDepartmentSelect.innerHTML = html;
        subDepartmentSelect.disabled = false;
        console.log(`Loaded ${data.data.length} sub-departments for department ${departmentId}`);
      } else {
        subDepartmentSelect.innerHTML = '<option value="">ไม่มีหน่วยงานย่อย</option>';
        subDepartmentSelect.disabled = true;
        console.log('No sub-departments found for department:', departmentId);
      }
    } else {
      throw new Error(data.error || 'Failed to load sub-departments');
    }
    
  } catch (error) {
    console.error('Error loading sub-departments:', error);
    subDepartmentSelect.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลด</option>';
    subDepartmentSelect.disabled = true;
  }
}

/**
 * แสดงผล Checkbox เครื่องจักรตามหน่วยงานย่อยที่เลือก (อัปเดต)
 * รองรับการเลือกหลายเครื่องจักรพร้อมกัน - โหลดจาก API
 */
async function renderMachineCheckboxes(id, type = 'subDepartment') {
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  if (!machineCheckboxGroup) {
    console.error('machineCheckboxGroup element not found');
    return;
  }
  
  console.log('=== renderMachineCheckboxes() called ===');
  console.log('Parameter id:', id, 'type:', typeof id);
  console.log('Parameter type:', type);
  console.log('ID is valid:', id && id !== "undefined" && id !== "null" && id !== "");
  
  if (!id || id === "undefined" || id === "null" || id === "") {
    const message = type === 'department' 
      ? '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน</div>'
      : '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกหน่วยงานย่อยก่อน</div>';
    machineCheckboxGroup.innerHTML = message;
    console.log('Invalid ID provided, showing selection message');
    return;
  }
  
  machineCheckboxGroup.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm" role="status"></div> กำลังโหลด...</div>';
  
  try {
    // สร้าง URL ตามประเภท
    const url = type === 'department' 
      ? `tasks.php?action=get_machines&department=${encodeURIComponent(id)}`
      : `tasks.php?action=get_machines&subDepartment=${encodeURIComponent(id)}`;
      
    console.log('=== API Call Details ===');
    console.log('Loading machines from:', url);
    console.log('Request type:', type);
    console.log('Request ID:', id);
    console.log('Encoded ID:', encodeURIComponent(id));
    
    const response = await fetch(url);
    console.log('=== API Response ===');
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? `\nResponse: ${errorText}` : ''}`);
    }
    
    const data = await response.json();
    console.log('=== API Response Data ===');
    console.log('Response success:', data.success);
    console.log('Response data length:', data.data ? data.data.length : 'null');
    console.log('Full response:', data);
    
    if (data.success && data.data && data.data.length > 0) {
      // สร้าง HTML สำหรับเครื่องจักร
      let machineHTML = '<div class="row g-2">';
      
      data.data.forEach((machine, index) => {
        // เตรียมข้อมูล DefaultIdealRunRate สำหรับ tooltip เท่านั้น
        const runRate = machine.DefaultIdealRunRate || 0;
        
        // สร้าง tooltip text
        const tooltipText = runRate > 0 
          ? `${machine.MachineName}\nอัตราการผลิตมาตรฐาน: ${runRate} ชิ้น/นาที`
          : `${machine.MachineName}\nยังไม่มีการกำหนดอัตราการผลิตมาตรฐาน`;
        
        machineHTML += `
          <div class="col-6">
            <div class="form-check machine-checkbox">
              <input class="form-check-input" type="checkbox" 
                     value="${machine.MachineID}" 
                     id="machine${machine.MachineID}" 
                     name="machines[]">
              <label class="form-check-label machine-label" 
                     for="machine${machine.MachineID}"
                     data-bs-toggle="tooltip" 
                     data-bs-placement="top" 
                     title="${tooltipText}">
                <div class="machine-name">${machine.MachineName}</div>
              </label>
            </div>
          </div>
        `;
      });
      
      machineHTML += '</div>';
      
      // เพิ่มข้อมูลสรุป
      const activeMachines = data.data.length;
      const machinesWithRunRate = data.data.filter(m => m.DefaultIdealRunRate > 0).length;
      const sourceText = type === 'department' ? 'แผนก' : 'หน่วยงานย่อย';
      
      machineHTML += `
        <div class="mt-3 text-center">
          <small class="text-muted">
            <i class="bi bi-info-circle me-1"></i>
            เครื่องจักรใน${sourceText}นี้: ${activeMachines} เครื่อง | 
            มีอัตราการผลิต: ${machinesWithRunRate} เครื่อง
          </small>
        </div>
      `;
      
      machineCheckboxGroup.innerHTML = machineHTML;
      
      // เปิดใช้งาน Bootstrap Tooltips
      setTimeout(() => {
        const tooltipTriggerList = machineCheckboxGroup.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
          new bootstrap.Tooltip(tooltipTriggerEl);
        });
      }, 100);
      
      console.log(`Successfully loaded ${data.data.length} machines from ${type}: ${id}`);
    } else {
      console.log(`No machines found for ${type}: ${id}`, data);
      
      // ถ้าเป็นการค้นหาจากหน่วยงานย่อยและไม่มีเครื่องจักร ให้ลองโหลดจากแผนกหลัก
      if (type === 'subDepartment') {
        console.log('No machines in sub-department, trying to load from parent department...');
        const departmentSelect = document.getElementById("department");
        if (departmentSelect && departmentSelect.value) {
          return renderMachineCheckboxes(departmentSelect.value, 'department');
        }
      }
      
      const sourceText = type === 'department' ? 'แผนก' : 'หน่วยงานย่อย';
      machineCheckboxGroup.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          <p class="mb-0">ไม่มีเครื่องจักรใน${sourceText}นี้</p>
          <small class="text-muted">${sourceText} ID: ${id}</small>
          ${type === 'subDepartment' ? '<small class="d-block text-info mt-1">กำลังลองโหลดจากแผนกหลัก...</small>' : ''}
        </div>
      `;
    }
  } catch (error) {
    console.error('=== ERROR in renderMachineCheckboxes ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('Request details:', {
      id: id,
      type: type,
      url: type === 'department' 
        ? `tasks.php?action=get_machines&department=${encodeURIComponent(id)}`
        : `tasks.php?action=get_machines&subDepartment=${encodeURIComponent(id)}`
    });
    
    machineCheckboxGroup.innerHTML = `
      <div class="alert alert-danger text-center">
        <i class="bi bi-exclamation-triangle fs-4 d-block mb-2"></i>
        <p class="mb-2"><strong>เกิดข้อผิดพลาดในการโหลดเครื่องจักร</strong></p>
        <small class="text-muted d-block mb-2">กรุณาลองใหม่อีกครั้ง</small>
        <details class="mt-2">
          <summary class="btn btn-outline-secondary btn-sm">รายละเอียด Error</summary>
          <div class="mt-2 text-start">
            <small class="font-monospace">
              Type: ${type}<br>
              ID: ${id}<br>
              Error: ${error.message}
            </small>
          </div>
        </details>
      </div>
    `;
  }
}

// ตั้งค่า Event Handlers สำหรับแผนก และเครื่องจักร (sub-department ปิดไว้ชั่วคราว)
function setupDepartmentMachineEvents() {
  const departmentSelect = document.getElementById("department");
  const subDepartmentCheckboxGroup = document.getElementById("subDepartmentCheckboxGroup");
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const startTimeInput = document.getElementById("startTime");
  
  console.log('Setting up department machine events');
  console.log('Elements found:', {
    departmentSelect: !!departmentSelect,
    subDepartmentCheckboxGroup: !!subDepartmentCheckboxGroup,
    machineCheckboxGroup: !!machineCheckboxGroup,
    startDateInput: !!startDateInput,
    endDateInput: !!endDateInput,
    startTimeInput: !!startTimeInput
  });
  
  // ตรวจสอบว่า sub-department ถูกซ่อนไว้หรือไม่
  const subDeptContainer = subDepartmentCheckboxGroup?.closest('.col-lg-4, .col-6, .col-md-2');
  const isSubDeptHidden = subDeptContainer?.style.display === 'none';
  
  if (departmentSelect && machineCheckboxGroup) {
    // เพิ่ม event listener สำหรับการเปลี่ยนแผนก
    departmentSelect.addEventListener("change", function () {
      console.log('Department changed to:', this.value);
      
      // ล้างหน่วยงานย่อยและเครื่องจักร
      if (subDepartmentCheckboxGroup) {
        subDepartmentCheckboxGroup.innerHTML = '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน</div>';
      }
      machineCheckboxGroup.innerHTML = '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกหน่วยงานย่อยก่อน (หรือไม่เลือกเพื่อดูเครื่องจักรทั้งหมดในแผนก)</div>';
      
      if (isSubDeptHidden) {
        // ถ้า sub-department ถูกซ่อน ให้โหลดเครื่องจักรตรงจากแผนก
        console.log('Sub-department is hidden, loading machines directly from department');
        renderMachineCheckboxes(this.value, 'department').catch(console.error);
      } else {
        // ถ้า sub-department ไม่ได้ซ่อน ให้โหลดหน่วยงานย่อยก่อน และโหลดเครื่องจักรจากแผนกหลัก
        console.log('Sub-department is visible, loading sub-departments and machines from department');
        renderSubDepartmentCheckboxes(this.value, 'subDepartmentCheckboxGroup').catch(console.error);
        // โหลดเครื่องจักรจากแผนกหลักไว้ก่อน (ไม่บังคับต้องเลือกหน่วยงานย่อย)
        renderMachineCheckboxes(this.value, 'department').catch(console.error);
      }
    });
    
    // ถ้า sub-department ไม่ได้ซ่อน ให้เพิ่ม event listener สำหรับ checkbox หน่วยงานย่อย
    if (!isSubDeptHidden && subDepartmentCheckboxGroup) {
      // ใช้ event delegation เพื่อจับ checkbox ที่โหลดมาภายหลัง
      subDepartmentCheckboxGroup.addEventListener("change", function (event) {
        if (event.target.type === 'checkbox' && event.target.name === 'subDepartments[]') {
          console.log('Sub-department checkbox changed:', event.target.value, 'checked:', event.target.checked);
          
          // ดึงรายการหน่วยงานย่อยที่เลือกไว้
          const selectedSubDepartments = Array.from(
            subDepartmentCheckboxGroup.querySelectorAll('input[type="checkbox"]:checked')
          ).map(checkbox => checkbox.value);
          
          console.log('Selected sub-departments:', selectedSubDepartments);
          
          // เลือกหน่วยงานย่อยแล้วแต่ยังคงโหลดเครื่องจักรจากแผนกหลัก
          console.log('Sub-departments selected:', selectedSubDepartments.length);
          
          // โหลดเครื่องจักรจากแผนกหลักเสมอ (ไม่ขึ้นอยู่กับหน่วยงานย่อย)
          const departmentId = departmentSelect.value;
          if (departmentId) {
            console.log('Loading machines from main department:', departmentId);
            renderMachineCheckboxes(departmentId, 'department').catch(console.error);
          } else {
            machineCheckboxGroup.innerHTML = '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน</div>';
          }
        }
      });
    }
    
    console.log('Department change event listeners added. Sub-department hidden:', isSubDeptHidden);
  } else {
    console.warn('Missing required elements for department machine setup');
  }
  
  // ไม่เติมวันที่สิ้นสุดอัตโนมัติ - ให้ผู้ใช้เป็นคนเลือกเอง
  console.log('ไม่เติมวันที่สิ้นสุดอัตโนมัติ - ผู้ใช้ต้องเลือกเอง');
  
  const addJobModal = document.getElementById("addJobModal");
  if (addJobModal && departmentSelect) {
    addJobModal.addEventListener("show.bs.modal", function () {
      console.log('Modal is opening, resetting form step manager...');
      
      // Reset form step manager
      if (formStepManager) {
        formStepManager.reset();
      }
      
      // รีเซ็ต duration display
      const durationDisplay = document.getElementById('durationDisplay');
      if (durationDisplay) {
        durationDisplay.textContent = '-';
        durationDisplay.className = '';
        console.log('Duration display reset to default');
      }
      
      // รีเซ็ตแผนกและหน่วยงานย่อยให้เป็นค่าเริ่มต้น
      if (!window.selectedEditPlan) {
        departmentSelect.value = ""; // ให้เป็น "เลือกแผนก" เป็นค่าเริ่มต้น
        if (subDepartmentSelect) {
          subDepartmentSelect.value = "";
          subDepartmentSelect.disabled = true;
        }
        // ตรวจสอบว่า sub-department ถูกซ่อนไว้หรือไม่
        const subDeptContainer = subDepartmentSelect?.closest('.col-lg-4, .col-6, .col-md-2');
        const isSubDeptHidden = subDeptContainer?.style.display === 'none';
        
        if (isSubDeptHidden) {
          renderMachineCheckboxes("", 'department').catch(console.error);
        } else {
          renderMachineCheckboxes("").catch(console.error);
        }
      } else {
        // ถ้าเป็นการแก้ไข ให้รอการโหลดข้อมูลแผนกจากฟังก์ชัน fillAddJobFormWithPlan
        const subDeptContainer = subDepartmentSelect?.closest('.col-lg-4, .col-6, .col-md-2');
        const isSubDeptHidden = subDeptContainer?.style.display === 'none';
        
        if (isSubDeptHidden && departmentSelect.value) {
          renderMachineCheckboxes(departmentSelect.value, 'department').catch(console.error);
        } else if (subDepartmentSelect && subDepartmentSelect.value) {
          renderMachineCheckboxes(subDepartmentSelect.value || "").catch(console.error);
        }
      }
      
      // เติมวันที่และเวลาปัจจุบันเฉพาะเวลาเริ่มต้นเท่านั้น (เฉพาะเมื่อเพิ่มงานใหม่)
      if (!window.selectedEditPlan) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        
        // เติมเฉพาะวันที่และเวลาเริ่มต้น - ใช้ setDateValue
        setTimeout(() => {
          setDateValue('startDate', currentDate);
          console.log('เติมวันที่เริ่มต้น (hybrid modal):', currentDate);
        }, 100);
        
        // เติมเวลาปัจจุบันใน dropdown เวลาเริ่มต้นเท่านั้น
        setTimeout(() => {
          const startHourSelect = document.getElementById('startHour');
          const startMinuteSelect = document.getElementById('startMinute');
          
          if (startHourSelect && startMinuteSelect) {
            startHourSelect.value = currentHour;
            startMinuteSelect.value = currentMinute;
            console.log(`เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
          }
        }, 150);
        
        // ไม่เติมวันที่และเวลาสิ้นสุด - ให้ผู้ใช้เป็นคนเลือกเอง
        console.log('เติมแค่วันที่และเวลาเริ่มต้น - ผู้ใช้ต้องเลือกเวลาสิ้นสุดเอง');
      } else {
        // เมื่อเป็นการแก้ไขแผนงาน - เติมเวลาเริ่มต้นจากข้อมูลเดิม
        setTimeout(() => {
          const startHourSelect = document.getElementById('startHour');
          const startMinuteSelect = document.getElementById('startMinute');
          
          if (window.tempEditStartHour && window.tempEditStartMinute) {
            if (startHourSelect) {
              startHourSelect.value = window.tempEditStartHour;
              console.log(`เติมเวลาเริ่มต้นจากการแก้ไข: ${window.tempEditStartHour}`);
            }
            if (startMinuteSelect) {
              startMinuteSelect.value = window.tempEditStartMinute;
              console.log(`เติมนาทีเริ่มต้นจากการแก้ไข: ${window.tempEditStartMinute}`);
            }
            
            // เติมเวลาสิ้นสุดเมื่อแก้ไขแผนงาน
            const endHourSelect = document.getElementById('endHour');
            const endMinuteSelect = document.getElementById('endMinute');
            
            if (window.tempEditEndHour && window.tempEditEndMinute) {
              if (endHourSelect) {
                endHourSelect.value = window.tempEditEndHour;
                console.log(`เติมชั่วโมงสิ้นสุดจากการแก้ไข: ${window.tempEditEndHour}`);
              }
              if (endMinuteSelect) {
                endMinuteSelect.value = window.tempEditEndMinute;
                console.log(`เติมนาทีสิ้นสุดจากการแก้ไข: ${window.tempEditEndMinute}`);
              }
              
              // ล้างตัวแปรเวลาสิ้นสุดหลังใช้งาน
              delete window.tempEditEndHour;
              delete window.tempEditEndMinute;
            }
            
            // คำนวณและแสดง duration หลังจากเติมข้อมูลเวลาเสร็จแล้ว
            setTimeout(() => {
              console.log('Triggering duration calculation after filling edit data...');
              
              // เรียกฟังก์ชันคำนวณ duration หากมีข้อมูลครบ - ใช้ hidden fields
              const startDateHidden = document.getElementById('startDateHidden');
              const endDateHidden = document.getElementById('endDateHidden');
              const durationDisplay = document.getElementById('durationDisplay');
              
              if (startDateHidden && endDateHidden && startHourSelect && startMinuteSelect && 
                  endHourSelect && endMinuteSelect && durationDisplay &&
                  startDateHidden.value && endDateHidden.value && 
                  startHourSelect.value && startMinuteSelect.value && 
                  endHourSelect.value && endMinuteSelect.value) {
                
                const startTime = `${startHourSelect.value}:${startMinuteSelect.value}:00`;
                const endTime = `${endHourSelect.value}:${endMinuteSelect.value}:00`;
                
                const startDateTime = new Date(`${startDateHidden.value}T${startTime}`);
                const endDateTime = new Date(`${endDateHidden.value}T${endTime}`);
                
                console.log('Calculating duration for edit mode:', {
                  start: startDateTime,
                  end: endDateTime
                });
                
                if (endDateTime <= startDateTime) {
                  durationDisplay.textContent = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
                  durationDisplay.className = 'text-danger';
                } else {
                  const diffMs = endDateTime - startDateTime;
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  
                  durationDisplay.textContent = `${hours} ชั่วโมง ${minutes} นาที`;
                  durationDisplay.className = 'text-success fw-bold';
                  
                  console.log(`Duration calculated: ${hours} ชั่วโมง ${minutes} นาที`);
                }
              } else {
                console.log('Not all time fields are filled for duration calculation');
              }
            }, 100); // Short delay to ensure all fields are set
            
            // ล้างตัวแปรเวลาเริ่มต้นหลังใช้งาน
            delete window.tempEditStartHour;
            delete window.tempEditStartMinute;
          }
        }, 300);
      }
      
      // Reset ข้อความปุ่มและหัวข้อเมื่อเป็นการเพิ่มงานใหม่
      if (!window.selectedEditPlan) {
        setModalMode(false).catch(error => {
          console.error('Error setting modal mode for new job:', error);
        }); // โหมดเพิ่มใหม่
      }
    });
    
    // รีเซ็ตเมื่อปิด modal
    addJobModal.addEventListener("hidden.bs.modal", function () {
      window.selectedEditPlan = null;
      setModalMode(false).catch(error => {
        console.error('Error resetting modal mode:', error);
      }); // รีเซ็ตเป็นโหมดเพิ่มใหม่
      
      // รีเซ็ต duration display
      const durationDisplay = document.getElementById('durationDisplay');
      if (durationDisplay) {
        durationDisplay.textContent = '-';
        durationDisplay.className = '';
        console.log('Duration display reset when modal closed');
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", setupDepartmentMachineEvents);

// ================================================================
// 13. UTILITY FUNCTIONS AND HELPERS
// ================================================================

/**
 * ฟังก์ชันยูทิลิตี้สำหรับการจัดการฟิลเตอร์ การแสดงข้อความ และการโหลด
 */

// ตั้งค่าให้ currentDateTime badge กดได้เพื่อเปิด date filter
function setupCurrentDateTimeBadge() {
  console.log('Setting up currentDateTime badge...');
  
  const currentDateTimeBadge = document.getElementById('currentDateTimeBadge');
  const dateFilter = document.getElementById('dateFilter');
  const openDateFilterBtn = document.getElementById('openDateFilterBtn');
  
  console.log('Elements found:', {
    currentDateTimeBadge: !!currentDateTimeBadge,
    dateFilter: !!dateFilter,
    openDateFilterBtn: !!openDateFilterBtn
  });
  
  // Function to handle date picker opening
  function openDatePicker() {
    console.log('🗓️ Opening date picker...');
    
    try {
      // Method 1: Direct focus and click
      console.log('Trying direct method...');
      dateFilter.focus();
      
      if (dateFilter.showPicker) {
        console.log('Using showPicker() method');
        dateFilter.showPicker();
      } else {
        console.log('Using click() method');
        dateFilter.click();
      }
      
    } catch (error) {
      console.log('⚠️ Primary method failed, trying alternative...', error);
      
      // Method 2: Create temporary input and trigger
      const tempInput = document.createElement('input');
      tempInput.type = 'date';
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      tempInput.style.opacity = '0';
      tempInput.value = dateFilter.value || '';
      
      document.body.appendChild(tempInput);
      console.log('Temporary input created and added to DOM');
      
      tempInput.addEventListener('change', function() {
        console.log('📅 Date selected via temp input:', tempInput.value);
        dateFilter.value = tempInput.value;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        dateFilter.dispatchEvent(changeEvent);
        
        // Update visual feedback
        const dateFilterIcon = document.getElementById('dateFilterIcon');
        if (dateFilterIcon) {
          if (tempInput.value) {
            dateFilterIcon.className = 'bi bi-funnel-fill ms-1';
            dateFilterIcon.style.color = '#0d6efd';
            dateFilterIcon.style.opacity = '1';
          } else {
            dateFilterIcon.className = 'bi bi-funnel ms-1';
            dateFilterIcon.style.color = '';
            dateFilterIcon.style.opacity = '0.6';
          }
        }
        
        // Show toast notification
        if (tempInput.value) {
          const selectedDate = new Date(tempInput.value);
          const formattedDate = selectedDate.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          showToast(`กรองแสดงแผนงานวันที่ ${formattedDate}`, 'info');
        } else {
          showToast('ยกเลิกการกรองตามวันที่', 'info');
        }
        
        // Clean up
        document.body.removeChild(tempInput);
        console.log('Temporary input cleaned up');
      });
      
      // Try to open date picker
      setTimeout(() => {
        console.log('Attempting to trigger temp input date picker...');
        tempInput.focus();
        if (tempInput.showPicker) {
          tempInput.showPicker();
        } else {
          tempInput.click();
        }
      }, 10);
      
      // Cleanup after timeout
      setTimeout(() => {
        if (document.body.contains(tempInput)) {
          document.body.removeChild(tempInput);
          console.log('Temp input cleaned up after timeout');
        }
      }, 5000);
    }
  }
  
  // Setup currentDateTime badge click
  if (currentDateTimeBadge && dateFilter) {
    currentDateTimeBadge.addEventListener('click', function(e) {
      console.log('🎯 Current DateTime badge clicked!');
      e.preventDefault();
      e.stopPropagation();
      
      openDatePicker();
    });
    
    // Add subtle hover effects
    currentDateTimeBadge.addEventListener('mouseenter', function() {
      this.style.backgroundColor = '#e3f2fd';
    });
    
    currentDateTimeBadge.addEventListener('mouseleave', function() {
      this.style.backgroundColor = '#f8f9fa';
    });
    
    console.log('✅ Current DateTime badge click handler setup complete');
  } else {
    console.warn('❌ Current DateTime badge or date filter not found');
  }
  
  // Setup date filter button click
  if (openDateFilterBtn && dateFilter) {
    openDateFilterBtn.addEventListener('click', function(e) {
      console.log('📅 Date filter button clicked!');
      e.preventDefault();
      e.stopPropagation();
      openDatePicker();
    });
    
    console.log('✅ Date filter button click handler setup complete');
  } else {
    console.warn('❌ Date filter button not found');
  }
  
  // Test if elements are actually clickable
  setTimeout(() => {
    console.log('🔍 Testing element accessibility:');
    console.log('currentDateTimeBadge style:', currentDateTimeBadge ? window.getComputedStyle(currentDateTimeBadge).cursor : 'not found');
    console.log('dateFilter type:', dateFilter ? dateFilter.type : 'not found');
    console.log('openDateFilterBtn:', openDateFilterBtn ? 'found' : 'not found');
  }, 1000);
}

// ล้างฟิลเตอร์ทั้งหมดและอัปเดตปฏิทิน
function clearFilters() {
  console.log('clearFilters() called');
  
  const departmentFilter = document.getElementById("departmentFilter");
  const subDepartmentFilter = document.getElementById("subDepartmentFilter");
  const statusFilter = document.getElementById("statusFilter");
  const keywordFilter = document.getElementById("keywordFilter");
  const dateFilter = document.getElementById("dateFilter");
  
  console.log('Filter elements found:', {
    departmentFilter: !!departmentFilter,
    subDepartmentFilter: !!subDepartmentFilter,
    statusFilter: !!statusFilter, 
    keywordFilter: !!keywordFilter,
    dateFilter: !!dateFilter
  });
  
  if (departmentFilter) {
    console.log('Clearing department filter:', departmentFilter.value);
    departmentFilter.value = "";
  }
  if (subDepartmentFilter) {
    console.log('Clearing sub-department filter:', subDepartmentFilter.value);
    subDepartmentFilter.value = "";
    subDepartmentFilter.disabled = true;
    subDepartmentFilter.innerHTML = '<option value="">ทุกหน่วยงาน</option>';
  }
  if (statusFilter) {
    console.log('Clearing status filter:', statusFilter.value);
    statusFilter.value = "";
  }
  if (keywordFilter) {
    console.log('Clearing keyword filter:', keywordFilter.value);
    keywordFilter.value = "";
  }
  if (dateFilter) {
    console.log('Clearing date filter:', dateFilter.value);
    dateFilter.value = "";
  }
  
  // Update calendar with cleared filters
  console.log('Calling updateCalendarEvents() from clearFilters()');
  updateCalendarEvents();
  
  if (formStepManager) {
    formStepManager.updateStatusCounts();
  }
  
  showToast("ล้างฟิลเตอร์เรียบร้อย", "success");
}

// ล้างฟิลเตอร์เมื่อโหลดหน้าครั้งแรก
function clearAllFiltersOnLoad() {
  // ล้างฟิลเตอร์เมื่อโหลดหน้าเพื่อแสดงงานทั้งหมด
  const departmentFilter = document.getElementById("departmentFilter");
  const subDepartmentFilter = document.getElementById("subDepartmentFilter");
  const statusFilter = document.getElementById("statusFilter");
  const keywordFilter = document.getElementById("keywordFilter");
  const dateFilter = document.getElementById("dateFilter");
  
  if (departmentFilter) departmentFilter.value = "";
  if (subDepartmentFilter) {
    subDepartmentFilter.value = "";
    subDepartmentFilter.disabled = true;
    subDepartmentFilter.innerHTML = '<option value="">ทุกหน่วยงาน</option>';
  }
  if (statusFilter) statusFilter.value = "";
  if (keywordFilter) keywordFilter.value = "";
  if (dateFilter) dateFilter.value = "";
  
  // Don't update calendar here as it's not initialized yet
}

// แสดงข้อความแจ้งเตือนแบบ Toast
function showToast(msg, type = "success") {
  const toast = document.getElementById("mainToast");
  const toastBody = document.getElementById("mainToastBody");
  toast.className = `toast align-items-center text-bg-${type} border-0`;
  toastBody.textContent = msg;
  const bsToast = new bootstrap.Toast(toast, { delay: 2500 });
  bsToast.show();
}

// แสดง/ซ่อน Loading Overlay
function showLoading(show = true) {
  const loadingOverlay = document.getElementById("loadingOverlay");
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? "flex" : "none";
  } else {
    console.warn('Loading overlay element not found');
  }
}

// ตั้งค่า Bootstrap Tooltips
function setupTooltips() {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (el) {
    new bootstrap.Tooltip(el);
  });
}
document.addEventListener("DOMContentLoaded", setupTooltips);

// ================================================================
// 14. PRODUCT MANAGEMENT FUNCTIONS
// ================================================================

// Global variables for products
let products = []; // เก็บข้อมูลผลิตภัณฑ์จากฐานข้อมูล
let productSizes = {}; // เก็บข้อมูลขนาดตาม ProductID

/**
 * โหลดข้อมูลผลิตภัณฑ์จากฐานข้อมูล
 */
async function loadProducts() {
    const productDropdown = document.getElementById('product');
    
    if (!productDropdown) {
        console.error('Product dropdown not found');
        return;
    }
    
    try {
        // แสดง loading
        productDropdown.innerHTML = '<option value="">กำลังโหลด...</option>';
        
        // เรียก API
        const response = await fetch('tasks.php?action=get_products');
        const result = await response.json();
        
        console.log('Products API Response:', result);
        
        if (result.success && result.data) {
            products = result.data;
            
            // สร้าง options
            productDropdown.innerHTML = '<option value="">เลือกผลิตภัณฑ์</option>';
            
            result.data.forEach(product => {
                console.log('Adding product option:', product);
                const option = document.createElement('option');
                option.value = product.ProductName; // ใช้ ProductName เป็น value ตามที่ฟอร์มต้องการ
                option.textContent = product.ProductName; // แสดงแค่ ProductName
                option.dataset.productCode = product.ProductCode;
                option.dataset.productName = product.ProductName;
                option.dataset.productId = product.ProductID;
                productDropdown.appendChild(option);
            });
            
            console.log(`โหลดผลิตภัณฑ์สำเร็จ: ${result.data.length} รายการ`);
            
            // Setup event listener for product change
            setupProductChangeListener();
            
        } else {
            throw new Error(result.message || 'Failed to load products');
        }
        
    } catch (error) {
        console.error('Error loading products:', error);
        productDropdown.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';
        
        // แสดงข้อความแจ้งเตือน
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลผลิตภัณฑ์', 'error');
    }
}

/**
 * โหลดขนาดผลิตภัณฑ์ทั้งหมด (ไม่แยกตาม Product ID)
 */
async function loadProductSizes() {
    const sizeDropdown = document.getElementById('size');
    
    if (!sizeDropdown) {
        console.error('Size dropdown not found');
        return;
    }
    
    try {
        // แสดง loading
        sizeDropdown.innerHTML = '<option value="">กำลังโหลด...</option>';
        sizeDropdown.disabled = true;
        
        // เรียก API
        const response = await fetch(`tasks.php?action=get_product_sizes`);
        const result = await response.json();
        
        console.log('Product Sizes API Response:', result);
        
        if (result.success && result.data) {
            // สร้าง options
            sizeDropdown.innerHTML = '<option value="">เลือกขนาด</option>';
            
            result.data.forEach(size => {
                console.log('Adding size option:', size);
                const option = document.createElement('option');
                option.value = size.SizeDisplay; // ใช้ SizeDisplay เป็น value ตามที่ฟอร์มต้องการ
                option.textContent = size.SizeDisplay; // ใช้ SizeDisplay แทน
                option.dataset.sizeId = size.SizeID;
                option.dataset.sizeValue = size.SizeValue;
                option.dataset.sizeUnit = size.SizeUnit;
                option.dataset.sizeDisplay = size.SizeDisplay;
                sizeDropdown.appendChild(option);
            });
            
            sizeDropdown.disabled = false;
            console.log(`โหลดขนาดสำเร็จ: ${result.data.length} รายการ`);
        } else {
            // ถ้าไม่มีขนาด
            sizeDropdown.innerHTML = '<option value="">ไม่มีข้อมูลขนาด</option>';
            sizeDropdown.disabled = true;
        }
        
    } catch (error) {
        console.error('Error loading product sizes:', error);
        sizeDropdown.innerHTML = '<option value="">เกิดข้อผิดพลาดในการโหลดข้อมูล</option>';
        sizeDropdown.disabled = true;
        
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลขนาดผลิตภัณฑ์', 'error');
    }
}

/**
 * ตั้งค่า Event Listener สำหรับการเปลี่ยนผลิตภัณฑ์
 */
function setupProductChangeListener() {
    const productDropdown = document.getElementById('product');
    
    if (!productDropdown) return;
    
    productDropdown.addEventListener('change', function() {
        const productId = this.value;
        const sizeDropdown = document.getElementById('size');
        
        if (sizeDropdown) {
            if (productId) {
                // โหลดขนาดทั้งหมด (เนื่องจากขนาดไม่ได้แยกตาม Product)
                // แต่เปิดให้เลือกได้
                sizeDropdown.disabled = false;
            } else {
                // ล้างขนาดเมื่อไม่ได้เลือกผลิตภัณฑ์
                sizeDropdown.innerHTML = '<option value="">เลือกขนาด</option>';
                sizeDropdown.disabled = true;
            }
        }
    });
}

/**
 * แสดงการแจ้งเตือน (Toast notification)
 */
function showNotification(message, type = 'info') {
    // สร้าง toast element
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    // แสดง toast
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    
    // ลบ element หลังจากซ่อน
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * สร้าง Toast Container ถ้ายังไม่มี
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1055';
    document.body.appendChild(container);
    return container;
}

// ================================================================
// 15. GLOBAL EXPORTS AND API EXPOSURE
// ================================================================

/**
 * โหลดรายการแผนกจากฐานข้อมูล
 */
async function loadDepartments() {
    try {
        console.log('Loading departments from database...');
        
        const response = await fetch('tasks.php?action=get_departments');
        const result = await response.json();
        
        if (result.success && result.data) {
            // อัพเดต dropdown ในฟอร์มเพิ่มงาน
            const departmentSelect = document.getElementById('department');
            if (departmentSelect) {
                // เคลียร์ options เก่า (เก็บเฉพาะ default option)
                departmentSelect.innerHTML = '<option value="">เลือกแผนก</option>';
                
                // เพิ่ม options ใหม่จากฐานข้อมูล
                result.data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.DepartmentID;
                    option.textContent = dept.DepartmentName;
                    departmentSelect.appendChild(option);
                });
                
                console.log(`Loaded ${result.data.length} departments for form`);
            }
            
            // อัพเดต filter dropdown
            const departmentFilter = document.getElementById('departmentFilter');
            if (departmentFilter) {
                // เก็บ option แรก "ทุกแผนก"
                const allOption = departmentFilter.querySelector('option[value=""]');
                departmentFilter.innerHTML = '';
                if (allOption) {
                    departmentFilter.appendChild(allOption);
                }
                
                // เพิ่ม options ใหม่
                result.data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.DepartmentID;
                    option.textContent = dept.DepartmentName;
                    departmentFilter.appendChild(option);
                });
                
                console.log(`Loaded ${result.data.length} departments for filter`);
            }
            
            return result.data;
        } else {
            console.error('Failed to load departments:', result.message);
            showToast('ไม่สามารถโหลดข้อมูลแผนกได้', 'warning');
            return [];
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนก', 'danger');
        return [];
    }
}

/**
 * เปิดเผยฟังก์ชันหลักให้ Global scope เพื่อให้ HTML และไฟล์อื่นเรียกใช้ได้
 */

// ================================================================
// 16. LOT NUMBER GENERATION
// ================================================================

/**
 * สร้าง Lot Number อัตโนมัติ
 * รูปแบบ: LOT-YYYYMMDD-XXX (XXX = เลขลำดับ 3 หลัก)
 */
function generateLotNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // สร้างเลขลำดับแบบสุ่ม 3 หลัก (001-999)
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    
    const lotNumber = `LOT-${year}${month}${day}-${sequence}`;
    
    console.log('Generated Lot Number:', lotNumber);
    return lotNumber;
}

/**
 * ตั้งค่า Event Listener สำหรับปุ่มเจนเนอเรต Lot Number
 */
function setupLotNumberGenerator() {
    const generateBtn = document.getElementById('generateLotBtn');
    const lotNumberInput = document.getElementById('lotNumber');
    
    if (!generateBtn || !lotNumberInput) {
        console.warn('Lot number generator elements not found');
        return;
    }
    
    generateBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
        if (lotNumberInput.value && lotNumberInput.value.trim() !== '') {
            if (!confirm('มี Lot Number อยู่แล้ว คุณต้องการสร้างใหม่หรือไม่?')) {
                return;
            }
        }
        
        // สร้าง Lot Number ใหม่
        const newLotNumber = generateLotNumber();
        lotNumberInput.value = newLotNumber;
        
        // เพิ่มแอนิเมชันเล็กน้อย
        lotNumberInput.classList.add('animate__animated', 'animate__pulse');
        setTimeout(() => {
            lotNumberInput.classList.remove('animate__animated', 'animate__pulse');
        }, 1000);
        
        // แสดงข้อความยืนยัน
        showToast(`สร้าง Lot Number สำเร็จ: ${newLotNumber}`, 'success');
        
        console.log('Lot Number generated and set:', newLotNumber);
    });
    
    console.log('Lot number generator setup complete');
}

// เรียกใช้เมื่อ DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", setupLotNumberGenerator);

// เรียกใช้ Start Work Order Modal Handler
document.addEventListener("DOMContentLoaded", initializeStartWorkOrderModal);

// ================================================================
// ROBUST DOM UTILITIES (สำหรับ Server Environment Compatibility)
// ================================================================

/**
 * Safe modal operation utility - รอให้ element พร้อมก่อนทำงาน
 */
function safeModalOperation(modalId, operation = 'show', maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryOperation = () => {
      const modalElement = document.getElementById(modalId);
      
      if (!modalElement) {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error(`Modal element ${modalId} not found after ${maxAttempts} attempts`));
          return;
        }
        setTimeout(tryOperation, 100);
        return;
      }
      
      try {
        if (operation === 'show') {
          new bootstrap.Modal(modalElement).show();
        } else if (operation === 'hide') {
          const modalInstance = bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
        resolve(modalElement);
      } catch (error) {
        reject(error);
      }
    };
    
    tryOperation();
  });
}

/**
 * Safe element operation - ตรวจสอบและรอ element ก่อนใช้งาน
 */
function safeElementOperation(elementId, callback, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attemptOperation = () => {
      const element = document.getElementById(elementId);
      
      if (!element) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn(`Element ${elementId} not found after ${maxAttempts} attempts`);
          reject(new Error(`Element ${elementId} not found`));
          return;
        }
        setTimeout(attemptOperation, 100);
        return;
      }
      
      try {
        const result = callback(element);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    // ลองทำงานทันที หรือรอจนกว่า element จะพร้อม
    attemptOperation();
  });
}

// ================================================================
// DEPARTMENT TIME CONFLICT VALIDATION
// ================================================================

/**
 * ตรวจสอบการชนเวลาในแผนกเดียวกัน
 * @param {number} departmentId - ID ของแผนก
 * @param {Date} startDateTime - เวลาเริ่มต้นใหม่
 * @param {Date} endDateTime - เวลาสิ้นสุดใหม่
 * @param {number|null} excludePlanId - PlanID ที่จะไม่เช็ค (สำหรับการแก้ไข)
 * @returns {Promise<{hasConflict: boolean, conflictingPlan?: Object}>}
 */
async function checkDepartmentTimeConflict(departmentId, startDateTime, endDateTime, excludePlanId = null) {
  console.log('🔍 Checking department time conflict...', {
    departmentId,
    startDateTime: startDateTime.toISOString(),
    endDateTime: endDateTime.toISOString(),
    excludePlanId
  });

  try {
    // ดึงแผนงานทั้งหมดในแผนกเดียวกัน
    const departmentPlans = plans.filter(plan => {
      const planDeptId = parseInt(plan.DepartmentID);
      const planId = parseInt(plan.PlanID);
      
      // กรองเฉพาะแผนกเดียวกัน และไม่ใช่แผนที่กำลังแก้ไข
      const isSameDepartment = planDeptId === departmentId;
      const isNotExcluded = excludePlanId ? planId !== excludePlanId : true;
      const isActiveStatus = ['planning', 'in-progress'].includes(plan.Status);
      
      return isSameDepartment && isNotExcluded && isActiveStatus;
    });

    console.log(`📋 Found ${departmentPlans.length} plans in department ${departmentId}:`, 
      departmentPlans.map(p => ({
        id: p.PlanID,
        product: p.ProductName,
        lot: p.LotNumber,
        start: p.PlannedStartTime,
        end: p.PlannedEndTime,
        status: p.Status
      }))
    );

    // ตรวจสอบการชนเวลากับแต่ละแผนงาน
    for (const plan of departmentPlans) {
      const planStart = new Date(plan.PlannedStartTime);
      const planEnd = new Date(plan.PlannedEndTime);
      
      // ตรวจสอบการทับซ้อนของเวลา
      const hasOverlap = (
        (startDateTime >= planStart && startDateTime < planEnd) ||  // เริ่มต้นใหม่อยู่ในช่วงของแผนเก่า
        (endDateTime > planStart && endDateTime <= planEnd) ||     // สิ้นสุดใหม่อยู่ในช่วงของแผนเก่า
        (startDateTime <= planStart && endDateTime >= planEnd)     // แผนใหม่ครอบคลุมแผนเก่า
      );
      
      if (hasOverlap) {
        console.warn('⚠️ Time conflict detected with plan:', {
          conflictingPlan: plan.PlanID,
          conflictingProduct: plan.ProductName,
          conflictingLot: plan.LotNumber,
          conflictingTimeRange: `${Utils.formatDateTime(planStart)} - ${Utils.formatDateTime(planEnd)}`,
          newTimeRange: `${Utils.formatDateTime(startDateTime)} - ${Utils.formatDateTime(endDateTime)}`
        });
        
        return {
          hasConflict: true,
          conflictingPlan: plan,
          conflictType: 'time_overlap',
          message: `แผนกนี้มีงานอื่นในช่วงเวลาที่ซ้อนกัน: ${plan.ProductName} (${plan.LotNumber})`
        };
      }
    }

    console.log('✅ No time conflicts found for department', departmentId);
    return { hasConflict: false };

  } catch (error) {
    console.error('❌ Error checking department time conflict:', error);
    // ในกรณีเกิด error ให้อนุญาตการทำงานต่อไป (fail-safe)
    return { hasConflict: false, error: error.message };
    return { hasConflict: false, error: error.message };
  }
}

// เปิดเผยฟังก์ชันสำหรับใช้ใน HTML (onclick events)
window.clearFilters = clearFilters;
window.showToast = showToast;
window.showLoading = showLoading;
window.loadProducts = loadProducts;
window.loadProductSizes = loadProductSizes;
window.loadDepartments = loadDepartments;
window.generateLotNumber = generateLotNumber;
window.safeModalOperation = safeModalOperation;
window.safeElementOperation = safeElementOperation;

// ================================================================
// END OF FILE - OEE Production Management System
// ================================================================
