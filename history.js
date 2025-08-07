// ================================================================
// HISTORY PAGE - Enhanced Production History with Advanced Analytics
// ================================================================
// JavaScript for comprehensive production history display with advanced filtering
// Version: 3.0.0 - Enhanced UX/UI and Data Visualization
// ================================================================

// ================================================================
// 1. GLOBAL VARIABLES
// ================================================================
let historyData = [];
let filteredData = [];
let currentPage = 1;
let recordsPerPage = 25;
let totalPages = 1;
let allDepartments = [];
let allMachines = [];
let allProducts = [];

// Advanced filter states
let advancedFiltersVisible = false;
let lastUpdateTime = null;

// ================================================================
// 2. INITIALIZATION
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced History page loading...');
    
    // ตั้งค่า active page สำหรับ navbar
    setTimeout(() => {
        const historyLink = document.querySelector('a[href="history.html"], a[data-page="history"]');
        if (historyLink) {
            historyLink.classList.add('active');
        }
    }, 500);
    
    // ตั้งค่า Event Listeners
    setupEventListeners();
    
    // ตั้งค่าวันที่เริ่มต้น (30 วันที่ผ่านมา)
    setupDefaultDateRange();
    
    // โหลดข้อมูลเริ่มต้น
    loadInitialData();
    
    // อัปเดตสถานะระบบ
    updateSystemStatus();
    
    console.log('Enhanced History page initialized successfully');
});

// ================================================================
// 3. ENHANCED DATA LOADING
// ================================================================

/**
 * ตั้งค่าช่วงวันที่เริ่มต้น
 */
function setupDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('dateFromFilter').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('dateToFilter').value = today.toISOString().split('T')[0];
}

/**
 * อัปเดตสถานะระบบ
 */
function updateSystemStatus() {
    const statusElement = document.getElementById('systemStatus');
    const lastUpdateElement = document.getElementById('lastUpdate');
    
    if (statusElement && lastUpdateElement) {
        statusElement.innerHTML = '<i class="bi bi-check-circle me-1"></i>ออนไลน์';
        statusElement.className = 'badge bg-success fs-6 px-3 py-2';
        
        const now = new Date();
        lastUpdateElement.textContent = `อัปเดตล่าสุด: ${formatDateTime(now)}`;
        lastUpdateTime = now;
    }
}

// ================================================================
// 3. DATA LOADING
// ================================================================

/**
 * โหลดข้อมูลเริ่มต้น
 */
async function loadInitialData() {
    try {
        showLoading(true);
        
        // โหลดข้อมูลประวัติ
        await loadHistoryData();
        
        // โหลดข้อมูลอ้างอิงเพิ่มเติม
        await loadReferenceData();
        
        // แสดงข้อมูลเมื่อโหลดเสร็จ
        applyFiltersAndRender();
        
        // อัปเดตสถานะ
        updateSystemStatus();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
        updateSystemStatus('error');
    }
}

/**
 * โหลดข้อมูลประวัติงาน
 */
async function loadHistoryData() {
    try {
        // เรียก API เพื่อดึงข้อมูลประวัติงานที่เสร็จสิ้นแล้ว
        const response = await fetch('tasks.php?action=get_completed_plans');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Raw history data:', data);
        
        if (Array.isArray(data)) {
            historyData = data;
            console.log(`Loaded ${historyData.length} completed plans`);
            
            // สร้างข้อมูลอ้างอิงจากข้อมูลจริง
            extractReferenceData();
            
            // อัปเดต filter options
            updateAllFilterOptions();
            
        } else {
            console.error('Data is not an array:', data);
            historyData = [];
        }
        
    } catch (error) {
        console.error('Error loading history data:', error);
        historyData = [];
        throw error;
    }
}

/**
 * โหลดข้อมูลอ้างอิงเพิ่มเติม
 */
async function loadReferenceData() {
    try {
        // ถ้าต้องการดึงข้อมูลเครื่องจักรและแผนกจาก API แยก
        // สามารถเพิ่มการเรียก API ได้ที่นี่
        console.log('Reference data loaded from history data');
    } catch (error) {
        console.warn('Could not load additional reference data:', error);
    }
}

/**
 * สกัดข้อมูลอ้างอิงจากข้อมูลประวัติ
 */
function extractReferenceData() {
    // สร้างรายการแผนกทั้งหมด
    allDepartments = [...new Set(historyData.map(item => 
        item.Department || item.DepartmentName || item.departmentName || ''
    ).filter(dept => dept.trim()))].sort();
    
    // สร้างรายการเครื่องจักรทั้งหมด
    allMachines = [...new Set(historyData.map(item => 
        item.MachineName || item.MachineID || item.machine || ''
    ).filter(machine => machine.trim()))].sort();
    
    // สร้างรายการผลิตภัณฑ์ทั้งหมด
    allProducts = [...new Set(historyData.map(item => 
        item.ProductName || item.ProductDisplayName || ''
    ).filter(product => product.trim()))].sort();
    
    console.log('Extracted reference data:', {
        departments: allDepartments.length,
        machines: allMachines.length,
        products: allProducts.length
    });
}

// ================================================================
// 4. ENHANCED FILTERING AND SEARCHING
// ================================================================

/**
 * ใช้ฟิลเตอร์และแสดงผลข้อมูล (ปรับปรุงใหม่)
 */
function applyFiltersAndRender() {
    console.log('Enhanced filtering started...');
    
    const filters = getActiveFilters();
    console.log('Active filters:', filters);
    
    // เริ่มจากข้อมูลทั้งหมด
    filteredData = [...historyData];
    console.log('Initial data count:', filteredData.length);
    
    // ใช้ฟิลเตอร์ทีละตัว
    filteredData = applyDepartmentFilter(filteredData, filters.department);
    filteredData = applyMachineFilter(filteredData, filters.machine);
    filteredData = applyProductFilter(filteredData, filters.product);
    filteredData = applyDateRangeFilter(filteredData, filters.dateFrom, filters.dateTo);
    filteredData = applyKeywordFilter(filteredData, filters.keyword);
    filteredData = applyShiftFilter(filteredData, filters.shift);
    filteredData = applyOEEFilter(filteredData, filters.oeeRange);
    filteredData = applyQuantityFilter(filteredData, filters.minQuantity, filters.maxQuantity);
    
    // เรียงลำดับข้อมูล
    filteredData = applySorting(filteredData, filters.sortBy);
    
    console.log('Final filtered data count:', filteredData.length);
    
    // อัปเดตการแสดงผล
    updateFilterCounts();
    updatePagination();
    renderHistoryTable();
    updateStatistics();
    updateLastUpdateTime();
}

/**
 * รวบรวมฟิลเตอร์ที่เลือกไว้ทั้งหมด
 */
function getActiveFilters() {
    return {
        department: document.getElementById('departmentFilter')?.value || '',
        machine: document.getElementById('machineFilter')?.value || '',
        product: document.getElementById('productFilter')?.value || '',
        dateFrom: document.getElementById('dateFromFilter')?.value || '',
        dateTo: document.getElementById('dateToFilter')?.value || '',
        keyword: document.getElementById('historyKeywordFilter')?.value.trim().toLowerCase() || '',
        shift: document.getElementById('shiftFilter')?.value || '',
        oeeRange: document.getElementById('oeeRangeFilter')?.value || '',
        minQuantity: parseInt(document.getElementById('minQuantityFilter')?.value) || 0,
        maxQuantity: parseInt(document.getElementById('maxQuantityFilter')?.value) || Infinity,
        sortBy: document.getElementById('sortByFilter')?.value || 'date_desc'
    };
}

