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
    
    // เริ่มต้น Bootstrap tooltips
    initializeTooltips();
    
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

/**
 * เริ่มต้น Bootstrap tooltips
 */
function initializeTooltips() {
    // เริ่มต้น tooltips สำหรับ filter elements
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            placement: 'top',
            trigger: 'hover focus',
            delay: { show: 500, hide: 100 }
        });
    });
    
    console.log('Tooltips initialized:', tooltipList.length);
}

// ================================================================
// 3. ENHANCED DATA LOADING
// ================================================================

/**
 * ตั้งค่าช่วงวันที่เริ่มต้น
 */
function setupDefaultDateRange() {
    // ไม่กำหนดวันที่เริ่มต้น เพื่อแสดงข้อมูลทั้งหมดโดยไม่มีการกรอง
    document.getElementById('dateFromFilter').value = '';
    document.getElementById('dateToFilter').value = '';
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
        console.log('📊 Loading history data...');
        
        // เรียก API เพื่อดึงข้อมูลประวัติงานที่เสร็จสิ้นแล้ว
        const response = await fetch('tasks.php?action=get_completed_plans');
        
        if (!response.ok) {
            // อ่าน response text เพื่อ debug
            const errorText = await response.text();
            console.error('❌ HTTP Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText.substring(0, 200)}`);
        }
        
        // อ่าน response เป็น text ก่อน
        const responseText = await response.text();
        console.log('🔍 Raw response:', responseText.substring(0, 500));
        
        // ตรวจสอบว่าเป็น JSON หรือไม่
        if (!responseText.trim()) {
            throw new Error('Empty response from server');
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('❌ Raw response causing error:', responseText);
            throw new Error(`Invalid JSON response: ${parseError.message}\nResponse preview: ${responseText.substring(0, 100)}...`);
        }
        
        console.log('📋 Parsed history data:', data);
        
        if (Array.isArray(data)) {
            historyData = data;
            console.log(`✅ Loaded ${historyData.length} completed plans`);
            
            // สร้างข้อมูลอ้างอิงจากข้อมูลจริง
            extractReferenceData();
            
            // อัปเดต filter options
            updateAllFilterOptions();
            
        } else if (data && data.success === false) {
            console.error('❌ API returned error:', data.message || 'Unknown error');
            historyData = [];
            throw new Error(data.message || 'API returned error');
        } else if (data && Array.isArray(data.data)) {
            // บางครั้งข้อมูลจะอยู่ใน data.data
            historyData = data.data;
            console.log(`✅ Loaded ${historyData.length} completed plans from data.data`);
            
            extractReferenceData();
            updateAllFilterOptions();
        } else {
            console.error('❌ Data is not an array:', data);
            historyData = [];
            throw new Error('Invalid data format received from API');
        }
        
    } catch (error) {
        console.error('💥 Error loading history data:', error);
        historyData = [];
        showError(`ไม่สามารถโหลดข้อมูลประวัติได้: ${error.message}`);
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
    // Debug: ดูโครงสร้างข้อมูลตัวอย่าง
    if (historyData.length > 0) {
        console.log('Sample data structure:', historyData[0]);
        console.log('Available fields:', Object.keys(historyData[0]));
    }
    
    // รายการแผนกที่ถูกต้องในระบบ (ชื่อแผนกจริงๆ จากฐานข้อมูล)
    const validDepartments = [
        'แผนกผลิต', 'แผนกบรรจุ', 'แผนกควบคุมคุณภาพ', 'แผนกโลจิสติกส์', 'แผนกบำรุงรักษา',
        'แผนกกรรม', 'แผนกขึ้นรูป', 'แผนกสี', 'แผนกตรวจสอบ', 'แผนกส่งมอบ',
        'แผนกกรอง&Mix', 'แผนกบรรุ', 'แผนกเลเชอร์', // เพิ่มชื่อแผนกจริงที่มีในฐานข้อมูล
        'Production', 'Packaging', 'Quality Control', 'QC', 'Logistics', 'Maintenance',
        'Manufacturing', 'Assembly', 'Inspection', 'Shipping', 'Warehouse'
    ];
    
    // สร้างรายการแผนกทั้งหมด - ยอมรับทุกชื่อแผนกที่มีในฐานข้อมูล (ไม่กรอง)
    const departmentFields = historyData.map(item => {
        const dept = item.Department || item.DepartmentName || '';
        if (dept && dept.trim().length > 0) {
            return dept.trim();
        }
        return null;
    }).filter(dept => dept !== null);
    
    // แสดงข้อมูลดิบก่อนกรองเพื่อ debug
    const uniqueDepts = [...new Set(departmentFields)];
    console.log('All departments from database (raw):', uniqueDepts);
    
    // ตอนนี้ไม่กรองอะไรเลย - ใช้ทุกชื่อแผนกที่มีจริงในฐานข้อมูล
    allDepartments = uniqueDepts.sort();
    
    // สร้างรายการเครื่องจักรทั้งหมด
    const machineFields = historyData.map(item => {
        const machine = item.MachineName || '';
        if (machine && machine.length > 0) {
            return machine.trim();
        }
        return null;
    }).filter(machine => machine !== null);
    
    allMachines = [...new Set(machineFields)].sort();
    
    // สร้างรายการผลิตภัณฑ์ทั้งหมด
    const productFields = historyData.map(item => {
        const product = item.ProductName || item.ProductDisplayName || '';
        if (product && product.length > 0) {
            return product.trim();
        }
        return null;
    }).filter(product => product !== null);
    
    allProducts = [...new Set(productFields)].sort();
    
    console.log('Extracted reference data:', {
        departments: allDepartments,
        machines: allMachines.slice(0, 5), // แสดงแค่ 5 ตัวแรก
        products: allProducts.slice(0, 5)  // แสดงแค่ 5 ตัวแรก
    });
    
    console.log('Summary counts:', {
        departments: allDepartments.length,
        machines: allMachines.length,
        products: allProducts.length
    });
    
    // Debug: แสดงข้อมูลแผนกแต่ละรายการที่ถูกกรอง
    console.log('=== DEPARTMENT DEBUG INFO ===');
    console.log('Valid departments found:', allDepartments);
    
    // แสดงข้อมูลดิบที่ถูกปฏิเสธ
    const rejectedDepts = historyData.map(item => {
        const dept = item.Department || item.DepartmentName || '';
        return dept ? dept.trim() : null;
    }).filter(dept => dept && !allDepartments.includes(dept));
    
    const uniqueRejected = [...new Set(rejectedDepts)];
    if (uniqueRejected.length > 0) {
        console.log('Rejected departments (not valid):', uniqueRejected);
    }
    console.log('=== END DEPARTMENT DEBUG ===');
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
        const itemMachine = (item.MachineName || item.machine || '').trim();
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
                <td colspan="13" class="text-center text-muted py-5">
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
 * สร้างแถวสำหรับตารางประวัติ (ออกแบบใหม่ - Modern & Clean)
 */
function createEnhancedHistoryRow(item, index) {
    const globalIndex = (currentPage - 1) * recordsPerPage + index;
    
    // ข้อมูลหลัก
    const productName = item.ProductName || item.ProductDisplayName || 'ไม่ระบุ';
    const productCode = item.ProductCode || '-';
    const productSize = item.ProductSize || '-';
    const department = item.Department || item.DepartmentName || 'ไม่ระบุ';
    const subdepartment = item.Subdepartment || '-';
    const machineName = item.MachineName || 'ไม่ระบุ';
    const productionDate = item.ProductionDate || '';
    
    // ข้อมูลการผลิต
    const lotNumber = item.LotNumber || '-';
    const lotSize = parseInt(item.LotSize) || 0;
    const totalPieces = parseInt(item.TotalPieces) || 0;
    const goodQuantity = parseInt(item.GoodQuantity) || 0;
    const rejectPieces = parseInt(item.RejectPieces) || 0;
    const reworkPieces = parseInt(item.ReworkPieces) || 0;
    const remark = item.Remark || '-';
    
    // เวลาการผลิต
    const actualStartTime = item.ActualStartTime || '';
    const actualEndTime = item.ActualEndTime || '';
    const workingHours = parseFloat(item.WorkingHours) || 0;
    
    // OEE Metrics
    const oeeAvailability = parseFloat(item.OEE_Availability) || 0;
    const oeePerformance = parseFloat(item.OEE_Performance) || 0;
    const oeeQuality = parseFloat(item.OEE_Quality) || 0;
    const oeeOverall = parseFloat(item.OEE_Overall) || 0;
    
    // การคำนวณเพิ่มเติม
    const yieldRate = totalPieces > 0 ? ((goodQuantity / totalPieces) * 100) : 0;
    const efficiency = lotSize > 0 ? ((totalPieces / lotSize) * 100) : 0;
    const reworkRate = totalPieces > 0 ? ((reworkPieces / totalPieces) * 100) : 0;
    
    return `
        <tr onclick="showItemDetails(${globalIndex})">
            <!-- วันที่ -->
            <td class="text-center">
                <div class="fw-bold text-primary" style="font-size: 0.9rem;">
                    ${productionDate ? formatDateThai(productionDate) : '-'}
                </div>
            </td>
            
            <!-- สินค้า -->
            <td class="product-cell">
                <div class="product-name">${productName}</div>
                <div class="product-badges">
                    ${productCode !== '-' ? `<span class="product-badge">รหัส: ${productCode}</span>` : ''}
                    ${productSize !== '-' ? `<span class="product-badge">ขนาด: ${productSize}</span>` : ''}
                </div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-info" style="width: ${Math.min(efficiency, 100)}%" 
                         title="ประสิทธิภาพ: ${efficiency.toFixed(1)}%"></div>
                </div>
            </td>
            
            <!-- แผนก -->
            <td class="department-cell">
                <div class="department-main">${department}</div>
                ${subdepartment !== '-' ? `<div class="department-sub">${subdepartment}</div>` : ''}
            </td>
            
            <!-- เครื่องจักร -->
            <td class="machine-cell">
                <div class="machine-name">${machineName}</div>
            </td>
            
            <!-- รหัสล็อต -->
            <td class="text-center">
                <code class="bg-light p-2 rounded fw-bold" style="font-size: 0.8rem;">${lotNumber}</code>
            </td>
            
            <!-- ขนาดล็อต -->
            <td class="data-cell-modern data-cell-target">
                <div class="data-value data-value-target">${formatNumber(lotSize)}</div>
                <div class="data-label">ล๊อต</div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-primary" style="width: 100%"></div>
                </div>
            </td>
            
            <!-- ผลิตได้ -->
            <td class="data-cell-modern data-cell-produced">
                <div class="data-value data-value-produced">${formatNumber(totalPieces)}</div>
                <div class="data-label">ชิ้น</div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-info" style="width: ${Math.min(efficiency, 100)}%" 
                         title="${efficiency.toFixed(1)}% ของเป้าหมาย"></div>
                </div>
            </td>
            
            <!-- ของดี -->
            <td class="data-cell-modern data-cell-good">
                <div class="data-value data-value-good">${formatNumber(goodQuantity)}</div>
                <div class="data-label">ชิ้น</div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-success" style="width: ${yieldRate}%"></div>
                </div>
            </td>
            
            <!-- ของเสีย -->
            <td class="data-cell-modern data-cell-reject">
                <div class="data-value data-value-reject">${formatNumber(rejectPieces)}</div>
                <div class="data-label">ชิ้น</div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-danger" style="width: ${100 - yieldRate}%"></div>
                </div>
            </td>
            
            <!-- แก้ไข (Rework) -->
            <td class="data-cell-modern data-cell-rework">
                <div class="data-value data-value-rework">${formatNumber(reworkPieces)}</div>
                <div class="data-label">ชิ้น</div>
                <div class="data-progress">
                    <div class="data-progress-bar bg-warning" style="width: ${reworkRate}%"></div>
                </div>
            </td>
            
            <!-- OEE -->
            <td class="oee-cell">
                <div class="oee-metrics">
                    <div class="oee-metric">
                        <div class="oee-metric-value ${getMetricColor(oeeAvailability, 'availability')}">${oeeAvailability.toFixed(1)}%</div>
                        <div class="oee-metric-label">ความพร้อม</div>
                    </div>
                    <div class="oee-metric">
                        <div class="oee-metric-value ${getMetricColor(oeePerformance, 'performance')}">${oeePerformance.toFixed(1)}%</div>
                        <div class="oee-metric-label">ประสิทธิภาพ</div>
                    </div>
                    <div class="oee-metric">
                        <div class="oee-metric-value ${getMetricColor(oeeQuality, 'quality')}">${oeeQuality.toFixed(1)}%</div>
                        <div class="oee-metric-label">คุณภาพ</div>
                    </div>
                </div>
                <div class="oee-overall">
                    <div class="oee-overall-value">${oeeOverall.toFixed(1)}%</div>
                    <span class="oee-badge-modern ${getOEEBadgeClass(oeeOverall)}">${getOEELabel(oeeOverall)}</span>
                </div>
            </td>
            
            <!-- เวลา -->
            <td class="time-cell">
                <div class="time-duration">${calculateDurationSimple(actualStartTime, actualEndTime)}</div>
                <div class="time-hours">${workingHours.toFixed(1)} ชั่วโมง</div>
                ${actualStartTime && actualEndTime ? `
                    <div class="time-range">
                        ${formatTime(actualStartTime)} - ${formatTime(actualEndTime)}
                    </div>
                ` : ''}
                <div class="data-progress">
                    <div class="data-progress-bar bg-secondary" style="width: ${Math.min((workingHours / 8) * 100, 100)}%"></div>
                </div>
            </td>
            
            <!-- หมายเหตุ -->
            <td class="remark-cell">
                ${remark !== '-' ? `
                    <div class="remark-text">
                        <i class="bi bi-chat-text me-1"></i>
                        ${remark.substring(0, 100)}${remark.length > 100 ? '...' : ''}
                    </div>
                ` : '<span class="text-muted">-</span>'}
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
    const uniqueMachines = new Set(filteredData.map(item => item.MachineName).filter(m => m)).size;
    
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
    select.innerHTML = '<option value="">ทุกแผนก (มีประวัติ)</option>';
    
    // ตรวจสอบว่ามีข้อมูลแผนกที่ถูกต้องหรือไม่
    if (allDepartments.length === 0) {
        select.innerHTML += '<option value="" disabled>ไม่มีข้อมูลแผนก</option>';
        return;
    }
    
    allDepartments.forEach(dept => {
        // นับจำนวนงานที่เสร็จในแผนกนี้
        const count = historyData.filter(item => {
            const itemDept = item.Department || item.DepartmentName || '';
            return itemDept.trim() === dept;
        }).length;
        
        // แสดงเฉพาะแผนกที่มีงานเสร็จแล้ว
        if (count > 0) {
            select.innerHTML += `<option value="${dept}">${dept} (${count})</option>`;
        }
    });
    
    select.value = currentValue; // คงค่าเดิมไว้
    console.log('Department filter updated:', allDepartments.length, 'valid departments found');
    console.log('Valid departments:', allDepartments);
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
            (item.MachineName || '').trim() === machine
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
 * อัปเดตจำนวนรายการในตัวกรอง - Enhanced UX
 */
function updateFilterCounts() {
    updateElementCount('departmentCount', allDepartments.length);
    updateElementCount('machineCount', allMachines.length);
    updateElementCount('productCount', allProducts.length);
    updateElementCount('filterCount', `${filteredData.length} รายการ`);
    
    // อัปเดต Summary Panel
    updateElementCount('activeDepartmentCount', allDepartments.length);
    updateElementCount('activeMachineCount', allMachines.length);
    updateElementCount('activeProductCount', allProducts.length);
    updateElementCount('totalFilterCount', `${filteredData.length} รายการ`);
    
    // อัปเดตจำนวนรวม (สำหรับแสดง "จาก X รายการ")
    updateTotalCounts();
}

/**
 * อัปเดตจำนวนรวมของแต่ละประเภท
 */
function updateTotalCounts() {
    // สมมุติว่าในระบบมีจำนวนรวมมากกว่าที่มีประวัติ
    // ในอนาคตสามารถดึงจาก API แยกต่างหาก
    const totalDepartmentsInSystem = Math.max(allDepartments.length, allDepartments.length + 2); // แสดงว่าอาจมีแผนกเพิ่ม
    const totalMachinesInSystem = Math.max(allMachines.length, allMachines.length + 5); // แสดงว่าอาจมีเครื่องเพิ่ม
    const totalProductsInSystem = Math.max(allProducts.length, allProducts.length + 10); // แสดงว่าอาจมีสินค้าเพิ่ม
    
    updateElementCount('totalDepartments', totalDepartmentsInSystem);
    updateElementCount('totalMachines', totalMachinesInSystem);
    updateElementCount('totalProducts', totalProductsInSystem);
    
    // แสดงสถิติการครอบคลุม
    console.log('Filter Coverage:', {
        departments: `${allDepartments.length}/${totalDepartmentsInSystem}`,
        machines: `${allMachines.length}/${totalMachinesInSystem}`,
        products: `${allProducts.length}/${totalProductsInSystem}`
    });
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
                <td colspan="13" class="text-center py-5">
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
                <td colspan="13" class="text-center py-5">
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
    if (oee >= 60) return 'oee-good';
    return 'oee-poor';
}

/**
 * ดึง CSS class สำหรับ badge OEE
 */
function getOEEBadgeClass(oee) {
    if (oee >= 85) return 'bg-success';
    if (oee >= 60) return 'bg-warning';
    return 'bg-danger';
}

/**
 * ดึงข้อความ label สำหรับ OEE
 */
function getOEELabel(oee) {
    if (oee >= 85) return 'ดีเยี่ยม';
    if (oee >= 60) return 'ปานกลางถึงดี';
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
    const plannedEndTime = item.PlannedEndTime || '-';
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
                                                <td class="fw-bold">แผนกย่อย:</td>
                                                <td><span class="badge bg-secondary">${item.SubdepartmentName || item.Subdepartment || '-'}</span></td>
                                            </tr>
                                
                                            <tr>
                                                <td class="fw-bold">เครื่องจักร:</td>
                                                <td><span class="badge bg-success">${item.MachineName || 'ไม่ระบุ'}</span></td>
                                            </tr>
                                            <tr>
                                                <td class="fw-bold">สถานะงาน:</td>
                                                <td><span class="badge bg-success">เสร็จสิ้น</span></td>
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
                                <div class="col-md-3">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาเริ่มต้น (วางแผน)</h6>
                                        <div class="fs-5 fw-bold text-primary">
                                            ${item.PlannedStartTime ? formatTime(item.PlannedStartTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาสิ้นสุด (วางแผน)</h6>
                                        <div class="fs-5 fw-bold text-warning">
                                            ${plannedEndTime ? formatTime(plannedEndTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center p-3 bg-light rounded">
                                        <h6 class="text-muted">เวลาเริ่มต้น (จริง)</h6>
                                        <div class="fs-5 fw-bold text-info">
                                            ${actualStartTime ? formatTime(actualStartTime) : '-'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-3">
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
                                        <td class="fw-bold">ขนาดล็อต:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-primary">${formatNumber(lotSize)}</span> ล๊อต
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ผลิตได้จริง:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-info">${formatNumber(totalPieces)}</span> ชิ้น
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ของดี:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-success">${formatNumber(goodQuantity)}</span> ชิ้น
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">ของเสีย:</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-danger">${formatNumber(rejectPieces)}</span> ชิ้น
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">จำนวนแก้ไข (Rework):</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-warning">${typeof item.ReworkPieces !== 'undefined' ? formatNumber(item.ReworkPieces) : '-'}</span> ชิ้น
                                        </td>
                                    </tr>
                                    <tr>
                                        <td class="fw-bold">หมายเหตุ (Remark):</td>
                                        <td class="text-end">
                                            <span class="fw-bold text-info">${item.Remark || '-'}</span>
                                        </td>
                                    </tr>
                                </table>
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
                                    <h6 class="text-muted">เวลาหยุดเครื่อง:</h6>
                                    <p class="mb-3 text-danger fw-bold">${downtimeMinutes} นาที</p>
                                </div>
                                <div class="col-md-6">
                                     <h6 class="text-muted">สาเหตุการหยุดเครื่อง:</h6>
                                    <p class="mb-3">${item.DowntimeReason || 'ไม่มีการหยุดเครื่อง'}</p>
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
 * จัดรูปแบบวันที่สำหรับ Excel (DD/MM/YYYY)
 */
function formatDateForExcel(dateString) {
    if (!dateString || dateString === '-' || dateString === '') return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // ถ้าไม่ใช่วันที่ให้คืนค่าเดิม
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.warn('Error formatting date:', dateString, error);
        return dateString;
    }
}

/**
 * จัดรูปแบบวันที่และเวลาสำหรับ Excel (DD/MM/YYYY HH:MM)
 */
function formatDateTimeForExcel(dateString) {
    if (!dateString || dateString === '-' || dateString === '') return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.warn('Error formatting datetime:', dateString, error);
        return dateString;
    }
}
/**
 * Export ข้อมูลปัจจุบันเป็น Excel - ตรงกับโครงสร้างฐานข้อมูล ProductionResults (ปรับปรุงใหม่)
 */
function exportToExcel() {
    const allData = filteredData.length > 0 ? filteredData : historyData;
    
    if (!allData || allData.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
        return;
    }
    
    // แปลงข้อมูลและจัดรูปแบบวันที่ให้ถูกต้อง - จัดเรียงฟิลด์ตามลำดับที่อ่านง่าย
    const jsonData = allData.map((item) => ({
        // === ข้อมูลแผนงาน ===
        'Plan ID': item.PlanID || '-',
        'Order Number': item.OrderNumber || '-',
        'Production Date': formatDateForExcel(item.ProductionDate),
        
        // === ข้อมูลผลิตภัณฑ์ ===
        'Product Name': item.ProductName || '-',
        'Product Size': item.ProductSize || '-',
        
        // === ข้อมูลแผนกและเครื่องจักร ===
        'Department': item.Department || '-',
        'Subdepartment': item.Subdepartment || '-', // ✅ เพิ่มใหม่
        'Machine Name': item.MachineName || '-',
        
        // === เวลาการผลิต ===
        'Planned Start': formatDateTimeForExcel(item.PlannedStartTime),
        'Planned End': formatDateTimeForExcel(item.PlannedEndTime),
        'Start Time': formatDateTimeForExcel(item.ActualStartTime),
        'End Time': formatDateTimeForExcel(item.ActualEndTime),
        'Shift Hours': parseFloat(item.ShiftHours) || 0,
        'Overtime (Min)': parseInt(item.OvertimeMinutes) || 0,
        
        // === เวลาพัก ===
        'Morning Break (Min)': parseInt(item.BreakMorningMinutes) || 0,
        'Lunch Break (Min)': parseInt(item.BreakLunchMinutes) || 0,
        'Evening Break (Min)': parseInt(item.BreakEveningMinutes) || 0,
        'Total Break (Min)': parseInt(item.TotalBreakMinutes) || 0,
        
        // === เวลาหยุดเครื่อง ===
        'Downtime (Min)': parseInt(item.DowntimeMinutes) || 0,
        'Downtime Reason': item.DowntimeReason || '-',
        
        // === เวลาทำงาน ===
        'Planned Work (Min)': parseInt(item.PlannedWorkMinutes) || 0,
        'Active Work (Min)': parseInt(item.ActiveWorkMinutes) || 0,
        'Working Hours': parseFloat(item.WorkingHours) || 0,
        
        // === จำนวนผลิต ===
        'Total Pieces': parseInt(item.TotalPieces) || 0,
        'Good Quantity': parseInt(item.GoodQuantity) || 0,
        'Reject Pieces': parseInt(item.RejectPieces) || 0,
        'Rework Pieces': parseInt(item.ReworkPieces) || 0, // ✅ เพิ่มใหม่
        'Remark': item.Remark || '-', // ✅ เพิ่มใหม่
        
        // === อัตราการผลิต ===
        'Standard Rate': parseFloat(item.StandardRunRate) || 0,
        'Actual Rate': parseFloat(item.ActualRunRate) || 0,
        
        // === OEE (%) ===
        'Availability (%)': parseFloat(item.OEE_Availability) || 0,
        'Performance (%)': parseFloat(item.OEE_Performance) || 0,
        'Quality (%)': parseFloat(item.OEE_Quality) || 0,
        'Overall OEE (%)': parseFloat(item.OEE_Overall) || 0,
        
        // === ข้อมูลการยืนยัน ===
        'Status': item.Status || '-',
        'Confirmed At': formatDateTimeForExcel(item.ConfirmedAt),
        'Confirmed By': item.ConfirmedByUserName || '-',
        'Result ID': item.ResultID || '-'
    }));

    // ใช้วิธีการสร้าง CSV เมื่อไม่มี XLSX library
    if (typeof XLSX === 'undefined') {
        exportToCSV(jsonData);
        return;
    }

    try {
        const worksheet = XLSX.utils.json_to_sheet(jsonData);
        
        // ปรับขนาดคอลัมน์ตามเนื้อหา - จัดตามลำดับฟิลด์ใหม่
        const colWidths = [
            // === ข้อมูลแผนงาน ===
            { wch: 10 },  // Plan ID
            { wch: 15 },  // Order Number
            { wch: 15 },  // Production Date
            
            // === ข้อมูลผลิตภัณฑ์ ===
            { wch: 25 },  // Product Name
            { wch: 12 },  // Product Size
            
            // === ข้อมูลแผนกและเครื่องจักร ===
            { wch: 15 },  // Department
            { wch: 15 },  // Subdepartment ✅ ใหม่
            { wch: 20 },  // Machine Name
            
            // === เวลาการผลิต ===
            { wch: 18 },  // Planned Start
            { wch: 18 },  // Planned End
            { wch: 18 },  // Start Time
            { wch: 18 },  // End Time
            { wch: 12 },  // Shift Hours
            { wch: 15 },  // Overtime (Min)
            
            // === เวลาพัก ===
            { wch: 18 },  // Morning Break (Min)
            { wch: 16 },  // Lunch Break (Min)
            { wch: 18 },  // Evening Break (Min)
            { wch: 17 },  // Total Break (Min)
            
            // === เวลาหยุดเครื่อง ===
            { wch: 15 },  // Downtime (Min)
            { wch: 30 },  // Downtime Reason
            
            // === เวลาทำงาน ===
            { wch: 18 },  // Planned Work (Min)
            { wch: 17 },  // Active Work (Min)
            { wch: 15 },  // Working Hours
            
            // === จำนวนผลิต ===
            { wch: 12 },  // Total Pieces
            { wch: 15 },  // Good Quantity
            { wch: 13 },  // Reject Pieces
            { wch: 14 },  // Rework Pieces ✅ ใหม่
            { wch: 30 },  // Remark ✅ ใหม่
            
            // === อัตราการผลิต ===
            { wch: 14 },  // Standard Rate
            { wch: 12 },  // Actual Rate
            
            // === OEE (%) ===
            { wch: 15 },  // Availability (%)
            { wch: 15 },  // Performance (%)
            { wch: 12 },  // Quality (%)
            { wch: 16 },  // Overall OEE (%)
            
            // === ข้อมูลการยืนยัน ===
            { wch: 10 },  // Status
            { wch: 18 },  // Confirmed At
            { wch: 18 },  // Confirmed By
            { wch: 10 }   // Result ID
        ];
        worksheet['!cols'] = colWidths;
        
        // เพิ่มการจัดรูปแบบสำหรับ header - สีเดียวทั้งหมด
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // จัดรูปแบบ header row ด้วยสีเดียวกัน
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            
            worksheet[cellAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
                fill: { fgColor: { rgb: "4472C4" } }, // สีน้ำเงินเดียวทั้งหมด
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Production Report");
        
        const filename = `Production_Report_${formatDateForFilename(new Date())}.xlsx`;
        XLSX.writeFile(workbook, filename);
        
        showToast(`ส่งออกข้อมูล ${allData.length} รายการเป็น Excel สำเร็จ`, 'success');
        
    } catch (error) {
        console.error('Excel export error:', error);
        showToast('เกิดข้อผิดพลาดในการส่งออก Excel: ' + error.message, 'error');
        
        // Fallback to CSV export
        exportToCSV(jsonData);
    }
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
    link.setAttribute('download', `ProductionResults_${formatDateForFilename(new Date())}.csv`);
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

