// ================================================================
// HISTORY PAGE - Simple Production History (No Session Check)
// ================================================================
// JavaScript for displaying completed production plans without authentication
// Version: 2.0.0
// ================================================================

// ================================================================
// 1. GLOBAL VARIABLES
// ================================================================
let historyData = [];
let filteredData = [];

// ================================================================
// 2. INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('History page loading...');
    
    // ตั้งค่า active page สำหรับ navbar (ถ้ามี)
    setTimeout(() => {
        const historyLink = document.querySelector('a[href="history.html"], a[data-page="history"]');
        if (historyLink) {
            historyLink.classList.add('active');
        }
    }, 500);
    
    // ตั้งค่า Event Listeners
    setupEventListeners();
    
    // โหลดข้อมูลเริ่มต้น
    loadInitialData();
    
    console.log('History page initialized successfully');
});

// ================================================================
// 3. DATA LOADING
// ================================================================

/**
 * โหลดข้อมูลเริ่มต้น
 */
async function loadInitialData() {
    try {
        // โหลดข้อมูล (ข้อมูล filter จะอัปเดตใน loadHistoryData)
        await loadHistoryData();
        
        // แสดงข้อมูลเมื่อโหลดเสร็จ
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

/**
 * โหลดข้อมูลประวัติงาน
 */
async function loadHistoryData() {
    try {
        showLoading(true);
        
        // เรียก API เพื่อดึงข้อมูลประวัติงานที่เสร็จสิ้นแล้ว
        const response = await fetch('tasks.php?action=get_completed_plans');
        
        if (!response.ok) {
            throw new Error('Failed to fetch history data');
        }
        
        const data = await response.json();
        console.log('Raw history data:', data);
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        console.log('Data length:', data.length);
        
        if (Array.isArray(data)) {
            // ข้อมูลจาก API ถูกกรองแล้ว ไม่ต้องกรองซ้ำ
            historyData = data;
            console.log(`Loaded ${historyData.length} completed plans`);
            console.log('Sample data:', historyData[0]);
            
            // อัปเดต filter options จากข้อมูลจริง
            updateDepartmentFilter();
            updateMachineFilter();
        } else {
            console.error('Data is not an array:', data);
            historyData = [];
        }
        
    } catch (error) {
        console.error('Error loading history data:', error);
        historyData = [];
    } finally {
        showLoading(false);
    }
}

// ================================================================
// 4. FILTERING AND SEARCHING
// ================================================================

/**
 * ใช้ฟิลเตอร์และแสดงผลข้อมูล
 */
function applyFiltersAndRender() {
    console.log('applyFiltersAndRender called');
    console.log('historyData length:', historyData.length);
    
    const departmentFilter = document.getElementById('departmentFilter').value;
    const machineFilter = document.getElementById('machineFilter').value;
    const dateFromFilter = document.getElementById('dateFromFilter').value;
    const dateToFilter = document.getElementById('dateToFilter').value;
    const keyword = document.getElementById('historyKeywordFilter').value.trim().toLowerCase();
    
    console.log('Filters:', { departmentFilter, machineFilter, dateFromFilter, dateToFilter, keyword });
    
    filteredData = [...historyData];
    console.log('Initial filteredData length:', filteredData.length);
    
    // ฟิลเตอร์ตามแผนก (รองรับ Department จาก ProductionResults) - ใช้ exact match
    if (departmentFilter) {
        filteredData = filteredData.filter(item => {
            const deptName = (item.Department || item.DepartmentName || item.departmentName || '').trim();
            return deptName === departmentFilter;
        });
        console.log(`Filtered by department '${departmentFilter}': ${filteredData.length} items`);
    }
    
    // ฟิลเตอร์ตามเครื่องจักร - ใช้ exact match
    if (machineFilter) {
        filteredData = filteredData.filter(item => {
            const machineName = (item.MachineName || item.MachineID || item.machine || '').trim();
            return machineName === machineFilter;
        });
        console.log(`Filtered by machine '${machineFilter}': ${filteredData.length} items`);
    }
    
    // ฟิลเตอร์ตามช่วงวันที่ (ใช้ ProductionDate หรือ ConfirmedAt)
    if (dateFromFilter) {
        filteredData = filteredData.filter(item => {
            const completedDate = item.ProductionDate || item.ConfirmedAt || item.ActualEndTime;
            if (!completedDate) return false;
            const itemDate = new Date(completedDate).toISOString().split('T')[0];
            return itemDate >= dateFromFilter;
        });
    }
    
    if (dateToFilter) {
        filteredData = filteredData.filter(item => {
            const completedDate = item.ProductionDate || item.ConfirmedAt || item.ActualEndTime;
            if (!completedDate) return false;
            const itemDate = new Date(completedDate).toISOString().split('T')[0];
            return itemDate <= dateToFilter;
        });
    }
    
    // ฟิลเตอร์ตามคำค้นหา (รองรับ field ใหม่จาก ProductionResults)
    if (keyword) {
        filteredData = filteredData.filter(item => {
            const searchFields = [
                item.ProductName || item.ProductDisplayName || '',
                item.ProductCode || '',
                item.LotNumber || '',
                item.Department || item.DepartmentName || '',
                item.MachineName || ''
            ].join(' ').toLowerCase();
            
            return searchFields.includes(keyword);
        });
        console.log('After keyword filter:', filteredData.length);
    }
    
    console.log('Final filteredData length:', filteredData.length);
    renderHistoryTable();
    updateStatistics();
}

// ================================================================
// 6. UI RENDERING
// ================================================================

/**
 * แสดงตารางประวัติงาน
 */
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    
    if (!filteredData.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                    <div>ไม่พบข้อมูลประวัติงานที่ตรงเงื่อนไข</div>
                    <small>ลองปรับเปลี่ยนตัวกรองหรือคำค้นหา</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredData.map((item, index) => createHistoryRow(item, index)).join('');
}

/**
 * สร้างแถวสำหรับตารางประวัติ (UI ที่เข้าใจง่าย)
 */
function createHistoryRow(item, index) {
    const rowClass = index % 2 === 0 ? 'table-light' : '';
    
    // ข้อมูลหลัก
    const productName = item.ProductName || 'ไม่ระบุ';
    const productCode = item.ProductCode || '-';
    const productSize = item.ProductSize || '-';
    const department = item.Department || item.DepartmentName || 'ไม่ระบุ';
    const machineName = item.MachineName || 'ไม่ระบุ';
    const productionDate = item.ProductionDate || '';
    
    // ข้อมูลการผลิต
    const lotNumber = item.LotNumber || '-';
    const lotSize = parseInt(item.LotSize) || 0;
    const totalPieces = parseInt(item.TotalPieces) || 0;
    const goodQuantity = parseInt(item.GoodQuantity) || 0;
    const rejectPieces = parseInt(item.RejectPieces) || 0;
    
    // เวลาการผลิต
    const actualStartTime = item.ActualStartTime || '';
    const actualEndTime = item.ActualEndTime || '';
    const workingHours = parseFloat(item.WorkingHours) || 0;
    
    // ใช้ข้อมูลที่คำนวณแล้วจาก ProductionResults (ไม่คำนวณใหม่)
    const oeeAvailability = parseFloat(item.OEE_Availability) || 0;
    const oeePerformance = parseFloat(item.OEE_Performance) || 0;
    const oeeQuality = parseFloat(item.OEE_Quality) || 0;
    const oeeOverall = parseFloat(item.OEE_Overall) || 0;
    
    // สีของประสิทธิภาพ (ใช้ OEE ที่คำนวณแล้ว)
    const performanceColor = oeePerformance >= 90 ? 'text-success' : oeePerformance >= 70 ? 'text-warning' : 'text-danger';
    const qualityColor = oeeQuality >= 95 ? 'text-success' : oeeQuality >= 85 ? 'text-warning' : 'text-danger';
    
    return `
        <tr class="${rowClass} history-row">
            <td class="text-center">
                <div class="fw-bold">${productionDate ? formatDateSimple(productionDate) : '-'}</div>
            </td>
            <td>
                <div class="fw-bold text-primary mb-1">${productName}</div>
                <small class="text-muted">รหัส: ${productCode}</small>
                ${productSize !== '-' ? `<br><small class="text-muted">ขนาด: ${productSize}</small>` : ''}
            </td>
            <td class="text-center">
                <span class="badge bg-primary">${department}</span>
            </td>
            <td class="text-center">
                <div class="fw-bold">${machineName}</div>
            </td>
            <td class="text-center">
                <code class="bg-light p-1 rounded">${lotNumber}</code>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-primary">${formatNumber(lotSize)}</div>
                <small class="text-muted">ชิ้น</small>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-info">${formatNumber(totalPieces)}</div>
                <small class="text-muted">ชิ้น</small>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-success">${formatNumber(goodQuantity)}</div>
                <small class="text-muted">ชิ้น</small>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-danger">${formatNumber(rejectPieces)}</div>
                <small class="text-muted">ชิ้น</small>
            </td>
            <td class="text-center data-cell" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);">
                <div class="row g-1 text-center">
                    <div class="col-4">
                        <div class="fw-bold text-info fs-6">${oeeAvailability.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.7rem;">ความพร้อม</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold ${performanceColor} fs-6">${oeePerformance.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.7rem;">ประสิทธิภาพ</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold ${qualityColor} fs-6">${oeeQuality.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.7rem;">คุณภาพ</small>
                    </div>
                </div>
                <hr class="my-1 opacity-50">
                <div class="fw-bold text-primary fs-5">${oeeOverall.toFixed(1)}%</div>
                <small class="text-muted fw-bold" style="font-size: 0.7rem;">OEE รวม</small>
            </td>
            <td class="text-center data-cell">
                <div class="fw-bold text-dark">${calculateDurationSimple(actualStartTime, actualEndTime)}</div>
                <small class="text-muted">${workingHours.toFixed(1)} ชั่วโมง</small>
            </td>
        </tr>
    `;
}

/**
 * อัปเดตสถิติด้านบน (สถิติครบถ้วนจาก ProductionResults)
 */
function updateStatistics() {
    const totalCompleted = filteredData.length;
    
    // คำนวณผลผลิตรวม (ใช้ TotalPieces จาก ProductionResults)
    const totalProduced = filteredData.reduce((sum, item) => {
        const actualOutput = parseInt(item.TotalPieces) || 0;
        return sum + actualOutput;
    }, 0);
    
    // คำนวณผลิตภัณฑ์ดีรวม
    const totalGoodProduct = filteredData.reduce((sum, item) => {
        const goodProduct = parseInt(item.GoodQuantity) || 0;
        return sum + goodProduct;
    }, 0);
    
    // คำนวณของเสียรวม
    const totalReject = filteredData.reduce((sum, item) => {
        const rejectPieces = parseInt(item.RejectPieces) || 0;
        return sum + rejectPieces;
    }, 0);
    
    // คำนวณชั่วโมงทำงานรวม
    const totalWorkingHours = filteredData.reduce((sum, item) => {
        const workingHours = parseFloat(item.WorkingHours) || 0;
        return sum + workingHours;
    }, 0);
    
    // คำนวณ Downtime รวม
    const totalDowntime = filteredData.reduce((sum, item) => {
        const downtimeMinutes = parseInt(item.DowntimeMinutes) || 0;
        return sum + downtimeMinutes;
    }, 0);
    
    // คำนวณประสิทธิภาพเฉลี่ย (ใช้ OEE_Performance ที่คำนวณแล้ว)
    let totalPerformance = 0;
    let validPerformanceCount = 0;
    
    filteredData.forEach(item => {
        const performance = parseFloat(item.OEE_Performance) || 0;
        if (performance > 0) {
            totalPerformance += performance;
            validPerformanceCount++;
        }
    });
    
    const avgPerformance = validPerformanceCount > 0 ? totalPerformance / validPerformanceCount : 0;
    
    // คำนวณ OEE เฉลี่ย
    let totalOEE = 0;
    let validOEECount = 0;
    
    filteredData.forEach(item => {
        const oee = parseFloat(item.OEE_Overall) || 0;
        if (oee > 0) {
            totalOEE += oee;
            validOEECount++;
        }
    });
    
    const avgOEE = validOEECount > 0 ? totalOEE / validOEECount : 0;
    
    // คำนวณคุณภาพเฉลี่ย (ใช้ OEE_Quality ที่คำนวณแล้ว)
    let totalQualityOEE = 0;
    let validQualityCount = 0;
    
    filteredData.forEach(item => {
        const quality = parseFloat(item.OEE_Quality) || 0;
        if (quality > 0) {
            totalQualityOEE += quality;
            validQualityCount++;
        }
    });
    
    const avgQuality = validQualityCount > 0 ? totalQualityOEE / validQualityCount : 0;
    
    // อัปเดต cards หลัก
    document.getElementById('totalCompleted').textContent = formatNumber(totalCompleted);
    document.getElementById('totalProduced').textContent = formatNumber(totalProduced);
    document.getElementById('avgEfficiency').textContent = `${avgPerformance.toFixed(1)}%`;
    document.getElementById('avgQuality').textContent = `${avgQuality.toFixed(1)}%`;
    
    // อัปเดต cards เพิ่มเติม
    if (document.getElementById('totalReject')) {
        document.getElementById('totalReject').textContent = formatNumber(totalReject);
    }
    if (document.getElementById('avgOEE')) {
        document.getElementById('avgOEE').textContent = `${avgOEE.toFixed(1)}%`;
    }
    if (document.getElementById('totalWorkingHours')) {
        document.getElementById('totalWorkingHours').textContent = `${totalWorkingHours.toFixed(1)}`;
    }
    if (document.getElementById('totalDowntime')) {
        document.getElementById('totalDowntime').textContent = formatNumber(totalDowntime);
    }
    
    // อัปเดตข้อความสรุป (ใช้ภาษาที่เข้าใจง่าย)
    const summaryElement = document.getElementById('historySummary');
    if (summaryElement) {
        summaryElement.innerHTML = `
            งานที่ทำเสร็จ <strong>${formatNumber(totalCompleted)}</strong> งาน | 
            ผลิตได้ <strong>${formatNumber(totalProduced)}</strong> ชิ้น | 
            ของดี <strong>${formatNumber(totalGoodProduct)}</strong> ชิ้น | 
            ของเสีย <strong>${formatNumber(totalReject)}</strong> ชิ้น | 
            ประสิทธิภาพเฉลี่ย <strong>${avgPerformance.toFixed(1)}%</strong> | 
            คุณภาพเฉลี่ย <strong>${avgQuality.toFixed(1)}%</strong> | 
            คะแนน OEE เฉลี่ย <strong>${avgOEE.toFixed(1)}%</strong> | 
            ชั่วโมงทำงาน <strong>${totalWorkingHours.toFixed(1)}</strong> ชม. | 
            เวลาหยุด <strong>${formatNumber(totalDowntime)}</strong> นาที
        `;
    }
}

// ================================================================
// 7. UI HELPERS
// ================================================================

/**
 * อัปเดต dropdown แผนก (ดึงจากข้อมูลจริงใน ProductionResults)
 */
function updateDepartmentFilter() {
    const select = document.getElementById('departmentFilter');
    if (!select) return;
    
    // รวบรวมแผนกทั้งหมดจากข้อมูลจริง
    const departmentSet = new Set();
    
    historyData.forEach(item => {
        const deptName = item.Department || item.DepartmentName || item.departmentName || '';
        if (deptName.trim()) {
            departmentSet.add(deptName.trim());
        }
    });
    
    // สร้าง options
    select.innerHTML = '<option value="">ทุกแผนก</option>';
    
    // เรียงตามตัวอักษร
    const sortedDepartments = Array.from(departmentSet).sort();
    
    sortedDepartments.forEach(deptName => {
        select.innerHTML += `<option value="${deptName}">${deptName}</option>`;
    });
    
    console.log('Department filter updated with departments:', sortedDepartments);
}

/**
 * อัปเดต dropdown เครื่องจักร (ดึงจากข้อมูลจริงใน ProductionResults)
 */
function updateMachineFilter() {
    const select = document.getElementById('machineFilter');
    if (!select) return;
    
    // รวบรวมเครื่องจักรทั้งหมดจากข้อมูลจริง
    const machineSet = new Set();
    
    historyData.forEach(item => {
        const machineName = item.MachineName || item.MachineID || item.machine || '';
        if (machineName.trim()) {
            machineSet.add(machineName.trim());
        }
    });
    
    // สร้าง options
    select.innerHTML = '<option value="">ทุกเครื่อง</option>';
    
    // เรียงตามตัวอักษร
    const sortedMachines = Array.from(machineSet).sort();
    
    sortedMachines.forEach(machineName => {
        select.innerHTML += `<option value="${machineName}">${machineName}</option>`;
    });
    
    console.log('Machine filter updated with machines:', sortedMachines);
}

/**
 * แสดง/ซ่อน loading
 */
function showLoading(show) {
    const tbody = document.getElementById('historyTableBody');
    if (show && tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">กำลังโหลด...</span>
                    </div>
                    <div class="mt-2">กำลังโหลดข้อมูลประวัติ...</div>
                </td>
            </tr>
        `;
    }
}

/**
 * แสดงข้อความผิดพลาด
 */
function showError(message) {
    const tbody = document.getElementById('historyTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-2"></i>
                    <div>${message}</div>
                    <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadInitialData()">
                        <i class="bi bi-arrow-clockwise me-1"></i>ลองใหม่
                    </button>
                </td>
            </tr>
        `;
    }
}

// ================================================================
// 8. EVENT LISTENERS
// ================================================================

/**
 * ตั้งค่า Event Listeners
 */
function setupEventListeners() {
    // ฟิลเตอร์
    const filters = ['departmentFilter', 'machineFilter', 'dateFromFilter', 'dateToFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFiltersAndRender);
        }
    });
    
    // ค้นหา
    const keywordFilter = document.getElementById('historyKeywordFilter');
    if (keywordFilter) {
        let debounceTimer;
        keywordFilter.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFiltersAndRender, 300);
        });
    }
    
    // ปุ่มรีเฟรช
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadInitialData();
            showToast('กำลังรีเฟรชข้อมูล...', 'info');
        });
    }
    
    // ปุ่มล้างตัวกรอง
    const clearBtn = document.getElementById('clearFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    // ปุ่มส่งออก
    const exportBtn = document.getElementById('exportHistoryBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToExcel);
    }
}

