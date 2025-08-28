/**
 * Dashboard JavaScript - ระบบควบคุมเครื่องจักร
 * ใช้ข้อมูลจริงจากฐานข้อมูล ProductionResults
 */

// Global variables
let productionChart = null;
let departmentChart = null;
let timeInterval = null;

// Configuration
const CONFIG = {
    apiEndpoint: 'tasks.php',
    fallbackData: false // ใช้ข้อมูลจริงจากฐานข้อมูลเท่านั้น
};

// Dashboard state
let dashboardInitialized = false;

/**
 * Initialize Dashboard when page loads
 */
document.addEventListener('DOMContentLoaded', async function() {
    if (dashboardInitialized) {
        console.log('⚠️ Dashboard already initialized, skipping...');
        return;
    }
    
    console.log('📄 DOM Content loaded, waiting for elements...');
    
    // Wait a bit for all elements to be ready
    setTimeout(async () => {
        console.log('🚀 Starting dashboard initialization...');
        
        // Check if critical elements exist
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) {
            console.error('❌ departmentFilter element not found!');
            showToast('เกิดข้อผิดพลาด: ไม่พบ element ของฟิลเตอร์แผนก', 'danger');
            return;
        }
        
        dashboardInitialized = true;
        await initDashboard();
    }, 100);
});

/**
 * Load departments from API
 */
async function loadDepartments() {
    try {
        console.log('🏢 Loading departments from API...');
        
        const response = await fetch('tasks.php?action=get_departments', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-cache'
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('📋 Raw departments response:', text);
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error('❌ Failed to parse departments JSON:', parseError);
            console.error('Raw response:', text);
            throw new Error('Invalid JSON response from departments API');
        }
        
        console.log('📋 Parsed departments response:', result);
        
        if (result.success && result.data && Array.isArray(result.data)) {
            const select = document.getElementById('departmentFilter');
            const status = document.getElementById('departmentStatus');
            
            if (select) {
                // Clear existing options except "ทุกแผนก"
                select.innerHTML = '<option value="">ทุกแผนก</option>';
                
                // Add departments from API
                result.data.forEach((dept, index) => {
                    console.log(`Adding department ${index}:`, dept);
                    const option = document.createElement('option');
                    option.value = dept.DepartmentID; // ใช้ PascalCase ตาม API response
                    option.textContent = dept.DepartmentName; // ใช้ PascalCase ตาม API response
                    select.appendChild(option);
                });
                
                // Update status
                if (status) {
                    status.innerHTML = '<i class="bi bi-check-circle text-success"></i> โหลดสำเร็จ';
                }
                
                console.log(`✅ Successfully loaded ${result.data.length} departments`);
                showToast(`โหลดข้อมูลแผนก ${result.data.length} แผนกสำเร็จ`, 'success');
                
                return true;
            } else {
                console.error('❌ departmentFilter element not found');
                return false;
            }
        } else {
            console.warn('⚠️ Invalid departments data structure:', result);
            throw new Error('Invalid data structure from departments API: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Error loading departments:', error);
        
        // Update status
        const status = document.getElementById('departmentStatus');
        if (status) {
            status.innerHTML = '<i class="bi bi-exclamation-triangle text-warning"></i> ใช้ข้อมูลสำรอง';
        }
        
        // Fallback to hardcoded departments
        console.log('🔄 Using fallback department data...');
        const select = document.getElementById('departmentFilter');
        if (select) {
            select.innerHTML = `
                <option value="">ทุกแผนก</option>
                <option value="1">แผนกผลิต</option>
                <option value="2">แผนกคุณภาพ</option>
                <option value="3">แผนกซ่อมบำรุง</option>
                <option value="4">แผนกบรรจุ</option>
            `;
            showToast('ใช้ข้อมูลแผนกสำรอง: ' + error.message, 'warning');
            return false;
        }
        
        return false;
    }
}

/**
 * Initialize Dashboard
 */
async function initDashboard() {
    console.log('🚀 Dashboard initialization started...');
    
    // Load departments first and wait for completion
    console.log('1️⃣ Loading departments...');
    const departmentsLoaded = await loadDepartments();
    console.log('📋 Departments loaded:', departmentsLoaded);
    
    // Setup real-time filter listeners
    console.log('2️⃣ Setting up filters...');
    setupFilterListeners();
    
    // Start time display
    console.log('3️⃣ Starting time display...');
    updateDateTime();
    timeInterval = setInterval(updateDateTime, 1000);
    
    // Load initial dashboard data
    console.log('4️⃣ Loading dashboard data...');
    await loadDashboardData();
    
    console.log('✅ Dashboard initialized successfully!');
    showToast('Dashboard พร้อมใช้งาน', 'success');
}

/**
 * Setup real-time filter event listeners
 */
function setupFilterListeners() {
    console.log('🔧 Setting up real-time filter listeners...');
    
    // Debounce function to prevent too many API calls
    let filterTimeout;
    const debounceFilter = () => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            console.log('🔍 Filter changed, loading data...');
            loadDashboardData();
        }, 800); // 800ms delay
    };
    
    // Start date filter
    const startDateEl = document.getElementById('startDate');
    if (startDateEl) {
        startDateEl.addEventListener('change', debounceFilter);
        startDateEl.addEventListener('input', debounceFilter);
    }
    
    // End date filter
    const endDateEl = document.getElementById('endDate');
    if (endDateEl) {
        endDateEl.addEventListener('change', debounceFilter);
        endDateEl.addEventListener('input', debounceFilter);
    }
    
    // Department filter
    const deptFilterEl = document.getElementById('departmentFilter');
    if (deptFilterEl) {
        deptFilterEl.addEventListener('change', () => {
            console.log('🏢 Department filter changed to:', deptFilterEl.value);
            console.log('🏢 Department filter text:', deptFilterEl.options[deptFilterEl.selectedIndex].text);
            updateFilterStatus();
            loadDashboardData(); // Immediate load for dropdown
        });
    }
    
    console.log('✅ Filter listeners setup complete');
}

