<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../db.php';

try {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'dashboard_data':
            handleDashboardData();
            break;
        case 'summary':
            handleSummary();
            break;
        case 'oee_data':
            handleOEEData();
            break;
        case 'downtime_data':
            handleDowntimeData();
            break;
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function handleDashboardData() {
    global $conn;
    
    // Check database connection
    if (!$conn) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection not available'
        ]);
        return;
    }
    
    // รับ filters จาก query parameters
    $timeRange = $_GET['timeRange'] ?? '30days';
    $department = $_GET['department'] ?? '';
    $startDate = $_GET['startDate'] ?? '';
    $endDate = $_GET['endDate'] ?? '';
    
    // คำนวณช่วงวันที่
    try {
        $dateRange = calculateDateRange($timeRange, $startDate, $endDate);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Date range calculation error: ' . $e->getMessage()
        ]);
        return;
    }
    
    try {
        $summaryData = getSummaryData($dateRange['start'], $dateRange['end'], $department);
        $oeeThisYear = getOEEData($dateRange['start'], $dateRange['end'], $department);
        $oeeLast30 = getOEEData(
            date('Y-m-d', strtotime('-30 days')), 
            date('Y-m-d'), 
            $department
        );
        $downtimeData = getDowntimeData($dateRange['start'], $dateRange['end'], $department);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'oeeStats' => [
                    'overall' => round($oeeThisYear['value'] ?? 0, 1),
                    'availability' => round($oeeThisYear['availability'] ?? 0, 1),
                    'performance' => round($oeeThisYear['performance'] ?? 0, 1),
                    'quality' => round($oeeThisYear['quality'] ?? 0, 1),
                    'totalRecords' => $summaryData['totalRecords'] ?? 0,
                    'dateRange' => $dateRange
                ],
                'summary' => $summaryData,
                'charts' => [
                    'production' => [
                        'labels' => ['วันนี้', 'เมื่อวาน', '2 วันก่อน', '3 วันก่อน'],
                        'data' => []
                    ],
                    'department' => [
                        'production' => 0,
                        'quality' => 0,
                        'maintenance' => 0,
                        'packaging' => 0
                    ]
                ],
                'progress' => [
                    'production' => ['actual' => 100, 'target' => 120],
                    'quality' => ['actual' => 95, 'target' => 100],
                    'maintenance' => ['actual' => 80, 'target' => 90],
                    'packaging' => ['actual' => 110, 'target' => 100]
                ],
                'alerts' => [
                    'unconfirmedTasks' => 0,
                    'overdueTasks' => 0
                ]
            ],
            'filters' => [
                'timeRange' => $timeRange,
                'department' => $department,
                'dateRange' => $dateRange
            ]
        ]);
    } catch (Exception $e) {
        throw new Exception('Error fetching dashboard data: ' . $e->getMessage());
    }
}

function calculateDateRange($timeRange, $customStartDate = '', $customEndDate = '') {
    $end = date('Y-m-d');
    
    switch ($timeRange) {
        case 'today':
            $start = date('Y-m-d');
            break;
        case '7days':
            $start = date('Y-m-d', strtotime('-7 days'));
            break;
        case '30days':
            $start = date('Y-m-d', strtotime('-30 days'));
            break;
        case 'thismonth':
            $start = date('Y-m-01');
            break;
        case '12months':
            $start = date('Y-m-d', strtotime('-12 months'));
            break;
        case 'thisyear':
            $start = date('Y-01-01');
            break;
        case 'custom':
            $start = $customStartDate ?: date('Y-m-d', strtotime('-30 days'));
            $end = $customEndDate ?: date('Y-m-d');
            break;
        default:
            $start = date('Y-m-d', strtotime('-30 days'));
    }
    
    return ['start' => $start, 'end' => $end];
}