/**
 * ฟิลเตอร์ตามแผนก
 */
function applyDepartmentFilter(data, department) {
    if (!department) return data;
    return data.filter(item => {
        const itemDept = (item.Department || item.DepartmentName || item.departmentName || '').trim();
        return itemDept === department;
    });
}

/**
 * ฟิลเตอร์ตามเครื่องจักร
 */
function applyMachineFilter(data, machine) {
    if (!machine) return data;
    return data.filter(item => {
        const itemMachine = (item.MachineName || item.MachineID || item.machine || '').trim();
        return itemMachine === machine;
    });
}

/**
 * ฟิลเตอร์ตามผลิตภัณฑ์
 */
function applyProductFilter(data, product) {
    if (!product) return data;
    return data.filter(item => {
        const itemProduct = (item.ProductName || item.ProductDisplayName || '').trim();
        return itemProduct === product;
    });
}

/**
 * ฟิลเตอร์ตามช่วงวันที่
 */
function applyDateRangeFilter(data, dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return data;
    
    return data.filter(item => {
        const itemDate = item.ProductionDate || item.ConfirmedAt || item.ActualEndTime;
        if (!itemDate) return false;
        
        const date = new Date(itemDate).toISOString().split('T')[0];
        
        if (dateFrom && date < dateFrom) return false;
        if (dateTo && date > dateTo) return false;
        
        return true;
    });
}

/**
 * ฟิลเตอร์ตามคำค้นหา
 */
function applyKeywordFilter(data, keyword) {
    if (!keyword) return data;
    
    return data.filter(item => {
        const searchText = [
            item.ProductName || '',
            item.ProductDisplayName || '',
            item.ProductCode || '',
            item.LotNumber || '',
            item.Department || '',
            item.MachineName || ''
        ].join(' ').toLowerCase();
        
        return searchText.includes(keyword);
    });
}

/**
 * ฟิลเตอร์ตามกะการทำงาน
 */
function applyShiftFilter(data, shift) {
    if (!shift) return data;
    
    return data.filter(item => {
        const startTime = item.ActualStartTime;
        if (!startTime) return false;
        
        const hour = new Date(startTime).getHours();
        
        switch (shift) {
            case 'morning': return hour >= 6 && hour < 14;
            case 'afternoon': return hour >= 14 && hour < 22;
            case 'night': return hour >= 22 || hour < 6;
            default: return true;
        }
    });
}

/**
 * ฟิลเตอร์ตามช่วง OEE
 */
function applyOEEFilter(data, oeeRange) {
    if (!oeeRange) return data;
    
    return data.filter(item => {
        const oee = parseFloat(item.OEE_Overall) || 0;
        
        switch (oeeRange) {
            case 'excellent': return oee >= 85;
            case 'good': return oee >= 70 && oee < 85;
            case 'fair': return oee >= 50 && oee < 70;
            case 'poor': return oee < 50;
            default: return true;
        }
    });
}

/**
 * ฟิลเตอร์ตามจำนวนผลผลิต
 */
function applyQuantityFilter(data, minQuantity, maxQuantity) {
    if (minQuantity === 0 && maxQuantity === Infinity) return data;
    
    return data.filter(item => {
        const quantity = parseInt(item.TotalPieces) || 0;
        return quantity >= minQuantity && quantity <= maxQuantity;
    });
}

/**
 * เรียงลำดับข้อมูล
 */
function applySorting(data, sortBy) {
    const sortedData = [...data];
    
    switch (sortBy) {
        case 'date_desc':
            return sortedData.sort((a, b) => new Date(b.ProductionDate || b.ConfirmedAt) - new Date(a.ProductionDate || a.ConfirmedAt));
        case 'date_asc':
            return sortedData.sort((a, b) => new Date(a.ProductionDate || a.ConfirmedAt) - new Date(b.ProductionDate || b.ConfirmedAt));
        case 'oee_desc':
            return sortedData.sort((a, b) => (parseFloat(b.OEE_Overall) || 0) - (parseFloat(a.OEE_Overall) || 0));
        case 'oee_asc':
            return sortedData.sort((a, b) => (parseFloat(a.OEE_Overall) || 0) - (parseFloat(b.OEE_Overall) || 0));
        case 'quantity_desc':
            return sortedData.sort((a, b) => (parseInt(b.TotalPieces) || 0) - (parseInt(a.TotalPieces) || 0));
        case 'quantity_asc':
            return sortedData.sort((a, b) => (parseInt(a.TotalPieces) || 0) - (parseInt(b.TotalPieces) || 0));
        default:
            return sortedData;
    }
}

// ================================================================
// 5. PAGINATION SYSTEM
// ================================================================

/**
 * อัปเดตการแบ่งหน้า
 */
function updatePagination() {
    const recordsPerPageSelect = document.getElementById('recordsPerPage');
    recordsPerPage = recordsPerPageSelect?.value === 'all' ? filteredData.length : parseInt(recordsPerPageSelect?.value) || 25;
    
    totalPages = Math.ceil(filteredData.length / recordsPerPage);
    currentPage = Math.min(currentPage, totalPages) || 1;
    
    console.log(`Pagination: ${filteredData.length} items, ${recordsPerPage} per page, ${totalPages} pages, current: ${currentPage}`);
}

/**
 * ดึงข้อมูลสำหรับหน้าปัจจุบัน
 */
function getCurrentPageData() {
    if (recordsPerPage >= filteredData.length) {
        return filteredData; // แสดงทั้งหมด
    }
    
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, filteredData.length);
    
    return filteredData.slice(startIndex, endIndex);
}

// ================================================================
// 6. ENHANCED UI RENDERING
// ================================================================

/**
 * แสดงตารางประวัติ (ปรับปรุงใหม่)
 */
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const currentData = getCurrentPageData();
    
    if (!currentData.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center text-muted py-5">
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-inbox fs-1 mb-3 text-muted"></i>
                        <h5 class="text-muted mb-2">ไม่พบข้อมูลประวัติงาน</h5>
                        <p class="text-muted mb-3">ลองปรับเปลี่ยนเงื่อนไขการกรองหรือคำค้นหา</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="clearAllFilters()">
                                <i class="bi bi-x-lg me-1"></i>ล้างตัวกรอง
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="loadInitialData()">
                                <i class="bi bi-arrow-clockwise me-1"></i>รีเฟรชข้อมูล
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = currentData.map((item, index) => createEnhancedHistoryRow(item, index)).join('');
    
    // เพิ่ม pagination controls ถ้าจำเป็น
    renderPaginationControls();
}

/**
 * สร้างแถวสำหรับตารางประวัติ (ปรับปรุงใหม่)
 */
