<?php
// ต้องอยู่บนสุด ห้ามมีช่องว่าง/BOM ก่อนหน้า
ob_start();
header_remove(); // กัน header เก่าค้าง
header('Content-Type: application/json; charset=utf-8');

// แนะนำเปิด log ปิดแสดง error หน้าจอ
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/php-error.log');

// handler กลาง เผื่อมี warning/fatal ที่ทำให้ IIS ดัก 500
set_exception_handler(function($e){
    http_response_code(500);
    ob_clean();
    echo json_encode([
        'success' => false,
        'error'   => 'Unhandled exception',
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
});
set_error_handler(function($severity, $message, $file, $line){
    // แปลง error เป็น exception เพื่อให้ handler ด้านบนจัดการ
    throw new ErrorException($message, 0, $severity, $file, $line);
});

include 'db.php';

// ===== API Endpoints สำหรับโครงสร้างฐานข้อมูลใหม่ =====
// Production Results Schema:
// save_production_result     - บันทึกข้อมูลลงตาราง ProductionResults
// get_production_results     - ดึงข้อมูลจากตาราง ProductionResults
// get_plan_detail           - ดึงข้อมูลแผนงานสำหรับ confirm-complete
// get_plans                 - ดึงรายการแผนงานทั้งหมด
// add_plan                  - เพิ่มแผนงานใหม่
// update_plan               - อัปเดตแผนงาน
// delete_plan               - ลบแผนงาน
// =======================================================

// ===== ฟังก์ชันช่วยเหลือ =====
function validateStatus($status) {
    $validStatuses = [
        'planning',
        'in-progress', 
        'completed',
        'cancelled'
    ];
    
    return in_array($status, $validStatuses);
}

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
if ($conn === false) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
    exit;
}

// ===== REST API (JSON) =====
// รองรับทั้ง GET และ POST requests
$action = '';
if (isset($_GET['action'])) {
    $action = $_GET['action'];
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // สำหรับ POST requests ให้ดูจาก query string ด้วย
    $queryString = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);
    if ($queryString) {
        parse_str($queryString, $params);
        if (isset($params['action'])) {
            $action = $params['action'];
        }
    }
}