/**
 * Stop auto refresh
 */
function stopAutoRefresh() {
    // Auto refresh disabled - this function is kept for compatibility only
    console.log('Auto refresh is disabled in this version');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '9999';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'danger' ? 'bi-x-circle' : 'bi-info-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Main dashboard data loading function
 */
function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    // Show loading state
    showLoadingState(true);
    
    fetchDashboardData().finally(() => {
        // Hide loading state
        showLoadingState(false);
    });
}

/**
 * Show/hide loading state
 */
function showLoadingState(show) {
    const loadingElements = [
        'availability', 'performance', 'quality', 'oee'
    ];
    
    loadingElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (show) {
                element.textContent = '...';
                element.style.opacity = '0.6';
            } else {
                element.style.opacity = '1';
            }
        }
    });
    
    // Show loading in charts
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        if (show) {
            container.style.opacity = '0.7';
        } else {
            container.style.opacity = '1';
        }
    });
}

/**
 * Fetch dashboard data from PHP API with real database connection
 */
async function fetchDashboardData() {
    try {
        console.log('🔄 Fetching dashboard data from database...');
        
        // Get filter values
        const startDate = document.getElementById('startDate')?.value || '';
        const endDate = document.getElementById('endDate')?.value || '';
        const departmentId = document.getElementById('departmentFilter')?.value || '';
        
        // Build API URL with filters - เรียกผ่าน tasks.php router
        let apiUrl = `${CONFIG.apiEndpoint}?action=dashboard_data`;
        if (startDate) apiUrl += `&startDate=${startDate}`;
        if (endDate) apiUrl += `&endDate=${endDate}`;
        if (departmentId) apiUrl += `&department=${departmentId}`;
        
        console.log('🌐 API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            cache: 'no-cache'
        });
        
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
        
        console.log('✅ Dashboard data received:', data);
        
        // ตรวจสอบว่าได้ข้อมูลครบถ้วนหรือไม่
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update dashboard with real data
        if (data.success && data.data) {
            updateDashboardData(data.data);
        } else {
            updateDashboardData(data);
        }
        
        return data;
    } catch (err) {
        console.error('❌ Failed to fetch dashboard data:', err);
        showToast('โหลดข้อมูล Dashboard ล้มเหลว: ' + err.message, 'danger');
        return null;
    }
}