function getSummaryData($startDate, $endDate, $department = '') {
    global $conn;
    
    try {
        // Build WHERE clause for department filter
        $whereClause = "WHERE ProductionDate BETWEEN ? AND ?";
        $params = [$startDate, $endDate];
        
        if (!empty($department)) {
            // Convert department ID to department name
            $deptNameQuery = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptStmt = sqlsrv_query($conn, $deptNameQuery, [$department]);
            if ($deptStmt) {
                $deptRow = sqlsrv_fetch_array($deptStmt, SQLSRV_FETCH_ASSOC);
                if ($deptRow) {
                    $whereClause .= " AND Department = ?";
                    $params[] = $deptRow['DepartmentName'];
                }
            }
        }
        
        // Overall OEE Query
        $oeeQuery = "
            SELECT 
                AVG(CAST(OEE_Overall as FLOAT)) as overallOEE,
                AVG(CAST(OEE_Availability as FLOAT)) as avgAvailability,
                AVG(CAST(OEE_Performance as FLOAT)) as avgPerformance,
                AVG(CAST(OEE_Quality as FLOAT)) as avgQuality
            FROM ProductionResults 
            $whereClause
        ";
        
        $stmt = sqlsrv_query($conn, $oeeQuery, $params);
        if (!$stmt) {
            throw new Exception('Error executing OEE query: ' . print_r(sqlsrv_errors(), true));
        }
        $oeeResult = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        // Total Uptime/Downtime Query
        $uptimeQuery = "
            SELECT 
                SUM(ActiveWorkMinutes) as totalActiveMinutes,
                SUM(DowntimeMinutes) as totalDowntimeMinutes,
                COUNT(DISTINCT MachineName) as activeMachines
            FROM ProductionResults 
            $whereClause
            AND MachineName IS NOT NULL
        ";
        
        $stmt = sqlsrv_query($conn, $uptimeQuery, $params);
        if (!$stmt) {
            throw new Exception('Error executing uptime query: ' . print_r(sqlsrv_errors(), true));
        }
        $uptimeResult = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        // Total machines count
        $machineCountQuery = "SELECT COUNT(DISTINCT MachineName) as totalMachines FROM ProductionResults WHERE MachineName IS NOT NULL";
        $stmt = sqlsrv_query($conn, $machineCountQuery);
        if (!$stmt) {
            throw new Exception('Error executing machine count query: ' . print_r(sqlsrv_errors(), true));
        }
        $machineCount = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        return [
            'overallOEE' => round($oeeResult['overallOEE'] ?? 0, 1),
            'totalUptime' => round(($uptimeResult['totalActiveMinutes'] ?? 0) / 60, 1), // Convert to hours
            'totalDowntime' => round(($uptimeResult['totalDowntimeMinutes'] ?? 0) / 60, 1), // Convert to hours
            'activeMachines' => ($uptimeResult['activeMachines'] ?? 0) . '/' . ($machineCount['totalMachines'] ?? 0)
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error getting summary data: ' . $e->getMessage());
    }
}

function getOEEData($startDate, $endDate, $department = '') {
    global $conn;
    
    try {
        // Build WHERE clause
        $whereClause = "WHERE ProductionDate BETWEEN ? AND ?";
        $params = [$startDate, $endDate];
        
        if (!empty($department)) {
            // Convert department ID to department name
            $deptNameQuery = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptStmt = sqlsrv_query($conn, $deptNameQuery, [$department]);
            if ($deptStmt) {
                $deptRow = sqlsrv_fetch_array($deptStmt, SQLSRV_FETCH_ASSOC);
                if ($deptRow) {
                    $whereClause .= " AND Department = ?";
                    $params[] = $deptRow['DepartmentName'];
                }
            }
        }
        
        // Current period OEE
        $currentQuery = "
            SELECT 
                AVG(CAST(OEE_Overall as FLOAT)) as overallOEE,
                AVG(CAST(OEE_Availability as FLOAT)) as availability,
                AVG(CAST(OEE_Performance as FLOAT)) as performance,
                AVG(CAST(OEE_Quality as FLOAT)) as quality
            FROM ProductionResults 
            $whereClause
        ";
        
        $stmt = sqlsrv_query($conn, $currentQuery, $params);
        if (!$stmt) {
            throw new Exception('Error executing current OEE query: ' . print_r(sqlsrv_errors(), true));
        }
        $currentData = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        // Previous period for comparison (same duration, shifted back)
        $daysDiff = (strtotime($endDate) - strtotime($startDate)) / (24 * 3600);
        $prevStart = date('Y-m-d', strtotime($startDate . " -{$daysDiff} days"));
        $prevEnd = date('Y-m-d', strtotime($endDate . " -{$daysDiff} days"));
        
        $prevParams = [$prevStart, $prevEnd];
        if (!empty($department)) {
            $prevParams[] = $department;
        }
        
        $stmt = sqlsrv_query($conn, $currentQuery, $prevParams);
        if (!$stmt) {
            throw new Exception('Error executing previous OEE query: ' . print_r(sqlsrv_errors(), true));
        }
        $prevData = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        
        // Calculate changes
        $overallChange = ($currentData['overallOEE'] ?? 0) - ($prevData['overallOEE'] ?? 0);
        $availabilityChange = ($currentData['availability'] ?? 0) - ($prevData['availability'] ?? 0);
        $performanceChange = ($currentData['performance'] ?? 0) - ($prevData['performance'] ?? 0);
        $qualityChange = ($currentData['quality'] ?? 0) - ($prevData['quality'] ?? 0);
        
        return [
            'value' => round($currentData['overallOEE'] ?? 0, 1),
            'change' => round($overallChange, 1),
            'trend' => $overallChange >= 0 ? 'up' : 'down',
            'availability' => round($currentData['availability'] ?? 0, 1),
            'availabilityChange' => round($availabilityChange, 1),
            'performance' => round($currentData['performance'] ?? 0, 1),
            'performanceChange' => round($performanceChange, 1),
            'quality' => round($currentData['quality'] ?? 0, 1),
            'qualityChange' => round($qualityChange, 1)
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error getting OEE data: ' . $e->getMessage());
    }
}

function getDowntimeData($startDate, $endDate, $department = '') {
    global $conn;
    
    try {
        // Build WHERE clause
        $whereClause = "";
        $params = [];
        
        if (!empty($department)) {
            // Convert department ID to department name
            $deptNameQuery = "SELECT DepartmentName FROM Departments WHERE DepartmentID = ?";
            $deptStmt = sqlsrv_query($conn, $deptNameQuery, [$department]);
            if ($deptStmt) {
                $deptRow = sqlsrv_fetch_array($deptStmt, SQLSRV_FETCH_ASSOC);
                if ($deptRow) {
                    $whereClause = "AND Department = ?";
                    $params[] = $deptRow['DepartmentName'];
                }
            }
        }
        
        // Downtime by machine for last 7 days
        $downtime7Query = "
            SELECT 
                ISNULL(MachineName, 'Unknown') as MachineName,
                SUM(DowntimeMinutes) as totalDowntime,
                COUNT(*) as downtimeEvents
            FROM ProductionResults 
            WHERE ProductionDate BETWEEN ? AND ?
            $whereClause
            AND DowntimeMinutes > 0
            GROUP BY MachineName
            ORDER BY totalDowntime DESC
        ";
        
        $last7Days = date('Y-m-d', strtotime('-7 days'));
        $today = date('Y-m-d');
        $params7 = array_merge([$last7Days, $today], $params);
        
        $stmt = sqlsrv_query($conn, $downtime7Query, $params7);
        if (!$stmt) {
            throw new Exception('Error executing 7-day downtime query: ' . print_r(sqlsrv_errors(), true));
        }
        $downtime7Data = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $downtime7Data[] = $row;
        }
        
        // Downtime by machine for last 30 days
        $last30Days = date('Y-m-d', strtotime('-30 days'));
        $params30 = array_merge([$last30Days, $today], $params);
        
        $stmt = sqlsrv_query($conn, $downtime7Query, $params30);
        if (!$stmt) {
            throw new Exception('Error executing 30-day downtime query: ' . print_r(sqlsrv_errors(), true));
        }
        $downtime30Data = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $downtime30Data[] = $row;
        }
        
        return [
            'last7days' => formatDowntimeData($downtime7Data),
            'last30days' => formatDowntimeData($downtime30Data)
        ];
        
    } catch (Exception $e) {
        throw new Exception('Error getting downtime data: ' . $e->getMessage());
    }
}