function createEnhancedHistoryRow(item, index) {
    const globalIndex = (currentPage - 1) * recordsPerPage + index;
    const rowClass = globalIndex % 2 === 0 ? 'table-light' : '';
    
    // ข้อมูลหลัก
    const productName = item.ProductName || item.ProductDisplayName || 'ไม่ระบุ';
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
    
    // OEE Metrics
    const oeeAvailability = parseFloat(item.OEE_Availability) || 0;
    const oeePerformance = parseFloat(item.OEE_Performance) || 0;
    const oeeQuality = parseFloat(item.OEE_Quality) || 0;
    const oeeOverall = parseFloat(item.OEE_Overall) || 0;
    
    // สีและ CSS classes ตาม OEE
    const oeeClass = getOEEClass(oeeOverall);
    const performanceColor = getMetricColor(oeePerformance, 'performance');
    const qualityColor = getMetricColor(oeeQuality, 'quality');
    const availabilityColor = getMetricColor(oeeAvailability, 'availability');
    
    // การคำนวณเพิ่มเติม
    const yieldRate = totalPieces > 0 ? ((goodQuantity / totalPieces) * 100) : 0;
    const efficiency = lotSize > 0 ? ((totalPieces / lotSize) * 100) : 0;
    
    return `
        <tr class="${rowClass} history-row" data-item-id="${item.ID || globalIndex}" onclick="showItemDetails(${globalIndex})">
            <td class="text-center">
                <div class="fw-bold text-primary">${productionDate ? formatDateThai(productionDate) : '-'}</div>
                ${actualStartTime ? `<small class="text-muted">${getShiftInfo(actualStartTime)}</small>` : ''}
            </td>
            <td>
                <div class="fw-bold text-dark mb-1">${productName}</div>
                <div class="d-flex gap-2 mb-1">
                    <small class="badge bg-light text-dark">รหัส: ${productCode}</small>
                    ${productSize !== '-' ? `<small class="badge bg-light text-dark">ขนาด: ${productSize}</small>` : ''}
                </div>
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-info" style="width: ${Math.min(efficiency, 100)}%" title="Efficiency: ${efficiency.toFixed(1)}%"></div>
                </div>
            </td>
            <td class="text-center">
                <span class="badge bg-primary fs-6 px-2 py-1">${department}</span>
                <div class="mt-1">
                    <small class="text-muted">${allDepartments.indexOf(department) + 1}/${allDepartments.length}</small>
                </div>
            </td>
            <td class="text-center">
                <div class="fw-bold text-success">${machineName}</div>
                <small class="text-muted">${allMachines.indexOf(machineName) + 1}/${allMachines.length}</small>
            </td>
            <td class="text-center">
                <code class="bg-light p-2 rounded fw-bold">${lotNumber}</code>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-primary fs-5">${formatNumber(lotSize)}</div>
                <small class="text-muted">ชิ้น (เป้าหมาย)</small>
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-primary" style="width: 100%"></div>
                </div>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-info fs-5">${formatNumber(totalPieces)}</div>
                <small class="text-muted">ชิ้น (ผลิตได้)</small>
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-info" style="width: ${Math.min(efficiency, 100)}%" title="${efficiency.toFixed(1)}% ของเป้าหมาย"></div>
                </div>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-success fs-5">${formatNumber(goodQuantity)}</div>
                <small class="text-muted">ชิ้น (${yieldRate.toFixed(1)}%)</small>
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-success" style="width: ${yieldRate}%"></div>
                </div>
            </td>
            <td class="text-end data-cell">
                <div class="fw-bold text-danger fs-5">${formatNumber(rejectPieces)}</div>
                <small class="text-muted">ชิ้น (${(100 - yieldRate).toFixed(1)}%)</small>
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-danger" style="width: ${100 - yieldRate}%"></div>
                </div>
            </td>
            <td class="text-center data-cell ${oeeClass}" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); min-width: 160px;">
                <div class="row g-1 text-center mb-2">
                    <div class="col-4">
                        <div class="fw-bold ${availabilityColor} fs-6">${oeeAvailability.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.65rem;">ความพร้อม</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold ${performanceColor} fs-6">${oeePerformance.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.65rem;">ประสิทธิภาพ</small>
                    </div>
                    <div class="col-4">
                        <div class="fw-bold ${qualityColor} fs-6">${oeeQuality.toFixed(1)}%</div>
                        <small class="text-muted" style="font-size: 0.65rem;">คุณภาพ</small>
                    </div>
                </div>
                <hr class="my-1 opacity-50">
                <div class="fw-bold text-dark fs-4 mb-1">${oeeOverall.toFixed(1)}%</div>
                <span class="badge ${getOEEBadgeClass(oeeOverall)} fs-6">${getOEELabel(oeeOverall)}</span>
            </td>
            <td class="text-center data-cell">
                <div class="fw-bold text-dark mb-1">${calculateDurationSimple(actualStartTime, actualEndTime)}</div>
                <small class="text-muted d-block">${workingHours.toFixed(1)} ชั่วโมง</small>
                ${actualStartTime && actualEndTime ? `
                    <small class="text-muted d-block mt-1">
                        ${formatTime(actualStartTime)} - ${formatTime(actualEndTime)}
                    </small>
                ` : ''}
                <div class="progress mt-1" style="height: 3px;">
                    <div class="progress-bar bg-secondary" style="width: ${Math.min((workingHours / 8) * 100, 100)}%"></div>
                </div>
            </td>
        </tr>
    `;
}

/**
 * อัปเดตสถิติด้านบน (ปรับปรุงใหม่ให้ครบถ้วน)
 */
function updateStatistics() {
    console.log('Updating enhanced statistics...');
    
    const totalCompleted = filteredData.length;
    
    // คำนวณข้อมูลพื้นฐาน
    const totalProduced = filteredData.reduce((sum, item) => sum + (parseInt(item.TotalPieces) || 0), 0);
    const totalGoodProduct = filteredData.reduce((sum, item) => sum + (parseInt(item.GoodQuantity) || 0), 0);
    const totalReject = filteredData.reduce((sum, item) => sum + (parseInt(item.RejectPieces) || 0), 0);
    const totalWorkingHours = filteredData.reduce((sum, item) => sum + (parseFloat(item.WorkingHours) || 0), 0);
    const totalDowntime = filteredData.reduce((sum, item) => sum + (parseInt(item.DowntimeMinutes) || 0), 0);
    
    // คำนวณค่าเฉลี่ย OEE
    const validOEEItems = filteredData.filter(item => parseFloat(item.OEE_Overall) > 0);
    const avgPerformance = validOEEItems.length > 0 ? 
        validOEEItems.reduce((sum, item) => sum + (parseFloat(item.OEE_Performance) || 0), 0) / validOEEItems.length : 0;
    const avgQuality = validOEEItems.length > 0 ? 
        validOEEItems.reduce((sum, item) => sum + (parseFloat(item.OEE_Quality) || 0), 0) / validOEEItems.length : 0;
    const avgOEE = validOEEItems.length > 0 ? 
        validOEEItems.reduce((sum, item) => sum + (parseFloat(item.OEE_Overall) || 0), 0) / validOEEItems.length : 0;
    
    // นับเครื่องจักรที่ใช้งาน
    const uniqueMachines = new Set(filteredData.map(item => item.MachineName || item.MachineID).filter(m => m)).size;
    
    // อัปเดต UI elements
    updateStatElement('totalCompleted', formatNumber(totalCompleted));
    updateStatElement('totalProduced', formatNumber(totalProduced));
    updateStatElement('totalGoodProduct', formatNumber(totalGoodProduct));
    updateStatElement('totalReject', formatNumber(totalReject));
    updateStatElement('avgEfficiency', `${avgPerformance.toFixed(1)}%`);
    updateStatElement('avgQuality', `${avgQuality.toFixed(1)}%`);
    updateStatElement('avgOEE', `${avgOEE.toFixed(1)}%`);
    updateStatElement('totalWorkingHours', totalWorkingHours.toFixed(1));
    updateStatElement('totalDowntime', formatNumber(totalDowntime));
    updateStatElement('totalMachines', formatNumber(uniqueMachines));
    
    // อัปเดต progress bars
    updateProgressBar('efficiencyProgress', avgPerformance);
    updateProgressBar('qualityProgress', avgQuality);
    updateProgressBar('oeeProgress', avgOEE);
    updateProgressBar('downtimeProgress', Math.min((totalDowntime / (totalWorkingHours * 60)) * 100, 100));
    
    // อัปเดต summary text
    updateHistorySummary(totalCompleted, totalProduced, totalGoodProduct, totalReject, 
                        avgPerformance, avgQuality, avgOEE, totalWorkingHours, totalDowntime);
}