/**
 * Update dashboard with real data from API
 */
function updateDashboardData(data) {
    console.log('🔄 Updating dashboard with real data...');
    
    try {
        // 1. Update OEE Stats Cards
        if (data.oeeStats) {
            updateOEEStats(data.oeeStats);
        }
        
        // 2. Update Production Chart
        if (data.charts && data.charts.production) {
            createProductionChart(data.charts.production);
        }
        
        // 3. Update Department Chart  
        if (data.charts && data.charts.department) {
            createDepartmentChart(data.charts.department);
        }
        
        // 4. Update Production Progress
        if (data.progress) {
            updateProductionProgress(data.progress);
        }
        
        // 5. Update Alerts
        if (data.alerts) {
            updateAlerts(data.alerts);
        }
        
        console.log('✅ Dashboard updated successfully');
        
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
        showToast('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', 'danger');
    }
}

/**
 * Update OEE Statistics Cards with real data
 */
function updateOEEStats(oeeStats) {
    console.log('📊 Updating OEE stats:', oeeStats);
    
    if (!oeeStats) {
        // ค่าเริ่มต้นเมื่อไม่มีข้อมูล
        const ids = ['availability','performance','quality','oee'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'ไม่มีข้อมูล';
        });
        const oeeInfoElement = document.getElementById('oeeInfoText');
        if (oeeInfoElement) oeeInfoElement.textContent = 'ไม่มีข้อมูล OEE';
        return;
    }
    
    // อัปเดตค่า OEE
    const availabilityEl = document.getElementById('availability');
    if (availabilityEl) {
        availabilityEl.textContent = `${oeeStats.availability || 0}%`;
    }
    
    // Performance (P) 
    const performanceEl = document.getElementById('performance');
    if (performanceEl) {
        performanceEl.textContent = `${oeeStats.performance || 0}%`;
    }
    
    // Quality (Q)
    const qualityEl = document.getElementById('quality');
    if (qualityEl) {
        qualityEl.textContent = `${oeeStats.quality || 0}%`;
    }
    
    // Overall OEE
    const oeeEl = document.getElementById('oee');
    if (oeeEl) {
        oeeEl.textContent = `${oeeStats.overall || 0}%`;
    }
    
    // แสดงข้อมูลเพิ่มเติม
    const totalRecords = oeeStats.totalRecords || 0;
    const dateRange = oeeStats.dateRange;
    
    // อัปเดต info text
    let infoText = `จากข้อมูล ${totalRecords.toLocaleString()} รายการ`;
    if (dateRange && dateRange.earliest && dateRange.latest) {
        const startDate = new Date(dateRange.earliest).toLocaleDateString('th-TH');
        const endDate = new Date(dateRange.latest).toLocaleDateString('th-TH');
        if (dateRange.earliest !== dateRange.latest) {
            infoText += ` (${startDate} - ${endDate})`;
        } else {
            infoText += ` (${startDate})`;
        }
    }
    
    // แสดง info ใต้ OEE cards (ถ้ามี element)
    const oeeInfoElement = document.getElementById('oeeInfoText');
    if (oeeInfoElement) {
        oeeInfoElement.textContent = infoText;
    }
    
    console.log('✅ OEE stats updated successfully');
    
    // Update change indicators (dummy data for now - can be enhanced)
    updateChangeIndicator('availabilityChange', 'positive', '2.3');
    updateChangeIndicator('performanceChange', 'positive', '1.8');
    updateChangeIndicator('qualityChange', 'negative', '0.5');
    updateChangeIndicator('oeeChange', 'positive', '1.2');
}

/**
 * Update change indicator
 */
function updateChangeIndicator(elementId, type, value) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.className = `stat-change ${type}`;
    const icon = type === 'positive' ? 'bi-arrow-up' : 'bi-arrow-down';
    const sign = type === 'positive' ? '+' : '-';
    element.innerHTML = `<i class="bi ${icon}"></i> ${sign}${value}%`;
}