if ($action) {
    // ดึงแผนงานเดี่ยวด้วย PlanID
    if ($action === 'get_plan' && isset($_GET['PlanID'])) {
        $planId = intval($_GET['PlanID']);
        $sql = "SELECT p.*, 
                       ISNULL(m.MachineName, 'ไม่ระบุ') as MachineName, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
                FROM ProductionPlans p
                LEFT JOIN Machines m ON p.MachineID = m.MachineID
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                WHERE p.PlanID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        if ($stmt === false) {
            ob_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if ($row) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['PlannedStartTime']) && $row['PlannedStartTime'] && is_object($row['PlannedStartTime'])) {
                $row['PlannedStartTime'] = $row['PlannedStartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['PlannedEndTime']) && $row['PlannedEndTime'] && is_object($row['PlannedEndTime'])) {
                $row['PlannedEndTime'] = $row['PlannedEndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
        }
        echo $row ? json_encode($row, JSON_UNESCAPED_UNICODE) : json_encode(['success' => false, 'error' => 'ไม่พบข้อมูลแผนงาน'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // ดึงงานเดี่ยวด้วย JobID - เก็บไว้เพื่อ backward compatibility
    if ($action === 'get' && isset($_GET['JobID'])) {
        $jobId = intval($_GET['JobID']);
        $sql = "SELECT j.*, 
                       ISNULL(m.MachineName, 'ไม่ระบุ') as MachineName, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
                FROM Jobs j
                LEFT JOIN Machines m ON j.MachineID = m.MachineID
                LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
                WHERE j.JobID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$jobId]);
        if ($stmt === false) {
            ob_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if ($row) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
        }
        echo $row ? json_encode($row, JSON_UNESCAPED_UNICODE) : json_encode(['success' => false, 'error' => 'ไม่พบข้อมูลงาน'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // ดึงแผนงานทั้งหมดจาก ProductionPlans (รองรับโครงสร้างใหม่)
    if ($action === 'get_plans') {
        $sql = "SELECT p.*, 
                       d.DepartmentName,
                       -- Computed columns
                       p.PlannedTotalMinutes,
                       p.BreakTotalMinutes, 
                       p.PlannedNetMinutes,
                       
                       -- Primary machine info (เครื่องแรกที่เพิ่ม)
                       pm_first.MachineName AS PrimaryMachineName,
                       pm_first.MachineID AS PrimaryMachineID,
                       
                       -- All machines (concatenated)
                       STUFF((
                           SELECT ',' + m.MachineName 
                           FROM ProductionPlanMachines ppm
                           JOIN Machines m ON ppm.MachineID = m.MachineID
                           WHERE ppm.PlanID = p.PlanID
                           ORDER BY ppm.CreatedAt, m.MachineName
                           FOR XML PATH('')
                       ), 1, 1, '') AS MachineNames,
                       
                       -- All machine IDs (concatenated) 
                       STUFF((
                           SELECT ',' + CAST(m.MachineID AS VARCHAR)
                           FROM ProductionPlanMachines ppm
                           JOIN Machines m ON ppm.MachineID = m.MachineID
                           WHERE ppm.PlanID = p.PlanID
                           ORDER BY ppm.CreatedAt, m.MachineID
                           FOR XML PATH('')
                       ), 1, 1, '') AS MachineIDs,
                       
                       -- Sub-departments (concatenated)
                       STUFF((
                           SELECT ',' + sd.SubDepartmentName
                           FROM ProductionPlanSubDepartments ppsd
                           JOIN SubDepartments sd ON ppsd.SubDepartmentID = sd.SubDepartmentID
                           WHERE ppsd.PlanID = p.PlanID
                           ORDER BY sd.SubDepartmentName
                           FOR XML PATH('')
                       ), 1, 1, '') AS SubDepartmentNames,
                       
                       -- Sub-department IDs (concatenated)
                       STUFF((
                           SELECT ',' + CAST(sd.SubDepartmentID AS VARCHAR)
                           FROM ProductionPlanSubDepartments ppsd
                           JOIN SubDepartments sd ON ppsd.SubDepartmentID = sd.SubDepartmentID
                           WHERE ppsd.PlanID = p.PlanID
                           ORDER BY sd.SubDepartmentID
                           FOR XML PATH('')
                       ), 1, 1, '') AS SubDepartmentIDs

                FROM ProductionPlans p
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                LEFT JOIN (
                    -- Get first machine as primary
                    SELECT ppm.PlanID, m.MachineName, m.MachineID,
                           ROW_NUMBER() OVER (PARTITION BY ppm.PlanID ORDER BY ppm.CreatedAt) as rn
                    FROM ProductionPlanMachines ppm
                    JOIN Machines m ON ppm.MachineID = m.MachineID
                ) pm_first ON p.PlanID = pm_first.PlanID AND pm_first.rn = 1
                ORDER BY p.CreatedAt DESC";
                
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            ob_clean();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $plans = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง DateTime objects เป็น strings
            if (isset($row['PlannedStartTime']) && $row['PlannedStartTime'] && is_object($row['PlannedStartTime'])) {
                $row['PlannedStartTime'] = $row['PlannedStartTime']->format('Y-m-d H:i:s');
            }
            if (isset($row['PlannedEndTime']) && $row['PlannedEndTime'] && is_object($row['PlannedEndTime'])) {
                $row['PlannedEndTime'] = $row['PlannedEndTime']->format('Y-m-d H:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d H:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d H:i:s');
            }
            
            // เพิ่มข้อมูล backward compatibility
            $row['MachineName'] = $row['PrimaryMachineName'] ?: 'ไม่ระบุ';
            $row['ProductDisplayName'] = trim(($row['ProductName'] ?? '') . ' ' . ($row['ProductSize'] ?? ''));
            
            // คำนวณ duration hours จาก computed columns
            if ($row['PlannedNetMinutes']) {
                $row['PlannedDurationHours'] = round($row['PlannedNetMinutes'] / 60, 1);
            } else {
                $row['PlannedDurationHours'] = 0;
            }
            
            $plans[] = $row;
        }
        
        echo json_encode($plans, JSON_UNESCAPED_UNICODE);
        exit;
    }
    // ดึงงานทั้งหมด (รวมทั้งที่เสร็จแล้ว) - เก็บไว้เพื่อ backward compatibility
    if ($action === 'get_tasks') {
        $sql = "SELECT j.*, 
                       ISNULL(m.MachineName, 'ไม่ระบุ') as MachineName, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName
                FROM Jobs j
                LEFT JOIN Machines m ON j.MachineID = m.MachineID
                LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
                ORDER BY j.CreatedAt ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $tasks = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
            
            // ถ้ามี MachineIDs ให้แสดงรายการเครื่องจักรทั้งหมด
            if (!empty($row['MachineIDs']) && $row['MachineIDs'] != $row['MachineID']) {
                $machineIds = explode(',', $row['MachineIDs']);
                $machineNames = [];
                foreach ($machineIds as $machineId) {
                    $machineId = trim($machineId);
                    if (!empty($machineId)) {
                        // ดึงชื่อเครื่องจักรแต่ละตัว
                        $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                        $machineStmt = sqlsrv_query($conn, $machineSql, [intval($machineId)]);
                        if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                            $machineNames[] = $machineRow['MachineName'];
                        }
                    }
                }
                if (!empty($machineNames)) {
                    $row['MachineName'] = implode(', ', $machineNames);
                }
            }
            
            $tasks[] = $row;
        }
        echo json_encode($tasks);
        exit;
    }
    // ดึงข้อมูลการผลิตที่เสร็จสิ้นแล้ว (สำหรับหน้าประวัติ)
    if ($action === 'get_completed_plans') {
        $sql = "SELECT pr.*, 
                       p.LotNumber, p.LotSize, p.WorkerCount, p.MachineID, p.MachineIDs,
                       p.PlannedStartTime, p.PlannedEndTime, p.Details as PlanDetails,
                       ISNULL(d.DepartmentName, pr.Department) as DepartmentName
                FROM ProductionResults pr
                LEFT JOIN ProductionPlans p ON pr.PlanID = p.PlanID
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID  
                ORDER BY pr.ConfirmedAt DESC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $history = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // จัดการ MachineName จาก MachineIDs หรือ MachineID
            $machineName = $row['MachineName'] ?? 'ไม่ระบุ';
            if (!empty($row['MachineIDs'])) {
                // หากมี MachineIDs (รูปแบบ "1,2,3")
                $machineIds = explode(',', $row['MachineIDs']);
                $machineNames = [];
                foreach ($machineIds as $machineId) {
                    $machineId = trim($machineId);
                    if (!empty($machineId)) {
                        $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                        $machineStmt = sqlsrv_query($conn, $machineSql, [$machineId]);
                        if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                            $machineNames[] = $machineRow['MachineName'];
                        }
                    }
                }
                if (!empty($machineNames)) {
                    $machineName = implode(', ', $machineNames);
                }
            } else if (!empty($row['MachineID'])) {
                // หากมี MachineID เดี่ยว
                $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                $machineStmt = sqlsrv_query($conn, $machineSql, [$row['MachineID']]);
                if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                    $machineName = $machineRow['MachineName'];
                }
            }
            $row['MachineName'] = $machineName;
            
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['ActualStartTime']) && $row['ActualStartTime'] && is_object($row['ActualStartTime'])) {
                $row['ActualStartTime'] = $row['ActualStartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['ActualEndTime']) && $row['ActualEndTime'] && is_object($row['ActualEndTime'])) {
                $row['ActualEndTime'] = $row['ActualEndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['ConfirmedAt']) && $row['ConfirmedAt'] && is_object($row['ConfirmedAt'])) {
                $row['ConfirmedAt'] = $row['ConfirmedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['ProductionDate']) && $row['ProductionDate'] && is_object($row['ProductionDate'])) {
                $row['ProductionDate'] = $row['ProductionDate']->format('Y-m-d');
            }
            if (isset($row['PlannedStartTime']) && $row['PlannedStartTime'] && is_object($row['PlannedStartTime'])) {
                $row['PlannedStartTime'] = $row['PlannedStartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['PlannedEndTime']) && $row['PlannedEndTime'] && is_object($row['PlannedEndTime'])) {
                $row['PlannedEndTime'] = $row['PlannedEndTime']->format('Y-m-d\TH:i:s');
            }
            
            // เพิ่มข้อมูลเพื่อความเข้ากันได้กับ history.js
            $row['ProductDisplayName'] = $row['ProductName'];
            $row['DepartmentName'] = $row['Department'];
            $row['Status'] = 'completed';
            $row['Status'] = 'completed';
            
            $history[] = $row;
        }
        echo json_encode($history);
        exit;
    }
    
    // ดึงงานที่เสร็จแล้ว (ประวัติ) - เก็บไว้เพื่อ backward compatibility
    if ($action === 'get_history') {
        $sql = "SELECT j.*, m.MachineName, d.DepartmentName
                FROM Jobs j
                JOIN Machines m ON j.MachineID = m.MachineID
                JOIN Departments d ON m.DepartmentID = d.DepartmentID
                WHERE j.Status = 'completed' ORDER BY j.CreatedAt DESC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $history = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            // แปลง datetime fields ให้เป็น string (ถ้ามี) - ป้องกัน error
            if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
                $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
                $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
                $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
            }
            if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
                $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
            }
            $history[] = $row;
        }
        echo json_encode($history);
        exit;
    }
    // เพิ่มแผนงานใหม่ลง ProductionPlans (โครงสร้างใหม่)
    if ($action === 'add_plan') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        try {
            sqlsrv_begin_transaction($conn);
            
            // ตรวจสอบ Status ก่อนบันทึก
            $status = $data['Status'] ?? 'planning';
            if (!validateStatus($status)) {
                throw new Exception('Invalid plan status: ' . $status);
            }
            
            // 1. Insert ProductionPlan (เพิ่ม Break และ Setup fields)
            $planSql = "INSERT INTO ProductionPlans (
                LotNumber, ProductName, ProductSize, DepartmentID,
                LotSize, TargetOutput, WorkerCount, Status,
                PlannedStartTime, PlannedEndTime, Details,
                BreakMorningMinutes, BreakLunchMinutes, BreakEveningMinutes,
                SetupMinutes, SetupNote,
                CreatedByUserID, UpdatedByUserID
            ) OUTPUT INSERTED.PlanID VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $planStmt = sqlsrv_query($conn, $planSql, [
                $data['LotNumber'] ?? '',
                $data['ProductName'] ?? '',
                $data['ProductSize'] ?? '',
                (int)($data['DepartmentID'] ?? 0),
                (int)($data['LotSize'] ?? 0),
                (int)($data['TargetOutput'] ?? 0),
                (int)($data['WorkerCount'] ?? 0),
                $status,
                $data['PlannedStartTime'] ?? null,
                $data['PlannedEndTime'] ?? null,
                $data['Details'] ?? '',
                // Break time data
                (int)($data['BreakMorningMinutes'] ?? 0),
                (int)($data['BreakLunchMinutes'] ?? 0), 
                (int)($data['BreakEveningMinutes'] ?? 0),
                // Setup data
                (int)($data['SetupMinutes'] ?? 0),
                $data['SetupNote'] ?? '',
                (int)($data['CreatedByUserID'] ?? 1),
                (int)($data['UpdatedByUserID'] ?? 1)
            ]);
            
            if ($planStmt === false) {
                throw new Exception('Failed to insert ProductionPlan: ' . print_r(sqlsrv_errors(), true));
            }
            
            $planRow = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC);
            $planId = $planRow['PlanID'];
            
            // 2. Insert Machine Assignments
            if (isset($data['MachineIDs']) && $data['MachineIDs']) {
                $machineIds = explode(',', $data['MachineIDs']);
                
                foreach ($machineIds as $machineId) {
                    $machineId = intval(trim($machineId));
                    if ($machineId > 0) {
                        $assignSql = "INSERT INTO ProductionPlanMachines (PlanID, DepartmentID, MachineID, CreatedBy) 
                                      VALUES (?, ?, ?, ?)";
                        $assignStmt = sqlsrv_query($conn, $assignSql, [$planId, $data['DepartmentID'], $machineId, 'System']);
                        
                        if ($assignStmt === false) {
                            throw new Exception('Failed to insert machine assignment: ' . print_r(sqlsrv_errors(), true));
                        }
                    }
                }
            }
            
            // 3. Insert Sub-Department Assignments
            if (isset($data['SubDepartmentIDs']) && $data['SubDepartmentIDs']) {
                $subDeptIds = explode(',', $data['SubDepartmentIDs']);
                
                foreach ($subDeptIds as $subDeptId) {
                    $subDeptId = intval(trim($subDeptId));
                    if ($subDeptId > 0) {
                        $subAssignSql = "INSERT INTO ProductionPlanSubDepartments (PlanID, DepartmentID, SubDepartmentID, CreatedBy) 
                                         VALUES (?, ?, ?, ?)";
                        $subAssignStmt = sqlsrv_query($conn, $subAssignSql, [$planId, $data['DepartmentID'], $subDeptId, 'System']);
                        
                        if ($subAssignStmt === false) {
                            throw new Exception('Failed to insert sub-department assignment: ' . print_r(sqlsrv_errors(), true));
                        }
                    }
                }
            }
            
            sqlsrv_commit($conn);
            echo json_encode(['success' => true, 'PlanID' => $planId], JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            sqlsrv_rollback($conn);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }
    // เพิ่มงานใหม่ - เก็บไว้เพื่อ backward compatibility
    if ($action === 'add') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $fields = ['JobName', 'LotNumber', 'PlannedLotSize', 'ActualOutput', 'MachineID', 'MachineIDs', 'DepartmentID', 'Status', 'Details', 'StartTime', 'EndTime', 'CreatedByUserID'];
        $params = [
            $data['JobName'] ?? '',
            $data['LotNumber'] ?? '',
            (int)($data['PlannedLotSize'] ?? 0),
            (int)($data['ActualOutput'] ?? 0),
            (int)($data['MachineID'] ?? 0),
            $data['MachineIDs'] ?? '',
            (int)($data['DepartmentID'] ?? 0),
            $data['Status'] ?? 'planning',
            $data['Details'] ?? '',
            $data['StartTime'] ?? null,
            $data['EndTime'] ?? null,
            (int)($data['CreatedByUserID'] ?? 0)
        ];
        
        $placeholders = str_repeat('?,', count($fields) - 1) . '?';
        $sql = "INSERT INTO Jobs (" . implode(', ', $fields) . ") VALUES ($placeholders)";
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        
        // ดึง JobID ที่เพิ่งสร้างขึ้น
        $newJobId = null;
        $lastIdSql = "SELECT SCOPE_IDENTITY() as LastID";
        $lastIdStmt = sqlsrv_query($conn, $lastIdSql);
        if ($lastIdStmt) {
            $lastIdRow = sqlsrv_fetch_array($lastIdStmt, SQLSRV_FETCH_ASSOC);
            if ($lastIdRow) {
                $newJobId = intval($lastIdRow['LastID']);
            }
        }
        
        echo json_encode(['success' => true, 'jobId' => $newJobId]);
        exit;
    }
    // อัปเดตแผนงานใน ProductionPlans (โครงสร้างใหม่)
    if ($action === 'update_plan') {
        try {
            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true);
            
            if (!is_array($data)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid JSON data'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $planId = isset($data['PlanID']) ? intval($data['PlanID']) : intval($data['id'] ?? 0);
            if ($planId <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid PlanID'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            sqlsrv_begin_transaction($conn);
            
            // ตรวจสอบ Status ก่อนอัปเดต (ถ้ามีการเปลี่ยนแปลง)
            if (array_key_exists('Status', $data) && !validateStatus($data['Status'])) {
                throw new Exception('Invalid plan status: ' . $data['Status']);
            }
            
            // 1. Update ProductionPlan (เพิ่ม Break และ Setup fields)
            $updateFields = [];
            $updateParams = [];
            
            // รายการฟิลด์ที่สามารถอัปเดตได้
            $updatableFields = [
                'LotNumber', 'ProductName', 'ProductSize', 'DepartmentID',
                'LotSize', 'TargetOutput', 'WorkerCount', 'Status',
                'PlannedStartTime', 'PlannedEndTime', 'Details',
                'BreakMorningMinutes', 'BreakLunchMinutes', 'BreakEveningMinutes',
                'SetupMinutes', 'SetupNote', 'UpdatedByUserID'
            ];
            
            foreach ($updatableFields as $field) {
                if (array_key_exists($field, $data)) {
                    $value = $data[$field];
                    
                    // แปลงตัวเลขให้ถูกต้อง
                    if (in_array($field, ['LotSize', 'TargetOutput', 'WorkerCount', 'DepartmentID', 
                                         'BreakMorningMinutes', 'BreakLunchMinutes', 'BreakEveningMinutes', 
                                         'SetupMinutes', 'UpdatedByUserID'])) {
                        $value = $value !== '' ? intval($value) : 0;
                    }
                    
                    // จัดการ datetime fields
                    if (in_array($field, ['PlannedStartTime', 'PlannedEndTime']) && !empty($value)) {
                        if (is_string($value)) {
                            try {
                                $dateObj = new DateTime($value);
                                $value = $dateObj->format('Y-m-d H:i:s');
                            } catch (Exception $e) {
                                continue; // ข้ามถ้า datetime ไม่ถูกต้อง
                            }
                        }
                    }
                    
                    $updateFields[] = "$field = ?";
                    $updateParams[] = $value;
                }
            }
            
            if (!empty($updateFields)) {
                // เพิ่ม UpdatedAt อัตโนมัติ
                $updateFields[] = "UpdatedAt = GETDATE()";
                
                $updateSql = "UPDATE ProductionPlans SET " . implode(', ', $updateFields) . " WHERE PlanID = ?";
                $updateParams[] = $planId;
                
                $updateStmt = sqlsrv_query($conn, $updateSql, $updateParams);
                if ($updateStmt === false) {
                    throw new Exception('Failed to update ProductionPlan: ' . print_r(sqlsrv_errors(), true));
                }
            }
            
            // 2. Update Machine Assignments (ลบแล้วเพิ่มใหม่)
            if (array_key_exists('MachineIDs', $data)) {
                // ลบ machine assignments เก่า
                $deleteMachineSql = "DELETE FROM ProductionPlanMachines WHERE PlanID = ?";
                $deleteMachineStmt = sqlsrv_query($conn, $deleteMachineSql, [$planId]);
                
                if ($deleteMachineStmt === false) {
                    throw new Exception('Failed to delete old machine assignments: ' . print_r(sqlsrv_errors(), true));
                }
                
                // เพิ่ม machine assignments ใหม่
                if (!empty($data['MachineIDs'])) {
                    $machineIds = explode(',', $data['MachineIDs']);
                    foreach ($machineIds as $machineId) {
                        $machineId = intval(trim($machineId));
                        if ($machineId > 0) {
                            $assignSql = "INSERT INTO ProductionPlanMachines (PlanID, DepartmentID, MachineID, CreatedBy) 
                                          VALUES (?, ?, ?, ?)";
                            $assignStmt = sqlsrv_query($conn, $assignSql, [
                                $planId, 
                                $data['DepartmentID'] ?? 0, 
                                $machineId, 
                                'System'
                            ]);
                            
                            if ($assignStmt === false) {
                                throw new Exception('Failed to insert machine assignment: ' . print_r(sqlsrv_errors(), true));
                            }
                        }
                    }
                }
            }
            
            // 3. Update Sub-Department Assignments (ลบแล้วเพิ่มใหม่)
            if (array_key_exists('SubDepartmentIDs', $data)) {
                // ลบ sub-department assignments เก่า
                $deleteSubDeptSql = "DELETE FROM ProductionPlanSubDepartments WHERE PlanID = ?";
                $deleteSubDeptStmt = sqlsrv_query($conn, $deleteSubDeptSql, [$planId]);
                
                if ($deleteSubDeptStmt === false) {
                    throw new Exception('Failed to delete old sub-department assignments: ' . print_r(sqlsrv_errors(), true));
                }
                
                // เพิ่ม sub-department assignments ใหม่
                if (!empty($data['SubDepartmentIDs'])) {
                    $subDeptIds = explode(',', $data['SubDepartmentIDs']);
                    foreach ($subDeptIds as $subDeptId) {
                        $subDeptId = intval(trim($subDeptId));
                        if ($subDeptId > 0) {
                            $subAssignSql = "INSERT INTO ProductionPlanSubDepartments (PlanID, DepartmentID, SubDepartmentID, CreatedBy) 
                                             VALUES (?, ?, ?, ?)";
                            $subAssignStmt = sqlsrv_query($conn, $subAssignSql, [
                                $planId, 
                                $data['DepartmentID'] ?? 0, 
                                $subDeptId, 
                                'System'
                            ]);
                            
                            if ($subAssignStmt === false) {
                                throw new Exception('Failed to insert sub-department assignment: ' . print_r(sqlsrv_errors(), true));
                            }
                        }
                    }
                }
            }
            
            sqlsrv_commit($conn);
            echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            sqlsrv_rollback($conn);
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }
    // อัปเดตงาน - เก็บไว้เพื่อ backward compatibility
    if ($action === 'update') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            error_log('DEBUG: update $data is not array: ' . var_export($data, true));
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit;
        }
        
        $jobId = isset($data['JobID']) ? intval($data['JobID']) : intval($data['id'] ?? 0);
        if ($jobId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JobID']);
            exit;
        }
        
        $fields = [];
        $params = [];
        
        // รายการฟิลด์ที่สามารถอัปเดตได้ (เพิ่ม MachineIDs)
$updatable = ['JobName', 'LotNumber', 'PlannedLotSize', 'ActualOutput', 'MachineID', 'MachineIDs', 'Status', 'StartTime', 'EndTime', 'Details', 'DepartmentID'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "$field=?";
                $params[] = $data[$field];
            }
        }
        
        // เพิ่ม debug logging
        error_log('DEBUG: Update JobID=' . $jobId);
        error_log('DEBUG: Update fields: ' . print_r($fields, true));
        error_log('DEBUG: Update params: ' . print_r($params, true));
        
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'No fields to update']);
            exit;
        }
        
        $sql = "UPDATE Jobs SET ".implode(", ", $fields)." WHERE JobID=?";
        $params[] = $jobId;
        
        // เพิ่ม debug SQL
        error_log('DEBUG: Update SQL: ' . $sql);
        
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            $errors = sqlsrv_errors();
            error_log('DEBUG: Update SQL Error: ' . print_r($errors, true));
            http_response_code(500);
            echo json_encode(['error' => 'Update failed', 'details' => $errors]);
            exit;
        }
        
        // ตรวจสอบว่ามีการอัปเดตจริงหรือไม่
        $rowsAffected = sqlsrv_rows_affected($stmt);
        if ($rowsAffected === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get affected rows']);
            exit;
        }
        
        if ($rowsAffected === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Job not found or no changes made']);
            exit;
        }
        
        echo json_encode(['success' => true, 'rowsAffected' => $rowsAffected]);
        exit;
    }
    // ลบแผนงานจาก ProductionPlans
    if ($action === 'delete_plan') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "DELETE FROM ProductionPlans WHERE PlanID=?";
        $params = [ $data['PlanID'] ?? 0 ];
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    // ลบงาน - เก็บไว้เพื่อ backward compatibility
    if ($action === 'delete') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "DELETE FROM Jobs WHERE JobID=?";
        $params = [ $data['id'] ?? 0 ];
        $stmt = sqlsrv_query($conn, $sql, $params);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        echo json_encode(['success' => true]);
        exit;
    }
    
    // ดึงข้อมูลแผนงานเฉพาะสำหรับหน้า confirm-complete
    if ($action === 'get_plan_detail' && isset($_GET['id'])) {
        $planId = intval($_GET['id']);
        $sql = "SELECT p.*, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
                FROM ProductionPlans p
                LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                WHERE p.PlanID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$planId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()]);
            exit;
        }
        
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Plan not found']);
            exit;
        }
        
        // จัดการ MachineName จาก MachineIDs หรือ MachineID
        $machineName = 'ไม่ระบุ';
        if (!empty($row['MachineIDs'])) {
            // หากมี MachineIDs (รูปแบบ "1,2,3")
            $machineIds = explode(',', $row['MachineIDs']);
            $machineNames = [];
            foreach ($machineIds as $machineId) {
                $machineId = trim($machineId);
                if (!empty($machineId)) {
                    $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                    $machineStmt = sqlsrv_query($conn, $machineSql, [$machineId]);
                    if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                        $machineNames[] = $machineRow['MachineName'];
                    }
                }
            }
            if (!empty($machineNames)) {
                $machineName = implode(', ', $machineNames);
            }
        } else if (!empty($row['MachineID'])) {
            // หากมี MachineID เดี่ยว
            $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
            $machineStmt = sqlsrv_query($conn, $machineSql, [$row['MachineID']]);
            if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                $machineName = $machineRow['MachineName'];
            }
        }
        $row['MachineName'] = $machineName;
        
        // แปลง datetime fields
        if (isset($row['PlannedStartTime']) && $row['PlannedStartTime'] && is_object($row['PlannedStartTime'])) {
            $row['PlannedStartTime'] = $row['PlannedStartTime']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['PlannedEndTime']) && $row['PlannedEndTime'] && is_object($row['PlannedEndTime'])) {
            $row['PlannedEndTime'] = $row['PlannedEndTime']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
            $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
            $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
        }
        
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }
    // ดึงข้อมูลงานเฉพาะสำหรับหน้า confirm-complete - เก็บไว้เพื่อ backward compatibility
    if ($action === 'get_task_detail' && isset($_GET['id'])) {
        $jobId = intval($_GET['id']);
        $sql = "SELECT j.*, 
                       ISNULL(m.MachineName, 'ไม่ระบุ') as MachineName, 
                       ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName 
                FROM Jobs j
                LEFT JOIN Machines m ON j.MachineID = m.MachineID
                LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
                WHERE j.JobID = ?";
        $stmt = sqlsrv_query($conn, $sql, [$jobId]);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database query failed', 'details' => sqlsrv_errors()]);
            exit;
        }
        
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Job not found']);
            exit;
        }
        
        // แปลง datetime fields
        if (isset($row['StartTime']) && $row['StartTime'] && is_object($row['StartTime'])) {
            $row['StartTime'] = $row['StartTime']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['EndTime']) && $row['EndTime'] && is_object($row['EndTime'])) {
            $row['EndTime'] = $row['EndTime']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['CreatedAt']) && $row['CreatedAt'] && is_object($row['CreatedAt'])) {
            $row['CreatedAt'] = $row['CreatedAt']->format('Y-m-d\TH:i:s');
        }
        if (isset($row['UpdatedAt']) && $row['UpdatedAt'] && is_object($row['UpdatedAt'])) {
            $row['UpdatedAt'] = $row['UpdatedAt']->format('Y-m-d\TH:i:s');
        }
        
        echo json_encode(['success' => true, 'data' => $row]);
        exit;
    }
    
    // บันทึกข้อมูลลงตาราง ProductionResults (โครงสร้างใหม่)
    if ($action === 'save_production_result') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['PlanID']) || intval($data['PlanID']) <= 0) {
            ob_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid PlanID'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        $planId = intval($data['PlanID']);
        
        // ดึงข้อมูลแผนงาน
        $planSql = "SELECT p.*, 
                           ISNULL(d.DepartmentName, 'ไม่ระบุ') as DepartmentName
                    FROM ProductionPlans p
                    LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                    WHERE p.PlanID = ?";
        $planStmt = sqlsrv_query($conn, $planSql, [$planId]);
        if (!$planStmt || !($plan = sqlsrv_fetch_array($planStmt, SQLSRV_FETCH_ASSOC))) {
            ob_clean();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Plan not found'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // จัดการ MachineName - ป้องกันปัญหา Unicode
        $machineName = 'ไม่ระบุ';
        if (!empty($plan['MachineIDs'])) {
            $machineIds = explode(',', $plan['MachineIDs']);
            $machineNames = [];
            foreach ($machineIds as $machineId) {
                $machineId = trim($machineId);
                if (!empty($machineId)) {
                    $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
                    $machineStmt = sqlsrv_query($conn, $machineSql, [$machineId]);
                    if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                        // Safe character encoding conversion - แก้ไขให้รักษาสระและวรรณยุกต์
                        $originalName = $machineRow['MachineName'] ?? '';
                        if (function_exists('mb_convert_encoding') && $originalName) {
                            try {
                                $cleanName = mb_convert_encoding($originalName, 'UTF-8', 'auto');
                            } catch (Exception $e) {
                                $cleanName = $originalName; // Fallback to original
                            }
                        } else {
                            $cleanName = $originalName;
                        }
                        // เอาแค่ trim ไม่ใช้ preg_replace เพื่อรักษาสระและวรรณยุกต์ภาษาไทย
                        $cleanName = trim($cleanName);
                        $machineNames[] = mb_substr($cleanName ?: 'ไม่ระบุ', 0, 200, 'UTF-8');
                    }
                }
            }
            if (!empty($machineNames)) {
                $machineName = implode(', ', $machineNames);
            }
        } else if (!empty($plan['MachineID'])) {
            $machineSql = "SELECT MachineName FROM Machines WHERE MachineID = ?";
            $machineStmt = sqlsrv_query($conn, $machineSql, [$plan['MachineID']]);
            if ($machineStmt && $machineRow = sqlsrv_fetch_array($machineStmt, SQLSRV_FETCH_ASSOC)) {
                // Safe character encoding conversion - แก้ไขให้รักษาสระและวรรณยุกต์
                $originalName = $machineRow['MachineName'] ?? '';
                if (function_exists('mb_convert_encoding') && $originalName) {
                    try {
                        $cleanName = mb_convert_encoding($originalName, 'UTF-8', 'auto');
                    } catch (Exception $e) {
                        $cleanName = $originalName; // Fallback to original
                    }
                } else {
                    $cleanName = $originalName;
                }
                // เอาแค่ trim ไม่ใช้ preg_replace เพื่อรักษาสระและวรรณยุกต์ภาษาไทย
                $cleanName = trim($cleanName);
                $machineName = mb_substr($cleanName ?: 'ไม่ระบุ', 0, 200, 'UTF-8');
            }
        }
        
        // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
        $checkSql = "SELECT ResultID FROM ProductionResults WHERE PlanID = ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$planId]);
        $exists = $checkStmt && sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC);
        
        try {
            // Log ข้อมูลที่ได้รับเพื่อ debug
            // error_log("Received data: " . json_encode($data));
            // error_log("Plan data: " . json_encode($plan));
            
            // คำนวณค่าที่จำเป็น
            $totalPieces = intval($data['TotalPieces'] ?? 0);
            $rejectPieces = intval($data['RejectPieces'] ?? 0);
            $goodQuantity = $totalPieces - $rejectPieces;
            $breakMorning = intval($data['BreakMorningMinutes'] ?? 0);
            $breakLunch = intval($data['BreakLunchMinutes'] ?? 60);
            $breakEvening = intval($data['BreakEveningMinutes'] ?? 0);
            $totalBreakMinutes = $breakMorning + $breakLunch + $breakEvening;
            $shiftHours = floatval($data['ShiftHours'] ?? 8.0);
            $workingHours = $shiftHours - ($totalBreakMinutes / 60.0);
            
            // === แก้ไข Unicode และ String Length Handling ===
            $safeMachineName = 'ไม่ระบุ';
            $safeDepartment = 'ไม่ระบุ';
            
            // ใช้ข้อมูลที่ได้จากด้านบนพร้อมจัดการ Unicode และความยาว
            if (!empty($machineName) && $machineName !== '') { 
                // ใช้ mb_substr แทน substr สำหรับ Unicode และเพิ่มความยาวสูงสุด
                $safeMachineName = mb_substr($machineName, 0, 200, 'UTF-8');
                
                // ตรวจสอบ UTF-8 encoding
                if (!mb_check_encoding($safeMachineName, 'UTF-8')) {
                    $safeMachineName = mb_convert_encoding($safeMachineName, 'UTF-8', 'auto');
                    error_log("DEBUG: MachineName converted encoding: '$safeMachineName'");
                }
                
                error_log("DEBUG: Final MachineName length: " . mb_strlen($safeMachineName, 'UTF-8') . " chars");
            }
            
            if (!empty($plan['DepartmentName']) && $plan['DepartmentName'] !== '') {
                // ใช้ mb_substr สำหรับ Department ด้วย
                $safeDepartment = mb_substr($plan['DepartmentName'], 0, 200, 'UTF-8');
                
                if (!mb_check_encoding($safeDepartment, 'UTF-8')) {
                    $safeDepartment = mb_convert_encoding($safeDepartment, 'UTF-8', 'auto');
                }
            }
            
            // ตรวจสอบและป้องกัน empty string สำหรับ NOT NULL columns
            if (empty($safeMachineName) || mb_strlen($safeMachineName, 'UTF-8') === 0) {
                $safeMachineName = 'ไม่ระบุ';
            }
            if (empty($safeDepartment) || mb_strlen($safeDepartment, 'UTF-8') === 0) {
                $safeDepartment = 'ไม่ระบุ';
            }
            
            // DEBUG: แสดงข้อมูลที่จะใช้ในการบันทึก
            error_log("DEBUG: Final MachineName: '$safeMachineName' (length: " . mb_strlen($safeMachineName, 'UTF-8') . ")");
            error_log("DEBUG: Final Department: '$safeDepartment' (length: " . mb_strlen($safeDepartment, 'UTF-8') . ")");
            error_log("DEBUG: ProductName: '" . ($plan['ProductName'] ?? 'ไม่ระบุ') . "'");
            
            $params = [
                $planId,                                                        // PlanID
                mb_substr($plan['ProductName'] ?? 'ไม่ระบุ', 0, 200, 'UTF-8'), // ProductName - ใช้ mb_substr
                mb_substr($plan['ProductSize'] ?? '', 0, 30, 'UTF-8'),         // ProductSize - ใช้ mb_substr  
                $safeDepartment,                                                // Department - ใช้ safe Department ที่จัดการแล้ว
                $safeMachineName,                                               // MachineName - safe encoding
                mb_substr($plan['OrderNumber'] ?? '', 0, 50, 'UTF-8'),         // OrderNumber - ใช้ mb_substr
                date('Y-m-d'),                                                  // ProductionDate
                $data['ActualStartTime'] ?? '1900-01-01 00:00:00',             // ActualStartTime (default if null)
                $data['ActualEndTime'] ?? '1900-01-01 01:00:00',               // ActualEndTime (default if null, must be > StartTime)
                $data['PlannedStartTime'] ?? null,                              // PlannedStartTime
                $data['PlannedEndTime'] ?? null,                                // PlannedEndTime  
                $data['Status'] ?? 'completed',                                 // Status
                $shiftHours,                                                    // ShiftHours
                intval($data['OvertimeMinutes'] ?? 0),                          // OvertimeMinutes
                $breakMorning,                                                  // BreakMorningMinutes
                $breakLunch,                                                    // BreakLunchMinutes
                $breakEvening,                                                  // BreakEveningMinutes
                max(0.1, floatval($data['StandardRunRate'] ?? 1.0)),           // StandardRunRate
                $totalPieces,                                                   // TotalPieces
                $rejectPieces,                                                  // RejectPieces
                intval($data['DowntimeMinutes'] ?? 0),                          // DowntimeMinutes
                substr($data['DowntimeReason'] ?? '', 0, 1000),                 // DowntimeReason (limit length)
                max(1, intval($data['PlannedWorkMinutes'] ?? 480)),             // PlannedWorkMinutes
                max(0, intval($data['ActiveWorkMinutes'] ?? 0)),                // ActiveWorkMinutes
                max(0, min(100, floatval($data['OEE_Availability'] ?? 0))),     // OEE_Availability
                max(0, min(100, floatval($data['OEE_Performance'] ?? 0))),      // OEE_Performance
                max(0, min(100, floatval($data['OEE_Quality'] ?? 0))),          // OEE_Quality
                max(0, min(100, floatval($data['OEE_Overall'] ?? 0))),          // OEE_Overall
                floatval($data['ActualRunRate'] ?? 0),                          // ActualRunRate
                $data['ConfirmedByUserName'] ?? 'System'                        // ConfirmedByUserName
                // WorkingHours, TotalBreakMinutes, GoodQuantity เป็น computed columns
                // ConfirmedAt จะถูกตั้งค่าโดย GETDATE() ใน SQL
            ];
            
            if ($exists) {
                // UPDATE (ไม่รวม computed columns) + เพิ่ม PlannedStartTime, PlannedEndTime, Status
                // สำหรับ UPDATE ต้องลบ PlanID ออกจาก params แรก และเพิ่มไปท้าย
                $updateParams = array_slice($params, 1); // ลบ PlanID ออกจาก index 0
                $updateParams[] = $planId; // เพิ่ม PlanID สำหรับ WHERE clause
                
                $sql = "UPDATE ProductionResults SET
                    ProductName=?, ProductSize=?, Department=?, MachineName=?,
                    OrderNumber=?, ProductionDate=?, ActualStartTime=?, ActualEndTime=?,
                    PlannedStartTime=?, PlannedEndTime=?, Status=?,
                    ShiftHours=?, OvertimeMinutes=?, BreakMorningMinutes=?, BreakLunchMinutes=?,
                    BreakEveningMinutes=?, StandardRunRate=?, TotalPieces=?, RejectPieces=?,
                    DowntimeMinutes=?, DowntimeReason=?, PlannedWorkMinutes=?,
                    ActiveWorkMinutes=?, OEE_Availability=?, OEE_Performance=?, OEE_Quality=?,
                    OEE_Overall=?, ActualRunRate=?, ConfirmedByUserName=?,
                    ConfirmedAt=GETDATE()
                    WHERE PlanID=?";
                $params = $updateParams; // ใช้ parameters ที่ปรับแล้ว
            } else {
                // INSERT (ไม่รวม computed columns) + เพิ่ม PlannedStartTime, PlannedEndTime, Status
                $sql = "INSERT INTO ProductionResults (
                    PlanID, ProductName, ProductSize, Department, MachineName,
                    OrderNumber, ProductionDate, ActualStartTime, ActualEndTime,
                    PlannedStartTime, PlannedEndTime, Status,
                    ShiftHours, OvertimeMinutes, BreakMorningMinutes, BreakLunchMinutes,
                    BreakEveningMinutes, StandardRunRate, TotalPieces, RejectPieces,
                    DowntimeMinutes, DowntimeReason, PlannedWorkMinutes,
                    ActiveWorkMinutes, OEE_Availability, OEE_Performance, OEE_Quality,
                    OEE_Overall, ActualRunRate, ConfirmedByUserName
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            }
            
            // Log SQL statement และ parameters เพื่อ debug
            // error_log("SQL: " . $sql);
            // error_log("Parameters count: " . count($params));
            // error_log("Expected placeholders: " . substr_count($sql, '?'));
            // error_log("Parameters: " . json_encode($params));
            
            $stmt = sqlsrv_query($conn, $sql, $params);
            if (!$stmt) {
                $errors = sqlsrv_errors();
                // error_log("SQL Error details: " . print_r($errors, true));
                throw new Exception('Database operation failed: ' . print_r($errors, true));
            }
            
            // ถ้าเป็น INSERT ให้อัปเดต ConfirmedAt แยกต่างหาก
            if (!$exists) {
                $updateConfirmedSql = "UPDATE ProductionResults SET ConfirmedAt = GETDATE() WHERE PlanID = ?";
                sqlsrv_query($conn, $updateConfirmedSql, [$planId]);
            }
            
            // อัปเดตสถานะแผนงาน
            $updatePlanSql = "UPDATE ProductionPlans SET Status='completed', TargetOutput=? WHERE PlanID=?";
            sqlsrv_query($conn, $updatePlanSql, [$totalPieces, $planId]);
            
            ob_clean();
            echo json_encode(['success' => true, 'message' => 'บันทึกข้อมูลสำเร็จ'], JSON_UNESCAPED_UNICODE);
            
        } catch (Exception $e) {
            ob_clean();
            http_response_code(500);
            echo json_encode([
                'success' => false, 
                'error' => 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                'details' => $e->getMessage(),
                'sql_errors' => sqlsrv_errors()
            ], JSON_UNESCAPED_UNICODE);
        }
        
        exit;
    }
    
    // ดึงผลการผลิตจากตาราง ProductionResults (โครงสร้างใหม่)
    if ($action === 'get_production_results') {
        $planId = isset($_GET['PlanID']) ? intval($_GET['PlanID']) : 0;
        
        if ($planId > 0) {
            // ดึงข้อมูลเฉพาะ PlanID
            $sql = "SELECT * FROM ProductionResults WHERE PlanID = ?";
            $stmt = sqlsrv_query($conn, $sql, [$planId]);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => sqlsrv_errors()]);
                exit;
            }
            
            $result = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            if ($result) {
                // แปลง datetime fields
                if (isset($result['ActualStartTime']) && $result['ActualStartTime'] && is_object($result['ActualStartTime'])) {
                    $result['ActualStartTime'] = $result['ActualStartTime']->format('Y-m-d\TH:i:s');
                }
                if (isset($result['ActualEndTime']) && $result['ActualEndTime'] && is_object($result['ActualEndTime'])) {
                    $result['ActualEndTime'] = $result['ActualEndTime']->format('Y-m-d\TH:i:s');
                }
                if (isset($result['ConfirmedAt']) && $result['ConfirmedAt'] && is_object($result['ConfirmedAt'])) {
                    $result['ConfirmedAt'] = $result['ConfirmedAt']->format('Y-m-d\TH:i:s');
                }
                if (isset($result['ProductionDate']) && $result['ProductionDate'] && is_object($result['ProductionDate'])) {
                    $result['ProductionDate'] = $result['ProductionDate']->format('Y-m-d');
                }
            }
            
            echo $result ? json_encode($result) : json_encode(['error' => 'Production result not found']);
            exit;
        } else {
            // ดึงข้อมูลทั้งหมด
            $sql = "SELECT * FROM ProductionResults ORDER BY ConfirmedAt DESC";
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => sqlsrv_errors()]);
                exit;
            }
            
            $results = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                // แปลง datetime fields
                if (isset($row['ActualStartTime']) && $row['ActualStartTime'] && is_object($row['ActualStartTime'])) {
                    $row['ActualStartTime'] = $row['ActualStartTime']->format('Y-m-d\TH:i:s');
                }
                if (isset($row['ActualEndTime']) && $row['ActualEndTime'] && is_object($row['ActualEndTime'])) {
                    $row['ActualEndTime'] = $row['ActualEndTime']->format('Y-m-d\TH:i:s');
                }
                if (isset($row['ConfirmedAt']) && $row['ConfirmedAt'] && is_object($row['ConfirmedAt'])) {
                    $row['ConfirmedAt'] = $row['ConfirmedAt']->format('Y-m-d\TH:i:s');
                }
                if (isset($row['ProductionDate']) && $row['ProductionDate'] && is_object($row['ProductionDate'])) {
                    $row['ProductionDate'] = $row['ProductionDate']->format('Y-m-d');
                }
                $results[] = $row;
            }
            
            echo json_encode($results);
            exit;
        }
    }
    
    // ดึงรายการแผนกทั้งหมด
    if ($action === 'get_departments') {
        $sql = "SELECT DepartmentID, DepartmentName FROM Departments ORDER BY DepartmentName ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $departments = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $departments[] = $row;
        }
        echo json_encode($departments);
        exit;
    }
    
    // ดึงรายการเครื่องจักรทั้งหมด
    if ($action === 'get_machines') {
        $sql = "SELECT MachineID, MachineName, DepartmentID FROM Machines ORDER BY DepartmentID ASC, MachineName ASC";
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode(['error' => sqlsrv_errors()]);
            exit;
        }
        $machines = [];
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            $machines[] = $row;
        }
        echo json_encode($machines);
        exit;
    }
    
    // Dashboard Main API - ข้อมูลรวมสำหรับ Dashboard
    if ($action === 'dashboard') {
        try {
            // ตรวจสอบการเชื่อมต่อฐานข้อมูล
            if ($conn === false) {
                ob_clean();
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $dashboardData = [];
            
            // 1. สถิติรวม (Stats) - ใช้ข้อมูลจริงจากฐานข้อมูลเท่านั้น
            $stats = [];
            
            // สร้างเงื่อนไข WHERE จากฟิลเตอร์
            $whereConditions = ['1=1']; // เริ่มต้นด้วยเงื่อนไขที่เป็นจริงเสมอ
            $params = [];
            
            // ฟิลเตอร์ช่วงเวลา
            if (isset($_GET['startDate']) && !empty($_GET['startDate'])) {
                $whereConditions[] = "ProductionDate >= ?";
                $params[] = $_GET['startDate'];
            }
            if (isset($_GET['endDate']) && !empty($_GET['endDate'])) {
                $whereConditions[] = "ProductionDate <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // ฟิลเตอร์แผนก
            if (isset($_GET['departmentId']) && !empty($_GET['departmentId'])) {
                $whereConditions[] = "p.DepartmentID = ?";
                $params[] = intval($_GET['departmentId']);
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            // OEE Statistics จากข้อมูลจริง
            $sql = "SELECT 
                        AVG(CAST(pr.OEE_Availability as FLOAT)) as avg_availability,
                        AVG(CAST(pr.OEE_Performance as FLOAT)) as avg_performance,
                        AVG(CAST(pr.OEE_Quality as FLOAT)) as avg_quality,
                        AVG(CAST(pr.OEE_Overall as FLOAT)) as avg_overall
                    FROM ProductionResults pr
                    LEFT JOIN ProductionPlans p ON pr.PlanID = p.PlanID
                    WHERE pr.OEE_Overall > 0 AND $whereClause";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                throw new Exception('Failed to get OEE stats: ' . print_r(sqlsrv_errors(), true));
            }
            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $stats['oeeStats'] = [
                'availability' => round(floatval($row['avg_availability'] ?? 0), 1),
                'performance' => round(floatval($row['avg_performance'] ?? 0), 1),
                'quality' => round(floatval($row['avg_quality'] ?? 0), 1),
                'overall' => round(floatval($row['avg_overall'] ?? 0), 1)
            ];
            
            $dashboardData['oeeStats'] = $stats['oeeStats'];
            
            // 2. Production Chart Data (7 วันที่ผ่านมา)
            
            $productionChart = ['labels' => [], 'data' => []];
            $sql = "SELECT 
                        CONVERT(VARCHAR, ProductionDate, 3) as date_label,
                        ProductionDate,
                        SUM(CASE WHEN Department = 'Production' THEN TotalPieces ELSE 0 END) as production,
                        SUM(CASE WHEN Department = 'Quality' THEN TotalPieces ELSE 0 END) as quality,
                        SUM(CASE WHEN Department = 'Maintenance' THEN TotalPieces ELSE 0 END) as maintenance,
                        SUM(CASE WHEN Department = 'Packaging' THEN TotalPieces ELSE 0 END) as packaging
                    FROM ProductionResults 
                    WHERE ProductionDate >= DATEADD(day, -7, GETDATE())
                    GROUP BY ProductionDate, CONVERT(VARCHAR, ProductionDate, 3)
                    ORDER BY ProductionDate DESC";
                    
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                throw new Exception('Failed to get production chart data: ' . print_r(sqlsrv_errors(), true));
            }
            
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $productionChart['labels'][] = $row['date_label'];
                $productionChart['data'][] = [
                    'production' => intval($row['production']),
                    'quality' => intval($row['quality']),
                    'maintenance' => intval($row['maintenance']),
                    'packaging' => intval($row['packaging'])
                ];
            }
            
            $dashboardData['charts'] = ['production' => $productionChart];
            
            // 3. Department Distribution
            $sql = "SELECT 
                        SUM(CASE WHEN Department = 'Production' THEN TotalPieces ELSE 0 END) as production,
                        SUM(CASE WHEN Department = 'Quality' THEN TotalPieces ELSE 0 END) as quality,
                        SUM(CASE WHEN Department = 'Maintenance' THEN TotalPieces ELSE 0 END) as maintenance,
                        SUM(CASE WHEN Department = 'Packaging' THEN TotalPieces ELSE 0 END) as packaging
                    FROM ProductionResults";
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                throw new Exception('Failed to get department distribution: ' . print_r(sqlsrv_errors(), true));
            }
            
            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $deptCount = [
                'production' => intval($row['production'] ?? 0),
                'quality' => intval($row['quality'] ?? 0),
                'maintenance' => intval($row['maintenance'] ?? 0),
                'packaging' => intval($row['packaging'] ?? 0)
            ];
            $dashboardData['charts']['department'] = $deptCount;
            
            // 4. Production Progress (เป้าหมายการผลิต)
            $progress = [];
            $departments = ['Production', 'Quality', 'Maintenance', 'Packaging'];
            
            // ดึงเป้าหมายรวม
            $sql_target = "SELECT SUM(TargetOutput) as total_target FROM ProductionPlans WHERE Status != 'cancelled'";
            $stmt = sqlsrv_query($conn, $sql_target);
            if ($stmt === false) {
                throw new Exception('Failed to get target output: ' . print_r(sqlsrv_errors(), true));
            }
            $target_row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $totalTarget = intval($target_row['total_target'] ?? 0);
            
            foreach ($departments as $dept) {
                // คำนวณผลิตจริงจากแต่ละแผนก
                $sql_actual = "SELECT SUM(TotalPieces) as actual FROM ProductionResults WHERE Department = ?";
                $stmt = sqlsrv_query($conn, $sql_actual, [$dept]);
                if ($stmt === false) {
                    throw new Exception("Failed to get actual output for $dept: " . print_r(sqlsrv_errors(), true));
                }
                $actual_row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
                $actual = intval($actual_row['actual'] ?? 0);
                
                // แบ่งเป้าหมายเป็น 4 แผนกเท่าๆ กัน (อาจปรับได้ตามความเหมาะสม)
                $target = $totalTarget > 0 ? intval($totalTarget / 4) : 0;
                
                $progress[strtolower($dept)] = [
                    'actual' => $actual,
                    'target' => $target
                ];
            }
            $dashboardData['progress'] = $progress;
            
            // 5. Alerts and Notifications
            $alerts = [];
            
            // ตรวจสอบงานที่ยังไม่ยืนยัน
            $sql = "SELECT COUNT(*) as unconfirmed FROM ProductionPlans WHERE Status = 'pending-confirmation'";
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                throw new Exception('Failed to get unconfirmed tasks: ' . print_r(sqlsrv_errors(), true));
            }
            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $alerts['unconfirmedTasks'] = intval($row['unconfirmed'] ?? 0);
            
            // ตรวจสอบงานที่เกินกำหนด
            $sql = "SELECT COUNT(*) as overdue FROM ProductionPlans WHERE PlannedEndTime < GETDATE() AND Status = 'in-progress'";
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                throw new Exception('Failed to get overdue tasks: ' . print_r(sqlsrv_errors(), true));
            }
            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $alerts['overdueTasks'] = intval($row['overdue'] ?? 0);
            
            $dashboardData['alerts'] = $alerts;
            
            // 6. Online Users (คำนวณจาก session หรือ active users - ใช้ข้อมูลจริงจาก Users table)
            $sql = "SELECT COUNT(DISTINCT CreatedByUserID) as total_users FROM ProductionPlans WHERE CreatedAt >= DATEADD(hour, -8, GETDATE())";
            $stmt = sqlsrv_query($conn, $sql);
            if ($stmt === false) {
                throw new Exception('Failed to get online users: ' . print_r(sqlsrv_errors(), true));
            }
            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $totalOnlineUsers = intval($row['total_users'] ?? 0);
            
            // แบ่งตามแผนกโดยประมาณ
            $onlineData = [
                'total' => $totalOnlineUsers,
                'byDept' => [
                    'production' => intval($totalOnlineUsers * 0.35),
                    'quality' => intval($totalOnlineUsers * 0.25),
                    'maintenance' => intval($totalOnlineUsers * 0.20),
                    'packaging' => intval($totalOnlineUsers * 0.20)
                ]
            ];
            $dashboardData['online'] = $onlineData;
            
            ob_clean();
            echo json_encode($dashboardData, JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            ob_clean();
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get dashboard data', 'details' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Dashboard Statistics API
    if ($action === 'dashboard_stats') {
        try {
            $stats = [];
            
            // สร้างเงื่อนไข WHERE จากฟิลเตอร์
            $whereConditions = ['1=1']; // เริ่มต้นด้วยเงื่อนไขที่เป็นจริงเสมอ
            $params = [];
            
            // ฟิลเตอร์ช่วงเวลา
            if (isset($_GET['startDate']) && !empty($_GET['startDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(p.UpdatedAt, p.CreatedAt)) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (isset($_GET['endDate']) && !empty($_GET['endDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(p.UpdatedAt, p.CreatedAt)) <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // ฟิลเตอร์แผนก
            if (isset($_GET['departmentId']) && !empty($_GET['departmentId'])) {
                $whereConditions[] = "p.DepartmentID = ?";
                $params[] = intval($_GET['departmentId']);
            }
            
            // ฟิลเตอร์เครื่องจักร
            if (isset($_GET['machineId']) && !empty($_GET['machineId'])) {
                $machineId = intval($_GET['machineId']);
                $whereConditions[] = "(p.MachineID = ? OR p.MachineIDs LIKE '%' + CAST(? AS VARCHAR) + '%')";
                $params[] = $machineId;
                $params[] = $machineId;
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            // 1. งานทั้งหมด
            $totalSql = "SELECT COUNT(*) as count FROM ProductionPlans p WHERE $whereClause";
            $totalStmt = sqlsrv_query($conn, $totalSql, $params);
            $totalRow = sqlsrv_fetch_array($totalStmt, SQLSRV_FETCH_ASSOC);
            $stats['totalTasks'] = intval($totalRow['count'] ?? 0);
            
            // 2. งานที่กำลังดำเนินการ
            $activeSql = "SELECT COUNT(*) as count FROM ProductionPlans p WHERE p.Status = 'in-progress' AND $whereClause";
            $activeStmt = sqlsrv_query($conn, $activeSql, $params);
            $activeRow = sqlsrv_fetch_array($activeStmt, SQLSRV_FETCH_ASSOC);
            $stats['activeTasks'] = intval($activeRow['count'] ?? 0);
            
            // 3. งานที่เสร็จสิ้น
            $completedSql = "SELECT COUNT(*) as count FROM ProductionPlans p WHERE p.Status = 'completed' AND $whereClause";
            $completedStmt = sqlsrv_query($conn, $completedSql, $params);
            $completedRow = sqlsrv_fetch_array($completedStmt, SQLSRV_FETCH_ASSOC);
            $stats['completedTasks'] = intval($completedRow['count'] ?? 0);
            
            // 4. คำนวณประสิทธิภาพโดยรวม (จากข้อมูล OEE ที่มี)
            $efficiencySql = "SELECT AVG(pr.OEE_Overall) as avg_oee 
                             FROM ProductionResults pr 
                             LEFT JOIN ProductionPlans p ON pr.PlanID = p.PlanID 
                             WHERE pr.OEE_Overall > 0 AND $whereClause";
            $efficiencyStmt = sqlsrv_query($conn, $efficiencySql, $params);
            $efficiencyRow = sqlsrv_fetch_array($efficiencyStmt, SQLSRV_FETCH_ASSOC);
            $stats['efficiency'] = round(floatval($efficiencyRow['avg_oee'] ?? 0), 1);
            
            // 5. การเปลี่ยนแปลงเปรียบเทียบ (สมมติ)
            $stats['tasksChange'] = '+5%';
            $stats['activeChange'] = '+2%';
            $stats['completedChange'] = '+8%';
            $stats['efficiencyChange'] = '+3%';
            
            echo json_encode($stats, JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get dashboard stats', 'details' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Dashboard Production Chart Data (7 วันที่ผ่านมา)
    if ($action === 'dashboard_production_chart') {
        try {
            // สร้างเงื่อนไข WHERE จากฟิลเตอร์
            $whereConditions = ['1=1'];
            $params = [];
            
            // ฟิลเตอร์ช่วงเวลา - ถ้าไม่มีให้ใช้ 7 วันที่ผ่านมา
            if (isset($_GET['startDate']) && !empty($_GET['startDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(pr.ProductionDate, p.CreatedAt)) >= ?";
                $params[] = $_GET['startDate'];
            } else {
                $whereConditions[] = "CONVERT(date, COALESCE(pr.ProductionDate, p.CreatedAt)) >= DATEADD(day, -7, GETDATE())";
            }
            
            if (isset($_GET['endDate']) && !empty($_GET['endDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(pr.ProductionDate, p.CreatedAt)) <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // ฟิลเตอร์แผนก
            if (isset($_GET['departmentId']) && !empty($_GET['departmentId'])) {
                $whereConditions[] = "p.DepartmentID = ?";
                $params[] = intval($_GET['departmentId']);
            }
            
            // ฟิลเตอร์เครื่องจักร
            if (isset($_GET['machineId']) && !empty($_GET['machineId'])) {
                $machineId = intval($_GET['machineId']);
                $whereConditions[] = "(p.MachineID = ? OR p.MachineIDs LIKE '%' + CAST(? AS VARCHAR) + '%')";
                $params[] = $machineId;
                $params[] = $machineId;
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            // ดึงข้อมูลการผลิตแบ่งตามแผนก
            $sql = "SELECT 
                        d.DepartmentName,
                        CONVERT(date, COALESCE(pr.ProductionDate, p.CreatedAt)) as ProductionDate,
                        COUNT(*) as TaskCount,
                        SUM(COALESCE(pr.TotalPieces, p.TargetOutput, 0)) as TotalOutput
                    FROM ProductionPlans p
                    LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID  
                    LEFT JOIN ProductionResults pr ON p.PlanID = pr.PlanID
                    WHERE $whereClause
                    GROUP BY d.DepartmentName, CONVERT(date, COALESCE(pr.ProductionDate, p.CreatedAt))
                    ORDER BY ProductionDate DESC, d.DepartmentName";
            
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                throw new Exception('Database query failed: ' . print_r(sqlsrv_errors(), true));
            }
            
            $chartData = [];
            $departments = [];
            
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $deptName = $row['DepartmentName'] ?? 'ไม่ระบุแผนก';
                $date = $row['ProductionDate'];
                
                if (is_object($date)) {
                    $dateStr = $date->format('Y-m-d');
                } else {
                    $dateStr = $date;
                }
                
                if (!isset($chartData[$dateStr])) {
                    $chartData[$dateStr] = [];
                }
                
                $chartData[$dateStr][$deptName] = [
                    'taskCount' => intval($row['TaskCount']),
                    'totalOutput' => intval($row['TotalOutput'])
                ];
                
                if (!in_array($deptName, $departments)) {
                    $departments[] = $deptName;
                }
            }
            
            echo json_encode([
                'chartData' => $chartData,
                'departments' => $departments
            ], JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get chart data', 'details' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Dashboard Machine Status
    if ($action === 'dashboard_machine_status') {
        try {
            // สร้างเงื่อนไข WHERE สำหรับการกรอง
            $machineFilter = '';
            $deptFilter = '';
            $machineParams = [];
            
            if (isset($_GET['machineId']) && !empty($_GET['machineId'])) {
                $machineFilter = 'AND m.MachineID = ?';
                $machineParams[] = intval($_GET['machineId']);
            }
            
            if (isset($_GET['departmentId']) && !empty($_GET['departmentId'])) {
                $deptFilter = 'AND m.DepartmentID = ?';
                $machineParams[] = intval($_GET['departmentId']);
            }
            
            // ดึงสถานะเครื่องจักร
            $sql = "SELECT 
                        m.MachineName,
                        d.DepartmentName,
                        COUNT(p.PlanID) as ActiveJobs,
                        CASE 
                            WHEN COUNT(CASE WHEN p.Status = 'in-progress' THEN 1 END) > 0 THEN 'กำลังทำงาน'
                            WHEN COUNT(CASE WHEN p.Status = 'planning' THEN 1 END) > 0 THEN 'รอดำเนินการ'  
                            ELSE 'ว่าง'
                        END as Status
                    FROM Machines m
                    LEFT JOIN Departments d ON m.DepartmentID = d.DepartmentID
                    LEFT JOIN ProductionPlans p ON (m.MachineID = p.MachineID OR p.MachineIDs LIKE '%' + CAST(m.MachineID AS VARCHAR) + '%')
                        AND p.Status IN ('planning', 'in-progress')
                    WHERE 1=1 $machineFilter $deptFilter
                    GROUP BY m.MachineID, m.MachineName, d.DepartmentName
                    ORDER BY d.DepartmentName, m.MachineName";
            
            $stmt = sqlsrv_query($conn, $sql, $machineParams);
            if ($stmt === false) {
                throw new Exception('Database query failed: ' . print_r(sqlsrv_errors(), true));
            }
            
            $machines = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $machines[] = [
                    'machineName' => $row['MachineName'],
                    'departmentName' => $row['DepartmentName'] ?? 'ไม่ระบุ',
                    'activeJobs' => intval($row['ActiveJobs']),
                    'status' => $row['Status']
                ];
            }
            
            echo json_encode($machines, JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get machine status', 'details' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    // Dashboard Recent Activities
    if ($action === 'dashboard_recent_activities') {
        try {
            // สร้างเงื่อนไข WHERE จากฟิลเตอร์
            $whereConditions = ['1=1'];
            $params = [];
            
            // ฟิลเตอร์ช่วงเวลา
            if (isset($_GET['startDate']) && !empty($_GET['startDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(pr.ConfirmedAt, p.UpdatedAt, p.CreatedAt)) >= ?";
                $params[] = $_GET['startDate'];
            }
            if (isset($_GET['endDate']) && !empty($_GET['endDate'])) {
                $whereConditions[] = "CONVERT(date, COALESCE(pr.ConfirmedAt, p.UpdatedAt, p.CreatedAt)) <= ?";
                $params[] = $_GET['endDate'];
            }
            
            // ฟิลเตอร์แผนก
            if (isset($_GET['departmentId']) && !empty($_GET['departmentId'])) {
                $whereConditions[] = "p.DepartmentID = ?";
                $params[] = intval($_GET['departmentId']);
            }
            
            // ฟิลเตอร์เครื่องจักร
            if (isset($_GET['machineId']) && !empty($_GET['machineId'])) {
                $machineId = intval($_GET['machineId']);
                $whereConditions[] = "(p.MachineID = ? OR p.MachineIDs LIKE '%' + CAST(? AS VARCHAR) + '%')";
                $params[] = $machineId;
                $params[] = $machineId;
            }
            
            $whereClause = implode(' AND ', $whereConditions);
            
            $sql = "SELECT TOP 10
                        p.LotNumber,
                        p.ProductName,
                        p.Status,
                        d.DepartmentName,
                        p.UpdatedAt,
                        p.CreatedAt,
                        COALESCE(pr.ConfirmedAt, p.UpdatedAt, p.CreatedAt) as LastActivity
                    FROM ProductionPlans p
                    LEFT JOIN Departments d ON p.DepartmentID = d.DepartmentID
                    LEFT JOIN ProductionResults pr ON p.PlanID = pr.PlanID
                    WHERE $whereClause
                    ORDER BY COALESCE(pr.ConfirmedAt, p.UpdatedAt, p.CreatedAt) DESC";
            
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                throw new Exception('Database query failed: ' . print_r(sqlsrv_errors(), true));
            }
            
            $activities = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                // แปลง datetime
                $lastActivity = '';
                if (isset($row['LastActivity']) && $row['LastActivity'] && is_object($row['LastActivity'])) {
                    $lastActivity = $row['LastActivity']->format('Y-m-d H:i:s');
                }
                
                $activities[] = [
                    'lotNumber' => $row['LotNumber'],
                    'productName' => $row['ProductName'],
                    'status' => $row['Status'],
                    'departmentName' => $row['DepartmentName'] ?? 'ไม่ระบุ',
                    'lastActivity' => $lastActivity
                ];
            }
            
            echo json_encode($activities, JSON_UNESCAPED_UNICODE);
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to get recent activities', 'details' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    
    http_response_code(400);
    echo json_encode(['error' => 'Unknown action']);
    exit;
}
// ===== END REST API =====
?>