/**
 * อัปเดต element สถิติ
 */
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        element.classList.add('animate-update');
        setTimeout(() => element.classList.remove('animate-update'), 500);
    }
}

/**
 * อัปเดต progress bar
 */
function updateProgressBar(id, percentage) {
    const element = document.getElementById(id);
    if (element) {
        element.style.width = `${Math.min(percentage, 100)}%`;
        element.setAttribute('aria-valuenow', percentage);
    }
}

/**
 * อัปเดตข้อความสรุป
 */
function updateHistorySummary(completed, produced, good, reject, performance, quality, oee, hours, downtime) {
    const summaryElement = document.getElementById('historySummary');
    if (summaryElement) {
        const qualityRate = produced > 0 ? ((good / produced) * 100).toFixed(1) : 0;
        const rejectRate = produced > 0 ? ((reject / produced) * 100).toFixed(1) : 0;
        
        summaryElement.innerHTML = `
            <div class="row text-center">
                <div class="col-md-3">
                    <i class="bi bi-check-circle me-1"></i>
                    งานสำเร็จ <strong>${formatNumber(completed)}</strong> งาน
                </div>
                <div class="col-md-3">
                    <i class="bi bi-box me-1"></i>
                    ผลิตได้ <strong>${formatNumber(produced)}</strong> ชิ้น
                </div>
                <div class="col-md-3">
                    <i class="bi bi-award me-1"></i>
                    คุณภาพ <strong>${qualityRate}%</strong>
                </div>
                <div class="col-md-3">
                    <i class="bi bi-speedometer me-1"></i>
                    OEE เฉลี่ย <strong>${oee.toFixed(1)}%</strong>
                </div>
            </div>
        `;
    }
}

// ================================================================
// 7. ENHANCED UI HELPERS
// ================================================================

/**
 * อัปเดตตัวกรองทั้งหมด
 */
function updateAllFilterOptions() {
    updateDepartmentFilter();
    updateMachineFilter();
    updateProductFilter();
    updateFilterCounts();
}

/**
 * อัปเดต dropdown แผนก (ปรับปรุงใหม่)
 */
function updateDepartmentFilter() {
    const select = document.getElementById('departmentFilter');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">ทุกแผนก</option>';
    
    allDepartments.forEach(dept => {
        const count = historyData.filter(item => 
            (item.Department || item.DepartmentName || '').trim() === dept
        ).length;
        
        select.innerHTML += `<option value="${dept}">${dept} (${count})</option>`;
    });
    
    select.value = currentValue; // คงค่าเดิมไว้
    console.log('Department filter updated:', allDepartments.length, 'departments');
}

/**
 * อัปเดต dropdown เครื่องจักร (ปรับปรุงใหม่)
 */
function updateMachineFilter() {
    const select = document.getElementById('machineFilter');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">ทุกเครื่อง</option>';
    
    allMachines.forEach(machine => {
        const count = historyData.filter(item => 
            (item.MachineName || item.MachineID || '').trim() === machine
        ).length;
        
        select.innerHTML += `<option value="${machine}">${machine} (${count})</option>`;
    });
    
    select.value = currentValue; // คงค่าเดิมไว้
    console.log('Machine filter updated:', allMachines.length, 'machines');
}

/**
 * อัปเดต dropdown ผลิตภัณฑ์ (ใหม่)
 */
function updateProductFilter() {
    const select = document.getElementById('productFilter');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">ทุกผลิตภัณฑ์</option>';
    
    allProducts.forEach(product => {
        const count = historyData.filter(item => 
            (item.ProductName || item.ProductDisplayName || '').trim() === product
        ).length;
        
        select.innerHTML += `<option value="${product}">${product} (${count})</option>`;
    });
    
    select.value = currentValue; // คงค่าเดิมไว้
    console.log('Product filter updated:', allProducts.length, 'products');
}

/**
 * อัปเดตจำนวนรายการในตัวกรอง
 */
function updateFilterCounts() {
    updateElementCount('departmentCount', allDepartments.length);
    updateElementCount('machineCount', allMachines.length);
    updateElementCount('productCount', allProducts.length);
    updateElementCount('filterCount', `${filteredData.length} รายการ`);
}

/**
 * อัปเดตจำนวนใน badge
 */
function updateElementCount(id, count) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = count;
    }
}

/**
 * อัปเดตเวลาล่าสุดที่อัปเดต
 */
function updateLastUpdateTime() {
    const element = document.getElementById('lastUpdate');
    if (element) {
        const now = new Date();
        element.textContent = `อัปเดตล่าสุด: ${formatDateTime(now)}`;
    }
}

/**
 * แสดง/ซ่อน loading (ปรับปรุงใหม่)
 */
function showLoading(show) {
    const tbody = document.getElementById('historyTableBody');
    if (show && tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-5">
                    <div class="d-flex flex-column align-items-center">
                        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">กำลังโหลด...</span>
                        </div>
                        <h5 class="text-primary mb-2">กำลังโหลดข้อมูลประวัติการผลิต</h5>
                        <p class="text-muted">โปรดรอสักครู่...</p>
                        <div class="progress" style="width: 200px; height: 4px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 role="progressbar" style="width: 100%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * แสดงข้อความผิดพลาด (ปรับปรุงใหม่)
 */
function showError(message) {
    const tbody = document.getElementById('historyTableBody');
    const statusElement = document.getElementById('systemStatus');
    
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-5">
                    <div class="d-flex flex-column align-items-center">
                        <i class="bi bi-exclamation-triangle-fill fs-1 text-danger mb-3"></i>
                        <h5 class="text-danger mb-2">เกิดข้อผิดพลาด</h5>
                        <p class="text-muted mb-3">${message}</p>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary" onclick="loadInitialData()">
                                <i class="bi bi-arrow-clockwise me-1"></i>ลองใหม่
                            </button>
                            <button class="btn btn-outline-secondary" onclick="clearAllFilters()">
                                <i class="bi bi-x-lg me-1"></i>ล้างตัวกรอง
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    
    if (statusElement) {
        statusElement.innerHTML = '<i class="bi bi-x-circle me-1"></i>ออฟไลน์';
        statusElement.className = 'badge bg-danger fs-6 px-3 py-2';
    }
}

// ================================================================
// 8. ENHANCED EVENT LISTENERS
// ================================================================

/**
 * ตั้งค่า Event Listeners (ปรับปรุงใหม่)
 */
function setupEventListeners() {
    console.log('Setting up enhanced event listeners...');
    
    // ฟิลเตอร์พื้นฐาน
    const basicFilters = ['departmentFilter', 'machineFilter', 'productFilter', 'dateFromFilter', 'dateToFilter'];
    basicFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFiltersAndRender);
        }
    });
    
    // ฟิลเตอร์ขั้นสูง
    const advancedFilters = ['shiftFilter', 'oeeRangeFilter', 'minQuantityFilter', 'maxQuantityFilter', 'sortByFilter', 'recordsPerPage'];
    advancedFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFiltersAndRender);
        }
    });
    
    // ค้นหาแบบ debounce
    const keywordFilter = document.getElementById('historyKeywordFilter');
    if (keywordFilter) {
        let debounceTimer;
        keywordFilter.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFiltersAndRender, 300);
        });
    }
    
    // ปุ่มควบคุมต่างๆ
    setupControlButtons();
    
    // ตัวกรองขั้นสูง
    setupAdvancedFilters();
    
    console.log('Enhanced event listeners setup completed');
}