function formatDowntimeData($data) {
    $formatted = [
        'machines' => [],
        'downtimes' => [],
        'colors' => []
    ];
    
    $colors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0dcaf0', '#6f42c1', '#d63384', '#6c757d'];
    
    foreach ($data as $index => $item) {
        $formatted['machines'][] = $item['MachineName'] ?: 'Unknown';
        $formatted['downtimes'][] = round(floatval($item['totalDowntime']) / 60, 1); // Convert to hours
        $formatted['colors'][] = $colors[$index % count($colors)];
    }
    
    return $formatted;
}

function handleSummary() {
    $timeRange = $_GET['timeRange'] ?? '30days';
    $department = $_GET['department'] ?? '';
    $startDate = $_GET['startDate'] ?? '';
    $endDate = $_GET['endDate'] ?? '';
    
    $dateRange = calculateDateRange($timeRange, $startDate, $endDate);
    $summaryData = getSummaryData($dateRange['start'], $dateRange['end'], $department);
    
    echo json_encode([
        'success' => true,
        'data' => $summaryData
    ]);
}

function handleOEEData() {
    $timeRange = $_GET['timeRange'] ?? '30days';
    $department = $_GET['department'] ?? '';
    $startDate = $_GET['startDate'] ?? '';
    $endDate = $_GET['endDate'] ?? '';
    
    $dateRange = calculateDateRange($timeRange, $startDate, $endDate);
    $oeeData = getOEEData($dateRange['start'], $dateRange['end'], $department);
    
    echo json_encode([
        'success' => true,
        'data' => $oeeData
    ]);
}

function handleDowntimeData() {
    $timeRange = $_GET['timeRange'] ?? '30days';
    $department = $_GET['department'] ?? '';
    $startDate = $_GET['startDate'] ?? '';
    $endDate = $_GET['endDate'] ?? '';
    
    $dateRange = calculateDateRange($timeRange, $startDate, $endDate);
    $downtimeData = getDowntimeData($dateRange['start'], $dateRange['end'], $department);
    
    echo json_encode([
        'success' => true,
        'data' => $downtimeData
    ]);
}

?>
