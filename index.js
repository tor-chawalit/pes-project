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
      });
    } else {
      this.setupEventListeners();
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
      // Validate time settings
      const startDate = document.getElementById('startDate');
      const endDate = document.getElementById('endDate');
      
      // ตรวจสอบวันที่
      const dateFields = [startDate, endDate];
      dateFields.forEach(field => {
        if (field && !field.value) {
          field.classList.add('is-invalid');
          isValid = false;
        } else if (field) {
          field.classList.remove('is-invalid');
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
      
      // ตรวจสอบว่าเวลาสิ้นสุดมากกว่าเวลาเริ่มต้น
      if (startDate && startDate.value && endDate && endDate.value &&
          startHour && startHour.value && startMinute && startMinute.value &&
          endHour && endHour.value && endMinute && endMinute.value) {
        
        const startTime = `${startHour.value}:${startMinute.value}:00`;
        const endTime = `${endHour.value}:${endMinute.value}:00`;
        
        const startDateTime = new Date(`${startDate.value}T${startTime}`);
        const endDateTime = new Date(`${endDate.value}T${endTime}`);
        
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
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const startHour = document.getElementById('startHour');
    const startMinute = document.getElementById('startMinute');
    const endHour = document.getElementById('endHour');
    const endMinute = document.getElementById('endMinute');
    const durationDisplay = document.getElementById('durationDisplay');

    const calculateDuration = () => {
      if (startDate.value && endDate.value && 
          startHour.value && startMinute.value && 
          endHour.value && endMinute.value) {
        
        const startTime = `${startHour.value}:${startMinute.value}:00`;
        const endTime = `${endHour.value}:${endMinute.value}:00`;
        
        const startDateTime = new Date(`${startDate.value}T${startTime}`);
        const endDateTime = new Date(`${endDate.value}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
          if (durationDisplay) {
            durationDisplay.textContent = 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
            durationDisplay.className = 'text-danger';
          }
          return;
        }
        
        const diffMs = endDateTime - startDateTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (durationDisplay) {
          durationDisplay.textContent = `${hours} ชั่วโมง ${minutes} นาที`;
          durationDisplay.className = '';
        }
      } else {
        if (durationDisplay) {
          durationDisplay.textContent = '-';
          durationDisplay.className = '';
        }
      }
    };

    [startDate, endDate, startHour, startMinute, endHour, endMinute].forEach(element => {
      if (element) {
        element.addEventListener('change', calculateDuration);
      }
    });
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
      console.log(`Plan ${plan.PlanID}: Status = ${plan.PlanStatus}`);
      
      if (counts.hasOwnProperty(plan.PlanStatus)) {
        counts[plan.PlanStatus]++;
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
      filteredPlans = filteredPlans.filter(plan => plan.PlanStatus === statusFilter);
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
    
    console.log('Plan statuses in filtered list:', filteredPlans.map(p => ({ id: p.PlanID, status: p.PlanStatus })));
    
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
    
    console.log('Final filtered plans:', filteredPlans.map(p => ({ id: p.PlanID, status: p.PlanStatus })));
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
        
        // Update calendar events after loading
        if (calendar) {
          updateCalendarEvents();
        }
        
        return true;
      } else {
        throw new Error('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (e) {
      console.error("PlanManager.loadFromDB error:", e);
      showToast("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง", "danger");
    }
    return false;
  }
  
  // เพิ่มแผนงานใหม่ลงฐานข้อมูล
  static async addPlan(planData) {
    // เพิ่มแผนงานใหม่ลง database ทันที
    try {
      const response = await fetch("tasks.php?action=add_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถเพิ่มแผนงานได้');
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error('ไม่สามารถเพิ่มแผนงานได้');
      }
      
      await PlanManager.loadFromDB();
      return result;
    } catch (error) {
      console.error('PlanManager.addPlan error:', error);
      throw new Error('ไม่สามารถเพิ่มแผนงานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  // อัปเดตข้อมูลแผนงานในฐานข้อมูล
  static async updatePlan(plan) {
    // ส่งทุก field รวม status
    try {
      // ตรวจสอบ PlanID
      if (!plan.PlanID || plan.PlanID <= 0) {
        throw new Error('Invalid PlanID');
      }
      
      const res = await fetch("tasks.php?action=update_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      
      if (!res.ok) {
        throw new Error('ไม่สามารถอัปเดตแผนงานได้');
      }
      
      const result = await res.json();
      if (!result.success) {
        throw new Error('ไม่สามารถอัปเดตแผนงานได้');
      }
      
      // Reload data and update calendar
      await PlanManager.loadFromDB();
      
      return result;
    } catch (e) {
      console.error("PlanManager.updatePlan error:", e);
      throw new Error('ไม่สามารถอัปเดตแผนงานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }
  
  // ลบแผนงานจากฐานข้อมูล
  static async deletePlan(planId) {
    try {
      const res = await fetch("tasks.php?action=delete_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ PlanID: planId }),
      });
      
      if (!res.ok) {
        throw new Error('ไม่สามารถลบแผนงานได้');
      }
      
      const result = await res.json();
      if (!result.success) {
        throw new Error('ไม่สามารถลบแผนงานได้');
      }
      
      await PlanManager.loadFromDB();
      return result;
    } catch (e) {
      console.error("PlanManager.deletePlan error:", e);
      throw new Error('ไม่สามารถลบแผนงานได้ กรุณาลองใหม่อีกครั้ง');
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
    slotEventOverlap: false,
    eventOverlap: true, // อนุญาตให้ events แสดงข้างกัน
    eventDisplay: 'block',
    selectOverlap: false,
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
      const startDateInput = document.getElementById('startDate');
      if (startDateInput) {
        startDateInput.value = info.dateStr;
      }
      
      // เติมเวลาปัจจุบันใน dropdown เวลาเริ่มต้นเท่านั้น
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      
      // รอให้ modal เปิดก่อน แล้วค่อยเติมเวลา
      setTimeout(() => {
        const startHourSelect = document.getElementById('startHour');
        const startMinuteSelect = document.getElementById('startMinute');
        
        if (startHourSelect && startMinuteSelect) {
          startHourSelect.value = currentHour;
          startMinuteSelect.value = currentMinute;
          console.log(`เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
        }
      }, 100);
      
      // ไม่เติมวันที่และเวลาสิ้นสุด - ให้ผู้ใช้เป็นคนเลือกเอง
      console.log('เติมแค่วันที่และเวลาเริ่มต้น - ผู้ใช้ต้องเลือกเวลาสิ้นสุดเอง');
      
      // Show the add job modal
      const modal = new bootstrap.Modal(document.getElementById('addJobModal'));
      modal.show();
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

// อัปเดต events ในปฏิทิน (เรียกใช้เมื่อมีการเปลี่ยนแปลงข้อมูล)
function updateCalendarEvents() {
  console.log('updateCalendarEvents() called');
  
  if (!calendar) {
    console.warn('Calendar not initialized');
    return;
  }
  
  // Remove all existing events
  calendar.removeAllEvents();
  
  // Get filtered plans
  const filteredPlans = PlanManager.getFilteredPlans();
  
  console.log('Updating calendar with plans:', filteredPlans.length);
  console.log('Plan statuses:', filteredPlans.map(p => ({ id: p.PlanID, status: p.PlanStatus })));
  
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
          status: plan.PlanStatus,
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
    document.getElementById("taskDetailTitle").textContent = `แผนงาน: ${plan.ProductDisplayName || plan.LotNumber || `Plan ID: ${plan.PlanID}`}`;
    
    let statusText = "-";
    let statusColor = "secondary";
    if (plan.PlanStatus === "planning") {
      statusText = "กำลังวางแผน";
      statusColor = "primary";
    } else if (plan.PlanStatus === "in-progress") {
      statusText = "กำลังดำเนินงาน";
      statusColor = "warning";
    } else if (plan.PlanStatus === "completed") {
      statusText = "เสร็จสิ้น";
      statusColor = "success";
    } else if (plan.PlanStatus === "cancelled") {
      statusText = "ยกเลิก";
      statusColor = "danger";
    }
    
    let detailHTML = `
      <div class="row g-4">
        <!-- Plan Information Section -->
        <div class="col-md-6">
          <div class="task-detail-section">
            <h6><i class="bi bi-info-circle-fill me-2"></i>ข้อมูลแผนงาน</h6>
            <div class="detail-item">
              <span class="detail-label">สถานะ:</span>
              <span class="detail-value">
                <span class="badge bg-${statusColor} fs-6">${statusText}</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ผลิตภัณฑ์:</span>
              <span class="detail-value fw-bold">${plan.ProductDisplayName || plan.ProductName || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ขนาด:</span>
              <span class="detail-value">${plan.ProductSize || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Lot Number:</span>
              <span class="detail-value"><code>${plan.LotNumber || "-"}</code></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">แผนก:</span>
              <span class="detail-value">${plan.DepartmentName || "-"}</span>  
            </div>
            <div class="detail-item">
              <span class="detail-label">เครื่องจักร:</span>
              <span class="detail-value">${plan.MachineName || "-"}</span>
            </div>
          </div>
        </div>
        
        <!-- Production Information Section -->
        <div class="col-md-6">
          <div class="task-detail-section">
            <h6><i class="bi bi-graph-up me-2"></i>ข้อมูลการผลิต</h6>
            <div class="detail-item">
              <span class="detail-label">Lot Size:</span>
              <span class="detail-value">
                <span class="badge bg-info text-dark">${plan.LotSize || "0"} ชิ้น</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">เป้าหมายผลิต:</span>
              <span class="detail-value">
                <span class="badge bg-success">${plan.TargetOutput || "0"} ชิ้น</span>
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">จำนวนคน:</span>
              <span class="detail-value">
                <span class="badge bg-warning text-dark">${plan.WorkerCount || "0"} คน</span>
              </span>
            </div>
            ${plan.PlannedStartTime ? `
            <div class="detail-item">
              <span class="detail-label">เวลาเริ่มตามแผน:</span>
              <span class="detail-value">
                <i class="bi bi-play-circle me-1"></i>
                ${new Date(plan.PlannedStartTime).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: '2-digit', 
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>` : ''}
            ${plan.PlannedEndTime ? `
            <div class="detail-item">
              <span class="detail-label">เวลาสิ้นสุดตามแผน:</span>
              <span class="detail-value">
                <i class="bi bi-stop-circle me-1"></i>
                ${new Date(plan.PlannedEndTime).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit', 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>` : ''}
            ${plan.PlannedDurationHours ? `
            <div class="detail-item">
              <span class="detail-label">ระยะเวลาตามแผน:</span>
              <span class="detail-value">
                <i class="bi bi-stopwatch me-1"></i>
                ${plan.PlannedDurationHours} ชั่วโมง
              </span>
            </div>` : ''}
          </div>
        </div>
        
        <!-- System Information Section -->
        <div class="col-12">
          <div class="task-detail-section">
            <h6><i class="bi bi-gear-fill me-2"></i>ข้อมูลระบบ</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">วันที่สร้าง:</span>
                  <span class="detail-value">
                    ${plan.CreatedAt ? new Date(plan.CreatedAt).toLocaleString('th-TH') : "-"}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">สร้างโดย:</span>
                  <span class="detail-value">User ID ${plan.CreatedByUserID || "-"}</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">แก้ไขล่าสุด:</span>
                  <span class="detail-value">
                    ${plan.UpdatedAt ? new Date(plan.UpdatedAt).toLocaleString('th-TH') : "-"}
                  </span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="detail-item">
                  <span class="detail-label">แก้ไขโดย:</span>
                  <span class="detail-value">User ID ${plan.UpdatedByUserID || "-"}</span>
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
            <div class="task-detail-section">
              <h6><i class="bi bi-journal-text me-2"></i>รายละเอียดเพิ่มเติม</h6>
              <div class="bg-white p-3 rounded border">
                <p class="mb-0">${plan.Details}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    detailHTML += `
      <div class="row mt-4">
        <div class="col-12">
          <div class="d-flex justify-content-end gap-2">
            <button id="editPlanBtn" class="btn btn-primary btn-lg">
              <i class="bi bi-pencil-square me-2"></i>แก้ไขงาน
            </button>
            <button id="deletePlanBtn" class="btn btn-danger btn-lg">
              <i class="bi bi-trash me-2"></i>ลบงาน
            </button>
    `;

    if (plan.PlanStatus === "planning") {
      detailHTML += `
        <button id="startPlanBtn" class="btn btn-warning btn-lg">
          <i class="bi bi-play-circle-fill me-2"></i>เริ่มดำเนินงาน
        </button>
        <button id="cancelPlanBtn" class="btn btn-danger btn-lg">
          <i class="bi bi-x-circle-fill me-2"></i>ยกเลิกงาน
        </button>
      `;
    } else if (plan.PlanStatus === "completed") {
      detailHTML += `
        <button id="viewOEEBtn" class="btn btn-success btn-lg">
          <i class="bi bi-check-circle-fill me-2"></i>ยืนยันงาน
        </button>
      `;
    } else if (plan.PlanStatus === "in-progress") {
      detailHTML += `
        <button id="completePlanBtn" class="btn btn-success btn-lg">
          <i class="bi bi-check-circle me-2"></i>เสร็จสิ้นแผนงาน
        </button>
        <button id="viewOEEBtn" class="btn btn-info btn-lg">
          <i class="bi bi-clipboard-check me-2"></i>กรอกข้อมูลผลผลิต
        </button>
        <button id="cancelPlanBtn" class="btn btn-danger btn-lg">
          <i class="bi bi-x-circle-fill me-2"></i>ยกเลิกงาน
        </button>
      `;
    }

    detailHTML += `
          </div>
        </div>
      </div>
    `;
    document.getElementById("taskDetailBody").innerHTML = detailHTML;
    setTimeout(() => {
      const editBtn = document.getElementById("editPlanBtn");
      if (editBtn) {
        editBtn.disabled = false;
        editBtn.onclick = function (e) {
          e.preventDefault();
          fillAddJobFormWithPlan(plan);
          bootstrap.Modal.getInstance(
            document.getElementById("taskDetailModal")
          ).hide();
          new bootstrap.Modal(document.getElementById("addJobModal")).show();
        };
      }
      const deleteBtn = document.getElementById("deletePlanBtn");
      if (deleteBtn) {
        deleteBtn.disabled = false;
        deleteBtn.onclick = async function (e) {
          e.preventDefault();
          if (confirm("คุณต้องการงานนี้ใช่หรือไม่?")) {
            try {
              await PlanManager.deletePlan(plan.PlanID);
              showToast("ลบแผนงานสำเร็จ", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
            } catch (error) {
              console.error('Delete plan error:', error);
              showToast("เกิดข้อผิดพลาดในการลบแผนงาน", "danger");
            }
          }
        };
      }
      const confirmBtn = document.getElementById("confirmPlanBtn");
      if (confirmBtn) {
        confirmBtn.onclick = async function (e) {
          e.preventDefault();
          await confirmPlanToServer(plan);
          bootstrap.Modal.getInstance(
            document.getElementById("taskDetailModal")
          ).hide();
        };
      }
      const finalConfirmBtn = document.getElementById("finalConfirmBtn");
      if (finalConfirmBtn) {
        finalConfirmBtn.onclick = function (e) {
          e.preventDefault();
          window.location.href = `confirm-complete.html?id=${encodeURIComponent(plan.PlanID)}`;
        };
      }
      const completePlanBtn = document.getElementById("completePlanBtn");
      if (completePlanBtn) {
        completePlanBtn.onclick = async function (e) {
          e.preventDefault();
          if (confirm("คุณต้องการจบแผนงานนี้ใช่หรือไม่?")) {
            try {
              const updatedPlan = { ...plan, PlanStatus: "completed" };
              await PlanManager.updatePlan(updatedPlan);
              showToast("จบแผนงานสำเร็จ - รอการยืนยันครั้งสุดท้าย", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
              // Update status counts after changing status
              if (formStepManager) {
                formStepManager.updateStatusCounts();
              }
            } catch (error) {
              console.error('Complete plan error:', error);
              showToast("เกิดข้อผิดพลาดในการจบแผนงาน: " + error.message, "danger");
            }
          }
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
      
      // Handler for startPlanBtn (Start Work button)
      const startPlanBtn = document.getElementById("startPlanBtn");
      if (startPlanBtn) {
        startPlanBtn.onclick = async function (e) {
          e.preventDefault();
          if (confirm("คุณต้องการเริ่มดำเนินงานแผนงานนี้ใช่หรือไม่?")) {
            try {
              const updatedPlan = { ...plan, PlanStatus: "in-progress" };
              await PlanManager.updatePlan(updatedPlan);
              showToast("เริ่มดำเนินงานสำเร็จ", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
              // Update status counts after changing status
              if (formStepManager) {
                formStepManager.updateStatusCounts();
              }
            } catch (error) {
              console.error('Start plan error:', error);
              showToast("เกิดข้อผิดพลาดในการเริ่มดำเนินงาน: " + error.message, "danger");
            }
          }
        };
      }
      
      // Handler for cancelPlanBtn (Cancel Work button)
      const cancelPlanBtn = document.getElementById("cancelPlanBtn");
      if (cancelPlanBtn) {
        cancelPlanBtn.onclick = async function (e) {
          e.preventDefault();
          if (confirm("คุณต้องการยกเลิกแผนงานนี้ใช่หรือไม่?\nการยกเลิกแผนงานจะไม่สามารถกู้คืนได้")) {
            try {
              const updatedPlan = { ...plan, PlanStatus: "cancelled" };
              await PlanManager.updatePlan(updatedPlan);
              showToast("ยกเลิกแผนงานสำเร็จ", "success");
              bootstrap.Modal.getInstance(
                document.getElementById("taskDetailModal")
              ).hide();
              // Update status counts after changing status
              if (formStepManager) {
                formStepManager.updateStatusCounts();
              }
            } catch (error) {
              console.error('Cancel plan error:', error);
              showToast("เกิดข้อผิดพลาดในการยกเลิกแผนงาน: " + error.message, "danger");
            }
          }
        };
      }
    }, 0);
    new bootstrap.Modal(document.getElementById("taskDetailModal")).show();
  };
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

// ฟังก์ชันจัดการโหมด modal
function setModalMode(isEditMode, planData = null) {
  const modalTitle = document.getElementById('modalTitle');
  const submitBtnText = document.getElementById('submitBtnText');
  const cancelBtnText = document.getElementById('cancelBtnText');
  
  if (isEditMode) {
    modalTitle.textContent = 'แก้ไขแผนงาน';
    submitBtnText.textContent = 'บันทึกการแก้ไข';
    cancelBtnText.textContent = 'ยกเลิกการแก้ไข';
  } else {
    modalTitle.textContent = 'เพิ่มงานใหม่';
    submitBtnText.textContent = 'เพิ่มแผนงาน';
    cancelBtnText.textContent = 'ยกเลิก';
  }
}

function fillAddJobFormWithPlan(plan) {
  const form = document.getElementById("addJobForm");
  if (!form || !plan) {
    console.error('fillAddJobFormWithPlan: Missing form or plan', { form: !!form, plan: !!plan });
    return;
  }
  
  console.log('fillAddJobFormWithPlan called with plan:', plan);
  
  // ตั้งสถานะว่าเป็นการแก้ไข
  window.selectedEditPlan = plan;
  
  // ตั้งค่าโหมดแก้ไข
  setModalMode(true, plan);
  
  // Helper to safely set value if field exists
  function setField(name, value) {
    const field = form[name] || form.querySelector(`[name="${name}"]`) || document.getElementById(name);
    if (field) {
      field.value = value;
      console.log(`Set field ${name} to:`, value);
    } else {
      console.warn(`Field ${name} not found`);
    }
  }
  
  // เซ็ตค่าฟิลด์ตามโครงสร้างฐานข้อมูล ProductionPlans
  if (plan.DepartmentID) {
    // เซ็ตแผนกและ trigger change event เพื่อโหลดเครื่องจักร
    const departmentSelect = form.querySelector('[name="departmentID"]') || document.getElementById("department");
    console.log('Department select element found:', !!departmentSelect);
    
    if (departmentSelect) {
      console.log('Setting department to:', plan.DepartmentID.toString());
      departmentSelect.value = plan.DepartmentID.toString();
      
      // Trigger change event เพื่อโหลดเครื่องจักร
      console.log('Triggering change event for department');
      departmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.error('Department select element not found');
    }
  }
  
  // เซ็ตผลิตภัณฑ์และขนาด
  if (plan.ProductName) {
    setField("productName", plan.ProductName);
  }
  if (plan.ProductSize) {
    setField("productSize", plan.ProductSize);
  }
  
  setField("lotNumber", plan.LotNumber || "");
  setField("lotSize", plan.LotSize || "");
  setField("targetOutput", plan.TargetOutput || "");
  setField("workerCount", plan.WorkerCount || "");
  setField("details", plan.Details || "");
  setField("planStatus", plan.PlanStatus || "planning");
  
  // เซ็ตวันที่และเวลาเริ่มต้นและสิ้นสุดเมื่อแก้ไขแผนงาน
  if (plan.PlannedStartTime) {
    const start = new Date(plan.PlannedStartTime);
    // ใช้ local date โดยตรง
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const hours = String(start.getHours()).padStart(2, '0');
    const minutes = String(start.getMinutes()).padStart(2, '0');
    
    setField("startDate", `${year}-${month}-${day}`);
    
    // Store start time values to set later
    window.tempEditStartHour = hours;
    window.tempEditStartMinute = minutes;
    console.log(`Stored start time for later: ${hours}:${minutes}`);
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
    
    setField("endDate", `${endYear}-${endMonth}-${endDay}`);
    
    // Store end time values to set later
    window.tempEditEndHour = endHours;
    window.tempEditEndMinute = endMinutes;
    console.log(`Stored end time for later: ${endHours}:${endMinutes}`);
  }
  
  // เลือกเครื่องจักรที่ถูกต้อง (checkbox multiple selection)
  // เพิ่ม timeout ให้มากขึ้นเพื่อรอการโหลดเครื่องจักรเสร็จสิ้น
  setTimeout(() => {
    console.log('Setting machine checkboxes...');
    const machineGroup = document.getElementById("machineCheckboxGroup");
    console.log('Machine checkbox group:', machineGroup);
    
    if (!machineGroup) {
      console.error('Machine checkbox group not found');
      return;
    }
    
    if (plan.MachineIDs) {
      // ถ้ามี MachineIDs (รายการเครื่องจักรหลายเครื่อง)
      const machineIds = plan.MachineIDs.split(',').map(id => parseInt(id.trim()));
      console.log('Setting machine checkboxes for IDs:', machineIds);
      
      machineIds.forEach(machineId => {
        const machineCheckbox = document.getElementById(`machine${machineId}`);
        console.log(`Looking for machine${machineId}:`, machineCheckbox);
        
        if (machineCheckbox) {
          machineCheckbox.checked = true;
          console.log(`✓ Checked machine ${machineId}`);
        } else {
          console.warn(`✗ Machine checkbox for ID ${machineId} not found`);
          // ลองหาด้วยวิธีอื่น
          const altCheckbox = machineGroup.querySelector(`input[value="${machineId}"]`);
          if (altCheckbox) {
            altCheckbox.checked = true;
            console.log(`✓ Checked machine ${machineId} via alternative method`);
          } else {
            console.warn(`✗ Machine ${machineId} not found via any method`);
          }
        }
      });
    } else if (plan.MachineID) {
      // ถ้ามีแค่ MachineID เดียว (backward compatibility)
      const machineCheckbox = document.getElementById(`machine${plan.MachineID}`);
      console.log(`Looking for single machine${plan.MachineID}:`, machineCheckbox);
      
      if (machineCheckbox) {
        machineCheckbox.checked = true;
        console.log(`✓ Checked single machine ${plan.MachineID}`);
      } else {
        console.warn(`✗ Single machine checkbox for ID ${plan.MachineID} not found`);
        // ลองหาด้วยวิธีอื่น
        const altCheckbox = machineGroup.querySelector(`input[value="${plan.MachineID}"]`);
        if (altCheckbox) {
          altCheckbox.checked = true;
          console.log(`✓ Checked single machine ${plan.MachineID} via alternative method`);
        } else {
          console.warn(`✗ Single machine ${plan.MachineID} not found via any method`);
        }
      }
    } else {
      console.warn('No MachineIDs or MachineID found in plan');
    }
    
    // Log ผลลัพธ์สุดท้าย
    const checkedMachines = machineGroup.querySelectorAll('input[type="checkbox"]:checked');
    console.log(`Final result: ${checkedMachines.length} machines checked`);
    
  }, 1000); // เพิ่มเวลารอเป็น 1 วินาที
  
  window.selectedEditPlan = plan;
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
      
      // ตรวจสอบวันที่และเวลา
      const startDate = formData.get("startDate");
      const endDate = formData.get("endDate");
      
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
      
      // ตรวจสอบเครื่องจักรที่เลือก (checkbox - อนุญาตให้เลือกได้หลายเครื่อง)
      const selectedMachines = document.querySelectorAll('#machineCheckboxGroup input[type="checkbox"]:checked');
      if (selectedMachines.length === 0) {
        showToast("กรุณาเลือกเครื่องจักรอย่างน้อย 1 เครื่อง", "danger");
        return;
      }
      
      // รวบรวม MachineID ที่เลือก (เก็บเป็น array หรือ string รวมกัน)
      const machineIds = Array.from(selectedMachines).map(machine => parseInt(machine.value, 10));
      const machineIdString = machineIds.join(','); // เก็บเป็น "1,2,3" ในฐานข้อมูล
      
      // ดึงข้อมูลผลิตภัณฑ์และขนาด (ProductDisplayName จะถูกสร้างอัตโนมัติโดยฐานข้อมูล)
      const productName = formData.get("productName") || "";
      const productSize = formData.get("productSize") || "";
      
      console.log('Form Data Debug:');
      console.log('productName from form:', productName);
      console.log('productSize from form:', productSize);
      console.log('formData.get("productName"):', formData.get("productName"));
      console.log('formData.get("productSize"):', formData.get("productSize"));
      console.log('departmentID:', formData.get("departmentID"));
      console.log('machineIds:', machineIds);
      
      const planData = {
        LotNumber: formData.get("lotNumber"),
        LotSize: LotSize,
        TargetOutput: parseInt(formData.get("targetOutput") || "0", 10),
        WorkerCount: WorkerCount,
        ProductName: productName,
        ProductSize: productSize,
        DepartmentID: parseInt(formData.get("departmentID"), 10),
        MachineID: machineIds[0], // เก็บเครื่องแรกเป็น primary machine
        MachineIDs: machineIdString, // เก็บรายการเครื่องทั้งหมด
        PlanStatus: formData.get("planStatus") || "planning",
        PlannedStartTime: formatDateForDB(startDateTime),
        PlannedEndTime: formatDateForDB(endDateTime),
        Details: formData.get("details") || "",
        CreatedByUserID: 1,
        UpdatedByUserID: 1
      };
      
      console.log('planData to be sent:', planData);
      
      if (window.selectedEditPlan && window.selectedEditPlan.PlanID) {
        try {
          planData.PlanID = window.selectedEditPlan.PlanID;
          console.log("Updating plan with data:", planData);
          const result = await PlanManager.updatePlan(planData);
          console.log("Update result:", result);
          showToast("แก้ไขแผนงานสำเร็จ", "success");
        } catch (error) {
          console.error('Update plan error:', error);
          showToast("เกิดข้อผิดพลาดในการแก้ไขแผนงาน: " + error.message, "danger");
          return;
        }
      } else {
        try {
          console.log("Adding new plan with data:", planData);
          const result = await PlanManager.addPlan(planData);
          console.log("Add result:", result);
          showToast(`เพิ่มแผนงานสำเร็จ - ใช้เครื่องจักร ${selectedMachines.length} เครื่อง`, "success");
        } catch (error) {
          console.error('Add plan error:', error);
          showToast("เกิดข้อผิดพลาดในการเพิ่มแผนงาน: " + error.message, "danger");
          return;
        }
      }
      
      // ปิด modal และ reset form
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addJobModal")
      );
      if (modal) modal.hide();
      
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
      }, 300);
    });
    addJobForm._handlerAdded = true;
  }
}
document.addEventListener("DOMContentLoaded", setupAddJobFormHandler);

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
 * แสดงผล Checkbox เครื่องจักรตามแผนกที่เลือก
 * รองรับการเลือกหลายเครื่องจักรพร้อมกัน - โหลดจาก API
 */
/**
 * แสดงผล Checkbox เครื่องจักรตามแผนกที่เลือก
 * รองรับการเลือกหลายเครื่องจักรพร้อมกัน - โหลดจาก API
 */
async function renderMachineCheckboxes(departmentId) {
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  if (!machineCheckboxGroup) {
    console.error('machineCheckboxGroup element not found');
    return;
  }
  
  if (!departmentId) {
    machineCheckboxGroup.innerHTML = '<div class="text-muted text-center py-3"><i class="bi bi-arrow-left me-2"></i>กรุณาเลือกแผนกก่อน</div>';
    return;
  }
  
  machineCheckboxGroup.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm" role="status"></div> กำลังโหลด...</div>';
  
  try {
    const response = await fetch(`api/machines.php?department=${departmentId}`);
    if (!response.ok) {
      throw new Error('Failed to load machines');
    }
    
    const data = await response.json();
    console.log('Machines API response:', data);
    
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
      
      machineHTML += `
        <div class="mt-3 text-center">
          <small class="text-muted">
            <i class="bi bi-info-circle me-1"></i>
            เครื่องจักรทั้งหมด: ${activeMachines} เครื่อง | 
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
      
      console.log(`Successfully loaded ${data.data.length} machines with run rates`);
    } else {
      console.log('No machines found or API error:', data);
      machineCheckboxGroup.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          <p class="mb-0">ไม่มีเครื่องจักรในแผนกนี้</p>
          <small class="text-muted">แผนก ID: ${departmentId}</small>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading machines:', error);
    machineCheckboxGroup.innerHTML = `
      <div class="text-center py-4 text-danger">
        <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
        <p class="mb-0">เกิดข้อผิดพลาดในการโหลดเครื่องจักร</p>
        <small class="text-muted">กรุณาลองใหม่อีกครั้ง</small>
      </div>
    `;
  }
}

// ตั้งค่า Event Handlers สำหรับแผนกและเครื่องจักร
function setupDepartmentMachineEvents() {
  const departmentSelect = document.getElementById("department");
  const machineCheckboxGroup = document.getElementById("machineCheckboxGroup");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const startTimeInput = document.getElementById("startTime");
  
  console.log('Setting up department machine events');
  console.log('Elements found:', {
    departmentSelect: !!departmentSelect,
    machineCheckboxGroup: !!machineCheckboxGroup,
    startDateInput: !!startDateInput,
    endDateInput: !!endDateInput,
    startTimeInput: !!startTimeInput
  });
  
  if (departmentSelect && machineCheckboxGroup) {
    // โหลดเครื่องจักรสำหรับแผนกที่เลือกอยู่ (ถ้ามี)
    if (departmentSelect.value) {
      console.log('Initial department value:', departmentSelect.value);
      renderMachineCheckboxes(departmentSelect.value).catch(console.error);
    }
    
    // เพิ่ม event listener สำหรับการเปลี่ยนแผนก
    departmentSelect.addEventListener("change", function () {
      console.log('Department changed to:', this.value);
      renderMachineCheckboxes(this.value).catch(console.error);
    });
    
    console.log('Department change event listener added');
  } else {
    console.warn('Missing required elements for department machine setup');
  }
  
  // ตั้งวันที่เริ่มต้นเป็นวันนี้เท่านั้น ให้ผู้ใช้เป็นคนเลือกวันที่สิ้นสุดเอง
  if (startDateInput) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    startDateInput.value = `${year}-${month}-${day}`;
    console.log('เติมวันที่เริ่มต้น:', startDateInput.value);
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
      
      // รีเซ็ตแผนกให้เป็น "เลือกแผนก" เป็นค่าเริ่มต้น
      if (!window.selectedEditPlan) {
        departmentSelect.value = ""; // ให้เป็น "เลือกแผนก" เป็นค่าเริ่มต้น
        renderMachineCheckboxes("").catch(console.error); // ส่งค่าว่างเพื่อแสดงข้อความ "กรุณาเลือกแผนกก่อน"
      } else {
        // ถ้าเป็นการแก้ไข ให้รอการโหลดข้อมูลแผนกจากฟังก์ชัน fillAddJobFormWithPlan
        renderMachineCheckboxes(departmentSelect.value || "").catch(console.error);
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
        
        // เติมเฉพาะวันที่และเวลาเริ่มต้น
        if (startDateInput) {
          startDateInput.value = currentDate;
        }
        
        // เติมเวลาปัจจุบันใน dropdown เวลาเริ่มต้นเท่านั้น
        setTimeout(() => {
          const startHourSelect = document.getElementById('startHour');
          const startMinuteSelect = document.getElementById('startMinute');
          
          if (startHourSelect && startMinuteSelect) {
            startHourSelect.value = currentHour;
            startMinuteSelect.value = currentMinute;
            console.log(`เติมเวลาเริ่มต้น: ${currentHour}:${currentMinute}`);
          }
        }, 100);
        
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
              
              // เรียกฟังก์ชันคำนวณ duration หากมีข้อมูลครบ
              const startDate = document.getElementById('startDate');
              const endDate = document.getElementById('endDate');
              const durationDisplay = document.getElementById('durationDisplay');
              
              if (startDate && endDate && startHourSelect && startMinuteSelect && 
                  endHourSelect && endMinuteSelect && durationDisplay &&
                  startDate.value && endDate.value && 
                  startHourSelect.value && startMinuteSelect.value && 
                  endHourSelect.value && endMinuteSelect.value) {
                
                const startTime = `${startHourSelect.value}:${startMinuteSelect.value}:00`;
                const endTime = `${endHourSelect.value}:${endMinuteSelect.value}:00`;
                
                const startDateTime = new Date(`${startDate.value}T${startTime}`);
                const endDateTime = new Date(`${endDate.value}T${endTime}`);
                
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
        setModalMode(false); // โหมดเพิ่มใหม่
      }
    });
    
    // รีเซ็ตเมื่อปิด modal
    addJobModal.addEventListener("hidden.bs.modal", function () {
      window.selectedEditPlan = null;
      setModalMode(false); // รีเซ็ตเป็นโหมดเพิ่มใหม่
      
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
  const statusFilter = document.getElementById("statusFilter");
  const keywordFilter = document.getElementById("keywordFilter");
  const dateFilter = document.getElementById("dateFilter");
  
  console.log('Filter elements found:', {
    departmentFilter: !!departmentFilter,
    statusFilter: !!statusFilter, 
    keywordFilter: !!keywordFilter,
    dateFilter: !!dateFilter
  });
  
  if (departmentFilter) {
    console.log('Clearing department filter:', departmentFilter.value);
    departmentFilter.value = "";
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
  const statusFilter = document.getElementById("statusFilter");
  const keywordFilter = document.getElementById("keywordFilter");
  const dateFilter = document.getElementById("dateFilter");
  
  if (departmentFilter) departmentFilter.value = "";
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
  document.getElementById("loadingOverlay").style.display = show ? "flex" : "none";
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
        const response = await fetch('api/products.php');
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
        const response = await fetch(`api/product-sizes.php`);
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
        
        const response = await fetch('api/departments.php');
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
                    option.value = dept.departmentId;
                    option.textContent = dept.departmentName;
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
                    option.value = dept.departmentId;
                    option.textContent = dept.departmentName;
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

// เปิดเผยฟังก์ชันสำหรับใช้ใน HTML (onclick events)
window.clearFilters = clearFilters;
window.showToast = showToast;
window.showLoading = showLoading;
window.loadProducts = loadProducts;
window.loadProductSizes = loadProductSizes;
window.loadDepartments = loadDepartments;
window.generateLotNumber = generateLotNumber;

// ================================================================
// END OF FILE - OEE Production Management System
// ================================================================