/**
 * ตั้งค่าปุ่มควบคุม
 */
function setupControlButtons() {
    // ปุ่มรีเฟรช
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showToast('กำลังรีเฟรชข้อมูล...', 'info');
            loadInitialData();
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
    
    // ปุ่มพิมพ์
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printReport);
    }
    
    // ปุ่มบันทึกตัวกรอง
    const saveFiltersBtn = document.getElementById('saveFiltersBtn');
    if (saveFiltersBtn) {
        saveFiltersBtn.addEventListener('click', saveCurrentFilters);
    }
}

/**
 * ตั้งค่าตัวกรองขั้นสูง
 */
function setupAdvancedFilters() {
    const toggleBtn = document.getElementById('toggleAdvancedFilters');
    const advancedRow = document.getElementById('advancedFiltersRow');
    
    if (toggleBtn && advancedRow) {
        toggleBtn.addEventListener('click', () => {
            advancedFiltersVisible = !advancedFiltersVisible;
            
            if (advancedFiltersVisible) {
                advancedRow.classList.remove('d-none');
                toggleBtn.innerHTML = '<i class="bi bi-dash-circle me-1"></i>ซ่อนตัวกรองเพิ่มเติม';
            } else {
                advancedRow.classList.add('d-none');
                toggleBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>ตัวกรองเพิ่มเติม';
            }
        });
    }
}

/**
 * ล้างตัวกรองทั้งหมด (ปรับปรุงใหม่)
 */
function clearAllFilters() {
    // Clear main filters
    document.getElementById('departmentFilter').value = '';
    document.getElementById('machineFilter').value = '';
    document.getElementById('productFilter').value = '';
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
    document.getElementById('historyKeywordFilter').value = '';
    
    // Clear advanced filters
    document.getElementById('shiftFilter').value = '';
    document.getElementById('oeeRangeFilter').value = '';
    document.getElementById('minQuantityFilter').value = '';
    document.getElementById('maxQuantityFilter').value = '';
    document.getElementById('sortByFilter').value = 'date_desc';
    document.getElementById('recordsPerPage').value = '25';
    
    // Reset pagination
    currentPage = 1;
    
    // Re-apply filters and render
    applyFiltersAndRender();
    
    showToast('ล้างตัวกรองทั้งหมดเรียบร้อย', 'success');
}

/**
 * บันทึกตัวกรองปัจจุบัน
 */
function saveCurrentFilters() {
    const filters = getActiveFilters();
    localStorage.setItem('historyFilters', JSON.stringify(filters));
    showToast('บันทึกการตั้งค่าตัวกรองแล้ว', 'success');
}

/**
 * ส่งออกข้อมูลเป็น Excel (ฟีเจอร์พื้นฐาน)
 */
function exportToExcel() {
    showToast('กำลังเตรียมไฟล์ Excel...', 'info');
    
    // TODO: Implement proper Excel export
    setTimeout(() => {
        showToast('ฟีเจอร์ส่งออก Excel กำลังพัฒนา', 'warning');
    }, 1000);
}

/**
 * พิมพ์รายงาน
 */
function printReport() {
    window.print();
}

// ================================================================
// 9. ENHANCED UTILITY FUNCTIONS
// ================================================================

/**
 * ดึง CSS class สำหรับ OEE
 */
function getOEEClass(oee) {
    if (oee >= 85) return 'oee-excellent';
    if (oee >= 70) return 'oee-good';
    if (oee >= 50) return 'oee-fair';
    return 'oee-poor';
}

/**
 * ดึง CSS class สำหรับ badge OEE
 */
function getOEEBadgeClass(oee) {
    if (oee >= 85) return 'bg-success';
    if (oee >= 70) return 'bg-warning';
    if (oee >= 50) return 'bg-info';
    return 'bg-danger';
}

/**
 * ดึงข้อความ label สำหรับ OEE
 */
function getOEELabel(oee) {
    if (oee >= 85) return 'ดีเยี่ยม';
    if (oee >= 70) return 'ดี';
    if (oee >= 50) return 'พอใช้';
    return 'ต้องปรับปรุง';
}

/**
 * ดึงสีสำหรับ metrics ต่างๆ
 */
function getMetricColor(value, type) {
    switch (type) {
        case 'performance':
            if (value >= 90) return 'text-success';
            if (value >= 70) return 'text-warning';
            return 'text-danger';
        case 'quality':
            if (value >= 95) return 'text-success';
            if (value >= 85) return 'text-warning';
            return 'text-danger';
        case 'availability':
            if (value >= 85) return 'text-success';
            if (value >= 70) return 'text-warning';
            return 'text-danger';
        default:
            return 'text-muted';
    }
}

/**
 * ดึงข้อมูลกะการทำงาน
 */
function getShiftInfo(startTime) {
    if (!startTime) return '';
    
    const hour = new Date(startTime).getHours();
    
    if (hour >= 6 && hour < 14) return 'กะเช้า';
    if (hour >= 14 && hour < 22) return 'กะบ่าย';
    return 'กะกลางคืน';
}

/**
 * จัดรูปแบบวันที่แบบไทย
 */