/**
 * ล้างตัวกรองทั้งหมด
 */
function clearAllFilters() {
    document.getElementById('departmentFilter').value = '';
    document.getElementById('machineFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('historyKeywordFilter').value = '';
    
    applyFiltersAndRender();
    showToast('ล้างตัวกรองเรียบร้อย', 'success');
}

/**
 * ส่งออกข้อมูลเป็น Excel
 */
function exportToExcel() {
    // TODO: Implement Excel export functionality
    showToast('ฟีเจอร์ส่งออก Excel กำลังพัฒนา', 'info');
}

// ================================================================
// 9. UTILITY FUNCTIONS
// ================================================================

/**
 * รับ CSS class สำหรับประสิทธิภาพ
 */
function getEfficiencyClass(efficiency) {
    if (efficiency >= 95) return 'performance-excellent';
    if (efficiency >= 85) return 'performance-good';
    return 'performance-poor';
}

/**
 * รับ CSS class สำหรับคุณภาพ
 */
function getQualityClass(quality) {
    if (quality >= 98) return 'quality-excellent';
    if (quality >= 90) return 'quality-good';
    return 'quality-poor';
}

/**
 * จัดรูปแบบตัวเลข
 */
function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num) || 0;
    }
    return num.toLocaleString('th-TH');
}

/**
 * จัดรูปแบบวันที่แบบง่าย
 */
function formatDateSimple(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * คำนวณระยะเวลาดำเนินการแบบง่าย
 */
function calculateDurationSimple(startTime, endTime) {
    if (!startTime || !endTime) return '-';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours} ชม. ${minutes} นาที`;
    } else {
        return `${minutes} นาที`;
    }
}

/**
 * จัดรูปแบบวันที่
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * จัดรูปแบบเวลา
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * คำนวณระยะเวลาดำเนินการ
 */
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return '-';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * แสดง Toast notification
 */
function showToast(message, type = 'success') {
    // สร้าง toast element
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }
    
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// ================================================================
// END OF FILE
// ================================================================