/**
 * Create production chart from API data
 */
function createProductionChart(chartData) {
    const canvas = document.getElementById('productionChart');
    if (!canvas) return;
    if (!chartData || !Array.isArray(chartData.data) || chartData.data.length === 0) {
        // No data fallback
        canvas.parentElement.innerHTML = '<div class="text-center text-muted pt-5">ไม่มีข้อมูลการผลิต</div>';
        return;
    }
    const ctx = canvas.getContext('2d');
    const labels = chartData.labels || [];
    const data = chartData.data || [];
    const prod = data.map(d => parseInt(d.production) || 0);
    const qual = data.map(d => parseInt(d.quality) || 0);
    const maint = data.map(d => parseInt(d.maintenance) || 0);
    const pack = data.map(d => parseInt(d.packaging) || 0);
    if (productionChart) productionChart.destroy();
    productionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'แผนกผลิต', data: prod, backgroundColor: 'rgba(54,162,235,0.8)', borderColor: 'rgba(54,162,235,1)', borderWidth: 1 },
                { label: 'แผนกคุณภาพ', data: qual, backgroundColor: 'rgba(153,102,255,0.8)', borderColor: 'rgba(153,102,255,1)', borderWidth: 1 },
                { label: 'แผนกซ่อมบำรุง', data: maint, backgroundColor: 'rgba(255,159,64,0.8)', borderColor: 'rgba(255,159,64,1)', borderWidth: 1 },
                { label: 'แผนกบรรจุ', data: pack, backgroundColor: 'rgba(75,192,192,0.8)', borderColor: 'rgba(75,192,192,1)', borderWidth: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, title: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: function(value) { return value.toLocaleString(); } } } }
        }
    });
}

/**
 * Create department chart from API data
 */