function formatDateThai(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * จัดรูปแบบวันที่และเวลา
 */
function formatDateTime(date) {
    return date.toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * แสดงรายละเอียดของรายการ (ปรับปรุงใหม่ให้แสดง Modal)
 */
function showItemDetails(index) {
    const item = getCurrentPageData()[index];
    if (!item) return;
    
    console.log('Showing details for item:', item);
    
    // สร้างเนื้อหา Modal
    const modalBody = document.getElementById('jobDetailsModalBody');
    const modalTitle = document.getElementById('jobDetailsModalLabel');
    
    // อัปเดต title
    modalTitle.innerHTML = `
        <i class="bi bi-info-circle-fill me-2"></i>รายละเอียดงาน: ${item.ProductName || 'ไม่ระบุ'} 
        <small class="opacity-75">(${item.LotNumber || 'ไม่มีรหัสล็อต'})</small>
    `;
    
    // สร้างเนื้อหาของ Modal
    modalBody.innerHTML = createJobDetailsContent(item);
    
    // แสดง Modal
    const modal = new bootstrap.Modal(document.getElementById('jobDetailsModal'));
    modal.show();
}

/**
 * สร้างเนื้อหารายละเอียดงาน
 */
function createJobDetailsContent(item) {
    const productionDate = item.ProductionDate || item.ConfirmedAt || '-';
    const actualStartTime = item.ActualStartTime || '-';
    const actualEndTime = item.ActualEndTime || '-';
    const workingHours = parseFloat(item.WorkingHours) || 0;
    
    // ข้อมูล OEE
    const oeeAvailability = parseFloat(item.OEE_Availability) || 0;
    const oeePerformance = parseFloat(item.OEE_Performance) || 0;
    const oeeQuality = parseFloat(item.OEE_Quality) || 0;
    const oeeOverall = parseFloat(item.OEE_Overall) || 0;
    
    // ข้อมูลการผลิต
    const lotSize = parseInt(item.LotSize) || 0;
    const totalPieces = parseInt(item.TotalPieces) || 0;
    const goodQuantity = parseInt(item.GoodQuantity) || 0;
    const rejectPieces = parseInt(item.RejectPieces) || 0;
    const downtimeMinutes = parseInt(item.DowntimeMinutes) || 0;
    
    // คำนวณข้อมูลเพิ่มเติม
    const yieldRate = totalPieces > 0 ? ((goodQuantity / totalPieces) * 100) : 0;
    const efficiency = lotSize > 0 ? ((totalPieces / lotSize) * 100) : 0;
    const plannedProductionTime = workingHours * 60; // นาที
    const actualProductionTime = plannedProductionTime - downtimeMinutes;
    
    return `
        <div class="container-fluid">
            <!-- Job Overview -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h6 class="card-title text-primary mb-3">
                                <i class="bi bi-clipboard-data me-2"></i>ข้อมูลภาพรวมงาน
                            </h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <tr>
                                                <td class="fw-bold">วันที่ผลิต:</td>
                                                <td>${productionDate ? formatDateThai(productionDate) : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">ผลิตภัณฑ์:</td>
                                                <td>${item.ProductName || 'ไม่ระบุ'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">รหัสสินค้า:</td>
                                                <td>${item.ProductCode || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">ขนาด:</td>
                                                <td>${item.ProductSize || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">รหัสล็อต:</td>
                                                <td><code>${item.LotNumber || '-'}</code></td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <tr>
                                                <td class="fw-bold">แผนก:</td>
                                                <td><span class="badge bg-primary">${item.Department || item.DepartmentName || 'ไม่ระบุ'}</span></td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">เครื่องจักร:</td>
                                                <td><span class="badge bg-success">${item.MachineName || 'ไม่ระบุ'}</span></td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">กะการทำงาน:</td>
                                                <td>${actualStartTime ? getShiftInfo(actualStartTime) : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">สถานะงาน:</td>
                                                <td><span class="badge bg-success">เสร็จสิ้น</span></td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">ผู้รับผิดชอบ:</td>
                                                <td>${item.OperatorName || 'ไม่ระบุ'}</td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Time Schedule -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-success mb-3">
                                <i class="bi bi-clock me-2"></i>ตารางเวลาการผลิต
                            </h6>
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาเริ่มต้น (วางแผน)</h6>
                                        <div class="fs-5 fw-bold text-primary">
                                            ${item.PlannedStartTime ? formatTime(item.PlannedStartTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาเริ่มต้น (จริง)</h6>
                                        <div class="fs-5 fw-bold text-info">
                                            ${actualStartTime ? formatTime(actualStartTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาสิ้นสุด (จริง)</h6>
                                        <div class="fs-5 fw-bold text-success">
                                            ${actualEndTime ? formatTime(actualEndTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-md-3">
                                    <div class="text-center p-2 border rounded">
                                        <small class="text-muted">ชั่วโมงทำงาน</small>
                                        <div class="fw-bold">${workingHours.toFixed(1)} ชม.</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center p-2 border rounded">
                                        <small class="text-muted">เวลาหยุด</small>
                                        <div class="fw-bold text-danger">${downtimeMinutes} นาที</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center p-2 border rounded">
                                        <small class="text-muted">เวลาผลิตจริง</small>
                                        <div class="fw-bold text-success">${actualProductionTime} นาที</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center p-2 border rounded">
                                        <small class="text-muted">ระยะเวลารวม</small>
                                        <div class="fw-bold">${calculateDurationSimple(actualStartTime, actualEndTime)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Production Data -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title text-info mb-3">
                                <i class="bi bi-bar-chart me-2"></i>ข้อมูลการผลิต
                            </h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <tr>
                                        <td class="fw-bold">ขนาดล็อต (วางแผน):</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-primary">${formatNumber(lotSize)}</span> ชิ้น
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ผลิตได้จริง:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-info">${formatNumber(totalPieces)}</span> ชิ้น
                                            <small class="text-muted">(${efficiency.toFixed(1)}%)</small>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ของดี:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-success">${formatNumber(goodQuantity)}</span> ชิ้น
                                            <small class="text-muted">(${yieldRate.toFixed(1)}%)</small>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ของเสีย:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-danger">${formatNumber(rejectPieces)}</span> ชิ้น
                                            <small class="text-muted">(${(100 - yieldRate).toFixed(1)}%)</small>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Production Charts -->
                            <div class="mt-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <small class="fw-bold">ประสิทธิภาพการผลิต</small>
                                    <small>${efficiency.toFixed(1)}%</small>
                                </div>
                                <div class="progress mb-2" style="height: 8px;">
                                    <div class="progress-bar bg-info" style="width: ${Math.min(efficiency, 100)}%"></div>
                                </div>
                                
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <small class="fw-bold">อัตราคุณภาพ</small>
                                    <small>${yieldRate.toFixed(1)}%</small>
                                </div>
                                <div class="progress mb-2" style="height: 8px;">
                                    <div class="progress-bar bg-success" style="width: ${yieldRate}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="card-title text-warning mb-3">
                                <i class="bi bi-speedometer me-2"></i>คะแนน OEE รายละเอียด
                            </h6>
                            
                            <!-- OEE Breakdown -->
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold">Availability (ความพร้อม)</span>
                                    <span class="fw-bold ${getMetricColor(oeeAvailability, 'availability')}">${oeeAvailability.toFixed(1)}%</span>
                                </div>
                                <div class="progress mb-3" style="height: 10px;">
                                    <div class="progress-bar ${getProgressBarClass(oeeAvailability, 'availability')}" style="width: ${oeeAvailability}%"></div>
                                </div>
                                
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold">Performance (ประสิทธิภาพ)</span>
                                    <span class="fw-bold ${getMetricColor(oeePerformance, 'performance')}">${oeePerformance.toFixed(1)}%</span>
                                </div>
                                <div class="progress mb-3" style="height: 10px;">
                                    <div class="progress-bar ${getProgressBarClass(oeePerformance, 'performance')}" style="width: ${oeePerformance}%"></div>
                                </div>
                                
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fw-bold">Quality (คุณภาพ)</span>
                                    <span class="fw-bold ${getMetricColor(oeeQuality, 'quality')}">${oeeQuality.toFixed(1)}%</span>
                                </div>
                                <div class="progress mb-3" style="height: 10px;">
                                    <div class="progress-bar ${getProgressBarClass(oeeQuality, 'quality')}" style="width: ${oeeQuality}%"></div>
                                </div>
                            </div>
                            
                            <!-- Overall OEE -->
                            <div class="text-center p-3 ${getOEEClass(oeeOverall)} rounded">
                                <h5 class="mb-1 text-white">Overall Equipment Effectiveness</h5>
                                <h2 class="mb-0 fw-bold text-white">${oeeOverall.toFixed(1)}%</h2>
                                <span class="badge bg-light text-dark mt-2">${getOEELabel(oeeOverall)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Additional Information -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title text-secondary mb-3">
                                <i class="bi bi-info-square me-2"></i>ข้อมูลเพิ่มเติม
                            </h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-muted">สาเหตุการหยุดเครื่อง:</h6>
                                    <p class="mb-3">${item.DowntimeReason || 'ไม่มีการหยุดเครื่อง'}</p>
                                    
                                    <h6 class="text-muted">หมายเหตุ:</h6>
                                    <p class="mb-0">${item.Notes || 'ไม่มีหมายเหตุ'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">ข้อมูลเทคนิค:</h6>
                                    <ul class="list-unstyled">
                                        <li><strong>อัตราการผลิตมาตรฐาน:</strong> ${item.IdealRunRate || 'ไม่ระบุ'} ชิ้น/ชั่วโมง</li>
                                        <li><strong>เวอร์ชันแปลน:</strong> ${item.PlanVersion || 'ไม่ระบุ'}</li>
                                        <li><strong>อัปเดตล่าสุด:</strong> ${item.LastUpdated ? formatDateTime(new Date(item.LastUpdated)) : 'ไม่ระบุ'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * ดึง CSS class สำหรับ progress bar ตาม metric type
 */
function getProgressBarClass(value, type) {
    switch (type) {
        case 'performance':
            if (value >= 90) return 'bg-success';
            if (value >= 70) return 'bg-warning';
            return 'bg-danger';
        case 'quality':
            if (value >= 95) return 'bg-success';
            if (value >= 85) return 'bg-warning';
            return 'bg-danger';
        case 'availability':
            if (value >= 85) return 'bg-success';
            if (value >= 70) return 'bg-warning';
            return 'bg-danger';
        default:
            return 'bg-primary';
    }
}

/**
 * ฟังก์ชันช่วยเหลือเพิ่มเติมสำหรับ Modal
 */
function getShiftInfo(timeString) {
    if (!timeString) return 'ไม่ระบุ';
    
    const hour = new Date(timeString).getHours();
    if (hour >= 8 && hour < 16) return 'กะเช้า (08:00-16:00)';
    if (hour >= 16 && hour < 24) return 'กะบ่าย (16:00-24:00)';
    return 'กะดึก (00:00-08:00)';
}

function calculateDurationSimple(startTime, endTime) {
    if (!startTime || !endTime) return '-';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    if (diffMs <= 0) return '-';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ชม. ${minutes} นาที`;
}

function getMetricColor(value, type) {
    const thresholds = {
        availability: { excellent: 85, good: 70 },
        performance: { excellent: 90, good: 70 },
        quality: { excellent: 95, good: 85 }
    };
    
    const threshold = thresholds[type] || thresholds.availability;
    
    if (value >= threshold.excellent) return 'text-success';
    if (value >= threshold.good) return 'text-warning';
    return 'text-danger';
}

/**
 * ฟังก์ชันยูทิลิตี้เพิ่มเติม
 */

/**
 * คำนวณจำนวนชั่วโมงระหว่าง 2 เวลา
 */
function calculateWorkingHours(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
}

/**
 * ฟอร์แมตวันที่แบบไทย
 */
function formatDateThai(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    
    return date.toLocaleDateString('th-TH', options);
}

/**
 * ฟอร์แมตเวลา
 */
function formatTime(timeString) {
    if (!timeString) return '-';
    
    const date = new Date(timeString);
    return date.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
}

/**
 * แสดง Pagination Controls
 */
function renderPaginationControls() {
    // TODO: Add pagination UI if needed
    if (totalPages <= 1) return;
    
    console.log(`Pagination: Page ${currentPage} of ${totalPages}`);
}

// ================================================================
// 10. LEGACY UTILITY FUNCTIONS (เก็บไว้เพื่อ compatibility)
// ================================================================

/**
 * จัดรูปแบบตัวเลข (รองรับเดิม)
 */
function formatNumber(num) {
    if (typeof num !== 'number') {
        num = parseInt(num) || 0;
    }
    return num.toLocaleString('th-TH');
}

/**
 * จัดรูปแบบวันที่แบบง่าย (รองรับเดิม)
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
 * คำนวณระยะเวลาดำเนินการแบบง่าย (รองรับเดิม)
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
 * จัดรูปแบบวันที่ (รองรับเดิม)
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
 * จัดรูปแบบเวลา (รองรับเดิม)
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * คำนวณระยะเวลาดำเนินการ (รองรับเดิม)
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
 * แสดง Toast notification (ปรับปรุงใหม่)
 */
function showToast(message, type = 'success') {
    // สร้าง toast container
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }
    
    // สร้าง toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-${getToastIcon(type)} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toastEl);
    
    // แสดง toast
    const toast = new bootstrap.Toast(toastEl, { 
        autohide: type !== 'error',
        delay: type === 'error' ? 10000 : 3000 
    });
    toast.show();
    
    // ลบ element หลังซ่อน
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * ดึงไอคอนสำหรับ toast
 */
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-triangle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// ================================================================
// EXPORT FUNCTIONS - เพิ่มใหม่
// ================================================================

/**
 * Export ข้อมูลปัจจุบันเป็น Excel
 */
function exportToExcel() {
    const allData = filteredData.length > 0 ? filteredData : historyData;
    
    const jsonData = allData.map((item, index) => ({
        'ลำดับ': index + 1,
        'วันที่ผลิต': item.ProductionDate || item.ConfirmedAt || '-',
        'เวลาเริ่ม': item.ActualStartTime || '-',
        'เวลาสิ้นสุด': item.ActualEndTime || '-',
        'แผนก': item.Department || item.DepartmentName || '-',
        'เครื่องจักร': item.MachineName || '-',
        'ผลิตภัณฑ์': item.ProductName || '-',
        'รหัสสินค้า': item.ProductCode || '-',
        'ขนาด': item.ProductSize || '-',
        'รหัสล็อต': item.LotNumber || '-',
        'ขนาดล็อต': item.LotSize || 0,
        'ผลิตจริง': item.TotalPieces || 0,
        'ของดี': item.GoodQuantity || 0,
        'ของเสีย': item.RejectPieces || 0,
        'เวลาทำงาน (ชม.)': item.WorkingHours || 0,
        'เวลาหยุด (นาที)': item.DowntimeMinutes || 0,
        'OEE Availability (%)': item.OEE_Availability || 0,
        'OEE Performance (%)': item.OEE_Performance || 0,
        'OEE Quality (%)': item.OEE_Quality || 0,
        'OEE Overall (%)': item.OEE_Overall || 0,
        'หมายเหตุ': item.Notes || '-'
    }));

    // ใช้วิธีการสร้าง CSV เมื่อไม่มี XLSX library
    if (typeof XLSX === 'undefined') {
        exportToCSV(jsonData);
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ข้อมูลประวัติการผลิต");
    
    const filename = `OEE_History_${formatDateForFilename(new Date())}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    showToast(`ส่งออกข้อมูล ${allData.length} รายการเป็น Excel สำเร็จ`, 'success');
}

/**
 * Export เป็น CSV เมื่อไม่มี XLSX library
 */
function exportToCSV(data) {
    if (!data || data.length === 0) {
        showToast('ไม่มีข้อมูลให้ส่งออก', 'warning');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(field => `"${row[field]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `OEE_History_${formatDateForFilename(new Date())}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`ส่งออกข้อมูล ${data.length} รายการเป็น CSV สำเร็จ`, 'success');
}

/**
 * Export ข้อมูลปัจจุบันเป็น PDF
 */
function exportToPDF() {
    const allData = filteredData.length > 0 ? filteredData : historyData;
    
    // ตรวจสอบ jsPDF library
    if (typeof window.jspdf === 'undefined') {
        // Fallback: สร้าง PDF ด้วยวิธี window.print
        printData();
        return;
    }
    
    // สร้าง jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // ตั้งค่าฟอนต์สำหรับภาษาไทย (ใช้ภาษาอังกฤษแทน)
    doc.setFont("helvetica");
    
    // หัวข้อ
    doc.setFontSize(16);
    doc.text('OEE Factory History Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${formatDateTime(new Date())}`, 20, 30);
    doc.text(`Total Records: ${allData.length}`, 20, 40);
    
    // สร้างตาราง
    const headers = [
        'Date', 'Department', 'Machine', 'Product', 'Lot Size', 
        'Produced', 'Good', 'Reject', 'OEE (%)'
    ];
    
    const data = allData.slice(0, 50).map(item => [ // จำกัดที่ 50 รายการ
        item.ProductionDate ? formatDateShort(item.ProductionDate) : '-',
        item.Department || item.DepartmentName || '-',
        (item.MachineName || '').substring(0, 15), // จำกัดความยาว
        (item.ProductName || '').substring(0, 20),
        item.LotSize || 0,
        item.TotalPieces || 0,
        item.GoodQuantity || 0,
        item.RejectPieces || 0,
        (parseFloat(item.OEE_Overall) || 0).toFixed(1)
    ]);
    
    // เพิ่มตารางโดยใช้ autoTable (ถ้ามี)
    if (typeof doc.autoTable !== 'undefined') {
        doc.autoTable({
            head: [headers],
            body: data,
            startY: 50,
            theme: 'striped',
            styles: {
                fontSize: 8,
                cellPadding: 2
            }
        });
        
        // เพิ่มสถิติ
        const stats = calculateStatsSimple(allData);
        const finalY = doc.lastAutoTable.finalY + 20;
        
        doc.setFontSize(10);
        doc.text('Summary Statistics:', 20, finalY);
        doc.text(`Average OEE: ${stats.avgOEE.toFixed(1)}%`, 20, finalY + 10);
        doc.text(`Total Production: ${formatNumber(stats.totalProduction)} pieces`, 20, finalY + 20);
        doc.text(`Total Good Quality: ${formatNumber(stats.totalGoodQuantity)} pieces`, 20, finalY + 30);
    } else {
        // Fallback: แสดงข้อความธรรมดา
        doc.setFontSize(10);
        let yPos = 60;
        data.slice(0, 20).forEach((row, index) => {
            doc.text(`${index + 1}. ${row.join(' | ')}`, 20, yPos);
            yPos += 10;
        });
    }
    
    const filename = `OEE_Report_${formatDateForFilename(new Date())}.pdf`;
    doc.save(filename);
    
    showToast(`ส่งออกรายงาน PDF สำเร็จ (${Math.min(allData.length, 50)} รายการ)`, 'success');
}

/**
 * พิมพ์ข้อมูล
 */
function printData() {
    const currentData = filteredData.length > 0 ? filteredData : historyData;
    
    // สร้างหน้าต่างใหม่สำหรับพิมพ์
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintContent(currentData);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // รอให้โหลดเสร็จแล้วพิมพ์
    printWindow.onload = function() {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
    };
    
    showToast('เปิดหน้าต่างพิมพ์', 'info');
}

/**
 * สร้างเนื้อหาสำหรับพิมพ์
 */
function generatePrintContent(data) {
    const stats = calculateStatsSimple(data);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>OEE Factory History Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header p { color: #7f8c8d; margin: 5px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; text-align: center; }
        .stat-item { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .oee-excellent { color: #28a745; font-weight: bold; }
        .oee-good { color: #17a2b8; font-weight: bold; }
        .oee-fair { color: #ffc107; font-weight: bold; }
        .oee-poor { color: #dc3545; font-weight: bold; }
        @media print {
            body { margin: 0; }
            .header { margin-bottom: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>OEE Factory History Report</h1>
        <p>Generated on: ${formatDateTime(new Date())}</p>
        <p>Total Records: ${data.length}</p>
    </div>
    
    <div class="stats">
        <div class="stat-item">
            <h3>Average OEE</h3>
            <p class="${getOEEColorClassSimple(stats.avgOEE)}">${stats.avgOEE.toFixed(1)}%</p>
        </div>
        <div class="stat-item">
            <h3>Total Production</h3>
            <p>${formatNumber(stats.totalProduction)} pieces</p>
        </div>
        <div class="stat-item">
            <h3>Quality Rate</h3>
            <p>${stats.qualityRate.toFixed(1)}%</p>
        </div>
        <div class="stat-item">
            <h3>Availability</h3>
            <p>${stats.avgAvailability.toFixed(1)}%</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Machine</th>
                <th>Product</th>
                <th class="text-right">Lot Size</th>
                <th class="text-right">Produced</th>
                <th class="text-right">Good</th>
                <th class="text-right">Reject</th>
                <th class="text-center">OEE %</th>
            </tr>
        </thead>
        <tbody>
            ${data.slice(0, 100).map(item => `
                <tr>
                    <td>${item.ProductionDate ? formatDateShort(item.ProductionDate) : '-'}</td>
                    <td>${item.Department || item.DepartmentName || '-'}</td>
                    <td>${item.MachineName || '-'}</td>
                    <td>${item.ProductName || '-'}</td>
                    <td class="text-right">${formatNumber(item.LotSize || 0)}</td>
                    <td class="text-right">${formatNumber(item.TotalPieces || 0)}</td>
                    <td class="text-right">${formatNumber(item.GoodQuantity || 0)}</td>
                    <td class="text-right">${formatNumber(item.RejectPieces || 0)}</td>
                    <td class="text-center ${getOEEColorClassSimple(parseFloat(item.OEE_Overall) || 0)}">
                        ${(parseFloat(item.OEE_Overall) || 0).toFixed(1)}%
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    ${data.length > 100 ? `<p style="text-align: center; margin-top: 20px; color: #666;">แสดงเพียง 100 รายการแรก จากทั้งหมด ${data.length} รายการ</p>` : ''}
</body>
</html>
    `;
}

/**
 * ฟังก์ชันช่วยเหลือสำหรับ Export
 */
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function getOEEColorClassSimple(oee) {
    if (oee >= 85) return 'oee-excellent';
    if (oee >= 65) return 'oee-good';
    if (oee >= 40) return 'oee-fair';
    return 'oee-poor';
}

function calculateStatsSimple(data) {
    const totalRecords = data.length;
    const totalProduction = data.reduce((sum, item) => sum + (parseInt(item.TotalPieces) || 0), 0);
    const totalGoodQuantity = data.reduce((sum, item) => sum + (parseInt(item.GoodQuantity) || 0), 0);
    const totalOEE = data.reduce((sum, item) => sum + (parseFloat(item.OEE_Overall) || 0), 0);
    const totalAvailability = data.reduce((sum, item) => sum + (parseFloat(item.OEE_Availability) || 0), 0);
    
    const avgOEE = totalRecords > 0 ? totalOEE / totalRecords : 0;
    const qualityRate = totalProduction > 0 ? (totalGoodQuantity / totalProduction) * 100 : 0;
    const avgAvailability = totalRecords > 0 ? totalAvailability / totalRecords : 0;
    
    return {
        totalRecords,
        totalProduction,
        totalGoodQuantity,
        avgOEE,
        qualityRate,
        avgAvailability
    };
}

// ================================================================
// END OF ENHANCED HISTORY PAGE
// ================================================================

console.log('Enhanced History page script loaded successfully - Version 3.0.0');