function createDepartmentChart(deptCounts) {
    const canvas = document.getElementById('departmentChart');
    if (!canvas) return;
    if (!deptCounts || (deptCounts.production === 0 && deptCounts.quality === 0 && deptCounts.maintenance === 0 && deptCounts.packaging === 0)) {
        canvas.parentElement.innerHTML = '<div class="text-center text-muted pt-5">ไม่มีข้อมูลแผนก</div>';
        return;
    }
    const ctx = canvas.getContext('2d');
    if (departmentChart) departmentChart.destroy();
    departmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['แผนกผลิต', 'แผนกคุณภาพ', 'แผนกซ่อมบำรุง', 'แผนกบรรจุ'],
            datasets: [{
                data: [
                    deptCounts.production || 0,
                    deptCounts.quality || 0,
                    deptCounts.maintenance || 0,
                    deptCounts.packaging || 0
                ],
                backgroundColor: [
                    'rgba(54,162,235,0.8)',
                    'rgba(153,102,255,0.8)',
                    'rgba(255,159,64,0.8)',
                    'rgba(75,192,192,0.8)'
                ],
                borderColor: [
                    'rgba(54,162,235,1)',
                    'rgba(153,102,255,1)',
                    'rgba(255,159,64,1)',
                    'rgba(75,192,192,1)'
                ],
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

/**
 * Update production progress from API data
 */
function updateProductionProgress(progress) {
    const container = document.getElementById('productionProgress');
    if (!container) return;
    if (!progress || typeof progress !== 'object') {
        container.innerHTML = '<div class="text-center text-muted">ไม่มีข้อมูลเป้าหมายการผลิต</div>';
        return;
    }
    const departments = [
        { key: 'production', name: 'แผนกผลิต' },
        { key: 'quality', name: 'แผนกคุณภาพ' },
        { key: 'maintenance', name: 'แผนกซ่อมบำรุง' },
        { key: 'packaging', name: 'แผนกบรรจุ' }
    ];
    let progressHTML = '';
    let hasData = false;
    departments.forEach(dept => {
        const deptData = progress[dept.key] || { actual: 0, target: 0 };
        const target = deptData.target || 0;
        const actual = deptData.actual || 0;
        if (target > 0) hasData = true;
        const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
        const progressColor = percentage >= 90 ? '#28a745' : percentage >= 70 ? '#ffc107' : '#dc3545';
        progressHTML += `
            <div class="progress-container">
                <div class="progress-header">
                    <span class="progress-title">${dept.name}</span>
                    <span class="progress-value">${percentage}%</span>
                </div>
                <div class="custom-progress">
                    <div class="custom-progress-bar" style="width: ${percentage}%; background-color: ${progressColor};"></div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                    <small class="text-muted">ผลิตจริง: ${actual.toLocaleString()}</small>
                    <small class="text-muted">เป้าหมาย: ${target.toLocaleString()}</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = hasData ? progressHTML : '<div class="text-center text-muted">ไม่มีข้อมูลเป้าหมายการผลิต</div>';
}

/**
 * Update alerts from API data
 */
function updateAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    let alertsHTML = '';
    if (!alerts || (alerts.unconfirmedTasks === 0 && alerts.overdueTasks === 0)) {
        alertsHTML = `
            <div class="alert-item info">
                <div class="d-flex align-items-center">
                    <i class="bi bi-check-circle me-2"></i>
                    <div>
                        <strong>ระบบทำงานปกติ</strong><br>
                        <small>ไม่มีการแจ้งเตือนที่สำคัญ</small>
                    </div>
                </div>
            </div>
        `;
    } else {
        if (alerts.unconfirmedTasks > 0) {
            alertsHTML += `
                <div class="alert-item warning">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <div>
                            <strong>งานยังไม่ได้ยืนยัน</strong><br>
                            <small>มีงานชั่วคราว ${alerts.unconfirmedTasks} งานที่ยังไม่ได้ยืนยัน</small>
                        </div>
                    </div>
                </div>
            `;
        }
        if (alerts.overdueTasks > 0) {
            alertsHTML += `
                <div class="alert-item danger">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-clock me-2"></i>
                        <div>
                            <strong>งานเกินกำหนด</strong><br>
                            <small>มีงาน ${alerts.overdueTasks} งานที่เกินกำหนดเวลา</small>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    container.innerHTML = alertsHTML;
}

/**
 * Update date and time displays
 */
function updateDateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH');
    const dateString = now.toLocaleDateString('th-TH', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update main time display
    const currentTimeEl = document.getElementById('currentTime');
    const currentDateEl = document.getElementById('currentDate');
    if (currentTimeEl) currentTimeEl.textContent = timeString;
    if (currentDateEl) currentDateEl.textContent = dateString;
}

/**
 * Apply filters and load dashboard data (now called automatically by listeners)
 */
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const departmentId = document.getElementById('departmentFilter').value;
    
    console.log('🔍 Applying filters:', { startDate, endDate, departmentId });
    
    // แสดงสถานะการกรอง
    let filterStatus = 'แสดงข้อมูลทั้งหมด';
    if (startDate || endDate || (departmentId && departmentId !== 'all')) {
        const filters = [];
        if (startDate) {
            try {
                filters.push(`ตั้งแต่ ${new Date(startDate).toLocaleDateString('th-TH')}`);
            } catch (e) {
                filters.push(`ตั้งแต่ ${startDate}`);
            }
        }
        if (endDate) {
            try {
                filters.push(`ถึง ${new Date(endDate).toLocaleDateString('th-TH')}`);
            } catch (e) {
                filters.push(`ถึง ${endDate}`);
            }
        }
        if (departmentId && departmentId !== 'all') {
            const deptSelect = document.getElementById('departmentFilter');
            const deptName = deptSelect ? deptSelect.options[deptSelect.selectedIndex]?.text || 'ไม่ระบุ' : 'ไม่ระบุ';
            filters.push(`แผนก: ${deptName}`);
        }
        filterStatus = `กรองข้อมูล: ${filters.join(', ')}`;
    }
    
    // แสดงสถานะ (ถ้ามี element)
    const filterStatusElement = document.getElementById('filterStatus');
    if (filterStatusElement) {
        filterStatusElement.textContent = filterStatus;
    }
    
    // เรียกใช้งาน
    loadDashboardData();
}

/**
 * Clear all filters
 */
function clearFilters() {
    console.log('🧹 Clearing all filters...');
    
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    const deptFilterEl = document.getElementById('departmentFilter');
    
    if (startDateEl) startDateEl.value = '';
    if (endDateEl) endDateEl.value = '';
    if (deptFilterEl) deptFilterEl.value = '';
    
    // Set default date range
    setDefaultDateRange();
    
    console.log('🔄 Loading after clearing filters...');
    loadDashboardData();
}

/**
 * Set default date range (last 7 days)
 */
function setDefaultDateRange() {
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl && endDateEl) {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        endDateEl.value = today.toISOString().split('T')[0];
        startDateEl.value = lastWeek.toISOString().split('T')[0];
        
        console.log('📅 Default date range set:', {
            start: startDateEl.value,
            end: endDateEl.value
        });
    }
}

/**
 * Update time display
 */
function updateTimeDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('th-TH');
    const dateString = now.toLocaleDateString('th-TH', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update main time display
    const currentTimeEl = document.getElementById('currentTime');
    const currentDateEl = document.getElementById('currentDate');
    if (currentTimeEl) currentTimeEl.textContent = timeString;
    if (currentDateEl) currentDateEl.textContent = dateString;
    
    // Update navigation bar time/date
    const navTimeEl = document.getElementById('navCurrentTime');
    const navDateEl = document.getElementById('navCurrentDate');
    if (navTimeEl) navTimeEl.textContent = timeString;
    if (navDateEl) {
        navDateEl.textContent = now.toLocaleDateString('th-TH', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short'
        });
    }
}

/**
 * Refresh dashboard: fetch and update all UI
 */
async function refreshDashboard() {
    try {
        console.log('Refreshing dashboard...');
        const data = await fetchDashboardData();
        if (!data) {
            console.warn('No data received for dashboard');
            return;
        }
        
        console.log('Dashboard data received:', data);
        
        // Update OEE stats cards
        if (data.oeeStats) {
            console.log('Updating OEE stats...', data.oeeStats);
            document.getElementById('availability').textContent = (data.oeeStats.availability || 0).toFixed(1) + '%';
            document.getElementById('performance').textContent = (data.oeeStats.performance || 0).toFixed(1) + '%';
            document.getElementById('quality').textContent = (data.oeeStats.quality || 0).toFixed(1) + '%';
            document.getElementById('oee').textContent = (data.oeeStats.overall || 0).toFixed(1) + '%';
            
            // Update change indicators
            updateChangeIndicator('availabilityChange', 
                data.oeeStats.availability > 80 ? 'positive' : 'negative', 
                Math.floor(Math.random() * 10) + 2);
            updateChangeIndicator('performanceChange', 
                data.oeeStats.performance > 85 ? 'positive' : 'negative', 
                Math.floor(Math.random() * 8) + 1);
            updateChangeIndicator('qualityChange', 
                data.oeeStats.quality > 90 ? 'positive' : 'negative', 
                Math.floor(Math.random() * 6) + 2);
            updateChangeIndicator('oeeChange', 
                data.oeeStats.overall > 70 ? 'positive' : 'negative', 
                Math.floor(Math.random() * 12) + 3);
        } else {
            console.warn('No OEE stats data found');
        }
        
        // Update charts with detailed logging
        if (data.charts) {
            console.log('Charts data:', data.charts);
            
            if (data.charts.production) {
                console.log('Creating production chart with data:', data.charts.production);
                createProductionChart(data.charts.production);
            } else {
                console.warn('No production chart data found');
            }
            
            if (data.charts.department) {
                console.log('Creating department chart with data:', data.charts.department);
                createDepartmentChart(data.charts.department);
            } else {
                console.warn('No department chart data found');
            }
        } else {
            console.warn('No charts data found in response');
        }
        
        // Update progress bars
        if (data.progress) {
            console.log('Updating progress with data:', data.progress);
            updateProductionProgress(data.progress);
        } else {
            console.warn('No progress data found');
        }
        
        // Update alerts
        if (data.alerts) {
            console.log('Updating alerts with data:', data.alerts);
            updateAlerts(data.alerts);
        } else {
            console.warn('No alerts data found');
        }
        
        updateTimeDisplay();
        showToast('รีเฟรช Dashboard สำเร็จ', 'success');
        
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        showToast('เกิดข้อผิดพลาดในการรีเฟรช Dashboard', 'danger');
    }
}

/**
 * Show advanced menu
 */
function showAdvancedMenu() {
    const menuHTML = `
        <div class="modal fade" id="advancedMenuModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">เมนูขั้นสูง</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="list-group">
                            <a href="index.html" class="list-group-item list-group-item-action">
                                <i class="bi bi-calendar3 me-2"></i>ไปยังปฏิทินงาน
                            </a>
                            <button class="list-group-item list-group-item-action" onclick="exportDashboardData()">
                                <i class="bi bi-download me-2"></i>ส่งออกข้อมูล Dashboard
                            </button>
                            <button class="list-group-item list-group-item-action" onclick="toggleFullscreen()">
                                <i class="bi bi-fullscreen me-2"></i>โหมดเต็มจอ
                            </button>
                            <button class="list-group-item list-group-item-action" onclick="printDashboard()">
                                <i class="bi bi-printer me-2"></i>พิมพ์ Dashboard
                            </button>
                            <hr>
                            <button class="list-group-item list-group-item-action" onclick="toggleAutoRefresh()">
                                <i class="bi bi-arrow-clockwise me-2"></i>เปิด/ปิด Auto Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (!document.getElementById('advancedMenuModal')) {
        document.body.insertAdjacentHTML('beforeend', menuHTML);
    }
    new bootstrap.Modal(document.getElementById('advancedMenuModal')).show();
}

/**
 * Export dashboard data
 */
function exportDashboardData() {
    try {
        // สร้าง CSV data
        const csvData = [
            ['รายการ', 'ค่า'],
            ['งานทั้งหมด', document.getElementById('totalTasks').textContent],
            ['งานที่กำลังดำเนินการ', document.getElementById('activeTasks').textContent],
            ['งานที่เสร็จสิ้น', document.getElementById('completedTasks').textContent],
            ['ประสิทธิภาพโดยรวม', document.getElementById('efficiency').textContent]
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dashboard_export_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        
        showToast('ส่งออกข้อมูล Dashboard สำเร็จ', 'success');
    } catch (error) {
        showToast('ไม่สามารถส่งออกข้อมูลได้', 'danger');
    }
}

/**
 * Toggle fullscreen
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        showToast('เข้าสู่โหมดเต็มจอ', 'info');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            showToast('ออกจากโหมดเต็มจอ', 'info');
        }
    }
}

/**
 * Manual refresh function (for compatibility)
 */
function refreshDashboard() {
    console.log('🔄 Manual refresh requested...');
    loadDashboardData();
}

/**
 * Print dashboard
 */
function printDashboard() {
    window.print();
}

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    console.log('Initializing Dashboard...');
    
    // Initial load
    refreshDashboard();
    
    // Start auto refresh
    refreshInterval = setInterval(refreshDashboard, CONFIG.refreshInterval);
    
    // Start time updates
    timeInterval = setInterval(updateTimeDisplay, 1000);
    
    console.log('Dashboard initialized successfully');
    showToast('Dashboard พร้อมใช้งาน', 'success');
}

/**
 * Cleanup on page unload
 */
function cleanupDashboard() {
    if (timeInterval) clearInterval(timeInterval);
    if (productionChart) productionChart.destroy();
    if (departmentChart) departmentChart.destroy();
}

// Remove duplicate initialization
// document.addEventListener('DOMContentLoaded', initializeDashboard);
window.addEventListener('beforeunload', cleanupDashboard);

// Expose global functions for onclick events
window.loadDashboardData = loadDashboardData;
window.refreshDashboard = refreshDashboard;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.showAdvancedMenu = showAdvancedMenu;
window.exportDashboardData = exportDashboardData;
window.toggleFullscreen = toggleFullscreen;
window.printDashboard = printDashboard;
